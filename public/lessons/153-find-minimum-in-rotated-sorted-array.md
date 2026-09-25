# Find Minimum in Rotated Sorted Array — Complete Lesson

## 1. Problem Restatement

You're given an array that was originally sorted ascending, then rotated `k` times (1 ≤ k ≤ n, where rotating n times gives back the original array). All elements are **unique**. Find the minimum element in **O(log n)** time.

Key reframe: the minimum is the **rotation point (pivot)** — the only place where the array "breaks" its sorted order. Everything before the minimum is greater than everything after it (in a non-trivial rotation).

## 2. Decoding the Constraints

| Constraint | Implication |
|---|---|
| Unique elements | Binary search comparisons are unambiguous — `nums[mid]` vs `nums[right]` cleanly tells you which half the minimum is in. (Duplicates are the follow-up LC 154, where worst case degrades to O(n).) |
| Rotated 1..n times | Includes the **not-actually-rotated** case (`[11,13,15,17]`) — a fully sorted array is a valid input. |
| n up to 5000, values in [-5000, 5000] | Brute force O(n) passes comfortably; O(log n) is required only by the problem statement. No overflow concerns with these magnitudes. |
| O(log n) requirement | Signals binary search. A linear scan is a "read the room" fail in an interview. |

## 3. Brute Force (and a Worked Trace)

The naive approach: scan left to right and track the minimum, or — slightly smarter — find the index `i` where `nums[i] < nums[i-1]`; the answer is `nums[i]` (or `nums[0]` if no such index exists).

**Trace on `[4,5,6,7,0,1,2]`:**

| i | nums[i] | nums[i] < nums[i-1]? |
|---|---|---|
| 1 | 5 | no |
| 2 | 6 | no |
| 3 | 7 | no |
| 4 | 0 | **yes → answer is 0** |

Time **O(n)**, space **O(1)**. Fine as a stepping stone; say out loud in the interview: *"A linear scan finds the first descent in O(n); I can do better with binary search because one half is always sorted."*

## 4. The Core Insight

In a rotated sorted array, pick any index `mid`. Compare `nums[mid]` to `nums[right]` (the rightmost element of the current search window):

- **`nums[mid] > nums[right]`** → the break (minimum) must be **strictly to the right of mid**. The segment `[mid, right]` contains the descent.
- **`nums[mid] < nums[right]`** → the segment `[mid, right]` is sorted, so the minimum is **at mid or to its left**.

Why compare with `right` and not `left`? Because the array may not be rotated at all. If you compare with `nums[left]` and `nums[mid] > nums[left]`, you can't tell whether the minimum is in the left half (unrotated array) or the right half. Comparing against `nums[right]` gives an unambiguous answer in both cases.

## 5. Optimal Approach: Binary Search on the Pivot

```python
def findMin(nums: list[int]) -> int:
    left, right = 0, len(nums) - 1
    while left < right:                 # loop invariant: min is in [left, right]
        mid = (left + right) // 2
        if nums[mid] > nums[right]:
            left = mid + 1              # min is in (mid, right]
        else:
            right = mid                 # min is in [left, mid]
    return nums[left]
```

**Why this terminates and is correct:**
- The window `[left, right]` always contains the minimum (invariant maintained by both branches).
- `right = mid` still shrinks the window because `mid < right` always holds when `left < right` (`mid = (left+right)//2` rounds down).
- When `left == right`, that index holds the minimum.

### Trace: Example 2, `nums = [4,5,6,7,0,1,2]`

| left | right | mid | nums[mid] | nums[right] | Branch | Window |
|---|---|---|---|---|---|---|
| 0 | 6 | 3 | 7 | 2 | mid > right → go right | [4,6] |
| 4 | 6 | 5 | 1 | 2 | mid < right → go left | [4,5] |
| 4 | 5 | 4 | 0 | 2 | mid < right → go left | [4,4] |

`left == right == 4` → return `nums[4] = 0`. ✅

### Trace: Example 1, `nums = [3,4,5,1,2]`

| left | right | mid | nums[mid] | nums[right] | Branch | Window |
|---|---|---|---|---|---|---|
| 0 | 4 | 2 | 5 | 2 | go right | [3,4] |
| 3 | 4 | 3 | 1 | 2 | go left | [3,3] |

Return `nums[3] = 1`. ✅

### Trace: Example 3, `nums = [11,13,15,17]` (unrotated)

| left | right | mid | nums[mid] | nums[right] | Branch |
|---|---|---|---|---|---|
| 0 | 3 | 1 | 13 | 17 | go left |
| 0 | 1 | 0 | 11 | 13 | go left |

Return `nums[0] = 11`. ✅

## 6. Complexity

| Aspect | Cost | Why |
|---|---|---|
| Time | **O(log n)** | Search window halves each iteration. |
| Space | **O(1)** | Two pointers only. |

**Follow-up bound:** With duplicates (LC 154), the worst case is O(n), not O(log n): when `nums[mid] == nums[right]`, you can only safely discard one element (`right -= 1`), and an adversary argument shows any comparison-based algorithm can be forced to inspect Ω(n) positions in an array like `[1,1,1,...,1,0,1,...,1]`, where the single distinct value could be anywhere.

## 7. Common Mistakes

1. **Comparing `nums[mid]` with `nums[left]`** — fails on unrotated arrays (e.g., `[1,2,3]`: mid=1, nums[1]>nums[0], you'd wrongly move right and might land past the min). Compare against `nums[right]`.
2. **`right = mid - 1` when `nums[mid] <= nums[right]`** — this can discard the minimum itself, since `mid` might *be* the pivot. Use `right = mid`.
3. **Infinite loop / off-by-one** — using `while left <= right` with `right = mid` never exits. Use `while left < right` with the convergent updates above, or use `mid = (left + right + 1) // 2` if you keep `left = mid` instead.
4. **`mid = (left + right) / 2` in Java/C++** — fine here (n ≤ 5000, no overflow), but the idiomatic safe form is `left + (right - left) / 2`. In Java, note `(left + right) / 2` with large ints can overflow negative; in C++, prefer `left + (right - left) / 2` for the same reason.
5. **Assuming a rotated array can't equal the sorted array** — rotation by n (or 0 positions effectively) is valid; test it.

## 8. Test Cases to Propose Out Loud

| Test | Input | Expected | What it checks |
|---|---|---|---|
| Official 1 | `[3,4,5,1,2]` | 1 | Pivot in the middle |
| Official 2 | `[4,5,6,7,0,1,2]` | 0 | Standard rotation |
| Official 3 | `[11,13,15,17]` | 11 | No rotation at all |
| Edge: single element | `[1]` | 1 | Loop never runs; return directly |
| Edge: two elements | `[2,1]` | 1 | mid = 0, nums[0] > nums[1] → left=1 |
| Edge: pivot at end | `[2,3,4,5,1]` | 1 | min at last index |
| Edge: pivot at start | `[5,1,2,3,4]` | 1 | min at index 0; first branch sends window right of mid |

Also mention negative values and n=1 explicitly before coding — it shows systematic thinking.

## 9. Transferable Patterns & Related Problems

This is the archetype of **binary search on a "monotonic predicate"**: the predicate "`nums[i] < nums[right]` (locally sorted portion begins)" flips exactly once across the array, so you can binary-search for the flip point.

Related problems:
- **LC 33 — Search in Rotated Sorted Array I**: locate a target using the same "which half is sorted?" logic.
- **LC 81 — Search in Rotated Sorted Array II**: with duplicates; worst case O(n).
- **LC 154 — Find Minimum in Rotated Sorted Array II**: the duplicates variant; handle `nums[mid] == nums[right]` with `right -= 1`.
- **LC 162 — Find Peak Element**: another "binary search on a local structure" problem.
- **Pattern name to say:** *"binary search on a rotated/unimodal structure — discard the half that provably can't contain the answer."*

## 10. Say It in 60 Seconds

> "The minimum is the rotation pivot — the one index where sorted order breaks. Since the array is sorted except at that one point, any midpoint comparison against the rightmost element tells me which half contains the pivot: if `nums[mid]` is greater than `nums[right]`, the break is to the right of mid, so I move left to `mid + 1`; otherwise the right half is sorted, so the minimum is at mid or earlier, and I move right to `mid`. I loop while left is strictly less than right, so the window always shrinks and always contains the minimum; when they meet, that's the answer. Comparing against `nums[right]` rather than `nums[left]` is the key detail — it handles the fully unrotated case correctly. O(log n) time, O(1) space. With duplicates it degrades to O(n) worst case, since equal values force discarding one element at a time."
