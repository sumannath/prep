# Burst Balloons — Complete Interview Lesson

**LeetCode 312 · Hard · Tag: Dynamic Programming (Interval DP)**

---

## 1. Restating the Problem

You have `n` balloons in a row, balloon `i` painted with `nums[i]`. You burst them **one at a time, in an order you choose**. When you burst balloon `i`, you earn `nums[i-1] * nums[i] * nums[i+1]` coins, where the neighbors are its **current** neighbors in the (shrinking) row — after bursting, the two former neighbors become adjacent. Out-of-bounds neighbors count as a virtual balloon with value `1`. Maximize total coins.

**Key observations to state out loud:**

- The coins for bursting a balloon depend on *who is still standing next to it at that moment*, not on its original neighbors.
- Bursting a balloon *merges* its neighbors — so earlier choices change later payoffs. This is why greedy "pop the biggest" fails (see §4).
- We must choose an **ordering** — this screams "exponential search → DP."

---

## 2. Decoding the Constraints

| Constraint | What it tells us |
|---|---|
| `n ≤ 300` | An `O(n³)` algorithm is ~2.7×10⁷ operations — comfortably fast. `O(n²)` states with `O(n)` transition each is the target. Anything factorial is hopeless (300! is astronomically large). |
| `nums[i] ≤ 100`, `n ≤ 300` | Max possible answer: each burst earns at most `100·100·100 = 10⁶`, at most 300 bursts → **≤ 3×10⁸ < 2³¹−1 ≈ 2.15×10⁹**, so 32-bit integers are safe (relevant for Java/C++). Python doesn't care. |
| `nums[i] ≥ 0` | Zeros are allowed! Products can be **0**, so DP cell values can legitimately be 0 — this matters for memoization sentinels (§8). |
| Duplicates allowed | Values may repeat, but the DP operates on **indices**, not values — duplicates are a non-issue if you're careful. |

---

## 3. Brute Force: Enumerate Every Burst Order

The raw approach: try all `n!` permutations of which balloon to pop, simulate each, take the max. Cost is `n!` orders × `O(n)` simulation each = `O(n · n!)`.

```python
from itertools import permutations

def maxCoins_bruteforce(nums):
    def simulate(order):
        arr = list(nums)
        coins = 0
        for i in order:                    # i is an index into the ORIGINAL array
            coins += arr[i-1] * arr[i] * arr[i+1]  # need sentinel handling!
            arr.pop(i)
        return coins
    # (production code would pad arr; shown for intuition)
```

*(In real code you'd pad with virtual 1s or handle bounds — the point is the search shape, not this snippet.)*

**Worked trace on `nums = [3,1,5]`** (small enough to enumerate all 6 orders by hand):

| Burst order | Step-by-step coins | Total |
|---|---|---|
| 1 → 3 → 5 | `3·1·5=15`, then `1·3·5=15`, then `1·5·1=5` | **35** |
| 1 → 5 → 3 | `15`, then `3·5·1=15`, then `1·3·1=3` | 33 |
| 3 → 1 → 5 | `1·3·1=3`, then `1·1·5=5`, then `5` | 13 |
| 3 → 5 → 1 | `3`, then `5`, then `1` | 9 |
| 5 → 3 → 1 | `15`, then `3`, then `1` | 19 |
| 5 → 1 → 3 | `15`, then `3`, then `3` | 21 |

Best = **35**. Note how wildly the total swings (9 to 35) — order is everything.

Even `n = 20` gives 20! ≈ 2.4×10¹⁸ orders. We need structure.

---

## 4. Why Greedy Fails (Say This Proactively)

- "Pop the largest first": `[9, 1, 9]` — popping a 9 first yields 9 or 0 coins; popping the **1** first yields `9·1·9 = 81` and sets up the 9s. Greedy on value is wrong.
- "Pop the smallest first": same example refutes the opposite direction.
- Even a 0-valued balloon matters: `[9, 0, 9]` — the 0 contributes nothing itself, but you **must** burst it *first* so the two 9s become neighbors (`9·9 = 81` + `9` → 90). Popping a 9 first earns ≤ 9.

Conclusion to voice: *"Local decisions change the neighborhood for future decisions, so I need DP over subarrays — but I have to find the right subproblem."*

---

## 5. The Core Insight: Think About the **Last** Balloon, Not the First

### 5.1 Why "first" fails

Natural attempt: `dp[l][r]` = best coins from bursting balloons in window `[l..r]`, choosing the **first** one to pop. But after popping it, the window's neighbors *change* (the outer neighbors merge into the new boundary), so the subproblem `dp[l+1..r]` is **not** the same problem — its boundary values depend on history. Subproblems are entangled.

### 5.2 Why "last" works

Instead, pick which balloon in the window is burst **last**. Say it's balloon `k`, and the window's outer neighbors `l` and `r` (possibly virtual 1s) are still present.

- When `k` is burst last, everything in `(l, k)` and `(k, r)` is already gone. So at that moment `k`'s neighbors are **exactly** `l` and `r`, and the gain `nums[l]·nums[k]·nums[r]` is **fixed**, independent of the internal order.
- During the sub-window `(l, k)`'s own burst sequence, balloon `k` is still standing and acts as that sub-window's right neighbor — which is precisely the assumption `dp[l][k]` makes. Same for `dp[k][r]` with `l` as left neighbor.
- Therefore the two sub-windows are **completely independent**, and we can add their optimal values.

**"Last burst" is the classic fix for this class of ordering problems:** the last move's payoff is decoupled from the order of everything before it.

### 5.3 The padded array

To handle walls uniformly, pad: `nums' = [1] + nums + [1]`. Now define, on `nums'`:

> **`dp[l][r]`** = max coins from bursting **all** balloons strictly between indices `l` and `r` (exclusive), given that balloons `l` and `r` remain standing throughout as the fixed boundaries.

```
dp[l][r] = 0                                   if r - l <= 1   (nothing to burst)
dp[l][r] = max over k in (l, r) of:
             dp[l][k] + dp[k][r] + nums'[l] * nums'[k] * nums'[r]
```

Answer: `dp[0][n+1]` (the whole interior, bounded by the two virtual 1s).

---

## 6. Optimal Implementation

### 6.1 Top-down (memoized recursion) — easiest to write in an interview

```python
from functools import lru_cache
from typing import List

class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        a = [1] + nums + [1]          # padded array; a[0] and a[-1] are permanent walls

        @lru_cache(maxsize=None)
        def dp(l: int, r: int) -> int:
            if r - l <= 1:            # no balloon strictly between l and r
                return 0
            return max(
                dp(l, k) + dp(k, r) + a[l] * a[k] * a[r]
                for k in range(l + 1, r)
            )

        return dp(0, len(a) - 1)
```

Recursion depth is at most `n + 2 ≈ 302` — safe under Python's default 1000 limit.

### 6.2 Bottom-up (iterates by interval *length*)

```python
from typing import List

class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        a = [1] + nums + [1]
        n = len(a)
        dp = [[0] * n for _ in range(n)]     # dp[l][r], l < r

        for length in range(2, n):           # r - l = length; small windows first
            for l in range(0, n - length):
                r = l + length
                best = 0
                for k in range(l + 1, r):
                    gain = dp[l][k] + dp[k][r] + a[l] * a[k] * a[r]
                    if gain > best:
                        best = gain
                dp[l][r] = best
        return dp[0][n - 1]
```

**Order of iteration matters:** `dp[l][r]` depends on strictly shorter intervals (`dp[l][k]`, `dp[k][r]`), so the outer loop must be the gap `r − l`, increasing. Iterating `l` outermost would read uninitialized cells.

---

## 7. Traces on the Official Examples

### 7.1 `nums = [3,1,5,8]` → 167

Padded array `a = [1, 3, 1, 5, 8, 1]`, indices `0..5`. Upper triangle of `dp`:

| `l \ r` | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| **0** | 0 | 3 | 30 | 159 | **167** |
| **1** | | 0 | 15 | 135 | 159 |
| **2** | | | 0 | 40 | 48 |
| **3** | | | | 0 | 40 |
| **4** | | | | | 0 |

Sample cell computations:

- `dp[0][2] = 1·3·1 = 3` (only balloon 1 inside; walls 1 and 1).
- `dp[2][4] = 1·5·8 = 40`.
- `dp[1][4] = max( dp[1][2]+dp[2][4]+3·1·8 = 64 , dp[1][3]+dp[3][4]+3·5·8 = 135 ) = 135`.
- **Final:** `dp[0][5] = max( 0+159+1·3·1=162 , 3+48+1·1·1=52 , 30+40+1·5·1=75 , 159+0+1·8·1=**167** )` → **167** ✓

The argmax chain (`k=4`, then `k=1` in `[0,4]`, then `k=3` in `[1,4]`, then `k=2` in `[1,3]`) reconstructs the burst order **1 → 5 → 3 → 8**, earning exactly `15 + 120 + 24 + 8 = 167` — the same order as the problem's explanation.

### 7.2 `nums = [1,5]` → 10

Padded `a = [1, 1, 5, 1]`. `dp[0][3] = max( dp[0][1]+dp[1][3]+1·1·1 , dp[0][2]+dp[2][3]+1·5·1 )` `= max( 0+5+1 , 5+0+5 ) = 10` ✓. (Bursting `1` first gives `1·1·5=5` then `1·5·1=5`; bursting `5` first gives only `5+1=6`.)

---

## 8. Implementation Gotchas (Python / Java / C++)

| Language | Gotcha |
|---|---|
| **Python** | `lru_cache` on a closure capturing `a` is fine, but if you hand-roll memoization with `memo = {}`, don't use a **0-default list** as the "uncomputed" sentinel — legitimate DP values can be **0** when `nums` contains zeros. Use `-1` or a dict. |
| **Java** | `int` is provably sufficient (max total ≤ `300 · 100³ = 3×10⁸ < Integer.MAX_VALUE`), so no `long` needed here — but say the bound out loud. Use `int[][] memo` initialized to `-1`, **not** 0 (zero is a valid answer). Avoid `HashMap<Integer,Integer>` for memoization: autoboxing every `(l, r)` key is both slow and an easy equality/`get`-vs-`containsKey` bug source. |
| **C++** | `vector<vector<int>> dp(n, vector<int>(n, -1))` for memo (again: `-1`, not 0). In the bottom-up version, initialize with 0 and get the loop nesting right — outer loop = gap, then `l`, then `k`; a wrong nesting silently reads garbage. Bounds: `n+2` array size including both pads. |
| **All** | Recursion depth (top-down) is `O(n)` ≈ 302 — fine, but worth mentioning in Java/C++ too (no stack issue at this size). |

---

## 9. Test Cases to Propose Out Loud

State these before/while coding — interviewers reward it:

| Input | Expected | Why it matters |
|---|---|---|
| `[3,1,5,8]` | 167 | Official example 1; validates full pipeline. |
| `[1,5]` | 10 | Official example 2; order of two balloons matters (10 vs 6). |
| `[5]` | 5 | **n = 1**: both neighbors are virtual walls; checks padding. |
| `[0,0,0]` | 0 | Zeros → every DP value is 0; catches bad memo sentinels. |
| `[9,0,9]` | 90 | A "worthless" 0 must be popped **first** so the 9s become neighbors (`81 + 9`). Catches greedy intuition and boundary logic. |
| `[2,2,2]` | 14 | Duplicates + order dependence: pop middle first (`8 + 4 + 2 = 14` vs 10 for edge-first). |
| `[9,1,9]` | 171 | The "don't pop the big one first" trap (`81 + 81 + 9`). |

---

## 10. Common Mistakes

1. **DP on "first burst" instead of "last burst."** Subproblems become dependent on history and the recurrence is wrong. This is *the* conceptual trap of this problem.
2. **Including the boundary balloons `l` and `r` in the burst set.** They must survive — they're the fixed walls that make `nums[l]·nums[k]·nums[r]` well-defined. `dp` covers the **exclusive** open interval `(l, r)`.
3. **Forgetting the padding**, especially `n = 1` where both neighbors are virtual 1s.
4. **Wrong loop order in bottom-up** (iterating `l` before the gap) → reads cells for shorter intervals that don't exist yet.
5. **Memo sentinel = 0** when zeros in `nums` make 0 a legitimate computed value (Python dict/list default, Java `int[]` default).
6. **Greedy shortcuts** — popping max/min value or trying to "eliminate" 0s up front. All refuted by `[9,1,9]` and `[9,0,9]`.
7. **Index confusion** between original indices and padded indices — pad once at the top and never touch `nums` again.

---

## 11. Complexity

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (all orders) | `O(n · n!)` | `O(n)` | `n!` permutations × `O(n)` simulation each. Dead at n ≈ 12+. |
| Memoized interval DP | `O(n³)` | `O(n²)` + `O(n)` stack | `(n+2)²/2` intervals × `O(n)` split points. |
| **Bottom-up interval DP (target)** | **`O(n³)`** | **`O(n²)`** | For `n = 300`: ~2.7×10⁷ inner operations. |

`O(n³)` is the standard accepted complexity; the `O(n³)` count is immediate from the three nested loops (intervals × split points), and the DP is the intended solution, so no external bound needs citing.

---

## 12. Transferable Patterns & Related Problems

**Patterns to bank:**

1. **"Last move" reframing for interval DP** — when choosing the *first* move entangles subproblems, choose the *last* move instead; its payoff is usually order-independent, splitting the problem cleanly.
2. **Exclusive-boundary subproblem definition** — "burst everything *strictly between* two survivors" makes the boundary contribution fixed and the recursion closed.
3. **Padding with virtual sentinels** (`[1] + nums + [1]`) to eliminate edge-case branching.
4. **Interval DP iteration order** — always by increasing gap/length.

**Same skeleton, practice next:**

| Problem | Relation |
|---|---|
| LC 1039 · Minimum Score Triangulation of Polygon | Nearly identical recurrence: pick the "last triangle" at vertex `k`. |
| LC 546 · Remove Boxes | Interval DP + "last block" thinking, with an extra run-length dimension. |
| LC 664 · Strange Printer | Interval DP, split on the last printed stretch. |
| LC 1000 · Minimum Cost to Merge Stones | Merging-adjacent-elements interval DP (same "walls stay" idea). |
| LC 1547 · Minimum Cost to Cut a Stick | Identical exclusive-boundary DP on stick cut positions. |

---

## 13. Say It in 60 Seconds

> "Bursting a balloon changes its neighbors, so the coins I earn depend on the *order* — greedy fails, and trying all orders is factorial. The trick is to think about which balloon is burst **last** in a window, not first. If balloon `k` is last, then at that moment everything between the window's two boundary balloons is already gone, so `k`'s neighbors are exactly those boundaries — its payoff is fixed no matter what happened earlier. That splits the window into two independent sub-windows on its left and right.
>
> So I pad the array with 1s on both ends to handle the walls, and define `dp[l][r]` as the best coins from bursting everything strictly *between* positions `l` and `r`, with `l` and `r` kept as fixed walls. The recurrence: for each split `k` between them, take `dp[l][k] + dp[k][r]` plus `a[l]·a[k]·a[r]`, and maximize over `k`. Answer is `dp[0][n+1]` on the padded array.
>
> That's `n²` intervals times `n` split points — `O(n³)` time, `O(n²)` space, about 27 million operations for `n = 300`, which fits easily. I'd implement it bottom-up iterating by interval length, or top-down with memoization using a `-1` sentinel since answers can legitimately be zero when the input has zeros. Edge cases I'd check: a single balloon, all zeros, and `[9, 0, 9]` where you must pop the zero first so the nines become neighbors."

---

### One-line takeaway
**Reverse the order of thinking: decide the *last* balloon in each subarray, keep the boundaries as walls, pad with 1s — and a factorial ordering problem collapses into a clean `O(n³)` interval DP.**
