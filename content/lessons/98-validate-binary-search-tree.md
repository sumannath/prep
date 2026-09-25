# Validate Binary Search Tree — Full Interview Lesson

*(LeetCode 98 · Medium · One of the most failed "looks easy" tree problems, because the obvious check is subtly wrong.)*

---

## 1. Problem restatement (what's actually being asked)

> Given the root of a binary tree, return `true` if and only if, **for every node `u` in the tree**: every key in `u`'s left subtree is **strictly less** than `u`'s key, every key in `u`'s right subtree is **strictly greater** than `u`'s key, and both subtrees are themselves valid BSTs.

Three clauses worth decoding out loud in an interview:

1. **"Subtree contains only nodes with keys strictly less"** — the constraint binds **all descendants**, not just the immediate child. This single clause is the entire difficulty of the problem.
2. **Strict inequalities** — equality is forbidden along any ancestor–descendant chain. Consequence: under this definition **all keys in a valid tree are pairwise distinct**. (Why: two equal keys can't be ancestor/descendant — strictness forbids it — so at their lowest common ancestor they'd sit in different child subtrees, forcing one key `< `LCA's key `<` the other. Contradiction.)
3. **Recursive clause** — validity is checked at *every* node, so this is a global property, not a local one.

You are validating, not building or repairing. Output is a single boolean.

---

## 2. Constraint decoding

| Constraint | What it really tells you |
|---|---|
| `1 <= n <= 10^4` | The tree is never empty, so the top-level `root` won't be `null` on LeetCode — but keep the `None` base case anyway; your recursion needs it, and "empty tree is valid" is the sane answer if asked. More importantly: height can be **10⁴** (a skewed chain), and CPython's default recursion limit is ~1000 — a naive recursive solution can crash. Prefer an iterative version or raise the limit (`sys.setrecursionlimit`). |
| `-2^31 <= Node.val <= 2^31 - 1` | Node values may **exactly equal** `INT_MIN` / `INT_MAX`. Any sentinel scheme that initializes bounds to those constants and uses strict `<`/`>` will wrongly reject legal inputs like `root = [-2147483648]`. Use `±inf` or `None` sentinels in Python; `long`/`long long` or nullable bounds in Java/C++ (see §8). |
| Strict `<` / `>` | **Duplicates are invalid.** `[2,2,2]`, `[2,2]`, `[2,null,2]` → all `false`. This is LeetCode's strict variant; CLRS-style BSTs allow equal keys on the right. If the interviewer's variant differs, the comparison flips — confirm before coding. |
| Examples shown as arrays like `[5,1,4,null,null,3,6]` | The array is just a BFS serialization; your algorithm manipulates **node objects and values, never indices**. Don't apply heap index math (`2i+1`, `2i+2`): in `[1,null,2,3]`, the `3` is node `2`'s *left child* even though heap arithmetic would place index 2's children at slots 5–6. LeetCode's format is BFS-with-nulls, not a heap layout. |

---

## 3. Brute force — and the trap most candidates fall into

### 3.1 The tempting "compare with children" check — and why it's wrong

```python
# WRONG — do not submit
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        if root is None:
            return True
        if root.left and root.left.val >= root.val:
            return False
        if root.right and root.right.val <= root.val:
            return False
        return self.isValidBST(root.left) and self.isValidBST(root.right)
```

Trace on **Example 2** `root = [5,1,4,null,null,3,6]`:

```
        5
       / \
      1   4
         / \
        3   6
```

| Node visited | Local check | Result |
|---|---|---|
| 5 | 1 < 5 ✓ and 4 > 5 ✓ | pass |
| 1 | no children | pass |
| 4 | 3 < 4 ✓ and 6 > 4 ✓ | pass |
| 3, 6 | leaves | pass |

Returns `true` — **wrong**. Every parent–child pair is locally consistent, but `3` and `4` live in the *right subtree of 5*, where everything must be `> 5`. A node's legality is relative to **all ancestors**, not just its parent.

### 3.2 A correct brute force: check each node against its whole subtree

```python
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def all_less(node, cap):        # every key in node's subtree < cap
            if node is None:
                return True
            return node.val < cap and all_less(node.left, cap) and all_less(node.right, cap)

        def all_greater(node, floor):   # every key in node's subtree > floor
            if node is None:
                return True
            return node.val > floor and all_greater(node.left, floor) and all_greater(node.right, floor)

        def valid(node):
            if node is None:
                return True
            return (all_less(node.left, node.val) and
                    all_greater(node.right, node.val) and
                    valid(node.left) and valid(node.right))

        return valid(root)
```

Worked trace on **Example 2**: `valid(5)` → `all_less(1, cap=5)`: `1 < 5` ✓, leaves → `True`. Then `all_greater(4, floor=5)`: `4 > 5`? ✗ → `False` immediately. Answer `false` after touching only 4 nodes — it fails fast *here*, but:

- **Time: O(n·h)** — a node at depth *d* is rescanned once by each of its *d* ancestors, so total work is Σ depth(u) ≈ Θ(n·h): Θ(n²) on a skewed 10⁴-node chain (on the order of 10⁸ comparisons — minutes in Python) and Θ(n log n) even on a balanced tree.
- The waste is structural: the brute force re-derives each subtree's min/max over and over, when each node needs only **one** comparison.

---

## 4. The core insight

### 4.1 Inherited intervals (top-down view)

Walk the path from the root down to any node `x`:

- Every time the path makes a **left turn** at ancestor `a`, `x` is in `a`'s left subtree ⇒ `x.val < a.val` (an **upper** bound).
- Every time the path makes a **right turn** at ancestor `a`, ⇒ `x.val > a.val` (a **lower** bound).

The conjunction of all these inequalities collapses into a single **open interval** `(low, high)`, and:

> **A node is valid ⇔ `low < node.val < high`.**

Going to a left child tightens `high` to the current node's value; going to a right child tightens `low`. The interval **only shrinks** as you descend — a clean monovariant, which guarantees termination and lets you decide each node with exactly one comparison ⇒ **O(n)**.

### 4.2 Inorder view (bottom-up)

Inorder traversal emits *left subtree, then node, then right subtree* — contiguous blocks. So the inorder sequence is **strictly increasing ⇔ the tree is a BST**: if it's increasing, every left-block key is `< node` and every right-block key is `> node` at every node; conversely, in a BST, max(left) < node < min(right) and both blocks are increasing by induction. This characterization powers a whole family of BST problems (§10).

---

## 5. Optimal solutions with traces

### 5.1 Main solution: DFS carrying `(low, high)`

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def valid(node: Optional[TreeNode], low: float, high: float) -> bool:
            if node is None:
                return True                          # empty subtree: vacuously valid
            if not (low < node.val < high):          # STRICT — equality fails
                return False
            return (valid(node.left, low, node.val) and   # left: upper bound tightens
                    valid(node.right, node.val, high))    # right: lower bound tightens

        return valid(root, float("-inf"), float("inf"))
```

Notes:
- `float("±inf")` sentinels are safe: they're only ever compared against `±inf` or integer node values, and Python's mixed int/float comparison is exact — no precision issue. If you'd rather avoid floats entirely, use `None` sentinels:

```python
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def valid(node, low, high):              # low/high: int or None
            if node is None:
                return True
            if low is not None and node.val <= low:
                return False
            if high is not None and node.val >= high:
                return False
            return valid(node.left, low, node.val) and valid(node.right, node.val, high)
        return valid(root, None, None)
```

- The `and` short-circuits, so invalid inputs often finish early (Example 2 below touches only 3 of 5 nodes). Worst case (a valid tree) must visit **every node** — and Ω(n) is unavoidable: an algorithm that skips even one node can be fooled by two inputs that differ only at that node's key.

### 5.2 Traces on the official examples

**Example 1** `root = [2,1,3]` → `true`:

| Step | Call | `(low, high)` | Check | Action |
|---|---|---|---|---|
| 1 | node=2 | (−∞, +∞) | −∞ < 2 < +∞ ✓ | recurse left (−∞, 2), right (2, +∞) |
| 2 | node=1 | (−∞, 2) | −∞ < 1 < 2 ✓ | leaves → `True` |
| 3 | node=3 | (2, +∞) | 2 < 3 ✓ | leaves → `True` |
| — | — | — | — | **`true`** |

**Example 2** `root = [5,1,4,null,null,3,6]` → `false`:

| Step | Call | `(low, high)` | Check | Action |
|---|---|---|---|---|
| 1 | node=5 | (−∞, +∞) | ✓ | left (−∞, 5), right (5, +∞) |
| 2 | node=1 | (−∞, 5) | ✓ | leaf → `True` |
| 3 | node=4 | (5, +∞) | 5 < 4? ✗ | **return `false`** (subtree of 4 pruned entirely) |

**Bonus — a violation the local check can't see:** `root = [5,4,6,null,null,3,7]` (every parent–child pair is locally consistent):

```
        5
       / \
      4   6
         / \
        3   7
```

| Step | Call | `(low, high)` | Check | Action |
|---|---|---|---|---|
| 1 | node=5 | (−∞, +∞) | ✓ | left (−∞, 5), right (5, +∞) |
| 2 | node=4 | (−∞, 5) | ✓ | leaf → `True` |
| 3 | node=6 | (5, +∞) | 5 < 6 ✓ | left (5, 6), right (6, +∞) |
| 4 | node=3 | (5, 6) | 5 < 3? ✗ | **`false`** — the interval catches what `3 < 6` cannot |

### 5.3 Recursion-depth-safe variant: explicit stack of bounds

Same logic, no recursion — this is the version I'd actually submit for `n = 10^4` in Python:

```python
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        stack = [(root, float("-inf"), float("inf"))]
        while stack:
            node, low, high = stack.pop()
            if node is None:
                continue
            if not (low < node.val < high):
                return False
            stack.append((node.right, node.val, high))
            stack.append((node.left, low, node.val))
        return True
```

A BFS twin exists: a `deque` of `(node, low, high)` tuples — same complexity, worth mentioning if asked for a level-order solution.

### 5.4 Alternative: inorder with a `prev` pointer

Since inorder must be strictly increasing, keep only the previously visited node:

```python
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        stack, cur, prev = [], root, None
        while cur or stack:
            while cur:                    # slide to the leftmost node
                stack.append(cur)
                cur = cur.left
            cur = stack.pop()
            if prev is not None and prev.val >= cur.val:   # not strictly increasing
                return False
            prev, cur = cur, cur.right
        return True
```

Trace on **Example 2** (inorder order is `1, 5, 3, 4, 6`):

| Action | Stack (bottom→top) | Popped | `prev` | Comparison |
|---|---|---|---|---|
| push left spine of 5 | [5, 1] | — | — | — |
| pop 1 (right child null) | [5] | 1 | None | first node, no check |
| pop 5 | [] | 5 | 1 | 1 < 5 ✓ |
| push spine of 5.right=4 → 3 | [4, 3] | — | 5 | — |
| pop 3 | [4] | 3 | 5 | 5 < 3 ✗ → **`false`** |

Gotcha: use `prev is not None`, never `if prev:` — and if you store `prev_val` as an int, `if prev_val:` silently misbehaves when the previous value is `0` (falsy). This is a "value 0 is falsy" trap, not an edge case in the algorithm.

### 5.5 The extensible pattern: bottom-up `(is_bst, min, max)`

Post-order, each subtree reports whether it's a BST plus its min/max keys. Slower to write than §5.1 but **generalizes** to problems where you need subtree info regardless of the root-to-node path (LC 333, LC 1373):

```python
class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def post(node):
            # returns (is_bst, subtree_min, subtree_max); min/max None if empty
            if node is None:
                return True, None, None
            l_ok, l_min, l_max = post(node.left)
            r_ok, r_min, r_max = post(node.right)
            ok = l_ok and r_ok
            if l_max is not None and l_max >= node.val:   # strict
                ok = False
            if r_min is not None and r_min <= node.val:   # strict
                ok = False
            lo = l_min if l_min is not None else node.val
            hi = r_max if r_max is not None else node.val
            return ok, lo, hi
        return post(root)[0]
```

(If a child already reported `is_bst = False`, the stale min/max it returns never matter — `False` propagates through the `and` chain regardless.)

### 5.6 Narrating it in the interview (full talk track)

> "Brute force: for every node, scan its whole left subtree and right subtree to check the inequalities. Correct, but each node gets re-scanned once per ancestor, so it's O(n·h) — quadratic on a skewed tree, and it recomputes subtree min/maxes it could carry for free.
>
> The key observation: a node's validity depends only on the **ancestors**, and each ancestor's constraint is one inequality — left turn gives an upper bound, right turn gives a lower bound. All of them together are just an open interval. So I'll DFS carrying `(low, high)`, check `low < val < high` — strict, because the definition bans duplicates — and thread the current value into the children's bounds. One comparison per node: O(n) time, O(height) space.
>
> An equivalent framing: inorder traversal must come out strictly increasing. That gives an iterative version with a `prev` pointer — I'd switch to it if recursion depth is a concern, since a skewed 10⁴-node chain exceeds Python's default recursion limit.
>
> Edge cases I'm covering: duplicates must return false; a single node is true; values at `INT_MIN`/`INT_MAX` — I'm using infinity sentinels, so no integer-sentinel bug, but in Java or C++ I'd widen the bounds to `long`/`long long`; and I'd test a grandchild violation like `[5,4,6,null,null,3,7]`, which every locally-correct-but-globally-wrong solution fails."

---

## 6. Complexity table

| Approach | Time | Extra space | Correct? | Notes |
|---|---|---|---|---|
| Compare each node with children only | O(n) | O(h) | ✗ | Fails Example 2; misses ancestor constraints |
| Per-node subtree scan (brute force) | O(n·h), worst O(n²) | O(h) | ✓ | Each node re-scanned per ancestor → Σ depths = Θ(n·h); Θ(n²) on a skewed chain |
| **Top-down bounds (DFS/BFS)** | **O(n)** | **O(h)** (worst O(n) stack/queue) | ✓ | Main solution; early exit on invalid inputs |
| Inorder + `prev` (iterative or recursive) | O(n) | O(h) (O(n) if you materialize a list) | ✓ | Elegant; iterative version dodges recursion limits |
| Morris inorder | O(n) | O(1) | ✓ | Amortized linear: each edge is traversed a constant number of times (create the predecessor thread, follow it back, delete it) |

All O(n) approaches match the Ω(n) lower bound — every node must be examined in the worst case, since a single unread node's key can flip the answer.

---

## 7. Common mistakes

| # | Mistake | Failing input | Fix |
|---|---|---|---|
| 1 | Only comparing a node with its immediate children | `[5,4,6,null,null,3,7]` → wrongly `true` | Carry `(low, high)` down, or use inorder |
| 2 | Non-strict comparisons (`<=`) anywhere | `[2,2,2]`, `[2,null,2]` → wrongly `true` | Strict `<` / `>` per this problem's definition; ask about duplicates if unstated |
| 3 | Threading bounds to the wrong side (e.g., left child gets `(node.val, high)`) | `[5,4,6,null,null,3,7]` and many others | Left gets `(low, node.val)`; right gets `(node.val, high)` |
| 4 | Sentinels initialized to `INT_MIN`/`INT_MAX` with strict compares | `[-2147483648]` or `[2147483647]` → wrongly `false` | `±inf` / `None` in Python; `long`/`long long` in Java/C++ |
| 5 | `if prev:` instead of `if prev is not None` (or `if prev_val:` with a stored int) | Any tree whose first inorder key is `0` | Explicit `is not None` checks |
| 6 | Recursive solution on a skewed 10⁴-node tree in Python | Right-skewed chain 1→2→…→10⁴ | Iterative traversal (§5.3/§5.4) or `sys.setrecursionlimit` |
| 7 | Heap-index arithmetic on the LeetCode array (`children of i at 2i+1, 2i+2`) | `[1,null,2,3]` — the `3` is node `2`'s left child, not at heap slot 5 | Operate on nodes; the array is BFS-with-nulls, not a heap |
| 8 | In recursive inorder, forgetting to propagate the `False` from the left call | Violations get masked by stale `prev` state | `if not inorder(node.left): return False` |

---

## 8. Java / C++ implementation gotchas

| Language | Gotcha | Fix |
|---|---|---|
| Java | `int low = Integer.MIN_VALUE; int high = Integer.MAX_VALUE;` with strict `low < val < high` **rejects a valid tree** whose node legitimately equals those constants (e.g., `root = [2147483647]` must be `true`). | Widen to `long low = Long.MIN_VALUE, high = Long.MAX_VALUE` — every `int` sits strictly inside — or pass nullable `Integer` bounds. |
| Java | Autoboxing trap in the inorder variant: `Long prev = null;` then `if (prev >= cur.val)` **auto-unboxes `null`** → `NullPointerException`. | Null-check before comparing, or track the previous `TreeNode` instead of a boxed value. |
| C++ | Same sentinel problem with `INT_MIN` / `INT_MAX`. Also, `std::optional<int>` bounds compare cleanly, but mixing `optional<int>` sentinels with strict comparisons requires the same "engaged ⇒ strict compare" logic. | Use `long long` bounds (`LLONG_MIN`/`LLONG_MAX`) or `std::optional<long long>`; check `nullptr` before touching `node->left/right`. |

---

## 9. Test plan — say these out loud before or while coding

| Input | Expected | What it exercises |
|---|---|---|
| `[2,1,3]` | `true` | Official Example 1 — happy path |
| `[5,1,4,null,null,3,6]` | `false` | Official Example 2 — violation one level deep, right side |
| `[5,4,6,null,null,3,7]` | `false` | **Grandchild violation** — all parent–child pairs locally consistent; kills the "compare with children" bug |
| `[2,2,2]` (also `[2,2]`, `[2,null,2]`) | `false` | Duplicates / strictness |
| `[10,5,15,3,12]` | `false` | Violation on the **left** side (`12` must be `< 10`) — people only test right-side violations |
| `[0]`, `[-2147483648]`, `[2147483647]` | `true` | Single node; values exactly at the 32-bit extremes (sentinel stress) |
| `[0,-2147483648]` | `true` | `INT_MIN` as a real key — the int-sentinel bug rejects this |
| `[2147483647,null,2147483647]` | `false` | Right subtree of `INT_MAX` must be strictly greater — impossible |
| Right-skewed chain of 10⁴ increasing nodes | `true` | Performance + recursion-depth stress (validates the iterative version) |

Suggested order out loud: *"Duplicates? Extremes? Single node? Deep skew?"* before coding; the two official examples plus the grandchild case immediately after.

---

## 10. Transferable patterns and related problems

Three reusable patterns live in this problem:

1. **Top-down constraint propagation** — carry an inherited invariant (an interval, a running bound, a required sum) down the recursion and tighten it at each step. Any "is this structure valid / count nodes satisfying ancestor constraints" question.
2. **Inorder ⇔ sorted sequence** — a BST's inorder is strictly increasing; use it whenever a problem needs keys in order or adjacent-key relationships.
3. **Bottom-up aggregation** — post-order returning a tuple `(is_bst, min, max, …)` when you need subtree-wide facts independent of the root-to-node path; the standard shape for "largest/-best BST inside a tree" problems.

| Related problem | Connection |
|---|---|
| LC 94 Binary Tree Inorder Traversal | Foundation for the inorder view |
| LC 173 BST Iterator | The §5.4 iterative stack, exposed as an API |
| LC 230 Kth Smallest Element in a BST | Inorder sortedness; stop at the k-th visit |
| LC 530 Minimum Absolute Difference in BST | Sorted inorder ⇒ answer is a min over adjacent inorder keys |
| LC 501 Find Mode in BST | Sorted inorder ⇒ equal keys are contiguous |
| LC 99 Recover Binary Search Tree | Two swapped nodes ⇒ exactly one/two "descents" in inorder |
| LC 333 Largest BST Subtree | Bottom-up `(is_bst, min, max)` tuple pattern |
| LC 1373 Maximum Sum BST in Binary Tree | Same tuple plus subtree sums |
| LC 938 Range Sum of BST | Uses the same ordering bounds to prune whole subtrees |

Likely follow-up questions: *"Can you do O(1) space?"* (Morris inorder — justify its linear time via the per-edge-constant-traversals argument), *"What if duplicates were allowed, say on the right?"* (flip the strictness on one side and adjust the bound threading), *"Kth smallest?"* (inorder, stop early).

---

## 11. Say it in 60 seconds

> "Validate BST. The trap is that checking each node against its children isn't enough — a node is constrained by **every** ancestor. Two equivalent framings. First: carry down an open interval of allowed values. The root starts at minus-infinity to plus-infinity; recursing left tightens the upper bound to the current value, recursing right tightens the lower bound. At each node check `low < val < high` — strict, because the definition bans duplicates. That's O(n) time, O(height) space. Second framing: inorder must come out strictly increasing — same complexity, and the iterative stack version avoids recursion-depth issues, which matter because a skewed tree here can be ten thousand nodes deep against Python's ~1000-frame default. I'd code the interval DFS, but keep the iterative inorder in my pocket. Tests I'd propose: a duplicate case like `[2,2,2]`, a grandchild violation like `[5,4,6,null,null,3,7]` where every parent–child pair looks fine, a violation on the *left* side, single node, and values at `INT_MIN`/`INT_MAX` — which is why I use infinity sentinels, and in Java or C++ I'd widen the bounds to `long` / `long long`."
