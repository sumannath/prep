### Problem

Build a `RateLimiter` where each customer may make at most `N` requests per `T` seconds. Implement `is_allowed(customer_id) -> bool`.

Requests that are rejected should not count against the customer.

### Interview refresher

Keep a deque of accepted-request timestamps per customer, behind a `RateLimitStrategy` interface, with an injected monotonic clock and a lock. On each call, pop timestamps at least T old from the left; if fewer than N remain, append now and accept, otherwise reject without recording it. That gives an exact sliding window at amortised O(1), because each timestamp is pushed and popped once. Name the fixed-window boundary burst as the reason you didn’t pick the cheaper option. The credits follow-up is a token bucket with lazy refill, `min(cap, tokens + elapsed × rate)`. Many servers means Redis (a sorted set updated in one Lua script) and an explicit fail-open or fail-closed decision.

### Hints

1. Start by asking: fixed window, sliding window, or token bucket? State the trade-off before you pick.
2. For a sliding log, a deque of timestamps per customer gives you amortised O(1) eviction from the left.
3. Inject the clock. It makes the class testable without sleeping and is the first thing a reviewer will look for.

### Approach

Keep a `deque` of accepted timestamps per customer. On each call, pop timestamps older than the window, then accept if fewer than `N` remain. This is exact (no boundary burst like fixed windows) at the cost of storing up to N timestamps per customer.

Design for extension from the start: a small `Strategy` interface lets you swap in token bucket or fixed window later without touching callers.

### Deep dive

#### What the interviewer is really testing

Not a clever algorithm. They want to see whether you can turn a one-line requirement into a small, correct, testable component that survives the next three requirements they’re about to add.

#### Start from the definition

“At most N requests in T seconds” sounds simple until you ask: which T seconds? There are four common ways to count, and each answers that differently.

- **Fixed window.** Chop time into buckets (`floor(now / T)`) with one counter per customer per bucket. Tiny memory. The flaw: a customer can send N at 9.9s and N more at 10.1s, so 2N requests land within 0.2 seconds. That’s the “boundary burst”.
- **Sliding log.** Remember the timestamp of every accepted request and count those in the last T seconds. Exact, no boundary burst, but up to N timestamps per customer.
- **Sliding window counter.** Blend the current and previous fixed-window counts by how far you are into the window. Constant memory, approximately right.
- **Token bucket.** Each customer has a bucket that refills at N/T tokens per second up to a capacity; each request spends one. Allows controlled bursts. This is what most real API gateways use.

We start with the sliding log because it’s exact and the easiest to reason about out loud, and keep the others ready for the follow-up.

#### Why a deque, specifically

Timestamps come from a clock that only moves forward, so they’re appended in increasing order. That means the expired ones are always a block at the *front*. A deque removes from the front in O(1); a Python list’s `pop(0)` is O(n) because it shifts everything. Every timestamp is appended once and popped at most once, so even though one call might pop many, the average cost per call is constant. That’s what “amortised O(1)” means.

#### Why the small details matter

- **`now - hits[0] >= window`.** A request exactly T seconds old is treated as outside the window. Either choice is defensible; pick one and say it, because your tests depend on it.
- **Only accepted requests are recorded.** If rejected ones were logged too, a client that keeps retrying would never get unblocked: the limiter becomes a punishment instead of a throttle.
- **Injected clock.** Lets you test “advance 10 seconds” instantly. Interviewers notice when tests call `sleep`.
- **The lock.** Checking the length and then appending is two steps. Two threads can both see N−1 and both append, letting N+1 through. The lock makes check-and-append one atomic step.
- **The strategy interface.** You know a different algorithm is coming. An interface now turns the follow-up into “add a class” instead of “rewrite”.

#### Walk through it

```text
N=3, T=10
t=0  deque []        → accept → [0]
t=1  deque [0]       → accept → [0,1]
t=2  deque [0,1]     → accept → [0,1,2]
t=5  deque [0,1,2]   → nothing expired, len=3 → reject
t=10 pop 0 (10-0≥10) → [1,2] → accept → [1,2,10]
```

#### When it has to scale

Behind a load balancer, each server keeps its own memory, so 20 servers would let 20N through. State has to move to a shared store such as Redis. Sliding log becomes a sorted set per customer (remove old scores, count, add), done in one Lua script so the steps stay atomic. If memory matters more than precision, fall back to a fixed-window counter with `INCR` and `EXPIRE` and accept the boundary burst.

### Reference solution

```python
from abc import ABC, abstractmethod
from collections import defaultdict, deque
import threading
import time


class RateLimitStrategy(ABC):
    @abstractmethod
    def is_allowed(self, key: str) -> bool: ...


class SlidingWindowLog(RateLimitStrategy):
    def __init__(self, max_requests: int, window_seconds: float, clock=time.monotonic):
        self.max_requests = max_requests
        self.window = window_seconds
        self.clock = clock
        self._hits = defaultdict(deque)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        now = self.clock()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) < self.max_requests:
                hits.append(now)
                return True
            return False


# --- tests with a fake clock ---
class FakeClock:
    def __init__(self): self.t = 0.0
    def __call__(self): return self.t

clock = FakeClock()
rl = SlidingWindowLog(max_requests=3, window_seconds=10, clock=clock)
assert [rl.is_allowed("acme") for _ in range(4)] == [True, True, True, False]
clock.t = 10
assert rl.is_allowed("acme")          # oldest hit has expired
assert rl.is_allowed("globex")        # customers are isolated
```

**Time:** O(1) amortised per call  
**Space:** O(N) per active customer

### Questions to ask before coding

- Is the limit per customer, per API key, per endpoint, or a combination?
- Should “every Y seconds” be a rolling window, or are clock-aligned windows acceptable?
- Are short bursts fine as long as the average holds?
- Do rejected requests count toward the limit?
- One process, or several instances that must share the limit?
- Roughly how many customers? That decides whether storing timestamps per customer is affordable.

### Interview walkthrough

**Interviewer:** Let’s build a rate limiter. Each customer can make X requests every Y seconds. Implement `isAllowed(customerId)`.

**You:** Before I write anything, a few questions so I build the right thing. Is the limit the same for every customer, and is it per customer only, or per endpoint too?

**Interviewer:** Same for everyone, per customer.

**You:** Should “every Y seconds” mean any rolling Y-second window, or clock-aligned windows like each calendar minute? With aligned windows someone can send X at 0:59 and X at 1:01, so 2X in two seconds.

**Interviewer:** Rolling.

> *Why this works:* You’ve shown you know the boundary-burst problem without lecturing about it. One sentence of reasoning per question is the right density.

**You:** I’ll assume rejected requests don’t count, otherwise a busy client never recovers. And single process for now, but I’ll keep the storage inside the class so we can swap it later. Okay?

**Interviewer:** Yes, both fine.

**You:** Plan: for each customer I keep a deque of timestamps of accepted requests. On each call I drop the ones older than Y, then accept if fewer than X remain. Each timestamp is added once and removed once, so it’s amortised constant time; memory is at most X timestamps per customer. Does that work, or would you rather I start with a token bucket?

**Interviewer:** Go ahead with that.

> *Why this works:* Get agreement on the plan before typing. If they wanted something else, you learn it at minute 8, not minute 28.

**You:** I’m passing the clock in as a parameter so tests don’t need to sleep. I’m also putting this behind a small interface, because I suspect we’ll want other algorithms later.

**Interviewer:** Why `monotonic` rather than `time.time`?

**You:** Wall-clock time can jump backwards when the system syncs with NTP. The deque relies on timestamps only increasing, and a monotonic clock guarantees that.

**You:** Let me test it. Limit 3 per 10 seconds: three calls return true, the fourth false. I move the fake clock to 10; the first timestamp expires, so the next call is true. A second customer is unaffected by the first.

**Interviewer:** Good. New requirement: customers who don’t use their quota should earn credits they can spend later, up to a cap.

**You:** That’s a token bucket: the cap is the bucket’s capacity and the refill rate is X over Y per second. I’ll compute the refill lazily on each call from the time elapsed since the last call, so no background timer and no extra threads. Thanks to the interface it’s a new class; callers don’t change.

**Interviewer:** What if this runs on 20 servers?

**You:** Then in-memory state is wrong: each server would allow X. I’d move it to Redis, either a sorted set per customer updated atomically in a Lua script, or a fixed-window counter if we can accept the boundary burst. One thing I’d want to agree with the product owner: if Redis is unavailable, do we fail open and risk overload, or fail closed and block paying customers?

> *Why this works:* Closing on a trade-off that involves customers and operations, not just code, is exactly the staff-level signal. You’re showing you’d own the decision, not just the implementation.

### Scale-up follow-up

**Interviewer adds:** “Customers who don't use their full quota should earn credits they can spend later, up to a cap.” Or: “different endpoints need different limits.”

Credits is a token bucket: tokens refill continuously at `N/T` per second up to a capacity larger than N. Per-endpoint limits is a registry mapping `(endpoint)` to a strategy instance. Because you started with an interface, both are additions, not rewrites — say that out loud.

```python
class TokenBucket(RateLimitStrategy):
    def __init__(self, capacity: float, refill_per_sec: float, clock=time.monotonic):
        self.capacity, self.rate, self.clock = capacity, refill_per_sec, clock
        self._state = {}                       # key -> (tokens, last_ts)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        now = self.clock()
        with self._lock:
            tokens, last = self._state.get(key, (self.capacity, now))
            tokens = min(self.capacity, tokens + (now - last) * self.rate)
            allowed = tokens >= 1
            self._state[key] = (tokens - 1 if allowed else tokens, now)
            return allowed


class EndpointLimiter:
    def __init__(self, default: RateLimitStrategy):
        self.default, self.rules = default, {}
    def register(self, endpoint: str, strategy: RateLimitStrategy):
        self.rules[endpoint] = strategy
    def is_allowed(self, customer: str, endpoint: str) -> bool:
        return self.rules.get(endpoint, self.default).is_allowed(customer)
```

### Where candidates slip

- Counting rejected requests in the log, which locks a busy customer out permanently.
- Using wall-clock time.time() instead of a monotonic clock; NTP adjustments break windows.
- No lock. Mention thread safety even if you don't implement it, and how you'd move state to Redis (INCR + EXPIRE or a sorted set) for a distributed version.
