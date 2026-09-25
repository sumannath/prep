# Kth Smallest Element in a BST — Complete Lesson

**LeetCode 230 · Medium · Tags:** Binary Search Tree, In-Order Traversal, Stack, Order Statistics

---

## 1. Problem Restatement

You're given the root of a **binary search tree** and an integer `k`. Return the **k-th smallest node value**, where `k` is **1-indexed**: `k = 1` means the minimum, `k = n` means the maximum.

Three things to pin down immediately:

- **Indices vs. values.** `k` counts a *position* in the sorted sequence of node values; the function returns a *value*. In a 0-indexed Python list of in-order values, the answer is `list[k - 1]`. In a traversal with a counter, the answer is the node where the counter hits exactly `k`.
- **Duplicates.** LeetCode's BSTs here have distinct values. If an interviewer allows duplicates, ask: does "k-th smallest" count duplicates as separate positions, or mean the k-th *distinct* value? In-order traversal produces a **non-decreasing** sequence either way, so "counting positions with multiplicity" works unchanged; "k-th distinct" would require skipping repeats. Clarify before coding.
- **Output.** Return `node.val`, not the node itself.

---

## 2. Constraint Decoding

| Constraint | What it tells you |
|---|---|
| `1 <= k <= n` | `k` is always valid — no out-of-range or empty-tree case *required*. A defensive guard still signals care in an interview. |
| `n <= 10^4` | Even `O(n log n)` passes easily. The interview signal is **not** raw speed — it's whether you produce the `O(h + k)` early-exit solution and handle the follow-up. |
| `0 <= Node.val <= 10^4` | Values are non-negative and **bounded**. That
