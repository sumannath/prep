# Jump Game (LeetCode 55) — Complete Interview Lesson

**Difficulty:** Medium · **Pattern:** Greedy / reachability frontier · **Follow-ups:** Jump Game II–VII

---

## 1. Problem Restatement (and Reading It Precisely)

You start at **index 0**. The **value** `nums[i]` is the **maximum** jump length from index `i`, meaning from index `i` you may land on **any** index in `i+1, i+2, …, i+nums[i]` (forward only). Return `true` if you can ever land on index `n-1`, else `false`.

Three precision points candidates routinely fumble — get these right out loud:

- **Indices vs. values.** You move between *indices*; the *value* only tells you how far you may leap. A value of `3` at index `1` lets you reach indices 2, 3, or 4 — it does **not** mean "go to index 3."
- **"Maximum" means a choice, not a fixed jump.** The official example uses jumps of length 1 then 3 from `[2,3,1,1,4]` — lengths are flexible. A common wrong model is "you must jump exactly `nums[i]`."
- **Overshooting is irrelevant.** If some jump from `i` could carry you *past* the last index, a shorter jump lands exactly on it, so "reach or pass the end" ≡ "reach the end." (Worth saying aloud if the interviewer asks.)
- **Duplicates are a non-issue here.** Nothing keys off value identity — only position matters. (Contrast with Jump Game IV, where duplicate values *do* matter.)

Clarifying questions worth asking before coding:

1. "Jumps are forward-only, any length from 1 to `nums[i]`, correct?"
2. "Landing exactly on the last index — or is passing it also success?" (Equivalent here, but good to confirm.)
3. "`n = 1` means I'm already at the last index, so answer is `true` even if `nums[0] = 0`?" (Yes.)

---

## 2. Decoding the Constraints

| Constraint | What it implies for your solution |
|---|---|
| `n ≤ 10⁴` | O(n²) DP ≈ 5×10⁷ operations: fine in C++/Java, **risky in Python**. An O(n) greedy is the safe, intended-tier answer. |
| `nums[i] ≤ 10⁵` | A value can be **much larger than n** — a single jump can overshoot the whole array. Never use `i + nums[i]` as an array index without clamping to `n-1`, or you'll get an `IndexError` / out-of-bounds write. |
| `nums[i] ≥ 0` (zeros allowed) | Zeros are "stuck" cells. A zero is fatal **only** if the reachable frontier never gets past it. |
| Answer is a boolean | No counts, no path reconstruction — pure reachability. This is the hint that a greedy exists. |

---

## 3. Brute Force: DFS Over Every Jump Choice

From each index, try every legal landing spot. You win if any branch reaches the last index.

```python
def canJump(nums: list[int]) -> bool:
    n = len(nums)

    def dfs(i: int) -> bool:
        if i == n - 1:
            return True
        for step in range(1, nums[i] + 1):
            j = i + step
            if j < n and dfs(j):          # guard: never index past the end
                return True
        return False

    return dfs(0)
```

**Worked trace** on `nums = [3,2,1,0,4]` (n = 5, target index 4):

```text
dfs(0)  nums[0]=3 → try landing at 1, 2, 3
├─ dfs(1)  nums[1]=2 → try 2, 3
│  ├─ dfs(2)  nums[2]=1 → try 3
│  │  └─ dfs(3)  nums[3]=0 → no moves, not the last index → False
│  │  = False
│  └─ dfs(3) → False (recomputed!)
│  = False
├─ dfs(2) → False (recomputed again)
└─ dfs(3) → False (and again)
= False  ✓
```

On `[2,3,1,1,4]` it succeeds immediately down the "always jump 1" path: `dfs(0)→dfs(1)→dfs(2)→dfs(3)→dfs(4) = True`.

**Why it's exponential:** with `nums = [2,2,…,2]`, every position offers 2 choices and the number of distinct paths satisfies the Fibonacci recurrence, ≈ φⁿ with φ ≈ 1.618 — so path enumeration is exponential in `n`.

**Memoize it** (each state computed once):

```python
from functools import lru_cache

def canJump(nums: list[int]) -> bool:
    n = len(nums)
    last = n - 1

    @lru_cache(maxsize=None)
    def can_reach(i: int) -> bool:
        if i == last:
            return True
        if nums[i] == 0:
            return False
        far = min(i + nums[i], last)      # clamp — see constraint decoding
        return any(can_reach(j) for j in range(i + 1, far + 1))

    return can_reach(0)
```

- `n` states × O(n) transitions each ⇒ **O(n²) time, O(n) space** (≤ ~5×10⁷ steps at n = 10⁴ — C++/Java fine, Python TLE-prone).
- Bonus structuring trick: a right-to-left boolean DP `dp[i] = OR(dp[j] for j in i+1..i+nums[i])` gives the same O(n²).

| i | nums[i] | window checked | dp[i] |
|---|---|---|---|
| 4 | 4 | base case | True |
| 3 | 0 | — | False |
| 2 | 1 | dp[3]=F | False |
| 1 | 2 | dp[2]=F, dp[3]=F | False |
| 0 | 3 | dp[1]=F, dp[2]=F, dp[3]=F | False |

---

## 4. The Core Insight

**The set of reachable indices is always a contiguous prefix `[0, M]`.**

Why: if `k` is reachable via path `0 = p₀ < p₁ < … < p_t = k`, then between consecutive stops `p` and `p′`, every index in `p+1 … p′` is reachable *directly from `p`* (any length 1…`nums[p]` is allowed). Chaining that observation covers every index in `[0, k]`. So reachability has no "holes" — it's a frontier that only moves right.

Consequence: you don't need to track *which* indices are reachable — only **how far the frontier extends**. That collapses the O(n²) DP window ("OR over `i+1 … i+nums[i]`") into a single running maximum.

**Mental model:** `max_reach` is a wall. Each index you visit either pushes the wall right, or — if you arrive at an index beyond the wall — the wall was final, and everything from there on is unreachable.

---

## 5. Optimal Solution A: Forward Greedy (Max-Reach Frontier)

```python
def canJump(nums: list[int]) -> bool:
    max_reach = 0                          # farthest index known reachable
    for i, jump in enumerate(nums):
        if i > max_reach:                  # stranded: nothing before i reaches it
            return False
        max_reach = max(max_reach, i + jump)
    return True                            # loop finished ⇒ index n-1 was examined ⇒ reachable
```

Optional micro-optimization: after the update, `if max_reach >= len(nums) - 1: return True` to exit early on big jumps.

### Trace — Example 1: `nums = [2,3,1,1,4]`, n = 5, target index 4

| i | nums[i] | Check `i ≤ max_reach` | `i + nums[i]` | `max_reach` after |
|---|---|---|---|---|
| 0 | 2 | 0 ≤ 0 ✓ | 2 | 2 |
| 1 | 3 | 1 ≤ 2 ✓ | 4 | **4** (early exit could fire here) |
| 2 | 1 | 2 ≤ 4 ✓ | 3 | 4 |
| 3 | 1 | 3 ≤ 4 ✓ | 4 | 4 |
| 4 | 4 | 4 ≤ 4 ✓ | 8 | 8 → loop ends → **True** |

### Trace — Example 2: `nums = [3,2,1,0,4]`, n = 5, target index 4

| i | nums[i] | Check `i ≤ max_reach` | `i + nums[i]` | `max_reach` after |
|---|---|---|---|---|
| 0 | 3 | 0 ≤ 0 ✓ | 3 | 3 |
| 1 | 2 | 1 ≤ 3 ✓ | 3 | 3 |
| 2 | 1 | 2 ≤ 3 ✓ | 3 | 3 |
| 3 | 0 | 3 ≤ 3 ✓ | 3 | 3 ← the 0 can't extend the frontier |
| 4 | 4 | **4 > 3 ✗** | — | **return False** |

Every jump from indices 0–3 tops out at exactly index 3 — the frontier stalls at the zero, and index 4 is stranded.

### Why the greedy is correct (say this in ~3 sentences)

1. **If `i ≤ max_reach`:** index `i` is reachable (by the prefix lemma, everything in `[0, max_reach]` is), and processing `i` extends the frontier to `i + nums[i]`, making every new index reachable directly from `i`.
2. **If `i > max_reach`:** `max_reach = max_{j<i}(j + nums[j]) < i`, so *every* jump from *every* earlier index lands before `i`. Any path to index ≥ `i` must cross that boundary with a jump from some `j < i` — impossible. Return `False`.
3. **If the loop finishes:** index `n-1` passed the check, so it's reachable. ∎

---

## 6. Optimal Solution B: Backward Greedy (Shrinking Goal) — Equally Good, Worth Knowing

Walk from the right, keeping `goal` = the leftmost index from which the end is known reachable. If index `i` can reach the current goal, the end is reachable from `i` too — so the goal moves left to `i`.

```python
def canJump(nums: list[int]) -> bool:
    goal = len(nums) - 1
    for i in range(len(nums) - 2, -1, -1):
        if i + nums[i] >= goal:     # i can reach (or leap past) the goal
            goal = i
    return goal == 0
```

Trace on `[3,2,1,0,4]`: `goal=4`; i=3: 3+0=3 < 4; i=2: 2+1=3 < 4; i=1: 1+2=3 < 4; i=0: 0+3=3 < 4 → `goal` never moves → `False`. On `[2,3,1,1,4]`: `goal` ripples 4→3→2→1→0 → `True`. Correctness is the mirror image of the forward argument: a scanned index `i` fails exactly when *all* its landing spots (indices `i+1 … i+nums[i] < goal`) already failed.

---

## 7. Complexity Table

| Approach | Time | Space | Verdict at n = 10⁴ |
|---|---|---|---|
| Naive DFS (all paths) | Exponential — Fibonacci-many distinct paths on an all-2s array (≈ φⁿ, φ≈1.618) | O(n) stack | TLE |
| Memoized top-down DFS | O(n²) — n states × ≤ n transitions | O(n) | ~5×10⁷ ops: OK in C++/Java, TLE-prone in Python |
| Bottom-up DP (right→left) | O(n²) | O(n) | Same |
| Backward greedy (goal) | **O(n)** | **O(1)** | Optimal |
| Forward greedy (max_reach) | **O(n)** | **O(1)** | Optimal |

O(n) is asymptotically tight: any correct algorithm must read all `n` elements, because changing a single unread element from 0 to positive (with the rest arranged adversarially) flips the answer.

---

## 8. Common Mistakes

| # | Mistake | Why it breaks | Catching test |
|---|---|---|---|
| 1 | Updating `max_reach` **before** the `i > max_reach` check | After updating, `max_reach ≥ i + nums[i] ≥ i` always, so the check is dead code and `[3,2,1,0,4]` wrongly returns `True` | `[3,2,1,0,4]` |
| 2 | Using `i + nums[i]` as an array index (DP table / visited flags) without clamping | `nums[i]` up to 10⁵ vs `n` up to 10⁴ ⇒ guaranteed out-of-range | `[100000, 0, 0]` |
| 3 | `>` instead of `>=` in the early exit / final answer (`max_reach > n-1`) | Misses exact landing on the last index | `[1,0]` (answer `True`; `max_reach == 1 == n-1`) |
| 4 | Modeling jumps as *exact* length (`nums[i]`) instead of *up to* | Solves a different problem | `[2,1]` — wrong model must land on index 2 from 0 (impossible); reality: jump 1, then 1 |
| 5 | `if nums[i] == 0: return False` shortcut | A zero at the last index, or strictly inside the reachable frontier, is harmless | `[0]` → `True`; `[2,0,0]` → `True`; `[3,0,0,0]` → `True` |
| 6 | Backward greedy comparing `nums[i] >= goal` (forgot `i +`) | Goal never moves | `[2,3,1,1,4]` wrongly `False` |
| 7 | Recursion-based solutions in Python | n = 10⁴ > default recursion limit (1000) → `RecursionError` | all-1s array, n = 10⁴ |
| 8 | Sloppy index/value language while reasoning aloud | Signals confusion to the interviewer | — (say "at index 2, whose value is 1, I can move to index 3") |

---

## 9. Language Gotchas

**Python**
- `lru_cache` + recursion: depth can hit ~n = 10⁴ on an all-1s array → `sys.setrecursionlimit(10**4 + 10)` or go iterative (the greedy needs neither).
- Never materialize per-landing-index arrays sized by jump values.

**Java**
- `int` is safe here (`i + nums[i] ≤ 10⁴ + 10⁵`), but this pattern gets reused for variants with large jump values (e.g., LC 1871) where `i + nums[i]` **overflows `int`** — habitually write `Math.min(i + nums[i], n - 1)` or use `long`.
- If memoizing, prefer `byte[] memo` (0/1/2) or `Boolean[]` over `HashMap<Integer, Boolean>` — autoboxing 10⁴ entries is wasteful and `null` vs `false` is a classic bug source.

**C++**
- Make `max_reach` an `int`, **not** `size_t`/`unsigned`: mixed signed comparison with `i`, and any `goal - i` arithmetic in variants, invites unsigned wraparound.
- `std::max(max_reach, i + nums[i])` requires matching operand types — mixing `int` and `size_t` won't compile cleanly.

---

## 10. Test Cases to Propose Out Loud

Propose at least three of these **before coding** — interviewers explicitly score this.

| Input | Expected | What it validates |
|---|---|---|
| `[2,3,1,1,4]` | `True` | Official example 1 |
| `[3,2,1,0,4]` | `False` | Official example 2 — frontier stalls at a zero |
| `[0]` | `True` | n = 1: you *start* on the last index; value there is irrelevant |
| `[0,1]` | `False` | Stuck at index 0, which is *not* the last index |
| `[1,0]` | `True` | Exact-landing case — catches `>` vs `>=` bugs |
| `[2,0,0]` | `True` | Zero "island" leapable from before it |
| `[1,0,1]` | `False` | Zero island that *is* a wall |
| `[100000, 0, 0, …]` (n = 10⁴) | `True` | Oversized value: bounds handling + early exit |
| all 1s, n = 10⁴ | `True` | Perf: kills recursive/O(n²) solutions in Python |

---

## 11. Transferable Patterns & Related Problems

**Patterns to bank:**

1. **Farthest-reach frontier greedy** — a running extremum (`max_reach`) replaces an entire DP window whenever transitions are "OR / max over a contiguous range." This is the ladder DFS → memo → DP → greedy: monotone structure collapses O(n²) to O(n).
2. **Reachable set = contiguous interval** — for forward-only jumps with bounded range, reachability is a prefix; recognizing interval structure is the actual insight.
3. **Goal-shrinking backward greedy** — move a target leftward when a position can reach it; a great one-pass alternative when forward state feels awkward.
4. **Zeros as walls, not traps** — a zero only matters relative to the frontier around it.

**Related problems:**

| Problem | Connection |
|---|---|
| LC 45 Jump Game II | Same frontier greedy + track current window's end to count minimum jumps |
| LC 1306 Jump Game III | Moves to `i ± arr[i]` → BFS/DFS with a visited set |
| LC 1345 Jump Game IV | BFS over indices; duplicate values matter here → group indices by value |
| LC 1340 Jump Game V | DFS + memo with bounded backward jumps |
| LC 1696 Jump Game VI | DP + monotonic deque (max over last k dp values) |
| LC 1871 Jump Game VII | DP + prefix sums over a sliding reachable window |
| LC 134 Gas Station | Greedy reachability with running balance and restart |
| LC 1024 Video Stitching / LC 1326 Min Taps | "Extend farthest reach per unit" interval-cover greedy |

---

## 12. Fuller Talk Track (What to Say While Coding)

> "Restating: I'm at index 0, `nums[i]` is the *max* jump length, so from index `i` I can land on any of the next `nums[i]` indices, forward only. I need to know if the last index is reachable.
>
> Brute force is DFS trying every jump length. That's exponential — with all-2s the path count is Fibonacci-like. Memoizing makes it O(n²): n states, up to n transitions each. At n = 10⁴ that's fine in C++ but shaky in Python.
>
> Here's the key observation: reachable indices always form a contiguous prefix. If I can reach index k, I can reach everything before it, because from any stop I can take any shorter jump. So instead of tracking *which* indices are reachable, I only need *how far* the frontier goes.
>
> So: one pass, keep `max_reach`. For each index `i`: first check `i > max_reach` — if so, every jump from every earlier index tops out below `i`, so `i` is stranded → return `false`. Otherwise update `max_reach = max(max_reach, i + nums[i])`. If the loop completes, index `n-1` passed the check, so return `true`.
>
> Edge cases I'm covering: `n = 1` is always true even for `[0]`; `[0,1]` is false; interior zeros like `[2,0,0]` are true because the frontier leaps past them; and I clamp any use of `i + nums[i]` as an index since values can exceed `n`.
>
> O(n) time, O(1) space. There's also a symmetric backward version: walk from the right moving a `goal` pointer left whenever `i + nums[i]` can reach it; the answer is `goal == 0`."

---

## 13. Say It in 60 Seconds

> "I'm at index 0; `nums[i]` is the *max* jump length, so from `i` I can land anywhere in the next `nums[i]` slots, forward only — can I reach the last index?
>
> Brute force is DFS over every jump length — exponential, since an all-2s array has Fibonacci-many paths. Memoizing gives O(n²), risky at n = 10⁴.
>
> The insight: reachable indices always form a contiguous prefix — reaching `k` means reaching everything before it, since shorter jumps are always allowed. So one greedy pass: track `max_reach`, the farthest reachable index. Scan left to right: if `i > max_reach`, there's a gap nothing can cross — return false. Otherwise push `max_reach` to `max(max_reach, i + nums[i])`. If the loop finishes, the last index was covered — true.
>
> Correctness: `i ≤ max_reach` means some earlier reachable index reaches `i`, and `i` extends the frontier; `i > max_reach` means every earlier jump tops out below `i`.
>
> O(n) time, O(1) space, one pass. Edges: single element is always true — even `[0]`; zero at index 0 with more elements is false; interior zeros are fine if the frontier leaps past them. An equally good alternative: scan backward, moving a goal pointer left whenever `i + nums[i]` reaches it; answer is `goal == 0`."
