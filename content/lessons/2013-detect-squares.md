# Detect Squares (LeetCode 2013) — Complete Interview Lesson

## 1. Problem restated in your own words

You maintain a growing **multiset** of lattice points with two operations:

- `add(p)` — insert one more **occurrence** of `p`. Copies are distinguishable.
- `count(q)` — return the number of ways to pick **three occurrences** from the multiset such that, together with the query point `q`, the four points are exactly the four vertices of an **axis-aligned square with positive area**.

Three semantics that separate correct from wrong solutions — say these out loud in an interview:

| Semantic | Consequence |
|---|---|
| `q` is a vertex but is **not** one of the three chosen points | `q` never needs to have been `add`ed; you never "reuse" `q` from storage |
| Ways are counted over **occurrences (indices)**, not coordinate values | duplicates multiply: two stored copies of a corner double the number of valid triples using it |
| Positive area | side length ≥ 1, so any stored point with the *same coordinates as `q`* can never be used in a count |

## 2. Decoding the constraints

| Constraint | What it's telling you |
|---|---|
| `0 <= x, y <= 1000` | Small, closed grid → a 1001×1001 count array is viable (~10⁶ cells). But `qx ± d` can leave `[0, 1000]`, so the array design needs bounds checks; a hash map simply returns "absent." |
| ≤ 3000 calls **total** to `add`/`count` | `n ≤ 3000`. Even an O(n) scan per `count` passes; the column-scoped solution uses ~3×10⁶ operations total — trivial. |
| Duplicate points allowed, treated as distinct | Store **multiplicities** (a Counter), not a set; counts multiply (product rule). |
| Interleaved stream of `add`/`count` | The structure must be incremental; no offline preprocessing, and `count` must not mutate state. |
| `count` returns `int` | The answer can reach ~10⁹ (derivation below) — fits 32-bit with thin margin; use 64-bit accumulation in Java/C++ out of habit. |

**Answer-magnitude bound (own arithmetic):** For a fixed query corner, each coordinate location ≠ `q` is a corner of at most two squares through `q` (only a vertical partner is shared by the left and right squares of one side length), and each square contributes the product of its three corner multiplicities — maximized by dumping all 3000 points on the three corners of a single square: 1000³ = 10⁹ < 2³¹ − 1 ≈ 2.15 × 10⁹.

## 3. Geometry: what a counted square looks like

Fix `q = (qx, qy)`. Any valid square through `q` consists of:

- a **vertical partner** `V = (qx, qy ± d)`, `d ≥ 1` — the only other corner sharing `q`'s x-coordinate;
- a **horizontal partner** `H = (qx ± d, qy)`;
- the **diagonal** `D = (qx ± d, qy ± d)` — with signs chosen consistently, one of two squares (extend toward `qx + d` or toward `qx − d`).

The pivotal counting property:

> Every square through `q` contains **exactly one** non-`q` corner with `x == qx` (namely `V`). Therefore *scanning the query's x-column enumerates every square through `q` exactly once* — `V` identifies the square, and the left/right choice is explicit.

## 4. Brute force, with a worked trace

Keep every occurrence in a list; on `count`, try every 3-index combination and test the four points. A clean, exact predicate: the axis-aligned bounding box of the four points must be a square (width == height > 0) and the four points must be exactly its four corners.

```python
from itertools import combinations
from typing import List

class DetectSquaresBrute:
    def __init__(self) -> None:
        self.points = []                    # every occurrence, duplicates included

    def add(self, point: List[int]) -> None:
        self.points.append((point[0], point[1]))

    def count(self, point: List[int]) -> int:
        qx, qy = point
        return sum(self._is_square(qx, qy, a, b, c)
                   for a, b, c in combinations(self.points, 3))

    @staticmethod
    def _is_square(qx, qy, p1, p2, p3) -> bool:
        xs = (qx, p1[0], p2[0], p3[0])
        ys = (qy, p1[1], p2[1], p3[1])
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        if w == 0 or w != h:                # zero area, or not a square box
            return False
        corners = {(min(xs), min(ys)), (min(xs), max(ys)),
                   (max(xs), min(ys)), (max(xs), max(ys))}
        return {(qx, qy), p1, p2, p3} == corners   # 4 distinct points on 4 corners
```

**Trace on the official example.**

`count([11,10])` with `points = [(3,10), (11,2), (3,2)]`: the only index triple `(0,1,2)` gives `w = 11−3 = 8`, `h = 10−2 = 8`, and the four points sit on the four corners of the 8×8 box → ✅ → **returns 1**.

`count([14,8])`: for triple `(0,1,2)`, `w = 14−3 = 11 ≠ h = 8` → ✗ → **returns 0**.

After `add([11,2])` (4 occurrences), `count([11,10])` again:

| Index triple | Coordinates used | Verdict |
|---|---|---|
| `(0,1,2)` | (3,10), (11,2), (3,2) | ✅ |
| `(0,1,3)` | (3,10), (11,2), (11,2) | ✗ — only 3 distinct positions |
| `(0,2,3)` | (3,10), (3,2), (11,2) | ✅ |
| `(1,2,3)` | (11,2), (3,2), (11,2) | ✗ — only 3 distinct positions |

→ **returns 2** ✅. Note triples `(0,1,2)` and `(0,2,3)` use the *same coordinate values* but different *occurrence indices* — both are legitimate distinct ways. That is exactly what "duplicates are different points" means, and it's why the answer is 2.

**Why it fails at scale:** `count` is O(C(n,3)) ≈ O(n³); with `n = 3000` that's ≈ 4.5×10⁹ triples *per single call*. Dead end. (There's an O(n²) middle ground — anchor a same-`x` partner and a same-`y` partner, then look up the diagonal — but it already contains the seed of the real solution, so jump straight there.)

## 5. The core insight

1. **The query is a corner.** So think "corner-first," not "match points pairwise."
2. **One column point fixes everything.** If `P = (qx, py)` is stored with `py ≠ qy`, then `d = py − qy`, and the square is one of exactly two: corners `{(qx, qy), (qx, py), (qx ± d, qy), (qx ± d, py)}`.
3. **Look up, don't search.** The other two corners are two O(1) hash lookups — *with multiplicities*, because each copy is a distinct choice: ways = `cnt(P) · cnt(H) · cnt(D)`.
4. **Each square is counted exactly once**, because its vertical partner is the unique non-`q` corner in the query's column (the horizontal partner and diagonal always have `x = qx ± d ≠ qx`).

Do we have to touch the whole column? Informally yes, and that's the honest floor for this design: any stored point in the query's column could be the unique vertical partner of a square, and two multisets differing only in that point can yield different counts, so a scheme that never consults it cannot distinguish those inputs. (The column has ≤ min(n, 1001) distinct points, so this is cheap.)

## 6. Optimal approach — column buckets

**Data structure:** a nested hash map `cols[x][y] → multiplicity`. (Bucket by `x` or by `y` — symmetric; pick one and be consistent.)

**Algorithm for `count(q)`:**
1. If column `qx` is empty → return 0.
2. For each `(py, c)` in column `qx` with `py ≠ qy`: set `d = py − qy`.
3. Add `c · cnt(qx+d, qy) · cnt(qx+d, py) + c · cnt(qx−d, qy) · cnt(qx−d, py)`.

```python
from collections import defaultdict
from typing import List

class DetectSquares:
    def __init__(self) -> None:
        # cols[x][y] = number of occurrences added at (x, y) so far
        self.cols = defaultdict(lambda: defaultdict(int))

    def add(self, point: List[int]) -> None:
        x, y = point
        self.cols[x][y] += 1                  # O(1) expected; buckets created lazily

    def count(self, point: List[int]) -> int:
        qx, qy = point
        column = self.cols.get(qx)            # read via .get: no phantom keys
        if not column:
            return 0                          # fast path: nothing shares q's x
        total = 0
        for py, c in column.items():          # scan ONLY the query's column
            if py == qy:                      # d == 0 -> zero area; never usable
                continue
            d = py - qy                       # signed side length
            side_a = self.cols.get(qx + d)    # square extending toward qx + d
            side_b = self.cols.get(qx - d)    # square extending toward qx - d
            if side_a:
                total += c * side_a.get(qy, 0) * side_a.get(py, 0)
            if side_b:
                total += c * side_b.get(qy, 0) * side_b.get(py, 0)
        return total
```

Two design notes worth saying aloud:

- Using the **signed** `d = py − qy` plus **both** `qx + d` and `qx − d` automatically covers squares above/below and left/right — all four orientations. Side equality is automatic because both looked-up corners reuse the *same* offset `d`.
- `P`, `H`, `D` are always at distinct coordinates (`d ≠ 0` guarantees `qx ± d ≠ qx`), so lookups never touch the column you're iterating.

## 7. Trace on the official example (optimal solution)

| Call | State of `cols` (x → {y: count}) | Computation | Return |
|---|---|---|---|
| `add [3,10]` | `3:{10:1}` | — | null |
| `add [11,2]` | `3:{10:1}`, `11:{2:1}` | — | null |
| `add [3,2]` | `3:{10:1, 2:1}`, `11:{2:1}` | — | null |
| `count [11,10]` | column 11 = `{2:1}` | `P=(11,2), c=1, d=−8`; side `qx+d=3`: `cnt(3,10)=1, cnt(3,2)=1 → 1·1·1=1`; side `qx−d=19`: absent → 0 | **1** ✅ |
| `count [14,8]` | column 14 empty | fast path | **0** ✅ |
| `add [11,2]` | `11:{2:2}` | — | null |
| `count [11,10]` | column 11 = `{2:2}` | `c=2, d=−8`; `2 · (1·1 + 0·0)` | **2** ✅ |

The jump from 1 → 2 is purely the multiplicity of `(11,2)` multiplying through — the product rule in action.

## 8. Alternative: dense 1001×1001 grid (Java/C++ friendly)

Because coordinates are bounded, you can replace hashing with a flat grid and enumerate **side lengths** directly:

```python
class DetectSquaresGrid:
    def __init__(self) -> None:
        self.grid = [[0] * 1001 for _ in range(1001)]   # grid[x][y] = multiplicity

    def add(self, point) -> None:
        x, y = point
        self.grid[x][y] += 1

    def count(self, point) -> int:
        qx, qy = point
        total = 0
        for d in range(1, 1001):                # side length, not a coordinate
            for py in (qy + d, qy - d):         # vertical partner above or below
                if not (0 <= py <= 1000):
                    continue
                c = self.grid[qx][py]
                if not c:
                    continue
                for hx in (qx + d, qx - d):     # square to either side
                    if 0 <= hx <= 1000:
                        total += c * self.grid[hx][qy] * self.grid[hx][py]
        return total
```

Same answers, O(1) `add`, fixed O(1001·2·2) work per `count`, ~4 MB of int32 memory. **Python gotcha:** omit the bounds checks and `self.grid[hx]` with `hx < 0` *silently wraps* to the array's end (negative indexing) — wrong answers, no exception. In Java it throws; in C++ it's undefined behavior.

## 9. Complexity table

| Design | `add` | `count` | Space | Verdict at n ≤ 3000 |
|---|---|---|---|---|
| Triples brute force | O(1) | O(n³) | O(n) | ≈ 4.5×10⁹ triples *per call* — rejected |
| Flat list + Counter, scan & filter same-x | O(1) | O(n) | O(n) | ≤ 9×10⁶ ops total — passes, but blunt |
| **Nested column map (chosen)** | **O(1)** | **O(min(n, 1001))** | **O(D)**, D = distinct points | ≤ ~3×10⁶ column entries scanned across *all* calls — comfortable |
| Dense 1001×1001 grid | O(1) | O(1001) fixed | O(1001²) ≈ 4 MB (int32) | comfortable; most natural in Java/C++ |

All hash operations are expected O(1) amortized. Total worst-case work ≈ 3000 calls × 1001 column entries × a handful of lookups each.

## 10. Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Not skipping `py == qy` | Stored copies at the query's own location produce zero-area "squares" | Require `d ≠ 0` — positive area is a stated constraint |
| Checking only one of `qx + d`, `qx − d` | Exactly half the squares missed (e.g., 2 instead of 4 in the four-orientation test) | Every column point spawns **two** candidate squares |
| Only considering partners "above" the query | Misses squares below/left | Signed `d = py − qy` + both sides covers all orientations |
| Storing a `set` of points | Official example returns 1 instead of 2 | Multiset: keep per-coordinate counts; **multiply** multiplicities |
| Anchoring on the wrong corner (loop all points, try pairing) | Same square counted 2–3×, or missed | Anchor = the unique non-`q` corner in `q`'s column → each square counted once (that uniqueness *is* the correctness proof) |
| Treating `q` as a stored point | Phantom ways, or confusion when `q` was never added | `q` is only a coordinate; the three chosen points come from the stream |
| 32-bit accumulation (Java/C++) | Answer can reach 10⁹; larger constraints would overflow outright | Accumulate in `long` / `long long` |
| Array variant without bounds checks | Python: silent negative-index wrap; Java: exception; C++: UB | Explicit `0 <= idx <= 1000` guards |
| `defaultdict` / `map::operator[]` on read paths | Phantom empty buckets; mutating a dict while iterating → `RuntimeError` | Use `.get` / `find` for reads; only `add` writes |
| Allowing `|dx| ≠ |dy|` (rectangle logic) | Wrong counts on rectangles like (0,0),(0,2),(4,0),(4,2) | Derive both other corners from one `d` — equality becomes structural |

## 11. Language gotchas (Java / C++, plus Python)

| Language | Gotcha |
|---|---|
| Java | Encode a point as one key: `long key = x * 1001L + y` in a `HashMap<Long, Integer>` (avoids nested maps and `Integer` boxing); or use `int[1001][1001]` (~4 MB, fine). Accumulate in `long`. |
| Java | Use `map.getOrDefault(y, 0)` — avoids a double lookup and unboxing NPEs from `Integer` nulls. |
| C++ | `unordered_map<pair<int,int>, int>` requires a custom hash — sidestep by encoding `x * 1001 + y` (max 1,002,000, fits `int`), or nest `unordered_map<int, unordered_map<int,int>>`; accumulate in `long long`. |
| C++ | `operator[]` on a read path *inserts* zero entries (same behavior as Python's `defaultdict` indexing) — use `find()` in `count()`. |
| Python | Read via `.get` (no phantom keys, no mutation-during-iteration); if you use the grid, remember negative indices wrap silently. |

## 12. Test cases to propose out loud

| # | Ops (abbreviated) | Expected | What it validates |
|---|---|---|---|
| 1 | Official Example 1 | `[null, null, null, null, 1, 0, null, 2]` | End-to-end correctness, duplicates |
| 2 | `count([5,5])` on an empty structure | `0` | Fast path; no special-casing |
| 3 | `add (5,5)×2, (5,7), (7,5), (7,7)`; `count (5,5)` | `1` | Stored copies **of the query itself** are ignored (`d = 0`) |
| 4 | `q=(5,5)`; add `(5,7),(7,5),(7,7),(5,3),(3,5),(3,3)`; `count` | `4` | All four orientations; ±d × ±side |
| 5 | `add (5,7)×2, (7,5), (7,7)`; `count (5,5)` | `2` | Product rule applied to the anchor corner itself |
| 6 | `add (0,2),(4,0),(4,2)`; `count (0,0)` | `0` | A 4×2 **rectangle** is not a square |
| 7 | ~1000 adds at each of `(0,1),(1,0),(1,1)`; `count (0,0)` | `10⁹` (strictly within the 3000-call budget: 999 each → 997,002,999) | Magnitude / 64-bit habit; timing headroom |
| 8 | `q=(0,0)`: add `(0,5),(5,0),(5,5)` → `1`; mirror at `q=(1000,1000)` | `1` | Boundary coordinates; out-of-range lookups (`qx ± d < 0` or `> 1000`) must be 0, not crash or wrap |

Pitch these *before* coding ("I'd test: count on empty, a query that is itself a stored point, all four square orientations, a rectangle near-miss, and boundary coordinates 0 and 1000") — it signals edge-case discipline.

## 13. Fuller interview talk track

> **Restate (20s):** "So `count(q)` returns the number of ways to pick three stored *occurrences* such that they plus `q` are the four corners of an axis-aligned square. Duplicates are distinct copies, so the answer counts index-triples, not coordinate sets — two copies of a corner double the ways. The query itself needn't be stored, and positive area means a stored point equal to `q` is unusable."
>
> **Brute force (15s):** "Naively: try all triples — C(3000,3) ≈ 4.5 billion per query, dead end. But the query is a *corner*, which is much stronger."
>
> **Insight (30s):** "If I have the query plus one stored point sharing its x-coordinate, the side length is forced, and the square is one of exactly two — extend left or right. And every square through the query has exactly one such vertical partner, so scanning the query's column counts each square exactly once."
>
> **Algorithm (30s):** "Nested map: x, then y, storing multiplicities. `add` increments. `count`: for each column point with y ≠ qy, set d = py − qy, look up `(qx±d, qy)` and `(qx±d, py)` in both directions, multiply the three multiplicities, sum. Signed d plus both sides covers all four orientations."
>
> **Complexity & safety (20s):** "`add` O(1). `count` scans only the column: O(min(n, 1001)) since y takes 1001 values. Space is O(distinct points). Duplicates handled by multiplication. In Java or C++ I'd accumulate in a `long` — the answer can reach 10⁹ — and encode coordinates as one map key."
>
> **Tests (15s):** "Official example; empty structure; query equals a stored point; all four orientations; a rectangle near-miss; coordinates at 0 and 1000."

## 14. Transferable patterns & related problems

| Problem | Shared move |
|---|---|
| LC 1 Two Sum | Fix one element, hash-ask for the complement — the same "derive the rest, look it up" |
| LC 447 Number of Boomerangs | Pivot point + bucket by distance; multiplicity products (`m·(m−1)`) |
| LC 939 Minimum Area Rectangle | Fix a diagonal pair, look up the other two corners in a set |
| LC 750 Count Corner Rectangles | Fix two rows, count shared columns → C(c,2) products over multiplicities |
| LC 149 Max Points on a Line | Anchor point + normalized key (slope) + bucket counting |

Principles to carry forward:

1. **Enumerate the minimal *determining* set; derive and look up the rest.** Here: query corner + side length determines everything. Don't enumerate what you can look up.
2. **Multiplicities multiply.** With duplicates, ways are counted over occurrences — use the product rule, never dedupe.
3. **Bucket by one coordinate** to shrink the search space from "all points" to "one column."
4. **Pick the anchor that makes each counted object appear exactly once** — the uniqueness argument *is* your correctness proof.
5. **Mine constraints for magnitude bounds** (10⁹ here) to choose arrays vs. maps and int vs. long.

**Follow-up variants (be ready, one line each):** coordinates up to 10⁹ → identical solution, the dense grid dies but the map doesn't; support `remove` → decrement counts and drop zero entries so scans stay tight; if the query were the square's *center* instead of a corner, the anchor becomes a diagonal pair — enumerate one diagonal corner and look up its opposite, then multiply.

## 15. Say it in 60 seconds

> "Three facts drive everything. One: the query point is a corner, and any axis-aligned square through it has exactly one *other* corner in its column — so scanning that column counts every square exactly once. Two: one column point fixes the side length `d`, which forces the other two corners — `(qx±d, qy)` and `(qx±d, py)` — and I check both left and right. Three: duplicates are distinct occurrences, so I store multiplicities and multiply the three corner counts — the product rule. I skip points at the query's own y, since that's zero area. Data structure: a nested hash map, x then y, with counts. `add` is O(1). `count` is O(min(n, 1001)) because y only takes 1001 values — roughly three million operations across all 3000 calls, space linear in distinct points. In Java or C++ I'd accumulate in a long — answers reach 10⁹ — and encode `x·1001 + y` as a single map key."
