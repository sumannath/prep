# Min Stack — Complete Interview Lesson (LeetCode 155)

**Difficulty:** Medium · **Topics:** Stack, Design · **What it really tests:** designing an *invariant* (not an algorithm), handling duplicates, and defending complexity claims under follow-up questions.

---

## 1. Problem Restatement (in your own words)

Build a stack ADT with four operations — `push(val)`, `pop()`, `top()`, `getMin()` — where **every operation runs in O(1) time**.

Three things to say out loud before coding:

1. `push`, `pop`, `top` are trivial O(1) with a dynamic array. **The entire problem is `getMin`.**
2. `pop()` returns nothing here (LeetCode signature is `void`). Some variants want the popped value returned — confirm the signature.
3. `pop`, `top`, `getMin` are **guaranteed to be called only on non-empty stacks**, so underflow handling is out of contract — but mention you'd still raise an exception defensively in production code.

---

## 2. Decoding the Constraints

| Constraint | What it actually tells you |
|---|---|
| `−2^31 ≤ val ≤ 2^31 − 1` | Full signed 32-bit range. Two consequences: (a) **differences of two legal values can overflow int32** — e.g., `(2^31 − 1) − (−2^31) = 2^32 − 1 > 2^31 − 1` — which matters for the space-optimized variant in Java/C++; (b) sentinel tricks using `INT_MIN`/`INT_MAX` are fragile. Python is immune (arbitrary-precision ints). |
| At most `3 × 10^4` calls | The input is tiny — even an O(n) `getMin` does at most ~9×10⁸ value visits, borderline-fast. So this problem is a **design test**, not a performance test: the O(1) requirement is the spec, not a headroom hint. |
| `pop`/`top`/`getMin` always on non-empty stacks | No underflow branch needed. Say: "I'll still guard with an exception for production robustness, but per the constraints I won't clutter the code." |
| Values not stated to be distinct | **Duplicates are legal** — and duplicate minima are exactly where the naive solution breaks (Section 9). |

---

## 3. Baseline Attempts (Brute Force) — and Why Each Fails

### 3.1 Brute force: scan the stack on `getMin`

Keep one array. `push`/`pop`/`top` are O(1). `getMin` scans all elements.

Worked trace on the official example (`bottom → top` shown):

| Operation | Stack after | `getMin` work | Output |
|---|---|---|---|
| `push(-2)` | `[-2]` | — | — |
| `push(0)` | `[-2, 0]` | — | — |
| `push(-3)` | `[-2, 0, -3]` | — | — |
| `getMin()` | `[-2, 0, -3]` | scans **3** elements | `-3` |
| `pop()` | `[-2, 0]` | — | — |
| `top()` | `[-2, 0]` | — | `0` |
| `getMin()` | `[-2, 0]` | scans **2** elements | `-2` |

Outputs are correct, but `getMin` is O(n) — violates the stated requirement. State this baseline in the interview in one sentence, then move on: it frames the insight.

### 3.2 The tempting trap: a single "running min" variable

"Track `min` as I push; on push, `min = min(min, val)`." Breaks on `pop`:

| Op | Stack after | Stored `min` | True min | Verdict |
|---|---|---|---|---|
| `push(-2)` | `[-2]` | −2 | −2 | ✓ |
| `push(0)` | `[-2, 0]` | −2 | −2 | ✓ |
| `push(-3)` | `[-2, 0, -3]` | −3 | −3 | ✓ |
| `getMin()` | | −3 | −3 | ✓ |
| `pop()` | `[-2, 0]` | **−3** | **−2** | ✗ stale |

Once you pop the minimum, the previous minimum is gone — recovering it requires an O(n) rescan. The fix is to **remember every past minimum**, not just the current one.

### 3.3 Side note: a min-heap is the wrong tool

A binary heap gives O(1) `getMin` but O(log n) push and O(log n) pop-by-value (sift-up/sift-down each walk a root-to-leaf path, which is Θ(log n) in a heap of n items), so it fails the O(1) contract. Worth one sentence if the interviewer suggests it.

---

## 4. The Core Insight

> **The current minimum is a function of the stack's contents — and the stack only changes at one end. Therefore the sequence of "minimum so far" values itself evolves in LIFO order. It is its own stack.**

A precise way to say it: think of the stack as a **prefix** of pushes. If `minpref[i]` is the minimum of the bottom `i+1` elements, then:

- **Push** extends the prefix by one: `minpref[i+1] = min(minpref[i], val)` — computable in O(1) from the previous prefix min.
- **Pop** shrinks the prefix by one — and the prefix min of the shorter prefix is *exactly the value we stored one step earlier*.

So if you store the prefix-minimum **at every depth** (or only at depths where it changed), `getMin()` is just "read the prefix min at the current top depth." Two concrete formulations follow.

---

## 5. Optimal Approach A — Two Stacks with Lazy Min Push (recommended in interviews)

**Structure:**
- `stack`: all pushed values (the real stack).
- `min_stack`: markers only. Push onto `min_stack` **iff it's empty or `val <= min_stack[-1]`**. So `min_stack` is non-increasing from bottom to top, and its top is always the current minimum.

**Operations:**
- `push(v)`: always append to `stack`; append to `min_stack` only if `v <=` current min.
- `pop()`: pop `stack`; **if the popped value equals `min_stack[-1]`, pop `min_stack` too.** (Compare the *popped value* against the min-stack top *before* discarding it — comparing after popping main but against the wrong element is a classic desync bug.)
- `top()`: `stack[-1]`.
- `getMin()`: `min_stack[-1]`.

```python
class MinStack:
    def __init__(self):
        self.stack = []       # all values, bottom -> top
        self.min_stack = []   # min-so-far markers, non-increasing bottom -> top

    def push(self, val: int) -> None:
        self.stack.append(val)
        # '<=' is essential, not '<': a duplicate of the current min must get
        # its own marker, or pops will desync the two stacks (see Section 9).
        if not self.min_stack or val <= self.min_stack[-1]:
            self.min_stack.append(val)

    def pop(self) -> None:
        val = self.stack.pop()
        if val == self.min_stack[-1]:
            self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]
```

**Invariant (say this sentence):** *at every moment, `min_stack[-1] == min(stack)`.* Push maintains it: if `val` ≤ the min it becomes the min and gets a marker; otherwise nothing changes. Pop maintains it: by the `<=` rule, every occurrence of the current min on the main stack has a matching marker, so removing one occurrence removes exactly one marker; popping a non-min changes nothing.

**Trace on the official example:**

| Op | `stack` (bottom→top) | `min_stack` | Notes | Output |
|---|---|---|---|---|
| `push(-2)` | `[-2]` | `[-2]` | min stack empty → push marker | |
| `push(0)` | `[-2, 0]` | `[-2]` | `0 > -2` → no marker | |
| `push(-3)` | `[-2, 0, -3]` | `[-2, -3]` | `-3 ≤ -2` → marker | |
| `getMin()` | | | | **−3** |
| `pop()` | `[-2, 0]` | `[-2]` | popped −3 == min top −3 → pop both | |
| `top()` | | | | **0** |
| `getMin()` | | | | **−2** |

**Memory note:** the marker is written only when the minimum changes (or ties it), so typical inputs leave `min_stack` far shorter than `stack`. Worst case (strictly decreasing input) it's length n.

---

## 6. Optimal Approach B — One Stack of `(value, min_so_far)` Pairs

Same idea, no sync logic: every entry carries the prefix minimum at its own depth.

```python
class MinStack:
    def __init__(self):
        # entry = (value, minimum of everything from the bottom through this depth)
        self.stack = []

    def push(self, val: int) -> None:
        min_so_far = min(val, self.stack[-1][1]) if self.stack else val
        self.stack.append((val, min_so_far))

    def pop(self) -> None:
        self.stack.pop()

    def top(self) -> int:
        return self.stack[-1][0]   # index 0 = the value (a classic slip: swapping 0 and 1)

    def getMin(self) -> int:
        return self.stack[-1][1]   # index 1 = the running min
```

**Trace on the official example** (values and prefix minima shown separately):

```
bottom ─────────────────────────────► top
value:      -2     0    -3
prefix min: -2    -2    -3      ← getMin() reads the top depth's prefix min
```

| Op | Stack after (`(value, prefix_min)`) | Output |
|---|---|---|
| `push(-2)` | `[(-2, -2)]` | |
| `push(0)` | `[(-2,-2), (0,-2)]` | |
| `push(-3)` | `[(-2,-2), (0,-2), (-3,-3)]` | |
| `getMin()` | | **−3** |
| `pop()` | `[(-2,-2), (0,-2)]` | |
| `top()` | | **0** |
| `getMin()` | | **−2** |

**A vs B trade-off:** B is simpler to reason about and has no cross-stack sync to get wrong, but always stores 2 slots per element. A stores `n + #min-events ≤ 2n` and is often much smaller. Both are perfectly acceptable answers; pick one, name the other, move on.

---

## 7. Follow-up: O(1) Auxiliary Space via Value Encoding (advanced)

Interviewers sometimes ask: "Can you do it with O(1) extra space?" The honest framing: **any** implementation must store the n not-yet-popped values (they must come back in LIFO order), so total storage is Ω(n) — what we can eliminate is the *auxiliary* second structure, by encoding the minimum history into the stored values themselves.

Store `diff = val − min_at_push_time` instead of `val`, plus one scalar `self.min`:

```python
class MinStack:
    def __init__(self):
        self.stack = []   # stores diffs, not raw values
        self.min = 0      # current minimum; meaningful once non-empty

    def push(self, val: int) -> None:
        if not self.stack:
            self.min = val
            self.stack.append(0)            # first element: diff 0 against itself
        else:
            diff = val - self.min           # >= 0: old min survives; < 0: val is a new min
            self.stack.append(diff)
            if diff < 0:
                self.min = val

    def pop(self) -> None:
        diff = self.stack.pop()
        if diff < 0:
            self.min = self.min - diff      # diff = new_min - old_min < 0 → restores old_min

    def top(self) -> int:
        diff = self.stack[-1]
        return self.min + diff if diff >= 0 else self.min

    def getMin(self) -> int:
        return self.min
```

Why `top` works: `diff ≥ 0` means that push did not change the min, so the min at its push time equals the current min and `val = min + diff`; `diff < 0` means that push *was* the new min, so `val == self.min`.

**Trace on the official example:**

| Op | `stack` (diffs) | `self.min` | Output |
|---|---|---|---|
| `push(-2)` | `[0]` | −2 | |
| `push(0)` | `[0, 2]` | −2 | |
| `push(-3)` | `[0, 2, -1]` | −3 | |
| `getMin()` | | | **−3** |
| `pop()` | `[0, 2]` | −2 | |
| `top()` | | | **0** (= −2 + 2) |
| `getMin()` | | | **−2** |

⚠️ **Overflow warning (this is why the constraint decoding mattered):** the worst-case diff is `(2^31 − 1) − (−2^31) = 2^32 − 1`, which exceeds the signed 32-bit maximum, so in **Java or C++ the diffs must be stored in a 64-bit type** (`long` / `long long`). Python ints are arbitrary-precision, so the code above just works. Leading with this caveat in the interview is a strong signal.

---

## 8. Complexity Summary

| Operation | A: two stacks | B: pairs | C: encoded | Brute force (scan) |
|---|---|---|---|---|
| `push` | O(1) | O(1) | O(1) | O(1) |
| `pop` | O(1) | O(1) | O(1) | O(1) |
| `top` | O(1) | O(1) | O(1) | O(1) |
| `getMin` | O(1) | O(1) | O(1) | O(n) |
| Auxiliary space | O(n) worst (n + #min-events) | O(n) (2n slots always) | O(1) beyond the n stored diffs | O(1) |

Notes worth saying explicitly:

- These O(1) bounds are **worst-case**, not amortized — each operation does constant work unconditionally.
- One Python precision point: `list.append` is *amortized* O(1) because CPython's dynamic arrays over-allocate geometrically (total copy cost across m appends is O(m)); if a pedantic interviewer demands hard worst-case O(1), a preallocated ring buffer removes even that — almost never asked.
- Approach A's pop does at most one extra comparison; no amortization hidden there.

---

## 9. Common Mistakes and Language Gotchas

**Logical bugs (in rough order of how often they appear in interviews):**

1. **`<` instead of `<=` when pushing the min marker.** This is *the* bug of this problem. Failing sequence: `push(2), push(1), push(1), pop, getMin` — true min is 1, buggy code returns 2:

   | Op | `stack` | `min_stack` (buggy, strict `<`) |
   |---|---|---|
   | `push(2)` | `[2]` | `[2]` |
   | `push(1)` | `[2,1]` | `[2,1]` |
   | `push(1)` | `[2,1,1]` | `[2,1]` ← duplicate skipped, marker count now wrong |
   | `pop()` | `[2,1]` | `[2]` ← popped 1 matched, popped the marker even though a 1 remains |
   | `getMin()` | | returns **2** ✗ (true min is 1) |

   With `<=`, the min stack becomes `[2,1,1]`, pop leaves `[2,1]`, and `getMin()` returns 1. ✓
2. **Unconditionally popping `min_stack` on every `pop`.** The min stack is usually *shorter* than the main stack; always popping both desyncs them (or raises) — e.g., after `push(2), push(3)`, `min_stack` has one entry but the main stack has two.
3. **Syncing against the wrong element** — comparing the main stack's *new* top (after popping) to the min-stack top instead of the *popped* value.
4. **A single running-min variable with no history** (Section 3.2) — silently wrong only after the min is popped, so it passes casual tests.
5. **Tuple index swap** in the pair version: `[-1][0]` is the value, `[-1][1]` is the min. Swapping them passes the example trace (`-3` case) and fails later.
6. **Assuming distinct values** anywhere in the reasoning.

**Language-specific gotchas:**

| Language | Gotcha | Fix |
|---|---|---|
| Python | `self.min_stack[-1]` before the emptiness check raises `IndexError` | Order matters: `if not self.min_stack or val <= self.min_stack[-1]` |
| Python | Reaching for a `math.inf` sentinel mixes floats with ints; fine numerically but a code smell | Branch on emptiness instead (as above) |
| Java | With `Deque<Integer>`, `if (popped == minStack.peek())` compares **object references**, and values outside the −128..127 autobox cache are distinct objects → false negatives for large equal values (legal per constraints) | Unbox explicitly: `int popped = stack.pop();` or use `.equals(...)` |
| Java | Encoded-diff variant overflows `int` (diff can reach `2^32 − 1`) | Store diffs as `long`; also prefer `ArrayDeque` over the legacy synchronized `Stack` class |
| C++ | `st.emplace(val, std::min(val, st.top().second))` calls `top()` on an **empty** stack → UB; also `pop()` returns void, so read `top()` before popping | Compute the first-min with an `empty()` branch, then `emplace` |

---

## 10. Test Plan — Propose These Out Loud

Recite the official example first, then volunteer edge cases. This ordering shows you test the spec before your own hypotheses.

**Official example:**

| Calls | Expected |
|---|---|
| `push(-2)`, `push(0)`, `push(-3)`, `getMin()` | `-3` |
| `pop()`, `top()` | `top()` → `0` |
| `getMin()` | `-2` |

**Edge cases to say out loud (each targets a specific failure mode):**

1. **Duplicate minima (kills the `<` bug):** `push(2), push(1), push(1), pop, getMin` → expect `1`, and `top` → `1`. "This is the case that distinguishes `<=` from `<`."
2. **Popping through the min (history restore):** `push(5), push(1), push(3), pop, pop, getMin` → expect `5`; also `top` → `5`. Checks that popping the current min resurrects the *previous* min, not garbage.
3. **32-bit extremes (overflow path):** `push(-2^31), push(2^31 - 1), getMin` → `-2^31`; then `pop`, `getMin` → `2^31 - 1`. Note: this is exactly the input that breaks the encoded variant's `int` storage in Java/C++.
4. **Singleton / contract edges:** `push(7)`, `getMin` → 7, `top` → 7. And state: "calls on an empty stack are out of contract; I'd raise anyway."

```python
def test_official_example():
    s = MinStack()
    s.push(-2); s.push(0); s.push(-3)
    assert s.getMin() == -3
    s.pop()
    assert s.top() == 0
    assert s.getMin() == -2

def test_duplicate_min():
    s = MinStack()
    for v in (2, 1, 1): s.push(v)
    s.pop()
    assert s.getMin() == 1

def test_pop_through_min():
    s = MinStack()
    for v in (5, 1, 3): s.push(v)
    s.pop(); s.pop()
    assert s.getMin() == 5 and s.top() == 5

def test_int32_extremes():
    s = MinStack()
    s.push(-2**31); s.push(2**31 - 1)
    assert s.getMin() == -2**31
    s.pop()
    assert s.getMin() == 2**31 - 1
```

---

## 11. Transferable Patterns and Related Problems

**Name the pattern:** *"augmented stack"* or *"monotone auxiliary stack"* — keep a second, monotone structure that mirrors the main one's LIFO lifetime, so the aggregate for **any past state** is readable at the top. It generalizes to any associative, invertible-in-this-sense aggregate: min, max, gcd, etc. The phrase "prefix aggregate at every depth" is a reusable framing.

| Related problem | How this lesson transfers |
|---|---|
| **LC 716 Max Stack** | Same idea with max — until `popMax()` is added, which breaks pure stack sync and forces a doubly linked list + `TreeMap`/heaps. Great "what changes?" follow-up. |
| **LC 232 / LC 225 Queue↔Stack** | Two-structure decomposition of one ADT; the amortized O(1) argument (each element crosses between structures at most a constant number of times) is the same tool used in the min-queue below. |
| **Min-Queue (building block)** | Glue two MinStacks back-to-back (in-stack / out-stack) → a queue with O(1) amortized `getMin`; amortized because each element is pushed and popped at most twice in total across the two halves. |
| **LC 239 Sliding Window Maximum** | The monotonic **deque** is the "windowed" cousin: same non-increasing-structure invariant. |
| **LC 895 Maximum Frequency Stack** | Same "aggregate per stack state" theme with frequency buckets. |
| **LC 901 Online Stock Span** | Monotone stack where each pop "hands off" history to the caller — the restore-on-pop idea in a different costume. |

**Likely follow-up questions:** O(1) auxiliary space (Section 7, with the 64-bit caveat), max instead of min, min queue, "why not a heap" (O(log n) mutations), and "what if `pop` must return the value" (trivial here — capture before discarding).

---

## 12. Full Interview Talk Track

> **Opening / clarifying (30s):** "Four methods, each must be O(1). `push`, `pop`, `top` are free with an array — the whole problem is `getMin`. Two quick clarifications: `pop` returns void, correct? And operations are guaranteed on non-empty stacks, so I'll skip underflow handling but raise defensively anyway. I'll also assume values can repeat and design for that."
>
> **Baseline (15s):** "The naive options fail cleanly: scanning on `getMin` is O(n); a single running-min variable loses the *previous* min the moment I pop it — I'd have to rescan. A heap gives O(log n) push and pop, which violates the contract."
>
> **Insight (30s):** "The observation I'll build on: the stack only changes at one end, so the 'minimum so far' evolves in LIFO order — it's itself a stack. I'll keep a second stack of minima: its top is always the current min."
>
> **Design choice (20s):** "Two equivalent encodings: store `(value, min-so-far)` per entry — bulletproof but always 2 slots per element — or a lazy min stack where I only record a marker when the value is **less than or equal to** the current min. The 'or equal' is deliberate: duplicate minima must each get a marker so the pops stay in sync. I'll code the lazy version."
>
> **While coding (narrate invariants, not syntax):** "Push: always onto the main stack; onto the min stack only on a new-or-tied min. Pop: pop main, and pop the min stack only if the popped value equals its top — I compare the popped *value*, before it's gone. `top` and `getMin` are peeks at the two tops."
>
> **Complexity (15s):** "Every operation is worst-case O(1). Extra space is O(n) worst case — a strictly decreasing input makes every push a new min — but typically much less, since markers appear only on min changes."
>
> **Tests (30s):** Run the official example, then: duplicates of the min (pop once, min must still be 1), popping *through* the min (earlier min must be restored), and the int32 extremes — which also matters if we discuss the space-optimized diff-encoding follow-up, since `INT_MAX − INT_MIN` overflows 32 bits and needs 64-bit storage in Java or C++."
>
> **If asked for O(1) space:** explain the diff encoding, restore-on-pop, and volunteer the overflow caveat yourself before they find it.

---

## 13. Say It in 60 Seconds

> "Min Stack asks for push, pop, top, and getMin all in O(1). Scanning for the min is O(n), and a single running-min variable breaks the moment you pop the min — you'd lose the previous one. The insight is that the minimum of a stack evolves like a stack itself: each push either keeps the min or lowers it, and each pop must restore exactly the min that existed before the last new-min push. So I keep a second stack of minima. Push the value always; push it to the min stack only when it's less than **or equal to** the current min — the 'or equal' is critical so duplicate minima each get their own marker. On pop, if the popped value equals the min stack's top, pop that too. `getMin` is just a peek. Everything is worst-case O(1); extra space is O(n) worst case, less in practice. I'd test the official example, duplicate minima, popping through the min, and the 32-bit extremes — that last one matters for the space-optimized version that stores value-minus-min diffs, which needs 64-bit storage in Java or C++."
