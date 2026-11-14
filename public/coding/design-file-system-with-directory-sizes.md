### Problem

`create_path(path, value)` succeeds only if the parent exists and the path doesn't. `get(path)` returns the value or -1.

Follow-up: files have sizes; return the size of any directory (including descendants) and the top N directories.

#### In plain words

Part 1 is a tiny file system of paths like `/a/b/c`:

- `create_path("/a/b", 5)` stores 5 at `/a/b`, but only if `/a` already exists and `/a/b` doesn't. It returns `True` on success, `False` otherwise.
- `get("/a/b")` returns the stored value, or -1 if the path doesn't exist.

Part 2 (the usual follow-up): files have sizes. Answer "how big is this directory, including everything inside it?" and "which N directories are biggest?", as for a storage dashboard.

#### Words used on this page

| Term | Meaning |
|---|---|
| Path segment | One piece between slashes: `/a/b` has segments `a` and `b`. |
| Parent path | Everything before the last slash: the parent of `/a/b` is `/a`, and of `/a` it's `""` (the root). |
| Sentinel | A dummy entry (here, the root `""`) that removes a special case. |
| Trie | A tree with one level per path segment. |
| Precompute on write | Update stored totals when data changes, so reads are instant. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

Base version: a dict from full path to value, with the empty string pre-stored as root. `create_path` validates the path (leading slash, no empty segments), checks the path is absent and its parent (`path[:path.rfind("/")]`) is present. For sizes, use a trie of directories where each node keeps a running total; `add_file` adds the size (or the delta, if the file is overwritten) to every directory on the path, making `dir_size` an O(depth) lookup. You pay on write because dashboards read far more than they write. Top N is a traversal plus a heap with `(-size, path)`. Deleting subtracts along the path; moving a directory subtracts its total from the old ancestors and adds it to the new ones, O(depth), not O(files).

**Cheat sheet**

1. **Ask:** parent must exist? create twice? valid path format? read/write ratio? delete and move?
2. **Tests first:** top-level, nested, missing parent, duplicate, missing get, invalid paths.
3. **Build:** `paths = {"": -1}`; parent = `path[:path.rfind("/")]`; validate first.
4. **Sizes:** dir trie with `total` per node; add along the path; `top_dirs` → `nsmallest(n, key=(-total, path))`.
5. **Delete/move:** ± along ancestors with parent pointers; O(depth).

### Background you need

#### 1. The parent of a path

`path.rfind("/")` finds the **last** slash, so slicing up to it gives the parent:

```python
for path in ["/a/b/c", "/a"]:
    print(repr(path[: path.rfind("/")]))
```

```text
'/a/b'
''
```

A top-level path's parent is the empty string. If you store `""` as the root up front (a **sentinel**), "does the parent exist?" works for top-level paths with no special case.

#### 2. Validating a path

Decide what's legal and check it first. A sensible rule: starts with `/`, doesn't end with `/`, and has no empty segments (`//`).

```python
def valid(path):
    return path.startswith("/") and all(path.split("/")[1:])   # no empty segment after the first ''

print([valid(p) for p in ["/a/b", "/", "", "a", "/a/", "/a//b"]])
```

```text
[True, False, False, False, False, False]
```

#### 3. Precompute on write vs compute on read

To answer "size of `/docs`", you can either walk everything under `/docs` at query time (cheap writes, slow reads) or keep a running total on every directory and update it whenever a file is added (slightly slower writes, instant reads). For a dashboard that's read far more than it's written, precompute.

#### 4. Top N with a heap

`heapq.nsmallest(n, items, key=lambda kv: (-size, path))` gives the n biggest, ties broken alphabetically, in O(D log n) for D directories. (`nlargest` keyed on `(size, path)` would break ties reverse-alphabetically.)

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Should creating a path fail if its parent doesn't exist? | Core rule. | Yes → check the parent. No (`mkdir -p`) → create missing parents. |
| Can a path be created twice? | Overwrite vs refuse. | Refuse (usual) → return `False`, keep the old value. |
| What counts as a valid path? Root, trailing slash, `//`? | Garbage in. | Leading slash, no trailing slash, no empty segments; otherwise return `False`. |
| What does `get` return for a missing path? | API. | -1 (LeetCode) or `None`. |
| (Sizes) Are reads far more common than writes? | Precompute or not. | Read-heavy → running totals per directory. Write-heavy → compute on read. |
| (Sizes) Will files be deleted or directories moved? | Needs parent pointers. | Yes → keep `parent` on each node (see Follow-ups). |

**If they say "your call", state your defaults out loud:**

> "The parent must exist, creating an existing path returns False, paths must start with a slash with no empty segments, and get on a missing path returns -1."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass."

#### Work an example by hand

```text
paths = {"": -1}                         (root sentinel)
create("/a", 1)     parent ""  exists, "/a" absent    → True
create("/a/b", 2)   parent "/a" exists, absent        → True
create("/c/d", 3)   parent "/c" missing               → False
create("/a", 9)     "/a" already exists               → False
get("/a/b") → 2     get("/x") → -1
```

#### The tests, one per requirement

Code in `fs.py`, tests in `test_fs.py`.

```python
# file: test_fs.py
import pytest

from fs import FileSystem


def test_top_level_path():
    fs = FileSystem()
    assert fs.create_path("/a", 1) is True
    assert fs.get("/a") == 1


def test_nested_path():
    fs = FileSystem()
    fs.create_path("/a", 1)
    assert fs.create_path("/a/b", 2) is True
    assert fs.get("/a/b") == 2


def test_parent_must_exist():
    fs = FileSystem()
    assert fs.create_path("/c/d", 3) is False
    assert fs.get("/c/d") == -1


def test_cannot_create_twice():
    fs = FileSystem()
    fs.create_path("/a", 1)
    assert fs.create_path("/a", 9) is False
    assert fs.get("/a") == 1


def test_missing_path_returns_minus_one():
    assert FileSystem().get("/nope") == -1


@pytest.mark.parametrize("bad", ["", "/", "a", "/a/", "/a//b"])
def test_invalid_paths_are_rejected(bad):
    fs = FileSystem()
    fs.create_path("/a", 1)
    assert fs.create_path(bad, 5) is False
```

`@pytest.mark.parametrize` runs the last test once per bad path, so each shows up separately in the report.

#### Red: run them against an empty stub

```python
# file: fs.py
class FileSystem:
    def create_path(self, path, value):
        raise NotImplementedError

    def get(self, path):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_fs.py
```

```text
FFFFFFFFFF                                                                                   [100%]
===================================== short test summary info =====================================
FAILED test_fs.py::test_top_level_path - NotImplementedError
FAILED test_fs.py::test_nested_path - NotImplementedError
FAILED test_fs.py::test_parent_must_exist - NotImplementedError
FAILED test_fs.py::test_cannot_create_twice - NotImplementedError
FAILED test_fs.py::test_missing_path_returns_minus_one - NotImplementedError
FAILED test_fs.py::test_invalid_paths_are_rejected[] - NotImplementedError
FAILED test_fs.py::test_invalid_paths_are_rejected[/] - NotImplementedError
FAILED test_fs.py::test_invalid_paths_are_rejected[a] - NotImplementedError
FAILED test_fs.py::test_invalid_paths_are_rejected[/a/] - NotImplementedError
FAILED test_fs.py::test_invalid_paths_are_rejected[/a//b] - NotImplementedError
10 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. Do you need a tree, or is a dict from full path to value enough?
2. How do you get a path's parent from the string?
3. What's the parent of a top-level path, and how do you avoid special-casing it?

#### The key insight

You never need to list a directory's children here, only "does this exact path exist?". So a **dict from full path to value** is enough. The parent is `path[:path.rfind("/")]`. Pre-store `""` as the root, and top-level paths need no special case. Validate the path first, so `/` or `/a/` can't sneak in.

#### The plan (say this, then wait for a nod)

> **Say:** "A dict from full path to value, with the empty string stored as the root. create_path validates the path, then succeeds only if the path is absent and its parent, the part before the last slash, is present. get is a dict lookup with -1 as the default. Both are O(L) for a path of length L, for slicing and hashing."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: a dict, no root sentinel

```python
# file: fs.py
class FileSystem:
    def __init__(self):
        self.paths = {}

    def create_path(self, path, value):
        parent = path[: path.rfind("/")]
        if path in self.paths or parent not in self.paths:
            return False
        self.paths[path] = value
        return True

    def get(self, path):
        return self.paths.get(path, -1)
```

```bash
pytest -q --tb=no -rf test_fs.py
```

```text
FF.F......                                                                                   [100%]
===================================== short test summary info =====================================
FAILED test_fs.py::test_top_level_path - AssertionError: assert False is True
FAILED test_fs.py::test_nested_path - AssertionError: assert False is True
FAILED test_fs.py::test_cannot_create_twice - AssertionError: assert -1 == 1
3 failed, 7 passed in 0.01s
```

Top-level paths fail: their parent is `""`, which isn't in the dict, so **nothing** can ever be created. (Some invalid paths "pass" only for the same reason.)

#### Stage 2: store the root as `""`

```python
# file: fs.py
class FileSystem:
    def __init__(self):
        self.paths = {"": -1}                    # root sentinel

    def create_path(self, path, value):
        parent = path[: path.rfind("/")]
        if path in self.paths or parent not in self.paths:
            return False
        self.paths[path] = value
        return True

    def get(self, path):
        return self.paths.get(path, -1)
```

```bash
pytest -q --tb=no -rf test_fs.py
```

```text
......FFF.                                                                                   [100%]
===================================== short test summary info =====================================
FAILED test_fs.py::test_invalid_paths_are_rejected[/] - AssertionError: assert True is False
FAILED test_fs.py::test_invalid_paths_are_rejected[a] - AssertionError: assert True is False
FAILED test_fs.py::test_invalid_paths_are_rejected[/a/] - AssertionError: assert True is False
3 failed, 7 passed in 0.01s
```

Now the real paths work, but junk gets in. `/` has parent `""` (which exists), and `/a/` has parent `/a`. And `a` has no slash at all: `rfind` returns -1, so `path[:-1]` is `""`, the root.

#### Stage 3: validate first

```python
# file: fs.py
class FileSystem:
    def __init__(self):
        self.paths = {"": -1}

    @staticmethod
    def _valid(path):
        return path.startswith("/") and all(path.split("/")[1:])

    def create_path(self, path, value):
        if not self._valid(path):
            return False
        parent = path[: path.rfind("/")]
        if path in self.paths or parent not in self.paths:
            return False
        self.paths[path] = value
        return True

    def get(self, path):
        return self.paths.get(path, -1)
```

```bash
pytest -q --tb=no -rf test_fs.py
```

```text
..........                                                                                   [100%]
10 passed in 0.01s
```

**Time:** O(L) per call for a path of length L. **Space:** O(total path length).

### Step 5 · Run everything and refactor

#### Trace

| call | valid? | parent | parent exists? | path exists? | result |
|---|---|---|---|---|---|
| `create("/a", 1)` | ✓ | `""` | ✓ (sentinel) | no | True |
| `create("/a/b", 2)` | ✓ | `/a` | ✓ | no | True |
| `create("/a/", 5)` | ✗ (empty last segment) | | | | False |
| `create("/a", 9)` | ✓ | `""` | ✓ | **yes** | False |

#### Refactor: hide the sentinel from `get`

`get("")` currently returns the sentinel's -1, which is right only by coincidence. Make it explicit, and add types:

```python
# file: test_fs.py (append)
def test_the_root_sentinel_is_not_a_real_path():
    fs = FileSystem()
    assert fs.get("") == -1
    assert fs.create_path("", 1) is False
```

```python
# file: fs.py
class FileSystem:
    """Paths like /a/b; a path can only be created under an existing parent."""

    _ROOT = ""

    def __init__(self):
        self.paths: dict[str, int] = {self._ROOT: -1}     # sentinel: parent of top-level paths

    @staticmethod
    def _valid(path: str) -> bool:
        return path.startswith("/") and all(path.split("/")[1:])

    def create_path(self, path: str, value: int) -> bool:
        if not self._valid(path) or path in self.paths:
            return False
        if path[: path.rfind("/")] not in self.paths:
            return False
        self.paths[path] = value
        return True

    def get(self, path: str) -> int:
        if path == self._ROOT:
            return -1
        return self.paths.get(path, -1)
```

```bash
pytest -q --tb=no -rf test_fs.py
```

```text
...........                                                                                  [100%]
11 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Files have sizes. Return any directory's total size, and the N largest directories"

**First ask:** is this read much more than written, like a storage dashboard? If so, precompute.

**What changes:** a flat dict can't answer "everything under `/docs`" cheaply. Switch to a **trie of directories**. Each directory node stores its children, the files directly inside it, and a running **total**. `add_file` walks the path, creating directories as needed, and adds the size to **every directory on the way** (the root included). If the file already existed, it adds only the **difference**.

- `dir_size(path)`: walk to the node, O(depth).
- `top_dirs(n)`: one traversal plus a heap, O(D log n). The root itself isn't listed.

**Tests first:**

```python
# file: test_fs.py (append)
from fs import SizedFS


@pytest.fixture
def sized():
    s = SizedFS()
    s.add_file("/docs/a.md", 100)
    s.add_file("/docs/specs/b.md", 50)
    s.add_file("/img/c.png", 300)
    return s


def test_sizes_include_descendants(sized):
    assert sized.dir_size("/docs") == 150
    assert sized.dir_size("/docs/specs") == 50
    assert sized.dir_size("/") == 450
    assert sized.dir_size("/nope") == 0


def test_sizes_after_overwriting_a_file(sized):
    sized.add_file("/docs/a.md", 10)
    assert (sized.dir_size("/docs"), sized.dir_size("/")) == (60, 360)


def test_sizes_top_directories(sized):
    assert sized.top_dirs(2) == [("/img", 300), ("/docs", 150)]
    sized.add_file("/zzz/d.bin", 150)
    assert sized.top_dirs(3) == [("/img", 300), ("/docs", 150), ("/zzz", 150)]   # tie → A→Z
```

```python
# file: fs.py (append)
class SizedFS:
    def add_file(self, path, size):
        raise NotImplementedError

    def dir_size(self, path):
        raise NotImplementedError

    def top_dirs(self, n):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rfE test_fs.py -k sizes
```

```text
EEE                                                                                          [100%]
===================================== short test summary info =====================================
ERROR test_fs.py::test_sizes_include_descendants - NotImplementedError
ERROR test_fs.py::test_sizes_after_overwriting_a_file - NotImplementedError
ERROR test_fs.py::test_sizes_top_directories - NotImplementedError
11 deselected, 3 errors in 0.01s
```

Red, shown as `E` (error) rather than `F`: the `sized` fixture itself fails, because `add_file` isn't implemented yet. `-rfE` lists errors as well as failures.

```python
# file: fs.py (replace SizedFS)
import heapq


class _Dir:
    __slots__ = ("name", "parent", "children", "files", "total")

    def __init__(self, name: str = "", parent: "_Dir | None" = None):
        self.name, self.parent = name, parent
        self.children: dict[str, _Dir] = {}
        self.files: dict[str, int] = {}               # file name -> size
        self.total = 0                                # everything under this directory


class SizedFS:
    """Directory sizes precomputed on write: O(depth) updates and lookups."""

    def __init__(self):
        self.root = _Dir()

    @staticmethod
    def _split(path: str) -> list[str]:
        return [p for p in path.split("/") if p]

    def _walk(self, parts: list[str], create: bool = False) -> _Dir | None:
        node = self.root
        for seg in parts:
            nxt = node.children.get(seg)
            if nxt is None:
                if not create:
                    return None
                nxt = node.children[seg] = _Dir(seg, node)
            node = nxt
        return node

    @staticmethod
    def _add_up(node: "_Dir | None", delta: int) -> None:
        while node is not None:                        # this directory and every ancestor
            node.total += delta
            node = node.parent

    def add_file(self, path: str, size: int) -> None:
        *dirs, name = self._split(path)
        node = self._walk(dirs, create=True)
        delta = size - node.files.get(name, 0)         # overwrite → only the difference
        node.files[name] = size
        self._add_up(node, delta)

    def dir_size(self, path: str) -> int:
        node = self._walk(self._split(path))
        return node.total if node else 0

    def top_dirs(self, n: int) -> list[tuple[str, int]]:
        found, stack = [], [("", self.root)]
        while stack:
            prefix, node = stack.pop()
            for name, child in node.children.items():
                full = f"{prefix}/{name}"
                found.append((full, child.total))
                stack.append((full, child))
        return heapq.nsmallest(n, found, key=lambda kv: (-kv[1], kv[0]))
```

```bash
pytest -q --tb=no -rf test_fs.py
```

```text
..............                                                                               [100%]
14 passed in 0.01s
```

> **Say:** "I pay on write so reads are instant, which is the right trade for a dashboard. If writes dominated, I'd compute sizes on read instead."

#### Follow-up 2: "Support deleting files and moving directories"

**What changes:** because every node knows its parent, both are O(depth):

- **Delete a file:** remove it, and subtract its size from its directory and every ancestor.
- **Move a directory:** subtract its `total` from every *old* ancestor, re-attach it under the new parent, and add its `total` to every *new* ancestor. Nothing inside it changes, so it costs O(depth), not O(number of files).

**Tests first:**

```python
# file: test_fs.py (append)
def test_delete_file_shrinks_every_ancestor(sized):
    sized.delete_file("/docs/specs/b.md")
    assert (sized.dir_size("/docs/specs"), sized.dir_size("/docs"), sized.dir_size("/")) == (0, 100, 400)


def test_move_directory_updates_old_and_new_ancestors(sized):
    sized.move_dir("/docs/specs", "/img")
    assert sized.dir_size("/docs") == 100
    assert sized.dir_size("/img") == 350
    assert sized.dir_size("/img/specs") == 50
    assert sized.dir_size("/docs/specs") == 0
    assert sized.dir_size("/") == 450
```

```bash
pytest -q --tb=no -rf test_fs.py -k "delete or move"
```

```text
FF                                                                                           [100%]
===================================== short test summary info =====================================
FAILED test_fs.py::test_delete_file_shrinks_every_ancestor - AttributeError: 'SizedFS' object has...
FAILED test_fs.py::test_move_directory_updates_old_and_new_ancestors - AttributeError: 'SizedFS' ...
2 failed, 14 deselected in 0.01s
```

Add the two methods to `SizedFS`:

```python
# file: fs.py (append)
def _delete_file(self: SizedFS, path: str) -> None:
    *dirs, name = self._split(path)
    node = self._walk(dirs)
    if node is None or name not in node.files:
        raise FileNotFoundError(path)
    self._add_up(node, -node.files.pop(name))


def _move_dir(self: SizedFS, src: str, dst_parent: str) -> None:
    node = self._walk(self._split(src))
    target = self._walk(self._split(dst_parent), create=True)
    if node is None or node is self.root:
        raise FileNotFoundError(src)
    if node.name in target.children:
        raise FileExistsError(f"{dst_parent}/{node.name}")
    self._add_up(node.parent, -node.total)            # leave the old ancestors
    del node.parent.children[node.name]
    node.parent = target
    target.children[node.name] = node
    self._add_up(target, node.total)                  # join the new ancestors


SizedFS.delete_file = _delete_file
SizedFS.move_dir = _move_dir
```

(In the interview you'd write these as methods inside the class. They're attached here only so this step shows just the new code.)

```bash
pytest -q --tb=no -rf test_fs.py
```

```text
................                                                                             [100%]
16 passed in 0.01s
```

> **Say:** "One thing to check with you: moving a directory into its own subtree would create a cycle. I'd reject that by walking up from the target and making sure I never meet the source."

### Mock dialogue

**Interviewer:** Implement a file system where creating a path requires its parent to exist.

**You:** Creating an existing path returns false? And get on a missing path returns -1? What about malformed paths, like a trailing slash?

**Interviewer:** Yes, yes, and reject malformed ones.

**You:** Before coding, the tests: a top-level path, a nested one, a missing parent, creating twice, a missing get, and a handful of malformed paths.

**You:** A dictionary from full path to value is enough. The parent is the substring before the last slash, and I’ll store the empty string as the root so top-level paths need no special case.

**You:** Green after adding validation. Without it, "/" would have been accepted, because its parent is the root.

**Interviewer:** Now files have sizes. Return any directory’s total size, and the largest N directories.

**You:** Will this be read much more than written, like a storage dashboard?

**Interviewer:** Yes.

**You:** Then I’ll precompute. I'll write tests for sizes, overwriting a file, and the top N first. Then I switch to a tree of directories and, when a file is added, add its size to every directory on its path. A size query is then just finding the node. Top N is one traversal plus a heap.

> *Why this works:* The read-versus-write question justified the design. Without it, precomputing is just a guess.

**Interviewer:** What about moving a directory?

**You:** Subtract its total from every old ancestor, add it to every new one, and re-parent the node. That’s proportional to depth, not to the number of files inside.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| No root sentinel | Top-level paths can never be created. | `test_top_level_path` |
| No path validation | `/` or `/a/` get created. | `test_invalid_paths_are_rejected` |
| Overwriting on a second create | Breaks the "refuse duplicates" rule. | `test_cannot_create_twice` |
| Recomputing directory sizes on every query | O(files) per read on a read-heavy dashboard. | None (speed); explain precompute. |
| Adding the full size when a file is overwritten | Totals drift upwards. | `test_sizes_after_overwriting_a_file` |
| Moving a directory by re-adding every file | O(files) instead of O(depth). | `test_move_directory_updates_old_and_new_ancestors` (behaviour); say the cost. |
