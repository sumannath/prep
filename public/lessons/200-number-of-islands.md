# Number of Islands — Complete Interview Lesson

## 1. Problem restatement: you're counting connected components

Strip away the map metaphor and the problem is:

> Given an `m x n` grid of cells, each holding the **string** `"1"` (land) or `"0"` (water), count the number of **maximal connected components of land**, where two land cells are connected only if they are adjacent **up, down, left, or right** — never diagonally.

Three things to nail down before coding:

- **Values, not indices, carry the type trap.** `grid[i][j]` is a one-character *string* in Python (`"1"`), a `char` in Java/C++ (`'1'`). Comparing against the integer `1` in Python is silently always `False`; comparing against `"1"` in Java/C++ is a compile error.
- **4-directional connectivity.** Example 2 is deliberately built so `(2,2)` and `(3,3)` touch only at a corner — they are **separate** islands. If you allow diagonals, you output 2 instead of 3.
- **"All four edges are surrounded by water"** is flavor text. It means you never need special handling for the boundary — ordinary bounds checks (`0 <= r < m`, `0 <= c < n`) are enough.

> **Say out loud:** "This is connected-components on an implicit graph where each cell is a node and edges are 4-directional adjacency. I'll count components."

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= m, n <= 300` | At most **90,000 cells**. An `O(m·n)` solution is ~10⁵ operations — instant. The *intended* complexity is linear; constants and constant-space tricks are the real game. |
| `grid[i][j] ∈ {"0", "1"}` | Character/string values (see §1). Also means you can **overwrite cells in place** ("sink the island") as a visited-marker. |
| Worst-case island shape | A single snake-like island can cover all 90,000 cells. **Any recursive flood fill can go 90,000 levels deep** — Python's default recursion limit is ~1,000. This constraint quietly forces an iterative solution in Python. |
| Grid may be mutated | LeetCode permits it; a human interviewer may not. Ask. |

## 3. Brute force: identify each cell's island independently

Natural first idea: *for every land cell, figure out which island it belongs to, then count distinct islands.*

Concretely: for each land cell, run a BFS/DFS over land cells and compute the **canonical representative** of its component — say, the lexicographically smallest `(i, j)` in it. The answer is the number of distinct representatives.

```python
def numIslands_bruteforce(grid):
    m, n = len(grid), len(grid[0])
    reps = set()
    for i in range(m):
        for j in range(n):
            if grid[i][j] == "1":
                # BFS from (i, j) to find the min (r, c) in its component
                best, seen, q = None, {(i, j)}, [(i, j)]
                while q:
                    r, c = q.pop()
                    best = (r, c) if best is None or (r, c) < best else best
                    for nr, nc in ((r+1, c), (r-1, c), (r, c+1), (r, c-1)):
                        if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == "1" and (nr, nc) not in seen:
                            seen.add((nr, nc))
                            q.append((nr, nc))
                reps.add(best)
    return len(reps)
```

### Worked trace (mini-grid)

```
grid = [["1","1","0"],
        ["0","1","0"]]
```

| Cell scanned | Component found by BFS | Canonical rep (min index) |
|---|---|---|
| `(0,0)` | `{(0,0), (0,1), (1,1)}` | `(0,0)` |
| `(0,1)` | `{(0,0), (0,1), (1,1)}` | `(0,0)` |
| `(1,1)` | `{(0,0), (0,1), (1,1)}` | `(0,0)` |

Distinct reps = `{(0,0)}` → **1 island**. Correct, but notice the waste: the same component was re-explored three times.

### Why it's too slow

Each of the up-to-`m·n` land cells launches a BFS over up to `m·n` cells → **O((m·n)²)**. On a 300×300 all-land grid that's 90,000 × 90,000 ≈ **8.1 × 10⁹ cell visits** — far past the ~10⁸-operations practical ceiling. (An even weaker brute force — checking connectivity pairwise between cells — is worse still.)

## 4. The core insight

**Each land cell belongs to exactly one island.** So no component ever needs to be explored twice — you only need to guarantee that once you start exploring an island, you *consume* every cell in it so the outer scan never starts the same island again.

That gives the classic **scan + flood fill** decomposition:

1. Scan the grid in row-major order.
2. On the **first** unvisited land cell you meet: that cell is the "entry point" of a brand-new island → increment the count.
3. Flood-fill (DFS or BFS) from it, marking every reachable land cell as consumed.
4. Continue the scan; every later cell of that island is already marked, so it can never trigger a second count.

**Cost:** every cell is discovered and marked exactly once, so total work is `O(m·n)`. This is also a matching lower bound for *any* algorithm: an adversary can flip any single unread cell between `"0"` and `"1"` and change the answer (e.g., create a new island in an otherwise all-water grid), so every cell must be read in the worst case — `Ω(m·n)` reads are unavoidable.

> **Say out loud:** "Marking cells at discovery time is what makes this linear — each cell enters the DFS/BFS container at most once, so there are no duplicate visits and no re-exploration."

## 5. Optimal approach: scan + flood fill

### 5.1 Primary solution: iterative DFS, sink in place

```python
def numIslands(grid: list[list[str]]) -> int:
    if not grid or not grid[0]:
        return 0
    m, n = len(grid), len(grid[0])
    count = 0

    for i in range(m):                      # row index i ranges over m
        for j in range(n):                  # col index j ranges over n
            if grid[i][j] == "1":           # string "1", not int 1
                count += 1                  # one count per island ENTRY cell
                grid[i][j] = "0"            # sink at discovery time
                stack = [(i, j)]
                while stack:
                    r, c = stack.pop()
                    for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                        if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == "1":
                            grid[nr][nc] = "0"   # mark-on-push → never pushed twice
                            stack.append((nr, nc))
    return count
```

Two micro-decisions that matter:

- **Mark on push, not on pop.** Sinking a cell the moment it's pushed guarantees it can never be pushed again (a cell has up to 4 neighbors, so mark-on-pop lets it be pushed up to 4 times). One line saves a re-check at pop and up to 4× container bloat.
- **Sinking (`"1"` → `"0"`) doubles as the visited marker.** No separate `visited` structure needed.

### 5.2 The classic recursive DFS (and why it's risky in Python)

```python
def numIslands(grid: list[list[str]]) -> int:
    m, n = len(grid), len(grid[0])

    def sink(r: int, c: int) -> bool:
        if not (0 <= r < m and 0 <= c < n) or grid[r][c] != "1":
            return False
        grid[r][c] = "0"                       # mark BEFORE recursing
        sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1)
        return True

    count = 0
    for i in range(m):
        for j in range(n):
            if sink(i, j):                     # True only if it actually sank land
                count += 1
    return count
```

⚠️ On a 300×300 serpentine island, recursion depth reaches ~90,000 while Python's default limit is ~1,000 → `RecursionError`. Calling `sys.setrecursionlimit(m * n + 10)` raises the limit but can still crash the interpreter (the C stack doesn't grow). **Lead with the iterative version; mention this caveat out loud — it reads as senior-level awareness.**

### 5.3 BFS variant

Identical skeleton; swap the stack for a deque:

```python
from collections import deque

def numIslands(grid: list[list[str]]) -> int:
    if not grid or not grid[0]:
        return 0
    m, n = len(grid), len(grid[0])
    count = 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] == "1":
                count += 1
                grid[i][j] = "0"
                q = deque([(i, j)])
                while q:
                    r, c = q.popleft()
                    for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                        if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == "1":
                            grid[nr][nc] = "0"
                            q.append((nr, nc))
    return count
```

Never use `list.pop(0)` as a queue in Python — it's `O(n)` per pop, quietly turning `O(m·n)` into `O((m·n)²)`.

### 5.4 Trace on Example 1 (iterative DFS)

```
row0: 1 1 1 1 0
row1: 1 1 0 1 0
row2: 1 1 0 0 0
row3: 0 0 0 0 0
```

Scan hits `(0,0)` = `"1"` → `count = 1`. Sink-and-push trace (stack shown bottom → top):

| # | Pop | Newly sunk & pushed | Stack after |
|---|---|---|---|
| 0 | — | seed `(0,0)` | `(0,0)` |
| 1 | `(0,0)` | `(1,0)`, `(0,1)` | `(1,0) (0,1)` |
| 2 | `(0,1)` | `(1,1)`, `(0,2)` | `(1,0) (1,1) (0,2)` |
| 3 | `(0,2)` | `(0,3)` | `(1,0) (1,1) (0,3)` |
| 4 | `(0,3)` | `(1,3)` | `(1,0) (1,1) (1,3)` |
| 5 | `(1,3)` | — | `(1,0) (1,1)` |
| 6 | `(1,1)` | `(2,1)` | `(1,0) (2,1)` |
| 7 | `(2,1)` | `(2,0)` | `(1,0) (2,0)` |
| 8 | `(2,0)` | — | `(1,0)` |
| 9 | `(1,0)` | — | ∅ |

All **9** land cells — `(0,0),(0,1),(0,2),(0,3),(1,0),(1,1),(1,3),(2,0),(2,1)` — were pushed exactly once. Note `(1,3)` joins island 1 **via `(0,3)`** (vertical adjacency), not through the middle. The scan resumes; no `"1"` remains → **output 1**. ✓

### 5.5 Trace on Example 2

```
row0: 1 1 0 0 0
row1: 1 1 0 0 0
row2: 0 0 1 0 0
row3: 0 0 0 1 1
```

Row-major scan finds three unvisited land entry points:

| Entry cell | Flood fill consumes | count |
|---|---|---|
| `(0,0)` | `(0,0), (0,1), (1,0), (1,1)` | 1 |
| `(2,2)` | `(2,2)` | 2 |
| `(3,3)` | `(3,3), (3,4)` | 3 |

`(3,4)` is already sunk when the scan reaches it. **Output 3** ✓ — and `(2,2)`/`(3,3)` stay separate because **corner-touching is not adjacency**.

BFS mini-trace on the 2×2 block (queue, mark-on-enqueue): `[(0,0)]` → pop `(0,0)`, enqueue `(1,0),(0,1)` → pop `(1,0)`, enqueue `(1,1)` → pop `(0,1)`, nothing → pop `(1,1)`, nothing. Four cells, four enqueues, zero duplicates.

### 5.6 Sink in place vs. visited matrix

| Strategy | Extra space | Preserves input? | Notes |
|---|---|---|---|
| Sink in place (`"1"`→`"0"`) | `O(1)` | ❌ | Fastest; ask permission. Restorable by re-filling recorded cells afterward if needed. |
| `visited: list[list[bool]]` | `O(m·n)` | ✅ | Drop-in swap: test `grid[r][c] == "1" and not visited[r][c]`, mark on push. |
| `visited` as a set of tuples | `O(m·n)` | ✅ | Works but hashing tuples is the slowest option in Python; fine to mention, prefer the matrix. |

### 5.7 Union-Find alternative

Treat each land cell as a node; union adjacent land pairs. Start the count at *the number of land cells* and decrement on every **successful** merge:

```python
def numIslands(grid: list[list[str]]) -> int:
    m, n = len(grid), len(grid[0])
    parent = list(range(m * n))          # flat index: idx = i * n + j (row-major)
    rank = [0] * (m * n)

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path halving
            x = parent[x]
        return x

    def union(a: int, b: int) -> bool:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False                 # same island already → NOT a merge
        if rank[ra] < rank[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        if rank[ra] == rank[rb]:
            rank[ra] += 1
        return True

    count = 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] == "1":
                count += 1               # each land cell starts as its own island
                idx = i * n + j
                if i > 0 and grid[i - 1][j] == "1" and union(idx, (i - 1) * n + j):
                    count -= 1           # merged with the island above
                if j > 0 and grid[i][j - 1] == "1" and union(idx, i * n + j - 1):
                    count -= 1           # merged with the island to the left
    return count
```

Details that make it correct: uniting only with the **up and left** neighbors touches each adjacency edge exactly once (no double merges); `union`'s `False` return prevents double-decrementing the count. With path compression + union by rank, each operation amortizes to `O(α(m·n))` where `α` (inverse Ackermann) is ≤ 4 for any input size that could fit in physical memory, so this is effectively `O(m·n)`. **When to prefer it:** the input must stay intact *and* you're out of extra-matrix budget, or land arrives **online** (LeetCode 305) — flood fill can't handle incremental additions; union-find absorbs them naturally.

## 6. Complexity summary

| Approach | Time | Auxiliary space | Notes |
|---|---|---|---|
| Brute force (per-cell BFS + canonical rep) | `O((m·n)²)` | `O(m·n)` | ~8×10⁹ ops at 300×300 — reject |
| DFS recursive | `O(m·n)` | `O(m·n)` worst-case recursion depth | ❌ in Python (limit ~1,000; snake island ⇒ depth up to 90,000) |
| DFS iterative ⭐ | `O(m·n)` | `O(m·n)` worst-case stack | Mark-on-push ⇒ each cell pushed ≤ once |
| BFS (deque) | `O(m·n)` | `O(m·n)` worst case | On a solid rectangle the frontier is an anti-diagonal of ≤ `min(m,n)+1` cells — the source of the oft-quoted `O(min(m,n))` bound |
| Union-Find | `O(m·n·α(m·n)) ≈ O(m·n)` | `O(m·n)` | Best for the online variant; input untouched |

`O(m·n)` time is optimal per the Ω(m·n) adversary argument in §4.

## 7. Common mistakes & implementation gotchas

1. **`grid[i][j] == 1` instead of `== "1"`.** Values are strings/chars. In Python this is *silently* always `False` (you get 0 islands); in Java/C++ it's a compile error — which is at least loud.
2. **Allowing diagonals.** Built-in trap in Example 2 (`(2,2)` vs `(3,3)`): 8-directional moves give 2, correct answer is 3.
3. **Recursive DFS in Python.** `RecursionError` on deep snake islands; `setrecursionlimit` can still hard-crash the interpreter. Use an explicit stack.
4. **Mark-on-pop / no marking at all.** No marking ⇒ infinite ping-pong between two adjacent land cells. Marking only at pop ⇒ cells enqueued up to 4×. Mark at push.
5. **`list.pop(0)` as a queue in Python** — `O(n)` per pop, `O((m·n)²)` total. Use `collections.deque`.
6. **Row/column index confusion.** `m` = rows, `n` = cols; index as `grid[r][c]` (row first); flatten with `idx = i * n + j`. Thin grids (1×N, M×1) expose this instantly.
7. **Counting cells instead of components** (incrementing inside the fill) — all-land 3×3 would return 9 instead of 1.
8. **Mutating the interviewer's grid without asking.** Ask; otherwise use a `visited` matrix.
9. **Union-Find double-decrements** — only decrement when `union` returns `True`; scanning all four directions without a guard merges each edge twice (harmless to the *result* if guarded, but easy to break the count).

**Language-specific gotchas:**

| Language | Gotcha |
|---|---|
| Python | Recursion limit (~1,000) vs. up-to-90,000-deep fills; `deque` for BFS; string `"1"` comparisons. |
| Java | `grid` is `char[][]`: compare with `'1'` (single quotes) — `"1"` is a `String` and won't compile against `char`. Avoid `HashSet`/boxed types for visited — use `boolean[][]`. Deep recursion risks `StackOverflowError` on default thread stacks. |
| C++ | Same `'1'` vs `"1"` issue (`char` vs `const char*` comparison is ill-formed). Pass `vector<vector<char>>&` **by reference** — by-value copies the whole grid on every helper call. Deep recursion (~90k frames) can overflow a 1–8 MB stack; prefer the iterative stack. |

## 8. Test cases to propose out loud

| Input | Expected | What it verifies |
|---|---|---|
| Example 1 (4×5) | `1` | One merged blob; `(1,3)` attaches via `(0,3)` |
| Example 2 (4×5) | `3` | Diagonal cells `(2,2)`/`(3,3)` do **not** connect |
| All water, 3×3 | `0` | Count never increments; loop bounds correct |
| All land, 3×3 | `1` | One component, not 9 cells (per-cell counting bug detector) |
| `["1","0","1","0","1"]` (1×5) | `3` | Thin grid; catches row/col index swaps |
| `[["1","0"],["0","1"]]` (2×2) | `2` | 4-connectivity trap in minimal form |
| `[["1"]]` (1×1) | `1` | Minimal input |
| 300×300 snake island | `1` | Stress recursion depth → iterative DFS required |

> **Say out loud:** "I'd also test a snake-shaped island to make sure my implementation doesn't rely on recursion depth, and I'd confirm whether I'm allowed to mutate the grid — my primary version sinks cells in place."

## 9. Transferable patterns & related problems

The reusable template is **outer scan + flood fill per unvisited component**, plus **multi-source BFS** and **union-find** as sibling tools:

| Problem | Same skeleton / twist |
|---|---|
| 695 — Max Area of Island | Count component *size*, track the max |
| 463 — Island Perimeter | Per cell add `4 − (# land neighbors)` during the fill |
| 733 — Flood Fill | The primitive itself; recolor instead of count |
| 130 — Surrounded Regions | Flood-fill from *border* `'O'`s first, then flip the rest |
| 1254 — Number of Closed Islands | Island must never reach the border |
| 417 — Pacific/Atlantic Water Flow | Two multi-source DFS sweeps from the oceans |
| 994 — Rotting Oranges | Multi-source BFS; BFS level = time step |
| 542 — 01 Matrix | Multi-source BFS computing distances |
| 305 — Number of Islands II | Land arrives online → union-find with a live count |
| 547 — Number of Provinces | Identical component counting on an explicit graph |

## 10. Say it in 60 seconds

> "This is connected-components on a grid. I scan every cell in row-major order; the first time I hit a land cell I haven't consumed, that's a **new island** — I increment the count and flood-fill the whole component, marking every reachable land cell as consumed so nothing is ever recounted or re-explored. Marking at discovery time means each cell is processed exactly once, so it's **O of m times n** — and that's optimal, because flipping any single unread cell can change the answer, so every cell must be read.
>
> Implementation: **iterative DFS with an explicit stack** — not recursion, because on 300×300 a snake-shaped island can be 90,000 cells deep and Python caps recursion near a thousand. I'll **sink cells in place** — write `'0'` at push time — which marks them and dedupes the stack in one move. Two things I'd confirm: mutating the input is OK, otherwise I swap in a visited matrix for O(m·n) space; and values are the *string* `'1'`, not the integer.
>
> If the grid can't be mutated, or land arrives online, I'd switch to **union-find**: start the count at the number of land cells, decrement on every successful merge of up/left neighbors.
>
> One trap to flag: diagonals don't count — Example 2's corner-touching cells are separate islands, giving 3."
