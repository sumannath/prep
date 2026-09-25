# Generate Parentheses — Full Lesson (LeetCode 22)

## 1. Problem, restated precisely

Given an integer `n`, return **every** string over the alphabet `{`(`, `)}` that:

- has length exactly `2n` — positions (indices) `0 … 2n−1`,
- contains exactly `n` open parentheses and `n` close parentheses,
- is **well-formed**: reading left to right, the running balance `(#opens so far) − (#closes so far)` is `≥ 0` after every prefix and equals `0` at the end.

Equivalently (recursive definition): the empty string is balanced, and if `A` and `B` are balanced, so are `(A)` and `AB`. Both definitions define the same set — the **Catalan-many** balanced strings (§2).

Note what's *not* asked: no ordering requirement (LeetCode 22 accepts any order), no duplicates allowed in a meaningful sense (each distinct string once), and `n ≥ 1` per constraints (though `n = 0` should return `[""]` — the empty string is vacuously balanced — and our code will do that for free).

## 2. Decoding the constraints: what `n ≤ 8` is telling you

The answer count is the **n-th Catalan number** `Cₙ = C(2n, n) / (n + 1)` — a closed form obtainable via the reflection principle, which subtracts the "dip below zero" paths from all `C(2n, n)` arrangements of `n` opens and `n` closes.

| `n` | Answers `Cₙ` | Candidate strings `4ⁿ = 2²ⁿ` | Max recursion depth `2n` |
|---|---|---|---|
| 1 | 1 | 4 | 2 |
| 2 | 2 | 16 | 4 |
| 3 | 5 | 64 | 6 |
| 4 | 14 | 256 | 8 |
| 5 | 42 | 1,024 | 10 |
| 6 | 132 | 4,096 | 12 |
| 7 | 429 | 16,384 | 14 |
| 8 | 1,430 | 65,536 | 16 |

Interview takeaways to say out loud:

- The **output itself is exponential** (`C₈ = 1430` strings). No polynomial-in-`n` algorithm can list them all, because the output has `Θ(n · Cₙ)` characters and any correct algorithm must spend at least that long just writing them — the trivial output-size lower bound. Your job is therefore **not** "avoid exponential time"; it's "never do more work than the output demands."
- `2n ≤ 16` means recursion depth is trivial (Python's default limit is 1000; Java/C++ stacks are fine).
- Because `n ≤ 8`, even a dumb `O(n · 4ⁿ)` filter passes — but the interviewer wants the pruned construction.

## 3. Brute force: enumerate all `4ⁿ` strings, filter

### 3.1 Idea + code

Treat the string as `2n` independent slots; each slot takes `(` or `)`. Enumerate all `2^(2n) = 4ⁿ` candidates, keep the ones that pass a balance check (the counter version of LC 20 *Valid Parentheses*):

```python
from itertools import product

def generate_parentheses_bf(n: int) -> list[str]:
    def well_formed(s) -> bool:
        bal = 0
        for ch in s:                     # one pass tracks every prefix's balance
            bal += 1 if ch == "(" else -1
            if bal < 0:                  # a prefix with more ')' than '(' can never recover
                return False
        return bal == 0                  # every opener must be closed

    return ["".join(chars) for chars in product("()", repeat=2 * n) if well_formed(chars)]
```

### 3.2 Worked trace — `n = 2`, exhaustive

All `2⁴ = 16` candidates in lexicographic order (`(` < `)`). Balance shown after each of the 4 characters (index 0 → 3):

| # | String | Balance after each char | Verdict | Reason |
|---|---|---|---|---|
| 1 | `((((` | 1, 2, 3, 4 | reject | ends at 4 ≠ 0 (unclosed) |
| 2 | `((()` | 1, 2, 3, 2 | reject | ends at 2 ≠ 0 |
| 3 | `(()(` | 1, 2, 1, 2 | reject | ends at 2 ≠ 0 |
| 4 | `(())` | 1, 2, 1, 0 | **accept** | |
| 5 | `()((` | 1, 0, 1, 2 | reject | ends at 2 ≠ 0 |
| 6 | `()()` | 1, 0, 1, 0 | **accept** | |
| 7 | `())(` | 1, 0, −1, … | reject | balance −1 first at index 2 |
| 8 | `()))` | 1, 0, −1, −2 | reject | balance −1 at index 2 |
| 9–16 | `)((((", ")(()"`, `)()(", ")())", "))((", "))()", ")))(", "))))"` | −1 at index 0 | reject | every string starting with `)` dips immediately |

Output: `["(())", "()()"]` — exactly `C₂ = 2`. Only **2 of 16** candidates survive.

### 3.3 Cost

- Time: `4ⁿ` candidates × `O(n)` validation = **`O(n · 4ⁿ)`** (at `n = 8`: 65,536 × 16 ≈ 1M character checks — passes, but ~46× more candidates than answers, and that waste factor grows like `√π · n^{3/2}` because of the Catalan asymptotic derived in §6).
- Space: `O(n)` per candidate.

The fix is not a smarter *filter* — it's to **never construct a doomed candidate in the first place**.

## 4. Core insight: two local rules ⇒ zero dead ends

### 4.1 The rules

Build the answer left to right, tracking two counters (these are **counts of characters placed**, i.e., *values*, not indices):

- `open_used` = number of `(` placed so far,
- `close_used` = number of `)` placed so far.

At each step, exactly two choices are possible, each guarded by a feasibility rule:

1. **Place `(`** iff `open_used < n` (still have openers in budget).
2. **Place `)`** iff `close_used < open_used` — i.e., the current balance is positive, so this closer matches an existing unmatched opener.

### 4.2 Why this is enough — three guarantees

- **Soundness (never wrong):** both rules forbid any prefix whose balance would go negative, and cap opens at `n`. Every string the DFS builds stays feasible throughout.
- **Completeness (never misses):** take any well-formed string `s`. Every prefix of `s` satisfies `open_used ≤ n` (it only has `n` opens total) and `close_used ≤ open_used` (the definition of well-formed). So both guards always permit `s`'s next character, and by induction the DFS reaches `s` as a leaf.
- **No dead ends, no duplicates:** if `len < 2n`, at least one rule fires (if both failed we'd have `open_used = n` and `close_used ≥ open_used = n`, forcing `len = 2n` — contradiction). So *every leaf is a solution*. And since each branch appends a concrete character, two diverging paths differ at some index forever ⇒ **every solution is emitted exactly once, no dedup needed**.

That last bullet is the whole efficiency story: the search tree contains *only* nodes on paths to solutions. There is nothing to filter at the end.

### 4.3 A structural lens (useful for follow-ups): every solution is `(A)B`

Match the first `(` (index 0) with its closer — the first index where the balance returns to 0. The content between them is a balanced string `A` with `i` pairs; the suffix after it is a balanced string `B` with `n − 1 − i` pairs. This decomposition is **unique** (the first-return closer is determined by the string), so it generates each solution exactly once and directly yields the Catalan recurrence `Cₙ = Σᵢ Cᵢ · C_{n−1−i}` — see §5.4 for code and §9 for why this matters beyond this problem.

## 5. Optimal solution: DFS with two counters

### 5.1 Code (Python)

```python
def generate_parentheses(n: int) -> list[str]:
    res: list[str] = []
    path: list[str] = []          # shared mutable buffer; index len(path) is the next slot

    def backtrack(open_used: int, close_used: int) -> None:
        if len(path) == 2 * n:    # equivalently: open_used == close_used == n
            res.append("".join(path))   # snapshot! (join copies; appending `path` would alias)
            return
        if open_used < n:                 # Rule 1
            path.append("(")
            backtrack(open_used + 1, close_used)
            path.pop()                    # undo — mandatory on every branch
        if close_used < open_used:        # Rule 2
            path.append(")")
            backtrack(open_used, close_used + 1)
            path.pop()

    backtrack(0, 0)
    return res
```

Notes on the code:

- **Indices vs. values:** the recursion carries two *counts*; the only index that matters is `len(path) = open_used + close_used` — the position of the next character to write. Everything at lower indices is frozen for this branch.
- **`n = 0` falls out for free:** the base case fires immediately at the root, returning `[""]`.
- **Emission order is lexicographic** (ASCII `(` = 40 < `)` = 41, and we try `(` first) — which happens to match LeetCode's expected ordering exactly. Nice to mention, not required.
- Recursion depth is `2n ≤ 16`: no stack concerns in any language.

### 5.2 Trace — Example 1, `n = 3` (full search tree)

State shown as `(open_used, close_used)`. ✓ = leaf emitted; ✗ = rule blocks the edge.

```text
"" (0,0)
├── '(' → "(" (1,0)
│   ├── '(' → "((" (2,0)
│   │   ├── '(' → "(((" (3,0)                  o==n: only ')' legal from here
│   │   │   └── ')' → "((()" (3,1)
│   │   │       └── ')' → "((())" (3,2)
│   │   │           └── ')' → "((()))" (3,3)   ✓ emit 1
│   │   └── ')' → "(()" (2,1)
│   │       ├── '(' → "(()(" (3,1)
│   │       │   └── ')' → "(()()" (3,2)
│   │       │       └── ')' → "(()())" (3,3)   ✓ emit 2
│   │       └── ')' → "(())" (2,2)
│   │           ├── '(' → "(())(" (3,2)
│   │           │   └── ')' → "(())()" (3,3)   ✓ emit 3
│   │           └── ')' → ✗  c=3 > o=2, balance would go negative
│   └── ')' → "()" (1,1)
│       ├── '(' → "()(" (2,1)
│       │   ├── '(' → "()((" (3,1)
│       │   │   └── ')' → "()(()" (3,2)
│       │   │       └── ')' → "()(())" (3,3)   ✓ emit 4
│       │   └── ')' → "()()" (2,2)
│       │       ├── '(' → "()()(" (3,2)
│       │       │   └── ')' → "()()()" (3,3)   ✓ emit 5
│       │       └── ')' → ✗  pruned
│       └── ')' → ✗  c==o, ')' would unmatch
└── ')' → ✗  balance would hit −1 at index 0
```

Output: `["((()))", "(()())", "(())()", "()(())", "()()()"]` — matches Example 1 exactly. The tree has **22 nodes, 5 of them leaves**, and every node lies on a path to a solution: zero wasted branches (the brute force touched 64 candidates to find these same 5).

### 5.3 Trace — Example 2, `n = 1`

```text
"" (0,0) ──'('→ "(" (1,0) ──')'→ "()" (1,1) ✓ emit
root's ')' edge: ✗ pruned
```

Output: `["()"]`.

### 5.4 Variants and micro-notes

**String-concatenation variant** (no `pop`, no aliasing risk):

```python
def dfs(s: str, open_used: int, close_used: int) -> None:
    if len(s) == 2 * n:
        res.append(s)                     # strings are immutable → already a snapshot
        return
    if open_used < n:      dfs(s + "(", open_used + 1, close_used)
    if close_used < open_used: dfs(s + ")", open_used, close_used + 1)
```

Correct, and simpler to reason about — but each edge copies the whole prefix, making the total `O(n² · Cₙ)` instead of `Θ(n · Cₙ)`. Irrelevant at `n ≤ 8`; worth knowing the difference.

**Structural (Catalan) variant** from §4.3 — duplicate-free by construction:

```python
def generate_parentheses_struct(n: int) -> list[str]:
    memo: dict[int, list[str]] = {0: [""]}
    def build(k: int) -> list[str]:
        if k not in memo:
            memo[k] = [f"({a}){b}"
                       for i in range(k)           # i = pairs inside the first "( A )"
                       for a in build(i)
                       for b in build(k - 1 - i)]
        return memo[k]
    return build(n)
```

## 6. Complexity, with the math

| Approach | Time | Auxiliary space | Output size | Output-optimal? |
|---|---|---|---|---|
| Enumerate + filter (§3) | `O(n · 4ⁿ)` | `O(n)` | `Θ(n · Cₙ)` | No — wastes ~`√π·n^{3/2}`× the work at large `n` |
| **Backtracking (§5)** | **`Θ(n · Cₙ) ≈ O(4ⁿ/√n)`** | **`O(n)`** (depth `2n` + path + counters) | `Θ(n · Cₙ)` | **Yes, up to constant factors** |
| Catalan DP (count only, follow-up) | `O(n²)` | `O(n)` | `O(1)` | — |

Derivations you should be able to give in one breath each:

- **Answer count:** `Cₙ = C(2n, n)/(n+1)` — reflection-principle subtraction of never-negative path counts; by Stirling's approximation, `C(2n, n) ~ 4ⁿ/√(πn)`, so `Cₙ ~ 4ⁿ/(√π · n^{3/2})`.
- **Time = Θ(n · Cₙ):** each tree edge costs `O(1)` (append/pop) and each of the `Cₙ` leaves costs `O(n)` for the `join`. Node count is `O(n · Cₙ)`: every node is a feasible prefix, which extends to ≥ 1 leaf, and charging each node to the pair (some leaf below it, its length) is injective — a leaf has one prefix per length — giving ≤ `(2n+1) · Cₙ` nodes.
- **Lower bound:** any correct algorithm must write `Cₙ` strings of length `2n`, i.e., `Ω(n · Cₙ)` characters of output — so the backtracker is optimal up to constants. This is a plain output-size argument, not an information-theoretic one.

## 7. Common mistakes (and the symptom each one produces)

1. **Closer guard wrong: `close_used < n` instead of `close_used < open_used`.** Symptom: invalid strings like `"()))"` for `n = 2` appear in the output. The closer must match an *existing unmatched opener*.
2. **Base case wrong: emitting when `open_used == close_used` instead of `open_used == close_used == n` (or `len(path) == 2n`).** Symptom: `n = 3` returns short prefixes like `"()"`, `"(())"`. Balance-zero is not the finish line; full length is.
3. **Forgetting `path.pop()`** after each recursive call when using a shared list. Symptom: later branches inherit earlier branches' characters; results get longer / corrupted mid-run.
4. **`res.append(path)` instead of `res.append("".join(path))`.** Symptom: the result list contains many references to the *same* list — after the DFS finishes, every entry shows the last path (or empty lists). This is Python list aliasing, the #1 practical bug in this problem.
5. **"I got duplicates, let me put a `set` in front."** Duplicates are a symptom that your *generator* is wrong (e.g., permuting `n` opens and `n` closes gives `(n!)²` copies of each string; naïvely inserting `"()"` into every gap of `"()"` yields `"()()"` twice from gaps 0 and 2). The counter-guarded DFS produces each string exactly once — fix the generator, don't dedup. (Contrast: LC 301 *Remove Invalid Parentheses* genuinely needs dedup because different edit paths converge to the same string.)
6. **Assuming sorted output is required.** It isn't here, but the `'('`-first DFS gives lexicographic order anyway — free correctness signal: `assert res == sorted(res)`.

### 7.1 Python notes

- `"".join(path)` at the leaf = copy; `list(path)` also works; `path` alone does not.
- No overflow: counters ≤ 8, output ≤ 1430 strings.

### 7.2 Java / C++ notes

| Language | Gotcha | Fix / note |
|---|---|---|
| Java | Building `String` via `s + "("` in each call allocates a new object per edge | Fine at `n ≤ 8`; idiomatic version is `StringBuilder` + `sb.append(c)` on descent and `sb.deleteCharAt(sb.length() - 1)` on unwind — **forgetting the delete is the Java twin of the missing `pop()` bug** |
| Java | Snapshot at the leaf | `res.add(sb.toString())` — `toString` copies, which is exactly what you want; mutating the builder later must not affect stored results |
| C++ | Pass the path by reference: `void dfs(string& s, ...)` with `s.push_back(c)` / `s.pop_back()` | By-value also works but copies `O(n)` per edge; and never `res.push_back(std::move(s))` — moving empties the shared buffer and corrupts all sibling branches; copy at the leaf |
| Both | Overflow only appears in the *counting* follow-up with large `n` | Use the `O(n²)` Catalan recurrence with 64-bit ints; factorial-based binomials overflow 64-bit quickly |

## 8. Tests to propose out loud (before or while coding)

| # | Test | Expected | What it proves / what to say |
|---|---|---|---|
| 1 | `n = 3` (Example 1) | `["((()))","(()())","(())()","()(())","()()()"]` | 5 results = `C₃`; hand-trace target |
| 2 | `n = 1` (Example 2) | `["()"]` | smallest case; catches base-case off-by-ones |
| 3 | `n = 2` | `["(())","()()"]` | first case mixing nesting and juxtaposition; cheap full hand-trace |
| 4 | `n = 8` (max) | 1,430 strings, each length 16 | performance headroom; assert `len(out) == 1430` and `len(set(out)) == 1430` |
| 5 | `n = 0` (clarify — constraints say `≥ 1`) | `[""]` if allowed | my base case fires at the root, so it's handled with zero extra code |
| 6 | Property asserts (any `n`) | all lengths `== 2n`; every prefix balance `≥ 0`; `out == sorted(out)` | ten lines of self-verification — mention them even if you don't type them |

Scripted line to use: *"Before I code: I'll check `n = 1` gives exactly `["()"]`, `n = 3` gives the five strings from the example, and `n = 8` gives 1,430 unique strings — the 8th Catalan number. I'll also assert every result has length `2n` and never dips its balance negative."*

## 9. Transferable patterns, related problems, follow-ups

**Pattern 1 — Prune-while-building DFS (the big one).** Enumerate combinatorial objects by extending prefixes, carrying small state (counts, budgets, used-flags) that lets you *refuse* edges leading to dead ends. Cost is proportional to the surviving search tree, not the raw candidate space. Same skeleton as: Subsets (LC 78), Permutations (46), Combination Sum (39), Letter Combinations (17), Restore IP Addresses (93), Palindrome Partitioning (131), N-Queens (51), Sudoku Solver (37), Word Search (79).

**Pattern 2 — The balance counter for all bracket problems.** `balance = opens − closes`, invariant `balance ≥ 0`, final `balance == 0`. Recurs: Valid Parentheses (20), Valid Parenthesis String (678 — track the *range* of achievable balances greedily instead of enumerating), Minimum Remove to Make Valid (1249), Longest Valid Parentheses (32).

**Pattern 3 — Catalan structural decomposition `s = (A)B`.** Unique first-return split ⇒ duplicate-free generation and the counting DP `Cₙ = Σ Cᵢ · C_{n−1−i}` in `O(n²)` (justified by summing over the `i` pairs inside the first matched group). Recurs: Unique Binary Search Trees (96, counting), All Possible Full Binary Trees (894 — same enumerate-via-split code shape).

**Pattern 4 — Output-sensitive thinking.** When a problem asks you to *generate all X*, first compute (or estimate) `|X|`, then say: "I'll be optimal up to constants if my search tree is linear in the output." Interviewers love this framing.

**Likely follow-up questions:**
- *"Count them without generating."* → Catalan DP above (64-bit if `n` grows).
- *"Multiple bracket types `{}`, `[]`, `()`."* → same DFS, but keep a small stack of expected closers instead of one counter; each opener pushes its own closer.
- *"Lexicographic order guaranteed?"* → already true here because `'('` < `')'` and `'('` is tried first.
- *"Iterative version?"* → explicit stack of `(string, o, c)` states, or the classic next-Dyck-word successor; rarely needed in interviews.

## 10. Full interview talk track (expanded)

1. **Restate & clarify (~30s).** "Input is `n` pairs; I return every length-`2n` string with `n` opens and `n` closes whose running balance never goes negative and ends at zero. Two quick questions: is any output order acceptable, and must `n = 0` be handled? I'll assume any order and `n ≥ 1`, and my code will handle `n = 0` naturally anyway."
2. **Brute force, fast (~30s).** "All `4ⁿ` strings via product, keep those passing a one-pass balance check — `O(n · 4ⁿ)`. At `n = 8` that's 65,536 candidates for 1,430 answers, so most work is discarded. I'd rather only build strings that can still succeed."
3. **Insight (~45s).** "Build left to right with two counters: opens used and closes used. Two rules: add `(` iff opens used < `n`; add `)` iff closes used < opens used — that closer matches something still open. Soundness: rules keep every prefix feasible. Completeness: any well-formed string's prefixes satisfy the rules, so DFS reaches it. Uniqueness: diverging branches differ at some index, so no duplicates and no dedup needed."
4. **Code (~90s).** Write the backtracking function; narrate the base case `len == 2n` with a `join` snapshot, the two guards, and the `pop` on unwind. Mention the `res.append(path)` aliasing trap proactively.
5. **Trace + complexity (~60s).** Trace `n = 2` by hand (two leaves). "There are `Cₙ = C(2n,n)/(n+1)` answers — the Catalan numbers, about `4ⁿ / n^{3/2}` by Stirling — so exponential output is unavoidable. My tree's every node leads to a solution, so total time is `Θ(n · Cₙ)`, which matches the `Ω(n · Cₙ)` cost of just writing the output; auxiliary space is `O(n)`."
6. **Tests (~30s).** "`n = 1` → `["()"]`; `n = 3` → the five example strings; `n = 8` → 1,430 unique strings; assert lengths and the prefix invariant; `n = 0` → `[""]` if allowed."
7. **Offer follow-ups.** "If you want counts only, that's the Catalan DP in `O(n²)`. Multiple bracket types need a stack of expected closers instead of one counter."

## 11. Say it in 60 seconds

> "I need every balanced string of length `2n`. Brute force is all `4`-to-the-`n` strings filtered by a running-balance check, but I can prune while building: I track opens used and closes used, and at each position I add `(` only if I still have opens left, and `)` only if it matches an unmatched opener — closes used strictly less than opens used. Those two rules keep every prefix's balance non-negative, so there are no dead ends: every leaf is an answer, and since each branch appends a concrete character, every answer appears exactly once — no dedup. At length `2n` I snapshot the path and pop on the way back up. The answer count is the n-th Catalan number, roughly `4`-to-the-`n` over `n` to the three-halves, so exponential output is unavoidable; my time is linear in the output size — about `n` times Catalan — with `O(n)` extra space. I'd test `n = 1` gives `"()"`, `n = 3` gives the five example strings, and `n = 8` gives 1,430 unique results, asserting lengths and the prefix invariant. The same prune-as-you-build DFS skeleton solves subsets, permutations, and combination sum."
