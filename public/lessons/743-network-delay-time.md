# Network Delay Time (LeetCode 743) — Complete Interview Lesson

**TL;DR:** This is *single-source shortest path from `k`, then take the maximum distance*. Weights are non‑negative → Dijkstra with a min‑heap. Answer is `max(shortest distances)` if every node is reachable, else `-1`.

---

## 1. Problem Restatement (what's really being asked)

We have a **directed, weighted** graph with nodes labeled `1..n` and edges `u → v` with travel time `w`. A signal starts at node `k` and **propagates in parallel**: every node that receives the signal immediately relays it along its own outgoing edges. There is no single "token" being passed around.

So the time at which node `v` receives the signal is exactly the **shortest-path distance** `d(k, v)`. The whole network is informed when the *slowest* node is informed:

```
answer = max over all v of d(k, v)      (or -1 if some v is unreachable)
```

Two semantic clarifications worth saying out loud in an interview:
- **Parallel relay**, not sequential delivery — otherwise the problem becomes something like a traveling-salesman variant, which is not what's asked.
- **`-1` ⟺ ∃ node `v` with no path from `k`.** That's the only failure mode.

**Index vs. value precision:** node labels are 1‑based *values* used as *indices*. Convention: allocate arrays of size `n + 1` and ignore slot `0`. Each `times[i]` is a triple where **position matters**: `times[i][0] = source`, `times[i][1] = target`, `times[i][2] = weight`.

---

## 2. Constraint Decoding (reading the fine print)

| Constraint | What it tells you |
|---|---|
| `n ≤ 100`, `times.length ≤ 6000` | Tiny graph. Even `O(n³) = 10⁶` (Floyd–Warshall) would pass. But Dijkstra is the expected, transferable answer. |
| `0 ≤ w ≤ 100` | **Non-negative weights → Dijkstra is valid.** Zero-weight edges are allowed, so plain BFS (which assumes unit weights) is **not**. Max possible shortest path ≤ `99 edges × 100 = 9,900`, so no overflow concerns for 32‑bit ints in any language. |
| Edges are **directed** | Build only `u → v`. Example 3 exists specifically to punish people who add both directions. |
| Pairs `(u, v)` unique | No parallel edges, so no min-weight dedup needed. (Your code should still *work* if duplicates appeared — relaxation handles them naturally.) |
| `u ≠ v` | No self-loops. (A self-loop would be harmless anyway: `w ≥ 0` can never improve `dist[u]`.) |
| `times.length ≥ 1` | Inputs with `n = 1` can't actually occur, but your code shouldn't crash on one defensively. |

---

## 3. Brute Force and a Worked Trace

### 3.1 The truly naive idea (reject it out loud)

Enumerate **every simple path** from `k` to each node via DFS and keep the cheapest. This is super-polynomial — in a dense digraph every ordering of intermediate vertices is a distinct path, so the path count grows factorially — and `E` can be 6000. Reject immediately.

### 3.2 Practical baseline: Bellman–Ford

The honest polynomial baseline. No heap, no adjacency list — just relax every edge `n − 1` times.

```python
from math import inf

def networkDelayTime(times: list[list[int]], n: int, k: int) -> int:
    dist = [inf] * (n + 1)          # slot 0 unused (nodes are 1-based)
    dist[k] = 0
    for _ in range(n - 1):          # a shortest path uses at most n-1 edges
        changed = False
        for u, v, w in times:       # relax every edge, in input order
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        if not changed:             # converged early — safe to stop
            break
    return max(dist[1:]) if max(dist[1:]) < inf else -1
```

Why `n − 1` passes suffice: with non-negative weights, any shortest path is simple (a cycle on the path has non-negative total, so removing it never makes the path longer), and a simple path has at most `n − 1` edges.

### 3.3 Worked trace on Example 1

`times = [[2,1,1],[2,3,1],[3,4,1]]`, `n = 4`, `k = 2`. Edge order: `(2→1,1)`, `(2→3,1)`, `(3→4,1)`.

| Step | `dist[1]` | `dist[2]` | `dist[3]` | `dist[4]` |
|---|---|---|---|---|
| init | ∞ | **0** | ∞ | ∞ |
| relax `2→1` (w=1) | 0+1 = **1** | 0 | ∞ | ∞ |
| relax `2→3` (w=1) | 1 | 0 | 0+1 = **1** | ∞ |
| relax `3→4` (w=1) | 1 | 0 | 1 | 1+1 = **2** |
| pass 2 | no changes → stop | | | |

`max = 2` ✓. (Bellman–Ford runs in `O(V·E) = 100 · 6000 = 6·10⁵` ops here — passes easily — but Dijkstra is the tool interviewers want to see.)

---

## 4. The Core Insight

### 4.1 "Time for all nodes" = max of single-source shortest paths

The completion time is decided by the **last** node to receive the signal, and each node's arrival time is its shortest-path distance. So: run one SSSP from `k`, then take the **max** of the distance array.

### 4.2 Why Dijkstra — and why not the reflex answers

| Reflex | Why it fails |
|---|---|
| BFS | Assumes unit weights; here weights range 0–100. `[[1,3,10],[1,2,1],[2,3,1]]` has true answer `2`, which BFS-style hop counting gets wrong. |
| Greedy DFS (first path found) | First path ≠ shortest path in a weighted graph. |
| Prim / MST, then read tree distances | MST minimizes *total* weight, not per-node distances. Triangle with `1→2 (1)`, `2→3 (1)`, `1→3 (1.5)`: the MST path `k→3` costs 2, but the true shortest path is the direct edge at 1.5. |
| Floyd–Warshall | Correct but computes all pairs — overkill, and signals you didn't notice the single-source structure. |

Dijkstra applies because **all weights ≥ 0** (zero weights are fine — ties are just broken arbitrarily).

### 4.3 Why the greedy pop is safe (2-sentence proof sketch)

Induct on the settled set: every settled node's distance is provably minimal. When we pop the smallest entry `(d, u)` for an unsettled `u`, any alternative route to `u` must leave the settled set through some frontier edge, and since all weights are non-negative, that route's total is `≥` the frontier node's final distance `≥ d`. So `d` is final the moment `u` is freshly popped.

---

## 5. Optimal Approach: Heap Dijkstra with Lazy Deletion

### 5.1 Algorithm

1. Build a **directed** adjacency list: `adj[u] = [(v, w), ...]`.
2. `dist[k] = 0`; push `(0, k)` into a min-heap ordered by distance.
3. Pop `(d, u)`. **If `d > dist[u]`, it's a stale entry — skip.** Otherwise `u` is settled (its distance is final).
4. Relax every outgoing edge `(u, v, w)`: if `d + w < dist[v]`, update and push `(d + w, v)`.
5. Stop when all `n` nodes are settled → answer `= max(dist[1..n])`. If the heap drains first → **return −1**.

Because an edge is scanned only when its tail is settled, and each tail settles once, each edge triggers **at most one push** — so the heap holds at most `E + 1` entries (this is why lazy deletion stays `O(E log V)` even without a decrease-key operation).

### 5.2 Python implementation

```python
import heapq
from math import inf

class Solution:
    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:
        adj = [[] for _ in range(n + 1)]       # slot 0 unused: labels are 1-based
        for u, v, w in times:
            adj[u].append((v, w))              # DIRECTED: push only u -> v

        dist = [inf] * (n + 1)
        dist[k] = 0
        heap = [(0, k)]                        # (distance, node): dist first so the heap sorts on it
        settled = 0

        while heap:
            d, u = heapq.heappop(heap)
            if d > dist[u]:                    # stale entry — a shorter path already won
                continue
            settled += 1                       # dist[u] is now final
            if settled == n:                   # everyone reached; fresh pops are final,
                break                          # so nothing left to relax — safe to stop
            for v, w in adj[u]:
                nd = d + w
                if nd < dist[v]:
                    dist[v] = nd
                    heapq.heappush(heap, (nd, v))

        return max(dist[1:]) if settled == n else -1
```

### 5.3 Traces on the official examples

**Example 1** — `times=[[2,1,1],[2,3,1],[3,4,1]]`, `n=4`, `k=2`:

| # | Pop `(d, u)` | Stale? | Action | Heap after | `dist[1..4]` |
|---|---|---|---|---|---|
| 1 | `(0, 2)` | no | settle 2; relax → `dist[1]=1`, `dist[3]=1` | `(1,1),(1,3)` | `[1,0,1,∞]` |
| 2 | `(1, 1)` | no | settle 1 (no out-edges) | `(1,3)` | `[1,0,1,∞]` |
| 3 | `(1, 3)` | no | settle 3; relax → `dist[4]=2` | `(2,4)` | `[1,0,1,2]` |
| 4 | `(2, 4)` | no | settle 4; heap empty | — | `[1,0,1,2]` |

`settled = 4 = n` → answer `max(dist[1..4]) = 2` ✓

**Example 2** — `times=[[1,2,1]]`, `n=2`, `k=1`: pop `(0,1)` → `dist[2]=1`; pop `(1,2)` → settled = 2 → answer `1` ✓

**Example 3** — `times=[[1,2,1]]`, `n=2`, `k=2`: node 2 has **no outgoing edges** (directed!). Pop `(0,2)`, heap drains, `settled = 1 < 2` → **−1** ✓. (If you'd added the reverse edge `2→1`, you'd wrongly return `1`.)

### 5.4 Why stale entries happen (mini-trace)

`times=[[1,2,5],[1,3,1],[3,2,1]]`, `n=3`, `k=1`:

| # | Pop | Verdict | Effect |
|---|---|---|---|
| 1 | `(0, 1)` | fresh | push `(5,2)`, `(1,3)` |
| 2 | `(1, 3)` | fresh | relax `3→2`: `1+1=2 < 5` → `dist[2]=2`, push `(2,2)` |
| 3 | `(2, 2)` | fresh | settle 2 |
| 4 | `(5, 2)` | **stale** (`5 > dist[2]=2`) | skip |

Node 2 was pushed twice; only the cheap pop is real. Answer: `2` ✓.

### 5.5 Variant worth naming: O(n²) scan Dijkstra

With `n ≤ 100`, a Dijkstra that finds the unsettled minimum by **linear scan** (`O(V² + E)` — `V` scans over `V` candidates plus `E` relaxations) is perfectly respectable, has no heap, no lazy deletion, and is the easiest to write bug-free. Mention it as your fallback if you fumble heap details.

---

## 6. Complexity Table

| Approach | Time | Space | Verdict at `n ≤ 100`, `E ≤ 6000` |
|---|---|---|---|
| DFS over all simple paths | ≈ factorial (every ordering of intermediate vertices is a distinct path in a dense digraph) | `O(V + E)` | Reject |
| Bellman–Ford | `O(V·E) = 6·10⁵` (`≤ n−1` passes × `E` edges; shortest paths have ≤ `n−1` edges with `w ≥ 0`) | `O(V)` | Passes; no heap needed |
| Dijkstra, linear-scan min | `O(V² + E) ≈ 1.6·10⁴` (`V` min-scans + `E` relaxations) | `O(V + E)` | Simplest correct variant |
| **Dijkstra, binary heap (main)** | `O(E log V) ≈ 4.2·10⁴` (each edge pushes ≤ once because an edge is scanned only when its tail settles; heap size ≤ `E`) | `O(V + E)` | **The interview default** |
| Floyd–Warshall | `O(V³) = 10⁶` (triple nested loop) | `O(V²)` | Overkill; only if you needed all pairs |

---

## 7. Common Mistakes

| # | Mistake | How it bites |
|---|---|---|
| 1 | **Adding reverse edges** (undirected habit) | Example 3 returns `1` instead of `−1`. The test exists precisely for this. |
| 2 | **Marking visited at push time** (BFS muscle memory) | Wrong answers. Failing input: `[[1,2,10],[1,3,1],[3,2,1],[2,4,1]]`, `k=1` → node 2 gets "visited" when pushed with distance 10; the better distance-2 pop is skipped; node 4 is never relaxed → you output `−1` instead of the correct `3`. |
| 3 | **Wrong aggregate** — returning `dist[k]` (always 0), the pop count, or the last popped distance | The answer is `max(dist[1..n])`. |
| 4 | **Forgetting slot 0** | `max(dist)` on a size-`(n+1)` array reads the unused slot 0 (still `inf`) → *always returns −1*. Use `dist[1:]` or loop `1..n`. |
| 5 | **Arrays sized `n`** | `IndexError` when node `n` appears — labels are 1-based values used as indices. |
| 6 | **Stale-check sign flip or omission** (`d < dist[u]`, or no check) | With the `nd < dist[v]` guard, omitting the check is only a slowdown — but candidates often pair it with a visited set, and then it breaks correctness. Write `if d > dist[u]: continue` exactly. |
| 7 | **Early exit at the wrong moment** | You need *all* nodes, so you may only stop when `settled == n` (or heap empty). |
| 8 | **Ignoring zero weights** | Zero-weight edges are legal; Dijkstra handles them, BFS-converted code doesn't. |
| 9 | **Heap entries that can't be compared** | In Python, `(d, node)` is fine (both ints); `(d, [path])` raises `TypeError` on distance ties. Keep heap entries minimal. |

**Robustness note:** the constraints guarantee unique `(u, v)` pairs and no self-loops, but this code needs no special handling even if they appeared — relaxation just tries every edge and self-loops can't improve anything.

---

## 8. Java & C++ Gotchas

| Language | Gotcha | Note |
|---|---|---|
| Java | `PriorityQueue` has **no decrease-key** | Lazy deletion is mandatory; heap may hold `O(E)` entries (~6000 — fine). |
| Java | Comparator: prefer `Integer.compare(a[0], b[0])` over `a[0] - b[0]` | Subtraction overflows for opposite-sign extremes — impossible with these constraints (`d ≤ 9,900`), but it's the safe habit. |
| Java | `Integer.MAX_VALUE` sentinel + `+ w` overflows | Guard with `if (dist[u] != INF)` or use a sentinel like `1_000_000_000` (real distances ≤ 9,900). |
| C++ | `priority_queue` is a **max-heap** by default | Must pass `greater<pair<int,int>>` (pair ordered by `.first` = distance — conveniently what you want). |
| C++ | `INT_MAX + 100` is UB | Use the classic sentinel `0x3f3f3f3f ≈ 1.06·10⁹` — adding `w ≤ 100` still stays below `2³¹ − 1`. |
| C++ | Copy before pop with structured bindings | `auto [d, u] = pq.top(); pq.pop();` — binding a reference to `.top()` then popping reads freed data if you write `auto&`. |

Minimal C++ shape for reference:

```cpp
priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq; // min-heap by dist
// ...
auto [d, u] = pq.top(); pq.pop();
if (d > dist[u]) continue;          // stale
for (auto [v, w] : adj[u])
    if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
```

---

## 9. Test Cases to Propose Out Loud

State these *before or right after* coding — it's a cheap signal of seniority.

| # | Input | Expected | What it catches |
|---|---|---|---|
| 1 | `times=[[2,1,1],[2,3,1],[3,4,1]], n=4, k=2` | `2` | Official; chain propagation, max-of-dists |
| 2 | `times=[[1,2,1]], n=2, k=1` | `1` | Official; single edge |
| 3 | `times=[[1,2,1]], n=2, k=2` | `−1` | Official; **directedness** / reachability |
| 4 | `times=[[1,2,5],[1,3,1],[3,2,1]], n=3, k=1` | `2` | **Stale-entry logic** — a later, cheaper path must win |
| 5 | `times=[[1,2,0],[2,3,5]], n=3, k=1` | `5` | **Zero-weight edges** are legal |
| 6 | `times=[[1,2,100],[2,3,100]], n=3, k=1` | `200` | Answer is a **sum along paths**, not a single max edge |
| 7 | `times=[[2,1,1]], n=2, k=1` | `−1` | Source with no outgoing edges |
| 8 | `n=1, k=1` (no valid edges exist) | `0` | Degenerate; code must not crash (outside stated `times.length ≥ 1`, defensively) |
| 9 | `times=[[1,2,5],[2,1,5],[2,3,1]], n=3, k=1` | `6` | **Cycles** don't loop forever |

Before declaring done, re-run Example 1 by hand through your actual code — it's 30 seconds and catches the directedness and `dist[1:]` bugs instantly.

---

## 10. Transferable Patterns & Related Problems

**Recognition trigger:** *"one source spreads to everyone, minimize when the LAST one arrives"* → SSSP + max. General weight-regime picker:

| Edge weights | Right tool |
|---|---|
| All equal (unit) | BFS |
| Only 0 or 1 | 0‑1 BFS (deque) |
| Non-negative (incl. 0) | **Dijkstra** ← this problem |
| Negative edges, or "at most k edges/hops" | Bellman–Ford / DP over hops |
| All-pairs needed, small `n` | Floyd–Warshall |

**Reusable Dijkstra variations:** multi-source (push all sources at distance 0), minimax (carry "max edge so far" instead of sum — *Path With Minimum Effort*), path counting (carry a `ways[]` array), products/probabilities (max-heap, multiply).

| Related problem | Twist on this skeleton |
|---|---|
| LC 787 — Cheapest Flights Within K Stops | SSSP with a **hop limit** → Bellman–Ford |
| LC 1631 — Path With Minimum Effort | Dijkstra where the accumulator is **max edge**, not sum |
| LC 1976 — Number of Ways to Arrive at Destination | Dijkstra + counting equal-shortest paths |
| LC 1334 — Find the City With Smallest Threshold | All-pairs on small `n` → Floyd–Warshall |
| LC 1514 — Path with Maximum Probability | Dijkstra with **products** and a max-heap |
| LC 882 — Reachable Nodes In Subdivided Graph | Dijkstra + budget accounting on subdivided edges |
| LC 1376 — Time Needed to Inform All Employees | Tree special case: just max weighted depth via DFS |

---

## 11. Full Interview Talk Track (the script the 60-second version distills)

> **Clarify:** "Edges are directed, correct? Weights are non-negative — zero allowed? And if some node is unreachable we return −1, as stated? Nodes are 1-indexed."
>
> **Restate:** "A signal floods out from `k` in parallel, so each node's arrival time is its shortest-path distance from `k`. The network is done when the *slowest* node is done — so the answer is the maximum shortest-path distance, or −1 if anyone is unreachable."
>
> **Naive, briefly:** "Enumerating all paths is factorial, so no. Bellman–Ford works at `O(V·E)` ≈ 6·10⁵ here, but weights are non-negative, so the right tool is Dijkstra."
>
> **Algorithm:** "Build a directed adjacency list — directed matters, the third example tests it. Min-heap Dijkstra with lazy deletion: pop the smallest `(dist, node)`, skip if it's stale — `d > dist[node]` — otherwise settle it and relax its edges. Each edge causes at most one push, so this is `O(E log V)`, `O(V + E)` space. With `n ≤ 100`, `E ≤ 6000`, that's ~4·10⁴ operations."
>
> **Termination & answer:** "I need *all* nodes, so I stop when `settled == n` and return `max(dist[1..n])`; if the heap drains first, someone's unreachable → −1."
>
> **Tests:** "Official three, plus: a later cheaper path beating an earlier one — that stresses stale deletion — a zero-weight edge, a source with no outgoing edges, and a cycle."
>
> **Code, then:** walk Example 1 through the actual code, note the `dist[1:]` slice avoids reading the dummy slot 0, and finish.

---

## 12. Say It in 60 Seconds

> "This is single-source shortest path. The signal relays in parallel, so each node's arrival time is its shortest distance from `k`, and the answer is the **max** of those distances — the network finishes when the slowest node gets the signal. Weights are non-negative — zero is allowed — so Dijkstra applies: directed adjacency list, min-heap seeded with `(0, k)`, lazy deletion — push improved distances, skip stale pops where the popped distance exceeds the recorded one. Each edge pushes at most once, so it's `O(E log V)` time, `O(V + E)` space — trivial at these constraints. When all `n` nodes settle, return the max distance; if the heap empties first, someone's unreachable, return −1. Two traps to call out: don't add reverse edges — it's directed, and Example 3 tests exactly that — and don't return the last popped value or `dist[k]`; it's the max over all nodes."

*~55 seconds spoken at a calm pace. Lead with the framing (SSSP + max), name the algorithm and complexity, close with the two traps.*
