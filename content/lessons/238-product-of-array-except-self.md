# Product of Array Except Self — Full Interview Lesson

## 1. Problem Restatement

You're given an array `nums` of length `n`. Build an array `answer` of the same length where `answer[i]` equals the product of **every element except the one at index `i`**. Two hard rules:

- **No division.** The "obvious" trick of computing one total product and dividing by `nums[i]` is explicitly off the table.
- **O(n) time.** With `n` up to 10⁵, anything quadratic is dead on arrival.

**Clarifying questions worth asking out loud (takes ~20 seconds, buys credibility):**

1. "Can `nums` contain zeros or negatives?" → Yes (values range from −30 to 30). Zeros are the whole reason division is dangerous.
2. "Am I allowed to modify `nums`, or should I treat it as read-only?" → Assume a fresh output array; `nums` is typically treated as read-only.
3. "Does the output array count toward space?" → No (stated in the follow-up). This is the standard convention and it's what makes the O(1)-space solution possible.
4. "Is overflow a concern?" → The statement guarantees every prefix/suffix product fits in 32 bits, so intermediates in the intended solution are safe.

## 2. Constraint Decoding

| Constraint | What it actually tells you |
|---|---|
| `2 <= n <= 10^5` | Brute force is ~10¹⁰ multiplications → TLE. Also: `n = 2` is the smallest case (the answer is just the array reversed) — test it. |
| `-30 <= nums[i] <= 30` | **Zeros and negatives are in play.** A zero "annihilates" products; signs must come out right automatically. This kills the division approach and rewards one that needs no special-casing. |
| "Any prefix or suffix product fits in a 32-bit integer" | This is a deliberate gift: it tells you the intended solution accumulates **prefix and suffix products**, and it guarantees fixed-width integers (Java `int`, C++ `int`) won't overflow on intermediates. Python doesn't care (arbitrary precision), but the guarantee tells you what the setter had in mind. |
| "Output array doesn't count as extra space" | Standard interview convention. You may use the output buffer as scratch space — that's the key to the follow-up. |
| Duplicates possible (e.g., `[2,2,3]`) | Exclusion is **by index, not by value**. Both 2's in `[2,2,3]` get answer 6. Nothing here dedupes; we multiply values positionally. |

One sentence on optimality, since it may come up: Ω(n) time is a hard floor here because on any zero-free input every output entry depends on every input element, so a correct algorithm must read all `n` values — our O(n) solution meets that floor.

## 3. Approach 1 — Brute Force (and why it dies)

For each index `i`, multiply all the others.

```python
def product_except_self_bruteforce(nums: list[int]) -> list[int]:
    n = len(nums)
    answer = []
    for i in range(n):
        prod = 1
        for j in range(n):
            if j != i:          # skip index i, not "skip value nums[i]"
                prod *= nums[j]
        answer.append(prod)
    return answer
```

**Worked trace on Example 1, `nums = [1,2,3,4]`:**

| `i` | skipped index | computation | result |
|---|---|---|---|
| 0 | 0 | 2 × 3 × 4 | 24 |
| 1 | 1 | 1 × 3 × 4 | 12 |
| 2 | 2 | 1 × 2 × 4 | 8 |
| 3 | 3 | 1 × 2 × 3 | 6 |

Output `[24, 12, 8, 6]` — correct. But it's **O(n²) time, O(1) extra space**, and at `n = 10⁵` that's on the order of 10¹⁰ multiplications, which is far beyond what a judge executes in the time limit. Say that number out loud in the interview; it justifies moving on.

## 4. Approach 2 — Division: Tempting, but Disallowed

Compute the total product `P`, then `answer[i] = P / nums[i]`. O(n) time, O(1) space — **but**:

| Zeros in `nums` | What the division approach does |
|---|---|
| 0 zeros | Works: `P / nums[i]` is exact, because `P = nums[i] * answer[i]` divides evenly. |
| Exactly 1 zero at index `z` | Division by zero. Patch: `answer[z]` = product of all non-zero elements, every other entry is 0. |
| ≥ 2 zeros | Every `answer[i]` is 0. |

```python
def product_except_self_division(nums: list[int]) -> list[int]:
    n = len(nums)
    if nums.count(0) >= 2:
        return [0] * n
    p = 1
    for x in nums:
        if x != 0:
            p *= x
    if 0 in nums:
        return [p if x == 0 else 0 for x in nums]
    return [p // x for x in nums]   # exact when no zeros — but banned by this problem
```

**What to say if the interviewer asks "why not division?"** — "Even with the zero-case patch it's O(n)/O(1), but this problem bans division, and the patch is branchy edge-case code with three regimes. The prefix/suffix method handles zeros, negatives, and duplicates uniformly with no branching at all, so it's strictly more robust." That answer demonstrates you know the trick *and* why it's inferior here.

(Aside: Python's `//` floors toward negative infinity rather than truncating like C++/Java — irrelevant here because division is exact when no zeros exist, but worth knowing if you ever adapt this to a variant.)

## 5. The Core Insight

Reframe each output as a **left part × right part**:

```
answer[i] = L[i] * R[i]
L[i] = nums[0] * ... * nums[i-1]     (product of everything STRICTLY left of i; empty product = 1)
R[i] = nums[i+1] * ... * nums[n-1]   (product of everything STRICTLY right of i; empty product = 1)
```

This works because multiplication is associative with identity element 1, and — crucially — we never need to *invert* the operation (that's exactly what division would be). Every `L` is computable in one left-to-right sweep; every `R` in one right-to-left sweep.

For `nums = [1,2,3,4]`:

| `i` | `nums[i]` | `L[i]` (left product) | `R[i]` (right product) | `answer[i] = L[i] * R[i]` |
|---|---|---|---|---|
| 0 | 1 | 1 *(empty)* | 2·3·4 = 24 | **24** |
| 1 | 2 | 1 | 3·4 = 12 | **12** |
| 2 | 3 | 1·2 = 2 | 4 | **8** |
| 3 | 4 | 1·2·3 = 6 | 1 *(empty)* | **6** |

Note the **exclusive** boundaries: `L[i]` never includes `nums[i]`, `R[i]` never includes `nums[i]`. That exclusivity, plus the identity value 1 at the ends, is the entire game.

Zeros need **no special-casing** in this framing: a zero anywhere makes every `L` or `R` on the wrong side of it zero, which is exactly the right answer. Signs also fall out automatically — in Example 2, `answer[2] = L[2] * R[2] = (-1) * (-9) = 9`, positive, with zero branch logic.

## 6. Approach 3 — Two Auxiliary Arrays (O(n) time, O(n) space)

The direct translation of the insight — present this first in an interview, then optimize:

```python
def product_except_self_two_arrays(nums: list[int]) -> list[int]:
    n = len(nums)
    left = [1] * n    # left[i]  = nums[0] * ... * nums[i-1]
    right = [1] * n   # right[i] = nums[i+1] * ... * nums[n-1]

    for i in range(1, n):
        left[i] = left[i - 1] * nums[i - 1]
    for i in range(n - 2, -1, -1):
        right[i] = right[i + 1] * nums[i + 1]

    return [left[i] * right[i] for i in range(n)]
```

Clean, obviously correct, and it sets up the follow-up perfectly.

## 7. Approach 4 — Optimal: Reuse the Output Array (O(n) time, O(1) extra space)

**The follow-up answer:** write the left-products directly into `answer` (the output buffer is free real estate), then do a right-to-left sweep carrying only **one scalar** — the running suffix product.

```python
def product_except_self(nums: list[int]) -> list[int]:
    n = len(nums)
    answer = [1] * n

    # Pass 1 (left -> right): answer[i] = product of everything strictly LEFT of i
    left = 1
    for i in range(n):
        answer[i] = left
        left *= nums[i]

    # Pass 2 (right -> left): fold in the product of everything strictly RIGHT of i
    right = 1
    for i in range(n - 1, -1, -1):
        answer[i] *= right    # USE the running suffix BEFORE updating it
        right *= nums[i]

    return answer
```

Note the "running scalar" style: `answer[i] = left; left *= nums[i]` computes-then-advances, which removes all `i-1` indexing and the boundary cases that come with it (see §10).

### Trace on Example 1: `nums = [1,2,3,4]`

**Pass 1** (`left` starts at 1):

| `i` | `answer[i] = left` | `left` after × `nums[i]` | `answer` state |
|---|---|---|---|
| 0 | 1 | 1·1 = 1 | `[1, 1, 1, 1]` |
| 1 | 1 | 1·2 = 2 | `[1, 1, 1, 1]` |
| 2 | 2 | 2·3 = 6 | `[1, 1, 2, 1]` |
| 3 | 6 | 6·4 = 24 | `[1, 1, 2, 6]` |

**Pass 2** (`right` starts at 1, going `i = 3 → 0`):

| `i` | `answer[i] *= right` | `right` after × `nums[i]` | `answer` state |
|---|---|---|---|
| 3 | 6·1 = 6 | 1·4 = 4 | `[1, 1, 2, 6]` |
| 2 | 2·4 = 8 | 4·3 = 12 | `[1, 1, 8, 6]` |
| 1 | 1·12 = 12 | 12·2 = 24 | `[1, 12, 8, 6]` |
| 0 | 1·24 = 24 | 24·1 = 24 | `[24, 12, 8, 6]` ✓ |

### Trace on Example 2: `nums = [-1,1,0,-3,3]`

**Pass 1:**

| `i` | `answer[i] = left` | `left` after | `answer` state |
|---|---|---|---|
| 0 | 1 | −1 | `[1, 1, 1, 1, 1]` |
| 1 | −1 | −1 | `[1, -1, 1, 1, 1]` |
| 2 | −1 | −1·0 = **0** | `[1, -1, -1, 1, 1]` |
| 3 | 0 | 0·(−3) = 0 | `[1, -1, -1, 0, 1]` |
| 4 | 0 | 0·3 = 0 | `[1, -1, -1, 0, 0]` |

Watch the zero annihilate the running product from index 2 onward — that's correct, since everything left of indices 3 and 4 includes that 0.

**Pass 2:**

| `i` | `answer[i] *= right` | `right` after | `answer` state |
|---|---|---|---|
| 4 | 0·1 = 0 | 1·3 = 3 | `[1, -1, -1, 0, 0]` |
| 3 | 0·3 = 0 | 3·(−3) = −9 | `[1, -1, -1, 0, 0]` |
| 2 | (−1)·(−9) = **9** | −9·0 = 0 | `[1, -1, 9, 0, 0]` |
| 1 | −1·0 = 0 | 0·1 = 0 | `[1, 0, 9, 0, 0]` |
| 0 | 1·0 = 0 | 0·(−1) = 0 | `[0, 0, 9, 0, 0]` ✓ |

Only `answer[2]` survives — exactly the index holding the zero — and the double negative resolves to +9 with no sign logic written anywhere.

## 8. Interview Narration Script (Full Talk Track)

> **Clarify:** "Zeros and negatives are possible given the range — got it. I'll produce a new array and I'll treat `nums` as read-only. And the output array doesn't count toward space, correct?"
>
> **Kill the naive ideas fast:** "Brute force is, for each index, multiply the other n−1 values — O(n²), which is ~10¹⁰ operations at this input size, too slow. The O(n) shortcut people reach for is total-product-divided-by-self, but it divides by zero when the array contains a zero, and this problem bans division anyway. Even the patched version — special-casing one zero, all-zeros — needs three branching regimes, so I'd rather not."
>
> **The insight:** "The reframe that works: `answer[i]` is the product of everything left of `i` times everything right of `i`. Multiplication is associative with identity 1, so I can build all left-products in one forward pass and all right-products in one backward pass. I'll sketch it on `[1,2,3,4]`: left-products are `[1,1,2,6]`, right-products are `[24,12,4,1]`, and elementwise products give `[24,12,8,6]`."
>
> **Implement:** "First version: two auxiliary arrays, O(n) space. Now for the follow-up — I can drop to O(1) extra by writing left-products straight into the output array, then sweeping right-to-left with a single running suffix scalar. One subtlety I want to call out: inside the backward pass I must multiply the scalar into `answer[i]` *before* folding `nums[i]` into the scalar — otherwise the element ends up inside its own product."
>
> **Verify:** "On `[1,2,3,4]` I get `[24,12,8,6]`. On `[-1,1,0,-3,3]`: the zero poisons every left-product from index 2 on and every right-product from index 1 on, so only index 2 survives, and it's (−1)·(−9) = 9 → `[0,0,9,0,0]`. I'd also check `n = 2`, which just swaps the two elements. Time O(n), extra space O(1) — the output buffer doesn't count, and the only additional state is one integer."

## 9. Complexity Summary

| Approach | Time | Extra space | Division-free | Handles zeros cleanly | Verdict |
|---|---|---|---|---|---|
| Brute force | O(n²) | O(1) | ✅ | ✅ | TLE at n = 10⁵ |
| Total product ÷ self (+ zero patch) | O(n) | O(1) | ❌ | Needs 3-case branching | Banned / brittle |
| Two auxiliary arrays | O(n) | O(n) | ✅ | ✅ | Great first answer |
| **Prefix into output + suffix scalar** | **O(n)** | **O(1)** | ✅ | ✅ | **Optimal** |

Time is O(n) from two linear passes; extra space is O(1) because the output array is excluded by the problem's own convention and the only additional storage is one integer. This matches the Ω(n) reading floor, so it's asymptotically optimal.

## 10. Common Mistakes

| # | Mistake | Why it bites | Fix |
|---|---|---|---|
| 1 | Updating the suffix **before** using it | `right *= nums[i]` first folds `nums[i]` into its own answer — self-inclusion bug, wrong on every index | Order is sacred: `answer[i] *= right` **then** `right *= nums[i]` |
| 2 | Mixing inclusive/exclusive prefix conventions | If `left[i]` includes `nums[i]`, boundaries shift and you need `left[i-1] * right[i+1]` with guard clauses at the ends | Pick the exclusive convention (`L[i]` excludes index `i`, empty product = 1) and never deviate |
| 3 | `answer[i-1]` in a loop starting at `i = 0` in **Python** | `answer[-1]` silently reads the *last* element — no exception, just wrong output | Prefer the running-scalar style (`answer[i] = left; left *= nums[i]`), which has no `i-1` indexing at all |
| 4 | Skipping the identity boundary | Forgetting `L[0] = R[n-1] = 1` produces answers multiplied by a missing factor | Initialize running products to 1, not 0 |
| 5 | Reaching for division | Breaks on zeros; banned here; even patched it's branchy | Say out loud why you rejected it (§4) |
| 6 | Excluding by **value** instead of index | With duplicates like `[2,2,3]`, excluding "the value 2" once instead of one *position* is wrong | The skip is positional: `j != i` |
| 7 | Testing only all-positive arrays | Zeros and sign parity are where bugs live | Force yourself to run the §12 tests |
| 8 | Asserting "no overflow" without citing the guarantee | In fixed-width languages the safety comes from the statement's prefix/suffix guarantee, not from luck | Cite it; if an interviewer lifts the guarantee, escalate to 64-bit and discuss |

## 11. Language-Specific Gotchas

| Language | Gotcha |
|---|---|
| **Python** | `answer[i-1]` with `i = 0` wraps to the last element via negative indexing — a silent wrong-answer bug, not a crash. Also, Python ints never overflow, so overflow bugs are invisible in Python and would only surface in Java/C++ ports. |
| **Java** | `new int[n]` is zero-filled — multiplying into 0 wipes your left pass. Initialize with `Arrays.fill(answer, 1)` or use the running-scalar loop shape. `int` is safe *only because* the statement guarantees every prefix/suffix product fits in 32 bits; if a follow-up removes that guarantee, switch to `long` and be ready to discuss what "fits in 32 bits" would then even mean for the output. |
| **C++** | Signed integer overflow is **undefined behavior** (no Java-style wraparound) — never rely on it. Use `std::vector<int> answer(n, 1)`. If you widen intermediates to `long long`, force promotion with `1LL * a * b`, because `int * int` overflows before the assignment ever sees a wider type. |

## 12. Test Plan — Propose These Out Loud

State 2–3 of these before coding ("let me pin down cases: minimum size, a single zero, two zeros, mixed signs") and re-run them after. Quick self-check you can also narrate: **one zero in the input ⇒ exactly one non-zero answer; two or more zeros ⇒ all zeros.**

| Test | Input | Expected | What it validates |
|---|---|---|---|
| Example 1 | `[1,2,3,4]` | `[24,12,8,6]` | Baseline positives |
| Example 2 | `[-1,1,0,-3,3]` | `[0,0,9,0,0]` | Single zero + sign parity (only the zero's index is non-zero, and it's positive) |
| Minimum size | `[3,5]` | `[5,3]` | `n = 2`, both loop boundaries (answer is the input reversed) |
| Single zero | `[1,0,3]` | `[0,3,0]` | Zero annihilation, non-zero lands at the zero's index |
| Two zeros | `[0,4,0]` | `[0,0,0]` | ≥2 zeros ⇒ all-zero output |
| Mixed signs | `[-2,3,-4]` | `[-12,8,-6]` | Negative counts flip signs per-index |
| Duplicate values | `[2,2,3]` | `[6,6,4]` | Exclusion is by **index**, not value |
| Identity | `[1,1,1,1]` | `[1,1,1,1]` | Multiplicative identity sanity |

```python
assert product_except_self([1,2,3,4])       == [24,12,8,6]
assert product_except_self([-1,1,0,-3,3])   == [0,0,9,0,0]
assert product_except_self([3,5])           == [5,3]
assert product_except_self([1,0,3])         == [0,3,0]
assert product_except_self([0,4,0])         == [0,0,0]
assert product_except_self([2,2,3])         == [6,6,4]
assert product_except_self([-2,3,-4])       == [-12,8,-6]
```

## 13. Transferable Patterns & Related Problems

The meta-pattern: for any **associative operation with an identity element**, "aggregate of everything except index `i`" = *(aggregate of a prefix)* ⊗ *(aggregate of a suffix)*, computed in two sweeps. Multiplication with identity 1 is one instance; sum with identity 0 and max with identity −∞ are others.

| Problem | Same skeleton |
|---|---|
| LC 724 — Find Pivot Index | Prefix/suffix **sums** with exclusive boundaries; `left == right` at the pivot |
| LC 2574 — Left and Right Sum Differences | Elementwise `|prefix − suffix|`, same two-pass shape |
| LC 42 — Trapping Rain Water | Prefix/suffix **maxima**, two sweeps, `min(L[i], R[i])` |
| LC 152 — Maximum Product Subarray | Running products where zeros reset and negatives flip — the annihilator/sign intuition transfers directly |
| LC 1352 — Product of the Last K Numbers | Prefix products with explicit zero handling (the "zero poisons everything" idea, made first-class) |
| LC 560 — Subarray Sum Equals K | Prefix aggregates + hashmap; different twist, same "prefix decomposition" muscle |

Also transferable: the **"output buffer as free scratch space"** trick (two passes, one scalar) shows up whenever a problem's answer array is the same shape as its input — mention it proactively; interviewers love hearing you reach the O(1)-space version without being prompted.

## 14. Say It in 60 Seconds

> "Brute force re-multiplies n−1 numbers per index — O(n²), ten-billion-scale at this input size, so it times out. Division is O(n) but breaks on zeros and it's banned here. The reframe that unlocks it: the answer at index i is just the product of everything to the left of i times everything to the right of i. Multiplication is associative with identity 1, so I sweep once left-to-right writing each running left-product into the output array, then sweep right-to-left with a single running suffix scalar — multiplying it into each slot *before* I update it with the current value, because updating first would fold the element into its own answer. That's two linear passes: O(n) time, O(1) extra space since the output doesn't count. Zeros and negatives need zero special-casing — annihilation and sign parity fall out of the multiplication for free. Then I'd sanity-check: exactly one zero in the input means exactly one non-zero output, at the zero's index; two or more zeros means all zeros; and n = 2 just swaps the pair."

---

**One-line takeaway:** *Answer[i] = left-prefix product × right-suffix product; build one direction into the output buffer, sweep back with a single running scalar — no division, no branching, O(n)/O(1).*
