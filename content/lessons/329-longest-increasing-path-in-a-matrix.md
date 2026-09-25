# Longest Increasing Path in a Matrix (LeetCode 329)

**Pattern tag:** DFS + memoization on an *implicit DAG* (equivalently: topologically-ordered grid DP). **Difficulty:** Hard.

---

## 1. Problem Restatement (say it back in your own words)

> Given an `m x n` grid of integers, find the length of the longest path where each step moves **up, down, left, or right** to a **strictly greater** value. You may start at any cell. A single cell counts as a path of length 1.

Four clarifications worth saying out loud during the interview (they prevent 80% of bugs):

1. **"Increasing" is strict.** Two adjacent equal values cannot be chained. The examples confirm this: Example 1 has adjacent `9,9`, `6,6`, `1,1`; Example 2 has adjacent `3,3` and a `2,2,2` cluster — none of those pairs are usable moves.
2. **"Increasing" means any larger value, not `+1`.** Going from `2` to `4` is fine.
3. **Paths never revisit cells — automatically.** Since values strictly increase along a path and each cell has one fixed value, a revisit is impossible. You never need a `visited` set or backtracking.
4. **Return the length (a cell count), not the path itself.** Indices `(i, j)` are 0-indexed coordinates (row `i`, column `j`); `matrix[i][j]` is the *value* stored there; the answer is an integer in `[1, m*n]`.

---

## 2. Constraint Decoding — what the numbers are telling you

| Constraint | Implication for the solution |
|---|---|
| `1 <= m, n <= 200` | Up to **40,000 cells**. Anything exponential is dead; `O(mn)` or `O(mn log mn)` are both trivially fast. The answer is at most `m*n = 40,000`. |
| `0 <= matrix[i][j] <= 2^31 - 1` | Values fit exactly in a signed 32-bit int (`2^31 - 1 = 2,147,483,647 = INT_MAX`). We only ever **compare** values, never add/multiply them → **no overflow risk anywhere**. |
| Values are **not** guaranteed distinct | Duplicates are legal → the comparison must be strict `>`, never `>=`. |
| 4 directions, no wrap-around | The neighbor set of `(i, j)` is at most the 4 orthogonal cells; bounds-check each one. |
| `m, n >= 1` | No empty matrix per constraints, but a one-line guard `if not matrix: return 0` is cheap insurance. |

---

## 3. Brute Force: DFS from every cell (and why it dies)

The obvious approach: from every cell, DFS into strictly greater neighbors, no caching.

```python
def longestIncreasingPath_bruteforce(matrix):
    m, n = len(matrix), len(matrix[0])
    DIRS = ((-1, 0), (1, 0), (0, -1), (0, 1))

    def dfs(i, j):
        best = 1                                  # the cell alone
        for di, dj in DIRS:
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n and matrix[ni][nj] > matrix[i][j]:
                best = max(best, 1 + dfs(ni, nj))
        return best

    return max(dfs(i, j) for i in range(m) for j in range(n))
```

### Worked trace on Example 1: `[[9,9,4],[6,6,8],[2,1,1]]`

Call tree rooted at `dfs(2,1)` (the cell holding `1`; coordinates are `(row, col)`):

```
dfs(2,1) val=1
├── dfs(2,0) val=2                    (2 > 1)
│   └── dfs(1,0) val=6                (6 > 2)
│       └── dfs(0,0) val=9            (9 > 6, no greater neighbor) → 1
│       → 2
│   → 3
└── dfs(1,1) val=6                    (6 > 1)
    ├── dfs(0,1) val=9  → 1
    └── dfs(1,2) val=8  → 1
    → 2
→ 1 + max(3, 2) = 4                    path: 1 → 2 → 6 → 9
```

Then the outer loop calls `dfs(2,0)` again, which **recomputes** `dfs(1,0) → dfs(0,0)`; `dfs(1,0)` recomputes `dfs(0,0)` again; `dfs(1,1)` recomputes `dfs(0,1)` and `dfs(1,2)`… On this 3×3 toy the waste is visible but small: **23 calls for 9 distinct cells**. The real problem is scaling:

**The adversarial case.** Take `matrix[i][j] = i*n + j` (values increase rightward and downward). Then every right/down move is increasing, so from the top-left corner alone, the number of increasing paths reaching the bottom-right equals the number of monotone lattice paths, `C(m+n-2, m-1)` — about `4^n / √n` for `m = n` — and the naive call tree contains a branch for each of them, so the runtime is exponential in the grid size.

---

## 4. The Core Insight

**The strictness is the hero of this problem.** Because every move goes to a *strictly larger* value:

1. **No cycles.** Values strictly increase along any walk, so a walk can never return to a cell (its value would have to be both `<` and `>` itself along the loop). The implicit graph — cells as nodes, allowed moves as edges — is a **DAG**.
2. **No in-progress revisits during DFS.** On the recursion stack, values strictly increase from bottom to top; a "back edge" to an ancestor would need the ancestor's value to be simultaneously smaller (chain) and larger (new edge). Impossible. So a cell is never on the stack twice → **memoization alone is safe; no `visited` set, no un-marking.**
3. **The future depends only on the current cell, not the path taken.** Whether you can extend from `(i, j)` — and how far — is a function of `(i, j)` alone. That's exactly the memoization condition. (Contrast with problems like *Path with Maximum Gold*, where the visited set matters and memoizing on the cell is *wrong*.)

**Recurrence.** Let `f(i, j)` = length of the longest increasing path **starting** at `(i, j)`:

```
f(i, j) = 1 + max( f(ni, nj) )   over orthogonal neighbors (ni,nj)
                                 with matrix[ni][nj] > matrix[i][j]
         = 1                     if no such neighbor (max over empty set = 0)

answer = max over ALL cells (i, j) of f(i, j)
```

This is just "longest path in a DAG, computed lazily with DFS + memo."

---

## 5. Optimal Approach: DFS + Memoization

### Trace on Example 1: `[[9,9,4],[6,6,8],[2,1,1]]`

Final memo table (`f` = longest path *starting* at that cell):

```
values            f
9  9  4           1  1  2
6  6  8           2  2  1
2  1  1           3  4  2
                        ^ answer = 4 at (2,1)
```

Key entries:
- `f(0,0) = 1`: neighbor `(0,1)` holds `9` — **equal, blocked by strictness**; no greater neighbor.
- `f(1,0) = 2`: `9 > 6` at `(0,0)` → `1 + 1`.
- `f(2,0) = 3`: `6 > 2` at `(1,0)` → `1 + 2`.
- `f(2,1) = 4`: `(2,0)=2` gives `1+3 = 4`; `(1,1)=6` gives only `1+2 = 3`; `(2,2)=1` is equal → blocked. Answer `1 → 2 → 6 → 9` = `[1, 2, 6, 9]`. ✓

Every cell is computed **exactly once**; later calls hit the memo (18 total invocations vs. 23 naive on this toy — and the gap explodes on the adversarial grids from §3).

### Trace on Example 2: `[[3,4,5],[3,2,6],[2,2,1]]` — the duplicates showcase

```
values            f
3  4  5           4  3  2
3  2  6           1  4  1
2  2  1           2  1  2
```

- `(1,0)=3`: its only promising partner `(0,1)=4` is **diagonal** — not allowed (this is exactly what the problem's note about diagonals is pointing at). `f(1,0) = 1`. Meanwhile `(0,0)=3` is equal to it → also blocked.
- The `2,2,2` cluster `(2,0), (2,1), (1,1)`: no moves **among equals**; with a `>=` bug you'd cycle here forever.
- `f(0,1) = 3` (via `5 → 6`), so `f(0,0) = 1 + 3 = 4` → path `3 → 4 → 5 → 6`. ✓
- Note the answer is achieved from **two** different starts: `(0,0)` (`3→4→5→6`) and `(1,1)` (`2→4→5→6`). This is why the final step must be a **max over all cells** — returning `f(0,0)` works here by luck but is a bug in general.

### Example 3: `[[1]]` → `f(0,0) = 1`. Trivial, but it pins the base case.

### Implementation (Python)

```python
import sys

class Solution:
    def longestIncreasingPath(self, matrix: list[list[int]]) -> int:
        m, n = len(matrix), len(matrix[0])
        # memo[i][j] == 0 means "not computed yet".
        # This sentinel is safe because every real answer is >= 1.
        memo = [[0] * n for _ in range(m)]
        DIRS = ((-1, 0), (1, 0), (0, -1), (0, 1))

        def dfs(i: int, j: int) -> int:
            """Length of longest strictly increasing path STARTING at (i, j)."""
            if memo[i][j]:
                return memo[i][j]
            best = 1                                   # the cell by itself
            for di, dj in DIRS:
                ni, nj = i + di, j + dj
                if 0 <= ni < m and 0 <= nj < n and matrix[ni][nj] > matrix[i][j]:
                    best = max(best, 1 + dfs(ni, nj))
            memo[i][j] = best
            return best

        sys.setrecursionlimit(m * n + 100)   # a path can be m*n cells deep!
        return max(dfs(i, j) for i in range(m) for j in range(n))
```

Why the outer double loop is `O(mn)` and not `O((mn)^2)`: each of the `mn` calls either computes a state for the first time (once ever) or returns a memoized value in `O(1)`.

---

## 6. Two More Ways to Implement the Same Idea

### 6a. Kahn's algorithm / BFS layering (iterative — no recursion at all)

Orient every edge from the smaller cell to the larger cell. A cell's **indegree** = number of strictly smaller neighbors. Sources (indegree 0) are exactly the cells where optimal paths start. Peel the DAG in BFS waves: the number of waves equals the longest path length, because in Kahn's algorithm every edge goes from an earlier wave to a strictly later wave (a node is unblocked only when its *last* smaller neighbor is popped, so it lands at least one wave later), and every node in wave `k` is the endpoint of some chain of `k` nodes.

```python
from collections import deque

class Solution:
    def longestIncreasingPath(self, matrix: list[list[int]]) -> int:
        m, n = len(matrix), len(matrix[0])
        DIRS = ((-1, 0), (1, 0), (0, -1), (0, 1))
        indeg = [[0] * n for _ in range(m)]
        for i in range(m):
            for j in range(n):
                for di, dj in DIRS:
                    ni, nj = i + di, j + dj
                    if 0 <= ni < m and 0 <= nj < n and matrix[ni][nj] > matrix[i][j]:
                        indeg[ni][nj] += 1          # edge (i,j) -> (ni,nj)

        q = deque((i, j) for i in range(m) for j in range(n) if indeg[i][j] == 0)
        waves = 0
        while q:
            waves += 1                              # one layer of the DAG
            for _ in range(len(q)):
                i, j = q.popleft()
                for di, dj in DIRS:
                    ni, nj = i + di, j + dj
                    if 0 <= ni < m and 0 <= nj < n and matrix[ni][nj] > matrix[i][j]:
                        indeg[ni][nj] -= 1
                        if indeg[ni][nj] == 0:
                            q.append((ni, nj))
        return waves
```

Sanity check on Example 1: wave 1 = `{(2,1), (2,2)}` (the 1s), wave 2 = `{(2,0), (1,1), (1,2)}`, wave 3 = `{(1,0), (0,1)}`, wave 4 = `{(0,0)}` → **4**. ✓ Bonus: this version is immune to recursion limits and doubles as a cycle detector in general DAG problems.

### 6b. Sort cells by value, then DP

Process cells from **largest to smallest**; when you reach a cell, all strictly greater neighbors already have final answers:

```python
class Solution:
    def longestIncreasingPath(self, matrix: list[list[int]]) -> int:
        m, n = len(matrix), len(matrix[0])
        order = sorted(((matrix[i][j], i, j) for i in range(m) for j in range(n)),
                       reverse=True)
        dp = [[1] * n for _ in range(m)]
        best = 1
        for v, i, j in order:                        # largest values first
            for di, dj in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ni, nj = i + di, j + dj
                if 0 <= ni < m and 0 <= nj < n and matrix[ni][nj] > v:
                    dp[i][j] = max(dp[i][j], 1 + dp[ni][nj])
            best = max(best, dp[i][j])
        return best
```

The strict `>` makes the processing order among **equal** values irrelevant (equal cells never reference each other). Slightly worse asymptotics from the sort, but very hard to get wrong.

---

## 7. Complexity Table

| Approach | Time | Extra space | Recursion depth | Notes |
|---|---|---|---|---|
| Naive DFS from every cell | Exponential — already ≥ `C(m+n-2, m-1)` calls on an increasing grid | `O(mn)` stack | up to `mn` | TLE for 200×200 |
| **DFS + memoization (primary)** | **`O(mn)`** | **`O(mn)`** memo + up to `O(mn)` stack | up to `mn` (40,000) | Simplest; watch Python's recursion limit |
| Kahn's / BFS layering | `O(mn)` | `O(mn)` | none (iterative) | Safest under stack limits; also cycle-checks |
| Sort cells + DP | `O(mn log mn)` | `O(mn)` | none | Needs cells sorted by value |

`O(mn)` is effectively optimal: any correct algorithm must read every cell's value at least once, since a single unread cell could change the answer. With `mn ≤ 40,000`, the main solution does on the order of 160k neighbor checks — microseconds of real time.

---

## 8. Common Mistakes

| # | Mistake | Why it breaks | Fix |
|---|---|---|---|
| 1 | Using `>=` instead of `>` | Adjacent equal values become traversable; on Example 2's `2,2,2` cluster you get an infinite loop (cycles!) or inflated lengths. Strictness is *exactly* what makes the graph acyclic. | Strict `matrix[ni][nj] > matrix[i][j]` |
| 2 | Returning `dfs(0, 0)` (or any single corner) | Example 2's optimum starts at `(0,0)`/`(1,1)`, but other grids' optima start elsewhere | `max` over **all** cells |
| 3 | Adding a shared `visited` set / un-marking on exit (backtracking template) | Unnecessary here (DAG ⇒ no on-stack revisit), and un-marking defeats the memo | Memo array only |
| 4 | Forgetting the base case (`best = 1`) | Cells with no greater neighbor return 0, corrupting everything above them | Initialize `best = 1`; sanity-check with `[[1]]` |
| 5 | 8 directions in the `DIRS` array | Diagonals are explicitly forbidden; produces longer (wrong) answers | Exactly 4 orthogonal offsets |
| 6 | Python `RecursionError` on 200×200 | A snake-like grid has paths of length 40,000, far beyond Python's default recursion limit of 1000 | `sys.setrecursionlimit(m*n + 100)` or use the Kahn's version |
| 7 | Flat index `i * m + j` for a `m x n` grid | Collides when `m != n`; must be `i * n + j` with `n = len(matrix[0])` (columns) | Name the stride after columns |
| 8 | Confusing the value `0` with an "unset" marker | Values can legitimately be `0`; but memo *lengths* are always `>= 1`, so `0` as the memo sentinel is fine — just don't mix the two concepts | Keep "values" and "path lengths" mentally separate |

### Language-specific gotchas (Java / C++)

| Language | Gotcha |
|---|---|
| **Java** | Prefer `int[][] memo` over `HashMap<Integer, Integer>` with an encoded key — autoboxing plus hashing on ~40k lookups is pure overhead, and hand-rolled key encoding is where the `i * n + j` off-by-stride bug lives. No overflow concerns: we only compare values, and lengths ≤ 40,000 fit `int`. Very deep recursion (40k frames) can risk `StackOverflowError` on tight stacks — the iterative Kahn's version sidesteps it. |
| **C++** | Take the matrix by `const vector<vector<int>>&` (copying a 200×200 vector per call is wasteful). A flat `vector<int> memo(m * n)` beats a vector-of-vectors for cache behavior. Same recursion-depth caveat as Java on some judges; use `greater`-style strict comparison `matrix[ni][nj] > matrix[i][j]` and note `2^31 - 1` still fits `int` exactly. |
| **Python** | `functools.lru_cache(maxsize=None)` on `(i, j)` works, but 40k tuple keys means hashing overhead — a plain 2D list memo is faster and needs no decorator. Raise the recursion limit as shown. |

---

## 9. Test Cases to Propose Out Loud

Announce these before or right after coding — it signals rigor and catches your own bugs:

| Input | Expected | What it verifies |
|---|---|---|
| `[[9,9,4],[6,6,8],[2,1,1]]` | `4` | Official Ex. 1; duplicate values `(9,9)`, `(6,6)`, `(1,1)` must not chain |
| `[[3,4,5],[3,2,6],[2,2,1]]` | `4` | Official Ex. 2; equal-value clusters; **two** optimal starts; diagonal not allowed |
| `[[1]]` | `1` | Official Ex. 3; single cell; base case |
| `[[7,7],[7,7]]` | `1` | **All duplicates** — the sharpest detector for a `>=` bug (answer is 1, not 4, because of strictness) |
| `[[1,2,3],[6,5,4]]` | `6` | Increasing "snake" — long path; scale this to 200×200 to stress recursion depth |
| `[[0]]` and `[[2147483647]]` | `1`, `1` | Value extremes (0 and `INT_MAX`); only comparisons happen, so no overflow |
| `[[1,2,3,4]]` (1 row) / 4×1 column | `4` | Boundary checks in degenerate shapes |

Spoken version: *"I'd check the three examples, then an all-equal matrix — that should return 1, not 4, which catches any non-strict comparison — then an increasing snake to stress long paths and recursion depth, and the value extremes 0 and INT_MAX."*

---

## 10. Transferable Patterns & Related Problems

**Meta-lessons:**

1. **Monotone-move constraint ⇒ implicit DAG ⇒ memoized DFS / topo DP.** Trigger phrase in any problem: *"you may only move to a strictly larger/smaller value."* The moment movement is strictly monotone, cycles are impossible and per-cell memoization becomes valid.
2. **Longest path is easy on DAGs, hard in general.** Longest simple path in an arbitrary graph is NP-hard — deciding whether a path of length `n` exists is exactly Hamiltonian path, a canonical NP-complete problem. If an interviewer asks for a "longest path," your first job is to *find the acyclicity argument* (here: strict monotonicity).
3. **Memoize on state, not on path.** If the answer from a state depends only on the state (cell), memoize. If it depends on *which cells you've visited*, you're in exponential backtracking territory (Word Search, Path with Maximum Gold).

**Related problems:**

| Problem | Relationship |
|---|---|
| LC 2328 — Number of Increasing Paths in a Grid | Same DAG; memoized value becomes a **count** (with modular arithmetic) instead of a max |
| LC 300 / LC 354 — LIS / Russian Doll Envelopes | The 1D/2D "chain DP" family; 354 is solved by sorting + LIS, same idea as §6b |
| LC 646 — Longest Chain of Pairs | Chain DP with a strict ordering key |
| LC 207 / 210 — Course Schedule I/II | Kahn's algorithm template (§6a) |
| LC 1219 — Path with Maximum Gold | The **counterexample**: no-revisit means the visited set matters → memoization on the cell is invalid, pure backtracking required |
| Classic "skiing" problem | Literally this problem (find the longest downhill ski run) |

---

## 11. Full Interview Talk Track

**Clarify (30s).** *"Just to confirm: the path moves only up/down/left/right, each next value must be strictly greater — so equal neighbors can't be chained — values needn't increase by exactly 1, a single cell is a path of length 1, and I return the length. Right?"*

**Brute force (60s).** *"Naively I'd DFS from every cell into strictly greater neighbors. That's correct but exponential: subpaths get recomputed. Concretely, on a grid that increases rightward and downward, the number of increasing paths from one corner is the binomial C(m+n−2, m−1), so enumeration is exponential."*

**Insight (60s).** *"The key observation is that strict monotonicity makes the movement graph a DAG — values strictly increase along any walk, so no cycles are possible, and no cell can even appear twice on a path. So 'longest increasing path starting at cell (i,j)' is a single well-defined number that depends only on the cell, not on how I got there. That's memoizable. The recurrence: f(i,j) = 1 plus the max of f over strictly greater neighbors, or 1 alone if there are none. The answer is the max of f over all cells."*

**Code (5–7 min).** Write the memoized DFS (§5). Narrate: *"Memo of 0 means uncomputed — safe because real answers are ≥ 1. Strict `>` here — that's what keeps the 2,2,2 cluster in example two from becoming a cycle. Base case 1. Finally, max over the whole grid."*

**Complexity (30s).** *"Each cell is computed once with four O(1) neighbor checks: O(mn) time and space — 40,000 states at the constraint limits, which is also a lower bound since you must read the input."*

**Tests (60s).** Run the examples; then volunteer all-equal → 1, the snake → 6, and extremes; mention the Python recursion-limit fix or offer the iterative Kahn's variant if asked.

---

## 12. Say It in 60 Seconds

> "This is longest-path on an implicit DAG. Because every move must go to a *strictly greater* value, no path can loop or revisit a cell — the grid is a DAG — so 'the longest increasing path starting at cell (i, j)' is one fixed number I can memoize. Recurrence: f of a cell is 1 plus the max of f over its strictly greater orthogonal neighbors, or just 1 if there are none — and 'strictly' matters, because duplicates like the adjacent 2s in example two must not be chained, and strictness is exactly what makes the graph acyclic. I DFS from every cell with a shared memo table and take the overall max — the max, not one corner, since the optimal start can be anywhere. That's O(mn) time and space — forty thousand states at these constraints — versus exponential brute force. Two gotchas: use strict greater-than, and in Python raise the recursion limit or use BFS layering, since a path can be forty thousand cells deep. Then I'd test the three examples, an all-equal matrix which should return 1, and a long increasing snake."
