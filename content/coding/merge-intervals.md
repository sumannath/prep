### Problem

Merge all overlapping intervals and return the result sorted by start.

#### In plain words

Each interval `[start, end]` is a stretch of numbers, such as a busy meeting from 9 to 11. If two intervals overlap, replace them with one interval covering both. Keep going until nothing overlaps, and return the result in order of start.

```text
[[1,3], [2,6], [8,10], [15,18]]   →   [[1,6], [8,10], [15,18]]
 [1,3] and [2,6] overlap → [1,6]
```

#### Words used on this page

| Term | Meaning |
|---|---|
| Overlap | Two intervals share at least one point (or, if agreed, merely touch). |
| Touching | One ends exactly where the next starts: `[1,2]` and `[2,3]`. |
| Contained | One interval lies entirely inside another: `[2,3]` inside `[1,10]`. |
| Sweep | Walk through items in sorted order once, carrying some state. |
| In place | Changing the caller's list instead of working on a copy. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

Sort by start (a copy, unless mutating is agreed), then sweep: if the interval starts at or before the last merged end, set that end to `max(last_end, end)`; otherwise append a new interval. Sorting makes this correct because once an interval starts past the current block’s end, every later interval does too, so you only ever compare with the last block. O(n log n). The trap is assigning the new end instead of the max, which breaks on contained intervals; always test `[[1,10],[2,3]]`. Ask whether touching intervals merge. For team free time, merge everyone’s busy intervals and keep gaps of at least 30 minutes. Inserting one interval into an already-merged list is O(n) with no sort.

**Cheat sheet**

1. **Ask:** do touching intervals merge? input sorted? may I mutate it? closed or half-open?
2. **Tests first:** example, unsorted, touching, contained, empty, single, input untouched.
3. **Build:** `sorted(copy)` by start → sweep with `out[-1][1] = max(out[-1][1], end)`.
4. **Cost:** O(n log n) time, O(n) output.
5. **Follow-ups:** team free slots → merge then read the gaps; insert into a merged list → O(n).

### Background you need

#### 1. When do two intervals overlap?

For sorted intervals `a` (earlier start) and `b`: they overlap if `b.start <= a.end`. Using `<=` means touching intervals (`[1,2]`, `[2,3]`) merge; using `<` keeps them separate. It's a product decision, so ask.

```text
a: [1──────5]
b:     [3──────8]      3 <= 5 → overlap → [1, 8]
c:              [9─10] 9 >  8 → separate
```

#### 2. Why sort first?

Unsorted, any interval might overlap any other: n² comparisons. Sorted by start, an interval can only overlap the block you're **currently** building. Once an interval starts past the current block's end, every later one starts even later, so the block is finished.

#### 3. `sorted(x)` vs `x.sort()`

`x.sort()` reorders the caller's list **in place**; `sorted(x)` returns a new list and leaves `x` alone. Changing someone's input without saying so is a common surprise bug.

```python
data = [[3, 4], [1, 2]]
copy = sorted(data)
print(data, copy)
data.sort()
print(data)
```

```text
[[3, 4], [1, 2]] [[1, 2], [3, 4]]
[[1, 2], [3, 4]]
```

#### 4. Lists inside lists are shared

`sorted` copies the **outer** list, but the inner `[start, end]` lists are the same objects. If you later write `out[-1][1] = …` on one of them, you change the caller's interval. Copy each pair as you append: `out.append([start, end])`.

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Should touching intervals like `[1,2]` and `[2,3]` merge? | `<=` vs `<`. | Yes (numeric ranges) → `start <= last_end`. No (calendar slots) → `start < last_end`. |
| Is the input already sorted by start? | Sorting cost. | Yes → skip the sort, O(n). No → sort, O(n log n). |
| May I sort the input in place, or must I leave it untouched? | Side effects. | Untouched (safe default) → `sorted(...)` and copy each pair. In place → `.sort()` to save memory. |
| Are intervals closed `[a, b]` or half-open `[a, b)`? | Same question as touching, from another angle. | Half-open → touching intervals don't overlap. |
| Can an interval be invalid (`start > end`)? | Validation. | Assume valid, or raise `ValueError`. |

**If they say "your call", state your defaults out loud:**

> "Touching intervals merge, the input isn't sorted, I'll leave the caller's list untouched, and intervals are valid."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass. The contained-interval one is the classic trap, so I'm writing it first."

#### Work the example by hand

```text
sorted: [1,3] [2,6] [8,10] [15,18]
[1,3]   out = [[1,3]]
[2,6]   2 <= 3 → end = max(3, 6) = 6 → [[1,6]]
[8,10]  8 >  6 → new block → [[1,6],[8,10]]
[15,18] 15 > 10 → new block → [[1,6],[8,10],[15,18]]
```

#### The tests, one per requirement

Code in `intervals.py`, tests in `test_intervals.py`.

```python
# file: test_intervals.py
from intervals import merge


def test_merges_the_example():
    assert merge([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]


def test_unsorted_input():
    assert merge([[8, 10], [1, 3], [2, 6]]) == [[1, 6], [8, 10]]


def test_touching_intervals_merge():
    assert merge([[1, 2], [2, 3]]) == [[1, 3]]


def test_contained_interval_does_not_shrink_the_block():
    assert merge([[1, 10], [2, 3]]) == [[1, 10]]


def test_empty_and_single():
    assert merge([]) == []
    assert merge([[4, 5]]) == [[4, 5]]


def test_input_is_left_untouched():
    data = [[2, 6], [1, 3]]
    merge(data)
    assert data == [[2, 6], [1, 3]]
```

#### Red: run them against an empty stub

```python
# file: intervals.py
def merge(intervals):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_intervals.py
```

```text
FFFFFF                                                                                       [100%]
===================================== short test summary info =====================================
FAILED test_intervals.py::test_merges_the_example - NotImplementedError
FAILED test_intervals.py::test_unsorted_input - NotImplementedError
FAILED test_intervals.py::test_touching_intervals_merge - NotImplementedError
FAILED test_intervals.py::test_contained_interval_does_not_shrink_the_block - NotImplementedError
FAILED test_intervals.py::test_empty_and_single - NotImplementedError
FAILED test_intervals.py::test_input_is_left_untouched - NotImplementedError
6 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. If intervals were sorted by start, which merged interval could the next one possibly overlap?
2. When it overlaps, what should the new end be? Consider `[1,10]` then `[2,3]`.
3. Do you need to change the caller's list?

#### Brute force first

Repeatedly find any two overlapping intervals and replace them with their union, until no pair overlaps. Each pass is O(n²), and there can be up to n passes. It's correct, but slow.

#### The key insight

**Sort by start**, then a single **sweep**: each interval either extends the last merged block or starts a new one. You never need to look further back than the last block.

#### The plan (say this, then wait for a nod)

> **Say:** "Sort a copy by start, then sweep. If the next interval starts at or before the last merged end, extend that end to the larger of the two ends; otherwise start a new block. It's max, not assignment, because a short interval inside a long one mustn't shrink it. O(n log n) for the sort, O(n) for the sweep."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: merge any overlapping pair until none remain (correct, slow)

```python
# file: intervals.py
def merge(intervals):
    blocks = [list(iv) for iv in intervals]          # copy each pair
    merged_something = True
    while merged_something:
        merged_something = False
        for i in range(len(blocks)):
            for j in range(i + 1, len(blocks)):
                a, b = blocks[i], blocks[j]
                if a[0] <= b[1] and b[0] <= a[1]:    # overlap or touch
                    blocks[i] = [min(a[0], b[0]), max(a[1], b[1])]
                    del blocks[j]
                    merged_something = True
                    break
            if merged_something:
                break
    return sorted(blocks)
```

```bash
pytest -q --tb=no -rf test_intervals.py
```

```text
......                                                                                       [100%]
6 passed in 0.01s
```

All green: we have a correct reference. Now make it O(n log n).

#### Stage 2: sort and sweep (with the two classic slips)

A typical first draft sorts the input in place and assigns the new end:

```python
# file: intervals.py
def merge(intervals):
    intervals.sort(key=lambda iv: iv[0])             # sorts the caller's list
    out = []
    for start, end in intervals:
        if out and start <= out[-1][1]:
            out[-1][1] = end                         # assigns instead of max
        else:
            out.append([start, end])
    return out
```

```bash
pytest -q --tb=no -rf test_intervals.py
```

```text
...F.F                                                                                       [100%]
===================================== short test summary info =====================================
FAILED test_intervals.py::test_contained_interval_does_not_shrink_the_block - assert [[1, 3]] == ...
FAILED test_intervals.py::test_input_is_left_untouched - assert [[1, 3], [2, 6]] == [[2, 6], [1, 3]]
2 failed, 4 passed in 0.01s
```

Two reds, one per slip:

- `[1,10]` then `[2,3]` sets the end to 3, which shrinks the block.
- `.sort()` reordered the caller's list.

#### Stage 3: `max`, and sort a copy

```python
# file: intervals.py
def merge(intervals):
    out = []
    for start, end in sorted(intervals, key=lambda iv: iv[0]):   # a new list
        if out and start <= out[-1][1]:
            out[-1][1] = max(out[-1][1], end)                     # never shrink
        else:
            out.append([start, end])                              # a fresh pair
    return out
```

```bash
pytest -q --tb=no -rf test_intervals.py
```

```text
......                                                                                       [100%]
6 passed in 0.01s
```

**Time:** O(n log n) for the sort plus O(n) for the sweep. **Space:** O(n) for the sorted copy and the output.

### Step 5 · Run everything and refactor

#### Trace `[[1,10], [2,3], [4,12], [13,14]]`

| interval | last block before | overlaps? | last block after | out |
|---|---|---|---|---|
| [1,10] | — | — | [1,10] | [[1,10]] |
| [2,3] | [1,10] | 2 ≤ 10 | [1, max(10,3)] = [1,10] | [[1,10]] |
| [4,12] | [1,10] | 4 ≤ 10 | [1, max(10,12)] = [1,12] | [[1,12]] |
| [13,14] | [1,12] | 13 > 12 | new | [[1,12],[13,14]] |

#### Refactor: make the touching rule explicit

The `<=` silently encodes "touching intervals merge". Name it with a parameter defaulting to the agreed behaviour, so the next reader sees the decision. The existing tests must stay green, and we add one for the other setting:

```python
# file: test_intervals.py (append)
def test_touching_can_be_kept_separate():
    assert merge([[1, 2], [2, 3]], merge_touching=False) == [[1, 2], [2, 3]]
```

```python
# file: intervals.py
Interval = list[int]


def merge(intervals: list[Interval], merge_touching: bool = True) -> list[Interval]:
    """Merge overlapping intervals; returns new lists sorted by start, input untouched."""
    out: list[Interval] = []
    for start, end in sorted(intervals, key=lambda iv: iv[0]):
        if out and (start <= out[-1][1] if merge_touching else start < out[-1][1]):
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out
```

```bash
pytest -q --tb=no -rf test_intervals.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Given everyone's busy calendars, find free slots of at least 30 minutes"

**First ask:** within working hours? One time zone? Times in minutes since midnight?

**What changes:** reuse `merge`.

1. Flatten everyone's busy intervals into one list and merge them.
2. Walk the gaps: before the first block (from the day's start), between consecutive blocks, and after the last block (to the day's end). Clip blocks to working hours.
3. Keep gaps of at least `min_len`.

**Test first** (9:00 = 540, 17:00 = 1020):

```python
# file: test_intervals.py (append)
from intervals import free_slots


def test_team_free_slots_of_at_least_30_minutes():
    alice = [[540, 600], [720, 780]]          # 9:00–10:00, 12:00–13:00
    bob = [[570, 630], [900, 960], [1000, 1100]]
    # merged busy: [540,630] [720,780] [900,960] [1000,1100→clipped to 1020]
    assert free_slots([alice, bob], 540, 1020, 30) == [[630, 720], [780, 900], [960, 1000]]


def test_short_gaps_are_ignored():
    assert free_slots([[[540, 600]], [[620, 1020]]], 540, 1020, 30) == []
```

```python
# file: intervals.py (append)
def free_slots(calendars, day_start, day_end, min_len):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_intervals.py -k "free or short"
```

```text
FF                                                                                           [100%]
===================================== short test summary info =====================================
FAILED test_intervals.py::test_team_free_slots_of_at_least_30_minutes - NotImplementedError
FAILED test_intervals.py::test_short_gaps_are_ignored - NotImplementedError
2 failed, 7 deselected in 0.01s
```

```python
# file: intervals.py (replace the free_slots stub)
def free_slots(calendars: list[list[Interval]], day_start: int, day_end: int,
               min_len: int) -> list[Interval]:
    """Gaps of at least min_len inside [day_start, day_end] where nobody is busy."""
    busy = merge([iv for cal in calendars for iv in cal])
    slots, cursor = [], day_start
    for start, end in busy:
        start, end = max(start, day_start), min(end, day_end)    # clip to working hours
        if start - cursor >= min_len:
            slots.append([cursor, start])
        cursor = max(cursor, end)
    if day_end - cursor >= min_len:
        slots.append([cursor, day_end])
    return slots
```

```bash
pytest -q --tb=no -rf test_intervals.py
```

```text
.........                                                                                    [100%]
9 passed in 0.01s
```

#### Follow-up 2: "The list is already merged and sorted; insert one new interval"

**What changes:** don't re-sort, which would be O(n log n). One O(n) pass in three phases:

1. Copy every block that ends before the new interval starts.
2. Absorb every block that overlaps it, widening the new interval.
3. Copy the rest.

**Test first:**

```python
# file: test_intervals.py (append)
from intervals import insert


def test_insert_into_a_merged_list():
    merged = [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]]
    assert insert(merged, [4, 8]) == [[1, 2], [3, 10], [12, 16]]
    assert insert(merged, [17, 18]) == merged + [[17, 18]]
    assert insert([], [5, 7]) == [[5, 7]]
```

```python
# file: intervals.py (append)
def insert(merged, new):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_intervals.py -k insert
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_intervals.py::test_insert_into_a_merged_list - NotImplementedError
1 failed, 9 deselected in 0.01s
```

```python
# file: intervals.py (replace the insert stub)
def insert(merged: list[Interval], new: Interval) -> list[Interval]:
    """Insert into a sorted, non-overlapping list in O(n), without re-sorting."""
    start, end = new
    out, i, n = [], 0, len(merged)
    while i < n and merged[i][1] < start:            # 1. entirely before
        out.append(list(merged[i]))
        i += 1
    while i < n and merged[i][0] <= end:             # 2. overlapping: absorb
        start, end = min(start, merged[i][0]), max(end, merged[i][1])
        i += 1
    out.append([start, end])
    out.extend(list(iv) for iv in merged[i:])        # 3. entirely after
    return out
```

```bash
pytest -q --tb=no -rf test_intervals.py
```

```text
..........                                                                                   [100%]
10 passed in 0.01s
```

#### Follow-up 3: "There are a billion intervals; they don't fit in memory"

Sort them externally (sort chunks that fit in memory, write each to disk, then merge the sorted files as streams). After that the sweep is naturally streaming: it only ever holds the current block. If the data already arrives sorted by start, you can merge online as it streams past.

### Mock dialogue

**Interviewer:** Merge overlapping intervals.

**You:** Should touching intervals like 1–2 and 2–3 merge? For calendar slots I’d expect not; for numeric ranges I’d expect yes.

**Interviewer:** Merge them.

**You:** Is the input sorted, and is it fine to sort a copy?

**Interviewer:** Not sorted. A copy is fine.

**You:** Before coding, the tests: your example, unsorted input, touching intervals, an interval contained inside another, empty and single inputs, and that the caller's list is left alone.

**You:** Plan: sort by start, then sweep. If the next interval starts at or before the last merged end, extend that end to the larger of the two; otherwise start a new block. Sorting guarantees that once an interval starts past the current end, nothing later can overlap the current block. n log n overall.

**You:** I’m using max for the end, because a short interval inside a long one mustn’t shrink it. That's exactly my contained-interval test: 1–10 and 2–3 gives 1–10.

> *Why this works:* Volunteering the contained-interval test before the interviewer asks is an easy way to show care.

**Interviewer:** Given everyone’s busy times, find 30-minute free slots for the team.

**You:** Within working hours, in one time zone? Then I'll write a test with two calendars first. I merge everyone’s busy intervals into one list and look at the gaps between consecutive merged blocks, plus before the first and after the last, keeping gaps of at least 30 minutes.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| `out[-1][1] = end` instead of `max(...)` | A contained interval shrinks the block. | `test_contained_interval_does_not_shrink_the_block` |
| Sorting the caller's list in place without saying so | Surprising side effect for the caller. | `test_input_is_left_untouched` |
| Appending the original pair instead of a copy | Later `max` writes change the caller's intervals. | `test_input_is_left_untouched` |
| Not asking about touching intervals | The `<=` vs `<` decision is made by accident. | `test_touching_intervals_merge`, `test_touching_can_be_kept_separate` |
| Comparing with every earlier block | O(n²) where O(n) after sorting is enough. | None (speed). |
| Re-sorting to insert one interval | O(n log n) where O(n) suffices. | `test_insert_into_a_merged_list` (behaviour); say the cost. |
