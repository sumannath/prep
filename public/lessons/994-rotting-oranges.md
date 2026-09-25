# Rotting Oranges (LeetCode 994) — Complete Interview Lesson

## 1. Problem Restated (in your own words)

You have a grid where each cell holds one of three **values**:

| Value | Meaning |
|---|---|
| `0` | empty — rot can never occupy it, and it **blocks** spread |
| `1` | fresh orange — the thing we want to eliminate |
| `2` | rotten orange — a spread source |

Every minute, **simultaneously**, every fresh orange that is 4-directionally adjacent (up/down/left/right) to *some* rotten orange becomes rotten. Rot is permanent. The process is fully deterministic, so "return the **minimum** number of minutes" is really just "return the minute the last fresh orange dies" — there's only one possible timeline given the simultaneous rule.

**Formalization you should say out loud:** define `T(r, c)` = the minute cell `(r, c)` rots. Then:

- **Answer = max T over all fresh cells** (the last one to die sets the clock), or
- **−1** if any fresh cell has `T = ∞` (unreachable), or
- **0** if there are no fresh cells at all (Example 3).

Indices convention: `(r, c)` is 0-indexed, `r ∈ [0, m)`, `c ∈ [0, n)`. Always distinguish the **coordinate** `(r, c)` from the **value** `grid[r][c]` — most bugs in this problem come from blurring those two.

---

## 2. Constraint Decoding

| Constraint | What it tells you |
|---|---|
| `1 <= m, n <= 10` | ≤ 100 cells. A brute force at ~O((mn)²) ≈ 10⁴ ops passes easily. **But** the interviewer is testing whether you find the linear BFS anyway — treat the small bound as "you have time to get this *right*", not "cheap solution is fine." |
| `grid[i][j] ∈ {0, 1, 2}` | Tiny value domain → you can use the grid itself as your visited/roteness structure by mutating `1 → 2`. No separate visited set needed (unless mutating input is forbidden). |
| 4-directional | No diagonals. Hard-code a `DIRS` tuple of 4 offsets. |
| "Every minute, **any** fresh orange adjacent to a rotten one becomes rotten" | Simultaneous batch update. A BFS **level = one minute**. You must not let rot cascade within a single minute. |
| `m, n ≥ 1` | No empty-grid guard strictly required, but `len(grid[0])` assumes row 0 exists — cheap to defend anyway. |

**Answers to bound the search space:** since a cell's rot time is a shortest-path length in a graph with ≤ `mn` nodes, and shortest paths in unweighted graphs are simple (they never repeat a node), the answer is at most `mn − 1 ≤ 99` — so a plain `int` is safe in every language.

**Clarifying questions worth asking (they signal seniority):**
- "If there are **no fresh oranges at all**, the answer is 0, even if there are no rotten ones either — correct?" (Yes, per Example 3.)
- "Fresh oranges exist but **no rotten** ones → −1, correct?" (Yes.)
- "May I mutate the input grid, or should I use a separate visited structure?"

---

## 3. Brute Force: Minute-by-Minute Simulation

**Idea:** replay the rules literally. Each minute, scan the entire grid; every fresh cell with a rotten 4-neighbor at the **start** of that minute goes into a "to rot" buffer; after the scan, apply the buffer and increment the minute counter. Stop when a minute passes with nothing new rotting; then check for leftover fresh cells.

```python
def orangesRotting_bruteforce(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))
    minutes = 0

    while True:
        to_rot = []  # decide FIRST (from this minute's snapshot)...
        for r in range(m):
            for c in range(n):
                if grid[r][c] == 1 and any(
                    0 <= r + dr < m and 0 <= c + dc < n
                    and grid[r + dr][c + dc] == 2
                    for dr, dc in DIRS
                ):
                    to_rot.append((r, c))
        if not to_rot:
            break
        for r, c in to_rot:      # ...apply AFTER (preserves simultaneity)
            grid[r][c] = 2
        minutes += 1

    any_fresh = any(grid[r][c] == 1 for r in range(m) for c in range(n))
    return -1 if any_fresh else minutes
```

**The one subtle implementation point:** the `to_rot` buffer. If you mark cells rotten *while* scanning (in place), a chain `2 → 1 → 1` rots both fresh cells in **one** minute instead of two, because the second cell sees the first already marked. The buffer defers the write so every decision is made against the same snapshot.

### Worked trace on Example 1

`grid = [[2,1,1],[1,1,0],[0,1,1]]`

- **t=0:** rotten = {(0,0)}. Fresh cells = 6.
- **Minute 1:** fresh cells adjacent to (0,0) → `(0,1)`, `(1,0)` rot.

```
2 2 1
2 1 0
0 1 1
```
- **Minute 2:** `(0,2)` (adj. to (0,1)) and `(1,1)` (adj. to (0,1) and (1,0)) rot.

```
2 2 2
2 2 0
0 1 1
```
- **Minute 3:** only `(2,1)` (adj. to (1,1)). `(2,2)`'s neighbors are `(1,2)=0` and `(2,1)=1` — neither rotten *at the start of the minute*, so it must wait.

```
2 2 2
2 2 0
0 2 1
```
- **Minute 4:** `(2,2)` rots.

```
2 2 2
2 2 0
0 2 2
```
No fresh remains → **4**. ✓

### Complexity

Each minute rots at least one fresh cell (otherwise we break), so there are at most `mn + 1` minutes; each minute costs O(mn) to scan. Total **O((mn)²)** ≈ 10⁴ here — fine, but notice the waste: we re-scan the *whole grid* every minute to find the tiny set of cells on the spreading frontier. That observation is the bridge to the optimal solution: a queue maintains the frontier so each minute costs only O(frontier size), and every cell is touched a constant number of times total.

---

## 4. The Core Insight

**This is multi-source BFS in disguise.**

1. Think of every **initially rotten** orange as a BFS **source at time 0** (a virtual "super-source" node connected to all of them).
2. Rot spreads one 4-neighborhood ring per minute, and all edges have weight 1 minute. Therefore:

   > **The minute an orange rots = its BFS distance (in the graph of non-empty cells) to the *nearest* initially-rotten orange.**
3. So the answer is `max distance over fresh cells`, or −1 if some fresh cell is unreachable, or 0 if there are no fresh cells.

Three consequences worth internalizing:

- **Level = minute.** BFS levels are exactly the minute boundaries. Everything discovered at level `k` rots at minute `k`.
- **Empty cells are walls.** Rot never occupies a `0` cell and never crosses one. BFS must only ever enqueue cells whose value is `1`. (A fresh orange across an empty gap from rot stays fresh — that's exactly Example 2.)
- **Nearest source wins.** With multiple rotten oranges, distances are measured to the *closest* one. Example: `[[2,1,2]]` → the middle rots at minute **1**, not 2 — this is precisely what a naive "BFS from the first rotten orange you find" gets wrong (it would answer 4).

**Why BFS and not DFS?** BFS on an unweighted graph finalizes every cell's distance the *first* time it's reached, so one pass suffices. A DFS-based approach (stamping times and relaxing) can improve a cell's stamp repeatedly as later-explored sources find shorter routes, degrading toward Bellman-Ford-like O(V·E) = O((mn)²) behavior — and DFS gives you no layered "minute" structure anyway. Similarly, running a separate BFS **per** rotten source and taking per-cell minimums is correct but costs O(#sources × mn) = O((mn)²) worst case, since there can be Θ(mn) sources; multi-source BFS merges all sources into one O(mn) pass.

**Why simultaneity = BFS levels (correctness in three sentences):** By induction, after minute `t`, exactly the cells at BFS distance ≤ `t` are rotten. A cell at distance `t+1` is adjacent to some cell at distance `t` (rotten by end of minute `t`), so it rots during minute `t+1`; a cell at distance > `t+1` has all neighbors at distance ≥ `t+1` (distances of adjacent cells differ by ≤ 1), so nothing rots it early. ∎

---

## 5. Optimal Approach: Multi-Source BFS

### Algorithm steps

1. **One scan:** count `fresh` (value `1`); push every `2` cell into a queue (they're level 0).
2. If `fresh == 0`, return **0** immediately (Example 3; also handles all-empty grids).
3. **Level-synchronized BFS:** while the queue is non-empty **and** fresh oranges remain: increment `minutes`, then process exactly the current queue snapshot (`for _ in range(len(q))`), and for each popped cell `(r, c)`, check its 4 neighbors.
4. For a neighbor `(nr, nc)` in bounds with `grid[nr][nc] == 1`: **mark it rotten immediately** (`grid[nr][nc] = 2`), decrement `fresh`, push `(nr, nc)` — it joins the *next* level.
5. When the loop ends: return `minutes` if `fresh == 0`, else **−1**.

### Primary Python solution (level-by-level)

```python
from collections import deque

def orangesRotting(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    fresh = 0
    q = deque()

    # 1) One scan: count fresh, seed queue with ALL rotten cells (level 0)
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                fresh += 1
            elif grid[r][c] == 2:
                q.append((r, c))

    if fresh == 0:                     # Example 3: nothing ever needs to rot
        return 0

    minutes = 0
    DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))

    # 2) Each loop iteration = one level = one minute
    while q and fresh > 0:             # fresh-guard stops a phantom extra minute
        minutes += 1
        for _ in range(len(q)):        # snapshot: exactly this level
            r, c = q.popleft()
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                # bounds check BEFORE indexing; only fresh (value 1) cells spread
                if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:
                    grid[nr][nc] = 2   # mark rotten NOW (mark-on-enqueue)
                    fresh -= 1
                    q.append((nr, nc)) # joins the next level

    return minutes if fresh == 0 else -1
```

Two implementation details carry all the correctness weight:

- **Mark-on-enqueue.** Setting `grid[nr][nc] = 2` the moment you *discover* the cell guarantees each cell enters the queue **at most once** — a cell is only enqueued at its unique `1 → 2` transition. This kills duplicates, makes the queue size a valid complexity bound, and makes `fresh -= 1` happen exactly once per orange.
- **The `fresh > 0` loop guard.** The last frontier cells often sit in the queue *after* the final rot (they linger while we discover nothing new). Without the guard you'd count one phantom minute and return 5 instead of 4 on Example 1 (see §7). The guard also doubles as early termination.

### Alternative formulation: timestamps in the queue

```python
def orangesRotting_timestamps(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                fresh += 1
            elif grid[r][c] == 2:
                q.append((r, c, 0))            # (row, col, rot-time)

    t = 0
    while q:
        r, c, t = q.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                q.append((nr, nc, t + 1))

    return t if fresh == 0 else -1
```

This works because BFS pops in **nondecreasing** time order, so the final popped `t` is the maximum rot time — but it's subtler to reason about (e.g., you must *not* return `max(t) + 1`, and initial rotten cells carry `t = 0` so they can't inflate the answer). The level-by-level version is the one I'd write first in an interview.

### Traces of the optimal solution on the official examples

**Example 1** — `[[2,1,1],[1,1,0],[0,1,1]]`, fresh = 6, queue = `[(0,0)]`:

| Minute | Queue at start of level | Rots this level | Fresh left |
|---|---|---|---|
| 1 | (0,0) | (0,1), (1,0) | 4 |
| 2 | (0,1), (1,0) | (0,2), (1,1) | 2 |
| 3 | (0,2), (1,1) | (2,1) | 1 |
| 4 | (2,1) | (2,2) | 0 |

`fresh == 0` → return **4**. ✓ (Note `(1,2)` and `(2,0)` are `0` walls and are never touched.)

**Example 2** — `[[2,1,1],[0,1,1],[1,0,1]]`, fresh = 6, queue = `[(0,0)]`:

| Minute | Queue at start | Rots this level | Fresh left |
|---|---|---|---|
| 1 | (0,0) | (0,1) | 5 |
| 2 | (0,1) | (0,2), (1,1) | 3 |
| 3 | (0,2), (1,1) | (1,2) | 2 |
| 4 | (1,2) | (2,2) | 1 |

Queue empties with `(2,0)` still fresh (its neighbors `(1,0)` and `(2,1)` are empty walls) → return **−1**. ✓ Note the internal minute counter reached 4, but we return −1 — **reachability dominates the clock**.

**Example 3** — `[[0,2]]`: the scan finds `fresh = 0` → return **0** before any BFS runs. ✓

---

## 6. Complexity Analysis

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Minute-by-minute simulation | O((mn)²) | O(mn) for the rot-buffer (or O(1) with a snapshot trick) | ≤ `mn+1` minutes × O(mn) scan each |
| Per-source BFS + per-cell min | O((mn)·S), S = #rotten ≤ mn → O((mn)²) | O(mn) | Correct but redundant work |
| **Multi-source BFS (this lesson)** | **O(mn)** | **O(mn)** worst-case queue | Optimal; each cell enqueued ≤ once |
| Multi-source BFS + separate visited matrix | O(mn) | O(mn) | Use when input mutation is forbidden |
| Dijkstra-style (if someone suggests it) | O(mn log mn) | O(mn) | Unnecessary — all edges weigh 1 minute |

**Why O(mn):** the initial scan is O(mn); each cell is enqueued at most once (only at its `1 → 2` transition), dequeued at most once, and each dequeue does O(1) work (4 neighbor checks). Queue space is bounded by the largest level, ≤ mn (e.g., an all-rotten grid seeds the entire grid at level 0).

**Lower bound:** O(mn) is optimal — any correct algorithm must inspect every cell, because flipping a single unexamined cell's value between 1 and 2 can change the answer, so reading all `mn` cells is unavoidable.

---

## 7. Common Mistakes (and how each one *actually* fails)

| # | Mistake | Symptom / concrete failure | Fix |
|---|---|---|---|
| 1 | **Mark-on-pop instead of mark-on-enqueue** | Same fresh cell discovered by two rotten neighbors in the same minute → duplicate queue entries, `fresh` decremented twice (can go negative), inflated minutes | Set `grid[nr][nc] = 2` at enqueue time |
| 2 | **`while q:` with unconditional `minutes += 1`** (no `fresh > 0` guard) | On Example 1, after minute 4 the queue still holds `(2,2)`; level 5 rots nothing; returns **5** instead of **4** | Loop `while q and fresh > 0`, or only count waves that actually rotted something |
| 3 | **Missing `fresh == 0` early return** | `[[0,2]]` or `[[0]]` mishandled; code that returns −1 when there are no rotten oranges breaks on all-empty/no-fresh grids | Check `fresh == 0` right after the initial scan |
| 4 | **Returning `minutes` while fresh > 0** | Example 2-style inputs return 4 instead of −1 | The post-loop check `fresh == 0` **is** the reachability test |
| 5 | **Letting BFS traverse `0` cells** | Rot "teleports" across empty gaps; unreachable oranges wrongly counted as rotten | Only enqueue cells whose value is exactly `1` |
| 6 | **Cascade bug in the brute force** (marking during detection) | `[[2,1,1]]` returns 1 instead of 2: the scan marks `(0,1)`, then `(0,2)` sees it and rots in the same minute | Deferred `to_rot` buffer, or check against a pre-minute snapshot |
| 7 | **Python negative-index wraparound** | `grid[-1][5]` silently reads the **last row** — no exception, just a wrong answer. Checking only `nr < m and nc < n` is not enough | Always check `0 <= nr < m and 0 <= nc < n` |
| 8 | **Using DFS / recursion** | No layered time; needs repeated relaxation; can degrade toward O((mn)²) | BFS, because all spread edges cost exactly 1 minute |
| 9 | **Assuming a square grid** (`n = len(grid)`) | Wrong column bound on rectangular inputs | `m, n = len(grid), len(grid[0])` |
| 10 | **Counting initial rotten oranges as contributing time** | `[[2]]` returns 1 instead of 0 | Only cells you actually rot (or levels that rotted something) advance the clock |

**Debugging checklist:** run Example 1 (expect 4, catches mistakes 1/2), `[[0,2]]` (expect 0, catches 3), `[[1]]` (expect −1, catches 3/4), `[[2,1,2]]` (expect 1, catches multi-source errors).

---

## 8. Language Gotchas (Java / C++), briefly

| Language | Gotcha |
|---|---|
| **Java** | `ArrayDeque<int[]>` stores *references*. Reusing one `int[]` buffer for every push aliases the entire queue — every entry ends up holding the last-pushed coordinates. Allocate `new int[]{r, c}` per node (or use a small record). Also remember `ArrayDeque` rejects `null`. |
| **C++** | No bounds checking: `grid[nr][nc]` with an out-of-range index is undefined behavior, not an exception — bounds-check *before* indexing. Pass the grid as `vector<vector<int>>&` so you don't deep-copy it inside the BFS; `queue<pair<int,int>>` by value is fine. |
| **Python** | `list.pop(0)` is O(n) — use `collections.deque`. And the negative-index wraparound from Mistake #7 is Python-specific silent corruption. |

```java
// WRONG — one shared buffer: every queue entry aliases the same array
int[] cell = new int[2];
cell[0] = r; cell[1] = c;
queue.add(cell);                 // all entries now == last pushed coords!

// RIGHT — fresh array per node
queue.add(new int[]{r, c});
```

---

## 9. Test Cases to Propose Out Loud

State these **before or right after coding** — each one targets a specific failure mode:

| Input | Expected | What it stresses |
|---|---|---|
| `[[2,1,1],[1,1,0],[0,1,1]]` | **4** | Official Ex. 1 — multi-level spread, empty cells as walls, no phantom minute |
| `[[2,1,1],[0,1,1],[1,0,1]]` | **−1** | Official Ex. 2 — unreachable orange behind `0` walls, *even though* other cells rotted for 4 minutes |
| `[[0,2]]` | **0** | Official Ex. 3 — no fresh oranges ⇒ 0 with zero BFS work |
| `[[0]]` | **0** | All empty — no fresh, no rotten, still 0 |
| `[[1]]` | **−1** | Fresh exists, **no rotten source** — BFS never starts, must still return −1 |
| `[[2]]` | **0** | Single rotten — time base case; catches "initial rotten count as minute 1" |
| `[[2,1,2]]` | **1** | Two sources compete — nearest source wins (catches single-source BFS from first `2` found, which would say 4) |
| `[[2,0,1]]` | **−1** | Empty cell fully blocks a spread line |
| `[[2,1,1,1,1]]` | **4** | Linear chain — minute counting = chain length |
| 2×2 all `2`s | **0** | Big level-0 frontier; all rot instantly |

Then dry-run your finished code on Example 1 level by level (should produce exactly the table in §5) before saying "done."

---

## 10. Transferable Patterns & Related Problems

**Patterns you just learned (name them in the interview):**

1. **Multi-source BFS.** "Distance from the *nearest* X" = BFS from all X's at once (equivalently, a virtual super-source). Whenever a process spreads simultaneously from many starting points, seed the queue with all of them at level 0.
2. **BFS level = time step.** Any unweighted, unit-cost, simultaneous spread/transformation process maps levels to clock ticks (minutes, seconds, moves).
3. **Mark-on-enqueue visited discipline.** Mark/finalize a node the moment you discover it, never when you pop it — the universal defense against duplicate queue entries and double-counted work.
4. **State encoded in the grid.** With a tiny value domain, mutate the grid (`1 → 2`) as your visited set — O(1) extra space for visited.
5. **Counter-driven early exit and feasibility flag.** A `fresh` counter both stops phantom minutes and *is* the reachability test that decides −1.
6. **Brute force → frontier queue.** Minute-simulation re-scans the grid every tick; a queue caches the frontier and collapses O(levels × mn) into O(mn). Recognizing "I'm re-deriving the same frontier every iteration" is a reusable optimization instinct.

**Related problems:**

| Problem | What transfers |
|---|---|
| LC 542 — 01 Matrix | Multi-source BFS, distance to nearest `0` (sources = all zeros) |
| LC 1162 — As Far from Land as Possible | Multi-source BFS, but **maximize** the nearest-source distance |
| LC 286 — Walls and Gates | Multi-source BFS from all gates |
| LC 417 — Pacific Atlantic Water Flow | Multi-source from two boundary sets |
| LC 200 — Number of Islands | Grid traversal, visited marking (flood fill) |
| LC 1091 — Shortest Path in Binary Matrix | Grid BFS where level = number of steps |
| LC 127 — Word Ladder | Level-synchronized BFS where level = transformation count |
| LC 752 — Open the Lock | BFS levels on an implicit graph |

**Likely follow-up questions:** "Return each cell's rot time" (emit the distance map — BFS already computes it); "8-directional spread" (swap the DIRS constant); "some oranges take k minutes to rot others" (non-uniform weights → Dijkstra or 0-1 BFS, since BFS's level=minute equivalence breaks when edges aren't all weight 1); "can you avoid mutating the input?" (separate visited matrix, same complexity).

---

## 11. Interview Talk Track (full script)

1. **Clarify (20–30s):** "So all rotting in a given minute happens *simultaneously*, based on the previous minute's state — I can't let one cell's rot cascade within the same minute. 4-directional only. And I'll assume: no fresh oranges at all → 0; fresh but no rotten → −1."
2. **Frame (30s):** "This is shortest path in disguise. Each orange's infection minute equals its distance to the *nearest* initially-rotten orange in the graph of non-empty cells — empty cells are walls. All edges cost one minute, so BFS computes distances, and with many sources I'll run one multi-source BFS: seed the queue with every rotten orange at level 0, and each BFS level is one minute."
3. **Plan (20s):** "One scan: count fresh oranges, push all rotten ones. Early-return 0 if fresh is zero. Level loop: pop the whole current level, rot any fresh neighbors — marking them rotten *at enqueue time* so nothing is enqueued twice — decrement fresh, push them. Answer is minutes if fresh hit zero, else −1."
4. **Code** while narrating: bounds check before indexing, only value-`1` cells spread, `fresh > 0` in the loop condition.
5. **Test:** walk Example 1's four levels; note `[[0,2]] → 0` and `[[1]] → −1`; mention `[[2,1,2]] → 1` for multi-source.
6. **Close:** "O(mn) time and space — each cell is enqueued at most once, at its single fresh-to-rotten transition."

---

## 12. Say It in 60 Seconds

> "This is multi-source BFS. Every rotten orange is a source at time zero, and since rot spreads one ring per minute, the minute an orange rots is exactly its BFS distance to the *nearest* rotten orange — so the answer is the maximum of those distances, or −1 if some fresh orange is unreachable. Empty cells never rot, so they act as walls. Algorithm: one scan to count fresh oranges and seed the queue with every rotten one. Then BFS level by level — each level is one minute. Pop a cell, check its four neighbors, and for any neighbor still fresh, mark it rotten in place *immediately*, decrement the fresh counter, and push it — marking at enqueue time is critical, it prevents duplicates and double-counting. The loop stops when the queue empties or no fresh remains, and that fresh-count guard also prevents counting a phantom extra minute. Return the minutes if fresh is zero, else −1 — and early-return 0 when there's nothing fresh at all. O(mn) time and space, since each cell is enqueued at most once."
