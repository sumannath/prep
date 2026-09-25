# Valid Sudoku — Complete Interview Lesson

**LeetCode 36 | Medium | Hash Set / Matrix Traversal**

---

## 1. Restating the Problem (What the Interviewer Actually Wants)

You're given a fixed-size 9×9 grid where each cell is either a digit character `"1"`–`"9"` or `"."` (empty). You must verify three rules **only over the filled cells**:

1. **Rows:** no digit repeats within any row.
2. **Columns:** no digit repeats within any column.
3. **Boxes:** no digit repeats within any of the nine 3×3 sub-boxes.

Key clarifications worth saying out loud in an interview:

- We are **not** checking solvability. A board can be valid yet impossible to solve — we don't care.
- Empty cells (`"."`) are completely ignored. A board that's entirely `.` is trivially valid.
- Each cell contributes to **exactly one** row, **one** column, and **one** box — this "one cell, three constraints" structure is the heart of the problem.
- The output is a boolean: valid or not. No error location required.

If anything is ambiguous, the question to ask is: *"Should I mutate the board, and do you want early exit on the first violation?"* (Both are fine; assume yes to early exit.)

---

## 2. Decoding the Constraints

| Constraint | What it implies |
|---|---|
| `board.length == 9` and `board[i].length == 9` | Fixed size — no dynamic sizing, no need to handle ragged grids. The input is **always** 9×9, so you can hardcode 9 (or use `len(board)` defensively). |
| Cell values are `"1"`–`"9"` or `"."` | Only 9 possible digits → a **bitmask** or fixed-size boolean array of length 9 is perfect. No need for a general-purpose hash set if you want to optimize. |
| Only filled cells validated | Skip `.` immediately; never index or convert it. |
| Not necessarily solvable | Don't attempt backtracking or search. This is a pure **constraint-checking** problem, not a search problem. |

Also note: values are **characters** (`"5"`, not `5`). This is a classic source of bugs — more on that in the mistakes section.

---

## 3. Brute Force: Three Independent Passes

### Idea
Check each constraint family separately:

- For each of 9 rows, scan it and check for duplicate digits.
- For each of 9 columns, scan it and check for duplicate digits.
- For each of 9 boxes (indexed by `(br, bc)` for `br, bc ∈ {0,1,2}`), scan its 3×3 region and check duplicates.

Each check uses a fresh hash set (or boolean array); if a digit is seen twice, return `False`.

### Code

```python
def isValidSudoku(board):
    def no_dupes(cells):
        seen = set()
        for c in cells:
            if c == ".":
                continue
            if c in seen:
                return False
            seen.add(c)
        return True

    # Rows
    for r in range(9):
        if not no_dupes(board[r]):
            return False

    # Columns
    for c in range(9):
        if not no_dupes(board[r][c] for r in range(9)):
            return False

    # Boxes: box (br, bc) covers rows 3*br..3*br+2, cols 3*bc..3*bc+2
    for br in range(3):
        for bc in range(3):
            cells = (board[3 * br + i][3 * bc + j]
                     for i in range(3) for j in range(3))
            if not no_dupes(cells):
                return False

    return True
```

### Worked Trace (Example 2, the failing board)

```
8 3 . | . 7 . | . . .
6 . . | 1 9 5 | . . .
. 9 8 | . . . | . 6 .
------+-------+------
8 . . | . 6 . | . . 3
...
```

- **Rows pass:** Row 0 = `{8, 3, 7}` — no dupes. Row 1 = `{6, 1, 9, 5}` — fine. Every row individually has no repeated digit.
- **Columns pass:** Column 0 = `8, 6, ., 8, ...` → wait, we'd catch the two 8s here too (rows 0 and 3 both have `8` in column 0). Actually this board violates **both** a column and a box. Column scan: at row 3, col 0, we insert `"8"` a second time → return `False` if column checking runs first.
- **Boxes pass (if columns had passed):** Box (0,0) contains `8, 3, 6, 9, 8` — the digit `8` appears at `(0,0)` and `(2,2)`. On the second `8`, `seen = {"8","3","6","9"}` already contains `"8"` → return `False`. ✅ Matches the expected output.

### Complexity
- Each pass visits 81 cells and does O(1) set work → **O(81) time = O(1)** for a fixed board (in general N²×N², time O(N⁴) for an N×N-sudoku-style board... actually for an n×n grid with √n×√n boxes it's O(n²) since the grid has n² cells — here n = 9, so it's constant).
- Space: O(1) (a set holds at most 9 digits at a time).

This solution is already correct and fast enough. The optimal approach just folds the three passes into one.

---

## 4. The Core Insight

**Each cell `(r, c)` participates in exactly three constraint groups:**

- Row group: `r`
- Column group: `9 + c` (or just `c`, kept in a separate structure)
- Box group: `(r // 3, c // 3)`

So instead of three separate passes, do **one pass** over the grid. For every filled cell, simultaneously record its digit in the seen-sets for its row, its column, and its box. If the digit already exists in **any** of the three, the board is invalid.

Two elegant formulations:

1. **Three arrays of sets:** `rows[9]`, `cols[9]`, `boxes[9]` where the box index is the flattening `box = (r // 3) * 3 + (c // 3)`.
2. **One set of "tagged" tuples:** store `(r, val)`, `(val, c)`, `(r // 3, c // 3, val)` (tagged so they can't collide across categories) in a single set — a well-known one-liner-style trick.

The second is compact but the first is easier to explain and debug in an interview. We'll present the first as the main solution.

---

## 5. Optimal Approach: Single Pass with Three Seen-Structures

### Code (Python)

```python
def isValidSudoku(board):
    rows  = [set() for _ in range(9)]
    cols  = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]

    for r in range(9):
        for c in range(9):
            val = board[r][c]
            if val == ".":
                continue

            b = (r // 3) * 3 + (c // 3)   # box index 0..8

            if val in rows[r] or val in cols[c] or val in boxes[b]:
                return False

            rows[r].add(val)
            cols[c].add(val)
            boxes[b].add(val)

    return True
```

### Bitmask Variant (Constant-Factor Optimization)

Since digits are only 1–9, each set fits in a 9-bit integer. Use bit `d-1` for digit `d`; membership test is a bitwise AND, insertion is an OR.

```python
def isValidSudoku(board):
    rows = [0] * 9
    cols = [0] * 9
    boxes = [0] * 9

    for r in range(9):
        for c in range(9):
            ch = board[r][c]
            if ch == ".":
                continue
            bit = 1 << (ord(ch) - ord("1"))   # digit '1' -> bit 0 ... '9' -> bit 8
            b = (r // 3) * 3 + (c // 3)

            if (rows[r] | cols[c] | boxes[b]) & bit:
                return False

            rows[r] |= bit
            cols[c] |= bit
            boxes[b] |= bit

    return True
```

In Python this is mostly stylistic; in C++/Java it's a genuine micro-optimization (no hashing, no pointer chasing).

### Full Trace on Example 1 (valid board)

Walking the first several filled cells, tracking `(rows[0], cols, boxes)`:

| Cell (r,c) | Val | Box `b=(r//3)*3+(c//3)` | Action |
|---|---|---|---|
| (0,0) | "5" | (0,0)→0 | New in row 0, col 0, box 0 → insert |
| (0,1) | "3" | 0 | New everywhere → insert |
| (0,4) | "7" | (0,1)→1 | New → insert |
| (1,0) | "6" | 0 | New in row 1, col 0 (col 0 has {"5"}), box 0 ({"5","3"}) → insert |
| (1,3) | "1" | (0,1)→1 | New → insert |
| (1,4) | "9" | 1 | New in row 1, col 4 (col 4 has {"7"}), box 1 ({"7"}) → insert |
| ... | | | |

Note the box index arithmetic: cell (0,1) and cell (1,0) both land in box 0 — `(0//3)*3 + (1//3) = 0` and `(1//3)*3 + (0//3) = 0`. The entire board passes every check → **`True`**. ✅

### Trace on Example 2 (invalid board)

Same board but `(0,0) = "8"`.

| Cell (r,c) | Val | Box | Check |
|---|---|---|---|
| (0,0) | "8" | 0 | New → insert. `rows[0]={"8"}, cols[0]={"8"}, boxes[0]={"8"}` |
| (0,1) | "3" | 0 | New → insert |
| (0,4) | "7" | 1 | New → insert |
| (1,0) | "6" | 0 | New → insert |
| (2,2) | "8" | 0 | `rows[2]` empty ✓, `cols[2]` empty ✓, **`boxes[0]` contains "8"** ✗ → return `False` |

**`False`** — matches the expected output, and the box violation is caught exactly as the problem's explanation describes.

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (3 passes) | O(81) = O(1); O(n²) for a generalized n×n grid | O(1); O(n) per scan set | Correct, simple, three similar loops |
| One-pass sets (main) | O(81) = O(1); O(n²) generalized | O(1) — 27 sets × ≤9 entries; O(n) generalized (O(3n) sets of ≤n) | Best interview default: clean, single pass, early exit |
| One-pass bitmasks | O(81) = O(1) | O(1) — 27 ints | Fastest constants; slightly more error-prone bit math |

*(Technically everything is O(1) because the board is fixed at 9×9; the O(n²) expressions describe how the method scales to an n×n Sudoku with √n×√n boxes. Any correct algorithm must at minimum read every filled cell, so O(n²) is optimal in that generalized setting — the input itself has n² cells.)*

---

## 7. Common Mistakes

1. **Comparing values instead of characters.** `board[r][c]` is `"5"` (a string), not `5`. If you mix `int` and `str` in a set, `"5"` and `5` are different keys and duplicates slip through. Convert once (`d = int(val)`) or be consistently string-based.

2. **Wrong box index formula.** The classic error is `b = (r // 3) + (c // 3)` — that collides boxes (e.g., (0,3) and (3,0) both give 1). The correct formula is `b = (r // 3) * 3 + (c // 3)`. Test it mentally: (4, 7) → `(1)*3 + 2 = 5`, the middle-right box. ✓

3. **Validating empties.** Forgetting the `if val == ".": continue` guard and then trying to hash `"."` — you'll get "duplicate dots" false negatives (in the tuple-set variant) or errors if you call `int(".")`.

4. **Sharing one set across rows/columns/boxes** without tags — digits would collide across different constraint types and produce wrong `False`s. Either keep 27 separate structures or tag entries: `(r, val)`, `(9 + c, val)`, `(18 + b, val)`.

5. **Off-by-one when mapping digit → bit.** `1 << (val - 1)` for digits 1–9 uses bits 0–8. Using `1 << val` needs a 10-bit-wide int and wastes bit 0; worse, `ord(ch) - ord("0")` vs `ord(ch) - ord("1")` confusion shifts everything by one and can make `"1"` and `"9"` collide with bits outside your mask.

### Language-Specific Gotchas

| Language | Gotcha |
|---|---|
| **Java** | If you use a `HashSet<Character>` and later switch to `HashSet<Integer>`, autoboxing makes every `add`/`contains` allocate and compare objects — fine for 81 cells, but know that `contains(new Integer(5))` works via `equals`, not `==`. Prefer `boolean[9][9]` arrays or bitmasks (`int` is 32-bit, plenty for 9 flags) to avoid boxing entirely. Also, `board[r][c]` is a `char`, so compare with `'.'` (single quotes), not `"."`. |
| **C++** | `std::unordered_set<int>` carries hashing overhead per lookup; for 27 fixed groups, `std::bitset<9>` or `uint16_t` masks with `&` / `|=` are cleaner and faster. Watch char-to-int conversion: `board[r][c] - '1'` yields the 0-based digit, but only after confirming the char isn't `'.'`. |
| **Python** | `[set()] * 9` creates **nine references to the same set** — a legendary bug. Must use `[set() for _ in range(9)]`. Also, `ch in "123456789"` vs set membership: string `in` is a scan, fine at n=9 but conceptually different from hash lookup. |

---

## 8. Test Cases to Propose Out Loud

State these before or right after coding — it signals senior-level rigor.

| # | Case | Expected | Why |
|---|---|---|---|
| 1 | Official Example 1 | `True` | Valid partial board, exercises many boxes |
| 2 | Official Example 2 | `False` | Duplicate 8 in top-left box |
| 3 | All `"."` (empty board) | `True` | Zero filled cells → vacuously valid; guards the skip logic |
| 4 | Duplicate in a row only, e.g., row 0 = `["5","5",".",...]` with rest empty | `False` | Isolates row-checking from box logic (two 5s in row 0 are in *different* boxes? No — adjacent columns, same box, so use e.g. `(0,0)` and `(0,8)`: same row, different boxes, different column check paths) |
| 5 | Duplicate in a column only: `"5"` at (0,0) and (8,0), rest empty | `False` | Same row? No. Same box? No. Only the column constraint catches it — this validates your column bookkeeping |
| 6 | Duplicate in a box only: `"5"` at (0,0) and (1,1), rest empty | `False` | Different row, different column — only the box constraint catches it |
| 7 | Same digit in the same box *index* but different boxes — e.g., `"5"` at (0,0) and (0,4) | `True` | Boxes 0 and 1 differ; checks you don't conflate box indices |

Cases 5 and 6 are the most valuable: each isolates exactly one of the three constraint families, so a failure tells you precisely which bookkeeping is broken.

---

## 9. Transferable Patterns & Related Problems

**Patterns this problem teaches:**

- **"One item, multiple group memberships"** — when each element must satisfy several independent constraints, maintain a seen-structure per constraint and update all of them in a single pass. This generalizes to N-Queens (row/column/diagonal attack sets), verifying magic squares, and constraint propagation in solvers.
- **Flattening 2D group indices** — `group = (r // k) * (n // k) + (c // k)` converts a 2D tiling into a 1D index. Reusable anywhere boxes/tiles appear (image processing, block matrices).
- **Bitmask-as-set** — when the value domain is small and fixed (digits 1–9, lowercase letters, ≤64 flags), an integer mask replaces a hash set with O(1) array-style speed. Shows up constantly in subset DP and state compression.
- **Early exit validation** — validate-while-scanning rather than build-then-check; same mindset as streaming validation of JSON/XML.

**Related problems:**

| Problem | Connection |
|---|---|
| **LeetCode 37 — Sudoku Solver** | The natural follow-up: instead of validating, use the same row/col/box seen-structures as the state for backtracking. Mentioning this in an interview shows you see where the problem leads. |
| **LeetCode 52/51 — N-Queens I & II** | Same "one pass, multiple constraint sets" idea, with diagonals as extra groups (`r - c` and `r + c`). |
| **LeetCode 2133 — Check if Every Row and Column Contains All Numbers** | Stronger validity: not just "no repeats" but "contains 1..n exactly once" — a nice variation to discuss (check set *sizes*, not just membership). |
| **LeetCode 841-style group visits** (or magic-square checks, LC 840) | Fixed-geometry grid validation with tile indexing. |

---

## 10. Say It in 60 Seconds

> "This is a constraint-validation problem, not a search problem — I just need to confirm no digit repeats in any row, column, or 3×3 box, ignoring empty cells.
>
> The key observation: every filled cell belongs to exactly one row, one column, and one box. So instead of three separate passes, I'll do a single pass over the grid, keeping a seen-set for each of the 9 rows, 9 columns, and 9 boxes. For each digit, I compute its box index as row-divided-by-3 times 3 plus column-divided-by-3, check membership in all three relevant sets, and return False immediately if the digit is already present in any of them. Otherwise I insert it into all three and move on. If I finish the scan clean, the board is valid.
>
> Since values are characters, I'll make sure I'm consistent with strings — or convert to ints once. The box index formula is the main trap: it's r//3 times 3 plus c//3, not a plain sum.
>
> The board is fixed at 9×9, so everything is constant time and space — 81 cells, at most 27 small sets. If I want to squeeze constants, I can replace each set with a 9-bit integer mask: one bit per digit, AND to test, OR to insert.
>
> For tests: the two official examples, an all-empty board, and then one duplicate planted in only a row, only a column, and only a box — so a failure points straight at whichever constraint's bookkeeping is broken."
