# Diameter of Binary Tree — Complete Interview Lesson

## 1. Problem Restated (say this back to the interviewer)

> "Given the root of a binary tree, I need the length — **in edges** — of the longest path between any two nodes. A path is a simple sequence of nodes where each consecutive pair is connected by an edge, so it goes **up zero or more times, then down zero or more times** — it never branches back and forth. The path does **not** have to pass through the root. If the tree has a single node, the longest 'path' is that node alone, which is **0 edges**."

Three things worth confirming out loud (they're each worth points):

1. **Edges, not nodes.** The length of path `[4,2,1,3]` is 3 (three edges), not 4 (four nodes). Many problem variants count nodes — always ask which one.
2. **The path need not touch the root.** Any "answer = height(left) + height(right) computed only at the root" solution is wrong.
3. **Values are irrelevant.** `val` can be anything in `[-100, 100]`, may repeat, and we never read it. Duplicates are harmless because we never key on or compare values — only tree *shape* matters. (Contrast with Longest Univalue Path, where values are the whole point.)

Note on input format: `root = [1,2,3,4,5]` is LeetCode's **level-order serialization** — those numbers are node *values* at BFS positions, not indices we'll ever touch. There's no array indexing in this problem.

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= number of nodes <= 10^4` | Linear `O(n)` is trivially fine. Quadratic is `10^8` operations — risky in Python, so there's likely a linear intended solution. Also: a **completely skewed tree has depth 10^4**, which matters for recursion (see §7). |
| `-100 <= Node.val <= 100` | A deliberate red herring: no BST property, no monotonicity, negatives are legal. Values never enter the algorithm. |
| n ≥ 1 | The tree is never empty — but a **single node is legal**, and its diameter is 0. This kills any `best = -1` initialization and any "answer ≥ 1" assumption. |
| "Length = number of edges" | The off-by-one trap. Single node → 0, two nodes → 1, chain of n nodes → n−1. |
| Path may or may not pass through root | Forbids the root-only shortcut; the max must be taken **over every node**, not just the root. |

Max possible answer: `n − 1 = 9999` — fits comfortably in a 32-bit int; no overflow concerns in any language.

## 3. Brute Force, With a Worked Trace

### 3.1 Strawman: all pairs

Enumerate every pair of nodes, compute their distance via LCA. That's `O(n²)` pairs × `O(h)` per distance — clearly overkill. One line in an interview to show you considered it, then move on.

### 3.2 The natural brute force: recompute heights at every node

Key sub-fact (prove it to yourself): for any node `u`, the longest path whose **highest point** is `u` goes from the deepest node of `u`'s left subtree, up through `u`, down to the deepest node of `u`'s right subtree. If `H(x)` is the height of subtree `x` **counted in nodes** (leaf = 1, empty = 0), that path has exactly `H(u.left) + H(u.right)` **edges** (derivation in §5.2).

So: visit every node, recompute its children's heights, track the max.

```python
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        def height(node):                 # height in NODES; leaf -> 1
            if node is None:
                return 0
            return 1 + max(height(node.left), height(node.right))

        best = 0
        def walk(node):
            nonlocal best
            if node is None:
                return
            best = max(best, height(node.left) + height(node.right))
            walk(node.left)
            walk(node.right)

        walk(root)
        return best
```

### 3.3 Trace on Example 1 — `root = [1,2,3,4,5]`

```
      1
     / \
    2   3
   / \
  4   5
```

Heights in nodes: `H(4)=1, H(5)=1, H(2)=2, H(3)=1, H(1)=3`.

| Node `u` | Candidate `H(u.left)+H(u.right)` |
|---|---|
| 4 | 0 + 0 = 0 |
| 5 | 0 + 0 = 0 |
| 2 | 1 + 1 = **2**  (path 4–2–5) |
| 3 | 0 + 0 = 0 |
| 1 | 2 + 1 = **3**  (path 4–2–1–3) |

Max = **3** ✓ — matches the expected output.

### 3.4 Why it's slow

Computing `H(2)` at node 1 already visited `{2,4,5}`; then visiting node 2 visits `{4,5}` **again**. In general, node `v` is re-walked once for every ancestor that requests its subtree height, so total work is `O(n·h)` — `O(n²)` on a skewed tree, `O(n log n)` on a balanced one. That redundancy is the whole problem.

## 4. The Core Insight: Decompose Every Path by Its Peak

Two observations collapse the brute force to one pass:

1. **Every path has exactly one peak** — the highest node on it (formally, the LCA of its endpoints; or an endpoint itself for a one-sided path like `leaf → parent`). So the set of all paths partitions cleanly by peak.
2. **The longest path with peak `u` has length `dl + dr` edges**, where `dl, dr` are the heights (in nodes) of `u`'s left/right subtrees — i.e., the distance in edges from `u` to the farthest node on each side, with a missing side contributing 0.

Since every path with peak `u` is *a* path in the tree, its length is ≤ the diameter; and the diameter path itself is the longest path with *its own* peak. Therefore:

$$\text{diameter} = \max_{u}\ \big(H(u.left) + H(u.right)\big)$$

And here's the punchline: **a post-order height computation already visits every node and already has `H(u.left)` and `H(u.right)` in hand at the moment it processes `u`.** We don't need a second pass — we just piggyback a running max onto the height recursion. This is the canonical *“return one quantity, track another”* tree-DP pattern.

## 5. Optimal Solution: One Post-Order DFS

### 5.1 Code

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val, self.left, self.right = val, left, right

class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        best = 0                          # diameter, counted in EDGES

        def depth(node):                  # returns height in NODES (leaf -> 1)
            nonlocal best
            if node is None:
                return 0
            left = depth(node.left)       # height (nodes) of left subtree
            right = depth(node.right)
            best = max(best, left + right)  # longest path peaking at `node`, in edges
            return 1 + max(left, right)     # height (nodes) of `node`

        depth(root)
        return best
```

Two structural notes to say while writing:
- The function **returns** the height (what the parent needs) but **updates** `best` as a side effect (what the answer needs). Those are two different jobs; never conflate their values.
- Python needs `nonlocal best`; alternatives are `self.best` or `best = [0]` (see §7.1).

### 5.2 Why `left + right` is exactly the edge count (the off-by-one, resolved once and for all)

With `H` measured in **nodes** (`H(leaf)=1`, `H(None)=0`):

- Deepest node in the left subtree is `H(u.left) − 1` edges below `u.left`, plus 1 edge up to `u` → **`H(u.left)` edges** from `u` to the farthest-left node.
- Symmetrically, **`H(u.right)` edges** on the right side.
- Total path (left-farthest → u → right-farthest): `H(u.left) + H(u.right)` edges.
- Missing child → its term is 0, and the formula gracefully degenerates: a leaf gives `0+0=0`; a node with one leaf child gives `1+0=1` (the path from that child to the node — valid, one edge).

Sanity checks: Example 1 → `2+1=3` ✓; Example 2 (`[1,2]`) → `1+0=1` ✓; single node → `0` ✓. Equivalent statement: **diameter-in-edges = (max nodes on any path) − 1**; with the node convention, `left + right` nodes on the two arms minus the shared peak counted... the arithmetic above is the clean way to see it.

If you'd rather use **edge-heights** (`h(leaf)=0`), you must set `h(None) = −1` and use `h(l)+h(r)+2`. That convention is more error-prone; pick one, pin it in a comment, and stay consistent.

### 5.3 Trace on Example 1 — `root = [1,2,3,4,5]`

Post-order (children before parent):

| Call | `left` ret | `right` ret | `best` update | returns `1+max` |
|---|---|---|---|---|
| `depth(4)` | 0 | 0 | `best = max(0, 0)` = 0 | 1 |
| `depth(5)` | 0 | 0 | stays 0 | 1 |
| `depth(2)` | 1 | 1 | `best = max(0, 1+1)` = **2** | 2 |
| `depth(3)` | 0 | 0 | stays 2 | 1 |
| `depth(1)` | 2 | 1 | `best = max(2, 2+1)` = **3** | 3 |

Return **3** ✓. Notice `best` was already correct *before* reaching the root (2, via path 4–2–5) — concrete proof the answer needn't pass through the root.

### 5.4 Trace on Example 2 — `root = [1,2]`

| Call | `left` ret | `right` ret | `best` update | returns |
|---|---|---|---|---|
| `depth(2)` | 0 | 0 | 0 | 1 |
| `depth(1)` | 1 | 0 | `max(0, 1+0)` = **1** | 2 |

Return **1** ✓.

### 5.5 Variant: return a pair (no mutable state)

If you dislike closure state — or the interviewer asks for a "pure" recursion:

```python
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        def dfs(node):
            # returns (height_in_nodes, best_diameter_entirely_within_subtree)
            if node is None:
                return 0, 0
            lh, ld = dfs(node.left)
            rh, rd = dfs(node.right)
            return 1 + max(lh, rh), max(ld, rd, lh + rh)
        return dfs(root)[1]
```

The pair version generalizes better to problems where the "tracked" quantity depends on more context (e.g., Max Path Sum).

### 5.6 Variant: iterative post-order (recursion-limit-proof)

```python
class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        best = 0
        height = {None: 0}                 # node-hashable; empty subtree -> 0
        stack = [(root, False)]
        while stack:
            node, processed = stack.pop()
            if node is None:
                continue
            if processed:
                l, r = height[node.left], height[node.right]
                height[node] = 1 + max(l, r)
                best = max(best, l + r)
            else:
                stack.append((node, True))     # revisit after both children
                stack.append((node.left, False))
                stack.append((node.right, False))
        return best
```

`TreeNode` objects hash by identity by default, so the dict is safe. Push order guarantees each node's `True` visit happens strictly after both children's `True` visits.

## 6. Complexity Analysis

| Approach | Time | Auxiliary space | Verdict |
|---|---|---|---|
| All pairs + LCA distances | `O(n²·h)` naive | `O(h)` | Strawman only |
| Brute force (§3) | `O(n·h)` → `O(n²)` skewed | `O(h)` recursion | Fails at scale |
| **Single DFS (§5.1)** | **`O(n)`** | **`O(h)` stack — `O(n)` worst (skewed)** | Intended solution |
| Iterative post-order (§5.6) | `O(n)` | `O(n)` explicit stack + map | For deep trees |
| Double BFS/DFS (general unweighted tree given as adjacency list) | `O(n)` | `O(n)` | For non-binary / unrooted input |

- **Time, optimal:** each node is entered exactly once and does `O(1)` work (two recursive results, one max, one comparison).
- **Space:** recursion depth = tree height: `O(log n)` balanced, `O(n)` skewed. State this honestly — "O(h), which is O(n) worst case" is the precise answer.
- **Why `O(n)` is a real lower bound** (worth one sentence if prodded): any correct algorithm must at least detect each node's existence, because an adversary can hide an arbitrarily deep branch under any unexamined node and change the answer — so every node must be read, giving `Ω(n)`.
- **Related claim, if asked about general graphs:** the classic "BFS from any node to find farthest node `u`, then BFS from `u`; that distance is the diameter" trick works on unweighted trees because a farthest node from any start is always a diameter endpoint — a standard exchange argument: if it weren't, splicing the unique tree paths yields a pair longer than the diameter, a contradiction.

## 7. Common Mistakes and Interview Traps

| # | Mistake | Symptom | Fix |
|---|---|---|---|
| 1 | **Counting nodes instead of edges** | Returns 4 for Example 1 | Use node-count heights and candidate `left + right` (§5.2), or edge-heights with `h(None) = −1` and `+2` |
| 2 | `max(left, right)` instead of `left + right` for the candidate | Returns 2 for Example 1 | The path bends through **both** arms — it's a sum |
| 3 | Only evaluating the peak at the root | Fails §8 test #5 | Max over **every** node via the running accumulator |
| 4 | Returning a mixed value from recursion (e.g., `return max(left+right, 1+max(left,right))`) | Corrupts ancestors' heights; wrong on nested cases | Return **height only**; the diameter lives in the accumulator (or in the pair's second slot) |
| 5 | Initializing `best = -1` | Returns −1 on a single node | Diameter of one node is 0 → init `best = 0` |
| 6 | Assuming the tree is balanced | Wrong complexity claim; surprise stack depth | Say `O(h)` and know `h` can be `n` |
| 7 | Python `RecursionError` on a skewed 10^4-node tree | Runtime crash | `sys.setrecursionlimit(2*10**4 + 10)` or the iterative version — mention this proactively; it signals maturity |
| 8 | Forgetting the path is simple / trying to allow revisits | Overcomplicated logic | In a tree, any simple up-then-down walk is automatically simple; don't over-engineer |

### 7.1 Implementation Gotchas in Java / C++ (and Python)

| Language | Gotcha | Fix |
|---|---|---|
| Python | Assignment to `best` inside the nested function makes it local → `UnboundLocalError` | `nonlocal best`, or `self.best`, or `best = [0]` |
| Python | Default recursion limit ≈ 1000 < possible depth 10^4 | Raise the limit or go iterative (§5.6) |
| Java | No pass-by-reference for `int`; a local accumulator can't be mutated by the helper | Instance field — but **reset it at the top of `diameterOfBinaryTree`** so a reused object doesn't leak state between calls: |

```java
class Solution {
    private int best = 0;

    public int diameterOfBinaryTree(TreeNode root) {
        best = 0;                      // reset: guards against object reuse
        depth(root);
        return best;
    }
    private int depth(TreeNode node) {
        if (node == null) return 0;
        int l = depth(node.left), r = depth(node.right);
        best = Math.max(best, l + r);
        return 1 + Math.max(l, r);
    }
}
```

| Language | Gotcha | Fix |
|---|---|---|
| C++ | Helper taking `int best` **by value** compiles fine and silently returns 0 forever | `int& best` parameter, or a member variable; same "reset before use" hygiene as Java |
| C++/Java | Deep recursion (10^4 frames) | Fine with default stacks for this frame size, but say it out loud; don't claim `O(1)` space |

## 8. Tests to Propose Out Loud

Say these **before coding** (it shapes the design) or immediately after (as verification). Minimum set:

| # | Input (level-order) | Expected | What it catches |
|---|---|---|---|
| 1 | `[1,2,3,4,5]` | `3` | Official example; bend at 2 and at 1 |
| 2 | `[1,2]` | `1` | Official minimal; one edge |
| 3 | `[1]` | `0` | Single node; kills node-counting and `best=-1` bugs |
| 4 | `[1,2,null,3,null,4,null,5]` (left chain, 5 nodes) | `4` | Skewed tree: answer is `n−1`; also the recursion-depth stress case |
| 5 | `[1,2,null,3,4,5,6,7,8]` (fork under the left child, root has **no** right child) | `4` (path 5→3→2→4→7) | Diameter **entirely inside one subtree** — the root's own candidate is only 3, so root-only logic fails |
| 6 | `[-100,-100,-100,-100,-100]` shaped like Example 1 | `3` | Values (even extreme/negative ones) are irrelevant; duplicates harmless |

For #5, verify against the algorithm: `depth(2)` returns node-height 3 with children heights 2 and 2 → candidate `4` at node 2; the root's candidate is `3 + 0 = 3`; global max `4` ✓.

## 9. Transferable Patterns and Related Problems

**The pattern, named:** *Subtree DP with a running global answer* — one post-order pass returns a per-subtree quantity (usually height or a "best extendable gain") while a mutable accumulator tracks the problem's true answer, which is a max over **per-node local formulas** built from the children's returned values.

Direct siblings (same skeleton, different local formula):

| Problem | Local formula at `u` | Twist vs. diameter |
|---|---|---|
| **LC 124 — Binary Tree Maximum Path Sum** | `u.val + maxGain(l, 0) + maxGain(r, 0)` | Values matter; clamp negative arms to 0; return `maxGain = u.val + max(0, best child)` upward |
| **LC 110 — Balanced Binary Tree** | balance check on `|lh − rh|` | Track a boolean/global instead of a max |
| **LC 687 — Longest Univalue Path** | extend an arm only through children with **equal values** | Peak formula uses conditional arm lengths |
| **LC 1526 — Diameter of N-ary Tree** | sum of the **two largest** child heights | "left + right" generalizes to "top-2 of k children" |
| **LC 2246 — Longest Path With Different Adjacent Characters** | same top-2 idea over a parent-array tree, gated by character equality | Tree given as `parent[]`, not nodes |

**Broader takeaways:**

- **Peak/LCA decomposition:** any root-to-leaf-ish "path" quantity can be scored per node as *best arm into left + best arm into right*; every path is counted exactly once at its peak.
- **k-ary generalization:** diameter = sum of the two largest child-heights (keep top-2 in one pass).
- **Edge vs. node metrics:** decide the convention once; most such problems differ by exactly ±1.
- **Follow-up "return the actual path":** during the DFS also record, per node, *which* descendant achieves each arm's farthest distance (or store parent pointers and run a second search from the farthest node found); reconstruct at the end. Mention it; implement only if asked.
- **If the input were a general unweighted graph that happens to be a tree** (adjacency list, no root): use the double-BFS/DFS diameter trick from §6 — `O(n)`, two passes.

## 10. Full Talk Track (≈2 minutes, spoken)

> "Let me restate: I need the longest path between any two nodes, measured in **edges**, and the path doesn't have to go through the root, so I can't just combine the two root subtrees and stop.
>
> Here's my framing: every path in a tree has a unique highest node — the point where it stops going up and starts going down. If I fix that peak at node `u`, the best path through that peak is: farthest node down the left side, plus `u`, plus farthest node down the right side. That's the left subtree's height plus the right subtree's height, in edges. Since every path has exactly one peak, the diameter is just the max of that quantity over **all** nodes.
>
> The naive way computes each node's subtree height from scratch, which re-walks subtrees repeatedly — `O(n·h)`, quadratic on a chain. The insight is that a post-order height computation *already* visits every node and *already* has both children's heights on the return trip. So I fuse them: one DFS returns the height, and on the way back up I update a running best with `leftHeight + rightHeight`.
>
> One detail I'm careful with: I'll define height in **nodes** — a leaf is 1 — so that `left + right` comes out as exactly the **edge count** of the path through that node, and a single-node tree gives 0 with no special-casing.
>
> That's `O(n)` time — each node touched once — and `O(h)` space for the recursion, which is `O(n)` if the tree is a skewed chain. Since n can be 10^4, in Python I'd bump the recursion limit or use an explicit-stack post-order to be safe.
>
> Tests I'd run: both official examples; a single node → 0; a straight chain → n−1; and a tree where the longest path hides entirely inside one subtree and never touches the root — that's the case my per-node max exists for."

## 11. Say It in 60 Seconds

> "Longest path between any two nodes, counted in **edges**, and it doesn't have to pass through the root. Brute force: for each node, the longest path bending there is left height plus right height — but recomputing heights per node is quadratic. The insight: a post-order height walk already touches every node, so on the way back up, treat each node's left-height plus right-height as a candidate diameter and keep a running max. I return height in **node counts**, so `left + right` naturally equals the **edge count** — that kills the off-by-one, and a lone node gives zero. One DFS: `O(n)` time, `O(h)` space. Three traps: edges not nodes, the path can avoid the root entirely, and in Python a skewed 10^4-node tree can blow the recursion limit — so I'd raise the limit or go iterative. Tests: both examples, a single node, a straight chain, and a tree whose diameter lives inside one subtree."
