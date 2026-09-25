# Permutations (LeetCode 46) — Complete Interview Lesson

## 1. Problem, restated in your own words

> Given an array `nums` of **distinct** integers, return **every possible ordering** of those integers, as a list of lists. The n! orderings can be returned in **any order**.

Formally: if `n = len(nums)`, the answer is the set of all length-`n` lists that contain each value of `nums` exactly once. There will be exactly `n!` of them. "Any order" means the judge compares your answer as an **unordered collection** of lists — you do not need lexicographic output, but every row must be a valid, distinct permutation.

Two clarifying questions to ask out loud before coding:

1. "Are the values guaranteed distinct?" (Yes, per constraints — this kills all duplicate-handling logic. That's LeetCode 47's job.)
2. "Is the output order-sensitive?" (No — "in any order.")

## 2. Decoding the constraints

| Constraint | What it buys you / warns you about |
|---|---|
| `1 <= nums.length <= 6` | `n! ≤ 720`. The entire answer holds at most 720 × 6 = 4,320 numbers. Recursion depth ≤ 7. Even a sloppy `O(n²·n!)`-constant solution passes. You should still give the tight bound — the interviewer is testing whether you know it. |
| All integers unique | No deduplication needed **here**. But habit-track "used" by **index**, not by value — value-keyed logic silently breaks when duplicates appear (LC 47). |
| `-10 <= nums[i] <= 10` | Values can be negative — don't assume positivity or sortedness. No overflow risk anywhere: `n! ≤ 720` fits in any type. |
| "You can return the answer in any order" | The swap-based solution and the `used[]`-based solution emit rows in *different* orders — both are accepted. If the interviewer later asks for lexicographic order, sort `nums` first or loop with `next_permutation` from a sorted start. |

**Edge-case curiosity worth saying out loud:** the constraints exclude `n = 0`, but mathematically the empty sequence has exactly one permutation — the empty one — so a correct general-purpose implementation would return `[[]]`. The backtracking code below does this naturally (the root is immediately a leaf).

## 3. Brute force: the insertion method (with a worked trace)

Idea: build permutations incrementally. Start with the empty list. For each new element, **insert it into every possible slot** of every partial permutation built so far.

```python
def permute_bruteforce(nums):
    perms = [[]]
    for x in nums:                       # insert x into every slot of every partial perm
        nxt = []
        for p in perms:
            for slot in range(len(p) + 1):   # +1: slot == len(p) means "append at the end"
                nxt.append(p[:slot] + [x] + p[slot:])
        perms = nxt
    return perms
```

**Trace on `nums = [1,2,3]`** (Example 1):

| Step | Element | Slots tried | Permutations after step |
|---|---|---|---|
| 0 | — | — | `[[]]` |
| 1 | `1` | 1 slot | `[[1]]` |
| 2 | `2` | 2 slots each | `[[2,1], [1,2]]` |
| 3 | `3` | 3 slots each | `[[3,2,1],[2,3,1],[2,1,3], [3,1,2],[1,3,2],[1,2,3]]` |

Six results — correct. A useful little fact when you state complexity: the copy work at each level telescopes, because `j·j! = (j+1)! − j!`, so the total is `(n+1)! − 1 = Θ(n·n!)` — the same asymptotic class as the optimal method, just with worse constants and lots of throwaway intermediate lists. For a zero-effort baseline in real code, `list(itertools.permutations(nums))` works, but in an interview you are expected to hand-write the backtracking.

## 4. The core insight

A permutation is built by a **sequence of choices**: for slot 0, pick one of the `n` unused values; for slot 1, pick one of the remaining `n−1`; and so on. This is a **decision tree**:

- Every root-to-leaf path is one permutation.
- There are exactly `n!` leaves.
- Walking the tree with DFS and **undoing each choice on the way back up** is backtracking: *choose → explore → unchoose*.

Three consequences you should state explicitly:

1. **Output lower bound.** Any correct algorithm must write `n!` lists of length `n`, i.e., `n·n!` numbers, so `Ω(n·n!)` time is unavoidable — the backtracking solution is therefore **output-optimal**.
2. **Memoization/DP cannot help.** The "remaining values" state *does* repeat (you reach `{3}` via both `[1,2]` and `[2,1]`), but each repeat feeds a different prefix, and every one of the `n!` final lists must still be materialized — there is no repeated work to save against the output bound. DP pays off when subproblems' *answers* are shared; here each leaf is a distinct required output.
3. **The invariant.** At every moment: `len(path) == number of True entries in used`, and `path` holds the values of exactly those `True` indices, in the order they were chosen. If your code maintains this, it is correct.

## 5. Optimal approach: backtracking with `used[]` + `path`

```python
def permute(nums: list[int]) -> list[list[int]]:
    n = len(nums)
    used = [False] * n        # indexed by POSITION i (i.e., "is nums[i] taken?"), not by value
    path = []                 # values chosen so far, in order
    res = []

    def dfs() -> None:
        if len(path) == n:                 # every slot filled -> one full permutation
            res.append(path.copy())        # MUST copy: path keeps mutating
            return
        for i in range(n):
            if used[i]:
                continue
            used[i] = True                 # choose
            path.append(nums[i])
            dfs()                          # explore
            path.pop()                     # un-choose
            used[i] = False

    dfs()
    return res
```

### Trace on Example 1: `nums = [1,2,3]`

```text
                     []
        /            |            \
     [1]           [2]           [3]
    /   \         /   \         /   \
 [1,2] [1,3]   [2,1] [2,3]   [3,1] [3,2]
   |     |       |     |       |     |
[1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]
```

Call-by-call for the first two leaves (then the pattern repeats):

| # | Action | `path` | `used` | Note |
|---|---|---|---|---|
| 1 | enter `dfs` at root | `[]` | `F F F` | try `i = 0` |
| 2 | choose idx 0 (val 1) | `[1]` | `T F F` | try `i = 1` |
| 3 | choose idx 1 (val 2) | `[1,2]` | `T T F` | try `i = 2` |
| 4 | choose idx 2 (val 3) | `[1,2,3]` | `T T T` | leaf → emit `[1,2,3]` |
| 5 | unchoose idx 2 | `[1,2]` | `T T F` | loop exhausted → return |
| 6 | unchoose idx 1 | `[1]` | `T F F` | root loop tries `i = 2` |
| 7 | choose idx 2 (val 3) | `[1,3]` | `T F T` | try `i = 1` |
| 8 | choose idx 1 (val 2) | `[1,3,2]` | `T T T` | leaf → emit `[1,3,2]` |
| … | unwind ×2, root tries `i = 1`, then `i = 2` | … | … | emits `[2,1,3],[2,3,1],[3,1,2],[3,2,1]` |

Note the emitted order **exactly matches the expected output** of Example 1 (scanning indices ascending, with the input already sorted). It doesn't have to — but it's a nice sanity signal.

### Trace on Example 2: `nums = [0,1]`

Root → choose idx 0 (val 0) → `[0]` → only idx 1 remains → leaf, emit `[0,1]`; unwind → root → choose idx 1 (val 1) → `[1]` → leaf, emit `[1,0]`. Result: `[[0,1],[1,0]]`. ✔

### Trace on Example 3: `nums = [1]`

Root: `len(path) == 0 == n`? No — `n = 1`. Choose idx 0 → path `[1]`, now a leaf → emit `[1]`. Result: `[[1]]`. ✔

## 6. Elegant variant: in-place swap

Instead of a `used[]` array, keep the candidate values physically in `nums[i..n-1]` and freeze the prefix `nums[0..i-1]` by swapping.

```python
def permute(nums: list[int]) -> list[list[int]]:
    res, n = [], len(nums)

    def dfs(i: int) -> None:
        if i == n:                      # base case: i has walked PAST the last slot
            res.append(nums.copy())
            return
        for j in range(i, n):
            nums[i], nums[j] = nums[j], nums[i]   # bring nums[j] into slot i
            dfs(i + 1)
            nums[i], nums[j] = nums[j], nums[i]   # restore BEFORE the next j

    dfs(0)
    return res
```

For `[1,2,3]` this emits `[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,2,1],[3,1,2]` — a *different* valid order than the `used[]` version (note `[3,2,1]` now precedes `[3,1,2]`). Same asymptotics, no `used`/`path` arrays; it's the idiom of choice in C++/Java. One subtlety to mention if you use it: it's fine to mutate the input array here, but say so out loud ("I'm reordering `nums` and restoring it; if the caller needs the original order, I'll restore it fully by the end — which the paired swaps guarantee").

## 7. Complexity table

| Approach | Time | Auxiliary space (excl. output) | Notes |
|---|---|---|---|
| Insertion brute force | `Θ(n·n!)` — copy cost telescopes to `(n+1)! − 1` | `O(n)` beyond output (previous level is ≤ output/n in size) | Copy-heavy, allocates `(k+1)!` lists per level |
| Backtracking, `used[]` + `path` | `Θ(n·n!)` | `O(n)` — recursion depth `n`, `path`, `used` | Canonical interview answer |
| In-place swap | `Θ(n·n!)` | `O(n)` — recursion stack only | No `used`/`path`; different (valid) emission order |
| Repeated `next_permutation` from sorted start | `O(n·n!)` — `O(n)` scan per successor | `O(1)` extra if in-place and streamed | Lexicographic order |

Supporting facts to cite (with justification):

- **Total DFS calls ≈ `e·n!`:** the number of nodes at depth `k` is `P(n,k) = n!/(n−k)!`, so the total is `n!·Σ 1/k! < e·n! ≈ 2.72·n!` — per-node overhead is negligible next to the `O(n)` leaf copies.
- **Output optimality:** the answer itself contains `n·n!` numbers, so no algorithm beats `Θ(n·n!)` while materializing all lists.
- **Fun follow-up fact:** Johnson–Trotter can emit each successive permutation with a single adjacent transposition (constant amortized work *between* permutations), but writing each length-`n` answer still costs `Θ(n)`, so the total stays `Θ(n·n!)`.
- `n!` counting note: fits easily here (`720`); if you ever generalize, `long` overflows at `21!` (`20!` still fits in 64 bits).

## 8. Implementation gotchas in Java / C++

| Language | Gotcha | Fix / detail |
|---|---|---|
| Java | Leaf aliasing | `res.add(path)` stores a live reference — every row becomes the same list. Use `res.add(new ArrayList<>(path));` |
| Java | `List.remove` overloads | On `List<Integer>`, `remove(int)` removes **by index**, `remove(Object)` by value. `path.remove(path.size() - 1)` pops the tail correctly; `path.remove(x)` with an `int` variable may silently hit the index overload. Value removal requires `remove(Integer.valueOf(x))`. Autoboxing is irrelevant at `n ≤ 6` but prefer `boolean[] used` over `HashSet<Integer>`. |
| C++ | Value semantics cut both ways | `res.push_back(path)` **copies** (safe — unlike Python/Java refs), but you must still `path.pop_back()` to backtrack; forgetting it pollutes sibling branches. Pass `vector<int>&` by reference — by-value parameters copy `O(n)` per call. |
| C++ | `std::next_permutation` | Only traverses **all** `n!` orderings if you start from an ascending-sorted range; from any other start you only get the lexicographic tail, and it returns `false` after wrapping to the smallest arrangement. |

## 9. Common mistakes (symptom → cause → fix)

1. **All output rows are identical (often empty).** You appended `path` itself, which keeps mutating. Fix: `res.append(path.copy())` (or `list(path)` / `path[:]`).
2. **Missing or short permutations.** A "choose" without its "un-choose": missing `used[i] = False`, `path.pop()`, or the swap-back. Fix: treat *choose → explore → unchoose* as an atomic triple.
3. **Swap-back placed after the `for` loop** in the swap variant — only the first child of each node is correct. Fix: restore immediately after `dfs` returns, inside the loop.
4. **Marking `used` by value instead of by index.** Works here because values are distinct, and it's a habit that detonates on Permutations II. Fix: key `used` by position.
5. **Wrong base case in the swap variant** — `i == n - 1` instead of `i == n` (you record when the *past-the-end* slot is reached, i.e., all `n` slots are frozen). Symptom: rows of length `n−1` or missing leaves.
6. **Dedupe hack `if perm not in res`** — `O(n)` comparison per leaf, pure overhead here (distinct values make duplicates impossible), and it masks rather than fixes duplicate handling.
7. **Assuming lexicographic output is required.** "Any order" — but if asked for lexicographic, sort `nums` first (the ascending index scan then yields lexicographic rows) or use the `next_permutation` loop.
8. **Off-by-one in the brute force:** `range(len(p))` instead of `range(len(p) + 1)` drops the "append at end" slot and silently loses rows like `[1,2,3]`.

## 10. Test cases to propose out loud

Before or right after coding, say: *"Let me pin down tests — the three examples, plus a couple of edges."*

| Test | Input | Expected | What it checks |
|---|---|---|---|
| Official 1 | `[1,2,3]` | 6 rows: `[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]` (any order) | Full tree, matches sample |
| Official 2 | `[0,1]` | `[[0,1],[1,0]]` | Small case, value `0` present |
| Official 3 | `[1]` | `[[1]]` | Minimal input, single leaf |
| Edge: negatives & extremes | `[-10, 10]` | `[[-10,10],[10,-10]]` | No positivity/sortedness assumptions |
| Edge: max size | `[1,2,3,4,5,6]` | Exactly **720** rows | `n!` count, runtime, recursion depth 7 |
| Out-of-contract (mention only) | `[]` | `[[]]` | Mathematically one permutation of the empty sequence |

Property checks to state (great signal, cheap to run): `len(res) == n!`; all rows pairwise distinct (`len(set(map(tuple, res))) == n!`); every row sorted equals `sorted(nums)` (multiset preserved); each row has length `n`. Locally, `itertools.permutations` is a perfect oracle.

## 11. Transferable patterns & related problems

**The pattern:** "enumerate all X" → DFS over a decision tree with *choose / explore / unchoose*. The two axes that change across the family are (a) what the choices at each node are, and (b) what pruning/dedupe rule applies:

- **Permutations:** choose any *unused* index → `used[]` array.
- **Combinations / Subsets with a `start` index:** choose only from indices `≥ start` → kills order-duplicates; no `used[]` needed.
- **Subsets:** binary include/exclude branching per element.
- **Pruning:** add a feasibility test before recursing (N-Queens conflicts, Beautiful Arrangement predicates) — pruning, not memoization, is what tames these searches.

| Problem | What changes |
|---|---|
| LC 47 Permutations II | Duplicates allowed → sort, then skip `nums[j] == nums[j-1]` when `nums[j-1]` is unused at this depth (or iterate distinct values with remaining counts). Note: today's code would emit duplicate rows if the distinctness guarantee were dropped — the dedupe layer is genuinely extra. |
| LC 78 / 90 Subsets I/II | Include/exclude branching; II adds the same skip-duplicate rule on a sorted array. |
| LC 77 Combinations | `used[]` replaced by a `start` boundary; length-`k` base case. |
| LC 39 / 40 Combination Sum | Same skeleton; reuse vs. no-reuse encoded in what you pass to the recursive call. |
| LC 31 Next Permutation | Lexicographic successor *without* enumeration — find pivot, successor, reverse suffix. |
| LC 60 Permutation Sequence | k-th permutation in `O(n²)` via the factorial number system: each position's value is picked by dividing out `(remaining−1)!` block sizes, so no enumeration is needed. |
| LC 526 Beautiful Arrangement / LC 51 N-Queens | Permutation-shaped backtracking where pruning is the real problem. |

Also flag the meta-lesson: **backtracking vs. DP**. Backtracking when every leaf is a distinct required output (this problem); DP/memoization when states repeat and their *answers* can be reused (counting paths, etc.). Interviewers love hearing that distinction.

## 12. Full interview talk track

> *"This asks for every ordering of n distinct numbers — that's n! lists, so the output itself is factorial-sized. Since n ≤ 6, n! ≤ 720, so the problem is really testing whether I can enumerate a decision tree cleanly and state the right complexity.*
>
> *My plan: build the answer slot by slot. At each slot I try every value whose index isn't used yet, mark it used, append it to a path, recurse, then undo both — choose, explore, unchoose. The invariant is that the path always equals the values at the used indices in choice order. When the path reaches length n, I've built one permutation and I append a copy of it — the copy matters, because the path keeps mutating and appending the live list would alias every row.*
>
> *Complexity: there are n! leaves, each costing O(n) to copy, so Θ(n·n!) time — and that's optimal, because just writing n! lists of length n costs that much. Extra space is O(n) for the recursion stack, path, and used array; the output dominates otherwise. Total DFS calls are under e·n!, so per-node overhead is negligible.*
>
> *An alternative is the in-place swap version: keep the unused values in the tail of the array, swap each candidate into slot i, recurse on i+1, swap back inside the loop. Same bounds, no used array; it emits rows in a different but still-valid order since 'any order' is accepted. For real code I'd reach for itertools.permutations, but I'm happy to hand-write the backtracking.*
>
> *Tests: the three examples; negatives like [-10, 10] so I'm not assuming positivity or sortedness; and a six-element input where I assert exactly 720 distinct rows, each a rearrangement of the input. Also worth noting: with n = 0 the code returns [[]], which is mathematically right — one permutation of the empty sequence — though the constraints exclude it. If the interviewer follows up with duplicates, that's Permutations II: sort, and skip a repeated value at the same depth unless its left twin is already used."*

## 13. Say it in 60 seconds

> *"Permutations: return all n! orderings of n distinct numbers, any order. n ≤ 6, so the answer is tiny — the real task is clean enumeration. I use backtracking: build the result slot by slot; at each slot try every unused index, mark it used, append the value to a path, recurse, then undo the mark and the pop. Base case: path length equals n — append a **copy** of the path, since the live list keeps mutating. Time is Θ(n·n!): n! leaves, O(n) per copy — and that's optimal because the output itself has n·n! numbers. Extra space is O(n): recursion, path, used. Two traps I always check: every choose has its un-choose, and every append is a copy. A slick alternative is in-place swapping with a frozen prefix, which emits the rows in a different but still-valid order. If duplicates existed — Permutations II — I'd sort and skip repeated values at the same depth. Tests: the three examples, a negatives case like [-10, 10], and a six-element input where I assert exactly 720 distinct rows."*
