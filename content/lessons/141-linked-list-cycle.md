# Linked List Cycle (LeetCode 141) — Full Interview Lesson

## 1. Problem restated in plain words

You're given the head of a singly linked list. Some node's `next` pointer might point **backward** to an earlier node (or to itself), creating a loop you can never escape by walking forward. Return `true` if walking from `head` would loop forever, `false` if you'd eventually fall off the end (`null`).

Two subtleties to internalize immediately:

- **`pos` is not an input.** It's the judge's internal bookkeeping describing *which* node the tail points back to. You never see it; you only ever receive `head`.
- **`pos` is a 0-based index of a node, not a value.** The problem's phrase "tail connects to the 1st node (0-indexed)" means `pos = 1` refers to the node at index 1. `pos = -1` is a sentinel meaning "no cycle." Nodes are distinguished by **identity** (the object/reference), not by `val` — values may duplicate freely (`-10^5 <= Node.val <= 10^5` says nothing about uniqueness).

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `0 <= n <= 10^4` | The list may be **empty**; it may be long enough that recursion or O(n²) scans are risky; and `n` is *known and bounded* — that's information you can exploit (see §4). |
| Node values in `[-10^5, 10^5]` | Values fit in a 32-bit int — no overflow concerns — and **duplicate values are legal**, so any logic keyed on values alone is suspect. |
| `pos = -1` or a valid index | A cycle, if present, points to a real node of this same list (no external nodes). Also: a 1-node list with `pos = 0` is a **self-loop** — a legal cycle. |

Edge cases implied: empty list, single node with no cycle, single node pointing to itself, two-node cycle back to the head.

## 3. Brute force: hash set of visited nodes

**Idea:** Walk the list once, remembering every node you've seen (by **identity**, not value). If you ever revisit a node → cycle. If you reach `null` → no cycle.

```python
def hasCycle(head: ListNode) -> bool:
    seen = set()          # stores node OBJECTS (identity), never .val
    cur = head
    while cur is not None:
        if cur in seen:
            return True
        seen.add(cur)
        cur = cur.next
    return False
```

**Worked trace on Example 1** (`head = [3,2,0,-4], pos = 1`; label nodes by index: `node0=3, node1=2, node2=0, node3=-4`, and `node3.next = node1`):

| Step | `cur` | Action |
|---|---|---|
| 1 | node0 (3) | not seen → add |
| 2 | node1 (2) | add |
| 3 | node2 (0) | add |
| 4 | node3 (-4) | add |
| 5 | node1 (2) | **already in `seen` → return `true`** ✓ |

Complexity: **O(n) expected time** — hash set operations are O(1) *on average* under simple uniform hashing, not worst-case guaranteed — and **O(n) space**. This is a perfectly good first answer; then pivot to the follow-up.

## 4. Constraint-aided O(1)-space trick (worth mentioning out loud)

Since `n ≤ 10^4`, you can walk exactly `10^4 + 1` steps: if you hit `null` first, no cycle; if you're still walking after `n + 1` steps, a cycle must exist — by the pigeonhole principle, more steps than distinct nodes forces a revisit.

```python
def hasCycle_bounded(head: ListNode, max_nodes: int = 10_000) -> bool:
    cur = head
    for _ in range(max_nodes + 1):
        if cur is None:
            return False
        cur = cur.next
    return True
```

It's O(n) time, O(1) space, but brittle (it hard-codes the bound). Mention it as a gotcha-aware aside, then say "the clean O(1)-space answer that doesn't depend on constraints is Floyd's."

## 5. Core insight → Floyd's tortoise and hare

**The picture:** two runners on a circular track. The faster runner must lap the slower one and they will meet — a track is finite, so "fast never catches slow" is impossible.

**Why exactly, and why fast can't "skip over" slow:** once both pointers are inside the cycle of length `L`, measure positions modulo `L`. Let `δ` be the gap from fast to slow measured forward along the cycle. Each iteration fast moves +2 and slow moves +1, so fast gains **exactly 1** on slow per iteration: `δ ← δ − 1 (mod L)`. Because the gain per iteration is exactly 1 (not 2), when `δ` hits 0 the pointers land **on the same node** — no overshoot, no parity trap. Since `δ` starts as some value in `[0, L−1]`, they collide within at most `L` iterations after both are in the cycle.

**Termination bound:** slow enters the cycle after `μ` steps (`μ` = nodes before the cycle start). At most `L` more iterations to collide. Total `≤ μ + L = n` iterations → **O(n) time, O(1) space**.

```python
def hasCycle(head: ListNode) -> bool:
    slow = fast = head
    while fast and fast.next:      # guard protects the double dereference below
        slow = slow.next           # 1 step
        fast = fast.next.next      # 2 steps
        if slow is fast:           # identity: same node, not same value
            return True
    return False                   # fast fell off the end → acyclic
```

**Narration script (what to say while typing):**
> "Two pointers, slow moves one step, fast moves two. The guard `fast and fast.next` protects the double dereference and also handles the empty list and single-node cases for free. If fast ever falls off the end, the list is acyclic. If there's a cycle, both pointers are trapped in it forever, and since fast closes the gap by exactly one node per iteration, it must land exactly on slow within one lap — so a meeting proves a cycle. Time O(n), space O(1)."

## 6. Traces on the official examples

**Example 1:** `head = [3,2,0,-4], pos = 1` — `node0(3) → node1(2) → node2(0) → node3(-4) → node1`

| Iteration | slow | fast | Note |
|---|---|---|---|
| start | node0 (3) | node0 (3) | both at head |
| 1 | node1 (2) | node2 (0) | fast: 0→1→2 |
| 2 | node2 (0) | node1 (2) | fast wraps: 2→3→1 |
| 3 | node3 (-4) | node3 (-4) | fast: 1→2→3 → **meet → true** ✓ |

**Example 2:** `head = [1,2], pos = 0` — `node0(1) → node1(2) → node0`

| Iteration | slow | fast | Note |
|---|---|---|---|
| start | node0 (1) | node0 (1) | |
| 1 | node1 (2) | node0 (1) | fast wraps all the way to head |
| 2 | node0 (1) | node0 (1) | **meet → true** ✓ |

**Example 3:** `head = [1], pos = -1` — `node0.next = None`. First guard check: `fast = node0` is truthy but `fast.next` is `None` → loop never runs → **return false** ✓. This example exists precisely to punish a missing `fast.next` guard.

## 7. Complexity table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Hash set of nodes | O(n) expected | O(n) | Expected O(1) per set op under uniform hashing |
| Step-cap walk (§4) | O(n + 1) steps | O(1) | Pigeonhole: > n steps without hitting `null` ⇒ revisit |
| **Floyd's tortoise & hare** | **O(n)** — ≤ μ + L iterations | **O(1)** | The target answer for the follow-up |
| Brent's variant | O(n) | O(1) | Same idea, hare "teleports" on power-of-two intervals → fewer pointer comparisons in practice |
| Any correct algorithm | Ω(n) worst case | — | On an acyclic list, the only certificate of "no cycle" is reaching the node whose `next` is `null`, which an adversary can place last |

## 8. Common mistakes

1. **Null dereference:** writing `fast.next.next` guarded only by `fast != null`. The loop guard must be `fast and fast.next` (Python) / `fast != null && fast.next != null` (Java).
2. **`while slow != fast` with `slow = fast = head`:** the loop never executes because they start equal. You need do-while semantics — move first, then compare (as in the code above).
3. **Comparing by value instead of identity:** `[1, 1]` with `pos = -1` vs `pos = 0` must give different answers even though values repeat. Use `slow is fast` in Python, `==` on references in Java/C++ (which is reference equality for objects/pointers).
4. **Hashing `node.val` instead of nodes:** duplicate values anywhere in the list trigger false positives.
5. **Misreading `pos`:** it's a 0-based node index used only for test construction, and `pos = -1` means no cycle — it's never an input.
6. **Forgetting the empty list:** `head = None` should return `false` (the loop guard handles it, but say it out loud).
7. **Assuming fast might "jump over" slow:** impossible, because the relative speed is exactly 1 node per iteration.
8. **Mutating the list** (e.g., cutting the cycle, marking nodes) without asking permission — always ask "may I modify the list?" before touching it.
9. **Solving the wrong problem:** locating *where* the cycle starts is LC 142, a strict superset of this task. Say so, solve detection first, offer 142 as a follow-up.

### Language-specific gotchas

| Language | Gotcha | Why it bites |
|---|---|---|
| Python | `node in seen` uses identity hashing because `ListNode` doesn't override `__eq__`/`__hash__` — that's what you want. But if a stub class *does* override `__eq__` by value, the set dedupes distinct nodes with equal values. | `[7,7]` with a cycle vs without could produce the same set behavior → wrong answer. Fall back to storing `id(node)` if unsure. |
| Java | `HashSet<ListNode>` is fine (identity equals/hashCode by default), but putting `node.val` (autoboxed `Integer`) in a `HashSet<Integer>` is wrong with duplicates; also never compare boxed `Integer`s with `==` (the −128…127 cache makes it unreliable). | Duplicate values → false cycle; `==` on boxed ints → flaky logic elsewhere. |
| Java | `fast.next.next` without checking `fast.next != null` → `NullPointerException`. | Guard both pointers in the `while`. |
| C++ | `unordered_set<ListNode*>` keys on **addresses** — correct. Inserting `ListNode` objects by value would require a custom hash and is not what you want. | Identity is the semantics you need; pointer keys give it for free. |
| C++ | `while (fast && fast->next)` before `fast->next->next` — a missing guard is a segfault, not an exception. | Same double-deref hazard as Java. |

## 9. Test cases to propose out loud (before or while coding)

State these unprompted — it signals rigor:

| # | Input | Expected | What it checks |
|---|---|---|---|
| 1 | `head = [3,2,0,-4], pos = 1` | `true` | Official: mid-list cycle |
| 2 | `head = [1,2], pos = 0` | `true` | Official: cycle back to head |
| 3 | `head = [1], pos = -1` | `false` | Official: single node, no cycle (kills bad loop guards) |
| 4 | `head = [], pos = -1` | `false` | Empty list (allowed: `n` can be 0) |
| 5 | `head = [1], pos = 0` | `true` | Self-loop — smallest possible cycle |
| 6 | `head = [1,2], pos = -1` | `false` | Acyclic multi-node: fast must actually reach `null` |
| 7 | `head = [5,5], pos = -1` vs `pos = 0` | `false` / `true` | Duplicate **values** with different answers → punishes value-based logic |

Harness for local testing:

```python
def build_list(values, pos):
    nodes = [ListNode(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if nodes and pos != -1:
        nodes[-1].next = nodes[pos]   # wire the cycle
    return nodes[0] if nodes else None
```

## 10. Transferable patterns & related problems

- **Fast/slow pointers (relative speed):** the same two-pointer machinery gives you LC 876 (middle of the list — fast hits `null` exactly when slow is at the middle), LC 19 (gap-of-*n* pointers), LC 234 (find middle, then reverse the second half).
- **"Anything with a deterministic successor is a linked list":** if state `x` maps to a unique next state `f(x)`, you can run Floyd on the *implicit* list. LC 202 Happy Number (next state = sum of squared digits) is exactly this; Pollard's rho factoring algorithm uses Floyd cycle-finding on `x → f(x) mod n` for the same reason.
- **Cycle detection + cycle entry as a pair:** LC 142 (find the node where the cycle begins): after slow/fast meet, reset one pointer to `head`, then advance both one step at a time — they meet at the cycle start. One-sentence justification: at the meeting point, slow has traveled `μ + k` steps and fast `2(μ + k)`, so `μ + k ≡ 0 (mod L)`; hence the meeting node is exactly `μ` steps (mod `L`) behind the cycle entry, matching a pointer starting from `head`.
- **LC 287 Find the Duplicate Number:** interpret index `i → nums[i]` as a functional graph; since values are in `[1, n]` across `n + 1` slots, the pigeonhole principle guarantees a repeat, the walk from index 0 always enters a cycle, and the cycle's entry node is the duplicate value.

## 11. Say it in 60 seconds

> "Brute force: walk the list with a hash set of nodes — if I see a node twice, there's a cycle; if I hit null, there isn't. That's O(n) time, O(n) space, and I hash the nodes themselves, not their values, since values can repeat. For the O(1)-memory follow-up, I use Floyd's tortoise and hare: slow moves one step, fast moves two. If the list is acyclic, fast hits null and we return false. If there's a cycle, both pointers get trapped in it, and since fast gains exactly one node per iteration on slow, it must land exactly on slow — it can't skip over it — within at most one lap. So: they meet means cycle; fast hits null means no cycle. Total time O(n), space O(1). Edge cases — empty list, single node, self-loop — are all handled by the loop guard `while fast and fast.next`, and I compare nodes by identity, not value. If they ask *where* the cycle starts, that's LeetCode 142: after the pointers meet, reset one to head and step both by one; they meet again at the entry node."
