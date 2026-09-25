# Binary Tree Level Order Traversal — Full Interview Lesson

## 1. Problem restated in your own words

Walk a binary tree top-to-bottom, and within each row left-to-right, returning the values grouped **one list per level**:

- `root = [3,9,20,null,null,15,7]` → `[[3], [9,20], [15,7]]`
- `root = [1]` → `[[1]]`
- `root = []` → `[]`

Three things the grouping requirement adds beyond "print the tree":

1. You must know **where one level ends and the next begins** — a flat traversal order is not enough.
2. **Within-level order matters**: it's left-to-right *positional* order, not insertion or value order.
3. The **empty tree** is a distinct, valid answer (`[]`), not `[[ ]]` and not a crash.

---

## 2. Decoding the constraints and the input format

**Constraint-by-constraint:**

| Constraint | What it actually tells you |
|---|---|
| `0 <= number of nodes <= 2000` | The **0** means `root` may be `null`/`None` (Example 3 is literally this). Handle it *first*, before touching `root.val`. Also: n = 2000 is tiny, so even an O(n²) brute force gets Accepted — but the interviewer expects the linear solution, and follow-ups ("n up to 10⁵") punish the quadratic one. |
| `-1000 <= Node.val <= 1000` | Values fit in any 32-bit int; **negatives are legal**, so never use a magic value (0, −1, `INT_MIN`) as a "missing node" marker. Duplicates are allowed — two different nodes may carry the same value. |

**Precision point — indices vs. values, and how to read `[3,9,20,null,null,15,7]`:**

- Each entry is a **node value**; `null` is a *structural placeholder* meaning "no node here."
- The mapping from array index to tree position is **not fixed heap math** (`2i+1`, `2i+2`) once nulls appear. LeetCode's format is: consume entries in order; each *real* node consumes the next two entries as its left and right child (either may be `null`); a `null` placeholder consumes nothing further.
- Counterexample: `[1, null, 2, 3]`. Naive heap math would put index 3 under index 1 — which is `null`. The real tree is: `1` with right child `2`, and `3` is `2`'s **left** child.

**Duplicates — the precise statement:** traversal here is by *structure* (parent/child pointers), never by value, so duplicates are harmless *if* you never key any data structure on `node.val` (e.g., a `dict` from value → node would be a latent bug in follow-ups).

---

## 3. Brute force: re-scan the tree once per level

**Idea.** Compute the tree height `h`. Then, for each target level `lvl = 1..h`, do a full DFS and collect only nodes whose depth equals `lvl`.

```python
def levelOrder_bruteforce(root):
    def height(node):
        if node is None:
            return 0
        return 1 + max(height(node.left), height(node.right))

    def collect(node, depth, target, out):
        if node is None:
            return
        if depth == target:
            out.append(node.val)
        collect(node.left, depth + 1, target, out)
        collect(node.right, depth + 1, target, out)

    result = []
    for lvl in range(1, height(root) + 1):
        level = []
        collect(root, 1, lvl, level)
        result.append(level)
    return result
```

**Worked trace on Example 1** — tree:

```
        3
       / \
      9  20
         / \
        15  7
```

Height = `1 + max(height(9), height(20)) = 1 + max(1, 2) = 3`. Each pass walks the whole tree in pre-order (`3, 9, 20, 15, 7`):

| Pass | Nodes visited (all of them) | Collected (depth matches) | Result so far |
|---|---|---|---|
| lvl = 1 | 3, 9, 20, 15, 7 | `3` | `[[3]]` |
| lvl = 2 | 3, 9, 20, 15, 7 | `9, 20` | `[[3],[9,20]]` |
| lvl = 3 | 3, 9, 20, 15, 7 | `15, 7` | `[[3],[9,20],[15,7]]` |

Total node visits: **15 visits for 5 nodes** — every node is re-visited on every pass.

**Complexity.** Each pass costs O(n); there are `h` passes → **O(n·h)** time, worst case a skewed tree where `h = n` gives **O(n²)** (for n = 2000, ≈ 4M visits — passes on LeetCode, wrong asymptotics in an interview). Auxiliary space O(h) for the recursion stack. It also handles the empty tree correctly by accident (`height` = 0 → loop never runs), which is a nice property to keep in the final version.

---

## 4. The core insight

> **A FIFO queue emits nodes in nondecreasing depth order.** You push the root; every time you pop a node of depth `k`, you push only nodes of depth `k+1` (its children). So at any moment the queue contains nodes from at most two consecutive depths — and the instant you finish popping the last node of depth `k`, **everything remaining in the queue is exactly level `k+1`, front-to-back in left-to-right order.**

That gives an almost-free level segmentation:

1. Before processing a level, **snapshot** `size = len(queue)`.
2. Pop **exactly** `size` nodes — that's one complete level.
3. Everything pushed during those pops is the next level; loop.

**Why left-to-right order is preserved (the rigor interviewers want):** by induction — level `k`'s nodes sit in the queue left-to-right (true for level 1, which is just the root); each is popped in that order and pushes *left child before right child*, so level `k+1` is enqueued left-to-right too.

**Loop invariant to state out loud:** *at the top of every `while` iteration, the queue holds exactly the next unprocessed level, in left-to-right order.*

Interview narration:

> "A queue naturally gives me BFS order. The only trick is knowing where levels break — so before I touch the queue I capture its length; that length *is* the current level, because everything in it is at the same depth and I'm about to replace it entirely with their children."

---

## 5. Optimal approach: BFS with a level-size snapshot

```python
from collections import deque
from typing import Optional, List

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def levelOrder(root: Optional[TreeNode]) -> List[List[int]]:
    if root is None:                      # empty tree -> [] (Example 3)
        return []
    result = []
    queue = deque([root])
    while queue:
        level_size = len(queue)           # SNAPSHOT: this is one level
        level = []
        for _ in range(level_size):       # pop exactly level_size nodes
            node = queue.popleft()
            level.append(node.val)
            if node.left:                 # null-checks are mandatory
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

(Drop-in form for LeetCode: `class Solution` method with `self` added.)

### Trace on the official examples

**Example 1** — `root = [3,9,20,null,null,15,7]`:

| Level | Snapshot size | Pops (in order) | Enqueues | Queue after | Level emitted |
|---|---|---|---|---|---|
| 1 | 1 | `3` | `9`, `20` | `[9,20]` | `[3]` |
| 2 | 2 | `9`, `20` | `15`, `7` (9 has none) | `[15,7]` | `[9,20]` |
| 3 | 2 | `15`, `7` | — | `[]` | `[15,7]` |

Queue empty → return `[[3],[9,20],[15,7]]`. ✔

**Example 2** — `[1]`: guard passes, snapshot size 1, pop `1`, no children, queue empty → `[[1]]`. ✔

**Example 3** — `[]`: the `root is None` guard returns `[]` *before* the loop; without the guard, `deque([None])` → `None.val` → crash. ✔

### Equivalent alternative: DFS with depth-indexed buckets

```python
def levelOrder_dfs(root: Optional[TreeNode]) -> List[List[int]]:
    levels = []
    def dfs(node, depth):
        if node is None:
            return
        if depth == len(levels):      # first node ever seen at this depth
            levels.append([])
        levels[depth].append(node.val)
        dfs(node.left, depth + 1)
        dfs(node.right, depth + 1)
    dfs(root, 0)
    return levels
```

Same O(n) time and O(n) output. **Why within-level left-to-right order still holds:** this is pre-order (node, then left, then right); for any two same-depth nodes `u`, `v`, pre-order visits `u` first iff `u` is positionally left of `v` — so appends into `levels[depth]` arrive in left-to-right order.

**Python-specific trap:** with n up to 2000, a skewed tree means ~2000 nested frames — **over CPython's default recursion limit of 1000** → `RecursionError`. Prefer the iterative BFS under these constraints (or raise the limit explicitly and say so out loud).

---

## 6. Complexity table

| Approach | Time | Aux. space (excl. output) | Notes |
|---|---|---|---|
| Re-scan per level (brute) | O(n·h), worst **O(n²)** | O(h) recursion | Accepted at n ≤ 2000; fails the "scale it up" follow-up |
| **BFS + snapshot (main)** | **O(n)** — each node enqueued/dequeued exactly once | **O(w)**, max queue width | `w ≤ ⌈n/2⌉ = O(n)`: in a perfect tree the last level holds about half of all nodes, since total = 2·(last level) − 1 |
| DFS depth buckets | O(n) | O(h) recursion stack | O(n) on skewed trees; Python recursion-limit risk at n = 2000 |
| Output (all approaches) | — | Θ(n) | every value appears exactly once in the output |

**Optimality note:** O(n) is as good as it gets — every node's value must be read at least once to be placed in the output, so any correct algorithm is Ω(n) in the number of nodes; BFS achieves that bound with each node touched a constant number of times.

---

## 7. Common mistakes

1. **Missing the empty-tree guard.** `deque([root])` with `root = None`, then `node.val` → crash, or worse, returning `[[ ]]`. Guard *before* touching `root.val`.
2. **Not snapshotting the level size** — the signature bug:

   ```python
   # BUG: drains the entire queue; all levels merge into one flat list
   while queue:
       node = queue.popleft()
       level.append(node.val)
   ```

   The snapshot must be taken **once, before** the inner loop, because the loop itself mutates the queue.
3. **Iterating the queue while appending to it (Python):**

   ```python
   for node in queue:               # BUG: deque mutated during iteration
       queue.append(node.left)      # element order undefined / may revisit
   ```

   The counted `for _ in range(level_size)` loop is the robust idiom.
4. **No null-checks on children.** `queue.append(node.left)` when `node.left is None` puts `None` in the queue → `None.val` crash (Python), NPE (Java), UB (C++).
5. **Using a stack instead of a queue** (or `push/pop` on a deque in stack mode) → depth-first order, wrong levels.
6. **Adding a `visited` set.** Trees have no cycles and a unique parent per node, so each node is reached exactly once; visited sets are for general graphs. Mentioning this shows you know *why*, not just *that*.
7. **DFS variant:** forgetting the lazy-grow `if depth == len(levels): levels.append([])` → `IndexError` on `levels[depth]`.
8. **Off-by-one on depth indexing** in the DFS variant: pick 0-based (`root` at depth 0) or 1-based and stay consistent with `len(levels)`.

---

## 8. Language-specific gotchas (Java / C++)

| Language | Gotcha | Why it bites |
|---|---|---|
| Java | `ArrayDeque` **rejects `null` elements** (`offer(null)` throws NPE) | That's actually a *good* early failure; `LinkedList` accepts `null`, so a missing child-check silently poisons the queue and explodes later at `.val` |
| Java | `push`/`pop` on `ArrayDeque` = **stack** (LIFO) semantics | Using them gives depth-flavored, wrong output; for a queue use `offer`/`poll` (or `addLast`/`removeFirst`) |
| Java | Capture `int size = q.size();` before the inner loop | `q.size()` shrinks as you `poll`; reading it inside the loop condition merges levels |
| C++ | `std::queue::pop()` returns `void` | Do `TreeNode* node = q.front(); q.pop();` — popping first loses your only pointer to the node |
| C++ | Null-pointer dereference is **UB, not an exception** | `if (node->left) q.push(node->left);` — nothing will "throw" to save you |
| Java/C++ | Per-level *sums* in follow-ups (e.g., Average of Levels with bigger n) | Running sums can overflow 32-bit `int`; use `long`/`long long` (not an issue here: 2000 × 1000 = 2×10⁶, but say it) |

---

## 9. Test cases to state out loud

Announce these *before or while* coding — it costs 20 seconds and reads as seniority:

| # | Input (LeetCode format) | Expected output | What it proves |
|---|---|---|---|
| 1 | `[3,9,20,null,null,15,7]` | `[[3],[9,20],[15,7]]` | Official; asymmetric branching, `null` placeholders |
| 2 | `[1]` | `[[1]]` | Single node → exactly one level |
| 3 | `[]` | `[]` | **Empty tree** — the guard; the most-forgotten case |
| 4 | `[1,2,null,3,null,4,null,5]` | `[[1],[2],[3],[4],[5]]` | Left-skewed: levels = nodes; queue never exceeds 1; kills DFS-recursion in Python |
| 5 | `[1,2,3,4,5,6,7]` | `[[1],[2,3],[4,5,6,7]]` | Perfect tree: maximum queue width (≈ n/2) |
| 6 | `[0,-1,0,-1,0]` | `[[0],[-1,0],[-1,0]]` | **Duplicate values** (three 0s,
