# Rotate Image (LeetCode 48) — Complete Interview Lesson

## 1. Problem Restatement

You're handed an **n × n** matrix of integers. You must rotate it **90° clockwise** and leave the result **in the same object** — no second matrix allowed. A few scalar temporaries (`temp`, loop variables) are fine; a whole O(n²) buffer is not.

Concretely, the value at row `r`, column `c` must end up at row `c`, column `n−1−r`:

```
(r, c)  ──90° CW──▶  (c, n−1−r)
```

Sanity-check that mapping on Example 1: the `7` lives at old `(2, 0)` and must land at new `(0, 2)` — and indeed `[[7,4,1],…]` has `7` in the top-right corner. The first column read **bottom-to-top** becomes the **first row left-to-right**. Fix that sentence in your head before writing any code; almost every bug in this problem is a direction or index error, not a logic error.

Everything here is index arithmetic. The code never compares, hashes, or transforms *values* — it only permutes *positions*. Keep "indices vs. values" separate in your head and in your speech.

---

## 2. Decoding the Constraints

| Constraint | What it actually tells you |
|---|---|
| Matrix is square (`n == matrix.length == matrix[i].length`) | Transpose is shape-preserving, so a true in-place rotation is *possible*. (A rectangular m×n → n×m rotation changes the container's shape and can't be done in the same array — worth saying out loud if the interviewer generalizes.) |
| `1 ≤ n ≤ 20` | At most 400 cells. Performance is a non-issue; **the in-place requirement is the entire interview**. Any O(n²) solution is instant. |
| `−1000 ≤ matrix[i][j] ≤ 1000` | Values are irrelevant: no overflow risk (we never do arithmetic on values, only swaps), duplicates are harmless, negatives need no special handling. |
| "Modify the input 2D matrix directly. DO NOT allocate another 2D matrix" | Auxiliary space must be **O(1)**. This single sentence is what makes the problem interesting. |
| Example 2 is 4×4, Example 1 is 3×3 | Both parities matter: even `n` has a "middle seam" of rings, odd `n` has a fixed center cell. Test both. |

**Assumption to state out loud:** the input is guaranteed square by the constraints; if it weren't, rotating 90° changes dimensions and requires a new matrix — clarify before coding.

---

## 3. Warm-Up: The Forbidden Brute Force

Even though the statement forbids it, open with it verbally. It proves you understand the mapping, and it sets up the insight.

### 3.1 Idea

Allocate a result matrix `B` using the **source form** of the mapping:

```
B[r][c] = A[n−1−c][r]
```

then copy `B` back into `A`. Time O(n²), extra space O(n²).

```python
def rotate_brute_force(matrix):
    n = len(matrix)
    # B[r][c] = A[n-1-c][r]  (source form of the clockwise map)
    rotated = [[matrix[n - 1 - c][r] for c in range(n)] for r in range(n)]
    for r in range(n):
        for c in range(n):
            matrix[r][c] = rotated[r][c]
```

> Common slip: building `rotated` but forgetting to copy it back — or in Python, writing `matrix = rotated` inside the function, which **rebinds the local name** and leaves the caller's matrix untouched. Mutate contents (`matrix[r][c] = …` or `matrix[:] = …`), never rebind the parameter.

### 3.2 Worked trace (Example 1)

`B[0][0] = A[2][0] = 7`, `B[0][1] = A[1][0] = 4`, `B[0][2] = A[0][0] = 1`, and so on:

```
A =             B =             copy back:
1 2 3           7 4 1           7 4 1
4 5 6    ──▶    8 5 2    ──▶    8 5 2
7 8 9           9 6 3           9 6 3
```

✓ Matches the expected output. This is correct — it just uses O(n²) extra space, which is exactly what the problem bans. The Pythonic one-liner `matrix[:] = [list(r) for r in zip(*matrix[::-1])]` is the same idea (it allocates a flipped copy and transposed rows, and produces tuples unless you wrap in `list`), so it fails the spirit *and* the letter of the constraint. Don't lead with it; mention it only as a trivia footnote.

---

## 4. The Core Insight

**A 90° clockwise rotation is an index permutation, and that permutation decomposes into two cheap, in-place primitives.**

Derivation, so you can reproduce it under pressure:

1. **Transpose** sends position `(r, c) → (c, r)`.
2. **Reversing each row** (a horizontal mirror) sends `(r, c) → (r, n−1−c)`.

Compose them: `(r, c) ──transpose──▶ (c, r) ──reverse row──▶ (c, n−1−r)`. That is *exactly* the clockwise mapping from Section 1. So:

> **Rotate 90° CW = transpose, then reverse every row.**

There's a second, equally valid decomposition for the same rotation — walk each "ring" (layer) of the matrix and cycle every group of four symmetric cells with a single temp. We'll build both.

---

## 5. Optimal Approach A — Transpose, Then Reverse Each Row

### 5.1 Algorithm

1. Transpose in place: for every `i < j`, swap `matrix[i][j] ↔ matrix[j][i]`. The inner loop must start at `j = i + 1` (upper triangle only).
2. Reverse each row in place (`row.reverse()` — in-place; `row[::-1]` allocates).

### 5.2 Code (Python)

```python
def rotate(matrix: list[list[int]]) -> None:
    """Rotates the n x n matrix 90 degrees clockwise, in place. O(n^2) time, O(1) space."""
    n = len(matrix)

    # Pass 1: transpose across the main diagonal.
    # j starts at i+1: each unordered pair must be swapped exactly once.
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

    # Pass 2: reverse each row (horizontal mirror). row.reverse() mutates in place.
    for row in matrix:
        row.reverse()
```

Notes:

- Python's tuple assignment evaluates the right side first, so the simultaneous swap can't clobber itself. In Java/C++ you need an explicit temp.
- `n = 1`: both loops are no-ops → correct automatically. Odd `n`: the center `(n//2, n//2)` is never swapped (it lies on the diagonal and is fixed by rotation) → correct automatically.

### 5.3 Trace — Example 1 (3×3)

Transpose swaps: `(0,1)↔(1,0)` swaps 2↔4; `(0,2)↔(2,0)` swaps 3↔7; `(1,2)↔(2,1)` swaps 6↔8. Center 5 untouched.

```
start          after transpose      after reversing each row
1 2 3          1 4 7                7 4 1
4 5 6    ──▶   2 5 8        ──▶     8 5 2
7 8 9          3 6 9                9 6 3          ✓ expected
```

### 5.4 Trace — Example 2 (4×4)

Transpose swaps: (0,1)↔(1,0): 1↔2 · (0,2)↔(2,0): 9↔13 · (0,3)↔(3,0): 11↔15 · (1,2)↔(2,1): 8↔3 · (1,3)↔(3,1): 10↔14 · (2,3)↔(3,2): 7↔12.

```
start             after transpose       after reversing each row
 5  1  9 11        5  2 13 15            15 13  2  5
 2  4  8 10   ──▶  1  4  3 14      ──▶   14  3  4  1
13  3  6  7        9  8  6 12            12  6  8  9
15 14 12 16       11 10  7 16            16  7 10 11     ✓ expected
```

---

## 6. Optimal Approach B — Layer-by-Layer Four-Way Cycles

### 6.1 Ring geometry

The matrix is a set of concentric square **rings**. Ring `L` has `first = L`, `last = n−1−L`. For an offset `off = i − first` walking along the top edge, the four positions in a "spoke" are:

| Edge | Position |
|---|---|
| top | `(first, first + off)` |
| right | `(first + off, last)` |
| bottom | `(last, last − off)` |
| left | `(last − off, first)` |

Under a clockwise rotation, **values** move `top → right → bottom → left → top`. With one temp you can rotate each 4-group: save the top; move left into top, bottom into left, right into bottom, saved top into right.

Loop structure: layers `L ∈ [0, n//2)`, and within a layer, `i ∈ [first, last)` — **exclusive** `last`, so each 4-group (corners included) is cycled exactly once. Self-check: a ring of side `s` moves `4(s−1)` cells; summing over rings gives exactly `n²` (minus the fixed center for odd `n`).

### 6.2 Code (Python)

```python
def rotate(matrix: list[list[int]]) -> None:
    """90 degrees clockwise via ring-wise 4-way cycles. O(n^2) time, O(1) space."""
    n = len(matrix)
    for layer in range(n // 2):
        first, last = layer, n - 1 - layer
        for i in range(first, last):          # exclusive last: corners once, not twice
            off = i - first
            top = matrix[first][i]                          # save top
            matrix[first][i] = matrix[last - off][first]    # left  -> top
            matrix[last - off][first] = matrix[last][last - off]  # bottom -> left
            matrix[last][last - off] = matrix[i][last]      # right -> bottom
            matrix[i][last] = top                           # top   -> right
    # Odd n: the center cell is never touched — correct, since rotation fixes it.
```

### 6.3 Trace — Example 1 (3×3, one ring, two 4-cycles)

`L = 0`, `first = 0`, `last = 2`; center `5` is never touched.

**Cycle 1** (`i=0`, corners): save `1`; `7`→top-left, `9`→bottom-left, `3`→bottom-right, `1`→top-right.

```
7 2 1
4 5 6
9 8 3
```

**Cycle 2** (`i=1`, edge midpoints): save `2`; `4`→top-middle, `8`→middle-left, `6`→bottom-middle, `2`→middle-right.

```
7 4 1
8 5 2
9 6 3        ✓ expected
```

### 6.4 Trace — Example 2 (4×4, two rings)

`L=0`: three cycles; `L=1`: one cycle. State after each step:

```
after (L0,i=0):    after (L0,i=1):    after (L0,i=2):    after (L1,i=1):
15  1  9  5        15 13  9  5        15 13  2  5        15 13  2  5
 2  4  8 10         2  4  8  1        14  4  8  1        14  3  4  1
13  3  6  7        12  3  6  7        12  3  6  9        12  6  8  9
16 14 12 11        16 14 10 11        16  7 10 11        16  7 10 11    ✓ expected
```

---

## 7. Which One to Use in the Interview?

| | Approach A (transpose + reverse) | Approach B (ring cycles) |
|---|---|---|
| Correctness risk | Very low — one loop bound to get right | Higher — four index formulas per cycle |
| Code length | ~6 lines | ~10 lines |
| Uses | Default choice under time pressure | Say it exists; use it if the interviewer asks for a **single-pass** version or wants to pivot to ring problems |

Recommended play: code A, then verbally note that B exists ("each ring can be rotated with 4-way swaps and one temp — same complexity, roughly half the memory writes since it touches each cell once instead of twice"). That demonstrates depth without risking a half-coded B.

---

## 8. Complexity Analysis

| Approach | Time | Auxiliary space | Truly in-place? |
|---|---|---|---|
| Auxiliary matrix + copy back (§3) | O(n²) | O(n²) | ✗ (forbidden) |
| Python `zip` one-liner | O(n²) | O(n²) | ✗ (allocates; rows become tuples) |
| **A: transpose + reverse rows** | **O(n²)** | **O(1)** | ✓ |
| **B: ring 4-cycles** | **O(n²)** | **O(1)** | ✓ |

**Why O(n²) time is optimal:** all `n²` entries must be read and rewritten (every cell except at most the odd-`n` center changes value, and even that one must be read), so no correct algorithm can beat Θ(n²) — that's the trivial input-touching bound, and both approaches match it. Space O(1) is forced by the problem statement itself.

---

## 9. Common Mistakes and Gotchas

| # | Mistake | Symptom | Fix |
|---|---|---|---|
| 1 | Transposing with the inner loop over the **full** `j` range (`j = 0…n−1`) | Every pair is swapped twice → transpose undoes itself → you output a row-mirrored matrix | Inner loop `j` from `i + 1`. This is *the* classic bug on this problem. |
| 2 | Wrong mirror after transpose (reversing the **row order** instead of each row) | You produce a 90° **counterclockwise** rotation | Mnemonic below — verify with "where does the top-left go?" |
| 3 | Ring loop `for i in range(first, last + 1)` | The corner 4-cycle is processed again → corners wrong / over-rotated | Inner loop is **exclusive** of `last` |
| 4 | Ring edge formulas mixed up (e.g., `last − off` on the wrong edge) | Matrix rotates counterclockwise, or corners end up transposed | Derive all four positions from `(r,c) → (c, n−1−r)` before typing; trace one ring by hand |
| 5 | Sequential assignment instead of a simultaneous swap / temp | You overwrite a value you still need (clobber during transpose) | Python: tuple assignment. Java/C++: explicit `temp` |
| 6 | Python `matrix = new_matrix` inside the function | Caller's matrix unchanged (name rebinding, not mutation) | Mutate contents: element writes or `matrix[:] = …` |
| 7 | Testing only on the 3×3 | Off-by-ones that only bite at `n = 2` or `n = 4` slip through | Run `n = 1`, a 2×2, and one even case mentally |
| 8 | "Special-casing" the odd-`n` center | Usually introduces a bug where none is needed | Both correct algorithms handle the center automatically — leave it alone |

**Direction mnemonic:**

| Result | Recipe 1 | Recipe 2 |
|---|---|---|
| 90° CW | transpose → reverse each row | reverse row order → transpose |
| 90° CCW | transpose → reverse row order | reverse each row → transpose |
| 180° | reverse row order + reverse each row (either order) | two 90° CW rotations |

**Language-specific gotchas (short list):**

- **C++:** the signature must be `void rotate(vector<vector<int>>& matrix)`. Pass **by value** and the code compiles, runs, and rotates a *local copy* — the judge sees an unchanged matrix. A silent, brutal bug. Use `std::swap` / `std::reverse(row.begin(), row.end())`.
- **Java:** there is no tuple assignment — you need an explicit `int tmp`. And beware `Arrays.asList(row)` on an `int[]`: it produces a `List<int[]>` containing one array, *not* a view of the elements, so `Collections.reverse` won't do what you hope (and `Integer` boxing buys you nothing here). Use a manual two-pointer reversal on the `int[]`.
- **Python:** `row.reverse()` mutates in place; `row[::-1]` allocates a copy (fine functionally, but not "in-place" in spirit). `matrix[:] = zip(*matrix[::-1])` leaves **tuples** in the matrix — wrap rows in `list(...)` if you ever use it.

---

## 10. Test Cases to Propose Out Loud

Say these before or right after coding — it signals rigor and catches the classic bugs:

1. **Official Example 1** (3×3): `[[1,2,3],[4,5,6],[7,8,9]]` → `[[7,4,1],[8,5,2],[9,6,3]]`. Check specifically that old top-left `(0,0)` lands at new top-right `(0,2)`.
2. **Official Example 2** (4×4): as above — covers the even-`n` seam.
3. **`n = 1`:** `[[7]]` → `[[7]]`. Loop bounds must naturally no-op.
4. **`n = 2` (smallest moving case):** `[[1,2],[3,4]]` → `[[3,1],[4,2]]`. The best off-by-one detector.
5. **Duplicates:** `[[5,5],[5,5]]` → unchanged, and `[[1,2],[2,1]]` → `[[2,1],[1,2]]`. The algorithm only moves *indices* and never compares *values*, so duplicates must be safe — this test forces you to confirm that claim.
6. **Negatives/extremes:** `[[−1,−2],[−3,−4]]` → `[[−3,−1],[−4,−2]]`; also confirms no value arithmetic (and hence no overflow concern even at ±1000).
7. **Property-based self-check (no reference needed):** applying `rotate` twice must equal a 180° flip (reverse row order + reverse each row), and applying it four times must return the original.

---

## 11. Variants and Follow-Ups

- **90° counterclockwise:** transpose, then reverse the **row order** (or reverse each row first, then transpose).
- **180°:** reverse row order and reverse each row — order doesn't matter.
- **Rotate by k×90°:** reduce `k mod 4`, then apply the matching recipe once (never loop `k` times when `k` can be huge).
- **Rectangular m×n:** rotating 90° produces an n×m matrix — the shape changes, so it fundamentally can't overwrite the same rectangular array; you need a new matrix (or a reinterpretation of a flat 1D buffer). Say this out loud; it's a favorite follow-up.
- **Single-pass requirement:** that's Approach B — n²/4 four-way cycles, each with one temp.
- **Generalized ring rotation / shift by k:** the ring decomposition extends to shifting each ring by `k` steps (use the cycle-rotation-with-one-temp idea, same as the 1D trick below).

---

## 12. Transferable Patterns and Related Problems

- **Index-permutation decomposition:** when asked to rearrange in place, write the destination map `(r,c) → f(r,c)` first, then search for a composition of *simple reversible primitives* (transpose, mirrors) or a *cycle decomposition*. This exact thinking solves Rotate Image and generalizes to any "permute positions in place" task.
- **Layer/onion traversal:** rings `L ∈ [0, n//2)` with `first/last` bounds appear all over grid problems.
- **Reverse-for-rotation:** 1D analog — rotating an array in place via three reversals instead of extra memory.
- **O(1)-space matrix tricks:** using existing cells as storage or markers.

Related problems to drill:

| Problem | Connection |
|---|---|
| LC 189 — Rotate Array | The 1D version of "rotate in place via reversals" |
| LC 867 — Transpose Matrix | The primitive used here (rectangular, so it allocates) |
| LC 54 / LC 59 — Spiral Matrix I & II | Same ring/layer decomposition |
| LC 73 — Set Matrix Zeroes | The other canonical in-place O(1)-space matrix puzzle |
| LC 289 — Game of Life | In-place update by encoding two states per cell |
| LC 498 — Diagonal Traverse | Index-map fluency on grids |

---

## 13. Full Interview Script (Talk Track)

> **Clarify:** "Square n×n, rotate 90° clockwise, strictly in place — O(1) auxiliary space, a temp variable is fine, no second matrix. The result overwrites the input. Values can be duplicated or negative, but since this is pure position permutation, values shouldn't matter to the algorithm."
>
> **State the mapping:** "Clockwise, the value at row r, column c lands at row c, column n−1−r. Equivalently, the first column read bottom-to-top becomes the first row. Let me verify with the example: the 7 at (2,0) should end up at (0,2) — yes, top-right."
>
> **Brute force:** "With a scratch matrix it's just B[c][n−1−r] = A[r][c] — O(n²) time and space. The statement forbids that buffer, so I need in-place primitives."
>
> **Insight:** "The clockwise permutation decomposes into two: transpose maps (r,c)→(c,r); reversing each row maps (r,c)→(r,n−1−c). Composed: (r,c)→(c,n−1−r) — exactly clockwise. So: transpose, then reverse every row."
>
> **Code (Approach A):** "Transpose swapping only the upper triangle — j from i+1, otherwise every pair gets swapped twice and the transpose undoes itself. Then `row.reverse()` on each row, which mutates in place."
>
> **Mention B:** "A single-pass alternative walks each ring and 4-way-cycles corner-aligned groups with one temp — same O(n²)/O(1). The transpose version has fewer index traps, so I coded that; happy to write the ring version if you want it."
>
> **Test:** "n=1 is a no-op by loop bounds; 2×2 [[1,2],[3,4]] → [[3,1],[4,2]]; both official examples; and rotating twice should equal a 180° flip — I'll check the 3×3 by hand: top-left 1 goes to top-right. ✓"
>
> **Complexity:** "Two passes over the cells, constant work per cell — O(n²) time, O(1) space. That time is optimal: every one of the n² values must move."

---

## 14. Say It in 60 Seconds

> "For a 90-degree clockwise rotation, the one fact that drives everything is the destination map: the value at row r, column c ends up at row c, column n−1−r. With extra memory you'd just write B[c][n−1−r] = A[r][c], but in-place we decompose the rotation into two primitives. First, transpose — swap M[i][j] with M[j][i], but only for j greater than i. Then reverse every row. Composing those two index maps gives exactly the clockwise mapping. Time is O(n²) — every cell is touched a constant number of times, which is optimal since all n² values must move — and space is O(1). The classic bug is looping j over the full range when transposing: each pair gets swapped twice and the transpose undoes itself, so keep the inner loop strictly above the diagonal. I'd verify with n=1, a 2×2, and by checking that the top-left corner lands in the top-right."

*(~145 words ≈ 55–60 seconds at interview speaking pace. If you only have 15 seconds: "Transpose, then reverse each row — upper triangle only, j from i+1 — that's clockwise 90°, O(n²) time, O(1) space.")*
