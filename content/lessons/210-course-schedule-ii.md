# Course Schedule II (LeetCode 210) — A Complete Interview Lesson

**One-line summary:** Each pair `[a, b]` is a directed edge `b → a` ("b before a"); the task is a **topological sort** of the dependency graph, returning `[]` exactly when the graph has a **cycle**.

---

## 1. Problem Restated (in your own words)

You have `numCourses` courses labeled `0 … numCourses-1`. Each entry in `prerequisites` is a pair `[a, b]` meaning: *to take `a`, you must already have taken `b`*. You must return **any linear ordering of all courses** consistent with every such constraint. If no such ordering exists (some courses mutually depend on each other), return an empty list.

Restating out loud in an interview sounds like:

> "This is a set of *before* constraints between labeled items. I need a sequence where every item appears after everything it depends on. If the constraints contradict each other, there's no valid sequence, and I return empty."

Two clarifying observations worth saying explicitly:

- **Multiple valid answers exist** and are all accepted (the judge validates the answer, it doesn't string-match an array).
- Courses with **no prerequisites and no dependents** (never appearing in `prerequisites`) must still appear in the output — anywhere is fine.

---

## 2. Decoding the Constraints

| Constraint | What it really says | Design consequence |
|---|---|---|
| `1 <= numCourses <= 2000` | Small vertex count: `V ≤ 2000` | `O(V²) = 4·10⁶` is affordable; even an adjacency matrix is conceivable (but unnecessary) |
| `prerequisites.length <= n(n-1)` | Up to `≈ 2000 × 1999 ≈ 4·10⁶` edges — a nearly complete digraph | Must be ~`O(V + E)`; anything like `O(V · E)` is `≈ 8·10⁹` steps and will TLE (judges typically allow on the order of `10⁸` elementary operations per second, so 8·10⁹ is ~80× over budget) |
| All pairs distinct | No duplicate edges | Indegree counting is exact; no dedup step needed |
| `a_i != b_i` | No self-loops | A course can't be its own prerequisite — but note that the optimal code below *still handles a self-loop gracefully* if the constraint were relaxed |
| Labels are `0 … n-1` | Dense integer IDs | Use course **values** directly as **array indices** — no hash map needed |
| "Any valid answer" | Checker-based judging | Never compare your output to a literal expected array in your own tests; validate by rules instead |

**Indices vs. values — a precision point candidates fumble:** in `prerequisites[i] = [a, b]`, `a` and `b` are course *values*, but because the labels are exactly `0 … n-1`, those values double as array indices. When you write `a, b = pair`, `a` is the **dependent** and `b` is the **prerequisite** — you index `adj[b]` and increment `indeg[a]`. Mixing up which one is which is the single most common bug in this problem (see §9).

---

## 3. Brute Force (with a worked trace)

### 3.1 Idea 1: Enumerate permutations

Try every ordering of the `n` courses; return the first one satisfying all pairs.

- There are `n!` candidate orderings (that's just the number of permutations of `n` items), each checked against `E` pairs → `O(n! · E)`. Since `20! ≈ 2.4·10¹⁸`, this dies long before `n = 2000`. **Dead on arrival.**

### 3.2 Idea 2: "Repeatedly take whatever is available" — the natural first instinct

Algorithm:

1. Repeat until all courses are taken: scan the remaining prerequisite pairs to find a course whose prerequisites are **all already taken** ("available").
2. Take one such course, mark it taken.
3. If a full pass finds no available course but courses remain → **impossible**, return `[]`.

This is actually the right *concept* — it's just implemented the slow way.

**Worked trace on Example 2:** `numCourses = 4`, `prerequisites = [[1,0],[2,0],[3,1],[3,2]]`
(meaning: 1 needs 0; 2 needs 0; 3 needs 1 and 2)

| Round | Taken so far | Availability check | Action |
|---|---|---|---|
| 1 | `{}` | 0: no prereqs → available. 1: needs 0 ✗. 2: needs 0 ✗. 3: needs 1,2 ✗ | take **0** |
| 2 | `{0}` | 1: 0 taken ✓ → available. 2: ✓ available. 3: ✗ | take **1** |
| 3 | `{0,1}` | 2: ✓ available. 3: needs 2 ✗ | take **2** |
| 4 | `{0,1,2}` | 3: 1 and 2 taken ✓ | take **3** |

Output: `[0, 1, 2, 3]` — correct, and it *is* a topological order. But notice the waste: **every round rescans every pair.**

**Cycle behavior:** `numCourses = 2`, `prerequisites = [[0,1],[1,0]]` — Round 1: 0 needs 1 (not taken), 1 needs 0 (not taken). No available course, 2 remain → return `[]`. ✓ Correctly detects impossibility.

**Cost:** up to `V` rounds × `O(E)` scan per round = `O(V · E) ≈ 2000 × 4·10⁶ = 8·10⁹` → TLE. The fix is mechanical and instructive: **maintain each course's unmet-prerequisite count incrementally**, and keep a queue of courses whose count just hit zero. That upgrade *is* Kahn's algorithm.

---

## 4. The Core Insight

1. **Model it as a directed graph.** For each pair `[a, b]`, add edge `b → a` (`b` must precede `a`).
2. **A valid ordering exists ⟺ the graph has no directed cycle (it's a DAG).**
   - If a cycle exists, no order works: whichever course of the cycle you list first still has an unmet prerequisite later in the list. Contradiction.
   - If no cycle exists, a topological order always exists — every DAG has a node with **indegree 0** (otherwise, walking backwards along incoming edges forever in a finite graph would revisit a node, creating a cycle), so you can always start, and induction finishes the argument.
3. **"Any valid order" = topological sort**, computable in `O(V + E)` by two classic algorithms: **Kahn's BFS** and **DFS reverse-postorder**.

### A tempting wrong idea: "just sort by number of prerequisites"

Sorting courses statically by indegree fails, because **indegree is a dynamic frontier, not a static rank**. Counterexample (`n = 7`): pairs `[0,2],[0,3],[0,4],[0,5],[0,6],[1,0]` — i.e., 2,3,4,5,6 each must precede 0, and 0 must precede 1. Indegrees: `0→5`, `1→1`, others `0`. Sorting ascending by indegree gives `[2,3,4,5,6,1,0]` — but that puts 1 before 0, violating `[1,0]`. Course 1 has *fewer* prerequisites than course 0 yet must come *after* it. Only the "peel zero-indegree nodes as they appear" discipline is correct.

---

## 5. Optimal Approach A — Kahn's Algorithm (BFS Topological Sort)

### Algorithm

1. Build adjacency list: for each pair `[a, b]`, `adj[b].append(a)` (edge `b → a`), and `indeg[a] += 1`.
2. Seed a queue with every course whose `indeg == 0` (no unmet prerequisites). **Includes isolated courses automatically** because arrays are sized `numCourses`.
3. Pop `u`, append to `order`, then for each `v ∈ adj[u]`: decrement `indeg[v]`; if it hits 0, enqueue `v`.
4. If `len(order) == numCourses`, return `order`; otherwise the leftover courses are stuck in a cycle → return `[]`.

### Traces on the official examples

**Example 1** — `n = 2`, `[[1,0]]` → edge `0→1`, `indeg = [0, 1]`:

| Step | Pop | `order` | Updates | Queue after |
|---|---|---|---|---|
| init | — | `[]` | — | `[0]` |
| 1 | 0 | `[0]` | `indeg[1]: 1→0`, enqueue 1 | `[1]` |
| 2 | 1 | `[0,1]` | — | `[]` |

`len(order) == 2` → return `[0,1]` ✓

**Example 2** — `n = 4`, `[[1,0],[2,0],[3,1],[3,2]]` → edges `0→1, 0→2, 1→3, 2→3`, `indeg = [0,1,1,2]`:

| Step | Pop | `order` | Updates | Queue after |
|---|---|---|---|---|
| init | — | `[]` | — | `[0]` |
| 1 | 0 | `[0]` | `indeg[1]: 1→0` (enq), `indeg[2]: 1→0` (enq) | `[1,2]` |
| 2 | 1 | `[0,1]` | `indeg[3]: 2→1` | `[2]` |
| 3 | 2 | `[0,1,2]` | `indeg[3]: 1→0` (enq) | `[3]` |
| 4 | 3 | `[0,1,2,3]` | — | `[]` |

Return `[0,1,2,3]`. Note `[0,2,1,3]` is equally valid — which one you emit depends on neighbor/queue order. Both are accepted.

**Example 3** — `n = 1`, no pairs: `indeg = [0]`, queue `[0]` → return `[0]` ✓

**Cycle** — `n = 2`, `[[0,1],[1,0]]`: `indeg = [1,1]`, queue starts **empty** → `order = []` → return `[]` ✓

**Why early queue exhaustion proves a cycle:** every unprocessed node still has positive current indegree, and all its remaining incoming edges come from other *unprocessed* nodes — so the leftover subgraph has every vertex with indegree ≥ 1, which (backward-walk argument) must contain a cycle.

### Python code (primary solution)

```python
from collections import deque
from typing import List

class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        # Pair [a, b]  =>  "b before a"  =>  edge b -> a
        adj = [[] for _ in range(numCourses)]
        indeg = [0] * numCourses
        for a, b in prerequisites:
            adj[b].append(a)          # b is the prerequisite
            indeg[a] += 1             # a is the dependent

        # Every course with zero unmet prerequisites starts ready.
        # Isolated courses (never in `prerequisites`) land here too.
        q = deque(u for u in range(numCourses) if indeg[u] == 0)
        order = []

        while q:
            u = q.popleft()
            order.append(u)
            for v in adj[u]:          # v depended on u
                indeg[v] -= 1
                if indeg[v] == 0:     # all of v's prerequisites now done
                    q.append(v)

        # Emitted everything => valid order. Queue drained early => cycle.
        return order if len(order) == numCourses else []
```

Notes:

- Pairs are distinct per constraints, so `indeg[v]` never goes negative and `== 0` fires exactly once per node. Even if duplicates *were* allowed, keeping the duplicate in `adj` keeps increments and decrements consistent — the bug only appears if you dedupe one structure but not the other.
- A relaxed self-loop `[x, x]` is handled for free: `indeg[x] ≥ 1` forever, `x` is never enqueued, and you correctly return `[]`.

---

## 6. Optimal Approach B — DFS with 3 Colors + Reverse Postorder

**States:** `0 = UNVISITED`, `1 = VISITING` (on the current recursion stack), `2 = DONE` (fully explored). A neighbor found in state `VISITING` is a **back edge → cycle**.

**Why reverse postorder is a valid order:** with edges `b → a`, any edge `u → v` in a DAG satisfies `finish(v) < finish(u)` — either `v` was unvisited (its DFS runs entirely inside `u`'s call, so it finishes first), or `v` is already `DONE` (finished even earlier). It can't be `VISITING` — that's a back edge, i.e., a cycle. So the postorder lists every dependent before its prerequisite; reversing fixes it.

### Recursive version

```python
from typing import List

class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(numCourses)]
        for a, b in prerequisites:          # [a, b] => edge b -> a
            adj[b].append(a)

        UNVISITED, VISITING, DONE = 0, 1, 2
        state = [UNVISITED] * numCourses
        post = []

        def dfs(u: int) -> bool:
            state[u] = VISITING
            for v in adj[u]:
                if state[v] == VISITING:    # back edge => cycle
                    return False
                if state[v] == UNVISITED and not dfs(v):
                    return False
            state[u] = DONE
            post.append(u)                  # dependents of u finish before u
            return True

        for u in range(numCourses):         # loops over ALL nodes: covers
            if state[u] == UNVISITED and not dfs(u):   # isolated courses too
                return []
        return post[::-1]                   # reverse postorder
```

**Trace, Example 1** (`adj[0] = [1]`): `dfs(0)` → `dfs(1)` (no neighbors, `post=[1]`) → back in `dfs(0)`, `post=[1,0]` → reversed → `[0,1]` ✓
**Trace, cycle** (`n=2`, `[[0,1],[1,0]]`, `adj[0]=[1], adj[1]=[0]`): `dfs(0)` marks 0 VISITING → `dfs(1)` marks 1 VISITING → neighbor 0 is **VISITING** → cycle → `[]` ✓

### Iterative variant (recursion-proof)

```python
def findOrder_iterative(numCourses: int, prerequisites: list[list[int]]) -> list[int]:
    adj = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        adj[b].append(a)

    UNVISITED, VISITING, DONE = 0, 1, 2
    state = [UNVISITED] * numCourses
    post = []
    for start in range(numCourses):
        if state[start] != UNVISITED:
            continue
        state[start] = VISITING
        stack = [(start, 0)]                      # (node, next-child index)
        while stack:
            u, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, i + 1))          # resume u later
                v = adj[u][i]
                if state[v] == VISITING:
                    return []                     # back edge
                if state[v] == UNVISITED:
                    state[v] = VISITING
                    stack.append((v, 0))
            else:
                state[u] = DONE
                post.append(u)
    return post[::-1]
```

---

## 7. Complexity

| Approach | Time | Space | Ops at max constraints (`V=2000, E≈4·10⁶`) | Verdict |
|---|---|---|---|---|
| Permutation enumeration | `O(n! · E)` | `O(n)` | astronomically large | reject |
| Repeated availability scan | `O(V · E)` | `O(V + E)` | `≈ 8·10⁹` | TLE |
| **Kahn's BFS** | **`O(V + E)`** | **`O(V + E)`** | `≈ 4·10⁶ + 2000` | **optimal** |
| **DFS 3-color** | **`O(V + E)`** | `O(V + E)` + recursion stack | same | optimal (mind depth) |

Each course is enqueued/dequeued at most once and each edge is decremented/examined exactly once in Kahn's; DFS similarly visits each node and edge once.

**Why `O(V + E)` is optimal:** any correct algorithm must read every prerequisite pair — a single unread pair could be the one edge that creates a cycle and flips the answer to `[]` — and it must write out `n` course labels, so `Ω(V + E)` work is unavoidable.

---

## 8. Implementation Gotchas Across Languages

| Language | Gotcha |
|---|---|
| **Python** | Default recursion limit is ~1000, but a 2000-course chain drives DFS depth to 2000 → `RecursionError`. Prefer Kahn's, use the iterative DFS, or `sys.setrecursionlimit(numCourses + 100)`. |
| **Python** | Don't build `adj` as a dict keyed by courses seen in `prerequisites` — isolated courses silently vanish and your output will be short or raise `KeyError`. Always size arrays by `numCourses`. |
| **Java** | Use `ArrayDeque<Integer>`, not the legacy `synchronized` `Stack`. If course IDs are ever stored as `Integer` objects, `==` compares references and fails outside the autobox cache (−128..127); IDs go up to 1999 — compare with `int` locals or `.equals()`. |
| **C++** | Size `vector<vector<int>> adj(numCourses)` (labels are 0-indexed); the 1-indexed habit `adj(n+1)` wastes memory and the opposite slip `adj(n-1)` breaks index `n-1`. Also prefer the `vector` adjacency over `unordered_map<int, vector<int>>` — keys are dense `0..n-1`, and hashing adds overhead and hurts cache locality. |

---

## 9. Common Mistakes (ranked by frequency)

1. **Reversed edge direction.** `[a, b]` means *b first*, so the edge is `b → a` and `indeg[a] += 1`. Self-check that always works: the **first** course emitted must have no prerequisites (Example 1's answer must start with `0`). If you consistently build `a → b` instead, you get a *reverse* topological order — fine only if you reverse the result; mixing the two conventions is the actual bug.
2. **DFS with a single boolean `visited`** instead of 3 states. Both failure modes occur: treating any visited neighbor as a cycle causes **false positives** on cross-edges into finished nodes; skipping visited neighbors causes **false negatives** — e.g., an entry node `C → A → B → A`: from `C`, `B`'s edge to the already-visited `A` gets skipped and the cycle is never reported.
3. **Returning a partial order on a cycle** instead of `[]` — e.g., forgetting the `len(order) == numCourses` check in Kahn's.
4. **Dropping isolated courses** by deriving your data structures only from `prerequisites` (§8, Python row). Courses that never appear in pairs still must be emitted.
5. **Forgetting to reverse the DFS postorder** (with `b → a` edges). Test on Example 1: raw postorder is `[1, 0]` — backwards.
6. **Python recursion depth** on a long chain (§8).
7. **`if indeg[v] <= 0` vs `== 0`** — equivalent here because pairs are distinct; but if duplicates were allowed and you deduped `adj` without deduping `indeg` (or vice versa), counts drift and nodes get enqueued twice or never.
8. **Testing by comparing arrays literally.** `[0,1,2,3]` and `[0,2,1,3]` are both correct for Example 2 — compare with a validator, not `==` against one fixed answer.

---

## 10. Test Cases to Propose Out Loud

Say these before/while coding — interviewers explicitly reward this:

| # | Input | Expected | What it exercises |
|---|---|---|---|
| 1 | `n=2, [[1,0]]` | `[0,1]` | Official Ex. 1 — basic chain; sanity-checks edge direction |
| 2 | `n=4, [[1,0],[2,0],[3,1],[3,2]]` | `[0,1,2,3]` or `[0,2,1,3]` | Official Ex. 2 — diamond; multiple valid answers |
| 3 | `n=1, []` | `[0]` | Official Ex. 3 — no edges |
| 4 | `n=2, [[0,1],[1,0]]` | `[]` | Direct 2-cycle |
| 5 | `n=4, [[1,0],[2,1],[3,2],[1,3]]` | `[]` | Longer cycle `1→2→3→1` reachable from an acyclic tail |
| 6 | `n=3, [[2,1]]` | any order with `1` before `2` (e.g., `[0,1,2]`) | **Isolated course 0 must still appear** |
| 7 | `n=5, []` | any permutation | All isolated; also a degenerate stress input |
| 8 | `n=2000` chain `[[1,0],[2,1],…]` | chain order | Recursion-depth / performance stress |

Because "any valid answer" is accepted, validate with a rule-based checker:

```python
def is_valid(num_courses: int, prerequisites: list[list[int]], order: list[int]) -> bool:
    # order must be a permutation of 0..n-1 (correct length, no dups/omissions)
    if len(order) != num_courses or set(order) != set(range(num_courses)):
        return False
    pos = [0] * num_courses                 # course value -> its index in `order`
    for i, c in enumerate(order):
        pos[c] = i
    return all(pos[b] < pos[a] for a, b in prerequisites)

# usage
# assert is_valid(2, [[1,0]], Solution().findOrder(2, [[1,0]]))
# assert Solution().findOrder(2, [[0,1],[1,0]]) == []
```

Edge cases to verbalize:

- **2-cycle** (`[[0,1],[1,0]]`) — smallest impossible instance; queue starts empty.
- **Isolated courses / empty `prerequisites`** — must appear in the output.
- **Self-loop** `[0,0]` — excluded by constraints, but "my code returns `[]` for it anyway with no special case" is a nice thing to say.

---

## 11. Transferable Patterns & Related Problems

**Patterns you just learned (reusable verbatim):**

- **Dependency graph + Kahn's peel:** maintain a dynamic "ready frontier" instead of rescanning — the same upgrade-from-brute-force move as multi-source BFS and flood fill.
- **3-color DFS cycle detection:** `VISITING` neighbor = back edge = cycle.
- **Reverse postorder = topological order** — the backbone of build systems, package managers, and spreadsheet recalculation.
- **Kahn's by layers:** process the queue level-by-level to get "rounds/semesters."
- **Reverse the edges** to flip which direction you peel from (safe states, leaf-peeling).

**Direct relatives:**

| Problem | What changes |
|---|---|
| LC 207 Course Schedule I | Same graph; only feasibility (bool) is needed — Kahn's with a counter, no `order` list |
| LC 269 Alien Dictionary | Nodes are *letters* → first map chars to indices; extra invalid case: a word that is a prefix-extension contradiction (`["abc","ab"]` → `""`) |
| LC 1136 Parallel Courses | Kahn's **by BFS layers**; answer = number of layers (semesters) |
| LC 444 Sequence Reconstruction | Topo order must be **unique** → the ready queue must hold exactly one node at every step |
| LC 802 Find Eventual Safe States | Reverse the graph and Kahn-peel; never-peeled nodes are unsafe (in/leading into cycles) |
| LC 310 Minimum Height Trees | Same "peel the frontier" idea, but peeling **degree-1 leaves** inward |
| LC 2115 Find All Possible Recipes | Supplies are the initial zero-indegree seed set |
| LC 1203 Sort Items by Groups | Two-level topo sort (items within groups, groups among themselves), then merge |

---

## 12. Full Interview Talk Track (the script)

> **Restate & clarify:** "Each pair `[a, b]` means course `b` must come before course `a`. I need any sequence of all courses consistent with every pair — or empty if the constraints contradict. Pairs are distinct, no self-loops, and courses that never appear in pairs still have to show up somewhere in the answer."
>
> **Brute force:** "Naively I could repeatedly scan for a course whose prerequisites are all satisfied and take it. That works — let me trace it on Example 2 — but each round rescans every pair, so it's `O(V·E)`, around 8 billion steps at these limits. Too slow."
>
> **Insight:** "The reframing: each pair is a directed edge `b → a`. A valid ordering exists exactly when this graph has no cycle — and any such ordering is a topological sort. So the problem decomposes into *build the graph, topologically sort, detect cycle*."
>
> **Choose the algorithm:** "I'll use Kahn's algorithm rather than DFS — it's iterative, so no recursion-depth concerns in Python, and cycle detection falls out for free: if the queue drains before I've emitted all `n` courses, whatever's left is stuck in a cycle. I count each course's unmet prerequisite count, seed a queue with the zero-count courses — isolated courses land here automatically — then pop, append to the answer, and decrement dependents, enqueuing anything that hits zero."
>
> **Narrate the code** as you write it: name the two arrays (`adj`, `indeg`), point at the unpacking line "`a` is the dependent, `b` is the prerequisite — this is where the classic direction bug lives," and at the final return: "length check equals cycle check."
>
> **Dry-run** Example 2 aloud using the queue contents (§5 table), then run Example 1 and the 2-cycle `[[0,1],[1,0]]` — "queue starts empty, so I correctly return empty."
>
> **Tests:** "I'd also try a longer cycle, a single isolated course, and a 2000-node chain for stress. Since any valid answer is accepted, I'd verify with a checker: output is a permutation of `0..n-1` and every pair has the prerequisite earlier."
>
> **Complexity:** "`O(V+E)` time and space — each course and each pair is touched once. That's optimal, since a single unread pair could be the cycle, and I have to write out all `n` labels anyway."

---

## 13. Say It in 60 Seconds

> "Each prerequisite pair `[a, b]` means course `b` comes before course `a` — so it's a directed edge `b → a`, and the whole problem becomes: does this dependency graph have a cycle? No cycle means any topological order answers it; a cycle means it's impossible, return empty. My go-to is Kahn's algorithm: count each course's remaining prerequisites as an indegree, seed a queue with the zero-indegree courses — the ones with no prerequisites — then repeatedly pop one, append it to the answer, and decrement the courses that depend on it, enqueuing any that drop to zero. If I emit all `numCourses` courses, that order is valid; if the queue drains while courses remain, everything left is trapped in a cycle, so I return empty. Time and space are `O(V + E)` — every course and pair touched once — which is optimal, since you can't skip reading an edge. Two gotchas I watch for: the edge direction — `[a, b]` means *b* first — and isolated courses that never appear in `prerequisites` must still land in the answer."
