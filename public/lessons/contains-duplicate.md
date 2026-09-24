# Contains Duplicate (LeetCode 217) — Complete Interview Prep Lesson

## 1. Problem Restatement (with precision)

**Formal restatement.** Given an integer array `nums` of length `n`, determine whether there exist **two distinct indices** `i ≠ j` such that `nums[i] == nums[j]`. Return `True` if such a pair exists, otherwise `False`.

Precision points that matter in an interview:

- The question is about **values**, compared across **different indices**. A duplicate means the *same value* sits at two (or more) *different* positions.
- "At least twice" means a count of **≥ 2** is enough. We never need to know *which* value duplicates or *how many times* — only *whether* one exists.
- The output is a **boolean only**. This allows early exit: the first duplicate found settles the answer.
- Sanity check on the examples:
  - `[1,2,3,1]` → indices 0 and 3 both hold value `1` → `True`
  - `[1,2,3,4]` → every value occurs at exactly one index → `False`
  - `[1,1,1,3,3,4,3,2,4,2]` → value `1` occurs at indices 0, 1, 2 → `True` (the extra occurrences of `3`, `4`, `2` are irrelevant)

## 2. Constraint Decoding

Every constraint is a hint about the intended solution:

| Constraint | What it tells you |
|---|---|
| `1 <= nums.length <= 10^5` | `n` is large enough that **O(n²)** is dead: ~`n(n−1)/2 ≈ 5×10⁹` comparisons → TLE. Target **O(n log n)** or **O(n)**. Also `n ≥ 1`, so no empty input — but robust code should still handle `n = 0` gracefully (answer: `False`). |
| `-10^9 <= nums[i] <= 10^9` | The **value domain** has `2×10⁹ + 1` possible values. A lookup array indexed by value would need ~2 GB and breaks on negative values. **Do not** use a value-indexed flags array — use a **hash set** (pays for what you've *seen*, not what *could exist*) or **sorting**. |
| Values fit in 32-bit signed int | No arithmetic on values is needed, so no overflow concerns in any language. |
| Return type is `bool` | Early exit is legal and desirable. |
| Number of distinct values ≤ `n` ≤ 10⁵ | A set holds at most 10⁵ entries — a few MB. Memory is not a problem for hashing. |

**A reasoning note (pigeonhole):** if the value domain were *smaller* than `n` (e.g., values in `[0, 100]` with `n = 200`), a duplicate would be guaranteed with zero scanning. Here the domain (≈2×10⁹) dwarfs `n` (≤10⁵), so that shortcut can never fire — but articulating this shows you understand *why* hashing is needed.

## 3. Baseline: Brute Force with a Worked Trace

**Idea:** check every unordered pair of indices `(i, j)` with `i < j`.

```python
def contains_duplicate_bruteforce(nums: list[int]) -> bool:
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):   # j starts at i+1: never compare an index with itself
            if nums[i] == nums[j]:
                return True          # early exit on the first duplicate pair
    return False
```

**Worked trace on Example 1, `nums = [1, 2, 3, 1]`:**

| i | nums[i] | j | nums[j] | nums[i] == nums[j]? | Action |
|---|---|---|---|---|---|
| 0 | 1 | 1 | 2 | No | continue |
| 0 | 1 | 2 | 3 | No | continue |
| 0 | 1 | 3 | 1 | **Yes** | **return True** |

Only 3 comparisons here because of the early exit.

**Example 2, `nums = [1, 2, 3, 4]`** (worst case — answer is `False`): all `C(4,2) = 6` pairs must be checked — `(0,1), (0,2), (0,3), (1,2), (1,3), (2,3)` — all unequal → `False`.

**Complexity:** time **O(n²)** (exactly `n(n−1)/2` comparisons in the worst case), space **O(1)**.

**Why it fails at scale:** at `n = 10⁵` that's **4,999,950,000** comparisons. In Python that's minutes; even in C it's seconds. Definite TLE. State this baseline in an interview, quantify *why* it's too slow, then improve it.

## 4. Stepping Stone: Sort + Adjacent Scan

**Insight:** after sorting, equal values become **adjacent**, so "a duplicate exists" ⇔ "some adjacent pair is equal."

```python
def contains_duplicate_sort(nums: list[int]) -> bool:
    nums = sorted(nums)   # sorted() copies; use nums.sort() only if mutation is allowed
    for i in range(1, len(nums)):
        if nums[i] == nums[i - 1]:
            return True
    return False
```

**Trace on Example 3:** input `[1,1,1,3,3,4,3,2,4,2]` → sorted `[1,1,1,2,2,3,3,3,4,4]`.
Scan: `i = 1`: `nums[1] = 1 == nums[0] = 1` → **True** immediately.

**Complexity:** time **O(n log n)**; extra space **O(1)–O(n)** depending on the sort (Python's Timsort can use O(n) temporary buffer in the worst case; conceptually "in-place"). **Trade-off:** destroys input order, or costs an O(n) copy to preserve it.

## 5. The Core Insight

Two equivalent framings — lead with the first in an interview:

1. **Prefix framing ("have I seen this before?"):** "Some value appears twice" ⇔ "while scanning left→right, at some point I encounter a value already present in the prefix I've scanned." A **hash set of seen values** answers *"is `x` in the prefix?"* in **O(1) expected time**, converting a global all-pairs question into a per-element O(1) check.
2. **Counting framing (cardinality):** a duplicate exists ⇔ the number of distinct values is **less than** `n` ⇔ `len(set(nums)) < len(nums)`.

**Why hashing beats a value-indexed array here:** the domain is huge (≈2×10⁹ possible values) but the *occupancy* is at most 10⁵. A hash set stores only values actually seen; a flags array pays for the entire domain. This "store occupancy, not domain" idea recurs across dozens of problems.

**Why a set and not a Counter:** we only need existence (count ≥ 2), and a set detects exactly that. A `Counter` is the right tool only when actual counts matter.

## 6. Optimal Solution: One-Pass Hash Set with Early Exit

**Algorithm:**
1. Initialize `seen = set()` (empty).
2. For each value `x` in `nums`, in order:
   - If `x in seen` → a value occurs at two distinct indices → **return True**.
   - Otherwise, add `x` to `seen`.
3. If the loop completes with no hit → **return False**.

```python
from typing import List

class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        seen = set()
        for x in nums:
            if x in seen:      # O(1) expected membership test
                return True    # early exit: first duplicate settles the answer
            seen.add(x)
        return False
```

**Pythonic one-liner (know it, and know the trade-off):**

```python
class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        return len(set(nums)) < len(nums)
```

- The **loop version** exits at the first duplicate — better when duplicates appear early, and it works on **streams/iterators** that can't be materialized.
- The **one-liner** always processes all `n` elements (no early exit), but the loop runs in C inside `set()`, so in CPython it's often the fastest wall-clock on typical tests.
- In an interview: present the loop as *the algorithm*, mention the one-liner as the idiomatic equivalent, and explicitly call out the early-exit distinction. That nuance signals seniority.

### Traces on the Official Examples

**Example 1: `nums = [1, 2, 3, 1]`** → expected `True`

| Step | i | x | seen (before) | x in seen? | Action | seen (after) |
|---|---|---|---|---|---|---|
| 1 | 0 | 1 | `{}` | No | add | `{1}` |
| 2 | 1 | 2 | `{1}` | No | add | `{1, 2}` |
| 3 | 2 | 3 | `{1, 2}` | No | add | `{1, 2, 3}` |
| 4 | 3 | 1 | `{1, 2, 3}` | **Yes** | **return True** | — |

**Example 2: `nums = [1, 2, 3, 4]`** → expected `False`

| Step | i | x | x in seen? | Action |
|---|---|---|---|---|
| 1 | 0 | 1 | No | add → `{1}` |
| 2 | 1 | 2 | No | add → `{1, 2}` |
| 3 | 2 | 3 | No | add → `{1, 2, 3}` |
| 4 | 3 | 4 | No | add → `{1, 2, 3, 4}` |

Loop ends with no hit → **return False**.

**Example 3: `nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]`** → expected `True`

| Step | i | x | seen (before) | x in seen? | Action |
|---|---|---|---|---|---|
| 1 | 0 | 1 | `{}` | No | add → `{1}` |
| 2 | 1 | 1 | `{1}` | **Yes** | **return True** |

Early exit after **2 of 10** elements — the rest of the array is never touched. Note also that triple occurrences (`1` appears 3×) are irrelevant: the set fires at the *second* occurrence and stops.

### Complexity of the Optimal Approach

- **Time: O(n) expected.** Each element does one expected-O(1) set lookup and one O(1) insert. (Adversarial hash collisions can degrade individual operations, so the *precise* phrasing interviewers respect is "expected/amortized O(n)", not "worst case O(n)".)
- **Space: O(n)** — at most `min(n, distinct values)` = 10⁵ entries.

## 7. Complexity Summary Table

| # | Approach | Time | Extra Space | Early exit? | Preserves input? | Verdict at `n = 10⁵` |
|---|---|---|---|---|---|---|
| 1 | Nested loops (all pairs) | O(n²) | O(1) | ✅ | ✅ | ❌ TLE (~5×10⁹ comparisons) |
| 2 | Sort + adjacent scan | O(n log n) | O(1)–O(n) (sort-dependent) | ✅ (scan phase) | ❌ (or O(n) copy) | ✅ memory-friendly fallback |
| 3 | Hash set, one pass | O(n) expected | O(n) | ✅ | ✅ | ✅ **canonical answer** |
| 4 | `len(set(nums)) < len(nums)` | O(n) expected | O(n) | ❌ | ✅ | ✅ fastest constant factor in CPython |
| 5 | `Counter` then check counts | O(n) | O(n) | ❌ | ✅ | Overkill here; right tool when counts are needed |

## 8. Edge Cases (and how the optimal code behaves)

| Case | Expected | Why the code handles it |
|---|---|---|
| `n = 1`, e.g. `[7]` | `False` | No pair of distinct indices exists; the loop adds `7` and ends → `False`. |
| All equal, `[5,5,5,5]` | `True` | Fires at the second element via early exit. |
| Duplicate far apart, `[1,2,3,…,1]` | `True` | Correct; worst case scans all `n` elements. |
| Negatives, `[-1,-1]` or `[-10⁹, 10⁹]` | `True` / `False` | Hashing works for any int; no index math → no offset/overflow issues. |
| Values at extremes `±10⁹` | — | Fine in Python (arbitrary precision) and in `HashSet<Integer>`/`unordered_set<int>` since we never do arithmetic. |
| Empty array (outside stated constraints) | `False` | Both optimal versions return `False` naturally — mention this robustness unprompted. |
| Value occurs 3+ times | `True` | Detected at the second occurrence; later occurrences never examined. |

## 9. Common Mistakes (with buggy snippets)

**Mistake 1 — Self-comparison in the brute force.** Starting the inner loop at `0` makes `i == j` compare an index with itself:

```python
for i in range(n):
    for j in range(n):            # BUG: j must start at i+1
        if nums[i] == nums[j]:
            return True           # always True at i == j — even for [1,2,3]!
```

The predicate requires **distinct indices** (`i ≠ j`).

**Mistake 2 — Returning `False` too early.** "Not a duplicate *so far*" ≠ "no duplicate at all":

```python
for x in nums:
    if x in seen:
        return True
    return False                  # BUG: exits after the very first element
```

The `return False` belongs **after** the loop.

**Mistake 3 — Using a list as the "seen" container.**

```python
seen = []
if x in seen:   # O(k) linear scan → total O(n²). The entire speedup dies here.
```

The win comes specifically from the **O(1) average** membership test of a `set`.

**Mistake 4 — Value-indexed lookup array.** Allocating a ~2 GB flags array for the 2×10⁹ value domain, and crashing on negative values. The constraints were steering you toward hashing/sorting.

**Mistake 5 — Index/value confusion.** Checking things like `nums[i] == i`, or "deduping indices." The condition is purely: ∃ `i ≠ j` with `nums[i] == nums[j]`. In `[0, 1, 1]`, indices 1 and 2 hold the same *value* → duplicate; in `[0, 1, 2]`, index 1 holding value `1` is not a duplicate.

**Mistake 6 — Mutating input when forbidden.** `nums.sort()` destroys the caller's order. If the interviewer says "don't modify the input," use `sorted(nums)` and acknowledge the O(n) copy.

**Mistake 7 — Imprecise complexity claims.** Saying the hash approach is "O(n) worst case" instead of **expected** O(n), or claiming O(1) space for the sort approach without noting Timsort's temporary buffer.

## 10. Interview Talk Track & Likely Follow-ups

**A compact script for the interview:**

1. *Clarify:* "A value occurring at ≥ 2 distinct indices → `True`. May I modify the input? Is O(n) extra memory acceptable?"
2. *Baseline:* "Check all pairs — O(n²) time, O(1) space. At `n = 10⁵` that's ~5×10⁹ comparisons — too slow."
3. *Improve:* "Sorting makes duplicates adjacent → O(n log n), but it mutates input or costs a copy."
4. *Optimal:* "One pass with a set of seen values: expected O(n) time, O(n) space, early exit on first duplicate."
5. *Code it, trace Examples 1 and 3, state complexity, mention the one-liner trade-off.*

**Follow-ups you should be ready for:**

- **"Can you do O(1) space without modifying the input?"** → Not in general: element distinctness is Θ(n log n) in the comparison model. You must give up one restriction — sort (mutate) or accept O(n²).
- **"What if the array is already sorted?"** → Adjacent scan: O(n) time, **O(1) space**, no hashing needed.
- **"Return the duplicated value instead of a boolean?"** → Return `x` at the hit (or `None`/raise if absent):

  ```python
  def find_duplicate(nums: list[int]) -> int | None:
      seen = set()
      for x in nums:
          if x in seen:
              return x
          seen.add(x)
      return None
  ```
- **"Data is a stream / too big for RAM?"** → The set needs O(distinct) memory. Alternatives: external sort + adjacent scan, or a Bloom filter if *approximate* answers (rare false positives) are acceptable.
- **"What if values were bounded, say 0–255?"** → Counting array of size 256, plus the **pigeonhole** shortcut: if `n > 256`, answer `True` without scanning.
- **"Exactly twice? Majority element?"** → Now counts matter: `Counter`, or Boyer–Moore voting for the majority variant.

## 11. Transferable Patterns

1. **Seen-set membership ("have I seen x?")** — the fundamental one-pass pattern for pair-existence questions; the same idea powers Two Sum's complement lookup.
2. **Frequency map (`Counter`)** — the generalization when the question shifts from "does it repeat?" to "how many times?" (anagrams, ransom notes, top-k frequent).
3. **Sort → equal elements become adjacent** — converts "find an equal pair" into a linear adjacent scan (3Sum, dedup, merge intervals).
4. **Bounded window over a seen structure** — keep only the last `k` elements in the set to handle distance-constrained duplicates (directly leads to Contains Duplicate II/III).
5. **Pigeonhole principle** — if `n` exceeds the number of possible distinct values, a duplicate is guaranteed without any scan.
6. **Early exit / streaming mindset** — return the moment the predicate is satisfied; prefer algorithms that work over iterators.

## 12. Related Problems

| Problem | Relationship | Key twist |
|---|---|---|
| 219. Contains Duplicate II | Same seen-set + **sliding window of size k** | Requires `\|i − j\| ≤ k`; evict `nums[i-k]` each step |
| 220. Contains Duplicate III | Window + **value buckets of width t** | Adds `\|nums[i] − nums[j]\| ≤ t` |
| 287. Find the Duplicate Number | Values in `[1..n]`, find the dup with **O(1) space, no mutation** | Floyd's cycle detection |
| 442. Find All Duplicates in an Array | Values in `[1..n]`, report **all** dups | In-place sign marking |
| 268 / 448. Missing Number / Disappeared Numbers | The *complement* problem on bounded values | Index-as-hash tricks |
| 136. Single Number | "Every element appears twice except one" | XOR pairing |
| 242. Valid Anagram / 383. Ransom Note | Frequency counting mastery | `Counter` comparisons |
| 128. Longest Consecutive Sequence | Set membership drives an O(n) solution | Only start counting at sequence heads |
| 1. Two Sum | Same hash insight, complement instead of duplicate | Map value → index |

## 13. Cheat-Sheet Recap

- **Predicate:** ∃ `i ≠ j` with `nums[i] == nums[j]` — values, distinct indices, boolean output.
- **Constraints decode to:** O(n²) too slow at 10⁵; value domain (~2×10⁹) too big for lookup arrays → **hash set or sorting**.
- **Canonical solution:** one pass, `seen` set, early exit → **O(n) expected time, O(n) space**.
- **Memory-tight fallback:** sort + adjacent compare → **O(n log n) time**.
- **Python:** know both the early-exit loop and `len(set(nums)) < len(nums)`, and articulate the trade-off.
- **Interview gold:** say "expected O(n)" precisely, justify early exit, and know the Θ(n log n) element-distinctness bound for the no-space/no-mutation follow-up.
