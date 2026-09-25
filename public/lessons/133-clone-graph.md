# Clone Graph (LeetCode 133) — Complete Lesson

**In one line:** A graph is not a tree — nodes have cycles and multiple parents — so a "copy as you recurse" strategy must be paired with a hash map from *original node → clone* that is populated **before** you walk a node's neighbors. Everything else is bookkeeping.

---

## 1. Problem Restated (and what "deep copy" means here)

You are handed a **reference to one node** of a connected, undirected graph. Each node holds an integer `val` and a `List[Node]` of neighbors. You must return the entry node of a **deep copy**: a structurally identical graph made entirely of fresh objects.

A correct clone satisfies four invariants:

1. **Fresh objects** — no node in your clone may be an object from the input graph (returning the input itself is the classic trap).
2. **Exactly one clone per original** — a bijection between originals and clones. If three nodes all point to node 4 in the original, their clones must all point to the *same single* clone of 4.
3. **Edge correspondence** — for every adjacency entry `u → v` in the original, `u'` (clone of `u`) lists `v'` (clone of `v`), and vice versa.
4. **Order preservation** — each clone's neighbor list matches the original's order (iterate and append in order; all solutions below do this naturally).

You return the clone of the **given** node; the rest of the clone is reachable through its neighbor lists.

### 1.1 Indices vs. values (read this twice)

- The test format renders the graph as `adjList = [[2,4],[1,3],[2,4],[1,3]]`, where the **i-th row (1-indexed)** describes the node whose `val == i`. So `adjList[0]` (0-indexed in code) is the neighbor list of node with `val = 1`.
- **Your function does not receive the adjacency list.** It receives a `Node` reference. The adjacency list only exists in the judge's serialization.
- Inside your algorithm, you never touch indices — you only use object references and `val`s. When tracing by hand, it's convenient to write `1'` for "the clone of the node with val 1."
- Also note the difference between `adjList = []` (zero nodes → input node is `None`) and `adjList = [[]]` (one node with no neighbors). These are completely different inputs.

---

## 2. Decoding the Constraints

| Constraint | What it implies | Design decision |
|---|---|---|
| Nodes in range **[0, 100]** | `0` is possible → the given node may be `None` (Example 3) | Null check first thing |
| `1 <= Node.val <= 100`, **unique** | Values act as implicit node IDs; small range | You *could* key a map by `val` — but keying by node object is more general and just as easy |
| No repeated edges, no self-loops | Each unordered pair contributes at most one edge, so `E ≤ N(N−1)/2` (≤ 4,950 edges here); each neighbor list has distinct entries | Each edge is scanned at most twice overall (once from each endpoint) — no dedup logic needed |
| **Connected**, given node is the node with `val = 1` | One traversal from the given reference reaches *everything*; you have no global node list anyway | Single-source DFS/BFS is sufficient; no outer loop over components |
| **Undirected** | Symmetry: if `u` lists `v`, then `v` lists `u` | Every edge is a 2-cycle in traversal terms — this is why naive copying **cannot terminate** (Section 3.1) |

**Sizing note:** With `N ≤ 100`, recursive DFS depth ≤ 100 is safe (CPython's default recursion limit is ~1,000 frames). In a variant with large `N`, prefer BFS or iterative DFS.

---

## 3. First Attempts: Brute Force, With Traces

### 3.1 Attempt 0 — Copy as you go, no memory (fails)

The natural first idea: recursively copy each node, copying neighbors as you encounter them.

```
copy(1)
 ├─ create new 1
 ├─ neighbor 2 → copy(2)
 │    ├─ create new 2
 │    ├─ neighbor 1 → copy(1)   ← back-edge, no memory of the original 1
 │    │    ├─ create new 1
 │    │    └─ neighbor 2 → copy(2) → ... infinite
```

**Trace on Example 1** (`1–2, 1–4, 2–3, 3–4`): `copy(1)` spawns `copy(2)`, whose neighbor list contains `1`, spawning `copy(1)` again, forever. In Python this surfaces as `RecursionError: maximum recursion depth exceeded` (the default limit is ~1,000 frames), not a literal infinite loop — but it's the same bug.

Key observation: in an **undirected** graph, *any* edge forces this. The neighbor relation is symmetric, so walking into a neighbor always gives you a path straight back. The only graph this handles is a single isolated node.

### 3.2 Attempt 0.5 — Add a *visited set* (still fails, and it's instructive why)

Candidates often reach for a visited set. Trace it on a **star graph** `adjList = [[2,3,4],[1],[1],[1]]`:

- `copy(1)`: mark 1 visited, create `1'`.
- Neighbor 2: unvisited → `copy(2)`: mark 2, create `2'`. Now iterate 2's neighbors: `[1]` — **1 is visited.** What do you return? You need to append *the clone of node 1* to `2'`'s neighbor list — **a visited set can't give you that.** It remembers "seen," not "the corresponding object."

Whatever you return (`None`, a fresh node), `2'` ends up with an empty or wrong neighbor list, while `1'` lists `2'` — the copy is no longer symmetric with the original. This is the moment the insight lands:

> A set answers *"have I seen this node?"* — but a back-edge asks *"give me the clone of this node."* **Only a map can answer that.**

### 3.3 Attempt 1 — Workable brute force: two passes ("bucket, then wire")

Pass 1 traverses and collects all reachable nodes; pass 2 creates clones and rewires.

```python
def cloneGraph_two_pass(node: "Node") -> "Node":
    if not node:
        return None
    # Pass 1: collect every reachable node (identity-based visited set)
    seen, stack = set(), [node]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        stack.extend(cur.neighbors)
    # Pass 2: one clone per original, then rewire through the map
    clones = {orig: Node(orig.val) for orig in seen}
    for orig in seen:
        clones[orig].neighbors = [clones[nb] for nb in orig.neighbors]
    return clones[node]
```

**Trace on Example 1** (`adjList = [[2,4],[1,3],[2,4],[1,3]]`):

- **Pass 1 (DFS):** visit 1 → push 2, 4 → visit 2 → push 3 → visit 4 → visit 3. Collected: `{1, 2, 4, 3}`.
- **Pass 2:** create `1', 2', 3', 4'`. Wire: `1'.nbrs = [2', 4']`, `2'.nbrs = [1', 3']`, `4'.nbrs = [1', 3']`, `3'.nbrs = [2', 4']`. Return `1'`. ✓

This is **correct** and asymptotically identical to the optimal (`O(N + E)`). Its flaws are cosmetic-but-real: two traversals, and it materializes the node set eagerly. The one-pass solution in Section 5 simply performs "create clone" and "wire neighbors" **atomically per node**, using the map lazily. (You could key the map by `orig.val` here since values are unique — but keying by the node object is the same code and survives variants where values repeat.)

---

## 4. The Core Insight

**A deep copy of a graph = a graph traversal + a translation table.** The hash map `old_to_new` plays two roles at once:

1. **Visited set** — a node present in the map has already been cloned.
2. **Translator** — whenever you need "the clone of X," you look it up.

And one ordering rule makes cycles harmless:

> **Register-before-recursing:** create the clone and insert it into the map *immediately*, **before** iterating its neighbors.

**Why this works (the invariant):** at every moment during the traversal, every node currently on the DFS stack (or in the BFS queue) already has its clone registered in the map. So any back-edge — an edge to an ancestor or to any previously discovered node — finds its target's clone already present and returns it in O(1). A cycle can no longer generate new calls; it can only bounce off existing map entries.

Fun anchor: this memo-map is exactly what `copy.deepcopy` and `pickle` maintain internally in CPython — Python's deep-copy machinery survives cyclic objects for precisely this reason. In an interview, though, you hand-roll it; outsourcing to `deepcopy` hides the entire point of the question.

---

## 5. Optimal Solutions (One Pass)

### 5.1 Recursive DFS (the primary solution — shortest correct code)

```python
class Node:
    def __init__(self, val: int = 0, neighbors: list = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


class Solution:
    def cloneGraph(self, node: "Node") -> "Node":
        if not node:                      # Example 3: empty graph
            return None
        old_to_new = {}                   # original node -> its clone

        def dfs(cur: "Node") -> "Node":
            if cur in old_to_new:         # back-edge / revisit: translate, don't copy
                return old_to_new[cur]
            clone = Node(cur.val)
            old_to_new[cur] = clone       # REGISTER BEFORE RECURSING (cycle-killer)
            for nb in cur.neighbors:
                clone.neighbors.append(dfs(nb))   # always goes through the memo
            return clone

        return dfs(node)
```

Note the structure of the neighbor loop: it **never** constructs `Node(nb.val)` directly. It calls `dfs(nb)`, which returns either a freshly created clone (first visit) or the memoized one (revisit). That single discipline enforces Invariant 2 (one clone per original).

### 5.2 Worked Traces

**Example 1** — `adjList = [[2,4],[1,3],[2,4],[1,3]]` (cycle `1–2–3–4–1`):

```
dfs(1):  1 not in map → create 1' ; map={1}
  nb 2 → dfs(2):  create 2' ; map={1,2}
    nb 1 → dfs(1): 1 IS in map → return 1'   ← cycle broken here
    nb 3 → dfs(3):  create 3' ; map={1,2,3}
      nb 2 → dfs(2): return 2'  (memoized)
      nb 4 → dfs(4):  create 4' ; map={1,2,3,4}
        nb 1 → return 1' ; nb 3 → return 3'
        4'.nbrs = [1', 3']
      3'.nbrs = [2', 4']
    2'.nbrs = [1', 3']
  nb 4 → dfs(4): return 4'  (memoized)
  1'.nbrs = [2', 4']
return 1'
```

Result: `1':[2,4], 2':[1,3], 3':[2,4], 4':[1,3]` — matches the input. Every clone was created exactly once; the four back-edges all resolved via the map.

**Example 2** — `adjList = [[]]`: `dfs(1)` creates `1'`, the neighbor loop runs zero times, return `1'` with an empty list. ✓

### 5.3 BFS (same map, explicit queue)

```python
from collections import deque

class Solution:
    def cloneGraph(self, node: "Node") -> "Node":
        if not node:
            return None
        old_to_new = {node: Node(node.val)}      # clone created at ENQUEUE time
        queue = deque([node])
        while queue:
            cur = queue.popleft()
            for nb in cur.neighbors:
                if nb not in old_to_new:
                    old_to_new[nb] = Node(nb.val)   # create + mark now, not at dequeue
                    queue.append(nb)
                old_to_new[cur].neighbors.append(old_to_new[nb])
        return old_to_new[node]
```

Gotcha folded into the comments: mark/create **at enqueue time**. If you wait until dequeue, the queue can hold duplicates of the same node and you'll append that node's clone to neighbor lists twice.

**Trace on Example 1:**

| Step | Popped | Action | Map (vals) | Queue after | Neighbor lists built |
|---|---|---|---|---|---|
| 0 | — | init: clone 1', enqueue 1 | {1} | [1] | — |
| 1 | 1 | nb 2 → create 2', enqueue; nb 4 → create 4', enqueue | {1,2,4} | [2,4] | `1':[2',4']` |
| 2 | 2 | nb 1 in map; nb 3 → create 3', enqueue | {1,2,3,4} | [4,3] | `2':[1',3']` |
| 3 | 4 | nb 1, nb 3 both in map | {1,2,3,4} | [3] | `4':[1',3']` |
| 4 | 3 | nb 2, nb 4 both in map | {1,2,3,4} | [] | `3':[2',4']` |

Queue empty → return `1'`. ✓ Neighbor-list order is preserved in every variant because we iterate `cur.neighbors` in order and append.

### 5.4 Iterative DFS (a one-line change)

The BFS code above with `stack = [node]` and `cur = stack.pop()` instead of `popleft()` is an iterative DFS. Same map, same register-at-discovery rule, same complexity — useful when recursion depth is a concern and you want DFS-like exploration.

---

## 6. Complexity Analysis

| Approach | Time | Auxiliary space | Terminates | Structure correct? |
|---|---|---|---|---|
| Memoless copy (§3.1) | never terminates when `E ≥ 1` | — | ✗ | — |
| Visited set only (§3.2) | O(N + E) | O(N) | ✓ | ✗ (can't translate back-edges) |
| Two-pass bucket + wire (§3.3) | O(N + E) | O(N) | ✓ | ✓ |
| **One-pass DFS (§5.1)** | **O(N + E)** | **O(N) map + O(N) recursion stack** | ✓ | ✓ |
| One-pass BFS (§5.3) | O(N + E) | O(N) map + O(N) queue | ✓ | ✓ |

**Justifications:**
- *Time:* each node is cloned exactly once (map lookup is O(1) average), and each node's neighbor list is iterated exactly once — so each of the `E` edges is scanned at most twice (once from each endpoint, by symmetry of the adjacency lists).
- *Edge bound:* no duplicate edges and no self-loops means each unordered pair contributes at most one edge, hence `E ≤ N(N−1)/2 = 4,950` at `N = 100`.
- *Lower bound:* every correct clone must construct `N` fresh nodes and fill `2E` neighbor references (each undirected edge lives in two adjacency lists), so Ω(N + E) work is unavoidable — the one-pass solutions are asymptotically optimal, not merely "fast enough."
- *Recursion depth:* at most one frame per node on any root-to-node path, so ≤ N = 100 here — comfortably inside CPython's ~1,000-frame default limit.

---

## 7. Language Gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| **Java** | `HashMap<Node, Node>` works **because `Node` doesn't override `equals`/`hashCode`** — you get identity semantics, which is exactly what you want. If you define your own `Node` with value-based `equals` (by `val`), two *distinct* nodes with equal values collide and the map silently merges them, corrupting the copy. If you key by `Integer val` instead, compare with `.equals()` — `==` on boxed `Integer`s only works inside the −128..127 autobox cache (vals ≤ 100 happen to fit; don't rely on it). |
| **C++** | Use `unordered_map<Node*, Node*>` — pointer keys hash by address (specializations of `std::hash` for pointer types exist), giving identity semantics for free. Keying by `Node` *objects* would require a custom hash plus an equality function; don't. And guard `if (!node) return nullptr;` before touching `->neighbors`. |
| **Python** | `dict`/`set` hash objects by `id()` since `Node` defines no `__eq__` — desired behavior. Avoid membership tests against a *list* of nodes (`in` on a list is a linear scan); use the map/set. Recursion depth ≤ 100 is safe by default, but for a scaled-up variant, switch to BFS/iterative DFS or raise `sys.setrecursionlimit`. |

---

## 8. Common Mistakes

| # | Mistake | Symptom | Fix |
|---|---|---|---|
| 1 | Missing the null check | `AttributeError` on Example 3 (`adjList = []`, node is `None`) | `if not node: return None` |
| 2 | Inserting the clone into the map **after** processing neighbors | Back-edge recurses on a node with no map entry → infinite recursion / `RecursionError` | Register immediately after `Node(cur.val)`, before the neighbor loop |
| 3 | Writing `clone.neighbors.append(Node(nb.val))` inline | Every reference to a shared neighbor gets a **different** clone → clone graph has more nodes than the original; sharing (Invariant 2) destroyed | Always fetch the clone from the memo: `dfs(nb)` or `old_to_new[nb]` |
| 4 | Using a visited **set** instead of an old→new **map** | On a back-edge you must *return* the neighbor's clone; a set gives you nothing to return | Map keyed by the original node object |
| 5 | Keying the map by `node.val` | Works only because values are unique *per these constraints*; merges distinct nodes in any variant where values repeat | Key by node reference |
| 6 | BFS: marking visited at **dequeue** | Queue accumulates duplicates → a node's clone gets appended to neighbor lists twice | Create the clone and enqueue at discovery time |
| 7 | Returning the input node, or embedding input nodes inside the clone's adjacency | Shallow copy — aliases the input; first thing a sharp interviewer probes | Every node in the output is constructed by you |
| 8 | `copy.deepcopy(node)` and moving on | Technically passes (CPython's deepcopy keeps its own memo for cycles) but demonstrates nothing | Hand-roll the map; mention the deepcopy connection only as a footnote |

---

## 9. Test Plan: Cases to Say Out Loud

### 9.1 Announce these before/while coding

- **Example 3 — empty graph:** `adjList = []` → input node is `None` → return `None`. (This is the case most often missed.)
- **Example 2 — single node, no neighbors:** `adjList = [[]]` → return one fresh node, empty neighbor list.
- **Two-node cycle:** `adjList = [[2],[1]]` — the smallest graph that kills the memoless approach; verifies register-before-recursing.
- **Star (shared-neighbor check):** `adjList = [[2,3,4],[1],[1],[1]]` — `2'`, `3'`, `4'` must all reference the **same** `1'` object; this catches Mistake #3 (inline `Node(nb.val)`).
- **Example 1** as the standard sanity trace.

### 9.2 Local harness (Python)

```python
from collections import deque

def build(adj):
    """List[List[int]] -> entry Node (None for []). Row i is node val i+1."""
    if not adj:
        return None
    nodes = [Node(i + 1) for i in range(len(adj))]
    for i, nbr_vals in enumerate(adj):
        nodes[i].neighbors = [nodes[v - 1] for v in nbr_vals]
    return nodes[0]

def serialize(start):
    """Adjacency rows in BFS-discovery order; [] for None."""
    if start is None:
        return []
    seen, out, q = {start}, [], deque([start])
    while q:
        cur = q.popleft()
        out.append([nb.val for nb in cur.neighbors])
        for nb in cur.neighbors:
            if nb not in seen:
                seen.add(nb)
                q.append(nb)
    return out

def all_nodes(start):
    seen, stack = set(), [start]
    while stack:
        cur = stack.pop()
        if cur not in seen:
            seen.add(cur)
            stack.extend(cur.neighbors)
    return seen
```

### 9.3 Post-code checks (run these; state them out loud too)

```python
tests = [
    [[2, 4], [1, 3], [2, 4], [1, 3]],   # Example 1: 4-cycle
    [[]],                                # Example 2: lone node
    [],                                  # Example 3: empty graph
    [[2], [1]],                          # minimal cycle
    [[2, 3, 4], [1], [1], [1]],          # star: shared-center check
]
for adj in tests:
    orig = build(adj)
    clone = Solution().cloneGraph(orig)
    assert clone is not orig                       # not the same object
    o, c = all_nodes(orig), all_nodes(clone)
    assert len(o) == len(c)                        # exactly one clone per original
    assert o.isdisjoint(c)                         # zero aliasing with the input
    if adj:
        assert sorted(serialize(clone)) == sorted(adj)
```

Notes: rows are compared with `sorted` because the clone's BFS discovery order may permute rows relative to the input (e.g., Example 1 serializes as `[[2,4],[1,3],[1,3],[2,4]]`); within each row, neighbor order *is* preserved and meaningful.

---

## 10. Transferable Patterns & Related Problems

**The pattern:** *Traversal + identity-keyed memo map* — the standard way to walk any structure with cycles or shared sub-objects. Sub-patterns worth internalizing:

1. **The map is the algorithm.** DFS vs. BFS vs. iterative stack are interchangeable; the old→new translation table is the load-bearing idea.
2. **Register creations eagerly** (before recursion/enqueue completes) so every back-edge finds its target's clone waiting.
3. **Set vs. map:** a set answers "seen?"; graph copying needs "give me the corresponding object." Reach for the map whenever a revisit requires a *return value*.
4. **Deep-copy checklist:** bijection, edge correspondence, order preservation, zero aliasing with the source.

| Related problem | Shared idea |
|---|---|
| **LC 138 — Copy List with Random Pointer** | Same memo map; a linked list whose `random` pointers are extra graph edges |
| **LC 1490 — Clone N-ary Tree** | Identical DFS memo; `children` instead of `neighbors` |
| **LC 1485 — Clone Binary Tree with Random Pointer** | Tree + one extra pointer per node = graph copy in disguise |
| **LC 200 / 695 — Number of Islands / Max Area of Island** | Same traversal skeleton with a visited structure (no cloning) |
| **LC 207 — Course Schedule** | Traversal with per-node state to survive cycles on a directed graph |

---

## 11. Full Interview Talk Track

**Phase 1 — Restate and pin down semantics (~30s).**
"So I need a deep copy: every node is a brand-new object, and critically, if several nodes share a neighbor in the original, their clones must share the *same single* clone. The graph is undirected and connected, cycles are possible, and I'm only given the entry node, so I'll discover the graph by traversing it."

**Phase 2 — Kill the naive idea out loud (~30s).**
"My first instinct is to recurse and copy on the way, but in an undirected graph every edge points back — copying node 1 reaches node 2, whose neighbors include 1, so a memoryless recursion never terminates. And a visited *set* alone doesn't fix it: when I hit an already-visited neighbor, I need to attach *its clone*, and a set can't give me an object — only a map from original to clone can."

**Phase 3 — State the insight (~30s).**
"So: one hash map, original → clone, doubling as my visited marker. Rule: the moment I first see a node, I create its clone and insert it into the map *before* touching its neighbors. That guarantees any back-edge finds the clone already registered, so cycles can't generate new work — and every node gets exactly one clone."

**Phase 4 — Code while narrating.**
"Null in, null out for the empty graph. DFS helper: if the node's in the map, return its clone — that's the translate step. Otherwise create the clone, register it, then for each neighbor append whatever a recursive call returns — fresh or memoized. Return the entry clone."

**Phase 5 — Verify and cost (~30s).**
"Walking Example 1's 1–2–3–4 cycle: dfs(1) registers 1', dfs(2) registers 2', the edge back to 1 bounces off the map, and so on — four clones, each created once. Time is O(N + E): each node cloned once, each edge scanned from both endpoints; space O(N) for the map plus the recursion stack. Tests I'd run: empty graph, single node, two-node cycle, and a star where three nodes share a center — that one catches accidentally cloning a shared neighbor twice."

---

## 12. Say It in 60 Seconds

> "Clone Graph is a deep copy with two traps: cycles and shared neighbors. A naive recursive copy never terminates, because in an undirected graph every edge points back at you. So I carry one hash map from original node to clone — it's my visited set and my translator at the same time. I DFS from the given node: on first visit I create the clone and put it in the map *immediately*, before touching neighbors; then for each neighbor I recursively clone and append whatever comes back — a fresh clone or the memoized one. That gives me exactly one clone per original, breaks every cycle, and keeps shared neighbors shared. Null input returns null; a lone node returns a lone clone. Time O(N + E) — each node once, each edge from both ends — space O(N) for the map plus the stack or queue. Tests I'd call out: empty graph, single node, two-node cycle, and a star where three nodes share a center."
