# Merge k Sorted Lists — Complete Interview Lesson

## 1. Problem, Restated

You're given `k` singly linked lists stored in an array `lists`. Each list is already sorted ascending. You must merge **all** of them into **one** sorted linked list and return its **head node**.

Three things worth stating out loud before coding (interviewers reward this):

- **You return a node, not an array.** The output is a linked list; the judge will traverse it.
- **Node reuse is the convention.** On LeetCode you relink the existing nodes rather than allocating new ones — so "extra space" excludes the output itself. If an interviewer wants the input preserved, that's a clarifying question, not a silent assumption.
- **Values are not positions.** Values may repeat across lists (the `1` and `4` in Example 1 each appear twice) and every duplicate must appear in the output. Nothing about an output node's position maps back to an input index.

## 2. Decoding the Constraints

| Constraint | What it really tells you |
|---|---|
| `k ≤ 10^4` | The number of lists can be huge. Any algorithm that is **O(N·k)** (e.g., merging lists one at a time) does ~10^8 operations → TLE, especially in Python. |
| `len(lists[i]) ≤ 500`, **sum of lengths ≤ 10^4** | Define **N = total node count ≤ 10^4**. With k up to 10^4, the *average* list can have length ~1 — many lists may be empty or tiny. Algorithms must not assume lists are long. |
| Values in `[−10^4, 10^4]` | Negative values are legal. In C++/Java, no overflow risk for values themselves; only naive `a.val - b.val` comparators need a thought (safe here, see §8.2). |
| Each list already sorted ascending | The entire problem is *exploiting* this. Sorting anything from scratch throws away free information. |
| `lists = []` (k=0) and `[[]]` (a list containing an empty list) are valid | Two distinct edge cases that both must return `null`/`None`. In Python, `[[]]` arrives as `[None]` — an array holding a `None` head. |

## 3. Brute Force (and Why It's Not Enough)

### 3.1 Flatten → Sort → Rebuild

Walk every list, collect the values (or node references), sort, relink.

```python
def mergeKLists_bruteforce(lists):
    nodes = []
    for head in lists:                      # k lists
        while head:                         # total N node visits
            nodes.append(head)
            head = head.next
    nodes.sort(key=lambda n: n.val)         # O(N log N)
    dummy = ListNode()
    tail = dummy
    for n in nodes:                         # rebuild the chain
        tail.next = n
        tail = n
    tail.next = None
    return dummy.next
```

**Worked trace on Example 1** (`[[1,4,5],[1,3,4],[2,6]]`):

| Phase | State |
|---|---|
| Collect (walk L0, L1, L2) | `[1,4,5, 1,3,4, 2,6]` |
| Sort | `[1,1,2,3,4,4,5,6]` |
| Relink | `1→1→2→3→4→4→5→6` ✓ |

Cost: **O(N log N)** time, **O(N)** space. It's correct, but it ignores that each list is pre-sorted. (And it *must* pay N log N in the comparison model: the N collected values could be in any of N! orders, and each comparison only splits the candidate orderings in half — so Ω(N log N) comparisons are inherent to sorting unstructured input.)

### 3.2 Merge the lists one at a time

Merge `lists[0]` with `lists[1]`, then merge that result with `lists[2]`, and so on (LC 21 as the primitive).

**Trace on Example 1:**
- Merge `[1,4,5]` + `[1,3,4]` → `[1,1,3,4,4,5]` (≈6 comparisons).
- Merge `[1,1,3,4,4,5]` + `[2,6]`: walk the accumulator: `1≤2 → 1`, `1≤2 → 1`, `3>2 → 2`, then `3,4,4,5` each compared against `6`, then append `6` → `[1,1,2,3,4,4,5,6]` ✓ (≈8 comparisons).

Total ≈ 14 here, but in general the accumulator keeps *growing*, so the i-th merge costs ~N → **O(N·k)** time. With k = N = 10^4 that's ~10^8 — dead on arrival, while the optimal solutions below do ~1.4×10^5 operations.

## 4. The Core Insight

> **The next smallest element in the merged output is always the minimum of the ≤ k current head nodes.**

Why: within each list, nodes can only be consumed front-to-back (the list is sorted and singly linked). So at any moment, the smallest *not-yet-output* node of each list is exactly its current head. The global next output must be one of those heads.

That reframes the problem as: **repeatedly extract the min of a set of ≤ k candidates, then replace that candidate with its successor.** A min-heap does exactly this in O(log k) per operation. Alternatively, halving the number of lists by pairwise merging (divide & conquer) also keeps total work at N per "round" of candidates.

## 5. Optimal Approach #1 — Min-Heap of Current Heads

Keep at most **one node per list** in the heap (its current head). Pop the min, attach it to the output, and push that node's successor.

```python
import heapq
from typing import List, Optional

def mergeKLists(lists: List[Optional[ListNode]]) -> Optional[ListNode]:
    # Seed with the head of each NON-EMPTY list.
    # Tuple = (value, list index, node). The index breaks ties so Python
    # never falls through to comparing ListNode objects (which would raise TypeError).
    seed = [(head.val, i, head) for i, head in enumerate(lists) if head]
    heapq.heapify(seed)                     # O(k), better than k pushes O(k log k)

    dummy = ListNode()
    tail = dummy
    while seed:
        _, i, node = heapq.heappop(seed)
        tail.next = node                    # append to output
        tail = node
        if node.next:                       # refill from the same list
            heapq.heappush(seed, (node.next.val, i, node.next))
    return dummy.next
    # (No need to sever tail.next: the final popped node provably has next == None,
    #  because otherwise its successor would still be in the heap.)
```

Note the tie-breaker is *safe*: each list contributes at most one node to the heap at any time, so list indices in the heap are always unique. (`itertools.count()` works too.)

### Trace on Example 1 — `[[1,4,5],[1,3,4],[2,6]]`

Heap entries shown as `(value, list index)`. Seed: `{(1,0), (1,1), (2,2)}`.

| Step | Popped | Output so far | Pushed | Heap after |
|---|---|---|---|---|
| 1 | (1,**0**) | 1 | (4,0) | {(1,1),(2,2),(4,0)} |
| 2 | (1,**1**) | 1,1 | (3,1) | {(2,2),(3,1),(4,0)} |
| 3 | (2,**2**) | 1,1,2 | (6,2) | {(3,1),(4,0),(6,2)} |
| 4 | (3,**1**) | 1,1,2,3 | (4,1) | {(4,0),(4,1),(6,2)} |
| 5 | (4,**0**) ← tie broken by index | 1,1,2,3,4 | (5,0) | {(4,1),(5,0),(6,2)} |
| 6 | (4,**1**) | 1,1,2,3,4,4 | — (successor is None) | {(5,0),(6,2)} |
| 7 | (5,**0**) | 1,1,2,3,4,4,5 | — | {(6,2)} |
| 8 | (6,**2**) | 1,1,2,3,4,4,5,6 | — | {} ✓ |

Both duplicate `1`s and both duplicate `4`s appear; the index tie-breaker makes behavior deterministic (lower list index first — a stable merge, though stability isn't required since equal values are indistinguishable).

### Examples 2 and 3 fall out for free

- **Example 2** (`lists = []`): the seed comprehension yields an empty list → the loop never runs → return `dummy.next` = `None`. ✓
- **Example 3** (`lists = [[]]`, i.e., `[None]`): the `if head` filter skips the empty list → same as above. ✓

No special-casing needed — that's the sign of a clean implementation.

### Why it's correct (one invariant)

At every step, the heap contains exactly the current head of every not-yet-exhausted list, and every remaining node in every list is ≥ its own list's head. When we pop head `h` of list *j*, the only new candidate from list *j* is `h.next ≥ h`, and `h` was a global minimum — so the invariant is preserved and each pop is the true global min.

## 6. Optimal Approach #2 — Pairwise Divide & Conquer

Merge lists two at a time; each pass halves the number of surviving lists. log₂k passes, and each pass relinks every node at most once → N nodes touched per pass.

```python
def mergeTwo(a: Optional[ListNode], b: Optional[ListNode]) -> Optional[ListNode]:
    dummy = ListNode()
    tail = dummy
    while a and b:
        if a.val <= b.val:          # <= keeps behavior deterministic on ties
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a else b       # append the non-exhausted remainder
    return dummy.next

def mergeKLists(lists: List[Optional[ListNode]]) -> Optional[ListNode]:
    if not lists:
        return None
    n = len(lists)
    stride = 1
    while stride < n:
        # merge lists[i] with lists[i+stride]; i+stride <= n-1 is guaranteed,
        # so an odd trailing list simply waits for a later pass
        for i in range(0, n - stride, 2 * stride):
            lists[i] = mergeTwo(lists[i], lists[i + stride])
        stride *= 2
    return lists[0]
```

This in-place slot overwriting is safe: absorbed slots (`i + stride`) are never read again, because later passes only read indices that are multiples of the new stride — exactly the surviving merged heads.

### Trace on Example 1 (n = 3)

| Pass | Pairs merged | Result |
|---|---|---|
| stride = 1 | L0=[1,4,5] + L1=[1,3,4] | `lists[0] = [1,1,3,4,4,5]`; L2=[2,6] waits (no L3 to pair with) |
| stride = 2 | `lists[0]` + L2=[2,6] | walk: 1,1 ≤ 2 → then 2, then 3,4,4,5 ≤ 6, append 6 → `[1,1,2,3,4,4,5,6]` ✓ |

Examples 2/3: `n = 0` → early return `None`; `n = 1` with a `None` head → `while` loop never runs, return `lists[0]` = `None`. ✓

## 7. Complexity Comparison

N = total nodes (≤ 10^4), k = number of lists (≤ 10^4).

| Approach | Time | Extra space (beyond output) | At k = N = 10^4 | Notes |
|---|---|---|---|---|
| Flatten + sort | O(N log N) | O(N) | ~1.3×10^5 comparisons | Ignores pre-sorted input; O(N) buffer |
| Sequential one-at-a-time | O(N·k) | O(1) | ~10^8 → TLE | Accumulator keeps growing |
| **Min-heap of heads** | **O(N log k)** | **O(k)** | ~1.4×10^5 heap ops | ≤ N pushes + N pops on a heap ≤ k; works online/streaming |
| **Pairwise D&C (iterative)** | **O(N log k)** | **O(1)** | ~1.4×10^5 links | No heap; log k passes × O(N) relinks. Recursive version: O(log k) stack — depth 14 here, fine |

Two honest nuances to volunteer:

- **Both optimal solutions match the theoretical floor.** In the comparison model, a k-way merge can emit any of ≈ N!/(⌈N/k⌉!)^k ≈ k^N interleavings, so distinguishing them needs log₂(k^N) = Ω(N log k) comparisons — the heap and D&C are asymptotically optimal, worth saying if asked "can we do better?"
- **At these specific constraints, heap vs. flatten-sort look similar** (log k ≈ log N ≈ 13–14 when k ≈ N). The O(N log k) advantage is dramatic when N ≫ k (e.g., 10 lists of a million elements: log k ≈ 3 vs. log N ≈ 20). Interviewers are testing whether you *see* the structure, so lead with the heap/D&C anyway.

## 8. Common Mistakes

### 8.1 Logic and algorithm mistakes

1. **Pushing all N nodes into the heap up front** → O(N log N), defeating the entire point. Only ≤ k nodes (one head per list) belong in the heap; push successors lazily as you pop.
2. **Comparing ListNodes in the heap.** In Python, `(node.val, node)` raises `TypeError: '<' not supported between instances of 'ListNode'` the first time two values tie. Always include a unique integer tie-breaker.
3. **Forgetting the dummy head.** The first popped node becomes the answer's head; without a dummy you get special-case head surgery and, usually, a bug. Return `dummy.next`, not `dummy`.
4. **Not skipping `None` heads when seeding** — crashes or corrupts on `lists = [[]]` or any array containing empty lists.
5. **D&C off-by-one:** iterating `i` over the full range and accessing `lists[i + stride]` out of bounds. Guard with `range(0, n - stride, 2*stride)` so `i + stride ≤ n − 1`.
6. **D&C slot corruption:** re-reading an absorbed slot in a hand-rolled in-place merge → nodes get relinked twice and chains alias each other. Stick to the stride-doubling pattern where absorbed slots are never read again.
7. **Calling the sequential merge "O(N log k)."** It's O(N·k). Mislabeling complexity in an interview is costly.
8. **Losing duplicates** by using set/dedup logic anywhere, or **returning a values array** instead of relinking nodes.

### 8.2 Language gotchas

| Language | Gotcha |
|---|---|
| **Python** | `heapq` has no `key=` argument, so the `(val, idx, node)` tuple is the idiomatic min-heap trick. `heapify` (O(k)) beats k individual pushes (O(k log k)) — minor but free. |
| **Java** | `new PriorityQueue<ListNode>()` with no comparator throws `ClassCastException` at runtime — `ListNode` isn't `Comparable`. Pass `(a, b) -> Integer.compare(a.val, b.val)`. (`a.val - b.val` happens to be safe here since |vals| ≤ 10^4 ⇒ |diff| ≤ 2×10^4, but `Integer.compare` is the overflow-proof habit.) Avoid heaping boxed `Integer` values — pointless autoboxing churn. |
| **C++** | `std::priority_queue` is a **max-heap by default** — forgetting the comparator silently produces descending output. Use `priority_queue<ListNode*, vector<ListNode*>, Cmp>` with `Cmp` returning `a->val > b->val` (strict weak ordering; using `>=` is undefined behavior). |

## 9. Test Cases to Propose Out Loud

Say these before coding (they double as your clarifying questions) or immediately after:

| # | Input | Expected output | What it probes |
|---|---|---|---|
| 1 | `[[1,4,5],[1,3,4],[2,6]]` (official) | `[1,1,2,3,4,4,5,6]` | General k-way merge; duplicates **1** and **4** across lists must both survive |
| 2 | `[]` (official) | `[]` | k = 0 — heap never seeded / D&C early return |
| 3 | `[[]]` (official) | `[]` | Array containing an empty list — `None` head must be skipped |
| 4 | `[[1,2,3]]` | `[1,2,3]` | k = 1: heap should degrade to a linear walk, not N log N |
| 5 | `[[],[],[]]` | `[]` | All lists empty — same as #3 but multiple Nones |
| 6 | `[[1,1,1],[1,1]]` | `[1,1,1,1,1]` | All-equal values — stresses the tie-breaker; heap must not crash comparing nodes |
| 7 | `[[-5,-3],[-2,0],[-10000,10000]]` | `[-10000,-5,-3,-2,0,10000]` | Negatives and extreme values |
| 8 | `[[1,2,3,4,5],[0],[-1]]` | `[-1,0,1,2,3,4,5]` | One long list + singletons — mirrors the constraint regime (k large, average length ~1); checks the long list is drained without wasted work |

## 10. Transferable Patterns & Related Problems

| Pattern | Essence | Where it reappears |
|---|---|---|
| **K-way merge with a heap** | The global next element lives among the k local fronts | LC 632 Smallest Range Covering Elements from K Lists; LC 373 Find K Pairs with Smallest Sums; merging sorted files on disk (external merge sort — a systems-interview staple: the heap version *is* how the final merge phase works) |
| **Divide & conquer over "mergeable units"** | Halve the candidate set each pass, linear work per pass | LC 148 Sort List (merge sort on a linked list); any "combine pairwise until one remains" reduction |
| **Two-pointer sorted merge** | The O(m+n) primitive everything above reduces to | LC 21 Merge Two Sorted Lists; LC 88 Merge Sorted Array (backwards-fill variant) |
| **Lazy pointer/heap advancement** | Advance one cursor per pop instead of materializing everything | LC 264 Ugly Number II; streaming/top-k problems where input arrives over time |

## 11. Full Interview Talk Track

> "Since every list is already sorted, this is a **k-way merge**. My first instinct is the key observation: at any moment, the smallest remaining element overall must be the current head of one of the k lists — each list can only be consumed front to back. So I'll keep the k current heads in a **min-heap**. Pop the min, append it to the output, and push that node's successor from the same list. That's N pops and pushes on a heap of size at most k, so **O(N log k) time and O(k) space**, and it even works if the lists arrive as a stream. For ties on equal values I'll break deterministically with the list index so I never compare node objects.
>
> If you'd rather avoid a heap, the same bound comes from **divide and conquer**: merge lists pairwise, halving the count each round — log k rounds, each round relinks every node once, so O(N log k) with O(1) extra space. This is optimal: a k-way merge needs Ω(N log k) comparisons since there are about k-to-the-N possible interleavings.
>
> The brute forces I'd reject: flatten-and-sort is O(N log N) plus an O(N) buffer and ignores the input's sortedness; merging lists one at a time is O(N·k), which is ~10^8 given k can be 10^4.
>
> Edge cases: empty input array, an array of empty lists, a single list, and heavy duplicates. A dummy head plus 'skip None heads when seeding' handles all of them with no special-casing. I'll reuse the existing nodes rather than allocating, unless you want the input preserved."

## 12. Say It in 60 Seconds

> "K sorted lists, one merged output. Brute force is flatten-and-sort — N log N, and it throws away the fact that the lists are already sorted. Merging lists one at a time is N·k, which dies at k equals ten thousand. The insight: the next smallest element overall is always one of the k current heads. So keep those heads in a min-heap: pop the min, attach it to the answer, push that node's successor. N pops and pushes on a heap of size at most k gives **N log k time, k space** — and that's provably optimal, since a k-way merge has about k-to-the-N possible interleavings. Same bound, no heap: divide and conquer — merge lists pairwise, halving the count each pass, log k passes of linear relinking, O(1) extra space. Edge cases — empty array, arrays containing empty lists, single list, duplicates — are all handled free by seeding only non-None heads and using a dummy node; I tie-break equal values with the list index so the heap never compares node objects. I'd code the heap version: seed, pop-push loop, return dummy dot next."
