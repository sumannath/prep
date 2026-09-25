# Best Time to Buy and Sell Stock (LeetCode 121) — Complete Lesson

| | |
|---|---|
| **Difficulty** | Easy (but frequently fumbled under pressure) |
| **Pattern** | Running prefix minimum / single-pass greedy; Kadane's algorithm (dual view) |
| **Expected complexity** | O(n) time, O(1) space |
| **Key trap** | Order dependency — you must buy *before* you sell |

---

## 1. Restate the problem in your own words

Given `prices`, find the maximum value of `prices[j] - prices[i]` over all pairs of indices with **`j > i` strictly** (buy day `i`, sell day `j`). If no pair yields a positive profit, return `0`.

Formally:

```
answer = max(0, max over 0 <= i < j <= n-1 of (prices[j] - prices[i]))
```

Precision points to state out loud:
- `i` and `j` are **day indices**; `prices[i]` is a **value** (a price). Don't blur the two when reasoning or when a follow-up asks "which days?"
- "A different day in the future" means `j > i`, not `j >= i` — same-day round trips are not allowed.
- You make **at most one** transaction (zero transactions → profit 0). This is what separates it from LC 122.

---

## 2. Decoding the constraints

| Constraint | What it tells you | Consequence |
|---|---|---|
| `n <= 10^5` | Large-ish input | Brute force checks ~`n(n-1)/2 ≈ 5×10^9` pairs → far too slow; you need O(n) (or O(n log n)) |
| `0 <= prices[i] <= 10^4` | Non-negative, small values | Max possible profit is `10^4` (buy at 0, sell at 10^4) — fits comfortably in a 32-bit int; **zeros are legal prices**, so don't use 0 as a "no price seen" sentinel |
| `n >= 1` | At least one day | `n = 1` has no valid (buy, sell) pair → answer 0 |
| Single transaction | Buy once, sell once | Greedily summing every upward move is **wrong** here: on `[7,1,5,3,6,4]` that gives `(5-1)+(6-3) = 7`, but the true single-transaction answer is `5` |

Sanity bound for testing: the answer is always an integer in `[0, 10^4]`.

---

## 3. Baseline: brute force, with a worked trace

Check every (buy, sell) pair:

```python
def maxProfit_bruteforce(prices: list[int]) -> int:
    best = 0
    n = len(prices)
    for i in range(n):              # i = buy day (index)
        for j in range(i + 1, n):   # j = sell day (index), strictly after i
            best = max(best, prices[j] - prices[i])
    return best
```

Trace on `prices = [7,1,5,3,6,4]` — for each buy day, find the best sell price *after* it:

| Buy day `i` | `prices[i]` | Best later price | Best profit from this buy day |
|---:|---:|---:|---:|
| 0 | 7 | 6 | −1 |
| 1 | **1** | **6** | **5** ✅ |
| 2 | 5 | 6 | 1 |
| 3 | 3 | 6 | 3 |
| 4 | 6 | 4 | −2 |
| 5 | 4 | — (no later day) | — |

Global max = **5** (buy day 1, sell day 4). Correct, but O(n²) time — ~5×10⁹ pair evaluations at n = 10⁵, which is minutes in Python and typically still too slow even in compiled languages for a 1-second limit.

---

## 4. The core insight

**Reframe around the sell day.** For each day `j`, if you sell on day `j`, the best possible profit is `prices[j] - min(prices[0..j-1])` — today's price minus the cheapest price on any *earlier* day.

So instead of asking "which pair?", ask a question you can answer incrementally while scanning left to right:

> "I keep the cheapest price I've seen so far. Each new price is a candidate **sell**; the running minimum is my guaranteed-best **buy** before it."

This single running aggregate replaces the entire inner loop.

**Why "global max − global min" fails:** the max may occur *before* the min. On `[2,10,1,3]`, `max − min = 10 − 1 = 9`, but you can't sell at day 1 after buying at day 2. The valid best is `10 − 2 = 8`. The running-min approach never has this problem because it only ever pairs the current price with *strictly earlier* prices.

**Dual view (Kadane):** `prices[j] - prices[i]` telescopes into the sum of daily deltas `prices[d] − prices[d−1]` for `d = i+1..j`. So LC 121 is exactly *maximum subarray sum* (LC 53) applied to the deltas, clamped at 0. Same answer, and this view is the bridge to the harder stock problems.

---

## 5. Optimal solution

```python
def maxProfit(prices: list[int]) -> int:
    min_price = float("inf")  # cheapest price (VALUE) seen so far
    best = 0                  # answer clamped at 0: "no transaction" is allowed
    for price in prices:      # iterate over days; `price` is a value, not an index
        # Sell today: allowed buy days are strictly earlier,
        # and min_price currently holds min(prices[0..today-1]).
        best = max(best, price - min_price)
        # Only NOW does today become an eligible buy day for future sells.
        min_price = min(min_price, price)
    return best
```

**Loop invariant** (state this in the interview): before processing day `d`, `min_price = min(prices[0..d-1])` (∞ when `d = 0`) and `best` equals the best single-trade profit achievable using days `0..d-1`, clamped at 0. Computing the profit *before* updating `min_price` is what enforces "buy strictly before sell."

**Note on update order:** if you update `min_price` first, a same-day buy/sell (`price − price = 0`) sneaks in. It happens to be harmless for the returned value (0 never beats an answer already ≥ 0), but it breaks the "return the buy/sell days" follow-up and signals a sloppy invariant. Keep profit-then-update.

### Trace — Example 1: `[7,1,5,3,6,4]`

| Day | `price` | Candidate profit = price − min_so_far | `best` | `min_price` after |
|---:|---:|---:|---:|---:|
| 0 | 7 | 7 − ∞ (skip) | 0 | 7 |
| 1 | 1 | 1 − 7 = −6 | 0 | **1** |
| 2 | 5 | 5 − 1 = 4 | **4** | 1 |
| 3 | 3 | 3 − 1 = 2 | 4 | 1 |
| 4 | 6 | 6 − 1 = **5** | **5** | 1 |
| 5 | 4 | 4 − 1 = 3 | 5 | 1 |

Returns **5** (buy value 1 on day 1, sell value 6 on day 4). ✅

### Trace — Example 2: `[7,6,4,3,1]`

| Day | `price` | Candidate profit | `best` | `min_price` after |
|---:|---:|---:|---:|---:|
| 0 | 7 | −∞ (skip) | 0 | 7 |
| 1 | 6 | −1 | 0 | 6 |
| 2 | 4 | −2 | 0 | 4 |
| 3 | 3 | −1 | 0 | 3 |
| 4 | 1 | −2 | 0 | 1 |

Returns **0** — every candidate is negative, and `best` was initialized to 0. ✅

### Correctness sketch (one paragraph)

By induction on `d`: every profitable pair `(i, k)` with sell day `k` is considered exactly when the loop reaches day `k`, because at that moment `min_price` covers all buy days `i < k` and takes the cheapest one — so `prices[k] - min_price ≥ prices[k] - prices[i]` for every valid `i`. All pairs are covered, none are double-counted harmfully, and pairs that would be negative never beat `best = 0`.

---

## 6. Complexity

| # | Approach | Time | Space | Verdict |
|---|---|---|---|---|
| 1 | All pairs `i < j` | O(n²) | O(1) | ~5×10⁹ ops at n = 10⁵ → TLE |
| 2 | Prefix-min array, then one scan | O(n) | O(n) | Correct; extra memory |
| 3 | Suffix-max array, scan from the right | O(n) | O(n) | Symmetric alternative |
| 4 | **Running min, single pass** | **O(n)** | **O(1)** | Expected answer |
| 5 | Kadane on daily deltas | O(n) | O(1) | Equivalent; generalizes to LC 53 |

**Lower-bound note:** O(n) is optimal — any correct algorithm must read every price at least once, because a single unread element could be the unique minimum or maximum that changes the answer (a standard adversary argument), so no o(n) algorithm exists.

---

## 7. Test plan — propose these out loud before/while coding

| Test | Input | Expected | What it proves |
|---|---|---:|---|
| Official 1 | `[7,1,5,3,6,4]` | 5 | Buy low (1), sell high (6), order respected |
| Official 2 | `[7,6,4,3,1]` | 0 | Strictly decreasing → return 0, not a negative number |
| Single day | `[5]` | 0 | No valid (buy, sell) pair; loop naturally yields 0 |
| Minimal profit | `[1,2]` | 1 | Two-element happy path |
| **Order trap** | `[2,10,1,3]` | **8** | Global max−min = 9 is invalid (max precedes min); catches the sorting/max−min bug |
| Later zero resets min | `[4,0,5]` | 5 | Zeros are legal prices; a later, cheaper buy beats an earlier small profit |
| Duplicates | `[3,3,3,3]` | 0 | Equal prices are never profitable; ties in `min_price` are harmless for the value |

On duplicates: if several days share the minimum price, the algorithm keeps the *first* occurrence (equal values don't shrink `min_price`). This doesn't affect the profit value — it only matters for the "return the days" follow-up, where any valid pair should be acceptable unless the interviewer specifies tie-breaking.

---

## 8. Common mistakes

1. **Returning a negative profit.** Initializing `best` to a negative sentinel and returning it violates "if no profit, return 0." Initialize `best = 0`.
2. **Initializing `min_price = 0`.** Since `0` is a *legal price*, a 0 sentinel fabricates a phantom buy: `[7,1,5]` would return 7 instead of 4. Use `float("inf")` or seed with `prices[0]`.
3. **Sorting, or answering `max(prices) - min(prices)`.** Sorting destroys the buy-before-sell order; `[2,10,1,3]` would give 9 instead of 8.
4. **Confusing this with LC 122** (unlimited transactions). Summing all positive daily gains gives 7 on `[7,1,5,3,6,4]`; the single-transaction answer is 5.
5. **Updating `min_price` before computing the profit** — allows a same-day trade. Value-safe here, but wrong for the "return the days" follow-up and muddies your invariant.
6. **Confusing indices with values** in follow-ups: to report *which days*, you must additionally track the index where `min_price` occurred, not just the value.
7. **Off-by-one on `n = 1`** or forgetting that `j > i` is strict.
8. **Pseudo-optimizations that stay O(n²)** (e.g., "skip inner loop when `prices[i]` isn't a new min" still degenerates on adversarial inputs).

---

## 9. Language gotchas (Java / C++ / Python)

| Language | Gotcha | Fix / note |
|---|---|---|
| Python | On day 0, `price - min_price` is a `float` (since `min_price = inf`); also `min_price = 0` is an invalid sentinel because 0 is a real price | The float candidate never beats `best = 0`, so the return stays `int`; or seed `min_price = prices[0]` and loop from index 1 |
| Java | `int minPrice = Integer.MAX_VALUE;` is safe here — max price 10⁴ keeps `price - minPrice` above `Integer.MIN_VALUE` — but this habit overflows if prices could approach 2³¹ | Use `long` for the difference if constraints ever grow; primitives only, no autoboxing/`HashMap` needed |
| C++ | Copying the input (`vector<int> prices` by value) is an unnecessary O(n) copy; same `INT_MAX`-sentinel overflow caveat as Java | Pass `const vector<int>&`; use `long long` for the difference under larger constraints |

---

## 10. Transferable patterns & related problems

**The pattern in one sentence:** when a problem asks for the best pair `(i, j)` with `j > i` under a *combine(i, j)* rule, fix the later element and maintain a running aggregate (min/max/best-sum) over everything before it — one pass, O(1) extra space.

| Problem | Relation |
|---|---|
| LC 53 — Maximum Subarray | Kadane's algorithm; LC 121 ≡ Kadane on daily deltas |
| LC 122 — Best Time II (unlimited trades) | Greedy: sum all positive deltas (different rule → different answer) |
| LC 123 / 188 — III / IV (≤ k trades) | State-machine DP over (day, trades held) |
| LC 309 — With Cooldown | State machine with an extra "rest after sell" state |
| LC 714 — With Transaction Fee | State machine; subtract fee on each sell |
| LC 1014 — Best Sightseeing Pair | Same "best earlier partner" trick with a transformed value `A[i] + i` |
| LC 42 — Trapping Rain Water | Prefix/suffix maxima — the same aggregate-precomputation family |

State-machine form of this problem (memorize the shape; it scales to all stock variants):

```python
def maxProfit_sm(prices: list[int]) -> int:
    cash, hold = 0, float("-inf")
    for p in prices:
        cash = max(cash, hold + p)   # sell today (bought on an earlier day)
        hold = max(hold, -p)         # buy today, eligible for future days
    return cash
```

---

## 11. Full interview talk track (the script)

**Clarify (30s):** "So one transaction maximum — buy on some day, sell on a *strictly later* day, and if no profitable pair exists I return 0. n up to 10⁵, prices 0 to 10⁴. Got it."

**Baseline (30s):** "Brute force: try every buy day, every later sell day — O(n²), about 5×10⁹ pair checks at n = 10⁵, so that will TLE. But it confirms the answer is `max over j of prices[j] minus the min of prices before j`."

**Insight (30s):** "That reframing is the whole problem. If I fix the *sell* day, the best buy is just the cheapest price so far. So I sweep once, carrying a running minimum, and at each price compute `price − min_so_far` as a candidate profit. I deliberately update the minimum *after* the profit check so I never buy and sell on the same day."

**Edge behavior (15s):** "I initialize `best = 0`, so decreasing arrays and single-day inputs naturally return 0 — 'no transaction' is free. And I initialize the min to +infinity, not 0, since 0 is a legal price."

**Complexity (10s):** "One pass, O(n) time, O(1) space, and O(n) is optimal since every price must be read."

**Tests:** the two official examples, plus `[5]`, `[2,10,1,3]` (global max before global min), and `[4,0,5]`.

**Follow-ups to volunteer:** "If you want the actual days, I track the argmin index too. If multiple trades are allowed, that's LC 122 — sum positive deltas. With at most k trades, fees, or cooldowns, I'd switch to a hold/cash state-machine DP."

---

## 12. Say it in 60 seconds

> "Maximize one buy-then-sell profit, buy strictly before sell, return 0 if nothing's profitable. Brute force is all pairs, O(n²) — way too slow at 10⁵. The insight: for each *sell* day, the best buy is simply the cheapest price *before* it. So one pass, keep a running minimum; at each price the candidate profit is price minus min-so-far, and I update the min *after* the profit check so I never trade with myself on the same day. O(n) time, O(1) space, and that's optimal since every price must be read. `best` starts at 0, which handles decreasing and single-day inputs for free; the min starts at infinity, not zero, because zero is a legal price. I'd test both examples, a one-element array, and `[2,10,1,3]` — where the global max comes before the global min — to prove I'm not accidentally doing max minus min."
