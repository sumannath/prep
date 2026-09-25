# Max Area of Island (LeetCode 695) — Complete Interview Lesson

---

## 1. Problem Restatement (Say It In Your Own Words)

> "I'm given an `m x n` grid of 0s and 1s. An **island** is a maximal group of 1-cells connected **edge-to-edge only** (up/down/left/right — never diagonally). I need to return the **number of cells in the largest island**, or **0** if the grid has no land at all."

Precision points worth stating out loud, because they're where candidates lose points:

| Term | Precise meaning here |
|---|---|
| **Indices vs. values** | A cell is a coordinate pair `(r, c)` with `0 <= r < m`, `0 <= c < n` (0-indexed). The **value** `grid[r][c]` is `0` (water) or `1` (land). Never conflate "cell (3, 8)" with "value 8". |
| **Area** | A **count of cells**, not a geometric area, and not the number of islands. |
| **Connectivity** | 4-directional. A diagonal touch does **not** connect two land cells. (Example 1's "answer is not 11" exists precisely because diagonal merging would give 11.) |
| **Maximal** | An island is an entire connected component — you can't stop partway. |
| **Duplicates** | There are no duplicate *values* to worry about (values are just 0/1). The real duplicate hazard is **visiting/counting the same cell twice** — that is the central correctness issue of this problem. |

---

## 2. Decoding the Constraints

Every constraint here is a hint about what kind of solution is expected and what shortcuts are legal.

| Constraint | What it tells you |
|---|---|
| `1 <= m, n <= 50` | At most `m·n = 2500` cells. An `O((mn)²)` brute force (~6.25M steps) passes — but the interviewer expects the linear solution. Recursion depth is at most 2500 (matters in Python — see §7). |
| `grid[i][j]` is `0` or `1` | The grid itself can double as the **visited marker**: "sink" a land cell to `0` when you first visit it. No separate visited structure needed unless you must preserve input. |
| 4-directional | Exactly 4 neighbor offsets: `(±1, 0)` and `(0, ±1)`. Accidentally using 8 offsets is the #1 wrong-answer bug (and Example 1 is built to catch it). |
| "All four edges surrounded by water" | Means: everything **outside** the `m x n` rectangle is water (Example 1 has land on row 0, so this does *not* mean border cells are water). No wraparound, no island extending past the array — bounds checks behave exactly like hitting water. Contrast with *Closed Islands* (LC 1254), where border-adjacency changes the answer. |
| `m, n >= 1` | No empty-grid guard needed; `grid[0]` always exists. |
| Max answer = 2500 | Fits trivially in `int`/Python `int`. **No overflow risk anywhere** in this problem. |

---

## 3. Brute Force (and Why It's Wasteful) — With a Worked Trace

**Naive idea:** For *every* land cell, run a fresh flood fill (with a brand-new `seen` set) to measure its entire island. Take the max over all measurements.

```python
def maxAreaOfIsland_bruteforce(grid):
    m, n = len(grid), len(grid[0])
    best = 0
    for sr in range(m):
        for sc in range(n):
            if grid[sr][sc] != 1:
                continue
            # fresh visitation state for EVERY seed — this is the waste
            seen = {(sr, sc)}
            stack = [(sr, sc)]
            size = 0
            while stack:
                r, c = stack.pop()
                size += 1
                for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < m and 0 <= nc < n \
                            and grid[nr][nc] == 1 and (nr, nc) not in seen:
                        seen.add((nr, nc))
                        stack.append((nr, nc))
            best = max(best, size)
    return best
```

**Worked trace** on a small grid (land cells in scan order: `(0,0), (0,1), (1,0), (1,3), (2,2), (2,3), (3,2)`):

```
1 1 0 0
1 0 0 1
0 0 1 1
0 0 1 0
```

| Seed | Island it measures | Size | `best` after |
|---|---|---|---|
| `(0,0)` | A = {(0,0), (0,1), (1,0)} | 3 | 3 |
| `(0,1)` | A **again** | 3 | 3 (wasted) |
| `(1,0)` | A **again** | 3 | 3 (wasted) |
| `(1,3)` | B = {(1,3), (2,3), (2,2), (3,2)} | 4 | 4 |
| `(2,2)` | B **again** | 4 | 4 (wasted) |
| `(2,3)` | B **again** | 4 | 4 (wasted) |
| `(3,2)` | B **again** | 4 | 4 (wasted) |

Answer 4 — correct, but island A was measured 3 times and island B 4 times: **once per cell it contains**.

**Complexity:** if there are `L` land cells, each flood fill costs `O(mn)`, so total is `O(L · mn) ≤ O((mn)²)` — 2500 fills × 2500 cells ≈ 6.25M steps worst case (all land).

> ⚠️ Note: a "brute force" that flood-fills *without* any visited marking is not a slower algorithm — it's an **infinite loop**. Marking is not an optimization here; it's what makes the algorithm terminate.

---

## 4. The Core Insight

**Every land cell belongs to exactly one island** (islands are the equivalence classes of "connected by 4-directional land paths").

Therefore, if you **mark a cell as consumed the first time you touch it**, then:

1. Each cell is visited, counted, and marked **exactly once** → total work is linear in the number of cells.
2. Once an island is measured and fully marked, the outer scan skips it (its cells are no longer land/markers say "seen") → each island is measured **once**, not once-per-cell.
3. While flooding one island, count its cells and compare against a running max.

**Grid-as-graph framing:** cells are nodes; 4-adjacency gives edges. `V = mn`, and the edge count `E ≤ m(n−1) + (m−1)n < 2mn` because each row contributes at most `n−1` horizontal adjacencies and each column at most `m−1` vertical ones — so any graph traversal is `O(V + E) = O(mn)`.

**Lower bound (why you can't beat `O(mn)`):** any correct algorithm must read every cell in the worst case, because two inputs differing in a single unread cell (0 vs 1) can have different answers, so skipping a cell risks being fooled.

So `O(mn)` is asymptotically optimal for this problem. The brute force isn't wrong — it's just re-deriving information (component membership) that marking lets you remember for free.

---

## 5. Optimal Approach: Outer Scan + Flood Fill

### 5.1 The Algorithm

Neighbor order used in all traces below: **up, down, left, right** — offsets `(−1,0), (+1,0), (0,−1), (0,+1)`.

```
best = 0
for r in 0..m-1:            # row-major scan
    for c in 0..n-1:
        if grid[r][c] == 1:             # seed of an unmeasured island
            best = max(best, dfs(r, c))
return best
```

`dfs(r, c)` contract:
- If `(r, c)` is out of bounds or **not live land** (water, or already sunk/seen), return `0`.
- Otherwise: **mark it first** (sink `grid[r][c] = 0`, or add to `seen`), then return `1 + dfs(up) + dfs(down) + dfs(left) + dfs(right)`.

**Invariants to state while coding** (these are what the interviewer is listening for):

- **I1 (no double-seeding):** when `dfs(r, c)` returns, every cell in `(r,c)`'s island is marked, so the outer scan will never seed that island again.
- **I2 (exact count):** `dfs(r, c)` returns exactly the number of live-land cells reachable from `(r, c)` — the island's area.
- **I3 (count-once):** a cell contributes exactly 1 to the total, at the instant it is marked. Marking *before* recursing/enqueuing is what enforces this.

### 5.2 Trace — Example 1 (the important one)

```
row 0: 0 0 1 0 0 0 0 1 0 0 0 0 0
row 1: 0 0 0 0 0 0 0 1 1 1 0 0 0
row 2: 0 1 1 0 1 0 0 0 0 0 0 0 0
row 3: 0 1 0 0 1 1 0 0 1 0 1 0 0
row 4: 0 1 0 0 1 1 0 0 1 1 1 0 0
row 5: 0 0 0 0 0 0 0 0 0 0 1 0 0
row 6: 0 0 0 0 0 0 0 1 1 1 0 0 0
row 7: 0 0 0 0 0 0 0 1 1 0 0 0 0
```

**Outer-scan discovery table** (seed = first unmarked land cell in row-major order):

| # | Seed | Cells sunk (the whole island) | Area | `best` after |
|---|---|---|---|---|
| 1 | `(0,2)` | (0,2) | 1 | 1 |
| 2 | `(0,7)` | (0,7), (1,7), (1,8), (1,9) | 4 | 4 |
| 3 | `(2,1)` | (2,1), (2,2), (3,1), (4,1) | 4 | 4 |
| 4 | `(2,4)` | (2,4), (3,4), (3,5), (4,4), (4,5) | 5 | 5 |
| 5 | `(3,8)` | (3,8), (4,8), (4,9), (4,10), (3,10), (5,10) | **6** | **6** |
| 6 | `(6,7)` | (6,7), (6,8), (6,9), (7,7), (7,8) | 5 | 6 |

Total sunk: 1+4+4+5+6+5 = 25 = number of 1s in the grid ✓ (sanity check you can do out loud).

**Detailed recursion trace for island #5** (marked cells shown as `sunk`):

```text
dfs(3,8): sink (3,8) → 1
  up    (2,8) = 0            → 0
  down  (4,8) = 1 → dfs(4,8): sink (4,8) → 1
    up    (3,8)  sunk        → 0
    down  (5,8) = 0          → 0
    left  (4,7) = 0          → 0
    right (4,9) = 1 → dfs(4,9): sink (4,9) → 1
      up    (3,9)  = 0       → 0
      down  (5,9)  = 0       → 0
      left  (4,8)  sunk      → 0
      right (4,10) = 1 → dfs(4,10): sink (4,10) → 1
        up    (3,10) = 1 → dfs(3,10): sink → 1
          up (2,10)=0, down (4,10) sunk,
          left (3,9)=0, right (3,11)=0      → returns 1
        down  (5,10) = 1 → dfs(5,10): sink → 1
          up (4,10) sunk, down (6,10)=0,
          left (5,9)=0, right (5,11)=0      → returns 1
        left  (4,9)  sunk   → 0
        right (4,11) = 0    → 0
        → returns 1 + 1 + 1 = 3
      → returns 1 + 3 = 4
    → returns 1 + 4 = 5
  left  (3,7) = 0            → 0
  right (3,9) = 0            → 0
  → returns 1 + 5 = 6   ✓
```

**Why the "not 11" trap:** island #5's cell `(5,10)` is *diagonally* adjacent to island #6's cell `(6,9)`. If you (wrongly) used 8-directional moves, islands 5 and 6 merge into 6 + 5 = 11. The official explanation is a direct test of your neighbor-offset list.

### 5.3 Trace — Example 2

`grid = [[0,0,0,0,0,0,0,0]]` — a 1×8 grid. The outer scan checks all 8 cells; every value is 0, so `dfs` is never called, `best` never leaves its initial value **0**, and we return 0. This is why `best` must be initialized to `0` (not `None`, not `-inf`, not "the first island's size").

### 5.4 Python Implementations

**Primary — recursive DFS, sinking the grid (shortest, uses no extra memory for visited):**

```python
from typing import List

class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        m, n = len(grid), len(grid[0])

        def dfs(r: int, c: int) -> int:
            if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != 1:
                return 0                      # water, out of bounds, or already sunk
            grid[r][c] = 0                    # mark BEFORE recursing: count-once invariant
            return (1 + dfs(r - 1, c) + dfs(r + 1, c)
                      + dfs(r, c - 1) + dfs(r, c + 1))

        best = 0                              # handles "no island" for free
        for r in range(m):
            for c in range(n):
                if grid[r][c] == 1:
                    best = max(best, dfs(r, c))
        return best
```

**Variant A — preserve the input (use this if the interviewer says "don't mutate grid"):**

```python
def maxAreaOfIsland(grid):
    m, n = len(grid), len(grid[0])
    seen = set()                              # store COORDINATES (r, c), never values

    def dfs(r, c):
        if not (0 <= r < m and 0 <= c < n):
            return 0
        if grid[r][c] != 1 or (r, c) in seen:
            return 0
        seen.add((r, c))                      # mark on discovery
        return 1 + dfs(r - 1, c) + dfs(r + 1, c) + dfs(r, c - 1) + dfs(r, c + 1)

    best = 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                best = max(best, dfs(r, c))
    return best
```

(Alternative preserving trick: mark with `2` instead of `0`, then restore `2 → 1` in a final pass.)

**Variant B — BFS with a deque (iterative; the mark-on-enqueue line is the whole game):**

```python
from collections import deque

def maxAreaOfIsland(grid):
    m, n = len(grid), len(grid[0])
    best = 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                grid[r][c] = 0                # mark + count the seed exactly once
                size, q = 1, deque([(r, c)])
                while q:
                    x, y = q.popleft()
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < m and 0 <= ny < n and grid[nx][ny] == 1:
                            grid[nx][ny] = 0  # mark ON ENQUEUE, never on dequeue
                            size += 1
                            q.append((nx, ny))
                best = max(best, size)
    return best
```

**Variant C — iterative DFS:** identical to Variant B, but `stack = [(r, c)]` and `x, y = stack.pop()`. Same mark-on-push discipline. This is the drop-in fix for recursion-depth limits.

*(Union-Find also works: union each cell with its land neighbors and track component sizes; `O(mn · α(mn))` time, where `α` is the inverse Ackermann function — the amortized cost per union/find under union-by-rank plus path compression, which is ≤ 4 for any input size expressible with real memory. Overkill here, but the right tool when you must answer many connectivity queries online.)*

### 5.5 Implementation Gotchas Beyond Python

| Language | Gotcha | Why it bites |
|---|---|---|
| **Python** | Recursion depth: a serpentine path on an all-land 50×50 grid drives recursion ~2500 frames deep, above the default limit of 1000 → potential `RecursionError` depending on environment. | Prefer Variant B/C in Python, or `sys.setrecursionlimit(1 << 16)`. |
| **Python** | `list.pop(0)` as a queue: each pop shifts every remaining element, degrading BFS to `O((mn)²)`. | Use `collections.deque` — `popleft()` is O(1). |
| **Java** | Use `Deque<int[]> q = new ArrayDeque<>();`, not `java.util.Stack` (legacy, `Vector`-backed, synchronized). | Minor perf/style; interviewers notice. Mark before `offer()`/`push()` regardless. |
| **Java** | In char-grid cousins of this problem (e.g., LC 200), compare with `'1'`, not `1`: in Java `'1' == 1` is false because `char '1'` is the integer 49. | Classic silent-wrong-answer bug when reusing this template. |
| **C++** | Pass the grid by reference: `vector<vector<int>>& grid`. Passing by value deep-copies the entire matrix on every recursive call. | Turns `O(mn)` into roughly `O((mn)²)` copies — catastrophic and easy to miss. |
| **C++** | Use signed `int` for `r`, `c`. With `size_t`, the check `r - 1 < m` underflows to a huge positive number when `r = 0`, causing an out-of-bounds read (UB). | Write explicit `r >= 1` / `r + 1 < m` style bounds or keep `int`. |

---

## 6. Complexity Analysis

| Approach | Time | Auxiliary space | Notes |
|---|---|---|---|
| Brute force (fresh fill per land cell) | `O((mn)²)` | `O(mn)` | Correct; measures each island once per cell |
| **Recursive DFS (sink grid)** — primary | **`O(mn)`** | `O(mn)` worst-case stack; `O(1)` if grid mutation allowed and you ignore the stack | Depth ≤ island size ≤ 2500 |
| Iterative DFS (explicit stack) | `O(mn)` | `O(mn)` | No recursion limit issues |
| BFS (deque) | `O(mn)` | `O(mn)` | Mark on enqueue |
| Union-Find with sizes | `O(mn · α(mn))` | `O(mn)` | `α` effectively constant; useful for online queries |

**Why the optimal solution is `O(mn)`:** each cell is sunk/marked exactly once and its 4 neighbors are examined once at that time, so each of the `E < 2mn` adjacencies is examined at most twice (once from each endpoint) — total `O(V + E) = O(mn)`. Combined with the Ω(mn) reading lower bound from §4, this is asymptotically optimal — say that sentence in the interview; it lands well.

---

## 7. Common Mistakes (Ranked by Frequency)

1. **No marking / marking too late → double counts and infinite loops.** Safe rule: *count and mark at discovery* (seed counted when created; each neighbor counted exactly when enqueued/recursed into). If you increment on enqueue but only mark on dequeue — or don't mark at all — a land cell with two land neighbors gets enqueued twice and counted twice (e.g., in an L-shaped island of 3 cells, the corner is discovered by both arms → you report 4).
2. **8-directional drift.** Writing `(±1, ±1)` offsets "to be safe" silently merges diagonally-touching islands: Example 1 returns 11 instead of 6. The problem statement's 4-directional sentence is load-bearing.
3. **`best = size` instead of `best = max(best, size)`.** You return the *last* island's area, not the max. Islands #5 and #6 in Example 1 (6 then 5) are designed to catch exactly this.
4. **Counting the seed twice** — e.g., `size = 1` for the seed *and* incrementing when the seed is popped from the queue. Pick one accounting point (see mistake #1).
5. **Mutating the input without asking.** Ask early: "May I modify `grid`, or should I preserve it?" Sinking is cleaner; a `seen` set of `(r, c)` coordinate tuples (never values — many cells share the value 1) is the non-destructive answer.
6. **Bounds off-by-one:** `r <= m` instead of `r < m`, or checking `grid[r][c]` before bounds. Check bounds first, then value — in that order, every time.
7. **Wrong "no island" answer:** returning `-1`/`None`/crashing on all-water input because `best` was initialized oddly. Initialize `best = 0`; the problem explicitly asks for 0.
8. **Python recursion depth** on all-land 50×50 (~2500 frames vs. default limit 1000) — see §5.5; propose the iterative variant proactively.

---

## 8. Test Cases to Propose Out Loud

State these *before or while coding* — it signals completeness:

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | Example 1 (8×13 grid above) | `6` | Main path; diagonal trap (would give 11 with 8 directions); multiple islands |
| 2 | Example 2 `[[0,0,0,0,0,0,0,0]]` | `0` | No land → return 0, `best` initialization |
| 3 | All water, e.g. `[[0,0],[0,0]]` | `0` | Same as #2 in 2D; loop never enters DFS |
| 4 | All land, e.g. 2×2 of 1s → `4`; scaled up: 50×50 of 1s → `2500` | Whole grid is one island; the 50×50 version stress-tests recursion depth |
| 5 | `[[1]]` and `[[0]]` | `1` and `0` | Minimal grids (constraints guarantee `m, n ≥ 1`, so these are the smallest valid inputs) |
| 6 | Diagonal-only land: `[[1,0],[0,1]]` | `1` | Two islands of area 1, **not** one of area 2 — connectivity definition |
| 7 | Snake in a row: `[[1,1,0,1,1,1]]` | `3` | 1-row grids; gap splits islands; last-island-vs-max bug (last island is the max here, so also test `[[1,1,1,0,1,1]]` → `3`) |

Also mention the **input-preservation test** if you chose the `seen`-set version: run the function, assert `grid` is unchanged afterward.

---

## 9. Transferable Patterns & Related Problems

This problem is the canonical instance of the **grid flood fill / connected components** template:

1. **Outer scan finds an unvisited "source" cell.**
2. **Traversal (DFS/BFS) expands through same-property neighbors.**
3. **Mark on discovery** — the count-once invariant that makes it linear.
4. **Accumulate a per-component statistic** (size here; perimeter, shape ID, time-to-rot elsewhere) and reduce (max / count / etc.).

Master this skeleton and roughly a dozen LeetCode problems collapse into it:

| Problem | LC # | What changes from this template |
|---|---|---|
| Number of Islands | 200 | Count components instead of measuring; grid is `char` in some languages |
| Flood Fill | 733 | Recolor instead of count; watch "new color == old color" infinite loop |
| Island Perimeter | 463 | Statistic becomes "land-cell sides facing water/out-of-bounds" |
| Number of Distinct Islands | 694 | Serialize the DFS move-sequence as the component's signature |
| Number of Closed Islands | 1254 | Border-adjacent land disqualifies an island — edges now matter |
| Surrounded Regions | 130 | Multi-source fill seeded from the border, then invert |
| Pacific Atlantic Water Flow | 417 | Two multi-source fills (from each ocean), intersect results |
| Rotting Oranges | 994 | Multi-source BFS where queue depth = time; simulate spread per level |
| Count Sub Islands | 1905 | Run fills on grid 2, validate membership against grid 1 |
| Number of Provinces / Accounts Merge | 547 / 721 | Same component logic on an explicit graph / via Union-Find |
| Keys and Rooms | 841 | Reachability — the graph is given instead of implicit in a grid |

**Follow-ups interviewers actually ask here:**
- *"Grid too big for memory?"* — Union-Find with a rolling one-or-two-row window: union within the window, then discard rows; only parent/size for the frontier is kept.
- *"Many queries on one fixed grid?"* — Precompute all components once (one `O(mn)` pass), answer each "area at (r,c)" query in `O(1)` via a component-id lookup.
- *"Parallelize?"* — Partition the grid, solve each tile independently, then merge only along tile boundaries with Union-Find.

---

## 10. Interview Talk Track (Full Script)

**Clarify (30s):** "Connected means 4-directional only — diagonals don't count, correct? Area means the number of cells, not geometric area. And may I mutate the input grid, or should I preserve it?"

**Restate + brute force:** "So this is connected components on a grid, and I want the largest component's size. Naively I could flood-fill from every land cell with a fresh visited set — that's correct but `O((mn)²)`, because each island gets re-measured once per cell it contains."

**Insight:** "The key observation: every cell belongs to exactly one island. So if I mark each cell the moment I first touch it, every cell is processed once, and I get `O(mn)` — which is optimal, since any algorithm has to read every cell anyway."

**Approach:** "Plan: scan the grid row-major; when I hit an unvisited 1, I DFS from it. The DFS returns 1 for the current cell plus the four recursive results — that's the island's area — and it sinks each cell to 0 before recursing so nothing is counted twice. I keep a running max."

**While coding:** "Marking *before* recursing is the load-bearing line — it enforces count-once and termination. Bounds check first, then value."

**Dry run:** "On Example 1, the scan seeds six islands of areas 1, 4, 4, 5, 6, 5 — max is 6. Note the two big islands touch only diagonally at (5,10) and (6,9); with 8-directional moves they'd merge to 11, which is the trap the problem calls out."

**Tests:** "All water → 0; all land → m·n; single cell; diagonal-only land → 1; a snake row."

**Complexity:** "Time `O(mn)`: each cell sunk once, each adjacency examined at most twice. Space `O(mn)` worst-case stack; if I need to preserve input I'd use a seen set of coordinates, and in Python I'd switch to an explicit-stack or BFS version to stay under the recursion limit."

---

## 11. Say It in 60 Seconds

> "Max Area of Island is connected components on a grid: islands are 4-directionally connected groups of 1s, and I need the largest island's cell count, or 0 if there's no land. Brute force would flood-fill from every land cell with a fresh visited set — O of m·n squared — but the insight is that every cell belongs to exactly one island, so if I mark cells the moment I visit them, each cell is processed once and I'm linear. So: scan every cell; when I find an unvisited 1, run a DFS that sinks each cell — sets it to 0, or adds coordinates to a seen set if I must preserve input — and returns 1 plus its four neighbors' results. That return value is the island's area; I keep the max. Time O(m·n), since each cell is sunk once and each adjacency is checked at most twice, and that's optimal because every cell must be read. Space O(m·n) worst case for the stack, and in Python I'd use an explicit stack or BFS to dodge recursion limits. Strictly 4 directions — Example 1's diagonal trap merges two islands into 11 instead of 6 — and `best` starts at 0 so all-water input returns 0 for free."
