# Search in Rotated Sorted Array (LeetCode 33) — Complete Lesson

## 1. Problem, restated

You're given an array `nums` of `n` **distinct** integers that was originally sorted ascending, then **left-rotated** by some unknown `k` (with `1 <= k < n` when `n >= 2`):

```
rotated = [nums[k], nums[k+1], ..., nums[n-1], nums[0], ..., nums[k-1]]
```

Given this rotated array and a `target`, return the **index** of `target` in the rotated array, or `-1` if absent. Required: **O(log n)** time.

**What the rotation really does (the structural picture):** the result is two ascending runs glued together, where *every* element of the first run is greater than *every* element of the second:

```
[4, 5, 6, 7, 0, 1, 2]
 \______/  \______/
   run A      run B
   4..7       0..2      all of A > all of B  (original was 0..7 ascending)
```

So there is **exactly one "drop"** in the array: one index `d` where `nums[d] < nums[d-1]` (here `d = 4`: `7 → 0`). Everything else is locally ascending. That single drop is the entire reason this problem is interesting — and the key to solving it.

Precision matters: `lo`, `hi`, `mid` are **indices**; `nums[lo]`, `nums[mid]`, `target` are **values**. Most bugs in this problem are index/value confusion or off-by-one in the value-range tests.

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= n <= 5000` | Brute force *runs* fast enough in practice — but the **O(log n) requirement is a hard spec**, not a performance hint. Stopping at O(n) is an interview fail even though it'd pass the judge. |
| All values **distinct** | This is load-bearing. It makes `nums[lo] <= nums[mid]` a *proof* that the left half is sorted (equality can only happen when `lo == mid`). With duplicates this test breaks — see §7 and LC 81/154. |
| `-10^4 <= nums[i], target <= 10^4` | Values fit comfortably in 32-bit ints; no value-overflow concerns. (`lo + hi` also can't overflow at n ≤ 5000, but build the safe habit anyway — see §7.2.) |
| `1 <= k < n` (left rotation) | For `n >= 2` the array is *always* actually rotated. Still write code that works for an unrotated array — it costs nothing and survives constraint tweaks. Note: the **direction** of rotation (left vs. right) is irrelevant to the algorithm; both produce the same "one drop" shape, and you never need to know `k`. |
| O(log n) required | The interviewer is signaling: *modified binary search*. "Almost sorted" + log time ⇒ find an invariant that lets you discard half the window each step. |

---

## 3. Baseline: brute force (and why it's a trap)

The trivially correct solution is a linear scan:

```python
def search_bruteforce(nums: list[int], target: int) -> int:
    for i, v in enumerate(nums):   # O(n) time, O(1) space
        if v == target:
            return i
    return -1
```

**Worked trace — Example 2** (`nums = [4,5,6,7,0,1,2]`, `target = 3`):

| i | nums[i] | == 3? |
|---|---|---|
| 0 | 4 | no |
| 1 | 5 | no |
| 2 | 6 | no |
| 3 | 7 | no |
| 4 | 0 | no |
| 5 | 1 | no |
| 6 | 2 | no |

Scanned all 7 elements → return `-1`. (For Example 1, the scan finds `target = 0` at index 4 after 5 probes.)

A slightly fancier dead end: build a dict `{value: index}` in O(n), then answer lookups in O(1). Same O(n) preprocessing, plus O(n) extra space — it fails the spec even harder than the scan.

**Why it's a trap:** both are "correct" and both ignore the one structural fact the problem hands you — the array is *almost sorted*. If you can't articulate why the sorted-ish shape enables log-time search, you don't pass this question.

---

## 4. The core insight

> **Any window `[lo, hi]` of a rotated sorted array contains at most one drop. Therefore, for any `mid`, at least one of the two halves `[lo, mid]` or `[mid, hi]` is perfectly sorted — and one comparison tells you which.**

Why the test works (distinct values assumed):

- **If `nums[lo] <= nums[mid]`:** there cannot be a drop inside `(lo, mid]`. If there were, `nums[mid]` would be a second-run value, and every second-run value is strictly less than every first-run value — including `nums[lo]` — contradicting `nums[lo] <= nums[mid]`. So `[lo, mid]` is sorted. (Equality is fine: with distinct values, `nums[lo] == nums[mid]` forces `lo == mid`, a one-element half, trivially sorted.)
- **If `nums[lo] > nums[mid]`:** the drop must lie in `(lo, mid]`, so `[mid, hi]` contains no drop and is sorted.

Then, on the half that **is** sorted, membership is a plain range check — exactly like vanilla binary search:

```
                 nums[mid] == target? ── yes ──► return mid
                          │ no
          ┌───────────────┴─────────────────┐
   nums[lo] <= nums[mid]              nums[lo] > nums[mid]
   (left half [lo..mid] sorted)       (right half [mid..hi] sorted)
          │                                 │
   nums[lo] <= target < nums[mid]?    nums[mid] < target <= nums[hi]?
     yes → hi = mid - 1                 yes → lo = mid + 1
     no  → lo = mid + 1                 no  → hi = mid - 1
```

Two subtleties worth saying out loud in an interview:

1. **When the range test fails on the sorted half, we confidently move to the *other* (unsorted) half.** That feels wrong but is provably right: the target is either in the sorted half's value-range or it isn't there at all, so if the range check fails, the only remaining possibility is the unsorted side. (Trace A in §5.3 demonstrates this.)
2. **You never need to locate the drop.** The sorted-half test + range test together always discard half the window correctly, drop or no drop.

---

## 5. Optimal solution: one-pass rotated binary search

### 5.1 Code (Python)

```python
def search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:                 # exact hit — check FIRST
            return mid
        if nums[lo] <= nums[mid]:               # left half [lo..mid] is sorted
            if nums[lo] <= target < nums[mid]:  # target inside left half's range
                hi = mid - 1
            else:                               # can only be on the right
                lo = mid + 1
        else:                                   # right half [mid..hi] is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
```

**Invariant maintained every iteration:** *if `target` exists in `nums`, its index is in `[lo, hi]`.* Each branch either returns or moves to a half that provably either contains the target or is the only remaining candidate region. Each iteration sets `lo = mid + 1` or `hi = mid - 1`, so the window strictly shrinks and the loop terminates.

### 5.2 Traces on the official examples (plus two revealing extras)

**Example 1** — `nums = [4,5,6,7,0,1,2]`, `target = 0` → expect `4`:

| step | lo | hi | mid | nums[mid] | left sorted? | range test | action |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 7 | 4 ≤ 7 ✓ | 4 ≤ 0 < 7? **no** | lo = 4 |
| 2 | 4 | 6 | 5 | 1 | 0 ≤ 1 ✓ | 0 ≤ 0 < 1? **yes** | hi = 4 |
| 3 | 4 | 4 | 4 | 0 | — | — | **return 4** ✓ |

**Example 2** — same array, `target = 3` → expect `-1`:

| step | lo | hi | mid | nums[mid] | left sorted? | range test | action |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 7 | 4 ≤ 7 ✓ | 4 ≤ 3 < 7? **no** | lo = 4 |
| 2 | 4 | 6 | 5 | 1 | 0 ≤ 1 ✓ | 0 ≤ 3 < 1? **no** | lo = 6 |
| 3 | 6 | 6 | 6 | 2 | 2 ≤ 2 ✓ (single elem) | 2 ≤ 3 < 2? **no** | lo = 7 |

`lo > hi` → **return -1** ✓. Note step 3: the `<=` is what lets a one-element window count as "sorted."

**Example 3** — `nums = [1]`, `target = 0`: one iteration, `nums[0] = 1 ≠ 0`, range test `1 ≤ 0 < 1` fails, `lo = 1`, loop ends → **-1** ✓.

**Trace A (right-half branch rejects, we go left)** — `nums = [5,1,3]`, `target = 5`:

| step | lo | hi | mid | nums[mid] | left sorted? | range test | action |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 2 | 1 | 1 | 5 ≤ 1? **✗** → right sorted | 1 < 5 ≤ 3? **no** | hi = 0 |
| 2 | 0 | 0 | 0 | 5 | — | — | **return 0** ✓ |

This is the case that convinces skeptics: the right half was sorted, but the range check correctly sent us *back left*, because `5` can't live in `(1, 3]`.

**Trace B (right-half branch accepts)** — `nums = [6,7,0,1,2,3,4]`, `target = 3`:

| step | lo | hi | mid | nums[mid] | left sorted? | range test | action |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 1 | 6 ≤ 1? **✗** → right sorted | 1 < 3 ≤ 4? **yes** | lo = 4 |
| 2 | 4 | 6 | 5 | 3 | — | — | **return 5** ✓ |

### 5.3 Alternative: find the pivot, then binary search (two-pass, still O(log n))

Find the index of the minimum (LC 153 logic), then binary search a **virtual sorted array** via modular index mapping:

```python
def search_two_pass(nums: list[int], target: int) -> int:
    n = len(nums)
    # Pass 1: locate the minimum's index p (the element just after the drop).
    lo, hi = 0, n - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:   # drop is strictly after mid
            lo = mid + 1
        else:                      # minimum is at mid or to its left
            hi = mid
    p = lo

    # Pass 2: binary search virtual sorted array nums[(p + i) % n].
    lo, hi = 0, n - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        real = (p + mid) % n
        if nums[real] == target:
            return real
        if nums[real] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

Same asymptotics, more code, but the "virtual index mapping" trick is highly transferable. A third variant compares `target` with `nums[0]` to decide which run it belongs to, then binary-searches that run — also fine with distinct values. The one-pass version in §5.1 remains the canonical interview answer.

---

## 6. Complexity

| Approach | Time | Space | Meets spec? |
|---|---|---|---|
| Linear scan | O(n) | O(1) | ✗ (spec demands O(log n)) |
| Hash map `{value: index}` | O(n) build, O(1) lookup | O(n) | ✗ |
| Pivot + virtual-index binary search (§5.3) | O(log n) | O(1) | ✓ (two passes) |
| **One-pass sorted-half binary search (§5.1)** | **O(log n)** | **O(1)** | **✓ canonical** |

- The main loop runs at most ⌈log₂ n⌉ + 1 iterations (the window at least halves each step) — about **13 iterations at n = 5000**.
- **Optimality note:** O(log n) is asymptotically the best any comparison-based algorithm can do here, because the answer has n + 1 possibilities (n indices or "absent") and a decision tree with ≤ 3 outcomes per comparison needs depth ≥ log₃(n + 1) = Ω(log n) — and each array probe supplies exactly one comparison.

---

## 7. Common mistakes

### 7.1 Logic mistakes

| # | Mistake | Why it breaks | Fix |
|---|---|---|---|
| 1 | Writing `nums[lo] < nums[mid]` (strict) | When the window shrinks to one element, `lo == mid` so the values are equal; strict `<` misclassifies. Concrete failure: Example 1 with `target = 0`, final window `[4..4]` → strict version returns **-1** instead of 4. | Use `<=`; it's *safe* precisely because values are distinct (equality ⇒ `lo == mid`). |
| 2 | Range tests against `nums[0]` / `nums[n-1]` | After a few iterations the window is nowhere near the array ends; you test membership against the wrong values. | Always use the **current window's** `nums[lo]` / `nums[hi]`. |
| 3 | Forgetting the `nums[mid] == target` check first | `mid` is excluded from both halves' range tests, so you can jump right past the answer; or, combined with `hi = mid` updates, loop forever. | Equality check before anything else. |
| 4 | Updating `lo = mid` / `hi = mid` with floor-`mid` | Infinite loop on 2-element windows (`mid` stops advancing). | In this formulation, always move to `mid ± 1`. |
| 5 | Range test includes `nums[mid]` (e.g. `nums[lo] <= target <= nums[mid]`) while setting `hi = mid` | `mid` never leaves the window → infinite loop. | Keep `mid` out of both the test (`< nums[mid]`) and the next window (`mid - 1` / `mid + 1`). |
| 6 | Comparing `target` against `lo` / `hi` (indices) instead of `nums[lo]` / `nums[hi]` (values) | Classic index/value confusion; nonsense comparisons. | Range tests are **value vs. value**. |
| 7 | Assuming you must first find `k` (rotation amount) or the rotation direction | Wasted time; also error-prone (for a *left* rotation by `k`, the minimum sits at index `(n − k) mod n` — easy to get backwards). | The drop-based logic never needs `k` and is direction-agnostic. |
| 8 | Reusing this exact code when duplicates are allowed (LC 81) | Distinctness is what makes `nums[lo] <= nums[mid]` certify "left sorted." Counterexample: `nums = [1,3,1,1,1]`, `target = 3`. Here `nums[0] = 1 <= nums[2] = 1` says "left sorted," but `[1,3,1]` is **not** sorted; the code moves right, never inspects index 1, and wrongly returns -1. | LC 81 needs an extra rule: when `nums[lo] == nums[mid] == nums[hi]`, shrink one boundary by one (`lo += 1` or `hi -= 1`). This degrades worst case to O(n) — justified, because in arrays like `[1,1,1,1,0,1,1]` the equal endpoints hide which side holds the drop, forcing a shrink-by-one at every step. |

### 7.2 Language-specific gotchas (Java / C++ / Python)

| Language | Gotcha |
|---|---|
| Java | Compute `int mid = lo + (hi - lo) / 2;` — with `lo + hi` it's a latent overflow bug the moment constraints grow (harmless at n ≤ 5000, fatal as a habit elsewhere). Also: if you model things with boxed `Integer` (e.g., `HashMap<Integer, Integer>`), `==` compares **references**, and the autobox cache only covers −128..127 — values like `1000` inside this problem's range would compare unequal even when numerically equal. Use primitives or `.equals()`. |
| C++ | Same `mid` overflow habit (`lo + (hi - lo) / 2`). Don't reach for `std::lower_bound` / `std::binary_search` on the rotated array — their precondition is a *sorted range*, which is violated, so results are silently meaningless. Take `const std::vector<int>&` to avoid copying. |
| Python | `(lo + hi) // 2` is always safe (arbitrary-precision ints), but write `lo + (hi - lo) // 2` anyway as a portable habit. Prefer returning `-1` explicitly over relying on exceptions like `list.index`'s `ValueError`. |

---

## 8. Test plan (say these out loud before/after coding)

| Test | Input | Expected | Why it matters |
|---|---|---|---|
| Example 1 | `[4,5,6,7,0,1,2]`, t=0 | 4 | Target sits exactly at the rotation point |
| Example 2 | `[4,5,6,7,0,1,2]`, t=3 | -1 | Miss in a "value gap" between runs |
| Example 3 | `[1]`, t=0 | -1 | n = 1, no rotation possible |
| Single hit | `[1]`, t=1 | 0 | n = 1, present |
| Two elements | `[3,1]`, t=1 | 1 | Smallest rotated window; exercises `<=` on 1–2 element halves |
| Two elements miss | `[3,1]`, t=2 | -1 | |
| First index | `[4,5,6,7,0,1,2]`, t=4 | 0 | Inclusive left endpoint of range test |
| Last index | `[4,5,6,7,0,1,2]`, t=2 | 6 | Inclusive right endpoint |
| Below range | `[4,5,6,7,0,1,2]`, t=-5 | -1 | Range test must not "wrap around" |
| Above range | `[4,5,6,7,0,1,2]`, t=9 | -1 | |
| Negatives | `[1,2,-3,-2,0]`, t=-2 | 3 | Right-half-sorted branch with negative values |
| Unrotated (defensive) | `[1,2,3,4,5]`, t=4 | 3 | Code shouldn't *require* an actual drop, even though the stated `k` range always rotates |

Good habits: state the expected output **before** running each case; then volunteer the follow-up ("with duplicates this breaks — that's LC 81, and here's the counterexample") — it converts a constraint into demonstrated insight.

---

## 9. Full interview script (the long talk track)

**Clarify (≈30s):** "Let me restate: the array was ascending with *distinct* values, then left-rotated by unknown `k`. So it's two ascending runs concatenated, and everything in the first run is bigger than everything in the second — exactly one drop point. I need the index of `target`, or -1, in O(log n). Values are distinct, n ≥ 1 — good, distinctness will matter."

**Naive (≈15s):** "Linear scan is O(n) and trivially correct, but the spec says log n, and 'almost sorted' is a binary-search smell — let's use the structure."

**Insight (≈45s):** "Key fact: any window has at most one drop, so for any `mid`, at least one side of `mid` is perfectly sorted. One comparison — `nums[lo] <= nums[mid]` — tells me which side. On a sorted side, membership is a plain range check, so: if target is inside the sorted half's value range, search there; otherwise it can only be on the other side, so search there. Check `nums[mid] == target` first, since `mid` itself is excluded from both halves."

**Code (≈4–5 min):** write §5.1, narrating the four decision boxes as you go. Point out the `<=` deliberately: "equality only happens when the window collapsed to one element, and with distinct values that's safe."

**Dry-run (≈1 min):** trace Example 1 aloud (3 rows), and one right-half-sorted case like `[6,7,0,1,2,3,4]`, target 3 — "this shows the range test steering us back left even when the sorted half is on the right."

**Complexity (≈15s):** "Window at least halves each iteration → O(log n) time, O(1) space. That's also optimal in the comparison model — n+1 possible answers force a Ω(log n) decision-tree depth."

**Tests (≈1 min):** walk the table in §8, leading with the rotation-point hit, the single-element case, and the value-gap miss.

---

## 10. Transferable patterns & related problems

**Pattern: "binary search on an array with exactly one breakpoint."** The reusable invariant is *at least one half is provably sorted / monotone, and one cheap comparison identifies it*. Once identified, a range/monotonicity check decides which half to keep. This family includes:

| Problem | Relationship |
|---|---|
| LC 153 — Find Minimum in Rotated Sorted Array | Same structure; you binary search **for the drop itself** instead of a target. (Follow-up "how many rotations?" = pivot position, with the left/right-rotation off-by-one caveat.) |
| LC 81 — Search in Rotated Sorted Array II | Duplicates added; needs the shrink-by-one rule; worst case O(n) (see §7.1 #8 for why). |
| LC 154 — Find Minimum in Rotated Sorted Array II | Same duplicate handling as LC 81, targeting the minimum. |
| LC 162 — Find Peak Element | Same flavor: a local comparison certifies which side must contain a peak. |
| LC 34 / LC 35 — First/Last Position, Search Insert | The vanilla bounds skills this problem assumes. |
| LC 1095 — Search in a Mountain Array | Compose a structure-finding search with two plain searches. |
| LC 4 — Median of Two Sorted Arrays | The advanced cousin: binary search on *structure*, not values. |

**Pattern: virtual index mapping** (§5.3): binary search a *conceptually sorted* sequence by mapping virtual indices to real ones — shows up whenever data is a permuted sorted order.

---

## 11. Say it in 60 seconds

> "It's a sorted array that got rotated, so it's two ascending runs with a single drop between them — everything before the drop is bigger than everything after. That means for any `mid`, at most one half contains the drop, so **at least one half is guaranteed sorted**. So I binary search: if `nums[mid]` equals the target, done. Otherwise I check `nums[lo] <= nums[mid]` — if true, the left half is sorted, and since it's sorted I can do a plain range test: if the target lies in `[nums[lo], nums[mid])`, search left; otherwise it can only be on the right, so search right. If the left half isn't sorted, the right half is — same logic mirrored: if the target's in `(nums[mid], nums[hi]]`, go right, else go left. The `<=` matters: when the window shrinks to one element, `lo` equals `mid`, and a strict comparison would misfire. And distinctness is load-bearing — with duplicates you can't tell which side is sorted, and you degrade to O(n), which is the LC 81 variant. Every step discards half the window, so it's O(log n) time, O(1) space."

*(≈170 words — recite the bolded invariant and the two mirrored range tests; those carry the whole solution.)*
