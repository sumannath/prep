# Permutation in String (LeetCode 567) — Complete Interview Lesson

---

## 1. Restating the problem in your own words

**Official statement:** Given two strings `s1` and `s2`, return `true` if `s2` contains a permutation of `s1` as a substring, else `false`.

**Restated for the interviewer:** *"A permutation of `s1` is any string with exactly the same characters and the same multiplicities — i.e., an anagram. So the question becomes: does `s2` contain a **contiguous** substring of length exactly `len(s1)` whose character-frequency counts equal `s1`'s counts?"*

Key clarifications to say out loud (and confirm):

- **"Permutation" = same multiset of characters.** We never need to produce the actual permutation.
- **"Substring" = contiguous.** The rearrangement happens only *inside* the window; positions in `s2` are fixed.
- **Order doesn't matter inside the window** (`"ba"` matches `s1 = "ab"`), but **counts do**: duplicates matter, letter *sets* are not enough (`s1 = "aab"` vs substring `"ab"` — same letter set, different counts, not a permutation).
- **Indices vs values:** we will reason about windows `s2[i .. i+n-1]` (0-based, inclusive), where `n = len(s1)`, `m = len(s2)`. The *value* at index `i` is `s2[i]`; counts are indexed by character.
- Constraints allow `len(s1) > len(s2)` — the answer is then trivially `false`.

---

## 2. Decoding the constraints

| Constraint | What it tells us | Design implication |
|---|---|---|
| `1 <= len(s1), len(s2) <= 10^4` | `m·n` up to ~`10^8` in pathological pairings, worst-case of `(m-n+1)·n` is `m²/4 ≈ 2.5×10^7` | Per-window rescanning is too slow for Python; we need an incremental (sliding) update |
| Lowercase English letters only | Alphabet size Σ = 26 | Fixed-size count arrays; comparing two arrays costs O(26) = constant |
| `len(s1)` may exceed `len(s2)` | `s1` cannot fit in `s2` | Early `return False` guard **before** any indexing — otherwise Python raises `IndexError` during window seeding |
| Lengths ≥ 1 | No empty strings | `n = 1` degenerates to "does any character of `s1` appear in `s2`" — our algorithm must handle a size-1 window |

Since the target length `n` is **fixed** (not variable like "minimum window"), this is a **fixed-size sliding window** problem, not a shrink/grow two-pointer problem.

---

## 3. Brute force — and why it fails

### 3.1 The trap: enumerate permutations of `s1`

Generating every permutation of `s1` and substring-searching each in `s2` is the naive reading of the problem. It's dead on arrival: `13! ≈ 6.2×10^9` already exceeds 10⁹, and here `n` can be `10^4` — the factorial is beyond astronomical. Say this in one sentence and move on; it shows you understand *why* the reduction to "equal counts" is the whole game.

### 3.2 Working brute force: recount each window

Compare frequency counts of every length-`n` window against `s1`'s counts:

```python
def checkInclusion_bruteforce(s1: str, s2: str) -> bool:
    n, m = len(s1), len(s2)
    if n > m:
        return False
    need = [0] * 26
    for ch in s1:
        need[ord(ch) - ord('a')] += 1

    for start in range(m - n + 1):          # windows s2[start : start+n]
        win = [0] * 26
        for j in range(start, start + n):   # O(n) recount per window  <-- the cost
            win[ord(s2[j]) - ord('a')] += 1
        if win == need:
            return True
    return False
```

**Worked trace** — `s1 = "ab"` (need: `a:1, b:1`), `s2 = "eidbaooo"`, `n = 2`, valid starts `0..6`:

| start | window | window counts | need | verdict |
|---|---|---|---|---|
| 0 | `"ei"` | e:1, i:1 | a:1, b:1 | ✗ |
| 1 | `"id"` | i:1, d:1 | a:1, b:1 | ✗ |
| 2 | `"db"` | d:1, b:1 | a:1, b:1 | ✗ |
| 3 | `"ba"` | b:1, a:1 | a:1, b:1 | ✓ → **True** (early exit) |

**Cost:** `(m-n+1)` windows × `n` increments each = `O((m-n+1)·n)`. Maximized at `n ≈ m/2`, giving `m²/4 ≈ 2.5×10^7` character steps for `m = 10^4` — fine in C++ (~0.1–0.3 s), but interpreted Python with per-character `ord`/increment work lands in the tens of seconds: **TLE**. The fix is not to shrink the *algorithm's* idea (count comparison is right) but to eliminate the redundant `O(n)` recount per slide.

---

## 4. The core insight

Two observations collapse the problem to linear time:

1. **Anagram ⇔ equal frequency vector.** "Contains a permutation of `s1`" is exactly "some window of length `n` in `s2` has the same 26-slot count array as `s1`." We are searching over *multisets*, not over orderings — that's why we never enumerate permutations.
2. **Consecutive windows differ by exactly two characters.** Window `[i-n, i-1]` and window `[i-n+1, i]` share `n-1` characters: `s2[i]` **enters**, `s2[i-n]` **leaves**. So the count array can be maintained with **two O(1) updates per slide** instead of an `O(n)` rebuild. (A rebuild of `s2[i:i+n]` — a Python slice or a fresh `Counter` — is secretly `O(n)` and reintroduces the brute-force cost.)

---

## 5. Optimal approach: fixed-size sliding window over counts

### 5.1 Algorithm

1. If `n > m`, return `False` immediately.
2. Build `need` (counts of `s1`) and `win` (counts of the **first** window `s2[0..n-1]`).
3. If `win == need`, return `True` (the first window may already match — this check is mandatory).
4. For `i` from `n` to `m-1`: increment `win[s2[i]]`, decrement `win[s2[i-n]]`, then compare.
5. If no window matched, return `False`.

**Index invariant (be this precise on the whiteboard):** after processing index `i` in the loop, the window is `s2[i-n+1 .. i]` (inclusive), of length `n`. The character *entering* is `s2[i]`; the character *leaving* is `s2[i-n]` — the old window's first character.

| Loop index `i` | enters `s2[i]` | leaves `s2[i-n]` | resulting window |
|---|---|---|---|
| `n` | `s2[n]` | `s2[0]` | `s2[1..n]` |
| `n+1` | `s2[n+1]` | `s2[1]` | `s2[2..n+1]` |
| `m-1` | `s2[m-1]` | `s2[m-1-n]` | `s2[m-n..m-1]` (last window) |

### 5.2 Reference implementation (Python)

```python
def checkInclusion(s1: str, s2: str) -> bool:
    n, m = len(s1), len(s2)
    if n > m:                              # s1 can't fit inside s2
        return False

    need = [0] * 26                        # required counts from s1
    win  = [0] * 26                        # counts of current window in s2

    for i in range(n):                     # seed: s1 and the first window
        need[ord(s1[i]) - ord('a')] += 1
        win[ord(s2[i]) - ord('a')] += 1

    if win == need:                        # first window may already match
        return True

    for i in range(n, m):                  # slide: s2[i] enters, s2[i-n] leaves
        win[ord(s2[i]) - ord('a')]     += 1
        win[ord(s2[i - n]) - ord('a')] -= 1
        if win == need:                    # O(26) compare = constant
            return True

    return False
```

### 5.3 Trace on Example 1 — `s1 = "ab"`, `s2 = "eidbaooo"`

`need = {a:1, b:1}`; seed window `s2[0..1] = "ei"` → `win = {e:1, i:1}` — not equal.

| `i` | enters | leaves | window after | `win` (nonzero) | `need` | match? |
|---|---|---|---|---|---|---|
| 2 | `d` | `e` | `"id"` | i:1, d:1 | a:1, b:1 | ✗ |
| 3 | `b` | `i` | `"db"` | d:1, b:1 | a:1, b:1 | ✗ |
| 4 | `a` | `d` | `"ba"` | b:1, a:1 | a:1, b:1 | ✅ **True** |

### 5.4 Trace on Example 2 — `s1 = "ab"`, `s2 = "eidboaoo"`

Seed `"ei"` — not equal. Slide through every window:

| `i` | enters | leaves | window after | `win` (nonzero) | match? |
|---|---|---|---|---|---|
| 2 | `d` | `e` | `"id"` | i:1, d:1 | ✗ |
| 3 | `b` | `i` | `"db"` | d:1, b:1 | ✗ |
| 4 | `o` | `d` | `"bo"` | b:1, o:1 | ✗ |
| 5 | `a` | `b` | `"oa"` | o:1, a:1 | ✗ |
| 6 | `o` | `o` | `"ao"` | a:1, o:1 | ✗ |
| 7 | `o` | `a` | `"oo"` | o:2 | ✗ |

Return `False`. Note how the counts make the near-misses crisp: `'b'` and `'a'` are each in *some* window, but never **together** with the right multiplicities in any length-2 window.

### 5.5 Refinement: O(1)-per-slide `matches` counter

`win == need` costs up to 26 comparisons per slide. To make each slide strictly O(1), maintain `matches` = *the number of letters `c` with `win[c] == need[c]`*. The window is a permutation of `s1` **iff** `matches == 26`. Each count update changes `matches` by at most 1, and we know exactly when:

```python
def checkInclusion(s1: str, s2: str) -> bool:
    n, m = len(s1), len(s2)
    if n > m:
        return False

    need = [0] * 26
    for ch in s1:
        need[ord(ch) - ord('a')] += 1
    win = [0] * 26
    matches = sum(1 for c in range(26) if win[c] == need[c])  # 26 - (# distinct letters in s1)

    for i in range(m):
        c = ord(s2[i]) - ord('a')                 # s2[i] enters
        if win[c] == need[c]:      matches -= 1   # was matched -> surplus
        elif win[c] == need[c] - 1: matches += 1  # will become matched
        win[c] += 1

        if i >= n:                                # s2[i-n] leaves
            d = ord(s2[i - n]) - ord('a')
            if win[d] == need[d]:      matches -= 1  # was matched -> deficit
            elif win[d] == need[d] + 1: matches += 1  # was surplus -> matched
            win[d] -= 1

        if i >= n - 1 and matches == 26:          # first full window at i = n-1
            return True
    return False
```

**Matches-counter trace (Example 1).** `need = {a:1, b:1}`; initially `matches = 24` (all letters except `a`, `b`):

| `i` | event | Δ matches | matches | full-window check |
|---|---|---|---|---|
| 0 | enter `e` (0→1 vs need 0) | −1 | 23 | — |
| 1 | enter `i` | −1 | 22 | 22 ≠ 26 |
| 2 | enter `d` (−1); evict `e` (1→0, +1) | net 0 | 22 | ✗ |
| 3 | enter `b` (0→1 vs need 1, +1); evict `i` (+1) | +2 | 24 | ✗ |
| 4 | enter `a` (+1); evict `d` (+1) | +2 | **26** | ✅ **True** |

This "incremental equality bookkeeping" trick is the same `formed`/`matches` counter you'll reuse in *Minimum Window Substring* (LC 76). Trade-off to mention: the array-compare version is harder to get wrong and fast enough here (26 is constant); the matches version is the strictly optimal constant and what interviewers often probe for.

*(Equivalent single-array variant: keep only `need` and decrement it for window characters; a window matches iff every entry is exactly 0. Same complexity — just don't mix the two mental models mid-code.)*

### 5.6 Optional extension: alphabets larger than 26

If characters were arbitrary, count arrays of size Σ would make each comparison `O(Σ)`. You can instead hash the count vector, e.g. `H = Σ (win[c]+1)·b^c mod p` for a random base `b` and prime `p`: each slide changes exactly two counts, so `H += b^{c_in} − b^{c_out} (mod p)` — an **O(1) update** — and on hash equality you verify full vectors to eliminate collisions. Collision risk is soundly bounded: two distinct count vectors make the hash difference a nonzero polynomial of degree ≤ Σ−1 in the base, which has at most Σ−1 roots mod prime `p`, so a uniformly random base collides with probability ≤ (Σ−1)/p per comparison. For this problem's Σ = 26 and `10^4`-sized inputs, the deterministic array approach is simpler and strictly correct — say the hash idea only if asked about huge alphabets.

---

## 6. Complexity

Let `n = len(s1)`, `m = len(s2)`, Σ = alphabet size (26 here).

| Approach | Time | Space | Verdict at `m = n = 10^4` |
|---|---|---|---|
| Enumerate all `n!` permutations, substring-search each | `O(n!·n·m)` | — | Absurd; `13! ≈ 6.2×10^9` already |
| Sort each window vs sorted `s1` | `O((m-n+1)·n log n)` | `O(n)` | ≈ `3×10^8` comparisons worst — TLE in Python, borderline in C++ |
| Recount each window (§3.2) | `O((m-n+1)·n)` = `O(m·n)` | `O(Σ)` | Worst `m²/4 ≈ 2.5×10^7` steps — OK in C++, TLE in Python |
| **Slide + compare 26-arrays (§5.2)** | **`O(n + 26·m)` = `O(Σ·m)`** | `O(Σ)` | ≈ `2.6×10^5` element comparisons — trivial |
| **Slide + `matches` counter (§5.5)** | **`O(m + n)` — O(1) work per slide** | `O(Σ)` | ≈ `10^4` iterations — optimal for this method |

If the alphabet were unbounded, replace 26 with Σ in the compare version; the matches version stays `O(m + n)` regardless. (And if asked: binary search does not apply — there is no monotone parameter; the property concerns one fixed length `n`.)

---

## 7. Common mistakes & gotchas

**Logic / Python:**

1. **Missing the `n > m` guard.** In Python the seeding loop `for i in range(n): win[ord(s2[i])…]` raises `IndexError` when `s1` is longer than `s2` — which the constraints explicitly allow. Guard first.
2. **Letter-set thinking instead of counts.** `s1 = "aabbb"`, `s2 = "abbbba"` → every window shares `{a, b}` with `s1` but counts never match (`a:1, b:4` vs `a:2, b:3`) → answer `False`. A set/membership check returns a wrong `True`.
3. **Using the window sum as the test.** Every length-`n` window sums to `n`, which equals `sum(need)` by construction — the check is vacuous and silently passes wrong code. You must compare per-letter counts.
4. **Eviction off-by-one.** The window *starts* at `i-n+1`, but the evicted character is `s2[i-n]` (the previous window's start). Using `s2[i-n+1]` corrupts counts and often still passes the tiny official examples — trace a length-3 window to catch it.
5. **Forgetting the first window.** In the seed-then-slide structure, the seed `win == need` check is required: when `n == m`, the slide loop never runs, and without it you'd wrongly return `False`. In the matches version, the gate is `i >= n-1` (first full window at index `i = n-1`).
6. **Accidental `O(m·n)` in disguise.** `Counter(s2[i:i+n])` or any slice/rebuild inside the loop is `O(n)` per iteration — this is the brute force wearing a sliding-window costume.
7. **`Counter` equality is version-dependent in Python.** In ≤3.9, `Counter` inherits dict equality — zero entries are real keys and matter (`Counter({'a':1,'b':0}) != Counter({'a':1})`); in ≥3.10, `Counter` equality treats missing and zero counts as equal. Same code, different behavior across versions — prefer two plain 26-slot lists, which are also faster.

**Java / C++ implementation gotchas:**

| Language | Gotcha | Fix |
|---|---|---|
| Java | `HashMap<Character,Integer>` autoboxes on every update, and comparing wrapper counts with `==` compares *references* — the cache only spans −128..127, while counts here reach `10^4` | Use `int[] cnt = new int[26]` and `Arrays.equals(need, win)`, or compare with `.equals()` |
| Java | `char` → index arithmetic `c - 'a'` is fine for lowercase; the signedness trap only bites for non-ASCII alphabets | N/A here, but note it if asked to generalize |
| C++ | Indexing with a raw `char` that may be *signed* → negative index = undefined behavior (general alphabets) | Cast: `cnt[(unsigned char)c]++` |
| C++ | `std::array<int,26>` supports element-wise `==` (unlike raw `int[26]`, which needs `std::memcmp`/`std::equal`) | Prefer `std::array` (or `std::vector`) |
| C++ | In multi-test harnesses, stale count arrays from a previous case leak into the next | Re-initialize (`std::array` value-init or explicit fill) per call |

**Also worth saying:** you never need to reconstruct the permutation itself — if you find yourself trying to, you've lost the "counts, not orderings" reduction.

---

## 8. Test cases to propose out loud

State these before or right after coding — each one targets a specific failure mode:

| # | Input | Expected | What it catches |
|---|---|---|---|
| 1 | `s1="ab"`, `s2="eidbaooo"` | `True` | Official example 1 |
| 2 | `s1="ab"`, `s2="eidboaoo"` | `False` | Official example 2 — near-miss windows (`"bo"`, `"oa"`, `"ao"`) |
| 3 | `s1="abc"`, `s2="ab"` | `False` | `n > m` guard — crashes with `IndexError` if missing |
| 4 | `s1="a"`, `s2="a"` | `True` | Minimal case, `n == m == 1` |
| 5 | `s1="abb"`, `s2="abab"` | `True` (window `"bab"`: b:2, a:1) | Duplicates handled by counts |
| 6 | `s1="aab"`, `s2="abba"` | `False` (`"abb"` = a:1,b:2; `"bba"` = b:2,a:1) | Duplicate-sensitive **negative** |
| 7 | `s1="aabbb"`, `s2="abbbba"` | `False` | Kills set-equality false positives (§7.2) |
| 8 | `s1="aaa"`, `s2="aaaa"` | `True` | All-identical letters; match at window edge |
| 9 | `s1`, `s2` both length `10^4`, match only in the final window | `True`, fast | Performance; match at the very last start index |

After coding, dry-run example 1 line by line against your actual code (seed → three slides → return at `i = 4`) rather than narrating your intention.

---

## 9. Transferable patterns & related problems

**Reusable ideas from this problem:**

- **Reduce permutation/anagram questions to multiset (frequency-vector) equality** — search over counts, never over orderings.
- **Fixed-size window template:** *add the entering character, evict the leaving character (`s2[i-n]`), check the invariant each step.* No grow/shrink pointers needed when the length is fixed.
- **Incremental equality bookkeeping:** a `matches`/`formed` counter that changes by O(1) per update turns an `O(Σ)` comparison per step into `O(1)` — the same device as `formed` in LC 76.

| Related problem | Relationship |
|---|---|
| LC 242 — Valid Anagram | Multiset equality without the window (the sub-routine of this problem) |
| LC 438 — Find All Anagrams in a String | **This exact check**, returning every start index — nearly identical code, collect indices instead of returning |
| LC 76 — Minimum Window Substring | Variable-length window; reuse the `matches`/`formed` counter idea |
| LC 30 — Substring with Concatenation of All Words | Fixed-length window in word-blocks; multiset of *words* via hashmap |
| LC 3 / 159 / 340 — Longest substring without repeats / with ≤K distinct | Variable window with a distinct-count invariant |
| LC 1234 — Replace the Substring for Balanced String | Fixed-window cousin: slide until the *outside* counts satisfy a budget |
| LC 2444 — Count Subarrays With Fixed Bounds | Harder fixed-window invariant tracking |

---

## 10. Full interview talk track

**Clarify (0:00–0:40).** "A permutation of `s1` is an anagram — same letters, same counts, any order. We need to know whether any *contiguous* substring of `s2` of length exactly `len(s1)` has the same character counts as `s1`. I assume lowercase letters only, boolean answer, and I noticed `s1` may be longer than `s2`, in which case it can't fit — I'll return `False` for that."

**Kill the naive reading (0:40–1:10).** "Enumerating permutations is factorial — dead end even for `n = 13`. But I don't care about order *inside* the window, only counts. So the real question: is there a length-`n` window of `s2` whose 26-slot count array equals `s1`'s?"

**Brute force, briefly (1:10–1:40).** "Baseline: recount every window from scratch — `O((m-n+1)·n)`, about `2.5×10^7` steps worst case here. Right idea, too slow for Python. The fix: consecutive windows share `n-1` characters, so when the window slides, exactly one character enters and one leaves."

**Algorithm (1:40–3:00).** *[Board: two 26-slot arrays `need`, `win`.]* "Seed `need` from `s1` and `win` from `s2`'s first window — and check that first window, since `n == m` is possible. Then for each slide, `win[s2[i]]++`, `win[s2[i-n]]--`, compare. After step `i` the window is exactly `s2[i-n+1 .. i]`." *"Quick dry run on `s1='ab', s2='eidbaooo'`: seed `'ei'`, then `d` in/`e` out → `'id'`, `b` in/`i` out → `'db'`, `a` in/`d` out → `'ba'` — counts match `a:1, b:1` → `True`."*

**Complexity (3:00–3:30).** "Seeding `O(n)`, each slide `O(1)` update plus an `O(26)` compare, so `O(n + 26m)` time, `O(26)` space. At `10^4` that's ~`2.6×10^5` element comparisons. If I want strictly O(1) per slide, I keep a `matches` counter — the number of letters whose window count equals the required count; each update flips at most one letter's matched status, and the window is a permutation exactly when `matches == 26`. Same trick as `formed` in Minimum Window Substring."

**Edges & tests (3:30–4:00).** "`s1` longer than `s2` → `False` before indexing. Duplicates are handled by counting, not sets — e.g. `'aab'` vs `'abba'` is `False` though the letter sets match. Single characters, all-identical letters, and a match in the last window."

**Code it (4:00–7:00).** Write §5.2, narrating the enter/evict indices. Then run example 1 aloud against the code, and state tests 3, 6, 7 from the table.

---

## 11. Say it in 60 seconds

> "A permutation of `s1` just means an anagram — same letters, same multiplicities, any order. So the real question is: does `s2` contain a substring of length exactly `len(s1)` whose character counts match `s1`'s exactly? That's a fixed-size sliding window. Build two 26-slot count arrays — one for `s1`, one for `s2`'s first window — then slide one position at a time: the entering character's count goes up, the leaving character's count goes down, and compare. The compare is constant time, so it's `O(m)` time, `O(1)` space. If I want zero constant per slide, I keep a `matches` counter — how many of the 26 letters currently agree, updated in `O(1)` per add and remove — and the window is a permutation exactly when `matches` hits 26. Edge cases: `s1` longer than `s2` returns `False` immediately; duplicates must be counted, not set-compared; and never use the window sum as the test — every length-`n` window has the same sum by definition."
