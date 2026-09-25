# Word Search II — Complete Lesson

**LeetCode 212 · Hard · Trie + Backtracking**

---

## 1. Problem Restatement

You're given:

- A grid `board` of size `m x n` (`1 <= m, n <= 12`) of lowercase letters.
- A list `words` of up to `3 * 10^4` unique lowercase strings, each of length `<= 10`.

Return **every word in `words` that can be traced as a path on the board**, where a path is:

- A sequence of cells `(r0,c0), (r1,c1), ..., (r_{L-1},c_{L-1})` such that cell `i+1` is a **4-directional** neighbor of cell `i` (Manhattan distance exactly 1 — no diagonals).
- All cells in the path are **distinct** — a cell may not be reused *within one word*. Different words may freely reuse the same cells.

Precision points to lock in before coding:

- **Indices vs values:** cells are addressed by indices `(r, c)`; the trie is keyed by *values* (the characters `board[r][c]`).
- **Duplicates:** the *input* words are unique, but the **same word may be spellable via multiple different cell paths** — your output must still contain it once. This is the duplicate source people miss.
- **Output order:** any order is accepted by the judge; Example 1's output `["eat","oath"]` is just one valid ordering.

---

## 2. Constraint Decoding

| Constraint | Value | What it tells you |
|---|---|---|
| `m, n <= 12` | ≤ 144 cells | The board is tiny; DFS from every cell is cheap; recursion depth ≤ ~11 is trivially safe. |
| `words.length <= 3*10^4`, `len(word) <= 10` | total chars `W <= 3*10^5` | A trie of all words has ≤ `W + 1` nodes — fits comfortably in memory. But *per-word* DFS is fatal (see §3.3). |
| lowercase letters only | alphabet = 26 | Trie fanout ≤ 26; also makes the `'#'` sentinel a safe "visited" marker. |
| all words unique | — | No input dedup needed — but path-multiplicity dedup **is** needed (§1). |

One cute consequence of the constraints: `26^3 = 17,576 < 3 * 10^4`, so by pigeonhole at least two words must share a 3-letter prefix — prefix sharing (the thing the trie exploits) is *guaranteed*, not incidental.

Any correct algorithm must at least read all `W` word characters and the whole `M = m*n` board, so `Ω(W + M)` is unavoidable — the trie build already meets that floor.

---

## 3. Brute Force: Run Word Search I Once Per Word

### 3.1 Approach & code

For each word, do the Word Search I routine: try to start a DFS from every cell, match the word character by character, mark the current cell as visited (temporarily overwrite with `'#'`), recurse into 4 neighbors, restore on exit.

```python
def findWords_bruteforce(board, words):
    m, n = len(board), len(board[0])

    def exists(word):
        def dfs(r, c, i):
            if i == len(word):
                return True
            # guard BEFORE mutating: bounds + character match
            if not (0 <= r < m and 0 <= c < n) or board[r][c] != word[i]:
                return False
            board[r][c] = '#'                       # mark
            found = any(dfs(r + dr, c + dc, i + 1)
                        for dr, dc in ((1,0), (-1,0), (0,1), (0,-1)))
            board[r][c] = word[i]                   # unmark, always
            return found
        return any(dfs(r, c, 0) for r in range(m) for c in range(n))

    return [w for w in words if exists(w)]
```

### 3.2 Worked trace (Example 1)

```
        c0   c1   c2   c3
r0      o    a    a    n
r1      e    t    a    e
r2      i    h    k    r
r3      i    f    l    v
```

**Word `"eat"` (succeeds).** Cells containing `'e'`: `(1,0)` and `(1,3)`.

1. Start `(1,0)`=`e`. Need `'a'` next. Neighbors: `(0,0)=o`, `(2,0)=i`, `(1,1)=t` → no match. Fail, unmark.
2. Start `(1,3)`=`e`, mark. Need `'a'`: neighbors `(0,3)=n`, `(2,3)=r`, `(1,2)=a` → match `(1,2)`, mark.
3. Need `'t'`: neighbors of `(1,2)` minus used: `(0,2)=a`, `(2,2)=k`, `(1,1)=t` → match `(1,1)`. Path `(1,3)→(1,2)→(1,1)` spells `"eat"` → found.

**Word `"rain"` (fails fast).** Only `'r'` is at `(2,3)`. Need `'a'`: neighbors are `(1,3)=e`, `(3,3)=v`, `(2,2)=k` → dead end. `"rain"` not formable. (`"pea"` fails even faster: no `'p'` exists anywhere.)

Expected output `{oath, eat}` — `"oath"` is found via `(0,0)→(0,1)→(1,1)→(2,1)`.

### 3.3 Why it dies at scale

From a start cell, after the first move at most 3 of the 4 directions can proceed (the cell you came from is marked visited), so a word of length `L` costs at most ~`M · 4·3^{L-1}` steps. With `M = 144`, `L = 10`, `K = 3·10^4` words:

```
K · M · 4·3^9 ≈ 3·10^4 · 144 · ~7.9·10^4 ≈ 1.7·10^11 steps  →  far too slow
```

The waste is structural: **every word redoes the same board scan, and identical prefixes ("ea...", "ra...") are re-explored from scratch** — no work is shared across the 30,000 words.

---

## 4. Core Insight

> The board DFS is a **prefix-expanding walk**. So index the *dictionary by prefix* — build a **trie** of all words — and at each step ask the trie a single question: *"Is the path I've spelled so far still a prefix of some remaining word?"* A miss prunes the entire subtree in `O(1)`.

Three consequences make this the standard optimal solution:

1. **Shared prefix work:** 30,000 words collapse into ≤ ~300k trie nodes; the DFS walks shared prefixes once.
2. **Harvest + dedupe at the terminal node:** store the full word at its terminal node. When DFS lands there, append it and **set it to `None`** — so the same word found via a *different cell path* is never reported twice.
3. **Shrinking dictionary:** after harvesting, prune trie nodes with no children left; when the root empties, you can stop scanning the board entirely.

---

## 5. Optimal Approach: Trie + Backtracking

### 5.1 Algorithm

1. Insert every word into a trie; store the complete word string at its terminal node.
2. For each cell `(r, c)`, launch `dfs(r, c, root)`.
3. In `dfs(r, c, node)`: look up `board[r][c]` among `node.children`. Miss → return (prune). Hit → mark the cell with `'#'`; if the child holds a word, append it and clear it; recurse into unmarked in-bounds neighbors with the child node; restore the cell; optionally prune the child if it's now an empty leaf.

### 5.2 Python implementation

```python
class TrieNode:
    __slots__ = ("children", "word")   # slim nodes: ~3*10^5 of them possible
    def __init__(self):
        self.children = {}   # char (value) -> TrieNode
        self.word = None     # full word stored ONLY at terminal nodes

class Solution:
    def findWords(self, board: list[list[str]], words: list[str]) -> list[str]:
        # 1) Build trie: O(W), W = total characters across words
        root = TrieNode()
        for w in words:
            node = root
            for ch in w:
                node = node.children.setdefault(ch, TrieNode())
            node.word = w

        m, n = len(board), len(board[0])
        res = []

        def dfs(r: int, c: int, node: TrieNode) -> None:
            ch = board[r][c]                    # the VALUE at this (index)
            child = node.children.get(ch)
            if child is None:                   # guard BEFORE any mutation
                return                          # prune whole subtree
            board[r][c] = '#'                   # mark (safe: lowercase-only board)
            if child.word is not None:          # a full word ends exactly here
                res.append(child.word)          # O(1): append stored reference
                child.word = None               # dedupe: never harvest twice
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):   # 4 dirs only
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n and board[nr][nc] != '#':
                    dfs(nr, nc, child)
            board[r][c] = ch                    # unmark — runs on EVERY path
            if not child.children:              # subtree fully harvested?
                del node.children[ch]           # prune (after recursion, never during iteration)

        for r in range(m):
            for c in range(n):
                if not root.children:           # dictionary exhausted → stop early
                    return res
                dfs(r, c, root)
        return res
```

Optional micro-optimizations to mention, not necessarily code: skip building words with `len(w) > m*n` (they can't fit); if output must be sorted, do `return sorted(res)` at the end.

### 5.3 Trie for Example 1

```
root
├─ o ─ a ─ t ─ h   ● "oath"
├─ p ─ e ─ a       ● "pea"
├─ e ─ a ─ t       ● "eat"
└─ r ─ a ─ i ─ n   ● "rain"
```

### 5.4 Trace on Example 1

Scan starts at `(0,0)`:

1. **`dfs(0,0, root)`**, ch=`'o'` → child exists. Mark `(0,0)`. Neighbor `(1,0)=e`: `'o'`-node has only `'a'` → miss. Neighbor `(0,1)=a`: hit → `dfs(0,1, "oa"-node)`.
2. Mark `(0,1)`. Neighbor `(0,2)=a`: `"oa"`-node has only `'t'` → miss. Neighbor `(1,1)=t`: hit → `dfs(1,1, "oat"-node)`.
3. Mark `(1,1)`. Neighbor `(2,1)=h`: hit → `dfs(2,1, "oath"-node)`.
4. Mark `(2,1)`. `"oath"` node holds `word="oath"` → **append `"oath"`**, set `word=None`. All neighbors blocked/miss → restore `'h'`. `"oath"` is a childless leaf → **prune** it from `"oat"`.
5. Unwinding cascades the prune: `"oat"` now childless → pruned from `"oa"`; `"oa"` childless → pruned from `'o'`; `'o'` childless → **pruned from root**. Cells restored.
6. Continue scanning: `(1,0)=e` → root's `'e'` exists, but neighbors of `(1,0)` give no `'a'` → dead end. `(1,3)=e` → `(1,3)→(1,2)=a →(1,1)=t` → **append `"eat"`**, prune the `e-a-t` chain up to the root.
7. `(2,3)=r` → `'r'` matches, but its only child `'a'` matches no neighbor → dead end (`'r'` branch stays — not fully harvested, so no prune). No cell is `'p'`, so `"pea"`'s branch never fires.
8. Result: `["oath", "eat"]` — same *set* as the expected `["eat", "oath"]`; any order is accepted.

Note how step 5's prune cascade is what makes this fast: the entire `oath` subtree stops existing after one harvest.

### 5.5 Trace on Example 2

Board `[["a","b"],["c","d"]]`, `words=["abcb"]`. Trie: `a→b→c→b●`.

- `dfs(0,0)`: `'a'` hits → mark; neighbor `(0,1)='b'` hits → mark; `"ab"` node's child is `'c'`, but neighbors are `(0,0)='#'` (used) and `(1,1)='d'` → dead end, restore both cells. Note `(0,0)`'s `'a'` **cannot** serve as the final `'b'`-adjacent... in this board there's no `'c'` at all, but even in a friendlier board the `'#'` marker is what enforces the no-reuse rule.
- All other start cells miss at the root guard.
- Result: `[]` ✓

### 5.6 Design decisions worth saying out loud

- **Match the cell *inside* `dfs` against the parent node.** The main loop then just calls `dfs(r, c, root)`; no char needs to be carried along.
- **Guard-before-mutate:** the only early `return` happens *before* writing `'#'`, so there is exactly one mutation point and exactly one restore point — the restore cannot be skipped by any early exit.
- **Mutate the board vs. a `visited` matrix:** `'#'` is safe because the alphabet is lowercase-only. If the interviewer forbids mutating input, use a `visited` set/matrix — but remember it's **per-path state**: add on the way down, *remove* on the way up (this is backtracking, not flood fill).
- **Store the word at the terminal node** instead of rebuilding it char-by-char during DFS: harvest is `O(1)` (append an existing reference) instead of `O(L)` string building per match.
- **Dedupe at harvest, not at the end:** `child.word = None` makes duplicate paths impossible to double-report.
- **Prune after recursion, never during iteration:** the `del node.children[ch]` sits after the neighbor loop, so you never mutate a dict while iterating it.

### 5.7 Fuller interview talk track (script)

> "Brute force is Word Search I per word — at 30k words and length-10 words that's roughly 10^11 steps, because no prefix work is shared. Since words overlap heavily in prefixes, I'll put the whole dictionary into a trie — linear in total characters, about 3·10^5 nodes worst case. Then one backtracking DFS from every cell, but instead of matching one word, I walk the trie: at each cell, one hash lookup of the cell's letter among the current node's children; a miss prunes the entire subtree immediately — that single check is what kills the exponential. When I land on a node with its word set, I append it and clear the field, so if a different cell path spells the same word, it can't be reported twice. I mark visited cells by overwriting with '#', which is safe since the board is lowercase-only, and restore right after the neighbor loop; the only early return happens before the mark, so unmark always runs. Two refinements: after a word is harvested, prune any trie node left with no children — whole subtrees disappear — and if the root ever empties, I stop scanning the board. Complexity: O(W) to build; search is at most cells times 3^{L−1} transitions, each O(1) — 3 because the previous cell is always visited — and in practice far less because of pruning. Space: the trie plus O(L) recursion."

---

## 6. Complexity

Let `M = m·n ≤ 144` (cells), `L = 10` (max word length), `K ≤ 3·10^4` (words), `W = Σ|wᵢ| ≤ 3·10^5`.

| Approach | Time | Space | At max constraints |
|---|---|---|---|
| Brute force (per-word DFS) | `O(K · M · 3^{L−1})` | `O(L)` stack | ≈ `1.7·10^{11}` — TLE |
| Enumerate all board paths + hash-set lookup | `O(M · 3^{L−1} · L)` — independent of `K` | `O(1)`–`O(#paths)` | ≈ `5.7·10^6` paths × `O(L)` hashing; viable but explores *every* path even when nothing matches |
| **Trie + backtracking (this solution)** | `O(W)` build + `O(M · 3^{L−1})` search worst case, `O(1)` per transition | `O(W)` trie + `O(L)` stack; board marked in place, `O(1)` extra | Build ≈ `3·10^5`; search worst ≈ `5.7·10^6`, typically far less |

Justification of the `3^{L−1}`: after the first move, the previous cell is always marked visited, so each subsequent step has at most 3 of 4 directions available — the trie can only shrink this branching, never grow it. Real inputs are dramatically faster because (a) prefixes die at the first divergent character, and (b) harvested subtrees are physically deleted, so the search gets cheaper as it succeeds.

---

## 7. Common Mistakes

1. **Restore skipped on an early return.** E.g., writing `'#'` then `return`ing from inside the neighbor loop on a mismatch. Fix: guard *before* mutating; the mark/unmark pair brackets all recursion (single restore point).
2. **Returning immediately after a full-word match.** Misses longer words sharing that prefix (`"oa"` then `"oat"`). After harvesting, *continue* the neighbor loop.
3. **No dedupe at harvest** → a word spelled by two different paths appears twice (see test §9.4). Fix: `node.word = None` after appending.
4. **Treating `visited` as global** (flood-fill habit). Visited-ness is per-path; it must be undone on backtrack, and different words may reuse the same cells freely.
5. **Checking `prefix in words_set` at every DFS step** instead of a trie: `O(L)` per step, and no cross-word prefix pruning — you explore the full path tree even when the current prefix matches nothing.
6. **Deleting trie children while iterating the dict** (`RuntimeError: dictionary changed size` in Python, iterator invalidation in C++). Prune *after* the neighbor loop.
7. **Rebuilding the word string during DFS** (`prefix += ch` / `prefix[:-1]`): `O(L)` per node and easy to get wrong; store the word reference at the terminal node instead.
8. **Using 8 directions** (including diagonals) — the problem allows only horizontal/vertical neighbors.
9. **Off-by-one bounds** on non-square boards — always test `m ≠ n`; `board[nr][nc]` after checking only one bound reads the wrong (or crashes).

---

## 8. Java / C++ Implementation Gotchas

| Language | Gotcha |
|---|---|
| Java | A `HashMap<Character, TrieNode>` autoboxes every key. `'a'–'z'` are covered by `Character`'s internal cache so no allocation occurs, but you still pay hashing per step; prefer `TrieNode[] next = new TrieNode[26]` indexed by `ch - 'a'`. Caveat: with up to ~3·10^5 nodes, 26-slot reference arrays cost ≈ 26 × 8 B × 3·10^5 ≈ 62 MB worst case — prune nodes or fall back to per-node `HashMap` if memory-tight. |
| Java | If you use a `HashSet` for visited instead of board mutation, you must call `remove()` on backtrack — forgetting it converts backtracking into flood fill and silently loses answers. |
| C++ | If you prune children (`children.erase(ch)`), own them properly: `unordered_map<char, unique_ptr<Node>>` prevents leaks; raw `new` with erase-only leaks up to ~3·10^5 nodes. A leak-free alternative: never delete, just null the pointer / skip null children. |
| C++ | Pass the board as `vector<vector<char>>&` (by reference); by value copies the whole board. Mutate-and-restore works identically to Python. |
| Both | No overflow risk here — indices ≤ 144 and node counts ≤ 3·10^5 fit trivially in 32-bit `int`. |

Python-specific notes already baked into the code above: `__slots__` on trie nodes (avoids a per-instance `dict`), and recursion depth ≤ ~11 so no `sys.setrecursionlimit` needed.

---

## 9. Test Cases to Propose Out Loud

Propose these *before* coding — it signals you understand the edge space:

| # | Input | Expected | What it catches |
|---|---|---|---|
| 1 | Example 1 (board above), `["oath","pea","eat","rain"]` | `{"oath","eat"}` (any order) | Official; order-independence |
| 2 | `[["a","b"],["c","d"]]`, `["abcb"]` | `[]` | Official; no-reuse + dead-end unwind |
| 3 | `[["a"]]`, `["a"]` / `["b"]` | `["a"]` / `[]` | 1×1 board; single-letter words |
| 4 | `[["a","b"],["b","a"]]`, `["aba"]` | `["aba"]` **once** | Two distinct paths spell it — dedupe-at-harvest bug would print it twice |
| 5 | `[["o","a","t"]]`, `["oa","oat"]` | `["oa","oat"]` | Word that is a prefix of another word; returning early after a match loses `"oat"` |
| 6 | `[["a","b"]]`, `["aba"]` | `[]` | Would require reusing the `'a'` — verifies the no-reuse marker |
| 7 | 12×12 all-`'a'` board, `["aaaaaaaaaa"]` plus 3·10^4 words incl. unmatched ones | correct set, fast | Stress: exponential path count tamed by trie depth 10 + pruning |
| 8 | 1×2 board, a 3-letter word | `[]` | Word longer than any possible path |

---

## 10. Transferable Patterns & Related Problems

**Meta-patterns this problem teaches:**

- **Index the needles, prune the haystack.** When many patterns must be matched inside a large search space, put the patterns in a trie so the search prunes by prefix. The linear-text counterpart is Aho–Corasick.
- **Backtracking = commit → recurse → rollback**, with rollback placed after *all* recursion and after *all* early returns.
- **Dedupe at the point of discovery**, not at the end, when multiple search paths can reach the same answer.

| Related problem | What transfers |
|---|---|
| LC 79 Word Search I | The per-word path DFS + mark/restore — this problem is "Word Search I × a dictionary" |
| LC 208 Implement Trie / LC 211 Add & Search Word | Trie mechanics, terminal markers |
| LC 421 Maximum XOR of Two Numbers | Same idea, bits instead of letters: trie over one side to prune pairwise search |
| LC 1268 Search Suggestions System | Trie + prefix queries |
| LC 720 Longest Word in Dictionary | Building answers along trie paths |
| LC 200 Number of Islands / LC 130 Surrounded Regions | Grid-DFS discipline (bounds, mark, directions) — but *no* unmark there; contrast is instructive |
| N-Queens / Sudoku Solver / Combination Sum | Same commit/rollback template at depth |

---

## 11. Say It in 60 Seconds

> "Word Search Two: return every dictionary word that's traceable as a path on the grid — four-directional moves, no cell reused within a word. Brute force is Word Search One per word; thirty thousand words times a full board scan each is around ten-to-the-eleventh steps, so no. The insight is that words share prefixes — so build a trie of the dictionary once, linear in total characters. Then run a single backtracking DFS from every cell, walking the trie as I walk the board: at each step, one lookup of the cell's letter among the current node's children, and a miss prunes the whole subtree — that check is what tames the exponential. When I reach a node with its word set, I harvest it and clear it, so the same word found via a different cell path can't be reported twice. I mark visited cells by writing '#', and restore after the neighbor loop — my only early return happens before the mark, so unmark always runs. Optional: delete exhausted trie nodes, and stop early once the root empties. Build is O of total characters; search is O of cells times three-to-the-L worst case, usually far less; space O of total characters plus recursion depth ten."
