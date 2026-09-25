# Sum of Two Integers (LeetCode 371) — Complete Lesson

## 1. Problem Restatement

Given two integers `a` and `b` (each in `[-1000, 1000]`), return their arithmetic sum. The twist: your code may **not use the `+` or `-` operators** — not the binary forms, and by the spirit of the problem, not the compound forms (`+=`, `-=`) or unary minus either. What you *do* have is the full bitwise toolbox: `&`, `|`, `^`, `~`, `<<`, `>>`, plus ordinary control flow (`while`, `if`, recursion).

A precision note before anything else: this problem has **no arrays, indices, duplicates, or ordering concerns**. The place where precision matters here is the distinction between a **bit pattern** and the **integer value it encodes**. In a 32-bit two's-complement world, the pattern `0xFFFFFFFF` and the value `-1` are the same thing viewed two ways — and almost every bug in this problem is a confusion between those two views.

## 2. Constraint Decoding

| Constraint | What it really means | Consequence for the solution |
|---|---|---|
| `-1000 ≤ a, b ≤ 1000` | The true sum is in `[-2000, 2000]` | **The answer never overflows.** All difficulty is about *representation*, not magnitude. |
| No `+` / `-` | Must rebuild addition from `^`, `&`, `~`, `<<` | The entire problem is "implement a hardware adder." |
| Python ints are unbounded | Python never wraps at 32 bits | You must **emulate fixed-width two's complement with a mask**, or negative inputs can hang your loop (see §5). |
| Canonical framing: 32-bit ints | LeetCode's classic version of this problem assumes 32-bit machine ints | Mask with `0xFFFFFFFF`, treat `0x7FFFFFFF` as the sign threshold. |

Two observations worth saying out loud:

- Since `|a + b| ≤ 2000 < 2048`, even a **12-bit mask** (`0xFFF`, two's-complement range `[-2048, 2047]`) would technically suffice. Cute, but fragile if constraints change — default to the standard 32-bit mask.
- Ironically, the tiny constraints **do not save you** from masking. The loop-termination problem with negatives exists even for `a = 1, b = -1`.

**Clarifying questions to ask the interviewer** (good hygiene, shows you understand the rules): *"Are compound forms like `+=` and unary minus also off-limits? Is the builtin `sum()` acceptable, or is the intent that I build addition from bit operations? Should I assume 32-bit machine integers?"*

## 3. Brute Force: Simulate a Full Adder

The most literal approach is to do what hardware does: process the two numbers bit by bit from the least significant bit, maintaining a carry, exactly like grade-school addition in base 2. For each bit position `i`, with input bits `x`, `y` and incoming carry `c`:

- **sum bit** = `x ^ y ^ c`
- **carry out** = majority of `(x, y, c)` = `(x & y) | (x & c) | (y & c)`

```python
def getSum_bruteforce(a: int, b: int) -> int:
    MASK = 0xFFFFFFFF
    a &= MASK                      # normalize negatives to unsigned 32-bit patterns
    b &= MASK
    result, carry = 0, 0
    for i in range(32):            # note: range(32), not range(32, ... , ...) with a literal -1
        x = (a >> i) & 1
        y = (b >> i) & 1
        bit_sum = x ^ y ^ carry
        carry = (x & y) | (x & carry) | (y & carry)
        result |= bit_sum << i
    return result if result <= 0x7FFFFFFF else ~(result ^ MASK)
```

Note the brute force terminates *by construction* — it's a fixed 32 rounds, no matter what. (As we'll see, the "clever" loop is the one that needs the mask to terminate in Python.)

**Worked trace, `a = 2 (0b010)`, `b = 3 (0b011)`:**

| bit `i` | `x` | `y` | carry-in | sum bit `x^y^c` | carry-out |
|---|---|---|---|---|---|
| 0 | 0 | 1 | 0 | **1** | 0 |
| 1 | 1 | 1 | 0 | **0** | 1 |
| 2 | 0 | 0 | 1 | **1** | 0 |
| 3 | 0 | 0 | 0 | 0 | 0 |

Result bits: `0b101` = **5**. ✓

This is correct and a perfectly defensible first answer in an interview. It's `O(w)` where `w` is the word width (32) — constant for fixed-width ints.

## 4. The Core Insight

You don't need to walk bits one at a time if you notice what XOR and AND *mean* in addition:

- **`a ^ b`** adds each column but **drops the carry**: `1 ^ 1 = 0`, exactly like `1 + 1 = 10₂` with the carry thrown away.
- **`(a & b) << 1`** is precisely the **carry**: `a & b` marks columns where both bits are 1 (a carry is generated), and shifting left moves it to the next column where it must be added.

So for all integers:

```
a + b  =  (a ^ b)  +  ((a & b) << 1)
```

Two nice properties fall out immediately:

- **Invariant:** each rewrite preserves `a + b` (mod 2³²), since `xor + carry = a + b` exactly.
- **Termination:** the new `b` is `(a & b) << 1`. The lowest set bit of `a & b` is at least as high as the lowest set bit of `b` (it's a sub-mask of `b`), and the shift pushes it one higher. So **the lowest set bit of `b` strictly rises every iteration** — bounded by 32 bits, `b` must hit 0 within 32 iterations.

Unrolling that recursion — replace `a` with `a ^ b` and `b` with the carry, repeat until the carry is zero — *is* the optimal algorithm.

## 5. Optimal Approach: Carry-Propagation Loop

```python
def getSum(a: int, b: int) -> int:
    MASK = 0xFFFFFFFF       # 32 ones: unsigned 32-bit range
    MAX_INT = 0x7FFFFFFF    # largest positive 32-bit signed value

    a &= MASK               # normalize negatives to unsigned patterns
    b &= MASK
    while b:
        a, b = (a ^ b) & MASK, ((a & b) << 1) & MASK

    # a is now the correct 32-bit pattern; convert two's complement -> Python int
    return a if a <= MAX_INT else ~(a ^ MASK)
```

### Why the mask is mandatory in Python (not optional)

Python integers are unbounded, so negatives behave like **infinitely long** two's-complement strings of leading 1s. Consider `a = 1, b = -1` without masking: the carry keeps doubling — `(−2, 2) → (−4, 4) → (−8, 8) → …` — forever. The true sum `0` needs the carry to "fall off the left end" of the word, and an unbounded word has no left end. The mask manufactures that left end. This is the single most important implementation detail in this problem.

### Traces on the official examples

**Example 1: `a = 1, b = 2`** (binary `001`, `010`)

| iteration | `a` | `b` (carry) | `a ^ b` | `(a & b) << 1` |
|---|---|---|---|---|
| start | `001` | `010` | — | — |
| 1 | `011` | `000` | `011` | `000` |

Carry is 0 → return **3**. ✓ One iteration.

**Example 2: `a = 2, b = 3`** (binary `010`, `011`)

| iteration | `a` | `b` (carry) | `a ^ b` | `(a & b) << 1` |
|---|---|---|---|---|
| start | `010` | `011` | — | — |
| 1 | `001` | `100` | `001` | `100` |
| 2 | `101` | `000` | `101` | `000` |

Return **5**. ✓ Two iterations.

**Bonus carry-chain example, `a = 5, b = 7`:** `(101, 111) → (010, 1010) → (1000, 0100) → (1100, 0)` → **12**. Three iterations because the carry ripples.

### Trace on the trap case: `a = 1, b = −1` (with masking)

| step | `a` (pattern) | `b` | note |
|---|---|---|---|
| init | `0x00000001` | `0xFFFFFFFF` | `b` masked to unsigned pattern |
| 1 | `0xFFFFFFFE` | `0x00000002` | carry was `1 << 1` |
| 2 | `0xFFFFFFFC` | `0x00000004` | pattern: `a = 2³² − 2^k`, `b = 2^k` |
| … | … | doubling | invariant `a + b ≡ 0 (mod 2³²)` holds throughout |
| 31 | `0x80000000` | `0x80000000` | last nonzero carry |
| 32 | `0x00000000` | `0x00000000` | `0x80000000 << 1` masks to 0 |

Loop exits with pattern `0x00000000 ≤ MAX_INT` → return **0**. ✓

### The sign conversion, algebraically

If the final pattern `a > 0x7FFFFFFF`, the true value is `a − 2³²`. We can't use `-`, so use two identities:

- Within 32 bits, `a ^ MASK = MASK − a` (a full-width bitwise NOT).
- For any int `x`, `~x = −x − 1`.

Therefore `~(a ^ MASK) = −(MASK − a) − 1 = a − 2³²` — exactly the two's-complement value, no minus operator involved. Example: final pattern `0xFFFFFFFF` → `0xFFFFFFFF ^ 0xFFFFFFFF = 0` → `~0 = −1`. ✓

### Recursive one-liner variant

```python
def getSum(a: int, b: int) -> int:
    MASK, MAX_INT = 0xFFFFFFFF, 0x7FFFFFFF
    a, b = a & MASK, b & MASK
    if b == 0:
        return a if a <= MAX_INT else ~(a ^ MASK)
    return getSum((a ^ b) & MASK, ((a & b) << 1) & MASK)
```

Recursion depth ≤ 32, so it's safe — but the iterative loop is the cleaner default. In **Java or C++**, the recursion needs no mask at all because ints are already fixed-width.

## 6. Cheats, and When They're Acceptable

| Cheat | Verdict |
|---|---|
| `return sum((a, b))` | No `+` *token* in your code, but the builtin performs the addition. Usually rejected when the point is bit manipulation. If you mention it, ask the interviewer first. |
| `a - (-b)`, `b * -1` then adding | Uses `-` (and `+`) directly — off-limits. |
| `operator.add(a, b)`, `a.__add__(b)` | Same violation with extra steps. |
| Log/exp float tricks (`int(math.exp(...))`) | Also needs `+` for the exponents, and float precision makes it untrustworthy in general. Skip. |

The bit-loop is the intended answer; the cheats are worth knowing only so you can name them and ask whether they're allowed.

## 7. Complexity

| Approach | Time | Space | Notes |
|---|---|---|---|
| Full adder, 32 bit positions (§3) | `O(w) = O(1)` | `O(1)` | Fixed 32 rounds; terminates by construction. |
| Carry-propagation loop (§5) | `O(w) = O(1)` | `O(1)` | ≤ 32 iterations (lowest set bit of carry strictly rises each round). |
| Recursive variant | `O(w) = O(1)` | `O(w)` stack | Depth ≤ 32. |
| `sum()` cheat | `O(1)` | `O(1)` | Disallowed in spirit. |

With `w = 32` fixed, everything is constant time; for the actual constraints (`|sum| ≤ 2000`) the loop runs at most ~12 iterations. For completeness: there is a matching `Ω(w)` bit-model lower bound — flipping any single input bit can flip *every* output bit through carry ripple (e.g., `0b0111 + 1`), so no correct algorithm can inspect fewer than all input bits. The optimal loop is not asymptotically better than the brute force; its win is elegance, fewer lines, and idiomatic one-liner status in fixed-width languages.

## 8. Language Gotchas (Python / Java / C++)

| Language | Gotcha | Fix |
|---|---|---|
| Python | Unbounded ints: `getSum(1, -1)` **infinite-loops** without masking — the carry never falls off the left end. | Mask every operand and every intermediate to `0xFFFFFFFF`. |
| Python | After masking, the result is an *unsigned pattern*: `getSum(-1, -1)` would return `4294967294` instead of `-2`. | Final conversion `~(a ^ MASK)`; you cannot write `a - 2**32` because that uses `-`. |
| Java | None structural — `int` is 32-bit two's complement and `<<` discards overflow bits, so the plain loop works and negative results need no conversion. | Keep it simple; don't "upgrade" to `long` (changes nothing useful and widens the loop). |
| C++ | `(a & b) << 1` on a signed `int` can overflow the sign bit — **undefined behavior** for signed shifts that overflow. | Do the work in `uint32_t`, cast back at the end. |
| C++ (minor) | Out-of-range `unsigned → int` conversion was implementation-defined pre-C++20 (it's modular/two's-complement in C++20). | `static_cast<int>(some_uint32_t)` is fine on all mainstream compilers; note it if asked. |

```java
// Java: no mask needed — fixed-width wrapping does the job
public int getSum(int a, int b) {
    while (b != 0) {
        int sum   = a ^ b;          // add without carry
        int carry = (a & b) << 1;   // carry into the next column
        a = sum;
        b = carry;
    }
    return a;
}
```

```cpp
// C++: unsigned arithmetic to avoid signed-shift UB
int getSum(int a, int b) {
    while (b != 0) {
        uint32_t carry = (static_cast<uint32_t>(a) & static_cast<uint32_t>(b)) << 1;
        a = static_cast<int>(static_cast<uint32_t>(a) ^ static_cast<uint32_t>(b));
        b = static_cast<int>(carry);
    }
    return a;
}
```

## 9. Common Mistakes

1. **No mask in Python.** Symptom: `getSum(1, -1)` hangs forever. Root cause: unbounded ints have no left end for the carry to fall off.
2. **No final sign conversion.** Symptom: `getSum(-1, -1)` returns `4294967294`. The judge compares Python ints, so the unsigned pattern is a wrong answer.
3. **Masking the inputs but not the loop intermediates.** `(a & b) << 1` can produce bit 32 (`0x80000000 << 1 = 0x100000000`); subsequent XORs then mix bit 32 into the result and the final conversion logic breaks. Mask inside the loop.
4. **Using `-` in the final conversion** (`a - 0x100000000`). It works mathematically but violates the constraint — use `~(a ^ MASK)`.
5. **Mask-width typos.** `0xFFFF` (16 bits) instead of `0xFFFFFFFF`; `0x7FF` instead of `0x7FFFFFFF`. Test with `(-1, -1)` to catch these immediately.
6. **Accidental forbidden tokens.** `for i in range(32, -1, -1)` contains a literal `-1`. It's just a loop bound, but a picky interviewer may flag it — write `range(32)`.
7. **Assuming the ±1000 constraint removes the masking requirement.** It doesn't; the termination issue exists even at `(1, -1)`.
8. **Trusting `sum()`/`operator.add`** without checking the interviewer's rules first.

## 10. Test Cases to Propose Out Loud

Say these before (or right after) coding — it signals you've thought about representation, not just arithmetic:

| Test | Expected | Why it matters |
|---|---|---|
| `(1, 2)` → `3`; `(2, 3)` → `5` | official examples | Baseline; `(2,3)` exercises one carry round. |
| `(1, -1)` → `0` | 0 | **The trap.** Carry ripples through the sign position; without the Python mask this infinite-loops. |
| `(-1, -1)` → `-2` | -2 | Exercises the negative-result conversion branch (`~(a ^ MASK)`). |
| `(0, 0)` → `0`; `(7, 0)` → `7` | 0 / 7 | Zero operand: loop body never runs; must return the masked-then-converted `a` correctly. |
| `(1000, 1000)` → `2000`; `(-1000, -1000)` → `-2000` | ±2000 | Extreme magnitudes within constraints; sign conversion at the boundary. |
| `(-1000, 1000)` → `0` | 0 | Opposite signs cancelling at the constraint edges. |
| `(5, 7)` → `12` | 12 | Multi-iteration carry chain — useful while debugging the loop. |

Each edge case maps to a specific line of the solution: the mask (case 1), the in-loop mask (case 1's carry growth), and the final conversion (cases 2, 5).

## 11. Transferable Patterns & Related Problems

- **Half-adder decomposition** — `XOR` = sum-without-carry, `(AND) << 1` = carry. Directly reusable in LC 67 *Add Binary* and conceptually behind *Add Strings* (415) and carry-lookahead/parallel-prefix adders in hardware.
- **Fixed-width two's-complement emulation in Python** (mask everything, convert at the end with `~(x ^ MASK)`) — the exact technique needed for LC 405 *Convert a Number to Hexadecimal* and any other bit-manipulation problem where Python's unbounded ints misbehave.
- **Invariant-preserving rewrite loops** — here, "`a + b` is preserved while the carry's lowest set bit strictly rises" is the termination argument. This *shape* of argument (invariant + monovariant) applies to many iterative bit/number problems.
- **Restricted-operations theme** — LC 29 *Divide Two Integers* (no `*`, `/`, `%`), LC 50 *Pow(x, n)* (build via bits), LC 190 *Reverse Bits*, LC 191 *Number of 1 Bits*, LC 136 / 260 *Single Number* (XOR identities).

## 12. Full Interview Talk Track

> "The key realization is that binary addition splits into two independent parts. XOR of the two numbers adds every bit column but ignores carries — that's why `1 ^ 1` is `0`. AND of the two numbers finds exactly the columns where both bits are 1, which are the columns that generate a carry; shifting that left by one puts the carry into the next column. So `a + b` always equals `(a XOR b) + ((a AND b) shifted left 1)`. I loop that rewrite until the carry term is zero. Termination is guaranteed because the carry's lowest set bit strictly moves left each iteration, so within 32 iterations on a 32-bit word it's gone.
>
> One language-specific issue: Python ints are unbounded, so negative numbers act like infinitely long two's-complement strings, and something like `1 + (-1)` would propagate the carry forever. I fix that by masking everything to 32 bits each iteration, which simulates hardware wraparound. At the end, if the sign bit is set — pattern above `0x7FFFFFFF` — I convert back to a negative Python int using `~(pattern XOR mask)`, which equals `pattern minus 2 to the 32nd` but uses no forbidden operator.
>
> Worst case is a full-width carry ripple, 32 iterations, so O(1) time and O(1) space. Before I code: tests I care about are the two official examples, `1` and `-1` for the carry-through-sign trap, `(-1, -1)` for the negative conversion, and zero operands."

## 13. Say It in 60 Seconds

> "I rebuild addition from bit operations. XOR adds each column and drops the carry, and AND finds the columns that generate a carry, which I shift left one position. So `a` plus `b` equals `a XOR b` plus `a AND b` shifted left — and I just repeat that rewrite until the carry is zero. Termination is guaranteed because the carry's lowest set bit strictly rises every round, so within 32 rounds on a 32-bit word it's zero. In Python specifically, ints are unbounded, so I mask every value to 32 bits each iteration — otherwise a case like `1` plus `-1` carries forever — and at the end, if the sign bit is set, I convert the unsigned pattern back to a negative int with a double-complement trick, no minus operator needed. At most 32 iterations: O(1) time, O(1) space."
