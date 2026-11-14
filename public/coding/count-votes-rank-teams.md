### Problem

Each ballot lists up to 3 candidates in order. First place earns 3 points, second 2, third 1. Return candidates ranked by total points. Ties go to whoever reached their final total first.

### Interview refresher

One pass over the ballots: for each of the first three names, `points[c] += 3 - rank` and `reached_at[c] = ballot_index`. The last time a candidate scores is when they reached their final total. Sort by `(-points, reached_at, name)`. LeetCode 1366 instead counts votes per position per team and sorts by the negated count vector, then the letter. O(B + C log C). Probe the spec for short ballots, duplicates and the second-level tie the rule leaves open. For a live leader under streaming votes, use a max-heap with lazy deletion.

### Hints

1. The tie-break needs history, not just totals. What do you record per candidate as you go?
2. The ballot index of a candidate's last score change is exactly when they reached their final score.
3. Sort by (-points, reached_at).

### Approach

Stream through ballots once. Accumulate points and overwrite `reached_at[candidate]` with the current ballot index whenever their score changes. Sort with a composite key. For the LC 1366 version, the key is the vector of position counts, negated, then the letter.

### Deep dive

#### What the interviewer is really testing

Reading a ranking rule precisely and encoding it in a sort key. Candidates report the live version differs from LeetCode, so understanding *why* the key looks the way it does matters more than memorising it.

#### Totals are easy; ties are the problem

Adding up points is one pass with a dictionary. The tie-break “whoever reached their total first” needs information about *when*, which totals alone don’t hold. So you record something extra while streaming through the ballots.

#### Why “last time the score changed”

A candidate’s score only changes on ballots that mention them, so their final score is reached on the *last* ballot that mentions them. Recording that ballot’s index (overwriting it each time) gives the moment each candidate reached their final score. Smaller index means earlier.

```text
ballot 0: [A, B]   A=3 (at 0), B=2 (at 0)
ballot 1: [C, B]   C=3 (at 1), B=3 (at 1)
final: A=3@0, B=3@1, C=3@1
A first (reached 3 earliest); B vs C still tied → ask!
```

That walkthrough also surfaces a second-level tie the rule doesn’t cover: a great clarifying question.

#### Why the sort key is a tuple

Python compares tuples element by element. `(-points, reached_at)` sorts by points descending (negating flips the order) and, among equal points, by reached_at ascending. One sort, no custom comparator.

#### The LeetCode 1366 version

There, a team’s strength is its vector of position counts: first places, then second places, and so on. Comparing vectors lexicographically is exactly the rule. Negating each count puts larger counts first, and the letter is the final tie-break.

#### If only the winner is needed

One pass finding the maximum by the same key is O(C), no sort. Mention it if they only want the winner.

### Reference solution

```python
from collections import defaultdict


def rank_candidates(ballots: list[list[str]]) -> list[str]:
    points = defaultdict(int)
    reached_at = {}
    for i, ballot in enumerate(ballots):
        for rank, cand in enumerate(ballot[:3]):
            points[cand] += 3 - rank
            reached_at[cand] = i
    return sorted(points, key=lambda c: (-points[c], reached_at[c]))


def rank_teams(votes: list[str]) -> str:              # LC 1366
    n = len(votes[0])
    counts = {t: [0] * n for t in votes[0]}
    for v in votes:
        for pos, team in enumerate(v):
            counts[team][pos] += 1
    return "".join(sorted(counts, key=lambda t: ([-x for x in counts[t]], t)))


assert rank_candidates([["A", "B", "C"], ["B", "A"], ["C"]]) == ["A", "B", "C"]
assert rank_teams(["ABC", "ACB", "ABC", "ACB", "ACB"]) == "ACB"
```

**Time:** O(B + C log C)  
**Space:** O(C)

### Questions to ask before coding

- Are points fixed at 3, 2, 1, or should scoring be configurable?
- Can a ballot have fewer than three names, or duplicates?
- What exactly is the tie-break, and what if two candidates are still tied after it?
- Do you need the full ranking or just the winner?
- Is this a batch, or a stream where you might ask for the leader mid-way?

### Interview walkthrough

**Interviewer:** Each voter lists up to three candidates. First gets 3 points, second 2, third 1. Return candidates ordered by points. Ties go to whoever reached their score first.

**You:** Can a ballot have fewer than three names? And can a name appear twice on one ballot?

**Interviewer:** Fewer is allowed. Assume no duplicates.

**You:** For “reached their score first”, I read that as the ballot at which their total last changed. Is that the intent?

**Interviewer:** Yes.

**You:** And if two candidates reach the same total on the same ballot?

**Interviewer:** Good question. Alphabetical.

> *Why this works:* You found a gap in the specification. Interviewers often leave one deliberately to see whether you probe.

**You:** Plan: one pass, with a dictionary of points and a dictionary of the ballot index where each score last changed. Then sort by negative points, then that index, then name. A linear pass plus C log C for the sort.

**You:** Testing: A gets 3 on ballot 0; B gets 2 then 1; C gets 3 on ballot 2. All have 3; A reached it at 0, B at 1, C at 2, so A, B, C.

**Interviewer:** Now votes arrive continuously and we want the current leader any time.

**You:** Is the leader queried much more often than votes arrive? If so I’d keep a max-heap with the same key and use lazy deletion: push a fresh entry whenever a score changes and discard stale tops on read. O(log C) per vote and amortised O(log C) per query.

### Scale-up follow-up

**Interviewer adds:** “Make the scoring rule pluggable.” Or: “votes arrive as a live stream and we need the leader at any time.”

Pass a `scorer(rank) -> points` function. For a live leaderboard, keep points in a dict and maintain a sorted structure (or a lazy max-heap like Stock Price) so `leader()` is O(log C).

### Where candidates slip

- Assuming every ballot has exactly 3 names.
- Using first-seen time instead of last-change time for the tie-break.
- Duplicate names on one ballot: ask, don't guess.
