# Longest Common Subsequence (LCS) — Complete Interview Lesson

> **Problem (LeetCode 1143).** Given two strings `text1` and `text2`, return the length of their **longest common subsequence**. If there is no common subsequence, return `0`.

---

## 1. Problem Restatement (and what it is *not*)

Restating precisely, out loud, prevents the single most common misread of this problem:

- A **subsequence** of `s` is any string obtained by deleting zero or more characters from `s` **without reordering** the rest. `"ace"` is a subsequence of `"abcde"`; `"aec"` is **not** (order is violated).
- A **common subsequence** of `text1` and `text2` is a string that is a subsequence of *both*.
- We return the **length** of the longest such string, as an `int` — not the string itself.
- The empty string is technically a common subsequence of any two strings, which is why `0` is always achievable and a valid answer.

**Critical disambiguation:** *subsequence ≠ substring*. A substring must be **contiguous**; a subsequence may skip characters. Both words start with "sub" and interviewers deliberately pick this problem to see whether you internalize the difference — the recurrence changes completely (Section 4 vs. Section 8, Mistake #1).

Also: the LCS is generally **not unique** (`"abab"` vs `"baba"` has `"bab"` of length 3, but also e.g. `"aba"`? No — check: `"aba"` in `"baba"` is `a@1, b@?` — no `b` after index 1 — so `"bab"` it is; other inputs have multiple optimal answers). Since we return only the length, non-uniqueness doesn't matter — but know it exists if asked to "find an LCS."

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= len(text1), len(text2) <= 1000` | Two independent sizes, each ≤ ~1000 → product ≤ **10⁶**. This is the classic signature of an **O(n·m) grid DP**. Conversely, enumerating subsequences of a 1000-char string is ~2¹⁰⁰⁰ ≈ 10³⁰¹ candidates — categorically impossible, so exhaustive search is out. |
| `>= 1` (no empty inputs) | You don't *need* to handle `""`, but the base row/column of the DP handles it for free — worth saying out loud. |
| Lowercase English only | Cheap single-character comparisons; duplicates **guaranteed possible** — never assume characters are distinct. |
| Answer ≤ `min(n, m)` ≤ 1000 | The result fits comfortably in any `int` type in any language — **overflow is a non-issue here** (say this in an interview; it shows you checked). |

Two practical consequences of the numbers:

- **Memory:** a full `(n+1) × (m+1)` table is ~10⁶ integers — a few MB, fine. A rolling row shrinks it to a few KB.
- **Recursion depth:** a top-down solution's call chain has depth ≈ `n + m + 1` ≈ **2001**, which **exceeds Python's default recursion limit of 1000**. This bites real candidates (Section 5.1).

---

## 3. Brute Force, With a Worked Trace

**Option A — enumerate:** generate every subsequence of the *shorter* string (there are `2^min(n,m)`), and test each against the longer string with a two-pointer scan in `O(max(n,m))`. Total: `O(2^min(n,m) · max(n,m))`. Correct, hopeless at n = 1000. Conceptually useful only.

**Option B — suffix recursion (the natural bridge to DP):** compare from the front, character by character:

```python
def lcs_brute(i: int, j: int) -> int:
    """LCS length of text1[i:] and text2[j:] -- NO memoization."""
    if i == len(text1) or j == len(text2):
        return 0                                # one side exhausted
    if text1[i] == text2[j]:
        return 1 + lcs_brute(i + 1, j + 1)      # consume the match
    return max(lcs_brute(i + 1, j),             # drop text1[i]
               lcs_brute(i, j + 1))             # drop text2[j]
```

**Worked trace** on `text1 = "abc"`, `text2 = "bca"` (answer should be `2` — `"bc"`):

```text
brute(0,0): 'a' vs 'b' ✗  →  max(brute(1,0), brute(0,1))
├─ brute(1,0): 'b' vs 'b' ✓ → 1 + brute(2,1)
│    └─ brute(2,1): 'c' vs 'c' ✓ → 1 + brute(3,2) = 1        ⇒ 2
└─ brute(0,1): 'a' vs 'c' ✗ → max(brute(1,1), brute(0,2))
     ├─ brute(1,1): 'b' vs 'c' ✗ → max(brute(2,1), brute(1,2))
     │    ├─ brute(2,1) = 1        ← RECOMPUTED — same state as above!
     │    └─ brute(1,2): 'b' vs 'a' ✗ → ... = 0                  ⇒ 1
     └─ brute(0,2): 'a' vs 'a' ✓ → 1 + brute(1,3) = 1            ⇒ 1
⇒ max(2, 1) = 2  ✓
```

Even in this tiny input, `brute(2,1)` runs twice. Each call branches into two and the recursion depth is at most `n + m`, so the call tree is binary of depth `n + m` — up to **O(2^(n+m))** calls. The trace shows *why*: the same `(i, j)` state is re-solved along different paths.

**The insight is now visible:** the recursion has **overlapping subproblems** and each state's answer depends only on the state, not the path taken to reach it. That is exactly the memoization/DP license.

---

## 4. The Core Insight

Define `LCS(i, j)` = length of the LCS of the suffixes `text1[i:]` and `text2[j:]`. Exactly two situations exist:

**Rule 1 — the characters match (`text1[i] == text2[j]`).**
Then it is always safe to consume both together:

```
LCS(i, j) = 1 + LCS(i + 1, j + 1)
```

*Why safe (one sentence):* any common subsequence of the two suffixes can be rewritten to begin with this matched pair — the first character it uses from each side can be swapped to positions `i` and `j` because those two characters are equal and sit at or before the originals — so taking the match never shortens the answer.

**Rule 2 — the characters differ (`text1[i] != text2[j]`).**
The two current characters **cannot both be consumed by the same matched pair** (they're unequal), so in any optimal solution at least one of them is unused:

```
LCS(i, j) = max(LCS(i + 1, j), LCS(i, j + 1))
```

*Why "drop one" is sufficient:* any common subsequence either doesn't use `text1[i]` (→ counted by `LCS(i+1, j)`) or doesn't use `text2[j]` (→ counted by `LCS(i, j+1)`); it cannot use both as a pair.

*Why "drop **both**" (`LCS(i+1, j+1)`) is unnecessary:* a common subsequence of `text1[i+1:]` and `text2[j+1:]` is also a common subsequence of `text1[i+1:]` and `text2[j:]` — dropping a character can only keep or enlarge the option set — so `LCS(i+1, j+1) ≤ LCS(i+1, j)`. It's **dominated**. Interviewers love probing this ("shouldn't you also try skipping both?"); having this one-line dominance argument ready is a strong signal.

Every overlapping `(i, j)` state gets memoized, collapsing the exponential tree to `O(n·m)` distinct states with `O(1)` work each.

---

## 5. Optimal Approach

### 5.0 Be precise about your indexing convention

Two conventions both work — pick one and *do not mix them* (this is the #1 off-by-one source):

| Convention | State means | Current characters |
|---|---|---|
| **Suffix-index** (top-down) | `lcs(i, j)` = LCS of `text1[i:]`, `text2[j:]` | `text1[i]`, `text2[j]` |
| **Prefix-length** (bottom-up) | `dp[i][j]` = LCS of the **first `i`** chars of `text1` and **first `j`** chars of `text2` | `text1[i-1]`, `text2[j-1]` |

Note that `dp[i][j]` stores a **value (a length)** indexed by **prefix lengths**, not character positions. The zero-th row and column mean "empty prefix" ⇒ LCS length `0`.

### 5.1 Top-down (memoized recursion)

```python
import sys
from functools import lru_cache

def longestCommonSubsequence(text1: str, text2: str) -> int:
    n, m = len(text1), len(text2)
    sys.setrecursionlimit(n + m + 10)   # depth reaches n + m + 1 ≈ 2001 > default 1000!

    @lru_cache(maxsize=None)            # memo keyed on the state (i, j)
    def lcs(i: int, j: int) -> int:     # LCS of text1[i:] and text2[j:]
        if i == n or j == m:
            return 0                    # empty suffix -> 0 (a real answer, not "unknown")
        if text1[i] == text2[j]:
            return 1 + lcs(i + 1, j + 1)
        return max(lcs(i + 1, j), lcs(i, j + 1))

    return lcs(0, 0)
```

- Every recursive call increases `i + j` by at least 1, so the call **depth** is `O(n + m)` even though the number of **states** is `O(n·m)` — depth ~2001 at the constraint limits, hence the `setrecursionlimit`.
- `lru_cache` overhead on ~10⁶ states makes this the slowest correct Python variant; fine to present, but say you'd submit the bottom-up version.

### 5.2 Bottom-up 2D — the interview default

```python
def longestCommonSubsequence(text1: str, text2: str) -> int:
    n, m = len(text1), len(text2)
    # dp[i][j] = LCS length of text1[:i] and text2[:j]
    # NOT [[0] * (m + 1)] * (n + 1) -- that creates n+1 references to ONE row!
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):            # i = prefix length of text1
        for j in range(1, m + 1):        # j = prefix length of text2
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1      # match: consume both
            else:
                dp[i][j] = max(dp[i - 1][j],         # drop text1[i-1]
                               dp[i][j - 1])         # drop text2[j-1]
    return dp[n][m]
```

#### Trace — Example 1: `text1 = "abcde"`, `text2 = "ace"`

Rows = prefixes of `"abcde"`, columns = prefixes of `"ace"`. **Bold** cells are matches (`dp = dp[i-1][j-1] + 1`):

|         | j=0 (ε) | j=1 (a) | j=2 (c) | j=3 (e) |
|---------|:-------:|:-------:|:-------:|:-------:|
| i=0 (ε) | 0 | 0 | 0 | 0 |
| i=1 (a) | 0 | **1** | 1 | 1 |
| i=2 (b) | 0 | 1 | 1 | 1 |
| i=3 (c) | 0 | 1 | **2** | 2 |
| i=4 (d) | 0 | 1 | 2 | 2 |
| i=5 (e) | 0 | 1 | 2 | **3** |

Sample cells worked out:
- `dp[1][1]`: `'a' == 'a'` → `dp[0][0] + 1 = 1`
- `dp[3][2]`: `'c' == 'c'` → `dp[2][1] + 1 = 2`
- `dp[3][3]`: `'c' vs 'e'` mismatch → `max(dp[2][3], dp[3][2]) = max(1, 2) = 2`
- `dp[5][3]`: `'e' == 'e'` → `dp[4][2] + 1 = 2 + 1 = **3**` ✓

Visually, the answer is a monotone staircase from `(0,0)` to `(5,3)`; each bold diagonal step is a match contributing `+1`.

#### Trace — Example 2: `text1 = "abc"`, `text2 = "abc"`

|         | ε | a | b | c |
|---------|:-:|:-:|:-:|:-:|
| ε       | 0 | 0 | 0 | 0 |
| a       | 0 | **1** | 1 | 1 |
| b       | 0 | 1 | **2** | 2 |
| c       | 0 | 1 | 2 | **3** |

Identical strings → the diagonal matches at every step, mismatches just inherit `max` of neighbors → `dp[3][3] = 3` ✓.

#### Trace — Example 3: `text1 = "abc"`, `text2 = "def"`

No character ever matches, so every cell is `max` of neighbors starting from a zero border: the **entire table is 0** and `dp[3][3] = 0` ✓. (Note: mismatches *propagate* values — here there are simply none to propagate.)

### 5.3 Space optimization: rolling rows — O(min(n, m))

Row `i` only ever reads row `i-1` and the current row's left neighbor. Also, LCS is **symmetric** (`LCS(a,b) = LCS(b,a)`), so swap first to roll the row over the shorter string.

Two-row version (hard to get wrong):

```python
def longestCommonSubsequence(text1: str, text2: str) -> int:
    if len(text2) > len(text1):          # LCS is symmetric; keep the row short
        text1, text2 = text2, text1
    m = len(text2)
    prev = [0] * (m + 1)                 # dp[i-1][*]
    for i in range(1, len(text1) + 1):
        curr = [0] * (m + 1)             # dp[i][*] — a fresh row every pass
        for j in range(1, m + 1):
            if text1[i - 1] == text2[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev = curr
    return prev[m]
```

One-row version (optimal space; the diagonal needs saving):

```python
def longestCommonSubsequence(text1: str, text2: str) -> int:
    if len(text2) > len(text1):
        text1, text2 = text2, text1
    m = len(text2)
    dp = [0] * (m + 1)                   # dp[j] holds dp[i][j] for the current i
    for i in range(1, len(text1) + 1):
        prev_diag = 0                    # dp[i-1][0] at row start
        for j in range(1, m + 1):
            saved = dp[j]                # dp[i-1][j] BEFORE it is overwritten
            if text1[i - 1] == text2[j - 1]:
                dp[j] = prev_diag + 1    # diagonal from the previous row
            else:
                dp[j] = max(dp[j], dp[j - 1])   # dp[j-1] is already row i
            prev_diag = saved
    return dp[m]
```

The one-row version's bug magnet: `dp[j-1]` has already become the *new* row's value, while `dp[j]` is still the *old* row's — so `saved` must capture `dp[j]` **before** the write. Sanity check (`"ab"` vs `"ab"`): row 1 → `dp = [0,1,1]`; row 2, `j=2`: match, `dp[2] = prev_diag(=1) + 1 = 2` ✓.

### 5.4 Follow-up: reconstruct an actual LCS

Often asked right after you finish the length. Keep the **full 2D table** (this is why the 2D version matters) and backtrack from `dp[n][m]`:

```python
def reconstruct(text1: str, text2: str, dp) -> str:
    i, j, out = len(text1), len(text2), []
    while i > 0 and j > 0:
        if text1[i - 1] == text2[j - 1]:
            out.append(text1[i - 1])       # this pair lies on an optimal path
            i -= 1; j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(out))          # built back-to-front, so reverse
```

On Example 1 this emits `e`, then `c`, then `a` → reversed → `"ace"` ✓ in `O(n + m)`. Anti-pattern: **storing the LCS string itself in each DP cell** — that's `O(n·m)` strings of length up to `O(min(n,m))` each, a memory blow-up to roughly `O(n·m·min(n,m))`. Store lengths; reconstruct by walking.

---

## 6. Complexity Summary

With `n = len(text1)`, `m = len(text2)`:

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Enumerate subsequences | `O(2^min(n,m) · max(n,m))` | `O(min(n,m))` | Never viable beyond tiny inputs |
| Suffix recursion, no memo | `O(2^(n+m))` worst case | `O(n+m)` stack | Binary tree of depth `n+m` |
| Top-down memoized | `O(n·m)` | `O(n·m)` memo + `O(n+m)` stack | Watch Python recursion depth (~2001) |
| Bottom-up 2D | `O(n·m)` | `O(n·m)` | Default; enables backtracking |
| Rolling row(s) | `O(n·m)` | `O(min(n, m))` | Save the diagonal before overwrite |

Concretely: `n = m = 1000` ⇒ 10⁶ cells × O(1) work ⇒ comfortably fast even in Python; ~4 MB for the full `int` table in Java/C++.

---

## 7. How to Narrate It (Full Interview Script)

> "I'll restate: we want the longest sequence obtainable by deleting characters from each string while keeping order, that appears in both, and return its length.
>
> First instinct: compare from the ends. If the current characters match, they're safe to take together — one plus the best of the two remaining suffixes. If they differ, those two characters can't both be part of a final match, so drop one and keep the better option. That recursion is correct but exponential, because the same suffix-pair states get recomputed along different paths — I can show that on a small trace.
>
> So I memoize, formulated over prefix lengths: `dp[i][j]` is the LCS length of the first `i` characters of `text1` and first `j` of `text2`. Row and column zero are empty prefixes, hence zero. On a match: one plus the diagonal. On a mismatch: max of up and left. I only skip one side on a mismatch — skipping both is dominated, since anything achievable by skipping both is already achievable by skipping one. Fill row by row; the answer is `dp[n][m]`.
>
> That's O(n·m) time — about a million cells at these limits — and O(n·m) space, which I can shrink to the shorter string's length with one rolling row plus a saved diagonal value.
>
> Edge cases I'm covering: smallest strings, one string inside the other, heavy duplicates like `'abab'` vs `'baba'` whose answer is `'bab'` — length 3 — disjoint strings giving 0, and swapped argument order since my rolling-row code swaps inputs. Constraints exclude empty strings, but my zero border handles them anyway.
>
> If asked for the actual subsequence, I backtrack from `dp[n][m]`: on a match, record the character and move diagonally; otherwise step toward the larger of up and left, then reverse."

---

## 8. Common Mistakes

1. **Solving "Longest Common *Substring*" by accident.** Contiguous variant resets to `0` on a mismatch; LCS takes `max(up, left)`. If your mismatch branch writes `0`, you've silently changed problems.
2. **Mixing index conventions.** In the bottom-up table, cell `(i, j)` is about prefixes of *lengths* `i, j`, so the entering characters are `text1[i-1]` / `text2[j-1]`. Writing `text1[i]` there is an off-by-one that still passes the trivial examples and fails asymmetric ones. Same cell layout, different convention in the top-down (`lcs(i, j)` = suffixes from `i, j`) — don't blend the two in one solution.
3. **Taking `diagonal + 1` on a mismatch.** The `+1` is only licensed by an actual character match. On mismatch, `dp[i-1][j-1] + 1` can *overcount* (e.g., `"ab"` vs `"ba"` would wrongly give 2).
4. **Python row aliasing:** `dp = [[0] * (m + 1)] * (n + 1)` creates `n+1` references to the *same* list — one write corrupts the table. Use a comprehension.
5. **Losing the diagonal in the one-row optimization.** You must save the old `dp[j]` into a temp *before* writing `dp[j]`, because `dp[j-1]` (new row) and `dp[j]` (old row) coexist only for that instant.
6. **Python recursion depth.** Top-down depth reaches `n + m + 1 ≈ 2001` > default limit 1000 ⇒ `RecursionError` at full constraints. Either raise the limit or go bottom-up.
7. **Trying to be greedy.** "Match each character of `text1` to its earliest available occurrence in `text2`" fails: `text1 = "abc"`, `text2 = "bca"` — greedy grabs `'a'@2` and strands `'b'` and `'c'` (length 1), while the optimal `"bc"` has length 2. Local earliest ≠ globally longest.
8. **Worrying about duplicates.** Repeated characters need **no special handling** — the DP counts by position, and identical characters naturally pair up across positions (Section 10, test #7–8). Do *not* deduplicate.
9. **Assuming the LCS is unique or returning the wrong artifact.** Many optimal subsequences may exist; the problem asks for the length. And don't store strings in DP cells (Section 5.4).

---

## 9. Language-Specific Gotchas (Java / C++)

| Language | Gotcha | Fix |
|---|---|---|
| Java | A memoized `int[][] memo` defaults to `0`, but `0` is a *valid* LCS value — the memo "remembers" answers that were never computed. | Fill with `-1` first: `for (int[] row : memo) Arrays.fill(row, -1);` (bottom rows/columns handled by explicit base-case checks). |
| Java | `HashMap<List<Integer>,Integer>`-style memo with boxed keys, or deep recursion. | Prefer bottom-up `int[][]` (`int` is safe — answers ≤ 1000, no overflow; autoboxing would just burn memory/time). |
| C++ | `int dp[1001][1001];` declared locally ≈ 4 MB on the call stack → stack-overflow risk on many judges. | Use `std::vector<std::vector<int>> dp(n+1, std::vector<int>(m+1, 0));` or declare the array `static`/global. |
| C++ | `memset(memo, -1, sizeof memo)` *does* set ints to −1 (byte pattern `0xFF`), but `memset(memo, 1, ...)` does **not** set ints to 1. | `std::fill` or the vector constructor is unambiguous. |

---

## 10. Test Cases to Propose Out Loud

Before coding, say: *"Let me pin down a few tests — smallest inputs, swapped arguments, heavy duplicates, and disjoint strings. Constraints say non-empty, but my zero border handles empties for free."*

| # | `text1` | `text2` | Expected | What it checks |
|---|---|---|---|---|
| 1 | `"abcde"` | `"ace"` | `3` | Official; sparse matches (`a`, `c`, `e`) |
| 2 | `"abc"` | `"abc"` | `3` | Official; identical strings, pure diagonal |
| 3 | `"abc"` | `"def"` | `0` | Official; nothing in common |
| 4 | `"a"` | `"a"` | `1` | Smallest match |
| 5 | `"a"` | `"b"` | `0` | Smallest mismatch |
| 6 | `"ace"` | `"abcde"` | `3` | **Swapped arguments** — catches convention/off-by-one bugs that pass examples 1–3 |
| 7 | `"abab"` | `"baba"` | `3` | Heavy duplicates; answer is `"bab"` — a greedy/miscounted answer often says 2 |
| 8 | `"aaaa"` | `"aa"` | `2` | All-equal characters; counts *positions*, not distinct letters |
| 9 | 1000 × `'a'` | 999 × `'a'` | `999` | Max-size performance / recursion-depth sanity |

After coding, mentally (or out loud) re-run #1, #4, #5, #7 against your code.

---

## 11. Transferable Patterns and Related Problems

**The pattern:** *two-sequence DP.* State = a pair of consumed prefixes `(i, j)`; base = one prefix empty; transition = decide what to do with the two current characters (consume both / consume one). The same skeleton with a different recurrence solves a whole family of interview problems:

| Problem | Relationship to LCS |
|---|---|
| **583. Delete Operation for Two Strings** | Answer = `n + m − 2·LCS` |
| **1092. Shortest Common Supersequence** | Length = `n + m − LCS`; reconstruct by walking the same table |
| **516. Longest Palindromic Subsequence** | `LCS(s, reverse(s))` (a direct interval-DP also works) |
| **1035. Uncrossed Lines** | Literally LCS on integer arrays (drawn lines must not cross) |
| **718. Maximum Length of Repeated Subarray** | LCS where matches must be **contiguous** (substring semantics; mismatch → `0`) |
| **72. Edit Distance** | Same `(i, j)` grid; match/diagonal becomes a 3-way cost min |
| **97. Interleaving String** | Same state space, boolean feasibility instead of max |
| **115. Distinct Subsequences** | Same grid, *counting* occurrences instead of maximizing |

**Meta-lessons to transfer:** (1) when two independent dimensions are each ≤ a few thousand, think `(i, j)` grid DP; (2) a recursion whose state is `(i, j)` and whose answer doesn't depend on the path is memoizable; (3) rolling rows save a dimension whenever the recurrence looks only one row back — but guard the diagonal.

---

## 12. Beyond the Interview: Complexity Landscape (optional spice)

Not needed to pass, but useful if the interviewer pushes on optimality — each claim justified in one sentence:

| Result | Claim | Why |
|---|---|---|
| Conditional lower bound (Bringmann–Künnemann, 2015) | No `O(n^(2−ε))`-time LCS algorithm exists unless **SETH** fails | Their reduction encodes assignments of SAT formulas as alignment choices in two strings, so a truly subquadratic LCS would give a subexponential SAT algorithm. |
| Four Russians (Masek–Paterson, 1980) | `O(n·m / log n)` for a constant-size alphabet | The DP is done in blocks of ~`log n` rows/columns whose transitions are precomputed into lookup tables, so each block costs O(1). |
| Bit-parallel LCS (Allison–Dix, 1986; Crochemore et al., 2001) | `O(n·m / w)` machine-word operations | Each DP row is packed into `w`-bit machine words and a whole word of cells is advanced with O(1) bitwise ops. |
| Hunt–Szymanski (1977) | `O((r + n) log n)`, where `r` = number of matching index pairs | It sweeps the `r` matching pairs in order and maintains best-so-far tails in a balanced tree — great when matches are sparse, poor for a 26-letter alphabet where `r` ≈ `n·m/26`. |
| Multi-string generalization (Maier, 1978) | LCS over `k` strings is NP-complete when `k` is unbounded | A candidate subsequence is an efficiently checkable certificate, and NP-hardness follows from Maier's polynomial-time reduction from a classical NP-complete problem. |

---

## 13. Say It in 60 Seconds

> "Longest Common Subsequence is two-string dynamic programming. Compare the current characters of each string: if they match, they're safe to take together — one plus the best of the two remaining suffixes. If they differ, the two characters can't both be part of a final match, so drop one and keep the better of the two options — skipping both is dominated, so two branches suffice. Naive recursion re-solves the same suffix pairs exponentially, so I memoize: `dp[i][j]` is the LCS length of the first `i` and first `j` characters, with empty prefixes as the zero row and column. Match means one plus the diagonal; mismatch means max of up and left. The answer sits in the bottom-right corner. Time and space are n times m — about a million cells at these limits — and I can cut space to the shorter string's length with one rolling row plus a saved diagonal. If asked, I backtrack from the corner to recover the actual subsequence."
