# Insert Interval — Complete Lesson (LeetCode 57)

---

## 1. Problem Restatement

You're given a list of **non-overlapping** intervals, **already sorted by start time** (ascending). You're handed one more interval, `newInterval`, and must insert it into the list so that the result is:

1. **Still sorted** by start, and
2. **Still contains no overlapping intervals** — any intervals that overlap after insertion must be merged into a single interval.

Two intervals **overlap if they share at least one point** — this includes the case where one interval's end exactly equals another's start (e.g., `[1,3]` and `[3,5]` share the point `3`).

You may build and return a new array; in-place modification is not required.

**Key reframe for the interviewer:** *"Given that the input is sorted and disjoint, insertion is really a three-region problem: intervals entirely to the left of `newInterval`, intervals that collide with it, and intervals entirely to the right."*

---

## 2. Decoding the Constraints

| Constraint | What it tells you about the solution |
|---|---|
| `0 <= intervals.length <= 10^4` | **The list can be empty.** Handle `intervals == []` — the answer is just `[newInterval]`. Also, O(n²) brute force would be 10⁸ ops — borderline; aim for O(n). |
| `intervals[i].length == 2`, `0 <= start_i <= end_i <= 10^5` | Start ≤ end always (no reversed/degenerate-empty intervals to normalize). Values fit in 32-bit ints everywhere — **no overflow concerns** even in Java/C++ with `int`. |
| Sorted ascending by start, non-overlapping | This is the gift. It means the array has **three contiguous zones** relative to `newInterval`, so we never need to sort or scan out of order. No duplicate starts exist, but a merged interval can equal a pre-existing one — that's fine, merging handles it. |
| `newInterval` is a single `[start, end]` | Exactly one interval to place → the "collision region" is one **contiguous slice** of the array. This contiguity is the entire reason the O(n) single pass works. |

---

## 3. Brute Force: Append and Re-Merge

**Idea:** Treat it like *Insert Interval*'s sibling problem, *Merge Intervals* (LC 56): append `newInterval` to the list, sort, then run the standard sweep-line merge.

```python
def insert_bruteforce(intervals, newInterval):
    all_intervals = intervals + [newInterval]        # O(n) copy
    all_intervals.sort(key=lambda x: x[0])           # O(n log n)
    merged = []
    for start, end in all_intervals:
        if merged and start <= merged[-1][1]:        # shares a point → overlap
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
```

**Trace** on Example 2: `intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]]`, `newInterval = [4,8]`

| Step | Appended list (after sort — already sorted here) | `merged` so far | Action |
|---|---|---|---|
| 1 | `[1,2]` | `[[1,2]]` | no prior, push |
| 2 | `[3,5]` | `[[1,2]]` | `3 > 2` → push |
| 3 | `[4,8]` | `[[1,2],[3,5]]` | `4 ≤ 5` → merge → `[3,8]` |
| 4 | `[6,7]` | `[[1,2],[3,8]]` | `6 ≤ 8` → merge → `[3,8]` |
| 5 | `[8,10]` | `[[1,2],[3,8]]` | `8 ≤ 8` → merge → `[3,10]` |
| 6 | `[12,16]` | `[[1,2],[3,10]]` | `12 > 10` → push |
| ✓ | | `[[1,2],[3,10],[12,16]]` | matches expected output |

**Complexity:** O(n log n) time (dominated by the sort), O(n) space.

**Why it's wasteful:** the input was *already sorted and disjoint*. Sorting throws away information the problem handed us for free. A sharp candidate says this out loud — it signals you see the path to O(n).

---

## 4. The Core Insight

Because the existing intervals are **sorted by start and mutually non-overlapping**, their relationship to `newInterval = [s, e]` splits them into **three contiguous runs**:

```
[ all intervals with end < s ]  [ intervals overlapping [s,e] ]  [ all intervals with start > e ]
        Phase 1: copy                Phase 2: merge into one           Phase 3: copy
```

- **Phase 1:** every interval ending **before** `s` starts (i.e., `end < s`, *strictly* less) can't touch `newInterval` — copy it as-is.
- **Phase 2:** because the array is sorted and disjoint, once one interval overlaps `newInterval`, all overlapping ones are adjacent. Absorb them all: `s = min(s, first.start)`, `e = max(e, last.end)`, then push `[s, e]`.
- **Phase 3:** every remaining interval starts strictly after `e` (`start > e`) — copy as-is.

The boundary conditions are where the "shares at least one point" rule lives:

- Interval `[a, b]` is **strictly left** of `[s, e]` iff `b < s` (touching, `b == s`, counts as overlap — so we need strict `<` to stop Phase 1).
- Interval `[a, b]` is **strictly right** iff `a > e` (`a == e` shares a point → must merge).

**Why O(n) is optimal:** any correct algorithm must write all n input intervals into the output, so Ω(n) is a trivial output-size lower bound; the single pass achieves it. (A binary-search variant can find the merge region in O(log n), but copying the untouched intervals still forces O(n) total, so it doesn't change asymptotics.)

---

## 5. Optimal Approach: Three-Phase Single Pass

### Code

```python
def insert(intervals: list[list[int]], newInterval: list[int]) -> list[list[int]]:
    s, e = newInterval
    result = []
    i, n = 0, len(intervals)

    # Phase 1: intervals entirely to the LEFT of newInterval (end < s)
    while i < n and intervals[i][1] < s:
        result.append(intervals[i])
        i += 1

    # Phase 2: all overlapping intervals — absorb them into [s, e]
    while i < n and intervals[i][0] <= e:
        s = min(s, intervals[i][0])
        e = max(e, intervals[i][1])
        i += 1
    result.append([s, e])

    # Phase 3: everything remaining is entirely to the RIGHT (start > e)
    while i < n:
        result.append(intervals[i])
        i += 1

    return result
```

Note the merged bounds: `min(s, intervals[i][0])` matters because a *pre-existing* interval could extend left of `newInterval`'s start (e.g., inserting `[4,8]` next to `[3,5]`). Symmetrically `max(e, ...)` handles intervals extending right.

### Trace — Example 1

`intervals = [[1,3],[6,9]]`, `newInterval = [2,5]` → `s=2, e=5`

| Phase | i | Interval | Check | Action | `result` |
|---|---|---|---|---|---|
| 1 | 0 | `[1,3]` | `3 < 2`? **No** (`3` and `2` — wait, `3 ≥ 2`) | stop Phase 1 | `[]` |
| 2 | 0 | `[1,3]` | `1 ≤ 5`? **Yes** | merge: `s=min(2,1)=1`, `e=max(5,3)=5`; i→1 | `[]` |
| 2 | 1 | `[6,9]` | `6 ≤ 5`? **No** | stop; push `[1,5]` | `[[1,5]]` |
| 3 | 1 | `[6,9]` | — | copy; i→2 | `[[1,5],[6,9]]` ✓ |

### Trace — Example 2

`intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]]`, `newInterval = [4,8]` → `s=4, e=8`

| Phase | i | Interval | Check | Action | `result` |
|---|---|---|---|---|---|
| 1 | 0 | `[1,2]` | `2 < 4`? **Yes** | copy; i→1 | `[[1,2]]` |
| 1 | 1 | `[3,5]` | `5 < 4`? **No** | stop Phase 1 | `[[1,2]]` |
| 2 | 1 | `[3,5]` | `3 ≤ 8`? **Yes** | merge: `s=3`, `e=8`; i→2 | `[[1,2]]` |
| 2 | 2 | `[6,7]` | `6 ≤ 8`? **Yes** | merge: `e=8`; i→3 | `[[1,2]]` |
| 2 | 3 | `[8,10]` | `8 ≤ 8`? **Yes** | merge: `e=10`; i→4 | `[[1,2]]` |
| 2 | 4 | `[12,16]` | `12 ≤ 8`? **No** | stop; push `[3,10]` | `[[1,2],[3,10]]` |
| 3 | 4 | `[12,16]` | — | copy; i→5 | `[[1,2],[3,10],[12,16]]` ✓ |

Note step `i=3`: `[8,10]` merges because `8 == 8` — intervals sharing a *single point* overlap. If we'd written the Phase-2 condition as `intervals[i][0] < e`, we'd emit `[[1,2],[3,8],[8,10],[12,16]]` — wrong.

### Complexity

| Metric | Value | Why |
|---|---|---|
| Time | **O(n)** | Each interval is visited exactly once across the three phases; each is copied or merged in O(1). |
| Space | **O(n)** for the output | O(1) auxiliary beyond the result list (required by the problem anyway). |
| Merge region found | — | Contiguous by sortedness — no scan-back needed. |

---

## 6. Test Cases to Propose Out Loud

State these before coding — it's cheap insurance and shows rigor:

1. **Official Example 1:** `[[1,3],[6,9]]`, `[2,5]` → `[[1,5],[6,9]]` (partial overlap on the left).
2. **Official Example 2:** `[[1,2],[3,5],[6,7],[8,10],[12,16]]`, `[4,8]` → `[[1,2],[3,10],[12,16]]` (multi-interval absorption, point-touch merge).
3. **Empty input:** `intervals = []`, `newInterval = [5,7]` → `[[5,7]]`. (Constraint explicitly allows length 0.)
4. **No overlap, insert in the middle gap:** `[[1,2],[6,7]]`, `[3,4]` → `[[1,2],[3,4],[6,7]]`. (Phase 2 absorbs nothing; `newInterval` is pushed as-is.)
5. **Point-touching on both sides:** `[[1,3],[6,8]]`, `[4,5]` → `[[1,3],[4,5],[6,8]]` — but `[[1,3],[6,8]]`, `[3,6]` → `[[1,8]]`. The off-by-one test for the strict/non-strict comparisons.
6. **New interval covers everything:** `[[2,3],[5,6]]`, `[0,10]` → `[[0,10]]`. (Phase 1 and Phase 3 copy nothing.)
7. **New interval before all / after all:** `[[3,4]]`, `[0,1]` → `[[0,1],[3,4]]`; `[[3,4]]`, `[5,9]` → `[[3,4],[5,9]]`.
8. **Single-interval containment:** `[[1,10]]`, `[3,5]` → `[[1,10]]` (merged result equals the existing interval; the `min`/`max` in Phase 2 handles this).

---

## 7. Common Mistakes

| # | Mistake | Consequence | Fix |
|---|---|---|---|
| 1 | Phase-1 condition written as `intervals[i][1] <= s` | `[1,3]` + new `[3,5]` fails to merge — output `[[1,3],[3,5]]` | Must be strict: `end < s` |
| 2 | Phase-2 condition written as `intervals[i][0] < e` | `[3,8]` + `[8,10]` fails to merge in Example 2's trace | Must be non-strict: `start <= e` |
| 3 | Forgetting `min(s, intervals[i][0])` in the merge | Inserting `[4,8]` next to `[3,5]` yields `[4,10]` instead of `[3,10]` | Always widen both ends: `s = min(...)`, `e = max(...)` |
| 4 | Assuming `intervals` is non-empty | Crash / wrong answer on `[]` | The Phase loops naturally handle empty input; just don't index `intervals[0]` eagerly |
| 5 | Re-merging the whole array or sorting | O(n log n); throws away the sortedness guarantee the problem gives you | Use the three-phase scan |
| 6 | Mutating `intervals` elements while iterating | Only a problem if you also reuse the list; the problem says a new array is fine | Build a fresh `result` list — it sidesteps all aliasing issues |
| 7 | Off-by-one on "which side am I in?" when *mutating* input in-place (an interviewer variant) | Merging while splicing shifts indices and skips elements | If asked for in-place: find merge region first, compute `[s, e]`, then `del intervals[i:j]` and `intervals.insert(i, [s, e])` — two index computations, not one fused loop |

---

## 8. Language Gotchas

| Language | Gotcha |
|---|---|
| **Python** | Tuples from iteration are immutable — if you merge in place, make sure `result` holds fresh lists (`[s, e]`), not aliases into `intervals`. Also, `list[list[int]]` type hints require Python ≥ 3.9 (or `from typing import List`). |
| **Java** | `intervals` is `int[][]`. Use `intervals[i][0]` / `intervals[i][1]` directly rather than unboxing an `Integer` wrapper (`List<int[]>` is common — remember `List<Integer>` would autobox and break primitive comparisons). `result.add(new int[]{s, e})` — don't accidentally add the caller's `newInterval` reference and then mutate it. |
| **C++** | Use `vector<vector<int>>` and `emplace_back`; beware `intervals[i][1] < s` with unsigned/size_t mixing if you store `s` from a loop index by mistake. `result.push_back({s, e})` needs the initializer-list form; `result.emplace_back(s, e)` constructs a `vector<int>` from two ints — fine, but `emplace_back({s, e})` is a compile error. No overflow risk here (values ≤ 10⁵), but `std::max`/`std::min` on the ends is still mandatory for correctness, not just style. |

---

## 9. Transferable Patterns & Related Problems

**Pattern: "Exploit sorted + disjoint structure."** When a sequence is sorted and has a global invariant (disjointness here), a new element splits it into *before / collision / after* zones. This exact shape recurs in:

| Problem | Connection |
|---|---|
| **LC 56 — Merge Intervals** | The brute force above *is* this problem. Learn it first; then LC 57's insight is "skip the sort." |
| **LC 435 / LC 452** (Non-overlapping Intervals, Meeting Rooms II variants) | Same overlap predicate — master the `end < start_next` vs `end ≤ start_next` distinction once, reuse everywhere. |
| **LC 228 — Summary Ranges** | Sorted-array single pass with a running merged value; identical three-zone thinking. |
| **Interval scheduling / calendar booking (LC 729, 731)** | Insert-then-check-overlap logic; LC 729 is literally "insert an interval and report if it collided." |
| **Binary-search variant** | You can `bisect` the merge region's left boundary (first interval with `end ≥ s`) and right boundary (first with `start > e`) in O(log n), then splice. As noted, output copying keeps total time O(n), but it's a good talking point if the interviewer pushes on reducing *comparisons*. |

**Interview talking points to bank:**
- "Sorted + disjoint ⇒ the overlap region is contiguous ⇒ single pass, no sort."
- "The overlap predicate's strictness encodes the 'share at least one point' rule: left-boundary strict `<`, right-boundary non-strict `≤`."
- "Merge bounds need `min`/`max` on both ends — the existing interval can stick out on either side."

---

## 10. Say It in 60 Seconds

> "The input is already sorted and non-overlapping, so I don't need to sort or do a full merge pass. I think of it as three zones relative to the new interval.
>
> First, I copy every interval that ends strictly before the new interval starts — strictly, because if an interval ends exactly at the new start, they share a point and must merge.
>
> Second, I walk forward while the current interval starts at or before the new end — again, equal counts as overlap — and I widen the new interval's start and end with min and max as I absorb each one, since an existing interval can stick out on either side. Then I push that merged interval.
>
> Third, I copy everything remaining, which is guaranteed to start after the new end.
>
> Each interval is touched once, so it's O(n) time and O(n) for the output — and O(n) is optimal since we have to write n intervals out anyway. Edge cases I'd call out: empty input, an insert that touches neighbors exactly at a point, and an insert that swallows everything."
