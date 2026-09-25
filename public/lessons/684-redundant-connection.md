# Redundant Connection — Complete DSA Lesson

## 1. Problem Restatement (in your own words)

We're handed an undirected graph on nodes `1..n`. It started life as a **tree** (`n − 1` edges, connected, acyclic), and then **exactly one extra edge** was added — so the input has exactly `n` edges and is **connected**. We must return one edge whose removal restores it to a tree. If several edges qualify, return the one that **appears last in the input array**.

Key framing to say out loud in an interview: *"This is a connected graph with n nodes and n edges — that's a unicyclic graph, exactly one cycle. My job is to find an edge on that cycle, specifically the last one in input order."*

**Why exactly one cycle?** For a connected graph, the number of independent cycles (the *cyclomatic number*) is `m − n + 1`. Here `m = n`, so it equals `1`. The graph consists of a single cycle with trees hanging off it. Removing *any* edge on that cycle yields a tree; removing an edge *not* on the cycle disconnects the graph.

So the problem reduces precisely to: **find the edge on the unique cycle with the largest input index.**

---

## 2. Constraint Decoding

| Constraint | What it tells us | Design consequence |
|---|---|---|
| `n == edges.length`, `3 <= n <= 1000` | Exactly one extra edge; graph is small | Even an O(n²) brute force (~10⁶ ops) passes. Union-Find is "nice," not strictly required. |
| `1 <= a_i < b_i <= n` | Nodes are 1-indexed; each edge is stored with the smaller endpoint first | Allocate `parent` of size `n + 1`; ignore index 0. **Return the edge exactly as given** — don't reorder endpoints. |
| No repeated edges, `a_i != b_i` | No self-loops, no parallel edges | We don't need multigraph handling in Union-Find. |
| Graph is connected, started as a tree + 1 edge | Unicyclic: **exactly one cycle** | There is always an answer; no need to handle "no redundant edge." |

Edge cases the constraints silently rule out (so you don't over-engineer): self-loops, duplicate edges, disconnected input, `n = 2`.

---

## 3. The Core Insight

Two equivalent characterizations of the answer:

1. **An edge is removable iff its two endpoints are already connected without that edge** — i.e., the edge lies on a cycle. (If the endpoints are connected around the other way, deleting the edge breaks the cycle but keeps the graph connected.)
2. **Process edges in input order with Union-Find. The first edge whose endpoints are already in the same component is the answer.**

**Why does #2 give the *last* valid answer, not just *an* answer?** (This is the subtle part interviewers probe.) Let `e_k` be the first edge that closes a cycle. Every edge before `e_k` joined two different components, so edges `0..k−1` form a forest — they contain no cycle. The cycle that `e_k` completes uses only earlier edges. Since the whole graph has exactly **one** cycle, that must be *the* cycle `C`, so every other edge of `C` has index `< k`. Any edge of `C` with index `> k` would also have found its endpoints already connected and triggered an even earlier "first cycle" — contradiction. Therefore `e_k` is the **maximum-index edge on the unique cycle**, which is exactly what the problem asks for. ✅

---

## 4. Brute Force (and a worked trace)

**Idea:** For each edge `i` (scanning from the **last** to the first, since we want the last valid answer), temporarily delete it and check whether the remaining graph is still connected with `n − 1` edges (which for this input automatically means acyclic — a connected graph with `n − 1` edges on `n` nodes is a tree). If yes, `edges[i]` is our answer.

```python
from collections import defaultdict

def findRedundantConnection(edges):
    n = len(edges)

    def still_connected_without(skip):
        adj = defaultdict(list)
        for i, (a, b) in enumerate(edges):
            if i != skip:
                adj[a].append(b)
                adj[b].append(a)
        seen = {1}
        stack = [1]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
        return len(seen) == n   # all n nodes reachable?

    for i in range(n - 1, -1, -1):          # last candidate first
        if still_connected_without(i):
            return edges[i]
    return []  # unreachable given guarantees
```

**Worked trace on `edges = [[1,2],[1,3],[2,3]]`:**

| `skip` | Edge removed | Remaining edges | BFS from 1 reaches | Tree? | Return? |
|---|---|---|---|---|---|
| 2 | `[2,3]` | `[1,2],[1,3]` | {1,2,3} = all 3 | ✅ | **return [2,3]** |

Done on the first try — and it matches the expected output. Note the scan direction does the "last in input" work for free.

**Complexity:** each connectivity check is O(n) (n nodes, n−1 edges), and we do up to n checks → **O(n²) time, O(n) space**. Fine for n ≤ 1000.

---

## 5. Optimal Approach: Union-Find (Disjoint Set Union)

### The algorithm

1. Initialize `parent[i] = i` for nodes `1..n`, plus a `rank` (or size) array.
2. For each edge `[a, b]` **in input order**:
   - `find` the roots of `a` and `b` (with path compression).
   - If the roots are equal → this edge closes a cycle → **return it immediately**.
   - Otherwise, union the components (by rank/size).
3. The loop always returns because the input is guaranteed unicyclic.

### Code

```python
from typing import List

class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        n = len(edges)
        parent = list(range(n + 1))       # index 0 unused; nodes are 1..n
        rank = [0] * (n + 1)

        def find(x: int) -> int:
            # iterative find: two passes (find root, then compress)
            root = x
            while parent[root] != root:
                root = parent[root]
            while parent[x] != root:      # path compression
                parent[x], x = root, parent[x]
            return root

        def union(x: int, y: int) -> bool:
            rx, ry = find(x), find(y)
            if rx == ry:
                return False              # already connected -> cycle edge
            if rank[rx] < rank[ry]:       # union by rank: attach shorter to taller
                rx, ry = ry, rx
            parent[ry] = rx
            if rank[rx] == rank[ry]:
                rank[rx] += 1
            return True

        for a, b in edges:
            if not union(a, b):
                return [a, b]
        return []  # unreachable per problem guarantees
```

### Trace — Example 1: `edges = [[1,2],[1,3],[2,3]]`

| Edge | `find(a)` | `find(b)` | Same root? | Action | Components after |
|---|---|---|---|---|---|
| `[1,2]` | 1 | 2 | No | union → parent[2]=1 | {1,2} |
| `[1,3]` | 1 | 3 | No | union → parent[3]=1 | {1,2,3} |
| `[2,3]` | 1 | 1 | **Yes** | **return [2,3]** ✅ | — |

### Trace — Example 2: `edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]`

| Edge | `find(a)` | `find(b)` | Same root? | Action | Components after |
|---|---|---|---|---|---|
| `[1,2]` | 1 | 2 | No | union → parent[2]=1 | {1,2} |
| `[2,3]` | 2→1 | 3 | No | union → parent[3]=1 | {1,2,3} |
| `[3,4]` | 3→1 | 4 | No | union → parent[4]=1 | {1,2,3,4} |
| `[1,4]` | 1 | 4→1 | **Yes** | **return [1,4]** ✅ | — |
| `[1,5]` | *(never reached)* | | | | |

Note how node 5 is never even touched — the answer is found before processing the last edge. Also note `find(2) = 1`, `find(3) = 1`, `find(4) = 1` via the compression chain: the first pass walks to the root, the second re-points every node on the path directly at it.

---

## 6. Alternative Optimal Approaches (worth mentioning, one line each)

- **Degree peeling (topological-style):** Repeatedly remove nodes of degree 1 (with their edges). What survives is exactly the unique cycle. Then scan the input and return the first edge with *both* endpoints still on the cycle. O(n) time, O(n) space — great to name-drop as "cycle detection by leaf pruning."
- **DFS cycle detection:** Build adjacency, DFS to find the cycle's edge set, return the last-in-input edge on it. Correct but fiddlier to implement than Union-Find; usually not worth it in an interview when DSU is available.

Any comparison-based method needs Ω(n) time just to read all n edges, so O(n α(n)) is effectively optimal for this input model (α is the inverse Ackermann function, which grows so slowly it's below 5 for any practical input).

---

## 7. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (delete edge + BFS), per edge | O(n²) total | O(n) | Simple, passes n ≤ 1000 |
| Union-Find + path compression + union by rank | O(n · α(n)) ≈ O(n) | O(n) | **Recommended** |
| Degree peeling | O(n) | O(n) | Elegant alternative |
| DFS cycle detection | O(n) | O(n) | More error-prone to code |

---

## 8. Common Mistakes & Implementation Gotchas

| Mistake | Why it bites | Fix |
|---|---|---|
| **0-indexed vs 1-indexed nodes** | `parent = [0]*n` silently breaks: node `n` has no slot | `parent = list(range(n + 1))`; index 0 is a harmless unused slot |
| **Sorting the edge before returning** | Problem says return the edge *as it appears in input*; even though `a_i < b_i` is guaranteed, re-shuffling or returning a *copy you mutated* invites bugs | Return `[a, b]` straight from the loop |
| **Scanning candidates first-to-last in brute force** | "Last in input" requirement — if you scan forward and return the first removable edge, Example 1 still works but you'd return `[1,3]` in a case like `[[2,3],[1,3],[1,2]]` where `[1,2]` is the correct answer | Scan backward, or rely on the Union-Find "first cycle edge = last answer" theorem |
| **Recursive `find` in Python** | With n = 1000 and no compression yet, recursion depth can approach n; Python's default limit is 1000 | Use the iterative two-pass find shown above (or `sys.setrecursionlimit`) |
| **Skipping union by rank/size** | Without it, a path-graph input degenerates `find` to O(n) per call → O(n²) overall | Union by rank + path compression; cheap insurance |
| **Java: putting `int[]` into a `HashSet`** | Arrays use reference identity for `equals`/`hashCode` — duplicates and lookups silently fail | Use `Map<Integer, Integer>` for `parent` (or an `int[]` array since nodes are 1..n), never a `Set<int[]>` |
| **Java: `Integer` autoboxing in `HashMap<Integer, Integer>`** | Works, but allocates per operation; also `==` on boxed `Integer` compares references for values > 127 — always use `.equals()` if you compare keys | Prefer `int[] parent = new int[n + 1]` here; boxing is unnecessary |
| **C++: returning `vector<int>{a, b}` vs a reference into `edges`** | Returning `edges[i]` by value is fine; returning a dangling reference/pointer to a local is not | Return by value: `return {a, b};` |
| **C++: `parent` as `map<int,int>`** | Log-factor overhead for no benefit — nodes are a dense 1..n range | Use `vector<int> parent(n + 1); iota(parent.begin(), parent.end(), 0);` |

---

## 9. Test Cases to Propose Out Loud

State these before/while coding — it signals thoroughness:

1. **Official Example 1:** `[[1,2],[1,3],[2,3]]` → `[2,3]`. Smallest cycle (triangle); the redundant edge is the *last* edge.
2. **Official Example 2:** `[[1,2],[2,3],[3,4],[1,4],[1,5]]` → `[1,4]`. Cycle is 1-2-3-4; the pendant edge `[1,5]` is *after* the answer in input order — checks you don't get distracted by later edges.
3. **Redundant edge in the middle:** `[[1,2],[1,3],[2,3],[3,4],[4,5]]` → `[2,3]`. The cycle closes at index 2, but two more edges follow. Verifies you return immediately upon the first cycle-closing edge, and that later edges don't override it.
4. **Minimum size:** `[[1,2],[2,3],[1,3]]` → `[1,3]`. n = 3, the smallest allowed input.
5. **Reversed input of case 3:** `[[3,4],[4,5],[1,2],[1,3],[2,3]]` → `[2,3]`. Same graph, different ordering — confirms "last in input" is about *input order*, not node labels. (Good sanity check that your Union-Find order-sensitivity is correct, not accidental.)

---

## 10. Transferable Patterns & Related Problems

- **Pattern: "n nodes, n edges, connected" ⇒ exactly one cycle.** Recognize unicyclic graphs on sight. Variants ask for the *set* of cycle edges, the cycle as a list, or the node "furthest from the cycle."
- **Pattern: Union-Find as an *incremental* cycle detector.** Any problem of the form "add edges one by one; when does the graph stop being a forest / when do two nodes become connected" is a DSU problem. Also covers "first time the graph becomes connected" (count components while unioning).
- **Pattern: delete-one-element feasibility checks.** "Remove one edge/node to satisfy property P" → brute force is n trials × O(P-check); look for an incremental structure (DSU, degree counting) to collapse it.
- **Related problems:**
  - LeetCode 684 — Redundant Connection (this problem)
  - LeetCode 685 — Redundant Connection II (the *directed* version — much harder; DSU alone isn't enough, you must case-split on in-degree-2 nodes)
  - LeetCode 261 — Graph Valid Tree (the inverse: verify n − 1 edges form a tree)
  - LeetCode 323 / 547 — Number of Connected Components / Friend Circles (pure DSU component counting)
  - LeetCode 721 — Accounts Merge (DSU with non-integer keys mapped to ids)
  - LeetCode 310 — Minimum Height Trees (the degree-peeling technique)

---

## 11. Say It in 60 Seconds

> "The graph has n nodes and n edges and is connected — that means it's a tree plus exactly one extra edge, so it contains exactly one cycle, and the answer is the edge on that cycle that appears last in the input.
>
> My approach is Union-Find. I process edges in input order; each edge either merges two different components or, if both endpoints are already in the same component, it's the edge that closes the cycle — and I return it right away.
>
> That first cycle-closing edge is guaranteed to be the *last* valid answer: every edge before it forms a forest, and since there's only one cycle total, every other edge of that cycle comes earlier in the input.
>
> With path compression and union by rank this is essentially O(n) time and space — inverse Ackermann per operation. The brute force would be, for each edge, delete it and BFS for connectivity — O(n²), which actually passes at n ≤ 1000, but Union-Find is cleaner and faster.
>
> Gotchas I'm watching: nodes are 1-indexed so my parent array is size n+1, and I return the edge exactly as given, without reordering."
