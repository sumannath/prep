# Valid Palindrome (LeetCode 125) — Complete Interview Lesson

## 1. Problem, restated in your own words

> Given a string `s`, first **normalize** it: lowercase every letter and delete every character that is not a letter or a digit. Then report whether the normalized string reads identically forward and backward. Return a boolean.

Three facts buried in the statement that you should surface out loud before coding:

- **Alphanumeric includes digits.** The examples only show letters, so this is the hidden trap. Underscore is *not* alphanumeric (it's a "word character" in regex, but not a letter or digit).
- **Normalization is deletion, not replacement.** Characters are removed; the relative order of the survivors is preserved.
- **The empty string counts as a palindrome** (Example 3). If everything gets deleted, the answer is `true`.

**Indices vs. values (say this precisely in the interview):** `left` and `right` will be *indices* into the original string `s`; `s[left]` and `s[right]` are the *values* being compared. We compare values, we move indices, and we never write to `s`. Duplicates need no special handling — the palindrome condition pairs positions (`i` with `n-1-i`), not values, so a character appearing many times is simply compared once per index it occupies. No counting or hashing is involved.

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= s.length <= 2 * 10^5` | An O(n²) approach does ~4×10¹⁰ character operations — far beyond a typical judge budget (~10⁸–10⁹ simple ops/sec as a rule of thumb). You need **O(n)** time. O(n log n) also passes but buys nothing here. |
| `s` is printable ASCII | One byte per char; no Unicode case-folding weirdness (e.g., no Turkish dotless-İ issues). `lowercase` is a no-op on digits, so case-folding is always safe to apply blindly. Character-class checks are simple range tests: `[0-9a-zA-Z]`. |
| `s.length >= 1` | The *input* is never empty, but the *cleaned* string can be (Example 3). Don't reason about "empty input" — reason about "empty after cleaning." |

Memory note: O(n) extra space is acceptable, but the O(1)-space version is the one interviewers want to see, and it's the natural follow-up ("can you avoid building the cleaned string?").

---

## 3. Brute force: normalize, then verify

The straightforward two-phase solution:

```python
def isPalindrome(s: str) -> bool:
    cleaned = [c.lower() for c in s if c.isalnum()]   # Phase 1: normalize
    return cleaned == cleaned[::-1]                   # Phase 2: compare with reverse
```

O(n) time, O(n) extra space. Note this is *already time-optimal* (see §7) — the brute force's weakness is only the extra memory, which is exactly the lever the follow-up pulls.

### Worked trace — Phase 1 and 2 on Example 2

`s = "race a car"` (n = 10). Filtering left to right:

| idx | char | decision | reason |
|---|---|---|---|
| 0 | `r` | keep | alphanumeric |
| 1 | `a` | keep | alphanumeric |
| 2 | `c` | keep | alphanumeric |
| 3 | `e` | keep | alphanumeric |
| 4 | ` ` | drop | not alphanumeric |
| 5 | `a` | keep | alphanumeric |
| 6 | ` ` | drop | not alphanumeric |
| 7 | `c` | keep | alphanumeric |
| 8 | `a` | keep | alphanumeric |
| 9 | `r` | keep | alphanumeric |

Cleaned = `"raceacar"`. Reverse = `"racaecar"`. Compare index by index: `i=0: r=r`, `i=1: a=a`, `i=2: c=c`, `i=3: e ≠ a` → **false**. (For Example 1, the cleaned string is `"amanaplanacanalpanama"`, which equals its reverse → true.)

---

## 4. The core insight

The palindrome condition is **positional**: in the cleaned string `c` of length `m`, you need `c[i] == c[m-1-i]` for every `i`. The brute force materializes `c` to get at those pairs — but you don't need to.

If you keep two indices at the ends of the *original* string and walk them inward, **skipping** a non-alphanumeric character at an index is *exactly* what deleting it does. Formally: the two-pointer scan compares the *i-th surviving character from the left* with the *i-th surviving character from the right* — which is precisely `c[i]` vs `c[m-1-i]`. So the pointers compute the same comparisons as the cleaned-string check, without ever building `c`.

**Invariant to state out loud:** at the top of each loop iteration, every mirrored pair outside the window `[left, right]` has already been verified equal (after case-folding and skipping). The window only shrinks.

Consequence: O(n) time, **O(1) extra space**.

---

## 5. Optimal approach: converging two pointers

### Algorithm

```
left = 0, right = n - 1
while left < right:
    while left < right and s[left]  is not alphanumeric: left  += 1
    while left < right and s[right] is not alphanumeric: right -= 1
    if lowercase(s[left]) != lowercase(s[right]): return false
    left += 1; right -= 1
return true
```

### Python implementation

```python
def isPalindrome(s: str) -> bool:
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True
```

**Why the inner `left < right` guards are non-negotiable:** when the cleaned string is empty or the pointers meet inside a run of punctuation (e.g., `".,;"`), the skip loops would otherwise push a pointer past the other — off the end of the string. Note also the subtle-but-harmless case: if the skip loops stop with `left == right` (the middle of an odd-length cleaned string), the comparison reads the same index twice and trivially passes; some people add an explicit early `return True` there — both are correct.

### Trace — Example 1: `"A man, a plan, a canal: Panama"` (n = 30)

`left`/`right` shown **after** the skip loops run:

| iter | left | right | s[left] | s[right] | comparison | action |
|---|---|---|---|---|---|---|
| 1 | 0 | 29 | `A` | `a` | `a = a` ✓ | → (1, 28) |
| 2 | 1→2 | 28 | `m` | `m` | ✓ | → (3, 27) |
| 3 | 3 | 27 | `a` | `a` | ✓ | → (4, 26) |
| 4 | 4 | 26 | `n` | `n` | ✓ | → (5, 25) |
| 5 | 5→7 | 25 | `a` (skipped `,`, ` `) | `a` | ✓ | → (8, 24) |
| 6 | 8→9 | 24 | `p` (skipped ` `) | `P` | `p = p` ✓ (case-fold) | → (10, 23) |
| 7 | 10 | 23→21 | `l` | `l` (skipped ` `, `:`) | ✓ | → (11, 20) |
| 8 | 11 | 20 | `a` | `a` | ✓ | → (12, 19) |
| 9 | 12 | 19 | `n` | `n` | ✓ | → (13, 18) |
| 10 | 13→15 | 18 | `a` (skipped `,`, ` `) | `a` | ✓ | → (16, 17) |
| 11 | 16→17 | 17 | `c` | `c` (same index — middle char) | trivially ✓ | → (18, 16), loop exits |

Return **true**. Iteration 11 is the self-comparison of the middle character of the 21-char cleaned string (`"amanaplanacanalpanama"` — middle is `c`). Nice detail to point at while narrating.

### Trace — Example 2: `"race a car"` (n = 10)

| iter | left | right | s[left] | s[right] | comparison | action |
|---|---|---|---|---|---|---|
| 1 | 0 | 9 | `r` | `r` | ✓ | → (1, 8) |
| 2 | 1 | 8 | `a` | `a` | ✓ | → (2, 7) |
| 3 | 2 | 7 | `c` | `c` | ✓ | → (3, 6) |
| 4 | 3 | 6→5 | `e` | `a` (skipped ` `) | `e ≠ a` | **return false** |

### Trace — Example 3: `" "` (n = 1)

`left = 0`, `right = 0`, the outer condition `left < right` is false immediately → return **true** with **zero character comparisons**. The empty-after-cleaning case falls out of the loop condition for free — say this explicitly; it shows you traced the edge case through your code.

### Mini-trace — `"0P"` (the classic trap)

`left=0` (`0`, alphanumeric — *kept*), `right=1` (`P`). Compare `'0'.lower() = '0'` vs `'p'` → mismatch → **false**. If your classifier drops digits, you'd clean to `""` and wrongly return true.

---

## 6. Alternative formulations (and their traps)

- **List + reverse compare** (§3): simplest to explain; O(n) space.
- **Regex:** `re.sub(r'[^a-z0-9]', '', s.lower())` — linear for a single negated character class. ⚠️ Do **not** use `\W`: it keeps `_`, because underscore is a regex "word" character but is *not* alphanumeric. On input `"a_a_"` the `\W` version returns false; the correct answer is true (cleaned = `"aa"`).
- **Generator/zipped comparison** (`all(a == b for a, b in zip(...))`): fine, but it hides the two-pointer structure interviewers want to see.
- Python performance footnote: `str.isalnum()` accepts Unicode alphanumerics, which is a superset of what this problem allows — harmless here given the ASCII constraint, and explicit range checks (`'a' <= c <= 'z' or 'A' <= c <= 'Z' or '0' <= c <= '9'`) are a valid micro-optimization if asked.

---

## 7. Complexity analysis

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Clean + reverse-compare | O(n) | O(n) | Two O(n) passes + one reversed copy |
| Clean + two pointers on cleaned | O(n) | O(n) | Avoids the reversed copy, same asymptotics |
| Regex normalize + compare | O(n) | O(n) | Watch the `\W`/underscore trap |
| **Two pointers on raw `s`** | **O(n)** | **O(1)** | Target solution |

**Why O(n) time:** both pointers only move inward, every loop iteration moves at least one of them by one, and each does O(1) work — so combined pointer movement is ≤ n and total work is O(n). Space is two integer indices.

**Lower-bound note (mention if asked "can we do better?"):** Ω(n) time is unavoidable — an algorithm that halts without reading some position behaves identically on the all-`'a'` string and on the same string with that one unread position changed to `'b'`, but one input is a palindrome and the other is not; so every character must be examined at least once in the worst case. The two-pointer solution meets this bound with O(1) space — that's the "optimal" claim, precisely stated.

---

## 8. Common mistakes

1. **`isalpha()` instead of `isalnum()`** — silently drops digits. Input `"12a1"`: correct answer is false (cleaned `"12a1"` ≠ its reverse), but the `isalpha` version cleans to `"a"` and returns true.
2. **Case-folding only one side (or none)** — `"Aa"` must be true; a case-sensitive compare returns false.
3. **Missing inner `left < right` guards** — pointers cross inside all-punctuation regions. Consequences differ by language (see table below).
4. **Regex `\W`** keeps underscore (§6). Use `[^a-z0-9]` after lowering.
5. **Returning false for the empty-after-cleaning case** — Example 3 exists precisely to catch this.
6. **Quadratic string building** — `cleaned += c` on an immutable string in a loop risks repeated reallocation in some runtimes; use a list + `join`, or better, the O(1)-space scan.
7. **Confusing indices with values** — comparing or swapping `left`/`right` themselves; the comparison is `s[left]` vs `s[right]`, and neither pointer is ever "the palindrome."
8. **Assuming pointers can't cross** — even-length cleaned strings end with `left = right + 1`; odd-length ones end with a same-index self-comparison. Both must exit cleanly to `true`.

### Gotchas in Java / C++

| Language | Trap | Do instead |
|---|---|---|
| C++ | `<cctype>` functions (`isalnum`, `tolower`) take `int`; passing a plain `char` with a negative value (bytes ≥ 0x80 on signed-char platforms) is undefined behavior | Cast: `isalnum((unsigned char)c)` |
| C++ | `s.size()` is unsigned; `s.size() - 1` underflows to a huge value on an empty string (defensive concern even though n ≥ 1 here) | `int right = static_cast<int>(s.size()) - 1;` |
| Java | `String.toLowerCase()` is locale-sensitive (the Turkish-locale `'I'` pitfall) and copies the whole string | Per-character `Character.toLowerCase(char)` — locale-independent, O(1) space |
| Java | If chars get autoboxed into `Character` and compared with `==`, that's reference comparison; the 0–127 value cache makes ASCII tests pass by luck | Compare the primitives from `charAt` directly with `!=` |
| Python | Negative indices wrap to the tail of the string instead of raising, so an unguarded pointer that slips below 0 reads *wrong characters* before eventually throwing | Keep the `left < right` guards so pointers can never cross |

---

## 9. Test cases to propose out loud

Say these before or right after coding — it signals you reason about edge cases, not just the happy path:

| # | Input | Cleaned | Expected | Why it's worth saying |
|---|---|---|---|---|
| 1 | `"A man, a plan, a canal: Panama"` | `"amanaplanacanalpanama"` | `true` | Official; mixed case + punctuation |
| 2 | `"race a car"` | `"raceacar"` | `false` | Official; interior space breaks symmetry |
| 3 | `" "` | `""` | `true` | Official; empty after cleaning → true, zero comparisons |
| 4 | `"0P"` | `"0p"` | `false` | Digits are alphanumeric; `'0' ≠ 'p'` — the #1 trap |
| 5 | `".,;"` | `""` | `true` | All non-alphanumeric; exercises the pointer guards |
| 6 | `"12321"` | `"12321"` | `true` | Pure numeric palindrome |
| 7 | `"a."` | `"a"` | `true` | Single survivor; pointer-meets-during-skip path |
| 8 | 2×10⁵ copies of `"a"` | same | `true` | Max-size performance sanity (must stay linear) |

---

## 10. Transferable patterns & related problems

**Patterns worth naming in the interview:**

- **Converging two pointers with in-window filtering** — the general shape "skip what doesn't matter, compare/match what does," with the invariant *everything outside `[left, right]` is already settled*. This is the same skeleton as Two Sum II, Container With Most Water, and Reverse String.
- **Canonicalize-then-compare** — reduce a messy-input question to a clean-form question (normalize then palindrome-check; sort-to-key for group anagrams; mapping-normalization for isomorphic strings).
- **Space/time tradeoff recognition** — O(n) buffer vs. O(1) in-place scan, and *why* random access enables the O(1) version: on a read-once stream you can't look at both ends, so you'd have to buffer half the data. Raising this unprompted is a strong signal.
- **Odd/even middle handling** — the self-comparison trick here generalizes to expand-around-center in Longest Palindromic Substring / Palindromic Substrings.

| Related problem | Relationship |
|---|---|
| 680. Valid Palindrome II | Direct follow-up: delete at most one character |
| 9. Palindrome Number | Same check without strings; watch overflow in C++/Java if reversing mathematically |
| 344. Reverse String | Pure converging two pointers |
| 167. Two Sum II | Converging pointers with a comparison-driven move rule |
| 11. Container With Most Water | Converging pointers + greedy discard argument |
| 5. Longest Palindromic Substring / 647. Palindromic Substrings | Palindrome family; different technique (expand around center) |

**Follow-up sketch (LC 680 — delete at most one char):** walk inward as here; at the *first* mismatch, checking both "skip left" and "skip right" repairs is enough, because everything outside was already matched:

```python
def validPalindrome(s: str) -> bool:          # LC 680
    def is_pal(lo, hi):
        while lo < hi:
            if s[lo] != s[hi]: return False
            lo += 1; hi -= 1
        return True
    l, r = 0, len(s) - 1
    while l < r:
        if s[l] != s[r]:
            return is_pal(l + 1, r) or is_pal(l, r - 1)
        l += 1; r -= 1
    return True
```

---

## 11. Full talk track (the script)

**Restate & clarify (~30s).** "So the input is a string with arbitrary punctuation, spaces, and mixed case. I normalize by lowercasing letters and dropping everything that isn't a letter or digit — digits *stay*, they're alphanumeric — then I check whether what remains reads the same forwards and backwards. I'll assume the cleaned string being empty counts as a palindrome, per the third example."

**Brute force (~15s).** "Baseline: one pass to build the cleaned string, then compare it to its reverse. Linear time, linear extra space. Correct, and honestly already time-optimal — the only thing left to improve is space."

**Insight (~30s).** "The palindrome condition is about *positions*: character i must equal character n-minus-one-minus-i. Deleting a comma in the cleaned string is the same as skipping over it in the original. So I can keep two indices at the two ends of the raw string, walk them inward, skip anything non-alphanumeric on each side independently, and compare what's left — case-insensitively. I never materialize the cleaned string."

**Algorithm & correctness (~30s).** "Left at zero, right at the last index. While left is left of right: advance left past non-alphanumeric, retreat right past non-alphanumeric — both guarded by left-less-than-right so they can't cross when the string is all punctuation — then compare the two characters lowercased. Any mismatch returns false; moving both pointers inward after each match maintains the invariant that everything outside the window is already verified. When the pointers meet or cross, return true."

**Complexity (~10s).** "Each pointer moves monotonically inward, at most n total steps, O(1) work per step: O(n) time, O(1) space. That's optimal — every character has to be looked at in the worst case."

**Tests (~20s).** "Cases I'd cover: empty-after-cleaning returns true; digits count, so '0P' is false — '0' is not 'p'; single character true; numeric palindrome like '12321'; all punctuation like '.,;' returns true through the guard path; and a max-size uniform string to confirm linear behavior."

**Code (~2 min).** Write the two-pointer version, narrating the guards and the case-folding, then walk Example 3 (" "): the loop never runs, returns true with zero comparisons.

---

## 12. Say it in 60 seconds

> "A phrase is a palindrome if, once lowercased and stripped down to just letters and digits, it reads the same both ways. The obvious approach is to build that cleaned string and compare it against its reverse — linear time, but linear extra space. The key realization is that palindrome checks are *positional*: deleting a comma from the cleaned string is the same as just skipping over it in the original. So I use two pointers, one at each end, walking inward — skipping non-alphanumeric characters on each side, with a guard so the pointers never cross — and comparing the two characters case-insensitively. A mismatch returns false immediately; when the pointers meet, everything outside them is already verified, so it's a palindrome. Each index is touched at most once, so it's O(n) time and O(1) space, which is optimal since every character must be examined in the worst case. Edge cases I've already accounted for: a string that cleans to empty returns true; digits count, so '0-P' is false; single characters and numeric strings work correctly. Ready to code it."
