# Combination Sum (LeetCode 39) — Complete Interview Lesson

| | |
|---|---|
| **Difficulty** | Medium |
| **Pattern** | Backtracking / combinatorial DFS ("start-index DFS with reuse") |
| **Key skill tested** | Generating each *multiset* exactly once without a dedupe pass |
| **Core one-liner** | Walk candidates by index; reuse = recurse with the **same** index, move on = recurse with `index + 1` |

---

## 1. Restating the problem in your own words

Restate it like this before coding:

> "I need to return **every multiset** (bag) of candidate values whose elements sum exactly to `target`. Each candidate may be used **any number of times**. Two bags are considered the same combination if they contain exactly the same values with exactly the same frequencies — so `[2,2,3]`, `[2,3,2]`, and `[3,2,2]` are **one** combination, not three. I return the list of these bags."

That last sentence is the entire problem. If you internalize "a combination is a **frequency vector**, not a sequence," the algorithm falls out naturally.

**Clarifying questions worth asking out loud:**

- "Are all candidates positive?" — Yes (`2 ≤ candidates[i]`). This is *load-bearing*: it guarantees the search terminates.
- "Are candidates guaranteed distinct?" — Yes. (If not, this becomes LeetCode 40 and needs a dedup rule — see §12.)
- "Does order *within* a combination matter for the output?" — No; the judge accepts elements in any order. Our solution emits them in non-decreasing order anyway.
- "If `target` were 0, is the empty combination an answer?" — Moot here (`target ≥ 1`), but asking shows you think about base cases.

---

## 2. Decoding the constraints like an interviewer

Every constraint here is doing real work:

| Constraint | What it buys you |
|---|---|
| `2 ≤ candidates[i] ≤ 40` | All values are **positive and ≥ 2**. Every recursive pick subtracts ≥ 2 from the remaining target, so the recursion **provably terminates** and depth ≤ ⌊target/2⌋ = **20**. Also: if `target < min(candidates)`, the answer is trivially `[]`. Do *not* blindly generalize this code to zeros or negatives (§12). |
| Candidates **distinct** | No input-side dedup needed. After sorting, index order *is* value order, so "non-decreasing indices" maps cleanly onto "each multiset exactly once." |
| `n ≤ 30`, `target ≤ 40` | The search tree is tiny in practice (quantified in §8). Recursion depth ≤ 21 — no stack concerns in any language. |
| "< 150 unique combinations" | A promise about **this judge's data**, not a general fact. It tells you the *output* is small; the cost is dominated by exploring partial combinations (dead ends), not by writing answers. |
| "Unique if the frequency of at least one number is different" | The formal statement of multiset equality. This sentence is why naive DFS produces duplicates and why the fix is a **generation-order** rule, not a dedupe set. |

**Indices vs. values — fix this vocabulary now.** Throughout this lesson, `i` and `j` are **indices into the candidates array**; `remaining` is a **value**; `path` holds **values**. The invariant tying them together: every value in `path` was appended at some index ≤ `i`, in non-decreasing index order.

---

## 3. Brute force: enumerate orderings, then dedupe

The literal reading of the problem — "keep picking numbers until the sum hits the target" — gives this: a DFS that at **every** step may append **any** candidate (any index, including ones already used), prunes on overshoot, and records the **sorted** tuple in a set to collapse orderings.

```python
def combination_sum_bf(candidates: list[int], target: int) -> list[list[int]]:
    """Enumerate every ORDERED sequence summing to target, then dedupe."""
    seen: set[tuple[int, ...]] = set()

    def bf(remaining: int, seq: list[int]) -> None:
        if remaining == 0:
            seen.add(tuple(sorted(seq)))       # canonical form erases order
            return
        for c in candidates:                   # any candidate at any position
            if c <= remaining:                 # prune only overshoots
                bf(remaining - c, seq + [c])   # seq + [c] copies: O(L) per step

    bf(target, [])
    return [list(t) for t in seen]
```

### Worked trace on Example 1 — `candidates = [2,3,6,7]`, `target = 7`

```text
bf(remaining=7, seq=[])
├─ +2 → 2
│   ├─ +2 → 4
│   │   ├─ +2 → 6
│   │   │   └─ +2/+3/+6/+7 → 8/9/12/13   all overshoot ✗  (dead end: sum 6, need 1)
│   │   ├─ +3 → 7 ✓  record sorted(2,2,3) = (2,2,3)
│   │   └─ +6/+7 → 10/11 ✗
│   ├─ +3 → 5
│   │   ├─ +2 → 7 ✓  record sorted(2,3,2) = (2,2,3)   ← DUPLICATE #1
│   │   └─ +3/+6/+7 → 8/11/12 ✗
│   └─ +6/+7 → 8/9 ✗
├─ +3 → 3
│   ├─ +2 → 5
│   │   └─ +2 → 7 ✓  record sorted(3,2,2) = (2,2,3)   ← DUPLICATE #2
│   ├─ +3 → 6  (children all overshoot — same dead end as before)
│   └─ ...
├─ +6 → 6   (dead end)
└─ +7 → 7 ✓  record (7)

Set after dedupe: {(2,2,3), (7)}  →  [[2,2,3], [7]]
```

The multiset `{2,2,3}` is reached through **three separate paths** — the sequences `(2,2,3)`, `(2,3,2)`, `(3,2,2)`. That's the waste: the brute force explores *every ordering* of every partial combination (a multiset with element counts `k₁,…,k_r` has `(Σkᵢ)!/Πkᵢ!` orderings, up to `L!`), and then pays an `O(L log L)` sort plus a hash to throw duplicates away.

Worst-case complexity is in the same asymptotic family as the optimal approach — an `n`-ary tree of depth ≤ `T/m` is `O(n^(T/m))` nodes — but it is **pointwise strictly larger** (every ordering explored) and pays the dedupe tax. The concrete gap is quantified in §8.

---

## 4. The core insight: generate each multiset exactly once

Two rules completely eliminate duplicates *by construction*:

1. **Canonical order rule.** Process candidates by index. When expanding a state, only pick candidates at index `i` **or later** — never go backwards. Every valid multiset has exactly one representation as a non-decreasing-index sequence (its sorted arrangement), so it is generated exactly once. No set, no sorting of finished answers, no dedupe.
2. **Reuse = stay.** "The same number may be chosen an unlimited number of times" translates to: after picking `candidates[j]`, recurse with **`j`** (stay on the same index so you may pick it again), not `j + 1`. Moving to `j + 1` means "this value is done forever."

**Why it terminates:** every non-recording call appends some `c ≥ 2`, strictly decreasing `remaining`. So depth ≤ ⌊T/2⌋ ≤ 20. This is exactly where the positivity constraint earns its keep — a `0` candidate would make the "stay" branch loop forever.

**Why it's correct (say this compactly if pushed):**
- *Sound:* a combination is recorded only when `remaining == 0`, and `path` contains only candidates.
- *Unique:* each multiset corresponds to exactly one non-decreasing index sequence; the DFS's branch structure ("next index ≥ current index") realizes exactly those sequences.
- *Complete:* any answer, read in sorted index order, is a path the DFS walks (induction on the first position where the multiset commits to an index).

---

## 5. Optimal implementation (Python)

```python
from typing import List

def combinationSum(candidates: List[int], target: int) -> List[List[int]]:
    # LeetCode 39 — wrap in `class Solution` as-is to submit.
    candidates.sort()                     # enables the early `break`; not required for correctness
    n = len(candidates)
    res: List[List[int]] = []
    path: List[int] = []                  # ONE shared buffer, mutated and undone

    def dfs(i: int, remaining: int) -> None:
        # i = index we are allowed to start picking from (canonical-order rule)
        if remaining == 0:                # path already sums to target
            res.append(path.copy())       # MUST copy: path keeps mutating below
            return
        for j in range(i, n):             # j from i, never before i  ← the key line
            c = candidates[j]
            if c > remaining:             # sorted ⇒ every later c is bigger too
                break                     # prune the whole loop suffix
            path.append(c)
            dfs(j, remaining - c)         # pass j (NOT j+1): c may be reused
            path.pop()                    # undo the choice before trying next j

    dfs(0, target)
    return res
```

**Why each line is the way it is:**

| Line | Reason |
|---|---|
| `candidates.sort()` | Turns `c > remaining` into a `break` (prunes the suffix) and emits combinations in canonical non-decreasing order. If you can't sort, use `continue` instead of `break` — correctness survives, speed doesn't. |
| `for j in range(i, n)` | The uniqueness mechanism. Starting at `0` every time regenerates permutations (`[2,3,2]`, `[3,2,2]`, …). |
| `dfs(j, remaining - c)` | The reuse rule. `dfs(j + 1, …)` silently turns this into Combination Sum II-style "use each index at most once." |
| `path.pop()` | Backtracking on a shared buffer: `O(L)` memory total instead of a fresh list per call (the brute force's `seq + [c]` copies at every step). |
| `res.append(path.copy())` | Snapshot, don't alias. `path` keeps changing; a bare `res.append(path)` stores a live reference. |
| No `visited`/`used` set | Reuse is *legal* here — a `used` set imported from Permutations would wrongly forbid `[2,2,3]`. Duplicate prevention is structural (start index), not a membership check. |

**Equivalent formulation** — the binary "take-or-skip" view, where each index decides "use me (possibly again) or leave me forever":

```python
def combinationSum_binary(candidates: List[int], target: int) -> List[List[int]]:
    res, path = [], []

    def dfs(i: int, remaining: int) -> None:
        if remaining == 0:
            res.append(path.copy())
            return
        if i == len(candidates) or remaining < 0:
            return
        path.append(candidates[i])
        dfs(i, remaining - candidates[i])   # take it again (unlimited use) → stay at i
        path.pop()
        dfs(i + 1, remaining)               # done with this value forever → advance

    dfs(0, target)
    return res
```

Both produce identical output; the loop version maps more directly onto the traces below and generalizes cleanly to the related problems in §12. Note the binary version needs the explicit `remaining < 0` guard (its take-branch doesn't check size first); the loop version's `c > remaining` check makes `remaining` never go negative.

---

## 6. Traces on the official examples

### Example 1 — `candidates = [2,3,6,7]`, `target = 7`

```text
dfs(i=0, rem=7)  path=[]
├─ j=0 (2): path=[2]     → dfs(0, 5)
│   ├─ j=0 (2): [2,2]    → dfs(0, 3)
│   │   ├─ j=0 (2): [2,2,2] → dfs(0, 1)   2 > 1 → loop empty → dead end
│   │   ├─ j=1 (3): [2,2,3] → dfs(1, 0)   rem = 0 → RECORD [2,2,3]
│   │   └─ j=2 (6): 6 > 3 → break
│   ├─ j=1 (3): [2,3]    → dfs(1, 2)      3 > 2 → dead end
│   └─ j=2 (6): 6 > 5 → break
├─ j=1 (3): path=[3]     → dfs(1, 4)
│   ├─ j=1 (3): [3,3]    → dfs(1, 1)      dead end
│   └─ j=2 (6): 6 > 4 → break
├─ j=2 (6): path=[6]     → dfs(2, 1)      dead end
└─ j=3 (7): path=[7]     → dfs(3, 0)      RECORD [7]

Output: [[2,2,3], [7]]  ✓
```

Note how `dfs(0, 1)` and `dfs(2, 1)` die *without exploring anything* — the `c > remaining` break turns "need 1 more, nothing is that small" into an O(1) dead end.

### Example 2 — `candidates = [2,3,5]`, `target = 8`

```text
dfs(0, 8)
├─ j=0 (2) → dfs(0, 6)
│   ├─ j=0 (2) → dfs(0, 4)
│   │   ├─ j=0 (2) → dfs(0, 2)
│   │   │   └─ j=0 (2) → dfs(0, 0) → RECORD [2,2,2,2]
│   │   ├─ j=1 (3) → dfs(1, 1)          3 > 1 → dead end
│   │   └─ j=2 (5)  5 > 4 → break
│   ├─ j=1 (3) → dfs(1, 3)
│   │   ├─ j=1 (3) → dfs(1, 0) → RECORD [2,3,3]
│   │   └─ j=2 (5)  5 > 3 → break
│   └─ j=2 (5) → dfs(2, 1)              2+5=7≠8; 5 > 1 → dead end (pruned correctly)
├─ j=1 (3) → dfs(1, 5)
│   ├─ j=1 (3) → dfs(1, 2)              dead end
│   └─ j=2 (5) → dfs(2, 0) → RECORD [3,5]
└─ j=2 (5) → dfs(2, 3)                  5 > 3 → dead end

Output: [[2,2,2,2], [2,3,3], [3,5]]  ✓
```

### Example 3 — `candidates = [2]`, `target = 1`

`dfs(0, 1)`: `j = 0`, `c = 2 > 1` → `break`. The loop body never runs, nothing is recorded, `res = []`. ✓ (In general, any non-representable target yields `[]` the same way.)

Notice also: our output order happens to match the listed expected outputs, because sorted candidates + canonical order emit combinations lexicographically — but the judge accepts any order.

---

## 7. Full interview talk track (the script the 60-second version is distilled from)

> "Let me restate: I need every multiset of candidates summing to target, with unlimited reuse. Uniqueness is by frequency counts, so `[2,2,3]` and `[3,2,2]` are the same answer — which tells me the real danger is emitting permutations of the same multiset.
>
> My plan is a DFS that enforces a canonical order. I walk the candidates by index, carrying the remaining target and the current start index. Rule one: from index `i` I may only pick candidates at index `i` or later — never earlier. That single rule means every multiset is produced exactly once, in sorted-index order, so there is no dedupe step at all. Rule two: when I pick `candidates[j]` I recurse with `j`, not `j + 1` — staying on the same index is what 'unlimited reuse' means. Advancing to `j + 1` means this value is finished.
>
> Base case: remaining target hits zero — I snapshot the path into the result, as a copy, since the buffer is reused during backtracking. Prune: all values are at least two, so once a candidate exceeds the remaining target I can stop — and since I sort first, that's a `break` killing the whole rest of the loop. Termination is guaranteed because every pick subtracts at least two, so depth is at most target over two — twenty here.
>
> Complexity: time is the size of this search tree, about `n` to the power target-over-min-candidate in the worst case, plus copying the answers; with target ≤ 40 and under 150 answers, it runs instantly. Space is the recursion stack plus the path buffer, not counting output.
>
> Edge cases I'm keeping in mind: target smaller than every candidate returns empty; the input isn't guaranteed sorted, so I sort; and a case like `[2,4]`, target 8 is my mental unit test that reuse works at every level."

---

## 8. Complexity

**Setup:** `n = len(candidates)`, `T = target`, `m = min(candidates)`, `K` = number of answers, `L` = max answer length (≤ ⌊T/m⌋ = 20 here).

**Derivation for the chosen algorithm.** Each internal DFS node has at most `n` children, and each edge subtracts ≥ `m`, so depth ≤ ⌊T/m⌋. The tree is therefore bounded by the geometric sum `1 + n + n² + … + n^(T/m)` = `O(n^(T/m))` nodes, each with `O(1)` loop work (≤ n iterations), plus `O(K·L)` total to copy recorded paths. Recursion depth ≤ ⌊T/m⌋ + 1; extra space is `O(T/m)` for the stack plus `O(L)` for the path buffer, **excluding** the output (`O(K·L)`, here ≤ 150 × 20 values).

**Concrete worst case under the stated constraints** (this is where the brute-force contrast becomes vivid). Push the constraints to their limits: `candidates = {2, 3, …, 31}` (30 distinct values), `target = 40`:

| | Canonical-order DFS | Brute force (ordered sequences) |
|---|---|---|
| Calls / nodes | ≈ **37,338** | ≈ **1.66 × 10⁸** |
| Answers produced before dedupe | 6,153 | ≈ 63,000,000 ordered hits, each sorted + hashed |

*Why these numbers:* every DFS path is a distinct multiset of parts ≥ 2 summing to ≤ 40, and the count of partitions of `k` into parts ≥ 2 is `p(k) − p(k−1)`, which telescopes to `Σ_{k≤40} = p(40) = 37,338`; the brute force counts *ordered* sequences, and compositions of `k` into parts ≥ 2 number `F_{k−1}` (the no-1s Fibonacci identity), summing to `F₄₁ ≈ 1.66 × 10⁸`. So the canonical-order rule is worth roughly **three to four orders of magnitude** here, and the gap widens as target grows.

| Approach | Time | Extra space (excl. output) | Notes |
|---|---|---|---|
| Brute force: ordered DFS + sorted-tuple set | `O(n^(T/m))` nodes worst case, ×`O(L log L)` dedupe per hit | `O(T/m)` stack + dedupe set `O(K·L)` | visits up to `L!` orderings per combination |
| **Start-index backtracking (chosen)** | `O(n^(T/m))` worst case + `O(K·L)` to copy answers | `O(T/m)` stack + `O(L)` path | each multiset exactly once; ≤ ~4 × 10⁴ calls on any allowed input |
| Counting DP for the same structure (LC 518-style variant) | `O(n·T)` | `O(T)` | counts combinations but can't *materialize* them — see §12 |

**On "can we do better?":** for exact listing, no — you must at least write the output, which is `Ω(K·L)` just to materialize `K` answers of total size `K·L`, and in the unbounded-target generalization the answer count itself is super-polynomial in `T` (the partition number `p(T) ≈ e^{π√(2T/3)}/(4T√3)` by the Hardy–Ramanujan asymptotic, i.e., `e^{Θ(√T)}`), so no algorithm polynomial in `T` can list all combinations in general. Also note: the judge's "< 150 combinations" is a property of the *test data*, not a general guarantee.

---

## 9. Common mistakes (ranked by interview frequency)

| # | Mistake | What it looks like | Fix |
|---|---|---|---|
| 1 | `dfs(j + 1, …)` when reuse is intended | Example 2 returns `[[2,3,3],[3,5]]` — silently missing `[2,2,2,2]` | Pass `j` to reuse; `j + 1` is for "each index at most once" (LC 40/78) |
| 2 | Loop starts at `0` every time (`range(n)`) | Emits `[2,3,2]`, `[3,2,2]` alongside `[2,2,3]` → permutation duplicates | Start the loop at `i` — the canonical-order rule |
| 3 | `res.append(path)` (aliasing) | Output is N references to the same buffer — typically N copies of the *final* (often empty) path | `res.append(path.copy())` |
| 4 | Forgetting `path.pop()` | `path` leaks across siblings; garbage results | Pop immediately after the recursive call returns |
| 5 | `break` on `c > remaining` **without sorting** | On `candidates = [7,2,3]`, `target = 9`, the break at `dfs(0,2)` skips candidates 2 and 3 and silently drops `[2,7]` from the output | Sort first, or use `continue` |
| 6 | Recomputing `sum(path)` at each node | `O(L)` overhead per node and a bug magnet | Carry `remaining` down as a parameter |
| 7 | Importing a `visited`/`used` set from Permutation problems | It *forbids* the legal reuse that `[2,2,2,2]` requires | Duplicate prevention here is structural (start index), not membership-based |
| 8 | Assuming the approach extends to 0/negative candidates | A `0` candidate never decreases `remaining` → infinite recursion; any `(x, −x)` pair admits infinitely many combinations (insert arbitrarily many pairs) | Positivity (`candidates[i] ≥ 2`) is what makes the tree finite — know which constraint you're leaning on |
| 9 | Post-hoc dedupe with a set of sorted tuples as the *primary* design | Works here, but masks the canonical-order insight, inflates cost, and doesn't scale to LC 40 where dedupe interacts with the recursion | Generate each multiset once; keep dedupe-set thinking for when generation order can't do it |

---

## 10. Implementation gotchas by language

| Language | Gotcha |
|---|---|
| **Python** | (1) `res.append(path)` aliases — use `path.copy()` / `list(path)`. (2) `candidates.sort()` mutates the caller's list — fine on LeetCode, use `sorted(candidates)` otherwise. (3) `for c in candidates[i:]` copies a slice at every node and loses original indices — pass the index `i`, not the slice. Recursion depth ≤ 21, so no `sys.setrecursionlimit` games. |
| **Java** | (1) Same aliasing: `res.add(path)` stores a live reference — use `new ArrayList<>(path)`. (2) Classic `List<Integer>` trap: `path.remove(c)` compiles but calls the `remove(int index)` overload — it removes **by position**, not by value; pop with `path.remove(path.size() - 1)`. (3) Sort the `int[]` with `Arrays.sort`. |
| **C++** | (1) Take `vector<int>& path` by reference and pair every `push_back` with `pop_back` — passing by value "works" but copies the path at every node. (2) Note the contrast: `res.push_back(path)` copies by value, so the Python/Java aliasing bug **cannot** happen in C++ — the C++ failure mode is the missing `pop_back` instead. (3) No overflow risk here (`target ≤ 40`), but in variants with big targets, subtract from a 64-bit `remaining` rather than accumulating an `int` sum. |

---

## 11. Test cases to propose out loud

Propose tests **before coding** (it signals you design, not just transcribe): the three official examples to lock the contract, then the empty case, the unsorted case, and the max-depth case. Keep `[2,4], 8` in your pocket as a post-coding self-check.

| # | Input | Expected output | What it verifies |
|---|---|---|---|
| 1 | `[2,3,6,7]`, `target = 7` | `[[2,2,3],[7]]` | Official — basic reuse + a terminal one-element combination |
| 2 | `[2,3,5]`, `target = 8` | `[[2,2,2,2],[2,3,3],[3,5]]` | Official — reuse stacked multiple levels deep |
| 3 | `[2]`, `target = 1` | `[]` | Official — target below every candidate; loop body never runs |
| 4 | `[2,4]`, `target = 8` | `[[2,2,2,2],[2,2,4],[4,4]]` | **Discriminator**: with the `dfs(j+1)` bug, `[2,2,2,2]` and `[4,4]` vanish. Also verifies combinations may *start* at a later index |
| 5 | `[7,2,3]`, `target = 9` | `[[2,2,2,3],[2,7],[3,3,3]]` (any order) | Unsorted input — catches `break`-without-sort and any "first candidate must be smallest" assumption |
| 6 | `[2]`, `target = 40` | `[[2,2,…,2]]` (twenty 2s) | Maximum recursion depth (20), deepest path snapshot, correctness of the copy at max length |

Also state the negative checks verbally: no output contains two permutations of the same multiset (`[2,3,2]` must not appear alongside `[2,2,3]`), and `target = 1 < min candidate` always yields `[]` per the constraints.

---

## 12. Follow-ups, variants, and transferable patterns

**Variants you should be able to pivot to:**

- **LC 40 Combination Sum II** (each value used at most once, input may contain duplicates): sort; recurse with `j + 1`; skip a candidate when `j > i and candidates[j] == candidates[j-1]`. The skip works because at one loop level, taking the second copy of a run would explore the identical subtree as the first copy.
- **LC 377 Combination Sum IV** (count *ordered* sequences): order is part of the identity, so this is a DP, not backtracking: `f[t] = Σ_c f[t − c]`, `f[0] = 1`, in `O(T·n)` time — `T + 1` amount-states, each scanning `n` candidates. Contrast with our problem: "unique by frequency" → enumerate unordered; "unique by sequence" → count with 1-D DP.
- **LC 322 Coin Change** (fewest coins, unlimited use): same state graph, optimize instead of enumerate — `O(T·n)` DP or BFS on `remaining`.
- **LC 518 / Coin Change 2** (count unordered combinations, unlimited use): `g(i, t) = g(i+1, t) + g(i, t − c_i)` over an `n × (T+1)` table, `O(n·T)`. The index in the state is what stops it from counting permutations.
- **Memoizing *this* problem?** Interesting subtlety: different paths *can* reach the same state — e.g., paths `[2,3,5]` and `[5,5]` both arrive at `dfs(2, T−10)` — so "list of completions from `(i, remaining)`" is a well-defined memoizable function. But you'd be caching whole answer lists, which defeats the purpose; memoization pays when the cached value is small (a count or a min), not when it *is* the output.
- **What breaks with 0 or negatives?** A `0` candidate never decreases `remaining` (infinite recursion), and any `(x, −x)` pair yields infinitely many combinations — you can splice in arbitrarily many pairs. Finiteness here rests entirely on `candidates[i] ≥ 2`.

**One skeleton, four knobs** — this problem is a point on a family you should be able to navigate:

| Knob | This problem | Where it changes |
|---|---|---|
| Start index passed down | Yes (`j from i`) | Permutations (LC 46) drop it and use a `visited` array instead |
| Reuse a value | Recurse with `j` (stay) | LC 78/40: recurse with `j + 1` |
| Sort the input | Yes — enables `break` pruning | LC 40 additionally uses sorted order for the duplicate skip |
| Record condition | `remaining == 0` | Length `== k` (LC 77/216), end-of-string (LC 131), every node (LC 78) |

**Related problems and their bounds** (each justified inline):

| Problem | Relationship to 39 | Complexity |
|---|---|---|
| LC 78 Subsets | Same skeleton, record every node | `O(n·2ⁿ)` — `2ⁿ` subsets is inherent (each element in/out independently), `O(n)` each to copy |
| LC 40 Combination Sum II | No reuse + input duplicates | `O(2ⁿ)` — binary include/exclude tree over the `n` sorted values |
| LC 216 Combination Sum III | Length cap + fixed candidates 1–9 | Constant-bounded — at most `2⁹` search nodes and `C(9,k)` answers |
| LC 377 Combination Sum IV | Count ordered sequences | `O(T·n)` — DP over `T + 1` amounts, `n` transitions each |
| LC 322 Coin Change | Optimize instead of enumerate | `O(T·n)` — same state graph, min-operation per state |
| LC 518 Coin Change II | Count unordered combos | `O(n·T)` — an `n × (T+1)` table with `O(1)` transitions |
| LC 131 Palindrome Partitioning | Same skeleton over cut positions | `O(n·2ⁿ)` — a partition is a subset of the `n−1` gaps (`2^(n−1)` of them), `O(n)` per partition to check/copy |

**The meta-heuristic to say out loud:** *same state graph, different goal* — list them all → DFS + backtracking; count or optimize → DP, because subproblems overlap; and the choice of state (`(i, remaining)` vs `remaining` alone) is exactly what distinguishes "unique by frequency" from "unique by sequence."

---

## 13. Say it in 60 seconds

> "Combination Sum: list every multiset of candidates that sums to the target, with unlimited reuse of each candidate. Equality is by frequency counts, so the entire danger is emitting the same counts in different orders. I prevent that structurally with a canonical order: DFS over the array carrying a start index, and from index i I'm only allowed to pick candidates at i or later — never earlier. Reusing a number just means the recursion stays on the same index instead of advancing; that single choice is the difference from Subsets. When the remaining target hits zero, I snapshot the current path — a copy, since the buffer is being backtracked. If the next candidate exceeds the remaining target, I prune — a clean break once the array is sorted. And since every value is at least two, the recursion depth is at most target over two, so it always terminates. Time is the search-tree size, roughly n to the target-over-minimum, plus copying the answers — with target ≤ 40 and under 150 answers, effectively instant; space is the stack plus the path buffer, excluding output. Two bugs I'm actively guarding against: recursing with j-plus-one instead of j, and appending the path without copying it."
