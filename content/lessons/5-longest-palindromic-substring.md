# Longest Palindromic Substring — Complete Interview Lesson

**Difficulty:** Medium (LeetCode 5) | **Topic:** Strings, Two Pointers / Dynamic Programming | **Pattern:** Expand Around Center

---

## 1. Restating the Problem

> Given a string `s`, return the **longest contiguous substring** of `s` that reads the same forwards and backwards.

Key words to parse out loud in the interview:

- **Substring** — *contiguous*. This is not the Longest Palindromic **Subsequence** (a classic trap; subsequence allows skipping characters and requires DP with `O(n²)` DP regardless).
- **Longest** — we're optimizing length; if there are ties, any valid answer is acceptable (the examples confirm this: `"bab"` and `"aba"` are both accepted for `"babad"`).
- **Palindrome** — reads identically in both directions. Note palindromes come in two flavors by length parity:
  - **Odd-length**: single center character, e.g., `"bab"` (center = `b` at index 1).
  - **Even-length**: center falls *between* two characters, e.g., `"abba"` (center = between indices 1 and 2).

**Return value:** the substring itself, not its length or start index. (But internally you'll compute start/end indices and slice at the end.)

---

## 2. Decoding the Constraints

| Constraint | Value | What it tells us |
|---|---|---|
| `s.length` | 1 to 1000 | `n ≤ 1000` → an `O(n²)` solution does at most ~10⁶ operations. That's comfortably fast. Even an `O(n³)` brute force (10⁹ ops) is *borderline* — likely too slow in Python, possibly OK in C++. So the interviewer expects at least `O(n²)`. |
| Characters | digits + English letters | No spaces/unicode; case matters (`"Aa"` is **not** a palindrome). No need to normalize. |
| Min length | 1 | No empty-string input. A single character is always a palindrome of length 1 — a safe default answer. |

**Interview sound bite:** "n is at most 1000, so quadratic is fine — but I'd like to mention there's a linear Manacher's algorithm for follow-ups."

---

## 3. Brute Force: Check Every Substring

**Idea:** Enumerate all `(start, end)` pairs, check each substring for palindromicity, track the longest.

- Number of substrings: `n(n+1)/2` ≈ `O(n²)`.
- Each palindrome check: `O(n)`.
- **Total: `O(n³)` time, `O(1)` extra space.**

```python
def longestPalindrome_bruteforce(s: str) -> str:
    n = len(s)
    best = s[0]                      # single char is always a palindrome
    for i in range(n):
        for j in range(i, n):        # s[i..j] inclusive
            sub = s[i:j+1]
            if sub == sub[::-1] and len(sub) > len(best):
                best = sub
    return best
```

### Worked trace on `s = "babad"` (n = 4)

| i | j | substring | palindrome? | best so far |
|---|---|---|---|---|
| 0 | 0 | `"b"` | ✅ | `"b"` (len 1) |
| 0 | 1 | `"ba"` | ❌ | `"b"` |
| 0 | 2 | `"bab"` | ✅ | `"bab"` (len 3) |
| 0 | 3 | `"baba"` | ❌ | `"bab"` |
| 1 | 1 | `"a"` | ✅ | `"bab"` (not longer) |
| 1 | 2 | `"ab"` | ❌ | `"bab"` |
| 1 | 3 | `"aba"` | ✅ | `"bab"` (tie — `"aba"` also valid, we keep first) |
| 2 | … | `"b"`, `"ad"` | ✅ / ❌ | `"bab"` |
| 3 | 3 | `"d"` | ✅ | `"bab"` |

**Answer:** `"bab"` ✓ (note how we correctly rejected `"baba"` — contiguous, not palindromic — and recorded `"aba"` as a tie we didn't need to take).

### The inefficiency to point out

Checking `"bab"` and then `"baba"` re-verifies overlapping regions from scratch. Crucially: **a palindrome's own substrings that share its center are also palindromes** (e.g., inside `"bab"`, `"a"` is a palindrome). The brute force throws this structure away. That's the door to a better algorithm.

---

## 4. The Core Insight

**Every palindrome is symmetric around a center.** A center is either:

1. **A character** (odd-length palindromes): `n` possible centers.
2. **A gap between two adjacent characters** (even-length palindromes): `n − 1` possible centers.

Total: `2n − 1` centers.

**Expansion idea:** For each center, grow outward with two pointers while `s[left] == s[right]`. The moment they mismatch, that center is exhausted. Each expansion step extends the palindrome by exactly one character on each side, so the total work per center is at most `O(n)` — but in practice, mismatches terminate early.

- **Time: `O(n²)`** worst case (e.g., `"aaaa...a"` — every expansion runs to the boundary). ~2 × 10⁶ character comparisons at n = 1000. Fine.
- **Space: `O(1)`** extra (just indices).

This is dramatically better than brute force because expansion **reuses** the palindrome structure instead of re-checking from scratch.

---

## 5. Optimal Approach: Expand Around Center

### Algorithm

1. Keep two helper expansions:
   - `expand(l, r)`: expand while `l >= 0`, `r < n`, and `s[l] == s[r]`; return `(l, r)` — the **last valid** palindrome bounds (inclusive), i.e., return after the loop fails, stepping back by one.
2. For each index `i` in `0 .. n-1`:
   - Odd case: `expand(i, i)` — center at character `i`.
   - Even case: `expand(i, i + 1)` — center in the gap between `i` and `i+1`.
3. Track the best `(best_l, best_r)` by comparing lengths `r - l + 1`.
4. Return `s[best_l : best_r + 1]`.

### Code

```python
def longestPalindrome(s: str) -> str:
    n = len(s)
    if n < 2:
        return s

    best_l, best_r = 0, 0  # inclusive bounds; at least length 1

    def expand(l: int, r: int) -> tuple[int, int]:
        # Expand while in bounds and characters match.
        while l >= 0 and r < n and s[l] == s[r]:
            l -= 1
            r += 1
        # Loop overshoots by one step; step back to last valid palindrome.
        return l + 1, r - 1

    for i in range(n):
        # Odd-length: center at i
        l1, r1 = expand(i, i)
        if r1 - l1 > best_r - best_l:
            best_l, best_r = l1, r1
        # Even-length: center between i and i+1
        l2, r2 = expand(i, i + 1)
        if r2 - l2 > best_r - best_l:
            best_l, best_r = l2, r2

    return s[best_l : best_r + 1]
```

**Note on the comparison:** I compare `r1 - l1 > best_r - best_l` (length − 1) rather than computing `r - l + 1`. Using strict `>` means the **first** longest palindrome found wins — matching `"bab"` over `"aba"` for the first example, though either is accepted.

### Trace on Example 1: `s = "babad"` (n = 5)

| i | odd expand(i, i) | result | even expand(i, i+1) | result | best |
|---|---|---|---|---|---|
| 0 | `s[0]==s[0]`='b'; then `l=-1` stops | (0,0) len 1 | `s[0]='b'` vs `s[1]='a'` ❌ | (0,0)→ back to (0,−1)? No: loop never ran, return (0,0)? | (0,0) len 1 |
| 1 | `s[1]==s[1]`='a'; expand: `s[0]='b'` vs `s[2]='b'` ✅; next `l=-1` stops | (0,2) len 3 | `s[1]='a'` vs `s[2]='b'` ❌ | (1,1)→ loop never ran → returns (2,1), len 0 | **(0,2)** len 3 = `"bab"` |
| 2 | center 'b': `s[1]='a'` vs `s[3]='a'` ✅; `s[0]='b'` vs `s[4]='d'` ❌ | (1,3) len 3 | `s[2]='b'` vs `s[3]='a'` ❌ | len 0 | (0,2) kept (tie, first wins) |
| 3 | center 'a': `s[2]='b'` vs `s[4]='d'` ❌ | (3,3) len 1 | `s[3]='a'` vs `s[4]='d'` ❌ | len 0 | (0,2) |
| 4 | center 'd' | (4,4) len 1 | `r=5` out of bounds | len 0 | (0,2) |

**Answer:** `s[0:3] = "bab"` ✓ (with `"aba"` a valid tie).

⚠️ **Gotcha visible in the trace:** for the even expansion with a mismatch, `expand(i, i+1)` returns `(i+1, i)` — an "inverted" range of length 0. The `r - l > best_r - best_l` comparison naturally rejects it (`0 > 0` is false), so no special-casing needed. But if you compute `r - l + 1` and compare with `>=`, you could accidentally overwrite a length-1 best with a length-0 range. Keep comparisons strict and consistent.

### Trace on Example 2: `s = "cbbd"` (n = 4)

| i | odd expand(i, i) | even expand(i, i+1) | best |
|---|---|---|---|
| 0 | 'c' alone, neighbors 'c' vs 'b' ❌ → (0,0) len 1 | 'c' vs 'b' ❌ → len 0 | (0,0) |
| 1 | 'b'; `s[0]='c'` vs `s[2]='b'` ❌ → (1,1) len 1 | **`s[1]='b'` vs `s[2]='b'` ✅**; expand: `s[0]='c'` vs `s[3]='d'` ❌ → **(1,2) len 2 = `"bb"`** | **(1,2)** |
| 2 | 'b'; 'b' vs 'd' ❌ → len 1 | 'b' vs 'd' ❌ | (1,2) |
| 3 | 'd' alone → len 1 | out of bounds | (1,2) |

**Answer:** `s[1:3] = "bb"` ✓ — the even-center case was *essential* here; an odd-only implementation returns `"c"`, a classic wrong answer.

---

## 6. Alternative: Bottom-Up Dynamic Programming (Worth Mentioning)

Define `dp[i][j] = True` iff `s[i..j]` is a palindrome.

- **Base cases:** `dp[i][i] = True` (length 1); `dp[i][i+1] = (s[i] == s[i+1])` (length 2).
- **Transition:** `dp[i][j] = (s[i] == s[j]) and dp[i+1][j-1]` — a palindrome is matching endpoints around a smaller palindrome.
- Fill by increasing substring length (or iterate `i` downward, `j` upward) and track the longest `True` cell.

```python
def longestPalindrome_dp(s: str) -> str:
    n = len(s)
    if n < 2:
        return s
    dp = [[False] * n for _ in range(n)]
    best_l, best_r = 0, 0
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            if s[i] == s[j] and (j - i < 2 or dp[i + 1][j - 1]):
                dp[i][j] = True
                if j - i > best_r - best_l:
                    best_l, best_r = i, j
    return s[best_l : best_r + 1]
```

**Same `O(n²)` time, but `O(n²)` space** — a full 1000×1000 boolean table (~1M entries; in Python that's a nontrivial memory chunk, and in Java a `boolean[1000][1000]` is 1 MB, fine, but the *constant factor* is far worse than expand-around-center's `O(1)`).

**When to choose which:** Expand-around-center dominates in interviews — simpler, less memory, easier to trace. Mention DP to show breadth, then say why you'd still pick expansion. If the interviewer asks "can we do better than `O(n²)`?", the answer is **Manacher's algorithm** (`O(n)` time, `O(n)` space): it transforms the string (interleaving a separator like `#` to unify odd/even centers) and reuses previously computed palindrome radii via mirror symmetry — worth describing in one or two sentences, rarely required to code in a 45-minute interview.

---

## 7. Complexity Summary

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (all substrings) | O(n³) | O(1) | ~10⁹ ops at n=1000; too slow in Python |
| **Expand around center (recommended)** | **O(n²)** | **O(1)** | 2n−1 centers, ≤ O(n) work each |
| DP table | O(n²) | O(n²) | Same time, worse space; useful if DP is the interview theme |
| Manacher's algorithm | O(n) | O(n) | Follow-up only; the O(n) claim is justified by the fact that each expansion step either advances the rightmost palindrome boundary `r` monotonically or is answered in O(1) from the mirrored radius, so total expansions are bounded by n |

---

## 8. Edge Cases and Test Plan (Say These Out Loud)

Before coding, propose:

1. **`s = "babad"`** → `"bab"` (or `"aba"`). Official example 1; exercises odd centers.
2. **`s = "cbbd"`** → `"bb"`. Official example 2; exercises **even centers** — this kills odd-only solutions.
3. **`s = "a"`** → `"a"`. Single character; confirms no `n < 2` crash and the default answer.
4. **`s = "ac"`** → `"a"` (or `"c"`). Two distinct characters: no even palindrome, length-1 fallback. Catches off-by-one bugs on the even expansion.
5. **`s = "aaaa"`** → `"aaaa"`. All identical characters: the worst case for expansion (every center runs to the boundary), confirms `O(n²)` doesn't time out and that you keep the **longest** (not the first full-string expansion result prematurely). Also stresses the even-chain behavior.
6. *(Optional, nice to mention)* **`s = "abacdfgdcaba"`** → `"aba"`: two identical length-3 palindromes at both ends — tests tie-breaking and that you don't get confused by duplicate palindromes.

After coding, mentally run tests 2 and 4 through the code — they're the most bug-revealing.

---

## 9. Common Mistakes

| # | Mistake | Why it bites | Fix |
|---|---|---|---|
| 1 | **Forgetting even centers** | Returns `"c"` for `"cbbd"` — the single most common wrong answer on this problem. | Always run both `expand(i, i)` and `expand(i, i+1)`. |
| 2 | **Off-by-one on expansion return** | After the while loop, `l` and `r` have each overshot by one step. Returning `(l, r)` gives a non-palindrome / inverted range. | Return `(l + 1, r - 1)`. |
| 3 | **Inclusive vs exclusive bounds confusion** | Mixing `s[l:r]` (exclusive `r`) with `(l, r)` computed inclusively slices off the last character. | Decide: my expansion returns *inclusive* `(l, r)`, so slice with `s[l : r + 1]`. |
| 4 | **`>=` instead of `>` when updating best** | Not a correctness bug for the judge (any longest palindrome is accepted), but with a length-0 even result it *can* overwrite a real best with `r < l` if your length math is sloppy. | Use strict `>`, and compare `r - l` (or `r - l + 1`) consistently. |
| 5 | **Treating the problem as subsequence** | Jumping into the `O(n²)` subsequence DP (which needs full-table fill + reconstructing the string) when contiguous expansion is far simpler. | Listen for "substring" = contiguous. |
| 6 | **Case sensitivity assumptions** | Assuming `"Aa"` is a palindrome. The constraint says digits and letters, case-sensitive. | Compare raw characters; don't lowercase unless asked. |
| 7 | **Not handling `n == 1` early** | The main loop still works for `n == 1` (returns `s[0:1]`), but an early `if n < 2: return s` makes intent clear and guards helper logic. | Cheap guard, cheap insurance. |

**Java/C++ gotchas (one-liners):**

- **Java:** returning a substring via `s.substring(l, r + 1)` copies the characters — it's `O(length)` per call, so build the result **once** at the end from tracked indices rather than calling `substring` inside the loop. Also, don't use `==` on `Character` objects if you've boxed characters (`Character` autoboxing caches only −128..127, so `==` on boxed chars above 127 compares references); compare `char` primitives or use `charAt`.
- **C++:** avoid `substr` in a loop for the same copy-cost reason — track `bestL`/`bestR` ints and do `s.substr(bestL, bestR - bestL + 1)` once. If you write the DP variant, `vector<vector<bool>>` of 1000×1000 is fine memory-wise, but iterating with `j - i` as the outer loop (by length) is required for the transition to be valid; and beware `int` is fine here (n ≤ 1000, no overflow), so no `long long` needed.

---

## 10. Transferable Patterns & Related Problems

**The pattern this problem teaches:**

- **Center expansion / symmetry exploitation:** many string problems reduce to "anchor a small structure (center, pair, window) and expand outward," avoiding redundant recomputation.
- **Odd/even duality:** whenever a "middle" can be a character or a gap, handle both — appears in palindrome problems, median-of-two-sorted-arrays, and binary-search-on-answer bounds.
- **Reuse structure to beat brute force:** same spirit as KMP (reusing prefix info) and Manacher (reusing mirror radii).

**Related problems to practice after this one:**

| Problem | Relationship |
|---|---|
| LC 647 — Palindromic Substrings | Same expand-around-center technique; count all palindromic substrings instead of tracking the longest |
| LC 516 — Longest Palindromic Subsequence | The *subsequence* trap in reverse — needs `O(n²)` DP; great contrast problem |
| LC 125 — Valid Palindrome | The atomic palindrome check with two pointers |
| LC 131 — Palindrome Partitioning | Builds on "which prefixes are palindromes" — DP precomputation |
| LC 214 — Shortest Palindrome | Harder variant using KMP-style insight |
| LC 266 / 409 — Palindrome Permutation(s) | Palindrome *properties* via character counts, not substrings |

---

## 11. Say It in 60 Seconds

> "So the problem asks for the longest **contiguous** palindrome — not a subsequence, so I don't need heavy DP. Brute force checks all n-squared substrings at O(n) each, which is cubic — too slow for n up to 1000 in Python. The key insight is that every palindrome is symmetric around a center, and there are exactly 2n−1 centers: n characters for odd-length palindromes and n−1 gaps for even-length ones. So I expand around each center with two pointers while the characters match, track the longest palindrome seen, and that's O(n²) time worst case — fine for n ≤ 1000 — with O(1) extra space, just two index bounds I slice at the end. I'll be careful with two things: I must run both the odd expansion, center at i, *and* the even expansion, center between i and i+1 — otherwise 'cbbd' fails — and my expand helper overshoots by one step when the loop breaks, so I return l+1, r−1 and slice inclusively. I'd test 'babad', 'cbbd', a single char, two distinct chars like 'ac', and all-equal 'aaaa' which is the worst case. If asked for better than quadratic, I'd mention Manacher's linear algorithm, which reuses mirror radii — happy to sketch it."

---

### Quick Recap Card

- **Solution:** expand around all `2n − 1` centers; track best inclusive `(l, r)`; slice once.
- **Complexity:** `O(n²)` time, `O(1)` space.
- **Non-negotiables:** even centers, overshoot correction (`l+1, r−1`), inclusive-slice consistency.
- **Mention for points:** DP alternative (`O(n²)`/`O(n²)`), Manacher (`O(n)`), and why expansion wins on space and simplicity.
