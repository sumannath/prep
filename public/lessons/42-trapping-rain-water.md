# Trapping Rain Water (LeetCode 42) — Complete Interview Lesson

## 1. Restating the Problem in Your Own Words

You're given an array `height` of `n` non-negative integers. Index `i` is a vertical bar of width 1 and height `height[i]`. Rain falls everywhere; water fills every "valley" between taller bars and stays put.

**The question is really per-column, not per-bar.** The water sitting *on top of column `i`* is:

```
water(i) = min(tallest bar at or left of i, tallest bar at or right of i) − height[i]
```

because the water level above a column is capped by the **shorter** of the two walls surrounding it. The answer is `Σ water(i)`.

Picture for Example 1 (`~` = trapped water, `█` = bar):

```text
       █
   █~~~██~█
 █~██~██████
h = [0,1,0,2,1,0,1,3,2,1,2,1]
```

The `~` cells total **6** — matching the expected output. Note that indices 0 and 11 (the outermost columns) always contribute **0**: there is no wall beyond them.

> **Convention detail that prevents a whole class of bugs:** define the left/right maxima *inclusively*, i.e., `leftMax(i) = max(height[0..i])` and `rightMax(i) = max(height[i..n-1])`. Both are ≥ `height[i]`, so `water(i) ≥ 0` automatically — no clamping needed. If you compute *exclusive* maxima instead, a tall bar can produce a negative term and you must clamp with `max(0, ...)`.

---

## 2. Reading the Constraints Like an Interviewer

| Constraint | What it tells you |
|---|---|
| `1 <= n <= 2 * 10^4` | Brute force is Θ(n²) ≈ 4–8 × 10⁸ scan steps — far too slow for Python (CPython does on the order of 10⁷ simple loop iterations per second, so that's tens of seconds). You need an **O(n)** pass. |
| `0 <= height[i] <= 10^5` | Each column can hold at most 10⁵ water, so the **total** can approach `n × 10^5 = 2 × 10^9`. That is ~93% of `Integer.MAX_VALUE` (2,147,483,647) — see the overflow gotcha in §10. |
| Heights are non-negative | No negative bars, but still ensure the per-column term can't go negative (inclusive maxima convention, §1). |
| Width of each bar is 1 | Volume in "units" = count of unit cells filled, so the per-column decomposition is exact — no geometry tricks needed. |

The hidden bar for a Hard problem: after you give an O(n)-time / O(n)-space solution, the interviewer's real follow-up is almost always **"can you do it in O(1) space?"** — so plan to reach the two-pointer solution.

**Optimality note:** O(n) time is a hard floor — any algorithm that skips even one bar can be fooled by flipping that bar's height from 0 to 10⁵, which can change the answer, so every element must be read. The two-pointer solution's O(n)/O(1) is therefore optimal.

---

## 3. Warm-Up: Brute Force Per-Column Scan

For each index, scan left for the tallest wall, scan right for the tallest wall, apply the formula.

```python
def trap_bruteforce(height: list[int]) -> int:
    n = len(height)
    water = 0
    for i in range(n):
        left_max = 0
        for j in range(i + 1):            # walls INCLUDE column i itself
            left_max = max(left_max, height[j])
        right_max = 0
        for j in range(i, n):             # ...on both sides
            right_max = max(right_max, height[j])
        water += min(left_max, right_max) - height[i]   # always >= 0 by construction
    return water
```

**Worked trace on Example 2** — `height = [4, 2, 0, 3, 2, 5]` (expected 9):

| `i` | `height[i]` | left walls scanned | `left_max` | right walls scanned | `right_max` | `min(L,R)` | water |
|---|---|---|---|---|---|---|---|
| 0 | 4 | [4] | 4 | [4,2,0,3,2,5] | 5 | 4 | **0** |
| 1 | 2 | [4,2] | 4 | [2,0,3,2,5] | 5 | 4 | **2** |
| 2 | 0 | [4,2,0] | 4 | [0,3,2,5] | 5 | 4 | **4** |
| 3 | 3 | [4,2,0,3] | 4 | [3,2,5] | 5 | 4 | **1** |
| 4 | 2 | [4,2,0,3,2] | 4 | [2,5] | 5 | 4 | **2** |
| 5 | 5 | [4,2,0,3,2,5] | 5 | [5] | 5 | 5 | **0** |

Total = 0+2+4+1+2+0 = **9** ✓

**Complexity:** Θ(n²) time (two scans per index), O(1) space. Correct, but at n = 2×10⁴ it's hundreds of millions of iterations — state this cost out loud and move on quickly. The brute force exists to earn you the insight in §4.

---

## 4. The Core Insight

> **Water above column `i` depends only on two numbers: the tallest bar to its left and the tallest bar to its right. The shorter of those two walls decides the water level; the column's own height is subtracted from it.**

Three consequences:

1. **Per-column decomposition:** `answer = Σ (min(leftMax(i), rightMax(i)) − height[i])`. If you can look up `leftMax(i)` and `rightMax(i)` in O(1), the whole problem is one O(n) pass.
2. **Use `min`, never `max`.** Water pours over the *lower* wall. Using `max` is the single most common wrong answer.
3. **Edge columns and self-walls are free** under the inclusive convention: at `i = 0`, `leftMax(0) = height[0]`, so the term is exactly 0. No special-casing.

---

## 5. Optimal, Step 1: Prefix/Suffix Max Arrays — O(n) time, O(n) space

Precompute a running max from the left and from the right, then one pass to sum contributions.

```python
def trap(height: list[int]) -> int:
    n = len(height)
    if n == 0:                    # constraints say n >= 1, but the guard is free insurance
        return 0
    prefix = [0] * n              # prefix[i] = max(height[0..i])   (inclusive)
    suffix = [0] * n              # suffix[i] = max(height[i..n-1]) (inclusive)

    prefix[0] = height[0]
    for i in range(1, n):
        prefix[i] = max(prefix[i - 1], height[i])

    suffix[n - 1] = height[n - 1]
    for i in range(n - 2, -1, -1):
        suffix[i] = max(suffix[i + 1], height[i])

    return sum(min(prefix[i], suffix[i]) - height[i] for i in range(n))
```

**Worked arrays for Example 1** (`height = [0,1,0,2,1,0,1,3,2,1,2,1]`):

| `i` | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `height[i]` | 0 | 1 | 0 | 2 | 1 | 0 | 1 | 3 | 2 | 1 | 2 | 1 |
| `prefix[i]` | 0 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | 3 |
| `suffix[i]` | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 1 |
| `min(P,S)` | 0 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 2 | 2 | 2 | 1 |
| water | 0 | 0 | **1** | 0 | **1** | **2** | **1** | 0 | 0 | **1** | 0 | 0 |

Sum = 6 ✓. (Read `prefix` as "tallest wall including me, from the left"; read `suffix` the same way from the right.)

This is a perfectly strong interview answer. Say: **"O(n) time, O(n) space — and I believe I can drop the space to O(1)."** That transition is where the hard-problem credit is.

---

## 6. Optimal, Step 2: Two Pointers — O(n) time, O(1) space (the target answer)

### The idea

Walk `l` from the left and `r` from the right, maintaining `left_max = max(height[0..l])` and `right_max = max(height[r..n-1])`. **Always settle the column on the side whose max is smaller.**

Why that's safe — the invariant argument: if `left_max < right_max`, then for the next left column `l+1`, its *true* right wall is `max(height[l+1..n-1]) ≥ right_max > old left_max`. So the right wall is guaranteed at least as tall as anything the left side has produced — the binding constraint for that column is the left max alone, and we can finalize its water **without ever knowing the exact right wall**. Symmetric for the other side. Each pointer moves inward exactly once ⇒ one pass, constant extra variables.

### Code

```python
def trap(height: list[int]) -> int:
    if not height:
        return 0
    l, r = 0, len(height) - 1
    left_max, right_max = height[l], height[r]   # inclusive walls at the ends
    water = 0
    while l < r:
        if left_max < right_max:
            l += 1
            left_max = max(left_max, height[l])  # update BEFORE adding (see §10, mistake #4)
            water += left_max - height[l]        # >= 0 in both cases (see invariant below)
        else:                                    # ties move the right pointer — safe (§6.3)
            r -= 1
            right_max = max(right_max, height[r])
            water += right_max - height[r]
    return water
```

Why the added term is never negative, case analysis after moving `l`:
- If `height[l] ≤ left_max`: the column's left wall stays `left_max`, which is `< right_max ≤ true right wall` ⇒ water = `left_max − height[l] > 0`.
- If `height[l] > left_max`: the column becomes a new wall; `left_max` becomes `height[l]` and the term is exactly 0.

Same reasoning mirrors on the right.

### Trace on Example 1 — `[0,1,0,2,1,0,1,3,2,1,2,1]` (expected 6)

Initial: `l=0, r=11, left_max=0, right_max=1, water=0`.

| Step | Comparison | Action | `left_max` | `right_max` | water added | running total |
|---|---|---|---|---|---|---|
| 1 | 0 < 1 | `l→1` | 1 | 1 | 1−1 = 0 | 0 |
| 2 | 1 = 1 (tie) | `r→10` | 1 | 2 | 2−2 = 0 | 0 |
| 3 | 1 < 2 | `l→2` | 1 | 2 | 1−0 = **1** | 1 |
| 4 | 1 < 2 | `l→3` | 2 | 2 | 2−2 = 0 | 1 |
| 5 | tie | `r→9` | 2 | 2 | 2−1 = **1** | 2 |
| 6 | tie | `r→8` | 2 | 2 | 2−2 = 0 | 2 |
| 7 | tie | `r→7` | 2 | 3 | 3−3 = 0 | 2 |
| 8 | 2 < 3 | `l→4` | 2 | 3 | 2−1 = **1** | 3 |
| 9 | 2 < 3 | `l→5` | 2 | 3 | 2−0 = **2** | 5 |
| 10 | 2 < 3 | `l→6` | 2 | 3 | 2−1 = **1** | 6 |
| 11 | 2 < 3 | `l→7` | 3 | 3 | 3−3 = 0 | **6** ✓ |

`l == r == 7` → stop. (Steps 3, 8, 9, 10, 5 are exactly the shaded `~` cells in the §1 picture.)

### Trace on Example 2 — `[4,2,0,3,2,5]` (expected 9)

Initial: `l=0, r=5, left_max=4, right_max=5, water=0`.

| Step | Comparison | Action | `left_max` | `right_max` | water added | running total |
|---|---|---|---|---|---|---|
| 1 | 4 < 5 | `l→1` | 4 | 5 | 4−2 = **2** | 2 |
| 2 | 4 < 5 | `l→2` | 4 | 5 | 4−0 = **4** | 6 |
| 3 | 4 < 5 | `l→3` | 4 | 5 | 4−3 = **1** | 7 |
| 4 | 4 < 5 | `l→4` | 4 | 5 | 4−2 = **2** | 9 |
| 5 | 4 < 5 | `l→5` | 5 | 5 | 5−5 = 0 | **9** ✓ |

The right wall (height 5) dominates the entire map, so every interior column is settled from the left against `left_max = 4` — a nice illustration of *why* the smaller-side rule works.

### 6.3 Duplicates / ties — precision notes

- **Equal wall maxima** (`left_max == right_max`): the `else` branch moves the right pointer. Ties are safe either way, because the water level is the *min* of the two walls — and equal maxima mean either side's max is the same binding wall. The correctness argument in §6 only needs `right_max ≥` the new left max, and equality satisfies that.
- **Equal bar heights in the array** (plateaus, flat valley bottoms, `[3,0,0,3]`): handled naturally — a flat region between two equal walls fills to the wall height; the added terms just become 0 once the level is reached.
- **Alternative branch style:** some solutions branch on `height[l] < height[r]` (compare the *bars at the pointers*, not the running maxes) and process the lower bar. It is equally correct, but the classic bug there is forgetting to advance the pointer inside one of the branches → **infinite loop**. The version above moves a pointer in *every* iteration, which structurally guarantees termination.

---

## 7. Alternate Lens: Monotonic Stack (horizontal slabs) — brief

The two approaches above fill water in **vertical columns**. A monotonic stack fills it in **horizontal layers**: keep a stack of indices with non-increasing heights; when a taller bar arrives, each popped bar is a basin *floor*, and it traps one slab of width `i − stack[-1] − 1` and depth `min(height[stack[-1]], h) − height[bottom]`.

```python
def trap_stack(height: list[int]) -> int:
    stack, water = [], 0                     # indices; heights non-increasing top of stack = smallest
    for i, h in enumerate(height):
        while stack and height[stack[-1]] < h:
            bottom = stack.pop()
            if not stack:                    # no left wall -> this slab leaks; stop popping
                break
            water += (i - stack[-1] - 1) * (min(height[stack[-1]], h) - height[bottom])
        stack.append(i)
    return water
```

Verified against Example 2: pops at `i=3` add 2+2, pops at `i=5` add 1+4 → total 9 ✓. It's O(n) time — each index is pushed and popped at most once — and O(n) space. It doesn't beat two pointers here, but the "prev-greater-element span" pattern behind it is heavily reused (§11), so knowing it pays rent elsewhere.

---

## 8. Complexity Comparison

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (scan both sides per index) | Θ(n²) | O(1) | ~4–8 × 10⁸ steps at n = 2×10⁴ → TLE territory in Python; derive it, don't submit it |
| Prefix/suffix max arrays | O(n) | O(n) | Simplest optimal-time answer; easy to get right under pressure |
| **Two pointers** | **O(n)** | **O(1)** | **Target answer**; optimal time (every bar must be read — see §2) and optimal auxiliary space |
| Monotonic stack | O(n) amortized | O(n) | Horizontal-slab view; the pattern generalizes (LC 84/85) |

---

## 9. Test Plan — Propose These Out Loud (before or after coding)

| Case | Input | Expected | What it catches |
|---|---|---|---|
| Official 1 | `[0,1,0,2,1,0,1,3,2,1,2,1]` | 6 | General multi-basin shape |
| Official 2 | `[4,2,0,3,2,5]` | 9 | One dominant wall; right side never settles a column |
| Single bar | `[7]` | 0 | `n = 1`: loop body never runs; must return 0, not crash |
| Two bars | `[7,4]` | 0 | `n = 2` traps nothing |
| All zeros | `[0,0,0,0]` | 0 | Zero heights everywhere |
| Strictly increasing | `[1,2,3,4,5]` | 0 | One-sided maxima — no right wall ever binds |
| Strictly decreasing | `[5,4,3,2,1]` | 0 | Mirror case |
| Simple valley | `[2,0,2]` | 2 | The canonical dip |
| Flat-bottom valley (duplicates) | `[3,0,0,3]` | 6 | Equal-height walls, zero-height floor |
| Asymmetric walls | `[4,2,3]` | 1 | Left wall taller than right — catches `max`-instead-of-`min` bugs |
| Max values | `[100000, 0, 100000]` | 100000 | Large values; feeds the overflow discussion in §10 |

Script to say: *"Edge cases I want to cover: `n = 1` or `n = 2` (nothing can be trapped), all-equal or monotonic heights (answer 0), a valley with a flat bottom to exercise duplicates, and a case where the left wall is taller than the right so I know I'm taking the `min`."*

---

## 10. Common Mistakes (and the Fix)

1. **`max(left_max, right_max)` instead of `min`.** Water spills over the shorter wall. Example 2 catches it: with `max` you'd get nonsense like 4 at `i=2`.
2. **Exclusive maxima without clamping.** If your left/right scans *exclude* index `i`, a tall bar yields a negative term (e.g., at a peak, both neighbor maxima are smaller than the bar). Either clamp with `max(0, ...)` or — better — use the inclusive convention of §1, which makes negatives impossible.
3. **Off-by-one in the suffix array.** Building `suffix` but iterating the wrong direction or setting `suffix[n-1]` twice corrupts everything downstream. Trace `suffix` on a 3-element array by hand before trusting it.
4. **Update/add ordering in the two-pointer loop.** You must move the pointer, *then* refresh the max, *then* add `max − height`. Adding before refreshing can add a negative when the new bar is taller than the running max. (Equivalently: add `max(0, old_max − height)` first, then update.)
5. **Infinite loop in the alternative branch style.** If you branch on `height[l] < height[r]` and forget `l += 1` / `r -= 1` in one branch, the loop never terminates. The formulation in §6 moves a pointer every iteration by construction.
6. **Confusing this with Container With Most Water (LC 11).** LC 11 maximizes `min(h[l], h[r]) × (r − l)` — area between *two chosen lines*. Here every column contributes; the pointers mean something completely different.
7. **Treating edge columns as special.** They're not, if your maxima are inclusive — don't write `if i == 0 or i == n-1: continue`.

### Language-specific gotchas (Java / C++)

| Language | Gotcha |
|---|---|
| Java | The running total can reach ≈ 2 × 10⁹ under max constraints (e.g., `[10^5, 0, 0, …, 0, 10^5]` traps `(n−2) × 10^5 ≈ 1.9998 × 10^9`), which is ~93% of `Integer.MAX_VALUE` (2,147,483,647). A 32-bit `int` *happens* to survive here, but it's one small constraint bump from overflow — accumulate in a `long` as a matter of habit. |
| Java | If you use the stack variant, prefer `ArrayDeque<Integer>` over the legacy `java.util.Stack` class; elements autobox `int → Integer`, which is fine at n = 2×10⁴ but worth flagging as allocation churn. |
| C++ | Accumulate in `long long`; take `height` as `const vector<int>&` to avoid an O(n) copy; guard `height.empty()` before touching `height[0]` when initializing the two maxima. |
| Python | Arbitrary-precision ints — no overflow concern; the classic Python failure mode is instead the O(n²) TLE. |

---

## 11. Transferable Patterns & Related Problems

**Patterns to name explicitly in the interview:**

1. **Per-index contribution decomposition** — `answer = Σ f(i)` where `f(i)` depends only on local/directional extremes. Turns a global geometry question into an aggregation.
2. **Directional precomputation (prefix ⊗ suffix)** — any quantity expressible as "best-so-far from the left" combined with "best-so-far from the right."
3. **Two pointers that settle the dominated side** — when the smaller side's fate is fully decided by information already in hand, finalize it and move on.
4. **Monotonic stack for previous-greater-element spans** — convert "vertical column" thinking into "horizontal slab" thinking.
5. **Boundary-driven filling** — for the 2D generalization, water levels are decided from the outside in (a heap replaces the two walls).

**Related problems:**

| Problem | Connection |
|---|---|
| LC 11 Container With Most Water | Same picture, different quantity (`min × width` between two lines); the classic mix-up with this problem |
| LC 238 Product of Array Except Self | Identical prefix-×-suffix decomposition skeleton |
| LC 84 Largest Rectangle in Histogram | Monotonic stack over "previous smaller element" spans |
| LC 85 Maximal Rectangle | LC 84 applied row-by-row |
| LC 407 Trapping Rain Water II | 2D terrain; boundary-driven min-heap (maximin water levels from the perimeter inward) |
| LC 239 Sliding Window Maximum | Running-extremes maintenance with a deque |
| LC 121 Best Time to Buy and Sell Stock | One-pass running prefix-min thinking |
| LC 962 Maximum Width Ramp | Two pointers exploiting prefix/suffix structure |

---

## 12. Full Interview Talk Track (the long version)

> *"Let me restate: the array is an elevation map of unit-width bars, and I need the total volume of trapped rainwater. Before coding, my edge cases: a single bar or two bars trap nothing; flat or monotonic terrain traps nothing; I'll also want a valley with a flat bottom and a case where the left wall is taller than the right.*
>
> *The key observation: the water sitting on any single column is bounded by the **shorter** of the two walls around it — the tallest bar at-or-left of it and the tallest bar at-or-right of it — minus that column's own height. If I define those maxima inclusively, the term is never negative and the edge columns come out as zero for free. So the answer is the sum over all indices of `min(leftMax(i), rightMax(i)) − height[i]`.*
>
> *Brute force: for each index, scan left and right to find those maxima. That's O(n²) — around 4×10⁸ steps at n = 2×10⁴, too slow.*
>
> *But the maxima only ever grow as I move outward, so I can precompute a running max from the left into `prefix`, and one from the right into `suffix`. Then one pass to sum. O(n) time, O(n) space. Let me code that first — it's easy to get right.*
>
> *Now, I believe I can drop the space to O(1). Two pointers from both ends, tracking `left_max` and `right_max`. Invariant: `left_max` is the max of everything at-or-left of `l`, `right_max` the max at-or-right of `r`. Whenever the left max is the smaller one, the column just inside `l` is fully decided — its true right wall is guaranteed to be at least `right_max`, which is taller, so the binding wall is the left max. I can finalize that column's water and advance `l`. Symmetric on the right. Every pointer moves once, so O(n) time, O(1) space — and O(n) is optimal since every bar must be read.*
>
> *[Code it. Then trace Example 2 out loud: left_max stays 4 against the height-5 right wall; contributions 2, 4, 1, 2 — total 9.] Ties between the two maxima are safe because the water level is the min, and equal maxima give the same level either way.*
>
> *Tests: both official examples, `[7]` → 0, `[3,0,0,3]` → 6, monotonic arrays → 0, `[4,2,3]` → 1. Complexity: O(n) time, O(1) space. One portability note: if I translated this to Java or C++, I'd accumulate in 64-bit — the max answer is about 2×10⁹, uncomfortably close to int range."*

---

## 13. Say It in 60 Seconds

*"Water trapped above any index is the **lower** of the two walls around it — the tallest bar to its left and the tallest to its right — minus that index's own height. Sum that over all indices. Brute force re-scans both sides per index, O(n²). Precomputing running maxes from the left and right makes each lookup O(1): O(n) time, O(n) space. To get O(1) space, use two pointers with `left_max` and `right_max`, and always settle the column on the side with the **smaller** max — that column's water level is already decided, because the far side is guaranteed at least as tall. Each pointer moves once: O(n) time, O(1) space, and O(n) is optimal since every bar has to be read. Edge columns and single bars trap zero; ties between the maxima are safe because the level is the min either way. Tests I'd call out: single bar, all-flat, monotonic slopes — all zero — plus a flat-bottomed valley for duplicates. And in Java or C++, I'd use a 64-bit accumulator, since the max total is around two billion."*
