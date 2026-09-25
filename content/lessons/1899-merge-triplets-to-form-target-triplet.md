# Merge Triplets to Form Target Triplet — Deep Dive (LeetCode 1896)

## 1. Restating the problem in your own words

Say it back like this before touching code:

> "I have a list of 3-vectors and one target 3-vector. One operation: pick two *indices* `i ≠ j`, and overwrite `triplets[j]` with the **coordinate-wise max** of `triplets[i]` and `triplets[j]`. Every coordinate only ever goes **up**. Question: can some element of the array become *exactly* `[x, y, z]` after any number of operations — possibly zero?"

Details to nail down verbally (interviewers probe these):

- **Indices vs. values.** The operation is defined on indices, but the question is about *values*. Which index ends up holding the target is irrelevant — only whether the value `[x, y, z]` exists somewhere matters.
- **Direction of the merge doesn't matter.** `max(a_i, a_j) = max(a_j, a_i)`, so "merge i into j" and "merge j into i" produce identical *values*; only which slot survives differs.
- **Zero operations is allowed.** If `target` is already present in `triplets`, the answer is immediately `true`.
- **`i ≠ j` is required.** With `n == 1`, no operation is possible, so the answer is `true` iff that single triplet equals `target` exactly.
- **Duplicates are fine.** Two triplets with identical values are interchangeable; nothing special to handle.

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `triplets.length ≤ 10^5` | You need ~O(n) or O(n log n). Simulating all pairs is Θ(n²) ≈ 10^10 touchpoints — dead on arrival. |
| `1 ≤ values ≤ 1000` | All positive, tiny domain. No overflow anywhere (maxes stay ≤ 1000). No negative-number traps. |
| Exactly 3 coordinates | Per-triplet work is O(1); think *per-coordinate*. A 3-bit mask suffices to track progress. |
| "possibly zero operations" | A hint: membership without merging counts. Check whether `target` can already be present. |
| Duplicates allowed | Don't build logic that assumes uniqueness; identical triplets are simply redundant donors. |

## 3. Warm-up: brute force — simulate the merges

**Idea:** treat the array as a state, apply every possible merge, and search (BFS/DFS with dedup) for a state containing `target`.

Equivalently: maintain a set `R` of distinct triplet *values* seen so far; repeatedly merge every ordered pair of elements of `R`, add new values to `R`, until either `target ∈ R` or `R` stops growing.

**Trace on Example 1:** `triplets = [[2,5,3],[1,8,4],[1,7,5]]`, `target = [2,7,5]`

- Start: `R = {A=[2,5,3], B=[1,8,4], C=[1,7,5]}`
- Pass 1 pairwise merges:
  - `A ⊕ B = [max(2,1), max(5,8), max(3,4)] = [2,8,4]`
  - `A ⊕ C = [2, 7, 5]` ← **target found at the first expansion**
  - `B ⊕ C = [1,8,5]`
- Return `true`. Note `[2,8,4]` is already "overshooting" — merges involving `B` lead nowhere.

**Trace on Example 2:** `[[3,4,5],[4,5,6]]`, `target = [3,2,5]`
- `A ⊕ B = [4,5,6]` (duplicate of `B`). Fixpoint: `R = {[3,4,5],[4,5,6]}`. Target never appears → `false`.

**Why this dies at scale:** every reachable triplet is the coordinate-wise max of some *subset* of the originals, and distinct subsets can produce distinct maxima, so the closure can contain up to 2^n distinct values; each expansion also tries Θ(n²) ordered pairs. Fine for `n = 3`, hopeless for `n = 10^5` — and, as we'll see, simulation is entirely unnecessary.

## 4. The core insight — three observations that crack it

### Observation 1: Maxes only grow ⇒ over-target triplets are radioactive

If a triplet has *any* component strictly greater than the target's corresponding component (e.g., `b_i > y`), it can never participate in a winning plan: the moment any triplet absorbs it, that coordinate is stuck strictly above the target, and since maxes never shrink, it can never come back down. Call these **poisoned**. Any successful plan uses only **safe** triplets — those with `a ≤ x, b ≤ y, c ≤ z` component-wise.

This immediately explains a trap in the official Example 1: naive "merge everything into one" gives `[2,8,5]` (the 8 overshoots `y = 7`) — wrong. The filter, not clever merge ordering, is what saves you.

### Observation 2: Order doesn't matter — don't simulate, decide

Component-wise max is **associative, commutative, and idempotent**. So for any chosen *set* of triplets, merging them in any order, into any index, yields the same final value: the coordinate-wise max over that set. The outcome of a plan depends only on *which* triplets participate — not how or in what order. This kills the need to simulate anything.

### Observation 3: The problem collapses to three existence checks

Consider only safe triplets. Their coordinate-wise max is component-wise ≤ target. Merging *all* safe triplets gives, in coordinate `k`, the maximum safe value in column `k`. Therefore:

> **Target is achievable ⟺ among safe triplets, some triplet has `a == x`, some has `b == y`, and some has `c == z`** (the same triplet may serve multiple coordinates).

**Why (sufficiency):** take one safe donor per needed coordinate and merge them all — the result is exactly `[x, y, z]`.
**Why (necessity):** if some sequence reaches target, the final triplet is the max of the subset of original triplets that fed into it; every feeder must be safe (else the max overshoots permanently), and each coordinate must be attained exactly by some feeder (a max equals `x` only if some member equals `x`).

The editorial's Example 3 uses two "clever" merges — but under Observation 2, any order works: the max of all four safe triplets is `[5,5,5]` directly.

## 5. Optimal O(n) algorithm

1. Unpack `target = [x, y, z]`; set three flags `hit_x`, `hit_y`, `hit_z` to false.
2. For each triplet `(a, b, c)`:
   - **Safety filter:** if `a ≤ x and b ≤ y and c ≤ z`, this triplet may donate.
   - For each coordinate where the triplet *equals* the target, set the corresponding flag.
3. Return `hit_x and hit_y and hit_z`.

```python
from typing import List

class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        x, y, z = target
        hit_x = hit_y = hit_z = False

        for a, b, c in triplets:
            # Safety filter: maxes are permanent, so a triplet that overshoots
            # the target in ANY coordinate can never donate to a winning plan.
            if a <= x and b <= y and c <= z:
                if a == x: hit_x = True
                if b == y: hit_y = True
                if c == z: hit_z = True

        return hit_x and hit_y and hit_z
```

Compact bitmask variant (same logic):

```python
def mergeTriplets(self, triplets, target):
    got = 0
    for a, b, c in triplets:
        if a <= target[0] and b <= target[1] and c <= target[2]:
            got |= (a == target[0]) | ((b == target[1]) << 1) | ((c == target[2]) << 2)
    return got == 0b111
```

Note what this code *doesn't* do: it never merges, never tracks indices, never remembers which triplet donated what. One donor per coordinate is enough, and duplicates are absorbed for free (idempotence of max).

## 6. Traces on the official examples

### Example 1 — `triplets = [[2,5,3],[1,8,4],[1,7,5]]`, `target = [2,7,5]`

| triplet | safe? (`a≤2, b≤7, c≤5`) | hits |
|---|---|---|
| `[2,5,3]` | ✓ | `a = 2` → hit_x |
| `[1,8,4]` | ✗ (`b = 8 > 7`) — **poisoned** | — |
| `[1,7,5]` | ✓ | `b = 7` → hit_y; `c = 5` → hit_z |

All three hits → `true`. (Recovery: merge `[2,5,3]` into `[1,7,5]` → `[2,7,5]`.)

### Example 2 — `triplets = [[3,4,5],[4,5,6]]`, `target = [3,2,5]`

| triplet | safe? (`a≤3, b≤2, c≤5`) | hits |
|---|---|---|
| `[3,4,5]` | ✗ (`b = 4 > 2`) | — |
| `[4,5,6]` | ✗ (4>3, 5>2, 6>5) | — |

No safe triplets → `false`. (Agrees with the editorial's reason: no `2` exists anywhere.)

### Example 3 — `triplets = [[2,5,3],[2,3,4],[1,2,5],[5,2,3]]`, `target = [5,5,5]`

All four triplets are safe (every component ≤ 5).

| triplet | hits |
|---|---|
| `[2,5,3]` | `b = 5` → hit_y |
| `[2,3,4]` | — |
| `[1,2,5]` | `c = 5` → hit_z |
| `[5,2,3]` | `a = 5` → hit_x |

All three hits → `true`. Merging all four safe triplets in *any* order yields `[5,5,5]` — no two-step choreography needed.

## 7. Complexity

| Approach | Time | Space | Notes |
|---|---|---|---|
| BFS/DFS over merge sequences | up to 2^n distinct reachable triplets, Θ(n²) pairs tried per expansion | O(states) | Correct but only viable for tiny n |
| Filter safe triplets, merge all into one | O(n) | O(1) in place | Works, but the merge itself is pointless bookkeeping |
| **Filter + per-coordinate existence (this solution)** | **O(n)** | **O(1)** | 3 comparisons + ≤ 3 flag updates per triplet |

- O(n) is asymptotically optimal: in the worst case an algorithm must read every triplet, because an unread triplet could be the *unique* donor for some coordinate (adversary argument).
- Runtime in practice: ~3·10^5 comparisons for n = 10^5 — microseconds.

## 8. Common mistakes

| # | Mistake | Consequence | Fix |
|---|---|---|---|
| 1 | Donating from a poisoned triplet by checking only the matched coordinate | `[[5,9,9]]` vs `target=[5,5,5]` → wrong `true`: the only `5` lives in a triplet whose `9`s can never be undone | Require **all three** `≤` checks *before* any equality check |
| 2 | Using `<` instead of `≤` in the filter | A triplet that *equals* the target gets rejected → wrong `false` even when zero ops suffice | Equal components are safe and desirable: use `≤` |
| 3 | Simulating "merge everything greedily" | One poisoned triplet contaminates the accumulator forever (Example 1: greedy-all gives `[2,8,5]`) | Decide by existence checks; never simulate |
| 4 | Early-returning `false` upon seeing any bad triplet | Bad triplets are ignorable, not fatal — the other triplets may still cover all coordinates | Just `continue` |
| 5 | Assuming `target` must already exist in the list | Misses assembly from up to three different donors | Per-coordinate donors, possibly different triplets |
| 6 | Forgetting `n == 1` / zero-ops | With one triplet, no merge is possible; answer is exact-equality only | Falls out naturally from the algorithm; still, say it out loud |
| 7 | Worrying about merge direction (`i` into `j`) | Wasted minutes; max is symmetric so values are unaffected | State it, move on |

## 9. Test cases to propose out loud

Propose these **before coding** (it signals you've understood the reduction) or immediately after:

| # | Input | Expected | What it stresses |
|---|---|---|---|
| 1 | `[[2,5,3],[1,8,4],[1,7,5]]`, `[2,7,5]` (Example 1) | `true` | Poisoned triplet skipped, assembly works |
| 2 | `[[3,4,5],[4,5,6]]`, `[3,2,5]` (Example 2) | `false` | No viable donors |
| 3 | `[[2,5,3],[2,3,4],[1,2,5],[5,2,3]]`, `[5,5,5]` (Example 3) | `true` | Three different donors, one per coordinate |
| 4 | `[[1,2,3]]`, `[1,2,3]` | `true` | Zero operations; `n = 1`; exact equality |
| 5 | `[[1,2,3]]`, `[3,2,1]` | `false` | `n = 1` can't merge, and the triplet is actually poisoned here (`c = 3 > 1`) — two independent reasons for `false` |
| 6 | `[[5,9,9]]`, `[5,5,5]` | `false` | **Poisoned exact match**: a coordinate value that equals the target inside a triplet that overshoots elsewhere must be rejected |
| 7 | `[[5,9,1],[1,1,1]]`, `[5,1,1]` | `false` | `[1,1,1]` safely covers `y, z`, but the only `5` is radioactive → the naive "value exists somewhere" check would wrongly say `true` |
| 8 | `[[2,2,1],[1,1,2]]`, `[2,2,2]` | `true` | One donor supplies two coordinates |
| 9 | `[[2,5,3],[1,8,4],[1,7,5]]`, `[2,8,5]` | `true` | Same array as Example 1, different target: `[1,8,4]` flips from poisoned to safe (`8 ≤ 8`) and donates `y` — verdicts are target-relative, not absolute |

## 10. Language gotchas

- **Python:** unpack `x, y, z = target` once outside the loop; per-triplet tuple unpacking (`for a, b, c in ...`) beats repeated indexing. No overflow concerns — maxes never exceed 1000.
- **Java:** if the signature uses `List<List<Integer>>`, beware that values up to 1000 fall **outside** the `Integer` cache (−128..127), so `Integer == Integer` is reference comparison and silently wrong for equal large values; compare with `intValue()` / `.equals()`, or `int == Integer` (which auto-unboxes correctly). Prefer `int[][]` and enhanced-for.
- **C++:** iterate by reference — `for (const auto& t : triplets)` — so you don't copy 10^5 vectors; and note structured bindings like `auto [a, b, c] = t;` **do not compile** for a `std::vector<int>` (it isn't tuple-like), so index into `t` or copy to `std::array<int,3>`. No overflow risk; only `max` is applied.

## 11. Transferable patterns & related problems

**Patterns to carry away:**

1. **Monotone operation ⇒ permanent disqualification.** When an operation can only push values up (or only down), any contributor that crosses the limit is permanently unusable. Filter *before* reasoning. (Here: the "radioactive" over-target triplets.)
2. **Commutative/associative combine ⇒ decide, don't simulate.** If the result of a plan depends only on the *set* of participants (max, min, OR, AND, gcd…), replace search over orders/placements with set-level predicates.
3. **Component-wise structure ⇒ per-coordinate decomposition.** A vector-level reachability question decomposes into independent per-coordinate existence questions when the combining operation acts component-wise.
4. **"Value exists" is not "donor is safe."** Existence checks must run *inside* the feasibility filter (test #6/#7 above).

**Related problems:**

| Problem | Connection |
|---|---|
| LC 55 / 45 — Jump Game I/II | Greedy reachability: decide feasibility with a frontier instead of simulating every path |
| LC 330 — Patching Array | Greedy coverage of a target by a monotonically growing reachable set; oversized items handled by rules, not simulation |
| LC 1798 — Max Number of Consecutive Values You Can Make | "Which targets are constructible?" answered greedily after sorting/filtering |
| LC 322 — Coin Change (contrast) | With *sum* semantics, order/subset structure forces DP; with *max* semantics (this problem), plain existence checks suffice |

**Likely follow-ups (have one-liners ready):**

- *Minimum number of operations?* If `m` safe donors (1 ≤ m ≤ 3) are needed to cover the three coordinates, the answer is `m − 1`: any merge order works by associativity (m − 1 merges suffice), and fewer can't combine m contributor lineages into one triplet since each merge unites at most two groups. Zero if a single triplet already equals the target.
- *What if the operation were coordinate-wise **sum**?* The feasibility question becomes subset-sum-flavored: the 1-coordinate special case is exactly subset-sum, a classical NP-complete problem (Karp's 21), so exponential/pseudo-polynomial cost is inherent — though with values ≤ 1000 a pseudo-polynomial DP over the three partial sums is conceivable.
- *Streaming input / memory cap?* The O(1)-space solution already works; nothing needs to be stored.

## 12. Full in-room narration (script)

> "Let me restate: we can repeatedly overwrite any triplet with the coordinate-wise max of itself and another triplet; I need some triplet to become exactly the target. Since maxes only ever increase values, my first instinct is to simulate merge sequences — but that's exponential: any reachable triplet is the max of some subset of the originals, so up to 2^n candidates, and n is 10^5.
>
> Two observations fix it. First, **poisoning**: a triplet with any component strictly above the target's can never be used — once it's absorbed, that coordinate is stuck above the target forever. So I'll only touch 'safe' triplets, all three components ≤ target. Second, **order-independence**: component-wise max is associative and commutative, so merging any chosen set of safe triplets gives the same result regardless of order or target index — the coordinate-wise max of that set, which is still ≤ target.
>
> That collapses everything to three existence questions: among safe triplets, does some triplet have `a == x`, some have `b == y`, some have `c == z`? One donor per coordinate; the same triplet may donate twice. If all three exist, merge them and we hit target exactly. If some coordinate's safe max falls short, it's impossible — values can't grow past what's already there.
>
> One pass, O(n) time, O(1) space — and O(n) is forced anyway, since an unread triplet could be the only donor for some coordinate.
>
> Edge cases I'd check: target already present → true with zero ops; n = 1 → exact equality only; a triplet that matches one coordinate but overshoots another → disqualified (that's why the equality checks live *inside* the safety filter); and the same input array can flip verdict if the target changes, since safety is target-relative."

## 13. Say it in 60 seconds

> "Every merge takes coordinate-wise maxes, so values only go up. That gives two facts. One: any triplet with a coordinate strictly above the target's can never be used — once merged, that coordinate is stuck past the target forever — so I only touch 'safe' triplets, where all three components are ≤ target. Two: among safe triplets, order doesn't matter — merging any set of them produces the coordinate-wise max of that set, still ≤ target. So the problem collapses to three existence checks: among safe triplets, does some triplet hit `x` in coordinate one, some hit `y` in coordinate two, some hit `z` in coordinate three? One donor per coordinate; one triplet may donate twice. All three exist → merge them, we hit the target. Any coordinate falls short → impossible, since nothing can grow past what's already there. One pass, O(n) time, O(1) space. Edge cases: target already present is true with zero ops; n = 1 needs exact equality; and a triplet matching one coordinate but overshooting another is disqualified — which is why the equality checks sit inside the safety filter."
