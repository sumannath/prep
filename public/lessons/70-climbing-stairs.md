# Climbing Stairs — Complete Interview Lesson

**LeetCode 70 · Easy · Tags: Dynamic Programming, Math, Fibonacci**

This problem looks trivial — and it is, once you see it. That's exactly why interviewers use it: it's not testing whether you *find* the answer, it's testing whether you can **narrate the reasoning ladder** (recursion → overlapping subproblems → memoization → tabulation → O(1) space) cleanly and verify edge cases out loud. Let's build that ladder properly.

---

## 1. Problem Restatement (Say It Back)

> Count the number of **ordered sequences** of 1s and 2s whose values sum to exactly `n`.

Three things to nail down when restating:

- **Order matters.** `1+2` and `2+1` are **distinct** ways. (Example 2 confirms this.) In combinatorics language: we're counting *compositions* of `n` into parts {1, 2}, not *partitions*.
- **We count, we don't optimize.** This is a *counting* DP, not a min/max DP. The question is "how many", never "best".
- **The state is the position.** "Where am I on the staircase" is the only thing the future depends on.

---

## 2. Decoding the Constraints

| Constraint | What it's telling you |
|---|---|
| `1 <= n <= 45` | The largest answer is `ways(45) = 1,836,311,903`, which fits in a signed 32-bit int (`max 2,147,483,647`). Note that `ways(46) = 2,971,215,073` **overflows** int32 — the cap of 45 is chosen *exactly one step before overflow*. This is a deliberate hint. |
| `n >= 1` | Smallest input is `n = 1` → answer `1`. Base-case bugs (returning `0` or crashing) get caught here. |
| `n <= 45` (again) | Naive exponential recursion makes roughly `φ⁴⁵ ≈ 2.5 × 10⁹` calls (justified in §3.3), so pure recursion **will** TLE in Python — you're expected to reach DP. |
| Values | Only `n` is the input; no arrays, no negatives, no duplicates to dedupe. The only "duplicates" in play are *duplicate subproblems* during recursion. |

**Index-vs-value discipline up front:** throughout this lesson, an index `i` means *"the stair you stand on after climbing `i` steps"* (the ground is stair `0`), and the *value* stored at that index is *"how many ordered 1/2-step sequences sum to `i`."* Mixing these two up is the #1 source of off-by-one bugs in this problem.

---

## 3. Brute Force: Enumerate Every Sequence

### 3.1 Idea and Code

From any position, you have two choices; recurse on "steps remaining" and count the paths that land exactly on 0:

```python
def climb_stairs_bruteforce(remaining: int) -> int:
    if remaining == 0:
        return 1        # exactly at the top: this complete sequence counts as 1 way
    if remaining < 0:
        return 0        # overshot the top: dead end, don't count
    return (climb_stairs_bruteforce(remaining - 1)
            + climb_stairs_bruteforce(remaining - 2))
```

### 3.2 Worked Trace (n = 4)

Full recursion tree. Each `✅` leaf is one complete valid sequence; each `❌` is an overshoot:

```text
ways(4)
├── take 1 → ways(3)
│   ├── take 1 → ways(2)
│   │   ├── take 1 → ways(1)
│   │   │   ├── take 1 → ways(0)   ✅  1+1+1+1
│   │   │   └── take 2 → ways(-1)  ❌
│   │   └── take 2 → ways(0)       ✅  1+1+2
│   └── take 2 → ways(1)
│       ├── take 1 → ways(0)       ✅  1+2+1
│       └── take 2 → ways(-1)      ❌
└── take 2 → ways(2)               ← second occurrence of ways(2)!
    ├── take 1 → ways(1)           ← third occurrence of ways(1)!
    │   ├── take 1 → ways(0)       ✅  2+1+1
    │   └── take 2 → ways(-1)      ❌
    └── take 2 → ways(0)           ✅  2+2
```

- **Leaves counted:** 5 → `ways(4) = 5` ✓ (matches Fibonacci pattern: 1, 1, 2, 3, 5).
- **Duplicate subproblems:** `ways(2)` is computed **2×**, `ways(1)` **3×**, `ways(0)` **5×**. The second `ways(2)` recomputes a subtree *identical* to the first — pure wasted work. Total calls for `n = 4`: 15.

### 3.3 Why It's Slow

The call count `C(n)` satisfies `C(n) = C(n−1) + C(n−2) + 1` — the *same* Fibonacci recurrence as the answer itself — so it grows like `φⁿ` with `φ ≈ 1.618` (a standard result: any sequence obeying this recurrence grows as a constant multiple of `φⁿ`). Concretely, `n = 45` costs ≈ **6 billion calls** — hopeless in Python, minutes even in C++. The fix is not a smarter tree; it's noticing the tree repeats itself.

---

## 4. The Core Insight

### 4.1 Last-Move Decomposition

Ask the DP question: **"To arrive at stair `n`, what was my final move?"**

- A `1`-step from stair `n−1`, or
- A `2`-step from stair `n−2`.

Every sequence to `n` falls into **exactly one** of these classes (they're disjoint — the last element differs), and together they cover all sequences (the last element is 1 or 2). So:

```text
ways(n) = ways(n−1) + ways(n−2)
```

This "look at the last move" framing is the single most reusable idea in counting DP.

### 4.2 Overlapping Subproblems + Simple Combination

- `ways(n)` needs `ways(n−1)` and `ways(n−2)`; *both* of those need `ways(n−3)`. Massive overlap → cache results.
- The answer for `n` depends only on the **previous two** values → we never need a full array → **O(1) space** is achievable.

### 4.3 The Fibonacci Connection

`ways(0)=1, ways(1)=1, ways(2)=2, ways(3)=3, ways(4)=5, ways(5)=8 …` — this is Fibonacci shifted by one: `ways(n) = Fib(n+1)` with standard 0-indexed `Fib(0)=0, Fib(1)=1`. Knowing this lets you sanity-check any output instantly and answers "what's `ways(45)`?" in your head (~1.84 billion).

### 4.4 Combinatorial Cross-Check (nice to mention)

If a sequence uses `k` two-steps, it uses `n − 2k` one-steps — `n − k` moves total — and the `k` twos can sit anywhere among them: `C(n−k, k)` arrangements. Summing over `k`:

```text
ways(n) = Σₖ C(n−k, k)     for k = 0 … ⌊n/2⌋
```

Check `n = 3`: `C(3,0) + C(2,1) = 1 + 2 = 3` ✓. Check `n = 4`: `1 + 3 + 1 = 5` ✓. (You'd rarely *code* this, but deriving it shows real command of the problem.)

---

## 5. Optimal Approach: The Three-Step Ladder

### Step A — Top-Down Memoization (recursion, but cache it)

```python
from functools import lru_cache

class Solution:
    def climbStairs(self, n: int) -> int:
        @lru_cache(maxsize=None)
        def ways(remaining: int) -> int:
            if remaining == 0:
                return 1                 # exactly at the top: one way (stop here)
            if remaining < 0:
                return 0                 # overshot: dead end
            return ways(remaining - 1) + ways(remaining - 2)
        return ways(n)
```

Each subproblem `ways(i)` is computed **once**; every repeat is an O(1) cache hit. Time O(n), space O(n) for the cache **plus** O(n) recursion stack — 45 frames is fine (Python's default limit is 1000), but this style dies around `n ≈ 1000`, so know the bottom-up variant.

### Step B — Bottom-Up Tabulation (no recursion)

`dp` is an array with **indices `0..n`** where **index `i` = stair reached after `i` steps** and **value `dp[i]` = number of ways to stand there**:

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        dp = [0] * (n + 1)
        dp[0] = 1                        # one way to have climbed 0 steps: the empty climb
        if n >= 1:
            dp[1] = 1
        for i in range(2, n + 1):        # fill left to right; i-2 >= 0 guaranteed here
            dp[i] = dp[i - 1] + dp[i - 2]
        return dp[n]
```

### Step C — Rolling Variables, O(1) Space (final solution)

`dp[i]` only ever reads `dp[i−1]` and `dp[i−2]`, so two variables suffice. **Track which `ways`-index each variable represents** as the loop advances:

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        # prev = ways(0) = 1, curr = ways(1) = 1
        prev, curr = 1, 1
        for _ in range(n - 1):           # after k iterations: curr = ways(k + 1)
            prev, curr = curr, prev + curr
        return curr                      # curr = ways(n)
```

Bookkeeping proof: seeds are `ways(0), ways(1)`; each iteration shifts the window right by one; after `n−1` iterations `curr = ways(n)`. Bonus: `n = 0` falls through and correctly returns `1` (the empty climb), and `n = 1` skips the loop and returns `1`.

### 5.4 Traces on the Official Examples

**`n = 2`** → expect `2`:

| Loop state | `prev` (= ways of) | `curr` (= ways of) |
|---|---|---|
| before loop | 1 → `ways(0)` | 1 → `ways(1)` |
| after iter 1 | 1 → `ways(1)` | **2** → `ways(2)` ✅ return |

**`n = 3`** → expect `3`:

| Loop state | `prev` | `curr` |
|---|---|---|
| before loop | 1 → `ways(0)` | 1 → `ways(1)` |
| after iter 1 | 1 → `ways(1)` | 2 → `ways(2)` |
| after iter 2 | 2 → `ways(2)` | **3** → `ways(3)` ✅ return |

Both match. `n = 1` returns `1` without entering the loop. Done.

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Naive recursion | O(2ⁿ) upper bound; tightly Θ(φⁿ), φ≈1.618 | O(n) stack | ≈6×10⁹ calls at n=45 → TLE. Justification: the call-count recurrence `C(n)=C(n−1)+C(n−2)+1` grows as a Fibonacci-like sequence, i.e., like φⁿ. |
| Top-down memoized | O(n) | O(n) cache + O(n) stack | Clean, but Python recursion depth caps ~1000. |
| Bottom-up tabulation | O(n) | O(n) | Easiest to explain and debug. |
| **Rolling variables (final)** | **O(n)** | **O(1)** | Optimal for the given constraints. |
| Matrix power / fast doubling | O(log n) | O(1) | Overkill here; the answer for huge `n`. Justification: each of log₂n doubling steps does constant work on 2×2 matrices. |
| Binet's closed form | O(1) arithmetic | O(1) | ⚠️ Don't submit. Justification: doubles carry ~16 significant digits, and rounding error in `φⁿ/√5` exceeds 0.5 once the result reaches ~10¹⁵–10¹⁶, i.e., around `n ≈ 70+`. |

The main solution is **O(n) time, O(1) space** — you cannot beat O(n) in the general case because you must produce an exact integer answer whose size itself grows exponentially (any method reading the full output in unary would already be exponential; with machine-word arithmetic, fast doubling genuinely achieves O(log n), stated and justified above).

---

## 7. Language Gotchas (Python / Java / C++)

| Language | Gotcha | Detail |
|---|---|---|
| **Python** | `@lru_cache` on a *method* | The cache key includes `self`, lives at class level, and pins every instance in memory (a leak). Decorate a **nested function** instead, as in Step A. |
| **Python** | Recursion limit | Default limit ≈ 1000 frames; top-down breaks around `n ≈ 1000`. Prefer bottom-up unless `n` is small. |
| **Java** | int overflow | `ways(45) = 1,836,311,903` fits `int` (max 2,147,483,647) with ~14% headroom; `ways(46) = 2,971,215,073` does not. Use `long` the moment constraints grow — say this out loud; it shows you read the constraint as a design hint. |
| **Java** | Rolling swap | No tuple unpacking: use `int next = a + b; a = b; b = next;`. Getting the update order wrong silently shifts the whole sequence. Also, `HashMap<Integer,Integer>` memo autoboxes every call — an `int[]` memo is faster. |
| **C++** | Types & memo passing | `int` is fine for `n ≤ 45`; use `long long` defensively. If memoizing top-down, pass `std::vector<int>&` **by reference** — passing by value silently destroys the memoization. |

---

## 8. Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Base case `ways(0) = 0` | `ways(2)` computes to `1`; every answer shifts down | `ways(0) = 1` — "the empty climb" is one way. Say this convention out loud. |
| Treating order as irrelevant | `n = 3` returns 2 (multisets `{1,1,1}`, `{1,2}`) | Order matters → the *sum* recurrence; unordered counting needs the Coin-Change-II loop order instead. |
| Off-by-one loop count | `n = 2` returns 1 or 3 | Seed `ways(0), ways(1)` and loop `n−1` times (or seed `ways(1), ways(2)` and loop `n−2` — pick one and *immediately test n=1,2,3*). |
| Submitting naive recursion | TLE at large `n` | Memoize or go bottom-up; mention the ladder proactively. |
| Confusing "count ways" with "min moves" | You compute `⌈n/2⌉` | Different question entirely; restate the ask if unsure. |
| Ignoring the constraint's overflow hint | Java/C++ works for `n≤45`, breaks if interviewer extends to `n=80` | Flag the int32 boundary before coding. |

---

## 9. Test Cases to Propose Out Loud

State these *before or right after* coding — it signals engineering maturity:

| # | Input | Expected | Why it's chosen |
|---|---|---|---|
| 1 | `n = 2` | `2` | Official example 1. |
| 2 | `n = 3` | `3` | Official example 2; confirms order matters (`1+2` ≠ `2+1`). |
| 3 | `n = 1` | `1` | Minimum input; instantly catches base-case bugs (`ways(0)=0` style). |
| 4 | `n = 45` | `1836311903` | Maximum input; verifies no overflow in typed languages and no TLE from naive recursion. |
| 5 | `n = 5` | `8` | Confirms the Fibonacci pattern `1,1,2,3,5,8` while tracing. |

Edge cases to voice explicitly: **smallest `n = 1`**, **largest `n = 45` (int32 boundary)**, and (if the interviewer extends the domain) **`n = 0 → 1`** under the empty-climb convention.

---

## 10. Follow-Up Extensions (Be Ready)

- **"What if steps of size 1..k are allowed?"** → `ways(i) = Σ_{s=1..k} ways(i−s)`. This is **LC 377 Combination Sum IV** (ordered). Note the contrast: **LC 518 Coin Change II** counts *unordered* combinations, which is why it loops coins in the *outer* loop — a one-line explanation of loop order that interviewers love.
- **"Each step has a cost / some stairs are broken."** → Same states, different combine: **LC 746 Min Cost Climbing Stairs** takes `min` instead of sum; broken stairs just force `dp[i] = 0` (the **LC 91 Decode Ways** flavor).
- **"Do it for `n = 10¹⁸` modulo 10⁹+7."** → Fast doubling / matrix exponentiation in O(log n) — justified by halving the exponent with constant-size 2×2 matrix multiplies each step.
- **"Can you beat O(n)?"** → At `n ≤ 45`, no meaningful win exists; O(log n) exists mathematically (see above) but constant factors dominate. Saying *that*, with the trade-off, is the strong answer.

---

## 11. Transferable Patterns & Related Problems

**Patterns this problem teaches:**

1. **Last-move decomposition** — "To stand on `i`, where could I have just come from?" The universal opener for counting/optimization DP.
2. **The optimization ladder** — recursion → memoization → tabulation → rolling variables → matrix power. Narrating this ladder is worth as much as the code.
3. **Rolling window space reduction** — whenever `dp[i]` depends on a fixed-size suffix of previous states, drop the array to O(1).
4. **Ordered vs unordered counting** — determines your recurrence and loop order (Compositions vs. Partitions; Combination Sum IV vs. Coin Change II).
5. **Recognizing famous recurrences** — Fibonacci appearing in disguise is both a shortcut and a built-in sanity check.

**Related problems, in rough study order:**

| Problem | Relationship |
|---|---|
| LC 509 — Fibonacci Number | The recurrence itself, verbatim. |
| LC 746 — Min Cost Climbing Stairs | Same states; `min` instead of count. |
| LC 1137 — N-th Tribonacci | Three-step generalization of the same ladder. |
| LC 198 / 213 — House Robber (I/II) | 1-D DP with an adjacency constraint; same rolling-variable trick. |
| LC 91 — Decode Ways | Counting DP where *validity* complicates base cases — where most people's Climbing-Stairs habits break. |
| LC 377 — Combination Sum IV | Stairs with an arbitrary step set, ordered. |
| LC 518 — Coin Change II | The *unordered* counterpart; loop-order lesson. |
| LC 62 / 63 — Unique Paths (I/II) | The 2-D grid analog of the same decomposition. |

---

## 12. Full Interview Talk Track

> "Let me restate: I'm counting the number of **ordered sequences** of 1s and 2s summing to `n` — `1+2` and `2+1` count separately.
>
> Before coding, let me get data. For `n = 4` the ways are `1111, 112, 121, 211, 22` — five. And `n=1→1, n=2→2, n=3→3, n=4→5, n=5→8` — that's Fibonacci, shifted by one. Good sign.
>
> The structural reason: ask *what was the last move into stair `n`?* Either a 1-step from `n−1` or a 2-step from `n−2`. Those cases are disjoint and exhaustive, so `ways(n) = ways(n−1) + ways(n−2)`, with `ways(0) = 1` — the empty climb counts as one way — and `ways(1) = 1`.
>
> Plain recursion on that recurrence recomputes the same subproblems; the call count itself grows like Fibonacci, so at `n = 45` it's billions of calls — TLE. Standard fix: memoize, or go bottom-up. Since each state only reads the previous two, I don't even need the array — two rolling variables suffice: seed `ways(0) = ways(1) = 1`, advance `n − 1` times, return the second value.
>
> Verify: `n = 2` → 2 ✓, `n = 3` → 3 ✓, `n = 1` → 1 ✓ without entering the loop. O(n) time, O(1) space. One note on constraints: `ways(45) = Fib(46) ≈ 1.84 billion` still fits in a 32-bit int, but `n = 46` would overflow — the bound of 45 is exactly the last safe value, so in Java or C++ I'd flag `long` if the constraint ever grows."

---

## 13. Say It in 60 Seconds

> "Climbing Stairs is counting DP in disguise. My state is *number of ways to stand on step i*. Every path into step `n` arrives either by a 1-step from `n−1` or a 2-step from `n−2` — disjoint and exhaustive — so `ways(n) = ways(n−1) + ways(n−2)`. Bases: `ways(0) = 1`, the empty climb, and `ways(1) = 1`. That's exactly Fibonacci shifted by one. Naive recursion recomputes overlapping subproblems — the call count itself grows like 1.618-to-the-n, billions of calls at `n = 45` — so I go bottom-up: keep just two rolling values, advance `n − 1` times, return the second. O(n) time, O(1) space. Sanity checks: `n = 1 → 1`, `n = 2 → 2`, `n = 3 → 3`. And the constraint of 45 is deliberate: `ways(45)` is about 1.84 billion, the last Fibonacci that fits in a 32-bit int — if constraints grew, I'd switch to `long` or matrix exponentiation for O(log n)."

*(~55 seconds at interview pace. Lead with the recurrence, close with the complexity — that's the skeleton interviewers grade.)*
