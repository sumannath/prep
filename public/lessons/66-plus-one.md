# Plus One — Complete DSA Lesson

**LeetCode 66 | Easy | Arrays, Math, Carry Propagation**

---

## 1. Problem Restatement (in your own words)

You're given an array of digits representing a big integer, most-significant digit first. For example, `[1, 2, 3]` represents the number `123`. You must add exactly `1` to this number and return the result as an array of digits in the same format.

The key framing: **this is array-based arbitrary-precision addition**, but simplified because the addend is always `1` — meaning the carry can only ever be `1`, and it propagates leftward only through trailing `9`s.

Two things to say out loud to the interviewer early:

- The input is a *digit array*, not a string or integer — so I can't just convert to `int`, add, and convert back.
- The output may be **longer than the input** (e.g., `[9]` → `[1, 0]`), so I need to think about how to grow the array.

---

## 2. Constraint Decoding

| Constraint | What it actually tells you |
|---|---|
| `1 <= digits.length <= 100` | Up to 100 digits. This number can be **vastly larger than a 64-bit integer** (which holds ~19 decimal digits). So converting to `int`/`long` is *not* a valid general solution — this is the trap the problem is testing. |
| `0 <= digits[i] <= 9` | Every element is a single decimal digit. No validation needed; no negative numbers. |
| No leading `0's` | The input never starts with `0` — so the number is well-formed. But note: the **output** *can* have an internal/leading structure like `[1, 0]` produced by an overflow; that's not a "leading zero" in the invalid sense, it's a legitimate digit. Don't confuse these. |
| Addend is always `1` | The carry can only be `0` or `1` — never anything else. This is what makes the problem easier than generic "Add Two Numbers" style addition. |

**Precision about indices vs. values:** `digits[i]` is the *value* stored at index `i`. The number reads left-to-right, most-significant first, so index `0` is the *most* significant digit and index `n - 1` is the *least* significant digit (the ones place). Addition starts at the **right end**, i.e., index `n - 1`.

---

## 3. Brute Force (and why it fails)

### The naive idea: convert → add → convert back

```python
def plusOne_bruteforce(digits):
    num = int("".join(map(str, digits)))  # treat digits as a decimal string
    num += 1
    return [int(ch) for ch in str(num)]
```

### Worked trace on `digits = [1, 2, 3]`

1. `"".join(map(str, digits))` → `"123"`
2. `int("123")` → `123`
3. `123 + 1` → `124`
4. `str(124)` → `"124"` → `[1, 2, 4]` ✅

### Why it's not acceptable as the *intended* answer

- **In Python it happens to work** because Python integers are arbitrary precision. But in **Java/C++/most languages**, an `int`/`long` overflows for inputs longer than ~19 digits — and the constraint allows up to 100 digits. In an interview, writing `long.parseLong(...)` is a red flag answer.
- Even in Python, it's a "cheat": it sidesteps the actual algorithmic skill being tested (carry propagation) and uses string conversion (`O(n)` extra space, plus big-int arithmetic cost).
- If the interviewer generalizes the problem ("now add `k`" or "add two such arrays"), the convert-and-add approach collapses immediately.

**Use the brute force only as a sanity check / conversation starter, then pivot to the real solution.**

---

## 4. The Core Insight

Adding 1 to a number only changes **the trailing run of 9's**:

- If the last digit is not `9`, you just increment it. Done. (`[1,2,3]` → `[1,2,4]`)
- If there's a trailing run of `9`s, each becomes `0` and the carry (`1`) propagates left until it hits a digit that isn't `9` — which gets incremented. (`[4,3,9,9]` → `[4,4,0,0]`)
- If **every** digit is `9` (e.g., `[9,9,9]`), the carry falls off the left end: all digits become `0` and a `1` is prepended. (`[9,9,9]` → `[1,0,0,0]`)

So the algorithm is: **scan from right to left; on the first non-9 digit, increment it and stop; if you never find one, prepend a 1.**

This also gives an elegant "early exit" property: the loop returns in the *first* iteration for almost all inputs — expected work is `O(1)` for random inputs, worst case `O(n)` only for all-9 inputs.

---

## 5. Optimal Approach: Right-to-Left Carry Propagation

### Algorithm

```
1. For i from n-1 down to 0:
     a. If digits[i] < 9:  digits[i] += 1; return digits.      # carry absorbed
     b. Else (digits[i] == 9): digits[i] = 0.                   # carry continues left
2. If the loop finished, every digit was 9.
   All digits are now 0. Return [1] + digits.                   # overflow case
```

### Python implementation (in-place, returns a new list only on overflow)

```python
from typing import List

class Solution:
    def plusOne(self, digits: List[int]) -> List[int]:
        n = len(digits)
        for i in range(n - 1, -1, -1):   # rightmost digit first
            if digits[i] < 9:
                digits[i] += 1           # carry absorbed here; stop
                return digits
            digits[i] = 0                # digit was 9 → becomes 0, carry moves left
        # Every digit was 9: e.g., [9,9,9] -> [0,0,0] -> need [1,0,0,0]
        return [1] + digits
```

### Traces on the official examples

**Example 1: `digits = [1, 2, 3]`** (expect `[1, 2, 4]`)

| Step | `i` | `digits[i]` | Action | Array state |
|---|---|---|---|---|
| 1 | 2 | 3 | `3 < 9` → increment, return | `[1, 2, 4]` ✅ (returned immediately) |

**Example 2: `digits = [4, 3, 2, 1]`** (expect `[4, 3, 2, 2]`)

| Step | `i` | `digits[i]` | Action | Array state |
|---|---|---|---|---|
| 1 | 3 | 1 | `1 < 9` → increment, return | `[4, 3, 2, 2]` ✅ |

**Example 3: `digits = [9]`** (expect `[1, 0]`)

| Step | `i` | `digits[i]` | Action | Array state |
|---|---|---|---|---|
| 1 | 0 | 9 | `9 == 9` → set to 0, continue | `[0]` |
| 2 | — | — | loop exhausted → prepend 1 | `[1, 0]` ✅ |

### Extra trace for the "partial carry" case (not in official examples, but interviewers love it)

**`digits = [1, 9, 9]`** (expect `[2, 0, 0]`)

| Step | `i` | `digits[i]` | Action | Array state |
|---|---|---|---|---|
| 1 | 2 | 9 | `9` → set to 0, continue | `[1, 9, 0]` |
| 2 | 1 | 9 | `9` → set to 0, continue | `[1, 0, 0]` |
| 3 | 0 | 1 | `1 < 9` → increment, return | `[2, 0, 0]` ✅ |

---

## 6. Alternative formulation (equally valid, worth mentioning)

If you prefer a fully uniform carry loop (this generalizes directly to "add any digit `k`" or "add two digit arrays"):

```python
def plusOne(digits):
    carry = 1
    for i in range(len(digits) - 1, -1, -1):
        total = digits[i] + carry
        digits[i] = total % 10
        carry = total // 10
        if carry == 0:
            break
    if carry:
        digits.insert(0, 1)   # O(n); or build a new list
    return digits
```

This is slightly more code but scales to **Plus One's harder siblings** (adding arbitrary numbers). Mentioning this generalization in the interview shows depth.

---

## 7. Complexity Analysis

| Metric | Value | Explanation |
|---|---|---|
| Time (worst case) | **O(n)** | All-9 input forces a full right-to-left pass plus the `[1] + digits` prepend. |
| Time (best/typical) | **O(1)** | If the last digit isn't 9, we return after one comparison and one increment. |
| Space | **O(1)** auxiliary | The all-9 overflow case uses `O(n)` for the new list, but that's required by the *output* size, not auxiliary workspace. In-place mutation otherwise. |
| Output size | `n` or `n + 1` | Output grows by one digit only in the all-9s case. |

There is no meaningful lower-bound discussion to dwell on here: any correct algorithm must at minimum inspect the last digit (`Ω(1)`) and, in the all-9s case, touch every digit to zero it and allocate the new array (`Ω(n)` output-related work), which the solution matches.

---

## 8. Implementation Gotchas (Python, Java, C++)

| Language | Gotcha | Why it bites |
|---|---|---|
| **Python** | `[1] + digits` creates a **new list**; `digits.insert(0, 1)` mutates in place but is `O(n)`. If the interviewer expects in-place modification semantics, be explicit about which one you're doing. Also, `list.append(1)` then `reverse()` is a common *wrong* attempt — appending puts the `1` at the *least* significant end. |
| **Python** | Don't return `digits + [1]` "to be safe" — that silently appends instead of prepends and produces wrong output only for the all-9 case, the hardest case to eyeball. |
| **Java** | `int[] digits` has **fixed length**. For the overflow case you must allocate a new array: `int[] res = new int[n + 1]; res[0] = 1;` (the rest default to 0, which is exactly what you want — convenient). Forgetting that Java arrays can't grow is the #1 compile-time stumble here. |
| **Java/C++** | **Overflow trap:** `long.parseLong(str)` works only up to ~19 digits; the constraint allows 100. Any parse-based solution is incorrect, not just inefficient. |
| **C++** | `vector<int>` handles growth via `insert(begin(), 1)`, which is `O(n)` — fine here, but know it. Also, if using `std::string` input conversions, be careful `char` digit math (`'9' + 1`) is ASCII math, not integer math — mixing `char` and `int` is a classic off-by-58 bug. |

---

## 9. Common Mistakes & How to Avoid Them

1. **Parsing into an integer.** Fails for inputs with > 19 digits in fixed-width languages; even in Python it's a "cheat" answer. Say out loud: *"I won't convert because the number can exceed 64-bit range."*
2. **Appending instead of prepending on overflow.** `[9,9]` should become `[1,0,0]`, not `[0,0,1]`. The `1` is the *most* significant digit, so it goes at index 0.
3. **Wrong loop direction.** Addition starts at the ones place = **last index** (`n - 1`), not index 0. Confusing most-significant-first layout with least-significant-first is the most frequent bug.
4. **Carrying incorrectly, e.g., treating `9 + 1 = 10` by storing 10.** You must store `10 % 10 = 0` and carry `10 // 10 = 1`. If you ever generalize, remember the store/carry split.
5. **Forgetting the early-exit.** Some candidates write a full carry loop even when the first digit check would suffice. Not wrong, but the early return demonstrates you understood the structure of the problem (and it's the O(1) typical case).
6. **Mutating the input when the interviewer expects a fresh array** (or vice versa). Clarify: "I'll modify in place and return the same array — is that acceptable?" LeetCode's checker accepts it, but in an interview it's a one-second clarification that buys goodwill.
7. **Off-by-one on the prepend case in Java:** creating `new int[n]` instead of `new int[n + 1]` and then writing `res[0] = 1` throws `ArrayIndexOutOfBoundsException`-adjacent logic errors or truncates the result.

---

## 10. Test Cases to Propose Out Loud

State these before or right after coding — it signals strong testing instincts.

| # | Input | Expected Output | What it verifies |
|---|---|---|---|
| 1 | `[1,2,3]` | `[1,2,4]` | Official Ex. 1 — simple increment, no carry. |
| 2 | `[4,3,2,1]` | `[4,3,2,2]` | Official Ex. 2 — increment at the ones place. |
| 3 | `[9]` | `[1,0]` | Official Ex. 3 — single-digit overflow, array grows. |
| 4 | `[9,9,9]` | `[1,0,0,0]` | **Edge: all 9s, multi-digit overflow.** The prepend path. |
| 5 | `[1,9,9]` | `[2,0,0]` | **Edge: partial carry stops mid-array.** Verifies the loop breaks at the right index. |
| 6 | `[8,9]` | `[9,0]` | **Edge: carry stops at index 0, no growth.** Tests the boundary between "increment at leftmost" and "prepend." |
| 7 | `[1]` | `[2]` | **Edge: minimum size (n = 1), no carry.** |
| 8 | `[1,0,0,0]` | `[1,0,0,1]` | **Edge: internal zeros — carry passes *over* nothing; also confirms we handle digit `0` correctly** (0 < 9, so it increments and stops). |

Also worth *saying*: "Input has no leading zeros by the constraints, so I don't need to validate that — but my solution would still work on `[0, 1, 2]` anyway since it only touches the right end." (Optional robustness note.)

---

## 11. Transferable Patterns & Related Problems

The single pattern this problem teaches is **digit-array arithmetic with carry propagation**, which appears all over interview lists:

| Problem | Relationship |
|---|---|
| **LeetCode 67 — Add Binary** | Same right-to-left carry loop, base 2 instead of base 10; carry can still only be 0 or 1. |
| **LeetCode 415 — Add Strings** | Generalization: two digit arrays/strings, carry can be 0 or 1, lengths differ (needs index alignment). |
| **LeetCode 2 — Add Two Numbers** | Same math on a **reversed linked list** — tests whether you can transfer the pattern to a different data structure. |
| **LeetCode 989 — Add to Array-Form of Integer** | Direct generalization: add an arbitrary integer `k` to a digit array. Almost identical loop. |
| **LeetCode 43 — Multiply Strings** | Harder sibling: same digit-array representation, but position-weighted accumulation. |
| **LeetCode 445 — Add Two Numbers II** | Addition on lists stored most-significant-first (requires a stack or list reversal — same left-to-right layout issue as this problem). |

**The reusable template:** *"For big-number arithmetic in an array/string/list, iterate from the least-significant end, maintain a carry, store `sum % base`, propagate `sum // base`, and handle final leftover carry by growing the structure at the front (prepend)."*

---

## 12. Say It in 60 Seconds

> "So the number is stored most-significant first, which means the ones place is the *last* index, so I'll scan right to left. Adding one is simple: if the current digit is less than 9, I increment it and I'm done — the carry can't go anywhere else. If it's a 9, it becomes 0 and the carry moves left. If the entire array is 9s, the carry falls off the front, so all digits become 0 and I prepend a 1 — that's the only case where the output is longer than the input.
>
> I won't convert to an integer because the input can have up to 100 digits, which overflows a 64-bit number in most languages. So the loop is: iterate from the last index down, increment and return on the first non-9, zero out the 9s otherwise, and prepend a 1 if the loop finishes. That's O(n) worst case, O(1) typical since we usually return on the first digit, and O(1) extra space apart from the new array in the all-9s case. Edge cases I'd test: all 9s, partial carry like 1-9-9, and a single 9."
