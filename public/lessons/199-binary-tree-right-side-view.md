# Binary Tree Right Side View (LeetCode 199) — Complete Interview Lesson

## 1. Restating the Problem (in your own words)

Given the root of a binary tree, return **one value per depth**: the value of the node that would be visible if you stood to the right of the tree, ordered from the root (depth 0) downward.

Precision points to nail out loud:

- **"Top to bottom" = ascending depth.** The output has exactly `height + 1` entries (root at depth 0). A perfect tree with 7 nodes must produce exactly 3 values — use that as a sanity check.
- **"Right side" ≠ "right-child chain."** The visible node at a depth is the *rightmost node at that depth*, wherever it lives. If the right subtree is shallow or missing, a node deep in the **left** subtree becomes visible. Example 2 exists specifically to punish the naive reading.
- **We select nodes, but output values.** Node identity drives the selection; values are just what we print. Values may repeat (the constraint allows `-100 ≤ val ≤ 100` with `n` up to 100, so duplicates are easy), so never key any logic off value uniqueness.
- The bracket notation `[1,2,3,null,5,null,4]` is **level order with null placeholders**: each non-null node consumes the next two array slots for its (possibly null) children. Those are array slots, not tree indices — don't confuse the two when building local tests.

## 2. Decoding the Constraints

| Constraint | What it implies |
|---|---|
| `0 ≤ n ≤ 100` | The empty tree is a real test case (Example 4). Any polynomial algorithm passes, but you should still deliver the O(n) single pass — it's what the interviewer is grading. Max height is 99 (a path), so plain recursion is safe in Python (default recursion limit ≈ 1000). |
| `-100 ≤ val ≤ 100` | Duplicates possible → track *nodes*, output *values*; no value-keyed dedup or dicts keyed by value. Negatives are unremarkable. No overflow risk anywhere (for C++: plain `int` is fine; depth ≤ 100 too). |
| Arbitrary binary tree (not a BST) | No ordering property to exploit; left and right subtrees behave independently. |
| Output "ordered top to bottom" | Ascending depth, one value per depth that exists. |

## 3. First Instinct — and Why It Fails

**The trap:** "Standing on the right, I see the right child, then its right child, then its right child…" — i.e., walk the right spine.

**Trace on Example 2** (`root = [1,2,3,4,null,null,null,5]`):

```text
        1
       / \
      2   3
     /
    4
   /
  5
```

The right spine is `1 → 3`, and 3 has no children, so the spine walk outputs `[1,3]`. The expected answer is `[1,3,4,5]`: node **5** is the left child of the left child of the left child, and it is fully visible at depth 3 because *nothing at depth 3 lies to its right*.

Conclusion to say out loud: **visibility is a per-level property, not a per-path property.** If the interviewer offers you this trap, refuting it with Example 2 is free credit.

## 4. Brute Force That Works — with a Worked Trace

A correct but slightly wasteful version: run a standard BFS, store **every level as its own list**, then take the last element of each list.

Why "last of the level" is the rightmost node: BFS with FIFO processing enqueues the left child before the right child, so by induction each level is produced in left-to-right order — the last element is the rightmost node at that depth.

```python
from collections import deque
from typing import Optional, List

def right_side_view_bruteforce(root: Optional["TreeNode"]) -> List[int]:
    if root is None:
        return []
    levels: List[List[int]] = []
    queue = deque([root])
    while queue:
        level: List[int] = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return [level[-1] for level in levels]
```

**Worked trace on Example 1** (`[1,2,3,null,5,null,4]`):

```text
      1
     / \
    2   3
     \   \
      5   4
```

| Level | Queue at start | Popped | Level list built | Enqueued | Queue at end |
|---|---|---|---|---|---|
| 0 | `[1]` | 1 | `[1]` | 2, 3 | `[2,3]` |
| 1 | `[2,3]` | 2, 3 | `[2,3]` | 5 (2.left is null), 4 | `[5,4]` |
| 2 | `[5,4]` | 5, 4 | `[5,4]` | — | `[]` |

`levels = [[1], [2,3], [5,4]]` → last of each → **`[1,3,4]`** ✓

This is already O(n) time — the "optimization" below just drops the temporary per-level lists and/or shrinks the space profile.

## 5. The Core Insight

The right side view has two equivalent characterizations:

- **(A)** The **last node of each BFS level** (levels enumerate left-to-right).
- **(B)** The **first node reached at each depth** by a DFS that recurses into the **right subtree before the left**, recording a value only the *first* time a depth is seen.

Why (B) equals (A): within a single depth, right-first DFS enumerates nodes **strictly right-to-left**. Proof sketch: take two same-depth nodes `u` (left) and `v` (right); their lowest common ancestor `a` has `u` in `a`'s left subtree and `v` in `a`'s right subtree, and mirror-preorder finishes all of `a.right` (hence `v`) before `a.left` (hence `u`). So the first node ever reached at depth `d` *is* the rightmost node at depth `d`.

That gives a beautifully small guard: **append `node.val` iff `depth == len(result)`** — the result list doubles as a "depths seen so far" set, since by the time DFS stands at depth `d`, all depths `0..d-1` have already been seen (their nodes are ancestors' generations) and the list grows by at most one per depth.

## 6. Optimal Approach A — BFS, Record the Last Node per Level

```python
from collections import deque
from typing import Optional, List

def right_side_view(root: Optional["TreeNode"]) -> List[int]:
    if root is None:
        return []

    view: List[int] = []
    queue = deque([root])

    while queue:
        level_size = len(queue)          # snapshot BEFORE the loop mutates the queue
        for i in range(level_size):
            node = queue.popleft()
            if i == level_size - 1:      # rightmost node of this level
                view.append(node.val)
            if node.left:
                queue.append(node.left)  # left first,
            if node.right:
                queue.append(node.right) # then right -> keeps level order left-to-right
    return view
```

**Trace on Example 2** (the tricky one):

| Level | `level_size` | Popped (i) | Recorded | Queue after |
|---|---|---|---|---|
| 0 | 1 | 1 (i=0) | **1** | `[2,3]` |
| 1 | 2 | 2 (i=0), 3 (i=1) | **3** | `[4]` |
| 2 | 1 | 4 (i=0) | **4** | `[5]` |
| 3 | 1 | 5 (i=0) | **5** | `[]` |

Output `[1,3,4,5]` ✓. Note how depth 2 has only one node (4) and depth 3's visible node is the left-child 5 — the BFS handles both without special cases.

**All four official examples at a glance:**

| Example | Input | Levels | Output |
|---|---|---|---|
| 1 | `[1,2,3,null,5,null,4]` | `[1] [2,3] [5,4]` | `[1,3,4]` |
| 2 | `[1,2,3,4,null,null,null,5]` | `[1] [2,3] [4] [5]` | `[1,3,4,5]` |
| 3 | `[1,null,3]` | `[1] [3]` | `[1,3]` |
| 4 | `[]` | — | `[]` |

## 7. Optimal Approach B — DFS Right-First with a Depth Guard

```python
def right_side_view_dfs(root: Optional["TreeNode"]) -> List[int]:
    view: List[int] = []

    def dfs(node: Optional["TreeNode"], depth: int) -> None:
        if node is None:
            return
        if depth == len(view):       # first node EVER reached at this depth
            view.append(node.val)    # (right-first order => rightmost at this depth)
        dfs(node.right, depth + 1)   # right subtree BEFORE left
        dfs(node.left, depth + 1)

    dfs(root, 0)
    return view
```

**Trace on Example 2** (calls in execution order):

| Call | depth | `len(view)` before | Action |
|---|---|---|---|
| `dfs(1,0)` | 0 | 0 | record **1** |
| `dfs(3,1)` | 1 | 1 | record **3** (no children) |
| `dfs(2,1)` | 1 | 2 | skip — `1 != 2` |
| `dfs(4,2)` | 2 | 2 | record **4** |
| `dfs(5,3)` | 3 | 3 | record **5** |

Output `[1,3,4,5]` ✓.

**Quick check on Example 1:** visit order is `1, 3, 4, 2, 5`; recorded `1, 3, 4`. Node **5 is visited but not recorded** (`depth 2 != len(view) 3`) — a crisp illustration that *visited ≠ recorded*.

## 8. Complexity Table

| # | Approach | Time | Auxiliary space | Output space | Verdict |
|---|---|---|---|---|---|
| 0 | Right-spine walk | O(h) | O(1) | — | ❌ Wrong (fails Example 2) |
| 1 | Per-depth rescan (for each depth, traverse and take last) | O(n·h) | O(h) | O(h) | Correct but wasteful — it runs `h` independent traversals of up to `n` nodes each, which is O(n²) on a path-shaped tree |
| 2 | BFS with full level lists (§4) | O(n) | O(w) for temp lists | O(h) | Correct, extra temporary lists |
| 3 | **BFS, last per level (§6)** | **O(n)** | **O(w)** | O(h) | ✅ Primary |
| 4 | **DFS right-first (§7)** | **O(n)** | **O(h)** recursion stack | O(h) | ✅ Alternative |

- `w` = maximum level width; for a complete tree the bottom level holds ~⌈n/2⌉ nodes, so BFS queue space is worst-case O(n). DFS space is O(h), worst-case O(n) for a skewed tree. Both trivial at `n ≤ 100`.
- **Lower bound:** any correct algorithm needs Ω(n) in the worst case, because a single unexamined node could be the rightmost node at a new deepest level and change the output — so reading all nodes is unavoidable.

## 9. Test Plan — Say These Out Loud Before/After Coding

**Official examples** (run all four, especially #2 and the empty tree).

**Edge cases to propose out loud:**

| Case | Input | Expected | What it guards |
|---|---|---|---|
| Empty tree | `[]` | `[]` | Null-root handling (Example 4) |
| Single node | `[7]` | `[7]` | Loop runs exactly once; off-by-one in the `i == size-1` check |
| Fully left-skewed | `[1,2,null,3]` | `[1,2,3]` | Every node is the rightmost of its level; kills the right-spine mental model |
| Fully right-skewed | `[1,null,2,null,3]` | `[1,2,3]` | The "boring" case where the spine *does* work — confirms the general code subsumes it |
| Duplicate values | `[-1,-1,-1]` | `[-1,-1]` | One value per depth even when values repeat; confirms no value-keyed logic |

Mini harness for local testing (decodes LeetCode's level-order-with-nulls format):

```python
def build(values: List[Optional[int]]) -> Optional[TreeNode]:
    if not values:
        return None
    root = TreeNode(values[0])
    q, i = deque([root]), 1
    while q and i < len(values):
        node = q.popleft()
        if i < len(values):
            v = values[i]; i += 1
            if v is not None:
                node.left = TreeNode(v); q.append(node.left)
        if i < len(values):
            v = values[i]; i += 1
            if v is not None:
                node.right = TreeNode(v); q.append(node.right)
    return root

cases = [
    ([1,2,3,None,5,None,4],            [1,3,4]),
    ([1,2,3,4,None,None,None,5],       [1,3,4,5]),
    ([1,None,3],                       [1,3]),
    ([],                               []),
    ([7],                              [7]),
    ([1,2,None,3],                     [1,2,3]),
    ([1,None,2,None,3],                [1,2,3]),
    ([-1,-1,-1],                       [-1,-1]),
    ([1,2,3,4,5,6,7],                  [1,3,7]),   # perfect tree -> height+1 = 3 values
]
for arr, expected in cases:
    assert right_side_view(build(arr)) == expected, (arr, expected)
```

## 10. Common Mistakes

1. **Right-spine fallacy** — outputting `root, root.right, root.right.right, …`. Fails Example 2; visibility is per-level, not per-path.
2. **DFS recording every visited node** — you must append only on *first arrival at a depth* (`depth == len(view)`), not on every call.
3. **Not snapshotting `level_size` in BFS** — computing `len(queue)` inside the loop while also appending children makes the loop bounds drift as the queue mutates. Capture the size *before* the inner loop.
4. **Enqueueing `None` children** — appending null children and dereferencing later raises `AttributeError` in Python (or NPE in Java). Guard with `if node.left:` / `if node.right:`.
5. **Using `list.pop(0)` as a queue** — each `pop(0)` shifts every remaining element one slot left, so a size-`k` pop costs O(k) and the whole BFS degrades to O(n²). Use `collections.deque`.
6. **Depth off-by-one** — passing `depth` starting at 1 while comparing against `len(view)` (0-indexed). Pick depth-0-for-root and stay consistent; the invariant `depth == len(view)` only holds for it.
7. **Keying logic by value** — with duplicates like `[-1,-1,-1]`, any "have I seen this value" check corrupts the answer. Select nodes; emit values.
8. **Misreading output size** — the answer has `height + 1` values (root at depth 0), not `height`, not `n`.

### Gotchas in Java and C++

| Language | Gotcha |
|---|---|
| Java | Use `Deque<TreeNode> q = new ArrayDeque<>()` and capture `int size = q.size()` before the inner loop (same mutation trap as Python). `ArrayDeque` rejects `null` elements — guard children before `offer`. `Deque<Integer>` autoboxes every value; harmless at `n ≤ 100`, but store `TreeNode`s, not `Integer`s. |
| Java (core loop, for reference) | `for (int i = 0; i < size; i++) { TreeNode n = q.poll(); if (i == size - 1) view.add(n.val); if (n.left != null) q.offer(n.left); if (n.right != null) q.offer(n.right); }` |
| C++ | Pass the result by reference into the recursion (`void dfs(TreeNode* n, int depth, vector<int>& view)`) — forgetting `&` silently discards all appends. `std::queue::pop()` returns `void`: call `front()` *before* `pop()`. No overflow concerns (`|val| ≤ 100`, depth ≤ 100). |

## 11. Transferable Patterns & Related Problems

**Pattern 1 — Level-order layering (BFS with a size snapshot):** any "per level" aggregate reuses this skeleton: level lists, level averages, max width, zigzag order, "minutes until spread" style graph problems.

**Pattern 2 — "First time reaching a depth" guard in DFS:** `if depth == len(res): res.append(...)` turns any traversal into a per-depth selector. Mirror it (recurse left-first) to get the **left side view** or the **bottom-left node**.

| Problem | Relation |
|---|---|
| LC 102 — Binary Tree Level Order Traversal | Same skeleton, keep *all* nodes per level |
| LC 103 — Zigzag Level Order | Same skeleton, alternate direction; last/first per level flips |
| LC 107 — Level Order Bottom-Up | Same skeleton, reverse the result |
| LC 637 — Average of Levels | Per-level aggregate instead of per-level last |
| LC 513 — Find Bottom Left Tree Value | Left-first DFS with the same first-at-depth guard |
| LC 545 — Boundary of Binary Tree | Composes left boundary + leaves + reversed right boundary (this problem's output, reversed) |
| LC 116 — Populating Next Right Pointers | Level-order linking; the "last node per level" concept made explicit |
| LC 662 — Maximum Width of Binary Tree | Per-level index bookkeeping |
| LC 987 — Vertical Order Traversal | Different grouping key (column), same discipline about ordering |
| LC 994 — Rotting Oranges | Same BFS-layering idea on an implicit graph: each layer = one time step |

## 12. Full Interview Talk Track

> "Let me restate: standing to the right of the tree, exactly one node per depth is visible — the rightmost node at each level — and I return those values top to bottom. Empty tree returns an empty list. One trap I want to flag immediately: this is *not* the right-child chain. In your second example, node 5 sits at the bottom as a left child two levels down, and it's the visible node there because nothing lies to its right. So visibility is per-level, not per-path.
>
> The clean solution is level-order BFS. I snapshot the queue size at the start of each level, process exactly that many nodes, and the last one popped is the visible node for that depth. Because children are enqueued left-before-right into a FIFO queue, each level comes out in left-to-right order, so 'last' is well-defined. I record the last node's value and continue.
>
> There's an equivalent DFS formulation with less memory: recurse right subtree before left, and append a value the first time I ever reach a depth. That first-at-depth node is the rightmost node, because a right-first traversal enumerates same-depth nodes strictly right-to-left — their lowest common ancestor always finishes the right side first. The guard is just 'depth equals current result length.'
>
> Both are one pass: O(n) time. BFS holds the widest level in the queue — worst case about half the nodes; DFS holds only the recursion depth. With n ≤ 100 either is instant, but I'll still write the single-pass version rather than rebuilding level lists.
>
> Before coding I'd check: empty tree, single node, fully left-skewed (where *every* node is visible), fully right-skewed, and duplicate values — since the answer selects nodes and prints values, I won't key anything off value uniqueness."

## 13. Say It in 60 Seconds

> "The right view is one node per depth — the rightmost node at each level, top to bottom. It is *not* the right-child chain: a deep left subtree can stick out past a shallow right one, which is exactly the second example. So I run a BFS: snapshot the queue size at the top of each level, pop exactly that many nodes, and record the last one's value — children go in left-before-right, so 'last' means rightmost. Equivalently, I can DFS visiting right before left and record a value the first time I ever reach a depth; first-at-depth in that order is the rightmost node at that depth. Either way it's a single O(n) pass — BFS uses space proportional to the widest level, DFS just the recursion height. Empty tree returns an empty list, and I'd verify with the skewed trees and a duplicate-values case before calling it done."
