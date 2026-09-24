# Two Sum — A Complete Lesson

This is one of the most famous interview problems because it teaches a fundamental pattern: **replacing expensive search with cheap lookup**. We'll build up from the naive solution to the optimal one, and understand *why* each step works.

---

## 1. Understanding the Problem

**Restated in plain English:** Find two *different positions* in the array whose values add up to `target`, and return those positions.

Key details to decode from the statement:

| Detail | What it means for us |
|---|---|
| Return **indices**, not values | We must track *where* numbers are, not just what they are |
| "May not use the same element twice" | We can't pair `nums[i]` with itself (e.g., `nums = [3]`, target 6 → not `[0,0]`) |
| "Exactly one solution exists" | We don't need to handle "no answer" — simplifies code |
| Negative numbers allowed | Our solution must work with values like `-5` (hint: hash maps don't care) |

Verify against Example 3: `nums = [3,3]`, `target = 6`. The two elements are at *different indices* (0 and 1) even though they have the same value — so `[0,1]` is valid. This is a deliberate edge case to trip us up later.

---

## 2. Approach 1 — Brute Force: Check Every Pair

**Idea:** Try every possible pair of indices and check if their sum equals the target.

```python
def twoSum(nums, target):
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):   # start at i+1, so we never reuse index i
            if nums[i] + nums[j] == target:
                return [i, j]
```

**Trace on Example 1:** `nums = [2,7,11,15]`, `target = 9`

| i | j | nums[i] + nums[j] | Match? |
|---|---|---|---|
| 0 | 1 | 2 + 7 = 9 | ✅ return `[0, 1]` |

**Complexity analysis:**

- The number of pairs is C(n, 2) = n(n−1)/2. For n = 10⁴ (the constraint limit), that's **~50 million comparisons**.
- **Time: O(n²)** — for each of n elements, we scan up to n others.
- **Space: O(1)** — no extra storage.

**Why we start `j` at `i + 1`:** this does two things at once — it avoids using the same element twice, and it avoids checking the same pair twice (pair `(0,1)` and `(1,0)` are the same). It's correct, but too slow. Let's find the bottleneck.

---

## 3. The Core Insight: Think in Complements

Here is the mental shift that unlocks the fast solution.

We're looking for `nums[i] + nums[j] = target`. Rearranged:

```
nums[j] = target - nums[i]
```

So instead of asking *"which pair sums to target?"*, ask for each element:

> **"Given this number `x`, what single value do I need to complete the pair?"**

That value is called the **complement**: `complement = target - x`.

Now the problem becomes: *for each element, does its complement exist elsewhere in the array?*

That's a **search problem** — and with brute force, each search is O(n). **Search is the bottleneck.** If we could answer *"have I seen this value before?"* in O(1), the whole problem becomes O(n).

---

## 4. Deep Dive: Why Hash Maps Give O(1) Lookup

A hash map (`dict` in Python, `HashMap` in Java, `unordered_map` in C++) stores key→value pairs and answers *"is this key present?"* in **average O(1)** time.

How it works under the hood:

1. When you insert a key, a **hash function** converts it into a number.
2. That number (modulo the table size) determines a **bucket** where the value is stored.
3. To look up a key, hash it again → jump directly to its bucket → check it.

You don't scan the table — you *compute* where the item lives. That's the difference between "searching a warehouse aisle by aisle" vs. "having the exact shelf location from a database."

**The trade:** we spend **O(n) extra memory** to buy **O(1) lookup time**. This space-for-time trade is one of the most important patterns in algorithm design.

For our problem, we store: **key = a number's value, value = its index**. (We need indices as the answer, so they ride along as the map's values.)

---

## 5. Approach 2 — One-Pass Hash Map (Optimal)

**Algorithm:**

1. Create an empty hash map `seen` (value → index).
2. Walk through the array once. For each element `x` at index `i`:
   - Compute `complement = target - x`.
   - **Check first:** if `complement` is already in `seen`, we've found our pair → return `[seen[complement], i]`.
   - **Then insert:** store `seen[x] = i`.
3. If we finish the loop, no solution exists (won't happen per the problem statement).

```python
def twoSum(nums, target):
    seen = {}                          # value -> index
    for i, x in enumerate(nums):
        complement = target - x
        if complement in seen:         # check BEFORE inserting
            return [seen[complement], i]
        seen[x] = i
```

### Trace of Example 1: `nums = [2,7,11,15]`, `target = 9`

| i | x | complement | Is complement in `seen`? | Action |
|---|---|---|---|---|
| 0 | 2 | 7 | No (`seen = {}`) | Insert → `seen = {2: 0}` |
| 1 | 7 | 2 | **Yes!** (`seen[2] = 0`) | Return `[0, 1]` ✅ |

### Trace of Example 2: `nums = [3,2,4]`, `target = 6`

| i | x | complement | In `seen`? | Action |
|---|---|---|---|---|
| 0 | 3 | 3 | No (empty) | Insert → `{3: 0}` |
| 1 | 2 | 4 | No | Insert → `{3: 0, 2: 1}` |
| 2 | 4 | 2 | Yes (`seen[2] = 1`) | Return `[1, 2]` ✅ |

Note how at `i = 0`, `x = 3` and `complement = 3` — but the map is empty, so we correctly do **not** return `[0, 0]`.

### Trace of Example 3: `nums = [3,3]`, `target = 6` (the tricky one)

| i | x | complement | In `seen`? | Action |
|---|---|---|---|---|
| 0 | 3 | 3 | No — 3 hasn't been inserted yet! | Insert → `{3: 0}` |
| 1 | 3 | 3 | Yes (`seen[3] = 0`) | Return `[0, 1]` ✅ |

### ⭐ Why "check before insert" is the key design decision

The one-pass structure has two beautiful properties:

1. **It can never pair an element with itself.** At index `i`, the map only contains elements from indices `0..i−1`. So any match found is guaranteed to be a *different* element. The self-pairing bug is impossible by construction.
2. **It handles duplicates correctly.** If the answer is `[3, 3]` → `[0, 1]`, the first `3` is already in the map when the second `3` arrives. Duplicates become a *feature*, not a problem.

**Complexity:**

- **Time: O(n)** — one pass, each iteration does O(1) average hash operations. For n = 10⁴: ~10⁴ operations vs ~5×10⁷ for brute force. This answers the follow-up: yes, better than O(n²).
- **Space: O(n)** — the map can hold up to n entries.

---

## 6. Approach 3 — Two-Pass Hash Map (a useful variant)

Build the entire map first, then search. It's instructive because it exposes a subtle bug:

```python
def twoSum(nums, target):
    seen = {value: i for i, value in enumerate(nums)}   # pass 1: build
    for i, x in enumerate(nums):                        # pass 2: search
        complement = target - x
        if complement in seen and seen[complement] != i:  # <-- critical check!
            return [i, seen[complement]]
```

**The bug trap:** with `nums = [3, 2, 4]`, `target = 6`, the complement of `3` is `3`, and `3` *is* in the full map — at index 0, which is the element we're currently standing on! Without the `seen[complement] != i` guard, we'd wrongly return `[0, 0]`.

The two-pass version needs this explicit check; the one-pass version gets safety for free. Same O(n)/O(n) complexity — the one-pass version is generally preferred because its invariants are cleaner.

---

## 7. Follow-up Variant: If the Array Were Sorted → Two Pointers

What if the input were sorted (as in LeetCode 167, *Two Sum II*)? Then a different elegant technique applies — **two pointers** — using O(1) extra space.

**Idea:** Put one pointer at the smallest value (`left`) and one at the largest (`right`).

- Sum too **small**? You need a bigger sum → the only way is to move `left` right (discard the smallest value).
- Sum too **big**? Move `right` left (discard the largest value).
- Sum equal? Done.

Why this is safe to discard: with a sorted array, moving `left` forward only *increases* possible sums, moving `right` backward only *decreases* them — so you never skip the unique answer.

```python
def twoSumSorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1      # need a larger sum
        else:
            right -= 1     # need a smaller sum
```

**Time: O(n), Space: O(1)** — no hash map needed.

⚠️ **Why not use this on the original problem?** Sorting `nums` destroys the original indices. You *could* sort `(value, original_index)` pairs, run two pointers, and map back — but that costs O(n log n) time and O(n) space, strictly worse than the hash map. Note the general rule: **two pointers needs order; a hash map doesn't.**

---

## 8. Complexity Summary

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (all pairs) | O(n²) | O(1) | Simple baseline; ~5×10⁷ ops at n = 10⁴ |
| Two-pass hash map | O(n) | O(n) | Requires `index != i` guard |
| **One-pass hash map** | **O(n)** | **O(n)** | Optimal; self-pairing impossible by construction |
| Two pointers (sorted input) | O(n) | O(1) | Only valid when sorted; otherwise O(n log n) with index tracking |

---

## 9. Common Mistakes to Avoid

1. **Returning values instead of indices** — the answer to Example 1 is `[0, 1]`, not `[2, 7]`.
2. **Insert-then-check in one pass** — inserting `seen[x] = i` *before* the lookup makes `[3,3], target=6` return `[0,0]` at `i=0`. Always check first.
3. **Forgetting `seen[complement] != i` in two-pass** — the complement may be the current element itself.
4. **Assuming the array is sorted** — Example 2 (`[3,2,4]`) isn't; two pointers would fail.
5. **Worrying about negatives** — hash maps and arithmetic handle `-109..109` fine. No special casing needed.

---

## 10. The Transferable Lessons (Why This Problem Matters)

This problem is really teaching a **pattern-recognition skill**:

- **Reframe sums as complement lookups.** "Find a pair summing to T" → "for each x, is T−x present?"
- **Identify the bottleneck, then attack it.** Brute force's cost was *searching*; hashing eliminated it.
- **Trade space for time.** O(n) memory bought us O(n²) → O(n).
- **Let data structure invariants do the work.** "The map only contains earlier elements" is a stronger, safer guarantee than an explicit index check.

### Where to go next (same pattern, escalating difficulty)

- **Two Sum II** — sorted input → two pointers.
- **Two Sum III** — design a data class supporting `add` / `find`.
- **Contains Duplicate** — purest form of "have I seen this before?"
- **3Sum** — fix one element, then two-sum the rest (two pointers shine here).
- **Subarray Sum Equals K** — the complement idea applied to prefix sums.

**Rule of thumb to internalize:** whenever a problem involves finding "something that pairs with / complements / completes" a current element, reach for a hash map first.