# Single Number (LeetCode 136) — Complete Lesson

## 1. Problem Restatement

You're given a non-empty integer array `nums` with a very specific multiplicity structure: **exactly one value appears once**, and **every other distinct value appears exactly twice**. Return the value that appears once.

Key precision points before you touch code:

- You must return the **value**, not its index. (Saying "return index 2" instead of "return 1" is an instant credibility hit.)
- "Appears twice" means **exactly twice** — not "at most twice," not "two or more." Combined with the singleton, this means `n = len(nums)` is always **odd** (2k duplicates + 1 singleton).
- The guarantee is load-bearing: if it were relaxed (e.g., zero singletons, or unknown multiplicities), the XOR trick below would no longer be valid.

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= nums.length <= 3 * 10^4` | Tiny n. Even O(n²) ≈ 9·10⁸ pair checks is *barely* feasible in C++, hopeless in Python — but more importantly, the problem **explicitly bans** anything super-linear, so brute force is disqualified by requirement, not just by speed. |
| `-3*10^4 <= nums[i] <= 3*10^4` | Values can be **negative**. |v| ≤ 30,000 < 2¹⁵, so every value fits in a signed 16-bit int — comfortably in a 32-bit `int` in Java/C++, and Python's arbitrary-precision ints never overflow anyway. |
| Exactly one singleton, rest exactly twice | This symmetry is the whole puzzle. It's why a **pair-annihilating** operation exists. |
| "Linear runtime, constant extra space" | O(n) time, O(1) auxiliary space. The returned value doesn't count against space; a recursion stack or a hash map does. |

Good clarifying questions to ask out loud: *"May I modify the input array?"* and *"Is the exactly-twice guarantee strict?"* Both affect which baselines are even allowed.

## 3. Baseline Attempts (and Why Each Fails One Constraint)

### 3.1 Brute-force pair scan — O(n²) time, O(1) space

For each element, scan the **entire array** for a partner. The element with no partner is the answer.

```python
def singleNumber_brute(nums: list[int]) -> int:
    n = len(nums)
    for i in range(n):
        found_pair = False
        for j in range(n):
            if j != i and nums[j] == nums[i]:
                found_pair = True
                break
        if not found_pair:
            return nums[i]          # the value, not i
    raise ValueError("no singleton — input violates the guarantee")
```

**Worked trace on `[2, 2, 1]`:**

| i | v = nums[i] | Partner found? | Action |
|---|---|---|---|
| 0 | 2 | j=1 has 2 → yes | continue |
| 1 | 2 | j=0 has 2 → **yes** (left side!) | continue |
| 2 | 1 | j∈{0,1} → no | **return 1** ✅ |

⚠️ **Classic bug:** scanning only to the *right* (`j in range(i+1, n)`). On `[2,2,1]`, at i=1 there is no later `2`, so the buggy version wrongly returns `2`. Duplicates can sit on either side — this is the #1 subtle error in this problem's brute force.

### 3.2 Sort-and-step — O(n log n) time

Sort, then check adjacent pairs at indices (0,1), (2,3), …. The first index `i` where `nums[i] != nums[i+1]` is the singleton; if the loop finishes, it's the last element.

```python
def singleNumber_sort(nums: list[int]) -> int:
    nums.sort()                      # mutates input — ask permission!
    i = 0
    while i + 1 < len(nums):
        if nums[i] != nums[i + 1]:
            return nums[i]
        i += 2
    return nums[-1]                  # singleton may be the largest → last index
```

**Trace on `[4,1,2,1,2]`** → sorted `[1,1,2,2,4]`: (0,1) match, (2,3) match, i=4 unpaired → return `4` ✅.

Fails the linear-time requirement. And it *can't* be fixed: in the comparison model, sorting (and hence this distinctness-style scan) requires Ω(n log n) comparisons, because n! possible input orderings must be distinguished and each comparison yields at most one bit, giving log₂(n!) = Θ(n log n). Also note Python's built-in sort (Timsort) is merge-based and can use O(n) temporary space, and it mutates the input.

### 3.3 Hash map counts / toggle set — O(n) time, O(n) space

```python
from collections import Counter

def singleNumber_counter(nums: list[int]) -> int:
    counts = Counter(nums)
    for value, cnt in counts.items():
        if cnt == 1:
            return value
```

**Trace on `[4,1,2,1,2]`:** counts = `{4:1, 1:2, 2:2}` → return `4` ✅.

A leaner variant, the **toggle set** (add if absent, remove if present), is worth showing because it *foreshadows XOR* — only values with odd occurrence count survive:

```python
def singleNumber_toggle(nums: list[int]) -> int:
    seen: set[int] = set()
    for x in nums:
        if x in seen: seen.remove(x)
        else:         seen.add(x)
    return seen.pop()                # exactly one element survives
```

**Trace on `[4,1,2,1,2]`:** `{4}` → `{4,1}` → `{4,1,2}` → remove 1 → `{4,2}` → remove 2 → `{4}` ✅. Time O(n), but space O(n) — fails the constraint. Great stepping stone; say so out loud.

### 3.4 Arithmetic trick — O(n) time, O(n) space

```python
def singleNumber_math(nums: list[int]) -> int:
    return 2 * sum(set(nums)) - sum(nums)
```

**Trace on `[4,1,2,1,2]`:** `2*(4+1+2) − (4+1+2+1+2) = 14 − 10 = 4` ✅. Elegant, but `set(nums)` is O(n) space — same failure as 3.3. Mention it to show range, then move on.

## 4. The Core Insight: XOR Annihilates Pairs

XOR (⊕) has exactly the algebra we need:

| Property | Statement | Why it matters here |
|---|---|---|
| Self-inverse | `x ⊕ x = 0` | **Each duplicate pair cancels to zero.** |
| Identity | `x ⊕ 0 = x` | The singleton survives untouched. |
| Commutative + associative | order/grouping irrelevant | We can fold in *any* order — no sorting needed. |

So if the multiset is `{v₁,v₁, v₂,v₂, …, v_k,v_k, s}`, then:

```
fold = (v₁⊕v₁) ⊕ (v₂⊕v₂) ⊕ … ⊕ (v_k⊕v_k) ⊕ s  =  0 ⊕ 0 ⊕ … ⊕ 0 ⊕ s  =  s
```

**Correctness proof sketch (say this in the interview):** Let ⊕ be XOR. The fold over the array equals the XOR of all elements, independent of order (commutativity + associativity). By the guarantee, elements partition into equal pairs plus one singleton `s`; each pair contributes 0, and 0 is the identity, so the fold is exactly `s`. ∎

**Loop invariant** for the implementation below: before processing index `i`, `acc == nums[0] ⊕ … ⊕ nums[i−1]`. Induction is one line with `x ⊕ acc`.

⚠️ **Depth nuance worth one sentence:** "XOR of everything = 0" does **not** imply "everything is paired" (e.g., `1 ⊕ 2 ⊕ 3 = 0`). The proof above works *forward* from the pairing guarantee — don't claim the converse.

## 5. Optimal Solution: One-Pass XOR Fold

```python
def singleNumber(nums: list[int]) -> int:
    acc = 0                          # identity element
    for x in nums:
        acc ^= x
    return acc
```

One-liner variant (pass the initial `0` so it's robust even conceptually on empty input):

```python
from functools import reduce
from operator import xor

def singleNumber(nums: list[int]) -> int:
    return reduce(xor, nums, 0)
```

- **Time:** O(n) — one pass, one constant-time bitwise op per element.
- **Space:** O(1) — a single accumulator. XOR is bitwise, so the accumulator's bit-width never exceeds the widest operand; with |v| ≤ 30,000 (< 2¹⁵) it's one machine word. Bonus: it's streaming-friendly and never mutates the input.

### Trace — Example 1: `[2,2,1]`

| step | x | acc before | acc = acc ⊕ x |
|---|---|---|---|
| 0 | — | 0 | 0 |
| 1 | 2 | 0 | 2 |
| 2 | 2 | 2 | **0** (pair annihilated) |
| 3 | 1 | 0 | **1** ✅ |

### Trace — Example 2: `[4,1,2,1,2]` (bit-level, 4-bit values)

| step | x (dec) | x (bin) | acc before | acc ⊕ x (bin) | acc (dec) |
|---|---|---|---|---|---|
| 1 | 4 | `0100` | `0000` | `0100` | 4 |
| 2 | 1 | `0001` | `0100` | `0101` | 5 |
| 3 | 2 | `0010` | `0101` | `0111` | 7 |
| 4 | 1 | `0001` | `0111` | `0110` | 6 |
| 5 | 2 | `0010` | `0110` | `0100` | **4** ✅ |

Emphasize: the intermediate values (5, 7, 6) look meaningless — that's fine. Only the *final* fold is meaningful, and only because the pairing guarantee holds.

### Trace — Example 3: `[1]`

`acc = 0 ⊕ 1 = 1` ✅. The `0` initializer is what makes the n=1 case work for free.

### Negatives & language gotchas

XOR is defined on two's-complement bit patterns, so `x ⊕ x = 0` and `x ⊕ 0 = x` hold for **negative numbers with zero special-casing**. Python models negatives as infinite two's complement (`-3 ^ -3 == 0`); Java/C++ use fixed-width two's complement. Never reach for `abs()` or sign-masking hacks.

| Language | Gotcha |
|---|---|
| **Python** | Prefer `operator.xor` over a lambda in `reduce` (faster); always pass the initial `0`. |
| **Java** | Plain `int` XOR is fine (`for (int x : nums) ans ^= x;`) — no overflow is possible with XOR. If you fall back to a `HashMap<Integer,Integer>` stepping stone, beware **boxed `Integer` comparison with `==`**: the autobox cache only spans −128…127, so values like 30,000 make `==` unreliable — use `.equals()` (or `getOrDefault` with `int` unboxed where possible). |
| **C++** | `std::accumulate(nums.begin(), nums.end(), 0, std::bit_xor<int>())` (needs `<numeric>`, `<functional>`) — the **third argument's type fixes the accumulator type**; passing `0u` or a narrower/wider type silently converts. Using plain `int 0` is correct here. |

## 6. Complexity Table & Optimality

| Approach | Time | Extra space | Meets O(n)/O(1)? | Notes |
|---|---|---|---|---|
| Brute pair scan (full, both directions) | O(n²) | O(1) | ❌ time | Right-only scan is a correctness bug, not just slow. |
| Sort + adjacent pairs | O(n log n) | O(1)–O(n) aux | ❌ time | Comparison sort needs Ω(n log n): n! orderings, 1 bit per comparison ⇒ log₂(n!) = Θ(n log n). Mutates input. |
| Counter / toggle set | O(n) | O(n) | ❌ space | Best "reasonable" baseline; toggle set foreshadows XOR. |
| `2·sum(set) − sum` | O(n) | O(n) | ❌ space | Elegant, fails the same space rule. |
| **XOR fold** | **O(n)** | **O(1)** | ✅ | One pass, one accumulator, no mutation. |

**Optimality:** O(n) is unbeatable — any correct algorithm must read all n entries in the worst case, because an adversary could change one unread entry (adjusting its partner to preserve the exactly-one-singleton structure) and force a different answer, so Ω(n) time is unavoidable; the XOR fold achieves it.

## 7. Common Mistakes

1. **Right-only duplicate scan** in brute force — fails on `[2,2,1]` (returns 2). Partners may be on the left.
2. **Sorted-pairs off-by-one** — the singleton can be the *last* (largest) element; you need the `return nums[-1]` fallback or you'll run past the end / return nothing.
3. **Returning the index instead of the value** — the output is `nums[i]`, not `i`.
4. **Sum trick presented as O(1) space** — `set(nums)` is O(n); it's a stepping stone, not the answer.
5. **OR/AND confusion** — `a | a == a` and `a & a == a`; only XOR (per-bit sum mod 2) self-cancels.
6. **Sign hacks for negatives** (`abs`, masks) — unnecessary; two's-complement XOR is already sign-safe in Python/Java/C++.
7. **Claiming "XOR=0 ⇒ all paired"** — false (`1^2^3 = 0`); correctness comes from the problem's guarantee, not the converse.
8. **Java boxed-Integer `==`** and **C++ `accumulate` initializer-type** traps (Section 5 table).
9. **Not stating the complexity contract out loud** — you solved it; say "O(n) time, O(1) space, doesn't mutate the input" explicitly.

## 8. Test Cases to Propose Out Loud

Say these before/after coding — it signals rigor:

| Test | Input | Expected | What it checks |
|---|---|---|---|
| Example 1 | `[2,2,1]` | `1` | Official; singleton at end |
| Example 2 | `[4,1,2,1,2]` | `4` | Official; interleaved pairs |
| Example 3 | `[1]` | `1` | Official; n=1, exercises the `0` initializer |
| Negatives | `[-3,-3,7]` | `7` | Sign safety (kills `abs()` hacks) |
| Singleton at front | `[9,1,1]` | `9` | Order-independence of the fold |
| Zero as a duplicate | `[0,1,0]` | `1` | Guards against zero-special-casing / "skip zeros" bugs |
| Boundary magnitude | `[30000,1,30000]` | `1` | Max |value| fits 16-bit; no width blow-up |
| Length sanity | 3·10⁴ elements | — | O(n) scan trivially fast; note valid n is always odd |

## 9. Transferable Patterns & Related Problems

**Meta-pattern:** *Find an operation where "a pair of equal elements" is the identity, that is commutative + associative, and fold.* XOR is the canonical instance. Sibling tricks: `x & -x` isolates the lowest set bit (used to split populations by a differing bit), and per-bit modular counting generalizes cancellation beyond pairs.

| Problem | Relation | Twist |
|---|---|---|
| **LC 137 – Single Number II** | Triples instead of pairs | XOR alone can't cancel 3 copies (per-bit 1⊕1⊕1 = 1); use per-bit count mod 3, or the `ones`/`twos` state machine. |
| **LC 260 – Single Number III** | Two singletons | Fold everything once → `a⊕b`; any set bit in it (use `x & -x`) splits the array into two groups, each containing exactly one singleton; fold each group. |
| **LC 268 – Missing Number** | Pairs of (index, value) | XOR all indices 0..n with all values; every present value cancels against its index, leaving the missing one. |
| **LC 389 – Find the Difference** | One extra character | Same XOR fold over two strings. |
| **LC 645 – Set Mismatch** | One duplicate + one missing | XOR (or counting) to separate the two anomalies. |
| **LC 287 – Find the Duplicate Number** | **Counter-example** | Multiplicities aren't exactly-2, so XOR cancellation fails; needs cycle detection (Floyd's) or pigeonhole/binary search. Knowing *when the pattern breaks* is the real lesson. |

Also worth knowing: the classic `a ^= b; b ^= a; a ^= b` swap trick — and its aliasing bug (if `a` and `b` are the *same* memory location, it zeroes the value; fine for distinct variables, dangerous in-place).

## 10. Full Interview Narration Script

> **Restate:** "So every value appears exactly twice, one value appears once, and I need O(n) time and O(1) space, returning the singleton's *value*."
>
> **Baselines:** "Brute force is scan-every-pair, O(n²). Sorting gives adjacent pairs in O(n log n) — but comparison sorting is Ω(n log n), so that's dead on arrival. A hash map counts occurrences in O(n) time but O(n) space. So the space constraint is the binding one."
>
> **Insight:** "The structure I want is *pairs cancel*. XOR gives me that: `x ⊕ x = 0`, `x ⊕ 0 = x`, and it's commutative and associative, so I can fold in any order. Every duplicate pair annihilates to 0 and the singleton survives."
>
> **Code + correctness:** "One accumulator starting at 0, XOR everything in, return it. Invariant: after k steps, `acc` is the XOR of the first k elements. Since pairs cancel to 0 and 0 is the identity, the final value is exactly the singleton — order-independent. Negatives are fine because XOR is bitwise two's complement."
>
> **Trace + tests:** "Quick trace on `[4,1,2,1,2]`: 0^4=4, ^1=5, ^2=7, ^1=6, ^2=4 — returns 4. I'd also check n=1, negatives, a zero duplicate, and singleton-at-the-front."
>
> **Complexity:** "One pass, one variable: O(n) time, O(1) space, input unmutated — and Ω(n) is forced anyway since every element must be read."

## 11. Say It in 60 Seconds

> "Single Number: every value appears exactly twice except one, and I need linear time with constant space. Brute-force pair scanning is O(n²), sorting is O(n log n) — and can't beat that in the comparison model — and a hash map is O(n) space, so all three fail a constraint. The trick is XOR. It's commutative and associative, x XOR x equals 0, and x XOR 0 equals x. So I XOR the whole array into one accumulator: every duplicate pair annihilates to zero and the singleton survives — order doesn't matter. One pass, one variable: O(n) time, O(1) space. Negatives are safe since XOR is bitwise two's complement. Trace on [4,1,2,1,2]: 0^4 is 4, ^1 is 5, ^2 is 7, ^1 is 6, ^2 is 4 — answer 4. I'd test n=1, negatives, and a zero as the repeated value. That's it — fold, pairs cancel, return the survivor."
