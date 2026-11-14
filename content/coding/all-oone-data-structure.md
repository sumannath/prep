### Problem

Support `inc(key)`, `dec(key)`, `get_max_key()` and `get_min_key()`, all in O(1).

### Interview refresher

Counts change by exactly ±1, so keep a doubly linked list of count buckets in ascending order (each a set of keys) between a sentinel head (count 0) and tail, plus a map from key to bucket. `inc`: if the next bucket isn’t count+1, insert one right after the current bucket, move the key there, and remove the old bucket if it’s empty. `dec` mirrors this toward the previous bucket, or drops the key at count 1. Max is `tail.prev` and min is `head.next`, so everything is O(1). Insert the destination before emptying the source, because the source is your position in the list. Top-k is a walk back from the tail in O(k).

### Hints

1. A heap is O(log n). To hit O(1), counts only ever change by ±1 — exploit that.
2. A doubly linked list of buckets ordered by count; each bucket holds the set of keys at that count.
3. Sentinel head/tail buckets remove most of the edge cases.

### Approach

Buckets in ascending count order between two sentinels. A dict maps key → its bucket. `inc` moves the key to the next bucket (creating count+1 if missing); `dec` moves it back (or drops it at 0). Remove buckets that become empty. Max is `tail.prev`, min is `head.next`.

### Deep dive

#### What the interviewer is really testing

Designing a structure from constraints. “Everything in O(1)” rules out heaps and sorting, so you need the property of the problem that makes constant time possible.

#### Why the usual tools fail

A dictionary of counts makes `inc` and `dec` O(1), but finding the max or min key means scanning: O(n). A heap gives the max quickly but updates are O(log n), and one heap can’t give min and max together.

#### The property that unlocks it

Counts only ever change by exactly one. A key at count 5 can only move to 4 or 6. If all counts are kept in sorted order, a key always moves to a *neighbouring* position. You never search for where it goes; it’s right next door.

#### Why a linked list of buckets

Keep a chain of “buckets”, one per distinct count, ascending. Each bucket holds the set of keys with that count.

- **Why buckets, not one node per key?** If ten thousand keys have count 5, a node-per-key list makes a key walk past all of them to reach count 6. With buckets they share one node, and the next count is one hop away.
- **Why doubly linked?** `inc` needs the next bucket, `dec` the previous, and removing an empty bucket in O(1) needs both neighbours.
- **Why a set inside each bucket?** Adding and removing a specific key is O(1).
- **Why a dictionary from key to bucket?** To find a key’s bucket in O(1) without walking the list.

#### Why sentinels

Dummy head (count 0) and tail buckets mean the list is never empty and every real bucket has neighbours. A brand-new key is treated as if it lived in the head at count 0, so `inc` on a new key runs the same code as on an existing one. Max is always `tail.prev`; min is `head.next`.

#### Why insert before removing

Moving a key from bucket 5 to 6, you create bucket 6 right after bucket 5 if it doesn’t exist. You need bucket 5 to know *where* to insert. Only then do you remove the key from bucket 5 and delete bucket 5 if it’s empty. Reverse the order and you’ve lost your position.

```text
inc a: head ⇄ [1:{a}] ⇄ tail
inc a: insert [2] after [1], move a, [1] empty → removed
       head ⇄ [2:{a}] ⇄ tail
inc b: head ⇄ [1:{b}] ⇄ [2:{a}] ⇄ tail
max = tail.prev → a      min = head.next → b
```

### Reference solution

```python
class _Bucket:
    __slots__ = ("count", "keys", "prev", "next")
    def __init__(self, count: int):
        self.count, self.keys = count, set()
        self.prev = self.next = None


class AllOne:
    def __init__(self):
        self.head, self.tail = _Bucket(0), _Bucket(0)
        self.head.next, self.tail.prev = self.tail, self.head
        self.where: dict[str, _Bucket] = {}

    def _insert_after(self, node: _Bucket, count: int) -> _Bucket:
        b = _Bucket(count)
        b.prev, b.next = node, node.next
        node.next.prev = b
        node.next = b
        return b

    def _drop_if_empty(self, b: _Bucket) -> None:
        if not b.keys:
            b.prev.next, b.next.prev = b.next, b.prev

    def inc(self, key: str) -> None:
        cur = self.where.get(key, self.head)
        nxt = cur.next
        if nxt is self.tail or nxt.count != cur.count + 1:
            nxt = self._insert_after(cur, cur.count + 1)
        nxt.keys.add(key)
        self.where[key] = nxt
        if cur is not self.head:
            cur.keys.discard(key)
            self._drop_if_empty(cur)

    def dec(self, key: str) -> None:
        cur = self.where[key]
        if cur.count == 1:
            del self.where[key]
        else:
            prv = cur.prev
            if prv is self.head or prv.count != cur.count - 1:
                prv = self._insert_after(cur.prev, cur.count - 1)
            prv.keys.add(key)
            self.where[key] = prv
        cur.keys.discard(key)
        self._drop_if_empty(cur)

    def get_max_key(self) -> str:
        return next(iter(self.tail.prev.keys)) if self.tail.prev is not self.head else ""

    def get_min_key(self) -> str:
        return next(iter(self.head.next.keys)) if self.head.next is not self.tail else ""


a = AllOne()
a.inc("page-a"); a.inc("page-a"); a.inc("page-b")
assert (a.get_max_key(), a.get_min_key()) == ("page-a", "page-b")
a.dec("page-a"); a.dec("page-a")
assert a.get_max_key() == "page-b"
```

**Time:** O(1) every operation  
**Space:** O(keys)

### Questions to ask before coding

- Will `dec` only be called on keys that exist?
- When several keys share the max count, can I return any of them?
- Should a key disappear entirely when its count reaches zero?
- Is a top-k query likely to follow?

### Interview walkthrough

**Interviewer:** Track page popularity. Increment, decrement, and get the most and least popular page, all in constant time.

**You:** When several pages tie for most popular, can I return any one? And when a count drops to zero, should the page vanish from min?

**Interviewer:** Any one is fine. Yes, it disappears.

**You:** Let me reason about why constant time is possible. A dictionary of counts handles increments, but max and min would need a scan, and a heap gets me log time. The key observation is that counts only move by one, so if counts are kept in order, a page only ever moves to an adjacent position.

> *Why this works:* Narrate the reasoning that leads to the structure. Jumping straight to “doubly linked list of buckets” looks memorised; deriving it looks senior.

**You:** So: a doubly linked list of buckets, one per distinct count in ascending order, each holding a set of pages. A dictionary maps page to bucket. Sentinel buckets at both ends. Max is the bucket before the tail; min is the one after the head.

**Interviewer:** Why buckets rather than a node per page?

**You:** Many pages can share a count. With a node per page, moving up would mean walking past every page at the same count. With buckets, the next count is always one hop.

**You:** One ordering detail while I code: I create the destination bucket before removing the page from its current bucket, because the current bucket tells me where to insert.

**You:** Testing: increment page-a twice and page-b once; max is a, min is b. Decrement a twice; a disappears, so max is b.

**Interviewer:** How would you return the top three pages?

**You:** Walk backwards from the bucket before the tail, collecting pages until I have three. Buckets are already ordered, so that’s proportional to k. Do ties at the boundary need a rule?

### Scale-up follow-up

**Interviewer adds:** “Return the top 3 most popular pages, not just one.”

Walk backwards from `tail.prev` collecting keys until you have k. That's O(k) because buckets are already ordered — a nice payoff for the structure you chose.

### Where candidates slip

- Removing the old bucket before inserting the new one, losing your anchor in the list.
- Forgetting to delete the key from the map when its count hits zero.
