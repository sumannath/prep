# Longest Substring Without Repeating Characters — Complete Interview Lesson

**Pattern:** Sliding window (variable-size) · **Difficulty:** Medium · **LeetCode 3**

This is the canonical warm-up for the entire sliding-window family. Interviewers use it to check whether you can (a) find the monotonic-two-pointers insight yourself, (b) argue amortized complexity, and (c) handle the infamous stale-index edge case. This lesson goes all the way from brute force to a single-pass O(n) solution, with traces, test plans, and a recitable talk track.

---

## 1. Problem Restatement

Given a string `s`, return the **length** of the longest **substring** (contiguous slice `s[i..j]`) in which **no character appears more than once**.

Things to pin down verbally in the first 60 seconds of the interview:

- **Substring ≠ subsequence.** Example 3 calls this out explicitly: for `"pwwkew"`, `"pwke"` (length 4) is a *subsequence* and does not count; the answer is `"wke"` (length 3).
- **We return the length, not the substring.** (A cheap follow-up asks for the substring itself — see §10.)
- **Duplicates are per-character and case-sensitive:** `"aba"` is invalid, `"abA"` is valid because `'a' ≠ 'A'`. A space is a real character: `" "` has answer 1.
- **The empty string is allowed** by the constraints (`0 <= s.length`) → answer is `0`.

Restated as an optimization over index pairs:

> Maximize `j - i + 1` over all pairs `(i, j)` with `i ≤ j` such that all characters in `s[i..j]` are distinct.

Note the precision: `i` and `j` are **indices**; `s[i]`, `s[j]` are **values**. Every bug in this problem is an index-vs-value or off-by-one bug.

---

## 2. Decoding the Constraints

| Constraint | What it tells us |
|---|---|
| `n ≤ 10^5` | O(n³) is hopeless: there are ~n²/2 substrings and re-checking each costs up to O(n) → ~n³/6 ≈ 1.7·10^14 character comparisons. O(n²) is ~n(n+1)/2 ≈ 5·10^9 set operations in the worst case (all-distinct input) — too slow, catastrophically so in Python. **Target: O(n).** |
| Charset = English letters, digits, symbols, spaces | This is printable ASCII — at most ~95–128 distinct characters. Two consequences: (1) we can replace hashing with a fixed 128-slot array for worst-case O(1) operations; (2) any duplicate-free window has length ≤ \|Σ\|, so the answer itself is capped at ~95 for this charset. |
| `n` can be `0` | Initialize `best = 0` and make sure the code returns 0 without crashing on an empty loop. |
| Spaces/symbols count | Don't trim, split, or tokenize. `s = "a a"` → answer 3 (`"a a"`). |

---

## 3. Brute Force, With a Worked Trace

**Step 0 (mention, don't code):** enumerate every substring and test uniqueness — O(n³). State it and move on.

**Sensible brute force:** fix the left endpoint `i`, grow the right endpoint `j`, maintain a set of characters currently in `s[i..j]`, and stop extending at the first repeat (once a repeat appears at `j`, no window starting at `i` and ending at `j' ≥ j` can be valid, because the repeated character stays inside).

```python
def lengthOfLongestSubstring_brute(s: str) -> int:
    best = 0
    for i in range(len(s)):                 # i = left index
        seen = set()                        # chars in window s[i..j]
        for j in range(i, len(s)):          # j = right index
            if s[j] in seen:
                break                        # window can never grow validly again
            seen.add(s[j])
            best = max(best, j - i + 1)     # window length = j - i + 1
    return best
```

**Worked trace on `s = "pwwkew"`** (indices: 0=`p`, 1=`w`, 2=`w`, 3=`k`, 4=`e`, 5=`w`):

| Start `i` | `j` sequence | Window reached | Why it stops | Best so far |
|---|---|---|---|---|
| 0 | j=0, 1 | `"pw"` (len 2) | `s[2]='w'` already in {p,w} | 2 |
| 1 | j=1 | `"w"` (len 1) | `s[2]='w'` already in {w} | 2 |
| 2 | j=2, 3, 4 | `"wke"` (len 3) | `s[5]='w'` already in {w,k,e} | **3** |
| 3 | j=3, 4, 5 | `"kew"` (len 3) | j hits end of string | 3 |
| 4 | j=4, 5 | `"ew"` (len 2) | end | 3 |
| 5 | j=5 | `"w"` (len 1) | end | 3 |

**Answer: 3.** ✓

**Complexity:** O(n²) time — worst case is an all-distinct string, where every inner loop runs to the end, giving n(n+1)/2 ≈ 5·10^9 steps at n = 10^5 (too slow: at a rough 10^7–10^8 simple Python operations per second this is minutes). O(min(n, Σ)) space for the set.

**The inefficiency to attack:** every time `i` advances by one, we throw away the set and re-scan characters we have already processed. Consecutive windows overlap in all but one character — that redundancy is the whole problem.

---

## 4. The Core Insight

Three observations, in increasing strength:

**Observation 1 — windows overlap.** When the left edge moves from `i` to `i+1`, the new window is "the old window minus one character." The set can be *maintained* instead of rebuilt.

**Observation 2 — the minimal left edge never moves backward (this is why two pointers is even legal).**
For each right index `r`, let `L(r)` be the smallest `left` such that `s[left..r]` is duplicate-free. **Claim: `L(r)` is non-decreasing in `r`.**
*Why:* if `s[L..r]` already contains a duplicate, then every window ending at `r` that starts even further left contains that same duplicate — so extending `r` to `r+1` can only push the minimal valid `left` rightward, never leftward. This monotonicity is what lets us sweep `right` once while `left` only ever advances — and it's why the answer is simply `max over r of (r − L(r) + 1)`, since every candidate window *ends* at some `r`.

**Observation 3 — on a duplicate, jump instead of shrink.**
When the incoming character `ch = s[r]` was last seen at index `k`, every window ending at `r` (or later!) that contains index `k` is invalid. By Observation 2, `left` can jump **directly to `k + 1`** — provided we track each character's last occurrence — instead of peeling characters off one at a time. One subtlety: if `k < left`, the previous occurrence is *already outside* the window and must be ignored ("stale index" — the #1 bug in this problem, dissected in §5.2).

**Invariant maintained by both optimal algorithms:** after processing index `r`, the window `s[left..r]` contains no duplicates, and `left` is the *minimal* index with that property. The answer is `max(r − left + 1)` over all `r`.

**Is O(n) optimal?** Yes, asymptotically: any correct algorithm must read every character in the worst case, because an unread position could be changed to a value that creates or breaks the longest duplicate-free window while leaving everything the algorithm saw unchanged — so an algorithm that skips positions returns wrong answers on some inputs.

---

## 5. Optimal Solution

### 5.1 Variant A — Sliding Window + Hash Set ("shrink until valid")

```python
def lengthOfLongestSubstring(s: str) -> int:
    window = set()      # chars currently in s[left..right]
    left = 0            # left INDEX of the window
    best = 0
    for right, ch in enumerate(s):          # right = index, ch = s[right] (value)
        while ch in window:                 # WHILE, not IF: may evict several chars
            window.remove(s[left])          # remove the VALUE at index left
            left += 1
        window.add(ch)
        best = max(best, right - left + 1)  # measure only after window is valid
    return best
```

Order matters: **shrink → add → measure.** Measuring before the `while` loop finishes would record an invalid window.

**Trace on `"abcabcbb"`** (this trace shows why the eviction loop must be `while`):

| `right` | `s[right]` | Eviction steps | `left` after | Window | `best` |
|---|---|---|---|---|---|
| 0 | `a` | — | 0 | `a` | 1 |
| 1 | `b` | — | 0 | `ab` | 2 |
| 2 | `c` | — | 0 | `abc` | 3 |
| 3 | `a` | remove `s[0]='a'` | 1 | `bca` | 3 |
| 4 | `b` | remove `s[1]='b'` | 2 | `cab` | 3 |
| 5 | `c` | remove `s[2]='c'` | 3 | `abc` | 3 |
| 6 | `b` | remove `s[3]='a'`, **then** `s[4]='b'` | 5 | `cb` | 3 |
| 7 | `b` | remove `s[5]='c'` | 6 | `b` | 3 |

**Answer: 3.** ✓ Note `right = 6`: one `if` would have removed only `'a'`, leaving a corrupted window — this is exactly where an `if`-instead-of-`while` implementation silently breaks.

**Trace on `"bbbbb"`:**

| `right` | `s[right]` | Eviction | `left` | Window | `best` |
|---|---|---|---|---|---|
| 0 | `b` | — | 0 | `b` | 1 |
| 1 | `b` | remove `s[0]` | 1 | `b` | 1 |
| 2 | `b` | remove `s[1]` | 2 | `b` | 1 |
| 3 | `b` | remove `s[2]` | 3 | `b` | 1 |
| 4 | `b` | remove `s[3]` | 4 | `b` | 1 |

**Answer: 1.** ✓

**Trace on `"pwwkew"`:**

| `right` | `s[right]` | Eviction | `left` | Window | `best` |
|---|---|---|---|---|---|
| 0 | `p` | — | 0 | `p` | 1 |
| 1 | `w` | — | 0 | `pw` | 2 |
| 2 | `w` | remove `s[0]='p'`, then `s[1]='w'` | 2 | `w` | 2 |
| 3 | `k` | — | 2 | `wk` | 2 |
| 4 | `e` | — | 2 | `wke` | **3** |
| 5 | `w` | remove `s[2]='w'` | 3 | `kew` | 3 |

**Answer: 3.** ✓

### 5.2 Variant B — Last-Occurrence Map ("jump left")

Never shrink one-by-one; remember where each character was last seen and teleport `left`.

```python
def lengthOfLongestSubstring(s: str) -> int:
    last_seen = {}   # char VALUE -> most recent INDEX of that char
    left = 0
    best = 0
    for right, ch in enumerate(s):
        # Jump only if the previous occurrence is INSIDE the current window.
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1        # jump PAST it (note the +1)
        last_seen[ch] = right               # record/update even when no duplicate
        best = max(best, right - left + 1)
    return best
```

A compact, bug-resistant form that subsumes the staleness check (a stale index is always `< left`, so `max` ignores it automatically):

```python
left = max(left, last_seen.get(ch, -1) + 1)
```

**The canonical trap: `s = "abba"`** (expected answer **2**):

| `right` | `ch` | `last_seen[ch]` before | Decision | `left` | Window | `best` |
|---|---|---|---|---|---|---|
| 0 | `a` | — | record `a→0` | 0 | `a` | 1 |
| 1 | `b` | — | record `b→1` | 0 | `ab` | 2 |
| 2 | `b` | 1 | 1 ≥ 0 → jump | 2 | `b` | 2 |
| 3 | `a` | 0 | **0 < 2 → stale, ignore** | 2 | `ba` | 2 |

**Answer: 2.** ✓ Drop the `>= left` guard and at `right = 3` you'd set `left = 0 + 1 = 1`, claiming window `s[1..3] = "bba"` — which contains **two `b`s** — and return 3. Wrong. The entry `a→0` refers to an index that left the window two steps ago; a hash map remembers forever, the window does not.

**Trace on `"tmmzuxt"`** (expected **5**, substring `"mzuxt"`) — the second classic test, where the duplicate is a *stale* character:

| `right` | `ch` | Decision | `left` | Window | `best` |
|---|---|---|---|---|---|
| 0 | `t` | record `t→0` | 0 | `t` | 1 |
| 1 | `m` | record `m→1` | 0 | `tm` | 2 |
| 2 | `m` | `m` at 1 ≥ 0 → jump | 2 | `m` | 2 |
| 3 | `z` | record | 2 | `mz` | 2 |
| 4 | `u` | record | 2 | `mzu` | 3 |
| 5 | `x` | record | 2 | `mzux` | 4 |
| 6 | `t` | `t` at 0, but 0 < 2 → **stale, ignore** | 2 | `mzuxt` | **5** |

**Answer: 5.** ✓

### 5.3 Why It's O(n): The Amortized Argument

- **Variant A:** `right` advances exactly `n` times. Every iteration of the `while` loop advances `left` by one, and `left` never exceeds `n` or moves backward. Total pointer movement ≤ 2n ⇒ **O(n) amortized** (each character is added to the set once and removed at most once).
- **Variant B:** a single pass with O(1) work per index. With a dict it's O(n) *expected* (hashing); swap in a fixed `last = [-1] * 128` array indexed by `ord(ch)` and it's O(n) *worst case*, since the alphabet is bounded by the constraints.
- **Space:** the set/map only ever holds characters present in a duplicate-free window, so its size is ≤ min(n, |Σ|) ≤ ~128 ⇒ **O(1)** effectively.

---

## 6. Complexity Table

| # | Approach | Time | Space | Verdict at n = 10^5 |
|---|---|---|---|---|
| 1 | Enumerate all substrings, recheck uniqueness each time | O(n³) — ~n³/6 ≈ 1.7·10^14 char comparisons, since there are ~n²/2 substrings each up to length n | O(min(n, Σ)) | ❌ hopeless |
| 2 | Fix left, extend right, break at first repeat (§3) | O(n²) — worst case (all-distinct) does n(n+1)/2 ≈ 5·10^9 steps | O(min(n, Σ)) | ❌ TLE |
| 3 | Sliding window + set, shrink one-by-one (§5.1) | **O(n)** amortized | O(min(n, Σ)) = O(1) here | ✅ |
| 4 | Sliding window + last-occurrence map, jump (§5.2) | **O(n)** single pass (worst-case with a fixed array; expected with hashing) | O(min(n, Σ)) = O(1) here | ✅ preferred |

---

## 7. Fuller Talk Track (what to say while solving)

> "Quick clarifications: *substring* means contiguous — Example 3 rules out subsequences — and we return the length, not the string. Empty input returns 0.
>
> Brute force: for each left index, extend a right index holding a set of the window's characters and stop at the first repeat. That's O(n²) worst case, too slow for 10^5, but it establishes the shape of the problem.
>
> The key insight: as the right edge advances, the *minimal* valid left edge never moves backward — if a window ending at `r` already has a repeat, no window ending at `r` that starts further left can be valid. So I can sweep right once, advancing left monotonically: a classic sliding window, and since both pointers only move forward, total work is linear.
>
> Implementation: keep a set of characters in the window. When the incoming character is already present, advance `left`, deleting `s[left]` each step, until the duplicate is evicted — a `while` loop, because several characters may need to leave. Then add the new character and update the best with `right − left + 1`.
>
> Faster variant: store each character's last seen index in a dict and on a repeat jump `left` directly to `last[ch] + 1` — but only if `last[ch]` is at or after `left`; otherwise it's a stale entry from outside the window and must be ignored. `"abba"` is the test that catches forgetting that.
>
> Complexity: O(n) time — every index enters and leaves the window at most once — and O(min(n, alphabet)) space, effectively O(1) here since the charset is bounded. Edge cases: empty string, single char, all-duplicates, and `"abba"` for staleness."

---

## 8. Test Plan — Propose These Out Loud

Say these *before or right after* coding; it signals rigor and catches the classic bugs pre-submit.

| Input | Expected | Why it matters |
|---|---|---|
| `"abcabcbb"` | 3 | Official example; trace exercises multi-step eviction at `right = 6`. |
| `"bbbbb"` | 1 | Official example; all-duplicates; left must advance every step. |
| `"pwwkew"` | 3 | Official example; substring-vs-subsequence trap (`"pwke"` doesn't count). |
| `""` | 0 | Constraint allows empty; verifies `best` starts at 0. |
| `" "` (single space) | 1 | Space is a character; guards against trimming/tokenizing. |
| `"abba"` | 2 | **Stale-index trap** for the map variant; also breaks `if`-instead-of-`while` in the set variant (both wrongly return 3). |
| `"tmmzuxt"` | 5 (`"mzuxt"`) | Duplicate late in the string refers to a stale index; map variant without the `>= left` guard wrongly returns 6. |
| `"dvdf"` | 3 (`"vdf"`) | Regression test: implementations that set `left = right` on a duplicate return 2 instead of jumping to `last['d'] + 1 = 1`. |
| `"abcdef"` | 6 | All-distinct; checks the upper-bound path (and that you don't off-by-one the final window). |

---

## 9. Common Mistakes

1. **Subsequence vs. substring.** `"pwke"` is tempting and wrong.
2. **Measuring before the window is valid.** The order must be *shrink/jump → add → measure*. Recording `right − left + 1` before eviction completes can record a window that still contains a duplicate.
3. **`if` instead of `while` in the shrink loop.** On `"abba"`, one removal leaves window `"bb"` with `left = 1`; the next step then reports length 3.
4. **Stale last-occurrence entries.** Missing the `last_seen[ch] >= left` guard fails `"abba"` and `"tmmzuxt"`. Fix with the guard, or with `left = max(left, last.get(ch, -1) + 1)`.
5. **Off-by-ones.** Window length is `right − left + 1` (inclusive both ends); the jump target is `last[ch] + 1` (one *past* the previous occurrence — jumping to `last[ch]` keeps the duplicate inside).
6. **Forgetting to update `last_seen[ch]` when there's no duplicate** — the map must always record the newest index.
7. **Rebuilding the window structure per left index** (accidental O(n²)) or slicing `s[left:right+1]` inside the loop in Python — an O(n) copy per step, quietly O(n²) overall. Track indices, not slices.
8. **Empty-string handling** — only safe if `best` is initialized to `0` (not 1).

### Cross-Language Gotchas (Java / C++)

| Language | Gotcha |
|---|---|
| Java | If you use `int[] last = new int[128]` for last occurrences, the default `0` conflates "never seen" with "seen at index 0" — e.g., the leading `a` of `"abba"` — so `Arrays.fill(last, -1)` first. `HashMap<Character, Integer>` is correct but autoboxes every character (constant-factor cost). |
| C++ | Index the occurrence array with `static_cast<unsigned char>(c)`; plain `char` is signed on most platforms, so any byte ≥ 0x80 becomes a negative index (undefined behavior). Keep window length in `int`: `right - left + 1` is safe only because `left ≤ right` always holds — mixing in unsigned `size_t` invites underflow if you restructure the arithmetic. |
| Python | `dict`/`set` ops are O(1) *average*; use a fixed `[-1] * 128` array keyed by `ord(ch)` if you want a worst-case guarantee (safe here given the ASCII charset, risky if the input could contain arbitrary Unicode). |

---

## 10. Follow-Ups Interviewers Ask

- **"Return the substring itself."** Track `best_start` alongside `best`: whenever `right − left + 1 > best`, record `best_start = left`; answer `s[best_start : best_start + best]` (one slice at the end — O(n), not per-step).
- **"What if the string is streamed / too big for memory?"** Variant B is already online: it needs only `left`, `best`, and a last-occurrence table of size |Σ| — constant memory for a fixed alphabet, and it produces the answer incrementally.
- **"At most K distinct characters?"** (LC 159 for K=2, LC 340 generally) Same skeleton; swap the set for a counts map and the validity condition becomes "number of keys with count > 0 is ≤ K."
- **"Longest substring you can make with ≤ K replacements?"** (LC 424) Window valid iff `len − maxFreq ≤ K`; the trick is that `maxFreq` never needs to decrease.
- **"Minimum window containing a target's characters?"** (LC 76) Same two pointers, opposite objective: expand until valid, then shrink while still valid.

---

## 11. Transferable Patterns

1. **The monotonic-window lemma.** If the *minimal valid left boundary* for each right index is non-decreasing, a two-pointer sweep is legal and gives amortized O(n). Recognizing this property is the actual skill; the code is boilerplate once you see it.
2. **Two ways to restore validity:** incremental shrinking (pop from the left until valid — generalizes to any constraint expressible as a counter) vs. the **last-occurrence jump** (works when validity breaks only because of the newly added element). The jump idea reappears in "minimum window substring" and anagram problems.
3. **Last-occurrence indexing** — mapping a value to its most recent index — is a standalone tool (also shows up in "contains nearby duplicate" and interval-merging variants).
4. **Amortized analysis as a selling point:** "each pointer only moves forward, so total work is O(n)" is a sentence worth saying verbatim in interviews.

**Related problems to practice the same template:**

| Problem | Relationship |
|---|---|
| LC 159 — Longest Substring with At Most Two Distinct Characters | Same window; constraint = count of distinct chars ≤ 2 |
| LC 340 — Longest Substring with At Most K Distinct Characters | Generalizes 159 |
| LC 424 — Longest Repeating Character Replacement | Validity: `windowLen − maxFreq ≤ k` |
| LC 76 — Minimum Window Substring | Same skeleton, minimize, shrink-while-valid |
| LC 438 / 567 — Find All Anagrams / Permutation in String | Fixed-width windows over character counts |
| LC 1004 — Max Consecutive Ones III | Window with ≤ k "bad" elements |

---

## 12. Say It in 60 Seconds

> "This is a sliding-window problem. I keep a window — s from index `left` to `right` — that never contains a duplicate. I sweep the right edge across the string one character at a time. When the incoming character already exists in the window, the left edge must move past that character's previous occurrence: I can either shrink one character at a time with a set, or — faster — store each character's last index in a hash map and jump left straight to one past it, ignoring stale entries that fall before the current left edge; 'abba' is the test that catches forgetting that. Because the left edge only ever moves forward, every index enters and leaves the window at most once, so the whole scan is O(n) time and O of min of n and the alphabet size — effectively constant space here. I track the maximum window length as I go and return it. Edge cases: empty string gives zero, a single character gives one, and I sanity-check with 'bbbbb' and 'abba' before calling it done."

*(~150 words — recitable in under a minute, and it hits: pattern identification, the invariant, both variants, the trap, the complexity argument, and the test plan.)*
