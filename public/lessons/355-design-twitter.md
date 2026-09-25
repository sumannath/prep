# Design Twitter (LeetCode 355) — Full Interview Lesson

## 1. The problem in my own words

Build an in-memory Twitter with four operations:

- `postTweet(userId, tweetId)` — a user publishes a tweet. Tweet IDs are **unique**, but *not* necessarily increasing over time.
- `getNewsFeed(userId)` — return the **10 most recent** tweet IDs (fewer if fewer exist) posted by `userId` **or by anyone `userId` currently follows**, newest first.
- `follow(followerId, followeeId)` / `unfollow(followerId, followeeId)` — maintain the follow graph.

**What the interviewer is really testing:** whether you notice that (a) tweet ID ≠ recency, so you must invent an ordering, and (b) "top-10 across many users" is the classic **k-way merge** pattern, not "collect everything and sort." It looks like an OOP design problem but it's a heap problem wearing a design costume.

**Two semantic details to confirm out loud before coding** (both are implied by the statement and the example):

1. The feed reflects the **current** follow set at read time. After `unfollow(1, 2)`, user 2's tweets — even ones already posted — vanish from user 1's next feed. Conversely, following someone retroactively surfaces **all** of their past tweets.
2. The user's **own tweets are always included**, regardless of who they follow (they can't follow themselves, so you must add self explicitly).

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `userId, followerId, followeeId ≤ 500` | Tiny, bounded user population. A feed merges at most **F = 1 + 499 = 500** sorted streams (self + 499 followees). This is what makes merge-on-read cheap. Also means arrays of size 501 would work, though dicts generalize better. |
| `tweetId ≤ 10^4`, all unique | IDs are **labels, not order**. Unique-ness means you never need to dedupe tweets; it says *nothing* about posting order. This is the trap. |
| ≤ 3 × 10⁴ total calls | Linear-time-per-op solutions are trivially fine. A `getNewsFeed` that sorts *all* tweets of all followed users can cost ~10⁹ operations across an adversarial workload — too slow. |
| "A user cannot follow himself" | A guarantee, not something to rely on. A one-line guard is cheap defensiveness. Your code must still explicitly include the user's own tweets. |
| `follow`/`unfollow` may name users who never posted | Data structures must tolerate unknown IDs gracefully (sets/dicts do; `.remove()` on a missing key does not). |

---

## 3. Warm-up: brute force (collect-and-sort), with a worked trace

**Idea:** keep one list per user of `(time, tweetId)`; on `getNewsFeed`, gather **every** tweet from the author set, sort by time descending, take 10.

```python
class TwitterBrute:
    def __init__(self):
        self.clock = 0
        self.tweets = defaultdict(list)    # userId -> [(time, tweetId), ...]
        self.followees = defaultdict(set)

    def postTweet(self, userId, tweetId):
        self.clock += 1
        self.tweets[userId].append((self.clock, tweetId))

    def getNewsFeed(self, userId):
        authors = self.followees[userId] | {userId}
        pool = []
        for u in authors:
            pool.extend(self.tweets.get(u, []))          # ALL tweets — the problem
        pool.sort(key=lambda p: p[0], reverse=True)      # O(K log K)
        return [tid for _, tid in pool[:10]]

    def follow(self, followerId, followeeId):
        if followerId != followeeId:
            self.followees[followerId].add(followeeId)

    def unfollow(self, followerId, followeeId):
        self.followees[followerId].discard(followeeId)
```

**Trace on the official example.** `time` is the global counter incremented on each `postTweet`.

| Call | State after the call | Brute-force `getNewsFeed` work |
|---|---|---|
| `postTweet(1, 5)` | clock=1; tweets={1:[(1,5)]} | — |
| `getNewsFeed(1)` | — | authors={1}; pool=[(1,5)]; sorted → [(1,5)] → **[5]** ✓ |
| `follow(1, 2)` | followees[1]={2} | — |
| `postTweet(2, 6)` | clock=2; tweets[2]=[(2,6)] | — |
| `getNewsFeed(1)` | — | authors={1,2}; pool=[(1,5),(2,6)]; sorted desc → **[6,5]** ✓ |
| `unfollow(1, 2)` | followees[1]={} | — |
| `getNewsFeed(1)` | — | authors={1}; pool=[(1,5)] → **[5]** ✓ |

Correct, but: with ~1.5×10⁴ posts and ~1.5×10⁴ feeds for one user following 499 prolific authors, each feed gathers and sorts up to ~1.5×10⁴ tweets → roughly **3 × 10⁹ comparisons** total. That's minutes in Python and seconds-plus even in C++. The gather step alone touches K items per feed even before sorting.

---

## 4. The core insights

**Insight 1 — tweetId is identity, not time.** The problem never says tweet IDs arrive in increasing order. `postTweet(1, 100)` followed by `postTweet(1, 1)` must produce feed `[1, 100]`. So maintain a **logical clock**: an integer you increment on every `postTweet`. It's strictly increasing, tie-free, and deterministic (unlike `time.time()`, which can collide within a tick).

**Insight 2 — per-user timelines are already sorted; don't un-sort and re-sort them.** Because we append to each user's list in increasing clock order, `tweets[u]` is sorted by construction. `getNewsFeed` is then: *"merge up to 500 sorted lists and take the top 10"* — the **k-way merge**. Never materialize the union.

**Insight 3 — the cap prunes.** Since the feed holds only 10 tweets, any single author contributes at most 10 — so an author's 11th-oldest-and-older tweets can never appear. This both bounds the merge (10 pop/pushes) and enables a simpler "last 10 per author + one sort" fallback (Section 10).

---

## 5. Optimal design: data structures and invariants

| Structure | Choice | Invariant it maintains |
|---|---|---|
| Timelines | `dict[int, list[(time, tweetId)]]` (defaultdict) | Times **strictly increasing** per user (append-only + monotonic clock) |
| Follow graph | `dict[int, set[int]]` follower → followees | Sets ⇒ no duplicate follows, O(1) add/remove, no self-follow |
| Clock | `int` counter | Always greater than every stored time ⇒ **no ties ever** |

Three different integers coexist — keep them straight:

- **`time`** — ordering key (invented by you).
- **`tweetId`** — the payload you return (given by caller).
- **`idx`** — a position *into* a user's timeline list (heap bookkeeping).

---

## 6. `getNewsFeed` as a k-way merge

1. Compute the author set: `followees[userId] ∪ {userId}`.
2. **Seed** a max-heap with each author's **newest** tweet: entry `(-time, userId, idx)` where `idx = len(timeline) - 1`. (Python's `heapq` is a min-heap → negate the time.) Skip authors with empty timelines.
3. `heapify` — O(F).
4. Repeat up to 10 times, while the heap is non-empty:
   - Pop the max `(-t, u, idx)`; **emit** `tweets[u][idx][1]` (the tweetId at that index — the value, not the index).
   - Push `(-t', u, idx - 1)` for that same user's next-older tweet, if `idx - 1 >= 0`.

**Why it's correct (exchange argument, 3 sentences):** Invariant — the heap always holds, for every author with un-emitted tweets, exactly their newest un-emitted tweet ("the frontier"). Any un-emitted tweet not in the heap is older than its author's frontier. Therefore the globally newest un-emitted tweet is the max of the frontier; popping it and pushing its predecessor restores the invariant. By induction the first 10 pops are the 10 newest tweets overall.

**Complexity claim with justification:** extracting the m newest from k sorted lists requires Ω(m log k) comparisons — each output must be identified as the winner among ≤ k frontier candidates, and distinguishing k possibilities carries log₂ k bits — so the frontier heap is optimal up to constants for the extraction phase; the O(F) seeding is also unavoidable, since any of the F authors might own the newest tweet and must be checked at least once. (`heapify` itself is O(F), not O(F log F): bottom-up build does work that sums across levels to O(F).)

---

## 7. Reference implementation (Python)

```python
import heapq
from collections import defaultdict
from typing import List


class Twitter:
    def __init__(self):
        self.clock = 0                     # logical timestamp; strictly increasing
        self.tweets = defaultdict(list)    # userId -> [(time, tweetId), ...], time ascending
        self.followees = defaultdict(set)  # followerId -> set of users they follow

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.clock += 1
        self.tweets[userId].append((self.clock, tweetId))   # stays sorted by time

    def getNewsFeed(self, userId: int) -> List[int]:
        # Author set = the user themself + everyone they currently follow.
        # `|` builds a NEW set. Never write `self.followees[userId].add(userId)` —
        # that would corrupt persistent state (user permanently "follows" themself).
        authors = self.followees[userId] | {userId}

        heap = []                          # seed: each author's newest tweet
        for u in authors:
            timeline = self.tweets.get(u)  # .get: followee may never have posted
            if timeline:
                t, _ = timeline[-1]
                heap.append((-t, u, len(timeline) - 1))     # negate: heapq is a min-heap
        heapq.heapify(heap)                                 # O(F)

        feed = []
        while heap and len(feed) < 10:                      # BOTH guards matter
            _, u, idx = heapq.heappop(heap)
            feed.append(self.tweets[u][idx][1])             # the tweetId value at idx
            if idx > 0:
                t, _ = self.tweets[u][idx - 1]
                heapq.heappush(heap, (-t, u, idx - 1))      # advance this author's pointer
        return feed

    def follow(self, followerId: int, followeeId: int) -> None:
        if followerId != followeeId:       # defensive; constraints promise this
            self.followees[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.followees[followerId].discard(followeeId)      # discard: safe no-op if absent
```

Note that `getNewsFeed` mutates **no** persistent state — feeds are pure reads computed from the current follow graph, which is exactly why follow/unfollow take effect "retroactively" for free.

---

## 8. Traces

### 8.1 Official Example 1 through the optimal code

| Call | Heap seeds (as `(-t, u, idx)`) | Pops → emitted | Returned |
|---|---|---|---|
| `postTweet(1,5)` → `getNewsFeed(1)` | `(-1, 1, 0)` | pop `(-1,1,0)` → emit 5; idx−1 = −1, no push; heap empty | `[5]` ✓ |
| `follow(1,2)`, `postTweet(2,6)` → `getNewsFeed(1)` | `(-2, 2, 0)`, `(-1, 1, 0)` | pop `(-2,2,0)` → emit **6** (user 2 exhausted); pop `(-1,1,0)` → emit **5** | `[6, 5]` ✓ |
| `unfollow(1,2)` → `getNewsFeed(1)` | `(-1, 1, 0)` (authors = {1} only now) | emit 5 | `[5]` ✓ |

### 8.2 Interleaving stress trace (this is where pointer bugs surface)

Setup: `postTweet(1,101)`→t=1, `postTweet(2,202)`→t=2, `postTweet(1,102)`→t=3, `postTweet(2,203)`→t=4, `postTweet(1,104)`→t=5; then `follow(1,2)`, `getNewsFeed(1)`.
Timelines: user 1 = `[(1,101),(3,102),(5,104)]`, user 2 = `[(2,202),(4,203)]`.

| Step | Heap (shown as `-t, u, idx`) | Emit | Push next | Feed so far |
|---|---|---|---|---|
| seed | `(-5,1,2)`, `(-4,2,1)` | — | — | `[]` |
| 1 | pop `(-5,1,2)` | 104 | `(-3,1,1)` | `[104]` |
| 2 | pop `(-4,2,1)` | 203 | `(-2,2,0)` | `[104,203]` |
| 3 | pop `(-3,1,1)` | 102 | `(-1,1,0)` | `[104,203,102]` |
| 4 | pop `(-2,2,0)` | 202 | idx−1 = −1 → none | `[104,203,102,202]` |
| 5 | pop `(-1,1,0)` | 101 | none; heap empty → stop | `[104,203,102,202,101]` |

The two users' tweets interleave perfectly by recency. If you forgot the "push predecessor" step, this test would return `[104, 203]` — a loud failure.

---

## 9. Complexity table

Let P = posts so far (≤ 3×10⁴), E = follow edges, F = |followees| + 1 ≤ 500, K = total tweets by the author set.

| Operation | Brute force | Optimal (k-way merge) | Why (optimal) |
|---|---|---|---|
| `postTweet` | O(1) | **O(1)** | counter increment + list append |
| `follow` / `unfollow` | O(1) avg | **O(1) avg** | hash-set add / discard |
| `getNewsFeed` | O(K log K), K can approach P | **O(F + 10·log F)** | seed + `heapify` O(F); ≤10 pops each with an O(log F) push |
| Total over judge | ~3×10⁹ comparisons worst-case | **~10⁷ operations** worst-case | e.g., 1.5×10⁴ feeds × ~(500 + 10·log₂500) |
| Space | O(P + E) | **O(P + E)**, plus O(F) transient per feed | each tweet stored once; follow sets |

Rough order of magnitude: the merge does ~300× less work than collect-and-sort on an adversarial workload — the difference between "passes comfortably in Python" and "minutes."

---

## 10. A simpler variant that usually also passes (worth mentioning)

By Insight 3, only each author's **last 10** tweets can ever appear, so:

```python
def getNewsFeed(self, userId):
    authors = self.followees[userId] | {userId}
    pool = []
    for u in authors:
        pool.extend(self.tweets.get(u, [])[-10:])   # slice of at most 10 per author
    pool.sort(key=lambda p: p[0], reverse=True)     # ≤ 5000 items, not ≤ 3×10⁴
    return [tid for _, tid in pool[:10]]
```

Or the one-liner finish: `heapq.nlargest(10, pool, key=lambda p: p[0])`. This is ~10⁸-ish ops worst-case — often fine on the judge, but the heap merge is the pattern the interviewer wants, and it scales when F and P are large. Mention the cap idea even if you code the merge — it shows you've thought about pruning.

---

## 11. Two-minute design add-on: pull vs. push (say this to stand out)

- **Pull (merge-on-read)** — what we built: `postTweet` is O(1); each reader pays O(F + 10 log F). Great when writes are frequent and celebrity authors have millions of followers (no per-post fanout).
- **Push (fanout-on-write)**: on post, insert the tweet into every follower's pre-materialized feed; reads are O(10). But posts cost O(#followers) — the celebrity problem — and `unfollow` needs retroactive cleanup or lazy filtering.
- **Real systems use hybrids**: push for ordinary users, pull for high-follower accounts. Note that real Twitter tweet IDs (snowflakes) are time-ordered, so merges don't even need a synthetic clock — our toy IDs deliberately aren't, which is why the counter exists.

---

## 12. Common mistakes

| # | Mistake | Failing case / symptom | Fix |
|---|---|---|---|
| 1 | Ordering by `tweetId` | `post(1,100); post(1,1)` → feed must be `[1,100]` | logical clock counter |
| 2 | Author set = followees only | user's own tweets missing from their feed | union `{userId}` |
| 3 | Followees stored as a `list` | `follow(1,2)` twice → tweet 6 emitted twice; O(n) unfollow | hash `set` |
| 4 | Forgetting to push the predecessor after a pop | each author contributes only their single newest tweet; interleaved test returns `[104,203]` | push `(u, idx−1)` |
| 5 | Off-by-one on the pointer | emitting `timeline[idx−1]` (skips newest) or pushing `idx` (duplicates) | emit at popped `idx`; push `idx−1` |
| 6 | Loop condition only `while heap` | returns more than 10 tweets | add `len(feed) < 10` |
| 7 | Assuming 10 tweets exist | `IndexError`/exception when fewer exist | keep both loop guards |
| 8 | Python `set.remove(x)` on absent x | `KeyError` when unfollowing a stranger | `discard` (Java `Set.remove` returns false; C++ `erase` returns 0 — both safe) |
| 9 | Using `time.time()` as the clock | two posts in the same tick tie → ambiguous, flaky order | monotonic counter |
| 10 | `authors = self.followees[uid]; authors.add(uid)` while computing the feed | permanently corrupts state (user "follows" themself) | `self.followees[uid] | {uid}` builds a copy |

---

## 13. Implementation gotchas in Java / C++ (in addition to Python)

| Language | Gotchas |
|---|---|
| **Java** | `PriorityQueue` is a **min**-heap → comparator `(a, b) -> Integer.compare(b[0], a[0])` for max-by-time. Use `Integer.compare`/`Long.compare`, never `b[0] - a[0]`: subtraction is overflow-prone as a habit (safe here since times ≤ 3×10⁴, catastrophic with epoch-millis `long`s). Use `getOrDefault` on the followee map to avoid NPEs; boxed `Integer` keys add GC churn — `int[]` heap entries stay primitive. |
| **C++** | `std::priority_queue` is a **max**-heap by default (opposite of Python) → pushing `{-t, u, idx}` works with the default comparator; or use `std::greater<>` with positive times. `unordered_map::operator[]` inserts empty entries on read — prefer `find` in `getNewsFeed`. `unordered_set::erase(k)` is a silent no-op when absent (matches Python's `discard`). |

---

## 14. Test plan — propose these out loud

Say before/while coding: *"Let me lock the edge cases first: empty feed, tweet IDs that don't follow time order, fewer than 10 tweets, the 10-cap, and unfollow-of-a-stranger."*

| # | Test | Expected | Catches |
|---|---|---|---|
| T1 | Official Example 1 (full sequence) | `[null, null, [5], null, null, [6, 5], null, [5]]` | basic wiring |
| T2 | `getNewsFeed(9)` on a brand-new user | `[]` | empty state |
| T3 | `post(1,100); post(1,1); getNewsFeed(1)` | `[1, 100]` | the tweetId ≠ time bug |
| T4 | 3 tweets by one user → feed | all 3, newest first | fewer-than-10 |
| T5 | 12 tweets by one user → feed | exactly the last 10, newest first | the 10-cap |
| T6 | Interleaved two-author trace (Section 8.2) | `[104,203,102,202,101]` | merge / pointer logic |
| T7 | User 3 posts twice; *then* `follow(1,3)`; feed(1) | includes user 3's old tweets | retroactive follow (read-time semantics) |
| T8 | `unfollow(1, 5)` when 1 never followed 5 | no exception | `discard` / no-op unfollow |
| T9 | `follow(1,2)` twice, then feed | user 2's tweets once | set semantics / duplicates |

Quick sanity snippet for the two most valuable ones:

```python
tw = Twitter()
tw.postTweet(1, 100)
tw.postTweet(1, 1)
assert tw.getNewsFeed(1) == [1, 100]      # T3: tweetId order ≠ recency order

fresh = Twitter()
assert fresh.getNewsFeed(9) == []          # T2: empty state
```

---

## 15. Transferable patterns and related problems

**Patterns to name explicitly in the interview:**

1. **Identity ≠ order** — when the given IDs don't encode recency, invent a monotonic logical clock.
2. **Append-only per-key logs are sorted by construction** — exploit existing order before sorting a union.
3. **k-way merge / frontier heap** — "top-m across k sorted sources" = seed each source's frontier into a heap, pop, advance.
4. **Cap-per-source pruning** — needing m outputs means each of k sources contributes ≤ m; prune to each source's last m.
5. **Compute-on-read vs compute-on-write** — the micro version of pull vs push fanout.

| Related problem | Shared pattern |
|---|---|
| LC 23 — Merge k Sorted Lists | identical skeleton: heap of per-list frontiers |
| LC 373 — Find K Pairs with Smallest Sums | top-k from two sorted sources via frontier heap |
| LC 632 — Smallest Range Covering Elements from K Lists | frontier traversal over k sorted lists |
| LC 347 — Top K Frequent Elements | top-k with a heap; cap/prune thinking |
| LC 703 — Kth Largest Element in a Stream | maintaining a top-k structure under insertions |
| LC 981 — Time Based Key-Value Store | logical timestamps over an append-only store |
| LC 2353 — Design a Food Rating System | design problem: dicts + heap, lazy invalidation |

---

## 16. Interview narration script (fuller talk track)

1. **Clarify (30s):** "Confirming semantics: the feed caps at 10, fewer if fewer exist; it always includes my own tweets; and follow/unfollow apply immediately and retroactively — the feed is computed from the *current* follow set at read time."
2. **Key observation (30s):** "Tweet IDs are unique but not time-ordered — `post(1,100)` then `post(1,1)` must feed as `[1,100]` — so I'll stamp every post with a strictly increasing logical counter."
3. **Data structures (30s):** "Per-user append-only timeline lists of `(time, tweetId)` — sorted by construction; a follower → hash-set-of-followees map; and the counter."
4. **Per-op plan (1 min):** "Post: O(1) append. Follow/unfollow: set add and `discard` — `discard` so unfollowing a stranger is a safe no-op, and a set means duplicate follows can't double-count tweets. The feed is the interesting one."
5. **The merge (1–2 min):** "Each timeline is already time-sorted, so the feed is a k-way merge over at most 500 sorted lists: seed a max-heap with each author's newest tweet, pop up to ten times, and after each pop push that same author's next-older tweet via a stored index. That's O(F + 10 log F) per read instead of sorting the whole union — and it's essentially optimal for the extraction, since each output must be identified among the ~F frontier candidates."
6. **Code, narrating the traps:** "Negating time because Python's heap is a min-heap; union with `{userId}` — building a copy, not mutating the stored set; `discard` for unfollow; loop guards `while heap and len(feed) < 10`."
7. **Trace Example 1 out loud (30s)**, then state T2/T3/T5 as the tests you'd run.
8. **Close (30s):** "In a real system this is the pull model; fanout-on-write makes reads O(10) but posts cost O(#followers) — the celebrity problem — so production feeds hybridize. Also note real snowflake IDs are time-ordered, which is why this clock trick isn't needed there."

---

## 17. Say it in 60 seconds

"Three structures: a dict mapping each user to their tweets as timestamp–tweetId pairs appended in order, a dict mapping follower to a hash set of followees, and a global counter for time — because tweet IDs are unique but arbitrary, I can't sort by them, so every post stamps a strictly increasing clock. The feed is the interesting part: I take the author set — the user plus their current followees — and seed a max-heap with each author's newest tweet, then pop up to ten times, and after each pop push that same author's next-older tweet using a stored index. That's the classic k-way merge over already-sorted timelines: O of F plus ten log F per read instead of sorting every tweet. Follow and unfollow are set add and discard — discard, so unfollowing a stranger is a safe no-op. The feed is computed at read time, so follow changes apply immediately and retroactively, and I explicitly include the user's own tweets. In a real system you'd weigh this pull model against push fanout, which is fast to read but suffers the celebrity problem on write."
