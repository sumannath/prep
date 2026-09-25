# Sliding Window Maximum — Complete Interview Lesson

**LeetCode 239 · Hard · Arrays / Monotonic Deque / Sliding Window**

---

## 1. Problem in Plain Words

Restate it before solving — interviewers grade this:

> You have an array `nums` and a fixed-size window of length `k`. The window starts at the left edge and slides one position at a time until it hits the right edge. For every position of the window, report the maximum element currently inside it. Return those maxima in order.

Precise indexing (this matters later):

- At step `i` (0-based), the window covers indices `[i - k + 1, i]` (clamped at the start).
- The first full window exists at `i = k - 1`.
- Number of windows = `n - k + 1`, so the output always has length `n - k + 1`.

For Example 1 (`n = 8, k = 3`): `8 - 3 + 1 = 6` outputs. ✓

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `n ≤ 10^5` | O(n²) is ~10^10 operations — will TLE. Target O(n log n) or O(n). |
| `1 ≤ k ≤ n` | No empty-window case; but `k = 1` and `k = n` are both possible and worth testing. `k = 1` → answer is `nums` itself; `k = n` → answer is a single element, `max(nums)`. |
| `-10^4 ≤ nums[i] ≤ 10^4` | Values fit in a 32-bit int → **no overflow concerns** anywhere. But negatives exist → never initialize a running max to `0`. |
| Values may repeat | Duplicates are legal; your algorithm must not depend on uniqueness. |
| Output size `n - k + 1` | A free sanity check: `len(result) == len(nums) - k + 1`. |

---

## 3. Warm-Up: Brute Force (and Its Trap)

### 3.1 The naive solution

For each of the `n - k + 1` window positions, scan all `k` elements:

```python
from typing import List

def maxSlidingWindow_bruteforce(nums: List[int], k: int) -> List[int]:
    n = len(nums)
    return [max(nums[i:i + k]) for i in range(n - k + 1)]
```

(Note: slicing copies each window, using O(k) transient memory; a hand-rolled loop avoids the copy but the time is identical.)

### 3.2 Worked trace on Example 1 — `nums = [1,3,-1,-3,5,3,6,7], k = 3`

| Window start `i` | Window contents | Max |
|---|---|---|
| 0 | `[1, 3, -1]` | 3 |
| 1 | `[3, -1, -3]` | 3 |
| 2 | `[-1, -3, 5]` | 5 |
| 3 | `[-3, 5, 3]` | 5 |
| 4 | `[5, 3, 6]` | 6 |
| 5 | `[3, 6, 7]` | 7 |

Output: `[3, 3, 5, 5, 6, 7]` ✓

### 3.3 Complexity and the "almost optimization" trap

- Time: **O(n · k)** — with `n = k = 10^5`, that's up to 10^10 element comparisons; at a typical ~10^9 simple ops/sec this takes tens of seconds, far beyond a 1–2 s limit.
- **The trap to name out loud:** "Cache the current max; only recompute when it slides out of the window." Sounds like O(n) amortized — but on a **strictly decreasing** array like `[5,4,3,2,1]`, the max is always at the left edge and expires every single step, forcing a full O(k) rescan each time. Worst case stays **O(n · k)**. Saying this unprompted signals maturity.

---

## 4. The Core Insight

Two observations, each worth stating explicitly:

**Observation 1 — Consecutive windows share `k − 1` elements.** Sliding from window `i` to `i + 1` adds only `nums[i+1]` and drops only `nums[i−k+1]`. A single cached "current max" fails because the max can be the element that drops out — then you're stuck rescanning.

**Observation 2 — Many elements can never matter.** Consider element `nums[j]`. If some **later** element `nums[i]` (with `i > j`) satisfies `nums[i] >= nums[j]`, then `nums[j]` is useless forever:

- While both are in the window, `nums[i] >= nums[j]`, so the max is at least as large via `nums[i]`.
- `nums[j]` exits the window **before** `nums[i]` does (smaller index exits first).

So `nums[j]` is dominated: it can never be needed, even for ties — with equal values we simply keep the later copy. Call such an element **dominated**. The only elements that can ever be a window max are those not dominated by anything to their right within the window — i.e., the **suffix maxima** of the current window (the running maximum scanning right-to-left).

**Observation 3 — Store indices, not values.** To know when the front of our candidate list expires, we need positions. So the data structure holds **indices**; values are read via `nums[index]`.

---

## 5. Optimal Solution: Monotonic Decreasing Deque

### 5.1 The structure and its four rules

Maintain a deque of indices whose **values are strictly decreasing** from front to back:

```
nums[dq[0]] > nums[dq[1]] > ... > nums[dq[-1]]
```

**Invariant:** after processing index `i`, the deque contains exactly the suffix maxima of window `[i-k+1, i]`, in increasing index order. Therefore `dq[0]` is the index of the window max.

Per new index `i`:

1. **Expire (front):** while the front index is outside the window (`dq[0] <= i - k`), pop it. Window at step `i` is `[i-k+1, i]`, so index `i-k` is already out — hence the `<=`.
2. **Dominate (back):** while the back's value is `<= nums[i]`, pop it. Each popped element is dominated by the newer, larger-or-equal element.
3. **Admit:** push `i` to the back.
4. **Record:** once `i >= k - 1` (first full window formed), append `nums[dq[0]]` to the answer.

Micro-detail: because you run the expiry check on *every* iteration, at most one index can be expired at any step, so an `if` works — but a `while` costs nothing and is robust to refactoring. Use `while`.

### 5.2 Full trace on Example 1 — `nums = [1,3,-1,-3,5,3,6,7], k = 3`

Deque shown as `(index : value)`. Expiry threshold at step `i` is `i - k`.

| `i` | `x` | Front expiry (`dq[0] <= i-3`)? | Back pops (`nums[dq[-1]] <= x`?) | Deque after | Record |
|---|---|---|---|---|---|
| 0 | 1 | — (empty) | — (empty) | `(0:1)` | — |
| 1 | 3 | 0 ≤ −2? no | pop `(0:1)` since 1 ≤ 3 | `(1:3)` | — |
| 2 | −1 | 1 ≤ −1? no | 3 ≤ −1? no | `(1:3) (2:-1)` | `nums[1] = 3` |
| 3 | −3 | 1 ≤ 0? no | −1 ≤ −3? no | `(1:3) (2:-1) (3:-3)` | `nums[1] = 3` |
| 4 | 5 | **1 ≤ 1? yes → pop front** | pop `(3:-3)`, pop `(2:-1)` (both ≤ 5) | `(4:5)` | `nums[4] = 5` |
| 5 | 3 | 4 ≤ 2? no | 5 ≤ 3? no | `(4:5) (5:3)` | `nums[4] = 5` |
| 6 | 6 | 4 ≤ 3? no | pop `(5:3)`, pop `(4:5)` | `(6:6)` | `nums[6] = 6` |
| 7 | 7 | 6 ≤ 4? no | pop `(6:6)` | `(7:7)` | `nums[7] = 7` |

Result: `[3, 3, 5, 5, 6, 7]` ✓ — matches the expected output exactly.

Note at `i = 4`: the front index `1` expired *exactly* at threshold `i - k = 1` — this is precisely the off-by-one the `<=` handles.

### 5.3 Trace on Example 2 — `nums = [1], k = 1`

| `i` | `x` | Expiry | Back pops | Deque | Record |
|---|---|---|---|---|---|
| 0 | 1 | 0 ≤ −1? no | — | `(0:1)` | `nums[0] = 1` |

Result: `[1]` ✓. Note with `k = 1` the window is `[i, i]`, so every element is its own max and the deque never holds more than one index.

### 5.4 Python implementation

```python
from collections import deque
from typing import List

def maxSlidingWindow(nums: List[int], k: int) -> List[int]:
    dq = deque()   # stores INDICES; nums[dq[0]] > nums[dq[1]] > ... (strictly decreasing)
    out = []

    for i, x in enumerate(nums):
        # 1) Expire: window at step i is [i-k+1, i]; index i-k has slid out.
        while dq and dq[0] <= i - k:
            dq.popleft()

        # 2) Dominate: anything <= x at the back can never be a future max.
        #    (<= also keeps the deque small on all-equal arrays.)
        while dq and nums[dq[-1]] <= x:
            dq.pop()

        # 3) Admit current index.
        dq.append(i)

        # 4) Record once the first full window exists.
        if i >= k - 1:
            out.append(nums[dq[0]])

    return out
```

**Critical Python gotcha:** this *must* be `collections.deque`. A plain `list.pop(0)` shifts every remaining element (O(size) per call), silently degrading the whole algorithm toward O(n·k). If you refuse the import, keep a list and a `head` pointer that you advance instead of physically popping from the front.

### 5.5 Why this is O(n) — the amortized argument

The nested `while` loops look quadratic but aren't: every index is **pushed exactly once** and can be **popped at most once** (either from the front on expiry or from the back on domination — and once popped, an index never re-enters, since indices only move forward). Total deque operations ≤ `2n` → **O(n) time, O(k) space** (the deque never holds more than `k` indices). This is genuinely linear in total operations, i.e., amortized O(1) per element.

**Optimality:** any correct algorithm must examine every element (an unread element could be a window's max and change the answer), and the output itself has up to `n` entries — so Ω(n) time is unavoidable, and this solution meets it.

### 5.6 Duplicates, precisely

The back-pop uses `<=` (not `<`):

- **Correctness:** if `nums[j] == nums[i]` with `j < i`, keeping `j` is never necessary — whenever both are visible they give the same max value, and `j` leaves first. Popping the equal older element is safe.
- **Efficiency:** on an all-equal array like `[2,2,2,2]`, `<=` keeps the deque at size 1; `<` would let it grow to `k` (still correct, just wasteful).
- Using `<` instead would **not** break correctness — the deque would merely be non-increasing rather than strictly decreasing. But `<=` is the conventional, tighter choice.

---

## 6. Acceptable Alternative: Max-Heap with Lazy Deletion

If the deque doesn't come to you under pressure, a heap is a clean, interview-acceptable O(n log k):

```python
import heapq
from typing import List

def maxSlidingWindow_heap(nums: List[int], k: int) -> List[int]:
    heap = [(-nums[i], i) for i in range(k)]   # negate for max-heap; carry the index
    heapq.heapify(heap)
    out = [-heap[0][0]]                        # max of the first window

    for i in range(k, len(nums)):
        heapq.heappush(heap, (-nums[i], i))
        while heap[0][1] <= i - k:             # lazily delete expired entries
            heapq.heappop(heap)
        out.append(-heap[0][0])
    return out
```

Why lazy deletion works: we only remove stale entries when they surface at the top, but since we purge after every push, every remaining index is `> i - k`, so the heap holds at most `k` entries — each of the `n` pushes/pops costs O(log k), giving **O(n log k) time, O(k) space**. Ties in value fall through to comparing indices in the tuple, which is harmless (any copy of the max value is a valid answer). Stale-but-not-top entries linger harmlessly because they're strictly smaller than the live max above them.

---

## 7. Complexity Table

| Approach | Time | Extra space | Verdict |
|---|---|---|---|
| Brute force (`max` per window) | O(n · k) | O(1) (O(k) if slicing) | TLE at n = 10^5 |
| Cached max, rescan on expiry | O(n · k) worst (decreasing input) | O(1) | Heuristic — not safe |
| Max-heap + lazy deletion | O(n log k) | O(k) | Clean fallback |
| **Monotonic deque** | **O(n)** | **O(k)** | **Optimal — submit this** |
| Sparse table (static RMQ) | O(n log n) build, O(1)/query | O(n log n) | Overkill; useful only if you later need arbitrary range-max queries |

---

## 8. Common Mistakes

| # | Mistake | Why it's wrong | Fix |
|---|---|---|---|
| 1 | Storing **values** in the deque | You can't detect when the max slides out of the window | Store **indices**; compare via `nums[idx]` |
| 2 | Expiry test `dq[0] < i - k` | Off-by-one: at step `i` the window is `[i-k+1, i]`, so index `i-k` is already gone; `<` keeps a stale index one step too long | Use `dq[0] <= i - k` (equivalently `i - dq[0] >= k`) |
| 3 | Recording from `i = 0`, or starting at `i = k` | Output would have wrong length/values | Record only when `i >= k - 1`; expect `n - k + 1` results |
| 4 | Comparing **the index** instead of the value in the back-pop (`dq[-1] <= x`) | You'd be comparing positions with values — garbage behavior, silent bug | `nums[dq[-1]] <= x` |
| 5 | `list.pop(0)` in Python | Each front-pop shifts the whole list → degrades to ~O(n·k) | `collections.deque` + `popleft()` |
| 6 | The "recompute only when max expires" trick | Degrades to O(n·k) on strictly decreasing arrays | Monotonic deque |
| 7 | Initializing a hand-rolled max to `0` | Arrays can be all-negative | Initialize to `nums[start]` or `-inf` |
| 8 | Assuming output length is `n` or `k` | It's neither | `n - k + 1` — assert it in tests |

---

## 9. Language-Specific Gotchas (beyond Python)

| Language | Gotcha |
|---|---|
| **Java** | `ArrayDeque<Integer>` has **no indexed access** (`get(i)` doesn't exist) — but you only need `peekFirst()/peekLast()/pollFirst()/pollLast()`, all O(1). Autoboxing of `int` indices into `Integer` is fine at n = 10^5 but real overhead; a circular `int[]` buffer avoids it. And never compare boxed `Integer`s with `==` (identity, not equality for values outside the small-integer cache) — compare the unboxed `int`s: `nums[dq.peekLast()] <= x`. |
| **C++** | Classic bug: `dq.back() <= x` compares the **index** to the value — must be `nums[dq.back()] <= x`. Guard order matters: `while (!dq.empty() && nums[dq.back()] <= x)` — the short-circuit prevents out-of-bounds access on `dq.back()`. `std::deque<int>` is fine; a `std::vector<int>` + head offset is more cache-friendly if you want to micro-optimize. No overflow risk here (`|nums[i]| ≤ 10^4`, `n ≤ 10^5` all fit comfortably in `int`). |
| **Java/C++ both** | With `k` possibly equal to `n`, make sure your expiry arithmetic (`i - k`, which can be as low as `1 - n`) is computed in signed ints — it is by default, but don't "optimize" it into `size_t`/unsigned in C++. |

---

## 10. Test Cases to Propose Out Loud

State these before or right after coding — it takes 30 seconds and covers every branch of the algorithm:

| Input | `k` | Expected | What it exercises |
|---|---|---|---|
| `[1,3,-1,-3,5,3,6,7]` | 3 | `[3,3,5,5,6,7]` | Official example; mixed values, front expiry at exact boundary (i=4) |
| `[1]` | 1 | `[1]` | Official example; smallest input, `k = 1` |
| `[5,4,3,2,1]` | 3 | `[5,4,3]` | Front expires **every** step; kills the "cached max" heuristic |
| `[1,2,3,4,5]` | 2 | `[2,3,4,5]` | Back pops **every** step; deque stays size 1 |
| `[2,2,2,2]` | 2 | `[2,2,2]` | Duplicates; `<=` back-pop keeps deque tiny |
| `[-5,-1,-3]` | 2 | `[-1,-1]` | All negatives; catches `max = 0` initialization bugs |
| `[4,1,7]` | 3 | `[7]` | `k = n`: exactly one output |
| `[3,1,3]` | 2 | `[3,3]` | Max re-enters after dropping; equal-value eviction |

Also verify structurally: `len(output) == n - k + 1` for every case.

---

## 11. Transferable Patterns & Related Problems

**The reusable template** — memorize the skeleton:

```
for i in 0..n-1:
    while front is out of window:      popleft()      # expiry
    while back is dominated by i:      pop();         # monotonicity
    push i                                            # admit
    if window is full:                 record(front)  # answer = front
```

**Pattern recognition triggers:**
- *"Fixed (or growing) window + repeatedly need the min/max"* → monotonic deque of **indices**.
- *"Need both min and max of the window"* → two deques (see LC 1438).
- *"Elements never relevant once something better arrives on one side"* → the domination argument, same as monotonic stacks.

**Related problems (practice ladder):**

| Problem | Connection |
|---|---|
| LC 739 — Daily Temperatures | Monotonic stack; identical "dominated element gets discarded" logic |
| LC 84 — Largest Rectangle in Histogram | Monotonic stack with indices; expiry = "bar popped" |
| LC 42 — Trapping Rain Water | Monotonic stack / two pointers on window-like structure |
| LC 1438 — Longest Subarray with Abs Diff ≤ Limit | **Two** monotonic deques (one max, one min) over a variable window |
| LC 862 — Shortest Subarray with Sum ≥ K | Monotonic deque over **prefix sums**; negative numbers break the naive sliding window |
| LC 1696 — Jump Game VI | DP where the transition needs a sliding-window max → exactly this deque |
| LC 907 — Sum of Subarray Minimums | Monotonic stack "contribution" technique (each element's span of relevance) |
| LC 480 — Sliding Window Median | Same window, different query — needs heaps, shows when deque *doesn't* apply |

**Follow-ups interviewers actually ask:** stream the input (the deque solution is already online — one pass, constant per element aside from pops); swap max for min (flip the comparison); generalize to 2D (run the 1D deque row-wise, then column-wise on the results); support arbitrary range-max queries afterward (that's when you reach for a sparse table — O(n log n) preprocessing for O(1) queries, which is why it exists, since per-window deque queries don't randomize).

---

## 12. Full Interview Talk Track

> **Clarify:** "So the window is a fixed size `k`, it slides one index at a time, and I return the max of each placement — so the output length is `n − k + 1`. Indices are 0-based; at step `i` the window is `i−k+1` through `i`."
>
> **Brute force:** "Naively, for each of the `n−k+1` windows I scan `k` elements — O(n·k), up to 10^10 operations at these constraints, too slow. I could cache the running max and only rescan when it slides out, but on a strictly decreasing array the max expires every step, so that's still O(n·k) worst case."
>
> **Insight:** "The real observation: if a later element is greater than or equal to an earlier one, the earlier element can never matter — it leaves the window first, and while they're both inside, the later one is at least as big. So per window, the only possible maxima are the suffix maxima — the running max scanning right-to-left."
>
> **Algorithm:** "I keep a deque of indices whose values are strictly decreasing front-to-back. Front is always the current window max. For each new element: pop the front if its index slid out of the window — that's why I store indices, not values; pop everything smaller-or-equal off the back, since I just proved those are dominated; push the new index; and once the first full window forms — at `i = k−1` — record `nums[front]`."
>
> **Complexity:** "Each index is pushed once and popped at most once, so total deque ops are at most 2n — O(n) time, O(k) space. That's optimal, since any solution must read all n elements."
>
> **Edge cases:** "`k = 1` gives back the array itself; `k = n` gives a single max; duplicates are handled by popping with `<=`; I'd test a decreasing array, an increasing array, and an all-equal array."
>
> Then code it.

---

## 13. Say It in 60 Seconds

> "Brute force recomputes the max for every window — O(n·k), up to 10^10 ops, too slow. Caching one running max fails because the max can slide out. The key idea: an element is useless the moment a later element is greater than or equal to it — the later one outlives it and dominates it. So I keep a deque of indices whose values are strictly decreasing. The front is always the current window max. For each new element, I pop off the front if its index slid out of the window — that's why I store indices, not values — and I pop off the back everything smaller or equal, since those can never matter again. Then I push the new index, and once the first full window forms, I record the front's value. Every index enters once and leaves at most once, so it's O(n) time and O(k) space — which is optimal, since you have to read the whole input anyway."
