# Swim in Rising Water (LeetCode 778) — Complete Lesson

## 1. Problem Restated (in plain words)

You're on an `n × n` height map. Time `t` starts at 0 and only advances while you **wait**. At time `t`, every cell with elevation `≤ t` is "submerged" — you may stand on it and swim through it, and swimming itself costs **zero time**. You may move between two 4-directionally adjacent cells only when **both** cells have elevation `≤ t`.

Find the minimum `t` at which you can get from `(0, 0)` to `(n-1, n-1)`.

**Restated as a graph statement:** every cell is a node. A path is *usable at time t* iff every cell on it has elevation `≤ t`. So the answer is:

> **answer = min over all top-left→bottom-right paths of (maximum elevation on the path)**

This is a **minimax / bottleneck path** problem, *not* a shortest-path problem. Time is not additive along the route — it is the **max** you're forced to tolerate.

Sanity check with Example 1, `grid = [[0,2],[1,3]]`: path `(0,0)→(1,0)→(1,1)` has elevation sum `0+1+3 = 4`, but the answer is `3` — the max, not the sum.

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `n ≤ 50` → `N = n² ≤ 2500` cells | Even `O(n⁴)` brute force (~6.25M ops) is borderline-passable. But `O(n² log n)` is trivial and expected. |
| `0 ≤ grid[i][j] < n²` | The answer lives in `[0, n²−1]` — that's your binary-search range. |
| Values are **unique** | The elevations are a *permutation* of `0..n²−1`. You can invert the map (`value → cell position`) in `O(n²)` and drive a counting-sort-style sweep. No tie handling needed. (If an interviewer removes uniqueness: sort cells by value and process equal values as a **batch**.) |
| Statement does **not** promise `grid[0][0] == 0` | The answer is **at least** `max(grid[0][0], grid[n-1][n-1])` — you must be able to stand on both endpoints. Code defensively; it costs one line. |
| "swim infinite distances in zero time" | Movement is free. The only cost is *waiting*. Hence the max-based cost model. |
| "less than **or equal** to `t`" | Submersion at `t` includes elevation exactly `t`. Off-by-one here is a classic bug. |

**Why the answer ≥ max of the endpoints:** any feasible route *contains* both corners, and you can only occupy a cell when `t` ≥ its elevation, so `t` must dominate both endpoint elevations.

---

## 3. The Core Insight (three equivalent framings)

Define the predicate:

> `feasible(t)` = "there is a path from `(0,0)` to `(n-1,n-1)` using only cells with elevation `≤ t`"

**Framing 1 — Monotone threshold (unlocks binary search):**
If `feasible(t)` is true, then `feasible(t+1)` is true (the allowed cell set only grows). A monotone predicate over a bounded integer range = binary search on the answer.

**Framing 2 — Bottleneck shortest path (unlocks modified Dijkstra):**
The best time to first reach cell `v` is `dist[v] = min over neighbors u of max(dist[u], grid[v])`. The "relaxation" operator `max` is monotone and never decreases a label, so Dijkstra's greedy pop-smallest order remains correct: when a cell pops with the smallest tentative level `t`, no other path can reach it with a smaller bottleneck, because every frontier label is already `≥ t`.

**Framing 3 — Vertex activation / Kruskal (unlocks Union-Find):**
Each cell "turns on" at time = its elevation. Activate cells in increasing elevation order and union each with already-active neighbors. Components merge exactly like Kruskal's MST grows a forest. The first `t` at which start and end share a component is the answer. (Formally: give each adjacent pair the edge weight `max(elev(u), elev(v))`; the minimax path between two nodes equals the max edge on their MST path — a classic Kruskal property.)

All three framings produce `O(n² log n)` or better.

---

## 4. Brute Force: Simulate Every Water Level

For `t = 0, 1, 2, …`: run a BFS over cells with elevation `≤ t`. First `t` that reaches the goal wins.

```python
from collections import deque

def swimInWater_bruteforce(grid):
    n = len(grid)
    for t in range(n * n):                      # answer < n^2
        if grid[0][0] > t or grid[n-1][n-1] > t:
            continue                            # can't even stand on an endpoint
        seen = [[False] * n for _ in range(n)]
        seen[0][0] = True
        dq = deque([(0, 0)])
        while dq:
            r, c = dq.popleft()
            if (r, c) == (n - 1, n - 1):
                return t
            for nr, nc in ((r+1,c), (r-1,c), (r,c+1), (r,c-1)):
                if 0 <= nr < n and 0 <= nc < n and not seen[nr][nc] and grid[nr][nc] <= t:
                    seen[nr][nc] = True
                    dq.append((nr, nc))
    return -1  # impossible under the constraints
```

**Complexity:** `O(n²)` time steps × `O(n²)` BFS = **`O(n⁴)`** time, `O(n²)` space. Fine in C++/Java at `n = 50`; risky in Python. It's the wrong interview answer, but it's a great *reference implementation* to validate your optimized code on small random grids.

### Worked trace — Example 1, `grid = [[0,2],[1,3]]`

| `t` | Cells with elev ≤ t | BFS reachable set from (0,0) | Reached (1,1)? |
|---|---|---|---|
| 0 | (0,0)=0 | {(0,0)} — neighbors 2 and 1 both > 0 | No |
| 1 | (0,0), (1,0)=1 | {(0,0), (1,0)} — (1,1)=3 blocks | No |
| 2 | + (0,1)=2 | {(0,0), (1,0), (0,1)} — (1,1)=3 still blocks | No |
| 3 | all cells | everything | **Yes → return 3** ✓ |

Note the wasted work: each `t` re-floods from scratch, and most `t` values change nothing. That's exactly what the optimized approaches eliminate.

---

## 5. Approach 1 — Binary Search on `t` + BFS Feasibility

Easiest correct solution to write under pressure. Search `t ∈ [max(grid[0][0], grid[n-1][n-1]), n²−1]`; predicate = one BFS.

```python
from collections import deque

def swimInWater(grid):
    n = len(grid)

    def feasible(t):
        if grid[0][0] > t or grid[n-1][n-1] > t:   # endpoints must be submerged
            return False
        seen = [[False] * n for _ in range(n)]
        seen[0][0] = True
        dq = deque([(0, 0)])
        while dq:
            r, c = dq.popleft()
            if r == n - 1 and c == n - 1:
                return True
            for nr, nc in ((r+1,c), (r-1,c), (r,c+1), (r,c-1)):
                if 0 <= nr < n and 0 <= nc < n and not seen[nr][nc] and grid[nr][nc] <= t:
                    seen[nr][nc] = True
                    dq.append((nr, nc))
        return False

    lo = max(grid[0][0], grid[n-1][n-1])   # tight, and provably feasible at hi
    hi = n * n - 1                          # everything submerged ⇒ always connected
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
```

Invariant: `hi` is always feasible (true initially, since at `t = n²−1` the whole grid is connected), so we return `lo` = the minimal feasible `t`.

### Trace — Example 2 (`lo = max(0, 6) = 6`, `hi = 24`)

| mid | feasible(mid)? | Reason | Action |
|---|---|---|---|
| 15 | **False** | Row 0 + (1,4)=5 are submerged, but (2,4)=16 seals the only descent | `lo = 16` |
| 20 | True | the level-16 route works | `hi = 20` |
| 18 | True | | `hi = 18` |
| 17 | True | | `hi = 17` |
| 16 | True | | `hi = 16` → `lo == hi` → **return 16** ✓ |

Five predicate calls ≈ `log₂(19)` — the logarithmic win over the 25-step brute force.

On Example 1, `lo = max(0, 3) = 3 = hi`, so it returns 3 with *zero* predicate calls — the tight lower bound pays off.

---

## 6. Approach 2 — Modified Dijkstra (Recommended Primary Solution)

One pass, no separate predicate, and the pattern generalizes (see §12). The heap priority is **not** distance-summed: it is **the minimum water level `t` at which this cell becomes reachable**, i.e., the bottleneck of the best path so far.

Relaxation rule (the whole trick):

```
new_t = max(t_popped, grid[nr][nc])     # carry the path max, never reset it
```

```python
import heapq

def swimInWater(grid):
    n = len(grid)
    dist = [[float('inf')] * n for _ in range(n)]
    dist[0][0] = grid[0][0]                 # NOT 0 — see §9, mistake #3
    heap = [(grid[0][0], 0, 0)]             # (bottleneck_t, row, col)
    while heap:
        t, r, c = heapq.heappop(heap)
        if t > dist[r][c]:
            continue                        # stale heap entry (lazy deletion)
        if r == n - 1 and c == n - 1:
            return t                        # first pop of target = final answer
        for nr, nc in ((r+1,c), (r-1,c), (r,c+1), (r,c-1)):
            if 0 <= nr < n and 0 <= nc < n:
                nt = max(t, grid[nr][nc])
                if nt < dist[nr][nc]:
                    dist[nr][nc] = nt
                    heapq.heappush(heap, (nt, nr, nc))
    return -1
```

### Trace — Example 1, `grid = [[0,2],[1,3]]`

| Step | Pop `(t, cell)` | Relaxations |
|---|---|---|
| init | — | `dist[0][0] = 0`, push `(0,(0,0))` |
| 1 | `(0, (0,0))` | `(0,1)`: max(0,2)=**2** push; `(1,0)`: max(0,1)=**1** push |
| 2 | `(1, (1,0))` | `(1,1)`: max(1,3)=**3** push; `(0,0)`: max(1,0)=1 ≮ 0 skip |
| 3 | `(2, (0,1))` | `(1,1)`: max(2,3)=3 ≮ 3 skip |
| 4 | `(3, (1,1))` | **target popped → return 3** ✓ |

### Trace — Example 2 (`n = 5`, answer 16)

Grid for reference:

```
 0   1   2   3   4
24  23  22  21   5
12  13  14  15  16
11  17  18  19  20
10   9   8   7   6
```

| Pop # | Popped `t` | Cell (its own elevation) | Pushed/updated `neighbor → new_t` |
|---|---|---|---|
| 1 | 0 | (0,0) = 0 | (0,1)→1, (1,0)→24 |
| 2 | 1 | (0,1) = 1 | (0,2)→2, (1,1)→23 |
| 3 | 2 | (0,2) = 2 | (0,3)→3, (1,2)→22 |
| 4 | 3 | (0,3) = 3 | (0,4)→4, (1,3)→21 |
| 5 | 4 | (0,4) = 4 | (1,4)→**5** |
| 6 | 5 | (1,4) = 5 | (2,4)→**16** |
| 7 | 16 | (2,4) = 16 | (2,3)→16, (3,4)→20 |
| 8 | 16 | (2,3) = 15 | (2,2)→16, (3,3)→19 |
| 9 | 16 | (2,2) = 14 | (2,1)→16, (3,2)→18 |
| 10 | 16 | (2,1) = 13 | (2,0)→16, (3,1)→17 |
| 11 | 16 | (2,0) = 12 | (3,0)→16 |
| 12 | 16 | (3,0) = 11 | (4,0)→16 |
| 13 | 16 | (4,0) = 10 | (4,1)→16 |
| 14 | 16 | (4,1) = 9 | (4,2)→16 |
| 15 | 16 | (4,2) = 8 | (4,3)→16 |
| 16 | 16 | (4,3) = 7 | (4,4)→16 |
| 17 | 16 | (4,4) = 6 | **target popped → return 16** ✓ |

Two teaching moments here:

1. **The level jump 5 → 16** (pop #6 → #7): no path with water level 6–15 connects any further; the algorithm "disovers" the gap in one heap step.
2. **The level-16 cascade**: every subsequent pop carries `t = 16` regardless of the cell's own elevation (e.g., (4,3)=7 pops with t=16). The heap is ordered by *water level needed to arrive*, not by elevation. Everything downstream inherits the path max — this is exactly why `max(t, grid[·])` is non-negotiable.

---

## 7. Approach 3 — Union-Find "Kruskal by Elevation" (optimal under these constraints)

Because values are a **unique permutation** of `[0, n²)`, build the inverse map `pos[v] = cell id with elevation v` (a counting-sort-style `O(n²)` indexing step — sidestepping the `Ω(N log N)` comparison-sort lower bound, which comes from the decision-tree argument that sorting `N` items needs `Ω(N log N)` comparisons). Then sweep `v = 0 … n²−1`, activating one cell per step and unioning it with already-active neighbors. First time the corners connect → return `v`.

```python
def swimInWater(grid):
    n = len(grid)
    N = n * n
    parent = list(range(N))
    size = [1] * N

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path halving
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb: return
        if size[ra] < size[rb]: ra, rb = rb, ra
        parent[rb] = ra
        size[ra] += size[rb]

    start, end = 0, N - 1                   # cell ids: (r,c) -> r*n + c
    pos = [0] * N                           # valid ONLY because values are unique
    for r in range(n):
        for c in range(n):
            pos[grid[r][c]] = r * n + c

    active = [False] * N
    for v in range(N):
        cell = pos[v]
        r, c = divmod(cell, n)
        active[cell] = True
        for nr, nc in ((r+1,c), (r-1,c), (r,c+1), (r,c-1)):
            if 0 <= nr < n and 0 <= nc < n and active[nr * n + nc]:
                union(cell, nr * n + nc)
        if active[start] and active[end] and find(start) == find(end):
            return v
    return -1
```

### Trace — Example 1

| v | Activate | Unions | Corners connected? |
|---|---|---|---|
| 0 | (0,0) | — | No |
| 1 | (1,0) | with (0,0) | No |
| 2 | (0,1) | with (0,0) | No |
| 3 | (1,1) | with (1,0), (0,1) | **Yes → return 3** ✓ |

### Trace — Example 2 (compressed; A = top component, B = bottom component)

| v (cell) | Effect |
|---|---|
| 0–4 | Row 0 chains into one component **A** |
| 5 (1,4) | (1,4) joins A |
| 6–10 | Bottom row (4,4)=6 … (4,0)=10 chains into component **B** (isolated — its upward neighbors 11, 20 not active yet) |
| 11 (3,0) | (3,0) unions with (4,0) → B grows |
| 12–15 | (2,0), (2,1), (2,2), (2,3) activate and chain into **B** (each unions downward; row-1 cells 24/23/22/21 still sealed) |
| 16 (2,4) | (2,4) unions with **(1,4) ∈ A** and **(2,3) ∈ B** → A ∪ B merge → `find(start) == find(end)` → **return 16** ✓ |

**Complexity:** `O(n²)` to build `pos` + `O(n²)` union/find operations (each cell unions with ≤ 4 neighbors) at `O(α(N))` each — and `α(N) ≤ 5` for any `N` that fits in physical memory (inverse Ackermann grows unimaginably slowly), so this is **effectively `O(n²)` time, `O(n²)` space**. Since any worst-case-correct algorithm must read every cell (an unread cell's elevation could be the one that changes connectivity), `Ω(n²)` is the floor — this approach meets it. If uniqueness were dropped, replace `pos` with a sort of `(value, r, c)` triples → `O(n² log n)`, and batch-process ties (activate all cells of equal value before checking connectivity).

**Which to code in an interview?** Binary search if you want the fastest-to-correct-code; Dijkstra as the polished primary; Union-Find if you want to land the optimality point. All three signal strength; narrate the tradeoff.

---

## 8. Complexity Comparison

| Approach | Time | Space | Notes |
|---|---|---|---|
| Simulate every `t` + BFS | `O(n⁴)` | `O(n²)` | Reference only; ~6.25M ops at n=50 |
| Binary search `t` + BFS | `O(n² log n)` | `O(n²)` | Simplest correct code; monotone predicate |
| Modified Dijkstra | `O(n² log n)` | `O(n²)` | Heap size ≤ ~4n²; early exit at target pop |
| Union-Find + counting sweep | `O(n²)` (effectively; α(N) ≤ 5 for any physical N) | `O(n²)` | Exploits unique values in `[0, n²)` |
| Theoretical floor | `Ω(n²)` | — | Must inspect every cell in the worst case, since any unread cell could change connectivity |

With `n ≤ 50`, everything above runs in microseconds-to-milliseconds; choose by clarity, not speed.

---

## 9. Common Mistakes

| # | Mistake | Why it's wrong / how it bites |
|---|---|---|
| 1 | Treating cost as the **sum** of elevations (plain Dijkstra) | Time only accrues by waiting; path cost = **max**. Example 1: sum=4 vs. answer 3. |
| 2 | Using `< t` instead of `≤ t` in the predicate | Statement says "less than **or equal**". `[[0,1],[3,2]]` breaks: at `t = 2` the gate cell (1,1)=2 must be enterable. |
| 3 | Initializing `dist[0][0] = 0` / assuming `grid[0][0] == 0` | `[[8,0,1],[7,6,2],[5,4,3]]` (values unique in [0,9)): correct answer is **8** (start's own elevation); the buggy init returns **3**. Initialize with `grid[0][0]`, and binary-search `lo = max(two corners)`. |
| 4 | Relaxing with `nt = grid[nr][nc]` instead of `max(t, grid[nr][nc])` | You must **carry the path max**. In Example 2 this "descends" for free and returns garbage. |
| 5 | Returning `grid[n-1][n-1]` as the answer | Example 2: end elevation is 6, answer is 16. The bottleneck can be any cell on the path. |
| 6 | Binary search bounds `lo = 0`, `hi = n²`, or inverted invariant | `hi = n²−1` is tight and provably feasible; keep the invariant "hi is feasible, answer ∈ [lo, hi]" and return `lo`. |
| 7 | Not skipping stale heap entries | Without `if t > dist[r][c]: continue` (or visited-on-pop), you reprocess cells — slow, and can corrupt results if popping logic trusts the popped `t`. |
| 8 | **Recursive** DFS for the feasibility check in Python | A path can be ~2500 cells long; Python's default recursion limit (~1000) can raise `RecursionError`. Use iterative BFS/deque. |
| 9 | Union-Find: checking connectivity only once at the end, or before endpoints activate | Check `find(start) == find(end)` **after each activation**; answer is the current `v`. (The `active[...]` guards are belt-and-suspenders; distinct inactive cells can never be unioned, but the guard documents intent.) |
| 10 | Building `pos[v] = cell` when values might repeat | Overwrites the map silently. If uniqueness is relaxed: sort `(value, r, c)` triples and batch ties. |
| 11 | Off-by-one on `hi` when using `range`, or mixing up **cell id** `r*n+c` with **elevation value** | They're different namespaces that happen to share the range `[0, n²)`. Name your variables (`cell`, `v`) and keep the mapping one-directional in your head. |

---

## 10. Language Gotchas (Java / C++)

| Language | Gotcha | Habit |
|---|---|---|
| Java | `new PriorityQueue<>((a, b) -> a[0] - b[0])` — the subtraction trick | Safe here (`t < 2500`, no overflow), but prefer `Integer.compare(a[0], b[0])` as a reflex for arbitrary ranges |
| Java | `HashMap<Integer,Integer>` for union-find | Use flat `int[] parent = new int[n*n]` — no autoboxing, better cache behavior; also encode heap cells as `r*n+c` instead of `int[]` |
| C++ | `std::priority_queue` is a **max**-heap by default | Use `priority_queue<tuple<int,int,int>, vector<tuple<int,int,int>>, greater<>>` (pops smallest `t` first, ties broken by row/col — harmless) |
| C++ | Uninitialized `dist` | `vector<vector<int>> dist(n, vector<int>(n, INT_MAX));` and guard relaxations with `nt < dist[nr][nc]` |
| Both | Overflow | Non-issue at these sizes: `n*n ≤ 2500` and every intermediate (`max`, `mid`, `r*n+c`) fits an `int` easily |
| Python | (repeat of #8/#10) recursive DFS, `pos` map | Iterative BFS; `pos` only under the uniqueness guarantee |

---

## 11. Test Cases to Propose Out Loud

State these before or right after coding — it demonstrates care and often catches your own bug first.

| # | Input | Expected | What it validates |
|---|---|---|---|
| 1 | `[[0,2],[1,3]]` | 3 | Official Ex. 1 — small hand-trace |
| 2 | `[[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]]` | 16 | Official Ex. 2 — answer is an **interior** bottleneck (end elevation is 6!), catches `max` vs. `sum` and `nt = grid[·]` bugs |
| 3 | `[[0]]` | 0 | `n = 1`: start **is** the goal; loop/return edges |
| 4 | `[[8,0,1],[7,6,2],[5,4,3]]` | 8 | Answer dominated by **start** elevation — kills the `dist[0][0] = 0` bug and the `lo = 0` binary search |
| 5 | `[[0,1],[3,2]]` | 2 | Answer equals **end** elevation; two candidate paths (max 2 vs. max 3), must pick the smaller bottleneck; also checks `≤` at the gate |
| 6 | (verbal) "If you dropped the uniqueness constraint…" | — | Tie batching in the UF sweep; shows you know why `pos[]` is legal here |

After coding: run #1–#5, then (time permitting) cross-check the optimized version against the §4 brute force on random 3×3/4×4 grids with shuffled unique values — a 20-line property test that catches nearly every logic slip.

---

## 12. Transferable Patterns & Related Problems

**The pattern trio for "minimize the maximum along a path" (bottleneck problems):**
1. **Binary search on the answer** — whenever the feasibility predicate is monotone. Prove monotonicity out loud (here: cell set grows with `t`).
2. **Modified Dijkstra** — replace "sum of weights" with any monotone, idempotent combine (here `max`; for LC 1102, `min` with a max-heap).
3. **Kruskal / Union-Find sweep** — sort events by weight/time, merge, stop at the first query success. Works for vertex *or* edge weights (transform `w(u,v) = max(elev(u), elev(v))` if you prefer edges).

**The vertex-weights → edge-weights transform** and the **offline dynamic-connectivity timeline** (sort by time + UF = "when did these two nodes merge?") are the deep takeaways.

| Problem | Relationship | Twist |
|---|---|---|
| LC 1631 — Path With Minimum Effort | Identical skeleton | Edge weight = `|Δelevation|`; minimize the max difference |
| LC 1102 — Path With Maximum Minimum Value | Inverted objective | **Maximize the min** → max-heap Dijkstra or inverted binary search |
| LC 2812 — Find the Safest Path in a Grid | Maximin path | Precompute cell "safety" via **multi-source** BFS, then the same trio |
| LC 407 — Trapping Rain Water II | Heap-driven flooding | Heap ordered by wall height, flood from the boundary |
| LC 1584 — Min Cost to Connect All Points | Kruskal skeleton | Classic MST; same sort + UF machinery |
| LC 547 / 721 — Number of Provinces / Accounts Merge | Plain UF warm-ups | Components only, no sweep order |
| LC 875 / 1011 / 410 — Koko, Ship Packages, Split Array | Binary-search-on-answer family | Different monotone predicates |

**Likely follow-up questions:** "Can you beat `O(n² log n)`?" → yes, counting sweep + UF, justified by value uniqueness (and `Ω(n²)` is unavoidable since every cell must be read in the worst case). "What if values repeat?" → batch ties, drop the inverse map. "Rectangular `m × n`?" → nothing changes; `lo = max(two corners)` still.

---

## 13. Full Interview Talk Track (spoken script)

> *"Let me restate: I start at the top-left, time only advances while I wait, swimming is free, and at time t I can occupy any cell with elevation ≤ t. So movement costs nothing — the only thing that matters is the highest elevation I'm forced to stand on along my route. That reframes the problem: I'm looking for the path from top-left to bottom-right that **minimizes the maximum elevation along it** — a minimax, or bottleneck, path. Not a shortest path; sums are irrelevant.*
>
> *Equivalent view: find the smallest t such that all cells with elevation ≤ t connect the two corners. That predicate is monotone in t, which gives me three standard tools. One: binary search t with a BFS feasibility check — O(n² log n). Two: a modified Dijkstra where the priority is the max elevation seen so far, and relaxing a neighbor is max(current, neighbor's elevation) — also O(n² log n), single pass, and it early-exits when the goal pops. Three: Kruskal-style union-find — activate cells in increasing elevation order, union with active neighbors, and the first moment the corners connect, that elevation is my answer. Since values are unique in [0, n²), I can invert the value→cell map and get effectively O(n²).*
>
> *I'll code the Dijkstra variant — it's one pass and hard to get wrong. Two details I'll be careful about: the start distance initializes to grid[0][0], not zero, since the answer is at least the max of the two corner elevations; and the relaxation must carry the running max, never reset it. Complexity O(n² log n) time, O(n²) space — at n ≤ 50 that's trivial. Edge cases I'll test: n = 1 returns grid[0][0]; the Example 2 case where the answer, 16, is an interior bottleneck, not the goal's elevation."*

Then code. While coding, narrate: stale-entry skip, `≤` (not `<`) in any threshold comparison, iterative BFS if you build the predicate.

---

## 14. Say It in 60 Seconds

> *"This is a bottleneck-path problem, not shortest path: swimming is free, so the answer is just the largest elevation on the best route — I want the top-left to bottom-right path that **minimizes its maximum elevation**. Same thing as: the smallest t where cells with elevation ≤ t connect the corners, which is monotone in t. Three standard tools: binary search on t plus a BFS check, a modified Dijkstra where the priority is the running max and relaxing means `max(current, neighbor)`, or a Kruskal-style union-find that activates cells in elevation order and returns the level where the corners first connect. I'll code Dijkstra: O(n² log n) time, O(n²) space, early exit when the goal pops. Two traps I'll avoid: the start distance initializes to the start's own elevation — the answer is at least the max of the two corners — and the relaxation carries the path max, never resets it. Edge cases: n=1 returns the single value, and the answer can be an interior cell's elevation, like 16 in Example 2 — not the goal's own height."*

(~55 seconds at a calm pace. If you only have 20 seconds: *"Bottleneck path — minimize the max elevation from start to goal. Modified Dijkstra with `max` relaxation, O(n² log n); or binary search + BFS; or union-find over cells sorted by elevation. Answer ≥ max of the two corners."*)
