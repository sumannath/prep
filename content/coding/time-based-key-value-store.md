### Problem

`set(key, value, timestamp)` and `get(key, timestamp)`, which returns the value with the largest timestamp ≤ the query, or `""`.

### Interview refresher

Per key, keep parallel lists of timestamps and values; timestamps arrive increasing, so they’re already sorted. `set` appends in O(1). `get` does `i = bisect_right(times, t)` and returns `values[i-1]` if `i` else an empty string. `bisect_right` places `i` after any equal timestamp, so exact matches are included; `bisect_left` is the off-by-one. Read with `.get(key, [])` so misses don’t create entries. Get is O(log n). If timestamps can arrive out of order, use `insort` or a sorted container, or insert by scanning back from the end when records are only slightly late.

### Hints

1. Timestamps for a key arrive increasing, so each key's list is already sorted.
2. bisect_right finds the first timestamp greater than the query; step back one.

### Approach

Per key, parallel lists of timestamps and values. Binary search on read.

### Deep dive

#### What the interviewer is really testing

Recognising “latest value at or before time t” as a binary search, and getting the boundary exactly right.

#### Shape of the data

For each key you get a sequence of (timestamp, value). Timestamps for a key arrive in increasing order, so each key’s list is already sorted at no cost.

#### From scan to binary search

For `get(key, t)` you want the last entry with timestamp ≤ t. Scanning backwards works but is O(n). Because the list is sorted, binary search finds the boundary in O(log n).

#### Why `bisect_right`, and why `i - 1`

`bisect_right(ts, t)` returns where t would be inserted *after* any equal values. Everything before that position is ≤ t, so `i - 1` is the last timestamp ≤ t. If `i` is 0, nothing is early enough: return an empty string.

```text
ts = [1, 4]
get(3): bisect_right → 1 → ts[0]=1 → "open"
get(4): bisect_right → 2 → ts[1]=4 → "done"
        (bisect_left gives 1 → ts[0] → wrong)
get(0): bisect_right → 0 → ""
```

#### Why two parallel lists

If you bisect on `(timestamp, value)` tuples, Python compares values when timestamps tie, which can fail or misbehave. Separate lists keep the search purely on numbers.

#### Why `.get(key, [])` on read

Reading `self.times[key]` on a defaultdict creates an empty entry for every miss; over time misses would quietly fill memory.

#### Where this shows up

Wiki page history, ticket field history and versioned key-value stores all answer “what was this at time t?”. Making that connection helps with the persistence follow-up.

### Reference solution

```python
import bisect
from collections import defaultdict


class TimeMap:
    def __init__(self):
        self.times = defaultdict(list)
        self.values = defaultdict(list)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.times[key].append(timestamp)
        self.values[key].append(value)

    def get(self, key: str, timestamp: int) -> str:
        ts = self.times.get(key, [])
        i = bisect.bisect_right(ts, timestamp)
        return self.values[key][i - 1] if i else ""


t = TimeMap()
t.set("issue", "open", 1); t.set("issue", "done", 4)
assert (t.get("issue", 3), t.get("issue", 5), t.get("issue", 0)) == ("open", "done", "")
```

**Time:** set O(1), get O(log n)  
**Space:** O(total sets)

### Questions to ask before coding

- Are timestamps for a key always increasing?
- What should `get` return if nothing is early enough?
- Is there a retention limit on old versions?
- Does this need to survive restarts?

### Interview walkthrough

**Interviewer:** Store values with timestamps. Get returns the value at the latest timestamp not after the one asked for.

**You:** Are timestamps for a given key always set in increasing order?

**Interviewer:** Yes.

**You:** Then each key’s timestamps are already sorted, and get is a predecessor search: binary search for the last timestamp less than or equal to the query. Set is an append, constant time; get is logarithmic.

**You:** I’ll use `bisect_right`: it returns the first position with a timestamp strictly greater than the query, so the one before it is the answer, and exact matches are included.

> *Why this works:* Say which bisect variant and why. Off-by-one on the boundary is the classic mistake here, and naming it pre-empts the probe.

**You:** Tests: open at 1, done at 4. Query 3 gives open, 5 gives done, 0 gives empty, and exactly 4 gives done.

**Interviewer:** Timestamps might arrive out of order now.

**You:** Then I insert in sorted position. With a plain list that’s linear per insert; if writes are frequent I’d use a sorted container for logarithmic inserts. How out of order are they: a few seconds late, or arbitrary?

**Interviewer:** Usually a few seconds.

**You:** Then most inserts land near the end, so inserting by scanning back from the end is nearly constant in practice. I’d keep the list.

### Scale-up follow-up

**Interviewer adds:** “Timestamps can arrive out of order” or “old versions should expire.”

Out of order: use `bisect.insort` on a list of `(ts, value)` tuples (O(n) insert) or a balanced tree / SortedList (O(log n)). Expiry: since lists are sorted, trim the prefix older than the retention window on write.

### Where candidates slip

- Using bisect_left and returning the wrong value when the timestamp matches exactly.
- Creating empty entries in a defaultdict on every miss.
