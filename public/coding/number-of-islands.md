### Problem

Count connected groups of `"1"` cells in a grid (4-directional).

### Interview refresher

Treat land cells as graph nodes and count connected components. Scan every cell; on unvisited land, increment the count and BFS with a deque over the four neighbours, marking cells visited when you enqueue them (not when you dequeue) so nothing is queued twice. Use a seen set if the grid mustn’t be mutated. O(R × C) time and space. Prefer iterative BFS to recursive DFS on large grids. If land is added over time, use Union-Find: each new land cell adds one island, and each successful union with a land neighbour removes one.

### Hints

1. Each unvisited land cell starts a BFS that marks its whole island.
2. Iterative BFS avoids recursion limits.

### Approach

Scan cells; on unvisited land, increment the count and BFS to mark the island visited.

### Deep dive

#### What the interviewer is really testing

Fluency with graph traversal on a grid, clean bounds checking, and narrating as you code. It’s often the warm-up, so speed and clarity count.

#### Reframe it as a graph

Every land cell is a node; neighbouring land cells (up, down, left, right) are connected. An island is a connected component, so counting islands means counting components.

#### Why flood fill works

Scan the grid. The first time you see an unvisited land cell, it must belong to a new island, so add one. Then explore everything reachable and mark it visited, so that island is never counted again. Each cell is visited at most once: O(rows × cols).

#### BFS or DFS?

Both work. Recursive DFS is shorter but can hit Python’s recursion limit on a big island (a 1000×1000 grid of land). Iterative BFS with a queue avoids that, which is why it’s used here.

#### Why mark visited when adding to the queue

If you mark a cell only when taking it out, two neighbours can both add it before either is processed. Marking on the way in guarantees each cell enters the queue once.

#### When land is added over time

Re-running BFS after every addition is wasteful. Union-Find (disjoint sets) is built for “merge these two groups and tell me how many groups exist”: each new land cell starts as its own island, and each successful join with a separate land neighbour reduces the count by one.

### Reference solution

```python
from collections import deque


def num_islands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    seen = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or (r, c) in seen:
                continue
            islands += 1
            seen.add((r, c))
            q = deque([(r, c)])
            while q:
                x, y = q.popleft()
                for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                    if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == "1" and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        q.append((nx, ny))
    return islands


assert num_islands([list("11000"), list("11000"), list("00100"), list("00011")]) == 3
```

**Time:** O(R·C)  
**Space:** O(R·C)

### Questions to ask before coding

- Are diagonal neighbours connected?
- May I modify the grid to mark visited cells?
- How large can the grid be?
- Is the grid static, or does land get added over time?

### Interview walkthrough

**Interviewer:** Count the islands in a grid of ones and zeros.

**You:** Four-directional connectivity, not diagonal? And may I modify the grid, or should I keep a separate visited set?

**Interviewer:** Four directions. Don’t modify the input.

**You:** I’ll treat land cells as graph nodes and count connected components. I scan every cell; each unvisited land cell starts a new island, and a breadth-first search marks the whole island. Each cell is processed once, so it’s linear in grid size.

**You:** I’m using an iterative queue rather than recursion because a big island could exceed Python’s recursion limit, and I mark cells visited as I enqueue them so nothing is added twice.

**You:** Test: the classic example with a 2×2 block, a single cell and a 1×2 strip gives 3.

**Interviewer:** Now cells turn from water to land one at a time. Report the count after each.

**You:** I’d use Union-Find. Each new land cell adds one island, and each successful union with a neighbouring land cell removes one. With path compression, each operation is nearly constant.

### Scale-up follow-up

**Interviewer adds:** “Land is added one cell at a time; report the island count after each addition.”

That's Number of Islands II: Union-Find with path compression and union by rank. Each addition creates a set (+1) and unions with land neighbours (−1 per successful union).

### Where candidates slip

- Marking visited when popping instead of when pushing, which enqueues duplicates.
- Mutating the input grid without asking.
