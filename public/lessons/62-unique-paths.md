# Unique Paths (LeetCode 62) — Complete Interview Lesson

## 1. Problem Restatement (say it back in your own words)

A robot starts at the **top-left cell** `(0, 0)` of an `m × n` grid and wants to reach the **bottom-right cell** `(m−1, n−1)`. At each step it may move only **right** or **down**. Count the number of **distinct move sequences** that get it there.

Two precisions worth saying out loud, because they prevent later bugs:

- A "path" is identified by its **sequence of moves**. Since the moves are deterministic, there is a perfect bijection between paths and move strings over the alphabet `{R, D}` — so "count paths" and "count move sequences" are the same question, with no duplicate-counting risk.
- Every path has **exactly** `(m−1) + (n−1)` moves: no path can be shorter (you must cross every row and every column), and no path is longer (you never need to backtrack). This fixed length is the key to the math solution later.

**Example 2 sanity check** (`m = 3, n = 2`): a path needs `2` downs and `1` right, so every move string has length 3 with exactly one `R`: `RDD`, `DRD`, `DDR` — that's 3, matching the problem statement.

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 ≤ m, n ≤ 100` | At most `100 × 100 = 10^4` cells, so an `O(m·n)` DP does ≤ 10,000 constant-work steps — trivially fast. Also, `m = 1` or `n = 1` (single row/column) is a real edge case: exactly **1** path, since every move is forced. |
| Answer ≤ `2 × 10^9` | Fits in a signed 32-bit int, because `2×10^9 < 2^31 − 1 = 2,147,483,647`. So Java/C++ `int` **DP cells** are safe *per the guarantee*. But watch intermediates (Section 5.4 / 7). |
| Answer ≤ `2 × 10^9` (again) | This implicitly restricts *which* `(m, n)` pairs can be tested. E.g., `(18, 18)` would give `C(34,17) = 2,333,606,220 > 2×10^9`, so a compliant judge can't ask it; `(18, 17)` gives `C(33,16) = 1,166,803,110` and is legal. |
| No obstacles, no weights, only 2 move types | The recurrence is a clean sum of two terms. This is also your follow-up radar: "what if obstacles?" is LeetCode 63, and it changes exactly one line. |

---

## 3. Brute Force: Enumerate Every Path (and why it dies)

**Idea.** From each cell, branch into the two possible moves and count the sequences that land on the target.

```python
def unique_paths_brute(m: int, n: int) -> int:
    def go(i: int, j: int) -> int:          # i = row, j = column (0-indexed)
        if i == m - 1 and j == n - 1:       # reached the target cell
            return 1
        if i >= m or j >= n:                # walked off the grid
            return 0
        return go(i + 1, j) + go(i, j + 1)  # down + right
    return go(0, 0)
```

**Worked trace on `m = 3, n = 2`** (target is `(2, 1)`):

```text
go(0,0)
├── D → go(1,0)
│        ├── D → go(2,0)
│        │        ├── D → go(3,0) = 0   (off grid)
│        │        └── R → go(2,1) = 1   (target!)
│        └── R → go(1,1)
│                 ├── D → go(2,1) = 1   (target!)
│                 └── R → go(1,2) = 0   (off grid)
└── R → go(0,1)
         ├── D → go(1,1) = 1           (recomputed! ← the hook for memoization)
         └── R → go(0,2) = 0           (off grid)

go(0,0) = go(1,0) + go(0,1) = (1+1) + 1 = 3 ✓
```

Note `go(1,1)` is computed twice — the recursion has **overlapping subproblems**, which is exactly what memoization fixes.

**Complexity.** Exponential — the recursion tree is full (every internal call spawns exactly two children) and has one leaf per complete move sequence, so total work is on the order of the number of paths, `C(m+n−2, m−1)`. That is `28` leaves for `(3,7)` but ~`1.2 × 10^9` for a legal worst-case like `(18, 17)` — Python TLEs long before you ever reach `m = n = 100` (where the count would be `C(198,99) ≈ 2×10^58`, hopeless).

> **What to say aloud:** "Brute force branches right/down at every cell — one recursion leaf per path, so it's exponential. Even a *legal* test like `(18,17)` has ~10^9 paths. The fix: `go(i, j)` only depends on the cell, so memoize it."

---

## 4. The Core Insights

### Insight A — Every path is a fixed multiset of moves (the combinatorial view)

Every path contains exactly `(m−1)` downs and `(n−1)` rights, so a path is nothing more than an **ordering** of that multiset. Counting orderings of `k = m+n−2` slots where you choose which `m−1` hold a `D`:

$$\text{answer} = \binom{m+n-2}{m-1} = \binom{m+n-2}{n-1}$$

Check against the examples: `(3,7)` → `C(8,2) = 28` ✓; `(3,2)` → `C(3,1) = 3` ✓.

### Insight B — Ways to reach a cell = ways above + ways left (the DP view)

Let `dp[i][j]` = **number of distinct move sequences from `(0,0)` to `(i,j)`** (indices are cell coordinates; the *values* are counts). Every path into `(i,j)` has a **unique last move**, either `D` (came from `(i−1,j)`) or `R` (came from `(i,j−1)`). These two cases are **disjoint** — that's why the sum doesn't double-count — so:

$$dp[i][j] = dp[i-1][j] + dp[i][j-1], \qquad dp[0][*] = dp[*][0] = 1,\quad dp[0][0] = 1.$$

**Beautiful connection:** this recurrence is **Pascal's triangle rotated 45°** — in fact `dp[i][j] = C(i+j, i)`, so `dp[m−1][n−1] = C(m+n−2, m−1)`. The DP and the formula are the same object; knowing this lets you cross-check one against the other.

---

## 5. Optimal Approaches, Tiered

### 5.1 Bridge: top-down memoization — `O(m·n)` time, `O(m·n)` space

Each of the ≤ `m·n` in-bounds states does `O(1)` branching work and is computed once, hence linear in the cell count. Python's default recursion limit (1000) comfortably covers the max depth of ~`(m−1)+(n−1) = 198`.

```python
from functools import lru_cache

def unique_paths_memo(m: int, n: int) -> int:
    @lru_cache(maxsize=None)
    def ways(i: int, j: int) -> int:
        if i == m - 1 and j == n - 1:
            return 1
        if i >= m or j >= n:
            return 0
        return ways(i + 1, j) + ways(i, j + 1)
    return ways(0, 0)
```

### 5.2 Bottom-up 2D DP — `O(m·n)` time, `O(m·n)` space

Initializing the *entire* table to 1 is not a hack: row 0 and column 0 genuinely have exactly one path each (a straight line), and only interior cells get recomputed.

```python
def unique_paths(m: int, n: int) -> int:
    dp = [[1] * n for _ in range(m)]      # NOT [[1]*n]*m  (row aliasing!)
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
    return dp[m - 1][n - 1]
```

**Trace on Example 1 (`m = 3, n = 7`)** — rows are `i`, columns are `j`; values are path counts:

| dp[i][j] | j=0 | j=1 | j=2 | j=3 | j=4 | j=5 | j=6 |
|---|---|---|---|---|---|---|---|
| **i=0** | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| **i=1** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| **i=2** | 1 | 3 | 6 | 10 | 15 | 21 | 28 |

Final cell: `dp[2][6] = dp[1][6] + dp[2][5] = 7 + 21 = 28` ✓

**Trace on Example 2 (`m = 3, n = 2`):**

| dp[i][j] | j=0 | j=1 |
|---|---|---|
| **i=0** | 1 | 1 |
| **i=1** | 1 | 2 |
| **i=2** | 1 | 3 |

`dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3` ✓ — and it decomposes exactly into the three listed paths: two arrive via a last `D` (through `dp[1][1]`: `DRD`, `RDD`), one via a last `R` (through `dp[2][0]`: `DDR`).

### 5.3 Space-optimized 1D DP — `O(m·n)` time, `O(min(m,n))` space

Row `i` only reads row `i−1` (as `dp[j]`'s old value) and the current row's left neighbor (as the already-updated `dp[j−1]`), so one array suffices. **The sweep must go left → right**, because the recurrence *pulls from the left*:

```python
def unique_paths(m: int, n: int) -> int:
    if n > m:                 # keep the array on the shorter dimension (answer is symmetric)
        m, n = n, m
    dp = [1] * n              # row 0: all 1s
    for _ in range(1, m):
        for j in range(1, n):
            dp[j] += dp[j - 1]   # old dp[j] = above; new dp[j-1] = current-row left
    return dp[-1]
```

**Trace on `(3, 7)`:** row 0 `[1,1,1,1,1,1,1]` → row 1 `[1,2,3,4,5,6,7]` → row 2 `[1,3,6,10,15,21,28]` → return **28** ✓

> **Direction gotcha (transferable!):** in 0/1 knapsack you sweep a 1D array **right→left** because the recurrence reads the *previous* left value; here the recurrence reads the *current* left value, so it's **left→right**. Sweeping right→left here would compute `dp_prev[j] + dp_prev[j−1]` — silently wrong after row 1. The required direction always follows from which neighbor the recurrence reads.

### 5.4 The math solution — `O(min(m,n))` time, `O(1)` space

Iteratively compute `C(k, r)` with `k = m+n−2`, `r = min(m−1, n−1)`:

```python
def unique_paths(m: int, n: int) -> int:
    k = m + n - 2            # total moves in any path
    r = min(m - 1, n - 1)    # choose the smaller side
    res = 1
    for i in range(1, r + 1):
        res = res * (k - i + 1) // i   # multiply FIRST, then floor-divide — always exact
    return res
    # one-liner alternative (Python 3.8+): return math.comb(m + n - 2, m - 1)
```

**Trace on `(3,7)`:** `k=8, r=2` → `i=1`: `res = 1·8//1 = 8`; `i=2`: `res = 8·7//2 = 28` ✓. **On `(3,2)`:** `k=3, r=1` → `res = 3` ✓.

Two properties make this loop trustworthy:

- **Exact division.** After step `i`, `res = C(k, i)`, and `C(k, i−1)·(k−i+1) = C(k, i)·i`, so the pre-division product is always divisible by `i` — floor division loses nothing.
- **No intermediate overflow (given the problem's guarantee).** Since `r ≤ k/2` and binomials increase up to `k/2`, every partial value `C(k, i)`, `i ≤ r`, is ≤ the final answer ≤ `2×10^9`; the pre-division product is then ≤ `2×10^9 × 198 ≈ 4×10^11`, which fits in a 64-bit integer. Skipping the `min` is dangerous: for `(m, n) = (2, 100)`, iterating to `r = 99` passes through `C(100,50) ≈ 10^29`, overflowing even 64-bit.

---

## 6. Complexity Table

| # | Approach | Time | Extra space | Notes |
|---|---|---|---|---|
| 1 | Brute-force recursion | Exponential, ≈ `C(m+n−2, m−1)` leaves¹ | `O(m+n)` stack | Stepping stone only; TLEs by `m+n ≈ 35` |
| 2 | Memoized recursion | `O(m·n)`² | `O(m·n)` memo + `O(m+n)` stack | Natural live refactor of #1 |
| 3 | Bottom-up 2D DP | `O(m·n)` | `O(m·n)` | The version that survives follow-ups (obstacles) |
| 4 | 1D rolling DP | `O(m·n)` | `O(min(m,n))` | **The DP you should actually type** |
| 5 | Binomial formula | `O(min(m,n))` word ops | `O(1)` | Fastest; brittle when obstacles are added |

¹ One leaf per distinct move sequence; sequences reaching the target number exactly `C(m+n−2, m−1)` (Section 3).  
² ≤ `m·n` distinct states, `O(1)` work each (Section 5.1).

---

## 7. Common Mistakes & Language Gotchas

1. **Off-by-one in the total move count.** It's `(m−1)+(n−1) = m+n−2`, so the formula is `C(m+n−2, m−1)` — not `C(m+n−1, …)` or anything involving `m·n`.
2. **Wrong base cases.** `dp[0][0] = 1` (one empty path), not 0; single row/column → 1, not 0. The `(1,1)` grid must return 1.
3. **Python row aliasing.** `[[1]*n]*m` creates `m` references to *one* list — every write corrupts the whole table. Use `[[1]*n for _ in range(m)]`.
4. **Division order/precision in the formula.** Multiply before dividing (`res * (k - i + 1) // i`). Using `/` returns a float; here the numbers happen to stay under 2^53 ≈ 9×10^15 so it might sneak through, but it's a silent-rounding landmine on larger variants — always use `//`.
5. **1D sweep direction.** Left→right (Section 5.3); the knapsack habit of right→left breaks this recurrence.
6. **Coordinate-order drift.** Mixing up "m rows vs n columns" is *invisible here* (the answer is symmetric in `m, n`) — but the same sloppiness is fatal in Unique Paths II, where the obstacle layout isn't symmetric. Build the `(row, col)` discipline now.
7. **Fear of double counting (the opposite mistake).** `dp[i−1][j] + dp[i][j−1]` does *not* double-count: the "last move was D" and "last move was R" path sets are disjoint.

**Language-specific gotchas:**

| Language | Gotcha |
|---|---|
| **Python** | `//` not `/` (mistake #4); `math.comb` (≥ 3.8) gives an exact big-int answer in one call. |
| **Java** | `int` DP cells are fine per the ≤ 2×10^9 guarantee (`2×10^9 < 2^31−1`), but the formula's running product reaches ~4×10^11 → declare `long res`. If memoizing with `HashMap`, autoboxing `(Integer, Integer)` keys/values works but is wasteful at 10^4 entries; a plain `int[m][n]` or a `HashMap<Long, Integer>` keyed by `i * 1000L + j` is cleaner. |
| **C++** | The classic trap: `long long res = a * b / i;` still overflows if `a` and `b` are `int` — the product is computed as `int` *before* the assignment. Make `res` a `long long` from the start (it absorbs the `int` operand via promotion). No `std::comb` exists; write the loop. |

---

## 8. Test Cases to Propose Out Loud

Announce these *before or right after* coding — it signals engineering maturity:

| Case | Input `(m, n)` | Expected | What it stress-tests |
|---|---|---|---|
| Official 1 | `(3, 7)` | 28 | Main DP trace |
| Official 2 | `(3, 2)` | 3 | Asymmetric small grid; matches the enumerated `RDD/DRD/DDR` |
| Singleton grid | `(1, 1)` | 1 | Start == goal; loops must not execute; `C(0,0) = 1` |
| Single row | `(1, 100)` | 1 | Border-only path; formula's `r = 0` branch |
| Single column | `(100, 1)` | 1 | Transpose of the above |
| Smallest nontrivial | `(2, 2)` | 2 | `RD` vs `DR` |
| Symmetry probe | `(7, 3)` | 28 | Property: `f(m,n) == f(n,m)` |
| Overflow-adjacent | `(18, 17)` | 1,166,803,110 | Largest-scale *legal* answer; catches 32-bit products in the formula path |

Bonus property checks to mention: `unique_paths(m, n) == unique_paths(n, m)` for random pairs, and `dp` result == `math.comb(m+n−2, m−1)` as a cross-validation oracle.

---

## 9. Transferable Patterns & Related Problems

- **Counting paths in a DAG.** Each cell is a node, moves are edges, row-major order is a valid topological order, and "count paths into a node = sum over in-edges" is the universal pattern. Obstacles = force that node's count to 0. Weighted variants swap `+` for `min`/`max`.
- **Rolling-array compression.** Any DP where row `i` depends only on row `i−1` collapses to one row. Applies identically to knapsack, Minimum Path Sum, edit-distance variants (with a bounded window).
- **Counting via bijection to a fixed multiset.** "Every object is an ordering of a known multiset → multinomial/binomial count." Same engine behind Climbing Stairs (`C(n−k, k)` summed over twos) and stars-and-bars problems.
- **Recognizing Pascal's triangle in a grid.** `dp[i][j] = C(i+j, i)` — spotting a closed form can collapse an `O(mn)` DP to `O(min(m,n))`.
- **Follow-up radar (expect these):**
  - *Obstacles?* → LC 63: `dp[i][j] = 0` if blocked, else top+left; the pure formula route breaks (you'd need inclusion–exclusion), so DP shines — good reason to lead with DP.
  - *Huge m, n with answer mod 1e9+7?* → formula + modular inverses; `x^(p−2) mod p` is the inverse because `p = 1e9+7` is prime (Fermat's little theorem).
  - *Diagonal moves allowed?* → counts become **Delannoy numbers** `D(m−1, n−1) = Σₖ C(m−1,k)·C(n−1,k)·2ᵏ`, from choosing which `k` of the steps are diagonal and interleaving the rest.
  - *Visit every cell exactly once?* → LC 980: that's Hamiltonian-path counting; different beast, needs backtracking — the DP no longer applies.
  - *Print the paths?* → inherently exponential, because the output size equals the path count (up to ~10^9 for legal inputs here).

| Related problem | Relationship |
|---|---|
| LC 63 — Unique Paths II | Same DP, one line changed (obstacles → 0) |
| LC 64 — Minimum Path Sum | Same skeleton, `min` of costs instead of sum of counts |
| LC 120 — Triangle | Rolling-row space optimization |
| LC 980 — Unique Paths III | Trap lookalike: needs backtracking, not this DP |
| LC 70 — Climbing Stairs | 1-D analog with the same binomial closed form |
| LC 174 — Dungeon Game | Grid DP run in reverse |

---

## 10. The Full Talk Track (phase by phase)

- **Clarify (30s):** "Grid `m×n`, start top-left, end bottom-right, moves are right or down only, count distinct move sequences — no obstacles, correct? I'll use `(row, col)` 0-indexed throughout."
- **Brute force (1 min):** "Branch right/down at every cell. One recursion leaf per path, so it's exponential — even a legal `(18,17)` test has ~10^9 paths. But each call depends only on the cell, so I can memoize."
- **Insight (1 min):** "Actually two closed forms exist. Every path is exactly `m−1` downs and `n−1` rights in some order, so the count is `C(m+n−2, m−1)`. Equivalently, DP: ways into a cell = ways-above + ways-left — no double counting because each path has one last move."
- **Implement (5–7 min):** Type the 2D DP (borders = 1, interior = sum), verify `(3,7) → 28` against the table, then compress to one row with a left-to-right sweep.
- **Upgrade (2 min):** "If you want `O(min(m,n))` time, `O(1)` space: iterative binomial — multiply before divide, division is exact by construction, 64-bit running product."
- **Test:** "(1,1)→1; single row/column→1; (2,2)→2; symmetry `(7,3)`→28; `(18,17)`→1,166,803,110 to stress numeric range."
- **Follow-ups:** "Obstacles → same DP, blocked cell contributes 0, formula route dies — that's why I'd ship the DP in production and the formula as the party trick."

---

## 11. Say It in 60 Seconds

> "Unique Paths asks how many ways a robot goes from the top-left to the bottom-right of an m-by-n grid moving only right or down. The key observation: every path uses exactly m−1 downs and n−1 rights, so a path is just an ordering of that fixed multiset — the answer is 'choose which of the m+n−2 move slots are downs,' i.e., C(m+n−2, m−1). The same number falls out of DP: ways to reach a cell equals ways-above plus ways-left, with the first row and column all ones — and there's no double counting because each path has a unique last move. I'd code the DP first — O(mn) time, and since each row only needs the previous row, one array gives O(min(m, n)) space — because the DP survives the obvious follow-up with obstacles, where the formula doesn't. The formula itself is an O(min(m,n)) loop: multiply first, then divide — the division is always exact — and keep the running product in 64-bit, since intermediates reach around four times ten to the eleventh even though the answer fits in 32 bits. Edge cases: one row or one column gives exactly 1 path, and a 1-by-1 grid gives 1. I'd sanity-check (3,7) gives 28 and (3,2) gives 3."
