# Copy List with Random Pointer — Complete Interview Lesson

## 1. Problem Restatement (in your own words)

You're given **only the head** of a linked list. Each node has:

- `val` — an integer,
- `next` — the usual pointer to the next node,
- `random` — an *extra* pointer that may point to **any node in this same list** (forward, backward, itself) or `null`.

Build a **deep copy**: exactly `n` brand-new nodes with the same values, whose `next` and `random` pointers reproduce the original's topology exactly — with **zero aliasing** into the original list. Return the new head.

Two precision points candidates blur:

- **Deep copy semantics.** Every node in the output must be freshly allocated. If even one copy's `random` points back at an *original* node, the copy is wrong.
- **`[val, random_index]` is only the I/O serialization.** In code you are handed *node references*, never indices, and you never compute indices — the judge walks the list *you return* and derives each `random_index` by finding which node in *your* list each `random` points at. So the real contract is: *reproduce the pointer topology among new nodes.*

## 2. Decoding the Constraints

| Constraint | What it actually tells you |
|---|---|
| `0 <= n <= 1000` | `n = 0` is legal → `head = null` must return `null`. Also, `n ≤ 1000` means even `O(n²)` (~10⁶ ops) *passes* — so this problem tests pointer manipulation and elegance, not feasibility. Recursion depth can hit 1000, which matters in Python (see gotchas). |
| `-10⁴ <= val <= 10⁴` | Values **repeat freely** — Example 3 has three nodes all valued `3`. Any scheme keyed by value is broken. The only safe identity is the node object itself (reference/pointer identity). |
| `random` is `null` or points to a node in the list | The pointer graph is *closed* — every `random` target exists in the list. This is what makes the O(1)-space "weave" trick possible. |
| You're given only `head` | No random access, no indexing. Everything must be done by traversal. |

### Why the obvious one-pass fails

Stand on node `X` and try to build its copy `x` in one sweep. `X.random` might point **forward** to a node whose copy doesn't exist yet, or **backward** to a node you'd need to look up again. So the core requirement is:

> At any moment, answer in O(1): *"given an original node, where is its copy?"*

There are exactly three ways to get that lookup:

1. **Pre-create all copies, then wire them** (two passes + hash map) — the brute force.
2. **Create copies lazily, memoized** (one logical pass / DFS + map) — the clone-graph pattern.
3. **Encode the mapping into the list structure itself** (weave) — `O(1)` extra space.

---

## 3. Brute Force: Two Passes + Hash Map

**Idea.** Pass 1: walk the list and create one fresh node per original, storing `original → copy` in a dict. Pass 2: walk again and set `copy.next` and `copy.random` by looking up the originals' targets. Because *all* copies exist before any wiring, forward randoms are no longer a problem.

```python
"""
# Definition for a Node.
class Node:
    def __init__(self, x: int, next: 'Node' = None, random: 'Node' = None):
        self.val = int(x)
        self.next = next
        self.random = random
"""

class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        old_to_new = {None: None}   # sentinel: map null -> null so lookups never crash

        # Pass 1: allocate one copy per original.
        cur = head
        while cur:
            old_to_new[cur] = Node(cur.val)
            cur = cur.next

        # Pass 2: wire next and random on the copies.
        cur = head
        while cur:
            old_to_new[cur].next = old_to_new[cur.next]
            old_to_new[cur].random = old_to_new[cur.random]
            cur = cur.next

        return old_to_new[head]
```

Note the `{None: None}` sentinel: `old_to_new[cur.next]` and `old_to_new[cur.random]` are then valid even when those pointers are `null`.

### Worked trace on Example 1: `[[7,null],[13,0],[11,4],[10,2],[1,0]]`

Name originals `A(7) B(13) C(11) D(10) E(1)`; copies `a b c d e`.

**Pass 1** — create copies, one per original:

| original | created | map state (grows left→right) |
|---|---|---|
| A(7) | a | A→a |
| B(13) | b | A→a, B→b |
| C(11) | c | …, C→c |
| D(10) | d | …, D→d |
| E(1) | e | …, E→e |

**Pass 2** — wire the copies (reading each original's pointers):

| original | its pointers | copy wiring performed |
|---|---|---|
| A(7) | next=B, random=null | `a.next=b`, `a.random=null` |
| B(13) | next=C, random=A | `b.next=c`, `b.random=a` |
| C(11) | next=D, random=E | `c.next=d`, `c.random=e` |
| D(10) | next=E, random=C | `d.next=e`, `d.random=c` |
| E(1) | next=null, random=A | `e.next=null`, `e.random=a` |

Result: `a→b→c→d→e` with `a.random=null, b.random=a, c.random=e, d.random=c, e.random=a` → `[[7,null],[13,0],[11,4],[10,2],[1,0]]`. ✓

**Complexity:** `O(n)` time, `O(n)` extra space for the map (dict operations are `O(1)` on average under the standard uniform-hashing assumption; worst-case degradation from collisions is immaterial at `n ≤ 1000`).

*(A mapless brute force also exists: for each node, scan the list to find where its `random` sits, record that position, then assign copies by position — this is `O(n²)` because each of the `n` lookups may scan `O(n)` nodes, which still fits `n ≤ 1000` but signals you missed the memoization idea.)*

---

## 4. The Core Insight

The hash map's **only job** is `O(1)` translation from an original node to its copy. You can either **rent** that table (`O(n)` memory) or **build it into the structure**: if you splice each copy *immediately after* its original, then:

> **the copy of node `X` is `X.next`.**

So `X.random.next` is the copy of `X.random` — the lookup costs one `.next` hop instead of a hash lookup. Three phases:

```
Before:      A(7) → B(13) → C(11) → D(10) → E(1) → ∅

Phase 1 WEAVE (insert a copy after every original):
             A → a → B → b → C → c → D → d → E → e → ∅

Phase 2 WIRE: for each original X with X.random ≠ ∅:
                  X.next.random = X.random.next      # copy's random = copy of my random

Phase 3 UNZIP: split the woven chain back into two lists,
               restoring the original's next pointers.
```

This trades memory for temporary mutation of the input — you **must** put the original list back in phase 3.

---

## 5. Optimal Approach: Weave → Wire → Unzip (`O(1)` extra space)

```python
class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        if head is None:
            return None

        # ---- Phase 1: weave — insert copy right after each original ----
        cur = head
        while cur:
            nxt = cur.next                # save BEFORE overwriting cur.next
            copy = Node(cur.val, nxt, None)
            cur.next = copy
            cur = nxt                     # advance to the next ORIGINAL (skip the copy)

        # ---- Phase 2: wire randoms. Invariant: copy of X is X.next ----
        cur = head
        while cur:
            if cur.random is not None:    # null-check or we crash on null randoms
                cur.next.random = cur.random.next
            cur = cur.next.next           # hop over the copy to the next original

        # ---- Phase 3: unzip into two independent lists ----
        dummy = Node(0)
        tail = dummy
        cur = head
        while cur:
            copy = cur.next               # read this FIRST, before mutating cur.next
            tail.next = copy
            tail = copy
            cur.next = copy.next          # restore the original list's next pointer
            cur = copy.next               # advance to next original (may be None)
        return dummy.next
```

### Trace on Example 1: `[[7,null],[13,0],[11,4],[10,2],[1,0]]`

Randoms: `A→∅, B→A, C→E, D→C, E→A`.

**Phase 1** (showing one step, then the result): process `A`: save `nxt=B`, create `a`, weave `A→a→B→…`. Repeating:

```
A → a → B → b → C → c → D → d → E → e → ∅
```

**Phase 2:**

| cur (original) | cur.random | assignment | resulting fact |
|---|---|---|---|
| A(7) | ∅ | *skipped* | `a.random` stays ∅ ✔ |
| B(13) | A | `b.random = A.next = a` | b→a ✔ |
| C(11) | E | `c.random = E.next = e` | c→e ✔ |
| D(10) | C | `d.random = C.next = c` | d→c ✔ |
| E(1) | A | `e.random = A.next = a` | e→a ✔ |

**Phase 3:**

| iteration | copy chain built | original pointer restored |
|---|---|---|
| 1 | dummy→a | `A.next = a.next = B` |
| 2 | a→b | `B.next = b.next = C` |
| 3 | b→c | `C.next = c.next = D` |
| 4 | c→d | `D.next = d.next = E` |
| 5 | d→e | `E.next = e.next = ∅` |

Returned list: `a→b→c→d→e` = `[[7,null],[13,0],[11,4],[10,2],[1,0]]` ✔, and the original list is bit-for-bit restored.

### Trace on Example 2: `[[1,1],[2,1]]` — read this carefully!

`random_index` is an **index**, not a value: node 0 (`val=1`) points at **index 1**, and node 1 (`val=2`) points at **index 1 — itself**. So the self-loop is on the *second* node.

Weave: `A(1) → a → B(2) → b → ∅`.
Wire: `A.random = B` ⇒ `a.random = B.next = b`; `B.random = B` ⇒ `b.random = B.next = b` — the **self-loop is reproduced on the copy** automatically, because the rule is uniform.
Unzip → `[[1,1],[2,1]]` ✔.

### Trace on Example 3: `[[3,null],[3,0],[3,null]]`

Three nodes, all `val = 3`; only node 1 has a non-null random (→ node 0). Weave: `A→a→B→b→C→c`. Wire: at `B`: `b.random = A.next = a`; the others are skipped. Unzip → `[[3,null],[3,0],[3,null]]` ✔. Duplicates never mattered: every step navigates by **pointer identity**, never by value.

### Variant worth mentioning: memoized one-pass (clone-graph style)

```python
class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        old_to_new = {None: None}

        def clone(node):
            if node is None:
                return None
            if node in old_to_new:        # memo hit — also breaks cycles/self-loops
                return old_to_new[node]
            copy = Node(node.val)
            old_to_new[node] = copy       # register BEFORE recursing (self-loop safety!)
            copy.next = clone(node.next)
            copy.random = clone(node.random)
            return copy

        return clone(head)
```

Registering `old_to_new[node] = copy` **before** recursing is what prevents infinite recursion when `random` (or a cycle) leads back to the same node.

---

## 6. Complexity Table

| Approach | Time | Extra space (excl. the `n` output nodes) | Mutates input? | Notes |
|---|---|---|---|---|
| Two-pass hash map | `O(n)` | `O(n)` map | No | Best default first answer |
| Memoized DFS / one-pass lazy clone | `O(n)` | `O(n)` map + up to `O(n)` recursion stack | No | Recursion depth is bounded by the number of distinct nodes visited, ≤ n; identical pattern to Clone Graph |
| **Weave → wire → unzip** | `O(n)` | **`O(1)`** | Yes, temporarily (restored in phase 3) | The "can you avoid extra space?" follow-up answer |
| Mapless index brute force | `O(n²)` | `O(n)` | No | n position-lookups × O(n) scan each |

Notes:

- **Time is optimal:** every node's `val` and both pointers must be read and reproduced at least once, so `Ω(n)` time is unavoidable and all the `O(n)` solutions above are time-optimal.
- `O(1)` extra space is only possible because the `n` output nodes you must allocate anyway double as the working storage; every solution is `Θ(n)` if you count the output.
- If the interviewer says *"don't modify the input at all,"* the weave is off the table — say the two-pass map solution instead.

---

## 7. Implementation Gotchas (Python / Java / C++)

| Language | Gotcha |
|---|---|
| **Python** | Dict keys on objects are **identity-based by default** (`Node` defines no `__eq__`/`__hash__`), which is exactly what you want — but don't "help" by keying on `val`. Also, the recursive DFS clone can blow Python's default recursion limit (~1000) at exactly `n = 1000`; prefer iterative/two-pass. |
| **Java** | `HashMap<Node,Node>` uses identity because LeetCode's `Node` doesn't override `equals`/`hashCode` — do **not** generate an `equals`/`hashCode` based on `val`, or duplicate-valued nodes (Example 3) collide. `HashMap` allows a `null` key (handy for the `{null→null}` trick), but `Hashtable`/`ConcurrentHashMap` throw NPE on null keys. |
| **C++** | `unordered_map<Node*, Node*>` works out of the box because keying on the pointer *is* identity; `unordered_map<Node, Node>` **by value** needs a custom hash plus `operator==` and breaks on duplicate `val`. Allocate copies with `new` and handle raw pointers — never copy `Node` objects by value. |

---

## 8. Common Mistakes

1. **Keying the map by `node.val`.** Fails Example 3 (three nodes valued `3`). Key by the node object.
2. **Missing null check in phase 2.** `cur.next.random = cur.random.next` crashes (`AttributeError`/`NoneType`) whenever `random` is `null` — Example 1's very first node triggers it.
3. **Phase 1 advance bug.** Writing `cur = cur.next` *after* inserting the copy lands you on the copy → you weave copies of copies / loop forever. Save `nxt = cur.next` first.
4. **Phase 3 ordering bug.** You must read `copy = cur.next` into a variable *before* overwriting `cur.next`; overwrite `copy.next` only after using it to restore the original.
5. **Forgetting to restore the original list.** The judge only inspects what you return, but destroying the caller's list is a real-world bug and an interview red flag. End with: "and I restored the input."
6. **Wrong return value.** Return `dummy.next` (weave) or `old_to_new[head]` (map) — not `head` (the *original*) and not `dummy`.
7. **Pointing a copy's `random` at an original node** (e.g., writing `copy.random = cur.random`). That's a shallow copy of the random edge and violates the "no pointers into the original list" rule.
8. **Trying to construct `[val, random_index]` pairs yourself.** You receive references and return references; the judge computes indices from your list.
9. **`copy.deepcopy` shortcuts.** Python's `deepcopy` would technically succeed (its internal memo dict handles the cycles), but the interviewer is testing whether you *are* the memo dict — mention it only as an aside.

---

## 9. Test Cases to Propose Out Loud

| # | Input | Expected | What it catches |
|---|---|---|---|
| 1 | `[[7,null],[13,0],[11,4],[10,2],[1,0]]` | identical | Official Ex. 1 — null random, backward random, forward random (11→index 4) |
| 2 | `[[1,1],[2,1]]` | identical | Official Ex. 2 — **self-loop at index 1** (read the index carefully, it's node 1 pointing to itself) |
| 3 | `[[3,null],[3,0],[3,null]]` | identical | Official Ex. 3 — duplicate values; only node-identity logic survives |
| 4 | `[]` | `[]` | `n = 0`, `head = null` — must return `null` without crashing |
| 5 | `[[5,0]]` | `[[5,0]]` | Smallest self-loop: single node whose random is itself |
| 6 | `[[1,0],[2,0],[3,0]]` | identical | Fan-in: every random targets the head |
| 7 | `n = 1000`, every node's `random` = its `next` | — | Stress: all-forward randoms, plus recursion-depth check for DFS solutions in Python |

A quick self-check you can mention: serialize both the input and your output with a helper that maps node identity → index (using `id()` in Python) and compare, plus assert the two lists share **no** node identity — that verifies deep-copy semantics exactly as the judge does.

---

## 10. Transferable Patterns & Related Problems

- **Clone-with-memo (original→copy map).** The universal recipe for copying *any* structure with shared references or cycles: register the memo entry *before* recursing. Direct siblings: **Clone Graph (LC 133)**, **Clone Binary Tree With Random Pointer (LC 1485)**.
- **Encode metadata in pointers, then restore.** The weave is an instance of "mutate → exploit → restore" for `O(1)` space: **Reorder List (LC 143)** and **Palindrome Linked List (LC 234)** use the same discipline (find-middle/reverse/relink), as does Morris traversal, which threads predecessors through `null` child pointers.
- **A list with an extra pointer is a graph in disguise.** Each node has two outgoing edges (`next`, `random`); any such problem can be attacked with graph traversal + visited/clone maps.
- **Deferred resolution.** Forward references (here: forward `random`; in compilers: forward label patching) require either a second pass, lazy memoized creation, or structure-embedded mapping — the same three options as this problem.

---

## 11. Full Interview Talk Track

> *"Let me restate: deep-copy a linked list where each node also has a random pointer to any node in the same list or null. Output must be n brand-new nodes with matching `next` and `random` topology, and nothing may alias into the input. The `[val, random_index]` notation is just serialization — I'm given the head node only."*
>
> *"The challenge is that a random pointer can point forward, so in a single pass the copy of the target may not exist yet. I need constant-time lookup from an original node to its copy. First solution: a hash map. Pass one creates a copy of every node and fills the map; pass two wires each copy's `next` and `random` by looking up the original's targets. I map `null → null` so null randoms are free. That's O(n) time, O(n) extra space."*
>
> *(If asked for better space:)* *"I can drop the map by encoding the mapping in the list itself. Step 1, weave: after every original, splice in its copy, so each original's copy is `original.next`. Step 2, for every original X with a non-null random, set `X.next.random = X.random.next` — that's the copy of my random. Step 3, unzip: walk pairs, chaining copies via a dummy head, and restore each original's next pointer as I go. Three linear passes, O(1) extra space beyond the output, and the input ends up exactly as it started."*
>
> *"Correctness checks I care about: duplicate values mean I must navigate by node identity, never value; null randoms need a skip; self-loops resolve naturally since the rule is uniform. Test cases: the empty list, a single self-looping node, and the all-duplicates case. If recursion came up, I'd note the memoized DFS variant and that at n = 1000 I'd avoid recursion in Python due to the default recursion limit."*

---

## 12. Say It in 60 Seconds

> "Deep-copy a list where each node has an extra random pointer to any node. The catch is random can point forward, so one straight pass can't wire the copies — I need constant-time translation from an original node to its copy. Simple version: hash map from original to copy. Pass one creates all copies; pass two sets each copy's next and random via lookups. O(n) time, O(n) space. If they want O(1) space, I weave: insert each copy right after its original, so every original's copy is just `original.next`. Then for each original, set `copy.random = original.random.next`, skipping nulls — that's the copy of my random target. Finally unzip: split the woven chain, chaining copies through a dummy while restoring each original's next pointer. Three linear passes, constant extra space, input restored. Correctness keys: navigate by node identity, not value — duplicates exist — and cover the empty list and self-loops in tests."
