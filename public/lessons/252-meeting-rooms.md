# Meeting Rooms (LeetCode 252) — Complete Interview Lesson

## 1. Problem Restatement

> You are given a list of meeting intervals, where `intervals[i] = [startᵢ, endᵢ]`. Return `true` if one person could attend **all** meetings, and `false` otherwise.

Attending all meetings means **no two meetings overlap in time**. If any pair of meetings overlaps, the person can't be in two places at once, so the answer is `false`.

**The one ambiguity you must clarify out loud:** can a person attend a meeting ending at time `t` and another starting at time `t`? The standard convention (and LeetCode's expected behavior) is **yes** — back-to-back meetings are fine. So:

- `[5, 10]` and `[10, 15]` → **no conflict** (share an endpoint).
- `[5, 10]` and `[9, 15]` → **conflict** (overlap on `[9, 10)`).

Given the constraint `0 <= startᵢ < endᵢ`, every interval has positive length — there are no zero-length or malformed intervals to worry about. Always say this convention aloud; it's a real interview signal.

---

## 2. Constraint Decoding

| Constraint | Meaning | Design implication |
|---|---|---|
| `0 <= intervals.length <= 10⁴` | Up to 10,000 meetings, **and possibly zero meetings** | An O(n²) brute force is ~10⁸ pair checks — borderline. An O(n log n) sort-based solution is comfortably fast. **Empty input must return `true`** (vacuously attendable). |
| `0 <= startᵢ < endᵢ <= 10⁶` | Times are non-negative integers, bounded by 10⁶ | Values fit in 32-bit ints easily — no overflow concern. The bounded range also *permits* a counting/bucket-style approach, though sorting is simpler and standard. |
| `intervals[i].length == 2` | Every interval is a well-formed `[start, end]` pair | No malformed inputs, but duplicates *are* possible: two identical meetings `[5,10], [5,10]` → `false`. Your solution must handle that naturally. |

Also note: the input is **not necessarily sorted** (Example 2 makes that explicit — `[7,10]` comes before `[2,4]`).

---

## 3. Brute Force: Check Every Pair

**Idea:** the person can attend everything iff no two meetings overlap. Compare every pair of intervals; report `false` on the first overlap found.

**Overlap test for two intervals `a` and `b`:** they overlap iff each starts before the other ends.

```python
def canAttendMeetings(intervals: list[list[int]]) -> bool:
    n = len(intervals)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = intervals[i], intervals[j]
            if a[0] < b[1] and b[0] < a[1]:   # strict: touching endpoints OK
                return False
    return True
```

**Worked trace on Example 1:** `intervals = [[0,30],[5,10],[15,20]]`

| Pair (i, j) | a | b | `a[0] < b[1]`? | `b[0] < a[1]`? | Overlap? | Action |
|---|---|---|---|---|---|---|
| (0, 1) | `[0,30]` | `[5,10]` | `0 < 10` ✓ | `5 < 30` ✓ | **Yes** | return `False` |

Output: `False` ✓ (matches expected). We never even examine pair `(0,2)` or `(1,2)` because we short-circuit.

**Worked trace on Example 2:** `intervals = [[7,10],[2,4]]`

| Pair (i, j) | a | b | `a[0] < b[1]`? | `b[0] < a[1]`? | Overlap? |
|---|---|---|---|---|---|
| (0, 1) | `[7,10]` | `[2,4]` | `7 < 4` ✗ | — | No |

Loop ends → `True` ✓. Notice this also demonstrates the input is unsorted — the brute force doesn't care about order.

**Complexity:** O(n²) time, O(1) extra space. At n = 10⁴ that's up to ~5×10⁷ pair checks — it may squeak by in fast languages, but it's wasteful: it re-derives ordering information pair by pair that sorting gives us once.

---

## 4. The Core Insight

> **A full pairwise comparison is unnecessary. If the intervals are sorted by start time, any conflict must occur between two *adjacent* intervals.**

Why is this true? Sort by start time, giving intervals `I₁, I₂, …, Iₙ` with non-decreasing starts. Suppose some pair `Iᵢ, Iⱼ` (i < j) overlaps. `Iⱼ` starts at or after `Iᵢ₊₁` starts (sorted order), and `Iⱼ` starts before `Iᵢ` ends (that's the overlap). So `Iᵢ₊₁` starts before `Iᵢ` ends — meaning `Iᵢ` and its immediate neighbor `Iᵢ₊₁` also overlap. So if **any** conflict exists, a conflict exists between consecutive sorted intervals. Checking only adjacent pairs is sufficient — and checking sorted neighbors is obviously necessary, since sorted order never hides an overlap.

Once sorted, a single linear pass suffices: interval `i` conflicts with the previous interval iff

```
start[i] < end[i-1]
```

(using **strict** `<` because touching endpoints are allowed by convention).

There is a natural lower-bound argument for why sorting is a reasonable cost: any comparison-based method must effectively order the intervals, and since each comparison yields one bit of information and there are n! possible orderings, distinguishing them requires Ω(log₂(n!)) = Ω(n log n) comparisons — so O(n log n) is the expected, essentially optimal complexity for the comparison-based approach.

---

## 5. Optimal Approach: Sort by Start, Scan Adjacent Pairs

```python
def canAttendMeetings(intervals: list[list[int]]) -> bool:
    # Handle empty and single-meeting inputs: trivially attendable.
    intervals.sort(key=lambda iv: iv[0])        # sort by start time
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i - 1][1]:
            return False
    return True
```

(Note: `len(intervals) == 0` or `== 1` → the loop body never executes → returns `True`. Correct for both.)

### Trace — Example 1: `[[0,30],[5,10],[15,20]]`

**Step 1 — sort by start:**
`[[0,30],[5,10],[15,20]]` (already sorted)

**Step 2 — scan adjacent pairs:**

| i | intervals[i] | prev end | Compare | Result |
|---|---|---|---|---|
| 1 | `[5,10]` | 30 | `5 < 30`? ✓ | **return `False`** |

Output: `False` ✓. (Meeting `[5,10]` starts at 5 while `[0,30]` is still running — the person is double-booked from 5 to 10.)

### Trace — Example 2: `[[7,10],[2,4]]`

**Step 1 — sort by start:**
`[[7,10],[2,4]]` → sorted → `[[2,4],[7,10]]`

**Step 2 — scan:**

| i | intervals[i] | prev end | Compare | Result |
|---|---|---|---|---|
| 1 | `[7,10]` | 4 | `7 < 4`? ✗ | keep going |

Loop ends → `True` ✓. The person attends `[2,4]`, then `[7,10]`.

### Trace — an endpoint-touching case: `[[1,5],[5,10]]`

Sorted: `[[1,5],[5,10]]`. Check: `5 < 5`? ✗ (strict comparison) → `True`. Back-to-back meetings are attendable, matching our stated convention. **This is exactly where `<` vs `<=` decides correctness** — a very common bug source (see §7).

### Why sorting by start (not end)?

For this problem either works, but sorting by start is the most intuitive: "when does each meeting begin?" Sorting by end time also happens to work for a yes/no answer here, but start-ordering is the convention you'll reuse for Meeting Rooms II and the merge-intervals family, so build the habit now.

---

## 6. Complexity Table

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Brute force (all pairs) | O(n²) | O(1) | ~5×10⁷ checks at n = 10⁴; no sorting needed |
| **Sort + adjacent scan (recommended)** | **O(n log n)** | **O(1)** or O(n) | O(log n)–O(n) depending on the sort implementation (Python's Timsort uses up to O(n) auxiliary space; in-place schemes exist in theory). Sorting cost is justified by the comparison-model lower bound: ordering n distinct items requires Θ(log₂(n!)) = Θ(n log n) comparisons. |
| Counting/bucket sort variant | O(n + T) where T = 10⁶ | O(T) | Possible because times are bounded by 10⁶; sort keys in one linear bucket pass, then scan. Almost never worth the extra code in an interview — mention it only as a "range is small" observation. |

For n ≤ 10⁴, O(n log n) is roughly 10⁴ · 14 ≈ 1.4×10⁵ operations — trivially fast.

---

## 7. Common Mistakes & Interview Gotchas

| # | Mistake | Why it's wrong / how to avoid |
|---|---|---|
| 1 | **Using `<=` instead of `<`** in `start[i] < end[i-1]` | `<=` rejects valid back-to-back meetings like `[1,5],[5,10]`. Since we said sharing an endpoint is fine, the conflict condition must be **strict**. |
| 2 | **Forgetting the empty input** | The constraint `0 <= intervals.length` means `[]` is a valid input. Both the brute force and the sorted-scan return `True` for it naturally — but if you special-case or index `intervals[0]` carelessly, you can crash. Mention it out loud. |
| 3 | **Assuming the input is sorted** | Example 2 deliberately hands you `[[7,10],[2,4]]`. Sorting is mandatory. |
| 4 | **Checking `intervals[i]` vs `intervals[i+1]` only for "overlap" without defining it** | Overlap is `start[i+1] < end[i]` *after sorting by start* — not `start[i] < end[i+1] and start[i+1] < start[i]` and other confused forms. Write the one clean condition and stick to it. |
| 5 | **Comparing interval identity instead of content** (Python) | If you sort the list in place without a key, Python compares lists lexicographically — `[[1,10],[2,3]]` sorts by start first anyway, so it works here, but relying on default list comparison is fragile. Pass an explicit `key=lambda iv: iv[0]`. (Also, if you must sort without mutating the caller's input, use `sorted(intervals, ...)`.) |
| 6 | **Java: `Comparator.comparingInt` pitfalls / null safety** | Use `Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));`. Do **not** write `(a, b) -> a[0] - b[0]` as a habit — here starts are in `[0, 10⁶]` so the subtraction can't overflow, but the subtract-a-minus-b idiom is a classic bug when values can be large (e.g., negative coordinates). `Integer` autoboxing in a comparator like `Comparator.comparing(iv -> iv[0])` boxes every key; `comparingInt` avoids that. |
| 7 | **C++: modifying while expecting const, and `sort` with a lambda** | `sort(intervals.begin(), intervals.end())` on a `vector<vector<int>>` sorts lexicographically by `[start, end]`, which is fine here, but be explicit: `sort(v.begin(), v.end(), [](const auto& a, const auto& b){ return a[0] < b[0]; });`. No overflow risk with values ≤ 10⁶, but say "int is fine here" in the interview — it shows you checked. |
| 8 | **Returning `False` on duplicates misread as "OK"** | Two identical meetings `[5,10],[5,10]` overlap (each starts strictly before the other ends), so they must yield `false`. The sorted-scan handles this automatically (`5 < 10` ✓ → conflict); make sure your test suite includes it. |

---

## 8. Test Cases to Propose Out Loud

State these before or right after coding — it demonstrates engineering maturity:

| # | Input | Expected | What it validates |
|---|---|---|---|
| 1 | `[[0,30],[5,10],[15,20]]` | `false` | Official Example 1 — nested overlap. |
| 2 | `[[7,10],[2,4]]` | `true` | Official Example 2 — unsorted input, disjoint after sorting. |
| 3 | `[]` | `true` | Empty input; vacuously attendable; loop never runs. |
| 4 | `[[5,10]]` | `true` | Single meeting — nothing to conflict with. |
| 5 | `[[1,5],[5,10],[10,15]]` | `true` | Back-to-back endpoints; verifies strict `<`. |
| 6 | `[[5,10],[5,10]]` | `false` | Duplicate meetings fully overlap. |
| 7 | `[[15,20],[0,30],[5,10]]` | `false` | Same as Example 1 but scrambled — sorting must rescue it. |
| 8 | `[[1,100],[2,3],[4,5]]` | `false` | A long meeting swallowed by short ones — adjacent-only checking still catches it because the long interval's end is compared against every later start. |

Quick sanity re-derivation for #8: sorted → `[1,100],[2,3],[4,5]`. Check `2 < 100` → conflict → `false`. ✓

---

## 9. Transferable Patterns & Related Problems

**Pattern: "Sort by start + linear scan of adjacent elements."** This is one of the highest-yield interval patterns in interviews. Once intervals are sorted by start, nearly every interval question reduces to a single pass tracking one or two values (previous end, current max, running count…).

**Where this problem sits in the family:**

| Problem | Relationship |
|---|---|
| **LC 56 — Merge Intervals** | Same sort-by-start skeleton; instead of returning false, merge overlapping runs. |
| **LC 57 — Insert Interval** | Same overlap logic; insert and merge around a new interval. |
| **LC 253 — Meeting Rooms II** | The natural follow-up an interviewer will ask: *how many rooms?* Here you stop at the first conflict; there you count **simultaneous** overlaps (min-heap of end times, or a sweep line with +1/−1 deltas at starts/ends). This problem is essentially the boolean version of it. |
| **LC 435 — Non-overlapping Intervals** | Same detection, but you *minimize removals* — note this one sorts by **end** time and uses a greedy "keep earliest-ending interval" rule. |
| **LC 1851 / other hard interval problems** | Long-run extensions of the same sorted-scan machinery. |

**Talking point:** "I recognize this as the boolean form of the meeting-rooms/sweep-line family — if you asked me to *count* rooms instead of checking feasibility, I'd switch to a min-heap of end times or an event sweep." That one sentence converts a solved easy into a launched follow-up on your terms.

---

## 10. Say It in 60 Seconds

> "The person can attend everything iff no two meetings overlap. Brute force checks all pairs — O(n²) — but that's wasteful. The key insight: if I sort intervals by start time, any conflict must show up between two *adjacent* intervals, because later intervals only start later, so the earliest start of an overlapping group gets caught by its immediate neighbor. So: sort by start, then one linear pass — if the current meeting starts strictly before the previous one ends, return false. Strict, because back-to-back meetings sharing an endpoint are allowed. That's O(n log n) time for the sort, O(1) extra space, and the log factor is essentially optimal since ordering n items needs n-log-n comparisons in a comparison model. Edge cases I handle: empty input returns true, a single meeting returns true, duplicates overlap and return false, and the input isn't sorted to begin with. Done — and if you want the follow-up, counting the minimum rooms, I'd switch to a min-heap of end times or a sweep line."
