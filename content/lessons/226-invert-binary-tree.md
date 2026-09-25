# Invert Binary Tree — Complete Lesson (LeetCode 226)

> Flavor note: this is the famous problem from the viral Max Howell ("Homebrew") tweet — a reminder that interviewers love it not because it's hard, but because it exposes whether you're fluent with **pointers, recursion, and edge hygiene**. Treat it as a 10-minute problem you must land flawlessly.

---

## 1. Problem restatement

Given the root of a binary tree, produce the **mirror image** of that tree and return its root. "Mirror" means: for **every** node in the tree, its left subtree and right subtree trade places.

Two precision points before any code:

- The input `[4,2,7,1,3,6,9]` is **not an array you manipulate** — it is a **level-order serialization** of a linked structure of `TreeNode` objects. Your job is to rewire `left`/`right` **pointers**, not to sort or reverse a list.
- **Values never move or get compared.** Only structure changes. A node's `val` rides along untouched. This makes duplicates a non-issue for the algorithm (but they matter for *testing* — see §10).

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `0 <= number of nodes <= 100` | The **empty tree is a valid input** (`root == None` → return `None`). Recursion depth ≤ 100, far below Python's default limit of 1000 — no stack-overflow engineering needed *here*. |
| `-100 <= Node.val <= 100` | Values fit in any integer type; **no overflow concerns**. Duplicates are allowed, so any approach that keys a dict by `val` or assumes distinct values is suspect. This problem doesn't compare values at all. |
| Plain binary tree (not stated to be a BST) | There is **no ordering invariant to preserve**. (Side note for follow-ups: inverting a BST *destroys* the BST property — after inversion, "search" semantics flip so the left subtree holds larger keys.) |
| Output shown as `[4,7,2,9,6,3,1]` | The judge compares **serialized level-order** output, so **null placement matters** — a tree with the right values in the wrong shape will fail. |

**Serialization gotcha (indices vs. values):** in LeetCode's bracket format, each non-null node consumes exactly **two** child slots and each `null` consumes **one**. The classic heap formula "children of index `i` live at `2i+1` and `2i+2`" is valid **only when there are no nulls** (a complete tree — true for Example 1, false for `[1,2,null,3]`). Never build your solution on index arithmetic; use object pointers.

---

## 3. Brute force: mirrored deep copy (with a worked trace)

The natural first idea: don't mutate anything — **build a brand-new tree** that is the mirror of the original.

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def invert_tree_copy(root: TreeNode | None) -> TreeNode | None:
    """Brute force: construct a fresh, mirrored deep copy. Original untouched."""
    if root is None:
        return None
    mirrored = TreeNode(root.val)
    mirrored.left = invert_tree_copy(root.right)   # mirror of original RIGHT goes on LEFT
    mirrored.right = invert_tree_copy(root.left)   # mirror of original LEFT goes on RIGHT
    return mirrored
```

**Worked trace on Example 1** (`[4,2,7,1,3,6,9]`), showing returns in post-order:

| Call (order fired) | Reads | Returns (new nodes) |
|---|---|---|
| `f(1)` | leaf | new leaf `1` |
| `f(3)` | leaf | new leaf `3` |
| `f(2)` | children 1, 3 | new `2` with **left = copy(3)**, **right = copy(1)** → `[2,3,1]` |
| `f(6)` | leaf | new leaf `6` |
| `f(9)` | leaf | new leaf `9` |
| `f(7)` | children 6, 9 | new `7` with left = copy(9), right = copy(6) → `[7,9,6]` |
| `f(4)` | children 2-subtree, 7-subtree | new `4` with left = mirrored 7-subtree, right = mirrored 2-subtree → `[4,7,2,9,6,3,1]` ✔ |

**Cost:** O(n) time, O(n) extra space (n brand-new nodes) plus O(h) call stack.

**The array-round-trip trap (worth saying out loud):** "Why not just reverse the level-order list and rebuild?" Because it's wrong. Reversing `[4,2,7,1,3,6,9]` gives `[9,6,3,1,2,7,4]`, but the expected answer is `[4,7,2,9,6,3,1]` — the root itself is still `4`. Mirroring rearranges **within levels and across subtrees**, not the whole array order. This counterexample is a great thing to volunteer in an interview; it shows you distinguish the *serialization* (array of values) from the *data structure* (linked nodes).

---

## 4. The core insight

Inversion is a **local, structural, self-similar operation**:

> Mirror(T) at node `v` = (mirror of `v.right`) placed as left child, and (mirror of `v.left`) placed as right child.

Three consequences:

1. **One swap per node suffices.** Exchange `v.left` and `v.right` — that's O(1) regardless of subtree size, because you move **pointers, not values or nodes**. No copies needed.
2. **Traversal order doesn't matter** — preorder, postorder, BFS — *as long as every node is swapped exactly once*. The only ordering hazard is double-swapping the same node.
3. **Values are irrelevant.** Duplicates, negatives, zeros — nothing is compared or moved individually.

---

## 5. Optimal solution: one traversal, one swap per node

### 5.1 Recursive DFS (the default you should write first)

```python
class Solution:
    def invertTree(self, root: TreeNode | None) -> TreeNode | None:
        if root is None:
            return None
        # RHS is fully evaluated FIRST: both calls see the ORIGINAL children.
        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root
```

If tuple-assignment feels too clever, the explicit-save version is identical in behavior:

```python
def invert_tree(root):
    if root is None:
        return None
    original_left = root.left               # SAVE before overwriting
    root.left = invert_tree(root.right)
    root.right = invert_tree(original_left) # use the saved reference
    return root
```

### 5.2 Worked traces on the official examples

**Example 1** — `invert(4)`; with simultaneous assignment, the RHS is evaluated left-to-right, so the right subtree is processed first. Call stack behavior:

| Step | Action | Effect |
|---|---|---|
| 1 | `invert(4)` → call `invert(7)` | descend right |
| 2 | `invert(7)` → call `invert(9)` | leaf → returns `9` |
| 3 | `invert(7)` → call `invert(6)` | leaf → returns `6` |
| 4 | swap at 7 | node 7 now has children `(9, 6)` |
| 5 | `invert(4)` → call `invert(2)` | descend left |
| 6 | `invert(2)` → call `invert(3)`, then `invert(1)` | leaves |
| 7 | swap at 2 | node 2 now has children `(3, 1)` |
| 8 | swap at 4 | node 4 now has left = 7-subtree `(9,6)`, right = 2-subtree `(3,1)` |

Serialized: `[4,7,2,9,6,3,1]` ✔

**Example 2** — `invert(2)`: `invert(3)` → leaf; `invert(1)` → leaf; swap → `2(3,1)` → `[2,3,1]` ✔

**Example 3** — `root = []` → `invert(None)` returns `None` immediately → `[]` ✔

### 5.3 Iterative alternatives (know these; they're the follow-up "no recursion?" flex)

**BFS (level order), trace included:**

```python
from collections import deque

class Solution:
    def invertTree(self, root: TreeNode | None) -> TreeNode | None:
        if root is None:
            return None
        q = deque([root])
        while q:
            node = q.popleft()
            node.left, node.right = node.right, node.left   # swap EXACTLY once
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        return root
```

Queue trace on Example 1:

| Dequeue | Swap result | Queue after |
|---|---|---|
| `4` | children `(7, 2)` | `[7, 2]` |
| `7` | children `(9, 6)` | `[2, 9, 6]` |
| `2` | children `(3, 1)` | `[9, 6, 3, 1]` |
| `9`, `6`, `3`, `1` | leaves, no-op | `[]` ✔ |

**Explicit-stack DFS** (same invariant: each node enters the stack once, gets swapped once):

```python
def invert_tree_iterative(root):
    if root is None:
        return None
    stack = [root]
    while stack:
        node = stack.pop()
        node.left, node.right = node.right, node.left
        if node.left:  stack.append(node.left)
        if node.right: stack.append(node.right)
    return root
```

---

## 6. Complexity table

| Approach | Time | Extra space | Space driver |
|---|---|---|---|
| Mirrored deep copy (brute force) | O(n) | **O(n)** | n newly allocated nodes |
| Recursive DFS | O(n) | **O(h)** | call stack |
| Explicit-stack DFS | O(n) | **O(h)** | stack |
| BFS | O(n) | **O(w)** | queue holds one level |

Where, for `n ≥ 1` nodes, the height `h` lies in `[⌊log₂ n⌋, n−1]` — a complete tree packs `n` nodes into `⌊log₂ n⌋` levels while a skewed chain has height `n−1` — and the BFS width `w ≤ ⌈n/2⌉` because the widest level of a binary tree (the last level of a complete tree) holds about half the nodes.

**Optimality:** O(n) time is tight and unavoidable — every node's two child pointers must be read and possibly rewritten, and any node an algorithm skips could be one whose children needed swapping, so skipping produces a wrong answer on some input. For this problem, `h ≤ 99` given `n ≤ 100`.

---

## 7. Why it's correct (30-second structural induction)

Let `M(v)` denote the mirror of the subtree rooted at `v`. **Claim:** when `invert(v)` returns, the subtree at `v` equals `M(v)`. **Base case:** `v = None` → returns `None`, and `M(None) = None`. **Step:** the two recursive calls return `M(v.left)` and `M(v.right)` (induction hypothesis on strictly smaller subtrees); the swap then places `M(v.right)` on the left and `M(v.left)` on the right — which is exactly the definition of `M(v)`. ∎

Handy sanity property: for **any** binary tree, `inorder(inverted) = reversed(inorder(original))` — mirroring swaps left/right, so the in-order sequence flips. And inverting twice is the identity (inversion is an involution), which is a free property-based test.

---

## 8. Implementation gotchas: Python vs Java vs C++

| Language | Gotcha | Fix |
|---|---|---|
| Python | The safe idiom is `root.left, root.right = invert(root.right), invert(root.left)` because Python evaluates the **entire RHS before assigning**. | Don't "optimize" it into two separate lines (see §9, mistake #1). |
| Python | `if not root:` is safe here even when `root.val == 0`: a plain object is truthy by default (`TreeNode` defines no `__bool__`/`__len__`), so **the value inside the node never affects truthiness**. Still, `if root is None` is the unambiguous habit — it survives custom node classes that *do* overload `__bool__`. | Prefer `is None` in your own code. |
| Java | You **cannot** swap children with a helper like `swap(node.left, node.right)` — references are **passed by value**, so reassigning the parameters rebinds locals and touches no fields. | Use a temp local at the call site: `TreeNode t = node.left; node.left = node.right; node.right = t;` |
| C++ | `std::swap(node->left, node->right)` is the clean one-liner. If you write a helper that must reassign a child pointer, take **`TreeNode*&`** (reference to pointer); a plain `TreeNode*` parameter receives a copy and reassignments won't propagate. | `#include <utility>`; pass by reference for out-params. |

---

## 9. Common mistakes (ranked by how often they sink candidates)

**#1 — The stale-pointer / double-invert bug.** The single most common wrong solution:

```python
# WRONG
root.left = self.invertTree(root.right)
root.right = self.invertTree(root.left)   # root.left is ALREADY the inverted right subtree!
```

The second line inverts the *already-inverted* right subtree again (net no-op) and assigns it to the right; the original left subtree is **dropped entirely**. On Example 1 this produces `[4,7,7,9,9,9,9]` — node 2 vanishes and values duplicate. Fixes: simultaneous assignment (RHS-first semantics) or an explicit `original_left` temp (§5.1).

**#2 — Swapping a node twice.** Any loop/template that swaps at enqueue *and* at dequeue (or swaps inside and outside a recursive step) net-cancels to the original tree. Invariant to state out loud: **every node is swapped exactly once.**

**#3 — Confusing serialization with structure.** Reversing the level-order array, or applying `2i+1 / 2i+2` index math on a list containing `null`s (the formula only holds for complete trees — see §2).

**#4 — Forgetting to `return root`.** The mutation is in-place, but the judge prints the returned reference; a missing return reads as `[]`.

**#5 — Missing the empty-tree guard.** `deque([None])` or `stack = [root]` without a `None` check crashes on `[]` (Example 3 is literally an official test).

**#6 — Value-keyed logic.** Any approach that maps values to nodes breaks with duplicate values; inversion is pointer surgery and never compares `val`.

**#7 — Cargo-culting `sys.setrecursionlimit`.** With `n ≤ 100`, depth ≤ 100 — fine by default. Knowing *when* it would matter (a skewed tree with ~10⁵ nodes) is the interview flex; applying it here is noise.

---

## 10. Test plan: cases to propose out loud

Say these **before** coding (it signals edge-awareness) or immediately after:

| # | Input (level-order) | Expected output | What it guards |
|---|---|---|---|
| 1 | `[4,2,7,1,3,6,9]` | `[4,7,2,9,6,3,1]` | Official Ex. 1; full/complete tree |
| 2 | `[2,1,3]` | `[2,3,1]` | Official Ex. 2; minimal 3-node |
| 3 | `[]` | `[]` | Official Ex. 3; null root |
| 4 | `[1]` | `[1]` | single node |
| 5 | `[1,2]` | `[1,null,2]` | one child → **null changes sides** |
| 6 | `[1,2,null,3]` | `[1,null,2,null,3]` | asymmetric zigzag; null placement in serialization |
| 7 | left chain of 100 nodes `1←2←…←100` | right chain `[1,null,2,null,…,100]` | max skew; depth-100 recursion OK |

**Duplicates caveat (say it out loud — it's a maturity signal):** a perfect tree with all-equal values serializes **identically before and after inversion**, so it's a *vacuous* test — any buggy solution that returns the root untouched would pass. Always test with **distinct values and asymmetric nulls**; a property test `invert(invert(t)) == t` on random trees is even better.

Minimal local harness:

```python
from collections import deque

def build(values):                       # LeetCode-style level-order list -> tree
    if not values:
        return None
    vals, root, q, i = list(values), TreeNode(values[0]), deque([root := TreeNode(values[0])]), 1
    while q and i < len(vals):
        node = q.popleft()
        for side in ("left", "right"):
            if i < len(vals):
                child = TreeNode(vals[i]) if vals[i] is not None else None
                setattr(node, side, child)
                if child: q.append(child)
                i += 1
    return root

def to_level_order(root):                # tree -> LeetCode-style list (trailing nulls trimmed)
    if root is None:
        return []
    out, q = [], deque([root])
    while q:
        node = q.popleft()
        out.append(None if node is None else node.val)
        if node is not None:
            q.extend((node.left, node.right))
    while out and out[-1] is None:
        out.pop()
    return out

cases = [
    ([4,2,7,1,3,6,9], [4,7,2,9,6,3,1]),
    ([2,1,3], [2,3,1]),
    ([], []),
    ([1], [1]),
    ([1,2], [1,None,2]),
    ([1,2,None,3], [1,None,2,None,3]),
]
for inp, exp in cases:
    assert to_level_order(Solution().invertTree(build(inp))) == exp
```

---

## 11. Transferable patterns & related problems

**Pattern: "O(1) structural work per node during one traversal."** The skeleton — null check, recurse (or queue/stack), constant-time pointer work, return — recurs across tree problems:

| Related problem | Connection |
|---|---|
| LC 101 — Symmetric Tree | Read-only sibling of inversion: check mirror-equality with **two simultaneous DFS pointers** (one goes left-first, the other right-first) |
| LC 100 — Same Tree | Same dual-DFS skeleton, equality instead of mirroring |
| LC 617 — Merge Two Binary Trees | Per-node combine during traversal, returns rebuilt/merged nodes |
| LC 951 — Flip Equivalent Binary Trees | Literally asks whether child-swaps (inversions) can make two trees equal |
| LC 114 — Flatten Binary Tree to Linked List | In-place **pointer rewiring** during traversal |
| LC 206 — Reverse Linked List | The linear-structure analog: per-node pointer rewiring, iterative version |
| LC 297 — Serialize/Deserialize Binary Tree | The infrastructure behind this lesson's test harness |
| LC 558 — quad-tree intersection | Same mirror/structural recursion applied to 4-ary compressed grids |

**Named meta-patterns to cite in interviews:** divide-and-conquer on subtrees; **structural induction** as the correctness argument; "mutate pointers, never copy values"; traversal-order-agnostic per-node work. **Follow-up variant:** for an *n-ary* tree, inversion = reverse each node's children list (same one-pass skeleton); and remember that inverting a BST flips its search semantics (min/max roles swap) — a favorite interviewer twist.

---

## 12. Full interview talk track (script)

> **Clarify:** "Just to confirm — the input is a plain binary tree, not a BST, duplicates are allowed, and in-place mutation with the same root returned is acceptable?"
> **Restate:** "So inverting means every node's left and right subtrees trade places — the whole tree becomes its mirror image. The bracket notation is level-order serialization, so I'll be rewiring pointers, not manipulating an array."
> **Approach:** "The key observation is that mirroring is local and self-similar: to mirror a subtree, I mirror its two children and then swap them at the root. So a single traversal where each node does one O(1) pointer swap solves it. I'll do recursive DFS."
> **Code & the trap:** "One subtlety — I must evaluate both recursive calls *before* overwriting either child pointer, otherwise the second call operates on the already-swapped subtree. In Python I'll use simultaneous assignment, which evaluates the right-hand side first; in Java or C++ I'd save a temp."
> **Complexity:** "O(n) time — each node visited once with constant work; O(h) space for the call stack, h between log n for balanced and n−1 for a skewed chain. With n ≤ 100, depth is at most 99, so no recursion-limit concerns. That's optimal, since every node's pointers must be touched."
> **Edges & tests:** "Empty tree returns null; a single node is unchanged; a one-sided chain becomes the mirrored chain, and nulls change sides — I'll test `[1,2,null,3]` for exactly that. I'll also note that an all-duplicates perfect tree is a vacuous test since it serializes the same either way."
> **Flex:** "If recursion were disallowed or the tree could be huge and skewed, the same logic runs iteratively with a queue — swap each node as I dequeue it — or with an explicit stack."

---

## 13. Say it in 60 seconds

> "Inverting a tree means making its mirror image: every node's left and right subtrees trade places. The insight is that this is a purely local operation — one pointer swap per node — and it's self-similar: to mirror a tree, mirror both subtrees and swap them at the root. So I do a single traversal, visiting each node once, doing an O(1) swap: that's O(n) time and O(height) space, which is optimal because every node's pointers must be touched. The one classic bug: if you overwrite the left pointer before your second recursive call reads it, you invert the same subtree twice and drop the other one — so I evaluate both calls before assigning, or save a temp. Empty tree returns null, a single node is unchanged, and nulls move sides when a node has only one child. With n at most 100, recursion depth is a non-issue; for a huge skewed tree I'd switch to a BFS queue and swap each node as I dequeue it."

*(≈60 seconds at a calm speaking pace — trim the BFS sentence if you're asked to just code.)*
