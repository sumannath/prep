# Find the Duplicate Number — Complete Interview Lesson

**LeetCode 287 · Hard · Topics: Array, Two Pointers, Binary Search, Cycle Detection**

This problem is famous for a specific reason: the *naive* solutions are trivial, and the entire difficulty lives in the constraints. Each constraint quietly eliminates one family of approaches until only one elegant survivor remains (plus one honest fallback). Learning to *reason about the constraints out loud* is worth as much as knowing the final algorithm.

---

## 1. Problem, restated precisely

> Given `nums` of length `n + 1`, where every element is an integer in `[1, n]`, exactly one value occurs **two or more times**; return that value. You may **not modify** `nums` and may use only **O(1) extra space**.

Precision points that matter later:

| Object | Range | Count |
|---|---|---|
| **Indices** | `0 .. n` | `n + 1` of them |
| **Values** | `1 .. n` | `n` possible values |

- `n = len(nums) - 1`. Getting this off-by-one wrong breaks the binary-search variant (§7).
- The duplicated value `d` may occur **anywhere from 2 to n+1 times** (Example 3 has it 5 times). Non-duplicated values may even be **absent entirely**. This kills the tempting arithmetic tricks (§4).
- Because values are in `[1, n]`, every value is *also a valid index* — except that `0` is an index but **never** a value. That asymmetry is the engine of the optimal solution.

---

## 2. Decoding the constraints (and answering Follow-up #1)

| Constraint | What it tells you | What it kills / enables |
|---|---|---|
| `n + 1` values drawn from `[1, n]` | A duplicate is **guaranteed** — placing n+1 objects into n value-"boxes" forces some box to hold ≥ 2 (pigeonhole). This answers **Follow-up 1**: at least one duplicate *must* exist. | No "not found" branch needed. |
| Exactly **one** repeated value, possibly **more than twice** | Sum/XOR deltas against `1..n` are unsound. | Kills `sum(nums) - n(n+1)/2` and XOR tricks. |
| **Do not modify** `nums` | No reordering, no sign-flipping, no "swap into place." | Kills sorting and in-place marking. |
| **O(1) extra space** | No auxiliary structures proportional to input. | Kills hash sets. |
| `n ≤ 10^5` | O(n²) ≈ 10¹⁰ comparisons; at the usual ~10⁸ simple-ops/sec budget judges assume, that's ~100× over any time limit. | Kills the double loop; O(n log n) is acceptable, O(n) is the goal. |

**Follow-up 1 (proof a duplicate exists), stated cleanly:** if all `n + 1` entries were distinct they would occupy `n + 1` distinct values, but only `n` values exist — impossible by pigeonhole. Equivalently, the sum of multiplicities is `n + 1 > n`, so some value has multiplicity ≥ 2.

---

## 3. Baseline: brute force (with a worked trace)

Compare every pair; return the first matching value.

```python
def findDuplicate_bf(nums: list[int]) -> int:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return nums[i]
    return -1  # unreachable: pigeonhole guarantees a duplicate (§2)
```

**Trace on Example 1, `nums = [1,3,4,2,2]`:**

| `i` | `nums[i]` | compared against `j = i+1..` | result |
|---|---|---|---|
| 0 | 1 | 3, 4, 2, 2 | no match |
| 1 | 3 | 4, 2, 2 | no match |
| 2 | 4 | 2, 2 | no match |
| 3 | 2 | **2** (j=4) | ✅ **return 2** (10th and final pair) |

- **Time:** O(n²) — too slow for `n = 10⁵` (justified above).
- **Space:** O(1), no mutation — it *respects the constraints* but not the time budget.
- Interview value: state it in 10 seconds, then eliminate it. That's signal, not waste.

---

## 4. Constraint elimination: why the "clever" ideas fail

| Idea | Time | Space | Modifies? | Verdict |
|---|---|---|---|---|
| Sort, scan adjacent equals | O(n log n) | O(1)–O(n) | **Yes** | ❌ mutates input. (Also: comparison sorting needs Ω(n log n) because each comparison yields 1 bit and must separate all (n+1)! orderings, so Ω(log₂((n+1)!) ) = Ω(n log n) comparisons are unavoidable.) |
| Hash set of seen values | O(n) expected | **O(n)** | No | ❌ violates space rule. |
| In-place sign negation (`nums[|v|] *= -1`) | O(n) | O(1) | **Yes** | ❌ mutates input. |
| `sum(nums) − n(n+1)/2` | O(n) | O(1) | No | ❌ **unsound**: on `[3,3,3,3,3]` it yields 15 − 10 = **5**, which isn't even in `[1,4]` (true answer 3), because the duplicate appears 5× and other values are missing. |
| XOR of `nums` vs XOR of `1..n` | O(n) | O(1) | No | ❌ **unsound**: on `[3,3,3,3,3]`, XOR(nums) = 3, XOR(1..4) = 4, result 3⊕4 = **7** — garbage. Works only when the duplicate appears an odd number of extra times. |

Every row fails for a *different* reason — being able to name the reason per row is exactly what interviewers listen for.

---

## 5. The core insight: the array *is* a linked list

Define a function on nodes `f(i) = nums[i]` for every index `i ∈ {0..n}`. Think of each index as a node with exactly one outgoing edge, aimed at node `nums[i]`.

Four facts build the whole solution:

1. **Every node has out-degree exactly 1** — `f` is total, so a walk never gets stuck.
2. **Node 0 has in-degree 0**, because no value equals 0 (values live in `[1, n]`). So the walk can never return to node 0.
3. The walk `x₀ = 0, x₁ = f(x₀), x₂ = f(f(x₀)), …` lives in a finite set, so it **must eventually revisit a node**. Since node 0 can't be revisited (fact 2), the shape is a **ρ (rho)**: a non-empty *tail* of `μ` hops into a *cycle* of length `λ ≥ 1`. The first `μ + λ` nodes of the walk are pairwise distinct, so "tail" and "cycle" are well-defined and disjoint.
4. **The cycle entrance is the duplicate.** In-edges into a value-node `v` come from exactly the indices `i` with `nums[i] = v` — i.e., **node `v`'s in-degree equals the number of times value `v` occurs**. The entrance has *two distinct* in-edges: one from the last tail node `x_{μ−1}`, one from the cycle node `x_{μ+λ−1}` (distinct because the first `μ+λ` walk nodes are distinct). Two distinct indices hold the entrance's value ⇒ it occurs ≥ 2 times ⇒ it's *the* unique duplicated value.

**Rho shapes for the official examples:**

```
Example 1 [1,3,4,2,2]          Example 2 [3,1,3,4,2]          Example 3 [3,3,3,3,3]
0 → 1 → 3 → 2 → 4              0 → 3 → 4 → 2                  0 → 3 ─┐
            ↑   │                  ↑       │                       ↑──┘   (self-loop)
            └───┘  (4→2)           └───────┘  (2→3)            entrance = 3
tail μ=3, cycle λ=2            tail μ=1, cycle λ=3            μ=1, λ=1
entrance = 2 = answer          entrance = 3 = answer
```

This also **answers Follow-up 2**: yes, linear time is possible — detecting a cycle and recovering its entrance in a functional graph, without extra memory, is exactly **Floyd's tortoise-and-hare** algorithm (the same machinery as LeetCode 142, *Linked List Cycle II*, with the array playing the role of the linked list).

---

## 6. Optimal approach: Floyd's tortoise and hare

### 6.1 The algorithm

- **Phase 1 (detect a meeting):** `slow` moves 1 hop per step, `fast` moves 2 hops. Once both are in the cycle, `fast` gains exactly 1 position per step on `slow`, and the gap is `< λ`, so they meet within `λ` more steps — i.e., after at most `μ + λ ≤ 2n` hops total.
- **Phase 2 (find the entrance):** reset `slow` to the walk's start (node 0); move **both** one hop at a time; they next coincide **exactly on the entrance**.

**Why phase 2 lands on the entrance.** At the phase-1 meeting, `slow` has traveled `t*` hops where `t*` is a multiple of `λ` and `t* ≥ μ` (meeting inside the cycle requires `t* ≡ 2t* (mod λ)`). The entrance sits `μ` hops from the start; going *forward around the cycle* from the meeting node, the entrance is `(μ − t*) mod λ = μ mod λ` hops ahead. So the start is `μ` steps from the entrance and the meeting node is `μ mod λ` steps from it — **the same distance up to whole laps**, and whole laps cancel when both pointers step in lockstep. The start-pointer first reaches the entrance at step `μ`; the meeting-pointer is there at step `μ mod λ`, then again every `λ` steps — including step `μ`. For steps `< μ` the start-pointer is still on the tail, where the other pointer never is. So the first re-meeting is exactly on the entrance. ∎

*Concrete check (Example 1: μ=3, λ=2, meet at node 4):* from node 4, the entrance 2 is `μ mod λ = 1` hop ahead; the start is 3 hops from it. Phase 2: start-pointer 0→1→3→**2** (3 steps); meeting-pointer 4→**2**→4→**2** (at 2 on steps 1 and 3). They coincide at step 3, on node 2. ✓

### 6.2 Code (Python)

```python
def findDuplicate(nums: list[int]) -> int:
    # Phase 1: find a meeting point inside the cycle.
    # Node i's "next" pointer is nums[i]. Both pointers start at node 0.
    # `while True` emulates do-while: slow == fast == 0 initially, so the
    # body MUST run at least once before the first comparison.
    slow = fast = 0
    while True:
        slow = nums[slow]           # 1 hop
        fast = nums[nums[fast]]     # 2 hops
        if slow == fast:
            break

    # Phase 2: restart one pointer at the walk's entrance (node 0);
    # both step one hop; they next coincide exactly on the cycle entrance.
    slow = 0
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]

    # `slow` is a node id — but every node reachable after >= 1 hop is a
    # *value* from nums, so returning the node id returns the duplicated value.
    return slow
```

### 6.3 Traces on the official examples

**Example 1 — `nums = [1,3,4,2,2]` (μ=3, λ=2)**

Phase 1 (`slow = nums[slow]`, `fast = nums[nums[fast]]`):

| t | slow | fast | note |
|---|---|---|---|
| 0 | 0 | 0 | start |
| 1 | nums[0] = **1** | nums[nums[0]] = nums[1] = **3** | |
| 2 | nums[1] = **3** | nums[nums[3]] = nums[2] = **4** | |
| 3 | nums[3] = **2** | nums[nums[4]] = nums[2] = **4** | |
| 4 | nums[2] = **4** | nums[nums[4]] = nums[2] = **4** | **meet at 4** (≠ answer!) |

Phase 2 (`slow` reset to 0; both 1 hop):

| t | slow | fast |
|---|---|---|
| 0 | 0 | 4 |
| 1 | nums[0] = **1** | nums[4] = **2** |
| 2 | nums[1] = **3** | nums[2] = **4** |
| 3 | nums[3] = **2** | nums[4] = **2** | → **return 2** ✓ |

Note the meeting node (4) is *not* the answer (2) — phase 2 is not optional.

**Example 2 — `nums = [3,1,3,4,2]` (μ=1, λ=3)**

| Phase 1 (t, slow, fast) | | Phase 2 (t, slow, fast) |
|---|---|---|
| 1: slow=nums[0]=**3**, fast=nums[nums[0]]=nums[3]=**4** | | start: slow=0, fast=2 |
| 2: slow=nums[3]=**4**, fast=nums[nums[4]]=nums[2]=**3** | | 1: slow=nums[0]=**3**, fast=nums[2]=**3** |
| 3: slow=nums[4]=**2**, fast=nums[nums[3]]=nums[4]=**2** → meet at 2 | | → **return 3** ✓ |

**Example 3 — `nums = [3,3,3,3,3]` (μ=1, λ=1, self-loop)**

| Phase 1 | | Phase 2 |
|---|---|---|
| 1: slow=nums[0]=**3**, fast=nums[nums[0]]=nums[3]=**3** → meet at 3 | | 1: slow=nums[0]=**3**, fast=nums[3]=**3** → **return 3** ✓ |

Multiplicity 5 causes no issue: the entrance needs in-degree **≥ 2**, not exactly 2.

### 6.4 Complexity

- **Time: O(n).** Phase 1 ≤ `μ + λ ≤ 2n` hops (slow enters the cycle by hop `μ ≤ n`; `fast` closes any gap `< λ ≤ n` within `λ` steps). Phase 2 is exactly `μ ≤ n` hops. Each hop is an O(1) array read.
- **Space: O(1)** — two integers, no recursion, no auxiliary structures.
- **Read-only:** `nums` is never written.

---

## 7. Plan B under the same constraints: binary search on the *value* range

If you blank on Floyd's in the room, this still satisfies every constraint — it's just O(n log n) instead of O(n):

**Idea.** The *answer* is a value in `[1, n]`. For a candidate `mid`, count how many elements are `≤ mid`. If `count > mid`, the duplicate is `≤ mid`; otherwise it's `> mid`.

**Why the predicate is correct (one-line pigeonhole):** there are only `mid` distinct values in `[1, mid]`; if each occurred at most once, at most `mid` elements could be `≤ mid` — so strictly more than `mid` forces some value in `[1, mid]` to repeat, and since exactly *one* value repeats overall, it must be *the* duplicate.

```python
def findDuplicate_bs(nums: list[int]) -> int:
    lo, hi = 1, len(nums) - 1              # VALUE range [1, n]; n = len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        cnt = sum(1 for x in nums if x <= mid)   # O(n) scan, O(1) space
        if cnt > mid:                      # [1..mid] is over-packed
            hi = mid                       # duplicate value <= mid
        else:
            lo = mid + 1                   # every value <= mid occurs at most once
    return lo                              # lo == hi == duplicated value
```

**Trace on Example 1 (`n = 4`):** `lo=1, hi=4` → `mid=2`, count(≤2) = {1, 2, 2} = 3 > 2 → `hi=2` → `mid=1`, count(≤1) = 1, not > 1 → `lo=2` → `lo == hi` → **return 2** ✓. (On Example 2: count(≤3) = {3,1,3,2} = 4 > 3 → converges to **3** ✓.)

- **Time:** O(n log n) — `log₂ n ≈ 17` passes over the array for `n = 10⁵`. **Space:** O(1). **No mutation.**
- This is also your demonstration of the *binary-search-on-the-answer* pattern (§12).

---

## 8. Complexity matrix

| Approach | Time | Extra space | Modifies `nums`? | Valid? |
|---|---|---|---|---|
| Double loop (§3) | O(n²) | O(1) | No | ❌ time |
| Sort + adjacent scan | O(n log n) | O(1)–O(n) | Yes | ❌ |
| Hash set | O(n) expected | O(n) | No | ❌ |
| Sign negation marking | O(n) | O(1) | Yes | ❌ |
| Sum / XOR delta | O(n) | O(1) | No | ❌ unsound (multiplicity > 2) |
| Binary search on values (§7) | O(n log n) | O(1) | No | ✅ (not linear) |
| **Floyd's cycle detection (§6)** | **O(n)** | **O(1)** | **No** | ✅ **optimal; answers Follow-up 2** |

---

## 9. Common mistakes

1. **Returning the phase-1 meeting node.** It's *some* node inside the cycle, not the entrance. Example 1 meets at node **4**; the answer is **2**. Phase 2 is mandatory.
2. **Returning `nums[slow]` after phase 2.** That's one hop *past* the entrance (Example 1 would return `nums[2] = 4`). The node id *is* the value — return `slow` itself.
3. **Comparing `nums[slow] == nums[fast]` in phase 2** (comparing values-of-nodes instead of node ids). This fires early whenever two distinct nodes hold the same value — which is precisely the duplicate situation. On Example 1's phase 2, at step 2: `slow=3, fast=4`, and `nums[3] == nums[4] == 2` → a value-comparing version returns **3**, which is wrong. **Compare node ids.**
4. **Assuming the duplicate appears exactly twice.** Example 3 has multiplicity 5; this silently corrupts sum/XOR solutions (§4 has the concrete garbage values).
5. **Off-by-one on `n`.** `n = len(nums) - 1`. In the binary-search variant, `hi` must be `len(nums) - 1`, not `len(nums)`. And remember: indices run `0..n` while values run `1..n`.
6. **Mixing pointer-start conventions.** Canonical: both start at node **0**, and because they start equal, you must *step before comparing* (do-while semantics). Starting at `nums[0]`/`nums[nums[0]]` can be made to work, but the phase-2 reset must match the same walk start — don't mix conventions mid-solution.
7. **Silently mutating the input** (sorting, negation, swapping). It may pass tests; in an interview it means you solved a different problem than the one stated.
8. **Binary searching the wrong space** — searching over *indices* instead of the *value range* `[1, n]`, or counting `x < mid` while comparing against `mid`. The predicate is `count(x ≤ mid) > mid`.

---

## 10. Language gotchas (beyond Python)

| Language | Gotcha |
|---|---|
| **Java** | Java has a real `do { … } while (slow != fast);`, so no `while(true)` dance is needed. If you reach for `HashSet<Integer>` instead, every `int` is **autoboxed** to a heap object (per-element allocation + pointer chasing) — and it breaks the O(1)-space rule anyway. Also: `Arrays.sort(int[])` (dual-pivot quicksort) **mutates the caller's array**, failing "do not modify" even though it's in-place. |
| **C++** | For the (invalid) sum trick, `std::accumulate(v.begin(), v.end(), 0)` overflows `int` for `n = 10⁵` (max sum ≈ 5·10⁹ > `INT_MAX` ≈ 2.1·10⁹) and signed overflow is UB — you'd need `long long`. Habit: write `mid = lo + (hi - lo) / 2`. Floyd's itself only ever holds ids/values `≤ n`, so no overflow risk there. |
| **Python** | `while True: … if slow == fast: break` is the do-while emulation — a plain `while slow != fast` **never executes** since both start at 0. No overflow concerns, but watch mistakes #2 and #3 above. |

---

## 11. Test cases to propose out loud

Say these *before* coding — it signals you decode constraints into tests, not just algorithms.

| # | Input | Expected | What it stress-tests |
|---|---|---|---|
| 1 | `[1,3,4,2,2]` | 2 | Official. Tail then 2-cycle; phase 1 meets at **4 ≠ answer** — proves phase 2 is required. |
| 2 | `[3,1,3,4,2]` | 3 | Official. One-hop tail into a 3-cycle; duplicate mid-array. |
| 3 | `[3,3,3,3,3]` | 3 | Official. Multiplicity 5 + self-loop; instantly kills "appears exactly twice" assumptions (sum/XOR). |
| 4 | `[1,1]` | 1 | **Minimum input** (`n = 1`). In the binary-search variant the loop body never runs (`lo == hi == 1`) — checks your bounds. |
| 5 | `[1,3,4,2,1]` | 1 | Duplicate is the *smallest* value; entrance reached after a single hop; cycle spans all of `1..4`. |
| 6 | `[2,2,2,2,2]` | 2 | All-equal array; self-loop at 2; answer decoupled from position. |
| 7 | `[5,4,3,2,1,5]` | 5 | Duplicate occupies **index 0 and the last index**; nothing "sorted-ish" may be assumed. |

**After coding, dry-run two 30-second traces:** #1 (catches "return the meeting node" and the value-comparison bugs) and #3 (catches multiplicity assumptions and confirms self-loops terminate).

---

## 12. Transferable patterns & related problems

**Patterns to bank:**

1. **Pigeonhole decode first.** Whenever item count exceeds value-count (`n+1` into `n`), structure is *forced* — derive existence before coding. Mirror case: `n` numbers drawn from `n+1` (or `[0, n]`) ⇒ something is *missing*.
2. **Index-as-edge / implicit linked list.** If values are valid indices, the array *is* a functional graph (`i → nums[i]`); walks form ρ shapes; node in-degree equals value multiplicity.
3. **Floyd's two pointers.** Cycle existence + entrance recovery in O(1) space for *any* deterministic `next` function over a finite set — no visited-set needed.
4. **Binary search on the answer space** with a monotone counting predicate (`count(≤ mid)` feasibility) — the same skeleton as Kth-Smallest-in-Sorted-Matrix, Koko Eating Bananas, Capacity to Ship Packages.

**Related problems:**

| Problem | Connection |
|---|---|
| LC 142 — Linked List Cycle II | Identical phase-1/phase-2 machinery; the entrance-recovery is reused verbatim. |
| LC 202 — Happy Number | Same ρ-detection with O(1) space on `f = sum of squared digits`. |
| LC 268 — Missing Number | Mirror pigeonhole: `n` numbers from `[0, n]`, one absent. |
| LC 442 — Find All Duplicates | Same shape, report *all* duplicates (sign-marking; mutates). |
| LC 448 — Find All Numbers Disappeared | Complement of 442; in-place marking. |
| LC 645 — Set Mismatch | One duplicated + one missing — combines both pigeonhole directions. |
| LC 565 — Array Nesting | Permutation cycles via index-as-next-pointer. |

---

## 13. How to narrate it in the room (full talk track)

**Beat 1 — Decode (≈20s).** "We have `n+1` integers, each in `[1, n]`. Two things fall out immediately. First, by pigeonhole a duplicate is guaranteed — `n+1` objects, `n` possible values — so there's no 'not found' path; that also answers the first follow-up. Second, 'exactly one repeated value' does *not* mean it appears exactly twice — the third example has it five times — so sum or XOR deltas against `1..n` are unsound."

**Beat 2 — Eliminate (≈20s).** "'Do not modify' kills sorting and the in-place sign-marking trick. 'Constant space' kills a hash set. `n` up to `10⁵` kills the O(n²) double loop. What survives: binary search on the value range at O(n log n) — count elements `≤ mid`, pigeonhole says the duplicate is `≤ mid` if the count exceeds `mid` — or something smarter at O(n)."

**Beat 3 — Model (≈30s).** "The smarter move: read the array as a linked list where node `i` points to node `nums[i]`. Every node has exactly one outgoing edge, and no value equals 0, so node 0 has no incoming edges. So the walk from 0 is a tail into a cycle — a rho shape. The cycle entrance gets pointed to twice: once from the tail, once from around the loop. And the only way a node gets two incoming edges here is that the same value sits at two different indices — so the entrance *is* the duplicate."

**Beat 4 — Algorithm (≈25s).** "That's Floyd's tortoise and hare, same as Linked List Cycle II. Phase one: slow moves one hop, fast two, until they meet inside the cycle. Phase two: reset slow to node 0, both move one hop — they re-meet exactly at the entrance, because the meeting node sits `μ mod λ` steps behind the entrance and the start sits `μ` steps before it, same distance up to whole laps. Return that node — everything past the first hop lives in value space, so the node id *is* the answer."

**Beat 5 — Complexity & tests (≈15s).** "O(n) time — they meet within tail-plus-cycle, at most about `2n` hops — O(1) space, array untouched. I'd dry-run the three examples plus `[1,1]` and `[3,3,3,3,3]`, and note that on example 1 the phase-1 meeting node is 4, not 2 — that's exactly the bug phase 2 prevents."

---

## 14. Say it in 60 seconds

> "Given `n+1` numbers in `1..n`, pigeonhole guarantees a duplicate — and it can occur more than twice, so sum and XOR tricks are out. No mutation and O(1) space rule out sorting, in-place marking, and hashing; `n` up to `10⁵` rules out the quadratic double loop. What's left: read the array as a linked list — index `i` points to `nums[i]`. Every value is at least 1, so node 0 has no incoming edges, and the walk from 0 is a tail into a cycle. The cycle entrance is pointed to by two different indices holding the same value, so the entrance *is* the duplicate. I run Floyd's tortoise and hare: phase one, slow one hop, fast two, until they meet inside the cycle; phase two, reset slow to index 0 and step both one hop — they re-meet exactly at the entrance. O(n) time, O(1) space, array untouched. I'd verify on the three examples plus `[1,1]` and an all-equal array."

*(≈160 words ≈ one minute at interview pace. If you lose the ρ-shape argument mid-sentence, fall back to: "it's Linked List Cycle II with the array as the list" and run the two phases.)*
