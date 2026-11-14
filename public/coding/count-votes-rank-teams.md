### Problem

Each ballot lists up to 3 candidates in order. First place earns 3 points, second 2, third 1. Return candidates ranked by total points. Ties go to whoever reached their final total first.

#### In plain words

Voters each write down their top picks, best first. Add up everyone's points. Most points ranks first. If two candidates finish with the same points, the one who got to that total **earlier** (on an earlier ballot) ranks higher.

```text
ballot 0: [A, B]     A gets 3, B gets 2
ballot 1: [B]        B gets 3 → B now has 5
```

#### Words used on this page

| Term | Meaning |
|---|---|
| Ballot | One voter's ordered list of candidates. |
| Rank / position | 0 for first place, 1 for second, 2 for third. |
| `reached_at` | The index of the ballot on which a candidate's score last changed: when they reached their final total. |
| Sort key | A function that turns each item into the value Python sorts by. |
| Lexicographic | Compare first elements; if equal, compare second elements; and so on. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

One pass over the ballots: for each of the first three names, `points[c] += 3 - rank` and `reached_at[c] = ballot_index`. The last time a candidate scores is when they reached their final total. Sort by `(-points, reached_at, name)`. LeetCode 1366 instead counts votes per position per team and sorts by the negated count vector, then the letter. O(B + C log C). Probe the spec for short ballots, duplicates and the second-level tie the rule leaves open. For a live leader under streaming votes, use a max-heap with lazy deletion.

**Cheat sheet**

1. **Ask:** fixed 3/2/1? short ballots? duplicates? exact tie rule, and what after it? full ranking or winner? batch or stream?
2. **Tests first:** points by position, short ballots, extras ignored, reached-first tie, last change (not first seen), same-ballot tie → A→Z.
3. **Build:** one pass → `points`, `reached_at` (overwrite each time); `sorted(key=(-points, reached_at, name))`.
4. **Cost:** O(total names + C log C).
5. **Follow-ups:** LC 1366 position vectors; pluggable scorer; live leader → lazy max-heap.

### Background you need

#### 1. Counting with a dictionary

`defaultdict(int)` starts every missing key at 0, so you can add points without checking whether the candidate exists yet.

```python
from collections import defaultdict

points = defaultdict(int)
for rank, cand in enumerate(["A", "B", "C"]):   # rank = 0, 1, 2
    points[cand] += 3 - rank
print(dict(points))
```

```text
{'A': 3, 'B': 2, 'C': 1}
```

`enumerate(xs)` yields `(index, item)` pairs, which gives you each candidate's position for free.

#### 2. Sorting by a tuple key

When the key is a tuple, Python sorts by its first element, then breaks ties with the second, and so on. To put **bigger** points first, negate them.

```python
scores = {"A": 3, "B": 5, "C": 3}
order = {"A": 0, "B": 1, "C": 1}
print(sorted(scores, key=lambda c: (-scores[c], order[c], c)))
```

```text
['B', 'A', 'C']
```

B has the most points. A and C tie on 3; A has the smaller `order`, so A comes first.

#### 3. "When did they reach their final total?"

A candidate's score only changes on ballots that mention them. So their **final** total is reached on the **last** ballot that mentions them. Record the ballot index every time they score, overwriting the old value, and you're left with exactly that moment.

#### 4. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Are points fixed at 3/2/1, or configurable? | Hard-coded vs a scorer function. | Fixed → `3 - rank`. Configurable → pass `scorer(rank)` (see Follow-ups). |
| Can a ballot have fewer than three names? More? | Avoids index errors and over-counting. | Fewer → loop over what's there. More → only `ballot[:3]` counts. |
| Can a name appear twice on one ballot? | Double scoring. | No → assume valid, or raise `ValueError`. Yes → count the first occurrence only. |
| What exactly does "reached their total first" mean? | The heart of the problem. | "The ballot where their score last changed" → record `reached_at`. |
| And if two candidates reach the same total on the same ballot? | A gap the rule leaves open, often on purpose. | Alphabetical (usual) → add `name` as the last key. |
| Full ranking, or just the winner? | Sort vs one pass. | Winner only → `min` with the same key, O(C). |
| One batch, or a live stream with "who's leading now?" | Function vs a class. | Stream → lazy max-heap (see Follow-ups). |

**If they say "your call", state your defaults out loud:**

> "Points are 3/2/1; ballots may be short and only the first three names count; no duplicates on a ballot; 'reached first' means the ballot where their score last changed; remaining ties go alphabetically; and I return the full ranking."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass."

#### Work the tie-break by hand

```text
ballot 0: [X, Y]   X=3 (at 0)   Y=2 (at 0)
ballot 1: [Y]      Y=5 (at 1)
ballot 2: [Z, X]   Z=3 (at 2)   X=5 (at 2)
final: Y=5 reached at 1, X=5 reached at 2, Z=3
ranking: Y, X, Z
```

X was seen first (ballot 0), but **reached** 5 later than Y. "First seen" would wrongly put X ahead.

#### The tests, one per requirement

Code in `votes.py`, tests in `test_votes.py`.

```python
# file: test_votes.py
from votes import rank_candidates


def test_points_follow_position():
    assert rank_candidates([["A", "B", "C"]]) == ["A", "B", "C"]
    assert rank_candidates([["C", "B", "A"]]) == ["C", "B", "A"]


def test_short_ballots_are_allowed():
    # A: 3 + 2 = 5, B: 3
    assert rank_candidates([["A"], ["B", "A"]]) == ["A", "B"]


def test_only_the_first_three_names_score():
    assert rank_candidates([["A", "B", "C", "D"]]) == ["A", "B", "C"]


def test_tie_goes_to_whoever_reached_the_total_first():
    # Alphabetical would say A first; B reached 3 one ballot earlier.
    assert rank_candidates([["B"], ["A"]]) == ["B", "A"]


def test_reached_means_last_change_not_first_seen():
    ballots = [["X", "Y"], ["Y"], ["Z", "X"]]
    assert rank_candidates(ballots) == ["Y", "X", "Z"]


def test_same_ballot_tie_is_alphabetical():
    # A=3 at 0; B=3 at 1; C=2+1=3 at 1; D=2 → B and C tie on points and ballot → B first.
    assert rank_candidates([["A", "C"], ["B", "D", "C"]]) == ["A", "B", "C", "D"]


def test_no_ballots():
    assert rank_candidates([]) == []
```

#### Red: run them against an empty stub

```python
# file: votes.py
def rank_candidates(ballots):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_votes.py
```

```text
FFFFFFF                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_votes.py::test_points_follow_position - NotImplementedError
FAILED test_votes.py::test_short_ballots_are_allowed - NotImplementedError
FAILED test_votes.py::test_only_the_first_three_names_score - NotImplementedError
FAILED test_votes.py::test_tie_goes_to_whoever_reached_the_total_first - NotImplementedError
FAILED test_votes.py::test_reached_means_last_change_not_first_seen - NotImplementedError
FAILED test_votes.py::test_same_ballot_tie_is_alphabetical - NotImplementedError
FAILED test_votes.py::test_no_ballots - NotImplementedError
7 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. Totals are one pass with a dict. What extra thing must you record to answer "who got there first"?
2. On which ballot does a candidate reach their *final* score?
3. Can one sort key express "points descending, then earlier first, then A→Z"?

#### Brute force first

Totals alone aren't enough: two candidates on 5 points look identical. Recording when each candidate was **first seen** is the tempting fix, but it's wrong. A candidate can appear early and reach their final total late. The worked example shows exactly that.

#### The key insight

A candidate's score only changes on ballots that mention them, so the **last** ballot that mentions them is when they reached their final total. Overwrite `reached_at[c] = i` each time they score.

#### The plan (say this, then wait for a nod)

> **Say:** "One pass with two dicts: points, and the ballot index where each candidate's score last changed. Then sort by negative points, then that index, then name. Linear in the number of names, plus C log C for the sort."

How this maps to the tests: `ballot[:3]` → `test_only_the_first_three_names_score`; overwriting `reached_at` → `test_reached_means_last_change_not_first_seen`; `name` last in the key → `test_same_ballot_tie_is_alphabetical`.

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: totals only

```python
# file: votes.py
from collections import defaultdict


def rank_candidates(ballots):
    points = defaultdict(int)
    for ballot in ballots:
        for rank, cand in enumerate(ballot[:3]):
            points[cand] += 3 - rank
    return sorted(points, key=lambda c: -points[c])
```

```bash
pytest -q --tb=no -rf test_votes.py
```

```text
....FF.                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_votes.py::test_reached_means_last_change_not_first_seen - AssertionError: assert ['X'...
FAILED test_votes.py::test_same_ballot_tie_is_alphabetical - AssertionError: assert ['A', 'C', 'B...
2 failed, 5 passed in 0.01s
```

The tie tests that pass do so by luck (Python's sort keeps the order candidates were first added). The two that fail show that totals alone can't break ties.

#### Stage 2: record when each candidate was first seen (the tempting mistake)

```python
# file: votes.py
from collections import defaultdict


def rank_candidates(ballots):
    points = defaultdict(int)
    first_seen = {}
    for i, ballot in enumerate(ballots):
        for rank, cand in enumerate(ballot[:3]):
            points[cand] += 3 - rank
            first_seen.setdefault(cand, i)          # only the first time
    return sorted(points, key=lambda c: (-points[c], first_seen[c], c))
```

```bash
pytest -q --tb=no -rf test_votes.py
```

```text
....FF.                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_votes.py::test_reached_means_last_change_not_first_seen - AssertionError: assert ['X'...
FAILED test_votes.py::test_same_ballot_tie_is_alphabetical - AssertionError: assert ['A', 'C', 'B...
2 failed, 5 passed in 0.01s
```

Still red on the two tests that matter. X was *seen* at ballot 0 but *reached* 5 at ballot 2.

#### Stage 3: record when the score last changed

> **Say:** "The score last changes on the last ballot that mentions them, so I overwrite the index every time they score."

```python
# file: votes.py
from collections import defaultdict


def rank_candidates(ballots):
    points = defaultdict(int)
    reached_at = {}
    for i, ballot in enumerate(ballots):
        for rank, cand in enumerate(ballot[:3]):
            points[cand] += 3 - rank
            reached_at[cand] = i                    # overwrite: last change wins
    return sorted(points, key=lambda c: (-points[c], reached_at[c], c))
```

```bash
pytest -q --tb=no -rf test_votes.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

**Time:** O(N + C log C), where N is the total number of names counted and C the number of candidates. **Space:** O(C).

### Step 5 · Run everything and refactor

#### Trace the tie-break example

| ballot | names | points after | reached_at after |
|---|---|---|---|
| 0 | X, Y | X=3, Y=2 | X=0, Y=0 |
| 1 | Y | X=3, Y=5 | X=0, Y=1 |
| 2 | Z, X | X=5, Y=5, Z=3 | X=2, Y=1, Z=2 |

Keys: Y → `(-5, 1, "Y")`, X → `(-5, 2, "X")`, Z → `(-3, 2, "Z")`. Sorted: **Y, X, Z**.

#### Refactor: reject invalid ballots

We assumed no duplicates. If one slips through, a candidate silently gets 3 + 2 points from one voter. Fail loudly instead, test first:

```python
# file: test_votes.py (append)
import pytest


def test_duplicate_name_on_one_ballot_is_rejected():
    with pytest.raises(ValueError):
        rank_candidates([["A", "A", "B"]])
```

```bash
pytest -q --tb=no -rf test_votes.py
```

```text
.......F                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_votes.py::test_duplicate_name_on_one_ballot_is_rejected - Failed: DID NOT RAISE Value...
1 failed, 7 passed in 0.01s
```

```python
# file: votes.py
from collections import defaultdict

MAX_RANKS = 3


def rank_candidates(ballots: list[list[str]]) -> list[str]:
    """Rank by points (3/2/1); ties → earlier final total, then name."""
    points: dict[str, int] = defaultdict(int)
    reached_at: dict[str, int] = {}
    for i, ballot in enumerate(ballots):
        counted = ballot[:MAX_RANKS]
        if len(set(counted)) != len(counted):
            raise ValueError(f"ballot {i} names a candidate twice: {ballot}")
        for rank, cand in enumerate(counted):
            points[cand] += MAX_RANKS - rank
            reached_at[cand] = i
    return sorted(points, key=lambda c: (-points[c], reached_at[c], c))
```

```bash
pytest -q --tb=no -rf test_votes.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: the LeetCode 1366 rule ("Rank Teams by Votes")

**What changes:** every voter ranks **all** teams. A team's strength is its vector of position counts: how many first places, then second places, and so on. More first places wins; if equal, more second places; and so on. If all positions are equal, the team letter decides.

**Insight:** comparing those vectors lexicographically *is* the rule. Negate each count so bigger counts sort first, and put the letter last.

**Tests first** (the official examples):

```python
# file: test_votes.py (append)
from votes import rank_teams


def test_rank_teams_by_position_counts():
    assert rank_teams(["ABC", "ACB", "ABC", "ACB", "ACB"]) == "ACB"
    assert rank_teams(["WXYZ", "XYZW"]) == "XWYZ"
    assert rank_teams(["BCA", "CAB", "CBA", "ABC", "ACB", "BAC"]) == "ABC"   # all tied → letters
```

```python
# file: votes.py (append)
def rank_teams(votes):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_votes.py -k teams
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_votes.py::test_rank_teams_by_position_counts - NotImplementedError
1 failed, 8 deselected in 0.01s
```

```python
# file: votes.py (replace the rank_teams stub)
def rank_teams(votes: list[str]) -> str:
    if not votes:
        return ""
    n = len(votes[0])
    counts = {team: [0] * n for team in votes[0]}     # team -> votes per position
    for vote in votes:
        for pos, team in enumerate(vote):
            counts[team][pos] += 1
    return "".join(sorted(counts, key=lambda t: ([-x for x in counts[t]], t)))
```

```bash
pytest -q --tb=no -rf test_votes.py -k teams
```

```text
.                                                                                            [100%]
1 passed, 8 deselected in 0.01s
```

**Time:** O(V × n + n² log n) for V votes over n teams (each comparison looks at up to n counts).

#### Follow-up 2: "Make the scoring rule pluggable"

**What changes:** pass a `scorer(rank) -> points` function, defaulting to 3/2/1. The tie logic stays the same.

```python
# file: test_votes.py (append)
def test_custom_scorer_changes_the_outcome():
    ballots = [["A", "B"], ["B", "C"], ["C", "B"]]
    assert rank_candidates(ballots) == ["B", "C", "A"]                       # 3/2/1: B=7, C=5, A=3
    first_only = lambda rank: 1 if rank == 0 else 0
    assert rank_candidates(ballots, scorer=first_only) == ["A", "B", "C"]    # all 1 → A reached first
```

```bash
pytest -q --tb=no -rf test_votes.py -k scorer
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_votes.py::test_custom_scorer_changes_the_outcome - TypeError: rank_candidates() got a...
1 failed, 9 deselected in 0.01s
```

```python
# file: votes.py (replace rank_candidates)
def rank_candidates(ballots: list[list[str]], scorer=lambda rank: MAX_RANKS - rank) -> list[str]:
    """Rank by points from scorer(rank); ties → earlier final total, then name."""
    points: dict[str, int] = defaultdict(int)
    reached_at: dict[str, int] = {}
    for i, ballot in enumerate(ballots):
        counted = ballot[:MAX_RANKS]
        if len(set(counted)) != len(counted):
            raise ValueError(f"ballot {i} names a candidate twice: {ballot}")
        for rank, cand in enumerate(counted):
            gained = scorer(rank)
            if gained:
                points[cand] += gained
                reached_at[cand] = i
            else:
                points.setdefault(cand, 0)
                reached_at.setdefault(cand, i)
    return sorted(points, key=lambda c: (-points[c], reached_at[c], c))
```

Note the subtle part: a rank that scores 0 must not move `reached_at`, because the candidate's total didn't change.

```bash
pytest -q --tb=no -rf test_votes.py
```

```text
..........                                                                                   [100%]
10 passed in 0.01s
```

#### Follow-up 3: "Votes stream in; we need the current leader at any time"

**What changes:** re-sorting on every query is O(C log C). Instead, keep a **max-heap** of `(-points, reached_at, name)` and use **lazy deletion**:

- On each vote, push a fresh entry for every candidate whose score changed. Don't hunt for the old entry.
- On `leader()`, look at the top. If it doesn't match the candidate's current points and `reached_at`, it's stale: pop it and look again.

Each entry is pushed once and popped at most once, so both operations are O(log C) amortised.

```python
# file: test_votes.py (append)
from votes import Leaderboard


def test_live_leader_updates_as_votes_arrive():
    lb = Leaderboard()
    assert lb.leader() is None
    lb.vote(["A", "B"])
    assert lb.leader() == "A"            # A=3, B=2
    lb.vote(["B"])
    assert lb.leader() == "B"            # B=5
    lb.vote(["A"])
    assert lb.leader() == "A"            # A=6
    lb.vote(["C", "B"])
    assert lb.leader() == "B"            # B=7
```

```python
# file: votes.py (append)
class Leaderboard:
    def vote(self, ballot):
        raise NotImplementedError

    def leader(self):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_votes.py -k live
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_votes.py::test_live_leader_updates_as_votes_arrive - NotImplementedError
1 failed, 10 deselected in 0.01s
```

```python
# file: votes.py (replace the Leaderboard stub)
import heapq


class Leaderboard:
    def __init__(self):
        self.points: dict[str, int] = defaultdict(int)
        self.reached_at: dict[str, int] = {}
        self.heap: list[tuple[int, int, str]] = []   # (-points, reached_at, name), may hold stale entries
        self.ballots = 0

    def vote(self, ballot: list[str]) -> None:
        i = self.ballots
        self.ballots += 1
        for rank, cand in enumerate(ballot[:MAX_RANKS]):
            self.points[cand] += MAX_RANKS - rank
            self.reached_at[cand] = i
            heapq.heappush(self.heap, (-self.points[cand], i, cand))

    def leader(self) -> str | None:
        while self.heap:
            neg_points, at, cand = self.heap[0]
            if -neg_points == self.points[cand] and at == self.reached_at[cand]:
                return cand                     # top is current
            heapq.heappop(self.heap)            # stale: discard and look again
        return None
```

```bash
pytest -q --tb=no -rf test_votes.py
```

```text
...........                                                                                  [100%]
11 passed in 0.01s
```

> **Say:** "Is the leader queried much more often than votes arrive? If so this lazy heap is the right trade: O(log C) per vote, amortised O(log C) per query."

### Mock dialogue

**Interviewer:** Each voter lists up to three candidates. First gets 3 points, second 2, third 1. Return candidates ordered by points. Ties go to whoever reached their score first.

**You:** Can a ballot have fewer than three names? And can a name appear twice on one ballot?

**Interviewer:** Fewer is allowed. Assume no duplicates.

**You:** For “reached their score first”, I read that as the ballot at which their total last changed. Is that the intent?

**Interviewer:** Yes.

**You:** And if two candidates reach the same total on the same ballot?

**Interviewer:** Good question. Alphabetical.

> *Why this works:* You found a gap in the specification. Interviewers often leave one deliberately to see whether you probe.

**You:** Before coding, my tests: points by position, a short ballot, extra names ignored, a tie broken by who got there first, a case where someone is seen early but reaches their total late, and a same-ballot tie going alphabetical.

**You:** Plan: one pass, with a dictionary of points and a dictionary of the ballot index where each score last changed. Then sort by negative points, then that index, then name. A linear pass plus C log C for the sort.

**You:** All green. The "seen early, reached late" test is the one that would catch using first-seen instead of last-change.

**Interviewer:** Now votes arrive continuously and we want the current leader any time.

**You:** I'll add a test with a stream of votes and the leader after each. Is the leader queried much more often than votes arrive? If so I’d keep a max-heap with the same key and use lazy deletion: push a fresh entry whenever a score changes and discard stale tops on read. O(log C) per vote and amortised O(log C) per query.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Assuming every ballot has exactly 3 names | `IndexError` on short ballots. | `test_short_ballots_are_allowed` |
| Counting names past the third | Extra candidates score points (or negative ones, with `3 - rank`). | `test_only_the_first_three_names_score` |
| Using first-seen instead of last-change for the tie | Wrong winner when someone appears early but finishes late. | `test_reached_means_last_change_not_first_seen` |
| No final tie-break | Order depends on dict insertion: flaky. | `test_same_ballot_tie_is_alphabetical` |
| Guessing about duplicate names | Silent double scoring. Ask, then validate. | `test_duplicate_name_on_one_ballot_is_rejected` |
| Re-sorting on every leader query | O(C log C) per read. | None (speed); use the lazy heap. |
