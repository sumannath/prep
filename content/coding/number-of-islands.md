### Problem

Count connected groups of `"1"` cells in a grid (4-directional).

#### In plain words

The grid is a map: `"1"` is land and `"0"` is water. An **island** is a group of land cells connected up, down, left or right (not diagonally). Count the islands.

```text
1 1 0 0 0
1 1 0 0 0      three islands: the 2×2 block, the single 1 in the middle,
0 0 1 0 0      and the 1×2 strip at the bottom right
0 0 0 1 1
```

#### Words used on this page

| Term | Meaning |
|---|---|
| Neighbour | A cell directly up, down, left or right (4-directional). |
| Connected component | A group of nodes where each can reach every other. Here, an island. |
| BFS | Breadth-first search: explore outward layer by layer using a queue. |
| DFS | Depth-first search: follow one path as far as possible, often recursively. |
| Visited set | The cells already handled, so none is counted twice. |
| Union-Find | A structure that tracks which items are in the same group and merges groups quickly. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

Treat land cells as graph nodes and count connected components. Scan every cell; on unvisited land, increment the count and BFS with a deque over the four neighbours, marking cells visited when you enqueue them (not when you dequeue) so nothing is queued twice. Use a seen set if the grid mustn’t be mutated. O(R × C) time and space. Prefer iterative BFS to recursive DFS on large grids (one big island blows the recursion limit). If land is added over time, use Union-Find: each new land cell adds one island, and each successful union with a land neighbour removes one.

**Cheat sheet**

1. **Ask:** diagonals connected? may I modify the grid? how large? static or changing?
2. **Tests first:** example, empty, all water, diagonals separate, ring is one island, input untouched, one huge island.
3. **Build:** scan cells; on new land → count += 1, BFS with `deque` + `seen`, mark on enqueue.
4. **Cost:** O(R × C) time and space.
5. **Follow-ups:** land added over time → Union-Find; diagonals → 8 directions.

### Background you need

#### 1. A grid is a graph

Each land cell is a node, with an edge to each land neighbour. An island is a **connected component**. Counting islands = counting components: start a search from each land cell you haven't seen yet, and each search covers exactly one island.

#### 2. The four neighbours, safely

```python
def neighbours(r, c, rows, cols):
    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:      # stay inside the grid
            yield nr, nc

print(list(neighbours(0, 0, 3, 3)))
```

```text
[(1, 0), (0, 1)]
```

#### 3. BFS with a queue

`collections.deque` gives O(1) `append` and `popleft`. BFS repeatedly takes the oldest cell and adds its unvisited land neighbours.

**Mark cells visited when you add them to the queue, not when you take them out.** Otherwise a cell with two land neighbours already in the queue gets added twice. That doesn't break the count, but it wastes time and memory.

#### 4. Recursion vs an explicit queue

Recursive DFS is short, but each step goes one call deeper. A single island of 90,000 cells can mean 90,000 nested calls, and Python stops at about 1,000. An explicit queue (or stack) has no such limit.

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Are diagonal neighbours connected? | The neighbour list. | No (usual) → 4 directions. Yes → 8 directions (see Follow-ups). |
| May I modify the grid to mark visited cells? | Side effects vs memory. | No → a separate `seen` set. Yes → overwrite visited `"1"`s with `"0"`, which saves memory (and say so). |
| How large can the grid be? | Recursion limit and memory. | Large → iterative BFS, not recursion. |
| Is the grid static, or is land added over time? | One-off vs incremental. | Added over time → Union-Find (see Follow-ups). |
| Cells as strings `"1"`/`"0"` or ints? | Input format. | Match it exactly in comparisons. |

**If they say "your call", state your defaults out loud:**

> "Four-directional, the input grid stays untouched, the grid may be large so no recursion, and it's static."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass, including one big island to make sure I don't hit the recursion limit."

#### Work the example by hand

```text
scan (0,0): land, unseen → islands = 1, BFS covers (0,0) (0,1) (1,0) (1,1)
scan (2,2): land, unseen → islands = 2, BFS covers (2,2)
scan (3,3): land, unseen → islands = 3, BFS covers (3,3) (3,4)
every other land cell is already seen → 3
```

#### The tests, one per requirement

Code in `islands.py`, tests in `test_islands.py`. A helper turns rows of text into the grid of strings.

```python
# file: test_islands.py
from islands import num_islands


def grid(*rows):
    return [list(r) for r in rows]


def test_the_example():
    assert num_islands(grid("11000", "11000", "00100", "00011")) == 3


def test_empty_grid():
    assert num_islands([]) == 0


def test_all_water():
    assert num_islands(grid("000", "000")) == 0


def test_diagonals_are_not_connected():
    assert num_islands(grid("101", "010", "101")) == 5


def test_a_ring_is_one_island():
    assert num_islands(grid("111", "101", "111")) == 1


def test_the_input_is_not_modified():
    g = grid("110", "011")
    num_islands(g)
    assert g == grid("110", "011")


def test_one_huge_island():
    assert num_islands([["1"] * 300 for _ in range(300)]) == 1
```

#### Red: run them against an empty stub

```python
# file: islands.py
def num_islands(grid):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_islands.py
```

```text
FFFFFFF                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_islands.py::test_the_example - NotImplementedError
FAILED test_islands.py::test_empty_grid - NotImplementedError
FAILED test_islands.py::test_all_water - NotImplementedError
FAILED test_islands.py::test_diagonals_are_not_connected - NotImplementedError
FAILED test_islands.py::test_a_ring_is_one_island - NotImplementedError
FAILED test_islands.py::test_the_input_is_not_modified - NotImplementedError
FAILED test_islands.py::test_one_huge_island - NotImplementedError
7 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. If you find a land cell no search has reached yet, what have you found?
2. How do you make sure each island is counted once?
3. What happens to a recursive search on one enormous island?

#### The key insight

Land cells are graph nodes, and islands are connected components. Scan every cell. When you hit land that hasn't been visited, that's a **new island**: count it, then flood the whole island (BFS) and mark every cell visited, so the scan never counts it again. Every cell is processed a constant number of times: O(R × C).

#### The common first answer

Recursive DFS that "sinks" each island by overwriting `"1"` with `"0"` is short and popular. But it modifies the caller's grid, and it overflows Python's stack on large islands. Our tests cover both.

#### The plan (say this, then wait for a nod)

> **Say:** "Treat land as graph nodes and count connected components. I scan every cell; each unvisited land cell starts a new island, and a breadth-first search with a queue marks the whole island in a separate visited set, since I mustn't modify the grid. I mark cells when I enqueue them so nothing's queued twice, and I use a queue rather than recursion so a big island can't hit the recursion limit. O(R × C)."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: recursive DFS that sinks islands (the common first answer)

```python
# file: islands.py
def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])

    def sink(r, c):
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != "1":
            return
        grid[r][c] = "0"                          # mark visited by overwriting the input
        sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1)

    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                islands += 1
                sink(r, c)
    return islands
```

```bash
pytest -q --tb=no -rf test_islands.py
```

```text
.....FF                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_islands.py::test_the_input_is_not_modified - AssertionError: assert [['0', '0', '...0...
FAILED test_islands.py::test_one_huge_island - RecursionError: maximum recursion depth exceeded
2 failed, 5 passed in 0.01s
```

Two reds, exactly the two concerns: the caller's grid was overwritten, and one 90,000-cell island blew the recursion limit.

#### Stage 2: iterative BFS with a visited set

> **Say:** "Same idea, but a queue instead of recursion, and a seen set instead of overwriting the grid."

```python
# file: islands.py
from collections import deque


def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    seen = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or (r, c) in seen:
                continue
            islands += 1                          # unvisited land = a new island
            seen.add((r, c))
            queue = deque([(r, c)])
            while queue:
                x, y = queue.popleft()
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if (0 <= nx < rows and 0 <= ny < cols
                            and grid[nx][ny] == "1" and (nx, ny) not in seen):
                        seen.add((nx, ny))        # mark on enqueue, not on dequeue
                        queue.append((nx, ny))
    return islands
```

```bash
pytest -q --tb=no -rf test_islands.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

**Time:** O(R × C): each cell is scanned once and enqueued at most once. **Space:** O(R × C) for `seen` and the queue.

### Step 5 · Run everything and refactor

#### Trace the BFS from (0,0) on the example

| dequeued | land neighbours not yet seen | queue after | seen (island so far) |
|---|---|---|---|
| (0,0) | (1,0), (0,1) | (1,0) (0,1) | (0,0) (1,0) (0,1) |
| (1,0) | (1,1) | (0,1) (1,1) | + (1,1) |
| (0,1) | — ((1,1) already seen on enqueue) | (1,1) | |
| (1,1) | — | empty | island done |

Note the third row: because (1,1) was marked when it was **enqueued**, (0,1) doesn't add it a second time.

#### Refactor: pull out the neighbour logic

No behaviour change, so the existing tests must stay green. Separating "which cells are neighbours" from "how we flood" makes the diagonal follow-up a one-line change.

```python
# file: islands.py
from collections import deque
from typing import Iterator

Grid = list[list[str]]
FOUR = ((1, 0), (-1, 0), (0, 1), (0, -1))


def _neighbours(r: int, c: int, rows: int, cols: int, dirs=FOUR) -> Iterator[tuple[int, int]]:
    for dr, dc in dirs:
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            yield nr, nc


def num_islands(grid: Grid) -> int:
    """Count 4-connected groups of "1" cells. The grid is not modified."""
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    seen: set[tuple[int, int]] = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or (r, c) in seen:
                continue
            islands += 1
            seen.add((r, c))
            queue = deque([(r, c)])
            while queue:
                x, y = queue.popleft()
                for nx, ny in _neighbours(x, y, rows, cols):
                    if grid[nx][ny] == "1" and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
    return islands
```

```bash
pytest -q --tb=no -rf test_islands.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Water turns into land one cell at a time; report the count after each"

**What changes:** re-running BFS after every addition is O(R × C) per step, too slow. Use **Union-Find** (also called disjoint set union):

- Each land cell starts as its own group, so adding a cell gives **+1** island.
- For each land neighbour, **union** the two groups. If they were different groups, two islands just merged: **−1**.
- `find(x)` follows parent pointers to a group's root. **Path compression** points nodes straight at the root as you go, and **union by size** hangs the smaller tree under the larger. Together they make each operation nearly O(1).

**Tests first:**

```python
# file: test_islands.py (append)
from islands import islands_after_each_addition


def test_counts_after_each_land_addition():
    assert islands_after_each_addition(3, 3, [(0, 0), (0, 1), (1, 2), (2, 1)]) == [1, 1, 2, 3]


def test_an_addition_can_merge_two_islands():
    assert islands_after_each_addition(1, 3, [(0, 0), (0, 2), (0, 1)]) == [1, 2, 1]


def test_adding_the_same_cell_twice_changes_nothing():
    assert islands_after_each_addition(2, 2, [(0, 0), (0, 0)]) == [1, 1]
```

```python
# file: islands.py (append)
def islands_after_each_addition(rows, cols, positions):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_islands.py -k "addition or merge or twice"
```

```text
FFF                                                                                          [100%]
===================================== short test summary info =====================================
FAILED test_islands.py::test_counts_after_each_land_addition - NotImplementedError
FAILED test_islands.py::test_an_addition_can_merge_two_islands - NotImplementedError
FAILED test_islands.py::test_adding_the_same_cell_twice_changes_nothing - NotImplementedError
3 failed, 7 deselected in 0.01s
```

```python
# file: islands.py (replace the islands_after_each_addition stub)
class _UnionFind:
    def __init__(self):
        self.parent: dict = {}
        self.size: dict = {}

    def add(self, x) -> None:
        self.parent[x], self.size[x] = x, 1

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:                 # path compression
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                              # already one island
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                          # union by size
        self.size[ra] += self.size[rb]
        return True


def islands_after_each_addition(rows: int, cols: int,
                                positions: list[tuple[int, int]]) -> list[int]:
    uf, count, out = _UnionFind(), 0, []
    for r, c in positions:
        if (r, c) not in uf.parent:
            uf.add((r, c))
            count += 1                                # a new island…
            for nb in _neighbours(r, c, rows, cols):
                if nb in uf.parent and uf.union((r, c), nb):
                    count -= 1                        # …merged with a neighbour's
        out.append(count)
    return out
```

```bash
pytest -q --tb=no -rf test_islands.py
```

```text
..........                                                                                   [100%]
10 passed in 0.01s
```

**Time:** about O(k) for k additions (each operation is nearly constant).

#### Follow-up 2: "Diagonal cells count as connected too"

**What changes:** only the neighbour directions: eight instead of four. Because of the refactor, it's a parameter.

```python
# file: test_islands.py (append)
def test_diagonal_connectivity_when_asked():
    assert num_islands(grid("101", "010", "101"), diagonal=True) == 1
    assert num_islands(grid("101", "010", "101")) == 5        # default unchanged
```

```bash
pytest -q --tb=no -rf test_islands.py -k diagonal
```

```text
.F                                                                                           [100%]
===================================== short test summary info =====================================
FAILED test_islands.py::test_diagonal_connectivity_when_asked - TypeError: num_islands() got an u...
1 failed, 1 passed, 9 deselected in 0.01s
```

```python
# file: islands.py (replace num_islands)
EIGHT = FOUR + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def num_islands(grid: Grid, diagonal: bool = False) -> int:
    """Count connected groups of "1" cells (4-connected, or 8 with diagonal=True)."""
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    dirs = EIGHT if diagonal else FOUR
    seen: set[tuple[int, int]] = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or (r, c) in seen:
                continue
            islands += 1
            seen.add((r, c))
            queue = deque([(r, c)])
            while queue:
                x, y = queue.popleft()
                for nx, ny in _neighbours(x, y, rows, cols, dirs):
                    if grid[nx][ny] == "1" and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
    return islands
```

```bash
pytest -q --tb=no -rf test_islands.py
```

```text
...........                                                                                  [100%]
11 passed in 0.01s
```

#### Follow-up 3: "The grid is too big for memory"

Stream it row by row. Keep Union-Find labels for just the previous row and the current row, union across them, and count a component as finished when none of its cells continue into the next row. Memory becomes O(columns) instead of O(R × C).

### Mock dialogue

**Interviewer:** Count the islands in a grid of ones and zeros.

**You:** Four-directional connectivity, not diagonal? And may I modify the grid, or should I keep a separate visited set?

**Interviewer:** Four directions. Don’t modify the input.

**You:** Before coding, the tests: the classic example, an empty grid, all water, a diagonal pattern that must stay five islands, a ring that's one island, that the grid is unchanged afterwards, and one 300 by 300 island.

**You:** I’ll treat land cells as graph nodes and count connected components. I scan every cell; each unvisited land cell starts a new island, and a breadth-first search marks the whole island. Each cell is processed once, so it’s linear in grid size.

**You:** I’m using an iterative queue rather than recursion because a big island could exceed Python’s recursion limit; that's what the 300 by 300 test is for. And I mark cells visited as I enqueue them so nothing is added twice.

**You:** All green.

**Interviewer:** Now cells turn from water to land one at a time. Report the count after each.

**You:** I'll write the test with a few additions, including one that merges two islands. Then Union-Find: each new land cell adds one island, and each successful union with a neighbouring land cell removes one. With path compression, each operation is nearly constant.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Overwriting the grid to mark visited, without asking | Surprises the caller. | `test_the_input_is_not_modified` |
| Recursive DFS on big grids | `RecursionError` on one large island. | `test_one_huge_island` |
| Marking visited on dequeue instead of enqueue | Cells are queued several times: slower, more memory. | None (speed); explain it while coding. |
| Including diagonals by default | Wrong count. | `test_diagonals_are_not_connected` |
| Not checking bounds before indexing | `IndexError`, or negative indices silently wrapping around. | `test_the_example`, `test_a_ring_is_one_island` |
| Re-running BFS after each added cell | O(R × C) per addition. | Use Union-Find; `test_counts_after_each_land_addition`. |
