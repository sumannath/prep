# Lowest Common Ancestor of a BST (LeetCode 235) — Complete Lesson

## 1. Problem, restated precisely

You're given the **root of a binary search tree** and **two node references `p` and `q`** (not values!). Return **the node** that is their lowest common ancestor — the deepest node that has both `p` and `q` in its subtree, where **a node counts as its own descendant** (so if `p` is an ancestor of `q`, the answer is `p` itself).

Precision points worth saying out loud in an interview:

- **Values vs. indices vs. references.** In Example 1, `root = [6,2,8,0,4,7,9,null,null,3,5]` is a *level-order encoding* (children of index `i` sit at indices `2i+1` and `2i+2`; `null` slots still occupy positions). The array is just a serialization — in code you receive `TreeNode` objects, and `p = 2` means "**the node whose value is 2**", which lives at *array index 1*. Array index 2 holds value **8**. Mixing those up is a classic transcription bug.
- **Duplicates.** Constraints say all values are unique, so "the node with value 2" is unambiguous and comparing by `.val` is equivalent to comparing node identity. If duplicates were allowed, this equivalence breaks — worth saying out loud.
- **Guarantees.** `p != q`, both `p` and `q` exist in the tree. This means no "node not found" handling is needed — the walk below can never fall off the tree.

The example tree for Examples 1 and 2:

```
            6
          /   \
         2     8
        / \   / \
       0   4 7   9
          / \
         3   5
```

| index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| value | 6 | 2 | 8 | 0 | 4 | 7 | 9 | ∅ | ∅ | 3 | 5 |

(Node 4 at index 4 has children at indices 9 and 10 — values 3 and 5.)

## 2. Constraint decoding — what the fine print is telling you

| Constraint | Decode | Consequence for your solution |
|---|---|---|
| `n` up to `10^5` | O(n²) work (≈10¹⁰ ops) is dead on arrival; O(n) and O(h) are fine | Kills approaches like "enumerate ancestors of `p`, run a full-tree containment check for each" |
| `-10^9 ≤ Node.val ≤ 10^9` | fits comfortably in a 32-bit signed int (`2^31 − 1 ≈ 2.147×10^9`) | Compare values directly; never *arithmetic* on them (see gotchas) |
| All values unique | value ↔ node identity is 1:1 | `.val` comparisons are safe; no maps/parent pointers needed |
| `p != q`, both exist | the search can't miss; the walk can't fall off the tree | No missing-node logic — that's the *only* difference from LC 1644 |
| No balance guarantee | height `h` ranges from `Θ(log n)` (balanced: node count roughly doubles per level, so height is `Θ(log₂ n)`) to `n` (skewed chain) | Claim **O(h)**, not O(log n); and deep recursion is dangerous (see gotchas) |

## 3. Brute force: two root-to-node paths, compare them

**Idea (works for any tree):** the root-to-`p` path and root-to-`q` path share a prefix (paths from the root are unique in a tree). Their **last common node** is exactly the LCA.

```python
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        def path_to(target: 'TreeNode') -> list:
            path, cur = [], root
            while cur.val != target.val:      # BST descent; target guaranteed to exist
                path.append(cur)
                cur = cur.left if target.val < cur.val else cur.right
            path.append(cur)
            return path

        path_p, path_q = path_to(p), path_to(q)
        lca = root
        for a, b in zip(path_p, path_q):      # zip stops at the shorter path
            if a is not b:
                break
            lca = a
        return lca
```

**Worked trace — Example 2** (`p = 2`, `q = 4`):

1. Path to `2`: at `6`, `2 < 6` → left; at `2`, match. `path_p = [6, 2]`
2. Path to `4`: at `6`, `4 < 6` → left; at `2`, `4 > 2` → right; at `4`, match. `path_q = [6, 2, 4]`
3. Compare: `6 == 6` (lca = 6), `2 == 2` (lca = 2), `path_p` exhausted → **LCA = 2** ✓ (a node is its own ancestor)

**Trace — Example 1** (`p = 2`, `q = 8`): `path_p = [6, 2]`, `path_q = [6, 8]`; first elements match, second differ → **LCA = 6**.

Cost: because we exploit BST ordering, each path costs **O(h)**, so O(h) time, O(h) space. (With a blind DFS to find each path it would be O(n) time per path — fine correctness-wise, but you've thrown away the BST.)

**The "ignore that it's a BST" recursion** (this is the LC 236 solution — know it, but don't lead with it here):

```python
class Solution:
    def lowestCommonAncestor(self, root, p, q):
        if root is None or root is p or root is q:
            return root
        left  = self.lowestCommonAncestor(root.left,  p, q)
        right = self.lowestCommonAncestor(root.right, p, q)
        if left is not None and right is not None:
            return root
        return left if left is not None else right
```

Compact trace on Example 2: `f(6)` → left call `f(2)` hits `root is p`, returns node 2 immediately; right call `f(8)` finds neither target, returns `None`; back at 6: one side found, other `None` → propagate 2. ✓ Subtle point: `f(2)` returns without confirming `q` is actually beneath it — correct *only* because both nodes are guaranteed present. That's exactly why LC 1644 (existence not guaranteed) needs extra verification.

This is O(n) time — correct but it ignores the single most important property of the problem.

## 4. The core insight: the split point

The BST invariant says: everything in a node's left subtree is **strictly less** than the node, everything in the right subtree **strictly greater** (values are unique). So standing at any node `cur`:

| Condition | Meaning | Action |
|---|---|---|
| `p.val < cur.val and q.val < cur.val` | both targets live in the left subtree | descend left |
| `p.val > cur.val and q.val > cur.val` | both targets live in the right subtree | descend right |
| otherwise | **split point**: either `cur` *is* one of the targets, or `p` and `q` sit in **different** child subtrees | **return `cur`** |

Why the split point is the LCA (three-bullet proof):

1. **Invariant:** every node the walk stands on is a common ancestor of both `p` and `q`. True at the root; if both targets are `< cur.val`, then both must be inside `cur.left` (any descendant with a smaller value lives in the left subtree), so the invariant survives the descent; symmetric for right.
2. **Stop condition:** the first node where the targets are *not* strictly on one side. If `cur.val == p.val` (or `q.val`), then by the invariant `cur` is still an ancestor of the other target — and a node is its own ancestor — so `cur` is the LCA. This handles Example 2 and Example 3 with **no special-casing**.
3. **Minimality:** if `p` and `q` are in different child subtrees of `cur`, no proper descendant of `cur` can contain both, and every common ancestor above `cur` is higher. So `cur` is the *lowest* one.

Equivalently: the LCA is the **first divergence point** of the two root-to-target paths — the deepest node they share.

**Termination safety:** while a "both on one side" condition holds, that child contains both targets and is non-null, so the walk never steps into `None` given the problem's guarantees. A defensive `while cur:` costs nothing.

**Alternative formulation** (normalize, then look for the inclusive bracket):

```python
class Solution:
    def lowestCommonAncestor(self, root, p, q):
        lo, hi = sorted((p.val, q.val))
        cur = root
        while not (lo <= cur.val <= hi):
            cur = cur.left if cur.val > hi else cur.right
        return cur
```

Same algorithm; just be careful to normalize first — assuming "p is the smaller one" without checking is a real bug.

**Can we beat O(h)?** No — in the worst case an adversary can make the two root-to-target paths coincide for the first `h − 1` edges and diverge arbitrarily deep, so any node left unexamined could still be the true split point; Θ(h) node inspections are unavoidable.

## 5. Optimal approach: one-pointer iterative walk

```python
# class TreeNode:
#     def __init__(self, x): self.val = x; self.left = None; self.right = None

class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        cur = root
        while cur:
            if p.val < cur.val and q.val < cur.val:
                cur = cur.left           # both strictly left
            elif p.val > cur.val and q.val > cur.val:
                cur = cur.right          # both strictly right
            else:
                return cur               # split point, or cur IS p/q
        return cur  # unreachable given constraints; defensive
```

A recursive version is equivalent but risks stack overflow on deep trees — prefer iterative (see gotchas).

**Trace — Example 1** (`p = 2`, `q = 8`):

| step | `cur` | Check | Decision |
|---|---|---|---|
| 1 | 6 | `2 < 6` but `8 > 6` → not both on one side | split → **return 6** ✓ |

**Trace — Example 2** (`p = 2`, `q = 4`):

| step | `cur` | Check | Decision |
|---|---|---|---|
| 1 | 6 | `2 < 6` and `4 < 6` | both left → descend to 2 |
| 2 | 2 | `2 < 2` false, `2 > 2` false | else → **return 2** ✓ (equality case: `cur` is `p` itself) |

**Trace — Example 3** (`root = [2,1]`, `p = 2`, `q = 1`):

| step | `cur` | Check | Decision |
|---|---|---|---|
| 1 | 2 | `2 < 2` false, `2 > 2` false | else → **return 2** ✓ (root is `p`) |

## 6. Complexity

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Two paths + compare (BST descent) | O(h) | O(h) | Use when you also need the paths (e.g., LC 2096) |
| Two paths + compare (blind DFS) | O(n) | O(h) | Any binary tree |
| Generic recursion (LC 236 style) | O(n) | O(h) stack — O(n) on a skewed tree | Any binary tree; recursion-depth risk |
| **Iterative split-point walk** | **O(h)** — `Θ(log n)` if balanced (node count doubles per level), **O(n)** worst case for a skewed chain | **O(1)** | The intended solution |

`n = 10^5` means a skewed tree has height 10⁵ — O(h) and O(n) coincide there, but O(1) space and no recursion make the iterative walk strictly safest.

## 7. Implementation gotchas beyond Python

| Language | Gotcha | Detail |
|---|---|---|
| Python | RecursionError | Default recursion limit ≈ 1000; a skewed 10⁵-node tree is a single chain → write the iterative loop rather than raising `sys.setrecursionlimit` |
| Java | `Integer` autoboxing | If you stash values in `HashMap<Integer, TreeNode>` and compare boxed keys with `==`, only `−128..127` are interned — use `int` primitives or `.equals()` |
| Java | StackOverflowError | Same skewed-tree recursion issue; the JIT won't save you — iterate |
| Java / C++ | Overflow if you get clever | Values fit in `int` (2×10⁹ < 2³¹−1), but an expression like `(p.val + q.val) / 2` reaches 2×10⁹ and overflows 32-bit — this solution never needs arithmetic, only comparisons |
| C++ | Pointer vs. value comparison | `node == p` compares addresses; `node->val == p->val` compares values. They agree here (unique values), but choose deliberately, and return the **node pointer**, never a value |

## 8. Common mistakes

1. **Wrong comparison boundaries.** Writing `p.val <= cur.val and q.val <= cur.val: go left` makes the walk descend left when `cur` *is* `p` — but `p` is not in the left subtree. Fix: **strict** comparisons; equality must land in the `else → return` branch.
2. **Claiming O(log n) outright.** The tree isn't guaranteed balanced. Say O(h), then note the balanced case is `Θ(log n)` and the skewed case is O(n).
3. **Recursive solution in Python/Java** on a 10⁵-node skewed tree → `RecursionError` / `StackOverflowError`. Iterate.
4. **Returning `node.val` instead of the node.** The judge compares the returned `TreeNode` object, not its value.
5. **Not using the BST property** — writing the O(n) two-sided search is correct but signals you missed the point; interviewers will push you to O(h).
6. **The bracket formulation without normalizing** which of `p`/`q` is smaller → wrong descents when `q.val < p.val`.
7. **Assuming value comparison is always safe.** It's safe *here* only because values are unique and both nodes exist; say that out loud, because it's exactly what changes in LC 1644 and in duplicate-friendly variants.

## 9. Test cases to propose out loud

State these before (or right after) coding — it demonstrates constraint-awareness:

| # | Input | Expected | What it exercises |
|---|---|---|---|
| 1 | Official Ex 1: `p=2, q=8` on the tree above | 6 | Split at root, targets in opposite subtrees |
| 2 | Official Ex 2: `p=2, q=4` | 2 | Self-ancestor: LCA is `p` itself; equality branch |
| 3 | Official Ex 3: `root=[2,1]`, `p=2, q=1` | 2 | Minimum-size tree; LCA = root = `p` |
| 4 | Same tree as Ex 1, `p=3, q=9` | 6 | Deep targets, split at root |
| 5 | Same tree as Ex 1, `p=3, q=5` | 4 | Deep LCA *below* the root (walk: 6→2→4, split at 4) |
| 6 | Same tree as Ex 1, `p=7, q=9` | 8 | "Value-adjacent" nodes whose LCA is neither; walk: 6→8, split at 8 |
| 7 | Skewed chain of 10⁵ nodes, `p`, `q` both deep | deepest common node | Stress: recursion depth (why the solution is iterative), O(h)=O(n) runtime |
| 8 | Tree containing values `−10^9` and `10^9`, `p`, `q` = those extremes | root-level split | Boundary values; confirms we never do arithmetic on values |

Spoken checklist: *"Both nodes exist, `p != q`, values unique — so no missing-node handling, no duplicate ambiguity, and my walk can't fall off the tree. If you removed any of those guarantees, I'd need LC 1644-style verification."*

## 10. Transferable patterns & related problems

**Patterns to carry forward:**

- **Prune with a global invariant.** The BST ordering lets you discard half the tree per step — the same discipline as binary search on sorted arrays. Spot the invariant, then only descend where the targets can live.
- **LCA = deepest shared prefix of two root-anchored paths.** Directly reusable: distance between two nodes in a BST is `depth(p) + depth(q) − 2·depth(LCA)`, computable during this same walk; LC 2096 (step-by-step directions) is exactly "paths + LCA."
- **Equality is a case, not an error.** "Descendant of itself" means `cur == p` or `cur == q` must resolve to returning `cur` — here it falls out of the `else` branch for free.
- **Many queries on one tree?** Preprocess: with parent pointers, climb the deeper node then step both up together (LC 1650, premium) — O(h) per query, O(1) space. For a general tree, an Euler tour plus a range-minimum sparse table answers each LCA in O(1) after O(n log n) build, because the tour turns LCA into a range-minimum over node depths.

| Related problem | Relationship | Complexity there |
|---|---|---|
| LC 236 — LCA of a Binary Tree | No ordering → must search both subtrees | O(n) time, O(h) stack |
| LC 1644 — LCA II *(premium)* | Targets may be absent → verify after the walk | O(h) with two verification searches, or O(n) generic |
| LC 1650 — LCA III *(premium)* | Parent pointers, no root given → climb-from-deeper | O(h) time, O(1) space |
| LC 2096 — Step-By-Step Directions | Same BST descent, then build `U`/`L`/`R` strings around the LCA | O(n) worst |
| LC 865 — Smallest Subtree with All Deepest Nodes | Same "deepest node containing all targets" flavor | O(n) |
| LC 938 — Range Sum of BST | Identical pruning: skip subtrees entirely outside the range | O(n) worst, pruned heavily when the range is tight |
| LC 270 — Closest BST Value | Same one-pointer descent | O(h) |

## 11. The interview talk track (full script)

> "Let me restate: given a BST and two nodes `p` and `q` that are guaranteed to be in it, return their lowest common ancestor, where a node counts as its own ancestor. Brute force, ignoring the BST property: capture the root-to-`p` and root-to-`q` paths and return the last node where they agree — that's the first divergence of two root-anchored paths, and it's O(n) if I search blindly. But the BST ordering gives me something better. Standing at any node: if both targets are smaller, both live in the left subtree, so descend left; if both larger, descend right; the first node where they're *not* on the same side — or the node equals one of them — is the split point, and that's the LCA. Why: the two root-to-target paths share a prefix, the split point is exactly the last shared node, and both targets live in its two subtrees — or it *is* one of them, which covers 'a node is its own descendant' with no special case. I'll do it with a single pointer, iteratively, no recursion: time O(h) — logarithmic if balanced, linear worst case on a skewed tree — and O(1) space. Two gotchas before I code: strict comparisons only, so equality lands in the return branch; and iterative, not recursive, since 10⁵ nodes can be one long chain and Python's recursion limit is around a thousand. Then I'd run the three official examples plus a deep split, a deep LCA, and a skewed stress test."

## 12. Say it in 60 seconds

> "BST, two nodes guaranteed present, return their lowest common ancestor — a node is its own ancestor. Brute force is two root-to-node paths, return the last shared node — O(n). The BST property makes it a walk: at each node, both targets smaller means both live left — go left; both larger — go right; the first node where they're not on the same side, or where the node *equals* one of them, is the split point, and that's the LCA, because the two root-to-target paths coincide exactly up to that node. One pointer, iterative, no recursion: O(height) time — logarithmic if balanced, linear worst case on a skewed tree — O(1) space. Gotchas: strict comparisons so equality hits the return branch, and iterate rather than recurse since 10⁵ nodes can be one deep chain. Tests: the three official examples, a deep split like 3 and 9, a deep LCA like 3 and 5, and a skewed stress case."
