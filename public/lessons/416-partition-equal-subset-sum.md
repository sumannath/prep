# Partition Equal Subset Sum (LeetCode 416) — Complete Interview Lesson

## 1. Problem, restated

You're given `nums`, an array of positive integers. Return `true` if you can split **all** the elements into two groups whose sums are equal, `false` otherwise.

Two precision points candidates gloss over:

- **It's a partition, not "find two subsets."** Every element is used exactly once; nothing is discarded. (Conveniently, this turns out not to hurt us — see §4.)
- **The two subsets need not be the same size** — only the same *sum*. `[1, 5, 5]` and `[11]` is a legal split of `[1,5,11,5]` even though the halves have 3 and 1 elements.

**The one-sentence reframe you should say out loud early:** equal halves both sum to `total / 2`, so the question is really *"is there a subset that sums to exactly `total / 2`?"* — the complement automatically forms the other half.

Examples:
- `[1,5,11,5]` → total 22, target 11; `{11}` works → `true`
- `[1,2,3,5]` → total 11 (odd) → `false` immediately

## 2. Decoding the constraints

| Constraint | What it buys you |
|---|---|
| `1 <= n <= 200` | Small n. An `O(n × T)` DP is trivial; even the 2D table (≈ 200 × 10,001 ≈ 2M booleans) fits easily. |
| `1 <= nums[i] <= 100` | **Strictly positive** — sums only grow as you add elements. This is what makes the descending-order 1D trick and `remaining < 0` pruning valid. (Zeros would be no-ops; **negatives would break both**.) |
| Max total = 200 × 100 = **20,000** | Target ≤ **10,000**. The DP array has at most 10,001 entries. |
| Values are integers, answer is boolean | This is a *feasibility* DP ("reachable or not"), not an optimization DP — the recurrence is a boolean **OR**, not a `max`/`min`. |

Derived bounds you should compute out loud: `T = total/2 ∈ [1, 10_000]` (total ≥ 2 whenever it's even, since values ≥ 1), and the state space for memoization is at most `(n+1) × (T+1) ≈ 2×10⁶`.

## 3. Brute force: include/exclude recursion (worked trace)

**Decision:** for each index `i`, either `nums[i]` goes into the "chosen" subset or it doesn't. Define `solve(i, remaining)` = "can elements from index `i` onward sum to `remaining`?"

```
solve(i, remaining):
    if remaining == 0: return True          # subset complete
    if i == n:         return False         # out of elements
    return solve(i+1, remaining - nums[i])  # take nums[i] (if it fits)
        or solve(i+1, remaining)            # skip nums[i]
```

**Trace on `[1,5,11,5]`, target 11** (branches pruned when `nums[i] > remaining`):

```
solve(0, 11)
├── take 1 → solve(1, 10)
│   ├── take 5 → solve(2, 5)
│   │   ├── take 11 → ✗ pruned (11 > 5)
│   │   └── skip 11 → solve(3, 5)
│   │       ├── take 5 → solve(4, 0) = TRUE   ← subset {1,5,5}
│   │       └── skip 5 → solve(4, 5) = false
│   └── skip 5 → solve(2, 10)
│       ├── take 11 → ✗ pruned
│       └── skip 11 → solve(3, 10) = false (both branches)
└── skip 1 → solve(1, 11)
    ├── take 5 → solve(2, 6) = false (11 too big; 5 leaves 1)
    └── skip 5 → solve(2, 11)
        ├── take 11 → solve(3, 0) = TRUE       ← subset {11}
        └── skip 11 → solve(3, 11) = false
```

Two things to point out to the interviewer:

1. **The blow-up:** each of the `n` elements independently has 2 choices, so the tree has `2ⁿ` leaves — for `n = 200` that's ≈ 1.6×10⁶⁰ nodes. Dead on arrival.
2. **The overlap:** even at n = 4, states like `solve(4, 5)` and `solve(4, 6)` are evaluated more than once (look at the two `solve(4,6)` occurrences above). The distinct states are only `(index, remaining)` pairs, bounded by `(n+1) × (T+1) ≈ 2×10⁶` — that collapse is exactly what memoization/DP exploits.

## 4. The core insight

Three reductions, each one sentence:

1. **Partition → subset sum.** A valid partition exists **iff** some subset `S` sums to `total/2`:
   - (⇐) take `A = S`, `B = complement`; `sum(B) = total − total/2 = total/2`. This is why we never need to track the second subset.
   - (⇒) any equal partition's left half *is* such a subset.
2. **Parity gate first.** If `total` is odd, no integer `total/2` exists → `false` before doing any work. This gate is **load-bearing correctness**, not a micro-optimization (see mistake #1 in §7).
3. **Subset sum = 0/1 knapsack feasibility.** Track which sums are reachable with the elements processed so far; add one element at a time.

**Why not greedy?** Sorting descending and always adding to the smaller pile fails: on `[3,3,2,2,2]` (total 12), greedy produces piles of 7 and 5, yet the split `{3,3}` / `{2,2,2}` = 6/6 exists. Local balance ≠ global feasibility; you need the reachability DP.

## 5. Optimal approach

### 5.1 The algorithm (1D boolean DP)

`dp[s] = True` iff **some subset of the elements processed so far** sums to exactly `s`. Note carefully: **`dp` is indexed by sum *values* `s ∈ [0, target]`; the outer loop walks element *indices*.**

- Seed `dp[0] = True` (the empty subset).
- For each `num`, for `s` from `target` **down** to `num`: `dp[s] |= dp[s - num]`.
- **Descending is mandatory:** it guarantees `dp[s - num]` still holds the value from *before* this element was processed, so each element is used at most once (0/1 knapsack). Ascending turns it into *unbounded* knapsack (mistake #2).
- Answer: `dp[target]`. This compresses the standard 2D recurrence `dp[i][s] = dp[i−1][s] ∨ (s ≥ nums[i−1] ∧ dp[i−1][s − nums[i−1]])` into one row, which is legal because row `i` only reads row `i−1`.

Prune: if `max(nums) > target`, return `false` — in any valid partition every element sits in a half summing to `target`, so every element must satisfy `nums[i] ≤ target`.

### 5.2 Code (Python)

```python
def canPartition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2:                       # odd total can never split evenly
        return False
    target = total // 2
    if max(nums) > target:              # an element bigger than half can't fit in EITHER half
        return False

    dp = [False] * (target + 1)         # dp[s]: some subset of processed nums sums to s
    dp[0] = True                        # empty subset
    for num in nums:
        if dp[target]:                  # optional early exit
            return True
        for s in range(target, num - 1, -1):   # DESCENDING => each num used at most once
            if dp[s - num]:
                dp[s] = True
    return dp[target]
```

### 5.3 Trace on Example 1 — `nums = [1,5,11,5]`, total 22, target 11

| After processing | Reachable sums (dp[s] = True, s ≤ 11) | dp[11]? |
|---|---|---|
| (init) | {0} | False |
| 1 | {0, 1} | False |
| 5 | {0, 1, 5, 6} | False |
| 11 | {0, 1, 5, 6, **11**} | **True → return True** |

**Why descending matters — one full pass magnified** (processing the first `5`, array `dp[0..11]`, starting from `[T,T,F,F,F,F,F,F,F,F,F,F]`):

- `s=11`: reads `dp[6]` = F; `s=10`: reads `dp[5]` — **still F**, because `dp[5]` is written later in this same pass (at `s=5`); …; `s=6`: reads `dp[1]` = T → `dp[6]=T`; `s=5`: reads `dp[0]` = T → `dp[5]=T`.
- Result: `{0,1,5,6}` — the single `5` was used **once**. Had the loop been ascending, `s=5` would set `dp[5]=T` *first*, then `s=10` would read the fresh `dp[5]` → `dp[10]=T`, inventing a nonexistent "5 + 5".

(If we skipped the early exit and processed the last `5` too, we'd reach `{0,1,5,6,10,11}` — sum 11 is reachable both as `{11}` and as `{1,5,5}`, the two halves of the actual answer.)

### 5.4 Trace on Example 2 — `nums = [1,2,3,5]`, total 11

`11 % 2 == 1` → return `false` before any DP. **The trap:** if you skip the gate and compute `target = 11 // 2 = 5`, the subset `{2,3}` reaches 5 and you return `true` — wrong. This exact official example is the counterexample; the parity check is correctness.

### 5.5 Bitset variant (the speed flex)

Reachable sums form a set that unions nicely: represent it as an integer whose bit `s` means "sum `s` is achievable." Adding element `num` = `mask |= mask << num`.

```python
def canPartition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2:
        return False
    bits = 1                            # bit s set <=> sum s achievable; bit 0 = empty subset
    for num in nums:
        bits |= bits << num
    return bool((bits >> total // 2) & 1)
```

Trace on `[1,5,11,5]` — set of set bit-positions after each element:

| After | Set bits (achievable sums) |
|---|---|
| start | {0} |
| 1 | {0,1} |
| 5 | {0,1,5,6} |
| 11 | {0,1,5,6,11,12,16,17} |
| 5 | {0,1,5,6,10,11,12,16,17,21,22} |

Bit 11 is set → `true`. (The mask tracks sums up to the full total ≤ 20,000 — still trivial.) In Python, the big-int shift/OR runs at C speed over ~10⁴ bits.

### 5.6 Top-down memoized alternative (brief)

```python
from functools import lru_cache

def canPartition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    if max(nums) > target:
        return False

    @lru_cache(maxsize=None)
    def dfs(i: int, remaining: int) -> bool:   # can nums[i:] sum to `remaining`?
        if remaining == 0:
            return True
        if i == len(nums):
            return False
        # values are positive, so remaining only shrinks; no negative state is ever cached
        return dfs(i + 1, remaining - nums[i]) or dfs(i + 1, remaining)

    return dfs(0, target)
```

Depth ≤ n = 200, safely under Python's default recursion limit.

### 5.7 Follow-up: "return the actual two subsets"

Keep the 2D table `dp[i][s]` ("first `i` elements can make sum `s`"), then backtrack from `(n, target)`: at state `(i, s)`, if `dp[i−1][s]` is True, element `i−1` needn't be in the subset (recurse to `(i−1, s)`); otherwise it must be (record it, recurse to `(i−1, s − nums[i−1])`). The complement list is the other half.

## 6. Complexity

Let `T = total / 2 ≤ 10⁴`, `n ≤ 200`.

| Approach | Time | Space | Verdict |
|---|---|---|---|
| Enumerate all subsets | O(2ⁿ) | O(n) stack | ≈ 2²⁰⁰ — infeasible |
| Memoized include/exclude | O(n·T) ≈ 2×10⁶ states | O(n·T) memo | fine, heavier memory |
| 2D tabulation | O(n·T) | O(n·T) | clearest recurrence, most memory |
| **1D tabulation (chosen)** | **O(n·T) ≈ 2×10⁶ ops** | **O(T)** | **the standard answer** |
| Bitset / Python big-int | O(n·T/w), w = 64 | O(T/w) words | ≈ 3×10⁴ word-ops; fastest in practice |

Justifications for the non-obvious rows:

- **Bitset speedup:** the T-bit boolean vector is shifted and ORed 64 bits (one machine word) at a time by the hardware, so the per-element cost is `T/64` word operations instead of `T` byte operations.
- **"Pseudo-polynomial":** the `O(n·T)` bound is polynomial in the *numeric value* of `T`, not in the `log₂ T` bits that encode `T` in the input — that is the definition of pseudo-polynomial, and it's why the general SUBSET-SUM problem can be NP-complete yet still solvable here. (It *is* NP-complete in general: a guessed subset verifies in O(n) time so it's in NP, and Karp's reduction from Exact Cover/3-SAT shows NP-hardness.)
- Under this problem's constraints the numbers are tiny either way; say "about two million boolean updates, sub-millisecond" and move on.

## 7. Common mistakes (each with a concrete failing input)

| # | Mistake | Failing input | Fix |
|---|---|---|---|
| 1 | Halving without the parity check (`target = total // 2` unconditionally) | `[1,2,3,5]`: total 11, floor target 5, `{2,3}` reaches 5 → wrong `true` | `if total % 2: return False` **first** |
| 2 | Ascending inner loop | `[2,2,3,5]` (total 12, target 6): one pass over the first `2` sets `dp[2]`, then `dp[4]=2+2`, then `dp[6]=2+2+2` — reusing one physical 2 three times → wrong `true` (correct answer is `false`) | Iterate `s` from `target` **down** to `num` |
| 3 | `continue`-ing past elements with `num > target` | `[7,1,2,2]`: skipping the 7 silently ignores it → wrong `true` | Every element must live in one of the halves, so `num > target` ⇒ return `false` (pre-check `max(nums) > target`) |
| 4 | `dp = [False] * target` | any reaching case | Size must be `target + 1` — index `target` must exist |
| 5 | Inner-loop bound typo, e.g. `range(target, num, -1)` | misses `s == num` (subset consisting of `num` alone, like `{11}` in Example 1) | `range(target, num - 1, -1)` |
| 6 | Forgetting `dp[0] = True` | everything stays False | The empty subset sums to 0; it's the base case |
| 7 | 2D off-by-one: writing `nums[i]` in a recurrence whose row `i` means "first `i` items" | `[1,5,11,5]` misses the last element | 0-indexed array vs 1-indexed rows: recurrence uses `nums[i-1]` |
| 8 | Worrying that duplicates need special handling | Example 1 has two 5s | None needed — each occurrence is an independent item, usable once each; the DP handles it for free |
| 9 | Greedy (sort desc, balance piles) | `[3,3,2,2,2]`: greedy lands 7/5 but `{3,3}`/`{2,2,2}` = 6/6 exists | Feasibility isn't locally greedy; use the reachability DP |

## 8. Language-specific gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| **C++** | The idiomatic fast path is `std::bitset<10001> r; r[0] = 1; for (int x : nums) r \|= r << x;` — but the size is a **compile-time constant** (10,001 suffices only because `target ≤ 10,000` by these constraints). If you use `std::vector<bool>` instead, its bit-packed proxy references make the inner update loop noticeably slower than `std::vector<char>`. |
| **Java** | `java.util.BitSet` has **no shift-left-and-OR primitive**, so the bitset trick requires manual `long[]` word manipulation — usually not worth it; a plain `boolean[] dp` is the right call. If memoizing top-down, avoid `Map<Integer, Boolean>` (autoboxing ~2M states); use `Boolean[n+1][target+1]` or a flat array. |
| **Overflow (both)** | Here `total ≤ 20,000` fits an `int` trivially — but in generalized versions (values up to ~10⁹) sum into `long long` / `long` *before* halving. |
| **Python** | For the top-down version, `lru_cache` must wrap the nested function and use `maxsize=None`; recursion depth ≤ 200 is safe under the default 1000 limit. |

## 9. Test cases to propose out loud

State these before (or right after) coding — it signals maturity:

| Test | Input | Expected | What it catches |
|---|---|---|---|
| Official 1 | `[1,5,11,5]` | `true` | Basic positive case; single-element half `{11}` |
| Official 2 | `[1,2,3,5]` | `false` | Odd total → parity gate |
| Single element | `[2]` (or `[1]`) | `false` | One half gets the element, the other is empty (sum 0 ≠ 2); my code: target 1 < max 2 → false |
| Minimal true | `[1,1]` | `true` | Smallest split |
| **Even total, no split** | `[2,2,3,5]` | `false` | Total 12 is even but 6 is unreachable — kills "only check parity" solutions *and* the ascending-loop bug (see §7 #2) |
| Element == target | `[6,1,2,3]` | `true` | One-element subset reaching the target |
| Element > target | `[7,1,2,2]` | `false` | Exercises the `max > target` early return |
| Max-size stress | `[100] × 200` | `true` | Total 20,000, target 10,000 = 100 elements of 100; performance sanity |

## 10. Transferable patterns & related problems

Patterns to bank:

1. **Reduction to subset sum via a target invariant.** Any "split/balance into two equal parts" question becomes "does a subset hit `total/2`?" Choosing the right invariant (`total/2` here, `(total + target)/2` in Target Sum) is the whole trick.
2. **Feasibility DP over reachable sums** — boolean OR recurrence, seeded at 0 — as opposed to optimization (min/max) knapsacks.
3. **1D space compression + loop direction as semantics:** descending = 0/1 (each item once), ascending = unbounded (items reusable). This single idiom recurs across the entire knapsack family.
4. **Bitset acceleration** for any "which sums are reachable" DP with bounded totals.
5. **Pseudo-polynomial DP tames NP-hard problems** when numeric bounds are small — worth naming explicitly in interviews.

| Related problem | Relationship |
|---|---|
| LC 494 — Target Sum | Assigning +/− ⇔ choosing a subset with sum `(total + target)/2`; same parity gate, plus zero-element counting subtleties |
| LC 1049 — Last Stone Weight II | Minimize the final stone ⇔ find the largest achievable sum ≤ `total/2`; identical DP, track the best instead of testing one target |
| LC 698 — Partition to K Equal Sum Subsets | This problem is the k = 2 case; k ≥ 3 needs backtracking/bitmask DP and is NP-hard in general — it contains 3-PARTITION, which is strongly NP-complete (Garey–Johnson), so no pseudo-polynomial algorithm exists there unless P = NP |
| LC 322 — Coin Change | The contrast case: coins are reusable ⇒ **ascending** loop (unbounded knapsack) |
| Classic: Minimum Subset Sum Difference | After the same DP, answer = `min |total − 2s|` over reachable `s ≤ total/2` |

## 11. Full interview talk-track (script)

> "Let me restate to make sure I have it: split *all* of `nums` into two groups, each element used exactly once, equal sums — sizes can differ.
>
> Key reframe: if both halves are equal, each is `total / 2`, so I only need to ask whether **some** subset sums to `total / 2` — the complement is then automatically the other half. And if the total is odd, I return false immediately; there's no integer half.
>
> Brute force is include/exclude recursion, 2-to-the-n; with n up to 200 that's hopeless, but the states collapse to (index, remaining), at most about 200 × 10,000 — so a knapsack-style DP is the right tool.
>
> I'll do the space-optimized 1D version: `dp[s]` means 'some subset of what I've seen so far sums to exactly s', seeded with `dp[0] = true` for the empty subset. For each number I sweep s from target **down** to that number and set `dp[s]` true whenever `dp[s − num]` is true. Descending is essential — it guarantees each element is used at most once; ascending would silently allow reuse, the unbounded-knapsack bug.
>
> Two cheap prunes: if any element exceeds the target it can't fit in *either* half, so false; and early-exit once `dp[target]` flips.
>
> Complexity: O(n × target) time — at most about two million boolean updates — and O(target) space, so a 10,001-entry boolean array. There's also a bitset trick, `mask |= mask << num`, that does it ~64× faster.
>
> Tests I'd run: the two official examples, a single element, `[1,1]`, and importantly an even-total-but-false case like `[2,2,3,5]` to make sure I'm not just checking parity.
>
> Ready to code."

## 12. Say it in 60 seconds

> "Equal halves means each side sums to half the total — so first, if the total is odd, return false. Otherwise this becomes subset sum: does any subset hit `total / 2`? The complement automatically forms the other half.
>
> With n up to 200 and values up to 100, the target is at most 10,000, so I'll run the standard 0/1-knapsack feasibility DP: a boolean array where `dp[s]` means 'some subset sums to s', seeded `dp[0] = true`. For each number, sweep s from target **down** to that number — descending, so each element is used at most once — setting `dp[s]` true whenever `dp[s − num]` is true. Answer is `dp[target]`. I'll also prune: any element bigger than the target can't fit in either half, so false.
>
> O(n × target) time — about two million steps — O(target) space. Tests: odd total, a single element, and an even-total-but-impossible case like `[2,2,3,5]`."

*(60 seconds, recitable. The load-bearing phrases: "odd → false," "subset hits total/2, complement is free," "descending loop = each element once," "element > target → false.")*
