# Two Sum II — Input Array Is Sorted (LeetCode 167)

A complete interview-prep lesson: restatement → constraint decoding → brute force with trace → core insight → optimal algorithm with traces → complexity → mistakes → patterns → talk track.

---

## 1. Problem Restated (Say It Back in Your Own Words)

> "I'm given an array that is **already sorted in non-decreasing order** (so duplicates are allowed). I must find **two elements at two distinct positions** whose values sum to `target`, and return their positions — **1-indexed**, smaller index first. The problem guarantees **exactly one** such pair exists. Critically, my solution must use **only O(1) extra space**, which immediately rules out the classic hash-map trick from Two Sum I."

Three things to lock in before touching code:

| Fact | Consequence |
|---|---|
| You return **indices**, not values | `[1,2]` for `[2,7,...]`, not `[2,7]` |
| Indices are **1-based** | In Python (0-based), the return is `[left + 1, right + 1]` — the #1 bug in this problem |
| "May not use the same element twice" | Distinct **positions**, not distinct **values** — `[3,3]` with target `6` is a valid input |
| Exactly one solution | You never handle "not found," but the constraint is fragile (see §8) — don't build bugs that only survive because of it |

---

## 2. Decoding the Constraints

| Constraint | What it's telling you |
|---|---|
| `numbers` is sorted, **non-decreasing** | Free ordering information. Duplicates exist. The interviewer is *gifting* you this — it's the hint that O(n) time + O(1) space is achievable. |
| Exactly one solution | No "return empty" branch needed — but a defensive `return [-1, -1]` costs nothing and survives constraint perturbations. |
| **Constant extra space** | The single most important constraint. Hash map = O(n) space = disqualified. This pushes you to two pointers or binary search. |
| `n ≤ 3·10⁴` | Brute force is ~`n(n−1)/2 ≈ 4.5×10⁸` comparisons — very likely TLE in Python and wasteful even in C++. |
| Values and target in `[-1000, 1000]` | Any pair sum is in `[-2000, 2000]` — no overflow possible *in this exact problem*. Also note: sums beyond ±1000 (e.g., `1000 + 1000 = 2000`) can never equal any legal target, so some pairs are structurally impossible — a nice observation to mention, not to exploit. |
| `1 <= index_1 < index_2` | Output is ordered; `left < right` in the scan naturally guarantees this after the +1 shift. |

---

## 3. The Approach Ladder

### 3.1 Brute Force — ignore the sortedness

Check every pair `i < j`. This is the baseline every interviewer expects you to state (and dismiss) in under 20 seconds.

```python
def twoSum_bruteforce(numbers: list[int], target: int) -> list[int]:
    n = len(numbers)
    for i in range(n):
        for j in range(i + 1, n):
            if numbers[i] + numbers[j] == target:
                return [i + 1, j + 1]        # 1-indexed output
    return [-1, -1]                          # unreachable per guarantee
```

**Worked trace** — Example 2: `numbers = [2,3,4]`, `target = 6`:

| `i` | `j` | `numbers[i]` | `numbers[j]` | sum | result |
|---|---|---|---|---|---|
| 0 | 1 | 2 | 3 | 5 | ≠ 6, keep going |
| 0 | 2 | 2 | 4 | 6 | ✅ return `[1, 3]` |

At `n = 3·10⁴` the worst case is ~4.5×10⁸ inner iterations — minutes in Python. **Time O(n²), space O(1).** It ignores the one structural hint the problem gives.

### 3.2 Stepping stone — binary search the complement (O(n log n), O(1) space)

Uses the sortedness, but not fully: for each `i`, binary-search `target - numbers[i]` in the suffix **strictly right of `i`** — `n` scans × O(log n) each.

```python
from bisect import bisect_left

def twoSum_bsearch(numbers: list[int], target: int) -> list[int]:
    n = len(numbers)
    for i in range(n):
        complement = target - numbers[i]
        j = bisect_left(numbers, complement, i + 1, n)   # lo = i+1: never match i with itself
        if j < n and numbers[j] == complement:
            return [i + 1, j + 1]
    return [-1, -1]
```

> **Gotcha (precise version):** search `lo = i + 1`, never `lo = 0`. Interestingly, under *this problem's exact guarantee* (sorted + exactly one solution), a full-range search can't actually produce a false self-match before the real answer — you can prove that a self-match at an index left of the solution would force a duplicated value that itself forms a second, contradicting uniqueness. But the guarantee evaporates the moment an interviewer asks "what if there's no solution?" — `[1,2,3,4]`, target `8` has no pair, and a full-range search happily returns the fake `[4,4]`. `lo = i + 1` is correct unconditionally.

**Time O(n log n), space O(1).** Passes, but a sorted array can do better.

---

## 4. The Core Insight

In a sorted array, compare the **extreme pair** — the smallest remaining value plus the largest remaining value. One comparison gives you a *definitive elimination*:

- If `numbers[left] + numbers[right] < target`: the **left value is dead**. It's the smallest remaining, and even paired with the *largest* remaining value it falls short — so it falls short with every other partner too. Nothing in the window can rescue it. Advance `left`.
- If `numbers[left] + numbers[right] > target`: the **right value is dead**. It's the largest remaining, and even paired with the *smallest* remaining value it overshoots. Retreat `right`.
- If equal: done.

Each iteration permanently removes one element from consideration, so the scan runs **at most n − 1 iterations → O(n)**. That is the whole trick: **the sorted order lets order relationships do the work that a hash map would otherwise do with memory.** You trade the O(n) hash map for O(1) pointers, at the same O(n) time.

Why not move *both* pointers on a mismatch? Because only one of them is provably dead. Moving both is a gamble that can skip the answer — concrete counterexample in §9, mistake #3.

---

## 5. Optimal Solution: Opposite-Ends Two Pointers

```python
def twoSum(numbers: list[int], target: int) -> list[int]:
    left, right = 0, len(numbers) - 1
    while left < right:                          # strict: never pair an element with itself
        s = numbers[left] + numbers[right]
        if s == target:
            return [left + 1, right + 1]         # 0-indexed scan -> 1-indexed answer
        if s < target:
            left += 1        # need a bigger sum: only moving left up can help
        else:
            right -= 1       # need a smaller sum: only moving right down can help
    return [-1, -1]          # defensive; unreachable given "exactly one solution"
```

**Memory:** two integer pointers — O(1). The returned 2-element array is part of the required output, not extra working space.

### 5.1 Traces on the official examples

**Example 1** — `numbers = [2,7,11,15]`, `target = 9`:

| Step | `left` | `right` | `numbers[left]` | `numbers[right]` | sum | decision |
|---|---|---|---|---|---|---|
| 1 | 0 | 3 | 2 | 15 | 17 | 17 > 9 → `right -= 1` |
| 2 | 0 | 2 | 2 | 11 | 13 | 13 > 9 → `right -= 1` |
| 3 | 0 | 1 | 2 | 7 | 9 | ✅ return `[1, 2]` |

**Example 2** — `numbers = [2,3,4]`, `target = 6`:

| Step | `left` | `right` | `numbers[left]` | `numbers[right]` | sum | decision |
|---|---|---|---|---|---|---|
| 1 | 0 | 2 | 2 | 4 | 6 | ✅ return `[1, 3]` |

*Why this example matters:* the answer is at the extremes while the adjacent pair `2+3=5` fails — it catches anyone who scans greedily from the left, and it confirms we don't "reuse" the middle element.

**Example 3** — `numbers = [-1,0]`, `target = -1`:

| Step | `left` | `right` | `numbers[left]` | `numbers[right]` | sum | decision |
|---|---|---|---|---|---|---|
| 1 | 0 | 1 | −1 | 0 | −1 | ✅ return `[1, 2]` |

*Why this example matters:* negatives work with zero special handling (a symptom of over-thinking), and `n = 2` is the minimum input.

**Bonus trace — both pointer directions in one run.** `numbers = [1,2,5,7,9,13]`, `target = 11` (answer: `2 + 9`, i.e., `[2,5]`):

| Step | `left` | `right` | `numbers[left]` | `numbers[right]` | sum | decision |
|---|---|---|---|---|---|---|
| 1 | 0 | 5 | 1 | 13 | 14 | too big → `right -= 1` |
| 2 | 0 | 4 | 1 | 9 | 10 | too small → `left += 1` |
| 3 | 1 | 4 | 2 | 9 | 11 | ✅ return `[2, 5]` |

### 5.2 Why it never skips the answer (the 30-second correctness argument)

Let the unique solution be `(i*, j*)`. **Invariant: until we return, `left ≤ i*` and `right ≥ j*.** Initially true (`left = 0`, `right = n−1`). Suppose `sum < target` and we advance `left`. If `left` were `i*`, then since `right ≥ j*` and the array is sorted, `numbers[i*] + numbers[right] ≥ numbers[i*] + numbers[j*] = target` — contradicting `sum < target`. So `left ≠ i*`, and the invariant survives. The `sum > target` case is symmetric for `right`. The window shrinks by exactly one each iteration, so before the pointers can cross, we reach `left = i*`, `right = j*` and return. (If no solution existed, the loop still terminates cleanly with `left == right` — which is why the defensive `[-1, -1]` is honest, not dead weight.)

**Optimality:** O(n) time is a worst-case lower bound for any correct algorithm here, because an element the algorithm hasn't inspected could always be part of the unique answer — so every element must be examined at least once in the worst case.

---

## 6. Complexity Summary

| Approach | Time | Extra space | Meets constraints? | Notes |
|---|---|---|---|---|
| Brute force double loop | O(n²) | O(1) | ❌ time (~4.5×10⁸ checks at n = 3·10⁴) | ignores sortedness |
| Hash map (Two Sum I style) | O(n) | O(n) | ❌ violates constant-space rule | correct but disqualified |
| Binary search per index | O(n log n) | O(1) | ✅ | good fallback if you stall |
| **Two pointers** | **O(n)** | **O(1)** | ✅ **optimal** | ≤ n−1 iterations |

Follow-up proof of concept: if the array *weren't* sorted, you'd sort first (O(n log n), carrying original indices) or use the O(n)-space hash map; you can't beat O(n log n) for the sort step because comparison-based sorting has an Ω(n log n) worst-case lower bound from the log(n!) information-theoretic argument. Worth mentioning in one sentence if the interviewer flips constraints.

---

## 7. Full Interview Talk Track (the script behind the 60-second version)

> **1 · Clarify (30s).** "Sorted, non-decreasing — so duplicates are possible. Answer is 1-indexed, smaller index first, exactly one pair guaranteed, and I can't use the same *position* twice — though two equal *values* at different positions are fine. The binding constraint is constant extra space, so the hash-map approach from Two Sum I is off the table."
>
> **2 · Baseline (30s).** "Without the sorted order I'd try all pairs: O(n²) — about 4.5×10⁸ comparisons at this input size, too slow. With sortedness but no two-pointer idea, I could binary-search each complement: O(n log n), O(1) space. Both are fallbacks; the sorted array supports something better."
>
> **3 · Insight (45s).** "Put a pointer at each end. Compare smallest + largest. If the sum is *small*, the left value can't work — even with the largest remaining partner it's short, so every other partner is worse. If it's *large*, the right value can't work — even with the smallest partner it overshoots. One comparison eliminates one element permanently, so at most n−1 iterations. Since exactly one solution exists, the elimination argument guarantees the pointers land on it — they can't skip past it."
>
> **4 · Code (60s).** "Left at 0, right at n−1, loop while `left < right` — strict inequality, so an element never pairs with itself. Three-way branch: equal → return; small → `left += 1`; large → `right -= 1`. And the return is `[left + 1, right + 1]` — plus one, because the problem is 1-indexed and I'm scanning 0-indexed. That shift is the classic off-by-one here."
>
> **5 · Trace (45s).** "Example 1: 2+15=17 too big, 2+11=13 too big, 2+7=9 → `[1,2]`. Example 2 is the trap case — answer at the extremes, `[1,3]`. Example 3 checks negatives and minimum size."
>
> **6 · Tests & close (30s).** "I'd also check duplicates `[3,3]`/6, an all-negative case, and ask what to do if no solution existed — I'd return `[-1,-1]` defensively. Final: O(n) time, O(1) space, and O(n) is optimal since every element might need inspection."

---

## 8. Test Cases to Propose Out Loud

State these *before or while* coding — it signals test discipline:

| # | Input | Target | Expected | What it exercises |
|---|---|---|---|---|
| E1 | `[2,7,11,15]` | 9 | `[1,2]` | official; basic happy path |
| E2 | `[2,3,4]` | 6 | `[1,3]` | official; answer at extremes, adjacent pair is a decoy |
| E3 | `[-1,0]` | −1 | `[1,2]` | official; negatives, minimum size n = 2 |
| T4 | `[3,3]` | 6 | `[1,2]` | **duplicates**: equal values, distinct indices |
| T5 | `[-5,-3,-1]` | −8 | `[1,2]` | all-negative arithmetic; no special-casing for signs |
| T6 | `[1,2,5,7,9,13]` | 11 | `[2,5]` | forces movement in **both** directions (catches one-sided or move-both bugs) |
| T7 | `[3,5,8,12,17,21,26]` | 25 | `[3,5]` | interior answer after several moves each way |

**Stress/performance note to mention:** `n = 3·10⁴` with `numbers[i] = i` and target `59999` (answer `[29999, 30000]`) drives ~29,999 consecutive `left += 1` steps — the worst-case linear pointer travel; still instant at O(n).

**Constraint-perturbation questions worth raising:** "What should I return if there's no solution?" (my code: `[-1,-1]`) and "Would your approach still work with unsorted input?" (no — I'd sort with index pairs at O(n log n), or fall back to the O(n)-space hash map).

---

## 9. Common Mistakes

| # | Mistake | Why it fails | Fix |
|---|---|---|---|
| 1 | Returning values, or 0-based indices | Problem asks for 1-based **indices** | `[left + 1, right + 1]` |
| 2 | Loop condition `left <= right` | Allows `left == right`, i.e., pairing an element with itself. On inputs *with* a guaranteed solution it happens to still work, but it's logically wrong: drop the guarantee (e.g., `[1,2,3,4]`, target 8 — no pair exists) and it returns the fake `[4,4]` | Strict `left < right` |
| 3 | Moving **both** pointers on a mismatch | Can skip the answer: `[1,2,3,4]`, target 6 → `1+4=5` (small), move both → `2+3=5` (small), move both → pointers cross. The real answer `2+4` is never tested | Move only the pointer whose exclusion you can *prove* |
| 4 | Moving the wrong single pointer | If sum < target, decrementing `right` makes the sum *smaller* — you diverge, never converge | Mnemonic: **too small → left up; too big → right down** |
| 5 | Assuming "can't reuse an element" means "values must differ" | `[3,3]`, target 6 is legal: two positions, one value | Think in positions, not values |
| 6 | Hand-rolled "skip duplicates" logic | Unnecessary and buggy-prone; the plain pointer moves already handle duplicates (`[3,3]` resolves in one step) | Keep it simple |
| 7 | Reflexively writing the Two Sum I hash map | O(n) extra space — violates the headline constraint; instant design demerit even though it's correct | Name it, reject it, justify two pointers |
| 8 | Binary-search variant searching `lo = 0` | Can self-match when `2·numbers[i] == target` once the "exactly one solution" guarantee is dropped (`[1,2,3,4]`, target 8 → fake `[4,4]`) | `lo = i + 1` always |

### Language gotchas (short version)

| Language | Gotcha |
|---|---|
| **Python** | No overflow (arbitrary-precision ints). Real traps: forgetting the `+1` shift on return, and silently breaking O(1) space — e.g., slicing `numbers[1:]` in the binary-search variant instead of `bisect_left(..., lo, hi)`. |
| **Java** | With the stated ±1000 bounds nothing overflows, but if the interviewer lifts them, `numbers[left] + numbers[right]` overflows `int` *silently* (wraps) — write `(long) numbers[left] + numbers[right]`. Return `new int[]{left + 1, right + 1}` — a common slip is returning the values or the raw 0-based indices. If you discuss the (disqualified) hash-map approach, note `HashMap<Integer,Integer>` autoboxes every key/value. |
| **C++** | `numbers.size()` is unsigned: `int right = static_cast<int>(numbers.size()) - 1;` is safe here (n ≥ 2), but if you generalize to possibly-empty input and keep `right` as `size_t`, `right--` at 0 wraps to `SIZE_MAX` → out-of-bounds read. Same `long long` advice if bounds are lifted. |

---

## 10. Transferable Patterns & Related Problems

**The meta-pattern:** *sorted order is free information — spend it instead of memory.* Opposite-ends two pointers is legitimate whenever you can argue, after comparing the extreme pair, that **one endpoint is provably excluded from every remaining valid answer**. That "prove one side is dead" step is the part interviewers listen for; the loop itself is trivial.

| Problem | Connection |
|---|---|
| LC 1 — Two Sum | The unsorted twin: hash map O(n)/O(n). This problem is the same task with constraints flipped — great example of *one changed constraint changing the optimal tool*. |
| LC 15 — 3Sum | Sort, fix `i`, two-pointer scan on the suffix. Direct extension of today's inner loop. |
| LC 16 — 3Sum Closest, LC 18 — 4Sum | Same skeleton; k-Sum recursively reduces to the 2-pointer base case. |
| LC 653 — Two Sum IV (BST) | Same pair-sum logic on a BST via two in-order iterators. |
| LC 977 — Squares of a Sorted Array | Opposite-ends fill; identical "which endpoint is dead?" reasoning, output side. |
| LC 11 — Container With Most Water | Move the side that bounds the answer — same style of exclusion proof. |
| LC 88 — Merge Sorted Array | Two pointers running *backwards*; complementary direction, same discipline. |
| LC 125/680 — Valid Palindrome(s) | Mechanics warm-up with no target sum. |
| LC 1099 — Two Sum Less Than K | Threshold variant: advance the pointer that relaxes the constraint, track the best so far. |

**Practice habit:** re-solve problems you know with one constraint flipped (remove sortedness; remove the O(1)-space rule; ask for *all* pairs). It builds exactly the adaptability interviews test.

---

## 11. Say It in 60 Seconds

> "Since the array is sorted, I'll use two pointers at both ends — O(n) time, O(1) extra space, which the constant-space rule forces; a hash map like in Two Sum I would be O(n) space, and brute force is quadratic and throws away the sortedness. At each step I compare the sum of the two pointed values to the target. If it's too small, the left value is unusable — even paired with the largest remaining number it falls short — so I advance left. If it's too big, the right value is unusable — even the smallest partner overshoots — so I pull right in. Every step permanently eliminates one element, so at most n minus one iterations, and because exactly one solution exists, that elimination argument guarantees the pointers can't skip past the answer. When the sum hits the target, I return left plus one and right plus one — the problem is one-indexed, and that shift is the classic off-by-one. Tests I'd run: the three official examples, duplicates like `[3,3]` targeting six, and an all-negative case."

*(~165 words ≈ 60 seconds at interview pace. Lead with the approach, justify each move, close with the index shift and tests — that ordering is what the full talk track in §7 rehearses.)*
