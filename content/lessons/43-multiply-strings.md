# Multiply Strings (LeetCode 43) — Complete Interview Lesson

## 1. Problem Restatement

**In your own words (say this in the interview):** "I'm given two non-negative integers as decimal strings — up to 200 digits each — and I must return their product, also as a string. The catch is I can't materialize either number as a native integer or reach for a bignum library; I have to implement the arithmetic myself on the digits."

**Clarifying questions worth asking out loud:**

| Question | Answer (from constraints) | Implication |
|---|---|---|
| Can inputs be zero? | Yes — `"0"` itself | Need an explicit zero path |
| Any signs? | No, non-negative, digits only | No sign parsing; magnitude-only logic |
| Leading zeros? | None, except `"0"` itself | The string `"0"` is the *only* zero representation → a simple `== "0"` guard is safe |
| How big can results get? | Up to 400 digits | Output itself can't fit in a machine integer either |

## 2. Decoding the Constraints

- **200 digits ⇒ native integers are hopeless.** A 200-digit number can be nearly 10²⁰⁰. Even an *unsigned* 64-bit integer tops out at 2⁶⁴ ≈ 1.84 × 10¹⁹ — under 20 digits. So this problem is fundamentally about digit-array arithmetic, and in fixed-width languages (Java, C++, Go) no cast or trick even exists.
- **Why Python is a trap here:** Python's `int` is arbitrary-precision, so `str(int(num1) * int(num2))` *works* — and is exactly what the problem bans. If you write it, the interviewer learns you skipped the entire point. (Per-digit conversion like `int(num1[i])` is fine and universally accepted — the ban is on converting the *whole number*.)
- **Why O(n·m) is the expected bar:** 200 × 200 = 40,000 digit multiplications. Even the "sloppy" schoolbook simulation is under ~10⁵ elementary operations. The interview is testing *clean, correct digit manipulation*, not asymptotic cleverness. (Karatsuba/FFT exist — see §10 — but are never expected by hand.)
- **No leading zeros ⇒ two free guarantees:** (a) zero input is exactly `"0"`; (b) in the output buffer (see §4), **at most one leading cell can be zero**, because num1 ≥ 10ⁿ⁻¹ and num2 ≥ 10ᵐ⁻¹, so the product ≥ 10ⁿ⁺ᵐ⁻² has at least n+m−1 digits.

## 3. Brute Force: Simulate the Paper Algorithm

### 3.1 First, a trap

"Brute force" does **not** mean *add num1 to itself num2 times*. num2's *value* can be ~10²⁰⁰, so that's ~10²⁰⁰ additions — astronomically infeasible. The correct baseline is the algorithm you'd do on paper: **partial products, shifts, then string addition.**

### 3.2 The algorithm

For each digit of `num2` (right to left): multiply all of `num1` by that single digit (a mini carry pass), append zeros for the shift, and string-add into a running total.

```python
def add_strings(a: str, b: str) -> str:
    i, j, carry = len(a) - 1, len(b) - 1, 0
    out = []
    while i >= 0 or j >= 0 or carry:
        total = carry
        if i >= 0: total += ord(a[i]) - 48; i -= 1   # 48 == ord('0')
        if j >= 0: total += ord(b[j]) - 48; j -= 1
        out.append(chr(total % 10 + 48))
        carry = total // 10
    return "".join(reversed(out))

def multiply_brute(num1: str, num2: str) -> str:
    if num1 == "0" or num2 == "0":
        return "0"
    result = "0"
    for j in range(len(num2) - 1, -1, -1):           # rightmost digit of num2 first
        d2 = ord(num2[j]) - 48
        digits, carry = [], 0
        for i in range(len(num1) - 1, -1, -1):       # num1 × single digit
            total = (ord(num1[i]) - 48) * d2 + carry
            digits.append(chr(total % 10 + 48))
            carry = total // 10
        if carry:
            digits.append(chr(carry + 48))
        partial = "".join(reversed(digits)) + "0" * (len(num2) - 1 - j)  # the shift
        result = add_strings(result, partial)
    return result
```

### 3.3 Worked trace: `num1 = "123"`, `num2 = "456"`

| Step | Digit of num2 | Single-digit multiply | Shift | Running sum |
|---|---|---|---|---|
| 1 | 6 (j=2, shift 0) | 3·6=18→8 c1; 2·6+1=13→3 c1; 1·6+1=7→"**738**" | `738` | `738` |
| 2 | 5 (j=1, shift 1) | 3·5=15→5 c1; 2·5+1=11→1 c1; 1·5+1=6→"**615**" | `6150` | `738 + 6150 = 6888` |
| 3 | 4 (j=0, shift 2) | 3·4=12→2 c1; 2·4+1=9→"**492**" | `49200` | `6888 + 49200 = 56088` ✓ |

The final addition, column by column (right to left, with padding): `8+0=8`, `8+0=8`, `8+2=10→0 c1`, `6+9+1=16→6 c1`, `0+4+1=5` → **`"56088"`**. ✓

### 3.4 Cost

- m partial products, each built in O(n) → **O(n·m)**.
- m string additions over columns of length ≤ n+m → **O(m·(n+m))**.
- Total: **O(n·m + m·(n+m))** time, O(n+m) space. Fine at n=m=200 — but it needs three helpers (single-digit multiply, shift, add), each a bug surface.

## 4. The Core Insight

Writing out the paper algorithm reveals that the partial products are a **detour**. What multiplication actually *is*, digit-wise:

> **The sum-of-indices rule.** The digit at position `i` of `num1` times the digit at position `j` of `num2` contributes **exactly** to position `i + j` (counting from the right) of the product — because the place values multiply: 10^a × 10^b = 10^(a+b).

Two consequences:

1. **Fixed output size.** num1 < 10ⁿ and num2 < 10ᵐ, so num1·num2 < 10ⁿ⁺ᵐ → the product has **at most n + m digits**. Allocate exactly that; no dynamic resizing.
2. **One array, one carry pass.** Instead of building and adding partial strings, throw every digit product directly into an array slot keyed by the sum of positions — a *convolution* — then normalize all slots with carries in a single right-to-left sweep.

**Index bookkeeping (the #1 bug source — be precise):** with 0-based indexing **from the left**, digit `num1[i]` has place 10^(n−1−i) and `num2[j]` has place 10^(m−1−j). Their product's exponent is (n−1−i)+(m−1−j) = n+m−2−i−j, which in an (n+m)-length buffer indexed from the left (slot `k` ⇔ place 10^(n+m−1−k)) is slot:

```
k = i + j + 1
```

(Equivalently: reverse both strings and use `i + j`. Pick one convention, derive it once, never mix them.)

**"Duplicates" are the point, not a bug:** many (i, j) pairs map to the same slot. For n=m=3, slots 1..5 receive 1, 2, 3, 2, 1 products respectively (total 9 = 3×3). Also note **slot `res[k]` holds a running *sum*, not a digit**, until the carry pass — a cell may hold up to 81·min(n,m) + carry ≈ 16,200 + 1,800 = 18,000 (the carry is self-bounded by C = (16200 + C)/10 ⇒ C ≤ 1800). That fits trivially in a 32-bit `int` — important for Java/C++.

## 5. Optimal Approach: Accumulate, Then Carry

Three clean phases: **guard zeros → accumulate products → resolve carries → strip the (at most one) leading zero.**

```python
def multiply(num1: str, num2: str) -> str:
    # Guard: anything times zero is zero. Also prevents returning "" after stripping.
    if num1 == "0" or num2 == "0":
        return "0"

    n, m = len(num1), len(num2)
    A = [ord(c) - 48 for c in num1]        # digit values, left to right
    B = [ord(c) - 48 for c in num2]
    res = [0] * (n + m)                    # res[k] ⇔ place 10^(n+m-1-k)

    # Phase 1: every digit product lands at slot i + j + 1 (sum-of-indices rule).
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            res[i + j + 1] += A[i] * B[j]

    # Phase 2: ONE right-to-left carry pass normalizes every slot to a digit.
    carry = 0
    for k in range(n + m - 1, -1, -1):
        total = res[k] + carry             # max ≈ 18,000: safe even in 32-bit int
        res[k] = total % 10
        carry = total // 10
    # carry == 0 is guaranteed: the product fits in n + m digits.

    # Phase 3: strip leading zeros (keep at least one digit).
    start = 0
    while start < n + m - 1 and res[start] == 0:
        start += 1
    return "".join(map(str, res[start:]))
```

Notes: the Phase-1 loop order is irrelevant (additions commute); only the carry pass must be right-to-left, because carry flows toward more significant digits.

### 5.1 Trace — Example 1: `"2" × "3"`

n=m=1, `res = [0, 0]`.
- Phase 1: i=0, j=0 → `res[0+0+1] += 2·3 = 6` → `res = [0, 6]`.
- Phase 2: k=1: 6 → digit 6, carry 0; k=0: 0 → digit 0. `res = [0, 6]`.
- Phase 3: strip slot 0 → **`"6"`** ✓

### 5.2 Trace — Example 2: `"123" × "456"` (n=m=3, `res` has 6 slots)

**Phase 1 — accumulate (slot = i + j + 1):**

| i (digit) | j (digit) | product → slot |
|---|---|---|
| 0 (1) | 0 (4), 1 (5), 2 (6) | 4→res[1], 5→res[2], 6→res[3] |
| 1 (2) | 0 (4), 1 (5), 2 (6) | 8→res[2], 10→res[3], 12→res[4] |
| 2 (3) | 0 (4), 1 (5), 2 (6) | 12→res[3], 15→res[4], 18→res[5] |

After accumulation: `res = [0, 4, 13, 28, 27, 18]` ← note slots **exceed 9**; this is correct and expected.

**Phase 2 — carry, right to left:**

| k | res[k] + carry | digit written | carry out |
|---|---|---|---|
| 5 | 18 | 8 | 1 |
| 4 | 27 + 1 = 28 | 8 | 2 |
| 3 | 28 + 2 = 30 | 0 | 3 |
| 2 | 13 + 3 = 16 | 6 | 1 |
| 1 | 4 + 1 = 5 | 5 | 0 |
| 0 | 0 + 0 = 0 | 0 | 0 |

`res = [0, 5, 6, 0, 8, 8]` → strip slot 0 → **`"56088"`** ✓ (and slot 0 was the only possible zero, per §2).

**Variant you'll see in editorials (fused carry):** replace Phase 1+2 with `total = A[i]*B[j] + res[i+j+1]; res[i+j+1] = total % 10; res[i+j] += total // 10` inside the double loop. It's correct — every carry into slot k lands before slot k's final normalization under this loop order — but cells transiently exceed 9 and it's much harder to reason about. Prefer two-phase in an interview; mention the variant to show range.

## 6. Complexity

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Repeated addition (add num1, num2 times) | O(value(num2) · n) | — | Infeasible: value(num2) up to ~10²⁰⁰ |
| Schoolbook w/ partial products (§3) | O(n·m + m·(n+m)) | O(n+m) | Three helper functions; bug-prone |
| **Accumulate + carry pass (§5)** | **O(n·m)** | **O(n+m)** | ≤ 40,000 digit-products at max size; output itself is Θ(n+m) so space is essentially forced |
| Karatsuba (follow-up) | O(n^1.585) | O(n) | Splits each number in half and needs only **3** half-size multiplications instead of 4 via an algebraic identity, so T(n) = 3T(n/2) + O(n) = O(n^log₂3) ≈ O(n^1.585) by the Master Theorem |
| FFT-based (follow-up) | O(n log n log log n); O(n log n) achievable (Harvey–van der Hoeven, 2021) | O(n) | Digit vectors multiply exactly like polynomial coefficients (the i+j rule *is* convolution), and FFT computes a convolution in O(n log n) via the point-value domain |
| Trivial lower bound | Ω(n+m) | — | Any correct algorithm must read every digit, since flipping a single input digit can change the product |

## 7. Implementation Gotchas by Language

**Python**
- `''.join(map(str, digits))` — never `s += str(d)` in a loop (quadratic copying).
- `ord(c) - 48` or `int(c)` per character is fine; `int(num1)` on the whole string is the banned move.

**Java**
- `int[] res = new int[n + m]` is safe — max cell ≈ 18,000, nowhere near `Integer.MAX_VALUE` (≈ 2.1 × 10⁹); extract digits with `num1.charAt(i) - '0'`.
- Build output with `StringBuilder` (plain `String` concatenation in a loop is O(k²)); avoid `ArrayList<Integer>` — autoboxing turns every accumulate into allocation churn; and `BigInteger` is explicitly banned.

**C++**
- `vector<int> res(n + m, 0)`; digits via `num1[i] - '0'`.
- When emitting, normalize with `% 10` **before** writing `'0' + d` — adding `'0'` to a value > 9 produces a nonsense character; since `res` is already most-significant-first, no reversal is needed.

## 8. Common Mistakes

| # | Mistake | Symptom / why it bites | Fix |
|---|---|---|---|
| 1 | Target slot `i + j` instead of `i + j + 1` | Everything shifted one place left; off-by-one answers like `"5608.8"`-style garbage | Derive once: places are 10^(n−1−i) and 10^(m−1−j) ⇒ slot (n+m−1)−(n+m−2−i−j) = i+j+1; or reverse strings and use i+j |
| 2 | Missing the `"0"` guard | After stripping, you return `""` (or a wall of zeros if you don't strip) | Early-return `"0"`; also write the strip loop to always keep the last digit |
| 3 | Forgetting to strip leading zeros | `"100" × "100"` → `"010000"` | Strip loop with `while start < len−1 and res[start] == 0` |
| 4 | Carry pass left-to-right | Carries propagate the wrong way; wrong digits | Carry flows toward *more* significant digits ⇒ sweep right→left |
| 5 | Buffer sized `n+m−1` or `max(n,m)` | Last digit dropped/corrupted | Product < 10^(n+m) ⇒ exactly n+m slots |
| 6 | Skipping the carry pass ("join the raw array") | Output contains cells > 9 → wrong-length string like `"0413282718"` | Phase 2 is not optional |
| 7 | Asserting slots ≤ 9 mid-accumulation | False alarm — slots legitimately reach ~18,000 before Phase 2 | Only validate digits after the carry pass |
| 8 | Loop bounds `range(n-1, 0, -1)` | Silently skips the last (most significant) digit | `range(n-1, -1, -1)` |
| 9 | "Testing" with `int(num1) * int(num2)` in the submitted code | Banned; in fixed-width languages it also *can't* work | Use big ints only in a local test harness (§9) |

## 9. Test Plan

**Propose out loud before coding:** "I want a zero case, a single-digit case that forces a carry into the top slot, and a power-of-ten case with internal zeros — plus the official examples."

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | `"2"`, `"3"` | `"6"` | Official Ex. 1: no carry, leading-zero strip |
| 2 | `"123"`, `"456"` | `"56088"` | Official Ex. 2: carries cascading, i+j+1 mapping |
| 3 | `"0"`, `"52340"` | `"0"` | Zero operand ⇒ early return (else `""`) |
| 4 | `"0"`, `"0"` | `"0"` | Both zero |
| 5 | `"9"`, `"9"` | `"81"` | Smallest carry into the top slot of a 2-slot buffer |
| 6 | `"100"`, `"100"` | `"10000"` | Internal zeros; result shorter than n+m; strip logic |
| 7 | `"999"`, `"999"` | `"998001"` | Max per-column sums (81×3), multi-step carries; result length = n+m |
| 8 | `"9"*200`, `"9"*200` | `"9"*199 + "8" + "0"*199 + "1"` | Max constraints: 400-digit output, perf sanity (pattern: (10^k−1)² = (10^k−2)·10^k + 1, check k=2 → 9801) |

**After coding:** run 1–2 first (they exercise every phase), then the rest. **Stress test tip you can say aloud:** "Locally I'd fuzz this against Python's big ints — `assert multiply(a, b) == str(int(a) * int(b))` for random digit strings — the solution itself never calls `int()` on a whole string, only my test harness does."

## 10. Transferable Patterns & Related Problems

**Patterns to bank:**

1. **Simulate arithmetic on digit arrays** whenever values exceed machine integers — works for add, multiply, compare, increment.
2. **Accumulate first, normalize later** (two-phase): decouples *position mapping* from *carry logic*, making each phase provable in one line. Fusing them is shorter but subtler.
3. **Sum-of-indices place mapping** (10^i · 10^j = 10^(i+j)) — the same rule makes digit multiplication a *convolution*, which is exactly polynomial multiplication and the doorway to FFT methods.
4. **Size buffers by bounding the output:** product < 10^(n+m) ⇒ n+m slots (analogous: sum of an n-digit and m-digit number needs at most max(n,m)+1 slots).

**Related problems:**

| Problem | Relationship |
|---|---|
| LC 415 — Add Strings | Same digit-array + carry template, addition version; ideal warm-up |
| LC 67 — Add Binary | Same template, base 2 — shows the base is just a parameter |
| LC 66 — Plus One | Carry-only corner of the template |
| LC 2 / 445 — Add Two Numbers (I & II) | Same index/carry discipline, digits in a linked list |
| LC 43 — Multiply Strings (this) | Convolution of digit arrays + one carry pass |

**Follow-up you should be ready for:** "Can you do better than O(n·m)?" — Answer: yes in theory (Karatsuba, then FFT-based methods — see the table in §6 for why they're faster), but for 200-digit inputs O(n·m) is ~40,000 operations and is what's expected; implementing Karatsuba by hand in an interview is a net negative unless explicitly asked.

## 11. Full Interview Talk Track

1. **(0:00) Restate & clarify.** "Two non-negative numbers as strings, up to 200 digits, return the product as a string without converting the whole inputs to integers or using bignum. 200 digits rules out any 64-bit type — 2⁶⁴ is only ~1.8 × 10¹⁹ — so I'll do digit-array arithmetic. Non-negative and no leading zeros means the only zero input is exactly `'0'`, which gives me a clean guard."
2. **(0:30) Key insight.** "When I multiply by hand, a digit at position i of num1 times a digit at position j of num2 lands at position i+j of the answer, because place values multiply: 10ⁱ·10ʲ = 10^(i+j). So instead of building partial products and adding them, I'll accumulate every pairwise digit product into an array keyed by i+j, then resolve carries once."
3. **(1:00) Sizing & indexing.** "An n-digit times an m-digit number is < 10^(n+m), so I allocate exactly n+m slots. Indexing from the left, the pair (i, j) targets slot i+j+1 — I derived that from place values rather than memorizing it. Many pairs hit the same slot; that's the convolution, and cells will hold sums above 9 until I normalize."
4. **(1:30) Algorithm.** "Three phases: guard zero operands; double loop adding `A[i]*B[j]` into `res[i+j+1]`; one right-to-left carry pass doing mod/div 10. The final carry must be zero because the product fits in n+m digits. Then strip leading zeros — at most one can exist given the no-leading-zero inputs — keeping at least one digit so zero still prints correctly."
5. **(2:00) Complexity.** "O(n·m) time — 40,000 digit products worst case — O(n+m) space, which is just the output."
6. **(2:15) Tests.** "Official examples, plus `"0"×"52340"`, `"9"×"9"` for the top-slot carry, and `"100"×"100"` for internal zeros and stripping; I'd fuzz against Python big ints in a local harness."
7. **(2:30) Follow-up.** "If asked about faster multiplication: Karatsuba gets O(n^1.585) with three half-size multiplications; FFT methods get near-linear by computing the convolution directly — out of scope by hand here."

## 12. Say It in 60 Seconds

> "Both numbers can be 200 digits, so they dwarf any 64-bit integer — I'll simulate grade-school multiplication on a digit array. The key fact is the sum-of-indices rule: the digit at position i of num1 times the digit at position j of num2 belongs at position i+j of the answer, since the place values 10ⁱ and 10ʲ multiply to 10^(i+j). An n-digit times an m-digit number has at most n+m digits, so I allocate an array of that size, loop over every digit pair, and add each product into cell i+j — offset by one when indexing from the left. Cells temporarily hold values above 9, so afterward I do a single right-to-left carry pass, strip the at most one leading zero, and special-case a zero operand up front so I never return an empty string. That's O(n·m) time — at most forty thousand digit products at this size — and O(n+m) space. Tests I'd run: a zero operand, 9×9 for the carry into the top cell, and 100×100 for internal zeros and stripping."
