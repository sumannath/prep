# Word Ladder — Complete Interview Lesson

**LeetCode 127 · Medium · BFS / Shortest Path in an Implicit Graph**

---

## 1. Problem Restatement

You are given three things:

- `beginWord` — your starting word (may not be in the dictionary).
- `endWord` — your target word.
- `wordList` — a dictionary of allowed words (all unique, all the same length as `beginWord`).

You may transform a word into another word if they differ in **exactly one letter position**. Starting at `beginWord`, repeatedly transform into a word from `wordList` until you reach `endWord`.

**Return the number of words in the shortest such sequence** (including both `beginWord` and `endWord`), or `0` if `endWord` is not reachable.

Key clarifications to say out loud in the interview:

- The count includes `beginWord` itself. `"hit" -> "hot" -> "dot" -> "dog" -> "cog"` has **5** words, i.e., 4 transformations. Off-by-one on this count is the #1 wrong-answer bug.
- If `endWord` is not in `wordList`, the answer is `0` immediately — no sequence can end at a word outside the dictionary, since `s_k` must be in `wordList`.
- `beginWord` does **not** need to be in the dictionary, but every intermediate word does.
- `beginWord != endWord` is guaranteed, so the trivial 1-word answer can't occur.

---

## 2. Decoding the Constraints

| Constraint | What it tells us |
|---|---|
| `wordList.length <= 5000` | An O(N²) pairwise comparison (5000² = 25M character comparisons split across letters) is borderline but feasible; better is O(N · L²) with L ≤ 10. |
| Word length ≤ 10 | Trying all 26 letters at each of ≤10 positions costs only 260 candidate strings per word — very cheap. This is the hint that **character-by-character generation** beats **pairwise comparison**. |
| All lowercase letters | The alphabet size is a fixed 26, so enumerating substitutions is constant-ish per position. |
| All words unique, same length | No dedup of the dictionary needed; no variable-length complications. But `wordList` may contain `beginWord` — harmless, it just gets visited first. |
| `beginWord != endWord` | We always need at least one transformation, so the minimum possible answer is 2. |

---

## 3. The Core Insight: It's a Shortest-Path Problem

Build an **implicit graph**: each word is a node; an edge exists between two words that differ in exactly one letter. The question becomes: *shortest path from `beginWord` to `endWord` in an unweighted graph* — and shortest path in an **unweighted, unweighted-edge** graph is **BFS**, because BFS explores nodes in order of distance and the first time you reach a node, you reached it via a shortest path.

Two practical consequences:

1. **Never use DFS** for the shortest path itself — DFS can wander down a long dead-end branch and return a non-minimal path.
2. **Mark nodes visited when you enqueue them**, not when you dequeue them. Otherwise the same word gets queued multiple times and you can blow up to exponential work in dense graphs.

### Generating neighbors: two strategies

**Strategy A — pairwise check (O(N · L) per node to scan the whole list):**
For each dequeued word, compare it to every word in the list and count differing positions. With N = 5000 and 5000 dequeues worst case, that's ~25M·10 character operations — passes but is wasteful.

**Strategy B — wildcard pattern buckets (the elegant trick):**
Two words differ in exactly one letter iff they share the same "pattern" with one position wildcarded. E.g., `hot` and `dot` both produce the pattern `*ot`; `hot` and `hit` both produce `h*t`.

Preprocess the dictionary into a map:

```
pattern -> list of words with that pattern
*ot : [hot, dot, lot]
h*t : [hot]
ho* : [hot]
d*t : [dot]
do* : [dot, dog]
...
```

Then the neighbors of `hot` are: all words in `*ot`, `h*t`, and `ho*` buckets, minus `hot` itself. This builds in O(N · L) time/space and answers "neighbors of a word" in O(L · bucket-size) instead of O(N · L).

---

## 4. Brute Force (Pairwise-Comparison BFS) with a Worked Trace

This is a perfectly good fallback to mention first, and it's what you should code if you blank on the pattern trick.

```python
from collections import deque

def ladderLength_bruteforce(beginWord: str, endWord: str, wordList: list[str]) -> int:
    words = set(wordList)
    if endWord not in words:
        return 0

    L = len(beginWord)
    queue = deque([(beginWord, 1)])          # (word, number of words in path so far)
    words.discard(beginWord)                 # remove visited words from the set itself

    while queue:
        word, depth = queue.popleft()
        if word == endWord:
            return depth

        # Strategy A: mutate each position across the alphabet
        for i in range(L):
            for c in "abcdefghijklmnopqrstuvwxyz":
                candidate = word[:i] + c + word[i+1:]
                if candidate in words:
                    words.remove(candidate)   # mark visited at enqueue time
                    queue.append((candidate, depth + 1))
    return 0
```

(Note: this version actually already uses Strategy B's generation idea but checks membership against the set — which is effectively the standard optimal solution. The truly brute-force variant compares against all 5000 words instead; it's slower but same asymptotic shape. We show the generation version because it's the one you should write.)

### Trace on Example 1

`beginWord = "hit"`, `endWord = "cog"`, `wordList = ["hot","dot","dog","lot","log","cog"]`

| Step | Dequeued (depth) | Neighbors generated | Action |
|---|---|---|---|
| 1 | `hit` (1) | Candidates at 3 positions × 26 letters; only `hot` is in the set | Enqueue `hot` (2), remove from set |
| 2 | `hot` (2) | `*ot` candidates → `dot`, `lot` in set (also `hot` itself — already removed); `h*t`/`ho*` → none new | Enqueue `dot` (3), `lot` (3) |
| 3 | `dot` (3) | `*ot` → `lot` (already visited); `d*t` → none new; `do*` → `dog` | Enqueue `dog` (4) |
| 4 | `lot` (3) | `*ot` → nothing new; `l*t` → none; `lo*` → `log` | Enqueue `log` (4) |
| 5 | `dog` (4) | `*og` → `log` (visited), `cog` (in set!) | Enqueue `cog` (5) |
| 6 | `log` (4) | `cog` already removed from set | — |
| 7 | `cog` (5) | `cog == endWord` → **return 5** ✓ | — |

Notice depth increments by exactly 1 per transformation, so `depth` equals the number of words in the path. Also note step 6–7: BFS order guarantees `cog` is first reached via the 5-word path even though `log` (also at depth 4) could have produced it — same length, so it doesn't matter, but it illustrates why first-arrival = shortest.

### Trace on Example 2

`cog` is not in `wordList` → early return `0`. ✓ (If you forget this check, BFS would exhaust everything and return 0 anyway — the check is just an optimization, not a correctness requirement. Saying this out loud shows precision.)

---

## 5. Optimal Approach: BFS with Precomputed Pattern Buckets

### Algorithm

1. **Guard:** if `endWord` not in the dictionary set → return `0`.
2. **Preprocess:** for every word `w` in the list, for each index `i`, insert `w` into `bucket[w[:i] + '*' + w[i+1:]]`.
3. **BFS** from `beginWord` with `(word, depth)`. Maintain a `visited` set (or mutate a copy of the word set). On each dequeue:
   - If `word == endWord`, return `depth`.
   - For each of the `L` wildcard patterns of `word`, look up the bucket and enqueue every unvisited word in it. Remove them from `visited` **as you enqueue**.
   - Optimization: clear the bucket after use (`bucket[pattern] = []`) so each bucket's words are scanned at most once.
4. Return `0` if the queue empties.

### Code

```python
from collections import deque, defaultdict
import string

def ladderLength(beginWord: str, endWord: str, wordList: list[str]) -> int:
    words = set(wordList)
    if endWord not in words:
        return 0
    words.discard(beginWord)                 # avoid re-visiting the start

    L = len(beginWord)

    # Step 2: wildcard pattern buckets.
    buckets = defaultdict(list)
    for w in words:
        for i in range(L):
            buckets[w[:i] + '*' + w[i+1:]].append(w)

    queue = deque([(beginWord, 1)])
    while queue:
        word, depth = queue.popleft()
        if word == endWord:
            return depth

        for i in range(L):
            pattern = word[:i] + '*' + word[i+1:]
            for nxt in buckets[pattern]:
                if nxt in words:             # still unvisited?
                    words.remove(nxt)        # mark visited at ENQUEUE time
                    queue.append((nxt, depth + 1))
            buckets[pattern] = []            # bucket fully consumed
    return 0
```

### Why marking visited at enqueue time is mandatory

If you instead check `nxt == endWord` or mark visited at *dequeue* time, the same word can be enqueued once per neighbor that discovers it. In a dense layer (hundreds of words in the same bucket family), the queue can hold the same word many times — in the worst case this multiplies work layer-by-layer toward exponential blowup. Standard BFS hygiene: **dedupe on insertion, not on extraction.**

### Bidirectional BFS (the interview "bonus level")

Because the graph is unweighted and you know both endpoints, you can run BFS from both `beginWord` and `endWord` simultaneously, always expanding the **smaller** frontier. The search meets in the middle; each side only explores roughly half the depth, and since queue sizes grow geometrically with depth, this can cut the work substantially in practice.

```python
def ladderLength_bidirectional(beginWord: str, endWord: str, wordList: list[str]) -> int:
    words = set(wordList)
    if endWord not in words:
        return 0
    words.discard(beginWord)

    L = len(beginWord)
    buckets = defaultdict(list)
    for w in words:
        for i in range(L):
            buckets[w[:i] + '*' + w[i+1:]].append(w)

    front = {beginWord: 1}                   # word -> depth from that side
    back  = {endWord: 1}
    queue_f = deque([beginWord])
    queue_b = deque([endWord])

    while queue_f and queue_b:
        # Always expand the smaller frontier
        if len(queue_f) > len(queue_b):
            front, back = back, front
            queue_f, queue_b = queue_b, queue_f

        for _ in range(len(queue_f)):
            word = queue_f.popleft()
            depth = front[word]
            for i in range(L):
                for nxt in buckets[word[:i] + '*' + word[i+1:]]:
                    if nxt in back:                       # frontiers meet!
                        return depth + 1 + back[nxt] - 1  # see note below
                    if nxt in words:
                        words.remove(nxt)
                        front[nxt] = depth + 1
                        queue_f.append(nxt)
    return 0
```

⚠️ **Merge-depth arithmetic is the classic bug here.** `front[word]` counts words from `beginWord`'s side (so `beginWord` = 1), and `back[nxt]` counts words from `endWord`'s side (so `endWord` = 1). When `nxt` is in `back` at depth `d_b`, the path is: `depth(front side words up to and including word)` + 1 transformation to `nxt` + `d_b` words from `nxt` to `endWord` *minus 1* (because `nxt` itself would be double-counted). If the meet node is in `front` already (impossible if we removed it from `words`), it's different. **Sketch this on the 5-word example before coding it** — `hit`(1) meets `dog`(4-from-front? no, 4-from-back: cog=1, dog=2... ) — doing this arithmetic wrong is the single most common reason people's bidirectional version returns 4 instead of 5 or vice versa. If you can't convince yourself in 30 seconds, ship the one-directional version; it's fully correct and passes.

---

## 6. Complexity

Let `N = len(wordList)`, `L = word length`, `Σ = 26` (alphabet).

| Approach | Time | Space | Notes |
|---|---|---|---|
| Pairwise-compare neighbors | O(N² · L) | O(N · L) | 5000²·10 = 250M — risky in Python, fine in C++ |
| BFS + per-word 26-letter generation, membership via hash set | O(N · L² · Σ) ≈ generation cost per word is O(L) per attempt | O(N · L) for the set + queue | Note each generated candidate is a new string of length L, so string building costs O(L) → O(L²·Σ) per word worst case; no bucket preprocessing needed |
| **BFS + pattern buckets (recommended)** | **O(N · L²)** build (N words × L patterns × O(L) slicing) + O(N · L) BFS traversal, since each bucket word is dequeued-scanned once per its L patterns | **O(N · L)** for buckets + visited + queue | Best practical choice |
| Bidirectional BFS | Same asymptotics; substantially smaller constant in dense layers | Same | Implementation-error-prone |

Path reconstruction (if asked for the actual sequence) requires storing parent pointers: +O(N · L) space, and you backtrack from `endWord` at the end.

---

## 7. Common Mistakes

| # | Mistake | Consequence / Fix |
|---|---|---|
| 1 | Forgetting `endWord` must be in `wordList` | Returns a positive count on Example 2. Early-return `0`. |
| 2 | Returning number of *transformations* instead of number of *words* | Off-by-one: returns 4 instead of 5. Initialize depth to 1 (or add 1 at the end). |
| 3 | Marking visited at **dequeue** time | Same word enqueued many times → TLE / exponential blowup in dense layers. Dedupe at enqueue. |
| 4 | Using DFS / recursion for the "shortest" sequence | DFS finds *a* path, not the shortest. Unweighted shortest path ⇒ BFS. |
| 5 | Visiting a word already in the current path but not globally visited | Wasted work; you only need *global* visited for shortest-path counting. |
| 6 | Bidirectional BFS depth-merge arithmetic wrong | Off-by-one/off-by-two at the meeting point. Trace on the 5-word example before trusting it. |
| 7 | Mutating `wordList` (e.g., `wordList.remove(...)`) then relying on it later | Fine if intentional (set-removal trick), but if you also need the original list for buckets built later, build buckets *before* mutating. Order matters. |
| 8 | Comparing neighbor against `beginWord` incorrectly | `beginWord` isn't in the dictionary; if a generated candidate equals `beginWord`, skip it (it's already visited). |

### Language-specific gotchas

- **Python:** `str` is immutable — each candidate `word[:i] + c + word[i+1:]` allocates a new string (O(L) each). Fine here (L ≤ 10), but if asked to optimize, mutate a `bytearray`/`list` of chars in place. Also, `defaultdict(list)` auto-creates empty buckets on lookup — harmless, but `buckets[pattern] = []` after consumption prevents re-scanning; alternatively use `buckets.get(pattern, ())`.
- **Java:** `String.substring(i, i+1)` builds a new string each time; building candidates via `char[] w = s.toCharArray()` + mutation + `new String(w)` is faster and idiomatic. Never use `==` on strings for set/dict keys — rely on `String.equals` (a `HashSet<String>` handles this correctly; raw `==` in hand-rolled comparisons does not). `ArrayDeque<String>` over `LinkedList` for the queue (less allocation, no autoboxed `Integer` in a `Queue<int[]>`-style pairing — just encode depth by processing the queue level-by-level instead of storing pairs).
- **C++:** `unordered_set<string>` hashing of 10-char strings is fine, but constructing candidates via `std::string tmp = word; tmp[i] = c;` avoids repeated concatenation. Beware `buckets[pattern]` on a `map`/`unordered_map` **inserts** an empty vector on operator-`[]` lookup — use `.find()` when just probing, or you silently bloat memory. Integer depth can't overflow here (max 5001), so no `int`/`long` concern.

---

## 8. Test Cases to Propose Out Loud

Before coding, state at least these:

1. **Official Example 1:** `hit / cog / [hot,dot,dog,lot,log,cog]` → `5`.
2. **Official Example 2:** `cog` missing from list → `0`. (Guards requirement that `s_k` be in the dictionary.)
3. **Edge — beginWord already "adjacent" to endWord:** `hit / hot / [hot]` → `2`. Confirms the count includes `beginWord` and that a dictionary of one word works.
4. **Edge — no path even though endWord is present:** `hit / cog / [cog]` → `0`. `cog` is in the list but unreachable (differs by 3 letters from `hit`, no bridge words). Ensures you don't return a bogus positive just because `endWord ∈ wordList`.
5. **Edge — beginWord appears in wordList:** `hot / dot / [hot, dot]` → `2`. `beginWord` in the dictionary must not cause a self-loop or a double count.
6. **Edge — single-letter dictionary word count:** `a / c / [a, b, c]` → `3`. Sanity for length-1 words (constraint allows L = 1).
7. **Stress:** 5000 words of length 10 — verify the bucket preprocessing and enqueue-time dedup keep it fast (mention, don't hand-trace).

---

## 9. Transferable Patterns & Related Problems

- **Implicit graph / shortest path:** you don't need an explicit adjacency list — neighbors can be *generated* (26 letter substitutions) or found via a *pattern index*. This exact idea recurs in:
  - **Word Ladder II (LC 126)** — same BFS, but track all shortest paths; requires *layered* BFS and careful visited handling per level so parallel predecessors are all recorded.
  - **Open the Lock (LC 752)** — 4-digit lock with ±1 rotations per wheel: identical "generate neighbors from a small alphabet" BFS, plus a deadend set that behaves like the visited set.
  - **Minimum Genetic Mutation (LC 433)** — literally Word Ladder over 8-char gene strings with a 4-letter alphabet.
  - **Sliding Puzzle / shortest path on state spaces** — nodes are states, edges are moves; BFS because all edges cost 1. If edges had different costs, you'd switch to Dijkstra — that's the general decision rule to state in interviews.
- **Preprocessing / indexing trick:** building wildcard buckets is an instance of "trade one-time O(N·L²) preprocessing for O(1)-ish neighbor lookup," the same family as grouping anagrams by sorted-signature (LC 49).
- **Bidirectional BFS** generalizes to any two-endpoint unweighted shortest path when frontiers may be large.

---

## 10. Say It in 60 Seconds

> "This is a shortest-path problem in disguise. Words are nodes, and two words are connected if they differ in exactly one letter — so the answer is BFS distance from beginWord to endWord, since all edges cost one. BFS, not DFS, because BFS guarantees first arrival is shortest.
>
> Two details matter. First, if endWord isn't in the dictionary, return zero immediately. Second, the count includes beginWord, so depth starts at one.
>
> For neighbors, rather than comparing against all 5000 words, I generate candidates by replacing each of the ten positions with each of 26 letters and check membership in a hash set — that's only 260 candidate strings per word. Or, even better, I pre-build wildcard buckets: 'hot', 'dot', and 'lot' all share the pattern star-o-t, so one lookup gets me all neighbors.
>
> I mark words visited when I enqueue them, not when I dequeue — otherwise the same word gets queued repeatedly and it can blow up. The complexity is N times L squared for building the buckets plus linear BFS, so about half a million operations with the given constraints. If asked to optimize further, I'd run bidirectional BFS from both ends and expand the smaller frontier."

---

### Quick self-check before you code
- [ ] Depth starts at **1** (words, not transformations).
- [ ] `endWord ∈ wordList` guard.
- [ ] `beginWord` removed / marked visited before BFS starts.
- [ ] Visited set updated at **enqueue**.
- [ ] Hand-traced Example 1 to 5 (not 4).
