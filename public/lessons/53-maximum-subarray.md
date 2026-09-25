# Maximum Subarray — Complete Interview Lesson (LeetCode 53)

## 1. Restating the problem in your own words

> "Given an array of integers that may contain negatives, find a **contiguous, non-empty** run of elements whose sum is as large as possible, and return that **sum** — not the subarray itself."

Three clauses matter enormously:

- **Contiguous** — a *subarray* keeps the original order and adjacency. It is *not* a *subsequence* (which may skip elements). On Example 1, the best **subsequence** would be `1 + 4 + 2 + 1 + 4 = 12`, but the correct subarray answer is `6`. Mixing these up is a classic interview-killer.
- **Non-empty** — the subarray must contain at least one element. If the array is all negative, the answer is the largest single element (negative!), not `0`. This is the single most common wrong answer on this problem.
- **Return the sum** — ties don't need tie-breaking. But be ready for the follow-up "return the subarray itself," where tie-breaking policy (leftmost? shortest?) is worth asking about.

Also restate the bound: `1 <= nums.length` means no empty input; `|nums[i]| <= 10^4` means negatives are guaranteed to appear in general.

---

## 2. Decoding the constraints

| Constraint | What it tells you about the solution |
|---|---|
| `n <= 10^5` | An `O(n^2)` brute force does ~`10^10` additions — far beyond the ~`10^8` simple operations per second typical judges allow, so it will TLE. You need `O(n)` or `O(n log n)`. |
| `-10^4 <= nums[i] <= 10^4` | Negatives exist ⇒ (a) the answer can be negative, (b) **sliding window** tricks fail (window sums aren't monotonic as the window grows), (c) max possible answer magnitude is `10^5 × 10^4 = 10^9`, which fits a signed 32-bit int (`< 2^31 − 1 ≈ 2.147 × 10^9`) but with little headroom — `long`/`long long` is free insurance if constraints ever grow. |
| `n >= 1` | Single-element arrays are legal; initialize from `nums[0]`, not from a zero or a sentinel you later add to. |
| Return value is a sum | Duplicates/ties are harmless — no index bookkeeping required (unless the interviewer asks for the subarray). |

---

## 3. Brute force, with a worked trace

**Idea:** fix a start index `i`, extend the end index `j` rightward, keep a running sum so each extension is `O(1)` instead of re-summing from scratch (the naive version that re-sums `nums[i..j]` every time is `O(n^3)`).

```python
def maxSubArray_bruteforce(nums: list[int]) -> int:
    best = float("-inf")
    n = len(nums)
    for i in range(n):            # subarray starts at index i
        running = 0
        for j in range(i, n):     # subarray ends at index j (inclusive)
            running += nums[j]    # O(1) extension, not a re-sum
            best = max(best, running)
    return best
```

**Worked trace** on `nums = [-2, 1, -3, 4]` (first four elements of Example 1, to keep the table readable — note the full Example 1 answer is `6`, but for this prefix the answer is `4`):

| start `i` | Sums as `j` extends | Best for this start |
|---|---|---|
| 0 | `-2` → `-1` → `-4` → `0` | `0` (subarray `[0..3]`) |
| 1 | `1` → `-2` → `2` | `2` (subarray `[1..3]`) |
| 2 | `-3` → `1` | `1` (subarray `[2..3]`) |
| 3 | `4` | `4` (subarray `[3..3]`) |

Global best = **4**, achieved by the single element at index 3. Time `O(n^2)`, space `O(1)`.

**What to say next:** "Every one of these `n(n+1)/2` subarrays shares a prefix with another — I'm re-deciding, over and over, whether to keep extending. That smells like dynamic programming."

---

## 4. The core insight (Kadane's algorithm)

Define, **per index**, not per pair:

> `dp[i]` = the maximum sum of a subarray that ends **exactly at index `i`**.

Any subarray ending at `i` either:

1. is just `[nums[i]]`, or
2. starts at some `k < i` — and among those, the best choice is the best subarray ending at `i-1`, since `sum(nums[k..i]) = sum(nums[k..i-1]) + nums[i]` and `dp[i-1]` maximizes the first term.

Therefore:

```
dp[i] = max(nums[i], dp[i-1] + nums[i])  =  nums[i] + max(0, dp[i-1])
```

**Intuition:** a running sum that has gone *negative* can never help a future subarray — carrying it forward is strictly worse than restarting. So we drop negative prefixes. The final answer is `max over all i` of `dp[i]` (the best subarray ends *somewhere*), and since `dp[i]` only depends on `dp[i-1]`, one rolling variable suffices: **`O(n)` time, `O(1)` space**.

**Equivalent framing worth mentioning:** with prefix sums `P`, the answer is `max_j (P[j+1] − min_{k ≤ j} P[k])` — "each right endpoint minus the cheapest prefix before it." That's the same computation in different clothes, and it's the bridge to problems like *Subarray Sum Equals K*.

This `O(n)` solution is asymptotically optimal: every element must be read at least once, because an unread element could be arbitrarily large and change the answer without changing the algorithm's behavior — so nothing sublinear can be correct.

---

## 5. Optimal solution, with traces on the official examples

```python
def maxSubArray(nums: list[int]) -> int:
    best = cur = nums[0]          # NOT 0 — all-negative arrays must work
    for i in range(1, len(nums)):
        cur = max(nums[i], cur + nums[i])   # extend the run, or restart here
        best = max(best, cur)
    return best
```

### Trace — Example 1: `nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]`

| `i` | `x = nums[i]` | `cur = max(x, prev_cur + x)` | `best` |
|---|---|---|---|
| 0 | `-2` | `-2` (init) | `-2` |
| 1 | `1` | `max(1, -1) = 1` ← restart | `1` |
| 2 | `-3` | `max(-3, -2) = -2` | `1` |
| 3 | `4` | `max(4, 2) = 4` ← restart | `4` |
| 4 | `-1` | `max(-1, 3) = 3` | `4` |
| 5 | `2` | `max(2, 5) = 5` | `5` |
| 6 | `1` | `max(1, 6) = 6` | `6` |
| 7 | `-5` | `max(-5, 1) = 1` | `6` |
| 8 | `4` | `max(4, 5) = 5` | `6` |

Answer: **6**, achieved by `nums[3..6]` = `[4, -1, 2, 1]` (indices inclusive). Note how `cur` "survives" the small negatives at `i = 4` (a −1 riding on a +4 run is still net positive) but would have been discarded at `i = 3` because the preceding `cur = -2` was dead weight.

### Trace — Example 3: `nums = [5, 4, -1, 7, 8]`

| `i` | `x` | `cur` | `best` |
|---|---|---|---|
| 0 | `5` | `5` | `5` |
| 1 | `4` | `max(4, 9) = 9` | `9` |
| 2 | `-1` | `max(-1, 8) = 8` | `9` |
| 3 | `7` | `max(7, 15) = 15` | `15` |
| 4 | `8` | `max(8, 23) = 23` | `23` |

Answer: **23** — the whole array wins because the lone −1 costs less than the gain from bridging to the 7 and 8.

### Trace — Example 2: `nums = [1]`

Loop body never runs; returns **1**. This is why we initialize from `nums[0]`.

### Trace — all-negative: `nums = [-3, -1, -2]`

| `i` | `x` | `cur` | `best` |
|---|---|---|---|
| 0 | `-3` | `-3` | `-3` |
| 1 | `-1` | `max(-1, -4) = -1` | `-1` |
| 2 | `-2` | `max(-2, -3) = -2` | `-1` |

Answer: **-1** — the max-form `max(x, cur + x)` naturally prefers restarting, so the largest single element wins. No special-casing needed.

### Variant: returning the subarray itself (a very common follow-up)

Track where the current run *started*, and snapshot it whenever `best` improves:

```python
def maxSubArrayWithIndices(nums: list[int]) -> tuple[int, int, int]:
    best = cur = nums[0]
    best_lo = best_hi = cur_lo = 0
    for i in range(1, len(nums)):
        if nums[i] > cur + nums[i]:     # i.e., cur < 0 → restart at i
            cur = nums[i]
            cur_lo = i
        else:
            cur += nums[i]
        if cur > best:
            best, best_lo, best_hi = cur, cur_lo, i
    return best, best_lo, best_hi       # subarray = nums[best_lo..best_hi]
```

On Example 1 this returns `(6, 3, 6)` → `nums[3:7] = [4, -1, 2, 1]`. If multiple optimal subarrays exist (e.g., `[1, -1, 1]`), this returns the leftmost one ending earliest; flag the tie-break policy explicitly in an interview.

---

## 6. Follow-up: divide and conquer (`O(n log n)`)

The problem's follow-up asks for the "subtle" divide-and-conquer solution. **Split at the midpoint; the optimal subarray is entirely left, entirely right, or crosses the boundary.** Crossing subarrays are exactly (a suffix of the left half) + (a prefix of the right half), so their best sum is `best suffix of left + best prefix of right`, each computable in a linear sweep.

```python
def maxSubArray_dc(nums: list[int]) -> int:
    def solve(lo: int, hi: int) -> int:          # inclusive bounds
        if lo == hi:
            return nums[lo]
        mid = (lo + hi) // 2
        left_best = solve(lo, mid)
        right_best = solve(mid + 1, hi)

        # best NON-EMPTY suffix of nums[lo..mid]
        best_suffix, cur = float("-inf"), 0
        for i in range(mid, lo - 1, -1):
            cur += nums[i]
            best_suffix = max(best_suffix, cur)

        # best NON-EMPTY prefix of nums[mid+1..hi]
        best_prefix, cur = float("-inf"), 0
        for i in range(mid + 1, hi + 1):
            cur += nums[i]
            best_prefix = max(best_prefix, cur)

        return max(left_best, right_best, best_suffix + best_prefix)

    return solve(0, len(nums) - 1)
```

**Mini-trace** on `[-2, 1, -3, 4]` (answer 4, matching Section 3):

- `solve(0,1)` on `[-2, 1]`: left = `-2`, right = `1`, cross = `(-2) + (1) = -1` → max = **1**
- `solve(2,3)` on `[-3, 4]`: left = `-3`, right = `4`, cross = `(-3) + (4) = 1` → max = **4**
- Root `solve(0,3)`, `mid = 1`: left = `1`, right = `4`; cross = (best suffix ending at index 1: `max(1, -2+1) = 1`) + (best prefix starting at index 2: `max(-3, -3+4) = 1`) = **2**
- `max(1, 4, 2) = 4` ✓

**Complexity:** `T(n) = 2T(n/2) + Θ(n)` halves the input evenly with a linear combine step — by the master theorem (case 2, since `f(n) = Θ(n^{log₂ 2})`), this is `Θ(n log n)`, with `O(log n)` recursion depth. Kadane's `O(n)` still beats it; the D&C version is asked to probe recursion and decomposition skills — and its merge step generalizes: a segment tree whose nodes store `(total, best_prefix, best_suffix, best)` supports *range* max-subarray queries in `O(log n)` (the classic SPOJ GSS1 technique).

---

## 7. Complexity table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Naive triple loop (re-sum each subarray) | `O(n^3)` | `O(1)` | Never submit |
| Brute force with running sum | `O(n^2)` | `O(1)` | ~`10^10` ops at `n = 10^5` → TLE |
| Prefix sums + running min prefix | `O(n)` | `O(1)` | Equivalent reformulation of Kadane |
| **Kadane's DP (the answer)** | **`O(n)`** | **`O(1)`** | Matches the Ω(n) read-everything lower bound, hence optimal |
| Divide & conquer (follow-up) | `O(n log n)` | `O(log n)` stack | Asked to test recursion, not speed |

---

## 8. Common mistakes & language gotchas

**Logic mistakes**

1. **`best = 0` initialization.** Fails every all-negative array (`[-3,-1,-2]` → should be `-1`, you return `0`). Always seed with `nums[0]` or `-inf`.
2. **Assuming an empty subarray is allowed.** The problem implies non-empty; silently returning `0` for `[-5]` is wrong. State the assumption out loud.
3. **Subarray vs. subsequence confusion.** Skipping elements is not allowed. Re-state "contiguous" before coding.
4. **Sliding window with negatives.** Window sums aren't monotonic when values can be negative, so the grow/shrink invariant breaks. Kadane (or prefix sums) replaces it.
5. **Reset-order bug** in the alternate formulation `cur += x; if cur < 0: cur = 0; best = max(best, cur)` — resetting *before* updating `best` makes all-negative arrays return `0`. Update `best` **first**, then reset. (The `max(x, cur + x)` form is immune.)
6. **Off-by-one in D&C:** crossing loops must cover `[lo..mid]` backward and `[mid+1..hi]` forward; using `[mid..hi]` double-counts `mid` and misses the true crossing case.

**Language-specific gotchas**

| Language | Gotcha |
|---|---|
| Java | Seed `cur`/`best` with `nums[0]`, **not** `Integer.MIN_VALUE` — `Integer.MIN_VALUE + x` underflows and wraps positive. `int` suffices here (max \|sum\| `10^9 < 2^31 − 1`), but switch to `long` if constraints grow. Prefer `int` primitives over `Integer` (boxing) in stream one-liners. |
| C++ | Take `const std::vector<int>&` — pass-by-value copies the whole array, an instant `O(n)` smell. `INT_MIN` has the same underflow hazard as Java's sentinel. `std::max(cur, cur + x)` is fine with matched `int` types. |
| Python | Ints are arbitrary-precision, so overflow is a non-issue — but `for x in nums[1:]` slice-copies; `range(1, len(nums))` or an iterator avoids that. Use `float("-inf")` as the no-answer-yet sentinel. |

---

## 9. Test cases to propose out loud

Say these before coding — it signals edge-case awareness and buys you design clarity:

| # | Input | Expected | Why it matters |
|---|---|---|---|
| 1 | `[-2,1,-3,4,-1,2,1,-5,4]` | `6` | Official Ex. 1; mixed signs |
| 2 | `[1]` | `1` | Official Ex. 2; single element, loop never runs |
| 3 | `[5,4,-1,7,8]` | `23` | Official Ex. 3; **whole array** is optimal despite a −1 |
| 4 | `[-3,-1,-2]` | `-1` | All negative → must return the largest single element |
| 5 | `[-5]` | `-5` | Single negative; guards `best = 0` bugs |
| 6 | `[0,0,0]` | `0` | Duplicates/zeros; ties everywhere, sum still well-defined |
| 7 | `[-2, 10, -3]` | `10` | Best is one middle element, isolated by negatives |

```python
def check(f):
    assert f([-2,1,-3,4,-1,2,1,-5,4]) == 6
    assert f([1]) == 1
    assert f([5,4,-1,7,8]) == 23
    assert f([-3,-1,-2]) == -1      # all negative
    assert f([-5]) == -5            # single negative
    assert f([0,0,0]) == 0          # all zeros / duplicates
    assert f([-2,10,-3]) == 10      # isolated peak element
```

---

## 10. Transferable patterns & related problems

The reusable skeleton here is **"best value for runs *ending at* index `i`"** — a rolling 1-D DP — plus **"drop state that can only hurt"**:

| Problem | Connection |
|---|---|
| LC 121 — Best Time to Buy and Sell Stock | Kadane on daily deltas `price[i] − price[i−1]`; max subarray sum = max profit |
| LC 152 — Maximum Product Subarray | Same "ending here" DP, but track **max and min** (a negative × negative flips signs) |
| LC 918 — Maximum Sum Circular Subarray | `max(Kadane, total − minSubarray)`; watch the all-negative edge case |
| LC 560 — Subarray Sum Equals K | Prefix sums + hash map; same contiguous-subarray family, different tool |
| LC 363 — Max Sum of Rectangle ≤ K | 2-D version: fix a column pair, reduce to 1-D prefix sums + sorted search |
| SPOJ GSS1 (range max-subarray) | The D&C merge `(total, bestPrefix, bestSuffix, best)` becomes a segment-tree node |

**Meta-patterns to name in interviews:** (1) *running state you reset when it stops helping* (Kadane); (2) *prefix aggregate + running best complement* (stock / max-difference problems); (3) *split at a boundary and combine left-suffix with right-prefix* (D&C / segment-tree merges).

---

## 11. Interview script: narrating while you solve

> "Let me confirm: subarray means contiguous, non-empty, and I return the sum. Negatives are allowed, so the answer could be negative, and sliding windows won't work.
>
> Brute force: fix a start, extend the end with a running sum — that's `O(n²)`, about `10^10` operations at this size, too slow, but it shows the redundancy: when I extend from `i`, I keep re-deciding whether the prefix behind me is worth carrying.
>
> The insight is to define, per index, the best subarray **ending exactly here**. It either extends the best one ending at the previous index, or starts fresh — whichever is larger — because a negative running sum can only hurt what comes after. Then the global answer is the max of those per-index values, since the optimal subarray ends somewhere.
>
> That's one pass, two variables: `cur` for best-ending-here, `best` for the global max. I initialize both to `nums[0]`, not zero, so all-negative arrays return the largest element. `O(n)` time, `O(1)` space, and that's optimal since every element must be read.
>
> If you want the subarray itself, I track where the current run started and snapshot start/end whenever `best` improves. And there's a divide-and-conquer version: split at the midpoint, answer is the best of left, right, or best-left-suffix plus best-right-prefix — `O(n log n).`"

---

## 12. Say it in 60 seconds

> "This is the classic Kadane's algorithm problem. Brute force fixes a start and extends the end with a running sum — `O(n²)`, too slow at a hundred thousand elements. The key insight: the best subarray **ending at index i** either extends the best one ending at `i−1`, or starts fresh at `i`, because a negative running sum never helps the future. So one pass, two variables: `cur = max(x, cur + x)`, `best = max(best, cur)`. Initialize both to `nums[0]` — not zero — so an all-negative array correctly returns its largest single element; the subarray must be non-empty. That's `O(n)` time, `O(1)` space, and it's optimal, since every element has to be read. If asked for the subarray itself, track the current run's start index and snapshot it whenever `best` improves. The follow-up divide-and-conquer splits at the midpoint and takes the max of left, right, and best-left-suffix plus best-right-prefix — `O(n log n)` by the master theorem. Related problems: stock trading, maximum product subarray, circular subarray — all reuse this 'best ending here' pattern."
