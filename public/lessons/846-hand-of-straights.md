# Hand of Straights — Complete DSA Lesson

**LeetCode 846** (identical to **1296: Divide Array in Sets of K Consecutive Numbers**)
**Difficulty:** Medium | **Topics:** Greedy, Hash Map / Counting, Sorting, Heap

---

## 1. Restating the Problem

Alice has an array `hand` where each element is a card value, and an integer `groupSize`. She wants to partition **all** cards into groups where:

- Each group contains **exactly `groupSize` cards**,
- Each group's values are **consecutive integers** (e.g., `[4,5,6]` or `[9,10,11]` — order within the group doesn't matter, only that the values form a run like `x, x+1, x+2, ...`).

Return `true` if such a partition exists, `false` otherwise.

**Restated precisely:** Can we split the multiset of card values into `n / groupSize` disjoint subsets, each being a set of `groupSize` consecutive integers (with repetition allowed *across* groups, but each group consists of distinct consecutive values — a group `[2,2,3]` is **not** valid because 2 and 2 are not consecutive distinct values)?

> ⚠️ **Key clarification to state out loud in an interview:** a group like `[2,2,3]` is invalid. Consecutive means *distinct successive integers*. Duplicates must go into *different* groups.

---

## 2. Decoding the Constraints

| Constraint | Value | What it tells us |
|---|---|---|
| `hand.length` | up to 10⁴ | An **O(n log n)** or even **O(n · groupSize)**-ish solution is fine; O(n²) is borderline but likely acceptable. No need for anything fancier than sorting + hashing. |
| `hand[i]` | up to 10⁹ | Values are **sparse and huge** — you *cannot* use a fixed-size array / bitset indexed by value. Use a hash map (or sort). Also: **`2^30` fits in `int`, but sums of card values could overflow `int` in C++/Java** if you ever aggregate. |
| `groupSize` | 1 to n | **Edge case:** `groupSize == 1` is trivially always `true` (every card is its own group). Also `n % groupSize != 0` → immediately `false`. |
| Duplicates | allowed | The input is a **multiset**, not a set. Counting is essential. |

**Immediate checks derived from constraints:**
1. If `len(hand) % groupSize != 0` → return `False` (can't partition evenly).
2. If `groupSize == 1` → return `True`.

---

## 3. Brute Force

### Idea

Try to build groups greedily without any clever ordering: repeatedly pick the smallest unused card, and try to find (and remove) `x+1, x+2, ..., x+groupSize-1` from the remaining multiset. If any run can't be completed, fail. Backtracking on *which* card to start with is unnecessary once you always start from the global minimum (we'll justify this in the insight section), but the naive version might also try backtracking.

### Naive implementation (with a multiset)

```python
from collections import Counter

def isNStraightHand_bruteforce(hand, groupSize):
    n = len(hand)
    if n % groupSize != 0:
        return False
    count = Counter(hand)
    remaining = n
    while remaining > 0:
        # pick smallest remaining card (linear scan each time — slow)
        start = min(c for c in count if count[c] > 0)
        for v in range(start, start + groupSize):
            if count[v] == 0:
                return False          # run broken
            count[v] -= 1
            if count[v] == 0:
                del count[v]          # keep the min-scan cheap
        remaining -= groupSize
    return True
```

### Worked trace on Example 1

`hand = [1,2,3,6,2,3,4,7,8]`, `groupSize = 3` → need 3 groups.

| Step | Counter state | Start card | Run removed | Result |
|---|---|---|---|---|
| 1 | {1:1, 2:2, 3:2, 4:1, 6:1, 7:1, 8:1} | 1 | [1,2,3] | OK |
| 2 | {2:1, 3:1, 4:1, 6:1, 7:1, 8:1} | 2 | [2,3,4] | OK |
| 3 | {6:1, 7:1, 8:1} | 6 | [6,7,8] | OK |

Counter empty → `True`. ✅

### Worked trace on Example 2

`hand = [1,2,3,4,5]`, `groupSize = 4` → 5 % 4 ≠ 0 → `False` immediately, before any grouping. (Even without the check: start at 1, need 1,2,3,4 — fine; left with `{5}`, but 1 card can't form a group of 4 — the modulo check catches this earlier and more cheaply.)

### Brute-force complexity

- Each iteration does an **O(U)** min-scan (U = distinct values) plus O(groupSize) removal. Total: **O(n · U)** worst case ≈ O(n²) with U up to n. Sorting once and keeping a pointer makes the min-finding free, which leads us to the optimal solution.

---

## 4. The Core Insight

> **The smallest remaining card has no choice about where it goes.**

Consider the smallest card value `x` still on the table. Any group containing `x` must be a run starting at `x` (a run starting below `x` would need a card smaller than `x`, which doesn't exist; a run starting above `x` doesn't contain `x` at all). Therefore:

**Every card with value `x` must open its own group, and that group must be `x, x+1, ..., x+groupSize-1`.**

This means a simple **greedy from the minimum** is *provably correct*, not just a heuristic — no backtracking is ever needed. If the group starting at the current minimum can't be completed, no arrangement exists.

**Corollary:** process distinct values in sorted order; when handling value `x`, if its remaining count is `c > 0`, we must open `c` groups that each consume one card of `x, x+1, ..., x+groupSize-1`. So every value in that window needs remaining count **≥ c**, and we subtract `c` from each.

Two efficient realizations of this:

- **A. Sorted array + hash map (counter):** sort the distinct values, sweep left to right, "chain-subtract" counts. **O(n log n)** — the cleanest to code.
- **B. Min-heap of distinct values + counter:** pop the min each time. **O(n log U)** — same idea, useful when you want to avoid sorting or when streaming.

Both are greedy; A is the one I'd write in an interview.

---

## 5. Optimal Approach — Sorted Greedy with Count Chaining

### Algorithm (Approach A)

1. If `n % groupSize != 0`, return `False`.
2. Build a `Counter` of card values.
3. Sort the **distinct** values.
4. For each value `x` in sorted order:
   - Let `c = count[x]`. If `c == 0`, skip (already consumed as a *follower* of earlier groups).
   - If `c < 0`, fail (can happen in the in-place variant if a follower over-consumed — see "common mistakes"; with the clean variant below, we just read and decrement).
   - For each `v` in `x+1, ..., x+groupSize-1`:
     - `count[v] -= c`. If the new `count[v] < 0`, return `False` (not enough cards of `v` to close all `c` groups).
5. If we finish the loop, return `True`.

Why is the final state guaranteed valid if no subtraction ever goes negative? Because total cards is a multiple of `groupSize` and each "deficit" would have surfaced as a negative count at some value that must be a group's start — the sweep covers all values, so nothing is left unchecked. Every group is opened exactly once at its minimum.

### Implementation

```python
from collections import Counter

def isNStraightHand(hand: list[int], groupSize: int) -> bool:
    n = len(hand)
    if n % groupSize != 0:
        return False
    if groupSize == 1:                 # trivial, but a nice early exit
        return True

    count = Counter(hand)
    for x in sorted(count):            # distinct values, ascending
        c = count[x]
        if c == 0:                     # consumed as a follower earlier
            continue
        if c < 0:                      # over-consumed earlier -> invalid
            return False
        for v in range(x + 1, x + groupSize):
            count[v] -= c
            if count[v] < 0:           # not enough v's to close all c groups
                return False
    return True
```

**Note on `sorted(count)`:** sorting the *keys of the Counter* — i.e., distinct values, not the whole hand. If `U` distinct values ≪ `n` duplicates, this is much cheaper than sorting the full array.

**Why we don't need to check "is x+1 in the map?"** — `Counter` returns 0 for missing keys, and `0 - c < 0` triggers the failure path automatically. This makes the code shorter *and* correct.

### Trace — Example 1

`hand = [1,2,3,6,2,3,4,7,8]`, `groupSize = 3`
Counter: `{1:1, 2:2, 3:2, 4:1, 6:1, 7:1, 8:1}`, sorted keys: `[1,2,3,4,6,7,8]`

| x | c (before) | Action | Counter after (relevant entries) |
|---|---|---|---|
| 1 | 1 | Open 1 group: `count[2]-=1 → 1`, `count[3]-=1 → 1` | {1:1→, 2:1, 3:1, 4:1, 6:1, 7:1, 8:1} |
| 2 | 1 | Open 1 group: `count[3]-=1 → 0`, `count[4]-=1 → 0` | {2:1→, 3:0, 4:0, 6:1, 7:1, 8:1} |
| 3 | 0 | Skip (was a follower) | unchanged |
| 4 | 0 | Skip | unchanged |
| 6 | 1 | Open 1 group: `count[7]-=1 → 0`, `count[8]-=1 → 0` | {6:1→, 7:0, 8:0} |
| 7 | 0 | Skip | — |
| 8 | 0 | Skip | — |

All counts consumed, no negatives → **True** ✅ (groups: [1,2,3], [2,3,4], [6,7,8]).

### Trace — Example 2 (failure case with a twist)

`hand = [1,2,3,4,5]`, `groupSize = 4` → `5 % 4 ≠ 0` → **False** immediately.

Better failure trace to *demonstrate the mechanism* — use `groupSize = 4`, `hand = [1,2,3,4,4,5,6,7]`:

Counter: `{1:1, 2:1, 3:1, 4:2, 5:1, 6:1, 7:1}`

| x | c | Action | Result |
|---|---|---|---|
| 1 | 1 | `count[2]→0`, `count[3]→0`, `count[4]→1` | fine |
| 2 | 0 | skip | — |
| 3 | 0 | skip | — |
| 4 | 1 | `count[5]→0`, `count[6]→0`, `count[7]→0` | fine |

→ True: groups `[1,2,3,4]` and `[4,5,6,7]`. Now change `hand` to `[1,2,3,4,4,5,6,8]` (replace 7 with 8):

| x | c | Action |
|---|---|---|
| 1 | 1 | count[2]→0, count[3]→0, count[4]→1 |
| 4 | 1 | count[5]→0, count[6]→0, **count[7]: 0 − 1 = −1 < 0** → **False** ✅ |

### Approach B — Min-Heap (for completeness)

```python
import heapq
from collections import Counter

def isNStraightHand_heap(hand: list[int], groupSize: int) -> bool:
    n = len(hand)
    if n % groupSize != 0:
        return False
    count = Counter(hand)
    heap = list(count.keys())
    heapq.heapify(heap)                       # min-heap of distinct values
    while heap:
        first = heap[0]                       # current global minimum
        for v in range(first, first + groupSize):
            if count[v] == 0:                 # gap in the run
                return False
            count[v] -= 1
            if count[v] == 0:
                if v == first:
                    heapq.heappop(heap)       # exhausted the minimum
                else:
                    heapq.heappushpop(heap, v)  # replace v by itself (count 0 marker)
                    # or simply: delete from count lazily; see gotcha below
    return True
```

> The heap variant is more fiddly (you must keep the min aligned with exhausted counts). The sorted-counter version avoids all of this — **prefer Approach A in an interview**. The heap shines only if you can't afford the sort or are processing a stream.

---

## 6. Complexity Analysis

| Approach | Time | Space | Notes |
|---|---|---|---|
| Brute force (rescan min each round) | O(n · U) worst case, U = distinct values ≤ n | O(U) | ≈ O(n²); too slow only in adversarial cases, fine at n=10⁴ actually, but why risk it |
| **Optimal A: sort distinct + counter sweep** | **O(n + U log U)** — counting is O(n), sorting distinct keys O(U log U), sweep does O(1) amortized work per (value, group) pair, total O(n) | O(U) for the counter | **Recommended** |
| Optimal B: min-heap of distinct values | O(n + U log U) — heapify O(U), each of the U minima costs O(log U), followers O(1) amortized | O(U) | Same asymptotics, trickier code |

With `n ≤ 10⁴` and `U ≤ 10⁴`, the optimal solution runs in well under a millisecond in practice.

**Could we do better than O(n log n)-ish?** In the comparison model, Ω(n log n) is a lower bound for problems where the answer depends on relative order of arbitrary comparable values (any comparison-based algorithm's decision tree needs Ω(n log n) leaves to distinguish all orderings). Here, however, the answer depends only on the multiset of values, and values are integers — with a bounded value universe, counting sort / radix-style techniques achieve O(n + V) where V is the value range, but since `hand[i] ≤ 10⁹`, a direct value-indexed array is not feasible, so hash-map + sorting distinct keys is the practical optimum.

---

## 7. Common Mistakes & Interview Pitfalls

| # | Mistake | Why it's wrong / how to avoid |
|---|---|---|
| 1 | **Treating a group as a *set* of consecutive values but allowing duplicates inside** (e.g., `[2,2,3]`) | A group must be `x, x+1, ..., x+g-1` — all distinct. Duplicates across groups are fine. |
| 2 | **Missing the `n % groupSize` check** | Without it, you may leave leftover cards and only discover the failure at the end — or worse, return `True` after forming groups that don't cover all cards. |
| 3 | **Mutating a Counter/dict while iterating over it** | In Python, `for x in count:` then `count[v] -= c` for *existing* keys is fine (no size change), but `del` during iteration raises `RuntimeError`. The solution above never inserts/deletes during the loop — subtraction on a `Counter` with a missing key returns and stores 0, which is safe here because we iterate over a snapshot? No — `sorted(count)` builds a **list** first, so the iteration is over a snapshot of keys. Subtraction only *updates values*, never adds new keys beyond `x+1..x+g-1` which get value 0 stored — wait, `Counter.__getitem__` for a missing key does **not** insert; but `count[v] -= c` on a missing key **does** insert `v: -c`. That's fine correctness-wise (it becomes negative and triggers failure, or is a real value), but be aware the dict can grow. Iterating over `sorted(count)` (a list) is what makes this safe. |
| 4 | **Greedy from a random card instead of the minimum** | The greedy is only *provably correct* when anchored at the current minimum. Starting from an arbitrary card requires backtracking. Always articulate the "smallest card has no choice" argument. |
| 5 | **Sorting the whole hand instead of distinct values** | Correct but wasteful when there are many duplicates; also forces you to re-derive counts. `sorted(counter.keys())` is cleaner. |
| 6 | **Forgetting `groupSize == 1`** | Always `True`; not caught by bugs usually, but stating it shows rigor. Also `groupSize == n` means one group — the whole hand must be one consecutive run. |
| 7 | **Negative counts left unchecked at the end** | In the chaining variant, a value could end negative only if you skipped the mid-loop check. Always check `count[v] < 0` immediately after subtraction. |
| 8 | **Assuming values fit a small range** | `hand[i] ≤ 10⁹` — no `boolean[10⁹]` array. Also, in C++/Java, `x + groupSize` can be at most `10⁹ + 10⁴`, which still fits in 32-bit `int` (max ≈ 2.1 × 10⁹), so no overflow *here*, but if constraints were larger you'd need `long`. |

### Java / C++ gotchas (short list)

| Language | Gotcha |
|---|---|
| **Java** | `HashMap.getOrDefault(v, 0)` returns a boxed `Integer` — unboxing in arithmetic is fine, but never compare `Integer`s with `==` (autoboxing pitfall for values outside the −128..127 cache). Use `map.merge(v, c, Integer::sum)` for chained subtraction; if the key is absent, `getOrDefault` + subtract and check `< 0` works cleanly. Iterating a `HashMap` while inserting keys → `ConcurrentModificationException`; snapshot the keys with `new ArrayList<>(map.keySet())` before sorting. |
| **Java** | Sorting: `Arrays.sort(hand)` is fine for primitives; if you sort distinct keys, collect them into an `int[]` first to avoid comparator overhead on boxed values. |
| **C++** | `unordered_map<int,int>` with `operator[]` **default-inserts 0** on read — that's actually convenient here (no presence check needed), but it invalidates nothing; just beware that it changes `size()` if you're iterating. Use a `std::vector<int>` of keys gathered before the loop. |
| **C++** | Use `long long` if constraints ever push `x + groupSize` near `INT_MAX`; with `hand[i] ≤ 10⁹` and `groupSize ≤ 10⁴`, `x + groupSize ≤ 1,000,010,000 < 2,147,483,647`, so `int` is safe *for this problem* — say this out loud rather than silently assuming. |
| **C++** | `std::map` (ordered) lets you skip the separate sort, at O(U log U) either way; `unordered_map` + explicit sort of keys is typically faster in practice. |

---

## 8. Test Cases to Propose Out Loud

State these before or right after coding — it signals thoroughness:

| Test | Input | Expected | What it checks |
|---|---|---|---|
| Official 1 | `[1,2,3,6,2,3,4,7,8]`, g=3 | `true` | Happy path with two separate runs, duplicates |
| Official 2 | `[1,2,3,4,5]`, g=4 | `false` | Modulo check / leftover cards |
| Edge: g=1 | `[5]`, g=1 | `true` | Every card its own group |
| Edge: g=n, consecutive | `[3,1,2]`, g=3 | `true` | Whole hand is one run |
| Edge: g=n, not consecutive | `[1,2,4]`, g=3 | `false` | One group, gap inside |
| Edge: duplicates force split | `[1,1,2,2,3,3]`, g=3 | `true` | Groups [1,2,3],[1,2,3] — duplicate handling |
| Edge: duplicate can't be absorbed | `[1,1,2,3]`, g=3 | `false` | Second 1 must open a group needing another 2 — count goes negative |
| Edge: single card, g=2 | `[7]`, g=2 | `false` | 1 % 2 ≠ 0 |
| Stress: sparse huge values | `[10⁹, 10⁹-1, 10⁹-2]`, g=3 | `true` | No array-indexing assumptions |

**Why `[1,1,2,3]` matters:** a buggy solution that treats groups as *sets* and only checks "is x+1 present?" (ignoring counts) would wrongly return `true`.

---

## 9. Transferable Patterns & Related Problems

**Pattern name:** *Greedy anchored at the minimum element* — when the globally smallest remaining item has a forced placement, greedily finalize it and never revisit. Generalizes to interval/task partitioning problems.

**Sub-patterns to recognize:**
1. **Multiset partitioning into consecutive runs** — always process in sorted order, chain-subtract counts.
2. **"Forced move" argument** — proving greedy correctness by showing the extremal element has exactly one valid option. This is the interview's real test: *say why greedy is safe, not just that it is.*
3. **Counter + sorted distinct keys** as a replacement for value-indexed arrays when values are huge but sparse.

**Related problems:**

| Problem | Relationship |
|---|---|
| **LC 1296** — Divide Array in Sets of K Consecutive Numbers | Identical problem, different statement |
| **LC 659** — Split Array into Consecutive Subsequences | Same greedy idea, but subsequence (order matters, must use input order) and groups need not all be the same length — harder variant, often follows this one |
| **LC 846 / 1296** vs **LC 220** — Contains Duplicate III | Both use "consecutive/sorted neighborhood" reasoning with hash structures |
| **LC 767** — Reorganize String | Opposite flavor: max-heap greedy on counts |
| **LC 128** — Longest Consecutive Sequence | Set-based consecutive-run detection, no grouping constraint |
| **Task Scheduler (LC 621)** | Greedy with counts; nice contrast for "why the greedy is correct" discussions |

---

## 10. Interview Talk Track (Full Script)

> "Let me restate: I need to partition all cards into groups of exactly `groupSize`, each group being consecutive distinct values like `x, x+1, ...`. First, two quick checks: if `n % groupSize != 0`, it's impossible. If `groupSize == 1`, trivially true.
>
> The key insight: look at the **smallest** remaining card value `x`. Any group containing `x` must start at `x` — there's nothing smaller left. So `x` is forced to open a run. If there are `c` copies of `x`, they must open `c` runs, each consuming one card of `x, x+1, ..., x+groupSize-1`. That means the greedy from the minimum is provably correct — no backtracking needed. If the run can't be completed, no solution exists.
>
> Implementation: build a Counter, sort the distinct values, and sweep. For each value with remaining count `c > 0`, subtract `c` from the next `groupSize-1` values; if any drops below zero, return false. Missing keys read as zero in a Counter, so gaps fail automatically.
>
> Complexity: counting is O(n), sorting distinct values is O(U log U) with U ≤ n, and the sweep touches each card once — O(n) total work after the sort. Space O(U) for the counter. Since values go up to a billion, I'm using a hash map, not a value-indexed array.
>
> Edge cases I'd verify: duplicates that must split across groups, a duplicate that can't find followers, `groupSize == n`, and the modulo failure."

---

## 11. Say It in 60 Seconds

> "Two quick outs first: if n isn't divisible by groupSize, return false; if groupSize is 1, return true.
>
> Core insight: the smallest remaining card is forced — any group containing it must start at it. So process distinct values in sorted order. If the current value has count c, those c cards must each start a run, so I subtract c from each of the next groupSize−1 values. If any count goes negative, it's impossible — return false. A Counter reads missing keys as zero, so gaps fail naturally.
>
> This greedy is provably correct because the minimum has exactly one legal placement — no backtracking needed.
>
> Time: O(n log n) from sorting distinct values, everything else linear. Space: O(number of distinct values). Values up to a billion means hash map, not an array.
>
> Test with: the given examples, duplicates that split across groups, a duplicate with no followers, and groupSize equal to n."
