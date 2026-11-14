### Problem

Records `(timestamp, price)` arrive out of order, and a later record for the same timestamp corrects the earlier one. Support `update`, `current` (price at the latest timestamp), `maximum` and `minimum`.

### Interview refresher

A dict from timestamp to price is the source of truth; `latest` tracks the maximum timestamp, so `current()` is a lookup. On every update, push `(-price, ts)` onto a max-heap and `(price, ts)` onto a min-heap, and never delete. On `maximum()` or `minimum()`, pop tops while `prices[ts]` differs from the heap’s price (those are stale corrections), then return the top. It’s correct because every live price has a valid entry somewhere in the heap, and amortised O(log n) because each entry is popped at most once. Store the timestamp in the entry, since price alone is ambiguous. If memory grows, rebuild the heaps once stale entries exceed half.

### Hints

1. Corrections mean old prices must disappear from max/min. Deleting from a heap is expensive; can you delete lazily?
2. Keep the source of truth in a dict. A heap entry is stale if it disagrees with the dict.

### Approach

Dict `timestamp → price` plus a max-heap and min-heap of `(price, timestamp)`. On read, pop heap tops until the entry matches the dict. Each entry is pushed and popped at most once, so amortised cost is O(log n).

### Deep dive

#### What the interviewer is really testing

Keeping a max and min available when old values can be overwritten. The technique, lazy deletion, recurs in leaderboards, schedulers and popularity trackers.

#### Why the obvious options fall short

- **Scan the dictionary on every `maximum()`.** O(n) per query; too slow if queries are frequent.
- **A sorted list of prices.** Fast max and min, but inserting or removing in the middle is O(n).
- **A heap.** Max is O(1) to peek and O(log n) to insert. But when a price is corrected, the old price is buried somewhere inside, and finding it is O(n).

#### The idea: don’t delete, verify

Instead of removing the outdated entry when a correction arrives, leave it. The dictionary `timestamp → price` is the source of truth. When you read the heap’s top, check it against the dictionary. If that timestamp now has a different price, the entry is stale: pop it and check the next. Stop at the first entry that agrees.

#### Why that gives the right answer

Every current price was pushed when it was set, so a valid entry for it is somewhere in the heap. Only stale entries could sit above it incorrectly, and you throw those away. So the first valid entry you reach is the true maximum.

#### Why it’s still fast

Each entry is pushed once and popped at most once. One query might pop several stale entries, but across all operations total pops can’t exceed total pushes. That’s amortised O(log n).

#### Why the entry stores the timestamp

You can’t detect staleness from price alone: two timestamps might share a price. The timestamp is the key you look up.

#### Why two heaps

Python’s `heapq` only does min-heaps. For the max-heap we store negative prices so the largest real price sits on top.

```text
update(1,10) update(2,5)  max-heap: (-10,1) (-5,2)
update(1,3)                 max-heap: (-10,1) (-5,2) (-3,1)
maximum(): top (-10,1) but prices[1]=3 → stale, pop
           top (-5,2), prices[2]=5 → valid → 5
```

#### Why `latest` is tracked separately

Records arrive out of order, so “current” means the largest timestamp seen, not the most recent call.

### Reference solution

```python
import heapq


class StockPrice:
    def __init__(self):
        self.prices: dict[int, int] = {}
        self.latest = 0
        self.max_heap: list[tuple[int, int]] = []
        self.min_heap: list[tuple[int, int]] = []

    def update(self, timestamp: int, price: int) -> None:
        self.prices[timestamp] = price
        self.latest = max(self.latest, timestamp)
        heapq.heappush(self.max_heap, (-price, timestamp))
        heapq.heappush(self.min_heap, (price, timestamp))

    def current(self) -> int:
        return self.prices[self.latest]

    def maximum(self) -> int:
        while -self.max_heap[0][0] != self.prices[self.max_heap[0][1]]:
            heapq.heappop(self.max_heap)
        return -self.max_heap[0][0]

    def minimum(self) -> int:
        while self.min_heap[0][0] != self.prices[self.min_heap[0][1]]:
            heapq.heappop(self.min_heap)
        return self.min_heap[0][0]


s = StockPrice()
s.update(1, 10); s.update(2, 5)
assert (s.current(), s.maximum()) == (5, 10)
s.update(1, 3)
assert (s.maximum(), s.minimum()) == (5, 3)
```

**Time:** O(log n) amortised  
**Space:** O(updates)

### Questions to ask before coding

- Can records arrive out of timestamp order?
- Does a second record for the same timestamp replace the first?
- Roughly how many updates versus queries?
- Is memory a concern if corrections are frequent?

### Interview walkthrough

**Interviewer:** You receive stock records as timestamp and price. Some arrive late, and some correct earlier records. Support update, current, maximum and minimum.

**You:** So a later record with the same timestamp overwrites the earlier price, and current means the price at the largest timestamp seen?

**Interviewer:** Exactly.

**You:** I’ll keep a dictionary from timestamp to price as the source of truth, plus the max timestamp, so current is a lookup. For max and min, scanning the dictionary is linear; I’d like better.

**You:** A heap gives fast max, but corrections leave old prices inside it, and removing them is expensive. So I’ll delete lazily: push every update, and when reading the top, check it against the dictionary. If it disagrees, it’s outdated: pop it and look again.

**Interviewer:** Is that efficient?

**You:** Each entry is pushed once and popped at most once, so it’s amortised O(log n) per operation, even though a single call might do several pops.

> *Why this works:* Explain the amortised argument in one sentence. It’s the part interviewers probe most.

**You:** Testing: 10 at t1, 5 at t2; max is 10. Correct t1 to 3; max must now be 5 and min 3. The stale (10, t1) entry is discarded on read.

**Interviewer:** Memory keeps growing with corrections. Thoughts?

**You:** How frequent are corrections in practice? If rare, it doesn’t matter. If common, I’d count stale entries and rebuild both heaps from the dictionary once they exceed half the heap: O(n) occasionally, but memory stays bounded.

### Scale-up follow-up

**Interviewer adds:** “Memory is growing without bound because of stale heap entries.”

Track the stale count; when it exceeds half the heap, rebuild both heaps from the dict in O(n). Alternatively use a sorted container keyed by price with a count, which supports real deletion in O(log n).

### Where candidates slip

- Comparing only price when checking staleness, which breaks when two timestamps share a price.
- Forgetting that latest is the max timestamp, not the most recent call.
