# Coin Change II — Counting Combinations (Unbounded Knapsack, Order-Free)

A complete interview-prep lesson: restatement, constraint decoding, brute force with a full trace, the core insight, the optimal DP with traces, complexity, pitfalls, language gotchas, tests, transfer patterns, and a recitable 60-second script.

---

## 1. Problem restatement (in your own words)

You have coin **denominations** `coins` (each usable **unlimited times**) and a target `amount`. Count the number of **multisets** of coins whose values sum to `amount`. A "combination" means **order does not matter**: `2+1+1+1` and `1+1+1+2` are the *same* combination and count once. If no combination exists, return `0`.

Three things to lock in before writing any code:

- **Combinations, not permutations.** This is the entire difficulty of the problem. The counting version of "order matters" is a *different LeetCode problem* (377, Combination Sum IV) with a different answer.
- **Unbounded supply.** Each denomination may be reused any number of times → this is the *unbounded* knapsack, not 0/1.
- **`amount = 0` is legal** (constraints allow `0 <= amount`). The empty combination sums to 0, so the answer is **1**, not 0. Say this out loud during clarification — it's a free correctness point.

---

## 2. Decoding the constraints

| Constraint | What it actually tells you |
|---|---|
| `1 <= coins.length <= 300` | Up to 300 coin *types*. DP over (coin index × amount) is at most 300 × 5001 ≈ **1.5M states** — a table DP is the intended scale. |
| `1 <= coins[i] <= 5000` | Coin values are positive (a **0-coin would make the count infinite** and would corrupt `dp[a] += dp[a - 0]`). Coins larger than `amount` are simply inert — the inner loop `range(c, amount+1)` is empty for them. |
| `0 <= amount <= 5000` | Amount fits an array index; `amount = 0` → answer 1 (empty combination). |
| All coin values **unique** | If the same denomination were listed twice, the coin-by-coin DP would **overcount** (each duplicate pass multiplies credit). Not an issue here, but dedupe with a set if an interviewer relaxes this. |
| Infinite supply of each coin | "Reuse a coin and **stay at the same index**" in recursion; "inner loop over amount runs **ascending**" in bottom-up DP. |
| Answer fits in **signed 32-bit int** | Plain `int` is fine — and moreover every *intermediate* `dp` value is ≤ the final answer, because each intermediate counts a *subset* of the final combination family (adding coin types only ever adds ways, never removes). So 32-bit accumulators never overflow mid-computation for this problem. |
| Scale (300 × 5000) | Exponential backtracking without memoization will TLE fast; `O(n·amount)` ≈ 1.5M operations is trivially fast even in Python. |

---

## 3. Brute force: enumerate combinations directly with DFS

### 3.1 The recursion

Process coin types **in a fixed order**. At state `(i, rem)` — `i` = index of the coin *type* we're currently allowed to use, `rem` = amount still needed — make two moves:

1. **Use `coins[i]`** and *stay* at `i` (supply is unlimited, so we may use it again),
2. **Skip** `coins[i]` forever and move to `i+1`.

```python
def change_bf(amount: int, coins: list[int]) -> int:
    n = len(coins)
    def dfs(i: int, rem: int) -> int:
        if rem == 0:
            return 1                      # a complete combination
        if i == n or rem < 0:
            return 0                      # out of coin types / overshot
        return dfs(i, rem - coins[i]) + dfs(i + 1, rem)  # use coins[i] again | done with it
    return dfs(0, amount)
```

**Why this never double-counts:** once you skip coin type `i`, you never return to it. So every multiset with counts `(k₀, k₁, …, k_{n−1})` is produced by *exactly one* root-to-leaf path: use coin 0 exactly `k₀` times, skip, use coin 1 exactly `k₁` times, skip, … There is a **bijection** between multisets and successful paths. This "fix an order, never go back" trick is the canonical way to turn permutation-enumeration into combination-enumeration (same idea as `start index` in Combination Sum backtracking).

### 3.2 Worked trace on Example 1 (`amount = 5`, `coins = [1, 2, 5]`)

```text
dfs(0, 5)
├── use 1 → dfs(0, 4)
│   ├── use 1 → dfs(0, 3)
│   │   ├── use 1 → dfs(0, 2)
│   │   │   ├── use 1 → dfs(0, 1)
│   │   │   │   ├── use 1 → dfs(0, 0)  ★ {1,1,1,1,1}
│   │   │   │   └── skip   → dfs(1, 1)  ✗ 0   (2 and 5 can't make 1)
│   │   │   └── skip   → dfs(1, 2)
│   │   │       ├── use 2 → dfs(1, 0)  ★ {1,1,1,2}
│   │   │       └── skip   → dfs(2, 2)  ✗ 0   (5 > 2)
│   │   └── skip   → dfs(1, 3)  ✗ 0           (2+2 overshoots next; 5 too big)
│   └── skip   → dfs(1, 4)
│       ├── use 2 → dfs(1, 2)
│       │   ├── use 2 → dfs(1, 0)  ★ {1,2,2}
│       │   └── skip   → dfs(2, 2)  ✗ 0
│       └── skip   → dfs(2, 4)  ✗ 0
└── skip 1 → dfs(1, 5)
    ├── use 2 → dfs(1, 3)  ✗ 0
    └── skip   → dfs(2, 5)
        ├── use 5 → dfs(2, 0)  ★ {5}
        └── skip   → dfs(3, 5)  ✗ 0            (out of coin types)

Total successful leaves: ★ + ★ + ★ + ★ = 4  ✓  (matches Example 1)
```

The four stars are exactly the four combinations in the problem statement.

### 3.3 Brute-force complexity

Every root-to-node path consists of some "use" steps (each reduces `rem` by ≥ 1, so at most `amount` of them) interleaved with some "skip" steps (at most `n` of them), and each step is binary — so the tree has at most `2^(amount + n)` nodes in the worst case. For `amount = 5000` that is astronomically large.

**Fix:** memoize on `(i, rem)`. Distinct states ≤ `(n+1) × (amount+1) ≈ 1.5M`, each computed once with `O(1)` work. That memo table *is* the DP table — the bottom-up version below is just the memoization filled inside-out.

---

## 4. The core insight: impose an order on coin types

### 4.1 One sentence version

> **Every combination is uniquely determined by *how many of each coin* it uses, so if we count coin types one at a time — "how many of coin 0, then coin 1, …" — no multiset is ever generated twice.**

Note you cannot count permutations and "divide by something": different multisets have different multiplicities, so the correction factor (`k₀!·k₁!·…`) varies per multiset. Ordering the enumeration is the fix, not arithmetic.

### 4.2 DP definition (be precise about indices vs values)

Let `dp[i][a]` = number of combinations to make amount `a` using **only the first `i` coin types** (`coins[0..i-1]`). Here `i` is a *count of coin types* (`0..n`) and `a` is an *amount value* (`0..amount`); `c = coins[i-1]` is a *value*. Keep these three straight — most bugs in this family are index/value or off-by-one bugs.

**Transition:** a combination making `a` from the first `i` types either

- uses **zero** copies of coin `i-1` → `dp[i-1][a]` ways, or
- uses **at least one** copy → remove one copy of `c` and you may still use `c` → `dp[i][a - c]` ways (requires `a ≥ c`).

```text
dp[i][a] = dp[i-1][a] + (dp[i][a - c] if a >= c else 0)
```

**Base cases:** `dp[i][0] = 1` for all `i` (the empty combination), `dp[0][a] = 0` for `a > 0` (no coins, positive amount). **Answer:** `dp[n][amount]`.

### 4.3 Loop order *is* the algorithm

Collapsing the 2D table to 1D works because row `i` only reads row `i-1` (same column) and row `i` (smaller columns). But **which loop is outer, and which direction the inner loop runs, changes what you count:**

| Loop structure | What it counts | Why |
|---|---|---|
| **coins outer, amount inner ascending** ✅ | **Combinations** (this problem) | When computing `dp[a]` during coin `c`'s pass, `dp[a-c]` was *already refreshed this pass*, so it may already contain `c` — adding one more `c` = reusing the coin. |
| amount outer, coins inner | **Permutations** (LC 377) | `dp[a]` sums over "what was my *last* coin," so `1+2` and `2+1` are counted separately. |
| coins outer, amount inner **descending** | **0/1 subsets** (each type used ≤ once) | `dp[a-c]` is read *before* being refreshed this pass, i.e., from a world without coin `c`. |

**Discriminating example** — `amount = 3`, `coins = [1, 2]`. True combinations: `{1,1,1}`, `{1,2}` → **2**. The amount-outer loop gives `dp[1]=1, dp[2]=2, dp[3]=dp[2]+dp[1]=3` — it counted the ordered sequence `{2,1}` too. Keep this tiny test in your head; it detects the #1 bug in this problem family in five seconds.

---

## 5. Optimal solution

### 5.1 Bottom-up 2D (clearest to explain)

```python
def change_2d(amount: int, coins: list[int]) -> int:
    n = len(coins)
    # dp[i][a]: ways to make amount a with coin types coins[0..i-1]
    dp = [[0] * (amount + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = 1                      # empty combination
    for i in range(1, n + 1):
        c = coins[i - 1]                  # c is a VALUE; i-1 is its index
        for a in range(1, amount + 1):
            dp[i][a] = dp[i - 1][a]                    # don't use coin i-1
            if a >= c:
                dp[i][a] += dp[i][a - c]               # use one more of coin i-1 (stay on row i)
    return dp[n][amount]
```

### 5.2 Space-optimized 1D — the primary solution

```python
def change(amount: int, coins: list[int]) -> int:
    dp = [0] * (amount + 1)     # NOTE: size amount+1, not amount
    dp[0] = 1                   # one way to make 0: the empty combination
    for c in coins:                                   # coin types OUTER
        for a in range(c, amount + 1):                # amount INNER, ASCENDING
            dp[a] += dp[a - c]
    return dp[amount]
```

Two things are load-bearing:
- `range(c, amount + 1)` — write `amount + 1`, or `dp[amount]` never gets its final update (Example 3 would wrongly return 0).
- **ascending** inner loop — this is what makes the coin reusable (see §4.3).

Coins larger than `amount` automatically do nothing (empty range); you don't need to filter, though `coins = [c for c in coins if c <= amount]` is a harmless micro-optimization. Sorting the coins is **not** required — any fixed order over types gives the same total.

### 5.3 Top-down memoized (alternative)

```python
from functools import lru_cache

def change_topdown(amount: int, coins: list[int]) -> int:
    n = len(coins)
    @lru_cache(maxsize=None)
    def dfs(i: int, rem: int) -> int:
        if rem == 0:
            return 1                      # MUST be checked BEFORE i == n
        if i == n or rem < 0:
            return 0
        return dfs(i, rem - coins[i]) + dfs(i + 1, rem)
    return dfs(0, amount)
```

⚠️ **Python-specific:** the "use coin 1 repeatedly" chain can go ~`amount` levels deep, so total depth ≈ `amount/min(coins) + n` up to **~5300**, exceeding CPython's default recursion limit (1000). Either `sys.setrecursionlimit(10**5)` or, better, submit the bottom-up version.

⚠️ **Semantic trap:** a top-down like `f(rem) = Σ_c f(rem - c)` (looping all coins inside) is the *permutation* counter. The index `i` in the state is what enforces combinations.

### 5.4 Traces on the official examples

**Example 1** — `amount = 5`, `coins = [1, 2, 5]`. Snapshot of the 1D array after each coin's pass (each entry is "ways to make `a` with coins so far"):

| After processing | dp[0] | dp[1] | dp[2] | dp[3] | dp[4] | dp[5] |
|---|---|---|---|---|---|---|
| init (no coins) | 1 | 0 | 0 | 0 | 0 | 0 |
| coin 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| coin 2 (a=2: +dp[0]; a=3: +dp[1]; a=4: +dp[2]=2; a=5: +dp[3]=2) | 1 | 1 | 2 | 2 | 3 | 3 |
| coin 5 (a=5: +dp[0]) | 1 | 1 | 2 | 2 | 3 | **4** ✓ |

Rows only grow — adding a coin type adds ways, never removes. Note `dp[4] = 3` after coin 2: `{1,1,1,1}`, `{1,1,2}`, `{2,2}` — sanity-checkable by hand.

**Example 2** — `amount = 3`, `coins = [2]`: init `[1,0,0,0]`; coin 2: `dp[2] += dp[0] = 1`, `dp[3] += dp[1] = 0` → final `[1,0,1,0]`, answer **0** ✓.

**Example 3** — `amount = 10`, `coins = [10]`: only `a = 10` updates: `dp[10] += dp[0] = 1` → **1** ✓.

**What would go wrong here:** running the inner loop *descending* on Example 1 yields `3` (it silently drops `{1,2,2}`), because each denomination would be usable at most once — 0/1-knapsack semantics.

### 5.5 Bonus follow-up: return one actual combination

With the 2D table you can walk back the choices (nice answer to "can you reconstruct a solution?"):

```python
def one_combination(amount, coins, dp):        # dp = the 2D table from §5.1
    out, i, a = [], len(coins), amount
    while a > 0:
        if dp[i - 1][a] == dp[i][a]:
            i -= 1                             # coin type i-1 not needed; drop it
        else:
            out.append(coins[i - 1])           # one copy belongs to some solution
            a -= coins[i - 1]                  # stay on the same type (unbounded)
    return out                                 # e.g. [5] for Example 1
```

---

## 6. Interview script — the fuller talk track

A step-by-step narration you can actually perform, phase by phase. (The §12 script below is the compressed version of this.)

> **Clarify:** "Just to lock the semantics: combinations, not permutations — `2+1+1+1` and `1+1+1+2` count once, right? Infinite supply of each denomination? And I assume `amount` can be 0 — then the answer is 1, the empty combination."

> **Brute force first:** "The direct way is a DFS over `(coin index, remaining)`. At each index I either take that coin and *stay* — since supply is unlimited — or skip it and never come back. The never-come-back rule is what stops double counting: every multiset has exactly one canonical ordering, so exactly one path in the tree produces it. On the example that tree finds the four ways, but it's exponential — roughly 2^(amount + n) paths in the worst case."

> **Insight:** "Memoizing `(index, remaining)` collapses it to n·amount states, and that memo table *is* a DP: `dp[i][a]` = number of combinations for `a` using only the first `i` coin types. Recurrence: skip coin `i`, or use one more copy of it and stay on the same row. The answer is `dp[n][amount]`."

> **Compress to code:** "Since row `i` only reads row `i−1` and earlier entries of row `i`, one array suffices: `dp[0] = 1`, coins in the outer loop, amounts in the inner loop ascending, `dp[a] += dp[a − coin]`. The ascending direction matters — `dp[a − coin]` has already been updated during this coin's pass, which is exactly what allows reusing the coin. If I flipped to amount-outer, coins-inner, I'd count ordered sequences — that's Combination Sum IV, a different answer."

> **Complexity:** "Time O(n·amount) — about 1.5 million updates at these limits — space O(amount). The problem guarantees a 32-bit answer; intermediates are safe too, because every intermediate value counts a subset of the final combinations."

> **Tests:** "Amount 0 → 1. `(3, [1,2])` → 2 — that one fails loudly if I've accidentally written the permutation version. The three official examples, plus a max-size stress run."

---

## 7. Complexity analysis

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Naive DFS | `O(2^(amount + n))` worst case | `O(amount + n)` stack | Bound derived in §3.3 (≤ `amount` use-steps + ≤ `n` skip-steps, binary each) |
| DFS + memoization | `O(n·amount)` | `O(n·amount)` memo + stack | ≤ `(n+1)(amount+1)` states, `O(1)` each |
| Bottom-up 2D | `O(n·amount)` | `O(n·amount)` | Clearest semantics; enables reconstruction (§5.5) |
| **Bottom-up 1D ★** | **`O(n·amount)`** | **`O(amount)`** | ≈ 1.5M inner iterations at `n=300, amount=5000`; runs in well under a second |

**If asked "can we beat `O(n·amount)`?"** — don't promise asymptotics you can't defend. The counting version of knapsack/subset-sum is #P-complete in general (a standard reduction from #SAT encodes each Boolean variable's true/false choice as including one of two complementary-weight items), which is why a pseudo-polynomial DP in the *numeric* amount — rather than the input's bit-length — is the expected "optimal" answer. (For a *fixed* tiny coin set the count is even a quasi-polynomial in the amount — classical denumerant theory — but that's never the interview answer.)

---

## 8. Common mistakes (and how interviewers probe them)

| # | Mistake | Symptom / concrete demo | Fix |
|---|---|---|---|
| 1 | **Amount-outer, coins-inner loop** | `amount=3, coins=[1,2]` returns **3** instead of 2 (counts `{1,2}` and `{2,1}`) | Coins outer. This is *the* bug of this problem — it silently produces a plausible-looking number. |
| 2 | **Inner loop descending** | `amount=5, coins=[1,2,5]` returns **3**, dropping `{1,2,2}` | Ascending = unbounded; descending = 0/1 (each type once). |
| 3 | **`dp[0]` not set to 1** | Everything returns 0; `amount=0` returns 0 instead of 1 | `dp[0] = 1`: the empty combination is one valid way. |
| 4 | **Array sized `amount`, not `amount + 1`** | Index error / last entry never updated | `dp` is indexed by amount values `0..amount` inclusive. |
| 5 | **`range(c, amount)` instead of `range(c, amount + 1)`** | Example 3 (`amount=10, coins=[10]`) returns **0** | Classic off-by-one; exactly why you run the official examples. |
| 6 | **Top-down base cases in wrong order** | `f(n, 0)` returns 0, losing the all-of-the-last-coin solutions | Check `rem == 0` *before* `i == n`. |
| 7 | **Confusing with Coin Change I (LC 322)** | Writing a `min` DP | There the loop order is irrelevant (min commutes); here it *defines* the answer. |
| 8 | **Duplicate denominations** (if constraints relaxed) | Listing a value twice inflates the count | Dedupe with `set(coins)` first. |
| 9 | **"Count permutations, then divide"** | No global correction exists | Correction factor varies per multiset (`k₀!·k₁!·…`); order the enumeration instead. |
| 10 | **Python recursion limit in top-down** | `RecursionError` at depth ~5300 | Bottom-up, or `sys.setrecursionlimit`. |
| 11 | **Forgetting `coins[i] ≥ 1` is load-bearing** | A 0-coin makes the true count infinite and `dp[a] += dp[a - 0]` just doubles nonsense | Flag it if an interviewer mutates the constraints. |

**Probe questions to expect:** "Swap the loops — what changes and why?" · "Why ascending?" · "What would make this 0/1?" · "How do you return one actual combination?" · "What if coins had duplicates?" Each maps to a row above — have the one-line answer ready.

---

## 9. Language gotchas (Python, Java, C++)

| Language | Gotcha | Detail |
|---|---|---|
| Python | Recursion depth | Top-down needs ~`amount/min(coin) + n` ≈ 5300 frames > default 1000. Prefer bottom-up. |
| Python | `@lru_cache` keying | Cache key must include **both** `i` and `rem`; a nested helper reused across calls should get `cache_clear()`. |
| Java | Overflow | `int` is safe here **only** because intermediates ≤ the final answer (each intermediate counts a subset of the final combinations). Generalize without that guarantee → use `long`; and even `long` can overflow (partitions of 5000 exceed 2⁶³) → `BigInteger`. |
| Java | Autoboxing in memoized DFS | `HashMap<Integer, Integer>` boxes on every lookup — a big constant in a 1.5M-state hot path. Use `int[n + 1][amount + 1] memo` (init to `-1`), or a flat key `i * (amount + 1) + rem`. |
| Java | Deep recursion | Same depth concern as Python; bottom-up avoids stack issues entirely. |
| C++ | Signed loop / vector init | `vector<int> dp(amount + 1, 0); for (int a = c; a <= amount; ++a) dp[a] += dp[a - c];` — keep loop vars `int` (don't mix in `size_t`), and pass `const vector<int>& coins` into any DFS to avoid per-call copies. |
| C++ | Overflow | Same rule as Java: `int` OK under this problem's guarantee; `long long` if generalizing. |

---

## 10. Test cases to propose out loud

Propose **before coding** (they define semantics), run **after coding** (they catch the classic bugs).

| # | Input | Expected | What it validates |
|---|---|---|---|
| 1 | `amount=5, coins=[1,2,5]` | `4` | Official example; mixed denominations |
| 2 | `amount=3, coins=[2]` | `0` | Impossible amount |
| 3 | `amount=10, coins=[10]` | `1` | Single exact coin (catches `range(c, amount)` off-by-one → would return 0) |
| 4 | `amount=0, coins=[1,2,5]` | `1` | Empty combination; `dp[0]=1` base case |
| 5 | `amount=3, coins=[1,2]` | `2` | **The permutation trap** — a loop-order bug returns 3 |
| 6 | `amount=2, coins=[5]` | `0` | Amount smaller than min coin; inert coins > amount |
| 7 | `amount=5000, coins=[1,2,5]` | `1,252,001` | Upper-bound stress: performance + the int-fit reasoning |

For #7, the expected value comes from the closed sum `Σ_{c=0}^{1000} (⌊(5000−5c)/2⌋ + 1) = 626,751 + 625,250 = 1,252,001` — worth stating to show you can independently verify a DP. Also mention a property check: for small random inputs (`amount ≤ 30`), assert the 1D DP equals the brute-force DFS count — that cross-validation catches loop-order bugs mechanically.

---

## 11. Transferable patterns and related problems

**The counting-knapsack template — three dials:**

```python
dp = [0] * (capacity + 1)
dp[0] = 1
for item in items:                          # DIAL 1: items outer → order-insensitive (combinations)
    for x in range(item, capacity + 1):     # DIAL 2: ascending → item reusable (unbounded)
        dp[x] += dp[x - item]               # DIAL 3: aggregate (+count / min / max)
```

| Question type | Outer loop | Inner direction | Counts |
|---|---|---|---|
| # combinations, unbounded | items | ascending | multisets |
| # permutations, unbounded | target | ascending | ordered sequences |
| # subsets, 0/1 | items | **descending** | subsets |
| min/max cost, either knapsack | either | either | extremum commutes, so loop order is free — but *counting* has no such freedom |

**Canonical-order dedup, beyond DP:** "fix an order, never revisit" also powers Combination Sum's `start` index, and Subsets II / Combination Sum II's "skip duplicates at the same tree depth." Recognizing *when enumeration must be order-free* is the transferable skill.

**Directly related problems:**

| Problem | Relationship |
|---|---|
| LC 322 — Coin Change | Min-coin version of the same unbounded recurrence (use `min` instead of `+`); loop order agnostic |
| LC 377 — Combination Sum IV | The permutation twin: amount-outer, coins-inner. Know both cold — interviewers love asking the pair |
| LC 39 — Combination Sum | Enumerate all combinations via backtracking with a start index |
| LC 416 — Partition Equal Subset Sum | 0/1 feasibility: same frame, inner loop descending |
| LC 494 — Target Sum | 0/1 *counting* with a shifted capacity axis |
| LC 279 — Perfect Squares | Unbounded min-coin where "coins" are squares |
| LC 1155 — Number of Dice Rolls With Target Sum | Bounded multiplicity (each die used once), grouped counting |

---

## 12. Say it in 60 seconds

> "This is unbounded-knapsack **counting**, and the key word is *combinations* — order doesn't matter — so I'll process coin types one at a time. Brute force: DFS on `(coin index, remaining)`; at each index either take the coin and *stay*, since it's reusable, or skip it forever. Never going back means every multiset is built in exactly one canonical order, so nothing double-counts. That's exponential, so I memoize `(index, remaining)` — n·amount states — and flip it bottom-up into one array: `dp[0] = 1`, coins outer, amount inner **ascending**, `dp[a] += dp[a − coin]`. Ascending is load-bearing: `dp[a − coin]` is already updated this pass, which is what lets the coin repeat. If I looped amount outer, I'd count ordered sequences — that's Combination Sum IV, a different answer. Time O(n·amount), about 1.5 million steps at these limits; space O(amount). Tests: `amount = 0` returns 1 — the empty combination — and `(3, [1,2])` returns 2, which fails loudly if I've accidentally counted permutations."
