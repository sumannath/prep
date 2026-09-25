# Car Fleet (LeetCode 853) — Complete Interview Lesson

## 0. TL;DR

Sort cars by position **descending** (closest to target first), compute each car's *unobstructed* time-to-target `t = (target − position) / speed`, and count how many times `t` is **strictly greater** than the running maximum. That count is the number of fleets. `O(n log n)` time, `O(n)` space. The single most dangerous boundary: `t == lead` means the car catches the fleet **exactly at the target** → it **merges**, it does not start a new fleet.

---

## 1. Problem Restatement (in your own words)

Say this back to the interviewer before coding:

> "We have `n` cars on a **single-lane** road, all driving toward an exit at mile `target`. Car `i` starts at mile `position[i]` moving at `speed[i]`. **No passing**: a faster car behind a slower one closes the gap and then locks to the slower pace — from that moment they move as one *fleet* whose speed is the slowest member's speed. A car that catches a fleet **exactly at the target** still counts as part of that fleet. Return how many **distinct groups** arrive at the target."

Key consequences worth stating out loud:

- Every car eventually arrives (all speeds are `> 0`), so the answer is the number of distinct **arrival waves**.
- A "fleet" can be a single car; the answer is always in `[1, n]`.
- Positions are **not sorted** and are **unique**.

---

## 2. Constraint Decoding

| Constraint | What it tells you about the solution |
|---|---|
| `n ≤ 10^5` | Target `O(n log n)`. An `O(n²)` simulation does up to ~10^10 steps worst case → TLE. |
| `0 < target ≤ 10^6`, `0 ≤ position[i] < target` | Distance-to-target is in `[1, 10^6]`, so solo time `t` is **strictly positive** → a `0.0` sentinel for "no fleet ahead yet" is safe. No car starts past the exit. |
| `0 < speed[i] ≤ 10^6` | No division by zero; every car arrives eventually. Products `(target−p)·s` can reach `10^12` → **64-bit** math if you cross-multiply in Java/C++. |
| All `position[i]` unique | Strict total order — no tie-breaking needed. (Know what you'd do anyway: see §10.) |
| `position`, `speed` given unsorted | You must sort by distance-to-target first — this is where the `log n` comes from. |

---

## 3. Brute Force: Event Simulation (with a worked trace)

**Idea:** repeatedly find the *earliest* collision between adjacent cars, merge the pair (the rear car adopts the front car's speed), and repeat until no more collisions happen on the road. Survivors = fleets.

Two implementation notes that make this clean:

- **Lazy advancement:** you never have to "move" the other cars. Every car's trajectory is the straight line `p + s·τ` through its recorded `(position, speed)`, so pairwise meeting times computed from recorded states are true absolute times.
- **Beyond-target meetings don't count:** if two cars would only meet past mile `target`, they never merge (each arrives separately).

```python
def carFleet_bruteforce(target: int, position: list[int], speed: list[int]) -> int:
    cars = sorted(zip(position, speed))            # ascending: cars[i+1] is directly ahead of cars[i]
    merges = 0
    while True:
        best = None                                # (tau, index) = earliest catch-up event
        for i in range(len(cars) - 1):
            (p_b, s_b), (p_f, s_f) = cars[i], cars[i + 1]   # rear car, front car
            if s_b > s_f:                          # rear is faster -> it may catch up
                tau = (p_f - p_b) / (s_b - s_f)    # meeting time
                if p_b + s_b * tau <= target:      # meeting happens on the road (at target counts)
                    if best is None or tau < best[0]:
                        best = (tau, i)
        if best is None:
            break
        _, i = best
        cars[i] = cars[i + 1]                      # rear car locks to the front car's line
        del cars[i + 1]                            # they occupy the same mile now: drop the front copy
        merges += 1
    return len(cars)                               # survivors = distinct fleets
```

### Worked trace — Example 1 (`target = 12`, `position = [10,8,0,5,3]`, `speed = [2,4,1,1,3]`)

Cars sorted ascending by position: `(0,1) (3,3) (5,1) (8,4) (10,2)`.

| Round | Catch-up events found | Action | Cars after |
|---|---|---|---|
| 1 | `(3,3)`→`(5,1)`: meet at `t=1`, mile 6; `(8,4)`→`(10,2)`: meet at `t=1`, mile 12 (= target) | merge `(3,3)` into `(5,1)` | `(0,1) (5,1) (8,4) (10,2)` |
| 2 | `(8,4)`→`(10,2)`: meet at `t=1`, mile 12 (= target, still counts as one fleet) | merge | `(0,1) (5,1) (10,2)` |
| 3 | none — gaps never close (equal or slower rear speeds) | stop | 3 survivors |

**Answer: 3.** ✓ (Fleets: `{10,8}` arriving together at `t=1`; `{5,3}` catching at mile 6 then crawling at speed 1; `{0}` alone.)

**Complexity:** each round performs exactly one merge and an `O(n)` scan, and there are at most `n − 1` merges (each merge removes one car) → **O(n²)** worst case (e.g., speeds strictly increasing from front to back fire the merges one at a time). At `n = 10^5` that's ~10^10 operations — fine to *propose*, then immediately improve.

---

## 4. The Core Insight

### 4.1 The front-most car is never wrong

The car closest to the target has nobody ahead of it, so it is **never delayed**. It arrives at exactly

```
t = (target − position) / speed
```

and — this is the crucial invariant — **its whole fleet arrives at that same time**. Why? A car can only join a fleet from behind, and joining requires *closing a gap*, which requires being **strictly faster** than the fleet. So a merge never slows a fleet down and never changes its arrival time. (This is also why, in practice, a fleet's speed always equals its **front car's** speed: the minimum-speed car is always the one nobody caught up *to* from the front.)

### 4.2 The Join Lemma

> **Lemma.** Let `A` be the fleet directly ahead of car `B`, and let `T_A` be `A`'s arrival time (= the unobstructed time of `A`'s lead car). Then `B` ends up in fleet `A` **iff** `t_B ≤ T_A`, where `t_B = (target − p_B)/s_B` is `B`'s unobstructed time. Equality means `B` catches `A` **exactly at the target** — still one fleet.

*Proof sketch (two directions, each two lines):*

- **If `B` touches `A`** at time `τ` at some mile `x ≤ target`: before `τ` it moved freely, after `τ` it moves at the fleet speed `v` (and `s_B ≥ v`, otherwise it could never have closed the gap). Then `x = p_B + s_B·τ` and `x + v·(T_A − τ) = target`, so
  `t_B = (target − p_B)/s_B = τ + (v/s_B)(T_A − τ) ≤ T_A`. Equality holds exactly when `τ = T_A`, i.e., the catch happens at the target mile.
- **If `t_B ≤ T_A` and `B` never touched `A`:** then `B` travels freely and reaches the target at time `t_B ≤ T_A` — while `A` is still on the road (it arrives at `T_A`). A trailing car cannot be at the target while the car ahead is still behind it — contradiction. (At `t_B = T_A` they touch **at** the target → joined, per the problem statement.)

### 4.3 From lemma to algorithm

Scan cars **front-to-back** (position descending). Everything ahead of the current car is already resolved into fleets whose arrival times are **strictly increasing** from front to back (each new fleet only spawns when its lead time exceeds the fleet ahead — that's the strict `>` in the lemma). So the fleet directly ahead is simply "the most recent fleet," and:

- `t > lead_time` → this car can never catch it → **new fleet**, and it becomes the new `lead_time`.
- `t ≤ lead_time` → it merges; nothing changes.

**The answer is the number of strict prefix-maxima of the times, in position-descending order.** No simulation of positions, speeds, or merge events is ever needed — the only state that survives a merge is the fleet's arrival time.

---

## 5. Optimal Solution

### 5.1 Counter version (cleanest — recommended in an interview)

```python
from typing import List

class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        # Sort cars by starting mile, closest to the target first.
        # zip keeps (position, speed) paired — NEVER sort the two arrays independently.
        cars = sorted(zip(position, speed), reverse=True)

        fleets = 0
        lead_time = 0.0     # arrival time of the fleet directly ahead (safe: every t > 0)

        for pos, spd in cars:
            t = (target - pos) / spd    # unobstructed time-to-target
            if t > lead_time:           # strictly later arrival -> can never catch the fleet ahead
                fleets += 1
                lead_time = t
            # else: catches the fleet ahead (equality = catches it AT the target) -> merges silently
        return fleets
```

### 5.2 Monotonic-stack variant (same logic, more visualizable)

The stack holds the arrival times of current fleets, strictly increasing bottom→top. Push the new car's time; if it doesn't exceed the fleet ahead, it merged — pop it back off. (Note the stack stores **time values**, not indices — unlike Next-Greater-style problems.)

```python
class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        stack = []
        for pos, spd in sorted(zip(position, speed), reverse=True):
            t = (target - pos) / spd
            stack.append(t)
            if len(stack) >= 2 and stack[-1] <= stack[-2]:
                stack.pop()     # merged into the fleet ahead; the fleet's time is unchanged
        return len(stack)
```

### 5.3 Exact-arithmetic variant (bulletproof against floating point)

`t_i > t_lead ⟺ (target − p_i)·s_lead > (target − p_lead)·s_i` — cross-multiply instead of dividing.

```python
class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        fleets, lead_num, lead_den = 0, 0, 1        # lead time = lead_num / lead_den, start at 0
        for pos, spd in sorted(zip(position, speed), reverse=True):
            if (target - pos) * lead_den > lead_num * spd:   # t > lead, exactly
                fleets += 1
                lead_num, lead_den = target - pos, spd
        return fleets
```

**Why bother?** Distinct exact times are rationals `a/b` with `b ≤ 10^6`, so two *distinct* times differ by at least `1/(10^6·10^6) = 10^-12`; near magnitude `10^6` one double-ulp is ~`10^-10`, so two different times **can** round to the same double. Rounding is monotonic, so floats can only turn "distinct" into "equal" — the failure mode is silently *undercounting* fleets. Python ints make the fix free; see §8 for the Java/C++ overflow angle.

### 5.4 Traces on the official examples

**Example 1** — `target = 12`, `position = [10,8,0,5,3]`, `speed = [2,4,1,1,3]` (rows are cars **sorted by position value**, not original index — original indices are irrelevant from here on):

| pos | spd | `t=(12−p)/s` | `t > lead?` | Action | fleets | lead |
|---:|---:|---:|---|---|---:|---:|
| 10 | 2 | 1.0 | yes (1 > 0) | new fleet | 1 | 1 |
| 8 | 4 | 1.0 | no (1 ≤ 1) | merges — catches at mile **12** (the target) | 1 | 1 |
| 5 | 1 | 7.0 | yes | new fleet | 2 | 7 |
| 3 | 3 | 3.0 | no (3 ≤ 7) | merges — catches at mile 6, both crawl at speed 1 | 2 | 7 |
| 0 | 1 | 12.0 | yes | new fleet | **3** | 12 |

**Output 3.** ✓ Stack variant: `[1] → [1] → [1,7] → [1,7] → [1,7,12]`, length 3.

**Example 2** — `target = 10`, `position = [3]`, `speed = [3]`: one car, `t = 7/3 > 0` → **1**. ✓

**Example 3** — `target = 100`, `position = [0,2,4]`, `speed = [4,2,1]`:

| pos | spd | `t` | `t > lead?` | Action | fleets | lead |
|---:|---:|---:|---|---|---:|---:|
| 4 | 1 | 96 | yes | new fleet | 1 | 96 |
| 2 | 2 | 49 | no | merges (catches the lead at mile 6) | 1 | 96 |
| 0 | 4 | 25 | no | merges | **1** | 96 |

**Output 1.** ✓ Note how the cascading merge (0→2→4) is handled for free: both trailing cars only need to beat `96`, the *fleet's* arrival time — no transitive speed bookkeeping.

### 5.5 Aside: skipping the sort entirely

Positions are integers in `[0, target)` with `target ≤ 10^6`, so you can bucket by position and sweep buckets descending — `O(n + target)` time, `O(target)` space:

```python
def carFleet_countingsort(target: int, position: list[int], speed: list[int]) -> int:
    speed_at = [-1] * target
    for p, s in zip(position, speed):
        speed_at[p] = s                     # positions are unique, so one slot each
    fleets, lead = 0, 0.0
    for p in range(target - 1, -1, -1):     # nearest-to-target first, no comparison sort
        if speed_at[p] != -1:
            t = (target - p) / speed_at[p]
            if t > lead:
                fleets += 1
                lead = t
    return fleets
```

---

## 6. Complexity

| Approach | Time | Extra space | Verdict at `n = 10^5` |
|---|---|---|---|
| Event simulation (§3) | `O(n²)` worst case (≤ `n−1` merge rounds × `O(n)` scan) | `O(n)` | TLE (~10^10 steps) |
| **Sort + sweep (main)** | **`O(n log n)`** — dominated by the sort; the sweep is `O(n)` | `O(n)` for the sorted pairs | ✓ intended |
| Counting-bucket sweep (§5.5) | `O(n + target)` | `O(target)` | ✓ viable since `target ≤ 10^6` |

Follow-up you may get — *"can we beat `O(n log n)`?"* Honest answer: with these bounded integer positions, yes, via the bucket sweep above; but within the **comparison model** you cannot beat `Ω(n log n)` for the sort this approach leans on, because any comparison-based ordering algorithm's decision tree needs at least `n!` leaves (one per permutation) and therefore depth ≥ `log₂(n!) = Θ(n log n)`. Don't claim a lower bound for the *problem itself* — that's subtler and not needed.

---

## 7. Common Mistakes & Debugging Checklist

| # | Mistake | Symptom / why it's wrong | Fix |
|---|---|---|---|
| 1 | Using `>=` (or `<`, `!=`) instead of strict `>` | `t == lead` = catching **exactly at the target** = same fleet; counting it as new **overcounts** | New fleet only on `t > lead_time`; own this boundary out loud |
| 2 | Sorting `position` and `speed` **independently** | Destroys the car pairing; you compare times of cars that don't exist | Sort paired records (`zip`) or an index array, index into both |
| 3 | Integer division `//` for `t` | `(12-5)//1` vs `7/2=3.5` floored to 3 — comparisons shift | Keep true division, or use exact cross-multiplication (§5.3) |
| 4 | Comparing each car only to the **immediately ahead car's raw solo time** (back-to-front, no propagation) | Misses **transitive** merges — the car ahead may already be absorbed into a slower fleet | Compare against the running **fleet** arrival time, front-to-back (or maintain the suffix max) |
| 5 | Sorting ascending and sweeping ascending with a plain counter | The fleet "directly ahead" isn't resolved yet when you reach a car | Sort **descending** (goal-outward) so every decision sees fully resolved traffic ahead |
| 6 | Float division without thinking | Two distinct rational times can collapse to the same double at these bounds → silent **undercount** (rounding is monotone, so it never overcounts) | Cross-multiply with exact integers (free in Python; `long` in Java/C++) |
| 7 | Simulating positions/merge events in the optimal pass | Unnecessary — a merge never changes any fleet's arrival time | Carry only `lead_time` |

**Counterexample for #4 (memorize it):** `target = 100`, `position = [90, 88, 75]`, `speed = [1, 6, 5]` → solo times `[10, 2, 5]`. Car@88 catches car@90 (2 ≤ 10) and *slows down*; car@75 (5 ≤ 10) catches the **merged fleet**, so the answer is **1**. Naive adjacent-raw comparison sees `5 > 2` and wrongly reports 2.

**Precision notes (indices vs. values, duplicates):**
- After sorting, nothing references original indices; the flowing "unit" is the `(position, speed)` pair and its derived time **value**. The stack (if used) stores times, not indices — call this contrast out if the interviewer has seen you do index-stacks elsewhere.
- Positions are guaranteed unique, so tuple tie-breaking in `sorted(zip(...), reverse=True)` never fires. Defensive knowledge: if duplicates *were* allowed, co-located cars are already bumper-to-bumper (one fleet moving at the min speed); sort same-position cars by **speed ascending** (slower first) so the faster partner correctly merges.

---

## 8. Implementation Gotchas in Java / C++

| Language | Gotcha |
|---|---|
| **Java** | Cross-multiplication overflows `int`: `(target − pos) ≤ 10^6` times `speed ≤ 10^6` reaches `10^12` > `2^31 − 1`. Write `long tNum = target - pos[i];` and compare `tNum * leadDen > leadNum * spd` (or cast the first operand: `(long)(target - pos[i]) * leadDen`). Prefer `Integer.compare(b, a)` over `b - a` in comparators — subtraction is safe here only because positions fit in a narrow range, and `compare` is the habit that prevents overflow bugs elsewhere. Avoid `HashMap<Integer,Integer>`/boxed pair lists for 10^5 cars — pure overhead. |
| **C++** | Use `long long` for the cross-products. `std::sort` on `vector<pair<int,int>>` with `greater<>()` sorts descending and tie-breaks by speed descending — harmless here (unique positions) but know that it's happening. A comparator must be a strict weak ordering (`a.first > b.first`, never `>=`). |
| **Python** | No overflow, but `//` and float-equality traps apply (§7 #3, #6); `sorted(zip(...), reverse=True)` is the idiomatic pairing sort. |

Java comparison core, for reference:

```java
long tNum = target - position[i];            // distance to target
if (tNum * leadDen > leadNum * speed[i]) {   // long × long: exact, no float, no overflow
    fleets++;
    leadNum = tNum;
    leadDen = speed[i];
}
```

---

## 9. Test Cases to Propose Out Loud

Propose these **before coding** — it signals you've found the boundary conditions:

| # | Input | Expected | What it verifies |
|---|---|---|---|
| 1 | `target=12, pos=[10,8,0,5,3], spd=[2,4,1,1,3]` | 3 | Official: catch at target + mid-route merges |
| 2 | `target=10, pos=[3], spd=[3]` | 1 | Official: single car (answer ≥ 1 always) |
| 3 | `target=100, pos=[0,2,4], spd=[4,2,1]` | 1 | Official: cascading/transitive merge |
| 4 | `target=10, pos=[0,5], spd=[2,1]` | 1 | **Equal solo times** → catch exactly at the target → one fleet (the `>` vs `>=` boundary) |
| 5 | `target=10, pos=[1,4,7], spd=[2,2,2]` | 3 | Identical speeds → nobody ever catches → answer = n |
| 6 | `target=100, pos=[90,88,75], spd=[5,6,1]` | 1 | Transitive-merge trap that kills the "adjacent raw times" approach (§7 #4) |
| 7 | `target=10, pos=[9,0], spd=[1,2]` | 2 | Faster car far behind still can't catch (meeting would be at mile 18 > target) |

Quick sanity checks to verbalize: catch-up time for adjacent cars is `(p_front − p_rear)/(s_rear − s_front)` (needs `s_rear > s_front`); test #4 meets at `τ = 5/1 = 5`, position `0 + 2·5 = 10 = target` ✓.

---

## 10. Transferable Patterns & Related Problems

**Patterns you just used (name them in the interview):**

1. **Goal-outward sweep:** when agents queue toward a shared endpoint and can't pass, process from the endpoint backward — the front element's "unobstructed metric" is final and authoritative.
2. **Merge-invariant extraction:** don't simulate the merge; find the one quantity that survives it (here: the fleet's arrival time) and track only that. Turns a simulation into a counting scan.
3. **Strict prefix-maxima counting:** after a sort, `O(n)` counting of "beats everything seen so far" — the workhorse behind many stack problems.
4. **Boundary equality ownership:** decide, out loud, which side "equal" belongs to (`t == lead` ⇒ merge), and write a test that pins it.
5. **Exact rational comparison via cross-multiplication:** dodge float equality on quotients.

**Related problems:**

| Problem | What transfers |
|---|---|
| LC 1776 **Car Fleet II** (Hard) | Identical physics, but output *when* each car catches the fleet ahead → monotonic stack over position-descending cars + collision-time algebra (watch division/exactness) |
| LC 735 **Asteroid Collision** | Entities on a line that collide and merge/cancel; stack of survivors |
| LC 739 / LC 503 **Daily Temperatures / Next Greater Element II** | Monotonic stack with a strictness decision at equal values — same boundary discipline |
| LC 1944 **Number of Visible People in the Queue** | "Who ahead of me blocks me" via monotonic stack from one end |
| LC 962 **Maximum Width Ramp** | Exploit positional order with a running extremum instead of pairwise checks |

---

## 11. Interview Talk Track (full script)

1. **(0:00) Clarify:** "Single lane, no passing; a faster rear car catches up and locks to the slower pace; catching the fleet **at** the target still counts as the same fleet; return the number of arriving groups. Positions unique but unsorted, speeds all positive — so everyone eventually arrives."
2. **(0:30) Brute force, then discard:** "I could simulate: find the earliest adjacent collision, merge, repeat. That's `O(n²)` — up to `n−1` merges times an `O(n)` scan — too slow at `10^5`, but it pins down the physics."
3. **(1:15) Insight:** "Key realization: the front-most car is never delayed, so its solo time `(target − position)/speed` is exactly when its fleet arrives. And a merge never changes a fleet's arrival time, because only a *faster* car can close a gap. So for the next car back there are just two futures: if its solo time is **greater** than the fleet ahead's arrival, it can never catch it before the exit — new fleet. If it's **less or equal** — equal means catching exactly at the target — it merges."
4. **(2:15) Algorithm:** "So: sort cars by position descending, walk front-to-back computing solo times, and count how many times the time strictly exceeds the running maximum. Each strict increase is one fleet. One pass after the sort."
5. **(2:45) Correctness guardrails:** "Equality goes to the merge side — I'll test that specifically. And I'll compare times by cross-multiplying integers so floating-point equality can't misclassify near-equal times."
6. **(3:00) Complexity + tests:** "`O(n log n)` time for the sort, `O(n)` space. Tests: the three examples, equal-times-merge-at-target, uniform speeds → n fleets, and a transitive merge case."
7. **(3:15) Follow-ups ready:** "Sequel is Car Fleet II (report catch-up *times* — monotonic stack). Given `position < target ≤ 10^6`, I could also bucket by position and skip comparison sorting for `O(n + target)`."

---

## 12. Say It in 60 Seconds

> "Since no one can pass, I look at cars starting from the target and moving backward. The front car is never slowed down, so its solo time-to-target — distance over speed — is exactly when its fleet arrives. For each car behind, there are only two futures: if its own solo time is **greater** than the arrival time of the fleet directly ahead, it can never catch up before the exit, so it starts a new fleet. If it's **less than or equal** — equal means it catches the fleet right at the target, which still counts as the same fleet — it merges. And merging never changes a fleet's arrival time, because only a faster car can close a gap. So the algorithm is: sort cars by position descending, compute each car's solo time, and count how many times that time **strictly exceeds** the running maximum — each strict increase is one fleet. `O(n log n)` for the sort, `O(n)` for the scan. I'd compare times by cross-multiplying integers instead of dividing, to keep equality exact, and I'd specifically test the case where a car's time equals the fleet ahead's — that must merge, not split."
