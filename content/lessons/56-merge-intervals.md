# Merge Intervals — Complete Interview Lesson (LeetCode 56)

## 1. Problem Restatement

You're given `n` closed intervals on a number line, `intervals[i] = [start_i, end_i]` with `start_i <= end_i`. Two intervals **overlap** if they share at least one point — and the problem explicitly says **touching endpoints count as overlapping** (`[1,4]` and `[4,5]` merge into `[1,5]`). You must compute the **union** of all intervals, expressed as the shortest possible list of disjoint intervals, in ascending order of start.

Two framing notes worth saying out loud in an interview:

- This is a *set-union on ranges* problem, not a search problem. The output must "cover all the intervals in the input" with no gaps and no redundancies.
- Because overlap is **not transitive** (`[1,2]` overlaps `[2,4]`, `[2,4]` overlaps `[3,5]`, but `[1,2]` does *not* overlap `[3,5]`), the answer is the set of **connected clusters** under the overlap relation — you can't just dedupe pairwise results once.

**Precision note — indices vs. values:** `intervals[i][0]` and `intervals[i][1]` are **values** (coordinates on the line). When we later use loop variables like `read`, `write`, or `merged[-1]`, those are **indices/positions** into the array of intervals. Most off-by-one bugs in this problem come from mixing these two up — e.g., writing `last[1] = end` (assigning a *value*) vs. confusing it with positional bookkeeping.

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= intervals.length <= 10^4` | An `O(n log n)` solution does ~1.3×10⁵ comparisons — trivial. Even `O(n²)` (~10⁸ cheap ops) is *borderline* but risky; target `O(n log n)`. |
| `0 <= start_i <= end_i <= 10^4` | Values are small and **non-negative**, and pairs are guaranteed well-formed (`start <= end`), so no normalization/swap step is needed. Small value range also unlocks a non-comparison "bucket/difference array" trick (see §7). |
| No promise the input is **sorted** | Example 3 (`[[4,7],[1,4]]`) proves it. **Always sort unless the interviewer explicitly says it's pre-sorted.** |
| Touching merges (Example 2) | The overlap predicate must be `<=`, not `<`. |
| `n >= 1` | Empty input can't occur, but a one-line guard is cheap and signals care. |
| Implicit | Output should be ascending by start (all examples are). Our algorithm produces this for free — still, confirm it. |

---

## 3. Brute Force: Insert-and-Absorb (with a Worked Trace)

If the "sort" insight doesn't come to you under pressure, a correct fallback: process intervals one at a time, and **absorb** each new interval into any interval already in the result that it overlaps. Crucially, after merging, the *union* may now overlap yet another existing entry — so you must **recheck from scratch** until the new interval can't merge with anything.

```python
def merge_bruteforce(intervals: list[list[int]]) -> list[list[int]]:
    result: list[list[int]] = []
    for start, end in intervals:
        cur_s, cur_e = start, end
        changed = True
        while changed:                       # a merge can cascade
            changed = False
            for i, (s, e) in enumerate(result):
                if cur_s <= e and s <= cur_e:            # general overlap predicate (§4)
                    cur_s, cur_e = min(cur_s, s), max(cur_e, e)
                    result.pop(i)
                    changed = True
                    break
        result.append([cur_s, cur_e])
    return result
```

**Worked trace on `[[1,4],[6,8],[2,7]]`** (chosen because it forces a *cascade*):

| Step | New interval | Check against `result` | Action | `result` after |
|---|---|---|---|---|
| 1 | `[1,4]` | — (empty) | append | `[[1,4]]` |
| 2 | `[6,8]` | `6 <= 4`? No | append | `[[1,4],[6,8]]` |
| 3 | `[2,7]` | vs `[1,4]`: `2<=4` and `1<=7` → merge | union = `[1,7]`, pop | `[[6,8]]`, still holding `[1,7]` |
| 3 (recheck) | — | vs `[6,8]`: `1<=8` and `6<=7` → merge | union = `[1,8]`, pop | `[]`, append → `[[1,8]]` |

Output: `[[1,8]]`. ✔ (The `[2,7]` bridge is what makes the cascade necessary — this is exactly why "merge once and move on" is a bug.)

**Complexity:** each of `n` insertions may cascade through up to `O(n)` result entries, each cascade step costing an `O(n)` scan → **O(n³)** worst case (e.g., many disjoint intervals followed by one giant absorbing interval). A *better* brute force: build the pairwise overlap graph (an edge wherever the predicate in §4 holds), find connected components with union–find, and emit `[min start, max end]` per component — the graph has at most `n(n−1)/2` edges, giving **O(n²)** time. That's a perfectly respectable "I at least want a correct baseline" answer.

---

## 4. The Core Insight

**Atom — the overlap predicate.** Two closed intervals `[a,b]` and `[c,d]` overlap (touching inclusive) **iff** `a <= d` **and** `c <= b`. If you first know `a <= c` (i.e., the intervals are ordered by start), this simplifies to a single test: **`c <= b`** — "the next one starts before (or at) where the current one ends."

**Why sorting makes everything local.** Sort by start. Sweep left to right maintaining one "currently open" merged interval. Two things are now true:

1. **Overlap becomes a neighbor check.** Suppose the next interval's start is strictly greater than the current merged interval's end. Every *remaining* interval has an even larger start, so **nothing later can ever overlap the current merged interval** — you may safely close it and never think about it again. This is the whole algorithm: it converts a global clustering problem into a chain of `O(1)` local decisions.
2. **Containment forces `max`.** Sorting by start guarantees `next.start >= current.start`, but says nothing about ends — a later interval can be *fully contained* (`[2,3]` inside `[1,10]`). So when merging, the new end is `max(current_end, next_end)`, never just `next_end`.

**Loop invariant** (the sentence to say in an interview): *after processing the k-th sorted interval, `merged` is a sorted list of disjoint intervals exactly covering the union of the first k intervals, and only `merged[-1]` can possibly overlap any future interval* — because every earlier interval was closed only when some start exceeded its end, and future starts are all ≥ that one.

**Why sort by start and not by end?** Sorting by end doesn't give you locality: a new interval may extend *leftward* past everything seen so far (`[2,3]` then `[1,4]`), breaking the "only compare with the last element" property. Start-ordering is what makes leftward extension impossible.

---

## 5. Optimal Algorithm: Sort by Start, Single Sweep

1. Sort intervals by start (ties in start may be in any order — `max` makes tie order irrelevant; see §6, containment trace).
2. Initialize `merged` with a **copy** of the first interval.
3. For each subsequent interval `[start, end]`:
   - If `start <= merged[-1][1]` → overlap (touching counts) → `merged[-1][1] = max(merged[-1][1], end)`.
   - Else → append `[start, end]` as a new cluster.
4. Return `merged`.

### Python (primary solution)

```python
from typing import List

def merge(intervals: List[List[int]]) -> List[List[int]]:
    if not intervals:                        # defensive; constraints say n >= 1
        return []

    # sorted() returns a NEW list: we don't reorder the caller's list.
    intervals = sorted(intervals, key=lambda iv: iv[0])

    merged: List[List[int]] = [intervals[0][:]]   # copy the row: don't alias the input
    for start, end in intervals[1:]:              # start, end are VALUES, not indices
        last = merged[-1]
        if start <= last[1]:                      # '<=' : touching endpoints DO merge
            last[1] = max(last[1], end)           # max() : handles contained intervals
        else:
            merged.append([start, end])
    return merged
```

### In-place variant (the classic follow-up: "no extra output list?")

Use a **write pointer**; compact results into the front of the same array. Only meaningful if the interviewer has agreed you may mutate the input.

```python
def merge_in_place(intervals: List[List[int]]) -> List[List[int]]:
    intervals.sort(key=lambda iv: iv[0])
    write = 0
    for read in range(1, len(intervals)):
        if intervals[read][0] <= intervals[write][1]:
            intervals[write][1] = max(intervals[write][1], intervals[read][1])
        else:
            write += 1
            intervals[write] = intervals[read]    # plain assign; we never revisit `read`
    del intervals[write + 1:]
    return intervals
```

Note the off-by-one surface here: the surviving region is indices `0..write`, hence `del intervals[write + 1:]` — truncate at `write + 1`, not `write`.

---

## 6. Traces on the Official Examples

**Example 1:** `[[1,3],[2,6],[8,10],[15,18]]` — already sorted by start.

| Interval | `start <= last[1]`? | Action | `merged` |
|---|---|---|---|
| `[1,3]` | (seed) | copy in | `[[1,3]]` |
| `[2,6]` | `2 <= 3` ✔ | `last[1] = max(3,6) = 6` | `[[1,6]]` |
| `[8,10]` | `8 <= 6` ✘ | append | `[[1,6],[8,10]]` |
| `[15,18]` | `15 <= 10` ✘ | append | `[[1,6],[8,10],[15,18]]` ✔ |

**Example 2:** `[[1,4],[4,5]]`

| Interval | Check | Action | `merged` |
|---|---|---|---|
| `[1,4]` | seed | copy in | `[[1,4]]` |
| `[4,5]` | `4 <= 4` ✔ (touching!) | `last[1] = max(4,5) = 5` | `[[1,5]]` ✔ |

**Example 3:** `[[4,7],[1,4]]` — **unsorted**; sort first → `[[1,4],[4,7]]`.

| Interval | Check | Action | `merged` |
|---|---|---|---|
| `[1,4]` | seed | copy in | `[[1,4]]` |
| `[4,7]` | `4 <= 4` ✔ | `last[1] = 7` | `[[1,7]]` ✔ |

**Containment trace (why `max` is mandatory):** `[[1,10],[2,3],[4,5]]`

| Interval | Check | Action | `merged` |
|---|---|---|---|
| `[1,10]` | seed | copy in | `[[1,10]]` |
| `[2,3]` | `2 <= 10` ✔ | `last[1] = max(10,3) = 10` | `[[1,10]]` |
| `[4,5]` | `4 <= 10` ✔ | `last[1] = max(10,5) = 10` | `[[1,10]]` ✔ |

Without `max`, step 2 would corrupt `[1,10]` into `[1,3]`.

**Tie-order independence (duplicates in start):** `[[1,4],[1,2]]` and `[[1,2],[1,4]]` both yield `[[1,4]]` — whichever comes second is absorbed by `max`. Identical intervals `[[1,4],[1,4]]` collapse to `[[1,4]]` for the same reason, so duplicates need no special casing.

---

## 7. Complexity

| Approach | Time | Extra space | Verdict |
|---|---|---|---|
| Repeated pairwise merging (fixpoint) | O(n³) worst | O(n) | Verbal fallback only |
| Overlap graph + union–find | O(n²) | O(n²) edges (O(n) DSU) | Respectable fallback |
| **Sort by start + sweep** | **O(n log n)** | **O(n)** output | ✅ Target answer |
| Sweep on pre-sorted input | O(n) | O(n) | Only if interviewer confirms sortedness |
| Difference array over values | O(n + V), V = 10⁴ | O(V) | Follow-up flex; fiddly (below) |

- **Time:** dominated by the sort; the sweep is `O(n)` with `O(1)` work per interval.
- **Space:** `O(n)` for the output (worst case: all intervals disjoint). Python's Timsort uses up to `O(n)` auxiliary; C++ `std::sort` is `O(log n)` stack.

**"Can we beat O(n log n)?"** — two-part answer:
- *In the comparison model, no:* the problem embeds sorting — if every interval is a point `[x_i, x_i]`, the output is exactly the sorted order of the `x_i`, and since each comparison yields at most one bit of information, distinguishing all `n!` possible orderings requires Ω(log₂(n!)) = Ω(n log n) comparisons.
- *Outside that model, yes:* because values are bounded by `V = 10^4`, a difference array (`+1` at `start`, `−1` at `end`, then prefix-sum) finds covered "gaps" in `O(n + V)`, and contiguous runs of covered gaps reconstruct as `[run_start, run_end + 1]`. Caveats to mention: touching intervals merge correctly here only because gap coverage is contiguous, and **point intervals like `[3,3]` cover zero gaps**, so they need separate tracking. Say this as a flex; don't code it unless asked.

---

## 8. Common Mistakes & Language Gotchas

| # | Mistake | Failing case / symptom | Fix |
|---|---|---|---|
| 1 | Assuming the input is sorted | Example 3: `[[4,7],[1,4]]` | Sort (or explicitly confirm sortedness) |
| 2 | Using `start < last_end` | `[[1,4],[4,5]]` stays split | Use `<=`; touching merges per the spec |
| 3 | Writing `last[1] = end` without `max` | `[[1,10],[2,3]]` → `[[1,3]]` | `last[1] = max(last[1], end)` |
| 4 | Comparing a new interval against *every* result entry after sorting | Correct but ~O(n²)-ish; signals a missing insight | Only `merged[-1]` can overlap (invariant, §4) |
| 5 | Merging each interval into only one match without rechecking (no-sort version) | Bridge intervals: `[[1,4],[6,8],[2,7]]` | Recheck after every merge, or just sort |
| 6 | **Aliasing:** `merged.append(intervals[0])` then mutating `last[1]` | Silently rewrites the caller's input row | Copy the row: `intervals[0][:]` |
| 7 | `intervals = intervals.sort()` | `.sort()` returns `None` → downstream crash | Use `sorted(...)` or call `.sort()` and use in place |
| 8 | Off-by-one in the write-pointer variant | Truncating one interval too many/few | Surviving region is `0..write`; cut at `write + 1` |
| 9 | Point intervals `[x,x]` special-cased | Unneeded branching in sort+sweep (handled naturally) | Keep the sweep uniform; only the diff-array follow-up needs point handling |

**Java / C++ gotchas (short list):**

- **Java comparator:** use `Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]))`. The idiomatic `(a, b) -> a[0] - b[0]` is a **subtractive comparator** — it overflows for wide or mixed-sign values (harmless for `0..10^4`, but a flagged bad habit). Also note `Arrays.sort` on `int[][]` requires the comparator overload; build results in an `ArrayList<int[]>` and finish with `toArray(new int[0][])` since arrays can't shrink (the in-place version returns `Arrays.copyOfRange(intervals, 0, write + 1)`).
- **C++ reference invalidation:** `auto& last = merged.back();` held across a later `merged.push_back(...)` can dangle after reallocation — re-fetch `merged.back()` each iteration or index into the vector. (`std::sort(intervals.begin(), intervals.end())` conveniently works via lexicographic `vector<int>` comparison; `merged.reserve(intervals.size())` avoids reallocation entirely.)
- **Overflow habit (both):** with these constraints nothing overflows, but never write tests like `start < end + 1` — if ends could reach `INT_MAX`, `end + 1` overflows; compare `start <= end` directly.

---

## 9. Test Cases to Propose Out Loud

Before coding, say: *"I'll assume the input may be unsorted, touching endpoints merge, and I'll return a new list without mutating the input — correct?"* Then run this suite:

| Test | Input | Expected | What it verifies |
|---|---|---|---|
| Example 1 | `[[1,3],[2,6],[8,10],[15,18]]` | `[[1,6],[8,10],[15,18]]` | Basic overlap merge |
| Example 2 | `[[1,4],[4,5]]` | `[[1,5]]` | Touching endpoints (`<=`, not `<`) |
| Example 3 | `[[4,7],[1,4]]` | `[[1,7]]` | Unsorted input |
| Single / point interval | `[[5,5]]` | `[[5,5]]` | `n = 1`; `start == end` |
| Containment | `[[1,10],[2,3],[4,8]]` | `[[1,10]]` | `max()` on extension |
| Duplicates | `[[1,4],[1,4],[2,5]]` | `[[1,5]]` | Equal pairs / equal starts |
| Touching chain | `[[1,2],[2,3],[3,4]]` | `[[1,4]]` | Cascading via `<=` |
| All disjoint | `[[1,2],[3,4],[5,6]]` | `[[1,2],[3,4],[5,6]]` | No merges — pass-through |
| Bridge / cascade | `[[1,4],[6,8],[2,7]]` | `[[1,8]]` | A later interval unifying two clusters |
| Bounds + points | `[[0,0],[9999,10000],[9999,10000]]` | `[[0,0],[9999,10000]]` | Value bounds, duplicate collapse |

After coding, dry-run Examples 1–3 in front of the interviewer (tables in §6), then call out items 3–5 and 9 as "the ones my bugs would live in."

---

## 10. Transferable Patterns & Related Problems

**Reusable atoms from this lesson:**

1. **Sort by start + sweep with running state.** The template for a whole family: maintain one running structure, make an `O(1)` local decision per interval, prove locality with the "future starts are only bigger" argument.
2. **The overlap predicate.** Unordered form: `[a,b]` overlaps `[c,d]` iff `a <= d and c <= b`. Ordered form: `next_start <= current_end`. Flip `<=` to `<` per the problem's touching semantics.
3. **Event/sweep-line encoding.** Convert intervals to `(+1, start)` / `(−1, end)` events. **Tie-order at equal coordinates encodes touching semantics** — if touching *does* overlap (this problem), process starts before ends at the same coordinate; if it doesn't (classic Meeting Rooms), process ends first. This detail is a favorite interviewer probe.
4. **Two pointers over two sorted interval lists.** For pairwise operations between two interval sets.

| Related problem | How it differs from Merge Intervals |
|---|---|
| LC 57 — Insert Interval | Insert **one** interval into an already disjoint, sorted list; three phases (before / absorb-run / after), `O(n)` |
| LC 435 — Non-overlapping Intervals | The removal-count dual: sort by **end**, greedily keep earliest-ending compatible intervals |
| LC 252 / 253 — Meeting Rooms I / II | Overlap detection / max concurrency: min-heap of end times, or separately sorted starts & ends with a tie rule |
| LC 986 — Interval List Intersections | Two pointers over two sorted lists; intersection is `[max(starts), min(ends)]` when nonempty |
| LC 452 — Minimum Arrows to Burst Balloons | Sort by end; one arrow per overlapping cluster (touching counts here) |
| LC 759 — Employee Free Time | Merge everything, then report **gaps** between consecutive output intervals |
| LC 1094 — Car Pooling | Pure diff-array sweep over stop positions |
| LC 729 — My Calendar I | Maintain a disjoint set incrementally; bisect + neighbor overlap check per booking |

---

## 11. Full Interview Talk Track

**Clarify (30s):** "Two quick assumptions I want to confirm: the input isn't guaranteed sorted — right? And by the examples, intervals that merely *touch*, like `[1,4]` and `[4,5]`, should merge. I'll also assume you want the output ascending by start, and I'll avoid mutating the input."

**Restate (15s):** "So I'm computing the union of all intervals as a minimal list of disjoint intervals."

**Brute force (20s):** "Naively I could repeatedly merge any overlapping pair until nothing changes — that cascades, and it's roughly cubic. A better baseline is an overlap graph plus connected components, quadratic. But there's a linear-after-sort insight."

**Insight (30s):** "If I sort by start, then for the interval I'm currently building, overlap becomes a purely local question: if the next interval starts after my current end, every later interval starts even later, so nothing can ever overlap this one again — I can close it. And since a later interval can be fully contained in the current one, when I do merge, I extend the end with a max."

**Algorithm (20s):** "Sort by start. Keep a result list; seed it with the first interval. For each next interval: if its start is ≤ the last result interval's end — with ≤, because touching merges — set that end to the max of the two ends; otherwise append it as a new interval."

**Complexity (10s):** "O(n log n) for the sort, O(n) sweep, O(n) space for the output. In-place is possible with a write pointer if you'd like."

**Code, then dry-run** Examples 1–3 (they exercise sorting, touching, and the normal path), then name the edge cases from §9: containment, duplicates, point intervals, single interval, all-disjoint.

---

## 12. Say It in 60 Seconds

> "First I'd confirm two things: the input isn't necessarily sorted, and touching intervals — like `[1,4]` and `[4,5]` — count as overlapping and must merge.
>
> The key move is sorting intervals by start. Once sorted, overlap becomes a local check: I keep a result list, and for each interval I compare its start to the end of the *last* merged interval. If the start is less than or equal to that end — with equality, because touching merges — I extend that interval's end to the *max* of the two ends; the max matters because a later interval can be fully contained, like `[2,3]` inside `[1,10]`. Otherwise I append a new interval. This is correct because whenever I close an interval, every future start is even larger, so nothing can ever overlap it again — overlap only needs to be checked against the last element.
>
> Time is O(n log n) for the sort plus an O(n) sweep; space is O(n) for the output, and there's an in-place version with a write pointer.
>
> Edge cases I'd test: unsorted input, touching endpoints, contained intervals, duplicate intervals, point intervals like `[3,3]`, and a single interval."
