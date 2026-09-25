# Top K Frequent Elements — Full Interview Lesson

## 1. Restating the Problem

Before touching code, restate it precisely — this is where candidates silently lose points by misreading the output:

> Given an array `nums` of `n` integers and an integer `k`, return **the values themselves** (not their counts, not their indices) of the `k` most frequently occurring elements. Any order is acceptable.

Three precision points to lock in immediately:

- **Values, not indices or counts.** For `[1,1,1,2,2,3], k=2` the answer is `[1, 2]` — the *elements* 1 and 2, not `[3, 2]` (their frequencies) and not `[0, 3]` (their first indices).
- **Duplicates collapse.** Each unique value appears **at most once** in the output, even if it appears a million times in the input.
- **Output length is exactly `k`** — the constraint `1 ≤ k ≤ (# unique elements)` guarantees we can always fill it, with no padding and no partial answer.
- **"The answer is unique"** means there is no tie *at the cutoff point* (the k-th and (k+1)-th frequencies differ). Ties *inside* the top-k are fine, as Example 3 shows. So we never need a tie-breaking policy — a nice simplification most candidates miss.

---

## 2. Decoding the Constraints

Every constraint here is a design hint. Read them out loud in the interview:

| Constraint | What it tells you |
|---|---|
| `1 ≤ nums.length ≤ 10^5` | O(n²) is ~10^10 ops — too slow. O(n log n) is fine *in general*, but the follow-up demands better → target **O(n)** or **O(n log k)**. |
| `-10^4 ≤ nums[i] ≤ 10^4` | Value range is only 20,001 → you *could* count in a flat array `counts[v + 10_000]` instead of a hash map. More importantly: the optimal solution never indexes by value, so **negatives are a non-issue** there. |
| `1 ≤ k ≤ # unique elements` | The heap never underflows; the bucket sweep is *guaranteed* to collect exactly `k` values; no defensive code needed. |
| Answer is unique | No tie-break rule needed at the cutoff. (In variants like Top K Frequent Words, you must define one.) |
| "Return in any order" | Do **not** append a sort of the result — it adds a pointless O(k log k) tail and muddies your complexity story. |

---

## 3. Baseline: Brute Force (and Why It's Not Enough)

The natural first idea, and the right one to state aloud as a baseline:

1. **Count** frequencies with a hash map — one pass over `nums`.
2. **Sort** the distinct `(value, count)` pairs by count, descending.
3. **Take** the first `k` values.

An even cruder pre-hash variant — for each distinct value, rescan the whole array to count it — costs O(u·n) ≤ O(n²) and is worth mentioning only to dismiss.

### Worked trace (Example 1): `nums = [1,1,1,2,2,3], k = 2`

**Counting pass:**

| i | nums[i] | counts after |
|---|---|---|
| 0 | 1 | `{1: 1}` |
| 1 | 1 | `{1: 2}` |
| 2 | 1 | `{1: 3}` |
| 3 | 2 | `{1: 3, 2: 1}` |
| 4 | 2 | `{1: 3, 2: 2}` |
| 5 | 3 | `{1: 3, 2: 2, 3: 1}` |

**Sort pairs by frequency descending:** `[(1, 3), (2, 2), (3, 1)]`
**Slice first k = 2 values:** → `[1, 2]` ✓

**Complexity:** counting is O(n); sorting is O(u log u), where `u` = number of unique values. Since `u ≤ n`, worst case is **O(n log n)** — which the follow-up explicitly forbids. This is your *baseline*, not your answer.

---

## 4. The Core Insight

Two observations, in escalating order of power:

**Observation 1 — This is selection, not sorting.** We don't need a total order among all `u` distinct values; we only need the `k` largest counts. That suggests a **min-heap of size k**: push `(freq, value)` pairs, evict the weakest whenever the heap exceeds size `k`. Cost: O(n log k) — every push/pop touches a heap that never exceeds `k` elements, so each costs O(log k).

**Observation 2 — Frequencies live in a tiny integer range.** A value can appear at most `n` times, so every frequency is an integer in `[1, n]`. When keys are small integers in a known range, you don't *sort* — you **bucket**: build an array indexed by frequency, drop each value into the bucket matching its count, then sweep buckets from highest to lowest.

Bucket sort is the killer move here because it is **not comparison-based**: it places elements by direct key arithmetic (address calculation), so the Ω(n log n) comparison-model bound doesn't apply to it. That bound holds for comparison sorting because there are `n!` possible orderings, each binary comparison reveals at most one bit of information, and log₂(n!) = Θ(n log n) bits must be extracted — but bucketing never extracts ordering bits at all.

So the escalation to present: **sort pairs → O(n log n)** → **heap → O(n log k)** → **buckets → O(n)**.

---

## 5. Optimal Solution: Bucket Sort by Frequency

### 5.1 Algorithm

1. Count frequencies of every value with a hash map. — O(n)
2. Build `buckets`, an array of `n + 1` empty lists, where `buckets[f]` holds every **value** whose frequency is exactly `f`. Size must be `n + 1` because the maximum possible frequency is `n` (all elements identical). — O(n)
3. For each `(value, freq)` in the map, append `value` to `buckets[freq]`. — O(u)
4. Sweep `f` from `n` down to `1`, appending values until you've collected `k`; return immediately. — O(n)

### 5.2 Python implementation

```python
from collections import Counter
from typing import List

class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        # 1) Count frequencies -- O(n) time, O(u) space (u = # unique values).
        #    Equivalent manual loop: counts[v] = counts.get(v, 0) + 1
        counts = Counter(nums)

        n = len(nums)
        # 2) Bucket index = frequency. Max possible frequency is n (all-equal
        #    input), so we need n + 1 slots. Index 0 is simply never used,
        #    because a stored frequency is always >= 1.
        buckets = [[] for _ in range(n + 1)]          # O(n) space
        for value, freq in counts.items():            # O(u) <= O(n)
            buckets[freq].append(value)

        # 3) Sweep from the highest possible frequency downward.
        result = []
        for freq in range(n, 0, -1):                  # O(n) sweep
            for value in buckets[freq]:               # O(u) total across all buckets
                result.append(value)
                if len(result) == k:                  # early exit at exactly k values
                    return result

        return result  # unreachable: constraints guarantee k <= # unique
```

*(One-liner to know but not lead with: `Counter(nums).most_common(k)` — in CPython, passing `k` makes it delegate to `heapq.nlargest`, i.e., O(u log k); omitting `k` triggers a full sort. Say this out loud if you use it.)*

### 5.3 Traces on the official examples

**Example 1:** `nums = [1,1,1,2,2,3], k = 2` → `n = 6`, counts `{1:3, 2:2, 3:1}`

| Frequency `f` | `buckets[f]` |
|---|---|
| 6, 5, 4 | *(empty)* |
| 3 | `[1]` |
| 2 | `[2]` |
| 1 | `[3]` |

Sweep: `f = 6, 5, 4` → empty. `f = 3` → take `1` (have 1/2). `f = 2` → take `2` (have 2/2) → **return `[1, 2]`** ✓

**Example 2:** `nums = [1], k = 1` → `n = 1`, counts `{1:1}`, `buckets[1] = [1]`. Sweep hits `f = 1` immediately → **return `[1]`** ✓ (Note `buckets` has size `n + 1 = 2` — the off-by-one is live even at `n = 1`.)

**Example 3:** `nums = [1,2,1,2,1,2,3,1,3,2], k = 2` → `n = 10`; counting: `1` occurs at indices 0, 2, 4, 7 → freq 4; `2` at indices 1, 3, 5, 9 → freq 4; `3` at indices 6, 8 → freq 2.

| Frequency `f` | `buckets[f]` |
|---|---|
| 10 … 5 | *(empty)* |
| 4 | `[1, 2]` |
| 2 | `[3]` |

Sweep: `f = 4` → take `1`, take `2` (have 2/2) → **return `[1, 2]`** ✓. Note the **frequency tie at 4**: harmless, because both tied values belong to the answer — exactly the situation the "answer is unique" guarantee permits. Within-bucket order comes from dict insertion order and is arbitrary, which the problem allows.

---

## 6. Strong Alternative: Size-k Min-Heap

Worth coding second (or first, if you want to show the progression). Keep a min-heap of at most `k` `(freq, value)` pairs; the heap root is always the *weakest survivor*, evicted when a better candidate arrives.

```python
import heapq
from collections import Counter
from typing import List

class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        counts = Counter(nums)                       # O(n)

        heap = []                                    # min-heap of (freq, value), size <= k
        for value, freq in counts.items():           # O(u) iterations
            heapq.heappush(heap, (freq, value))      # O(log k) each
            if len(heap) > k:
                heapq.heappop(heap)                  # evict least frequent so far

        return [value for freq, value in heap]       # heap order is irrelevant
```

**Compact trace on Example 1 (`k = 2`)**, iterating the dict in insertion order 1, 2, 3:

| Step | Action | Heap (min first) | Why |
|---|---|---|---|
| 1 | push (3, 1) | `[(3,1)]` | size ≤ 2 |
| 2 | push (2, 2) | `[(2,2), (3,1)]` | size ≤ 2 |
| 3 | push (1, 3) | `[(1,3), (3,1), (2,2)]` | transient size 3 |
| 4 | pop (1, 3) | `[(2,2), (3,1)]` | freq-1 value evicted |

Result values: `[2, 1]` — order irrelevant → ✓. Total: **O(n + u log k)** time, O(u + k) space. One honest nuance worth stating: when `k` equals `u` equals `n`, O(n log k) degenerates to O(n log n) — the heap is only *strictly* better when `k ≪ n`; the bucket solution is unconditionally O(n).

---

## 7. Brief Aside: Quickselect

A third route: build `(freq, value)` pairs and run **randomized quickselect** to partition the top `k` into place, then copy them out. With a uniformly random pivot, the expected number of comparisons satisfies the recurrence E[T(n)] = n + (2/n)·Σᵢ E[T(i)], which solves to O(n) (≈ 4n) — but an adversarial or unlucky pivot sequence degrades to O(n²), because a pivot that peels off only one element per round gives no geometric shrinkage. Since bucket sort is simpler **and** worst-case linear, treat quickselect as a mention, not your main plan — unless the interviewer pushes on O(n) space.

---

## 8. Complexity Table and Optimality

`u` = number of unique values, `u ≤ n ≤ 10^5`.

| Approach | Time | Extra space | Beats O(n log n)? | When to pick |
|---|---|---|---|---|
| Hash count + sort distinct pairs | O(n + u log u) | O(u) | ❌ (worst case) | Baseline to state aloud |
| Hash count + min-heap of size k | O(n + u log k) | O(u + k) | ✅ when k < n; ties O(n log n) at k = u | Streaming / memory-tight input |
| Hash count + **bucket by frequency** | **O(n)** | O(n) | ✅ always — worst-case linear | **Canonical optimal answer** |
| Hash count + randomized quickselect | O(n) expected, O(n²) worst | O(u) | ✅ expected | In-place flavor, pivot-dependent |

**Why O(n) is optimal, not just achievable:** any correct algorithm must examine every element — skipping even one leaves its frequency undetermined within a range wide enough to change the top-k set — so Ω(n) is a hard floor. The bucket solution meets it. The comparison-sorting Ω(n log n) barrier (see §4) is escaped precisely because bucketing never compares elements.

---

## 9. How to Narrate It (Full Interview Script)

> **Clarify (~30s):** "Confirming: I return the *values*, not counts or indices, any order is fine, `k` is at most the number of distinct values, and the answer is guaranteed unique — so I don't need tie-breaking. Values fit in a normal int range, nothing exotic."
>
> **Baseline (~30s):** "Naive version: hash-count every element, sort the distinct `(value, count)` pairs by count descending, take `k`. That's O(n) plus O(u log u) — worst case O(n log n). It's correct, but I know it misses the follow-up, so it's just my floor."
>
> **Insight (~45s):** "Two upgrades. First, I only need the top `k`, not a total order — so a size-`k` min-heap over the pairs gives O(n log k), evicting the weakest candidate as I go. Second, and strictly better: a frequency can never exceed `n`, so frequencies are integers in `[1, n]`. Small bounded key range means I can *bucket*: an array of `n+1` buckets indexed by frequency, each value dropped into the bucket matching its count. Then I sweep from bucket `n` down to bucket 1 collecting values until I have `k`. Zero comparisons — so the Ω(n log n) comparison-sorting bound doesn't apply. Total O(n) time, O(n) space."
>
> **Code (~5 min):** counting → buckets → sweep. While writing, narrate the off-by-one: *"buckets is sized `n+1`, because an all-equal array lands some value in bucket `n`."*
>
> **Test (~2 min):** run the three official examples by hand, then call out edge cases (next section).
>
> **Close (~30s):** "O(n) time and space, which is optimal since every element must be read. If the input were a stream or memory were tight, I'd swap the buckets for a size-`k` min-heap — O(n log k), only `k` survivors held. If ties at the cutoff were possible, I'd need a tie-break rule, e.g., smaller value wins."

---

## 10. Common Mistakes and Language Gotchas

### 10.1 Logic and algorithm mistakes

1. **Returning counts instead of values.** The #1 silent failure. `[1,1,1,2,2,3], k=2` → `[1, 2]`, never `[3, 2]`.
2. **`buckets = [[]] * (n + 1)`** in Python — this creates `n+1` references to the *same* list; every "bucket" appends into one shared list. Must be `[[] for _ in range(n + 1)]`.
3. **Sizing the bucket array by `u` instead of `n`.** Max frequency is `n` (all-equal input), not the unique count → `IndexError` on `[7,7,7]`.
4. **Sweeping frequencies ascending.** You'd return the *least* frequent. Always `range(n, 0, -1)`.
5. **Wrong heap tuple order** — `(value, freq)` instead of `(freq, value)` silently sorts by value.
6. **Max-heap confusion in Python** — there's no built-in max-heap; either keep a *min*-heap of size k (preferred) or negate keys.
7. **Sorting the final answer** — the problem allows any order; an unnecessary sort wrecks the complexity narrative.
8. **Overengineering tie-breaks** — because you missed the "answer is unique" guarantee.
9. **Calling the heap approach "O(n)"** — it's O(n log k). Precision matters when the whole question is about complexity.

### 10.2 Language-specific gotchas

| Language | Gotcha | Fix |
|---|---|---|
| Python | `[[]] * (n + 1)` aliases one list | `[[] for _ in range(n + 1)]` |
| Python | `(freq, value)` tuples compare `value` on frequency ties | Harmless for ints; for non-comparable payloads, add an index tiebreaker `(freq, i, value)` |
| Java | `new ArrayList<>(n + 1)` sets *capacity*, not size — `buckets.get(f)` throws | Build with a loop: `for (int i = 0; i <= n; i++) buckets.add(new ArrayList<>());` |
| Java | `HashMap<Integer,Integer>` autoboxes every count; and the `(a, b) -> a[0] - b[0]` comparator-subtraction habit | Use `getOrDefault(v, 0) + 1`; prefer `Integer.compare` — overflow is impossible here (freq ≤ 10^5), but the subtraction habit bites elsewhere |
| C++ | `std::priority_queue` is a **max**-heap by default, inverting "keep smallest k" logic | `priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>>` for a min-heap by frequency |
| C++ | `pair` ties compare by the second member (the value) | Deterministic and safe here given the unique answer — just be aware of it |
| Java / C++ | Map iteration order is unspecified | Fine for correctness here; never claim deterministic output order from a `HashMap`/`unordered_map` |

---

## 11. Test Cases to Propose Out Loud

Say these *before or after* coding — it signals maturity and catches the off-by-ones:

| # | Input | Expected | What it stresses |
|---|---|---|---|
| 1 | `nums = [1,1,1,2,2,3], k = 2` | `[1, 2]` | Official; mixed frequencies |
| 2 | `nums = [1], k = 1` | `[1]` | Official; `n = 1`, bucket array of size 2 |
| 3 | `nums = [1,2,1,2,1,2,3,1,3,2], k = 2` | `[1, 2]` | Official; frequency **tie inside** the top-k (both freq 4) |
| 4 | `nums = [7,7,7], k = 1` | `[7]` | **All identical** → some value lands in bucket `n`; catches the `n+1` sizing bug |
| 5 | `nums = [4,5,6], k = 3` | any order of `[4,5,6]` | `k` = # unique → full sweep, **no early exit**, loop must terminate cleanly |
| 6 | `nums = [-1,-1,-1,0,2,2], k = 2` | `[-1, 2]` | **Negative values and zero** in the output; confirms we never index by value anywhere |
| 7 | `nums = [1,1,1,2,2,3], k = 1` | `[1]` | `k = 1` sanity check on the cutoff logic |

Assumptions worth voicing: output is *values*; order irrelevant; `k ≤ # unique` guaranteed; answer unique so no tie-break policy needed.

---

## 12. Transferable Patterns and Related Problems

Distilled patterns:

- **"Top-k by some score" ⇒ selection, not sorting.** Reach for a size-k min-heap (or quickselect) before a full sort.
- **"Key is a small bounded integer" ⇒ bucket / counting sort for O(n + range).** Frequencies in `[1, n]`, citations in `[0, n]`, ages, grades — same trick every time.
- **Frequency map as step one** is a free O(n) prepass used across dozens of problems.
- **Streaming / unbounded data ⇒ heap** (it holds only `k` survivors); **truly massive data ⇒ approximate sketches** (e.g., Count-Min Sketch) feeding a heap — worth one sentence in a senior-level interview.

| Problem | Relationship to this one |
|---|---|
| 215. Kth Largest Element in an Array | Same "selection, not sorting" idea on raw values; heap or quickselect |
| 973. K Closest Points to Origin | Top-k by a computed score (distance); size-k heap |
| 692. Top K Frequent Words | This problem **plus** a tie-break rule (lexicographic) — heap with custom comparator, or buckets + per-bucket sort |
| 451. Sort Characters by Frequency | Bucket by frequency, but emit *everything* in frequency order |
| 703. Kth Largest Element in a Stream | The size-k heap as a *streaming* pattern |
| 373. Find K Pairs with Smallest Sums | Heap-driven k-way candidate generation |
| 274. H-Index | Bounded key range (citations ≤ n) → the same counting/bucket trick |

---

## 13. Say It in 60 Seconds

> "The key observation: a frequency can never exceed n. So — first pass, I hash-count every element, O(n). A full sort of the distinct pairs would be O(n log n), which the follow-up forbids, and comparison sorting is Ω(n log n) anyway — so I sidestep comparisons entirely. I build an array of n plus one buckets indexed by frequency and drop each unique value into the bucket matching its count. Then I sweep from bucket n down to bucket 1, collecting values until I have k. Counting, bucketing, and sweeping are each linear, so the whole thing is O(n) time, O(n) space — and that's optimal, because you can't find the top-k without reading all n elements. Two gotchas: size the bucket array n plus one, since an all-equal array lands in bucket n; and return the values, not the counts. If the input were a stream or memory-tight, I'd swap the buckets for a size-k min-heap — O(n log k), only k candidates held."
