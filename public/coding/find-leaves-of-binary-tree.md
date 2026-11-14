### Problem

Repeatedly remove all leaves and return the values removed in each round.

### Interview refresher

A node’s removal round is its height (distance to its deepest leaf), not its depth: a node goes one round after its last child, so `height = 1 + max(left, right)` with a missing child at -1. A post-order DFS returns the height and appends the value to `rounds[height]`, adding a new list when `height == len(rounds)`, which is safe because a child of height h−1 is always visited first. O(n) time, O(h) stack. Say out loud why BFS by depth is wrong. For very deep, line-shaped trees, switch to an iterative post-order to avoid Python’s recursion limit.

### Hints

1. A node's round is its height from the bottom, not its depth from the root.
2. Post-order DFS that returns height.

### Approach

Leaves have height 0. A node's height is 1 + max(child heights). Append each node to bucket `height`.

### Deep dive

#### What the interviewer is really testing

Whether you question the obvious framing. Most people reach for level-by-level BFS, which groups nodes by distance from the root. That’s the wrong quantity.

#### Why depth is wrong

```text
1
     / \
    2   3
   / \
  4   5
depth groups:  [1] [2,3] [4,5]
actual rounds: [4,5,3] [2] [1]
```

Node 3 is a leaf from the start, so it goes in round one with 4 and 5, even though it’s shallower.

#### Find the right quantity

When is a node removed? Only once it’s become a leaf, after all its children are gone. If the left child goes in round *a* and the right in round *b*, the node goes in round `1 + max(a, b)`. A missing child counts as round −1, so a true leaf lands in round 0. That recurrence is exactly the node’s **height**: its distance to the farthest leaf below.

#### Why post-order

The formula needs both children’s rounds first, so visit children before the parent.

#### Why `if h == len(rounds): append` is safe

A node of height h always has a child of height h−1, which post-order visits first. So when you see the first node of height h, rounds 0 to h−1 already exist, and h is exactly the next index.

#### Deep trees

Python’s default recursion limit is about 1,000. A tree shaped like a long line would crash. Mention converting to an iterative post-order with an explicit stack.

### Reference solution

```python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right


def find_leaves(root: TreeNode | None) -> list[list[int]]:
    rounds: list[list[int]] = []

    def height(node) -> int:
        if node is None:
            return -1
        h = 1 + max(height(node.left), height(node.right))
        if h == len(rounds):
            rounds.append([])
        rounds[h].append(node.val)
        return h

    height(root)
    return rounds


root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))
assert find_leaves(root) == [[4, 5, 3], [2], [1]]
```

**Time:** O(n)  
**Space:** O(h)

### Questions to ask before coding

- Should values within a round be in any particular order?
- May I leave the tree intact rather than actually deleting nodes?
- How deep might the tree be?

### Interview walkthrough

**Interviewer:** Collect a tree’s nodes as if you repeatedly removed all leaves.

**You:** Does order within a round matter? Left to right is fine for me. And may I compute this without physically deleting nodes?

**Interviewer:** Left to right, and yes.

**You:** My first thought is level order, but that groups by distance from the root, and a shallow leaf would land in the wrong round. A node is removed one round after its last child, so its round is one plus the max of its children’s rounds. That’s its height.

> *Why this works:* Stating the wrong idea and why you rejected it is valuable here; this problem exists to test exactly that correction.

**You:** So: a post-order traversal returning height, with missing children at -1 so leaves get 0, appending each node to the list for its height. One pass, O(n).

**You:** Test on 1 with children 2 and 3, where 2 has 4 and 5: rounds are 4, 5, 3, then 2, then 1.

**Interviewer:** What if the tree is 100,000 nodes in a line?

**You:** Recursion would hit Python’s limit. I’d switch to an explicit stack, processing children first and storing each node’s height in a dictionary until its parent needs it.

### Scale-up follow-up

**Interviewer adds:** “The tree is very deep — 10⁵ nodes in a line.”

Python recursion will overflow. Convert to an iterative post-order with an explicit stack and a dict of computed heights.

### Where candidates slip

- BFS by depth gives a different (wrong) grouping.
- Recursion limit on degenerate trees.
