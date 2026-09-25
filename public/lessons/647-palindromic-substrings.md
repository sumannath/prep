# Palindromic Substrings (LeetCode 647) — Full Lesson

## 1. Problem Restatement

> Given a string `s`, count **how many substrings** of `s` are palindromes. A *substring* is contiguous; a *palindrome* reads the same forwards and backwards.

**Key clarifications (say these out loud in an interview):**

- We count **substrings by position, not by distinct content**. In `"aaa"`, the three single-character substrings `"a"` at indices 0, 1, 2 count as **three** palindromes — that's why the answer is 6, not 2.
- A **single character is a palindrome** (length-1 substrings always count).
- An **empty string is not a substring here** — substrings have length ≥ 1.
- The substring is contiguous, so this is *not* a subsequence problem (no skipping characters).

---

## 2. Constraint Decoding

| Constraint | What it tells us |
|---|---|
| `1 <= s.length <= 1000` | n ≤ 1000 → an **O(n²) algorithm ≈ 10⁶ operations** is completely fine. O(n³) ≈ 10⁹ is borderline — usually too slow in Python, may pass in C++/Java with fast constant factors, but risky. So we should aim for O(n²) or better. |
| Lowercase English letters only | Doesn't matter for any standard approach here — this hint would matter for string-hash / trie-flavored problems, not for palindromes. |
| No requirement for distinct counts | Confirms we count positions, not unique strings. |

---

## 3. Brute Force: Check Every Substring

**Idea:** enumerate every pair `(i, j)` with `i ≤ j`; check whether `s[i..j]` is a palindrome.

```python
def countSubstrings_brute(s: str) -> int:
    n = len(s)
    count = 0
    for i in range(n):                 # start index
        for j in range(i, n):          # end index
            sub = s[i:j+1]
            if sub == sub[::-1]:       # palindrome check
                count += 1
    return count
```

**Complexity:** O(n²) pairs × O(n) palindrome check = **O(n³)** time, O(n) space for the slice.

### Worked trace on `s = "aaa"`

| i | j | substring | palindrome? | running count |
|---|---|-----------|-------------|---------------|
| 0 | 0 | `"a"` | ✅ | 1 |
| 0 | 1 | `"aa"` | ✅ | 2 |
| 0 | 2 | `"aaa"` | ✅ | 3 |
| 1 | 1 | `"a"` | ✅ | 4 |
| 1 | 2 | `"aa"` | ✅ | 5 |
| 2 | 2 | `"a"` | ✅ | 6 |

Final answer: **6** ✓

**Observation that becomes the key insight:** in this trace, whenever the *outer* pair matched (`s[i] == s[j]`) and the *inner* part was a palindrome, the whole substring was a palindrome. We're re-deriving "inner palindrome" from scratch every time — that's the redundancy.

---

## 4. The Core Insight

> **A substring `s[i..j]` is a palindrome if and only if `s[i] == s[j]` and the inner substring `s[i+1..j-1]` is a palindrome.**

Every palindrome is built by **expanding outward** from its center:

- Odd-length palindromes have a **single-character center** (e.g., `"aba"` centered on `'b'`).
- Even-length palindromes have a **two-character center** (e.g., `"abba"` centered between the two `'b'`s).

A string of length `n` has exactly:

- `n` odd centers (one per index), and
- `n - 1` even centers (one per adjacent pair),

for a total of **2n − 1 centers**. Expanding each center outward until the characters stop matching takes O(n) per center in the worst case (all-same-character strings), giving **O(n²) time, O(1) space** — no table, no hashing, no extra memory.

**Alternative framing (DP):** define `dp[i][j] = True` iff `s[i..j]` is a palindrome. Fill by increasing substring length using the same recurrence. Same O(n²) time but O(n²) space. Expand-around-center is strictly better in space and simpler in practice.

---

## 5. Optimal Approach: Expand Around Center

### Code (Python)

```python
def countSubstrings(s: str) -> int:
    n = len(s)
    count = 0

    def expand(left: int, right: int) -> int:
        found = 0
        while left >= 0 and right < n and s[left] == s[right]:
            found += 1        # s[left..right] is a palindrome
            left -= 1
            right += 1
        return found

    for center in range(n):
        count += expand(center, center)      # odd-length palindromes
        count += expand(center, center + 1)  # even-length palindromes

    return count
```

### Trace on Example 1: `s = "abc"` (n = 3)

| Center | Type | Expansion | Palindromes found | Added |
|---|---|---|---|---|
| (0,0) `'a'` | odd | `"a"` ✓ → expand: out of range | `"a"` | 1 |
| (0,1) `'a','b'` | even | `'a' != 'b'` → stop immediately | — | 0 |
| (1,1) `'b'` | odd | `"b"` ✓ → neighbors `'a' != 'c'` | `"b"` | 1 |
| (1,2) `'b','c'` | even | `'b' != 'c'` → stop | — | 0 |
| (2,2) `'c'` | odd | `"c"` ✓ → left out of range | `"c"` | 1 |
| (2,3) | even | right = 3 out of bounds | — | 0 |

Total: **3** ✓

### Trace on Example 2: `s = "aaa"` (n = 3)

| Center | Type | Expansion | Palindromes found | Added |
|---|---|---|---|---|
| (0,0) | odd | `"a"` → left < 0 | `"a"` | 1 |
| (0,1) | even | `"aa"` ✓ → left < 0 | `"aa"` | 1 |
| (1,1) | odd | `"a"` → `"aaa"` ✓ → left < 0 | `"a"`, `"aaa"` | 2 |
| (1,2) | even | `"aa"` ✓ → right = 3 | `"aa"` | 1 |
| (2,2) | odd | `"a"` → right = 3 | `"a"` | 1 |
| (2,3) | even | right = 3 out of bounds | — | 0 |

Total: 1 + 1 + 2 + 1 + 1 = **6** ✓ — matches the expected output exactly, including the duplicate `"a"`s counted separately by position.

**Sanity invariant:** every palindrome has exactly one center (odd or even), and each center's expansion enumerates every palindrome with that center exactly once. So the count is correct — no double-counting, no misses.

---

## 6. Optional Follow-up: Manacher's Algorithm — O(n)

If the interviewer pushes for better than O(n²), mention **Manacher's algorithm**: it transforms the string by inserting separators (`"aaa"` → `"^#a#a#a#$"` or similar) so all palindromes become odd-length, then uses previously computed palindrome radii to skip re-verification of already-known symmetric regions. It runs in **O(n)** time — the skip is possible because a palindrome's mirror region inside a larger palindrome is itself a palindrome, and each character is written/compared a constant number of times; in the comparison model, counting palindromic substrings essentially requires examining input characters in some structured way, and O(n²) worst-case *pairs* only arise when characters match, which Manacher amortizes away.

For n ≤ 1000 this is **never required**; know it exists, implement it only if asked.

---

## 7. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (check all substrings) | O(n³) | O(n) | Too slow at n = 1000 in Python (~10⁹ char comparisons worst case). |
| DP table `dp[i][j]` | O(n²) | O(n²) | 10⁶ booleans; fine, but more memory and code. |
| **Expand around center** | **O(n²)** | **O(1)** | Recommended. ~2n centers, each expands ≤ n/2 steps. |
| Manacher's algorithm | O(n) | O(n) | Overkill for n ≤ 1000; know for follow-ups. |

Worst case for expand-around-center: `"aaa...a"` — every expansion succeeds to the boundary, giving the full ~n²/2 iterations.

---

## 8. Common Mistakes

1. **Counting distinct palindromic strings instead of substrings by position.** `"aaa"` must give 6, not 2. This is the #1 misread.
2. **Forgetting even-length centers.** Only doing `expand(i, i)` misses `"aa"`, `"abba"`, etc. Every index needs **two** expansion calls.
3. **Counting inside the expansion loop incorrectly.** Each successful character-pair match adds exactly **one** palindrome (the current window); increment `found += 1` per successful iteration, not once per center.
4. **Off-by-one in `s[i:j+1]`** in the brute force — Python slices exclude the end index.
5. **Recursion/DP base case confusion:** in the DP, all `dp[i][i] = True` and `dp[i][i+1] = (s[i] == s[i+1])`; iterating lengths in the wrong order (e.g., reading `dp[i+1][j-1]` before it's set) silently produces wrong answers for longer substrings.
6. **Assuming you must collect the palindromes.** Only the count is needed — don't build substrings (that turns O(1)-space into O(n²)–O(n³) output-related cost).

### Language-specific gotchas

| Language | Gotcha |
|---|---|
| **Java** | Use a `long`/`int` consistently for the count — for n ≤ 1000 the max count is ~500,500, which fits in `int`, but if asked to generalize, note that counts for longer strings can exceed `int` range (sum of 1..n grows quadratically). |
| **C++** | Don't pass `std::string` by value in helpers (needless copies); use `const std::string&` or index the outer string directly. Also beware `s.size()` being unsigned — `center + 1` is fine, but `left >= 0` logic with `size_t` underflows; keep `left`/`right` as `int`. |
| **Python** | `s[i:j+1]` slicing copies the substring — in the brute force this adds an O(n) allocation per check. The final solution avoids slicing entirely. |

---

## 9. Test Cases to Propose Out Loud

Propose these before/while coding — it signals correctness thinking:

| Input | Expected | Why |
|---|---|---|
| `"abc"` | `3` | Official example 1: only the three length-1 substrings. |
| `"aaa"` | `6` | Official example 2: 3 × `"a"` + 2 × `"aa"` + 1 × `"aaa"` — checks duplicates-by-position and even centers. |
| `"a"` | `1` | Minimum length; single char. |
| `"ab"` | `2` | `"a"`, `"b"` — confirms the even center contributes 0. |
| `"abba"` | `6` | `"a"`, `"b"`, `"b"`, `"a"`, `"bb"`, `"abba"` — tests nested palindromes through an even center. |
| `"racecar"` | `10` | Odd center with multiple nesting levels: 7 single chars + `"cec"` + `"aceca"` + `"racecar"`. |

Edge cases: n = 1 (handled naturally by the loop), all-identical characters (max count, worst-case performance), alternating characters like `"abab"` (sparse palindromes).

---

## 10. Transferable Patterns & Related Problems

**Pattern:** *"Expand around a center" generalizes to any problem where a property radiates outward from a midpoint and you can verify incrementally.*

Related problems to practice together:

| Problem | Relationship |
|---|---|
| **LC 5 — Longest Palindromic Substring** | Same expand-around-center technique; track the longest window instead of counting. |
| **LC 647 — this problem** | — |
| **LC 516 — Longest Palindromic Subsequence** | Subsequence ≠ substring; needs interval DP with a different recurrence. Good contrast question. |
| **LC 131 — Palindrome Partitioning** | Reuses the palindrome precomputation/DP; adds backtracking. |
| **LC 132 — Palindrome Partitioning II** | Palindrome table + 1-D DP for min cuts. |
| **LC 214 — Shortest Palindrome** | Palindromic prefix; uses string hashing / KMP instead. |

**Interview talking point:** if asked "can you do better than O(n²)?", the honest answer is: for *counting*, Manacher's gives O(n), but given n ≤ 1000, the simpler O(n²)/O(1) solution is the right engineering trade-off — I'd state the trade-off explicitly and offer Manacher as a follow-up.

---

## 11. Say It in 60 Seconds

> "I need to count substrings that are palindromes — counting by position, not distinct strings, so single characters count and duplicates count separately.
>
> Brute force checks all O(n²) substrings with an O(n) palindrome test — O(n³), too slow for n up to 1000. The insight is that a substring is a palindrome if its endpoints match and its inner part is a palindrome — so every palindrome is just an expansion from a center. A string of length n has 2n minus 1 centers: n single-character centers for odd lengths and n minus 1 adjacent-pair centers for even lengths. I expand outward from each center while the characters match, adding one to the count for each successful step. That's O(n²) time worst case and O(1) extra space.
>
> On 'aaa' the centers give 1, 1, 2, 1, 1, and 0 palindromes respectively — total 6, matching the expected output. Edge cases I'd check: single character returns 1, 'ab' returns 2, and 'abba' returns 6 to confirm even centers handle nesting. If asked for better than O(n²), Manacher's algorithm does it in O(n), but for n ≤ 1000 the simpler solution is the right trade-off."

**Quick code sketch to remember:** one helper `expand(l, r)` that counts matched windows; loop `for i in range(n)`: add `expand(i, i)` + `expand(i, i+1)`.
