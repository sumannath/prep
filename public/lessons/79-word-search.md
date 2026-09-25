# Word Search (LeetCode 79) — Complete Lesson

## 1. Problem restated in your own words

You're given an `m x n` grid of characters and a string `word`. Return `true` if you can trace `word` through the grid by starting at any cell and repeatedly stepping **up, down, left, or right** to a neighboring cell, spelling one character of the word per cell — and **no cell may appear twice** in the trace. Otherwise return `false`.

**Notation used throughout (be this precise when you speak):**

| Symbol | Meaning |
|---|---|
| `(i, j)` | cell coordinates, `i` ∈ `[0, m)`, `j` ∈ `[0, n)` (row, column) |
| `board[i][j]` | the **value** (character) at that cell |
| `k` | **index** into `word`, `k` ∈ `[0, L)`, where `L = len(word)` |
| Invariant | `dfs(i, j, k)` is only ever called when `board[i][j] == word[k]` |

Note what the problem does **not** restrict: letters may repeat anywhere. The same letter may appear in many cells, and `word` may contain repeated letters (`"ABCB"`). The only "no duplicates" rule is on **cells**, not characters. Matching is positional: position `k` of the word must match the character of the cell you're standing on at step `k`.

## 2. Constraint decoding — what the limits are telling you

| Constraint | Implication for strategy |
|---|---|
| `1 <= m, n <= 6` → at most **36 cells** | The search space is tiny; exponential-in-word-length backtracking is acceptable. |
| `1 <= word.length <= 15` | Recursion depth ≤ 15 → no stack concerns in any language. Also: if `L > m·n`, the answer is immediately **false** (you need `L` distinct cells). |
| Letters are only `A–Z` / `a–z` | A sentinel character like `'#'` is guaranteed to never collide with a real letter — this unlocks the in-place marking trick. |
| Both lowercase and uppercase appear | Comparison is **case-sensitive**; `'a' != 'A'`. |
| Adjacent = 4-directional only | Diagonals are forbidden; a careless 8-direction loop produces wrong `true` answers. |
| Return is a single boolean, "exists or not" | This is an **existential** search → short-circuit on first success; don't enumerate all paths. |

A sober honesty point worth saying out loud: if `word` could be as long as `m·n`, this problem becomes NP-complete — it can encode Hamiltonian path on grid graphs, which Itai, Papadimitriou, and Szwarcfiter showed is NP-complete in 1982. The small bound `L ≤ 15` is exactly why exhaustive backtracking is the *intended* optimal solution rather than a naive one.

## 3. Brute force: generate-and-test every self-avoiding walk

**Idea.** From every cell, enumerate **all self-avoiding walks** (paths that never revisit a cell) of length `L`, build the string each walk spells, and compare it to `word`. "Self-avoiding" is enforced by carrying a `used` set.

```python
def exist_bruteforce(board, word):
    m, n = len(board), len(board[0])
    L = len(word)
    if L > m * n:
        return False
    DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def walks(i, j, path, used):
        if len(path) == L:                       # walk complete → only NOW compare
            yield ''.join(path)
            return
        for di, dj in DIRS:
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n and (ni, nj) not in used:
                used.add((ni, nj)); path.append(board[ni][nj])
                yield from walks(ni, nj, path, used)
                path.pop(); used.discard((ni, nj))

    for i in range(m):
        for j in range(n):
            for s in walks(i, j, [board[i][j]], {(i, j)}):
                if s == word:
                    return True
    return False
```

**Worked trace** on Example 1 (`word = "ABCCED"`), starting the enumeration at `(0,0) = 'A'`. The generator extends *every* branch to full length 6 and only then string-compares (tree shown truncated for readability):

```
(0,0)'A'
├─ (0,1)'B'
│  ├─ (0,2)'C'
│  │  ├─ (0,3)'E' → builds "ABCE??" … completes, compares: "ABCE.." ≠ "ABCCED" ✗
│  │  └─ (1,2)'C'
│  │     ├─ (1,1)'F' → "ABCCF.." → compare ✗
│  │     ├─ (1,3)'S' → "ABCCS.." → compare ✗
│  │     └─ (2,2)'E'
│  │        ├─ (2,3)'E' → "ABCCEE" → compare ✗
│  │        └─ (2,1)'D' → "ABCCED" → compare ✓ MATCH
│  └─ (1,1)'F' → enumerates every continuation "ABF…" to length 6 → all compare ✗
└─ (1,0)'S' → enumerates every continuation "AS…" to length 6 → all compare ✗
```

**Why it's slow:** the branch `AS…` has *already diverged from the word at position 1*, yet the brute force grows it four more levels and string-compares at the end. Dozens of walks from this one start, times every other start. The fix is obvious the moment you see the trace — compare **as you go**.

## 4. The core insight

1. **Match one character per step.** Don't build strings. At each cell, you know exactly which character must come next (`word[k+1]`), so a neighbor is worth visiting **only if it's in bounds, unvisited, and holds that exact character**. Mismatched branches die at depth 1 instead of depth L.
2. **Backtracking = mark, then un-mark.** DFS explores one candidate path at a time. While a cell is on the current path, mark it as used; when you retreat, *un-mark it* so sibling candidate paths can use it. Without the un-mark, cell `(0,1)` would be poisoned for every future path once one path visited it — a classic false-negative bug.
3. **The sentinel trick unifies two checks into one.** Overwrite the current cell's value with `'#'` to mark it. Since the board contains only letters (per constraints), the single test `board[ni][nj] == word[k+1]` now simultaneously performs the character match **and** the visited check — no separate visited structure, O(1) state reversal, zero extra memory.
4. **Existential short-circuit.** The question is "does *any* path work," so return `True` up the call stack the moment one does, and never touch the remaining search tree.

## 5. Optimal approach: DFS + backtracking with in-place marking

**Algorithm.**

1. For every cell `(i, j)` with `board[i][j] == word[0]`, call `dfs(i, j, 0)`.
2. `dfs(i, j, k)` — precondition: `board[i][j] == word[k]`:
   - If `k == L - 1`, the whole word is matched → return `True` (handle this **before** touching anything, so `L = 1` works).
   - Save the cell's value, overwrite it with `'#'` (remove it from the grid for the duration of this path).
   - For each of the 4 neighbors: if in bounds **and** `board[ni][nj] == word[k+1]`, recurse with `k + 1`; propagate `True` immediately.
   - Restore the saved value (backtrack), return `False`.

```python
def exist(board: list[list[str]], word: str) -> bool:
    m, n = len(board), len(board[0])
    L = len(word)
    DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))   # down, up, right, left

    def dfs(i: int, j: int, k: int) -> bool:
        # Precondition (guaranteed by caller): board[i][j] == word[k]
        if k == L - 1:                          # matched the last character
            return True
        saved = board[i][j]
        board[i][j] = '#'                       # mark: cell temporarily removed
        for di, dj in DIRS:
            ni, nj = i + di, j + dj
            # bounds check MUST come first (see Python gotcha in §8)
            if 0 <= ni < m and 0 <= nj < n and board[ni][nj] == word[k + 1]:
                if dfs(ni, nj, k + 1):
                    board[i][j] = saved         # restore even on the success path
                    return True
        board[i][j] = saved                     # un-mark: backtrack
        return False

    for i in range(m):
        for j in range(n):
            if board[i][j] == word[0] and dfs(i, j, 0):
                return True
    return False
```

Note the restore-on-success: leaving `'#'` behind corrupts the board, which matters if the function is called repeatedly (and is just good hygiene in an interview).

### Trace — Example 1, `word = "ABCCED"` (expected `true`)

Starts (cells equal to `'A'`): `(0,0)`, `(2,0)`. Marker `#` = currently on path.

```
dfs(0,0,0): 'A'=='A' ✓ → mark (0,0)=#
│  neighbors: (1,0)='S' vs word[1]='B' ✗   |   (0,1)='B' ✓
│
├─ dfs(0,1,1): 'B'=='B' ✓ → mark (0,1)=#
│  │  neighbors: (1,1)='F' vs 'C' ✗  |  (0,2)='C' ✓  |  (0,0)='#' ✗
│  │
│  ├─ dfs(0,2,2): 'C'=='C' ✓ → mark (0,2)=#
│  │  │  neighbors: (1,2)='C' vs word[3]='C' ✓  |  (0,3)='E' vs 'C' ✗  |  (0,1)='#' ✗
│  │  │
│  │  ├─ dfs(1,2,3): 'C'=='C' ✓ → mark (1,2)=#
│  │  │  │  neighbors: (2,2)='E' vs word[4]='E' ✓  |  (0,2)='#' ✗
│  │  │  │                |  (1,3)='S' vs 'E' ✗  |  (1,1)='F' vs 'E' ✗
│  │  │  │
│  │  │  ├─ dfs(2,2,4): 'E'=='E' ✓ → mark (2,2)=#
│  │  │  │  │  neighbors: (2,3)='E' vs word[5]='D' ✗  |  (2,1)='D' ✓
│  │  │  │  │
│  │  │  │  └─ dfs(2,1,5): k == L-1 (5) → return TRUE 🎯
│  │  │  │     path: (0,0)A → (0,1)B → (0,2)C → (1,2)C → (2,2)E → (2,1)D
│  │  └─ restore (1,2)='C', propagate True
│  └─ restore (0,2)='C', propagate True ... unwinds to the top, return true
```

Interesting pedagogical note: this trace contains **zero backtracking** — the first dive succeeds because the neighbor order happened to be lucky. Say that out loud; a lucky trace on one example proves nothing about the algorithm, which is why Example 3 matters.

### Trace — Example 2, `word = "SEE"` (expected `true`)

Starts (cells equal to `'S'`): `(1,0)`, `(1,3)`.

```
dfs(1,0,0): 'S' ✓ → mark
   neighbors: (2,0)='A' vs 'E' ✗ | (0,0)='A' ✗ | (1,1)='F' ✗
   → dead end → restore (1,0)='S', return False      ← first start FAILS entirely
dfs(1,3,0): 'S' ✓ → mark
   neighbors: (2,3)='E' ✓ (down tried first)
   ├─ dfs(2,3,1): 'E' ✓ → mark
   │     neighbors: (2,2)='E' vs word[2]='E' ✓
   │     └─ dfs(2,2,2): k == L-1 → TRUE 🎯   path: (1,3)S → (2,3)E → (2,2)E
```

Had the neighbor order tried **up** first — `dfs(0,3,1)` on `E(0,3)` — that branch would scan its neighbors `(0,2)='C'` ✗ and `(1,3)='#'` (already on path) ✗ and die, forcing a backtrack before finding the real path through `(2,3)`. This shows the "restore so sibling branches can use the cell" mechanic even inside a successful search.

### Trace — Example 3, `word = "ABCB"` (expected `false`)

```
dfs(0,0,0): 'A' ✓ → mark
   (1,0)='S' vs 'B' ✗ | (0,1)='B' ✓
   ├─ dfs(0,1,1): 'B' ✓ → mark
   │   (1,1)='F' vs 'C' ✗ | (0,2)='C' ✓
   │   ├─ dfs(0,2,2): 'C' ✓ → mark
   │   │   need word[3]='B': neighbors of (0,2):
   │   │     (1,2)='C' ✗ | (0,3)='E' ✗ | (0,1)='#' ✗   ← the ONLY 'B' nearby is
   │   │   → dead → restore (0,2)='C'                    (0,1), which is ON THE PATH
   │   (0,0)='#' ✗ → dead → restore (0,1)='B'
   → dead → restore (0,0)='A'
dfs(2,0,0): 'A' ✓ → mark
   (1,0)='S' ✗ | (2,1)='D' vs 'B' ✗ → dead → restore
return False ✓
```

The decisive moment: the final `C(0,2)` has exactly one adjacent `'B'` — `(0,1)` — which is marked `#` because it's already on the path. The cell-reuse rule is what kills this candidate; a naive substring-matching approach that ignores cell reuse would incorrectly return true. Note also that the letters `A, B, C, B` all *exist* in the board with sufficient multiplicity except `B` (board has one `B`, the word needs two) — see §6 for how a cheap pre-check catches this instantly.

### Full interview talk track (the script the 60-second version is distilled from)

1. "This is an existence question over self-avoiding paths in a grid, so I'll use DFS with backtracking rather than trying to enumerate or DP it."
2. "I'll try every cell that matches the word's first letter as a starting point."
3. "In the DFS I carry an index `k` into the word; the invariant is that the cell I'm standing on matches `word[k]`."
4. "To prevent cell reuse I temporarily overwrite the current cell with `'#'` — safe because the alphabet is letters only — and restore it when I backtrack, so sibling paths can reuse it."
5. "Success is `k == L-1`; I short-circuit `True` up the stack and never explore the rest."
6. "Time: each step branches to at most 3 unvisited neighbors (the cell I came from is marked), depth L, times at most m·n starting cells. Space: O(L) recursion."
7. "Edge cases: single-letter word, word longer than the grid, repeated letters like `ABCB` where the reuse rule decides the answer."
8. "For the follow-up: prune with a letter-count check and start from the rarer end."

## 6. Follow-up: search pruning for larger boards

The follow-up asks how to go faster on a bigger board. Honest framing first: **pruning improves the average case, not the worst case** — an adversarial board where every prefix matches still forces near-full exploration, and the general problem is NP-hard (see §7). Under the given constraints, though, these prunes are dramatic wins:

1. **Quick reject: `L > m*n` → false.** You need `L` distinct cells.
2. **Letter-budget precheck (multiset feasibility).** Count letters in the board and in the word; if the word needs more of any letter than the board has, return `false` before any DFS. O(m·n + L) and it instantly rejects Example 3 (`"ABCB"` needs two `B`s; the board has one). Crucial caveat: this check is **necessary, not sufficient** — see the `aba` test in §9.
3. **Search from the rarer end.** If `word[0]` is *more* common in the board than `word[-1]`, search for `reversed(word)` instead. Fewer matching starting cells usually means a far smaller tree (e.g., in Example 1, `'A'` appears twice but `'D'` once — reverse `ABCCED` → `DECCED`... `DECCED` reversed is the same search rooted at the single `D`). This is a heuristic: it changes constants, not asymptotics.
4. **Start cells only where `board[i][j] == word[0]`** (already in the base solution) — don't launch DFS from cells that can't even match.
5. **Short-circuit, never aggregate.** Return on first `True`; a `sum(dfs(...) for ...)`-style fold explores everything.

```python
from collections import Counter

def exist(board: list[list[str]], word: str) -> bool:
    m, n = len(board), len(board[0])
    L = len(word)

    if L > m * n:                                         # prune 1
        return False
    board_cnt = Counter(c for row in board for c in row)  # prune 2
    if any(Counter(word)[c] > board_cnt[c] for c in set(word)):
        return False
    if board_cnt[word[0]] > board_cnt[word[-1]]:          # prune 3 (heuristic)
        word = word[::-1]

    DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def dfs(i, j, k):
        if k == L - 1:
            return True
        saved, board[i][j] = board[i][j], '#'
        for di, dj in DIRS:
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n and board[ni][nj] == word[k + 1]:
                if dfs(ni, nj, k + 1):
                    board[i][j] = saved
                    return True
        board[i][j] = saved
        return False

    for i in range(m):
        for j in range(n):
            if board[i][j] == word[0] and dfs(i, j, 0):
                return True
    return False
```

What each prune buys: prunes 1–2 convert many impossible inputs into O(m·n) rejections; prune 3 typically shrinks the number of DFS launches; prune 4 is the difference between "first match returns" and "exhaustive scan." None of them change the worst-case bound.

## 7. Complexity table

Let `m·n` be the board size and `L = len(word)`.

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Generate-and-test all self-avoiding walks | O(m·n · L · 3^(L−1)) | O(L) | Builds every path to full length, then compares — the `L` factor is the string compare; divergent branches are still fully enumerated |
| **DFS + backtracking, per-step match (main solution)** | **O(m·n · 3^(L−1))** | **O(L)** recursion + O(1) marking | Each node does O(4) work; success short-circuits |
| Same, with a `visited` boolean matrix | O(m·n · 3^(L−1)) | O(m·n) | Use when the input must stay pristine / is immutable |
| Main solution + §6 pruning | Same worst case, much faster in practice | O(m·n + L) for counters | Follow-up answer |

**Derivation of the main bound (say this, don't just cite it):** at most `m·n` starting cells; from each, the DFS has depth at most `L−1` edges; at each level, at most 4 neighbors are considered but the cell we came from is marked `'#'`, so at most **3** can match → ≤ 3^(L−1) nodes per start. Each node does constant work. With `m·n ≤ 36` and `L ≤ 15`, the ceiling is 36 · 3¹⁴ ≈ 1.7 × 10⁸ — loose, because boundary cells and the self-avoiding requirement cut real branches far earlier (the number of self-avoiding walks on the square lattice actually grows like μ^L with μ ≈ 2.64, a value established by exhaustive enumeration and matching rigorous bounds — so 3 is merely a convenient upper bound).

**Why not memoize / DP?** A DP or `lru_cache` over `(i, j, k)` is wrong because reachability depends on *which cells are already used*; the true state includes the visited set, of which there are exponentially many. This is a search problem, not a subproblem-overlap problem.

**General case note (justified, not assumed):** if `L` were allowed up to `m·n`, the problem is NP-complete — a word of length `m·n` can encode Hamiltonian path on grid graphs, which Itai, Papadimitriou & Szwarcfiter proved NP-complete (1982) — so exponential backtracking is expected, and the small `L ≤ 15` cap is what makes it fast.

## 8. Common mistakes and language gotchas

| Mistake | Symptom / why it bites | Fix |
|---|---|---|
| Forgetting to restore the cell (or not restoring on the success path) | Board left full of `'#'` → later starts/branches see phantom mismatches → false negatives; corrupted input for repeated queries | Restore on **every** exit path; restore from a `saved` local, not from `word[k]` unless the invariant is airtight |
| Sentinel collides with real data | Overwriting with `'#'` breaks if the board could ever contain `'#'` | Safe here (letters only); in general save the original char in a local first |
| Base-case off-by-one | `word[k+1]` IndexError on the last character; single-letter words fail | Fix the invariant: `k` = index being matched at the current cell; return `True` when `k == L-1`, checked **before** any marking |
| Visited state never removed | `used.add(...)` without `used.remove(...)` (or a matrix never cleared) poisons sibling branches → false negatives | Mark and un-mark symmetrically; test with a word that needs the same cell in two different candidate paths |
| Python negative indexing | `board[-1][2]` silently reads the **last row**, so a bad `ni = -1` can accidentally match a character → wrong `true` | Bounds check first; rely on `and` short-circuiting before the equality test |
| Diagonals allowed | 8-direction loop violates the spec → false positives | Exactly 4 direction vectors |
| No short-circuit | `result = result or dfs(...)` / collecting all paths explores the whole tree | Return `True` up the stack immediately |
| Slicing the word per call | `word[k:]` (Python), `word.substring(k)` (Java), `word.substr(k)` (C++) copies O(L) characters at every node → silently turns O(3^L) into O(3^L·L) | Pass the integer index `k` |
| Multiset check treated as sufficient | `Counter(board) ⊇ Counter(word)` is necessary but **not** sufficient — the path/adjacency constraint is what fails for e.g. `"aba"` on `[["a","b"],["a","c"]]` | Use it as a prune only, then run the DFS |

**Java / C++ specifics (short list):**

| Language | Gotcha |
|---|---|
| C++ | Pass `std::vector<std::vector<char>>& board` **by reference** — taking it by value copies the whole grid on every recursive call. Same story for `word.substr(k)` per node; pass an index. |
| C++ | Marking via `board[i][j] = '#'` is fine for `char`; if you use the XOR trick `board[i][j] ^= 256`, remember it must be XORed again to restore. |
| Java | Prefer `boolean[][] visited` or in-place `'#'` over `HashSet<Character>`/`HashSet<Integer>` — boxed keys mean autoboxing + hashing on every step. Avoid `word.substring(k)` per call (garbage churn); use `word.charAt(k)` with an index. |
| Java | The `board[i][j] ^= 256` marking trick works because `char` is an unsigned 16-bit type; forgetting to XOR back corrupts the board. |
| Python | Don't mutate-and-forget: rows are lists so in-place marking works, but restore faithfully. If the input were tuples/strings you'd need an explicit visited set (with add/remove in the backtrack step). |

## 9. Test cases to propose out loud (before or while coding)

Say something like: "Let me pin down a few cases before coding — single-letter word, word longer than the grid, a word that's only false because of the reuse rule, and case sensitivity."

| # | Input | Expected | What it guards |
|---|---|---|---|
| 1 | Example 1 board, `word="ABCCED"` | `true` | Official happy path |
| 2 | Example 1 board, `word="SEE"` | `true` | First start fails entirely, second succeeds |
| 3 | Example 1 board, `word="ABCB"` | `false` | Reuse rule rejects the only candidate path |
| 4 | `board=[["A"]]`, `word="A"` | `true` | `L == 1` base case fires before any marking |
| 5 | `board=[["a"]]`, `word="aa"` | `false` | `L > m·n` quick reject (also: no second cell) |
| 6 | Example 1 board, `word="abcced"` | `false` | Case-sensitive comparison (`'a' != 'A'`) |
| 7 | `board=[["a","b","a"],["b","b","b"]]`, `word="abab"` | `true` | Requires genuine backtracking: the first dive `a(0,0)→b(1,0)→b(1,1)` dies hunting for a third letter `a`, unwinds, and the path through the top row succeeds |
| 8 | `board=[["a","b"],["a","c"]]`, `word="aba"` | `false` | Multiset check passes (`a×2, b×1` all present) but **no valid path exists** — proves the letter budget alone can't answer the question |
| 9 | 6×6 board of all `'a'`, `word="a"*15` | `true` | Uniform board; first dive wins — sanity + speed |
| 10 | 6×6 board of all `'a'`, `word="a"*14+"b"` | `false` | Killed instantly by the letter-budget prune (board has zero `b`s); without the prune it's the maximal-work case |

## 10. Transferable patterns and related problems

**Patterns you just exercised (reusable across ~dozens of problems):**

- **The backtracking template: choose → explore → un-choose.** Here "choose" = mark the cell, "explore" = 4 neighbors, "un-choose" = restore. The identical skeleton solves N-Queens, Sudoku, permutations, and everything below.
- **Existential vs. enumerative DFS.** "Return true if *there exists*…" → short-circuit on first success. "Count all / find the best" → explore everything, track a running answer. Read the return type before choosing.
- **Constraint checking *during* the search, not after.** The jump from brute force to the optimal solution is moving the string comparison from the end of each path to every single step. This "prune at the earliest deviation" idea generalizes to all backtracking.
- **In-place state marking with a sentinel + exact reversal.** O(1) visited bookkeeping whenever the container is mutable and a safe sentinel exists; otherwise a boolean matrix or add/remove set.
- **Global feasibility prunes before search.** Letter budgets, `L > m·n` — cheap necessary conditions that eliminate whole inputs before any DFS.
- **Why memoization doesn't apply.** If the feasibility of a state depends on the *set of cells used so far*, states are exponential and DP/caching is off the table — a distinction interviewers probe.

**Related problems:**

| Problem | Relationship |
|---|---|
| LC 212 — Word Search II | The real follow-up: many words at once → build a **Trie**, walk the grid once, prune Trie branches as they're exhausted |
| LC 1219 — Path with Maximum Gold | Same skeleton, but maximizing collected gold instead of existential true |
| LC 980 — Unique Paths III | Backtracking walk on a grid; count walks that cover every non-obstacle cell |
| LC 51/37 — N-Queens, Sudoku Solver | Mark/un-mark bookkeeping on row/column/diagonal or row/col/box instead of a grid cell |
| LC 46/78 — Permutations, Subsets | Where the choose/explore/un-choose template comes from |
| Boggle | This exact problem in the wild |

## 11. Say it in 60 seconds

> "Word Search asks whether *any* self-avoiding path through the grid spells the word — an existence question over paths, so I solve it with DFS plus backtracking. I scan every cell; wherever the cell equals the word's first letter, I launch a DFS that consumes the word one character at a time, moving only up, down, left, right. Before exploring, I mark my current cell by overwriting it with a sentinel character, so the same cell can't be reused on this path — and when a branch dead-ends, I restore the letter and backtrack, so other candidate paths can use that cell again. The moment I've matched the last character I return true and it propagates up; if every start fails, it's false. Time is m times n times 3-to-the-L, because each step branches to at most three unvisited neighbors — the fourth is the cell I came from — with O(L) recursion depth. For pruning on larger boards: first, reject immediately if the board doesn't contain enough of any letter the word needs; second, if the last letter is rarer than the first, search the reversed word so I branch from fewer starting cells. And I'd note that memoization doesn't help here — the state includes which cells are visited, so it's exponential."
