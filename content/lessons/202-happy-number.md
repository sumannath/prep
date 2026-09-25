# Happy Number (LeetCode 202) — Complete Lesson

## 1. Problem Restatement

You're given a positive integer `n`. Repeatedly apply this one transformation:

> Replace `n` with the sum of the squares of its decimal digits.

Two possible fates:

1. The sequence eventually reaches exactly `1` → `n` is a **happy number**, return `true`.
2. The sequence falls into a repeating cycle that never touches `1` → return `false`.

Note the crucial subtlety: the process *never diverges to infinity* — it either hits 1 or loops forever. Your job is essentially **cycle detection** in an implicit graph where each node `x` has exactly one outgoing edge to `digitSquareSum(x)`.

Formally: we are walking a **functional graph** (each state has exactly one successor: `x → f(x)`) starting from `n`, and asking whether we reach the absorbing state `1` or get trapped in a cycle that excludes `1`.

---

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= n <= 2^31 - 1` | `n` fits in a signed 32-bit int; **no overflow concerns** when computing the digit-square sum, since the maximum possible output is tiny (see below). |
| Positive integer | You never receive `0` or negatives; `n = 1` is a valid input and is trivially happy (it's already 1). |

**The most important hidden fact in this problem** — derive it in the interview:

- `2^31 - 1 = 2147483647` has **10 digits**.
- The maximum digit-square sum is therefore at most `10 × 9² = 810` (for `n ≥ 1000` it's actually far smaller; e.g., for `2147483647` it's `2²+1²+4²+7²+4²+8²+3²+6²+4²+7² = 260`).
- So **after one step, every value is ≤ 810**, and stays ≤ 810 forever.

**Consequence (pigeonhole):** the sequence wanders in a state space of at most 810 values, so it *must* either hit `1` or revisit a value — i.e., it *must* cycle. This single observation justifies every approach below, and stating it out loud immediately signals that you understand why termination checks work at all.

Bonus fact worth mentioning: the *only* cycle that excludes 1 is the famous one:

```
4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4
```

So a micro-optimization exists: "if the value ever becomes 4, it's unhappy." But that's trivia, not the core skill — the interviewer wants cycle detection.

---

## 3. Brute Force: Simulation with a HashSet

**Idea:** Simulate the process. Keep a set of visited values. If you reach `1`, return `true`. If you see a value you've seen before, you've found a cycle → return `false`.

```python
def isHappy(n: int) -> bool:
    def next_value(x: int) -> int:
        total = 0
        while x > 0:
            x, digit = divmod(x, 10)
            total += digit * digit
        return total

    seen = set()
    while n != 1:
        if n in seen:          # revisited a value => cycle that excludes 1
            return False
        seen.add(n)
        n = next_value(n)
    return True
```

### Worked trace, `n = 19` (happy)

| Step | `n` | Computation | `seen` |
|---|---|---|---|
| 0 | 19 | 1² + 9² = 1 + 81 = 82 | {19} |
| 1 | 82 | 8² + 2² = 64 + 4 = 68 | {19, 82} |
| 2 | 68 | 6² + 8² = 36 + 64 = 100 | {19, 82, 68} |
| 3 | 100 | 1² + 0² + 0² = 1 | {19, 82, 68, 100} |
| 4 | 1 | loop condition fails | → **return true** |

### Worked trace, `n = 2` (unhappy)

| Step | `n` | Computation |
|---|---|---|
| 0 | 2 | 4 |
| 1 | 4 | 16 |
| 2 | 16 | 1 + 36 = 37 |
| 3 | 37 | 9 + 49 = 58 |
| 4 | 58 | 25 + 64 = 89 |
| 5 | 89 | 64 + 81 = 145 |
| 6 | 145 | 1 + 16 + 25 = 42 |
| 7 | 42 | 16 + 4 = 20 |
| 8 | 20 | 4 + 0 = 4 ← **repeat!** |

`4` is already in `seen` → **return false**. This is the canonical unhappy cycle.

### Complexity (brute force)

- **Time:** O(log n) total — the first step costs O(log n) (one pass over the digits of `n`); afterwards all values are ≤ 810, so every subsequent step is O(3) and the sequence of *distinct* values is bounded by a small constant (pigeonhole over ≤ 810 states).
- **Space:** O(1) in a strict asymptotic sense (the set holds at most a bounded constant number of values once `n ≤ 810`, since the initial value `n` contributes at most one extra entry) — but in practice it stores a non-trivial constant, and interviewers often treat this as "extra space proportional to visited states."

This is already accepted on LeetCode. But there's a cleaner, more impressive O(1)-space answer.

---

## 4. The Core Insight

Two independent insights make the optimal solution:

1. **The sequence is a walk on a functional graph** (`x → f(x)`), which either reaches the absorbing state `1` or cycles. Any cycle-detection technique for linked lists applies, even though no list exists in memory — the "next pointer" is computed on the fly by `next_value`.
2. **Bounded state space ⇒ cycles are guaranteed and small.** After one step, values are ≤ 810, so Floyd's tortoise-and-hare needs only a bounded number of iterations.

This is exactly the setup of **Floyd's cycle detection** (the "Linked List Cycle" pattern), where instead of `node.next` you call `next_value(x)`.

---

## 5. Optimal Approach: Floyd's Tortoise and Hare (O(1) space)

Keep two "pointers" into the implicit sequence:

- **slow** moves one `next_value` per iteration.
- **fast** moves two `next_value` per iteration.

- If the sequence reaches `1`, fast hits `1` first (it moves faster) → stop, happy.
- If there's a cycle excluding 1, slow and fast must eventually be **equal inside the cycle** (fast gains one position per iteration relative to slow, and the gap closes modulo the cycle length) → unhappy.

```python
def isHappy(n: int) -> bool:
    def next_value(x: int) -> int:
        total = 0
        while x > 0:
            x, digit = divmod(x, 10)
            total += digit * digit
        return total

    slow, fast = n, next_value(n)
    while fast != 1 and slow != fast:
        slow = next_value(slow)
        fast = next_value(next_value(fast))
    return fast == 1
```

Why the loop condition is `fast != 1 and slow != fast`:
- `fast != 1` — we terminate successfully as soon as the (faster) runner proves `1` is reachable. This also handles `n = 1` correctly: `slow = 1`, `fast = next_value(1) = 1`, the loop is skipped, and we return `fast == 1` → `true`.
- `slow != fast` — a meeting inside a cycle proves the sequence is periodic and (because fast ≠ 1 was checked first) the cycle does not contain 1.

### Trace on `n = 19`

| Iteration | slow | fast | Notes |
|---|---|---|---|
| init | 19 | next(19) = 82 | |
| 1 | next(19) = 82 | next(next(82)) = next(68) = 100 | |
| 2 | next(82) = 68 | next(next(100)) = next(1) = 1 | fast == 1 → exit |
| — | | | return `fast == 1` → **true** |

### Trace on `n = 2`

| Iteration | slow | fast | Notes |
|---|---|---|---|
| init | 2 | next(2) = 4 | |
| 1 | 4 | next(next(4)) = next(16) = 37 | |
| 2 | 16 | next(next(37)) = next(58) = 89 | |
| 3 | 37 | next(next(89)) = next(145) = 20 | |
| 4 | 58 | next(next(20)) = next(4) = 16 | |
| 5 | 89 | next(next(16)) = next(37) = 58 | |
| 6 | 145 | next(next(58)) = next(89) = 145 | |
| 7 | 42 | next(next(42)) = next(20) = 4 | |
| 8 | 20 | next(next(4)) = next(16) = 37 | |
| 9 | 4 | next(next(37)) = next(58) = 89 | |
| 10 | 16 | next(next(89)) = next(145) = 42 | |
| 11 | 37 | next(next(42)) = next(20) = 4 | |
| 12 | 58 | next(next(4)) = next(16) = 37 | |
| 13 | 89 | next(next(37)) = next(58) = 89 | slow == 89? no… |
| … | | | they eventually coincide inside the cycle (e.g., both hit 89/4-chain points) → `slow == fast` → exit, `fast != 1` → **false** |

(You don't need to enumerate every step in an interview — just say: "the cycle is `4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4`, and since both runners run around a loop at relative speed 1, they must meet; fast never equals 1, so we return false.")

---

## 6. Complexity Table

| Approach | Time | Space | Notes |
|---|---|---|---|
| HashSet simulation | O(log n) | O(1) asymptotically (set size bounded by a constant once values ≤ 810, by pigeonhole) — practically a small constant | Simplest to write and reason about; the default interview answer. |
| Floyd's tortoise & hare | O(log n) | **O(1)** — two variables | The "optimal" answer; same asymptotic time but no auxiliary container. |
| Hardcode-cycle check (`if x == 4`) | O(log n) | O(1) | Relies on the known fact that all unhappy numbers enter the 4-cycle; mention as trivia, don't lead with it. |

Why the total time is O(log n): the first `next_value` call scans ⌈log₁₀ n⌉ + 1 digits (cost O(log n)); every value after that is ≤ 810, so each subsequent step is O(3) digit operations and the number of steps before terminating or cycling is bounded by a constant. Total = O(log n) + O(1).

For reference, the number of distinct 3-digit-or-smaller values reachable is at most 810, so the cycle length is at most 810 — this is why iteration counts are tiny regardless of `n`.

---

## 7. Common Mistakes & Interview Pitfalls

| Mistake | Why it's wrong / how to avoid |
|---|---|
| **Assuming the loop terminates on its own** | Writing `while n != 1: n = next(n)` with no cycle check → infinite loop on unhappy numbers (e.g., `n = 2` loops forever between 4 and 20). Always pair with a `seen` set, a step counter, or Floyd's. |
| **Floyd's loop condition written as `while slow != fast`** | If you initialize `slow = fast = n` and check only `slow != fast`, you exit immediately for `n = 1`... but for unhappy `n`, you also need to distinguish "met at 1" from "met elsewhere." The clean fix: initialize `fast = next_value(n)` and check `fast != 1 and slow != fast`. |
| **Missing `n = 1`** | `1` is happy by definition (it's already the target). Trace your code on `n = 1` before saying you're done — both implementations above handle it, but many naive versions return the wrong thing or loop. |
| **Converting to string per step** | `sum(int(d)**2 for d in str(x))` is correct but slower in Python; `divmod` is faster and language-agnostic. (Correctness-wise both are fine — this is a performance/fluency point.) |
| **Worrying about overflow** | Unnecessary here: max input ≈ 2.1 × 10⁹ has 10 digits, so the sum is ≤ 810. Saying this *out loud* is a plus; silently worrying about it wastes time. (The reverse — assuming overflow without checking — would be a mistake.) |
| **In Floyd's, checking `slow != 1` instead of `fast != 1`** | Harmless in most runs but can waste iterations; `fast` reaches 1 first by construction, so testing fast is the tight check. |

### Language-specific gotchas (Java / C++)

| Language | Gotcha |
|---|---|
| **Java** | `HashSet<Integer>` autoboxes every `int` stored — fine for this bounded set, but a `boolean[] seen` indexed by value ≤ 810 (or just checking `x == 4`) is leaner and avoids boxing. Also, if you *did* need bigger sums, Java's `int` is 32-bit like Python is arbitrary-precision — a 19-digit-long input would need `long`. |
| **C++** | `std::unordered_set<int>` works, but remember `#include <unordered_set>` and that per-call `insert`/`count` costs hashing; for ≤ 810 possible values a `std::array<bool, 811>` or `std::vector<bool>` is faster and cache-friendly. Integer division/modulo by 10 is the same as Python here, but don't use `std::to_string` in a hot loop. |

---

## 8. Test Cases to Propose Out Loud

State these before/while coding — it shows systematic thinking:

| Input | Expected | Why it matters |
|---|---|---|
| `n = 19` (official) | `true` | The official happy example; verify your digit logic. |
| `n = 2` (official) | `false` | The official unhappy example; exercises cycle detection. |
| `n = 1` | `true` | **Edge case:** smallest input, already the target — must not loop or return false. |
| `n = 7` | `true` | A single-digit happy number with a nontrivial path: 7 → 49 → 97 → 130 → 10 → 1. Catches bugs where you mishandle multi-digit intermediates. |
| `n = 4` | `false` | First member of the unhappy cycle; catches Floyd's off-by-one/meeting-point bugs. |
| `n = 2147483647` (`2^31 - 1`) | `false` | **Max input:** goes 2147483647 → 260 → 40 → 16 → 37 → … → 4-cycle. Confirms you handle 10-digit numbers and the upper constraint. |
| `n = 1000000` | `true` | 1² + 0 + … = 1 immediately — happy in exactly one step; tests that trailing zeros are handled (`0² = 0`, no crash). |

---

## 9. Transferable Patterns & Related Problems

**Pattern 1 — Cycle detection on an implicit functional graph (Floyd's).** Any problem where each state has a *single deterministic successor* and you can't afford a visited set: "Linked List Cycle" (LC 141/142), **Find the Duplicate Number** (LC 287 — classic Floyd's on `i → nums[i]`), **Circular Array Loop** (LC 457). Happy Number is the friendliest introduction to this pattern because you can compute the "next" function trivially.

**Pattern 2 — Bounded-state / pigeonhole reasoning.** "After one step everything is ≤ 810" is a template: when a process on unbounded-looking input collapses into a small state space, you can (a) prove termination/cycling, (b) memoize, or (c) hardcode results. Related: power-of-four / digit-root problems, and any "repeatedly apply an operation" question where you should ask *how big can the state get?*

**Pattern 3 — Digit manipulation.** Extracting digits via `divmod` / `% 10` appears in: Reverse Integer, Palindrome Number, Add Digits, Count Integers With Even Digit Sum, Sum of Digits.

**Pattern 4 — MemORIZATION of a tiny domain.** Since only ≤ 810 values matter after step one, a small cache (or the `== 4` shortcut) is legitimate. In interviews, mention it *after* presenting the clean solution.

---

## 10. Full Talk Track (What to Say While Solving)

> "Let me restate: we repeatedly replace the number with the sum of the squares of its digits, and we return true iff we ever reach exactly 1. The key observation is that this sequence can't blow up — the input has at most 10 digits since n ≤ 2³¹ − 1, so after one step the value is at most 10 × 81 = 810, and it stays there. By pigeonhole the sequence must either hit 1 or revisit a value and cycle. So this is really cycle detection on an implicit linked list where each value's 'next' is its digit-square sum.
>
> My first solution: simulate with a hash set of seen values — O(log n) time for the first digit pass and constant work after, with a bounded amount of set space. That's clean and correct.
>
> For O(1) space I'll use Floyd's tortoise and hare: slow advances one step, fast advances two. If the sequence reaches 1, fast gets there first and we return true; otherwise both runners end up on the cycle — which for unhappy numbers is the known 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 loop — and they must meet, at which point fast ≠ 1, so we return false. I need to be careful with the initialization so n = 1 returns true immediately: I'll set slow = n, fast = next(n), and loop while fast ≠ 1 and slow ≠ fast, then return fast == 1.
>
> Edge cases: n = 1 (already happy), n = 4 (inside the cycle), and the max input 2147483647, which has ten digits — my digit extraction with divmod handles leading zeros in intermediates fine since 0² = 0. No overflow risk since the max sum is 810."

---

## 11. Say It in 60 Seconds

> "This is cycle detection. Each number has exactly one successor — the sum of the squares of its digits — so we're walking an implicit linked list that either reaches 1 or loops. Since n is at most 2³¹ minus 1, it has at most 10 digits, so after one step every value is at most 810 — by pigeonhole we must hit 1 or cycle. Simplest fix: simulate with a set; if we repeat a value, return false. For O(1) space, use Floyd's tortoise and hare: slow moves one step, fast moves two. If fast reaches 1 first, we return true; if slow and fast meet, we're stuck in a cycle that excludes 1, so return false. I'll initialize slow = n and fast = next(n) and check `fast != 1 and slow != fast` so that n = 1 returns true immediately. Time is O(log n) — one pass over the digits — plus a bounded number of steps since the state space is capped at 810. I'd test n = 1, n = 2, and the max input 2147483647."
