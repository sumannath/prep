# Alien Dictionary (LeetCode 269) — Complete Lesson

## 1. Problem Restatement

You're given a list of `words` that is **claimed** to be sorted lexicographically under some *unknown* ordering of the 26 lowercase letters. Your job has two outcomes:

- **Valid claim** → output *any* string containing all unique letters, ordered so that the claim holds.
- **Invalid claim** → return `""` (the observed word order is inconsistent with *every* possible letter ordering).

The input words are given to you as a **sequence** — their *arrangement* is the evidence. You never get to sort them; you must check they're already consistent with some total order, then recover one such order.

Key phrase decoding: "sorted lexicographically" means for every adjacent pair `words[i]`, `words[i+1]`, the first character where they differ must satisfy `words[i][d] < words[i+1][d]` in the alien order. If one word is a prefix of the other, the **shorter** one must come first (standard lexicographic convention).

## 2. Constraint Decoding (what the input size is really telling you)

| Constraint | What it implies |
|---|---|
| `1 <= words.length <= 100` | Very few words → **at most 99 adjacent comparisons** to extract constraints. |
| `1 <= words[i].length <= 100` | Total characters `C ≤ 10,000`. Scanning everything is trivially fast. |
| Only lowercase letters | The "graph" has **at most 26 nodes** and **at most 26 × 25 = 650 edges** (one edge per ordered letter pair, since each adjacent-word comparison yields at most one constraint). |
| Return any valid order | We need *a* topological order, not a unique one. Multiple answers are fine. |
| Return `""` on inconsistency | The graph may be **cyclic** — we must detect cycles, not assume a DAG. |

The tiny alphabet is the giveaway: this is a **graph problem over letters**, not a sorting problem over words.

## 3. Brute Force (and why it dies)

**Idea:** The answer is a permutation of the unique letters. So enumerate all permutations of the ≤26 distinct letters; for each candidate order, assign each letter its rank, then verify every adjacent word pair is correctly ordered. Return the first permutation that validates.

**Cost:** There are up to `26!` permutations — astronomically many. For each we re-check all adjacent pairs. This is hopeless, but it's worth articulating in an interview because it establishes the brute-force baseline and forces you to define *validation* precisely.

**Worked trace on `words = ["z", "x"]`** (unique letters: `{z, x}`, 2 permutations):

| Candidate order | Rank | Check `z` vs `x`: first diff index 0, is `rank(z) < rank(x)`? | Verdict |
|---|---|---|---|
| `zx` | z=0, x=1 | 0 < 1 ✓ | **valid → return "zx"** |
| `xz` | x=0, z=1 | 1 < 1 ✗ | reject |

Note the brute force already reveals the shape of the real solution: the *only* information each validation uses is the pairwise constraint "z comes before x". Validating full permutations is wasted work — we only need to respect a set of **precedence constraints**. That's topological sort.

(For completeness: reading all `C` input characters is an unavoidable Ω(C) lower bound for any correct algorithm, since every character can contribute a constraint — the brute force is bad not because of input reading but because of the permutation search.)

## 4. The Core Insight

> **Adjacent word pairs are the only source of information.** Comparing non-adjacent pairs adds nothing new: if `w1 ≤ w2` and `w2 ≤ w3` lexicographically, the constraint between `w1` and `w3` is implied by transitivity of the (unknown) total letter order.

From each adjacent pair `w1, w2` we extract at most **one** constraint:

1. Find the first index `i` where they differ (only up to `min(len(w1), len(w2))`).
   - If found: `w1[i] → w2[i]` is an edge ("`w1[i]` comes before `w2[i]`"). Characters *after* index `i` tell us nothing — the tie is already broken.
   - If not found (one word is a prefix of the other): if `len(w1) > len(w2)`, i.e., a **longer word appears before its own prefix** (e.g., `["abcd", "ab"]`), the claim is impossible → return `""`. (In normal lexicographic order, a prefix always sorts *before* its extensions.)
2. Characters *within* a single word give **no** constraints. `"wrt"` does not mean `w → r → t`.

Collecting all edges gives a directed graph on the unique letters. Then:

- **A valid alien order exists ⟺ the graph is a DAG.** Any topological order of the DAG is a valid answer.
- If the graph has a **cycle** (e.g., `z → x → z` from `["z","x","z"]`, or `a → b → a` from two different comparisons), no letter ordering can satisfy all constraints → `""`.

The output order of letters that have **no** constraints between them is arbitrary — which is exactly why "return any" is allowed.

## 5. Optimal Approach: Build the Graph, Then Topological Sort

We'll implement Kahn's algorithm (BFS with in-degrees) as the primary solution — it's clean, iterative, and produces the answer left-to-right naturally. A DFS-based topological sort (postorder, reversed) is an equivalent alternative shown afterward, and is the version that most directly detects cycles during traversal.

### Step 1 — Extract constraints (Example 1: `words = ["wrt","wrf","er","ett","rftt"]`)

| Adjacent pair | First differing index | Edge added | Note |
|---|---|---|---|
| `wrt` vs `wrf` | index 2 (`t` vs `f`) | `t → f` | Shared prefix `wr` ignored |
| `wrf` vs `er` | index 0 (`w` vs `e`) | `w → e` | |
| `er` vs `ett` | index 1 (`r` vs `t`) | `r → t` | |
| `ett` vs `rftt` | index 0 (`e` vs `r`) | `e → r` | |

Edges: `w→e, e→r, r→t, t→f`. Nodes: `{w, r, t, e, f}`. No cycles → valid.

**Trace of Kahn's algorithm** (start with all in-degree-0 nodes):

| Step | Queue | Pop | In-degrees after | Output so far |
|---|---|---|---|---|
| init | `[w]` (only w has in-degree 0) | — | e:1, r:1, t:1, f:1 | |
| 1 | `[e]` | `w` | e:0 → push e | `w` |
| 2 | `[r]` | `e` | r:0 → push r | `we` |
| 3 | `[t]` | `r` | t:0 → push t | `wer` |
| 4 | `[f]` | `t` | f:0 → push f | `wert` |
| 5 | `[]` | `f` | — | **`wertf`** ✓ |

5 nodes emitted = 5 nodes total → no cycle → answer `"wertf"`.

### Step 2 — Trace Example 2: `["z", "x"]`

Edge `z → x`. In-degrees: z:0, x:1. Pop `z`, decrement `x` to 0, pop `x`. Output `"zx"`. ✓

### Step 3 — Trace Example 3: `["z", "x", "z"]`

Pair `("z","x")` → edge `z→x`. Pair `("x","z")` → edge `x→z`. That's a **2-cycle** `z → x → z`. Kahn's emits only the nodes whose in-degree ever hits 0 — here **zero** nodes get emitted, so `len(out) != len(nodes)` → return `""`. ✓

(This is why the length check at the end is essential — Kahn's silently "stops early" on cycles rather than raising an error.)

### Implementation (Python — Kahn's / BFS)

```python
from collections import defaultdict, deque

def alienOrder(words: list[str]) -> str:
    # One node per unique letter. dict keeps first-appearance order,
    # which makes the output deterministic (nice for testing).
    adj = {c: set() for w in words for c in w}
    indegree = {c: 0 for c in adj}

    # Only ADJACENT pairs carry information.
    for w1, w2 in zip(words, words[1:]):
        m = min(len(w1), len(w2))
        # Prefix rule: longer word before its own prefix -> impossible.
        if len(w1) > len(w2) and w1[:m] == w2:
            return ""
        for i in range(m):
            a, b = w1[i], w2[i]
            if a != b:
                if b not in adj[a]:          # avoid double-counting indegree
                    adj[a].add(b)
                    indegree[b] += 1
                break                        # stop at first difference
        # if loop completes with no difference and len(w1) <= len(w2):
        # w1 is a prefix of w2 -> fine, no constraint.

    queue = deque(c for c in indegree if indegree[c] == 0)
    order = []
    while queue:
        c = queue.popleft()
        order.append(c)
        for nb in adj[c]:
            indegree[nb] -= 1
            if indegree[nb] == 0:
                queue.append(nb)

    return "".join(order) if len(order) == len(adj) else ""
```

### Alternative: DFS with 3-color cycle detection

Recursion depth is bounded by 26 (nodes are letters), so stack overflow is not a concern here.

```python
def alienOrder(words: list[str]) -> str:
    adj = {c: set() for w in words for c in w}
    for w1, w2 in zip(words, words[1:]):
        m = min(len(w1), len(w2))
        if len(w1) > len(w2) and w1[:m] == w2:
            return ""
        for i in range(m):
            if w1[i] != w2[i]:
                adj[w1[i]].add(w2[i])
                break

    UNVISITED, IN_PROGRESS, DONE = 0, 1, 2
    state = {c: UNVISITED for c in adj}
    postorder = []

    def dfs(c) -> bool:
        state[c] = IN_PROGRESS
        for nb in adj[c]:
            if state[nb] == IN_PROGRESS:      # back edge -> cycle
                return False
            if state[nb] == UNVISITED and not dfs(nb):
                return False
        state[c] = DONE
        postorder.append(c)                   # append AFTER exploring children
        return True

    for c in adj:                             # must start from EVERY unvisited node
        if state[c] == UNVISITED and not dfs(c):
            return ""
    return "".join(reversed(postorder))
```

DFS trace on Example 1 (iterating keys in order `w, r, t, e, f`): start at `w` → `e` → `r` → `t` → `f`; postorder is `f, t, r, e, w`; reversed → **`wertf`**. ✓

## 6. Complexity Analysis

Let `C` = total number of characters across all words (≤ 10,000 here), `U` = number of unique letters (≤ 26), `E` = number of edges (≤ 650).

| Phase | Time | Space |
|---|---|---|
| Collect unique letters | O(C) | O(U) |
| Extract edges from adjacent pairs | O(C) — each pair scanned once up to first diff / min length | O(U + E) |
| Kahn's / DFS topo sort | O(U + E) — bounded by 26 + 650, effectively constant | O(U + E) for queue/stack, state, output |
| **Total** | **O(C)** — graph work is O(1) relative to input size | **O(U + E)** auxiliary; output string O(U) |

Practically: O(C) time, and auxiliary space bounded by a constant ~26 nodes / ~650 edges regardless of input size.

## 7. Common Mistakes (interview landmines)

| # | Mistake | Why it's wrong / fix |
|---|---|---|
| 1 | Comparing **non-adjacent** word pairs, or characters within one word | Non-adjacent constraints are implied by transitivity; intra-word characters (`"wrt"` ≠ `w→r→t`) carry **zero** information. Only adjacent pairs. |
| 2 | Missing the **prefix rule** | `["abcd", "ab"]` must return `""`: no letter ordering puts a word after its own prefix. Check `len(w1) > len(w2) and w1[:m] == w2`. |
| 3 | Adding an edge for **every** differing index or continuing past the first diff | Once `w1[i] != w2[i]`, the pair is ordered — later characters are unconstrained. `break` immediately. |
| 4 | **Double-counting in-degrees** with `defaultdict(set)` | If you write `adj[a].add(b); indegree[b] += 1`, adding a duplicate edge adds to the set (no-op) but increments the counter again → wrong topological order. Either guard with `if b not in adj[a]`, or build the sets first and *derive* indegrees from the final adjacency structure. |
| 5 | Forgetting the `len(order) == len(nodes)` check in Kahn's | On a cycle, Kahn's just stops early without error. Without the check you'd silently return a partial (invalid) answer. |
| 6 | DFS: only starting from the first character / not reversing postorder | You must DFS from **every** unvisited node (some letters may be unreachable from the first), and the answer is the **reversed** postorder. |
| 7 | DFS: missing the 3-color check (`IN_PROGRESS` = back edge) | Plain visited/unvisited DFS won't detect `a → b → a` reliably; you need the gray-node (recursion-stack) test. |
| 8 | Self-duplicate words like `["z","x","z"]` | Creates edge `x → z` on the second occurrence, forming a cycle with the existing `z → x`. Cycle detection handles it — but only if you *do* extract edges from every adjacent pair, including pairs after duplicates. |

**Language-specific gotchas:**

| Language | Gotcha |
|---|---|
| **Java** | `HashMap<Character, Set<Character>>` iterates in **unspecified order**, so output may vary run to run — fine for correctness ("return any"), bad for testing; use `LinkedHashMap` or loop `for (char c = 'a'; c <= 'z'; c++)` for determinism. Use `int[26]` for in-degrees instead of a boxed `Map<Character,Integer>`; and guard duplicate edges (`if (adj.get(a).add(b)) indegree[b]++` — `Set.add` returns `true` only on the first insert). |
| **C++** | `std::unordered_map<char, std::set<char>>` is fine, but don't be fooled into thinking `std::map`'s sorted iteration means anything — the answer order comes from the topological sort, not container order. Careful: `words[i].size()` is `size_t` (unsigned), so `min(len1, len2)` loops with `int` need care to avoid signed/unsigned comparison warnings; and with `std::string_view` you can avoid copies when slicing prefixes. |
| **Python** | `dict` preserves insertion order (guaranteed since 3.7), which is why `{c: set() ...}` gives a deterministic, first-appearance answer. Also note `zip(words, words[1:])` copies the list slice — trivial here, but `itertools.pairwise` avoids it. |

## 8. Test Cases to Propose Out Loud

Run through these before/after coding — proposing them yourself is part of the interview signal:

| Test | Expected | What it verifies |
|---|---|---|
| `["wrt","wrf","er","ett","rftt"]` | `"wertf"` (or any valid order) | Official Ex. 1; multi-hop chain, shared prefixes ignored |
| `["z","x"]` | `"zx"` | Official Ex. 2; single edge |
| `["z","x","z"]` | `""` | Official Ex. 3; direct 2-cycle via duplicate word |
| `["abcd","ab"]` | `""` | **Prefix rule** — longer word before its prefix (mistake #2) |
| `["ab","abc"]` | any order of `{a,b,c}`, e.g. `"abc"` | Prefix rule *passes* (shorter first is fine); no edges → any order valid |
| `["abc"]` | `"abc"` (or any permutation) | Single word; no adjacent pairs; all letters must still appear in output |
| `["ba","ba"]` | any order of `{a,b}` (e.g., `"ba"` is acceptable) | Duplicate words; no constraint; "return any" semantics |
| `["wrt","wrf","er","ett","rftt","te"]` | `""` | Valid prefix + new edge `t → e`, creating cycle `e→r→t→e` (tests cycle detection on a *non-trivial* cycle mixed with valid edges) |

Edge cases to state explicitly: single word, single character words, all-identical words, and the prefix-before-longer-word case.

## 9. Transferable Patterns & Related Problems

**Pattern: build a graph from implicit pairwise relations, then topological sort.**
Whenever a problem gives you a sequence of items claimed to be "in order," extract constraints from *adjacent* elements and check for cycles / produce an ordering.

| Problem | Relationship |
|---|---|
| LC 953 — Verifying an Alien Dictionary | The *easy sibling*: given a known alien alphabet, just **verify** the word list — no graph needed, but same adjacent-pair comparison logic (great warm-up). |
| LC 207 / 210 — Course Schedule I & II | Pure cycle detection / topological sort — the graph is given explicitly instead of extracted from words. |
| LC 444 — Sequence Reconstruction | Nearly identical skeleton: recover/validate an order from pairwise adjacency evidence; tests whether you understand which adjacent pairs carry information. |
| LC 1136 — Project Dependencies | Same "does a valid total order exist" question on an explicitly-given DAG. |

**Reusable takeaways:**
- "Is this claimed order consistent?" → build constraint graph → topological sort or cycle detect.
- Adjacent elements carry the information; transitivity handles the rest.
- Kahn's ends early on cycles → always check emitted-count vs node-count.
- When "any valid answer" is accepted, topo sort is almost always the intended tool.

## 10. Say It in 60 Seconds

> "The claim that the words are sorted gives me precedence constraints between *letters* — one constraint per adjacent word pair, taken at the first character where they differ. Characters after that difference and characters inside a single word tell me nothing. One special rule: if a longer word appears before its own prefix, it's invalid, return empty.
>
> So I build a directed graph on the unique letters with those edges, then run a topological sort. I'll use Kahn's algorithm: track in-degrees, repeatedly take zero-in-degree letters, and append them to the answer. The graph can have at most 26 nodes and a few hundred edges, so the topological sort itself is constant-time — total time is linear in the total number of characters, O(C).
>
> Invalidation is exactly a cycle: Kahn's will emit fewer nodes than exist, so if the emitted count doesn't match the node count, there's a cycle and I return empty. That handles cases like `z, x, z`, which gives edges `z→x` and `x→z`.
>
> Two gotchas I'll watch: don't double-count in-degrees when using sets for adjacency, and remember the prefix-order check."
