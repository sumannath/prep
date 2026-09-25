# Number of 1 Bits — Complete Interview Lesson

## 1. Problem Restatement

Given a **positive** 32-bit integer `n`, return how many of its binary digits are `1` (the *population count*, *popcount*, or *Hamming weight*).

- Input: a single positive integer `n` where `1 <= n <= 2^31 - 1`.
- Output: an integer count of set bits.

Example: `n = 11` is `1011₂`, which has three `1`s, so the answer is `3`.

This is a counting problem, not a search problem — there's no array, no indices into a container, no duplicates to worry about. The "data" is the bit pattern of one integer, and the indices are bit positions `0..30` (bit `31` is always `0` because `n <= 2^31 - 1`).

## 2. Decoding the Constraints

| Constraint | Meaning | Implication |
|---|---|---|
| `1 <= n` | No zero, no negatives | You never have to handle `n = 0` (answer would be `0`) or negative-number sign-bit weirdness |
| `n <= 2^31 - 1` | Fits in a signed 32-bit int | At most 31 bits to examine; the answer is at most `31` |
| Follow-up: "called many times" | Repeated calls with possibly repeated arguments | Hints at memoization / lookup tables / O(1) per-query preprocessing |

The input is bounded and tiny — the real interview question isn't *can you solve it*, it's *how many progressively better ways do you know*, and *do you know the classic bit tricks*. Expect the interviewer to push you from a naive loop → `n & (n-1)` → lookup table → possibly one-instruction-level parallel counting (SWAR).

## 3. Brute Force: Check Every Bit

Loop through all 31 (or 32) bit positions, mask off one bit at a time, and count.

```python
def hamming_weight(n: int) -> int:
    count = 0
    for i in range(32):          # 32 = width of the integer
        if (n >> i) & 1:
            count += 1
    return count
```

Equivalent formulation that shifts `n` itself:

```python
def hamming_weight(n: int) -> int:
    count = 0
    while n:                     # works, but always loops once per bit
        count += n & 1
        n >>= 1
    return count
```

### Worked trace: `n = 11` (`1011₂`)

| Iteration | `n` (binary) | `n & 1` | `count` | `n >>= 1` |
|---|---|---|---|---|
| 1 | `1011` | `1` | 1 | `101` |
| 2 | `101` | `1` | 2 | `10` |
| 3 | `10` | `0` | 2 | `1` |
| 4 | `1` | `1` | 3 | `0` → loop ends |

Answer: **3** ✓

### Worked trace: `n = 128` (`10000000₂`)

| Iteration | `n` | `n & 1` | `count` |
|---|---|---|---|
| 1 | `10000000` | `0` | 0 |
| 2 | `1000000` | `0` | 0 |
| ... | (five more zero bits) | `0` | 0 |
| 8 | `1` | `1` | 1 |

Answer: **1** ✓ — note it takes **8 iterations even though there is only one set bit**. That inefficiency is the motivation for the optimal approach.

**Complexity:** O(k) time where k is the bit-width (31 here), O(1) space. The loop count depends on the *position of the highest bit*, not on the number of ones.

## 4. Core Insight

`n & (n - 1)` **clears the lowest set bit** of `n`, and nothing else.

Why? Consider `n` in binary. Subtracting 1 from `n`:

- Flips the lowest set bit from `1` to `0`.
- Flips **every zero bit below it** from `0` to `1`.
- Leaves every bit **above** it untouched.

So `n` and `n - 1` agree on all bits above the lowest set bit; below and including it, `n` looks like `...1 000...` and `n-1` looks like `...0 111...`. AND-ing them zeroes out that entire suffix, erasing exactly one `1`.

**Example:** `n = 12` (`1100₂`), `n - 1 = 11` (`1011₂`):

```
  1100
& 1011
------
  1000   ← lowest set bit removed
```

**Consequence:** instead of iterating once per bit *position*, we iterate once per **set bit**. `n & (n-1)` also gives us the standard loop-termination condition: the loop ends when `n == 0`, i.e., all bits consumed. (Aside: the parity variant of this — XOR of `n` and `n-1` — tells you the parity of the number of set bits, which is why this trick shows up in *Number of 1 Bits' sibling problem, "Counting Bits,"* too.)

## 5. Optimal Approach: Brian Kernighan's Algorithm

```python
def hamming_weight(n: int) -> int:
    count = 0
    while n:
        n &= n - 1      # drop the lowest set bit
        count += 1
    return count
```

### Trace: `n = 11` (`1011₂`)

| Iteration | `n` before | `n - 1` | `n & (n-1)` | `count` |
|---|---|---|---|---|
| 1 | `1011` | `1010` | `1010` | 1 |
| 2 | `1010` | `1001` | `1000` | 2 |
| 3 | `1000` | `0111` | `0000` | 3 |

`n` is now `0`, loop ends. Answer: **3** ✓ — 3 iterations for 3 set bits.

### Trace: `n = 128` (`10000000₂`)

| Iteration | `n` before | `n - 1` | `n & (n-1)` | `count` |
|---|---|---|---|---|
| 1 | `10000000` | `01111111` | `00000000` | 1 |

Loop ends immediately. Answer: **1** ✓ — **1 iteration instead of 8**. This is the whole point: work is proportional to the number of set bits, not the width.

### Trace: `n = 2147483645` (`1111111111111111111111111111101₂`)

Thirty set bits → thirty iterations, each knocking out one `1`. Answer: **30** ✓. Worst case here (`n = 2^31 - 1`, all 31 bits set) is 31 iterations — same asymptotic count as brute force but never worse, and often much better.

**Complexity:** O(s) time where s = number of set bits (≤ 31), O(1) space.

**Bonus Python note:** Python 3.10+ has the built-in `n.bit_count()` (and `bin(n).count('1')` works on any version). Mention it to your interviewer, but *implement the algorithm yourself first* — that's what's being tested.

### Even fancier: parallel bit counting (SWAR / "divide and conquer" popcount)

Mention this only if the interviewer wants O(number-of-bits-of-width) time with **no loop at all** — it's how hardware/library popcounts work. The idea: sum bits in parallel by treating the word as a vector and halving the "vector width" each step.

```python
def hamming_weight(n: int) -> int:
    # 32-bit SWAR popcount
    n = n - ((n >> 1) & 0x55555555)                 # pairs: 2-bit sums
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)  # nibbles: 4-bit sums
    n = (n + (n >> 4)) & 0x0F0F0F0F                 # bytes: 8-bit sums
    return (n * 0x01010101) >> 24                   # sum all 4 bytes
```

This is O(1) with a fixed ~10 operations regardless of input. It's a great "do you know how this is actually done in hardware/libraries" flourish, but Kernighan's method is the expected answer.

## 6. Follow-Up: Called Many Times

If the function is invoked millions of times, amortize work across calls:

1. **Memoize / cache results.** In an interview, wrap the function with a dict keyed by `n`. Python's `functools.lru_cache` is the one-liner version. Since the same `n` values tend to recur, the cache hit rate is usually high.

2. **Precompute a lookup table for byte-sized chunks.** There are only `2^8 = 256` possible bytes, so precompute `popcount[b]` for all 256 bytes once, then answer any 32-bit query with **4 table lookups**:

```python
POP = [bin(i).count('1') for i in range(256)]  # built once, O(256) precompute

def hamming_weight(n: int) -> int:
    return (POP[n & 0xFF]
          + POP[(n >> 8) & 0xFF]
          + POP[(n >> 16) & 0xFF]
          + POP[(n >> 24) & 0xFF])
```

   Per-call cost: 4 lookups + shifts/masks — effectively O(1). Space: 256 entries (trivial). You could go to 16-bit chunks (`2^16 = 65,536` entries, 2 lookups) if calls vastly outnumber distinct values and memory is cheap; the trade-off is a larger precompute and cache footprint.

3. **Mention the one-liner:** Java has `Integer.bitCount(n)`, C++ has `__builtin_popcount(n)` (or `std::popcount` since C++20), Python 3.10+ has `int.bit_count()`. In real production code, use the intrinsic — compilers typically lower these to a single `POPCNT` machine instruction when the target CPU supports it.

Justifying the "can't do better" flavor of the follow-up: any method that examines individual bits must do at least O(s) work in the worst case, so table lookups / intrinsic instructions are the practical floor; precomputation trades O(2^b) space for O(width/b) per-query time, which is the standard time–space trade.

## 7. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| Check every bit (shift + mask) | O(k), k = bit width (≤ 31) | O(1) | Simplest; loops once per bit position |
| Brian Kernighan (`n &= n-1`) | O(s), s = set bits (≤ 31) | O(1) | Expected optimal interview answer |
| SWAR parallel popcount | O(1) fixed ops | O(1) | No loop; constant ~10 ops; "hardware-style" flourish |
| Byte lookup table (follow-up) | O(1) per call (4 lookups) | O(2^8) precomputed | Best for many repeated calls |
| 16-bit lookup table | O(1) per call (2 lookups) | O(2^16) precomputed | Space/time trade-off variant |

## 8. Common Mistakes

| Mistake | Why it's wrong / how to avoid |
|---|---|
| Looping `while n > 0` with brute force and calling it optimal | It's correct but iterates per bit *position* (e.g., 31 iterations for `n = 2^30` which has 1 set bit). Know the Kernighan trick. |
| Shifting the wrong direction or masking wrong | `n & 1` tests bit 0; `n >> i & 1` tests bit `i`. In other languages, `1 << i` builds a mask — don't mix up `>>` (shift number) and `<<` (build mask). |
| Forgetting the loop is `while n:` (truthy), not `while n > 0:` | Both work here since `n` is positive, but in languages with negative integers, `while n != 0` vs `while n > 0` matters enormously (see Java/C++ gotchas below). |
| Off-by-one on bit width | `n <= 2^31 - 1` means bits 0..30 can be set; bit 31 (sign bit) is always 0. Counting 32 positions is harmless here but shows you've thought about the boundary. |
| Assuming the interviewer wants the built-in only | `n.bit_count()` is a fine closing remark, but the question is testing the bit trick. Say "in Python 3.10+ I'd just use `int.bit_count()`, but let me show you the algorithm." |
| Not handling the follow-up at all | "Called many times" is a scripted follow-up — have the 256-entry byte table ready to describe even if you don't code it. |

## 9. Language-Specific Gotchas (Java / C++)

| Language | Gotcha |
|---|---|
| **Java** | `>>` is the *arithmetic* shift: it sign-extends, so for negative numbers `while n > 0` never terminates on negative input and `n >>= 1` never reaches 0. Use the **unsigned** right shift `n >>>= 1` when shifting the number itself. Kernighan's `n &= n - 1` is safe for negatives, but this problem guarantees positivity. Also note `Integer.bitCount(n)` exists — fine to name, not to substitute for the explanation. |
| **C++** | `1 << 31` is undefined behavior for `int` (signed overflow); if you build masks, use `1u << i` or `uint32_t`. Shifting a negative signed value right is implementation-defined; prefer `uint32_t` for bit manipulation. `__builtin_popcount(n)` is GCC/Clang-specific; `std::popcount` (C++20, `<bit>`) requires an *unsigned* type. |
| **Python** | No real hazards — Python ints are arbitrary precision, so `n & (n-1)` is always safe and `n.bit_count()` / `bin(n).count('1')` are one-liners. Just remember `bit_count()` requires Python ≥ 3.10; `bin(n).count('1')` is the portable fallback. |

## 10. Test Cases to Propose Out Loud

Before coding, state these; after coding, walk the key ones:

1. **Official:** `n = 11` → `3` (`1011`).
2. **Official:** `n = 128` → `1` (`10000000`) — the case that exposes brute-force inefficiency.
3. **Official:** `n = 2147483645` → `30` (`1111111111111111111111111111101`) — dense pattern, near-max answer.
4. **Edge — smallest input:** `n = 1` → `1` (single set bit at position 0; loop must run exactly once under Kernighan).
5. **Edge — maximum input:** `n = 2^31 - 1 = 2147483647` → `31` (all 31 bits set; upper bound of the answer).
6. **Edge — power of two:** `n = 2^20 = 1048576` → `1` (sanity check: powers of two have exactly one set bit; equivalently `n & (n-1) == 0` is the standard is-power-of-two test — worth mentioning as a connected fact).

## 11. Transferable Patterns & Related Problems

**Patterns learned here:**

- **`n & (n - 1)` clears the lowest set bit** — the single most reusable bit trick. Direct uses: power-of-two check (`n & (n-1) == 0`), iterating set bits, Hamming distance.
- **Iterate over set bits, not over positions** — a general "pay only for what's present" idea.
- **Time–space trade via precomputation** — chunk the input (by byte/16-bit word) and memoize per-chunk results; applies to any problem where the domain is small per-chunk.
- **SWAR / divide-and-conquer on bits** — halving the problem width each step, summing in parallel.

**Related problems:**

| Problem | Connection |
|---|---|
| Counting Bits (LC 338) | Popcount for all `0..n`; classic DP: `bits[i] = bits[i >> 1] + (i & 1)` or `bits[i] = bits[i & (i-1)] + 1` |
| Hamming Distance (LC 461) | Popcount of `x ^ y` — XOR marks differing bits, then count them |
| Single Number (LC 136) / Single Number II (LC 137) | Bit manipulation on XOR / per-bit counting mod 3 |
| Power of Two (LC 231) | The `n & (n-1) == 0` corollary |
| Reverse Bits (LC 190) | Same "think in bit positions" muscle, different operation |

## 12. Say It in 60 Seconds

> "The brute force checks all 31 bit positions by shifting and masking — that's linear in the bit width. The key insight is that `n` AND `n` minus one clears exactly the lowest set bit of `n`, so I can loop with `n &= n - 1` and count one iteration per set bit, stopping when `n` hits zero. That's Brian Kernighan's algorithm: time proportional to the number of ones, constant space. For example, 128 has one set bit and finishes in one iteration instead of eight. For the follow-up — if this is called many times — I'd precompute a popcount lookup table over all 256 byte values and answer any 32-bit input with four lookups, which is effectively constant time per call with tiny memory. In real code I'd just call the built-in popcount, which compiles to a single machine instruction on modern CPUs — but I've shown the algorithm since that's what's being tested."
