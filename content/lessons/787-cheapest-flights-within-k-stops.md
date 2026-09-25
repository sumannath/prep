# Cheapest Flights Within K Stops — Complete Interview Lesson

**LeetCode 787 · Medium · Graphs / Shortest Path**

---

## 1. Problem Restatement (say it back in your own words)

You have a **weighted directed graph**: `n` cities labeled `0..n-1` (labels are used directly as indices), and `flights[i] = [from_i, to_i, price_i]` is a directed edge `from_i → to_i` with weight `price_i`.

Find the **minimum total price of a route `src → dst` that uses at most `k` stops**.

The one definition you must nail before touching code:

> **A "stop" is an intermediate city.** `src` and `dst` do **not** count as stops.
> So *at most `k` stops* ⇔ *at most `k + 1` flight legs (edges)*.

Sanity check with Example 1: `0 → 1 → 2 → 3` visits intermediate cities `{1, 2}` → **2 stops**, cost 400 — invalid when `k = 1`. `0 → 1 → 3` visits `{1}` → 1 stop, cost 700 — valid. This edge-vs-stop distinction is the entire off-by-one battle of this problem.

If no route fits the budget, return `-1`.

---

## 2. Constraint Decoding

| Constraint | What it tells you |
|---|---|
| `2 ≤ n ≤ 100` | Tiny graph. An `O((k+1)·E)` algorithm does at most ~`100 · 4950 ≈ 5·10⁵` relaxations — trivial. **Pick the simplest provably-correct algorithm**, not the fanciest one. |
| `flights.length ≤ n(n-1)/2`, no duplicate `(from,to)`, `from ≠ to` | `E ≤ 4950`. It's a simple digraph: no parallel edges, no self-loops, so adjacency lists have unique neighbors. (Relaxation-based code would still be correct if parallel edges existed — it would just do redundant comparisons.) |
| `1 ≤ price ≤ 10⁴` | **Strictly positive weights** → no negative cycles, Dijkstra is legal on any expanded state space, and the "cheapest walk = cheapest simple path" argument holds (see pass-cap trick below). |
| `0 ≤ k < n` | `k = 0` is possible → **only direct flights count** (Example 3 tests exactly this). `k` can be as large as `n−1`, i.e., the budget can exceed every simple path. |
| `src ≠ dst` | No zero-leg trivial case to special-case, but you still must return `-1` when the budget makes `dst` unreachable. |
| prices ≤ 10⁴, any valid route ≤ 99 legs | Max possible answer ≈ `99 · 10⁴ < 10⁶` → fits comfortably in 32-bit `int` (relevant for Java/C++). |

**Indices vs values:** `from_i`, `to_i` are node **labels in `0..n-1`** — use them directly as indices into your `dist` array. `price_i` is a value, never an index.

---

## 3. Brute Force: Enumerate Every Route Within Budget

**Idea:** DFS from `src`, walking every outgoing edge, tracking `edges_used` and running cost. Record the cost whenever you land on `dst` with `edges_used ≤ k+1`. Prune when the budget is exhausted or the running cost already exceeds the best found.

```python
from math import inf
from collections import defaultdict

def findCheapestPrice_bruteforce(n, flights, src, dst, k):
    adj = defaultdict(list)
    for u, v, w in flights:
        adj[u].append((v, w))

    best = [inf]

    def dfs(node, edges_used, cost):
        if cost >= best[0]:            # cost pruning
            return
        if node == dst:
            best[0] = cost             # edges_used ≤ k+1 guaranteed by caller
            return
        if edges_used == k + 1:        # budget exhausted
            return
        for nxt, w in adj[node]:
            dfs(nxt, edges_used + 1, cost + w)

    dfs(src, 0, 0)
    return best[0] if best[0] != inf else -1
```

### Worked trace — Example 1 (`k = 1`, budget = 2 edges)

City 0's only out-edge is `0→1`:

```
level 0:   {0 : cost 0}
level 1:   0→1 (100)                    → {1 : 100}
level 2:   1→2 (200)   → node 2 ≠ dst, budget exhausted, backtrack
           1→3 (700)   → dst! record 700
no more expansions              ⇒ answer 700 ✓
```

### The budget is what makes this interesting

Same code, Example 2:

- `k = 1` (≤ 2 edges): routes `0→2` (500) and `0→1→2` (200) → **200**
- `k = 0` (≤ 1 edge): only `0→2` (500) → **500**

**Complexity:** worst case the DFS explores **O((n−1)^(k+1)) walks** — each of the ≤ `k+1` steps picks among ≤ `n−1` outgoing edges — which is exponential in `k`. Cost pruning helps in practice but not adversarially. Too slow in general; it's your launchpad, not your answer.

---

## 4. Core Insight

This is a **constrained shortest path**: shortest walk from `src` to `dst` using **at most `k+1` edges**. Two facts unlock it:

1. **Bellman–Ford's invariant, read layer by layer.** If you run Bellman–Ford passes and, in each pass, relax every edge using a **frozen copy of the previous pass's distances**, then after pass `i`:
   > `dist[v]` = cheapest cost to reach `v` using **at most `i` edges**.

   The freeze is what enforces "one edge per pass": you may only build on paths that existed *before* this pass started. Run **`k+1` passes** and read `dist[dst]`.

2. **The DP behind it.** Define `dp[t][v]` = cheapest cost to `v` using ≤ `t` edges:
   ```
   dp[0][src] = 0,   dp[0][v] = ∞ otherwise
   dp[t][v]   = min( dp[t-1][v],  min over edges (u→v, w) of dp[t-1][u] + w )
   ```
   Answer = `dp[k+1][dst]`. Because `t` strictly decreases along dependencies, **graph cycles can't cause infinite recursion** — the state space `(node, budget)` is a finite DAG. Layered Bellman–Ford is just this DP with the `t` dimension rolled into one array plus a snapshot copy.

**Why plain Dijkstra is wrong here (the interview trap):** Dijkstra commits to the cheapest way of reaching each node. But the *cheapest* way to a mid-route city can burn extra stops, blocking the only continuation that fits the budget. In Example 1 with `k = 1`, plain Dijkstra returns **400** (`0→1→2→3`) — a route with 2 stops. Same failure mode for BFS with a single global `visited` set.

---

## 5. Optimal Approach: Layered (Budget-Capped) Bellman–Ford

### Algorithm

1. `dist[v] = ∞` for all cities; `dist[src] = 0`.
2. Repeat **`k + 1`** times (optionally capped at `min(k+1, n-1)` — see note):
   a. `prev = dist[:]`  ← **freeze the previous layer** (this line *is* the algorithm)
   b. For every flight `(u, v, w)`: if `prev[u]` is reachable and `prev[u] + w < dist[v]`, update `dist[v]`.
   c. Optional: if nothing changed this pass, break — a fixed point can't produce later improvements, because a later pass relaxes from an identical snapshot.
3. Return `dist[dst]`, or `-1` if it's still `∞`.

### Python

```python
from math import inf
from typing import List

class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]],
                          src: int, dst: int, k: int) -> int:
        dist = [inf] * n
        dist[src] = 0

        # "at most k stops" <=> "at most k+1 edges".
        # Cap at n-1: any walk with > n-1 edges repeats a city, and the cycle
        # between the repeats costs >= 1 (positive prices), so deleting it
        # gives a cheaper-or-equal walk with fewer edges. Hence the cheapest
        # <= (k+1)-edge walk equals the cheapest <= min(k+1, n-1)-edge walk.
        rounds = min(k + 1, n - 1)

        for _ in range(rounds):
            prev = dist[:]                  # freeze previous layer — CRUCIAL
            improved = False
            for u, v, w in flights:
                if prev[u] != inf and prev[u] + w < dist[v]:
                    dist[v] = prev[u] + w
                    improved = True
            if not improved:                # fixed point: stop early
                break

        return dist[dst] if dist[dst] != inf else -1
```

Note there's **no adjacency list needed** — iterating `flights` directly is simpler and keeps extra space at `O(n)`.

### Trace — Example 1 (`n=4`, `k=1` → 2 passes)

Edges in input order: `0→1:100, 1→2:100, 2→0:100, 1→3:600, 2→3:200`.

**Layer 0:** `[0, ∞, ∞, ∞]`

**Pass 1** — snapshot `prev = [0, ∞, ∞, ∞]`:

| Edge | `prev[u]` | Candidate | `dist` after |
|---|---|---|---|
| `0→1 (100)` | 0 | 100 | `[0, 100, ∞, ∞]` |
| `1→2 (100)` | ∞ | skip | `[0, 100, ∞, ∞]` |
| `2→0 (100)` | ∞ | skip | unchanged |
| `1→3 (600)` | ∞ | skip | unchanged |
| `2→3 (200)` | ∞ | skip | unchanged |

**Layer 1:** `[0, 100, ∞, ∞]`

**Pass 2** — snapshot `prev = [0, 100, ∞, ∞]`:

| Edge | `prev[u]` | Candidate | `dist` after |
|---|---|---|---|
| `0→1 (100)` | 0 | 100 (no change) | `[0, 100, ∞, ∞]` |
| `1→2 (100)` | 100 | **200** | `[0, 100, 200, ∞]` |
| `2→0 (100)` | ∞ | skip | unchanged |
| `1→3 (600)` | 100 | **700** | `[0, 100, 200, 700]` |
| `2→3 (200)` | ∞ | skip | unchanged |

Answer: `dist[3] = 700` ✓. Note `2→0` never polluted anything — the snapshot keeps layers monotone, so cycles are harmless.

### The bug demonstration, on this exact example

If you relax **in place** (no copy), Pass 2 corrupts itself: `1→2` sets `dist[2]=200`, then `2→3` sees the *fresh* `dist[2]=200` and sets `dist[3] = 400`. That's the cost of `0→1→2→3` — a **2-stop** route, invalid at `k=1`. Output `400` instead of `700`. Insidious detail: with a different edge order the in-place version may accidentally pass — the snapshot is what makes it correct for **every** edge order.

### Trace — Example 2 (`k=1` → 2 passes)

- Layer 0: `[0, ∞, ∞]`
- Pass 1 (`prev = [0,∞,∞]`): `0→1` → 100; `1→2` skip; `0→2` → 500. Layer 1: `[0, 100, 500]`
- Pass 2 (`prev = [0,100,500]`): `1→2`: `100+100=200 < 500` → `dist[2]=200`; others no change.
- Answer **200** ✓

### Trace — Example 3 (`k=0` → 1 pass)

- Pass 1 (`prev = [0,∞,∞]`): `dist[1]=100`, `dist[2]=500` (direct edge only). Answer **500** ✓ — this is the example that catches the off-by-one (if you ran only `k` passes, you'd still be fine here by luck with this input, but Example 2 with `k=0` style cases or the code below will catch it).

### Narration script while coding (fuller talk track)

> "Model this as a weighted digraph. 'At most k stops' means at most k+1 edges, so it's shortest path with an **edge budget**. Plain Dijkstra fails on budgets — the cheapest way to an intermediate city can waste stops and block the only valid continuation; on Example 1 it returns 400, the 2-stop route. So I'll use Bellman–Ford, capped at k+1 passes. I keep `dist[v]` = best known cost to `v`. Each pass I snapshot `dist` into `prev`, then relax every edge **from the snapshot**. The snapshot guarantees each pass extends paths by exactly one edge, so after pass i, `dist[v]` is the cheapest cost using ≤ i edges. After k+1 passes I read `dist[dst]`; if it's still infinity, I return −1. Time O(k·E), space O(n) — with n ≤ 100 that's ≤ ~5·10⁵ operations."

---

## 6. Alternative Formulations (know one of these cold as a backup)

### 6.1 Memoized DFS — the same DP, top-down

State: `best(node, edges_left)` = cheapest cost from `node` to `dst` using ≤ `edges_left` edges. The budget shrinks monotonically, so graph cycles are harmless.

```python
from math import inf
from collections import defaultdict
from functools import lru_cache
from typing import List

class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]],
                          src: int, dst: int, k: int) -> int:
        adj = defaultdict(list)
        for u, v, w in flights:
            adj[u].append((v, w))

        @lru_cache(maxsize=None)
        def best(node: int, edges_left: int):
            if node == dst:
                return 0
            if edges_left == 0:
                return inf
            ans = inf
            for nxt, w in adj[node]:
                sub = best(nxt, edges_left - 1)
                if sub + w < ans:      # inf + w = inf, safe in Python
                    ans = sub + w
            return ans

        res = best(src, k + 1)
        return -1 if res == inf else res
```

- `O(n·(k+1))` states, each scanning its adjacency once → **O((k+1)·E)** time: at most `n(k+1)` memoized states and total edge scans = `(k+1)·Σ out-degree = (k+1)·E`. Space `O(n·k)` memo + `O(k)` recursion stack (depth ≤ ~102 here).

### 6.2 Dijkstra on the expanded state space `(cost, edges_used, node)`

Run Dijkstra where a "node" is `(city, edges_used)`. Pop in nondecreasing cost; the first pop of `dst` is the answer (only states with `edges ≤ k+1` are ever pushed). Pruning rule: track `best_edges[node]` = fewest edges with which `node` was ever popped; skip a popped state if `edges >= best_edges[node]`. Valid because a state popped earlier has cost ≤ (heap order) and edges ≤, so it **dominates**: any completion valid for the later state is valid for the earlier one and no more expensive.

```python
import heapq
from collections import defaultdict

class Solution:
    def findCheapestPrice(self, n: int, flights, src: int, dst: int, k: int) -> int:
        adj = defaultdict(list)
        for u, v, w in flights:
            adj[u].append((v, w))

        best_edges = [k + 2] * n            # sentinel > any real edges_used
        heap = [(0, 0, src)]                # (cost, edges_used, node)
        while heap:
            cost, edges, node = heapq.heappop(heap)
            if node == dst:
                return cost
            if edges >= best_edges[node]:   # dominated: cost ≥ and edges ≥
                continue
            best_edges[node] = edges
            if edges == k + 1:              # budget exhausted: terminal state
                continue
            for nxt, w in adj[node]:
                heapq.heappush(heap, (cost + w, edges + 1, nxt))
        return -1
```

- Time **O(kE log(kE))**: each recorded pop (≤ `n·(k+2)`, one per distinct node/edge-count) pushes ≤ out-degree states, so heap traffic is O(kE), and each binary-heap op costs O(log kE). Space O(kE) worst case for the heap.
- For this problem it's **more code and worse asymptotics** than layered Bellman–Ford — mention it, don't lead with it.

### 6.3 Why plain Dijkstra / plain BFS fail — concrete counterexample

```
n = 5, src = 0, dst = 4, k = 2
flights = [[0,1,1],[1,5,1],[5,2,1],[0,2,100],[2,4,1]]
```

- `0→1→5→2→4`: cost 4, but 3 stops → **invalid**.
- `0→2→4`: cost 101, 1 stop → **valid, and the correct answer is 101**.

Plain Dijkstra (visited-once per node) returns 4 (an illegal route). Dijkstra that carries `stops` in the state but still marks a node visited once returns **-1**: node 2 gets visited via the cheap 3-edge path, the expensive 1-edge arrival `0→2` is discarded, and `dst` is never legally reached. On the **official Example 1 with `k=1`**, plain Dijkstra returns 400 instead of 700. Takeaway: with a resource budget, **the state must include the resource**, or your visited/pruning logic must respect it.

### 6.4 Level-BFS framing (brief)

Expand the frontier layer by layer for `k+1` rounds, carrying `{node: best cost}` per layer into the next. It's isomorphic to the two-array Bellman–Ford above; just don't use a single global `visited` — prune per layer or you'll re-introduce the bug from 6.3.

### 6.5 Why not Floyd–Warshall?

Floyd gives all-pairs shortest paths but no edge budget; a 3D variant `dp[u][v][t]` over edge count would be `O(n³·k)` — needlessly heavy for `n ≤ 100`.

---

## 7. Complexity Table

| Approach | Time | Extra space | Verdict |
|---|---|---|---|
| DFS over all walks (cost-pruned) | O((n−1)^(k+1)) worst case — each of ≤ k+1 steps has ≤ n−1 next-city choices | O(k) stack | Fails large budgets |
| Memoized DFS `(node, edges_left)` | O((k+1)·E) — each of n(k+1) states scans its adjacency once | O(n·k) memo + O(k) stack | Great "reasoning" answer |
| **Layered Bellman–Ford (recommended)** | **O((k+1)·E)**, ≤ ~5·10⁵ ops here | **O(n)** (iterate `flights` directly) | **Lead with this** |
| Level-BFS / 2-row DP | O((k+1)·E) | O(n) | Same algorithm, other framing |
| Dijkstra on `(cost, edges, node)` | O(kE log(kE)) — binary-heap ops over O(kE) pushed states | O(kE) heap | Backup / generalizes better |
| Full Bellman–Ford (n−1 passes) | O(n·E) — standard bound: ≤ V−1 passes each scanning all E edges | O(n) | Passes, but wasteful; `O((k+1)E)` is strictly better since `k+1 ≤ n` |

---

## 8. Common Mistakes

1. **Off-by-one on `k`.** Running `k` passes / allowing `k` edges instead of `k+1`. A stop is an *intermediate city*; `src`/`dst` don't count. Example 3 (`k=0` must return 500) is the litmus test.
2. **Relaxing in place without the snapshot.** One pass chains through multiple edges, silently violating the budget. Symptom: Example 1 returns **400**. Fix: `prev = dist[:]` each pass.
3. **Plain Dijkstra or BFS with a single `visited` set.** Returns 400 on Example 1, −1 on §6.3's counterexample. Fix: put the resource in the state (§6.2) or use layered BF.
4. **Level-BFS pruned per-node globally** instead of per-layer — drops a cheap-but-deep state you need later.
5. **Forgetting the `-1` case** — check `dist[dst] == inf` (empty `flights`, or budget too small).
6. **Extending states after the budget is spent** in the Dijkstra-state version (`edges == k+1` must be terminal).
7. **Overflow when adding to an `∞` sentinel** in Java/C++ (see §9).
8. **Wrestling with cycle detection / "paths must be simple."** Unnecessary — the budget bounds walk length, and the layering handles cycles (Example 1's `2→0` edge never hurts).
9. **Assuming duplicate edges or self-loops need handling.** Constraints exclude them; and relaxation code is tolerant of duplicates anyway. Mention this out loud — it shows you read the constraints.

---

## 9. Language Gotchas

| Language | Gotcha |
|---|---|
| **Python** | `prev = dist[:]` (or `list(dist)`) — forgetting the copy is *the* bug. `float('inf') + w` is safe in Python, but keep the `prev[u] != inf` guard anyway; it ports directly to Java/C++. If you build a 2D DP table, avoid `[[inf]*n]*(k+1)` — that aliases rows. |
| **Java** | `int INF = Integer.MAX_VALUE`; adding `price` to it **overflows to negative** and corrupts every future `min` — guard with `if (prev[u] == INF) continue;` before adding. Snapshot: `int[] prev = dist.clone();` — `int[] prev = dist;` only aliases the array. Use plain `int[]` for `dist`, not `HashMap<Integer,Integer>` (autoboxing overhead). |
| **C++** | `INT_MAX + w` is signed overflow (**UB**), not wraparound-you-can-reason-about — guard it or use a sentinel like `const long long INF = 1e9;`. Snapshot: `auto prev = dist;` copies the vector (fine, O(n) per pass) — `auto& prev = dist;` would be a reference and reintroduces the in-place bug. |

---

## 10. Test Cases to Propose Out Loud

State these before or right after coding — it signals you test at boundaries:

| # | Input | Expected | What it validates |
|---|---|---|---|
| 1 | Official Ex 1 (`k=1`) | 700 | Snapshot correctness (in-place gives 400) |
| 2 | Official Ex 2 (`k=1`) | 200 | Cheaper 2-leg route beats direct |
| 3 | Official Ex 3 (`k=0`) | 500 | **Off-by-one**: only direct flights allowed |
| 4 | Ex 1 with `k=2` | 400 | Larger budget unlocks the multi-hop route |
| 5 | Ex 1 with `k=0` | −1 | Unreachable within budget → `-1` |
| 6 | `n=2, flights=[], src=0, dst=1, k=1` | −1 | Empty edge list |
| 7 | §6.3 counterexample (`k=2`) | 101 | Kills plain Dijkstra / visited-once solutions |
| 8 | Chain `0→1→2→3` (costs 5 each), `k=2` / `k=1` | 15 / −1 | Route needing *exactly* `k+1` edges |
| 9 | `n=100`, dense, `k=99` | — | Performance sanity (~5·10⁵ ops, instant) |

Minimum out-loud set: **3, 5, 7**.

---

## 11. Transferable Patterns & Related Problems

**Patterns to name in the interview:**

- **Constrained shortest path via layering:** "shortest path with at most B edges/hops" → Bellman–Ford with a frozen snapshot per pass; the snapshot converts the edge-budget into passes. This is the headline pattern of this problem.
- **State augmentation:** when a plain shortest-path algorithm fails because of a resource (stops, fuel, keys, time), expand the state to `(node, resource)`. Dijkstra/BFS then runs on the expanded graph.
- **Rolling-array DP:** `dp[t][v]` over budget `t` collapses to two rows (previous + current) — the same trick as 0/1 knapsack's space optimization.
- **Budget-layered DP outside graphs:** LC 188 (Best Time to Buy/Sell Stock IV) layers over "transactions used" with the identical structure.

**Related problems:**

| Problem | Connection |
|---|---|
| LC 743 — Network Delay Time | Plain Dijkstra baseline; no budget, compare & contrast |
| LC 1334 — Find the City With the Smallest Number of Neighbors | Bellman–Ford per source with a distance threshold |
| LC 882 — Reachable Nodes in Subdivided Graph | Dijkstra + per-edge budget bookkeeping |
| LC 1514 — Path with Maximum Probability | Same algorithms, max-product "weights" |
| LC 1631 — Path With Minimum Effort | Minimax path: Dijkstra variant / binary search + BFS |
| LC 1976 — Number of Ways to Arrive at Destination | Dijkstra with path counting |
| LC 864 — Shortest Path to Get All Keys | State-augmented BFS (key bitmask in state) |
| LC 188 — Best Time to Buy and Sell Stock IV | Budget-layered DP, non-graph twin |

---

## 12. Say It in 60 Seconds

> "Flights are a weighted directed graph, and 'at most k stops' means at most k+1 edges — so this is shortest path with an edge budget. Plain Dijkstra fails here: the cheapest way to an intermediate city can burn extra stops and block the only valid route — on Example 1 it returns 400, the two-stop path. The clean fix is Bellman–Ford with a snapshot. Keep `dist` of best-known costs, `dist[src] = 0`. Repeat k+1 times: copy `dist` into `prev`, then relax every flight from the snapshot — if `prev[u]` is reachable and `prev[u]` plus the price improves `dist[v]`, update. The copy is the whole trick: each pass extends paths by exactly one edge, so after pass i, `dist[v]` is the cheapest cost within i edges. Answer is `dist[dst]`, or −1 if it's still infinity. Time O(k·E), space O(n) — about half a million operations at these constraints. A memoized DFS on `(node, edges left)` is the same DP top-down. I'd test k=0, unreachable → −1, and a case where the cheap path uses too many stops."
