# Combination Sum II (LeetCode 40) — Complete Interview Lesson

## 1. Problem in your own words

Restate it like this in the interview:

> "I'm given a multiset of positive integers and a target. I need to return every **multiset** (order doesn't matter) of elements whose values sum to the target, where **each element — by index — is used at most once**. The input itself may contain repeated values, and the output must contain no duplicate combinations."

Three traps hidden in that restatement, worth saying out loud:

1. **"Each number used once" means once per *index*, not once per *value*.** If the input is `[1, 1, 6]`, a combination may legitimately contain the value `1` twice — those are two different array elements. What's forbidden is using the *same array slot* twice.
2. **Combinations are order-free.** `[1, 7]` and `[7, 1]` are the same combination; the output must contain it once.
3. **The input is not sorted** (see Example 1) **and contains duplicates**. Both facts drive the algorithm.

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `candidates.length ≤ 100` | Tiny n. A backtracking DFS is fine; a naive `2^100` subset enumeration is not. |
| `1 <= candidates[i] <= 50` | **All values are strictly positive.** This is what makes "sort, then `break` when a candidate exceeds the remaining target" valid — partial sums only grow. (If negatives or zeros were allowed, that pruning dies; see §12 follow-ups.) |
| `target ≤ 30` | Any valid combination has **at most 30 elements** (each take reduces the remainder by ≥ 1). Recursion depth ≤ 31 — no stack concerns in any language. Also: any element with value `> target` is dead weight and can be pre-filtered, and you never need more than `target // value` copies of any value. |
| Output size | Every valid combination is a partition of `target` into parts ≤ 30, and distinct combinations are distinct partitions — so the output has at most `p(30) = 5,604` combinations (standard partition-count value; computable via the recurrence `p(n,k) = p(n−1,k−1) + p(n−k,k)`). **The answer is small even in the worst case.** That's the hidden gift of `target ≤ 30`. |

The n = 100 / target = 30 pairing is the whole design signal: **the search must be pruned by the target, not by n**, and the output — not the input — is what the runtime should be measured against.

---

## 3. Brute force: enumerate every subset, dedupe after the fact

Every combination is a subset of indices, so the honest baseline is: generate all `2^n` index-subsets, keep those summing to `target`, canonicalize (sort each), and stuff into a set to kill duplicates.

```python
from itertools import combinations

def combination_sum2_bruteforce(candidates: list[int], target: int) -> list[list[int]]:
    n = len(candidates)
    seen: set[tuple[int, ...]] = set()
    for r in range(n + 1):
        for idxs in combinations(range(n), r):        # subsets of *indices*
            vals = [candidates[i] for i in idxs]
            if sum(vals) == target:
                seen.add(tuple(sorted(vals)))          # canonical form → dedup
    return [list(t) for t in sorted(seen)]
```

**Worked trace** on a deliberately small duplicate-heavy input, `candidates = [1, 1, 2]`, `target = 3` (call the two 1s `a` and `b`):

```text
rec over indices a, b, c — include/exclude tree:

rec(0, sum=0)
├─ take a(1) → sum=1
│   ├─ take b(1) → sum=2
│   │   ├─ take c(2) → sum=4  ✗
│   │   └─ skip c    → sum=2  ✗
│   └─ skip b       → sum=1
│       ├─ take c(2) → sum=3  ✓ record (a,c) → sorted tuple (1,2)
│       └─ skip c    → sum=1  ✗
└─ skip a → sum=0
    ├─ take b(1) → sum=1
    │   ├─ take c(2) → sum=3  ✓ record (b,c) → sorted tuple (1,2)   ← DUPLICATE of (1,2)
    │   └─ skip c    → sum=1  ✗
    └─ skip b → sum=0
        ├─ take c(2) → sum=2 ✗
        └─ skip c    → sum=0 ✗

Canonical set: {(1,2)}  →  output [[1,2]]
```

Note what the trace exposes: **two different index-subsets, `(a,c)` and `(b,c)`, collapse to one combination** — the brute force does the work twice and then throws half of it away.

**Why it dies here:** the recursion tree has up to `2^n` leaves; at n = 100 that's `2^100 ≈ 1.27 × 10^30` subsets (since `2^10 ≈ 10^3`), i.e., roughly `4 × 10^13` years at one subset per nanosecond. Three fixable wastes:

1. **No pruning** — we keep adding to subsets whose sum already exceeds `target` (positivity means they can never recover).
2. **Duplicate work** — symmetric choices (first `1` vs. second `1`) generate identical multisets.
3. **Post-hoc dedup** — sorting + hashing every hit instead of never creating duplicates.

---

## 4. The core insight

Four moves turn the brute force into the canonical solution:

1. **Sort first.** Sorting is the single load-bearing step. It (a) makes equal values adjacent, enabling a one-line structural dedup, and (b) makes the array monotone, so once `candidates[i] > remaining`, *every* later candidate is too — you can `break` out of the whole loop, not just `continue`.
2. **Recurse over indices with a `start` bound.** Passing `start = i + 1` (not `0`, not `start + 1`, not `i`) does two jobs at once: it enforces "each index used at most once," and it restricts choices to later positions so every built sequence is non-decreasing — which means **each multiset is generated in exactly one order** (its sorted order). Permutation-duplicates like `[1,7]` vs `[7,1]` become structurally impossible.
3. **Skip same-level duplicates: if `i > start` and `candidates[i] == candidates[i-1]`, skip.** This is the heart of the problem. The guard is an **index** comparison (`i > start`) attached to a **value** comparison (`candidates[i] == candidates[i-1]`) — keep those straight.
   - *Why skipping is safe:* at a fixed recursion node, choosing occurrence `j` of value `v` instead of the first available occurrence `i` adds the same value to the path and leaves a subset of the remaining elements available, so every completion reachable through `j` is also reachable through the first occurrence. Skipping later duplicates loses nothing.
   - *Why `i > start` and not `i > 0`:* `i == start` means this is the **first choice at this depth** — the equal value at `i-1` was consumed at a *shallower* depth and is already in the path, so taking another copy is exactly how `[1,1,6]` gets built. Guarding with `i > 0` instead is the single most common wrong submission for this problem.
   - *Bonus:* this rule is a performance feature, not just correctness. Without it, `candidates = [1]*100, target = 30` produces one path per increasing index sequence — `C(100,30) ≈ 2.9 × 10^25` nodes (binomial arithmetic) — while with it, the same input is a single chain of ~30 nodes.
4. **Thread `remaining` through the recursion** instead of recomputing `sum(path)` at every node: O(1) feasibility checks and a clean base case (`remaining == 0` → record).

---

## 5. Optimal algorithm: sort + DFS with structural dedup

```python
def combinationSum2(candidates: list[int], target: int) -> list[list[int]]:
    candidates.sort()                    # mutates input; use sorted(candidates) if that's not OK
    n = len(candidates)
    results: list[list[int]] = []
    path: list[int] = []

    def dfs(start: int, remaining: int) -> None:
        if remaining == 0:               # base case: current path is a valid combination
            results.append(path.copy())  # MUST copy — see §9/§10
            return
        for i in range(start, n):
            # (1) same-level duplicate skip: allow only the FIRST occurrence of a
            #     value at this depth. i == start is exempt (chain equal values).
            if i > start and candidates[i] == candidates[i - 1]:
                continue
            # (2) sorted + positive ⇒ everything from i onward is too big
            if candidates[i] > remaining:
                break
            path.append(candidates[i])
            dfs(i + 1, remaining - candidates[i])   # i + 1: each index used once
            path.pop()                              # undo — backtrack

    dfs(0, target)
    return results
```

**Precision checklist — indices vs. values:**

- `start`, `i`, `i + 1` are **indices**; `remaining`, `candidates[i]`, `target` are **values**. Never compare one to the other. The dedup test deliberately mixes them: the *guard* (`i > start`) is index-based, the *equality* (`candidates[i] == candidates[i-1]`) is value-based.
- `dfs(i + 1, ...)`: `+1` = "this index is spent" (Combination Sum II). `dfs(i, ...)` would allow reuse (that's Combination Sum I). `dfs(start + 1, ...)` or `dfs(0, ...)` lets later branches re-pick earlier elements → permutation duplicates.
- Invariants worth stating to the interviewer: `path` is always non-decreasing; `0 ≤ remaining` at every node (guaranteed by the `break`); each value-multiset is constructed by exactly one root-to-node path (its sorted arrangement), so each valid combination is emitted exactly once with no post-hoc dedup.

---

## 6. Traces on the official examples

### Example 1 — `candidates = [10,1,2,7,6,1,5]`, `target = 8`

After sorting: indices `0:1, 1:1, 2:2, 3:5, 4:6, 5:7, 6:10`.

```text
dfs(start=0, rem=8, path=[])
├─ i=0, v=1  take → dfs(start=1, rem=7, path=[1])
│   ├─ i=1, v=1  (i == start ⇒ ALLOWED even though v == candidates[0])
│   │        take → dfs(start=2, rem=6, path=[1,1])
│   │    ├─ i=2, v=2  take → dfs(start=3, rem=4, path=[1,1,2])
│   │    │       └─ i=3, v=5 > 4 → break ✗
│   │    ├─ i=3, v=5  take → dfs(start=4, rem=1, path=[1,1,5])
│   │    │       └─ i=4, v=6 > 1 → break ✗
│   │    ├─ i=4, v=6  take → rem = 0 → ✅ record [1,1,6]
│   │    └─ i=5, v=7 > 6 → break ✗
│   ├─ i=2, v=2  take → dfs(start=3, rem=5, path=[1,2])
│   │    ├─ i=3, v=5  take → rem = 0 → ✅ record [1,2,5]
│   │    └─ i=4, v=6 > 5 → break ✗
│   ├─ i=3, v=5  take → dfs(start=4, rem=2, path=[1,5])  → 6>2 break ✗
│   ├─ i=4, v=6  take → dfs(start=5, rem=1, path=[1,6])  → 7>1 break ✗
│   ├─ i=5, v=7  take → rem = 0 → ✅ record [1,7]
│   └─ i=6, v=10 > 7 → break ✗
│
├─ i=1, v=1  candidates[1]==candidates[0] and i > start=0 ⇒ SKIP ⤺
│            (this branch could only re-derive the i=0 subtree)
│
├─ i=2, v=2  take → dfs(start=3, rem=6, path=[2])
│   ├─ i=3, v=5  take → dfs(start=4, rem=1, path=[2,5])  → 6>1 break ✗
│   ├─ i=4, v=6  take → rem = 0 → ✅ record [2,6]
│   └─ i=5, v=7 > 6 → break ✗
├─ i=3, v=5  take → dfs(start=4, rem=3, path=[5])        → 6>3 break ✗
├─ i=4, v=6  take → dfs(start=5, rem=2, path=[6])        → 7>2 break ✗
├─ i=5, v=7  take → dfs(start=6, rem=1, path=[7])        → 10>1 break ✗
└─ i=6, v=10 > 8 → break ✗

Emitted in order: [1,1,6], [1,2,5], [1,7], [2,6]   ✔ matches expected output
```

Note the two mechanisms doing their jobs: the **skip at `i=1`** is exactly why `[1,7]`, `[1,2,5]`, `[1,1,6]` each appear once despite two 1s in the input; the **breaks** kill whole suffixes (e.g., everything containing `10` is never even attempted).

### Example 2 — `candidates = [2,5,2,1,2]`, `target = 5`

After sorting: indices `0:1, 1:2, 2:2, 3:2, 4:5`.

```text
dfs(start=0, rem=5)
├─ i=0, v=1  take → dfs(start=1, rem=4, path=[1])
│   ├─ i=1, v=2  (i == start ⇒ allowed) take → dfs(start=2, rem=2, path=[1,2])
│   │    ├─ i=2, v=2  (i == start ⇒ allowed) take → rem=0 → ✅ [1,2,2]
│   │    ├─ i=3, v=2 == candidates[2], i > start ⇒ SKIP
│   │    └─ i=4, v=5 > 2 → break ✗
│   ├─ i=2, v=2 == candidates[1], i > start=1 ⇒ SKIP   ← otherwise [1,2,2] appears again
│   ├─ i=3, v=2 == candidates[2], i > start=1 ⇒ SKIP
│   └─ i=4, v=5 > 4 → break ✗
├─ i=1, v=2  take → dfs(start=2, rem=3, path=[2])
│   ├─ i=2, v=2  take → dfs(start=3, rem=1, path=[2,2])  → i=3: 2>1 break ✗
│   ├─ i=3, v=2  dup-skip
│   └─ i=4, v=5 > 3 → break ✗
├─ i=2, v=2  dup-skip (i > start=0)
├─ i=3, v=2  dup-skip
└─ i=4, v=5  take → rem=0 → ✅ [5]

Emitted: [1,2,2], [5]   ✔
```

Example 2 is the best illustration of the `i == start` exemption: **three consecutive 2s**, and the only way to build `[1,2,2]` is to be allowed to take equal values at *consecutive depths* — while still skipping them as *siblings at the same depth*.

---

## 7. Complexity

Let `n = len(candidates)`, `k` = number of combinations in the output, `L` = maximum combination length (`L ≤ min(n, target) = 30` here).

| Component | Cost | Notes |
|---|---|---|
| Sort | `O(n log n)` | trivial at n = 100 |
| Search-tree size — **general worst case** | `O(2^n)` nodes | safe answer if the interviewer lifts the `target ≤ 30` constraint (e.g., all-distinct values, huge target → the tree enumerates subsets) |
| Search-tree size — **under these constraints** | ≤ `Σ_{s=0..30} p(s) ≈ 2.9 × 10⁴` nodes | with the dedup rule, each node's path is a distinct value-multiset with sum ≤ target (one root-to-node path per non-decreasing arrangement); these are partition prefixes, and `Σ_{s≤30} p(s) = 28,629` from the standard partition recurrence |
| Work per node | `O(n)` worst case (scanning past duplicate runs), typically far less | |
| Copy per recorded combination | `O(L)` | |
| **Total time** | `O(n log n + tree · n + k·L)`; quote `O(2^n · L)` as the general worst case | under the actual constraints, roughly low-single-digit millions of elementary steps |
| Auxiliary space | `O(L)` — path + recursion stack, depth ≤ 31 | |
| Output space | `O(k · L)` | This is also a hard lower bound: any correct algorithm must write `k` combinations of length up to `L` into its answer, so `Ω(k·L)` time is unavoidable — no algorithm can beat the size of its own output. |

**Interview framing:** say "worst-case exponential in n in general — unavoidable when the output itself can be exponentially large — but here the runtime is output-sensitive: bounded by the number of combinations actually produced, which `target ≤ 30` caps in the low thousands." If only the *count* were needed (a common follow-up), a knapsack-style DP over `(distinct value index, remaining)` with transitions "take 0..c copies" runs in `O(#distinct · target · max multiplicity)` — polynomial — because counting avoids the exponential-sized output.

---

## 8. Alternative formulation: decide multiplicities per distinct value

Equivalent algorithm, often easier to explain and immune to the `i > start` subtlety: collapse the input into `(value, count)` pairs, then at each level choose how many copies of the current value to take (0 up to `min(count, remaining // value)`).

```python
from collections import Counter

def combination_sum2_multiset(candidates: list[int], target: int) -> list[list[int]]:
    items = sorted(Counter(candidates).items())          # [(value, multiplicity)] by value
    results: list[list[int]] = []
    path: list[int] = []

    def dfs(idx: int, remaining: int) -> None:
        if remaining == 0:
            results.append(path.copy())
            return
        if idx == len(items):
            return
        value, count = items[idx]
        for take in range(min(count, remaining // value) + 1):
            path.extend([value] * take)
            dfs(idx + 1, remaining - take * value)
            if take:
                del path[len(path) - take:]   # NOT `del path[-take:]`: with take==0 that
                                              # slice is path[0:] and clears the whole list
    dfs(0, target)
    return results
```

Same asymptotics, no adjacency trick needed. Mention it as a fallback; lead with the index version since it's the template interviewers expect and it generalizes to settings where you can't pre-count.

---

## 9. Common mistakes

| # | Mistake | Symptom / failing case | Fix |
|---|---|---|---|
| 1 | Recurse with `dfs(i, ...)` instead of `dfs(i + 1, ...)` | `[1]`, target 2 → `[[1,1]]` (reuse one element forever — that's Combination Sum I) | Always `i + 1` |
| 2 | Dedup guard written as `i > 0` instead of `i > start` | Example 1 silently loses `[1,1,6]` — the second 1 at depth 2 is wrongly skipped | Guard is "not the first choice **at this depth**" |
| 3 | No dedup guard at all | `[1,7]`, `[1,2,5]`, `[1,1,6]` each appear twice in Example 1 | Add the skip |
| 4 | Forgot to sort | Guard never fires (equal values aren't adjacent); `break` becomes unsound | Sort first, always |
| 5 | `break` on `candidates[i] > remaining` **without** sorting | Misses valid answers after one big early value | Sort, or use `continue` (slower but safe) |
| 6 | `results.append(path)` without copying (Python) | Every recorded combination is the *same live list* → all come out empty after the pops | `path.copy()` / `path[:]` |
| 7 | Forget `path.pop()` after the recursive call | Branches contaminate each other; sums drift; memory explodes | Append → recurse → pop, symmetric |
| 8 | Recurse with `start + 1` or `0` instead of `i + 1` | Permutation duplicates like `[7,1]` *and* `[1,7]`, or skipped elements | The recursion argument is always `i + 1` |
| 9 | Dedup by canonicalizing results into a set | Correct but wastes memory/time on duplicates already generated; signals the structural insight is missing | Structural skip; set only as an emergency fallback |
| 10 | Reading "each number used once" as "each *value* used once" | `[2,2]`, target 4 wrongly returns `[]` | Once per **index**; `i == start` lets equal values chain across depths |
| 11 | Returning `[[]]` when nothing matches | `[3,4]`, target 2 → expected `[]` | Only record when `remaining == 0` is reached via real takes; otherwise return the (possibly empty) list |

---

## 10. Implementation gotchas beyond Python

| Language | Gotcha |
|---|---|
| **Java** | If candidates arrive as `Integer[]`/`List<Integer>`, writing `candidates[i] == candidates[i-1]` compares **boxed references**, not values. Here it's extra treacherous: values ≤ 50 fall inside the autobox cache (−128..127), so `==` *appears to work in every test* while being wrong in general. Use `int[]` + `Arrays.sort`, or `.equals()`. Copy with `new ArrayList<>(path)`; remove with `path.remove(path.size() - 1)`. |
| **C++** | Take `vector<int>& path` and `vector<vector<int>>& out` **by reference** — passing them by value deep-copies the buffer on every recursive call (correct output, silent TLE). `out.push_back(path)` is the one *intentional* copy. Sums ≤ 100×50 = 5000 fit `int` comfortably, but if the variant scales values up, do arithmetic in `long long` before comparing to target. |
| **Python** | `results.append(path)` aliasing (row 6 above) is *the* classic silent failure: the final output prints as a list of empty lists. Also note `candidates.sort()` mutates the caller's list — use `cs = sorted(candidates)` if mutation is off-limits. |

---

## 11. Test cases to state out loud (before or while coding)

| # | Input | Expected output | What it verifies |
|---|---|---|---|
| 1 | `[10,1,2,7,6,1,5]`, target `8` | `[[1,1,6],[1,2,5],[1,7],[2,6]]` | Official: unsorted input, duplicate 1s |
| 2 | `[2,5,2,1,2]`, target `5` | `[[1,2,2],[5]]` | Official: three 2s must chain via `i == start` |
| 3 | `[3,4]`, target `2` | `[]` | Target below the minimum element → **empty list**, not `[[]]` |
| 4 | `[1]`, target `2` | `[]` | No reuse of a single element (catches bug #1) |
| 5 | `[2,2]`, target `4` | `[[2,2]]` | Equal values taken at consecutive depths — once |
| 6 | `[1,1,1,1]`, target `2` | `[[1,1]]` | Four identical values → exactly one combination |
| 7 | thirty `1`s, target `30` | `[[1,1,…,1]]` (length 30) | Max recursion depth; copy/pop symmetry under stress |

Say out loud, before coding: *"I'll assume output order doesn't matter (the judge accepts any order), though my sorted loop naturally emits lexicographic order, which makes the results easy to eyeball. Empty input can't occur per constraints, and an empty result set is a valid answer."*

---

## 12. Transferable patterns & related problems

The reusable skeleton here is **"backtracking over a sorted multiset with structural dedup"**:

- **Sort + monotone pruning:** whenever all values are positive and there's a budget (`remaining`), sorting lets you `break` the moment a candidate overshoots. Same move powers Combination Sum I/III, subset-sum enumeration, and k-Sum.
- **Same-level duplicate skip:** the `i > start and candidates[i] == candidates[i-1]` idiom is *the* canonical answer to "no duplicate outputs over duplicate inputs." It recurs almost verbatim in Subsets II and Permutations II (with a `used[]` twist).
- **`start` vs `i` vs `i+1` encodes the reuse rule:** `i` → unlimited reuse (Combination Sum I); `i + 1` → each index once (this problem); no `start`, plus a `used[]` array → order matters (permutations).
- **Structural dedup beats post-hoc dedup:** prevent duplicates at the point of choice rather than filtering results — it's both faster and the thing interviewers are actually testing.
- **Output-sensitive analysis:** when the answer can be exponentially large, quote complexity against output size, and cite the input caps (`target ≤ 30` → at most `p(30) = 5,604` combinations) to justify feasibility.

| Related problem | Delta from this one |
|---|---|
| Combination Sum (LC 39) | Reuse allowed → recurse with `i`, not `i + 1`; candidates distinct → no dedup skip |
| Subsets II (LC 90) | No target; identical sort + same-level-skip machinery |
| Permutations II (LC 47) | Order matters → `used[]` array; skip duplicate when the identical predecessor is unused |
| Combination Sum III (LC 216) | Fixed size `k`, values 1–9 distinct → dedup rule unnecessary; prune on length |
| Coin Change II (LC 518) | Only the **count** is needed → DP, `O(n·target)`, no enumeration |
| Combinations (LC 77) | Same `start`-index skeleton plus a size bound |

**Follow-up questions to be ready for:** negatives or zeros in the input (monotone `break` dies; you need explicit `remaining < 0`/`== 0` checks and a different termination argument, since the remainder is no longer monotone); "just count them" (DP, as in §7); n much larger (pre-filter values `> target` and cap each value's multiplicity at `target // value`, which shrinks the effective input to at most a few dozen useful elements when `target ≤ 30`).

---

## 13. Full interview talk track (~2 minutes, spoken)

> **Clarify (0:00–0:20).** "Quick checks: elements are used at most once *per occurrence*, so duplicate values in the input can both appear in one combination. Combinations are unordered, and the output must not repeat any multiset. Input isn't sorted."
>
> **Baseline (0:20–0:45).** "Naively I'd enumerate all `2^n` subsets, keep sums equal to target, and dedupe with a set. At n = 100 that's around `10^30` subsets — dead on arrival. And it wastes work twice: it never prunes overflowing sums, and it builds duplicate combinations just to throw them away."
>
> **Plan (0:45–1:30).** "So: sort first. Sorting gives me two superpowers — equal values become adjacent, which enables a one-line structural dedup, and monotonicity lets me `break` the loop the first time a candidate exceeds the remaining target. Then index-based DFS: I carry a `start` index and a running remainder. At each node I try candidates from `start` onward; taking candidate `i` recurses with `i + 1` — that's what enforces 'use each element once' and guarantees I only build non-decreasing sequences, so every multiset is built in exactly one order. The dedup line: if `i > start` and this value equals the previous one, skip — a later duplicate can only produce combinations the first occurrence already produced. But `i == start` is exempt, because taking an equal value at the next *depth* is exactly how `[1,1,6]` gets built."
>
> **Complexity (1:30–1:50).** "Worst case exponential in general, but here it's output-sensitive: the dedup rule means one tree node per distinct value-multiset, and since target ≤ 30 the answer is capped by the partition count of 30 — a few thousand combinations — with only O(depth) extra space for the path."
>
> **Tests → code (1:50–2:10).** "Cases I'd call out: target below the minimum returns empty; `[1]` with target 2 returns empty because reuse is banned; `[2,2]` with target 4 returns `[2,2]` exactly once. Then I code: sort, base case on remainder zero with a *copy* of the path, the skip, the break, append–recurse–pop."

---

## 14. Say it in 60 seconds

> "Combination Sum Two: find all unique groups of numbers summing to a target, where each element is used at most once — but the input can contain duplicate values, so 'once' means once per occurrence.
>
> My approach is sorted backtracking. I sort first because it gives me two things: duplicates become adjacent, and since all values are positive, the first candidate larger than the remaining target lets me break out of the loop entirely.
>
> I recurse over indices carrying a remainder and a start pointer. When I take an element I recurse from the next index — that plus-one is what enforces single use and guarantees each combination is built in sorted order, so no permutation duplicates. The dedup rule is one line: at any depth, if a value equals the previous one and it's not the first option at that depth, skip it — the later duplicate can only reach combinations the first occurrence already reached. That exemption for the first option is what still lets two 1s make two.
>
> Runtime is exponential in the worst case in general, but here it's bounded by the output itself — target is at most 30, so a few thousand combinations max — and extra space is just the recursion path.
>
> Edge cases I'd flag: target smaller than every candidate returns an empty list; a single element can't be reused; and repeated values must still combine, like two 2s making 4 — exactly once."
