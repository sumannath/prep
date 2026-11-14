### Problem

Merge all overlapping intervals and return the result sorted by start.

### Interview refresher

Sort by start, then sweep: if the interval starts at or before the last merged end, set that end to `max(last_end, end)`; otherwise append a new interval. Sorting makes this correct because once an interval starts past the current block’s end, every later interval does too, so you only ever compare with the last block. O(n log n). The trap is assigning the new end instead of the max, which breaks on contained intervals; always test `[[1,10],[2,3]]`. Ask whether touching intervals merge. For team free time, merge everyone’s busy intervals and keep gaps of at least 30 minutes.

### Hints

1. Sort by start.
2. Extend the last merged interval with max(), not with the new end.

### Approach

Sort, then sweep: if the next start is ≤ the current end, extend the end to the max of both; otherwise start a new interval.

### Deep dive

#### What the interviewer is really testing

Whether you can justify *why* sorting makes a greedy sweep correct, and whether you avoid the one-word bug.

#### Without sorting

You’d compare every interval with every other and repeat until nothing changes: O(n²) or worse, and messy.

#### Why sorting by start makes it easy

Once sorted by start, any interval overlapping the block you’re building must come before any that doesn’t. Starts only increase, so once an interval starts after the current block ends, every later interval starts even later. The current block is finished. That’s why you only ever compare with the *last* merged interval.

#### Why `max()` on the end

```text
sorted: [1,10] [2,3]
merge [2,3] into [1,10]
  end = 3          → [1,3]   wrong, lost 4..10
  end = max(10,3)  → [1,10]  right
```

A short interval inside a long one would shrink the block. This is the most common bug here; write the contained case as a test.

#### Touching intervals

Should `[1,2]` and `[2,3]` merge? With `start <= end` they do. For meetings, back-to-back slots usually *shouldn’t* count as overlapping. Ask.

#### Cost

Sorting is O(n log n); the sweep is O(n). Sorting dominates.

### Reference solution

```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    out: list[list[int]] = []
    for start, end in sorted(intervals, key=lambda x: x[0]):
        if out and start <= out[-1][1]:
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out


assert merge([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]
assert merge([[1, 10], [2, 3]]) == [[1, 10]]      # fully contained
```

**Time:** O(n log n)  
**Space:** O(n)

### Questions to ask before coding

- Should intervals that only touch, like [1,2] and [2,3], merge?
- Is the input already sorted?
- May I sort the input in place, or should I leave it untouched?
- Are intervals closed or half-open?

### Interview walkthrough

**Interviewer:** Merge overlapping intervals.

**You:** Should touching intervals like 1–2 and 2–3 merge? For calendar slots I’d expect not; for numeric ranges I’d expect yes.

**Interviewer:** Merge them.

**You:** Is the input sorted, and is it fine to sort a copy?

**Interviewer:** Not sorted. A copy is fine.

**You:** Plan: sort by start, then sweep. If the next interval starts at or before the last merged end, extend that end to the larger of the two; otherwise start a new block. Sorting guarantees that once an interval starts past the current end, nothing later can overlap the current block. n log n overall.

**You:** I’m using max for the end, because a short interval inside a long one mustn’t shrink it. Testing that explicitly: 1–10 and 2–3 gives 1–10.

> *Why this works:* Volunteering the contained-interval test before the interviewer asks is an easy way to show care.

**Interviewer:** Given everyone’s busy times, find 30-minute free slots for the team.

**You:** Within working hours, in one time zone? Then I merge everyone’s busy intervals into one list and look at the gaps between consecutive merged blocks, plus before the first and after the last, keeping gaps of at least 30 minutes.

### Scale-up follow-up

**Interviewer adds:** “Given everyone's busy calendars, find free slots of at least 30 minutes for the whole team.”

Flatten all busy intervals, merge them, then scan the gaps between consecutive merged intervals inside working hours and keep gaps ≥ 30 minutes.

### Where candidates slip

- out[-1][1] = end instead of max(...) — breaks on contained intervals.
- Mutating the caller's list in place without saying so.
