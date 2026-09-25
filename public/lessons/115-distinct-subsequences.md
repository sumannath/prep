# Distinct Subsequences (LeetCode 115) — Complete Lesson

**TL;DR:** Count the number of ways to embed `t` inside `s` as a subsequence. Brute force pick-or-skip recursion is exponential; the fix is a two-string counting DP over `(m+1)×(n+1)` prefix states, **O(m·n)** time, compressible to **O(n)** space with a right-to-left inner sweep.

---

## 1. Restating the problem (and what "distinct" actually means)

Given a source string `s` and target string `t`, count the number of ways to choose indices

```
i1 < i2 < ... < ik    such that    s[i1] s[i2] ... s[ik] == t
```

Each valid **set of indices** is one "way." Precision matters here, because the phrase "distinct subsequences" is misleading:

- We are **not** counting distinct strings — every valid way spells exactly `t`.
- We **are** counting distinct *embeddings* (index selections) of `t` into `s`.
- Contrast with LC 940 ("Distinct Subsequences II"), where "distinct" means deduplicating strings that are spelled the same way. Different problem, same name — a classic interview trap.

Tiny example: `s = "bba"`, `t = "ba"`. The embeddings are indices `(0,2)` and `(1,2)`. Both spell `"ba"`, and the answer is **2**.

So the real question is: *how many increasing index sequences spell `t`?*

---

## 2. Decoding the constraints

| Constraint | What it really says | Design consequence |
|---|---|---|
| `1 <= s.length, t.length <= 1000` | Both non-empty; moderate size | `O(m·n) ≈ 10^6` DP cells is trivially fast; `O(2^m) ≈ 2^1000` brute force is impossible. Recursion depth can reach ~1000 → relevant for Python top-down (see §7). |
| English letters only | Tiny fixed alphabet | Plain character equality; optional micro-opt: skip whole rows whose `s` character doesn't appear in `t`. |
| Answer fits in 32-bit signed int | The **test data is curated** so the final count ≤ 2,147,483,647 | Python's big ints make this moot. In Java/C++ it's a data promise about the *final* answer only — intermediate cells can still overflow (justified in §7). E.g., `s = "a"*1000, t = "a"*500` would have answer C(1000,500) ≈ 2.7×10^299 (central binomial ≈ 2^1000/√(500π)); this promise guarantees such inputs don't appear. |
| (implicit) `t` may be longer than `s` | Nothing forbids it | Then the answer is `0`. A cheap guard `if n > m: return 0` is a nice out-loud check. |

---

## 3. Brute force: count by pick-or-skip

### 3.1 Code (prefix formulation — one convention for the whole lesson)

`count(i, j)` = number of ways to form `t[:j]` using `s[:i]`. **`i` and `j` are lengths, not indices** — the last character of the prefix `s[:i]` is `s[i-1]`.

```python
def numDistinct_brute(s: str, t: str) -> int:
    m, n = len(s), len(t)

    def count(i: int, j: int) -> int:
        if j == 0:
            return 1                 # empty target: exactly one way (pick nothing)
        if i == 0:
            return 0                 # source exhausted, target remains
        ways = count(i - 1, j)       # skip s[i-1]
        if s[i - 1] == t[j - 1]:
            ways += count(i - 1, j - 1)   # "spend" s[i-1] on t[j-1]
        return ways

    return count(m, n)
```

### 3.2 Worked trace: `s = "aaa"`, `t = "aa"` (expected: C(3,2) = 3)

```
count(3,2)                        s[2]='a' == t[1]='a' → two branches
├── use s[2] → count(2,2)         s[1]='a' == t[1]='a'
│   ├── use s[1] → count(1,2)     s[0]='a' == t[1]='a'
│   │   ├── use  → count(0,1) = 0
│   │   └── skip → count(0,2) = 0
│   │   = 0
│   └── skip s[1] → count(1,1)              ◇ same state appears below!
│       ├── use  → count(0,0) = 1
│       └── skip → count(0,1) = 0
│       = 1
│   = 0 + 1 = 1
└── skip s[2] → count(2,1)        s[1]='a' == t[0]='a'
    ├── use s[1] → count(1,1) = 1           ◇ recomputed — cache hit under memoization
    └── skip s[1] → count(1,0) = 1
    = 2
= 1 + 2 = 3  ✓
```

Note `count(1,1)` is evaluated twice in a 3-character example. In general, a state `(i,j)` is reachable by exponentially many interleavings of "use" and "skip" moves.

### 3.3 Complexity

- **Time: O(2^m)** — each call consumes one character of `s` and spawns at most two children (`skip` always, `use` conditionally), so the call tree has at most ~2^(m+1) nodes. For `m = 1000` this is hopeless, and note the explosion happens even when the answer is tiny: `s = t = "a"*1000` has answer 1 but still ~2^1000 calls of failing/redundant branches.
- **Space: O(m)** recursion stack.
- **Why not enumerate the actual subsequences?** Listing embeddings can produce Θ(C(m,n)) strings (e.g., `s="a"*2k, t="a"*k` has C(2k,k) embeddings), so *any* algorithm that materializes them is exponential by output-size alone. We must **count**, not enumerate.

---

## 4. The core insight

1. **Overlapping subproblems.** The only thing `count(i,j)` needs is `(i,j)` — the *position pair*, not the path taken to reach it. There are only `(m+1)(n+1) ≤ ~10^6` distinct states, but the naive tree revisits them exponentially often. That gap is the entire win: memoize/tabulate the states.

2. **The recurrence is a disjoint partition (this is why summing is exact).** Every subsequence of `s[:i]` that spells `t[:j]` falls into exactly one of two cases:
   - it **does not use** `s[i-1]` → counted by `dp[i-1][j]`;
   - it **uses** `s[i-1]` as its last character → then that character must equal `t[j-1]`, and the rest of the subsequence spells `t[:j-1]` inside `s[:i-1]` → counted by `dp[i-1][j-1]`.

   Disjoint (differ in whether index `i-1` is used) and exhaustive → the sum has no double counting.

3. **Greedy fails; you must branch over all matches.** In `rabbbit` → `rabbit`, binding `t`'s two `b`'s to the *earliest* two `b`'s of `s` finds one embedding and stops — but all C(3,2) = 3 choices of two b's among `{2,3,4}` are valid. Counting requires summing over every match position, which is exactly what the DP does.

4. **Geometric framing.** Think of a lattice where from `(i-1, j)` you may step right to `(i, j)` (skip) or, if `s[i-1] == t[j-1]`, diagonally to `(i, j)` (use). `dp[m][n]` counts monotone paths whose diagonal steps spell `t`. The same skeleton, with "sum" replaced by "min" or "bool," powers edit distance, LCS, and interleaving-string problems.

---

## 5. Optimal approach: prefix-count DP

Some editorials define the recursion over suffixes `s[i:]`, `t[j:]` with `f(i,n)=1`; that's the same lattice mirrored. I'll use the **prefix** formulation throughout so the recursion, the table, and the code all share one convention.

### 5.1 Definition, base cases, recurrence

**State:** `dp[i][j]` = number of subsequences of `s[:i]` that equal `t[:j]`.

**Base cases:**
- `dp[i][0] = 1` for all `i` — the empty target has exactly one embedding (the empty selection). Getting this wrong (setting it to 0) zeroes out everything.
- `dp[0][j] = 0` for `j ≥ 1` — a non-empty target can't be built from an empty source.
- (`dp[0][0] = 1` by the first rule.)

**Transition** for `i ≥ 1, j ≥ 1`:

```
dp[i][j] = dp[i-1][j]                                  # skip s[i-1]  (always)
         + dp[i-1][j-1]  if s[i-1] == t[j-1]           # spend s[i-1] on t[j-1]
```

**Answer:** `dp[m][n]`.

### 5.2 Trace — Example 1: `s = "rabbbit"`, `t = "rabbit"` → 3

| dp[i][j] | j=0 "" | j=1 "r" | j=2 "ra" | j=3 "rab" | j=4 "rabb" | j=5 "rabbi" | j=6 "rabbit" |
|---|---|---|---|---|---|---|---|
| i=0 "" | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| i=1 "r" | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| i=2 "ra" | 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| i=3 "rab" | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| i=4 "rabb" | 1 | 1 | 1 | 2 | 1 | 0 | 0 |
| i=5 "rabbb" | 1 | 1 | 1 | 3 | 3 | 0 | 0 |
| i=6 "rabbbi" | 1 | 1 | 1 | 3 | 3 | 3 | 0 |
| i=7 "rabbbit" | 1 | 1 | 1 | 3 | 3 | 3 | **3** |

Highlighted cell: `dp[5][4] = dp[4][4] + dp[4][3] = 1 + 2 = 3` (since `s[4]='b' == t[3]='b'`) — "ways to spell `rabb` from `rabbb`" = (ways to spell `rabb` from `rabb`, skipping the last b) + (ways to spell `rab` from `rabb`, spending the last b).

Sanity check on duplicates: the block of `b` columns is Pascal's triangle in disguise — `s` contributes `k` b's, and the values are C(k,1) and C(k,2): with `k = 3` b's, 3 and 3. The final answer C(3,2) = 3 matches the three embeddings `{b2,b3}, {b2,b4}, {b3,b4}`.

### 5.3 Trace — Example 2: `s = "babgbag"`, `t = "bag"` → 5

| dp[i][j] | j=0 "" | j=1 "b" | j=2 "ba" | j=3 "bag" |
|---|---|---|---|---|
| i=0 "" | 1 | 0 | 0 | 0 |
| i=1 "b" | 1 | 1 | 0 | 0 |
| i=2 "ba" | 1 | 1 | 1 | 0 |
| i=3 "bab" | 1 | 2 | 1 | 0 |
| i=4 "babg" | 1 | 2 | 1 | 1 |
| i=5 "babgb" | 1 | 3 | 1 | 1 |
| i=6 "babgba" | 1 | 3 | 4 | 1 |
| i=7 "babgbag" | 1 | 3 | 4 | **5** |

Highlighted cell: `dp[7][3] = dp[6][3] + dp[6][2] = 1 + 4 = 5` (since `s[6]='g' == t[2]='g'`). Cross-check by direct enumeration of index triples `(b, a, g)` with `b < a < g`: `(0,1,3), (0,1,6), (0,5,6), (2,5,6), (4,5,6)` — exactly 5.

### 5.4 Implementations

**(a) Top-down with memoization** — same recurrence, cache on integer indices.

```python
import sys
from functools import lru_cache

def numDistinct(s: str, t: str) -> int:
    sys.setrecursionlimit(4000)          # depth reaches ~m+1 ≈ 1001 > default 1000
    m, n = len(s), len(t)

    @lru_cache(maxsize=None)
    def count(i: int, j: int) -> int:
        if j == 0:
            return 1
        if i == 0:
            return 0
        ways = count(i - 1, j)
        if s[i - 1] == t[j - 1]:
            ways += count(i - 1, j - 1)
        return ways

    return count(m, n)
```

**(b) Bottom-up 2D** — the safest thing to write first in an interview.

```python
def numDistinct(s: str, t: str) -> int:
    m, n = len(s), len(t)
    if n > m:
        return 0
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = 1                          # empty target: one way
    for i in range(1, m + 1):
        si = s[i - 1]
        for j in range(1, n + 1):
            dp[i][j] = dp[i - 1][j]           # skip
            if si == t[j - 1]:
                dp[i][j] += dp[i - 1][j - 1]  # use
    return dp[m][n]
```

**(c) Space-optimized 1D** — row `i` only reads row `i-1`, so keep one array over `t` and sweep `j` **right-to-left**.

```python
def numDistinct(s: str, t: str) -> int:
    n = len(t)
    dp = [0] * (n + 1)
    dp[0] = 1                                  # empty target
    t_chars = set(t)
    for ch in s:
        if ch not in t_chars:                  # optional micro-opt
            continue
        for j in range(n, 0, -1):              # backward: dp[j-1] must be last row's value
            if ch == t[j - 1]:
                dp[j] += dp[j - 1]
    return dp[n]
```

(If backward loops feel fragile, a two-row rolling array is an equally valid O(n) alternative.)

### 5.5 Why the 1D inner loop must go right-to-left

Backward sweep computes `dp[j] += dp[j-1]` where `dp[j-1]` is still the **previous row's** value — each character of `s` is spent at most once.

Forward sweep reads an `dp[j-1]` that already absorbed the current character, silently letting **one character of `s` fill two slots of `t`**. Demo on `s = "aaa"`, `t = "aa"` (note `t` here has a repeated character):

- Correct (backward): final `dp = [1, 3, 3]` → answer **3** ✓ (C(3,2)).
- Buggy (forward): after the three characters, `dp = [1, 3, 6]` → answer **6** ✗.

**Silent trap:** if all characters of `t` are distinct (e.g., `t = "bag"`), at most one `j` can match a given `ch`, so forward and backward coincide and a wrong-direction implementation can still pass your spot checks. The direction is only forced when `t` contains duplicates — which `"rabbit"` does.

---

## 6. Complexity summary

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute-force recursion | O(2^m) | O(m) stack | 2 branches per character of `s` → ≤ 2^(m+1) nodes. TLE at m=1000. |
| Memoized top-down | O(m·n) | O(m·n) memo + O(m) stack | (m+1)(n+1) ≤ ~10^6 states, O(1) transition each. Watch Python's recursion limit. |
| Bottom-up 2D | O(m·n) | O(m·n) | Safest to write; ~4 MB of ints at 1000×1000 — fine. |
| 1D rolling array | O(m·n) | O(n) | Best; inner loop must run right-to-left. |

For `m = n = 1000`, O(m·n) = 10^6 cell updates — comfortably fast even in pure Python (the `ch not in t` skip helps in practice when characters are spread out).

---

## 7. Language gotchas

| Language | Gotcha | Fix |
|---|---|---|
| Python | Top-down recursion depth reaches `m+1 ≈ 1001`, above the default limit of 1000 → `RecursionError` even with correct logic. | `sys.setrecursionlimit(...)` with margin, or prefer bottom-up. |
| Python | Caching on string slices (`s[i:]`, `t[j:]`) as memo keys hides O(n) slicing/hashing per state. | Key on integer pairs `(i, j)`. |
| Java | The 32-bit guarantee covers the **final answer only**, not intermediates. Cells whose suffix can never match (a "dead" region) can exceed int: e.g., `t = "a"*20 + "zz"`, `s = "a"*40` has final answer 0, but `dp[40][20] = C(40,20) ≈ 1.4×10^11`. (Live cells are safe: any partially matched prefix that can still be extended contributes at least one full match, so it's ≤ the final answer.) | Use `long`/`long[]` internally, cast `(int)` at return. |
| Java | If top-down, `HashMap<Point, Long>` autoboxing is slow; a flat `long[m+1][n+1]` is better. | Array over map. |
| C++ | Signed overflow is **undefined behavior** (Java wraps deterministically; C++ may miscompile) — same dead-cell scenario as above. | `long long` accumulators. |
| C++ | Downward loops with `size_t` (`for (size_t j = n-1; j >= 0; --j)`) never terminate because the type can't go negative. | Use `int j` (values ≤ 1000) or the `j-- > 0` idiom. |

---

## 8. Common mistakes

1. **Misreading "distinct."** Counting unique *strings* instead of embeddings: for `("bba","ba")` the answer is 2, not 1. Distinctness refers to index selections; the target is fixed.
2. **Dropping the skip term when characters match.** Writing `dp[i][j] = dp[i-1][j-1]` on match turns `("aaa","aa")` into 1 instead of 3 — you must *both* inherit `dp[i-1][j]` and add the "use" branch.
3. **Base-case slips.** `dp[i][0] = 0` (kills everything → always 0) or `dp[0][j] = 1` for `j ≥ 1` (inflates counts). Remember: empty target = 1 way, empty source & non-empty target = 0.
4. **Off-by-one in the prefix convention.** Comparing `s[i]` instead of `s[i-1]` (or `t[j]` instead of `t[j-1]`) in an `(m+1)×(n+1)` table. Say it out loud: *`i`, `j` are lengths; the compared characters are `s[i-1]`, `t[j-1]`.*
5. **Forward inner loop in the 1D version.** Reuses one character of `s` for multiple slots of `t` — 6 instead of 3 on `("aaa","aa")`; and it can pass tests when `t` has all-distinct characters (see §5.5).
6. **Greedy earliest-match.** Returns 1 for `("rabbbit","rabbit")` instead of 3; counting fundamentally requires summing over all match choices.
7. **Caching on slices** in the top-down version → hidden O(n) key cost per state.
8. **Java/C++ overflow** in dead intermediate cells (§7) — free to avoid with 64-bit accumulators.
9. **Transpose confusion.** Rows = prefixes of `s`, columns = prefixes of `t`; swapping them makes `dp[m][n]` read the wrong cell. The symmetric-looking tables invite this; `("aaa","aa")` catches it (answer 3 vs 1).

---

## 9. Test cases to propose out loud

Propose these before coding — it signals you understand the semantics:

| Input | Expected | What it checks |
|---|---|---|
| `s="rabbbit", t="rabbit"` | 3 | Official; repeated chars in both; C(3,2) structure |
| `s="babgbag", t="bag"` | 5 | Official; skip-heavy matching |
| `s="aaa", t="aa"` | 3 | Minimal repeated-character case; also the memoization/loop-direction demo |
| `s="abc", t="abcd"` | 0 | `t` longer than `s` |
| `s="abc", t="abc"` | 1 | Exact match, exactly one embedding |
| `s="a", t="b"` | 0 | Minimal inputs, disjoint alphabets |
| `s="abc", t="d"` | 0 | Target character absent entirely |

```python
assert numDistinct("rabbbit", "rabbit") == 3
assert numDistinct("babgbag", "bag") == 5
assert numDistinct("aaa", "aa") == 3
assert numDistinct("abc", "abcd") == 0
assert numDistinct("abc", "abc") == 1
assert numDistinct("a", "b") == 0
```

Note: inputs like `("a"*1000, "a"*500)` are excluded by the 32-bit guarantee (their answer is ~10^299), so don't chase them; the small binomials above are enough to validate counting semantics.

---

## 10. Transferable patterns & related problems

**Patterns to carry away**

1. **"Count the embeddings" template:** define the state over prefixes, partition all solutions by the fate of the last character (used / skipped), verify the cases are disjoint and exhaustive, seed the identity case with 1, and *sum* (not min/max/bool).
2. **Rolling-array compression:** when row `i` reads only row `i-1`, keep one row and iterate the dependent index **backward** so each item is consumed at most once — the exact 0/1-knapsack trick (forward iteration is for *unbounded* reuse, e.g., coin change).
3. **Two-string DP lattice:** `(i, j)` grid, diagonal move gated by character equality. Swap the combinator for `min` (edit distance), `or/and` (interleaving), or `count` (this problem) and you get a whole problem family.
4. **"Fits in 32 bits" is a data promise:** read it as "final answer ≤ 2,147,483,647," pad intermediates to 64 bits in typed languages, ignore in Python.

**Related problems**

| Problem | Relationship |
|---|---|
| LC 1143 Longest Common Subsequence | Grandfather of the two-string lattice; max instead of count |
| LC 72 Edit Distance | Same `(i,j)` recurrence shape, minimized operation cost |
| LC 583 Delete Operation for Two Strings | Edit distance restricted to deletions |
| LC 97 Interleaving String | Boolean (feasibility) version of the pick/skip recurrence |
| LC 44 Wildcard Matching / LC 10 Regular Expression Matching | Two-string DP where pattern characters carry semantics |
| LC 940 Distinct Subsequences II | Counts *distinct strings* that are subsequences of one string (dedup via last occurrence) — the contrast clarifies today's meaning of "distinct" |
| LC 494 Target Sum | Counting with a pick/skip decision at each element |
| LC 518 Coin Change II | Counting combinations; identical backward-loop 1D compression |

**Likely follow-ups**

- *"What if the answer may not fit in 32 bits?"* → Return it modulo 10^9+7 (LC 940 does this for its answer space); Python big ints otherwise.
- *"Can you output the actual subsequences?"* → Not in poly time in general: the output itself can contain Θ(C(m,n)) strings (e.g., `s="a"*2k, t="a"*k`), so any listing algorithm is exponential in the worst case; you'd backtrack the DP table and cap the results.
- *"Top-down or bottom-up?"* → Both O(m·n); bottom-up avoids recursion-depth issues and compresses to O(n) trivially, so I'd default to it.

---

## 11. Full interview talk track

**[Clarify semantics]** "So I'm counting the number of ways to embed `t` in `s` as a subsequence — one way being an increasing set of indices in `s` that spells `t`. 'Distinct' means distinct index selections; they all spell the same string `t`. For `rabbbit`/`rabbit` that's choosing 2 of the 3 b's, so 3 — consistent with the example."

**[Naive approach]** "The natural recursion: walk both strings with positions; at each step, skip `s[i]`, and if `s[i] == t[j]`, branch into using it. Base: `j` at the end of `t` → found one; `i` exhausted → dead end. This is exponential, because the same 'position in `s`, position in `t`' pair is reached by many different skip/use paths."

**[Insight → DP]** "But each state only needs to know *how many* ways finish from there — the path doesn't matter. So `dp[i][j]` = number of subsequences of `s`'s first `i` characters equal to `t`'s first `j` characters. Column 0 is all ones — empty target, one way; row 0 is zeros past the origin. Transition: always inherit `dp[i-1][j]` for skipping; when `s[i-1] == t[j-1]`, add `dp[i-1][j-1]` for spending the character. Answer is `dp[m][n]`. The two cases are disjoint — they differ in whether index `i-1` is used — so summing is exact."

**[Space]** "Each row only reads the previous row, so one array over `t` suffices — sweeping `j` right-to-left so `dp[j-1]` is still the previous row's value and each character of `s` is used at most once."

**[Verify + complexity]** "`rabbbit` → 3, `babgbag` → 5. Edge tests: `t` longer than `s` → 0; identical strings → 1; `aaa`/`aa` → C(3,2) = 3. Time O(m·n) — about 10^6 at the 1000×1000 limits — space O(n)."

---

## 12. Say it in 60 seconds

> "I'm counting the ways to embed `t` into `s` as a subsequence — a way is an increasing set of indices in `s` spelling `t`; 'distinct' means distinct index sets, not distinct strings. Brute force is a pick-or-skip recursion over `s`, exponential because the same *position in s, position in t* state is reached many times. So DP: `dp[i][j]` = number of subsequences of `s`'s first `i` chars equal to `t`'s first `j` chars. Base: `dp[i][0] = 1` — empty target, one way; `dp[0][j] = 0` for `j > 0`. Transition: always take `dp[i-1][j]` for skipping `s[i-1]`; if `s[i-1] == t[j-1]`, also add `dp[i-1][j-1]` for using it. Answer `dp[m][n]` — `rabbbit` gives 3, `babgbag` gives 5. O(m·n) time, ~10^6 at the limits; each row only needs the previous row, so one array over `t`, swept right-to-left so every character of `s` is used at most once — O(n) space. Two traps I'm watching: never drop the skip term when characters match, and the backward sweep — going forward lets one character fill two slots."
