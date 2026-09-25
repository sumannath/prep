# Add Two Numbers — Complete Interview Lesson

## 1. Restating the problem (say it back before coding)

You're given two **singly linked lists**. Each node holds exactly **one decimal digit (0–9)**. The digits are stored in **reverse order**: the **head is the least-significant digit** (the ones place), the second node is the tens place, and so on. Return the sum as a new linked list in the **same reversed format**.

```
l1: 2 → 4 → 3   represents 342   (head 2 = ones, 4 = tens, 3 = hundreds)
l2: 5 → 6 → 4   represents 465
out: 7 → 0 → 8  represents 807
```

Precision points to state out loud:

- **There are no indices in a linked list.** Define the *column* `i` as the `i`-th node from the head (0-based); it carries the digit for place value `10^i`. `node.val` is a digit, not a position.
- **Duplicate values are normal.** Example 3 has seven nodes all holding `9`. Nothing in this problem keys off value uniqueness — don't reach for a hash map.
- **"No leading zeros" is about the tail, not the head.** The most significant digit is the *last* node, so a valid input never ends in `0` unless the number is `0` itself. A head `0` is fine (e.g., `[0,1]` is the number 10).
- Inputs are guaranteed **non-empty**; the two lists **may have different lengths**.

---

## 2. Decoding the constraints

| Constraint | What it really tells you |
|---|---|
| Lengths in `[1, 100]` | The numbers can have **up to 100 digits** — roughly `10^100`. A 64-bit integer tops out near `1.8 × 10^19` (because `2^64 ≈ 1.84 × 10^19`, i.e. ~19 digits), so *"just convert to an int"* is impossible in Java/C++ and only a Python crutch. |
| `0 <= Node.val <= 9` | Each column sums to at most `9 + 9 + 1 = 19`, so the **carry out is always 0 or 1** — carry can never exceed one digit. |
| No leading zeros (except `0`) | Representation is **unique**, and a correct output never ends with a spurious `0` node: the final node is either a real nonzero digit or the final carry of `1`. |
| Digits stored reversed | Head-first traversal = grade-school addition order. **This is a gift** — no reversal, no stack, one clean pass. |
| (Derived) output size | Both addends are `< 10^max(n,m)`, so the sum is `< 2 · 10^max(n,m) < 10^(max(n,m)+1)` → the answer has **at most `max(n,m) + 1` nodes**. |

The single most important sentence in this problem: **because the head is the ones place, "walk both lists from the head" *is* "add from right to left."** The reversed storage exists precisely so you can add in a single forward pass.

---

## 3. Brute force: convert → add → convert back

The idea every candidate reaches for first: read each list into an integer, add the integers, then peel digits off the sum (least-significant first) to build the output.

```python
def addTwoNumbers_bf(l1: ListNode, l2: ListNode) -> ListNode:
    def to_int(node: ListNode) -> int:
        num, place = 0, 1
        while node:
            num += node.val * place   # position i from head = the 10^i place
            place *= 10
            node = node.next
        return num

    total = to_int(l1) + to_int(l2)

    if total == 0:                    # edge case: 0 + 0 must yield [0], not an empty list
        return ListNode(0)

    dummy = tail = ListNode(0)
    while total > 0:
        total, digit = divmod(total, 10)   # peel least-significant digit first
        tail.next = ListNode(digit)
        tail = tail.next
    return dummy.next
```

### Worked trace on Example 1: `l1 = [2,4,3]`, `l2 = [5,6,4]`

**Step 1 — read `l1`:**

| i (column) | node.val | place = 10^i | running num1 |
|---|---|---|---|
| 0 | 2 | 1 | 2 |
| 1 | 4 | 10 | 42 |
| 2 | 3 | 100 | **342** |

Same for `l2` → 5, 65, **465**. `total = 342 + 465 = 807`.

**Step 2 — build the output:**

| iteration | total before | digit = total % 10 | total after | list so far |
|---|---|---|---|---|
| 1 | 807 | 7 | 80 | `7` |
| 2 | 80 | 0 | 8 | `7 → 0` |
| 3 | 8 | 8 | 0 | `7 → 0 → 8` ✓ |

### Verdict — and the beautiful trap inside it

- **In Python this passes** (bignum ints, and 100 digits is under CPython's default 4300-digit cap on `int`↔`str` conversions, which exists precisely because that conversion is classically quadratic in digit operations, not linear).
- **In Java/C++ it's flatly wrong**: 100 digits cannot fit in `long`/`long long`.
- It also violates the spirit of the exercise (you're being asked to *implement* the bignum's addition kernel).
- **The nastiest part:** the classic wrong accumulation `num = num*10 + node.val` (correct for *forward*-order digits, LeetCode 445) **passes all three official examples anyway**. Reversing `342`→`243` and `465`→`564` still sums to 807, and all-9s / all-0 inputs are digit-palindromes. A discriminating test is `[1,2,3] + [4,5,6]`: correct answer 321 + 654 = 975 → `[5,7,9]`; the buggy version computes 123 + 456 = 579 → `[9,7,5]`.

---

## 4. The core insight

Simulate **elementary-school column addition directly on the lists**, in the order the nodes are already stored:

1. Keep a `carry`, which is always `0` or `1` (column total ≤ 19).
2. Each step: `total = carry + (l1 digit if present) + (l2 digit if present)`; emit `total % 10`; set `carry = total // 10`.
3. **Keep going while either list has nodes OR a carry remains.** That third condition is the entire "final carry" story: it's what turns `9999 + 999` into an 8-digit answer.
4. Build the result with a **dummy (sentinel) head** so appending needs no first-node special case, and return `dummy.next`.

Everything hard about this problem lives in two places: the **three-part loop condition** (`l1 or l2 or carry`) and **null checks** for unequal lengths. The arithmetic itself is one `divmod`.

---

## 5. Optimal solution: single pass with carry

**Loop invariant:** at the start of each iteration, every digit of the sum below place `10^i` has been emitted correctly, `carry` is exactly the amount owed at place `10^i`, and `l1`/`l2` point at the next unprocessed nodes (or are `None`). The loop runs while there is any input left *or* a nonzero carry, so the final iteration (if any) emits exactly one node for the carry.

```python
# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode()          # sentinel; the real head is dummy.next
        tail = dummy
        carry = 0

        while l1 is not None or l2 is not None or carry:
            total = carry
            if l1 is not None:
                total += l1.val
                l1 = l1.next        # rebinds the LOCAL pointer; caller's list is untouched
            if l2 is not None:
                total += l2.val
                l2 = l2.next

            carry, digit = divmod(total, 10)   # digit ∈ [0,9], carry ∈ {0,1}
            tail.next = ListNode(digit)
            tail = tail.next

        return dummy.next
```

Notes worth voicing:

- The loop **never emits a leading zero**: after both lists are exhausted, `total = carry ≤ 1 < 10`, so any carry-only iteration appends a `1`, never a `0`. Interior zeros (like the `0` in `[7,0,8]`) are real digits and must **not** be skipped.
- A recursive version (add the tails, then fold in the carry) mirrors the math but costs `O(max(n,m))` call-stack depth — fine at `n ≤ 100` (well under Python's default ~1000 recursion limit), but the loop is the portable habit.

---

## 6. Traces on the official examples

### Example 1: `[2,4,3] + [5,6,4]` → `[7,0,8]` (internal carry that clears)

| col | l1.val | l2.val | carry-in | total | digit out | carry-out |
|---|---|---|---|---|---|---|
| 0 | 2 | 5 | 0 | 7 | **7** | 0 |
| 1 | 4 | 6 | 0 | 10 | **0** | 1 |
| 2 | 3 | 4 | 1 | 8 | **8** | 0 |

Both lists exhausted, carry 0 → stop. Output `[7,0,8]`. Note the carry born at column 1 dies at column 2 — no extra node.

### Example 2: `[0] + [0]` → `[0]`

| col | l1.val | l2.val | carry-in | total | digit out | carry-out |
|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | **0** | 0 |

Loop ends (both `None`, carry 0). Output `[0]`. The `or carry` clause doesn't skip anything here — the single node in each list guarantees one digit is emitted.

### Example 3: `[9,9,9,9,9,9,9] + [9,9,9,9]` → `[8,9,9,9,0,0,0,1]` (unequal lengths, sustained carry, final carry)

`9,999,999 + 9,999 = 10,009,998`.

| col | l1.val | l2.val | carry-in | total | digit out | carry-out |
|---|---|---|---|---|---|---|
| 0 | 9 | 9 | 0 | 18 | **8** | 1 |
| 1 | 9 | 9 | 1 | 19 | **9** | 1 |
| 2 | 9 | 9 | 1 | 19 | **9** | 1 |
| 3 | 9 | 9 | 1 | 19 | **9** | 1 |
| 4 | 9 | — | 1 | 10 | **0** | 1 |
| 5 | 9 | – | 1 | 10 | **0** | 1 |
| 6 | 9 | – | 1 | 10 | **0** | 1 |
| 7 | – | – | 1 | 1 | **1** | 0 |

Column 7 fires **only** because of `or carry` — the iteration that candidates most often forget. Output `[8,9,9,9,0,0,0,1]`. ✓

---

## 7. Complexity

| Approach | Time | Extra space | Correct under the constraints? |
|---|---|---|---|
| Fixed-width int conversion | `O(n+m)` | `O(1)` | ❌ 100 digits ≫ the ~19-digit capacity of a 64-bit integer (`2^64 ≈ 1.8×10^19`) |
| Bignum conversion (Python only) | `O(n+m)` traversal **plus** superlinear `int` conversion cost (classically `O(n²)` digit ops; CPython caps `int`↔`str` at 4300 digits by default because of exactly this cost) | `O(n+m)` | ✅ at `n ≤ 100`, but not portable, and it dodges the point of the exercise |
| Copy digits to arrays, add columns | `O(n+m)` | `O(n+m)` | ✅ language-safe stepping stone |
| **One-pass carry loop (this solution)** | **`O(max(n,m))`** | **`O(1)` auxiliary** (output itself is `O(max(n,m)+1)` and unavoidable) | ✅ canonical |

Why the time is `O(max(n,m))`, not `O(n+m)`: each iteration consumes at least one real node, and after both lists are exhausted at most **one** extra carry-only iteration can occur (since `carry ≤ 1`). And a lower bound in the other direction: **any** correct algorithm needs `Ω(max(n,m))` time, because every input digit can change the answer at its own column (e.g., swapping one list's single node between `9` and `8` flips the output), so no algorithm can safely skip a node.

---

## 8. Common mistakes

| # | Mistake | How it shows up |
|---|---|---|
| 1 | Accumulating with `num = num*10 + node.val` (forward-order habit from LC 445) | Digits reversed in the wrong direction. Passes all three official examples by coincidence (`342+465 = 243+564 = 807`; 9…9 and 0 are palindromes); fails on `[1,2,3]+[4,5,6]` → returns `[9,7,5]` instead of `[5,7,9]`. |
| 2 | Looping `while l1 and l2` (or `while l1 or l2`) and forgetting `or carry` | Example 3 loses the leading `1` → `[8,9,9,9,0,0,0]`. |
| 3 | No null check before `l1.val` / `l2.val` | `AttributeError` (Python), `NullPointerException` (Java), segfault (C++) the moment lengths differ. |
| 4 | Returning `dummy` instead of `dummy.next` | Output has a phantom `0` node in front: `[0,7,0,8]`. |
| 5 | Unconditionally appending a carry node after the loop (`tail.next = ListNode(carry)`) | Spurious trailing `0` on outputs with no final carry: `[7,0,8,0]`. |
| 6 | In the conversion approach, `while total > 0` with no zero special-case | `[0] + [0]` returns an **empty** list. |
| 7 | Trying to "index" the lists (`l1[i]`) or trim/strip zeros | Linked lists have no O(1) indexing (each `[i]` hides an O(n) walk); interior zeros like the `0` in `[7,0,8]` are real digits, and no stripping is ever needed — the algorithm can't produce a leading zero. |
| 8 | Mutating/relinking the input lists to save allocations without asking | It's a legitimate optimization (write digits into the longer list's nodes; allocate one extra node only for a final carry), but clear it with the interviewer first — the clean answer allocates fresh nodes and leaves inputs untouched. |

### Language gotchas (beyond Python)

| Language | Gotcha |
|---|---|
| **Java** | The int/long shortcut is not merely suboptimal — it's incorrect: a 100-digit number exceeds `Long.MAX_VALUE` (`2^63 − 1 ≈ 9.2×10^18`), so `Long.parseLong` throws and manual accumulation silently wraps. The digit-by-digit simulation is *mandatory*. Null-check each list before `.val`; return `dummy.next`, not `dummy`. |
| **C++** | `std::stoi`/`std::stoll` throw `std::out_of_range` past ~19 digits. If you hand-roll `struct ListNode { int val; ListNode* next; }`, give `next` a `nullptr` default — LeetCode's provided definition does, your local sandbox may not, and an uninitialized `next` is garbage on traversal. The loop condition must still include `carry`. |
| **Python** | `divmod(total, 10)` collapses the carry logic to one line; if you go recursive instead, depth is `max(n,m)+1` — safe at 100 against the default ~1000 recursion limit, but the iterative loop is the robust default. |

---

## 9. Test cases to propose out loud (before or right after coding)

| # | Input | Expected output | What it stress-tests |
|---|---|---|---|
| 1 | `[2,4,3] + [5,6,4]` | `[7,0,8]` | Official; a carry that is born and then dies (no final carry). |
| 2 | `[0] + [0]` | `[0]` | Official; minimal input — kills empty-output and zero-stripping bugs. |
| 3 | `[9,9,9,9,9,9,9] + [9,9,9,9]` | `[8,9,9,9,0,0,0,1]` | Official; unequal lengths, sustained carry, final carry node. |
| 4 | `[5] + [5]` | `[0,1]` | Smallest possible final-carry case; a single column overflows. |
| 5 | `[9,9,9] + [1]` | `[0,0,0,1]` | Carry ripples through *every* column (999 + 1 = 1000). |
| 6 | `[1] + [9,9,9,9]` | `[0,0,0,0,1]` | Short list finishes first and the ripple crosses into the long list (1 + 9999 = 10000). |
| 7 | `[1,2,3] + [4,5,6]` | `[5,7,9]` | The digit-order discriminator that Examples 1–3 fail to catch (buggy order returns `[9,7,5]`). |
| 8 | 100 nodes of `9` + 100 nodes of `9` | `8`, then 99 nines, then `1` (101 nodes) | Constraint ceiling: 101-digit output, worst-case carry chain. |

Say out loud: *"Inputs are guaranteed non-empty, digits 0–9, no negatives, no leading zeros except the number 0 — so I won't guard for those, but my loop degrades gracefully anyway (two `None` inputs with carry 0 return an empty list)."*

---

## 10. Transferable patterns and related problems

**Patterns to name explicitly in the interview:**

1. **Sentinel/dummy head** — build a list whose real head you don't know yet; return `dummy.next`. Ubiquitous: merging, partitioning, removal.
2. **Carry/borrow state machine** — per-column `total = a + b + carry`, with the carry provably bounded (here `≤ 1`, since `9+9+1 = 19 < 20` and `divmod` by the base extracts it).
3. **Multi-pointer walk with independent exhaustion** — keep consuming whichever input still has nodes; the same skeleton drives list merging.
4. **Data orientation matches the algorithm** — LSB-first storage makes addition a streaming, single-pass, O(1)-extra-space operation; MSB-first storage breaks that and forces extra machinery.
5. **Read-everything lower bound** — arithmetic simulation must touch every digit, since any single digit can alter the answer.

**Related problems:**

| Problem | Relationship to this one |
|---|---|
| LC 445 — Add Two Numbers II | Same sum, but **MSB-first** lists: needs reversal, stacks, or recursion; a great "what changed?" follow-up. |
| LC 67 — Add Binary | Identical carry loop in base 2. |
| LC 415 — Add Strings | Same loop over strings from the right end. |
| LC 66 — Plus One | Carry ripple with a single operand. |
| LC 989 — Add to Array-Form of Integer | Array-backed version, second addend is an int. |
| LC 43 — Multiply Strings | Grade-school digit arithmetic scaled up (partial products + carries). |
| LC 21 — Merge Two Sorted Lists | The canonical dummy-head construction drill. |

**Follow-up Q&A to be ready for:**

- *"What if the digits are stored in forward order?"* → That's LC 445: reverse both lists and reuse this exact loop, or push digits onto stacks, or recurse to the tails and add on unwind; if you may modify the inputs, reversal keeps extra space at O(1), otherwise stacks/recursion cost O(n+m).
- *"Can you avoid allocating new nodes?"* → Write result digits into the longer list's existing nodes (still O(1) extra); you need exactly one fresh node only when a final carry survives.
- *"Why not use a big-integer library?"* → In production, yes; the interview is asking you to implement the addition kernel inside that library.

---

## 11. Full interview talk track (the script)

**Clarify (30s).** "Quick checks: each node is a single digit 0–9, both lists non-empty, lengths can differ, and 'no leading zeros' means the *last* node is nonzero unless the number is 0 — since the list is reversed, the most significant digit is the tail. I'll return the sum in the same reversed format and leave the inputs unmodified."

**Approach (60s).** "Because the head is the least-significant digit, walking both lists from the head is exactly grade-school addition from the ones column. I'll keep a `carry` — always 0 or 1, since a column is at most 9+9+1 = 19. Each step I add the two current digits plus the carry, emit `total % 10` as a new node, and carry `total // 10`. The loop runs while either list has nodes **or** carry is nonzero — that last clause adds the final node for cases like 9999 + 999. I'll build the result behind a dummy head. That's one pass, O(max(n,m)) time, O(1) extra space beyond the output."

**Code (~5 min).** Narrate: sentinel, `tail` pointer, `carry = 0`; loop condition with all three clauses; null-guarded reads with local pointer advancement; `divmod`; append; return `dummy.next`.

**Test (60s).** "Dry-run Example 3: eight iterations, carries sustain through column 6, and column 7 fires only because of `or carry` — output `[8,9,9,9,0,0,0,1]`. Then `[0]+[0]` → `[0]`. Then `[5]+[5]` → `[0,1]`. One subtlety I'll note: the official examples wouldn't catch me writing digits in reverse order — 342+465 happens to equal 243+564 — so I trust the column invariant, and `[1,2,3]+[4,5,6] → [5,7,9]` is my order-check."

---

## 12. Say it in 60 seconds

> "The lists store digits least-significant first, so the head is the ones column — which is exactly the order you add by hand. So: one pass over both lists with a dummy head and a carry. Each step, total equals the carry plus each list's current digit where it exists; emit total mod 10, carry total div 10. Since digits are at most 9, a column is at most 19, so the carry is always 0 or 1. I keep looping while either list has nodes **or** a carry remains — that final condition is what appends the extra digit for cases like 9999 plus 999. One pass, O of max(n, m) time, constant extra space beyond the output. Edge cases I'll cover: unequal lengths, an all-nines carry ripple with a final carry, and zero plus zero. That's the whole plan — let me code it."
