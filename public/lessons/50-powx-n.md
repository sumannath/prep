# Pow(x, n) — Complete Lesson (Binary Exponentiation)

## 1. Problem Restatement

**Given:** a floating-point base `x` (with `-100.0 < x < 100.0`) and a 32-bit signed integer exponent `n` (with `-2^31 <= n <= 2^31 - 1`).

**Return:** `x^n` as a `double`.

- You may **not** use the built-in `pow`/`**` — that's the entire point of the question.
- `n` may be **negative**, in which case `x^n = 1 / (x^|n|)`.
- Example 3 decodes cleanly: `2^(-2) = 1 / 2^2 = 1/4 = 0.25`.
- Constraints guarantee `(x != 0) or (n > 0)`, i.e., you will never see `0^0` or `0^negative`, so the reciprocal step can never divide by zero.

**What the interviewer is actually testing:**

1. Do you know **binary exponentiation** (fast power), or do you reach for an O(n) loop?
2. Do you notice that `n` can be ≈ 2.1 **billion** in magnitude, making O(n) a TLE?
3. Do you catch the **asymmetric int range** trap: `-(-2^31)` does not fit in a 32-bit int?
4. Can you handle negative exponents, negative bases, and `n = 0` cleanly?

---

## 2. Constraint Decoding

| Constraint | What it really means | Design implication |
|---|---|---|
| `-100.0 < x < 100.0` | Base may be negative, zero (only with `n > 0`), fractional | Sign falls out of multiplication naturally; no special-casing needed |
| `-2^31 <= n <= 2^31 - 1` | Full 32-bit int range, which is **asymmetric** | `-(−2^31)` overflows in Java/C++ → widen to 64-bit **before** negating (Python's ints are arbitrary-precision, but say this out loud) |
| `n` is an integer | No fractional exponents | Exponent is bit-decomposable → binary exponentiation applies. (The `exp(n·ln x)` trick only makes sense for real exponents, loses precision, and misses the point of the interview.) |
| `(x != 0) or (n > 0)` | Never `0^0`, never `0^negative` | Flipping `x → 1/x` for negative `n` is safe |
| `\|x^n\| <= 10^4` | True answer is modest | Final result never over/underflows a double; intermediates are also bounded (the largest intermediate, the top-bit squaring, is ≤ ~10^8) |

Judges for this problem accept a small floating tolerance (on the order of `1e-9`), so the accumulated rounding from ≤ ~63 multiplications is irrelevant — but never compare floats with `==` in your own tests.

---

## 3. Brute Force: Linear Multiplication

Multiply `x` into an accumulator `|n|` times; if `n < 0`, return the reciprocal.

```python
def myPow_bruteforce(x: float, n: int) -> float:
    if n < 0:
        x, n = 1 / x, -n        # (overflow landmine for n = -2^31 in Java/C++)
    acc = 1.0
    for _ in range(n):
        acc *= x
    return acc
```

**Worked trace** (Example 2: `x = 2.1, n = 3`):

| Multiply # | Accumulator |
|---|---|
| start | 1.0 |
| 1 | 2.1 |
| 2 | 4.41 |
| 3 | **9.261** ✓ |

**Why it dies:** the loop runs `|n|` times, and `|n|` can be `2,147,483,647`. At ~10⁸–10⁹ double multiplications per second, that's seconds of runtime — a guaranteed TLE. For `n = -2^31` it's just as bad, *and* the negation `-n` already overflows a 32-bit int in Java/C++.

---

## 4. The Core Insight

**Never decrement the exponent — halve it.** Two equivalent framings:

**Framing A (halving identity):**

- `n` even: `x^n = (x²)^(n/2)`
- `n` odd: `x^n = x · (x²)^((n-1)/2)`

Each *squaring* doubles the exponent you can reach, at the cost of one multiplication.

**Framing B (binary decomposition):** write `n` in binary, e.g. `n = 10 = 1010₂ = 8 + 2`. Then

```
x^n = Π over set bits k of x^(2^k)      so    2^10 = 2^8 · 2^2 = 256 · 4 = 1024
```

The values `x^(2^k)` come for free: `x → x² → x⁴ → x⁸ → …`, one squaring per bit. Either way, the cost drops from O(n) to **O(log n)** — roughly 31 loop iterations for any 32-bit exponent.

---

## 5. Optimal Solution #1 — Recursion (Divide & Conquer)

```python
def myPow(x: float, n: int) -> float:
    if n == 0:
        return 1.0
    if n < 0:
        return 1.0 / myPow(x, -n)   # normalize ONCE; inner calls only see n > 0
    half = myPow(x, n // 2)         # compute the half EXACTLY ONCE, store it
    if n % 2 == 0:
        return half * half          # x^n = (x^(n/2))^2
    return half * half * x          # x^n = (x^((n-1)/2))^2 * x
```

**Call tree for Example 1** (`x = 2.0, n = 10`):

```text
myPow(2, 10)                              even → 32 * 32
├── myPow(2, 5)                           odd  → 4 * 4 * 2
│   ├── myPow(2, 2)                       even → 2 * 2
│   │   └── myPow(2, 1)                   odd  → 1 * 1 * 2
│   │       └── myPow(2, 0) = 1.0
│   └── = 32.0
└── = 1024.0 ✓
```

Notes:

- Recursion depth is `⌊log₂ n⌋ + 1 ≤ 32` frames — nowhere near Python's default recursion limit.
- The recursion tree is a **chain** (each call makes exactly one recursive call), so there are no overlapping subproblems — `@lru_cache` would be harmless but pointless.
- Normalizing the sign at the *boundary* matters in Python: `-5 // 2 == -3` (floor division), so recursing directly on negative `n` breaks the halving invariant.

---

## 6. Optimal Solution #2 — Iterative Binary Exponentiation (Recommended)

```python
def myPow(x: float, n: int) -> float:
    # Normalize: x^(-n) = (1/x)^n.
    # Python ints can't overflow on -n; in Java/C++ widen to long/long long FIRST.
    if n < 0:
        x = 1 / x
        n = -n

    result = 1.0
    while n:
        if n & 1:          # bit k of n is set -> fold in x^(2^k)
            result *= x
        x *= x             # square EVERY iteration: x^(2^k) -> x^(2^(k+1))
        n >>= 1            # advance to bit k+1
    return result
```

**Loop invariant** (worth stating in an interview): at the top of the iteration examining bit `k` (bit 0 = least significant), with `x0`/`N` the normalized base/exponent:

- `x` holds `x0^(2^k)`
- `n` holds `N >> k` (the unprocessed high bits)
- `result · x^n = x0^N`

Preservation: folding bit value `b ∈ {0,1}` gives `result' · (x²)^(n>>1) = result · x^(b + 2⌊n/2⌋) = result · x^n`. When `n` reaches 0, `result` *is* the answer.

### Traces on the official examples

**Example 1: `x = 2.0, n = 10` (binary `1010`)** — set bits: 1 and 3, so expect `x² · x⁸ = 4 · 256`:

| Iteration k | n at top | Bit `n & 1` | `x` = x0^(2^k) | `result` |
|---|---|---|---|---|
| 0 | 10 (`1010₂`) | 0 | 2.0 | 1.0 |
| 1 | 5 (`101₂`) | 1 | 4.0 | 1 · 4 = **4.0** |
| 2 | 2 (`10₂`) | 0 | 16.0 | 4.0 |
| 3 | 1 (`1₂`) | 1 | 256.0 | 4 · 256 = **1024.0** ✓ |

(`n` becomes 0 → return. The final squaring to 65536 is wasted-but-harmless work; multiplying *before* squaring is what keeps it harmless — the squared value is never used.)

**Example 2: `x = 2.1, n = 3` (binary `11`)** — expect `x¹ · x² = x³`:

| Iteration k | n | Bit | `x` | `result` |
|---|---|---|---|---|
| 0 | 3 (`11₂`) | 1 | 2.1 | **2.1** |
| 1 | 1 (`1₂`) | 1 | 4.41 | 2.1 · 4.41 = **9.261** ✓ |

**Example 3: `x = 2.0, n = -2`** — normalize first: `x = 0.5, n = 2 (10₂)`:

| Iteration k | n | Bit | `x` | `result` |
|---|---|---|---|---|
| 0 | 2 (`10₂`) | 0 | 0.5 | 1.0 |
| 1 | 1 (`1₂`) | 1 | 0.25 | 1 · 0.25 = **0.25** ✓ |

### The `n = -2^31` landmine

`x = 2.0, n = -2147483648`: normalized to `x = 0.5, n = 2^31` (a single 1-bit at position 31). The loop runs 32 iterations — 31 squarings down to `0.5^(2^31) ≈ 10^(-6.5×10^8)`, which underflows to `0.0` — and returns `0.0`. In **Python this is exact** (arbitrary-precision ints). In **Java/C++ with a 32-bit `int`**, `n = -n` wraps back to `-2147483648`: a `while (n > 0)` loop silently returns the wrong `1.0`, and `while (n != 0)` with `n >>= 1` **infinite-loops** (arithmetic shift stalls at `-1`). See §9 for the fix.

---

## 7. Complexity

| Approach | Time | Extra space | Worst-case ops (`|n| ≈ 2.1e9`) | Verdict |
|---|---|---|---|---|
| Linear multiplication | O(\|n\|) | O(1) | ~2.1×10⁹ multiplies | TLE |
| Recursion, `half` **called twice** | O(\|n\|) | O(log \|n\|) | ~2.1×10⁹ calls | TLE (the sneaky one — see §9) |
| Recursion, `half` stored | O(log \|n\|) | O(log \|n\|) stack (~32 frames) | ≤ ~63 multiplies | Accepted |
| **Iterative binary exponentiation** | **O(log \|n\|)** | **O(1)** | ≤ ~32 iterations / ~63 multiplies | Accepted; optimal up to constants |

Why O(log |n|) is a genuine floor, not just what this algorithm happens to do: starting from `x` (exponent 1), every multiplication combines two already-built powers, so the largest reachable exponent at most **doubles** per multiplication; after `m` multiplications you can reach at most exponent `2^m`, so reaching exponent `n` needs `m ≥ log₂ n` (the classic addition-chain argument).

---

## 8. Common Mistakes & Gotchas

| # | Mistake | Consequence | Fix |
|---|---|---|---|
| 1 | `return myPow(x, n//2) * myPow(x, n//2)` (calling twice instead of storing `half`) | `T(n) = 2T(n/2) + O(1)` solves to O(n) by the Master Theorem — silently degenerates to brute force | Store `half` in a local; multiply it by itself |
| 2 | `return half * half` in **both** branches (dropping the odd case's extra `× x`) | `pow(2, 3)` returns 4, not 8 | Odd ⇒ `half * half * x` |
| 3 | Handling negative `n` by squaring only when the bit is set | `x` no longer equals `x0^(2^k)`; wrong results | Square `x` **unconditionally**, then shift |
| 4 | Missing the `n == 0` base case (recursive) | `myPow(…, 1) → myPow(…, 0) → myPow(…, 0) → …` infinite recursion | Base case first |
| 5 | `int(n/2)` in Python for huge `n` | Float conversion loses precision above 2^53 | Use `n >> 1` or `n // 2` (after normalizing `n` positive) |
| 6 | Recursing directly on negative `n` in Python | `-5 // 2 == -3` breaks the halving invariant | Normalize to positive once at the boundary |
| 7 | Using built-in `pow` / `exp(n·ln x)` | Misses the point of the interview; the exp/log form loses precision | Hand-roll binary exponentiation |

### Java / C++ specifics (the part Python hides from you)

```java
// BUG: n = Integer.MIN_VALUE (-2147483648)
int exp = -n;                    // wraps back to -2147483648!
// Math.abs(n) is ALSO broken: returns Integer.MIN_VALUE.

// FIX: widen to 64-bit BEFORE negating
long exp = n;
if (exp < 0) {
    x = 1.0 / x;
    exp = -exp;                  // |exp| <= 2^31 fits easily in long
}
```

```cpp
long long exp = n;               // same fix in C++
if (exp < 0) { x = 1.0 / x; exp = -exp; }
// Also: (-3) % 2 == -1 in C++ (truncation toward zero), and >> on a
// negative int is implementation-defined before C++20 — normalize the
// exponent to a positive wide type before any bit tricks.
```

---

## 9. Test Cases to Propose Out Loud

State these before or right after coding — it signals edge-case discipline:

| # | Input | Expected | Why it matters |
|---|---|---|---|
| 1 | `x=2.0, n=10` | `1024.0` | Official; even `n`, multi-bit exponent |
| 2 | `x=2.10000, n=3` | `9.26100` | Official; odd `n`, fractional base |
| 3 | `x=2.0, n=-2` | `0.25` | Official; negative exponent → reciprocal path |
| 4 | `x=5.0, n=0` | `1.0` | Identity exponent; loop never runs / base case |
| 5 | `x=2.0, n=-2147483648` | `0.0` (underflow) | The INT_MIN landmine; 31 zero bits then one |
| 6 | `x=-1.0, n=2147483647` | `-1.0` | All-bits-set odd exponent; negative-base parity |
| 7 | `x=-2.0, n=5` | `-32.0` | Odd exponent with negative base (sign correctness) |
| 8 | `x=0.0, n=3` | `0.0` | Zero base allowed since `n > 0`; never divides by zero |

Quick sanity harness (using `**` only as an *oracle*, not as the solution):

```python
import math
for x, n in [(2.0, 10), (2.1, 3), (2.0, -2), (-2.0, 5), (2.0, -2**31)]:
    assert math.isclose(myPow(x, n), x ** n, rel_tol=1e-12, abs_tol=1e-12)
```

Never assert with `==` on floats.

---

## 10. Transferable Patterns & Related Problems

| Problem / pattern | Connection |
|---|---|
| **LC 372 — Super Pow** | Same algorithm, plus a modulus and the exponent given as a digit array |
| **LC 1922 — Count Good Numbers** | Counting problem whose whole difficulty is a fast modular power |
| **LC 29 — Divide Two Integers** | Sibling "doubling/bit-shifts" problem with the *same* INT_MIN pitfalls |
| **LC 69 — Sqrt(x)** | Same halving-the-search family |
| **Matrix exponentiation** (Fibonacci in O(log n), linear recurrences, LC 509/70 follow-ups) | The identical squaring trick applied to matrices — valid because matrix multiplication is associative and has an identity |
| **Binary lifting / k-th ancestor / sparse tables** | The same "precompute powers of two" doubling idea on trees and arrays |

The general principle worth saying in an interview: *binary exponentiation works for any associative operation with an identity element* — numbers, matrices, permutations, function composition. Modular exponentiation (a^b mod m) is the workhorse behind nearly every number-theory problem (Fermat's little theorem inverses, combinatorics with mod).

---

## 11. Full Interview Talk Track (Script)

> "Let me restate: given a double base and a 32-bit integer exponent, compute the power without library `pow`. Two things jump out immediately. First, `n` can be about 2.1 billion in magnitude, so any loop that multiplies `n` times is dead on arrival — I need logarithmic. Second, the int range is asymmetric: `n` can be −2^31 but not +2^31, which is a classic negation-overflow trap when I normalize a negative exponent.
>
> Brute force: accumulate `x`, `|n|` times, reciprocal if negative. Fine for the examples, but 2.1 billion multiplications is a TLE.
>
> The insight: halve the exponent instead of decrementing it. For even `n`, `x^n = (x^(n/2))²`; for odd `n`, one extra factor of `x`. Equivalently, `x^n` is the product of `x^(2^k)` over the set bits of `n` — e.g., `2^10 = 2^8 · 2^2`. So it's ~31 squarings plus one multiply per set bit.
>
> I'll implement it iteratively for O(1) space. If `n` is negative, flip `x` to `1/x` and make `n` positive — in Java or C++ I'd widen `n` to 64 bits *first*, because −(−2^31) overflows a 32-bit int; Python can't overflow, but I want to flag that difference. Then loop while `n`: if the low bit is set, multiply it into the result; square `x`; shift `n` right. Invariant: true answer equals `result · x^(remaining n)`, so when `n` hits zero, `result` is the answer.
>
> Sanity check on the examples: `2^10 = 1010₂ → 2² · 2⁸ = 4 · 256 = 1024`. And `n = −2` normalizes to base 0.5, exponent 2 → 0.25. ✓
>
> Edge cases: `n = 0` → 1.0; negative base — the sign falls out of the multiplications, no special case; `x = 0` with `n > 0` → 0, and the constraints promise I never see `0^0` or `0^negative`, so my reciprocal step can't divide by zero; and `n = INT_MIN`, covered by the widening trick.
>
> Complexity: O(log |n|) time, at most ~32 iterations for any 32-bit exponent, O(1) space. It's optimal up to constants — each multiplication at most doubles the largest exponent I can have built, so log₂ n multiplications is a floor for any method.
>
> Tests I'd run: the three official examples, `n = 0`, `x = 2, n = INT_MIN` (expect ≈ 0.0), `x = −1, n = 2^31 − 1` (odd → −1.0), `x = −2, n = 5` (parity), comparing with `math.isclose`, never `==`."

---

## 12. Say It in 60 Seconds

> "`n` can be 2.1 billion in magnitude, so O(n) multiplying is out — I need O(log n). The insight: halve the exponent instead of decrementing it — `x^n` equals `(x^(n/2))²` for even `n`, times an extra `x` for odd `n`; or in binary, `x^n` is the product of `x^(2^k)` over the set bits of `n`. I'll do it iteratively: if `n` is negative, flip `x` to `1/x` and negate `n` — widening to 64 bits first in Java or C++, because −(−2³¹) overflows an int. Then loop while `n`: if the low bit is set, multiply it into the result; square `x`; shift `n` right. That's at most ~32 iterations, O(1) space, and it's optimal — k multiplications can build at most exponent 2^k. Edge cases: `n = 0` returns 1.0; negative bases work through plain multiplication; `n = INT_MIN` is covered by the widening trick; and the constraints guarantee no `0^0` or division by zero. Quick check: `2^10 = 1010₂ → 2² · 2⁸ = 4 · 256 = 1024`."
