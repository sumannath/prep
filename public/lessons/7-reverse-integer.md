# Reverse Integer (LeetCode 7) — Complete Interview Lesson

## 1. Restating the problem

Given a signed 32-bit integer `x`, return the integer formed by reversing its decimal digits. If the reversal falls outside the signed 32-bit range `[-2^31, 2^31 - 1]`, return `0`. The environment forbids 64-bit integers.

In your own words: *"I pop digits off the low end of `x` and rebuild them into a new number in the opposite order — and the twist is that the rebuilt number might not fit in 32 bits, in which case I must return 0. Since I can't use a wider type to 'just check afterward,' the real problem is predicting overflow before it happens."*

Good clarifying questions to ask out loud:

- "The spec says return **0** on overflow — not clamp to `INT_MAX`/`INT_MIN`, correct?" (Correct, unlike `atoi` which clamps.)
- "Input is guaranteed to already fit in 32 bits, right?" (Yes, per constraints.)
- "Trailing zeros just disappear, e.g. `120 → 21`, not `021`?" (Yes — output is an integer.)
- "So the intent is that I detect overflow **without** a wider intermediate type — that's the actual exercise?" (Yes. In Python, ints are arbitrary-precision, so honoring this constraint is a deliberate discipline choice — but it's exactly what makes your solution portable to Java/C++.)

---

## 2. Decoding the constraints

| Constraint | What it really means |
|---|---|
| Signed 32-bit range | `INT_MAX = 2,147,483,647`, `INT_MIN = -2,147,483,648`. Memorize both, and note their **last digits**: 7 for the max, 8 for the min. Those digits drive the boundary check. |
| Return 0 on overflow | Output may legitimately not exist; overflow is a *result-level* failure, not an error to throw. |
| No 64-bit integers | You cannot compute the reversal first and compare after — `rev * 10 + pop` itself is the dangerous operation. You must **predict** overflow from `(rev, pop)` *before* the push. |
| `\|x\|` has at most 10 digits | Any 9-digit-or-smaller reversal fits (max 9-digit value is 999,999,999 < INT_MAX), so **overflow is only possible when `\|x\|` has 10 digits**. A useful sanity lever when reasoning about edge cases. |

---

## 3. Baseline: brute force (string round-trip)

Convert to a string, reverse it, convert back, range-check.

```python
def reverse(x: int) -> int:
    INT_MIN, INT_MAX = -2**31, 2**31 - 1
    sign = -1 if x < 0 else 1
    rev = sign * int(str(abs(x))[::-1])
    return rev if INT_MIN <= rev <= INT_MAX else 0
```

**Worked trace, `x = -123`:**

| Step | Action | State |
|---|---|---|
| 1 | Extract sign | `sign = -1` |
| 2 | Absolute value | `abs(x) = 123` |
| 3 | Stringify | `"123"` |
| 4 | Reverse | `"321"` |
| 5 | Parse | `321` |
| 6 | Reapply sign | `-321` |
| 7 | Range check: `-2^31 ≤ -321 ≤ 2^31 - 1` ✓ | return `-321` |

For `x = 120`: `"120"` → `"021"` → `int("021") = 21` (Python's parser drops the leading zero, so it happens to work).

**Why this can't be your final answer:**

- It **violates the stated constraint**: in a real 32-bit environment, parsing `"9646324351"` (the reversal of LeetCode's overflow test `1534236469`) cannot even be represented. C++'s `std::stoi` throws `std::out_of_range`; Java's `Integer.parseInt` throws `NumberFormatException` — catching exceptions for flow control is an interview smell.
- In Python it *passes* only because Python ints are arbitrary precision. The interviewer will (rightly) say "now do it without that crutch."

Complexity: **O(d)** time and **O(d)** space for the string, where `d` = digit count ≤ 10.

---

## 4. The core insight

Two observations unlock the problem:

1. **Digits come off `x` in exactly the order they should be attached to the answer.** The low-order digit of `x` becomes the high-order digit of the reversal. So a simple loop works:
   - pop: `pop = x % 10; x //= 10`
   - push: `rev = rev * 10 + pop`

2. **Overflow must be detected *before* the push, from `(rev, pop)` alone.** Since `INT_MAX = 2,147,483,647 = 214748364·10 + 7`:
   - If `rev > 214748364`, then `rev * 10 ≥ 2,147,483,650 > INT_MAX` — overflow **no matter what digit comes next**.
   - If `rev == 214748364`, then `rev * 10 = 2,147,483,640`, leaving room for a final digit of at most **7**; `pop > 7` overflows.

That's the entire problem. Everything else is sign handling and language traps.

---

## 5. Optimal solution: pop-and-push with a pre-emptive overflow check

### Python implementation (sign-separated)

```python
def reverse(x: int) -> int:
    INT_MAX = 2**31 - 1        #  2147483647
    LIMIT = INT_MAX // 10      #  214748364
    LAST_DIGIT = INT_MAX % 10  #  7

    sign = -1 if x < 0 else 1
    n = abs(x)                 # safe in Python (big ints); see Java/C++ gotchas

    rev = 0
    while n != 0:
        n, pop = divmod(n, 10)

        # Overflow pre-check: BEFORE rev * 10 + pop is ever computed.
        if rev > LIMIT or (rev == LIMIT and pop > LAST_DIGIT):
            return 0

        rev = rev * 10 + pop

    return sign * rev
```

Why sign separation in Python specifically: Python's `%` on a negative operand returns a non-negative result and `//` floors toward −∞, so `-123 % 10 == 7` and `-123 // 10 == -13` — the naive loop would silently mangle negatives. Stripping the sign up front keeps every intermediate value non-negative. (Java/C++ don't have this trap: their `/` and `%` truncate toward zero, so the sign flows through the loop naturally.)

### Trace on the official examples

**`x = 123`** (`sign = +1`, `n = 123`):

| Iter | `n` in | `pop` | `n` out | `rev` in | Check | `rev` out |
|---|---|---|---|---|---|---|
| 1 | 123 | 3 | 12 | 0 | 0 ≤ 214748364 ✓ | 3 |
| 2 | 12 | 2 | 1 | 3 | ✓ | 32 |
| 3 | 1 | 1 | 0 | 32 | ✓ | **321** |

Return `321`. **`x = -123`** runs the identical table on `n = 123`, then returns `-321`.

**`x = 120`:**

| Iter | `pop` | `rev` out |
|---|---|---|
| 1 | 0 | 0 |
| 2 | 2 | 2 |
| 3 | 1 | **21** |

Trailing zeros vanish for free: we build a *number*, not a string, so `0 × 10 + 0 = 0`.

### Trace on the two inputs every interviewer probes

**`x = 1463847412`** — the largest successfully reversible input:

| Iter | `pop` | `rev` |
|---|---|---|
| 1–8 | 2,1,4,7,4,8,3,6 | 2 → 21 → 214 → 2147 → 21474 → 214748 → 2147483 → 21474836 |
| 9 | 4 | **214748364** (== `LIMIT`) |
| 10 | 1 | check: `rev == LIMIT` and `pop = 1 ≤ 7` ✓ → rev = **2147483641** ✓ (≤ INT_MAX) |

This is why the condition must be `rev > LIMIT or (rev == LIMIT and pop > 7)` — writing `rev >= LIMIT` wrongly rejects this input.

**`x = 1534236469`** — the classic overflow test:

| Iter | `pop` | `rev` |
|---|---|---|
| 1–9 | 9,6,4,6,3,2,4,3,5 | 9 → … → **964632435** |
| 10 | 1 | check: `964632435 > 214748364` → **return 0** |

(The true reversal, 9,646,324,351, exceeds INT_MAX — caught *before* the push.)

### Why the check is airtight

Invariant: after every push, `rev ≤ INT_MAX`. Proof sketch: entering a push, the check guarantees `rev ≤ 214748364`. If `rev ≤ 214748363`, the new value is at most `2147483639 < INT_MAX`; if `rev == 214748364`, the check forces `pop ≤ 7`, so the new value is at most `2147483647 = INT_MAX`. Hence overflow can only be *refused*, never committed — and note only a **10th** push can ever fail, since nine pushes cap out at 999,999,999.

Deep nugget worth volunteering: the `pop > 7` branch is actually **provably unreachable** for valid 32-bit inputs. `rev == 214748364` after nine pops forces `x`'s low nine digits to be `214748364`, and the only 10-digit 32-bit value with that suffix is `1214748364`, whose tenth pop is `1`. Keep the check anyway — it's defense-in-depth and it's what a reviewer expects. (The mirror-image negative branch has the same property.)

### Porting to C-style semantics (for the "no sign separation" variant)

If you port directly from Java/C++ (where pops carry the sign), the negative side needs its own mirrored constants — with one trap: **C truncation** gives `INT_MIN / 10 == -214748364` (remainder `-8`), but Python's `//` floors, so `(-2**31) // 10 == -214748365` — off by one. Compute the constant with truncation, e.g. `int(-2**31 / 10)`, and use `math.fmod` + `int(x / 10)` for the pops (exact here, since |x| ≤ 2³¹ fits a float's 53-bit mantissa):

```python
import math

def reverse(x: int) -> int:
    POS_LIMIT, NEG_LIMIT = 214748364, -214748364   # trunc(INT_MAX/10), trunc(INT_MIN/10)
    rev = 0
    while x != 0:
        pop = int(math.fmod(x, 10))   # C-style: sign preserved, truncates toward zero
        x = int(x / 10)               # NOT x // 10 (floors toward -inf)
        if rev > POS_LIMIT or (rev == POS_LIMIT and pop > 7):
            return 0
        if rev < NEG_LIMIT or (rev == NEG_LIMIT and pop < -8):
            return 0
        rev = rev * 10 + pop
    return rev
```

---

## 6. Complexity

| Approach | Time | Space | Notes |
|---|---|---|---|
| String round-trip | O(d) | O(d) | String + parse buffer; throws in fixed-width languages |
| Pop-and-push (optimal) | O(d) | O(1) | One pass, no auxiliary buffer |

`d` = number of decimal digits = `⌊log₁₀|x|⌋ + 1 ≤ 10`, so both are **O(log₁₀ |x|)** in terms of the numeric value, effectively O(1) for this fixed type. Time is justified: each iteration strips exactly one digit with O(1) work, and each digit is read once and written once. Lower bound: **Ω(d)** — every digit of `x` lands in a distinct output position (the k-th least-significant input digit becomes the k-th most-significant output digit), so any correct algorithm must inspect all of them; missing even the last digit can flip the leading output digit or the overflow verdict.

---

## 7. Common mistakes (rank-ordered by interview damage)

1. **Checking overflow *after* the push** (`if rev > INT_MAX: return 0`). In C/C++, signed overflow in `rev * 10 + pop` is **undefined behavior**; in Java it silently wraps to garbage. The check must precede the arithmetic — that's the entire point of the problem.
2. **Python's negative `%`/`//` semantics**: `-123 % 10 == 7`, `-123 // 10 == -13`. Using them unguarded corrupts the loop for any negative input. Fix with sign separation (preferred) or `math.fmod`/`int(x / 10)`.
3. **`abs(INT_MIN)`**: see gotchas table below — a silent landmine in Java and UB in C++.
4. **Boundary off-by-one**: using `rev >= LIMIT` (breaks `1463847412 → 2147483641`) or forgetting the `rev == LIMIT` branch entirely (misses `pop == 8/9` overflows in wider-type variants).
5. **Translating `INT_MIN / 10` with Python `//`**: `-214748365` instead of the truncated `-214748364` — one digit of error that breaks the mirrored check.
6. **Sign bugs**: forgetting to reapply the sign, or applying it before the loop and then using Python's floored ops.
7. **Cheating with `long`** (Java solutions on LeetCode do this). It passes the judge but dodges the tested skill; the interviewer will ask for the 32-bit-proof version anyway.

### Java / C++ gotchas

| Language | Gotcha |
|---|---|
| Java | `Math.abs(Integer.MIN_VALUE)` returns `Integer.MIN_VALUE` (still negative — the absolute value doesn't fit). Your "strip the sign" logic silently misfires. Guard with `if (x == Integer.MIN_VALUE) return 0;` — its reversal (8,463,847,412) always overflows. |
| C++ | Signed overflow is UB, so a check-after-push can be optimized away or trap; also `std::abs(INT_MIN)` is UB. Pre-check or bust. |
| C++ (brute force) | `std::stoi` throws `std::out_of_range` on `"9646324351"`; if you must present the string version, guard it (try/catch or length/lexicographic pre-compare). |
| Java / C++ (positives) | `/` and `%` truncate toward zero (`-123 % 10 == -3`), so a sign-carrying loop is natural there — don't cargo-cult the Python abs-and-sign structure without handling `MIN_VALUE` first. |

---

## 8. Test cases to propose out loud

State these *before* coding — it signals you've decoded the constraints:

| Input | Expected | What it probes |
|---|---|---|
| `123` | `321` | Official example, basic mechanics |
| `-123` | `-321` | Official, sign handling |
| `120` | `21` | Official, trailing zeros |
| `0` | `0` | Loop never executes |
| `7` | `7` | Single digit |
| `10` | `1` | Trailing zero only |
| `1463847412` | `2147483641` | Largest success; exercises the `rev == LIMIT, pop ≤ 7` boundary |
| `-1463847412` | `-2147483641` | Negative boundary success |
| `1534236469` | `0` | Overflow via `rev > LIMIT` branch |
| `2147483647` (INT_MAX) | `0` | Reversal `7463847412` overflows |
| `-2147483648` (INT_MIN) | `0` | The `abs()` landmine; reversal `8463847412` overflows |

Minimum spoken set: the three official examples, plus `0`, `1463847412`, `1534236469`, and `INT_MIN`.

---

## 9. Transferable patterns & related problems

The meta-lesson: when arithmetic may leave the representable domain, you have three escapes — **(a)** widen the type, **(b)** detect overflow *before* the operation via inequalities, **(c)** change representation (string/array of digits). This problem bans (a), so it drills (b); several related problems drill (c).

| Pattern | Where it reappears |
|---|---|
| Digit-extraction loop (`% 10`, `// 10`) | Palindrome Number (LC 9), Add Digits (LC 258), Happy Number (LC 202), Happy Number-style cycles |
| Pre-emptive overflow check (test `rev > LIMIT / rev == LIMIT` before the op) | String to Integer `atoi` (LC 8, which *clamps* rather than zeroes), Divide Two Integers (LC 29) |
| Incremental rebuild `rev = rev * 10 + pop` | Palindrome Number — reversing only *half* the digits sidesteps overflow entirely; a great follow-up answer here |
| Digits-in-a-buffer instead of a numeric type | Add Strings (LC 415), Multiply Strings (LC 43), Add Two Numbers (LC 2) |

**Fuller narration script (while coding):** *"I'll pop the last digit with mod-10 and push it onto a running result with `rev = rev*10 + pop` — the low digits of `x` arrive in exactly the order they become high digits of the answer, so trailing zeros disappear naturally. The one thing I can't do is compute first and check after, because the push itself overflows and that's UB in C++ / wraps in Java. So before each push I ask: is `rev` already above `INT_MAX / 10`, i.e. 214748364? Then `rev * 10` overflows regardless of the next digit. Is `rev` exactly 214748364? Then only a popped digit ≤ 7 fits, since INT_MAX ends in 7. In Python I strip the sign first because Python floors division — `-123 % 10` is 7, which would corrupt the loop. Every intermediate stays within 32 bits by this invariant, so the returned value is valid or I return 0. One pass over at most ten digits, constant space. I'd verify with the three official examples, zero, the boundary success `1463847412 → 2147483641`, the overflow `1534236469 → 0`, and INT_MIN."*

---

## 10. Say it in 60 seconds

> "Reverse Integer: I pop digits off the low end of `x` with mod-10 and push them onto a running result with `rev = rev*10 + pop` — low digits of the input come off in exactly the order they become high digits of the answer, so trailing zeros vanish for free. The twist is I can't use 64-bit ints, so I can't reverse-then-check; the push itself would overflow. Instead I predict it: since INT_MAX is 2,147,483,647, if my running `rev` is already above 214748364, then `rev*10` overflows no matter what comes next; and if `rev` is exactly 214748364, the push is safe only if the popped digit is at most 7. In Python I strip the sign up front and work on the absolute value, because Python floors division and keeps modulo non-negative — `-123 % 10` is 7, which would corrupt the loop. The pre-check guarantees every intermediate fits in 32 bits, so I return `rev` with its sign, or 0 if any push would have overflowed. One pass over at most ten digits, O(1) space. Key tests: 123, −123, 120, zero, the boundary success 1463847412 → 2147483641, the overflow 1534236469 → 0, and INT_MIN."
