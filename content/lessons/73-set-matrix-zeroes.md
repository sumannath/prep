# Set Matrix Zeroes — Complete Interview Lesson

## 1. Problem Restatement (in your own words)

You are given an `m x n` integer matrix. Every cell that **originally** holds the value `0` forces its **entire row** and **entire column** to become all zeros. The mutation must happen **in place** — you may not allocate a new matrix and return it; the function mutates the input (in Python it returns `None`; LeetCode inspects the mutated array).

Two phrases in the statement carry the whole difficulty:

- **"if an element is 0"** — the *decision set* is defined by the zeros in the **original** matrix, before any mutation. Zeros you *create* along the way must not trigger further zeroing.
- **"in place"** — you may use O(1) extra variables, and the matrix itself is fair game as working memory.

**Vocabulary precision (indices vs. values):** the matrix has `m = len(matrix)` rows and `n = len(matrix[0])` columns. Cell `(i, j)` means `matrix[i][j]` with `i ∈ [0, m)` and `j ∈ [0, n)`. "Row `i`" is the cells `(i, 0) … (i, n−1)`; "column `j`" is `(0, j) … (m−1, j)`. The **value** `0` is the trigger; the **positions** row 0 and column 0 will later serve as our flag storage — do not conflate "value 0" with "position (0, j)".

---

## 2. Decoding the Constraints (and the Follow-Up Ladder)

| Constraint | What it really tells you |
|---|---|
| `1 <= m, n <= 200` | At most 40,000 cells. **Time is a non-issue** — any O(mn)-ish pass runs instantly. The entire problem is a *space* puzzle. `m, n ≥ 1` guarantees `matrix[0]` exists, so no empty-matrix guard is strictly needed (though a one-line guard is cheap). |
| `-2^31 <= matrix[i][j] <= 2^31 - 1` | Values span the **full signed 32-bit range**. This kills the classic "mark with a dummy value" trick: *every* integer you could pick as a sentinel is a legal input value. There is no safe marker **value** — which is what forces the marker-by-**position** insight below. |
| "In place" + follow-up ladder (O(mn) → O(m+n) → O(1)) | The interviewer is explicitly grading *progressive optimization*. Narrate the ladder out loud; jumping straight to O(1) without explaining the O(m+n) stepping stone looks like memorization. |

In C++/Java, also note `INT_MIN` (−2^31) is a legal cell value, so any arithmetic like `-INT_MIN` or `abs(cell)` risks signed-overflow UB if you fiddle with sentinel-style ideas (see §9).

---

## 3. First Attempt: Why the Obvious In-Place Idea Fails

The naive idea: scan the matrix; whenever you see a `0`, zero its row and column immediately.

**This is wrong**, because after your first mutation you can no longer distinguish an **original zero** from a **zero you just created**, and the newly created zeros cascade.

Worked failure trace on `[[0,1],[1,1]]` (correct answer: the zero at (0,0) zeroes row 0 and column 0 → `[[0,0],[0,1]]`):

| Step | Action | Matrix state |
|---|---|---|
| start | — | `[[0,1],[1,1]]` |
| scan (0,0): value 0 | zero row 0, column 0 | `[[0,0],[0,1]]` |
| scan (0,1): value 0 — **created**, not original | zero row 0, column 1 | `[[0,0],[0,0]]` |
| result | — | `[[0,0],[0,0]]` ❌ (the legitimate `1` at (1,1) was destroyed) |

Example 2 fails the same way: after the zero at (0,0) zeroes column 0, the scan meets the freshly created `0` at (0,1) and wrongly wipes column 1 (destroying the `4` and `3`).

**Lesson:** you must **separate deciding from mutating** — collect all decisions from the pristine matrix first, then apply them.

---

## 4. Baseline Solutions (the Expected Ladder)

### 4.1 Straightforward: snapshot the matrix — O(mn) space

Copy the matrix, scan the **snapshot** for zeros, and zero rows/columns in the **original**. The snapshot preserves the original zero set no matter how much you mutate.

```python
def setZeroes_copy(matrix: list[list[int]]) -> None:
    m, n = len(matrix), len(matrix[0])
    snapshot = [row[:] for row in matrix]   # true per-row copy (see Python gotcha, §9)
    for i in range(m):
        for j in range(n):
            if snapshot[i][j] == 0:
                for c in range(n):
                    matrix[i][c] = 0
                for r in range(m):
                    matrix[r][j] = 0
```

Trace on **Example 1**: snapshot has exactly one zero, at (1,1) → zero row 1 and column 1 → `[[1,0,1],[0,0,0],[1,0,1]]` ✅.

Time is `O(mn + k·(m+n))` (each of the `k` zeros rewrites a row and a column, `k ≤ mn`); space is `O(mn)`. Correct, but the follow-up explicitly calls this "a bad idea."

### 4.2 The expected improvement: one boolean per row and per column — O(m+n) space

Key reduction: **row `i` must be zeroed ⟺ row `i` contained ≥ 1 original zero** — a single yes/no fact per row; likewise per column. So the entire decision is just `m + n` booleans (each row/column's fate is one bit of information — that's the whole "information budget" of this problem).

```python
def setZeroes_flags(matrix: list[list[int]]) -> None:
    m, n = len(matrix), len(matrix[0])
    row_has_zero = [False] * m
    col_has_zero = [False] * n

    for i in range(m):                      # pass 1: DECIDE from the pristine matrix
        for j in range(n):
            if matrix[i][j] == 0:
                row_has_zero[i] = True
                col_has_zero[j] = True

    for i in range(m):                      # pass 2: MUTATE
        for j in range(n):
            if row_has_zero[i] or col_has_zero[j]:
                matrix[i][j] = 0
```

Trace on **Example 2** (`m=3, n=4`):

| Pass 1 finds zeros at | `row_has_zero` | `col_has_zero` |
|---|---|---|
| (0,0) and (0,3) | `{0}` | `{0, 3}` |

Pass 2 zeroes every cell with `i = 0` or `j ∈ {0, 3}`:
row 0 → all zeros; rows 1–2 → columns 0 and 3 zeroed.
Result: `[[0,0,0,0],[0,4,5,0],[0,3,1,0]]` ✅ — and note `4, 5, 3, 1` survive because their columns were never flagged.

Time **O(mn)**, space **O(m+n)**. This is the "simple improvement" the follow-up names — state it, then ask: *can the matrix hold these `m + n` bits for me?*

---

## 5. The Core Insight

> **Don't mark with values — mark with positions. And the positions are free: the first row and first column.**

Three links in the chain:

1. **No value can be a marker.** The value range is the full 32-bit span, so any sentinel collides with real data (concrete demo in §8, mistake #2). Values are adversary-controlled; **positions are ours**.
2. **We need exactly `m + n` bits of bookkeeping, and the matrix is bigger than that.** For `m, n ≥ 2`, the matrix has `mn ≥ m + n` cells, so it can store its own metadata. We repurpose **row 0** as the "column flags" (`matrix[0][j] == 0` ⟺ "column `j` contains an original zero") and **column 0** as the "row flags" (`matrix[i][0] == 0` ⟺ "row `i` contains an original zero").
3. **One bit doesn't fit: the shared corner.** Cell `(0,0)` belongs to both row 0 and column 0, so row 0 + column 0 provide only `m + n − 1` storage cells. The missing bit — "does row 0 itself contain an original zero?" — goes into **one boolean variable** (column 0's status is self-storing, see below).

### Why this encoding is self-consistent (the argument that makes it airtight)

- A zero at an **interior** cell `(i, j)`, `i ≥ 1, j ≥ 1` → writes marker `matrix[i][0] = 0` and `matrix[0][j] = 0`. No false positives: we only ever write a marker when that exact row/column truly contained an original zero.
- A zero **in column 0** at `(i, 0)`, `i ≥ 1` → needs no marker write at all: `matrix[i][0]` **already reads 0**, and that cell *is* row `i`'s flag. Column 0's own status is captured by the second boolean. The encoding is self-marking at the boundary.
- A zero **in row 0** at `(0, j)`, `j ≥ 1` → same trick: `matrix[0][j]` already reads 0 and *is* column `j`'s flag. Row 0's status is the saved boolean.

So boundary zeros need no special-casing; they fall out of the encoding. That's what you say when the interviewer pokes at the corners.

---

## 6. Optimal Solution: O(1) Space

### 6.1 Algorithm (order of operations is the whole game)

1. **Capture first** (before anything mutates): `first_row_has_zero` — does row 0 contain a 0? `first_col_has_zero` — does column 0 contain a 0?
2. **Mark** (interior only, `i ∈ [1, m)`, `j ∈ [1, n)`): if `matrix[i][j] == 0`, set `matrix[i][0] = 0` and `matrix[0][j] = 0`.
3. **Zero flagged interior rows**: for each `i ≥ 1` with `matrix[i][0] == 0`, set `matrix[i][j] = 0` for `j ∈ [1, n)`.
4. **Zero flagged interior columns**: for each `j ≥ 1` with `matrix[0][j] == 0`, set `matrix[i][j] = 0` for `i ∈ [1, m)`.
5. **Last**, zero row 0 and column 0 from the **saved booleans** (never re-derive them — the matrix has been rewritten by then).

Safety of the ordering: steps 3 and 4 only write into `rows ≥ 1, cols ≥ 1`, so they never touch the markers living in row 0 / column 0 (they can even run in either order). Every write is either a marker that can't be misread, or an assignment of a cell's correct final value — idempotent. Step 5 must come last because it destroys the metadata.

### 6.2 Code

```python
def setZeroes(matrix: list[list[int]]) -> None:
    """LeetCode 73. Mutates `matrix` in place; O(mn) time, O(1) space."""
    m, n = len(matrix), len(matrix[0])   # constraints guarantee m, n >= 1

    # 1) Capture boundary status BEFORE any mutation.
    first_row_has_zero = any(v == 0 for v in matrix[0])
    first_col_has_zero = any(matrix[i][0] == 0 for i in range(m))

    # 2) Mark: row 0 flags columns, column 0 flags rows (interior only).
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][j] == 0:
                matrix[i][0] = 0     # "row i must be zeroed"
                matrix[0][j] = 0     # "column j must be zeroed"

    # 3) Zero flagged interior rows (never touches row 0 or column 0).
    for i in range(1, m):
        if matrix[i][0] == 0:
            for j in range(1, n):
                matrix[i][j] = 0

    # 4) Zero flagged interior columns (never touches row 0 or column 0).
    for j in range(1, n):
        if matrix[0][j] == 0:
            for i in range(1, m):
                matrix[i][j] = 0

    # 5) Finally handle the boundary, from the saved booleans — LAST.
    if first_row_has_zero:
        for j in range(n):
            matrix[0][j] = 0
    if first_col_has_zero:
        for i in range(m):
            matrix[i][0] = 0
```

### 6.3 Trace on Example 1 — `[[1,1,1],[1,0,1],[1,1,1]]`

| Stage | Action | Matrix state |
|---|---|---|
| 1. Capture | row 0 = `[1,1,1]` → `first_row_has_zero = False`; col 0 = `[1,1,1]` → `first_col_has_zero = False` | unchanged |
| 2. Mark | interior zero at (1,1) → `matrix[1][0] = 0`, `matrix[0][1] = 0` | `[[1,0,1],[0,0,1],[1,1,1]]` |
| 3. Rows | `matrix[1][0] == 0` → zero row 1 (cols 1–2); row 2's flag is 1 → skip | `[[1,0,1],[0,0,0],[1,1,1]]` |
| 4. Columns | `matrix[0][1] == 0` → zero column 1 (rows 1–2); column 2's flag is 1 → skip | `[[1,0,1],[0,0,0],[1,0,1]]` |
| 5. Boundary | both booleans `False` → skip | `[[1,0,1],[0,0,0],[1,0,1]]` ✅ |

### 6.4 Trace on Example 2 — `[[0,1,2,0],[3,4,5,2],[1,3,1,5]]`

| Stage | Action | Matrix state |
|---|---|---|
| 1. Capture | row 0 = `[0,1,2,0]` → `first_row_has_zero = True`; col 0 = `[0,3,1]` → `first_col_has_zero = True` | unchanged |
| 2. Mark | interior cells are `4,5,2 / 3,1,5` — **no interior zeros**, so no markers written | unchanged |
| 3. Rows | `matrix[1][0]=3`, `matrix[2][0]=1` → skip both | unchanged |
| 4. Columns | `matrix[0][1]=1`, `matrix[0][2]=2` → skip; `matrix[0][3]=0` → zero column 3 (rows 1–2) | `[[0,1,2,0],[3,4,5,0],[1,3,1,0]]` |
| 5. Boundary | `first_row_has_zero` → zero row 0; `first_col_has_zero` → zero column 0 | `[[0,0,0,0],[0,4,5,0],[0,3,1,0]]` ✅ |

Two subtleties this example stress-tests, worth calling out loud:

- `matrix[0][3] = 0` is an **original** zero that doubles perfectly as the column-3 flag (column 3 really does contain a zero) — the self-marking property at work.
- All row/column decisions here come from zeros *already in row 0 / column 0*. Any solution that forgets the captured booleans (or captures them after mutation) fails exactly on this input.

---

## 7. Complexity Table

| # | Approach | Time | Extra space | Verdict |
|---|---|---|---|---|
| 1 | Cascade while scanning in place | O(mn) | O(1) | ❌ over-zeros (§3) |
| 2 | Snapshot copy + rewrite per zero | O(mn + k·(m+n)), `k` = #zeros ≤ mn | O(mn) | ✅ but the "bad idea" |
| 3 | Row/column flag arrays | O(mn) | O(m+n) | ✅ expected improvement |
| 4 | Sentinel-value marking (walk row+col per zero, mark with dummy) | O((m+n)·k) — each of the `k` zeros walks `m + n` cells | O(1) | ❌ sentinel collision (§8) |
| 5 | **First row / column as flag storage** | **O(mn)** — a constant number of full-matrix passes | **O(1)** — two booleans | ✅ **optimal** |

**Lower-bound note (not just this solution's own complexity):** O(mn) time is also necessary in the worst case — if an algorithm skips even one cell, an adversary can present two inputs differing only there (cell = 0, which zeroes its entire row and column and thus changes Θ(m+n) output cells, vs. cell ≠ 0), and the algorithm would emit the same output for both, so it must read every cell.

---

## 8. Common Mistakes

1. **Mutating while deciding (the cascade).** A newly created zero triggers its own row/column. Minimal counterexample: `[[0,1],[1,1]]` → naive output `[[0,0],[0,0]]`, correct `[[0,0],[0,1]]`.
2. **Sentinel-value marking.** With the full 32-bit range, any dummy value is a real input. Demo with sentinel `-1`: input `[[0,-1],[-1,5]]` — the walk from the zero at (0,0) "marks" the two legitimate `-1`s indistinguishably; pass 2 turns them into 0 → output `[[0,0],[0,0]]`, correct is `[[0,0],[0,5]]`. (In Python you *could* mark with `None` since lists are heterogeneous, but that's unportable to typed arrays and sidesteps the intended lesson.)
3. **Capturing the boundary booleans too late.** If you compute "does row 0 have a zero" *after* the marking pass, marker zeros in row 0 produce false positives and you wrongly wipe row 0. Capture **first**.
4. **Zeroing row 0 / column 0 before the interior passes.** That destroys the very bits you're about to read. Boundary cleanup is always **last**. (Variant hazard: if you store the column-0 flag *in* `matrix[0][0]` instead of a boolean, then column 0 must be zeroed **before** row 0, or zeroing row 0 corrupts the flag.)
5. **Index/value confusion.** After marking, `matrix[i][0] == 0` does **not** mean "this cell's value was originally 0"; it means "row `i` contained an original zero (possibly at column 0 itself)." Mixing these two readings produces marker bugs.
6. **Swapped `m`/`n` bounds.** Row-zeroing loops run over columns (`j < n`); column-zeroing loops run over rows (`i < m`). Interior marker loops must start at 1 — including row 0 / column 0 in the marking pass pollutes the metadata (harmless for the two-boolean scheme, fatal for the `matrix[0][0]` variant).
7. **Python shallow copies** in the brute force (next section) — the "snapshot" silently aliases rows.
8. **Violating "in place"** by building and returning a new matrix — the harness checks the mutated input.

---

## 9. Language Gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| **Java** | `matrix.clone()` and `Arrays.copyOf(matrix, m)` on `int[][]` copy only **row references** — the brute-force "snapshot" aliases rows. Use `Arrays.copyOf(row, row.length)` per row. Prefer primitive `boolean[]` flags over `HashSet<Integer>` / `ArrayList<Integer>`: avoids autoboxing garbage and the classic `Integer` `==`-vs-`equals` trap. |
| **C++** | Pass the matrix as `vector<vector<int>>&` — passing **by value** deep-copies the whole matrix (correct but silently O(mn) space/time, and would sink the O(1)-space claim). `INT_MIN` is a legal cell value; `-INT_MIN` / `abs(INT_MIN)` are signed-overflow UB if you experiment with sentinels. |
| **Python** | `matrix.copy()`, `list(matrix)`, and row slicing share inner lists — `[row[:] for row in matrix]` for a true snapshot. The mutating function should return `None`; LeetCode reads the mutated argument. |

---

## 10. Test Cases to Propose Out Loud

| Test | Input | Expected output | What it validates |
|---|---|---|---|
| Example 1 | `[[1,1,1],[1,0,1],[1,1,1]]` | `[[1,0,1],[0,0,0],[1,0,1]]` | single interior zero, both booleans false |
| Example 2 | `[[0,1,2,0],[3,4,5,2],[1,3,1,5]]` | `[[0,0,0,0],[0,4,5,0],[0,3,1,0]]` | zeros already in row 0; decisions come purely from boundary booleans |
| T3: 1×1 | `[[0]]` and `[[7]]` | `[[0]]` / `[[7]]` | smallest case; marker scheme degenerates gracefully |
| T4: single row | `[[1,2,0,4]]` | `[[0,0,0,0]]` | `m = 1`: interior empty, row-0 boolean alone decides |
| T5: single column | `[[1],[0],[3]]` | `[[0],[0],[0]]` | `n = 1`: `matrix[i][0]` is both data and flag |
| T6: zero in column 0 | `[[1,2],[0,4]]` | `[[0,2],[0,0]]` | marker cell itself is an original zero (self-marking) |
| T7: overlapping zeros | `[[0,1],[1,0]]` | `[[0,0],[0,0]]` | multiple zeros; flag writes are idempotent |
| T8: no zeros | `[[1,2],[3,4]]` | unchanged | early "no-op" path stays correct |
| T9: sentinel-killer | `[[0,-1],[-1,5]]` | `[[0,0],[0,5]]` | legit `-1`s survive — kills any dummy-value hack |
| T10: cascade trap | `[[0,1],[1,1]]` | `[[0,0],[0,1]]` | distinguishes a correct solution from the naive in-place cascade |

Say out loud before coding: *"I'll cover the official examples, 1×1, a single row/column, zeros already in row 0 / column 0, all-zeros, no-zeros, and extreme 32-bit values."* Proposing T4/T5 and T6 unprompted is what signals you actually understand the marker encoding.

---

## 11. Transferable Patterns & Related Problems

**Pattern 1 — Separate deciding from mutating.** When your writes destroy the evidence your decisions are based on, split into a read/decide pass and a write/mutate pass. This is the skeleton of the O(m+n) solution and of many in-place problems.

**Pattern 2 — The input as free scratch memory.** If a problem needs O(per-entity) bookkeeping but demands O(1) space, hunt for repurposable *positions* inside the input (first row/column, sign bits, index slots):

| Related problem | Same muscle |
|---|---|
| LC 289 — Game of Life | encode the next state in unused bits of each cell (in-place state machine) |
| LC 41 — First Missing Positive | use the array itself as a hash table; sign/position encoding |
| LC 448 — Find All Numbers Disappeared / LC 442 — Find All Duplicates | mark by flipping the sign at index `|v|−1` |
| LC 48 — Rotate Image | in-place matrix surgery (transpose + reverse) |
| LC 54 — Spiral Matrix | matrix traversal mechanics (paired with this in matrix-themed rounds) |
| LC 75 — Sort Colors | two-pass / in-place partitioning discipline |

**Pattern 3 — Account for shared/ambiguous slots explicitly.** `(0,0)` belongs to two flag arrays; the fix — "move that one bit into a variable" — recurs whenever a storage cell serves two meanings (see Game of Life's corner semantics, ring buffers, etc.).

---

## 12. Interview Narration Script (extended talk track)

1. **Clarify (15s).** "To confirm: the zeroing is driven by zeros in the *original* matrix — zeros I create must not cascade — and it must be in place, so I'm optimizing extra space, and I return nothing."
2. **Kill the naive idea (30s).** "Zeroing while scanning corrupts the input: a brand-new zero triggers its own row and column. Tiny counterexample: `[[0,1],[1,1]]` ends up fully zeroed, but the bottom-right 1 should survive."
3. **O(m+n) baseline (60s).** "Each row's fate is one bit: row `i` gets zeroed iff it contained an original zero; same per column. So pass one collects `m + n` booleans, pass two zeroes any flagged cell. O(mn) time, O(m+n) space."
4. **The leap (60s).** "To reach O(1): I need `m + n` bits and no value can be a marker because values span the full 32-bit range — but *positions* are under my control. I'll store column flags in row 0 and row flags in column 0. That's `m + n − 1` cells; the missing bit — does row 0 itself contain a zero — lives in one boolean, captured *before* I mutate. Column 0's status is free, because `matrix[i][0]` is simultaneously row `i`'s flag and a member of column 0."
5. **Order of operations (30s).** "Capture booleans → mark from the interior only → zero flagged interior rows, then interior columns (those writes never touch row 0 or column 0, so markers survive) → zero the boundary **last**, from the saved booleans."
6. **Complexity (10s).** "Four linear passes, O(mn) time, O(1) space. You can't beat O(mn) time — an unread cell could be the one zero that changes Θ(m+n) outputs, so every cell must be examined."
7. **Tests (30s).** "Official examples plus: 1×1, single row/column, zeros sitting in row 0 / column 0, all-zeros, no-zeros, and values like `−1` or `INT_MIN` that kill sentinel hacks."

---

## 13. Say It in 60 Seconds

> "Zeroing in place while scanning is wrong — a fresh zero triggers its own row and column and we over-zero; for `[[0,1],[1,1]]` the surviving 1 gets destroyed. So I separate deciding from mutating. First the O(m+n) version: one pass records which rows and columns contain an original zero, a second pass zeroes any cell whose row or column is flagged — O(mn) time. For O(1) space: those flags are just `m + n` bits, and no value can be a sentinel since values cover the full 32-bit range — but *positions* are mine to control. I store the column flags in row 0 and the row flags in column 0. The corner `(0,0)` is shared, so before touching anything I save two booleans: does row 0 have a zero, does column 0. Then one interior pass: a zero at `(i, j)` writes `matrix[i][0] = 0` and `matrix[0][j] = 0`. Then zero interior rows whose first cell is 0, then interior columns whose top cell is 0 — those passes never touch row 0 or column 0, so the markers survive. Finally zero row 0 and column 0 from the saved booleans, last. Total: O(mn) time, O(1) space. Edge cases I'd verify: 1×1, single row or column, zeros already living in row 0 or column 0, and all-zeros."

That's the whole solution: **freeze the original zero set, realize it's only m + n bits, and hide those bits in the matrix's own first row and first column — one boolean for the corner, boundary cleanup last.**
