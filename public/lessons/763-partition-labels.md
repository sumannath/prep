# Partition Labels (LeetCode 763) — Complete Interview Lesson

> **TL;DR:** A piece containing a letter must extend at least to that letter's **last occurrence**. Record `last[c]` for all 26 letters in one pass, then sweep with a growing window `[start, end]` where `end = max(end, last[s[i]])`. The moment the cursor `i` catches up to `end`, you have the *earliest legal cut* — take it. Two passes, **O(n) time, O(1) space**.

---

## 1. Problem in your own words

Slice `s` — left to right, into **contiguous** pieces whose concatenation is exactly `s` — into the **maximum number of pieces**, subject to: **no letter may appear in two different pieces.** Return the list of piece lengths in order.

Why the statement's bad examples are bad:

- `["aba", "bcc"]` from `"ababcc"`: `'b'` appears in both pieces → violates the rule.
- `["ab", "ab", "cc"]`: `'a'` and `'b'` each appear in two pieces → invalid (even though it has more pieces — quantity doesn't excuse illegality).
- `["abab", "cc"]` is valid, and it's the *maximum* count here.

**Clarifying questions worth asking out loud (30 seconds, then move on):**

1. "Pieces are contiguous substrings, concatenated in order to rebuild `s` — so order is fixed, I can't reorder." (Yes.)
2. "I return **lengths**, not the substrings themselves." (Yes — but be ready to produce substrings as a follow-up.)
3. "Lowercase English only, so alphabet size is a constant 26." (Yes.)
4. "Minimum answer is 1 part (the whole string), as in Example 2." (Yes.)

**Precision notes:**
- All indices below are **0-based**. `last[c]` stores an **index**; the answer stores **lengths** (`end − start + 1`).
- A "cut after index `i`" means the boundary sits **between index `i` and index `i+1`**.
- Every letter present in `s` appears in **exactly one** piece (pieces cover `s`); letters absent from `s` appear in none.

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= s.length <= 500` | Tiny. Even O(n²) = 250K operations, or a memoized DP, passes comfortably. **Say this out loud** — it means your job is to demonstrate the O(n) insight cleanly, not to fight for microseconds. |
| 26 lowercase letters | Alphabet size Σ = 26 is a constant → a 26-slot `int` array replaces any hash map; at most 26 distinct "intervals" to reason about; auxiliary space is O(1). |
| (Derived) | The answer has **at most 26 entries**: each piece's *first* letter appears only in that piece (it can't straddle), and two pieces can't share a first letter. Also: every piece length ≥ 1, and the lengths sum to `n` — both are cheap self-checks. |

---

## 3. Brute force (and why it's instructive)

### Level 0 — enumerate everything (conceptual only)

There are `n − 1` gaps between characters, and each gap is independently a cut or not, so there are `2^(n−1)` candidate partitions (that count is just 2 choices per gap). Check each for validity — consecutive letter-sets disjoint — and keep the one with the most parts. Exponential; useless beyond `n ≈ 20`. Its only value is pinning down exactly what "valid" means.

### Level 1 — smallest valid prefix (workable, O(n²))

Build the next piece by scanning a candidate end `k` upward from `start`, until **no character inside `s[start..k]` appears anywhere after `k`**. Then cut and repeat.

```python
def partition_labels_bf(s: str) -> list[int]:
    n = len(s)
    sizes, start = [], 0
    while start < n:
        k = start
        # extend until prefix chars are disjoint from everything after k
        while not set(s[start:k + 1]).isdisjoint(set(s[k + 1:])):
            k += 1
        sizes.append(k - start + 1)
        start = k + 1
    return sizes
```

Each validity check rebuilds two sets (≤ O(n)); each part of length L triggers ≤ L checks; parts sum to `n` → **O(n²) time, O(n) space**. Fine for `n ≤ 500`.

**Note the trap hiding here:** this code already *assumes* the smallest valid cut is the best choice. It's not obvious! (Validity is **not** monotone: in `"abdcd"`, cutting after index 1 is legal, after index 2 or 3 is *illegal* — `'d'` straddles — and after index 4 is legal again.) Proving "earliest legal cut is always safe and optimal" is exactly the core insight of this problem. A fully "unbiased" brute force would try *every* end for the first piece and recurse (`f(i) = 1 + max over legal k of f(k+1))`, exponential without memoization — and the trace below is the hint that collapses it to greedy.

### 3.1 Worked trace — brute force on `s = "ababcc"`

**Piece 1**, `start = 0`:

| k | candidate piece | prefix letters | remaining suffix | suffix letters | disjoint? |
|---|---|---|---|---|---|
| 0 | `"a"` | {a} | `"babcc"` | {a, b, c} | ✗ (`a` repeats later) |
| 1 | `"ab"` | {a, b} | `"abcc"` | {a, b, c} | ✗ |
| 2 | `"aba"` | {a, b} | `"bcc"` | {b, c} | ✗ (`b` repeats later) |
| 3 | `"abab"` | {a, b} | `"cc"` | {c} | ✓ → **cut**, size 4 |

**Piece 2**, `start = 4`:

| k | candidate | prefix letters | suffix | suffix letters | disjoint? |
|---|---|---|---|---|---|
| 4 | `"c"` | {c} | `"c"` | {c} | ✗ |
| 5 | `"cc"` | {c} | `""` | {} | ✓ (empty suffix) → **cut**, size 2 |

Output `[4, 2]` = `["abab", "cc"]` ✓ — matches the statement.

---

## 4. The core insight

> **A piece that contains letter `c` must reach at least `last[c]`, the final occurrence of `c` in `s`.**

So each letter *pins the right edge* of whatever piece it belongs to. Consequences:

1. Starting a piece at `start`, the piece must reach `last[s[start]]`. But every character *inside* that forced range pins it further. Iterate: `end = max(last[c] : c in s[start..end])` until it stops growing. That fixpoint is the **earliest legal cut**.
2. Cutting there is **valid**: every letter in the window has its last occurrence inside the window.
3. Cutting there is **optimal**: any legal first cut is at or after this point, and pushing a cut later only ever merges pieces (formalized in §5.5).

Reformulated: the letter `c` spans the interval `[first[c], last[c]]`; pieces are exactly the **merged overlapping intervals**. Two views, one algorithm.

---

## 5. Optimal solution: greedy windows over last occurrences

### 5.1 Algorithm

1. **Pass 1:** `last[c]` = final index of `c` (a forward loop with overwrite gives this for free).
2. **Pass 2:** `start = 0`, `end = 0`. For each `i` from `0` to `n−1`:
   - `end = max(end, last[s[i]])`
   - if `i == end`: emit `end − start + 1`, set `start = i + 1`.
3. Return the emitted sizes.

**Loop invariants (state these in the interview — they *are* the correctness argument):**
- After the update, `end ≥ i`, because `s[i]` occurs at `i`, so `last[s[i]] ≥ i`.
- Every character in `s[start..i]` has `last ≤ end` (running max).
- Hence at `i == end`: all letters in `s[start..end]` end within the piece → cut is **valid**; and for any `i < end`, some letter in the window has `last == end > i`, so that letter occurs at index `end`, outside the piece → an earlier cut is **invalid**.
- `end ≤ n − 1` always, so at `i = n − 1` we get `end = n − 1 = i` and the **final piece is always flushed by the loop itself** — no post-loop append.

### 5.2 Code (Python)

```python
def partition_labels(s: str) -> list[int]:
    # Pass 1: last[c] = last (0-based) index of letter c.
    last = [0] * 26
    for i, ch in enumerate(s):
        last[ord(ch) - ord('a')] = i      # forward overwrite => LAST occurrence

    sizes = []
    start = 0   # inclusive start of current piece
    end = 0     # inclusive farthest index the current piece is forced to reach

    for i, ch in enumerate(s):
        end = max(end, last[ord(ch) - ord('a')])
        if i == end:                      # earliest legal cut: boundary after i
            sizes.append(end - start + 1)
            start = i + 1
    return sizes
```

Equivalent one-liner for the map (dict comprehension overwrites, so it also keeps the *last* occurrence):

```python
last = {c: i for i, c in enumerate(s)}
```

**Follow-up ready — return the substrings too:** at each cut, also append `s[start:end + 1]`. Same loop, one extra line.

### 5.3 Trace — Example 1: `s = "ababcbacadefegdehijhklij"` (n = 24)

Precomputed last indices: `a:8, b:5, c:7, d:14, e:15, f:11, g:13, h:19, i:22, j:23, k:20, l:21`.

| i | s[i] | last[s[i]] | end after max | i == end? | note |
|---|---|---|---|---|---|
| 0 | a | 8 | 8 | no | `'a'` forces reach to 8 |
| 1 | b | 5 | 8 | no | |
| 2 | a | 8 | 8 | no | |
| 3 | b | 5 | 8 | no | |
| 4 | c | 7 | 8 | no | |
| 5 | b | 5 | 8 | no | |
| 6 | a | 8 | 8 | no | |
| 7 | c | 7 | 8 | no | |
| 8 | a | 8 | 8 | ✂ **cut** | size 9 (indices 0–8); `start = 9` |
| 9 | d | 14 | 14 | no | |
| 10 | e | 15 | 15 | no | `'e'` pushes reach to 15 |
| 11 | f | 11 | 15 | no | |
| 12 | e | 15 | 15 | no | |
| 13 | g | 13 | 15 | no | |
| 14 | d | 14 | 15 | no | |
| 15 | e | 15 | 15 | ✂ **cut** | size 7 (indices 9–15); `start = 16` |
| 16 | h | 19 | 19 | no | |
| 17 | i | 22 | 22 | no | |
| 18 | j | 23 | 23 | no | `'j'` pushes reach to 23 |
| 19 | h | 19 | 23 | no | |
| 20 | k | 20 | 23 | no | |
| 21 | l | 21 | 23 | no | |
| 22 | i | 22 | 23 | no | |
| 23 | j | 23 | 23 | ✂ **cut** | size 8 (indices 16–23); loop ends |

Output: `[9, 7, 8]` ✓ (Note: `end` carries a stale value across a cut — `max()` absorbs it; resetting `end` at each cut also works.)

### 5.4 Trace — Example 2: `s = "eccbbbbdec"` (n = 10)

Last indices: `e:8, c:9, b:6, d:7`.

| i | s[i] | last[s[i]] | end after max | i == end? | note |
|---|---|---|---|---|---|
| 0 | e | 8 | 8 | no | even the first char forces reach to 8 |
| 1 | c | 9 | 9 | no | `'c'` pushes reach to 9 |
| 2 | c | 9 | 9 | no | |
| 3 | b | 6 | 9 | no | |
| 4 | b | 6 | 9 | no | |
| 5 | b | 6 | 9 | no | |
| 6 | b | 6 | 9 | no | |
| 7 | d | 7 | 9 | no | |
| 8 | e | 8 | 9 | no | |
| 9 | c | 9 | 9 | ✂ **cut** | size 10 |

Output: `[10]` ✓ — the whole string is one piece because `e` (0↔8) and `c` (1↔9) interlock.

### 5.5 Why the greedy is correct (30-second proof sketch)

1. **Validity:** at `i == end`, every letter in the window ends inside it (invariant above).
2. **Earliest-ness:** let `E` be the greedy fixpoint for a suffix starting at `start`. Any legal cut `k` satisfies `k ≥ E`: legality forces `k ≥ last[s[start]]`; then all letters in `s[start..last[s[start]]]` — which is inside `s[start..k]` — must also end by `k`; iterate the same chain and you reach `E`. So `E` is the minimum legal cut, and no earlier cut exists.
3. **Optimality (exchange):** take any optimal partition whose first piece ends at `k ≥ E`. Move the first cut back to `E` and merge the sliver `(E, k]` into the second piece. This stays valid because every letter in that sliver lives in the original *first* piece — which, by validity, appears **nowhere later** — so merging it forward can't create a straddler. Piece count unchanged. Induct on the remaining suffix. ∎

---

## 6. Complexity

| Approach | Time | Space | Reality at n = 500 |
|---|---|---|---|
| Enumerate all `2^(n−1)` cut sets (each gap cut-or-not) | O(2ⁿ · n) | O(n) | impossible |
| Try-every-first-cut recursion / DP | O(n²) – O(n³) | O(n) | passes; overkill |
| Smallest-valid-prefix scan (§3) | O(n²) | O(n) | passes; correct only *because* of §5.5 |
| Merge ≤ 26 intervals (§7) | O(n) (no sort needed — see §7) | O(Σ) = O(1) | equivalent view |
| **Greedy last-occurrence (main)** | **O(n)** — two passes | **O(1)** auxiliary (26-slot array; output ≤ 26 ints) | microseconds |

**Lower-bound note:** Ω(n) time is unavoidable for any correct algorithm, because a single unexamined character could be some letter's last occurrence, and moving that occurrence can merge two planned pieces and change the answer — so every character must be read. The main solution therefore meets the lower bound and is asymptotically optimal.

---

## 7. Alternative lens: merging intervals (and a subtle gotcha)

For each distinct letter build the interval `[first[c], last[c]]` (≤ 26 of them), then **merge overlapping intervals**; each merged interval is one piece, and its length is the answer segment. Example 2: `e:[0,8], c:[1,9], b:[3,6], d:[7,7]` → merge → `[0,9]` → `[10]`.

**Gotcha:** merge when `next.start ≤ current.end` (overlap), **not** `≤ current.end + 1`. In `"ab"`, intervals `a:[0,0]` and `b:[1,1]` are *adjacent but disjoint* — merging them would wrongly output `[2]` instead of `[1,1]`. (Contrast with classic "merge touching meetings" problems; here touching intervals are legitimately separate pieces.)

Bonus: if you record intervals in discovery order, they're already sorted by `first[c]`, so **no sort is needed** — O(n) total, matching the main solution.

---

## 8. Common mistakes

| # | Mistake | Counterexample / symptom | Fix |
|---|---|---|---|
| 1 | Cutting when `i == last[s[i]]` (current char's last) instead of `i == end` (running max) | `"abab"`: at `i=2`, `last['a']=2` → cut `"aba"`, but `'b'` at index 3 is stranded | Cut only when the cursor reaches the **window max** |
| 2 | Storing **first** occurrence (`setdefault`, Java `putIfAbsent`, Python `s.index`) | `"abab"`: `first['a']=0` → cut at `i=0` → `"a" | "bab"` invalid | Forward overwrite in pass 1 → last occurrence |
| 3 | Off-by-one: `size = end − start`, or `start = end` | `"a"` → `0` or an infinite loop | `size = end − start + 1`; next `start = end + 1` |
| 4 | Testing the cut **before** updating `end` | `"ab"`: stale `end=0` fires premature cuts everywhere | Update `end = max(...)` first, then test |
| 5 | Post-loop flush / double-append of the final piece | Last size appears twice, or a stray `0` | At `i = n−1` the cut always fires (invariant in §5.1) — no flush |
| 6 | Returning sorted sizes or substrings when lengths were asked | Output must read left→right matching `s` | Append in scan order |
| 7 | Splitting by frequency counts, ignoring positions | `"ababcc"`: counts `a:2,b:2,c:2` suggest 3 pieces of 2, but `"ab","ab"` repeats letters | The rule is positional — use last indices |
| 8 | Assuming "once a cut is legal, all later cuts are legal" | `"abdcd"`: legal after idx 1, illegal after 2 and 3, legal after 4 | Greedy only needs the **earliest** legal cut; don't reason from false monotonicity |
| 9 | Python perf: `s.index(c)` or `set(s[k+1:])` inside loops | Silently O(n²)+ (survivable at n ≤ 500, but sloppy) | Precompute `last` once |

---

## 9. Language gotchas

| Language | Gotcha |
|---|---|
| **Python** | `{c: i for i, c in enumerate(s)}` keeps the **last** index because later writes overwrite — if you reach for `setdefault` you silently get the **first**. Prefer the 26-slot list with `ord(ch) - ord('a')` for clarity and to avoid hashing. |
| **Java** | Use `int[] last = new int[26]` and `s.charAt(i) - 'a'`; a plain forward pass overwrites to the last occurrence — `putIfAbsent` would give the first. `HashMap<Character,Integer>` works but autoboxes on every get/put (harmless at n ≤ 500, yet the array is the idiomatic O(1)-worst-case choice). Result `List<Integer>` autoboxes each `add(int)`. No overflow risk at these sizes. |
| **C++** | `std::array<int,26> last{};` (brace-init zero-fills). Keep the loop index and `end` the **same signedness** — comparing a `size_t i` with an `int end` triggers signed/unsigned comparison warnings and is a classic off-by-one breeding ground. `s[i] - 'a'` promotes to `int`, which is fine. |

---

## 10. Test cases to state out loud

Propose these **before or right after coding** — it signals engineering maturity:

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | `"ababcbacadefegdehijhklij"` | `[9, 7, 8]` | Official; mid-string merges, multi-piece output |
| 2 | `"eccbbbbdec"` | `[10]` | Official; whole string forced into one piece |
| 3 | `"a"` | `[1]` | Minimal input; loop must fire the cut at `i = 0` (catches `end` init bugs) |
| 4 | `"aaaa"` | `[4]` | Repeats forbid *any* split — max pieces ≠ "cut everywhere" |
| 5 | `"abcdef"` | `[1, 1, 1, 1, 1, 1]` | All distinct → maximum split of `n` pieces |
| 6 | `"abac"` | `[3, 1]` | A letter reappearing late extends a window; trailing singleton piece |
| 7 | `"abdcd"` | `[1, 1, 3]` | Non-monotone validity (§8 #8); catches the "cut at `i == last[s[i]]`" bug |
| 8 | `"ababcc"` | `[4, 2]` | Statement's example; handy for the brute-force trace |

Post-coding self-checks to mention: `sum(sizes) == len(s)`, every size ≥ 1, `len(sizes) ≤ 26`.

---

## 11. Transferable patterns & related problems

**Patterns to name explicitly in the interview:**

1. **"Last occurrence pins the boundary."** Any time a constraint mentions where an element may/must live, precompute `last[...]` in one pass. Same primitive powers sliding-window problems.
2. **"Cursor chases a frontier."** The loop `end = max(end, reach(i)); if i == end: act` is a reusable skeleton — you act exactly when the scan index catches the furthest obligation so far.
3. **Disguised interval merging.** Per-element spans (`[first, last]`) + merge = partition structure.
4. **Greedy-earliest-cut exchange proof.** "Moving any optimal solution's first boundary earlier can't break validity" is a reusable argument template.

| Related problem | Connection |
|---|---|
| LC 56 — Merge Intervals | The interval view of this problem, stated plainly |
| LC 769 / 768 — Max Chunks To Make Sorted (I & II) | Same "cut when a prefix property first holds" greedy; LC 769 cuts where `max(prefix) == i` |
| LC 55 / 45 — Jump Game I & II | Identical frontier-chasing loop with `end = max(end, i + nums[i])` |
| LC 1024 — Video Stitching | Greedy farthest-reach over intervals |
| LC 435 — Non-overlapping Intervals | Interval greedy: overlap detection, keep/drop decisions |
| LC 3 — Longest Substring Without Repeating Characters | The other classic use of a last-occurrence map inside a window |
| LC 2405 — Optimal Partition of String | Looks like this problem, but the rule is "unique letters *per piece*" → on a repeat you **reset** the window instead of extending it |

**Likely follow-ups, with one-line answers:**
- *"Return the pieces themselves."* → Append `s[start:end+1]` at each cut.
- *"Unicode / big alphabet."* → Swap the 26-array for a dict; still O(n) time, O(Σ) space.
- *"Streaming input — must cut as characters arrive."* → The algorithm is already **online**: the decision at `i` uses only `s[0..i]`.
- *"Why not DP?"* → `f(i) = 1 + max over legal k of f(k+1)` works, but the exchange argument in §5.5 proves the smallest legal `k` always suffices, so greedy is both simpler and faster.

---

## 12. Full interview talk track

**Restate & clarify (~30s).** "I'm given a string and I want to slice it, in order, into contiguous pieces that concatenate back to `s`, maximizing the number of pieces, with the rule that no letter may appear in two pieces. I return the piece lengths. So for `ababcc` it's `abab` then `cc` — note `aba | bcc` fails because `b` straddles, and `ab | ab | cc` fails even though it has more pieces, because `a` and `b` each straddle. Two confirms: I return lengths, not substrings, and the alphabet is lowercase-only, size 26."

**Constraints (~15s).** "n is at most 500, so even quadratic passes easily — correctness and clarity matter more than speed here. But the constant alphabet hints the clean target is linear with a 26-slot array."

**Brute force (~45s).** "Naively: to build the next piece, start at `i` and extend the candidate end `k` until no character inside `s[i..k]` appears anywhere after `k`, then cut. Rebuilding suffix sets makes each check O(n), so O(n²) overall — fine here. Trace on `ababcc`: candidates `a`, `ab`, `aba` all fail, `abab` works → piece of 4; then `c` fails, `cc` works → 2. Output `[4, 2]`. The subtle question — and the whole problem — is *why taking the earliest legal cut is optimal*, especially since legality isn't monotone: in `abdcd`, cutting after index 1 is legal, after 2 or 3 it's not."

**Insight (~30s).** "Key fact: if a piece contains a letter, the piece must reach that letter's **last** occurrence — otherwise it straddles. So every letter pins the right edge of its piece. Precompute `last[c]` for all 26 letters in one pass. Second pass: maintain `end`, the farthest index the current piece is forced to reach — `end = max(end, last[s[i]])`. The moment my cursor `i` catches `end`, every letter in the window ends inside the window: legal cut. And it's the **earliest** legal cut — before that, some letter in the window has its last occurrence at `end` and would be stranded. Earliest legal cuts maximize piece count."

**Code (~60–90s, while writing).** "Pass one fills `last`. Pass two: `start`, `end = 0`. For each `i`: update `end`, then if `i == end`, emit `end − start + 1` and move `start` to `end + 1`. Invariants: `end ≥ i` always, because the current char occurs at `i`; `end ≤ n−1`, so the final piece is always flushed by the loop — no post-loop append. Stale `end` across pieces is harmless since `max` absorbs it."

**Correctness one-liner (~20s).** "Any valid partition's first cut is at or after my `end` — chain the last-occurrence pinning from the first character. And given any optimal partition, I can move its first cut back to mine and merge the sliver into piece two without breaking anything, because those sliver letters appear only in piece one. Induct on the suffix."

**Complexity (~15s).** "Two passes: O(n) time. O(1) space — a 26-int array plus counters; the output has at most 26 numbers, since each piece is introduced by a letter no other piece contains."

**Tests (~40s).** "Official examples give `[9,7,8]` and `[10]`. I'd also check: single char → `[1]`; all-identical `aaaa` → `[4]`, repeats forbid splitting; all-distinct `abcdef` → six 1s; `abac` → `[3,1]`, a late reappearing letter; and `abdcd` → `[1,1,3]`, which kills the classic bug of cutting at the current char's last occurrence instead of the window max."

**Follow-ups (~20s).** "Substrings: slice at each cut. Bigger alphabet: dict instead of array. Streaming: the cut decision at `i` only uses `s[0..i]`, so it's already online."

---

## 13. Say it in 60 seconds

> "Partition into the **most** pieces such that no letter appears in two pieces. The key fact: a piece containing a letter must extend to that letter's **last occurrence** — so last occurrences pin the piece boundaries. Pass one records the last index of each of the 26 letters. Pass two keeps a window `[start, end]`: for each character, `end = max(end, last of that char)`; the moment my cursor `i` reaches `end`, every letter inside the window ends inside it — so cutting there is valid, it's the **earliest** legal cut, and earliest legal cuts maximize the piece count, since any valid partition's cuts can only sit at or after these points. I record `end − start + 1`, move `start` to `end + 1`, and continue. Two passes: **O(n) time, O(1) space** — just a 26-element array; no post-loop flush because the final index always triggers the last cut. Tests I'd run: single char → `[1]`; all-same char → one piece; all-distinct → n pieces of 1; a late-reappearing letter like `abac` → `[3, 1]`; and the official example gives `[9, 7, 8]`."
