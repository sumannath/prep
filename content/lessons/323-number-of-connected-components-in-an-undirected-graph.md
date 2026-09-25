# Number of Connected Components in an Undirected Graph — Complete Interview Lesson

## 1. Restated Problem (say this back to the interviewer)

> We have `n` nodes labeled `0` to `n-1` and a list of undirected edges. A **connected component** is a maximal set of nodes where every node is reachable from every other node by walking along edges. We must return how many such components exist in the graph.

Key clarifying points you should state out loud:

- Nodes are **labeled 0..n-1**, so we can use arrays indexed by node — no hashing needed.
- Edges are **undirected**: `[a, b]` means connectivity both ways.
- Per constraints: no duplicate edges, `a != b` (no self-loops), `0 <= ai <= bi < n`. Even so, I'll write code that doesn't *depend* on those niceties.
- **Isolated nodes** (no edges at all) each count as their own component of size 1.

---

## 2. Decoding the Constraints

| Constraint | Meaning for us |
|---|---|
| `1 <= n <= 2000` | Small; even an O(n²) brute force (~4M ops) is fine. But we should present the linear solution anyway. |
| `1 <= edges.length <= 5000` | `m ≤ 5000`. Note `edges.length` is at least 1, but `n` can still make nodes isolated (e.g., `n=5`, one edge → at least 3 components). |
| No repeated edges, no self-loops | Simplifies union-find bookkeeping; still safe to handle defensively. |

**Big takeaway:** with `n ≤ 2000` and `m ≤ 5000`, anything from O(n + m) to O(n²) passes. The interviewer is testing whether you know the *canonical* techniques: **graph traversal (DFS/BFS)** and **Union-Find**.

Worst case for recursion: a path graph `0-1-2-...-1999` creates a DFS depth of ~2000. Python's default recursion limit is 1000 — this matters (see Common Mistakes).

---

## 3. Brute Force and a Worked Trace

### Brute force idea: pairwise reachability

For each node, compute the set of nodes reachable from it (one full BFS/DFS per node). Group nodes by identical reachability sets; the number of distinct "reachability classes" is the number of components.

```python
def countComponents_bruteforce(n, edges):
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)

    def reachable(src):
        seen = {src}
        stack = [src]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
        return frozenset(seen)

    classes = set()
    for node in range(n):
        classes.add(reachable(node))
    return len(classes)
```

**Complexity:** O(n · (n + m)) time — we run a full traversal from every node — and O(n) extra per traversal.

### Worked trace on Example 1: `n = 5, edges = [[0,1],[1,2],[3,4]]`

Adjacency: `0:[1]  1:[0,2]  2:[1]  3:[4]  4:[3]`

| Node | `reachable(node)` | Class |
|---|---|---|
| 0 | {0, 1, 2} | A |
| 1 | {0, 1, 2} | A |
| 2 | {0, 1, 2} | A |
| 3 | {3, 4} | B |
| 4 | {3, 4} | B |

Two distinct classes → answer **2**. ✔

This is correct but wasteful: it re-discovers the same component n times. **The observation that fixes it:** one single traversal from any unvisited node visits its *entire* component. So instead of traversing per node, traverse **per component**.

---

## 4. The Core Insight

Two equivalent ways to say it — pick whichever feels natural and say it in the interview:

1. **Flood-fill view:** Sweep nodes `0..n-1`. Every time you hit a node you haven't seen yet, you've just discovered a **new component** — start a DFS/BFS there and mark everything reachable. The number of times you start a traversal = the number of components.

2. **Union-Find view:** Start with `n` components (every node alone). Each edge `[a, b]` merges the components containing `a` and `b`. A merge only reduces the count **if `a` and `b` currently have different roots**. Count successful merges and subtract: `answer = n − (successful unions)`.

Both are O(n + m) time. Union-Find also gracefully handles a **streaming / incremental** version of the problem (edges arriving one at a time), which is worth mentioning as a differentiator.

---

## 5. Optimal Approach 1 — DFS / BFS Flood Fill

```python
def countComponents(n, edges):
    # Build adjacency list. Undirected: add both directions.
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)

    visited = [False] * n
    count = 0

    for start in range(n):
        if visited[start]:
            continue
        count += 1                      # new component discovered
        stack = [start]                 # iterative DFS (avoids recursion limit)
        visited[start] = True
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if not visited[v]:
                    visited[v] = True   # mark on push, not on pop
                    stack.append(v)
    return count
```

> **Gotcha:** mark `visited[v] = True` when *pushing*, not when popping. Marking on pop can push the same node multiple times before it's processed (harmless for correctness here since we check on pop too, but it bloats the stack to O(m) and is a classic interview ding). In BFS, marking on enqueue is mandatory to avoid duplicate enqueues.

### Trace: Example 1 — `n = 5, edges = [[0,1],[1,2],[3,4]]`

Adjacency: `0:[1]  1:[0,2]  2:[1]  3:[4]  4:[3]`

| Step | Action | `visited` | count |
|---|---|---|---|
| start=0, unvisited | new component; push 0 | {0} | 1 |
| pop 0 | push neighbor 1 | {0,1} | 1 |
| pop 1 | push neighbor 2 | {0,1,2} | 1 |
| pop 2 | neighbors [1] visited | {0,1,2} | 1 |
| start=1, 2 | already visited | {0,1,2} | 1 |
| start=3, unvisited | new component; push 3 | {0,1,2,3} | 2 |
| pop 3 | push 4 | {0,1,2,3,4} | 2 |
| pop 4 | neighbors [3] visited | all | 2 |
| start=4 | visited → done | all | **2** ✔ |

### Trace: Example 2 — `n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]`

One traversal from node 0 reaches 1 → 2 → 3 → 4 (a chain). All nodes visited in the first component; `start = 1..4` are all skipped. **Answer: 1.** ✔

---

## 6. Optimal Approach 2 — Union-Find (Disjoint Set Union)

```python
def countComponents(n, edges):
    parent = list(range(n))   # parent[i] = i initially: n singleton components
    size = [1] * n            # union by size
    count = n                 # every node starts as its own component

    def find(x):
        # Path compression: iterative two-pass, no recursion-depth risk
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:
            parent[x], x = root, parent[x]
        return root

    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            continue          # same component already — no count change
        # union by size: attach smaller tree under larger
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        size[ra] += size[rb]
        count -= 1            # a successful merge reduces components by 1

    return count
```

### Trace: Example 1 — `n = 5, edges = [[0,1],[1,2],[3,4]]`

| Edge | find(a), find(b) | Same root? | Action | count |
|---|---|---|---|---|
| [0,1] | 0, 1 | no | union → count−1 | 4 |
| [1,2] | 0, 2 | no | union → count−1 | 3 |
| [3,4] | 3, 4 | no | union → count−1 | **2** ✔ |

### Trace: Example 2 — `n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]`

| Edge | Same root? | count |
|---|---|---|
| [0,1] | no | 4 |
| [1,2] | no | 3 |
| [2,3] | no | 2 |
| [3,4] | no | **1** ✔ |

Note the amortized complexity claim: with **path compression + union by size/rank**, `find` and `union` run in O(α(n)) amortized time, where α is the inverse Ackermann function — effectively constant for any realistic n (α(n) ≤ 4 for n up to roughly 10^600; the bound comes from Tarjan's analysis of union-find with these two heuristics).

---

## 7. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Pairwise reachability (brute force) | O(n · (n + m)) | O(n) per traversal | ~14M ops worst case here — passes, but inelegant |
| DFS / BFS flood fill | O(n + m) | O(n + m) — adjacency list + visited + stack/queue | Recommended default in interviews |
| Union-Find (path compression + union by size) | O(n + m · α(n)) ≈ O(n + m) | O(n) — no adjacency list needed | Best for streaming/incremental edge arrivals |

Why traversal is Ω(n + m) and that's optimal: you must at least read every edge and consider every node once to determine connectivity, so any correct algorithm is Ω(n + m) in the edge-list model — our solution matches this lower bound.

---

## 8. Common Mistakes (and how to dodge each)

| # | Mistake | Why it bites | Fix |
|---|---|---|---|
| 1 | **Forgetting isolated nodes** | Sweep `for start in range(n)`, not over edge endpoints only. With `n=5, edges=[[0,1]]`, answer is 4, not 1. | Always loop over *all* n nodes. |
| 2 | **Only adding one direction of the edge** | `adj[a].append(b)` without `adj[b].append(a)` silently breaks undirected reachability. | Add both directions; state it out loud. |
| 3 | **Recursive DFS in Python** | A path graph with n = 2000 exceeds Python's default recursion limit (1000) → `RecursionError`. | Use iterative DFS/BFS, or `sys.setrecursionlimit(...)` (mention, don't rely on). |
| 4 | **Union-Find: decrementing count on every edge** | `count -= 1` must happen **only when roots differ**. Decrementing unconditionally gives wrong answers on redundant edges. | `if ra == rb: continue` before merging. |
| 5 | **Marking visited on pop instead of push** | Stack/queue can blow up to O(m) entries; in BFS, duplicates break level logic. | Mark when enqueueing/pushing. |
| 6 | **Assuming edges imply all nodes exist** | `edges.length ≥ 1` but nodes beyond edge endpoints still count as components. | Same fix as #1. |
| 7 | **Rebuilding adjacency per component** or using a dict-of-sets unnecessarily | Wasted time; dict overhead. | One flat list of lists, indexed by node. |

### Java / C++ implementation notes

| Language | Gotcha |
|---|---|
| **Java** | Recursive DFS on a 2000-node path is usually fine (default JVM stack ~512KB–1MB), but it's still better practice to use an explicit `ArrayDeque`/`Deque<Integer>` stack. Avoid `HashMap<Integer, List<Integer>>` for adjacency when nodes are `0..n-1` — an array of `List<Integer>` is faster and cleaner. Watch autoboxing if you use `HashSet<Integer>` for visited; a `boolean[]` is cheaper. |
| **C++** | Deep recursion (~2000 levels) is fine by default, but on tight-stack environments use iterative DFS. Prefer `vector<vector<int>> adj(n)` and `vector<bool> visited(n)`; `adj[a].push_back(b); adj[b].push_back(a);` — forgetting the reverse pushback is the same classic bug. Union-Find with plain arrays (`vector<int>`) beats `unordered_map` here since node IDs are dense integers. |

---

## 9. Test Cases to Propose Out Loud

State these **before or immediately after coding** — it signals rigor:

| Test | Input | Expected | What it checks |
|---|---|---|---|
| Example 1 | `n=5, edges=[[0,1],[1,2],[3,4]]` | 2 | Two separate blobs + traversal correctness |
| Example 2 | `n=5, edges=[[0,1],[1,2],[2,3],[3,4]]` | 1 | Chain — one component, also max recursion-depth stress for DFS |
| Isolated nodes | `n=5, edges=[[0,1]]` | 4 | Nodes 2, 3, 4 are singletons — counts must include them |
| No "useful" edges / redundant edges | `n=3, edges=[[0,1],[1,0]]` — *or*, respecting constraints, `n=4, edges=[[0,1],[1,2],[0,2]]` | 2 | Triangle: union-find must not double-decrement on the `[0,2]` edge (same root) |
| Minimal input | `n=1, edges=[]` | 1 | Single node, no edges — one component (note: constraints say `edges.length ≥ 1`, but `n=1` with the smallest legal edge list, e.g. `n=2, edges=[[0,1]]` → 1, is worth confirming) |
| Large chain | `n=2000`, edges forming a path 0–1–…–1999 | 1 | Recursion-depth stress test; verifies iterative implementation |

---

## 10. Transferable Patterns & Related Problems

**Pattern 1 — Flood fill / count-the-regions:** sweep all cells/nodes; each unvisited entity triggers one traversal; count triggers. Directly reused in grid problems.

**Pattern 2 — Union-Find for connectivity / grouping:** anything where items merge into equivalence classes, especially with **incremental/streaming** input where DFS would need a full re-traversal per update.

Related problems to drill:

| Problem | Connection |
|---|---|
| Number of Islands (LC 200) | Identical flood-fill pattern on a 2D grid |
| Graph Valid Tree (LC 261) | Components == 1 **and** edges == n − 1 (acyclic check) |
| Redundant Connection (LC 684) | Union-Find: the first edge whose endpoints share a root is the answer |
| Accounts Merge (LC 721) | Union-Find over emails; then group by root |
| Smallest String With Swaps (LC 1202) | Components of indices; sort within each component |
| Most Stones Removed (LC 947) | Stones connected by row/column → answer = n − #components |
| Longest Consecutive Sequence alternative grouping / Evaluate Division (LC 399) | Weighted union-find variant |

**Meta-pattern worth stating:** "Count of components" problems almost always reduce to either (a) one linear sweep with flood fill, or (b) `n − successful_unions`. Recognize which the input shape favors (adjacency traversal vs. edge-pair merging).

---

## 11. Say It in 60 Seconds

> "The problem is counting maximal connected groups in an undirected graph with nodes 0 to n−1, so I can use arrays directly.
>
> My main approach: build an adjacency list, adding each edge in both directions since it's undirected. Then sweep all n nodes — important to sweep all of them, because isolated nodes count as their own components. Every time I hit an unvisited node, that's a new component: I increment the count and run an iterative DFS to mark everything reachable. I use an explicit stack rather than recursion, because a path-shaped graph with 2000 nodes would blow Python's default recursion limit. I mark nodes visited when I push them, not when I pop. Total time is O(n + m), space O(n + m), and that's optimal since we must read every edge.
>
> An equally good alternative is Union-Find: start the count at n, and for each edge, union the endpoints — decrementing the count only when their roots differ, because a merge within the same component shouldn't count. With path compression and union by size this is effectively linear, and it's the better choice if edges arrived as a stream.
>
> I'd test the two given examples, a case with isolated nodes, a triangle with a redundant edge to verify the union-find count logic, and a 2000-node chain for the recursion concern."
