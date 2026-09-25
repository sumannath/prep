# Interleaving String — Complete Interview Lesson

| Quick facts | |
|---|---|
| LeetCode | 97. Interleaving String (Medium) |
| Pattern | 2-D prefix DP ("merge reachability" on a lattice) |
| Brute force | Exponential recursion → memoize on `(i, j)` |
| Optimal | `O(n·m)` time, `O(min(n, m))` space (follow-up) |
| #1 trap | Greedy two-pointer tie-breaking (provably unfixable — see §4) |
| Mandatory guard | `len(s1) + len(s2) == len(s3)` |

Throughout: **`n = len(s1)`, `m = len(s2)`**.

---

## 1. Problem, restated in your own words

Say this out loud in an interview to prove you understood it:

> "s3 is an interleaving of s1 and s2 if I can build s3 by repeatedly taking the **next unused character from the front of s1 or the front of s2**, using every character exactly once, and never reordering either string internally."

Equivalently: **color every position of s3 either "from s1" (red) or "from s2" (blue)** such that reading the red positions left-to-right reproduces s1 exactly, and reading the blue positions reproduces s2 exactly.

A note on the formal "substring blocks" definition in the statement: once you allow empty blocks, it collapses to the order-preserving-merge view above (group consecutive same-source characters of s3 into runs; the runs alternate, so the piece counts automatically differ by at most 1). Every accepted solution implements the merge view.

Two things the definition implies, and candidates routinely get wrong:

- **Order within each source is preserved** — this is not "do the multisets match?" (§8 has a counterexample).
- **Every character is used exactly once** — no skipping, no reuse. The length check enforces this globally.

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `0 <= len(s1), len(s2) <= 100`, `len(s3) <= 200` | Tiny. An `O(n·m) ≈ 10⁴` DP is instant. Recursion depth ≤ `n + m + 1 ≤ 201`, safely under Python's default recursion limit of 1000. |
| `len(s3) <= 200` and `s3` is the merge target | Strong hint: **the s3 index is always derivable** as `i + j`. If `n + m != len(s3)`, answer is `False` immediately — no DP needed. |
| Lowercase English letters only | Duplicates are **guaranteed to occur** at these lengths. Any algorithm that branches blindly on equal characters will blow up exponentially (§3). No hashing/bitmask tricks needed for such a tiny alphabet. |
| Empty strings allowed | All three empty → `True`. One source empty → `s3` must equal the other exactly. Your code must survive `n = 0` or `m = 0` without special-casing bugs. |

---

## 3. Brute force: branch on every character (worked trace)

The natural first idea: walk through s3 with two pointers `i` (into s1) and `j` (into s2). At each step, the next s3 character — which is **`s3[i + j]`**, because `i + j` characters have been consumed so far — must come from s1 or from s2. If it matches both, try both.

```python
def is_interleave_bf(s1: str, s2: str, s3: str) -> bool:
    if len(s1) + len(s2) != len(s3):
        return False

    def solve(i: int, j: int) -> bool:        # i, j = characters CONSUMED so far
        if i == len(s1) and j == len(s2):
            return True                        # s3 exhausted too (lengths pre-checked)
        k = i + j                              # next s3 index — derived, never stored
        return (i < len(s1) and s1[i] == s3[k] and solve(i + 1, j)) or \
               (j < len(s2) and s2[j] == s3[k] and solve(i, j + 1))

    return solve(0, 0)
```

### Worked trace (including a dead end and a backtrack)

Take `s1 = "aa"`, `s2 = "ab"`, `s3 = "aaba"` (a case we'll reuse in §4):

```
solve(0,0)  k=0, s3[0]='a'  → both sources match; try s1 first
└─ solve(1,0)  k=1, s3[1]='a' → s1[1]='a' matches, try s1
   └─ solve(2,0)  k=2, s3[2]='b'
      s1 exhausted; s2[0]='a' ≠ 'b'  → ✗ DEAD END, backtrack
   → resume at (1,0): now try s2 instead
   └─ solve(1,1)  k=2, s3[2]='b' → s1[1]='a' ✗, s2[1]='b' ✓
      └─ solve(1,2)  k=3, s3[3]='a' → s1[1]='a' ✓
         └─ solve(2,2)  base case → ✅ True
```

Two things to observe:

1. The greedy-looking path `s1, s1, …` walks into a dead end and must **backtrack** — branching is unavoidable, not an optimization.
2. **Why it's exponential:** whenever `s1[i] == s2[j] == s3[k]`, both branches are live. In the worst case (`s1 = s2 = "a" * 100`, `s3 = "a" * 200`), every call branches twice until a string runs out, and the number of root-to-leaf consumption sequences equals the number of ways to interleave — i.e., the number of ways to choose which `n` of the `n + m` steps consume s1, which is `C(n+m, n) ≈ 9 × 10⁵⁸` for `n = m = 100` — and each leaf requires its own root-to-leaf path of calls. So plain recursion is `O(2^(n+m))` worst-case time with only `O(n + m)` stack.

---

## 4. The core insight

Three observations collapse the exponential tree into a table:

1. **The state is just `(i, j)`.** After consuming `i` chars of s1 and `j` chars of s2, you have consumed **exactly** the first `i + j` characters of s3 — no other history matters. The subproblem "can `s3[i+j:]` be formed from `s1[i:]` and `s2[j:]`?" is fully determined by `(i, j)`.
2. **There are only `(n+1)(m+1)` such states** — at most 101 × 101 = 10,201 here. The exponential tree visits the same states over and over (see the tree in §3 at scale); memoization/DP pays each state once.
3. **On ties you must keep both options alive.** There is *no* fixed tie-breaking rule that works:
   - "Prefer s1" fails on `s1="aa", s2="ab", s3="aaba"` (greedy takes both a's from s1, then dies needing `b` — but `a(s1), a(s2), b(s2), a(s1)` works).
   - "Prefer s2" fails on the mirror `s1="ab", s2="aa", s3="aaba"` for the symmetric reason.

   So the DP transition is an **OR of two moves**, not a single greedy step. This "grid reachability" view is the whole problem: `dp[i][j]` is true iff cell `(i, j)` is reachable from `(0, 0)` moving only down (take from s1) or right (take from s2), spelling s3 as you go.

---

## 5. The optimal approach: prefix-pair DP

### 5.1 State, recurrence, base cases

> **Indexing discipline (read this twice):** in `dp[i][j]`, `i` and `j` are **counts of consumed characters (prefix lengths)**, *not* indices. The character that is the `i`-th consumed from s1 is `s1[i-1]` (0-indexed array). The s3 index is always **derived**: `k = i + j - 1` for "last character placed" (bottom-up) or `k = i + j` for "next character to place" (top-down). Mixing these up is the single most common bug.

**Definition.** `dp[i][j] = True` ⇔ `s3[:i+j]` is an interleaving (order-preserving merge) of `s1[:i]` and `s2[:j]`.

**Recurrence.** The last character of `s3[:i+j]`, namely `s3[i+j-1]`, was taken from the end of one of the two prefixes:

```
dp[i][j] = (dp[i-1][j] and s1[i-1] == s3[i+j-1])    # last char came from s1
        or (dp[i][j-1] and s2[j-1] == s3[i+j-1])    # last char came from s2
```

**Base cases.**
- `dp[0][0] = True` (both empty, s3 prefix empty — consistent because of the length guard).
- `dp[i][0] = True` ⇔ `s1[:i] == s3[:i]` (only s1 used).
- `dp[0][j] = True` ⇔ `s2[:j] == s3[:j]` (only s2 used).

**Answer:** `dp[n][m]`.

Note there is **no diagonal term** `dp[i-1][j-1]` — one s3 character comes from exactly one source.

### 5.2 Implementation 1: top-down memoization (three lines from brute force)

```python
from functools import lru_cache

def is_interleave_memo(s1: str, s2: str, s3: str) -> bool:
    if len(s1) + len(s2) != len(s3):
        return False

    @lru_cache(maxsize=None)               # key = (i, j): ≤ (n+1)(m+1) entries
    def solve(i: int, j: int) -> bool:
        if i == len(s1) and j == len(s2):
            return True
        k = i + j
        if i < len(s1) and s1[i] == s3[k] and solve(i + 1, j):
            return True
        if j < len(s2) and s2[j] == s3[k] and solve(i, j + 1):
            return True
        return False

    return solve(0, 0)
```

`O(n·m)` states, `O(1)` work each. Fine for these constraints (depth ≤ ~201). Don't key the cache by string slices — `O(n)` per key build destroys the complexity.

### 5.3 Implementation 2: bottom-up table (the version to write in an interview)

```python
def is_interleave(s1: str, s2: str, s3: str) -> bool:
    n, m = len(s1), len(s2)
    if n + m != len(s3):                    # mandatory guard, before any allocation
        return False

    # dp[i][j]: s3[:i+j] is an interleaving of s1[:i] and s2[:j]
    dp = [[False] * (m + 1) for _ in range(n + 1)]   # NOT [[...]*(m+1)]*(n+1)!
    dp[0][0] = True

    for i in range(1, n + 1):               # column j = 0: only s1 consumed
        dp[i][0] = dp[i - 1][0] and s1[i - 1] == s3[i - 1]
    for j in range(1, m + 1):               # row i = 0: only s2 consumed
        dp[0][j] = dp[0][j - 1] and s2[j - 1] == s3[j - 1]

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            k = i + j - 1                   # s3 index of the LAST char placed
            dp[i][j] = (dp[i - 1][j] and s1[i - 1] == s3[k]) or \
                       (dp[i][j - 1] and s2[j - 1] == s3[k])
    return dp[n][m]
```

Note what this handles automatically, with no special cases: duplicates (ties become OR), empty `s1` or `s2` (the base row/column), and length mismatches (the guard).

### 5.4 Trace on Example 1 — `s1="aabcc"`, `s2="dbbca"`, `s3="aadbbcbcac"` → `True`

`✱` marks one winning path of True cells from `(0,0)` to `(5,5)`; each step to an adjacent `✱` spells the next character of s3.

| dp | j=0 "" | j=1 "d" | j=2 "db" | j=3 "dbb" | j=4 "dbbc" | j=5 "dbbca" |
|---|---|---|---|---|---|---|
| **i=0 ""** | ✱ T | F | F | F | F | F |
| **i=1 "a"** | ✱ T | F | F | F | F | F |
| **i=2 "aa"** | ✱ T | ✱ T | ✱ T | ✱ T | ✱ T | F |
| **i=3 "aab"** | F | T | T | F | ✱ T | F |
| **i=4 "aabc"** | F | F | T | T | ✱ T | ✱ T |
| **i=5 "aabcc"** | F | F | F | T | F | ✱ T |

The `✱` path reads: down, down (`"aa"` from s1), right ×4 (`"dbbc"` from s2), down, down (`"bc"` from s1), right (`"a"` from s2), down (`"c"` from s1) — exactly the decomposition in the official explanation: `"aa" + "dbbc" + "bc" + "a" + "c"`.

Also notice: the table contains **more** True cells than the winning path (`dp[3][1]`, `dp[4][2]`, …). Multiple partial interleavings are alive simultaneously — that is precisely the information a greedy pass throws away.

### 5.5 Trace on Example 2 — `s3="aadbbbaccc"` → `False`

| dp | j=0 "" | j=1 "d" | j=2 "db" | j=3 "dbb" | j=4 "dbbc" | j=5 "dbbca" |
|---|---|---|---|---|---|---|
| **i=0 ""** | T | F | F | F | F | F |
| **i=1 "a"** | T | F | F | F | F | F |
| **i=2 "aa"** | T | T | T | T | F | F |
| **i=3 "aab"** | F | T | T | T | F | F |
| **i=4 "aabc"** | F | F | F | F | F | F |
| **i=5 "aabcc"** | F | F | F | F | F | F |

The True region spreads for two anti-diagonals and then dies at one specific place: every surviving path funnels into cell `(3, 3)` (i.e., `"aab"` + `"dbb"` merged = `"aadbbb"` = `s3[:6]`). The next needed character is `s3[6] = 'a'`, but the next unused character of s1 is `'c'` and of s2 is `'c'`. Both moves fail; nothing to the lower-right ever becomes True. This matches the problem's own explanation, and it's a nice interview observation: the strings agree on a long *prefix* — a prefix-comparison heuristic would be fooled — but the failure is structural.

**Example 3** (`"",""` ,`""`): the guard passes, `dp[0][0] = True` is returned directly.

### 5.6 Correctness in two sentences

By induction on `i + j`: in any valid merge of `s1[:i]` and `s2[:j]`, the last character `s3[i+j-1]` is either `s1[i-1]` or `s2[j-1]`, and deleting it leaves a valid merge of the shorter prefixes — so the disjunction is *necessary*. Conversely, either disjunct being true extends a valid shorter merge by one correctly matched character — so it's *sufficient*.

---

## 6. Follow-up: `O(len(s2))` extra space

### 6.1 Rolling one row

Row `i` of the table depends only on row `i − 1` (look at the recurrence: upper neighbor and left neighbor). So keep **one row of length `m + 1`** and overwrite it left-to-right. To hit `O(min(n, m))`, swap the strings first — interleaving is symmetric in s1 and s2.

```python
def is_interleave_1d(s1: str, s2: str, s3: str) -> bool:
    n, m = len(s1), len(s2)
    if n + m != len(s3):
        return False
    if m > n:                               # optional: row over the SHORTER string
        s1, s2, n, m = s2, s1, m, n

    dp = [False] * (m + 1)
    dp[0] = True
    for j in range(1, m + 1):               # row i = 0: s2-prefix must equal s3-prefix
        dp[j] = dp[j - 1] and s2[j - 1] == s3[j - 1]

    for i in range(1, n + 1):
        dp[0] = dp[0] and s1[i - 1] == s3[i - 1]      # column j = 0 first!
        for j in range(1, m + 1):
            k = i + j - 1
            # before this write: dp[j] == dp[i-1][j] (old row),
            #                    dp[j-1] == dp[i][j-1] (already-updated new row)
            dp[j] = (dp[j] and s1[i - 1] == s3[k]) or \
                    (dp[j - 1] and s2[j - 1] == s3[k])
    return dp[m]
```

**Why left-to-right is mandatory here:** when you compute cell `j` you need the *new* row's `dp[j-1]` (left neighbor, already updated) *and* the *old* row's `dp[j]` (upper neighbor, not yet overwritten). Scanning left→right gives you exactly that. This is the **opposite** direction from the classic 0/1-knapsack 1-D trick (which scans right-to-left because it needs the *old* left neighbor) — a subtlety worth naming out loud; mixing the two up is a classic bug that silently produces wrong answers rather than crashes.

In this formulation one row is the natural minimum, because every cell genuinely reads its upper neighbor — the whole previous row carries information.

### 6.2 Row-by-row walkthrough on Example 1

The 1-D array after each pass (`i` = s1 chars consumed; each row equals the corresponding 2-D row):

| after processing | s1 char used | `dp` array (j = 0…5) |
|---|---|---|
| init (i=0) | — | `[T, F, F, F, F, F]` |
| i=1 | `a` | `[T, F, F, F, F, F]` |
| i=2 | `a` | `[T, T, T, T, T, F]` |
| i=3 | `b` | `[F, T, T, F, T, F]` |
| i=4 | `c` | `[F, F, T, T, T, T]` |
| i=5 | `c` | `[F, F, F, T, F, T]` |

Final `dp[5] = True`. Note how `dp[0]` flips to `False` at `i=3` (prefix `"aab"` ≠ `"aad"`) and that this poisoned value correctly propagates rightward — a common bug is forgetting to update column 0 inside the loop.

---

## 7. Complexity summary

Let `n = len(s1)`, `m = len(s2)`.

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Greedy two pointers | `O(n + m)` | `O(1)` | **Incorrect** — fails on ties (§4) |
| Plain recursion | `O(2^(n+m))` worst case | `O(n + m)` stack | `Θ(C(n+m, n))` leaves when chars tie heavily |
| Recursion + memo on `(i, j)` | `O(n·m)` | `O(n·m)` memo + `O(n+m)` stack | easiest correct version |
| Bottom-up 2-D | `O(n·m)` | `O(n·m)` | main solution; ≤ 101×101 cells |
| Bottom-up 1-D (follow-up) | `O(n·m)` | `O(m)`, or `O(min(n, m))` with the swap | what the follow-up asks for |

Reading the input is `Θ(n + m)` regardless. Indices fit in 32-bit trivially (`i + j ≤ 200`), so overflow is a non-issue for this problem.

---

## 8. Common mistakes, edge cases, and language gotchas

| # | Mistake | Why it bites / the fix |
|---|---|---|
| 1 | Skipping `n + m == len(s3)` | Logic breaks *and* `s3[i+j]` can index out of range. Check first, return `False`. |
| 2 | Counts vs. indices: writing `s1[i]` / `k = i + j` in the bottom-up loop | Bottom-up needs `s1[i-1]` and `k = i + j - 1`. Test the 2×2 case by hand. |
| 3 | Looping `range(n)` instead of `range(n + 1)` for base row/column | `dp[n][m]` and the "only one source" row/column never get filled. |
| 4 | A greedy tie-break instead of the OR | Provably unfixable — each fixed preference fails on its mirror instance (§4). |
| 5 | Multiset/anagram shortcut | Order matters: `s1="ab", s2="ba", s3="aabb"` has matching character counts but is **False** (s2 = `"ba"` would need a `b` before an `a` in s3, impossible here). |
| 6 | Python: `[[False]*(m+1)]*(n+1)` | All rows alias one list — writes leak across rows. Use a comprehension. |
| 7 | 1-D: updating `dp[j]` before reading it, or skipping the `dp[0]` column update | Destroys the "upper neighbor" value / breaks prefix propagation. Update `dp[0]` first, then sweep left→right. |
| 8 | `s1[:i] == s3[:i]`-style slice comparisons per cell | Each is `O(n)` → polynomial blowup. Compare single characters only. |
| 9 | Diagonal term `dp[i-1][j-1]` | One s3 char comes from exactly one source; there is no diagonal move. |

**Language-specific gotchas (short version):**

| Language | Gotcha |
|---|---|
| Python | Recursion depth ≤ ~201 is fine under the default limit (1000), but know `sys.setrecursionlimit` for scaled-up variants; `lru_cache` on `(i, j)` tuples is cheap — never on strings. |
| Java | `boolean[][] dp = new boolean[n+1][m+1]` is auto-initialized to `false` (no fill loop). If memoizing, avoid `HashMap` keyed by strings and avoid auto-unboxing `Boolean`/`Integer` from a map (`null` → NPE); `Integer` identity comparison with `==` is unreliable for values > 127 — and `i, j` go up to 100–200 here, so that's a live trap. `s1.charAt(i) == s3.charAt(k)` with `==` is fine (chars, no boxing). |
| C++ | `std::vector<bool>` is the bit-packed specialization with proxy references — correct but awkward/slow; prefer `vector<vector<char>>` or a flat array. Compare loop variables against `(int)s.size()` to dodge signed/unsigned warnings; pass strings by `const&`. |

---

## 9. Test cases to propose out loud

Say these before coding (they shape the design), then re-run them after:

| # | s1 | s2 | s3 | Expected | What it exercises |
|---|---|---|---|---|---|
| 1 | `"aabcc"` | `"dbbca"` | `"aadbbcbcac"` | `True` | Official Ex. 1 — happy path with repeated chars |
| 2 | `"aabcc"` | `"dbbca"` | `"aadbbbaccc"` | `False` | Official Ex. 2 — structural failure after a long matching prefix |
| 3 | `""` | `""` | `""` | `True` | Official Ex. 3 — all-empty base case |
| 4 | `""` | `"a"` | `"a"` / `""` | `True` / `False` | One source empty; length guard |
| 5 | `"ab"` | `"ba"` | `"aabb"` | `False` | Multiset matches but order impossible (kills the anagram shortcut) |
| 6 | `"aa"` | `"ab"` | `"aaba"` | `True` | Greedy tie-break trap — both orders of consumption exist, only one survives |
| 7 | `"a" * 100` | `"a" * 100` | `"a" * 200` | `True` | Max-tie stress: exponential brute force, instant DP |
| 8 | `"ab"` | `"cd"` | `"acbd"` | `True` | Strict alternation s1, s2, s1, s2 |
| 9 | `"abc"` | `""` | `"abd"` | `False` | Late mismatch, not a prefix failure |

Minimum set to state verbally if time is short: #3, #4, #5, #6 — they cover empties, the guard, the order-vs-multiset distinction, and the branching requirement.

---

## 10. Transferable patterns and related problems

**Patterns this problem teaches:**

1. **Prefix-pair state space.** Whenever a problem is about building one string from two, the state is `(i, j)` = prefixes consumed; a derived third index (`k = i + j`) costs nothing. Same skeleton as Edit Distance, LCS, Distinct Subsequences.
2. **Decision DP as an OR of moves.** `dp[i][j] = move₁ or move₂`, with base-case short-circuiting — contrast with min/max DPs; correctness hinges on *keeping all live options* (the anti-greedy lesson).
3. **2-D → 1-D rolling array** whenever row `i` reads only row `i − 1` plus the current row's left neighbor — transfer directly to Edit Distance, LCS, knapsack variants (mind the sweep *direction* — §6.1).
4. **Lattice reachability view.** True cells form monotone (down/right) paths from `(0,0)` to `(n,m)`; useful for debugging by printing the table.

**Related problems:**

| Problem | Relationship |
|---|---|
| LC 115 Distinct Subsequences | Same `(i, j)` table; counts matches instead of a boolean OR |
| LC 72 Edit Distance | Canonical prefix-pair DP; identical 1-D rolling optimization |
| LC 1143 Longest Common Subsequence | Same grid/lattice mental model |
| LC 87 Scramble String | String-recomposition DP, but 3-D state (length + two offsets) |
| LC 10 / LC 44 (Regex Matching / Wildcard) | Decision DP with OR-of-transitions over two index pairs |

---

## 11. Full interview talk track (script)

**Phase 1 — Clarify (≈30s).** "Let me restate: s3 is an interleaving of s1 and s2 if I can generate it by repeatedly taking the front character of either string, in order, using everything exactly once. Equivalently, I two-color s3's positions red/blue so the red ones read back as s1 and the blue ones as s2. Two clarifications I'll assume: empty strings are allowed, and order within each source matters — I'll keep in mind that matching character *counts* isn't sufficient."

**Phase 2 — Brute force and its blow-up (≈60s).** "First idea: walk s3 with pointers `i` into s1 and `j` into s2. The next s3 character is `s3[i+j]`; it must match `s1[i]` or `s2[j]`, and if it matches both I branch. That's exponential: with all-'a' strings the number of leaf paths equals the number of ways to choose which steps take from s1 — `C(n+m, n)`, about 10⁵⁸ at n = m = 100. But the key observation: what happens from `(i, j)` doesn't depend on how I got there — and there are only `(n+1)(m+1)` distinct `(i, j)` pairs. That's the memoization/DP signal."

**Phase 3 — Formulate and code (≈2min).** "Define `dp[i][j]`: the first `i+j` characters of s3 are an interleaving of `s1[:i]` and `s2[:j]`. The last character placed, `s3[i+j-1]`, came from `s1[i-1]` or `s2[j-1]`, so dp is the OR of the upper cell matched against s1 and the left cell matched against s2. Base: `dp[0][0]` true; row 0 and column 0 are plain prefix matches. Answer `dp[n][m]`, after the mandatory `n+m == len(s3)` guard, which also handles the empty-string cases for free." *(Write the bottom-up version from §5.3.)*

**Phase 4 — Verify (≈60s).** "Dry-run Example 1: the True path goes down-down for `'aa'`, right-right-right-right for `'dbbc'`, down-down for `'bc'`, right for `'a'`, down for `'c'` — exactly the official decomposition, so `dp[5][5]` is True. Example 2: all True paths funnel into cell (3,3) having built `'aadbbb'`; s3 then demands `'a'` while both sources offer `'c'` — everything downstream stays False. Also note the table keeps *multiple* partial interleavings alive; that's what a greedy pass loses, and there's no fixed tie-break that ever works — each preference fails on a mirror instance."

**Phase 5 — Complexity and the follow-up (≈60s).** "Time `O(n·m)`, space `O(n·m)`. For the follow-up: row `i` only reads row `i−1` and the current row's left neighbor, so I keep one array of length `m+1`, update column 0 first, then sweep left to right — old `dp[j]` is the upper neighbor, fresh `dp[j-1]` is the left neighbor. Swapping so the row runs over the shorter string gives `O(min(n, m))`."

**Phase 6 — Edge cases (≈30s).** "All three empty → True; one source empty → s3 must equal the other; length mismatch → immediate False; heavy duplicates → the stress case that kills brute force."

---

## 12. Say it in 60 seconds

> "Interleaving means s3 is an order-preserving merge of s1 and s2 — every character of s3 comes from exactly one of them, and each string's characters keep their relative order. First guard: the lengths must add up, otherwise it's instantly false. The core observation: if I've taken `i` characters from s1 and `j` from s2, I've covered exactly the first `i+j` characters of s3 — so the only state that matters is the pair `(i, j)`, a grid of about ten thousand cells. `dp[i][j]` is true when that prefix of s3 is buildable. Its last character came from either s1 or s2, so `dp[i][j]` equals the upper cell with a match on s1, or the left cell with a match on s2. When both sources match, I must keep *both* options alive — greedy tie-breaking provably fails on mirror cases. That's `O(n·m)` time; and since each row only needs the previous row, I roll a single 1-D array over the shorter string — `O(min(n, m))` space, which answers the follow-up."
