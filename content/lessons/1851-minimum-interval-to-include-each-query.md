# Minimum Interval to Include Each Query — Complete DSA Lesson

**LeetCode 1851 · Medium · Topics: Sorting, Heap (Priority Queue), Offline Query Processing, Two Pointers**

---

## 1. Problem Restatement (in your own words)

You have a set of `n` intervals on the integer number line, and `m` query points. For each query point `q`, find the **shortest** interval `[L, R]` such that `L ≤ q ≤ R`, and report its length `R - L + 1`. If no interval covers `q`, report `-1`. Answers must be returned in the **original order of the queries**.

Key vocabulary check — say these out loud in an interview:

- **Interval size** = number of integers it contains = `right - left + 1` (inclusive both ends).
- **Containment** is inclusive: endpoints count (`queries[j]` may equal `left_i` or `right_i`).
- The output array must align with `queries`, not with any sorted order we process in.

---

## 2. Constraint Decoding — what the numbers tell us

| Constraint | Value | What it implies |
|---|---|---|
| `intervals.length` | ≤ 10^5 | An **O(n · m)** pairwise check is 10^10 operations → TLE. We need roughly **O((n + m) log(something))** or better. |
| `queries.length` | ≤ 10^5 | Same scale. Anything quadratic is dead; anything with a log factor per query is fine. |
| `left_i, right_i, queries[j]` | ≤ 10^7 | Values fit easily in 32-bit ints. No overflow concerns for sizes (max size = 10^7). But it means we **cannot build an array indexed by value** (10^7 slots is memory-feasible but wasteful; coordinate compression would work but isn't needed). |
| Sizes can be as small as 1 | `[4,4]` | Degenerate single-point intervals are legal and often the answer (see Example 1, query 4). |

The decisive observation: **queries have no interdependency** — the answer to query `j` doesn't depend on query `j-1`. That means we are free to **reorder the queries**, process them in whatever order makes the algorithm efficient, and then restore the original order at the end. This is the **offline query processing** pattern.

---

## 3. Brute Force — and why it fails

For each query, scan every interval, check `left ≤ q ≤ right`, track the minimum size.

```python
def minInterval_bruteforce(intervals, queries):
    ans = []
    for q in queries:                      # m iterations
        best = -1
        for l, r in intervals:             # n iterations
            if l <= q <= r:
                size = r - l + 1
                if best == -1 or size < best:
                    best = size
        ans.append(best)
    return ans
```

**Worked trace** on Example 1, `intervals = [[1,4],[2,4],[3,6],[4,4]]`, `queries = [2,3,4,5]`:

| Query `q` | Containing intervals (sizes) | Min size |
|---|---|---|
| 2 | [1,4]→4, [2,4]→3 | **3** |
| 3 | [1,4]→4, [2,4]→3 | **3** |
| 4 | [1,4]→4, [2,4]→3, [3,6]→4, [4,4]→1 | **1** |
| 5 | [3,6]→4 | **4** |

Output `[3,3,1,4]` ✓ — correct, but **O(n · m) = 10^10** at max scale. 

The inefficiency: for query `q` we re-examine *every* interval, even though between consecutive sorted queries, only a few intervals' membership status ("contains `q`" vs. "doesn't") changes. The fix is to **incrementally maintain the set of intervals containing the current query point as the query point moves right**.

---

## 4. Core Insight

Two facts drive the optimal solution:

1. **Interval membership changes monotonically.** If we process queries in **increasing order of value**, an interval that stops containing the current query (`right < q`) will *never* contain any later query either — later queries are even larger. So we can discard it permanently. Conversely, an interval becomes "active" as soon as `q ≥ left`; since queries move rightward, each interval crosses its `left` exactly once.

2. **We want the minimum-size active interval at each moment.** This is exactly a **min-heap** workload: push intervals as they activate, lazily remove expired ones from the top, and the top of the heap is the answer.

Combining:

> **Sort intervals by `left`. Sort queries by value (remembering original indices). Sweep queries left-to-right; before answering each query, push every interval with `left ≤ q`, then pop heap entries whose `right < q`. The heap top's size is the answer.**

The elegance is in the bookkeeping: each interval is **pushed exactly once** (via an advancing pointer over the sorted intervals) and **popped at most once** (lazily, only when it reaches the top and is expired). No interval is ever re-pushed, so total heap operations are O(n + m), each O(log n).

Note why we don't need to actively remove expired intervals from the middle of the heap: an expired interval *buried* under smaller-size entries doesn't affect the answer yet. If it ever surfaces to the top, we check and discard it then. This is the **lazy deletion** idiom.

---

## 5. Optimal Algorithm

### Pseudocode

```
sort intervals by left endpoint
pair each query with its original index; sort by query value
minHeap = empty            # entries (size, right)
i = 0                      # pointer into sorted intervals
for (q, idx) in sorted queries:
    while i < n and intervals[i].left <= q:
        push (size, right) of intervals[i] onto heap
        i += 1
    while heap not empty and heap.top.right < q:
        pop heap.top                    # expired forever
    ans[idx] = heap.top.size if heap not empty else -1
return ans
```

### Python implementation

```python
import heapq

def minInterval(intervals, queries):
    intervals.sort(key=lambda iv: iv[0])            # sort by left
    # queries with original indices, sorted by query value
    qs = sorted((q, j) for j, q in enumerate(queries))

    ans = [-1] * len(queries)
    heap = []          # (size, right); heapq is a min-heap on tuples
    i = 0
    n = len(intervals)

    for q, idx in qs:
        # activate all intervals whose left endpoint is <= q
        while i < n and intervals[i][0] <= q:
            l, r = intervals[i]
            heapq.heappush(heap, (r - l + 1, r))
            i += 1
        # lazily discard intervals that no longer contain q (or later queries)
        while heap and heap[0][1] < q:
            heapq.heappop(heap)
        if heap:
            ans[idx] = heap[0][0]
    return ans
```

### Detailed trace — Example 1

`intervals = [[1,4],[2,4],[3,6],[4,4]]`, `queries = [2,3,4,5]`

Sorted by left (already sorted): `[1,4], [2,4], [3,6], [4,4]`.
Sorted queries with indices: `(2,0), (3,1), (4,2), (5,3)`.

| q | Push step (pointer `i` moves) | Heap contents `(size, right)` | Lazy pops | Answer → `ans[idx]` |
|---|---|---|---|---|
| 2 | push [1,4]→(4,4), [2,4]→(3,4); i=2 | {(3,4), (4,4)} | none (top right=4 ≥ 2) | 3 → ans[0] |
| 3 | push [3,6]→(4,6); i=3 | {(3,4), (4,4), (4,6)} | none (top right=4 ≥ 3) | 3 → ans[1] |
| 4 | push [4,4]→(1,4); i=4 | {(1,4), (3,4), (4,4), (4,6)} | none (top right=4 ≥ 4) | 1 → ans[2] |
| 5 | none (i=4=n) | pop (1,4): right 4 < 5; pop (3,4): 4 < 5; pop (4,4): 4 < 5 | top now (4,6), right 6 ≥ 5 | 4 → ans[3] |

Restore original order: `ans = [3, 3, 1, 4]` ✓

⚠️ Note query 4: `[4,4]` is size **1** — the `+1` in `r - l + 1` is doing real work. Forgetting it gives size 0 and wrong answers everywhere.

### Detailed trace — Example 2

`intervals = [[2,3],[2,5],[1,8],[20,25]]`, `queries = [2,19,5,22]`

Sorted by left: `[1,8], [2,3], [2,5], [20,25]`.
Sorted queries: `(2,0), (5,2), (19,1), (22,3)`.

| q | Push step | Heap after pushes | Lazy pops | Answer → `ans[idx]` |
|---|---|---|---|---|
| 2 | push [1,8]→(7,8), [2,3]→(2,3), [2,5]→(4,5); i=3 | {(2,3), (4,5), (7,8)} | none (top right=3 ≥ 2) | 2 → ans[0] |
| 5 | none ([20,25] has left 20 > 5) | pop (2,3): right 3 < 5 | top (4,5), right 5 ≥ 5 | 4 → ans[2] |
| 19 | none | pop (4,5): 5 < 19; pop (7,8): 8 < 19 | heap **empty** | -1 → ans[1] |
| 22 | push [20,25]→(6,25); i=4 | {(6,25)} | none | 6 → ans[3] |

Restore original order: `ans = [2, -1, 4, 6]` ✓

Notice the pointer `i` only ever moves forward — at `q=19` nothing new activates, and at `q=22` the heap that was emptied is repopulated by the far-right interval. That's fine: emptiness just means "no active interval," and `-1` is the default.

---

## 6. Complexity Analysis

Let `n = len(intervals)`, `m = len(queries)`.

| Step | Cost |
|---|---|
| Sort intervals | O(n log n) |
| Sort queries (with indices) | O(m log m) |
| Sweep: pushes + pops | O((n + m) log n) — each interval pushed once, popped ≤ once; each query does O(1) amortized heap inspections plus pops it triggers |
| **Total time** | **O(n log n + m log m + (n + m) log n) = O((n + m) log(n + m))** |
| **Space** | **O(n + m)** — heap holds ≤ n entries, plus the sorted query-index pairs |

Amortized argument worth saying aloud: the pointer `i` advances at most `n` times total across the whole loop, and every popped heap element was pushed exactly once, so total heap operations are bounded by `2n + m` pushes/pops even though the inner `while` loops *look* nested.

---

## 7. Alternative Optimal Approaches (know these exist, mention one)

**A) Sort by size + "best prefix" with binary search + pointer skipping.** Sort intervals by size ascending, sort queries. Sweep intervals in size order; for each interval, it can only *improve* answers for query points where no smaller interval already covers. Maintain a sorted structure keyed by left endpoint storing the best size seen so far; when a query arrives, binary-search for the largest stored `left ≤ q` and check its associated `right ≥ q` (this variant needs care — a pure binary search is insufficient because a smaller interval might have a smaller `left` but a too-small `right`). Some solutions combine this with a **DSU/union-find "next uncovered position"** trick to skip already-answered positions. It works but is fiddlier than the heap; I'd code the heap version first.

**B) Segment tree over compressed coordinates** storing minimum size per range, updated per interval, queried per point — O((n + m) log(n + m)) too, but strictly more code and memory. Mention it as "exists, heavier, same complexity" and move on. (No stronger-than-log bound is claimed here: in the comparison model, sorting the `n + m` inputs already requires Ω((n+m) log(n+m)) comparisons, so a pure comparison-based algorithm can't beat this asymptotically.)

**Interview guidance:** say "the heap sweep is my primary plan; a segment tree over compressed coordinates is the backup," then code the heap.

---

## 8. Common Mistakes & Gotchas

| # | Mistake | Why it bites | Fix |
|---|---|---|---|
| 1 | **Forgetting to restore original query order** | Returning answers in sorted-query order fails hidden tests even though values match | Pair each query with its index *before* sorting; write into `ans[idx]` |
| 2 | **Resetting the pointer `i` per query** (or re-scanning intervals) | Reverts to O(n·m); also breaks the "each interval pushed once" amortized bound | `i` is a global forward-only pointer across the whole loop |
| 3 | **Off-by-one in size**: using `r - l` instead of `r - l + 1` | `[4,4]` gets size 0; every answer off by one | Sizes are inclusive-inclusive; test with `[4,4]` |
| 4 | **Strict vs. non-strict comparisons**: using `right <= q` for the pop condition, or `left < q` for the push condition | Endpoints *count* as containment (`L ≤ q ≤ R`), so `right == q` is valid and must not be popped; `left == q` must be pushed | Pop while `right < q`; push while `left <= q` |
| 5 | **Returning 0 instead of -1** for uncovered queries | Heap-empty case must map to `-1` | Initialize `ans` with `-1` and only overwrite when the heap is non-empty |
| 6 | **Duplicated intervals / duplicated queries** | `[2,4]` appearing twice must be pushed twice — deduplication is unnecessary and skipping duplicates by "value seen before" is wrong | The algorithm handles duplicates naturally; don't add dedup logic |
| 7 | **Heap comparison breaking ties badly** | In Python, ties on `size` fall through to comparing `right` — harmless here, but be aware | Optional: push `(size, right)` deliberately; never push anything unorderable |

### Language-specific gotchas

- **Java:** `PriorityQueue<int[]>` has no natural comparator for arrays — you **must** pass `Comparator.comparingInt(a -> a[0])` (and it will not compare the second element automatically). Also, `Arrays.sort` on `int[][]` requires an explicit lambda comparator on Java versions before the `Arrays.sort(T[], Comparator)` double-pivot quirks matter; use `Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]))` — returning `a[0] - b[0]` is safe here (values ≤ 10^7, difference fits in int), but `Integer.compare` is the habit worth keeping for values up to ±2·10^9.
- **C++:** a `priority_queue` is a **max-heap by default**; for a min-heap on `pair<int,int>` you need `priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>>`. Also, `sort(queries...)` must sort *pairs* of (value, original index) — sorting only the values loses the mapping back to output positions.
- **Python:** `heapq` is a min-heap on tuple lexicographic order — `(size, right)` pops smallest size first, which is exactly what we want; don't negate values as you would for a max-heap pattern.

---

## 9. Test Cases to Propose Out Loud

Before coding, narrate these:

1. **Example 1** — `intervals = [[1,4],[2,4],[3,6],[4,4]]`, `queries = [2,3,4,5]` → `[3,3,1,4]`. Checks endpoint query (`q=4` hits `[4,4]`), tie in sizes, lazy deletion firing mid-sweep (`q=5` empties the heap down to `[3,6]`).
2. **Example 2** — `intervals = [[2,3],[2,5],[1,8],[20,25]]`, `queries = [2,19,5,22]` → `[2,-1,4,6]`. Checks the `-1` case, a query landing in a "gap," and heap refill after full depletion.
3. **Degenerate interval & exact endpoint hit** — `intervals = [[4,4]]`, `queries = [4, 3, 5]` → `[1, -1, -1]`. Confirms size formula (`4 - 4 + 1 = 1`) and that equality on the pop condition (`right == q` survives) works.
4. **Query smaller than all lefts** — `intervals = [[10,20]]`, `queries = [1, 10, 20, 21]` → `[-1, 11, 11, -1]`. Checks pushes at the very first query and boundary inclusion on both sides.
5. **Duplicate intervals and duplicate queries** — `intervals = [[2,4],[2,4],[2,4]]`, `queries = [3, 3]` → `[3, 3]`. Confirms no dedup is needed and repeated queries are independent.

---

## 10. Transferable Patterns & Related Problems

The reusable skeleton here is **"sort one side, sort the other, sweep with a monotonic pointer + lazily-cleaned min-heap."** Variants of this show up constantly:

| Problem | Same pattern |
|---|---|
| **Meeting Rooms II (LC 253)** | Sort by start, heap of end times, lazy expiry of finished meetings |
| **Car Pooling (LC 1097)** / **Booking Concert Tickets** | Sweep of events with incremental state |
| **Sliding Window Maximum (LC 239)** | Monotonic structure + discard-from-the-front/expired elements |
| **The Number of Smaller / "k-th active" queries offline** | Sort queries, maintain an order-statistic structure |
| **Find Right Interval (LC 436)** | Sort + binary search per query (the "lighter" cousin when the tracked quantity is orderable by binary search) |
| **Kth Largest in a Stream** | Min-heap of size k — same "heap maintains current best set" idea |

The meta-lessons to state explicitly in an interview:

- **"Queries are independent" ⇒ process offline in a convenient order, then un-sort.** This unlocks sorting as a tool.
- **"Membership changes monotonically as the sweep point moves" ⇒ each element activates once and expires once ⇒ O(n + m) total structure operations.** This is the amortized argument that turns a nested-loop-looking algorithm into linear-plus-log.
- **"We only ever need the minimum of the active set" ⇒ min-heap + lazy deletion** (rather than a balanced BST or segment tree, which you'd need only if you needed arbitrary deletion or arbitrary-order queries).

---

## 11. Full Talk Track (for rehearsal)

> "Brute force is a scan of all intervals per query — O(n·m), ten billion at these constraints, too slow. But the queries are independent of each other, so I can process them offline in sorted order and write answers back by original index.
>
> Sorted by query value, membership in an interval is monotone: once `right < q`, the interval is dead for all future queries; once `q ≥ left`, it's alive from then on. So I sort intervals by left endpoint, keep a forward pointer that pushes each interval into a min-heap keyed by size exactly once when the sweep passes its left, and lazily pop expired intervals from the heap top when they surface. The heap top's size is the answer, or -1 if the heap empties.
>
> Correctness: the heap holds exactly the intervals containing the current query, minus expired ones still buried — and buried ones can't be the minimum until they surface, at which point we discard them. Termination/complexity: each interval is pushed once and popped at most once, so it's O((n+m) log n) total. Sizes are `right - left + 1`, endpoints inclusive, so I pop on strict `right < q` and push on `left <= q`. Let me code it."

---

## 12. Say It in 60 Seconds

> "Brute force is n-times-m, too slow at a hundred thousand each. Key move: queries are independent, so I'll process them offline — sort intervals by left endpoint, sort queries by value while keeping their original indices. Sweeping queries left to right, interval membership only changes monotonically: each interval activates once when the sweep passes its left, and dies permanently once its right falls below the current query. So I keep a forward pointer pushing each interval into a min-heap keyed by size — pushed exactly once — and lazily pop expired intervals off the top, since anything expired now stays expired for all later queries. The heap top's size is the answer; empty heap means -1, and I write answers back by original index. Sizes are right minus left plus one with both endpoints included, so I pop on strictly-less and push on less-or-equal. Each interval is pushed once and popped at most once, so it's n-plus-m log n total, linear space. Done."
