# Reorder List (LeetCode 143) — Complete Interview Lesson

## 1. Problem, restated precisely

You are given `head` of a singly linked list whose nodes, by **original position**, are `L0 → L1 → … → Ln-1 → Ln`. You must rearrange the **nodes themselves** (via `next` pointers) so the list reads:

```
L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → …
```

Three precision points that candidates gloss over:

- **Everything here is positional, not value-based.** `Li` means "the node that was at index `i` in the input." Values are pure payload. Since values can repeat (and with `n` up to 5·10⁴ but only 1000 distinct values, duplicates are *guaranteed* by pigeonhole for large inputs), any logic that identifies nodes by value is doomed from the start. Node identity = object reference, nothing else.
- **"You may not modify the values… only nodes themselves may be changed"** means: you may rewrite `next` pointers, you may not rewrite `val`, and in spirit you should not allocate new nodes — you rewire the existing ones in place.
- **The method returns nothing (void).** The judge re-traverses the list starting from `head` after your call. So the final structure must be a well-formed, **null-terminated** list starting at the original `head` node. A leftover cycle causes an infinite loop on the judge (TLE); a stale extra link changes the length and causes a Wrong Answer.

Example checks: `[1,2,3,4]` → `[1,4,2,3]` (even length), `[1,2,3,4,5]` → `[1,5,2,4,3]` (odd length — note the middle node `3` ends up **last**).

## 2. Constraint decoding — what the problem is telling you

| Constraint | What it really means | Design impact |
|---|---|---|
| `1 <= n <= 5 * 10^4` | Small enough for O(n), too big for O(n²) | O(n²) ≈ 1.25·10⁹ pointer hops for the naive splice → TLE in Python. Target O(n). |
| `1 <= Node.val <= 1000` | Values are irrelevant and may repeat | The algorithm must be completely value-agnostic; identity is by reference. |
| "May not modify values" | Only `next` may change | Kills the "copy values to array, write back interleaved" idea; node-pointer rewiring is legal. |
| Singly linked, no length field | No random access, no `n` given | You must *find* the middle/second half via a scan (fast/slow or counting). |
| Void return, judge re-walks from `head` | Your output is the mutated list itself | Every stale pointer must be overwritten or explicitly nulled; no cycles. |

Also note the two structural regimes: **even n** splits into two equal halves; **odd n** has a lone middle node (index ⌊n/2⌋) that ends up last in the output. Your invariants must handle both without special cases.

## 3. Brute force first — three escalating ideas

### 3.1 Idea A: copy to array, write values back interleaved — *disallowed*

Walk the list into an array of values, then write `a[0], a[n-1], a[1], a[n-2], …` back into the nodes in order. It's O(n)/O(n) and conceptually trivial — **but it writes `node.val`, which the problem explicitly forbids.** In an interview, say this out loud and dismiss it in one sentence; it shows you read the constraints.

### 3.2 Idea B: collect node *references*, rewire pointers — legal, O(n) space

Same scan, but store the nodes themselves, then weave with two indices:

```python
def reorderList_nodes_array(head):
    nodes, cur = [], head
    while cur:
        nodes.append(cur)
        cur = cur.next
    i, j = 0, len(nodes) - 1
    while i < j:
        nodes[i].next = nodes[j]      # L_i -> L_{n-1-i}
        i += 1
        if i == j:                    # odd length: middle node, terminate here
            break
        nodes[j].next = nodes[i]      # L_{n-1-i} -> L_{i+1}
        j -= 1
    nodes[i].next = None              # whoever the loop stopped on is the tail
```

Trace on `[1,2,3,4,5]` (`nodes = [n0..n4]`): `n0.next=n4, n4.next=n1` → `n1.next=n3, n3.next=n2` → loop ends with `i==j==2`, so `n2.next=None`. Result: `n0→n4→n1→n3→n2` = `[1,5,2,4,3]`. ✓

Correct, but it burns O(n) memory. It's a fine fallback to state if you blank on the O(1) solution. (A stack variant — push all nodes, then pop from the stack while walking forward and zip — is the same O(n)-space family.)

### 3.3 Idea C: repeated tail-splice — legal, O(1) space, but O(n²)

Keep a `front` cursor. Repeatedly find the **last** node of the remaining list, detach it, and splice it immediately after `front`; then advance `front` by two (past the spliced-in node).

```python
def reorderList_tail_splice(head):
    if head is None or head.next is None:
        return
    front = head
    while front.next and front.next.next:          # >= 2 nodes remain to reorder
        prev, tail = front.next, front.next.next   # scan to the end
        while tail.next:
            prev, tail = prev.next, tail.next
        prev.next = None                           # detach tail
        tail.next = front.next                     # splice after front
        front.next = tail
        front = tail.next                          # next insertion slot
```

**Worked trace on `[1,2,3,4]`:**

| Round | `front` | Scan finds | Detach | Splice | List now |
|---|---|---|---|---|---|
| 1 | 1 | tail=4, prev=3 | `3.next=None` | `1.next=4; 4.next=2` | `1→4→2→3` |
| 2 | 2 | `front.next=3`, `front.next.next=None` → stop | — | — | `1→4→2→3` ✓ |

**Worked trace on `[1,2,3,4,5]`:**

| Round | `front` | Scan finds | Detach | Splice | List now |
|---|---|---|---|---|---|
| 1 | 1 | tail=5, prev=4 | `4.next=None` | `1.next=5; 5.next=2` | `1→5→2→3→4` |
| 2 | 2 | tail=4, prev=3 | `3.next=None` | `2.next=4; 4.next=3` | `1→5→2→4→3` |
| 3 | 3 | `front.next=None` → stop | — | — | `1→5→2→4→3` ✓ |

Why O(n²): each of the ⌊(n−1)/2⌋ rounds rescans the remaining tail to find the last node, so total scans sum to roughly n + (n−2) + (n−4) + … ≈ n²/4 — about 6·10⁸ hops at n = 5·10⁴, which times out in Python. This is the "correct but too slow" baseline that motivates the real solution.

## 4. The core insight

Look at the target shape again:

```
L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → …
     ↑         ↑         ↑
```

It is exactly: **the first half of the list, in order, zipped with the second half of the list, in reverse.** And "iterate the second half backwards" is something a linked list gives you for free — if you **reverse** that half. So the alien-looking problem decomposes into three textbook primitives:

1. **Find the middle** (slow/fast pointers) and **cut** the list into two halves.
2. **Reverse** the back half in place.
3. **Zip-merge** the two halves alternately.

Each phase is one linear scan over ~n/2 nodes. The meta-lesson for interviews: most linked-list surgery problems are compositions of a small set of primitives (find-middle, reverse-a-section, merge, split). Recognizing the decomposition *is* the solution.

## 5. The optimal approach: find-middle → reverse-back-half → zip-merge

### 5.1 Phase 1 — middle via slow/fast, and the exact split rule

Run `fast` at 2× the speed of `slow`. With the guard `while fast.next and fast.next.next`, `fast` never overshoots past the last node, and `slow` lands on **the last node of the first half**. After `k` loop iterations `slow` is at index `k` and `fast` at index `2k`; the loop exits when `2k+1 ≥ n`, giving exactly `slow` at index ⌈n/2⌉−1.

Consequence (this is the invariant that makes Phase 3 safe): the first half has **⌈n/2⌉** nodes, the second half **⌊n/2⌋** — so **the first half is never shorter than the second**, for both parities. For odd n, the middle node stays in the first half and will end up last.

Then **cut**: record `second = slow.next` and set `slow.next = None`. The cut is not optional decoration — see §8 for the exact bug it prevents.

| n | slow stops at | First half | Second half |
|---|---|---|---|
| 4 (`1,2,3,4`) | index 1 (node 2) | `[1,2]` | `[3,4]` |
| 5 (`1,2,3,4,5`) | index 2 (node 3) | `[1,2,3]` | `[4,5]` |

### 5.2 Phase 2 — cut, then reverse the back half

Standard three-pointer reversal (`prev / curr / nxt`) starting from the back half's head. It automatically null-terminates the reversed half (its old head becomes the tail with `next = None`). First half's internal links are untouched.

### 5.3 Phase 3 — zip-merge, driven by the shorter half

Because `len(first) ≥ len(second)`, drive the loop **off `second`**. Each iteration splices one back-half node into the gap after the current front node. Save both `next` pointers *before* overwriting:

```python
nxt1, nxt2 = first.next, second.next   # save FIRST
first.next = second
second.next = nxt1
first, second = nxt1, nxt2
```

Invariant: before each iteration, remaining-first ≥ remaining-second ≥ 1, so `first` and `first.next` are always safe to read. When the loop ends, `second is None`. Who writes the final `None`? A nice parity detail:
- **Even n:** the last merge iteration sets `second.next = nxt1` where `nxt1 is None` — the merge null-terminates.
- **Odd n:** the leftover node is the middle, and it was already null-terminated by the Phase-2 **cut** (`slow.next = None`), and no merge step ever overwrites it (the middle is only reached as `first` after `second` is already exhausted).

### 5.4 Complete code

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        """Reorder in place. Returns nothing; judge walks from `head`."""
        if head is None or head.next is None:   # n = 1 (defensive; n >= 1 guaranteed)
            return

        # ---- Phase 1: slow ends on the LAST node of the first half ----
        slow = fast = head
        while fast.next and fast.next.next:
            slow = slow.next
            fast = fast.next.next

        # ---- Phase 2: cut, then reverse the back half ----
        second = slow.next
        slow.next = None                        # THE cut — first half terminated
        prev = None
        while second:
            nxt = second.next
            second.next = prev
            prev = second
            second = nxt
        second = prev                           # head of reversed back half

        # ---- Phase 3: zip-merge, driven by the shorter half ----
        first = head
        while second:
            nxt1 = first.next                   # save BEFORE overwriting
            nxt2 = second.next                  # save BEFORE overwriting
            first.next = second
            second.next = nxt1
            first, second = nxt1, nxt2
```

### 5.5 Traces on the official examples

**Example 1: `[1,2,3,4]`**

*Phase 1:* slow=1/fast=1 → check `fast.next=2 ✓, fast.next.next=3 ✓` → slow=2, fast=3 → check `fast.next=4 ✓, fast.next.next=None ✗` → stop. Slow = node 2. Cut: `2.next=None`. First half `1→2`, second-half head = 3.

*Phase 2 (reverse `3→4`):*

| prev | curr | action |
|---|---|---|
| None | 3 | save nxt=4; `3.next=None`; prev=3, curr=4 |
| 3 | 4 | save nxt=None; `4.next=3`; prev=4, curr=None |

Reversed half: `4→3`.

*Phase 3 (first=`1→2`, second=`4→3`):*

| Iter | first | second | nxt1 | nxt2 | Links written |
|---|---|---|---|---|---|
| 1 | 1 | 4 | 2 | 3 | `1→4`, `4→2` |
| 2 | 2 | 3 | None | None | `2→3`, `3→None` |

`second` is None → done: **`1→4→2→3`** ✓ (merge wrote the final `None`, even-length case).

**Example 2: `[1,2,3,4,5]`**

*Phase 1:* slow/fast walk: (1,1) → (2,3) → (3,5) → stop (`fast.next=None`). Slow = node 3. Cut: `3.next=None`. First half `1→2→3`, second half head = 4.

*Phase 2:* reverse `4→5` → `5→4`.

*Phase 3 (first=`1→2→3`, second=`5→4`):*

| Iter | first | second | nxt1 | nxt2 | Links written |
|---|---|---|---|---|---|
| 1 | 1 | 5 | 2 | 4 | `1→5`, `5→2` |
| 2 | 2 | 4 | 3 | None | `2→4`, `4→3` |

Done: **`1→5→2→4→3`** ✓ (the middle node `3` ends last, null-terminated by the cut — odd-length case).

## 6. Complexity

**Optimal solution:** time **O(n)** — three sequential passes, each over at most n/2 nodes; space **O(1)** — a fixed handful of pointers regardless of n. This is also asymptotically tight: every node except (at most) the middle gets a new successor, so any correct solution must read and rewrite Θ(n) links — you cannot beat O(n).

| Approach | Time | Space | Notes |
|---|---|---|---|
| Values → array → write back | O(n) | O(n) | **Disallowed** — mutates `val` |
| Node references → array → rewire | O(n) | O(n) | Legal fallback if stuck; one collect pass + one weave pass |
| Repeated tail-splice (§3.3) | O(n²) | O(1) | Each round rescans the tail; ~n²/4 hops total → TLE at n=5·10⁴ |
| One-walk + stack of nodes | O(n) | O(n) | Push all nodes, pop while weaving |
| Recursive two-pointer mirror | O(n) | O(n) stack | Depth = n → `RecursionError` in Python (default limit 1000) |
| **Mid + reverse + merge** | **O(n)** | **O(1)** | Three half-length passes; the interview target |

On the "one pass?" follow-up: with O(1) extra space you genuinely need the two-phase structure — when you must write `L0.next = Ln`, the node `Ln` is n−1 hops ahead and a single forward sweep hasn't seen it yet, so you either revisit (our second pass) or memorize visited nodes (O(n) stack).

## 7. Tests to propose out loud

Say these before coding — it takes 20 seconds and signals edge-awareness:

1. **`[1,2,3,4]` → `[1,4,2,3]`** — official, even length.
2. **`[1,2,3,4,5]` → `[1,5,2,4,3]`** — official, odd length; middle lands last.
3. **`[7]` → `[7]`** — single node; every loop must no-op.
4. **`[1,2]` → `[1,2]`** — two nodes; the reorder of a 2-list is the identity; checks the fast/slow guard doesn't skip the split.
5. **`[1,2,3]` → `[1,3,2]`** — smallest odd case; middle node must end up *last* with `next = None`.
6. **`[2,2,2,2]`** — duplicate values: the value sequence is unchanged, but node identities must still be permuted correctly (proves you don't rely on values).
7. Mention the judge-side stress case: a 5·10⁴-node chain must terminate (no cycle) — hence the cycle-detecting snapshot helper below.

```python
def build(vals):
    dummy = ListNode(0); cur = dummy
    for v in vals:
        cur.next = ListNode(v); cur = cur.next
    return dummy.next

def snapshot(head):
    """Value sequence with cycle detection (a cycle hangs the judge)."""
    out, seen = [], set()
    while head is not None:
        if id(head) in seen:
            return out + ["<CYCLE>"]
        seen.add(id(head)); out.append(head.val); head = head.next
    return out

def run(vals, expected):
    head = build(vals)
    Solution().reorderList(head)
    got = snapshot(head)
    assert got == expected, f"{vals}: got {got}, want {expected}"

run([1,2,3,4],   [1,4,2,3])
run([1,2,3,4,5], [1,5,2,4,3])
run([7],         [7])
run([1,2],       [1,2])
run([1,2,3],     [1,3,2])
run([2,2,2,2],   [2,2,2,2])
```

## 8. Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| **Forgetting the cut `slow.next = None`** | Stale duplicate link or a cycle. Concrete: on `[1,2,3,4,5]` without the cut, after reversing the back half and merging you get `1→5→2→4→3→4` — node 4 appears twice (stale `3.next`), so the judge reads 6 nodes → Wrong Answer; other inputs can produce a true cycle → TLE. | Cut immediately after locating the middle, before reversing. |
| **Split that leaves the second half longer than the first** (e.g., cut after the *lower* middle) | Merge's `first.next` dereference hits `None` → crash. E.g., `[1,2,3,4]` split as `[1]` + `[4,3,2]`: iteration 2 reads `first.next` with `first is None`. | Keep first = ⌈n/2⌉ with the `fast.next and fast.next.next` guard; drive the merge loop off `second`. |
| **Overwriting `next` before saving it** in reverse/merge | You lose the rest of the list mid-surgery; output is truncated or cyclic. | Temps first: `nxt1, nxt2 = first.next, second.next` (and `nxt = curr.next` in reversal). |
| Rewriting `node.val` from an array | Violates "may not modify values." | Only touch `next`. |
| Allocating new nodes | O(n) extra memory; against the spirit ("only nodes themselves may be changed"). | Rewire the existing nodes. |
| Returning a new head from the void method | The judge ignores the return value and walks the original `head` → sees an unchanged list. | Mutate via pointers; `head` itself never needs to change. |
| Recursive mirror solution in Python | `RecursionError` at depth ≈ 1000 (default limit), n up to 5·10⁴. | Keep all three phases iterative. |
| Assuming values are distinct | Any value-keyed logic breaks; duplicates are guaranteed for n > 1000. | Position/reference-based logic only. |

## 9. Language gotchas (beyond Python)

| Language | Gotcha |
|---|---|
| **Java** | The signature is `public void reorderList(ListNode head)` — reassigning the local `head` parameter can never affect the caller; mutate through `head.next` chains. Also, node identity must be compared by reference (`==`), never by `val` — with ≤ 1000 distinct values, value equality is meaningless here. |
| **Java** | If you fall back to the stack/array idea, store `ListNode` references (not `val`s, and not autoboxed `Integer`s) — otherwise you're back to the disallowed value-rewrite. |
| **C++** | `slow->next = nullptr;` is load-bearing: if nodes come from a pool/test harness where `next` may be uninitialized garbage, skipping the cut leaves a dangling link (undefined behavior or a cycle). |
| **C++** | Avoid the recursive variant: 5·10⁴ frames ≈ several MB of stack, which can overflow the 1 MB default stack on Windows; the iterative three-phase version has no such risk. And don't reach for `std::reverse` — it operates on ranges/iterators, not on hand-rolled list nodes. |

## 10. Transferable patterns and related problems

**Reusable primitives (this problem = their composition):**
- **Fast/slow middle finding** with the ceil-split guard `while fast.next and fast.next.next`.
- **In-place reversal** of a sublist (prev/curr/nxt).
- **Zip-merge driven by the shorter list** — a general trick that eliminates null-checks on the longer list.

**Meta-patterns worth naming in an interview:**
- *Decompose unfamiliar list surgery into known primitives.* Reorder List is literally `876 + 206 + 21` glued together.
- *Simulate backward access by reversing.* A singly linked list can't be read back-to-front — unless you reverse the relevant section first. Same trick powers Palindrome Linked List.
- *State a per-phase invariant* ("first half is never shorter"; "every stale pointer is overwritten or nulled") and verify the code against it — this is how you catch the missing cut before running code.
- *Fallback ladder:* if you blank, say the O(n)-space array/stack version first, then upgrade to O(1). A correct O(n)-space answer beats a fumbled O(1) attempt.

**Directly related problems:** 876 Middle of the Linked List · 206 Reverse Linked List · 234 Palindrome Linked List (mid + reverse + compare — nearly the identical toolkit) · 21 Merge Two Sorted Lists · 328 Odd Even Linked List · 86 Partition List · 61 Rotate List · 24 Swap Nodes in Pairs · 25 Reverse Nodes in k-Group.

## 11. Full interview script (spoken talk track)

> "Let me restate to check understanding: I need to rearrange the nodes — not values — so the list alternates first, last, second, second-to-last, and so on, and the method returns nothing, so the judge will re-walk from `head`. Since the list is singly linked with no length, I can't index into it.
>
> Brute force: dump the node references into an array and weave with two indices — O(n) time but O(n) space. There's also a legal O(1)-space version that repeatedly detaches the tail, but it rescans the list every round, so it's quadratic — too slow for 5·10⁴ nodes.
>
> The observation that unlocks O(1) space: the target is just the first half interleaved with the second half *reversed*. So three standard steps. One: slow/fast pointers to find the middle — with the `fast.next and fast.next.next` guard, slow ends on the last node of the first half, so the first half is never shorter. Two: cut there with `slow.next = None` and reverse the back half in place. Three: zip the halves, driving the loop off the shorter back half, saving next pointers before rewiring.
>
> Two invariants I'm maintaining: the first half is always at least as long as the second, so the merge can't run off the front; and every stale pointer gets either overwritten by the merge or explicitly nulled by the cut, so the final list is null-terminated with no cycle. Odd length is handled for free — the middle node stays in the first half and ends up last.
>
> Complexity: three half-length passes, so O(n) time and O(1) space. Let me code the three phases."

Then code, then: "Testing with the two official examples plus `[7]`, `[1,2]`, and `[1,2,3]` — all fall out of the loops without special-casing."

## 12. Say it in 60 seconds

> "The output is just the first half of the list interleaved with the second half reversed. So, three textbook moves. Find the middle with slow and fast pointers — with the right loop guard, slow lands on the last node of the first half, so the front half is never shorter than the back half. Cut the list there — that null-termination matters — and reverse the back half in place. Then zip the two halves alternately, running the loop off the shorter back half and saving each next pointer before rewiring. That's three half-length passes: O(n) time, O(1) space, and values are never touched. Two bugs to watch: skip the cut and you leak a stale link or a cycle and the judge loops forever; and length one and two should fall out of the loops naturally, no special cases. I'd verify on `[1,2,3,4]` → `[1,4,2,3]` and `[1,2,3,4,5]` → `[1,5,2,4,3]`, where the middle node ends up last."
