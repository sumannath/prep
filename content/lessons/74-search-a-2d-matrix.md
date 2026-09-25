# Search a 2D Matrix (LeetCode 74) — Complete Lesson

## 1. Problem in My Own Words

You're handed an `m x n` grid of integers with a very specific structure:

- **Within** each row, values are non-decreasing (duplicates allowed).
- **Across** rows, there's a hard wall: the first value of row `i` is *strictly greater* than the last value of row `i-1`.

Given `target`, return `true` if it exists anywhere in the grid, `false` otherwise — **no position required, just existence**. The stated requirement of `O(log(m * n))` is the real signal: this is a technique question, not a performance question. The interviewer wants to see whether you notice that this matrix is a sorted array wearing a trench coat.

**Precision notes before touching code:**
- The matrix is rectangular (every row has length `n`) — the constraints guarantee `1 <= m, n`, so it's never empty and never jagged. The whole approach depends on rectangularity.
- Duplicates can occur **within** a row (`non-decreasing`), but **never across** rows (the strict `>` at row boundaries makes row value-ranges disjoint). Since we only return a boolean, duplicates don't complicate anything — but if the interviewer later asks for the *first* occurrence, you'd switch to a leftmost-binary-search variant.
- `lo`, `hi`, `mid` will be **virtual 1D indices**; `r`, `c` will be **matrix coordinates**; the comparison is always between the **value** `matrix[r][c]` and `target`. Keeping these three layers mentally separate is 80% of avoiding bugs here.

---

## 2. Decoding the Constraints

| Constraint | What it actually tells you |
|---|---|
| `1 <= m, n <= 100` | `m * n <= 10,000`. Brute force is *fast enough* — so the `O(log(m*n))` requirement is purely about demonstrating the right idea. Also: matrix is guaranteed non-empty (an empty guard is defensive, not required). |
| `-10^4 <= values <= 10^4` | Everything fits in a 32-bit int; no value overflow anywhere. Even index arithmetic (`lo + hi <= ~20,000`) can't overflow — safe mid computation is a habit, not a necessity, here. |
| "First of each row **>** last of previous row" (strict) | Row value-ranges are **disjoint and ascending**. This is the load-bearing property: it makes the row-major flattening globally sorted. |
| "Each row non-decreasing" | Only guarantees sortedness *within* a row — by itself it does **not** make the flattening sorted (see §4). |
| Output is a boolean | Any occurrence qualifies; no tie-breaking, no leftmost index. |

**Scale check:** `log2(10,000) ≈ 13.3`, so the optimal solution probes at most ~14 cells even on the largest input. That's the number to say out loud — it shows you know what the complexity *buys* you.

---

## 3. Baseline: Brute Force (with a Worked Trace)

### 3.1 Full scan — `O(m*n)` time, `O(1)` space

```python
def searchMatrix_bruteforce(matrix: list[list[int]], target: int) -> bool:
    for row in matrix:
        for val in row:
            if val == target:
                return True
    return False
```

**Worked trace on Example 2** (`target = 13`, 12 cells):

| Probe | Cell (r, c) | Value | Equals 13? |
|---|---|---|---|
| 1 | (0,0) | 1 | no |
| 2 | (0,1) | 3 | no |
| 3 | (0,2) | 5 | no |
| 4 | (0,3) | 7 | no |
| 5 | (1,0) | 10 | no |
| 6 | (1,1) | 11 | no |
| 7 | (1,2) | 16 | no |
| 8 | (1,3) | 20 | no |
| 9 | (2,0) | 23 | no |
| 10 | (2,1) | 30 | no |
| 11 | (2,2) | 34 | no |
| 12 | (2,3) | 60 | no → **return False** |

Every cell touched: correct, but `O(m*n)` — fails the required bound.

### 3.2 Smarter scan: the "row window" — `O(m + log n)`

Each row defines an interval `[row[0], row[-1]]`, and these intervals are disjoint and increasing. So `target` can live in **at most one row**. Check each row's window; when you find the candidate, binary-search inside it.

```python
def searchMatrix_row_window(matrix: list[list[int]], target: int) -> bool:
    for row in matrix:
        if row[0] <= target <= row[-1]:   # only this row can contain target
            lo, hi = 0, len(row) - 1
            while lo <= hi:
                mid = (lo + hi) // 2
                if row[mid] == target:
                    return True
                if row[mid] < target:
                    lo = mid + 1
                else:
                    hi = mid - 1
            return False   # in-range but absent; disjoint ranges ⇒ no later row can hold it
    return False
```

**Trace on Example 1** (`target = 3`):

| Step | Action | Result |
|---|---|---|
| 1 | Row 0 window is `[1, 7]`. Is `1 <= 3 <= 7`? | Yes → row 0 is the candidate |
| 2 | Binary-search `[1, 3, 5, 7]`: `mid=1` → value 3 | `3 == 3` → **True** (cell (0,1)) |

On Example 2 (`target = 13`): row 0 window `[1,7]` → 13 > 7, skip; row 1 window `[10,20]` → candidate; scan sees 10, 11, 16 → 16 > 13 → **False**.

The bottleneck is the linear hunt for the row: `O(m)`. The fix is to binary-search *that* hunt too — which the core insight makes trivial.

---

## 4. The Core Insight: The Matrix *Is* a Sorted Array

Take the two properties together and read the matrix row by row:

```
matrix                row-major "virtual" array
[  1  3  5  7 ]       idx:  0  1  2  3  4  5  6  7  8  9 10 11
[ 10 11 16 20 ]  →    val:  1  3  5  7 10 11 16 20 23 30 34 60
[ 23 30 34 60 ]             └──────────── sorted ────────────┘
```

**Why the flattening is sorted (two-line proof):**
- *Within* a row: rows are non-decreasing, so consecutive flat indices in the same row are ordered.
- *Across* a row boundary: `matrix[r][0] > matrix[r-1][n-1]` (strict), so the jump from the end of row `r-1` to the start of row `r` is an increase.

Hence the virtual array `B[i] = matrix[i // n][i % n]` is non-decreasing over `i ∈ [0, m*n - 1]` — exactly what binary search requires.

**The index translation** (with `n` = number of **columns**):

```
row r = i // n        col c = i % n
e.g. i = 9, n = 4  →  r = 2, c = 1  →  matrix[2][1] = 30
```

**The key discipline:** never materialize the flattened array. Building it costs `O(m*n)` time and space and silently destroys the whole point. We translate indices on the fly — each probe costs two integer operations.

---

## 5. Optimal Solution: One Binary Search over Virtual Indices

```python
def searchMatrix(matrix: list[list[int]], target: int) -> bool:
    if not matrix or not matrix[0]:        # defensive; constraints guarantee m, n >= 1
        return False
    m, n = len(matrix), len(matrix[0])
    lo, hi = 0, m * n - 1                  # CLOSED interval over virtual 1D indices
    while lo <= hi:
        mid = (lo + hi) // 2
        r, c = divmod(mid, n)              # r = mid // n, c = mid % n  (n = columns!)
        val = matrix[r][c]
        if val == target:
            return True
        if val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
```

**Loop invariant (say it out loud in the interview):** *if `target` exists, its virtual index always lies in `[lo, hi]`.* Each iteration compares one value and discards half the window (including `mid` itself), so after `⌊log2(m*n)⌋ + 1` iterations the window is empty and the target provably isn't there.

### 5.1 Trace — Example 1 (`target = 3`, `n = 4`, virtual indices `0..11`)

| Iter | lo | hi | mid | (r, c) = (mid//4, mid%4) | matrix[r][c] | Compare | Action |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 11 | 5 | (1, 1) | 11 | 11 > 3 | `hi = 4` |
| 2 | 0 | 4  | 2 | (0, 2) | 5  | 5 > 3   | `hi = 1` |
| 3 | 0 | 1  | 0 | (0, 0) | 1  | 1 < 3   | `lo = 1` |
| 4 | 1 | 1  | 1 | (0, 1) | 3  | 3 == 3  | **return True** |

4 iterations — matches `⌊log2(12)⌋ + 1 = 4`.

### 5.2 Trace — Example 2 (`target = 13`)

| Iter | lo | hi | mid | (r, c) | matrix[r][c] | Compare | Action |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 11 | 5 | (1, 1) | 11 | 11 < 13 | `lo = 6` |
| 2 | 6 | 11 | 8 | (2, 0) | 23 | 23 > 13 | `hi = 7` |
| 3 | 6 | 7  | 6 | (1, 2) | 16 | 16 > 13 | `hi = 5` |
| — | 6 | 5  | — | — | — | `lo > hi` | **return False** |

Note what happened: the search jumped straight into row 1's range, confirmed 13 falls in the *gap* structure around values 11 and 16, and exited cleanly. No special-casing needed.

### 5.3 Alternative that also meets the bound: two binary searches

Search **rows** first (by first element), then **within** the winning row. This works because first elements are *strictly* increasing (`matrix[r][0] > matrix[r-1][n-1] >= matrix[r-1][0]`), so the rows whose first element is `<= target` form a prefix, and the last such row is the only possible candidate.

```python
def searchMatrix_two_pass(matrix: list[list[int]], target: int) -> bool:
    # Pass 1: rightmost row whose FIRST element is <= target.
    lo, hi, row = 0, len(matrix) - 1, -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if matrix[mid][0] <= target:
            row = mid
            lo = mid + 1
        else:
            hi = mid - 1
    if row == -1:                       # target < matrix[0][0]: no row can hold it
        return False

    # Pass 2: ordinary binary search inside that row.
    lo, hi = 0, len(matrix[row]) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if matrix[row][mid] == target:
            return True
        if matrix[row][mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
```

Cost: `O(log m + log n)` — which equals `O(log(m*n))` because `log(m*n) = log m + log n` (product rule for logarithms). It touches only `O(log m + log n)` cells, which is a nice property to volunteer if asked "what if rows live on disk?" (A Pythonic shortcut — `bisect_right([row[0] for row in matrix], target) - 1` — is fine at `m <= 100` but note the list build is `O(m)`; the hand-rolled loop above keeps it strictly logarithmic.)

I'd still present the **single-pass virtual-array version first**: fewer moving parts, one loop, one place to get wrong.

---

## 6. Complexity Table

| # | Approach | Time | Space | Meets `O(log(m*n))`? |
|---|---|---|---|---|
| 1 | Scan every cell | `O(m*n)` | `O(1)` | ❌ |
| 2 | Row window + linear scan inside | `O(m + n)` | `O(1)` | ❌ |
| 3 | Row window + binary search inside | `O(m + log n)` | `O(1)` | ❌ (the `m` term) |
| 4 | Staircase from top-right corner | `O(m + n)` | `O(1)` | ❌ (star of LC 240, not this problem) |
| 5 | Two binary searches (rows → within row) | `O(log m + log n) = O(log(m*n))` | `O(1)` | ✅ |
| 6 | **One binary search over the virtual flat array** | **`O(log(m*n))`** | **`O(1)`** | ✅ (canonical answer) |

For approach 6: at most `⌊log2(m*n)⌋ + 1` iterations (the window halves each time), each iteration doing `O(1)` work — two arithmetic ops, one 2D access, one comparison. Auxiliary space is a handful of scalars.

---

## 7. Common Mistakes

| Mistake | Why it breaks | Fix |
|---|---|---|
| Mapping with `mid // m` | The divisor must be the **column count** `n`; using row count scrambles coordinates on any non-square matrix | `r, c = divmod(mid, n)` with `n = len(matrix[0])` |
| `hi = m * n` with `while lo <= hi` | When `lo` reaches `m*n`, `mid // n == m` → row index out of bounds (crash or garbage) | Closed interval: `hi = m * n - 1` |
| Mixing conventions (`hi = m*n - 1` but `while lo < hi`) | The final element never gets compared → false negatives exactly at the last cell (e.g., `target = 60`) | Pick one template: closed `[lo, hi]` + `while lo <= hi` + `lo=mid+1 / hi=mid-1`, or half-open `[lo, hi)` + `while lo < hi` — never a hybrid |
| Copying/flattening the matrix first | `O(m*n)` time and space; the interviewer will (rightly) call it out | Translate indices on the fly |
| Muscle memory from square matrices | Hardcodes `mid // 4` or `mid // 3`-style constants that pass square tests and fail rectangles | Always derive `n` from the input |
| Using this solution on an LC 240-style matrix (rows and columns sorted, but **no** cross-row ordering) | The flattening is *not* sorted there (e.g., `[[1,4],[2,5]]` flattens to `[1,4,2,5]`) → binary search returns wrong answers | Check the global-ordering precondition before flattening; otherwise use the staircase |
| Two-pass variant: forgetting the `row == -1` guard | `target < matrix[0][0]` → you search row `-1` (Python "works" silently on index −1 — worst kind of bug!) or crash in other languages | Explicitly return `False` when no row qualifies |

**Indices vs. values, stated once more:** `lo/hi/mid` are virtual indices in `[0, m*n - 1]`; `r = mid // n`, `c = mid % n` are coordinates; only `matrix[r][c]` — the *value* — is ever compared to `target`. Three layers; never blur them.

---

## 8. Language Gotchas Beyond Python (Java / C++)

| Language | Gotcha |
|---|---|
| **Java** | Use `int mid = lo + (hi - lo) / 2;` (or `(lo + hi) >>> 1`) — irrelevant overflow-wise at `m*n <= 10^4`, but it's the reflex you need when binary searching over value ranges up to `Integer.MAX_VALUE`. Also: a Java `int[][]` is an array of row *references* — rows are not guaranteed contiguous, so you can't treat it as one flat buffer; always go through `matrix[mid / n][mid % n]`. |
| **C++** | Same safe-`mid` habit. Pass `const vector<vector<int>>&` — copying by value is `O(m*n)`. Critically, rows of a `vector<vector<int>>` are **separately allocated**: pointer arithmetic "across" rows is undefined behavior, so the index-translation approach is mandatory, not optional. If you compute sizes as `size_t`, `m*n - 1` underflows to a huge unsigned value on an empty matrix — guard first. |
| **Python** | Use `//` (floor division) — `/` produces a `float`, and float indices crash on subscripting. Python's negative indexing means a missing `row == -1` guard in the two-pass version fails *silently* (searching `matrix[-1]` = last row) instead of raising. No integer overflow concerns — Python ints are arbitrary precision. |

---

## 9. Test Cases to Propose Out Loud

Before (or right after) coding, volunteer these — it signals systematic thinking:

| # | Input | target | Expected | What it exercises |
|---|---|---|---|---|
| 1 | `[[1,3,5,7],[10,11,16,20],[23,30,34,60]]` | 3 | `true` | Official Ex. 1; hit in the middle of the virtual array |
| 2 | same | 13 | `false` | Official Ex. 2; target absent though *in range* of row 1's window — the interesting "gap" case |
| 3 | `[[5]]` | 5 | `true` | Single cell; `lo == hi == 0`, one iteration |
| 4 | `[[5]]` | 4 | `false` | Single cell miss; `hi` becomes `-1` immediately |
| 5 | same as #1 | 1 | `true` | Target = **first** element of the flat array |
| 6 | same as #1 | 60 | `true` | Target = **last** element — this is the test that catches off-by-one `hi` bugs |
| 7 | same as #1 | 0 | `false` | Target **below** everything; `hi` collapses, no out-of-bounds access |
| 8 | same as #1 | 61 | `false` | Target **above** everything; `lo` runs past `hi` |
| 9 | `[[2,2,2],[5,6,7]]` | 2 | `true` | **Duplicates within a row** (legal here); existence unaffected |
| 10 | `[[2,2,2],[5,6,7]]` | 3 | `false` | Value strictly between last-of-row-0 and first-of-row-1 — the disjoint-ranges boundary |
| 11 | `[[1,3,5,7]]` | 5 | `true` | Single row (`m = 1`); mapping degenerates correctly |
| 12 | `[[1],[3],[5]]` | 4 | `false` | Single column (`n = 1`); `mid // 1 = mid`, `mid % 1 = 0` — good sanity check that the math holds |

If you're short on time, the minimum set to state aloud: **the two official examples, a single-cell matrix, both corner targets (first and last element), and a just-out-of-range target.** Cases 5, 6, and 8 are precisely the ones that catch `hi`-boundary bugs.

---

## 10. Follow-Up Questions an Interviewer Might Ask

- **"Return the (row, col) instead of a boolean."** Same search; at the equality branch, return `(mid // n, mid % n)`.
- **"What if the cross-row rule were '≥' instead of '>'?"** The flattening stays non-decreasing, so the *existence* search is unchanged. Only claims like "the target can be in at most one row" would break, since duplicates could then span row boundaries.
- **"This looks like Search a 2D Matrix II."** It isn't — LC 240 only guarantees rows *and columns* sorted, with no cross-row ordering, so the flattening isn't sorted and binary search over virtual indices is invalid. There you walk a staircase from the top-right corner: the current cell is the largest remaining value in its row and the smallest remaining in its column, so `val < target` eliminates the row (move down) and `val > target` eliminates the column (move left), giving `O(m + n)`. Knowing *which* problem you're in is the trap being tested.
- **"Can you beat `O(log(m*n))`?"** Not with comparisons alone: any comparison-based search must distinguish `m*n + 1` possible outcomes (which of `m*n` cells holds the target, or "nowhere"), and a decision tree with that many leaves has height at least `⌈log2(m*n + 1)⌉` — so `Ω(log(m*n))` comparisons is a hard floor in the comparison model. Our `⌊log2(m*n)⌋ + 1` probes sit right against it.
- **"Only one occurrence vs. leftmost occurrence."** With duplicates inside a row and a "return position" variant, replace the equality-return with a leftmost-bisect pattern (`hi = mid - 1` on equality, remember the best `mid`).

---

## 11. Transferable Patterns & Related Problems

**Patterns to bank:**

1. **Virtual flattening / coordinate arithmetic.** Whenever a 2D (or k-dimensional) container is globally sorted in row-major order, binary search it as a 1D array with `r = i // n, c = i % n` — no copying, `O(1)` random access via arithmetic. The precondition to *verify out loud* is that the flattening is actually sorted.
2. **Splitting the log.** `log(m*n) = log m + log n`: search a coarse summary (which row?), then a block (which column?). This "index, then block" decomposition recurs in interval trees, fractional cascading-lite arguments, and external-memory search.
3. **One binary-search template, owned cold.** Closed interval + `while lo <= hi` + `lo = mid + 1 / hi = mid - 1`. Every off-by-one bug in this family comes from mixing templates, not from the template itself.
4. **Know when flattening is illegal.** Weakly-ordered grids (LC 240) demand the staircase; recognizing the difference is the actual interview skill.

**Related problems:**

| Problem | What it drills |
|---|---|
| LC 240 — Search a 2D Matrix II | The flattening trap; staircase search `O(m + n)` |
| LC 378 — Kth Smallest Element in a Sorted Matrix | Binary search on the **value range** with rank counting |
| LC 668 — Kth Smallest Number in Multiplication Table | Same value-space binary search, generated matrix |
| LC 4 — Median of Two Sorted Arrays | Binary search over a partition of two sorted sequences |
| LC 35 — Search Insert Position | The bare 1D template everything here is built on |

---

## 12. Full Interview Talk Track (Script)

**Phase 1 — Clarify (≈30s).** "So each row is sorted, and crucially, every row starts strictly *after* the previous row ends — meaning the row ranges are disjoint, though duplicates within a single row are fine. I only need to return whether the target exists. And the required complexity is log of m-times-n, so I'm looking for a binary search structure."

**Phase 2 — Insight (≈30s).** "Those two properties together mean that if I read the rows back to back, I get one sorted array of length m-times-n. I don't need to build that array — virtual index i maps to `matrix[i // n][i % n]`, where n is the number of columns. So I'll binary search i over the closed interval from 0 to m*n minus 1."

**Phase 3 — Code while narrating.** "Closed interval, `lo <= hi`. Compute mid, translate to row and column with divmod by n — n, the column count, that's the classic bug spot. Compare the value: equal means found; too small means the answer is to the right, `lo = mid + 1`; too big, `hi = mid - 1`. Empty window means absent."

**Phase 4 — Verify.** Run Example 1 briefly: mid 5 → 11, too big; mid 2 → 5, too big; mid 0 → 1, too small; mid 1 → 3, found. Run Example 2: 11 → 23 → 16, window empties, false. "Both check out."

**Phase 5 — Complexity and edges.** "Time log of m-times-n — about fourteen probes at max size; space O(1), since I never materialize anything. Edge cases I've covered mentally: single-cell matrix, target at either corner, target just outside the global range, duplicates within a row. And one caveat: if the cross-row ordering were missing — the Search-a-2D-Matrix-II variant — flattening breaks and I'd use the top-right staircase instead."

---

## 13. Say It in 60 Seconds

"Two properties make this matrix secretly a sorted array: every row is sorted, and every row starts after the previous one ends. So reading the rows back to back gives one sorted array of length m-times-n — and I never actually build it. Virtual index i maps to row i-divided-by-n, column i-mod-n, where n is the column count. Then it's textbook binary search on the closed interval zero to m-times-n minus one: compute mid, translate to a cell, compare. Equal — found. Too small — move lo up. Too big — move hi down. Empty window — false. That's log of m-times-n time, roughly fourteen probes at max size, constant space, one cell touched per iteration. Two gotchas I'm watching: divide by the column count, not the row count, and keep hi at m-times-n minus one so mid never maps out of bounds. And if the cross-row ordering weren't guaranteed — the Search-a-2D-Matrix-Two variant — flattening would be invalid, and I'd switch to the top-right staircase at O(m+n) instead."
