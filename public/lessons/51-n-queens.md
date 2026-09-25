# N-Queens — Complete Interview Deep Dive

## 1. Problem, Restated

Place `n` queens on an `n × n` board so that **no two queens share a row, a column, or a diagonal** (both diagonal directions). Return **every** distinct valid board as a list of `n` strings, where `'Q'` marks a queen and `'.'` marks an empty cell. Order of solutions doesn't matter; every solution must appear exactly once.

Key wording to notice:

- **"all distinct solutions"** — this is enumeration, not search-for-one. You may never stop after finding the first valid board.
- **"distinct"** — duplicates are forbidden. (Rotations/reflections of each other *count* as distinct — the two n=4 answers are mirror images and both must be returned.)
- Constraints are tiny (`n ≤ 9`) — a strong hint the expected solution is exponential-in-`n` backtracking, not clever math.

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= n <= 9` | Exponential search is expected and affordable. Worst-case unpruned permutation search is `9! = 362,880` leaves — trivial. The tiny bound is the interviewer telling you "backtracking, not DP/construction." |
| Return type `List[List[str]]` | You must **materialize every board**. Output size itself is `Θ(S(n)·n²)` where `S(n)` = number of solutions (for `n=9`, `S(9) = 352` boards × 81 characters each). Any correct algorithm pays at least this much just to write the answer, because every character of every board must be produced. |
| `n = 2, 3` have **zero** solutions (classical result: solutions exist for all `n ∉ {2,3}`) | Your code must naturally return `[]` for these — a good edge case to mention before coding. |
| Answer "in any order" | You don't need sorted/canonical output, so plain DFS order is fine. |

Known solution counts (standard enumeration results, OEIS A000170 — no closed form is known, which is exactly why the problem caps `n` at 9):

| n | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| S(n) | 1 | 0 | 0 | 2 | 10 | 4 | 40 | 92 | 352 |

---

## 3. Brute Force (and a Worked Trace)

### 3.1 Level 0 — choose any `n` of the `n²` cells

Enumerate all subsets of `n` cells: `C(n², n)` of them (`n^(2n)`-ish growth). Check every pair of queens: `(r1,c1)` and `(r2,c2)` attack iff

```
r1 == r2  or  c1 == c2  or  |r1 - r2| == |c1 - c2|
```

**Worked trace, n = 2.** Cells: `(0,0),(0,1),(1,0),(1,1)`. All `C(4,2) = 6` pairs:

| Pair | Verdict | Reason |
|---|---|---|
| {(0,0),(0,1)} | ✗ | same row |
| {(0,0),(1,0)} | ✗ | same column |
| {(0,0),(1,1)} | ✗ | `\|0−1\| == \|0−1\| = 1` → same ↘ diagonal |
| {(0,1),(1,0)} | ✗ | `\|0−1\| == \|1−0\| = 1` → same ↙ diagonal |
| {(0,1),(1,1)} | ✗ | same column |
| {(1,0),(1,1)} | ✗ | same row |

→ **0 solutions for n = 2** (and n = 3 similarly yields 0 out of `C(9,3) = 84` placements). For n = 4: `C(16,4) = 1820` subsets to check.

### 3.2 The pruning ladder

Two structural observations shrink the search massively **without losing any solution**:

1. No two queens share a row ⇒ place **exactly one queen per row** ⇒ at most `n^n` assignments (n=4: 256; n=9: 387,420,489).
2. No two share a column either ⇒ the row→column assignment is a **permutation** ⇒ at most `n!` candidates (n=4: 24; n=9: 362,880).

| Search space | Size | n = 4 | n = 9 |
|---|---|---|---|
| All `n`-cell subsets | `C(n², n)` | 1,820 | ≈ 2.5 × 10¹¹ |
| One queen per row | `n^n` | 256 | 387,420,489 |
| One per row **and** column | `n!` | 24 | 362,880 |
| Backtracking (nodes actually visited) | ≤ O(n!) *and* pruned early | **32** | < e·9! ≈ 986,000 bound; far fewer in practice |

The jump from "test full boards" to "build boards incrementally and abandon a row the moment its column choice conflicts" is the whole game: **backtracking = DFS over partial permutations with early pruning**.

---

## 4. The Core Insights

**Insight 1 — Search by row.** Fix the row order (`0, 1, …, n−1`). At depth `r`, choose a column for row `r`. Every solution has exactly one queen per row, so every solution is reachable as exactly one root-to-leaf path (the path *is* the solution's column sequence). This also means **duplicates are impossible** — no dedup set needed.

**Insight 2 — Diagonals have cheap "names."** A queen attacks along two diagonals, but every square on a ↘ diagonal shares the same value of `r − c`, and every square on a ↙ diagonal shares the same value of `r + c`. So three sets fully describe all conflicts:

`r − c` (constant on ↘ diagonals), n = 4:

```
        c=0  c=1  c=2  c=3
r=0      0   -1   -2   -3
r=1      1    0   -1   -2
r=2      2    1    0   -1
r=3      3    2    1    0
```

`r + c` (constant on ↙ diagonals), n = 4:

```
        c=0  c=1  c=2  c=3
r=0      0    1    2    3
r=1      1    2    3    4
r=2      2    3    4    5
r=3      3    4    5    6
```

Note the **index vs. value** distinction: `r − c` ranges over `−(n−1) … n−1` and can be **negative**. A Python `set` of ints handles negatives natively; if you use arrays (Java/C++), you must offset by `n − 1` into an array of size `2n − 1`. `r + c` naturally ranges over `0 … 2n−2`.

**Insight 3 — Backtracking shape.** For each candidate column in the current row: if it conflicts with *any* previous queen (checked in **O(1)** via the three sets), skip; otherwise place, recurse on the next row, then **un-place**. The classic choose → explore → unchoose discipline. Because diagonals span the whole board, the sets must track *all* previous queens — checking only the immediately previous row is a classic wrong shortcut.

---

## 5. Optimal Approach: Row-by-Row Backtracking

### 5.1 Algorithm

```
backtrack(r):
    if r == n:  record the board (build strings from the column list); return
    for c in 0..n-1:
        if c is used, or (r-c) is used, or (r+c) is used: skip
        place queen: add c, r-c, r+c to the sets; append c to queens
        backtrack(r+1)
        un-place: remove all three keys; pop queens
```

### 5.2 Python Implementation (set-based — write this one in an interview)

```python
from typing import List

def solveNQueens(n: int) -> List[List[str]]:
    res: List[List[str]] = []
    queens: List[int] = []      # queens[r] = COLUMN (value) chosen for row INDEX r
    cols = set()                # occupied columns
    main_diag = set()           # occupied keys r - c   (↘ diagonals; may be negative)
    anti_diag = set()           # occupied keys r + c   (↙ diagonals; range 0..2n-2)

    def backtrack(r: int) -> None:
        if r == n:              # one queen in every row: record a fresh board
            res.append(["." * c + "Q" + "." * (n - 1 - c) for c in queens])
            return
        for c in range(n):
            if c in cols or (r - c) in main_diag or (r + c) in anti_diag:
                continue        # O(1) conflict check against ALL prior queens
            cols.add(c); main_diag.add(r - c); anti_diag.add(r + c)
            queens.append(c)

            backtrack(r + 1)

            cols.remove(c); main_diag.remove(r - c); anti_diag.remove(r + c)
            queens.pop()        # undo — every add has a matching remove

    backtrack(0)
    return res
```

Correctness sketch: at the leaf, `queens` has length `n` with distinct columns (no column repeats, else a branch would have been pruned) and distinct `r−c` / `r+c` keys (ditto) ⇒ a valid board; conversely, every valid board's column sequence is tried row-by-row without ever being pruned ⇒ all solutions found, each exactly once.

### 5.3 Full Trace on Example 1 (n = 4)

Search tree (✗ = candidate rejected, with the exact set key that collided):

```
row 0
├─ (0,0) placed
│   ├─ (1,1) ✗  r−c = 0 already used by (0,0)
│   ├─ (1,2) placed
│   │   ├─ (2,1) ✗  r+c = 3 already used by (1,2)
│   │   └─ (2,3) ✗  r−c = −1 already used by (1,2)   → dead end, undo (1,2)
│   └─ (1,3) placed
│       ├─ (2,1) placed
│       │   └─ (3,2) ✗  r−c = 1 already used by (2,1) → dead end, undo (2,1)
│       └─ (2,2) ✗  r+c = 4 already used by (1,3)     → subtree of (0,0) empty
├─ (0,1) placed
│   ├─ (1,0) ✗  r+c = 1 already used by (0,1)   ← note: adjacent ↙ diagonal!
│   ├─ (1,2) ✗  r−c = −1 already used by (0,1)
│   └─ (1,3) placed
│       ├─ (2,0) placed
│       │   └─ (3,2) placed → ✓ SOLUTION, columns [1,3,0,2]
│       └─ (2,2) ✗  r+c = 4 already used by (1,3)
├─ (0,2) placed
│   ├─ (1,0) placed
│   │   ├─ (2,1) ✗  r−c = 1 already used by (1,0)
│   │   └─ (2,3) placed
│   │       └─ (3,1) placed → ✓ SOLUTION, columns [2,0,3,1]
│   ├─ (1,1) ✗  r+c = 2 already used by (0,2)
│   └─ (1,3) ✗  r−c = −2 already used by (0,2)
└─ (0,3) placed  (mirror of the (0,0) subtree → exhausts with 0 solutions)
```

The two solutions, rendered:

```
[1,3,0,2]        [2,0,3,1]
. Q . .          . . Q .
. . . Q          Q . . .
Q . . .          . . . Q
. . Q .          . Q . .
```

My DFS finds `[1,3,0,2]` first; the sample output lists `[2,0,3,1]` first — both are accepted because "any order" is allowed. In total this search **tests 32 candidate placements** (16 placed along live paths, 16 rejected), versus 1820 subsets or even 24 full permutations for brute force.

### 5.4 Trace on Example 2 (n = 1)

`backtrack(0)`: `c = 0` — all three sets empty, no conflict. Place. `backtrack(1)`: `r == n == 1` → record `["Q"]`. Output: `[["Q"]]`. ✔

### 5.5 Optional Upgrade: Bitmask State

For `n ≤ 9` (or the counting variant with larger `n`), replace the sets with three bitmasks over columns. The trick: a queen at column `c` in row `r` attacks column `c+1` in row `r+1` (↘) and column `c−1` (↙) — so **shift the diagonal masks between rows**.

```python
def solveNQueens(n: int) -> List[List[str]]:
    full = (1 << n) - 1
    res: List[List[str]] = []
    queens: List[int] = []

    def backtrack(r: int, cols: int, diag: int, anti: int) -> None:
        if r == n:
            res.append(["." * q + "Q" + "." * (n - 1 - q) for q in queens])
            return
        free = full & ~(cols | diag | anti)   # columns still safe in this row
        while free:
            bit = free & -free                # isolate lowest available column
            free &= free - 1                  # clear it
            queens.append(bit.bit_length() - 1)
            backtrack(r + 1,
                      cols | bit,             # column used permanently
                      (diag | bit) << 1 & full,  # ↘ shifts left next row
                      (anti | bit) >> 1)         # ↙ shifts right next row
            queens.pop()

    backtrack(0, 0, 0, 0)
    return res
```

- `bit.bit_length() - 1` converts the lowest set bit back to a column index (C++: `__builtin_ctz(bit)`; Java: `Integer.numberOfTrailingZeros(bit)`).
- Python ints are arbitrary-precision so masking isn't strictly required for correctness, but mask anyway — it keeps the integers small and matches what fixed-width languages need.

### 5.6 What to Say While Coding (full talk track)

1. "Brute force over all cell subsets is `C(n², n)` — wasteful. But every solution has exactly one queen per row and per column, so I'll DFS row by row over column choices: at most `n!` leaves, and I abandon a branch the instant a choice conflicts."
2. "For O(1) conflict checks I keep three sets: used columns, used `r − c` (each ↘ diagonal), used `r + c` (each ↙ diagonal). Every square on the same diagonal shares one of those keys."
3. "At each row I try every column, skip conflicts, place, recurse, and un-place — symmetric add/remove so state is clean when I return."
4. "When `r == n` I build the `n` strings from my column list — `'.' * c + 'Q' + '.' * (n − 1 − c)` — and append a fresh list, never a reference to mutable state."
5. "Time is bounded by the number of partial permutations, `O(n!)`, with `O(1)` work per node, plus `Θ(S(n)·n²)` to write the output — and that output term is unavoidable since every character of every board must be produced. Extra space is `O(n)`. Edge cases: `n = 1` gives `[["Q"]]`; `n = 2, 3` give `[]`."

### 5.7 Java / C++ Implementation Gotchas

| Language | Gotcha |
|---|---|
| Java | Don't use `HashSet<Integer>` for the three "used" trackers — autoboxing on every add/lookup is slow and easy to fumble; use `boolean[] cols = new boolean[n]`, `boolean[] d1 = new boolean[2*n-1]` indexed by `r - c + n - 1`, and `d2` indexed by `r + c`. |
| Java | `Arrays.asList(...)`/`List.of(...)` produce fixed-size lists — fine to *return* on LeetCode, but any code that later adds/removes rows throws `UnsupportedOperationException`. |
| C++ | Never index a vector with raw `r - c` — negative indices are undefined behavior; always offset (`r - c + n - 1`, array size `2n - 1`). |
| C++ | `vector<bool>` is a bit-packed proxy container (its "references" are proxies, not real `bool&`) — fine for these flags, but pass your state (`vector<int>& queens`, masks by value) explicitly and `pop_back()` on undo. Mask shifted diagonals with `(mask << 1) & full` — shifting a 1 into the sign bit is UB pre-C++20. |

---

## 6. Complexity Analysis

| Quantity | Set version | Bitmask version | Why |
|---|---|---|---|
| Conflict check per candidate | O(1) expected (hashing) | O(1) worst | three set/bit lookups |
| Nodes explored | ≤ Σₖ n!/(n−k)! < e·n! = **O(n!)** | same | every root-to-node path assigns distinct columns to distinct rows, i.e., a partial permutation of `n` columns; partial permutations number Σₖ n!/(n−k)! < e·n! |
| Total time | **O(n!) + Θ(S(n)·n²)** | same, smaller constants | per-node O(1); building all boards costs one `n×n` character grid per solution |
| Output size | Θ(S(n)·n²) | Θ(S(n)·n²) | `S(n)` boards × `n` strings × `n` chars — an unavoidable floor for *any* correct algorithm, since every character of every returned board must be written |
| Auxiliary space | **O(n)** | O(n) | recursion depth `n`, plus 3 sets / 3 ints (output excluded) |

For `n = 9`: node bound < 1M, output 352 × 81 ≈ 28.5K characters — comfortably fast. (If a follow-up asks about *counting* solutions for large `n`: there is no known closed form for `S(n)` — exact values come from exhaustive enumeration — so the problem caps `n` at 9; heuristic methods like min-conflicts local search can *find* a single solution for huge `n` quickly, but they do not enumerate all solutions.)

---

## 7. Common Mistakes

| # | Mistake | Consequence / Fix |
|---|---|---|
| 1 | Tracking only one diagonal family (e.g., only `r + c`) | Misses all ↘ attacks → wrong boards. Track **both** `r − c` and `r + c`. |
| 2 | Board string padding off-by-one: `"." * c + "Q" + "." * (n - c)` | Rows have length `n + 1`. Correct: `"." * (n - 1 - c)`. |
| 3 | Forgetting to remove **all three** keys on undo (or removing them in the wrong scope) | Phantom conflicts → missing solutions. Every `add` needs its matching `remove` around the recursive call. |
| 4 | Appending a mutable board (`res.append(grid)` with a shared char grid) | Later backtracking mutates already-recorded "solutions." Build **fresh strings** at the leaf (as above), or deep-copy. |
| 5 | Array-indexing with raw `r - c` (Java/C++) | Negative index → crash or UB. Offset by `n − 1`; array size `2n − 1` (not `2n`). |
| 6 | Stopping the search after the first solution | The problem wants **all** solutions — record and keep going; never early-return. |
| 7 | Adding a dedup set of boards "just in case" | Unnecessary: fixed row order ⇒ each solution has exactly one root-to-leaf path. (If asked for solutions *up to rotation/reflection*, that's a different, harder dedup requirement — call it out explicitly.) |
| 8 | Checking diagonals only against the immediately previous row | Diagonals span the whole board; a queen 4 rows up can attack. That's exactly why the global sets work. |
| 9 | Special-casing output for `n = 2, 3` | Unneeded — the algorithm returns `[]` naturally. But *say it aloud* as a test case. |

---

## 8. Test Cases to Propose Out Loud

| Test | Input | Expected | Why I mention it |
|---|---|---|---|
| Official 1 | `n = 4` | the 2 boards `[".Q..","Q...","...Q","..Q."]` and `["..Q.","...Q","Q...","..Q."]` (any order) | Validates format, both mirror solutions, "any order" acceptance |
| Official 2 | `n = 1` | `[["Q"]]` | Smallest board; sanity-checks the leaf/record path |
| Edge: no solution | `n = 2`, `n = 3` | `[]` (empty list, not `None`, not `[[]]`) | Exercises full backtracking with zero records |
| Edge: max | `n = 9` | 352 boards | Performance check; verify **count + validity**, not order |
| Property check (any `n`) | — | every board: `n` rows of length `n`, exactly `n` `'Q'`s, distinct columns, distinct `r−c`, distinct `r+c`, and no duplicate boards in the output | Shows you think about *validating* enumeration output |

A validator you can offer to write:

```python
def valid_boards(out, n):
    return (
        len({tuple(b) for b in out}) == len(out)              # no duplicates
        and all(
            len(b) == n and all(len(row) == n for row in b)   # shape
            and (qs := [(r, row.index("Q")) for r, row in enumerate(b)])
            and len(qs) == n
            and len({c for _, c in qs}) == n                  # columns
            and len({r - c for r, c in qs}) == n              # ↘ diagonals
            and len({r + c for r, c in qs}) == n              # ↙ diagonals
            for b in out
        )
    )
```

---

## 9. Transferable Patterns and Related Problems

**Patterns to name in the interview:**

1. **Backtracking template** — choose → check constraints → explore → unchoose. The un-place step must exactly mirror the place step.
2. **Encoding geometric lines as set keys via invariants** — `r − c` and `r + c` for diagonals here; `r // 3 * 3 + c // 3` for Sudoku boxes; normalized slope pairs in "Max Points on a Line." Same idea every time: give each "line" a hashable identity so conflict checks are O(1).
3. **Search-space ladder** — cells → rows → permutations → pruned DFS. Recognizing "one per row ⇒ iterate rows, not cells" applies anywhere objects can't share rows.
4. **Bitmask state** when the universe is small (`n ≤ ~64`) — with the shift trick when constraints "move" one row at a time.
5. **Symmetry halving** for counting variants: enumerate first-row columns only in the left half and double the count — except the exact middle column when `n` is odd, whose subtree you count once without doubling (its mirror is itself).

**Related problems:**

| Problem | Relationship |
|---|---|
| LC 52 — N-Queens II | Identical search; return the count. Bitmasks + mirror pruning are the standard fast answer. |
| LC 37 — Sudoku Solver | Same choose/explore/unchoose skeleton; more constraint families (row/col/box sets). |
| LC 36 — Valid Sudoku | The "used-set per line" conflict check in isolation — a good warm-up. |
| LC 46 / 47 — Permutations | N-Queens is permutation DFS **plus** diagonal pruning. |
| LC 526 — Beautiful Arrangement | Permutation backtracking with an index-arithmetic feasibility test. |
| LC 79 — Word Search; LC 131 — Palindrome Partitioning; LC 22 — Generate Parentheses | Same backtracking shape, different state. |
| LC 980 — Unique Paths III | Grid DFS with a visited-set state that must be undone. |

---

## 10. Say It in 60 Seconds

> "N-Queens is classic backtracking. Placing queens over all cell subsets is astronomically wasteful, but every solution has exactly one queen per row and per column — so I DFS row by row over column choices, at most `n!` leaves, and I abandon a branch the moment a choice conflicts. For O(1) conflict checks I keep three sets: used columns, used `r − c` — every ↘ diagonal has a constant `r − c` — and used `r + c` for the ↙ diagonals. Per row I try each column, skip any that already appears in a set, otherwise place, recurse, and un-place — every add gets a matching remove. When I've placed all `n` rows, I format the board as `n` strings. Time is bounded by the partial permutations, `O(n!)`, plus writing the output, which itself is `Θ(S·n²)` and unavoidable since every character must be produced; extra space is `O(n)`. Edge cases: `n = 1` returns one board, `n = 2` and `n = 3` return empty, and there are no duplicates because each solution corresponds to exactly one column sequence — one root-to-leaf path."
