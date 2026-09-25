# Sudoku Solver (LeetCode 37) — Complete Interview Lesson

## 1. Problem restated in your own words

> "I'm given a fixed 9×9 grid of characters. Every cell is either a digit `'1'`–`'9'` (a **clue**) or `'.'` (empty). I must fill every `'.'` so that each **row**, each **column**, and each of the nine **3×3 boxes** contains all nine digits exactly once. I mutate the board **in place** (the function returns nothing). The puzzle is guaranteed to have **exactly one** solution."

Three things the guarantee buys you — say them out loud in the interview:

1. **You may stop at the first complete consistent assignment.** No need to exhaust the search to check uniqueness.
2. **The clues themselves are conflict-free** — you don't need to validate the input (unless asked as a follow-up).
3. It does **not** make backtracking unnecessary; it only removes the "verify uniqueness" tail of the search.

---

## 2. Constraint decoding — what the fine print actually tells you

| Line of the constraints | Algorithmic consequence |
|---|---|
| `board.length == 9`, `board[i].length == 9` | Grid is a **fixed size** → all index arithmetic and all mask arrays are O(1); at most `m = 81` empty cells → recursion depth ≤ 81. |
| `board[i][j]` is a digit or `'.'` | Cells are **characters**, not ints. Convert once at load time (`int(ch)`), convert back once at write time (`str(d)`). Mixing `"1"` and `1` is the #1 silent bug (see §8). |
| "Each digit 1–9 exactly once per row/column/box" | Each unit has **9 cells and 9 digits**, so by pigeonhole *no-duplicates ⟺ exactly-once*. You only ever need a **"is this digit already used here?"** check; completeness is automatic. |
| `'.'` marks empty cells | Collect empty cells into a list up front — never re-scan the board to find work. |
| Exactly one solution | First success terminates the whole recursion via `return True` bubbling up. |
| (LeetCode signature) `-> None` | The judge checks the **same** `board` object. Returning a shiny new grid = Wrong Answer. |

A useful vocabulary shift: this is a **constraint satisfaction problem (CSP)** — cells are *variables*, digits `1..9` are *domains*, and the 27 units (9 rows + 9 columns + 9 boxes) are *all-different constraints*.

---

## 3. Indices vs values — get this straight before writing any code

Three different "number systems" coexist; keeping them separated prevents most bugs:

| Quantity | Range | Representation |
|---|---|---|
| Cell coordinates | `(r, c)`, `r, c ∈ [0, 8]` | 0-based indices into `board` |
| Digit value | `d ∈ {1..9}` | `int(board[r][c])`; stored on board as `str(d)` |
| Bit for digit `d` | `bit = 1 << (d - 1)` | bit 0 ↔ digit 1, … bit 8 ↔ digit 9; `FULL = 0x1FF = 511` |
| Box id of a cell | `b = (r // 3) * 3 + (c // 3)` | 0..8, row-band first |

Sanity-check the box formula on corners before you trust it: `(0,0)→0`, `(0,8)→2`, `(2,7)→2`, `(4,4)→4`, `(6,0)→6`, `(8,8)→8`. If your formula gives `(0,8)→8` (a classic wrong variant like `r*3 + c//3`), you'll reject legal placements with no obvious error message.

Bit ↔ digit recovery: since `bit = 1 << (d-1)`, the digit is `bit.bit_length()` in Python, `Integer.numberOfTrailingZeros(bit) + 1` in Java, `__builtin_ctz(bit) + 1` in C++.

---

## 4. Baseline: brute-force backtracking, with a worked trace

### 4.1 Code

Try digits 1–9 at each empty cell; check legality by rescanning the row, column, and box (27 reads per check).

```python
from typing import List

class Solution:
    def solveSudoku(self, board: List[List[str]]) -> None:
        """Baseline: backtracking; legality re-checked by scanning 27 cells."""

        def valid(r: int, c: int, ch: str) -> bool:
            for i in range(9):
                if board[r][i] == ch or board[i][c] == ch:
                    return False
            br, bc = 3 * (r // 3), 3 * (c // 3)      # top-left corner of the box
            for i in range(br, br + 3):
                for j in range(bc, bc + 3):
                    if board[i][j] == ch:
                        return False
            return True

        def backtrack(pos: int = 0) -> bool:
            if pos == 81:
                return True                          # every cell filled
            r, c = divmod(pos, 9)
            if board[r][c] != '.':
                return backtrack(pos + 1)            # clue or already filled
            for ch in "123456789":
                if valid(r, c, ch):
                    board[r][c] = ch
                    if backtrack(pos + 1):
                        return True                  # success bubbles up; board stays
                    board[r][c] = '.'                # UNDO — the line people forget
            return False                             # no digit fits here → dead end

        backtrack()
```

Note: cells are filled in **scan order** (row-major) and digits are tried in **ascending order** — both of which the trace below exploits.

### 4.2 Worked trace on the official example

The first empty cell in scan order is `(0,2)`.

| Step | Cell | Digits already used in row ∪ column ∪ box | Candidates | Action |
|---|---|---|---|---|
| 1 | (0,2) | {5,3,7} ∪ {8} ∪ {5,3,6,9,8} | **{1,2,4}** | try 1 |
| 2 | (0,3) | {5,3,1,7} ∪ {1,8,4} ∪ {7,1,9,5} | {2,6} | try 2 |
| 3 | (0,5) | {5,3,1,2,7} ∪ {5,3,9} ∪ {1,2,5,7,9} | {4,6,8} | try 4 |
| 4 | (0,6) | {1,2,3,4,5,7} ∪ {2} ∪ {6} | {8,9} | try 8 |
| 5 | (0,7) | {1,2,3,4,5,7,8} ∪ {6,8,7} ∪ {6,8} | {9} | **forced** 9 |
| 6 | (0,8) | row still needs 6, but 6 ∈ col 8 {1,3,5,6,9} and ∈ box {6,8,9} | **∅** | FAIL → unwind |

Then the unwinding cascade, all caused by the root guess `1` at `(0,2)` (the true value is 4):

- `(0,7)` had only 9 → dead. `(0,6)` try 9 → at `(0,7)` **every digit 1–9 is blocked** (row ∪ col ∪ box = all nine) → dead. `(0,6)` exhausted.
- `(0,5)` try 6 → row 0 locally completes (e.g. `5 3 1 2 7 6 4 9 8`) and the search **dives many levels deeper** before the contradiction surfaces.
- `(0,5)` try 8 → `(0,6)` candidates {4,9}: `4` → `(0,7)` forced 9 → `(0,8)` needs 6, blocked (col and box); `9` → `(0,7)` forced 4 → `(0,8)` needs 6, blocked again → `(0,5)` exhausted.
- `(0,3)` try 6 → another deep doomed subtree. `(0,3)` exhausted.
- `(0,2)` try 2 → descends **even deeper** before dying (the mistake is at the root; the contradiction appears far away).
- `(0,2)` try 4 → flows into the unique solution.

### 4.3 What the trace teaches

- A **wrong guess made early is expensive**: the branch isn't refuted where the mistake was made — it's refuted *somewhere else, much later*, after dozens of legal-looking placements.
- **Cell order and digit order are both arbitrary.** Nothing forces us to start at `(0,2)` with 3 candidates when `(4,4)` has exactly 1. That observation is the entire optimization story of §5–§6.
- Every `valid()` call re-reads up to 27 cells, and every frame re-scans for the next empty cell — pure waste, since a placement only changes one row, one column, and one box.

---

## 5. The core insight

Three levers, all standard CSP machinery:

1. **Locality ⟹ O(1) incremental constraints.** Placing digit `d` at `(r,c)` changes exactly one row, one column, one box. So keep a "used digits" set per unit — 9 row sets + 9 column sets + 9 box sets (or one 9-bit mask each). Check, place, and undo are all **O(1)**.
2. **Cell choice is free ⟹ pick the most constrained cell (MRV).** Instead of "first empty in scan order," fill the empty cell with the **f**ewest legal **m**ain **r**emaining **v**alues. An empty cell with **0** candidates proves the branch dead *immediately*; a cell with **1** candidate is a forced move with **no branching at all**. This converts the deep doomed descents in §4.2 into shallow, instant refutations.
3. **Backtracking is complete regardless.** DFS over partial assignments explores every consistent completion, so the first `True` is *a* solution — and by the uniqueness guarantee, *the* solution.

(Why not DP/memoization? The "state" is the entire board and subproblems don't overlap usefully — this is search, not dynamic programming.)

---

## 6. The approach you should actually write

### 6.1 Version 1 — incremental sets, scan order (write this first; it already passes)

```python
from typing import List

class Solution:
    def solveSudoku(self, board: List[List[str]]) -> None:
        rows  = [set() for _ in range(9)]   # digits used in each row
        cols  = [set() for _ in range(9)]   # ... each column
        boxes = [set() for _ in range(9)]   # ... each box: b = (r//3)*3 + c//3
        empties = []

        for r in range(9):
            for c in range(9):
                ch = board[r][c]
                if ch == '.':
                    empties.append((r, c))
                else:
                    d = int(ch)                       # normalize char → int NOW
                    rows[r].add(d); cols[c].add(d)
                    boxes[(r // 3) * 3 + c // 3].add(d)

        def backtrack(i: int) -> bool:
            if i == len(empties):
                return True
            r, c = empties[i]
            b = (r // 3) * 3 + c // 3
            for d in range(1, 10):
                if d in rows[r] or d in cols[c] or d in boxes[b]:
                    continue
                board[r][c] = str(d)
                rows[r].add(d); cols[c].add(d); boxes[b].add(d)
                if backtrack(i + 1):
                    return True
                rows[r].discard(d); cols[c].discard(d); boxes[b].discard(d)
                board[r][c] = '.'                     # symmetric undo
            return False

        backtrack(0)
```

### 6.2 Version 2 — bitmasks + MRV (the closer; same logic, better order, O(1) ops)

```python
from typing import List

class Solution:
    def solveSudoku(self, board: List[List[str]]) -> None:
        FULL = 0x1FF                                  # bits 0..8 ↔ digits 1..9
        rows  = [0] * 9                               # rows[r]  = mask of used digits
        cols  = [0] * 9
        boxes = [0] * 9                               # b = (r // 3) * 3 + (c // 3)
        empties = []

        for r in range(9):
            for c in range(9):
                ch = board[r][c]
                if ch == '.':
                    empties.append((r, c))
                else:
                    bit = 1 << (int(ch) - 1)          # '5' → bit 4
                    b = (r // 3) * 3 + (c // 3)
                    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit

        def backtrack(remaining: int) -> bool:
            if remaining == 0:
                return True

            # ---- MRV: branch on the empty cell with fewest candidates ----
            best_r = best_c = -1
            best_cand, best_cnt = 0, 10
            for r, c in empties:
                if board[r][c] != '.':
                    continue                          # filled by an ancestor frame
                b = (r // 3) * 3 + (c // 3)
                cand = FULL & ~(rows[r] | cols[c] | boxes[b])
                cnt = bin(cand).count('1')            # or cand.bit_count() on 3.10+
                if cnt == 0:
                    return False                      # dead cell → prune, nothing mutated yet
                if cnt < best_cnt:
                    best_r, best_c, best_cand, best_cnt = r, c, cand, cnt
                    if cnt == 1:
                        break                         # forced move; can't beat 1

            b = (best_r // 3) * 3 + (best_c // 3)
            cand = best_cand                          # snapshot: we consume bits below
            while cand:
                bit = cand & -cand                    # lowest remaining candidate bit
                cand -= bit
                d = bit.bit_length()                  # bit = 1 << (d-1) → digit d
                board[best_r][best_c] = str(d)
                rows[best_r] |= bit; cols[best_c] |= bit; boxes[b] |= bit

                if backtrack(remaining - 1):
                    return True                       # keep solution on the board

                rows[best_r] ^= bit; cols[best_c] ^= bit; boxes[b] ^= bit  # undo masks
            board[best_r][best_c] = '.'               # undo the write
            return False

        backtrack(len(empties))
```

Design notes worth saying while coding:

- `cand = FULL & ~(rows[r] | cols[c] | boxes[b])` — the candidate set is literally one expression.
- `^=` is a safe undo **only because the bit is guaranteed set** (we just set it, and no deeper frame can clear it — they'd have to place the same digit in the same unit, which the candidate test forbids). If unsure, use `&= ~bit`.
- The MRV scan skips cells with `board[r][c] != '.'` — deliberately **no list surgery** (no swap-pop), which removes a whole class of undo bugs. If you want the micro-optimization, swap the chosen cell to the end, pop, and on failure append + swap back **in that exact order**.
- Micro-tweak: store `(r, c, b)` triples in `empties` to avoid recomputing the box id.

### 6.3 Trace of Version 2 on the official example

**Load phase.** Masks are built from the clues. First `backtrack` call — MRV scan (row-major):

| Scanned cell | Blocked = row ∪ col ∪ box (digits) | Candidates | Count |
|---|---|---|---|
| (0,2) | {3,5,6,7,8,9} | {1,2,4} | 3 |
| (0,3) | {1,3,4,5,7,8,9} | {2,6} | 2 |
| (2,0) | {3,4,5,6,7,8,9} | {1,2} | 2 |
| (4,1) | {1,3,4,6,7,8,9} | {2,5} | 2 |
| **(4,4)** | **{1,2,3,4,6,7,8,9}** | **{5}** | **1 → break, forced** |

The bit arithmetic for `(4,4)` concretely: `rows[4]` (digits 1,3,4,8) = `141`; `cols[4]` (digits 1,2,6,7,8,9) = `483`; `boxes[4]` (digits 2,3,6,8) = `166`. Union = `495`; `cand = 0x1FF & ~495 = 16 = 1<<4` → `bit_length = 5` → place `'5'`. (True solution: `(4,4)=5`. ✓)

**Second call** (after `(4,4)=5`): scanning reaches `(4,1)` with candidates `{2}` (row 4 gained 5; blocked = {1,3,4,5,6,7,8,9}) → **forced 2**. ✓

**Third call** (after `(4,1)=2`): scanning reaches `(5,3)` with candidates `{9}` (row {2,6,7} ∪ col {1,4,8} ∪ box {2,3,5,6,8} = {1..8}) → **forced 9**. ✓

Compare with §4.2: the scan-order solver burned a dozen placements on a doomed `1` at `(0,2)` before the MRV solver has placed three digits — all three of them *forced*, zero branching. From here the singles keep cascading; when no single exists, MRV branches on a **2-candidate** cell (a 2-way fork, not a 9-way fork), and any branch that empties some cell's candidate set is pruned on the spot by the `cnt == 0` check. On typical puzzles the tree stays in the "few dozen placements" range rather than the hundreds.

### 6.4 Why it's correct (30-second argument)

- **Invariant:** the masks always equal exactly the digits currently on the board, and `remaining` equals the number of `'.'` cells — place/undo are exact inverses (`|=` ↔ `^=` on a bit that's guaranteed set; `str(d)` ↔ `'.'`).
- **Soundness:** every placement passed the row/col/box test, so the board is always a *valid partial* Sudoku; when `remaining == 0`, the pigeonhole argument (§2) makes it a full valid solution.
- **Completeness:** each frame tries *every* legal digit of the chosen cell, so DFS enumerates all consistent assignments; the first `True` is a solution, and by the uniqueness guarantee it's *the* solution.

---

## 7. Complexity

| Approach | Legality check | Worst-case time | Extra space | Practical speed |
|---|---|---|---|---|
| §4 rescan brute force | 27 reads + O(81) next-empty scan per node | O(9^m · 81) ≈ **O(9^m)**, `m` = empty cells | O(m) stack | crawls on hard boards |
| §6.1 sets + scan order | O(1) | **O(9^m)** | O(1) masks + O(m) stack | passes comfortably |
| §6.2 masks + MRV + 0-candidate pruning | O(1) per trial; O(≤81) per node for the MRV scan | **O(9^m)**, tiny tree in practice | O(1) masks + O(m) stack | near-instant, even on 17-clue puzzles |

Honest framing (this is what interviewers want to hear):

- The `9^m` bound is direct: each of `m` empty cells admits ≤ 9 recursive trials, so the pruned tree has ≤ 9^m leaves.
- Because the board is a **fixed 9×9**, everything is strictly O(1); the `m`-based statement is the meaningful one, exactly like saying "O(2^n) in the number of items" for knapsack at fixed n.
- Worst-case exponential behavior is *expected, not a design failure*: generalized Sudoku on n²×n² grids is NP-complete (Yato & Seta, 2003 — polynomial reduction from a known NP-complete Latin-square completion problem), so no polynomial algorithm is known for the general family.
- The raw space is astronomically large but irrelevant after pruning: there are ≈ 6.67 × 10²¹ complete Sudoku grids (Felgenhauer & Jarvis, 2005 — obtained by exhaustive enumeration up to symmetry), yet the solver above touches only a tiny pruned subtree.
- Space: recursion depth ≤ number of empty cells ≤ 81; masks are 27 fixed-width integers.

---

## 8. Common mistakes (symptom → fix)

| # | Mistake | Symptom | Fix |
|---|---|---|---|
| 1 | Forgetting the undo of `board[r][c]` **or** of the masks | stale digits exclude legal candidates later; garbage in output | Undo must be the exact mirror of the mutate, same frame |
| 2 | Undoing a mask with `\|=` instead of `^=` | masks only grow → "already used" fires spuriously → no solution found | `^=` (bit guaranteed set) or `&= ~bit` |
| 3 | Wrong box id: `r*3 + c//3`, `(r%3)*3 + c%3`, … | legal placements rejected / illegal accepted, no stack trace to help | `b = (r//3)*3 + c//3`; test corners `(0,0)→0, (0,8)→2, (8,8)→8` |
| 4 | `int` vs `str` mismatch (`'1' in {1,2}` is `False` in Python) | membership tests never fire → duplicates placed → Wrong Answer | Normalize once: read `int(ch)`, write `str(d)` |
| 5 | Iterating digits while the "candidate mask" variable is being recomputed/mutated mid-loop | silently skipped candidates | Snapshot `cand = best_cand` before the `while cand` loop |
| 6 | MRV list surgery (swap-pop) not restored on backtrack | `empties` loses cells → base case fires early → incomplete board | Either restore swap-back carefully, or use the skip-filled scan (as in §6.2) |
| 7 | Base case missing `return True` (or returning `None`) | a fully solved board is treated as failure and unwound | `if remaining == 0: return True` |
| 8 | Returning a new board instead of mutating | judge reports Wrong Answer despite a correct grid | In-place only; the signature returns `None` |
| 9 | Checking `valid` *after* placing (candidate conflicts with itself) | everything rejected | Check first, then place — or skip the cell itself when scanning |
| 10 | Off-by-one in bit ↔ digit (`1 << d` vs `1 << (d-1)`) | subtle mask errors; `bit_length()` recovery breaks | Pick `bit = 1 << (d-1)`, `FULL = 0x1FF`, digit = `bit.bit_length()` and stay consistent |

### 8.1 Language gotchas (Python / Java / C++)

| Language | Gotcha |
|---|---|
| **Java** | `board` is `char[][]`: use `int d = board[r][c] - '1'` (char arithmetic), not `Integer.parseInt`. Avoid `HashSet<Integer>` — autoboxing + hashing per membership test; use `int[] rows/cols/boxes` masks with `Integer.bitCount` and `Integer.numberOfTrailingZeros(bit) + 1`. |
| **C++** | Pass `vector<vector<char>>&` **by reference** (by value silently "works" but copies and mutates a throwaway). `__builtin_ctz(0)` is undefined — only call it on a nonzero bit (the `while (cand)` loop guarantees this). Prefer fixed `array<int,9>` masks over `unordered_set<int>` (allocation + hashing overhead per op). `cand & -cand` is fine for `int` with bits < 31. |
| **Python** | Set-of-int vs set-of-str (mistake #4) is the classic; recursion depth ≤ 81 so the default limit is fine; `bin(x).count('1')` works everywhere, `x.bit_count()` needs 3.10+. |

Bit ↔ digit recovery cheat sheet:

| Language | Count candidates | Lowest set bit | Bit → digit |
|---|---|---|---|
| Python | `bin(x).count('1')` / `x.bit_count()` | `x & -x` | `bit.bit_length()` |
| Java | `Integer.bitCount(x)` | `x & -x` | `Integer.numberOfTrailingZeros(bit) + 1` |
| C++ | `__builtin_popcount(x)` | `x & -x` | `__builtin_ctz(bit) + 1` (bit ≠ 0) |

---

## 9. Test plan — propose these out loud before/after coding

1. **Official Example 1** → must equal the published solution grid exactly.
2. **Single blank cell** (take a full valid grid, blank one cell) → base-case + forced-move path; fills instantly.
3. **Empty board** (`'.' × 81`) → any valid completion is acceptable; stresses mask loading, MRV (every cell starts with 9 candidates), and deep-ish recursion. Should return in milliseconds.
4. **17-clue minimal puzzle** → the hardest realistic input class: 17 is the proven minimum number of clues for a unique-solution Sudoku (McGuire, Tugemann & Civario, 2012 — an exhaustive computer search over all 16-clue candidates), so these maximize branching.
5. **Already-complete board** (no `'.'`) → must return immediately with the board unchanged (base case with `remaining == 0`).
6. **Follow-up variant — potentially invalid clues** (duplicate digit in a row): detect at load time — if a clue's bit is already present in `rows[r] | cols[c] | boxes[b]`, reject. (This is LeetCode 36's logic, reused.)

A tiny validator you can run in tests (and mention in interviews):

```python
def is_valid_solution(board) -> bool:
    FULL = 0x1FF
    rows, cols, boxes = [0]*9, [0]*9, [0]*9
    for r in range(9):
        for c in range(9):
            bit = 1 << (int(board[r][c]) - 1)
            b = (r // 3) * 3 + c // 3
            if (rows[r] | cols[c] | boxes[b]) & bit:
                return False
            rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit
    return True   # 81 cells, no duplicates in any unit ⇒ all 9 digits in each (pigeonhole)
```

---

## 10. Transferable patterns & related problems

| Ingredient here | General pattern | Reuse elsewhere |
|---|---|---|
| Backtracking over partial assignments | DFS on the choice tree: **choose → check O(1) → recurse → undo** | N-Queens (LC 51/52), Combination Sum (39), Word Search (79), Permutations (46) |
| Row/col/box "used" masks | **Incremental constraint state + exact undo** | Matchsticks to Square (473), Partition to K Equal Sum Subsets (698), Beautiful Arrangement (526) |
| MRV (fewest-candidates-first) | CSP variable-ordering heuristic | any CSP you're asked to make fast; core of real SAT/CSP solvers |
| `cnt == 0` → immediate prune | Forward checking / dead-end detection | Word Search II (212) with trie pruning |
| `FULL & ~union` candidate masks | Bitmask-as-set for tiny domains | N-Queens bitmask solutions, bitmask DP subsets |
| Exact-cover view of Sudoku | Algorithm X / Dancing Links (Knuth) | advanced follow-up for "can you do better?" |

**Follow-up questions to pre-load answers for:**

- *"Count all solutions"* → don't `return True` on success; count it, **fully restore state**, and keep searching (drop the uniqueness assumption).
- *"Generate a puzzle"* → solve an empty grid, then remove clues while a solution-counter confirms uniqueness (needs the counting variant).
- *"16×16 Sudoku"* → parameterize `n = 4`: masks become arrays of size 16 with `FULL = (1 << 16) - 1`; box id `(r//4)*4 + c//4`. The code shape is unchanged.
- *"Is there a fundamentally better algorithm?"* → exact cover + Dancing Links or SAT encodings are faster in practice, but still exponential worst case — expected, since the generalized family is NP-complete (§7).

---

## 11. The full interview script (what to say, in order)

1. **Restate (20s):** "9×9 grid of chars, fill the dots so every row, column, and 3×3 box has 1–9 exactly once, in place. Guaranteed exactly one solution — so I can stop at the first consistent assignment."
2. **Baseline (20s):** "This is a CSP, so the tool is backtracking: pick an empty cell, try each digit 1–9 that doesn't conflict, recurse, undo on failure. Completeness comes from exhausting the tree."
3. **Optimization 1 — incremental constraints (40s):** "Rechecking legality by scanning 27 cells per trial is wasteful — a placement only touches one row, one column, one box. So I'll keep a used-digit set per unit — 27 of them — with O(1) check/place/undo. And since each unit has 9 cells and 9 digits, 'no duplicates' already implies 'exactly once'."
4. **Optimization 2 — cell ordering (40s):** "The order I fill cells is completely free, so I'll use MRV: always fill the empty cell with the fewest legal digits. Zero candidates → the branch is dead, prune immediately. One candidate → forced move, no branching. This is what kills the deep doomed descents a scan-order solver suffers."
5. **Data structure (20s):** "9-bit masks per row/column/box; candidates are `FULL & ~(union)`; iterate set bits with `x & -x`; convert chars to ints once at load."
6. **Complexity (20s):** "Worst case 9 to the number of empty cells — expected, since generalized Sudoku is NP-complete — but on 9×9 with these prunes it's effectively instant. Space: 27 masks plus recursion depth ≤ 81."
7. **Code, narrating the undo lines explicitly.** Then: "Let me test: the official example, a one-blank board, an empty board — and I'd assert with a validator that checks all 27 units."

---

## 12. Say it in 60 seconds

> "This is a constraint-satisfaction problem, so the tool is backtracking: pick an empty cell, try digits, recurse, undo. Two upgrades make it fast. First, **incremental constraints** — a digit only affects its own row, column, and 3×3 box, so I keep a 9-bit 'used' mask for each of the 27 units; check, place, and undo are all O(1), with box id `(r//3)*3 + c//3`. Second, **cell ordering is free**, so I use MRV: always fill the empty cell with the fewest legal digits — zero candidates means prune immediately, one candidate is a free forced move. Candidates are just `FULL & ~(row | col | box)` masks. Worst case is 9-to-the-number-of-empty-cells, which is expected since generalized Sudoku is NP-complete — but on a 9×9 with these prunes it's effectively instant, with O(1) masks and recursion depth at most 81. I mutate the board in place, and the first complete assignment is the answer, since the solution is guaranteed unique."

Watch the two highest-leverage habits while delivering it: **undo is the mirror of mutate** (say the undo line out loud as you write it), and **0 candidates = prune, 1 candidate = forced** — those two sentences are what separate a "it works" answer from a "you understand solvers" answer.
