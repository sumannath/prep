# Best Time to Buy and Sell Stock with Cooldown — Complete Lesson

## 1. Restating the Problem

You're given an array `prices` where `prices[i]` is the stock price on day `i` (0-indexed). You may perform **unlimited transactions** — buy one share, sell it later, repeat — but with two rules:

1. **One position at a time:** you must sell before you can buy again (no holding two shares).
2. **Cooldown:** on the day immediately after a sell, you **cannot buy**. You can hold cash and do nothing, of course, on any day.

Return the maximum total profit achievable. Holding stock you never sell yields no profit, and you start with no stock.

**Key reframe for the interviewer:** each day you're in exactly one of three situations — *holding a share*, *just sold (locked into cooldown tomorrow for buying purposes)*, or *free with cash*. The problem is really about choosing a path through these states, one day at a time.

---

## 2. Decoding the Constraints

| Constraint | Value | What it tells us |
|---|---|---|
| `n = len(prices)` | 1 to 5000 | An **O(n²)** solution (~25M ops) might squeak by in fast languages but is risky; O(n) or O(n log n) is the target. A naive exponential recursion is hopeless (2^5000). |
| `prices[i]` | 0 to 1000 | Values are small and non-negative. Max possible profit is roughly `n/2 × 1000 ≈ 2.5M` — comfortably within 32-bit integer range. No overflow concerns *here*, but note it out loud. |
| Single array, sequential days | — | Perfect fit for **DP over days with a small state space**. |

Edge cases implied by constraints: a single day (`n = 1`, answer must be 0 — you can buy but never profitably sell), strictly decreasing prices (answer 0 — never trade), equal prices (answer 0).

---

## 3. Brute Force: Exhaustive Recursion

**Idea:** From each day, enumerate every legal action. Define `f(i, holding)` = max profit from day `i` onward, where `holding ∈ {true, false}`.

- If `holding`: either **sell** today (`prices[i] + f(i + 2, false)` — skip day `i+1` for cooldown) or **hold** (`f(i + 1, true)`).
- If not holding: either **buy** today (`-prices[i] + f(i + 1, true)`) or **rest** (`f(i + 1, false)`).

```python
def maxProfit_bruteforce(prices):
    n = len(prices)

    def f(i, holding):
        if i >= n:
            return 0
        if holding:
            # sell today -> cooldown forces next buy to day i+2
            sell = prices[i] + f(i + 2, False)
            hold = f(i + 1, True)
            return max(sell, hold)
        else:
            buy = -prices[i] + f(i + 1, True)
            rest = f(i + 1, False)
            return max(buy, rest)

    return f(0, False)
```

**Complexity:** O(2ⁿ) time (two branches per day), O(n) stack space.

### Worked trace on a tiny input: `prices = [1, 2]`

```
f(0, False)
├── buy: -1 + f(1, True)
│        ├── sell: 2 + f(3, False) = 2 + 0 = 2
│        └── hold: f(2, True) = 0
│        → max(2, 0) = 2, so buy branch = -1 + 2 = 1
└── rest: f(1, False)
         ├── buy: -2 + f(2, True) = -2 + 0 = -2
         └── rest: f(2, False) = 0
         → max(-2, 0) = 0

answer = max(1, 0) = 1   ✓ (buy day 0 at 1, sell day 1 at 2)
```

The tree doubles per day; with `n = 5000` this is astronomically infeasible. But notice something crucial: `f(i, holding)` has only `2n` distinct argument pairs. The recursion recomputes the same states exponentially many times — a textbook memoization opportunity.

**Memoized version (O(n) time, O(n) space):**

```python
from functools import lru_cache

def maxProfit_memo(prices):
    n = len(prices)

    @lru_cache(maxsize=None)
    def f(i, holding):
        if i >= n:
            return 0
        if holding:
            return max(prices[i] + f(i + 2, False), f(i + 1, True))
        else:
            return max(-prices[i] + f(i + 1, True), f(i + 1, False))

    return f(0, False)
```

This is already a strong interview answer. But we can do better — cleaner and O(1) space — with a state machine.

---

## 4. The Core Insight

The cooldown rule is naturally expressed as a **finite state machine**. On each day you're in one of exactly three states:

| State | Meaning | What you can do next day |
|---|---|---|
| **hold** | You own a share. | Keep holding, or sell. |
| **sold** | You sold *today*. Cooldown is active. | You must rest tomorrow (can't buy). |
| **rest** | You hold no stock and did *not* sell today (day 0, or it's been ≥ 1 day since your last sell). | Buy, or keep resting. |

The cooldown isn't a special rule bolted on — it's just the `sold` state. Being in `sold` today means tomorrow you can only transition to `rest`, never to `hold`. That's the entire cooldown, encoded structurally.

**Transitions** (going from day `i-1` to day `i`, with `p = prices[i]`):

- `hold[i] = max(hold[i-1], rest[i-1] - p)` — keep holding, or buy from a *rest* day. Note: you cannot buy from the `sold` state; that IS the cooldown.
- `sold[i] = hold[i-1] + p` — you were holding and sold today.
- `rest[i] = max(rest[i-1], sold[i-1])` — keep resting, or finish your cooldown.

**Base case (day 0):** `hold[0] = -prices[0]` (bought today), `sold[0] = 0` (impossible to have sold today, so use 0 — it can never be a "good" predecessor for a buy and never beats the true best), `rest[0] = 0`.

**Answer:** `max(sold[n-1], rest[n-1])` — you must not end the day holding an unsold share, since holding yields no profit. Ending in `sold` or `rest` both mean "all shares converted to cash."

Since day `i` depends only on day `i-1`, we keep **three rolling variables** — O(1) space.

---

## 5. Optimal Solution: State-Machine DP with Rolling Variables

```python
def maxProfit(prices):
    hold = -prices[0]   # max profit if holding a share
    sold = 0            # max profit if we sold *today*
    rest = 0            # max profit if holding cash, free to buy

    for p in prices[1:]:
        prev_hold, prev_sold, prev_rest = hold, sold, rest
        hold = max(prev_hold, prev_rest - p)   # buy only from rest
        sold = prev_hold + p                   # sell what we held
        rest = max(prev_rest, prev_sold)       # cooldown resolves into rest

    return max(sold, rest)
```

### Trace on Example 1: `prices = [1, 2, 3, 0, 2]`

| Day | p | `hold` = max(prev_hold, prev_rest − p) | `sold` = prev_hold + p | `rest` = max(prev_rest, prev_sold) |
|---|---|---|---|---|
| 0 (init) | 1 | −1 | 0 | 0 |
| 1 | 2 | max(−1, 0−2) = **−1** | −1 + 2 = **1** | max(0, 0) = **0** |
| 2 | 3 | max(−1, 0−3) = **−1** | −1 + 3 = **2** | max(0, 1) = **1** |
| 3 | 0 | max(−1, 1−0) = **1** | −1 + 0 = **−1** | max(1, 2) = **2** |
| 4 | 2 | max(1, 2−2) = **1** | 1 + 2 = **3** | max(2, −1) = **2** |

Answer: `max(sold, rest) = max(3, 2) = 3`. ✓

**Reading the trace:** On day 2 we sold at price 3 (sold = 2, i.e., bought at 1). Day 3 is the forced cooldown (rest = 2, coming from sold). On day 3, `hold` jumps to 1 because `rest` (2) minus price (0) = 2, minus... wait — `rest − p = 2 − 0 = 2`? No: `hold = max(prev_hold, prev_rest − p) = max(−1, 2 − 0) = 2`... let me recompute carefully: `prev_rest` on day 3 is day 2's rest = 1, so `1 − 0 = 1`, and `max(−1, 1) = 1`. ✓ (The `2` appears in `rest` on day 3 from day 2's `sold` = 2.) Then day 4: sell the share bought at 0 for 2 → sold = 1 + 2 = 3. Total profit 3 = (3 − 1) + (2 − 0), exactly the `[buy, sell, cooldown, buy, sell]` schedule.

### Trace on Example 2: `prices = [1]`

Loop body never runs. Return `max(sold, rest) = max(0, 0) = 0`. ✓ — You can't profit from a single day.

### Trace on a revealing extra: `prices = [6, 1, 3, 2, 4, 7]`

| Day | p | hold | sold | rest |
|---|---|---|---|---|
| 0 | 6 | −6 | 0 | 0 |
| 1 | 1 | −1 | −5 | 0 |
| 2 | 3 | −1 | 2 | 0 |
| 3 | 2 | −1 | 1 | 2 |
| 4 | 4 | −1 | 3 | 2 |
| 5 | 7 | −1 | 6 | 3 |

Answer: `max(6, 3) = 6`. This is a great case to mention: the naive "greedy: sell every local peak" instinct gives 2 + 3 = 5 (buy 1→sell 3, forced cooldown, buy 4→sell 7), but one long trade (buy 1 → sell 7 = 6) beats it because the cooldown gap destroys the two-trade split. **The DP naturally considers both.**

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Exponential recursion | O(2ⁿ) | O(n) stack | Infeasible for n = 5000 |
| Memoized recursion | O(n) | O(n) + O(n) stack | `2n` distinct states; fine for n = 5000 but recursion depth ~n is a stack-overflow risk in Java/C++ |
| State-machine DP, arrays | O(n) | O(n) | Three DP arrays of length n |
| **State-machine DP, rolling vars** | **O(n)** | **O(1)** | Optimal; ~6 additions/comparisons per day |
| (Discussion) any correct algorithm | Ω(n) | — | Every price must be read at least once, so linear time is a lower bound for any algorithm that must inspect the full input — the DP matches it |

---

## 7. Common Mistakes

1. **Buying during cooldown.** The most frequent bug: writing `hold[i] = max(hold[i-1], max(sold[i-1], rest[i-1]) - prices[i])`. Buying from the `sold` state silently removes the cooldown entirely. The buy transition must draw **only** from `rest`.
2. **Wrong base case for `sold[0]`.** Using a very negative sentinel like `-infinity` is fine conceptually, but using it carelessly in Python (e.g., `float('-inf')` mixed into integer math is fine, but in Java/C++ an `INT_MIN` can overflow if you later add to it). Using `0` works here because a "sold on day 0" state can never actually be reached by a real transaction and can never produce a profitable predecessor for a buy — but be ready to justify that.
3. **Returning only `sold[n-1]`.** The final answer is `max(sold, rest)`. On inputs like `[1]` or strictly decreasing prices, the correct state to end in is `rest`, not `sold`.
4. **Updating variables in place without saving previous values.** Writing `hold = max(hold, rest - p)` then `sold = hold + p` uses the **new** `hold` (you'd be selling a share you bought today — same-day round trip, which must be forbidden). Either compute all three from saved previous values, or use tuple assignment: `hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)`.
5. **Misreading the cooldown as applying before buying only, or thinking it's 2 days.** Cooldown is exactly one day after the sell. The `sold → rest` transition handles it; don't add extra logic.
6. **Greedy attempts.** "Sell at every local peak" fails (see the `[6,1,3,2,4,7]` trace above) because the cooldown can make fewer, longer trades optimal. Say this out loud — it shows you considered and rejected the wrong approach for a concrete reason.

### Implementation gotchas in other languages

| Language | Gotcha |
|---|---|
| **Java** | Values fit in `int` (max ≈ 2.5M), so no overflow — but if you used `Integer.MIN_VALUE` as a "sold on day 0" sentinel, `MIN_VALUE + prices[i]` **overflows**; prefer `0` with justification, or `Integer.MIN_VALUE / 2`. Also, in the memoized version, recursion depth ~5000 is fine for the default JVM stack but tight; the iterative DP is safer. |
| **C++** | Pass `prices` as `const vector<int>&` (avoid copying up to 5000 ints per call in a recursive solution). Same `INT_MIN` overflow caveat as Java. Iterative rolling variables avoid any stack-depth concern. |
| **Python** | `float('-inf')` works for the `sold[0]` sentinel but makes the math float-typed; prefer integer `0` or a very negative int like `-10**9`. Also remember Python's tuple assignment (`a, b, c = x, y, z`) evaluates the right side first — that's the idiomatic way to avoid the in-place-update bug. |

---

## 8. Test Cases to Propose Out Loud

State these before or right after coding — it signals maturity:

| Test | Expected | What it checks |
|---|---|---|
| `[1, 2, 3, 0, 2]` | 3 | Official Example 1 — basic cooldown path (`buy, sell, cooldown, buy, sell`) |
| `[1]` | 0 | Official Example 2 — single day, can't profit; loop body never runs (check your base case!) |
| `[5, 4, 3, 2, 1]` | 0 | Strictly decreasing — never trade; answer lives in `rest` |
| `[3, 3, 3]` | 0 | Equal prices / duplicates — no profit, no crash |
| `[2, 1]` | 0 | Two days, decreasing — confirms no forced trading |
| `[1, 2, 4]` | 3 | Monotone increasing — buy day 0, sell day 2 |
| `[6, 1, 3, 2, 4, 7]` | 6 | **Anti-greedy case**: one long trade (6) beats two trades split around a cooldown (5) |

---

## 9. Transferable Patterns & Related Problems

**The pattern: state-machine DP over a sequence.** Whenever a problem says "at each step you may take one of a few actions, with restrictions on which action can follow which," model days/positions as **states** and actions as **transitions**. The cooldown is not special logic — it's just an edge missing from the transition graph. This same framing solves the whole stock family:

| Problem | Relationship |
|---|---|
| LC 121 — Best Time to Buy and Sell Stock I | One transaction: restrict to a single buy/sell cycle |
| LC 122 — Best Time to Buy and Sell Stock II | Unlimited transactions, **no cooldown**: drop the `sold` state's blocking edge; degenerates to `hold`/`cash` only |
| **LC 309 — this problem** | Unlimited transactions + 1-day cooldown → 3 states |
| LC 714 — With Transaction Fee | Same 3-state skeleton minus cooldown, plus a fee subtracted at each sell |
| LC 123 / 188 — At Most K Transactions | Add a transaction-count dimension: state = (day, transactions-used, holding) |

Other transferable takeaways:
- **Rolling-variable compression:** any DP where step `i` depends only on step `i−1` can collapse from O(n) to O(1) space — interviewers love this optimization.
- **"Max over final states":** when multiple states are possible at the end, the answer is the max over all *legal terminal* states, not one specific state.
- **Anti-greedy awareness:** transaction-with-restriction problems (cooldowns, fees, limits) frequently defeat greedy; having a counterexample ready is a strong signal.

---

## 10. Say It in 60 Seconds

> "This is a state machine DP. Each day I'm in one of three states: holding a share, just sold — which is the cooldown state — or resting with cash and free to buy. The cooldown rule isn't special logic; it's just that the sold state can't transition into a buy, only into rest. So per day I have three recurrences: hold is the max of keeping the share or buying from a rest day; sold is yesterday's hold plus today's price; rest is the max of staying rested or yesterday's sold. I initialize hold to negative today's price and the others to zero, run one linear pass keeping just three rolling variables, and return the max of the sold and rest states at the end — you never want to finish still holding stock. That's O(n) time, O(1) space. One gotcha I'd watch: compute all three transitions from the previous day's values, not in-place, or I'd allow a same-day buy-and-sell. And greedy peak-selling fails here — with cooldowns, one long trade can beat two short ones."
