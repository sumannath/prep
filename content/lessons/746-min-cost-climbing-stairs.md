# Min Cost Climbing Stairs — Complete Interview Lesson

**LeetCode 746 · Easy · Dynamic Programming (1-D)**

---

## 1. Restating the Problem (What's Actually Being Asked)

You're given `cost`, an array where `cost[i]` is the price you pay to *use* step `i`. The rules:

- Standing on step `i`, you pay `cost[i]`, **then** you may climb to `i+1` or `i+2`.
- You may begin at step `0` or step `1` **for free** — you only pay the cost of a step when you step on it and move off it.
- The "top" is the position at index `n` (where `n = len(cost)`), i.e., **just past the last step**. The last step itself has a cost you might have to pay.

Return the minimum total cost to get to the top.

Two modeling decisions trip people up immediately, so nail them in your restatement:

1. **You pay to leave a step, not to arrive at one.** (Equivalently: you pay for every step you *stand on*. Pick one phrasing and stay consistent — mixing them is the #1 source of off-by-one bugs.)
2. **The top is not a step.** `cost` has no entry for the top; the answer is `min(cost to reach step n-1 and leave it, cost to reach step n-2 and jump over the last step)`.

---

## 2. Constraint Decoding

| Constraint | Meaning for your solution |
|---|---|
| `2 <= cost.length <= 1000` | Tiny `n`. An O(n²) DP would pass; O(2^n) brute force would **not** (2^1000 ≈ 10^301 calls — astronomically infeasible). O(n) is the target. |
| `0 <= cost[i] <= 999` | Costs can be **0** — a free step is legal. Also, worst-case answer ≤ 999 × 1000 ≈ 10^6, which fits comfortably in a 32-bit `int` — no overflow concerns for this problem, but worth saying out loud. |
| `n >= 2` | You never have a single-step input, but you *do* have to handle "just start at whichever of steps 0/1 is cheaper." |

Interview takeaway: constraints this small mean correctness matters far more than micro-optimization — but you should still present the O(n) time / O(1) space solution, because it's barely harder than the O(n) space version and it signals DP fluency.

---

## 3. Brute Force: Recursion (with a Worked Trace)

**Idea (suffix view):** Let `f(i)` = minimum cost to get from step `i` to the top, *assuming you are standing on step `i` and will pay `cost[i]`*. Then:

```
f(i) = cost[i] + min(f(i+1), f(i+2))
f(n) = 0        # standing on the top costs nothing
f(n+1) = 0      # jumping from n-1 lands directly on top
answer = min(f(0), f(1))   # you may start at either step for free
```

### Worked trace on `cost = [10, 15, 20]` (n = 3)

```
f(0) = 10 + min(f(1), f(2))
f(1) = 15 + min(f(2), f(3)) = 15 + min(20+0, 0) = 15 + 0 = 15
f(2) = 20 + min(f(3), f(4)) = 20 + min(0, 0) = 20
f(0) = 10 + min(15, 20) = 25
answer = min(f(0), f(1)) = min(25, 15) = 15  ✓
```

Call tree (showing the explosion):

```
                     f(0)
                    /     \
                f(1)       f(2)
               /    \          \
           f(2)     f(3)       f(3)
```

`f(2)` is computed twice. With `n = 1000`, the call count follows a Fibonacci-style recurrence (`T(n) = T(n-1) + T(n-2)`), giving ~φⁿ growth — exponential, completely infeasible.

### Python — brute force

```python
def minCostClimbingStairs_bruteforce(cost):
    n = len(cost)
    def f(i):
        if i >= n:          # standing at or past the top
            return 0
        return cost[i] + min(f(i + 1), f(i + 2))
    return min(f(0), f(1))
```

**Complexity:** O(2ⁿ) time (each call spawns two calls; total calls grow like the Fibonacci sequence), O(n) stack space. State this, then immediately say: *"f(2) was computed twice — memoize it."*

### Memoized version (the middle step you should narrate)

```python
def minCostClimbingStairs_memo(cost):
    n = len(cost)
    from functools import lru_cache

    @lru_cache(maxsize=None)
    def f(i):
        if i >= n:
            return 0
        return cost[i] + min(f(i + 1), f(i + 2))

    return min(f(0), f(1))
```

O(n) time, O(n) space. This is a perfectly acceptable interview answer; the next section shows why we can do better.

---

## 4. The Core Insight

Reframe from *suffix* ("cost from step `i` onward") to **prefix** ("minimum cost to *arrive at* step `i`"):

> **`dp[i]` = the minimum total cost paid to be standing on step `i`, before paying `cost[i]`.**

Three things make this formulation the clean one:

1. **The free start falls out naturally:** `dp[0] = dp[1] = 0` — you can arrive at step 0 or step 1 without paying anything.
2. **The top is just `dp[n]`** — no special-casing the last index.
3. **The recurrence is a straight walk left-to-right:** to arrive at step `i`, you came from step `i-1` (paid `cost[i-1]`, climbed 1) or step `i-2` (paid `cost[i-2]`, climbed 2):

```
dp[i] = min(dp[i-1] + cost[i-1],  dp[i-2] + cost[i-2])   for i in 2..n
dp[0] = dp[1] = 0
answer = dp[n]
```

And because `dp[i]` depends only on the previous two values, you can keep **two rolling variables** instead of an array → O(1) space.

**Why greedy fails (say this proactively — it's a classic trap):** "Always jump to the cheaper of the next two steps" is not optimal, because a cheap step now can strand you in expensive territory. Counterexample: `cost = [1, 2, 3, 4]`. Greedy pays 1 → 2 → 3 = **6** (it walks 0→1→2→top). The optimum is 0→2→top, paying `1 + 3 =` **4**. DP is required.

---

## 5. Optimal Approach: Bottom-Up DP with O(1) Space

### Python — two-pointer rolling version

```python
def minCostClimbingStairs(cost):
    # dp[i] = min cost to ARRIVE at step i (before paying cost[i])
    # prev2 = dp[i-2], prev1 = dp[i-1]
    prev2, prev1 = 0, 0            # dp[0] = dp[1] = 0 (free start)
    for i in range(2, len(cost) + 1):
        cur = min(prev1 + cost[i - 1], prev2 + cost[i - 2])
        prev2, prev1 = prev1, cur
    return prev1                    # dp[n]
```

If you prefer the explicit array first (easier to explain, then optimize):

```python
def minCostClimbingStairs_array(cost):
    n = len(cost)
    dp = [0] * (n + 1)              # dp[0] = dp[1] = 0
    for i in range(2, n + 1):
        dp[i] = min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2])
    return dp[n]
```

### Trace — Example 1: `cost = [10, 15, 20]`, n = 3

| i | dp[i-2] | dp[i-1] | via step i-2 (`+cost[i-2]`) | via step i-1 (`+cost[i-1]`) | dp[i] |
|---|---|---|---|---|---|
| 2 | 0 | 0 | 0 + 10 = 10 | 0 + 15 = 15 | **10** |
| 3 | 0 | 10 | 0 + 15 = 15 | 10 + 20 = 30 | **15** |

Answer: `dp[3] = 15` ✓ (path: start at step 1 free, pay 15, jump two to the top).

### Trace — Example 2: `cost = [1,100,1,1,1,100,1,1,100,1]`, n = 10

| i | via step i-2 | via step i-1 | dp[i] |
|---|---|---|---|
| 2 | 0 + 1 = 1 | 0 + 100 = 100 | **1** |
| 3 | 0 + 100 = 100 | 1 + 1 = 2 | **2** |
| 4 | 1 + 1 = 2 | 2 + 1 = 3 | **2** |
| 5 | 2 + 1 = 3 | 2 + 1 = 3 | **3** |
| 6 | 2 + 1 = 3 | 3 + 100 = 103 | **3** |
| 7 | 3 + 100 = 103 | 3 + 1 = 4 | **4** |
| 8 | 3 + 1 = 4 | 4 + 1 = 5 | **4** |
| 9 | 4 + 100 = 104 | 4 + 1 = 5 | **5** |
| 10 | 4 + 100 = 104 | 5 + 1 = 6 | **6** |

Answer: `dp[10] = 6` ✓ — and the DP path (always arriving via the cheaper predecessor) exactly reproduces the jump pattern in the problem statement (0→2→4→6→7→9→top).

### Implementation gotchas (Java / C++)

| Language | Gotcha |
|---|---|
| **Java** | Use `int` (max answer ≈ 10⁶, safe) — but if a variant scales `cost[i]` or `n`, switch to `long` before the multiply-add. Also: don't allocate `new int[n]` and forget that `dp[1]` must be 0 explicitly; Java zero-initializes arrays so `[0]*(n+1)` semantics carry over for free, but be explicit in a comment. |
| **C++** | If you write the memoized *recursive* version with a `vector<int>` memo, initialize entries to `-1` and check for it — an uninitialized `vector` (or `int memo[]`) contains garbage that can silently look like a valid answer. Use `vector<long long>` if constraints ever grow. |
| **Python** | No gotchas of consequence — no overflow, no autoboxing. Just avoid the recursive `lru_cache` version on adversarial inputs if recursion depth matters (here `n ≤ 1000`, well under Python's default limit, so it's fine — say so). |

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Pure recursion | O(2ⁿ) — call count grows like the Fibonacci recurrence `T(n) = T(n-1) + T(n-2)`, i.e., ~φⁿ | O(n) stack | Never finishes for n = 1000 |
| Recursion + memo | O(n) | O(n) + O(n) stack | Clean, but recursion overhead |
| Bottom-up DP array | O(n) | O(n) | Easiest to trace / debug |
| **Rolling two variables** | **O(n)** | **O(1)** | **Recommended final answer** |

For n ≤ 1000, O(n) does at most ~1000 iterations regardless of input values — effectively instantaneous.

---

## 7. Common Mistakes

1. **Returning `dp[n-1]` instead of `dp[n]`.** The top is *past* the last step. From step `n-2` you can jump two and skip `cost[n-1]` entirely. In `[10,15,20]`, `dp[2] = 10` is a trap — the answer is `dp[3] = 15`.
2. **Forgetting the free start.** Setting `dp[0] = cost[0]` double-charges; you never pay to *be* at the start, only to leave it.
3. **Paying on arrival vs. on departure, inconsistently.** Both models work; mixing them within one solution does not. E.g., arrival-based (`dp[i]` = cost to stand on `i`, having paid everything before) vs. suffix-based (`f(i) = cost[i] + ...`). Pick one, state it, stick to it.
4. **Greedy.** As shown in §4, "jump to the cheaper next step" fails on `[1,2,3,4]` (greedy 6 vs. optimal 4). Mentioning this unprompted earns credit.
5. **Off-by-one in the rolling version.** `cur` uses `cost[i-1]` and `cost[i-2]` because the *array index of the DP* is one ahead of the *array index of the cost*. Loop must run `i` from 2 to `n` **inclusive** (`range(2, len(cost) + 1)` in Python).
6. **Overwriting rolling variables in the wrong order.** Must compute `cur` first, then shift: `prev2, prev1 = prev1, cur`. Doing `prev1 = cur` before `prev2 = prev1` destroys the value you need.

---

## 8. Test Cases to Propose Out Loud

Before coding, walk through these; after coding, verify the code against them:

| Test | Input | Expected | Why it matters |
|---|---|---|---|
| Official 1 | `[10,15,20]` | 15 | Start at index 1, jump two to top. Catches the "must pay `cost[n-1]`" bug. |
| Official 2 | `[1,100,1,1,1,100,1,1,100,1]` | 6 | Many steps, mixed one/two climbs; catches greedy-shaped thinking. |
| Minimum size | `[10, 20]` | 10 | n = 2: the answer is just `min(cost[0], cost[1])` — start at the cheaper step, jump straight to the top. Catches loop-boundary bugs. |
| Zero costs | `[0, 0, 0, 0]` | 0 | Legal free steps; ensures no negative/None handling breaks. |
| Cheaper to jump over last step | `[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]` variant: `[2, 1000, 1]` | 3 | Optimal path pays `cost[0] = 2`, jumps to step 2, pays 1, jumps to top — **never paying the expensive middle step**. Confirms you model two-step jumps correctly. |

---

## 9. Transferable Patterns & Related Problems

This problem is the canonical introduction to **1-D minimum-path DP with O(1) space rolling state**. The reusable skeleton:

- **Define a prefix DP** ("min cost to *reach* state `i`"), anchor base cases that encode the free/initial state, derive a recurrence from the last 1–2 decisions, and keep only the last `k` values if the recurrence window is width `k`.
- **Free choice of starting state** → multiple base cases set to 0 (here: `dp[0] = dp[1] = 0`). The same trick appears in "start anywhere" problems.
- **"Pay to move" vs. "pay to arrive"** modeling recurs constantly in grid and graph problems.

Directly related problems (do them in this order):

| Problem | Relationship |
|---|---|
| LC 70 — Climbing Stairs | Same staircase, count paths instead of min cost. The count version is `dp[i] = dp[i-1] + dp[i-2]`; identical rolling-variable structure. |
| LC 198 — House Robber | Same "decide at each index, window of 2 recurrence, O(1) space" — but the decision is *skip or take*, a great follow-up to practice. |
| LC 91 — Decode Ways | 1-D DP with a two-value window and careful zero handling (analogous to our `cost[i] = 0` steps). |
| LC 64 — Minimum Path Sum | Lifts the same idea to a 2-D grid; `dp[i][j] = grid[i][j] + min(top, left)`. |
| LC 746 variants (e.g., allow k-step jumps) | Generalizes the recurrence to `min(dp[i-k..i-1] + cost)` — practice with a deque/sliding-window-minimum if asked for better than O(nk). |

---

## 10. Say It in 60 Seconds

> "This is a 1-D dynamic programming problem. The key modeling insight: the top is *past* the last step, and you can start at step 0 or 1 for free — you only pay for a step when you stand on it and move off.
>
> Naive recursion from each start is exponential, so I define `dp[i]` as the minimum cost to *arrive* at step `i`. Base case: `dp[0]` and `dp[1]` are both zero, because starting is free. To arrive at step `i`, I came either from `i-1` paying `cost[i-1]`, or from `i-2` paying `cost[i-2]` — so `dp[i]` is the min of those two options. The answer is `dp[n]`, the cost to reach the top.
>
> I'd note that a greedy — always hopping to the cheaper next step — fails, for example on `[1, 2, 3, 4]`, where greedy pays 6 but the optimum is 4 by jumping straight over the middle steps.
>
> Since the recurrence only needs the previous two values, I keep two rolling variables: O(n) time, O(1) space, single pass. Edge cases: n equals two — answer is the cheaper of the two costs; and zero-cost steps are legal, so no special handling needed. Let me code the rolling version and trace it on the examples."
