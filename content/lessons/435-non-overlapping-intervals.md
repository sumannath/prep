# Non-overlapping Intervals (LeetCode 435) — Complete Lesson

**One-line summary:** Flip the objective — minimizing removals is the same as *maximizing the number of intervals you keep* — then solve classic *activity selection* with a greedy: **sort by end time, sweep once, keep an interval iff its start ≥ the last kept end.**

---

## 1. Problem, restated precisely

Given `intervals[i] = [start_i, end_i]`, remove as few intervals as possible so that no two remaining intervals overlap. Touching at a single point does **not** count as overlapping: `[1,2]` and `[2,3]` may both stay.

Two framing details that decide whether your code is right:

- **Overlap predicate.** `[s1, e1]` and `[s2, e2]` overlap **iff** `s1 < e2` **and** `s2 < e1` (strict inequalities — the touching rule lives exactly here). Equivalently, they're compatible iff `e1 <= s2` or `e2 <= s1`.
- **The reframe.** If `k` intervals remain valid and non-overlapping, you removed `n − k`. So:

```
min removals  =  n  −  (max number of mutually non-overlapping intervals you can keep)
```

That right-hand side is the textbook **activity selection problem**, which has a famous greedy solution. We're not inventing a new algorithm; we're recognizing an old one.

**Precision notes (indices vs. values, duplicates):**

- `intervals[i]` is a *value pair*; the optimal solution never needs original indices — the output is a count. Sorting a copy destroys original positions, which is fine here, but if a follow-up asks *"which intervals to remove?"* you'd record kept entries during the scan.
- **Duplicates are distinct entries.** `[[1,2],[1,2]]` overlaps by the predicate above (shared interior, not a single point), so at most one copy survives; Example 2 is exactly this case.
- Constraints guarantee `start_i < end_i` strictly, so no zero-length intervals like `[3,3]` — you don't need to handle them.

---

## 2. Constraint decoding

| Constraint | What it tells you |
|---|---|
| `1 <= n <= 10^5` | Target **O(n log n)**. An O(n²) DP does ~10¹⁰ operations — far beyond typical judge limits (~10⁸ simple ops/sec). Exponential is absurd. |
| `-5·10^4 <= start_i < end_i <= 5·10^4` | Values are **bounded**: bucketing/counting-sort by end value gives a true **O(n + V)** algorithm (V ≈ 10⁵). Also, everything fits in 32-bit ints — no overflow risk from comparisons. |
| `start_i < end_i` (strict) | Well-formed intervals; no degenerate points. |
| Duplicates possible (Example 2) | Identical intervals are separate array entries; your algorithm must handle them without special-casing. |
| Input not stated as sorted | **Never assume sorted order.** |

---

## 3. Brute force, with a worked trace

Enumerate every subset: a subset is *valid* if pairwise non-overlapping; keep the largest valid one.

```python
def eraseOverlapIntervals_bruteforce(intervals):
    n = len(intervals)

    def overlaps(a, b):                      # touching does NOT count
        return a[0] < b[1] and b[0] < a[1]

    def compatible(kept):
        return all(not overlaps(kept[i], kept[j])
                   for i in range(len(kept))
                   for j in range(i + 1, len(kept)))

    best = 0
    def rec(i, kept):                        # decide intervals[i]
        nonlocal best
        if i == n:
            if compatible(kept):
                best = max(best, len(kept))
            return
        rec(i + 1, kept)                     # remove intervals[i]
        rec(i + 1, kept + [intervals[i]])    # keep   intervals[i]

    rec(0, [])
    return n - best
```

**Complexity:** 2ⁿ subsets × O(n²) pairwise checks → **O(2ⁿ · n²)**, O(n) recursion depth. Fine for n = 4; hopeless for n = 10⁵.

**Worked trace on Example 1:** `[[1,2],[2,3],[3,4],[1,3]]`, n = 4 → 16 subsets. The recursion explores include/exclude per index; the winning path:

```
rec(0, [])
└── keep [1,2] → rec(1, [[1,2]])
    └── keep [2,3] → rec(2, [[1,2],[2,3]])        # touch at 2 → OK
        └── keep [3,4] → rec(3, [[1,2],[2,3],[3,4]])
            ├── remove [1,3] → leaf: pairwise touching/disjoint → VALID, kept = 3  ★
            └── keep   [1,3] → leaf: [1,3] overlaps [1,2] AND [2,3] → invalid
```

To confirm ★ is optimal, check the size-3 subsets (kept = 4 is impossible since `[1,3]` overlaps `[1,2]` and `[2,3]`):

| Drop | Remaining subset | Valid? |
|---|---|---|
| `[1,2]` | `[2,3],[3,4],[1,3]` | No — `[1,3]` ∩ `[2,3]` |
| `[2,3]` | `[1,2],[3,4],[1,3]` | No — `[1,3]` ∩ `[1,2]` |
| `[3,4]` | `[1,2],[2,3],[1,3]` | No — `[1,3]` ∩ both |
| `[1,3]` | `[1,2],[2,3],[3,4]` | **Yes** ✓ |

Best kept = 3 → answer **1**. ✓

---

## 4. Stepping stone: an O(n²) DP (why greedy should work)

Sort by end. Let `dp[i]` = max intervals kept from the sorted prefix, **with sorted-interval `i` as the last kept one**:

```python
def eraseOverlapIntervals_dp(intervals):
    ivs = sorted(intervals, key=lambda x: x[1])
    n = len(ivs)
    dp = [1] * n                       # dp[i] = best chain ending at sorted slot i
    for i in range(n):
        for j in range(i):
            if ivs[j][1] <= ivs[i][0]: # j ends at/before i starts (touching OK)
                dp[i] = max(dp[i], dp[j] + 1)
    return n - max(dp)
```

**Mini-trace on Example 1** — sorted: `0:[1,2]  1:[2,3]  2:[1,3]  3:[3,4]`:

| i | interval | eligible j (`end_j <= start_i`) | dp[i] |
|---|---|---|---|
| 0 | `[1,2]` | — | 1 |
| 1 | `[2,3]` | 0 (end 2 ≤ 2, touching) | 2 |
| 2 | `[1,3]` | none (need end ≤ 1) | 1 |
| 3 | `[3,4]` | 0, 1, 2 (ends 2, 3, 3 ≤ 3) | 1 + max(1,2,1) = **3** |

Max kept = 3 → removals = 1. ✓ Note the DP already "discovers" the greedy chain; the greedy is what lets us drop the table. (Using `<` instead of `<=` here wrongly rejects touching chains — off-by-one that changes answers.) With a prefix-max + binary search over ends this becomes O(n log n) — the general *weighted-interval-scheduling* shape — but for unit weights the greedy below is simpler *and* optimal.

---

## 5. The core insight

> **Greedy: process intervals in increasing order of end time; keep an interval exactly when its start is ≥ the end of the last kept interval; otherwise remove it.**

**Why sort by end — and not by anything else:**

- **Sort by start, keep greedily → wrong.** `[[1,10],[2,3],[4,5]]`: naive keeps `[1,10]` and discards `[2,3]`, `[4,5]` → 2 removals; optimal removes the fat `[1,10]` → 1.
- **Sort by length (shortest first) → wrong.** `[[1,6],[8,13],[5,9]]`: shortest-first keeps `[5,9]`, kills both longer intervals → 2 removals; optimal keeps `[1,6]`,`[8,13]` (touch-adjacent, non-overlapping) → 1.
- **Sort by end → correct.** Intuition: *an interval that ends early leaves the most room for the future; committing to it can never hurt.*

**Exchange argument (optimality proof, compressed):**
Let `g` = the interval with the globally smallest end, and take any optimal kept set `S` with `f` = its earliest-ending member. Every other `x ∈ S` starts at or after `f.end` (if some `x` ended before `f`, then `x.end ≤ f.start < f.end`, contradicting `f`'s minimality). Since `g.end ≤ f.end ≤ x.start`, swapping `f → g` collides with nothing and preserves size. So *some* optimal solution contains `g`; recurse on the remainder. ∎

**Why one comparison per interval suffices:** after sorting by end, `prev_end` is the *largest* end among kept intervals, and the current interval's end `e ≥ prev_end`. Current overlaps a kept interval `k` iff `s < k.end` (the other condition `k.start < e` is automatic since `k.start < k.end ≤ e`). So *some* kept interval conflicts **iff** `s < prev_end`. One check, done.

---

## 6. Optimal algorithm

```python
from typing import List

def eraseOverlapIntervals(intervals: List[List[int]]) -> int:
    # Sort by END. Ties in end are harmless: two intervals sharing an end
    # always overlap each other, so at most one survives either way,
    # and either choice leaves the same prev_end.
    intervals.sort(key=lambda iv: iv[1])

    kept = 0
    prev_end = float("-inf")        # NOT 0 — starts may be negative!
    for start, end in intervals:
        if start >= prev_end:       # >= because touching is non-overlapping
            kept += 1
            prev_end = end
        # else: current ends no earlier than the kept one → safe to drop
    return len(intervals) - kept
```

Notes:

- Counting **kept** (then `n − kept`) makes the activity-selection connection explicit. The "count removals directly" variant (`removals += 1` on conflict) is equivalent — and correct *because* sorted by end guarantees the current conflicting interval ends no earlier than the kept one, so dropping the current one is always the exchange-safe choice.
- If a follow-up wants the surviving set: append `(start, end)` (or the original index, captured before sorting) to a list in the keep branch.
- Duplicates need no special handling: for `[[1,2],[1,2]]`, the second copy has `start=1 < prev_end=2` → removed automatically.

---

## 7. Traces on the official examples

**Example 1** `[[1,2],[2,3],[3,4],[1,3]]` — stable sort by end → `[[1,2],[2,3],[1,3],[3,4]]`:

| interval | `start >= prev_end`? | action | `prev_end` | kept |
|---|---|---|---|---|
| `[1,2]` | 1 ≥ −∞ ✓ | keep | 2 | 1 |
| `[2,3]` | 2 ≥ 2 ✓ (touch!) | keep | 3 | 2 |
| `[1,3]` | 1 < 3 ✗ | remove | 3 | 2 |
| `[3,4]` | 3 ≥ 3 ✓ (touch!) | keep | 4 | 3 |

→ **4 − 3 = 1** ✓ (the three survivors only touch at points).

**Example 2** `[[1,2],[1,2],[1,2]]`:

| interval | check | action | `prev_end` | kept |
|---|---|---|---|---|
| `[1,2]` | 1 ≥ −∞ ✓ | keep | 2 | 1 |
| `[1,2]` | 1 < 2 ✗ | remove | 2 | 1 |
| `[1,2]` | 1 < 2 ✗ | remove | 2 | 1 |

→ **3 − 1 = 2** ✓ (duplicates: only one copy survives).

**Example 3** `[[1,2],[2,3]]`:

| interval | check | action | `prev_end` | kept |
|---|---|---|---|---|
| `[1,2]` | 1 ≥ −∞ ✓ | keep | 2 | 1 |
| `[2,3]` | 2 ≥ 2 ✓ (touch) | keep | 3 | 2 |

→ **0** ✓ — this example *is* the `>=` vs `>` test: with `>` you'd return 1.

---

## 8. Complexity

| Approach | Time | Extra space | Viable at n = 10⁵? |
|---|---|---|---|
| Subset enumeration | O(2ⁿ · n²) | O(n) | ❌ (2^100000 leaves) |
| Sort by end + O(n²) DP | O(n²) ≈ 10¹⁰ steps | O(n) | ❌ TLE |
| Sort by end + DP with binary search (unit-weight interval scheduling) | O(n log n) | O(n) | ✓ but more code than needed |
| **Greedy: sort by end + one scan** | **O(n log n)** | **O(1) for the scan** (sort may use O(log n)–O(n) internally) | ✅ |
| Bucket by end value (constraint exploit) | O(n + V), V = 10⁵ | O(V) | ✅ |

- The **O(n log n)** is dominated by sorting; that's essentially optimal for comparison-based sorting: a comparison decision tree needs ≥ n! leaves (one per permutation), so depth ≥ log₂(n!) = Θ(n log n).
- Follow-up morsel: the problem itself inherits an Ω(n log n) comparison lower bound — map each integer `x` to `[x, x+1]`; then "answer ≤ n−2" holds iff some value repeats, i.e., element distinctness in disguise, which requires Ω(n log n) comparisons because the all-distinct inputs split into n! connected components while a depth-d comparison tree distinguishes at most 2ᵈ (Ben-Or's algebraic decision-tree argument).
- **Constraint exploit — O(n + V):** since `end ∈ [−5·10⁴ + 1, 5·10⁴]`, group intervals by end value (keep the max start per end); sweep end values ascending, keep one interval per group iff `max_start ≥ prev_end`. One pass to bucket + one pass over the value range = linear, because V is a fixed 10⁵ by the constraints.

```python
def eraseOverlapIntervals_linear(intervals):
    best_start = {}                       # end value -> max start with that end
    for s, e in intervals:
        if s > best_start.get(e, -10**9):
            best_start[e] = s
    kept, prev_end = 0, None
    for e in sorted(best_start):          # scan the fixed value range for strict O(n + V)
        if prev_end is None or best_start[e] >= prev_end:
            kept += 1
            prev_end = e                  # at most one survivor per end value
    return len(intervals) - kept
```

---

## 9. Implementation gotchas (Python / Java / C++)

| Language | Gotcha |
|---|---|
| Python | `intervals.sort(key=lambda iv: iv[1])` **mutates the caller's list** — use `sorted(...)` if the input must be preserved. Also, sorting *without* a key orders by start (then end) — the wrong greedy. |
| Java | `Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]))`. Habitually prefer `Integer.compare` over `a[1] - b[1]`: subtraction comparators overflow for extreme values in general (safe under these constraints since \|end\| ≤ 5·10⁴, but it's the classic landmine). |
| C++ | The comparator must be a **strict weak ordering**: `return a[1] < b[1];`. Writing `<=` violates it and is *undefined behavior* in `std::sort` (can crash inside introsort). Initialize the sentinel as `INT_MIN` (safe: starts ≥ −5·10⁴ > INT_MIN) or `LLONG_MIN`. |

---

## 10. Common mistakes

| # | Mistake | Symptom / counterexample | Fix |
|---|---|---|---|
| 1 | `start > prev_end` (strict) | Example 3 returns 1 instead of 0 | Touching is non-overlapping → use `>=` |
| 2 | Sort by **start**, keep greedily | `[[1,10],[2,3],[4,5]]` → 2 vs optimal 1 | Sort by end (or, sort by start but on conflict drop the interval with the *larger end* — an equivalent algorithm) |
| 3 | Sort by **length** | `[[1,6],[8,13],[5,9]]` → 2 vs optimal 1 | Sort by end; prove via exchange argument |
| 4 | Sentinel `prev_end = 0` | `[[-5,-4],[-3,-2]]` → first interval wrongly "conflicts" → 1 instead of 0 | Initialize to −∞ (`float("-inf")` / `INT_MIN` / `None`) |
| 5 | DP transition `end_j < start_i` | `[[1,2],[2,3]]` → DP says 1 removal | Touching pairs chain: use `end_j <= start_i` |
| 6 | Treating duplicates as one entity | `[[1,2],[1,2],[1,2]]` → 1 instead of 2 | Each entry is separate; the scan removes them one-for-one |
| 7 | Overlap predicate sign/strictness errors | `s1 < e2 and s2 < e1` with `<=`, or OR instead of AND | Memorize: overlap ⇔ **strict both ways** |
| 8 | Assuming sorted input | Fails on shuffled tests | Always sort yourself |
| 9 | C++ comparator `<=` | UB / crashes on large tests | Strict weak ordering: `<` |

---

## 11. Interview script (fuller talk track)

1. **Clarify out loud:** "Touching endpoints don't count as overlapping, correct? Is the input sorted? Can there be exact duplicates? You want the *count* of removals, not which ones?"
2. **Reframe:** "Minimizing removals is `n` minus maximizing kept intervals — that's activity selection."
3. **Progression in one breath:** "Brute force is 2ⁿ subsets; a sort-by-end DP gets O(n²), too slow at 10⁵; the greedy gets O(n log n)."
4. **State the greedy + why:** "Sort by end time; keep when `start >= last kept end`. Ends-earliest is exchange-safe: any optimal solution can be rewritten to include the globally earliest-ending interval, so the greedy is optimal."
5. **Complexity:** "O(n log n) for the sort, O(n) scan, O(1) extra beyond sorting."
6. **Code while narrating the three traps:** "Sort key is `end`; comparison is `>=` because touching is legal; sentinel is −∞, not 0, since starts can be negative."
7. **Test out loud** (next section) before declaring done.
8. **Offer follow-ups:** "I can also return *which* intervals survive by recording kept entries; if intervals carried weights, greedy breaks and I'd switch to DP + binary search (weighted interval scheduling); if values stay bounded, bucketing by end gives O(n + V)."

---

## 12. Test plan — propose these out loud before/after coding

| # | Input | Expected | What it guards |
|---|---|---|---|
| 1 | `[[1,2],[2,3],[3,4],[1,3]]` | 1 | Official Ex. 1; touching chain survives |
| 2 | `[[1,2],[1,2],[1,2]]` | 2 | Official Ex. 2; duplicates |
| 3 | `[[1,2],[2,3]]` | 0 | Official Ex. 3; the `>=` vs `>` trap |
| 4 | `[[7,9]]` | 0 | Single interval / loop init |
| 5 | `[[-5,-4],[-3,-2]]` | 0 | Negative values; catches `prev_end = 0` sentinel bug |
| 6 | `[[1,10],[2,3],[4,5]]` | 1 | Containment: drop the big interval, keep the small ones |
| 7 | `[[1,6],[8,13],[5,9]]` | 1 | Catches sort-by-length instinct |
| 8 | 10⁵ reverse-sorted intervals | runs fast | Order-independence + performance |

Optional but impressive: property-test the greedy against the brute force on random small instances (n ≤ 8) — it catches every predicate/sign bug instantly:

```python
import random
for _ in range(1000):
    n = random.randint(1, 8)
    ivs = [[s := random.randint(-10, 10), s + random.randint(1, 5)] for _ in range(n)]
    assert eraseOverlapIntervals([x[:] for x in ivs]) == eraseOverlapIntervals_bruteforce([x[:] for x in ivs])
```

---

## 13. Transferable patterns & related problems

**Patterns to carry forward:**

1. **Complement flip:** "minimum removals/replacements to satisfy a pairwise constraint" = `n − maximum feasible subset`. Recognizing the flip converts an unfamiliar question into a known one.
2. **Exchange-argument template:** "the element that costs the future the least can always appear in some optimal solution" — proves greedy choice for interval scheduling, Huffman, coin problems, etc.
3. **Interval-problem decision table** — *what you sort by encodes the question:*

| Question | Sort by | Technique |
|---|---|---|
| Min removals / max non-overlapping (this problem) | end | greedy sweep, `start >= prev_end` |
| Merge overlapping | start | sweep, extend current end |
| Max concurrent (rooms, load) | start (events) | sweep line / min-heap of ends |
| Remove covered intervals | start, end desc on ties | sweep with two conditions |
| Weighted intervals | end | DP + binary search (greedy fails) |

4. **Encode the touching rule in exactly one place** — the strictness of the overlap predicate / the comparison — and stay consistent.
5. **Bounded values ⇒ counting/bucket tricks** can beat the sort.

**Related problems:**

| Problem | Relationship |
|---|---|
| LC 646 – Maximum Length of Pair Chain | Identical greedy; returns max kept instead of `n − kept` |
| LC 452 – Minimum Number of Arrows to Burst Balloons | Sort by end, count groups — but touching counts as *same arrow* (`start <= prevEnd`), a strictness flip worth comparing aloud |
| LC 56 – Merge Intervals | Sort-by-start sibling in the family |
| LC 253 – Meeting Rooms II / LC 1094 – Car Pooling | Max-concurrency questions need a sweep/heap, *not* this greedy |
| LC 1235 – Maximum Profit in Job Scheduling | Weighted interval scheduling: greedy breaks once weights appear; DP + binary search |
| LC 1288 – Remove Covered Intervals | Sort by start (end descending on ties), one pass |

---

## 14. Say it in 60 seconds

> "The trick is flipping the objective: instead of minimizing removals, I maximize the number of intervals I keep — the answer is just n minus that. Maximizing a set of mutually non-overlapping intervals is classic activity selection, so the greedy is: sort by end time, sweep once, and keep an interval whenever its start is at least the last kept end. Touching endpoints don't overlap, so that's greater-than-*or-equal*, not strictly greater. On a conflict I drop the current interval, and that's safe because the interval ending earliest is always the best survivor — an exchange argument shows any optimal solution can be rewritten to include it. The sort dominates: O(n log n) time, constant extra space. Traps I'm watching: sort by end, not start or length; sentinel minus infinity, not zero, since starts can be negative; and duplicates like [1,2],[1,2] get removed one-for-one. I'd sanity-check that the touching example returns zero."
