### Problem

Design an LRU cache with `get(key)` and `put(key, value)`, both O(1). When full, evict the least recently used key.

#### In plain words

A cache holds at most `capacity` items. Every `get` or `put` of a key counts as **using** it. When you `put` a new key into a full cache, throw away the key that was used **longest ago** ("least recently used", LRU).

```text
capacity 2
put(1, 1)  put(2, 2)   cache has 1, 2      (2 most recent)
get(1) → 1             now 1 is most recent
put(3, 3)              full → evict 2 (used longest ago)
get(2) → -1            miss
```

#### Words used on this page

| Term | Meaning |
|---|---|
| Hit / miss | The key is / isn't in the cache. A miss returns -1 here. |
| Recency order | Keys ordered from most recently used to least recently used. |
| Eviction | Removing an item to make room. |
| Doubly linked list | Nodes with `prev` and `next` pointers, so any node can be unlinked in O(1). |
| Sentinel | Dummy head/tail nodes, so real nodes always have neighbours. |
| TTL | "Time to live": how long an entry stays valid. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

A hashmap from key to node, plus a doubly linked list ordered by recency with dummy head and tail so unlink and push-front need no edge cases. `get`: a miss returns -1; a hit moves the node to the front. `put`: an existing key is updated and moved to the front; when full, evict `tail.prev` and delete its key from the map (which is why nodes store their keys); then insert at the front. All O(1). It must be doubly linked because O(1) removal needs the predecessor. Mention `OrderedDict` as the production answer. For threads, use one lock, or shard by key hash and accept approximate global LRU.

**Cheat sheet**

1. **Ask:** miss value? does `put` on an existing key count as use? capacity ≤ 0? threads? may I use OrderedDict?
2. **Tests first:** miss, hit, evicts LRU, get refreshes, put-update refreshes, capacity 1, random model test.
3. **Build:** `dict key → node` + doubly linked list `head ⇄ … ⇄ tail` (front = most recent).
4. **Cost:** O(1) get/put; O(capacity) space.
5. **Follow-ups:** TTL → `expires_at` on nodes, lazy expiry; threads → one lock or shards.

### Background you need

#### 1. Which operations do we need, and how fast?

- Find a key's value: **O(1)** → a dict.
- Move any key to the "most recent" end: **O(1)**.
- Remove the least recently used key: **O(1)**.

The last two need a sequence you can pull any element out of and put at the front. A Python list can't do that cheaply: removing from the middle shifts everything, O(n).

#### 2. Doubly linked list with sentinels

If you hold a node, unlinking it is just re-pointing its two neighbours, O(1). The dict gives you the node instantly; the `prev` pointer gives you its predecessor. A singly linked list would need a search to find the predecessor.

```python
class Node:
    def __init__(self, key=None):
        self.key, self.prev, self.next = key, None, None

head, tail = Node("HEAD"), Node("TAIL")
head.next, tail.prev = tail, head

def push_front(n):
    n.prev, n.next = head, head.next
    head.next.prev = n
    head.next = n

def unlink(n):
    n.prev.next, n.next.prev = n.next, n.prev

a, b = Node("a"), Node("b")
push_front(a); push_front(b)          # head ⇄ b ⇄ a ⇄ tail
unlink(a); push_front(a)              # "use" a: head ⇄ a ⇄ b ⇄ tail
print(head.next.key, tail.prev.key)
```

```text
a b
```

Front (`head.next`) is the most recent; back (`tail.prev`) is the least recent, which is the one to evict.

#### 3. Why each node stores its key

When evicting, you find the victim from the list (`tail.prev`), not from the dict. To delete it from the dict too, you need its key, so the node carries it.

#### 4. `OrderedDict`: the production answer

Python's `collections.OrderedDict` keeps insertion order and has `move_to_end(key)` and `popitem(last=False)`, which is everything an LRU needs. Say you'd use it in real code, then build the structure by hand, because that's what the question is testing.

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| What does `get` return on a miss? | API. | -1 (LeetCode) or `None`. |
| Does `put` on an existing key count as a use? | The most-forgotten rule. | Yes (usual) → update the value **and** move it to the front. |
| What if capacity is 0 or negative? | Edge case. | Raise `ValueError` at construction. |
| May I use `OrderedDict`, or build it by hand? | Scope. | By hand (usual) → dict + doubly linked list. OrderedDict → ~10 lines. |
| Single-threaded? | Concurrency. | Yes → no lock. No → one lock, or shards (see Follow-ups). |
| Do entries expire? | Adds a clock. | Yes → TTL with an injected clock (see Follow-ups). |

**If they say "your call", state your defaults out loud:**

> "Miss returns -1; put on an existing key updates it and makes it most recent; capacity must be positive; single-threaded for now; I'll build the structure by hand and mention OrderedDict."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass, plus a random test that compares my cache with a slow but obviously-correct one."

#### Work an example by hand

```text
capacity 2                         (front = most recent)
put(1,1) put(2,2)    head ⇄ 2 ⇄ 1 ⇄ tail
get(1) → 1           head ⇄ 1 ⇄ 2 ⇄ tail
put(3,3)             full → evict tail.prev = 2
                     head ⇄ 3 ⇄ 1 ⇄ tail
```

#### The tests, one per requirement

Code in `lru.py`, tests in `test_lru.py`.

```python
# file: test_lru.py
import random

from lru import LRUCache


def test_miss_returns_minus_one():
    assert LRUCache(2).get(1) == -1


def test_put_then_get():
    c = LRUCache(2)
    c.put(1, 100)
    assert c.get(1) == 100


def test_evicts_the_least_recently_used():
    c = LRUCache(2)
    c.put(1, 1); c.put(2, 2); c.put(3, 3)
    assert (c.get(1), c.get(2), c.get(3)) == (-1, 2, 3)


def test_get_makes_a_key_most_recent():
    c = LRUCache(2)
    c.put(1, 1); c.put(2, 2)
    c.get(1)
    c.put(3, 3)                      # evicts 2, not 1
    assert (c.get(2), c.get(1)) == (-1, 1)


def test_put_on_existing_key_updates_and_makes_it_most_recent():
    c = LRUCache(2)
    c.put(1, 1); c.put(2, 2)
    c.put(1, 10)
    c.put(3, 3)                      # evicts 2, not 1
    assert (c.get(2), c.get(1)) == (-1, 10)


def test_capacity_one():
    c = LRUCache(1)
    c.put(1, 1); c.put(2, 2)
    assert (c.get(1), c.get(2)) == (-1, 2)


class SlowLRU:
    """Obviously correct, O(n): a list of (key, value), most recent last."""

    def __init__(self, capacity):
        self.capacity, self.items = capacity, []

    def get(self, key):
        for i, (k, v) in enumerate(self.items):
            if k == key:
                self.items.append(self.items.pop(i))
                return v
        return -1

    def put(self, key, value):
        for i, (k, _) in enumerate(self.items):
            if k == key:
                self.items.pop(i)
                break
        else:
            if len(self.items) == self.capacity:
                self.items.pop(0)
        self.items.append((key, value))


def test_matches_a_slow_reference_over_random_operations():
    rng = random.Random(1)
    fast, slow = LRUCache(3), SlowLRU(3)
    for step in range(2000):
        key = rng.randint(1, 6)
        if rng.random() < 0.5:
            assert fast.get(key) == slow.get(key), f"step {step}: get({key})"
        else:
            fast.put(key, step)
            slow.put(key, step)
```

#### Red: run them against an empty stub

```python
# file: lru.py
class LRUCache:
    def __init__(self, capacity):
        pass

    def get(self, key):
        raise NotImplementedError

    def put(self, key, value):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_lru.py
```

```text
FFFFFFF                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_lru.py::test_miss_returns_minus_one - NotImplementedError
FAILED test_lru.py::test_put_then_get - NotImplementedError
FAILED test_lru.py::test_evicts_the_least_recently_used - NotImplementedError
FAILED test_lru.py::test_get_makes_a_key_most_recent - NotImplementedError
FAILED test_lru.py::test_put_on_existing_key_updates_and_makes_it_most_recent - NotImplementedError
FAILED test_lru.py::test_capacity_one - NotImplementedError
FAILED test_lru.py::test_matches_a_slow_reference_over_random_operations - NotImplementedError
7 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. Which structure gives O(1) lookup by key?
2. Which structure lets you remove any element and add it at the front, both in O(1), if you already hold the element?
3. When you evict from the list, how do you also remove the entry from the dict?

#### Brute force first

A dict for values plus a Python list of keys in recency order. Every `get` and `put` removes the key from wherever it is in the list (O(n)) and appends it at the end. It's correct, and the tests will say so, but O(n).

#### The key insight

Combine two structures, each covering the other's weakness:

- **dict** `key → node`: O(1) lookup;
- **doubly linked list** of nodes in recency order: O(1) move-to-front and O(1) evict-from-back, because the dict hands you the node and the node knows its neighbours.

#### The plan (say this, then wait for a nod)

> **Say:** "In production I'd use OrderedDict, but I'll build it: a dict from key to node, and a doubly linked list in recency order with dummy head and tail, so unlinking and pushing to the front have no edge cases. get moves the node to the front; put updates or inserts at the front, and when over capacity evicts tail.prev and deletes its key from the dict. That's why nodes store their key. Everything is O(1)."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: dict + list of keys (correct, O(n))

```python
# file: lru.py
class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.values = {}
        self.order = []                    # keys, least recent first

    def _touch(self, key):
        if key in self.order:
            self.order.remove(key)         # O(n)
        self.order.append(key)

    def get(self, key):
        if key not in self.values:
            return -1
        self._touch(key)
        return self.values[key]

    def put(self, key, value):
        if key not in self.values and len(self.values) == self.capacity:
            oldest = self.order.pop(0)     # O(n)
            del self.values[oldest]
        self.values[key] = value
        self._touch(key)
```

```bash
pytest -q --tb=no -rf test_lru.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

All green. Now replace the O(n) list with the linked list.

#### Stage 2: dict + doubly linked list (with a classic slip)

A common first draft forgets that `put` on an existing key is a use, and only updates the value:

```python
# file: lru.py
class _Node:
    def __init__(self, key=None, val=None):
        self.key, self.val = key, val
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}                                   # key -> node
        self.head, self.tail = _Node(), _Node()         # sentinels
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, n):
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n):
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n

    def get(self, key):
        n = self.map.get(key)
        if n is None:
            return -1
        self._unlink(n)
        self._push_front(n)
        return n.val

    def put(self, key, value):
        if key in self.map:
            self.map[key].val = value                   # updated, but not moved to front
            return
        if len(self.map) == self.capacity:
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]                       # node stores its key for this
        n = _Node(key, value)
        self.map[key] = n
        self._push_front(n)
```

```bash
pytest -q --tb=no -rf test_lru.py
```

```text
....F.F                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_lru.py::test_put_on_existing_key_updates_and_makes_it_most_recent - assert (2, -1) ==...
FAILED test_lru.py::test_matches_a_slow_reference_over_random_operations - AssertionError: step 1...
2 failed, 5 passed in 0.01s
```

Two reds. The targeted test names the rule, and the random test found it independently.

#### Stage 3: an update is a use

```python
# file: lru.py
class _Node:
    def __init__(self, key=None, val=None):
        self.key, self.val = key, val
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}
        self.head, self.tail = _Node(), _Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, n):
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n):
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n

    def get(self, key):
        n = self.map.get(key)
        if n is None:
            return -1
        self._unlink(n)
        self._push_front(n)
        return n.val

    def put(self, key, value):
        if key in self.map:
            n = self.map[key]
            n.val = value
            self._unlink(n)                             # an update is a use
            self._push_front(n)
            return
        if len(self.map) == self.capacity:
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]
        n = _Node(key, value)
        self.map[key] = n
        self._push_front(n)
```

```bash
pytest -q --tb=no -rf test_lru.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

**Time:** O(1) for `get` and `put`. **Space:** O(capacity).

### Step 5 · Run everything and refactor

#### Trace capacity 2

| op | list after (front = most recent) | map keys | returns |
|---|---|---|---|
| put(1,1) | 1 | {1} | |
| put(2,2) | 2 ⇄ 1 | {1, 2} | |
| get(1) | 1 ⇄ 2 | {1, 2} | 1 |
| put(3,3) | full → evict tail.prev = 2 → 3 ⇄ 1 | {1, 3} | |
| get(2) | 3 ⇄ 1 | {1, 3} | -1 |

#### Refactor: validate capacity, tidy the helpers

Capacity 0 would make the eviction branch try to evict the `head` sentinel. Pin the rule first:

```python
# file: test_lru.py (append)
import pytest


def test_capacity_must_be_positive():
    with pytest.raises(ValueError):
        LRUCache(0)
```

```bash
pytest -q --tb=no -rf test_lru.py
```

```text
.......F                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_lru.py::test_capacity_must_be_positive - Failed: DID NOT RAISE ValueError
1 failed, 7 passed in 0.01s
```

```python
# file: lru.py
class _Node:
    __slots__ = ("key", "val", "prev", "next")

    def __init__(self, key=None, val=None):
        self.key, self.val = key, val
        self.prev: "_Node | None" = None
        self.next: "_Node | None" = None


class LRUCache:
    """O(1) get/put; evicts the least recently used key when full."""

    def __init__(self, capacity: int):
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self.map: dict = {}
        self.head, self.tail = _Node(), _Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def get(self, key):
        n = self.map.get(key)
        if n is None:
            return -1
        self._move_to_front(n)
        return n.val

    def put(self, key, value) -> None:
        n = self.map.get(key)
        if n is not None:
            n.val = value
            self._move_to_front(n)
            return
        if len(self.map) == self.capacity:
            self._evict()
        n = _Node(key, value)
        self.map[key] = n
        self._push_front(n)

    # --- list helpers --------------------------------------------------------
    def _evict(self) -> None:
        lru = self.tail.prev
        self._unlink(lru)
        del self.map[lru.key]

    def _move_to_front(self, n: _Node) -> None:
        self._unlink(n)
        self._push_front(n)

    def _unlink(self, n: _Node) -> None:
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n: _Node) -> None:
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n
```

```bash
pytest -q --tb=no -rf test_lru.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

For reference, the production version with `OrderedDict` passes the same tests:

```python
from collections import OrderedDict


class OrderedDictLRU:
    def __init__(self, capacity):
        self.capacity, self.data = capacity, OrderedDict()

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)             # most recent at the end
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)       # least recent at the front


c = OrderedDictLRU(2)
c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3)
print(c.get(2), c.get(1))
```

```text
-1 1
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Entries should expire after a TTL"

**What changes:**

- Each node stores `expires_at`. `put(key, value, ttl=None)` uses the cache's default TTL when none is given.
- **Lazy expiry:** on `get`, an expired entry is treated as a miss and removed. That avoids a background thread.
- Inject a **clock** (as in the rate limiter) so tests don't sleep.
- Mention an optional sweeper if expired-but-unread entries waste memory.

**Test first:**

```python
# file: test_lru.py (append)
class FakeClock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


def test_entries_expire_after_their_ttl():
    clock = FakeClock()
    c = LRUCache(2, default_ttl=10, clock=clock)
    c.put(1, 1)
    c.put(2, 2, ttl=100)
    clock.t = 9.9
    assert c.get(1) == 1
    clock.t = 10
    assert c.get(1) == -1            # expired exactly at 10s
    assert c.get(2) == 2             # its own TTL is longer
    assert len(c.map) == 1           # the expired entry was removed
```

```bash
pytest -q --tb=no -rf test_lru.py -k ttl
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_lru.py::test_entries_expire_after_their_ttl - TypeError: LRUCache.__init__() got an u...
1 failed, 8 deselected in 0.01s
```

```python
# file: lru.py
import time


class _Node:
    __slots__ = ("key", "val", "expires_at", "prev", "next")

    def __init__(self, key=None, val=None, expires_at=float("inf")):
        self.key, self.val, self.expires_at = key, val, expires_at
        self.prev: "_Node | None" = None
        self.next: "_Node | None" = None


class LRUCache:
    """O(1) get/put; LRU eviction; optional per-entry TTL with lazy expiry."""

    def __init__(self, capacity: int, default_ttl: float | None = None, clock=time.monotonic):
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self.default_ttl = default_ttl
        self.clock = clock
        self.map: dict = {}
        self.head, self.tail = _Node(), _Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def get(self, key):
        n = self.map.get(key)
        if n is None:
            return -1
        if self.clock() >= n.expires_at:       # lazy expiry
            self._unlink(n)
            del self.map[key]
            return -1
        self._move_to_front(n)
        return n.val

    def put(self, key, value, ttl: float | None = None) -> None:
        ttl = self.default_ttl if ttl is None else ttl
        expires_at = float("inf") if ttl is None else self.clock() + ttl
        n = self.map.get(key)
        if n is not None:
            n.val, n.expires_at = value, expires_at
            self._move_to_front(n)
            return
        if len(self.map) == self.capacity:
            self._evict()
        n = _Node(key, value, expires_at)
        self.map[key] = n
        self._push_front(n)

    def _evict(self) -> None:
        lru = self.tail.prev
        self._unlink(lru)
        del self.map[lru.key]

    def _move_to_front(self, n: _Node) -> None:
        self._unlink(n)
        self._push_front(n)

    def _unlink(self, n: _Node) -> None:
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n: _Node) -> None:
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n
```

```bash
pytest -q --tb=no -rf test_lru.py
```

```text
.........                                                                                    [100%]
9 passed in 0.01s
```

#### Follow-up 2: "Make it safe for many threads"

**First ask:** how much contention do you expect?

- **One lock** around `get` and `put` is correct and simple. Every operation touches the shared list, so even `get` needs it.
- **For a hot cache, shard:** split keys by hash into, say, 16 smaller caches, each with its own lock. Contention drops about 16×. The cost is that eviction becomes only *approximately* LRU across the whole cache (each shard evicts its own oldest), which is usually acceptable.

The tests you'd write first: many threads doing random gets and puts, then check the invariants: `len(map) ≤ capacity`, and walking the list from head to tail visits exactly the keys in the map.

> **Say:** "Sharding trades exact global LRU for throughput. I'd confirm that's acceptable before doing it."

### Mock dialogue

**Interviewer:** Implement an LRU cache with get and put in constant time.

**You:** Get returns -1 on a miss? And updating an existing key counts as using it?

**Interviewer:** Yes to both.

**You:** Before coding, my tests: miss, hit, eviction of the least recently used, get refreshing a key, put on an existing key refreshing it, and capacity one. Plus a random test against a slow list-based version.

**You:** In production I’d reach for OrderedDict, but I’ll build the structure itself. I need constant-time lookup, which is a dictionary, and a recency order where I can move any item to the front and drop the oldest, which is a doubly linked list. The dictionary maps keys to list nodes.

**You:** I’ll use dummy head and tail nodes, so unlinking and pushing to the front have no edge cases.

**Interviewer:** Why doubly linked?

**You:** To remove a node in constant time I need its predecessor. With only next pointers I’d have to search from the head.

**You:** All green. The put-updates-recency test is the one most people miss.

**Interviewer:** Make it safe for many threads.

**You:** How much contention do you expect? A single lock around get and put is correct and simple. For a hot cache I’d shard: split keys by hash into, say, 16 smaller caches, each with its own lock. Eviction becomes approximately LRU across the whole cache, which is usually acceptable.

> *Why this works:* Naming the cost of sharding (approximate global LRU) shows you know the trade, not just the trick.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Updating an existing key without moving it to the front | The just-updated key gets evicted next. | `test_put_on_existing_key_updates_and_makes_it_most_recent` |
| Not storing the key on the node | Eviction can't delete the entry from the dict. | `test_evicts_the_least_recently_used` (crashes) |
| Singly linked list | Unlinking needs the predecessor: O(n). | None (speed); explain `prev`. |
| No sentinels | Special cases for empty/first/last; easy to break one. | `test_capacity_one`, the random test |
| Capacity 0 not rejected | Evicts the head sentinel and corrupts the list. | `test_capacity_must_be_positive` |
| Expiring entries with a background thread first | Complexity you don't need; lazy expiry is enough. | `test_entries_expire_after_their_ttl` |
