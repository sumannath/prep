### Problem

You're integrating with a customer's API that allows `L` calls per window and sometimes fails. Write a client that respects the limit, retries transient failures with exponential backoff, and logs each attempt in a structured way.

#### In plain words

Your code calls someone else's HTTP API. Two facts of life:

1. **It has a rate limit:** at most `L` calls per window (say 10 per second). Go faster and you get `429 Too Many Requests`.
2. **It sometimes fails:** timeouts, dropped connections, `503 Service Unavailable`.

Build `call_with_retry(send, request, limiter)` that:

- waits as needed so it never exceeds the limit;
- retries failures that might succeed next time, waiting longer each time (exponential backoff with jitter);
- gives up immediately on failures that won't fix themselves (e.g. `400 Bad Request`);
- writes one structured (JSON) log line per attempt, so someone can debug it at 2am.

#### Words used on this page

| Term | Meaning |
|---|---|
| Transient failure | Might succeed if tried again: timeouts, connection errors, 429, 5xx. |
| Permanent failure | Won't succeed on retry: 400, 401, 403, 404… |
| Exponential backoff | Wait 0.5s, then 1s, then 2s, 4s…: doubling each attempt, up to a cap. |
| Jitter | Randomising each wait so many clients don't retry in lockstep. |
| `Retry-After` | A response header where the server says how long to wait. |
| Fixed window | Count calls per clock-aligned window; reset the count when a new window starts. |
| Idempotent | Safe to repeat: doing it twice has the same effect as once. |
| Circuit breaker | After repeated failures, stop calling for a while and fail fast. |
| Dependency injection | Passing in `send`, `sleep`, `clock` and `rand`, so tests can fake them. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

Three injected pieces: a fixed-window limiter whose `acquire_delay()` returns how long to wait, a `send` transport, and a retry loop (plus injected `sleep`, `clock` and `rand` so tests are instant and deterministic). Retry only timeouts, connection errors, 429 and 5xx; fail fast on every other 4xx. Wait for Retry-After if the server sends it, otherwise use full jitter, `uniform(0, min(cap, base × 2^(attempt−1)))`, up to a maximum number of attempts, then raise. Log one JSON line per attempt (attempt, status, retryable). Jitter prevents synchronised retry storms. Non-idempotent POSTs need an idempotency key reused across attempts. Add a circuit breaker and metrics on retry and 429 rates, and treat rising 429s as a conversation with the customer.

**Cheat sheet**

1. **Ask:** published limits? Retry-After sent? which calls are idempotent? latency budget? where do logs go?
2. **Tests first:** success, retry 503, no retry on 400, give up after N, Retry-After honoured, backoff schedule, network errors retried, limiter waits, JSON logs.
3. **Build:** limiter → loop(attempts) → classify → Retry-After or full-jitter backoff → log each attempt.
4. **Cost:** O(attempts) time, O(1) space.
5. **Follow-ups:** idempotency key for POST; circuit breaker; metrics on 429 and retry rates.

### Background you need

#### 1. HTTP status codes in one table

| Code | Meaning | Retry? |
|---|---|---|
| 2xx | Success. | — |
| 400, 401, 403, 404, 422 | Your request is wrong, unauthorised or not found. | **No.** Retrying hides real bugs, and repeated 401s can lock accounts. |
| 429 | Too many requests: you hit the rate limit. | Yes, after waiting (honour `Retry-After`). |
| 500, 502, 503, 504 | Server-side trouble, often temporary. | Yes, with backoff. |
| Timeout / connection error | No response at all. | Yes, but see idempotency. |

#### 2. Exponential backoff with full jitter

Doubling the wait gives a struggling server room to recover. But if 1,000 clients all wait exactly 1s, 2s, 4s, they hit the server together each time (a "retry storm"). **Full jitter** picks a random wait between 0 and the backoff value:

```python
import random

base, cap = 0.5, 8.0
rng = random.Random(42)                               # seeded only so the output is repeatable
for attempt in range(1, 6):
    ceiling = min(cap, base * 2 ** (attempt - 1))
    print(attempt, ceiling, round(rng.uniform(0, ceiling), 2))
```

```text
1 0.5 0.32
2 1.0 0.03
3 2.0 0.55
4 4.0 0.89
5 8.0 5.89
```

#### 3. Injecting time and randomness

Real retry code sleeps for seconds and uses random numbers, which makes tests slow and flaky. Pass `sleep`, `clock` and `rand` in as parameters. Production uses `time.sleep`, `time.monotonic` and `random.uniform`; tests pass fakes that **record** sleeps and **advance** a fake clock instantly.

```python
class FakeTime:
    def __init__(self):
        self.t, self.sleeps = 0.0, []

    def clock(self):
        return self.t

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.t += seconds                 # time passes instantly

ft = FakeTime()
ft.sleep(1.5)
print(ft.clock(), ft.sleeps)
```

```text
1.5 [1.5]
```

#### 4. Structured logs

Instead of `"retrying after error"`, log a JSON object per attempt: `{"event": "failure", "attempt": 2, "status": 503, "retryable": true}`. Log tools can then filter, count and graph them: "how many 429s per hour?".

#### 5. pytest in one minute (and `caplog`)

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line.

pytest also has built-in **fixtures**, parameters it fills in for you. `caplog` captures log records, so a test can check what was logged. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| What are the published limits (L per window)? Do they send `Retry-After`? | Limiter settings; wait source. | Known L → client-side limiter. `Retry-After` sent → honour it over your own backoff. |
| Which calls are safe to repeat? Do any create or change data? | Duplicate side effects. | All reads → retry freely. POSTs that create things → idempotency keys (see Follow-ups). |
| Is there a latency budget for the whole call, including retries? | Caps attempts and waits. | E.g. 10s → choose `max_attempts` and `cap` to fit, or add a deadline. |
| Which failures should surface to the user, and which queue for later? | Error handling contract. | Surface → raise a clear exception. Queue → hand failures to a dead-letter queue. |
| Where do logs go, and what does on-call need? | Log format. | Central log tool → one JSON line per attempt with attempt, status, retryable. |

**If they say "your call", state your defaults out loud:**

> "Limit L per fixed window, enforced client-side; honour Retry-After when present; retry timeouts, connection errors, 429 and 5xx with full-jitter backoff up to 5 attempts; fail fast on other 4xx; raise a clear error when giving up; one JSON log line per attempt."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass. Everything slow or random (send, sleep, clock, rand) is injected, so these run instantly and deterministically."

#### Work one scenario by hand

```text
attempt 1: send → 503          retryable → no Retry-After → sleep backoff(1)
attempt 2: send → 429, Retry-After: 3   → sleep 3
attempt 3: send → 200 "ok"     → return "ok"
logs: failure#1(503), failure#2(429), success#3(200)
```

#### The tests, one per requirement

Code in `client.py`, tests in `test_client.py`.

```python
# file: test_client.py
import json
import logging

import pytest

from client import FixedWindowLimiter, RequestFailed, call_with_retry

REQUEST = {"method": "GET", "path": "/v1/tickets", "headers": {}}


class FakeTime:
    def __init__(self):
        self.t, self.sleeps = 0.0, []

    def clock(self):
        return self.t

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.t += seconds


@pytest.fixture
def ft():
    return FakeTime()


def scripted(*responses):
    """A fake transport that replays responses (or raises exceptions) in order."""
    replies = iter(responses)

    def send(request):
        send.calls.append(request)
        reply = next(replies)
        if isinstance(reply, Exception):
            raise reply
        return reply

    send.calls = []
    return send


def call(send, ft, **kwargs):
    limiter = FixedWindowLimiter(100, 1.0, clock=ft.clock)
    kwargs.setdefault("rand", lambda lo, hi: hi)          # deterministic: always the ceiling
    return call_with_retry(send, REQUEST, limiter, sleep=ft.sleep, **kwargs)


def test_success_on_the_first_try(ft):
    send = scripted((200, "ok", {}))
    assert call(send, ft) == "ok"
    assert len(send.calls) == 1 and ft.sleeps == []


def test_retries_a_503_then_succeeds(ft):
    send = scripted((503, "", {}), (200, "ok", {}))
    assert call(send, ft) == "ok"
    assert len(send.calls) == 2


def test_does_not_retry_a_400(ft):
    send = scripted((400, "bad", {}))
    with pytest.raises(RequestFailed):
        call(send, ft)
    assert len(send.calls) == 1


def test_gives_up_after_max_attempts(ft):
    send = scripted(*[(503, "", {})] * 3)
    with pytest.raises(RequestFailed) as err:
        call(send, ft, max_attempts=3)
    assert err.value.attempts == 3 and err.value.status == 503


def test_honours_retry_after(ft):
    send = scripted((429, "", {"Retry-After": "3"}), (200, "ok", {}))
    call(send, ft)
    assert ft.sleeps == [3.0]


def test_backoff_doubles_up_to_the_cap(ft):
    send = scripted(*[(503, "", {})] * 5)
    with pytest.raises(RequestFailed):
        call(send, ft, max_attempts=5, base=0.5, cap=3.0)
    assert ft.sleeps == [0.5, 1.0, 2.0, 3.0]


def test_network_errors_are_retried(ft):
    send = scripted(TimeoutError("read timed out"), ConnectionError("reset"), (200, "ok", {}))
    assert call(send, ft) == "ok"


def test_limiter_waits_for_the_next_window(ft):
    limiter = FixedWindowLimiter(3, 1.0, clock=ft.clock)
    assert [limiter.acquire_delay() for _ in range(3)] == [0.0, 0.0, 0.0]
    assert limiter.acquire_delay() == 1.0          # 4th call in the window must wait 1s
    ft.t = 1.0
    assert limiter.acquire_delay() == 0.0          # new window


def test_logs_one_json_line_per_attempt(ft, caplog):
    caplog.set_level(logging.INFO, logger="integration")
    call(scripted((503, "", {}), (200, "ok", {})), ft)
    assert [json.loads(r.getMessage()) for r in caplog.records] == [
        {"event": "failure", "attempt": 1, "status": 503, "retryable": True, "error": None},
        {"event": "success", "attempt": 2, "status": 200},
    ]
```

#### Red: run them against empty stubs

```python
# file: client.py
class RequestFailed(Exception):
    def __init__(self, status, attempts):
        super().__init__(f"request failed after {attempts} attempt(s): status={status}")
        self.status, self.attempts = status, attempts


class FixedWindowLimiter:
    def __init__(self, limit, window, clock):
        pass

    def acquire_delay(self):
        raise NotImplementedError


def call_with_retry(send, request, limiter, **options):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_client.py
```

```text
FFFFFFFFF                                                                                    [100%]
===================================== short test summary info =====================================
FAILED test_client.py::test_success_on_the_first_try - NotImplementedError
FAILED test_client.py::test_retries_a_503_then_succeeds - NotImplementedError
FAILED test_client.py::test_does_not_retry_a_400 - NotImplementedError
FAILED test_client.py::test_gives_up_after_max_attempts - NotImplementedError
FAILED test_client.py::test_honours_retry_after - NotImplementedError
FAILED test_client.py::test_backoff_doubles_up_to_the_cap - NotImplementedError
FAILED test_client.py::test_network_errors_are_retried - NotImplementedError
FAILED test_client.py::test_limiter_waits_for_the_next_window - NotImplementedError
FAILED test_client.py::test_logs_one_json_line_per_attempt - NotImplementedError
9 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. Split the problem: what decides **whether** to send now, and what decides **whether to try again**?
2. Which failures should never be retried, and why?
3. How do you test code that sleeps and uses randomness without slow or flaky tests?

#### The design: three small pieces

1. **Limiter:** `acquire_delay()` returns 0 if a call may go now (and counts it), or how many seconds to wait until the next window.
2. **Transport:** `send(request)` returns `(status, body, headers)` or raises `ConnectionError`/`TimeoutError`. It's injected, so tests use a fake.
3. **Retry loop:** for each attempt: wait for the limiter, send, then classify the result.
   - **Success:** log it and return.
   - **Not retryable, or out of attempts:** log it and raise.
   - **Otherwise:** wait (`Retry-After` if present, else full-jitter backoff) and loop.

#### The plan (say this, then wait for a nod)

> **Say:** "Three pieces, all injected: a fixed-window limiter that tells me how long to wait, the transport, and a retry loop. I retry timeouts, connection errors, 429 and 5xx; any other 4xx fails immediately, because retrying a bad request just hides the bug. Between attempts I honour Retry-After if the server sends it, otherwise exponential backoff with full jitter, capped. Every attempt logs one JSON line. Sleep, clock and randomness are parameters so the tests run instantly."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: the limiter

```python
# file: client.py (replace FixedWindowLimiter)
class FixedWindowLimiter:
    """At most `limit` calls per `window` seconds, in clock-aligned windows."""

    def __init__(self, limit, window, clock):
        self.limit, self.window, self.clock = limit, window, clock
        self.window_start, self.count = clock(), 0

    def acquire_delay(self):
        now = self.clock()
        if now - self.window_start >= self.window:        # a new window has started
            self.window_start, self.count = now, 0
        if self.count < self.limit:
            self.count += 1
            return 0.0
        return self.window - (now - self.window_start)    # wait until this window ends
```

```bash
pytest -q --tb=no -rf test_client.py -k limiter
```

```text
.                                                                                            [100%]
1 passed, 8 deselected in 0.01s
```

#### Stage 2: the retry loop (classification, Retry-After, backoff)

```python
# file: client.py (replace call_with_retry)
import random
import time

RETRYABLE = {429, 500, 502, 503, 504}


def call_with_retry(send, request, limiter, *, max_attempts=5, base=0.5, cap=8.0,
                    sleep=time.sleep, rand=random.uniform):
    for attempt in range(1, max_attempts + 1):
        while (wait := limiter.acquire_delay()) > 0:      # respect the rate limit
            sleep(wait)
        try:
            status, body, headers = send(request)
        except (ConnectionError, TimeoutError):
            status, body, headers = None, None, {}        # no response at all

        if status is not None and status < 400:
            return body

        retryable = status is None or status in RETRYABLE
        if not retryable or attempt == max_attempts:
            raise RequestFailed(status, attempt)

        retry_after = headers.get("Retry-After")
        if retry_after is not None:
            delay = float(retry_after)                    # the server knows best
        else:
            delay = rand(0, min(cap, base * 2 ** (attempt - 1)))   # full jitter
        sleep(delay)
```

```bash
pytest -q --tb=no -rf test_client.py
```

```text
........F                                                                                    [100%]
===================================== short test summary info =====================================
FAILED test_client.py::test_logs_one_json_line_per_attempt - AssertionError: assert [] == [{'even...
1 failed, 8 passed in 0.01s
```

Only logging is left red.

#### Stage 3: one JSON log line per attempt

```python
# file: client.py (replace call_with_retry)
import json
import logging
import random
import time

log = logging.getLogger("integration")
RETRYABLE = {429, 500, 502, 503, 504}


def call_with_retry(send, request, limiter, *, max_attempts=5, base=0.5, cap=8.0,
                    sleep=time.sleep, rand=random.uniform):
    for attempt in range(1, max_attempts + 1):
        while (wait := limiter.acquire_delay()) > 0:
            sleep(wait)
        error = None
        try:
            status, body, headers = send(request)
        except (ConnectionError, TimeoutError) as exc:
            status, body, headers, error = None, None, {}, f"{type(exc).__name__}: {exc}"

        if status is not None and status < 400:
            log.info(json.dumps({"event": "success", "attempt": attempt, "status": status}))
            return body

        retryable = status is None or status in RETRYABLE
        log.warning(json.dumps({"event": "failure", "attempt": attempt, "status": status,
                                "retryable": retryable, "error": error}))
        if not retryable or attempt == max_attempts:
            raise RequestFailed(status, attempt)

        retry_after = headers.get("Retry-After")
        if retry_after is not None:
            delay = float(retry_after)
        else:
            delay = rand(0, min(cap, base * 2 ** (attempt - 1)))
        sleep(delay)
```

```bash
pytest -q --tb=no -rf test_client.py
```

```text
.........                                                                                    [100%]
9 passed in 0.01s
```

**Time:** O(attempts) per call. **Space:** O(1).

### Step 5 · Run everything and refactor

#### Trace: 503 → 429 (Retry-After 3) → 200, with `rand` returning the ceiling

| attempt | limiter wait | response | retryable? | sleep | log line |
|---|---|---|---|---|---|
| 1 | 0 | 503 | yes | backoff: min(8, 0.5×2⁰) = 0.5 | failure#1 503 |
| 2 | 0 | 429, Retry-After 3 | yes | 3.0 (server says) | failure#2 429 |
| 3 | 0 | 200 "ok" | — | — | success#3 200 |

#### Refactor: name the decisions

The loop mixes "is this retryable?" and "how long do I wait?" into the control flow. Pull each into a small named function, so a reader (or the next follow-up) finds each decision in one place. No behaviour change: the tests must stay green.

```python
# file: client.py (replace call_with_retry)
def _is_retryable(status):
    """No response (timeout/connection error), 429 or 5xx in RETRYABLE."""
    return status is None or status in RETRYABLE


def _delay(attempt, headers, base, cap, rand):
    retry_after = headers.get("Retry-After")
    if retry_after is not None:
        return float(retry_after)                               # server-specified wait
    return rand(0, min(cap, base * 2 ** (attempt - 1)))         # full-jitter backoff


def call_with_retry(send, request, limiter, *, max_attempts=5, base=0.5, cap=8.0,
                    sleep=time.sleep, rand=random.uniform):
    """Send with client-side rate limiting, retries on transient failures, JSON logs."""
    for attempt in range(1, max_attempts + 1):
        while (wait := limiter.acquire_delay()) > 0:
            sleep(wait)
        error = None
        try:
            status, body, headers = send(request)
        except (ConnectionError, TimeoutError) as exc:
            status, body, headers, error = None, None, {}, f"{type(exc).__name__}: {exc}"

        if status is not None and status < 400:
            log.info(json.dumps({"event": "success", "attempt": attempt, "status": status}))
            return body

        retryable = _is_retryable(status)
        log.warning(json.dumps({"event": "failure", "attempt": attempt, "status": status,
                                "retryable": retryable, "error": error}))
        if not retryable or attempt == max_attempts:
            raise RequestFailed(status, attempt)
        sleep(_delay(attempt, headers, base, cap, rand))
```

```bash
pytest -q --tb=no -rf test_client.py
```

```text
.........                                                                                    [100%]
9 passed in 0.01s
```

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Some of these calls are POSTs that create tickets. What if a retry succeeds twice?"

**The trap:** if a POST times out, did it fail, or did it succeed with the response lost? Retrying might create two tickets.

**What changes:** attach an **idempotency key**, a unique id per *logical* request, sent as a header and **reused on every attempt**. A server (or your middleware) that supports it ignores duplicates with a key it has already seen. GET, PUT and DELETE are idempotent by definition; POST and PATCH need the key.

**Test first:**

```python
# file: test_client.py (append)
def test_posts_reuse_one_idempotency_key_across_retries(ft):
    send = scripted((503, "", {}), TimeoutError("lost"), (201, "created", {}))
    post = {"method": "POST", "path": "/v1/tickets", "headers": {}}
    call_with_retry(send, post, FixedWindowLimiter(100, 1.0, clock=ft.clock),
                    sleep=ft.sleep, rand=lambda lo, hi: hi)
    keys = {req["headers"].get("Idempotency-Key") for req in send.calls}
    assert len(keys) == 1 and None not in keys
    assert post["headers"] == {}                       # the caller's request is untouched
```

```bash
pytest -q --tb=no -rf test_client.py -k idempotency
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_client.py::test_posts_reuse_one_idempotency_key_across_retries - assert (1 == 1 and N...
1 failed, 9 deselected in 0.01s
```

Add the key once, before the loop, on a copy of the request:

```python
# file: client.py (replace call_with_retry)
import uuid

IDEMPOTENT_METHODS = {"GET", "HEAD", "PUT", "DELETE", "OPTIONS"}


def _with_idempotency_key(request):
    if request.get("method", "GET").upper() in IDEMPOTENT_METHODS:
        return request
    headers = dict(request.get("headers") or {})
    headers.setdefault("Idempotency-Key", uuid.uuid4().hex)   # one key per logical request
    return {**request, "headers": headers}


def call_with_retry(send, request, limiter, *, max_attempts=5, base=0.5, cap=8.0,
                    sleep=time.sleep, rand=random.uniform):
    """Send with client-side rate limiting, retries on transient failures, JSON logs."""
    request = _with_idempotency_key(request)                  # before the loop: same key every attempt
    for attempt in range(1, max_attempts + 1):
        while (wait := limiter.acquire_delay()) > 0:
            sleep(wait)
        error = None
        try:
            status, body, headers = send(request)
        except (ConnectionError, TimeoutError) as exc:
            status, body, headers, error = None, None, {}, f"{type(exc).__name__}: {exc}"

        if status is not None and status < 400:
            log.info(json.dumps({"event": "success", "attempt": attempt, "status": status}))
            return body

        retryable = _is_retryable(status)
        log.warning(json.dumps({"event": "failure", "attempt": attempt, "status": status,
                                "retryable": retryable, "error": error}))
        if not retryable or attempt == max_attempts:
            raise RequestFailed(status, attempt)
        sleep(_delay(attempt, headers, base, cap, rand))
```

```bash
pytest -q --tb=no -rf test_client.py
```

```text
..........                                                                                   [100%]
10 passed in 0.01s
```

> **Say:** "If the API doesn't support idempotency keys, I'd only retry a POST when I know the first attempt never reached the server, such as a connection refused, not a read timeout."

#### Follow-up 2: "The upstream is down for minutes. Every worker is burning its retry budget"

**What changes:** add a **circuit breaker** shared by all calls to that upstream:

- **Closed** (normal): calls go through; count consecutive failures.
- **Open:** after `threshold` consecutive failures, fail **immediately** without calling, for `cooldown` seconds.
- **Half-open:** after the cooldown, let a call through. Success closes the circuit; failure opens it again.

**Test first:**

```python
# file: test_client.py (append)
from client import CircuitBreaker, CircuitOpen


def test_circuit_opens_after_repeated_failures_and_recovers(ft):
    breaker = CircuitBreaker(threshold=2, cooldown=30, clock=ft.clock)
    send = scripted((503, "", {}), (503, "", {}), (200, "back", {}))
    limiter = FixedWindowLimiter(100, 1.0, clock=ft.clock)
    attempt_once = dict(max_attempts=1, sleep=ft.sleep, breaker=breaker)

    for _ in range(2):
        with pytest.raises(RequestFailed):
            call_with_retry(send, REQUEST, limiter, **attempt_once)
    with pytest.raises(CircuitOpen):
        call_with_retry(send, REQUEST, limiter, **attempt_once)
    assert len(send.calls) == 2                       # the open circuit didn't call upstream

    ft.t += 30                                        # cooldown passes → half-open
    assert call_with_retry(send, REQUEST, limiter, **attempt_once) == "back"
    assert breaker.failures == 0                      # success closed it
```

```python
# file: client.py (append)
class CircuitOpen(Exception):
    pass


class CircuitBreaker:
    def __init__(self, threshold, cooldown, clock=time.monotonic):
        pass
```

```bash
pytest -q --tb=no -rf test_client.py -k circuit
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_client.py::test_circuit_opens_after_repeated_failures_and_recovers - TypeError: call_...
1 failed, 10 deselected in 0.01s
```

```python
# file: client.py (replace CircuitBreaker)
class CircuitBreaker:
    """Closed → (threshold consecutive failures) → open → (cooldown) → half-open."""

    def __init__(self, threshold: int, cooldown: float, clock=time.monotonic):
        self.threshold, self.cooldown, self.clock = threshold, cooldown, clock
        self.failures = 0
        self.opened_at: float | None = None

    def before_call(self) -> None:
        if self.opened_at is not None and self.clock() - self.opened_at < self.cooldown:
            raise CircuitOpen("upstream unavailable; failing fast")
        # closed, or half-open: let this call through

    def record(self, ok: bool) -> None:
        if ok:
            self.failures, self.opened_at = 0, None
        else:
            self.failures += 1
            if self.failures >= self.threshold:
                self.opened_at = self.clock()
```

```python
# file: client.py (replace call_with_retry)
def call_with_retry(send, request, limiter, *, max_attempts=5, base=0.5, cap=8.0,
                    sleep=time.sleep, rand=random.uniform, breaker=None):
    """Send with client-side rate limiting, retries on transient failures, JSON logs."""
    request = _with_idempotency_key(request)
    for attempt in range(1, max_attempts + 1):
        if breaker:
            breaker.before_call()                             # raises CircuitOpen when open
        while (wait := limiter.acquire_delay()) > 0:
            sleep(wait)
        error = None
        try:
            status, body, headers = send(request)
        except (ConnectionError, TimeoutError) as exc:
            status, body, headers, error = None, None, {}, f"{type(exc).__name__}: {exc}"

        if status is not None and status < 400:
            if breaker:
                breaker.record(ok=True)
            log.info(json.dumps({"event": "success", "attempt": attempt, "status": status}))
            return body

        retryable = _is_retryable(status)
        if breaker and retryable:
            breaker.record(ok=False)                          # upstream trouble, not our bad request
        log.warning(json.dumps({"event": "failure", "attempt": attempt, "status": status,
                                "retryable": retryable, "error": error}))
        if not retryable or attempt == max_attempts:
            raise RequestFailed(status, attempt)
        sleep(_delay(attempt, headers, base, cap, rand))
```

```bash
pytest -q --tb=no -rf test_client.py
```

```text
...........                                                                                  [100%]
11 passed in 0.01s
```

Note the design choice: a 400 doesn't trip the breaker. That's *our* bug, not the upstream being down.

#### Follow-up 3: "How would you run this in production?"

- **Metrics next to the logs:** request count, retry rate, 429 rate, breaker state. Alert on a rising 429 rate.
- **Rising 429s are a conversation, not just a config change:** either your traffic grew (ask the customer for a higher limit, or batch and cache) or their limit dropped.
- **`Retry-After` can also be an HTTP date** (`Wed, 21 Oct 2026 07:28:00 GMT`), not just seconds. Parse both. The test you'd add: a date 5 seconds after an injected "now" sleeps 5.
- **A deadline:** cap the total time across attempts to fit the caller's latency budget.

> **Say:** "The last decision is with the customer: when we're rate-limited for minutes, do we drop, queue or degrade? I'd want that agreed, not decided in code."

### Mock dialogue

**Interviewer:** You're integrating with a partner API that allows a fixed number of calls per second and sometimes fails. Build a client that's reliable and debuggable.

**You:** What are the published limits, and do they send Retry-After? Which calls create or change data? And is there a latency budget for the whole call?

**Interviewer:** Ten per second, Retry-After on 429s, mostly reads, a few POSTs. Keep it under ten seconds.

> *Why this works:* These are the questions you’d ask a real customer. In a customer-facing loop, the clarifying phase is itself evaluated as customer-facing behaviour.

**You:** Before coding, the tests, with everything slow or random injected: success first time, retry a 503, never retry a 400, give up after N attempts, honour Retry-After, a backoff schedule that doubles up to a cap, network errors retried, the limiter making me wait for the next window, and one JSON log line per attempt.

**You:** Design: a fixed-window limiter that tells me how long to wait, an injected transport, and a retry loop. I retry timeouts, connection errors, 429 and 5xx with full-jitter backoff, using Retry-After when present. Other 4xx fail fast; retrying a 401 can lock an account.

**Interviewer:** Why jitter?

**You:** Without it, every worker that failed together retries together, and we hammer the API in waves. Randomising the wait spreads them out.

**You:** All green. I'll pull "is it retryable" and "how long to wait" into named functions so they're easy to find and change.

**Interviewer:** Some of these calls are POSTs that create tickets. What happens if a retry succeeds twice?

**You:** We'd create a duplicate. I'll add a test that every attempt of one POST carries the same Idempotency-Key, then generate the key once, before the loop. If the API doesn't support keys, I only retry POSTs when I know the first attempt never reached the server.

**Interviewer:** And if they're down for ten minutes?

**You:** A circuit breaker: after a few consecutive failures, fail fast for a cooldown instead of every worker burning its retries, then let one call probe. And I'd want metrics on 429 and retry rates. If 429s climb, that's a conversation with the customer about limits, not just a tuning change.

> *Why this works:* The last question moves from code to the customer relationship. That’s the difference between a strong senior answer and a staff-level answer.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Retrying 400/401/403 | Hides real bugs; can lock accounts. | `test_does_not_retry_a_400` |
| Retrying forever | Hangs callers; burns the upstream. | `test_gives_up_after_max_attempts` |
| Ignoring `Retry-After` | Retrying before the server is ready gets more 429s. | `test_honours_retry_after` |
| Backoff without a cap or without jitter | Huge waits, or synchronised retry storms. | `test_backoff_doubles_up_to_the_cap` (cap); explain jitter. |
| Catching every exception | Retries your own bugs (e.g. `KeyError`) as if they were network errors. | Catch only `ConnectionError`/`TimeoutError`. |
| Real `sleep`/`random` in tests | Slow, flaky tests. | Inject them, as every test here does. |
| New idempotency key per attempt | Duplicates aren't detected. | `test_posts_reuse_one_idempotency_key_across_retries` |
| Unstructured log messages | Can't filter or count failures in production. | `test_logs_one_json_line_per_attempt` |
| `Retry-After` parsed only as seconds | Crashes on the HTTP-date form. | Add a date-form test (Follow-up 3). |
