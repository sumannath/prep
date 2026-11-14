### Problem

Records `(timestamp, price)` arrive out of order, and a later record for the same timestamp corrects the earlier one. Support `update`, `current` (price at the latest timestamp), `maximum` and `minimum`.

#### In plain words

A feed sends you stock prices, each stamped with a time. Two complications:

- **Out of order:** the record for t=3 might arrive after the one for t=5.
- **Corrections:** a second record for the same timestamp replaces the first. The old price no longer exists.

You must answer, at any moment:

- `current()`: the price at the **largest timestamp** seen so far;
- `maximum()` / `minimum()`: the highest / lowest price among **current** records (corrected-away prices don't count).

#### Words used on this page

| Term | Meaning |
|---|---|
| Source of truth | The one structure that's always right. Here, a dict `timestamp → price`. |
| Heap | Gives you its smallest item in O(1); adding and removing the top cost O(log n). |
| Max-heap via negation | Python only has min-heaps; store `-price` so the largest price sits on top. |
| Stale entry | A heap entry whose price no longer matches the dict (it was corrected). |
| Lazy deletion | Don't remove stale entries when they go stale; skip them when they reach the top. |
| Amortised | Some calls do extra work, but averaged over all calls each costs the stated amount. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

A dict from timestamp to price is the source of truth; `latest` tracks the maximum timestamp, so `current()` is a lookup. On every update, push `(-price, ts)` onto a max-heap and `(price, ts)` onto a min-heap, and never delete. On `maximum()` or `minimum()`, pop tops while `prices[ts]` differs from the heap’s price (those are stale corrections), then return the top. It’s correct because every live price has a valid entry somewhere in the heap, and amortised O(log n) because each entry is popped at most once. Store the timestamp in the entry, since price alone is ambiguous. If memory grows, rebuild the heaps once stale entries exceed half.

**Cheat sheet**

1. **Ask:** out of order? same timestamp replaces? update vs query ratio? empty queries? memory?
2. **Tests first:** current = latest ts, late record doesn't move current, max/min, correction removes old price, correction of latest.
3. **Build:** dict + `latest` + max-heap `(-p, ts)` + min-heap `(p, ts)`; pop stale tops on read.
4. **Cost:** O(log n) amortised per operation; O(updates) memory.
5. **Follow-ups:** bound memory by rebuilding when stale > live; or a sorted container with real deletes.

### Background you need

#### 1. Heaps with `heapq`

`heapq` keeps a plain list arranged so that `heap[0]` is always the smallest item. `heappush` and `heappop` cost O(log n).

```python
import heapq

h = []
for x in [5, 1, 8, 3]:
    heapq.heappush(h, x)
print(h[0], heapq.heappop(h), h[0])
```

```text
1 1 3
```

#### 2. A max-heap by negating

There's no max-heap in `heapq`. Push `-price` instead: the most negative value (the biggest price) sits on top, and you negate again when reading.

```python
import heapq

h = []
for price in [10, 5, 30]:
    heapq.heappush(h, -price)
print(-h[0])
```

```text
30
```

#### 3. Why "just delete the old price" is hard

A heap is only ordered enough to find the top. A corrected price may be buried anywhere inside it, and finding it takes O(n). So we **don't** delete it. We leave it there and **check the top against the dict** whenever we read. If the dict disagrees, the top is stale: pop it and look again.

#### 4. Tuples in a heap

Tuples compare element by element, so `(price, timestamp)` orders by price first. We store the timestamp so we can look the entry up in the dict: price alone can't tell you whether an entry is stale, because two timestamps can share a price.

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Can records arrive out of timestamp order? | Decides what "current" means. | Yes → track `latest = max(latest, ts)`, not "the last call". |
| Does a second record for the same timestamp replace the first? | Corrections are the whole difficulty. | Yes → the dict overwrites; heaps need lazy deletion. No (append-only) → plain heaps are enough. |
| Roughly how many updates vs queries? | Picks the trade-off. | Queries rare → just scan the dict, O(n). Queries frequent → heaps with lazy deletion. |
| What should `current/maximum/minimum` do before any update? | Edge case. | Raise a clear error (usual), or return `None`. |
| Are corrections frequent? Is memory tight? | Stale entries pile up. | Rare → ignore. Frequent → rebuild heaps periodically (see Follow-ups). |

**If they say "your call", state your defaults out loud:**

> "Records can arrive out of order; a repeat timestamp replaces the old price; queries are frequent; querying before any update raises ValueError; and I'll handle memory growth as a follow-up."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass."

#### Work the correction example by hand

```text
update(1, 10)   prices {1: 10}         max 10  min 10
update(2, 5)    prices {1: 10, 2: 5}   max 10  min 5   current 5
update(1, 3)    prices {1: 3, 2: 5}    max 5   min 3   (10 no longer exists)
```

#### The tests, one per requirement

Code in `stock.py`, tests in `test_stock.py`.

```python
# file: test_stock.py
from stock import StockPrice


def test_current_is_the_price_at_the_latest_timestamp():
    s = StockPrice()
    s.update(1, 10)
    s.update(2, 5)
    assert s.current() == 5


def test_a_late_record_does_not_change_current():
    s = StockPrice()
    s.update(5, 10)
    s.update(3, 20)          # arrives later, but is older
    assert s.current() == 10


def test_maximum_and_minimum():
    s = StockPrice()
    for ts, price in [(1, 10), (2, 5), (3, 7)]:
        s.update(ts, price)
    assert (s.maximum(), s.minimum()) == (10, 5)


def test_a_correction_removes_the_old_price():
    s = StockPrice()
    s.update(1, 10)
    s.update(2, 5)
    s.update(1, 3)           # 10 is gone
    assert (s.maximum(), s.minimum()) == (5, 3)


def test_correcting_the_latest_timestamp_changes_current():
    s = StockPrice()
    s.update(1, 10)
    s.update(1, 4)
    assert (s.current(), s.maximum(), s.minimum()) == (4, 4, 4)
```

#### Red: run them against an empty stub

```python
# file: stock.py
class StockPrice:
    def update(self, timestamp, price):
        pass

    def current(self):
        raise NotImplementedError

    def maximum(self):
        raise NotImplementedError

    def minimum(self):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_stock.py
```

```text
FFFFF                                                                                        [100%]
===================================== short test summary info =====================================
FAILED test_stock.py::test_current_is_the_price_at_the_latest_timestamp - NotImplementedError
FAILED test_stock.py::test_a_late_record_does_not_change_current - NotImplementedError
FAILED test_stock.py::test_maximum_and_minimum - NotImplementedError
FAILED test_stock.py::test_a_correction_removes_the_old_price - NotImplementedError
FAILED test_stock.py::test_correcting_the_latest_timestamp_changes_current - NotImplementedError
5 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. Which single structure always knows the right price for each timestamp?
2. A heap gives a fast max, but a corrected price is buried inside it. Do you have to remove it right away?
3. How could you tell, when an entry reaches the top, that it's out of date?

#### The obvious options

| Option | `maximum()` | Correction | Verdict |
|---|---|---|---|
| Scan the dict | O(n) | O(1) | Fine if queries are rare. |
| Sorted list of prices | O(1) | O(n) to remove + insert | Slow updates. |
| Heap, delete the old entry | O(1) peek | O(n) to find it | Slow updates. |
| **Heap + lazy deletion** | O(log n) amortised | O(log n) | ✓ |

#### The key insight: don't delete, verify

Keep the dict as the source of truth. Push every update onto the heaps and never delete. When reading, check the top against the dict; if they disagree, pop and repeat.

**Why it's right:** every current price was pushed when it was set, so a valid entry for it is somewhere in the heap. Only stale entries can sit above it, and you throw those away.

**Why it's fast:** each entry is pushed once and popped at most once. One query might pop several, but total pops can never exceed total pushes, so the cost is amortised O(log n).

#### The plan (say this, then wait for a nod)

> **Say:** "A dict from timestamp to price is the source of truth, plus the max timestamp for current. For max and min I'll push every update onto a max-heap and a min-heap and delete lazily: when reading the top, if the dict has a different price for that timestamp, it's stale, so I pop and look again. Each entry is pushed and popped at most once, so it's amortised O(log n)."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: dict + scan (correct, O(n) queries)

```python
# file: stock.py
class StockPrice:
    def __init__(self):
        self.prices = {}            # timestamp -> price (source of truth)
        self.latest = 0

    def update(self, timestamp, price):
        self.prices[timestamp] = price
        self.latest = max(self.latest, timestamp)

    def current(self):
        return self.prices[self.latest]

    def maximum(self):
        return max(self.prices.values())      # O(n)

    def minimum(self):
        return min(self.prices.values())      # O(n)
```

```bash
pytest -q --tb=no -rf test_stock.py
```

```text
.....                                                                                        [100%]
5 passed in 0.01s
```

All green: the dict alone is *correct*. Now make `maximum`/`minimum` fast without breaking anything.

#### Stage 2: heaps without handling corrections

> **Say:** "Heaps for max and min."

```python
# file: stock.py
import heapq


class StockPrice:
    def __init__(self):
        self.prices = {}
        self.latest = 0
        self.max_heap = []          # (-price, timestamp)
        self.min_heap = []          # (price, timestamp)

    def update(self, timestamp, price):
        self.prices[timestamp] = price
        self.latest = max(self.latest, timestamp)
        heapq.heappush(self.max_heap, (-price, timestamp))
        heapq.heappush(self.min_heap, (price, timestamp))

    def current(self):
        return self.prices[self.latest]

    def maximum(self):
        return -self.max_heap[0][0]

    def minimum(self):
        return self.min_heap[0][0]
```

```bash
pytest -q --tb=no -rf test_stock.py
```

```text
...FF                                                                                        [100%]
===================================== short test summary info =====================================
FAILED test_stock.py::test_a_correction_removes_the_old_price - assert (10, 3) == (5, 3)
FAILED test_stock.py::test_correcting_the_latest_timestamp_changes_current - assert (4, 10, 4) ==...
2 failed, 3 passed in 0.01s
```

Red on both correction tests: the corrected-away 10 is still on top of the max-heap.

#### Stage 3: lazy deletion

> **Say:** "On read, pop tops whose price disagrees with the dict."

```python
# file: stock.py
import heapq


class StockPrice:
    def __init__(self):
        self.prices = {}
        self.latest = 0
        self.max_heap = []
        self.min_heap = []

    def update(self, timestamp, price):
        self.prices[timestamp] = price
        self.latest = max(self.latest, timestamp)
        heapq.heappush(self.max_heap, (-price, timestamp))
        heapq.heappush(self.min_heap, (price, timestamp))

    def current(self):
        return self.prices[self.latest]

    def maximum(self):
        while -self.max_heap[0][0] != self.prices[self.max_heap[0][1]]:
            heapq.heappop(self.max_heap)      # stale: that timestamp was corrected
        return -self.max_heap[0][0]

    def minimum(self):
        while self.min_heap[0][0] != self.prices[self.min_heap[0][1]]:
            heapq.heappop(self.min_heap)
        return self.min_heap[0][0]
```

```bash
pytest -q --tb=no -rf test_stock.py
```

```text
.....                                                                                        [100%]
5 passed in 0.01s
```

**Time:** `update` O(log n); `maximum`/`minimum` O(log n) amortised; `current` O(1). **Space:** O(number of updates).

### Step 5 · Run everything and refactor

#### Trace the correction example

| step | prices | max-heap (top first) | `maximum()` does | returns |
|---|---|---|---|---|
| `update(1,10)` | {1:10} | (-10,1) | | |
| `update(2,5)` | {1:10, 2:5} | (-10,1) (-5,2) | | |
| `update(1,3)` | {1:3, 2:5} | (-10,1) (-5,2) (-3,1) | | |
| `maximum()` | | | top (-10,1): prices[1]=3 ≠ 10 → pop. top (-5,2): prices[2]=5 ✓ | **5** |

#### Refactor: a clear error before any data

Right now `current()` on an empty object raises a confusing `KeyError: 0`, and `maximum()` an `IndexError`. Agree on behaviour and pin it down:

```python
# file: test_stock.py (append)
import pytest


def test_queries_before_any_update_raise_value_error():
    s = StockPrice()
    for query in (s.current, s.maximum, s.minimum):
        with pytest.raises(ValueError):
            query()
```

```bash
pytest -q --tb=no -rf test_stock.py
```

```text
.....F                                                                                       [100%]
===================================== short test summary info =====================================
FAILED test_stock.py::test_queries_before_any_update_raise_value_error - KeyError: 0
1 failed, 5 passed in 0.01s
```

Refactor with a shared helper for the lazy pop, so the max and min logic can't drift apart:

```python
# file: stock.py
import heapq


class StockPrice:
    def __init__(self):
        self.prices: dict[int, int] = {}            # source of truth
        self.latest: int | None = None
        self.max_heap: list[tuple[int, int]] = []   # (-price, ts), may hold stale entries
        self.min_heap: list[tuple[int, int]] = []   # (price, ts), may hold stale entries

    def update(self, timestamp: int, price: int) -> None:
        self.prices[timestamp] = price
        if self.latest is None or timestamp > self.latest:
            self.latest = timestamp
        heapq.heappush(self.max_heap, (-price, timestamp))
        heapq.heappush(self.min_heap, (price, timestamp))

    def current(self) -> int:
        self._require_data()
        return self.prices[self.latest]

    def maximum(self) -> int:
        return -self._valid_top(self.max_heap, sign=-1)

    def minimum(self) -> int:
        return self._valid_top(self.min_heap, sign=1)

    def _valid_top(self, heap: list[tuple[int, int]], sign: int) -> int:
        self._require_data()
        while sign * heap[0][0] != self.prices[heap[0][1]]:
            heapq.heappop(heap)                       # lazy deletion of stale entries
        return heap[0][0]

    def _require_data(self) -> None:
        if not self.prices:
            raise ValueError("no prices yet")
```

```bash
pytest -q --tb=no -rf test_stock.py
```

```text
......                                                                                       [100%]
6 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Memory keeps growing because of stale entries"

**First ask:** how frequent are corrections? If they're rare, it doesn't matter.

**What changes:** stale entries are never removed unless they reach the top. A timestamp corrected 1,000 times leaves 999 dead entries. The fix: when a heap holds more than twice as many entries as there are live prices (so more than half are stale), **rebuild** both heaps from the dict in O(n). Rebuilds are rare, so the amortised cost stays O(log n) and memory stays at most 2× the live data.

**Test first:**

```python
# file: test_stock.py (append)
def test_heaps_stay_bounded_under_repeated_corrections():
    s = StockPrice()
    for price in range(1000):
        s.update(1, price)
    assert s.maximum() == 999
    assert len(s.max_heap) <= 2 and len(s.min_heap) <= 2
```

```bash
pytest -q --tb=no -rf test_stock.py -k bounded
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_stock.py::test_heaps_stay_bounded_under_repeated_corrections - assert (1000 <= 2)
1 failed, 6 deselected in 0.01s
```

Add the rebuild at the end of `update`:

```python
# file: stock.py (replace StockPrice)
class StockPrice:
    def __init__(self):
        self.prices: dict[int, int] = {}
        self.latest: int | None = None
        self.max_heap: list[tuple[int, int]] = []
        self.min_heap: list[tuple[int, int]] = []

    def update(self, timestamp: int, price: int) -> None:
        self.prices[timestamp] = price
        if self.latest is None or timestamp > self.latest:
            self.latest = timestamp
        heapq.heappush(self.max_heap, (-price, timestamp))
        heapq.heappush(self.min_heap, (price, timestamp))
        if len(self.max_heap) > 2 * len(self.prices):   # over half stale → rebuild
            self._rebuild()

    def _rebuild(self) -> None:
        self.max_heap = [(-p, ts) for ts, p in self.prices.items()]
        self.min_heap = [(p, ts) for ts, p in self.prices.items()]
        heapq.heapify(self.max_heap)                     # O(n)
        heapq.heapify(self.min_heap)

    def current(self) -> int:
        self._require_data()
        return self.prices[self.latest]

    def maximum(self) -> int:
        return -self._valid_top(self.max_heap, sign=-1)

    def minimum(self) -> int:
        return self._valid_top(self.min_heap, sign=1)

    def _valid_top(self, heap: list[tuple[int, int]], sign: int) -> int:
        self._require_data()
        while sign * heap[0][0] != self.prices[heap[0][1]]:
            heapq.heappop(heap)
        return heap[0][0]

    def _require_data(self) -> None:
        if not self.prices:
            raise ValueError("no prices yet")
```

```bash
pytest -q --tb=no -rf test_stock.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

> **Say:** "Rebuilding is O(n), but it only happens after at least n stale pushes, so it's O(1) extra per update on average, and memory is bounded at twice the live data."

#### Follow-up 2: "Can we avoid stale entries entirely?"

Use a **sorted container** keyed by price with a count per price, e.g. `sortedcontainers.SortedList` (a popular third-party library). A correction removes the old price and adds the new one, both O(log n), and max/min are the ends of the list. There are no stale entries and no rebuilds, at the cost of a dependency. In an interview, name it and the trade-off. You'd still keep the same tests; that's the point of having them.

### Mock dialogue

**Interviewer:** You receive stock records as timestamp and price. Some arrive late, and some correct earlier records. Support update, current, maximum and minimum.

**You:** So a later record with the same timestamp overwrites the earlier price, and current means the price at the largest timestamp seen?

**Interviewer:** Exactly.

**You:** Before coding, the tests: current is the latest timestamp, a late record doesn't move current, max and min, a correction that removes the old max, and correcting the latest timestamp.

**You:** I’ll keep a dictionary from timestamp to price as the source of truth, plus the max timestamp, so current is a lookup. For max and min, scanning the dictionary is linear; I’d like better.

**You:** A heap gives fast max, but corrections leave old prices inside it, and removing them is expensive. So I’ll delete lazily: push every update, and when reading the top, check it against the dictionary. If it disagrees, it’s outdated: pop it and look again.

**Interviewer:** Is that efficient?

**You:** Each entry is pushed once and popped at most once, so it’s amortised O(log n) per operation, even though a single call might do several pops.

> *Why this works:* Explain the amortised argument in one sentence. It’s the part interviewers probe most.

**You:** Tests are green. The correction test is the one a plain heap fails: the stale 10 would still be on top.

**Interviewer:** Memory keeps growing with corrections. Thoughts?

**You:** How frequent are corrections in practice? If rare, it doesn’t matter. If common, I'd add a test that corrects one timestamp a thousand times and checks the heap stays small, then rebuild both heaps from the dictionary once stale entries exceed half: O(n) occasionally, but memory stays bounded.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Treating "current" as the last call's price | Late records move current backwards. | `test_a_late_record_does_not_change_current` |
| Plain heaps with no staleness check | Corrected-away prices still show up as max/min. | `test_a_correction_removes_the_old_price` |
| Storing only the price in heap entries | You can't look the entry up in the dict to see whether it's stale. | Every correction test (the code can't even be written). |
| Trying to find and delete the old entry | O(n) per correction. | None (speed); explain lazy deletion. |
| Unclear errors on empty queries | Callers get `KeyError: 0`. | `test_queries_before_any_update_raise_value_error` |
| Never cleaning up stale entries | Unbounded memory with frequent corrections. | `test_heaps_stay_bounded_under_repeated_corrections` |
