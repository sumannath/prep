# Valid Parenthesis String (LeetCode 678) — Complete Interview Lesson

---

## 1. Problem restatement (say it back in your own words)

We're given a string `s` over exactly three characters: `'('`, `')'`, `'*'`. Every `'*'` is a **wildcard with three independent roles**: it may stand for `'('`, for `')'`, or be **deleted** (empty string). The string is **valid** if *there exists* an assignment of a role to every `'*'` such that the resulting string is a balanced parenthesis sequence.

"Balanced" has the classic two-part characterization worth stating out loud, because the whole solution hangs on it:

> A string of `(`/`)` is balanced **iff** (a) its total balance (`#('(')` − `#(')')` is `0`, and (b) **every prefix** has balance `≥ 0`.

So the problem is really: *can we choose one of {+1, −1, 0} for each `'*'` (net contribution as `(`, `)`, or nothing) so that the running balance never dips below 0 and ends at exactly 0?*

- `s = "()"` → true (no stars, already balanced).
- `s = "(*)"` → true (`*` = `")"` gives `"()"`, or `*` = `""` gives `"()"`).
- `s = "(*))"` → true (`*` **must** be `"("` → `"(())"`).
- `s = "("` → false (nothing can close it).

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `1 <= s.length <= 100` | Tiny. `O(n²)` memoization (~10⁴ states) and even `O(n³)` interval DP (~10⁵–10⁶ ops) pass easily. Recursion depth ≤ 101 is safe in Python (default limit 1000). But the interview *target* is `O(n)` time / `O(1)` space. |
| Only `'('`, `')'`, `'*'` | Alphabet of 3 → plain integer counters suffice; no hash maps, no stacks strictly needed for the optimal solution. |
| Worst case: all 100 chars are `'*'` | Brute force over roles is `3^100` — this is *why* naive enumeration dies. |
| `'*'` = `'('`, `')'`, **or `""`** — exactly one role per star, chosen per star independently | The "empty" role is not cosmetic; it is exactly what lets the optimal greedy clamp its lower bound (§4). Remove it and the elegant solution breaks (§10, follow-up). |
| Single string, one query | No preprocessing/queries — a single scan is enough. |

---

## 3. Baseline: brute force with deferred decisions

### 3.1 The recursion

Walk the string with index `i` and current balance `b` (an **integer value**, `#opens − #closes` of the realized prefix). `'('` and `')'` are forced moves; `'*'` branches three ways. Prune any branch whose balance goes negative (a dip is unfixable later, by the characterization above).

```python
def checkValidString_bruteforce(s: str) -> bool:
    n = len(s)

    def dfs(i: int, balance: int) -> bool:
        if balance < 0:               # more ')' than opens so far: dead branch
            return False
        if i == n:
            return balance == 0       # must land exactly on zero
        c = s[i]
        if c == '(':
            return dfs(i + 1, balance + 1)
        if c == ')':
            return dfs(i + 1, balance - 1)
        # '*': three independent roles
        return (dfs(i + 1, balance)        # '*' as ""
                or dfs(i + 1, balance + 1) # '*' as '('
                or dfs(i + 1, balance - 1))# '*' as ')'

    return dfs(0, 0)
```

### 3.2 Worked trace on `s = "(*)"` (indices are 0-based; balance is the value)

```
dfs(0, 0)                      s[0]='('  → forced
└─ dfs(1, 1)                   s[1]='*'  → 3 branches
   ├─ role ""   → dfs(2, 1)    s[2]=')'  → forced
   │               └─ dfs(3, 0)   i == n, balance == 0 → TRUE ✔
   ├─ role "("  → dfs(2, 2)    s[2]=')'  → forced
   │               └─ dfs(3, 1)   i == n, balance == 1 → false (leftover open)
   └─ role ")"  → dfs(2, 0)    s[2]=')'  → forced
                   └─ dfs(3, -1)  balance < 0 → pruned (close with nothing open)
```

Answer: **true**.

### 3.3 Duplicates: why memoization works

Different role orders can **reconverge on the same state**. For `s = "(**)"`, the two orders `(star1='(', star2="")` and `(star1="", star2='(')` both arrive at the state **`(index=3, balance=2)`**. The state space is *(position × balance)* — at most `O(n²)` pairs — not the `3^k` *role assignments*. Add one decorator:

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def dfs(i: int, balance: int) -> bool:
    ...
```

**Complexity, justified:**
- Brute force: each of the `k` stars independently picks one of 3 roles, so there are up to `3^k` root-to-leaf paths; with `O(n)` work per path that's `O(n·3^k)` — for `n = k = 100` roughly `10^49` steps. Hopeless.
- Memoized DFS: reachable states are `(i, b)` with `0 ≤ b ≤ i ≤ n` (balance never negative, never exceeds the prefix length), i.e. at most `(n+1)(n+2)/2 ≈ 5·10³` states for `n = 100`, each with `O(1)` transition work → **`O(n²)` time, `O(n²)` space**.

This already passes at `n = 100`. But a senior answer is one pass with two integers — and the path there is the real lesson.

---

## 4. The core insight: track the *range* of achievable balances, not a balance

The trouble with one counter is that a `'*'`'s best role may depend on characters **that haven't arrived yet** — deciding eagerly is wrong. The fix: since each star's contribution is deferred, stop tracking *a* balance and track **the set of balances you could still be in**.

**Claim (the invariant):** after reading any prefix, the set of achievable balances — over all role assignments whose balance never dipped below 0 — is always a **contiguous integer interval** `[lo, hi]`.

So two integers capture everything. Each character transforms the interval:

| char | update | why |
|---|---|---|
| `'('` | `[lo, hi] → [lo+1, hi+1]` | every achievable balance +1 |
| `')'` | `[lo, hi] → [max(lo−1, 0), hi−1]`; **empty ⇒ invalid** | every balance −1; balances that would go negative are dead and dropped |
| `'*'` | `[lo, hi] → [max(lo−1, 0), hi+1]` | as `'('` pushes the top up, as `')'` pulls the bottom down; the `""` role keeps the current balance reachable, so it never widens beyond those two |

Two subtle points interviewers probe:

1. **Why the `'*'` union is still an interval.** The three roles produce shifted copies of the previous set, offset by −1, 0, +1. Because the previous set is *contiguous*, consecutive shifts overlap or touch, so their union is one interval. (With gaps in the set — which can't happen here — `'*'` would create new gaps.)
2. **Why clamping `lo` to 0 is exact, not a heuristic.** When `lo − 1 < 0` after a `')'` or `'*'`, the balance 0 is still genuinely achievable: for `')'`, some old balance ≥ 1 exists (the range is nonempty with `hi ≥ 1`) and maps to 0; for `'*'`, the `""` role keeps 0. Dropping sub-zero values loses only assignments that already dipped — which can never finish valid anyway.

**The two verdict rules fall straight out of the invariant:**

- If at any point `hi < 0`, the achievable set is **empty** → return `false` immediately (no future character can resurrect a dead walk).
- At the end, valid ⟺ `0 ∈ [lo, hi]` ⟺ **`lo == 0`** (since `lo ≥ 0` always).

Mnemonic: *`'('` shifts both ends up, `')'` shifts both ends down, `'*'` spreads both ends apart; only the bottom end gets clamped.*

---

## 5. Optimal solution: one pass, two counters

```python
def checkValidString(s: str) -> bool:
    lo = 0   # smallest balance still achievable (never kept negative)
    hi = 0   # largest balance still achievable
    for c in s:
        if c == '(':
            lo += 1
            hi += 1
        elif c == ')':
            lo -= 1
            hi -= 1
            if hi < 0:          # even all-'*'-as-'(' can't absorb the ')'s
                return False
        else:                   # '*'
            lo -= 1             # ...as ')'
            hi += 1             # ...as '('   (the "" role stays inside this range)
        lo = max(lo, 0)         # drop dead (negative) balances; interval stays exact
    return lo == 0              # valid iff balance 0 is still reachable
```

**Complexity: `O(n)` time, `O(1)` space.** (This is the main solution's own bound; it's also optimal: the verdict can hinge on the last character — `"("` is false, `"()"` is true — so any correct algorithm must read all `n` characters, giving an `Ω(n)` reading lower bound.)

### 5.1 Traces on the official examples

**`"()"` → true**

| i | s[i] | lo | hi | note |
|---|---|---|---|---|
| 0 | `(` | 1 | 1 | |
| 1 | `)` | 0 | 0 | |
End: `lo == 0` → **true**.

**`"(*)"` → true**

| i | s[i] | lo | hi | note |
|---|---|---|---|---|
| 0 | `(` | 1 | 1 | |
| 1 | `*` | 0 | 2 | as `')'` → 0, as `""` → 1, as `'('` → 2 |
| 2 | `)` | 0 | 1 | old 0 → −1 is dropped |
End: `lo == 0` → **true** (`*` = `")"` or `""` both give `"()"`). Note the interval ends at `[0, 1]` — a **final check of `lo == 0`, not `lo == hi == 0`**.

**`"(*))"` → true**

| i | s[i] | lo | hi | note |
|---|---|---|---|---|
| 0 | `(` | 1 | 1 | |
| 1 | `*` | 0 | 2 | |
| 2 | `)` | 0 | 1 | |
| 3 | `)` | 0 | 0 | |
End: **true** — forced realization `*` = `"("` → `"(())"`.

**`"("` → false**

| i | s[i] | lo | hi | note |
|---|---|---|---|---|
| 0 | `(` | 1 | 1 | |
End: `lo == 1` → **false**. Every completion leaves at least one unmatched `'('`.

### 5.2 Failure-path traces (the cases that expose bugs)

**`")(" → false` (early exit)**

| i | s[i] | lo | hi | note |
|---|---|---|---|---|
| 0 | `)` | −1 | −1 | `hi < 0` → return **false** at i = 0; we never read i = 1 |

**`"(*(" → false` (positions matter, counts lie)**

| i | s[i] | lo | hi |
|---|---|---|---|
| 0 | `(` | 1 | 1 |
| 1 | `*` | 0 | 2 |
| 2 | `(` | 1 | 3 |

End: `lo == 1` → **false**. The `'('` at index 2 has no possible closer — a count-based check ("one leftover `'('`, one leftover `'*'` → match them!") would wrongly say true; the `'*'` is at index 1, *before* the `'('`.

**`"*)" → true` (why the clamp is mandatory)**

| i | s[i] | correct (clamp) | buggy (no clamp) |
|---|---|---|---|
| 0 | `*` | lo 0, hi 1 | lo −1, hi 1 |
| 1 | `)` | lo 0, hi 0 | lo −2, hi 0 |

Correct: `lo == 0` → **true** (`*` = `"("` → `"()"`). Buggy: `lo == −2` → false. Clamping `lo` is not "pretending"; it's dropping assignments that dipped.

**`")(*)" → false` (why the early `hi < 0` exit is mandatory, not just a speedup)**

Without the early return, the walk "dies" at index 0 but the counters recover: `)` → `[0, −1]`, `(` → `[1, 0]`, `*` → `[0, 1]`, `)` → `[0, 0]` → ends `lo == 0` → **wrongly true**. The true answer is false because every realization starts with `')'`. Once `hi < 0`, the range is *empty*, and an empty set "plus one" is still empty — you must bail.

---

## 6. Correctness in one breath (the proof to give if pushed)

> **Invariant.** After reading a prefix `P`, the set `B(P)` of balances achievable by assignments of `P`'s stars whose running balance never dipped below 0 is exactly the integer interval `[lo, hi]`, with `lo ≥ 0`.
>
> - Base: `B("") = {0} = [0, 0]`.
> - `'('`: `B' = {b+1 : b ∈ B}` → interval `[lo+1, hi+1]`.
> - `')'`: `B' = {b−1} ∩ [0, ∞)` → `[max(lo−1, 0), hi−1]`; empty iff `hi−1 < 0` (early exit). Intersecting an interval with a half-line keeps an interval.
> - `'*'`: `B' = B ∪ (B+1) ∪ (B−1 ∩ ℕ₀)` → `[max(lo−1, 0), hi+1]`; contiguous because the previous set was contiguous (induction), and `""` never extends past the other two roles.
>
> A full realization is valid iff every prefix is ≥ 0 and the total is 0; a mid-string dip is unfixable by any suffix (steps are ±1). Hence: valid ⟺ the range never empties (`hi ≥ 0` throughout) **and** `0 ∈ B(s)` ⟺ `lo == 0` at the end. ∎

---

## 7. Elegant alternative: two directional passes (`O(n)` / `O(1)`)

```python
def checkValidString_two_pass(s: str) -> bool:
    # Pass 1, left→right: treat every '*' as '('.
    # Can every ')' find an opener at or before it?
    bal = 0
    for c in s:
        bal += 1 if (c == '(' or c == '*') else -1
        if bal < 0:
            return False
    # Pass 2, right→left: treat every '*' as ')'.
    # Can every '(' find a closer at or after it?
    bal = 0
    for c in reversed(s):
        bal += 1 if (c == ')' or c == '*') else -1
        if bal < 0:
            return False
    return True
```

**Why it works (short version).**
- *Necessity:* in any realized valid string, pair each `')'` with its match; matches go left-opener → right-closer, so in every prefix `#')' ≤ #'(' + #'*'`. Mirror image for suffixes — exactly the two scans.
- *Sufficiency:* the L→R counter is **exactly `hi`** from §4 (same update rule), and the R→L scan, read in mirror, goes negative exactly when the interval method's final `lo` would be positive. (Handy fact: for the lower bound, `'*'` updates `lo` *identically to `')'`* — both do `lo = max(lo−1, 0)`.) So the two passes test precisely the interval method's two failure conditions, and are therefore equivalent to it.

**Gotcha:** do **not** add a "must end at 0" check to either pass — `"(*"` is valid, yet pass 1 ends at +2. The end-zero condition is *replaced* by the opposite-direction scan.

Nice to mention; the interval method is still the one to code first, because its correctness is a two-line invariant you can defend.

---

## 8. Approach comparison

| # | Approach | Time | Space | Notes |
|---|---|---|---|---|
| 1 | Enumerate all star roles (brute force) | `O(n·3^k)` | `O(n)` stack | Each star picks 1 of 3 roles independently → `3^k` paths. Dies at `k ≈ 20+`. |
| 2 | Memoized DFS on `(i, balance)` | `O(n²)` | `O(n²)` | ≈5·10³ states at n = 100. Solid intermediate answer. |
| 3 | Interval DP `dp[i][j]` = "s[i..j] valid" | `O(n³)` | `O(n²)` | `O(n²)` substrings × `O(n)` split points. Wrap rule: `s[i] ∈ {'(', '*'}` pairs with `s[j] ∈ {')', '*'}` + inner valid; or split at any `k` into two valid halves. Fallback if you can't find the greedy. |
| 4 | Two stacks of **indices** (`'('`s and `'*'`s) | `O(n)` | `O(n)` | On `')'`: pop latest rigid `'('` if any, else latest `'*'` as `')'`. At the end, pair each leftover `'('` with a leftover `'*'` at a **strictly larger index** (index check or it fails `"(*("`). |
| 5 | Two directional passes (§7) | `O(n)` | `O(1)` | Elegant; sufficiency needs the §7 argument. |
| 6 | **Balance-interval greedy (§5)** | **`O(n)`** | **`O(1)`** | Target answer; simplest correctness story. |

---

## 9. Common mistakes (each with a concrete failing input)

1. **Forgetting the `""` role.** `"()*"` is true (the star must vanish); solving with only `(` / `)` roles returns false.
2. **Clamping nothing / returning false when `lo` dips.** `"*)"` is true; the unclamped run ends at `lo = −2` and wrongly reports false. Clamp, don't bail, on the *lower* end.
3. **Missing the `hi < 0` early exit.** `")(*)"`: without it, the dead walk "recovers" and returns true. Once `hi < 0`, the set is empty — return immediately.
4. **Final check `lo == 0 and hi == 0`.** `"(*)"` legitimately ends at `[0, 1]`. The right condition is `lo == 0` only.
5. **Single-direction check only.** Treating all `'*'` as `'('` and verifying "never negative, ends at 0" rejects `"(*"` (ends at +2, yet valid). Treating them all as `')'` rejects `"*)"` (dips, yet valid).
6. **Count-based matching that ignores positions.** `"(*("`: one leftover `'('` + one leftover `'*'` "balance out" numerically, but the star precedes the paren → false. Leftover pairing must compare **indices**.
7. **Brute force without memoization.** `3^100 ≈ 5·10^47` paths on an all-star input — TLE/hang. Memoize, or better, switch to §5.
8. **Memo table indexed by a negative balance.** Prune `balance < 0` *before* any array lookup (or offset the index by `n`); `lru_cache` won't crash but then caches useless dead states.
9. **In the two-pass variant: requiring a final zero.** See §7 gotcha — `"(*"` fails pass 1's end at +2 yet is valid.

---

## 10. Language gotchas (quick reference)

| Language | Gotcha |
|---|---|
| **Python** | If you memoize with a 2-D list indexed by balance, guard `balance < 0` first (or offset by `+n`) or you'll index out of range; `lru_cache` avoids the crash but keeps dead negative-balance states. Recursion depth ≤ 101 ≪ default 1000, so recursion is safe here. |
| **Java** | Don't memoize with `HashMap<Long, Boolean>`-style boxed keys — heavy autoboxing churn for zero benefit; use a flat `int[]` (`i * (n + 1) + balance`) or `int[][]` with 0/1/"unknown" codes. No overflow risk (balance ≤ 100). `s.charAt(i)` returns `char`; compare directly to `'('`. |
| **C++** | `std::unordered_map<std::pair<int,int>, bool>` **does not compile** (no default hash for pairs) — use `std::vector<std::vector<signed char>>` for the memo, or skip memoization with the O(1) greedy. In the DFS, pass the string as `const std::string&` to avoid an `O(n)` copy per call. |

---

## 11. Test cases: propose these out loud

Say **before coding**: `"*"` (empty role), `"*)"` (clamp), `")("` (early exit). Add the rest right after your first passing run.

| Input | Expected | What it protects |
|---|---|---|
| `"()"` | true | Official 1; no stars |
| `"(*)"` | true | Official 2; ends at `[0,1]` — kills the `hi == 0` habit |
| `"(*))"` | true | Official 3; star forced to `'('` |
| `"("` | false | Official 4; leftover opener |
| `"*"` | true | Star as `""` |
| `"*)"` | true | Star as `'('`; catches missing clamp / early-exit-on-lo bugs |
| `"(*"` | true | Star as `')'` |
| `"()*"` | true | Star **forced** to be `""` — strongest empty-role test |
| `")("` | false | Order matters; exercises `hi < 0` early exit |
| `")(*)"` | false | Catches "no early exit" implementations |
| `"(*("` | false | Counts match but positions don't |
| `"*"` × 100 | true | Stress + memo/recursion sanity |
| `""` (if allowed) | true | Vacuously valid; code shouldn't crash (constraints say length ≥ 1) |

---

## 12. Transferable patterns & related problems

**Patterns to carry away**

1. **Deferred choices → track the reachable *set*, not a value.** When each position's contribution is a wildcard decided by context, track the set of reachable states; if the set is always a contiguous interval, two scalars (`lo`, `hi`) do the work of a whole DP. Same skeleton behind wildcard-style DPs (Wildcard Matching, Regular Expression Matching).
2. **Balance counters with clamping.** The `lo`-style "minimum" counter with a clamp at 0 reappears as the *number of forced insertions/removals* in Minimum Add / Minimum Remove to Make Valid Parentheses.
3. **Two mirrored feasibility scans.** Necessity via prefix counting, sufficiency via the mirror scan — the same prefix/suffix pairing shows up in Trapping Rain Water, Product of Array Except Self, Candy.

**Related problems**

| Problem | Relationship |
|---|---|
| LC 20 Valid Parentheses | No stars; stack/counter baseline |
| LC 921 / LC 1541 Minimum Add to Make Parentheses Valid | Same open/close counters; `lo` becomes "insertions needed" |
| LC 1249 Minimum Remove to Make Valid Parentheses | Counter + marking indices to remove |
| LC 32 Longest Valid Parentheses | Stack/DP over the same balance notion |
| LC 301 Remove Invalid Parentheses | Search over removals |
| LC 44 Wildcard Matching | `'*'` wildcard, deferred-role DP thinking |

**Likely follow-ups in the room**

- *"Return an actual valid assignment."* Match `')'` against the newest rigid `'('` (else a `'*'`) left-to-right; at the end, pair each leftover `'('` with a leftover `'*'` strictly to its right. (Consuming a rigid `'('` first is always safe by an exchange argument: a `'*'` can serve any later `')'` too.)
- *"What if `'*'` could only be `'('` or `')'`, never empty?"* The two-counter method **breaks**: the empty role is exactly what keeps `lo` reachable at 0, and without it the reachable set can split — e.g. balance 1 with one star reaches `{0, 2}`, skipping 1, so `[lo, hi]` is no longer exact. Fall back to memoized DFS (`O(n²)`).
- *"Count the number of valid assignments."* `O(n²)` DP: `dp[i][b]` = number of role assignments for the first `i` chars ending at balance `b`; answer `dp[n][0]` (can be ~`3^k`, big in theory, fine in Python).

---

## 13. Full interview talk-track (script)

> **Clarify (≈10s):** "So every `'*'` is an independent wildcard — `'('`, `')'`, or removed — and we need some assignment that makes the string a balanced parenthesis sequence: every prefix at least zero opens, exactly zero at the end."
>
> **Naive (≈20s):** "Without stars it's one counter. Each star has three roles, so brute force is three-to-the-k — dead at a hundred stars. Memoizing on index-and-balance gives O(n²), which passes at n = 100, but I think there's an O(n) time, O(1) space answer."
>
> **Insight (≈30s):** "A star's best role can depend on later characters, so I'll defer decisions: instead of one balance, I'll track the **interval** of balances I could still be in — `[lo, hi]`. `'('` shifts both ends up; `')'` shifts both down, and balances that would go negative are dead — that's the clamp of `lo` to zero, and it's exact because zero stays reachable. `'*'` widens: top +1 as `'('`, bottom −1 as `')'`, and the empty role never extends past those. If `hi` ever goes negative, even all-stars-as-'(' can't absorb the closers — fail on the spot. At the end, valid iff zero is still reachable, i.e. `lo == 0`."
>
> **Code (≈90s):** write the ten-line loop from §5.
>
> **Tests:** "Official four, plus `*` alone, `*)`, `(*`, `()*` — the star *must* be empty there — `)(`, `)(*`, and `(*(`, where the counts match but the positions don't."
>
> **Complexity:** "One pass, two integers: O(n) time, O(1) space. That's optimal — the answer can hinge on the last character, so every character must be read."
>
> **If asked to prove it:** give the §6 invariant in three sentences: each update maps intervals to intervals; `'('` shifts, `')'` shifts-and-clamps, `'*'` is three overlapping shifts of a contiguous set, so contiguity is preserved by induction; the two verdicts are "range never empties" and "zero is in the final range."

---

## 14. Say it in 60 seconds

> "Balanced parentheses with wildcards: each star can be `'('`, `')'`, or deleted. Deciding a star eagerly is wrong because its best role depends on later characters — so I defer: I track the interval of balances still achievable, `lo` to `hi`. `'('` moves both ends up; `')'` moves both down and drops balances that would go negative — that's why I clamp `lo` at zero instead of failing. A star stretches the interval both ways: plus one as `'('`, minus one as `')'`; the empty option never extends past those. Two rules fall out: if `hi` ever drops below zero, even all-stars-as-'(' can't absorb the closers — false immediately, because the range is empty and a dead walk can't revive. At the end, I need zero inside the interval, and since `lo` is the floor, that's exactly `lo == 0`. One pass, two integers: O(n) time, O(1) space, and it's optimal since the last character can flip the answer. Two traps to remember: clamp the low end rather than bail on it, and finish with `lo == 0`, not `lo == hi == 0` — `'( *)'` ends at `[0, 1]` and is valid."
