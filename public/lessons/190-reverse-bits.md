# Reverse Bits (LeetCode 190) — Complete Interview Lesson

---

## 1. Problem Restated (in your own words)

You're handed one 32-bit word `n` and must return its **mirror image**: the bit at position `i` (with value `2^i`) must end up at position `31 − i`. Bit 0 (the least significant bit, value 1) becomes bit 31 (the sign bit, value `2^31`), and vice versa.

Three things this problem is **not**, which candidates routinely conflate:

- **Not** digit reversal (LeetCode 7: reverse `123 → 321`). Here the "digits" are bits.
- **Not** bitwise complement (`~n` / `n ^ 0xFFFFFFFF` flips every bit *in place*; we must *move* bits).
- **Not** rotating (`rotl`/`rotr` wraps bits around cyclically; reversal mirrors positions).

A note on vocabulary precision: in this problem, the analog of "indices vs. values" from array problems is **bit position (index) vs. bit value (0 or 1)**. Every bug in this problem family is a position bug, not a value bug. There are no "duplicates" to worry about (the input is a single word, not a collection) — but the analogous discipline applies: each of the 32 positions is distinct state, and writing one position twice or skipping one is the classic failure mode.

---

## 2. Decoding the Constraints

| Constraint | What it actually tells you |
|---|---|
| "32 bits signed integer" | The width is **fixed at 32**. Bit `i` has place value `2^i`; bit 31 is the sign bit in two's complement. Fixed width is the whole reason this is O(1) — leading zeros are **data**, not padding to ignore. |
| `0 <= n` | The input's bit 31 is 0, so the input is a non-negative Python int. This matters: in Python, a negative `n >>= 1` never reaches 0 (`-1 >> 1 == -1`), so the classic variant needs an explicit `n &= 0xFFFFFFFF` mask first. |
| `n` is even | Input bit 0 = 0 ⟹ **output bit 31 = 0** ⟹ the output is also always a valid non-negative signed int (`0 ≤ answer ≤ 2^31 − 1`). This one constraint quietly deletes the entire signedness headache from the original problem. |
| `n <= 2^31 - 2` | Rules out `n = 2^31 − 1`. That value is odd, so this is **redundant** given "n is even" — noticing redundant constraints out loud is free interview points. |

Also worth saying: the phrase "signed integer" in the statement is a holdover from the original LeetCode 190, which allowed the full unsigned range (e.g., input `-3`, output `-1073741825` when reinterpreted). The stated constraints here make the problem strictly easier.

---

## 3. Brute Force: String Round-Trip (and why it bites)

The naive idea: convert to a binary string, reverse it, parse back.

```python
def reverseBits_string(n: int) -> int:
    return int(format(n, "032b")[::-1], 2)   # '032b' = zero-pad to exactly 32 chars
```

**Worked trace — and the trap.** The un-padded version is the #1 brute-force bug:

```python
int(bin(n)[2:][::-1], 2)   # BUG: bin() drops leading zeros
```

- For `n = 2`: `bin(2)[2:]` is `"10"` → reversed `"01"` → `int("01", 2) = 1`. The **correct** answer is `2^30 = 1073741824`, because the 30 leading zeros of the input become trailing zeros of the output — they're real bits that must move to the other end.
- For Example 1: `bin(43261596)` has only 26 significant bits, so the buggy version returns the state of a correct loop after only 26 of 32 iterations: `15065253` instead of `964176192`.

With proper zero-padding (`format(n, "032b")`), this is correct. It's fine as a warm-up and is genuinely useful as a **reference implementation for differential testing** (§9), but in an interview it signals weak bit fluency, costs O(32) extra space for the string, and hides the position bookkeeping the interviewer wants to see.

---

## 4. The Core Insight

> **Reversing a fixed-width word is a transfer, not an in-place swap: read bits off one end of `n`, push them onto the other end of an accumulator — exactly 32 times.**

This is the two-pointer array-reversal pattern in bitwise clothing: a read pointer walks `n` from LSB to MSB (`n >>= 1` exposes each bit), while a write pointer walks the accumulator from its low end upward (`result <<= 1` makes room).

**Loop invariant (state it out loud — it's the difference between a junior and senior answer):**

> After `k` iterations, the low `k` bits of `result` equal the low `k` bits of the original `n`, reversed. Equivalently, `result` after `k` steps equals `final_answer >> (32 − k)` — the top bits of the answer are already frozen.

Because the width is fixed at 32, "loop until `n` runs out" is **wrong**; "loop exactly 32 times" is right. Leading zeros must be consumed and re-emitted at the far end.

---

## 5. The Solutions, with Traces

### 5.1 Approach A — the 32-iteration loop (the interview default)

```python
def reverseBits(n: int) -> int:
    result = 0
    for _ in range(32):
        result = (result << 1) | (n & 1)   # peel LSB of n, append to result
        n >>= 1
    return result
```

Equivalent non-mutating form (same thing, explicit positions):

```python
def reverseBits(n: int) -> int:
    result = 0
    for i in range(32):
        result |= ((n >> i) & 1) << (31 - i)   # bit i of n -> bit 31-i of result
    return result
```

**Trace on Example 1** — `n = 43261596` = `0x02941E9C` = `00000010100101000001111010011100`:

| Iteration | Bit consumed (`n & 1`) | `result` (hex) | `result` (dec) |
|---|---|---|---|
| 1 | bit0 = 0 | `0x0` | 0 |
| 2 | bit1 = 0 | `0x0` | 0 |
| 3 | bit2 = 1 | `0x1` | 1 |
| 4 | bit3 = 1 | `0x3` | 3 |
| 5 | bit4 = 1 | `0x7` | 7 |
| 6 | bit5 = 0 | `0xE` | 14 |
| 7 | bit6 = 0 | `0x1C` | 28 |
| 8 | bit7 = 1 | `0x39` | 57 |
| ⋮ | ⋮ | ⋮ | ⋮ |
| 24 | bit23 = 1 | `0x397829` | 3766313 |
| 32 | bit31 = 0 | `0x39782940` | **964176192** ✓ |

Note iteration 24: `result = 0x397829` is exactly the final answer shifted right by 8 — the invariant at work.

**Trace on Example 2** — `n = 2147483644` = `0x7FFFFFFC` = `01111111111111111111111111111100`. The bit stream from LSB is: `0, 0`, then twenty-nine `1`s, then `0`:

| Iteration | Bit consumed | `result` (hex) |
|---|---|---|
| 1 | 0 | `0x0` |
| 2 | 0 | `0x0` |
| 3 | 1 | `0x1` |
| 4 | 1 | `0x3` |
| ⋮ | 1 | `result = 2^(k−2) − 1` after `k ≥ 3` steps |
| 31 | 1 | `0x1FFFFFFF` (= `2^29 − 1`) |
| 32 | 0 | `0x3FFFFFFE` = **1073741822** ✓ |

### 5.2 Approach B — divide & conquer with mask swaps (best constant factor)

Reversal of a `2^m`-bit word decomposes into `m = log2(32) = 5` passes (justified: each pass halves the block size, so you need ⌈log₂ W⌉ passes to get down to single bits): swap 16-bit halves, then bytes within halves, then nibbles within bytes, then bit-pairs within nibbles, then adjacent bits.

Why the order of passes doesn't matter (nice nugget): the pass with block size `s` exchanges position `i` with position `i XOR s`, i.e., it flips exactly one bit of every *bit-index*. XORs commute, and applying all five flips every index bit: `i → i XOR 31 = 31 − i`. Exactly 5 passes are needed and sufficient.

```python
def reverseBits(n: int) -> int:
    n = ((n & 0xFFFF) << 16) | (n >> 16)                    # swap 16-bit halves
    n = ((n & 0x00FF00FF) << 8) | ((n & 0xFF00FF00) >> 8)   # swap bytes
    n = ((n & 0x0F0F0F0F) << 4) | ((n & 0xF0F0F0F0) >> 4)   # swap nibbles
    n = ((n & 0x33333333) << 2) | ((n & 0xCCCCCCCC) >> 2)   # swap bit pairs
    n = ((n & 0x55555555) << 1) | ((n & 0xAAAAAAAA) >> 1)   # swap adjacent bits
    return n
```

Note the Python-safe formulation: **masking each half *before* shifting** keeps every intermediate ≤ 32 bits (e.g., `(n & 0x00FF00FF) << 8 ≤ 0xFF00FF00`), so no trailing `& 0xFFFFFFFF` is needed anywhere.

**Trace on Example 2** (`n = 0x7FFFFFFC`), verified step by step:

| Pass | Operation | Value (hex) |
|---|---|---|
| start | — | `7FFFFFFC` |
| 1 | swap 16-bit halves | `FFFC7FFF` |
| 2 | swap bytes within halves | `FCFFFF7F` |
| 3 | swap nibbles within bytes | `CFFFFFF7` |
| 4 | swap bit-pairs within nibbles | `3FFFFFFD` |
| 5 | swap adjacent bits | `3FFFFFFE` = **1073741822** ✓ |

**Example 1 via hex intuition** (each hex digit *is* a nibble, so reversal = reverse digit order and bit-reverse each digit):

`0 2 9 4 1 E 9 C` → reverse order → `C 9 E 1 4 9 2 0` → bit-reverse each nibble → `3 9 7 8 2 9 4 0` → `0x39782940` = **964176192** ✓

### 5.3 Follow-up — "called many times": chunked lookup table

Precompute the reversal of every possible byte (there are exactly `2^8 = 256` distinct byte patterns, hence 256 table entries ≈ 1 KB), then each call is **4 lookups + shifts** instead of 32 iterations:

```python
_REV8 = [0] * 256
for v in range(256):
    r, x = 0, v
    for _ in range(8):
        r = (r << 1) | (x & 1)
        x >>= 1
    _REV8[v] = r

def reverseBits_cached(n: int) -> int:
    return ((_REV8[n & 0xFF]        << 24) |
            (_REV8[(n >> 8)  & 0xFF] << 16) |
            (_REV8[(n >> 16) & 0xFF] << 8)  |
            _REV8[n >> 24])
```

**Trace on Example 1:** bytes LSB→MSB of `0x02941E9C` are `9C, 1E, 94, 02`; their 8-bit reversals are `39, 78, 29, 40`; assembling most-reversed-byte-first: `0x39 << 24 | 0x78 << 16 | 0x29 << 8 | 0x40 = 0x39782940` ✓.

**Why 8-bit chunks are the sweet spot:** whole-32-bit memoization needs up to `2^32` entries (pointless — bigger than the useful hit rate for spread inputs); 16-bit chunks need `2^16 = 65,536` entries (~256 KB, usually overkill); 8-bit chunks are one cache line-ish of memory and amortize instantly. In production, note that some architectures (ARM) have a single-cycle `RBIT` instruction — worth mentioning as the "real" answer to the follow-up.

---

## 6. Complexity Summary

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| String round-trip | O(W), heavy constant | O(W) string | W = 32; best used as a test oracle |
| 32-iteration loop | O(W) = 32 iterations | O(1) | Interview default; clearest invariant |
| Divide & conquer | O(log W) = 5 passes (~15–20 ops) | O(1) | Branch-free, best constant factor |
| Byte-table (follow-up) | O(W/8) = 4 lookups per call | O(2^8) table | Amortizes over many calls |

On optimality: every correct algorithm's output depends on **every** input bit — flipping any single input bit `i` changes exactly output bit `31 − i` — so Ω(1) per call is a hard floor in the word-RAM model, and this entire problem is a game of constant factors, not asymptotics. (For general word width `w`: the loop is O(w), the mask approach is O(log w) passes because each pass halves block size, and the table uses `2^k` slots for `k`-bit chunks because that's the number of distinct `k`-bit patterns.)

---

## 7. Language Gotchas

| Language | Gotcha |
|---|---|
| **Python** | Ints are **arbitrary-precision and signed**. A bare `n << 16` on a 32-bit value produces a 33+ bit number instead of wrapping — any left shift must be preceded/followed by `& 0xFFFFFFFF` (or mask halves before shifting, as in §5.2). There is no `>>>`; since we keep `n` masked non-negative, `>>` behaves like `>>>`. For the classic variant with negative inputs, do `n &= 0xFFFFFFFF` first — otherwise `n >>= 1` converges to −1 and never terminates. |
| **Java** | Use `n >>>= 1` (logical shift) as defensive habit; with this problem's `n ≥ 0` constraint, `>>` happens to be equivalent, but `>>>` is the correct idiom for the general signed version. Watch `1 << 32 == 1` — Java masks int shift counts mod 32, so a shift of 32 silently becomes a shift of 0. Also know `Integer.reverse(n)` exists; many interviewers ban it, but citing it shows library awareness. Java's fixed-width `int` wrapping is actually a convenience here — shifts self-truncate. |
| **C++** | Left-shifting a signed `int` into its sign bit is UB pre-C++20 — do all work in `uint32_t` and only convert at the boundary. Hex masks like `0xFF00FF00` don't fit `int` and become `unsigned` literals, mixing signedness (warnings / subtle promotion bugs). `__builtin_bswap32` reverses **byte order, not bits** — a tempting wrong tool. |

---

## 8. Common Mistakes

1. **Early-exit loop (`while n:`)** — imported from digit-reversal, where trailing zeros vanish. Here leading zeros are data: for `n = 2` a `while n` loop returns `1`, not `1073741824`. Always loop exactly 32 times.
2. **Unmasked left shifts in Python** (D&C or `<< (31 - i)` form) — produces numbers with > 32 bits; wrong answers on any input with high bits set. Rule: mask after every widening step.
3. **`bin(n)[2:][::-1]` without zero-padding** — silently drops the input's leading zeros (Example 1's buggy result `15065253` is exactly a 26-iteration prefix of the correct answer). Fix: `format(n, "032b")`.
4. **Off-by-one on the write position** — writing bit `i` to `<< (32 - i)` maps bit 0 to position 32 (a phantom 33rd bit) and bit 31 to position 1. Correct target is `31 - i`; the pull/push loop sidesteps this entirely, which is why it's the safer default.
5. **D&C mask or pass errors** — masks pair up (`0x55555555 ↔ 0xAAAAAAAA`, `0x33333333 ↔ 0xCCCCCCCC`, `0x0F0F0F0F ↔ 0xF0F0F0F0`, `0x00FF00FF ↔ 0xFF00FF00`); forgetting one of the five passes yields plausible-looking garbage. The alternating-pattern test (§9, #7) is maximally sensitive to this.
6. **Confusing reversal with complement** — `n ^ 0xFFFFFFFF` flips bits in place; it moves nothing. (Also, Python's `~n` on a non-negative int returns a negative unbounded int — a different bug on top of the same confusion.)
7. **Assuming the answer can be negative** — for valid inputs here it can't: input even ⟹ output's bit 31 is 0. Being able to *prove* this from the constraints is the constraint-decoding flex.

---

## 9. Test Plan (say these out loud before/after coding)

| # | Input | Input (binary) | Expected | Expected (binary) | What it guards |
|---|---|---|---|---|---|
| 1 | 43261596 | `00000010100101000001111010011100` | 964176192 | `00111001011110000010100101000000` | Official example 1 |
| 2 | 2147483644 | `01111111111111111111111111111100` | 1073741822 | `00111111111111111111111111111110` | Official example 2 |
| 3 | 0 | 32 zeros | 0 | 32 zeros | All-zero word; no special-casing |
| 4 | 2 | `0…010` | 1073741824 | `0100…0` (bit 30) | **Leading zeros are data**; kills `while n` loops |
| 5 | 2147483646 (`2^31 − 2`) | `0111…10` | 2147483646 | same | Fixed point of reversal; max legal input |
| 6 | 1073741824 (`2^30`) | `0100…0` | 2 | `0…010` | Mirror of #4; tests the top end |
| 7 | 1431655764 (`0x55555554`) | `0101…0100` | 715827880 (`0x2AAAAAA8`) | `0010…1000` | Alternating pattern; catches D&C mask typos |

**Property-based checks** (great to mention even if you don't run them):

```python
import random
for _ in range(10_000):
    x = random.randrange(0, 2**31, 2)          # even inputs in range
    assert reverseBits(reverseBits(x)) == x     # reversal is an involution
    assert reverseBits(x) == int(format(x, "032b")[::-1], 2)   # vs. string oracle
    assert 0 <= reverseBits(x) < 2**31          # follows from input evenness
```

---

## 10. Transferable Patterns & Related Problems

**Patterns you'll reuse:**

- **Fixed-width bit arrays:** treat an int as a length-32 array; reversal = two pointers over bit positions.
- **Loop invariants on bit prefixes:** "after `k` steps, the low `k` bits are correct" generalizes to most bit-building loops.
- **Divide & conquer on bit groups:** the same `0x5555… / 0x3333… / 0x0F0F… / 0x00FF… / 0xFFFF…` skeleton powers popcount (Hamming weight), parity, and byte-swap.
- **Chunked precomputation:** trading `2^k` memory for `w/k`-step queries — the standard answer to "this function will be called many times."
- **Masking to emulate fixed-width arithmetic in Python** — needed in nearly every bit-manipulation problem done in Python.

**Real-world appearances:** bit-reversal permutation in FFT implementations, DES/crypto key scheduling, graphics pixel swizzling.

**Related problems:** LC 191 (Number of 1 Bits — popcount, same D&C trick), LC 231/342 (Power of Two/Four — mask patterns), LC 476/1009 (Number Complement), LC 693 (Binary Number with Alternating Bits — the `0x5555…` pattern), LC 371 (Sum of Two Integers — carry loops), LC 405 (Number to Hex — nibble extraction), LC 201 (Bitwise AND of Numbers Range), LC 7 (Reverse Integer — the *digit* analog; contrast why trailing zeros vanish there but not here), LC 1356 (Sort by popcount).

---

## 11. The Interview Script (fuller talk track)

**Restate (≈20s):** "I'm given a 32-bit word and must return its mirror image — bit at position `i` moves to position `31 − i`. The width is fixed at 32, so this is pure bit manipulation, not arithmetic."

**Clarify (≈15s):** "The constraints say `n` is even and at most `2^31 − 2`, so the input is non-negative and its lowest bit is 0. That means the output's top bit is 0 too — the answer is always a valid non-negative signed int, so no sign handling is needed. I'll still shift defensively."

**Approach (≈20s):** "My plan is an accumulator and exactly 32 iterations: peel the lowest bit off `n`, push it onto the low end of the accumulator. Invariant: after `k` steps, the low `k` bits of the accumulator are `n`'s low `k` bits reversed. After 32 steps, done. I loop a fixed 32 times, never `while n`, because leading zeros are real bits that must travel."

**Complexity (≈10s):** "O(1) time and space — 32 iterations. Since every input bit lands in a distinct output bit, any correct algorithm touches all 32 bits, so this is constant-factor optimal in spirit; if you want the tightest constant, five branch-free divide-and-conquer mask passes do it."

**Follow-up preempt (≈15s):** "If called many times, I'd precompute an 8-bit reversal table — 256 entries, about a kilobyte — and each call becomes four lookups."

**Tests (≈15s):** "Both examples, plus `n = 0`, `n = 2` — a single set bit near the bottom must come out as `2^30` — and `n = 2^31 − 2`, which reverses to itself."

---

## 12. Say It in 60 Seconds

> "Reverse Bits mirrors a 32-bit word: the bit at position `i` ends at position `31 − i`. Since the width is fixed at 32, this is O(1) no matter what — the game is choosing the cleanest O(1). My default is a 32-iteration loop: peel the lowest bit off the input and push it onto the low end of an accumulator, so the first bit read becomes the last bit written. I loop exactly 32 times, never 'while n,' because leading zeros are data — reversing 2 must give 2 to the 30th. The constraints say the input is even, so the output's top bit is 0 and it stays a valid non-negative signed int. In Python I mask with 0xFFFFFFFF because ints are unbounded. For many repeated calls, I'd precompute a 256-entry byte-reversal table — one kilobyte — so each call is four lookups; or I'd use the five-pass divide-and-conquer mask swap, which is branch-free. My tests: both examples, n equals zero, n equals two, and n equals 2 to the 31st minus 2, which is its own reversal."
