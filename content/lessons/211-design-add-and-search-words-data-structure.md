# Design Add and Search Words Data Structure (LeetCode 211)

## 1. Problem in your own words

Build a class that stores words and answers wildcard lookups:

- `addWord(word)` — store a lowercase word (length 1–25). No return value.
- `search(word)` — return `True` iff **at least one stored word** matches the pattern exactly. A `.` in the pattern matches **exactly one** lowercase letter (it is not regex `*` — it never matches zero characters, and it never changes length).

Restate these facts out loud in the interview, because they drive everything:

- **Dots only appear in `search`, never in `addWord`.** Stored words are plain lowercase strings.
- **Length equality is mandatory.** `search("ba.")` must *not* match a stored `"ba"` — a dot consumes one position.
- **Semantics are boolean.** We need *any* match, not all matches, not counts. So duplicate `addWord` calls are harmless and can be merged silently.
- There is no `delete`, no iteration, no prefix-only query (`startsWith`) — don't build machinery you won't use.

**Clarifying questions worth asking (fast, then move on):**
1. "Can `.` appear in `addWord` input?" — No per constraints, but asking shows you read the spec.
2. "`.` matches exactly one character, so pattern length must equal the stored word's length — correct?" — Yes.
3. "Can the same word be added twice?" — Yes; irrelevant for boolean search.

---

## 2. Decoding the constraints

| Constraint | What it tells you about the design |
|---|---|
| `word.length ≤ 25` | Trie depth ≤ 25. Recursion is safe (max depth 25). Every operation touches ≤ 25 characters. |
| `addWord` is lowercase only | Branching factor ≤ 26 per node. No need to handle stored wildcards. |
| `search` has **at most 2 dots** | Wildcard DFS branches ≤ 26² = **676** root-to-node paths per query — tiny. Also unlocks a "just enumerate substitutions" alternative (§5.5). |
| At most 10⁴ calls total | Worst case for a linear scan: split evenly → 5×10³ adds, 5×10³ searches × 5×10³ words × 25 chars ≈ **6.25×10⁸ character comparisons**. Too slow in Python; the trie exists to avoid exactly this. |

---

## 3. Baseline: brute force (store a list, scan with wildcard compare)

```python
class WordDictionary:
    def __init__(self):
        self.words = []

    def addWord(self, word: str) -> None:
        self.words.append(word)                 # O(L); duplicates kept, harmless

    def search(self, word: str) -> bool:
        n = len(word)
        for w in self.words:                    # up to N candidates
            if len(w) != n:                     # O(1) filter: '.' matches exactly 1 char
                continue
            if all(c == '.' or c == wc for c, wc in zip(word, w)):
                return True                     # early exit on first match
        return False
```

The `zip` pairs characters **by index** and compares **values**; `.` is a pattern value meaning "any value at this index."

**Worked trace on the official example** (list = `["bad","dad","mad"]` after three adds):

| Call | Candidates examined | Comparison detail | Result |
|---|---|---|---|
| `addWord("bad")` / `("dad")` / `("mad")` | — | list grows to `["bad","dad","mad"]` | `null` |
| `search("pad")` | `"bad"`, `"dad"`, `"mad"` | `p≠b`; `p≠d`; `p≠m` | `false` |
| `search("bad")` | `"bad"` | `b=b`, `a=a`, `d=d` | `true` |
| `search(".ad")` | `"bad"` | `.`~`b`, `a=a`, `d=d` → stop early | `true` |
| `search("b..")` | `"bad"` | `b=b`, `.`~`a`, `.`~`d` | `true` |

**Verdict:** `addWord` O(L); `search` **O(N·L)** time (each of N stored words needs ≤ L value comparisons after the O(1) length filter). Correct, but the §2 arithmetic (≈6×10⁸ comparisons) says we need something sublinear in N.

A quick middle step many candidates mention: **bucket words by length** (`defaultdict(list)` keyed by `len`). That shrinks candidates to words of the pattern's length, but a search is still O(N_L·L) where N_L is that bucket's size — same worst case when all words share a length. It's a fine thing to say, then move past.

---

## 4. The core insight

Three observations, each worth saying explicitly:

1. **Matching is positional and prefix-driven.** Every literal character pins you to exactly one next state. That is precisely what a **trie** encodes: shared prefixes are stored once, and a query only walks the part of the trie it actually matches. Work becomes proportional to *matching trie content*, not to the number of words N.
2. **A dot is a deferred decision.** "Match any letter" = "branch over all children." That's a tiny DFS/backtracking over the trie. With ≤ 2 dots, the branching is ≤ 26² = 676 paths — the constraint caps the fan-out explosion.
3. **"A word ends here" must be stored explicitly.** The path root→b→a exists in a trie containing `"band"`, but `"ba"` is not a word. The `is_end` flag at terminal nodes is what separates *prefix coincidences* from *real matches*, and it also enforces the length-equality rule for free: a pattern of length L can only succeed at depth L.

---

## 5. Optimal solution: trie + wildcard DFS

### 5.1 Design

- Each node: `children` — a dict mapping **character value → child node** — plus `is_end: bool` (a per-node **value/flag**, not an index).
- `addWord`: walk/create one child per character, set `is_end` on the last node. Idempotent for duplicates.
- `search`: DFS with state `(i, node)` where **`i` is an index into the pattern** and `node` is the trie node at depth `i`. **Invariant: `node`'s depth always equals `i`** (each recursive step consumes one pattern character and descends one edge). Success = consumed the whole pattern *and* `node.is_end`.

### 5.2 Code (Python)

```python
class TrieNode:
    __slots__ = ("children", "is_end")          # ~2.5e5 nodes possible; keep them lean

    def __init__(self):
        self.children = {}                      # char value -> TrieNode
        self.is_end = False                     # a stored word terminates at this node


class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:       # O(L) time, <= L new nodes
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True                      # unconditional: duplicates stay marked

    def search(self, word: str) -> bool:
        def dfs(i: int, node: TrieNode) -> bool:
            # Invariant: node sits at trie depth i, i.e., path spells word[:i]
            if i == len(word):                  # terminal check BEFORE reading word[i]
                return node.is_end              # prefix hits must NOT count
            ch = word[i]
            if ch == '.':
                # fan out; any() short-circuits on first success
                return any(dfs(i + 1, child) for child in node.children.values())
            child = node.children.get(ch)       # .get, not [ ]: absent char -> fail fast
            return child is not None and dfs(i + 1, child)

        return dfs(0, self.root)
```

Two refinements to have ready:

- **Recurse only at dots.** Walk literal runs with a loop inside one frame; recursion depth then equals the number of dots (≤ 3 frames here) instead of ≤ 25:

```python
def search(self, word: str) -> bool:
    def dfs(i: int, node: TrieNode) -> bool:
        for j in range(i, len(word)):
            ch = word[j]
            if ch == '.':
                return any(dfs(j + 1, child) for child in node.children.values())
            node = node.children.get(ch)
            if node is None:
                return False
        return node.is_end
    return dfs(0, self.root)
```

- **Iterative DFS** (same state tuples on an explicit stack) if the interviewer probes recursion limits — at depth ≤ 25 it's unnecessary, but knowing the transform is a bonus point.

### 5.3 What to say while coding (full talk track)

> "A list scan is O(N·L) per query — around 6×10⁸ character comparisons in the worst case here, too slow. Matching only ever extends a matched prefix by one character, so I'll store words in a trie to share prefixes. `addWord` walks one child per character — 25 steps max — and flags the last node as end-of-word; that's O(L). `search` is a DFS carrying the pattern index and the current node; the invariant is that the node's depth equals the index, so the path spelled so far is exactly `pattern[:i]`. A literal character follows one child or fails immediately; a dot fans out over all children, and `any()` short-circuits on the first success. I only return true when the index reaches the pattern length **and** the node is flagged end-of-word — that flag is what stops `"ba"` from matching a stored `"band"`. Since queries have at most two dots, the fan-out is at most 26² = 676 paths of ≤ 25 steps, so each search is a few thousand node visits worst case. The same code stays correct for any number of dots, bounded by the total trie size."

### 5.4 Traces on the official example

Trie after `addWord("bad")`, `addWord("dad")`, `addWord("mad")` (`*` = `is_end`):

```
(root)
 ├── b ── a ── d*
 ├── d ── a ── d*
 └── m ── a ── d*
```

**`search("pad")` → false**

| Step | `i` | Node | Char | Action |
|---|---|---|---|---|
| 1 | 0 | root | `p` | literal; `p ∉ {b,d,m}` → return `false` (1 node visit) |

**`search("bad")` → true**

| Step | `i` | Node | Char | Action |
|---|---|---|---|---|
| 1 | 0 | root | `b` | descend to `b` |
| 2 | 1 | `b` | `a` | descend to `b→a` |
| 3 | 2 | `b→a` | `d` | descend to `b→a→d` |
| 4 | 3 | `b→a→d` | — | `i == len` and `is_end=True` → `true` |

**`search(".ad")` → true**

| Step | `i` | Node | Char | Action |
|---|---|---|---|---|
| 1 | 0 | root | `.` | fan out over `{b, d, m}` |
| 2 | 1 | `b` | `a` | descend |
| 3 | 2 | `b→a` | `d` | descend |
| 4 | 3 | `b→a→d` | — | `is_end=True` → `true`; the `d`/`m` branches are never explored (short-circuit) |

**`search("b..")` → true**

| Step | `i` | Node | Char | Action |
|---|---|---|---|---|
| 1 | 0 | root | `b` | descend to `b` |
| 2 | 1 | `b` | `.` | fan out over `{a}` |
| 3 | 2 | `b→a` | `.` | fan out over `{d}` |
| 4 | 3 | `b→a→d` | — | `is_end=True` → `true` |

Note how both dots in `"b.."` each branched over exactly one child — branching width is *the node's* child count, not always 26.

### 5.5 A constraint-exploiting alternative (mention for bonus credit)

Because `search` has ≤ 2 dots, you can also keep a plain **set** and enumerate all 26ᵈ concrete substitutions of the dot positions (≤ 676 candidates), probing the set for each. Each dot independently takes ≤ 26 letters, so there are ≤ 26ᵈ instantiations — hence O(26ᵈ·L) per search, same asymptotics as the trie DFS here. Trade-off to state: this degrades to 26^L if dots were unconstrained, while the trie stays bounded by `min(26^d·L, trie size)`. Pitching this shows you exploit constraints rather than memorize one template.

---

## 6. Complexity

Let N = number of `addWord` calls, L = max word length (25), d = dots in a search pattern (≤ 2), V = number of trie nodes (≤ N·L + 1 ≈ 2.5×10⁵ worst case; shared prefixes shrink it).

| Approach / operation | Time | Space |
|---|---|---|
| Brute-force list, `search` | O(N·L) per search — each of N words needs ≤ L comparisons after an O(1) length filter | O(N·L) |
| Length buckets, `search` | O(N_L·L) per search (N_L = words of that length) | O(N·L) |
| Hash set + 26ᵈ substitutions | O(26ᵈ·L) per search | O(N·L) |
| **Trie: `addWord`** | **O(L)** — one dict step per character | ≤ L new nodes per call |
| **Trie: `search`, no dots** | **O(L)** — single path | — |
| **Trie: `search`, d dots** | **O(min(26ᵈ·L, V))** — with d ≤ 2 that's ≤ 676 × 25 ≈ **1.7×10⁴ node visits** | — |
| **Trie: total structure** | — | **O(V)** nodes, each holding a ≤ 26-entry dict |

**Why the two bounds:** (a) any visited node at depth k corresponds to a distinct instantiation of the dots within `pattern[:k]`, and there are ≤ 26ᵈ such instantiations since each of d dots independently takes ≤ 26 values — so ≤ 26ᵈ visited nodes per depth × L depths; (b) since node depth always equals `i`, each trie node is visited at most once per search — hence the V bound. `addWord` is also optimal at Θ(L): any correct implementation must read every character of the word at least once.

---

## 7. Common mistakes and debugging checklist

| # | Mistake | Failing behavior | Fix |
|---|---|---|---|
| 1 | Returning `True` when the pattern is exhausted without checking `is_end` | `add("band")`; `search("ban")` → wrongly `true` | Terminal depth must return `node.is_end` |
| 2 | Brute force without the length check | `search("ba.")` matches stored `"ba"` (dot silently matching "zero" chars) | Compare `len` first; `.` matches exactly one position |
| 3 | Indexing `word[i]` before the `i == len(word)` check | `IndexError` / checking `is_end` on the wrong node | Terminal check first |
| 4 | Using `defaultdict(TrieNode)` and *reading* `node.children[ch]` during search | Phantom children get created on lookups → memory bloat and misleading trie state while debugging | Read with `.get` / `in`; create only in `addWord` via `setdefault`/explicit insert |
| 5 | Toggling the end flag on duplicate adds (`is_end = not is_end`) | `add("bad")` twice "erases" the word | Set `is_end = True` unconditionally |
| 6 | Continuing the search after finding a match (manual loop without `break`/`any`) | Correct but wasteful fan-out | Use `any(...)` generator — it short-circuits |
| 7 | Assuming `search` must match *some* stored word of *some* length | Off-by-length patterns ("`....`" vs stored `"cat"`) behave inconsistently | Path depth == pattern length is structural; a too-short/too-long pattern simply fails |
| 8 | Copying/building candidate strings inside DFS | Extra O(L) allocation per branch | Walk the trie; never materialize candidates |

Duplicates/precision recap: the trie merges duplicate `addWord` calls structurally (same path, same terminal node); if the API ever needed multiset counts, store a counter at terminal nodes instead of a boolean.

---

## 8. Implementation gotchas in Java and C++

| Language | Gotcha | Note |
|---|---|---|
| Java | `HashMap<Character, TrieNode>` autoboxes every char and adds pointer chasing | Prefer `TrieNode[] children = new TrieNode[26];` indexed by `c - 'a'`; guard `children[c] != null` before descending |
| Java | `map.get(ch)` returns `null` for absent keys → NPE if unguarded | Use `containsKey`/`getOrDefault`, or iterate `map.values()` only on a non-null map |
| C++ | Raw `new TrieNode()` with no ownership plan leaks | Use `std::unique_ptr<TrieNode>` per child slot, or a `std::vector<Node>` pool with `int` indices (cache-friendly, trivially safe) |
| C++ | Recursing with node references is fine at depth ≤ 25, but don't return references to stack-local nodes | Return `bool`; pass `Node*` or `Node&` downward only |

Python-specific micro-notes: `__slots__` on the node class, and read with `.get`/`in` while writing with `setdefault` (see mistake #4).

---

## 9. Test cases to propose out loud

State these *before* coding (it signals design maturity), then re-run them after:

| # | Calls | Expected | What it guards |
|---|---|---|---|
| 1 | Official example: adds `bad/dad/mad`; searches `pad`, `bad`, `.ad`, `b..` | `false, true, true, true` | Baseline, incl. 1-dot and 2-dot queries |
| 2 | `search("a")` before any add | `false` | Empty trie (root `is_end=False`, empty children) |
| 3 | `add("band")`; `search("ban")`; `search("bans")`; `search("band")` | `false, false, true` | The `is_end` prefix trap — the #1 bug |
| 4 | `add("ba")`; `search("b.")`; `search("ba.")`; `search("ba")` | `true, false, true` | Dot matches exactly one char; a 3-length pattern can't match a 2-length word |
| 5 | `add("cat")`; `search("...")`; `search("....")`; `search("..")` | `true, false, false` | All-dot patterns; length equality still enforced |
| 6 | `add("bid")`, `add("bud")`; `search("b.d")`; `search(".i.")`; `search("b.x")` | `true, true, false` | Real fan-out branching; literal beats dot when both could match |
| 7 | `add("bad")` twice; `search("bad")` | `true` | Duplicate adds are idempotent |
| 8 | `add` a 25-char word; `search` it with dots at both ends | `true` | Max-length words, dots at first/last index |

---

## 10. Transferable patterns and related problems

**Patterns to carry forward:**

- **Trie + backtracking template:** any "match a pattern character-by-character against a dictionary" question. Literal → single child; wildcard class → fan out over children; accept only at terminal-flagged nodes.
- **Fan-out is bounded by wildcard count**, not by dictionary size — the whole point of the structure. Whenever a constraint caps the number of wildcards/choices, say the bound out loud (here 26² × depth).
- **Terminal flags encode set membership in a prefix tree** — same trick answers "is it a word?" vs "is it a prefix?"
- **Exploit tight constraints to unlock simpler solutions** (§5.5) — interviewers love hearing the trade-off, not just the canonical answer.

| Related problem | Relationship to this one |
|---|---|
| LC 208 — Implement Trie | This problem minus wildcards; learn it first |
| LC 212 — Word Search II | Trie + DFS on a grid; same fan-out idea, worse branching |
| LC 642 — Design Search Autocomplete System | Trie + top-k over typed prefixes |
| LC 648 — Replace Words | Trie prefix matching, replacement instead of search |
| LC 676 — Implement Magic Dictionary | Same storage; "exactly one character differs" instead of dots |
| LC 720 — Longest Word in Dictionary | Buildability check over trie paths |
| LC 745 — Word Filter (premium) | Trie over `suffix#prefix` pairs |
| LC 1032 — Stream of Characters | Streaming queries against a *reversed* trie |
| LC 677 — Map Sum Pairs | Trie carrying summed values at nodes |
| LC 10 — Regular Expression Matching | When wildcards include `*` (unbounded repetition), DFS alone explodes — switch to DP; good contrast to cite |

---

## 11. Say it in 60 seconds

> "Search patterns can contain dots that each match exactly one letter, and dots only appear in queries — stored words are plain lowercase. Scanning a list costs O(N·L) per query, up to around 6×10⁸ character comparisons under these limits, so I'll use a trie to share prefixes: `addWord` walks one child per character and flags the last node as end-of-word — 25 steps max. `search` is a DFS carrying the pattern index and current node; a literal character follows exactly one child, a dot fans out over all children, and I return true only if I consume the whole pattern at a node marked end-of-word — that flag is what stops `'ba'` from matching a stored `'band'`. Since queries have at most two dots, the fan-out is at most 26 squared paths times 25 depth, so a search is a few thousand node visits worst case — effectively constant — and the code stays correct for any number of dots, bounded by trie size. Net: O(L) per add, O(26^d · L) per search, O(total inserted characters) space. I verified the edge cases: empty trie, prefix patterns like `'ban'` vs `'band'`, all-dot patterns, and duplicate adds."

That's the whole solution: trie for shared prefixes, DFS for dots, `is_end` for truth.
