# Valid Anagram — Complete Lesson

## 1. Problem restatement (in your own words)

Say this back to the interviewer before coding:

> "I need to decide whether string `t` is a **rearrangement** of string `s` — same characters, same multiplicities, order irrelevant. Formally: there must exist a bijection between positions of `s` and positions of `t` such that matched positions hold equal characters. Equivalently: `len(s) == len(t)` **and** every letter occurs the same number of times in both strings."

Two precision points worth stating explicitly:

- This is a **multiset** comparison, not a set comparison. `"aabb"` vs `"ab"` uses the same *set* of letters `{a, b}` but is **not** an anagram, because the counts differ.
- You never need to *construct* the position mapping — you only need to verify that one *exists*, which a frequency comparison does.

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= s.length, t.length <= 5 * 10^4` | n is small. Even O(n log n) sorting is ~10⁶ operations — trivially fast. The optimal solution is about **insight**, not perf desperation. Lengths may differ → a fast `False` path is available. |
| Lowercase English letters only | Alphabet size Σ = 26 → a **fixed array of 26 counters** works; no hash map needed, O(1) auxiliary space. |
| Return type is `bool` | No need to build or return the actual rearrangement. |
| (Implicit) strings are non-empty | Per constraints, but your code should still behave sensibly on `""` (empty vs empty is vacuously an anagram — the code below handles it correctly for free). |

---

## 3. The naive idea you reject out loud

"Generate every permutation of `s` and check whether any equals `t`." Reject it immediately: for `s = "rat"` there are 3! = 6 permutations, but for n = 5·10⁴ the count is astronomically infeasible (n! grows faster than any exponential). Mention it in one sentence to show you've considered it, then move on.

## 4. Brute force that actually works: sort both strings

**Insight:** two strings are anagrams **iff** their sorted forms are identical, because sorting is a canonical form that erases exactly the information we don't care about (order) and preserves what we do (multiplicities).

**Worked trace — Example 2** (`s = "rat"`, `t = "car"`):

| Step | Action | Result |
|---|---|---|
| 1 | `sorted("rat")` | `['a', 'r', 't']` |
| 2 | `sorted("car")` | `['a', 'c', 'r']` |
| 3 | Compare index by index | index 0: `'a' == 'a'` ✓; index 1: `'r' != 'c'` ✗ → **False** |

**Worked trace — Example 1** (`s = "anagram"`, `t = "nagaram"`):

| Step | Action | Result |
|---|---|---|
| 1 | `sorted("anagram")` | `['a','a','a','g','m','n','r']` |
| 2 | `sorted("nagaram")` | `['a','a','a','g','m','n','r']` |
| 3 | Compare | identical → **True** |

```python
def is_anagram(s: str, t: str) -> bool:
    return sorted(s) == sorted(t)   # length mismatch handled implicitly
```

Sorting `n` items in the comparison model costs O(n log n); that's essentially optimal *for sorting*, since distinguishing among n! possible orderings needs log₂(n!) ≈ n log₂ n bits of information and each comparison resolves at most one bit. But we don't actually need a total order — we only need counts, which leads to the better solution.

---

## 5. The core insight

> **Anagram ⇔ identical frequency vectors.**

Two framings, both worth saying in an interview:

1. **Canonical form view:** sorting produces a canonical signature of a multiset. Compare signatures. Cost: O(n log n).
2. **Feature-vector view:** a string is fully described (for this problem) by its 26-dimensional count vector. Two strings are anagrams iff their vectors are equal. Cost: O(n) — you read each character once.

Why O(n) is optimal: every character must be examined — if an algorithm skipped a position, two inputs differing only there (one anagram, one not, equal lengths) would drive identical executions, forcing a wrong answer on one of them. So Ω(n) is unavoidable, and counting achieves it.

---

## 6. Optimal solution: one 26-slot counter

Increment for each character of `s`, decrement for each character of `t`. The moment a counter goes **negative**, `t` uses that letter more often than `s` → `False`.

```python
def is_anagram(s: str, t: str) -> bool:
    # Length guard: also what makes the "no negative counter" check sufficient.
    if len(s) != len(t):
        return False

    counts = [0] * 26   # counts[c] = (#c seen in s) - (#c seen in t)
    base = ord('a')

    for ch in s:
        counts[ord(ch) - base] += 1

    for ch in t:
        i = ord(ch) - base
        counts[i] -= 1
        if counts[i] < 0:      # t used ch one more time than s allows
            return False

    # Equal lengths + no counter ever negative  ⇒  every counter is exactly 0.
    return True
```

**Why `return True` needs no final scan (the invariant):** after processing all of `t`, `Σ counts = len(s) − len(t) = 0`. If no counter is negative and all non-negative integers sum to zero, every counter is exactly zero — i.e., identical frequency vectors. (The *variant* that skips the early exit and instead does a final `all(c == 0 for c in counts)` check is also correct — and interestingly, that variant doesn't strictly need the length check, since mismatched lengths make the sum nonzero — but keep the length guard anyway for the O(1) early exit.)

### Trace — Example 1: `s = "anagram"`, `t = "nagaram"` → `True`

Phase 1 — read `s` (only nonzero letters shown):

| i | s[i] | op | a | g | m | n | r |
|---|---|---|---|---|---|---|---|
| 0 | a | +1 | 1 | 0 | 0 | 0 | 0 |
| 1 | n | +1 | 1 | 0 | 0 | 1 | 0 |
| 2 | a | +1 | 2 | 0 | 0 | 1 | 0 |
| 3 | g | +1 | 2 | 1 | 0 | 1 | 0 |
| 4 | r | +1 | 2 | 1 | 0 | 1 | 1 |
| 5 | a | +1 | 3 | 1 | 0 | 1 | 1 |
| 6 | m | +1 | 3 | 1 | 1 | 1 | 1 |

Phase 2 — read `t`, decrementing:

| i | t[i] | op | a | g | m | n | r | check |
|---|---|---|---|---|---|---|---|---|
| 0 | n | −1 | 3 | 1 | 1 | 0 | 1 | ok |
| 1 | a | −1 | 2 | 1 | 1 | 0 | 1 | ok |
| 2 | g | −1 | 2 | 0 | 1 | 0 | 1 | ok |
| 3 | a | −1 | 1 | 0 | 1 | 0 | 1 | ok |
| 4 | r | −1 | 1 | 0 | 1 | 0 | 0 | ok |
| 5 | a | −1 | 0 | 0 | 1 | 0 | 0 | ok |
| 6 | m | −1 | 0 | 0 | 0 | 0 | 0 | ok |

All counters land at exactly 0 → **True**. ✔

### Trace — Example 2: `s = "rat"`, `t = "car"` → `False`

| i | ch | op | a | c | r | t | check |
|---|---|---|---|---|---|---|---|
| 0 | r | +1 | 0 | 0 | 1 | 0 | — |
| 1 | a | +1 | 1 | 0 | 1 | 0 | — |
| 2 | t | +1 | 1 | 0 | 1 | 1 | — |
| 0 | c | −1 | 1 | **−1** | 1 | 1 | negative → **return False** |

`c` appears in `t` but never in `s`; the counter dips to −1 and we exit after one character of `t`. ✔

---

## 7. Complexity table

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Generate all permutations of `s` | O(n!) | O(n) | Rejected — infeasible at n = 5·10⁴ |
| Sort both, compare | O(n log n) | O(n) (sorted copies) | General alphabets; simplest correct code |
| Hash map (`Counter`) | O(n) expected | O(k) distinct chars | Expected O(1) per dict op assuming well-distributed hashes; collisions can degrade it, hence "expected" not worst-case |
| **Fixed 26-int array (chosen)** | **O(n)** | **O(1)** — 26 ints | Best for lowercase English; matches the Ω(n) lower bound |

---

## 8. Follow-up: Unicode characters

Key adaptations, in the order an interviewer wants to hear them:

1. **Swap the array for a hash map.** No fixed alphabet → `Counter(s) == Counter(t)` in Python. Still O(n) expected time, O(distinct chars) space.
2. **Know what a "character" is.** Python 3 strings are sequences of **code points** (`len()` and iteration both operate on code points), so `Counter` just works. Java's `charAt` yields **UTF-16 code units**, not code points — counting those can give *false positives*: two different emoji can be built from the same multiset of surrogate units (e.g., `{U+1F600, U+10000}` and `{U+1F400, U+10200}` have identical UTF-16 unit multisets `D83D DE00 D800 DC00` vs `D83D DC00 D800 DE00` but different code points). In Java, iterate `s.codePoints()`; in C++, decode UTF-8 into a `std::u32string` first (byte multisets in UTF-8 have the same aliasing problem).
3. **Normalization is a product decision.** `"é"` as U+00E9 vs `"e" + U+0301` are different code-point multisets but look identical. Say out loud: "I'd ask whether visually-equal-but-differently-encoded strings should count; if yes, normalize (e.g., NFC) before counting — in Python, `unicodedata.normalize('NFC', s)`."
4. **A giant array is theoretically possible but bad practice.** Unicode allows 1,114,112 code points, so a direct-address table is still "O(1) space" — but ~4 MB of counters for a maybe-10-character string; the hash map is the sane choice.

```python
from collections import Counter
import unicodedata

def is_anagram_unicode(s: str, t: str) -> bool:
    s = unicodedata.normalize('NFC', s)   # only if the interviewer wants visual equality
    t = unicodedata.normalize('NFC', t)
    if len(s) != len(t):                  # len() = code points in Python 3
        return False
    return Counter(s) == Counter(t)
```

---

## 9. Common mistakes & language gotchas

1. **Skipping the length check.** Fatal for the early-exit version: `s = "aab"`, `t = "ab"` never produces a negative counter (`a:2→1, b:1→0`) yet is not an anagram. The length guard is *load-bearing*, not an optimization.
2. **Set thinking instead of multiset thinking.** `set("aabb") == set("ab")` is `True`; the strings are not anagrams. Counts matter, not just which letters appear.
3. **Mutating inputs when told not to.** Python's `sorted()` copies (safe); C++'s `std::sort(s.begin(), s.end())` sorts in place — copy first if asked not to modify.
4. **Assuming O(n log n) is "wrong."** It's correct and often clearer; present counting as the optimization, not as the only valid answer.

Language-specific gotchas:

| Language | Gotcha |
|---|---|
| Java | `HashMap<Character, Integer>` autoboxes; comparing counts with `==` breaks outside the `Integer` cache (−128..127), and counts here reach 5·10⁴. Use `int[26]`, or `.equals()`. |
| Java | `charAt` = UTF-16 code units; astral characters split into surrogate pairs → use `codePoints()` for the Unicode follow-up. |
| C++ | `char` is signed on many platforms — fine for `'a'..'z'`, but cast to `unsigned char` before generalizing indexing beyond ASCII. |
| C++ | `size()` is unsigned: `s.size() - t.size()` wraps to a huge value if `t` is longer — compare sizes with `!=` instead of subtracting. |
| Python | `ord(ch) - ord('a')` assumes lowercase; the constraints guarantee it, but say so — otherwise reach for `Counter`, which needs no alphabet assumption. |

---

## 10. Test cases to propose out loud

State these before or right after coding — it signals rigor:

| # | Input | Expected | What it exercises |
|---|---|---|---|
| 1 | `s = "anagram"`, `t = "nagaram"` | `True` | Official example 1; duplicate letters |
| 2 | `s = "rat"`, `t = "car"` | `False` | Official example 2; different letters, same length |
| 3 | `s = "aacc"`, `t = "ccac"` | `False` | Same letters, **different multiplicities** (a×2 c×2 vs c×3 a×1) — catches set-only bugs |
| 4 | `s = "aabb"`, `t = "baba"` | `True` | Duplicates in both, scrambled |
| 5 | `s = "abc"`, `t = "abcd"` | `False` | Length mismatch fast path |
| 6 | `s = "aab"`, `t = "ab"` | `False` | The exact case that breaks a missing length check |
| 7 | `s = "a"`, `t = "a"` | `True` | Minimal input |
| 8 | `s = ""`, `t = ""` | `True` | Outside stated constraints; state your policy |

---

## 11. Transferable patterns & related problems

- **Canonical form / signature:** reduce objects to a canonical representation (sorted string, count vector), then compare signatures. Reused directly in Group Anagrams, where the signature becomes a hash-map key.
- **Fixed alphabet → array over hash map:** whenever the symbol set is small and known (26 letters, digits, bytes), an array beats a hash map on speed and clarity.
- **Increment/decrement streaming counter:** the same counter maintained incrementally over a sliding window solves Find All Anagrams in a String and Permutation in String — you add the entering character and remove the leaving one instead of recounting.
- **Early exit via invariant:** proving "no negative + equal totals ⇒ all zero" avoids a verification pass — a general trick worth naming.
- **Multiset containment:** one-directional versions of this comparison appear in Ransom Note and Minimum Number of Steps to Make Two Strings Anagram.

Related problems to queue after this one: **LC 49 Group Anagrams**, **LC 438 Find All Anagrams in a String**, **LC 567 Permutation in String**, **LC 383 Ransom Note**, **LC 1347 Minimum Steps to Make Two Strings Anagram**, **LC 1657 Determine if Two Strings Are Close**.

---

## 12. Fuller talk track (narrate as you solve)

> "An anagram means same characters with same counts, order ignored — so really I'm comparing multisets. First observation: if the lengths differ, the answer is immediately false, so I'll check that first.
>
> Since we're told it's lowercase English letters only, I don't need a hash map — a 26-slot integer array is enough. My plan: walk `s` incrementing counters, walk `t` decrementing them, and if any counter dips below zero, `t` uses that letter more often than `s`, so it's false.
>
> The subtle part: after both passes, do I need to verify all counters are zero? No — the increments and decrements cancel exactly, so the counters sum to length-of-s minus length-of-t, which is zero because I checked lengths. Non-negative integers summing to zero must all be zero. That's my correctness argument, and it's why I can return true directly.
>
> I'd also mention the alternatives: sorting both strings and comparing is O(n log n) — simpler, and what I'd pick if the alphabet weren't fixed. And for the Unicode follow-up, I'd swap the array for a hash map keyed by code point, and ask whether to normalize first, since one visible character can have multiple encodings."

---

## 13. Say it in 60 seconds

> "Anagrams are the same multiset of characters — same letters, same counts, order irrelevant. So step one: if the lengths differ, return false immediately. Since the input is lowercase English letters, I'll use a fixed 26-slot counter instead of a hash map: increment for every character of `s`, decrement for every character of `t`, and the instant a counter goes negative, `t` uses a letter more often than `s` — false. Because I already checked lengths, the counter deltas sum to zero; if nothing went negative, every counter must be exactly zero, so I can return true with no final scan. That's O(n) time and O(1) space, and O(n) is optimal since any correct algorithm has to read every character. The sort-and-compare alternative is O(n log n) and fine for general alphabets. For Unicode, I'd switch to a hash map keyed by code point — being careful in languages like Java where iterating a string gives UTF-16 code units, not code points — and I'd ask whether to normalize first, since the same visible character can be encoded multiple ways."
