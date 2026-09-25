# Walls and Gates (LeetCode 286) — Multi-Source BFS, End to End

## 1. Problem, restated in your own words

You're handed an `m x n` grid where each cell holds exactly one of three sentinel values:

- `-1` → wall (impassable, never changes)
- `0` → gate (a source; never changes)
- `2147483647` (`2^31 - 1`, i.e., `INT_MAX`, written `INF`) → an empty room that must be **overwritten in place** with the minimum number of 4-directional steps to its **nearest** gate. Rooms that can't reach any gate stay `INF`.

> **Indices vs. values — keep these straight.** The queue stores **positions** `(r, c)`. The **value** `rooms[r][c]` tells you what the cell *is* (`-1` / `0` / `INF`) and, after processing, *how far* it is from a gate. Every condition in this problem (`== 0`, `== -1`, `== INF`) is a test on **values**, while every neighbor computation `(r±1, c±1)` is arithmetic on **indices**. Mixing these up is the #1 source of subtle bugs.

The function returns nothing — the output *is* the mutated input grid (LeetCode 286's signature is `void`). Confirm with the interviewer: "I'll modify `rooms` in place — that matches the expected output; okay?"

## 2. Decoding the constraints

| Constraint | What it's telling you |
|---|---|
| `1 <= m, n <= 250` | ≤ 62,500 cells total. An **O(mn)** solution is instant; an **O((mn)²)** solution is ~3.9 × 10⁹ cell-visits — effectively dead in Python and a bad look in an interview. Target linear. |
| `rooms[i][j] ∈ {-1, 0, 2^31−1}` | The grid is ternary. `INF = INT_MAX` is chosen so it can never collide with a real distance: a shortest route never revisits a cell (unweighted graph), so it uses ≤ `mn − 1` moves, i.e., ≤ 62,499 here — vastly below `INF`. That's exactly why `value == INF` can safely double as the "unclaimed empty room" test. |
| "distance to nearest gate" | **Multi-target shortest path**. Unweighted steps → BFS, not Dijkstra (Dijkstra would only add a log factor for nothing). |
| Example shows adjacent room of a gate = `1` | Distance counts **moves**; moves are 4-directional (up/down/left/right, no diagonals — state this assumption out loud). |
| Unreachable rooms stay `INF` | A room sealed behind walls must be left untouched — a good algorithm gets this "for free." |

## 3. Brute force: BFS from every empty room

**Idea:** for each empty room, run its own BFS (through non-wall cells) until a gate is popped; the pop distance is the answer. If no gate is ever reached, leave `INF`.

```python
from collections import deque

def walls_and_gates_bruteforce(rooms):
    m, n = len(rooms), len(rooms[0])
    INF = 2147483647
    for r in range(m):
        for c in range(n):
            if rooms[r][c] != INF:
                continue                     # walls/gates don't need distances
            q = deque([(r, c, 0)])
            seen = {(r, c)}
            while q:
                cr, cc, d = q.popleft()
                if rooms[cr][cc] == 0:       # popped a gate -> nearest found
                    rooms[r][c] = d
                    break
                for nr, nc in ((cr-1, cc), (cr+1, cc), (cr, cc-1), (cr, cc+1)):
                    if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] != -1 and (nr, nc) not in seen:
                        seen.add((nr, nc))
                        q.append((nr, nc, d + 1))
            # loop exhausted with no gate -> rooms[r][c] correctly stays INF
```

**Worked trace** on Example 1, for the single room `(1, 1)` (value `INF`):

| BFS layer | Cells at this distance (indices) | Notes |
|---|---|---|
| 0 | `(1,1)` | start; value `INF` |
| 1 | `(1,0)`, `(1,2)` | N/S neighbors `(0,1)`, `(2,1)` are walls (value `-1`) |
| 2 | `(0,0)`, `(2,0)`, `(2,2)`, then `(0,2)` is popped → **value 0, it's a gate** | stop; `rooms[1][1] = 2` ✓ |

**Complexity:** there can be up to `mn` empty rooms (9 in Example 1), and each runs an O(mn) BFS → **O((mn)²)** time, O(mn) space. At 250 × 250 that's ~3.9 × 10⁹ steps. Correct, but quadratic — this is the "state it, cost it, then beat it" opener.

## 4. The trap: DFS from each gate

The tempting middle ground: DFS from every gate, writing `d` as you go, with the guard "only proceed if `rooms[r][c] > d`" (walls and other gates naturally block since their values `< d`).

```python
def dfs(rooms, r, c, d):
    if r < 0 or r >= len(rooms) or c < 0 or c >= len(rooms[0]) or rooms[r][c] < d:
        return
    rooms[r][c] = d
    for dr, dc in ((1,0), (-1,0), (0,1), (0,-1)):
        dfs(rooms, r + dr, c + dc, d + 1)
```

- **Without** the guard this is flat-out **wrong**: whichever gate's DFS reaches a cell first wins, so answers depend on gate iteration order.
- **With** the guard it's *correct* — it's label-correcting relaxation — but it's not the answer you should lead with. Stack-ordered (LIFO) label-correcting shortest-path relaxation has no linear guarantee: cells get re-expanded every time a later, shorter wave improves them, and LIFO label-correcting is even known to admit exponential worst cases on adversarial graphs (the classic Pape's-algorithm counterexample family). On top of that, recursion depth reaches 62,500 — a `RecursionError` in Python (limit ≈ 1000) and a real stack-overflow risk in C++.

Present DFS only as "a correct-but-fragile fallback; BFS is provably linear, so that's what I'll implement."

## 5. The core insight — invert the search, share the search

> **Don't search from every room to its nearest gate. Search from all gates at once, and let them share one BFS.**

- **Multi-source BFS:** seed the queue with *every* gate at distance 0, then expand exactly like normal BFS. This is equivalent to adding an imaginary **super-source** node connected to every gate with a 0-length edge and running one ordinary BFS — mixing sources in one queue is legal precisely because of that equivalence.
- **Why first-touch is final:** BFS pops cells in nondecreasing distance order (the queue holds at most two consecutive layer values `d`, `d+1` at any time). By induction over layers, when a cell at true distance `k` is first generated, it's generated from a layer-`k−1` cell; any *shorter* path from some other gate would have had to claim it earlier via a layer-`k−1`-or-closer cell that was dequeued before the current one. So the first value written is the minimum — later waves from farther gates can never beat it. (Ties are harmless: equal distance is still correct.)
- **No visited array needed:** the grid is its own visited/distance structure. `rooms[nr][nc] == INF` simultaneously means *"empty room, not a wall, not a gate, unclaimed."* One check does four jobs. Every other value (`1..62499`, `0`, `-1`) is never re-entered.
- Unreachable rooms are handled for free: BFS never touches them, so they keep `INF`.

Same pattern family: 01 Matrix, Rotting Oranges, As Far from Land as Possible (see §12).

## 6. Optimal algorithm: multi-source BFS

### 6.1 Steps

1. Scan the grid once; enqueue **every** gate `(r, c)` (all of them — this is the whole point).
2. While the queue is nonempty: pop `(r, c)`; read `d = rooms[r][c]` (a real distance: `0` for gates, `≥ 1` for claimed rooms).
3. For each 4-neighbor in bounds with value `== INF`: write `d + 1` into it **and enqueue it** (stamp-at-enqueue ⇒ each cell enters the queue at most once — zero duplicates by construction).
4. Terminate. Touched rooms hold their nearest-gate distance; untouched rooms hold `INF`; walls/gates are unchanged.

### 6.2 Python (in-place, LeetCode-style)

```python
from collections import deque
from typing import List

class Solution:
    def wallsAndGates(self, rooms: List[List[int]]) -> None:
        INF, GATE = 2147483647, 0
        m, n = len(rooms), len(rooms[0])

        # 1) Seed with EVERY gate (multi-source).
        q = deque(
            (r, c) for r in range(m) for c in range(n) if rooms[r][c] == GATE
        )

        # 2) One shared BFS wavefront.
        while q:
            r, c = q.popleft()
            d = rooms[r][c]                    # distance lives in the cell itself
            for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] == INF:
                    rooms[nr][nc] = d + 1      # claim + record in one write
                    q.append((nr, nc))
```

Note: `d + 1` is only ever computed for **dequeued** cells, whose values are real distances ≤ 62,499 — never for a cell still holding `INF`. (This matters in fixed-width-integer languages; see §10.)

### 6.3 Variant: don't use the grid as visited

If the interviewer forbids writing distances during the search (or you want cleaner separation), carry the distance in the queue and keep a `dist` matrix, copying back only over `INF` cells at the end:

```python
def walls_and_gates_pure(rooms):
    m, n = len(rooms), len(rooms[0])
    INF = 2147483647
    dist = [[INF] * n for _ in range(m)]
    q = deque()
    for r in range(m):
        for c in range(n):
            if rooms[r][c] == 0:
                dist[r][c] = 0
                q.append((r, c))
    while q:
        r, c = q.popleft()
        d = dist[r][c]
        for nr, nc in ((r-1, c), (r+1, c), (r, c-1), (r, c+1)):
            if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] != -1 and dist[nr][nc] == INF:
                dist[nr][nc] = d + 1
                q.append((nr, nc))
    for r in range(m):
        for c in range(n):
            if rooms[r][c] == INF:
                rooms[r][c] = dist[r][c]
```

Notice this variant now needs **two** neighbor conditions (`!= -1` *and* `dist == INF`) because the separate matrix no longer encodes walls — the in-place version's single `== INF` check is doing more work than it appears to.

## 7. Traces on the official examples

### Example 1

```
INF  -1   0  INF
INF INF INF  -1
INF  -1  INF  -1
  0  -1  INF  INF
```
Gates at `(0,2)` and `(3,0)` — both seeded at distance 0.

| Wavefront `d` | Cells claimed with value `d` | Claimed from |
|---|---|---|
| 0 | `(0,2)`, `(3,0)` | seeds |
| 1 | `(0,3)`, `(1,2)`, `(2,0)` | `(0,2)`, `(3,0)` |
| 2 | `(1,1)`, `(2,2)`, `(1,0)` | `(1,2)`, `(2,0)` |
| 3 | `(0,0)`, `(3,2)` | `(1,0)`, `(2,2)` |
| 4 | `(3,3)` | `(3,2)` |

Snapshots (cells still `INF` shown as `?`) — watch **two wavefronts collide**:

```
after d=1:            after d=2:            final:
 ?   -1   0   1       ?   -1   0   1       3   -1   0   1
 1   ?   1  -1       2   2   1  -1       2   2   1  -1
 1  -1   ?  -1       1  -1   2  -1       1  -1   2  -1
 0  -1   ?   ?       0  -1   ?   ?       0  -1   3   4
```

`(1,1)` gets `2` from the top gate's wave before the bottom gate's wave (which would give `4` via `(3,0)→(2,0)→(1,0)`) could matter — first touch wins, and both happen to agree it's `2` here. Matches the expected output exactly. Note the 9 empty rooms claimed across layers 1–4 are precisely the 9 `INF` cells the brute force would have launched 9 separate BFS runs from.

### Example 2

`[[-1]]`: the gate scan finds no gates → queue starts empty → loop never runs → return `[[-1]]` untouched. One line of tracing; the point is that **no special-casing is needed**.

## 8. Complexity

| Approach | Time | Extra space | Verdict |
|---|---|---|---|
| BFS from every empty room | O((mn)²) — ≤ 62,500 sources × O(mn) each | O(mn) visited | Quadratic; ~3.9 × 10⁹ steps at max size |
| DFS from each gate + relax-if-smaller | No linear guarantee (LIFO label-correcting; see §4) | O(mn) recursion stack | Correct but fragile |
| Dijkstra from super-source | O(mn log(mn)) | O(mn) | Overkill: edges are unweighted |
| **Multi-source BFS (chosen)** | **O(mn)** — seed scan O(mn); each cell enqueued ≤ once (stamped at enqueue), ≤ 4 neighbor checks per pop | **O(mn)** queue worst case; O(1) beyond the grid if the grid doubles as visited (O(mn) for the `dist` variant) | Optimal |

## 9. Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Seeding BFS from **one** gate only | Distances are "to *that* gate," not nearest — e.g., `[0,INF,INF,INF,0]` yields `[0,1,2,3,4]` instead of `[0,1,2,1,0]` | Enqueue **all** gates in the initial scan |
| DFS from gates **without** the `value > d` guard | Answers depend on gate processing order — silently wrong | Either add the guard (and accept §4's fragility) or use BFS |
| Marking visited on **dequeue** instead of **enqueue** | Same cell enqueued up to 4× (correct but wasteful queue blowup) | Stamp the cell at the moment you append it |
| Missing bounds check or the wall check (`-1`) | Index errors or leaking "through" walls | One compound condition: in-bounds **and** `== INF` |
| Computing `INF + 1` (Java `Integer.MAX_VALUE + 1` wraps negative; C++ `INT_MAX + 1` is **UB**) | Negative distances, corrupted grid | Only relax from dequeued cells with real values, or carry `d` in the queue tuple |
| Recursive DFS in Python | `RecursionError` — a 62,500-deep path exceeds the ~1000 default limit | Iterative BFS |
| `list.pop(0)` for the queue | O(n) per pop → accidentally O((mn)²) | `collections.deque` |
| Assuming straight-line / Manhattan distance | Walls force detours; heuristic answers are wrong in mazes | BFS through open cells is the point of the problem |
| Forgetting unreachable rooms (e.g., pre-filling everything, then no restore) | Sealed rooms get garbage values | Don't touch untouched cells — BFS leaves them `INF` naturally |
| Assuming diagonal moves | Off-by-design distances | Moves are 4-directional; say so out loud |

## 10. Java / C++ / Python gotchas

| Language | Gotcha |
|---|---|
| **Java** | Use `ArrayDeque<int[]>`, not `LinkedList` (fewer allocations, better cache behavior). Never write `rooms[nr][nc] = rooms[r][c] + 1` where the source could still hold `Integer.MAX_VALUE` — it wraps to a negative number silently. |
| **C++** | `INT_MAX + 1` is undefined behavior, not wraparound — same discipline as Java (carry `d` in the queue or only relax real distances). Pass the grid by reference; a by-value `vector<vector<int>>` copy is 62,500 ints deep. Prefer `std::queue<std::pair<int,int>>`; avoid recursion (62.5k frames can overflow a 1–8 MB stack). |
| **Python** | `deque` for the queue (`list.pop(0)` is O(n)); recursion depth limit kills any DFS variant; `INF = 2147483647` is just an int, so the overflow trap doesn't exist — but keep the "never relax from an INF cell" discipline anyway for portability. |

## 11. Tests to propose out loud (before or right after coding)

| # | Input | Expected output | What it catches |
|---|---|---|---|
| T1 | Example 1 (4×4 above) | `[[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]` | General correctness, two colliding wavefronts |
| T2 | `[[-1]]` (Example 2) | `[[-1]]` | No gates, no empty rooms — must be a graceful no-op |
| T3 | `[[2147483647]]` — single empty room, **no gate anywhere** | unchanged | Empty queue path; unreachable room stays `INF` |
| T4 | `[[0, INF, INF, INF, 0]]` | `[0, 1, 2, 1, 0]` | **Multi-source seeding.** Single-gate bug produces `[0,1,2,3,4]`; also checks the middle cell ties at `2` |
| T5 | `[[0, -1], [-1, 2147483647]]` | unchanged | Sealed-off room never reached → stays `INF` |
| T6 | `[[0, INF, INF, -1, INF]]` (1×5) | `[0, 1, 2, -1, 2147483647]` | 1-row indexing; a wall splits a corridor and blocks the far room |
| T7 | `[[0,0],[0,0]]` | unchanged | No empty rooms at all |

Say out loud: *"T4 is my regression test for seeding all sources; T5 and T3 cover the 'impossible to reach a gate' clause; T6 covers thin-grid indexing and wall blocking."*

## 12. Transferable patterns & related problems

**Pattern names to drop in the interview:** *invert the search* (search from targets, not sources) · *multi-source / super-source BFS* · *BFS as a distance transform on unweighted graphs* · *grid as implicit graph* · *first-touch-finalizes* · *in-grid visited marking*.

| Problem | Relationship |
|---|---|
| LC 542 — 01 Matrix | Nearly isomorphic: multi-source BFS from all `0`s to fill nearest-zero distances |
| LC 994 — Rotting Oranges | Multi-source BFS; the answer is the number of layers (max distance), plus the "impossible → −1" unreachable case |
| LC 1162 — As Far from Land as Possible | Max-of-min: run the same multi-source BFS, then report the largest cell value |
| LC 317 — Shortest Distance from All Buildings | Inverted again: BFS from each *target* (building) and accumulate per-cell sums |
| LC 417 — Pacific Atlantic Water Flow | Two multi-source floods (two coastlines) with two boolean pass matrices |
| LC 130 — Surrounded Regions | Border-seeded flood fill (multi-source along the boundary) |
| LC 1091 — Shortest Path in Binary Matrix | Plain single-source BFS on a grid — the baseline before the multi-source upgrade |

**Likely follow-ups and one-line answers:** *Unequal edge weights (e.g., each step costs a value)?* → multi-source Dijkstra (or 0-1 BFS if weights are 0/1) from the super-source. *Need the actual path?* → store a parent pointer per claimed cell. *Can't mutate input?* → the `dist`-matrix variant in §6.3.

## 13. Full interview talk track (scripted)

> **Clarify:** "Grid of rooms: −1 walls, 0 gates, `INT_MAX` empty rooms. Overwrite each empty room in place with its step-distance to the nearest gate; unreachable ones stay `INT_MAX`. I'll assume 4-directional moves and in-place mutation — flag me if either is wrong."
>
> **Brute force, one breath:** "Naively, BFS from every empty room until I pop any gate. Up to one full-grid BFS per room — O((mn)²), ~4 billion steps at 250×250. Too slow, and most of that work is redundant."
>
> **Insight:** "The fix is to run the search in the other direction and share it. Every gate is a source at distance 0; throw all of them into one queue and run a single multi-source BFS — equivalently, BFS from an imaginary super-gate wired to every real gate. BFS peels the grid in distance layers, so the first time an expansion touches an empty room, that layer count is provably its distance to the *nearest* gate; a later wave from a farther gate can't arrive earlier. First touch finalizes the cell."
>
> **Visited trick:** "No visited array — the grid is my visited/distance structure. `value == INT_MAX` means *empty, unclaimed, not a wall, not a gate* in one check."
>
> **Code narration:** "Seed scan: every gate into the deque, O(mn). Pop, read `d` from the cell itself, push in-bounds neighbors whose value is still `INF`, writing `d + 1` at enqueue time — so each cell is enqueued at most once, no duplicates. Untouched rooms keep `INT_MAX` for free."
>
> **Close-out:** "O(mn) time — 62,500 cells touched once each — O(mn) queue worst case, O(1) extra beyond the grid. Quick tests: two gates in a row `[0, INF, INF, INF, 0]` must give `[0,1,2,1,0]` — that catches seeding only one source; a sealed room stays `INF`; a 1-row corridor with a wall in the middle."

## 14. Say it in 60 seconds

> "Every room needs its distance to the *nearest* gate, so searching from each room is redundant — that's quadratic. Flip it: put **all** gates in a queue at distance zero and run **one** multi-source BFS. BFS expands in distance layers, so the first time an empty room is reached, that layer count is exactly its distance to the nearest gate — later waves can't arrive earlier — so I claim each cell on first touch. I don't even need a visited array: writing the distance into the grid *is* the visit mark, and `INT_MAX` already means 'empty and unclaimed.' Walls and gates are never entered, and rooms BFS never reaches stay `INF`, which handles the unreachable case for free. Each cell is enqueued at most once, so it's O(mn) time, O(mn) queue space, mutating the grid in place as the problem expects. Edge cases I'd call out: no gates at all, a room sealed behind walls, a 1-row corridor split by a wall — and a two-gate grid to prove I seeded every source."
