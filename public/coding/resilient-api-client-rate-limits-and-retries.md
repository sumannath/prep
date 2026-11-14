### Problem

You're integrating with a customer's API that allows `L` calls per window and sometimes fails. Write a client that respects the limit, retries transient failures with exponential backoff, and logs each attempt in a structured way.

### Interview refresher

Three injected pieces: a fixed-window limiter whose `acquire_delay()` returns how long to wait, a `send` transport, and a retry loop. Retry only timeouts, connection errors, 429 and 5xx; fail fast on every other 4xx. Wait for Retry-After if the server sends it, otherwise use full jitter, `uniform(0, min(cap, base × 2^(attempt−1)))`, up to a maximum number of attempts, then raise. Log one JSON line per attempt (attempt, status, retryable). Jitter prevents synchronised retry storms. Non-idempotent POSTs need an idempotency key. Add a circuit breaker and metrics on retry and 429 rates, and treat rising 429s as a conversation with the customer.

### Hints

1. Separate concerns: limiter, retry policy, transport. Inject time and sleep so it's testable.
2. Classify errors: 429 and 5xx and timeouts are retryable; other 4xx are not.
3. Honour Retry-After when the server sends it; otherwise use full-jitter backoff.

### Approach

A fixed-window limiter tells the caller how long to wait. The retry loop waits for capacity, sends, and on a retryable failure sleeps `uniform(0, min(cap, base·2^attempt))`. Every attempt emits one JSON log line with attempt number, status and decision.

### Deep dive

#### What the interviewer is really testing

This is closest to real integration work: making an integration behave well against an API you don’t control. They want good error classification, safe retries, and logs someone could debug at 2am.

#### Why separate three concerns

- **The limiter** decides when you’re allowed to send.
- **The retry policy** decides whether a failure deserves another try, and how long to wait.
- **The transport** actually sends.

Keeping them apart, and passing `send`, `sleep` and the clock in as parameters, lets you test every path with fakes: no network, no real waiting.

#### Why classify errors

- **429 Too Many Requests**: you’re going too fast. Retrying later is exactly right.
- **5xx and timeouts**: a transient server or network problem. A retry often succeeds.
- **Other 4xx** (400, 401, 403, 404): the request itself is wrong. Retrying wastes time, hides the bug, and repeated 401s can lock an account.

#### Why exponential backoff

Each failure is more evidence the server is struggling. Waiting 0.5s, then 1s, 2s, 4s gives it progressively more room to recover instead of hammering it.

#### Why jitter

If a hundred workers fail at the same instant and all wait exactly 1 second, they all retry together and fail again: a retry storm. Picking a random wait between 0 and the backoff value (“full jitter”) spreads them out.

#### Why a cap and a maximum attempt count

The cap stops waits growing absurdly long. The attempt limit bounds total latency and surfaces the failure to the caller instead of retrying forever.

#### Why honour Retry-After

If the server says how long to wait, it knows its own state better than your formula.

#### Why the limiter returns a delay

`acquire_delay()` says how long to wait instead of sleeping itself. That keeps the limiter simple and testable, and lets the caller choose how to wait (sleep, async await, or give up).

#### Why structured logs

One JSON line per attempt, with attempt number, status and retryability, lets you query retry rates and error patterns in Splunk instead of reading free text. You already do this kind of log tracing, so it’s a strong story to tell here.

#### The trap: non-idempotent calls

If a POST that creates a ticket times out, did it fail, or succeed with the response lost? Retrying might create two tickets. The fix is an idempotency key: a unique id per logical request that the server uses to ignore duplicates.

### Reference solution

```python
import json
import logging
import random
import time

log = logging.getLogger("integration")
RETRYABLE = {429, 500, 502, 503, 504}


class FixedWindowLimiter:
    def __init__(self, limit: int, window: float, clock=time.monotonic):
        self.limit, self.window, self.clock = limit, window, clock
        self.window_start, self.count = clock(), 0

    def acquire_delay(self) -> float:
        now = self.clock()
        if now - self.window_start >= self.window:
            self.window_start, self.count = now, 0
        if self.count < self.limit:
            self.count += 1
            return 0.0
        return self.window - (now - self.window_start)


def call_with_retry(send, request, limiter, *, max_attempts=5,
                    base=0.5, cap=8.0, sleep=time.sleep):
    for attempt in range(1, max_attempts + 1):
        while (wait := limiter.acquire_delay()) > 0:
            sleep(wait)
        try:
            status, body, headers = send(request)
        except (ConnectionError, TimeoutError) as exc:
            status, body, headers = None, str(exc), {}

        if status is not None and status < 400:
            log.info(json.dumps({"event": "success", "attempt": attempt, "status": status}))
            return body

        retryable = status is None or status in RETRYABLE
        log.warning(json.dumps({"event": "failure", "attempt": attempt,
                                "status": status, "retryable": retryable}))
        if not retryable or attempt == max_attempts:
            raise RuntimeError(f"request failed after {attempt} attempt(s): status={status}")

        retry_after = headers.get("Retry-After")
        delay = float(retry_after) if retry_after else random.uniform(0, min(cap, base * 2 ** (attempt - 1)))
        sleep(delay)


# --- test with a flaky fake transport ---
responses = iter([(503, "", {}), (429, "", {"Retry-After": "1"}), (200, "ok", {})])
slept = []
result = call_with_retry(lambda _: next(responses), {"path": "/rest/api/3/issue"},
                         FixedWindowLimiter(10, 1.0), sleep=slept.append)
assert result == "ok" and len(slept) == 2 and slept[1] == 1.0
```

**Time:** O(attempts)  
**Space:** O(1)

### Questions to ask before coding

- What are the provider’s published limits, and do they send Retry-After?
- Which calls are safe to repeat, and do any create or change data?
- Is there a latency budget for the whole call, including retries?
- Where do logs go, and what do on-call engineers need from them?
- Should failures surface to the end user, or queue for later?

### Interview walkthrough

**Interviewer:** You’re integrating with a customer API that allows a fixed number of calls per minute and sometimes fails. Write a client that handles that.

**You:** A few questions about the API. Do they publish the limit, and do they send a Retry-After header on 429?

**Interviewer:** 100 per minute, and sometimes Retry-After.

**You:** Do any of these calls create or change data? That decides what’s safe to retry.

**Interviewer:** Assume reads for now.

**You:** And is there a latency budget? If a user is waiting, I can’t retry for a minute.

**Interviewer:** Background job, so up to a minute is fine.

> *Why this works:* These are the questions you’d ask a real customer. In a customer-facing loop, the clarifying phase is itself evaluated as customer-facing behaviour.

**You:** Plan: three pieces. A fixed-window limiter that tells me how long to wait before sending. A retry loop that retries timeouts, 429 and 5xx with exponential backoff and random jitter, honouring Retry-After, up to five attempts; other 4xx fail immediately. Every attempt logs one JSON line.

**Interviewer:** Why the jitter?

**You:** If many workers fail together and wait identical times, they retry together and overload the API again. Randomising spreads them out.

**You:** For testing I inject a fake transport and a fake sleep. Sequence: 503, then 429 with Retry-After of 1, then 200. The result is ok, two sleeps happened, and the second was exactly 1 second.

**Interviewer:** Now some calls are POSTs that create issues.

**You:** Then a timeout is ambiguous: the issue may have been created. I’d send an idempotency key with each logical request so the server ignores duplicates. Does the customer’s API support that? If not, I’d only retry POSTs when I’m sure the request never left, like connection refused, and otherwise check whether the issue exists before retrying.

**Interviewer:** Anything else for production?

**You:** A circuit breaker, so if the API is down we stop sending for a while instead of every worker burning its retries. And metrics on retry rate and 429 rate, with an alert. Rising 429s usually mean our usage outgrew the customer’s plan, which is a conversation with the customer, not a code change. Who would own that conversation on your side?

> *Why this works:* The last question moves from code to the customer relationship. That’s the difference between a strong senior answer and a staff-level answer.

### Scale-up follow-up

**Interviewer adds:** “Some of these calls are POSTs that create tickets. What happens if a retry succeeds twice?”

Retries of non-idempotent calls can duplicate work. Attach an idempotency key per logical request and have the server (or your middleware) dedupe on it; otherwise only retry POSTs when you know the first attempt never reached the server. Add a circuit breaker so a dead upstream doesn't absorb every worker's retry budget, and emit metrics (retry rate, 429 rate) alongside the logs — this is the production-readiness story a staff engineer is expected to tell.

### Where candidates slip

- Retrying 400/401/403, which hides real bugs and can lock accounts.
- Backoff without jitter, causing synchronised retry storms across workers.
- Parsing Retry-After only as seconds; it can also be an HTTP date.
