# Edit Distance (LeetCode 72) — Complete Interview Lesson

## 1. Problem, restated in your own words

We're given two strings `word1` and `word2` and must return the **minimum number of single-character edits** needed to turn `word1` into `word2`, where an edit is one of:

- **Insert** any character at any position,
- **Delete** any character,
- **Replace** any character with another.

This is the classic **Levenshtein distance**. A few things worth clarifying out loud in an interview (they cost 10 seconds and prevent 10 minutes of pain):

- Each operation costs exactly **1**, regardless of which character is involved? (Yes, per the problem.)
- Is there a "swap adjacent characters" operation? (**No** — plain Levenshtein; this is a real trap, see test cases.)
- Are empty strings possible? (Yes — `0 <= length <= 500`, so base cases matter.)
- We only need the **count**, not the sequence of operations. (But the sequence is recoverable — see §5.6, and the problem's own explanations are examples of optimal sequences.)

**Restated:** *"Find the cheapest alignment of the two strings where each position of `word1` is either matched to a position of `word2` (equal or replaced), or deleted, and any leftover positions of `word2` are inserted."*

## 2. Decoding the constraints

| Constraint | What it tells us |
|---|---|
| `length ≤ 500` for both | `n·m ≤ 250,000` → an **O(n·m) DP is the intended target**; a full 2D table of ~251k ints is trivially affordable. Anything exponential (3^(n+m)) will TLE catastrophically. |
| Length can be **0** | Base cases (`dp[i][0]`, `dp[0][j]`) are not decoration — they *are* the answer for empty strings. Don't "guard" them away. |
| Lowercase English letters only | The algorithm **never uses the alphabet** — no per-letter maps needed. It works for any characters unchanged. |
| Values involved | Max possible answer is 500 → no overflow concerns in any language. |

Sanity bounds worth knowing before you code (good for validating your answer later): `|len1 − len2| ≤ answer ≤ max(len1, len2)`. The lower bound holds because one edit changes the length by at most 1 (replace changes it by 0); the upper bound holds because you can delete all of `word1` and insert all of `word2`, or better, align the shorter string with replaces.

## 3. Brute force first: recursion, then a trace

### 3.1 Recursive definition (prefix view — one definition for the whole lesson)

Let `f(i, j)` = minimum operations to convert the **first `i` characters** of `word1` into the **first `j` characters** of `word2` (so we reason about *lengths*, and index characters as `word1[i-1]`, `word2[j-1]`).

```text
f(i, j):
  if i == 0: return j            # empty source: insert all j chars of word2
  if j == 0: return i            # empty target: delete all i chars of word1
  if word1[i-1] == word2[j-1]: return f(i-1, j-1)        # free match
  return 1 + min(
      f(i-1, j-1),   # REPLACE word1[i-1] -> word2[j-1], then align the rest
      f(i-1, j),     # DELETE  word1[i-1]; the rest must become word2[:j]
      f(i, j-1)      # INSERT  word2[j-1]; word1[:i] must become word2[:j-1]
  )
```

Why is it enough to look at only the **last** characters? Because any optimal edit script corresponds to an alignment, and an alignment's last column pairs `word1[i-1]` and `word2[j-1]` in exactly one of three ways: with each other (match or mismatch→replace), `word1[i-1]` with a gap (delete), or a gap with `word2[j-1]` (insert). The recurrence enumerates *all three* — that's the whole correctness argument.

### 3.2 Worked trace (and where it explodes)

Small hand-evaluation on `"horse"` / `"ros"` — computing `f(3, 2)` = `"hor"` → `"ro"`:

- Last chars `'r'` vs `'o'`: mismatch → `1 + min(f(2,1), f(2,2), f(3,1))`
- `f(2,1)`: `'o'` vs `'r'` → `1 + min(f(1,0)=1, f(1,1), f(2,0)=2)`; `f(1,1)`: `'h'` vs `'r'` → `1 + min(f(0,0)=0, …) = 1` → `f(2,1) = 2`
- `f(2,2)`: `'o' == 'o'` → `f(1,1) = 1`
- `f(3,1)`: `'r' == 'r'` → `f(2,0) = 2`
- **`f(3,2) = 1 + min(2, 1, 2) = 2`** ✓ (matches the DP table in §5.3)

Now look at the call tree top-down — the same subproblem appears on multiple branches almost immediately:

```text
f(5,3)  'e'≠'s'
├── f(4,2)  's'≠'o'
│   ├── f(3,1)  'r'=='r' → f(2,0) = 2
│   ├── f(3,2)  ...
│   └── f(4,1)  ...
├── f(4,3)  's'=='s' → f(3,2)     ← f(3,2) recomputed!
└── f(5,2)  'e'≠'o'
    └── f(4,1)                    ← f(4,1) recomputed!
```

**Complexity of raw recursion:** worst case **O(3^(n+m))** time — each mismatched call spawns three children, and every root-to-base path decreases `i + j` by exactly 1 per step, so the depth is at most `n + m`. It's correct but unusable at n = m = 500. The fix is structural: only `O(n·m)` *distinct* `(i, j)` states exist.

## 4. The core insight

Three sentences you should be able to say from memory:

1. **The state is a pair of prefixes:** `dp[i][j]` = edit distance between `word1[:i]` and `word2[:j]`.
2. **Each permitted operation is a move on the grid:**

| Move from `(i-1, j-1)`-neighborhood | Operation | Cost |
|---|---|---|
| diagonal `(i-1, j-1) → (i, j)`, chars equal | **match** (free) | 0 |
| diagonal `(i-1, j-1) → (i, j)`, chars differ | **replace** `word1[i-1]` → `word2[j-1]` | 1 |
| up `(i-1, j) → (i, j)` | **delete** `word1[i-1]` | 1 |
| left `(i, j-1) → (i, j)` | **insert** `word2[j-1]` | 1 |

3. **The answer is `dp[n][m]`**, and row 0 / column 0 are pure insert/delete ramps.

An edit path from `(0,0)` to `(n,m)` is exactly an alignment of the two strings; the DP takes the cheapest path through this DAG. Note the symmetry: distance(A→B) = distance(B→A), because reversing an optimal script turns every insert into a delete and vice versa. This is why "insert into `word1`" and "delete from `word2`" are the same leftward move, and it's what licenses swapping the strings to shrink memory (§5.5).

## 5. Optimal solution: bottom-up DP (Wagner–Fischer)

### 5.1 Definition and recurrence

```
dp[i][j] = min ops to convert word1[:i] -> word2[:j],   0 ≤ i ≤ n, 0 ≤ j ≤ m

dp[0][j] = j          # insert j chars
dp[i][0] = i          # delete i chars
if word1[i-1] == word2[j-1]:
    dp[i][j] = dp[i-1][j-1]
else:
    dp[i][j] = 1 + min(dp[i-1][j-1],   # replace
                       dp[i-1][j],     # delete
                       dp[i][j-1])     # insert
```

Fill row-major; every cell needs only its top, left, and top-left neighbors, so `O(1)` per cell.

### 5.2 Code (Python)

```python
def min_distance(word1: str, word2: str) -> int:
    n, m = len(word1), len(word2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(n + 1):
        dp[i][0] = i                    # delete everything from word1
    for j in range(m + 1):
        dp[0][j] = j                    # insert everything into empty word1

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]          # free match
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1],  # replace
                                   dp[i - 1][j],      # delete
                                   dp[i][j - 1])      # insert
    return dp[n][m]
```

(There is also a compact *unconditional* recurrence — see §7, mistake #3 — but the explicit match branch above is the clearest to write live.)

### 5.3 Trace on Example 1: `horse` → `ros`

| dp | `""` | `r` | `ro` | `ros` |
|---|---|---|---|---|
| `""` | 0 | 1 | 2 | 3 |
| `h` | 1 | **1** | 2 | 3 |
| `ho` | 2 | 2 | **1** | 2 |
| `hor` | 3 | **2** | 2 | 2 |
| `hors` | 4 | 3 | 3 | **2** |
| `horse` | 5 | 4 | 4 | **3 = answer** |

Callouts worth making while narrating:

- `dp[1][1] = 1` (`h` vs `r`): mismatch → `1 + min(dp[0][0]=0, …)` = replace.
- `dp[2][2] = 1` (`ho` vs `ro`): `'o' == 'o'` → inherit `dp[1][1] = 1`. Matches are *free diagonal copies*.
- `dp[3][1] = 2` (`hor` vs `r`): `'r' == 'r'` → inherit `dp[2][0] = 2` (delete `h`, `o`).
- `dp[5][3] = 3` (`e` vs `s`): `1 + min(dp[4][2]=3, dp[4][3]=2, dp[5][2]=4)` → the **up** move wins (delete `e`), consistent with the sample explanation (replace `h`→`r`, delete `r`, delete `e`).

### 5.4 Trace on Example 2: `intention` → `execution`

| dp | `""` | `e` | `x` | `e` | `c` | `u` | `t` | `i` | `o` | `n` |
|---|---|---|---|---|---|---|---|---|---|---|
| `""` | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| `i` | 1 | 1 | 2 | 3 | 4 | 5 | 6 | 6 | 7 | 8 |
| `in` | 2 | 2 | 2 | 3 | 4 | 5 | 6 | 7 | 7 | 7 |
| `int` | 3 | 3 | 3 | 3 | 4 | 5 | **5** | 6 | 7 | 8 |
| `inte` | 4 | 3 | 4 | 3 | 4 | 5 | 6 | 6 | 7 | 8 |
| `inten` | 5 | 4 | 4 | 4 | 4 | **5** | 6 | 7 | 7 | 7 |
| `intent` | 6 | 5 | 5 | 5 | 5 | 5 | **5** | 6 | 7 | 8 |
| `intenti` | 7 | 6 | 6 | 6 | 6 | 6 | 6 | **5** | 6 | 7 |
| `intentio` | 8 | 7 | 7 | 7 | 7 | 7 | 7 | 6 | **5** | 6 |
| `intention` | 9 | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 6 | **5 = answer** |

Notice the structure: the five bold cells sit on a diagonal (`t,i,o,n` match for free), and the answer `5` comes from the mismatch block in the top-left (`"inten"` vs `"execu"`) costing 5 replaces. A teaching point: **optimal paths are not unique.** The sample explanation uses delete + 3 replaces + insert; backtracking from `(9,9)` along *this* table instead yields 5 pure replaces (`i→e, n→x, t→e, e→c, n→u`). Same cost, different valid script — the DP returns the count, and any min-cost backtracking gives *an* optimal sequence.

### 5.5 Space optimization: rolling row, O(min(n, m))

Only the previous row (and the diagonal) is needed. By the symmetry from §4, swap the strings first so the row length is the smaller of the two:

```python
def min_distance_1d(word1: str, word2: str) -> int:
    if len(word2) > len(word1):          # keep the DP row as short as possible
        word1, word2 = word2, word1      # legal: edit distance is symmetric
    n, m = len(word1), len(word2)

    prev = list(range(m + 1))            # row i = 0:  dp[0][j] = j
    for i in range(1, n + 1):
        curr = [i] + [0] * m             # dp[i][0] = i
        for j in range(1, m + 1):
            if word1[i - 1] == word2[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = 1 + min(prev[j - 1],   # replace (diagonal)
                                  prev[j],       # delete  (up)
                                  curr[j - 1])   # insert  (left)
        prev = curr
    return prev[m]
```

The classic bug here is overwriting the diagonal before you read it (mistake #6 in §7).

### 5.6 Optional flourish: reconstructing the operations

Keep the full 2D table and walk backwards from `(n, m)`, moving to whichever predecessor achieves the current value (free match if chars are equal and `dp[i][j] == dp[i-1][j-1]`; else `+1` diagonal = replace, `+1` up = delete, `+1` left = insert):

```python
def reconstruct(word1: str, word2: str, dp: list[list[int]]) -> list[str]:
    i, j, ops = len(word1), len(word2), []
    while i > 0 or j > 0:
        if i and j and word1[i-1] == word2[j-1] and dp[i][j] == dp[i-1][j-1]:
            i, j = i - 1, j - 1                                   # match
        elif i and j and dp[i][j] == dp[i-1][j-1] + 1:
            ops.append(f"replace pos {i-1}: {word1[i-1]} -> {word2[j-1]}")
            i, j = i - 1, j - 1
        elif i and dp[i][j] == dp[i-1][j] + 1:
            ops.append(f"delete pos {i-1}: {word1[i-1]}"); i -= 1
        else:
            ops.append(f"insert {word2[j-1]}"); j -= 1
    return ops[::-1]
```

Mentioning this in an interview ("the problem's own explanations are exactly backtrackings of this table") signals real understanding.

## 6. Complexity table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Raw recursion (§3) | O(3^(n+m)) worst case — each mismatched call branches 3 ways and depth ≤ n+m | O(n+m) stack | TLEs at 500×500 |
| Memoized top-down | O(n·m) | O(n·m) memo + O(n+m) stack | Watch Python's recursion limit (§7) |
| **Bottom-up 2D (reference)** | **O(n·m)** | **O(n·m)** | ~251k cells at max constraints; milliseconds in Python |
| Rolling 1D row | O(n·m) | O(min(n, m)) | Swap strings so the inner dimension is shorter |

**Follow-up territory (cite-with-justification material):**

- *"Can we do better if we only need to know whether the distance is ≤ k?"* Yes — banded DP in **O(k·min(n, m))**: since a match/replace keeps `i − j` fixed while an insert/delete changes it by exactly 1, every cell satisfies `dp[i][j] ≥ |i − j|`, so cells with `|i − j| > k` can never lie on a path of cost ≤ k and can be skipped.
- *"Is there a truly subquadratic algorithm?"* Not known to exist conditionally: Backurs–Indyk (2015) reduced CNF-SAT to edit distance, so an O(n^(2−ε)) edit-distance algorithm would contradict the Strong Exponential Time Hypothesis.
- Engineering-level speedups exist, e.g., Myers' bit-parallel algorithm runs in O(n·m/w) word operations because it packs each DP row into machine words and advances `w` columns per word-size operation.

## 7. Common mistakes & debugging checklist

1. **Index vs. length confusion.** `dp[i][j]` refers to prefixes of *lengths* `i` and `j`; the characters being compared are `word1[i-1]` and `word2[j-1]`. Table size is `(n+1) × (m+1)`. The #1 off-by-one source.
2. **Base row/column wrong or missing.** `dp[0][j] = j`, `dp[i][0] = i` — not zeros. These handle the empty-string edge cases; initializing everything to 0 fails `"" → "abc"`.
3. **The `1 + dp[i-1][j-1]` on match bug.** Writing `dp[i][j] = 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])` unconditionally gives 1 for `"a"` vs `"a"` (correct: 0). Either branch explicitly on match, or use the safe compact form `dp[i][j] = min(dp[i-1][j-1] + (word1[i-1] != word2[j-1]), dp[i-1][j] + 1, dp[i][j-1] + 1)` — safe because on a match, `dp[i-1][j-1]` is already ≤ each neighbor + 1 (removing one character changes the distance by at most 1), so the free term wins.
4. **Mixing up delete vs. insert directions.** With the prefix view: `dp[i-1][j]` = delete from `word1`; `dp[i][j-1]` = insert. Fun nuance: for *unweighted* edit distance, swapping these two terms numerically can't break the answer (both cost 1, and `min` is symmetric), but it will break weighted variants (§9) and operation reconstruction — keep the mapping straight.
5. **Greedy two-pointer "matching" instead of DP.** Matching each `word1` char to the first available equal char in `word2` fails on shifts/duplicates (see test #8: `"abcd"` → `"bcda"`). The three moves exist precisely to explore *all* alignments.
6. **Rolling-row diagonal clobber.** In the 1-row version you must save `dp[j-1]` (the diagonal) *before* overwriting it — that's the `prev[j-1]`/`diag` variable. Also don't forget `curr[0] = i` each row.
7. **Assuming swaps are free.** There is no transposition op in plain Levenshtein: `"ab"` → `"ba"` is **2**, not 1.

### Language-specific gotchas

| Language | Gotcha |
|---|---|
| **Python** | Top-down recursion depth is ~`n + m` (each call shrinks `i + j` by 1) ≈ 1000 at max constraints — right at the default recursion limit; either `sys.setrecursionlimit(...)` or, better, go bottom-up. Also never recurse on `word1[i:]` slices (O(n) copy per call) — pass indices. `@lru_cache(maxsize=None)` if you do memoize. |
| **Java** | For memoization, use a primitive `int[][]` memo filled with `-1` via a per-row `Arrays.fill` (no one-call 2D fill exists), and avoid boxed `Integer` (reference-equality `==` traps, autoboxing overhead). Bottom-up `int[][]` sidesteps both; no overflow risk (max value 500). |
| **C++** | `vector<vector<int>> dp(n + 1, vector<int>(m + 1));` is fine at this size; for cache locality prefer a flat `vector<int>` of size `(n+1)*(m+1)` with manual indexing `dp[i*(m+1) + j]` — double-check that stride arithmetic. No VLAs (`int dp[n+1][m+1]` is not standard C++). |

## 8. Test cases to propose out loud

State these **before or right after coding** — it's cheap signal:

| # | `word1` | `word2` | Expected | What it validates |
|---|---|---|---|---|
| 1 | `horse` | `ros` | 3 | Official example 1 |
| 2 | `intention` | `execution` | 5 | Official example 2 |
| 3 | `""` | `""` | 0 | Both empty |
| 4 | `""` | `abc` | 3 | All-insert path (`dp[0][j]` base row) |
| 5 | `abc` | `""` | 3 | All-delete path (`dp[i][0]` base column) |
| 6 | `a` | `a` | 0 | Free match; kills the `1 + dp[i-1][j-1]` bug (§7 #3) |
| 7 | `ab` | `ba` | 2 | No swap operation — two replaces |
| 8 | `abcd` | `bcda` | 2 | Edit distance ≠ Hamming distance: a "shift" costs delete + insert, and beats 4 replaces |
| 9 | `a` | `aa` | 1 | Repeated characters, off-by-one lengths |

Sanity invariants to assert on any output: `|len1 − len2| ≤ answer ≤ max(len1, len2)`, and symmetry `distance(a, b) == distance(b, a)` — the latter makes a great property-test against the brute-force recursion as an oracle on random short strings.

## 9. Transferable patterns & related problems

**The pattern: two-string prefix-pair grid DP.** State = a pair of prefix lengths; transition vocabulary = `{(i-1,j-1), (i-1,j), (i,j-1)}`. Once you internalize that each move *is* an operation (match/replace/delete/insert), an entire problem family becomes template-shaped:

| Problem | Relationship to Edit Distance |
|---|---|
| LC 1143 Longest Common Subsequence | Same grid; match → `+1`, mismatch → `max(up, left)`. With only insert/delete allowed, edit distance = `n + m − 2·LCS` (keep the LCS aligned for free, delete the other `n−L` and `m−L` characters). |
| LC 583 Delete Operation for Two Strings | Edit distance with replace removed → exactly the LCS formula above. |
| LC 712 Minimum ASCII Delete Sum | Weighted deletes (cost = ASCII) — the recurrence skeleton survives, only weights change; note why the equal-cost direction-swap from §7 #4 now *does* matter. |
| LC 161 One Edit Distance | The banded/k-threshold view (§6): O(n) two-pointer check whether distance ≤ 1. |
| LC 115 Distinct Subsequences | Counting version on the same grid; `min` becomes `+`. |
| LC 10 / LC 44 (Regex / Wildcard) | Same three moves, with `'*'`/`'?'` modifying the diagonal rule. |
| LC 97 Interleaving String | Same `(i, j)` state machine over two sources. |

**Extensions to mention if time allows:** weighted/substitution-matrix edit distance (bioinformatics scoring), Damerau–Levenshtein (adds adjacent transposition as a 4th move), and reconstruction via backtracking (§5.6).

## 10. Interview talk track (full script)

> *"Let me restate: minimum number of single-character inserts, deletes, and replaces to turn word1 into word2, each costing 1, empty strings allowed, return just the count.*
>
> *Brute force is recursion: define f(i, j) as the cost to convert word1's first i characters into word2's first j characters. Look at the last characters of the two prefixes. Equal? Free — recurse on (i−1, j−1). Unequal? One op fixes it three ways: replace and go diagonal, delete word1's char and go up, or insert word2's char and go left — take the min. Bases: empty source needs j inserts, empty target needs i deletes. That's 3^(n+m) worst case because each mismatch branches three ways with depth n+m, but there are only (n+1)(m+1) distinct states — so I'll tabulate.*
>
> *Bottom-up: table of (n+1) by (m+1). Row 0 is 0..m, column 0 is 0..n. Fill row by row with the recurrence I just stated; answer at dp[n][m]. O(n·m) time — about 250k cells at these constraints — O(n·m) space, droppable to O(min(n, m)) with a rolling row, keeping the previous diagonal before overwrite, and I can swap the strings first since edit distance is symmetric — reversing an optimal script converts B back to A.*
>
> *Dry-run horse vs ros: the 'o' and 'r' match on diagonals, final cell 3 — replace h→r, delete r, delete e. Tests: both empty, one empty, identical single char, ab vs ba which is 2 because swaps aren't free, and abcd vs bcda which is 2 — showing this isn't Hamming distance."*

## 11. Say it in 60 seconds

> *"Edit distance is classic two-string DP. Define dp[i][j] as the minimum operations to turn the first i characters of word1 into the first j characters of word2. Base cases: empty source needs j inserts, empty target needs i deletes — dp[i][0] = i, dp[0][j] = j. Transition: compare the last characters, word1[i−1] and word2[j−1]. Equal? Free — dp[i][j] = dp[i−1][j−1]. Otherwise, one edit fixes it: replace costs 1 plus dp[i−1][j−1]; delete word1's char costs 1 plus dp[i−1][j]; insert word2's char costs 1 plus dp[i][j−1] — take the min. Fill the (n+1)×(m+1) table row by row; the answer is dp[n][m]. That's O(n·m) time and space — ~250k cells here — and I can shrink space to O(min(n, m)) with a rolling row, saving the diagonal before overwrite; swapping the strings is safe because edit distance is symmetric. Quick checks: empty strings, identical strings, and ab vs ba, which is 2 since swaps aren't free."*
