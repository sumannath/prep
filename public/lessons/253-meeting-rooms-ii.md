# Meeting Rooms II — Complete Interview Lesson (LeetCode 253)

## 1. Problem, Restated

You're given `n` meetings, where `intervals[i] = [start_i, end_i]`. Multiple meetings may need to happen at the same time, and each running meeting occupies one conference room for its entire duration. **Return the minimum number of rooms needed so no meeting ever waits.**

Reframe it once, up front, because the whole problem hinges on it:

> **Minimum rooms required = maximum number of meetings running at the same instant.**

That equivalence is the entire problem. Everything below is about computing "max simultaneous meetings" efficiently.

---

## 2. Clarify First — Three Questions to Ask Out Loud

Before writing any code, say these three things. They cost 15 seconds and prevent the most common wrong answer:

1. **"Is a meeting that ends at time `t` free for a meeting starting at time `t`?"** — i.e., are intervals half-open `[start, end)`? The standard convention (and the one consistent with LeetCode's expected outputs) is **yes**: `[[1,5],[5,10]]` needs **1** room. Confirm with the interviewer anyway.
2. **"Is the input sorted, and can intervals be duplicated?"** — Assume **unsorted** (Example 2 isn't sorted) and **duplicates allowed** (two identical meetings genuinely need 2 rooms).
3. **"Do you want just the count, or the actual room assignments?"** — The base problem wants the count; assignments are a classic follow-up (covered in §13).

Also note: constraints guarantee `start < end` strictly, so there are no zero-length meetings to special-case. The answer is always between `1` and `n`.

---

## 3. Constraint Decoding

| Constraint | What it actually tells you |
|---|---|
| `1 <= intervals.length <= 10^4` | `n² = 10^8` for brute force — seconds of runtime in Python (TLE), borderline even in C++/Java. Target **O(n log n)**. |
| `0 <= start_i < end_i <= 10^6` | Times fit easily in 32-bit ints (no overflow worry). The **bounded time range** also unlocks an `O(n + T)` counting/difference-array alternative where `T = 10^6` (§8). |
| `start_i < end_i` (strict) | No degenerate/empty intervals; back-to-back meetings are sequential, not simultaneous. |
| (unstated) input order, duplicates | **Not sorted** — always sort. Duplicates possible — never dedupe. |

---

## 4. Brute Force — Probe Every Start Time

**Idea:** The number of meetings running at time `t` is `count(t) = #{ i : start_i <= t < end_i }`. This function only *changes* at endpoints and only *increases* when a meeting starts, so the global maximum is attained at some meeting's start time. Therefore it suffices to probe each of the `n` start times and count how many intervals cover it.

```python
def min_meeting_rooms_bruteforce(intervals):
    n = len(intervals)
    best = 0
    for i in range(n):
        t = intervals[i][0]          # probe this meeting's start time
        count = 0
        for s, e in intervals:       # half-open check: s <= t < e
            if s <= t < e:
                count += 1
        best = max(best, count)
    return best
```

**Worked trace** on `intervals = [[0,30],[5,10],[15,20]]`:

| Probe `t` | Meetings with `s <= t < e` | Count |
|---|---|---|
| `0` | `[0,30]` | 1 |
| `5` | `[0,30]`, `[5,10]` | **2** |
| `15` | `[0,30]`, `[15,20]` | 2 |

Max = **2** ✓.

**Cost:** `O(n²)` time, `O(1)` extra space. Correct and easy to state, but `10^8` checks at `n = 10^4` → too slow in Python. Use it as your spoken stepping stone, not your final answer.

---

## 5. The Core Insight

Two facts make the greedy optimal — be ready to recite both:

- **Lower bound:** If `k` meetings are all active at the same instant, they pairwise overlap (they all contain that instant), so they need `k` distinct rooms. *No algorithm can do better than max concurrency.*
- **Upper bound (greedy safety):** Process meetings in **start order**. When meeting `i` begins, if any room is free, reuse it; open a brand-new room **only** when every occupied room's meeting ends *strictly after* `start_i` — meaning `k+1` meetings are simultaneously active, which by the lower bound *forces* room `k+1`. So the greedy never opens a room it wasn't forced to open.

**Conclusion:** rooms allocated by the greedy = max concurrency = the optimum. To know "the earliest room that just freed up," keep a **min-heap of end times**.

---

## 6. Optimal Approach #1 — Sort by Start + Min-Heap of End Times (Primary)

### Algorithm
1. Sort intervals by start.
2. Maintain a min-heap holding **one end time per room created so far** (the end time of each room's most recent meeting).
3. For each meeting `(start, end)`:
   - If `heap[0] <= start` → the earliest-ending occupied room is free → **reuse** it: `heapreplace(heap, end)`.
   - Else → even the earliest-ending room is still busy at this instant → **new room**: push `end`.
4. Answer = `len(heap)`. It never shrinks, and it grows exactly when forced.

### Code (Python)

```python
import heapq

def min_meeting_rooms(intervals):
    if not intervals:
        return 0
    intervals.sort(key=lambda iv: iv[0])      # sort by start (values, not indices)
    heap = []                                  # end times; one entry per room created
    heapq.heappush(heap, intervals[0][1])
    for start, end in intervals[1:]:
        if heap[0] <= start:                   # earliest end already finished → room free
            heapq.heapreplace(heap, end)       # pop-then-push: this room now busy until `end`
        else:
            heapq.heappush(heap, end)          # every room still busy at `start` → open one
    return len(heap)                           # room count only ever grows
```

### Trace — Example 1: `[[0,30],[5,10],[15,20]]` (sorted already)

| Meeting | `heap[0]` | Decision | Heap after | Size (rooms) |
|---|---|---|---|---|
| `(0,30)` | — | init: new room | `[30]` | 1 |
| `(5,10)` | `30` | `30 > 5` → all busy → new room | `[10, 30]` | **2** |
| `(15,20)` | `10` | `10 ≤ 15` → free → reuse (`heapreplace`) | `[20, 30]` | 2 |

**Output: 2** ✓

### Trace — Example 2: `[[7,10],[2,4]]` → sorted: `[[2,4],[7,10]]`

| Meeting | `heap[0]` | Decision | Heap after | Size |
|---|---|---|---|---|
| `(2,4)` | — | init | `[4]` | 1 |
| `(7,10)` | `4` | `4 ≤ 7` → reuse | `[10]` | 1 |

**Output: 1** ✓

### Why the single `heapreplace` is enough
The heap holds each room's latest end time. If `heap[0] <= start`, at least one room is idle and one reuse suffices — we only need one room for this meeting. If `heap[0] > start`, *every* room's meeting is still running at instant `start`, so a new room is provably required. Heap size = rooms created = running max of concurrency. (Note the condition is `<=`, not `<` — that's the half-open convention in code.)

---

## 7. Optimal Approach #2 — Two Independently Sorted Arrays + Two Pointers

Same insight, no heap. Sort **all start times** and **all end times** into separate arrays, then sweep.

```python
def min_meeting_rooms_two_pointer(intervals):
    starts = sorted(iv[0] for iv in intervals)   # values only
    ends   = sorted(iv[1] for iv in intervals)   # sorted independently!
    rooms, j = 0, 0
    for i in range(len(starts)):
        if starts[i] >= ends[j]:                 # a meeting ended by this start → reuse
            j += 1
        else:                                    # earliest unfinished end is still > start
            rooms += 1
    return rooms
```

**Indices vs. values — be precise here:** `i` indexes `starts`, `j` indexes `ends`, and the arrays are sorted **independently**. `starts[i]` and `ends[j]` generally belong to **different meetings** — never try to pair `intervals[i]` with `intervals[j]`. You're comparing *values*, tracking *count*, not identities.

**Trace — Example 1:** `starts = [0,5,15]`, `ends = [10,20,30]`

| `i` | `starts[i]` | `ends[j]` | Comparison | Action | Rooms |
|---|---|---|---|---|---|
| 0 | 0 | 10 | `0 < 10` | new room | 1 |
| 1 | 5 | 10 | `5 < 10` | new room | 2 |
| 2 | 15 | 10 | `15 ≥ 10` | reuse: `j→1`; `15 < 20` | 2 |

**Output: 2** ✓

**Trace — Example 2:** `starts = [2,7]`, `ends = [4,10]`

| `i` | `starts[i]` | `ends[j]` | Comparison | Action | Rooms |
|---|---|---|---|---|---|
| 0 | 2 | 4 | `2 < 4` | new room | 1 |
| 1 | 7 | 4 | `7 ≥ 4` | reuse: `j→1`; `7 < 10` | 1 |

**Output: 1** ✓

**The subtle question interviewers ask:** *"If two meetings ended before `starts[i]`, why only one `j++`?"* — Because `rooms` is a **running maximum** of concurrency at start events, not the live count. Consuming one end per start keeps the accounting `rooms = (i+1) − j` correct: whenever live concurrency would exceed the current room count, the test `starts[i] < ends[j]` fires and `rooms++` captures a new maximum. Surplus free rooms simply stay idle — they don't need to be "consumed."

---

## 8. Alternative — Sweep Line / Difference Array (times are bounded here)

Encode each meeting as events: `+1` at `start`, `−1` at `end`. The running sum is live occupancy; its max is the answer.

```python
def min_meeting_rooms_sweep(intervals):
    events = []
    for s, e in intervals:
        events.append((s, +1))
        events.append((e, -1))
    events.sort()          # at equal t: (t,-1) sorts before (t,+1) → free room first ✓
    best = cur = 0
    for _, d in events:
        cur += d
        best = max(best, cur)
    return best
```

The tuple sort `(t, delta)` handles the tie-break **for free**: at equal timestamps, `−1 < +1`, so an ending meeting frees its room before a starting one claims it — exactly the half-open convention. (If the convention were closed intervals, you'd flip the tie-break.)

Since `end_i ≤ 10^6`, you can even skip sorting with a fixed-size difference array — and no tie-break logic is needed, because `−1` at `end` and `+1` at `start` landing in the same cell **net out correctly** (prefix sum at `t` equals exactly `#{s ≤ t < e}`):

```python
def min_meeting_rooms_counting(intervals):
    max_t = max(e for _, e in intervals)
    delta = [0] * (max_t + 1)
    for s, e in intervals:
        delta[s] += 1
        delta[e] -= 1              # decrement AT e, not e-1 (half-open)
    best = cur = 0
    for d in delta:
        cur += d
        best = max(best, cur)
    return best
```

---

## 9. Complexity Table

| Approach | Time | Extra Space | Notes |
|---|---|---|---|
| Brute force (probe each start) | `O(n²)` | `O(1)` | `10^8` ops at `n=10^4`; TLE in Python |
| **Sort + min-heap** | **`O(n log n)`** | `O(n)` | Canonical interview answer; generalizes to room assignments |
| Two-pointer starts/ends | `O(n log n)` | `O(n)` | Same asymptotics, smallest constants, no heap |
| Event sweep | `O(n log n)` | `O(n)` | Works for unbounded timestamps; easy argmax follow-up |
| Difference array | `O(n + T)`, `T = 10^6` | `O(T)` | Only because values are bounded by the constraints |

**Optimality note:** among comparison-based algorithms, `O(n log n)` is essentially tight — the answer depends only on the *relative order* of the `2n` endpoints, and distinguishing all possible interleavings provably requires `Ω(n log n)` comparisons (standard reduction from sorting / element uniqueness).

---

## 10. Common Mistakes

| # | Mistake | Fix / Consequence |
|---|---|---|
| 1 | Counting `end == start` as overlap | `[[1,5],[5,10]]` must be **1** room (half-open). State the assumption out loud. |
| 2 | Not sorting by start before the heap loop | The reuse proof depends on meetings arriving in start order; processing in given order breaks it silently. |
| 3 | Storing **starts** in the heap (or pushing unkeyed interval objects) | The reuse decision compares against **end** times. |
| 4 | Using `heappushpop` in the reuse branch | It pushes-then-pops and can evict your *new* end; use `heapreplace` (pop-then-push) after checking `heap[0] <= start`. |
| 5 | Strict `>` instead of `>=` (two-pointer), or `heap[0] < start` | Back-to-back meetings get separate rooms → overcount. Free condition is `end <= start`. |
| 6 | Deduplicating "identical" intervals as an optimization | `[[3,7],[3,7]]` genuinely needs **2** rooms. |
| 7 | Decrementing at `e − 1` in the difference array | Half-open semantics: decrement **at** `e`. |
| 8 | Pairing `intervals[i]` with `intervals[j]` in the two-pointer | The arrays are sorted independently; only compare values. |
| 9 | Returning a timestamp instead of a count | Answer is `len(heap)` or a counter — a quantity between 1 and `n`. |
| 10 | Python: `intervals.sort()` mutating the caller's list | Usually fine on LeetCode; use `sorted(...)` if input must stay intact. |

---

## 11. Language Gotchas (beyond Python)

| Language | Gotcha |
|---|---|
| **Java** | `PriorityQueue<Integer>` **is** a min-heap by default, but `peek()` on an empty queue returns `null` → NPE on unboxing; guard it. In comparators, prefer `Integer.compare(a, b)` over `a − b` — subtraction-overflow is a latent habit bug even though values ≤ 10⁶ are safe here. |
| **C++** | `std::priority_queue<int>` is a **max**-heap by default — forgetting `priority_queue<int, vector<int>, greater<int>>` compiles fine and silently returns wrong answers. `sort` on `vector<vector<int>>` orders lexicographically (by start, then end), which is fine here but be deliberate. |
| **Python** | `heapq` is min-heap only; push bare end-time ints so no tie-break `__lt__` is needed. `heapreplace` = pop-then-push; `heappushpop` = push-then-pop — they are **not** interchangeable in the reuse branch. |

---

## 12. Test Plan — Propose These Out Loud

Before or right after coding, say: *"Let me run your two examples, then a few edge cases I want to pin down."*

| Input | Expected | What it verifies |
|---|---|---|
| `[[0,30],[5,10],[15,20]]` | `2` | Official Example 1 |
| `[[7,10],[2,4]]` | `1` | Official Example 2 + unsorted input |
| `[[1,5]]` | `1` | Single meeting (lower bound of answer range) |
| `[[1,5],[5,10]]` | `1` | **Touching endpoints** — confirms half-open semantics |
| `[[3,7],[3,7]]` | `2` | **Exact duplicates** need separate rooms |
| `[[1,10],[2,3],[4,5]]` | `2` | Nested but mutually disjoint inner meetings |
| `[[1,10],[2,9],[3,8]]` | `3` | Fully stacked → answer can reach `n` |
| `[[1,2],[2,3],[3,4]]` | `1` | Back-to-back chain reuses one room throughout |

---

## 13. Transferable Patterns & Related Problems

**Patterns to name in the interview:**

| Pattern | Where it reappears |
|---|---|
| Sort by one endpoint + greedy | LC 435 Non-overlapping Intervals, 452 Min Arrows to Burst Balloons, 630 Course Schedule III |
| Min-heap of "busy-until" (resource reuse) | LC 1834 Single-Threaded CPU, 2402 Meeting Rooms III, 1094 Car Pooling (heap variant) |
| Event sweep with `+1/−1` + tie-break | LC 1094 Car Pooling, 1854 Maximum Population Year, 732 My Calendar III |
| "Min resources = max concurrency" (interval-graph clique number = its chromatic number, which is *why* greedy coloring works on intervals) | LC 731 / 732 My Calendar II / III |
| Two pointers over two independently sorted arrays | LC 986 Interval List Intersections, 1229 Meeting Scheduler |

**Related problems to queue up:** 252 Meeting Rooms (simpler sibling — just check adjacent pairs after sorting), 56/57 Merge/Insert Interval, 435, 1094, 729/731/732 My Calendar I–III (732 is literally this problem in online form), 2402 Meeting Rooms III (which room, busiest room).

**Likely follow-ups, pre-answered:**
- *Return actual room assignments:* store `(end_time, room_id)` in the heap; on reuse the id rides along; on a new room, `room_id = len(heap)` before pushing.
- *Return the busiest time window:* use the sweep; track the time at which the running sum hits its max.
- *Intervals already sorted by start:* skip the sort → `O(n)`.
- *Huge n, tiny time range:* difference array, `O(n + T)`.

---

## 14. Full Interview Talk Track (~2 minutes, spoken)

> **[Clarify]** "Three quick assumptions before I code: the input is unsorted, duplicates are possible, and a meeting ending at `t` frees the room for one starting at `t` — back-to-back shares a room. Constraints guarantee `start < end`."
>
> **[Reframe]** "So the minimum number of rooms equals the maximum number of meetings running at the same instant. That's necessary — simultaneous meetings need distinct rooms — and it's sufficient, because a greedy that reuses rooms only opens a new one when it's provably forced."
>
> **[Stepping stone]** "Brute force: probe each start time and count covering meetings — `O(n²)`, too slow at `n = 10⁴`, but it motivates the real solution."
>
> **[Main]** "Sort meetings by start. Keep a min-heap of end times, one entry per occupied room. For each meeting: if the earliest end is ≤ my start, that room is free — `heapreplace`, reuse it. Otherwise every room's meeting is still running at this instant, so push: one new room. The heap only grows, and it grows exactly when concurrency forces it — so `len(heap)` is the answer."
>
> **[Complexity]** "`O(n log n)` time for the sort plus `n` heap operations, `O(n)` space. That's essentially comparison-optimal, since the answer depends on the ordering of all `2n` endpoints."
>
> **[Alternative]** "Heap-free version: sort starts and ends separately, two pointers — advance `j` and reuse when `starts[i] >= ends[j]`, otherwise increment rooms."
>
> **[Tests]** "I'd check both official examples plus: a single meeting, touching endpoints, exact duplicates, and nested-but-disjoint meetings."
>
> **[Follow-up hooks]** "If you want the actual assignments, I'd store `(end, room_id)` pairs; for the busiest window, I'd sweep and track the argmax."

---

## 15. Say It in 60 Seconds

> "Minimum rooms equals **max meetings running at the same instant** — that's forced from below, and a greedy hits it exactly. Plan: **sort by start**, keep a **min-heap of end times**, one per occupied room. Each meeting: if the earliest end is `<=` my start, `heapreplace` — reuse that room; otherwise every room's still busy, so push — one new room. Heap size never shrinks and grows only when forced, so **final heap size is the answer**. `O(n log n)` time, `O(n)` space — the log factor is just the sort, and the answer depends on the order of all `2n` endpoints. Heap-free option: sort starts and ends separately and two-pointer them, reusing a room whenever `start >= earliest unfinished end`. Assumptions I'd confirm: half-open intervals — so `[1,5],[5,10]` shares a room; duplicates count separately; input isn't pre-sorted. I'd test both examples, a single meeting, touching endpoints, and duplicates."
