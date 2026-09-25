# Maximum Depth of Binary Tree — Complete Lesson

## 1. Problem restatement (in your own words)

Given the root of a binary tree, return the **number of nodes** on the longest root-to-leaf path. If the tree is empty (`root == null`), the answer is **0**; a single node has depth **1**.

Two definitional traps to settle out loud before coding:

- **Nodes, not edges.** This problem counts nodes on the path (single node → 1). Many textbooks define "height" in *edges* (single node → 0). Same computation, different off-by-one. Say the convention you're using.
- **Structure, not values.** The answer depends only on the child pointers. Node values (including duplicates, zeros, negatives) are pure decoration here.

## 2. Decoding the constraints and the input format

| Constraint | What it actually tells you |
|---|---|
| `0 <= n <= 10^4` | The tree may be **empty** → you must handle `root == None` and return 0. Also, a fully skewed tree has depth 10⁴ → recursion-depth matters in Python (see §8). |
| `-100 <= Node.val <= 100` | Values are irrelevant to the answer; duplicates are legal; **0 is a valid node value**, so never branch on the truthiness of `val`. |
| It's a *binary* tree | The recurrence has exactly two subproblems: `left` and `right`. |
| Answer ≤ 10⁴ | Fits trivially in any integer type — overflow is a non-issue (unlike path-*sum* problems). |

### 2.1 Indices vs. values: how the array is really decoded

`[3,9,20,null,null,15,7]` is **level-order serialization**, *not* heap indexing. Children are consumed from the array two at a time, per dequeued node:

```
[3, 9, 20, null, null, 15, 7]
 i=0: 3        -> root
 i=1,2: 9, 20  -> children of 3
 i=3,4: null,null -> children of 9 (none)
 i=5,6: 15, 7  -> children of 20
```

```
      3
     / \
    9   20
       /  \
      15   7
```

The heap formula "children of `i` live at `2i+1`, `2i+2`" **breaks once nulls appear**. Counter-example: `[1,null,2,3]` decodes to `1` with right child `2`, and `2` with left child `3` (depth 3) — but heap indexing would claim node `3` is the child of the *null* at index 1. When the problem says "root = [1,null,2]" and the answer is 2, that 2 is a **count of nodes**, not an index.

Also: nodes are distinct **objects identified by reference**. Two nodes both holding `val = 1` are different nodes; nothing in this problem matches, deduplicates, or indexes by value.

## 3. Brute force: enumerate every root-to-leaf path

The most literal reading of the definition: walk **every** root-to-leaf path with a backtrack buffer, and take the longest length.

```python
class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        best = 0
        path = []                     # holds node.val along the current root-to-node path

        def dfs(node):
            nonlocal best
            if node is None:
                return
            path.append(node.val)
            if node.left is None and node.right is None:   # leaf: path is complete
                best = max(best, len(path))
            dfs(node.left)
            dfs(node.right)
            path.pop()                                      # backtrack

        dfs(root)
        return best
```

### Worked trace on Example 1 — `[3,9,20,null,null,15,7]`

| Step | Action | `path` after | Leaf? | `best` |
|---|---|---|---|---|
| 1 | enter 3, push | `[3]` | no | 0 |
| 2 | enter 9, push | `[3,9]` | **yes** → record 2 | 2 |
| 3 | exit 9, pop | `[3]` | | 2 |
| 4 | enter 20, push | `[3,20]` | no | 2 |
| 5 | enter 15, push | `[3,20,15]` | **yes** → record 3 | 3 |
| 6 | exit 15, pop | `[3,20]` | | 3 |
| 7 | enter 7, push | `[3,20,7]` | **yes** → record 3 | 3 |
| 8–10 | pop 20, pop 3 | `[]` | | **3** ✓ |

Correct, but notice the waste: we carry the **entire path** when we only need its **length**. Two complexity notes:

- The walk itself is `O(n)` time (each node entered/exited once), `O(h)` auxiliary.
- **The hidden trap:** if you materialize each path at its leaf (`best_path = path.copy()`), total time becomes the sum of all leaf depths, which is Θ(n²) in the worst case — a "broom" tree (a chain of n/2 nodes with n/2 leaf siblings on top) puts n/2 leaves at depth n/2, so copying costs (n/2)·(n/2) = Θ(n²). At n = 10⁴ that's ~25M element copies for nothing. Track the *length*, not the path.

(An even more wasteful strawman — recomputing each node's subtree depth from scratch — costs `O(n·h)` since every node rescans its whole subtree. The path-walk above already avoids that; the real fix is the insight below.)

## 4. The core insight

The problem is **self-similar**: the depth of a tree is *defined* by the depths of its subtrees.

> **depth(t) = 0 if t is null, else 1 + max(depth(t.left), depth(t.right))**

- A leaf: `1 + max(0, 0) = 1` ✓
- Any internal node: one more than its deeper child ✓

So the answer is a **post-order fold**: compute both children's answers bottom-up, combine in O(1), return. No path buffer, no global state, no memoization — in a tree, subproblems never overlap (each subtree is reached through exactly one parent), so memoization would only add overhead; the "DP memo table" idea from grid/DAG problems does not apply here.

One more subtlety worth saying aloud: **you can't prune**. Unlike balanced-check (which can short-circuit on imbalance), exact max depth needs *both* children's exact depths, because either side could be the deeper one.

## 5. Optimal solution #1 — bottom-up recursion (the one to write first)

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        if root is None:
            return 0
        return 1 + max(self.maxDepth(root.left),
                       self.maxDepth(root.right))
```

(`root is None` vs `not root`: both work — a `TreeNode` is always truthy — but `is None` states intent. Never write `not node.val`; `val = 0` is a legal node.)

### Trace on Example 1 — `[3,9,20,null,null,15,7]`

```
maxDepth(3)
├─ maxDepth(9)
│  ├─ maxDepth(None) → 0
│  └─ maxDepth(None) → 0
│  ⇒ 1 + max(0,0) = 1                      (leaf)
└─ maxDepth(20)
   ├─ maxDepth(15) → 1                     (leaf)
   └─ maxDepth(7)  → 1                     (leaf)
   ⇒ 1 + max(1,1) = 2
⇒ 1 + max(1,2) = 3  ✓
```

### Trace on Example 2 — `[1,null,2]`

```
maxDepth(1)
├─ maxDepth(None) → 0        (left child absent)
└─ maxDepth(2)
   ├─ maxDepth(None) → 0
   └─ maxDepth(None) → 0
   ⇒ 1
⇒ 1 + max(0,1) = 2  ✓
```

Note how Example 2 is exactly the case that punishes a missing null base case: without `if root is None: return 0`, you'd call `maxDepth(None).left` and crash.

## 6. Optimal solution #2 — BFS level counting (iterative, no recursion)

Depth *is* the number of levels. Process the queue **one whole level per outer iteration**:

```python
from collections import deque

class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        if root is None:
            return 0
        q = deque([root])
        depth = 0
        while q:
            for _ in range(len(q)):      # snapshot: evaluated ONCE, before the loop
                node = q.popleft()
                if node.left:  q.append(node.left)
                if node.right: q.append(node.right)
            depth += 1
        return depth
```

Trace on Example 1:

| Level | Queue at start | Processed | Enqueued | `depth` after |
|---|---|---|---|---|
| 1 | `[3]` | 3 | 9, 20 | 1 |
| 2 | `[9, 20]` | 9, 20 | 15, 7 | 2 |
| 3 | `[15, 7]` | 15, 7 | — | 3 → return **3** ✓ |

The Python idiom `for _ in range(len(q))` is safe *because* `range(len(q))` is evaluated once — appends during the loop don't extend it. (Java behaves differently — see §8.)

## 7. Optimal solution #3 — top-down accumulator (the pattern worth knowing)

The "mirror" recursion shape: carry state **down** from the parent instead of returning values **up**.

```python
class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        best = 0
        def dfs(node, depth):          # depth = depth of `node` (root => 1)
            nonlocal best
            if node is None:
                return
            best = max(best, depth)
            dfs(node.left,  depth + 1)
            dfs(node.right, depth + 1)
        dfs(root, 1)                   # handles empty tree too: dfs(None,1) returns, best=0
        return best
```

Same `O(n)`/`O(h)`, but this shape generalizes to problems where you need *ancestors' context* (max-so-far on a path, Count Good Nodes 1448), whereas bottom-up generalizes to problems needing *descendants' answers* (diameter 543, max path sum 124).

### Complexity table

Let `h` = height (in the node-count convention), `n` = nodes. `h` ranges from `⌈log₂(n+1)⌉` (a tree of height `h` holds at most `2^h − 1` nodes, so `n ≤ 2^h − 1` forces this) up to `n` (a chain).

| Approach | Time | Auxiliary space | Worst-case space | Notes |
|---|---|---|---|---|
| Path-enumeration brute force | `O(n)` walk; **Θ(n²)** if paths are copied at leaves | `O(h)` | `O(n)` | copying cost = sum of leaf depths (broom tree) |
| Bottom-up recursion | `O(n)` | `O(h)` call stack | `O(n)` (skewed) | 4 lines; the interview default |
| Top-down accumulator | `O(n)` | `O(h)` | `O(n)` | generalizes to path-state problems |
| BFS level count | `O(n)` | `O(w)` queue width | ~`O(n)` (a complete tree's bottom level holds ~n/2 nodes) | immune to recursion limits |

**Time recurrence:** `T(n) = T(L) + T(R) + O(1) → O(n)`. **Optimality:** this `O(n)` matches a trivial adversarial lower bound — an algorithm that never reads some node `x` cannot distinguish the input from the same tree with a long chain hanging under `x` (different answer, identical observations), so every node must be examined and Ω(n) time is unavoidable.

## 8. Language gotchas (Python, Java, C++)

| Language | Gotcha | Fix / note |
|---|---|---|
| **Python** | CPython's default recursion limit is **1000**; a skewed 10⁴-node tree needs 10⁴ frames. LeetCode's judge accepts recursion here (it runs with a raised limit), but stock CPython raises `RecursionError`. | `sys.setrecursionlimit(10**4 + 10)`, or prefer the BFS/iterative version outside the judge. |
| **Python** | Habit-risk: branching on value truthiness. `val = 0` and negatives are legal nodes. | Branch on `node is None`, never on `node.val`. |
| **Java** | BFS level loop `for (int i = 0; i < q.size(); i++)` re-evaluates `size()` while you `poll`/`offer` → miscounts levels (Python's `range(len(q))` snapshot does not). | Capture `int sz = q.size();` before the loop; use `ArrayDeque` over legacy `Stack`/`LinkedList`. |
| **Java** | Using `Integer` for the running max/depth → autoboxing garbage and unboxing NPE risk. | Use plain `int`. Overflow is impossible here (depth ≤ 10⁴). |
| **C++** | `root->left` without a null check is UB — no exception, it may "seem to work." | `if (!root) return 0;` guard first. |
| **C++** | 10⁴ tiny recursion frames are fine on default stacks, but heavy by-value parameters per frame multiply stack use. | Pass `TreeNode*` by value (cheap); never pass containers down the recursion. |

## 9. Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Counting **edges** instead of nodes | `[1]` returns 0; Example 2 returns 1 | Anchor conventions: empty → 0, single node → 1 |
| Missing `null` base case | `AttributeError`/`NoneType` crash / NPE / segfault on `[1,null,2]` | Base case `depth(None) = 0` before touching children |
| `1 + left + right` instead of `1 + max(left, right)` | Example 1 returns 4 instead of 3 | It's a **max** fold, not a sum |
| Using value truthiness (`if node.val`, `if not node.val`) | Silent wrong answers when `val = 0` | Only structure matters; check `is None` |
| Assuming heap indexing `2i+1 / 2i+2` on the input array | Wrong tree built when nulls are present (e.g., `[1,null,2,3]`) | Decode level-order: children consumed per dequeued node |
| BFS: incrementing depth **per node** instead of **per level** | Example 1 returns 7 | One `depth += 1` per whole-level drain |
| Snapshotting paths at every leaf in brute force | Θ(n²) time (broom tree) | Track lengths, not paths |
| Forgetting the empty tree | Crash or wrong answer on `root = []` | `n` can be 0 per constraints |
| Asserting "depth = height" without stating the convention | Interviewer marks you down on an off-by-one | Say "node-count convention, single node = 1" |

## 10. Test cases to propose out loud

State these before or right after coding — it signals rigor:

| Input | Expected | What it checks |
|---|---|---|
| `[3,9,20,null,null,15,7]` | 3 | Official; non-trivial on both sides |
| `[1,null,2]` | 2 | Official; missing left child exercises the null base case |
| `[]` | 0 | Empty tree (`n = 0` is allowed) |
| `[0]` | 1 | Single node **with value 0** — catches value-truthiness bugs |
| `[1,2]` | 2 | Minimal two-node tree, left side |
| `[1,null,2,null,3]` | 3 | Right-skewed chain — asymmetry, recursion depth |
| `[5,5,5,5,5,5,5]` | 3 | All-duplicate values; proves values are irrelevant |
| chain of 10⁴ nodes | 10⁴ | Stress: Python recursion limit; motivate BFS fallback |

## 11. Transferable patterns and related problems

**Patterns this problem teaches:**

1. **Bottom-up tree fold (divide & conquer):** answer(tree) = combine(answer(left), answer(right)) in O(1). The workhorse for half of all tree problems.
2. **Top-down accumulator:** pass context downward + maintain a global best. Choose it when a node needs *ancestral* information.
3. **BFS level-by-level:** when the answer is naturally "per level" (depth, right-side view, averages).
4. **Height as a subroutine with early abort:** for balance checks you can return a sentinel (−1) the moment a subtree is invalid — max depth itself admits no pruning, but its siblings do.

| Related problem | Relationship to 104 | Twist to watch |
|---|---|---|
| 111. Minimum Depth of Binary Tree | Swap max→min? **No** — a node with one child must descend through that child; `min(0, child)` wrongly returns 1 | Leaf-to-leaf definition |
| 110. Balanced Binary Tree | Height fold + `\|left − right\| ≤ 1`, with −1 sentinel short-circuit | Pruning trick |
| 543. Diameter of Binary Tree | At each node combine `left`+`right` heights into a candidate | Fold upward, update global |
| 124. Binary Tree Maximum Path Sum | Same fold shape, but values matter (negatives → clamp with `max(0, …)`) | Overflow care in Java/C++ |
| 559. Maximum Depth of N-ary Tree | `1 + max(children depths)` over a list | Generalize the binary pair |
| 199 / 637 (Right Side View, Level Averages) | The BFS level-loop template verbatim | Level snapshots |
| 1448. Count Good Nodes | Top-down accumulator carrying max-so-far | Pattern twin |
| 2385. Amount of Time for Binary Tree to Be Infected | Height/distances computed from an arbitrary start node | Same fold, redirected root |

## 12. Full interview talk track (the script to compress later)

> **Clarify (20s):** "Depth counts *nodes* on the path, right — so an empty tree is 0 and a single node is 1? And since n can be 0, I'll handle a null root. Values look irrelevant; I only need structure."
>
> **Insight (20s):** "The key observation is self-similarity: a tree's depth is 1 plus the deeper of its two subtree depths, with null counting as 0. That's a post-order fold — I need both children's answers before answering myself, and there's no valid pruning since either side could be deeper."
>
> **Code (60s):** Write the 4-liner. Narrate the null base case first.
>
> **Dry run (30s):** "On Example 1: leaves return 1, node 20 returns 2, the root returns 3. On Example 2, the missing left child returns 0, so the root returns 2."
>
> **Complexity (30s):** "O(n) time — recurrence T(n) = T(l) + T(r) + 1, each node visited once. O(h) space for the call stack, which is O(n) worst case on a chain. That's optimal: skipping any node is unsafe, since a chain could hang beneath it."
>
> **Edges (20s):** "Empty tree → 0, single node → 1, skewed chains, duplicate values. One caveat: in plain Python a 10⁴-deep chain exceeds the default recursion limit of 1000, so in production I'd use the BFS variant that counts levels — same O(n)."

## 13. Say it in 60 seconds

> "Restating: max depth is the number of nodes on the longest root-to-leaf path — so an empty tree is 0 and a single node is 1; we count nodes, not edges, and values are irrelevant. The key insight is that the problem is self-similar: a tree's depth is one plus the deeper of its two subtree depths, with null counting as zero. That gives a four-line post-order recursion — base case null returns 0, otherwise 1 plus the max of the two recursive calls. It visits every node exactly once: O(n) time, O(h) stack space, O(n) worst case on a skewed chain. That's optimal, since any algorithm must inspect every node — an unread node could hide a longer path below it. I'd verify on the examples, and call out the edge cases: empty tree, single node, and a 10⁴-node chain, which in plain Python would blow the default recursion limit of 1000 — so if stack depth is a concern, I'd swap in a BFS that counts levels, same O(n) time and no recursion."
