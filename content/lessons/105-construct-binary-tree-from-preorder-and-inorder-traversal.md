# Construct Binary Tree from Preorder and Inorder Traversal (LeetCode 105)

## 1. Problem restatement

You're given two arrays that describe the *same* binary tree, read in two different orders:

- `preorder` — root first, then the entire left subtree, then the entire right subtree.
- `inorder` — the entire left subtree, then the root, then the entire right subtree.

Rebuild the tree from these two sequences and return its root node (LeetCode then prints it in level order with `null` gaps, which is just serialization — you return `TreeNode`).

Two quick clarifications worth asking out loud in an interview:
- "Values are unique?" — Yes, guaranteed (this matters a lot; see §2).
- "Can the input be empty?" — No, `n ≥ 1`, but a robust solution returns `None` for empty input anyway.

## 2. Constraint decoding

| Constraint | What it implies |
|---|---|
| `1 <= n <= 3000` | Even O(n²) ≈ 9M ops can pass on LeetCode, but the *expected* answer is O(n). Also: a fully skewed tree has depth 3000 — this breaks Python's default recursion limit (§7). |
| Values are **unique** | (a) A `value → inorder index` hash map is valid. (b) The tree is *uniquely determined* by the two traversals — the problem is well-posed. |
| `inorder.length == preorder.length`, traversals guaranteed consistent | No validation needed. Every preorder value has exactly one inorder position. |
| `-3000 <= val <= 3000` | Small ints — a direct-array index map (`int[6001]`, offset by 3000) is a viable micro-optimization in Java/C++. No overflow risk anywhere. |

**Why "unique values" is load-bearing, not noise.** With duplicates, the answer may not even exist as a single tree. Example: `preorder = [1, 1]`, `inorder = [1, 1]` is produced *both* by "root 1 with left child 1" and "root 1 with right child 1." Two different trees, identical traversals — so reconstruction is ambiguous and the hash map would be ambiguous too. Saying this out loud is a strong interview signal.

## 3. The core insight: what each traversal tells you

Preorder hands you **roots top-down**; inorder gives you **the split around each root**:

```
preorder : [ root | ...left subtree... | ...right subtree... ]
inorder  : [ ...left subtree... | root | ...right subtree... ]
```

So for any subtree window:

1. The **first element of its preorder window is its root**.
2. Find that value in the corresponding inorder window at position `mid`. Everything left of `mid` is the left subtree; everything right is the right subtree.
3. **The sizes line up.** The left inorder segment and the left preorder segment contain the same set of nodes, so they have the same length. That length tells you exactly how to cut the preorder array into "left part" and "right part."

Concrete picture for Example 1 (`preorder = [3,9,20,15,7]`, `inorder = [9,3,15,20,7]`):

```
preorder : [ 3 | 9 | 20 15 7 ]
             ^   ^-- left (1 node)  ^------- right (3 nodes)
             root

inorder  : [ 9 | 3 | 15 20 7 ]
           ^-- left (1 node) ^   ^------- right (3 nodes)
                            root
```

Root `3` splits inorder into `[9]` and `[15,20,7]`; the sizes (1 and 3) tell you preorder's `[9]` and `[20,15,7]` are the corresponding subtree preorder sequences. Recurse.

## 4. Brute force — O(n²), with a worked trace

The natural first draft: recurse on **array slices**, scanning to find the root in inorder.

```python
class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        def build(pre: List[int], ino: List[int]) -> Optional[TreeNode]:
            if not pre:
                return None
            root_val = pre[0]
            mid = ino.index(root_val)          # O(len) scan  <- bottleneck #1
            root = TreeNode(root_val)
            root.left  = build(pre[1:1 + mid], ino[:mid])       # slicing <- bottleneck #2
            root.right = build(pre[1 + mid:],  ino[mid + 1:])
            return root
        return build(preorder, inorder)
```

**Worked trace on Example 1:**

| Call (`pre` / `ino`) | Root found | `mid` in `ino` | Children built |
|---|---|---|---|
| `[3,9,20,15,7]` / `[9,3,15,20,7]` | 3 | 1 | left from `[9]`/`[9]`, right from `[20,15,7]`/`[15,20,7]` |
| `[9]` / `[9]` | 9 | 0 | leaf |
| `[20,15,7]` / `[15,20,7]` | 20 | 1 | left from `[15]`/`[15]`, right from `[7]`/`[7]` |
| `[15]` / `[15]` | 15 | — | leaf |
| `[7]` / `[7]` | 7 | — | leaf |

Result: `3` → left `9`, right `20` → `20`'s left `15`, right `7`. Matches `[3,9,20,null,null,15,7]`. ✅

**Complexity of the brute force.** Every call both *scans* its whole inorder window (to find the root) and *copies* its whole arrays (the slices). On a right-skewed chain (`preorder = [1,2,3]`, `inorder = [1,2,3]`), the calls handle windows of size n, n−1, …, 1, so total work is n + (n−1) + … + 1 = **Θ(n²) worst case** — that's the justification for the quadratic bound; balanced inputs only cost Θ(n log n). At n = 3000 that's ~4.5M element copies, so it *passes* here, but an interviewer will push you to O(n). (A middle rung worth narrating: keep index windows `[pre_lo, pre_hi]` / `[in_lo, in_hi]` to kill the slicing, and use `inorder.index(val, in_lo, in_hi + 1)` to bound the scan — still Θ(n²) worst case, but no copies.)

## 5. Optimal approach — O(n): precompute positions, recurse on index windows

**The single change that unlocks O(n):** because values are unique, build a hash map `value → inorder index` *once*; each "where is the root?" becomes O(1). Everything else stays a standard divide-and-conquer over aligned windows.

Deriving the windows (closed intervals, all indices into the original arrays):

- Root value: `preorder[pre_lo]`
- `mid = idx_of[root_val]` (absolute index into `inorder`)
- `left_size = mid - in_lo`  ← *offset within the window*, not `mid` itself!
- Left subtree: preorder `[pre_lo + 1, pre_lo + left_size]`, inorder `[in_lo, mid - 1]`
- Right subtree: preorder `[pre_lo + left_size + 1, pre_hi]`, inorder `[mid + 1, in_hi]`

### 5.1 Primary implementation

```python
class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        idx_of = {val: i for i, val in enumerate(inorder)}   # value -> inorder index

        def build(pre_lo: int, pre_hi: int, in_lo: int, in_hi: int) -> Optional[TreeNode]:
            if pre_lo > pre_hi:                    # empty window
                return None
            root_val = preorder[pre_lo]            # first preorder element = subtree root
            mid = idx_of[root_val]                 # root's absolute position in inorder
            left_size = mid - in_lo                # nodes in the left subtree

            root = TreeNode(root_val)
            root.left  = build(pre_lo + 1, pre_lo + left_size, in_lo, mid - 1)
            root.right = build(pre_lo + left_size + 1, pre_hi, mid + 1, in_hi)
            return root

        return build(0, len(preorder) - 1, 0, len(inorder) - 1)
```

### 5.2 Trace on the official examples

**Example 1** — `preorder = [3,9,20,15,7]`, `inorder = [9,3,15,20,7]`, `idx_of = {9:0, 3:1, 15:2, 20:3, 7:4}`:

| Step | Call (pre window / in window) | Root val | `mid` | `left_size` | Builds |
|---|---|---|---|---|---|
| 1 | `[0..4]` / `[0..4]` | 3 | 1 | 1 | whole tree's root |
| 2 | `[1..1]` / `[0..0]` | 9 | 0 | 0 | leaf, left child of 3 |
| 3 | `[2..4]` / `[2..4]` | 20 | 3 | 1 | right child of 3 |
| 4 | `[3..3]` / `[2..2]` | 15 | 2 | 0 | leaf, left child of 20 |
| 5 | `[4..4]` / `[4..4]` | 7 | 4 | 0 | leaf, right child of 20 |

```
      3
     / \
    9  20
       / \
      15  7
```
Level-order output `[3,9,20,null,null,15,7]` ✅ (trailing nulls trimmed by LeetCode).

**Example 2** — `preorder = [-1]`, `inorder = [-1]`: one call, root `-1`, `left_size = 0`, both children get empty windows → `None`. Output `[-1]` ✅.

Note the call order (1 → left 2 → right 3 → its left 4 → its right 5) *is* preorder. That observation powers the next variant.

### 5.3 Variant: shared preorder pointer (less index bookkeeping)

Since the recursion creates nodes in exactly preorder order, you can consume `preorder` with a single forward pointer and never track preorder windows at all:

```python
class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        idx_of = {val: i for i, val in enumerate(inorder)}
        self.pre = 0                                  # next unconsumed preorder element

        def build(in_lo: int, in_hi: int) -> Optional[TreeNode]:
            if in_lo > in_hi:
                return None
            root = TreeNode(preorder[self.pre])       # root of this inorder window
            mid = idx_of[root.val]
            self.pre += 1                             # consume root BEFORE children
            root.left = build(in_lo, mid - 1)         # left consumes next elements
            root.right = build(mid + 1, in_hi)
            return root

        return build(0, len(inorder) - 1)
```

**Why it's correct (the invariant to state out loud):** when `build(in_lo, in_hi)` is invoked, the next unconsumed preorder elements are exactly the nodes of this inorder window, and the first of them is its root — because every ancestor's *left* subtree (which includes this window) is fully consumed before any right sibling is touched, and we increment `self.pre` exactly once per node, before recursing left-then-right. On Example 1 the pointer consumes indices 0,1,2,3,4 in that order — precisely the preorder sequence.

### 5.4 Bonus: fully iterative O(n) (recursion-free)

Walk `preorder`, keep an explicit stack of the current left spine; whenever the stack top equals the current inorder head, that spine is finished — pop until it isn't, and attach the next node as a right child.

```python
class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:
            return None
        root = TreeNode(preorder[0])
        stack, in_idx = [root], 0
        for i in range(1, len(preorder)):
            node = TreeNode(preorder[i])
            if stack[-1].val != inorder[in_idx]:
                stack[-1].left = node               # still descending a left spine
            else:
                parent = None
                while stack and stack[-1].val == inorder[in_idx]:
                    parent = stack.pop()
                    in_idx += 1
                parent.right = node                 # finished subtree -> right child
            stack.append(node)
        return root
```

This is the escape hatch if recursion depth is a concern (§7) and needs no hash map.

### 5.5 Talking through it (fuller interview script)

> "Two traversals describe one tree from different angles. Preorder gives me roots top-down — the first element is the root of the whole tree. Inorder tells me the split: once I locate that root value in inorder, everything left of it is the left subtree, everything right is the right subtree. Values are unique, so I'll precompute a hash map from value to inorder index to make 'locate the root' O(1). Then it's divide and conquer on index windows: for a window starting at `pre_lo`, the root is `preorder[pre_lo]`, its inorder index is `mid`, and the left subtree size is `mid` minus the window's left bound — that size tells me exactly where to cut the preorder array after the root into a left part and a right part. Base case: empty window returns `None`. Each call does O(1) work and creates exactly one node, so Θ(n) time; the map is Θ(n) space and the recursion stack is Θ(height), which is Θ(n) worst case on a skewed tree — in Python that's up to 3000 frames, so I'd raise the recursion limit or use an iterative version."

## 6. Complexity table

| Approach | Time | Extra space (beyond the output tree) | Why |
|---|---|---|---|
| Slice + scan recursion (§4) | Θ(n·h), worst **Θ(n²)** | Θ(n·h) worst (slices alive along the recursion path) | Each call scans *and* copies its whole window; a skewed chain gives n + (n−1) + … + 1 |
| Index windows + `list.index` scan | Θ(n·h), worst Θ(n²) | Θ(h) | No copies, but each call still scans its inorder window |
| **Hash map + index windows (primary)** | **Θ(n)** | Θ(n) map + Θ(h) stack | O(1) root lookup; each node created exactly once |
| Hash map + shared preorder pointer | Θ(n) | Θ(n) map + Θ(h) stack | Same asymptotics, simpler bookkeeping |
| Iterative stack (§5.4) | Θ(n) | Θ(h) stack, no map | Preorder and inorder pointers each move forward once |

Θ(n) is optimal: all n input values must be read to place them, and the output itself contains n nodes, so any correct algorithm is Ω(n) — the hash map version removes all the *extra* work the brute force does per call.

## 7. Implementation gotchas by language

| Language | Gotcha | Fix |
|---|---|---|
| **Python** | Default recursion limit ≈ 1000, but a skewed 3000-node tree needs depth 3000 → `RecursionError` | `sys.setrecursionlimit(10_000)` at the top, or submit the iterative version (§5.4) |
| **Python** | Calling `list.index`/`in` inside the recursion | Build `idx_of` once; the dict makes the scan O(1) |
| **Java** | `HashMap<Integer, Integer>` autoboxes every key/value; and comparing `Integer` results with `==` compares references, not values | Values are in `[-3000, 3000]`, so use `int[] pos = new int[6001]` with `pos[val + 3000]` — no boxing at all; if you keep the map, use `.equals()` or unbox with `intValue()` |
| **C++** | Capturing `preorder`/`inorder`/the map **by value** in a recursive `std::function`/lambda silently deep-copies the vectors on every call → hidden O(n²) | Capture by reference (`[&]`); also `unordered_map.reserve(n)` to avoid rehashing |

Recursion depth of ~3000 is fine for JVM and typical C++ stacks; it's specifically Python where you must act.

## 8. Common mistakes checklist

1. **`left_size = mid` instead of `mid - in_lo`.** `mid` is an absolute inorder index; it equals the left subtree size only when `in_lo == 0`. This bug passes the top-level call and dies on the right subtree — insidious.
2. **Wrong right-subtree preorder start.** It must skip the root *and* the entire left segment: `pre_lo + left_size + 1`, not `pre_lo + 2` and not `pre_lo + mid + 1`.
3. **Accidental O(n²)**: leaving `inorder.index(...)` / `std::find` / a `for` scan inside the recursion even after mentioning a hash map.
4. **Building the map over `preorder` instead of `inorder`.** The split position must come from inorder; a value→*preorder*-index map gives garbage `mid`s even though both arrays contain the same value set.
5. **Confusing values with indices** when threading arguments — keep the naming disciplined: `root_val` is a value; `mid`, `left_size`, `pre_lo…` are indices.
6. **Mixing interval conventions** (closed `[lo, hi]` vs half-open `[lo, hi)`) mid-solution; the off-by-ones compound. Pick one and state it.
7. **Shared-pointer variant:** recursing right before left, or forgetting `self.pre += 1` (or advancing it twice). The pointer must advance exactly once per node, in node-left-right order.
8. **Assuming structure guarantees that don't exist** — this is a plain binary tree, *not* a BST (so you can't binary-search inorder) and not necessarily balanced.
9. **Slicing solution as final answer** — readable, but copies arrays per call; expect the "can you do better?" follow-up.

## 9. Test cases to write / consider out loud

Propose these before or right after coding:

| Test case | Input | Expected structure | What it stress-tests |
|---|---|---|---|
| Example 1 | `pre=[3,9,20,15,7]`, `in=[9,3,15,20,7]` | `3(9, 20(15,7))` | Mixed branching; `in_lo > 0` in the right recursion |
| Example 2 | `pre=[-1]`, `in=[-1]` | single node `-1` | Minimal input |
| Right-skewed chain | `pre=[1,2,3,4]`, `in=[1,2,3,4]` | `1→2→3→4` all right children | Empty left windows every level; max recursion depth |
| Left-skewed chain | `pre=[4,3,2,1]`, `in=[1,2,3,4]` | `4→3→2→1` all left children | Empty right windows; `left_size > 0` repeatedly |
| Two nodes, right child only | `pre=[1,2]`, `in=[1,2]` | `1` with right child `2` | Smallest asymmetric case |
| Negative values | `pre=[-1,-2]`, `in=[-2,-1]` | `-1` with left child `-2` | Negatives flow through map keys correctly |
| (Out of constraints, but ask) | `pre=[]`, `in=[]` | `None` | Robustness / base case |

**Verification trick:** write a round-trip checker — build the tree, run preorder and inorder traversals on it, and assert they equal the inputs:

```python
def traversals(root):
    pre, ino = [], []
    def dfs(n):
        if n:
            pre.append(n.val); dfs(n.left); ino.append(n.val); dfs(n.right)
    dfs(root)
    return pre, ino

assert traversals(sol.buildTree(preorder, inorder)) == (preorder, inorder)
```

Because values are unique, the tree is uniquely determined by the two traversals — so a passing round-trip proves the reconstruction is exactly right, and it spares you hand-writing expected nested structures.

## 10. Transferable patterns & related problems

**Patterns to name in an interview:**
- **Locate-pivot-then-partition-and-recurse:** one sequence identifies the root, the other splits around it; recurse on aligned index windows. (This problem.)
- **Precompute an index map to kill inner scans** — same move as Two-Sum's complement map.
- **Consume a sequence with a shared pointer along DFS order** — valid whenever your recursion visits nodes in exactly that sequence's order.
- **Range-window DFS** — the same skeleton as binary-search-partition recursions and divide-and-conquer over arrays.

**Related problems:**

| Problem | How it differs |
|---|---|
| LC 106 — Construct from Inorder + Postorder | Root is the **last** postorder element; with a shared pointer from the tail you must recurse **right before left** (the classic trap) |
| LC 889 — Construct from Preorder + Postorder | Not uniquely solvable: `pre=[1,2]`, `post=[2,1]` fits both "2 is left child" and "2 is right child"; any valid tree is accepted |
| LC 1008 — Construct BST from Preorder | No inorder needed — the BST ordering property supplies the split; solvable in O(n) with min/max bounds |
| LC 297 — Serialize & Deserialize Binary Tree | Preorder *with explicit null markers* is uniquely reconstructible — the markers are what disambiguate single children |
| LC 654 — Maximum Binary Tree | Same "build a tree from an array" family, but the pivot is the max, solvable with a monotonic stack |

## 11. Say it in 60 seconds

> "Two traversals, one tree. Preorder's first element is always the root; finding that value in inorder splits it into left part, root, right part. Values are unique, so I first build a hash map from value to inorder index — that makes every root lookup O(1). Then I recurse on index windows: the root of a window is the first preorder element; I look up its inorder position `mid`; the left subtree size is `mid` minus the window's left bound, and that size tells me exactly where to cut preorder after the root. Left recursion gets the next `left_size` preorder elements and the left inorder part; right recursion gets the rest. Empty window returns `None`. Every call creates exactly one node with O(1) work, so it's O(n) time, O(n) space for the map, plus recursion depth equal to tree height — up to O(n) on a skewed tree, so in Python I'd raise the recursion limit or use an iterative stack version. And the uniqueness constraint matters: with duplicates, the map is ambiguous and the tree may not even be uniquely determined."
