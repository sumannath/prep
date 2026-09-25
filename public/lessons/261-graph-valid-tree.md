# Graph Valid Tree — Complete Interview Lesson

**LeetCode 261 (Graph Valid Tree)** — a classic "Medium" that is really a disguised test of whether you know *what a tree is* at a structural level, and whether you can implement Union-Find or a traversal-based cycle check cleanly under pressure.

---

## 1. Problem Restatement (say it back to the interviewer)

> "We're given `n` nodes labeled `0..n-1` and a list of **undirected** edges. We must decide whether these edges form exactly one valid tree — i.e., a single connected component with **no cycles**. Return `true`/`false`."

Key facts to confirm out loud:

- The graph is **undirected** — each edge `[a, b]` can be traversed both ways.
- Node labels are `0..n-1`; edges reference **values (node labels)**, not indices into anything.
- Nodes may be **isolated** (no edges touching them) — the edge list can even be empty.
- Constraints are tiny (`n ≤ 2000`, `edges ≤ 5000`), so an `O(n + e)` solution is trivially fast enough. This also means the interviewer cares about **correctness and structure**, not micro-optimization.

---

## 2. Constraint Decoding — what the numbers are telling you

| Constraint | What it implies for your solution |
|---|---|
| `n ≤ 2000`, `edges ≤ 5000` | Any `O(n·α)` or `O(n + e)` algorithm is fine. Don't waste time optimizing constants. |
| `edges.length` can be **0** | An empty edge list is a valid tree **only when `n == 1`** (a single node is a tree). For `n ≥ 2` with no edges, answer is `false` (disconnected). |
| No self-loops, no repeated edges | The problem has pre-cleaned the input. If this constraint were absent, you'd need to handle `[a,a]` and duplicate edges explicitly — worth mentioning to the interviewer. |
| `ai != bi` | No self-loops means every edge connects two distinct nodes — good, Union-Find won't get a degenerate `union(x, x)` call. |
| `n ≥ 1` | No empty-node edge case; smallest input is a single node with zero edges → `true`. |

**The decisive arithmetic observation:** a tree on `n` nodes has **exactly `n − 1` edges**. Since `edges ≤ 5000` and `n ≤ 2000`, the input *can* have more edges than `n − 1` — and if it does, you can return `false` immediately.

---

## 3. Brute Force: DFS/BFS cycle check + full connectivity check

### The definition-driven approach

A graph is a valid tree **iff**:
1. It is **connected** (every node reachable from any node), **and**
2. It contains **no cycle**.

The brute-force faithful translation: run a DFS/BFS from node `0` that (a) detects cycles using a visited set, and (b) tells you whether all `n` nodes were reached.

### Cycle detection in an undirected graph — the subtle part

In a **directed** graph you can use white/gray/black coloring. In an **undirected** graph, the edge you just came from will always look like a "cycle" back to your parent. So the standard trick is to **skip the parent**:

- During DFS from `u`, for each neighbor `v`:
  - If `v == parent[u]` → skip (that's just the edge you arrived on).
  - If `v` is already visited (and `v != parent`) → **cycle found** → `false`.
  - Otherwise recurse with `parent = u`.

### Worked trace on Example 2 (the `false` case)

`n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]`

Build adjacency:

```
0: [1]
1: [0, 2, 3, 4]
2: [1, 3]
3: [2, 1]
4: [1]
```

DFS from `0`, `visited = {0}`, parent = −1:

| Step | At node | Neighbors scanned | Action | `visited` |
|---|---|---|---|---|
| 1 | 0 | 1 (unvisited) | recurse into 1, parent=0 | {0,1} |
| 2 | 1 | 0 (=parent, **skip**), 2 (unvisited) | recurse into 2, parent=1 | {0,1,2} |
| 3 | 2 | 1 (=parent, skip), 3 (unvisited) | recurse into 3, parent=2 | {0,1,2,3} |
| 4 | 3 | 2 (=parent, skip), 1 (**visited, ≠ parent**) | **cycle detected → return false** | — |

The cycle is `1 → 2 → 3 → 1`. Correctly returns `false`.

### Worked trace on Example 1 (the `true` case)

`n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]`

```
0: [1,2,3]
1: [0,4]
2: [0]
3: [0]
4: [1]
```

DFS from 0: visit 0 → 1 → 4 (backtrack) → 2 (backtrack) → 3. No neighbor is ever visited-and-not-parent. `visited = {0,1,2,3,4}` — size 5 = n → connected. Return `true`. ✓

### Brute-force code (Python)

```python
from collections import defaultdict

def validTree_bruteforce(n: int, edges: list[list[int]]) -> bool:
    # Necessary condition: a tree on n nodes has exactly n - 1 edges
    if len(edges) != n - 1:
        return False

    adj = defaultdict(list)
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)

    visited = set()

    def dfs(node: int, parent: int) -> bool:
        visited.add(node)
        for nei in adj[node]:
            if nei == parent:          # don't bounce back on the edge we came in on
                continue
            if nei in visited:         # cycle
                return False
            if not dfs(nei, node):
                return False
        return True

    # len(edges) == n - 1 already guarantees "no cycle" ⟺ "connected",
    # but we check both explicitly to make the logic self-evident.
    return dfs(0, -1) and len(visited) == n
```

### Important subtlety: why the edge-count pre-check makes connectivity redundant *or* the cycle check redundant

Here's the clean theorem (worth stating to the interviewer — it's the whole problem in one sentence):

> **For an undirected graph on `n` nodes, the following are equivalent:**
> 1. The graph is a tree.
> 2. The graph is connected **and** has exactly `n − 1` edges.
> 3. The graph has no cycles **and** has exactly `n − 1` edges.
> 4. The graph is connected **and** has no cycles.

Reasoning sketch: a cycle-free graph with `n` nodes and `c` connected components has exactly `n − c` edges (each component is itself a tree/forest fact). So if `edges = n − 1`, then `c = 1` ⟺ no cycles. This means once you've checked `len(edges) == n − 1`, **one** of {connectivity, acyclicity} suffices — but checking both is harmless and makes the code obviously correct without needing to prove the theorem on the whiteboard.

This gives you two equivalent optimal approaches:

- **Approach A:** `len(edges) == n − 1` + DFS/BFS **cycle check** (with parent skipping). If there are exactly `n − 1` edges and no cycle, connectivity is automatic.
- **Approach B:** `len(edges) == n − 1` + DFS/BFS from node 0, verify **all n nodes visited**. If connected with exactly `n − 1` edges, acyclicity is automatic.
- **Approach C (the interview favorite):** Union-Find — see below. It handles cycle detection and connectivity *simultaneously* without even needing the adjacency list.

---

## 4. The Core Insight

> **A graph is a valid tree ⟺ it has exactly `n − 1` edges AND no two nodes are ever connected by more than one "path" — which Union-Find detects as: every `union(a, b)` call succeeds (no redundant union), and you end up with exactly one component.**

Union-Find is elegant here because:

- **A redundant union (both endpoints already in the same set) = a cycle.** The first time `find(a) == find(b)` for an edge `[a, b]`, you've found a cycle.
- **After processing all `n − 1` edges with zero failed unions, the graph is automatically connected** — `n` nodes, `n − 1` successful merges, one component.

No adjacency list, no recursion, no parent-tracking. Just one loop over edges.

---

## 5. Optimal Approach: Union-Find with Path Compression + Union by Rank/Size

### Algorithm

```python
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))   # parent[i] = i initially (each node its own root)
        self.rank = [0] * n            # rank = upper bound on tree height
        self.components = n            # start with n isolated components

    def find(self, x: int) -> int:
        # Path compression: point every node on the path directly at the root.
        # Iterative (two-pass) version avoids Python recursion depth issues.
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a: int, b: int) -> bool:
        """Returns False if a and b were ALREADY connected (i.e., this edge closes a cycle)."""
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        # Union by rank: attach the shorter tree under the taller one.
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.components -= 1
        return True


def validTree(n: int, edges: list[list[int]]) -> bool:
    # A tree on n nodes must have exactly n - 1 edges.
    if len(edges) != n - 1:
        return False

    uf = UnionFind(n)
    for a, b in edges:          # a, b are node LABELS (values), used directly as UF indices
        if not uf.union(a, b):  # redundant union => cycle
            return False
    # n - 1 successful unions on n nodes => exactly 1 component => connected.
    return uf.components == 1   # always True here, kept for clarity/robustness
```

> **Note on `components`:** if the `len(edges) == n − 1` pre-check passed and every union succeeded, `components == 1` is mathematically guaranteed. Keeping the explicit check makes the code robust if someone removes the edge-count check, and signals to the interviewer that you understand the two criteria (acyclicity + connectivity) map onto (no failed unions + one component).

### Full trace — Example 1: `n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]`

Edge count check: `4 == 5 − 1` ✓. Initial: `parent = [0,1,2,3,4]`, `rank = [0,0,0,0,0]`, `components = 5`.

| Edge | `find(a)` | `find(b)` | Same root? | Action | `parent` after | `rank` after | `components` |
|---|---|---|---|---|---|---|---|
| `[0,1]` | 0 | 1 | No | `parent[1]=0` (ranks equal 0 → `rank[0]→1`) | `[0,0,2,3,4]` | `[1,0,0,0,0]` | 4 |
| `[0,2]` | 0 | 2 | No | `parent[2]=0` (rank 0 < 1) | `[0,0,0,3,4]` | `[1,0,0,0,0]` | 3 |
| `[0,3]` | 0 | 3 | No | `parent[3]=0` | `[0,0,0,0,4]` | `[1,0,0,0,0]` | 2 |
| `[1,4]` | `find(1)`→0 | 4 | No | `parent[4]=0` | `[0,0,0,0,0]` | `[1,0,0,0,0]` | **1** |

All 4 unions succeeded, no redundant union, final `components == 1` → **`true`** ✓

### Full trace — Example 2: `n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]`

Edge count check: `5 != 4` → **return `false` immediately**, before any union runs.

To show what *would* happen without the pre-check (and why the union loop is the real detector), suppose the edge list were `[[0,1],[1,2],[2,3],[1,3],[1,4]]` with the count check removed:

| Edge | `find(a)` | `find(b)` | Same root? | Action | `parent` after | `components` |
|---|---|---|---|---|---|---|
| `[0,1]` | 0 | 1 | No | `parent[1]=0`, `rank[0]→1` | `[0,0,2,3,4]` | 4 |
| `[1,2]` | `find(1)`→0 | 2 | No | `parent[2]=0` | `[0,0,0,3,4]` | 3 |
| `[2,3]` | 0 | 3 | No | `parent[3]=0` | `[0,0,0,0,4]` | 2 |
| `[1,3]` | 0 | `find(3)`→0 | **YES** | **cycle! return `false`** | — | — |

Edge `[1,3]` connects two nodes already joined via the path `1–2–3` — the redundant union is the cycle `1→2→3→1`. ✓

### Why `n − 1` edges + all unions succeed ⟹ one component (interviewer-proof)

Each successful `union` merges two distinct components into one, decreasing the component count by exactly 1. Starting at `n` components, after `n − 1` successful unions you have `n − (n − 1) = 1` component. A graph with one component and no redundant unions has, by construction, no cycles. Both tree conditions satisfied.

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Union-Find (path compression + union by rank) | `O(n + e · α(n))` ≈ `O(n + e)` | `O(n)` for `parent` + `rank` arrays | α = inverse Ackermann; effectively constant (α(n) ≤ 4 for any n that fits in the universe). |
| DFS/BFS cycle check + edge count check | `O(n + e)` | `O(n + e)` adjacency list + `O(n)` visited/recursion stack | Needs the parent-skip trick for undirected cycle detection. |
| DFS/BFS connectivity check + edge count check | `O(n + e)` | `O(n + e)` | Simpler: just count visited nodes. |
| Brute force: for every edge, BFS to see if `a` and `b` are already connected | `O(e · (n + e))` | `O(n + e)` | Strictly worse; mention only as a baseline. |

The main solution is `O(n + e)` with union-find (or `O(n α(n))` ≈ `O(n)` once the `n − 1` edge check passes). There is no meaningful lower-bound discussion to cite here beyond the trivial `Ω(n + e)` input-reading bound — any correct algorithm must at least look at every node and edge, so `O(n + e)` is input-optimal.

---

## 7. Test Cases to Propose Out Loud

Before coding, say something like: *"Let me nail down the edge cases before I write code."* Then list:

| # | Input | Expected | Why |
|---|---|---|---|
| 1 | `n=5, edges=[[0,1],[0,2],[0,3],[1,4]]` (Example 1) | `true` | Connected, 4 = n−1 edges, acyclic. |
| 2 | `n=5, edges=[[0,1],[1,2],[2,3],[1,3],[1,4]]` (Example 2) | `false` | Cycle `1-2-3` (also 5 edges ≠ 4, so caught by the count check). |
| 3 | `n=1, edges=[]` | `true` | A single node is a tree. Smallest valid input. Watch: `len(edges)=0 == n−1=0` ✓, zero unions, `components=1` ✓. |
| 4 | `n=4, edges=[]` | `false` | Edge count check: `0 != 3` → false immediately. (Four isolated nodes are not one tree.) |
| 5 | `n=4, edges=[[0,1],[2,3]]` | `false` | **Tricky one:** 2 edges = n−1 = 2 ✓, no cycle, but **disconnected**. This is why the edge-count check *alone* is insufficient — you need connectivity *or* acyclicity in addition. With union-find: 2 successful unions → `components = 2` ≠ 1 → false. (If you dropped the `components == 1` check after removing the count check, you'd wrongly return `true` — this is exactly the test that catches that bug.) |
| 6 | `n=3, edges=[[0,1],[1,2],[0,2]]` | `false` | Triangle cycle; `3 edges ≠ 2`, caught by count check. |

Case 5 deserves special emphasis in the interview: it's the case that punishes the naive "`edges == n−1` means tree" assumption.

---

## 8. Common Mistakes (and how each fails a specific test)

| # | Mistake | How it manifests | Fix |
|---|---|---|---|
| 1 | **Forgetting the `len(edges) != n − 1` early check** and only checking cycles | Example 2 has a cycle, so it accidentally works — but a graph with `n` edges that is acyclic-and-connected can't exist with `n` edges… actually it *can* have `n` edges *with* a cycle; the check is still needed for cases like disconnected-with-extra-edges. Safer framing: the check is a cheap `O(1)` filter that also makes the theorem application airtight. | Always check `len(edges) == n − 1` first. |
| 2 | **Returning `true` after only the edge-count check** | `n=4, edges=[[0,1],[2,3]]`: 2 = n−1 edges, but two components → must be `false`. | Edge count is *necessary*, not *sufficient*. Combine with a connectivity or acyclicity check. |
| 3 | **Skipping the parent in the undirected DFS cycle check** (or not tracking parent at all) | Every single edge looks like a 2-node cycle → everything returns `false`, including Example 1. | Pass `parent` down the recursion; skip the single neighbor equal to `parent`. (This works because there are **no repeated edges** per constraints — if multi-edges existed, parent-skipping would miss genuine 2-cycles and you'd need edge-ID skipping instead.) |
| 4 | **Recursion depth / stack overflow on deep chains** | With `n = 2000` a chain 0–1–2–…–1999 triggers ~2000 recursive calls. Python's default recursion limit is 1000 → `RecursionError`. | Use iterative DFS/BFS with an explicit stack/queue, or use the **iterative two-pass union-find** shown above (which is also why I wrote `find` iteratively). In Java, recursion depth 2000 is usually fine but still avoid recursion for generality. |
| 5 | **Union-Find without path compression / union by rank** | Still correct, but `find` can degrade to `O(n)` per call → `O(n²)` total on adversarial chains (e.g., unions that always attach tall trees under short ones). | Always implement path compression + union by rank/size. It's 4 extra lines. |
| 6 | **Treating the graph as directed** (only adding `adj[a].append(b)`) | Node 4 in Example 1 is only reachable as `1 → 4`; if you also miss `4 → 1`, a BFS from 0 still reaches 4 here, but a cycle check will fail in general (you'd traverse edges only one way and either falsely detect or miss cycles). | Build symmetric adjacency: `adj[a].append(b); adj[b].append(a)`. |
| 7 | **Confusing node labels with indices** | Here they coincide (`0..n-1`), so `parent[a]` works directly. But candidates who mechanically "index into edges" or mix up "the i-th edge" vs "node with label i" betray fuzzy thinking. State it explicitly: *edges contain node **values**; union-find arrays are indexed **by node label**.* | One sentence out loud while coding. |
| 8 | **Java/C++ specific gotchas** | See subsection below. | — |

### Java / C++ implementation gotchas

| Language | Gotcha |
|---|---|
| **Java** | Don't use `HashMap<Integer, Integer>` for `parent` — use an **int array**; boxing 2000 ints into a `HashMap` is wasteful and invites autoboxing overhead. If you do use a `HashMap<Integer, Integer>`, remember `map.get(key)` returns `null` for absent keys and unboxing `null` to `int` throws `NullPointerException` — an easy crash on node `0` if you initialize lazily. Also, a recursive `find` is fine in Java for n ≤ 2000, but the iterative loop is safer style. |
| **C++** | Use `std::vector<int>` for `parent`/`rank`, not `std::map` (log-factor overhead). Be careful with `rank` shadowing nothing in particular but avoid `using namespace std` collisions if you name a variable `rank` — it's fine, but some codebases alias it as `rnk` or `depth` to avoid confusion with `std::rank` from `<type_traits>`. Also, if writing the recursive path-compression find: `parent[x] = find(parent[x]); return parent[x];` — forgetting the second `return parent[x]` (returning `find(parent[x])` after mutation is also fine, but returning the *stale* `x` is a classic bug). |
| **Python** | Set `sys.setrecursionlimit` if you insist on recursive DFS; better, go iterative. Also note `defaultdict(list)` vs `defaultdict(int)` confusion — here you want `list`. |

---

## 9. Transferable Patterns & Related Problems

This problem is a gateway to a whole family. Name the patterns explicitly in the interview — it signals breadth.

**Pattern 1 — "Tree = connectivity + acyclicity (+ n−1 edges)":**
- *LC 261 Graph Valid Tree* (this problem)
- *Redundant Connection* (LC 684): find the one edge that creates a cycle — literally "return the first edge whose union fails."
- *Number of Provinces* (LC 547): connectivity only, no edge-count constraint → count final `components`.
- *Number of Connected Components in an Undirected Graph* (LC 323): same as above, the "template sibling" of this problem.

**Pattern 2 — Union-Find as a general dynamic-connectivity engine:**
- *Accounts Merge* (LC 721): union entities that share an email.
- *Most Stones Removed with Same Row or Column* (LC 947): union stones in same row/column.
- *Min Cost to Connect All Points* (LC 1584): Kruskal's MST — union-find + sort edges by weight; **valid tree is exactly the feasibility condition for an MST to exist.**
- *Evaluating Boolean Expressions / Satisfiability of Equality Equations* (LC 990): union-find with equality classes.

**Pattern 3 — The "equivalent characterizations of a tree" toolkit** (connected + n−1 edges ⟺ acyclic + n−1 edges ⟺ connected + acyclic). This shows up in MST feasibility, minimum spanning forest counting, and graph theory follow-ups.

**Interview follow-up ammunition:**
- *"What if edges could repeat or include self-loops?"* → Duplicate edge `[a,b]` twice: second union fails → cycle → correctly `false` (a multi-edge is a cycle of length 2). Self-loop `[a,a]`: `find(a) == find(a)` → union fails → `false`. So union-find actually handles both gracefully; the DFS parent-skip approach would need edge-ID tracking.
- *"Can you do it with union-find without the edge-count check?"* → Yes: run all unions; valid tree iff **zero failed unions AND `components == 1`**. The count check is purely an early exit.

---

## 10. Final "Say it in 60 seconds"

> "A valid tree needs two things: it has to be **connected**, and it has to have **no cycles** — which is equivalent to having exactly **n minus one edges** plus either one of those properties.
>
> My approach: first, if the edge count isn't exactly n minus one, return false immediately — that's a free check. Then I use **Union-Find**: start with n isolated components, and for each edge, union its two endpoints. If a union ever finds both endpoints already in the same set, that edge closes a cycle, so I return false. If all n minus one unions succeed, I've gone from n components down to exactly one — connected and acyclic — so I return true.
>
> With path compression and union by rank, each union is effectively constant time, so the whole thing is **O of n plus e** time and **O of n** space — linear in the input size, which is optimal since I have to read every edge anyway.
>
> Two edge cases I'd call out: n equals one with no edges is a valid tree, and a graph with the right edge count but two disconnected components — like edges [0,1] and [2,3] with n equals four — must return false, which my component-count check catches."

*(≈60 seconds spoken at a normal interview pace. Practice it until you can deliver it without reading — then let the interviewer steer to implementation.)*
