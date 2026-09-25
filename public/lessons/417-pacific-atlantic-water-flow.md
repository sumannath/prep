# Pacific Atlantic Water Flow — Complete Interview Lesson

## 1) Problem, restated precisely

**In my own words:** We have an `m × n` grid of heights. Rain lands on every cell. Water moves from a cell to a 4-directional neighbor **only if the neighbor's height is less than *or equal to* the current cell's height** (downhill or flat — never uphill). Any cell sitting on a border edge drains **for free** into the ocean that owns that edge:

- **Pacific** owns the **top row** (`r == 0`) and the **left column** (`c == 0`).
- **Atlantic** owns the **bottom row** (`r == m-1`) and the **right column** (`c == n-1`).

Return every cell `(r, c)` from which water can reach **both** oceans.

**Precision points to nail before coding:**

- `heights[r][c]` is a **value**; the answer contains **0-indexed coordinates** `[r, c]`, not heights. It's easy to return heights by accident under time pressure.
- Equal heights **are passable** (`≤`, not `<`). Plateaus are walkable in every direction.
- Heights may repeat arbitrarily; nothing is unique.
- Each border cell touches **exactly one** ocean — *except* the "mixed" cells: top-right corner `(0, n-1)` (top + right edges) and bottom-left corner `(m-1, 0)` (left + bottom edges), which touch **both** and always belong to the answer. In a single-row or single-column grid, **every** cell touches both oceans.
- A border cell still needs a path to the *other* ocean to qualify. Don't pre-add all border cells to the result.

**Visual of ocean ownership:**

```
P P P P P      P = Pacific border (row 0 / col 0)
P . . . A      A = Atlantic border (last row / last col)
P . . . A      (0, n-1) and (m-1, 0) are both P and A
P . . . A
A A A A A
```

## 2) Decoding the constraints

| Constraint | What it tells us |
|---|---|
| `1 ≤ m, n ≤ 200` | At most `m·n = 40,000` cells. An `O(mn)` solution (~4×10⁴ steps) is trivially fast; an `O((mn)²)` solution is ~1.6–3.2×10⁹ steps — too slow, especially in Python. |
| `0 ≤ heights[r][c] ≤ 10⁵` | Values fit in a 32-bit int comfortably; we only ever **compare** heights (never sum them), so overflow is a non-issue even in Java/C++. |
| Rectangular, not necessarily square | Use `n = len(heights[0])`; don't assume `m == n`. Classic source of index bugs. |
| Duplicate heights allowed | Flat movement matters; test plateaus explicitly. |
| `1×1` grid is valid | The single cell borders all four edges → both oceans → answer is `[[0,0]]`. |
| Implied: grid-graph recursion | A DFS path can have length up to `m·n = 40,000` (an adversarial snake-shaped strictly increasing grid forces this), which blows past Python's ~1000 default recursion limit — go **iterative**. |

## 3) Brute force: search from every cell (with worked trace)

**Idea:** For each cell, run a flood fill (DFS/BFS) following the *natural* flow rule — step to a neighbor iff `heights[neighbor] <= heights[current]` — and check whether the flood touches a Pacific border cell and an Atlantic border cell.

```python
def pacificAtlantic_brute(heights):
    m, n = len(heights), len(heights[0])
    is_pacific  = lambda r, c: r == 0 or c == 0
    is_atlantic = lambda r, c: r == m - 1 or c == n - 1

    def drains_to(start, at_ocean):
        seen = {start}
        stack = [start]
        while stack:
            r, c = stack.pop()
            if at_ocean(r, c):
                return True
            for nr, nc in ((r+1, c), (r-1, c), (r, c+1), (r, c-1)):
                if (0 <= nr < m and 0 <= nc < n
                        and (nr, nc) not in seen
                        and heights[nr][nc] <= heights[r][c]):   # downhill or flat
                    seen.add((nr, nc))
                    stack.append((nr, nc))
        return False

    return [[r, c] for r in range(m) for c in range(n)
            if drains_to((r, c), is_pacific) and drains_to((r, c), is_atlantic)]
```

**Cost:** `mn` cells × 2 searches × up to `mn` visited cells each = `O((mn)²)` time. On the 5×5 example that's at most ~1,250 node visits; scaled to 200×200 it's up to ~3.2×10⁹ — a non-starter.

**Worked trace on Example 1** (`heights[2][2] = 5` and `heights[4][2] = 1`):

- **Cell (2,2), height 5 → qualifies.**
  - Pacific: `(2,2)h5 → (1,2)h3 → (0,2)h2` — 3 ≤ 5 ✓, 2 ≤ 3 ✓ — and `(0,2)` is the top row → **Pacific reached**.
  - Atlantic: `(2,2)h5 → (2,3)h3 → (2,4)h1` — both steps downhill — and `(2,4)` is the right column → **Atlantic reached**.
- **Cell (4,2), height 1 → excluded.**
  - Atlantic: `(4,2)` is on the bottom row → immediate ✓.
  - Pacific: branch 1: `(4,2)h1 → (4,1)h1` (**flat step, allowed**) → from `(4,1)`: `(4,0)h5` ✗, `(3,1)h7` ✗ → dead end. Branch 2: `(4,2)h1 → (3,2)h1` (flat) → from `(3,2)`: `(2,2)h5` ✗, `(3,1)h7` ✗, `(3,3)h4` ✗ → dead end. No non-increasing path reaches row 0 or col 0 → **no Pacific**.

The `(4,2)` trace shows the two subtle things the brute force handles: flat movement and the "sunken basin" that's walled off by higher ground in *every* direction.

## 4) The core insight: run the water backwards

Every brute-force search re-explores the same terrain. Flip the question:

> "Which cells can drain into ocean X?" is **exactly** "Which cells can ocean X *reach* if we walk inward and are only allowed to step onto a neighbor with height **≥** the current cell?"

**Why this is a valid reversal (say this in the interview):** A drain path `v = u₀ → u₁ → … → u_k` (border) satisfies `h[u₀] ≥ h[u₁] ≥ … ≥ h[u_k]`. Reading the same sequence backwards gives a walk from the border to `v` that only steps to heights **≥** the previous one — a perfect bijection between drain paths and reverse-reachability paths. So:

- One **multi-source** BFS/DFS seeded with *all* Pacific border cells at once (top row + left column) marks every Pacific-draining cell.
- A second one seeded with all Atlantic border cells (bottom row + right column) marks every Atlantic-draining cell.
- **Answer = intersection of the two marked sets.**

Two floods total instead of `2·mn` floods. This is the same "reverse the arrows / flood from the boundary" trick as *Surrounded Regions* (LC 130), and the same multi-source BFS pattern as *01 Matrix* (LC 542) and *Rotting Oranges* (LC 994). Note we don't need Dijkstra, union-find, or binary search here — plain reachability only needs flood fill.

## 5) Optimal algorithm: two multi-source floods

**Steps:**
1. `flood(seeds)`: BFS from all seed cells; expand `u → v` only when `heights[v] >= heights[u]`; return a boolean "seen" grid. Mark visited **when enqueued**.
2. Run it once for Pacific seeds, once for Atlantic seeds — **two separate visited grids**.
3. Output every cell marked by both, in row-major order.

```python
from collections import deque

def pacificAtlantic(heights):
    m, n = len(heights), len(heights[0])
    DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def flood(seeds):
        """Multi-source BFS moving 'inland': next height >= current height."""
        seen = [[False] * n for _ in range(m)]
        queue = deque()
        for r, c in seeds:
            if not seen[r][c]:          # dedupes seeds when m == 1 or n == 1
                seen[r][c] = True
                queue.append((r, c))
        while queue:
            r, c = queue.popleft()
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                if (0 <= nr < m and 0 <= nc < n
                        and not seen[nr][nc]
                        and heights[nr][nc] >= heights[r][c]):   # REVERSED rule
                    seen[nr][nc] = True
                    queue.append((nr, nc))
        return seen

    pacific  = flood([(0, c) for c in range(n)] + [(r, 0) for r in range(m)])
    atlantic = flood([(r, n - 1) for r in range(m)] + [(m - 1, c) for c in range(n)])

    return [[r, c] for r in range(m) for c in range(n)
            if pacific[r][c] and atlantic[r][c]]
```

**Implementation notes:**

- **Iterative BFS, not recursive DFS.** Python's default recursion limit (~1000) is far below the possible depth of 40,000; bumping `sys.setrecursionlimit` can still crash the C stack. An explicit stack (iterative DFS) works identically — reachability doesn't care about visit order.
- Two `bool` grids are faster in Python and translate 1:1 to Java/C++; a `set` of `(r, c)` tuples also works but pays hashing costs.
- The judge compares the *set* of coordinates (order-insensitive); the row-major scan above conveniently produces the sorted order shown in the examples anyway.

## 6) Traces on the official examples

### Example 1

```
heights                 Pacific flood           Atlantic flood          Both (answer)
r\c 0  1  2  3  4       0  1  2  3  4           0  1  2  3  4           0  1  2  3  4
0   1  2  2  3  5       P  P  P  P  P           .  .  .  .  A           .  .  .  .  X
1   3  2  3  4  4       P  P  P  P  P           .  .  .  A  A           .  .  .  X  X
2   2  4  5  3  1       P  P  P  .  .           .  .  A  A  A           .  .  X  .  .
3   6  7  1  4  5       P  P  .  .  .           A  A  A  A  A           X  X  .  .  .
4   5  1  1  2  4       P  .  .  .  .           A  A  A  A  A           X  .  .  .  .
```

**Pacific flood** — 9 seeds (top row + left col), then 7 cells newly marked (one valid order):

| Newly marked | From | Guard check `next ≥ current` |
|---|---|---|
| (1,1)=2 | (0,1)=2 | 2 ≥ 2 |
| (1,2)=3 | (0,2)=2 | 3 ≥ 2 |
| (1,3)=4 | (0,3)=3 | 4 ≥ 3 |
| (2,1)=4 | (2,0)=2 | 4 ≥ 2 |
| (3,1)=7 | (3,0)=6 | 7 ≥ 6 |
| (2,2)=5 | (1,2)=3 | 5 ≥ 3 |
| (1,4)=4 | (1,3)=4 | 4 ≥ 4 (flat) |

Dead ends worth calling out: from `(2,2)=5` we *cannot* step to `(3,2)=1` or `(2,3)=3` (both smaller) — that's why the lower-right region stays Pacific-unmarked. **16 cells marked.**

**Atlantic flood** — 9 seeds (bottom row + right col), then 7 newly marked:

| Newly marked | From | Guard check |
|---|---|---|
| (1,3)=4 | (1,4)=4 | 4 ≥ 4 |
| (2,3)=3 | (2,4)=1 | 3 ≥ 1 |
| (3,0)=6 | (4,0)=5 | 6 ≥ 5 |
| (3,1)=7 | (4,1)=1 | 7 ≥ 1 |
| (3,2)=1 | (4,2)=1 | **1 ≥ 1 (flat step — the `≤` rule matters here)** |
| (3,3)=4 | (4,3)=2 | 4 ≥ 2 |
| (2,2)=5 | (2,3)=3 | 5 ≥ 3 |

**16 cells marked.**

**Intersection** (row-major): `(0,4), (1,3), (1,4), (2,2), (3,0), (3,1), (4,0)` — exactly the expected 7 cells. ✓

### Example 2 — `heights = [[1]]`

The lone cell `(0,0)` is a **seed of both floods** (it's on all four edges), so both visited grids mark it immediately → `[[0,0]]`. Note the seed lists both contain `(0,0)` when `m == n == 1`; the `if not seen[r][c]` guard dedupes so it isn't enqueued twice.

## 7) Complexity analysis

| Approach | Time | Extra space | Verdict at m, n ≤ 200 |
|---|---|---|---|
| Flood fill from every cell (brute force) | `O((mn)²)` ≈ 3×10⁹ worst case | `O(mn)` per search | TLE in Python; risky even in C++/Java |
| **Two multi-source floods (this solution)** | **`O(mn)`** — each flood enqueues each cell at most once, twice over | `O(mn)` — two visited grids + queue | Passes comfortably (~10⁵ operations) |
| Optional: sort output | `O(k log k)`, `k ≤ mn` | — | Not required (judge is order-insensitive) |

**Optimality:** `O(mn)` is asymptotically tight, because on an all-equal grid every one of the `mn` cells is in the answer, so any correct algorithm must spend `Ω(mn)` time just writing the output.

**Recursion-depth bound (if you mention the DFS variant):** depth is bounded by the longest simple path in the grid graph, and an adversarial snake-shaped strictly increasing grid forces depth `mn = 40,000`.

## 8) Common mistakes and edge-case traps

1. **Reversed comparison backwards.** The single most common bug. Forward flow is `neighbor ≤ current`; the reverse flood is `neighbor ≥ current` ("climbing inland"). Write the guard with a comment stating which direction it is.
2. **Using `<` instead of `≤`.** Water crosses **equal** heights. Breaks silently on plateaus — `[[1,1]]` must return both cells.
3. **One shared visited structure for both oceans.** The answer is an *intersection*; sharing a set makes the second flood a no-op and the intersection always equals the second flood's reach set. Use two grids (or one grid of 2-bit states).
4. **Assuming border cells auto-qualify.** The top row is Pacific-*only*. Only `(0, n-1)`, `(m-1, 0)`, and every cell of a 1-row/1-column grid touch both oceans. Pre-adding all border cells is wrong.
5. **Recursive DFS in Python.** RecursionError (default limit ~1000 vs. possible depth 40,000). Iterative BFS/DFS sidesteps it entirely.
6. **BFS marking visited on pop instead of push.** Cells get enqueued multiple times; correctness survives but the queue can balloon. Mark on enqueue.
7. **Returning heights or tuples.** The result must be `[[r, c], ...]` — coordinate lists, 0-indexed. A set of tuples fails the output format.
8. **Forgetting seed dedup** when `m == 1` or `n == 1` (the row-seed and column-seed lists overlap). Harmless but sloppy; the guard in the code handles it.

## 9) Language-specific gotchas (Python / Java / C++)

| Language | Gotcha |
|---|---|
| **Python** | Avoid recursion (limit ~1000, hard C-stack death beyond ~10–50k frames even with `setrecursionlimit`). Tuple-keyed sets work; boolean 2D grids + `deque` are ~2–5× faster. |
| **Java** | Encode each cell as `int code = r * n + c` in an `ArrayDeque<Integer>` (decode with `/ n` and `% n`) to avoid allocating millions of `int[]`/boxed pairs — or accept the GC churn of `ArrayDeque<int[]>`. Default JVM thread stack is ~512 KB–1 MB, so a 40,000-deep recursive DFS can throw `StackOverflowError`; prefer BFS. No overflow risk: values ≤ 10⁵ and we never sum them. |
| **C++** | Take the grid as `const vector<vector<int>>&` (don't copy). MSVC's default stack is 1 MB, so deep recursion risks overflow — use `std::queue<std::pair<int,int>>`. Prefer `vector<vector<char>>` (or a flat `vector<char>` of size `m*n`) over `vector<vector<bool>>`, whose bit-proxy references behave oddly in loops. |

## 10) Test plan to state out loud (before or after coding)

| # | Input | Expected output | What it validates |
|---|---|---|---|
| 1 | `[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]` (Example 1) | 7 cells listed in the problem | Full pipeline, both floods, intersection |
| 2 | `[[1]]` (Example 2) | `[[0,0]]` | Single cell = seed of both floods; seed dedup |
| 3 | `[[1,2],[2,1]]` | `[[0,1],[1,0]]` | The two mixed corners always qualify; the other two corners (Pacific-only / Atlantic-only basins at height 1) correctly don't |
| 4 | `[[5,5,5],[5,1,5],[5,5,5]]` | All 8 ring cells, **not** `[1,1]` | "Sunken basin": reversed climb can't step 5 → 1, so the low center is excluded |
| 5 | `[[1,2,3],[4,5,6],[7,8,9]]` | `[[0,2],[1,2],[2,0],[2,1],[2,2]]` | Strictly increasing grid: only the Atlantic seeds survive the intersection |
| 6 | `[[1,1]]` | `[[0,0],[0,1]]` | Equal-height movement (catches the `<` vs `≤` bug); 1-row grid where every cell touches both oceans |
| 7 | 200×200 grid of all `7`s | All 40,000 cells | Performance, recursion depth, maximal output size |

Cases 3, 4, and 6 are the ones worth *proposing aloud* — they show the interviewer you understand mixed corners, basins, and flat movement.

## 11) Transferable patterns and related problems

- **Reverse/multi-source flood fill from the boundary:** don't search from every cell; seed all boundary sources at once and invert the edge rule. → *Surrounded Regions* (LC 130), *Number of Enclaves* (LC 1020).
- **Multi-source BFS with distance layers:** seed all sources at distance 0, expand outward. → *01 Matrix* (LC 542), *Rotting Oranges* (LC 994), *Walls and Gates* (LC 286).
- **Reachability under a monotone path constraint on a grid:** flipping "downhill" to "uphill from the source" is the same maneuver used in *Path With Minimum Effort* (LC 1631) and *Swim in Rising Water* (LC 778), which additionally binary-search the threshold or use union-find/Dijkstra because they optimize a bottleneck rather than plain reachability.
- **Intersection of two reachability sets:** compute two independent "who can reach X" sets and AND them — a recurring trick in graph problems.
- **General heuristic:** whenever your draft runs a graph search *per cell/per node*, stop and ask whether reversing edges or batching sources collapses it to a constant number of searches.

## 12) Full interview talk track (with timing)

**0:00–0:20 — Restate.** "Rain water flows from a cell to any of its four neighbors if that neighbor is the same height or lower — never uphill. Any cell on the top row or left column spills into the Pacific; bottom row or right column spills into the Atlantic. I need every cell that can drain to *both*. I'll return 0-indexed `[row, col]` pairs."

**0:20–0:50 — Brute force and its cost.** "Naively, I'd flood-fill from every cell — once per ocean — following the downhill rule, giving `O((mn)²)`. With `m, n ≤ 200` that's up to ~3 billion steps, which won't pass, especially in Python. All those searches re-walk the same ground."

**0:50–1:30 — The insight.** "So I'll reverse the flow. A cell drains to the Pacific exactly when the Pacific can *reach* it walking inland, where each step must go to a height **greater than or equal to** the current one — reading a non-increasing drain path backwards gives a non-decreasing walk from the border, and vice versa. So I run one multi-source BFS seeded with the whole Pacific border — top row plus left column — and one seeded with the Atlantic border. The answer is the intersection of the two visited sets."

**1:30–2:00 — Correctness and details.** "Each flood marks visited cells on enqueue, expands to neighbors with the `≥` guard, and the floods use *separate* visited grids. Note that equal heights are traversable — that's `≥`, not `>` — and mixed corners like the top-right cell touch both oceans automatically since they're seeds of both floods."

**2:00–2:30 — Complexity.** "Two floods, each visiting every cell at most once: `O(mn)` time, `O(mn)` space for the visited grids and queue. That's asymptotically optimal since the output alone can be all `mn` cells."

**2:30–3:00 — Implementation guards and tests.** "I'll write it iteratively — a recursion here can go 40,000 deep in an adversarial grid, past Python's recursion limit. Then I'll check: the 1×1 grid, a single row where every cell touches both oceans, a flat plateau, and a low center ringed by high ground, which must be excluded."

## 13) Say it in 60 seconds

> "Water flows downhill or across flat ground, and border cells drain straight into their ocean — Pacific owns the top row and left column, Atlantic owns the bottom row and right column. Flooding from every cell is quadratic, so I flip the problem: instead of asking where water *goes*, I ask which cells the ocean can climb *into*. One multi-source BFS from the entire Pacific border, stepping only to neighbors with height greater than or equal to the current cell — that's the reversed flow rule — marks everything that drains to the Pacific. I repeat from the Atlantic border and return the intersection of the two marked sets. Two floods, each cell touched once: linear time, linear space. I'll code it iteratively to dodge recursion-depth crashes, keep the two visited grids separate, and use greater-than-*or-equal*, since flat ground is walkable. Quick sanity checks: the 1×1 grid, a single row, and a low cell ringed by high ground, which should be excluded."
