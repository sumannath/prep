### Problem

Repeatedly remove all leaves and return the values removed in each round.

#### In plain words

Take a binary tree. Round 1: pick off every leaf (a node with no children) and write down their values. Removing them turns some parents into new leaves. Round 2: pick those off. Repeat until the tree is empty. Return the list of rounds.

```text
        1
       / \
      2   3          round 1: 4, 5, 3
     / \             round 2: 2
    4   5            round 3: 1
→ [[4, 5, 3], [2], [1]]
```

#### Words used on this page

| Term | Meaning |
|---|---|
| Leaf | A node with no children. |
| Depth | Distance from the **root** down to a node (root = 0). |
| Height | Distance from a node down to its **deepest leaf** (a leaf = 0). |
| Post-order | Visit left child, then right child, then the node. |
| BFS / level order | Visit nodes by depth, top to bottom. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

A node’s removal round is its height (distance to its deepest leaf), not its depth: a node goes one round after its last child, so `height = 1 + max(left, right)` with a missing child at -1. A post-order DFS returns the height and appends the value to `rounds[height]`, adding a new list when `height == len(rounds)`, which is safe because a child of height h−1 is always visited first. O(n) time, O(h) stack. Say out loud why BFS by depth is wrong. For very deep, line-shaped trees, switch to an iterative post-order to avoid Python’s recursion limit.

**Cheat sheet**

1. **Ask:** order within a round? keep the tree intact? how deep can it be? binary or n-ary?
2. **Tests first:** example, empty, single, shallow leaf beside a deep branch, a line, tree untouched.
3. **Build:** post-order `height(node)`; `rounds[height].append(val)`.
4. **Cost:** O(n) time, O(h) stack.
5. **Follow-ups:** very deep → iterative post-order; n-ary → max over all children.

### Background you need

#### 1. A binary tree in Python

Each node holds a value and up to two children; a missing child is `None`.

```python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))
print(root.left.right.val)
```

```text
5
```

#### 2. Depth vs height

- **Depth** counts edges from the **root** down: root 0, its children 1, …
- **Height** counts edges from the node down to its **deepest leaf**: every leaf is 0, and a parent is 1 + the larger of its children's heights.

```text
        1   depth 0, height 2
       / \
      2   3        2: depth 1, height 1      3: depth 1, height 0
     / \
    4   5          4, 5: depth 2, height 0
```

The round in which a node is removed is exactly its **height**. Leaves (height 0) go in round 1; a node goes one round after its **last** child.

#### 3. Post-order traversal

To know a node's height you need its children's heights first. Visiting children before the node is **post-order**:

```python
def post_order(node, out):
    if node is None:
        return
    post_order(node.left, out)
    post_order(node.right, out)
    out.append(node.val)          # node after its children

order = []
post_order(root, order)
print(order)
```

```text
[4, 5, 2, 3, 1]
```

#### 4. Recursion depth in Python

Python stops at about 1,000 nested calls with a `RecursionError`. A tree shaped like a long line (each node has one child) is as deep as it is long, so very deep trees need an **iterative** version with an explicit stack.

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Does order within a round matter? | Test expectations. | Left to right (usual) → post-order visits left subtree before right. Any → compare as sets. |
| May I compute it without actually deleting nodes? | Simulation vs formula. | Yes (usual) → compute heights, tree untouched. Must delete → simulate, O(n·h). |
| How deep can the tree be? | Recursion limit. | Up to ~1,000 → recursion is fine. Deeper → iterative (see Follow-ups). |
| Binary, or any number of children? | Generality. | Binary → `left`, `right`. N-ary → max over a children list (see Follow-ups). |

**If they say "your call", state your defaults out loud:**

> "Left to right within a round, the tree is left intact, it's a binary tree, and I'll handle very deep trees as a follow-up."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass. One of them is specifically there to rule out grouping by depth."

#### Work the tricky case by hand

```text
          1               heights: 6→0  4→1  2→2  3→0  1→3
         / \
        2   3             rounds by height: [6, 3], [4], [2], [1]
       /
      4                   by depth it would be [6], [4], [2, 3], [1]: wrong,
     /                    because 3 is a leaf and goes in round 1.
    6
```

#### The tests, one per requirement

Code in `leaves.py`, tests in `test_leaves.py`. A small helper builds trees from nested tuples `(value, left, right)` so the tests stay readable.

```python
# file: test_leaves.py
from leaves import TreeNode, find_leaves


def tree(spec):
    """(val, left, right) tuples → TreeNodes; a bare int is a leaf; None is empty."""
    if spec is None:
        return None
    if isinstance(spec, int):
        return TreeNode(spec)
    val, left, right = spec
    return TreeNode(val, tree(left), tree(right))


def test_the_example():
    assert find_leaves(tree((1, (2, 4, 5), 3))) == [[4, 5, 3], [2], [1]]


def test_empty_tree():
    assert find_leaves(None) == []


def test_single_node():
    assert find_leaves(tree(1)) == [[1]]


def test_a_shallow_leaf_goes_in_the_first_round():
    assert find_leaves(tree((1, (2, (4, 6, None), None), 3))) == [[6, 3], [4], [2], [1]]


def test_a_line():
    assert find_leaves(tree((1, (2, 3, None), None))) == [[3], [2], [1]]


def test_the_tree_is_left_intact():
    root = tree((1, (2, 4, 5), 3))
    find_leaves(root)
    assert find_leaves(root) == [[4, 5, 3], [2], [1]]   # same answer the second time
```

#### Red: run them against an empty stub

```python
# file: leaves.py
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right


def find_leaves(root):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_leaves.py
```

```text
FFFFFF                                                                                       [100%]
===================================== short test summary info =====================================
FAILED test_leaves.py::test_the_example - NotImplementedError
FAILED test_leaves.py::test_empty_tree - NotImplementedError
FAILED test_leaves.py::test_single_node - NotImplementedError
FAILED test_leaves.py::test_a_shallow_leaf_goes_in_the_first_round - NotImplementedError
FAILED test_leaves.py::test_a_line - NotImplementedError
FAILED test_leaves.py::test_the_tree_is_left_intact - NotImplementedError
6 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. In which round is a node removed, relative to its children?
2. Is that the node's distance from the root, or from its deepest leaf?
3. Which traversal gives you both children's answers before the node?

#### Brute force first

Literally simulate: find all leaves, record them, cut them off, repeat. Each round walks the whole remaining tree, so it's O(n × h). It also **destroys** the tree, which we agreed not to do.

#### The tempting wrong idea: level order

Grouping nodes by depth (BFS) and reversing feels natural, but depth is measured from the **root**. A shallow leaf such as node 3 above sits at depth 1 yet is removed in round 1, alongside the deepest leaf. Say this out loud; the problem exists to test exactly that correction.

#### The key insight

A node is removed one round after its **last** child, so `round(node) = 1 + max(round(left), round(right))`, with a missing child at -1 so that leaves get 0. That's the node's **height**. One post-order pass computes every height and drops each value into `rounds[height]`.

#### The plan (say this, then wait for a nod)

> **Say:** "A node's round is its height, not its depth: it goes one round after its last child. So a post-order DFS returns each node's height, with missing children at -1, and appends the value to the list for that height. The list for height h always exists by the time I need it, because a child of height h-1 was visited first. One pass, O(n), and the tree is untouched."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: simulate (it works, but destroys the tree)

```python
# file: leaves.py
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right


def find_leaves(root):
    rounds = []

    def strip(node, out):
        """Remove the leaves under node; return the node, or None if it was a leaf."""
        if node is None:
            return None
        if node.left is None and node.right is None:
            out.append(node.val)
            return None
        node.left = strip(node.left, out)       # cuts the caller's tree
        node.right = strip(node.right, out)
        return node

    while root is not None:
        this_round = []
        root = strip(root, this_round)
        rounds.append(this_round)
    return rounds
```

```bash
pytest -q --tb=no -rf test_leaves.py
```

```text
.....F                                                                                       [100%]
===================================== short test summary info =====================================
FAILED test_leaves.py::test_the_tree_is_left_intact - assert [[1]] == [[4, 5, 3], [2], [1]]
1 failed, 5 passed in 0.01s
```

The answers are right, but the second call sees a tree with only the root left. The simulation cut the caller's tree apart. (It's also O(n × h).)

#### Stage 2: group by depth (the tempting mistake)

```python
# file: leaves.py
from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right


def find_leaves(root):
    levels = []
    queue = deque([(root, 0)] if root else [])
    while queue:
        node, depth = queue.popleft()
        if depth == len(levels):
            levels.append([])
        levels[depth].append(node.val)
        for child in (node.left, node.right):
            if child:
                queue.append((child, depth + 1))
    return levels[::-1]                          # deepest level first
```

```bash
pytest -q --tb=no -rf test_leaves.py
```

```text
F..F.F                                                                                       [100%]
===================================== short test summary info =====================================
FAILED test_leaves.py::test_the_example - assert [[4, 5], [2, 3], [1]] == [[4, 5, 3], [2], [1]]
FAILED test_leaves.py::test_a_shallow_leaf_goes_in_the_first_round - assert [[6], [4], [2, 3], [1...
FAILED test_leaves.py::test_the_tree_is_left_intact - assert [[4, 5], [2, 3], [1]] == [[4, 5, 3],...
3 failed, 3 passed in 0.01s
```

Red, as predicted. On the example, 3 lands with 2 instead of with 4 and 5, because depth isn't the removal round.

#### Stage 3: height via post-order

```python
# file: leaves.py
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right


def find_leaves(root):
    rounds = []

    def height(node):
        if node is None:
            return -1                              # so a leaf gets 1 + max(-1, -1) = 0
        h = 1 + max(height(node.left), height(node.right))
        if h == len(rounds):
            rounds.append([])                      # first node of this height
        rounds[h].append(node.val)
        return h

    height(root)
    return rounds
```

```bash
pytest -q --tb=no -rf test_leaves.py
```

```text
......                                                                                       [100%]
6 passed in 0.01s
```

**Time:** O(n): each node is visited once. **Space:** O(h) for the recursion, plus the output.

### Step 5 · Run everything and refactor

#### Trace the example (post-order visits 4, 5, 2, 3, 1)

| node | left h | right h | height | rounds after |
|---|---|---|---|---|
| 4 | -1 | -1 | 0 | [[4]] |
| 5 | -1 | -1 | 0 | [[4, 5]] |
| 2 | 0 | 0 | 1 | [[4, 5], [2]] |
| 3 | -1 | -1 | 0 | [[4, 5, 3], [2]] |
| 1 | 1 | 0 | 2 | [[4, 5, 3], [2], [1]] |

Why `h == len(rounds)` is always enough: a node of height h has a child of height h − 1, which was visited first, so `rounds` already has h entries. A new list is only ever needed at the end.

#### Refactor: types and naming

No behaviour change, so no new test; everything must stay green.

```python
# file: leaves.py
from __future__ import annotations


class TreeNode:
    def __init__(self, val: int, left: TreeNode | None = None, right: TreeNode | None = None):
        self.val, self.left, self.right = val, left, right


def find_leaves(root: TreeNode | None) -> list[list[int]]:
    """Values grouped by removal round; a node's round is its height. Tree is not modified."""
    rounds: list[list[int]] = []

    def height(node: TreeNode | None) -> int:
        if node is None:
            return -1
        h = 1 + max(height(node.left), height(node.right))
        if h == len(rounds):
            rounds.append([])
        rounds[h].append(node.val)
        return h

    height(root)
    return rounds
```

```bash
pytest -q --tb=no -rf test_leaves.py
```

```text
......                                                                                       [100%]
6 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "The tree is 100,000 nodes in a line"

**What changes:** recursion depth equals tree height, so a 100,000-long line overflows Python's stack. Convert to an **iterative post-order**: push each node twice, once to "open" it (push its children) and once to "close" it once its children are done. Keep computed heights in a dict until the parent reads them.

**Test first:**

```python
# file: test_leaves.py (append)
def test_a_very_deep_line_does_not_overflow():
    root = node = TreeNode(0)
    for i in range(1, 100_000):
        node.left = TreeNode(i)
        node = node.left
    rounds = find_leaves(root)
    assert len(rounds) == 100_000
    assert rounds[0] == [99_999] and rounds[-1] == [0]
```

```bash
pytest -q --tb=no -rf test_leaves.py -k deep
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_leaves.py::test_a_very_deep_line_does_not_overflow - RecursionError: maximum recursio...
1 failed, 6 deselected in 0.01s
```

```python
# file: leaves.py (replace find_leaves)
def find_leaves(root: TreeNode | None) -> list[list[int]]:
    """Iterative post-order: no recursion limit."""
    rounds: list[list[int]] = []
    heights: dict[int, int] = {}                     # id(node) -> height, until the parent reads it
    stack: list[tuple[TreeNode, bool]] = [(root, False)] if root else []
    while stack:
        node, children_done = stack.pop()
        if not children_done:
            stack.append((node, True))
            for child in (node.right, node.left):    # left is popped first → left-to-right order
                if child:
                    stack.append((child, False))
            continue
        h = 1 + max(heights.pop(id(child), -1) if child else -1
                    for child in (node.left, node.right))
        heights[id(node)] = h
        if h == len(rounds):
            rounds.append([])
        rounds[h].append(node.val)
    return rounds
```

```bash
pytest -q --tb=no -rf test_leaves.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

#### Follow-up 2: "Nodes can have any number of children"

**What changes:** only the height formula: `1 + max(height(c) for c in children)`, or 0 for a leaf. Everything else stays the same.

**Test first:**

```python
# file: test_leaves.py (append)
from leaves import NaryNode, find_leaves_nary


def test_nary_tree():
    root = NaryNode(1, [NaryNode(2, [NaryNode(5)]), NaryNode(3), NaryNode(4, [NaryNode(6, [NaryNode(7)])])])
    assert find_leaves_nary(root) == [[5, 3, 7], [2, 6], [4], [1]]
```

```python
# file: leaves.py (append)
class NaryNode:
    def __init__(self, val: int, children: list[NaryNode] | None = None):
        self.val, self.children = val, children or []


def find_leaves_nary(root):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_leaves.py -k nary
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_leaves.py::test_nary_tree - NotImplementedError
1 failed, 7 deselected in 0.01s
```

```python
# file: leaves.py (replace the find_leaves_nary stub)
def find_leaves_nary(root: NaryNode | None) -> list[list[int]]:
    rounds: list[list[int]] = []

    def height(node: NaryNode) -> int:
        h = 1 + max((height(c) for c in node.children), default=-1)
        if h == len(rounds):
            rounds.append([])
        rounds[h].append(node.val)
        return h

    if root is not None:
        height(root)
    return rounds
```

```bash
pytest -q --tb=no -rf test_leaves.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

### Mock dialogue

**Interviewer:** Collect a tree’s nodes as if you repeatedly removed all leaves.

**You:** Does order within a round matter? Left to right is fine for me. And may I compute this without physically deleting nodes?

**Interviewer:** Left to right, and yes.

**You:** Before coding, the tests: your example, empty, a single node, a line, a test that calling it twice gives the same answer (so I don't destroy the tree), and one with a shallow leaf next to a deep branch.

**You:** That last one is there because my first thought is level order, but that groups by distance from the root, and a shallow leaf would land in the wrong round. A node is removed one round after its last child, so its round is one plus the max of its children’s rounds. That’s its height.

> *Why this works:* Stating the wrong idea and why you rejected it is valuable here; this problem exists to test exactly that correction.

**You:** So: a post-order traversal returning height, with missing children at -1 so leaves get 0, appending each node to the list for its height. One pass, O(n).

**You:** All green.

**Interviewer:** What if the tree is 100,000 nodes in a line?

**You:** Recursion would hit Python’s limit; I'll add exactly that as a test. Then I switch to an explicit stack, processing children first and storing each node’s height in a dictionary until its parent needs it.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| BFS by depth | Shallow leaves land in the wrong round. | `test_a_shallow_leaf_goes_in_the_first_round`, `test_the_example` |
| Simulating by cutting leaves off | Destroys the caller's tree; O(n × h). | `test_the_tree_is_left_intact` |
| Missing child = 0 instead of -1 | Leaves get height 1; rounds shift by one. | `test_single_node` |
| Recursion on degenerate trees | `RecursionError`. | `test_a_very_deep_line_does_not_overflow` |
| Visiting right before left | Order within a round flips. | `test_the_example` |
