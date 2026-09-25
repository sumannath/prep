# Binary Tree Maximum Path Sum — Complete Lesson

## 1. The problem in your own words

Restate it like this in the interview:

> "Given a binary tree with values that **can be negative**, find the maximum sum over any **non-empty** path. A path is any simple chain of nodes connected by edges — it can start anywhere, end anywhere, turn at most once (it's a line, not a fork), and it does **not** have to touch the root or any leaf."

Three contract details worth confirming out loud:

- **Non-empty**: a path must contain at least one node. A single node counts. So for `[-3]` the answer is `-3`, not `0`.
- **No branching**: adjacent pairs share an edge and each node appears once, so the path is a simple line in the tree. A node cannot have *three* neighbors on the path.
- **Values, not indices**: the bracket input `[1,2,3]` is a **level-order serialization of node values** (with `null` marking a missing child). There are no indices to reason about; duplicates in values (e.g., `[2,2,2]`) are harmless because we operate on node objects, never on value keys — unlike, say, Path Sum III where you hash prefix sums and must handle duplicate sums with counts.

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= n <= 3 * 10^4` | O(n) or O(n log n) is comfortable. O(n²) ≈ 9×10⁸ basic steps is **too slow in Python** and risky elsewhere — and the worst case for quadratic tree algorithms is a *skewed* tree. |
| `-1000 <= Node.val <= 1000` | Negative values are legal and common → you **cannot** initialize a "best so far" to `0`; use `-∞` (or `root.val`, valid since `n ≥ 1`). Also, extensions into bad subtrees must be *skippable*. |
| Max possible \|path sum\| = 3×10⁴ × 1000 = 3×10⁷ | Fits easily in a 32-bit `int` (2¹⁷⁷... more precisely 3×10⁷ < 2³¹−1 ≈ 2.1×10⁹), so no `long` needed in Java/C++ **for these bounds** — but state that check out loud; it's a habit interviewers like. |
| It's a *tree*, not a graph | Between any two nodes there is exactly one simple path, and every path has a unique **topmost node**. That's the entire key to the problem (Section 4). |

---

## 3. Brute force: fix the apex, compute the two legs

### 3.1 Idea

Every path has a unique highest node `a` (the apex). A path with apex `a` looks like:

```
left-chain ──► a ──► right-chain
```

where each side is an **optional** downward chain into one child's subtree. So:

```
bestPath(a) = a.val + max(0, maxDown(a.left)) + max(0, maxDown(a.right))
```

where `maxDown(x)` = the best sum of a downward path **starting at** `x` (must include `x`, may stop anywhere). Sweep every node as apex and take the max.

### 3.2 Code

```python
class Solution:
    def maxPathSum(self, root):
        def max_down(node):                      # best downward path starting at node
            if not node:
                return 0
            return node.val + max(0, max_down(node.left), max_down(node.right))

        best = float('-inf')
        def sweep(node):                         # try every node as the apex
            nonlocal best
            if not node:
                return
            best = max(best, node.val + max(0, max_down(node.left))
                                         + max(0, max_down(node.right)))
            sweep(node.left)
            sweep(node.right)
        sweep(root)
        return best
```

### 3.3 Worked trace on Example 2: `[-10,9,20,null,null,15,7]`

```
        -10
        /  \
       9    20
           /  \
          15   7
```

`max_down` values: `max_down(15)=15`, `max_down(7)=7`, `max_down(20)=20+max(0,15,7)=35`, `max_down(9)=9`.

| Apex `a` | Left contribution | Right contribution | Path sum at `a` |
|---|---|---|---|
| 9 | 0 (no child) | 0 | 9 |
| 15 | 0 | 0 | 15 |
| 7 | 0 | 0 | 7 |
| 20 | max(0, 15) = 15 | max(0, 7) = 7 | **42** |
| −10 | max(0, 9) = 9 | max(0, 35) = 35 | −10+9+35 = 34 |

Global best = **42** ✓ (note how the negative root contributes nothing — the path never touches it).

### 3.4 Why this is O(n²)

Every time `sweep` processes a node, it re-runs `max_down` over both child subtrees. Total work is `Σ_u size(subtree(u))`. On a left-skewed chain of `n` nodes that sum is `(n−1) + (n−2) + … + 0 = n(n−1)/2` — Θ(n²) node visits. At n = 3×10⁴ that's ~4.5×10⁸ visits: TLE. The fix is obvious once you see it: **each node's `max_down` is recomputed by every ancestor — compute it once, bottom-up, and hand it up.**

---

## 4. The core insight: two different quantities per node

The whole problem is disentangling two numbers that beginners conflate:

| Quantity | Meaning | Formula | Who consumes it |
|---|---|---|---|
| **Gain** (what I report upward) | Best sum of a **downward path starting at me**, extendable by my parent — a *one-sided* chain | `node.val + max(0, best child gain)` | My parent |
| **Apex sum** (what I record locally) | Best **full path whose highest node is me** — a *two-sided* "V" through me | `node.val + max(0, left gain) + max(0, right gain)` | The global answer |

Why the parent may only use a **one-sided** chain: if I handed up both sides, the parent attaching to me would make me have three path-neighbors (both children *and* the parent) — that's a fork, not a path. One-sided gain is the only thing a parent can legally extend.

Why `max(0, child gain)` is legal: the extension into a child is **optional**. A contribution of 0 means "the path stops at me." (It's *not* legal to clamp the node's own value — if I'm on the path, I pay my value even if it's negative. Section 8, mistake #3.)

**The mental model: Kadane's algorithm on a tree.** Kadane keeps `cur = max(x, cur + x)` (best subarray *ending here* — one-sided, extendable) and `best = max(best, cur)`. Here `gain` is "best downward path *starting here*" and the apex sum is the "best path *turning here*." The clamp-at-zero is Kadane's "restart," repurposed as "don't extend." Same skeleton: **return one-sided info upward, record two-sided info globally.**

---

## 5. Optimal algorithm: one post-order pass

### 5.1 Code (Python)

```python
class Solution:
    def maxPathSum(self, root):
        best = float('-inf')                     # NOT 0: all values may be negative

        def gain(node):
            nonlocal best
            if not node:
                return 0                         # null child contributes nothing
            left  = max(0, gain(node.left))      # extension is optional
            right = max(0, gain(node.right))
            best = max(best, node.val + left + right)   # apex sum: record two-sided
            return node.val + max(left, right)          # gain: hand up one-sided

        gain(root)
        return best
```

Note what's *not* recomputed: each node's gain is computed exactly once and reused by its parent — the O(n²)→O(n) win is exactly "post-order = free memoization on trees."

### 5.2 Trace on Example 1: `[1,2,3]`

```
    1
   / \
  2   3
```

| Step | Node | Clamped child gains | Apex sum | `best` after | Returned gain |
|---|---|---|---|---|---|
| 1 | 2 | — | 2 | 2 | 2 |
| 2 | 3 | — | 3 | 3 | 3 |
| 3 | 1 | 2, 3 | 1+2+3 = **6** | 6 | 1+max(2,3) = 4 |

Answer **6** ✓ (the root's returned gain 4 is discarded — nobody is above it).

### 5.3 Trace on Example 2: `[-10,9,20,null,null,15,7]`

| Step | Node | Clamped child gains | Apex sum | `best` after | Returned gain |
|---|---|---|---|---|---|
| 1 | 9 | — | 9 | 9 | 9 |
| 2 | 15 | — | 15 | 15 | 15 |
| 3 | 7 | — | 7 | 15 | 7 |
| 4 | 20 | 15, 7 | 20+15+7 = **42** | 42 | 20+max(15,7) = 35 |
| 5 | −10 | 9, 35 | −10+9+35 = 34 | 42 | −10+35 = 25 |

Answer **42** ✓. Watch the two clamps do real work: node 20's apex takes *both* children (that's allowed — a V is a valid path), while node −10 keeps only the +35 side and drops the +9 side... actually it keeps both since both are positive, but it *can't* beat 42, and its own negativity caps its apex at 34.

### 5.4 Iterative variant (for very deep trees)

```python
class Solution:
    def maxPathSum(self, root):
        best = float('-inf')
        gain = {}                                 # node -> best downward sum starting there
        stack = [(root, False)]
        while stack:
            node, expanded = stack.pop()
            if not node:
                continue
            if expanded:
                left  = max(0, gain.get(node.left, 0))
                right = max(0, gain.get(node.right, 0))
                best = max(best, node.val + left + right)
                gain[node] = node.val + max(left, right)
            else:
                stack.append((node, True))
                stack.append((node.left, False))
                stack.append((node.right, False))
        return best
```

Children's gains are guaranteed to be in the dict before the parent's `expanded` frame is popped, because the `(node, True)` marker sits *below* the child entries on the stack.

### 5.5 Why it's correct (30-second induction)

- **Gain is correct** by induction on height: a downward path from `u` is `u` alone, or `u` plus a downward path from exactly one child. Base case (leaf): `gain = u.val`. ✓
- **Every path is considered**: any non-empty path `P` has a unique topmost node `a`. Since nothing on `P` is above `a`, the path leaves `a` only through its children — at most one chain into the left subtree, at most one into the right. So `sum(P) = a.val + (optional left chain) + (optional right chain)`, and the best such value is exactly the apex formula with clamped gains. Taking the max over all apexes covers every path. ✓
- A path *inside* the left subtree that doesn't touch `a.left` simply has a different (deeper) apex and is covered when that node is processed.

---

## 6. Complexity

| Approach | Time | Extra space | Verdict |
|---|---|---|---|
| Enumerate all node pairs, compute connecting path | Θ(n²) pairs (even with O(1) LCA) | O(n) | Correct, hopeless at n = 3×10⁴ |
| Apex sweep + fresh `max_down` per node | Θ(Σ subtree sizes) = **O(n²)** worst (skewed), O(n log n) balanced | O(h) | TLE: ~4.5×10⁸ visits on a skewed tree |
| **Post-order gain/apex DFS** | **O(n)** — one visit, O(1) work per node | **O(h)** recursion/stack, Θ(n) worst case for a skewed tree | Optimal |

Why O(n) can't be beaten: any correct algorithm must at minimum read every node's value — a single unread node could secretly hold +1000 and be the unique optimum, so `n` reads are necessary and one DFS achieves them.

---

## 7. Test plan — say these out loud before coding

Proposing these unprompted is a strong senior signal:

| # | Input (level-order values) | Expected | What it protects against |
|---|---|---|---|
| 1 | `[1,2,3]` | 6 | Official; apex at root, take both sides |
| 2 | `[-10,9,20,null,null,15,7]` | 42 | Official; apex *below* a negative root |
| 3 | `[-3]` | −3 | Non-empty path; `best` initialized to `0` returns 0 here — wrong |
| 4 | `[-10,-9,-20,null,null,-15,-7]` | −7 | All-negative tree: every child extension must clamp to 0; answer is the best single node |
| 5 | `[1,2,-5,4]` | 7 | Negative side-child must be dropped: unclamped apex at 1 gives 1+6−5=2, and 2 is not even a phantom path issue — the *candidate* `7` (4→2→1) would be missed if clamping were on the wrong side |
| 6 | `[5,4,10,3,2]` | 22 | One-sided return: a two-sided return makes node 4 report 9 upward and node 5 builds a phantom 24 |
| 7 | `[2,2,2]` | 6 | Duplicate values: harmless — algorithm keys on node objects, never on values |
| 8 | Skewed chain of 3×10⁴ nodes | sum of all | Recursion-depth stress (Python) |

---

## 8. Common mistakes

1. **`best = 0` instead of `−∞`.** Fails every all-negative tree: `[-3]` → 0 instead of −3.
2. **Returning the two-sided sum upward.** `return node.val + left + right` lets the parent build a path where this node has three neighbors. Concrete failure: `[5,4,10,3,2]` → wrong answer 24 (no real path sums to 24; correct is 22 = 3→4→5→10).
3. **Not clamping child gains at the apex.** `best = max(best, node.val + l + r)` with raw (unclamped) `l, r` drops the "path stops here" option. `[5,-3]` → returns 2; correct is 5 (the single-node path `[5]`).
4. **Clamping the node's own value.** `max(0, node.val) + max(0, l)` in the *return* breaks the gain contract: the return must include `node.val` unconditionally, because "0 contribution" already exists via the parent's clamp. (Clamping the *entire return* at 0 — `return max(0, node.val + max(left, right))` — happens to still give the right maximum since the parent clamps anyway, but it destroys the function's contract; don't do it, especially with follow-ups.)
5. **Forcing leaf-to-leaf endpoints** (diameter-style). `[10,9,20,null,null,-40,-50]`: leaf-to-leaf best is −1, but the true answer is 39 (9→10→20 — an internal endpoint on the right).
6. **Python recursion depth.** A skewed 3×10⁴-node tree exceeds the default limit (~1000 frames). Fix: `sys.setrecursionlimit(3 * 10**4 + 100)` or use the iterative version in §5.4.
7. **Forgetting `nonlocal best`** in the nested function — you get a `NameError` (or worse, silent shadowing if you accidentally assign a local `best` somewhere).
8. **Confusing this with root-to-leaf Path Sum** — different contract entirely (there, the path *must* start at the root and end at a leaf).

### Language gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| **Python** | Recursion limit (above); use `nonlocal` or `self.best` for the shared answer; `float('-inf')` sentinel is fine because `n ≥ 1` guarantees at least one apex updates `best` with an `int`. |
| **Java** | `int` is pass-by-value — the recursive helper needs an instance field or an `int[] best` holder; initialize to `Integer.MIN_VALUE`, not `0`. Sums fit in `int` here (max 3×10⁷ < 2³¹−1), but say that bound check out loud; with |val| up to 10⁹ you'd switch to `long`. A fully skewed 3×10⁴-deep tree is usually fine on LeetCode's JVM but is near the edge of small default stacks — know the explicit-stack fallback. |
| **C++** | Pass the accumulator by reference (`int& best`) or use a member; `INT_MIN` is safe **only because you never add to `best`** — if you refactor into a running-sum pattern, adding to `INT_MIN` is UB (signed overflow). Same `int`-vs-`long long` bound note as Java. |

---

## 9. Transferable patterns and related problems

The reusable skeleton: **"post-order tree DP — return one-sided info upward, record two-sided (or combined) info in a global answer."**

| Problem | How it maps |
|---|---|
| LC 543 — Diameter of Binary Tree | Identical code shape: gain = `1 + max(hL, hR)`, record `hL + hR`. |
| LC 687 — Longest Univalue Path | Gain conditioned on child having the same value. |
| LC 53 — Maximum Subarray | Kadane is the linear-chain version of gain/apex; clamp-at-zero = restart. |
| LC 112/113 — Path Sum I/II | Different contract: root-to-leaf, must track a running target. |
| LC 437 — Path Sum III | Prefix-sum-on-downward-paths; there you *do* hash values (with counts, because prefix sums repeat). |
| LC 337 — House Robber III | Per-node include/exclude state returned upward. |
| LC 968 — Binary Tree Cameras | Return a small state tuple upward, combine at parent. |
| LintCode 475 — Max Path Sum II (root to any node) | If the root *must* be an endpoint, the answer is just the root's returned gain — the apex bookkeeping disappears. |

---

## 10. Follow-ups to expect

- **"Return the actual path, not just the sum."** Keep each node's choice (which child, if any, its best chain extends into) or parent pointers; after finding the apex, walk down-left and down-right picking the recorded best child each step. Still O(n).
- **"Path must contain at least two nodes."** The clamp-at-zero trick must change: a node with no usable child extension must report `−∞` (not 0) as a gain, so it can't masquerade as a single-node path.
- **"N-ary tree."** Gain = `val + max(0, best child gain)`; apex = `val + sum of the top two clamped child gains` (at most two sides on a path).
- **"All values are guaranteed positive — is it easier?"** No! You still can't take the whole tree (a path is a line, so a node still picks at most two of its children). All-positive just removes the clamps; the structure of the recursion is unchanged.
- **"Tree with updates."** Rerooting-style DP can precompute per-node bests and answer subtree edits faster than a full re-DFS; mention you know the technique exists, don't derive it unless asked.

---

## 11. Fuller interview talk track

> "Let me restate: any non-empty chain of nodes connected by edges — a single node counts, values can be negative, and the path doesn't need the root or leaves.
>
> Brute force: every path has a unique highest node, its apex. For each apex, the best path is its value plus an optional best downward chain into the left subtree and one into the right. Computing those chains fresh for every node repeats work — on a skewed tree that's quadratic, about n² over 2 visits.
>
> The fix: compute each node's downward best exactly once, bottom-up. I'll define **gain**: the best sum of a downward path *starting* at this node — its value plus the better of its children's gains, clamped at zero, because extending into a child is optional. That's the one-sided quantity a parent is allowed to use. And at each node I also compute the **apex sum** — value plus left gain plus right gain, each clamped at zero — because a full path may turn at this node and dip into both sides. I record every apex sum against a global max and return only the gain.
>
> The clamps do two jobs: max-with-zero on the children means 'the path may stop here,' and that's also what makes single-node and all-negative trees work — the global max starts at minus infinity, not zero. The thing I must *not* do is return both sides upward — then the parent would build a branching path.
>
> One post-order pass, O(1) per node: O(n) time, O(height) stack, with an explicit-stack version if the tree can be a 30,000-deep chain in Python. Tests: the two official examples, a single negative node, an all-negative tree, a case where a negative child gets pruned, and a deep skewed chain."

---

## 12. Say it in 60 seconds

> "Every tree path has a unique highest node, its apex, and a path through that node is its value plus at most one downward chain into each side. So I run one post-order DFS. Each node returns to its parent a **gain** — its value plus the better child's gain, clamped at zero, since extending is optional — and that one-sided return is the only thing a parent may reuse, otherwise we'd build branching paths. While at each node I record the **apex sum** — value plus both clamped child gains — into a global max initialized to negative infinity, because values can be negative and a single node is a valid path. Every node is visited once: O(n) time, O(height) space, with an iterative stack if the tree can be skewed to 30,000 levels in Python. Key failure modes I'm guarding against: initializing the max to zero, returning two sides upward, and forgetting to clamp child gains at the apex."
