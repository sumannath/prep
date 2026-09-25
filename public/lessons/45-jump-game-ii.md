# Jump Game II — Deep Dive (LeetCode 45)

## 1. Problem, restated in your own words

You stand on **index 0** of an array `nums`. From index `i` you may leap to **any** index in the range `[i + 1, i + nums[i]]` — `nums[i]` is a **maximum** hop length, not an exact one. Return the **minimum number of hops** needed to land on index `n − 1`. The problem guarantees that index `n − 1` is reachable.

Two clarifications worth saying out loud in an interview:

- Jumps are strictly forward (you can "stay" with `j = 0`, but staying never helps, so effectively every move goes right).
- The answer counts **edges, not vertices**: a path `0 → 1 → 4` is **2 jumps**, even though it touches 3 indices.
- The answer is always in `[0, n − 1]`: you need at least 0 jumps (if `n = 1`) and at most `n − 1` (hopping one step at a time, when every `nums[i] ≥ 1`).

---

## 2. Decoding the constraints

| Constraint | What it tells you about the intended solution |
|---|---|
| `n ≤ 10⁴` | An `O(n²)` DP is ~10⁸ raw steps in the worst case — likely fine in C++/Java, risky in Python. An `O(n)` solution clearly exists and is intended. |
| `nums[i] ≤ 1000` and `n ≤ 10⁴` | Any derived index like `i + nums[i]` is at most ≈ 11,000 — **no 32-bit overflow concerns**. Also bounds DP work at `Σ nums[i] ≤ 10⁷`. |
| "You can reach `n − 1`" | **No `-1` / unreachable case.** Crucially, it also means the greedy frontier (Section 5) always strictly advances — no stuck states, no infinite loops. |
| `nums[i]` can be `0` | Zeros are legal. A zero is harmless as long as it's *inside* a reachable level; it only strands you if you're forced to take off from it, which the guarantee excludes (except trivially when it's the last index). |
| `n = 1` possible | The answer is `0` — you're already standing on the last index. Don't force at least one jump. |

---

## 3. Brute force: from exponential to O(n²) DP

### 3.1 Naive recursion

Try every choice of hop length from every index:

```python
def jump_naive(nums: list[int]) -> int:
    n = len(nums)

    def dfs(i: int) -> int:
        if i >= n - 1:
            return 0
        best = float("inf")
        for step in range(1, nums[i] + 1):   # every possible hop
            best = min(best, 1 + dfs(i + step))
        return best

    return dfs(0)
```

This is exponential. Justification: with every `nums[i] = 2`, distinct jump sequences correspond to compositions of `n − 1` into parts 1 and 2, which number Θ(φⁿ) (Fibonacci growth) — so exhaustive enumeration is exponential in `n`.

### 3.2 Bottom-up DP — the "brute force with a brain"

Let `dp[i]` = minimum jumps to **reach index `i`**. Push forward: from `i` you can improve every `j` in `[i + 1, min(i + nums[i], n − 1)]`.

```python
def jump_dp(nums: list[int]) -> int:
    n = len(nums)
    dp = [float("inf")] * n
    dp[0] = 0
    for i in range(n):
        # dp[i] is always finite here: reachability of n-1 (forward-only jumps)
        # implies every earlier index is reachable too.
        reach = min(i + nums[i], n - 1)
        for j in range(i + 1, reach + 1):
            dp[j] = min(dp[j], dp[i] + 1)
    return dp[n - 1]
```

**Worked trace** on `nums = [2,3,1,1,4]` (`n = 5`):

| Takeoff `i` | `nums[i]` | Can land on | Updates | `dp` after |
|---|---|---|---|---|
| init | — | — | `dp[0] = 0` | `[0, ∞, ∞, ∞, ∞]` |
| 0 | 2 | 1, 2 | `dp[1] = 1`, `dp[2] = 1` | `[0, 1, 1, ∞, ∞]` |
| 1 | 3 | 2, 3, 4 | `dp[3] = 2`, `dp[4] = 2` (`dp[2]` stays 1) | `[0, 1, 1, 2, 2]` |
| 2 | 1 | 3 | no change | `[0, 1, 1, 2, 2]` |
| 3 | 1 | 4 | no change | `[0, 1, 1, 2, 2]` |
| 4 | 4 | — | last index, nothing ahead | `[0, 1, 1, 2, 2]` |

Answer: `dp[4] = 2`. ✓

Complexity: total work is `Θ(Σᵢ nums[i])` — at most `n · max(nums) = 10⁷` under these constraints, degrading to `O(n²)` if values scale with `n`. Correct, but you can do better — and the *shape* of the `dp` array is the hint.

---

## 4. The core insight: BFS levels on a line

Look at what `dp` computes: indices group into **contiguous bands of equal jump count**. In the trace, `dp = [0, 1, 1, 2, 2]` — level 0 is `{0}`, level 1 is `{1, 2}`, level 2 is `{3, 4}`. This is exactly **BFS on a graph where index `i` has edges to `i+1 … i+nums[i]`**.

Why are BFS levels contiguous? From index `i`, the reachable set is the contiguous window `[i+1, i+nums[i]]`. If level `k` is the window `[l, r]`, the union of the windows `[i+1, i+nums[i]]` for `i ∈ [l, r]` has **no gaps**, because consecutive windows' left endpoints (`i+1`, `i+2`, …) step by exactly 1. So level `k+1` is a single window whose right end is `max over i in level k of (i + nums[i])`.

Consequences:

1. **The queue is unnecessary.** Each BFS level is fully described by one number: its right endpoint.
2. All indices in a level cost the same number of jumps, so *which* index in the level achieves the farthest next-reach is irrelevant — only the farthest reach matters. That's why a greedy works.
3. The answer is simply **the level number that contains index `n − 1`**, i.e., the number of times the frontier had to advance.

This turns a `dp` array into two integers.

---

## 5. Optimal solution: greedy frontier scan

### 5.1 Algorithm

Maintain:

- `jumps` — jumps taken so far.
- `cur_end` — the **rightmost index reachable using `jumps` jumps** (right edge of the current BFS level). This is an *index*, final and immutable once set.
- `farthest` — the rightmost index reachable using `jumps + 1` jumps, given the takeoff indices scanned so far.

Scan `i` from `0` to `n − 2` (**excluding** the last index — you never take off from the destination):

1. Fold the current index's reach in: `farthest = max(farthest, i + nums[i])`.
2. If `i == cur_end`, the current level is exhausted. Reaching anything beyond `cur_end` provably requires another jump, so incrementing is **forced and optimal**: `jumps += 1; cur_end = farthest`. Optionally break early if `cur_end >= n − 1`.

### 5.2 Code

```python
def jump(nums: list[int]) -> int:
    n = len(nums)
    jumps = 0        # jumps taken so far
    cur_end = 0      # rightmost index reachable with `jumps` jumps (an INDEX)
    farthest = 0     # rightmost index reachable with `jumps + 1` jumps so far

    # Scan only to n - 2: we never jump *from* the last index.
    for i in range(n - 1):
        farthest = max(farthest, i + nums[i])
        if i == cur_end:              # current level exhausted -> another jump is forced
            jumps += 1
            cur_end = farthest
            if cur_end >= n - 1:      # optional early exit (not needed for correctness)
                break
    return jumps
```

Note on the early exit: once `cur_end ≥ n − 1`, the scan index `i ≤ n − 2` can never again equal `cur_end`, so omitting the `break` changes nothing — it's a micro-optimization, not a correctness requirement.

### 5.3 Trace — Example 1: `nums = [2,3,1,1,4]`, target index 4

| `i` | `nums[i]` | `i + nums[i]` | `farthest` | `i == cur_end`? | Action | `jumps` | `cur_end` |
|---|---|---|---|---|---|---|---|
| 0 | 2 | 2 | 2 | yes (0==0) | level closed → `jumps=1`, `cur_end=2` | 1 | 2 |
| 1 | 3 | 4 | **4** | no (1≠2) | — | 1 | 2 |
| 2 | 1 | 3 | 4 | yes (2==2) | `jumps=2`, `cur_end=4` ≥ 4 → break | 2 | 4 |

Levels: `{0}` → `{1, 2}` → `{3, 4}`. Index 4 lives in level 2 → **return 2**. ✓ Note that index 1 (an *interior* element of level 1) is what pushes `farthest` to 4 — not the boundary element.

### 5.4 Trace — Example 2: `nums = [2,3,0,1,4]`, target index 4

| `i` | `nums[i]` | `i + nums[i]` | `farthest` | `i == cur_end`? | Action | `jumps` | `cur_end` |
|---|---|---|---|---|---|---|---|
| 0 | 2 | 2 | 2 | yes | `jumps=1`, `cur_end=2` | 1 | 2 |
| 1 | 3 | 4 | **4** | no | — | 1 | 2 |
| 2 | 0 | 2 | 4 | yes | `jumps=2`, `cur_end=4` → break | 2 | 4 |

**Return 2.** ✓ This example is the pedagogical gem: the level-1 boundary index is 2 and `nums[2] = 0`, yet the answer is still correct because `farthest = 4` was absorbed from index 1 *before* the boundary was hit. **Progress comes from the level's best element, not the boundary element.**

### 5.5 Why it's correct (invariants to recite)

- After the scan passes index `i` with `jumps = j`: every index `≤ cur_end` is reachable in `≤ j` jumps, and `farthest` is the best reach with `j + 1` jumps using takeoffs scanned so far.
- When `i == cur_end`, nothing beyond `cur_end` is reachable in `j` jumps, so one more jump is *necessary*; and since all level-`j` indices cost the same, extending the frontier as far as possible is *optimal*. No exchange argument needed beyond that.
- **No-stall guarantee:** if `cur_end < n − 1`, reachability of `n − 1` implies some index inside the current level reaches past `cur_end`, so `farthest > cur_end` whenever a new level starts. Hence `cur_end` strictly increases each level, the loop runs at most `n` times, and there is no stuck/infinite case. (If the guarantee were dropped, you'd detect stuckness with `if i > cur_end: return -1`.)

---

## 6. Complexity

| Approach | Time | Space | Verdict |
|---|---|---|---|
| Naive DFS over all hop choices | Exponential (Θ(φⁿ) sequences when all values = 2) | O(n) stack | Infeasible |
| Bottom-up / top-down DP | `Θ(Σ nums[i])` ≤ 10⁷ here; `O(n²)` if values scale with n | O(n) | Correct; Python-risky |
| **Greedy frontier scan (final)** | **O(n)** | **O(1)** | Intended answer |
| Explicit BFS with a queue over levels | O(n) | O(n) | Same idea, more memory |

O(n) is also optimal up to constants: any algorithm that skips reading some `nums[i]` cannot distinguish it from a `0` in that slot, which can change the answer — so every element must be inspected, giving an Ω(n) input-reading lower bound.

---

## 7. Common mistakes

1. **Looping `i` through `n − 1` inclusive.** You'd count a jump *from* the last index. On `[1]` this returns 1 (should be 0); on `[2,3,1,1,4]` it returns 3 (should be 2). Fix: `for i in range(n - 1)`.
2. **Greedy misfire: "always take the longest single hop"** (land exactly `nums[i]` away). On Example 1: `0 → 2 → 3 → 4` = 3 jumps, but the answer is 2 (`0 → 1 → 4`). The correct greedy never picks a landing index; it expands a frontier.
3. **Updating `farthest` only at boundaries** (`if i == cur_end` before folding in the reach). Then the level's interior elements are ignored, and Example 1 returns 3. The fold-in `farthest = max(farthest, i + nums[i])` must run at **every** `i`.
4. **Confusing indices with values.** `cur_end` and `farthest` are indices; writing `farthest = max(farthest, nums[i])` (dropping the `+ i`) is the single most common typo. Conversely, `jumps` is a count, never compared against an index.
5. **Counting landings instead of edges.** Path `0 → 1 → 4` is 2 jumps (2 edges), not 3 positions.
6. **Over-handling zeros.** `nums = [0]` with `n = 1` legitimately returns 0. And a `while`-loop formulation without the reachability guarantee can spin forever on zeros — the bounded `for`-scan plus the problem's guarantee is what makes termination airtight.
7. **Breaking before promoting the frontier** — placing `break` *before* `cur_end = farthest` inside the boundary branch drops the final level's edge and undercounts.

---

## 8. Language-specific gotchas

| Language | Gotcha |
|---|---|
| Python | A top-down memoized solution recurses up to `n = 10⁴` deep — well past Python's default recursion limit (~1000) → `RecursionError`. Use the iterative greedy or bottom-up DP. |
| Python | `range(n - 1)` is empty when `n == 1` — that's *correct* behavior (answer 0). Don't "fix" it with a special case that forces one jump. |
| Java | In the DP version, `Integer.MAX_VALUE + 1` **overflows to a negative** during relaxation, corrupting every subsequent `min`. Since the answer is ≤ `n − 1`, use `n` as your "infinity" sentinel instead of `Integer.MAX_VALUE`. |
| C++ | Cache `int n = static_cast<int>(nums.size());` and loop `i < n - 1`. Comparing an `int i` directly against `nums.size() - 1` mixes signed/unsigned (sign-compare warnings; wraps if the container were empty). |
| C++/Java | No overflow risk in the greedy itself: `farthest ≤ (n − 1) + 1000 ≈ 11,000 ≪ 2³¹ − 1`. Know *why* there's no overflow so you don't "fix" a non-problem on the whiteboard. |

---

## 9. Tests to say out loud (before or right after coding)

Propose these verbally — it signals edge-case maturity:

| # | Input | Expected | What it exercises |
|---|---|---|---|
| 1 | `[2,3,1,1,4]` | 2 | Official ex. 1; an interior level element outruns the boundary |
| 2 | `[2,3,0,1,4]` | 2 | Official ex. 2; zero sitting on the level boundary |
| 3 | `[0]` (or `[7]`) | 0 | `n == 1`: already at the last index; loop body must never run |
| 4 | `[1,1,1,1]` | 3 | All values equal (duplicates): every hop forced; answer is `n − 1` |
| 5 | `[2,0,0]` | 1 | Zeros immediately after a big jump; must not stall or overcount |
| 6 | `[2,5,0,0,0,0,0]` | 2 | The level's boundary *index* holds a 0; progress comes from `farthest`, not the boundary element |
| 7 | `[1,2,3]` | 2 | Early exit mid-scan |

Worth *discussing* but not testing: `[1,0,1]` is unreachable, which the constraints exclude — if the interviewer drops the guarantee, say you'd return `-1` when `farthest` fails to advance past `i` at a boundary.

```python
assert jump([2,3,1,1,4]) == 2
assert jump([2,3,0,1,4]) == 2
assert jump([0]) == 0
assert jump([1,1,1,1]) == 3
assert jump([2,0,0]) == 1
assert jump([2,5,0,0,0,0,0]) == 2
assert jump([1,2,3]) == 2
```

---

## 10. Transferable patterns and related problems

**Pattern names to drop in the interview:** *implicit BFS / frontier tracking* — when one step from a position unlocks a **contiguous range**, BFS levels are contiguous windows and a queue collapses into two scalars; a.k.a. the *coverage-extension greedy*.

| Problem | Relationship |
|---|---|
| LC 55 Jump Game | The feasibility version — track only `farthest`, one pass, O(1). The #1 follow-up: "how does your code change?" (drop `jumps`/`cur_end`, return `cur_end >= n-1`). |
| LC 1306 Jump Game III | Jumps can go **left**, so levels aren't contiguous → needs explicit BFS/DFS + visited set. Good contrast case. |
| LC 1345 Jump Game IV | BFS over indices with value-teleport edges; needs a hash map and a "mark whole value-group visited once" trick. |
| LC 1347 Jump Game V | Jumps restricted to lower values → memoized DP instead of greedy. |
| LC 1326 Min Taps to Water Garden | The same frontier-extension greedy wearing an intervals costume. |
| LC 1024 Video Stitching | Identical skeleton: count how many times you must extend a coverage frontier to reach the end. |
| LC 871 Min Refueling Stops | Frontier idea with a max-heap instead of a scan. |

Meta-lesson: whenever a DP of the form "min steps to reach position `i`" has reach-sets that are intervals, the DP almost always collapses to an `O(n)` frontier greedy.

---

## 11. Full interview talk track

> "Let me restate: I'm at index 0, `nums[i]` is the *maximum* forward hop from `i`, and I return the fewest hops to index `n − 1`, which is guaranteed reachable. The answer counts jumps, so a path of three indices is two jumps, and if `n` is 1 the answer is 0.
>
> Brute force is to try every hop from every index — that's exponential, and memoizing gives a DP where `dp[i]` is the min jumps to reach `i`, pushed forward to `i+1 … i+nums[i]`. That's `O(n · max value)` — around ten million here, fine in C++, dicey in Python. But the DP array has structure: in the trace it reads `[0, 1, 1, 2, 2]` — contiguous bands of equal jump count. That's BFS by jump count, and the levels are *contiguous windows*: from index `i` the reachable set is the window `i+1` through `i+nums[i]`, and a union of windows whose left endpoints step by one can't have gaps. So each BFS level is just a right endpoint — I don't need a queue, I need two integers.
>
> `cur_end` is the right edge of the level I'm currently in — the farthest index reachable with `jumps` jumps. `farthest` is the best reach of the *next* level so far. I scan `i` from 0 to `n − 2` — excluding the last index, because I never jump *from* the destination. At each `i` I fold in `i + nums[i]`. When `i` hits `cur_end`, the level is exhausted: getting anywhere past it provably needs one more jump, so incrementing is forced *and* optimal — every index in the level costs the same, so only the frontier's extent matters, not which index achieved it. I set `cur_end = farthest` and can break early once it reaches `n − 1`.
>
> Termination is airtight because of the reachability guarantee: when a new level starts below the last index, some index in the current level must reach past `cur_end`, so the frontier strictly advances — no stalls even though zeros are allowed.
>
> One pass, O(n) time, O(1) space, and Ω(n) is unavoidable since every element must be read. Edge cases I've checked: `n = 1` returns 0 because the loop body never runs; zeros are fine as long as they sit inside a level; and the classic bug is looping to `n − 1` inclusive, which overcounts on the first example. If the reachability guarantee were dropped, I'd add a stuck check — if `i` passes `cur_end` without the frontier advancing, return −1. That's also exactly how this reduces to Jump Game I."

---

## 12. Say it in 60 seconds

> "This is BFS on indices in disguise — with no queue. Level 0 is index 0; from index `i` I can reach the contiguous window `i+1` through `i+nums[i]`, and since those windows' left edges step by one, every BFS level is a contiguous window described by a single right endpoint. So I keep two integers: `cur_end`, the right edge of my current level, and `farthest`, the best reach of the next level. One left-to-right scan up to `n − 2` — never jumping *from* the last index. Each step: `farthest = max(farthest, i + nums[i])`. When `i` reaches `cur_end`, the level is exhausted, so one more jump is forced and optimal — increment `jumps`, promote `cur_end` to `farthest`, and break early once `cur_end` hits the last index. The reachability guarantee means the frontier always advances, so zeros can't stall it. O(n) time, O(1) space. Edge cases: `n = 1` returns 0, zeros inside a level are harmless, and the classic bug is scanning to `n − 1` inclusive, which overcounts — I test that on `[2,3,1,1,4]`."
