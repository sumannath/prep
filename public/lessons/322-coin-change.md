# Coin Change (LeetCode 322) — Complete Interview Lesson

| At a glance | |
|---|---|
| **Pattern** | Unbounded knapsack — minimum-count DP over amount values |
| **Optimal time** | O(n · amount), n = `coins.length` ≤ 12, amount ≤ 10⁴ → ≈ 1.2 × 10⁵ steps |
| **Optimal space** | O(amount) — one 1‑D array of `amount + 1` ints |
| **Key traps** | Greedy fails; accidentally writing the 0/1 (descending) loop; Python negative indexing; `INT_MAX + 1` overflow in Java/C++ |

---

## 1. Problem, restated

Given up to 12 coin denominations (values, possibly duplicated, each ≥ 1) and a target `amount ≥ 0`, find the **minimum number of coins** (unlimited supply of each denomination, order irrelevant) whose values sum to **exactly** `amount`. Return `-1` if impossible.

Before coding, say your clarifying assumptions out loud:

- **Unlimited supply** of each denomination (the statement guarantees it) → this is *unbounded* knapsack, not 0/1.
- **Order doesn't matter**: `[1,2]` and `[2,1]` are the same handful of coins; we count coins, not sequences.
- **Duplicates in `coins`** (e.g., `[1,1,2]`) are harmless — the minimum is idempotent to repeats.
- `amount = 0` is valid and the answer is `0` (zero coins).
- Return the **count**, not the coins themselves (reconstruction is a classic follow-up — see §5.4).

A precision point that prevents bugs later: in this problem the DP is **indexed by amount value**, not by coin index. There is no "which coin am I allowed to use" dimension, because supply is infinite and coins can be taken in any order. The only state that matters is *how much value remains to make*.

---

## 2. Decoding the constraints

| Constraint | What it really says | How it shapes the solution |
|---|---|---|
| `1 <= coins.length <= 12` | Very few denominations | Inner loop over coins is trivially cheap. Branching factor is small (≤ 12) but recursion *depth* can be ~`amount` — plain recursion explodes (§3); DP doesn't care. |
| `1 <= coins[i] <= 2^31 - 1` | No zero or negative coins; a coin can be astronomically larger than `amount` | (a) Any real answer uses at most `amount` coins, since every coin ≥ 1 — this makes `amount + 1` a safe "impossible" sentinel. (b) Guard `c <= a`; (c) beware integer overflow if you ever compute `a + c` in Java/C++. |
| `0 <= amount <= 10^4` | Small numeric target | O(n · amount) ≈ 10⁵ ops — instant. Note this is a *pseudo-polynomial* DP: its cost scales with the numeric value of `amount` (not its bit-length), which is exactly why the tiny bound on `amount` matters. |
| `amount = 0` possible | Base case is exercised by tests | `dp[0] = 0`; the main loop range is empty; return 0. |
| "Infinite number of each coin" | Unbounded supply | When iterating amounts ascending, `dp[a - c]` may already reflect the same coin — that reuse is *correct* here (§5). |

Also internalize what the constraints *rule out*: no `0`-coins (which would make "fewest coins" degenerate) and no negative coins (a different problem entirely).

---

## 3. Brute force — and why it explodes

Define `f(a)` = fewest coins to make amount `a`:

```
f(0) = 0
f(a) = 1 + min{ f(a - c)  :  c in coins, c <= a }     for a >= 1
```

(With the guard `c <= a`, negative remainders never occur.) This is correct by exhaustive search over the *last* coin taken — but it recomputes the same subproblems exponentially many times.

**Worked trace** for `coins = [1,2,5]`, `amount = 3`:

```text
f(3)                                = 1 + min(f(2), f(1))     [coin 5 > 3 → skipped]
├─ take 1 → f(2)                    = 1 + min(f(1), f(0))
│  ├─ take 1 → f(1)                 = 1 + f(0)                [2 > 1]
│  │  └─ take 1 → f(0) = 0          ⇒ f(1) = 1
│  └─ take 2 → f(0) = 0             ⇒ f(2) = 1
└─ take 2 → f(1) = 1                ← f(1) computed AGAIN already, at this tiny size
⇒ f(3) = 1 + min(1, 1) = 2          (3 = 1+2 → two coins)
```

Already at `amount = 3`, `f(1)` is evaluated twice. It gets much worse: count the calls for the **official Example 1** (`coins = [1,2,5]`, `amount = 11`):

```python
def count_calls(coins, amount):
    calls = 0
    def best(rem):
        nonlocal calls
        calls += 1
        if rem == 0:
            return 0
        options = [best(rem - c) for c in coins if c <= rem]
        return 1 + min(options) if options else float('inf')
    best(amount)
    return calls

# count_calls([1,2,5], n) for n = 1..11:
```

| amount | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| recursive calls | 2 | 4 | 7 | 12 | 21 | 36 | 62 | 106 | 181 | 309 | **527** |
| DP candidate checks (for comparison) | ≤3 | ≤6 | ≤9 | ≤12 | ≤15 | ≤18 | ≤21 | ≤24 | ≤27 | ≤30 | **≈33** |

The growth ratio settles around **1.71× per unit of amount** — that exponential behavior is exactly what you'd expect, since each call spawns up to `n` subcalls and each edge shrinks the remainder by at least the smallest coin, so the recursion tree's size grows exponentially in `amount / min(coins)`. Extrapolating from 527 calls at `amount = 11`, the plain recursion would already exceed ~10⁹ calls around `amount ≈ 40`, while the DP does ~33 comparisons for Example 1.

---

## 4. The core insight

**1. Optimal substructure via the "last coin."** In any optimal handful of coins for amount `a`, some coin `c` was taken last. Removing it leaves a way to make `a − c`; if that leftover weren't itself optimal, we could swap in a better one and improve the whole — contradiction. So:

```
dp[a] = 1 + min{ dp[a - c] : c in coins, c <= a },    dp[0] = 0
```

**2. Overlapping subproblems.** As the trace showed, `f(1)`, `f(2)`, … are needed over and over. There are only `amount + 1` distinct remainders (0…amount), so cache them: `n` coins × `(amount + 1)` states = **O(n · amount)** total work.

**3. Equivalent view: BFS on an implicit graph.** Treat every value 0…amount as a node; draw an edge `a → a + c` for each coin `c`. Every edge has weight 1 (one coin), so the fewest coins to reach `amount` is exactly the BFS shortest-path distance — first level at which `amount` appears. Same O(n · amount) bound.

**4. Why greedy fails (say this preemptively — it's the #1 interviewer probe).** "Take the biggest coin that fits" is optimal only for special *canonical* systems like US denominations. Arbitrary inputs break it: `coins = [1,3,4]`, `amount = 6` → greedy takes `4+1+1` = **3** coins; optimal is `3+3` = **2** coins. The counterexample itself is the proof of failure.

**5. Why the state is the amount, not a coin subset.** A bitmask over the ≤ 12 coins cannot express "I used three 5s" — supply is unlimited, so multiplicity matters and only the *remaining amount* captures the state.

---

## 5. Optimal solution: bottom-up 1‑D DP

### 5.1 Code (Python)

```python
def coinChange(coins: list[int], amount: int) -> int:
    # dp[a] = fewest coins summing EXACTLY to amount value a.
    # Sentinel: amount + 1 is a safe "impossible" marker because any real
    # answer uses at most `amount` coins (every coin is >= 1).
    INF = amount + 1
    dp = [0] + [INF] * amount          # dp[0] = 0: zero coins make amount 0

    for a in range(1, amount + 1):     # `a` is an amount VALUE (index == value here)
        for c in coins:                # coins are VALUES; order/duplicates don't matter
            if c <= a:                 # guard: skip oversized coins; also avoids dp[-c]
                dp[a] = min(dp[a], dp[a - c] + 1)

    return dp[amount] if dp[amount] <= amount else -1
```

Two correctness notes worth saying aloud:

- **Why ascending inner loop = unbounded:** `dp[a - c]` may have been improved earlier *in the same pass* by the same coin — that's precisely "I may use this coin again." (In 0/1 knapsack you iterate descending to *forbid* this; here it's required behavior.)
- **Why the sentinel never gets corrupted:** an unreachable `a` has no reachable `a − c`, so every candidate is ≥ `INF + 1` and the `min` keeps `dp[a] ≥ INF`; a reachable `a` always achieves its true optimum, which is ≤ `a ≤ amount`. So the final check `dp[amount] <= amount` cleanly separates the two cases. (`float('inf')` works too in Python — `inf + 1 == inf`.)

### 5.2 Trace on Example 1: `coins = [1,2,5]`, `amount = 11` → **3**

Columns show each coin's candidate `dp[a - c] + 1` (blank = coin too big):

| a | via 1: dp[a−1]+1 | via 2: dp[a−2]+1 | via 5: dp[a−5]+1 | dp[a] | one optimal witness |
|---|---|---|---|---|---|
| 0 | — | — | — | **0** | — |
| 1 | 0+1 = 1 | | | **1** | 1 |
| 2 | 1+1 = 2 | 0+1 = 1 | | **1** | 2 |
| 3 | 1+1 = 2 | 1+1 = 2 | | **2** | 2+1 |
| 4 | 2+1 = 3 | 1+1 = 2 | | **2** | 2+2 |
| 5 | 2+1 = 3 | 2+1 = 3 | 0+1 = 1 | **1** | 5 |
| 6 | 1+1 = 2 | 2+1 = 3 | 1+1 = 2 | **2** | 5+1 |
| 7 | 2+1 = 3 | 1+1 = 2 | 1+1 = 2 | **2** | 5+2 |
| 8 | 2+1 = 3 | 2+1 = 3 | 2+1 = 3 | **3** | 5+2+1 |
| 9 | 3+1 = 4 | 2+1 = 3 | 2+1 = 3 | **3** | 5+2+2 |
| 10 | 3+1 = 4 | 3+1 = 4 | 1+1 = 2 | **2** | 5+5 |
| 11 | 2+1 = **3** | 3+1 = 4 | 2+1 = **3** | **3** | 5+5+1 |

`dp[11] = 3` ✓ — matching `11 = 5 + 5 + 1`.

### 5.3 Traces on Examples 2 and 3

**Example 2:** `coins = [2]`, `amount = 3` → **−1**

| a | candidates | dp[a] |
|---|---|---|
| 0 | base | 0 |
| 1 | coin 2 > 1 → none | ∞ |
| 2 | 2: dp[0]+1 = 1 | 1 |
| 3 | 2: dp[1]+1 = ∞ | ∞ → **−1** |

Parity gap: no combination of 2s hits an odd amount. With the sentinel version, `dp = [0, 4, 1, 4]` and `dp[3] = 4 > 3` → −1.

**Example 3:** `coins = [1]`, `amount = 0` → **0**. `dp[0] = 0`; `range(1, 1)` is empty; `dp[0] = 0 ≤ 0` → return 0. The base case does all the work.

### 5.4 Top-down variant (fine, but know Python's depth limit)

```python
from functools import lru_cache
import sys

def coinChange(coins: list[int], amount: int) -> int:
    sys.setrecursionlimit(amount + 100)   # depth can reach ~amount/min(coins) = 10^4

    @lru_cache(maxsize=None)
    def best(rem: int) -> float:
        if rem == 0:
            return 0
        options = [best(rem - c) for c in coins if c <= rem]
        return min(options) + 1 if options else float('inf')

    ans = best(amount)
    return ans if ans != float('inf') else -1
```

Same O(n · amount) time and O(amount) memo. The guard `c <= rem` guarantees `rem` never goes negative, so the cache keys stay clean.

### 5.5 BFS alternative (mention it; some interviewers prefer the framing)

```python
from collections import deque

def coinChange(coins: list[int], amount: int) -> int:
    if amount == 0:
        return 0
    visited = [False] * (amount + 1)
    visited[0] = True
    q, dist = deque([0]), 0
    while q:
        dist += 1
        for _ in range(len(q)):
            a = q.popleft()
            for c in coins:
                nxt = a + c
                if nxt == amount:
                    return dist
                if nxt < amount and not visited[nxt]:
                    visited[nxt] = True
                    q.append(nxt)
    return -1
```

BFS is correct here because every edge costs exactly 1 coin, so level `k` of the BFS contains exactly the amounts reachable with `k` coins. The `visited` array is what keeps it O(n · amount) rather than re-enqueuing states.

### 5.6 Follow-up: reconstruct the actual coins

Keep a `choice[a]` = one coin that achieves `dp[a]`, then walk down from `amount`:

```python
def coinChange_with_coins(coins: list[int], amount: int) -> list[int]:
    INF = amount + 1
    dp, choice = [0] + [INF] * amount, [-1] * (amount + 1)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a], choice[a] = dp[a - c] + 1, c
    if dp[amount] > amount:
        return []
    out, a = [], amount
    while a > 0:
        out.append(choice[a])
        a -= choice[a]
    return out
```

For Example 1 this returns e.g. `[1, 5, 5]` (ties are broken by iteration order; any optimal multiset is acceptable).

**Talk track while coding:** *"dp is indexed by amount value, not coin — dp[a] is the min coins to make exactly a. Base dp[0] = 0. For each a I try every coin as the last coin; the guard c ≤ a both skips oversized coins and keeps the index in range. I use amount+1 as 'impossible' since no valid answer can exceed amount coins. At the end, anything still at the sentinel means −1."*

---

## 6. Complexity

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Plain recursion (§3) | Exponential in `amount` (≈1.7× per +1 for `[1,2,5]`) | O(amount / min coin) stack | DO NOT submit |
| Top-down memo (§5.4) | O(n · amount) | O(amount) memo + O(amount / min coin) stack | recursion depth up to ~10⁴ in Python |
| **Bottom-up 1‑D DP (§5.1)** | **O(n · amount)** | **O(amount)** | ≤ 12 × 10⁴ ≈ 1.2 × 10⁵ transitions; ≤ 10⁴ coins in any answer, so counts fit easily in 32-bit |
| BFS (§5.5) | O(n · amount) | O(amount) | each amount value enqueued at most once |

Worst case concretely: `n = 12`, `amount = 10⁴` → about 120,000 `min` checks and an array of 10,001 ints. That's the whole budget; no early-exit tricks are needed.

---

## 7. Language gotchas

| Language | Gotcha | Fix |
|---|---|---|
| **Python** | `dp[a - c]` with `c > a` does **not** crash — a negative index silently wraps to the end of the list, producing plausible-looking wrong answers | Always guard `if c <= a` |
| **Python** | Top-down recursion depth reaches ~`amount / min(coins)` ≈ 10⁴ > default limit (1000) → `RecursionError` | `sys.setrecursionlimit(...)`, or prefer bottom-up |
| **Java** | If you initialize `dp` to `Integer.MAX_VALUE`, then `dp[a-c] + 1` **overflows to `Integer.MIN_VALUE`** (defined wraparound), and `Math.min` picks the garbage value | Guard `if (dp[a-c] != Integer.MAX_VALUE)`, or just use the sentinel `INF = amount + 1` with `Arrays.fill` |
| **Java / C++** | A "forward" update `dp[a + c]` from `dp[a]` computes `a + c` where `c` can be ~2³¹−1 → signed overflow (UB in C++; silent wrap in Java) | Prefer the backward-index form `dp[a]` from `dp[a - c]` (indices stay in `[0, amount]`), or use `long` |

Java core loop with the sentinel style (illustrative, not a full translation):

```java
final int INF = amount + 1;                 // safe: real answers use <= amount coins
int[] dp = new int[amount + 1];
Arrays.fill(dp, INF);
dp[0] = 0;
for (int a = 1; a <= amount; a++)
    for (int c : coins)
        if (c <= a && dp[a - c] + 1 < dp[a])
            dp[a] = dp[a - c] + 1;
return dp[amount] <= amount ? dp[amount] : -1;
```

---

## 8. Common mistakes

1. **Greedy first.** "Biggest coin that fits, repeat" fails on `[1,3,4]`, amount 6 (gives 3 coins; optimal is 2 via `3+3`). Name the counterexample before the interviewer does.
2. **Writing the 0/1 loop by muscle memory.** Coin-outer + **descending** amount loop forbids reuse — each denomination usable once. On Example 1 the max reachable sum is `1+2+5 = 8 < 11`, so it returns **−1 instead of 3**. For unbounded supply, iterate amounts ascending.
3. **Python negative indexing.** Dropping the `c <= a` guard doesn't throw in Python; `dp[a - c]` reads from the list's tail. Wrong answer, no traceback.
4. **`INT_MAX + 1` overflow** in Java (wraps to `MIN_VALUE`) / C++ (undefined behavior for signed overflow) → corrupted `min`. Use the `amount + 1` sentinel or guard.
5. **Broken base case or return check.** Forgetting `dp[0] = 0`, initializing it to INF, or returning `dp[amount]` without comparing against the sentinel.
6. **Wrong DP dimension.** Trying to bitmask the ≤ 12 coins: with infinite supply, "used a coin" is not a binary fact — the state must be the remaining amount.
7. **Off-by-one in range/size.** Array must have `amount + 1` slots (value 0 included); loop is `range(1, amount + 1)`, not `range(1, amount)`.
8. **Confusing this with Coin Change II (518).** That problem *counts combinations* (aggregation `+`, loop-order-sensitive); this one *minimizes count* (aggregation `min`, loop order between coins/amounts doesn't matter).
9. **Sorting "because DP needs it."** It doesn't — coins are values tried independently at every amount.

---

## 9. Test cases to propose out loud

State these before or right after coding — it signals edge-case maturity:

| Input | Expected | What it catches |
|---|---|---|
| `coins=[1,2,5]`, `amount=11` | 3 | Official Example 1; mixed denominations |
| `coins=[2]`, `amount=3` | −1 | Official Example 2; unreachable interior value (parity gap) |
| `coins=[1]`, `amount=0` | 0 | Official Example 3; empty main loop, base case |
| `coins=[5]`, `amount=3` | −1 | Every coin exceeds the amount; the `c <= a` guard |
| `coins=[7]`, `amount=7` | 1 | Single coin exactly equals amount |
| `coins=[1,3,4]`, `amount=6` | 2 | Anti-greedy sanity check (must answer `3+3`, not `4+1+1`) |
| `coins=[1,1,2]`, `amount=3` | 2 | Duplicate denominations are harmless |
| `coins=[2000000000]`, `amount=10000` | −1 | Coin near 2³¹−1: skip logic + no overflow in Java/C++ |
| `coins=[1,2,5]`, `amount=10000` | 2000 | Max-size input; all-5s optimum; instant runtime |

---

## 10. Transferable patterns & related problems

- **Unbounded knapsack / "min items to hit a target"** — the recurrence shape `dp[a] = 1 + min dp[a − item]` transfers directly:
  - **LC 279 Perfect Squares** — coins are `1,4,9,…,⌊√amount⌋²`.
  - **LC 518 Coin Change II** — count *combinations*; coin-outer loop, and now loop order matters.
  - **LC 377 Combination Sum IV** — counts *ordered sequences*; amount-outer loop.
  - **LC 983 Minimum Cost For Tickets** — "amounts" are days, "coins" are 1/7/30-day passes.
- **Loop-order rule (memorize):** coin-outer → combinations (order-insensitive); amount-outer → permutations (order-sensitive); for a pure `min`, either works.
- **Unreachable-sentinel trick** (`amount + 1`, justified by "each item ≥ 1") generalizes to any minimum-count DP.
- **Implicit-graph BFS** — state = remaining value/sum, uniform edge cost; same family as Word Ladder / Sliding Puzzle shortest-move problems.
- **Reconstruction via a parent/choice array** — standard follow-up for any DP.

---

## 11. Say it in 60 seconds

> "This is minimum coins with unlimited supply — an unbounded-knapsack DP. Greedy biggest-coin-first fails on arbitrary denominations — for `[1,3,4]` and 6, greedy gives `4+1+1` = 3 coins, but `3+3` is 2 — so I'll do DP. State: `dp[a]` = fewest coins to make exactly amount `a`. Transition: pick the last coin `c`, so `dp[a]` = 1 plus the min of `dp[a − c]` over coins with `c ≤ a`, and `dp[0]` = 0. One pass over amounts 1 to `amount`, inner loop over the ≤ 12 coins, skipping oversized ones. Unreachable amounts stay at infinity — in Python I'll use `float('inf')`; in Java I'd use `amount + 1` as the sentinel so `MAX_VALUE + 1` can't overflow. Return `dp[amount]` if it's under the sentinel, else −1. Time O(amount × coins), space O(amount) — with amount ≤ 10⁴ that's about 10⁵ steps. If they ask which coins, I keep a choice array and walk back from `amount`."
