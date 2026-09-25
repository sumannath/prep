# Kth Largest Element in an Array — Complete Interview Lesson

## 1. Restating the problem

Given an array `nums` of up to 10⁵ integers and an integer `k`, return the element that would sit at rank `k` if the array were sorted in descending order.

Three precision points you should say out loud, because they drive every decision below:

- **`k` is a rank (1-based), the return value is a value.** Arrays are 0-indexed, so the kth largest lives at index `k-1` in descending order.
- **Duplicates count as separate ranks.** The problem explicitly says "not the kth distinct element." So in `[5, 5, 4, 1]` with `k = 2`, the answer is **5** (the two 5s occupy ranks 1 and 2), *not* 4.
- **The "can you solve it without sorting?" note is the interviewer's nudge.** Sorting is the accepted baseline; the follow-up they're fishing for is a heap or quickselect.

Function signature: `findKthLargest(nums, k) -> int`.

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= k <= nums.length <= 10^5` | `k` is **always valid** — no error path needed. But `k = 1` (the max) and `k = n` (the min) are live boundary cases your code must handle naturally. |
| `n <= 10^5` | O(n log n) ≈ 1.7×10⁶ operations is comfortably fast; O(n²) ≈ 10¹⁰ is not. So sorting is *allowed*, just not optimal — and the note asks you to beat it. |
| `-10^4 <= nums[i] <= 10^4` | Only **20,001 distinct values** exist. That's a hint that a counting/bucket approach is possible — a genuinely linear, non-comparison solution. Negatives mean any counting array needs an offset. |
| Values fit in a 32-bit int | No overflow concerns *in this problem*, but see the language gotchas section for habits. |

Edge-case implication: since `1 <= k <= n`, the answer always exists — but if an interviewer relaxes that constraint, you should say "I'd validate `k` and raise `ValueError` if `not 1 <= k <= len(nums)`."

---

## 3. Baseline: sort and index (brute force)

```python
def findKthLargest(nums: list[int], k: int) -> int:
    return sorted(nums, reverse=True)[k - 1]   # rank k (1-based) -> index k-1 (0-based)

# equivalent ascending form:
# nums.sort(); return nums[len(nums) - k]
```

**Worked trace, Example 1:** `nums = [3,2,1,5,6,4]`, `k = 2`.

| Step | State |
|---|---|
| Input | `[3, 2, 1, 5, 6, 4]` |
| Sort descending | `[6, 5, 4, 3, 2, 1]` |
| Read index `k-1 = 1` | value **5** ✓ |

**Index bookkeeping — memorize this table**, because off-by-one errors here are the #1 mistake on this problem:

| Ordering | kth largest sits at | Example 1 (`n=6, k=2`) |
|---|---|---|
| Descending | index `k - 1` | `[6,5,4,3,2,1]` → index 1 → 5 |
| Ascending | index `n - k` | `[1,2,3,4,5,6]` → index 4 → 5 |

**Complexity:** O(n log n) time, O(n) auxiliary space for Python's Timsort (`sorted` doesn't mutate; `.sort` does). This is provably overkill: any comparison-based sort must distinguish all `n!` input orderings, which forces a decision tree of depth log₂(n!) = Θ(n log n). We're paying for a *full* ordering when we need exactly *one* order statistic.

---

## 4. The core insight

Two independent ideas unlock everything better-than-sorting:

1. **You don't need the full order — you need one candidate set.** If you continuously maintain "the k largest elements seen so far," then the *smallest* of that set is the kth largest overall. A **min-heap of size k** is the perfect container for that set, because its root is precisely the weakest member — the one that should be evicted when a stronger element arrives. A max-heap is the wrong direction: it surfaces the *strongest* candidate, which you never want to evict.

2. **One partition step places one element at its final sorted position.** Quicksort's partition, run once, tells you the pivot's exact rank. If that rank is the one you want, you're done; otherwise you can discard half the array. That's **quickselect** — sorting's work, pruned to a single root-to-target path.

(And a third, constraint-specific idea: with values bounded in `[-10⁴, 10⁴]`, you can sidestep comparisons entirely — Section 7.)

Any selection algorithm must touch every element at least once, since an unexamined element could always be the answer — so O(n) is the floor, and both ideas above approach it.

---

## 5. Approach A (default answer): min-heap of size k

### Algorithm

Keep a min-heap containing the **k largest elements seen so far**. For each `x`:
- If the heap holds fewer than `k` elements, push `x`.
- Otherwise, if `x > heap[0]` (the current kth-largest candidate), evict the root and insert `x` in one operation (`heapreplace`).
- Otherwise ignore `x` — it can't be in the top k.

After the loop, `heap[0]` — the smallest of the k survivors — is the answer.

```python
import heapq

def findKthLargest(nums: list[int], k: int) -> int:
    heap = []                              # min-heap: the k largest seen so far
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)        # still filling the candidate set
        elif x > heap[0]:
            heapq.heapreplace(heap, x)     # evict root + insert x in a single sift
    return heap[0]                         # smallest of top-k == kth largest
```

### Trace on Example 1 — `nums = [3,2,1,5,6,4]`, `k = 2`

(Heap shown as a multiset; `heapq`'s internal array layout differs, but only the root matters.)

| x | Action | Heap contents | Root (= running kth largest) |
|---|---|---|---|
| 3 | push (size < k) | {3} | 3 |
| 2 | push (size < k) | {2, 3} | 2 |
| 1 | 1 ≤ root 2 → ignore | {2, 3} | 2 |
| 5 | 5 > 2 → replace root | {3, 5} | 3 |
| 6 | 6 > 3 → replace root | {5, 6} | 5 |
| 4 | 4 ≤ 5 → ignore | {5, 6} | **5** ✓ |

### Trace on Example 2 — `nums = [3,2,3,1,2,4,5,5,6]`, `k = 4`

| x | Action | Heap contents | Root |
|---|---|---|---|
| 3 | push | {3} | 3 |
| 2 | push | {2, 3} | 2 |
| 3 | push | {2, 3, 3} | 2 |
| 1 | push (size reaches k) | {1, 2, 3, 3} | 1 |
| 2 | 2 > 1 → replace | {2, 2, 3, 3} | 2 |
| 4 | 4 > 2 → replace one 2 | {2, 3, 3, 4} | 2 |
| 5 | 5 > 2 → replace | {3, 3, 4, 5} | 3 |
| 5 | 5 > 3 → replace one 3 | {3, 4, 5, 5} | 3 |
| 6 | 6 > 3 → replace | {4, 5, 5, 6} | **4** ✓ |

Note the heap legitimately holds duplicates (`{2,2,3,3}`) — that's *required*, since "kth largest ≠ kth distinct."

### Why it's correct

Invariant: after processing `i` elements, the heap contains the `k` largest of those `i` (or all `i` if `i < k`), so `heap[0]` is the running kth largest. Induction step: a new `x` either already belongs to that top-k set (it beats the current weakest member) or it doesn't (it's ≤ the root, and `k` elements ≥ root already occupy the top-k slots). The boundary `k = n` works automatically: the heap never fills to eviction, ends as the whole array, and its root is the minimum — exactly the n-th largest.

### Complexity

- **Time: O(n log k)** — each of the `n` elements triggers at most one heap operation, and every operation sifts through a complete binary tree of height ⌈log₂ k⌉.
- **Space: O(k).**
- Bonus: this is literally the solution to the streaming follow-up (LeetCode 703, *Kth Largest Element in a Stream*) — the heap persists and each new element costs O(log k).

Python one-liner worth knowing: `heapq.nlargest(k, nums)[-1]` (internally a size-k min-heap, also O(n log k)).

---

## 6. Approach B (the follow-up): randomized quickselect — expected O(n)

When the interviewer says *"can you do better than n log k?"*, this is the answer.

**Idea:** pick a pivot, partition like quicksort. The pivot now sits at its **final sorted index** `p`. The kth largest's final index is `t = n - k` (ascending). If `p == t`, done. If `p < t`, the answer is strictly to the right; if `p > t`, strictly to the left. Recurse into **one side only**.

```python
import random

def findKthLargest(nums: list[int], k: int) -> int:
    n = len(nums)
    target = n - k                    # kth largest == index n-k in ascending order
    lo, hi = 0, n - 1
    while True:                       # iterative: immune to Python's recursion limit
        if lo == hi:
            return nums[lo]
        r = random.randint(lo, hi)    # random pivot: dodges sorted/reverse inputs
        nums[r], nums[hi] = nums[hi], nums[r]
        pivot = nums[hi]
        i = lo - 1                    # Lomuto partition: boundary of "< pivot" zone
        for j in range(lo, hi):
            if nums[j] < pivot:
                i += 1
                nums[i], nums[j] = nums[j], nums[i]
        nums[i + 1], nums[hi] = nums[hi], nums[i + 1]
        p = i + 1                     # pivot's final sorted index
        if p == target:
            return nums[p]
        if p < target:
            lo = p + 1                # keep only the right window
        else:
            hi = p - 1                # keep only the left window
```

**Worked trace, Example 1** — `t = n - k = 4`. (Pivot = last element shown for reproducibility; real code randomizes.)

*Pass 1: window `[0..5]`, pivot = `nums[5]` = 4, `i` starts at −1.*

| j | nums[j] | `< 4`? | Effect | Array after |
|---|---|---|---|---|
| 0 | 3 | yes | i→0, swap(0,0) (no-op) | `[3,2,1,5,6,4]` |
| 1 | 2 | yes | i→1, swap(1,1) | `[3,2,1,5,6,4]` |
| 2 | 1 | yes | i→2, swap(2,2) | `[3,2,1,5,6,4]` |
| 3 | 5 | no | — | `[3,2,1,5,6,4]` |
| 4 | 6 | no | — | `[3,2,1,5,6,4]` |
| final | swap(i+1=3, hi=5) | | pivot lands at index 3 | `[3,2,1,4,6,5]` |

`p = 3 < t = 4` → keep right window `[4..5]` only.

*Pass 2: window `[4..5]`, pivot = `nums[5]` = 5. `j=4`: 6 < 5? No. Swap positions 4 and 5 →* `[3,2,1,4,5,6]`, `p = 4 == t` → **return `nums[4] = 5`** ✓.

### Complexity

- **Expected O(n):** a uniformly random pivot keeps the expected surviving window at ≤ ¾ of its previous size, so expected work is `n · (1 + ¾ + (¾)² + …) < 4n`.
- **Worst case O(n²):** possible if the pivot lands at an extreme every round, removing only one element per pass — randomization makes this astronomically unlikely but doesn't eliminate it.
- **Deterministic O(n) worst case exists:** median-of-medians (BFPRT) groups elements into fives, uses the median-of-medians as pivot, and guarantees ≥ 30% of elements are discarded per round, giving `T(n) ≤ T(n/5) + T(7n/10) + O(n) = O(n)`. Name it; almost never implement it in an interview.
- **Space: O(1)** in the iterative form. It **mutates `nums`** — ask permission first.

### Duplicates can kill Lomuto — use 3-way partition

On an all-equal array like `[2,2,2,2]` with `k = 1`, Lomuto never finds an element `< pivot`, so the pivot lands at `lo` every time and the window shrinks by exactly 1 per pass → O(n²) on a trivial input. The fix is the Dutch-national-flag (three-way) partition:

```python
def three_way_partition(nums, lo, hi):
    """Returns (lt, gt) such that nums[lo..lt-1] < pivot,
    nums[lt..gt] == pivot, nums[gt+1..hi] > pivot."""
    pivot = nums[lo]
    lt, i, gt = lo, lo, hi
    while i <= gt:
        if nums[i] < pivot:
            nums[lt], nums[i] = nums[i], nums[lt]; lt += 1; i += 1
        elif nums[i] > pivot:
            nums[i], nums[gt] = nums[gt], nums[i]; gt -= 1
        else:
            i += 1
    return lt, gt
```

Integration into the loop:

```python
lt, gt = three_way_partition(nums, lo, hi)
if lt <= target <= gt:
    return nums[target]        # the entire equal-band IS the answer
if target < lt:
    hi = lt - 1
else:
    lo = gt + 1
```

On `[2,2,2,2]`, `k=1` (target 3): `lt=0, gt=3`, target inside the band → instant answer.

---

## 7. Approach C (constraint exploit): counting sweep — true O(n)

Values are confined to `[-10⁴, 10⁴]` — only 20,001 slots. Count, then sweep from the largest value downward accumulating counts until the cumulative total reaches `k`. This is *not* comparison-based, so it sidesteps the comparison-model costs entirely.

```python
def findKthLargest(nums: list[int], k: int) -> int:
    OFFSET = 10**4
    counts = [0] * (2 * OFFSET + 1)          # index v + OFFSET covers -10^4 .. 10^4
    for x in nums:
        counts[x + OFFSET] += 1              # offset is mandatory: negatives!
    need = k
    for v in range(2 * OFFSET, -1, -1):      # sweep values, largest -> smallest
        need -= counts[v]
        if need <= 0:
            return v - OFFSET
    raise ValueError("unreachable")          # k <= n guarantees a return
```

**Trace, Example 1** (`k = 2`): sweep `v = 6`: `need = 2 − 1 = 1`; `v = 5`: `need = 1 − 1 = 0 ≤ 0` → **return 5** ✓. (Example 2: 6 → need 3; 5 → need 1; 4 → need 0 → return 4 ✓.)

**Complexity:** O(n + V) time, O(V) space with V = 20,001 — one pass to count, one bounded pass over the value domain. Caveat to state out loud: this *depends on the value bound*; if values were unbounded, fall back to the heap.

---

## 8. Complexity comparison table

| Approach | Time | Extra space | Mutates input? | When it shines |
|---|---|---|---|---|
| Sort (baseline) | O(n log n) | O(n) (Timsort) | `sorted`: no / `.sort`: yes | you need the full order anyway |
| Min-heap of size k | O(n log k) | O(k) | no | **default answer**; streaming (LC 703) |
| Heapify all + pop `n−k` | O(n + (n−k)·log n) | O(1) | yes | `k` close to `n` (few pops) |
| `heapq.nlargest(k, …)[−1]` | O(n log k) | O(k) | no | Python one-liner |
| Randomized quickselect | expected O(n), worst O(n²) | O(1) iterative | yes | "beat n log k" follow-up |
| Median-of-medians | O(n) worst case | O(log n) stack | yes | guarantees; name-drop only |
| Counting sweep | O(n + V), V = 20 001 | O(V) | no | bounded values (this problem) |
| C++ `nth_element` | expected O(n) (introselect — it switches to a median-of-medians-style pivot scheme if partitioning degenerates) | O(1) | yes | C++ one-liner |

(Heapify-all being O(n): build-heap's work is the sum of each node's height, `Σₕ (n/2^(h+1))·h`, which sums to O(n).)

---

## 9. Language gotchas (beyond Python)

| Language | Gotcha |
|---|---|
| **Python** | `heapq` is **min-heap only** (convenient here; negate values for a max-heap). Python's *negative list indices silently wrap around* — a forgotten `+ OFFSET` in the counting array reads/writes the wrong slot instead of crashing. Default recursion limit ≈ 1000 argues for the iterative quickselect. |
| **Java** | `PriorityQueue` is min-heap by default (convenient); elements **autobox** to `Integer` (allocation churn — fine at n = 10⁵, worth mentioning). For a max-heap variant use `Collections.reverseOrder()`; do *not* hand-negate values, since negating `Integer.MIN_VALUE` overflows (irrelevant under these constraints, but the habit matters). |
| **C++** | `std::priority_queue` defaults to a **max-heap** — you must write `priority_queue<int, vector<int>, greater<int>>` (needs `<functional>`) to get the size-k min-heap. One-liner: `nth_element(nums.begin(), nums.begin() + (n - k), nums.end()); return nums[n - k];` — but note it **permutes `nums`**. |

Reference heap implementations (short, for the gotchas above):

```java
PriorityQueue<Integer> heap = new PriorityQueue<>();   // Java: min-heap by default
for (int x : nums) { heap.offer(x); if (heap.size() > k) heap.poll(); }
return heap.peek();
```

```cpp
std::priority_queue<int, std::vector<int>, std::greater<int>> heap; // C++: pass greater<>!
for (int x : nums) { heap.push(x); if ((int)heap.size() > k) heap.pop(); }
return heap.top();
```

---

## 10. Common mistakes

1. **Off-by-one on the final index.** `sorted(nums, reverse=True)[k]` instead of `[k-1]`, or `nums[n-k+1]` ascending. Remember: rank `k` (1-based) → descending index `k-1` → ascending index `n-k`.
2. **Solving "kth distinct largest" instead.** The problem says duplicates count: `[5,5,4,1]`, `k=2` → **5**, not 4. If you de-duplicate first, you're answering a different question.
3. **Wrong heap direction.** Maintaining a *max*-heap of size k evicts your strongest candidates. You need the min-heap so the root is the weakest top-k member. (In C++, the default `priority_queue` is a max-heap — a silent logic inversion.)
4. **Flipped eviction condition.** Replacing the root when `x < heap[0]` admits a smaller element and evicts a true top-k member, corrupting the invariant and producing a too-small answer. Only evict when `x > heap[0]`.
5. **Lomuto + heavy duplicates.** All-equal (or few-distinct) inputs degrade Lomuto quickselect to O(n²) because nothing is `< pivot`; the window shrinks by one per pass. Fix with 3-way partition (Section 6).
6. **Fixed first/last pivot on sorted input.** `[1,2,…,n]` or reverse-sorted turns deterministic-pivot quickselect into O(n²); randomize the pivot.
7. **Deep recursion in Python.** Worst-case quickselect depth is O(n), past Python's ~1000-frame limit — write the loop iteratively.
8. **Mutating the input without asking.** Quickselect, `nums.sort()`, and `heapify` all permute `nums`; `sorted(...)` and the push/pop heap do not. Ask which is acceptable.
9. **Forgetting the offset in counting.** `counts[x]` with `x = -3` either crashes (Java/C++ out-of-bounds) or — nastier in Python — silently wraps to the end of the list. Always index `x + 10**4`.

---

## 11. Test plan — propose these out loud before/after coding

Say: *"Before I call it done, here are the cases I'd verify — the two official examples, plus the boundaries."*

| # | Input | k | Expected | Why it matters |
|---|---|---|---|---|
| 1 | `[3,2,1,5,6,4]` | 2 | 5 | Official example 1 |
| 2 | `[3,2,3,1,2,4,5,5,6]` | 4 | 4 | Official example 2; duplicates must count toward k |
| 3 | `[7]` | 1 | 7 | Smallest input; `k = 1` boundary (the max) |
| 4 | `[2,2,2,2]` | 3 | 2 | All duplicates; stresses quickselect's pivot behavior (and the heap's duplicate tolerance) |
| 5 | `[9,1,5]` | 3 | 1 | `k = n` boundary (the minimum) — must not crash or evict wrongly |
| 6 | `[-5,-1,-3]` | 1 | −1 | Negative values; breaks counting without the offset; `k = 1` again |

Pro tips to say out loud: run the quickselect version **several times** (random pivot) and fuzz it against `sorted(nums, reverse=True)[k-1]` on random arrays; state whether your chosen approach may mutate `nums` and pick `sorted`/heap if not.

---

## 12. Transferable patterns & related problems

| Pattern | Essence | Problems |
|---|---|---|
| **Heap of size k** | Keep the k best candidates; root = the kth-best metric value. Works on streams. | LC 215 (this), LC 703 (Kth Largest in a Stream), LC 347 (Top K Frequent), LC 973 (K Closest Points), LC 692 (Top K Frequent Words — adds tie-breaking comparator) |
| **Selection via partition (quickselect)** | One partition fixes one element's final index; recurse one side. Expected O(n). | LC 215, LC 462 (Minimum Moves II — the median is selection at k ≈ n/2), finding any order statistic |
| **Counting when the value range is bounded** | Trade value-range memory for linear, comparison-free time. | This problem's counting variant; LC 347's bucket-by-frequency variant |
| **3-way (Dutch flag) partition** | Collapse equal bands — fixes duplicates and is a problem of its own. | LC 75 (Sort Colors); robust quickselect |

Decision rule to internalize: **streaming or repeated queries → size-k heap; one-shot with mutation allowed → quickselect; tiny bounded value range → counting; need the whole order anyway → just sort.**

---

## 13. Full interview talk track (the script)

**Phase 1 — Restate & clarify (~30s):** "So this is the kth largest in *sorted order* — duplicates count as separate ranks, so in `[5,5,4]` the 2nd largest is 5. And `k` is guaranteed between 1 and n. One question: is mutating the input array acceptable?"

**Phase 2 — Options out loud (~20s):** "Brute force is sort descending and take index `k−1` — O(n log n). But we only need *one* order statistic, not the full order, so two improvements come to mind: a min-heap capped at size k for O(n log k), or quickselect at expected O(n). I'll build the heap first — it's simple, and it also works if numbers arrive as a stream."

**Phase 3 — While coding (~3–5 min):** "Invariant I'm maintaining: this heap always contains the k largest elements seen so far, so its root — the smallest of them — is the running kth largest. If the heap isn't full I push; if it's full and `x` beats the root, `heapreplace` does the evict-and-insert in a single sift. Equal elements don't displace anything. Answer is `heap[0]`."

**Phase 4 — Dry run (~1 min):** "Example 1, k=2: heap ends as `{5, 6}`, root 5 — matches. Example 2, k=4: ends `{4, 5, 5, 6}`, root 4 — matches."

**Phase 5 — Tests (~1 min):** "Edge cases I'd add: single element with k=1; all-duplicates like `[2,2,2,2]`; k=n returning the minimum; negatives. I'd also fuzz against `sorted(nums, reverse=True)[k-1]`."

**Phase 6 — Complexity & follow-ups:** "O(n log k) time — n elements, each doing one heap op on a heap of height log k — and O(k) space. If you want average-linear: quickselect — a random pivot, partition, and the pivot's final index `p` compared against the target index `n−k`, recursing into one side. Expected O(n) because the surviving side shrinks geometrically; worst case O(n²), which median-of-medians fixes deterministically. And given the ±10⁴ bound, a 20,001-slot count array swept from the top is strictly O(n + V)."

---

## 14. Say it in 60 seconds

*"Sorting works but pays for a full ordering when I need one element. My default: a min-heap capped at size k — push each number, and once the heap exceeds k, pop the smallest, so it always holds the k largest so far and its root is the kth largest. That's n log k time, k space, and it even handles a stream. If asked to beat that: quickselect with a random pivot — partition puts the pivot at its final sorted index; compare it to target index n−k and recurse into one side only. Expected linear because the surviving side shrinks geometrically each round; worst case quadratic, fixed deterministically by median-of-medians. And since values are bounded to ±10⁴, a 20,001-slot counting array swept from the top gives a true O(n) answer. Tests: both official examples, a single element, all-duplicates, k=1, and k=n."*

*(~165 words ≈ 60 seconds at interview pace; drop the median-of-medians clause if you're running long.)*
