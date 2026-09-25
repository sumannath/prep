# Word Break (LeetCode 139) — Complete Interview Lesson

## 1. Problem Restated

You're given a string `s` and a dictionary `wordDict`. Decide **yes/no**: can you cut `s` into consecutive, non-overlapping pieces (no characters skipped, no characters reused) such that **every piece is a dictionary word**? The same dictionary word may be used many times. Order of pieces must match their order in `s`.

Key phrases to decode out loud in an interview:

- **"segmented into a space-separated sequence"** → this is a *partition of the string*, not a subsequence. Every character of `s` must belong to exactly one word.
- **"one or more"** → the empty segmentation doesn't count (moot here since `s.length ≥ 1`, but it tells you the base case is a *seed*, not an answer).
- **"reused multiple times"** → this is an *unbounded* resource model (like unbounded knapsack / coin change), not a per-word budget.
- Output is a **boolean**, not the segmentation itself — so we need *feasibility* (`any`), not enumeration. This matters: it lets us `break` early on the first successful split.

## 2. Constraint Decoding

| Constraint | What it implies for the solution |
|---|---|
| `s.length ≤ 300` | An O(n²) or even O(n³) DP is trivially fast; recursion depth ≤ 300 is safe everywhere. Signals "DP is expected." |
| `wordDict[i].length ≤ 20` | The killer optimization: a *last word* ending at position `j` can start at most 20 characters back. Inner loop is bounded by 20, not `n`. |
| `wordDict.length ≤ 1000`, all unique | Total dict content ≤ 20,000 chars → building a hash set is free. Uniqueness means `set()` loses nothing. |
| lowercase English only | No case normalization; a 26-way trie is possible if you want the follow-up optimization. |
| reuse allowed | "Unbounded item" DP — each word is always available, so state = position only. If reuse were banned, you'd need to track remaining word counts (exponentially harder). |

With `n ≤ 300` and max word length `M ≤ 20`, the final DP does roughly `300 × 20 × 20 = 120,000` cheap probes. Constant factors essentially don't matter.

## 3. Brute Force: Try Every Word at Every Position

**Idea:** From position `i`, try every dictionary word that matches the substring starting at `i`; recurse on `i + len(word)`. Succeed if we ever land exactly on `len(s)`.

```python
def wordBreak_bruteforce(s: str, wordDict: list[str]) -> bool:
    words = set(wordDict)

    def can(i: int) -> bool:
        if i == len(s):
            return True
        for w in words:
            if s.startswith(w, i) and can(i + len(w)):
                return True
        return False

    return can(0)
```

### Worked trace on Example 3

`s = "catsandog"`, `wordDict = ["cats","dog","sand","and","cat"]`

```
can(0)  remaining: "catsandog"
├── take "cats" → can(4)   "andog"
│   └── take "and" → can(7)   "og"
│         no word starts with 'o' → FALSE
│   (nothing else matches at index 4) → FALSE
└── take "cat"  → can(3)   "sandog"
    └── take "sand" → can(7)   "og"
          FALSE  ← same subproblem solved AGAIN
    (nothing else matches at index 3) → FALSE
Answer: false
```

Notice `can(7)` is computed twice. That's the smoking gun.

### Why it's exponential

Worst case: `s = "aaaaab"`, `dict = ["a","aa","aaa","aaaa"]`. Every segmentation of the leading `aaaaa` gets explored before the trailing `b` kills it — and the number of segmentations of an `m`-character stretch is `2^(m-1)`, because each of the `m-1` gaps between characters independently splits or doesn't. For `n = 300` of all-'a's, that's `2^299` paths: not runnable. This is exactly the case an interviewer will pull if you skip memoization.

## 4. The Core Insight

**The question "can the suffix starting at index `i` be segmented?" has the same answer no matter which path brought you to `i`.** The prefix you already built doesn't constrain the future — only your current position does.

So there are only `n + 1` distinct subproblems (positions `0..n`), not `2^n` paths. Cache them and the exponential collapses to polynomial.

The cleanest formulation is **forward, by prefix**:

> `dp[j]` = true ⟺ the first `j` characters, `s[0..j-1]`, can be segmented into dictionary words.
>
> **Decompose by the last word:** `s[0..j-1]` is segmentable iff some `i < j` exists where `s[0..i-1]` is segmentable (`dp[i]`) **and** the final chunk `s[i..j-1]` is a dictionary word.

Base case: `dp[0] = true` — the empty prefix is "segmentable" vacuously. It's a *seed* so the first real word has something to attach to; it does **not** mean "we placed a word."

Why this works where greedy doesn't: greedy commits to one match and never revisits. The DP keeps *every* viable prefix alive in parallel, so a dead branch doesn't poison the answer.

## 5. Optimal Solution: Bottom-Up DP

### Index conventions (get these right before writing code)

- `dp` has `n + 1` slots. Slot `j` refers to the prefix of **length** `j` (characters at indices `0..j-1`).
- Slice `s[i:j]` in Python is end-exclusive: characters `i .. j-1`, length `j - i`. So `s[0:n]` is the whole string and `dp[n]` is the answer.
- `i` is the **start index of the last word**; `j` is the **end (exclusive)**. Mixing "length" and "index" semantics is the #1 off-by-one here.

### The "look back at most `M`" trick

Since no dictionary word exceeds length `M = max(len(w))`, a last word ending at `j` must start at `i ≥ j - M`. The inner loop runs at most `M` times — 20, not 300.

### Code

```python
def wordBreak(s: str, wordDict: list[str]) -> bool:
    words = set(wordDict)                  # O(1) amortized lookup (vs O(K) on a list)
    if not words:                          # defensive; constraints guarantee >= 1 word
        return False
    n = len(s)
    max_len = max(len(w) for w in words)

    dp = [False] * (n + 1)                 # dp[j] := s[:j] is segmentable
    dp[0] = True                           # seed: empty prefix

    for j in range(1, n + 1):              # j = prefix length / end (exclusive)
        for i in range(max(0, j - max_len), j):   # i = start of the last word
            if dp[i] and s[i:j] in words:
                dp[j] = True
                break                      # feasibility: one witness is enough
    return dp[n]
```

Two loop-order notes:

- **Outer = end position, inner = start** ("pull" form: `dp[j]` looks back). Equally valid is the "push" form — for each `i` with `dp[i]`, push every matching word forward to `dp[i + len(w)]`. Both are correct here because we need *feasibility*, not *counting*; don't mix the two half-way.
- `break` on first success is safe only because the answer is boolean. If you had to count or enumerate segmentations (Word Break II), you must not break.

### Trace on Example 1: `s = "leetcode"`, dict = {leet, code}, M = 4

| `j` | prefix `s[:j]` | `i` scanned | working split (`i`, `s[i:j]`) | `dp[j]` |
|---|---|---|---|---|
| 1 | `l` | 0 | — | F |
| 2 | `le` | 0, 1 | — | F |
| 3 | `lee` | 0, 1, 2 | — | F |
| 4 | `leet` | 0–3 | **(0, "leet")**, `dp[0]=T` | **T** |
| 5 | `leetc` | 1–4 | — (`dp[4]`+`"c"` fails) | F |
| 6 | `leetco` | 2–5 | — | F |
| 7 | `leetcod` | 3–6 | — | F |
| 8 | `leetcode` | 4–7 | **(4, "code")**, `dp[4]=T` | **T** |

Answer: `dp[8] = true`. The chain is `dp[0] → dp[4] → dp[8]`: "leet" + "code".

### Trace on Example 2: `s = "applepenapple"`, dict = {apple, pen}, M = 5

| `j` | split that sets `dp[j]` | `dp[j]` |
|---|---|---|
| 5 | (0, "apple") | T |
| 8 | (5, "pen"), needs `dp[5]` | T |
| 13 | (8, "apple"), needs `dp[8]` | T |

"apple" is used twice and nothing special happens — the DP never tracks which words were consumed, only positions. This is exactly why the trace confirms reuse works for free.

### Trace on Example 3: `s = "catsandog"`, dict = {cats, dog, sand, and, cat}, M = 4

| `j` | prefix | working split | `dp[j]` |
|---|---|---|---|
| 3 | `cat` | (0, "cat") | **T** |
| 4 | `cats` | (0, "cats") | **T** |
| 7 | `catsand` | (3, "sand") — also (4, "and") | **T** |
| 8 | `catsando` | — ("ando" ∉, "g" ∉) | F |
| 9 | `catsandog` | — (`dp[7]`+`"og"` fails) | **F** |

The instructive moment: `dp[7]` is true ("cats and" works!), but **no dictionary word starts with `o`**, so `dp[8]` and `dp[9]` die. A valid prefix is not a valid answer — the DP only certifies the *full* length.

### Alternative: memoized top-down (same complexity, great for narration)

```python
from functools import lru_cache

def wordBreak(s: str, wordDict: list[str]) -> bool:
    words = set(wordDict)
    max_len = max(len(w) for w in words)
    n = len(s)

    @lru_cache(maxsize=None)      # memo key = start index ONLY
    def can(i: int) -> bool:
        if i == n:
            return True
        end = min(i + max_len, n)
        return any(can(j) for j in range(i + 1, end + 1) if s[i:j] in words)

    return can(0)
```

### Alternative: BFS over indices

Positions are graph nodes; an edge `i → j` exists when `s[i:j]` is a word. Question = "is `n` reachable from 0?" Mark visited **on enqueue**, not on pop, or you'll re-queue the same index many times.

```python
from collections import deque

def wordBreak(s: str, wordDict: list[str]) -> bool:
    words, n = set(wordDict), len(s)
    max_len = max(len(w) for w in words)
    seen, q = {0}, deque([0])
    while q:
        i = q.popleft()
        if i == n:
            return True
        for j in range(i + 1, min(i + max_len, n) + 1):
            if j not in seen and s[i:j] in words:
                seen.add(j)
                q.append(j)
    return False
```

### Extension: return an actual segmentation (store witnesses, don't break-and-forget)

```python
def word_break_sentence(s: str, wordDict: list[str]) -> str | None:
    words, n = set(wordDict), len(s)
    max_len = max(len(w) for w in words)
    dp = [False] * (n + 1); dp[0] = True
    parent = [-1] * (n + 1)                 # parent[j] = winning split's i
    for j in range(1, n + 1):
        for i in range(max(0, j - max_len), j):
            if dp[i] and s[i:j] in words:
                dp[j], parent[j] = True, i
                break
    if not dp[n]:
        return None
    out, j = [], n
    while j > 0:                            # walk parent pointers backwards
        out.append(s[parent[j]:j])
        j = parent[j]
    return " ".join(reversed(out))
```

## 6. Complexity

`n = len(s)`, `M = max word length (≤ 20)`, `D = total dictionary characters (≤ 20,000)`.

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Plain recursion | O(2^(n−1) · n) worst | O(n) stack | explores essentially every segmentation |
| Memoized top-down | O(n · M²) | O(n) memo + O(n) stack | `n` states × ≤ `M` lengths × O(`M`) slice/hash |
| **Bottom-up DP (primary)** | **O(n · M²)** | **O(n) + O(D) set** | ~120k probes at these bounds |
| BFS on indices | O(n · M²) | O(n) | same asymptotics, different framing |
| DP + trie | O(n · M + D) | O(D) trie + O(n) | walking the trie shares prefix work instead of re-hashing each slice |

Two precision points:

- Without the `j - max_len` bound, the inner loop runs `j` times and each slice/hash costs up to `n`, making it O(n³) ≈ 2.7×10⁷ ops — still passes at n = 300, but the bounded version is what an interviewer wants to see you derive.
- The `2^(n−1)` brute-force bound: each of the `n−1` gaps between adjacent characters independently either splits or doesn't, so the number of candidate segmentations doubles per character.

## 7. Common Mistakes and Interview Traps

| Trap | Why it bites | Fix |
|---|---|---|
| Misreading `dp[0] = true` | It's the empty-prefix **seed**, not "a word was placed." Treating it as a word lets phantom empty segments corrupt logic. | State the semantics explicitly: "dp[j] = first j characters segmentable; dp[0] is vacuous." |
| Index/length off-by-one | `dp` needs `n+1` slots; answer is `dp[n]`, not `dp[n-1]`; `s[i:j]` is end-exclusive. | Say the convention out loud before coding: "`j` is a length; slice end is exclusive." |
| Greedy longest/shortest match | `s="abcd"`, dict `["a","abc","b","cd"]`: greedy-longest takes `"abc"`, strands `"d"`, reports false — but `"a"+"b"+"cd"` is valid. A committed early choice can doom the rest. | Any-match DP over all viable prefixes. |
| Forgetting word reuse is allowed | Leads you down a "track used words" design — unnecessary state. | DP state = position only. |
| Assuming reuse is *mandatory to handle* per word | The mirror error: adding used-word bookkeeping that breaks the O(1) state. | Only if a variant bans reuse does state need the word multiset. |
| Memo key includes the path | Caching on `(i, words_used_so_far)` destroys sharing → still exponential. | Key = index alone. |
| Linear scan on the dict | `wordDict.contains(...)` on a list is O(K) per probe → O(n·M·K). | Convert to a hash set first. |
| Forgetting the `max_len` window | Correct but O(n³); also signals you didn't use the "word ≤ 20" constraint. | `range(max(0, j - max_len), j)`. |
| `break` in an enumeration variant | For counting/ listing segmentations (LC 140), breaking undercounts. | `break` only for pure feasibility. |
| Empty-word edge case | A zero-length word would make `i == j` a self-loop. | Constraints forbid it (length ≥ 1); mention you noticed. |

### Language-specific gotchas

| Language | Gotcha |
|---|---|
| Java | `wordDict.contains(w)` on a `List<String>` is a linear scan — build `HashSet<String>` first. Use `boolean[] dp`, not `Boolean[]` (autoboxing creates garbage per cell). `s.substring(i, j)` allocates on every probe — fine at n ≤ 300, but be ready to say hashing the substring is O(length), not O(1). |
| C++ | `s.substr(i, len)` heap-allocates per lookup; a `std::string_view`-based check avoids the copy (heterogeneous `find` on `unordered_set` needs C++20 transparent hashing). `vector<bool>` is bit-packed — fine here, but know it's not a normal `vector`. |

## 8. Test Cases — Propose These Out Loud

Before/after coding, say: *"Beyond the three examples, I want a greedy-trap case, a leftover-tail case, and a stress case for memoization."*

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | `"leetcode"`, `["leet","code"]` | true | Official; clean 2-word split |
| 2 | `"applepenapple"`, `["apple","pen"]` | true | Official; word reuse across the DP chain |
| 3 | `"catsandog"`, `["cats","dog","sand","and","cat"]` | false | Official; valid prefix (dp[7]) + dead tail |
| 4 | `"a"`, `["a"]` | true | Minimal true; `dp[1]` from seed |
| 5 | `"a"`, `["b"]` | false | Minimal false; no word matches |
| 6 | `"abcd"`, `["a","abc","b","cd"]` | true | **Greedy trap** — longest match fails, answer is true |
| 7 | `"aaaaab"`, `["a","aa","aaa","aaaa"]` | false | **Memoization stress** — 2⁵ paths into a dead end; catches non-memoized solutions at scale |
| 8 | `"leetcoder"`, `["leet","code"]` | false | Leftover tail after consuming all words |
| 9 | `"aa"`, `["aaa"]` | false | Dict word longer than `s`; inner window clamps to zero candidates |

## 9. Transferable Patterns and Related Problems

**The pattern:** *sequence segmentation feasibility* — `dp[j]` = "prefix of length `j` is achievable," transition = "attach one item (word / coin / chunk) to a smaller true prefix." Word reuse makes this the **unbounded knapsack / coin-change family**; items are available infinitely, so state is position-only.

| Problem | Relationship |
|---|---|
| LC 140 — Word Break II | Same DP, but enumerate all sentences via DFS over true states. Output can itself be 2^(n−1) sentences — always bound or warn about output size. |
| LC 472 — Concatenated Words | Run word-break DP on each word, excluding the word itself, requiring ≥ 2 pieces. |
| LC 322 / 518 — Coin Change I & II | Identical skeleton: dp over amounts, unbounded items; I is min-count, II is count of combinations. |
| LC 377 — Combination Sum IV | Count *ordered* ways — the word-break loop order (target outer, items inner). |
| LC 91 — Decode Ways | Segmentation feasibility/count with chunks of length 1–2 only. |
| LC 132 — Palindrome Partitioning II | Same prefix DP; inner check is "is palindrome" instead of "in dict"; minimizes cuts. |
| LC 2707 — Extra Characters in a String | Nearly identical DP with a cost: `dp[j] = min(dp[i] + uncovered)`. |

Meta-lessons to say out loud: **greedy fails when an early choice constrains future choices** (partitioning problems generally need DP); **memo on the minimal state that determines the future** (position, not path); **boolean-feasibility lets you short-circuit, counting/enumeration does not**.

## 10. Full Interview Script (the long talk track)

> *"Let me restate: I need to decide if `s` can be fully partitioned into dictionary words, reusing words is fine, and I only need yes/no.*
>
> *"First attempt: recursion — at each index, try every dictionary word that matches there and recurse. That's exponential: with something like all-'a's, every way of placing separators gets explored, which is 2 to the n. In fact on `catsandog`, the state 'can I segment from index 7' is reached twice. So: overlapping subproblems, and the answer for a suffix depends only on where I'm standing — not how I got there.*
>
> *"That gives the DP. I'll define dp[j] over lengths: dp[j] is true if the first j characters can be segmented. dp[0] is true as a seed for the empty prefix. Transition: dp[j] is true if there's some i < j with dp[i] true and s[i..j-1] in the dictionary — i.e., a valid last word glued onto a segmentable prefix. One left-to-right pass; answer is dp[n].*
>
> *"Two optimizations: hash the dictionary into a set for O(1) lookups, and since no word is longer than 20, I only look back 20 characters from each j. That's O(n · M²) time — about a hundred twenty thousand cheap operations here — and O(n) space. Slice-and-hash costs O(M), which the M² already accounts for.*
>
> *"I checked greedy deliberately and it fails: 'abcd' with ['a','abc','b','cd'] — greedy longest takes 'abc' and strands 'd', but 'a'+'b'+'cd' works. So the DP's 'keep all viable prefixes alive' is required, not optional.*
>
> *"Tests: the three examples, plus 'a'/'b' minimal cases, a leftover-tail false, and 'aaaa…b' to stress memoization."*

## 11. Say It in 60 Seconds

> "Word Break is a string-partition feasibility question. Brute force tries every dictionary word at every position and recurses — that's exponential, because the same starting index gets re-solved from different paths, and with repetitive strings you're enumerating all 2-to-the-n segmentations. The fix: the answer for a suffix depends only on where you're standing, so define dp[j] — 'the first j characters can be segmented.' dp[0] is true as an empty-prefix seed. dp[j] is true if any earlier true dp[i] exists whose gap s[i..j] is a dictionary word — decompose by the last word. One left-to-right pass, answer dp[n]. Put the dictionary in a hash set, and since words are at most 20 characters, only look back 20 from each j. That's O(n times L-squared) time, O(n) space — trivial at n equals 300. Greedy doesn't work — 'abcd' with 'a, abc, b, cd' breaks longest-match — so the all-viable-prefixes DP is necessary. I'd test the three examples plus a leftover-tail false, a single-character case, and an all-same-letter stress case to catch missing memoization."
