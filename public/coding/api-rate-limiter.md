### Problem

Build a `RateLimiter` where each customer may make at most `N` requests per `T` seconds. Implement `is_allowed(customer_id) -> bool`.

Requests that are rejected should not count against the customer.

#### In plain words

Every time a customer calls your API, your code asks the limiter "may this request go through?". The limiter answers `True` or `False`. A customer who has already had `N` requests accepted in the last `T` seconds gets `False` until enough time passes.

Example with `N = 3`, `T = 10`: a customer can make 3 requests, then must wait until the oldest of those is 10 seconds old before the next one is accepted.

#### Words used on this page

| Term | Meaning |
|---|---|
| Window | The stretch of time you count requests in (the last `T` seconds). |
| Rolling (sliding) window | "The last `T` seconds, measured back from right now." Moves continuously. |
| Fixed (aligned) window | Clock-aligned buckets such as 10:00:00–10:00:10, 10:00:10–10:00:20. |
| Timestamp | A number for "when it happened", e.g. seconds since the program started. |
| Deque | A list you can add to and remove from at **both** ends cheaply. |
| Amortised O(1) | Some calls do more work, but averaged over all calls each one costs a constant. |
| TDD | Test-driven development: write a failing test, write code until it passes, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

Keep a deque of accepted-request timestamps per customer, behind a `RateLimitStrategy` interface, with an injected monotonic clock and a lock. On each call, pop timestamps at least T old from the left; if fewer than N remain, append now and accept, otherwise reject without recording it. That gives an exact sliding window at amortised O(1), because each timestamp is pushed and popped once. Name the fixed-window boundary burst as the reason you didn’t pick the cheaper option. The credits follow-up is a token bucket with lazy refill, `min(cap, tokens + elapsed × rate)`. Many servers means Redis (a sorted set updated in one Lua script) and an explicit fail-open or fail-closed decision.

**Cheat sheet**

1. **Ask:** per what key? rolling or aligned? bursts OK? do rejects count? one process or many?
2. **Tests first:** limit hit, expiry at exactly T, rejects don't count, customers isolated, no boundary burst.
3. **Build:** `dict[customer] → deque[timestamps]`; pop old from the left, accept if `len < N`.
4. **Cost:** O(1) amortised per call, O(N) memory per active customer.
5. **Follow-ups:** credits → token bucket; per-endpoint → registry of strategies; many servers → Redis + fail-open/closed decision.

### Background you need

You only need five small ideas for this problem. Each comes with a tiny example you can run.

#### 1. A dictionary keyed by customer

Every customer gets their own state, so the outer structure is a dictionary from customer id to that state. `defaultdict` creates the state the first time you see a customer, so you never write "if key not in dict".

```python
from collections import defaultdict

counts = defaultdict(int)   # missing keys start at int() == 0
counts["acme"] += 1
counts["acme"] += 1
counts["globex"] += 1
print(dict(counts))
```

```text
{'acme': 2, 'globex': 1}
```

#### 2. Deque: a queue that is cheap at both ends

A Python `list` is fast at the end (`append`, `pop()`) but slow at the front: `pop(0)` shifts every other element left, so it costs O(n). A `deque` ("double-ended queue", say "deck") does `append` and `popleft` in O(1).

```python
from collections import deque

q = deque([0, 1, 2])
q.append(10)        # add at the right end
oldest = q.popleft()  # remove from the left end
print(oldest, list(q), q[0])
```

```text
0 [1, 2, 10] 1
```

We'll store timestamps oldest-on-the-left. Expired ones are always at the left, so `popleft` removes them cheaply.

#### 3. Amortised cost

One call might pop many expired timestamps, which looks expensive. But each timestamp is appended once and popped at most once, ever. Spread over all calls, that's a constant amount of work per call. That's what "amortised O(1)" means: not every call is cheap, but the average is.

#### 4. Injecting the clock

If the limiter calls `time.monotonic()` itself, a test that checks "after 10 seconds it allows again" has to really sleep for 10 seconds. Instead, pass the clock in as a parameter (this is called *dependency injection*). Production code passes the real clock; tests pass a fake one they can move forward instantly.

```python
class FakeClock:
    def __init__(self):
        self.t = 0.0
    def __call__(self):      # lets you call the object like a function: clock()
        return self.t

clock = FakeClock()
print(clock())
clock.t = 10
print(clock())
```

```text
0.0
10
```

Use `time.monotonic` in production, not `time.time`. Wall-clock time can jump backwards when the machine syncs its clock (NTP), and our deque assumes timestamps only ever increase. A monotonic clock never goes backwards.

#### 5. Locks: making check-then-act atomic

A web server handles many requests at once on different threads. Our logic is "check the count, then append". Two threads can both check, both see room for one more, and both append, letting `N + 1` through. A `threading.Lock` makes that check-and-append happen as one step: one thread at a time.

```python
import threading

lock = threading.Lock()
with lock:            # only one thread can be inside this block at a time
    pass              # check-and-append goes here
```

#### 6. pytest in two minutes

pytest is the standard Python test runner. Most interview setups ("use your own IDE") have it, and it's what you'd use at work.

- A test is any function whose name starts with `test_`, in a file whose name starts with `test_`.
- You check things with a plain `assert`. When one fails, pytest shows both sides of the comparison, so you rarely need a custom message.
- A **fixture** is a function marked `@pytest.fixture`. When a test lists a parameter with the same name, pytest calls the fixture and passes in the result. Fixtures are how each test gets fresh setup, such as a new fake clock.
- `@pytest.mark.parametrize` runs one test with several inputs.

```python
# file: test_example.py
import pytest

@pytest.fixture
def numbers():
    return [3, 1, 2]

def test_sorted(numbers):          # pytest passes the fixture's return value in
    assert sorted(numbers) == [1, 2, 3]

@pytest.mark.parametrize("word, expected", [("abc", 3), ("", 0)])
def test_len(word, expected):
    assert len(word) == expected
```

Run it from the folder that holds the files:

```bash
pytest -q --tb=no -rf test_example.py
```

```text
...                                                                                          [100%]
3 passed in 0.01s
```

What the flags mean: `-q` is quiet (one dot per passing test, `F` per failure). `--tb=no` hides tracebacks. `-rf` lists each failure on one line at the end. On this page we use them to keep outputs short. When a test fails in a real interview, drop `--tb=no` to see the full comparison.

### Step 1 · Clarify (first ~5 min)

Don't start coding yet. "N requests per T seconds" has several reasonable meanings, and each answer changes what you build. Ask, and say *why* in one short sentence: that shows you know the trade-offs.

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Is the limit per customer, per API key, per endpoint, or a mix? | Decides the dictionary key. | Per customer → key `customer_id`. Per customer per endpoint → key `(customer_id, endpoint)`, or a limiter per endpoint (see Follow-ups). |
| Should "per T seconds" be any rolling T-second window, or clock-aligned windows are fine? | Aligned windows let a customer send N just before a boundary and N just after: 2N in a moment ("boundary burst"). | Rolling → **sliding log** (a deque of timestamps). Aligned is fine → **fixed-window counter** (one number per window, much less memory). |
| Are short bursts OK as long as the average holds? | Some APIs want to allow bursts after quiet periods. | No → sliding log. Yes → **token bucket** (see Follow-ups). |
| Do rejected requests count toward the limit? | If they count, a client that keeps retrying never gets unblocked. | No (usual) → record only accepted requests. Yes → record every attempt, and point out the lockout risk. |
| A request exactly T seconds old: inside or outside the window? | It decides `>=` vs `>` and your tests depend on it. | Outside → expire when `now - t >= T`. Inside → `now - t > T`. |
| One process, or many servers sharing the limit? | In-memory state on 20 servers lets 20N through. | One process → in-memory dict + lock. Many → shared store such as Redis (see Follow-ups). |
| Roughly how many customers, and how big is N? | The sliding log stores up to N timestamps per customer. | Small/medium → fine. Millions of customers with large N → sliding-window counter or fixed window to save memory. |

**If they say "your call", state your defaults out loud:**

> "I'll assume: limit per customer, same N and T for everyone, a rolling window, rejected requests don't count, a request exactly T seconds old has expired, single process but thread-safe, and I'll keep storage inside the class so we can swap it later. Okay?"

For the rest of this page we use those defaults.

### Step 2 · Write the tests first

Before any implementation, turn every agreement from Step 1 into a pytest test. That proves you understood the requirements, gives you a target, and makes the "test it" part of the interview nearly free.

> **Say:** "Before I code, here are the cases I'll make pass. I'll write them as pytest tests with a fake clock, so nothing has to sleep."

#### Work the examples by hand first

With `N = 3`, `T = 10` and the defaults above:

```text
t=0   accept   (accepted so far in last 10s: 0)
t=1   accept   (1: [0])
t=2   accept   (2: [0, 1])
t=5   reject   (3 already: [0, 1, 2])
t=10  accept   (0 is now exactly 10s old → expired; [1, 2] → room)
```

And the boundary burst we must **not** allow (rolling window):

```text
t=9   accept, accept, accept
t=10  reject   (all three are 1 second old; a fixed window would wrongly reset here)
```

#### Two files

Keep the code and the tests apart, as you would at work:

- `rate_limiter.py`: the implementation.
- `test_rate_limiter.py`: the tests. It imports `RateLimiter` from the first file.

#### The tests, one per requirement

The `clock` fixture gives every test its own fake clock starting at 0. Each test's comment names the requirement it pins down.

```python
# file: test_rate_limiter.py
import pytest

from rate_limiter import RateLimiter


class FakeClock:
    """A clock the test controls: set clock.t, and the limiter reads it."""
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


@pytest.fixture
def clock():
    return FakeClock()


def test_allows_up_to_limit(clock):
    # Requirement: at most N accepted requests.
    rl = RateLimiter(max_requests=3, window_seconds=10, clock=clock)
    assert [rl.is_allowed("acme") for _ in range(4)] == [True, True, True, False]


def test_old_requests_expire(clock):
    # Requirement: a request exactly T seconds old no longer counts.
    rl = RateLimiter(max_requests=3, window_seconds=10, clock=clock)
    for t in (0, 1, 2):
        clock.t = t
        assert rl.is_allowed("acme")
    clock.t = 5
    assert not rl.is_allowed("acme")
    clock.t = 10
    assert rl.is_allowed("acme")


def test_rejected_requests_do_not_count(clock):
    # Requirement: only accepted requests use up the quota.
    rl = RateLimiter(max_requests=2, window_seconds=10, clock=clock)
    answers = []
    for t in (0, 1, 5, 9, 10, 11):
        clock.t = t
        answers.append(rl.is_allowed("acme"))
    assert answers == [True, True, False, False, True, True]


def test_customers_are_isolated(clock):
    # Requirement: the limit is per customer.
    rl = RateLimiter(max_requests=1, window_seconds=10, clock=clock)
    assert rl.is_allowed("acme")
    assert not rl.is_allowed("acme")
    assert rl.is_allowed("globex")


def test_window_is_rolling(clock):
    # Requirement: rolling window, so no burst at a clock boundary.
    rl = RateLimiter(max_requests=3, window_seconds=10, clock=clock)
    clock.t = 9
    assert all(rl.is_allowed("acme") for _ in range(3))
    clock.t = 10
    assert not rl.is_allowed("acme"), "boundary burst allowed"
```

Notice why `test_rejected_requests_do_not_count` has the shape it has. If rejected requests at t=5 and t=9 were recorded, then at t=10 the customer would still have 3 "requests" in the window (1, 5, 9) and be rejected. The test pins that difference down.

#### Red: run them against an empty stub

The class doesn't exist yet, so write the smallest stub that lets the tests import and run. Every test must fail. That proves the tests can actually catch something.

```python
# file: rate_limiter.py
class RateLimiter:
    def __init__(self, max_requests, window_seconds, clock):
        pass

    def is_allowed(self, customer_id):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_rate_limiter.py
```

```text
FFFFF                                                                                        [100%]
===================================== short test summary info =====================================
FAILED test_rate_limiter.py::test_allows_up_to_limit - NotImplementedError
FAILED test_rate_limiter.py::test_old_requests_expire - NotImplementedError
FAILED test_rate_limiter.py::test_rejected_requests_do_not_count - NotImplementedError
FAILED test_rate_limiter.py::test_customers_are_isolated - NotImplementedError
FAILED test_rate_limiter.py::test_window_is_rolling - NotImplementedError
5 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. You need to know how many accepted requests a customer made in the last T seconds. What's the simplest thing to store that answers that exactly?
2. Timestamps arrive in increasing order. Where in your stored sequence are the expired ones always found?
3. Which Python structure removes from that end in O(1)?

#### There are four standard ways to count

| Approach | What you store per customer | Exact? | Memory | Notes |
|---|---|---|---|---|
| Fixed-window counter | One count per clock-aligned window | No: allows the boundary burst | O(1) | Simplest. Fails `test_window_is_rolling`. |
| **Sliding log** | Timestamp of every accepted request in the window | **Yes** | O(N) | Passes all our tests. Easy to explain. |
| Sliding-window counter | Counts for the current and previous fixed windows, blended by how far into the window you are | Approximately | O(1) | Good when memory matters more than precision. |
| Token bucket | A token count plus the last refill time | Different rule: allows bursts up to capacity | O(1) | What most API gateways use. Our credits follow-up. |

#### Brute force first: why the obvious idea fails

The first idea most people have is a counter per customer that resets every T seconds: the fixed window. It passes the simple tests, but it fails `test_window_is_rolling`. A customer can send N at t=9 and N more at t=10, because t=10 starts a new window. Since we agreed on a rolling window, that's wrong. We'll still build it as Stage 1 below, because watching that test fail shows why.

#### The key insight

To answer "how many accepted requests in the last T seconds?" exactly, remember the timestamps of the accepted requests. Because timestamps only increase, they're stored in order, and the expired ones are always a block at the **front**. So: remove expired ones from the front, then look at how many are left.

#### The plan (say this, then wait for a nod)

> **Say:** "For each customer I'll keep a deque of the timestamps of their accepted requests, oldest on the left. On each call I pop timestamps that are at least T old from the left, then accept if fewer than N remain, and only then record the new timestamp. Each timestamp is added once and removed once, so it's amortised O(1) per call, and memory is at most N timestamps per customer. Does that work, or would you rather I start with a token bucket?"

How this maps to the tests:

- Popping at `now - t >= T` → `test_old_requests_expire`.
- Recording only when accepting → `test_rejected_requests_do_not_count`.
- Keying the dict by customer → `test_customers_are_isolated`.
- Remembering real timestamps instead of a per-window count → `test_window_is_rolling`.

### Step 4 · Make the tests pass, stage by stage

Go in small steps and run pytest after each one. Each stage turns a few red tests green, and you narrate as you type. Only `rate_limiter.py` changes; the tests stay put.

#### Stage 1: fixed-window counter (the naive version)

> **Say:** "Simplest thing first: count per customer per clock-aligned window, to see which tests that already satisfies."

```python
# file: rate_limiter.py
class RateLimiter:
    def __init__(self, max_requests, window_seconds, clock):
        self.max_requests = max_requests
        self.window = window_seconds
        self.clock = clock
        self.counts = {}   # (customer_id, window_number) -> accepted count

    def is_allowed(self, customer_id):
        window_number = int(self.clock() // self.window)   # t=0..9.99 → 0, t=10..19.99 → 1
        key = (customer_id, window_number)
        if self.counts.get(key, 0) < self.max_requests:
            self.counts[key] = self.counts.get(key, 0) + 1
            return True
        return False
```

```bash
pytest -q --tb=no -rf test_rate_limiter.py
```

```text
....F                                                                                        [100%]
===================================== short test summary info =====================================
FAILED test_rate_limiter.py::test_window_is_rolling - AssertionError: boundary burst allowed
1 failed, 4 passed in 0.01s
```

Four green, one red, and the red one is exactly the boundary burst. A count per window can't tell "three requests a second ago" from "three requests nine seconds ago", so we need the actual timestamps.

#### Stage 2: sliding log with a plain list (correct, not yet fast)

> **Say:** "Now I'll store the timestamps themselves. First the simplest correct version: rebuild the list of recent timestamps on every call."

```python
# file: rate_limiter.py
class RateLimiter:
    def __init__(self, max_requests, window_seconds, clock):
        self.max_requests = max_requests
        self.window = window_seconds
        self.clock = clock
        self.hits = {}   # customer_id -> list of accepted timestamps

    def is_allowed(self, customer_id):
        now = self.clock()
        recent = [t for t in self.hits.get(customer_id, []) if now - t < self.window]
        allowed = len(recent) < self.max_requests
        if allowed:
            recent.append(now)          # record only accepted requests
        self.hits[customer_id] = recent
        return allowed
```

```bash
pytest -q --tb=no -rf test_rate_limiter.py
```

```text
.....                                                                                        [100%]
5 passed in 0.01s
```

All green. But every call scans up to N timestamps and builds a new list: O(N) per call. Make it correct first, then make it fast, with the tests guarding you.

#### Stage 3: deque (same behaviour, O(1) amortised)

> **Say:** "Timestamps arrive in order, so expired ones are always at the front. A deque lets me pop them from the left in O(1) instead of rebuilding the list."

```python
# file: rate_limiter.py
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_requests, window_seconds, clock):
        self.max_requests = max_requests
        self.window = window_seconds
        self.clock = clock
        self.hits = defaultdict(deque)   # customer_id -> deque of accepted timestamps

    def is_allowed(self, customer_id):
        now = self.clock()
        hits = self.hits[customer_id]
        while hits and now - hits[0] >= self.window:   # expired ones are at the left
            hits.popleft()
        if len(hits) < self.max_requests:
            hits.append(now)
            return True
        return False
```

```bash
pytest -q --tb=no -rf test_rate_limiter.py
```

```text
.....                                                                                        [100%]
5 passed in 0.01s
```

Still all green, and now each call is O(1) amortised. This is the core answer. Step 5 hardens it for production.

**Time:** O(1) amortised per call. **Space:** O(N) per active customer.

### Step 5 · Run everything and refactor

#### Trace one example against the final code

`N = 3`, `T = 10`:

| t | deque before | popped (`now - t >= 10`) | len after pop | result | deque after |
|---|---|---|---|---|---|
| 0 | `[]` | — | 0 | accept | `[0]` |
| 1 | `[0]` | — | 1 | accept | `[0, 1]` |
| 2 | `[0, 1]` | — | 2 | accept | `[0, 1, 2]` |
| 5 | `[0, 1, 2]` | — | 3 | reject | `[0, 1, 2]` (unchanged) |
| 10 | `[0, 1, 2]` | `0` | 2 | accept | `[1, 2, 10]` |

#### Refactor: production defaults, thread safety, an interface

Three improvements, with the tests re-run after:

1. **Default to the real monotonic clock**, so callers don't have to pass one.
2. **A lock** around check-and-append, so two threads can't both take the last slot.
3. **A `RateLimitStrategy` interface.** You can tell another algorithm is coming; with an interface, the follow-up becomes "add a class" instead of "rewrite".

First add a concurrency test: 50 threads hit a limit of 10 at the same instant, and exactly 10 must be accepted. Be honest that this test is a smoke test. Races are timing-dependent, so it may pass even without the lock. The lock is there because of the reasoning in Background §5, not because one run went red.

```python
# file: test_rate_limiter.py (append)
import threading


def test_concurrent_calls_never_exceed_limit(clock):
    rl = RateLimiter(max_requests=10, window_seconds=60, clock=clock)
    results = []
    threads = [threading.Thread(target=lambda: results.append(rl.is_allowed("acme")))
               for _ in range(50)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    assert results.count(True) == 10
```

Then the refactored implementation:

```python
# file: rate_limiter.py
import threading
import time
from abc import ABC, abstractmethod
from collections import defaultdict, deque


class RateLimitStrategy(ABC):
    @abstractmethod
    def is_allowed(self, key: str) -> bool: ...


class RateLimiter(RateLimitStrategy):
    """Sliding log: exact rolling window."""

    def __init__(self, max_requests: int, window_seconds: float, clock=time.monotonic):
        self.max_requests = max_requests
        self.window = window_seconds
        self.clock = clock
        self._hits = defaultdict(deque)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        now = self.clock()
        with self._lock:                      # check-and-append as one atomic step
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) < self.max_requests:
                hits.append(now)
                return True
            return False
```

```bash
pytest -q --tb=no -rf test_rate_limiter.py
```

```text
......                                                                                       [100%]
6 passed in 0.01s
```

> **Say:** "Everything's green. The default clock is `time.monotonic`, because wall-clock time can jump backwards on an NTP sync and the deque relies on timestamps only increasing."

### Step 6 · Follow-ups (test-first again)

Every follow-up follows the same rhythm:

1. Write the new requirement as a failing test.
2. Add a stub so the test runs and goes red.
3. Replace the stub with real code until it's green.

`-k` runs only tests whose names contain a word, which keeps the output short while you work on one feature.

#### Follow-up 1: "Unused quota should earn credits, up to a cap"

**What changes:** this is a different rule, not a tweak. A customer who was quiet may now burst above N. That's a **token bucket**:

- Each customer has a bucket holding up to `capacity` tokens; it starts full.
- Tokens refill continuously at `refill_per_sec`.
- Each accepted request spends one token.

Don't run a background timer to add tokens. Compute the refill **lazily** on each call from the time elapsed since the last call: `tokens = min(capacity, tokens + elapsed × rate)`.

**Test first:**

```python
# file: test_rate_limiter.py (append)
from rate_limiter import TokenBucket


def test_token_bucket_saves_unused_quota(clock):
    tb = TokenBucket(capacity=5, refill_per_sec=1, clock=clock)
    assert [tb.is_allowed("acme") for _ in range(6)] == [True] * 5 + [False]
    clock.t = 2                                   # 2 seconds later → 2 tokens back
    assert [tb.is_allowed("acme") for _ in range(3)] == [True, True, False]
    clock.t = 1000                                # long idle: refill stops at capacity
    assert sum(tb.is_allowed("acme") for _ in range(10)) == 5
```

**Stub, then red:**

```python
# file: rate_limiter.py (append)
class TokenBucket(RateLimitStrategy):
    def __init__(self, capacity, refill_per_sec, clock=time.monotonic):
        pass

    def is_allowed(self, key):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_rate_limiter.py -k token
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_rate_limiter.py::test_token_bucket_saves_unused_quota - NotImplementedError
1 failed, 6 deselected in 0.01s
```

**Make it pass.** Thanks to the interface, it's a new class and callers don't change:

```python
# file: rate_limiter.py (replace the TokenBucket stub)
class TokenBucket(RateLimitStrategy):
    def __init__(self, capacity: float, refill_per_sec: float, clock=time.monotonic):
        self.capacity = capacity
        self.rate = refill_per_sec
        self.clock = clock
        self._state = {}                  # key -> (tokens, last_seen_time)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        now = self.clock()
        with self._lock:
            tokens, last = self._state.get(key, (self.capacity, now))
            tokens = min(self.capacity, tokens + (now - last) * self.rate)   # lazy refill
            allowed = tokens >= 1
            self._state[key] = (tokens - 1 if allowed else tokens, now)
            return allowed
```

```bash
pytest -q --tb=no -rf test_rate_limiter.py -k token
```

```text
.                                                                                            [100%]
1 passed, 6 deselected in 0.01s
```

#### Follow-up 2: "Different endpoints need different limits"

**What changes:** the key widens from "customer" to "customer + endpoint". The cleanest design is a registry: one strategy per endpoint, plus a default for endpoints with no rule.

**Test first:**

```python
# file: test_rate_limiter.py (append)
from rate_limiter import EndpointLimiter


def test_endpoints_have_their_own_limits(clock):
    limiter = EndpointLimiter(default=RateLimiter(max_requests=100, window_seconds=60, clock=clock))
    limiter.register("/search", RateLimiter(max_requests=2, window_seconds=60, clock=clock))
    assert [limiter.is_allowed("acme", "/search") for _ in range(3)] == [True, True, False]
    assert limiter.is_allowed("acme", "/profile")     # no rule → default limit
```

**Stub, then red:**

```python
# file: rate_limiter.py (append)
class EndpointLimiter:
    def __init__(self, default):
        pass

    def register(self, endpoint, strategy):
        pass

    def is_allowed(self, customer_id, endpoint):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_rate_limiter.py -k endpoint
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_rate_limiter.py::test_endpoints_have_their_own_limits - NotImplementedError
1 failed, 7 deselected in 0.01s
```

**Make it pass:**

```python
# file: rate_limiter.py (replace the EndpointLimiter stub)
class EndpointLimiter:
    def __init__(self, default: RateLimitStrategy):
        self.default = default
        self.rules = {}                   # endpoint -> strategy

    def register(self, endpoint: str, strategy: RateLimitStrategy):
        self.rules[endpoint] = strategy

    def is_allowed(self, customer_id: str, endpoint: str) -> bool:
        return self.rules.get(endpoint, self.default).is_allowed(customer_id)
```

Run the whole suite to make sure nothing earlier broke:

```bash
pytest -q --tb=no -rf test_rate_limiter.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

> **Say:** "Because I started with an interface, both follow-ups were additions, not rewrites."

#### Follow-up 3: "Now it runs on 20 servers behind a load balancer"

**What changes:** each server has its own memory, so each would allow N: 20N in total. The state has to live somewhere all servers share, usually **Redis** (a fast in-memory key-value server).

- **Sliding log in Redis:** one *sorted set* per customer, with each member scored by its timestamp. Remove members older than `now - T`, count what's left, and add `now` if under N. These steps must happen atomically, or two servers race exactly like two threads did. So run them in one **Lua script**, which Redis executes as a single step.
- **Cheaper option:** a fixed-window counter with `INCR` plus `EXPIRE`. Far less memory, at the cost of the boundary burst. Say that trade-off out loud.

```lua
-- KEYS[1] = customer key, ARGV = now, window, max_requests, unique member id
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1] - ARGV[2])
if redis.call('ZCARD', KEYS[1]) < tonumber(ARGV[3]) then
  redis.call('ZADD', KEYS[1], ARGV[1], ARGV[4])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return 1
end
return 0
```

How you'd test it: make the `clock`-style setup a fixture that yields either the in-memory `RateLimiter` or a `RedisRateLimiter` (both implement `RateLimitStrategy`), and run the same tests against both with `@pytest.fixture(params=[...])`, pointed at a local Redis. That's another payoff of the interface.

**The question to close on:**

> **Say:** "One thing I'd want to agree with the product owner: if Redis is unavailable, do we **fail open** (allow everything and risk overload) or **fail closed** (block everyone, including paying customers)?"

### Mock dialogue

Read this once you can do the steps above. It shows the same flow as a real conversation.

**Interviewer:** Let’s build a rate limiter. Each customer can make X requests every Y seconds. Implement `isAllowed(customerId)`.

**You:** Before I write anything, a few questions so I build the right thing. Is the limit the same for every customer, and is it per customer only, or per endpoint too?

**Interviewer:** Same for everyone, per customer.

**You:** Should “every Y seconds” mean any rolling Y-second window, or clock-aligned windows like each calendar minute? With aligned windows someone can send X at 0:59 and X at 1:01, so 2X in two seconds.

**Interviewer:** Rolling.

> *Why this works:* You’ve shown you know the boundary-burst problem without lecturing about it. One sentence of reasoning per question is the right density.

**You:** I’ll assume rejected requests don’t count, otherwise a busy client never recovers. And single process for now, but I’ll keep the storage inside the class so we can swap it later. Okay?

**Interviewer:** Yes, both fine.

**You:** Before coding, here are the cases I'll make pass: limit hit at X, the oldest request expiring after Y seconds, rejected requests not counting, customers isolated, and no burst at a clock boundary. I'll write them as pytest tests with a fake clock fixture.

> *Why this works:* The tests restate the requirements you just agreed on. If you misunderstood something, the interviewer can correct you before any code exists.

**You:** Plan: for each customer I keep a deque of timestamps of accepted requests. On each call I drop the ones older than Y, then accept if fewer than X remain. Each timestamp is added once and removed once, so it’s amortised constant time; memory is at most X timestamps per customer. Does that work, or would you rather I start with a token bucket?

**Interviewer:** Go ahead with that.

> *Why this works:* Get agreement on the plan before typing. If they wanted something else, you learn it at minute 8, not minute 28.

**You:** I’m passing the clock in as a parameter so tests don’t need to sleep. I’m also putting this behind a small interface, because I suspect we’ll want other algorithms later.

**Interviewer:** Why `monotonic` rather than `time.time`?

**You:** Wall-clock time can jump backwards when the system syncs with NTP. The deque relies on timestamps only increasing, and a monotonic clock guarantees that.

**You:** Running pytest: all five pass. The one I care most about is the boundary case: three requests at t=9, and a fourth at t=10 is rejected.

**Interviewer:** Good. New requirement: customers who don’t use their quota should earn credits they can spend later, up to a cap.

**You:** That’s a token bucket: the cap is the bucket’s capacity and the refill rate is X over Y per second. I’ll add a failing test first: five allowed, then two more after two seconds, and never more than the cap after a long idle. Then I compute the refill lazily on each call from the time elapsed since the last call, so no background timer and no extra threads. Thanks to the interface it’s a new class; callers don’t change.

**Interviewer:** What if this runs on 20 servers?

**You:** Then in-memory state is wrong: each server would allow X. I’d move it to Redis, either a sorted set per customer updated atomically in a Lua script, or a fixed-window counter if we can accept the boundary burst. One thing I’d want to agree with the product owner: if Redis is unavailable, do we fail open and risk overload, or fail closed and block paying customers?

> *Why this works:* Closing on a trade-off that involves customers and operations, not just code, is exactly the staff-level signal. You’re showing you’d own the decision, not just the implementation.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Recording rejected requests too | A client that keeps retrying stays blocked forever: the limiter punishes instead of throttling. | `test_rejected_requests_do_not_count` |
| Using a fixed window after agreeing on "rolling" | Allows 2N requests across a boundary. | `test_window_is_rolling` |
| `list.pop(0)` instead of `deque.popleft()` | O(N) per call instead of O(1); the interviewer will ask. | None (it's a speed issue, not a behaviour one). Say the complexity out loud. |
| `time.time()` instead of `time.monotonic()` | An NTP clock adjustment can move time backwards and break the window. | Hard to test; mention it when you inject the clock. |
| Calling `time.sleep` in tests | Slow tests, and it signals you didn't design for testability. | Inject a fake clock instead. |
| No lock (or never mentioning threads) | Two threads both take the last slot, letting N+1 through. | `test_concurrent_calls_never_exceed_limit` (a smoke test) plus the reasoning. |
| Getting `>` vs `>=` at the boundary wrong | Off-by-one at exactly T seconds. | `test_old_requests_expire` |
| Jumping to Redis before solving it in memory | Shows you skip the fundamentals. Solve single-process first, then scale. | n/a |
