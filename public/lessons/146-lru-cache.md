# LRU Cache (LeetCode 146) — Complete Lesson

## 1. The problem in your own words

Build a key→value store with a fixed capacity that keeps an **access-order recency ranking**:

- **`get(key)`** → return the value if present, else `-1`. Crucially, a **hit counts as a "use"** — the key jumps to the "most recently used" position. A miss changes nothing.
- **`put(key, value)`** → upsert. If the key exists, overwrite the value **and** promote it (this is a use, too — and it must **not** trigger eviction, since the size doesn't grow). If the key is **new** and the cache is already full, evict exactly **one** key: the least recently used.

Two semantic traps people miss on first read:

- This is **LRU, not FIFO**. Recency is refreshed by *both* `get` hits and `put`s, not just insertion. (FIFO would evict the oldest-*inserted* key.)
- "If the number of keys exceeds the capacity from this operation" means: eviction only happens inside `put`, only when inserting a *new* key, and only one eviction per call.

**Precision on data, not indices:** keys are unique inside the cache — there are no duplicate entries; a repeated `put` *merges*. There are no array indices to manage in the final solution (only node identity). Keys and values may be `0`; values are non-negative, which is exactly why returning `-1` as a miss sentinel is unambiguous here — if values could be `-1`, this API would need an `Optional`/boolean return instead.

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= capacity <= 3000` | Lower bound ≥ 1: you never handle a zero-capacity cache (but be ready to discuss it as a follow-up). Upper bound 3000 makes an O(capacity)-per-op brute force *look* survivable — don't be fooled. |
| At most `2 * 10^5` calls total | Worst case ≈ 3000 × 2·10⁵ = **6·10⁸** element-operations for a linear-scan design — tens of seconds in CPython. The problem *also* explicitly demands O(1), so this is a "correct but rejected" baseline. |
| `0 <= key <= 10^4`, `0 <= value <= 10^5` | Small non-negative ints → no overflow concerns in any language (Java `int` is fine, no `long` needed), but `key = 0` and `value = 0` are legal — beware truthiness checks. |
| "O(1) **average** time" | The word *average* is your permission slip to use a hash map: hash lookups are average O(1), and Python randomizes the hash seed per process, so an adversary can't reliably force collision chains. |

Why not "just use a balanced BST keyed by last-use time"? Because comparison-based lookup can't beat Ω(log n): each comparison can at best halve the set of keys still being distinguished, giving a decision tree of depth log₂(n) — so hitting O(1) **forces** a hash-based lookup. That one sentence is worth saying in an interview; it shows you know *why* the data structure choice is forced.

## 3. Baseline: brute force, with a worked trace

### 3.1 Design

Keep a Python list of `[key, value]` pairs, ordered **LRU at index 0 → MRU at the end**.

```python
class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.items = []  # list of [key, value]; index 0 = LRU, end = MRU

    def get(self, key: int) -> int:
        for i, (k, v) in enumerate(self.items):
            if k == key:
                self.items.pop(i)          # O(C) removal (shifts everything after i)
                self.items.append([k, v])  # promote to MRU
                return v
        return -1

    def put(self, key: int, value: int) -> None:
        for i, (k, _) in enumerate(self.items):
            if k == key:                   # update in place, promote, NO eviction
                self.items.pop(i)
                self.items.append([key, value])
                return
        if len(self.items) == self.cap:
            self.items.pop(0)              # evict LRU: O(C) shift
        self.items.append([key, value])
```

Note what this version already gets *right* (it's semantically correct — that's why it's a good baseline): promote on `get` hit, update-and-promote without eviction on `put` of an existing key, evict-before-insert for new keys.

### 3.2 Trace on Example 1 (capacity = 2)

| Operation | List after (LRU → MRU) | Return |
|---|---|---|
| `put(1,1)` | `[(1,1)]` | – |
| `put(2,2)` | `[(1,1), (2,2)]` | – |
| `get(1)` | `[(2,2), (1,1)]` ← promoted | **1** |
| `put(3,3)` | evict `(1,1)` → `[(1,1)... wait]` → evict `(2,2)`, append: `[(1,1), (3,3)]` | – |
| `get(2)` | scan miss | **-1** |
| `put(4,4)` | evict `(1,1)` → `[(3,3), (4,4)]` | – |
| `get(1)` | scan miss | **-1** |
| `get(3)` | `[(4,4), (3,3)]` | **3** |
| `get(4)` | `[(3,3), (4,4)]` | **4** |

Output: `[null, null, null, 1, null, -1, null, -1, 3, 4]` ✓ — matches the official example exactly.

### 3.3 Why it fails

Every operation scans (and `pop(0)`/`pop(i)` shifts) up to `capacity` elements → O(C) per op, ~6·10⁸ element-operations at the limits, and it violates the explicit O(1) requirement. In an interview, code this quickly (or just describe it), state the cost, and move on — it proves you understand the recency semantics before you optimize.

### 3.4 A better-looking dead end (worth 15 seconds out loud)

Add a hash map `key → value` plus a per-key "last used" timestamp. `get` becomes O(1) average. But eviction needs the **minimum timestamp** — either an O(C) scan or a heap with lazy deletion (O(log Q) per eviction, where Q is the number of calls, because stale entries accumulate). Moral, and the pivot of the whole problem: **hashing solves lookup, but it cannot order anything.** You need a second structure that maintains the recency order itself, in O(1).

## 4. The core insight

The problem is two subproblems in a trench coat:

1. **O(1) lookup by key** → hash map.
2. **O(1) reordering and eviction** — you must insert/remove a node *at a position you already know* (the node itself), and read both ends of the ordering, in O(1) → **doubly linked list**.

Neither suffices alone: a hash map has no order; a linked list can't find a key in O(1). **Combine them:** the hash map maps `key → node`, so a lookup hands you the *node*, and because the list is **doubly** linked, you can unlink that node in O(1) without ever searching for its predecessor. (A singly linked list would need the predecessor — the classic "copy next node's payload into current node and delete next" hack would silently desync the key stored in the node from the map, so don't go there.)

Three details make the implementation clean:

- **Sentinel head and tail nodes** (never hold data). The list is never structurally empty, so every unlink/link is branch-free — no `if node is head` special cases.
- **Store the key inside the node.** When you evict a node you got from the list, the node is the only thing that knows its own key; you need it to `del map[key]`.
- **Fixed conventions:** `head.next` = most recently used, `tail.prev` = least recently used (the eviction victim).

```
 head(sentinel) <-> [MRU] <-> ... <-> [LRU] <-> tail(sentinel)
      map: { key -> node }   (every live key appears in exactly one node)
```

## 5. Optimal solution: hash map + doubly linked list

### 5.1 Invariants (state these before coding — interviewers listen for them)

1. Every key in the map corresponds to exactly one node currently linked in the list, and vice versa.
2. List length ≤ capacity; nodes are ordered MRU (`head.next`) → LRU (`tail.prev`).
3. A hit (`get` hit or `put` of existing key) unlinks the node and re-links it at the front.
4. A new key inserted when `len(map) == capacity` first unlinks `tail.prev`, deletes `map[victim.key]`, then inserts at the front.

### 5.2 Python implementation

```python
class Node:
    def __init__(self, key: int = 0, value: int = 0):
        self.key = key          # stored so eviction can del map[key]
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.nodes = {}              # key -> Node
        self.head = Node()           # sentinel; head.next is the MRU data node
        self.tail = Node()           # sentinel; tail.prev is the LRU data node
        self.head.next = self.tail
        self.tail.prev = self.head

    # -- O(1) list surgery, branch-free because of the sentinels --
    def _unlink(self, node: Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _link_front(self, node: Node) -> None:
        first = self.head.next
        node.prev, node.next = self.head, first
        self.head.next = node
        first.prev = node

    def get(self, key: int) -> int:
        node = self.nodes.get(key)
        if node is None:             # miss: recency untouched
            return -1
        self._unlink(node)
        self._link_front(node)       # hit: promote to MRU
        return node.value

    def put(self, key: int, value: int) -> None:
        node = self.nodes.get(key)
        if node is not None:         # existing key: update + promote, never evict
            node.value = value
            self._unlink(node)
            self._link_front(node)
            return
        if len(self.nodes) == self.cap:      # new key at capacity: evict LRU first
            lru = self.tail.prev
            self._unlink(lru)
            del self.nodes[lru.key]          # why Node stores its key
        node = Node(key, value)
        self.nodes[key] = node
        self._link_front(node)
```

Micro-polish if asked: add `__slots__ = ("key", "value", "prev", "next")` to `Node` to cut per-node memory and attribute lookup cost. Note the miss check is `is None`, not truthiness — `key = 0` and `value = 0` are valid, and we compare *node identity*, never values.

### 5.3 Trace on Example 1 (capacity = 2)

List shown MRU → LRU:

| Operation | Recency list | Map keys | Return |
|---|---|---|---|
| `init(2)` | `H ⇄ T` | `{}` | – |
| `put(1,1)` | `H ⇄ 1 ⇄ T` | `{1}` | – |
| `put(2,2)` | `H ⇄ 2 ⇄ 1 ⇄ T` | `{1,2}` | – |
| `get(1)` | `H ⇄ 1 ⇄ 2 ⇄ T` (promoted) | `{1,2}` | **1** |
| `put(3,3)` | evict 2 → `H ⇄ 3 ⇄ 1 ⇄ T` | `{1,3}` | – |
| `get(2)` | unchanged (miss) | `{1,3}` | **-1** |
| `put(4,4)` | evict 1 → `H ⇄ 4 ⇄ 3 ⇄ T` | `{3,4}` | – |
| `get(1)` | unchanged (miss) | `{3,4}` | **-1** |
| `get(3)` | `H ⇄ 3 ⇄ 4 ⇄ T` | `{3,4}` | **3** |
| `get(4)` | `H ⇄ 4 ⇄ 3 ⇄ T` | `{3,4}` | **4** |

Output: `[null, null, null, 1, null, -1, null, -1, 3, 4]` ✓. Notice the structure "knows" to evict 2 at `put(3,3)` because the earlier `get(1)` demoted 2 to LRU — this trace is precisely what distinguishes LRU from FIFO (under FIFO, `get(2)` would wrongly return 2).

### 5.4 The library shortcut — and when it's acceptable

`collections.OrderedDict` is literally a hash map + doubly linked list internally (`move_to_end` and `popitem(last=False)` are O(1)):

```python
from collections import OrderedDict

class LRUCache(OrderedDict):
    def __init__(self, capacity: int):
        super().__init__()
        self.cap = capacity

    def get(self, key: int) -> int:
        if key not in self:
            return -1
        self.move_to_end(key)
        return self[key]

    def put(self, key: int, value: int) -> None:
        if key in self:
            self.move_to_end(key)
        self[key] = value
        if len(self) > self.cap:
            self.popitem(last=False)     # pop from the LRU end
```

Strategy: mention this proactively ("in production I'd use `OrderedDict` or `LinkedHashMap`; internally it's the same hashmap+DLL — I can build that from scratch if you'd like"), then build §5.2. Know also that since Python 3.7 a plain `dict` preserves insertion order, so `d[key] = d.pop(key)` moves a key to the MRU end and `del d[next(iter(d))]` evicts the LRU in O(1) — a fun Python-specific trick, but it leans on language-specific ordering guarantees and most interviewers still want the explicit DLL.

## 6. Complexity table

| Approach | `get` | `put` | Space | Verdict |
|---|---|---|---|---|
| List of pairs, scan + shift | O(C) | O(C) | O(C) | Correct; violates the O(1) requirement |
| Hash map + timestamps, min-scan eviction | O(1) avg | O(C) on eviction | O(C) | Hashing alone can't order |
| Hash map + heap, lazy deletion | O(1) avg | O(log Q) | O(Q) stale entries | Close, but heap ops aren't O(1) |
| `OrderedDict` / `LinkedHashMap` | O(1) avg | O(1) avg | O(C) | Correct; delegates to hashmap+DLL internally |
| **Hash map + DLL with sentinels** | **O(1) avg** | **O(1) avg** | **O(C)** | **Intended answer** |

**Why O(1) average:** every `get`/`put` performs a constant number of pointer writes (worst-case O(1), no amortization) plus one hash-map operation, which is average O(1); Python randomizes each process's hash seed, so adversarial collision chains are impractical to induce. **Space** is O(capacity): at most `capacity` nodes and map entries.

## 7. Common mistakes

| Mistake | Failing symptom | Fix |
|---|---|---|
| `get` hit doesn't promote | `cap=2`: `put(1,1), put(2,2), get(1), put(3,3)` evicts 1 → `get(2)` returns 2 instead of −1 (Example 1 breaks at `get(2)`) | Promote on every hit |
| `put` of existing key evicts | Update-at-capacity test shrinks the cache and loses a live key | Existence check **before** capacity check; update path never evicts |
| Node doesn't store its key | Eviction can't `del map[key]`; a ghost map entry keeps pointing at a detached node, corrupting a later re-insert | Store `key` in `Node` |
| DLL surgery order bug | Overwriting `node.next` before capturing it, or forgetting `node.next.prev = node.prev` | Capture the neighbor first; use two sentinels + `_unlink`/`_link_front` helpers so edge cases vanish |
| Truthiness checks | `if d.get(key):` or `if not node.value:` breaks when `key = 0` or `value = 0` | `is None` / `in` checks only |
| FIFO misread (no refresh on access) | Example 1 diverges at `get(2)` (returns 2, expected −1) | Access-order semantics: gets *and* puts refresh |
| Miss refreshes recency | A `get` on an absent key reshuffles the list, changing the next eviction victim | Touch the list only on hits and updates |
| Wrong eviction end (`popitem(last=True)` / removing `head.next`) | Evicts the *most* recently used — Example 1 diverges immediately at `put(3,3)` | `popitem(last=False)` / `tail.prev` |
| Wrong return contract | `put` returns a value, or `get` raises on miss | `put → None`, `get → -1` on miss (safe because values are non-negative) |

## 8. Java & C++ gotchas

| Language | Gotcha |
|---|---|
| Python | Check membership with `is None` / `in`, never truthiness — `key = 0` and `value = 0` are legal inputs. |
| Python | A plain `dict` (3.7+) preserves insertion order but has **no O(1) move-to-end** — you can't fake the DLL with it beyond the `d[k] = d.pop(k)` trick. |
| Java | `LinkedHashMap(capacity, 0.75f, accessOrder=true)` + a `removeEldestEntry` override is the 10-line cheat — know it, but be ready to hand-roll `HashMap<Integer, Node>` + DLL. |
| Java | Never compare boxed `Integer` keys with `==` (it's only reference-true within the −128..127 cache; keys here reach 10⁴, so it would silently break). Keep `int key` as a primitive inside `Node` and let `HashMap` handle equality. |
| C++ | Canonical shape: `unordered_map<int, list<pair<int,int>>::iterator>` + `std::list::splice` — `splice` moves nodes between/within lists in O(1) **and keeps iterators/references valid**, which is exactly why storing list iterators across moves is safe. |
| C++ | Don't probe existence with `map[key]` — `operator[]` inserts a default value; use `find`. On eviction, `list::erase(it)` (O(1) via the stored iterator) and the map `erase` must both happen. |

## 9. Test plan — propose these out loud before/after coding

1. **Official Example 1** — trace it (§5.3); it catches FIFO-vs-LRU at the `get(2)` step.
2. **Capacity 1 churn:** `put(1,1); get(1)→1; put(2,2); get(1)→-1; get(2)→2`.
3. **Update at full capacity must NOT evict:** `cap=2; put(1,1); put(2,2); put(1,10)` → size still 2, `get(2)→2`, `get(1)→10`. (This bug survives Example 1 — it's the trap the official tests set for you.)
4. **`get` promotion changes the eviction victim:** `cap=2; put(1,1); put(2,2); get(2); put(3,3)` → 1 is evicted, 2 survives: `get(1)→-1, get(2)→2, get(3)→3`.
5. **Zero key / zero value:** `put(0,0); get(0)→0` — kills truthiness and sentinel bugs.
6. **Miss leaves recency untouched:** `cap=2; put(1,1); put(2,2); get(99); put(3,3)` → still evicts 1, not 2.

```python
c = LRUCache(2); c.put(1,1); c.put(2,2); assert c.get(1) == 1
c.put(3,3); assert c.get(2) == -1
c.put(4,4); assert c.get(1) == -1
assert c.get(3) == 3 and c.get(4) == 4

c = LRUCache(2); c.put(1,1); c.put(2,2); c.put(1,10)
assert c.get(2) == 2 and c.get(1) == 10            # update never evicts

c = LRUCache(1); c.put(1,1); c.put(2,2)
assert c.get(1) == -1 and c.get(2) == 2            # capacity-1 churn

c = LRUCache(2); c.put(0,0); assert c.get(0) == 0  # zero key/value
```

## 10. Transferable patterns & related problems

**Patterns to carry forward:**

- **Hash map + linked structure** = O(1) lookup welded to O(1) reordering/eviction. The map is a *back-pointer index into the structure*, not a standalone store.
- **Sentinel (dummy) nodes** to delete edge cases from any linked-list problem.
- **Store the key in the node** whenever a structure node must be deleted from a companion map (reverse-lookup bookkeeping).
- **Promote-on-touch / access-order semantics** vs insertion-order — always pin down which one the problem means.
- **Evict-before-insert discipline** for any fixed-capacity container.

**Related problems & where the same bones show up:**

| Problem / context | Connection |
|---|---|
| LC 460 — LFU Cache | Adds frequency tie-breaking: map + a DLL *per frequency bucket* |
| LC 432 — All O(1) Data Structure | Same backbone for O(1) inc/dec ordering |
| LC 380 — Insert Delete GetRandom O(1) | Sibling combo: hash map + array with swap-with-last trick |
| LC 1756 — Design Most Recently Used Container (premium) | Pure LRU mechanics drill |
| System design: Redis `allkeys-lru`, OS page cache, CDN eviction | LRU at scale; note real systems use approximations (clock/segmented LRU) because exact LRU needs pointer bookkeeping per access |

**Follow-ups to expect:** *Why doubly linked?* (O(1) unlink needs the predecessor). *Why store the key in the node?* (map cleanup on eviction). *Thread-safe version?* (wrap each op in a lock — fine, since every critical section is O(1)). *Capacity 0?* (spec says ≥1; if it were 0, every new key would be inserted-then-evicted or never stored — clarify). *Strict worst-case O(1)?* (requires perfect hashing or randomized techniques — out of the interview's scope, but name the idea).

## 11. Full interview talk track

> "Let me restate to make sure I have the semantics right: fixed-capacity cache; `get` returns the value on a hit and −1 on a miss, and a hit counts as a use; `put` upserts — an existing key is updated and refreshed with **no** eviction — while a brand-new key at capacity evicts the least-recently-used key. Recency is refreshed by both gets and puts, so this is access-order LRU, not FIFO. Both ops must be O(1) average.
>
> That splits into two subproblems: O(1) lookup, which is a hash map, and O(1) reordering, which needs insert/remove at a position I already know plus access to both ends — a doubly linked list. A hash map alone can't order, and a balanced BST is Ω(log n) per lookup since each comparison at best halves the remaining candidates, so O(1) really forces hashmap-plus-DLL. I'll map keys to nodes, order the list MRU-at-head, and use sentinel head/tail nodes so every unlink/link is branch-free.
>
> Invariants I'll maintain: the map and the list mirror each other exactly; every hit unlinks and re-links at the front; `put` of an existing key updates in place and promotes, never evicts; a new key at capacity unlinks `tail.prev` and deletes its key from the map — which is why I store the key inside each node.
>
> Complexity: O(1) average per op — constant pointer work plus one hash op — and O(capacity) space.
>
> Edge cases I'll test: capacity 1; updating an existing key at full capacity must not evict; a `get` promotion changing who gets evicted next; key 0 and value 0 to guard truthiness checks; misses leaving recency untouched. In Python I could do this in five lines with `OrderedDict` — `move_to_end` and `popitem(last=False)` — but that just wraps the same hashmap+DLL, so I'll build it explicitly and keep the OrderedDict version as a sanity check."

## 12. Say it in 60 seconds

> "LRU is really two O(1) problems glued together: lookup and recency reordering — so I use a hash map plus a doubly linked list. The map goes key→node; the list is ordered most-recently-used at the head, with sentinel head and tail nodes so all the pointer surgery is branch-free. `get`: miss returns −1 and touches nothing; hit unlinks the node, re-links it at the front, returns the value. `put`: if the key exists, update the value and promote — no eviction; if it's new and we're full, cut out `tail.prev`, delete its key from the map — that's why each node stores its own key — then insert the new node at the front. Every operation is a constant number of pointer swaps plus one hash-map op: O(1) average, O(capacity) space. Before coding I'd call out three tests: capacity 1, updating an existing key at full capacity — which must not evict — and key zero / value zero to catch truthiness bugs."
