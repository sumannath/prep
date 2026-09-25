# Time Based Key-Value Store — Complete DSA Lesson

## 1. Problem Restatement

Design a class `TimeMap` supporting:

- `set(key, value, timestamp)` — store `value` under `key` at time `timestamp`.
- `get(key, timestamp)` — return the value associated with `key` at the **largest timestamp ≤ the query timestamp**. If no such entry exists (no `set` ever happened at or before that time), return `""`.

This is a classic "point-in-time snapshot lookup" problem: think of it as a versioned dictionary, like `git blame` or a database's temporal table.

**Key observations from the problem statement:**
- Each key can hold **many** (value, timestamp) pairs.
- `get` must find the value at the **floor timestamp** — the greatest stored timestamp that does not exceed the query.
- The **timestamps of `set` calls are strictly increasing** (globally, across all keys). This is a huge gift — exploit it.

---

## 2. Decoding the Constraints

| Constraint | What it tells us |
|---|---|
| `1 <= key.length, value.length <= 100` | Values are short strings; storing duplicates is cheap. No memory pressure from a single entry. |
| `1 <= timestamp <= 10^7` | Timestamps fit comfortably in a 32-bit int — no overflow concerns. But **don't** try an array indexed by timestamp naively per key (10⁷ entries × many keys = too much memory). |
| Timestamps of `set` are **strictly increasing** | The per-key list of timestamps is automatically **sorted**. This enables binary search on `get`. No sorting needed at query time. |
| At most `2 × 10⁵` calls total | We need roughly `O(log n)` per `get` (or better). Even `O(n)` per `get` could pass in Python only marginally (2×10⁵ × 10⁵ worst case = 2×10¹⁰ — too slow, so binary search is effectively required). |

**Strictly increasing timestamps** also means: no duplicate timestamps per key, so binary search has an unambiguous answer and we never need tie-breaking logic.

---

## 3. Brute Force

Store everything, scan linearly on `get`.

```python
class TimeMap:
    def __init__(self):
        self.store = {}  # key -> list of (timestamp, value)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.store.setdefault(key, []).append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        best = ""
        for ts, val in self.store.get(key, []):
            if ts <= timestamp:
                best = val  # timestamps are inserted in increasing order,
                            # so the LAST match is the largest
        return best
```

### Worked Trace (Example 1)

| Operation | Store state after | Result |
|---|---|---|
| `set("foo","bar",1)` | `foo: [(1,"bar")]` | — |
| `get("foo",1)` | scan: `1 ≤ 1` ✓ → best = `"bar"` | `"bar"` |
| `get("foo",3)` | scan: `1 ≤ 3` ✓ → best = `"bar"` | `"bar"` |
| `set("foo","bar2",4)` | `foo: [(1,"bar"),(4,"bar2")]` | — |
| `get("foo",4)` | scan: both ≤ 4 → last is `(4,"bar2")` | `"bar2"` |
| `get("foo",5)` | scan: both ≤ 5 → last is `(4,"bar2")` | `"bar2"` |

Correct, but each `get` is `O(n)` over that key's entries. With 10⁵ entries per key and 10⁵ gets, that's up to ~10¹⁰ comparisons — too slow.

---

## 4. Core Insight

> **Because `set` timestamps are strictly increasing, each key's entries form a sorted list of timestamps. "Largest timestamp ≤ query" on a sorted array is exactly the "rightmost insertion point" binary search (`bisect_right` / `lower_bound`).**

Two facts make this clean:

1. **The timestamps are unique and sorted** → binary search is well-defined; `bisect_right(ts_list, t) - 1` gives the index of the largest stored timestamp `≤ t`, or `-1` if none exists.
2. **Ties between timestamp and value never need care** — since timestamps are unique per the constraint, the element *at* `bisect_right - 1` is either strictly less than `t` or equal to `t`; either way it's the correct floor.

Design decision: store per key **two parallel arrays** (`timestamps`, `values`) rather than a list of tuples — `bisect` then works directly on the int array without extracting a key function.

---

## 5. Optimal Approach: Hash Map + Binary Search

### Structure

```
store: HashMap<String, Pair<List<Integer> timestamps, List<String> values>>
```

### Python Implementation

```python
from collections import defaultdict
from bisect import bisect_right

class TimeMap:
    def __init__(self):
        # key -> [timestamps list, values list], kept in lockstep
        self.times = defaultdict(list)
        self.vals = defaultdict(list)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.times[key].append(timestamp)
        self.vals[key].append(value)

    def get(self, key: str, timestamp: int) -> str:
        if key not in self.times:
            return ""
        ts = self.times[key]
        i = bisect_right(ts, timestamp) - 1   # index of largest ts <= timestamp
        return self.vals[key][i] if i >= 0 else ""
```

`bisect_right(ts, timestamp)` returns the insertion point **after** any existing entry equal to `timestamp`. Subtracting 1 lands on:
- the entry **equal** to the query timestamp (exact match), or
- the entry with the **largest timestamp <** query, or
- index `-1` if every stored timestamp is greater (answer is `""`).

### Manual Binary-Search Trace (writing `bisect` by hand, to show understanding)

Query: `get("foo", 5)` on `timestamps = [1, 4]`, `values = ["bar", "bar2"]`.

| Step | lo | hi | mid | ts[mid] vs 5 | Action |
|---|---|---|---|---|---|
| 1 | 0 | 2 | 1 | 4 ≤ 5 → candidate at index 1, go right | `lo = 2` |
| loop ends (`lo == hi`) | | | | | answer index = `lo - 1 = 1` |

`values[1] = "bar2"` ✓

Query: `get("foo", 0)` on `timestamps = [1, 4]`:

| Step | lo | hi | mid | ts[mid] vs 0 | Action |
|---|---|---|---|---|---|
| 1 | 0 | 2 | 1 | 4 > 0 | `hi = 1` |
| 2 | 0 | 1 | 0 | 1 > 0 | `hi = 0` |
| loop ends | `lo = 0` | | | | answer index = `-1` → return `""` ✓ |

### Equivalent Java / C++ Notes

```java
class TimeMap {
    private Map<String, List<Integer>> times = new HashMap<>();
    private Map<String, List<String>> vals = new HashMap<>();

    public void set(String key, String value, int timestamp) {
        times.computeIfAbsent(key, k -> new ArrayList<>()).add(timestamp);
        vals.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
    }

    public String get(String key, int timestamp) {
        if (!times.containsKey(key)) return "";
        List<Integer> ts = times.get(key);
        int lo = 0, hi = ts.size();           // half-open [lo, hi)
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;        # avoid int overflow; low bits of sum
            if (ts.get(mid) <= timestamp) lo = mid + 1;
            else hi = mid;
        }
        return lo == 0 ? "" : vals.get(key).get(lo - 1);
    }
}
```

| Language | Gotcha |
|---|---|
| **Java** | Use `Collections.binarySearch` with a fallback, or hand-roll with `lo < hi` half-open bounds. If using `Collections.binarySearch` on an `ArrayList<Integer>`, remember it returns `-(insertionPoint) - 1` when not found — easy to mis-decode. Also `mid = (lo + hi) >>> 1` avoids int overflow (timestamps ≤ 10⁷ won't overflow with list sizes here, but it's a free habit). |
| **C++** | `std::upper_bound(ts.begin(), ts.end(), timestamp)` returns an iterator to the first element **>** timestamp; subtract `1` and compare against `begin()` for the empty case. Don't confuse it with `lower_bound` (first element **≥**) — here both give the same answer index only because timestamps are unique, but `upper_bound` is the conceptually correct match for "bisect_right". |
| **Python** | `bisect_right` on the timestamps list; `bisect_left` would also work here only because timestamps are unique — safer to use `bisect_right` so the idiom holds if duplicates ever appear. `defaultdict` avoids explicit membership checks in `set`, but you still must guard `get` against missing keys (or use the index-check pattern shown). |

---

## 6. Complexity

Let `n` = number of `set` calls total, `k` = entries for the queried key.

| Operation | Time | Space |
|---|---|---|
| `set` | `O(1)` amortized (list append; hash insert) | — |
| `get` | `O(log k)` binary search | — |
| Overall | `O(n log n)` worst case (all gets on the biggest key) | `O(n)` for all stored pairs |

The binary search's `O(log k)` is the comparison-model lower bound for searching a sorted array of `k` items — each comparison yields at most one bit of "which half" information, so Ω(log k) comparisons are needed in the worst case; our solution meets it.

---

## 7. Common Mistakes

1. **Using `bisect_left` and mishandling the "exact match" case.** With unique timestamps they coincide, but `bisect_right(..., t) - 1` is the robust idiom for "floor".
2. **Forgetting the `i >= 0` / `lo == 0` guard** → `IndexError` (Python) or negative index (C++ UB / Java exception) when the query timestamp precedes all stored entries.
3. **Searching the values instead of the timestamps.** Binary search requires the searched array to be the sorted one — that's the timestamps list. Never bisect over values (they're arbitrary strings).
4. **Off-by-one in hand-rolled search:** mixing `[lo, hi]` closed with `hi = mid` and vice versa causes infinite loops or skipped elements. Pick half-open `[lo, hi)` with `hi = mid` / `lo = mid + 1` consistently.
5. **Assuming `get` returns the value *at* the timestamp** rather than the **most recent value at-or-before** it — re-read Example 1's `get("foo", 3)` if unsure.
6. **Parallel arrays drifting out of sync** (Python: appending to `times` but not `vals`; Java: two maps updated non-atomically). Append both together, always.

---

## 8. Test Cases to Propose Out Loud

Before coding, mention these:

1. **Official Example 1** — as traced above; covers exact-match get, gap get (`ts=3`), and get-after-later-set.
2. **Query before all entries:** `set("a","x",5); get("a",3)` → `""` (tests the `i >= 0` guard).
3. **Unknown key:** `get("missing", 100)` → `""` (tests missing-key handling, no exception).
4. **Single entry, exact hit and miss:** `set("k","v",1); get("k",1)` → `"v"`; `get("k",2)` → `"v"`; `get("k",0)` → `""`.
5. **Multiple keys interleaved:** timestamps are globally increasing but each key only sees its own subsequence — e.g. `set("a","1",1); set("b","2",2); set("a","3",3); get("a",2)` → `"1"` (not `"3"`), proving per-key independence.
6. **Boundary at `timestamp = 1`** (minimum allowed) and a query at a very large timestamp (10⁷) after one set — should return that single value.

---

## 9. Transferable Patterns & Related Problems

- **Pattern: "sorted list per bucket + floor/ceiling query."** Whenever operations arrive in a monotone order and queries ask for "latest ≤ t", map buckets (keys) to sorted lists and binary search. Generalizes to: versioned configs, feature-flag lookups at time T, rate-limiter window search.
- **Pattern: hash map as directory + per-bucket structure.** The hash map gives `O(1)` dispatch to the right bucket; the real algorithmic work is inside the bucket. This two-layer design appears everywhere (LSM indexes, inverted indexes, interval maps).
- **Follow-up variants interviewers love:**
  - If timestamps were **not** strictly increasing: keep the same structure but sort each key's list (or build once) — `set` degrades to `O(1)` append + one-time `O(n log n)` sort.
  - If you needed **delete-at-time** or **range queries over time**, you'd move to a balanced BST / `TreeMap` (Java) or `sortedcontainers.SortedList` — `floorEntry` in Java's `TreeMap` solves this directly in `O(log k)`.
- **Related problems:**
  - LC 981 *Time Based Key-Value Store* (this one)
  - LC 1146 *Snapshot Array* (versioned array; same "floor timestamp" idea with binary search over per-index histories)
  - LC 352 *Data Stream as Disjoint Intervals* (streaming order exploitation)
  - LC 715 *Range Module* (interval bookkeeping)
  - LC 350 / 34 — binary search on sorted arrays, "rightmost ≤ x" idiom practice.

---

## 10. Say It in 60 Seconds

> "This is a versioned dictionary: each key holds multiple values at different timestamps, and `get` returns the value at the largest timestamp at-or-before the query. The key insight is the constraint that `set` timestamps are strictly increasing — that means each key's timestamps are already sorted, so I can hash each key to a pair of parallel lists and binary search on the timestamp list. On `get`, I run an upper-bound search for the query timestamp, step back one index, and return the value there — or empty string if the index is negative, which happens when the query predates every entry. `set` is O(1) append; `get` is O(log k); total space O(n) over all stored pairs. Edge cases I'd test: query before the first entry, query for a missing key, and an exact timestamp match — all handled by the `bisect_right minus one, guard for negative index` idiom. If timestamps weren't increasing, I'd sort each key's list once, or use a TreeMap for dynamic updates."

**Recite structure:** restate → constraint gift (sorted timestamps) → hash map + parallel arrays → `bisect_right - 1` with the negative-index guard → complexities → edge cases → follow-up (unsorted timestamps / TreeMap).
