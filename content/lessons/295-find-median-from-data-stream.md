# Find Median from a Data Stream (LeetCode 295) — Complete Interview Lesson

---

## 1. Problem restated (and what's really being asked)

You must support a **dynamic multiset of integers** with two operations:

- `addNum(num)` — insert one more number.
- `findMedian()` — return the median of *everything inserted so far*.

The median of a sorted collection:

| Count `n` | Median definition | Example |
|---|---|---|
| Odd | the single middle **value** | `[2,3,4]` → `3` |
| Even | the **average of the two middle values** | `[2,3]` → `(2+3)/2 = 2.5` |

Three things to say out loud when you restate the problem:

1. This is a **design problem**, not a one-shot algorithm: the data arrives one element at a time, and the median is requested repeatedly *between* insertions.
2. It's a **multiset**: duplicates must be preserved (a `set` would lose them).
3. The stream is unsorted and its arrival order is adversarial — you may not assume anything about ordering.

Note the **1e-5 tolerance**: returning `2.0` or `2.0000001` are both fine; and note that the problem guarantees at least one element exists before `findMedian()`, so you don't need an empty-check (though you still must branch on odd/even count).

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `-10^5 <= num <= 10^5` | Values are small: the sum of the two middle values is at most `2 × 10^5`, so **no 32-bit overflow is possible** in `a + b` (still state the "sum in long" habit aloud — see §8). Also: the range is small *relative to the count*, which is a hint toward the counting follow-up. |
| At most `5 × 10^4` calls to `addNum` and `findMedian` | So `n ≤ 5×10^4` and `log2(n) ≈ 16`. An `O(log n)` per-op solution does ~`5×10^4 × 3 × 16 ≈ 2.4×10^6` heap-node visits total — trivially fast. An `O(n)` per-op solution is ~`10^9` element moves — borderline; an `O(n log n)`-per-*query* solution is ~`2×10^10` — too slow. This is exactly the bar that separates brute force from the intended solution. |
| At least one element before `findMedian` | Skip the empty-guard, but keep the parity branch. |
| Answers within `10^-5` accepted | Doubles are plenty precise; integers up to `2×10^5` are **exact** in a 53-bit-mantissa double. No precision trap here. |

---

## 3. Brute force, honestly evaluated (with a worked trace)

Two natural brute forces:

| Brute force | `addNum` | `findMedian` | Verdict |
|---|---|---|---|
| Keep a plain list; **copy + sort on every query** | `O(1)` | `O(n log n)` | ~`2×10^10` comparisons over the workload → too slow. |
| Keep a **sorted list**: binary-search the position, insert there | `O(n)` (search is `O(log n)`, but shifting elements is `O(n)`) | `O(1)` (index math) | ~`1.25×10^9` shifted elements total; CPython's `bisect.insort` does the shift in C (`memmove`), so it may *pass in practice* — but it's `Θ(n²)` on paper. Say that out loud. |

Why `O(n log n)` per query can't be fundamentally improved *from scratch*: to confirm which element is the median, every other element must be connected to it by a chain of comparisons, which requires at least `n − 1` comparisons in the worst case — so any approach that re-derives the order at query time pays at least linearly per query. The whole game is to **never re-derive** — maintain the answer incrementally.

### Brute force code (sorted list — good enough to discuss, not to ship)

```python
import bisect

class MedianFinder:
    def __init__(self):
        self.a = []                 # kept fully sorted at all times

    def addNum(self, num: int) -> None:
        bisect.insort(self.a, num)  # O(log n) search + O(n) shift

    def findMedian(self) -> float:
        n = len(self.a)
        m = n // 2
        if n % 2:
            return float(self.a[m])                 # odd: value at index m
        return (self.a[m - 1] + self.a[m]) / 2.0    # even: indices m-1 and m
```

**Index-vs-values precision (memorize this mapping).** For sorted array `a` of length `n`:

- `n` odd → middle value at **index** `n // 2` (1-indexed rank `(n+1)/2`).
- `n` even → middle values at **indices** `n//2 − 1` and `n//2` (1-indexed ranks `n/2` and `n/2 + 1`).

### Worked trace on the official example

Calls: `addNum(1), addNum(2), findMedian(), addNum(3), findMedian()`

| Call | Sorted list after | `n` | Middle index/indices | Returned |
|---|---|---|---|---|
| `addNum(1)` | `[1]` | 1 | `a[0]` | — |
| `addNum(2)` | `[1, 2]` | 2 | `a[0], a[1]` | — |
| `findMedian()` | `[1, 2]` | 2 | `(a[0]+a[1])/2` | **1.5** ✓ |
| `addNum(3)` | `[1, 2, 3]` | 3 | `a[1]` | — |
| `findMedian()` | `[1, 2, 3]` | 3 | `a[1]` | **2.0** ✓ |

Matches the expected output. Now let's do better than "keep everything sorted."

---

## 4. The core insight

> **We never need the full sorted order. We only need the boundary between the smaller half and the larger half.**

After each insertion, the median is determined by at most two values:

- the **largest value of the smaller half**, and
- the **smallest value of the larger half**.

"Max of a dynamic set" and "min of a dynamic set" are exactly what heaps give in `O(log n)` per update. So split the multiset across **two heaps**:

- `lo` — a **max-heap** holding the smaller half; its top is `max(lo)` (the left boundary).
- `hi` — a **min-heap** holding the larger half; its top is `min(hi)` (the right boundary).

Why two heaps and not one? A single heap exposes only one boundary (its min or its max); the median needs **both** boundaries simultaneously, and popping your way to the second one destroys the structure.

Two invariants, maintained after every `addNum`:

1. **Ordering invariant:** every element in `lo` ≤ every element in `hi`, i.e. `max(lo) ≤ min(hi)`.
2. **Size invariant:** `len(lo) ∈ {len(hi), len(hi) + 1}` — the left side may hold **at most one** extra element.

Then, immediately:

- **odd total** (`len(lo) = len(hi) + 1`) → median = `max(lo)` = `lo`'s top;
- **even total** (`len(lo) = len(hi)`) → median = `(max(lo) + min(hi)) / 2`.

Duplicates are a non-issue: heaps are multisets, and since the ordering invariant uses `≤`, a duplicate equal to the boundary value may live on either side without breaking anything (traced in §5.5).

---

## 5. Optimal approach: two heaps

### 5.1 The subtle part — how to insert without breaking the ordering invariant

The trap: you can't just compare `num` against a top and push it in, unless you're careful, and it's easy to reason wrong under pressure. The classic, hardest-to-get-wrong insertion is a three-step dance:

1. **Push `num` into `lo`** (the small half) — unconditionally.
2. **Move `max(lo)` into `hi`** — pop the top of `lo`, push it onto `hi`.
3. **Rebalance sizes:** if now `len(hi) > len(lo)`, move `min(hi)` back into `lo`.

Why this provably preserves both invariants:

- After step 2, the moved element `m` was `max(lo ∪ {num})`, so everything remaining in `lo` is `≤ m`, and `m` now lives in `hi` — combined with the previous invariant `max(lo) ≤ min(hi)`, we still have `max(lo) ≤ min(hi)`.
- Step 3 moves `min(hi)`, which is `≥ max(lo)` by the invariant, into `lo` — it becomes the new `max(lo)` — and removing a minimum can only *raise* `min(hi)`. Ordering preserved; sizes restored to `{equal, lo+1}`.

(The direct-comparison variant — "push to `lo` if `num ≤ max(lo)` else to `hi`, then rebalance by size" — is also correct, but the dance above requires zero case analysis, which is worth more in an interview than one saved heap operation.)

### 5.2 Code (Python)

Python's `heapq` is a **min-heap only**, so implement the max-heap by **storing negated values** in `lo`. This handles negative inputs automatically — negation is uniform, no special-casing.

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.lo = []  # max-heap via negation: smaller half, top = max(lo)
        self.hi = []  # min-heap:                     larger half, top = min(hi)

    def addNum(self, num: int) -> None:
        heapq.heappush(self.lo, -num)                      # 1) land num in the small half
        heapq.heappush(self.hi, -heapq.heappop(self.lo))   # 2) enforce ordering invariant
        if len(self.hi) > len(self.lo):                    # 3) enforce size invariant
            heapq.heappush(self.lo, -heapq.heappop(self.hi))

    def findMedian(self) -> float:
        if len(self.lo) > len(self.hi):                    # odd count: left holds the extra
            return float(-self.lo[0])
        return (-self.lo[0] + self.hi[0]) / 2.0            # even count: average the boundaries
```

Polished micro-variant: steps 1–2 collapse into one sift using `heappushpop` (push `-num`, pop the min — i.e., the original max — in a single operation):

```python
def addNum(self, num: int) -> None:
    heapq.heappush(self.hi, -heapq.heappushpop(self.lo, -num))
    if len(self.hi) > len(self.lo):
        heapq.heappush(self.lo, -heapq.heappop(self.hi))
```

### 5.3 Trace on the official example

Calls: `addNum(1), addNum(2), findMedian(), addNum(3), findMedian()`. Heaps are shown as *values* (the `-1`-style negation is a Python storage detail).

| Call | Step | `lo` (small half, max on top) | `hi` (large half, min on top) | sizes | Median |
|---|---|---|---|---|---|
| `addNum(1)` | push → | `[1]` | `[]` | (1,0) | |
| | move max → hi | `[]` | `[1]` | (0,1) | |
| | hi bigger → move back | `[1]` | `[]` | (1,0) | |
| `addNum(2)` | push → | `[2, 1]` | `[]` | (2,0) | |
| | move max → hi | `[1]` | `[2]` | (1,1) | |
| `findMedian()` | even → average tops | `[1]` | `[2]` | (1,1) | **(1+2)/2 = 1.5** ✓ |
| `addNum(3)` | push → | `[3, 1]` | `[2]` | (2,1) | |
| | move max → hi | `[1]` | `[2, 3]` | (1,2) | |
| | hi bigger → move back | `[2, 1]` | `[3]` | (2,1) | |
| `findMedian()` | odd → `lo` top | `[2, 1]` | `[3]` | (2,1) | **2.0** ✓ |

Output matches: `1.5`, then `2.0`.

### 5.4 Second trace — duplicates and boundary-straddling

Calls: `addNum(2), addNum(2), addNum(3), addNum(3)`, then `findMedian()`. Sorted truth: `[2,2,3,3]` → median `(2+3)/2 = 2.5`.

| Call | Step | `lo` | `hi` | sizes |
|---|---|---|---|---|
| `add(2)` | dance | `[2]` | `[]` | (1,0) |
| `add(2)` | dance | `[2]` | `[2]` | (1,1) |
| `add(3)` | dance | `[2, 2]` | `[3]` | (2,1) |
| `add(3)` | dance | `[2, 2]` | `[3, 3]` | (2,2) |
| `findMedian()` | even | | | **(2+3)/2 = 2.5** ✓ |

The duplicate `2` sits at the boundary and the invariant (`≤`) tolerates it on either side — nothing special to handle.

### 5.5 Talk track while coding (fuller script)

> "The median only depends on the middle, so I'll never keep a full sorted list. I'll split everything into two halves: a max-heap for the smaller half and a min-heap for the larger half, keeping the left side at most one element bigger. For each new number I push it onto the left heap, then pop the left heap's max — the largest of the small half — and push it onto the right heap. That move is what guarantees everything left of the split is ≤ everything right of it. Then, if the right side grew larger than the left, I move its min back. After that, the median is free: odd count, it's the left heap's top; even count, the average of the two tops. Each add is at most three heap operations, so O(log n); queries are O(1). In Python, heapq is min-only, so I store negated values in the left heap — which also makes negative inputs a non-issue."

---

## 6. Complexity analysis

| Approach | `addNum` | `findMedian` | Work over ≤ 5×10⁴ ops | Space |
|---|---|---|---|---|
| Copy + sort per query | `O(1)` | `O(n log n)` | ~`2×10^10` — too slow | `O(n)` |
| Sorted list (`insort`) | `O(n)` (search `O(log n)`, shift `O(n)`) | `O(1)` | ~`1.25×10^9` shifts, `Θ(n²)` total | `O(n)` |
| **Two heaps (intended)** | **`O(log n)`** — ≤ 3 sifts | **`O(1)`** — peek tops | ~`2.5×10^6` node visits | `O(n)` |
| `sortedcontainers.SortedList` | `O(log n)` amortized | `O(log n)` (index the two middles) | fine in practice | `O(n)` |
| Counting buckets, range `[0,100]` (follow-up) | `O(1)` | `O(101)` | ~`2.5×10^6` | `O(101)` |

Two notes worth saying aloud:

- `O(log n)` insertion is *comparison-optimal*: an insertion must distinguish `n + 1` possible ranks, and any binary comparison decision tree needs depth at least `⌈log₂(n+1)⌉` to do so — heaps meet this bound, while `findMedian` beats it only because it answers no comparison questions at all (it peeks at boundaries maintained incrementally).
- `SortedList` is a third-party library (commonly available on LeetCode's Python environment, but not the standard library). Name it as an alternative, then deliver the heap solution — the heap answer is the learning goal and the safer claim.

---

## 7. Common mistakes and traps

| # | Mistake | Concrete symptom |
|---|---|---|
| 1 | **Parity/index bug:** returning `a[n//2]` for even `n` instead of averaging `a[n//2 − 1]` and `a[n//2]` | Wrong only on even counts — `[2,3]` returns `3` instead of `2.5` |
| 2 | **Negation slips (Python):** pushing `num` (not `-num`) into the "max-heap", or forgetting to negate when reading the median | `[1,3]` in `lo` reads `lo[0] = 1` as "max of small half" → garbage medians |
| 3 | **Breaking the ordering invariant** by pushing directly into one heap "to keep it balanced" without the pop-and-move step | Passes on sorted-ish input; fails adversarially: after `[1,3,2]` with heaps `lo=[1,3], hi=[2]` you'd compute `(1+2)/2 = 1.5` instead of `2` |
| 4 | **Forgetting the step-3 rebalance** | State after `addNum(1)` is `lo=[], hi=[1]`; the odd-branch reads empty `lo[0]` → `IndexError` |
| 5 | **Integer division:** `(a + b) // 2` in Python, `/ 2` in Java/C++ | `2.5` truncates to `2`; worse, with negatives Java/C++ truncate *toward zero* (`-5 / 2 = -2`), Python floors (`-5 // 2 = -3`) — both wrong medians. Always divide by `2.0` |
| 6 | **Losing duplicates** by using a `set`/`HashSet` | `[2,2,3,3]` silently collapses; median wrong |
| 7 | **Off-by-one in the bucket follow-up:** mixing 0-indexed positions with 1-indexed ranks | Even-`n` walks land one bucket early; guard with "ranks `n/2` and `n/2 + 1` (1-indexed)" |
| 8 | Returning `int` in the odd branch | Numerically fine under the 1e-5 tolerance, but make it `float(...)` for cleanliness |
| 9 | Assuming arrival order or sortedness | Any trace like §5.4 with adversarial order catches this in your dry run |

---

## 8. Language gotchas (Java / C++ beyond Python)

| Language | Gotcha |
|---|---|
| **Java** | `PriorityQueue` defaults to a **min-heap**; the small half needs `new PriorityQueue<>(Collections.reverseOrder())`. Median expression: `(lo.peek() + hi.peek()) / 2.0` — the `int` sum is safe here (`≤ 2×10^5`), but `/2` would truncate; with larger constraints, sum into `long` first. Autoboxing `Integer` is harmless here; the real comparator footgun is subtraction-based comparators overflowing — use `Integer.compare`/`Comparator.reverseOrder()`. |
| **C++** | `std::priority_queue<int>` defaults to a **max-heap** — the *opposite* of Python/Java; the large half needs `priority_queue<int, vector<int>, greater<int>>` (don't forget `#include <queue>` / `<functional>`, and that the comparator is part of the type). Median: `(lo.top() + hi.top()) / 2.0` promotes correctly; `/ 2` truncates toward zero, which is wrong for negative medians too. |

---

## 9. Follow-ups

### 9.1 "All integers are in `[0, 100]`" → counting buckets

When the value alphabet is tiny, stop comparing entirely: use the **value itself as an array index**. A 101-slot count array plus a running total:

```python
class MedianFinder:
    def __init__(self):
        self.cnt = [0] * 101
        self.n = 0

    def addNum(self, num: int) -> None:      # O(1)
        self.cnt[num] += 1
        self.n += 1

    def _kth(self, k: int) -> int:           # 1-indexed k-th smallest, O(101)
        acc = 0
        for v in range(101):
            acc += self.cnt[v]
            if acc >= k:
                return v

    def findMedian(self) -> float:           # O(101)
        if self.n % 2:
            return float(self._kth((self.n + 1) // 2))
        return (self._kth(self.n // 2) + self._kth(self.n // 2 + 1)) / 2.0
```

- `addNum` `O(1)`, `findMedian` `O(101) = O(1)` bounded, space `O(101)`.
- Why this is allowed to be so fast: bucket counting uses the key's value as an address rather than asking comparison questions, so comparison-model lower bounds simply don't apply — that's the one-line justification to give if the interviewer probes.

### 9.2 "99% of integers are in `[0, 100]`" → histogram + tiny sorted tail

Keep the 101-bucket histogram for in-range values, and keep the rare outliers (< 0 and > 100) in two **sorted lists**. Since they're ~1% of the stream (≤ ~500 elements at these limits), `bisect.insort` into them is cheap. Order is naturally: `below` values, then buckets `[0,100]`, then `above` values — so the k-th smallest is a three-way offset lookup:

```python
import bisect

class MedianFinder:
    def __init__(self):
        self.cnt = [0] * 101
        self.in_range = 0
        self.below = []   # sorted list of values < 0   (rare)
        self.above = []   # sorted list of values > 100 (rare)

    def addNum(self, num: int) -> None:
        if num < 0:
            bisect.insort(self.below, num)
        elif num > 100:
            bisect.insort(self.above, num)
        else:
            self.cnt[num] += 1
            self.in_range += 1

    def _kth(self, k: int) -> int:            # 1-indexed k-th smallest
        if k <= len(self.below):
            return self.below[k - 1]
        k -= len(self.below)
        if k <= self.in_range:
            acc = 0
            for v in range(101):
                acc += self.cnt[v]
                if acc >= k:
                    return v
        k -= self.in_range
        return self.above[k - 1]

    def findMedian(self) -> float:
        n = len(self.below) + self.in_range + len(self.above)
        if n % 2:
            return float(self._kth((n + 1) // 2))
        return (self._kth(n // 2) + self._kth(n // 2 + 1)) / 2.0
```

Cost: `addNum` `O(log m + m)` where `m` = outlier count (tiny), `findMedian` `O(100 + m)`, space `O(101 + m)`. If outliers could be numerous, swap the sorted lists for the two-heap structure from §5 — same invariant, same boundary peeking.

One closing remark you can offer if the interviewer pushes toward "truly unbounded streaming with sublinear memory": an **exact** one-pass median needs `Ω(n)` space in the worst case — this follows from a reduction to one-round communication complexity of Median, which requires `Ω(n)` bits (via a standard reduction from INDEX) — which is why production streaming quantile tools (Greenwald–Khanna, t-digest) give *ε-approximate* guarantees instead.

---

## 10. Test cases to state out loud

Say these before or right after coding — it signals rigor and catches the bugs in §7:

1. **Official Example 1:** `add 1, add 2 → 1.5`; `add 3 → 2.0` (trace in §5.3).
2. **Single element:** `add(5); findMedian()` → `5.0` (exercises the odd branch alone).
3. **Duplicates:** `add 2,2,3,3` → `2.5`; `add 7,7,7` → `7.0` (multiset, boundary straddle — trace in §5.4).
4. **Negatives and boundary values:** `add −10^5, add 10^5` → `0.0`; then `add 0` → `0.0`. Also `[−1, 2]` → `0.5` (catches the negative-division bug from §7.5).
5. **Adversarial arrival order:** strictly decreasing `5,4,3,2,1` → `3.0`; alternating extremes `1e5, −1e5, 0` → `0.0` (catches invariant violations).
6. **Parity toggling:** interleave `findMedian()` between *every* pair of adds so both the odd and even branches execute repeatedly on the same data.

Expected quick-reference: odd `n` → single middle value; even `n` → average of ranks `n/2` and `n/2 + 1` (1-indexed).

---

## 11. Transferable patterns and related problems

**Patterns extracted from this problem:**

- **Two heaps = dynamic order-statistics boundary.** Whenever you need, simultaneously, "max of everything below a split" and "min of everything above," split across a max-heap and a min-heap with a size invariant. The median is just the most famous instance.
- **Keep only the boundary you need.** The general heap family: a size-`k` min-heap maintains the k largest of a stream (`LC 703`, `LC 973`, `LC 347`); two heaps maintain the middle; a monotonic deque maintains a sliding-window extremum (`LC 239`). Identify which *order statistic* is needed, then hold exactly that.
- **Value-as-index counting.** When the value domain is small and known, replace comparisons with array indexing (counting sort logic). This recurs in frequency-array problems and any "bounded alphabet" follow-up.
- **Design problems: state invariants before code.** "Sizes differ by at most one; left max ≤ right min" — two sentences that make the implementation almost write itself.

| Related problem | Relationship |
|---|---|
| **LC 703** — Kth Largest Element in a Stream | Same "maintain a boundary of a stream" idea with a size-`k` min-heap |
| **LC 480** — Sliding Window Median | Two heaps **+ lazy deletion** (elements also expire) or a `SortedList` |
| **LC 4** — Median of Two Sorted Arrays | Static median via partition binary search — contrast with streaming |
| **LC 502** — IPO | The two-heap "max side / min side" pattern in a greedy setting |
| **LC 315** — Count of Smaller Numbers After Self | Order statistics over compressed coordinates (Fenwick/merge sort) |
| **LC 1825** — Finding MK Average | Advanced extension: multiset + sliding window + k-quantile boundaries |

---

## 12. Say it in 60 seconds

> "Median of a stream — I only need the middle, so I'll never keep things fully sorted. I split the data into two halves: a max-heap holding the smaller half, a min-heap holding the larger half, with the left side allowed one extra element. For each new number: push it onto the left heap, then pop the left heap's max and push it onto the right — that move guarantees everything on the left is ≤ everything on the right — then if the right side got bigger, move its min back. Sizes stay equal or left-bigger-by-one, so the median is free: odd count, it's the left top; even count, the average of the two tops. Each add is three heap ops — O(log n); each query is O(1); space O(n). Python gotcha I'll handle as I code: heapq is min-only, so the left heap stores negated values. If you're asking the follow-up: all values in [0,100] means a 101-slot counting array — O(1) adds, a bounded 101-step scan for the median, since using values as indices sidesteps comparison-based limits; with 99% in range, I keep the histogram and put the rare outliers in a small sorted structure, so the median lookup is still essentially O(100)."
