# Kth Largest Element in a Stream — Full Interview Lesson

## 1. Restating the Problem (Say It Back)

We maintain a **growing multiset of scores**. At construction we're handed a number `k` and an initial batch `nums`. Every time `add(val)` is called, one more score enters the pool, and we must immediately report the **k-th largest score among all scores seen so far**.

Two semantics to lock down before coding:

- **"k-th largest" means position, not distinct value.** If the pool sorted in descending order is `s[0] ≥ s[1] ≥ …`, the answer is `s[k-1]` (0-based). Duplicates occupy **separate ranks**: for `[8, 7, 7, 7, 7, 3]`, the 4th largest is `7` — the four 7s hold ranks 2–5. Example 2 exists specifically to test this.
- **It's an online problem.** The pool only grows; we answer after every insertion. That framing ("repeated query after repeated insert") is the loudest hint about which data structure the interviewer wants.

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `nums.length ≤ 10⁴`, `≤ 10⁴` calls to `add` | Pool never exceeds ~2×10⁴. Almost anything passes *performance-wise*; the problem is testing whether you recognize the **streaming pattern**, not whether you can brute-force. |
| `1 ≤ k ≤ nums.length + 1` | Two consequences: (a) `k ≥ 1`, so no degenerate empty-top-k case; (b) at construction the pool may hold as few as `k − 1` elements — but since every `add` inserts one score, **from the first `add` onward the pool has ≥ k elements**. So the answer is always well-defined at query time; "fewer than k elements" can only happen *inside the constructor*. |
| `-10⁴ ≤ nums[i], val ≤ 10⁴` | Values can be **negative** → never initialize a "current best" sentinel to `0`. Everything fits in a 32-bit int; there's no arithmetic overflow risk because we only *compare*, never sum. |
| No removals | The pool is append-only. This is what makes a small bounded heap viable (see §5). |

## 3. Clarifying Questions to Ask Aloud

1. "Duplicates count as separate ranks, correct — the 4th largest of `[8,7,7,7,7]` is `7`?" (Yes.)
2. "I'll assume `add` is only called once the pool has at least `k` elements — the constraints guarantee it since `k ≤ len(nums)+1`. Should I still guard against a smaller pool?" (Guard cheaply anyway.)
3. "Can `k` change after construction?" (No, per the signature — but see the follow-up corner.)

## 4. Brute Force: Keep a Sorted List

Keep every score in a sorted ascending list; on each `add`, insert in position and read the k-th from the end.

```python
import bisect
from typing import List

class KthLargestSortedList:
    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.a = sorted(nums)          # ascending

    def add(self, val: int) -> int:
        bisect.insort(self.a, val)     # O(log n) search + O(n) shift
        return self.a[-self.k]         # k-th largest = k-th from the END (ascending list)
```

**Index discipline:** ascending list → the k-th largest is `a[-k]` (equivalently `a[len(a)-k]`). Descending list → it's index `k-1`. Mixing these up is the #1 off-by-one here.

**Worked trace — Example 1, `k = 3`:**

| Call | List after (ascending) | `a[-3]` | Expected |
|---|---|---|---|
| init | `[2, 4, 5, 8]` | — | — |
| `add(3)` | `[2, 3, 4, 5, 8]` | **4** | 4 ✓ |
| `add(5)` | `[2, 3, 4, 5, 5, 8]` | **5** | 5 ✓ |
| `add(10)` | `[2, 3, 4, 5, 5, 8, 10]` | **5** | 5 ✓ |
| `add(9)` | `[2, 3, 4, 5, 5, 8, 9, 10]` | **8** | 8 ✓ |
| `add(4)` | `[2, 3, 4, 4, 5, 5, 8, 9, 10]` | **8** | 8 ✓ |

**Verdict:** Re-sorting on every `add` is `O(m log m)` per call; `insort` is `O(m)` per call because of list shifting (the binary search is `O(log m)` but the insert moves up to `m` elements). With ~10⁴ adds over a ~2×10⁴ pool, a full re-sort does on the order of 10⁹ comparisons in Python — a real TLE risk; `insort` shifts happen in C so it *may* squeak by, but that's luck, not design. Either way, you're paying to maintain order over **all** `m` elements when the answer only ever involves the top `k`.

## 5. The Core Insight

> **The k-th largest element is exactly the *minimum* of the k largest elements.**

So we don't need the whole pool — we only need to remember **which k scores are currently the largest**. Store them in a **min-heap capped at size `k`**. Then the root (the weakest member of the elite set) *is* the k-th largest, for free.

**Why discarding small values is safe (the one argument you should articulate):** suppose the new score `x` is `≤` the current root `r` (the current k-th largest). Right now there are at least `k` scores `≥ r > x`... or `≥ r = x`. The pool never shrinks, so those `k` scores stay forever, and future arrivals only push the k-th order statistic **upward** (order statistics of a superset are ≥ those of a subset). Therefore `x < r` can *never* be the k-th largest at any future time, and `x == r` changes no ranks. Discard is correct — forever, not just for this call.

**Update rule per `add(x)`:**
- Heap has fewer than `k` elements → push `x` (still filling up; everything is a candidate).
- Else if `x > root` → evict root, insert `x`.
- Else → discard `x`.

The data structure's size is **O(k)**, independent of how long the stream runs. That's the sentence the interviewer is listening for.

## 6. Optimal Solution

```python
import heapq
from typing import List

class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.heap: list[int] = []            # min-heap = the k largest scores seen so far
        for x in nums:                       # feed the initial batch through the same rule
            self._offer(x)                   # O(n log k) total

    def _offer(self, x: int) -> None:
        if len(self.heap) < self.k:          # not full yet: keep everything
            heapq.heappush(self.heap, x)
        elif x > self.heap[0]:               # beats the weakest of the current top-k
            heapq.heapreplace(self.heap, x)  # pop root + push x in ONE sift, O(log k)
        # else: x <= current k-th largest -> can never matter again; drop it

    def add(self, val: int) -> int:
        self._offer(val)
        return self.heap[0]                  # min of top-k == k-th largest overall
```

Note the constructor deliberately reuses `add`'s logic — no special-case code path. (Guarding `len < k` in `_offer` also automatically handles the `k == len(nums) + 1` case where the heap starts underfull.)

**Alternative constructor** (simpler to read, peak memory O(n) instead of O(k)):

```python
def __init__(self, k: int, nums: List[int]):
    self.k = k
    self.heap = list(nums)      # COPY — heapify mutates its argument in place
    heapq.heapify(self.heap)    # O(n)
    while len(self.heap) > k:   # trim to the k largest
        heapq.heappop(self.heap)  # (n-k) * O(log n)
```

### Trace — Example 1 (`k = 3`, init `[4, 5, 8, 2]`)

Heap contents shown as a sorted set; the actual array order inside the heap differs, but the root is always the min.

**Constructor:**

| Incoming | Heap before | Decision | Heap after | Root |
|---|---|---|---|---|
| 4 | `{}` | size 0 < 3 → push | `{4}` | 4 |
| 5 | `{4}` | push | `{4, 5}` | 4 |
| 8 | `{4, 5}` | push | `{4, 5, 8}` | 4 |
| 2 | `{4, 5, 8}` | full; 2 > 4? No → **discard** | `{4, 5, 8}` | 4 |

**Adds:**

| Call | Heap before | Decision | Heap after | Return |
|---|---|---|---|---|
| `add(3)` | `{4, 5, 8}` | 3 > 4? No → discard | `{4, 5, 8}` | **4** ✓ |
| `add(5)` | `{4, 5, 8}` | 5 > 4 → replace root | `{5, 5, 8}` | **5** ✓ |
| `add(10)` | `{5, 5, 8}` | 10 > 5 → replace | `{5, 8, 10}` | **5** ✓ |
| `add(9)` | `{5, 8, 10}` | 9 > 5 → replace | `{8, 9, 10}` | **8** ✓ |
| `add(4)` | `{8, 9, 10}` | 4 > 8? No → discard | `{8, 9, 10}` | **8** ✓ |

Matches `[null, 4, 5, 5, 8, 8]`.

### Trace — Example 2 (`k = 4`, init `[7, 7, 7, 7, 8, 3]`) — the duplicates test

**Constructor:**

| Incoming | Decision | Heap after |
|---|---|---|
| 7, 7, 7, 7 | push each (fills to size 4) | `{7, 7, 7, 7}` |
| 8 | 8 > 7 → replace root | `{7, 7, 7, 8}` |
| 3 | 3 > 7? No → discard | `{7, 7, 7, 8}` |

**Adds:**

| Call | Decision | Heap after | Return |
|---|---|---|---|
| `add(2)` | 2 > 7? No → discard | `{7, 7, 7, 8}` | **7** ✓ |
| `add(10)` | 10 > 7 → replace | `{7, 7, 8, 10}` | **7** ✓ |
| `add(9)` | 9 > 7 → replace | `{7, 8, 9, 10}` | **7** ✓ |
| `add(9)` | 9 > 7 → replace | `{8, 9, 9, 10}` | **8** ✓ |

Matches `[null, 7, 7, 7, 8]`. Note how duplicate 7s and 9s flow through as ordinary elements — rank-by-position semantics need zero extra code.

## 7. Complexity

| Approach | Constructor | `add` | Space | Comment |
|---|---|---|---|---|
| Re-sort every call | O(n log n) | O(m log m) | O(m) | m = pool size so far |
| Sorted list + `insort` | O(n log n) | O(m) (shift dominates) | O(m) | search O(log m), insert O(m) |
| Full heap, pop k times per query | O(n) | O(k log m) | O(m) | re-does work every call |
| **Bounded min-heap (chosen)** | **O(n log k)** (or O(n + (n−k) log n) via heapify+trim) | **O(log k)** | **O(k)** | size depends on k, not stream length |
| Balanced BST / `SortedList` | O(n log n) | O(log m) | O(m) | correct but carries the whole pool; overkill |

Why `add` is `O(log k)`: at most one `push`/`replace`, and a heap of ≤ k elements has depth ⌊log₂ k⌋ + 1, so one sift touches O(log k) nodes. Whole session: `O((n + q) · log k)` for `q` calls to `add`.

## 8. Edge Cases & Test Plan (Propose These Aloud)

| # | Test | Why it matters | Expected |
|---|---|---|---|
| 1 | Example 1: `k=3`, `[4,5,8,2]`, adds `3,5,10,9,4` | Official baseline | `4, 5, 5, 8, 8` |
| 2 | Example 2: `k=4`, `[7,7,7,7,8,3]`, adds `2,10,9,9` | **Duplicates occupy separate ranks**; tie at the root | `7, 7, 7, 8` |
| 3 | `KthLargest(3, [5, 1])`, then `add(7)` | `k == len(nums)+1`: heap is **underfull at init**; exercises the `len < k` branch | pool `{5,1,7}` → **5** |
| 4 | `KthLargest(1, [-3, -7])`, then `add(-1)`, `add(-10)` | `k=1` = running max; **negative values** (kills any `0`-sentinel habit) | `-1`, then `-1` |
| 5 | `KthLargest(2, [4, 4, 4])`, then `add(5)`, `add(6)` | All-equal pool; `val == root` boundary on the comparison | `4`, then `5` |
| 6 | `KthLargest(1, [])`, then `add(4)` | Empty initial stream, first `add` defines the answer | `4` |

When narrating case 3 or 4, say *why* the code survives it: the `len(self.heap) < self.k` branch keeps every value until the heap is full, so `heap[0]` is never read from an underfull heap at return time.

## 9. Common Mistakes

1. **Max-heap of everything, pop `k` per `add`.** Correct answers, `O(k log m)` per call — it ignores that the stream lets you *amortize*. This is the "you memorized heaps but missed the streaming framing" answer.
2. **"k-th largest" = "k-th distinct largest."** Treating `[7,7,7,7,8]` as having 2nd-largest `8` fails Example 2. Ranks count duplicates.
3. **Off-by-one on the answer index.** Ascending list → `a[-k]`; descending → index `k−1`; size-k min-heap → root. Write one of these as a comment before coding.
4. **`heapq.heapreplace` misuse (Python).** `heapreplace(h, x)` pops the root *and pushes `x` unconditionally* — call it when `x < h[0]` and you've just evicted your answer and inserted a smaller value, silently corrupting the invariant. Only use it behind the `x > h[0]` guard (as above), or use `heappushpop`, which pushes first and pops the min.
5. **Pre-padding the heap with tiny sentinels** to make `add` branchless (`heappushpop` always) — it *works* under these exact constraints only because `k ≤ len(nums)+1` guarantees the pool has ≥ k real elements by the first `add`, so every sentinel gets evicted. Reuse the class in any setting without that guarantee and the root becomes your sentinel. Fragile; prefer the explicit branch.
6. **Aliasing the input (Python).** `self.heap = nums; heapq.heapify(self.heap)` mutates the caller's list. Copy first: `self.heap = list(nums)`.
7. **Discarding when `heap` is underfull.** Before `k` elements exist, *every* value must be kept — the `x > root` shortcut is only valid for a full heap.
8. **Returning before mutating, or forgetting the return.** `add` both updates and queries; in a rushed implementation it's easy to return the *old* root.

## 10. Language Gotchas (Python / Java / C++)

| Language | Gotcha | Fix / note |
|---|---|---|
| Python | `heapq` is **min-heap only**; no max-heap flag | You want a min-heap here anyway. (If you ever need a max-heap in Python: negate values on push and pop.) |
| Python | `heapreplace` ≠ `heappushpop` | See mistake #4 — guard or use `heappushpop`. |
| Java | `new PriorityQueue<>()` is a **min-heap** by natural ordering — the *opposite* default from C++ | For this problem, no comparator needed. Resist writing one. |
| Java | Comparator `(a, b) -> b - a` (the classic "make a max-heap" idiom) **overflows** near `Integer.MIN_VALUE` | Use `Integer.compare(b, a)`. Not triggerable with values in ±10⁴, but it's a known interview landmine worth naming. |
| Java | Autoboxing: every `add(int)` allocates an `Integer` | Harmless at 10⁴ calls; say it out loud to show awareness. |
| C++ | `std::priority_queue<int>` is a **max-heap** by default | You need `priority_queue<int, vector<int>, greater<int>>` (includes `<queue>`, `<functional>`). Forgetting `greater<int>` gives silently wrong answers. |
| C++ | `pq.pop()` returns `void` | Read `pq.top()` *before* popping: `int ans = pq.top(); pq.pop();` |

## 11. Transferable Patterns & Related Problems

The general pattern: **a heap bounded at size k is a compact summary of the top-k (or bottom-k) prefix of a stream.** Orientation flips with the goal:

| Goal on a stream | Structure | Answer sits at |
|---|---|---|
| k-th largest (this problem) | min-heap, size k | root |
| k-th smallest | max-heap, size k | root |
| k closest points / k smallest distances | **max-heap**, size k (evict the *farthest* of the kept set) | — |
| running median | two heaps (max-heap of low half, min-heap of high half), balanced sizes | both roots |
| top-k by frequency | heap over `(count, value)` or bucket sort | — |

Related problems to drill the pattern:

| Problem | Relationship |
|---|---|
| LC 215 — Kth Largest Element in an Array | One-shot version; quickselect vs. heap trade-offs |
| LC 973 — K Closest Points to Origin | Bounded heap, **opposite orientation** (max-heap of size k) |
| LC 347 — Top K Frequent Elements | Same skeleton, keyed by count |
| LC 295 — Find Median from Data Stream | Two-heaps generalization |
| LC 480 — Sliding Window Median | What breaks when the stream *can* forget elements (heaps can't delete arbitrarily) |
| LC 2102 — Sequentially Ordinal Rank Ticket | This exact skeleton in disguise |
| LC 1825 — Finding MK Average | Order statistics over a sliding window; heavier machinery |

## 12. Follow-Up Corner (with the bounds justified)

- **"Could you find the k-th largest of a fixed array in O(n)?"** Yes — quickselect: each partition places one pivot at its final rank and discards one side, so with random pivots the expected work telescopes to roughly `n + n/2 + n/4 + … < 2n`; median-of-medians makes it worst-case linear. But that's an *offline* trick — it doesn't cheaply survive insertions, which is why the streaming setting uses the heap.
- **"Can `add` beat O(log k)?"** Not with comparison-based bookkeeping: the incoming value has ~k+1 possible ranks among the kept top-k elements, and each comparison can at best halve that uncertainty, so ⌈log₂(k+1)⌉ comparisons are needed in the worst case.
- **"Could we do it with less than O(k) memory?"** Not exactly, in this model: any of the k values currently retained could later become the answer (the pool never shrinks), so forgetting any one of them can make the class report a wrong k-th largest.
- **"What if `k` changes at runtime?"** A fixed size-k heap can't re-select; keep an order-statistic structure (balanced BST / `SortedList`) supporting "select k-th from top" in O(log m), or rebuild the heap on each `k` change.
- **"Sliding window of the last W scores?"** The heap can't evict arbitrary expired elements — use a multiset (or two heaps with lazy deletion), per LC 480.

## 13. Talk Track While Coding (Fuller Script)

> "Brute force is keeping everything sorted — but every insert pays for the whole pool, and the answer only ever lives in the top k. So I'll keep a min-heap holding exactly the k largest scores seen so far; its minimum is by definition the k-th largest. Constructor: feed the initial scores through the same rule as `add`, then trim to size k — that's O(n log k). For `add`: if the heap isn't full yet I push — the constraints let the pool start one element short of k, so I must handle that. If the new value beats the root, I evict the root and insert it; otherwise I throw it away, which is safe because the pool only grows, so anything at or below the current k-th largest can never climb back into the top k. Then I return the root. Each add is one sift over at most k elements: O(log k) time, O(k) memory for the whole stream. Duplicates need no special handling because they occupy distinct ranks naturally — Example 2 checks that."

## 14. Say It in 60 Seconds

> "The k-th largest is just the smallest of the k largest scores, so I keep only the top k in a min-heap — the root is always my answer. I build the heap from the initial scores and trim it to size k, which is O(n log k). For each add: if the heap isn't full yet, I push — k can start one bigger than the initial array, so I handle that underfull case. If the new score beats the root, I evict the root and push it; otherwise I discard it, and that's safe because the stream only grows, so anything below the current k-th largest can never matter again. Then I return the root. Each add is a single sift: O(log k) time, O(k) memory no matter how long the stream runs — versus re-sorting the whole pool at O(n log n) per add. Duplicates count as separate ranks and fall out of the algorithm for free. That's the standard top-k-stream pattern: bounded min-heap, answer at the root."
