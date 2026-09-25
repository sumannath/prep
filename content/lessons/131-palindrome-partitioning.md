# Palindrome Partitioning — Complete Interview Lesson

## 1. Problem restated (precisely)

**Given:** a string `s` (lowercase English letters, `1 ≤ s.length ≤ 16`).

**Return:** *all* ways to cut `s` into consecutive pieces such that **every piece is a palindrome**.

The output contract has details worth saying out loud in an interview:

- Each answer (a "partition") is an **ordered list of non-empty contiguous substrings** `p₁, p₂, …, p_k` such that `p₁ + p₂ + … + p_k == s` exactly — pieces cover the whole string, in order, with no overlaps and no gaps. These are **substrings (contiguous), not subsequences**.
- Within a row, order is fixed (left to right). The **order of rows** in the output doesn't matter (LeetCode accepts any order); our DFS emits rows in increasing length of the first piece.
- **Duplicates are legitimate.** Rows are distinguished by their *cut structure*, not by their multiset of piece values. For `s = "aaaa"`, both `["a","aa","a"]` and `["aa","a","a"]` are distinct correct answers even though they contain the same pieces. Never deduplicate unless the interviewer explicitly changes the problem.

## 2. Constraint decoding — what the constraints are telling you

A partition of a length-`n` string is completely determined by choosing, for each of the `n − 1` gaps between adjacent characters, whether to cut there or not. That's a **bijection between cut-subsets and partitions**, so:

| Constraint | Decode | Consequence |
|---|---|---|
| `n ≤ 16` | Max partitions = 2¹⁵ = **32,768** | The output itself can be exponential → **exhaustive backtracking is the intended complexity class, not a red flag.** Say this out loud. |
| `n ≥ 1` | No empty-string input | Base case is `start == n` (index one *past* the last char), reached after consuming at least one piece. |
| lowercase only | Every single character is a palindrome; no case normalization needed | The "one character per piece" partition `["a","b",…]` is *always* a valid row, so the answer is never empty. |
| (implicit) | Recursion depth ≤ n = 16 | No stack-depth concerns in Python (default limit 1000), Java, or C++. |

## 3. Brute force with a worked trace

**Idea:** enumerate every subset of the `n − 1` gap positions (cut / no cut), split `s` accordingly, validate that every piece is a palindrome, and keep the partition if so.

```python
from itertools import product

def partition_brute(s: str) -> list[list[str]]:
    n = len(s)
    results = []
    for cuts in product([False, True], repeat=n - 1):   # cuts[i]: cut after index i?
        pieces, start = [], 0
        for i, cut in enumerate(cuts):
            if cut:
                pieces.append(s[start:i + 1])
                start = i + 1
        pieces.append(s[start:])
        if all(p == p[::-1] for p in pieces):           # validate after the fact
            results.append(pieces)
    return results
```

**Worked trace on `s = "aab"`** (gaps: after index 0, after index 1 → 2² = 4 cut-vectors):

| Cut after 0? | Cut after 1? | Pieces | All palindromes? | Verdict |
|---|---|---|---|---|
| no | no | `["aab"]` | `"aab"` ✗ (a ≠ b) | reject |
| yes | no | `["a","ab"]` | `"ab"` ✗ | reject |
| no | yes | `["aa","b"]` | ✓ ✓ | **accept** |
| yes | yes | `["a","a","b"]` | ✓ ✓ ✓ | **accept** |

Output: `{["a","a","b"], ["aa","b"]}` ✓ — matches Example 1.

**Cost:** 2ⁿ⁻¹ cut-vectors × O(n) to split-and-validate = **O(n·2ⁿ)**. For n = 16 that's ≈ 500K character operations — passes trivially. The inefficiency is *structural*: we build whole partitions and validate at the end, even though a bad piece invalidates everything built on top of it.

## 4. The core insight

Three observations turn the brute force into the canonical backtracking solution:

1. **A partition = a sequence of cut decisions, made left to right.** If I've committed pieces covering `s[0..start−1]`, my only state is the index `start` where the next piece begins. From `start`, I choose the piece's **end index** — that single choice, recursed, generates every partition exactly once (each partition corresponds to a unique sequence of piece-end choices, so no duplicate rows).
2. **Prune the moment a piece fails.** If `s[start..end]` is not a palindrome, *no* completion of this partial partition can work — kill the branch immediately instead of validating at the end. The DFS leaves are then *exactly* the valid partitions, by construction: every piece appended was already verified, and the base case fires only when the string is fully consumed.
3. **Palindromes have optimal substructure.** `s[i..j]` is a palindrome ⇔ `s[i] == s[j]` **and** the inner substring `s[i+1..j−1]` is a palindrome. This gives an O(n²) precomputed table, making every check O(1) inside the recursion.

**Why greedy fails:** taking the *longest* palindromic prefix at each step finds at most **one** partition (e.g., for `"abbab"` greedy commits early and misses other cuts). The problem demands **all** partitions, so you must *branch* on every palindromic prefix — greedy is a correctness failure here, not just an efficiency issue.

## 5. Optimal approach: backtracking + palindrome DP table

### 5.1 Step 1 — the backtracking skeleton (naive check, already passes for n ≤ 16)

```python
def partition(s: str) -> list[list[str]]:
    results, path = [], []

    def dfs(start: int) -> None:              # start = index where next piece begins
        if start == len(s):                   # consumed all characters
            results.append(path.copy())       # copy VALUES, not the list reference
            return
        for end in range(start, len(s)):      # end = INCLUSIVE last index of piece
            piece = s[start:end + 1]          # +1 because slice end is exclusive
            if piece == piece[::-1]:
                path.append(piece)
                dfs(end + 1)                  # next piece starts after this one
                path.pop()                    # undo the choice before next end

    dfs(0)
    return results
```

### 5.2 Step 2 — O(1) palindrome checks via an O(n²) precomputed table

The check `piece == piece[::-1]` costs O(len) each time. Replace it with `is_pal[start][end]`, filled once using the substructure recurrence:

```python
def partition(s: str) -> list[list[str]]:
    n = len(s)

    # is_pal[i][j] == True  <=>  s[i..j] (both inclusive) is a palindrome.
    # (i, j) reads (i+1, j-1), a row BELOW -> fill rows bottom-up (i descending).
    is_pal = [[False] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        for j in range(i, n):                          # upper triangle only (j >= i)
            is_pal[i][j] = (s[i] == s[j]) and (j - i < 2 or is_pal[i + 1][j - 1])

    results: list[list[str]] = []
    path: list[str] = []                               # holds piece VALUES in order

    def dfs(start: int) -> None:                       # start is an INDEX in 0..n
        if start == n:                                 # base: index one past last char
            results.append(path.copy())
            return
        for end in range(start, n):                    # end is an inclusive INDEX
            if is_pal[start][end]:                     # O(1) check
                path.append(s[start:end + 1])          # +1: exclusive slice end
                dfs(end + 1)
                path.pop()

    dfs(0)
    return results
```

Two table-filling notes an interviewer may probe:

- **Fill order matters:** `is_pal[i][j]` depends on `is_pal[i+1][j−1]`, so iterate `i` from `n−1` down to 0 (equivalently, iterate by substring length). Inside a row, any `j` order works because only row `i+1` is read.
- `j - i < 2` covers length 1 (always a palindrome) and length 2 (two equal chars), and its short-circuit placement prevents reading the meaningless empty cell `is_pal[i+1][i]`.

### 5.3 Trace on Example 1: `s = "aab"`

Palindrome table (`T` = palindrome; only `j ≥ i` cells meaningful):

| i \ j | 0 (`a`) | 1 (`a`) | 2 (`b`) |
|---|---|---|---|
| **0** | T | T (`"aa"`) | F (`"aab"`) |
| **1** | — | T | F (`"ab"`) |
| **2** | — | — | T |

DFS call tree (`path` holds values; `start`/`end` are indices):

```text
dfs(0) path=[]
├─ end=0: s[0:1]="a"  pal ✓ → path=["a"]
│  dfs(1) path=["a"]
│  ├─ end=1: s[1:2]="a"  pal ✓ → path=["a","a"]
│  │  dfs(2) path=["a","a"]
│  │  └─ end=2: s[2:3]="b" pal ✓ → path=["a","a","b"]
│  │     dfs(3): start==n → RECORD ["a","a","b"]; pop
│  │  pop → path=["a"]
│  ├─ end=2: s[1:3]="ab" ✗ (is_pal[1][2]=F) → prune
│  └─ pop → path=[]
├─ end=1: s[0:2]="aa" pal ✓ → path=["aa"]
│  dfs(2) path=["aa"]
│  └─ end=2: s[2:3]="b" pal ✓ → path=["aa","b"]
│     dfs(3): start==n → RECORD ["aa","b"]; pop
└─ end=2: s[0:3]="aab" ✗ → prune

Result: [["a","a","b"], ["aa","b"]]  ✓  (rows emitted shortest-first-piece first)
```

### 5.4 Trace on Example 2: `s = "a"`

`n = 1`; `is_pal[0][0] = T`. `dfs(0)`: `end=0`, piece `"a"` ✓, recurse → `dfs(1)`, `start == n == 1` → record `["a"]`. Output: `[["a"]]` ✓. Note there are **zero gaps**, so `2^(n−1) = 1` possible partition — the base case fires exactly once.

### 5.5 Narration script (what to say while coding)

- "We must return *every* partition, and the number of partitions can be exponential — at most 2 to the n−1, about 33K for n = 16 — so backtracking is the intended approach."
- "I build left to right. State = `start`, the index where the next piece begins. I try every `end ≥ start`; whenever `s[start..end]` is a palindrome I take it, recurse from `end + 1`, then pop."
- "Base case: `start == n` — every piece was validated on the way down, so I snapshot a *copy* of the path."
- "The palindrome test is a reversed-slice compare, fine at n = 16; to scale I'd precompute the n×n table with 'endpoints match and the inside is a palindrome.'"
- "Time is O(n·2ⁿ) dominated by writing the output — an all-'a' string makes every partition valid — plus O(n²) preprocessing."

## 6. Complexity

| Approach | Time | Extra space (excl. output) | Output size | Notes |
|---|---|---|---|---|
| Brute force over all 2ⁿ⁻¹ cut sets | O(n·2ⁿ) | O(n) | Θ(n·2ⁿ) | Validates after building; wasteful but fine at n ≤ 16 |
| Backtracking, on-the-fly reversal check | O(n·2ⁿ) | O(n) stack + path | Θ(n·2ⁿ) | Same order, larger constants |
| **Backtracking + O(1) pal table (recommended)** | **O(n² + n·2ⁿ)** | **O(n²) table + O(n) stack** | Θ(n·2ⁿ) | n² = 256 cells at n = 16; the table is what carries over to LC 132 |

**Justifications.** Upper bound: there are ≤ 2ⁿ⁻¹ leaves (one per cut-subset), and recording each leaf copies a path whose pieces total n characters → O(n·2ⁿ) output work, plus O(n²) preprocessing. Lower bound: any correct algorithm needs Ω(n·2ⁿ) on `s = "a"×n`, because *every* one of the 2ⁿ⁻¹ partitions is valid and each row contains n characters, so merely writing the output costs that much. Why the naive-check variant doesn't degrade to O(n²·2ⁿ): at most 2^(k−1) DFS nodes exist at `start = k`, each doing O((n−k)²) check work, and Σₖ 2^(k−1)(n−k)² = Θ(2ⁿ) since Σ m²/2ᵐ converges — so output copying dominates either way.

## 7. Test cases to propose out loud (before or while coding)

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | `"aab"` | `[["a","a","b"],["aa","b"]]` | Official; mixed 1- and 2-char pieces |
| 2 | `"a"` | `[["a"]]` | Official; n = 1, zero gaps, base case fires once |
| 3 | `"abcd"` | `[["a","b","c","d"]]` | No multi-char palindromes → **exactly one** row (answer can be tiny) |
| 4 | `"aaaa"` | **8 rows** (2³): all compositions of 4, e.g. `["a","a","a","a"]`, `["aa","aa"]`, `["a","aaa"]`, `["aaaa"]`, … | All-same-char = worst case; row count must equal 2ⁿ⁻¹ = 8; duplicate piece values are legitimate |
| 5 | `"aba"` | `[["a","b","a"],["aba"]]` | Whole string is a palindrome → the single-piece row must appear |
| 6 | `"aa"` | `[["a","a"],["aa"]]` | Smallest case with a branching decision |

Say out loud: "I'll check n = 1, all-distinct letters (exactly one row), all-same letters (2ⁿ⁻¹ rows, the max-output stress case), and a fully palindromic string." A strong extra: **cross-validate** — run the DFS and the §3 brute force over all strings of length ≤ 8 and assert the result sets are equal; it catches slicing and pop bugs instantly.

## 8. Common mistakes

| Mistake | Why it breaks | Fix |
|---|---|---|
| `results.append(path)` (live reference) | Every row aliases the same list; after unwinding, all rows render as `[]` or the last state | `results.append(path.copy())` (also `path[:]`, `list(path)`) |
| Forgetting `path.pop()` after recursion | Stale pieces leak into sibling branches → wrong/duplicated rows | Pop is the mirror of append; write them together |
| Slice off-by-one: `s[start:end]` with inclusive `end` | Silently drops the last character; `"aa"` becomes `"a"`, pruned branches change | `s[start:end + 1]` — or switch `end` to an exclusive convention *consistently* |
| `dfs(end)` instead of `dfs(end + 1)` | Re-consumes the last character / fails to advance → infinite recursion or wrong partitions | Next start is one past the inclusive end |
| Base case `start == n - 1` or `start > n` | Records too early or never | Record exactly when `start == n` (index one past the last char) |
| Greedy longest-palindrome-prefix | Returns one partition, not all | Must branch on **every** palindromic prefix |
| Deduplicating rows with repeated pieces | `["a","aa","a"]` vs `["aa","a","a"]` are distinct correct answers | Dedupe by cut structure only, never by piece multiset — and only if asked |
| Confusing substring with subsequence | Pieces must be contiguous and cover `s` exactly | Re-state the contract before coding |

### 8.1 Java / C++ gotchas (quick reference)

| Language | Gotcha | Fix / note |
|---|---|---|
| Java | `results.add(path)` stores a shared mutable reference — the classic aliasing bug | `results.add(new ArrayList<>(path))` |
| Java | `substring(begin, end)` is **end-exclusive** — actually convenient here | `s.substring(start, end + 1)`; note substring *copies* (O(len)) since Java 7u6 |
| C++ | `s.substr(pos, len)`'s second argument is a **length, not an end index** | `s.substr(start, end - start + 1)` — the most common C++ off-by-one on this problem |
| C++ | Passing `std::string` by value into the DFS copies per call | Pass `const std::string&`; `res.push_back(path)` value-copies the row, which is exactly what you want |
| Python | `is_pal[i+1][j-1]` with length-2 windows would read a junk cell | Safe here only because `j - i < 2` short-circuits first — keep that operand order |

## 9. Transferable patterns & related problems

**Patterns to internalize:**

1. **"Enumerate all segmentations" template:** `dfs(start)` → try every valid first-piece end → recurse from `end + 1` → undo. Base case at `start == n`. This exact skeleton solves Restore IP Addresses, Word Break II, and Decode Ways variants.
2. **Three questions for any "partition/segment" problem:** *list all* → backtracking (this problem); *best/min cost* → DP over the same `start` states (LC 132); *count* → DP counting paths in the same implicit DAG. Same state graph, three output modes.
3. **Precompute per-piece predicates with substructure.** "Endpoints match and the inside satisfies the property" is the palindrome recurrence; the resulting `is_pal` table is reusable infrastructure across the palindrome-partition family.
4. **"Return all" ⇒ output-size lower bound.** When the answer can be exponential, exhaustive search *is* optimal in the worst case — recognizing this (and saying it) is itself an interview signal.

**Related problems:**

| Problem | Relationship |
|---|---|
| LC 132 Palindrome Partitioning II | Same `is_pal` table + min-cut DP over `start` → O(n²); no enumeration needed |
| LC 1745 Palindrome Partitioning IV | "Can split into 3 palindromes?" — `is_pal` table + O(n²) scan of two cut points |
| LC 1278 Palindrome Partitioning III | Partition into ≤ k parts minimizing changes — 2D DP, same substructure |
| LC 93 Restore IP Addresses | Backtracking over cut points with per-piece constraints (0–255, no leading zeros) |
| LC 139 / 140 Word Break I & II | Feasibility of segmentation (1D DP) vs enumerating all segmentations (backtracking) |
| LC 91 Decode Ways | Segmented interpretation with per-piece validity (1–26, leading-zero rules) |
| LC 78 Subsets / LC 46 Permutations / LC 22 Generate Parentheses | The same choose → recurse → unchoose template on other state spaces |

## 10. Say it in 60 seconds

> "Since we need *every* partition and partitions can be exponential — at most two-to-the-fifteen rows for n up to sixteen — backtracking is the intended solution, not something to avoid. I build left to right: my state is `start`, the index where the next piece begins. I try every end from `start` onward; whenever that piece is a palindrome I take it, recurse from end plus one, then pop it and try the next end. When `start` reaches the string's length, every piece was already validated on the way down, so I record a *copy* of the path. For the palindrome test, the simple reversed-string comparison is fine at this size; to scale, I'd precompute an n-by-n table using 'end characters match and the inside is a palindrome,' making each check constant time. Total time is O of n times two-to-the-n — dominated by writing the output, since an all-'a' string makes every partition valid — plus O of n-squared preprocessing. Bugs I'm watching for: copying the path at the leaf, the inclusive end index in the slice, and popping after each recursion."
