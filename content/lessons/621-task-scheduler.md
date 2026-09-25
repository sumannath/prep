# Task Scheduler (LeetCode 621) — Complete Lesson

## 1. Problem, restated in your own words

You receive a **multiset** of tasks — `tasks[i]` is a *value* (a label `A`–`Z`), and duplicates mean "this label occurs k times," not "k distinct positions that must keep their order." You also get a cooldown `n`.

Time is a sequence of unit **intervals** indexed `0, 1, 2, …`. At each interval the CPU does exactly one of:

- runs one task (any label with copies remaining), or
- idles.

**Cooling rule, stated precisely:** if a label runs at interval `t`, the next copy of that same label may run at interval `t + n + 1` or later — i.e., there must be **at least `n` intervals strictly between** two consecutive runs of the same label. (This `t + n + 1`, not `t + n`, is the #1 off-by-one in this problem.)

You may run tasks in **any order**. Return the minimum number of intervals from the start until the last task completes. Idles *between* tasks count; there are no *trailing* idles after the last task, because the schedule ends when the work ends.

Sanity anchor: `["A","A","A","B","B","B"]`, `n=2` → `A B _ A B _ A B` → **8**.

## 2. Constraint decoding — what each line is telling you

| Constraint | What it tells you |
|---|---|
| `1 <= tasks.length <= 10^4` | Input is small. Counting frequencies is free. But the **answer** can be much larger than the input: e.g., one label ×10⁴ with `n=100` gives ≈ `(10^4−1)·101 + 1 ≈ 1.01×10^6` intervals — so a per-interval simulation is still fine, but per-interval × per-label × per-something structures need care. |
| Labels are `A`–`Z` | Fixed alphabet of 26 → frequency table is `O(1)` space (`int[26]`). Only **counts** matter, never positions or the input order. |
| `0 <= n <= 100` | `n = 0` is a real case → no cooldowns at all, answer is `len(tasks)`. Also `n` can exceed the number of distinct tasks, making gaps huge. |
| "Tasks can be completed in any order" | Reordering is allowed. Duplicates are the point — the whole problem is frequency bookkeeping. |
| Return a **count**, not a schedule | A closed-form counting answer is likely. (Classic follow-up: "print the order" → then you simulate; see §6.) |

## 3. Brute force: choose a task for every interval (backtracking)

**Idea.** At each interval, every label that (a) still has copies and (b) is off cooldown is a branch; if nothing is off cooldown, the only branch is idle. DFS over all choices, minimize the finishing time.

```python
from collections import Counter

def least_interval_bruteforce(tasks, n):
    remaining = Counter(tasks)
    last_run = {}                     # label -> interval index of its last execution
    total = len(tasks)
    best = float("inf")

    def dfs(done, t):
        nonlocal best
        if done == total:
            best = min(best, t)
            return
        if t >= best:                 # prune: already no better than best found
            return
        available = [c for c in remaining
                     if remaining[c] > 0
                     and (c not in last_run or t - last_run[c] > n)]
        if available:
            for c in available:       # never idle while work is available (see note)
                remaining[c] -= 1
                prev = last_run.get(c)
                last_run[c] = t
                dfs(done + 1, t + 1)
                if prev is None:
                    del last_run[c]
                else:
                    last_run[c] = prev
                remaining[c] += 1
        else:
            dfs(done, t + 1)          # everything on cooldown: forced idle

    dfs(0, 0)
    return best
```

**Worked trace** on Example 1 (`tasks = ["A","A","A","B","B","B"]`, `n = 2`). With the pruning rule below, the search is tiny; here is one root-to-leaf path (the `B`-first branch mirrors it):

| interval `t` | off-cooldown labels | action | remaining |
|---|---|---|---|
| 0 | A, B | A | A:2, B:3 |
| 1 | B (A cooling) | B | A:2, B:2 |
| 2 | — both cooling | **idle** | — |
| 3 | A | A | A:1, B:2 |
| 4 | B | B | A:1, B:1 |
| 5 | — both cooling | **idle** | — |
| 6 | A | A | A:0, B:1 |
| 7 | B | B | done → **8** |

**The pruning rule and why it's safe.** "Never idle while some task is available" — executing an available task earlier never breaks its own cooldown (it was legal *now*) and only delays other tasks' constraints, so an exchange argument can move any "wasteful" idle to a later slot without lengthening the schedule. Without this rule the tree also explores schedules like `A _ B _ …`, which are strictly longer.

**Complexity.** Depth `L` = length of the best schedule; each interval branches over at most `k ≤ 26` available labels (plus a forced idle when all are cooling), so the tree has `O(27^L)` nodes in the worst case — and `L` itself can reach ≈10⁶ under these constraints (10⁴ copies of one label, `n=100`). This is strictly an intuition/oracle tool for tiny inputs, not a submission.

## 4. The core insight: the busiest task builds a skeleton

Only **three numbers** matter:

- `f` = **max frequency** (highest count of any single label),
- `m` = **how many labels are tied at that max frequency**,
- `T` = `len(tasks)` (total tasks).

Everything else is interchangeable filler.

**Lower bound 1 (trivial):** every task needs one interval → `L ≥ T`.

**Lower bound 2 (the frame):** let `f = maxFreq`, `m = maxCount`. Look at the last occurrence of each of the `m` tied labels. A label with `f` occurrences that are pairwise ≥ `n+1` apart has its last occurrence at index ≥ `(f−1)(n+1)` (0-indexed: first occurrence ≥ 0, each subsequent jump ≥ `n+1`). Those `m` last-occurrence indices are **distinct** integers all ≥ `(f−1)(n+1)`, so the largest is ≥ `(f−1)(n+1) + (m−1)`, and the schedule length is at least one more:

```
L ≥ (f − 1) · (n + 1) + m
```

Picture the frame (rows = 1st, 2nd, …, f-th occurrence; `n+1` columns per row):

```
X  .  .        ← each row: the tied label(s) + n gap slots
X  .  .
X  Y           ← tail: one slot per tied label (m of them)
```

**Upper bound (why the lower bound is achievable).** Two cases:

- **`T ≤ frame`:** put the `m` tied labels in the tail *and* in the same column of every gap-row (distance exactly `n+1` between consecutive rows — legal). Pour the remaining `T − m·f` copies into the empty gap slots, **at most one copy of any label per gap-row** — always possible because every non-tied label has frequency ≤ `f−1` = number of gap-rows. Unfilled slots stay idle. Total = exactly `frame`. (Nice consistency check: in this case `m·f ≤ T ≤ (f−1)(n+1)+m` forces `m ≤ n+1`, so the tied labels always fit in the tail.)
- **`T > frame`:** there is more work than idle slots, so no idle is ever needed and the answer is `T`. Intuition: with the frame already exceeded, some label is always off cooldown when you need one; the heap simulation in §6 is the constructive proof — run it and it never pads an avoidable idle.

**Therefore:**

```
answer = max( T, (maxFreq − 1) · (n + 1) + maxCount )
```

This "two independent lower bounds + a construction matching their max" template is the real takeaway — it's how many scheduling minimization answers are proven exact.

## 5. Optimal solution A — the counting formula (your default answer)

```python
from collections import Counter

def leastInterval(tasks, n):
    if not tasks:                       # defensive; constraints say non-empty
        return 0
    counts = Counter(tasks)
    max_freq = max(counts.values())
    max_count = sum(1 for c in counts.values() if c == max_freq)  # second pass!
    frame = (max_freq - 1) * (n + 1) + max_count
    return max(len(tasks), frame)
```

Line-level notes:

- `max_count` needs the **max first, then a second pass** — you can't count ties in one pass without extra care.
- `(n + 1)` because a "gap" is `n` idle-capable slots **plus the interval the task itself occupies**.
- The final `max` is not decoration — Example 2 exists precisely to test it.

### Traces on the official examples

**Example 1** — `["A","A","A","B","B","B"]`, `n=2`: counts `{A:3, B:3}` → `f=3, m=2, T=6`.
`frame = (3−1)(2+1) + 2 = 8`; `max(6, 8) = 8` ✓

```
A  B  .      A  B  .      A  B         read row-major:
A  B  .   →  A  B  .   →  A  B   →     A B _ A B _ A B  = 8
A  B
```

**Example 2** — `["A","C","A","B","D","B"]`, `n=1`: counts `{A:2, B:2, C:1, D:1}` → `f=2, m=2, T=6`.
`frame = (2−1)(1+1) + 2 = 4`; but remaining filler (4 tasks) overflows the single gap slot → no idling possible → `max(6, 4) = 6` ✓ (e.g., `A B C D A B`).

**Example 3** — `["A","A","A","B","B","B"]`, `n=3`: `f=3, m=2, T=6`.
`frame = (3−1)(3+1) + 2 = 10`; `max(6, 10) = 10` ✓

```
A  B  .  .      A  B  .  .      A  B      →  A B _ _ A B _ _ A B = 10
```

## 6. Optimal solution B — heap round simulation (when they ask for the actual order)

**Idea.** Process time in **rounds of `n+1` intervals**. In each round, run the `n+1` most-loaded *distinct* labels (max-heap of remaining counts). Same label can't repeat within a round, and consecutive rounds are exactly `n+1` apart, so the cooldown is respected by construction. The **last** round is special: if no work remains afterward, don't pad it with idles.

```python
import heapq
from collections import Counter

def leastInterval_schedule(tasks, n):
    heap = [(-c, label) for label, c in Counter(tasks).items()]
    heapq.heapify(heap)
    total = 0
    schedule = []

    while heap:
        ran = 0
        leftovers = []
        for _ in range(n + 1):              # one round = n+1 slots
            if heap:
                c, label = heapq.heappop(heap)
                schedule.append(label)
                ran += 1
                if c < -1:                  # c is negative; still has copies
                    leftovers.append((c + 1, label))
        if heap or leftovers:
            total += n + 1                  # full round; pad with idles
            schedule.extend(["idle"] * (n + 1 - ran))
        else:
            total += ran                    # final round: no trailing idles
        for item in leftovers:
            heapq.heappush(heap, item)

    return total, schedule
```

**Trace** on Example 1 (`n=2`, round size 3):

| Round | Ran | Pushed back | Intervals added | Running total |
|---|---|---|---|---|
| 1 | A, B | A:2, B:2 | 3 (`A B _`) | 3 |
| 2 | A, B | A:1, B:1 | 3 (`A B _`) | 6 |
| 3 | A, B | — (final round, no pad) | 2 | **8** |

Produced order: `A B idle A B idle A B` — matches the official explanation. This simulation is also a **constructive proof** of the formula (it always emits exactly `max(T, frame)` intervals), which makes it a great cross-check oracle against solution A.

## 7. Complexity table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute-force DFS (§3) | `O(27^L)` worst case, `L` = schedule length (can be ≈10⁶ here) — each interval branches over ≤26 labels + forced idle | `O(L)` recursion | Intuition / tiny-input oracle only |
| Counting formula (§5) — **primary** | `O(T)` to count, `T ≤ 10^4` | `O(1)` (26-slot table) | The interview answer |
| Heap rounds (§6) | `O(L_ans · log 26 + 26)` — the heap never holds more than 26 entries (one per label), so each executed interval costs `O(log 26)` | `O(26)` | Also emits the order; `L_ans ≤ (10^4−1)·101 + 26 ≈ 1.01×10^6` under the given constraints |

## 8. Common mistakes and debugging checklist

1. **Dropping `max(len(tasks), frame)`.** On Example 2 you'd return 4 instead of 6. The frame is only a lower bound; when tasks overflow the gaps, `T` wins.
2. **Off-by-one in the frame:** writing `(f−1)·n + m` instead of `(f−1)·(n+1) + m`. The `+1` is the interval the task itself occupies inside each gap-block.
3. **Tie count done wrong.** `m` = number of labels tied at the **max** frequency (second pass), not the second-highest frequency, not `1`. Wrong value `1` gives 7 on Example 1 instead of 8.
4. **Cooldown semantics off-by-one:** next same label at `≥ t + n + 1`; "gap of n intervals" means `n` intervals *strictly between* the two runs.
5. **Padding idles into the final heap round.** Trailing idles after the last task don't exist. (In the DFS, same idea: don't count idles past completion.)
6. **Thinking input order matters.** It doesn't — sorting `tasks` itself is pointless; sort/count frequencies.
7. **Forgetting `n = 0`.** The formula still returns `T` (the frame term never exceeds `T` when `n=0`), but hand-rolled "insert n idles" simulations frequently break here.
8. **Believing you need all frequencies.** You never need the second-highest count — only `f`, `m`, and `T`. If your solution sorts all 26 counts, you're doing (correct, but unnecessary) simulation work.

## 9. Language gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| **Python** | `Counter` is ideal; `max(counts.values())` raises on empty input — a one-line guard is cheap. Never mutate the `Counter` while iterating it. |
| **Java** | Prefer `int[26]` over `HashMap<Character, Integer>` — autoboxing every char→Integer is pure overhead. Compute `maxFreq` first, then a **separate** loop for `maxCount`. All arithmetic fits `int` here (`(10^4−1)·101 + 26 ≪ 2^31`), but if you generalize counts to `long`, widen *before* multiplying. |
| **C++** | `std::array<int,26>` or `unordered_map<char,int>`; use `*std::max_element(...)`. In the general case write `1LL * (maxFreq - 1) * (n + 1)` to avoid `int` overflow; remember `std::priority_queue` with `std::greater<T>` is a *min*-heap (relevant if you build the §6 variant). |

## 10. Test cases to propose out loud (before or while coding)

| # | Input | `n` | Expected | What it catches |
|---|---|---|---|---|
| 1 | `["A","A","A","B","B","B"]` | 2 | 8 | Official: ties share the tail |
| 2 | `["A","C","A","B","D","B"]` | 1 | 6 | Official: `frame(4) < T(6)` → `T` dominates |
| 3 | `["A","A","A","B","B","B"]` | 3 | 10 | Official: two idles per gap |
| 4 | `["A","A","A"]` | 0 | 3 | `n=0` edge case |
| 5 | `["A"]` | 5 | 1 | Single task; no trailing idles |
| 6 | `["A","A","A","A"]` | 1 | 7 | One label only: `A _ A _ A _ A` |
| 7 | `["A","A","B","B","C","C","D","E"]` | 2 | 8 | 3-way tie at max (`m=3`), and `T(8) > frame(6)` |
| 8 | `["A","B","C"]` | 100 | 3 | All distinct, huge `n` → cooldowns irrelevant |

Cases 4–8 map one-to-one onto the two terms of `max(T, frame)` — propose them out loud; it signals you understand which term is doing the work. **Bonus testing tip:** fuzz the formula against the §3 DFS on tiny random inputs (`len ≤ 6`, `n ≤ 3`) — the brute force is a perfect oracle.

## 11. Transferable patterns and related problems

- **Frequency-frame counting** — the answer is determined by `(max freq, tie count, total)`; filler is interchangeable. Same skeleton in:
  - LC 767 **Reorganize String** (the `n=1` version where you must output the arrangement),
  - LC 1054 **Distant Barcodes** (same, arbitrary values),
  - LC 358 **Rearrange String k Distance Apart** (general `k`, heap-based construction),
  - LC 1405 **Longest Happy String** (greedy max-remaining-first with a feasibility guard).
- **"Two lower bounds + matching construction"** — a reusable proof template for min-length scheduling answers: find independent lower bounds, then show a schedule achieving their max.
- **Round-based greedy batching:** when a cooldown of `n` exists, process time in batches of `n+1` *distinct* items — the same trick powers the heap solutions above.
- **Variant follow-up:** if the input order were **fixed** (Task Scheduler II, LC 2365), counting collapses to a single pass with a `last_done` map: `day = max(day + 1, last_done[task] + space + 1)`.

## 12. How to narrate it in the room (full talk track)

> "Let me restate: I can reorder tasks freely; identical labels need at least `n` intervals between runs, meaning the next copy lands at `t + n + 1` or later; each interval runs one task or idles; I minimize total intervals, with no idles after the last task.
>
> Brute force is a DFS picking a task per interval — exponential, only useful as a sanity oracle.
>
> The key observation: only three numbers matter — `f`, the max frequency; `m`, how many labels tie at `f`; and `T`, the total task count. The busiest label forces a skeleton: `f` occurrences with `n` gap slots between consecutive ones — that's `(f−1)(n+1)` intervals — plus a tail holding one slot for each of the `m` tied labels. I can prove that's a lower bound: the `m` last occurrences are distinct indices, each at least `(f−1)(n+1)`. Total count `T` is a second, independent lower bound.
>
> Both are achievable: fill the gaps with the remaining tasks, one copy of any label per gap — safe because every other label appears at most `f−1` times, matching the number of gaps. If tasks outnumber the frame, no idle is ever needed and the answer is just `T`. So the answer is `max(T, (f−1)(n+1) + m)`.
>
> Verify on the examples: Example 1 gives `max(6, 2·3+2)=8`; Example 2 gives `max(6, 1·2+2)=6` — the `max` matters; Example 3 gives `max(6, 2·4+2)=10`. All match.
>
> Code is four lines: Counter, max, tie count, return the max. `O(T)` time, `O(1)` space.
>
> Follow-up if they want the order: greedy heap, rounds of `n+1`, pop the most-remaining distinct labels each round, and don't pad idles into the final round."

## 13. Say it in 60 seconds

"Count frequencies — only three numbers matter: the max frequency `F`, how many tasks tie at `F`, and the total count `T`. The busiest task forces a skeleton: it repeats with n-slot gaps, so up to its last run that's `(F−1)·(n+1)` intervals, plus one extra tail slot for every task tied at the max. That skeleton is a lower bound — and so is `T`, since every task needs an interval. Both bounds are tight: pour the remaining tasks into the gaps, one copy per gap, which works because every other task appears at most `F−1` times; and if tasks outnumber the idle slots, you never idle at all, so the answer is just `T`. Return the max of the two numbers. Count, take the max and its tie count, done — `O(n)` time, `O(1)` space. If they ask for the actual order, run a greedy heap in rounds of `n+1` instead."
