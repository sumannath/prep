# Maximum Product Subarray — Complete Interview Lesson

**LeetCode 152 | Medium (frequently rated Medium-Hard in interviews) | Dynamic Programming / Greedy-style scan**

---

## 1. Restating the Problem (what the interviewer actually hears)

> Given an integer array `nums`, find a **contiguous** subarray whose elements multiply to the **maximum product**, and return that product. A subarray of length 1 is allowed — its product is just its single element.

Key phrases to lock in out loud before coding:

- **"Contiguous"** — this is a *subarray*, not a *subsequence*. Order and adjacency matter. This is exactly why Example 2's answer is `0` and not `2` (from `[-2,-1]`, which is not contiguous in `[-2, 0, -1]`).
- **"Largest product"** — not sum. Products behave very differently from sums because of **sign** and **magnitudes**: two wrongs (negatives) make a right, and `0` annihilates everything.
- **"Answer fits in 32-bit"** — you don't need big integers; this is a reassurance, not a trick.

A good restatement: *"I need the maximum product over all contiguous windows `[i..j]`, where a single element counts as a window."*

---

## 2. Constraint Decoding

| Constraint | What it tells you |
|---|---|
| `1 <= nums.length <= 2 * 10^4` | An O(n²) solution does ~4×10⁸ pairwise work with an inner product loop — too slow in practice (and products get expensive to recompute). We need **O(n)**. |
| `-10 <= nums[i] <= 10` | Values can be **negative, zero, or positive**. Zeros split the array into independent segments; negatives flip sign. This is the whole difficulty. |
| Answer fits in 32-bit | No overflow worries in the *final answer*, but **intermediate products can also be assumed safe here** per the guarantee — still, in Java/C++ you must be careful if you ever extend the problem (see gotchas in §7). |
| Single-element subarray allowed | If all elements are negative, the answer can be a *negative* number (e.g., `[-3]` → `-3`). Never initialize your answer to `0`. |

Edge cases the constraints imply:
- Single element array → return `nums[0]`.
- A single `0` anywhere → best answer is at least `0`, and the array effectively splits at each `0`.
- Even count of negatives in a stretch → whole stretch can be used; odd count → drop either the leftmost or rightmost negative (this intuition drives the optimal algorithm).

---

## 3. Brute Force (and why it fails)

**Idea:** enumerate every start index `i`, extend the end `j` to the right, maintaining a running product. Track the maximum.

```python
def maxProduct_bruteforce(nums: list[int]) -> int:
    best = nums[0]                      # not 0! single element counts
    for i in range(len(nums)):
        prod = 1
        for j in range(i, len(nums)):
            prod *= nums[j]
            best = max(best, prod)
    return best
```

**Complexity:** O(n²) time, O(1) space. For n = 2×10⁴ that's ~2×10⁸ multiplications — borderline/too slow, and it re-derives overlapping information (`prod` for window `[i..j]` shares most of its factors with `[i..j+1]`) without exploiting that globally.

### Worked trace on `nums = [2, 3, -2, 4]`

| `i` (start) | running `prod` after each `j` | best so far |
|---|---|---|
| `i=0` (2) | 2 → 6 → −12 → −48 | 6 |
| `i=1` (3) | 3 → −6 → −24 | 6 |
| `i=2` (−2) | −2 → −8 | 6 |
| `i=3` (4) | 4 | 6 |

Answer: **6** ✓

Trace on `nums = [-2, 0, -1]`: from `i=0`: −2, 0, 0 → best −2; from `i=1`: 0, 0 → best −2... wait, careful — best should be `max(−2, 0, −1)`. Since we initialize `best = nums[0] = −2` and take max with each `prod`, we see `0` at `(i=0, j=1)`, so best becomes `0`. From `i=2`: `−1`, no improvement. Answer: **0** ✓.

This brute force is *correct* — say that in the interview — but it won't pass at n = 2×10⁴ within typical limits, which motivates the linear scan.

---

## 4. The Core Insight

With **sums**, the classic Kadane's algorithm works because a negative running sum never helps the future — you drop it. With **products**, that's false:

- A large **negative** running product can become a huge **positive** product if the next element is negative. So you can't just discard negatives.
- A **zero** resets everything: any subarray crossing a zero has product zero.

**The insight:** at every index, the best subarray *ending here* is one of two things:

1. The maximum product ending at the previous index, times `nums[i]`, or
2. The **minimum** product ending at the previous index, times `nums[i]` (when `nums[i]` is negative, the minimum — most negative — flips into the maximum), or
3. `nums[i]` itself (restart the window — e.g., after a zero, or when extending only makes things worse).

So we track **two** running values instead of one: `cur_max` and `cur_min`. This is "Kadane's algorithm with a sign-flip twist" — a DP over "best ending here" where the state needs max *and* min because the recurrence couples them.

> **One-sentence insight for the interviewer:** "Because a negative multiplier swaps max and min, I must carry both the running maximum and running minimum product forward; a zero naturally collapses both to 0, which the `max(nums[i], ...)` restart handles."

---

## 5. Optimal Approach: One-pass with Max/Min Tracking

### Algorithm

At each index `i`, compute:

```
candidates = (cur_max * x, cur_min * x, x)
new_max = max(candidates)
new_min = min(candidates)
answer  = max(answer, new_max)
```

where `x = nums[i]`. Then overwrite `cur_max`, `cur_min`.

**Implementation gotcha (critical):** when computing the candidates, `cur_max * x` and `cur_min * x` must both be computed from the *old* values. In Python, capture them first (`prev_max, prev_min = cur_max, cur_min`) or compute candidates as a tuple in one expression. If you update `cur_max` first and then use it to compute `cur_min`, you've introduced a bug. (In Python the tuple assignment `cur_max, cur_min = max(...), min(prev_max*x, prev_min*x, x)` using saved prev values avoids this; in-place sequential updates are the classic off-by-one-step error here.)

### Code

```python
def maxProduct(nums: list[int]) -> int:
    cur_max = cur_min = best = nums[0]

    for x in nums[1:]:
        prev_max, prev_min = cur_max, cur_min   # save old values!
        cur_max = max(prev_max * x, prev_min * x, x)
        cur_min = min(prev_max * x, prev_min * x, x)
        best = max(best, cur_max)

    return best
```

Time **O(n)**, space **O(1)**.

### Trace on Example 1: `nums = [2, 3, -2, 4]`

| i | x | prev_max | prev_min | cur_max = max(...) | cur_min = min(...) | best |
|---|---|---|---|---|---|---|
| init | 2 | — | — | 2 | 2 | 2 |
| 1 | 3 | 2 | 2 | max(6, 6, 3) = **6** | min(6, 6, 3) = 3 | 6 |
| 2 | −2 | 6 | 3 | max(−12, −6, −2) = **−2** | min(−12, −6, −2) = **−12** | 6 |
| 3 | 4 | −2 | −12 | max(−8, **−48**, 4) = 4 | min(−8, −48, 4) = −48 | 6 |

Notice index 2–3: the **min** becomes −12, and multiplying by the next negative... actually here `x=4` is positive so the max comes from `x` alone (restart), and best stays 6. The point of carrying −12 is visible: had the last element been `−4`, we'd have gotten `−12 × −4 = 48`. The pair-tracking pays off the moment a second negative appears.

### Trace on Example 2: `nums = [-2, 0, -1]`

| i | x | prev_max | prev_min | cur_max | cur_min | best |
|---|---|---|---|---|---|---|
| init | −2 | — | — | −2 | −2 | −2 |
| 1 | 0 | −2 | −2 | max(0, 0, **0**) = 0 | min(0, 0, 0) = 0 | 0 |
| 2 | −1 | 0 | 0 | max(0, 0, **−1**) = −1 | min(0, 0, −1) = −1 | 0 |

The zero **resets** both trackers to 0; the restart candidate `x = −1` keeps the algorithm from dying (best remains 0, and `cur_max = −1` correctly represents the best window ending at index 2, which is just `[-1]`). Answer: **0** ✓

### Trace on a nasty case: `nums = [-2, 3, -4]` (expected: 24)

| i | x | prev_max | prev_min | cur_max | cur_min | best |
|---|---|---|---|---|---|---|
| init | −2 | — | — | −2 | −2 | −2 |
| 1 | 3 | −2 | −2 | max(−6, −6, 3) = 3 | min(−6, −6, 3) = −6 | 3 |
| 2 | −4 | 3 | −6 | max(−12, **24**, −4) = 24 | min(−12, 24, −4) = −12 | **24** |

The `prev_min = −6` flips to `+24` via the negative multiplier — this is exactly the case a sum-style Kadane fails on. **Say this example out loud in the interview**; it demonstrates you understand why two trackers are needed.

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (all `i`, extend `j`) | O(n²) | O(1) | Correct but ~2×10⁸ ops at n = 2×10⁴; too slow. |
| **Max/min one-pass (optimal)** | **O(n)** | **O(1)** | Single scan, two scalars of state. |
| Prefix/suffix sweep (variant) | O(n) × 2 passes | O(1) | See "alternative" below; also correct, arguably simpler to prove. |
| Naive "Kadane with one tracker" | O(n) | O(1) | **Wrong** — fails on `[-2, 3, -4]` (returns 3, not 24). |

There is no sub-O(n) algorithm here: any correct algorithm must read every element, since changing any single element (e.g., flipping one value's sign) can change the answer — an Ω(n) lower bound follows trivially from the need to inspect the entire input.

### Alternative worth mentioning (prefix/suffix sweep)

Scan left→right keeping a running product that **resets to 1 after each zero**, tracking the max; then do the same right→left. This works because in any zero-free segment, the best subarray is either a prefix or a suffix of that segment (removing elements from the wrong side can only shrink magnitude or flip sign unfavorably). Two O(n) passes, very easy to code:

```python
def maxProduct_sweep(nums: list[int]) -> int:
    best = float('-inf')
    prod = 1
    for x in nums:                       # left to right
        prod *= x
        best = max(best, prod)
        if prod == 0:
            prod = 1
    prod = 1
    for x in reversed(nums):             # right to left
        prod *= x
        best = max(best, prod)
        if prod == 0:
            prod = 1
    return best
```

Mentioning this variant shows breadth; the max/min version is the one to *code* since it generalizes more naturally (e.g., to "maximum product of a subsequence of length k" style follow-ups).

---

## 7. Common Mistakes (interview killers)

| # | Mistake | Why it's wrong / fix |
|---|---|---|
| 1 | Initializing `best = 0` | All-negative input: `[-3]` must return `−3`, `[-2, -1]`... actually `[-2,-1]` gives 2, but `[-5, -2, -3]`... has product 30; a pure single-neg case like `[-4]` → −4. Initialize to `nums[0]`. |
| 2 | Updating `cur_max` before using it for `cur_min` | You need the **old** max when computing the new min (and vice versa). Save both first, or compute both in one expression. |
| 3 | Only tracking the max (single-tracker Kadane) | Fails on `[-2, 3, -4]` → returns 3 instead of 24. The min must be carried because it can flip. |
| 4 | Treating `0` as a hard stop that skips the element | A zero is itself a valid single-element answer (product 0). `[-2, 0]` → answer is 0, not −2. The `max(..., x)` restart handles this — but only if `best` is updated with `cur_max` which can be `0`. |
| 5 | Confusing subarray with subsequence | `[-2, 0, -1]`: picking `[-2, -1]` skipping the 0 gives 2 — **illegal**. Contiguous only. |
| 6 | Resetting products to `1` and never considering negative answers | If every single element is negative and odd-count, the best is the *least negative* single element; the DP restart candidate `x` covers this, but only if you never clamp answers to ≥ 0. |
| 7 | Overflow in Java/C++ intermediates | Here the problem guarantees 32-bit fit, but if you ever solve the "return product of large array" variant, use `long`/`long long` (and in C++, check with `__int128` or clamp), since intermediate products can exceed the final answer's range conceptually. **Java gotcha:** `int*int` overflow wraps silently — cast to `long` before multiplying in variants. **C++ gotcha:** no autoboxing to rescue you; `INT_MAX` overflow is UB, not an exception. **Python gotcha:** none (arbitrary precision), but don't let that lull you into thinking the guarantee is unnecessary in other languages. |
| 8 | Duplicates / repeated values | No special handling needed — duplicates behave like any value; don't try to dedupe. But if asked "what if I needed the *subarray indices*," you'd track the window start alongside `cur_max`, restarting when `x` alone wins. |

---

## 8. Test Cases to Propose Out Loud

Before coding (or immediately after), volunteer these — it signals rigor:

| Test | Input | Expected | What it checks |
|---|---|---|---|
| Official 1 | `[2, 3, -2, 4]` | `6` | Basic positive run wins. |
| Official 2 | `[-2, 0, -1]` | `0` | Zero splits; negative-only sides can't pair up. |
| Edge: single element | `[−7]` | `−7` | Answer can be negative; `best = nums[0]` initialization. |
| Edge: all negatives, even count | `[-2, -3, -4]` | `12` (from `[-3, -4]`... actually `[-2,-3]` = 6 and `[-3,-4]` = 12) | Two negatives flip; min-tracker carries `−24`... check: at i=1, prev_min=−2 → cur_max = max(6,6,−3)=6, cur_min=−6; at i=2, prev_min=−6, x=−4 → cur_max = max(−24, **24**, −4) = 24. So expected is **24** (`[-2,-3,-4]` all three = −24; `[-2,-3]`=6; `[-3,-4]`=12; hmm, 24 = `[-2,-3,-4]`? No: (−2)(−3)(−4) = −24. Where does 24 come from? prev_min at i=2 is −6 (`[-2, 3]`? No — recompute: i=1: prev_max=−2, prev_min=−2, x=−3: cur_max = max(6, 6, −3) = 6; cur_min = −6. i=2: prev_max=6, prev_min=−6, x=−4: cur_max = max(−24, **24**, −4) = 24 — representing `[-2, 3, -4]` = 24.) So expected: **24**. | Double-flip through an interleaved positive. |
| Edge: zeros everywhere | `[0, 0, 0]` | `0` | Zero resets; no crash. |
| Edge: single zero among negatives | `[−1, 0, −2]` | `0` | Answer is the zero itself. |
| Edge: big positive run | `[1, 2, 3, 4]` | `24` | No negatives, plain running max. |
| Edge: negatives bookending | `[−2, 5, −3]` | `30` | Both negatives must pair *across* the middle. |

(If you memoize numbers rather than deriving them live, be careful — it's safer to state *what property each case tests* than to recite specific outputs from memory. Reciting a wrong expected value costs credibility.)

---

## 9. Transferable Patterns & Related Problems

**Patterns embedded in this problem:**

1. **"Kadane's with state augmentation"** — when a simple running max isn't enough, ask *what extra state makes the recurrence locally computable?* Here: the min. This generalizes: state = (max, min) appears whenever **an operation can invert ordering** (multiplication by negatives, XOR-ish flips, subtraction).
2. **"Restart candidate"** — the third candidate `x` alone means "drop the past." Every DP-over-prefix problem has this "start fresh here" option; forgetting it is a classic bug.
3. **"Zeros as delimiters"** — products (and sums-to-zero style problems) partition at zeros; reasoning about zero-free segments is a reusable mental tool.
4. **Prefix/suffix symmetry** — the two-pass sweep exploits that in a zero-free block, the optimal window touches one end. Great fallback if you blank on the DP.

**Related problems to practice the same muscles:**

| Problem | Connection |
|---|---|
| LC 53 Maximum Subarray | Kadane's baseline — this problem is its product-flavored sibling. |
| LC 918 Maximum Sum Circular Subarray | Same "track min too" trick (min subarray ⇒ complement = max wrap). |
| LC 1567 Maximum Length of Subarray With Positive Product | Same max/min-sign DP, but track *lengths* of positive/negative-product windows. |
| LC 713 Subarray Product Less Than K | Products + sliding window; two pointers. |
| LC 238 Product of Array Except Self | Products with zeros/negatives handling, prefix/suffix sweeps. |

---

## 10. Interview Talk Track (full version)

> "This is Kadane's algorithm with a twist. With sums, a negative running value never helps, so we discard it. With products, a negative running value *can* help — if the next element is negative, it flips to a big positive. So I can't discard negatives; instead I track two running values at each position: the maximum and the minimum product of any subarray *ending* at that index. Each new element gives three candidates: old-max times x, old-min times x, and x itself — the last one restarts the window, which is what rescues me at zeros. I take the max of the three for `cur_max`, the min for `cur_min`, and update my global answer with `cur_max`. One pass, O(n) time, O(1) space. The one implementation trap is computing both candidates from the *old* max and min before overwriting either. Let me trace `[-2, 3, -4]` to show why the min matters: the min hits −6, then multiplying by −4 gives 24, which single-tracker Kadane would miss."

---

## 11. Say It in 60 Seconds

> "It's Kadane's algorithm, but for products — and the twist is that a negative number flips max and min. So at every index I track two running values: the max and the min product of any subarray ending here. For each new element x, the new max is the biggest of three things: old max times x, old min times x, and x by itself — that third option restarts the window and handles zeros. I update the min the same way, and bump my global answer with the running max. One pass, O(n) time, O(1) space. Two traps: I have to compute both updates from the *old* values before overwriting them, and I initialize the answer to the first element, not zero, because an all-negative array can have a negative answer. Quick check with `[-2, 3, -4]`: the running min goes to −6, then −6 times −4 gives 24 — that's why we carry the min."

*(That's roughly 60–70 seconds at natural speaking pace — trim the final example sentence if you're running over, but keep the "flips max and min" sentence: it's the whole problem.)*
