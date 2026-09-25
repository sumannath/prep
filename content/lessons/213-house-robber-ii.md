# House Robber II — Complete Interview Lesson

## 1. Problem Restatement

You have `n` houses arranged in a **circle**, house `i` holding `nums[i]` money. You may rob any set of houses as long as **no two adjacent houses are both robbed** — and because it's a circle, house `0` and house `n−1` are also adjacent (the "seam" edge). Return the maximum total loot.

What the interviewer is really testing:

- Do you recognize this as the classic **House Robber I** DP with **one extra constraint** that couples the two ends of the array?
- Can you **decompose the circular case into linear cases** cleanly, with a correct argument?
- Do you catch the degenerate edge cases (`n = 1`, `n = 2`) that the circle creates?

**Indices vs. values, up front:** all reasoning below is about **indices**. Example 1, `[2,3,2]`, has two houses with the *same value* 2 (indices 0 and 2) — they are still two distinct houses, and in a circle of size 3 they are **adjacent** (`0` and `2` are neighbors via the seam), so they cannot both be robbed. Duplicated values never merge.

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= nums.length <= 100` | Tiny `n`. Even `O(n³)` would pass, but the expected "senior" answer is `O(n)` time / `O(1)` space. It also means **`n = 1` and `n = 2` must work** — and the circle makes these degenerate (see §7). |
| `0 <= nums[i] <= 1000` | Values are **non-negative**, so "rob nothing" (total 0) is always a valid baseline — DP initialized with 0 is safe. Max loot ≤ ⌈100/2⌉ × 1000 = **50,000**, which fits comfortably in a 32-bit `int` (relevant for Java/C++; no `long` needed). |
| Circle semantics | The adjacency pairs are `(i, i+1)` for `0 ≤ i < n−1` **plus** `(n−1, 0)`. For `n ≤ 3`, *every* pair of distinct indices is adjacent (in a 3-cycle the edges are 0–1, 1–2, 2–0), so the answer must be `max(nums)` — a handy sanity property. |
| Duplicate values allowed | Irrelevant to correctness. We track index subsets, not value multisets. |

---

## 3. Brute Force (with a Worked Trace)

**Idea:** enumerate every rob/skip subset of the `n` houses, reject any subset containing an adjacent pair — including the wrap-around pair `(0, n−1)` — and take the best sum.

**Worked trace on Example 1, `nums = [2,3,2]`** (subsets are **index sets**; in a 3-cycle, indices 0–1, 1–2, and 2–0 are all adjacent):

| Subset (indices) | Adjacent pair inside the circle? | Sum |
|---|---|---|
| `{}` | — | 0 |
| `{0}` | none | 2 |
| `{1}` | none | **3** |
| `{2}` | none | 2 |
| `{0,1}` | (0,1) adjacent → alarm | invalid |
| `{1,2}` | (1,2) adjacent → alarm | invalid |
| `{0,2}` | (2,0) adjacent **through the seam** → alarm | invalid |
| `{0,1,2}` | multiple | invalid |

Max = **3**. Note that `{0,2}` is exactly the subset the *linear* problem would happily allow — the circle kills it.

**Complexity:** `O(2ⁿ)` subsets. For `n = 100` that is 2¹⁰⁰ ≈ 1.3 × 10³⁰ candidate subsets; even at 10⁹ operations per second that's ~4 × 10¹³ years, so it is hopeless for these constraints.

**Where the plain linear recursion breaks.** The linear version is:

```
rob(i) = max(rob(i+1), nums[i] + rob(i+2)),   rob(i ≥ n) = 0
```

Running it on the full circular array ignores the seam: the decision made at house 0 can't know whether house `n−1` ends up robbed. Tracing the recursion tree for the *linear* `[1,2,3,1]` shows both the answer (4) and the waste:

```
rob(0)
├── skip 0 → rob(1)
│   ├── skip 1 → rob(2)   ← recomputed below
│   │   ├── skip 2 → rob(3) = max(0, 1) = 1
│   │   └── rob 2  → 3 + rob(4) = 3      ⇒ rob(2) = 3
│   └── rob 1  → 2 + rob(3) = 2 + 1 = 3  ⇒ rob(1) = 3
└── rob 0  → 1 + rob(2) = 1 + 3 = 4
⇒ 4
```

`rob(2)` and `rob(3)` are each computed twice here; without memoization the tree doubles per house → `O(2ⁿ)`. Memoizing collapses it to `O(n)` — and memoizing the *circular* fix below *is* the optimal algorithm.

---

## 4. The Core Insight

The circle adds **exactly one** constraint the linear DP can't see: **house 0 and house n−1 cannot both be robbed.**

Therefore every feasible circular plan must **exclude at least one of the two seam houses**. Cut the circle at the seam and solve two independent *linear* problems:

- **Slice A:** houses `0 .. n−2` (exclude the last house) → classic House Robber I.
- **Slice B:** houses `1 .. n−1` (exclude the first house) → classic House Robber I.
- **Answer = max(Slice A, Slice B).**

**Why this is correct (the 30-second proof to give verbally):**

- **Feasibility (≤ direction):** each slice's optimum avoids one seam house, so it is a legal circular plan. Hence circular optimum ≥ max of the two slices.
- **Coverage (≥ direction):** take an optimal circular plan `S`. If it doesn't rob house 0, then `S` fits entirely in Slice B, so Slice B's optimum ≥ its total. If it does rob house 0, it cannot rob house `n−1`, so `S` fits in Slice A, and Slice A's optimum ≥ its total. Either way, max of slices ≥ circular optimum.

Both directions together give equality. (An equivalent decomposition — "case: rob house 0" vs. "case: skip house 0" — also works, but the two-slice version is more symmetric and has fewer places to make an arithmetic slip.)

---

## 5. Optimal Approach

**Linear recurrence.** For a slice, let `best(i)` = max loot using houses up to index `i`:

```
best(i) = max(best(i−1),            # skip house i
              best(i−2) + nums[i])  # rob house i (forces skipping i−1)
```

Only the last two values matter → two rolling variables:

- `prev` = best considering houses up to `i−2`
- `cur`  = best considering houses up to `i−1`

### Python solution (index ranges, `O(1)` extra space)

```python
from typing import List

class Solution:
    def rob(self, nums: List[int]) -> int:
        n = len(nums)
        if n == 1:
            return nums[0]  # both slices would be empty and return 0!
        return max(self._rob_linear(nums, 0, n - 1),  # houses 0 .. n-2
                   self._rob_linear(nums, 1, n))      # houses 1 .. n-1

    def _rob_linear(self, nums: List[int], lo: int, hi: int) -> int:
        """Max sum of non-adjacent houses in nums[lo:hi] (half-open range)."""
        prev, cur = 0, 0
        for i in range(lo, hi):
            prev, cur = cur, max(cur, prev + nums[i])
        return cur
```

Readable variant (trades `O(1)` space for `O(n)` slice copies — fine at `n ≤ 100`, but be honest about the space):

```python
def rob(self, nums: List[int]) -> int:
    if len(nums) == 1:
        return nums[0]
    def linear(houses):
        prev = cur = 0
        for x in houses:
            prev, cur = cur, max(cur, prev + x)
        return cur
    return max(linear(nums[:-1]), linear(nums[1:]))
```

### Traces on the official examples

**Example 1 — `nums = [2,3,2]`** (n = 3; Slice A = indices 0–1, Slice B = indices 1–2):

| Slice | i | value | prev | cur | prev+value | new cur | (prev, cur) after |
|---|---|---|---|---|---|---|---|
| A `[2,3]` | 0 | 2 | 0 | 0 | 2 | 2 | (0, 2) |
| A | 1 | 3 | 0 | 2 | 3 | 3 | (2, 3) |
| B `[3,2]` | 1 | 3 | 0 | 0 | 3 | 3 | (0, 3) |
| B | 2 | 2 | 0 | 3 | 2 | 3 | (3, 3) |

`max(3, 3) = 3` ✓ — note index 0 (value 2) and index 2 (value 2) can never combine through the seam.

**Example 2 — `nums = [1,2,3,1]`**:

| Slice | i | value | prev | cur | prev+value | new cur | (prev, cur) after |
|---|---|---|---|---|---|---|---|
| A `[1,2,3]` | 0 | 1 | 0 | 0 | 1 | 1 | (0, 1) |
| A | 1 | 2 | 0 | 1 | 2 | 2 | (1, 2) |
| A | 2 | 3 | 1 | 2 | **4** | 4 | (2, 4) |
| B `[2,3,1]` | 1 | 2 | 0 | 0 | 2 | 2 | (0, 2) |
| B | 2 | 3 | 0 | 2 | 3 | 3 | (2, 3) |
| B | 3 | 1 | 2 | 3 | 3 | 3 | (3, 3) |

Slice A's **4** = rob indices 0 and 2 (values `1 + 3`) — matching the official explanation. `max(4, 3) = 4` ✓.

**Example 3 — `nums = [1,2,3]`**:

| Slice | i | value | prev | cur | prev+value | new cur | (prev, cur) after |
|---|---|---|---|---|---|---|---|
| A `[1,2]` | 0 | 1 | 0 | 0 | 1 | 1 | (0, 1) |
| A | 1 | 2 | 0 | 1 | 2 | 2 | (1, 2) |
| B `[2,3]` | 1 | 2 | 0 | 0 | 2 | 2 | (0, 2) |
| B | 2 | 3 | 0 | 2 | 3 | 3 | (2, 3) |

`max(2, 3) = 3` ✓ — the linear answer would be 4 (indices 0 + 2); the seam forbids it.

---

## 6. Complexity

| Approach | Time | Extra Space | Notes |
|---|---|---|---|
| Subset enumeration | `O(2ⁿ)` | `O(n)` | 2¹⁰⁰ ≈ 10³⁰ — dead on arrival for n = 100 |
| Naive recursion (no memo) | `O(2ⁿ)` | `O(n)` stack | Exponential blow-up from recomputation (§3 tree) |
| Top-down with memo (two slices) | `O(n)` | `O(n)` | ≤ 2n distinct `(i, slice)` states |
| **Two-pass rolling DP (this solution)** | **`O(n)`** | **`O(1)`** | Two linear passes, two variables each; `O(n)` only if you slice/copy |

`O(n)` is optimal: any correct algorithm must examine every one of the `n` values at least once in the worst case, because a single unread value could be the one that changes the best plan, so `Ω(n)` is a hard floor and we match it.

---

## 7. Test Cases to Propose Out Loud

Announce these *before* coding — it signals you understand the circle's edge behavior.

| Test | Expected | Why it's interesting |
|---|---|---|
| `[2,3,2]` | 3 | Official Ex. 1; duplicate values at indices 0, 2 that are **adjacent via the seam** |
| `[1,2,3,1]` | 4 | Official Ex. 2 |
| `[1,2,3]` | 3 | Official Ex. 3; circle changes the linear answer (4 → 3) |
| `[5]` | **5** | **n = 1**: both slices are empty → naive code returns 0. The #1 bug in this problem. (Also `[0]` → 0.) |
| `[10,3]` (and `[3,10]`) | 10 | **n = 2**: the pair is adjacent (doubly so, through the seam); slices of size 1 handle it — verify, don't hand-wave |
| `[2,7,9,3,1]` | **11** | The circle actually *bites*: linear answer is 12 (`2+9+1`, indices 0,2,4), but index 4 neighbors index 0 → best is 11 (indices 0,2 or 1,3) |
| `[0,0,0,0]` | 0 | All zeros; nothing to rob, no crash |
| 100 houses alternating `[1000, 0, 1000, 0, …]` | 50,000 | Max-size/max-value sanity check; confirms the 32-bit-`int`-safe bound for Java/C++ |

Quick verbal sanity property: for `n ≤ 3` the answer must equal `max(nums)` (every pair of houses is adjacent in a cycle of size ≤ 3). Examples 1 and 3 both satisfy it.

---

## 8. Common Mistakes

1. **Missing `n == 1`.** `nums[:-1]` and `nums[1:]` are both empty → both slices return 0 → answer 0 instead of `nums[0]`. LeetCode tests this.
2. **Running one linear DP over all `n` houses and "patching" the seam afterward.** Doesn't work: the decision at house 0 depends on whether house `n−1` gets robbed. The fix must happen at the *top* (two slices), not as a post-processing step.
3. **Slice off-by-one / convention confusion.** With a half-open helper, the calls are `(0, n−1)` and `(1, n)`. If your helper is inclusive `[lo, hi]`, they must be `(0, n−2)` and `(1, n−1)`. Mixing conventions (e.g., an inclusive call `(0, n−1)`) puts *both* seam houses in one slice, where the linear logic will happily rob both — silently wrong.
4. **"Force-rob house 0" decomposition done wrong** — forgetting to add `nums[0]`, or forgetting to exclude *both* neighbors (houses 1 and `n−1`) in that case.
5. **Sequential-assignment bug when leaving Python.** `prev, cur = cur, max(cur, prev + x)` uses the *old* `cur`. In Java/C++ you must save the old `cur` first; writing `cur = max(cur, prev + x); prev = cur;` propagates the new value — a classic port bug (see §9).
6. **Claiming `O(1)` space while slicing.** `nums[:-1]` and `nums[1:]` each copy up to `n−1` elements → `O(n)` extra space. Fine here, but say "index-range version for O(1)" if you claim O(1).
7. **Mutating `nums` during the first pass** (e.g., zeroing robbed values in place), then running the second slice over corrupted data. Keep the helper read-only.

---

## 9. Language Gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| Python | Tuple assignment `prev, cur = cur, max(...)` is atomic w.r.t. the old `cur` — the convenience that causes bug #5 in other languages. Slices copy (`O(n)` space). `functools.lru_cache` top-down is fine at `n ≤ 100` (depth ≈ 100, well under the default recursion limit). |
| Java | `Arrays.copyOfRange(nums, lo, hi)` copies — harmless at `n ≤ 100`, but an index-range helper avoids it; `List.subList(lo, hi)` is a *view*, not a copy. If memoizing, use an `int[] memo`, not `HashMap<Integer, Integer>` (avoids `Integer` autoboxing overhead per lookup). `int` is safe: max answer ≤ 50,000, no `long` needed. |
| C++ | Pass `(const std::vector<int>&, int lo, int hi)` rather than constructing sub-vectors. Beware unsigned underflow: `nums.size() - 1` underflows if the vector is empty on a defensive path — write `int n = static_cast<int>(nums.size());` and guard `n == 1` first. Save the old `cur` before updating it (no tuple assignment). `int` is safe (≤ 50,000). |

---

## 10. Transferable Patterns & Related Problems

The two reusable moves here:

- **"Cut the circle":** one constraint couples the two ends → split into cases that each *drop one end*, solve linearly, take the max. Requires the two cases to **cover** all valid solutions and each to be **feasible**.
- **Skip/rob rolling DP:** `best(i) = max(best(i−1), best(i−2) + gain(i))` — a Fibonacci-shaped recurrence with a choice at each step.

| Related problem | Connection |
|---|---|
| LC 198 — House Robber | The linear subroutine; do this one first |
| LC 337 — House Robber III | Same rob/skip choice, but on a tree (rob node ⇒ skip children) |
| LC 740 — Delete and Earn | Convert values to a gain array, then it's House Robber I |
| LC 918 — Maximum Sum Circular Subarray | Also "breaks the circle," but with the trick `max = total − minSubarray` — a *contrast* worth knowing: different circle, different seam surgery |
| Best Time to Buy/Sell Stock series | Same rolling-variable state-machine style (`O(1)` space over last states) |
| Generic "max sum of non-adjacent elements (circular)" | This exact problem, relabeled |

---

## 11. Interview Talk Track (Full Script)

> "Let me restate: houses in a **circle**, no two **adjacent** houses robbed, maximize loot. The key word is *circle* — compared to the classic House Robber, there's exactly one new constraint: house 0 and house n−1 are neighbors.
>
> Brute force would try all 2ⁿ subsets and filter out any containing adjacent indices, including the seam pair — that's exponential and hopeless at n = 100.
>
> The observation that unlocks it: **any legal plan must skip at least one of the two seam houses** — house 0 or house n−1. So I cut the circle at the seam and solve **two independent linear problems**: the array without the last house, and the array without the first house. The answer is the max of the two. Correctness in one line: each slice's optimum is legal in the circle, and any optimal circular plan fits fully inside one of the two slices — so the max of the slices equals the circular optimum.
>
> Each slice is the standard recurrence: `best(i) = max(best(i−1), best(i−2) + nums[i])` — skip house i, or rob it and inherit the answer from i−2. Only the last two values matter, so I keep two rolling variables: **O(n) time, O(1) space per pass, two passes total**.
>
> Edge cases I'll handle: **n = 1** — both slices would be empty and return 0, so I special-case it to return `nums[0]`. **n = 2** works automatically: the slices are single houses, and I take the max. Values are non-negative, so initializing the rolling variables at 0 — meaning 'rob nothing' — is a safe baseline.
>
> [Write the helper + two calls, trace `[1,2,3,1]` briefly: slice A gives 4 via indices 0 and 2, slice B gives 3, answer 4.]
>
> Quick tests I'd run: the three official examples, the single house `[5]` → 5, a two-house case, and `[2,7,9,3,1]` → 11, where the circle knocks the linear answer of 12 down to 11 because indices 0 and 4 are neighbors.
>
> Total: O(n) time, O(1) space."

---

## 12. Say It in 60 Seconds

> "This is House Robber I plus **one extra edge**: in a circle, the first and last houses are neighbors. That seam is the only thing the linear DP can't handle. Every valid plan must skip at least one of the two seam houses — house 0 or house n−1 — so I solve **two linear problems**: the array without the last house, and the array without the first house, and return the **max**. Each is the classic recurrence — `best(i) = max(best(i−1), best(i−2) + nums[i])` — run with two rolling variables, so O(n) time and O(1) space per pass, two passes total. One edge case to call out: **a single house** — both slices would be empty and return 0, so I special-case n == 1 to return `nums[0]`. That's it: cut the circle, solve each line, take the max — O(n) time, O(1) space."
