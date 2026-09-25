# Reconstruct Itinerary (LeetCode 332) — Complete Lesson

## 1. Problem restatement (what is actually being asked)

Strip away the story and you have a graph problem:

- Each ticket `tickets[i] = [from_i, to_i]` is a **directed edge** in a multigraph whose vertices are 3-letter airport codes.
- You must produce a sequence of airports `A[0..E]` (where `E = len(tickets)`) such that:
  - `A[0] == "JFK"` (fixed start vertex),
  - every **consecutive pair** `(A[k], A[k+1])` is one of the given tickets,
  - every ticket is used **exactly once** — so the answer has exactly `E + 1` airports,
  - among all such sequences, return the **lexicographically smallest**.

Two precision points people gloss over:

- **Values, not indices.** Airports are string *values* used as graph keys. Nothing in the optimal solution ever indexes into `tickets` after building the graph. (Ticket *indices* only matter if you track a `used[]` array in the brute force.)
- **Duplicates are real.** Two identical tickets `["JFK","ATL"], ["JFK","ATL"]` are two **parallel edges**. Your structure must be a multiset of edges (a list with two `"ATL"` entries is the easiest representation), and "use once" means *remove one copy per traversal*.
- Airports **may repeat** in the answer — in Example 2, `JFK` appears twice. Only *tickets* are single-use, never *airports*.

One beautiful consequence worth saying out loud: because every ticket is used, **every valid itinerary contains the exact same multiset of airports** — airport `v` appears exactly `outdeg(v) + (1 if v is the final airport else 0)` times. Only the *ordering* varies, and that's all the lexicographic tie-break is choosing.

## 2. Decoding the constraints

| Constraint | What it tells you algorithmically |
|---|---|
| `tickets[i] = [from_i, to_i]` | Directed edges; `A→B` and `B→A` are different tickets. |
| `1 ≤ len(tickets) ≤ 300` | `E ≤ 300`, so `O(E log E)` is trivially fast; answer length ≤ 301. But don't let the small bound fool you — the *concept* (Eulerian path) is the interview target. |
| Itinerary must begin at `"JFK"` | Fixed start vertex `s`. |
| "All tickets form at least one valid itinerary" | A valid Eulerian trail is **guaranteed** → skip existence checks (no need to verify degree conditions or connectivity). |
| "Use all tickets once and only once" | **Edges are the resource, not vertices.** This is the fingerprint of an Eulerian path — *not* a Hamiltonian path, *not* DFS-over-airports with visited sets. |
| Multiple answers → smallest lexical order | Sort adjacency lists; always consume the smallest available destination first (with a mechanism that keeps the result *valid* — see §4). |
| `from_i != to_i` | No self-loops. The algorithm handles self-loops anyway; nothing to exploit here. |
| Codes are 3 uppercase letters | Only 26³ = 17,576 possible airports; `V ≤ E + 1 ≤ 301` distinct airports (each non-start airport needs an incoming ticket to appear). Plain string comparison is correct since all codes have equal length. |

## 3. Brute force that actually works: sorted backtracking (with a trace)

**Idea.** Build adjacency lists, sort each ascending, then DFS from `"JFK"`, trying destinations in ascending order. Use a ticket by removing it from the list; on failure, put it back (backtrack). The first complete path found has length `E + 1`; because candidates are tried smallest-first, the DFS explores prefixes in lexicographic order, so the first complete itinerary found is the lexicographically smallest one.

```python
from collections import defaultdict
from typing import List

def findItinerary_bruteforce(tickets: List[List[str]]) -> List[str]:
    graph = defaultdict(list)
    for src, dst in tickets:              # read values, not indices
        graph[src].append(dst)            # duplicates stay as parallel entries
    for nbrs in graph.values():
        nbrs.sort()                       # ascending: try smallest first

    n = len(tickets)
    path = ["JFK"]

    def backtrack(v: str) -> bool:
        if len(path) == n + 1:            # E tickets -> E + 1 airports
            return True
        for w in list(graph[v]):          # snapshot: we mutate graph[v] below
            graph[v].remove(w)            # consume ONE copy of ticket v->w
            path.append(w)
            if backtrack(w):
                return True
            path.pop()                    # undo
            graph[v].append(w)
            graph[v].sort()               # restore sorted order
        return False

    backtrack("JFK")
    return path
```

**Worked trace — the "trap" example** `tickets = [["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]` (not an official example, but the most instructive input in this problem). Adjacency (ascending): `JFK: [KUL, NRT]`, `NRT: [JFK]`. Expected: `["JFK","NRT","JFK","KUL"]`.

1. Try `KUL` (smallest): `path = [JFK, KUL]`. `KUL` has no outgoing tickets and `len(path) = 2 < 4` → dead end. **Backtrack**: restore `KUL`.
2. Try `NRT`: `path = [JFK, NRT]` → `JFK`: `path = [JFK, NRT, JFK]` → `KUL`: `path = [JFK, NRT, JFK, KUL]`, length 4 = `E + 1` → **success**.

Return `["JFK","NRT","JFK","KUL"]`. ✓ (Note: `["JFK","KUL",...]` would have been a lexicographically *smaller prefix* but is not completable — keep this in mind for §4.4.)

On Example 2 the same backtracking succeeds on its very first greedy dive (see §5 trace) — no undo ever fires.

**Complexity.** Worst-case time is bounded by the number of ways to order the `E` tickets — at most `E!`, since every leaf of the backtracking tree is a distinct ticket ordering; the "valid itinerary exists" guarantee prunes many inputs in practice but not all, and `E = 300` makes the worst case hopeless. Space is `O(E)` for the path and graph. (Minor wart: duplicate tickets cause the identical subattempt to be re-explored twice; harmless here, dedupe if you care.)

This solution is **correct** and passes, but it's not the answer an interviewer wants. The next section is the actual lesson.

## 4. The core insight

### 4.1 The fingerprint: "use every ticket exactly once"

A walk that uses **every edge of a graph exactly once** is an **Eulerian trail** (here: a directed one, on a multigraph, starting at `JFK`). Euler's classical degree condition — necessary because each visit to an intermediate airport consumes exactly one incoming and one outgoing ticket — says a directed graph has such a trail from `s` iff every vertex is balanced (`indeg == outdeg`) except `s` with `outdeg(s) = indeg(s) + 1` (or everything is balanced and the trail is a circuit ending at `s`), with all edges in one reachable component. The problem's guarantee means these hold; you never check them.

So: **E = tickets are edges, find the Eulerian trail from JFK, lexicographically smallest.** That reframing is the first "senior signal" in this problem.

### 4.2 Why the naive greedy fails

"Always fly to the smallest available destination and record airports as you go" (pre-order) walks straight into the trap:

- On `[["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]`: greedy produces `JFK → KUL`, gets stuck at `KUL` with the ticket `NRT → JFK` still unused. The greedy prefix `["JFK","KUL",...]` is *lexicographically tempting* but **incompletable**: any valid itinerary must visit `KUL` **last** (it has in-degree 1, out-degree 0 — it is degree-forced to be the endpoint).

Backtracking fixes this by undoing the mistake, at exponential worst-case cost. Hierholzer's idea is to never make the mistake in the first place.

### 4.3 The fix: append in post-order, reverse at the end

Run the greedy DFS exactly as before (always pop the smallest destination), but **append an airport to the answer only when its list of outgoing tickets is empty** (post-order), then **reverse** the list at the end.

Why this is right — two lemmas you should be able to defend:

**Lemma 1 (the first dead end is the true final airport).** Suppose the DFS first lands on a vertex `v` with no unused outgoing ticket. Count ticket uses at `v` so far: every arrival consumed an in-ticket, every departure an out-ticket, and every arrival except the current one was followed by a departure.

- If `v ≠ JFK`: `out_used(v) = in_used(v) − 1`, with `out_used(v) = outdeg(v)` (stuck) and `in_used(v) ≤ indeg(v)`, so `outdeg(v) ≤ indeg(v) − 1`. The only vertex with `outdeg − indeg = −1` is the degree-forced final airport `t`. So `v = t`.
- If `v = JFK`: total arrivals would equal `outdeg(JFK)`. In the path case `outdeg(JFK) = indeg(JFK) + 1 > indeg(JFK)` — impossible. In the circuit case `outdeg = indeg` and ending at `JFK` is exactly correct (the trail is a circuit).

Either way: **the first airport to run out of tickets is where the trip must end.** The greedy "mistake" isn't a mistake — it's a discovery of the *end* of the itinerary. The DFS appends it and simply continues elsewhere; no backtracking is ever needed.

**Lemma 2 (exhaustion order, reversed, is the itinerary).** Each airport is appended exactly when all of its outgoing tickets are consumed. Reading the route list backwards: the final airport is appended first (Lemma 1), `JFK` is appended last, and each excursion the DFS launches from a still-alive stack vertex is a closed ride that returns to its launch point (at that moment the unused tickets around it balance out), so the reversed list is the main path with loops spliced in at their earliest touch point — precisely the classical construction of **Hierholzer's algorithm (1873)**. You can also sanity-check the counts: every popped ticket spawns exactly one recursive call, every call appends exactly once, so airport `x` appears `indeg(x)` times (plus once more if `x = JFK`) — matching the fixed multiset from §1.

### 4.4 Why it's still the lexicographically smallest

Two facts compose:

1. The airport **multiset** of any valid itinerary is fixed (§1), so lex order is decided purely by ordering choices.
2. At every state, the algorithm effectively takes the **smallest choice that can still be completed**. A choice that would strand tickets cannot appear at that position in *any* valid itinerary — and the post-order mechanism automatically relocates such doomed material to the **tail** of the route (see the trace below: `KUL`, grabbed greedily first, ends up *last*). Since the forced deferral is also the lex-optimal placement, greedy-smallest + post-order yields the lexicographically smallest trail.

A full proof is an exchange argument on the first index where another itinerary diverges — beyond what you need in an interview — but you should be able to (a) state the claim, (b) defend the intuition, and (c) demonstrate it on the `KUL` example.

## 5. Optimal solution

**Algorithm.**
1. Build adjacency: `graph[src].append(dst)` for each ticket (parallel edges = duplicate entries).
2. Sort each adjacency list **descending**, so `list.pop()` (O(1)) removes the **smallest** destination.
3. DFS from `"JFK"`: while the current airport has tickets, pop the smallest and recurse; when exhausted, append the airport to `route`.
4. Reverse `route` and return.

```python
from collections import defaultdict
from typing import List

def findItinerary(tickets: List[List[str]]) -> List[str]:
    graph = defaultdict(list)
    for src, dst in tickets:
        graph[src].append(dst)

    # Sort DESCENDING so list.pop() (O(1)) yields the SMALLEST destination.
    for nbrs in graph.values():
        nbrs.sort(reverse=True)

    route = []                            # built back-to-front

    def dfs(airport: str) -> None:
        while graph[airport]:
            dfs(graph[airport].pop())     # smallest unused ticket first
        route.append(airport)             # post-order: append when exhausted

    dfs("JFK")
    route.reverse()                       # exhaustion order -> itinerary order
    return route
```

Iterative variant (same algorithm, explicit stack — the form to reach for when constraints make recursion depth a real risk, e.g., CSES "Teleporters Path" with 10⁵ edges):

```python
def findItinerary_iter(tickets: List[List[str]]) -> List[str]:
    graph = defaultdict(list)
    for src, dst in tickets:
        graph[src].append(dst)
    for nbrs in graph.values():
        nbrs.sort(reverse=True)

    stack, route = ["JFK"], []
    while stack:
        if graph[stack[-1]]:                       # still has unused tickets
            stack.append(graph[stack[-1]].pop())   # smallest first
        else:                                      # exhausted -> finalize
            route.append(stack.pop())
    return route[::-1]
```

(`graph[stack[-1]]` on an unseen airport auto-creates an empty list via `defaultdict` — harmless.)

### Trace on Example 1
`tickets = [["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]`

One straight chain: `JFK→MUC→LHR→SFO→SJC`, stuck at `SJC`. `route = [SJC, SFO, LHR, MUC, JFK]` → reversed → `["JFK","MUC","LHR","SFO","SJC"]` ✓

### Trace on Example 2
`tickets = [["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"],["ATL","SFO"]]`
Adjacency (descending): `JFK: [SFO, ATL]` · `ATL: [SFO, JFK]` · `SFO: [ATL]`

| Step | Action (pop = use smallest ticket) | `route` after |
|---|---|---|
| 1 | `dfs(JFK)`: pop `ATL`, fly to ATL | — |
| 2 | `dfs(ATL)`: pop `JFK`, fly to JFK | — |
| 3 | `dfs(JFK)`: pop `SFO`, fly to SFO | — |
| 4 | `dfs(SFO)`: pop `ATL`, fly to ATL | — |
| 5 | `dfs(ATL)`: pop `SFO`, fly to SFO | — |
| 6 | `dfs(SFO)`: no tickets → append, return | `[SFO]` |
| 7 | `dfs(ATL)` exhausted → append | `[SFO, ATL]` |
| 8 | `dfs(SFO)` exhausted → append | `[SFO, ATL, SFO]` |
| 9 | `dfs(JFK)` exhausted → append | `[SFO, ATL, SFO, JFK]` |
| 10 | `dfs(ATL)` exhausted → append | `[SFO, ATL, SFO, JFK, ATL]` |
| 11 | `dfs(JFK)` exhausted → append | `[SFO, ATL, SFO, JFK, ATL, JFK]` |

Reverse → `["JFK","ATL","JFK","SFO","ATL","SFO"]` ✓ — the lexicographically smaller of the two valid itineraries.

### Trace on the trap example
`tickets = [["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]` — adjacency (descending): `JFK: [NRT, KUL]` · `NRT: [JFK]`

| Step | Action | `route` after |
|---|---|---|
| 1 | `dfs(JFK)`: pop `KUL` (the smallest — the "trap") | — |
| 2 | `dfs(KUL)`: no tickets → append | `[KUL]` |
| 3 | `dfs(JFK)`: pop `NRT` | `[KUL]` |
| 4 | `dfs(NRT)`: pop `JFK` | `[KUL]` |
| 5 | `dfs(JFK)` exhausted → append | `[KUL, JFK]` |
| 6 | `dfs(NRT)` exhausted → append | `[KUL, JFK, NRT]` |
| 7 | `dfs(JFK)` exhausted → append | `[KUL, JFK, NRT, JFK]` |

Reverse → `["JFK","NRT","JFK","KUL"]` ✓. Watch what happened: `KUL`, grabbed greedily *first*, was parked at the *front of the route list* — which is the *end of the trip*. The deferral is automatic; no undo, no wasted work.

## 6. Complexity

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Sorted backtracking (§3) | Exponential worst case — at most `E!` ticket orderings explored | `O(E)` | Correct; unacceptable worst case at `E = 300` |
| **Hierholzer + sorted lists (recommended)** | **`O(E log E)`** | **`O(E + V)`** | Sorting dominates; traversal is `O(E)` |
| Hierholzer + per-node min-heaps | `O(E log E)` | `O(E + V)` | Same asymptotics; nice when the graph streams in |
| Hierholzer + counting sort over 26³ codes | `O(E + 26³)` | `O(E + V)` | Micro-optimization; codes are only 17,576 possible values |

Why the traversal is `O(E)`: each ticket is popped from an adjacency list **exactly once**, each pop creates exactly one `O(1)` recursive call, and there are exactly `E + 1` appends. Why `O(E log E)` overall: sorting all lists costs `Σ d_v log d_v ≤ E log E` (comparison sorting has an `Ω(E log E)` lower bound in the comparison model, since there are `E!` possible orders — so you can't beat the sort by much without radix tricks). Recursion depth ≤ `E + 1 = 301`, comfortably under Python's ~1000 default limit — but know the iterative form for general inputs.

## 7. Common mistakes and language gotchas

1. **Building the route in pre-order** (appending on *entry*). This is the greedy that dies at `KUL`. The entire trick is **post-order + reverse**.
2. **Sort-direction / pop-direction bug.** Sorting ascending and calling `list.pop()` pops the **largest**. Either sort descending and `pop()`, or ascending and `pop(0)` (O(d) per pop), or use a heap. Silent wrong answers, no exceptions.
3. **Treating it as a vertex problem.** Marking *airports* visited, or thinking "Hamiltonian path." Airports repeat; **tickets** are the single-use resource.
4. **Breaking on duplicates.** A `set` of tickets, or a `dict[(src,dst)] → bool` toggled incorrectly, silently drops the second `["JFK","A"]`. A list with `pop()` handles the multiset naturally. Related: `graph[v].remove(w)` inside `for w in graph[v]` mutates the list while iterating — iterate over a snapshot.
5. **Forgetting to reverse** (or reversing the adjacency lists instead of `route`, or reversing twice).
6. **Off-by-one on completeness.** `E` tickets ⟹ exactly `E + 1` airports; the brute-force base case checks `len(path) == n + 1`.
7. **Python `defaultdict` side effects:** `graph[v]` during traversal inserts empty lists for unseen airports. Harmless for the algorithm; just don't iterate the dict afterwards expecting the original key set.
8. **Recursion depth as a habit:** fine here (≤ 301), but on other platforms/problems (e.g., 10⁵-edge Eulerian tasks) recursive Hierholzer overflows the stack — convert to the explicit-stack form.

### Java / C++ gotchas

| Language | Gotcha | Detail |
|---|---|---|
| C++ | `multiset::erase(key)` removes **all** copies | With duplicate tickets, `ms.erase("ATL")` wipes every `ATL`. Use `ms.erase(ms.find("ATL"))` to erase exactly one. |
| C++ | `vector` pop direction | A list sorted ascending + `pop_back()` pops the **largest**. Sort with `greater<>()` or pay an O(d) shift popping `begin()`. |
| Java | `PriorityQueue` order guarantees | `poll()` yields the smallest ✓, but *iterating* a `PriorityQueue` does **not** yield sorted order (heap order) — never iterate it to inspect "remaining" tickets. |
| Java | NPE on terminal airports | `map.get(v).poll()` NPEs when `v` has no entry; use `getOrDefault` / `computeIfAbsent`. (Python's `defaultdict` does this silently — same logic, softer failure.) |
| Java/C++ | Recursion depth | ≤ 301 frames here — fine; for larger inputs, use the explicit-stack version. |

## 8. Test plan: say these out loud before (or right after) coding

Propose the official examples plus these edge cases unprompted — it signals you understand duplicates, terminals, and the trap:

| # | Input | Expected output | What it guards against |
|---|---|---|---|
| 1 | `[["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]` | `["JFK","MUC","LHR","SFO","SJC"]` | Official Ex. 1; simple chain, terminal airport with no out-tickets |
| 2 | `[["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"],["ATL","SFO"]]` | `["JFK","ATL","JFK","SFO","ATL","SFO"]` | Official Ex. 2; lex tie-break, repeated airports |
| 3 | `[["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]` | `["JFK","NRT","JFK","KUL"]` | **Dead-end trap**; proves post-order deferral (a pure greedy fails here) |
| 4 | `[["JFK","SFO"]]` | `["JFK","SFO"]` | Single ticket; `E + 1 = 2` length; missing-key access on terminal |
| 5 | `[["JFK","A"],["JFK","A"],["A","JFK"]]` | `["JFK","A","JFK","A"]` | **Duplicate (parallel) tickets** must both be usable |
| 6 | `[["JFK","A"],["A","JFK"]]` | `["JFK","A","JFK"]` | Circuit: `JFK` is both start **and** final airport (appended twice, correctly) |

```python
tests = [
    ([["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]],
     ["JFK","MUC","LHR","SFO","SJC"]),
    ([["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"],["ATL","SFO"]],
     ["JFK","ATL","JFK","SFO","ATL","SFO"]),
    ([["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]], ["JFK","NRT","JFK","KUL"]),
    ([["JFK","SFO"]], ["JFK","SFO"]),
    ([["JFK","A"],["JFK","A"],["A","JFK"]], ["JFK","A","JFK","A"]),
    ([["JFK","A"],["A","JFK"]], ["JFK","A","JFK"]),
]
for t, want in tests:
    assert findItinerary(t) == want and len(findItinerary(t)) == len(t) + 1, t
print("all tests pass")
```

Also state the follow-up you'd handle if the guarantee were removed: check `outdeg − indeg` is `+1` at `JFK`, `−1` at exactly one vertex (or all zero), and that all tickets are reachable from `JFK` — otherwise report no solution.

## 9. Transferable patterns and related problems

| Pattern | Essence | Shows up in |
|---|---|---|
| **Eulerian-trail modeling** | "Use every **edge** exactly once" ⟹ edges are the resource; degrees decide feasibility | LC 2097 *Valid Arrangement of Pairs* (pairs → directed edges, same Hierholzer, no lex constraint); LC 753 *Cracking the Safe* (de Bruijn graph, Eulerian circuit); CSES *Mail Delivery* (undirected) / *Teleporters Path* (directed, needs the iterative form) |
| **Hierholzer's algorithm** | Greedy DFS + post-order append + reverse = `O(E)` trail, no backtracking | This problem; undirected variants (Fleury's algorithm is the O(E²) undirected cousin — it pays O(E) per step for bridge checks) |
| **Reverse post-order assembly** | Build the answer when *leaving* a node, not when entering, then flip | Topological sort via DFS (LC 210 *Course Schedule II*): same "append on finish, reverse" skeleton; LC 269 *Alien Dictionary* builds on that machinery |
| **Greedy with forced deferral** | Take the smallest feasible choice; infeasible choices get pushed to the tail automatically | Lex-smallest variants of construction problems; general "lexicographically smallest feasible object" questions |
| **Multigraph discipline** | Duplicates = parallel edges; lists-with-pop for free | Any graph problem whose input can contain repeated pairs |

If an interviewer follows up with *"why is this polynomial when it smells like Hamiltonian path?"* — the answer is exactly the edge/vertex distinction: using all **edges** once is Eulerian (degree conditions + Hierholzer, easy); using all **vertices** once is Hamiltonian (NP-hard in general).

## 10. Full interview talk track

**Beat 1 — reframe (15s).** "Each ticket is a directed edge, and I must use every ticket exactly once. Edges being the single-use resource tells me this is an **Eulerian path** from JFK — not a simple path over airports, since airports can repeat. The answer has exactly `len(tickets) + 1` airports."

**Beat 2 — clarify (10s).** "Two quick questions: duplicate tickets — I'll treat them as parallel edges. And since a valid itinerary is guaranteed, I don't need to check Eulerian degree conditions or connectivity, though in a real system I would."

**Beat 3 — the naive idea and its failure (20s).** "'Lex smallest' means always fly to the smallest available destination — so sort adjacency lists and greedily pop the smallest. But pure greedy fails: on `JFK→KUL, JFK→NRT, NRT→JFK`, it flies to KUL first and gets stranded, while `NRT→JFK` is unused. KUL is degree-forced to be the *final* airport — a smaller-looking prefix that can't be completed."

**Beat 4 — the insight (30s).** "The fix is Hierholzer's algorithm. DFS greedily, but append each airport to the answer only when it has **no tickets left** — post-order — and reverse at the end. Why it works: the first airport to run out of tickets must be the trip's final stop — counting arrivals versus departures, it's the only vertex with one more in-edge than out-edge, so getting 'stuck' there is not a failure, it's a discovery. Everything that dead-ends early gets parked at the tail of the route, which is exactly where a valid itinerary is forced to put it. And since every valid itinerary uses the same multiset of airports, taking the smallest completable choice at every step gives the lexicographically smallest one."

**Beat 5 — code (60–90s).** Write the recursive version from §5 while narrating the three tricks: descending sort so `pop()` yields the smallest; `route.append` after the `while`; `reverse()` at the end.

**Beat 6 — trace + tests (30s).** Run Example 2 aloud, then the KUL trap: "KUL gets appended first, which makes it *last* in the trip." Then list the edge tests: single ticket, duplicate tickets, circuit ending back at JFK.

**Beat 7 — complexity (10s).** "Each ticket is popped once, so the traversal is O(E); sorting is O(E log E) and dominates. Space O(E). Recursion depth is at most tickets-plus-one, and I can convert to an explicit stack if constraints were bigger."

## 11. Say it in 60 seconds

> "Tickets are directed edges and I have to use every one exactly once — that's an Eulerian path starting at JFK, and 'lex smallest' just means always pick the smallest destination first, so I sort the adjacency lists. Pure greedy fails, though: the smallest choice can strand you at a dead-end airport while tickets remain — like flying JFK–KUL too early. The fix is Hierholzer's algorithm: DFS greedily, but append each airport to the answer only when it has no unused tickets left — post-order — then reverse at the end. Why that works: the first airport to run out of tickets must be the trip's final airport — counting arrivals versus departures, it's the only vertex with one more in-edge than out-edges — so dead ends aren't failures, they get parked at the tail of the route, which is exactly where a valid itinerary has to put them. That also keeps the result lexicographically smallest, since every valid itinerary uses the same multiset of airports and this takes the smallest completable choice at each step. Each ticket is popped once, so traversal is O(E), plus O(E log E) for sorting, O(E) space. Depth is bounded by ticket count, and I can switch to an explicit stack if needed."
