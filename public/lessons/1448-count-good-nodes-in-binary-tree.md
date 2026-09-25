# Count Good Nodes in Binary Tree — Complete Interview Lesson

## 1. Problem, restated precisely

Given the root of a binary tree, call a node `X` **good** if every node on the path from the root down to `X` (both endpoints included) has a value **≤ `X.val`**. Equivalently:

> `X` is good ⟺ `X.val ≥ max(values of all strict ancestors of X)`

Return **the number of good nodes** (counting nodes, not distinct values).

Three clarifications worth saying out loud in an interview:

- **Every node is judged**, not just leaves. In Example 1, node `4` is internal and still good.
- **Root is always good**: its path is just itself, so nothing on it is greater than it.
- **Ties are good.** "No node *greater* than `X`" means an ancestor with an **equal** value does not disqualify `X`. Example 2 exists precisely to test this: `node 2 → (3, 3, 2)` is bad because `3 > 2`, but the second `3` in `(3, 3)` **is** good because `3` is not *greater than* `3`. Use `>=`, never `>`.

**Indices vs. values.** The input `[3,1,4,3,null,1,5]` is a level-order (BFS) serialization — array positions are serialization order, not "heap indices" you can blindly trust once `null`s appear (a `null` node consumes its slot but not two child slots). The good/bad decision is made purely on **values**, and duplicate-valued nodes are distinct nodes: if two different nodes both hold `3` and both qualify, they contribute **2** to the answer.

```
Example 1: [3,1,4,3,null,1,5]          Example 2: [3,3,null,4,2]

        3                                  3
       / \                                /
      1   4                              3
     /   / \                            / \
    3   1   5                          4   2
```

---

## 2. Decoding the constraints

| Constraint | What it actually tells you |
|---|---|
| `1 ≤ n ≤ 10^5` | Root is never null (still add a cheap guard). Target complexity is **O(n)**. A per-node path rescan is `O(n·h)` → on a skewed tree `h = n`, giving ~`n²/2 ≈ 5×10^9` operations → TLE. Also: recursion depth can reach `10^5` — a **Python recursion-limit hazard** (default limit is 1000). |
| `-10^4 ≤ node.val ≤ 10^4` | **Negative values exist** → initialize the running max to `-∞` (or `-10^4 - 1`), **never `0`**. Values are small ints, so counts (`≤ 10^5`) and any int max-sentinel fit comfortably in 32 bits — no overflow risk. Duplicates are allowed → comparison must be `>=`. |
| Binary tree, **not a BST** | There is no ordering guarantee between parent and child. You cannot prune a subtree because its root is "bad" — a bad node's descendant can still be good. |
| It's a tree, not a graph | The root→X path is **unique**. This uniqueness is the load-bearing fact that makes a one-pass solution possible (see §4). |

---

## 3. Baseline: brute force (and why it TLEs)

**Idea:** for each node, materialize the path from the root to it and scan the path to compute its maximum.

```python
# Brute force — correct, but O(n·h): TLEs at n = 1e5 on a skewed tree
class SolutionBrute:
    def goodNodes(self, root: TreeNode) -> int:
        count = 0
        path = []                      # values on the current root→node path, inclusive

        def dfs(node):
            nonlocal count
            if node is None:
                return
            path.append(node.val)
            if node.val >= max(path):  # ← rescan the whole path: the expensive part
                count += 1
            dfs(node.left)
            dfs(node.right)
            path.pop()                 # backtrack when leaving the node

        dfs(root)
        return count
```

### Worked trace on Example 1 (preorder)

| Order | Node | Path (root → node) | `max(path)` | `node.val >= max?` | Good? |
|---|---|---|---|---|---|
| 1 | `3` (root) | `[3]` | 3 | 3 ≥ 3 ✓ | yes |
| 2 | `1` (L) | `[3,1]` | 3 | 1 ≥ 3 ✗ | no |
| 3 | `3` (L,L) | `[3,1,3]` | 3 | 3 ≥ 3 ✓ | yes |
| 4 | `4` (R) | `[3,4]` | 4 | 4 ≥ 4 ✓ | yes |
| 5 | `1` (R,L) | `[3,4,1]` | 4 | 1 ≥ 4 ✗ | no |
| 6 | `5` (R,R) | `[3,4,5]` | 5 | 5 ≥ 5 ✓ | yes |

Total = **4** ✓.

**Cost analysis:** the node at depth `d` pays `O(d+1)` for the `max(path)` rescan. Summed over a tree of height `h`: `O(n·h)`, worst case (linked-list tree, `h = n = 10^5`) `Σ d ≈ n²/2 = 5×10^9` comparisons — orders of magnitude past any time budget. **Note the fix hiding in plain sight:** we recompute the path max from scratch, but the path to a child is the path to its parent plus one value — so the max can be updated incrementally. That observation *is* the optimal algorithm.

---

## 4. The core insight

1. **Uniqueness of the path.** In a tree there is exactly one root→X path, so "max on the path to X" is a single well-defined number per node.
2. **It's an incremental (prefix) quantity.** For a child `c` of `p`:
   `pathMax(c) = max(pathMax(p), c.val)` — an O(1) update.
3. So **thread the state down the recursion** instead of recomputing it. This is the tree analog of a running **prefix maximum** in an array scan. Flatten Example 1 in preorder — values `3,1,3,4,1,5`, running max `3,3,3,4,4,5` — and a node is good iff `val ≥ running_max`: ✓✗✓✓✗✓ → 4. The tree version just *branches* the running max, giving each child its own copy.
4. **Why not memoize / DP table?** Because the root→X path is unique, each node is ever reached with exactly **one** value of the state — there are exactly `n` reachable states and **zero overlapping subproblems**. Carrying the state beats caching it.
5. **Why top-down, not bottom-up?** Goodness depends only on **ancestors**, so state flows naturally **downward**. (Contrast: diameter / max-path-sum depend on descendants → state returns upward.) A bottom-up approach would need extra machinery for no benefit.

**Invariant to state explicitly in the interview:** whenever `dfs(node, m)` is called, `m` equals the maximum value among node's **strict ancestors**. Initialize with `-∞` so the root trivially satisfies `root.val ≥ -∞` — i.e., the root is counted for free, and negative values are handled.

---

## 5. Optimal approach: one DFS carrying the path max

**Recurrence.** `count(node, m)` = number of good nodes in the subtree of `node`, given `m` = max over strict ancestors:

```
count(null, m) = 0
count(node, m) = [node.val >= m]
               + count(node.left,  max(m, node.val))
               + count(node.right, max(m, node.val))
```

### Recursive Python

```python
# Optimal: O(n) time, O(h) space
class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        def dfs(node, max_so_far):            # max_so_far = max over strict ancestors
            if node is None:
                return 0
            is_good = 1 if node.val >= max_so_far else 0   # '>=' : ties are good
            new_max = max(max_so_far, node.val)
            return is_good + dfs(node.left, new_max) + dfs(node.right, new_max)

        return dfs(root, float('-inf'))       # root has no ancestors → -inf
```

### Trace on Example 1 — `[3,1,4,3,null,1,5]` → 4

```text
dfs(3, -inf)   3 >= -inf ✓ good ; newMax = 3
├─ dfs(1, 3)   1 >= 3 ✗        ; newMax = 3
│  └─ dfs(3, 3)   3 >= 3 ✓ (tie, still good)
│  → returns 1
├─ dfs(4, 3)   4 >= 3 ✓        ; newMax = 4
│  ├─ dfs(1, 4)   1 >= 4 ✗ → 0
│  └─ dfs(5, 4)   5 >= 4 ✓ → 1
│  → returns 2
→ 1 + 1 + 2 = 4 ✓
```

### Trace on Example 2 — `[3,3,null,4,2]` → 3

```text
dfs(3, -inf)  ✓ good (root)            ; newMax = 3
└─ dfs(3, 3)  3 >= 3 ✓  ← duplicate passes only because of '>='  ; newMax = 3
   ├─ dfs(4, 3)  4 >= 3 ✓
   └─ dfs(2, 3)  2 >= 3 ✗
→ 1 + 1 + 1 + 0 = 3 ✓
```

### Trace on Example 3 — `[1]` → 1

```text
dfs(1, -inf)  1 >= -inf ✓ → 1 ✓   (root alone is always good)
```

### Deep-tree-safe iterative version (recommended in Python)

With `n = 10^5`, a skewed tree drives recursion to depth `10^5`, past Python's default limit of 1000. Raising the limit (`sys.setrecursionlimit(...)`) helps but doesn't enlarge the C stack; an explicit stack is bulletproof:

```python
class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        if root is None:                       # guard; constraints say n >= 1
            return 0
        count = 0
        stack = [(root, float('-inf'))]        # (node, max over strict ancestors)
        while stack:
            node, max_so_far = stack.pop()
            if node.val >= max_so_far:
                count += 1
            new_max = max(max_so_far, node.val)
            if node.left:
                stack.append((node.left, new_max))
            if node.right:
                stack.append((node.right, new_max))
        return count
```

A BFS variant works identically: enqueue `(child, new_max)` pairs; note its queue can hold `O(width)` pairs — up to about `n/2 ≈ 5×10^4` entries on the last level of a complete tree (in a full binary tree the widest level holds roughly half of all nodes). The DFS stack's `O(h)` is the tighter, more interview-friendly bound.

---

## 6. Complexity

| Approach | Time | Auxiliary space | Verdict at `n = 10^5` |
|---|---|---|---|
| Brute force: rescan path per node | `O(n·h)` → worst `O(n²)` ≈ `5×10^9` steps | `O(h)` (path list) | **TLE** on skewed trees |
| **DFS carrying max (recursive)** | **`O(n)`** | `O(h)` stack — worst `O(n)` skewed, `O(log n)` balanced | OK in C++/Java; Python needs the iterative version or a raised recursion limit |
| DFS/BFS carrying max (explicit stack/queue) | `O(n)` | `O(h)` stack / `O(w)` queue | Safe everywhere |

- **Time `O(n)`:** exactly one visit and one comparison per node, O(1) work per edge.
- **Space:** one extra integer per stack frame; depth = tree height (`⌈log₂(n+1)⌉` for a balanced tree, `n` for a skew).
- **Why `O(n)` is optimal:** every node's own value can flip it between good and bad, so any correct algorithm must read all `n` values in the worst case — Ω(n) is unavoidable by a direct adversary argument.
- The answer is at most `n ≤ 10^5`, so it fits any 32-bit integer type; no overflow anywhere (values ≤ `10^4`, count ≤ `10^5`).

---

## 7. Implementation gotchas by language

| Language | Gotcha |
|---|---|
| **Python** | (1) Recursion depth: default limit is 1000; `sys.setrecursionlimit(300_000)` unblocks the logic but frames still consume C stack — the explicit-stack version is the safe answer for `n = 10^5`. (2) Sentinel: use `float('-inf')` (or `-10**4 - 1`); initializing `max_so_far = 0` silently breaks all-negative trees. (3) Pass the max as a **parameter** (ints are immutable → each branch gets its own copy); a shared mutable "current max" is the classic bug (§8). |
| **Java** | Keep `maxSoFar` a primitive `int` (sentinel `Integer.MIN_VALUE`), not boxed `Integer` — autoboxed values beyond the `[-128, 127]` cache compared with `==` compare references, a perennial trap. Depth: `10^5` frames can overflow a default JVM thread stack (~512 KB–1 MB); if needed, go iterative with two parallel `ArrayDeque`s or a small pair object. |
| **C++** | Pass `maxSoFar` **by value**. If you pass by reference for speed, you must save/restore it around both child calls — otherwise the left subtree's values leak into the right subtree's comparisons. Sentinel `INT_MIN`. Depth: `10^5` lightweight frames usually fit an 8 MB Linux stack but can overflow a 1 MB Windows/MSVC stack; `std::stack<pair<TreeNode*,int>>` removes the doubt. |

---

## 8. Common mistakes (with a failing counterexample)

1. **`>` instead of `>=`.** Fails Example 2: the second `3` in `[3,3,null,4,2]` must count; equal ancestors do *not* disqualify.
2. **Initializing the max to `0`.** Fails `[-5,-1,-10]` (root −5, children −1 and −10): correct answer 2 (−1 ≥ −5 and −5 ≥ −∞... root good, −1 good, −10 bad); a 0-initialized max counts 0.
3. **Sharing mutable max state across branches.** A single global "running max" that only grows lets one subtree's values pollute a *sibling* subtree. Counterexample:

   ```text
         1
        / \
     100   2
   ```
   Correct: paths `[1]`, `[1,100]`, `[1,2]` → **3**. With a shared max: after visiting `100`, the right child `2` is compared against `100` → counted bad → wrong answer 2. The max must travel as a **parameter** (per-branch copy).
4. **Pruning bad subtrees.** `node.val < maxSoFar` does **not** mean its descendants are bad: in `[5,3,7]`, node `3` is bad but its child `7` is good. Every node must be visited (hence `O(n)` is inherent).
5. **Counting only leaves / only root-to-leaf paths.** Every node is evaluated; internal good nodes (like `4` in Example 1) count too.
6. **Assuming BST structure** and skipping the "wrong side" — invalid; values follow no order between parent and child.
7. **Counting distinct values instead of nodes.** Two separate good nodes with value `3` contribute 2.

---

## 9. Test cases to propose out loud

Say these aloud *before* coding — it signals you understand the edge semantics:

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | `[3,1,4,3,null,1,5]` | 4 | Official example; mixed good/bad, internal node good |
| 2 | `[3,3,null,4,2]` | 3 | **Duplicates** → must use `>=` |
| 3 | `[1]` | 1 | Single node; root always good |
| 4 | `[-5,-1,-10]` | 2 | **Negative values** → sentinel can't be `0` |
| 5 | `[2,2,2,2]` | 4 | All-equal values → everything ties the max, all good |
| 6 | `[5,4,3]` (left chain) | 1 | Strictly decreasing chain → only the root is good |
| 7 | `[10,5,7]` | 1 | "Bigger than my parent" isn't enough — the *ancestor* max dominates (`7 > 5` but `7 < 10`) |
| 8 | Left chain of `10^5` decreasing nodes | 1 | Stress: recursion/stack depth handling |

After coding, run 1–3 (the given examples), then 2, 4, 5 (the ones that kill specific bugs), and mention 8 as your depth-safety check.

---

## 10. Transferable patterns & related problems

**Pattern name: top-down DFS with a carried prefix state.** The root-to-node path is a tree's version of a *prefix*; anything computable from ancestors alone (running max/min/sum, path length, direction, bitmask) can be threaded down as parameters, giving one-pass `O(n)` solutions. The mirror pattern — state returned **upward** from descendants — covers diameter/max-path-sum-style problems.

| Related problem | What transfers |
|---|---|
| LC 1026 — Maximum Difference Between Node and Ancestor | Carry `(min, max)` of ancestors down, evaluate per node — same skeleton, two carried values |
| LC 1372 — Longest ZigZag Path in a Binary Tree | Carry (direction, length) downward |
| LC 112 / 113 — Path Sum, Path Sum II | Carry running sum (and the path itself, with backtracking) down |
| LC 1457 — Pseudo-Palindromic Paths | Carry a bitmask "prefix state" down, test at each node |
| LC 257 — Binary Tree Paths | Enumerating root-to-node paths — literally the brute-force view of this problem |
| LC 543 / 124 — Diameter / Max Path Sum | The **bottom-up** counterpart: when a node's answer depends on *descendants*, return state upward instead |

---

## 11. Likely follow-ups (quick answers)

- **"Return the good nodes, not the count."** Same traversal; append `node` instead of `+1`. Order comes out preorder.
- **"Strict variant: greater than every ancestor."** Change `>=` to `>`; the root still counts (it has no ancestors), and everything else is unchanged.
- **"k-ary tree?"** Identical — pass the updated max to every child.
- **"Why does this break on a DAG?"** Because root→X paths are no longer unique, so "the max on the path" isn't well-defined per node — the uniqueness of tree paths is exactly what this solution leans on.

---

## 12. Full interview script

> "Let me restate: count nodes whose value is at least the maximum on their root path. Two clarifications from the examples: ties count as good — Example 2 has `(3, 3)` and the second 3 qualifies — and every node is judged, not just leaves.
>
> Brute force: for each node, walk or store its root path and take the max. That's `O(n·h)`, which is quadratic on a skewed tree — `10^5` nodes give ~`5×10^9` comparisons, so it TLEs.
>
> The insight: in a tree the root-to-node path is unique, so the only extra fact a node needs is the max of its ancestors — and a child's max is just `max(parent's max, child value)`. So one DFS, carrying `maxSoFar` down as a parameter. At each node: good if `node.val >= maxSoFar` — **greater-or-equal**, ties matter — then pass the updated max to both children. Starting from `-∞` makes the root count automatically and survives negative values.
>
> Invariant I'm maintaining: when I call `dfs(node, m)`, `m` is exactly the max over the node's strict ancestors. Each node is visited once, so `O(n)` time, `O(height)` space — worst `O(n)` for a skew, which matters here: with `n = 10^5` I'd use an explicit stack in Python rather than risk the recursion limit.
>
> Tests before I code: the three given examples; all-equal values, where everything counts; all-negative values, to catch a `0`-initialized max; a strictly decreasing chain, where only the root is good; and a node bigger than its parent but smaller than a grandparent."

---

## 13. Say it in 60 seconds

> "This is a single DFS carrying state downward. Whether a node is good depends on exactly one number: the max value on its unique path from the root — and a child's max is just the parent's max updated with the child's value, so I thread it down as a parameter. At each node: good if my value is **at least** that running max — ties count, and the duplicate example proves it — then pass the updated max to both children. Start the max at minus infinity so the root counts for free and negatives are safe. The max is a parameter, never shared mutable state, or one branch's big values would wrongly suppress the other branch. Every node is touched once: O(n) time, O(height) space. One flag: with up to 10^5 nodes a skewed tree is 10^5 deep, so in Python I'd use an explicit stack instead of recursion. Edge cases I'd call out: all-equal values — everything counts; all negatives — don't init the max to zero; a strictly decreasing chain — only the root is good."
