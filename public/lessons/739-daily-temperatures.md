# Daily Temperatures (LeetCode 739) — Complete Interview Lesson

## 1. Problem, restated and disambiguated

> For each day `i`, find the **nearest later day** `j > i` whose temperature is **strictly warmer** than `temperatures[i]`, and report `answer[i] = j - i` (the number of days you wait). If no such day exists, `answer[i] = 0`.

Three semantic points worth confirming *out loud* before coding, because they cause most of the bugs:

- **"Warmer" means strictly greater.** An equal temperature does **not** resolve a waiting day.
- **The answer is a distance in days**: `j - i`. If tomorrow is warmer, the answer is `1` (Example 1 confirms this: day 0 → day 1 gives `1`). It is *not* the number of days strictly between, and not `j - i + 1`.
- The output has the same length as the input, with `0` as the default for unresolved days (including always the last day, and every day in a non-increasing tail).

## 2. Constraint decoding

| Constraint | What it tells you |
|---|---|
| `n` up to `10^5` | An `O(n^2)` scan is ~`n(n-1)/2 ≈ 5·10^9` comparisons worst case — too slow. You need `O(n)` or an `O(n log n)` fallback. |
| `30 <= temperatures[i] <= 100` | Only **71 distinct values**. This unlocks a per-temperature lookup-table alternative (`O(n · 70)`), and means small integers throughout. |
| Answer values ≤ `n - 1` | Distances fit comfortably in a 32-bit `int`; no overflow anywhere in this problem. |
| `answer[i] == 0` default | Leftover/unresolved entries are meaningful output, not garbage — pre-fill with zeros, not `-1`. |

## 3. Baseline: brute force, and why it dies

For each day, scan forward until you hit a strictly warmer day:

```python
def dailyTemperatures_bruteforce(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    answer = [0] * n
    for i in range(n):
        for j in range(i + 1, n):
            if temperatures[j] > temperatures[i]:
                answer[i] = j - i
                break
    return answer
```

This is `Θ(n^2)` worst case: on a **strictly decreasing** input (e.g. `[100, 99, …, 31]`), no warmer day ever exists, so every inner loop runs to the end, giving `Σ(n-i) = n(n-1)/2` comparisons — fatal at `n = 10^5`.

### Worked brute-force trace (Example 1: `[73,74,75,71,69,72,76,73]`)

| `i` | temp | scan path | result |
|---|---|---|---|
| 0 | 73 | `74` at j=1 | 1 |
| 1 | 74 | `75` at j=2 | 1 |
| 2 | 75 | 71, 69, 72 (skip), **76** at j=6 | 4 |
| 3 | 71 | 69 (skip), **72** at j=5 | 2 |
| 4 | 69 | **72** at j=5 | 1 |
| 5 | 72 | **76** at j=6 | 1 |
| 6 | 76 | 73 (skip), end | 0 |
| 7 | 73 | end | 0 |

Output `[1,1,4,2,1,1,0,0]` ✓ — but notice the repeated work: day 2's scan re-walks the exact stretch that days 3–5 already walked.

## 4. The core insight

**Observation A (batch resolution).** When a new day `i` with temperature `t` arrives, it is simultaneously the answer for *every* still-unresolved earlier day whose temperature is colder than `t`. Days don't get resolved one at a time — they get resolved **in a batch** the moment a warmer day appears.

**Observation B (the unresolved days form a non-increasing sequence).** Keep only the days that haven't found a warmer day yet. If a waiting day `j` had a warmer day `k` after it, `j` would already have been resolved by `k`. So the waiting days' temperatures are non-increasing, and the days resolvable by the new `t` are exactly a **suffix** of that sequence — the coldest ones, sitting on top of a stack.

**Observation C (index, not value).** The answer is a *distance*, `i - j`. If the stack stores temperatures, you can pop but you can't score. **The stack must store indices**, and you read temperatures through them.

**Observation D (amortization).** Each index is pushed exactly once and popped at most once, so the total number of `while` iterations across the entire run is ≤ `n`. That's why the algorithm is `O(n)` even though a single day (like day 6 in Example 1) can pop many predecessors at once.

### Duplicates and the pop condition (the #1 subtle bug)

The pop condition must be **strictly** `temperatures[stack[-1]] < t`. Equal temperatures **coexist on the stack** and each waits for its own strictly-warmer day. Consequence for the invariant: the stack is *non-increasing* bottom → top (equal neighbors allowed), not strictly decreasing.

Counterexample if you pop on `<=`:

```
Input: [70, 70, 71]
Correct:           [2, 1, 0]   # day 0 waits for day 2
With `<=` bug:     [1, 1, 0]   # day 0 wrongly resolved by the equal 70
```

### Correctness sketch (why the popped day's answer is exactly `i`)

Say `j` is popped when day `i` arrives. Then `temperatures[i] > temperatures[j]`. For any day `k` with `j < k < i`: if `temperatures[k] > temperatures[j]`, `j` would have been popped at time `k` — it wasn't, so every day between `j` and `i` is ≤ `temperatures[j]`. Hence `i` is the *first* strictly warmer day after `j`. Conversely, if `j`'s nearest warmer day is `i`, the non-increasing invariant guarantees everything stacked above `j` is also < `temperatures[i]`, so the pop loop digs down to `j` and resolves it. Days never popped have no warmer day and stay at the default `0`.

## 5. Optimal solution: monotonic non-increasing stack of indices

```python
def dailyTemperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    answer = [0] * n                      # default 0 handles "no warmer day" for free
    stack = []                            # INDICES of unresolved days;
                                          # temperatures[stack] is non-increasing bottom -> top

    for i, t in enumerate(temperatures):
        # Day i resolves every waiting day that is strictly colder than t.
        while stack and temperatures[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j             # days waited from day j to day i
        stack.append(i)                   # day i itself now waits

    return answer                         # leftover stack entries keep their 0
```

Notes:

- No special cases needed: `n = 1`, a decreasing tail, or an all-equal array all fall out of the default-zero array plus the leftover stack.
- You can store `(temperature, index)` pairs on the stack instead and compare `t` directly against the pair — same complexity, one fewer array lookup per check; the indices-only version above is the more common idiom.
- Since the stack is non-increasing, you *could* binary-search the pop boundary and bulk-pop with a slice; asymptotic cost is unchanged because every index still pops exactly once.

## 6. Traces on the official examples

### Example 1: `[73,74,75,71,69,72,76,73]` (full trace)

Stack shown bottom → top as `index:temp`.

| `i` | `t` | Pops (index → answer) | Stack after |
|---|---|---|---|
| 0 | 73 | — | `[0:73]` |
| 1 | 74 | pop 0 → `ans[0]=1` | `[1:74]` |
| 2 | 75 | pop 1 → `ans[1]=1` | `[2:75]` |
| 3 | 71 | — (75 is not < 71) | `[2:75, 3:71]` |
| 4 | 69 | — | `[2:75, 3:71, 4:69]` |
| 5 | 72 | pop 4 → `ans[4]=1`; pop 3 → `ans[3]=2`; 75 not < 72 | `[2:75, 5:72]` |
| 6 | 76 | pop 5 → `ans[5]=1`; pop 2 → `ans[2]=4` | `[6:76]` |
| 7 | 73 | — | `[6:76, 7:73]` |

Leftover `[6, 7]` keeps `0`. Result: `[1,1,4,2,1,1,0,0]` ✓. Note day 6 (`76`) resolves the whole chain `72, 75` in one step — that's the batch-resolution payoff.

### Example 2: `[30,40,50,60]`

Strictly increasing, so every new day immediately pops exactly its predecessor: `ans = [1,1,1,0]` ✓.

### Example 3: `[30,60,90]`

Same shape: each day pops its predecessor on arrival; day 2 is never popped → `[1,1,0]` ✓.

## 7. Alternatives worth knowing (and when to mention them)

**(a) Min-heap of `(temp, index)` — `O(n log n)`.** Same loop shape, but the "coldest waiting days" live in a heap; pop while `heap[0][0] < t`. This is a legitimate stepping stone if the stack invariant won't come to you under pressure — its `log n` factor exists because the heap can hold all `n` unresolved days and each of the `n` push/pop operations costs `O(log n)` comparisons up its tree.

```python
import heapq

def dailyTemperatures_heap(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    answer = [0] * n
    heap = []                              # min-heap of (temp, index)
    for i, t in enumerate(temperatures):
        while heap and heap[0][0] < t:     # again strictly `<` for duplicates
            _, j = heapq.heappop(heap)
            answer[j] = i - j
        heapq.heappush(heap, (t, i))
    return answer
```

**(b) Right-to-left per-temperature table — `O(n · 70)` time, `O(71)` space.** Exploits the `30..100` bound: walk backwards keeping `nearest[v]` = closest future index with temperature exactly `v`; for each day, check the ≤ 70 strictly-warmer candidate values (the bound is fixed regardless of `n`, which is what makes this linear-with-constant). Note the update happens **after** answering so a day can't match itself, and the candidate scan starts at `t + 1` because an equal temperature isn't warmer.

```python
def dailyTemperatures_buckets(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    answer = [0] * n
    nearest = [n] * 101                    # nearest[v]: closest future index with temp v; n = "none"
    for i in range(n - 1, -1, -1):
        t = temperatures[i]
        best = min(nearest[v] for v in range(t + 1, 101))   # strictly warmer values only
        if best < n:
            answer[i] = best - i
        nearest[t] = i                     # update AFTER answering
    return answer
```

Caveat to say out loud: this is brittle if the value range ever changes; the stack solution is the general one.

## 8. Complexity summary

| Approach | Time | Space | Verdict for `n = 10^5` |
|---|---|---|---|
| Brute force | `Θ(n^2)` | `O(1)` | ~`5·10^9` comparisons on decreasing input — TLE |
| Min-heap | `O(n log n)` | `O(n)` | Passes, but the `log` factor is pure overhead here |
| Temperature buckets | `O(n · 70)` | `O(71)` | Passes; depends on the `30..100` value bound |
| **Monotonic stack (indices)** | **`O(n)`** | **`O(n)`** | Canonical answer |

For the stack: time is `O(n)` by amortization — `n` pushes and ≤ `n` pops total; space is the stack, which holds at most `n` indices (output excluded from the count by convention).

## 9. Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Storing **temperatures** on the stack instead of **indices** | You pop but can't compute the wait distance | Stack of indices; look up temps via `temps[idx]` |
| Pop condition `<=` instead of `<` | `[70,70,71]` → `[1,1,0]` instead of `[2,1,0]` | Strict `<`; equal temps stay on the stack |
| Off-by-one in the answer | Every nonzero answer is +1 too big | "Days waited" = `j - i`; tomorrow-warmer ⇒ `1` (Example 1 pins this down) |
| Treating equal as "warmer" anywhere (incl. bucket scan starting at `t`) | Duplicate-heavy tests fail | "Warmer" is strictly greater, everywhere |
| Initializing with `-1` or building output by `append` | Wrong defaults / length bugs | Pre-allocate `[0] * n` and assign by index |
| Bucket version: updating `nearest[t]` **before** answering | Day matches itself | Update after answering |
| Only testing increasing inputs | Duplicate / decreasing bugs stay hidden | Add decreasing, all-equal, duplicate tests (§11) |
| Believing the stack mirrors the whole array | Confusion while explaining | It only holds **unresolved** days; resolved days are popped and gone |

## 10. Language gotchas (Python / Java / C++)

| Language | Gotcha |
|---|---|
| **Python** | A plain `list` is the right stack (`append`/`pop` are `O(1)`); pre-allocate `[0] * n`. Nothing else tricky. |
| **Java** | Use `Deque<Integer> stack = new ArrayDeque<>()` (legacy `java.util.Stack` is synchronized and discouraged); `int[] answer = new int[n]` helpfully zero-fills. Trap: comparing boxed `Integer`s with `==` compares references — temperatures 30–100 sit inside the −128..127 autobox cache, so the bug can *pass local tests* and resurface if the value range widens. Always use `<`/`>` or `.intValue()`. |
| **C++** | `vector<int> answer(n, 0);` — do **not** then also `push_back`, or the array doubles in length. If you use `std::stack<int>`, keep the guard as `!st.empty() && temperatures[st.top()] < t` (short-circuit protects `top()`), or just use a `vector<int>` with `back()`/`pop_back()`. Distances ≤ `10^5` fit `int`; no overflow. |

## 11. Test cases to declare out loud

Say these before coding — it signals you've thought about strictness, duplicates, and shape:

| Test | Input | Expected | What it proves |
|---|---|---|---|
| Example 1 | `[73,74,75,71,69,72,76,73]` | `[1,1,4,2,1,1,0,0]` | Mixed runs; the "spike pops a chain" case |
| Example 2 | `[30,40,50,60]` | `[1,1,1,0]` | Strictly increasing |
| Example 3 | `[30,60,90]` | `[1,1,0]` | Increasing, tail is 0 |
| Edge: strictly decreasing | `[90,80,70]` | `[0,0,0]` | No warmer day anywhere; brute force's worst shape |
| Edge: duplicates then warmer | `[70,70,71]` | `[2,1,0]` | Strict warmth; kills the `<=` bug |
| Edge: all equal | `[68,68,68]` | `[0,0,0]` | Equal ≠ warmer |
| Edge: single day | `[50]` | `[0]` | `n = 1`, last day is always 0 |
| Edge: late spike | `[60,59,58,100]` | `[3,2,1,0]` | One day resolves many at once (stack depth stress) |

Plus one performance sanity check: a length-`10^5` strictly decreasing array should return instantly — it's the worst case for brute force and the "never pop" case for the stack.

## 12. Transferable patterns and related problems

**Meta-pattern:** a monotonic stack answers, for every element, *"where is the nearest element to my right (or left) satisfying a monotone predicate?"* in `O(n)`. The three tuning knobs:

1. **Pop condition strictness** (`<` vs `<=`) encodes the problem's tie-breaking rule — here "warmer" forces strict.
2. **Store indices vs. values** — store indices whenever the answer is a distance or you must write back into specific slots.
3. **Direction** — left-to-right finds *next* greater; right-to-left finds *previous* greater (e.g., Stock Span).

The reusable complexity tool: **amortized analysis** — `n` pushes, ≤ `n` pops ⇒ `O(n)` total.

| Related problem | Same skeleton? | What changes |
|---|---|---|
| 496. Next Greater Element I | ✔ | Output the **value**, not the distance |
| 503. Next Greater Element II | ✔ | **Circular** array → loop `2n` with `i % n` |
| 901. Online Stock Span | ✔ (mirrored) | **Previous** strictly greater; streaming input |
| 84. Largest Rectangle in Histogram | ✔ | Pop computes an **area** using the popped bar and its boundaries |
| 42. Trapping Rain Water | ✔ (stack variant) | Pop computes **water level**; two-pointer alternative exists |
| 907. Sum of Subarray Minimums | ✔ | Pop counts **contributions** across subarrays; watch strict/non-strict on each side to avoid double-counting duplicates |
| 1019. Next Greater Node in Linked List | ✔ | Same loop over a singly linked list |
| 1475. Final Prices With a Special Discount | ✔ | Deliberately pops on the **non-strict** condition (`next ≤ current`) — a perfect contrast for knob #1 |

## 13. Full interview talk track

- **Clarify (30s):** "Let me pin down semantics: *warmer* means strictly greater — an equal day doesn't count — and the answer is the number of days waited, so if tomorrow is warmer that's `1`. No warmer day ⇒ `0`."
- **Brute force:** "Naively, scan forward from each day until a warmer one appears. Worst case is a strictly decreasing array where every scan hits the end — `O(n²)`, which won't survive `n = 10^5`."
- **Insight:** "What I really need per day is the *next strictly greater element's index* — that's the monotonic-stack pattern. I'll keep the days still waiting for a warmer day on a stack. Their temperatures are non-increasing bottom to top, and a new warmer day resolves all the colder waiting days **in one batch**."
- **Design choices:** "Two decisions: the stack stores **indices**, not temperatures, because the answer is a distance `i - j`; and the pop condition is **strictly less-than**, because equal temperatures must keep waiting."
- **Code, then dry-run:** walk the interviewer through Example 1 around `i = 5–6`, showing `76` popping `72` and `75` and writing `1` and `4`.
- **Tests:** "Let me call out edge cases: strictly decreasing → all zeros; `[70,70,71]` → `[2,1,0]` to prove duplicates don't resolve each other; single element → `[0]`; and a length-10⁵ decreasing array for performance."
- **Complexity:** "Each index is pushed once and popped at most once, so total work is `O(n)` amortized; `O(n)` space for the stack."

## 14. Say it in 60 seconds

> "Daily Temperatures is a next-greater-element problem in disguise. Brute force scans forward from each day — quadratic worst case, too slow for a hundred thousand days. Instead I keep a stack of indices of days still waiting for a warmer day; their temperatures are non-increasing bottom to top. When a new day is strictly warmer than the days on top of the stack, it's simultaneously their answer, so I pop each one and record the index gap. Two subtleties: the stack stores indices, not temperatures, because the answer is a distance; and equal temperatures must not pop — 'warmer' is strict — so the pop condition is strictly less-than. Every index is pushed once and popped at most once, so it's O(n) time, O(n) space. Edge cases: strictly decreasing input is all zeros, duplicates don't resolve each other, and the last day is always zero."
