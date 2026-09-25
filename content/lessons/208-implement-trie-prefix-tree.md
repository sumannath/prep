# Implement Trie (Prefix Tree) — Complete Lesson

---

## 1. Restating the problem (and the trap hiding in it)

You're asked to build a **string-set container** with three operations:

| Method | Semantics |
|---|---|
| `insert(word)` | Add `word` to the set. |
| `search(word)` | `True` **iff this exact string was previously inserted.** |
| `startsWith(prefix)` | `True` **iff at least one inserted string begins with `prefix`.** |

Two precision points that decide whether your solution is correct:

- **`search` ≠ `startsWith`.** After inserting only `"apple"`, `search("app")` must be `False` even though the characters `a-p-p` are all "in" the structure. `startsWith("app")` must be `True`. The *entire* difference between the two queries lives in one bit at the terminal node.
- **A word is its own prefix.** After `insert("app")`, `startsWith("app")` is `True` — "there is a previously inserted word that has the prefix `app`" is satisfied by `"app"` itself.
- **Duplicates:** this is a *set*, not a multiset. `insert("apple")` twice is idempotent — no new structure, still searchable. (If counts were required, that's LeetCode 1804; see §9.)

The official example encodes exactly this asymmetry:

```
insert("apple") → search("apple")=True → search("app")=False
                → startsWith("app")=True → insert("app") → search("app")=True
```

---

## 2. Decoding the constraints

| Constraint | What it actually tells you |
|---|---|
| `1 <= word.length, prefix.length <= 2000` | Per-call work **linear in one string's length** is the intended target. Also: a *recursive* implementation can recurse 2000 deep — **Python's default recursion limit is 1000**, so write iterative loops. No empty strings in official tests, but know your code's behavior on `""` anyway (see §9). |
| Lowercase English letters only | Alphabet size is fixed at 26 → a fixed-size children array is possible; a dict keyed by the character *value* is also fine; sentinel keys like `"#"` cannot collide with input. |
| ≤ 3·10⁴ total calls | Worst-case total characters processed ≈ 3·10⁴ × 2000 = **6·10⁷**. Any O(L)-per-call solution fits easily (C++/Java comfortably; Python passes on real test data, which doesn't max every parameter simultaneously). Anything that **rescans all stored words per call** can cost ~10¹² character comparisons — dead. |
| Output row `[null, null, true, ...]` | Driver artifact: `void`/`None` methods log `null`; only the booleans are judged. |

---

## 3. Brute force: a hash set of words (with a worked trace)

The obvious container is a hash set of the inserted strings.

```python
class Trie:
    def __init__(self):
        self.words = set()

    def insert(self, word: str) -> None:
        self.words.add(word)            # O(L): a string's hash mixes all L characters,
                                        # so any set/dict op on a length-L key costs Θ(L)

    def search(self, word: str) -> bool:
        return word in self.words       # O(L)

    def startsWith(self, prefix: str) -> bool:
        return any(w.startswith(prefix) for w in self.words)   # O(W · L)  ← the killer
```

**Worked trace on the official example** (brute force gives correct answers):

| Step | Call | Set after | Result | Why |
|---|---|---|---|---|
| 1 | `Trie()` | `{}` | — | |
| 2 | `insert("apple")` | `{"apple"}` | null | |
| 3 | `search("apple")` | `{"apple"}` | **True** | exact membership |
| 4 | `search("app")` | `{"apple"}` | **False** | `"app"` not stored |
| 5 | `startsWith("app")` | `{"apple"}` | **True** | scan: `"apple"` starts with `"app"` |
| 6 | `insert("app")` | `{"apple","app"}` | null | |
| 7 | `search("app")` | `{"apple","app"}` | **True** | |

**Cost analysis.** `insert`/`search` are O(L). But `startsWith` must examine *every* stored word: with W ≤ 3·10⁴ words, L ≤ 2000, and up to 3·10⁴ calls, the worst case is ≈ 3·10⁴ × 3·10⁴ × 2000 ≈ **1.8·10¹²** prefix comparisons. Too slow.

**Two "salvages" and why they don't save you here:**

- **Keep a second set of all prefixes.** `insert("apple")` also adds `"a", "ap", "app", "appl", "apple"` to a prefix set → `startsWith` becomes an O(L) lookup. But each insert writes/hashes Σₖ₌₁..L k ≈ L²/2 characters — a *single* 2000-char word stores ~2·10⁶ characters of prefixes; 3·10⁴ such words → ~10¹⁰+. Memory dies, and insert itself costs O(L²).
- **Aside (interview flex):** with words in a *sorted* array, the words matching prefix `p` are exactly those in the half-open range `[p, p + "{")` — any string ≥ `p` but < `p+"{"` must start with `p`, because a string that diverges from `p` with a smaller character is < `p`, and one diverging with a larger character is > `p+"{"`. So `startsWith(p) ⟺ bisect_left(words, p) < bisect_left(words, p + "{")`. Careful: the *naive* "check the single word at `bisect_left(p)`" is wrong — e.g. `words = ["apo", "appz"]`, `p = "app"` lands on `"apo"`. Python list insertion is O(W) shifting, so this needs a balanced structure anyway. Neat trivia; the trie is what the interviewer wants.

---

## 4. The core insight

> **Stored strings share prefixes — so store the prefixes, not the strings.**

- Make each **edge** carry one character; then every **node** represents the prefix spelled on the path from the root. A word is stored by *creating/visiting the path* and marking the final node.
- Shared prefixes (`"apple"`, `"app"` → first 3 edges) are stored **once**.
- All three operations collapse into one primitive: **walk the query string from the root.**
  - Walk fails (missing edge) → `search` and `startsWith` both return `False`.
  - Walk succeeds → `startsWith` returns `True`; `search` additionally requires the terminal node to be flagged `is_end`.

**Why O(L) per query is optimal:** any correct `search`/`startsWith` must read every character of the query — an algorithm that skips some character can't distinguish two inputs differing only there (e.g., `"apple"` vs `"applx"` after `insert("apple")` demand different answers), so an adversary can always force Θ(L) reads.

---

## 5. Optimal approach: the trie

### 5.1 Design

Each node holds:

- `children`: map from **character value** → child node (dict in Python; fixed array of 26 in C++/Java).
- `is_end`: `True` iff some inserted word ends **exactly at this node**.

The root represents the empty prefix `""` and is never flagged (unless `""` itself is insertable — see §9). Invariant worth saying aloud: **a node at depth d represents the prefix of length d; its `is_end` bit says "some inserted word ends here."**

### 5.2 Primary implementation (Python, iterative)

```python
class TrieNode:
    __slots__ = ("children", "is_end")

    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}   # char VALUE -> child node
        self.is_end = False                          # some inserted word ends exactly here


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()                       # represents the empty prefix ""

    def insert(self, word: str) -> None:
        cur = self.root
        for ch in word:                              # iterate character VALUES, no indices needed
            nxt = cur.children.get(ch)
            if nxt is None:                          # edge missing -> create child and ATTACH it...
                nxt = TrieNode()
                cur.children[ch] = nxt
            cur = nxt                                # ...then step into the STORED child
        cur.is_end = True                            # flag the node reached after ALL characters

    def _walk(self, s: str) -> "TrieNode | None":
        """Follow s from the root; return final node, or None on first missing edge."""
        cur = self.root
        for ch in s:
            cur = cur.children.get(ch)
            if cur is None:
                return None
        return cur                                   # for s == "" this is the root

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_end      # path exists AND word-end flagged

    def startsWith(self, prefix: str) -> bool:
        return self._walk(prefix) is not None        # path existence ONLY — ignore is_end
```

Note the deliberate `node is not None and node.is_end` rather than `node and node.is_end` — the latter returns `None` (not `False`) on a failed walk, which works by accident but is sloppy.

### 5.3 Compact variant: dict-as-node

```python
class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["#"] = True          # sentinel: '#' is not a lowercase letter -> no collision

    def _find(self, s: str):
        node = self.root
        for ch in s:
            if ch not in node:
                return None
            node = node[ch]
        return node

    def search(self, word: str) -> bool:
        node = self._find(word)
        return node is not None and "#" in node

    def startsWith(self, prefix: str) -> bool:
        return self._find(prefix) is not None
```

⚠️ Do **not** make `_find` use a `defaultdict` shared with `insert` — reads would *create* nodes, making `startsWith` return `True` for prefixes that were never inserted (even on an empty trie).

### 5.4 Array-of-26 variant (sketch)

```python
class TrieNode:
    __slots__ = ("kids", "is_end")
    def __init__(self):
        self.kids = [None] * 26          # INDEX = ord(ch) - 97, derived from the char VALUE;
        self.is_end = False              # each cell stores a node reference, never a character
```

Trade-off: 26 slots per node regardless of branching (wasteful for sparse tries) vs. per-step hashing in the dict version. In C++/Java the flat array is the standard choice; in Python, dicts usually win in practice for sparse tries.

### 5.5 Structure after the official example

```
root
 └─ a
     └─ p
         └─ p   ← is_end = True   (set by insert("app"))
             └─ l
                 └─ e   ← is_end = True   (set by insert("apple"))
```

Label the nodes `n1(a), n2(p), n3(p), n4(l), n5(e)` and trace every call:

| Call | Path visited | Terminal node | Flag action | Output |
|---|---|---|---|---|
| `insert("apple")` | root→n1→n2→n3→n4→n5 (all 5 created) | n5 | n5.is_end := True | null |
| `search("apple")` | root→n1→n2→n3→n4→n5 | n5 | read: True | **True** |
| `search("app")` | root→n1→n2→n3 | n3 | read: **False** | **False** ← path exists, flag doesn't |
| `startsWith("app")` | root→n1→n2→n3 | n3 | ignored | **True** ← existence is enough |
| `insert("app")` | root→n1→n2→n3 (**0 new nodes**) | n3 | n3.is_end := True | null |
| `search("app")` | root→n1→n2→n3 | n3 | read: True | **True** |

Two things to point out while tracing: the second insert creates **no** nodes (pure prefix reuse), and the only difference between `search("app")` before and after is **one bit** at n3.

---

## 6. Complexity analysis

Let L = length of the query, W = number of stored words, C = total characters ever inserted (Σ word lengths), N = number of calls.

| Operation | Trie: time | Trie: extra space | Hash-set brute force |
|---|---|---|---|
| `insert(word)` | O(L) | O(L) worst case (new nodes); 0 if word/prefix already present | O(L) (hashing) |
| `search(word)` | O(L) | O(1) | O(L) |
| `startsWith(prefix)` | O(L) | O(1) | **O(W · L)** ← fatal |
| Total over all calls | O(C) ≤ O(N · L_max) ≈ 6·10⁷ char steps | one node per **distinct prefix** across inserted words | up to ~1.8·10¹² |

**Space.** Worst case (no shared prefixes) the trie has O(C) nodes — up to 6·10⁷ under these limits, which is the theoretical bound; real test data shares prefixes heavily and is far smaller. If memory ever matters, a **compressed (radix/Patricia) trie** squeezes non-branching chains into single edges, giving O(K) nodes for K stored strings — every internal node then has ≥ 2 children, and a tree with K leaves has at most K−1 branching internal nodes.

---

## 6.5 Common mistakes

| # | Mistake | Symptom | Fix |
|---|---|---|---|
| 1 | `search` returns `True` whenever the path exists | `search("app")` → `True` after only `insert("apple")` | `search` must **also** read `is_end` at the terminal node |
| 2 | `startsWith` returns the terminal `is_end` | `startsWith("ap")` → `False` although `"app"` is stored | `startsWith` **ignores** `is_end` entirely |
| 3 | Attach-then-orphan bug: create child, then `cur = TrieNode()` instead of `cur = cur.children[ch]` | Every `search` returns `False`; flags land on disconnected nodes | Always descend into the **stored** child |
| 4 | Forgetting `is_end = True` after the insert loop | Walks succeed but every `search` is `False` | Flag `cur` immediately after the loop ends |
| 5 | Flag placed one node early / using stale `cur` | Off-by-one words ("ap" flagged when "app" inserted) | The node at **depth L** (root = depth 0) is the full-word node |
| 6 | Recursive insert/search in Python | `RecursionError` — words can be 2000 chars, default limit is 1000 | Iterative loop |
| 7 | `defaultdict` shared between insert and read paths | `startsWith` returns `True` for prefixes never inserted (reads mutate!) | Reads use non-mutating lookup (`.get` / `in`) |
| 8 | `return node and node.is_end` | Returns `None` (not `False`) on failed walk — works by luck | `node is not None and node.is_end` |
| 9 | Array variant: `kids[ord(ch)]` or size 25 | `IndexError` on late-alphabet letters / silent corruption | Index = `ord(ch) - ord('a')`, size **26**; cell *values* are node references, never characters |
| 10 | Duplicates mishandled | Assuming re-`insert` corrupts state, or inventing count semantics | Set semantics: idempotent. Need counts? Add per-node counters (LC 1804) |

**Language gotchas (beyond Python):**

| Language | Gotcha | Fix / note |
|---|---|---|
| Java | `HashMap<Character, TrieNode>` per node | Keys autobox (ASCII letters 97–122 hit the `Character` cache, but you still pay hashing per step); `TrieNode[26]` + `c - 'a'` is faster. Remember array slots start as `null` — null-check before descending; fields like `boolean isEnd` default to `false` safely. |
| C++ | Storing `TrieNode` **by value** in `std::unordered_map<char, TrieNode>` and keeping `&children[c]` | Rehashing moves elements → dangling references. Use `std::unordered_map<char, std::unique_ptr<TrieNode>>`, or a flat `std::vector<TrieNode>` pool with `int` child indices (stable, cache-friendly). `std::map` happens to keep element addresses stable, but relying on that is fragile style. |
| C++ | Raw `new TrieNode()` per child | Leaks on teardown; fine for LeetCode, not for an interview follow-up about ownership — mention the pool / smart-pointer option proactively. |

---

## 7. Test cases to propose out loud

Say these **before coding** (they pin down the design), then run them after:

| # | Test | Expected | What it verifies |
|---|---|---|---|
| 1 | **Official example** (full 7-call sequence) | `[null, null, true, false, true, null, true]` | End-to-end, incl. the search/startsWith asymmetry |
| 2 | `insert("apple"); insert("apple"); search("apple")` | `True` | Duplicate insert is idempotent; structure unchanged |
| 3 | `insert("apple"); search("app")` / `startsWith("app")` | `False` / `True` | The `is_end` bit vs. path existence — **the crux** |
| 4 | `insert("app"); search("apple")` / `startsWith("apple")` | `False` / `False` | Query **longer** than anything stored: walk must fail at `'l'` |
| 5 | `insert("a"); search("a"); startsWith("a")` | `True` / `True` | Terminal flag at depth 1; single-character words |
| 6 | `insert("apple"); startsWith("x")` | `False` | Disjoint first letter → immediate `False` at the root |
| 7 | (out of contract, but know it) `search("")` / `startsWith("")` | root's flag / **always `True`** | `_walk("")` returns the root; constraints guarantee length ≥ 1, so just state your code's behavior |

Proposing #2, #3, and #4 out loud *before* coding signals to the interviewer that you understand exactly what the `is_end` flag is for.

---

## 8. Transferable patterns and related problems

**Reusable patterns:**

1. **Walk + terminal semantics.** One traversal primitive; the *terminal check* (existence vs. `is_end` vs. counters) encodes the query type. This exact template solves 211 and 1804.
2. **Node augmentation.** The trie is a skeleton — hang per-node aggregates on it: word counts / pass-through counts (1804), frequency + top-k (642), subtree sums (677).
3. **Trie as a precompiled dictionary.** Inside DP or backtracking, replace "test membership of every candidate substring" with "walk only what exists in the dictionary" — this is how tries accelerate Word Break (139/140) and power Word Search II (212).
4. **The alphabet is a design parameter.** 26 letters → array/dict; **2 symbols (bits) → binary trie**, walked MSB-first for maximum-XOR problems (LC 421); arbitrary characters → dict.
5. **Memory scalinng.** Array-per-node vs. dict-per-node is a real trade-off; compressed tries when node count matters (justified in §6.5).

**Related problems:**

| LC | Problem | How it extends today's trie |
|---|---|---|
| 211 | Add & Search Words | Same trie; a `'.'` wildcard → try **all** children at that depth (DFS) |
| 212 | Word Search II | Trie seeded with the dictionary + grid backtracking; prune childless nodes |
| 1804 | Trie II | `is_end` → `end_count`, plus `pass_count`; duplicates and `delete()` become first-class |
| 642 | Autocomplete System | At the query node, return top-3 by (frequency, lex order) |
| 648 | Replace Words | For each sentence word, walk the trie to the shortest root that's a word |
| 677 | Map Sum Pairs | Per-node running sum updated incrementally on insert |
| 1268 | Search Suggestions | Sort products once; walk prefix, collect ≤ 3 suggestions per node |
| 14 | Longest Common Prefix | Vertical scanning, or trie depth until first branching/flagged node |
| 421 | Max XOR of Two Numbers | Binary trie over 32-bit ints; greedily take the opposite bit |
| 139/140 | Word Break I/II | Trie replaces hash-set membership probing in the inner loop |

**Likely follow-ups to rehearse:** `delete(word)` (decrement pass-counts, unlink a child when its pass-count hits 0 — or lazy cleanup); support counts/duplicates (LC 1804); wildcard search (LC 211); iterate stored words in sorted order (DFS visiting children `a`→`z` yields lexicographic order — the trie *is* a sorted structure); memory optimization (radix compression).

---

## 9. Full interview talk track

**Restate & clarify (≈30s).** "So I'm building a set-of-strings container. `search` asks: was this *exact* string inserted? `startsWith` asks: does *any* inserted string begin with this prefix? One subtlety — a word counts as its own prefix, so after inserting `'app'`, `startsWith('app')` is true. And I'll treat duplicates as set semantics: re-inserting is a no-op unless we need counts, which I can add with per-node counters."

**Brute force, then kill it (≈30s).** "Naively, a hash set: `insert` and `search` are O(L) because hashing reads all L characters. But `startsWith` forces a scan over every stored word — with 3·10⁴ words of length up to 2000 and 3·10⁴ calls, that's on the order of 10¹² character comparisons. The waste is that stored strings share prefixes and a hash set can't exploit that."

**Insight (≈30s).** "So store the *prefixes*, not the strings: characters become edges of a tree, every node represents the prefix spelled from the root, and shared prefixes are stored once. Then all three operations are the same primitive — walk the query string from the root. The only difference between the two queries is the terminal check."

**Design (≈30s).** "Each node has a children map — character to node — and an `is_end` boolean meaning 'some inserted word ends exactly here.' `insert` walks down, creating missing edges, then flags the last node. `search` walks and returns 'path exists AND flag set.' `startsWith` walks and returns just 'path exists.' I'll keep it iterative — words can be 2000 characters and Python's default recursion limit is 1000."

**Trace the example (≈45s).** "Insert `'apple'`: five new nodes, flag on `'e'`. `search('apple')`: walk succeeds, flag true → True. `search('app')`: walk succeeds but that node's flag is false → False — the path exists, the word doesn't. `startsWith('app')`: existence is all we need → True. Insert `'app'`: reuses all three nodes, zero allocations, flips the flag on the second `'p'`. Now `search('app')` is True."

**Complexity (≈20s).** "Every operation is O(length of the query) — and that's optimal, since any correct answer has to read the whole query. Space is one node per *distinct* prefix across inserted words — less than the sum of lengths whenever strings share prefixes."

**Tests & follow-ups (≈30s).** "Cases I'd check: duplicate inserts; searching a proper prefix of a stored word — must be False; a query longer than everything stored — must be False; single-character words; a prefix sharing no first letter. If you want `delete` or duplicates, I'd add pass-count and end-count per node."

---

## 10. Say it in 60 seconds

> "We need a string set with two queries: exact membership, and 'does anything start with this prefix?' A hash set handles exact lookup in O(L), but `startsWith` would scan every stored word — with thirty thousand words that's potentially a trillion comparisons. The insight: strings share prefixes, so store them as root-to-node paths in a tree — every node *is* a prefix, and shared prefixes are stored once. Each node keeps a children map and an `is_word` flag. Insert walks down, creating missing edges, then flags the last node. Search walks and returns *path exists AND flag set*. startsWith walks and returns just *path exists* — that one bit is the whole difference between the two queries. Everything is O(length of the input), which is optimal because you must read the input anyway; space is one node per distinct prefix, and duplicate inserts are natural no-ops. Two traps I'll avoid: don't return true from search just because the path exists, and keep the code iterative — 2000-character words blow Python's recursion limit."
