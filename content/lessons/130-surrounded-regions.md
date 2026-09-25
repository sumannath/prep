# Surrounded Regions (LeetCode 130) — Complete Interview Lesson

---

## 1. Problem Restatement

You're handed an `m x n` grid `board` whose cells are the single characters `'X'` (wall) and `'O'` (open). Cells are **4-directionally connected** (up/down/left/right — *not* diagonally). A **region** is a maximal connected group of `'O'` cells. A region is **surrounded** if **none of its cells lies on the border of the board**.

Your job: **flip every `'O'` belonging to a surrounded region to `'X'`**, mutating `board` in place, returning nothing.

**Conventions used throughout this lesson:**
- Indices are 0-based: `(r, c)` means `board[r][c]`, with `0 <= r < m`, `0 <= c < n`.
- "Border/edge cell" = any cell with `r == 0`, `r == m-1`, `c == 0`, or `c == n-1`.
- Values are the *letters* `'O'` and `'X'` (in Python, 1-char strings `"O"` / `"X"`) — watch out for the letter-O vs digit-zero confusion.

**The single most important subtlety:** if *even one* cell of a region sits on the border, the *entire region* survives. In Example 1 there are exactly two regions:
- `{(1,1), (1,2), (2,2)}` — all interior → captured.
- `{(3,1)}` — touches row `m-1 = 3` → survives, even though it's a lone cell squeezed between walls.

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= m, n <= 200` | Up to `200 × 200 = 40,000` cells. An `O(m·n)` solution is ~40k operations — instant. A naïve `Θ((mn)²)` solution is ~1.6 × 10⁹ operations — painfully slow in Python. No empty-board case, but a 1-line guard is free. |
| `board[i][j] ∈ {'X','O'}` | The alphabet has exactly 2 symbols. This is what legally allows the **sentinel trick**: overwrite survivors with a third symbol (`'#'`) and use the board itself as the visited structure. If other characters could appear, you'd need a separate visited matrix. |
| "replace … in-place … do not need to return anything" | The judge re-reads the **same object** you were given. In Python, `board = something` inside the function rebinds a *local* name and is a silent no-op for the caller — you must write `board[r][c] = ...`. |
| `m, n` can be `1` | Degenerate boards: in a `1 × n` or `m × 1` board **every cell is a border cell**, so *nothing can ever be captured*. Your edge-scan must still cover these correctly (see §7, mistake #7). |
| No arithmetic beyond indices | No overflow concerns; max index is 199. |

**Hidden trap — recursion depth:** a snake-shaped region of `'O'`s can produce a flood-fill path ~40,000 cells deep. Python's default recursion limit is ~1,000, so *recursive* DFS will raise `RecursionError`. Use an **iterative** BFS/DFS (or an explicit stack).

---

## 3. Brute Force

### 3.1 Attempt 1 — fresh reachability check per `'O'` cell

Direct translation of the definition: for each `'O'` cell, flood-fill through `'O'`s to see whether the region reaches the border. If not, flip the whole discovered set to `'X'`. Do this with a *fresh* visited set per starting cell.

This is correct but re-explores the same region once per member: on a safe region of size `K`, each of its `K` cells launches a BFS of ~`K` visits → `Θ(K²)` work, so the worst case is `Θ((mn)²)` — each of up to `mn` seeds can re-sweep all `mn` cells.

### 3.2 Worked trace

Board:

```
O X X X
O O X X
X X O X
X X X X
```

Row-major scan over `'O'` cells:

| Seed (r, c) | BFS discovers | Reaches an edge `'O'`? | Action | Nodes visited this run |
|---|---|---|---|---|
| `(0,0)` | `{(0,0), (1,0), (1,1)}` | Yes — `(0,0)` is on row 0 | keep | 3 |
| `(1,0)` | same region | Yes — `(1,0)` is on column 0 | keep | 3 (redundant) |
| `(1,1)` | same region | Yes, via `(1,0)` | keep | 3 (redundant) |
| `(2,2)` | `{(2,2)}` | No — all 4 neighbors are `'X'` | **flip to `'X'`** | 1 |

10 node-visits for 4 `'O'` cells. Scale the safe region to 39,000 cells and you get ~1.5 billion visits.

⚠️ Caution: an "optimization" that flips cells to `'X'` *while* the BFS is still running breaks the flood (you're traversing `'O'`s and deleting them under yourself). Collect the region first, decide, then flip — or use Attempt 2.

### 3.3 Attempt 2 — one flood per region + border flag

Scan for unvisited `'O'` cells; flood each region exactly once; track a `touches_edge` flag; flip afterward.

| Region | Flooded from | Cells | `touches_edge` | Action |
|---|---|---|---|---|
| S | `(0,0)` | `(0,0), (1,0), (1,1)` | true | keep |
| C | `(2,2)` | `(2,2)` | false | flip all → `'X'` |

Now every cell is visited once → `O(mn)` time. But you still carry a visited set (or a temporary sentinel *plus* a restore pass) and a per-region flag. It works; it's just bookkeeping-heavy — and that bookkeeping is exactly what the optimal approach eliminates.

---

## 4. The Core Insight — Invert the Question

> **Don't ask which regions die. Ask which regions survive.**

**Lemma.** For any `'O'` region `R`:

```
R is surrounded  ⟺  R contains no border cell
                 ⟺  no cell of R is 4-connected, through 'O's, to a border 'O'
```

Why the equivalence holds: regions are *maximal* connected components. If some cell of `R` connects through `'O'`s to a border `'O'` `b`, then `b` is in the same connected component, i.e., `b ∈ R` — so `R` touches the border and survives. Conversely, if `R` contains a border cell, that cell itself is a border `'O'`, trivially "connected to the border."

So the set of survivors is precisely:

> **All `'O'` cells reachable by flood fill seeded from every border `'O'`.**

This is dramatically easier to compute because the seeds are free — they're sitting on the edge, waiting to be found with two linear sweeps. Everything *not* reached is, by the lemma, surrounded.

This is the **reverse-thinking / complement** pattern: when a property is hard to verify locally ("is this region fully enclosed?") but its complement has obvious seeds ("anything touching the outside"), solve for the complement.

---

## 5. Optimal Approach — Border-Seeded Flood Fill

### 5.1 Algorithm

Three phases, all on the original board:

1. **Seed & mark.** Sweep all four edges (two full row sweeps + two full column sweeps). For every edge cell equal to `'O'`, run an iterative flood fill (BFS or DFS) through `'O'`s, rewriting each visited cell to the sentinel `'#'`.
2. **Final rewrite.** One sweep over the whole board:
   - `'O'` → `'X'` (never reached from an edge ⇒ surrounded, by the lemma);
   - `'#'` → `'O'` (survivor: restore the original value);
   - `'X'` → untouched.

The board *is* the visited structure: `'O'` = unvisited open cell, `'#'` = safe-and-processed, `'X'` = wall. Zero auxiliary visited storage.

Two correctness/robustness details baked into this design:
- **Mark when you push, not when you pop.** Then "discovered" and "in queue" are the same state, and every cell enters the queue at most once.
- **Corners get seeded twice** (once by the row sweep, once by the column sweep). Harmless: the second seed attempt checks `board[r][c] == "O"` and the corner is already `'#'`, so it's skipped.

*Variant:* enqueue **all** border `'O'` seeds into one queue first, then run a single multi-source BFS — identical complexity, one queue, arguably even cleaner.

### 5.2 Correctness sketch (say this in the interview)

- *Everything marked deserves to survive:* the flood only walks 4-directionally through `'O'`s starting from border cells, so every `'#'` cell's region contains a border cell.
- *Everything that deserves to survive gets marked:* if an `'O'` region contains a border cell `b`, the edge sweep starts a flood at `b`, and flood fill reaches every cell of `b`'s region.
- Phase 2 therefore flips exactly the cells of borderless regions and restores exactly the survivors. `'X'` cells are never touched.

### 5.3 Trace on Example 1

```
Input:                 After Phase 1:          After Phase 2:
X X X X                X X X X                 X X X X
X O O X                X O O X                 X X X X
X X O X                X X O X                 X X X X
X O X X                X # X X                 X O X X
```

**Phase 1 — edge sweep:**

| Edge | Cells scanned | `'O'` seeds found |
|---|---|---|
| top `r = 0` | `(0,0)..(0,3)` | none |
| bottom `r = 3` | `(3,0)..(3,3)` | `(3,1)` |
| left `c = 0` | `(0,0)..(3,0)` | none |
| right `c = 3` | `(0,3)..(3,3)` | none |

Flood from `(3,1)`: mark `'#'`, push. Pop it; neighbors `(2,1)`, `(3,0)`, `(3,2)` are all `'X'` (no neighbor below — row 3 is the last row). Queue empties. The interior region `{(1,1),(1,2),(2,2)}` is unreachable from any seed — exactly the point.

**Phase 2 — rewrite sweep:** `(1,1), (1,2), (2,2)` are `'O'` → `'X'`; `(3,1)` is `'#'` → `'O'`. Matches the expected output. ✓

### 5.4 Trace on Example 2

`board = [["X"]]`, so `m = n = 1`. Edge sweeps: every seed candidate is `(0,0)`, value `'X'` → skipped. Phase 2: `'X'` stays `'X'`. Output `[["X"]]`. ✓

### 5.5 BFS mechanics mini-trace (mark-on-push, duplicate handling)

Board:

```
X O O
O O X
X X X
```

Seeds: `(0,1)`, `(0,2)` (top edge), `(1,0)` (left edge). One 5-cell region, all edge-connected → nothing should be captured.

| Step | Pop | Action | Queue after |
|---|---|---|---|
| seed | — | mark `(0,1) = '#'`, push | `[(0,1)]` |
| 1 | `(0,1)` | push `(1,1)` (mark `'#'`), push `(0,2)` (mark `'#'`); `(0,0)` is `'X'` | `[(1,1), (0,2)]` |
| 2 | `(1,1)` | push `(1,0)` (mark `'#'`); `(1,2)`, `(2,1)` are `'X'`; `(0,1)` is already `'#'` | `[(0,2), (1,0)]` |
| 3 | `(0,2)` | neighbors are `'X'`/`'#'`/out-of-bounds | `[(1,0)]` |
| 4 | `(1,0)` | neighbors are `'X'`/`'#'` | `[]` |

Later seed attempts at `(0,2)` and `(1,0)` see `'#'` and are skipped — no double work. Phase 2 restores all five cells → board unchanged. ✓

Contrast: **mark-on-pop** can enqueue a cell twice. Concrete case — a 2×2 all-`'O'` board: popping `(0,1)` pushes `(1,1)`, then popping `(1,0)` pushes `(1,1)` *again*, because at push time nothing distinguished "queued" from "undiscovered." On a 40k-cell grid that bloats the queue and, worse, is a classic source of subtle bugs. Mark on push.

### 5.6 Python implementation (iterative — interview-safe)

```python
from collections import deque
from typing import List

class Solution:
    def solve(self, board: List[List[str]]) -> None:
        """Flip every 'O' region that does not touch the board edge to 'X'. In place."""
        if not board or not board[0]:
            return
        m, n = len(board), len(board[0])
        DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))

        def flood(r0: int, c0: int) -> None:
            """Mark every edge-connected 'O' reachable from (r0, c0) with '#'."""
            board[r0][c0] = "#"
            q = deque([(r0, c0)])
            while q:
                r, c = q.popleft()           # q.pop() instead => DFS; same result
                for dr, dc in DIRS:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < m and 0 <= nc < n and board[nr][nc] == "O":
                        board[nr][nc] = "#"  # mark on PUSH: each cell queued at most once
                        q.append((nr, nc))

        # Phase 1: seed from all four edges.
        for r in range(m):                   # left (c = 0) and right (c = n-1) edges
            for c in (0, n - 1):
                if board[r][c] == "O":
                    flood(r, c)
        for c in range(n):                   # top (r = 0) and bottom (r = m-1) edges
            for r in (0, m - 1):
                if board[r][c] == "O":
                    flood(r, c)

        # Phase 2: rewrite in place.
        for r in range(m):
            for c in range(n):
                if board[r][c] == "O":       # unreachable from any edge -> surrounded
                    board[r][c] = "X"
                elif board[r][c] == "#":     # survivor: restore
                    board[r][c] = "O"
```

Notes:
- Swapping `popleft()` for `pop()` converts BFS → DFS with identical results and complexity.
- Do **not** write a recursive `flood` here: a snake region forces ~40,000-deep recursion vs. Python's ~1,000 default limit.
- `board[r][c] = ...` writes into the caller's lists — this is why the in-place contract is satisfied.

### 5.7 Implementation gotchas in Java / C++

| Language | Gotcha | Fix |
|---|---|---|
| Java | Recursive DFS can throw `StackOverflowError` on a 200×200 `'O'` snake (~40k frames against a default thread stack that comfortably handles far less, depending on JVM settings) | Use `ArrayDeque<int[]>` as an explicit stack/queue |
| Java | Cells are `char`; `board[r][c] == "O"` mixes `char` with `String` (won't compile) — and `Character.valueOf('O') == ...`-style confusion invites autoboxing traps | Compare primitives: `board[r][c] == 'O'` |
| C++ | `void solve(vector<vector<char>> board)` **silently copies** the board: slow, and every flip you make is thrown away (wrong answer) | Take `vector<vector<char>>& board` |
| C++ | Same recursion-depth overflow risk; also `pair<int,int>` stack nodes add overhead | Iterative stack of encoded indices: `int id = r * n + c`, decode with `id / n`, `id % n` |

---

## 6. Complexity Analysis

| # | Approach | Time | Extra space | Verdict |
|---|---|---|---|---|
| 1 | Fresh reachability BFS per `'O'` cell (§3.1) | `Θ((mn)²)` worst case — each of up to `mn` seeds can re-sweep all `mn` cells | `O(mn)` per run | Correct but ~1.6 × 10⁹ ops at 200×200: too slow |
| 2 | One flood per region + border flag + visited set (§3.3) | `O(mn)` | `O(mn)` visited + frontier | Correct, most bookkeeping |
| 3 | **Border-seeded flood + in-board sentinel (§5)** | **`O(mn)`** | `O(mn)` worst-case frontier; **`O(1)` beyond the traversal structure** | Interview target |
| 4 | Union–Find with a virtual "border" node | `O(mn · α(mn))` — α is the inverse Ackermann function, which stays ≤ 5 for any input size that could ever fit in memory | `O(mn)` parent array | Valid alternative, more code |

- **Time, approach 3:** every cell is read/written a constant number of times (edge sweeps, at most one flood visit, one rewrite sweep).
- **Space, approach 3:** no visited set (the sentinel encodes it). The BFS queue / DFS stack is `O(mn)` in the worst case — the snake-shaped region is the canonical worst case for stack depth; adversarial "comb" shapes can push even a BFS queue toward `Θ(mn)` entries, though on a solid rectangle the frontier is only `O(m + n)`.
- **Lower bound:** `Ω(mn)` time is unavoidable, because a correct algorithm must read every cell — an unread cell's value could always be the one that changes whether its region is captured. So `O(mn)` is asymptotically optimal, worth saying out loud.

---

## 7. Common Mistakes (ranked by how often they're made)

1. **Flooding survivors straight to `'X'`.** You cannot restore them afterward — `'#'`-style sentinel (or a separate visited set) is mandatory, because the value `'X'` already means "wall."
2. **Forgetting the restore pass** — leaving `'#'` in the output board.
3. **Marking on pop in BFS** — duplicate queue entries (see the 2×2 example in §5.5).
4. **Seeding edges incompletely.** You need both full row sweeps *and* both full column sweeps. Four "corner-only" checks miss border `'O'`s like `(3,1)` in Example 1.
5. **Diagonal adjacency.** `(1,1)` and `(0,2)` do **not** connect. Only the 4 orthogonal directions.
6. **Recursive DFS in Python** — `RecursionError` around depth ~1,000; this grid admits depth ~40,000.
7. **Degenerate dimensions.** For `m = 1` or `n = 1`, *every* cell is a border cell, so nothing may be captured. (The two full sweeps in §5.6 handle this automatically — verify you understand why before moving on.)
8. **Python rebinding:** `board = new_board` inside `solve` mutates nothing the judge can see. Write through `board[r][c]`.
9. **Trying to decide capture mid-flood from the interior** ("flip optimistically, un-flip if I hit the border") — a fragile state machine; the border-seeded inversion makes the question unnecessary.

---

## 8. Test Cases to Propose Out Loud

Present these before or right after coding — it signals maturity.

| # | Board in | Board out | What it verifies |
|---|---|---|---|
| T1 | `[["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]` | `[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]` | Official Ex. 1 — captured interior region + surviving edge cell |
| T2 | `[["X"]]` | `[["X"]]` | Official Ex. 2 — 1×1 |
| T3 | `[["O"]]` | `[["O"]]` | 1×1 border `'O'` must survive |
| T4 | `[["O","X","O"]]` | unchanged | `1 × n`: every cell is an edge cell |
| T5 | 3×3 all `'O'` | unchanged | All-border board; also exercises corner double-seeding |
| T6 | `X X O` / `X O X` / `X X X` | `X X O` / `X X X` / `X X X` | **Diagonal is not connection** — `(1,1)` dies despite sitting diagonal to border `'O'` `(0,2)` |
| T7 | `O O O X` / `X X O X` / `X X O X` / `X X X X` | unchanged | Snake rooted at a border `'O'` survives end-to-end |
| T8 | 5×5 ring: `X X X X X` / `X O O O X` / `X O X O X` / `X O O O X` / `X X X X X` | all `'X'` | A "donut" region — 8 `'O'`s around an interior `'X'` — is still fully interior and fully captured |

Also worth *saying*: "all-`'X'` board → unchanged," and "the algorithm must not depend on `m, n ≥ 2`."

---

## 9. Transferable Patterns & Related Problems

**Patterns to internalize:**

1. **Invert the predicate.** When "find everything with property P" is awkward (P is a region-wide, not local, property), find the complement if the complement has *free seeds* — a border, a set of sources, the exits. Here: survivors = reachable-from-border.
2. **Boundary-seeded / multi-source flood fill.** Seeds on the border (or all sources at once in one initial queue wave) turn "global reachability" into a single linear sweep.
3. **Sentinel encoding on the input buffer.** When the alphabet is tiny and in-place mutation is allowed, the board itself is your visited array → `O(1)` auxiliary memory beyond traversal.
4. **Mark-on-push** for BFS: "discovered" = "in queue," each cell enqueued at most once.
5. **Two-phase in-place rewrite:** mark with a sentinel, then one sweep to finalize.

**Related problems (practice ladder):**

| Problem | Relationship |
|---|---|
| LC 1020 — Number of Enclaves | Nearly identical: count land cells not connected to the boundary (same border-seeded flood) |
| LC 1254 — Number of Closed Islands | Count `'0'`-regions that don't touch the border |
| LC 417 — Pacific Atlantic Water Flow | Multi-source flood from *two* different borders, intersect the results |
| LC 542 — 01 Matrix / LC 994 — Rotting Oranges / LC 286 — Walls and Gates | Multi-source BFS from boundary/seed sets |
| LC 200 — Number of Islands / LC 695 — Max Area of Island | Plain flood fill (the mechanical foundation) |

---

## 10. Full Interview Talk Track

> **Clarify (30s).** "Grid of `'X'` and `'O'`. Connectivity is 4-directional, not diagonal — let me confirm that. I need to flip every `'O'` whose *entire connected region* avoids the border; regions with even one edge cell stay untouched. I mutate in place and return nothing. One more clarification: for a one-row or one-column board, every cell is an edge cell, so nothing should ever be captured — right?"
>
> **Brute force (30s).** "The literal reading is: for each `'O'`, find its region and check whether any member touches the edge; if not, flip. Without memory, each cell re-runs a BFS over its whole region — quadratic in the worst case. With one flood per region plus a visited set and a `touches_edge` flag, it's linear but carries a lot of bookkeeping."
>
> **Insight (20s).** "So I'll invert it. A region survives if and only if it contains a border cell. Equivalently, an `'O'` survives iff it's 4-connected to some border `'O'`. So the survivors are exactly the cells reachable by flood fill started from all border `'O'`s — and the seeds are free, they're on the edge."
>
> **Algorithm (40s).** "Three phases. One: sweep all four edges; from each edge `'O'`, flood through `'O'`s, rewriting cells to `'#'`. Two: final sweep — remaining `'O'` means 'surrounded,' write `'X'`; `'#'` means 'survivor,' restore to `'O'`. The board doubles as my visited array since the alphabet is just `'X'`/`'O'`. Three details I care about: I mark cells when I *push* them so nothing is enqueued twice; corners get seeded by both sweeps and the value check dedupes that; and I'll flood iteratively because a snake region can force ~40,000-deep traversal and Python's recursion limit is ~1,000."
>
> **Complexity (15s).** "Time `O(m·n)` — each cell is touched a constant number of times. Extra space is just the queue/stack, worst case `O(m·n)` on a big region, and `O(1)` beyond that since the board is the visited structure. And `Ω(m·n)` is a hard floor — I have to read every cell — so this is optimal."
>
> **Edge cases (20s).** "Official examples, plus: `1×1 'O'` stays; a single row stays; all-`'O'` stays; a diagonal pair — the interior one dies; a ring of `'O'`s around an interior `'X'` — the whole ring dies."
>
> **Code, then dry-run (5 min).** Implement §5.6. Dry-run Example 1 aloud: "Edge sweep finds only `(3,1)`; flood marks it, neighbors are walls. Rewrite pass flips `(1,1)`, `(1,2)`, `(2,2)` to `'X'` and restores `(3,1)`. Matches."

---

## 11. Say It in 60 Seconds

> "Finding surrounded regions directly is awkward — you'd need to know a whole region's fate before touching any of it. So I flip the question: which `'O'`s *survive*? Exactly the ones connected to the border, because anything touching the edge can't be enclosed. So: scan the four edges, and from every border `'O'` run an iterative flood fill, marking everything reachable with a sentinel, `'#'`. Then one cleanup pass — leftover `'O'` becomes `'X'`, `'#'` goes back to `'O'`. Every cell is touched a constant number of times, so it's `O(m·n)` time, which is optimal since you must read the whole board; extra space is just the traversal stack, worst case `O(m·n)` on a snake-shaped region — which is why I do it iteratively; Python's recursion limit is about a thousand and this grid has forty thousand cells. Two details I'm careful with: I mark cells when I push them, so nothing is enqueued twice, and the final pass must both flip remaining `'O'`s *and* restore the `'#'` survivors. Edge cases: one-row, one-column, one-cell, and all-`'O'` boards are entirely border, so nothing changes — and diagonals never connect."
