# Target Sum (LeetCode 494) — Complete Interview Lesson

## 1. Problem Restated in Your Own Words

You must place a `+` or `-` sign in front of **every** element of `nums` (no skipping), forming a signed expression. Count how many **distinct sign assignments** evaluate to exactly `target`.

Two precisions worth stating out loud in an interview:

- **Order is fixed.** You cannot reorder elements; the only freedom is the sign choice per position.
- **"Different expressions" means different assignments of signs to *indices*, not different numeric strings.** In `[1,1,1]` with target `1`, the three answers correspond to which of the three *positions* gets the `-`. Even `+0` vs `-0` counts as two different expressions.

## 2. Decoding the Constraints

| Constraint | What it's telling you | Consequence |
|---|---|---|
| `n ≤ 20` | Deliberately tiny | `2^20 ≈ 1,048,576` brute-force leaves is *viable*; recursion depth is a non-issue |
| `0 ≤ nums[i] ≤ 1000` | **Zeros are allowed** | `+0` and `-0` are distinct expressions; a `k`-count of zeros multiplies the answer by `2^k` |
| `sum(nums) ≤ 1000` | The *value range* is tiny | Pseudo-polynomial DP over sums is essentially free: `O(n · S)` with `S ≤ 1000` |
| `-1000 ≤ target ≤ 1000` | Target can be negative and can exceed what's achievable | You need guards: if `\|target\| > S`, the answer is trivially 0 |

Reading `n ≤ 20` + `S ≤ 1000` together is the real hint: the intended solution is DP over sums, and brute force is an acceptable baseline to derive it from.

## 3. Brute Force: Enumerate All 2^n Signings

At each index, branch on `+` and `-`; at the leaf, check whether the running sum equals `target`.

```python
def findTargetSumWays(nums, target):
    n = len(nums)

    def dfs(i, acc):                     # acc = sum of nums[0..i-1] with signs applied
        if i == n:
            return 1 if acc == target else 0
        return dfs(i + 1, acc + nums[i]) + dfs(i + 1, acc - nums[i])

    return dfs(0, 0)
```

### Worked trace: `nums = [1,1,1]`, `target = 1` (all 8 leaves)

```
                        (i=0, s=0)
                +1 /              \ -1
          (1, +1)                    (1, -1)
         +1/   \-1                 +1/    \-1
     (2,+2)    (2,0)           (2,0)      (2,-2)
     +1/ \-1   +1/ \-1         +1/ \-1    +1/ \-1
  (3,3)(3,1)(3,1)(3,-1)    (3,1)(3,-1)(3,-1)(3,-3)
    0    ✓    ✓    0          ✓    0     0     0
```

Three leaves hit `1` (`++-`, `+-+`, `-++`) → answer **3**. Notice the node `(i=2, s=0)` appears **twice** with identical meaning — that duplication is exactly what memoization will exploit.

For the official example `[1,1,1,1,1], target=3` the same code explores `2^5 = 32` leaves and finds 5 hits; at `n = 20` it explores ~1M leaves, which still passes. That exponential lower bound is real, not pessimism: there are `2^n` distinct sign assignments and any single one can flip the count, so enumeration cannot do better in the worst case (smarter search can, though — see §10, meet-in-the-middle).

## 4. First Optimization: Memoize on (index, running sum)

The trace exposes the insight: **what matters at depth `i` is only the current running sum**, not which signs produced it. Define:

> `f(i, s)` = number of ways to sign `nums[i:]` so that the final total equals `target`, given running sum `s`.

Recurrence: `f(i, s) = f(i+1, s + nums[i]) + f(i+1, s - nums[i])`, base `f(n, s) = [s == target]`.

The state space collapses from `2^n` paths to at most `n × (2S + 1)` states, because after `i` elements the running sum can only be one of at most `2S+1` values in `[-S, S]`.

```python
from functools import lru_cache

def findTargetSumWays(nums, target):
    n = len(nums)

    @lru_cache(maxsize=None)
    def dfs(i, acc):
        if i == n:
            return 1 if acc == target else 0
        return dfs(i + 1, acc + nums[i]) + dfs(i + 1, acc - nums[i])

    return dfs(0, 0)
```

### Memo table trace on the official example: `nums = [1,1,1,1,1]`, `target = 3`

Columns are running sums `s` (values!), rows are positions `i` (indices). Only reachable states are shown; blank = never queried. `f(i,s) = f(i+1, s+1) + f(i+1, s-1)`.

| `i \ s` | `-2` | `-1` | `0` | `1` | `2` | `3` | `4` | `5` |
|---|---|---|---|---|---|---|---|---|
| `i=5` (base) | | | | | | **1** | | |
| `i=4` | | | | | 1 | | 1 | |
| `i=3` | | | | 1 | | **2** | | 1 |
| `i=2` | 0 | | 1 | | 3 | | | |
| `i=1` | | 1 | | **4** | | | | |
| `i=0` | | | **5** | | | | | |

Reading the answer off the table: `f(0,0) = f(1,1) + f(1,-1) = 4 + 1 = 5`. ✓

Interpretation (worth saying out loud): `f(1,1) = 4` means "after putting `+` on the first element, the remaining four `±1`s must net `+2`, i.e., 3 pluses and 1 minus → `C(4,1) = 4` ways." And `f(1,-1) = 1`: forced all-plus afterwards. **Note the asymmetry** — this only balances out when `target = 0`; don't prune assuming `f(s) = f(-s)`.

This memoized version is already an accepted `O(n·S)` solution. But there's a deeper insight one level down.

## 5. The Core Insight: This Is Subset Sum in Disguise

Let `P` = set of **indices** getting `+`, and `S = sum(nums)`. The signed total is:

```
sum(P) − sum(complement) = sum(P) − (S − sum(P)) = 2·sum(P) − S
```

Setting this equal to `target` and solving:

```
sum(P) = (S + target) / 2   ≡   T
```

This is a **bijection**: every valid expression corresponds to exactly one subset `P` with `sum(P) = T`, and vice versa (the signs are fully determined by `P`). So:

> **Count expressions evaluating to `target`  ⇔  count subsets of `nums` with sum `T = (S + target)/2`.**

**Feasibility guards** (check *before* allocating anything):

- `(S + target)` must be even, and `T ≥ 0`. Equivalently: return 0 if `abs(target) > S` or `(S + target) % 2 != 0`.

Note that `T ≤ S ≤ 1000` always, so the DP table is tiny. Also note zeros fit the bijection perfectly: a zero index contributes 0 to `sum(P)` whether it's in or out, so both choices are counted — exactly the `+0`/`-0` distinction.

## 6. Optimal Solution: 1-D Counting Knapsack

Standard **counting** 0/1 knapsack: `dp[s]` = number of subsets of the *processed* items whose values sum to `s`. Initialize `dp[0] = 1` (the empty subset — this is what makes "empty `P`", i.e., all-minus, count correctly).

```python
def findTargetSumWays(nums, target):
    S = sum(nums)
    if abs(target) > S or (S + target) % 2 != 0:
        return 0                          # unreachable or parity mismatch
    T = (S + target) // 2                 # 0 <= T <= S <= 1000, guaranteed even

    dp = [0] * (T + 1)
    dp[0] = 1                             # empty subset
    for num in nums:                      # outer loop: items, BY INDEX (never dedupe!)
        for s in range(T, num - 1, -1):   # inner loop: sums, strictly DESCENDING
            dp[s] += dp[s - num]
    return dp[T]
```

### Why the inner loop must be **descending**

In-place, we need `dp_new[s] = dp_old[s] + dp_old[s - num]`. Iterating `s` downward guarantees `dp[s - num]` (a smaller index) hasn't been updated yet this round, so it still holds the *previous* item's value. Iterating **ascending** would read a `dp[s - num]` that already includes the current item — effectively reusing it — turning this into an *unbounded* knapsack and overcounting. Concrete failure: `nums = [1,1,2]`, `target = 2` → `T = 3`, true answer `2` (each `1` paired with the `2`); the ascending loop returns `5`.

### Full DP trace on Example 1: `nums = [1,1,1,1,1]`, `target = 3`

`S = 5`, `T = (5+3)/2 = 4`. Table columns are **sums** `s = 0..4` (values), rows are **items** processed so far (indices 0..4, each with value 1).

| After item # | `dp[0]` | `dp[1]` | `dp[2]` | `dp[3]` | `dp[4]` |
|---|---|---|---|---|---|
| init | 1 | 0 | 0 | 0 | 0 |
| 1st `1` | 1 | 1 | 0 | 0 | 0 |
| 2nd `1` | 1 | 2 | 1 | 0 | 0 |
| 3rd `1` | 1 | 3 | 3 | 1 | 0 |
| 4th `1` | 1 | 4 | 6 | 4 | 1 |
| 5th `1` | 1 | 5 | 10 | 10 | **5** |

`dp[4] = 5` ✓. Bonus observation for the interview: since all items are identical 1s, row *k* is literally Pascal's triangle row *k* (`dp[s] = C(k, s)` = number of size-`s` index-subsets), and `C(5,4) = 5`. Sanity check via the transformation: need `#(+ ) − #(−) = 3` with 5 slots → 4 pluses, 1 minus → `C(5,1) = 5`.

### Example 2: `nums = [1]`, `target = 1`

`S = 1`, `T = 1`. `dp = [1, 0]`; after the single item, `dp[1] += dp[0] = 1`. Return `1`. ✓

### The zero trace: `nums = [0, 0, 1]`, `target = 1` (answer: 4)

`S = 1`, `T = 1`. `dp = [1, 0]`.

| After item | `dp[0]` | `dp[1]` | What happened |
|---|---|---|---|
| zero #1 | 2 | 0 | `dp[0] += dp[0]`: zero in the subset or not — 2 ways |
| zero #2 | 4 | 0 | doubles again → `2^2` |
| `1` | 4 | **4** | `dp[1] += dp[0] = 4` |

`dp[1] = 4` ✓ — the four expressions `+0+0+1`, `+0-0+1`, `-0+0+1`, `-0-0+1`. The DP handles zeros **automatically** because each array *index* is a separate take-or-skip item. This is why you must never compress `nums` into a value-count map without special-casing zeros.

## 7. Complexity

| Approach | Time | Space | Verdict |
|---|---|---|---|
| Brute-force DFS | `O(2^n)` — ~1M leaves at `n=20` | `O(n)` stack | Passes at these constraints; good baseline |
| Memoized DFS (`(i, s)` states) | `O(n · 2S)` ≤ `20 × 2001 ≈ 40k` states | `O(n · S)` | Accepted; the natural thing to derive live |
| **1-D subset-sum DP (recommended)** | `O(n · T)`, `T = (S+target)/2 ≤ 1000` → ≤ ~20k ops | `O(T + 1)` | Optimal here; cleanest to explain |

A note if asked to generalize: the underlying subset-sum problem is NP-complete, so for unbounded values no algorithm polynomial in `n` alone is expected — this DP is *pseudo-polynomial*, polynomial in `n` times the numeric magnitude `S`, which is the standard escape hatch for this problem class (the NP-completeness claim rests on a classical polynomial-time reduction, so a poly(`n`)-only algorithm would imply P = NP).

## 8. Common Mistakes (with the concrete wrong answer each produces)

1. **Skipping the guards.** If `S + target` is odd or negative, `T` is fractional or negative. In **Python this fails silently**: `dp[-1]` wraps around to the last element and returns a plausible-looking wrong number. In **C++/Java** it's worse: negative array size → `std::bad_alloc`/UB or `NegativeArraySizeException`. Always check `abs(target) <= S` and parity first.
2. **Ascending inner loop** → unbounded-knapsack overcounting (demo in §6: returns 5 instead of 2).
3. **Deduplicating equal values** (e.g., building a `Counter` of values first). Each *index* is a distinct item. `Counter` on `[1,1,1,1,1]`, target 3, would yield 1 way instead of the correct **5**.
4. **Special-casing zeros wrong.** If you do compress values, zeros need a `2^count` multiplier; the index-based DP above needs nothing special — don't "fix" what isn't broken.
5. **Forgetting `dp[0] = 1`.** Every count comes back 0. `dp[0]` must represent the empty subset (which is also the correct `P` for target `−S`).
6. **Assuming `f(s) = f(−s)` symmetry** to prune states. Only valid when `target = 0` (the official example's memo table in §4 is asymmetric: 4 vs 1).
7. **Confusing this with ordered counting** (the `Combination Sum IV` loop order). See the template table in §10 — sums-outer counts *sequences* and gives 4 instead of 3 on `[1,1,1]`.

### Language-specific gotchas

| Language | Gotcha |
|---|---|
| **Java** | Memo as `int[n][2*S+1]` filled with `-1` (0 is a *valid* count, so it can't be the "uncomputed" sentinel). A `HashMap` with boxed/encoded keys works but autoboxing + hashing is an order of magnitude slower than an offset-indexed array. |
| **C++** | Compute `T` only **after** the guards: `vector<int> dp(T+1)` with a negative `T` (possible when `target < -S` if you skip the check) is UB/crash. Also, integer division in C++/Java truncates toward zero, e.g. `(-3)/2 == -1` — the parity check makes this moot, which is another reason to do it first. |
| **Overflow (all languages)** | The answer is bounded by the number of sign assignments, `2^20 = 1,048,576`, so a 32-bit `int` is safe *given these constraints*; the Python sample needs no thought here (arbitrary precision). |

## 9. Test Cases to Propose Out Loud

State these before or right after coding — it signals you think about edges unprompted.

| Input | Expected | What it stress-tests |
|---|---|---|
| `[1,1,1,1,1]`, `3` | `5` | Official; the binomial/Pascal structure |
| `[1]`, `1` | `1` | Official; minimal size |
| `[1]`, `2` | `0` | Parity guard: `S + target = 3` is odd |
| `[1000]`, `-1000` | `1` | Negative target at the boundary; `T = 0` → empty plus-set (all minus); no negative-size table |
| `[0,0,1]`, `1` | `4` | Zeros double the count |
| `[0]`, `0` | `2` | `+0` and `-0` are **distinct expressions** |
| `[1,1,1,1,1]`, `5` | `1` | Only all-plus works (`T = S` boundary) |
| `[1,2,3,4,5]`, `3` | `3` | Mixed values; verify: `S=15`, `T=9`; subsets summing to 9: `{4,5}`, `{2,3,4}`, `{1,3,5}` |
| random `n=20` array vs brute force | — | Cross-check DP against the `2^n` oracle before declaring done |

## 10. Transferable Patterns & Related Problems

**Pattern 1 — "± assignment / split into two groups" → subset sum.** Any problem of the form "partition into two groups whose sums differ by `d`" converts to *count or search for a subset with sum `(S + d)/2`*, plus the same parity/reachability guards.

| Related problem | How it connects |
|---|---|
| LC 416 — Partition Equal Subset Sum | Same DP, feasibility (boolean) instead of counting |
| LC 1049 — Last Stone Weight II | Minimize `|signed sum|` — same transform, then minimize over achievable sums |
| LC 518 — Coin Change II | Unbounded counting knapsack — *ascending* sums loop; contrast with 494 |
| LC 377 — Combination Sum IV | Counts **ordered** sequences — sums-outer, items-inner loop; contrast with 494 |
| LC 2035 — Partition Array Into Two Arrays… | The meet-in-the-middle variant (see below) |

**Pattern 2 — the three counting-knapsack loop templates.** This contrast is a frequent interview probe:

| Problem | Item usage | Order matters? | Loop structure |
|---|---|---|---|
| Target Sum (494) | each item ≤ 1 | no (subsets of indices) | items outer, `s` **descending** |
| Coin Change II (518) | unlimited | no (multisets) | items outer, `s` **ascending** |
| Combination Sum IV (377) | unlimited | yes (sequences) | **`s` outer**, items inner |

Getting `[1,1,1]` to 3 (not 4) with the right loop order is the proof you know the difference.

**Pattern 3 — meet-in-the-middle follow-up.** If asked "what if `n ≤ 40` but values up to `10^9` (so sum-DP dies)?" — split the array in halves, enumerate all `2^{n/2}` sign patterns per half with their partial sums, store the right half's sums in a hash map keyed by sum with multiplicity, and for each left pattern add `count_right[target − left_sum]`. The `2^{n/2}` figure holds because each half has `n/2` independent sign choices, and every full assignment factors uniquely into one left × right pair — so total work is about `2^{n/2+1}`, i.e., ~2M map operations at `n = 40` instead of `2^40 ≈ 10^{12}`.

## 11. Interview Talk Track (Fuller Script)

> "Let me restate: every element gets exactly one of `+` or `-`, order is fixed, and I count distinct assignments whose total is `target`. First observation: since order is fixed, an expression is fully determined by *which indices* get `+` — so I'm really counting subsets of indices. Second observation, the key one: if `P` is the plus-set and `S` is the total sum, the signed total is `sum(P) − (S − sum(P)) = 2·sum(P) − S`. Setting that equal to `target`, the plus-set must have sum exactly `(S + target)/2`. So the problem is: count subsets with that sum — classic 0/1 counting knapsack. Guards first: if `|target| > S` or `S + target` is odd, return 0; note this also protects against a negative table size or Python's negative-index wraparound.
>
> My derivation path in real time would be: brute-force DFS is `2^n` — fine at `n = 20`; memoizing on `(index, running sum)` collapses it to at most `n × 2S` states, already accepted; then the algebra above gives a bottom-up 1-D solution. Implementation details that matter: `dp[0] = 1` for the empty subset; items outer, sums strictly descending so each element is used at most once — ascending silently becomes unbounded knapsack; and treat each index as its own item — never deduplicate equal values, because `[1,1,1,1,1]` with target 3 is `C(5,4) = 5` ways, not 1. Zeros need no special handling in the index-based DP: each zero doubles `dp[0]`, which is exactly `+0` vs `-0` being distinct expressions.
>
> Complexity: `O(n · T)` time with `T = (S + target)/2 ≤ 1000`, so ≤ ~20,000 operations; `O(T)` space. Tests I'd run: the two official cases, `[1], 2 → 0` for parity, `[0,0,1], 1 → 4` for zeros, `[1000], -1000 → 1` for a negative target where the plus-set is empty, and a random `n = 20` array cross-checked against brute force."

## 12. Say It in 60 Seconds

> "Every index gets a plus or minus and order is fixed — so an expression is really just the subset of indices that got `+`. Algebra: if `P` is that subset and `S` is the total, the signed total is `2·sum(P) − S`, so it equals target exactly when `sum(P) = (S + target)/2`. So I'm counting subsets with that sum — classic 0/1 counting knapsack. Guards first: if `|target| > S` or `S + target` is odd, return zero — that also prevents a negative table size or Python's negative-index wrap. Then: `dp[0] = 1` for the empty subset, loop items outer and sums strictly descending so each element is used once, `dp[s] += dp[s − num]`, and return `dp[T]`. That's `O(n·S)` time, `O(S)` space — about twenty thousand operations here. Before the algebra trick, memoizing DFS on index-and-running-sum is the same complexity. Two watch-outs: never dedupe equal values — five ones against target three is five ways, not one — and zeros double the count legitimately, since plus-zero and minus-zero are different expressions."
