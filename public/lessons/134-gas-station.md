# Gas Station (LeetCode 134) — Complete Interview Lesson

## 1. Problem, Restated Precisely

You have `n` stations arranged in a circle, indexed `0 … n-1`. Two **parallel arrays** describe them:

- `gas[i]` — fuel available when you arrive at station `i` (you refuel there automatically, including your starting station).
- `cost[i]` — fuel burned to drive **from** station `i` **to** station `(i+1) % n` (clockwise).

You start with an **empty tank** at some station `s`. You must complete **one full clockwise lap**: exactly `n` legs, visiting `s, s+1, …, s+n-1 (mod n)` and returning to `s`. The tank is unlimited, so the only physical constraint is that the tank may **never go negative** — reaching exactly `0` is fine ("just enough").

Return the **index** `s` (an index, not a gas value) from which the lap is possible, or `-1`. If a solution exists, it is guaranteed to be **unique** — so you never need tie-breaking logic.

Two clarifications worth confirming out loud in an interview:

- **Duplicates in values are irrelevant.** Stations are identified by *index*; equal `gas[i]` values at different stations are different stations.
- **`n = 1` is legal.** The "lap" is the single edge from station 0 back to station 0, so the answer is `0` iff `gas[0] >= cost[0]`.

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `n <= 10^5` | An O(n²) brute force does up to ~10^10 element updates — far too slow. Target **O(n)** (or O(n log n)). |
| `gas[i], cost[i] <= 10^4` | Any running sum is bounded by `n · 10^4 = 10^9` in absolute value. That fits in a signed 32-bit int (max ≈ 2.147 × 10^9), but only *barely* — see the Java/C++ gotchas. |
| Values may be `0` | `gas[i] = 0` and `cost[i] = 0` are both legal. `cost[i] = 0` is never harmful; `gas[i] = 0` can kill a start. |
| Answer unique if it exists | You return *one* index; no need to enumerate or break ties. (Nice fact: the optimal algorithm below doesn't actually *need* this guarantee — it always returns *a* valid start.) |
| Tank starts empty | Initial tank = 0; you must refuel at the start before your first leg. |

## 3. Step 1 — Collapse Two Arrays into One

Almost every clean solution starts by defining the **per-station net**:

```
net[i] = gas[i] - cost[i]
```

`net[i]` is the tank *change* attributable to visiting station `i` (refuel `gas[i]`, pay `cost[i]` to leave).

**Feasibility condition.** Starting at `s` with tank 0, after `k` legs your tank is `net[s] + net[s+1] + … + net[s+k-1]` (indices mod `n`). Therefore:

> **Start `s` is feasible ⟺ every one of the `n` prefix sums of `net` beginning at `s` is ≥ 0.**

This matches the problem's own arithmetic. For Example 1 (`net = [-2, -2, -2, 3, 3]`, start 3), the narrated "refuel on arrival" tank and the prefix sums differ only by the gas just refueled at the arrival station:

| Arrived at | Narrated tank | Prefix of `net` from 3 | Difference |
|---|---|---|---|
| 3 | 4 | 0 | `gas[3] = 4` |
| 4 | 8 | 3 | `gas[4] = 5` |
| 0 | 7 | 6 | `gas[0] = 1` |
| 1 | 6 | 4 | `gas[1] = 2` |
| 2 | 5 | 2 | `gas[2] = 3` |
| back to 3 | 0 | 0 | — |

Same feasibility verdicts everywhere — so from here on we work entirely with prefix sums of `net`.

Compute for the official examples:

- Example 1: `net = [-2, -2, -2, 3, 3]`, total = **0**
- Example 2: `net = [-1, -1, 1]`, total = **−1**

## 4. Brute Force (and Why It Fails at Scale)

Try every start; simulate one lap; fail fast when the tank goes negative.

```python
def canCompleteCircuit_bruteforce(gas: list[int], cost: list[int]) -> int:
    n = len(gas)
    for s in range(n):                  # candidate start index
        tank = 0
        for k in range(n):              # exactly n legs: s -> s+1 -> ... -> back to s
            i = (s + k) % n
            tank += gas[i] - cost[i]    # refuel at i, then drive the leg
            if tank < 0:                # ran dry: station s is dead
                break
        else:
            return s                    # for/else: ran all n legs without going negative
    return -1
```

**Worked trace — Example 2** (`net = [-1, -1, 1]`):

| Start `s` | Tank after each leg | Verdict |
|---|---|---|
| 0 | −1 | dry immediately → dead |
| 1 | −1 | dry immediately → dead |
| 2 | 1 → 0 → **−1** | dies on the *final* leg back to 2 |

→ return **−1**. Note start 2 survives almost the whole lap — early-exit tricks don't save brute force in general.

**Worked trace — Example 1** (`net = [-2, -2, -2, 3, 3]`):

| Start `s` | Tank trace | Verdict |
|---|---|---|
| 0 | −2 | dead |
| 1 | −2 | dead |
| 2 | −2 | dead |
| 3 | 3 → 6 → 4 → 2 → 0 | ✅ all ≥ 0 → return **3** |

**Cost:** worst case ≈ `n(n+1)/2 ≈ 5 × 10^9` net-updates at `n = 10^5` — minutes in Python, seconds even in C++. TLE either way. But brute force is still valuable: it pins down the feasibility condition and gives you an oracle for testing.

## 5. The Core Insights

Three facts turn the O(n²) scan into a single O(n) pass.

**Fact 1 — The total decides −1.**
Any full lap collects `Σgas` and burns `Σcost`, so the tank at the end of any successful lap equals `Σnet`. If `Σnet < 0`, **every** start fails → return −1.

**Fact 2 — The skip lemma (the engine of the greedy).**
Suppose starting at `s`, the tank stays ≥ 0 until it first goes negative upon processing index `j`. Then **every** start `t ∈ [s, j]` also fails no later than `j`:

```
tank from t at j = (sum of net over [s..j]) − (sum of net over [s..t−1])
                 = (negative) − (nonnegative)  <  0
```

The second term is nonnegative precisely because `s` hadn't failed yet before `j`. So one failure lets you discard the *entire* stretch `[s, j]` and jump the next candidate to `j + 1`.

**Fact 3 — If `Σnet ≥ 0`, a valid start exists (so the greedy's survivor is safe).**
Let `P_0 = 0, P_k = net[0] + … + net[k-1]` be prefix sums. Take `m` = the smallest index in `[0, n-1]` minimizing `P_k`. Starting at station `m`:

- Before wrapping: tank after `k` legs = `P_{m+k} − P_m ≥ 0` (global minimum).
- After wrapping: tank = `Σnet + P_j − P_m ≥ 0` (since `Σnet ≥ 0` and `P_j ≥ P_m`). ∎

A useful equivalent view: the greedy's resets happen **exactly at strict record lows of `P`** (tank from candidate `c` at index `i` is `P_{i+1} − P_c`; it goes negative precisely when `P` sets a new low). So the greedy's final answer *is* that argmin `m`. This is a cousin of the classical **cycle lemma** in combinatorics (cyclic shifts with controlled prefix-sign behavior), which is why the "find the minimum prefix, start right after it" trick shows up across circular-array problems.

> **Why the uniqueness guarantee doesn't matter to you:** with `Σnet > 0`, several starts can be valid in general (e.g., `gas = [1,1], cost = [0,0]` — both stations work). Fact 3's proof never uses uniqueness: the greedy always returns *a* valid start; the guarantee just assures you it's *the* expected one.

## 6. Optimal Algorithm — One-Pass Greedy with Reset

Maintain `total` (global sum, decides −1) and `tank` (running sum from the current candidate). On a dip below zero, apply the skip lemma.

```python
def canCompleteCircuit(gas: list[int], cost: list[int]) -> int:
    total = 0        # sum of net over the WHOLE circuit: decides -1 vs. "a start exists"
    tank = 0         # running net sum from the current candidate start
    start = 0        # current candidate answer (an index)
    for i, (g, c) in enumerate(zip(gas, cost)):
        d = g - c
        total += d
        tank += d
        if tank < 0:          # candidate can't even reach here — strictly negative, 0 is fine
            start = i + 1     # skip lemma: everything in [old start, i] is provably dead
            tank = 0
    return start if total >= 0 else -1
```

Two correctness notes you should be able to defend:

- `tank == 0` does **not** reset — arriving with exactly enough fuel is legal; only `tank < 0` is a failure.
- When `total >= 0`, `start` is guaranteed to be a real index in `[0, n-1]`. If the reset ever fired at `i = n-1` (setting `start = n`), the discarded region `[0, n-1]` would be a union of failed stretches each with strictly negative sum, forcing `total < 0` — contradiction. (If you're nervous, an optional belt-and-suspenders pass — simulate one full lap from `start` in O(n) — costs nothing and makes the solution self-evidently correct.)

**Trace — Example 1** (`net = [-2, -2, -2, 3, 3]`):

| i | net[i] | tank | total | action |
|---|---|---|---|---|
| 0 | −2 | −2 | −2 | tank < 0 → `start = 1`, tank = 0 |
| 1 | −2 | −2 | −4 | tank < 0 → `start = 2`, tank = 0 |
| 2 | −2 | −2 | −6 | tank < 0 → `start = 3`, tank = 0 |
| 3 | 3 | 3 | −3 | keep |
| 4 | 3 | 6 | 0 | keep |

`total = 0 ≥ 0` → return **3** ✓

**Trace — Example 2** (`net = [-1, -1, 1]`):

| i | net[i] | tank | total | action |
|---|---|---|---|---|
| 0 | −1 | −1 | −1 | tank < 0 → `start = 1`, tank = 0 |
| 1 | −1 | −1 | −2 | tank < 0 → `start = 2`, tank = 0 |
| 2 | 1 | 1 | −1 | keep |

`total = −1 < 0` → return **−1** ✓ (note: without the `total` guard this buggy code would return `2` — a classic trap)

**Equivalent one-pass alternative** (argmin of prefix sums, per Fact 3) — great to mention if the interviewer asks "is there another O(n) way?":

```python
def canCompleteCircuit_argmin(gas: list[int], cost: list[int]) -> int:
    n = len(gas)
    prefix = 0                  # P_k = sum of first k net values
    min_prefix, start = 0, 0    # P_0 = 0 is the initial record low
    for k in range(n - 1):      # produce P_1 .. P_{n-1} only (argmin restricted to [0, n-1])
        prefix += gas[k] - cost[k]
        if prefix < min_prefix:
            min_prefix, start = prefix, k + 1   # station right after the new record low
    prefix += gas[-1] - cost[-1]                # now prefix == P_n == total
    return start if prefix >= 0 else -1
```

## 7. Complexity

| Approach | Time | Space | Verdict |
|---|---|---|---|
| Brute force per-start simulation | O(n²) | O(1) | ~10^10 ops at n = 10^5 → TLE |
| **Greedy reset + total guard (main)** | **O(n)** | **O(1)** | ✅ single pass |
| Prefix-sum argmin variant | O(n) | O(1) | ✅ equivalent |
| Optional "simulate the final candidate once" verification | +O(n) | O(1) | redundant given Fact 3, cheap insurance |

The main solution's O(n) is optimal up to constants: any correct algorithm must read all `n` net values, because changing a single unread `net[i]` by a large enough amount flips the sign of `Σnet` (turning a `−1` answer into a valid start or vice versa), so an algorithm that skips positions cannot distinguish those two instances.

## 8. Common Mistakes

1. **Returning `start` without the `total >= 0` guard.** On Example 2 the reset-happy loop ends with `start = 2` — an invalid, out-of-spec answer. The guard is not optional.
2. **Off-by-one on the reset.** The tank dips at index `i`, so the new candidate is `i + 1` (not `i`, and you don't refill `gas[i]` into the fresh tank). Mixing this up breaks the invariant "tank = running sum from `start`."
3. **Using `tank <= 0` as the failure condition.** Tank exactly 0 is legal ("just enough"); only strictly negative kills a start.
4. **Inconsistent refuel semantics.** Pick one model — "add `gas[i] − cost[i]` at each visited station" — and never check the tank *before* adding the starting station's gas.
5. **Wrap-around bugs in simulation:** a lap is exactly `n` legs over indices `(s + k) % n`; a common bug is iterating `n−1` legs or `n+1` stations.
6. **Trusting "start at the richest station" or "lowest cost" heuristics.** They're wrong. Counterexample: `gas = [102, 0, 0, 4]`, `cost = [100, 1, 4, 0]` → `net = [2, −1, −4, 4]`, unique answer **3**, but the max-gas station is 0, which dies at index 2. The answer depends on *prefix behavior*, not any single value.
7. **Overflow-fragile accumulators in typed languages** — see §9.
8. **Over-engineering for the uniqueness guarantee** (e.g., trying to enumerate all valid starts) — the problem only ever asks for one index, and the greedy hands you one candidate.

## 9. Implementation Gotchas Beyond Python

| Language | Gotcha |
|---|---|
| **Java** | Sums fit in `int` under the stated constraints (`10^9 < 2^31 − 1`), but `long` is free insurance; note `Arrays.stream(gas).sum()` returns `int` and overflows **silently** if constraints ever grow. No autoboxing/collection pitfalls here — the optimal solution is pure primitive loops. |
| **C++** | `std::accumulate(gas.begin(), gas.end(), 0)` accumulates in `int` — pass `0LL`. Never store the tank in `unsigned`/`size_t`: the tank must be allowed to go negative mid-check, and unsigned wrap-around makes `tank < 0` vacuously false. |
| **Python** | Ints are arbitrary precision — no overflow. Only real hazards are the two logic bugs above (missing guard, wrong reset index). |

## 10. Test Cases to Propose Out Loud

State these *before or right after* coding — it signals rigor.

| # | Input | Expected | What it exercises |
|---|---|---|---|
| 1 | `gas=[1,2,3,4,5]`, `cost=[3,4,5,1,2]` | `3` | Official example; three resets then a clean run |
| 2 | `gas=[2,3,4]`, `cost=[3,4,3]` | `-1` | Official example; total negative; also catches the missing-guard bug |
| 3 | `gas=[5]`, `cost=[5]` | `0` | `n = 1`; equality is enough (tank hits exactly 0) |
| 4 | `gas=[4]`, `cost=[5]` | `-1` | `n = 1`, insufficient — a reset would fire at the last index, so the guard saves you |
| 5 | `gas=[0,0,0]`, `cost=[0,0,0]` | `0` | All-zero values; total = 0; no resets |
| 6 | `gas=[3,1,1]`, `cost=[1,2,2]` | `0` | Total exactly 0 with start 0 valid (prefixes 2, 1, 0) |
| 7 | `gas=[102,0,0,4]`, `cost=[100,1,4,0]` | `3` | Anti-heuristic trap: richest station (0) is wrong; answer is 3 |

Also worth *saying*: zeros are allowed in both arrays; duplicate values across stations are fine (identity is the index); tank == 0 mid-route is legal.

## 11. Transferable Patterns & Related Problems

| Pattern from this problem | Where it reappears |
|---|---|
| Collapse parallel arrays into per-step **deltas** (`net[i] = gas[i] − cost[i]`) | Difference arrays, LC 1094 Car Pooling |
| **Global feasibility from the total sum** (necessary condition, then sufficiency theorem) | Reachability/feasibility arguments in scheduling and flow problems |
| **Kadane-style prefix abandonment**: drop a running quantity the moment it goes bad | LC 53 Maximum Subarray; LC 918 Maximum Sum Circular Subarray |
| **Amortized skip over doomed ranges**: one failure prunes an entire interval, so each index is consumed once | Two-pointer window moves, KMP failure links, LC 55/45 Jump Game |
| **Minimum prefix sum as the circular anchor** (start right after the argmin) | LC 918; ballot/cycle-lemma style problems |

**Related problems to drill:** LC 53 (Maximum Subarray), LC 918 (Maximum Sum Circular Subarray), LC 55/45 (Jump Game I/II — greedy reach with amortized scanning), LC 871 (Minimum Number of Refueling Stops — fuel theme, heap-greedy), HackerRank "Truck Tour" (this exact problem).

**Likely follow-ups and your answers:**

- *"Return **all** valid starts."* Build prefix sums `P` over the doubled array (where `P_{k+n} = P_k + total`); station `s` is valid iff `min(P over the window after s) − P_s ≥ 0`, which a monotonic deque computes for all `s` in O(n).
- *"What if gas values could be negative?"* Nothing changes — the algorithm only ever touches `net` and two sums.
- *"Do you actually need the uniqueness guarantee?"* No — Fact 3 shows the greedy returns a valid start whenever one exists; the guarantee only makes the returned index *the* expected one.

## 12. Full Interview Talk Track

1. **Clarify (30s):** "So I refuel at the start, tank begins at 0, arriving with exactly 0 fuel is fine, one clockwise lap is `n` legs, I return an *index*, and the answer is unique when it exists. `n` up to 10^5, values up to 10^4 — so I want linear time, and I'll keep accumulators overflow-safe in typed languages."
2. **Reframe (30s):** "First I collapse the two arrays: `net[i] = gas[i] − cost[i]`. Then start `s` is feasible exactly when every running sum of `net` starting at `s` stays non-negative — that's just the refuel-then-drive bookkeeping rearranged."
3. **Brute force (30s):** "Try every start and simulate: O(n²), ~10^10 ops at 10^5 — TLE, but it confirms the feasibility condition and gives me a test oracle."
4. **Insights (60s):** "Three facts. One: if `Σnet < 0`, every lap ends negative, so −1. Two — the key one: if my tank from candidate `s` first dies at index `j`, then *every* station in `[s, j]` dies by `j` too, because the stretch between them already nets negative while the part before it was non-negative. So I skip straight to `j + 1`. Three: if `Σnet ≥ 0`, a start always exists — take the argmin of the prefix sums; every cyclic prefix from there is non-negative. The greedy's final surviving candidate is exactly that argmin, so I can return it without a verification lap."
5. **Code (3–4 min):** single pass, `total` and `tank`, reset `start = i + 1; tank = 0` on a strictly negative dip, `return start if total >= 0 else -1`.
6. **Trace (60s):** run both official examples aloud (tables in §6), emphasize that Example 2 is why the total guard exists.
7. **Complexity & tests (30s):** O(n) time, O(1) space; then the test list from §10, calling out `n = 1`, equality-at-zero, and the "richest station is a trap" case.

## 13. Say It in 60 Seconds

> "Gas Station. First I collapse the two arrays: net of i equals gas minus cost. A start works exactly when every running sum around the loop from that start stays non-negative. Two facts finish it. Fact one: if the total net is negative, every start eventually runs dry — return minus one. Fact two: if my running tank from the current candidate goes negative at station i, then not just that candidate — every station between the candidate and i is doomed too, because the stretch between them already nets negative. So I move the candidate to i plus one, reset the tank to zero, and keep scanning. Each station is consumed once, so it's O(n) time, O(1) space. When the total is non-negative, the surviving candidate is provably valid — no verification lap needed — so I return it, guarded by the total check. Edge cases: tank exactly zero is fine, n equals one needs gas at least cost, and I never trust 'start at the richest station' heuristics."
