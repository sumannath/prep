# Min Cost to Connect All Points (LeetCode 1584)

A complete interview-prep walkthrough: restatement, constraint decoding, brute force with trace, the key insight, optimal algorithms with traces, complexity, pitfalls, tests, and transferable patterns.

---

## 1. Problem Restatement (Say It Back)

> We're given `n` points on a 2D plane. The "cost" of an edge between two points is their **Manhattan distance**: `|x_i − x_j| + |y_i − y_j|`. We must pick a set of edges so that **every pair of points is connected by exactly one simple path** — that's the definition of a **tree** — and the total edge cost must be minimal. We return the total cost, not the edges themselves.

Two observations to state out loud immediately:

- "Exactly one simple path between any two points" over **all** `n` points is the definition of a **spanning tree**. So the question is literally: *find the minimum spanning tree (MST) of the complete graph on these `n` points, weighted by Manhattan distance.*
- We return a **sum**, not the edge list — so we don't need to reconstruct the tree, only its total weight.

**Graph modeling:** vertices = points (index `0..n−1`), edges = every unordered pair (this is a **complete graph**, `K_n`), edge weight = Manhattan distance. Since there are `n(n−1)/2` pairs, we have ~500,000 edges at `n = 1000` — that's the budget everything else must fit inside.

---

## 2. Constraint Decoding

| Constraint | Meaning for design |
|---|---|
| `1 <= n <= 1000` | Tiny enough for **O(n²)** time and **O(n²)** edge storage (~500K edges). An O(n² log n) approach also passes, but O(n²) is the sweet spot for a **dense graph**. |
| Coordinates up to `10^6` in magnitude | Max single edge weight = `2·10^6 + 2·10^6 = 4·10^6` (fits in 32-bit). But the **total** cost can be up to `(n−1) · 4·10^6 ≈ 4·10^9`, which **exceeds a signed 32-bit int** (`≈ 2.147·10^9`). In Java/C++ accumulate the answer in a `long`/`long long`. In Python this is a non-issue. |
| All pairs `(x_i, y_i)` distinct | No two points coincide, so **every edge weight is ≥ 1** — no zero-weight edges, no degenerate self-pairs. This simplifies tie-breaking but changes nothing algorithmically. |
| Return type | A single integer cost; no need to output edges. |

Also note: since the graph is complete, **connectivity is never a problem** — an MST always exists. There's no `-1` / "impossible" branch to handle.

**A quick note on the lower bound:** any MST algorithm in the standard comparison model must inspect every edge in the worst case (an edge it never looked at could be the lightest edge that changes the tree), so Ω(n²) edge examinations are essentially unavoidable here — which is exactly why the O(n²) Prim's algorithm is the "right" answer for a dense graph.

---

## 3. Brute Force and Why It Fails

### 3.1 The true brute force

Enumerate **every spanning tree** of `K_n` and take the cheapest. By Cayley's formula, `K_n` has `n^(n−2)` spanning trees — for `n = 5` that's `125` (manageable), for `n = 10` it's `10^8`, and for `n = 1000` it's astronomically infeasible. So enumeration is dead on arrival; the point of mentioning it in an interview is to show you know the problem is a *classical optimization* problem with a polynomial structure.

### 3.2 The tractable "brute force": Kruskal with all edges

The natural first real solution: generate all `n(n−1)/2` edges, sort by weight, and greedily add edges with Union-Find (Kruskal's algorithm).

**Worked trace on Example 2** — `points = [[3,12],[-2,5],[-4,1]]`, all 3 edges:

| Edge (by index pair) | Weight |
|---|---|
| (0,1): \|3−(−2)\| + \|12−5\| = 5+7 | 12 |
| (0,2): \|3−(−4)\| + \|12−1\| = 7+11 | 18 |
| (1,2): \|−2−(−4)\| + \|5−1\| = 2+4 | **6** |

Kruskal processes edges in weight order:

1. **(1,2), w=6** → nodes 1 and 2 in different components → **take**. Components: {1,2}, {0}. Cost = 6.
2. **(0,1), w=12** → 0 is not connected to {1,2} → **take**. Components: {0,1,2}. Cost = 18.
3. **(0,2), w=18** → both endpoints already in same component → **skip** (would create a cycle).

We have `n−1 = 2` edges → MST cost = **18** ✓ matches expected output.

**Complexity:** building edges O(n²), sorting O(n² log n), union-find near-linear. Total **O(n² log n)** time, **O(n²)** space. This passes at `n = 1000`, but sorting half a million edges is wasted work — for a *dense* graph, Prim's algorithm without a heap does better.

---

## 4. The Core Insight

> The problem is a ** Minimum Spanning Tree** on a complete graph. And for a *dense* graph (edge count ≈ V²), the optimal classic algorithm is **Prim's algorithm in O(V²)** using an array — *not* the heap-based version, which pays `log E` on top of work we must do anyway.

The O(n²) Prim's algorithm:

- Maintain `best[u]` = the cheapest edge weight connecting `u` to the set of vertices **already in the tree** (the "grown" set), and a `visited` flag.
- Each round: pick the unvisited vertex with the smallest `best`, lock it in, add `best` to the total, then **relax** every other unvisited vertex: `best[v] = min(best[v], dist(u, v))`.
- Repeat `n − 1` times (or run n rounds with the first vertex seeded at cost 0 — same result).

Why it's correct: this is the classic cut/cycle property — at each step, the cheapest edge crossing the cut between the grown set and the rest belongs to *some* MST, so greedily adding it is safe. Manhattan distance is just a weight function; it doesn't change the algorithm at all.

---

## 5. Optimal Approach: Prim's O(n²)

### 5.1 Code (Python)

```python
class Solution:
    def minCostConnectPoints(self, points: list[list[int]]) -> int:
        n = len(points)
        if n == 1:
            return 0

        INF = float('inf')
        best = [INF] * n          # best[u]: cheapest edge from u into the grown set
        visited = [False] * n
        best[0] = 0               # seed the tree with point 0
        total = 0

        for _ in range(n):
            # pick unvisited vertex with smallest best[]
            u = -1
            for v in range(n):
                if not visited[v] and (u == -1 or best[v] < best[u]):
                    u = v
            visited[u] = True
            total += best[u]

            # relax all unvisited vertices through u
            ux, uy = points[u]
            for v in range(n):
                if not visited[v]:
                    d = abs(points[v][0] - ux) + abs(points[v][1] - uy)
                    if d < best[v]:
                        best[v] = d

        return total
```

Implementation notes:

- Indexing is by **vertex index** `0..n−1`; `points[u]` is the coordinate **value**. Keep the two straight in your head — most bugs here are index/value confusion in the relaxation loop.
- Seeding `best[0] = 0` means the first iteration picks vertex 0 and adds 0 to the total — a clean way to start the loop.
- The `d < best[v]` guard recomputes at most one Manhattan distance per pair per relaxation pass; the double loop does `n²` distance computations total, which is unavoidable anyway.

### 5.2 Trace on Example 1

`points = [[0,0],[2,2],[3,10],[5,2],[7,0]]`, `best = [0, ∞, ∞, ∞, ∞]`

| Round | Pick `u` (min `best`) | Add to total | Relaxation updates (`best[v] = dist(u,v)` if smaller) |
|---|---|---|---|
| 1 | 0 (`best=0`) | 0 | best = [·, **4**, **13**, **7**, **7**] — dist(0,1)=4, dist(0,2)=13, dist(0,3)=7, dist(0,4)=7 |
| 2 | 1 (`best=4`) | 4 | dist(1,2)=9 no (13>9→ **best[2]=9**), dist(1,3)=3 → **best[3]=3**, dist(1,4)=7 no. best = [·, ·, 9, **3**, 7] |
| 3 | 3 (`best=3`) | 3 | dist(3,2)=10 no (9 stays), dist(3,4)=4 no (7 stays). best = [·, ·, 9, ·, 7] |
| 4 | 4 (`best=7`) | 7 | dist(4,2)=12 no (9 stays). best = [·, ·, 9, ·, ·] |
| 5 | 2 (`best=9`) | 9 | done |

Total = 0 + 4 + 3 + 7 + 9 = **20** ✓ (edges: (0,1), (1,3), (0,4)... wait — let's read off the actual tree: 0→1 (4), 1→3 (3), 0→4 (7), 1→2 (9). Exactly 4 edges for 5 nodes, total **20**, matching the expected output.)

### 5.3 Trace on Example 2

`points = [[3,12],[-2,5],[-4,1]]`, `best = [0, ∞, ∞]`

| Round | Pick | Add | Relaxations |
|---|---|---|---|
| 1 | 0 (0) | 0 | best = [·, **12**, **18**] |
| 2 | 1 (12) | 12 | dist(1,2) = 6 < 18 → best[2] = 6 |
| 3 | 2 (6) | 6 | — |

Total = **18** ✓

### 5.4 Alternative: heap-based Prim (worth mentioning, usually not required)

Push `(weight, vertex)` into a min-heap when relaxing; pop lazily and skip already-visited vertices. This is `O(n² log n)` here (the heap holds up to O(n²) lazy entries), i.e., **no better** than Kruskal for this density — say so explicitly to show judgment. Code sketch:

```python
def minCostConnectPoints(self, points):
    n = len(points)
    total, visited = 0, set()
    heap = [(0, 0)]  # (cost, vertex)
    while len(visited) < n:
        w, u = heapq.heappop(heap)
        if u in visited:
            continue          # lazy deletion: stale entry
        visited.add(u)
        total += w
        ux, uy = points[u]
        for v in range(n):
            if v not in visited:
                d = abs(points[v][0] - ux) + abs(points[v][1] - uy)
                heapq.heappush(heap, (d, v))
    return total
```

### 5.5 Kruskal implementation (for completeness / if asked)

```python
def minCostConnectPoints(self, points):
    n = len(points)
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            edges.append((abs(points[i][0]-points[j][0]) + abs(points[i][1]-points[j][1]), i, j))
    edges.sort()

    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # path halving
            x = parent[x]
        return x

    total, used = 0, 0
    for w, a, b in edges:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            total += w
            used += 1
            if used == n - 1:
                break
    return total
```

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Enumerate all spanning trees | `O(n^(n−2))` | — | Infeasible; only a conceptual baseline (Cayley's formula). |
| Kruskal (all edges + sort + DSU) | `O(n² log n)` | `O(n²)` edges | Passes at n ≤ 1000; sort dominates. |
| **Prim O(n²) (array)** | **`O(n²)`** | **`O(n)`** | Best for dense graphs; matches the Ω(n²) edge-inspection lower bound. ~10⁶ operations at n=1000 — trivial. |
| Prim with binary heap (lazy) | `O(n² log n)` | `O(n²)` heap entries | No benefit on a complete graph — mention but don't lead with it. |

Why O(n²) Prim is *optimal in practice* here: the graph is complete, so merely reading all edge weights already costs Θ(n²), and (as noted in §2) a comparison-model MST algorithm must examine every edge in the worst case — so no algorithm can beat O(n²) for this input representation.

---

## 7. Common Mistakes & Interview Traps

| # | Mistake | Why it bites | Fix |
|---|---|---|---|
| 1 | **32-bit overflow of the total** (Java/C++) | Max total ≈ `(n−1)·4·10⁶ ≈ 4·10⁹ > 2³¹−1` | Use `long` (Java) / `long long` (C++) for the accumulator. Individual edge weights fit in `int`. |
| 2 | **Heap-Prim without the visited check** | Popping a stale heap entry and adding its weight twice | After popping, `if u in visited: continue` (lazy deletion) — the classic Dijkstra/Prim pattern. |
| 3 | **Marking `visited[u]` before relaxing from it vs. after** | Marking after relaxation lets `u` relax into itself / get re-added | Lock `u` as visited, *then* relax only unvisited neighbors. |
| 4 | **Forgetting `n == 1` returns 0** | With one point, zero edges are needed; some naive loops still run a relaxation pass | Early return (or verify the loop naturally yields 0 — it does here since `best[0] = 0`, but call it out). |
| 5 | **Index/value confusion** | `points[u]` is a coordinate, `u` is a vertex index; caching `ux, uy` vs. re-indexing `points[v][0]` inconsistently leads to wrong distances | Cache the picked vertex's coordinates once per round. |
| 6 | **C++: `INT_MAX` sentinel overflow** | `if (d < best[v])` is fine, but any pattern like `best[v] + something` with `INT_MAX` overflows | Use `LLONG_MAX`/large sentinel and guard additions, or initialize with a value derived from real max distance. |
| 7 | **Java: boxing in `PriorityQueue<Integer>`** | Autoboxing makes the heap version slower and clunkier | Prefer `int[] {dist, vertex}` entries with a comparator, or just use the array-based Prim and skip the heap entirely. |
| 8 | **Assuming duplicates exist** | Constraint says all pairs are distinct — zero-weight edges are impossible; don't write special handling for them | Note it out loud; it removes a whole class of tie-breaking worries. |

---

## 8. Test Cases to Propose Out Loud

Before coding, say: *"Let me pick tests — the two official examples, plus edge cases I care about: a single point, two points, negative coordinates, and a collinear case."*

| Test | Input | Expected | What it verifies |
|---|---|---|---|
| Official 1 | `[[0,0],[2,2],[3,10],[5,2],[7,0]]` | `20` | Multi-point MST; star-ish vs. chain shapes; the trace in §5.2. |
| Official 2 | `[[3,12],[-2,5],[-4,1]]` | `18` | Small `n`, all-negative-x points, only 3 candidate edges. |
| Single point | `[[5,7]]` | `0` | `n = 1` → no edges needed; return 0 without iterating pairs. |
| Two points | `[[0,0],[1000000,1000000]]` | `4000000` | Max-distance edge; checks the absolute-value handling and that a single 4·10⁶ answer is right (fits in int, but it's the per-edge maximum). |
| Collinear | `[[0,0],[1,0],[2,0],[3,0]]` | `3` | Only adjacent edges (weight 1) form the MST; a greedy "connect to nearest unvisited" would also work here, but Prim proves it generally. |
| Max-size sanity | 1000 points in a tight cluster | (any finite value) | Performance: O(n²) loop, no TLE; also stress-tests the total possibly nearing `4·10⁹` → overflow correctness in typed languages. |

---

## 9. Transferable Patterns & Related Problems

**Patterns to name in the interview:**

1. **MST on an implicitly defined complete graph** — the "edges" don't come from an input list; you synthesize them from a distance function (Manhattan here; Euclidean, Hamming, or custom cost elsewhere). Kruskal/Prim still apply unchanged.
2. **Dense-graph Prim O(V²)** — whenever `E ≈ V²`, the array-based Prim beats heap-based Prim and Kruskal. Know *when* to drop the heap.
3. **Dijkstra/Prim structural similarity** — both are "grow a set, relax via the newly added vertex, always take the min frontier vertex." Dijkstra minimizes *path length*, Prim minimizes *single edge weight*. Interviewers love this contrast.
4. **Manhattan-distance tricks** — for related problems that need *bottleneck* distances (minimize the maximum edge), Manhattan distance admits an O(n) rotate-and-sort trick (`x+y`, `x−y` transforms) to shrink the candidate edge set — out of scope here, but a great "if time permits" mention.

**Related problems:**

| Problem | Connection |
|---|---|
| LC 1135 – Connecting Cities With Minimum Cost | Same MST, but edges given explicitly — Kruskal shines. |
| LC 1168 – Optimal Water Distribution in a Village | MST + a "virtual node" trick (build wells as a node with edge = well cost). |
| LC 1631 – Path With Minimum Effort | Minimax path — solvable via MST-like ideas, binary search + BFS, or modified Dijkstra. |
| LC 743 – Network Delay Time | Dijkstra, the Prim sibling. |
| LC 1489 – Critical and Pseudo-Critical Edges in MST | Deeper Kruskal mastery; runs MST repeatedly with edges forced/removed. |

---

## 10. "Say It in 60 Seconds"

> "We need every pair of points connected with exactly one path — that's the definition of a spanning tree — so this is minimum spanning tree on a complete graph where edge weights are Manhattan distances.
>
> Since the graph is dense, with about n-squared-over-two edges, the best fit is Prim's algorithm in O(n-squared) using a plain array instead of a heap — a heap would just add log factors on top of edges we have to scan anyway.
>
> I'll keep an array of the cheapest connection cost from each point into the tree I'm growing, seed the first point at zero, then loop n times: pick the cheapest unvisited point, add its cost, and relax all remaining points with their Manhattan distance to it. I cache the picked point's coordinates and mark it visited before relaxing.
>
> Time is O(n-squared), space O(n). One correctness caveat: the total can reach about four billion — with n up to a thousand and edges up to four million — so in Java or C++ I'd accumulate in a long; Python handles big ints natively. Edge cases: a single point returns zero, and since all coordinates are distinct, no zero-weight edges — no special handling needed."

**Delivery tip:** lead with the MST recognition (that's the whole problem), then justify O(n²) Prim by graph density — that one sentence of judgment ("heap adds no benefit on a complete graph") is what separates a solved problem from a well-solved one.
