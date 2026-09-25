# House Robber — Complete DSA Lesson

## 1. Problem Restatement

You're given an array `nums` where `nums[i]` is the amount of money in house `i`. You may rob any **subset** of houses with one restriction: **no two adjacent houses** (indices `i` and `i+1`) may both be robbed. Maximize the total money robbed.

Formally: choose a subset `S ⊆ {0, 1, ..., n-1}` such that no two elements of `S` are consecutive integers, maximizing `Σ nums[i] for i ∈ S`.

**Key observations to state out loud:**
- Robbing is optional — you can skip any house, including valuable ones (the constraint may force it).
- House `0` is adjacent only to house `1`; there's no wraparound. This is a **linear** street, not circular (House Robber II is the circular variant).
- Money is non-negative (`0 <= nums[i]`), so "skip everything" is always legal but never optimal unless it's forced.

---

## 2. Constraint Decoding

| Constraint | Meaning | Design implication |
|---|---|---|
| `n <= 100` | Tiny input | An O(n²) or even exponential-with-memoization solution passes. But we should still present O(n) time / O(1) space — it's the expected answer. |
| `nums[i] <= 400` | Max total = 100 × 400 = 40,000 | **No overflow risk** even in 16-bit terms, but this matters in the circular/DP variants on other platforms. In Java/C++, `int` is more than sufficient. |
| `nums[i] >= 0` | Non-negative values | Simplifies reasoning: you never *benefit* from robbing a house you don't have to. (With negative values allowed, "rob = max(value + ..., 0)" changes subtly.) |
| `n >= 1` | At least one house | No empty-array edge case, but handle `n == 1` (answer = `nums[0]`) — a common off-by-one crash spot. |

---

## 3. Brute Force: Enumerate All Subsets

Every house is either **robbed** or **skipped** — 2ⁿ subsets. Filter out those containing adjacent indices, take the max total.

### Recursive formulation

Define `rob(i)` = max money obtainable considering houses `i..n-1`. At house `i` you have two choices:

```
rob(i) = max( nums[i] + rob(i+2),   // rob house i, must skip i+1
              rob(i+1) )            // skip house i
Base case: rob(i) = 0 for i >= n
```

### Worked trace on `nums = [2, 7, 9, 3, 1]`

```
rob(0)
├── rob 0 (2) + rob(2)
│   ├── rob 2 (9) + rob(4)
│   │   └── rob 4 (1) + rob(6) = 1 + 0 = 1   →  9 + 1 = 10
│   └── skip 2 → rob(3)
│       ├── rob 3 (3) + rob(5) = 3 + 0 = 3
│       └── skip 3 → rob(4) = 1              →  max(3, 1) = 3
│   → rob(2) = max(10, 3) = 10               →  2 + 10 = 12
└── skip 0 → rob(1)
    ├── rob 1 (7) + rob(3) = 7 + 3 = 10
    └── skip 1 → rob(2) = 10                 →  rob(1) = max(10, 10) = 10
→ rob(0) = max(12, 10) = 12 ✓
```

### Brute-force code

```python
def rob_bruteforce(nums):
    def solve(i):
        if i >= len(nums):
            return 0
        return max(nums[i] + solve(i + 2), solve(i + 1))
    return solve(0)
```

**Complexity:** O(φⁿ) ≈ O(1.62ⁿ) time — the recursion tree branches into two subproblems whose sizes overlap heavily — and O(n) stack space.

**Why it's slow:** `rob(2)` is computed independently by both `rob(0)` (via the rob-0 branch) and `rob(1)` (via the skip-0 branch). The same subproblems are recomputed exponentially many times.

---

## 4. The Core Insight

> **The decision at house `i` only depends on the best totals achievable at houses `i+1` and `i+2` — nothing beyond that.**

Once you know "the best I can do starting at house `i+1`" and "the best starting at `i+2`", house `i`'s decision is a single `max`. The overlap in the recursion tree is massive: there are only **n distinct subproblems** (`rob(0) ... rob(n)`), but the plain recursion does O(2ⁿ) work recomputing them.

This is a textbook **1-D dynamic programming** pattern:
- **State:** `dp[i]` = max money robbable from houses `i..n-1`.
- **Transition:** `dp[i] = max(nums[i] + dp[i+2], dp[i+1])`.
- **Answer:** `dp[0]`.

A further squeeze: since `dp[i]` depends only on `dp[i+1]` and `dp[i+2]`, we never need the full array — two rolling variables suffice.

---

## 5. Optimal Approach

### Top-down memoization (easiest to explain first)

```python
from functools import lru_cache

def rob_memo(nums):
    n = len(nums)

    @lru_cache(maxsize=None)
    def solve(i):
        if i >= n:
            return 0
        return max(nums[i] + solve(i + 2), solve(i + 1))

    return solve(0)
```

O(n) time, O(n) space. Each of the `n` states is computed once; each transition is O(1). Note: `solve` closes over `n`, which is fine since `n` never changes during the call.

### Bottom-up DP (forward formulation — often easier to write)

Alternative state: `dp[i]` = max money considering houses `0..i`.

```
dp[i] = max(dp[i-1],           # skip house i
            dp[i-2] + nums[i]) # rob house i (must have skipped i-1)
dp[-1] = 0 (virtual), dp[0] = nums[0]
Answer: dp[n-1]
```

### Space-optimized (the interview gold standard)

```python
def rob(nums):
    prev2, prev1 = 0, 0   # dp[i-2], dp[i-1]
    for value in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + value)
    return prev1
```

Invariant after processing index `i`: `prev1` = best total using houses `0..i`, `prev2` = best total using houses `0..i-1`. Initializing both to `0` elegantly handles the "before any houses" base case and makes `n == 1` work without special-casing.

### Trace on Example 1: `nums = [1, 2, 3, 1]`

| i | value | prev2 (before) | prev1 (before) | new prev1 = max(prev1, prev2 + value) | Meaning |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 0 | max(0, 0+1) = **1** | rob house 0 |
| 1 | 2 | 0 | 1 | max(1, 0+2) = **2** | skip 0, rob 1 |
| 2 | 3 | 1 | 2 | max(2, 1+3) = **4** | rob 0, rob 2 |
| 3 | 1 | 2 | 4 | max(4, 2+1) = **4** | keep robbing 0,2 |

Return `prev1 = 4` ✓ (matches: rob houses 1 and 3 with money 1 and 3).

### Trace on Example 2: `nums = [2, 7, 9, 3, 1]`

| i | value | prev2 | prev1 | new prev1 | Best subset so far |
|---|---|---|---|---|---|
| 0 | 2 | 0 | 0 | **2** | {0} |
| 1 | 7 | 0 | 2 | **7** | {1} |
| 2 | 9 | 2 | 7 | **11** | {0, 2} |
| 3 | 3 | 7 | 11 | **11** | {0, 2} (skip 3) |
| 4 | 1 | 11 | 11 | **12** | {0, 2, 4} |

Return `prev1 = 12` ✓ (rob houses with 2, 9, 1).

Note at `i = 3`: robbing house 3 (7 + 3 = 10) *loses* to skipping it (11) — a concrete example of why "greedy: always rob the richer of each adjacent pair" fails.

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Enumerate all subsets | O(2ⁿ) | O(n) stack | Infeasible beyond n ≈ 25 |
| Plain recursion | O(φⁿ) ≈ O(1.62ⁿ) | O(n) stack | Overlapping subproblems |
| Top-down memoized | O(n) | O(n) memo + O(n) stack | Fine; mention recursion depth |
| Bottom-up DP array | O(n) | O(n) | No recursion, cache-friendly |
| **Rolling variables** | **O(n)** | **O(1)** | **Best expected answer** |

There is no known sub-linear-time algorithm for this problem in general, and none is expected — every value must be read at least once, so Ω(n) reads is a trivial information-theoretic lower bound (an unexamined house's value could change the answer), which O(n) matches.

---

## 7. Common Mistakes

1. **Greedy trap.** Picking the larger of every adjacent pair ("rob 7 over 2, then...") fails on `[2, 7, 9, 3, 1]`-style inputs where skipping a big house enables two medium ones. DP considers *all* skip/rob combinations.
2. **Adjacency defined wrong.** The constraint is on **indices**, not values. `[5, 5, 5]` → answer is 10 (houses 0 and 2), not something involving duplicate-value logic.
3. **`n == 1` crash.** A dp-array formulation with `dp[1] = max(dp[0], nums[1])` written unconditionally will index out of bounds when `n == 1`. The rolling-variable version sidesteps this.
4. **Confusing "must alternate".** You are **not** required to rob every other house. `[2, 1, 1, 2]` → answer is 4 (rob houses 0 and 3, skipping *two* houses in between). Forgetting the pure "skip" option — writing `dp[i] = max(nums[i] + dp[i-2], nums[i-1] + dp[i-3])`-style transitions that always rob someone — is wrong; the correct transition includes the plain `dp[i-1]` skip branch.
5. **Forgetting that skipping is cumulative.** The skip branch must be `dp[i-1]`, which itself may already encode multiple skipped houses — not just "skip exactly one house."
6. **Circular assumption.** House 0 and house n−1 are **not** adjacent in this problem. Don't add wraparound logic (that's House Robber II).

### Java / C++ gotchas (brief)

| Language | Gotcha |
|---|---|
| Java | If you memoize with `HashMap<Integer, Integer>`, prefer `int[] memo = new int[n + 1]` filled with `-1` — boxing and hashing add constant overhead, and `getOrDefault` chains are clunkier than an array. |
| Java | In the top-down version, if `solve` is a lambda or an inner recursive method, make the memo array a field or use an `int[]` captured by the lambda (mutable capture works; a captured `int` local would not). |
| C++ | `vector<int> memo(n + 1, -1)` — remember the size is `n + 1` because the recursion calls `solve(i + 2)` past the last index. |
| C++ | No overflow concern here (max total 40,000), but if you generalize to large values, `long long` avoids summation overflow — a habit worth mentioning proactively. |
| Python | `@lru_cache` on a closure works, but if the closure captures a mutable list by reference and the list is mutated between calls, the cache goes stale — here `nums` is read-only, so it's safe. |

---

## 8. Test Cases to Propose Out Loud

State these before or right after coding — it signals engineering maturity:

| Test | Input | Expected | What it checks |
|---|---|---|---|
| Example 1 | `[1, 2, 3, 1]` | 4 | Basic alternation |
| Example 2 | `[2, 7, 9, 3, 1]` | 12 | Skip-a-rich-house payoff |
| Single house | `[10]` | 10 | `n == 1`, no adjacency constraint to trigger |
| Two houses | `[10, 20]` | 20 | Adjacent — can only take one |
| All equal | `[5, 5, 5]` | 10 | Indices, not values, define adjacency |
| Skip two in a row | `[2, 1, 1, 2]` | 4 | Not forced to alternate every other house |
| Zeros | `[0, 0, 0]` | 0 | Non-negative floor; rob nothing is legal |
| Max size | `[400] * 100` | 20,000 | n = 100, even/odd pattern; confirms no overflow concern |

---

## 9. Transferable Patterns & Related Problems

**Pattern: "Choose/no-choose with local incompatibility" → linear DP with two states or two rolling values.** Whenever a decision at position `i` is constrained only by position `i−1` (or `i−2`), and the objective is additive, you get this exact recurrence shape.

**Generalizations to name in the interview:**
- *State extension:* House Robber II (circular street → run the same DP twice, once excluding the first house and once excluding the last).
- *Tree shape:* House Robber III (houses on a binary tree → tree DP returning a `(rob, skip)` pair per node).
- *Same skeleton, different constraint:* Delete and Earn / "Maximum sum of non-adjacent elements" (convert counts to a value-indexed array, then it *is* House Robber); Paint House (choose among colors with an adjacency-style incompatibility); Minimum Falling Path Sum.

**Related problems to drill:** House Robber II (LC 213), House Robber III (LC 337), Delete and Earn (LC 740), Climbing Stairs (same recurrence structure, min vs. max flipped), Maximum Subarray (different — contiguity instead of non-adjacency — but also a rolling-variable 1-D DP).

---

## 10. Say It in 60 Seconds

> "For each house I have two choices: rob it or skip it. If I rob house i, I can't touch house i+1, so the best total from house i onward is the house's value plus the best from house i+2; if I skip it, it's just the best from house i+1. That gives a recurrence — max of nums[i] plus solve(i+2), or solve(i+1) — and since only n distinct subproblems exist but naive recursion recomputes them exponentially, I memoize, or better, go bottom-up. The DP only ever needs the previous two answers, so I keep two rolling variables: for each house, new best equals max of the current best, and the best-from-two-back plus this house's value. One pass, O(n) time, O(1) space. Edge cases: a single house just returns its value, and since the recurrence starts from zeros, it handles that automatically. I verified it on the examples — [1,2,3,1] gives 4 and [2,7,9,3,1] gives 12 — and I'd note it's a linear street, so no wraparound; that's the House Robber II variant."
