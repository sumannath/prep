# Course Schedule — Complete Interview Lesson

**LeetCode 207 | Medium | Graphs, Topological Sort, Cycle Detection**

---

## 1. Problem Restatement (in your own words)

You're given `numCourses` courses and a list of prerequisite pairs. Each pair `[a, b]` means **"b must be taken before a."** Model this as a **directed graph**: an edge `b → a` ("b unlocks a"). The question — *can you take all courses?* — is exactly asking:

> **Does this directed graph contain a cycle?**

- No cycle → a valid linear ordering (a *topological order*) of all courses exists → return `true`.
- Any cycle → the courses in that cycle block each other forever → return `false`.

Restating it as cycle detection is the first "aha" you should say out loud in an interview. It converts a scheduling word problem into a classic graph algorithm.

---

## 2. Constraint Decoding

| Constraint | What it tells you about the intended solution |
|---|---|
| `numCourses ≤ 2000` | V is small. O(V·E) = 2000 × 5000 = 10M is *technically* fine, but O(V + E) is trivially fast. No pressure to be clever. |
| `prerequisites.length ≤ 5000` | E ≤ 5000. Graph is **sparse** — use adjacency *lists*, not an adjacency *matrix* (2000² = 4M cells would waste memory). |
| `0 ≤ prerequisites.length` — **the list can be empty** | No prerequisites → every course is independent → always `true`. Don't index into an empty array assuming length ≥ 1. |
| Pairs are unique | No duplicate edges to dedupe. (If duplicates were allowed, Kahn's indegree counting would break unless you counted multiplicities consistently — worth mentioning as a follow-up.) |
| Labels `0..numCourses-1` | Nodes are small integers → you can use arrays (not hash maps) for adjacency, indegree, and visited state. This is a hint that the "clean" solution uses arrays. |
| No self-loops stated, but nothing forbids `[x, x]` | An edge `x → x` is a cycle of length 1 → answer must be `false`. Your algorithm should handle it naturally; Kahn's does (indegree never reaches 0). |

---

## 3. Brute Force (and why it fails gracefully)

**Idea:** Try to enumerate all possible orderings of the courses and check whether any ordering satisfies every prerequisite.

```python
from itertools import permutations

def canFinish_bruteforce(numCourses, prerequisites):
    prereq_set = set(map(tuple, prerequisites))  # (a, b): b before a
    for perm in permutations(range(numCourses)):
        pos = {course: i for i, course in enumerate(perm)}
        if all(pos[b] < pos[a] for a, b in prereq_set):
            return True
    return False
```

**Worked trace** on `numCourses = 2, prerequisites = [[1,0],[0,1]]`:

1. Permutation `(0, 1)`: check `[1,0]` — needs `pos[0] < pos[1]` → `0 < 1` ✓. Check `[0,1]` — needs `pos[1] < pos[0]` → `1 < 0` ✗. Fail.
2. Permutation `(1, 0)`: check `[1,0]` — needs `0 < 1` ✗. Fail.
3. No permutations left → return `False`. ✓ correct here.

**Why it's unacceptable:** There are up to `V!` permutations (for V = 2000, astronomically more than atoms in the universe — this is not a polynomial bound, and there's no comparison-model lower bound to worry about; the problem simply admits an O(V + E) algorithm, so factorial search is pure waste). Even checking *one* permutation costs O(E).

**Better-but-still-suboptimal brute force:** For each course, run a plain DFS following prerequisite edges and see if you ever return to the start. Without a "fully processed" memo, this re-explores overlapping subgraphs and can blow up exponentially on dense DAGs; with a global "visited" set alone you get **false cycle reports** (a node can be reachable from two different DFS roots without being on a cycle). This failure mode is exactly what motivates the three-color DFS below.

---

## 4. The Core Insight

A valid course ordering is a **topological ordering** of the directed graph. Two equivalent facts (say either one):

1. **Kahn's framing:** A topological order exists **iff** the graph has no directed cycle. Kahn's algorithm repeatedly removes nodes with indegree 0 ("courses you can take right now"). If you can remove all V nodes, no cycle. If you get stuck with remaining nodes that all have indegree ≥ 1, those leftovers *are* the cycle.

2. **DFS framing:** A directed graph is acyclic iff a DFS never encounters a **back edge** — an edge to a node currently *on the recursion stack* (a "gray" node in the three-color scheme).

The metaphor writes itself: nodes with indegree 0 are courses with no unmet prerequisites — take them, "cross them off," which unlocks the courses that depended on them. Repeat. If you ever can't take anything, you're deadlocked by a cycle.

---

## 5. Optimal Approach #1 — Kahn's Algorithm (BFS Topological Sort) ★ Recommended

### Algorithm

1. Build an adjacency list: `adj[b].append(a)` for each `[a, b]` (edge **b → a**: finishing b unlocks a).
2. Compute `indegree[a] += 1` for each `[a, b]` (a has one more prerequisite).
3. Seed a queue with every node whose indegree is 0.
4. Pop nodes one at a time; increment a counter `taken`. For each neighbor of the popped node, decrement its indegree; when it hits 0, enqueue it.
5. Return `taken == numCourses`.

### Python

```python
from collections import deque

def canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:
    adj = [[] for _ in range(numCourses)]
    indegree = [0] * numCourses

    for a, b in prerequisites:      # edge b -> a
        adj[b].append(a)
        indegree[a] += 1

    queue = deque(c for c in range(numCourses) if indegree[c] == 0)
    taken = 0

    while queue:
        course = queue.popleft()
        taken += 1
        for nxt in adj[course]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    return taken == numCourses
```

### Trace — Example 1: `numCourses = 2, prerequisites = [[1,0]]`

| Step | adj | indegree | Queue | Action |
|---|---|---|---|---|
| Build | `0: []`, `1: [0]` | `[0, 1]` | `[0]` | Edge 0→1: course 0 is unlocked by nobody |
| Pop 0 | — | — | `[]` | `taken=1`; neighbor 1: indegree 1→0, enqueue |
| Pop 1 | — | — | `[]` | `taken=2` |
| Done | `taken (2) == numCourses (2)` → **`true`** ✓ | | | |

### Trace — Example 2: `numCourses = 2, prerequisites = [[1,0],[0,1]]`

| Step | adj | indegree | Queue | Action |
|---|---|---|---|---|
| Build | `0: [1]`, `1: [0]` | `[1, 1]` | `[]` | Neither course has indegree 0 |
| Done | `taken (0) == numCourses (2)`? No → **`false`** ✓ | | | |

The queue never even starts — the two courses form a mutual-wait cycle, which Kahn's detects instantly by counting.

### Self-loop check: `numCourses = 3, prerequisites = [[1,1]]`

indegree = `[0, 1, 0]`. Queue starts as `[0, 2]`; both get taken (`taken = 2`), but course 1's indegree never drops → `2 != 3` → `false`. Handled for free.

---

## 6. Optimal Approach #2 — DFS with Three Colors

If your interviewer asks for DFS specifically (or you want to demonstrate range), use the **three-color** technique. This is the fix for the naive-visited false-cycle bug from §3.

- **WHITE (0):** unvisited.
- **GRAY (1):** currently on the recursion stack (in progress). This is the crucial state.
- **BLACK (2):** fully explored and confirmed acyclic — safe to reuse.

**Cycle iff** DFS reaches a GRAY node. If we hit a BLACK node, that subtree was already proven cycle-free — return without re-exploring (this is the memoization that makes it O(V + E)).

```python
def canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:
    adj = [[] for _ in range(numCourses)]
    for a, b in prerequisites:          # edge b -> a (must finish b before a)
        adj[b].append(a)

    UNVISITED, IN_PROGRESS, DONE = 0, 1, 2
    color = [UNVISITED] * numCourses

    def dfs(node: int) -> bool:         # True = no cycle found from here
        if color[node] == IN_PROGRESS:  # back edge to stack -> CYCLE
            return False
        if color[node] == DONE:         # already verified safe
            return True
        color[node] = IN_PROGRESS
        for nxt in adj[node]:
            if not dfs(nxt):
                return False
        color[node] = DONE              # all descendants checked
        return True

    return all(dfs(c) for c in range(numCourses) if color[c] == UNVISITED)
```

### Trace — Example 2: `[[1,0],[0,1]]`, edges `0→1` and `1→0`

| Call | Color before | What happens |
|---|---|---|
| `dfs(0)` | all WHITE | Color 0 = GRAY; visit neighbor 1 |
| `dfs(1)` | 0 GRAY | Color 1 = GRAY; visit neighbor 0 |
| `dfs(0)` | 0 **GRAY** | 0 is on the stack → back edge → **cycle** → `False` ✓ |

### Trace — Example 1: `[[1,0]]`, edge `0→1`

- `dfs(0)`: 0 → GRAY → `dfs(1)`: 1 → GRAY (no neighbors) → 1 → BLACK → return True. Then 0 → BLACK → True.
- `dfs(1)`: already BLACK → True. Overall `true` ✓. Note node 1 was *not* re-explored.

**Recursion-depth caveat:** with `numCourses = 2000` and a worst-case chain of 2000 nodes, Python's default recursion limit (~1000) can be hit. Either raise it (`sys.setrecursionlimit(3000)`) or prefer the iterative Kahn's — one more reason Kahn's is the primary recommendation.

---

## 7. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (all permutations) | O(V! · E) | O(V) | Never viable; illustrative only |
| Naive DFS per node, no memo | up to O(V·E) (and exponential without careful reuse) | O(V) | Also **incorrect** with only a global visited set |
| Kahn's (BFS topological sort) | **O(V + E)** | **O(V + E)** | Each node dequeued once, each edge relaxed once |
| Three-color DFS | **O(V + E)** | **O(V + E)** + O(V) stack | Each node/edge visited once; recursion depth up to V |

All quantities are asymptotic in V = `numCourses`, E = `len(prerequisites)`. With the given constraints (V ≤ 2000, E ≤ 5000), both optimal approaches run in well under a millisecond.

---

## 8. Common Mistakes

1. **Reversing the edge direction.** For `[a, b]`, the edge is `b → a`. It doesn't affect the `true/false` answer (a cycle exists in a graph iff it exists in its reverse), but it *does* matter if the interviewer follow-up asks you to **return an actual valid ordering** (LeetCode 210) — there the order of output is graded.
2. **Using only a single `visited` boolean in DFS.** Marking nodes visited and never unmarking reports false cycles on DAGs like `A→B, A→C, B→D, C→D` — node D is reached twice but lies on no cycle. You need the gray/black distinction.
3. **Off-by-one on array sizing.** `indegree = [0] * (numCourses - 1)` or iterating `range(numCourses - 1)` silently skips the last course. Courses are labeled `0 .. numCourses - 1` inclusive.
4. **Assuming `prerequisites` is non-empty** and crashing on `prerequisites[0]` — the empty-list case must return `true`.
5. **Forgetting the `taken == numCourses` check** in Kahn's and instead returning `true` unconditionally after the BFS loop.
6. **Mutating a shared visited/color array between outer DFS loop iterations** incorrectly — the outer loop must skip nodes already colored DONE, or you redo work (still correct, just slower) or, worse, reset colors and re-explore (correct but O(V·E)).

---

## 9. Implementation Gotchas Beyond Python

| Language | Gotcha |
|---|---|
| **Java** | Prefer `ArrayDeque<Integer>` as the queue, not `Stack` (legacy, synchronized) and not `LinkedList` for hot loops. `Queue<Integer>` interface + `ArrayDeque` is idiomatic. Autoboxing ints into `ArrayDeque<Integer>` is fine here at this scale, but for larger inputs a primitive `int[]` queue with head/tail indices avoids boxing entirely. |
| **Java** | Recursive DFS on a 2000-node chain is fine with the JVM's default stack, but a hand-rolled iterative DFS with an explicit stack is safer and interview-defensible. |
| **C++** | Use `vector<vector<int>> adj(numCourses);` — *not* `vector<vector<int>> adj(numCourses, {})` subtleties aside, the real trap is reserving/pushing correctly. Don't build `vector<vector<int>>` with the wrong constructor arg order (`(numCourses, vector<int>())` is fine; `(numCourses, numCourses)` is not). |
| **C++** | If using `queue<int>` from `<queue>`, remember `front()` + `pop()` are two separate calls — a common `pop()`-then-`front()` on an empty-queue bug. |
| **All** | Multiple identical edges don't occur here (pairs are unique), but if a variant allowed duplicates, Kahn's still works only if `indegree` is incremented once per duplicate edge — the decrement loop naturally matches. Just never "dedupe" edges while counting indegree naively. |

---

## 10. Test Cases to Propose Out Loud

Announce these before/after coding — it signals rigor:

| Case | Input | Expected | What it stress-tests |
|---|---|---|---|
| Example 1 | `2, [[1,0]]` | `true` | Simple linear chain |
| Example 2 | `2, [[1,0],[0,1]]` | `false` | 2-cycle |
| **Empty prerequisites** | `5, []` | `true` | All courses independent; empty-list handling |
| **Self-loop** | `3, [[1,1]]` | `false` | 1-cycle; must not return `true` just because a node exists |
| **Disconnected components** | `6, [[1,0],[3,2],[5,4]]` | `true` | Three independent chains; outer loop must cover all components (Kahn's seeds all indegree-0 nodes; DFS outer loop iterates all nodes) |
| **Acyclic diamond** | `4, [[2,0],[2,1],[3,2],[3,1]]`... i.e., edges into shared node | `true` | Node reached from two DFS roots — catches the naive-visited false-positive bug |
| **Long chain** | `2000` courses chained `i → i+1` | `true` | Recursion depth (Python DFS without raised limit) |
| **One big cycle** | courses `0→1→…→1999→0` | `false` | Nobody has indegree 0; Kahn's exits with `taken = 0` |

---

## 11. Transferable Patterns & Related Problems

**Pattern: "Can a set of tasks with dependencies be completed?" → topological sort / cycle detection.** This pattern generalizes far beyond courses: build systems, package resolution, job scheduling, spreadsheet formula evaluation.

**Related problems (a study ladder):**

| Problem | Relationship |
|---|---|
| LC 210 — Course Schedule II | Same setup, but *return the ordering*; Kahn's gives it free (record dequeue order) |
| LC 269 — Alien Dictionary | Harder: derive edges from string comparison, then topological sort; must also detect *contradiction* vs *underdetermination* |
| LC 802 — Find Eventual Safe States | Reverse-graph three-color DFS / topological peeling |
| LC 444 — Sequence Reconstruction | Verify a unique topological order |
| LC 1136 — Project Management (premium) | Longest path on a DAG = longest completion time |
| LC 2360 — Longest Cycle in a Graph | Functional-graph variant; cycle detection on out-degree-1 graphs |

**Reusable takeaways:** (1) dependency pairs → directed edges; (2) "possible to complete all" ↔ "no directed cycle"; (3) Kahn's = iterative, cycle-detects by counting; (4) three-color DFS = the correct way to memoize cycle checks.

---

## 12. Fuller Talk Track (for the "say it out loud" phase)

> "Let me restate: pairs like `[a, b]` mean b before a. So I'll draw a directed edge b → a — b unlocks a. Taking all courses is possible exactly when this directed graph has **no cycle**, because a cycle means courses mutually waiting on each other. The classic algorithm for this is **topological sort**. I'll use Kahn's: count each course's indegree — how many prerequisites it has; anything with indegree zero I can take immediately. Take it, decrement the indegree of everything it unlocks, and any course whose count hits zero joins the queue. If I take all `numCourses` courses, return true; if I run dry with courses left, they're in a cycle — return false. Build takes O(E), the BFS processes each node and edge once, so **O(V + E) time, O(V + E) space**. Edge cases: empty prerequisites returns true, a self-loop returns false, and disconnected components are handled because I seed the queue with *every* indegree-zero node, not just one. If you'd like, I can also show the DFS three-color version, or extend this to output the actual ordering."

---

## 13. Say It in 60 Seconds

> "Each pair `[a, b]` is a directed edge b → a — b unlocks a. So 'can I finish all courses?' is just 'does this graph have a cycle?' I'll run Kahn's topological sort: count indegrees, start a queue with all courses that have zero prerequisites, and each time I take a course, decrement the indegree of everything it unlocks — anything that drops to zero gets enqueued. If I take every course, true. If I get stuck with courses remaining, those leftovers form a cycle — false. Linear time in nodes plus edges, linear space. Handles empty prerequisites, self-loops, and disconnected components for free, and the same idea extends to returning the actual course order."

---

**One-line summary:** *Model prerequisites as directed edges b → a; the answer is `true` iff the graph is acyclic, which Kahn's BFS (or three-color DFS) decides in O(V + E).*
