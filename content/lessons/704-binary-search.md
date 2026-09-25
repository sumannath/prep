# Binary Search — Complete Interview Lesson (LeetCode 704)

## 1. Problem restated (say it in your own words)

> "I'm given an array of **unique** integers sorted in **ascending** order, and a `target`. I must return the **index** of `target` if it's present, otherwise `-1`. The runtime must be **O(log n)** — that's a hard requirement, not a suggestion."

Three things worth clarifying out loud before coding:

- **Index vs. value:** we return a *position*, and we compare *values*. Blurring these two is the #1 silent bug in binary search code.
- **Uniqueness:** because all values are distinct, "the index of target" is unambiguous. If duplicates were allowed, we'd have to ask *"which occurrence?"* (first? last? any?) — see §8 and §10.
- **The O(log n) clause is the real signal.** Even though n ≤ 10⁴ makes a linear scan fast enough in practice, the constraint is testing whether you recognize and implement the logarithmic technique.

---

## 2. Reading the constraints like an interviewer

| Constraint | What it tells you |
|---|---|
| `1 <= nums.length <= 10^4` | No empty-array case *required* — but a good template handles it for free (`lo=0, hi=-1`, loop never runs). Also: binary search needs at most ⌈log₂(10⁴ + 1)⌉ = **14 iterations** here, vs. up to 10,000 for a linear scan. |
| `-10^4 < nums[i], target < 10^4` | Values fit in 32-bit ints with huge margin; no `long` needed anywhere in Python, and index arithmetic (`lo + hi ≤ ~2·10⁴`) can't overflow in Java/C++ *for this problem* — but the safe idiom is still worth building as a habit (see §7). |
| All integers unique | Strict monotonicity. The classic "return on equality" template is well-defined; no first/last-occurrence ambiguity. |
| Sorted ascending | The entire premise. Binary search on unsorted data is simply incorrect — if an interviewer later removes this guarantee, the whole approach changes (see §10). |
| "O(log n) runtime complexity" | Explicitly forbids the linear scan. It also future-proofs the technique: the same code works for n = 10¹⁸-style settings (e.g., searching an "infinite" array, LeetCode 702) where linear scanning is impossible. |

---

## 3. Brute force: linear scan (and why it's rejected)

```python
def search_linear(nums: list[int], target: int) -> int:
    for i, x in enumerate(nums):
        if x == target:
            return i
        if x > target:      # optional early exit: sorted, so nothing later can match
            break
    return -1
```

**Complexity:** O(n) time, O(1) space. The early exit helps when `target` falls in a gap, but the worst case is still a full scan: `target` absent and larger than every element, or present at the last index. O(n) fails the stated requirement, so this is a baseline to mention in one sentence — *"brute force is a linear scan; I can do better because the array is sorted"* — and move on.

### 3.1 Worked trace of the brute force (Example 2: `nums = [-1,0,3,5,9,12]`, `target = 2`)

| i | nums[i] | Check | Action |
|---|---|---|---|
| 0 | -1 | -1 < 2 | keep scanning |
| 1 | 0 | 0 < 2 | keep scanning |
| 2 | 3 | 3 > 2 | early exit → return **-1** |

Note it took 3 comparisons — the same as binary search will take here — but on a 10⁴-element array where `target` is the last element, it takes 10,000 comparisons while binary search takes 14.

---

## 4. The core insight

**Sortedness lets a single comparison classify an entire half of the array.**

If you compare `target` against `nums[mid]`:

- `nums[mid] == target` → done, `mid` is the answer.
- `nums[mid] < target` → since the array is ascending, **every** element at index ≤ mid is ≤ `nums[mid]` < target. The target, if it exists, lives strictly to the right: indices `mid+1 … hi`.
- `nums[mid] > target` → symmetric: everything at index ≥ mid is too big, so the target lives strictly to the left: indices `lo … mid-1`.

So the algorithm maintains a window `[lo, hi]` with this **invariant**:

> *If `target` exists in `nums`, its index lies inside `[lo, hi]`.*

Every iteration either returns or provably discards `mid` plus one half of the window — the window at least **halves** each step. Starting from size n, that's at most ⌈log₂(n + 1)⌉ iterations.

**Why you can't do better (worth one sentence if asked "is O(log n) optimal?"):** each probe of `nums[mid]` has at most three outcomes (less/equal/greater), so any comparison-based algorithm's decision tree needs ≥ n + 1 leaves (n possible indices plus "absent") and hence height ≥ ⌈log₃(n + 1)⌉ = Ω(log n) — binary search matches this up to a constant factor.

---

## 5. Optimal algorithm: closed-interval binary search

### 5.1 Code

```python
def search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1          # inclusive window [lo, hi]
    while lo <= hi:                    # loop while the window is non-empty
        mid = lo + (hi - lo) // 2      # floor midpoint (overflow-safe idiom; see §7)
        if nums[mid] == target:
            return mid                 # exact hit — mid is the INDEX, nums[mid] the VALUE
        elif nums[mid] < target:
            lo = mid + 1               # discard mid and everything left of it
        else:
            hi = mid - 1               # discard mid and everything right of it
    return -1                          # window empty -> target absent
```

### 5.2 Why each line is the way it is

- **`lo <= hi` with inclusive `[lo, hi]`:** a one-element window (`lo == hi`) still has one candidate left to check, so the loop must run. When `lo` passes `hi`, the window is provably empty.
- **`mid = lo + (hi - lo) // 2`:** mathematically identical to `(lo + hi) // 2`, but the subtraction form never overflows in fixed-width languages. In Python either is fine (arbitrary-precision ints); write the portable form as muscle memory.
- **`mid + 1` / `mid - 1` (not `mid`):** `mid` is always inside `[lo, hi]` and has already been ruled out by the branch taken, so excluding it guarantees the window **strictly shrinks every iteration** — this is the formal termination argument. Updates like `lo = mid` are the classic infinite-loop bug (see §8).
- **`return -1` after the loop**, not `return lo` or `return mid`: after exit, `lo > hi` and neither index means anything.

### 5.3 What to say while coding (full talk track)

> "The array is sorted ascending with unique values and we need O(log n) — that's binary search. My plan: keep a **closed window** `lo..hi` with the invariant that if the target exists, its index is inside the window. Each step I compare the middle element to the target: equal → return mid; middle too small → everything at or left of mid is too small by sortedness, so I move `lo` to `mid + 1`; middle too big → symmetric, `hi = mid - 1`. Since `mid` is always inside the window and always excluded, the window strictly shrinks — at least halves — so it terminates in O(log n) iterations, O(1) space. If the window empties, the target isn't there and I return -1. Edge cases I'll make sure of: single-element array, target below the minimum or above the maximum, target in a gap between two elements, and target at either end of the array."

### 5.4 Traces on the official examples

**Example 1:** `nums = [-1,0,3,5,9,12]`, `target = 9` → expect `4`

| Iter | lo | hi | mid = lo+(hi-lo)//2 | nums[mid] | Comparison | Action |
|---|---|---|---|---|---|---|
| 1 | 0 | 5 | 2 | 3 | 3 < 9 | lo = 3 |
| 2 | 3 | 5 | 4 | 9 | 9 == 9 | **return 4** ✓ |

**Example 2:** `nums = [-1,0,3,5,9,12]`, `target = 2` → expect `-1` (target sits in the *gap* between 0 and 3)

| Iter | lo | hi | mid | nums[mid] | Comparison | Action |
|---|---|---|---|---|---|---|
| 1 | 0 | 5 | 2 | 3 | 3 > 2 | hi = 1 |
| 2 | 0 | 1 | 0 | -1 | -1 < 2 | lo = 1 |
| 3 | 1 | 1 | 1 | 0 | 0 < 2 | lo = 2 |
| — | 2 | 1 | — | — | lo > hi → exit | **return -1** ✓ |

Note that Example 2 (a miss) took **3 iterations — exactly the worst-case bound ⌈log₂(6+1)⌉ = 3** for n = 6. "Absent" targets exercise the full depth; that's why they're mandatory test cases.

### 5.5 The half-open variant — and why you must never mix templates

An equally valid template uses a half-open window `[lo, hi)`:

```python
def search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums)              # window is [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid                   # mid stays IN the window (might be the answer)
    return lo if lo < len(nums) and nums[lo] == target else -1
```

This is exactly `bisect_left`: on ties it keeps searching **left**, so it returns the *first* occurrence when duplicates exist, and `lo` ends at the insertion point. It generalizes better — but it has different initialization, loop condition, and update rules. **Pick one template per interview and stick to it**; the mixed template (`hi = len(nums)` with `while lo <= hi`) reads `nums[len(nums)]` and crashes. In real code, `bisect.bisect_left` does this for you:

```python
from bisect import bisect_left
def search(nums: list[int], target: int) -> int:
    i = bisect_left(nums, target)
    return i if i < len(nums) and nums[i] == target else -1
```

Fine to mention as a footnote — in the interview, hand-roll it.

---

## 6. Complexity

| Approach | Time | Space | Meets requirement? |
|---|---|---|---|
| Linear scan | O(n) | O(1) | ❌ |
| Linear scan + early exit | O(n) worst case | O(1) | ❌ |
| **Binary search, iterative** | **O(log n)** — ≤ ⌈log₂(n+1)⌉ iterations (14 for n = 10⁴) | **O(1)** | ✅ |
| Binary search, recursive | O(log n) | O(log n) call stack | ✅ (but see note) |

Derivation: the window's size at least halves each iteration (we discard `mid` plus one half), and a size-s window becomes at most ⌈(s−1)/2⌉ ≤ s/2, giving the ⌈log₂(n+1)⌉ bound. The recursive version is fine logically — ~14 stack frames for n = 10⁴ — but Python has no tail-call optimization, so iterative is the default answer; mention recursion only if the interviewer asks.

---

## 7. Language gotchas (Java / C++ / Python)

| Language | Gotcha | Detail |
|---|---|---|
| **Java** | `(lo + hi) / 2` overflow | Not triggerable here (n ≤ 10⁴ ⇒ `lo + hi ≤ ~2·10⁴`), but the bug is infamous: it shipped in `java.util.Arrays.binarySearch` for ~9 years (Joshua Bloch, 2006). Write `int mid = lo + (hi - lo) / 2;` (or `(lo + hi) >>> 1`) as reflex. |
| **Java** | Library & boxing | `Arrays.binarySearch(int[] a, key)` exists, but hand-roll it in interviews. Note its miss-return convention is `-(insertionPoint) - 1`, **not** `-1`. With `Integer[]`/`List<Integer>`, you're paying autoboxing per comparison, and hand-written `==` between boxed `Integer`s is reference equality (only safe in the −128…127 cache) — use `.equals()`/`compareTo`. |
| **C++** | `size_t` underflow | If `hi` is `size_t`, the branch `hi = mid - 1` with `mid == 0` wraps to `SIZE_MAX`; then `lo <= hi` is always true and `nums[mid]` is an out-of-bounds read (triggers even on `nums = [5], target = 2`). Use plain `int` for `lo`/`hi`, and note `nums.size()` returns an unsigned type — `int hi = (int)nums.size() - 1;` with n ≥ 1 is safe. Same fix: `int mid = lo + (hi - lo) / 2;` |
| **Python** | None serious | `(lo + hi) // 2` can't overflow (arbitrary-precision ints), and recursion depth (~14) is trivial — but prefer the iterative form and the portable `lo + (hi - lo) // 2` idiom so the habit transfers to Java/C++ questions. |

---

## 8. Common mistakes (each one is a real interview failure mode)

1. **Indices vs. values confusion.** Writing `if mid == target` instead of `if nums[mid] == target`. It can *pass* small tests by coincidence — e.g., `nums = [10, 20], target = 0` returns index 0 because `mid == 0 == target` even though `nums[0] = 10`. Always say out loud which is which: `mid` is an index, `nums[mid]` is a value, the function returns an **index**.
2. **Mixing templates.** `hi = len(nums)` with `while lo <= hi` → `nums[len(nums)]` → IndexError (e.g., `nums = [5], target = 9` reads `nums[1]`). Or `hi = len(nums) - 1` with `while lo < hi` → skips the last candidate: `nums = [5], target = 5` never enters the loop and wrongly returns -1.
3. **Infinite loops from lazy updates.** In a `while lo < hi` loop with `mid = (lo + hi) // 2` (floor) and `lo = mid`: when `hi = lo + 1`, `mid = lo`, so `lo = mid` changes nothing — the loop spins forever. Fix: either exclude `mid` (`lo = mid + 1` / `hi = mid`), or use the upper midpoint `(lo + hi + 1) // 2` when keeping `mid` on the left side.
4. **Forgetting `mid` itself is ruled out.** `lo = mid` / `hi = mid` in the closed template stalls on two-element windows. The branch you took proved `nums[mid] ≠ target`; exclude it.
5. **Returning the wrong thing after the loop.** `return lo` (that's `search_insert_position` behavior) instead of `return -1`.
6. **Ignoring the sorted precondition.** Binary search on unsorted input returns garbage. Follow-up: *"what if it's not sorted?"* → sorting costs O(n log n), which beats O(n) linear scan only if you'll answer **many** queries; for a single query, a linear scan is cheaper.
7. **Assuming the template handles duplicates.** With duplicates, "return on equality" gives *some* matching index, not the first/last. Here uniqueness makes it moot — but say so out loud, then name the boundary-search fix (§10).

---

## 9. Test cases to propose out loud (before or right after coding)

State these before the interviewer asks — it signals systematic thinking.

| # | Input | Expected | What it stress-tests |
|---|---|---|---|
| 1 | `nums = [-1,0,3,5,9,12], target = 9` | `4` | Official Ex. 1 — hit on the right half. |
| 2 | `nums = [-1,0,3,5,9,12], target = 2` | `-1` | Official Ex. 2 — **gap miss**, full 3-iteration path, exit via `lo > hi`. |
| 3 | `nums = [5], target = 5` | `0` | Single element, hit — catches `while lo < hi` bugs. |
| 4 | `nums = [5], target = 2` | `-1` | Single element, miss — catches `size_t` underflow (C++) and `hi = mid` staleness. |
| 5 | `nums = [2,5], target = 9` and `target = 1` | `-1`, `-1` | Target above max / below min — both boundary exits (`lo` runs off the right; `hi` to −1). |
| 6 | `nums = [-1,0,3,5,9,12], target = -1` and `target = 12` | `0`, `5` | Hit at index 0 and at the last index — off-by-one magnets. |
| 7 | `n = 10^4`, `nums = list(range(-5000, 5000))`, targets `-5000`, `4999`, `12345` | `0`, `9999`, `-1` | Constraint-scale smoke test; verifies ~14 iterations, no drift. |

(Optional bonus to *mention*: an empty array isn't allowed by the constraints, but the closed-interval template handles it gracefully — `lo = 0 > hi = -1`, loop never runs, returns `-1` — worth one sentence.)

---

## 10. Transferable patterns & related problems

The meta-skill this problem teaches: **define a search space and a monotonic predicate, then halve the space every step.** "Sorted array" is just the simplest monotonic structure. Everything below is the same skeleton with a different space or predicate:

| Pattern | Idea | Classic problems |
|---|---|---|
| **Plain index search** (this lesson) | Window over sorted indices; equality returns. | LC 704; LC 35 Search Insert Position (return `lo` on miss — one-line change). |
| **Boundary search** (duplicates) | Don't stop on equality; keep shrinking toward the left/right boundary; `bisect_left`/`bisect_right` flavor. | LC 34 First & Last Position of Element in Sorted Array. |
| **Locally sorted / rotated space** | Exactly one half of the window is sorted; decide which by comparing endpoints, recurse into the sorted half. | LC 33 Search in Rotated Sorted Array; LC 153 Find Minimum in Rotated Array; LC 81 (with duplicates — the `nums[mid] == nums[hi]` case degrades to O(n) worst case). |
| **Predicate on a "virtual" space** | The answer is the first value where a boolean predicate flips from False to True; binary-search the *value*, not an array. | LC 875 Koko Eating Bananas; LC 1011 Capacity to Ship Packages; LC 410 Split Array Largest Sum; LC 878 Nth Magical Number. |
| **Unimodal / peak** | Compare `mid` to a neighbor to know which way is "uphill"; half the space is downhill. | LC 162 Find Peak Element; LC 852 Peak Index in a Mountain Array. |
| **Flattened 2D** | A matrix sorted row- and column-wise can be viewed as one sorted 1D array: index `i` ↦ `(i // cols, i % cols)`. | LC 74 Search a 2D Matrix. (LC 240 is different: sorted rows *and* columns but not a concatenation — uses the staircase elimination from the top-right corner, O(m + n).) |
| **Unknown/huge size** | Exponentially grow a right bound (`hi = 1, 2, 4, …`) to bracket the answer, then binary search — this is where the `(lo+hi)/2` overflow bug actually bites. | LC 702 Search in a Sorted Array of Unknown Size. |

**Likely follow-up questions and one-line answers:**

- *"Recursion or iteration?"* → Iterative: O(1) space; recursion is O(log n) stack and Python doesn't eliminate tail calls.
- *"Duplicates?"* → Boundary variant (`bisect_left` / `bisect_right`) to get first/last occurrence in O(log n).
- *"Not sorted?"* → One query: linear scan O(n) beats sort-then-search O(n log n). Many queries: sort once, binary search each.
- *"Why is O(log n) optimal?"* → Each comparison has ≤ 3 outcomes, so distinguishing n + 1 outcomes needs ≥ ⌈log₃(n+1)⌉ probes — Ω(log n) in the comparison model.

---

## 11. Say it in 60 seconds

> "Sorted array, need log time — that's binary search. I keep a closed window `lo..hi` with one invariant: if the target exists, it's inside this window. Each step I check the middle. Equal? Return that index. Middle too small? Sorted order means the target can only be to the right, so `lo` becomes `mid + 1`. Middle too big? Symmetric — `hi` becomes `mid − 1`. Every iteration discards `mid` plus half the window, so it's O(log n) time and O(1) space, and it can't loop forever because `mid` is always inside the window and always gets excluded. When `lo` passes `hi`, the window is empty — the target isn't there, return −1. Edge cases I checked: single element, target below the min or above the max, target in a gap between two values, and hits at index zero and the last index. And I compute `mid` as `lo + (hi − lo) / 2` — the overflow-safe form if this were Java or C++."
