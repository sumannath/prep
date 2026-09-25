# Same Tree (LeetCode 100) — Full Interview Lesson

## 1. Problem Restatement

You are given the **root nodes** of two binary trees, `p` and `q`. Return `true` if and only if the trees are **identical**:

- **Structurally identical**: every position that holds a node in one tree holds a node in the other (and every missing child is missing in both).
- **Value-identical**: at every matched position, the two nodes have the same value.

**Precision about the notation.** `p = [1,2,3]` is LeetCode's *level-order picture* of the tree, not the input type. You receive `TreeNode` roots; the array is shorthand for "root `1` with left child `2` and right child `3`." Likewise `[1,null,2]` means "root `1`, **no** left child, right child `2`" — this is exactly what makes Example 2 different from `[1,2]`. Do not write code that indexes into these arrays; they are not passed in.

**Duplicates.** Nothing in the constraints says values are distinct (Example 3 has two `1`s *within each tree's comparison*). Matching is strictly **positional** — you can never identify a node by its value, only by *where* it sits. This kills any "find the matching node" idea before it starts.

Target signature (Python): `def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool`.

---

## 2. Constraint Decoding

| Constraint | What it actually tells you |
|---|---|
| Node count in **[0, 100]** | Either or both trees may be **empty** — you must decide `[] vs []` explicitly (answer: `true`). Max depth is 100, so plain recursion is safe (Python's default recursion limit is ~1000). Scale is a non-issue — even an O(N²) plan passes; the real test is edge-case correctness. |
| `val` in **[-10⁴, 10⁴]** | Fits any 32-bit integer; no overflow concerns anywhere. Extremes are legal, so never use `0`, `-1`, or `None` as a sentinel value. |
| No distinctness guarantee | Duplicates are allowed. Comparison must be position-by-position, not value-driven. |

---

## 3. Brute Force: Serialize Both Trees, Then Compare

**Idea.** Flatten each tree into a sequence that encodes structure *unambiguously*: a preorder walk that writes `"#"` for every **null child**, then compare the two sequences.

Why the null markers are non-negotiable: a preorder sequence *without* markers is ambiguous. Example 2 is the built-in counterexample — `[1,2]` and `[1,null,2]` both have bare preorder `[1,2]`, so a marker-free serializer would wrongly call them the same. With `"#"` per missing child, the encoding is a lossless fingerprint (each child slot is pinned down by its parent's slot, so two different trees can never share an encoding — the same fact that makes LeetCode 297's format lossless).

```python
class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        def preorder(root: Optional[TreeNode], out: list) -> None:
            if root is None:
                out.append("#")            # null marker: disambiguates structure
                return
            out.append(str(root.val))
            preorder(root.left, out)
            preorder(root.right, out)

        sp, sq = [], []
        preorder(p, sp)
        preorder(q, sq)
        return sp == sq                    # list comparison, index by index
```

**Worked trace on Example 2** — `p = [1,2]`, `q = [1,null,2]`:

| index | `sp` (p = [1,2]) | `sq` (q = [1,null,2]) | verdict |
|---|---|---|---|
| 0 | `"1"` | `"1"` | match |
| 1 | `"2"` | `"#"` | **mismatch → false** |

Without markers both lists would be `["1","2"]` → wrongly `true`. On Example 3 (`[1,2,1]` vs `[1,1,2]`) the serializations are `["1","2","#","#","1","#","#"]` vs `["1","1","#","#","2","#","#"]` — mismatch at index 1.

**Cost.** Θ(N) time, Θ(N) extra space, and **no early exit** — you build both full encodings even if the roots already differ. It's "brute" in bookkeeping, not in time; the optimal solution's win is that it materializes nothing and stops at the first mismatch.

---

## 4. The Core Insight

The definition of "same tree" is **already recursive** — so the solution is a direct transcription of the definition:

```
same(p, q) =
    true                                   if p and q are both null
    false                                  if exactly one of p, q is null
    p.val == q.val
      AND same(p.left, q.left)
      AND same(p.right, q.right)           otherwise
```

Three consequences to say out loud in an interview:

1. **It's a paired, positional walk** — the i-th recursive call always compares "the same position" in both trees. No searching, no lookups, ever.
2. **"Exactly one null" is the structural-mismatch case.** That single line *is* Example 2. Both-null is `true` (empty vs empty); one-null is `false`; the check order (both-null → one-null → value) must be exactly this, because you can't read `.val` before confirming the node exists.
3. **Combine with `AND` and let short-circuiting give you early exit.** The first failing position aborts the whole traversal.

---

## 5. Optimal Approach: Paired DFS

```python
class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        if p is None and q is None:      # Case 1: both empty -> same
            return True
        if p is None or q is None:       # Case 2: exactly one empty -> structural mismatch
            return False
        if p.val != q.val:               # Case 3: both exist -> values must match
            return False
        return self.isSameTree(p.left, q.left) \
           and self.isSameTree(p.right, q.right)
```

**Script to narrate while coding:**
> "I'll define sameness recursively. Three cases: both null → same; exactly one null → different; otherwise the values must match and both subtrees must match pairwise. I check nulls *before* touching `.val` to avoid a null dereference. The `and` short-circuits, so we bail at the first mismatch. The constraints allow zero nodes, so empty-vs-empty is `true` and empty-vs-nonempty is `false` — my Case 1 and Case 2 handle that."

**Iterative version (know it for the "no recursion?" follow-up):**

```python
from collections import deque

class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        pairs = deque([(p, q)])                     # queue of same-position pairs
        while pairs:
            a, b = pairs.popleft()
            if a is None and b is None:
                continue                            # empty vs empty: still consistent
            if a is None or b is None or a.val != b.val:
                return False
            pairs.append((a.left,  b.left))
            pairs.append((a.right, b.right))
        return True
```

Note the `continue` on double-null: returning `false` there is a classic bug.

### Traces on the official examples

**Example 1** — `p = [1,2,3]`, `q = [1,2,3]` → **true**

| call | comparison | decision |
|---|---|---|
| `(1, 1)` | both exist, 1 == 1 | recurse left |
| `(2, 2)` | both exist, 2 == 2 | recurse left |
| `(None, None)` ×2 (2's children) | both empty | `true` |
| → `(2,2)` returns true | | recurse right of root |
| `(3, 3)` → two `(None,None)` calls | both exist, 3 == 3 | `true` |
| `(1,1)` combines `true and true` | | **true** |

**Example 2** — `p = [1,2]`, `q = [1,null,2]` → **false**

| call | comparison | decision |
|---|---|---|
| `(1, 1)` | both exist, 1 == 1 | recurse left |
| `(2, None)` | exactly one null | **false** |
| `(1,1)` | `false and …` | short-circuits — right subtree never touched → **false** |

**Example 3** — `p = [1,2,1]`, `q = [1,1,2]` → **false**

| call | comparison | decision |
|---|---|---|
| `(1, 1)` | both exist, 1 == 1 | recurse left |
| `(2, 1)` | both exist, **2 ≠ 1** | **false** → short-circuit → **false** |

Example 3 is the duplicates lesson: both trees contain `{1, 1, 2}` as a multiset, yet they're different trees. Only positional comparison gets this right.

---

## 6. Complexity Analysis

Let `N = min(|p|, |q|)` (node counts) and `h` = height of the compared region.

| Approach | Time | Extra space | Early exit? | Notes |
|---|---|---|---|---|
| Recursive paired DFS (main) | O(N) worst case — Θ(N) when identical, stops at first mismatch otherwise | O(h) call stack; worst O(N) (skewed), O(log N) balanced | ✅ | Canonical interview answer |
| Iterative BFS/DFS on pairs | same as recursive | O(width) queue or O(h) stack | ✅ | Use if recursion is banned; survives arbitrarily deep trees |
| Serialize + compare (§3) | Θ(N) always | Θ(N) | ❌ | Fine at N ≤ 100; needs null markers |

**Why O(N) is tight (lower bound).** Ω(N) worst-case time is unavoidable: if any algorithm skips a node, an adversary puts the sole mismatch in the last unvisited node, forcing a wrong answer — so every node may need to be read when the trees are identical except at one leaf.

Each productive recursive call consumes one non-null node from *each* tree, and those nodes are distinct per tree, so the number of such calls is bounded by the smaller tree's size; null-pair terminations are proportional to that. With N ≤ 100, all of this is comfortably fast and the recursion depth (≤ 100) never threatens Python's ~1000 default limit.

---

## 7. Common Mistakes

1. **Reading `.val` before null checks** → `AttributeError` (Python), NPE (Java), segfault (C++). The order *both-null → one-null → value* is load-bearing.
2. **Dropping the both-null base case**, so `[] vs []` (allowed by `[0, 100]`) wrongly returns false.
3. **`or` instead of `and`** between the two recursive calls — "either subtree matches" is a completely different (and wrong) property.
4. **Serializing without null markers** — Example 2 silently breaks: both trees serialize to `[1,2]`.
5. **Comparing node references instead of values** (`p == q` on `TreeNode*` in C++ compares *addresses*).
6. **BFS bug**: returning `false` on a `(None, None)` pair, or pushing children asymmetrically when one side is null.
7. **Value-multiset thinking** — Example 3 proves matching values alone isn't enough; positions matter.
8. **Not stating the empty-tree behavior before coding.** The `[0, 100]` range is bait for exactly this; raise it proactively.

---

## 8. Language-Specific Gotchas

| Language | Gotcha | Fix |
|---|---|---|
| **Java** | `ArrayDeque` **rejects `null` elements** — the pair-BFS version throws NPE the moment you push `(null, null)` children. | Use `LinkedList` as the queue (permits nulls), or skip pushing double-null pairs. |
| **Java** | If you route values through collections (`List<Integer>`) and compare with `==`, values > 127 — legal here, up to 10⁴ — fall outside the `Integer` autobox cache and compare by reference ("works on my test, fails on hidden test"). | Compare primitives (`p.val == q.val`, `val` is `int`) or use `.equals`. |
| **C++** | `p == q` on `TreeNode*` is pointer identity, not value equality. Iterative version must push `nullptr`s explicitly and check `if (!a && !b) continue;` before dereferencing. | Compare `a->val`; keep the three-case check order. |
| **Python** | String serialization via `+=` is O(N²) worst-case. | Append to a list and `"".join`. Prefer `is None` over truthiness for precision. |

---

## 9. Test Cases to Propose Out Loud

State the first four *before* coding — they show you read the constraints:

| # | Input | Expected | What it validates |
|---|---|---|---|
| 1 | `p=[1,2,3]`, `q=[1,2,3]` | `true` | Official Ex. 1 — happy path |
| 2 | `p=[1,2]`, `q=[1,null,2]` | `false` | Official Ex. 2 — one-sided null (structure) |
| 3 | `p=[1,2,1]`, `q=[1,1,2]` | `false` | Official Ex. 3 — same value multiset, wrong positions |
| 4 | `p=[]`, `q=[]` | `true` | Both empty (constraint allows 0 nodes) — base case |
| 5 | `p=[1]`, `q=[]` | `false` | One-sided empty |
| 6 | `p=[1,1]`, `q=[1,null,1]` | `false` | Duplicates + the null-marker ambiguity |
| 7 | `p=[-10000,null,10000]`, `q=[-10000,null,10000]` | `true` | Extreme/negative values |
| 8 | Two identical left-skewed chains of 100 nodes | `true` | Max size / max recursion depth |
| 9 | Identical except the deepest leaf's value | `false` | Worst-case time: no early exit, full traversal |

---

## 10. Transferable Patterns & Related Problems

**Patterns:**
- **Lockstep paired traversal ("two pointers over trees").** Walk two structures simultaneously; each step consumes one node from each. Reappears in Merge Two Sorted Lists (21), Add Two Numbers (2), and Symmetric Tree (101, with mirrored arguments).
- **Recursion from a recursive definition.** When a property is naturally defined in terms of itself on subtrees, implement it verbatim; base cases fall out of the smallest inputs (104, 110, 112, 226).
- **Short-circuit boolean recursion.** Combine subtree results with AND/OR and let evaluation order terminate early (101, 110, 965).
- **Same Tree as a subroutine.** Subtree of Another Tree (572) is "run `isSameTree(s_node, t)` at every node of `s`" — O(S·T) naively; improvable to O(S+T) by string-matching serializations, since a subtree's null-marked preorder appears as a *contiguous substring* of the whole tree's null-marked preorder (preorder visits each subtree as one contiguous block, with all its null markers inside).

**Related problems:**

| Problem | Relationship | Twist vs. Same Tree |
|---|---|---|
| 101 Symmetric Tree | Same recursion, mirrored args | Compare `p.left` with `q.right` |
| 572 Subtree of Another Tree | Same Tree at every root | + scan over all candidate roots |
| 951 Flip Equivalent Binary Trees | Same skeleton | Children may be swapped → OR over two alignments |
| 110 Balanced Binary Tree | Same traversal shape | Returns height, not bool — aggregate info upward |
| 297 Serialize/Deserialize Binary Tree | Serialization idea formalized | Null markers done right, in production |
| 1367 Linked List in Binary Tree | Paired traversal | Mixed structures: list + tree |

**Likely follow-ups:** "Iteratively?" → §5's queue version. "Trees with millions of nodes?" → iterative (no stack overflow); still Ω(N) worst case by the hidden-mismatch argument in §6. "Same up to child swaps?" → 951.

---

## 11. Say It in 60 Seconds

> "Same Tree asks whether two trees match exactly — same structure, same values at the same positions. Since 'same' is defined in terms of subtrees, I'll implement it recursively with three cases: both roots null → true; exactly one null → false, that's the structural mismatch; otherwise values must be equal and both left subtrees and both right subtrees must match — combined with AND, which short-circuits so we stop at the first difference. Nulls get checked before touching `.val`, and since the constraints allow zero nodes, empty-versus-empty is true. Time is O(n) worst case — you can't beat that, because a mismatch could hide at the last unvisited node — and space is O(height) for the call stack, worst O(n) on a skewed tree, which is fine here with n ≤ 100. If recursion's off the table, the same logic runs iteratively with a queue of node pairs."
