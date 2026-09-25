# Koko Eating Bananas — Binary Search on the Answer

A deep-dive lesson: what the problem is really asking, why brute force dies, the monotonicity insight that makes binary search work, full traces, pitfalls, and the transferable template behind it.

---

## 1. Restating the problem (and what to clarify out loud)

**In my own words:** Koko eats at a fixed speed of `k` bananas/hour. Each hour she picks **exactly one pile** and eats up to `k` bananas from it. If the pile has fewer than `k` bananas, she finishes it and then **idles for the rest of that hour** — she may not move to another pile mid-hour. Find the minimum integer `k` such that all bananas are eaten within `h` hours.

Before coding, a good candidate states the model precisely and asks two clarifying questions:

1. **"Exactly one pile per hour, and leftover time is wasted — correct?"** Yes. So a pile of size `p` takes `ceil(p / k)` hours, never fewer, even if she'd finish it with time to spare.
2. **"Does the order of piles matter?"** No. The total is `Σ ceil(p_i / k)` regardless of which pile she picks when, so we never need to schedule — just sum.
3. **"Is an answer guaranteed to exist?"** Yes — the constraint `piles.length <= h` guarantees it (see below). Worth saying out loud, because it's exactly what justifies the search bounds later.

The quantity we minimize over is **the value `k`**, not any index into `piles`. Keep that distinction front of mind: we will binary search over a *range of speeds*, not over the array.

---

## 2. Decoding the constraints

| Constraint | What it tells us |
|---|---|
| `1 <= piles.length <= 10^4` | Each feasibility check that scans all piles costs ~10⁴ operations — cheap. We can afford many checks, but not billions. |
| `1 <= piles[i] <= 10^9` | The candidate speed range is up to 10⁹ wide → **linear enumeration of speeds is hopeless**. Also: piles are never empty, so every pile needs ≥ 1 hour, so `k = 0` is never valid — `k ≥ 1`. |
| `piles.length <= h <= 10^9` | **`h ≥ n` is the feasibility guarantee**: at speed `k = max(piles)`, every pile takes exactly 1 hour, totaling `n ≤ h` hours. An answer always exists. It also caps `h` — note `h` can be smaller *or* larger than `Σ piles` (which can reach 10¹³), so both "answer is 1" and "answer is huge" are possible. |
| Values up to 10⁹ | Any accumulated **sum of hours** can reach 10⁴ × 10⁹ = 10¹³ → overflows 32-bit integers. Python doesn't care; Java/C++ must use 64-bit. |

The sizes practically scream "check function is O(n), run it O(log(max)) times."

---

## 3. Brute force: linear scan over speeds

**Idea:** try `k = 1, 2, 3, …` and return the first speed whose total hours is `≤ h`. Feasibility check:

```python
def hours_needed(piles, k):
    return sum((p + k - 1) // k for p in piles)   # sum of ceil(p / k)
```

**Worked trace on Example 1** — `piles = [3, 6, 7, 11]`, `h = 8`:

| k | ceil(3/k) | ceil(6/k) | ceil(7/k) | ceil(11/k) | total hours | ≤ 8? |
|---|---|---|---|---|---|---|
| 1 | 3 | 6 | 7 | 11 | 27 | no |
| 2 | 2 | 3 | 4 | 6 | 15 | no |
| 3 | 1 | 2 | 3 | 4 | 10 | no |
| 4 | 1 | 2 | 2 | 3 | **8** | **yes → answer 4** |

Two things to notice in this tiny table:

- **The ceiling matters.** At `k = 4`, the pile of 6 takes *2* hours, not `6/4 = 1.5` rounded down. Anyone who uses floor division gets wrong answers immediately.
- **The total is a plateau, not strictly decreasing**: `k = 5` also gives `1 + 2 + 2 + 3 = 8`. Hours is *non-increasing* in `k`, not strictly decreasing — this shapes the binary search later (we hunt the **leftmost** feasible speed, and plateaus are fine).

**Complexity:** `O(n · M)` time where `M = max(piles)`, because we may test up to `M` candidate speeds and each test is an `O(n)` sweep over the piles — with `M ≈ 10⁹` and `n ≈ 10⁴` that's ~10¹³ element operations, far beyond any time limit. It also only pays off when the answer is small; if the answer is near `M`, it's worst case.

---

## 4. The core insight

Two observations, both provable in one line each:

**Insight 1 — Feasibility is monotone in `k`.**
Define `f(k) = Σ ceil(p_i / k)`, the hours needed at speed `k`. For a fixed pile, `ceil(p / k)` never increases as `k` grows (dividing by a bigger number can't increase the ceiling), so `f` is **non-increasing**. Therefore the feasible speeds — those with `f(k) ≤ h` — form a **contiguous suffix** of the positive integers: `[k*, k*, +1, …]`. The problem "return the minimum `k`" is exactly "find the left edge of that range."

**Insight 2 — The search space is small and the edges are justified.**
- `lo = 1`: speed 0 never finishes (piles are non-empty); `k` is a positive integer.
- `hi = max(piles)`: at that speed each pile takes 1 hour → total `n ≤ h` by the constraint, so `hi` is always feasible. And going faster than `max(piles)` can never help, because each pile already takes the minimum possible 1 hour, and total hours can never drop below `n` (one pile per hour). So `hi = max(piles)` is a *tight* upper bound — Example 2, where `h = n` forces the answer to be exactly `max(piles)`, shows tightness.

Together: a **monotone predicate over a bounded integer range** ⇒ binary search finds the leftmost feasible speed in `O(log M)` probes. This is **binary search on the answer**: there is no sorted array anywhere — `piles` doesn't need sorting and we never search over its indices. The "sortedness" is replaced by the monotonicity of the check function along the *value axis* of `k`.

> **Indices vs. values, duplicates:** `piles` may be in any order; duplicates are harmless because the check is a sum over all elements. The only "array-like" structure here is the *virtual* array `F[k] = f(k)` for `k = 1..max(piles)`, which is non-increasing — we're finding the first index where `F[k] ≤ h`, exactly like `bisect_left` on an array we never materialize.

---

## 5. Optimal algorithm: binary search on the answer

### Template

Maintain the invariant **"the answer lies in `[lo, hi]`"**:

- `mid = (lo + hi) // 2`
- If `hours_needed(mid) <= h`: `mid` itself is feasible, so the minimum could be `mid` → `hi = mid`.
- Else: by monotonicity every speed `≤ mid` is also infeasible → `lo = mid + 1`.
- Stop when `lo == hi`; that survivor is the minimum feasible speed.

`mid < hi` whenever `lo < hi` (floor division), so both branches strictly shrink the interval — no infinite loop, no special cases.

### Python

```python
def minEatingSpeed(piles: list[int], h: int) -> int:
    def hours_needed(k: int) -> int:
        total = 0
        for p in piles:
            total += (p + k - 1) // k      # ceil(p / k), integer-exact
            if total > h:                  # early exit: k is already too slow
                return total
        return total

    lo, hi = 1, max(piles)                 # answer is guaranteed in [1, max(piles)]
    while lo < hi:
        mid = (lo + hi) // 2
        if hours_needed(mid) <= h:
            hi = mid                       # mid works — keep it, try smaller
        else:
            lo = mid + 1                   # mid too slow — discard mid and below
    return lo                              # lo == hi == minimum feasible speed
```

**Why `(p + k - 1) // k`?** It's the integer-exact ceiling of `p / k` for positive integers. Avoid `math.ceil(p / k)`: the `/` promotes to a float, and while floats are exact at this problem's scale (everything is below 2⁵³), it's a fragile habit that breaks for larger integers. Similarly, don't pre-sort `piles` or search over array positions — the search axis is the *value* `k`.

**Alternative style (equivalent):** a closed interval with an explicit `ans` variable works too — just never mix the two styles (e.g., `lo <= hi` *with* `hi = mid` loops forever):

```python
lo, hi, ans = 1, max(piles), -1
while lo <= hi:
    mid = (lo + hi) // 2
    if hours_needed(mid) <= h:
        ans, hi = mid, mid - 1
    else:
        lo = mid + 1
return ans
```

Pick one canonical form per interview and stick to it; mixing patterns is the #1 source of off-by-one bugs here.

**Optional bound tightening (mention only if asked to optimize):** with `S = Σ piles` (compute in 64-bit), any `k < ceil(S / h)` is infeasible, because `hours(k) ≥ ceil(S / k) > h` — the inequality `Σ ceil(x_i) ≥ ceil(Σ x_i)` holds since the left side is an integer at least as big as the true sum. So `lo` may start at `max(1, ceil(S / h))`, safely cutting probes when `h` is small. It's a constant-factor win; `lo = 1` is fine for correctness and clarity.

---

## 6. Traces on the official examples

`hours(m)` means `Σ ceil(p_i / m)`, computed with early exit at `h`.

### Example 1 — `piles = [3,6,7,11]`, `h = 8` → **4**

| step | lo | hi | mid | hours(mid) | ≤ h? | action |
|---|---|---|---|---|---|---|
| 1 | 1 | 11 | 6 | 1+1+2+2 = 6 | yes | `hi = 6` |
| 2 | 1 | 6 | 3 | 1+2+3+4 = 10 | no | `lo = 4` |
| 3 | 4 | 6 | 5 | 1+2+2+3 = 8 | yes | `hi = 5` |
| 4 | 4 | 5 | 4 | 1+2+2+3 = 8 | yes | `hi = 4` |
| — | **4** | **4** | | | | **return 4** |

### Example 2 — `piles = [30,11,23,4,20]`, `h = 5` → **30**

Here `h == n`, so every pile must be finished in exactly one hour ⇒ `k ≥ max(piles)`. The search confirms it:

| step | lo | hi | mid | hours(mid) | ≤ h? | action |
|---|---|---|---|---|---|---|
| 1 | 1 | 30 | 15 | 2+1+2+1+2 = 8 | no | `lo = 16` |
| 2 | 16 | 30 | 23 | 2+1+1+1+1 = 6 | no | `lo = 24` |
| 3 | 24 | 30 | 27 | 2+1+1+1+1 = 6 | no | `lo = 28` |
| 4 | 28 | 30 | 29 | 2+1+1+1+1 = 6 | no | `lo = 30` |
| — | **30** | **30** | | | | **return 30** |

Note every "no" here is caused by the single pile of 30 needing 2 hours — a nice thing to narrate.

### Example 3 — `piles = [30,11,23,4,20]`, `h = 6` → **23**

One extra hour of slack lets the answer drop from 30 to 23:

| step | lo | hi | mid | hours(mid) | ≤ h? | action |
|---|---|---|---|---|---|---|
| 1 | 1 | 30 | 15 | 8 | no | `lo = 16` |
| 2 | 16 | 30 | 23 | 2+1+1+1+1 = 6 | yes | `hi = 23` |
| 3 | 16 | 23 | 19 | 2+1+2+1+2 = 8 | no | `lo = 20` |
| 4 | 20 | 23 | 21 | 2+1+2+1+1 = 7 | no | `lo = 22` |
| 5 | 22 | 23 | 22 | 7 | no | `lo = 23` |
| — | **23** | **23** | | | | **return 23** |

---

## 7. Complexity

| Approach | Time | Space | Notes |
|---|---|---|---|
| Linear scan over `k = 1..max(piles)` | `O(n · M)`, `M = max(piles)` | `O(1)` | ≤ 10⁴ × 10⁹ = 10¹³ element-ops — TLE |
| **Binary search on the answer** | **`O(n · log M)`** | **`O(1)`** | `log₂(10⁹) ≈ 30` probes (since 2³⁰ ≈ 1.07×10⁹) × `n = 10⁴` ≈ 3×10⁵ element ops |
| `hours_needed(k)` alone | `O(n)` per probe | `O(1)` | early exit at `h` keeps probes short when `k` is too small |

The check is a single streaming pass — no sorting, no extra memory — which also makes it trivially parallelizable/chunkable if an interviewer pushes on scale.

---

## 8. Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Floor division instead of ceiling | Pile 7 at `k = 4` counted as 1 hour (it's 2) | `(p + k - 1) // k`, or `p // k + (p % k != 0)` |
| `hi = sum(piles)` | Correct but slower, and reveals shaky boundary reasoning | `hi = max(piles)`; justify via `h ≥ n` ⇒ it's always feasible |
| `lo = mid` (or `hi = mid` with a `lo <= hi` loop) | Infinite loop / wrong answer on plateaus | `hi = mid` when feasible, `lo = mid + 1` when not — one consistent pattern |
| Mixing two binary-search styles mid-code | Off-by-one that "almost" works | Pick `lo < hi` lower-bound style *or* closed-interval with `ans`; never both |
| `int` accumulator for hours (Java/C++) | Wrong answer on huge piles (`10⁴ × 10⁹ = 10¹³` overflows 32-bit) | 64-bit sum, plus early exit at `h` |
| Misreading "one pile per hour" | Treating `k` as spreadable across piles per hour | Re-read the model: one pile per hour, remainder of the hour idles |
| Requiring `hours < h` strictly | Fails Example 1 (answer 4 gives exactly `h = 8`) | Condition is `hours ≤ h` — equality is allowed |
| Sorting `piles` or binary searching its indices | Wasted effort, conceptual confusion | Search the **value range** `[1, max(piles)]`; order and duplicates of piles are irrelevant |
| Forgetting `k ≥ 1` | Returns 0 when `h ≥ Σ piles` | `lo = 1`; answer 1 is reachable and valid |

---

## 9. Language gotchas (Java / C++ vs Python)

| Language | Gotcha | Fix |
|---|---|---|
| Java | `Math.ceil(p / (double) k)` uses floating point; also `int hours` overflows | Integer ceil `(p + k - 1) / k` with `long` operands; `long` accumulator with early exit at `h` |
| C++ | `std::accumulate(begin, end, 0)` deduces an `int` accumulator from the `0` seed and overflows | Seed with `0LL` (or loop manually with `long long`) |
| Java / C++ | `(lo + hi) / 2` with `lo, hi` near 10⁹ | `lo + (hi - lo) / 2` — here `lo + hi ≤ 2×10⁹` *barely* fits in `int32` (max 2,147,483,647), but don't rely on a 7% margin; the subtraction form is the habit that never bites |
| Java / C++ | `(p + k - 1)` can reach `2×10⁹ − 1`, again barely inside `int32` | Compute the ceil in 64-bit; free safety net either way |

---

## 10. Test cases to propose out loud

Say before or while coding: *"I'd verify the three examples, plus single-pile, `h == n`, `h ≥ Σ piles`, duplicates, and 10⁹-scale values."*

| # | Input | Expected | What it probes |
|---|---|---|---|
| 1 | `piles=[3,6,7,11]`, `h=8` | `4` | Official; answer strictly inside the range |
| 2 | `piles=[30,11,23,4,20]`, `h=5` | `30` | `h == n` ⇒ answer forced to `max(piles)`; tests the upper boundary |
| 3 | `piles=[30,11,23,4,20]`, `h=6` | `23` | One extra hour relaxes the answer — monotonicity sanity check |
| 4 | `piles=[7]`, `h=3` | `3` | Single pile; `ceil(7/3)=3 ✓`, `ceil(7/2)=4 ✗` — catches floor-division bugs |
| 5 | `piles=[3,6,7,11]`, `h=27` | `1` | `h ≥ Σ piles` ⇒ minimum speed is feasible; tests the lower boundary |
| 6 | `piles=[1000000000,1000000000]`, `h=3` | `1000000000` | 10⁹-scale values; answer equals `hi`; overflow stress |
| 7 | `piles=[1000000000] × 10⁴`, `h=1000000000` | `10000` | Max-size input; `k=10⁴` gives exactly `h` hours, `k=9999` needs ~1.0001×10⁹ hours |
| 8 | `piles=[2,2,2]`, `h=4` | `2` | Duplicates — harmless here, and worth saying so |

Quick verifications worth reciting: #7 — `hours(10⁴) = 10⁴ × ceil(10⁹/10⁴) = 10⁴ × 10⁵ = 10⁹ ≤ h`, while `hours(9999) = 10⁴ × 100011 > h`.

---

## 11. Transferable patterns & related problems

**Pattern: Binary search on the answer (monotone predicate).** The reusable checklist:

1. Identify the **value axis** to search (speed, capacity, divisor, days…), not array indices.
2. Prove the predicate `ok(x)` is **monotone** — this is the whole game; state it explicitly.
3. Justify **bounds**: a feasible `hi` (here `max(piles)`, guaranteed by `h ≥ n`) and a minimal `lo` (here 1).
4. Write an **O(n) (or O(n log n)) check** with early exit; keep it integer-exact.
5. Use one canonical lower-bound binary search; return `lo`.

**Trigger phrases** that should make you reach for this pattern: *"minimum speed/capacity/strength/time to…"*, *"minimize the maximum…"*, *"maximize the minimum…"*, *"least k such that…"*, *"finish within H days/hours"*.

| Related problem | Relationship |
|---|---|
| LC 1011 — Capacity To Ship Packages Within D Days | Near-identical: minimize conveyor capacity; check sums `ceil(weight/capacity)` per day greedily |
| LC 1283 — Find the Smallest Divisor Given a Threshold | Same ceil-sum check, division instead of subtraction; answer bounds differ |
| LC 410 — Split Array Largest Sum | Minimize the max subarray sum; check = greedy partition count `≤ m` |
| LC 1482 — Minimum Number of Days to Make m Bouquets | Binary search on days; check = count adjacent windows |
| LC 2064 — Minimized Maximum of Products Distributed to Any Store | Minimize max per-store allocation; check = per-type greedy fit |
| LC 1802 — Maximum Value at a Given Index in a Bounded Array | Maximize a value under a sum constraint; check = arithmetic-series sum |

**Contrast to keep handy:** binary search on a sorted array (LC 704) searches *data you were given*; binary search on the answer searches *a virtual array indexed by candidate values*, whose monotonicity you must argue yourself.

---

## 12. Follow-up nuggets (with justification)

- **"Can you beat `O(n · log M)`?"** Two honest lower-bound arguments, each one sentence: any correctness-preserving check must be able to read all `n` piles in the worst case, since an unexamined pile's value could be changed to flip the feasibility answer (adversary argument); and at least `⌈log₂ M⌉` probes are unavoidable because each probe returns one feasible/infeasible bit, so a decision tree distinguishing `M` candidate speeds needs at least `M` leaves and thus depth ≥ `log₂ M`. So the target is constant-factor improvements: early exit, the `lo = ceil(S/h)` tightening, and answering `1` immediately when `h ≥ Σ piles`.
- **"What if `h < n`?"** Then no speed works (every pile needs ≥ 1 hour, so hours ≥ n always); per the given constraints this can't happen, but saying so — and offering to return `-1` if the guarantee were dropped — signals rigor.
- **"Is `k` guaranteed integer?"** Yes per the problem; if real speeds were allowed the search would need a fixed-precision termination criterion instead — worth one sentence if asked.

---

## 13. Full interview talk track (script)

1. **Restate & clarify (~30s).** "So Koko eats from exactly one pile per hour at speed `k`; if a pile is smaller than `k` she finishes it but wastes the rest of the hour. So a pile `p` costs `ceil(p / k)` hours, order doesn't matter, and I want the minimum integer `k` with total hours ≤ `h`. The constraint `h ≥ n` tells me an answer exists."
2. **Brute force (~30s).** "Naively I'd scan `k = 1, 2, 3, …` and return the first feasible speed. That's `O(n · max(piles))` — up to ten billion piles-of-work against a 10⁹ range, so it won't fly. But it gives me the check function: sum of ceilings."
3. **Insight (~45s).** "The property that unlocks this is monotonicity: if speed `k` finishes in time, every faster speed does too, because each pile's `ceil(p/k)` only shrinks. So feasible speeds form one contiguous range, and the answer is its left edge — I can binary search the *value* of `k`, no sorting of `piles` involved. Bounds: `lo = 1`; `hi = max(piles)`, which is always feasible since it's one hour per pile and `h ≥ n` — and faster can't help because hours are already at their floor of `n`."
4. **Algorithm (~45s).** "Classic lower-bound binary search: `mid = (lo + hi) / 2`; if `hours(mid) ≤ h` keep `mid` via `hi = mid`, else `lo = mid + 1`. Each probe is one O(n) pass summing `(p + k − 1) // k`, with early exit once the running total exceeds `h` — that also sidesteps overflow in fixed-width languages."
5. **Complexity (~15s).** "O(n log max(piles)) time, O(1) space — about 30 passes over 10⁴ piles here."
6. **Tests & wrap (~30s).** "I'll check the three examples, a single pile to catch floor-vs-ceil, `h == n` where the answer must be `max(piles)`, `h ≥ Σ piles` where it's 1, and 10⁹-scale values for overflow. Code it, trace Example 1, done."

---

## 14. Say it in 60 seconds

> "Koko eats exactly one pile per hour at speed `k`, and unused time in an hour is wasted — so a pile of size `p` costs `ceil(p/k)` hours, and I need the smallest integer `k` whose total is at most `h`. Trying every speed is up to a billion candidates — too slow. The key property is **monotonicity**: if a speed finishes in time, every faster speed does too, so feasible speeds form one contiguous range and the answer is its left edge — that's binary search on the answer. Range: 1 to `max(piles)`, since `max` means one hour per pile and `h` is guaranteed at least the pile count. Each probe is one O(n) pass summing ceilings with an early exit past `h` — about 30 probes at these bounds, so `O(n log max(piles))`, constant space. Pitfalls I've handled: ceiling not floor, `lo = mid + 1` to avoid an infinite loop, and 64-bit hour sums in Java or C++. Tests: the three examples, a single pile, `h == n`, `h ≥ Σ piles`, and 10⁹-scale values."
