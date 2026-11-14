### Problem

You get a list of files: `(name, size, collections)`. A file may belong to zero, one or several collections. Return the total size of all files in the system and the top `N` collections by size.

### Interview refresher

One pass: add each file’s size to the grand total and to every distinct collection it lists (a `defaultdict`, with `set()` to dedupe). Get the top N with `heapq.nlargest`, a size-N min-heap whose top is the weakest of the current best, which costs O(C log N) instead of sorting at O(C log C); tie-break by name. For nested collections, walk parent pointers up from each of the file’s collections into an ancestor set (stop at an already-seen node), then add the size once per ancestor. Rolling child totals into parents would double count a file in two sibling collections. For live data, apply deltas along the same ancestor set.

### Hints

1. A file in two collections contributes its full size to both. Ask whether a duplicated collection id on one file should count twice.
2. One pass with a hashmap gives totals; the top-N piece is a heap problem.
3. heapq.nlargest(n, ...) is O(C log n) — say why that beats sorting all C collections when n is small.

### Approach

Single pass: add each file to the global total, and to every distinct collection it lists. Then take the top N collections with a size-bounded min-heap (`heapq.nlargest`). Break ties deterministically (by name) so tests are stable.

### Deep dive

#### What the interviewer is really testing

Two things: whether you notice that files and collections are a many-to-many relationship, and whether you pick the right way to get the top N out of many items.

#### From brute force to one pass

The naive approach loops over every collection and, for each, scans all files to add up the ones inside it: O(collections × files). Flip it around. Walk the files once and push each file’s size into every collection it belongs to. Now the work is proportional to the number of file-to-collection links, which is the minimum possible, since you must look at each link at least once.

#### Why a hashmap for the totals

Collection names are arbitrary strings and you need to add to the right running total instantly. A dictionary gives O(1) lookup and update by name. `defaultdict(int)` just saves checking whether the key exists.

#### Why `set(collections)`

If the input ever lists the same collection twice for one file, a plain loop would add the size twice. Wrapping it in a set is a cheap guard. It’s also a good clarifying question, because it shows you read the input format carefully.

#### Getting the top N: why a heap

You could sort every collection by size and take the first N: O(C log C). If N is small, say the top 10 of a million collections, that’s a lot of unnecessary ordering. A heap of size N does it in O(C log N).

The counter-intuitive part: to find the *largest* N you keep a *min*-heap. The heap holds your current best N, and its top is the weakest of them. Each new collection only needs to beat that weakest one to get in; if it does, the weakest is evicted. `heapq.nlargest` does exactly this internally.

#### Why the tie-break

Two collections with the same size could come out in either order, making tests flaky. Sorting by `(size, name)` makes the output deterministic.

#### The nested follow-up, carefully

Now collections have parents, and a parent’s size includes everything below. The tempting approach: compute each collection’s direct size, then add children into parents. That double counts. If a file is in both `A1` and `A2`, both under `A`, then `A` receives the size once via `A1` and again via `A2`.

So go file by file. For each file, walk upward from each of its collections and collect every ancestor into a set. The set removes duplicates, so the size is added to each ancestor exactly once. The loop stops early on reaching a collection already in the set, because its ancestors are already in there. That also prevents infinite loops if the data accidentally contains a cycle.

```text
parent: A1→A, A2→A
file f (size 50) in [A1, A2]
walk from A1: add A1, add A
walk from A2: add A2, A already in set → stop
ancestors = {A1, A2, A} → each gets +50 once
```

#### If the data changes live

If files are added and removed while people view the dashboard, recomputing from scratch is wasteful. Keep the totals and apply deltas: adding a file adds its size along its ancestor set; deleting subtracts it.

### Reference solution

```python
import heapq
from collections import defaultdict
from typing import Iterable


def collection_report(files: Iterable[tuple[str, int, list[str]]], n: int):
    total = 0
    sizes = defaultdict(int)
    for _name, size, collections in files:
        total += size
        for c in set(collections or []):
            sizes[c] += size
    top = heapq.nlargest(n, sizes.items(), key=lambda kv: (kv[1], kv[0]))
    return total, top


files = [
    ("file1.txt", 100, []),
    ("file2.txt", 200, ["collection1"]),
    ("file3.txt", 200, ["collection1"]),
    ("file4.txt", 300, ["collection2"]),
    ("file5.txt", 10,  []),
]
assert collection_report(files, 2) == (810, [("collection1", 400), ("collection2", 300)])
```

**Time:** O(F·k + C log N)  
**Space:** O(C)

### Questions to ask before coding

- Can one file belong to several collections? Could the same collection appear twice for one file?
- Do files with no collection still count toward the total size?
- How should ties between equal-sized collections be ordered?
- Is N small compared with the number of collections?
- Is this a one-off report, or do files get added and removed over time?

### Interview walkthrough

**Interviewer:** You get a list of files with a name, a size and the collections they belong to. Return the total size of all files and the top N collections by size.

**You:** Can a file be in more than one collection? And can it be in none?

**Interviewer:** Both, yes.

**You:** So a file in two collections contributes its full size to both, and files in no collection still count toward the total. Is that right?

**Interviewer:** Correct.

> *Why this works:* Restating the rule as a sentence confirms the many-to-many relationship. Candidates who skip this end up writing a plain group-by.

**You:** How should ties be broken? I’ll go alphabetical unless you prefer otherwise. And is N usually small, like a top-10 dashboard?

**Interviewer:** Alphabetical is fine. Yes, N is small.

**You:** Plan: one pass over the files, adding each size to the overall total and to a dictionary entry for each of its collections. Then a heap of size N for the top collections, which is cheaper than sorting everything when N is small. Overall linear in the file-collection links, plus C log N.

**Interviewer:** Why not just sort?

**You:** Sorting is fine for small inputs and I’d accept it in a first version. With a million collections and N of 10, the heap avoids ordering 999,990 items nobody looks at.

**You:** Testing with your example: collection1 has 200 + 200 = 400, collection2 has 300, and the total is 810 including uncategorised files. Top 2 is collection1 then collection2.

**Interviewer:** Now collections can be nested. A collection’s size includes its sub-collections.

**You:** Can a file sit in two collections that share a parent? If so, the parent must only count it once.

**Interviewer:** Yes, it can.

**You:** Then rolling child totals into parents would double count. Instead, for each file I’ll walk up from each of its collections, collect the ancestors in a set, and add the size once per ancestor. The walk is proportional to the hierarchy’s depth.

**Interviewer:** And if this powers a live dashboard?

**You:** I’d keep the totals and update them incrementally on file add and delete, using the same ancestor walk. Do you expect more writes or more reads? If reads dominate, it’s worth maintaining a sorted structure so the top N is always ready.

> *Why this works:* Asking about the read/write ratio shows you choose data structures from the workload, not from habit.

### Scale-up follow-up

**Interviewer adds:** “Collections can be nested. A parent's size includes everything beneath it.”

Add a `parent` map. For each file, walk up from each of its collections and collect the set of ancestors, then add the size once per ancestor. The set is what stops double counting when a file sits in two sibling collections under the same parent. If updates are frequent, keep running totals and propagate deltas up the chain on insert/delete instead of recomputing.

```python
def nested_report(files, parent: dict[str, str | None], n: int):
    total, sizes = 0, defaultdict(int)
    for _name, size, collections in files:
        total += size
        ancestors = set()
        for c in collections or []:
            while c is not None and c not in ancestors:
                ancestors.add(c)
                c = parent.get(c)
        for c in ancestors:
            sizes[c] += size
    return total, heapq.nlargest(n, sizes.items(), key=lambda kv: (kv[1], kv[0]))
```

### Where candidates slip

- Treating it as a plain group-by and forgetting multi-collection files.
- Double counting a file under a shared ancestor in the nested version.
- Not handling files with no collection (they still count toward the total).
