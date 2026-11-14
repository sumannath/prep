### Problem

You get a list of files: `(name, size, collections)`. A file may belong to zero, one or several collections. Return the total size of all files in the system and the top `N` collections by size.

#### In plain words

Think of a storage dashboard. Every file has a size, and can be tagged with any number of "collections" (folders, albums, projects). You must report two things:

1. How much space all files take together.
2. The `N` collections that take the most space, biggest first.

A file in two collections counts fully in **both**. A file in no collection still counts toward the total.

#### Words used on this page

| Term | Meaning |
|---|---|
| Many-to-many | One file can be in many collections, and one collection holds many files. |
| Hashmap / dict | Key → value lookup in O(1) on average. Here: collection name → running total. |
| Heap | A structure that always gives you its smallest item in O(1) and adds/removes in O(log n). |
| Top N | The N largest items, in order. |
| Tie-break | The rule for ordering two items that are equal on the main key. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

One pass: add each file’s size to the grand total and to every distinct collection it lists (a `defaultdict`, with `set()` to dedupe). Get the top N with a size-N heap in O(C log N) instead of sorting at O(C log C); for "biggest first, ties alphabetical" use `heapq.nsmallest(n, items, key=lambda kv: (-kv[1], kv[0]))` (not `nlargest` with `(size, name)`, which breaks ties reverse-alphabetically). For nested collections, walk parent pointers up from each of the file’s collections into an ancestor set (stop at an already-seen node), then add the size once per ancestor. Rolling child totals into parents would double count a file in two sibling collections. For live data, apply deltas along the same ancestor set.

**Cheat sheet**

1. **Ask:** many collections per file? repeats on one file? uncategorised files count in total? tie order? N small?
2. **Tests first:** total incl. uncategorised, multi-collection, repeated tag once, ties alphabetical, N > C, empty.
3. **Build:** one pass into `defaultdict(int)` with `set(collections)`; top N via `nsmallest` on `(-size, name)`.
4. **Cost:** O(L + C log N) time where L = file→collection links; O(C) space.
5. **Follow-ups:** nested → ancestor *set* per file; live → keep totals, apply ± deltas.

### Background you need

#### 1. Dictionaries and `defaultdict`

A dictionary maps a key to a value and finds it in O(1) on average. `defaultdict(int)` starts missing keys at 0, so you can write `sizes[c] += size` without checking first.

```python
from collections import defaultdict

sizes = defaultdict(int)
sizes["photos"] += 200
sizes["photos"] += 200
sizes["music"] += 300
print(dict(sizes))
```

```text
{'photos': 400, 'music': 300}
```

#### 2. Sets remove duplicates

`set(["x", "x", "y"])` is `{"x", "y"}`. We'll use it so that a file tagged with the same collection twice is only counted once.

```python
print(sorted(set(["x", "x", "y"])))
```

```text
['x', 'y']
```

#### 3. Sorting by more than one thing

`sorted` accepts a `key` function. If the key returns a tuple, Python compares the first element, then the second on ties, and so on. To sort one number **descending** while keeping names **ascending**, negate the number.

```python
items = [("beta", 10), ("alpha", 10), ("gamma", 30)]
print(sorted(items, key=lambda kv: (-kv[1], kv[0])))   # biggest first, then A→Z
```

```text
[('gamma', 30), ('alpha', 10), ('beta', 10)]
```

#### 4. Heaps and `heapq`

A **min-heap** keeps its smallest item at the front. Adding or removing costs O(log n). Python's `heapq` module provides two shortcuts:

- `heapq.nsmallest(n, items, key=...)` returns the n items with the smallest key, in order.
- `heapq.nlargest(n, items, key=...)` returns the n items with the largest key, in order.

Both cost O(C log n) for C items, instead of O(C log C) to sort everything. When n is 10 and C is a million, that's a big saving.

```python
import heapq

items = [("beta", 10), ("alpha", 10), ("gamma", 30)]
print(heapq.nsmallest(2, items, key=lambda kv: (-kv[1], kv[0])))
print(heapq.nlargest(2, items, key=lambda kv: (kv[1], kv[0])))
```

```text
[('gamma', 30), ('alpha', 10)]
[('gamma', 30), ('beta', 10)]
```

Look closely at the second line. `nlargest` with key `(size, name)` picks the *largest* name on a tie, so "beta" beats "alpha". That's reverse-alphabetical, a classic slip we'll catch with a test.

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Can one file belong to several collections? | Decides whether this is a simple group-by or many-to-many. | Yes → loop over each file's collections and add the size to each. No → one collection per file, plain group-by. |
| Could the same collection appear twice in one file's list? | A plain loop would add the size twice. | Count once → `set(collections)`. Count twice → loop over the raw list (and say it's surprising). |
| Do files with no collection count toward the total? | Easy to drop them by accident. | Yes (usual) → add every file to `total`, whatever its collections. |
| How should equal-sized collections be ordered? | Without a rule the output order is random, and tests flake. | Alphabetical → key `(-size, name)`. "Any order" → still pick one so tests are stable. |
| Is N small compared with the number of collections? | Decides sort vs heap. | Small N → heap, O(C log N). N close to C → just sort, O(C log C). |
| What if N is bigger than the number of collections? | Edge case. | Return all of them. |
| One-off report, or do files change over time? | Batch function vs a class with updates. | One-off → a function. Live → keep totals and apply deltas (see Follow-ups). |

**If they say "your call", state your defaults out loud:**

> "I'll assume: files can be in several collections, a repeated tag on one file counts once, uncategorised files count toward the total, ties go alphabetically, N is small, and if N exceeds the number of collections I return them all."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass, as pytest tests."

#### Work the example by hand first

```text
file1  100  []              → total 100
file2  200  [collection1]   → total 300, collection1 200
file3  200  [collection1]   → total 500, collection1 400
file4  300  [collection2]   → total 800, collection2 300
file5   10  []              → total 810
top 2 → [(collection1, 400), (collection2, 300)]
```

#### The tests, one per requirement

The implementation will live in `collections_report.py`; the tests in `test_collections_report.py`.

```python
# file: test_collections_report.py
from collections_report import collection_report

FILES = [
    ("file1.txt", 100, []),
    ("file2.txt", 200, ["collection1"]),
    ("file3.txt", 200, ["collection1"]),
    ("file4.txt", 300, ["collection2"]),
    ("file5.txt", 10, []),
]


def test_total_includes_files_without_collections():
    total, _ = collection_report(FILES, 2)
    assert total == 810


def test_top_n_ordered_by_size():
    _, top = collection_report(FILES, 2)
    assert top == [("collection1", 400), ("collection2", 300)]


def test_file_in_several_collections_counts_in_each():
    files = [("a", 50, ["x", "y"]), ("b", 10, ["y"])]
    assert collection_report(files, 2) == (60, [("y", 60), ("x", 50)])


def test_repeated_collection_on_one_file_counts_once():
    assert collection_report([("a", 50, ["x", "x"])], 1) == (50, [("x", 50)])


def test_ties_broken_alphabetically():
    files = [("a", 10, ["beta"]), ("b", 10, ["alpha"]), ("c", 10, ["gamma"])]
    _, top = collection_report(files, 2)
    assert top == [("alpha", 10), ("beta", 10)]


def test_n_larger_than_number_of_collections():
    _, top = collection_report(FILES, 10)
    assert top == [("collection1", 400), ("collection2", 300)]


def test_empty_input():
    assert collection_report([], 3) == (0, [])
```

#### Red: run them against an empty stub

```python
# file: collections_report.py
def collection_report(files, n):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_collections_report.py
```

```text
FFFFFFF                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_collections_report.py::test_total_includes_files_without_collections - NotImplemented...
FAILED test_collections_report.py::test_top_n_ordered_by_size - NotImplementedError
FAILED test_collections_report.py::test_file_in_several_collections_counts_in_each - NotImplement...
FAILED test_collections_report.py::test_repeated_collection_on_one_file_counts_once - NotImplemen...
FAILED test_collections_report.py::test_ties_broken_alphabetically - NotImplementedError
FAILED test_collections_report.py::test_n_larger_than_number_of_collections - NotImplementedError
FAILED test_collections_report.py::test_empty_input - NotImplementedError
7 failed in 0.01s
```

All seven fail, so they can catch something. Now make them pass.

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. A file in two collections contributes its full size to both. What's the cheapest way to visit every (file, collection) pair once?
2. Totals keyed by collection name: which structure updates a named total in O(1)?
3. You only need the top N. Do you really need to order all C collections?

#### Brute force first

For every collection, scan every file and add up the ones that contain it. It's correct, but it costs O(C × F): a thousand collections and a million files means a billion checks.

#### The key insight

Flip the loops. Walk the files **once**, and push each file's size into every collection it lists. The work is now proportional to the number of file→collection links, which is the minimum possible, since you have to look at each link at least once.

#### Then: top N without sorting everything

Sorting all C collections costs O(C log C). A heap that keeps only the best N costs O(C log N). With N = 10 and C = 1,000,000 that's about 3 vs 20 steps per item.

#### The plan (say this, then wait for a nod)

> **Say:** "One pass over the files: add each size to the grand total, and to a dictionary entry for each distinct collection it lists. Then take the top N with a heap, ordered by size descending and name ascending. That's linear in the file-collection links plus C log N. Sound good?"

How this maps to the tests:

- Adding every file to `total` → `test_total_includes_files_without_collections`.
- Looping over each file's collections → `test_file_in_several_collections_counts_in_each`.
- `set(collections)` → `test_repeated_collection_on_one_file_counts_once`.
- Key `(-size, name)` → `test_ties_broken_alphabetically`.

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: brute force (correct, slow)

> **Say:** "First a version that's obviously correct, so the tests prove the requirements; then I'll make it fast with the tests guarding me."

```python
# file: collections_report.py
def collection_report(files, n):
    files = list(files)
    total = sum(size for _name, size, _cols in files)
    names = {c for _name, _size, cols in files for c in cols}
    sizes = []
    for c in names:                                    # for every collection…
        size = sum(s for _n, s, cols in files if c in cols)   # …scan every file
        sizes.append((c, size))
    sizes.sort(key=lambda kv: (-kv[1], kv[0]))         # biggest first, then A→Z
    return total, sizes[:n]
```

```bash
pytest -q --tb=no -rf test_collections_report.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

All green, but O(C × F).

#### Stage 2: one pass with a dictionary

> **Say:** "Now one pass over the files. The `set` guards against a collection repeated on the same file."

```python
# file: collections_report.py
from collections import defaultdict


def collection_report(files, n):
    total = 0
    sizes = defaultdict(int)                 # collection -> total size
    for _name, size, collections in files:
        total += size                        # every file counts toward the total
        for c in set(collections):           # each distinct collection once
            sizes[c] += size
    ranked = sorted(sizes.items(), key=lambda kv: (-kv[1], kv[0]))
    return total, ranked[:n]
```

```bash
pytest -q --tb=no -rf test_collections_report.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

Still green, and the totals are now O(links). Only the full sort is left.

#### Stage 3: a heap for the top N (and a trap)

> **Say:** "I only need N items, so a heap instead of a full sort."

The obvious first try is `nlargest` keyed by `(size, name)`:

```python
# file: collections_report.py
import heapq
from collections import defaultdict


def collection_report(files, n):
    total = 0
    sizes = defaultdict(int)
    for _name, size, collections in files:
        total += size
        for c in set(collections):
            sizes[c] += size
    top = heapq.nlargest(n, sizes.items(), key=lambda kv: (kv[1], kv[0]))
    return total, top
```

```bash
pytest -q --tb=no -rf test_collections_report.py
```

```text
....F..                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_collections_report.py::test_ties_broken_alphabetically - AssertionError: assert [('ga...
1 failed, 6 passed in 0.01s
```

The tie test caught it. `nlargest` picks the *largest* key, and on equal sizes the largest name is the one later in the alphabet, so we get gamma and beta instead of alpha and beta. Fix: ask for the *smallest* key of `(-size, name)`, which is exactly "biggest size, then A→Z".

```python
# file: collections_report.py
import heapq
from collections import defaultdict


def collection_report(files, n):
    total = 0
    sizes = defaultdict(int)
    for _name, size, collections in files:
        total += size
        for c in set(collections):
            sizes[c] += size
    top = heapq.nsmallest(n, sizes.items(), key=lambda kv: (-kv[1], kv[0]))
    return total, top
```

```bash
pytest -q --tb=no -rf test_collections_report.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

All green.

**Time:** O(L + C log N), where L is the number of file→collection links. **Space:** O(C).

### Step 5 · Run everything and refactor

#### Trace the example against the final code

| file | size | collections | total after | sizes after |
|---|---|---|---|---|
| file1 | 100 | `[]` | 100 | `{}` |
| file2 | 200 | `[collection1]` | 300 | `{collection1: 200}` |
| file3 | 200 | `[collection1]` | 500 | `{collection1: 400}` |
| file4 | 300 | `[collection2]` | 800 | `{collection1: 400, collection2: 300}` |
| file5 | 10 | `[]` | 810 | unchanged |

`nsmallest(2, …, key=(-size, name))` → `[(collection1, 400), (collection2, 300)]`.

#### Refactor: real input is messier

Real data often has `None` instead of an empty list for "no collections". Pin that down with a test first:

```python
# file: test_collections_report.py (append)
def test_collections_may_be_none():
    assert collection_report([("a", 5, None), ("b", 7, ["x"])], 1) == (12, [("x", 7)])
```

```bash
pytest -q --tb=no -rf test_collections_report.py
```

```text
.......F                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_collections_report.py::test_collections_may_be_none - TypeError: 'NoneType' object is...
1 failed, 7 passed in 0.01s
```

Red: `set(None)` raises a `TypeError`. The fix is one expression, `collections or []`, plus type hints and a docstring while we're here:

```python
# file: collections_report.py
import heapq
from collections import defaultdict
from typing import Iterable

File = tuple[str, int, list[str] | None]


def collection_report(files: Iterable[File], n: int) -> tuple[int, list[tuple[str, int]]]:
    """Total size of all files, and the n largest collections (ties A→Z)."""
    total = 0
    sizes: dict[str, int] = defaultdict(int)
    for _name, size, collections in files:
        total += size
        for c in set(collections or []):
            sizes[c] += size
    top = heapq.nsmallest(n, sizes.items(), key=lambda kv: (-kv[1], kv[0]))
    return total, top
```

```bash
pytest -q --tb=no -rf test_collections_report.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Collections can be nested; a parent's size includes everything beneath it"

**What changes:** each collection may have a parent (`parent["A1"] = "A"`). A file in `A1` now also counts toward `A`.

**The trap:** computing each collection's own size and then adding children into parents double counts. If a file is in both `A1` and `A2`, both under `A`, then `A` receives it once via `A1` and again via `A2`.

**The fix:** go file by file. For each file, walk upward from each of its collections and collect every ancestor into a **set**, then add the size once per member of the set. Stop a walk early when you reach a collection already in the set: its ancestors are already there. That also stops infinite loops if the data accidentally contains a cycle.

```text
parent: A1→A, A2→A
file f (size 50) in [A1, A2]
walk from A1: add A1, add A
walk from A2: add A2, A already in set → stop
ancestors = {A1, A2, A} → each gets +50 once
```

**Tests first:**

```python
# file: test_collections_report.py (append)
from collections_report import nested_report


def test_nested_parent_counts_file_in_two_children_once():
    parent = {"A1": "A", "A2": "A", "A": None}
    total, top = nested_report([("f", 50, ["A1", "A2"])], parent, 3)
    assert total == 50
    assert top == [("A", 50), ("A1", 50), ("A2", 50)]


def test_nested_sizes_roll_up_a_chain():
    parent = {"leaf": "mid", "mid": "root"}
    _, top = nested_report([("f", 5, ["leaf"]), ("g", 3, ["mid"])], parent, 3)
    assert top == [("mid", 8), ("root", 8), ("leaf", 5)]   # tie at 8 → A→Z


def test_nested_survives_a_cycle_in_bad_data():
    parent = {"x": "y", "y": "x"}
    assert nested_report([("f", 1, ["x"])], parent, 2) == (1, [("x", 1), ("y", 1)])
```

```python
# file: collections_report.py (append)
def nested_report(files, parent, n):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_collections_report.py -k nested
```

```text
FFF                                                                                          [100%]
===================================== short test summary info =====================================
FAILED test_collections_report.py::test_nested_parent_counts_file_in_two_children_once - NotImple...
FAILED test_collections_report.py::test_nested_sizes_roll_up_a_chain - NotImplementedError
FAILED test_collections_report.py::test_nested_survives_a_cycle_in_bad_data - NotImplementedError
3 failed, 8 deselected in 0.01s
```

```python
# file: collections_report.py (replace the nested_report stub)
def nested_report(files: Iterable[File], parent: dict[str, str | None], n: int):
    """Like collection_report, but a collection's size includes all its descendants."""
    total = 0
    sizes: dict[str, int] = defaultdict(int)
    for _name, size, collections in files:
        total += size
        ancestors: set[str] = set()
        for c in collections or []:
            while c is not None and c not in ancestors:   # stop at anything already counted
                ancestors.add(c)
                c = parent.get(c)
        for c in ancestors:
            sizes[c] += size                              # once per ancestor, never twice
    return total, heapq.nsmallest(n, sizes.items(), key=lambda kv: (-kv[1], kv[0]))
```

Run:

```bash
pytest -q --tb=no -rf test_collections_report.py -k nested
```

```text
...                                                                                          [100%]
3 passed, 8 deselected in 0.01s
```

**Time:** O(F × k × depth) for the walks, where k is collections per file.

#### Follow-up 2: "This powers a live dashboard; files are added and deleted all the time"

**What changes:** recomputing from scratch on every change is wasteful. Keep the totals in an object and apply **deltas**: adding a file adds its size along its ancestor set; deleting subtracts it. Remember each file's size and ancestors, so a delete knows what to undo.

**Test first:**

```python
# file: test_collections_report.py (append)
from collections_report import CollectionIndex


def test_live_index_add_and_remove():
    idx = CollectionIndex(parent={"A1": "A"})
    idx.add_file("f", 50, ["A1"])
    idx.add_file("g", 30, ["B"])
    assert idx.total == 80
    assert idx.top(2) == [("A", 50), ("A1", 50)]
    idx.remove_file("f")
    assert idx.total == 30
    assert idx.top(2) == [("B", 30)]
```

```python
# file: collections_report.py (append)
class CollectionIndex:
    def __init__(self, parent=None):
        self.total = 0

    def add_file(self, name, size, collections):
        raise NotImplementedError

    def remove_file(self, name):
        raise NotImplementedError

    def top(self, n):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_collections_report.py -k live
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_collections_report.py::test_live_index_add_and_remove - NotImplementedError
1 failed, 11 deselected in 0.01s
```

```python
# file: collections_report.py (replace the CollectionIndex stub)
class CollectionIndex:
    """Running totals that stay correct as files come and go."""

    def __init__(self, parent: dict[str, str | None] | None = None):
        self.parent = parent or {}
        self.total = 0
        self.sizes: dict[str, int] = defaultdict(int)
        self.files: dict[str, tuple[int, set[str]]] = {}   # name -> (size, ancestors)

    def _ancestors(self, collections):
        seen: set[str] = set()
        for c in collections or []:
            while c is not None and c not in seen:
                seen.add(c)
                c = self.parent.get(c)
        return seen

    def add_file(self, name: str, size: int, collections) -> None:
        ancestors = self._ancestors(collections)
        self.files[name] = (size, ancestors)
        self.total += size
        for c in ancestors:
            self.sizes[c] += size

    def remove_file(self, name: str) -> None:
        size, ancestors = self.files.pop(name)
        self.total -= size
        for c in ancestors:
            self.sizes[c] -= size
            if self.sizes[c] == 0:
                del self.sizes[c]                          # empty collections drop out

    def top(self, n: int) -> list[tuple[str, int]]:
        return heapq.nsmallest(n, self.sizes.items(), key=lambda kv: (-kv[1], kv[0]))
```

```bash
pytest -q --tb=no -rf test_collections_report.py
```

```text
............                                                                                 [100%]
12 passed in 0.01s
```

Updates are O(ancestors); `top` is O(C log N) per read. If reads vastly outnumber writes, keep a sorted structure (e.g. `sortedcontainers.SortedList` of `(-size, name)`) so `top` is O(N).

> **Say:** "Do you expect more writes or more reads? That decides whether I pay at write time to keep the ranking ready."

### Mock dialogue

**Interviewer:** You get a list of files with a name, a size and the collections they belong to. Return the total size of all files and the top N collections by size.

**You:** Can a file be in more than one collection? And can it be in none?

**Interviewer:** Both, yes.

**You:** So a file in two collections contributes its full size to both, and files in no collection still count toward the total. Is that right?

**Interviewer:** Correct.

> *Why this works:* Restating the rule as a sentence confirms the many-to-many relationship. Candidates who skip this end up writing a plain group-by.

**You:** How should ties be broken? I’ll go alphabetical unless you prefer otherwise. And is N usually small, like a top-10 dashboard?

**Interviewer:** Alphabetical is fine. Yes, N is small.

**You:** Before coding I'll write the tests: your example, a file in two collections, a repeated tag counted once, an alphabetical tie, N larger than the number of collections, and empty input.

**You:** Plan: one pass over the files, adding each size to the overall total and to a dictionary entry for each of its collections. Then a heap of size N for the top collections, which is cheaper than sorting everything when N is small. Overall linear in the file-collection links, plus C log N.

**Interviewer:** Why not just sort?

**You:** Sorting is fine for small inputs and I’d accept it in a first version. With a million collections and N of 10, the heap avoids ordering 999,990 items nobody looks at.

**You:** The tests are green, including the tie case. That one matters: `nlargest` keyed on size and name would have returned reverse-alphabetical order, so I use `nsmallest` on negative size and name.

**Interviewer:** Now collections can be nested. A collection’s size includes its sub-collections.

**You:** Can a file sit in two collections that share a parent? If so, the parent must only count it once.

**Interviewer:** Yes, it can.

**You:** Then rolling child totals into parents would double count. I'll add a failing test for exactly that. Then, for each file, I walk up from each of its collections, collect the ancestors in a set, and add the size once per ancestor. The walk is proportional to the hierarchy’s depth.

**Interviewer:** And if this powers a live dashboard?

**You:** I’d keep the totals and update them incrementally on file add and delete, using the same ancestor walk. Do you expect more writes or more reads? If reads dominate, it’s worth maintaining a sorted structure so the top N is always ready.

> *Why this works:* Asking about the read/write ratio shows you choose data structures from the workload, not from habit.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Treating it as a plain group-by (one collection per file) | Multi-collection files are undercounted. | `test_file_in_several_collections_counts_in_each` |
| Dropping files with no collection | The total comes out too small. | `test_total_includes_files_without_collections` |
| No `set()` around a file's collections | A repeated tag doubles the size. | `test_repeated_collection_on_one_file_counts_once` |
| `nlargest(…, key=(size, name))` | Ties come out reverse-alphabetical. | `test_ties_broken_alphabetically` |
| Rolling child totals into parents | A file in two sibling collections is counted twice in the parent. | `test_nested_parent_counts_file_in_two_children_once` |
| Walking parents with no "already seen" stop | Bad data with a cycle loops forever. | `test_nested_survives_a_cycle_in_bad_data` |
| Sorting everything when N is tiny | O(C log C) instead of O(C log N); say why you chose. | None (speed, not behaviour). |
