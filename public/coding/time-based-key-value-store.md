### Problem

`set(key, value, timestamp)` and `get(key, timestamp)`, which returns the value with the largest timestamp ≤ the query, or `""`.

#### In plain words

A key-value store that remembers **history**. Each `set` records "at time t, key had this value". `get(key, t)` answers "what was the value of key **as of** time t?": the most recent value set at or before t. If nothing was set that early, return `""`.

```text
set("status", "open", 1)
set("status", "done", 4)
get("status", 3) → "open"     (latest at or before 3 is t=1)
get("status", 4) → "done"     (exactly 4 counts)
get("status", 0) → ""         (nothing that early)
```

#### Words used on this page

| Term | Meaning |
|---|---|
| Predecessor search | Find the largest item ≤ a query in a sorted list. |
| Binary search | Halve the search range each step: O(log n). |
| `bisect` | Python's standard module for binary search on sorted lists. |
| Parallel lists | Two lists where index i in one matches index i in the other. |
| Retention | How long old versions are kept. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

Per key, keep parallel lists of timestamps and values; timestamps arrive increasing, so they’re already sorted. `set` appends in O(1). `get` does `i = bisect_right(times, t)` and returns `values[i-1]` if `i` else an empty string. `bisect_right` places `i` after any equal timestamp, so exact matches are included; `bisect_left` is the off-by-one. Read with `.get(key, [])` so misses don’t create entries. Get is O(log n). If timestamps can arrive out of order, insert at the bisect position (or use a sorted container), which is nearly O(1) when records are only slightly late.

**Cheat sheet**

1. **Ask:** increasing timestamps per key? miss value? same timestamp twice? retention? persistence?
2. **Tests first:** unknown key, exact match, between, before first, keys independent, misses don't create keys.
3. **Build:** `dict key → (times[], values[])`; `set` appends; `get` → `bisect_right(times, t) - 1`.
4. **Cost:** set O(1), get O(log n).
5. **Follow-ups:** out of order → insert at bisect position; retention → trim the prefix on write.

### Background you need

#### 1. Binary search with `bisect`

On a **sorted** list, binary search finds a position in O(log n) by halving the range each step. Python's `bisect` module gives two variants that differ only for **equal** values:

- `bisect_left(xs, t)` → the first position where `xs[i] >= t` (left of any equal values);
- `bisect_right(xs, t)` → the first position where `xs[i] > t` (right of any equal values).

```python
from bisect import bisect_left, bisect_right

times = [1, 4, 7]
for t in (0, 3, 4, 9):
    print(t, bisect_left(times, t), bisect_right(times, t))
```

```text
0 0 0
3 1 1
4 1 2
9 3 3
```

#### 2. "Largest timestamp ≤ t" with `bisect_right`

`i = bisect_right(times, t)` is the first position with a timestamp **greater than** t. Everything before `i` is ≤ t, so the answer is index `i - 1`. If `i == 0`, nothing is early enough.

With `bisect_left`, an exact match at `t` would land at `i` itself, so `i - 1` would skip it. That's the classic off-by-one on this problem.

#### 3. Reading a dict without creating entries

A `defaultdict(list)` **creates** an empty list on every read of a missing key. A store that receives many misses would fill up with empty entries. Read with `self.data.get(key)` instead.

```python
from collections import defaultdict

d = defaultdict(list)
_ = d["missing"]          # a read…
print(len(d))             # …created an entry
```

```text
1
```

#### 4. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Are timestamps for one key always set in increasing order? | Decides whether lists stay sorted for free. | Yes → `set` appends, O(1). No → insert at the bisect position (see Follow-ups). |
| What should `get` return if nothing is early enough? | API. | `""` (LeetCode) or `None`. |
| Can the same key get two values at the same timestamp? | Overwrite or keep both? | Overwrite (usual) → replace in place. |
| Is there a retention limit on old versions? | Memory. | Yes → trim old versions on write (see Follow-ups). |
| Does it need to survive restarts? | Persistence. | Yes → append-only log + snapshots (see Follow-ups). |

**If they say "your call", state your defaults out loud:**

> "Timestamps per key arrive increasing, a miss returns an empty string, keep all versions, and in memory only."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass. The exact-timestamp case is the one that catches the classic off-by-one."

#### Work the example by hand

```text
times  = [1, 4]        values = ["open", "done"]
get 3: bisect_right → 1 → values[0] = "open"
get 4: bisect_right → 2 → values[1] = "done"
get 0: bisect_right → 0 → nothing → ""
get 9: bisect_right → 2 → values[1] = "done"
```

#### The tests, one per requirement

Code in `time_map.py`, tests in `test_time_map.py`.

```python
# file: test_time_map.py
from time_map import TimeMap


def make_store():
    tm = TimeMap()
    tm.set("status", "open", 1)
    tm.set("status", "done", 4)
    return tm


def test_unknown_key_returns_empty_string():
    assert TimeMap().get("nope", 10) == ""


def test_exact_timestamp_is_included():
    tm = make_store()
    assert (tm.get("status", 1), tm.get("status", 4)) == ("open", "done")


def test_between_versions_returns_the_earlier_one():
    assert make_store().get("status", 3) == "open"


def test_after_the_last_version_returns_the_last():
    assert make_store().get("status", 99) == "done"


def test_before_the_first_version_returns_empty_string():
    assert make_store().get("status", 0) == ""


def test_keys_are_independent():
    tm = make_store()
    tm.set("owner", "sam", 2)
    assert (tm.get("owner", 3), tm.get("status", 3)) == ("sam", "open")


def test_misses_do_not_create_keys():
    tm = TimeMap()
    tm.get("ghost", 5)
    assert len(tm) == 0
```

#### Red: run them against an empty stub

```python
# file: time_map.py
class TimeMap:
    def set(self, key, value, timestamp):
        pass

    def get(self, key, timestamp):
        raise NotImplementedError

    def __len__(self):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_time_map.py
```

```text
FFFFFFF                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_time_map.py::test_unknown_key_returns_empty_string - NotImplementedError
FAILED test_time_map.py::test_exact_timestamp_is_included - NotImplementedError
FAILED test_time_map.py::test_between_versions_returns_the_earlier_one - NotImplementedError
FAILED test_time_map.py::test_after_the_last_version_returns_the_last - NotImplementedError
FAILED test_time_map.py::test_before_the_first_version_returns_empty_string - NotImplementedError
FAILED test_time_map.py::test_keys_are_independent - NotImplementedError
FAILED test_time_map.py::test_misses_do_not_create_keys - NotImplementedError
7 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. For one key, in what order do its timestamps arrive? What does that make the list?
2. "Largest timestamp ≤ t" in a sorted list: which classic search does that?
3. `bisect_left` or `bisect_right`, and why does it matter when t matches exactly?

#### Brute force first

Store a list of `(timestamp, value)` per key and scan backwards from the end for the first timestamp ≤ t. It's correct, but O(n) per `get` for a key with n versions.

#### The key insight

Timestamps for a key arrive increasing, so each key's list is **already sorted**: `set` is an append. `get` is then a **predecessor search**, which binary search does in O(log n): `i = bisect_right(times, t)`, answer `values[i - 1]`.

Keep two **parallel lists** (`times`, `values`) instead of a list of tuples, so `bisect` can search the timestamps directly.

#### The plan (say this, then wait for a nod)

> **Say:** "Per key, two parallel lists: timestamps and values. Timestamps arrive increasing, so set is an append, O(1). get is a predecessor search: bisect_right gives the first timestamp greater than t, so the answer is the one before it. That includes exact matches, which bisect_left would skip. O(log n) per get. I'll read with .get so misses don't create entries."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: scan backwards (correct, O(n))

```python
# file: time_map.py
class TimeMap:
    def __init__(self):
        self.data = {}                       # key -> list of (timestamp, value)

    def set(self, key, value, timestamp):
        self.data.setdefault(key, []).append((timestamp, value))

    def get(self, key, timestamp):
        for ts, value in reversed(self.data.get(key, [])):
            if ts <= timestamp:
                return value
        return ""

    def __len__(self):
        return len(self.data)
```

```bash
pytest -q --tb=no -rf test_time_map.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

All green. Now make `get` logarithmic.

#### Stage 2: binary search (the two classic slips)

A typical first draft reaches for `bisect_left` and a `defaultdict`:

```python
# file: time_map.py
from bisect import bisect_left
from collections import defaultdict


class TimeMap:
    def __init__(self):
        self.times = defaultdict(list)       # key -> [timestamps]
        self.values = defaultdict(list)      # key -> [values]

    def set(self, key, value, timestamp):
        self.times[key].append(timestamp)
        self.values[key].append(value)

    def get(self, key, timestamp):
        i = bisect_left(self.times[key], timestamp)
        return self.values[key][i - 1] if i else ""

    def __len__(self):
        return len(self.times)
```

```bash
pytest -q --tb=no -rf test_time_map.py
```

```text
.F....F                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_time_map.py::test_exact_timestamp_is_included - AssertionError: assert ('', 'open') =...
FAILED test_time_map.py::test_misses_do_not_create_keys - assert 1 == 0
2 failed, 5 passed in 0.01s
```

Two reds, two different bugs:

- **Exact match skipped:** for `t = 4`, `bisect_left` returns the position *of* 4, and `i - 1` steps back to "open".
- **Misses create keys:** reading `self.times["ghost"]` on a `defaultdict` inserted an empty list.

#### Stage 3: `bisect_right` and non-creating reads

```python
# file: time_map.py
from bisect import bisect_right


class TimeMap:
    def __init__(self):
        self.data = {}                       # key -> (times, values), parallel lists

    def set(self, key, value, timestamp):
        times, values = self.data.setdefault(key, ([], []))
        times.append(timestamp)              # increasing → stays sorted
        values.append(value)

    def get(self, key, timestamp):
        entry = self.data.get(key)           # a read never creates a key
        if entry is None:
            return ""
        times, values = entry
        i = bisect_right(times, timestamp)   # first index with time > timestamp
        return values[i - 1] if i else ""

    def __len__(self):
        return len(self.data)
```

```bash
pytest -q --tb=no -rf test_time_map.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

**Time:** `set` O(1); `get` O(log n) for a key with n versions. **Space:** O(total sets).

### Step 5 · Run everything and refactor

#### Trace `get("status", t)` with times `[1, 4]`

| t | `bisect_right` | `i - 1` | returns |
|---|---|---|---|
| 0 | 0 | — | `""` |
| 1 | 1 | 0 | open |
| 3 | 1 | 0 | open |
| 4 | 2 | 1 | done |
| 99 | 2 | 1 | done |

#### Refactor: give "one key's history" its own class

A refactor changes structure, not behaviour, so no new test is needed; the existing tests must stay green. Pulling the per-key logic into a small `_History` class makes the follow-ups (out-of-order inserts, retention) a change in one place.

```python
# file: time_map.py
from bisect import bisect_right


class _History:
    """Versions of one key, sorted by timestamp."""

    __slots__ = ("times", "values")

    def __init__(self):
        self.times: list[int] = []
        self.values: list[str] = []

    def add(self, timestamp: int, value: str) -> None:
        self.times.append(timestamp)
        self.values.append(value)

    def at(self, timestamp: int) -> str:
        i = bisect_right(self.times, timestamp)
        return self.values[i - 1] if i else ""


class TimeMap:
    def __init__(self):
        self.data: dict[str, _History] = {}

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.data.setdefault(key, _History()).add(timestamp, value)

    def get(self, key: str, timestamp: int) -> str:
        history = self.data.get(key)
        return history.at(timestamp) if history else ""

    def __len__(self) -> int:
        return len(self.data)
```

```bash
pytest -q --tb=no -rf test_time_map.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Timestamps can arrive out of order"

**First ask:** how out of order? A few seconds late, or arbitrary? And if the same timestamp arrives twice, does the later write win?

**What changes:** `add` can no longer append blindly. Find the position with `bisect_left`. If that timestamp already exists, overwrite it; otherwise insert there. `list.insert` is O(n) in the worst case, but when records are only slightly late they land near the end, so it's close to O(1) in practice. For arbitrary disorder with heavy writes, use a sorted container (e.g. `sortedcontainers.SortedList`) for O(log n) inserts.

**Tests first:**

```python
# file: test_time_map.py (append)
def test_late_records_are_inserted_in_order():
    tm = TimeMap()
    tm.set("k", "at5", 5)
    tm.set("k", "at3", 3)             # arrives late
    assert (tm.get("k", 4), tm.get("k", 6)) == ("at3", "at5")


def test_same_timestamp_twice_overwrites():
    tm = TimeMap()
    tm.set("k", "first", 5)
    tm.set("k", "x", 7)
    tm.set("k", "second", 5)          # a late correction of t=5
    assert tm.get("k", 6) == "second"
```

```bash
pytest -q --tb=no -rf test_time_map.py -k "late or twice"
```

```text
FF                                                                                           [100%]
===================================== short test summary info =====================================
FAILED test_time_map.py::test_late_records_are_inserted_in_order - AssertionError: assert ('at3',...
FAILED test_time_map.py::test_same_timestamp_twice_overwrites - AssertionError: assert 'first' ==...
2 failed, 7 deselected in 0.01s
```

Both red, for the same root cause: appending a late record leaves the timestamps unsorted, and binary search on an unsorted list returns nonsense. Change `_History.add` to insert in place, overwriting an existing timestamp:

```python
# file: time_map.py (replace _History)
class _History:
    """Versions of one key, sorted by timestamp."""

    __slots__ = ("times", "values")

    def __init__(self):
        self.times: list[int] = []
        self.values: list[str] = []

    def add(self, timestamp: int, value: str) -> None:
        if not self.times or timestamp > self.times[-1]:   # the common case: O(1)
            self.times.append(timestamp)
            self.values.append(value)
            return
        i = bisect_left(self.times, timestamp)
        if i < len(self.times) and self.times[i] == timestamp:
            self.values[i] = value                         # same timestamp: overwrite
        else:
            self.times.insert(i, timestamp)                # late record: O(n) worst case
            self.values.insert(i, value)

    def at(self, timestamp: int) -> str:
        i = bisect_right(self.times, timestamp)
        return self.values[i - 1] if i else ""
```

```python
# file: time_map.py (append)
from bisect import bisect_left
```

(That import belongs at the top of the file; it's added here only to keep this step's change visible.)

```bash
pytest -q --tb=no -rf test_time_map.py
```

```text
.........                                                                                    [100%]
9 passed in 0.01s
```

#### Follow-up 2: "Old versions should expire"

**What changes:** with a retention window R, on each write drop every version older than `newest - R`. Because the list is sorted, those are a **prefix**: find its end with `bisect_left(times, newest - R)` and delete it in one slice.

**Test first:**

```python
# file: test_time_map.py (append)
def test_versions_older_than_retention_are_dropped():
    tm = TimeMap(retention=10)
    for ts, value in [(1, "a"), (5, "b"), (20, "c")]:
        tm.set("k", value, ts)
    assert tm.get("k", 6) == ""                # 1 and 5 are older than 20 - 10
    assert tm.get("k", 25) == "c"
    assert tm.data["k"].times == [20]
```

```bash
pytest -q --tb=no -rf test_time_map.py -k retention
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_time_map.py::test_versions_older_than_retention_are_dropped - TypeError: TimeMap.__in...
1 failed, 9 deselected in 0.01s
```

```python
# file: time_map.py (replace TimeMap)
class TimeMap:
    def __init__(self, retention: int | None = None):
        self.retention = retention
        self.data: dict[str, _History] = {}

    def set(self, key: str, value: str, timestamp: int) -> None:
        history = self.data.setdefault(key, _History())
        history.add(timestamp, value)
        if self.retention is not None:
            cutoff = history.times[-1] - self.retention
            drop = bisect_left(history.times, cutoff)       # sorted → old ones are a prefix
            del history.times[:drop]
            del history.values[:drop]

    def get(self, key: str, timestamp: int) -> str:
        history = self.data.get(key)
        return history.at(timestamp) if history else ""

    def __len__(self) -> int:
        return len(self.data)
```

```bash
pytest -q --tb=no -rf test_time_map.py
```

```text
..........                                                                                   [100%]
10 passed in 0.01s
```

#### Follow-up 3: "It must survive restarts"

**What changes:** nothing in the in-memory structure. Add durability around it:

- **Append-only log:** write each `set` to a file before applying it. On startup, replay the log.
- **Snapshots:** periodically write the whole map out, so a restart replays only the log written since the last snapshot.

This is the same "what was it at time t?" shape as page history or field history in a ticket tracker. Naming that connection shows you see the pattern.

The test you'd write first: set some values, "restart" by building a new `TimeMap` from the same log file, and check that `get` answers are identical.

### Mock dialogue

**Interviewer:** Store values with timestamps. Get returns the value at the latest timestamp not after the one asked for.

**You:** Are timestamps for a given key always set in increasing order?

**Interviewer:** Yes.

**You:** Before coding, the tests: unknown key, an exact timestamp match, a query between versions, before the first, after the last, keys independent, and that misses don't create entries.

**You:** Each key’s timestamps are already sorted, so get is a predecessor search: binary search for the last timestamp less than or equal to the query. Set is an append, constant time; get is logarithmic.

**You:** I’ll use `bisect_right`: it returns the first position with a timestamp strictly greater than the query, so the one before it is the answer, and exact matches are included.

> *Why this works:* Say which bisect variant and why. Off-by-one on the boundary is the classic mistake here, and naming it pre-empts the probe.

**You:** All green, including the exact-match test that `bisect_left` would fail.

**Interviewer:** Timestamps might arrive out of order now.

**You:** I'll add a failing test with a late record first. Then I insert in sorted position. With a plain list that’s linear per insert; if writes are frequent I’d use a sorted container for logarithmic inserts. How out of order are they: a few seconds late, or arbitrary?

**Interviewer:** Usually a few seconds.

**You:** Then most inserts land near the end, so inserting at the bisect position is nearly constant in practice. I’d keep the list.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| `bisect_left` instead of `bisect_right` | An exact timestamp match returns the previous version. | `test_exact_timestamp_is_included` |
| Reading through a `defaultdict` | Every miss creates an empty entry; memory grows with misses. | `test_misses_do_not_create_keys` |
| Linear scan on `get` | O(n) per query. | None (speed); say O(log n). |
| Appending late records | The list stops being sorted; binary search gives wrong answers. | `test_late_records_are_inserted_in_order` |
| Keeping duplicates of one timestamp | Which value wins is luck. | `test_same_timestamp_twice_overwrites` |
