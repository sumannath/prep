# Minimum Window Substring — Complete Lesson

## 1. Restating the problem (what is actually being asked)

Given a text string `s` (length `m`) and a pattern string `t` (length `n`), find the **shortest contiguous block of `s`** — indices `[l, r]` inclusive, length `r − l + 1` — that contains **every character of `t` with the correct multiplicity**. Key precision points to state out loud in an interview:

- **Duplicates in `t` are a multiset requirement, not a set requirement.** If `t = "aa"`, the window needs *two* `'a'`s. One is not enough.
- The window must be **contiguous** in `s` — we're not picking characters, we're taking a slice.
- The answer is a **substring of `s`** (a value), but internally we track it as **indices** `best_l` and `best_len`, and slice only once at the end.
- If no window exists, return `""`. The problem guarantees the minimum window is unique, so we don't need tie-breaking logic — but with a strict `<` comparison our code would naturally return the leftmost among equal-length optima if ties were allowed. Worth saying aloud.

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= m, n <= 10^5` | An O(m²) scan is ~10¹⁰ operations — too slow. Target linear, or linear × a small constant. |
| Only uppercase/lowercase English letters | Alphabet size Σ = 52. Frequency counters are O(1) space; a fixed `int[128]` / 128-slot list works and avoids hash overhead. Comparing two 52-entry arrays costs 52 ops — the constant people forget. |
| Answer is unique | No tie-breaking needed; still prefer strict `<` when updating the best window. |
| Follow-up: O(m + n) | A strong hint that a **sliding window with counters** is expected — and it is achievable, so say so confidently. |

## 3. Brute force, with a worked trace

**Idea:** for every left index `i`, find the smallest right index `j(i)` such that `s[i..j(i)]` covers `t` (maintaining counts incrementally while extending `j`). Record the best.

**Worked trace on Example 1** (`s = "ADOBECODEBANC"`, `t = "ABC"`; indices `0:A 1:D 2:O 3:B 4:E 5:C 6:O 7:D 8:E 9:B 10:A 11:N 12:C`):

| Start `i` | Minimal end `j(i)` | Window | Length |
|---|---|---|---|
| 0 | 5 | `ADOBEC` | 6 |
| 1 | 10 | `DOBECODEBA` | 10 |
| 2 | 10 | `OBECODEBA` | 9 |
| 3 | 10 | `BECODEBA` | 8 |
| 4 | 10 | `ECODEBA` | 7 |
| 5 | 10 | `CODEBA` | 6 |
| 6 | 12 | `ODEBANC` | 7 |
| 7 | 12 | `DEBANC` | 6 |
| 8 | 12 | `EBANC` | 5 |
| 9 | 12 | `BANC` | **4** |
| 10–12 | — | (missing a needed char) | — |

Minimum = `BANC`. ✓ Matches the expected output.

**Complexity:** O(m²) with incremental counts (each start scans forward), O(m²·n) if you recount from scratch — dead at 10⁵ either way.

**The observation that unlocks everything:** look at the `j(i)` column: `5, 10, 10, 10, 10, 10, 12, 12, 12, 12, ∅, ∅, ∅`. **`j(i)` never decreases as `i` increases.** If `s[i..j]` covers `t`, the shorter window `s[i+1..j]` might not — so the minimal end can only move right. Coverage is *monotone*: extending a valid window keeps it valid. That monotonicity is exactly what makes two pointers work.

## 4. The core insight

Two ideas combine:

1. **Coverage is a counting question.** Window `[l, r]` covers `t` iff for every char `c`, `window_count[c] >= t_count[c]`. Maintain one frequency map with a *deficit* semantics and a single integer:

   > **Invariant:** `need[c] = t_count[c] − window_count[c]` (negative ⇒ surplus copies in the window).
   > **`missing` = total number of required occurrences not yet in the window** = Σ over `c` of `max(0, need[c])`.
   > **The window covers `t` ⟺ `missing == 0`.**

   - Char `c` **enters**: if `need[c] > 0` it was still needed → `missing -= 1`; then `need[c] -= 1` (may go negative — that's the surplus, and it's how duplicates are handled for free).
   - Char `c` **leaves**: `need[c] += 1`; if it becomes `> 0`, we just lost a required occurrence → `missing += 1`.

2. **Monotone predicate ⇒ two pointers.** Sweep `r` rightward. Whenever the window becomes valid, shrink from the left while it *stays* valid, recording the best window seen. Since `l` only ever moves forward, every character is added once and evicted at most once → linear total work.

```
index:  0    1    2    3    4    5  ...
s:      A    D    O    B    E    C  ...
              l═════════════╗
                            r
        window = s[l..r] inclusive, length = r - l + 1
```

## 5. Optimal algorithm

### Pseudocode

```text
need[c] := count of c in t            # after setup, need[c] = t_count − window_count during the run
missing  := n
l := 0;  best_len := m + 1 (sentinel);  best_l := 0
for r in 0 .. m-1:
    if need[s[r]] > 0: missing -= 1   # check BEFORE decrementing
    need[s[r]] -= 1
    while missing == 0:               # s[l..r] is valid: record, then shrink
        if r - l + 1 < best_len:
            best_len := r - l + 1;  best_l := l
        need[s[l]] += 1               # evict s[l]
        if need[s[l]] > 0: missing += 1
        l += 1
return "" if best_len == m + 1 else s[best_l : best_l + best_len]
```

Note the loop order: **record the current window, *then* evict.** The last recorded window in each shrink loop is exactly the minimal valid window ending at `r`.

### Python (primary implementation)

```python
from collections import Counter

def min_window(s: str, t: str) -> str:
    m, n = len(s), len(t)
    if n > m:                        # quick reject; Example 3 hits this
        return ""

    need = Counter(t)                # need[c] = copies of c still required
    missing = n                      # required occurrences not yet covered
    best_len = m + 1                 # sentinel: longer than any real window
    best_l = 0
    l = 0

    for r, c in enumerate(s):
        if need[c] > 0:              # this copy of c was still needed
            missing -= 1
        need[c] -= 1                 # negative => surplus copies in window

        while missing == 0:          # s[l..r] covers t: record, then shrink
            if r - l + 1 < best_len:
                best_len, best_l = r - l + 1, l
            need[s[l]] += 1          # evict leftmost char
            if need[s[l]] > 0:       # evicted a *required* copy -> broken
                missing += 1
            l += 1

    return "" if best_len == m + 1 else s[best_l:best_l + best_len]
```

(Drops into `class Solution: def minWindow(self, s, t)` unchanged.)

### Equivalent variant: "formed distinct characters"

Some candidates find this more intuitive — track *distinct* chars fully satisfied instead of a deficit:

```python
need = Counter(t)                      # exact required counts
required, formed = len(need), 0        # distinct chars needed / satisfied
win = Counter()
l = 0
best_len, best_l = m + 1, 0
for r, c in enumerate(s):
    win[c] += 1
    if c in need and win[c] == need[c]:
        formed += 1
    while formed == required:
        if r - l + 1 < best_len:
            best_len, best_l = r - l + 1, l
        lc = s[l]
        if lc in need and win[lc] == need[lc]:   # exactly-satisfied char is leaving
            formed -= 1
        win[lc] -= 1
        l += 1
```

Both are O(m + n); pick one and know it cold.

### Follow-up: O(m + n), and making it faster in practice

The sliding window **is** the O(m + n) algorithm. This is optimal up to constants: any correct algorithm must examine every character of both strings in the worst case, because a single unexamined character (e.g., the only `'C'` in `s`, or one extra requirement in `t`) can change the answer — an adversary argument gives the Ω(m + n) reading lower bound. A practical constant-factor improvement is to pre-filter `s` to positions whose character actually appears in `t`, and run the same two-pointer loop over that compressed list (window lengths computed from the *original* indices):

```python
keep = set(t)
pts = [(i, c) for i, c in enumerate(s) if c in keep]
```

Worst case unchanged (all of `s` may be relevant), but skips all dead characters.

## 6. Traces on the official examples

### Example 1: `s = "ADOBECODEBANC"`, `t = "ABC"` → `"BANC"`

Initial: `need = {A:1, B:1, C:1}`, `missing = 3`, `l = 0`.

**Right-pointer sweep** (`need` column = value *before* adding `s[r]`):

| r | s[r] | need[s[r]] | missing after add | comment |
|---|---|---|---|---|
| 0 | A | 1 | 2 | first A |
| 1 | D | 0 | 2 | not in t → surplus |
| 2 | O | 0 | 2 | surplus |
| 3 | B | 1 | 1 | |
| 4 | E | 0 | 1 | surplus |
| 5 | C | 1 | **0** | valid → shrink #1 |
| 6 | O | −1 | 1 | surplus (missing=1 after shrink #1) |
| 7 | D | −1 | 1 | |
| 8 | E | −1 | 1 | |
| 9 | B | 0 | 1 | 2nd B → surplus, missing unchanged |
| 10 | A | 1 | **0** | valid → shrink #2 |
| 11 | N | 0 | 1 | |
| 12 | C | 1 | **0** | valid → shrink #3 |

**Shrink #1** (at r = 5): record `[0..5] = "ADOBEC"`, len 6 → best = 6 @ 0. Evict `'A'` → `need[A] = 1 > 0` → broken (`missing = 1`), `l = 1`. Stop.

**Shrink #2** (at r = 10, l = 1): every eviction of a *surplus* char keeps the window valid; only the eviction of a *required* char breaks it:

| action | l | recorded window | len | best |
|---|---|---|---|---|
| record | 1 | `DOBECODEBA` | 10 | 6 @ 0 |
| evict D (surplus) | 2 | | | |
| record | 2 | `OBECODEBA` | 9 | 6 @ 0 |
| evict O (surplus) | 3 | | | |
| record | 3 | `BECODEBA` | 8 | 6 @ 0 |
| evict **B** (surplus — a second B sits at index 9) | 4 | | | |
| record | 4 | `ECODEBA` | 7 | 6 @ 0 |
| evict E (surplus) | 5 | | | |
| record | 5 | `CODEBA` | 6 | tie, no update (strict `<`) |
| evict **C** (needed → broken) | 6 | | missing = 1, stop | |

**Shrink #3** (at r = 12, l = 6): record `ODEBANC` (7), evict O; record `DEBANC` (6), evict D; record **`EBANC` (5) → best = 5 @ 8**, evict E; record **`BANC` (4) → best = 4 @ 9**; evict B (needed → broken), `l = 10`. Stop.

Return `s[9:13] = "BANC"`. ✓ Notice the recorded windows are *exactly* the per-start minimal windows from the brute-force table (`ADOBEC`, `DOBECODEBA`, …, `BANC`) — the sliding window computes the same candidate set, but never re-scans.

### Example 2: `s = "a"`, `t = "a"` → `"a"`

`need = {a:1}`, `missing = 1`. r = 0: `need[a] = 1 > 0` → `missing = 0`. Shrink: record `[0..0]` len 1 → best = 1 @ 0; evict `'a'` → broken. Return `s[0:1] = "a"`. ✓

### Example 3: `s = "a"`, `t = "aa"` → `""`

`n = 2 > m = 1` → early return `""`. Even without the guard: `need[a] = 2`, `missing = 2`; at r = 0, `missing` drops only to 1 — never valid, sentinel survives, return `""`. ✓

## 7. Why it finds the minimum (correctness sketch)

- **Every recorded window is valid** — it's recorded inside `while missing == 0`.
- **Every recorded window is minimal for its left index.** When `[i..r]` is recorded, `[i..r−1]` was invalid (otherwise `l` would have passed `i` earlier), so `r = j(i)`.
- **Every reachable minimal window gets recorded:** when `r = j(i)`, the window `[l..r]` is valid and the shrink loop keeps recording and advancing `l` while valid; since `[i..j(i)]` is valid, the loop reaches `l = i` and records it right before evicting `s[i]`. Starts with `j(i) = ∞` contribute nothing.
- The global answer is min over `i` of `j(i) − i + 1`; all finite `j(i)` windows are recorded, so the minimum is captured. Strict `<` keeps the first (leftmost) among equals; uniqueness is guaranteed anyway.

## 8. Complexity

| # | Approach | Time | Extra space | Verdict at m, n = 10⁵ |
|---|---|---|---|---|
| 1 | All substrings, recount coverage from scratch | O(m²·(m+n)) | O(1) | ~10¹⁵ ops — hopeless |
| 2 | Per left index, extend with incremental counts | O(m²) | O(Σ) | ~10¹⁰ ops — TLE |
| 3 | Binary search on answer length + O(m) fixed-window check | O((m+n)·log m) | O(Σ) | Works (feasibility is monotone in length: a covering window stays covering if extended), but strictly worse |
| 4 | **Two pointers + deficit counter (this lesson)** | **O(m + n)** | **O(Σ) = O(1)** | ~2·10⁵ steps — optimal |
| 5 | Same, over filtered `s` | O(m + n) | O(m) | Same big-O, smaller constant |

**Amortized argument for #4:** `r` advances exactly `m` times; each shrink-loop iteration advances `l`, which never decreases and is bounded by `m` — so total evictions ≤ m. Every step is O(1). Building `need` is O(n). Total **O(m + n) time, O(Σ) space** (the Counter never exceeds 52 keys, since both strings use a 52-letter alphabet).

## 9. Common mistakes

| # | Mistake | Symptom / example | Fix |
|---|---|---|---|
| 1 | Treating `t` as a **set** | `s="a", t="aa"` returns `"a"` instead of `""` | Everything must be counts (multiset), never mere presence |
| 2 | `if missing == 0` instead of `while` | Only one char evicted per right step; misses tighter windows when many surplus chars pile up | Shrink loop must be `while` |
| 3 | Evicting before recording | Returns a window that's missing its first/last char, or skips the true minimum | Order inside loop: **record `[l..r]`, then evict `s[l]`** |
| 4 | Storing `(l, r)` and slicing later | `l`/`r` have advanced by the time you slice | Store values `best_len`, `best_l`; slice `s[best_l : best_l + best_len]` once at the end |
| 5 | Checking `need[c]` after decrementing with the wrong comparison | `missing` drifts; windows declared valid when they aren't | Fix the invariant: enter = `if need[c] > 0` then `need[c] -= 1`; equivalently decrement first, then `if need[c] >= 0` — but pick one consistently |
| 6 | `int[26]` / `ord(c) - ord('a')` indexing | Fails on uppercase or mixed case | Alphabet is 52; use a 128-slot array or a dict |
| 7 | Rebuilding counts per window | O(n) inside the loop → TLE | Maintain the deficit incrementally |
| 8 | Off-by-one on length | `r - l` instead of `r - l + 1` | Window `[l..r]` inclusive ⇒ length `r − l + 1` |
| 9 | Using `<=` for the best update | Correct here (unique answer) but wasteful; wrong if asked for leftmost tie-break | Strict `<`; mention tie behavior out loud |
| 10 | Forgetting the empty result sentinel | Returns garbage or crashes on `""` case | Sentinel `best_len = m + 1`; check before returning |

## 10. Language-specific gotchas

| Language | Gotcha |
|---|---|
| **Java** | `HashMap<Character, Integer>` autoboxes on every update and `need.get(c)` returns `null` for absent keys → NPE with `> 0`; use `getOrDefault`. Worse: comparing boxed `Integer`s with `==` only works for the −128..127 cache, and counts can reach 10⁵ — a real bug. Prefer `int[] need = new int[128];` indexed directly by `char`. |
| **C++** | `cnt[c]` with a 256-array: plain `char` may be **signed**, so bytes ≥ 128 index negatively (UB) — use `cnt[(unsigned char)c]` or `int[128]` for ASCII. Never index with `c - 'a'` when uppercase exists (negative indices). Build the answer with one `substr(best_l, best_len)` at the end; `substr` copies. |
| **Python** | `Counter[missing_key]` reads as 0 **without** inserting; `defaultdict(int)` **inserts** on read. Assignments (`need[c] -= 1`) grow the Counter either way, but only to ≤ 52 keys here. Strings are immutable — the final slice copies; slice once. |

## 11. Test plan — say these out loud before/after coding

| # | Input | Expected | What it probes |
|---|---|---|---|
| 1 | `s="ADOBECODEBANC", t="ABC"` | `"BANC"` | Official; tighter window found *after* an earlier valid one |
| 2 | `s="a", t="a"` | `"a"` | Official; window of length 1 equal to all of `s` |
| 3 | `s="a", t="aa"` | `""` | Official; **duplicates in `t`**, plus `n > m` fast path |
| 4 | `s="abbaab", t="aab"` | `"aab"` | Duplicate `'a'` requirement with surplus `'b'`s around |
| 5 | `s="bba", t="ab"` | `"ba"` | Must evict surplus leading chars to shrink |
| 6 | `s="abc", t="cba"` | `"abc"` | Answer is the entire string |
| 7 | `s="abc", t="abd"` | `""` | A required char absent entirely |
| 8 | `s="Aa", t="A"` and `t="a"` | `"A"` / `"a"` | Case sensitivity — the 52-letter alphabet |

Also worth saying: *"For validation I'd stress-test against the O(m²) brute force as an oracle on random small strings (length ≤ 12, alphabet `{a,b,c}`)."*

## 12. Transferable patterns & related problems

**The reusable template:** *Find the shortest/longest contiguous window satisfying a property that is monotone under expansion.* Sweep `r`, and while the predicate holds (or fails, for "at most" predicates), advance `l`; keep an O(1)-updatable window summary (frequency counts, sums, distinct-char counters). Both pointers move forward ⇒ linear.

| Problem | Shared machinery | What changes |
|---|---|---|
| LC 3 — Longest Substring Without Repeating Characters | window + counts | Predicate "all counts ≤ 1"; maximize length |
| LC 209 — Minimum Size Subarray Sum | record-then-shrink template | Numeric sum instead of char counts |
| LC 438 / LC 567 — Find Anagrams / Permutation in String | multiset coverage | Window length fixed at `n` |
| LC 340 — Longest Substring with At Most K Distinct | window + distinct counter | "At most" predicate, maximize |
| LC 424 — Longest Repeating Character Replacement | window + max-frequency trick | Budget of `k` replacements |
| LC 30 — Substring with Concatenation of All Words | multiset coverage | Words of fixed length, block-wise stepping |
| LC 727 — Minimum Window Subsequence | same two strings | **Subsequence**, not substring — window template does *not* apply; needs a different two-pass two-pointer |
| LC 239 — Sliding Window Maximum | window mechanics | Monotonic deque, no coverage predicate |

## 13. Full interview talk track

> "Brute force is: try every left index, extend right until the window covers `t`, record. That's quadratic and dead at 10⁵. Two observations fix it.
>
> First, coverage is a *counting* question, not a set question — `t` can have duplicates, so I keep a frequency map `need` and one integer `missing`: the total number of required characters still outside the window. When a char enters, if its `need` was positive it was still wanted, so `missing` drops; when a char leaves and its `need` goes positive, we lost a required copy, so `missing` rises. The window is valid exactly when `missing` is zero — and surplus copies just push `need` negative, which handles duplicates automatically.
>
> Second, the predicate is monotone: if a window covers `t`, extending it still covers `t`. So as `r` sweeps right, the optimal `l` only moves right. Algorithm: extend `r` until `missing == 0`; then, while still valid, record the window and evict the left char. Record *before* evicting — the last recorded window in each pass is the minimal one ending at `r`. `l` never moves backward, so each index is added once and removed at most once: O(m + n) time, O(1) space over the 52-letter alphabet. That also answers the follow-up.
>
> Edge cases: `t` longer than `s`, or a required char missing — `missing` never hits zero, return empty. Duplicates in `t` are covered because everything is counts. I'd test the three official examples plus a case like `s='bba', t='ab'` where shrinking must drop surplus chars, and a case-sensitivity check."

## 14. Say it in 60 seconds

> "Minimum window substring is the classic sliding-window problem. Brute force — checking every substring — is quadratic-to-cubic, hopeless at 10⁵. The key insight is that coverage is *monotone*: if a window contains all of `t`, growing it keeps it valid, so as the right pointer sweeps, the best left pointer only moves right. I keep a frequency map of `t`'s needs and one integer `missing` — the count of required characters not yet in the window. Expand right until `missing` hits zero; then shrink from the left while it stays zero, recording the window before each eviction — the shortest one ending at each `r` gets captured. Every index enters and leaves the window once, so it's O(m + n) time and O(1) space over the 52-letter alphabet — which also answers the follow-up. Counts, not sets, handle duplicates in `t` for free. If `missing` never reaches zero — `t` longer than `s`, or a char absent — return the empty string."
