# Letter Combinations of a Phone Number — Complete Interview Lesson

## 1. Problem, Restated

Each digit `2–9` maps to a fixed set of 3–4 letters (the old telephone keypad). Given a string of such digits, return **every string that picks exactly one letter per digit**. In set language: the answer is the **Cartesian product** of the per-digit letter sets, joined into strings.

- Input: `digits = "23"` → sets `{a,b,c}` × `{d,e,f}` → 3 × 3 = 9 outputs.
- Input: `digits = "2"` → `{a,b,c}` → 3 outputs.
- Output type: `List[str]`, **any order is accepted**.
- Digit `1` maps to nothing — but per the constraints it never appears, so we don't design for it (we *mention* it, see §2).

**The single sentence version to say in an interview:** "I need every way to choose one letter from each digit's letter set — a Cartesian product — and the number of digits is variable, which is what makes this a recursion/backtracking problem rather than a fixed set of nested loops."

## 2. Decoding the Constraints

| Constraint | What it tells you | What you say out loud |
|---|---|---|
| `digits.length ≤ 4` | Total answers ≤ 4⁴ = **256**. Any exponential-in-n enumeration is fine; no cleverness needed. Recursion depth ≤ 4, so no stack concerns in any language. | "n is tiny, so I'll optimize for clarity, not speed — but I'll still state the complexity." |
| `digits[i] ∈ '2'..'9'` | **Every** digit has ≥ 3 letters. No `0`/`1` handling needed; the mapping table can be fixed and total. | "I won't write code paths for 0/1 since they're excluded, but I'll note the policy if asked: map them to empty and the product naturally empties, or validate the input." |
| "any order" | No sorting required. DFS with the natural keypad order happens to reproduce the example's order — free determinism for debugging. | "I won't sort; DFS order already matches the example." |
| Digits **can repeat** (e.g. `"22"`) | Each digit position is an independent slot. No `used` array (that's the *permutation* pattern, wrong mental model here), and **no duplicates in the output** (see §4). | "Repeated digits are fine — positions are independent slots." |
| The hidden case: `digits = ""` | The classic LeetCode tests include the empty string (older statements allowed length 0). The leaf condition `i == len(digits)` fires immediately and would append the **empty string**, returning `[""]` instead of `[]`. | "Even though the constraints start at length 1, I'll guard the empty input — one line, and it's the #1 known trap on this problem." |

## 3. Brute Force, With a Worked Trace

### 3.1 The naive idea — and why it doesn't generalize

For exactly two digits, you can hand-write two nested loops:

```python
# Only correct when len(digits) == 2 — brittle.
results = []
for a in PHONE[digits[0]]:        # index 0: letters for '2'
    for b in PHONE[digits[1]]:    # index 1: letters for '3'
        results.append(a + b)
```

Trace on `"23"`: `a ∈ {a,b,c}`, `b ∈ {d,e,f}` → `ad, ae, af, bd, be, bf, cd, ce, cf` — 9 strings, matching the example. But a third digit needs a third loop, a fourth needs a fourth… **you cannot statically write a variable number of nested loops.** That limitation *is* the lesson: variable nesting depth ⇒ recursion.

### 3.2 Brute force that works for any length: the growing frontier

Build all prefixes of length `k`, then extend each by every letter of digit `k+1`:

```python
def letterCombinations_bfs(digits: str) -> list[str]:
    if not digits:
        return []                        # without this, [""] sneaks out
    frontier = [""]                      # all prefixes built so far
    for d in digits:
        frontier = [prefix + ch for prefix in frontier for ch in PHONE[d]]
    return frontier
```

Worked trace on `"23"`:

| Step | Digit | Frontier (prefixes) |
|---|---|---|
| start | — | `[""]` |
| 1 | `'2'` → a/b/c | `["a", "b", "c"]` |
| 2 | `'3'` → d/e/f | `["ad","ae","af","bd","be","bf","cd","ce","cf"]` |

Trace on `"2"`: `[""]` → `["a","b","c"]`. Correct — but notice the frontier holds an **entire level** of partial answers in memory at once (up to ~4ⁿ⁻¹ strings), whereas DFS (next section) holds exactly **one** path plus the finished outputs.

## 4. The Core Insight

1. **The answer is a Cartesian product**, so the decision structure is fixed: at depth `i`, the *only* decision is which letter to place at digit position `i`. There is no subset-style include/exclude and no shared pool to draw from.
2. **Variable number of nested loops ⇒ recursion on the index.** Recursion depth = number of digits; the loop *inside* each frame iterates over that digit's letters. This is the "encode nested loops as DFS" pattern.
3. **State definition (be this precise out loud):** `dfs(i, path)` where
   - `i` is an **index** into `digits` — the *position* being filled (depth of the tree), not a letter value;
   - `path` holds one chosen letter **per position**: invariant `len(path) == i` at frame entry, and `path[j]` is a letter chosen **for** `digits[j]`.
   - The loop variable `ch` is a **value** drawn from `PHONE[digits[i]]` — the per-position alphabet.
4. **Why no duplicates and no `used` set:** two different leaves differ in the choice made at some position `j`; both choices came from the same alphabet `PHONE[digits[j]]`, whose letters are pairwise distinct — so the strings differ at position `j`. The map from choice-tuples to strings is injective ⇒ all outputs are distinct by construction. (Contrast with Permutations-style problems, where a shared, reorderable pool forces a `used` array and duplicate-handling via sorting.)
5. **Record at the leaf:** when `i == len(digits)`, every position has a letter; `path` is one complete answer.

## 5. Optimal Approach: Backtracking (Canonical Template)

### 5.1 Code — list-based path with explicit backtrack

```python
PHONE = {
    "2": "abc", "3": "def", "4": "ghi", "5": "jkl",
    "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz",
}

def letterCombinations(digits: str) -> list[str]:
    if not digits:                       # guard: "" -> [], NOT [""]
        return []

    results: list[str] = []
    path: list[str] = []                 # path[j] = letter chosen for digits[j]

    def dfs(i: int) -> None:             # i = INDEX into digits (position to fill)
        if i == len(digits):             # leaf: every position filled
            results.append("".join(path))  # snapshot — copy out, don't share
            return
        for ch in PHONE[digits[i]]:      # ch = VALUE from this position's alphabet
            path.append(ch)              #   choose
            dfs(i + 1)                   #   explore next position (i+1, never i)
            path.pop()                   #   un-choose (backtrack)

    dfs(0)
    return results
```

### 5.2 Equivalent string-passing idiom (no `pop`, harder to get wrong)

```python
def letterCombinations(digits: str) -> list[str]:
    if not digits:
        return []
    results: list[str] = []

    def dfs(i: int, prefix: str) -> None:
        if i == len(digits):
            results.append(prefix)       # strings are immutable: already a snapshot
            return
        for ch in PHONE[digits[i]]:
            dfs(i + 1, prefix + ch)      # fresh string per call; no explicit pop needed

    dfs(0, "")
    return results
```

Both are O(n · 4ⁿ); the string version allocates a new string per frame but at n ≤ 4 that's irrelevant. Pick one, say which, and stay consistent.

### 5.3 Trace on the official examples

**`digits = "23"`** — recursion tree (depth = digit index, branching = letters of that digit):

```text
dfs(0, "")
├─ choose 'a' → dfs(1,"a")
│   ├─ 'd' → dfs(2,"ad")  → record "ad"   (i=2 == n: leaf)
│   ├─ 'e' → dfs(2,"ae")  → record "ae"
│   └─ 'f' → dfs(2,"af")  → record "af"
├─ choose 'b' → dfs(1,"b") → "bd","be","bf"
└─ choose 'c' → dfs(1,"c") → "cd","ce","cf"
```

Output: `["ad","ae","af","bd","be","bf","cd","ce","cf"]` — 9 leaves = 3 × 3 ✓, and in exactly the example's order because DFS iterates each alphabet left-to-right.

**`digits = "2"`**: `dfs(0,"")` spawns three children at `i = 1 == n` → record `"a"`, `"b"`, `"c"` → `["a","b","c"]` ✓.

**`digits = ""`**: the guard returns `[]` before `dfs(0)` ever runs. Without the guard, `dfs(0)` would immediately hit `i == 0 == len(digits)` and append `""` → `[""]` ✗.

## 6. Complexity

Let `n = len(digits)`; each digit maps to 3 or 4 letters (`'7'`, `'9'` have 4), and `K` = number of answers = ∏ of per-digit counts, so `3ⁿ ≤ K ≤ 4ⁿ`.

| Metric | Backtracking (DFS) | Frontier (BFS) | Why |
|---|---|---|---|
| Number of outputs `K` | between 3ⁿ and 4ⁿ | same | one choice per digit |
| Time | **O(n · 4ⁿ)** | O(n · 4ⁿ) | up to 4ⁿ answers, each of length n written at a leaf; internal call count is Θ(K) since tree size is a geometric series dominated by leaves |
| Output space | Θ(n · 4ⁿ) | Θ(n · 4ⁿ) | the answers themselves |
| Extra space (excl. output) | **O(n)** | O(n · 4ⁿ) | DFS keeps one path + recursion stack; BFS stores a full frontier level (up to ~4ⁿ⁻¹ prefixes) before expanding it |
| Recursion depth | n (≤ 4) | n/a | no stack-limit concerns anywhere |

**Optimality note:** the O(n · 4ⁿ) time is asymptotically unavoidable — any correct algorithm must spend Ω(n · 4ⁿ) in the worst case purely to write the output, because inputs like `"7979"` produce 4⁴ = 256 distinct answers of length 4 and every one must be materialized. So the backtracking solution is output-optimal; there is nothing faster to find.

## 7. Common Mistakes (and How They Manifest)

| # | Mistake | Symptom / why it's wrong | Fix |
|---|---|---|---|
| 1 | No empty-input guard | Returns `[""]` for `""` — a list containing the empty string | `if not digits: return []` at the top |
| 2 | `results.append(path)` where `path` is a **list** | All stored entries alias one mutating list; later `pop`s corrupt them | `"".join(path)` at the leaf, or append `path[:]` |
| 3 | Forgetting `path.pop()` after the recursive call | Outputs keep accumulating — strings longer than n (`"ad"`, `"ade"`, …) | Choose → recurse → **un-choose**, every time |
| 4 | Recursing with `i` instead of `i + 1` | Same position refilled forever → `RecursionError` (Python) / stack overflow | Advance the **index** every level |
| 5 | Leaf check `i == len(digits) - 1` | Wrong-length outputs / last digit expanded at wrong depth | Leaf is exactly `i == len(digits)` (all positions filled) |
| 6 | Confusing index and value | Looping over `PHONE` keys instead of `PHONE[digits[i]]`, or keying on letters | `i` indexes `digits`; `ch` is a value from that position's alphabet |
| 7 | Adding a `used` array "just in case" | Conceptual confusion: positions are independent slots; letters repeat across positions *by design* (`"22"` → `"aa"` is valid) | No shared pool ⇒ no used-set |
| 8 | Rebuilding `PHONE` inside `dfs` | Wasted work, and easy to shadow the name | Define the mapping once, at module/class scope |

**Java / C++ implementation gotchas** (short version — know them even if you code in Python):

| Language | Gotcha | Note |
|---|---|---|
| Java | `Map<Integer,String>` + `map.get(digits.charAt(i))` | `charAt` returns a `char` (`'2'`), which autoboxes to `Character` — it **never equals** the `Integer` key `2`, so `get` returns `null` → NPE or silently empty results. Use `Map<Character,String>`, or a `String[]` indexed by `digits.charAt(i) - '0'`. |
| Java | Backtracking with `StringBuilder` | Must call `path.deleteCharAt(path.length() - 1)` after recursion — the Java analog of forgetting `pop()`. |
| C++ | Letter table lookup | `kMap[digits[i]]` indexes with ASCII 50–57 → out of range/UB. Use `kMap[digits[i] - '0']` into a 10-slot table (slots 0/1 empty), or `unordered_map<char,string>`. |
| C++ | `path.push_back(ch); dfs(i+1);` with **no** `path.pop_back();` | Silent wrong answers (strings grow across branches); pass `string& path` by reference and pair push/pop meticulously. |

## 8. Test Cases to Propose Out Loud

Say these before/while coding — it signals you think in contracts, not just code:

| Input | Expected | What it checks |
|---|---|---|
| `"23"` | 9 combos `ad…cf` | Official example; Cartesian product; DFS order matches |
| `"2"` | `["a","b","c"]` | Official example; single level, loop-only path |
| `""` | `[]` (not `[""]`) | The classic trap; guard correctness |
| `"22"` | 9 distinct combos `aa…cc` | Repeated digits; positions independent; no duplicates produced |
| `"79"` | 16 combos (`p*`,`q*`,`r*`,`s*`) | Both 4-letter digits; worst-case branching factor |
| `"7777"` | 256 combos | Max-size input — assert count, spot-check first (`"pppp"`) and last (`"ssss"`) rather than printing all |

Cheap property checks you can assert instead of eyeballing:

```python
def check(digits, out):
    expected = 1
    for d in digits:
        expected *= len(PHONE[d])
    assert len(out) == expected                      # product of branch factors
    assert all(len(s) == len(digits) for s in out)   # every string has full length
    assert all(s[i] in PHONE[digits[i]] for s in out for i in range(len(digits)))
    assert len(set(out)) == len(out)                 # all distinct, no dedup needed
```

## 9. Transferable Patterns & Related Problems

**The template you're really being tested on:** *variable-depth nested loops → DFS on index → choose / explore / un-choose → record at the leaf.* Everything here transfers:

- **Count outputs mentally**: `K = ∏ branch factors` gives an instant sanity check on any enumeration problem (9 for `"23"`, 16 for `"79"`).
- **Classify the backtracking subtype**: Cartesian product (this problem) vs. permutations (shared pool + `used`) vs. subsets (include/exclude) vs. combinations (monotone start index). Naming the subtype in the interview earns credit.
- **Output-bound problems**: when the answer size dominates, say so — it justifies "no room to do better" and motivates streaming via a generator if asked about scale (replace `results.append` with `yield`; then extra memory is O(n) regardless of K).
- **Pruning slot**: the template has an obvious place to add feasibility checks — that's the leap to the problems below.

| Related problem | Shared skeleton | What changes |
|---|---|---|
| LC 46 Permutations | DFS over choices | One shared pool; order matters → need `used` |
| LC 78 Subsets | DFS | Binary include/exclude per element; 2ⁿ nodes |
| LC 77 Combinations | DFS | Choose k from n with a monotone start index |
| LC 39 Combination Sum | DFS + backtrack | Unbounded reuse; prune when sum exceeds target |
| LC 22 Generate Parentheses | DFS + feasibility pruning | Prune branches that can never be closed |
| LC 93 Restore IP Addresses | Fixed-shape DFS | Validity check per segment (≤ 3 chars, ≤ 255, no leading 0) |
| LC 401 Binary Watch | Cartesian product | Product of hour-set × minute-set, then filter |
| LC 79 Word Search | DFS + undo | Backtrack `visited` marks on a grid |

**Likely follow-ups and one-line answers:**
- *"Iteratively?"* — the frontier version in §3.2.
- *"What if digits could contain `0`/`1`?"* — agree on policy: map them to an empty alphabet (product empties → `[]`) or skip them; don't silently decide.
- *"n could be 20?"* — answers explode to ~10¹²; you can't materialize them, so stream with a generator and note the output itself is the bottleneck.
- *"Sorted order required?"* — DFS order already matches keypad order; otherwise sort at the end (O(K log K · n)).

## 10. Full Interview Script (What to Say While Coding)

> "Let me restate: each digit has a fixed letter set, and I need every string choosing one letter per digit — the Cartesian product of those sets. The number of nesting levels equals the input length, which is variable, so instead of hand-written loops I'll recurse on the digit index. State: index `i` and the partial string; at `i == n` every position is filled, so I record the string and return. Otherwise I loop over the letters for `digits[i]`, append, recurse on `i + 1`, then pop to backtrack. Because each position draws from its own alphabet and those alphabets have distinct letters, different choice tuples always give different strings — so there's no `used` set and no deduplication. Known trap: for empty input the leaf fires immediately with the empty path, which would return `[""]`; the expected answer is `[]`, so I'll guard that up front. Constraints cap length at 4, so worst case is 4⁴ = 256 short strings — time O(n · 4ⁿ), which is just the output size, and O(n) extra space. Let me code it."

## 11. Say It in 60 Seconds

> "Each digit maps to three or four letters, and I need one letter per digit — so the answer is the Cartesian product of the per-digit letter sets. The number of digits is variable, so instead of nested loops I recurse on the index into the digits string: at each level, loop over the letters for the current digit, append one, recurse to the next index, then pop to backtrack. When the index reaches the length of the input, every position is filled, so I join the path and record it. No used-array is needed because each position is an independent choice, and there are no duplicates because each position's alphabet has distinct letters — distinct choices always produce distinct strings. One guard I'll always mention: empty input must return the empty list, not a list containing the empty string, or the leaf fires immediately with an empty path. With length at most four, that's at most 4⁴ — 256 — short strings, so time is O(n · 4ⁿ), which is optimal because that's simply the size of the output, and extra space is O(n) for the recursion stack."
