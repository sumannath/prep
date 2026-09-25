# Subsets II (LeetCode 90) — Complete Lesson

## 1. Problem Restatement

You're given an array `nums` that **may contain repeated values**. Return the **power set**: every subset of the multiset of values, including the empty subset.

Three precise points that the wording glosses over:

- **Subsets are built from indices, but compared as values.** Each *occurrence* (index) may be used at most once, so for `nums = [1,2,2]` you *can* produce `[2,2]` (indices 1 and 2 together) but never `[2,2,2]`.
- **Duplicates are defined on multisets, not index sets.** `[2]` picked via index 1 and `[2]` picked via index 2 are the *same subset* — the output may contain it only once. This index-vs-value distinction is the entire problem.
- **Subsets are unordered**, so `[1,2]` and `[2,1]` are the same subset. This licenses sorting the input as a preprocessing step — sorting permutes indices but cannot change the set of value-multisets.

Sanity check on the example: for `[1,2,2]` there are `2^3 = 8` index-subsets, but only **6** unique value-subsets — exactly the count formula `∏(countᵢ + 1) = (1+1)(2+1) = 6` (each distinct value independently contributes 0..countᵢ copies, so multiply the per-value choices — elementary product rule).

LeetCode signature: `List[List[int]] subsetsWithDup(List[int] nums)`.

---

## 2. Decoding the Constraints

| Constraint | What it actually tells you |
|---|---|
| `1 <= nums.length <= 10` | Input is tiny: at most `2^10 = 1024` index-subsets, and unique subsets ≤ that. Even a hash-set-dedup brute force passes. The interview is testing the *dedup insight*, not asymptotics. Recursion depth ≤ 11 — no stack risk in any language. |
| `-10 <= nums[i] <= 10` | Negatives and repeats are both in play. Sorting handles negatives trivially, and value magnitudes are so small that overflow is a non-issue in every language — the design question is purely the dedup rule. |
| "may contain duplicates" | This is the whole problem. Without it, this is LC 78 (Subsets), a textbook backtracking warm-up. |
| "solution set must not contain duplicate subsets" | Dedup is on **value multisets**. Two different index choices yielding the same value list collide. |
| "return in any order" | No canonical output order required — but generating in sorted order makes your output *reproduce the sample exactly*, which is a nice self-check. |

**Complexity framing:** with `n ≤ 10` the answer can contain up to `2^10` subsets whose total element count is `Θ(n·2^n)` — for an all-distinct input each index appears in exactly half of all `2^n` subsets, so the output alone holds `n·2^(n-1)` elements. The problem is *output-dominated*; say this out loud in the interview.

---

## 3. Brute Force: Enumerate Everything, Dedup With a Set

### 3.1 Code

Enumerate all `2^n` index-subsets with a bitmask, canonicalize each as a tuple, and let a hash set collapse duplicates.

```python
def subsets_with_dup_bruteforce(nums: list[int]) -> list[list[int]]:
    n = len(nums)
    seen: set[tuple[int, ...]] = set()
    for mask in range(1 << n):                      # 2^n masks
        subset = tuple(nums[i] for i in range(n)    # bit i set => index i chosen
                       if (mask >> i) & 1)
        seen.add(subset)                            # collisions collapse here
    return [list(t) for t in seen]
```

This is `O(n·2^n)` time: each of the `2^n` masks builds a tuple of up to `n` elements and hashes it. Lists are unhashable in Python, hence tuples.

### 3.2 Worked Trace on `nums = [1,2,2]` (indices 0,1,2 → values 1,2,2)

| mask | binary | chosen indices | value tuple | status |
|---|---|---|---|---|
| 0 | `000` | — | `()` | keep |
| 1 | `001` | {0} | `(1,)` | keep |
| 2 | `010` | {1} | `(2,)` | keep |
| 3 | `011` | {0,1} | `(1,2)` | keep |
| 4 | `100` | {2} | `(2,)` | **duplicate of mask 2** |
| 5 | `101` | {0,2} | `(1,2)` | **duplicate of mask 3** |
| 6 | `110` | {1,2} | `(2,2)` | keep |
| 7 | `111` | {0,1,2} | `(1,2,2)` | keep |

Final set: `{(), (1,), (2,), (1,2), (2,2), (1,2,2)}` → 6 subsets. ✓

### 3.3 What the Trace Teaches

Every collision (masks 4, 5) is a pair of masks that differ **only in which copy of a duplicated value they selected**. The information "first copy vs. second copy of 2" is meaningless for value-subsets — yet the brute force pays to enumerate and hash both. The optimal solution's job is to **never generate the redundant branch in the first place**.

---

## 4. The Core Insight

**Sort first.** Subsets are unordered, so sorting is lossless, and it makes equal values adjacent — which turns "same value somewhere in the array" into "same value right next to me," a locally checkable condition.

Then run standard subset backtracking, where **every node of the recursion tree is recorded as a subset** (subsets have variable length, so you don't record only at leaves). The single new rule:

> **At one level of the recursion tree (one `for`-loop, one fixed `start`), never pick a value equal to the value of the sibling candidate immediately before it.** Equal values at *different depths along the same path* are fine — that's exactly how `[2,2]` and `[1,2,2]` get built.

Concretely, the skip condition is:

```python
if i > start and nums[i] == nums[i - 1]:
    continue
```

Two things to get exactly right:

- **The comparison is on values** (`nums[i] == nums[i-1]`), but **the guard is on indices** (`i > start`). `i == start` means "first candidate at this level"; even if it equals the value the parent just took, taking it again is a legitimate deeper use of a second copy.
- **Why pruning is safe (dominance argument):** at a fixed `start`, consider siblings `i-1` and `i` with `nums[i-1] == nums[i]`. The branch taking `nums[i]` recurses with candidates from index `i+1`; the branch taking `nums[i-1]` recurses with candidates from index `i` — a **superset** of the same values. Every value-sequence the second sibling's subtree produces, the first sibling's subtree also produces. The second sibling's entire subtree is redundant; prune all of it.

One-line mental model: **"same level, same value → skip; deeper on the same path → keep."**

---

## 5. Optimal Approach: Sort + Backtracking with Level-Wise Dedup

### 5.1 Python Solution

```python
from typing import List

class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        nums.sort()                     # duplicates become adjacent; lossless for subsets
        res: List[List[int]] = []
        path: List[int] = []

        def dfs(start: int) -> None:
            res.append(path[:])         # every tree node IS a subset — copy it
            for i in range(start, len(nums)):
                if i > start and nums[i] == nums[i - 1]:
                    continue            # same value, same tree level → redundant subtree
                path.append(nums[i])
                dfs(i + 1)              # i+1: each index used at most once
                path.pop()

        dfs(0)
        return res
```

Notes on the mechanics:

- `dfs(i + 1)` (not `dfs(i)`, not `dfs(start + 1)`): a subset uses each index at most once, and forcing chosen indices to strictly increase *combined with sorting* guarantees each value-multiset is generated exactly once — dedup is structural, not post-hoc.
- `res.append(path[:])` — the copy is mandatory; appending `path` directly stores one aliased list that backtracking later empties.
- `nums.sort()` mutates the caller's list; use `nums = sorted(nums)` if that matters.

### 5.2 Trace: `nums = [1,2,2]` (sorted: `[1,2,2]`)

```
dfs(0, [])                                     record []
├── i=0: take 1 → [1]                          record [1]
│   └── dfs(1, [1])
│       ├── i=1: take 2 → [1,2]                record [1,2]
│       │   └── dfs(2, [1,2])
│       │       └── i=2: take 2 → [1,2,2]      record [1,2,2]   (i == start → allowed: deeper use)
│       └── i=2: nums[2]==nums[1], i>start(1) → ✂ SKIP (redundant sibling subtree)
└── i=1: take 2 → [2]                          record [2]
    └── dfs(2, [2])
        └── i=2: take 2 → [2,2]                record [2,2]
(i=2 at dfs(0): nums[2]==nums[1], i>start(0) → skipped; loop ends)
```

Recorded order: `[], [1], [1,2], [1,2,2], [2], [2,2]` — **exactly the sample output, in order**, because sorted generation is deterministic. If the bottom ✂ skip were removed, `dfs(2, [2])` would run and re-record `[2]` and `[2,2]` — the duplicates the problem forbids.

### 5.3 Trace: `nums = [0]`

```
dfs(0, []) → record []
└── i=0: take 0 → [0]
    └── dfs(1, [0]) → record [0]
```

Output: `[[], [0]]`. ✓ No skip ever fires (single element).

### 5.4 Iterative Alternative (block extension)

Sort, start from `[[]]`, and process elements left to right. On the **first** occurrence of a value, extend every existing subset; on **repeat occurrences**, extend only the block of subsets created by the immediately previous occurrence — that's precisely the subsets which contain exactly one fewer copy.

```python
def subsets_with_dup_iter(nums: list[int]) -> list[list[int]]:
    nums.sort()
    res: list[list[int]] = [[]]
    prev_block_start = 0                     # where the previous iteration's new subsets begin
    for i, x in enumerate(nums):
        lo = prev_block_start if (i > 0 and nums[i] == nums[i - 1]) else 0
        prev_block_start = len(res)
        for k in range(lo, prev_block_start):
            res.append(res[k] + [x])
    return res
```

Trace on `[1,2,2]`: start `[[]]` → process `1`: add `[1]` → process `2` (first copy): add `[2],[1,2]` → process `2` (repeat): extend only block `{[2],[1,2]}` → add `[2,2],[1,2,2]`. Six subsets, no duplicates.

### 5.5 How to Narrate It While Coding (full script)

> "Subsets are unordered, so I'll sort first — that makes duplicates adjacent and lets me dedup locally. Standard backtracking: `dfs(start)` records the current path immediately, since every recursion node is a subset of some length; then loop `i` from `start`, append, recurse with `i+1` because each index is used once, pop. The only new line is the duplicate skip: if `i > start` and `nums[i] == nums[i-1]`, skip. Reasoning: among siblings in one loop, taking the second copy of a value generates a subtree completely contained in the first copy's subtree — same value going down, same candidate pool — so the second branch is redundant. The `i > start` guard is the subtle part: when `i == start`, this candidate is the first choice at this level, and taking it even if it equals the parent's pick is how `[2,2]` forms. Prune siblings, never depth. I never emit a duplicate subset, so no hashing or post-filtering. Complexity: at most 2ⁿ unique subsets, O(n) to copy each — O(n·2ⁿ) time, O(n) auxiliary space, output-dominated. Quick checks: `[2,2,2]` must give exactly 4 subsets; `[1,2,2]` must give 6."

---

## 6. Complexity Analysis

| Approach | Time | Auxiliary space (excl. output) | Output size | Notes |
|---|---|---|---|---|
| Bitmask + hash set | `O(n·2ⁿ)` | `O(n·2ⁿ)` for the set of up to `2ⁿ` tuples | `Θ(n·2ⁿ)` worst case | enumerates duplicates, then discards them; per-mask subset build + hash is `O(n)` |
| **Sort + backtracking** | **`O(n·2ⁿ)`** | **`O(n)`** (path + recursion depth ≤ n+1) | `Θ(n·2ⁿ)` worst case | generates each unique subset **exactly once** — zero wasted branches |
| Sort + iterative blocks | `O(n·2ⁿ)` | `O(1)` beyond output | `Θ(n·2ⁿ)` worst case | same uniqueness guarantee, no recursion |

Why the backtracking bound holds: the recursion tree has at most `2ⁿ` nodes because every node records a *distinct* subset (that's what the dedup rule guarantees structurally), and copying each path into the output costs `O(n)`; sorting is `O(n log n)`, negligible.

This is asymptotically optimal **because it is output-limited**: for all-distinct input, the answer itself contains `Σₖ k·C(n,k) = n·2^(n-1)` elements (each index lies in exactly half of the `2^n` subsets), so any correct algorithm spends `Ω(n·2ⁿ)` merely writing the output.

---

## 7. Common Mistakes (each with its concrete symptom on `[1,2,2]`)

| # | Mistake | Symptom on `[1,2,2]` |
|---|---|---|
| 1 | Forgot `nums.sort()` | Skip compares *adjacent* values; unsorted duplicates aren't adjacent (e.g., input `[2,1,2]`) → duplicate subsets like two `[2]`s in the output. |
| 2 | `if nums[i] == nums[i-1]: continue` **without** `i > start` | Also prunes the *deep* reuse at `dfs(start=2)`: output collapses to `[], [1], [1,2], [2]` — loses `[2,2]` and `[1,2,2]`. |
| 3 | Guard `i > 0` instead of `i > start` | Same symptom as #2: at `dfs(2, [1,2])` and `dfs(2, [2])`, `i=2 > 0` and values match → wrongly pruned. `i > start` (or equivalently `i != start`) is load-bearing. |
| 4 | `res.append(path)` instead of `res.append(path[:])` | Every recorded row aliases the one live `path`; after full backtracking the answer is a list of empty lists. Same bug in Java: `res.add(path)`. |
| 5 | Recursing `dfs(i)` or `dfs(start)` instead of `dfs(i + 1)` | Same index re-picked forever → infinite recursion / stack overflow. Each index is usable once; advance past it. |
| 6 | Dedup via `set(res)` of lists | `TypeError: unhashable type: 'list'` in Python — lists aren't hashable; you'd need tuples, and you'd be doing generate-then-discard anyway. |
| 7 | Recording only at leaves | Missing all shorter subsets: output would lack `[], [1], [2]`. Every node is a subset; record at entry. |
| 8 | Iterative variant: on a repeat value, extending *all* of `res` instead of only the previous block | Processing the second `2` re-adds `[2]` and `[1,2]` alongside the new ones → duplicates return. |

---

## 8. Language Gotchas (Python / Java / C++)

| Language | Gotcha | Detail |
|---|---|---|
| Python | List aliasing & hashability | `res.append(path)` stores a live reference — use `path[:]`. `set()` of lists raises `TypeError`; tuples work but add `O(n)` hashing per subset. |
| Java | Reference aliasing | `result.add(path)` captures the live list — must be `result.add(new ArrayList<>(path))`. This is the #1 Java backtracking bug. |
| Java | Container behavior | `Arrays.sort(nums)` works for `int[]`; for `List<Integer>` use `Collections.sort`. Unlike Python, `HashSet<List<Integer>>` *does* work (`AbstractList` defines value-based `equals`/`hashCode`) — but that's generate-then-discard, not the structural fix. Autoboxing (`int` ↔ `Integer`) adds allocation noise; irrelevant at `n ≤ 10`. |
| C++ | Pass-by-value blowup | Pass `vector<int>& path` and `vector<vector<int>>& res` **by reference**; forgetting `&` copies the path at every recursive call. `res.push_back(path)` *is* the intentional copy — the correct direction here. Don't forget `std::sort(nums.begin(), nums.end())`. |
| C++ | Post-hoc dedup cost | `set<vector<int>>` dedup adds a log-factor of comparisons per insert because `std::set` orders vectors via pairwise element comparisons — fine at this scale, but structural dedup avoids it entirely. |

---

## 9. Test Cases to Propose Out Loud

State these before or right after coding — they show you've thought about the boundaries:

| # | Input | Expected subsets | Count = ∏(countᵢ+1) | What it stress-tests |
|---|---|---|---|---|
| 1 | `[1,2,2]` (official) | `[], [1], [1,2], [1,2,2], [2], [2,2]` | 2·3 = 6 | One duplicate group; the classic skip case |
| 2 | `[0]` (official) | `[], [0]` | 2 | Minimal `n`; skip never fires |
| 3 | `[2,2,2]` | `[], [2], [2,2], [2,2,2]` | 4 | Three copies of one value — skip must fire repeatedly at levels 0 and 1 |
| 4 | `[1,2,3]` | all 8 subsets | 8 | **No** duplicates — the guard must *not* over-prune; output should equal LC 78's |
| 5 | `[-5,-5,0]` (sorted) | `[], [-5], [-5,-5], [0], [-5,0], [-5,-5,0]` | 3·2 = 6 | Negative values flow through sort + skip untouched |
| 6 | `[7]×10` | exactly 11 subsets (0–10 copies of 7) | 11 | Max `n` with total duplication; recursion depth 11; dedup must not blow up |

Quick verification trick worth mentioning aloud: sort each subset, sort the list of subsets, assert adjacent entries differ (no duplicates), and assert the count matches `∏(countᵢ + 1)` — each distinct value independently contributes `0..countᵢ` copies.

---

## 10. Transferable Patterns & Related Problems

**Patterns you just learned:**

1. **Sort to make duplicates adjacent** — the gateway move for every "unique results" backtracking problem; it converts a global condition ("is this value used elsewhere?") into a local one ("does my immediate left sibling have my value?").
2. **Structural dedup beats post-hoc dedup** — constrain the *order of choices* (indices strictly increasing + skip equal siblings) so duplicates are never generated, instead of generating-then-hashing. Fall back to hashing only when structural ordering is impossible.
3. **The level-vs-depth rule** — prune equal values among *siblings* (same `start`), keep them across *depth* (same path). This is the canonical uniqueness rule for unordered combinations.
4. **Multiset → multiplicity choices** — thinking of duplicates as "how many copies (0..cᵢ) of this value" explains the count formula `∏(cᵢ+1)` and powers the block-extension iterative solution.

**Related problems:**

| Problem | Relationship | Uniqueness rule there |
|---|---|---|
| LC 78 Subsets | Same skeleton, no duplicates — delete one line | none needed |
| LC 40 Combination Sum II | Sorted input with duplicates, combinations hitting a target, each index once | identical `i > start` skip, plus a `break` when `nums[i] > target` (array is sorted) |
| LC 47 Permutations II | Order matters, so index-ordering can't dedup | sort + `used[i] or (nums[i]==nums[i-1] and not used[i-1])` |
| LC 77 Combinations | Same skeleton, no duplicate values | none needed |

**Likely follow-ups:** "Return only the **count** of unique subsets" → `∏(cᵢ + 1)` in `O(n)` after counting (product rule: each value independently contributes `0..cᵢ` copies). "Scale `n` to 40" → the answer itself is exponential, so total time is output-bounded regardless; only a count/sample request changes the game.

---

## 11. Say It in 60 Seconds

> "Subsets II is Subsets plus one dedup rule. First, sort — subsets are unordered, so sorting is free, and it puts duplicate values side by side. Then standard backtracking: at every recursion node I record the current path, because any node is a subset; I loop candidates from `start`, append, recurse with `i plus one`, pop. The dedup line is: if `i > start` and `nums[i]` equals `nums[i-1]`, skip — same value as the previous *sibling* at the same tree level produces an identical subtree I already generate. The `i greater than start` guard is the part people get wrong: equal values at greater *depth* are fine — that's how `[2,2]` gets built. I only prune siblings, never depth. That way I never emit a duplicate subset — no hashing, no post-filter. Time is O(n·2ⁿ): up to 2ⁿ unique subsets, O(n) to copy each; O(n) auxiliary space, and that's optimal because the output itself has Θ(n·2ⁿ) elements. Before coding I'd sanity-check `[2,2,2]` → exactly four subsets, and `[1,2,2]` → six."
