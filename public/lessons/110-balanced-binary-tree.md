# Balanced Binary Tree — Complete Interview Lesson (LeetCode 110)

## 1. Problem restatement

You're given the **root of a binary tree** (possibly `None`). Return `true` if the tree is **height-balanced**, defined as: **for every node `x` in the tree**, the heights of `x`'s left and right subtrees differ by at most 1.

Two precision points you should verbalize in the interview:

- **"Every node" — not just the root.** The single most common wrong solution checks only the root's two subtree heights. The definition quantifies over *all* nodes.
- **Height convention doesn't change the answer.** Whether you measure height in *nodes on the longest downward path* (empty = 0, leaf = 1) or in *edges* (empty = −1, leaf = 0), every tree's height shifts by exactly 1, so `|h_L − h_R|` is identical either way. Pick one, stay consistent — this matters for the sentinel trick later (§5).

**Reading the input (indices vs. values).** The bracketed list is a *level-order (BFS) serialization*: the node at index `i` has its children at indices `2i+1` and `2i+2`; `null` entries are placeholders that own no children. In Example 2, `[1,2,2,3,3,null,null,4,4]`, the two `2`s are **two different nodes** that happen to share a value. Identity is positional. And since balance is purely structural, **`Node.val` is never read** by any correct solution.

Example 2 unpacked:

```
        1
       / \
      2   2        (heights shown in node-count convention)
     / \
    3   3
   / \
  4   4
```

`height(2_left) = 3`, `height(2_right) = 1` → difference 2 at the root → `false`.

## 2. Constraint decoding

| Constraint | What it actually tells you |
|---|---|
| `0 <= n <= 5000` | **The empty tree is an official case** → `root = None` must return `true` (vacuously: "every node…" holds when there are no nodes). Also: an O(n²) brute force is ~12.5M node visits at worst — it *passes*. The O(n) solution is about interview signal, not about passing. |
| `-10^4 <= Node.val <= 10^4` | Values are a red herring — balance is structural only. Also: max height is 5000, so heights fit trivially in a 32-bit `int`; **no overflow risk anywhere in this problem** (unlike path-sum problems). |
| Tree may be a single skewed chain | Recursion depth can reach `n = 5000`, which **exceeds Python's default recursion limit (~1000)**. Know the iterative fallback (§5.3) or `sys.setrecursionlimit`. LeetCode's runner raises the limit, but a local run or a strict interviewer may not. |
| Duplicates allowed | Irrelevant here (no value-based logic), but a good habit to say: "node identity is positional, never by value." |

## 3. Brute force: re-measure heights from the top

### Idea

A tree is balanced iff **every node is locally balanced**: `|height(left) − height(right)| <= 1`. So traverse the whole tree; at each node, *freshly* compute both subtree heights with a standard depth recursion, and combine.

```python
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def height(node: Optional[TreeNode]) -> int:
            if node is None:
                return 0                       # node-count convention: empty = 0
            return 1 + max(height(node.left), height(node.right))

        def check_all(node: Optional[TreeNode]) -> bool:
            if node is None:
                return True
            ok_here = abs(height(node.left) - height(node.right)) <= 1
            left = check_all(node.left)
            right = check_all(node.right)      # deliberately no early exit
            return ok_here and left and right

        return check_all(root)
```

### Worked trace — Example 1: `[3,9,20,null,null,15,7]`

```
      3
     / \
    9   20
        / \
      15   7
```

| Call | What it does | Node/null visits | Returns |
|---|---|---|---|
| `check_all(3)` → `height(9)` | walks 9, ∅, ∅ | 3 | 1 |
| `check_all(3)` → `height(20)` | walks 20; 15,∅,∅; 7,∅,∅ | 7 | 2 |
| local check at 3 | `|1 − 2| = 1` ✓ | — | pass |
| `check_all(9)` | two `height(∅)` | 2 | True |
| `check_all(20)` | `height(15)` (3 visits), `height(7)` (3 visits) | 6 | True |
| `check_all(15)`, `check_all(7)` | two `height(∅)` each | 2 + 2 | True |

**Total: 22 node/null visits for a 5-node tree.** The optimal single bottom-up pass touches 11 (5 nodes + 6 null slots). That's already ~2× redundancy at `n = 5`.

### Worked trace — Example 2: `[1,2,2,3,3,null,null,4,4]`

- `check_all(1)`: `height(left)` walks the whole `{2,3,3,4,4}` block → 3; `height(right)` → 1. `|3 − 1| = 2 > 1` → `ok_here = False`.
- Because there's no early exit, we *still* recurse into both subtrees and re-measure everything below. Output: `false` ✓. Note `height(3_left)` gets computed twice (once inside `height(2_left)`, once for `check_all(2_left)`), and each leaf `4`'s height is measured three times.

### Complexity of the brute force

- **Time: O(n²) worst case.** Justification: the balance check at node `v` costs Θ(|subtree(v)|) because `height` re-walks the subtree; summed over all nodes on a skewed chain this telescopes to `n + (n−1) + … + 1 = n(n+1)/2 = Θ(n²)` — about **12.5M visits at n = 5000**, versus ~10,000 for one pass. Even on perfectly bushy trees the redundancy is Θ(n log n), because every node's check re-measures its entire subtree (sum of subtree sizes over a balanced tree is Θ(n log n)).
- **Space: O(h)** recursion stack, `h` = height; O(n) worst on a chain.

With `n ≤ 5000` this runs instantly — you optimize it *to show insight*, and because the real interview question is the follow-up: *"can you do it in one pass?"*

## 4. The core insight

Three observations, each worth saying out loud:

1. **Balance is locally decidable.** Whether node `v` is balanced depends only on the pair `(h_L, h_R)` — an O(1) check once you know the children's heights.
2. **Height is also locally computable:** `h(v) = 1 + max(h_L, h_R)`.
3. Therefore **one post-order (bottom-up) traversal can compute heights and verify balance simultaneously.** Each subtree's height is computed *exactly once*, at its own root, and consumed by its parent. Every node does O(1) work after its children answer → **O(n) total**.

Add one refinement — **early termination**: the moment any subtree is found unbalanced, the whole answer is `false` no matter what sits above. So propagate a failure signal upward and stop doing work. Encode it either as a sentinel return value (`-1` = "unbalanced") or as an explicit `(bool, height)` pair. The pair is more portable and avoids the sentinel-collision trap below.

This is the canonical **"bottom-up tree DP: children answer first, parent combines in O(1)"** pattern — the same skeleton as Diameter, Max Path Sum, and Validate BST.

## 5. Optimal solution: one bottom-up pass

### 5.1 Primary implementation — explicit `(is_balanced, height)` pair

```python
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        # Returns (is_subtree_balanced, height_in_nodes); empty subtree = (True, 0).
        def check(node: Optional[TreeNode]) -> tuple[bool, int]:
            if node is None:
                return True, 0
            left_ok, lh = check(node.left)
            if not left_ok:                # early exit: right child cannot fix this
                return False, 0
            right_ok, rh = check(node.right)
            if not right_ok:
                return False, 0
            return abs(lh - rh) <= 1, 1 + max(lh, rh)

        return check(root)[0]
```

Notes on the code:

- The `if not left_ok: return False, 0` lines are what make the "unbalanced high in the tree" case fast — we never even descend into the right sibling.
- The height packed into the `False` result is a don't-care (`0`); discipline: never do arithmetic on a height after a failed check.
- The final `check(root)[0]` — **not** `return check(root)`, which would return a (always-truthy) tuple.

### 5.2 Compact variant — the `-1` sentinel

```python
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        UNBALANCED = -1   # safe HERE because height(None) = 0, so -1 is impossible

        def height(node: Optional[TreeNode]) -> int:
            if node is None:
                return 0
            lh = height(node.left)
            if lh == UNBALANCED:
                return UNBALANCED
            rh = height(node.right)
            if rh == UNBALANCED:
                return UNBALANCED
            if abs(lh - rh) > 1:
                return UNBALANCED
            return 1 + max(lh, rh)

        return height(root) != UNBALANCED
```

⚠️ **Sentinel-collision gotcha:** this trick *only* works with the node-count convention (`height(None) = 0`). If you use the edge-count convention (`height(None) = -1`), a legitimate empty subtree and the "unbalanced" signal collide — every tree with a `None` child would look unbalanced. Under edge-count you'd need `-2`, or just use the tuple version. This is a real bug people ship.

### 5.3 Iterative version (for deep/skewed trees)

Explicit-stack post-order with a node→height map:

```python
def isBalanced(root: Optional[TreeNode]) -> bool:
    height = {None: 0}
    stack = [(root, False)]
    while stack:
        node, expanded = stack.pop()
        if node is None:
            continue
        if expanded:
            lh, rh = height[node.left], height[node.right]
            if abs(lh - rh) > 1:
                return False                    # bail out immediately
            height[node] = 1 + max(lh, rh)
        else:
            stack.append((node, True))          # revisit after children are done
            stack.append((node.left, False))
            stack.append((node.right, False))
    return True
```

Same O(n)/O(h) complexity; removes any dependence on the interpreter's recursion limit.

### Traces of the optimal solution on the official examples

**Example 1** — `[3,9,20,null,null,15,7]`, post-order order: 9 → 15 → 7 → 20 → 3.

| Step | Node | Children give | Local check | Returns |
|---|---|---|---|---|
| 1 | 9 | (∅,0), (∅,0) | diff 0 ✓ | (True, 1) |
| 2 | 15 | 0, 0 | ✓ | (True, 1) |
| 3 | 7 | 0, 0 | ✓ | (True, 1) |
| 4 | 20 | (T,1), (T,1) | diff 0 ✓ | (True, 2) |
| 5 | 3 | (T,1), (T,2) | diff 1 ✓ | (True, 3) |

`check(root) = (True, 3)` → **true** ✓. Total touches: 5 nodes + 6 null slots = 11.

**Example 2** — `[1,2,2,3,3,null,null,4,4]`, post-order: 4, 4, 3, 3, 2, 2, 1.

| Step | Node | Children give | Local check | Returns |
|---|---|---|---|---|
| 1–2 | 4, 4 | 0, 0 | ✓ | (True, 1) |
| 3 | 3 (left) | (T,1), (T,1) | ✓ | (True, 2) |
| 4 | 3 (right, leaf) | 0, 0 | ✓ | (True, 1) |
| 5 | 2 (left) | (T,2), (T,1) | diff 1 ✓ | (True, 3) |
| 6 | 2 (right, leaf) | 0, 0 | ✓ | (True, 1) |
| 7 | 1 | (T,3), (T,1) | **diff 2 ✗** | (False, ·) |

→ **false** ✓.

**Example 3** — `root = []` → `check(None)` → `(True, 0)` → **true** ✓. (Vacuous truth: "every node…" with zero nodes.)

## 6. Complexity table

| Approach | Time | Auxiliary space | Notes |
|---|---|---|---|
| Brute force (re-measure per node) | O(n²) worst | O(h) stack | Passes at n ≤ 5000; fails the "one pass?" follow-up |
| **Bottom-up single pass (tuple or sentinel)** | **Θ(n)** | O(h) stack — O(log n) balanced, O(n) skewed | The expected answer |
| Iterative bottom-up | Θ(n) | O(h) explicit stack | Same bounds, no recursion-limit risk |

Two bound remarks worth being able to defend:

- **Θ(n) is optimal (Ω(n) lower bound):** an adversary can flip the answer by changing one unvisited node deep in the tree, so any correct algorithm must be able to read all `n` nodes in the worst case.
- **Why "balanced" implies short stacks:** a height-balanced tree of height `h` has at least `N(h) = N(h−1) + N(h−2) + 1` nodes (the minimal such tree recursively packs two minimal subtrees of heights `h−1` and `h−2`), which is Fibonacci growth — so `h = O(log n)` and the stack is O(log n) on any *balanced* input; only *unbalanced* inputs can push the stack toward O(n).

## 7. Common mistakes

1. **Checking only the root.** Test that kills it: `[1,2,2,3,null,3,3,null,4]` — the root's subtree heights are 3 and 2 (diff 1, passes), but the left node `2` has children of heights 2 and 0 → answer is `false`. This is *the* canonical bug for this problem.
2. **Forgetting the `+1` when merging heights** (`return max(lh, rh)`). With the empty-height baseline at 0, every height collapses to 0 and *every* tree reports balanced. Sneaky because the code "runs."
3. **Sentinel collision.** Returning `-1` for "unbalanced" while using edge-count heights (`height(None) = -1`) — see §5.2. Use node-count heights, or `-2`, or the tuple.
4. **Missing the empty-tree case** — e.g., writing `return height(root) > 0`, which returns `false` for `[]`. Empty tree → `true`.
5. **Doing arithmetic on a failure sentinel** — e.g., forgetting to check `lh == -1` before computing `max(lh, rh) + 1`, producing garbage heights that can silently mask or fake imbalance.
6. **Mixing conventions mid-solution** — measuring one side in edges and the other in nodes shifts one side by 1 and flips borderline cases (diff-1 nodes look fine-or-broken inconsistently).
7. **Confusing height with depth.** The bottom-up return is *height*. If you find yourself threading a `depth` parameter top-down, you're re-deriving the brute force.
8. **Using values at all** — sorting by `val`, assuming BST properties, deduplicating. Structure only.
9. **No early exit** (correct but weak): after the left subtree reports unbalanced, still measuring the right one. Same asymptotics in the worst case, but it wastes the free win and interviewers notice.

## 8. Language-specific gotchas (beyond Python)

| Language | Gotcha |
|---|---|
| Java | Don't stash heights in `HashMap<TreeNode, Integer>` — you pay boxing of every `int` plus per-node hashing for nothing; a plain `int` return with the `-1` sentinel (node-count heights) is cleaner and faster. |
| Java | Recursion depth 5000 fits comfortably in a default JVM thread stack for this problem, but if you scale the pattern up (path-sum-style problems carrying bigger frames), know the explicit-stack alternative. |
| C++ | Use `std::abs(lh - rh)` on `int` — reaching for `fabs` compiles but silently converts to `double`. Worse: if heights are ever stored in an unsigned type, `lh - rh` **underflows to a huge unsigned value** and every slightly-skewed node reads as unbalanced. |
| C++ | Return `std::pair<bool,int>` (or a tiny struct) **by value**; never return a reference to a local. No memoization map is needed — the bottom-up return already gives each height exactly once. |
| Python | Default recursion limit ~1000 < possible depth 5000. Locally, `sys.setrecursionlimit(100_000)` or use the iterative §5.3 version. Also write `node is None`, not truthiness tricks, to keep None-handling explicit. |

## 9. Test plan — propose these out loud before/while coding

Say: *"Empty tree, single node, a chain, and a case where the root looks fine but something deep is broken."* Then:

| # | Input | Expected | What it exercises |
|---|---|---|---|
| 1 | `[3,9,20,null,null,15,7]` | `true` | Official; diff of exactly 1 is allowed at multiple levels |
| 2 | `[1,2,2,3,3,null,null,4,4]` | `false` | Official; imbalance at the root; duplicate values present |
| 3 | `[]` | `true` | Official; empty tree / `None` handling |
| 4 | `[1]` | `true` | Single node |
| 5 | `[1,2]` | `true` | One missing child — heights 1 and 0, diff 1, still balanced |
| 6 | `[1,2,null,3]` | `false` | Minimal failing tree: 3-node chain; root diff = 2 |
| 7 | `[1,2,2,3,null,3,3,null,4]` | `false` | **Root-level check passes; violation is deep** — kills the "check only the root" bug |
| 8 | left-skewed chain of 5000 nodes | `false` | Stress + recursion-depth sanity (in a plain local run) |

## 10. Transferable patterns and related problems

**The reusable skeleton — "bottom-up tree DP with status + metric":**

```python
def solve(node) -> Summary:          # Summary = (bool_flag, metric) or a sentinel int
    if node is None:
        return BASE_CASE
    L = solve(node.left)             # children answer first
    R = solve(node.right)
    # optional: bail out early if L or R says "already failed"
    return combine(node, L, R)       # O(1) combine → O(n) overall
```

If a per-node property can be decided from *summaries of the children alone*, this pattern turns any re-measurement approach into a single O(n) pass. Watch for the sentinel-vs-base-case collision whenever you pack a flag and a number into one `int`.

| Related problem | What it shares with this one |
|---|---|
| LC 104 Maximum Depth | The plain height recursion this problem fuses a check into |
| LC 111 Minimum Depth | Height recursion with an asymmetry gotcha (min over *non-empty* children) |
| LC 543 Diameter of Binary Tree | Bottom-up height return + a global best updated at each node |
| LC 124 Binary Tree Max Path Sum | Same skeleton; adds "discard negative branches" pruning |
| LC 98 Validate BST | Bottom-up returning `(is_valid, lo, hi)` — status + payload, like our tuple |
| LC 563 Binary Tree Tilt | Per-node O(1) combine over child sums, global accumulator |
| LC 968 Binary Tree Cameras / LC 337 House Robber III | Bottom-up DP where each node returns one of a few *states* |
| LC 236 Lowest Common Ancestor | Post-order where children's answers decide the parent's answer |

**Meta-lessons to carry:** (1) when a definition says "every node," verify at every node, not just the root; (2) if your top-down solution keeps re-deriving the same subtree quantity, invert the recursion direction; (3) pack *status + metric* into the return value and short-circuit on failure.

## 11. Full interview talk track (what to say while coding)

> "A tree is height-balanced if **at every node** the left and right subtree heights differ by at most one — so I need to verify locally at each node, not just at the root. The obvious way is: at each node, measure both subtree heights and compare. That works, but each measurement re-walks the subtree, so ancestors keep re-measuring the same nodes — quadratic in the worst case, on the order of n² on a skewed tree.
>
> The observation that fixes it: a node's balance *and* its height are both computable in O(1) from its children's heights. So I'll traverse **bottom-up, post-order**: each recursive call returns its subtree's height — zero for null — and I fold in a failure signal, minus one, meaning 'something below me is already unbalanced.' Each node combines its two children in constant time, and the sentinel short-circuits all the way up, so we stop working the instant the answer is decided.
>
> Every node is visited exactly once, so it's O(n) time and O(height) stack — logarithmic on balanced trees, linear on a skewed chain, where I'd switch to an explicit-stack version to dodge recursion limits. Empty tree returns true; a single leaf returns true; and my key test is a tree where the root's two sides look fine but a deeper node is off by two."

## 12. Say it in 60 seconds

> "Balanced means every node's left and right subtree heights differ by at most one — every node, not just the root. The naive fix is to measure both subtree heights at each node, but that re-measures the same subtrees once per ancestor — quadratic in the worst case. The insight: a node's height and its balance are both computable in O(1) from its children's answers. So I do one bottom-up post-order pass: each call returns its subtree height, and I use minus one as a sentinel meaning 'already unbalanced below.' The sentinel propagates up and short-circuits, so we quit the moment the answer is known. Each node is touched once — O(n) time, O(height) space, which is O(log n) if the tree is balanced and O(n) on a skewed chain. Edge cases I'd call out: empty tree is true, single node is true, and the trap case is a tree whose root-level heights look fine but where some deeper node is off by two — which is exactly why the check has to happen at every single node."
