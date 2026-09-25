# Counting Bits (LeetCode 338) — Complete Lesson

## 1. Problem restatement & clarifying questions

**Restated in plain English:** For every integer `i` from `0` through `n` inclusive, compute how many `1` bits appear in `i`'s binary representation, and return all of those counts in one array `ans` where `ans[i]` is the count for `i`.

**Key precision point (index vs. value):** In this problem the *array index* and the *number being analyzed* are the same integer. `ans[i]` answers the question "how many set bits does the integer `i` have?" The stored value is always a small count — for `n ≤ 10^5`, every answer is between `0` and `17` (since `10^5 < 2^17 = 131072`, no number has more than 17 bits).

**Clarifying questions worth saying out loud:**

- "Is `n` guaranteed non-negative?" → Yes, `0 ≤ n ≤ 10^5`.
- "Output length is `n + 1`, indices `0..n` inclusive?" → Yes; off-by-one here is the #1 bug.
- "Are built-in popcount helpers banned?" → Yes, and that includes sneaky ones like `bin(i).count('1')` in Python or `Integer.bitCount` / `__builtin_popcount` — they violate the spirit of the exercise.
- "Must I return the array, so O(n) output space is unavoidable?" → Yes; the output itself is `n + 1` cells.

## 2. Decoding the constraints

| Constraint | What it tells us |
|---|---|
| `0 ≤ n ≤ 10^5` | Output has up to `100,001` entries — trivially fits in memory. Also means an O(n log n) solution is ~`10^5 × 17 ≈ 1.7M` operations and *would* pass, but the follow-up asks for better. |
| `n` can be `0` | Must return `[0]`. Any loop from `1` to `n` simply doesn't execute — make sure your base case survives. |
| Counts fit in a byte | Max popcount is 17, so no overflow concerns anywhere. |
| Output required | Any correct solution must write `n + 1` output cells, so Ω(n) time is forced by output size alone — which is exactly what the follow-up solution achieves. |

## 3. Baseline: brute force, O(n log n)

For each `i`, count bits by repeatedly reading the lowest bit and shifting right.

```python
def countBits_bruteforce(n: int) -> list[int]:
    ans = [0] * (n + 1)
    for i in range(n + 1):
        x = i                      # copy! never clobber the loop variable
        while x:
            ans[i] += x & 1        # read lowest bit
            x >>= 1                # drop it
    return ans
```

### Worked trace (n = 5)

| `i` | binary | inner-loop steps (`x` values visited) | bits read | `ans[i]` |
|---|---|---|---|---|
| 0 | `0` | skipped (`x = 0`) | — | **0** |
| 1 | `1` | 1 → 0 | 1 | **1** |
| 2 | `10` | 2 → 1 → 0 | 0, 1 | **1** |
| 3 | `11` | 3 → 1 → 0 | 1, 1 | **2** |
| 4 | `100` | 4 → 2 → 1 → 0 | 0, 0, 1 | **1** |
| 5 | `101` | 5 → 2 → 1 → 0 | 1, 0, 1 | **2** |

Output: `[0,1,1,2,1,2]` ✓ (11 inner-loop iterations total here).

**Complexity:** O(n log n) time — each `i ≤ n` has at most `⌊log₂ n⌋ + 1` bits, so the inner loop is O(log n) per number. O(1) extra space. A slicker per-number variant is Kernighan's trick (`while x: x &= x - 1` clears the lowest set bit each pass), but it still does `popcount(i)` iterations per number — Θ(n log n) total, because among the `2^k` integers below `2^k`, each of the `k` bit positions is set in exactly half of them.

**Interview strategy:** State this baseline in one breath, note that it's O(n log n), then immediately pivot — the interviewer is signaling that the DP insight is the real question.

## 4. The core insight

### 4.1 The table is self-similar in binary blocks

Write the answers out and look at the blocks between powers of two:

```
i:     0    1 | 2    3 | 4    5    6    7 | 8    9   10   11   12   13   14   15
ans:   0    1 | 1    2 | 1    2    2    3 | 1    2    2    3    2    3    3    4
       [0]  [1]   [2   3]        [4 … 7]              [8 … 15]
```

Each block `[2^k, 2^(k+1))` is exactly the block `[0, 2^k)` with **1 added to every entry**, because `i = 2^k + j` keeps all of `j`'s bits and appends one new leading `1`.

### 4.2 Formalize as a recurrence

That block picture is the **most-significant-bit recurrence**:

> `popcount(i) = popcount(i − 2^m) + 1`, where `2^m` is the highest power of two ≤ `i`.

But there's an even cleaner one. `i >> 1` is just `i` with its *last* bit removed, so:

> **`popcount(i) = popcount(i >> 1) + (i & 1)`** — strip the last bit, look up the smaller number, add back that last bit (0 or 1).

Both recurrences reference a **strictly smaller index** (`i >> 1 < i` for `i ≥ 1`, and `i − 2^m < i`), so filling `ans` left-to-right with base case `ans[0] = 0` is a valid single-pass bottom-up DP. A third equivalent: `popcount(i) = popcount(i & (i−1)) + 1`, since `i & (i−1)` deletes the lowest set bit.

## 5. Optimal approach: O(n) single-pass DP

### 5.1 Primary solution (least-significant-bit recurrence)

```python
from typing import List

class Solution:
    def countBits(self, n: int) -> List[int]:
        ans = [0] * (n + 1)              # ans[i] = popcount(i); base ans[0] = 0 for free
        for i in range(1, n + 1):        # n + 1: i must reach n inclusive
            ans[i] = ans[i >> 1] + (i & 1)
        return ans
```

- `n = 0` → `range(1, 1)` is empty → returns `[0]`. Correct with no special case.
- Each index is written once and reads only an already-written index (`i >> 1 ≤ i/2 < i`), so it is genuinely **single pass**. Iterating *descending* would read uninitialized zeros — order matters.
- Time O(n) (one O(1) bit-expression per index), auxiliary space O(1) beyond the required output.

### 5.2 Trace on the official examples

**Example 1: n = 2**

| `i` | binary | `i >> 1` | `ans[i >> 1]` | `i & 1` | `ans[i]` |
|---|---|---|---|---|---|
| 0 | `0` | — | — | — | **0** (base) |
| 1 | `1` | 0 | 0 | 1 | **1** |
| 2 | `10` | 1 | 1 | 0 | **1** |

→ `[0,1,1]` ✓

**Example 2: n = 5**

| `i` | binary | `i >> 1` | `ans[i >> 1]` | `i & 1` | `ans[i]` |
|---|---|---|---|---|---|
| 0 | `0` | — | — | — | **0** (base) |
| 1 | `1` | 0 | 0 | 1 | **1** |
| 2 | `10` | 1 | 1 | 0 | **1** |
| 3 | `11` | 1 | 1 | 1 | **2** |
| 4 | `100` | 2 | 1 | 0 | **1** |
| 5 | `101` | 2 | 1 | 1 | **2** |

→ `[0,1,1,2,1,2]` ✓

### 5.3 Two alternative recurrences (all also O(n), single pass)

```python
# Variant A — peel the lowest set bit (Kernighan-style DP):
for i in range(1, n + 1):
    ans[i] = ans[i & (i - 1)] + 1
# n=5 check: i=3 -> 3&2=2 -> ans[2]+1=2;  i=5 -> 5&4=4 -> ans[4]+1=2  ✓

# Variant B — most significant block:
ans, high_bit = [0] * (n + 1), 1
for i in range(1, n + 1):
    if i & (i - 1) == 0:         # i is a power of two → a new block starts
        high_bit = i
    ans[i] = ans[i - high_bit] + 1
```

Variant B doubles as a great demonstration of the power-of-two test `i & (i - 1) == 0`; note the update `high_bit = i` must happen **before** computing `ans[i]`, or every answer after `2^k` will be inflated.

## 6. Complexity summary

| Approach | Time | Extra space (beyond output) | Notes |
|---|---|---|---|
| Per-number bit scan | O(n log n) | O(1) | inner loop runs once per bit of `i` |
| Per-number Kernighan (`x &= x-1`) | Θ(n log n) | O(1) | one iteration per *set* bit of `i` |
| **DP, `ans[i] = ans[i>>1] + (i&1)`** | **O(n)** | **O(1)** | single pass, cleanest |
| DP, `ans[i] = ans[i&(i-1)] + 1` | O(n) | O(1) | equivalent |
| DP, highest-set-bit block form | O(n) | O(1) | best matches the "blocks" picture |

All output-space is O(n) by necessity: the answer itself has `n + 1` entries, so O(n) total space is a floor for any correct solution.

## 7. Common mistakes & gotchas

1. **Off-by-one:** array must be length `n + 1` and the loop must be `range(1, n + 1)` (or `range(n + 1)` for brute force). `range(n)` drops the last entry.
2. **Clobbering the loop variable** in brute force (`while i: … i >>= 1` destroys `i`). Use a temp `x`.
3. **MSB-variant ordering bug:** forgetting to reset `high_bit` when `i` is a power of two (or resetting it after the lookup) makes `ans[4]` come out as `3` instead of `1`. Every power-of-two boundary breaks afterward.
4. **Assuming monotonicity:** the array is *not* sorted — `ans[3]=2` then `ans[4]=1`. Values also repeat constantly (`ans[1]=ans[2]=1`); that's expected, not a bug. Don't reach for two-pointer/binary-search style reasoning.
5. **"Cheating" builtins:** `bin(i).count('1')`, `i.bit_count()`, `Integer.bitCount`, `__builtin_popcount` — all against the rules here, even though they work.
6. **Wrong iteration order:** descending loops read entries that don't exist yet; the DP direction must match the dependency direction (each `i` depends on a *smaller* index).
7. **Missing `n = 0`:** should return `[0]`; verify your base case survives an empty loop.

### Java / C++ quick notes

| Language | Gotcha |
|---|---|
| Java | `int[] ans = new int[n + 1];` is auto-zeroed, so the base case is free — but remember the loop bound `i <= n`. `Integer.bitCount(i)` is banned by the problem. Avoid `ArrayList<Integer>` (autoboxing churn at n = 10^5); a primitive `int[]` is the right call. |
| C++ | `std::vector<int> ans(n + 1);` value-initializes to 0 — safe base case. `__builtin_popcount` is banned. `i` is non-negative here so signed shifts are fine, but as a habit prefer `1u` / `1LL` when shifting, since `1 << 31` on a signed `int` is UB (not triggerable at n ≤ 10^5, but the habit pays off elsewhere). |

## 8. Test cases to propose out loud

Before or right after coding, announce these:

| Input | Expected output | What it checks |
|---|---|---|
| `n = 2` (official) | `[0,1,1]` | basic correctness |
| `n = 5` (official) | `[0,1,1,2,1,2]` | mixed patterns |
| `n = 0` | `[0]` | empty-loop / base-case edge |
| `n = 1` | `[0,1]` | smallest non-trivial |
| `n = 7` | `[0,1,1,2,1,2,2,3]` | last index of a full block `[4..7]` |
| `n = 8` | `[0,1,1,2,1,2,2,3,1]` | **first index of a new block** — the classic killer for the MSB variant (`ans[8]` must be `1`, not `4`) |
| `n = 100000` | (spot-check a few) | performance: confirms O(n), no recursion overhead |

**Optional cross-check harness** (great to mention, not always to code):

```python
def brute(n: int) -> list[int]:
    out = []
    for i in range(n + 1):
        c, x = 0, i
        while x:
            c += x & 1
            x >>= 1
        out.append(c)
    return out

def fast(n: int) -> list[int]:
    ans = [0] * (n + 1)
    for i in range(1, n + 1):
        ans[i] = ans[i >> 1] + (i & 1)
    return ans

for n in range(1000):
    assert brute(n) == fast(n), n
print("all consistent")
```

## 9. Transferable patterns & related problems

**Patterns to bank:**

- **DP over a smaller index defined by a bit operation** — when a
