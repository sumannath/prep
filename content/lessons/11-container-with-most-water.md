# Container With Most Water — Complete Interview Lesson

## 1. Problem, Restated Precisely

You're given an array `height` of length `n`. Think of `n` vertical lines standing on the x-axis: line `i` occupies x-position `i` and rises from `y = 0` to `y = height[i]`.

Pick **two distinct indices** `i < j`. Together with the x-axis, lines `i` and `j` form a container. Because the container may not slant, water fills only up to the **shorter** of the two walls — anything above `min(height[i], height[j])` spills out sideways.

So the area you're maximizing is:

```
area(i, j) = (j − i) × min(height[i], height[j])
              └─width─┘   └────water level────┘
```

Return the maximum `area(i, j)` over all pairs. Note carefully: **the pair is a pair of indices; the area uses the values at those indices.** In Example 1 the winning pair is the *indices* `(1, 8)` with *values* `8` and `7`, giving `min(8, 7) × (8 − 1) = 49`.

This is an **optimization over all pairs** problem with a two-quantity objective (width × limiting height) — that framing is what unlocks the solution.

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `n` up to `10^5` | All-pairs enumeration is `n(n−1)/2 ≈ 5 × 10^9` pairs — far too slow. You need **O(n)** (or at worst O(n log n)). |
| `height[i]` up to `10^4` | Maximum conceivable area = `10^4 × (10^5 − 1) = 999,990,000`. This **fits in a 32-bit signed int** (`2,147,483,647`), but only with ~2× headroom — see the language gotchas section before you relax these bounds. |
| `height[i]` can be `0` | The answer can be **0** (e.g., `[0, 0]`, or `[0, 3]`). Initialize your running best to `0`, not `-1` or `None`. |
| `n ≥ 2` | There is always at least one valid pair; no empty-input branch needed. |
| `n` can be `10^5` but distinct values number at most `10^4 + 1` | By pigeonhole, **duplicate heights are guaranteed** at scale. Your solution must be correct on ties without special-casing (see §5, tie handling). |
| "You may not slant the container" | This is the reason the water level is exactly `min(height[i], height[j])` — say this out loud; it justifies the area formula. |

---

## 3. Baseline: Brute Force Over All Pairs

The honest first answer in an interview: try every pair, keep the best.

```python
def max_area_brute(height: list[int]) -> int:
    n = len(height)
    best = 0
    for i in range(n):                 # left wall index
        for j in range(i + 1, n):      # right wall index (strictly greater)
            area = (j - i) * min(height[i], height[j])
            best = max(best, area)
    return best
```

### Worked trace (Example 1: `[1,8,6,2,5,4,8,3,7]`, n = 9 → 36 pairs)

**Pass `i = 0`** (`height[0] = 1` — every area is capped by height 1):

| j | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| area | 1·1=1 | 1·2=2 | 1·3=3 | 1·4=4 | 1·5=5 | 1·6=6 | 1·7=7 | 1·8=8 |

Best after `i = 0`: **8**.

**Pass `i = 1`** (`height[1] = 8`):

| j | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|
| min(h[1], h[j]) | 6 | 2 | 5 | 4 | 8 | 3 | 7 |
| area = min × (j−1) | 6·1=6 | 2·2=4 | 5·3=15 | 4·4=16 | 8·5=40 | 3·6=18 | **7·7=49** |

Best after `i = 1`: **49** — this is the final answer. Remaining passes never beat it:

| i | areas found | best |
|---|---|---|
| 2 (h=6) | 2, 10, 12, 24, 15, 36 | 49 |
| 3 (h=2) | 2, 4, 6, 8, 10 | 49 |
| 4 (h=5) | 4, 10, 9, 20 | 49 |
| 5 (h=4) | 4, 6, 12 | 49 |
| 6 (h=8) | 3, 14 | 49 |
| 7 (h=3) | 3 | 49 |

**Return 49.** ✔

Complexity: **O(n²) time, O(1) space.** Correct, but ~5 × 10⁹ operations at `n = 10^5` will time out. Say the formula and the quadratic cost out loud, then pivot.

---

## 4. The Core Insight

Two facts drive everything:

1. **Width only shrinks.** The widest possible container uses the two ends (`left = 0`, `right = n−1`). Every inward move strictly decreases `right − left`.
2. **The water level is set by the shorter wall.** So for a narrower container to beat the current one, its *limiting height must increase* to compensate.

Now the key deduction: **moving the pointer at the taller wall can never help.** The limiting height is capped by the *shorter* wall, which you'd be keeping — so you'd strictly lose width and gain nothing. The taller wall is dead weight. The **only move that could possibly improve the area is moving the shorter wall inward**, hoping to find something taller.

Formally, the exchange argument (this is what the interviewer wants to hear when they ask *"why is the greedy safe?"*):

> Suppose `height[left] ≤ height[right]`. For any `j` with `left < j ≤ right`:
>
> ```
> area(left, j) = min(height[left], height[j]) · (j − left)
>              ≤ height[left] · (j − left)          [min ≤ height[left]]
>              ≤ height[left] · (right − left)      [j ≤ right]
>              = area(left, right)                  [since min(height[left], height[right]) = height[left]]
> ```
>
> So the current pair `(left, right)` **dominates every pair that keeps `left` as a wall**. We've just recorded `area(left, right)` into `best`, so we can permanently discard index `left` and never miss the optimum. The symmetric argument holds when `height[right] < height[left]`.

**Ties:** if `height[left] == height[right]`, the same inequalities bound pairs using *either* wall, so you may move either pointer (or even both). No special-casing needed — this matters because duplicates are guaranteed at `n = 10^5` (§2).

---

## 5. Optimal Solution: Two Pointers, Retire the Shorter Wall

```python
def max_area(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        width = right - left                        # gap between the walls (NOT +1)
        level = min(height[left], height[right])    # water can't exceed the shorter wall
        best = max(best, level * width)

        if height[left] < height[right]:
            left += 1       # left wall is the limiter — retire it
        else:
            right -= 1      # right is the limiter, or heights are tied (either move is safe)
    return best
```

Optional micro-optimization worth *mentioning* but not coding: since `height[i] ≤ 10^4`, any remaining window of width `w` has area ≤ `w × 10^4`; you could `break` once `(right − left) * 10^4 <= best`. It's a constant-factor prune only.

### Trace — Example 1: `[1,8,6,2,5,4,8,3,7]`

| Step | L | R | h[L] | h[R] | width | level | area | best | move |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 8 | 1 | 7 | 8 | 1 | 8 | 8 | L++ (h[L] < h[R]) |
| 2 | 1 | 8 | 8 | 7 | 7 | 7 | **49** | 49 | R-- |
| 3 | 1 | 7 | 8 | 3 | 6 | 3 | 18 | 49 | R-- |
| 4 | 1 | 6 | 8 | 8 | 5 | 8 | 40 | 49 | tie → R-- |
| 5 | 1 | 5 | 8 | 4 | 4 | 4 | 16 | 49 | R-- |
| 6 | 1 | 4 | 8 | 5 | 3 | 5 | 15 | 49 | R-- |
| 7 | 1 | 3 | 8 | 2 | 2 | 2 | 4 | 49 | R-- |
| 8 | 1 | 2 | 8 | 6 | 1 | 6 | 6 | 49 | R-- |
| — | 1 | 1 | loop ends: **return 49** ✔ | | | | | | |

Notice step 2 finds the global optimum early — but the algorithm has no way to know that, so it keeps going, and every later candidate is correctly evaluated and dominated.

### Trace — Example 2: `[1,1]`

| Step | L | R | width | level | area | best | move |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 1 | 1 | 1 | 1 | 1 | tie → R-- |
| — | 0 | 0 | loop ends: **return 1** ✔ | | | | |

This example is the built-in off-by-one check: adjacent lines give width `1`, not `2`.

### Why the loop is correct and linear

- **Invariant:** at the start of each iteration, the optimal pair either has already been scored in `best`, or lies entirely inside `[left, right]`. Each move preserves this by the dominance inequality in §4.
- **Termination/complexity:** every iteration retires exactly one index, so the window shrinks from size `n−1` to 0 in **at most `n − 1` iterations** → O(n) time, O(1) space.

### What to say while coding (full talk track)

1. "The area for a pair of indices `(i, j)` is the gap times the *shorter* height — water spills over the shorter wall."
2. "All pairs is `n(n−1)/2` — about 5 × 10⁹ checks at `n = 10^5`. Too slow."
3. "The two ends give the *widest* possible container — start there and score it."
4. "Every move shrinks width, so the only way to do better is a taller limiting wall. The limiting wall is always the shorter one — the taller pointer never affects the level — so I move the **shorter** pointer inward."
5. "Safety argument: any pair that keeps the shorter wall is narrower *and* can't be taller than the area I just recorded — it's dominated, so retiring that index is lossless."
6. "One index retired per step → linear time, constant space. I initialize `best = 0` since heights can be zero, and width is `right − left`."

---

## 6. Complexity

| Approach | Time | Extra space | Reality at `n = 10^5` |
|---|---|---|---|
| Brute force (all pairs) | O(n²) | O(1) | ~5 × 10⁹ `min` computations → TLE |
| **Two pointers (this lesson)** | **O(n)** | **O(1)** | ≤ n − 1 iterations, ~10⁵ operations → milliseconds |

On optimality: O(n) is the best possible asymptotic bound here because any algorithm that leaves some `height[i]` unread returns the same answer for two inputs differing only at that position (set it to `0` vs `10^4`), which can change the optimum — so every element must be examined, giving an Ω(n) input-reading lower bound.

---

## 7. Common Mistakes

1. **Moving the taller pointer.** Counterexample: `[1, 5, 4, 3]`. The "move the taller wall" rule traces L=0/R=3 → area 3, then L=0/R=2 → 2, then L=0/R=1 → 1, and returns **3**. The correct answer is **6** (indices `(1, 3)`: `min(5, 3) × 2`). The correct algorithm moves the *shorter* pointer and finds it.
2. **Using `max` instead of `min` of the two heights.** Water above the shorter wall spills out. Always `min`.
3. **Width off-by-one.** Width is `right − left`, not `right − left + 1`. Example 2 proves it: `[1, 1] → 1`.
4. **Wrong initialization.** Initializing `best = -1` (or `None`) breaks on all-zero inputs like `[0, 0, 0] → 0`. Area is never negative; init to `0`.
5. **Over-engineering ties.** Duplicate heights are guaranteed at `n = 10^5`, but ties need *no* special case: when `h[left] == h[right]`, the dominance inequality holds for both walls, so moving either (or both) is safe.
6. **Computing the area after moving a pointer** — you'd mix the new window with a stale level. Score first, move second (or be very careful about ordering).
7. **Assuming the optimal pair must include the tallest line.** Counterexample: `[5, 100, 5]`. Pairs: `(0,1) → 5`, `(0,2) → 10`, `(1,2) → 5`. Answer **10**, from the two short walls — the 100 is irrelevant.
8. **Confusing this with Trapping Rain Water (LC 42).** Same diagram, different question: there you sum water trapped across *all* columns; here you pick exactly *two* walls and maximize one rectangle.

---

## 8. Language-Specific Gotchas

| Language | Gotcha |
|---|---|
| **Python** | Ints are arbitrary precision — no overflow. The real risks are logical: `min` vs `max`, and the width off-by-one. |
| **Java** | Max area under the stated constraints is `10^4 × (10^5 − 1) = 999,990,000`, which fits `int` with ~2× headroom — but if an interviewer scales the constraints, `int` multiplication **wraps silently** (no exception). Promote before multiplying: `long area = (long) minH * width;`. No boxing or hash containers are involved in this problem, so arithmetic overflow is the one thing to watch. |
| **C++** | Same product fits `int` under current constraints, but overflowing `int` is **undefined behavior**, not just wrapping; the defensive form is `long long area = 1LL * std::min(h[l], h[r]) * (r - l);` if constraints grow. Also declare `left`/`right` as signed `int` — unsigned loop variables make `right - left` a silent wraparound hazard if you restructure the loop. |

---

## 9. Test Cases to Propose Out Loud

State these before or right after coding — it signals systematic thinking:

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | `[1,8,6,2,5,4,8,3,7]` | `49` | Official example; height-vs-width tradeoff (steps 1–2 in the trace). |
| 2 | `[1,1]` | `1` | Official example; minimum `n = 2`; confirms width = `R − L = 1`. |
| 3 | `[5, 100, 5]` | `10` | Optimum **ignores the tallest line**. |
| 4 | `[0, 0, 0]` | `0` | Zeros allowed; answer can be 0; `best` must init to `0`. |
| 5 | `[1, 2, 3, 4, 5]` | `6` | Monotonic input; tall-but-narrow pairs lose to short-but-wide ones (`(1,4)`: `2×3 = 6` beats `(3,4)`: `4×1 = 4`). |
| 6 | `[2, 2, 2, 2]` | `6` | All-equal plateau; exercises the tie branch (`(0,3)`: `2×3 = 6`). |
| 7 | `[0, 3]` | `0` | Zero at the edge; one wall contributes nothing. |

Also verbalize: "`n ≥ 2` is guaranteed so I don't need an empty check; heights can be `0`; and since `n` can be `10^5` with only `10^4 + 1` distinct values, duplicates are guaranteed — my tie handling must be correct by construction."

---

## 10. Transferable Patterns & Related Problems

**Pattern 1 — Opposite-end two pointers with greedy retirement.** Whenever the objective over a pair has the shape "`distance` × `function of the min/max of the endpoints`" (or any monotone-bad dependence on one side), you can start at maximum distance and repeatedly retire the endpoint that provably cannot improve future candidates. Each retirement costs O(1) and removes one index forever → amortized O(n).

**Pattern 2 — The dominance/exchange proof.** The two-line inequality in §4 is a reusable template: *"every candidate I skip is dominated by a candidate I already scored."* Interviewers frequently ask "why is the greedy safe?" — have this ready verbatim.

| Related problem | Relationship |
|---|---|
| LC 167 Two Sum II | Same converge-inward skeleton; the move rule comes from sortedness instead of a min-height bound. |
| LC 15 3Sum | Fix one element, then run the same inward scan on the remainder. |
| LC 42 Trapping Rain Water | Same diagram, different question (total trapped water across all columns); two pointers track running max walls. The classic follow-up to this problem. |
| LC 125 Valid Palindrome | Purest form of end-to-middle convergence. |
| LC 881 Boats to Save People | Pair the heaviest with the lightest — the identical discard-the-weaker-endpoint argument. |
| LC 977 Squares of a Sorted Array | Two pointers as *output builders*, filling the result from the ends inward. |

---

## 11. Say It in 60 Seconds

> "The water between walls at indices `i` and `j` is the gap — `j` minus `i` — times the **shorter** height, because water can't sit above the shorter wall. Checking all pairs is quadratic — about five billion pairs at a hundred thousand lines — too slow. So: two pointers at the ends. That's the *widest* possible container, so score it first. From there, every move shrinks width, so the only way to beat the current best is a **taller limiting wall** — and the limiting wall is always the shorter one, which makes the taller pointer dead weight. So I move the shorter pointer inward each step. That's safe because any pair that keeps the shorter wall is narrower *and* can't be taller than the area I just recorded — it's dominated, so I can retire that index forever. Repeat until the pointers meet: at most n−1 steps, linear time, constant space. Two gotchas I'd flag: width is `right minus left` — the `[1,1]` example returns 1, not 2 — and heights can be zero, so the answer can be zero, so I initialize my best to zero."
