# Merge Two Sorted Lists (LeetCode 21) — Complete Interview Lesson

---

## 1. Problem Restated

You're handed the head nodes of two singly linked lists, `list1` and `list2`. Each list is already sorted in **non-decreasing** order (duplicates allowed, both within a list and across lists). You must produce **one** sorted list containing all `m + n` nodes, by **splicing** — i.e., rewiring the `next` pointers of the *existing* nodes rather than allocating new ones — and return the head of the merged result.

Two things the problem statement implies but doesn't shout:

- **"Splicing together the nodes"** is a memory-model requirement: reuse the input nodes. Creating fresh nodes produces the right *values* but misses the point (and costs O(m+n) extra memory).
- **Linked lists have no indices.** All your reasoning must be in terms of *node identity* and *node values*. With duplicate values (the two `1`s and two `4`s in Example 1), "the first 1" and "the second 1" are distinct physical nodes — correctness doesn't depend on which one lands where, but a careful candidate says so out loud.

---

## 2. Decoding the Constraints

| Constraint | What it really tells you |
|---|---|
| 0 to 50 nodes **total** (both lists combined) | Tiny input. Every approach — including the dumbest brute force — passes the judge. This problem is a *pointer-hygiene test*, not a performance test. It's also the merge subroutine of merge sort on lists, which is why interviewers care that you write it cleanly. |
| `-100 <= Node.val <= 100` | Plain integers, no overflow risk, no need for special handling of negatives — comparisons work identically. |
| Sorted in **non-decreasing** order | Duplicates are guaranteed possible. "Non-decreasing" ≠ "strictly increasing." Your tie-breaking (`<` vs `<=`) determines *stability*, which you may be asked about. |
| Either list may be empty | Any solution must handle `[]+[]`, `[]+x`, and `x+[]` without special-case spaghetti — the main motivation for the dummy-node idiom. |

---

## 3. Brute Force: Collect, Sort, Rebuild

**Idea:** Walk both lists, dump all values into an array, sort it, then build a brand-new list from the sorted values.

```python
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        vals = []
        for head in (list1, list2):
            while head:
                vals.append(head.val)
                head = head.next
        vals.sort()                      # ignores that the inputs were already sorted

        dummy = tail = ListNode(0)
        for v in vals:
            tail.next = ListNode(v)      # allocates NEW nodes — not a splice
            tail = tail.next
        return dummy.next
```

**Worked trace on Example 1** — `list1 = [1,2,4]`, `list2 = [1,3,4]`:

1. **Collect pass over `list1`:** visit nodes with values `1, 2, 4` → `vals = [1, 2, 4]`
2. **Collect pass over `list2`:** visit `1, 3, 4` → `vals = [1, 2, 4, 1, 3, 4]`
3. **Sort:** `vals = [1, 1, 2, 3, 4, 4]`
4. **Rebuild:** allocate six fresh nodes `1→1→2→3→4→4`, return the first.

It's correct, but it pays twice for ignoring the input's structure:

- **Time** is O((m+n) log(m+n)) because a comparison sort is used. Comparison sorting needs Ω(n log n) in general because n items have n! possible orderings and a binary comparison can at best halve the candidates per step. Here that's pure waste — the inputs are already sorted, so *no* sorting is needed at all.
- **Space** is O(m+n) for the array **and** it allocates m+n new nodes, violating the splice requirement. Node identity is destroyed — irrelevant when nodes hold only an `int`, but a real bug if nodes carried satellite data.

**Half-step improvement worth mentioning in an interview:** replace `vals.sort()` with the classic two-pointer merge over the two value arrays (the merge step of merge sort). That drops the collection phase to O(m+n) time — but you're still materializing an array and rebuilding nodes. The remaining leap is realizing you can wire the *original nodes* directly.

---

## 4. The Core Insight

> **Because both lists are sorted, the smallest unemitted node is always one of the two current heads.**

Three consequences:

1. **Two-finger merge:** keep one pointer per list. Compare the two head values, attach the smaller node to the result, advance *only that* pointer. Repeat.
2. **Dummy (sentinel) head:** you don't know in advance *which* list's first node becomes the result's head. A throwaway dummy node sits before everything, so every attachment — including the very first — is the same uniform `tail.next = ...` statement. No `if this-is-the-first-node` branching.
3. **O(1) remainder splice:** when one list is exhausted, the other list is *already sorted* and its nodes are untouched — so attach its entire remainder with a single pointer assignment instead of looping node by node.

**Termination/progress invariant** (say this — it's what separates strong candidates): *every loop iteration attaches exactly one node and advances exactly one pointer.* Since pointers only move forward and each advance is permanent, the loop runs at most m+n−1 iterations. That's a one-line proof of both correctness and linear time.

**Stability detail:** using `<=` (ties go to `list1`) makes the merge *stable* — among equal values, nodes from `list1` precede nodes from `list2`. Using `<` is equally correct here (ties go to `list2`) but is not stable. Know which one you wrote.

---

## 5. Optimal Approach: Dummy Head + Tail Splice

### Algorithm

1. Create `dummy` (a sentinel node; its value is never read) and `tail = dummy` — `tail` always points to the last node of the merged result so far.
2. While **both** `list1` and `list2` are non-null: compare `list1.val` and `list2.val`; set `tail.next` to the smaller node, advance that list's pointer, then advance `tail = tail.next`.
3. After the loop, exactly one of the lists still has nodes (or both are empty): `tail.next = list1 if list1 else list2`.
4. Return `dummy.next` — **not** `dummy`.

### Python

```python
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)          # sentinel; value never read
        tail = dummy                 # last node of the merged result so far

        while list1 and list2:
            if list1.val <= list2.val:   # ties go to list1 -> stable merge
                tail.next = list1
                list1 = list1.next
            else:
                tail.next = list2
                list2 = list2.next
            tail = tail.next

        # Exactly one list (possibly neither) still has nodes; splice it whole.
        tail.next = list1 if list1 else list2
        return dummy.next
```

### Full trace on Example 1 — `list1 = [1,2,4]`, `list2 = [1,3,4]`

Name the nodes so duplicates are unambiguous: `list1 = A(1) → B(2) → C(4)`; `list2 = D(1) → E(3) → F(4)`.

| Step | `list1` | `list2` | Comparison | Action | Result so far (values, with node ids) |
|---|---|---|---|---|---|
| init | A(1) | D(1) | — | `tail = dummy` | `dummy` |
| 1 | A(1) | D(1) | 1 ≤ 1 → tie | attach **A**; `list1 = B` | dummy → 1[A] |
| 2 | B(2) | D(1) | 2 > 1 | attach **D** (`A.next = D`); `list2 = E` | dummy → 1[A] → 1[D] |
| 3 | B(2) | E(3) | 2 ≤ 3 | attach **B**; `list1 = C` | dummy → 1,1,2[B] |
| 4 | C(4) | E(3) | 4 > 3 | attach **E**; `list2 = F` | dummy → 1,1,2,3[E] |
| 5 | C(4) | F(4) | 4 ≤ 4 → tie | attach **C**; `list1 = None` | dummy → 1,1,2,3,4[C] |
| exit | None | F(4) | — | `tail.next = F` (whole remainder) | dummy → 1[A],1[D],2[B],3[E],4[C],4[F] |

Return `dummy.next = A`. Output: `[1,1,2,3,4,4]` ✓. Note that at step 5 the tie went to `list1` (node C before node F) — that's the stable tie-break, and it's visible in the final node ordering even though the *values* alone can't show it.

### Examples 2 and 3 (trivial-path traces)

- **Example 2:** `list1 = None`, `list2 = None` → the `while` condition is false immediately → `tail.next = list1 if list1 else list2` sets `tail.next = None` → return `dummy.next = None` → `[]` ✓. No special-case code was executed; the empty case falls out of the main loop.
- **Example 3:** `list1 = None`, `list2 = G(0)` → loop skipped → `tail.next = G` → return `G` → `[0]` ✓.

### Recursive variant (know it, but flag its cost)

```python
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        if not list1: return list2   # both guards are mandatory:
        if not list2: return list1   # without the second, list1.val crashes on None
        if list1.val <= list2.val:
            list1.next = self.mergeTwoLists(list1.next, list2)
            return list1
        else:
            list2.next = self.mergeTwoLists(list1, list2.next)
            return list2
```

Elegant, but recursion depth equals the number of nodes emitted — up to m+n frames. With n ≤ 50 that's harmless; with large inputs it's a stack-overflow bug. Say that trade-off out loud; it signals you understand the recursion, not just that it compiles.

### What to say while coding (full interview script)

> "Since both lists are sorted, the next smallest node overall is always one of the two heads, so I'll do a two-pointer merge. I'll hang the result off a dummy node so I never special-case the first attachment, and I'll keep a tail pointer for O(1) appends. Each iteration attaches exactly one node and advances exactly one pointer, so the loop makes monotone progress and terminates in at most m plus n steps. When one list runs out, the other is already sorted, so I splice its remainder with one assignment instead of looping. I'm using `<=` on ties so equal values from list1 stay in front — a stable merge — and I'm rewiring the original nodes rather than allocating new ones, which is what 'splicing' asks for and keeps extra space at O(1). Empty lists need no special code: the loop just never runs and the remainder attach returns whichever list is non-empty."

---

## 6. Complexity Table

| Approach | Time | Extra space | Reuses input nodes? | Notes |
|---|---|---|---|---|
| Collect values + sort + rebuild | O((m+n) log(m+n)) | O(m+n) | ❌ new nodes | Ignores that inputs are pre-sorted |
| Two-pointer merge of value arrays + rebuild | O(m+n) | O(m+n) | ❌ new nodes | Right algorithm, wrong memory model |
| **Iterative dummy + tail splice** | **O(m+n)** | **O(1)** | ✅ splice | The expected answer |
| Recursive splice | O(m+n) | O(m+n) call stack | ✅ splice | Depth = nodes emitted; fine at n ≤ 50 |

**Why O(m+n) time:** each loop iteration advances one pointer permanently, plus one O(1) remainder attachment — every node is touched a constant number of times.

**Why you can't do better (say this if pushed):** any correct algorithm must emit all m+n nodes into the output, so Ω(m+n) time is forced by the output size alone.

**Follow-up ammo — comparison count:** in the comparison model, merging needs at least ⌈log₂ C(m+n, m)⌉ comparisons in the worst case, because there are C(m+n, m) distinct valid interleavings of the two lists and each binary comparison can at best halve the set of consistent interleavings. Our algorithm uses at most m+n−1 comparisons, which comfortably covers that bound.

---

## 7. Common Mistakes

1. **Not advancing the picked pointer.** Attaching `list1` but forgetting `list1 = list1.next` leaves the loop comparing the same head forever → infinite loop (or a self-cycle in the list). Each iteration must attach *and* advance.
2. **Forgetting the remainder splice.** With `while list1 and list2`, the loop exits when *either* list empties; if you don't then write `tail.next = list1 if list1 else list2`, you silently drop the entire tail of the other list. Symptom: output shorter than m+n.
3. **Returning `dummy` instead of `dummy.next`.** The sentinel is not part of the answer. Classic silent bug — the judge reports a wrong first value or an extra leading 0.
4. **Advance/reassign in the wrong order.** Do `tail.next = node` → advance the picked pointer → `tail = tail.next`. If you overwrite `list1` *before* assigning `tail.next = list1`, you've skipped a node.
5. **One-sided empty handling (recursive version).** `if not list1: return list2` without the mirror guard `if not list2: return list1` crashes with `NoneType`/null dereference when `list2` is empty.
6. **`<` vs `<=` without knowing the consequence.** Both produce a correctly sorted list here, but they differ in *which physical node* lands first on ties — i.e., stability. If the interviewer asks "is your merge stable?", you must be able to point at your comparison and answer.
7. **Not realizing you're mutating the inputs.** Splicing rewires the original nodes; `list1` and `list2` no longer exist as independent lists afterward. If the caller expects them intact, you'd need to deep-copy — worth one clarifying sentence: *"May I consume/mutate the input lists? Splicing implies yes."*

**Post-coding self-check:** result length is exactly m+n → walk it and confirm non-decreasing values → confirm the last node's `next` is `None` (no cycle) → you returned `dummy.next`.

---

## 8. Language Gotchas

| Language | Gotcha |
|---|---|
| **Python** | `tail.next = list1 or list2` works because `ListNode` objects are truthy unless `None`, but write the explicit `list1 if list1 else list2` — it's unambiguous and survives refactoring. Also never name a local variable `list` (shadows the builtin); LeetCode's `list1`/`list2` parameter names are fine. |
| **Java** | If you brute-force via values, note `Arrays.sort(int[])` (dual-pivot quicksort) is **not stable**, while `Arrays.sort(Object[], cmp)` is — irrelevant for bare `int` values, but it decides which duplicate's satellite data survives. Also: recursion depth — the default JVM stack overflows at roughly tens of thousands of frames, so the recursive version is only a habit for small inputs. `new ListNode()` uses the class's default (`val = 0, next = null`) in LeetCode's definition. |
| **C++** | If you define your own `ListNode`, initialize `next(nullptr)` — walking an uninitialized `next` is undefined behavior (LeetCode's provided struct already does this). Return `dummy.next`, never `&dummy`: the sentinel is stack-local and returning its address dangles. Don't `delete` any node during the splice — you're re-linking caller-owned nodes, not managing new allocations. |

---

## 9. Test Plan — Propose These Out Loud

State these before or right after coding; it demonstrates edge-case discipline:

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | `[1,2,4]`, `[1,3,4]` | `[1,1,2,3,4,4]` | Official: interleaving + duplicate values **across** lists (two 1s, two 4s are distinct nodes) |
| 2 | `[]`, `[]` | `[]` | Official: both empty — loop never runs, remainder attach yields `None` |
| 3 | `[]`, `[0]` | `[0]` | Official: one-sided empty |
| 4 | `[0]`, `[]` | `[0]` | The **mirror** of #3 — catches code that only handled one empty side |
| 5 | `[2,2,2]`, `[2,2]` | `[2,2,2,2,2,2]` | All ties: no infinite loop, correct count (m+n = 6); if asked, `list1`'s nodes come first (stable) |
| 6 | `[1,2,3]`, `[10,20]` | `[1,2,3,10,20]` | Disjoint ranges: exercises the O(1) remainder-splice fast path, and the first comparison decides the head (dummy correctness) |
| 7 | `[2]`, `[1]` | `[1,2]` | Single nodes each: head selection with the *smaller* value coming from `list2` |

Also reason once about negatives (e.g., `[-3,-1]` + `[-2,0]` → `[-3,-2,-1,0]`): signs change nothing because we only ever compare, never arithmetic.

---

## 10. Transferable Patterns & Related Problems

**Patterns you just used (name them in interviews):**

- **Sentinel/dummy head** — kills the "is this the new head?" special case for any problem that builds or restructures a list from the front.
- **Two-finger merge** — the combine step of merge sort; `<=` makes it stable.
- **Tail-pointer accumulation** — O(1) appends while building a list.
- **Fast-path remainder splice** — when one input is exhausted, attach what's left in O(1) instead of iterating.
- **Monotone-progress invariant** — "each iteration consumes exactly one node" is your one-line proof of termination and linear time.

**Where this exact code reappears:**

| Problem | Connection |
|---|---|
| LC 23 — Merge k Sorted Lists | Generalization. Pairwise divide-and-conquer merging costs O(N log k) total because each of the N nodes participates in exactly one merge per level and there are ⌈log₂ k⌉ levels; a min-heap of the k current heads achieves the same O(N log k) since each of N nodes incurs one O(log k) heap operation. |
| LC 88 — Merge Sorted Array | The array twin. Arrays force merging **back-to-front** (largest first) to avoid overwriting unread elements — a great contrast showing why node splicing is structurally easier than array index juggling. |
| LC 148 — Sort List | Merge sort on a linked list: your `mergeTwoLists` *is* the combine step; the overall sort is O(n log n) time with O(log n) stack for the top-down variant. |
| LC 86 — Partition List | Same dummy + tail pattern, with a predicate instead of a value comparison. |
| LC 2 — Add Two Numbers | Same dummy-head build; different per-node logic (digit sum + carry). |
| LC 160 — Intersection of Two Linked Lists | The other two-pointer-on-lists staple interviewers pair with this one. |

---

## 11. Say It in 60 Seconds

> "Both inputs are already sorted, so the smallest remaining node is always sitting at one of the two heads. I'll merge with two pointers: compare the head values, attach the smaller node to a result tail, and advance just that list. I'll hang everything off a dummy node so I never special-case the first attachment, and keep a tail pointer for constant-time appends. Each iteration emits exactly one node and advances one pointer, so after at most m plus n steps one list is empty — and since the leftover list is already sorted, I splice its remainder on with a single assignment. Time is linear in total nodes; extra space is constant, because I'm rewiring the original nodes rather than allocating new ones — that's what 'splicing' means here. Ties use less-than-or-equal so equal values from list1 stay in front, making the merge stable. Empty lists need no special code: the loop just never runs and the remainder attach returns whichever list survives."

*(≈160 words — recite it while writing the dummy node; by the time you finish the sentence, the loop body is on the board.)*
