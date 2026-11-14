### Problem

A fixed-capacity cache with O(1) `get` and `put`, evicting the least recently used key when full.

### Interview refresher

A hashmap from key to node, plus a doubly linked list ordered by recency with dummy head and tail so unlink and push-front need no edge cases. `get`: a miss returns -1; a hit moves the node to the front. `put`: an existing key is updated and moved to the front; when full, evict `tail.prev` and delete its key from the map (which is why nodes store their keys); then insert at the front. All O(1). It must be doubly linked because O(1) removal needs the predecessor. Mention `OrderedDict` as the production answer. For threads, use one lock, or shard by key hash and accept approximate global LRU.

### Hints

1. Hashmap for lookup, doubly linked list for recency order.
2. Two sentinel nodes mean you never check for None neighbours.

### Approach

Most-recent at the head, least-recent at the tail. `get` moves the node to the front. `put` updates-and-moves, or evicts `tail.prev` if full, then inserts at the front.

### Deep dive

#### What the interviewer is really testing

Combining two structures so each covers the other’s weakness, and writing pointer code that’s easy to read.

#### List the operations you need

- Find a key’s value in O(1): a dictionary.
- Mark a key as “just used” by moving it to the front of a recency order, in O(1).
- Find and remove the least recently used key when full, in O(1).

The last two need an ordered sequence where you can pull out any element and put it at the front. A Python list can’t: removing from the middle shifts everything (O(n)).

#### Why a doubly linked list

In a linked list, removing a node is just re-pointing its neighbours, O(1), *if* you already have the node and can reach its predecessor. The dictionary gives you the node instantly; the `prev` pointer gives the predecessor. A singly linked list would need a search to find it.

#### Why the node stores its key

When evicting, you find the victim from the list’s tail, not via the dictionary. To delete it from the dictionary too, you need its key, so the node carries it.

#### Why sentinels

A dummy head and tail mean every real node always has two neighbours. No special cases for “empty cache”, “one item” or “removing the first node”. `_unlink` and `_push_front` become two-line helpers with no `if`s.

#### A rule people forget

Updating an existing key with `put` counts as using it, so it must move to the front, not just change value.

```text
capacity 2
put(1) put(2)    head ⇄ 2 ⇄ 1 ⇄ tail
get(1)           head ⇄ 1 ⇄ 2 ⇄ tail
put(3) full → evict tail.prev = 2
                 head ⇄ 3 ⇄ 1 ⇄ tail
```

#### What to say about OrderedDict

Python’s `OrderedDict` with `move_to_end` does all of this. Say you’d use it in production, then build the underlying structure, because that’s what the question is about.

### Reference solution

```python
class _Node:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.map: dict[int, _Node] = {}
        self.head, self.tail = _Node(), _Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, n: _Node) -> None:
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n: _Node) -> None:
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n

    def get(self, key: int) -> int:
        n = self.map.get(key)
        if n is None:
            return -1
        self._unlink(n); self._push_front(n)
        return n.val

    def put(self, key: int, value: int) -> None:
        if key in self.map:
            n = self.map[key]
            n.val = value
            self._unlink(n); self._push_front(n)
            return
        if len(self.map) == self.capacity:
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]
        n = _Node(key, value)
        self.map[key] = n
        self._push_front(n)


c = LRUCache(2)
c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3)
assert (c.get(2), c.get(1), c.get(3)) == (-1, 1, 3)
```

**Time:** O(1)  
**Space:** O(capacity)

### Questions to ask before coding

- Should `put` on an existing key count as a use?
- What should `get` return on a miss?
- Is it accessed from multiple threads?
- Can I mention OrderedDict, or do you want the structure built by hand?

### Interview walkthrough

**Interviewer:** Implement an LRU cache with get and put in constant time.

**You:** Get returns -1 on a miss? And updating an existing key counts as using it?

**Interviewer:** Yes to both.

**You:** In production I’d reach for OrderedDict, but I’ll build the structure itself. I need constant-time lookup, which is a dictionary, and a recency order where I can move any item to the front and drop the oldest, which is a doubly linked list. The dictionary maps keys to list nodes.

**You:** I’ll use dummy head and tail nodes, so unlinking and pushing to the front have no edge cases.

**Interviewer:** Why doubly linked?

**You:** To remove a node in constant time I need its predecessor. With only next pointers I’d have to search from the head.

**You:** Testing with capacity 2: put 1 and 2, get 1, put 3. Key 2 was least recently used, so it’s evicted and get(2) returns -1.

**Interviewer:** Make it safe for many threads.

**You:** How much contention do you expect? A single lock around get and put is correct and simple. For a hot cache I’d shard: split keys by hash into, say, 16 smaller caches, each with its own lock. Eviction becomes approximately LRU across the whole cache, which is usually acceptable.

> *Why this works:* Naming the cost of sharding (approximate global LRU) shows you know the trade, not just the trick.

### Scale-up follow-up

**Interviewer adds:** “Add a TTL per entry” or “make it thread-safe.”

TTL: store `expires_at` on the node and treat expired entries as misses on read (lazy), plus an optional sweeper. Thread safety: one lock around get/put is correct; for high contention, shard the cache by key hash, each shard with its own lock and LRU.

### Where candidates slip

- Forgetting to store the key on the node, so eviction can't delete from the map.
- Updating an existing key without moving it to the front.
