# Reverse Nodes in k-Group (LeetCode 25) — Complete Interview Lesson

## 1. Problem Restatement (say it in your own words)

Given a singly linked list and an integer `k`, walk the list from left to right and **reverse every consecutive block of `k` nodes in place**, splicing the reversed blocks back together. If the tail has fewer than `k` nodes left, that ragged remainder is **left exactly as-is** (not reversed, not dropped). Return the new head.

Two rules make it interesting:

- **You may not change `node.val`** — only the `next` pointers may be rewired. So the tempting "copy values into an array, reverse the array, write them back" trick is off the table.
- **`k ≤ n` is guaranteed**, so at least one full group always exists — but your code shouldn't *rely* on it (a good implementation handles `k > n` for free).

Precision notes to state out loud:

- There are **no indices** here. "The k-th node" always means *the k-th node counted from a moving anchor*, 1-indexed. Define it once and stay consistent.
- Values can **duplicate** (`0 ≤ val ≤ 1000`). Never branch on values or compare nodes by `.val` — compare **node references** (`is` / `!=` on pointers).

---

## 2. Constraint Decoding — what each constraint is telling you

| Constraint | Implication for your solution |
|---|---|
| `n ≤ 5000` | Even a clumsy O(n·k) pass (~25M pointer hops) wouldn't TLE, but the interviewer will push you toward **O(n) time / O(1) space** — the follow-up demands it. Also: recursion depth of up to `n/k` frames is a real (if small) risk — see §8. |
| `1 ≤ k ≤ n` | At least one full group exists. Your probe step will succeed at least once. Bonus robustness: if `k > n`, the probe fails immediately and the code returns the list unchanged with zero extra branches. |
| `0 ≤ Node.val ≤ 1000` | No numeric overflow anywhere — the solution is pure pointer surgery. Values are irrelevant except for printing. |
| "May not alter values" | Kills the O(n) time / O(n) space **value-swap** shortcut. The interviewer wants pointer manipulation. |
| Follow-up: O(1) extra memory | Rules out: value arrays, node-reference arrays, stacks of nodes — and, under a strict reading, **recursion** (each frame is stack space, O(n/k) total). The target is the **iterative** solution. |

---

## 3. Brute Force — and why it's not the answer

### 3.1 The value-swap version (know it, name it, don't use it)

```python
def reverseKGroup_by_values(head, k):
    vals, curr = [], head
    while curr:
        vals.append(curr.val); curr = curr.next
    for i in range(0, len(vals) - k + 1, k):
        vals[i:i + k] = vals[i:i + k][::-1]
    curr = head
    for v in vals:
        curr.val = v; curr = curr.next
    return head
```

This produces the correct output in O(n)/O(n), **but it edits values, which the problem explicitly forbids**. In an interview, propose it in one sentence ("the value-array version would work but violates the no-value-edit rule, so I won't use it") and move on — that single sentence earns credit.

### 3.2 Node-reference array + relink (allowed, O(n) space)

Collect **references to nodes** (not values), reverse each full block of `k` references, then relink. Node objects are untouched except for their `next` pointers, so the rule is respected.

```python
def reverseKGroup_nodes_array(head, k):
    nodes, curr = [], head
    while curr:
        nodes.append(curr); curr = curr.next
    if not nodes:                      # defensive; constraints say n >= 1
        return head

    for i in range(0, len(nodes) - k + 1, k):   # full blocks only
        nodes[i:i + k] = nodes[i:i + k][::-1]

    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    nodes[-1].next = None
    return nodes[0]
```

**Worked trace on Example 1** (`head = [1,2,3,4,5]`, `k = 2`):

| Step | Array of node refs | Effect |
|---|---|---|
| Collect | `[N1, N2, N3, N4, N5]` | list unchanged: 1→2→3→4→5 |
| Reverse block `i=0..1` | `[N2, N1, N3, N4, N5]` | — |
| Reverse block `i=2..3` | `[N2, N1, N4, N3, N5]` | `range` stops at `i=4` — index 4 has no full block |
| Relink + terminate | `[N2, N1, N4, N3, N5]` | `2→1→4→3→5→None` ✓ |

**Verdict:** correct, O(n) time, O(n) space. It passes the baseline judge but **fails the O(1) follow-up** — which is exactly the conversation the interviewer wants to have next. (A stack-of-k-nodes variant is also O(n)/O(k) — same fate.)

---

## 4. Core Insight

The whole problem is **three small primitives glued together**. Once you see them, it stops being a "hard" problem:

1. **Reversal is local.** Reversing a segment `[a … kth]` needs only a moving `prev/curr` pair and a *stopping point*. You never need the whole list.
2. **Stop at a node, not at `None`.** The standard LC 206 reversal loops until `curr == None`. If instead you initialize `prev = group_next` (the node *after* the group) and loop until `curr == group_next`, the *identical* loop reverses exactly the group — and the new tail is **already attached** to the rest of the list. `group_next` is playing the role of "null."
3. **A moving left wall + probe-before-mutate.** Keep `group_prev` = the last node of everything already finalized. Each round: **probe k nodes ahead first**; if you fall off the end, stop (that's the leftover rule). Otherwise reverse the segment and splice. A **dummy node** before the head serves as the permanent left wall, so the first group — whose head *changes* — needs no special case.

**Loop invariant to state out loud:**

> At the top of every iteration, `group_prev.next` is the first *unprocessed* node, and everything before `group_prev` is final and correctly linked.

Splice picture (after the local reversal of a 3-node group):

```
Before:   group_prev → a → b → kth → group_next → ...
After:    group_prev → kth → ... → b → a → group_next → ...
                                  ↑
                        a is the NEW group_prev
```

---

## 5. Optimal Algorithm — O(n) time, O(1) space, iterative

Per round, four steps:

1. **Probe:** from `group_prev`, advance a runner exactly `k` steps to find `kth` (the group's last node). If you hit `None`, fewer than `k` nodes remain → return `dummy.next`.
2. **Snapshot boundaries** *before any pointer is rewritten*: `group_start = group_prev.next` (will become the tail) and `group_next = kth.next` (the reversal's stop marker; may be `None`).
3. **Local reversal:** `prev = group_next`, `curr = group_start`; run the standard two-pointer reversal while `curr is not group_next`. Afterwards: `prev == kth` and `group_start.next == group_next` — the tail is already connected.
4. **Splice & slide the wall:** `group_prev.next = kth` (new head of the finalized region); `group_prev = group_start` (old head is now the node before the next group).

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)      # sentinel: the "left wall" never moves
        group_prev = dummy             # last node of the already-finalized region

        while True:
            # 1) Probe: is there a full group of k nodes starting at group_prev.next?
            kth = group_prev
            for _ in range(k):
                kth = kth.next
                if kth is None:            # fewer than k remain
                    return dummy.next      # leftover stays as-is; done

            # 2) Snapshot boundaries BEFORE rewriting any pointer.
            group_start = group_prev.next  # first node of the group -> becomes the tail
            group_next = kth.next          # node after the group -> reversal stop marker

            # 3) In-place reversal of [group_start .. kth].
            #    Same two-pointer reversal as LC 206, but we stop at group_next
            #    instead of None and initialize prev to group_next.
            prev, curr = group_next, group_start
            while curr is not group_next:
                nxt = curr.next
                curr.next = prev
                prev = curr
                curr = nxt
            # Invariants here: prev == kth  and  group_start.next == group_next

            # 4) Splice and slide the left wall.
            group_prev.next = kth          # new head of the finalized region
            group_prev = group_start       # old head is now the tail of its group
```

The `while True` always exits via the probe's `return` — eventually the remaining suffix is shorter than `k` (or empty).

### 5.1 Trace — Example 1: `[1,2,3,4,5]`, `k = 2` → `[2,1,4,3,5]`

| Round | Probe result `kth` | `group_start` | `group_next` | After local reversal | After splice (`group_prev.next = kth`) | New `group_prev` |
|---|---|---|---|---|---|---|
| 1 | node(2) | node(1) | node(3) | `2→1→3` (1 now points at 3) | `dummy→2→1→3→4→5` | node(1) |
| 2 | node(4) | node(3) | node(5) | `4→3→5` (3 now points at 5) | `1→4` ⇒ `dummy→2→1→4→3→5` | node(3) |
| 3 | probing 2 steps from node(3) reaches `None` after node(5) | — | — | — | **return `dummy.next` = node(2)** | — |

Output: `2→1→4→3→5` ✓ — node(5) is the leftover and was never touched.

### 5.2 Trace — Example 2: `[1,2,3,4,5]`, `k = 3` → `[3,2,1,4,5]`

| Round | Probe result `kth` | `group_start` | `group_next` | After local reversal | After splice | New `group_prev` |
|---|---|---|---|---|---|---|
| 1 | node(3) | node(1) | node(4) | `3→2→1→4` | `dummy→3→2→1→4→5` | node(1) |
| 2 | probing 3 steps from node(1): node(4)→node(5)→`None` | — | — | — | **return `dummy.next` = node(3)** | — |

Output: `3→2→1→4→5` ✓ — nodes 4 and 5 are the untouched leftover.

### 5.3 The recursive variant (know it; explain why it loses the follow-up)

```python
class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        # Probe BEFORE mutating: if fewer than k nodes, return head unchanged.
        node, count = head, 0
        while node and count < k:
            node = node.next
            count += 1
        if count < k:
            return head

        # Reverse the first k nodes iteratively.
        prev, curr = None, head
        for _ in range(k):
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt

        # prev = new head; head = new tail; curr = first node of the next group.
        head.next = self.reverseKGroup(curr, k)
        return prev
```

It's elegant and correct — recursion depth is ⌊n/k⌋+1 frames — but each frame is stack space, so it is **O(n/k) space, not O(1)**. Under the follow-up, present it only as the stepping stone: "the recursive version is clean, but it costs O(n/k) stack; here's the iterative translation." (Also see the Python recursion-limit gotcha in §8.)

---

## 6. Complexity Analysis

**Main solution:** **O(n) time, O(1) extra space.**
- Time: across all rounds, the probe advances over each node exactly once, and the reversal touches each node exactly once → about **2n pointer hops** total.
- Space: a fixed handful of references (`dummy`, `group_prev`, `kth`, `group_start`, `group_next`, `prev`, `curr`, `nxt`) regardless of `n`. Iterative — no call stack.

Any lower bound: **Ω(n) time is unavoidable for *any* correct solution**, because every node's `next` pointer can end up pointing somewhere new, so all `n` nodes must be read at least once.

| Approach | Time | Extra space | Passes O(1) follow-up? | Notes |
|---|---|---|---|---|
| Value copy-back (§3.1) | O(n) | O(n) | ✗ | Violates "no value edits" — mention, don't use |
| Node-reference array + relink (§3.2) | O(n) | O(n) | ✗ | Easiest to reason about; fine as a warm-up |
| Stack of k nodes per group | O(n) | O(k) | ✗ | O(k) can be Θ(n); must still count before popping |
| Recursive group-by-group (§5.3) | O(n) | O(n/k) call stack | ✗ (strictly) | Elegant; recursion-depth risk for small `k` |
| **Iterative probe + in-place reverse (§5)** | **O(n)** | **O(1)** | ✓ | **The intended answer** |

---

## 7. Common Mistakes (ranked by how often they cost interviews)

1. **Reversing before counting (the fatal one).** If you reverse the trailing partial group and *then* notice it has `< k` nodes, your list is already scrambled and you need a messy un-reversal pass. **Always probe k nodes first.** In recursive form: the `count < k` check must precede the reversal loop.
2. **Loop-condition corruption: `while curr != kth.next`.** The loop's final iteration *writes* `kth.next`, mutating the very expression in its own condition. Snapshot `group_next = kth.next` **before** the loop and compare against the snapshot.
3. **Advancing `group_prev` to the wrong node.** After splicing, the node before the next group is the **old head** (`group_start`, now the tail), *not* `kth`. Advancing to `kth` makes the next probe start *inside* the reversed group → wrong grouping or an infinite loop.
4. **Losing the tail connection.** The reversed group's tail must point at `group_next`. This is automatic **only if `prev` is initialized to `group_next`**. If your LC 206 muscle memory initializes `prev = None`, you cut the group off from the rest of the list.
5. **Skipping the dummy node.** The returned head *changes* (the first group is reversed), and the first group has no predecessor. Without a sentinel you need an ugly special case and risk returning the wrong node.
6. **Misreading the leftover rule.** Leftover nodes keep their **original order and positions** at the end — not reversed, not dropped, not re-based to the front.
7. **`k = 1` blind spot.** With `k = 1` the output must equal the input. A good 10-second sanity check: trace one round — probe finds the node itself, the "reversal" is a no-op, `group_prev` advances by one.
8. **Comparing nodes by `.val`.** Values duplicate; boundary checks must use **reference identity** (`is` in Python).
9. **Editing values after all.** The value-swap version *passes the judge* (only values are checked) but violates the stated constraint — flag it verbally, then do pointer surgery.

---

## 8. Language-Specific Gotchas

| Language | Gotcha |
|---|---|
| **Python** | The recursive variant recurses ~`n/k` times; with `k = 1`, `n = 5000` that's ~5000 frames against the default recursion limit (~1000) → `RecursionError`. Go iterative; `sys.setrecursionlimit(...)` is a band-aid, not a fix. |
| **Java** | Deep recursion (small `k`) can throw `StackOverflowError` at this size. Also, Java passes object references **by value** — reassigning `head` inside a helper is invisible to the caller; always **return** the new head. |
| **C++** | If you `new` the dummy, it leaks (LeetCode tolerates it; production code won't) — detach or manage it. When rewiring manually, watch for **dangling `next` pointers** if you detach a node before computing its new successor; order of operations matters. |

---

## 9. Test Plan — propose these out loud before coding

| # | Input | Expected output | What it exercises |
|---|---|---|---|
| 1 | `head = [1,2,3,4,5]`, `k = 2` (official) | `[2,1,4,3,5]` | Multiple full groups + leftover of 1 |
| 2 | `head = [1,2,3,4,5]`, `k = 3` (official) | `[3,2,1,4,5]` | One full group + leftover of 2 |
| 3 | `head = [1]`, `k = 1` | `[1]` | Smallest input; single node |
| 4 | `head = [1,2,3]`, `k = 1` | `[1,2,3]` | Identity — a size-1 probe must not scramble anything |
| 5 | `head = [1,2,3]`, `k = 3` | `[3,2,1]` | `k = n` → whole-list reversal; head changes; `group_next = None` |
| 6 | `head = [1,2,3,4]`, `k = 3` | `[3,2,1,4]` | Ragged leftover of 1 stays put |
| 7 | `head = [1,2,3,4]`, `k = 2` | `[2,1,4,3]` | `n` a multiple of `k` — no leftover; the probe's early-exit must still fire cleanly after the last group |

Optional robustness note: `head = None` returns `None` with zero extra code (the probe's first step falls off immediately) — worth saying even though the constraints imply `n ≥ 1`.

While coding, dry-run **case 1** and **case 2** line by line (they cover both a mid-list splice and the early-exit), then assert cases 4 and 5 mentally.

---

## 10. Interview Script (fuller talk track)

**Clarify (30 seconds):**
> "Quick confirmations: `k ≤ n` is guaranteed, so at least one full group always exists — correct? Leftover nodes fewer than `k` stay in their original order at the end — not reversed, not dropped. And I can't modify values, so this is pure pointer rewiring. Also, since values can repeat, I'll compare node references, never values."

**Naive first (30 seconds):**
> "The value-array version — copy values out, reverse each block, write them back — is O(n)/O(n) but edits values, which is forbidden. The pointer analog is collecting node references into an array, reversing each block of references, then relinking: correct, O(n) time, O(n) space. I'll start there for the reasoning, then eliminate the array."

**Insight (45 seconds):**
> "Reversing a linked list in place is a two-pointer local operation. If I can reverse a segment that stops at a *boundary node* rather than null, I can process the list group by group: probe k nodes ahead to confirm a full group, reverse that segment in place, and splice it between the previous group's tail and the rest of the list. A dummy node before the head handles the fact that the head itself moves. My invariant: at the top of each round, `group_prev` marks the end of everything already finalized."

**Algorithm pitch (60 seconds):**
> "Loop: from `group_prev`, walk exactly k steps to find `kth`, the group's last node. Fall off the end? Fewer than k remain — return `dummy.next`; that *is* the leftover rule. Otherwise snapshot two boundaries before touching anything: `group_start = group_prev.next`, which becomes the new tail, and `group_next = kth.next`, the stop marker. Reverse `group_start` through `kth` with the standard two-pointer loop, but initialize `prev` to `group_next` and stop at `group_next` — so the new tail is automatically attached to the rest of the list. Then splice: `group_prev.next = kth`, and advance `group_prev` to the old head, which is now the tail. Repeat."

**Code, then dry-run case 1, then complexity:**
> "Each node is touched once by the probe and once by the reversal — O(n) time; a constant number of references — O(1) space; fully iterative, so the follow-up is satisfied. Ω(n) is a floor anyway, since every node's `next` link may change."

---

## 11. Transferable Patterns & Related Problems

**Patterns you just practiced (reusable across the linked-list family):**

- **Sentinel / dummy head** — any problem where the head can change or the first element needs special handling.
- **`reverse(a, stop)` as a subroutine** — the standard two-pointer reversal, parameterized by a stop marker (a node or `None`).
- **Probe before you mutate** — verify feasibility (count k) before irreversible in-place surgery; generalizes to any destructive operation on shared state.
- **Batching with a ragged final batch** — chunked processing where the last chunk may be short; identical shape when chunking arrays.
- **O(1) space via pointer rewiring** — linked lists often admit O(1)-space solutions where an array would need O(n) auxiliary space.

**Related problems:**

| Problem | Relationship to this one |
|---|---|
| LC 206 — Reverse Linked List | The inner subroutine; must be automatic |
| LC 24 — Swap Nodes in Pairs | This problem with `k = 2`; same dummy + probe + splice skeleton |
| LC 92 — Reverse Linked List II | One-shot subrange reversal; reuses `reverse(a, b)` |
| LC 143 — Reorder List | Split + reverse + merge — same toolbox |
| LC 234 — Palindrome Linked List | Find middle + reverse half |
| LC 61 — Rotate List | Moving boundary pointers around a list |
| LC 328 — Odd Even Linked List | Group-relink pattern with two moving tails |

**Variants to volunteer if there's time:** reverse the leftover too (one-line change: drop the probe's early return); reverse *alternate* k-groups (add a toggle to the splice step); what if `k > n` were allowed (the probe already handles it — output equals input).

---

## 12. Say It in 60 Seconds

> "Reverse the list in fixed chunks of k; any final partial chunk stays untouched. My approach: a dummy node anchored before the head, plus a pointer `groupPrev` marking the node just before the current group. Each round, I walk exactly k steps from `groupPrev` to find the group's last node. If I hit null, fewer than k nodes remain, so I return `dummy.next` — leftovers stay as-is. Otherwise I snapshot the node after the group, reverse the segment in place using that snapshot as the stopping point — it's standard two-pointer reversal, just stopping at a node instead of null — then re-splice: `groupPrev` points at the new head, and `groupPrev` moves to the old head, which is now the tail. Every node is touched a constant number of times, so O(n) time; only a handful of references alive, so O(1) space, fully iterative. The critical detail: **always probe before reversing** — if the last group is short, you can't cleanly un-reverse."
