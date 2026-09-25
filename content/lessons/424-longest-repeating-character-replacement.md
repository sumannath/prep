# Longest Repeating Character Replacement (LeetCode 424) — Complete Lesson

## 1. Problem Restatement (and what's *really* being asked)

You're given a string `s` of uppercase English letters and an integer `k`. You may change any single character of `s` into any other uppercase letter, at most `k` times **total**. Return the length of the longest **contiguous** substring that consists of one repeated letter after those changes.

Precise rewording (this is the sentence to say out loud in an interview):

> Find the maximum length `r − l + 1` over all windows `s[l..r]` (0-based, **inclusive** endpoints) such that you can make every character in that window identical using **at most k** single-character substitutions.

Clarifications worth stating before coding:

- **Contiguous** — it's a substring, not a subsequence. Duplicates/repetitions are the whole point of the problem; the count structure must track multiplicities, not just presence.
- **"At most k"** — you don't have to spend all `k` edits, and unused edits are not wasted. (`"AAAA"`, `k = 10` → answer `4`, not something larger.)
- The budget applies to the **one** substring you're measuring. Since edits outside the answer window can't help it, we can mentally place all `k` edits inside the winning window — which is what makes the counting argument below valid.
- We return a **length**, not the substring itself (a common follow-up asks for the substring — see §11).

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= s.length <= 10^5` | Target ~O(n) or O(26·n). With n = 10⁵, there are n(n+1)/2 ≈ 5×10⁹ substrings (a substring is pinned down by choosing its start and end index), so even an O(n²) sweep with per-step O(26) work is ~10¹¹+ operations — out of budget. A useful rule of thumb: Python does roughly 10⁷ simple loop operations per second, so aim for a single pass with cheap per-step work. |
| Uppercase `A`–`Z` only | A fixed `int[26]` counter array works; no hashing, and recomputing the max frequency costs O(26) = O(1). |
| `0 <= k <= s.length` | `k = 0` is a real case (answer = longest existing run of one letter); `k = n` is too (whole string usually wins). Test both. |
| `n >= 1` | The answer is at least 1 — a single character always needs 0 edits. |

Edge behavior worth pre-committing to: `k = 0` degenerates to "longest existing run"; `k` larger than needed never hurts; the answer never exceeds `n`.

---

## 3. Brute Force (and why it dies at scale)

**Idea:** enumerate every window, count letters, and check the condition we'll derive in §4: a window is convertible with ≤ k edits iff `len − maxFreq ≤ k`.

```python
def characterReplacement_bruteforce(s: str, k: int) -> int:
    n = len(s)
    best = 0
    for left in range(n):
        count = [0] * 26
        for right in range(left, n):
            count[ord(s[right]) - 65] += 1          # 65 == ord('A')
            if (right - left + 1) - max(count) <= k:
                best = max(best, right - left + 1)
            else:
                break   # safe: extending an invalid window keeps it invalid
    return best
```

The `break` is justified: growing the window increases `len` by 1 while `maxFreq` can rise by at most 1, so `len − maxFreq` never decreases once positive.

**Worked trace** — `s = "AABABBA"`, `k = 1`, anchor `left = 0` (indices 0-based, inclusive):

| `right` | window | len | counts | maxFreq | len − maxFreq | ≤ k? | best |
|---|---|---|---|---|---|---|---|
| 0 | `A` | 1 | A:1 | 1 | 0 | ✅ | 1 |
| 1 | `AA` | 2 | A:2 | 2 | 0 | ✅ | 2 |
| 2 | `AAB` | 3 | A:2, B:1 | 2 | 1 | ✅ | 3 |
| 3 | `AABA` | 4 | A:3, B:1 | 3 | 1 | ✅ | **4** |
| 4 | `AABAB` | 5 | A:3, B:2 | 3 | 2 | ❌ → break | 4 |

Best per anchor: `left=0 → 4`, `left=1 → 3` (`ABA`), `left=2 → 4` (`BABB`), `left=3 → 3` (`ABB`), `left=4 → 3` (`BBA`), `left=5 → 2`, `left=6 → 1`. Global answer: **4**. ✔

**Complexity:** with incremental counting it's O(26·n²) time (n left anchors × ≤ n right extensions, each with an O(26) max scan), O(26) space. Naive recount-per-substring is O(n³) — the substring count alone is Θ(n²) because a substring is determined by its start and end indices. Either way, hopeless at n = 10⁵.

---

## 4. The Core Insight

Fix a window `s[l..r]` and a **target letter X**. To make the window uniform, you must change every character that isn't `X`:

```
cost(window, X) = windowLen − count(X in window)
```

The cheapest target is the **most frequent character already in the window** (introducing a brand-new letter starts at count 0 and is never better), so:

> **A window can be made single-letter with ≤ k edits ⟺ `windowLen − maxFreq(window) ≤ k`.**

Rephrased: *find the longest window whose "minority" (everything that isn't the dominant letter) has size ≤ k.* Ties for the mode don't matter — only the max count value enters the formula, never which letter achieves it.

Two consequences:

1. **Heredity:** any sub-window of a convertible window is convertible (the same ≤ k edits, restricted, fix it). This monotone predicate is exactly what makes a two-pointer sliding window work — expand right, shrink left only when the constraint breaks.
2. **We never actually perform replacements.** The deficit `len − maxFreq` is all we need; simulating edits is a bug factory.

---

## 5. Optimal Approach — Sliding Window with Exact Max Frequency

**Algorithm:** expand `right` one character at a time, updating a 26-slot count array. While the window is invalid (`len − maxFreq > k`), advance `left`, decrementing as you go. After each step the window is valid, so record its length.

```python
def characterReplacement(s: str, k: int) -> int:
    count = [0] * 26                    # count[c] = occurrences of letter c in the window
    left = 0
    best = 0
    for right, ch in enumerate(s):
        count[ord(ch) - 65] += 1        # 'A' == 65; index by letter VALUE, l/r are INDICES
        # Shrink until the window can be made uniform with <= k edits
        while (right - left + 1) - max(count) > k:
            count[ord(s[left]) - 65] -= 1   # remove s[left] FIRST, then advance
            left += 1
        best = max(best, right - left + 1)
    return best
```

The window is never empty after the loop: at length 1, `maxFreq ≥ 1`, so `1 − maxFreq ≤ 0 ≤ k`.

### Trace — Example 1: `s = "ABAB"`, `k = 2` (counts shown as A:B)

| r | char | window `[l..r]` | len | maxFreq | deficit | action | best |
|---|---|---|---|---|---|---|---|
| 0 | A | `[0,0]` | 1 | 1 | 0 | keep | 1 |
| 1 | B | `[0,1]` | 2 | 1 | 1 | keep | 2 |
| 2 | A | `[0,2]` | 3 | 2 | 1 | keep | 3 |
| 3 | B | `[0,3]` | 4 | 2 | 2 ≤ 2 | keep | **4** |

Never shrinks → returns **4**. ✔ (Whole string: 2 A's + 2 B's → keep either letter, 2 edits.)

### Trace — Example 2: `s = "AABABBA"`, `k = 1`

| r | char | window before shrink | counts | len | maxFreq | deficit | action | best |
|---|---|---|---|---|---|---|---|---|
| 0 | A | `[0,0]` | A:1 | 1 | 1 | 0 | keep | 1 |
| 1 | A | `[0,1]` | A:2 | 2 | 2 | 0 | keep | 2 |
| 2 | B | `[0,2]` | A:2 B:1 | 3 | 2 | 1 | keep | 3 |
| 3 | A | `[0,3]` | A:3 B:1 | 4 | 3 | 1 | keep | **4** |
| 4 | B | `[0,4]` | A:3 B:2 | 5 | 3 | 2 > 1 | pop `s[0]`=A → `[1,4]`; still 4−2=2>1 → pop `s[1]`=A → `[2,4]` = `BAB`, 3−2=1 ✅ | 4 |
| 5 | B | `[2,5]` | A:1 B:3 | 4 | 3 | 1 | keep (`BABB` is genuinely valid) | 4 |
| 6 | A | `[2,6]` | A:2 B:3 | 5 | 3 | 2 > 1 | pop `s[2]`=B → `[3,6]`, 4−2=2>1 → pop `s[3]`=A → `[4,6]` = `BBA`, 3−2=1 ✅ | 4 |

Returns **4** — matching the explanation (`"BBBB"` from `[2,5]`→ replace one `A`, or `[0,3]` `"AABA"` → replace one `B`). Note the two multi-pop shrink steps: that's why the main loop needs `while`, not `if`.

**Complexity:** each index enters the window once and leaves at most once; each entry/exit pays O(26) for the max scan → **O(26·n) time, O(26) = O(1) space**. For n = 10⁵ that's ~2.6×10⁶ cheap operations.

---

## 6. O(n) Refinement — the Never-Shrink Window + Sticky `maxFreq`

Two classic micro-optimizations, which only work **as a matched pair**:

1. **Sticky max:** never lower `maxFreq` when characters leave. It may overestimate the current window's true max — that's allowed, for reasons below.
2. **Never shrink:** when the window would exceed `maxFreq + k`, advance `left` exactly once (an `if`, not a `while`). The window length then never decreases, and the answer is simply the final window length.

```python
def characterReplacement(s: str, k: int) -> int:
    count = [0] * 26
    left = 0
    max_freq = 0                        # sticky: only ever increases
    for right, ch in enumerate(s):
        count[ord(ch) - 65] += 1
        max_freq = max(max_freq, count[ord(ch) - 65])
        if (right - left + 1) - max_freq > k:
            count[ord(s[left]) - 65] -= 1   # slide, don't shrink
            left += 1
    return len(s) - left                # final window is [left, n-1]
```

**Trace on Example 2** (`"AABABBA"`, `k=1`): the window grows to `[0,3]` = `"AABA"` (len 4, genuinely valid). At r=4 the deficit would hit 2, so we slide: `[1,4]`. At r=5, slide again: `[2,5]` = `"BABB"` (genuinely valid, len 4 confirmed). At r=6, slide again: `[3,6]` = `"ABBA"` — **this final window is actually invalid** (needs 2 edits), and that's fine: we only trust the *length* 4, which was earned earlier. Return `7 − 3 = 4`. ✔

**Why it's still correct (30-second proof sketch):**

- **Never overstates:** the window length grows by 1 only when the condition holds after the new character arrives. Either (a) the incoming character just raised `max_freq` to `newLen − k` and it lives in the current window — so that exact window needs ≤ k edits; or (b) no raise happened and the length was still below the cap `maxFreq + k` — which can only occur before the first slide, when nothing has ever been removed and the sticky `maxFreq` equals the window's true max. Either way, every length the window attains was earned by a genuinely convertible window.
- **Never undershoots:** `left` can never step from `i` to `i+1` while `right < j` for any convertible window `[i, j]` — taking that step would mean the window `[i, right′]`, a strict sub-window of `[i, j]`, needs more than k edits, but the same ≤ k edits that fix `[i, j]` fix any part of it. So when `right` first reaches `j`, the window is already ≥ `j − i + 1` long, and lengths never decrease.

Bonus: this version never scans 26 counters for a max, so it stays O(n) even if you swap the array for a hash map to support **arbitrary alphabets** — worth saying in a follow-up.

**Warning (interview gold):** don't mix and match. "Sticky maxFreq + full `while`-shrink" or "exact max + slide-once" each change which invariant is doing the correctness work. If you keep `maxFreq` sticky, use the slide-once form; if you shrink with a `while`, recompute the true max inside the loop. Mixing them leaves correctness subtle and easy to get wrong under time pressure — pick one of the two standard forms above and say which invariant you're relying on.

---

## 7. Complexity Summary

| Approach | Time | Space | Notes |
|---|---|---|---|
| Enumerate all windows, recount each | O(n³) | O(1) | Θ(n²) windows (start/end pick), O(n) check each |
| Enumerate with incremental counts + early break | O(26·n²) worst | O(26) | Worst case is a run-heavy string where nothing breaks early |
| Binary search the answer length + fixed-window sweep | O(26·n·log n) | O(26) | Valid because the predicate is monotone — any sub-window of a convertible window is convertible — and each length-check is one linear sweep with an O(26) max recomputation per slide |
| **Sliding window, exact max (§5)** | **O(26·n)** | **O(26)** | Main solution; simple to prove |
| Never-shrink + sticky max (§6) | O(n) | O(26) | Optimal; also the alphabet-agnostic form |

Lower bound: you can't beat Ω(n) — an algorithm that skips any position `s[i]` returns the same answer for two inputs differing only there (make `s[i]` the character that would extend the best run), so one of the two answers must be wrong. The main solution is therefore asymptotically optimal up to the constant 26.

---

## 8. Test Cases to Propose Out Loud

Say these before or right after coding — it signals rigor and catches most bugs early.

| # | Input | k | Expected | What it guards |
|---|---|---|---|---|
| 1 | `"ABAB"` | 2 | 4 | Official; entire string convertible |
| 2 | `"AABABBA"` | 1 | 4 | Official; multi-step shrink, best is interior |
| 3 | `"AABABBA"` | 0 | 2 | `k=0` → pure longest-run mode (`"AA"`/`"BB"`) |
| 4 | `"A"` | 0 | 1 | Smallest input; window of length 1, no crash on empty-ish state |
| 5 | `"ABCDEF"` | 6 | 6 | `k` bigger than ever needed — "at most k," unused edits are fine |
| 6 | `"ABABAB"` | 1 | 3 | Tricky: every length-4 window is 2+2, so nothing longer than 3 works (also the counterexample for mistake #1 below) |
| 7 | `"BBBB"` | 0 | 4 | All-same string, zero edits |

---

## 9. Common Mistakes

1. **Using the most frequent character of the *whole string* instead of the window.** E.g. `"ABABAB"`, `k=1`: global max count is 3, so a buggy "cap = globalMax + k" scan returns 4 — but every length-4 window here is 2 A's + 2 B's and needs 2 edits. Correct answer: **3**. The mode must be recomputed *per window*.
2. **`if` vs `while` confusion.** With the exact-max version (§5), a single `if` can leave an invalid window in place after a big shrink is needed (see r=4 and r=6 in the Example 2 trace). Conversely, bolting a `while` onto the sticky-max version breaks the pairing (see §6 warning).
3. **Decrement-order bug:** remove `s[left]` from the counts *before* incrementing `left`. Doing `left += 1` first, or decrementing `s[left + 1]`, silently corrupts the counts. In the never-shrink version, also resist the urge to lower `maxFreq` on removal — stickiness is the point.
4. **`max(count)` on a dict in Python** returns the largest *key* (alphabetically last letter), not the largest count. Use `max(count.values())` — or index a 26-slot list, where `max(count)` is correct.
5. **Off-by-one in window length:** it's `right − left + 1`, not `right − left`. A wrong formula usually still "works" for multi-char windows and only fails on single-character windows.
6. **Assuming exactly `k` edits must be used** (`"AAAA"`, `k=10` → 4, not 0-or-error), or that edits carry over between candidate windows.
7. **Simulating the replacements** (queues of changed positions, materializing strings). The deficit formula makes simulation unnecessary; simulate only if asked to return the *actual edited string*.
8. **Returning the wrong artifact:** the problem wants a length; if asked for the substring, snapshot `left` whenever `best` improves.

---

## 10. Language Gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| Java | Prefer `int[] cnt = new int[26]` over `HashMap<Character, Integer>`: the map autoboxes on every `merge`/`get`-and-put, and `Collections.max(map.values())` throws `NoSuchElementException` if you get aggressive about deleting zero-count keys mid-loop. Index with `s.charAt(i) - 'A'`. |
| C++ | `std::max_element(cnt.begin(), cnt.end())` returns an **iterator** — dereference it (`*max_element(...)`); needs `<algorithm>`. Take the string as `const std::string&` to avoid a copy per call. Overflow is a non-issue here (counts and lengths ≤ 10⁵ fit in `int`), but keep the habit of checking. |
| Python | `max(count)` on a `dict` iterates keys (see mistake #4). `collections.defaultdict(int)` inserts zero entries when you *read* a missing key (harmless for `max(values())`, but it bloats iteration); `Counter[ch]` reads missing keys as 0 without inserting. |

---

## 11. Transferable Patterns & Related Problems

**The reusable template — "longest window satisfying a monotone predicate":**

```text
left = 0
for right in 0..n-1:
    add s[right] to window state
    while state violates constraint:
        remove s[left]; left += 1
    best = max(best, right - left + 1)
```

Key transferable ideas from this problem:

- **"Pay for the minority":** convert "make uniform with ≤ k changes" into "windowLen − dominantCount ≤ k." The same trick solves any *longest window where the non-target portion is budgeted*.
- **Heredity ⇒ two pointers (or binary search):** when validity is preserved under taking sub-windows, the two-pointer sweep is valid, and binary-searching the answer length also works (at O(n·check) per probe).
- **Sticky statistic + never-shrink window:** when you only need the maximum length, the window never needs to shrink below the best so far.
- **Longest vs. shortest duality:** longest-valid-window problems shrink *when invalid* (424, 1004, 340); shortest-valid-window problems shrink *while valid* and record before shrinking (76, 209-style).

Direct relatives to practice:

| Problem | Relation |
|---|---|
| LC 1004 — Max Consecutive Ones III | Identical skeleton on 0/1: `len − count(1s) ≤ k` |
| LC 2024 — Maximize the Confusion of an Exam | Run this window twice (target `'T'`, then `'F'`), take the max |
| LC 3 — Longest Substring Without Repeating Characters | Longest window, validity = every count ≤ 1 |
| LC 340 / LC 904 — At Most K Distinct / Fruit Into Baskets | Longest window, validity = distinct count ≤ k |
| LC 76 — Minimum Window Substring | The "shortest valid window" mirror: shrink while still covering |
| LC 209 — Minimum Size Subarray Sum | Shortest window with sum ≥ target (non-negative numbers) |
| LC 438 / 567 — Anagrams | Fixed-length windows with count arrays |

**Likely follow-ups and quick answers:**

- *"Return the substring itself."* Snapshot `best_left = left` whenever `best` improves; return `s[best_left : best_left + best]`.
- *"Arbitrary Unicode / huge alphabet?"* Swap `int[26]` for a hash map and keep the never-shrink + sticky-max form — it never scans all letters, so it stays O(n) expected (hash operations are O(1) amortized because each key insert/remove is charged to a window entry/exit).
- *"Why not DP?"* The state would need the window's multiset — exponential/intractable; the two-pointer formulation exploits the interval structure instead.
- *"Edits restricted to letters already in `s`?"* Answer unchanged: the optimal target is the window's own mode, which is already present.

---

## 12. Interview Narration Script (Fuller Talk Track)

1. **Clarify:** "So we're looking for one contiguous substring that, after at most k single-character edits, becomes a single repeated letter — and we return its length."
2. **Brute force first:** "I could try every window — there are roughly n² of them since a window is just a start and end index — and check `len − maxFreq ≤ k`. That's O(n³) naive, O(n²) with incremental counts, too slow for n = 10⁵."
3. **Insight:** "The key realization: to make a window uniform I keep its most frequent letter and pay for everything else. So a window is achievable exactly when `windowLen − maxFreq ≤ k` — I'm hunting the longest window whose minority fits in budget k."
4. **Approach:** "That's a textbook sliding window. Expand `right`, add to a 26-slot counter, and while the deficit exceeds k, pop from `left`. After each step the window is valid, so I record its length. Each index enters and leaves once, and the max scan is O(26), so O(26·n) time, O(1) space."
5. **Trace:** "On `"AABABBA"`, k=1: the window grows to `"AABA"` (length 4), then at index 4 it overflows and I pop two characters, and it re-validates at `"BABB"` — length 4 again. Answer 4."
6. **Edge cases:** "k = 0 reduces to the longest existing run; a single character returns 1; if k exceeds what's ever needed, the answer is just the longest useful window."
7. **Optimization offer:** "If you want strict O(n): keep `maxFreq` sticky — never decrease it — and instead of shrinking, slide the window once so its length never decreases. Every length the window gains was genuinely achievable: growth happens either while the window is still a pristine prefix, or exactly when some character's count sets a new record equal to `newLen − k`. And it never misses better windows, because `left` can't cross the start of any valid window before `right` reaches its end — a sub-window of a valid window is always valid."

---

## 13. Say It in 60 Seconds

> "Repeating Character Replacement: I can change up to k characters, and I want the longest substring that ends up all one letter. Key observation: a window can be made uniform with at most k edits if and only if window length minus its most-frequent character's count is at most k — I keep the majority and pay for the minority. So it's a sliding window: I expand right, update a 26-slot count array, and while length minus max frequency exceeds k, I advance left and decrement. After each step the window is valid, so I record its length. That's O(26·n) time, O(1) space — fine for n up to 10⁵. If they want more: keep max frequency sticky — never lower it — and instead of shrinking, slide left once so the window length never decreases; that's O(n), and it's safe because the length only grows when some character's count genuinely sets a new record, and `left` can never skip past the start of a valid window before `right` reaches its end. Edge cases I'd call out: k = 0 is just the longest existing run, a single character returns 1, and unused edits are fine."
