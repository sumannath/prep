# Remove Nth Node From End of List — Complete Interview Lesson

## 1. Problem Restatement

Given the head of a **singly linked list** and an integer `n`, delete the node that is `n` positions from the **end** of the list, and return the (possibly new) head.

Precision points that must be locked in before coding:

- **`n` is a 1-indexed position counted from the tail, not a value and not a 0-indexed count.** `n = 1` deletes the *last* node; `n = L` (the list length) deletes the *head*. In `[1,2,3,4,5]` with `n = 2`, the victim is node `4`, not node `3`.
- **Deletion is by position, never by value.** Values may repeat (`[7,7,7]` is legal); two nodes with equal values are distinct nodes. Only the node at the target *position* is removed.
- **The head can change** (when `n = L`), so the function must return the *new* head, not the original `head` reference.
- **Singly linked means no `prev` pointer.** To unlink a node you must physically stand on its *predecessor* and redirect its `next`. So the real task is: *find the predecessor of the nth-from-end node*.

## 2. Constraint Decoding

| Constraint | What it tells you |
|---|---|
| `1 <= sz <= 30` | Tiny input. Even an O(sz²) scan finishes instantly, so the problem is **not** testing raw performance — it's testing pointer discipline and the follow-up. Still, write the optimal solution. |
| `1 <= n <= sz` | Two guarantees: (a) `n` is always **valid** — the fast pointer never runs off the end during setup, and `n = 0` / `n > sz` are out of scope; (b) `n = sz` is in scope, so **head deletion must work**. |
| `0 <= Node.val <= 100` | Values are payload only. Duplicates are allowed. Never branch on `val` when deciding what to delete. |
| Follow-up: "one pass?" | The interviewer's real question. They want the **fixed-gap two-pointer** technique; the two-pass solution is your baseline, not your finale. |

## 3. Brute Force: Two Passes (Length, Then Walk)

**Idea.** Pass 1 measures the length `L`. The nth-from-end node sits at 0-based index `L − n` from the front; its predecessor sits at index `L − n − 1`. Walk there in pass 2 and relink.

**Index convention that kills off-by-one bugs:** treat the dummy as sitting at **index −1**. Moving `k` steps from the dummy lands on index `k − 1`. So to reach the predecessor (index `L − n − 1`), take `L − n` steps from the dummy.

```python
def removeNthFromEnd_two_pass(head: ListNode, n: int) -> ListNode:
    # Pass 1: measure length
    length, cur = 0, head
    while cur:
        length += 1
        cur = cur.next

    # Pass 2: walk to the predecessor (index length - n - 1)
    dummy = ListNode(0, head)
    cur = dummy
    for _ in range(length - n):
        cur = cur.next
    cur.next = cur.next.next        # unlink the target
    return dummy.next
```

**Worked trace — Example 1: `head = [1,2,3,4,5]`, `n = 2`**

1. Pass 1 visits all 5 nodes → `L = 5`. Target index = `5 − 2 = 3` (node `4`); predecessor index = `2` (node `3`).
2. Pass 2 from dummy: step 1 → node `1`, step 2 → node `2`, step 3 → node `3`. (`L − n = 3` steps → index `2`. ✔)
3. Relink: `3.next = 3.next.next` → `3 → 5`. List is now `1→2→3→5`. Return node `1`. **Output `[1,2,3,5]`** ✔

**Trace — head deletion, `head = [1]`, `n = 1`:** `L = 1`, so the loop runs `L − n = 0` times and `cur` stays on the **dummy**. `dummy.next = dummy.next.next` → `None`. **Output `[]`** ✔ — this is exactly why the dummy exists: it turns "delete the head" into the same one-line relink as any other deletion.

**Complexity:** `O(L)` time (two independent scans), `O(1)` space. Still linear — the follow-up asks for a *single* traversal, not a better asymptotic bound.

## 4. Core Insight

Reframe the deletion: **the node to delete is the nth node from the end, so its predecessor is the (n+1)-th node from the end — i.e., exactly `n` nodes behind the tail.**

Therefore, if you keep two pointers locked at a **fixed gap of `n`**, and the *leader* stops on the tail, the *trailer* is standing on the predecessor. No length measurement needed.

```
dummy(−1) → [0] → [1] → … → [L−n−1] → [L−n] → … → [L−1] → None
                              ↑ slow                    ↑ fast (tail)
```

The dummy does double duty:
- It gives the trailer a place to stand when `n = L` (predecessor "index" is −1, i.e., *before the head*).
- It makes the return value uniform: `dummy.next` is the new head in every case.

## 5. Optimal Approach: Fixed-Gap Two Pointers (One Pass)

**Algorithm.**

1. `dummy = ListNode(0, head)`; `slow = fast = dummy`.
2. Advance `fast` exactly `n` steps. (Safe: `n ≤ sz` is guaranteed.)
3. While `fast.next` is not null, advance **both** one step.
4. Now `fast` is the tail and `slow` is the predecessor. Unlink: `slow.next = slow.next.next`.
5. Return `dummy.next`.

```python
from typing import Optional

class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        slow = fast = dummy
        for _ in range(n):
            fast = fast.next           # n <= sz guaranteed, fast stays on a real node
        while fast.next:               # stop when fast is the tail
            fast = fast.next
            slow = slow.next
        slow.next = slow.next.next     # unlink the target
        return dummy.next
```

**Why this is "one pass":** the `fast` pointer scans the list exactly once (`L` hops total: `n` in setup + `L − n` in the sweep), and `slow` trails within the same loop — one traversal structure, each node touched O(1) times. If an interviewer is pedantic that total pointer hops are `2L − n < 2L`, note that you cannot do better anyway: nodes carry no length metadata and no back-pointers, so identifying a tail-relative position requires following the `next` chain, giving a worst-case lower bound of Ω(L) pointer reads.

**Convention warning (the #1 off-by-one source):** two self-consistent conventions exist. Pick one; never mix:

| Setup: advance `fast`… | Loop until… | `slow` ends on |
|---|---|---|
| `n` steps from dummy | `fast.next is None` (fast = tail) | predecessor ✔ |
| `n + 1` steps from dummy | `fast is None` | predecessor ✔ |

Mixing rows (e.g., `n` steps with `while fast`) leaves `slow` one node too far — on the *target* instead of its predecessor — and you delete the wrong node.

### Traces on the Official Examples

**Example 1 — `head = [1,2,3,4,5]`, `n = 2`** (`L = 5`, target index 3, predecessor index 2)

| Phase | `slow` | `fast` | Guard check |
|---|---|---|---|
| init | dummy (idx −1) | dummy (idx −1) | — |
| after `n = 2` advance | dummy (−1) | node `2` (idx 1) | gap = 2 locked |
| sweep iter 1 | node `1` (0) | node `3` (2) | `fast.next = 4` ≠ None → move |
| sweep iter 2 | node `2` (1) | node `4` (3) | `fast.next = 5` ≠ None → move |
| sweep iter 3 | node `3` (2) | node `5` (4) | `fast.next = None` → stop next check |

`slow` = node `3` = index `2 = L − n − 1` ✔ predecessor of node `4`. Unlink `3.next → 5`. **Output `[1,2,3,5]`** ✔

**Example 2 — `head = [1]`, `n = 1`** (head-deletion case, `n = L`)

- Advance `fast` 1 step: `fast` = node `1`, `slow` = dummy.
- `fast.next` is `None` → sweep loop **never runs**; `slow` never leaves the dummy.
- Unlink: `dummy.next = dummy.next.next = None`. Return `None`. **Output `[]`** ✔ — the dummy absorbed the head deletion for free.

**Example 3 — `head = [1,2]`, `n = 1`** (tail deletion)

- Advance `fast` 1 step: `fast` = node `1`, `slow` = dummy.
- Guard `fast.next = 2` ≠ None → move: `slow` = node `1`, `fast` = node `2`. Guard `fast.next = None` → stop.
- `slow` = node `1` = predecessor of the tail ✔. Unlink: `1.next = None`. **Output `[1]`** ✔

## 6. Complexity Table

| Approach | Time | Extra space | Passes | Notes |
|---|---|---|---|---|
| Two-pass (count, then walk) | `O(L)` | `O(1)` | 2 | Correct baseline; state it, then improve it |
| **Fixed-gap two pointers** | `O(L)` | `O(1)` | **1** | Intended answer to the follow-up |
| Recursive (count from the back) | `O(L)` | `O(L)` call stack | 1 | Each of the `L` nested calls holds a frame until the count unwinds, so space equals list depth; stack-overflow risk on long lists |
| Copy into array, index, rebuild | `O(L)` | `O(L)` | 1–2 | Works, but sidesteps the pointer skill being tested |

## 7. Common Mistakes

| # | Mistake | Symptom | Fix |
|---|---|---|---|
| 1 | Advancing `fast` `n−1` or `n+1` steps without changing the loop guard | Wrong node deleted; `slow` lands on the target instead of the predecessor | Pair the setup offset with the guard (see convention table in §5) |
| 2 | Using `while fast` with the `n`-step setup | `fast` overshoots to `None`; `slow` ends one node too far | `n` steps ⇔ `while fast.next`; `n+1` steps ⇔ `while fast` |
| 3 | No dummy; hand-special-casing "delete the head" | Crashes or stale list when `n = L` | `dummy → head`; return `dummy.next` |
| 4 | Returning `head` instead of `dummy.next` | When `n = L` you return the removed node | The returned head is whatever `dummy.next` is |
| 5 | Searching by value | On `[7,7,7], n = 2` you might remove the wrong `7` | Position-only deletion; values may duplicate |
| 6 | Adding fragile checks for `n = 0` / `n > sz` | Overcomplicated code | Constraints guarantee `1 <= n <= sz`; say so out loud, optionally add one assert |
| 7 | C++: `delete` before relinking | `victim->next` is gone after delete → lost tail / use-after-free | Save the victim, relink, *then* delete |
| 8 | Jumping straight to code without clarifying indexing | Wrong interpretation of "nth from end" | Confirm: 1-indexed from the tail, `n = 1` is the last node |

## 8. Language Gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| **C++** | Relink **before** freeing: `ListNode* victim = slow->next; slow->next = victim->next; delete victim;` — deleting first destroys `victim->next` and orphans the suffix. Also, `dummy` may be a stack object; returning `dummy->next` is safe because it points to a heap node (or `nullptr`), never to `dummy` itself. |
| **Java** | If you take the container route in the brute force, beware the `ArrayList.remove` overload trap: `list.remove(2)` removes **index** 2, while `list.remove(Integer.valueOf(2))` removes the **value** 2 — `Integer` autoboxing silently selects the overload you didn't mean. With the pointer solution the GC reclaims the unlinked node; the real Java hazard is an NPE if you drop the guaranteed `1 <= n <= sz` assumption. |
| **Python** | No manual memory to manage; the hazards are logical: `None.next` raises `AttributeError` if you let `fast` run past the tail (only possible on invalid input), and forgetting to return `dummy.next` (not `head`) fails exactly the `n = L` case. |

## 9. Full Interview Talk Track (Script)

**Clarify (≈30s).** "Assumptions: singly linked; `n` is 1-indexed counting from the tail, so `n = 1` removes the last node; constraints guarantee `1 <= n <= length`, so the input is always valid; and since `n` can equal the length, the head itself may be removed, so I'll return the new head."

**Baseline (≈30s).** "Simple version: one pass to count the length `L`, then a second pass to the node at index `L − n − 1` — the predecessor — and relink. Linear time, constant space, two passes. The dummy absorbs the delete-the-head case. But I can do it in one pass."

**Insight (≈30s).** "To unlink a node in a singly linked list I must stand on its predecessor. The nth-from-end node's predecessor is exactly `n` nodes behind the tail. So: two pointers with a locked gap of `n`. Start both at a dummy, push the leader forward `n` steps, then advance them together until the leader reaches the tail. The trailer is now on the predecessor — one relink finishes the job. The dummy handles `n = L` for free."

**Code (≈90s).** Write the code from §5, narrating each line: "dummy guards the head… gap of `n` locked… stop when `fast` is the tail… `slow.next` skips the victim… return `dummy.next`."

**Verify (≈45s).** "Trace example 1: leader lands on node 2, they walk together, leader stops on 5, trailer on 3, unlink 3→5. Example 2: leader is immediately the tail, trailer never leaves the dummy, dummy.next becomes None — empty list."

**Complexity & edges (≈30s).** "`O(L)` time, `O(1)` space, single pass — that satisfies the follow-up. Edge cases I care about: `n = 1` (tail), `n = L` (head, trailer stays on dummy), and duplicate values, which don't matter because deletion is positional."

## 10. Test Cases to Say Out Loud

State these **before or right after coding** — it signals testing maturity.

| Input | Expected | What it verifies |
|---|---|---|
| `head = [1,2,3,4,5], n = 2` | `[1,2,3,5]` | Official example; middle deletion, gap invariant |
| `head = [1], n = 1` | `[]` | Official; single node, head deleted, dummy does the unlink |
| `head = [1,2], n = 1` | `[1]` | Official; tail deletion |
| `head = [1,2,3], n = 3` | `[2,3]` | **Proposed edge:** `n = L` → delete head; `slow` must never leave the dummy |
| `head = [7,7,7], n = 2` | `[7,7]` | **Proposed edge:** duplicate values; deletion must be positional, not value-based |
| `head = [1,2], n = 2` | `[2]` | **Proposed edge:** smallest head-deletion case |

Out of scope per constraints (mention, don't implement): `n = 0`, `n > sz`, empty list — in production you'd add a one-line guard.

Quick local harness:

```python
def build(vals):
    dummy = cur = ListNode(0)
    for v in vals:
        cur.next = ListNode(v); cur = cur.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val); head = head.next
    return out

s = Solution()
assert to_list(s.removeNthFromEnd(build([1,2,3,4,5]), 2)) == [1,2,3,5]
assert to_list(s.removeNthFromEnd(build([1]), 1))         == []
assert to_list(s.removeNthFromEnd(build([1,2]), 1))       == [1]
assert to_list(s.removeNthFromEnd(build([1,2,3]), 3))     == [2,3]   # delete head
assert to_list(s.removeNthFromEnd(build([7,7,7]), 2))     == [7,7]   # duplicates
```

## 11. Transferable Patterns & Related Problems

**Patterns to carry forward:**

1. **"Nth from the end" ⇒ fixed-gap two pointers.** Any tail-relative position query converts to "leader stops at the tail, trailer is `n` behind."
2. **Deletion in a singly linked list ⇒ find the predecessor.** The dummy node guarantees a predecessor *always* exists, collapsing head-deletion into the general case.
3. **The leader defines the stopping condition.** Choosing whether to test `fast` or `fast.next` is the entire off-by-one battle — fix a convention and derive everything from the dummy-at-index−1 rule.

**Related problems:**

| Problem | Connection |
|---|---|
| LC 876 — Middle of the Linked List | Same fast/slow idea; gap grows via 2× speed instead of `n` steps |
| LC 1721 — Swapping Nodes in a Linked List | Needs kth-from-front *and* kth-from-end in one sweep — same gap trick twice |
| LC 141 / 142 — Linked List Cycle I & II | Fast/slow convergence family |
| LC 61 — Rotate List | Same `L − k` index arithmetic, plus tail-to-head reconnection |
| LC 203 — Remove Linked List Elements | Dummy-head pattern for value-based deletion |
| LC 2095 — Delete the Middle Node | Fast/slow with `slow` lagging one behind to land on the *predecessor* |
| LC 237 — Delete Node in a Linked List | The clever contrast: given the victim directly, copy the next node's value — but it fails for the tail, which is exactly why the general template stands on the predecessor |

## 12. Say It in 60 Seconds

> "One pass, two pointers, plus a dummy head. The dummy matters because when `n` equals the list length, the head itself gets removed — the dummy gives every deletion a predecessor to unlink from. Both pointers start at the dummy. I push the fast pointer forward exactly `n` steps, which locks a gap of `n` between the two pointers. Then I advance them together until fast reaches the last node. Because the gap is locked at `n`, slow is now standing exactly on the node before the target — the target is always `n` behind the tail. Deletion is one re-link: slow's next pointer skips the victim. I return dummy-dot-next, which is correct even when the head changed. Fast walks the list once and slow trails within the same loop, so it's linear time, constant space, single pass — the follow-up answered. I'd verify with `n = 1` for the tail and `n = length` for head removal."
