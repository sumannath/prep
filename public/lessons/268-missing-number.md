# Missing Number (LeetCode 268) — Complete Interview Lesson

## 1. Problem, Restated Precisely

You get an array `nums` of length `n` holding **n distinct integers**, each in the inclusive range `[0, n]`. That range contains **n + 1 candidate values** (0, 1, ..., n) but the array has only **n slots**. Since all values are distinct, exactly **one** candidate is absent. Return it.

Three facts to internalize before writing any code:

| Fact | Consequence |
|---|---|
| Range `[0, n]` has **n + 1** values, array has **n** slots | Exactly one value is missing — pigeonhole. The answer can be `0`, can be `n`, or anything between. |
| Values are **distinct** | Sum/XOR "invariant" tricks work cleanly; with duplicates they'd only give you `missing XOR duplicate` (that's a different problem — LC 645). |
| Array is **not** guaranteed sorted | You may not binary-search or assume `nums[i] == i` without sorting first. |

---

## 2. Decoding the Constraints

| Constraint | What it tells you / unlocks |
|---|---|
| `1 <= n <= 10^4` | An O(n²) double loop (~10⁸ worst case) is theoretically wasteful and the follow-up explicitly bans it. Also: max expected sum is n(n+1)/2 = 50,005,000, which fits comfortably in a 32-bit int **for these constraints** (see overflow notes below). |
| `0 <= nums[i] <= n` | **Value `n` can occur, but index `n` does not exist** in a length-n array. Any "place value `v` at index `v`" approach needs a bounds check `v < n`. Classic trap. |
| All numbers unique | Guarantees exactly one missing value; makes cyclic-sort placement valid (no two values compete for the same index). |
| "Return the only number" | No `-1` sentinel / "not found" branch needed. |

The follow-up — **O(n) time, O(1) space** — rules out the hash set (O(n) space) and sorting (O(n log n); that bound holds because a comparison sort's decision tree must distinguish n! orderings with binary comparisons, requiring Θ(n log n) comparisons). So we need something smarter.

---

## 3. Baseline Solutions (with worked traces)

### 3.1 Brute force: candidates × linear scan — O(n²) time, O(1) space

```python
def missingNumber(nums: list[int]) -> int:
    n = len(nums)
    for candidate in range(n + 1):      # 0..n inclusive → n+1 candidates
        if candidate not in nums:       # `not in` on a LIST is an O(n) scan
            return candidate
```

**Worked trace on `nums = [3, 0, 1]`** (n = 3, candidates 0..3):

| candidate | scan of `[3, 0, 1]` | result |
|---|---|---|
| 0 | found at index 1 | continue |
| 1 | found at index 2 | continue |
| 2 | **not found anywhere** | **return 2** ✓ |

Correct, but each of the up-to-n+1 candidates costs an O(n) scan. Note the deliberate sin: `candidate not in nums` on a *list* is O(n); doing this inside a loop is how candidates accidentally ship O(n²).

### 3.2 Sort + first index/value mismatch — O(n log n)

After sorting a near-permutation, the answer is the first index `i` where `nums[i] != i` — **or `n` if no such index exists**.

```python
def missingNumber(nums: list[int]) -> int:
    nums.sort()                        # mutates input — ask first!
    for i, v in enumerate(nums):
        if v != i:
            return i
    return len(nums)                   # fall-through: the missing number is n
```

**Trace on `[3, 0, 1]`** → sorted `[0, 1, 3]`: `nums[0]=0 ✓`, `nums[1]=1 ✓`, `nums[2]=3 ≠ 2` → return **2** ✓.

**Trace on `[0, 1]`** (missing value is `n` itself) → sorted `[0, 1]`: no mismatch ever fires, so the `return len(nums)` fall-through is **mandatory**. Forgetting that line is one of the most common bugs on this problem.

### 3.3 Hash set — O(n) time, O(n) space

```python
def missingNumber(nums: list[int]) -> int:
    seen = set(nums)
    for x in range(len(nums) + 1):
        if x not in seen:
            return x
```

This is the "safe" optimal-time baseline. It fails the follow-up only on space. Say this out loud in an interview: *"Hash set gives me O(n)/O(n); I believe I can do O(1) space — here's how."*

---

## 4. The Core Insight

The array is a **full permutation of `[0..n]` with exactly one element deleted**. Any *total quantity* that is fixed for the complete set `[0..n]` will differ from the array's quantity by exactly the missing value:

- **Additive invariant:** `0 + 1 + ... + n = n(n+1)/2` (Gauss). So `missing = n(n+1)/2 − sum(nums)`.
- **XOR invariant:** `x ^ x = 0`, `x ^ 0 = x`, and XOR is commutative/associative. XOR-ing the full range `0..n` together with every array value cancels every *present* value (it appears once in each group) and leaves the missing value (it appears only in the range group).

This reframing turns *searching for an absent element* (needs membership tests / extra memory) into *evaluating an arithmetic identity* (one pass, no memory).

**Why O(n) is optimal, not just achievable:** any correct algorithm must read every element in the worst case — if one cell goes unread, two arrays differing only in that cell produce identical observations but different answers, so Ω(n) reads are necessary. The Gauss/XOR solutions hit this floor with zero extra space.

---

## 5. Optimal Solutions

### 5.1 Gauss sum — O(n) time, O(1) space, no mutation ✅ follow-up

```python
def missingNumber(nums: list[int]) -> int:
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)   # integer division!
```

**Traces on all three official examples:**

| Example | n | expected = n(n+1)/2 | actual Σnums | answer |
|---|---|---|---|---|
| `[3,0,1]` | 3 | 6 | 4 | 6 − 4 = **2** ✓ |
| `[0,1]` | 2 | 3 | 1 | 3 − 1 = **2** ✓ |
| `[9,6,4,2,3,5,7,0,1]` | 9 | 45 | 37 | 45 − 37 = **8** ✓ |

Note how the `[0,1]` case — the one that breaks naive scans — costs the formula *nothing*. That's a strong sign the invariant approach is structurally right.

**Overflow-hardened variant** (keeps every intermediate value tiny — good habit for fixed-width-integer languages):

```python
def missingNumber(nums: list[int]) -> int:
    missing = len(nums)          # seed with n: index n has no loop counterpart
    for i, v in enumerate(nums):
        missing += i - v         # net contribution of a full pair is 0
    return missing
```

Check on `[3,0,1]`: start 3 → `+0−3` → 0 → `+1−0` → 1 → `+2−1` → **2** ✓.

### 5.2 XOR — O(n) time, O(1) space, immune to overflow ✅ follow-up

```python
def missingNumber(nums: list[int]) -> int:
    missing = len(nums)              # seed with n
    for i, v in enumerate(nums):
        missing ^= i ^ v
    return missing
```

Conceptually this computes `(0 ⊕ 1 ⊕ ... ⊕ n) ⊕ (nums[0] ⊕ ... ⊕ nums[n-1])`; every present value cancels against its equal in the range.

**Step trace on `[3, 0, 1]`:**

| step | i | nums[i] | operation | missing |
|---|---|---|---|---|
| init | – | – | `missing = n = 3` | 3 |
| 1 | 0 | 3 | `3 ^ 0 ^ 3` | 0 |
| 2 | 1 | 0 | `0 ^ 1 ^ 0` | 1 |
| 3 | 2 | 1 | `1 ^ 2 ^ 1` | **2** ✓ |

**Step trace on `[0, 1]`** (missing = n): start 2 → `2^0^0 = 2` → `2^1^1 = 2` → **2** ✓. The seed value survives untouched — exactly right, because `n` was never among the indices.

Forgetting to seed with `n` is the classic XOR bug: the loop pairs indices `0..n−1` with values, so the candidate `n` must enter the fold from outside.

### 5.3 Cyclic sort — O(n)/O(1), when the interviewer says "no math tricks"

Some interviewers consider sum/XOR "a trick" and want index manipulation. The honest answer: place every value `v` at index `v` — **except `v == n`, which has no home index** (valid indices are `0..n−1`) — then find the first index wearing the wrong value.

```python
def missingNumber(nums: list[int]) -> int:
    n = len(nums)
    i = 0
    while i < n:
        v = nums[i]
        if v < n and nums[v] != v:       # v == n has nowhere to go: skip it
            nums[i], nums[v] = nums[v], nums[i]
        else:
            i += 1
    for i in range(n):
        if nums[i] != i:
            return i
    return n
```

**Trace on `[3, 0, 1]`** (n = 3):

| step | i | array | action |
|---|---|---|---|
| start | 0 | `[3,0,1]` | v=3 equals n → no home index → advance |
| 1 | 1 | `[3,0,1]` | v=0, nums[0]=3≠0 → swap → `[0,3,1]` |
| 2 | 1 | `[0,3,1]` | v=3 equals n → advance |
| 3 | 2 | `[0,3,1]` | v=1, nums[1]=3≠1 → swap → `[0,1,3]`; v=3 → advance |
| scan | – | `[0,1,3]` | nums[2]=3≠2 → **return 2** ✓ |

This is O(n) *amortized* even though it's a while-loop with swaps: every swap moves one value into its final index permanently, so there are at most n swaps total. Two caveats to state aloud: it **mutates the input** (ask permission), and it only works because values are **distinct**.

---

## 6. Complexity Comparison

| Approach | Time | Extra space | Mutates input? | Meets follow-up? |
|---|---|---|---|---|
| Candidate × linear scan | O(n²) | O(1) | No | ❌ |
| Sort + scan | O(n log n) | O(1)–O(log n)* | Usually yes | ❌ |
| Hash set | O(n) | O(n) | No | ❌ (space) |
| **Gauss sum** | **O(n)** | **O(1)** | **No** | ✅ |
| **XOR** | **O(n)** | **O(1)** | **No** | ✅ |
| Cyclic sort | O(n) amortized | O(1) | Yes | ✅ (if mutation allowed) |

\* depending on the language's sort (e.g., Python's Timsort uses up to O(n) auxiliary in the worst case).

---

## 7. Language-Specific Gotchas

| Language | Gotcha |
|---|---|
| **Python** | `n*(n+1)/2` returns a **float** — use `//`. And `x not in nums` on a *list* inside a loop silently degrades to O(n²); use a `set` if you need membership. |
| **Java** | For generalized n, write `(long) n * (n + 1) / 2` — cast **before** multiplying. (Safe here since 50,005,000 < 2³¹−1, but the habit matters.) `HashSet<Integer>` autoboxes every int; and `Arrays.stream(nums).sum()` accumulates in `int`. |
| **C++** | `std::accumulate(nums.begin(), nums.end(), 0)` accumulates in `int` — pass `0LL` to get `long long`. In placement approaches, `nums[v]` with `v == n` is **out-of-bounds UB**, not an exception — guard with `if (v < n && nums[v] != v)`. |

---

## 8. Common Mistakes

1. **Range off-by-one.** The range is `[0, n]` — **n + 1** values. Using expected sum `n(n−1)/2`, or scanning candidates only `0..n−1`, is wrong. This is the #1 error on this problem.
2. **Missing the fall-through.** Scan/sort-based solutions must return `n` when no mismatch is found (`[0,1]` → 2). The sum/XOR formulas handle this case for free.
3. **Value-as-index trap.** Value `n` occurs but index `n` doesn't. Every placement/marking approach needs `if v < n` before touching `nums[v]`.
4. **O(n) loop + O(n) membership.** `for x in range(n+1): if x not in nums` is O(n²) in Python — list `in` is a linear scan.
5. **Float division / float return.** `/` instead of `//` in Python.
6. **Overflow in fixed-width ints.** Negligible at n ≤ 10⁴, real in generalized versions; the incremental `missing += i - v` form or XOR sidesteps it entirely.
7. **XOR without the seed.** Forgetting `missing = len(nums)` drops candidate `n` from the fold.
8. **Mutating input uninvited.** `sort()` and cyclic sort both rewrite the caller's array — ask first.
9. **Assuming sorted input.** Nothing in the statement says so; examples 1 and 3 are unsorted.
10. **Ignoring that distinctness is load-bearing.** With one duplicate replacing the missing value, the sum difference becomes `missing − duplicate` — which is exactly LC 645, *Set Mismatch*. Saying this shows you know when the trick breaks.

---

## 9. Test Cases to Propose Out Loud

State these before (or right after) coding — it signals rigor:

| Test | Expected | Why it's interesting |
|---|---|---|
| `[3,0,1]` | 2 | Official ex. 1; missing in middle, unsorted |
| `[0,1]` | 2 | Official ex. 2; **missing = n** — kills solutions with no fall-through |
| `[9,6,4,2,3,5,7,0,1]` | 8 | Official ex. 3; larger, unsorted |
| `[0]` | 1 | n = 1, missing = n |
| `[1]` | 0 | n = 1, **missing = 0** |
| `[0,1,2]` | 3 | missing = n at larger scale |
| `[1,2,3]` | 0 | **missing = 0** — first-slot edge |
| `[4,5,2,1,0]` | 3 | unsorted, missing ≠ 0 and ≠ n |
| n = 10⁴ shuffled permutation minus one element | the removed value | stress: verifies O(n) path and no reliance on order |

Post-coding sanity check to narrate: *answer ∉ nums; answer ∈ [0, n]; the remaining n values are distinct and cover the rest of the range.*

---

## 10. Transferable Patterns & Related Problems

| Pattern | Essence | Where else it appears |
|---|---|---|
| **Near-permutation invariants (sum / XOR)** | A set minus one element differs from the full set by exactly that element | LC 448 *Find All Numbers Disappeared*; LC 268 (this); LC 389 *Find the Difference*; LC 136/137/260 *Single Number* family |
| **Cyclic sort / index-as-hash** | If values live in `[0, n−1]` or `[1, n]`, value `v` belongs at index `v`; swap each into place | LC 41 *First Missing Positive* (the famous hard version); LC 442 *Find All Duplicates*; LC 645 *Set Mismatch*; LC 287 *Find the Duplicate Number* |
| **Pigeonhole counting** | n slots, n+1 candidates → exactly one absent | Reasoning backbone for all of the above |
| **XOR self-cancellation** | `x ^ x = 0` isolates the unpaired element | Missing/duplicate pairs, odd-occurrence problems |

**Pattern trigger to memorize:** *"values are a near-complete range, all distinct"* → think Gauss sum or XOR first; *"…and the interviewer bans arithmetic"* → cyclic sort, minding that value `n` has no index.

---

## 11. Full Interview Talk Track

> **Clarify (first 30 seconds):** "Let me confirm: values are distinct, drawn from 0 through n inclusive — so n+1 candidates in n slots, exactly one missing. The array isn't sorted, and I'd like to know if I'm allowed to mutate the input, since some approaches rewrite it."
>
> **Baseline:** "Trivial baseline: put everything in a set, scan 0..n for the gap — O(n) time but O(n) space. Sorting and scanning for the first index mismatch is O(n log n). Both miss the follow-up."
>
> **Insight (the pivot):** "The key observation is this array is a complete permutation of 0..n with one element deleted. So any quantity that's fixed for the full range — the sum n(n+1)/2, or the XOR of 0..n — differs from the array's quantity by exactly the missing value. That converts a *search problem* into a *one-pass arithmetic identity*."
>
> **Code:** "I'll compute expected minus actual sum in one pass. I'll walk example 2 out loud: n=2, expected 3, actual 1, answer 2 — good, that's the case where the missing value is n itself, and the formula absorbs it with no special-casing."
>
> **Alternatives:** "If overflow were a concern in a fixed-width language, I'd switch to XOR: seed with n, XOR in every index and every value; everything present cancels, the missing value survives. And if you'd rather I avoid arithmetic tricks entirely, cyclic sort places each value at its own index — skipping value n, which has no home — then the first misplaced index is the answer; that one mutates the array."
>
> **Tests + complexity:** "Edge cases I'm covering: single-element arrays, missing 0, missing n, unsorted middle. One pass, constant space, input untouched — meets the follow-up, and Ω(n) reads are unavoidable anyway since any unread cell could change the answer."

---

## 12. Say It in 60 Seconds

> "An array of n distinct numbers drawn from 0 through n — that's n+1 candidates in n slots, so exactly one is missing, and it could be 0, n, or anywhere in between. Baseline is a hash set, O(n) time but O(n) space, which fails the follow-up. The insight: this is a full permutation of 0..n with one element deleted, so any invariant of the full range differs from the array's by exactly the missing number. Concretely, the sum of 0..n is n times n+1 over 2; subtract the array's sum and the difference *is* the answer — one pass, constant space, no mutation, which satisfies the follow-up. If I'm worried about overflow in fixed-width integer languages, XOR does the same job: start with n, XOR in each index and each value, and everything present cancels in pairs, leaving the missing value. Traps I'm watching: the range has n+1 values, not n; the missing number can be n itself, which breaks scan-based solutions without a fall-through; and value n exists but index n doesn't, so any index-placement approach needs a bounds check. Test cases: single-element arrays, missing 0, missing n, and an unsorted middle-missing case."

*(~55 seconds at interview speaking pace. Lead with the pigeonhole framing — n+1 candidates, n slots — because it justifies every solution that follows.)*
