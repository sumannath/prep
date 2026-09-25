# Spiral Matrix — Complete Interview Lesson

## 1. Problem Restatement

You're given an `m × n` grid of integers. Return a **flat list** of all `m·n` values ordered by a **clockwise spiral**, starting at the top-left cell `(0, 0)`, initially moving **right**, and turning clockwise whenever continuing straight would leave the unvisited region.

For `[[1,2,3],[4,5,6],[7,8,9]]`:

```
→  1  2  3        path: → → ↓ ← ← ↑ ↷ → (into center)
   4  5  6  ↓
   7  8  9
```

Three precision points before touching code:

- **Indices vs values.** The spiral is defined over *positions* `(row, col)`. Values only get copied into the output; they never influence the traversal.
- **Duplicates in the input are real.** With values in `[-100, 100]` and up to 100 cells, repeated values are guaranteed in some inputs. Any bookkeeping (e.g., a "visited" structure in the brute force) must be keyed by **position**, never by value.
- **Duplicates in the *output* are the classic bug.** The failure mode of this problem is printing a cell twice (or skipping one), which almost always traces back to boundary handling on single-row / single-column remainders.

Output is a new list — you're not asked to reorder the matrix in place.

## 2. Constraint Decoding

| Constraint | What it tells you |
|---|---|
| `1 <= m, n <= 10` | At most **100 cells**. Any polynomial approach passes. This is a *correctness-under-pressure* problem, not a performance problem — the interviewer is testing index discipline. Budget your time for hand-tracing, not micro-optimizing. |
| `1 <= m, n` (lower bound) | Matrix is never empty, so `matrix[0]` always exists. A one-line defensive `if not matrix: return []` is still cheap insurance if you mention it. |
| `-100 <= matrix[i][j] <= 100` | Values can repeat and be negative. No comparisons on values anywhere in the algorithm — negatives are a red herring. |
| (implicit) rectangular | All rows have length `n`, so one `right = n - 1` boundary is valid for the whole matrix. |

**Takeaway:** don't hunt for an algorithmic trick — hunt for the implementation that survives `1×n`, `m×1`, and non-square shapes.

## 3. Brute Force: Walk-and-Turn Simulation

**Idea.** Stand on a cell, walk in the current direction, and turn clockwise whenever the next cell is out of bounds **or already visited**. Track visited cells in a boolean matrix. Stop after `m·n` steps.

```python
def spiralOrder_bruteforce(matrix):
    m, n = len(matrix), len(matrix[0])
    visited = [[False] * n for _ in range(m)]
    dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]   # right, down, left, up
    result = []
    r = c = d = 0
    for _ in range(m * n):                       # exactly one visit per cell
        result.append(matrix[r][c])
        visited[r][c] = True
        nr, nc = r + dirs[d][0], c + dirs[d][1]
        if not (0 <= nr < m and 0 <= nc < n) or visited[nr][nc]:
            d = (d + 1) % 4                      # turn clockwise
            nr, nc = r + dirs[d][0], c + dirs[d][1]
        r, c = nr, nc
    return result
```

**Worked trace on Example 1** (`3×3`, start `(0,0)`, direction right):

| Step | Cell (r,c) | Value | Next cell (r,c) | Check | Action |
|---|---|---|---|---|---|
| 1 | (0,0) | 1 | (0,1) | in bounds, unvisited | move right |
| 2 | (0,1) | 2 | (0,2) | in bounds, unvisited | move right |
| 3 | (0,2) | 3 | (0,3) | **out of bounds** | turn down → (1,2) |
| 4 | (1,2) | 6 | (2,2) | ok | move down |
| 5 | (2,2) | 9 | (3,2) | out of bounds | turn left → (2,1) |
| 6 | (2,1) | 8 | (2,0) | ok | move left |
| 7 | (2,0) | 7 | (2,-1) | out of bounds | turn up → (1,0) |
| 8 | (1,0) | 4 | (0,0) | **visited** | turn right → (0,1) visited → turn down → (1,1) |
| 9 | (1,1) | 5 | all four neighbors visited/OOB | — | 9 = m·n steps done, stop |

Output: `[1,2,3,6,9,8,7,4,5]` ✓

**Assessment.** Time is still `O(mn)` (each cell appended exactly once, constant work per step), but extra space is `O(mn)` for the visited matrix, and the turn logic is fiddly. This is a useful teaching point: for traversal problems, "brute force vs. optimal" is usually about **how much state you carry**, not asymptotics. Also note the temptation to mark visited cells by mutating `matrix[r][c]` with a sentinel — that destroys the caller's input; always ask before mutating.

## 4. The Core Insight

A spiral is just **concentric rectangular rings**. Each ring is four straight runs along the four sides of the current submatrix. So instead of simulating step-by-step, maintain **four inclusive boundary indices**:

```
        left        right
top     [top][left] ... [top][right]
          ...             ...
bottom  [bottom][left] ... [bottom][right]
```

- **Invariant:** at the top of each loop iteration, the unprinted region is *exactly* rows `[top..bottom] × cols [left..right]` (closed intervals), and everything outside has been printed exactly once.
- Consume one side, then **immediately shrink that boundary**, then re-validate that the boundaries haven't crossed before consuming the sides that could walk back over consumed cells.
- Loop until the region is empty: `top > bottom` or `left > right`.

The shrink-then-recheck discipline is the entire difficulty of this problem — it is what makes single-row and single-column inputs work.

## 5. Optimal Approach: Shrinking Boundaries

### 5.1 Code

```python
def spiralOrder(matrix):
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    result = []

    while top <= bottom and left <= right:
        # 1) top row: left -> right
        for c in range(left, right + 1):
            result.append(matrix[top][c])
        top += 1

        # 2) right column: top -> bottom
        for r in range(top, bottom + 1):
            result.append(matrix[r][right])
        right -= 1

        # 3) bottom row: right -> left  — ONLY if a row remains
        if top <= bottom:
            for c in range(right, left - 1, -1):
                result.append(matrix[bottom][c])
            bottom -= 1

        # 4) left column: bottom -> top  — ONLY if a column remains
        if left <= right:
            for r in range(bottom, top - 1, -1):
                result.append(matrix[r][left])
            left += 1

    return result
```

### 5.2 Trace on Example 1: `[[1,2,3],[4,5,6],[7,8,9]]`

Start: `top=0, bottom=2, left=0, right=2`.

**Iteration 1** (guards `0≤2`, `0≤2` pass):

| Pass | Indices walked | Values | Boundary after |
|---|---|---|---|
| Top row L→R | row 0, c ∈ [0..2] | 1, 2, 3 | `top←1` |
| Right col T→B | col 2, r ∈ [1..2] | 6, 9 | `right←1` |
| Guard `top≤bottom`: **1≤2 ✓** → run | row 2, c ∈ [1..0] | 8, 7 | `bottom←1` |
| Guard `left≤right`: **0≤1 ✓** → run | col 0, r ∈ [1..1] | 4 | `left←1` |

**Iteration 2** (`top=1, bottom=1, left=1, right=1`; guards `1≤1`, `1≤1` pass):

| Pass | Indices walked | Values | Boundary after |
|---|---|---|---|
| Top row L→R | row 1, c ∈ [1..1] | 5 | `top←2` |
| Right col T→B | col 1, r ∈ [2..1] | *(empty)* | `right←0` |
| Guard `top≤bottom`: **2≤1 ✗ → skip** | — | — | — |
| Guard `left≤right`: **1≤0 ✗ → skip** | — | — | — |

**Iteration 3:** `top=2 > bottom=1` → exit.

Result: `[1,2,3,6,9,8,7,4,5]` ✓ — every cell printed exactly once.

### 5.3 Trace on Example 2: `[[1,2,3,4],[5,6,7,8],[9,10,11,12]]`

Start: `top=0, bottom=2, left=0, right=3`.

**Iteration 1:**

| Pass | Indices walked | Values | Boundary after |
|---|---|---|---|
| Top row L→R | row 0, c ∈ [0..3] | 1, 2, 3, 4 | `top←1` |
| Right col T→B | col 3, r ∈ [1..2] | 8, 12 | `right←2` |
| Guard `1≤2 ✓` → Bottom row R→L | row 2, c ∈ [2..0] | 11, 10, 9 | `bottom←1` |
| Guard `0≤2 ✓` → Left col B→T | col 0, r ∈ [1..1] | 5 | `left←1` |

**Iteration 2** (`top=1, bottom=1, left=1, right=2`):

| Pass | Indices walked | Values | Boundary after |
|---|---|---|---|
| Top row L→R | row 1, c ∈ [1..2] | 6, 7 | `top←2` |
| Right col T→B | col 2, r ∈ [2..1] | *(empty)* | `right←1` |
| Guard `top≤bottom`: **2≤1 ✗ → skip** | — | — | — |
| Guard `left≤right`: **1≤1 ✓ → run** | col 1, r ∈ [1..1] reversed → `range(1,1,-1)` | *(empty loop — harmless no-op)* | `left←2` |

**Iteration 3:** `top=2 > bottom=1` → exit.

Result: `[1,2,3,4,8,12,11,10,9,5,6,7]` ✓. Note how the leftover middle strip `6,7` is consumed as the "top row" of iteration 2 — this is exactly the case that breaks naive ring code that assumes square matrices.

### 5.4 Why the two guards are mandatory (the duplication proof)

After passes 1–2, `top` has been incremented and `right` decremented. The bottom-row pass (pass 3) walks **backwards over row `bottom`** — if the active band had only that one row left, pass 1 already printed it, and pass 3 would print it again in reverse.

- **Single row `1×n` (n ≥ 2):** pass 1 prints everything, `top←1 > bottom=0`. Without the `top <= bottom` guard, pass 3 re-prints columns `right-1 … left` — e.g., for `[[1,2]]` the output becomes `[1,2,1]`.
- **Single column `m×1` (m ≥ 3):** pass 2 prints everything, `right←-1 < left=0`. Without the `left <= right` guard, pass 4 re-prints rows `bottom … top+1` — e.g., for `[[1],[2],[3]]` the output becomes `[1,2,3,2]`.

With the guards, the four passes consume **disjoint** cell sets: pass 1 takes row `top`, pass 2 takes column `right` for rows `≥ top+1`, pass 3 takes row `bottom` for columns `≤ right-1`, pass 4 takes column `left` for rows `≤ bottom-1`. Every cell is appended exactly once — this is also why each value gets printed even when it duplicates another value in the input (position-based, not value-based).

## 6. Complexity Table

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Walk-and-turn + visited matrix | `O(mn)` | `O(mn)` | easiest to reason about; wasteful memory |
| Recursion on inner submatrix | `O(mn)` | `O(min(m,n))` stack (one frame per ring) | elegant, mention-only |
| **Shrinking boundaries (chosen)** | **`O(mn)`** | **`O(1)`** excluding output | each cell appended exactly once; ≤ `min(m,n)/2 + 1` iterations |
| Lower bound | `Ω(mn)` | — | any correct algorithm must write `m·n` values into the output, which alone costs linear time — so the boundary solution is asymptotically optimal, not just "fast enough" |

## 7. Common Mistakes

| # | Mistake | Symptom | Fix |
|---|---|---|---|
| 1 | Missing `if top <= bottom` guard before pass 3 | Single-row inputs print their tail twice (`[1,2]` → `[1,2,1]`) | Re-validate after shrinking `top`/`right` |
| 2 | Missing `if left <= right` guard before pass 4 | Tall single-column inputs duplicate middle elements (`[[1],[2],[3]]` → `[1,2,3,2]`) | Re-validate after shrinking `right`/`bottom` |
| 3 | `range(right, left, -1)` instead of `range(right, left - 1, -1)` | Bottom row's **leftmost cell silently dropped**; square test cases can still pass, so the bug hides | Remember `range`'s stop is *exclusive*; to include `left`, stop at `left - 1` |
| 4 | Forgetting one boundary update (e.g., `top += 1`) | Infinite loop or the same ring walked forever | Shrink the corresponding boundary **immediately** after each pass — never batch updates |
| 5 | Confusing boundaries (indices) with values | `right = n` instead of `n - 1`; tracing with values instead of `(row, col)` | Boundaries are **inclusive indices** on a closed interval `[a..b]`; every loop range must be derivable from them |
| 6 | Assuming a square matrix | Square traces pass; `3×4` and `2×3` fail (leftover middle row/column mishandled) | Test rectangular shapes explicitly |
| 7 | Visited tracking keyed by *value* (brute force variant) | Wrong output on inputs with repeated values | Visit bookkeeping is per **cell**, never per value |
| 8 | Mutating `matrix` to mark visited without asking | Destroys caller's data | Ask permission, or use a separate visited matrix |

### Language-specific gotchas

| Language | Gotcha |
|---|---|
| **Python** | The exclusive `range` stop (mistake #3) is *the* silent killer: `range(right, left, -1)` drops one element with no exception. |
| **Java** | Reverse loop must be `for (int c = right; c >= left; c--)` — translating Python's exclusive stop as `c > left` drops a column. If returning `List<Integer>`, every append autoboxes (`Integer.valueOf` per element — trivial at n ≤ 100, but mention you could pre-size with `new ArrayList<>(m*n)` or return an `int[]` with a write pointer to avoid boxing). |
| **C++** | `matrix[0].size()` is unsigned `size_t`; `auto right = matrix[0].size() - 1` wraps to a huge value if the row were empty — write `int right = (int)matrix[0].size() - 1;` once, up front. Also `result.reserve(m * n)` and take the matrix as `const vector<vector<int>>&` (by-value copies the whole grid). |

## 8. Test Cases to Propose Out Loud

Say these before or right after coding — proposing them yourself is a signal, and several are exactly where naive code breaks:

| # | Input | Expected output | What it verifies |
|---|---|---|---|
| 1 | `[[1,2,3],[4,5,6],[7,8,9]]` | `[1,2,3,6,9,8,7,4,5]` | Official ex. 1; square, odd side (center cell) |
| 2 | `[[1,2,3,4],[5,6,7,8],[9,10,11,12]]` | `[1,2,3,4,8,12,11,10,9,5,6,7]` | Official ex. 2; **non-square**, leftover middle row |
| 3 | `[[7]]` | `[7]` | 1×1; both guards must skip, loop exits |
| 4 | `[[1,2,3,4]]` | `[1,2,3,4]` | **Single row** — guard-1 trap (no duplicates) |
| 5 | `[[1],[2],[3]]` | `[1,2,3]` | **Single column** — guard-2 trap (no duplicates) |
| 6 | `[[1,2],[3,4]]` | `[1,2,4,3]` | 2×2; no center, all four passes length ≤ 2 |
| 7 | `[[1,2],[3,4],[5,6]]` | `[1,2,4,6,5,3]` | Tall rectangle; leftover middle **column** (`3` and `5` consumed in one upward pass) |
| 8 | `[[-1,5],[-1,5]]` | `[-1,5,5,-1]` | Repeated + negative values — traversal is position-driven, output order comes from geometry |

## 9. Transferable Patterns & Related Problems

- **Ring/boundary peeling.** Decompose an `m×n` region into concentric rectangles and process each with four straight runs. Directly reusable on: LC 59 *Spiral Matrix II* (fill `1..n²`), LC 885 *Spiral Matrix III*, LC 2326 *Spiral Matrix IV*, LC 48 *Rotate Image* (layer-by-layer rotation).
- **Shrink-then-recheck invariant.** Any time you consume a side and move a boundary, every subsequent pass over a *parallel* side must re-validate the crossing condition. This generalizes to any perimeter walk, submatrix shrinking, and in-place ring rotation.
- **Direction-vector walk with turn-on-blocked.** `(0,1),(1,0),(0,-1),(-1,0)` + "turn when next cell is blocked" solves a family of simulations: LC 498 *Diagonal Traverse*, LC 1041 *Robot Bounded in Circle*, LC 874 *Walking Robot Simulation*.
- **Closed-interval discipline.** Keeping `[top..bottom]`, `[left..right]` as closed intervals and deriving every loop range from them (never hardcoding `n-1` inline) is what makes the code provably consistent.
- **Output-size lower-bound reasoning.** "Can we do better?" questions on traversal problems: the output itself forces `Ω(mn)` time (you must write `m·n` values), so any per-cell-once algorithm is optimal. One sentence like this earns credit in interviews.

## 10. What to Say While Coding (Full Talk Track)

> "This is a traversal-simulation problem. Let me restate: return all `m·n` elements in clockwise spiral order starting at the top-left, moving right first.
>
> My plan: think of the matrix as concentric rings. I'll keep four inclusive boundaries — `top`, `bottom`, `left`, `right` — so the unprinted region is always rows `top..bottom` by columns `left..right`. In each round I do four straight passes: top row left-to-right, then shrink `top`; right column top-to-bottom, then shrink `right`; bottom row right-to-left, then shrink `bottom`; left column bottom-to-top, then shrink `left`.
>
> The one subtlety I know is ahead of me: after I shrink `top` and `right`, the remaining band might be a single row or a single column, and the bottom-row and left-column passes would walk over cells already printed. So I re-check `top <= bottom` before the bottom pass and `left <= right` before the left pass. Those two guards are what make `1×n` and `m×1` inputs correct.
>
> Complexity: each cell is appended exactly once, so `O(m·n)` time; boundaries are four integers, so `O(1)` extra space beyond the output — and since the output itself has `m·n` entries, that's optimal.
>
> Tests I'll run by hand: both official examples, a `1×1`, a single row, a single column, a `2×2`, and a tall `2×3` rectangle, because non-square shapes are where leftover rows and columns appear."

## 11. Say It in 60 Seconds

> "The matrix is concentric rings. I keep four inclusive boundaries — top, bottom, left, right — and while they haven't crossed, I run four straight passes: top row left-to-right, shrink top; right column top-to-bottom, shrink right; bottom row right-to-left, shrink bottom; left column bottom-to-top, shrink left.
>
> The key subtlety: after shrinking, the band might be a single row or column that's already been printed — so I re-check `top <= bottom` before the bottom pass and `left <= right` before the left pass. Those guards are what keep `1×n` and `m×1` inputs from printing duplicates.
>
> Every cell is touched exactly once, so it's O(m·n) time and O(1) extra space — optimal, since the output alone has m·n numbers.
>
> Traps are single-row, single-column, and non-square inputs plus off-by-ones in the reverse loops, so I'd hand-trace 1×1, 1×n, m×1, and a 2×3 before calling it done."
