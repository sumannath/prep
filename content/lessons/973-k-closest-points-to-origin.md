# K Closest Points to Origin — Complete Interview Lesson

## 1. Restating the problem (what you're actually asked)

Given up to 10⁴ points on a 2‑D plane and an integer `k`, return **any `k` points with the smallest Euclidean distance to the origin (0, 0)**. Two details in the statement do heavy lifting:

- **"You may return the answer in any order."** → You do *not* need the output sorted by distance. This converts the problem from *sorting* to *selection*.
- **"The answer is guaranteed to be unique (except for the order)."** → There is no tie exactly at the cut between the k-th and (k+1)-th closest point, so the *set* you return is unambiguous. (Ties *inside* the answer can still exist — two selected points may share a distance — and your code must not crash on them.)

Formally: minimize/compare the key `d(p) = √(x² + y²)` and return the `k` points with smallest keys.

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 ≤ k ≤ points.length ≤ 10⁴` | `k` is never 0 and never exceeds `n` — you never return an empty answer and never slice past the end. `n log n ≈ 1.4 × 10⁵` operations, so even a full sort passes comfortably. An `O(n·k)` repeated-minimum scan would be up to `10⁸` operations — too slow in Python, so don't propose it as your final answer. |
| `−10⁴ ≤ x, y ≤ 10⁴` | The squared distance `x² + y² ≤ 10⁸ + 10⁸ = 2×10⁸`, which fits in a 32‑bit signed int (max ≈ 2.147×10⁹). So in Java/C++ an `int` key is safe **for these bounds** — but this is a coincidence of the bounds, not a law (see §11). |
| Euclidean distance | Distances are irrational after `sqrt`. But see the core insight: you never need to take the square root. |
| Counting-sort style bucketing by distance? | Not applicable: the key range (up to 2×10⁸ distinct values) is far too large to bucket directly. |

## 3. Clarifying questions worth asking out loud

- "May I mutate the input array?" (matters for quickselect)
- "Is `k` guaranteed to be ≤ `n`?" (yes per constraints — say you checked)
- "Is the output allowed in any order?" (yes — this is what unlocks the fast approaches)
- "One-shot batch or a stream of arriving points?" (interviewer may pivot you to the heap)

## 4. Baseline: brute force

**Naive-naive:** repeat `k` times — scan all remaining points, find the minimum distance, remove it. That's `O(n·k)` time, up to 10⁸ steps here. Correct but too slow in Python; mention it only to dismiss it.

**Practical brute force:** compute every squared distance, sort by it, take the first `k`.

```python
def kClosest(points, k):
    return sorted(points, key=lambda p: p[0] * p[0] + p[1] * p[1])[:k]
```

**Worked trace on Example 2:** `points = [[3,3],[5,-1],[-2,4]]`, `k = 2`

| i | point (x, y) | d² = x² + y² |
|---|---|---|
| 0 | (3, 3) | 9 + 9 = **18** |
| 1 | (5, −1) | 25 + 1 = **26** |
| 2 | (−2, 4) | 4 + 16 = **20** |

Sorted by d²: `(18) [3,3]` → `(20) [-2,4]` → `(26) [5,-1]`. Slice `[:2]` → `[[3,3], [-2,4]]` ✓ (matches, and `[[3,3],[-2,4]]` vs `[[-2,4],[3,3]]` are both accepted).

Cost: `O(n log n)` time, `O(n)` auxiliary space for Python's Timsort. Perfectly fine at n = 10⁴ — but the "any order" clause tells you sorting *everything* is wasted work, which is the bridge to the optimal approaches.

## 5. The core insight (three stacked observations)

1. **Skip the square root.** `√` is strictly increasing on `[0, ∞)`, and squared distances are non‑negative, so for any two points, `d²(a) < d²(b)` ⟺ `d(a) < d(b)`. Ranking by `x² + y²` is *exactly* the same ranking as by true distance. You keep integer arithmetic (exact, fast, tie‑preserving) and avoid floats entirely.
2. **"Any order" ⇒ selection, not sorting.** A full sort produces information you were never asked for. You only need the k smallest keys — an *order statistic*.
3. **Only k survivors matter ⇒ bounded structure.** Either (A) keep a max‑heap of the current best k and evict the worst per new point, or (B) partition the array so the k closest land in the first k slots (quickselect). (A) is `O(n log k)` and stream‑friendly; (B) is expected `O(n)`.

## 6. Optimal approach A — bounded max‑heap of size k

**Idea:** maintain at most `k` candidates. The heap is ordered by *negated* squared distance, so its root is always the **worst (farthest) of the current best k**. For each incoming point: if the heap isn't full, push; otherwise, replace the root only if the new point strictly beats the root.

```python
import heapq

def kClosest(points, k):
    heap = []  # entries: (-d2, x, y) -> min-heap on -d2 == max-heap on d2
    for x, y in points:
        d2 = x * x + y * y
        if len(heap) < k:
            heapq.heappush(heap, (-d2, x, y))
        elif d2 < -heap[0][0]:            # strictly closer than current k-th best
            heapq.heapreplace(heap, (-d2, x, y))  # pop root + push in one op
    return [[x, y] for (_, x, y) in heap]
```

Why the pieces matter:

- Python's `heapq` is a **min‑heap**; to evict the *farthest* point you must negate the key. Using `(−d², x, y)` as the tuple also gives a deterministic integer tiebreak on coordinates — no non‑comparable payloads, no `TypeError` on ties.
- `heapreplace` = pop‑then‑push in one sift, cheaper than `heappop` + `heappush`.
- The strict `<` means an incoming point *tied* with the current worst is skipped — correct, because the heap already holds k points at least as close.

**Trace on Example 1:** `points = [[1,3],[-2,2]]`, `k = 1`

| step | point | d² | action | heap (root first) |
|---|---|---|---|---|
| 1 | (1, 3) | 10 | size 0 < 1 → push | `[(-10, 1, 3)]` |
| 2 | (−2, 2) | 8 | 8 < worst 10 → replace | `[(-8, -2, 2)]` |

Return `[[-2, 2]]` ✓

**Trace on Example 2:** `points = [[3,3],[5,-1],[-2,4]]`, `k = 2`

| step | point | d² | action | heap (root first) |
|---|---|---|---|---|
| 1 | (3, 3) | 18 | size 0 < 2 → push | `[(-18, 3, 3)]` |
| 2 | (5, −1) | 26 | size 1 < 2 → push | `[(-26, 5, -1), (-18, 3, 3)]` — root −26 = farthest kept |
| 3 | (−2, 4) | 20 | 20 < worst 26 → replace | `[(-20, -2, 4), (-18, 3, 3)]` — (5, −1) evicted |

Return `[[−2,4], [3,3]]` ✓ (any order accepted).

**Complexity:** `O(n log k)` time (each point triggers at most one push/replace, each `O(log k)`), `O(k)` extra space, input untouched. Pragmatic one‑liner with identical asymptotics: `heapq.nsmallest(k, points, key=lambda p: p[0]*p[0] + p[1]*p[1])`.

## 7. Optimal approach B — randomized quickselect (expected O(n))

**Idea:** partition the array (in place) around a pivot's squared distance so that everything left of the pivot's final slot is closer and everything right is farther. The pivot lands at its final sorted index `p`. Then:

- `p == k` → indices `0..k−1` already hold the k closest → done.
- `p < k` → recurse/right‑shrink into `[p+1, hi]`.
- `p > k` → shrink into `[lo, p−1]`.

**⚠️ Indices vs values, precisely:** `p` is a **0‑based index**; `k` is a **count** used as a boundary (`points[:k]` = indices `0..k−1`). `p == k` means the pivot is the (k+1)‑th closest (1‑indexed), i.e., exactly `k` points ≤ it sit to its left. Confusing "index k" with "k‑th element" is the classic off‑by‑one here.

```python
import random

def kClosest(points, k):
    def sq(p):
        return p[0] * p[0] + p[1] * p[1]

    def partition(lo, hi):
        r = random.randint(lo, hi)              # random pivot: guards sorted/adversarial input
        points[r], points[hi] = points[hi], points[r]
        pivot = sq(points[hi])                  # pivot VALUE (an integer key)
        store = lo                              # invariant: indices < store hold keys < pivot
        for i in range(lo, hi):
            if sq(points[i]) < pivot:
                points[store], points[i] = points[i], points[store]
                store += 1
        points[store], points[hi] = points[hi], points[store]  # pivot → final index
        return store

    lo, hi = 0, len(points) - 1
    while lo < hi:                              # `lo < hi` (not `while True`) survives k == n
        p = partition(lo, hi)                   # p is an INDEX, k is a COUNT
        if p == k:
            break                               # first k slots = the k closest
        elif p < k:
            lo = p + 1
        else:
            hi = p - 1
    return points[:k]                           # slice = fresh list; order arbitrary
```

Notes on correctness choices:

- `while lo < hi` matters: when `k == n`, `p` can never equal `n`, and a naive `while True` loop would eventually call `partition(n, n−1)` and crash. With `lo < hi`, the loop exits naturally and `points[:n]` is trivially correct.
- **Duplicates/equal keys:** Lomuto's strict `<` sends equal keys to the right of the pivot; the invariant ("left of `p` ≤ pivot ≤ right of `p`") still holds, so the *set* in `points[:k]` is correct. Worst‑case performance degrades on masses of equal keys (see §10).
- This mutates `points` — ask permission, or work on `points[:]` / `list(points)`.

**Trace on Example 2:** `[[3,3]:18, [5,-1]:26, [-2,4]:20]`, `k = 2`
Round 1: `lo=0, hi=2`, pivot = `[−2,4]`, key 20, `store=0`. i=0: 18 < 20 → swap(0,0), store=1. i=1: 26 < 20? no. Swap(store=1, hi=2) → `[[3,3]:18, [-2,4]:20, [5,-1]:26]`, `p=1`. Since `1 < k=2` → `lo=2`. Loop ends (`lo == hi`). Return `points[:2] = [[3,3], [-2,4]]` ✓

**Trace on Example 1:** `[[1,3]:10, [-2,2]:8]`, `k = 1`
Round 1: pivot = `[−2,2]`, key 8. i=0: 10 < 8? no. Swap(0,1) → `[[-2,2]:8, [1,3]:10]`, `p=0`. `0 < k=1` → `lo=1`. Loop ends. Return `[[-2,2]]` ✓

**Extended trace — all three branches.** Merge both examples: `keys = [18, 26, 20, 8, 10]` (points `(3,3), (5,-1), (-2,4), (-2,2), (1,3)`), `k = 2`, pivot = last element of each range:

| Round | Range [lo, hi] | Pivot (key) | Effect | p | Branch taken |
|---|---|---|---|---|---|
| 1 | [0, 4] | (1,3), key 10 | 8 moves left; pivot lands at index 1 → `[8, 10, 20, 18, 26]` | 1 | `p < k` → lo = 2 |
| 2 | [2, 4] | (5,−1), key 26 | nothing < 26; pivot stays at index 4 | 4 | `p > k` → hi = 3 |
| 3 | [2, 3] | (3,3), key 18 | 20 ≥ 18; swap → `[8, 10, 18, 20, 26]` | 2 | `p == k` → **break** |

Return first 2: `[(-2,2), (1,3)]` — the two smallest keys (8, 10) ✓. (Here the array came out fully sorted by luck; quickselect only guarantees the prefix, never full order.)

**Complexity, with justification:**
- Expected `O(n)`: with a uniformly random pivot, the expected surviving subrange shrinks by a constant factor each round, so expected total work is a convergent geometric series in n (bounded by ≈ 4n).
- Worst case `O(n²)`: a fixed pivot rule (e.g., always last element) on already‑sorted input peels off one element per pass, costing `(n−1) + (n−2) + … = Θ(n²)` — this is exactly why the code randomizes.
- Space: `O(1)` extra (iterative, in‑place), plus `O(k)` for the returned slice. You cannot do better than `O(n)` overall in any comparison‑based solution, because every point must be examined — a point never inspected could be arbitrarily close and change the answer.

## 8. Complexity summary

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Repeated min‑scan (`k` passes) | `O(n·k)` | `O(1)` | Up to 10⁸ steps here — dismiss out loud |
| Sort all, slice first k | `O(n log n)` | `O(n)` aux (Timsort) | Simplest correct baseline; passes at n = 10⁴ |
| Heapify all n + pop k | `O(n + k log n)` | `O(n)` | Good when `k ≪ n` and copying is acceptable |
| **Bounded max‑heap (size k)** | **`O(n log k)`** | **`O(k)`** | Streaming‑friendly; input untouched |
| `heapq.nsmallest(k, …)` | `O(n log k)` | `O(k)` | One‑liner version of the above |
| **Randomized quickselect** | **expected `O(n)`, worst `O(n²)`** | **`O(1)` in‑place** | Fastest on average; mutates input; needs any‑order output |

Both bolded rows are "the" optimal answers; lead with the heap (safer, streaming‑capable), then offer quickselect as the average‑time optimization.

## 9. Test plan — propose these before/while coding

| # | Input | Expected | What it probes |
|---|---|---|---|
| 1 | `[[1,3],[-2,2]]`, k=1 (official) | `[[-2,2]]` | Basic ranking, negative coords |
| 2 | `[[3,3],[5,-1],[-2,4]]`, k=2 (official) | `[[3,3],[-2,4]]` in any order | Multi‑selection, order‑freedom |
| 3 | `[[0,0],[2,2],[-3,1]]`, k=3 | all three points, any order | **k == n** — heap never over‑evicts; quickselect's `lo < hi` guard |
| 4 | `[[1,2],[2,1],[-1,-2]]`, k=1 | any one point (all d² = 5) | **All‑tied distances / duplicate keys** — strict `<` and heap tie‑breaks must not crash |
| 5 | `[[7,-7]]`, k=1 | `[[7,-7]]` | Single element, immediate exit paths |
| 6 | `[[10000,10000],[-10000,-10000]]`, k=1 | either point | **Boundary magnitudes**: d² = 2×10⁸ — overflow probe in fixed‑width languages |
| 7 | `[[0,0],[1,0]]`, k=1 | `[[0,0]]` | Origin point, minimum possible key 0 |

Say out loud before coding: *"I'll cover k == n, ties between equal distances, a single‑point input, and max‑magnitude coordinates — squared distance there is 2×10⁸, which still fits a 32‑bit int."* That last sentence signals overflow awareness, which interviewers reward.

## 10. Common mistakes and off‑by‑ones

| Mistake | Why it bites | Fix |
|---|---|---|
| Computing `sqrt` to compare | Wasted work; drags in floats (and, with much larger bounds, could round two near‑equal roots together) | Compare `x² + y²`; `√` is strictly increasing so the ranking is identical |
| Wrong heap direction | A **min**‑heap of size k evicts your *closest* points and keeps the farthest | Max‑heap of size k; in Python, negate the key (heapq is min‑only) |
| Push all n, then pop k | Correct but `O(n log n)` — no better than sorting | Bound the heap at k with `heapreplace` → `O(n log k)` |
| Non‑comparable heap payloads | On equal keys, heapq compares the next tuple item; a custom object there raises `TypeError` | Store primitives `(-d2, x, y)` or add an index tiebreaker `(-d2, i, point)` |
| `p` vs `k` confusion | Treating `k` as "the k‑th element's index" (1‑indexed) vs the 0‑based boundary | `p == k` ⇔ first `k` slots (indices `0..k−1`) are final |
| Naive `while True` quickselect | With `k == n`, `p == k` never fires → `partition(n, n−1)` → `ValueError` on `randint` | Loop on `while lo < hi` (or guard `lo <= hi` and clamp) |
| Assuming input survives | Quickselect scrambles `points` | Ask the interviewer; or work on a copy (`O(n)`) |
| All‑equal keys + Lomuto | Strict `<` moves nothing; each pass removes one element → `O(n²)` | Three‑way (Dutch‑flag) partition, or just use the heap approach when ties are likely |
| Java comparator subtraction | `a - b` overflows for large or mixed‑sign keys in general | Use `Integer.compare` / `Long.compare` (values here happen to be safe, but the habit isn't) |

## 11. Language gotchas beyond Python (short)

- **Java:** `PriorityQueue<int[]>` needs an explicit comparator — for a max‑heap by squared distance: `(a, b) -> Integer.compare(sq(b), sq(a))`. Storing `PriorityQueue<Long>` autoboxes every key; prefer primitive arrays or compute keys as `long` if you ever widen the bounds. With the given constraints `int` suffices (`2×10⁸ < 2³¹−1`), but if coordinates could reach 10⁹, `x² + y² ≤ 2×10⁸` becomes `2×10¹⁸`, which overflows `int` and *does* fit `long`/`long long`.
- **C++:** `std::priority_queue<std::pair<int, vector<int>>>` is a **max**‑heap by default — the opposite polarity of Python's `heapq`, which flips which end you evict from. The STL one‑liner analog of quickselect is `nth_element(v.begin(), v.begin() + k - 1, v.end(), cmp)` with a strict‑weak‑ordering comparator on squared distance; afterwards the k closest occupy `[v.begin(), v.begin() + k)`. Never pass a comparator using `<=` — it violates strict weak ordering and is undefined behavior.

## 12. Transferable patterns and related problems

**Patterns you just used (name them in the interview):**

1. **Top‑K selection pattern** — output order is free ⇒ don't sort; keep a bounded max‑heap of the current best k (`O(n log k)`, streaming‑capable) or partition with quickselect (expected `O(n)`).
2. **Monotone key transform** — compare `f(a)` vs `f(b)` when `f` is strictly increasing (distance → squared distance; products → sums of logs to dodge overflow). Same trick recurs in "square‑root‑free" geometry comparisons.
3. **"Worst of the best" eviction** — the heap root is deliberately the *worst* kept element so replacement decisions are `O(log k)`.

**Related problems to drill the same muscles:**

| Problem | Overlap |
|---|---|
| LC 215 — Kth Largest Element in an Array | Pure quickselect / bounded heap |
| LC 347 — Top K Frequent Elements | Top‑K with a computed key (frequency) |
| LC 692 — Top K Frequent Words | Heap with a *tie‑broken* comparator (lexicographic) |
| LC 703 — Kth Largest Element in a Stream | The bounded heap as an online structure |
| LC 658 — Find K Closest Elements | "K closest" but on a **sorted** array — two pointers/binary search instead |
| LC 378 — Kth Smallest Element in a Sorted Matrix | Selection when the data has structure |

**Likely interviewer follow‑ups:** points arriving as a stream → bounded max‑heap (quickselect needs everything in memory); output must be sorted by distance → sort just the k survivors, `O(k log k)` extra; `k ≈ n` → quickselect stays expected `O(n)` while the heap drifts toward `O(n log n)`; input is read‑only → copy, or use the heap.

## 13. Full interview script (the talk track to internalize)

> **Restate:** "We're given n points and need the k nearest to the origin; order doesn't matter, and the k‑set is unique. I checked: k is between 1 and n. Two quick confirms — may I mutate the input, and is a stream possible, or one batch?"
>
> **Baseline:** "Brute force: compute each squared distance and sort — O(n log n). Even simpler repeated‑min scanning is O(n·k), up to 10⁸ here, so I'll skip that."
>
> **Insight:** "Square root is monotonic, so I'll rank by x²+y² and stay in integers. And since output order is free, I need *selection*, not sorting."
>
> **Plan:** "Two options: a size‑k max‑heap at O(n log k) — safe, stream‑friendly — or randomized quickselect at expected O(n), in‑place but mutating. I'll code the heap first."
>
> **While coding:** "Python's heapq is a min‑heap, so I store negated keys `(-d2, x, y)` — the root is always the *farthest* of my current k. Not full? Push. Otherwise replace the root only if the new point strictly beats it; a tie is skipped, which is correct because I already hold k points at least as close."
>
> **Dry run Example 2 aloud:** "(3,3)→18 in; (5,−1)→26 in, root 26; (−2,4)→20 beats 26, evict (5,−1). Answer [3,3] and [−2,4] in any order."
>
> **Complexity & edges:** "O(n log k) time, O(k) space, input untouched. Edge cases: k == n just fills the heap; all‑equal distances can't crash it; max squared distance is 2×10⁸, safe in int. If you want the theoretical best average, I'd switch to randomized quickselect — expected O(n) in‑place — assuming mutating the input is fine."

## 14. Say it in 60 seconds

> "We need the k points closest to the origin, in any order. First observation: square root is monotonic, so I rank points by *squared* distance, x² plus y² — no floats, exact integer comparisons. Second: because order is free, this is a selection problem, not sorting. My primary solution is a max‑heap of size k keyed by squared distance — the root is always the worst point I'm keeping — so each new point either pushes in or evicts the root if it's closer. That's n log k time, O(k) space, input untouched, and it even works on a stream. If I want the fastest average and can mutate the array, randomized quickselect partitions so the k closest end up in the first k slots — expected O(n), worst O(n²) without random pivots. Edge cases I'd call out: k equals n returns everything; equal distances are fine since ties never sit at the boundary; and squared distances max out at 2×10⁸, which still fits a 32‑bit int. For n up to ten thousand, either approach passes comfortably."
