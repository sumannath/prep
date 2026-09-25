# Decode Ways (LeetCode 91) — Complete Interview Lesson

## 1. Problem restated in your own words

Given a string `s` of digits, count the number of ways to split it into consecutive chunks where **every chunk is a valid code**: either a single character `'1'`–`'9'`, or a two-character string whose value is `10`–`26`. Each valid chunk maps to one letter (`"1"`→A, …, `"26"`→Z). Every character must be consumed by exactly one chunk. If no full split exists, return `0`.

Three precision points to lock in before touching code:

- **Codes are literal strings, not integers.** The code set is exactly `{"1", "2", …, "26"}`. `"06"` is a *different string* from `"6"` and is not a code. A bare `"0"` is not a code at all.
- **Index vs. value.** `s` is 0-indexed and `s[i]` is a digit *character*. When reasoning about validity you convert to numeric *values* (`10 ≤ v ≤ 26`) — but a conversion must never *erase* the leading-zero information (that's the classic bug, see §8).
- **What is counted.** We count valid *groupings* (partitions), not distinct output strings. In this problem the two coincide — single-digit codes map to letters A–I and two-digit codes to J–Z, disjoint letter sets, so two different groupings can never produce the same string — but the invariant you compute is "number of valid groupings."

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 ≤ len(s) ≤ 100` | Linear DP is trivially fast enough; naive recursion is **not** (a branching tree of depth 100 has ~10³⁰ nodes in the worst case). |
| Only digits, may contain leading zeros | A `'0'` can never stand alone and no pair may start with `'0'`. Every `'0'` must be absorbed by a `"10"` or `"20"` pair — otherwise the answer is `0`. |
| Answer fits in a 32-bit int | Use plain `int` in Java/C++ — no big integers. It also hints the tests keep the count small: an all-`'1'` string of length 46 already has more than 2³¹−1 decodings, because the decodings of an all-ones string correspond exactly to compositions of `n` into parts 1 and 2, which are counted by the Fibonacci number `F(n+1)` (`F(47) ≈ 2.97 × 10⁹ > 2,147,483,647`). |
| Length ≥ 1 (no empty input) | You still define `dp[0] = 1` as the algebraic base case (§4); if a variant ever allowed `""`, return `0` explicitly for it. |

## 3. Brute force: recursion over suffixes

Define `ways(i)` = number of ways to decode the **suffix** `s[i:]`.

- Base: `ways(n) = 1` — the empty suffix has exactly one decoding (the empty one).
- `ways(i) = 0` if `s[i] == '0'` (no code starts there).
- Otherwise: take one char (`+ ways(i+1)`), plus take two chars if `s[i:i+2]` is in `10..26` (`+ ways(i+2)`).

```python
def num_decodings_brute(s: str) -> int:
    n = len(s)

    def ways(i: int) -> int:
        if i == n:
            return 1                     # consumed everything: one valid decoding
        if s[i] == '0':
            return 0                     # '0' cannot start any code
        count = ways(i + 1)              # one-char code s[i]
        if i + 1 < n and (s[i] == '1' or (s[i] == '2' and s[i + 1] <= '6')):
            count += ways(i + 2)         # two-char code s[i:i+2] in 10..26
        return count

    return ways(0)
```

### Worked trace on `s = "226"` (n = 3)

```
ways(0) on "226"
├── chunk "2"  → ways(1) on "26"
│   ├── chunk "2"  → ways(2) on "6"
│   │   └── chunk "6"  → ways(3) "" = 1      grouping (2|2|6) → BBF
│   └── chunk "26" → ways(3) "" = 1          grouping (2|26)  → BZ
└── chunk "22" → ways(2) on "6"
    └── chunk "6"  → ways(3) "" = 1          grouping (22|6)  → VF
```

Leaves total **3** — matches the expected output (`BZ`, `VF`, `BBF`).

### Trace on `s = "06"`

`ways(0)` sees `s[0] == '0'` → returns `0` immediately. Correct: any grouping must start with chunk `"0"` (invalid) or `"06"` (not in `10..26`), so no grouping exists.

**Why it's slow:** each call spawns up to two recursive calls and the depth is at most `n`, so the call tree has at most `2^n` nodes; on all-ones input the call count is ~`F(n+1)` (≈ 5.7 × 10²⁰ at n = 100), because positions like `ways(2)` above get recomputed by multiple parents — textbook overlapping subproblems.

## 4. The core insight

Flip from suffixes to **prefixes** and write the recurrence by "what does the *last chunk* look like?"

Let `dp[i]` = number of ways to decode the prefix `s[:i]` (the first `i` characters). Any decoding of `s[:i]` falls into exactly one of **two disjoint, exhaustive families**:

1. **Last chunk = the single character `s[i-1]`.** Valid iff `s[i-1] != '0'`. Removing it leaves a decoding of `s[:i-1]` → contributes `dp[i-1]`.
2. **Last chunk = the two characters `s[i-2..i-1]`.** Valid iff that 2-char slice is literally in `"10"…"26"`. Removing it leaves a decoding of `s[:i-2]` → contributes `dp[i-2]`.

$$dp[i] = \mathbb{1}[s[i-1] \ne '0'] \cdot dp[i-1] \;+\; \mathbb{1}[\text{"10"} \le s[i-2..i-1] \le \text{"26"}] \cdot dp[i-2]$$

with **`dp[0] = 1`**: the empty prefix has exactly one decoding — the empty one. This is the multiplicative identity; it's what makes a pair branch at `i = 2` count correctly (`"10"` → 1 way, not 0). This is Fibonacci's recurrence with a **validity gate**, which is why the counts grow Fibonacci-fast and why the 32-bit guarantee matters.

⚠️ **Convention warning:** in `dp[i]`, `i` is a *length* (chars consumed), so the character in play is `s[i-1]` and the pair is `s[i-2..i-1]`. In the top-down `ways(i)`, `i` is an *index*. Do not mix the two mid-solution — that's where most off-by-one bugs in this problem come from.

## 5. Optimal approach

### 5.1 Top-down memoization (O(n) states)

`ways` has only `n+1` distinct arguments (`0..n`), so memoization collapses the exponential tree to linear work. Recursion depth ≤ 101, far below Python's default limit of 1000.

```python
from functools import lru_cache

class Solution:
    def numDecodings(self, s: str) -> int:
        n = len(s)

        @lru_cache(maxsize=None)
        def ways(i: int) -> int:
            if i == n:
                return 1                     # empty suffix: exactly one way
            if s[i] == '0':
                return 0                     # '0' cannot start a code
            total = ways(i + 1)              # single-digit code
            if i + 1 < n and (s[i] == '1' or (s[i] == '2' and s[i + 1] <= '6')):
                total += ways(i + 2)         # two-digit code in 10..26
            return total

        return ways(0)
```

Note the pair check compares **characters**, never an integer that could hide a leading zero: `'1'` → `"10"..​"19"` all valid; `'2'` with second char `≤ '6'` → `"20".."26"`; anything else rejected.

### 5.2 Bottom-up with O(1) space (recommended in interviews)

`dp[i]` reads only `dp[i-1]` and `dp[i-2]` → two rolling variables. Invariant: *before* processing index `i`, `prev1 = dp[i-1]`, `prev2 = dp[i-2]`.

```python
class Solution:
    def numDecodings(self, s: str) -> int:
        n = len(s)
        prev2, prev1 = 0, 1          # dp[-1] placeholder (unused, guarded below), dp[0] = 1
        for i in range(1, n + 1):
            cur = 0
            if s[i - 1] != '0':      # last char is its own code
                cur += prev1         #   += dp[i-1]
            if i >= 2:               # last two chars form one code
                v = (ord(s[i - 2]) - 48) * 10 + (ord(s[i - 1]) - 48)
                if 10 <= v <= 26:    # "10".."26"; v >= 10 auto-rejects "0x"
                    cur += prev2     #   += dp[i-2]
            prev2, prev1 = prev1, cur
        return prev1                 # dp[n]
```

**Optional flourish:** you may early-return `0` the first time `cur == 0`. Once a prefix is undecodable, every later value stays 0: `dp[i+1]` draws only from `dp[i]` (single-char branch) or from `dp[i-1]` via the pair `s[i-1..i]` — and if `s[i-1] == '0'` that pair is invalid anyway, while if `s[i-1] != '0'` then `dp[i] = 0` already forces `dp[i-1] = 0`.

### 5.3 Traces on the official examples

**`"12"` → 2**

| `i` (prefix len) | char `s[i-1]` | single branch | pair branch `s[i-2..i-1]` | `dp[i]` |
|---|---|---|---|---|
| 1 | `'1'` | ✓ +`dp[0]`=1 | — | 1 |
| 2 | `'2'` | ✓ +`dp[1]`=1 | `"12"` = 12 ✓ +`dp[0]`=1 | **2** |

**`"226"` → 3**

| `i` | char | single branch | pair branch | `dp[i]` |
|---|---|---|---|---|
| 1 | `'2'` | ✓ +`dp[0]`=1 | — | 1 |
| 2 | `'2'` | ✓ +`dp[1]`=1 | `"22"` ✓ +`dp[0]`=1 | 2 |
| 3 | `'6'` | ✓ +`dp[2]`=2 | `"26"` ✓ +`dp[1]`=1 | **3** |

**`"06"` → 0**

| `i` | char | single branch | pair branch | `dp[i]` |
|---|---|---|---|---|
| 1 | `'0'` | ✗ (`'0'` alone) | — | 0 |
| 2 | `'6'` | ✓ +`dp[1]`=**0** | `"06"`: value 6, first char `'0'` → ✗ | **0** |

**Bonus `"10"` → 1** (the case that punishes a wrong `dp[0]`):

| `i` | char | single branch | pair branch | `dp[i]` |
|---|---|---|---|---|
| 1 | `'1'` | ✓ +1 | — | 1 |
| 2 | `'0'` | ✗ | `"10"` ✓ +`dp[0]`=1 | **1** |

## 6. How to narrate it in the interview (full script)

> "The input is all digits, length up to 100, and I need to *count* the ways to split it into codes `'1'`–`'9'` and `'10'`–`'26'`. Two ground rules I want to confirm: a `'0'` can never be a chunk by itself, and a chunk is a literal string, so `"06"` is not the code 6 and is invalid.
>
> Brute force: from position `i`, consume one char if it's not `'0'`, or two chars if they form 10–26, and count paths to the end. That's exponential because subproblems overlap — `ways(i+1)` and `ways(i+2)` get recomputed many times.
>
> Fix: DP over prefixes. `dp[i]` = ways to decode the first `i` characters, `dp[0] = 1` — one way to decode nothing. Then `dp[i]` gets `dp[i-1]` if `s[i-1] != '0'`, plus `dp[i-2]` if the last two chars form a value in 10–26. Since `dp[i]` only reads the previous two entries, two rolling variables give O(n) time, O(1) space.
>
> Sanity checks I'll run: `'226'` → 3, `'06'` → 0, `'10'` → 1, `'27'` → 1 (pair rejected, singles fine), `'0'` → 0, `'1111'` → 5 (Fibonacci sanity)."

## 7. Complexity

| Approach | Time | Space | Why |
|---|---|---|---|
| Pure recursion | O(2ⁿ) | O(n) stack | Each call spawns ≤ 2 calls, depth ≤ n → ≤ 2ⁿ nodes; all-ones input hits ~F(n+1) calls. |
| Memoized recursion | **O(n)** | O(n) memo + O(n) stack | `n+1` distinct states `0..n`, O(1) work each. |
| Bottom-up, dp array | O(n) | O(n) | Same recurrence, no recursion stack. |
| Bottom-up, rolling (recommended) | **O(n)** | **O(1)** | `dp[i]` needs only `dp[i-1]`, `dp[i-2]`. |

## 8. Common mistakes and language gotchas

| # | Mistake | Failure mode | Fix |
|---|---|---|---|
| 1 | Parsing a pair and checking `1 <= v <= 26` | `"06"` parses to 6 and wrongly counts as a pair (or a single) | Check the **string** range: pair valid iff first char is `'1'`, or first char is `'2'` and second is `≤ '6'`. Singles valid iff the char `!= '0'`. |
| 2 | Letting a bare `'0'` decode alone | `"10"` returns 2 instead of 1 | The single-branch gate `s[i-1] != '0'` is mandatory, not optional. |
| 3 | Setting `dp[0] = 0` | Every pair branch dies; `"12"` returns 1 | `dp[0] = 1` (the empty decoding is one way — the counting identity). |
| 4 | Mixing prefix/suffix conventions | Reading `s[i]` where the recurrence means `s[i-1]` | Pick one convention, write its definition in a comment, translate carefully. |
| 5 | **Python:** negative indices silently wrap | `dp[-1]` reads the *last* element instead of raising; `s[i-2:i]` at `i = 1` is `s[-1:1]` (garbage slice) | Guard the pair branch with `i >= 2`; never index `dp` with a possibly-negative value. |
| 6 | **Java:** `HashMap<Integer,Integer>` for memo/dp | Autoboxing turns every read/write into object allocation + hashing; noticeably slower | Use `int[n+1]` (fill with `-1` for memo); likewise prefer `(c - '0')` char math over `Integer.parseInt(s.substring(...))`, which allocates a string per step. |
| 7 | **C++:** `std::stoi(s.substr(...))` | Two hazards: per-step allocation, and `stoi("06") == 6` silently erases the leading zero — the exact bug in row 1 | Manual conversion `(c1-'0')*10 + (c2-'0')`, then require `10 <= v <= 26`. |
| 8 | Overflow assumptions | — | The **final** answer fits 32 bits by contract, so `int` suffices for the stated problem. Pedantically, an *intermediate* prefix count can exceed the final answer on adversarial inputs (a long all-`'9'` run followed by `'0'` collapses the tail to 0 while `dp` at the run's end is Fibonacci-scale), so `long`/`int64_t` costs nothing if you want insurance. |

## 9. Test cases to propose out loud (before or right after coding)

State these aloud — interviewers explicitly score this:

| Input | Expected | What it stresses |
|---|---|---|
| `"12"` | 2 | Official: single vs. pair overlap. |
| `"226"` | 3 | Official: two overlapping pair branches. |
| `"06"` | 0 | Official: leading-zero pair invalid. |
| `"0"` | 0 | Minimal undecodable input; `n = 1`. |
| `"10"` | 1 | `'0'` legal only inside a pair; validates `dp[0] = 1`. |
| `"100"` | 0 | Trailing dangling `'0'` kills everything. |
| `"27"` | 1 | Two-digit branch rejected (27 > 26) but singles still count — boundary check. |
| `"2101"` | 1 | Mid-string `'0'` prunes some branches, not all (only `2|10|1` survives). |
| `"1111"` | 5 | Fibonacci sanity: compositions of 4 with parts 1 and 2. |
| `"11106"` | 2 | The statement's own example: `(1,1,10,6)` and `(11,10,6)`; `(1,11,06)` correctly excluded. |

## 10. Transferable patterns and related problems

**Pattern name: 1-D prefix DP where the last move consumes a bounded window (Fibonacci-family).**

- **Recognition cues:** "count the number of ways to partition/decode/build…" + the decision at position `i` only looks back a fixed amount + validity is a *local* check on that window.
- **DAG view (unifies the family):** nodes are cut positions `0..n`; add an edge `i → j` iff `s[i:j]` is one valid chunk; the answer is the number of paths from `0` to `n`, and `dp[i]` counts paths reaching `i`. Here edges have length 1–2 gated by code validity. Changing *count* to *best* only changes the fold (sum → max/min), not the skeleton.
- **Space trick generalizes:** if chunks can be up to `k` characters, `dp[i] = Σ dp[i-ℓ]` over valid last chunks, and `k+1` rolling values give O(k) space.

| Related problem | Relationship |
|---|---|
| LC 70 Climbing Stairs | Identical recurrence, no validity gate (every 1- or 2-step is legal). |
| LC 746 Min Cost Climbing Stairs | Same skeleton, fold = min instead of sum. |
| LC 198 House Robber | Same "look back two" shape, fold = max, different validity logic. |
| LC 139 Word Break | Prefix DP; last-chunk validity = "slice in dictionary" instead of "slice in 10–26". |
| LC 140 Word Break II | Same DAG, but enumerate the paths → backtracking on top of the same structure. |
| LC 639 Decode Ways II | Adds `'*'`; branch counts multiply by the wildcard's options; modular arithmetic. |
| LC 93 Restore IP Addresses | Fixed-structure partition with per-chunk validity, but enumerate → backtracking. |

## 11. Say it in 60 seconds

> "Decode Ways is Fibonacci with a bouncer at the door. Let dp of i be the number of ways to decode the first i characters, with dp of 0 equal to 1 — there's one way to decode nothing. One left-to-right pass: if the current character isn't zero, it can be a code by itself, so add dp of i minus 1. If the last two characters form a number from 10 to 26, they can be one code together, so also add dp of i minus 2. The trap is zeros: a zero can't stand alone, and 'zero-six' is *not* the code 6 — so I validate the two-character slice against the literal range 10 to 26, never just its parsed value. Keep two rolling variables, one pass: O of n time, O of 1 space, answer is dp of n. Quick checks: '0-6' gives 0, '1-0' gives 1, '2-7' gives 1, '2-2-6' gives 3."
