### Problem

`create_path(path, value)` succeeds only if the parent exists and the path doesn't. `get(path)` returns the value or -1.

Follow-up: files have sizes; return the size of any directory (including descendants) and the top N directories.

### Interview refresher

Base version: a dict from full path to value, with the empty string pre-stored as root. `create_path` checks the path is absent and its parent (`path[:path.rfind("/")]`) is present. For sizes, use a trie of directories where each node keeps a running total; `add_file` adds the size to every directory on the path, making `dir_size` an O(depth) lookup. You pay on write because dashboards read far more than they write. Top N is a traversal plus `heapq.nlargest`. Deleting subtracts along the path; moving a directory subtracts its total from the old ancestors and adds it to the new ones.

### Hints

1. The base version is just a dict plus a parent check.
2. For sizes, a trie lets you add a file's size to every ancestor on the way down.

### Approach

Base: dict keyed by full path, with `""` as root. Sizes: a segment trie where each node keeps a running subtree total; inserting a file walks down and adds its size at every node, so directory size is an O(depth) lookup.

### Deep dive

#### What the interviewer is really testing

Picking the simplest structure that works, then recognising when the workload calls for precomputing answers.

#### Base version: why a dictionary is enough

You only need to know whether a full path exists and its value. A dictionary keyed by full path does that in constant time. To check the parent, take everything before the last slash.

#### Why the root is stored as `""`

For `/a`, everything before the last slash is the empty string. Storing `""` as an existing entry lets top-level paths pass the parent check with no special case.

#### Follow-up: directory sizes

A directory’s size is the sum of every file beneath it. Computing that per request means walking the whole subtree: slow for a dashboard that asks constantly.

Instead, do the work on write. When a file is added, walk down its path and add its size to every directory along the way. Each directory then always knows its total. Writes cost O(depth); reads cost O(depth) to find the node. You trade a little write time for much faster reads, which is right when reads dominate.

#### Why a trie here, not the dictionary

Per-directory totals live naturally on tree nodes, and walking down the path visits exactly the ancestors that need updating.

```text
add /docs/a.md 100        root=100  docs=100
add /docs/specs/b.md 50   root=150  docs=150  specs=50
add /img/c.png 300        root=450  img=300
dir_size(/docs) → 150
```

#### Top N directories

Visit every directory once, collect its total, and use a heap of size N, as in the collections problem.

### Reference solution

```python
import heapq


class FileSystem:
    def __init__(self):
        self.paths = {"": -1}

    def create_path(self, path: str, value: int) -> bool:
        parent = path[: path.rfind("/")]
        if path in self.paths or parent not in self.paths:
            return False
        self.paths[path] = value
        return True

    def get(self, path: str) -> int:
        return self.paths.get(path, -1)


class _Dir:
    def __init__(self): self.children, self.total = {}, 0


class SizedFS:
    def __init__(self): self.root = _Dir()

    def add_file(self, path: str, size: int) -> None:
        node = self.root
        node.total += size
        for seg in [p for p in path.split("/") if p][:-1]:
            node = node.children.setdefault(seg, _Dir())
            node.total += size

    def dir_size(self, path: str) -> int:
        node = self.root
        for seg in [p for p in path.split("/") if p]:
            node = node.children.get(seg)
            if node is None:
                return 0
        return node.total

    def top_dirs(self, n: int):
        out, stack = [], [("", self.root)]
        while stack:
            prefix, node = stack.pop()
            for name, child in node.children.items():
                full = f"{prefix}/{name}"
                out.append((child.total, full))
                stack.append((full, child))
        return heapq.nlargest(n, out)


fs = SizedFS()
fs.add_file("/docs/a.md", 100); fs.add_file("/docs/specs/b.md", 50); fs.add_file("/img/c.png", 300)
assert fs.dir_size("/docs") == 150
assert fs.top_dirs(2) == [(300, "/img"), (150, "/docs")]
```

**Time:** add O(depth), size O(depth), top O(D log N)  
**Space:** O(directories)

### Questions to ask before coding

- Should creating a path fail if its parent doesn’t exist?
- Can a path be created twice?
- For sizes, do reads happen far more often than writes?
- Will files be deleted or moved?

### Interview walkthrough

**Interviewer:** Implement a file system where creating a path requires its parent to exist.

**You:** Creating an existing path returns false? And get on a missing path returns -1?

**Interviewer:** Yes.

**You:** A dictionary from full path to value is enough. The parent is the substring before the last slash, and I’ll store the empty string as the root so top-level paths need no special case.

**Interviewer:** Now files have sizes. Return any directory’s total size, and the largest N directories.

**You:** Will this be read much more than written, like a storage dashboard?

**Interviewer:** Yes.

**You:** Then I’ll precompute. I’ll switch to a tree of directories and, when a file is added, add its size to every directory on its path. A size query is then just finding the node. Top N is one traversal plus a heap.

> *Why this works:* The read-versus-write question justified the design. Without it, precomputing is just a guess.

**Interviewer:** What about moving a directory?

**You:** Subtract its total from every old ancestor, add it to every new one, and re-parent the node. That’s proportional to depth, not to the number of files inside.

### Scale-up follow-up

**Interviewer adds:** “Support delete and move.”

Delete subtracts the file's size along its ancestor chain. Move is delete + add, but for a directory move you subtract the subtree total from old ancestors and add it to new ones — O(depth), not O(files).

### Where candidates slip

- Treating the root's parent check inconsistently.
- Recomputing directory sizes by full traversal on every query.
