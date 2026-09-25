# Longest Increasing Subsequence (LeetCode 300) — Complete Interview Lesson

## 1. Problem restated in plain English

> Given an array `nums`, find the length of the longest subsequence whose elements are **strictly increasing** — every chosen element must be greater than the one chosen before it, and the chosen elements must keep their original left-to-right order.

Four disambiguations you should say out loud before coding, because every one of them is a classic misread:

| Term | Precise meaning | What it is *not* |
|---|---|---|
| **Subsequence** | Keep relative order, delete any elements. `[10, 9, 2, 5, 3, 7, 101, 18] → [2, 5, 7, 18]` is valid (we skipped 9 and 3). | Not necessarily contiguous — that would be a **subarray/substring**. |
| **Strictly increasing** | `nums[i1] < nums[i2] < ...` with `i1 < i2 < ...`. Equal values **cannot** both be chosen. | Not non-decreasing (`≤`). This distinction decides the entire solution for `[7,7,7,7]`. |
| **Return value** | A single `int`: the **length**, not the subsequence itself. | If the interviewer wants the actual subsequence, that's a parent-pointer add-on (§5.6). |
| **Indices vs values** | The answer is over **positions** in order; comparisons are over **values**. | `dp[i]` is indexed by position `i`; the test `nums[j] < nums[i]` compares values at positions `j < i`. |

## 2. Decoding the constraints

| Constraint | What it tells you before you write a line of code |
|---|---|
| `1 <= n <= 2500` | An **O(n²)** DP does ≈ `n²/2 ≈ 3.1M` inner-loop iterations — completely fine even in CPython. So O(n²) is an acceptable "pass" solution here; the follow-up pushes you toward O(n log n). If n were 10⁵+, O(n²) would be dead on arrival. |
| `-10^4 <= nums[i] <= 10^4` | Values may be **negative** — never initialize a "best so far" or a sentinel with `0`. Also, the value domain is tiny (20,001 distinct values), so a value-indexed Fenwick/segment-tree DP is a viable alternative (§11). |
| `n >= 1` | The answer is at least 1; there is no empty-array case per constraints. Still, say out loud: *"if `nums` were empty I'd return 0."* |

## 3. Brute force, then the climb to O(n²)

### 3.1 Level 0: enumerate every subsequence — O(2ⁿ)

Every element is either "take" or "skip" → 2ⁿ subsequences; check each for sortedness in O(n).

**Worked trace** on a mini input, `nums = [2, 5, 3]` (all 2³ = 8 subsequences, order preserved):

| Subsequence | Increasing? | Length |
|---|---|---|
| `[]` | — | 0 |
| `[2]`, `[5]`, `[3]` | ✓ | 1 |
| `[2,5]` | ✓ | **2** |
| `[2,3]` | ✓ | **2** |
| `[5,3]` | ✗ (5 > 3) | — |
| `[2,5,3]` | ✗ | — |

Answer: 2. Now scale: for `n = 2500`, that's `2^2500 ≈ 10^752` candidates. Hopeless — but the tree below shows why we can do vastly better.

### 3.2 Level 1: the take/skip recursion has overlapping subproblems

Define `solve(i, last)` = best LIS length using `nums[i:]`, where `last` is the index of the element most recently taken (`-1` = none yet). Trace the tree on `[10, 9, 2, 5]`:

```text
solve(i=0, last=-1)
├── skip 10 → solve(i=1, last=-1)
│   ├── skip 9  → solve(i=2, last=-1) ─┬─ skip 2 → solve(i=3, last=-1)…
│   │                                  └─ take 2 → solve(i=3, last=2)  ◄──┐
│   └── take 9  → solve(i=2, last=9)  ─┬─ skip 2 → solve(i=3, last=9)…   │ same state!
│                                     └─ take 2 → solve(i=3, last=2)  ◄──┘
└── take 10 → solve(i=1, last=10)
    ├── skip 9 → solve(i=2, last=10)…
    └── take 9 → 9 < 10 ✗ pruned (strictness!)
```

The state `(i=3, last=2)` is reached by two different paths — and states are only `(n+1) × (n+1)` pairs. Memoize → **O(n²) time, O(n²) space**.

> ⚠️ Python gotcha: recursion depth hits `n = 2500 > 1000`, the default recursion limit. Either raise it (`sys.setrecursionlimit(10**5)`) or write the bottom-up form below — which you should anyway, because it's cleaner and uses O(n) space.

### 3.3 Level 2: the clean DP — "best chain **ending at** index i"

**Definition:** `dp[i]` = length of the longest strictly increasing subsequence that **ends exactly at index `i`** (i.e., `nums[i]` is the last chosen element).

**Transition:** the element before `nums[i]` in that chain must sit at some `j < i` with `nums[j] < nums[i]`:

```text
dp[i] = 1 + max(dp[j] for j < i if nums[j] < nums[i]),   or 1 if no such j exists
```

```python
def lengthOfLIS(nums: list[int]) -> int:
    n = len(nums)
    dp = [1] * n                          # every element alone is a chain of length 1
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:         # STRICT: equal values may not chain
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)                        # max over ALL i — NOT dp[-1]!
```

**Worked trace on Example 1** — `nums = [10, 9, 2, 5, 3, 7, 101, 18]`:

| i | value | best predecessor j (`nums[j] < value`, largest `dp[j]`) | dp[i] |
|---|---|---|---|
| 0 | 10 | none | 1 |
| 1 | 9 | none (10 ≮ 9) | 1 |
| 2 | 2 | none | 1 |
| 3 | 5 | j=2 (val 2, dp 1) | 2 |
| 4 | 3 | j=2 (val 2, dp 1) — **5 is not < 3** | 2 |
| 5 | 7 | j=3 or j=4 (dp 2) | 3 |
| 6 | 101 | j=5 (dp 3) | 4 |
| 7 | 18 | j=5 (dp 3) — 101 ≮ 18 | 4 |

`max(dp) = 4` ✓ (chain `[2, 5, 7, 101]` or `[2, 3, 7, 18]` — both length 4).

**Example 2** `[0,1,0,3,2,3]` → `dp = [1, 2, 1, 3, 3, 4]` → **4** ✓.
**Example 3** `[7,7,7,7,7,7,7]` → the guard `nums[j] < nums[i]` never fires (7 ≮ 7) → all `dp[i] = 1` → **1** ✓. If you'd written `<=`, you'd wrongly get 7.

This "best solution **ending here**" pattern is one of the most reused DP framings in interviews (Kadane's max-subarray is "best subarray ending at i" in the same family).

## 4. The core insight (the thing to internalize)

Two facts, one moral:

1. **A smaller tail is never worse.** If you can end a chain of length `k+1` with value `x`, then any future element that could have extended the old, larger tail of length `k+1` can also extend `x`. So for each possible chain *length*, we only ever need to remember the **smallest tail value** that achieves it — smaller tails make future extensions strictly easier.
2. **Those smallest-tails are automatically sorted**, so we can binary-search them.

That's patience sorting, the card-game version: deal cards one at a time; each new card goes onto the **leftmost pile it fits on** (a pile reads increasing from bottom to top); a card bigger than every pile top starts a new pile. The number of piles at the end is the LIS length. Our `tails` array is just the list of pile tops — and pile tops stay sorted by construction.

## 5. Optimal approach: O(n log n) patience sorting

### 5.1 Invariant and algorithm

Maintain `tails`, where:

> **Invariant:** `tails[k]` = the *minimum possible* tail value of any strictly increasing subsequence of **length `k+1`** among the elements processed so far. `tails` is strictly increasing.

For each new value `x`:
- **Append case:** `x` > every entry of `tails` → `x` extends the current longest chain → `tails.append(x)`.
- **Replace case:** otherwise, find the **leftmost** `k` with `tails[k] >= x` and set `tails[k] = x`. The element that used to sit at `tails[k]` had value ≥ `x`; no future element loses an option, because extending "length `k+1`" only gets easier with a smaller tail. The chain that used the old value still exists in the DP sense; we've just recorded a cheaper representative for that length.

Because `tails` stays sorted, "leftmost `k` with `tails[k] >= x`" is a binary search: **`bisect_left` in Python, `lower_bound` in C++**.

### 5.2 Why it's correct (3-line proof sketch)

- *Sortedness survives a replacement:* we replace at the **first** `k` with `tails[k] >= x`, so `tails[k-1] < x`, and the old `tails[k] < tails[k+1]` gives `x < tails[k+1]`. Strictly increasing is preserved.
- *The invariant survives:* the length-`k` chain ending at `tails[k-1]` (which is < `x`) extended by `x` is a length-`k+1` chain ending at `x` — so `x` really is an achievable tail for length `k+1`, and it's ≤ the old minimum.
- *Length is the answer:* an append happens exactly when a longer chain than any seen before becomes achievable, and a replacement never lengthens anything — so `len(tails)` equals the LIS of the processed prefix at every step.

### 5.3 Strictness: `bisect_left`, not `bisect_right`

This is where duplicates live or die:

| You want | Search for | Python | C++ |
|---|---|---|---|
| **Strictly increasing** (this problem) | first `tails[k] >= x` | `bisect_left` | `lower_bound` |
| Non-decreasing (allow equal) | first `tails[k] > x` | `bisect_right` | `upper_bound` |

With `bisect_left`, `x == tails[k]` **replaces in place** (a no-op on the value) instead of appending after it — which correctly refuses to chain equal values. With `bisect_right`, `[7,7,7,7]` would append every 7 and return 7 instead of 1. This single character choice is Example 3.

### 5.4 Code

```python
from bisect import bisect_left

def lengthOfLIS(nums: list[int]) -> int:
    tails: list[int] = []   # tails[k] = smallest tail of an increasing subsequence of length k+1
    for x in nums:
        i = bisect_left(tails, x)   # first index with tails[i] >= x   (strict!)
        if i == len(tails):
            tails.append(x)         # x beats everything -> new longest chain
        else:
            tails[i] = x            # cheaper tail for length i+1
    return len(tails)
```

Note there's no initialization dance and no sentinel — the empty-`tails` case falls out naturally (`bisect_left([], x) == 0 == len(tails)` → append). Contrast with the DP, where you must remember `dp = [1] * n`.

### 5.5 Traces on all three official examples

**Example 1:** `[10, 9, 2, 5, 3, 7, 101, 18]`

| x | `bisect_left` position | action | `tails` after |
|---|---|---|---|
| 10 | 0 (= len, empty) | append | `[10]` |
| 9 | 0 | replace | `[9]` |
| 2 | 0 | replace | `[2]` |
| 5 | 1 (= len) | append | `[2, 5]` |
| 3 | 1 | replace | `[2, 3]` |
| 7 | 2 (= len) | append | `[2, 3, 7]` |
| 101 | 3 (= len) | append | `[2, 3, 7, 101]` |
| 18 | 3 | replace | `[2, 3, 7, 18]` |

→ **4** ✓

**Example 2:** `[0, 1, 0, 3, 2, 3]`

| x | pos | action | `tails` after |
|---|---|---|---|
| 0 | 0 (= len) | append | `[0]` |
| 1 | 1 (= len) | append | `[0, 1]` |
| 0 | 0 | replace (no-op) | `[0, 1]` |
| 3 | 2 (= len) | append | `[0, 1, 3]` |
| 2 | 2 | replace | `[0, 1, 2]` |
| 3 | 3 (= len) | append | `[0, 1, 2, 3]` |

→ **4** ✓

**Example 3:** `[7, 7, 7, 7, 7, 7, 7]`

| x | pos | action | `tails` after |
|---|---|---|---|
| 7 | 0 (= len) | append | `[7]` |
| 7 | 0 (**found equal**) | replace (no-op) | `[7]` |
| … | 0 | replace | `[7]` |

→ **1** ✓. With `bisect_right` every 7 would append → 7 ✗.

### 5.6 Bonus: recovering an actual subsequence (parent pointers)

> ⚠️ **Critical caveat: `tails` is NOT the LIS.** It is only guaranteed that `len(tails)` is correct. Counterexample: `nums = [2, 3, 1]` → `tails` ends as `[1, 3]`, but 1 sits at index 2, *after* 3 at index 1, so `[1, 3]` is not a subsequence of `nums` at all. The true LIS is `[2, 3]`, length 2 — and `len([1, 3]) = 2` is right. If the interviewer asks you to *return the subsequence*, keep parent pointers:

```python
from bisect import bisect_left

def lis_with_path(nums: list[int]) -> list[int]:
    tails, tail_idx = [], []              # values, and the index in nums of each tail
    parent = [-1] * len(nums)             # parent[i] = index of predecessor of nums[i]
    for i, x in enumerate(nums):
        k = bisect_left(tails, x)
        if k == len(tails):
            tails.append(x); tail_idx.append(i)
        else:
            tails[k] = x; tail_idx[k] = i
        parent[i] = tail_idx[k - 1] if k > 0 else -1
    seq, i = [], tail_idx[-1]             # last index that holds the best tail
    while i != -1:
        seq.append(nums[i]); i = parent[i]
    return seq[::-1]
```

On Example 1 this returns `[2, 3, 7, 18]` — a valid LIS, different values from the "expected explanation's" `[2, 3, 7, 101]`. Multiple LIS of the same length can exist; say that out loud.

## 6. Complexity

| # | Approach | Time | Space | Verdict at n = 2500 |
|---|---|---|---|---|
| 1 | Enumerate all subsequences | O(2ⁿ · n) | O(n) | 2^2500 ≈ 10^752 — impossible |
| 2 | Memoized take/skip, states `(i, last)` | O(n²) time, O(n²) space | O(n²) | fine, but recursion depth ≈ n breaks Python's default limit |
| 3 | Bottom-up DP (§3.3) | O(n²) | O(n) | ≈ 3.1M inner iterations — comfortably fast |
| 4 | **Patience sorting (§5)** | **O(n log n)** | O(n) | ≈ 28K comparisons — instant |
| 5 | DP over value coords (Fenwick prefix-max over 20,001 value slots) | O(n log V) | O(V) | alternative when you need range-max payloads (§11) |

**The follow-up question: can we beat O(n log n)?** Not with a comparison-based method: in the comparison model, Ω(n log n) comparisons are necessary for LIS (Fredman, 1975) — an algorithm that never compares two elements can't distinguish the input from the one with those two values transposed, and inputs exist where that transposition changes the LIS length, so effectively every relevant pair must be separated, exactly the decision-tree-style argument that makes comparison sorting Θ(n log n). (If the values were, say, tiny bounded integers, a non-comparison approach over the value domain could sidestep this.)

## 7. Common mistakes (each one has burned real candidates)

1. **Reading "subsequence" as "contiguous."** Then `[10,9,2,5,3,7,101,18]` feels like a sliding-window problem. Say the definition out loud; one example fixes it.
2. **Non-decreasing instead of strict.** `nums[j] <= nums[i]` in the DP, or `bisect_right`/`upper_bound` in the O(n log n) version → `[7,7,7,7]` returns 7, not 1.
3. **Returning `dp[-1]` instead of `max(dp)`.** `dp[i]` is "best chain ending at i", and the best chain can end anywhere. Counterexample: `[1, 3, 5, 2]` → `dp = [1, 2, 3, 2]`, `dp[-1] = 2 ≠ 3`.
4. **Believing `tails` is the LIS.** `[2, 3, 1]` → `tails = [1, 3]`, which isn't a subsequence of `nums` (§5.6). Only the length is guaranteed; use parent pointers for the actual chain.
5. **Greedy "take the first bigger element" scan.** On `[10, 9, 2, 5, 3, 7, 101, 18]` it grabs `10`, then `101` → length 2 ≠ 4. Taking the first eligible element forecloses better options; the O(n log n) trick works precisely because it keeps the *smallest* tail per length, not the first.
6. **Hand-rolled binary-search off-by-ones** (`hi = len - 1` vs `len`, `<` vs `<=`, infinite loops with `mid` not moving). Prefer `bisect`/`lower_bound`; if you must hand-roll, test it on an all-duplicates input.
7. **`tails[i] = x` without the append guard** → `IndexError` (Python) / writing into unallocated space (Java/C++) when `x` is bigger than everything.
8. **Reconstruction from `tails` alone.** Impossible — the overwritten values are gone. You needed parent pointers as you went (§5.6).

## 8. Implementation gotchas beyond Python

| Language | Gotcha | Fix |
|---|---|---|
| **Java** | `Arrays.binarySearch(tails, 0, size, x)` returns `-(insertionPoint) - 1` when the key is absent — people treat it as a valid index. | Decode: `int pos = r >= 0 ? r : -(r + 1);` then append iff `pos == size`. (When `r >= 0`, `tails[r] == x` and overwriting with `x` is a harmless no-op — same semantics as `lower_bound`.) |
| **Java** | Searching the **whole backing array** sees stale values past `size` (e.g., `tails` backing `[2, 5, 99…]` with logical size 2; a search for 50 finds the stale 99). | Always use the 4-arg overload with `toIndex = size`. Prefer `int[]` over `ArrayList<Integer>` — avoids autoboxing and the `Integer ==` identity-comparison trap for values outside the cache range. |
| **C++** | `std::lower_bound` returns an **iterator**, not an index. | `auto it = lower_bound(tails.begin(), tails.end(), x); if (it == tails.end()) tails.push_back(x); else *it = x;` |
| **C++** | Strictness is easy to flip. | `lower_bound` (first ≥ x) for strict; `upper_bound` (first > x) for non-decreasing — the mirror image of Python's rule. |
| **Overflow** | Not an issue *here* (length ≤ 2500; even sum-variants stay ≤ 2500 × 10⁴ = 2.5×10⁷, well inside `int`). But count-variants (LC 673) and sum-variants in other problems can blow past 32 bits. | Reach for `long long`/`long` the moment the variant asks for sums or counts. |

## 9. Test cases to propose out loud

State these before or right after coding — it signals you think about boundaries unprompted.

| Input | Expected | What it stresses |
|---|---|---|
| `[10,9,2,5,3,7,101,18]` | 4 | Official Ex. 1 — mixed replaces and appends |
| `[0,1,0,3,2,3]` | 4 | Official Ex. 2 — replacement mid-array |
| `[7,7,7,7,7,7,7]` | 1 | Official Ex. 3 — **strictness**; catches `<=`/`bisect_right` bugs |
| `[5]` | 1 | Smallest n; loop bodies never execute |
| `[1,2,3,4,5]` | 5 | Append-only path; also `dp[-1]` happens to be right here — don't let it fool you |
| `[5,4,3,2,1]` | 1 | Replace-only path; every element overwrites `tails[0]` |
| `[-3,-1,0,-2,2]` | 4 (`[-3,-1,0,2]`) | Negative values; catches `0`-initialized sentinels |
| `[2,3,1]` | 2 | `tails = [1,3]` is **not** a subsequence — catches "return `tails`" bugs |

## 10. Full interview talk track (the script, before the 60-second cut)

1. **Restate and disambiguate (~30s):** "So this is the longest **subsequence** — I keep relative order but can skip elements, and it must be **strictly** increasing, so equal values can't both be picked. I'm returning the **length**. Quick check: `[7,7,7,7]` should be 1, right, since equal values don't count?"
2. **Constraints → plan (~30s):** "n is 2500, so O(n²) ≈ 3 million operations is already fine. I'll build that first for correctness, then I know there's an O(n log n) via binary search, which answers the follow-up."
3. **O(n²) (~2 min):** "Brute force is 2ⁿ subsets. The DP that collapses it: `dp[i]` = longest increasing subsequence **ending exactly at index i**. For each i, scan earlier j with `nums[j] < nums[i]` — strict — and take the best `dp[j] + 1`. Answer is `max(dp)`, not the last cell." Trace Example 1 briefly.
4. **Upgrade to O(n log n) (~4 min):** "The key observation: for the *future*, only two things about a chain matter — its **length** and its **tail value**, and a smaller tail is never worse. So I keep `tails[k]` = smallest tail achievable for length k+1. That array stays strictly sorted, so for each new element I binary-search the first entry ≥ it and replace; if it's bigger than everything, I append. Strictness means `bisect_left` / `lower_bound` — `bisect_right` would let duplicates chain and fail the all-sevens case." Trace Examples 1–3.
5. **Edge cases + caveat (~1 min):** "Single element, strictly decreasing, all equal, negatives. One caveat I want to flag: `tails` itself isn't an answer subsequence — `[2,3,1]` leaves `[1,3]`, and 1 comes after 3. If you need the actual subsequence I'd add parent pointers."
6. **Complexity:** "O(n log n) time, O(n) space. And that's essentially optimal for comparison-based algorithms."

## 11. Transferable patterns and related problems

**Patterns you'll reuse:**

- **"Best solution ending at i" DP.** Any time the state can be summarized by "the optimal thing that terminates here" — LIS, Kadane's max subarray, max-sum increasing subsequence, longest bitonic (LIS from the left + LIS from the right, i.e., a decreasing suffix).
- **Keep the canonical minimum per answer-length + binary search.** The "smallest tail per length" trick generalizes: whenever a greedy-looking problem fails only because an early pick blocks later options, check whether keeping the *most permissive representative per state* fixes it.
- **Sort to linearize dimensions.** 2D dominance (fit inside) becomes 1D increasing after sorting — and the sort's tie-breaking carries the strictness. This *is* LC 354 and LC 1691.
- **Longest path in an implicit DAG.** Edges `j → i` whenever `j < i` and the pair is "compatible." Swap "smaller" for "divides" → LC 368; for "envelope fits" → LC 354.
- **Value-indexed Fenwick/segment tree.** When each DP step needs "max dp among values `< x`" and plain binary search can't carry the payload (counts, sums, 2D). Here: O(n log 20001).
- **LCS bridge:** LIS of `nums` equals the LCS of `nums` against its sorted *distinct* values (a common subsequence of those two is exactly an increasing subsequence) — a cute reduction worth knowing; dedupe first or duplicates break it.

**Related problems to drill:**

| Problem | How it maps to this lesson |
|---|---|
| LC 673 — Number of Longest Increasing Subsequences | Keep `cnt[i]` alongside `dp[i]` |
| LC 354 — Russian Doll Envelopes | Sort by width asc, **height desc** (desc kills same-width chains), then LIS on heights |
| LC 1691 — Maximum Height by Stacking Cuboids | Sort each cuboid's dims + LIS-style stacking DP |
| LC 646 — Maximum Length of Pair Chain | Sort by right end; greedy/LIS variant |
| LC 368 — Largest Divisible Subset | "Increasing" → "divides"; needs parent pointers (like §5.6) |
| LC 1671 — Min Removals to Make Mountain Array | Bitonic: LIS from left + LDS from right |
| LC 2407 — Longest Increasing Subsequence II | n up to 10⁵ → segment tree over values |
| Longest Bitonic Subsequence (classic) | LIS + LDS combo; tests whether you can flip the direction |

## 12. Say it in 60 seconds

> "LIS is the longest **strictly** increasing **subsequence** — keep the order, skip elements, equal values can't repeat. Enumerating subsequences is 2 to the n, dead. First upgrade: DP where `dp[i]` is the longest increasing subsequence **ending exactly at index i** — for each i, scan earlier j with a strictly smaller value, take `dp[j] + 1`, and return the **max over all i**, not the last cell. That's O(n²), fine for n around 2500. For the O(n log n) follow-up: only a chain's length and tail matter for the future, and a smaller tail is never worse — so I keep `tails[k]`, the smallest tail achievable for length k+1. That array stays sorted, so each new value x binary-searches the first entry **greater than or equal** to x and replaces it, or appends if x beats everything. Strictly increasing means **`bisect_left` / `lower_bound`** — `upper_bound` would chain duplicates and return 7 on all-sevens. One caveat: `tails` itself is not a valid subsequence, only its length is guaranteed — parent pointers if you need the actual chain. Time O(n log n), space O(n)."
