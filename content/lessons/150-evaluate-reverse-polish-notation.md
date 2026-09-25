# Evaluate Reverse Polish Notation — Complete Interview Lesson

*(LeetCode 150 · Medium · Stack / Expression Evaluation)*

---

## 1. Problem, restated in your own words

Say this back to the interviewer before coding:

> "I'm given an array of string tokens in **postfix** (Reverse Polish) notation — operators come *after* their operands. I need to evaluate it and return one integer. Operators are `+ - * /`; division truncates **toward zero**; the input is guaranteed to be a valid RPN expression, so I never need to handle malformed input or division by zero."

Two clarifications worth making out loud:

- **"Each operand may be an integer or another expression"** just means: when you consume an operand, it might be an original number *or* the result of an already-evaluated sub-expression. In a stack-based evaluator these are indistinguishable — the stack flattens them automatically. That's the whole point of postfix notation.
- You're effectively interpreting a **stack-machine program**: each number is a `PUSH`, each operator is "pop two, compute, push result." Postfix is literally how stack VMs (JVM bytecode, Python's own interpreter, Forth) represent code.

---

## 2. Decoding the constraints

| Constraint | What it actually tells you |
|---|---|
| `1 <= tokens.length <= 10^4` | Linear **O(n)** is clearly intended; O(n²) (~10⁸ token inspections) is borderline in Python. Aim for one pass. |
| `tokens[i]` is `"+"/"-"/"*"/"/"` or an integer in `[-200, 200]` | Integers **can be negative** → `"-11"` is a *value*, not the `-` operator. Classify operators by **exact string match**, never by first character. |
| Division truncates toward zero | This is the trap for Python: `//` **floors** (`6 // -132 == -1`), which is wrong. You need `int(a / b)` or sign-corrected integer division. |
| No division by zero | Skip the zero-check; don't clutter the code. |
| Input is valid RPN | No error handling needed: the stack never underflows, and exactly one value remains at the end. (If asked to harden it: an `IndexError` on pop or `len(stack) != 1` at the end is your invalid-input detector.) |
| Answer and intermediates fit in 32-bit | No overflow handling; plain `int` is fine in every language. It also makes float-based truncation provably safe (see §5). |

Edge hidden in the constraints: `tokens.length` can be **1**, and a single token `["18"]` or `["-7"]` is a complete expression. Your code must return it without ever popping.

---

## 3. Brute force: repeated triple reduction (with trace)

**Idea.** In a valid RPN list, the **first operator** in the list always has its operands *exactly* the two tokens immediately before it — everything before an operator in a valid RPN must be numbers, and the operator's two operands are the two most recently "completed" values, i.e., the two preceding tokens. So: scan for the first operator, collapse the triple `[left, right, op]` into one computed value, repeat until one token remains.

```python
def evalRPN_bruteforce(tokens: list[str]) -> int:
    OPS = {"+", "-", "*", "/"}

    def apply_op(op: str, x: int, y: int) -> int:   # x op y, trunc division
        if op == "+": return x + y
        if op == "-": return x - y
        if op == "*": return x * y
        q = abs(x) // abs(y)
        return q if (x < 0) == (y < 0) else -q      # truncate toward zero

    tokens = list(tokens)                            # don't mutate caller's list
    while len(tokens) > 1:
        for i in range(2, len(tokens)):              # operands live at i-2, i-1
            if tokens[i] in OPS:
                val = apply_op(tokens[i], int(tokens[i-2]), int(tokens[i-1]))
                tokens[i-2:i+1] = [str(val)]         # splice 3 tokens -> 1
                break
    return int(tokens[0])
```

**Trace on Example 1** — track *indices* explicitly, because splicing shifts them:

| Round | List (values) | First operator at index `i` | Operands | Computation | New list |
|---|---|---|---|---|---|
| 1 | `["2","1","+","3","*"]` | `i=2` (`"+"`) | `tokens[0]=2` (left), `tokens[1]=1` (right) | `2+1=3` | `["3","3","*"]` |
| 2 | `["3","3","*"]` | `i=2` (`"*"`) | `tokens[0]=3`, `tokens[1]=3` | `3*3=9` | `["9"]` |

One value remains → **9**. ✓

Note the stale-index hazard: in Round 1, after splicing indices 0–2, the old tokens at indices 3–4 shift left by 2. Any cached index is now wrong — recompute, never reuse.

**Why it's slow:** each reduction shrinks the list by 2, so there are `(n-1)/2` rounds, and each round rescans up to the whole list — total Θ(n²). With n = 10⁴ that's ~2.5×10⁷ splice work plus rescans: passable but fragile and unnecessary.

**Bridge to the optimal idea:** the list *is* secretly a stack. The tokens after the current reduction point are never touched — if you keep a write pointer that never moves backward, you reinvent the one-pass stack algorithm of §5.

---

## 4. The core insight

> **In postfix notation, an operator's two operands are always the two most recently completed values — which are exactly the top two items of a stack at the moment you read the operator.**

Three ways to see why this is airtight:

1. **Expression-tree view.** The tokens are a *postorder traversal* of the expression tree: children always appear before their parent. Reading left to right, whenever you hit an operator, both of its subtrees have already been fully evaluated and their results are the two most recent values — the top two stack entries.
2. **Invariant view.** Maintain: "the stack holds the values of all fully-evaluated sub-expressions, innermost on top." A number token completes a trivial sub-expression (push). An operator token completes a bigger one: pop its two arguments, push the result. The invariant is preserved after every token, and at the end exactly one value — the whole expression — remains.
3. **Contrast with infix.** Infix needs precedence/parenthesis logic (two stacks, shunting-yard). Postfix encodes all of that in the token *order* itself, so a single pass with **zero precedence logic** suffices.

Precision notes:

- The stack stores **parsed values** (`int`), not token indices — you never need to look backward in the array.
- **Duplicates are normal and harmless.** `["3","3","-"]` puts two indistinguishable `3`s on the stack; what matters is *position* (pop order), not identity: first pop = right operand, second pop = left operand → `3 - 3 = 0`.

---

## 5. Optimal solution: single pass with a stack

**Algorithm.**
1. Scan tokens left → right.
2. Number token → parse and push.
3. Operator token → pop `b` (right operand), pop `a` (left operand), push `a op b`.
4. Return the single remaining value.

```python
from typing import List

class Solution:
    def evalRPN(self, tokens: List[str]) -> int:
        def trunc_div(a: int, b: int) -> int:
            """Integer division truncating toward zero (Python's // floors)."""
            q = abs(a) // abs(b)
            return q if (a < 0) == (b < 0) else -q

        ops = {
            "+": lambda a, b: a + b,
            "-": lambda a, b: a - b,
            "*": lambda a, b: a * b,
            "/": trunc_div,               # or int(a / b) — see "Division, precisely"
        }

        stack: List[int] = []
        for tok in tokens:
            if tok in ops:                # exact string match: "-11" is NOT here
                b = stack.pop()           # RIGHT operand — pushed most recently!
                a = stack.pop()           # LEFT operand
                stack.append(ops[tok](a, b))
            else:
                stack.append(int(tok))    # handles negatives like "-11"
        return stack.pop()                # valid RPN leaves exactly one value
```

### Division, precisely (the one real subtlety)

- **Python:** `//` floors toward −∞. `6 // -132 == -1`, but the answer must be `0` (truncation of −0.045 toward zero). Options: `int(a / b)` (float divide, then truncate) or the integer-only `trunc_div` above.
- `int(a / b)` is **safe under this problem's guarantees**: float64 multiplication/division carries relative rounding error ≤ 2⁻⁵³, so for 32-bit operands the absolute error in the quotient (< 2⁻²¹/|b|) is far smaller than the minimum nonzero distance 1/|b| between the true quotient and any integer — the float can never round across the truncation boundary. But for **unbounded** inputs (ints beyond 2⁵³ aren't exactly representable in float64) `int(a/b)` can be wrong, so `trunc_div` is the bulletproof habit.
- **Java/C++ don't have this problem:** integer division there already truncates toward zero by language specification (C++11 onward, and the JLS), so plain `a / b` is correct.

### Alternate approach worth mentioning (and its hazard)

A recursive parser consuming tokens **from the end** is elegant — the last token is the root operator; parse its right subtree first, then its left:

```python
def evalRPN_recursive(tokens: list[str]) -> int:
    OPS = {"+", "-", "*", "/"}
    def parse() -> int:                    # consumes from the end
        tok = tokens.pop()
        if tok not in OPS:
            return int(tok)
        right = parse()                    # right subtree is nearer the end
        left = parse()
        return {"+": lambda a,b: a+b, "-": lambda a,b: a-b,
                "*": lambda a,b: a*b,
                "/": lambda a,b: (abs(a)//abs(b)) * (1 if (a<0)==(b<0) else -1)}[tok](left, right)
    return parse()
```

This is O(n) time, but recursion depth is Θ(number of operators) = Θ((n−1)/2) — up to ~5000 frames for n = 10⁴, which **exceeds Python's default recursion limit of 1000** and raises `RecursionError`. The iterative stack version is strictly better here; mention the trade-off if the interviewer asks for a recursive formulation.

---

## 6. Traces on the official examples

**Example 1:** `["2","1","+","3","*"]` → **9**

| token | action | stack (bottom → top) |
|---|---|---|
| `"2"` | push 2 | `[2]` |
| `"1"` | push 1 | `[2, 1]` |
| `"+"` | pop b=1, a=2 → 3 | `[3]` |
| `"3"` | push 3 | `[3, 3]` ← duplicates are fine |
| `"*"` | pop b=3, a=3 → 9 | `[9]` |

**Example 2:** `["4","13","5","/","+"]` → **6**

| token | action | stack |
|---|---|---|
| `"4"` | push | `[4]` |
| `"13"` | push (two-char number, not two tokens) | `[4, 13]` |
| `"5"` | push | `[4, 13, 5]` |
| `"/"` | pop b=5, a=13 → 13/5 = 2.6 → **trunc 2** | `[4, 2]` |
| `"+"` | pop b=2, a=4 → 6 | `[6]` |

**Example 3:** `["10","6","9","3","+","-11","*","/","*","17","+","5","+"]` → **22**

| token | action | stack |
|---|---|---|
| `"10"` | push | `[10]` |
| `"6"` | push | `[10, 6]` |
| `"9"` | push | `[10, 6, 9]` |
| `"3"` | push | `[10, 6, 9, 3]` |
| `"+"` | b=3, a=9 → 12 | `[10, 6, 12]` |
| `"-11"` | push — **a number**, despite starting with `-` | `[10, 6, 12, -11]` |
| `"*"` | b=−11, a=12 → −132 | `[10, 6, -132]` |
| `"/"` | b=−132, a=6 → 6/−132 = −0.045 → **trunc 0** (floor would give −1 ✗) | `[10, 0]` |
| `"*"` | b=0, a=10 → 0 | `[0]` |
| `"17"` | push | `[0, 17]` |
| `"+"` | b=17, a=0 → 17 | `[17]` |
| `"5"` | push | `[17, 5]` |
| `"+"` | b=5, a=17 → 22 | `[22]` |

---

## 7. Complexity

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Brute-force triple reduction | O(n²) | O(n) working copy | (n−1)/2 rounds × O(n) scan each |
| Recursive parse-from-end | O(n) | O(n) **call stack** | depth Θ((n−1)/2) ≈ 5000 → breaks Python's default limit |
| **Stack (this solution)** | **O(n)** | **O(n)** worst case | one pass; O(1) work per token |
| In-place variant (below) | O(n) | **O(1)** extra | input array doubles as the stack |

- **Time O(n):** each token is pushed/popped at most once; `int(tok)` and the dict lookup are O(1) (tokens are short).
- **Space O(n):** worst case is all operands first, then all operators (e.g., `["1","2","3","4","+","+","+"]`) — the stack peaks at ⌈n/2⌉ integers, since #operands = #operators + 1 in any binary-expression RPN.
- **Lower bound:** Ω(n) time is unavoidable — any algorithm that skips reading a token can't distinguish inputs that differ only there (e.g., the lone token `"3"` vs `"4"`), which changes the required output; so the solution is optimal up to constants.
- **O(1)-extra-space variant** (nice follow-up flex): use the input array itself as the stack with a write pointer `w`; push writes `tokens[w]`, an operator overwrites `tokens[w-2]` and decrements `w`. It's safe because `w` always trails the read position, so you never clobber an unread token.

---

## 8. Language-specific gotchas

| Language | Gotcha |
|---|---|
| **Python** | `//` **floors** (`-7 // 2 == -4`, but truncation demands `-3`). Also `"-11".isdigit()` is `False`, so an isdigit-based "is this a number?" test misclassifies negative literals — test set membership in `{"+","-","*","/"}` instead, which can't misfire since keys are exact strings. |
| **Java** | `int` division **already truncates toward zero** — plain `a / b` is correct; do **not** reach for `Math.floorDiv` (it floors). Prefer `ArrayDeque<Integer>` over the legacy `java.util.Stack` (synchronized, legacy API); autoboxing to `Integer` is fine at n ≤ 10⁴. |
| **C++** | `/` truncates toward zero since C++11 — direct `a / b` works. But `std::stoi("+")` throws `std::invalid_argument`, so check operator membership **before** converting; and `token[0] == '-'` misreads `"-11"` as the operator. If you reuse this code with unbounded inputs, intermediates can overflow `int` — switch to `long long` there (not needed under this problem's 32-bit guarantee). |

---

## 9. Common mistakes

1. **Swapped pop order.** First pop is the **right** operand. `["5","3","-"]` must give `2`, not `−2`; `["8","4","/"]` must give `2` — reversed order truncates `4/8` to `0`. This bug hides if you only test with `+`/`*` (commutative).
2. **Treating `"-11"` as the operator `-`.** Never test `tok[0] == '-'` or `startswith("-")`. Exact membership in the operator set is the whole fix.
3. **Floor division in Python.** `6 // -132 == -1` (wrong), `int(6 / -132) == 0` (right). This is the single most common WA on this problem in Python.
4. **`int(a / b)` copied into unbounded contexts.** Safe here only because of the 32-bit-intermediate guarantee (float64 can't represent all ints above 2⁵³ exactly). Use sign-corrected integer division as the general-purpose habit.
5. **Recursive solution → `RecursionError`.** Depth is Θ(#operators) ≈ 5000 at n = 10⁴ vs. Python's default limit of 1000. Go iterative, or explicitly raise `sys.setrecursionlimit` and say why that's fragile.
6. **Assuming at least one operator exists.** `["18"]` must return `18`; make sure your final `return stack.pop()` (not two pops) and your loop handle a zero-operator input.
7. **Pushing strings and re-parsing later.** Parse to `int` once at push time; mixing `str`/`int` on the stack invites type bugs and re-parses.
8. **Stale indices in the brute force.** After splicing out 3 tokens, every later index shifts by 2 — recompute positions each round instead of caching them.

---

## 10. Test cases to propose out loud

State these before or right after coding — it signals you think about edges unprompted:

| # | Input | Expected | What it stresses |
|---|---|---|---|
| 1 | `["2","1","+","3","*"]` | 9 | Official: basic push/pop cycle |
| 2 | `["4","13","5","/","+"]` | 6 | Official: multi-digit operand; `13/5 → 2` truncation |
| 3 | `["10","6","9","3","+","-11","*","/","*","17","+","5","+"]` | 22 | Official: negative literal; `6 / -132 → 0` truncation |
| 4 | `["18"]` | 18 | **Single-token expression** — no operators; final return must not double-pop |
| 5 | `["5","3","-"]` | 2 | **Operand order** on a non-commutative op (reversed logic gives −2) |
| 6 | `["7","-2","/"]` | −3 | **Truncation toward zero** on a negative quotient (floor gives −4) |
| 7 | `["1","2","3","4","+","+","+"]` | 10 | Deep stack (all operands first); right-nested grouping `1+(2+(3+4))` |

Bonus stress test if asked: 10⁴ alternating tokens for runtime; also confirm the code *would* fail loudly (stack underflow / leftover values) on malformed input, even though the constraints exclude it.

---

## 11. Transferable patterns & related problems

**Patterns to carry forward:**

- **Postfix = stack machine.** Any "operator applies to the most recent value(s)" grammar evaluates with push/pop in one pass. Trigger words: RPN, postfix, "evaluate expression," bytecode.
- **Explicit stack replaces recursion.** The stack here is the call stack of the recursive parser, flattened — the same skeleton turns recursive tree evaluation into an iteration (also: LC 394, iterative DFS).
- **Reduce-on-trigger stacks.** Push items; when a trigger token arrives, pop/combine immediately: valid parentheses, asteroid collision, baseball game, decode string all share this skeleton.
- **The inverse direction is shunting-yard.** Given *infix*, convert to postfix with an operator stack (precedence + associativity), then run this exact evaluator — or fuse the two passes (LC 227's running-operand trick).

**Related problems:**

| Problem | How it relates |
|---|---|
| LC 682 — Baseball Game | Nearly identical mechanics: ops act on recent entries, plus invalidate/sum ops |
| LC 227 — Basic Calculator II | Infix without parentheses; precedence via running operand + pending op |
| LC 224 — Basic Calculator I | Parentheses + unary minus; stack of contexts |
| LC 772 — Basic Calculator III | Full precedence + parentheses; classic two-stack (shunting-yard) problem |
| LC 394 — Decode String | Stack of partial states for nested structure |
| LC 735 — Asteroid Collision | Reduce-on-trigger stack, directional (like pop order here) |
| LC 1597 / 1628 — Expression Trees | Push **nodes** instead of ints; the operator's pops become its children |
| LC 856 — Score of Parentheses | Stack accumulators keyed by nesting depth |

Follow-up questions to anticipate: *support unary minus* (a `-` with fewer than 2 values on the stack, or a `-` immediately followed by a number token, is unary); *evaluate from a stream* (the algorithm is already online — the stack never needs the whole input); *build the expression tree instead of the value* (push nodes); *hardening* (underflow check on pop, `len(stack) == 1` at the end).

---

## 12. Full interview talk track

**Beat 1 — Restate (≈10s).** "Postfix notation: operators come after their operands and act on the two most recent values. I return the single final value. Division truncates toward zero, and the input is guaranteed valid, so no error handling — but watch the negative-number tokens."

**Beat 2 — Insight (≈15s).** "Because it's postfix, reading left to right, every operator's two operands are exactly the two most recently completed values — i.e., the top two of a stack. So one pass: push numbers; on an operator, pop twice, compute, push the result back. No precedence logic at all — postfix encodes precedence in the token order."

**Beat 3 — Call out the traps before coding (≈15s).** "Three things I'll get right: pop order — first pop is the *right* operand, which matters for minus and divide; operator detection by exact string match, since `'-11'` is a number; and division — Python's `//` floors, so I'll truncate toward zero with `int(a/b)`, which is safe because the problem bounds all intermediates to 32 bits."

**Beat 4 — Code (≈60–90s).** Write the dict of lambdas + the loop. Narrate: "push numbers, pop b then a, push `a op b`, return the one remaining value."

**Beat 5 — Dry run (≈15s).** "Example 2: push 4, 13, 5; slash pops 5 then 13 → 13/5 truncates to 2; plus pops 2 then 4 → 6. Matches."

**Beat 6 — Complexity + tests (≈20s).** "One pass, O(n) time, O(n) space worst case when all operands come first — and Ω(n) is a hard floor since every token must be read. Tests I'd run: a single-token input like `['18']`, operand order on `5 3 -`, truncation on `7 / -2 → -3`, and the deep-stack case. If they want O(1) space, I can use the input array itself as the stack with a write pointer."

---

## 13. Say it in 60 seconds

> "RPN is postfix — every operator applies to the two values right before it, which in one left-to-right scan are exactly the top two items of a stack. So: number token, push it. Operator token, pop twice — first pop is the right operand, second is the left, and that order matters for minus and divide — apply, push the result back. At the end exactly one value remains; that's the answer. Two traps I'm handling: tokens like `-11` are negative numbers, not the minus operator, so I match operators by exact string; and division truncates toward zero, while Python's floor division rounds down for negatives — so I use `int(a/b)` or sign-corrected integer division. One pass, O(n) time, O(n) space worst case. I'd sanity-check a single-token input, operand order on `5 3 -`, and `7 / -2 → -3`."
