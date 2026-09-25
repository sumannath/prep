# Contains Duplicate (LeetCode 217) — Complete Interview Lesson

## 1. Restating the Problem Precisely

> **Given an integer array `nums`, return `true` if any value appears at least twice; return `false` if every element is distinct.**

Before touching code, pin down exactly what's being asked — interviewers notice precision here:

- **"Duplicate" is about values, verified through indices.** Formally: return `true` iff there exist two **distinct indices** `i ≠ j` with `nums[i] == nums[j]`. One element can never duplicate *itself* — it takes two positions holding the same value.
- **"At least twice"** means a value occurring 3, 5, or 10 times still just yields one `true`. You can stop at the second sighting.
- **The output is a boolean.** Not the repeated value, not the indices. Candidates who start returning the duplicate value have misread the signature.
- **Order and position don't matter.** `[1,2,3,1]` is `true` even though the repeat is far apart; `[2,1,1]` and `[1,1,2]` are equally `true`.
- Constraints guarantee `n ≥ 1`, so strictly there is no empty input — but saying "I'll assume non-empty per the constraints; if it could be empty, I'd return `false` (no value can repeat)" is a cheap, impressive clarification.

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= nums.length <= 10^5` | n = 100,000. A nested pair loop does up to `n(n−1)/2 ≈ 5×10⁹` comparisons on an all-distinct input — far too slow (seconds to minutes vs. the usual ~10⁸–10⁹ ops/sec budget). O(n²) is out; O(n) or O(n log n) is the target. |
| `-10^9 <= nums[i] <= 10^9` | The **value range** spans about `2×10⁹ + 1` possible values, and **negatives are allowed**. A direct counting array indexed by value would need ~2.1 GB for one byte per value (or ~250 MB even as a bitset) — infeasible. This kills the "small value range" tricks and forces a hash-based or sort-based approach. |
| `n ≥ 1` | Single-element arrays are legal and must return `false`. |

**Takeaway:** the two constraints together are the problem quietly telling you: *"don't compare all pairs, and don't index by value — hash it."*

## 3. Brute Force: Compare Every Pair

Check all index pairs `(i, j)` with `i < j`; if any pair has equal values, return `true`.

```python
def containsDuplicate_bruteforce(nums: list[int]) -> bool:
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):   # j starts at i+1: need two DISTINCT indices
            if nums[i] == nums[j]:
                return True
    return False
```

**Worked trace on Example 1, `nums = [1,2,3,1]`** (indices → values: 0→1, 1→2, 2→3, 3→1):

| Pair (i, j) | nums[i] | nums[j] | Equal? |
|---|---|---|---|
| (0, 1) | 1 | 2 | no |
| (0, 2) | 1 | 3 | no |
| (0, 3) | 1 | **1** | **yes → return `true`** |

Only 3 of the 6 possible pairs were checked thanks to early exit — but that's luck. On an **all-distinct** array (Example 2 scaled to n = 10⁵), the loop completes all ~5×10⁹ comparisons.

- **Time:** O(n²) worst case — TLE at this scale.
- **Space:** O(1).
- **Verdict:** correct but too slow. Say this out loud, then improve it — the brute force is your baseline, not your answer.

## 4. The Core Insight

Reframe the question. "Does any value appear twice?" is equivalent to:

> **"As I scan left to right, do I ever encounter a value I have already seen in the prefix before me?"**

That is a **membership query over the set of previously-seen values** — and membership queries are exactly what a **hash set** answers in O(1) average time. So instead of re-scanning the prefix for each element (which is what the brute force does, implicitly), *remember* the prefix in a set.

Secondary insight (for the space-constrained variant): **after sorting, any duplicate values become adjacent**, so a single linear scan of neighbors suffices.

## 5. Optimal Approach

### 5.1 One-Pass Hash Set (the interview default)

```python
def containsDuplicate(nums: list[int]) -> bool:
    seen = set()
    for x in nums:
        if x in seen:      # check membership FIRST
            return True
        seen.add(x)        # then record
    return False
```

**Invariant:** before processing index `i`, `seen` contains exactly the values at indices `0..i−1`. So `x in seen` is precisely "this value occurred at some earlier, distinct index."

**Trace on Example 1, `nums = [1,2,3,1]`:**

| Step | Index | x | `x in seen`? | Action | `seen` after |
|---|---|---|---|---|---|
| 1 | 0 | 1 | no | add | `{1}` |
| 2 | 1 | 2 | no | add | `{1,2}` |
| 3 | 2 | 3 | no | add | `{1,2,3}` |
| 4 | 3 | 1 | **yes** | **return `true`** | — |

**Trace on Example 2, `nums = [1,2,3,4]`:** all four steps answer "no"; `seen` grows to `{1,2,3,4}`; the loop ends → **return `false`**. This is the worst case for early exit — full work, but still just O(n).

**Trace on Example 3, `nums = [1,1,1,3,3,4,3,2,4,2]`:**

| Step | Index | x | `x in seen`? | Action | `seen` after |
|---|---|---|---|---|---|
| 1 | 0 | 1 | no | add | `{1}` |
| 2 | 1 | 1 | **yes** | **return `true`** | — |

Only 2 of 10 elements inspected. Early exit is why the loop version beats "clever" alternatives on duplicate-heavy inputs.

- **Time:** O(n) average (each set op is O(1) average; a pathological all-colliding input degrades toward O(n) per op, which is why the claim is stated as *average*).
- **Space:** O(n) for the set in the worst (all-distinct) case.

### 5.2 The Pythonic One-Liner (know it, but name its weakness)

```python
def containsDuplicate_oneliner(nums: list[int]) -> bool:
    return len(set(nums)) != len(nums)
```

A `set` keeps one copy per distinct value, so differing lengths ⇔ some value repeated. Correct and O(n)/O(n) — but `set(nums)` **builds the entire set before comparing**, so it never early-exits. Fine to mention; lead with the loop in interviews.

### 5.3 Sorting Alternative (when memory, not time, is the constraint)

```python
def containsDuplicate_sort(nums: list[int]) -> bool:
    nums = sorted(nums)            # copy: don't mutate caller's data unasked
    for i in range(1, len(nums)):
        if nums[i] == nums[i - 1]:
            return True
    return False
```

Micro-trace on Example 1: sorted → `[1,1,2,3]`; at `i = 1`, `nums[1] == nums[0]` (1 == 1) → `true`. Example 2 sorts to `[1,2,3,4]`, no adjacent equality → `false`.

- **Time:** O(n log n). This is the best possible for comparison-based sorting, since distinguishing among the n! input orderings requires Ω(n log n) comparisons — each comparison splits the remaining possible orderings at most in half.
- **Space:** O(1)–O(n) auxiliary depending on the sort implementation (Python's Timsort uses up to O(n); C++'s introsort is effectively in-place) — so qualify any "O(1) space" claim.
- **Caveat:** it mutates or copies the input, and it must read/sort *everything* before it can answer.

## 6. Lower Bound: Why O(n) Time Is Optimal

Any correct algorithm must examine every element in the worst case: if it skips even one position, an adversary can present two inputs identical everywhere except that unread position — one with a duplicate there, one without — and the algorithm, having seen identical data, must give the same (necessarily wrong) answer to one of them. Hence **Ω(n) reads are unavoidable**, and the hash-set solution is asymptotically optimal in time; the only remaining knob is space.

## 7. Complexity Summary

| Approach | Time | Space | Early exit? | Notes |
|---|---|---|---|---|
| All-pairs brute force | O(n²) | O(1) | Yes | ~5×10⁹ comparisons at n=10⁵ → TLE |
| Counting array over value range | O(n + V), V≈2×10⁹ | O(V) ≈ 2 GB | Yes | Infeasible here; works only when values are small/bounded |
| Sort + adjacent scan | O(n log n) | O(1)–O(n) aux (impl.-dependent) | Yes (at scan stage) | Mutates/copies input; no hash needed |
| **Hash set, one pass** | **O(n) avg** | **O(n)** | **Yes** | **The expected answer** |
| `len(set(nums)) != len(nums)` | O(n) | O(n) | No | Concise; always does full work |

## 8. Common Mistakes

| Mistake | Symptom / why it's wrong | Fix |
|---|---|---|
| Membership test against a **list** (`if x in seen_list`) | `list.__contains__` is a linear scan → O(n²) total; passes small tests, TLEs big ones | Use a `set` |
| Brute-force inner loop starts at `j = i` (or compares `nums[i] == nums[i]`) | Every element "matches itself" → returns `true` for **every** input. Classic index/value confusion: a duplicate requires two *distinct* indices | `j` starts at `i + 1` |
| **Adding before checking** (`seen.add(x)` then `if x in seen`) | `x` is trivially present the moment you inserted it → always `true` | Check membership first, then add |
| Using `nums.count(x) > 1` in a loop | `count` is O(n) per call → O(n²) overall, disguised as clean Python | Same fix: hash set |
| `nums.sort()` on data the caller owns | Mutates input order silently | `sorted(nums)` copy, or ask permission first |
| Assuming small / non-negative values | Counting-array plans die on `[−10⁹, 10⁹]` (≈2×10⁹ slots, negatives) | Hash set is value-range-agnostic |
| Returning the duplicate value or index | Signature returns `bool` | Track a boolean (or keep the hit value only if asked as a follow-up) |

## 9. Language-Specific Gotchas (Python / Java / C++)

| Language | Gotcha | Note |
|---|---|---|
| Python | `x in some_list` is O(n) | The #1 silent performance bug; `in` on a `set` is the O(1)-average op |
| Python | `set.add()` returns `None` (in-place mutation) | Never write `seen = seen.add(x)` |
| Java | `HashSet<Integer>` **autoboxes** every `int` (one allocation per insertion), and `contains` uses `equals`/`hashCode` | Fine at n=10⁵; but never compare boxed `Integer`s with `==` — the identity cache only spans −128..127, so `Integer a=1000, b=1000; a==b` is `false` |
| Java | `ArrayList.contains` is an O(n) scan | Using it as the membership check silently yields O(n²) |
| C++ | `std::unordered_set` is average O(1) but worst-case O(n) per op under collisions; `std::set` guarantees O(log n) | Either is acceptable; say "average O(1)" for the hash version |
| C++ | `st.insert(x).second` is `false` when `x` was already present | Detects a duplicate with **one** hash lookup instead of `count` + `insert` |

## 10. Tests to Propose Out Loud

State these before or right after coding — it signals rigor and often catches your own bugs:

| # | Input | Expected | Why it earns its place |
|---|---|---|---|
| 1 | `[1,2,3,1]` | `true` | Official example; duplicate far from original |
| 2 | `[1,2,3,4]` | `false` | Official; the all-distinct worst case |
| 3 | `[1,1,1,3,3,4,3,2,4,2]` | `true` | Official; repeats + early exit at index 1 |
| 4 | `[1]` | `false` | Minimum size; no pair `(i, j)` with `i ≠ j` exists |
| 5 | `[1,1]` | `true` | Smallest possible duplicate; pins down the definition |
| 6 | `[-1000000000, 1000000000, -1000000000]` | `true` | Negatives and extreme bounds — hashing must handle the full value range |
| 7 | `[7,7,7,7]` | `true` | All-equal; "at least twice," not "exactly twice"; instant early exit |
| 8 | Strictly increasing `1..100000` | `false` | Stress test: no early exit ever fires; checks you're not accidentally O(n²) |

Also *say*: "Constraints give n ≥ 1; if an empty array were possible, I'd return `false`."

## 11. Transferable Patterns & Related Problems

- **The "seen set" pattern** — one pass, hash set of history, answer at first membership hit. This is *the* workhorse for: **Two Sum** (store complements/values seen), **Contains Duplicate II** (value → most recent index, check distance ≤ k), **Contains Duplicate III** (bucketing on value), **Longest Consecutive Sequence** (set membership for O(n) chain starts), **First Repeating Element**.
- **Trade space for time** — replacing a repeated scan with O(n) memory that answers membership (or frequency, via `Counter`/`HashMap`) in O(1). Frequency-counting variant unlocks **Top K Frequent**, **Majority Element**, **Group Anagrams**.
- **Sort-first pattern** — when O(1)-ish extra space matters or when sorting makes structure *adjacent*: duplicates become neighbors here; same idea powers **Merge Intervals**, dedup in **3Sum**, and **Missing Number**-style scans.
- **Bounded-value tricks (contrast!)** — when values *are* small, a value-indexed array beats a hash set (e.g., **268 Missing Number**, **448 Find All Numbers Disappeared**). This problem's `[−10⁹, 10⁹]` range is exactly the case where that trick is *forbidden* — know when each applies.
- **Directly related:** LC 219 (Contains Duplicate II), LC 220 (Contains Duplicate III), LC 287 (Find the Duplicate Number — same question under brutal space/structure constraints), LC 136 (Single Number).

## 12. Full Interview Talk Track (script)

> "Let me restate: given an array, return true if any *value* appears at least twice — meaning there are two distinct indices holding equal values — and false if all elements are distinct. The output is a boolean, and constraints are n up to 100k with values from −10⁹ to 10⁹.
>
> Brute force: compare every pair — O(n²) time, O(1) space. At n = 100k that's about five billion comparisons worst case, too slow, though it's my correctness baseline.
>
> The key insight: scanning left to right, 'is this a duplicate?' is exactly 'have I seen this value earlier?' That's a membership question, and a hash set answers membership in O(1) average. So: one pass, keep a `seen` set. For each element, if it's already in the set, return true immediately; otherwise add it. If the loop finishes, return false. O(n) average time, O(n) space, and it early-exits on the first repeat — on an input like `[1,1,1,…]` it inspects just two elements.
>
> This is time-optimal: any algorithm must read every element in the worst case, because a skipped position could be exactly where the duplicate hides. If the interviewer pushes on space, the alternative is sort-then-scan-adjacent — O(n log n) time, effectively in-place, at the cost of mutating the input.
>
> Tests I'd run: single element → false; `[1,1]` → true; negatives at ±10⁹ → true; all-equal array → true via instant early exit; and a strictly increasing 100k array → false, which is the performance worst case.
>
> Follow-ups I'm ready for: tiny value range → counting array; report the duplicate itself → keep the element that triggered the hit; distance-k variant → value-to-index map."

## 13. Say It in 60 Seconds

> "Contains Duplicate — return true if any value shows up twice, using two distinct indices. Brute force is every pair: O(n²), way too slow at 100k. The insight: scanning left to right, 'is this a duplicate?' is just 'have I seen this value before?' — and a hash set answers that in O(1) average. So, one pass: for each number, if it's already in my seen-set, return true on the spot; otherwise add it and keep going. Loop finishes, return false. That's O(n) average time, O(n) space, with early exit on the first repeat — and O(n) is optimal, since every element must be read in the worst case. If space is tight instead, sort and check neighbors: O(n log n), but it mutates the input. Tests I'd call out: single element → false; `[1,1]` → true; negatives at the ±10⁹ bounds; and a 100k all-distinct array to prove I'm not quadratic."

*(~155 words — comfortably recitable in under a minute, and it hits restatement, brute force, insight, solution, complexity, optimality, alternative, and tests.)*
