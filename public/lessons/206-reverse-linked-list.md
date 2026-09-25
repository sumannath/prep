# Reverse Linked List — Complete Interview Lesson

## 1. Problem Restatement

Given the head of a **singly linked list**, reverse the list **in place** (re-point all `next` pointers backwards) and return the new head — which is the old tail.

Key clarifications to state out loud in an interview:

- We should not create a new list of new nodes; relink existing nodes.
- Return the new head, not just modify the list.
- The list may be **empty** (`head = null`) — must return `null`.
- Nodes have a `val` and a `next`; there is no parent/prev pointer, so traversal is forward-only.

Definition used in code:

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

## 2. Constraint Decoding

| Constraint | Implication |
|---|---|
| 0 ≤ length ≤ 5000 | Small; O(n²) "works" but the expected answer is O(n). Empty list is a real test case. |
| val in [-5000, 5000] | Values are irrelevant to the algorithm — we only move pointers. Duplicates don't matter here (unlike dedup problems). |
| Singly linked | No random access, no backwards traversal. A recursive solution is natural but recursion depth up to 5000 matters in some languages. |
| Follow-up: iterative *and* recursive | You are expected to produce both, and know the recursion-depth tradeoff. |

## 3. Brute Force (and a Worked Trace)

**Idea:** Copy values into an array, reverse the array, write values back.

```python
def reverseList_bruteforce(head):
    vals = []
    node = head
    while node:
        vals.append(node.val)
        node = node.next
    node = head
    for v in reversed(vals):
        node.val = v
        node = node.next
    return head
```

**Trace on `[1,2,3,4,5]`:**
1. Collect: `vals = [1,2,3,4,5]`.
2. Reversed: `[5,4,3,2,1]`.
3. Write back: node values become 5,4,3,2,1 in the *same* node objects.

This is O(n) time and O(n) space. It changes **values, not links** — in an interview that's usually disallowed ("reverse the *list*, not the values"), so treat it as a warm-up only, and mention its flaw explicitly.

## 4. Core Insight

Reversing a linked list is just **re-pointing every `next` to the node that came before it**. The only obstacle: the moment you set `node.next = prev`, you lose the reference to the rest of the list. So you must **save the next pointer before overwriting it**.

Three-pointer walk: `prev` (already reversed portion), `curr` (node being relinked), `nxt` (saved remainder).

## 5. Optimal Approach 1: Iterative (O(n) time, O(1) space)

```python
def reverseList(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next   # save the rest of the list
        curr.next = prev  # reverse the pointer
        prev = curr       # advance prev
        curr = nxt        # advance curr
    return prev           # prev is the new head (old tail)
```

### Trace on Example 1: `[1,2,3,4,5]`

| Step | curr | nxt | curr.next set to | List so far (prev side) | Remaining |
|---|---|---|---|---|---|
| init | 1 | — | — | None | 1→2→3→4→5 |
| 1 | 1 | 2 | None | 1 | 2→3→4→5 |
| 2 | 2 | 3 | 1 | 2→1 | 3→4→5 |
| 3 | 3 | 4 | 2 | 3→2→1 | 4→5 |
| 4 | 4 | 5 | 3 | 4→3→2→1 | 5 |
| 5 | 5 | None | 4 | 5→4→3→2→1 | empty |

Loop ends (`curr = None`); return `prev = node 5`. Output: `[5,4,3,2,1]` ✓

### Trace on Example 2: `[1,2]`
- Step 1: `1.next = None`, prev=1.
- Step 2: `2.next = 1`, prev=2, curr=None. Return 2 → `[2,1]` ✓

### Trace on Example 3: `[]`
- `curr = None` immediately; loop never runs; return `prev = None` → `[]` ✓ (empty case falls out for free — say this out loud).

## 6. Optimal Approach 2: Recursive (O(n) time, O(n) stack)

**Insight:** Reverse everything *after* `head`, then attach `head` to the end of that reversed portion.

```python
def reverseList(head):
    if head is None or head.next is None:
        return head                      # base case: 0 or 1 node; new head
    new_head = reverseList(head.next)    # reverse the rest
    head.next.next = head                # make the next node point back at me
    head.next = None                     # cut the old forward link
    return new_head
```

### Trace on `[1,2,3]`
1. Recurse: 1 → 2 → 3. At node 3: `head.next is None` → return 3 as `new_head`.
2. At node 2: `2.next.next = 2` (i.e., `3.next = 2`), then `2.next = None`. List: `3→2`, new head 3. Return 3.
3. At node 1: `1.next.next = 1` (i.e., `2.next = 1`), then `1.next = None`. List: `3→2→1`. Return 3. ✓

**Gotcha:** the returned `new_head` is always the *original tail*; the `head.next.next = head` line is the "aha" — the rest was already reversed, we're only fixing one pointer per level.

**Depth note:** recursion depth = list length. With n ≤ 5000 this is fine in Python (default limit ~1000 — actually **not** fine in Python by default! Either raise `sys.setrecursionlimit` or prefer the iterative version; in interviews, flag this). In C++/Java, a 5000-deep recursion is usually safe but a 10⁵-node list would risk stack overflow — another reason iterative is the "production" answer.

## 7. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Value copy (brute force) | O(n) | O(n) | Mutates values, not links — usually disallowed |
| Iterative pointer reversal | O(n) | **O(1)** | Expected primary answer |
| Recursive | O(n) | O(n) stack | Elegant; depth-limited |

**Lower-bound note:** O(n) time is optimal because a correct reversal must visit and relink every node at least once — with no shortcuts, so any algorithm is Ω(n). No comparison-model bounds apply here; this is a pointer-manipulation problem, not a sorting one.

## 8. Common Mistakes

| Mistake | Why it breaks | Fix |
|---|---|---|
| Overwriting `curr.next` before saving it | Lose the rest of the list; traversal dies mid-way | Always capture `nxt = curr.next` first |
| Returning `curr` instead of `prev` | `curr` is `None` at loop exit | Return `prev` |
| Forgetting `prev = None` initial value | `head.next` would point to garbage / old node | Sentinel-free version needs `prev = None` |
| Forgetting the empty list | Null pointer dereference on `head.next` | The `while curr` loop naturally handles it — verify with `[]` |
| Recursion: forgetting `head.next = None` | Old head keeps a stale pointer to node 2, creating a 2-cycle | Always null out the old link |
| Python: deep recursion | `RecursionError` past ~1000 depth by default | Prefer iterative, or raise recursion limit |

**Language gotchas:**
- **Java:** local references are pass-by-value; reassigning `head` inside a helper does *not* affect the caller — return the new head rather than relying on side effects.
- **C++:** beware `next` name collisions and dangling nodes; if using `unique_ptr`-based lists, reversal needs careful ownership transfer (`release()`/move), unlike raw pointers. Raw-pointer version is standard for interviews.

## 9. Test Cases to Propose Out Loud

Before coding, say: *"Let me check empty, single, and two-node lists."*

| Test | Input | Expected | What it validates |
|---|---|---|---|
| Official 1 | `[1,2,3,4,5]` | `[5,4,3,2,1]` | General case |
| Official 2 | `[1,2]` | `[2,1]` | Minimal non-trivial swap |
| Official 3 | `[]` | `[]` | Empty list, return None |
| Edge: single | `[7]` | `[7]` | Node points to None, still returned as head |
| Edge: negatives/dups | `[-1, -1, 0]` | `[0, -1, -1]` | Values irrelevant; no dedup logic |
| Edge: long list | 5000 nodes | reversed | Recursion depth / O(n) timing |

## 10. Transferable Patterns & Related Problems

**Pattern: in-place pointer rewiring with prev/curr/nxt.** Once you own this three-pointer dance, you get for free:

- **Reverse Linked List II** (LC 92) — reverse a *sublist* [m, n]: walk to position m, run the same loop n−m+1 times, then reconnect the boundary pointers (the two extra connections at the ends are the real challenge).
- **Reverse Nodes in k-Group** (LC 25) — repeatedly apply this reversal to chunks of k and reattach; recursion or iteration over groups.
- **Palindrome Linked List** (LC 234) — find middle (slow/fast pointers), reverse the second half *with this exact algorithm*, compare halves.
- **Reorder List** (LC 143) — middle split + reverse second half + interleave.
- **Linked List Cycle / cycle start** — same prev/curr discipline; also classic "reverse to detect" style thinking.

The meta-skill: **draw boxes and arrows, mutate one arrow at a time, and save any pointer you're about to overwrite.**

## 11. Say It in 60 Seconds

> "I'll reverse the list iteratively with three pointers — prev, curr, and a saved next. The key insight is that when I flip curr.next back to prev, I'd lose the rest of the list, so I save next first. I walk through the list flipping one arrow per step; when curr hits null, prev is sitting on the old tail, which is the new head, so I return prev. That's O(n) time and O(1) space, and it handles the empty list for free since the loop just never runs. The follow-up: recursively, reverse everything after head, then set head.next.next to head and null out head.next — the base case is a null or single node. Recursion is O(n) stack space, so for a 5000-node list in Python I'd prefer the iterative version to avoid recursion-limit issues. I'd test empty, single-node, two-node, and the official examples."
