# Last Stone Weight — Complete Interview Lesson

## 1. Problem, Restated in Your Own Words

Say it back like this in the interview:

> "We have a multiset of stone weights. The game is **fully deterministic**: every turn, take the two heaviest stones. If they're equal, both vanish; otherwise the heavier one survives with weight `heavier − lighter`. Repeat until at most one stone remains. Return that stone's weight, or `0` if none remain."

Three precision points worth stating out loud (they show you read carefully):

- **Values, not indices.** Stones are identified only by weight. If several stones tie for heaviest, *which* physical stones you pick is irrelevant — the multiset of weights evolves identically either way. So no tie-breaking logic is needed, ever.
- **The survivor is a brand-new stone** with value `y − x`. Its "identity" doesn't matter; only its weight does.
- **`x == y` destroys both stones** — it does not create a stone of weight 0. (Fun nuance: modeling it as a 0-weight stone would *not* change the final answer, because a 0 stone can only ever be smashed against the last positive stone, leaving it unchanged — but implement the clean version: push nothing when the two popped values are equal.)

This is a **simulation** problem, not an optimization problem. You have zero choices; you just execute the rule faithfully.

## 2. Decoding the Constraints

| Constraint | What it tells you |
|---|---|
| `1 <= stones.length <= 30` | n is tiny → **any** polynomial approach passes, and brute force is a legitimate first answer. In harder sibling problems (LC 1049, LC 2035), `n ≤ 30` is the classic signature of **DP over sums / meet-in-the-middle** — a meta-lesson in constraint decoding. |
| `1 <= stones[i] <= 1000` | Values are bounded → a **bucket/counting** solution is possible (see bonus below). Total weight ≤ 30 × 1000 = 30,000 → **no overflow concern in any language**. |
| No zeros initially (`stones[i] ≥ 1`) | The heap only empties if equal stones annihilate. |
| "At most one stone left… return 0" | Two exit states: heap size 1 → return its weight; heap size 0 → return 0. Both must appear in your code. |
| Duplicates in the example (`1, 1`) | Ties are a **core** case, not an edge case. `[3, 3]` must return `0`, not `3` — a set-based approach would be wrong. |

Useful invariant to mention as a sanity check: **the total weight drops by an even amount every turn** (equal smash removes `2x`; unequal smash removes `x` and shrinks `y` by `x`, total `2x`). So the answer's parity always equals the parity of `sum(stones)`. Example 1: sum = 23 (odd) → answer 1 (odd). ✓

Termination is trivial and worth one spoken sentence: every turn removes two stones and adds at most one, so the count strictly decreases — at most `n − 1` turns.

## 3. Brute Force: Re-Sort Every Turn (with a worked trace)

The direct translation of the rules: sort descending, smash the first two, put the remainder back, repeat.

```python
def lastStoneWeight_bruteforce(stones: list[int]) -> int:
    s = list(stones)              # copy — don't mutate the caller's list
    while len(s) > 1:
        s.sort(reverse=True)      # two heaviest at indices 0 and 1
        y, x = s[0], s[1]         # values, not indices: y >= x
        s = s[2:]                 # remove both
        if y != x:
            s.append(y - x)       # remainder re-enters the pool
    return s[0] if s else 0
```

**Trace on Example 1** (`stones = [2,7,4,1,8,1]`):

| Turn | Array (sorted desc) | `y` (heaviest) | `x` (second) | `y − x` | Array after |
|---|---|---|---|---|---|
| start | [8,7,4,2,1,1] | — | — | — | — |
| 1 | [8,7,4,2,1,1] | 8 | 7 | 1 | [4,2,1,1,1] |
| 2 | [4,2,1,1,1] | 4 | 2 | 2 | [2,1,1,1] |
| 3 | [2,1,1,1] | 2 | 1 | 1 | [1,1,1] |
| 4 | [1,1,1] | 1 | 1 | both die | [1] |

Return **1** — matches the official walkthrough turn for turn. Cost: `O(n log n)` per turn × at most `n − 1` turns → **O(n² log n)**, which is completely fine for `n ≤ 30`. A slightly tighter variant: sort **once** ascending, then each turn pop the last two and `bisect.insort` the remainder — **O(n²)** total, because each insert into a list is O(n) shifting. (Another tidy variant: `heapq.nlargest(2, s)` plus `list.remove` each turn, also O(n²) — same idea, no manual sorting.)

## 4. The Core Insight

Look at what the game actually *asks for* repeatedly:

> **"Remove the two current maxima; possibly insert one new value."**

The pool changes every turn (the new stone can land *anywhere* in the weight order), so sorting once isn't enough — but the *operation set* — insert arbitrary value, extract-max, twice per turn — is exactly the contract of a **max-heap / priority queue**. That reframing is the entire problem:

- **heapify** the stones once,
- loop while more than one stone: pop two maxes, push back the (negated) difference,
- return the survivor or 0.

One implementation wrinkle dominates everything else: **Python's `heapq` is a min-heap only.** Standard idiom: store **negated** weights. The heaviest stone `y` becomes the most-negative value `-y`, i.e., the *first* thing a min-heap pops. Keep the algebra straight:

- pop `a` first → `a = −y₁` where `y₁` = heaviest;
- pop `b` second → `b = −y₂` where `y₂` = second heaviest, so `a ≤ b`;
- remainder `y₁ − y₂ ≥ 0`, and its negation is `−(y₁ − y₂) = a − b`. So **push `a − b`** — the popped values, in pop order, subtracted. Since `a ≤ b`, this is always ≤ 0, i.e., a valid negated weight.

## 5. Optimal Solution: Max-Heap Simulation

```python
import heapq
from typing import List

def lastStoneWeight(stones: List[int]) -> int:
    heap = [-s for s in stones]        # negate: heapq is a min-heap
    heapq.heapify(heap)                # O(n) bottom-up build

    while len(heap) > 1:
        y1 = -heapq.heappop(heap)      # heaviest stone  (first pop)
        y2 = -heapq.heappop(heap)      # second heaviest (y2 <= y1)
        if y1 != y2:
            heapq.heappush(heap, -(y1 - y2))   # remainder, negated

    return -heap[0] if heap else 0     # negate back; 0 if empty
```

The tight 5-line variant, using the `a − b` identity above (pop order matters — Python evaluates the RHS left to right, so `a` is the first, most-negative pop):

```python
def lastStoneWeight(stones: List[int]) -> int:
    h = [-s for s in stones]
    heapq.heapify(h)
    while len(h) > 1:
        a, b = heapq.heappop(h), heapq.heappop(h)   # a = heaviest (negated)
        if a != b:
            heapq.heappush(h, a - b)                # == -(y1 - y2)
    return -h[0] if h else 0
```

### Trace on Example 1 — `stones = [2,7,4,1,8,1]`

(Heap contents shown as a sorted multiset of negated values for readability; the internal array layout differs but the pops don't.)

| Turn | Heap before (negated) | Pop `a` → stone | Pop `b` → stone | Push | Heap after | Stones after |
|---|---|---|---|---|---|---|
| 1 | [-8,-7,-4,-2,-1,-1] | −8 → 8 | −7 → 7 | −1 | [-4,-2,-1,-1,-1] | 4,2,1,1,1 |
| 2 | [-4,-2,-1,-1,-1] | −4 → 4 | −2 → 2 | −2 | [-2,-1,-1,-1] | 2,1,1,1 |
| 3 | [-2,-1,-1,-1] | −2 → 2 | −1 → 1 | −1 | [-1,-1,-1] | 1,1,1 |
| 4 | [-1,-1,-1] | −1 → 1 | −1 → 1 | *(equal — nothing)* | [-1] | 1 |

Loop ends with one stone → return `−(−1) = **1**`. The "stones after" column matches the official explanation exactly, turn for turn.

### Trace on Example 2 — `stones = [1]`

Heap `[-1]`; the loop never runs (size is 1); return `−(−1) = **1**`. This is why the loop guard is `len(heap) > 1` and the return line has the `else 0` branch — `[5, 5]` ends with an *empty* heap and must return `0`.

### Complexity

- **Time: O(n log n).** One heapify, then at most `n − 1` turns × (2 pops + ≤ 1 push), each `O(log n)`.
- **Space: O(n)** for the heap.

Two claims worth having one-liners for if the interviewer pushes:

- *"Can we build the heap faster than n pushes?"* Yes — bottom-up heapify is **O(n)**: sift-down at height `h` costs `O(h)` and fewer than `n/2^h` nodes live at height `≥ h`, so the total `Σ (n/2^h)·h` telescopes to `O(n)`. (Irrelevant at `n ≤ 30`, but good to know.)
- *"Can we beat O(n log n)?"* Not with comparisons in general — any comparison-based method must distinguish the `n!` possible orderings, which takes `Ω(log₂ n!) = Ω(n log n)` comparisons by the decision-tree argument. But bounded values let us cheat, as counting sort does — see below.

### Bonus: beating the comparison bound with buckets (values ≤ 1000)

Since `1 ≤ stones[i] ≤ 1000`, replace "find the two heaviest" with "scan weights from 1000 downward," carrying **at most one unpaired survivor** down through the buckets:

```python
def lastStoneWeight_bucket(stones: list[int]) -> int:
    MAX = 1000
    count = [0] * (MAX + 1)
    for s in stones:
        count[s] += 1

    leftover = 0                    # weight of the single unpaired carried stone
    for w in range(MAX, 0, -1):
        c = count[w]
        while leftover > w and c > 0:   # carried stone is heavier: pair it with w's
            leftover -= w
            c -= 1
        if leftover == w and c > 0:     # exact tie: annihilate one w
            leftover, c = 0, c - 1
        if c % 2 == 1:                  # odd survivors: pairs cancel, one w remains
            leftover = w if leftover == 0 else w - leftover
    return leftover
```

Why it's correct in one sentence: two equal weights always annihilate before either touches a smaller stone (they're the two heaviest), and a strictly-heavier carried stone pairs with `w`-stones until it isn't — so after finishing bucket `w`, everything above weight `w` has collapsed into that single carried value.

Micro-trace on Example 1 (counts: `1:2, 2:1, 4:1, 7:1, 8:1`):

| `w` | `count[w]` | leftover in | what happens | leftover out |
|---|---|---|---|---|
| 8 | 1 | 0 | odd count → carry the 8 | 8 |
| 7 | 1 | 8 | 8 > 7 → pair → 1, bucket exhausted | 1 |
| 4 | 1 | 1 | odd count, leftover ≠ 0 → 4 − 1 | 3 |
| 2 | 1 | 3 | 3 > 2 → pair → 1 | 1 |
| 1 | 2 | 1 | tie annihilates one 1; odd survivor → 1 | 1 |

Return **1** ✓. This is the counting-sort trick in disguise — it sidesteps the comparison bound precisely *because* it never compares stones; it uses their values as array indices. **O(n + W)** time, **O(W)** space, `W = 1000`.

## 6. Complexity Summary

| Approach | Time | Space | When to use it |
|---|---|---|---|
| Re-sort every turn | O(n² log n) | O(n) | Fine at n ≤ 30; simplest correctness argument |
| Sort once + `bisect.insort` | O(n²) | O(n) | Clean middle ground; no heap library needed |
| Linear scan for two maxima per turn | O(n²) | O(1) extra | Whiteboard, no libraries allowed |
| **Max-heap (intended)** | **O(n log n)** | **O(n)** | Scales to large n; the pattern to demonstrate |
| Bucket scan (values ≤ 1000) | O(n + W) | O(W) | Constraint-exploiting flex; great as a follow-up answer |

## 7. Implementation Gotchas (Python / Java / C++)

| Language | Gotcha | Fix |
|---|---|---|
| Python | `heapq` is **min-heap only** — no max flag | Negate on push; negate again on every read, **including the final return** (`-heap[0]`) |
| Python | Sign error on the remainder (pushing `y1 − y2` in negated space injects a *positive* "stone") | Push `a − b` (popped negated values, pop order) or `-(y1 - y2)` |
| Java | `PriorityQueue` defaults to **min-heap** (like Python) | `new PriorityQueue<>(Comparator.reverseOrder())` |
| Java | Comparator `(a, b) -> b - a` overflows for large-magnitude ints in general | Use `Integer.compare(b, a)`; safe here only because \|values\| ≤ 1000. Also: `poll()` returns `Integer` → `null` on empty → auto-unboxing NPE; guard with `pq.size() > 1` |
| C++ | `std::priority_queue<int>` is a **max-heap by default** (opposite of Python/Java!) | Use it directly; and note `pop()` returns void and discards — read `top()` *before* `pop()` |

## 8. Common Mistakes

| Mistake | Why it bites | Fix |
|---|---|---|
| Using `heapq` as a max-heap (no negation) | You pop the two **lightest** stones — wrong simulation, wrong answer | Negate values end-to-end |
| Forgetting to negate on the way out | Returns a negative number (`-1` instead of `1` on Example 1) | `return -heap[0]` |
| Pushing the remainder with the wrong sign | A positive value in a negated heap corrupts every later pop | Push `a − b` in pop order |
| Loop condition `while heap:` then popping twice | `IndexError` when exactly one stone remains | `while len(heap) > 1` |
| Missing the empty-heap exit | `[5,5]` → crash or garbage instead of `0` | `return -heap[0] if heap else 0` |
| Deduplicating stones (set / `Counter` keys only) | `[3,3]` must yield `0`, not `3` — **multiplicity matters** | Keep a multiset (heap, sorted list, or counted buckets) |
| Treating this as an optimization ("pick pairs to minimize") | That's LC **1049** — a subset-sum DP, a completely different algorithm | 1046 is deterministic simulation |
| Mutating the caller's list in brute force | Side effects the interviewer may notice | Copy first |
| Worrying about *which* tied stone to pop | Equal weights are interchangeable; outcome is identical | Say so out loud, move on |

## 9. Test Cases to Propose Out Loud

| # | Input | Expected | What it exercises |
|---|---|---|---|
| 1 | `[2,7,4,1,8,1]` | 1 | Official example; remainder collides with existing 1s; final tie |
| 2 | `[1]` | 1 | Official; single stone — loop never runs |
| 3 | `[5, 5]` | 0 | Equal smash → **empty** heap → the `return 0` branch |
| 4 | `[5, 3]` | 2 | Minimal unequal pair |
| 5 | `[3, 3, 3]` | 3 | Odd duplicate count — exactly one survives (parity check: sum 9 odd → odd answer) |
| 6 | `[9, 5, 4]` | 0 | The *new* stone (9−5=4) collides with an existing 4 — tests reinsertion order |
| 7 | `[1000] * 30` and `[1000] * 29` | 0 and 1000 | Max constraints; even vs odd multiplicity |

Say the last part out loud too: *"Before submitting I'd also cross-check the heap version against the re-sort brute force on one random small array — they must agree, since both implement the same deterministic rule."*

## 10. Full Interview Talk Track (how to narrate while working)

1. **Restate:** "Deterministic simulation — every turn the two heaviest stones; equal → both destroyed; otherwise the heavier is reduced by the lighter; return the last stone or 0."
2. **Clarify:** "Duplicates are central — `[3,3]` must give 0 — and if the heap ever empties I return 0."
3. **Brute force, one sentence:** "I could re-sort each turn, O(n² log n) — totally fine for n ≤ 30 — but the repeated operation is 'remove two maxima, insert one value,' which is literally a priority queue."
4. **Approach:** "Python's `heapq` is a min-heap, so I negate every weight; the heaviest stone is the most-negative value and pops first. While more than one stone remains: pop two, and if they differ, push back the negated difference."
5. **Code**, narrating the two sign inversions: negation on the way in, negation on the way out.
6. **Dry-run Example 1** out loud: 8&7→1, 4&2→2, 2&1→1, 1&1→gone, leaving 1 — matches the official walkthrough.
7. **Complexity:** "At most n−1 turns, each O(log n) → O(n log n) time, O(n) space."
8. **Tests:** the table above — especially `[1]`, `[5,5]`, and `[9,5,4]`.
9. **Pre-empt the follow-up:** "If the interviewer's variant lets me *choose* which pairs to smash — that's Last Stone Weight II — the game becomes: minimize |±s₁ ± … ± sₙ|, i.e., partition the stones into two piles of minimal weight difference, solvable with subset-sum DP in O(n·S) time and O(S) space. Smashing x and y into y−x is exactly the act of placing them on opposite sides of a partition, so achievable final weights are precisely the signed sums."

## 11. Transferable Patterns & Related Problems

- **"Repeatedly extract two extremes, reinsert a derived value"** → priority queue is the reflex: LC 215 (Kth Largest), LC 973 (K Closest Points), LC 347 (Top K Frequent), LC 23 (Merge k Sorted Lists), LC 621 (Task Scheduler), LC 1834 (Single-Threaded CPU).
- **Min-heap-by-negation** (`heapq` idiom): push negated, pop-and-negate, negate on return. Appears in nearly every heap problem in Python interviews.
- **Greedy-rule simulation:** prove termination (each op shrinks the pool) and simulate faithfully — no choices to optimize.
- **Bounded values → counting/bucket** structures beat comparison-based limits (same reason counting sort beats comparison sort).
- **Same name, different problem:** LC **1049** Last Stone Weight II — choosable pairs ⇒ minimum partition difference ⇒ boolean subset-sum DP, `O(n·S)` time, `O(S)` space with a rolling array. And `n ≤ 30`-style limits elsewhere (e.g., LC 2035) usually signal **meet-in-the-middle**.

## 12. Say It in 60 Seconds

> "Last Stone Weight is a pure simulation: every turn I remove the two heaviest stones — if they're equal, both vanish; otherwise the heavier one becomes their difference. Since the pool changes each turn and all I ever need is the two current maxima, a max-heap is the natural tool. Python's heapq is a min-heap, so I store negated weights: heapify once, then while more than one stone remains, pop twice — first pop is the heaviest — and if they differ, push back the negated difference. Every turn deletes two stones and adds at most one, so at most n−1 turns at O(log n) each: O(n log n) time, O(n) space. Watch-outs: negate on the way in *and* on the way out, return 0 if the heap empties, and keep duplicates — equal stones annihilate. I'd test the official examples, a single stone, and two equal stones like [5, 5] → 0. If the follow-up lets me choose the pairs, that's Last Stone Weight II — minimum partition difference via subset-sum DP."
