# Longest Consecutive Sequence — Complete Interview Lesson

## 1. Problem Restatement (what's actually being asked)

Given an unsorted array `nums`, return the **length** of the longest run of **consecutive integer values** — i.e., some sequence `v, v+1, v+2, …, v+k` where every element appears somewhere in the array. Three precision points interviewers test:

| Precision point | Clarification |
|---|---|
| **Values, not indices** | The elements do **not** need to be adjacent in the array. In `[100,4,200,1,3,2]`, the values `1,2,3,4` live at indices 5, 1, 4, 3 — scattered. "Consecutive" refers to the *number line*, not positions. |
| **Duplicates count once** | `[1,0,1,2]` → answer is 3, not 4. A run is a set of distinct consecutive values. |
| **Return length, not the run** | Just an integer count. (If asked to return the run itself, see §10.) |
| **Hard requirement: O(n)** | The problem explicitly forbids the easy `n log n` sort-based answer. You must say this out loud — it's the signal that hashing (space-for-time) is intended. |

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `0 <= n <= 10^5` | An O(n²) double scan is ~10¹⁰ operations → TLE. O(n log n) runs fine computationally but **violates the stated requirement** — treat sorting as a baseline to mention, then beat it. |
| `-10^9 <= nums[i] <= 10^9` | Values fit in 32-bit signed int, **but the span is ~2×10⁹ values**, so a boolean array / counting sort over the range would need ~250 MB. Direct addressing is out → **hashing** is the tool. |
| `n` can be **0** | Empty input must return 0. Initialize your best to 0 and never `max()` an empty collection. |
| Duplicates possible | A `set` collapses them for free. |
| Negative values | The "start of a run" check must work symmetrically for `x-1` at the bottom of the range — no positive-only assumptions. |

## 3. Brute Force

### 3.1 Baseline: sort-and-scan — O(n log n)

```python
def longest_consecutive_sort(nums: list[int]) -> int:
    if not nums:
        return 0
    nums = sorted(nums)                 # O(n log n)
    best, run = 1, 1
    for i in range(1, len(nums)):
        if nums[i] == nums[i - 1]:      # duplicate: extend nothing, DON'T reset
            continue
        elif nums[i] == nums[i - 1] + 1:
            run += 1                    # still the same run
        else:
            run = 1                     # gap in values -> new run starts here
        best = max(best, run)
    return best
```

**Trace on Example 1** — `[100,4,200,1,3,2]` → sorted `[1,2,3,4,100,200]`:

| i | nums[i] | prev | relationship | run | best |
|---|---|---|---|---|---|
| 0 | 1 | — | init | 1 | 1 |
| 1 | 2 | 1 | prev+1 → extend | 2 | 2 |
| 2 | 3 | 2 | prev+1 → extend | 3 | 3 |
| 3 | 4 | 3 | prev+1 → extend | 4 | **4** |
| 4 | 100 | 4 | gap → reset | 1 | 4 |
| 5 | 200 | 100 | gap → reset | 1 | 4 |

Returns 4 ✓. This passes functionally, but sorting can't be made linear: any comparison-based sort needs Ω(n log n) comparisons because its decision tree must distinguish n! possible orderings, and log₂(n!) = Θ(n log n). Mention it, then beat it.

### 3.2 The trap: hash walk *without* the anchor — O(n²) worst case

```python
def longest_consecutive_naive(nums: list[int]) -> int:
    s = set(nums)
    best = 0
    for x in s:                 # start a walk from EVERY value
        length, y = 0, x
        while y in s:
            length += 1
            y += 1
        best = max(best, length)
    return best
```

**Mini-trace on `[1,2,3,100]`:** walk from 1 probes 1,2,3,✗4; from 2 probes 2,3,✗4; from 3 probes 3,✗4; from 100 probes 100,✗101 — 11 probes where 5 suffice. The blowup: on `nums = [1, 2, …, n]` every element triggers a full Θ(n) walk → Θ(n²) ≈ 10¹⁰ probes at n = 10⁵, which is minutes of runtime and an instant TLE.

## 4. The Core Insight: only count from the *start* of a run

> **A value `x` is the start of a maximal consecutive run if and only if `x - 1` is NOT in the set.**

Every element of a run like `1,2,3,4` is "interior" — reachable by walking up from a smaller element. So we only pay for the expensive walk at canonical starts. This turns a nested-loop-looking algorithm into a linear one:

- Outer loop: one O(1) start-check per **distinct** value.
- Inner walk: only runs at starts, and every successful probe steps into an element that belongs to **exactly one** maximal run, entered **only** from its start.
- Therefore each set element is touched at most twice (once by a start-check, once by a walk) → **O(n) total probes**, since the runs partition the set.

## 5. Optimal Solution — O(n) expected time, O(n) space

```python
def longest_consecutive(nums: list[int]) -> int:
    num_set = set(nums)              # O(n): dedupes + O(1) avg membership
    best = 0

    for x in num_set:                # iterate the SET, not nums (see §8, mistake #5)
        if x - 1 in num_set:         # has a predecessor -> interior to a run
            continue                 # some smaller start will walk this run for me
        # x is the START of a maximal run: walk forward
        length = 1                   # x itself counts
        while x + length in num_set:
            length += 1
        best = max(best, length)

    return best                      # 0 for empty input, naturally
```

*(Precision: `best = 0` before the loop means `[]` → 0 with no special case; the start element counts as length 1, so no off-by-one at the bottom.)*

### 5.1 Trace — Example 1: `[100,4,200,1,3,2]`, set `{1,2,3,4,100,200}`

| x | x−1 in set? | Action | Walk probes | length | best |
|---|---|---|---|---|---|
| 1 | 0? no | **START** | 2,3,4, ✗5 | 4 | **4** |
| 2 | 1? yes | skip | — | — | 4 |
| 3 | 2? yes | skip | — | — | 4 |
| 4 | 3? yes | skip | — | — | 4 |
| 100 | 99? no | **START** | ✗101 | 1 | 4 |
| 200 | 199? no | **START** | ✗201 | 1 | 4 |

6 start-checks + 6 walk probes ≈ 2n. Returns **4** ✓. (Python set iteration order isn't guaranteed — presented sorted for readability; the result is order-independent because each run is walked exactly once, from its unique start.)

### 5.2 Trace — Example 2: `[0,3,7,2,5,8,4,6,0,1]`

Set = `{0,1,2,3,4,5,6,7,8}` (the duplicate `0` collapses). Only start is `0` (since −1 ∉ set); the walk probes 1→8 plus the failed probe at 9, giving length **9**. The other 8 values each fail the start-check in O(1). ✓

### 5.3 Trace — Example 3: `[1,0,1,2]`

Set = `{0,1,2}` (duplicate `1` collapses). Start = `0`; walk gives length **3**. `1` and `2` have predecessors and are skipped. ✓

## 6. Complexity Summary

| Approach | Time | Space | Verdict |
|---|---|---|---|
| Naive walk from every value | O(n²) worst (Θ(n²) on `1..n`) | O(n) | TLE |
| Sort + scan runs | O(n log n) | O(1)–O(n) | Violates the O(n) requirement |
| **Hash set + start anchor** | **O(n) expected** | **O(n)** | ✅ The answer |
| Union-Find on adjacent values | O(n·α(n)) expected | O(n) | Alternative; α(n) ≤ 5 for any conceivable n, so effectively linear |

Precision on the O(n) claim: it's **expected/average-case** under standard uniform-hashing assumptions. Worst-case caveats: Java 8+ `HashMap`/`HashSet` treeifies oversized buckets (Integers are `Comparable`), degrading to O(log n) per lookup → O(n log n) overall worst case; C++ `unordered_set` can degrade to O(n) per lookup under collisions, though that doesn't occur on this problem's tests.

### Alternative: Union-Find (mention, don't lead with it)

Union each value `x` with `x+1` when both exist, then count set sizes:

```python
def longest_consecutive_uf(nums: list[int]) -> int:
    if not nums:
        return 0
    s = set(nums)
    parent = {x: x for x in s}
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]   # path halving
            a = parent[a]
        return a
    for x in s:
        if x + 1 in s:
            parent[find(x)] = find(x + 1)
    from collections import Counter
    return max(Counter(find(x) for x in s).values())
```

With path compression, union-find operations amortize to inverse-Ackermann time each, which is effectively constant. It's more code for the same result — offer it only if asked "any other way?"

## 7. Common Mistakes & Gotchas

1. **Thinking it's a subarray/index problem.** Sorting the array and scanning *positions* is fine, but the run is over **values**; `1,2,3,4` may be scattered. Say "values, not positions" explicitly.
2. **Forgetting the `x-1 not in set` anchor check.** Correct but O(n²) → the classic TLE. This is the #1 thing the interviewer is watching for.
3. **Sort-based scan that resets on duplicates.** `[1,2,2,3]`: without the `nums[i] == nums[i-1] → continue` branch, the duplicate `2` resets the run and you return 2 instead of **3**.
4. **Empty input crash.** `best` initialized to `-inf`, or `return max(runs)` on an empty list → error. Initialize `best = 0` (also handles single-element inputs naturally).
5. **Iterating `nums` instead of `num_set`.** With heavy duplicates this re-walks the same run once per copy and goes quadratic: `nums = [1]*50000 + [2..50001]` → 50,000 walks of length 50,000 ≈ 2.5×10⁹ probes. Iterating the set does ~10⁵. (This is a *legitimate* TLE trap, not a style nit.)
6. **Membership testing against the list** (`x+1 in nums`) — O(n) per probe → O(n²). Always build the set.
7. **Off-by-one at the start.** The start element itself counts: begin `length = 1`, not 0.
8. **Relying on set iteration order** as if it were sorted. It isn't — the anchor check is what makes the algorithm correct *and* fast, independent of order.
9. **Confusing this with LIS (LC 300).** Longest *increasing subsequence* requires order from the array and is O(n log n); here order is irrelevant and values must be consecutive.

### Language-specific gotchas

| Language | Gotcha | Note |
|---|---|---|
| Java | `HashSet<Integer>` autoboxes every `int` | ~16–24 bytes per entry plus GC churn; fine at n = 10⁵, but box once (build the set once) and iterate it. Compare via `contains`, never `==` on `Integer`s. |
| Java | Worst-case buckets | Integers are `Comparable`, so buckets treeify to O(log n) per op — total O(n log n) worst case, still safe. |
| C++ | `unordered_set<int>` | Call `.reserve(n)` upfront to avoid rehashing; `count(x)` and `find(x) != end()` are equivalent — pick one. `std::hash<int>` is identity, so collisions depend on `key % bucket_count`, but no adversarial tests target this problem. |
| C++ | Operator use | `x + length` stays in `int` here (see overflow row), but prefer `long long` habitually in streak arithmetic if constraints ever widen. |
| All | Overflow | Safe under stated constraints: worst streak endpoint is 10⁹ + 10⁵ ≈ 1.0001×10⁹ < 2³¹−1, and `x-1 ≥ −10⁹−1` fits too. Switch to 64-bit only if constraints change. |

## 8. Test Cases to Propose Out Loud

State these **before** coding (or verify right after) — it signals maturity:

| Input | Expected | What it verifies |
|---|---|---|
| `[100,4,200,1,3,2]` | 4 | Official ex. 1; scattered values |
| `[0,3,7,2,5,8,4,6,0,1]` | 9 | Official ex. 2; duplicate `0` |
| `[1,0,1,2]` | 3 | Official ex. 3; duplicates inside a run |
| `[]` | 0 | Empty array is allowed by constraints; no crash |
| `[7]` | 1 | Single element |
| `[5,5,5,5]` | 1 | All duplicates — not "4" |
| `[1,2,2,3]` | 3 | Duplicate must not reset a run (kills the sort-scan bug) |
| `[-2,-1,0,1]` | 4 | Negatives crossing zero; `x-1` check at boundary |
| `[1,2,3,…,50000]` | 50000 | Long run — kills the no-anchor O(n²) version |
| `[1000000000, 999999999]` | 2 | Extreme values, adjacent descending order |

## 9. Transferable Patterns & Related Problems

**Patterns to name in the interview:**

- **Canonical entry point (anchor) filter:** do expensive work only from canonical representatives (here: run starts). Same shape as DFS from border cells, merging intervals from sorted starts.
- **Membership hash set:** trade O(n) space for O(1) lookups; also dedupes for free.
- **Amortization argument:** a "nested loop" is linear because inner work consumes each element at most once, partitioned by anchors. Being able to *state this proof sketch* is what separates pass from strong hire.
- **Values vs. positions:** decide early whether the problem is about array structure or value semantics — it changes the entire toolset.

**Related problems:**

| Problem | Relation | What transfers |
|---|---|---|
| LC 217/219/220 Contains Duplicate I–III | Set/hash membership warm-ups | Build-set-once, O(1) lookup discipline |
| LC 1 Two Sum | Complement lookup | Space-for-time hash trade |
| LC 41 First Missing Positive | Consecutive-integer domain, O(n) time O(1) space | Value↔slot binding as an alternative hashing trick |
| LC 448 Find All Numbers Disappeared | In-place value-as-index marking | Same O(n)-via-marking mindset |
| LC 298 Binary Tree Longest Consecutive Path | "Consecutive" = parent value + 1 on a path | Run-extension idea, relocated to trees |
| LC 228 Summary Ranges | Output the runs themselves | Sort + run detection (and the duplicate-skip subtlety) |
| LC 300 Longest Increasing Subsequence | **Common mix-up, NOT related** | Different semantics: order matters, values needn't be consecutive |

## 10. Full Interview Talk Track (the script you practice)

> "Let me restate: given an unsorted array, find the length of the longest run of **consecutive integers by value** — positions don't matter, duplicates count once, and I need O(n) time.
>
> Baseline first: sort and scan runs — n log n, and that's a comparison-sort floor, so sorting alone can't satisfy the linear requirement. It's my talking point, not my answer.
>
> For linear, I'll use a hash set. Step one: dump the array into a set — O(1) membership and it dedupes. Step two, the key trick: I only want to start counting a run at its **first** element. A value x is the start of a run exactly when x minus one is not in the set. So I loop over the set, skip any x whose predecessor exists, and from true starts I walk x+1, x+2, … counting the length and tracking the max.
>
> Why is this linear despite the nested loop? The walk only runs at starts, and every set element is entered by a walk exactly once — each value belongs to one maximal run, reached only from its start. So total work is O(n) expected, with O(n) space for the set.
>
> Edge cases I'm covering: empty array returns 0 — my `best` starts at 0; duplicates — the set absorbs them; single element — returns 1; negatives — fine, the x−1 check is symmetric.
>
> One trap I want to flag: I iterate the **set**, not the array — with heavy duplicates, iterating the array re-walks the same run once per copy and degenerates to quadratic. And the anchor check is non-negotiable; without it this is O(n²) on an input like 1 through n."

## 11. Say It in 60 Seconds

> "This is a **values** problem, not positions — longest run x, x+1, …, x+k anywhere in the array, and it must be linear. Brute force is sort-and-scan at n log n, but we beat that with hashing. One: put everything in a set — dedupes and gives O(1) lookups. Two, the key trick: **only count runs from their start** — x is a start iff x−1 isn't in the set; otherwise skip x, because a smaller value will walk this run for me. Three: from each start, walk forward while the next value exists and track the max. It's linear even though it looks nested: the walk only fires at starts, and every element is entered by a walk at most once — starts partition the set into maximal runs — so O(n) expected time, O(n) space. Edge cases: empty → 0, duplicates → the set eats them, single element → 1. Two traps: forgetting the start check makes it O(n²), and iterating the array instead of the set makes heavy duplicates re-walk runs, also O(n²)."
