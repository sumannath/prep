# Regular Expression Matching (LeetCode 10) — Complete Interview Lesson

## 1. Problem restatement

In your own words, before touching code:

> "I'm given a string `s` and a pattern `p`. The pattern supports two special operators: `.` matches **exactly one** arbitrary character, and `*` modifies the **single element immediately before it**, meaning 'zero or more copies of that element'. I must decide whether the pattern describes **the entire string** — a full match, not a substring hit — and return that boolean."

Three precision points to say out loud:

- **`*` never stands alone.** It binds to exactly one preceding element (a letter or a `.`). So `a*` is a unit; in `abc*`, only `c` is starred. The constraints guarantee every `*` has a valid preceding element, so the pattern is always well-formed (no leading `*`, no `**`).
- **Full match, not partial.** `"aa"` vs `"a"` is `false` even though `"a"` matches a *prefix* of `"aa"`.
- **Zero copies erases the whole unit.** `x*` matching zero characters consumes *both* the `x` and the `*` from the pattern — the unit vanishes entirely.

---

## 2. Decoding the constraints

| Constraint | What it actually tells you |
|---|---|
| `1 <= s.length, p.length <= 20` | An `O(m·n)` DP has at most `(20+1) × (20+1) = 441` states — trivial. Even sloppy exponential solutions often pass LeetCode's tests, but the *expected interview answer* is DP with a clean state; don't bank on tiny tests. |
| `s` contains only lowercase letters | No case-sensitivity, no unicode edge cases; `.` comparison logic is trivial. |
| `p` contains letters, `.`, `*` | The only operators to handle are these two. No `+`, `?`, `\|`, classes — but be ready to discuss them as follow-ups (§11). |
| Every `*` follows a valid character | Pattern is well-formed ⇒ indexing `p[j-2]` when `p[j-1] == '*'` is always safe. Still worth a one-line defensive assert, because Python negative indexing fails *silently* (§9). |
| `s.length >= 1` | You won't be tested with `s = ""`, but your base row **must still handle the empty string correctly**, because patterns like `a*b*` erase themselves down to nothing. |
| Return full-match boolean | The single most common misread. The final answer is "entire `s` consumed **and** entire `p` consumed." |

There are no duplicate *values* to worry about here (nothing to hash or dedupe in the input). The relevant "duplicates" are **duplicate subproblems** — the same `(i, j)` pair reached by different decisions — which is exactly what memoization dedupes (§4).

---

## 3. Brute force: fork at every star

### 3.1 The recursion

The only decision point in the whole problem is a **star unit**: an adjacent pair `(p[j], p[j+1])` where `p[j+1] == '*'`. Everything else is forced.

Define `match(i, j)` = "does the suffix `s[i:]` match the suffix `p[j:]`?" (`i`, `j` are **indices**; the bases compare them to the **lengths** `m`, `n`.)

- If `j == n`: the pattern is exhausted → match only if `i == m` too (full-match condition).
- If a star follows `p[j]`: two independent choices —
  - **zero copies:** drop the unit → `match(i, j + 2)`
  - **one or more:** if `s[i]` agrees with `p[j]` (equal, or `p[j] == '.'`), consume `s[i]` and **keep the unit** → `match(i + 1, j)`
- Otherwise: `s[i]` must agree with `p[j]`, then `match(i + 1, j + 1)`.

```python
def isMatch_bf(s: str, p: str) -> bool:
    m, n = len(s), len(p)

    def match(i: int, j: int) -> bool:
        if j == n:                      # pattern exhausted
            return i == m               # string must be exhausted too
        first = i < m and (s[i] == p[j] or p[j] == '.')
        if j + 1 < n and p[j + 1] == '*':
            return match(i, j + 2) or (first and match(i + 1, j))
        return first and match(i + 1, j + 1)

    return match(0, 0)
```

Note there is **no** special case for `i == m` with `j < n` — the zero-copy branch naturally lets star units evaporate. Do *not* return `False` early there (common bug, §8).

### 3.2 Worked trace: `s = "aab"`, `p = "a*b"` → `true`

```text
match(0,0)  s="aab", unit="a*"
├─ A: zero copies   → match(0,2):  p[2]='b' vs s[0]='a' → mismatch → False
└─ B: consume 'a'   → match(1,0):  s="ab", unit still active
   ├─ A: zero copies → match(1,2):  p[2]='b' vs s[1]='a' → False
   └─ B: consume 'a' → match(2,0):  s="b"
      ├─ A: zero copies → match(2,2): 'b'=='b' → match(3,3): j==n, i==m → TRUE ✓
      └─ B: consume 'b' into 'a*' → 'b' ≠ 'a' → dead branch
→ True   (winning parse: "aa" = "a*"(2 copies), "b" = "b")
```

### 3.3 Why it's slow — and the memoization preview

Two failure modes compound:

1. **Overlapping subproblems.** Branch order doesn't matter, so different paths reach the same state. For `s = "aaaa"`, `p = "a*a*a"`:

```text
match(0,0)
├─ zero → match(0,2) ── consume ──→ match(1,2)     (path B)
└─ eat  → match(1,0) ── zero ────→ match(1,2)      (path A) ← same state recomputed
```

2. **Exponential path count.** With `k` star units, the search can enumerate every way to distribute the consumed characters among the units — a stars-and-bars count of roughly `C(m+k−1, k−1)` assignments, which grows like `4^k/√k` when `k` scales with `m`. Concretely, `s = "a"×18 + "b"` vs `p = "a*"`×9`+"c"` forces the naive search through distributions on the order of a million before concluding `false`.

Memoization caps the work at one computation per `(i, j)` state — at most 441 here.

---

## 4. The core insight

> **The only place two valid parses can disagree is a star unit. A star unit either matches zero characters (unit disappears) or matches one character and *stays available* for more. Since the same `(string position, pattern position)` pair is reachable through many different decision orders, memoizing on that pair collapses an exponential tree into an `O(m·n)` DAG.**

Two sub-insights worth verbalizing:

- **"Consume and stay" is the whole game.** In the one-or-more branch, the pattern pointer does *not* advance past the `*` — the unit remains live. This is structurally identical to unbounded knapsack ("take one item, remain on the same item"), which is why this problem transfers so cleanly (§11).
- **State = pair of positions, not characters.** `match(i, j)` is a *pure* function of `(i, j)` — no other context — which is exactly the condition that makes memoization valid.

---

## 5. Optimal approach A — top-down memoized recursion (interview default)

### 5.1 State definition and transitions

`match(i, j)`: does `s[i:]` (suffix starting at **index** `i`) match `p[j:]`?

- **Base:** `j == n` → return `i == m`.
- **Star unit** (`j+1 < n` and `p[j+1] == '*'`): `match(i, j+2) OR (first AND match(i+1, j))` where `first = (i < m) and (s[i] == p[j] or p[j] == '.')`.
- **Plain element:** `first AND match(i+1, j+1)`.

Reachable states never have `p[j] == '*'` (well-formedness + the `j+2`/`j+1` jumps skip over stars), so no extra branch is needed. Termination: every call strictly increases `i + j`, and memoization makes the traversal a DAG over at most `(m+1)(n+1)` states.

### 5.2 Code

```python
from functools import lru_cache

class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        m, n = len(s), len(p)

        @lru_cache(maxsize=None)
        def match(i: int, j: int) -> bool:
            """Does s[i:] match p[j:] ?  (i, j are indices; 0 <= i <= m, 0 <= j <= n)"""
            if j == n:                          # pattern exhausted:
                return i == m                   # full match iff string exhausted too
            first = i < m and (s[i] == p[j] or p[j] == '.')
            if j + 1 < n and p[j + 1] == '*':   # star unit (p[j], p[j+1])
                # zero copies            OR one-or-more (consume s[i], unit stays)
                return match(i, j + 2) or (first and match(i + 1, j))
            return first and match(i + 1, j + 1)

        return match(0, 0)
```

The *only* difference from the brute force is the `@lru_cache` line — the hard part is recognizing that `(i, j)` is a complete, pure state.

### 5.3 Full narration script (the talk track to distill later)

> "Let me restate the contract: the whole string must be covered; `.` is exactly one wildcard character; and `c*` is zero or more copies of the single element before the star. The only source of choice in this problem is a star unit, so I'll define `f(i, j)` — does `s[i:]` match `p[j:]`? If the pattern is exhausted, I return whether the string is also exhausted — that's the full-match requirement, and I will *not* return false early when the string runs out first, because remaining star units can legally erase themselves. At a star unit I take the OR of two branches: drop the unit entirely, or — if the current characters agree — consume one string character and keep the unit alive. Otherwise the characters must agree and both pointers advance. These calls overlap — different branch orders land on the same `(i, j)` — so I add a memo. Each of at most `(m+1)(n+1)` states does constant work: `O(m·n)` time and space, ≤ 441 states under these constraints. If you prefer bottom-up, the same recurrence becomes `dp[i][j]` over prefix lengths, and it rolls down to `O(n)` space because row `i` only reads row `i−1` and earlier entries of row `i`. The bug I'm most watching for: in the one-or-more branch it's `dp[i-1][j]`, *not* `dp[i-1][j-1]` — the star stays active. Before coding I'd name my tests: `'aab'/'c*a*b'` → true, `'aaa'/'a*'` → true, `'mississippi'/'mis*is*p*.'` → false, `'ab'/'.*c'` → false."

---

## 6. Optimal approach B — bottom-up DP with table traces

### 6.1 Recurrence (prefix-length convention — note the index shift!)

Here `dp[i][j]` = "do the **first `i` characters** of `s` match the **first `j` characters** of `p`?" So `i`, `j` are **lengths** (values of how much is consumed), and the last compared characters are the **values** `s[i-1]` and `p[j-1]`. Table size `(m+1) × (n+1)` because of the empty prefixes.

**Base cases:**

- `dp[0][0] = True` (empty vs empty)
- `dp[i][0] = False` for `i ≥ 1` (non-empty string vs empty pattern)
- `dp[0][j] = dp[0][j-2]` if `p[j-1] == '*'`, else `False` — empty string matched by self-erasing star units. (Safe because well-formed patterns put `*` at index ≥ 1, so `j-2 ≥ 0`.)

**Transitions** for `i ≥ 1, j ≥ 1`:

- `p[j-1] != '*'`:
  `dp[i][j] = dp[i-1][j-1] AND (p[j-1] == '.' OR s[i-1] == p[j-1])`
- `p[j-1] == '*'` (let `c = p[j-2]`, the starred element):
  `dp[i][j] = dp[i][j-2] OR (dp[i-1][j] AND (c == '.' OR s[i-1] == c))`
  — zero copies, **or** consume `s[i-1]` and stay on the unit (`dp[i-1][j]`, *not* `dp[i-1][j-1]`).

The dependency graph is acyclic: row `i` reads only row `i-1` and smaller `j` in row `i`, so fill `i` ascending, then `j` ascending.

### 6.2 Code

```python
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        m, n = len(s), len(p)
        # dp[i][j] = does s[:i] (first i chars) match p[:j] (first j chars)?
        dp = [[False] * (n + 1) for _ in range(m + 1)]
        dp[0][0] = True

        for j in range(1, n + 1):               # empty string row
            if p[j - 1] == '*':
                dp[0][j] = dp[0][j - 2]         # star unit erases itself

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if p[j - 1] == '*':
                    c = p[j - 2]                # starred element (well-formed ⇒ j >= 2)
                    zero = dp[i][j - 2]                          # drop the unit
                    more = dp[i - 1][j] and (c == '.' or s[i - 1] == c)  # consume, STAY
                    dp[i][j] = zero or more
                else:
                    dp[i][j] = dp[i - 1][j - 1] and (p[j - 1] == '.' or s[i - 1] == p[j - 1])
        return dp[m][n]
```

### 6.3 Traces on the official examples

**Example 2: `s = "aa"`, `p = "a*"` → `true`**

| dp | j=0 (ε) | j=1 (`a`) | j=2 (`a*`) |
|---|---|---|---|
| **i=0 (ε)** | **T** | F | **T** ← zero copies of the unit |
| **i=1 (`a`)** | F | T ← `dp[0][0]`∧`a==a` | **T** ← `dp[0][2]`=T ∧ `s[0]==a` |
| **i=2 (`aa`)** | F | F ← `dp[1][0]`=F | **T** ← `dp[1][2]`=T ∧ `s[1]==a` |

Answer `dp[2][2] = True` ✓. Note the `more` term reads `dp[i-1][j]` — the unit is still active after eating one `a`.

**Example 3: `s = "ab"`, `p = ".*"` → `true`**

| dp | j=0 (ε) | j=1 (`.`) | j=2 (`.*`) |
|---|---|---|---|
| **i=0 (ε)** | **T** | F (`.` can't match nothing) | **T** (unit erases) |
| **i=1 (`a`)** | F | T (`.` matches `a`) | T |
| **i=2 (`ab`)** | F | F | **T** ← `dp[1][2]`=T ∧ `.` matches `b` |

✓ — `.*` eats exactly one char per "more" step and can repeat, since it reads `dp[i-1][j]`.

**Example 1: `s = "aa"`, `p = "a"` → `false`**

| dp | j=0 (ε) | j=1 (`a`) |
|---|---|---|
| **i=0 (ε)** | T | F |
| **i=1 (`a`)** | F | T |
| **i=2 (`aa`)** | F | **F** ← needs `dp[1][0]` = F |

`dp[2][1] = False`: the second `a` has no pattern left to match it — full-match fails ✓.

### 6.4 Trace on a richer case: `s = "aab"`, `p = "c*a*b"` → `true`

This exercises **zero copies** of `c*` and one-plus copies of `a*`.

| dp | j=0 ε | j=1 `c` | j=2 `c*` | j=3 `a` | j=4 `a*` | j=5 `b` |
|---|---|---|---|---|---|---|
| **i=0 ε** | T | F | **T** | F | **T** | F |
| **i=1 `a`** | F | F | F | **T** ← `dp[0][2]`=T ∧ `a==a` | T | F |
| **i=2 `a`** | F | F | F | F ← `dp[1][2]`=F | **T** ← `dp[1][4]`=T ∧ `a==a` | F |
| **i=3 `b`** | F | F | F | F | F ← `dp[2][4]`=T but `b≠a` | **T** ← `dp[2][4]`=T ∧ `b==b` |

`dp[3][5] = True` ✓. The winning parse: `c*`→zero, `a*`→`aa`, `b`→`b`.

### 6.5 `O(n)` space: rolling rows

`dp[i][j]` reads `dp[i-1][j]`, `dp[i-1][j-1]` (previous row) and `dp[i][j-2]` (already-written current row), so two rows suffice:

```python
def isMatch(self, s: str, p: str) -> bool:
    m, n = len(s), len(p)
    prev = [False] * (n + 1)
    prev[0] = True
    for j in range(1, n + 1):
        if p[j - 1] == '*':
            prev[j] = prev[j - 2]
    for i in range(1, m + 1):
        cur = [False] * (n + 1)             # cur[0] = False: non-empty s vs empty p
        for j in range(1, n + 1):
            if p[j - 1] == '*':
                cur[j] = cur[j - 2] or (prev[j] and (p[j - 2] == '.' or s[i - 1] == p[j - 2]))
            else:
                cur[j] = prev[j - 1] and (p[j - 1] == '.' or s[i - 1] == p[j - 1])
        prev = cur
    return prev[n]
```

---

## 7. Complexity

| Approach | Time | Aux space | Notes |
|---|---|---|---|
| Brute-force recursion | Exponential worst case — up to ~`C(m+k−1, k−1)` call paths with `k` star units | `O(m + n)` stack | Recomputes identical `(i, j)` states; fine only as a stepping stone |
| **Top-down memo (recommended)** | **`O(m·n)`** | **`O(m·n)`** memo + `O(m+n)` stack | ≤ 441 states here; depth ≤ `m+n` ≤ 41, well under Python's recursion limit |
| Bottom-up 2-D DP | `O(m·n)` | `O(m·n)` | Same recurrence, no recursion |
| Rolling rows | `O(m·n)` | `O(n)` | The "optimize space" follow-up |

Why the main bound holds: each state does a constant number of comparisons and at most two `O(1)` calls, and there are at most `(m+1)(n+1)` states — each computed once thanks to the memo.

**If the interviewer asks about real regex engines:**

- Thompson-style NFA simulation (what RE2-style engines do) matches any regex in `O(m·n)` time and `O(n)` space — justified because at each of the `m` input characters it updates a set of at most `n` currently-active NFA states.
- Compiling the NFA to a DFA first can require `2^n` states — justified because every subset of the `n` NFA states can become a distinct DFA state (patterns like `.*a.*a.*b…` realize exponentially many subsets).
- Python's built-in `re` uses backtracking, so it inherits the same exponential worst case ("catastrophic backtracking") — justified because it explores the same branch-per-star path space as our §3 brute force. Use `re.fullmatch` only to *generate expected outputs* for tests, never as the "solution."

---

## 8. Common mistakes

| # | Mistake | Symptom (concrete failing case) | Fix |
|---|---|---|---|
| 1 | Using `dp[i-1][j-1]` in the "one or more" branch | `"aaa"` / `"a*"` → wrongly `false` (unit dies after one copy — that's `?` behavior, not `*`) | Use `dp[i-1][j]` / `match(i+1, j)`: the unit **stays active** |
| 2 | Comparing `s[i-1] == p[j-1]` inside the star branch | Compares against `'*'` itself, never matches letters | Compare against `p[j-2]`, the starred element |
| 3 | Returning `False` as soon as `i == m` while `j < n` | `"a"` / `"a*b*"` → wrongly `false` | Only the `j == n` base returns; star units legitimately erase themselves |
| 4 | Skipping the `dp[0][*]` base row | `"aab"` / `"c*a*b"` breaks from cell one | Initialize the empty-string row via `dp[0][j] = dp[0][j-2]` for stars |
| 5 | Misreading `*` as starring the whole preceding token (`abc*` → `(abc)*`) | Wrong parses everywhere | `*` binds to exactly **one** preceding element, per the problem statement |
| 6 | Thinking `.` can match "nothing" | `""` / `".*"` handled wrong; `dp[0][1]` for `.` must be `False` | `.` matches exactly one char; **zero copies removes the whole `.*` unit** |
| 7 | Substring-match misread | `"aa"` / `"a"` → wrongly `true` | Answer requires *both* pointers exhausted |
| 8 | Table sized `m × n` instead of `(m+1) × (n+1)` | Off-by-one / index errors | Empty prefixes are real states: dims `(m+1)(n+1)`, chars accessed as `s[i-1]`, `p[j-1]` |
| 9 | `p[j-2]` on a malformed pattern | Python silently reads `p[-1]` (wraps); C++ is UB | Constraints preclude it; still, `assert j >= 2` costs nothing |
| 10 | Memoizing only `i` or only `j`, or caching on a method | Wrong answers / stale cache across test cases | State is the **pair** `(i, j)`; in Python use a nested function with `lru_cache` (§9) |

---

## 9. Language gotchas (short version)

| Language | Gotcha |
|---|---|
| **Python** | `p[j-2]` with a malformed pattern wraps to `p[-1]` **silently** (C++ would at least crash) — trust the constraint but assert. Also: `@lru_cache` on a *method* keys on `self` and persists across LeetCode test cases; use a **nested function** (as in §5.2) or call `cache_clear()`. |
| **Java** | Prefer `int[][] memo` (−1 = unvisited) or `boolean[][]` over `HashMap<String, Boolean>` keyed by `i + "," + j` — the string key allocates on every call and every `Boolean` value autoboxes, causing measurable GC churn (no overflow risk: indices ≤ 20). Recursion depth ≤ `m+n` ≈ 41 is safe. Also remember `p.charAt(j)` compares against the char literal `'.'`, not the String `"."`. |
| **C++** | Capture `int m = (int)s.size(), n = (int)p.size()` up front — comparing `int j < p.size()` mixes signed/unsigned, and any guard written in `size_t` (like a `j - 2 >= 0` idea) silently wraps. Allocate `vector<vector<int>> memo(m + 1, vector<int>(n + 1, -1));` — forgetting the `+1` for empty prefixes is the #1 segfault here. |

---

## 10. Test cases to say out loud

Announce these **before coding** — each is chosen to kill a specific bug:

| # | `s` | `p` | Expected | What it protects against |
|---|---|---|---|---|
| 1 | `"aa"` | `"a"` | `false` | Official; kills the partial-match misread |
| 2 | `"aa"` | `"a*"` | `true` | Official; basic star repetition |
| 3 | `"ab"` | `".*"` | `true` | Official; `.` inside a star unit, repeatable |
| 4 | `"aab"` | `"c*a*b"` | `true` | **Zero copies** of `c*`; kills "star must consume ≥ 1" |
| 5 | `"aaa"` | `"a*"` | `true` | Kills the `dp[i-1][j-1]` bug (unit must stay active) |
| 6 | `"a"` | `"a*b*"` | `true` | Kills early-`False` when the string is exhausted but star units remain |
| 7 | `"mississippi"` | `"mis*is*p*."` | `false` | Classic; kills greedy over-matching (`p*` can't absorb `ippi`) |
| 8 | `"ab"` | `".*c"` | `false` | `.*` cannot conjure a missing `c`; full-coverage check |
| 9 | `"a"` | `"ab*"` | `true` | Trailing star unit matching zero |
| 10 | `"a"×18 + "b"` | `"a*"`×9 + `"c"` | `false`, **fast** | Stress: naive backtracking grinds through ~exponential distributions; DP finishes instantly |

Optionally, property-test against the stdlib (generation only, not as the solution):

```python
import re, random

def random_pattern(max_units=4):
    units = []
    for _ in range(random.randint(1, max_units)):
        tok = random.choice('ab.')
        units.append(tok + ('*' if random.random() < 0.5 else ''))
    return ''.join(units)          # guaranteed well-formed: '*' never leads, never doubles

for _ in range(1000):
    s = ''.join(random.choices('ab', k=random.randint(0, 6)))
    p = random_pattern()
    assert Solution().isMatch(s, p) == bool(re.fullmatch(p, s))
```

(`.` and `*` mean the same thing in Python's `re`, and our patterns are well-formed, so `re.fullmatch` is a valid oracle.)

---

## 11. Transferable patterns, related problems, and follow-ups

**Patterns to bank:**

1. **Two-sequence DP over `(i, j)` prefix/suffix pairs.** Whenever two strings evolve with forced-or-optional per-character decisions, define state = pair of positions and fill a 2-D table. The "duplicates" to dedupe here are repeated `(i, j)` subproblems.
2. **"Take zero, or take one and stay" = unbounded-knapsack skeleton.** The star transition `dp[i][j-2] OR (dp[i-1][j] AND …)` is structurally identical to "skip the item OR consume one and remain on it" in Coin Change / unbounded knapsack.
3. **Automaton view.** Regex matching is NFA reachability: pattern positions are states, star units create ε-loops. The DP is exactly a frontier simulation; the same mental model powers KMP-style and state-machine string problems.

**Related problems:**

| Problem | Relationship |
|---|---|
| LC 44 — Wildcard Matching | Same 2-D DP shape, but `*` there matches *any sequence* (no preceding-element binding) — a strictly simpler star |
| LC 72 — Edit Distance | Two-sequence DP with per-character insert/delete/replace decisions |
| LC 97 — Interleaving String | `dp[i][j]` built from two OR-ed predecessors |
| LC 115 — Distinct Subsequences | Counting variant of the prefix-pair DP |
| LC 322 / 518 — Coin Change I/II | The "consume-and-stay" recurrence in disguise |
| LC 139 / 140 — Word Break | Pattern "units" consuming prefixes of `s` |
| LC 28 / 214 (KMP) | The linear-time matching cousin — different technique, same domain |

**Likely follow-ups, with one-line answers:**

- **Add `+` (one or more):** drop the zero-branch; `dp[i][j] = dp[i-1][j] AND char-match` with `dp[0][j] = False` for that unit.
- **Add `?` (zero or one):** `dp[i][j] = dp[i][j-2] OR (dp[i-1][j-1] AND char-match)` — consume-once-then-advance.
- **Add `\|` (alternation):** split on top-level alternation and OR the sub-results, or build an NFA.
- **Character classes `[abc]`:** swap the equality test for a membership test — nothing else changes.
- **Streaming `s` (no random access):** run the NFA-frontier simulation, `O(n)` memory, one pass.
- **Why not use `re.fullmatch`?** It "works," but (a) it dodges the algorithmic point, and (b) Python's backtracking engine has the same exponential worst case on adversarial patterns (§7).

---

## 12. Say it in 60 seconds

*(Spoken pace, ~170 words — the compressed version of §5.3.)*

> "There's exactly one source of branching in regex matching: a star unit — one element followed by a star. It either matches zero characters and disappears, or — if the next string character agrees with it — it eats one character and *stays alive* for more. Everything else is forced: a literal or dot must agree and both pointers advance, and when the pattern runs out, the string must be exhausted too — that's the full-match condition, so I never bail early when the string runs dry.
>
> Naive recursion forks at every star, and different branch orders recompute the same string-index/pattern-index pair — that's exponential. So I memoize on the pair, or fill the bottom-up table: dp of i and j means 'first i chars match first j chars.' Star recurrence: zero copies reads dp of i, j−2; one-or-more reads dp of **i−1, j** with a character check against the starred element — i−1, j, not i−1, j−1, because the unit stays active. That's O of m-times-n time and space, at most 441 states under these constraints.
>
> Tests I'd call out: 'aab' over 'c*a*b' is true, 'aaa' over 'a*' is true, 'mississippi' over 'mis*is*p*.' is false."
