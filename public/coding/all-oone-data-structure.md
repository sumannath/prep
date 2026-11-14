### Problem

Support `inc(key)`, `dec(key)`, `get_max_key()` and `get_min_key()`, all in O(1).

#### In plain words

Think of a page-popularity counter. Every key (say, a page name) has a count.

- `inc("home")` adds 1 to home's count (a new key starts at 1).
- `dec("home")` subtracts 1; at 0 the key disappears.
- `get_max_key()` returns **a** key with the highest count, and `get_min_key()` **a** key with the lowest. Either returns `""` if there are no keys.

The catch: **every** operation must be O(1), no matter how many keys there are.

#### Words used on this page

| Term | Meaning |
|---|---|
| Bucket | A group of all keys that currently share one count. |
| Doubly linked list | Nodes that each point to the previous and the next node, so you can insert or unlink one in O(1) if you hold it. |
| Sentinel | A dummy node at each end of the list, so real nodes always have neighbours and fewer `if`s are needed. |
| Model-based test | Run random operations on your structure and on a simple, obviously-correct version, and check they agree. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

Counts change by exactly ±1, so keep a doubly linked list of count buckets in ascending order (each a set of keys) between a sentinel head (count 0) and tail, plus a map from key to bucket. `inc`: if the next bucket isn’t count+1, insert one right after the current bucket, move the key there, and remove the old bucket if it’s empty. `dec` mirrors this toward the previous bucket, or drops the key at count 1. Max is `tail.prev` and min is `head.next`, so everything is O(1). Insert the destination before emptying the source, because the source is your position in the list. Top-k is a walk back from the tail in O(k).

**Cheat sheet**

1. **Ask:** `dec` on missing keys? any key on ties? key vanishes at 0? empty result? top-k coming?
2. **Tests first:** empty, single key, max/min differ, dec moves down, dec to zero removes, ties, random model test.
3. **Build:** sentinels `head(0) ⇄ … ⇄ tail`, buckets `{count, keys:set, prev, next}`, `where: key → bucket`.
4. **Order:** create/find destination bucket **before** emptying and unlinking the source.
5. **Follow-ups:** top-k walk from `tail.prev` in O(k); threads → one lock.

### Background you need

#### 1. Why the usual tools can't do O(1)

| Tool | `inc`/`dec` | max/min | Problem |
|---|---|---|---|
| Dict of counts | O(1) | O(n) scan | Max/min too slow. |
| Heap | O(log n) | O(1) one side | Not O(1), and one heap gives only max or only min. |
| Sorted list | O(n) insert | O(1) | Updates too slow. |

#### 2. The property that unlocks O(1)

Counts change by exactly **one**. A key at count 5 can only go to 4 or 6. If you keep the counts in sorted order, a key always moves to the **neighbouring** position. You never search for where it goes; it's next door.

#### 3. A doubly linked list, with sentinels

Each node points to `prev` and `next`. If you hold a node, you can insert after it or unlink it in O(1):

```python
class Node:
    def __init__(self, val):
        self.val, self.prev, self.next = val, None, None

head, tail = Node("HEAD"), Node("TAIL")        # sentinels
head.next, tail.prev = tail, head

def insert_after(node, val):
    new = Node(val)
    new.prev, new.next = node, node.next
    node.next.prev = new
    node.next = new
    return new

def unlink(node):
    node.prev.next, node.next.prev = node.next, node.prev

a = insert_after(head, "a")
b = insert_after(a, "b")
unlink(a)
print(head.next.val, tail.prev.val)
```

```text
b b
```

Thanks to the sentinels, `insert_after` and `unlink` never need "is this the first or last node?" checks.

#### 4. Buckets, not one node per key

If 10,000 keys have count 5, a list with one node per key would make a key walk past all of them to reach count 6. Group them: **one bucket per distinct count**, holding a **set** of keys. The next count is always one hop away, and adding or removing a key from a set is O(1). A dict `where: key → bucket` finds a key's bucket without walking the list.

```text
head(0) ⇄ [1: {b, c}] ⇄ [3: {a}] ⇄ tail
min = head.next → b or c        max = tail.prev → a
```

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Will `dec` only be called on keys that exist? | Error handling. | Yes (guaranteed) → no check. Not guaranteed → raise `KeyError` (or ignore; agree which). |
| When several keys share the max count, can I return any of them? | Tests must allow it. | Any → pick any key from the bucket's set. Deterministic (e.g. A→Z) → store keys in a sorted structure (costs O(log n)). |
| Should a key disappear entirely at count 0? | Otherwise min would be a 0-count key. | Yes (usual) → delete from `where` and the bucket. |
| What should max/min return with no keys? | Edge case. | `""` (LeetCode convention) or `None`. |
| Is a top-k query likely to follow? | Design hint. | Yes → the bucket list already supports it in O(k). |

**If they say "your call", state your defaults out loud:**

> "dec on a missing key raises KeyError; ties may return any key; a key disappears at zero; max and min return an empty string when there are no keys."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass. Because the structure is fiddly, I'll also add a model-based test: random operations checked against a plain dict of counts."

#### Work an example by hand

```text
inc a      head ⇄ [1:{a}] ⇄ tail
inc a      head ⇄ [2:{a}] ⇄ tail                (bucket 1 emptied → removed)
inc b      head ⇄ [1:{b}] ⇄ [2:{a}] ⇄ tail
           max = tail.prev → a      min = head.next → b
dec a      head ⇄ [1:{b, a}] ⇄ tail
dec a      head ⇄ [1:{b}] ⇄ tail                (a reached 0 → gone)
```

#### The tests, one per requirement

Code in `all_one.py`, tests in `test_all_one.py`.

```python
# file: test_all_one.py
import random

import pytest

from all_one import AllOne


def test_empty_returns_empty_strings():
    a = AllOne()
    assert (a.get_max_key(), a.get_min_key()) == ("", "")


def test_single_key_is_both_max_and_min():
    a = AllOne()
    a.inc("home")
    assert (a.get_max_key(), a.get_min_key()) == ("home", "home")


def test_max_and_min_differ():
    a = AllOne()
    a.inc("a"); a.inc("a"); a.inc("b")
    assert (a.get_max_key(), a.get_min_key()) == ("a", "b")


def test_dec_moves_a_key_down():
    a = AllOne()
    a.inc("a"); a.inc("a"); a.inc("a"); a.inc("b"); a.inc("b")
    a.dec("a"); a.dec("a")                       # a=1, b=2
    assert (a.get_max_key(), a.get_min_key()) == ("b", "a")


def test_dec_to_zero_removes_the_key():
    a = AllOne()
    a.inc("a"); a.inc("b"); a.inc("b")
    a.dec("a")
    assert (a.get_max_key(), a.get_min_key()) == ("b", "b")


def test_ties_may_return_any_tied_key():
    a = AllOne()
    a.inc("x"); a.inc("y")
    assert a.get_max_key() in {"x", "y"} and a.get_min_key() in {"x", "y"}


def test_dec_on_a_missing_key_raises():
    with pytest.raises(KeyError):
        AllOne().dec("ghost")


def test_matches_a_plain_dict_over_random_operations():
    rng = random.Random(7)
    ao, model = AllOne(), {}
    for _ in range(3000):
        key = rng.choice("abcdefgh")
        if key in model and rng.random() < 0.45:
            ao.dec(key)
            model[key] -= 1
            if model[key] == 0:
                del model[key]
        else:
            ao.inc(key)
            model[key] = model.get(key, 0) + 1
        if model:
            assert model.get(ao.get_max_key()) == max(model.values())
            assert model.get(ao.get_min_key()) == min(model.values())
        else:
            assert ao.get_max_key() == ao.get_min_key() == ""
```

The last test is the safety net: 3,000 random steps, checking after each one that the key we return really has the max (or min) count.

#### Red: run them against an empty stub

```python
# file: all_one.py
class AllOne:
    def inc(self, key):
        raise NotImplementedError

    def dec(self, key):
        raise NotImplementedError

    def get_max_key(self):
        raise NotImplementedError

    def get_min_key(self):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_all_one.py
```

```text
FFFFFFFF                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_all_one.py::test_empty_returns_empty_strings - NotImplementedError
FAILED test_all_one.py::test_single_key_is_both_max_and_min - NotImplementedError
FAILED test_all_one.py::test_max_and_min_differ - NotImplementedError
FAILED test_all_one.py::test_dec_moves_a_key_down - NotImplementedError
FAILED test_all_one.py::test_dec_to_zero_removes_the_key - NotImplementedError
FAILED test_all_one.py::test_ties_may_return_any_tied_key - NotImplementedError
FAILED test_all_one.py::test_dec_on_a_missing_key_raises - NotImplementedError
FAILED test_all_one.py::test_matches_a_plain_dict_over_random_operations - NotImplementedError
8 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. A heap is O(log n). What's special about how counts change here?
2. If counts were kept in sorted order, where does a key move on `inc`?
3. Many keys can share a count. What should one list node represent?

#### Brute force first

A dict of counts. `inc`/`dec` are O(1), and max/min scan all keys: O(n). It's correct, and the tests will prove it, but it isn't O(1).

#### The key insight

Counts move by ±1, so in a sorted list of counts a key only ever moves to an **adjacent** bucket. Keep:

- a **doubly linked list of buckets**, ascending by count, between sentinels `head` (count 0) and `tail`;
- each bucket has a **set** of keys;
- a dict **`where`** from key to its bucket.

Then max is `tail.prev` and min is `head.next`: O(1).

#### The one ordering rule

Moving a key from bucket 5 to bucket 6: if bucket 6 doesn't exist, create it **right after bucket 5**. You need bucket 5 in the list to know where to insert. Only *then* remove the key from bucket 5, and unlink bucket 5 if it's empty. Reverse the order and you've lost your position.

#### The plan (say this, then wait for a nod)

> **Say:** "Counts only move by one, so I'll keep a doubly linked list of count buckets in ascending order, each holding a set of keys, with sentinel head and tail, and a dict from key to bucket. inc moves the key to the next bucket, creating count+1 right after the current one if needed; dec mirrors that. I create the destination before emptying the source. Max is tail.prev, min is head.next. Everything is O(1)."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: dict + scan (correct, O(n) max/min)

```python
# file: all_one.py
class AllOne:
    def __init__(self):
        self.counts = {}

    def inc(self, key):
        self.counts[key] = self.counts.get(key, 0) + 1

    def dec(self, key):
        self.counts[key] -= 1                  # KeyError if missing
        if self.counts[key] == 0:
            del self.counts[key]

    def get_max_key(self):
        return max(self.counts, key=self.counts.get) if self.counts else ""

    def get_min_key(self):
        return min(self.counts, key=self.counts.get) if self.counts else ""
```

```bash
pytest -q --tb=no -rf test_all_one.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

All green. The tests now describe correct behaviour, and we can swap in the fast structure with confidence.

#### Stage 2: bucket list (with the ordering mistake)

> **Say:** "Now the bucket list for O(1)."

A natural first draft of `inc` empties the old bucket first and then inserts the new one:

```python
# file: all_one.py
class _Bucket:
    def __init__(self, count):
        self.count, self.keys = count, set()
        self.prev = self.next = None


class AllOne:
    def __init__(self):
        self.head, self.tail = _Bucket(0), _Bucket(0)   # sentinels
        self.head.next, self.tail.prev = self.tail, self.head
        self.where = {}                                 # key -> bucket

    def _insert_after(self, node, count):
        b = _Bucket(count)
        b.prev, b.next = node, node.next
        node.next.prev = b
        node.next = b
        return b

    def _drop_if_empty(self, b):
        if not b.keys:
            b.prev.next, b.next.prev = b.next, b.prev

    def inc(self, key):
        cur = self.where.get(key, self.head)            # new keys live at "count 0"
        if cur is not self.head:
            cur.keys.discard(key)
            self._drop_if_empty(cur)                    # unlinks cur… which we still need
        nxt = cur.next
        if nxt is self.tail or nxt.count != cur.count + 1:
            nxt = self._insert_after(cur, cur.count + 1)
        nxt.keys.add(key)
        self.where[key] = nxt

    def dec(self, key):
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

    def get_max_key(self):
        return next(iter(self.tail.prev.keys)) if self.tail.prev is not self.head else ""

    def get_min_key(self):
        return next(iter(self.head.next.keys)) if self.head.next is not self.tail else ""
```

```bash
pytest -q --tb=no -rf test_all_one.py
```

```text
..FF...F                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_all_one.py::test_max_and_min_differ - AssertionError: assert ('b', 'b') == ('a', 'b')
FAILED test_all_one.py::test_dec_moves_a_key_down - AssertionError: assert ('a', '') == ('b', 'a')
FAILED test_all_one.py::test_matches_a_plain_dict_over_random_operations - AssertionError: assert...
3 failed, 5 passed in 0.01s
```

Red. Here's what happened on the second `inc("a")`. Bucket 1 emptied and was unlinked, so `head.next` now points to `tail`. We then inserted bucket 2 "after" the unlinked bucket 1, so `tail.prev` points to bucket 2 but nothing reachable from `head` does. The list is broken.

#### Stage 3: create the destination first, then empty the source

```python
# file: all_one.py
class _Bucket:
    def __init__(self, count):
        self.count, self.keys = count, set()
        self.prev = self.next = None


class AllOne:
    def __init__(self):
        self.head, self.tail = _Bucket(0), _Bucket(0)
        self.head.next, self.tail.prev = self.tail, self.head
        self.where = {}

    def _insert_after(self, node, count):
        b = _Bucket(count)
        b.prev, b.next = node, node.next
        node.next.prev = b
        node.next = b
        return b

    def _drop_if_empty(self, b):
        if not b.keys:
            b.prev.next, b.next.prev = b.next, b.prev

    def inc(self, key):
        cur = self.where.get(key, self.head)
        nxt = cur.next
        if nxt is self.tail or nxt.count != cur.count + 1:
            nxt = self._insert_after(cur, cur.count + 1)   # 1. destination first
        nxt.keys.add(key)
        self.where[key] = nxt
        if cur is not self.head:
            cur.keys.discard(key)                         # 2. then empty the source
            self._drop_if_empty(cur)

    def dec(self, key):
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

    def get_max_key(self):
        return next(iter(self.tail.prev.keys)) if self.tail.prev is not self.head else ""

    def get_min_key(self):
        return next(iter(self.head.next.keys)) if self.head.next is not self.tail else ""
```

```bash
pytest -q --tb=no -rf test_all_one.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

All green, including 3,000 random operations checked against the dict.

**Time:** O(1) for every operation. **Space:** O(number of keys).

### Step 5 · Run everything and refactor

#### Trace `inc a, inc a, inc b`

| op | `cur` | destination | list after | `where` |
|---|---|---|---|---|
| inc a | head (0) | new bucket 1 after head | head ⇄ [1:{a}] ⇄ tail | a→1 |
| inc a | [1] | new bucket 2 after [1]; then [1] empties → unlinked | head ⇄ [2:{a}] ⇄ tail | a→2 |
| inc b | head (0) | head.next is [2], not 1 → new bucket 1 after head | head ⇄ [1:{b}] ⇄ [2:{a}] ⇄ tail | a→2, b→1 |

`get_max_key` → `tail.prev` = [2] → **a**. `get_min_key` → `head.next` = [1] → **b**.

#### Refactor: one move helper for both directions

`inc` and `dec` are mirror images. Pull the shared part, "move this key from `cur` to the bucket with `count` next to `anchor`", into one helper, so the ordering rule lives in exactly one place:

```python
# file: all_one.py
class _Bucket:
    __slots__ = ("count", "keys", "prev", "next")

    def __init__(self, count: int):
        self.count = count
        self.keys: set[str] = set()
        self.prev: "_Bucket | None" = None
        self.next: "_Bucket | None" = None


class AllOne:
    """Counts with O(1) inc, dec, max key and min key."""

    def __init__(self):
        self.head, self.tail = _Bucket(0), _Bucket(0)
        self.head.next, self.tail.prev = self.tail, self.head
        self.where: dict[str, _Bucket] = {}

    def inc(self, key: str) -> None:
        cur = self.where.get(key, self.head)
        nxt = cur.next
        if nxt is self.tail or nxt.count != cur.count + 1:
            nxt = self._insert_after(cur, cur.count + 1)
        self._move(key, cur, nxt)

    def dec(self, key: str) -> None:
        cur = self.where[key]                       # KeyError if missing
        if cur.count == 1:
            self._move(key, cur, None)              # leaves the structure
            return
        prv = cur.prev
        if prv is self.head or prv.count != cur.count - 1:
            prv = self._insert_after(cur.prev, cur.count - 1)
        self._move(key, cur, prv)

    def get_max_key(self) -> str:
        return next(iter(self.tail.prev.keys)) if self.tail.prev is not self.head else ""

    def get_min_key(self) -> str:
        return next(iter(self.head.next.keys)) if self.head.next is not self.tail else ""

    # --- helpers -------------------------------------------------------------
    def _move(self, key: str, src: _Bucket, dst: "_Bucket | None") -> None:
        """Destination already exists (rule: create it before emptying src)."""
        if dst is None:
            del self.where[key]
        else:
            dst.keys.add(key)
            self.where[key] = dst
        if src is not self.head:
            src.keys.discard(key)
            if not src.keys:
                src.prev.next, src.next.prev = src.next, src.prev

    def _insert_after(self, node: _Bucket, count: int) -> _Bucket:
        b = _Bucket(count)
        b.prev, b.next = node, node.next
        node.next.prev = b
        node.next = b
        return b
```

```bash
pytest -q --tb=no -rf test_all_one.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Return the top k keys, not just one"

**What changes:** nothing in the structure. Buckets are already sorted, so walk backwards from `tail.prev`, collecting keys until you have k: O(k). This is the payoff of the structure you chose.

**Test first:**

```python
# file: test_all_one.py (append)
def test_top_k_walks_buckets_from_the_top():
    a = AllOne()
    for key, times in [("a", 3), ("b", 2), ("c", 2), ("d", 1)]:
        for _ in range(times):
            a.inc(key)
    top = a.top_k(2)
    assert top[0] == "a" and top[1] in {"b", "c"}
    assert sorted(a.top_k(10)) == ["a", "b", "c", "d"]
```

```bash
pytest -q --tb=no -rf test_all_one.py -k top_k
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_all_one.py::test_top_k_walks_buckets_from_the_top - AttributeError: 'AllOne' object h...
1 failed, 8 deselected in 0.01s
```

```python
# file: all_one.py (append)
def _top_k(self: AllOne, k: int) -> list[str]:
    out: list[str] = []
    b = self.tail.prev
    while b is not self.head and len(out) < k:
        for key in b.keys:
            if len(out) == k:
                break
            out.append(key)
        b = b.prev
    return out


AllOne.top_k = _top_k
```

(In the interview you'd simply add `top_k` as a method inside the class. It's attached here only so this step shows just the new code.)

```bash
pytest -q --tb=no -rf test_all_one.py
```

```text
.........                                                                                    [100%]
9 passed in 0.01s
```

> **Say:** "Do ties at the k-th position need a rule? Right now any key from the boundary bucket can be chosen."

#### Follow-up 2: "Many threads call this at once"

A single `inc` touches several pointers. Two threads interleaving could unlink a bucket the other is inserting next to, so wrap each public method in one `threading.Lock`. If that lock becomes a bottleneck, shard keys by hash into several `AllOne` instances (each with its own lock). Global max/min then become "max of the shards' maxes": O(shards), and a reasonable trade.

### Mock dialogue

**Interviewer:** Track page popularity. Increment, decrement, and get the most and least popular page, all in constant time.

**You:** When several pages tie for most popular, can I return any one? And when a count drops to zero, should the page vanish from min?

**Interviewer:** Any one is fine. Yes, it disappears.

**You:** Before coding I'll write tests for the basic cases, plus a model-based test: thousands of random increments and decrements checked against a plain dictionary of counts. This structure is easy to get subtly wrong, and that test catches it.

**You:** Let me reason about why constant time is possible. A dictionary of counts handles increments, but max and min would need a scan, and a heap gets me log time. The key observation is that counts only move by one, so if counts are kept in order, a page only ever moves to an adjacent position.

> *Why this works:* Narrate the reasoning that leads to the structure. Jumping straight to “doubly linked list of buckets” looks memorised; deriving it looks senior.

**You:** So: a doubly linked list of buckets, one per distinct count in ascending order, each holding a set of pages. A dictionary maps page to bucket. Sentinel buckets at both ends. Max is the bucket before the tail; min is the one after the head.

**Interviewer:** Why buckets rather than a node per page?

**You:** Many pages can share a count. With a node per page, moving up would mean walking past every page at the same count. With buckets, the next count is always one hop.

**You:** One ordering detail while I code: I create the destination bucket before removing the page from its current bucket, because the current bucket tells me where to insert.

**You:** All green, including the random test against the dictionary.

**Interviewer:** How would you return the top three pages?

**You:** I'll add a test, then walk backwards from the bucket before the tail, collecting pages until I have three. Buckets are already ordered, so that’s proportional to k. Do ties at the boundary need a rule?

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Removing the old bucket before inserting the new one | You lose your anchor; the list breaks. | `test_max_and_min_differ`, `test_matches_a_plain_dict_over_random_operations` |
| Not deleting the key from `where` at count 0 | A ghost key is returned as min, or `dec` misbehaves later. | `test_dec_to_zero_removes_the_key` |
| One node per key instead of per count | `inc` walks past every key with the same count: O(n). | None (speed); explain buckets. |
| Singly linked list | `dec` and unlinking need the previous bucket. | Can't implement O(1) `dec`. |
| No sentinels | Many special cases for empty list, first and last bucket; easy to get one wrong. | The random model test. |
| Testing only hand-picked cases | Pointer bugs hide in rare sequences. | `test_matches_a_plain_dict_over_random_operations` |
