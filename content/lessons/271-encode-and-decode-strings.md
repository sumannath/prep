# Encode and Decode Strings (LeetCode 271) — Complete Lesson

## 1. Problem, restated

Design two functions that are inverses of each other:

- `encode(strs) -> str`: pack a **list** of strings into a **single** string.
- `decode(s) -> list[str]`: unpack that string back into the list.

**The contract:** for every input allowed by the constraints, `decode(encode(strs)) == strs` — exact list equality: same **count**, same **order**, same **values** element-for-element, **duplicates included**.

What is *not* required (say these out loud in the interview):

- The encoded string does **not** need to be human-readable.
- `decode` only needs to handle strings that *your own* `encode` produced. (State this assumption; it's the standard reading of the problem.)
- **No side channel.** The problem's two-machine framing means you cannot stash lengths in a global variable, a file, or a second return value. The single string is the *only* thing transmitted, so it must carry **all** information.

That last point is the whole game. You must preserve two kinds of information:

1. **Values** — the characters themselves (easy: just copy them).
2. **Structure** — how many strings there are and where each one ends (easy to destroy!).

Plain concatenation preserves values but destroys structure. Everything below is about recovering structure.

---

## 2. Decoding the constraints

| Constraint | What it really tells you |
|---|---|
| `0 <= strs.length < 100` | 0 to 99 strings. **`[]` is a valid input** and must round-trip *and stay distinct from* `[""]` — this is the single most dangerous edge case. |
| `0 <= strs[i].length < 200` | Strings may be **empty** (length 0), max 199 chars. A length fits in 3 decimal digits (or one byte, since 200 < 256). |
| Any of 256 valid ASCII characters | Payloads may contain `#`, `,`, `\`, digits, `\0`, and bytes 128–255. **There is no "safe" delimiter character** — every character you might pick as a separator can also appear inside a payload. |
| Sizes are tiny (≤ 99 × 199 ≈ 19.7k chars total) | Performance is a non-issue. The test here is **correctness under ambiguity**, not speed. |

Also model the string space correctly: in Python, "any of 256 ASCII chars" means code points `0..255`, so `chr(random.randrange(256))` is a faithful test generator.

---

## 3. Brute force: delimiter join + split (and why it fails)

**Idea:** pick a delimiter `d` (say `","`), `encode = d.join(strs)`, `decode = s.split(d)`.

```python
def encode(strs):        # BROKEN
    return ",".join(strs)

def decode(s):           # BROKEN
    return s.split(",")
```

**Worked trace — official Example 1 (accidentally works):**

| Step | Action | Result |
|---|---|---|
| encode | `"Hello"` + `","` + `"World"` | `"Hello,World"` |
| decode | split on `","` | `["Hello", "World"]` ✓ |

**Failure trace A — delimiter inside a payload:**

| Step | Action | Result |
|---|---|---|
| encode | `["a,b", "c"]` | `"a,b,c"` |
| decode | split on `","` | `["a", "b", "c"]` ✗ (3 strings instead of 2; values corrupted) |

**Failure trace B — structural collision (the deeper one):**

| Input | Encoding | Note |
|---|---|---|
| `[]` | `""` | `",".join([])` is `""` |
| `[""]` | `""` | `",".join([""])` is also `""` |

Two *different* inputs map to the *same* encoding. No decoder can be correct for both. Concretely in Python, `"".split(",")` returns `[""]`, so `[]` round-trips to `[""]` ✗.

Why this failure is fundamental, not just a bad luck: any correct encoder must be **injective** on the set of valid inputs — distinct lists must produce distinct strings — and a delimiter-only format loses the count information, so injectivity fails.

---

## 4. Attempt 2: escaping (fixes half the problem)

CSV-style fix: escape the delimiter inside payloads (`\` → `\\`, `,` → `\,`), and decode with a stateful scan (on `\`, take the next char literally; on `,`, end a string).

Trace: `["a,b", "c"]` → `"a\,b,c"` → stateful scan → `["a,b", "c"]` ✓. Failure A is fixed.

But **failure B survives**: `[]` and `[""]` *still* both encode to `""`. Escaping fixes content collisions; it does **not** encode cardinality. You'd need to bolt on a count header (`"2;a\,b,c"`) to be fully correct.

Takeaway worth saying in an interview: there are **two orthogonal problems** —

1. *Payload can look like a separator* → fix with escaping **or** framing.
2. *Decoder can't recover the count/structure* → fix only by encoding structure explicitly.

The length-prefix trick solves both with one mechanism, which is why it beats escaping here.

---

## 5. The core insight: self-describing framing (length prefix)

Don't *search* for where a string ends — **say how long it is**. Encode each string as:

```
<len>#<payload>
```

e.g. `"Hello"` → `5#Hello`, so `["Hello","World"]` → `5#Hello5#World`.

The decoder **never inspects payload characters**:

1. Read digits from position `i` until `'#'` — that's the length `L` (a *value*, not an index).
2. Take exactly `L` characters after the `'#'` — that's the string, whatever it contains (`#`, digits, `\0`, anything).
3. Jump the cursor to just past the payload; repeat.

**Why this is unambiguous:**

- The parse is **deterministic**: the cursor always lands exactly on the start of a header, and each header states its payload's extent exactly. No choice points ⇒ no ambiguity ⇒ `decode(encode(x)) == x`.
- **Structure is explicit**: the number of `len#` headers equals the number of strings. So `[]` → `""` and `[""]` → `"0#"` are finally different.
- **Payload characters are irrelevant to parsing** — the crucial difference from delimiter formats, where payload characters are load-bearing for the parser.

This is a real-world pattern, worth naming: **size-based framing**. HTTP chunked transfer encoding (`<size>\r\n<chunk>\r\n`), netstrings (`len:payload,`), Bencode (`5:Hello`), protobuf length-delimited fields, TLV records. The two families are: *contents-based framing* (delimiters + escaping: CSV, JSON) vs *size-based framing* (length prefixes). When the payload alphabet covers your separator alphabet, size-based framing is the clean answer.

Two design choices inside this idea:

- **Terminator after the number:** any *non-digit* character works (`#`, `:`, `|`) — it must be a non-digit so the digit run has an unambiguous end. `'#'` is convention.
- **Fixed-width variant:** since `len < 200 < 1000`, write a 3-digit zero-padded length (`005Hello`) and **drop the `'#'` entirely** — decode reads exactly 3 chars as the number, then jumps. Even simpler decode, but it hard-depends on the 200 bound; if constraints grow past 999 it silently breaks. `len#` generalizes to any length. Mention both, implement one.

---

## 6. Optimal solution

### 6.1 Algorithm

- **encode:** one pass; for each `s`, append `len(s)` in decimal, then `'#'`, then `s`.
- **decode:** `i = 0`; while `i < len(s)`: scan `j` from `i` until `s[j] == '#'`; `L = int(s[i:j])`; payload = `s[j+1 : j+1+L]`; append it; set `i = j + 1 + L`.

**Index vs. value discipline** (where all the bugs live):

| Symbol | Kind | Meaning |
|---|---|---|
| `i` | index | position of the next header in the encoded string |
| `j` | index | position of the `'#'` terminating the current header |
| `L` | **value** | the count read from the header — *never* used as an index itself |
| `s[j+1 : j+1+L]` | half-open slice | payload occupies indices `[j+1, j+1+L)` |
| `i_next = j + 1 + L` | index | start of the next header |

### 6.2 Python code

```python
def encode(strs: list[str]) -> str:
    """Pack a list of strings into one string: '<len>#<str>' repeated."""
    return "".join(f"{len(s)}#{s}" for s in strs)


def decode(s: str) -> list[str]:
    """Inverse of encode. Assumes s is well-formed (output of encode)."""
    res, i = [], 0
    while i < len(s):
        j = i
        while s[j] != "#":            # scan header digits ONLY — never payload
            j += 1
        L = int(s[i:j])               # L is a VALUE (length), not an index
        start = j + 1                 # payload starts right after '#'
        res.append(s[start:start + L])
        i = start + L                 # next header starts here
    return res
```

Notes:
- `''.join(...)` instead of `+=` in a loop: strings are immutable, so repeated `+=` can copy the whole prefix each time and degrade to quadratic; `join` copies each character once.
- The inner `while s[j] != "#"` never overruns for well-formed input (every header has its `'#'`). If you want to harden against malformed input, add `j < len(s)` and raise — but first *state* that `decode` is only promised `encode`'s output.
- On LeetCode, paste these as `class Solution` methods (`def encode(self, strs: List[str]) -> str:`).

### 6.3 Worked traces on the official examples

**Example 1: `["Hello", "World"]`**

Encode: `5#Hello` + `5#World` → `"5#Hello5#World"` (length 14).

```
index: 0 1 2 3 4 5 6 7 8 9 10 11 12 13
char : 5 # H e l l o 5 # W  o  r  l  d
```

Decode trace:

| step | `i` (index) | digit scan | `L` (value) | payload slice | `res` | next `i` |
|---|---|---|---|---|---|---|
| 1 | 0 | `s[0]='5'`, stop at `j=1` | 5 | `s[2:7]` = `"Hello"` | `["Hello"]` | 7 |
| 2 | 7 | `s[7]='5'`, stop at `j=8` | 5 | `s[9:14]` = `"World"` | `["Hello","World"]` | 14 = len → stop |

Result: `["Hello", "World"]` ✓

**Example 2: `[""]`**

Encode: `len("")=0` → `"0#"` (length 2). Decode: `i=0`, stop at `j=1`, `L=0`, payload `s[2:2]=""`, next `i=2` → stop. Result: `[""]` ✓. Note `"0#" ≠ ""` — the `[]` vs `[""]` ambiguity is gone.

**Adversarial payload trace: `["3#abc", "#"]`** → encode → `"5#3#abc1##"`. Decode: header `5` → payload `"3#abc"` (inner `'#'` ignored, because we *jump* 5 chars rather than search); header `1` → payload `"#"`. Result ✓ — this is the test that kills every delimiter-based solution.

### 6.4 Correctness in one paragraph

**Invariant:** at the top of every loop iteration, `s[i:]` is exactly the encoding of the not-yet-decoded suffix of the original list. Base: `i = 0`, whole string. Step: the format guarantees `s[i:j)` is the decimal length `L` of the next original string, `s[j] == '#'`, and `s[j+1:j+1+L)` is that string copied verbatim; after `i ← j+1+L` the invariant holds for the rest. Each iteration consumes ≥ 2 characters, so the loop terminates, and the number of iterations equals the original list length — so **count, order, values, and duplicates** are all preserved.

---

## 7. Complexity

Let `N` = number of strings, `T` = total payload characters, `E = |encoded| = T + O(N)` (each header is 1–4 chars here: up to 3 digits plus `'#'`; so `E ≤ T + 4·99 ≈ T + 396` under the constraints).

| Approach | encode time | decode time | extra space (beyond output) | Correct round trip? |
|---|---|---|---|---|
| Delimiter join / split | O(T) | O(E) | O(E) | ✗ payload collisions; ✗ `[]` vs `[""]` |
| Escaping | O(T) | O(E), stateful scan | O(E) | ✗ still `[]` vs `[""]` (unless count header added) |
| **Length prefix (chosen)** | **O(T)** | **O(E)** | **O(1)** | ✓ |
| Fixed-width 3-digit header | O(T) | O(E) | O(1) | ✓ (given `len < 1000`) |

- **encode:** O(T) time — each payload character is written exactly once; header digits are O(1) per string under the 199 bound (O(log L) in general, still linear overall). O(E) output space.
- **decode:** O(E) time — scan the tiny header, then jump over the payload without re-reading it. O(T) output space, which is unavoidable since the output *is* the answer.

**Lower bound note:** you cannot beat linear. Any correct encoder must be injective, and considering just the `256^L` lists consisting of a single `L`-character string, they require distinct encodings while fewer than `256^L` strings of length `< L` exist — so some input of total size `T` must encode to length ≥ `T`, making Ω(T) output size unavoidable in the worst case.

---

## 8. Common mistakes

1. **Picking a "safe" delimiter.** Impossible — the input alphabet is all 256 ASCII characters, so every candidate delimiter (including `\0` or a Unicode char) can appear in a payload.
2. **Using `split('#')` in decode.** Wrong whenever a payload contains `'#'`. The parser must **jump by `L`**, never search inside payload.
3. **Losing `[]` vs `[""]`.** Any join-based format maps both to `""` (and Python's `"".split(",")` silently returns `[""]`, masking the bug).
4. **Off-by-one on the cursor restart.** `i = j + 1 + L`. Writing `j + L` (drops payload) or `j + 2 + L` (skips a char) corrupts everything downstream.
5. **Confusing the value `L` with indices.** `L` is a count; `j+1` and `j+1+L` are positions; the slice end is exclusive.
6. **Dropping empty strings** (e.g., filtering falsy entries). An empty string still needs its `0#` — removing it breaks count, order, and values.
7. **Deduplicating anywhere** (using a set, or a dict keyed by string). `["a","a"]` must come back as `["a","a"]`.
8. **Assuming `decode` must handle arbitrary garbage.** It doesn't — but *say so*, and optionally add bounds checks (`j < len(s)`, digit validation) if the interviewer pushes on robustness.
9. **Python:** building the encoded string with `+=` in a loop (can be quadratic; use list + `join`); using `str.isdigit()` in the header scan (it accepts non-ASCII digits like `'٣'` — harmless here since our encoder only emits `0–9`, but comparing to `'#'` is exact).
10. **Answering "just use JSON."** `json.dumps`/`loads` round-trips losslessly, but it dodges the design question the interviewer is actually asking. Mention it as real-world context at most.

### Java / C++ / Python porting gotchas

| Language | Gotcha |
|---|---|
| Java | Don't round-trip through `getBytes()` / `new String(bytes)` with the default UTF-8 charset: chars 128–255 become *two* bytes, so byte-length ≠ `s.length()` and your length headers corrupt. Keep everything as `char`/`StringBuilder`, or explicitly use ISO_8859_1 (1:1 bytes↔chars for 0–255) if you must touch bytes. |
| Java | Pre-size the `StringBuilder` (`totalLen + 4*n`); avoid `String.split`/regex entirely — pure index arithmetic. |
| C++ | `std::string` holds embedded `\0` fine, but `c_str()`, `strlen`, and `printf("%s")` truncate at the first `\0` — never route payloads through C-string APIs. |
| C++ | `std::stoi` throws on malformed input; parse manually by index (or catch). Use `size_t` indices and `out.reserve(...)` on the encoded string. |
| Python | Already covered above: `join` over `+=`; exact `!= "#"` over `isdigit()`. |

---

## 9. Test plan — propose these out loud before/after coding

| # | Input | Encoded | Expected decode | What it guards |
|---|---|---|---|---|
| 1 | `["Hello","World"]` | `5#Hello5#World` | same | official example 1 |
| 2 | `[""]` | `0#` | `[""]` | official example 2; empty string is still an element |
| 3 | `[]` | `""` | `[]` | **empty list ≠ `[""]`; loop must simply not run** |
| 4 | `["","","x"]` | `0#0#1#x` | same | multiple empties; count preserved |
| 5 | `["a,b","c"]` | `3#a,b1#c` | same | delimiter char in payload |
| 6 | `["3#abc","#","12"]` | `5#3#abc1##2#12` | same | `'#'` and digits in payload (adversarial) |
| 7 | `["a","a"]` | `1#a1#a` | `["a","a"]` | duplicates preserved, no dedup |
| 8 | `["\x00\x80ab"]` | `4#...` | same | NUL and high-ASCII bytes |
| 9 | `["y"*199] * 99` | ~20,097 chars | same | max size per constraints |

Say at least **1–3 out loud before coding** (the `[]` vs `[""]` distinction is the one interviewers wait to hear), and 5–7 immediately after ("now let me stress the parser with its own delimiters").

Round-trip harness (list equality in Python is elementwise, so order and duplicates are checked for free):

```python
cases = [
    [], [""], ["Hello", "World"], ["", "", "x"], ["a,b", "c"],
    ["3#abc", "#", "12"], ["a", "a"], ["\x00\x80ab"], ["y" * 199] * 99,
]
for c in cases:
    assert decode(encode(c)) == c, c

# randomized property test over the full 256-char alphabet
import random
for _ in range(1000):
    strs = ["".join(chr(random.randrange(256)) for _ in range(random.randrange(200)))
            for _ in range(random.randrange(100))]
    assert decode(encode(strs)) == strs
```

---

## 10. Transferable patterns & related problems

**Pattern: framing / self-describing data.** When the payload alphabet covers your separator alphabet, stop making the parser *search* inside data. Choose: **length prefixes** (best), **fixed-width fields**, or **escaping + count**. Never let payload characters be load-bearing for your parser.

- Same trick in the wild: HTTP chunked transfer encoding, netstrings, Bencode, protobuf length-delimited fields, TLV wire formats, and message framing over TCP (a byte stream has no message boundaries — you must frame them yourself).
- Related LeetCode:
  - **394. Decode String** — same "number + payload" reading, plus nesting/recursion.
  - **443. String Compression** — writing counts inline; watch multi-digit counts.
  - **38. Count and Say** — self-describing sequences.
  - **297 / 428. Serialize and Deserialize (Binary / N-ary) Tree** — the same principle generalized: *structure must be recoverable from the encoding alone* (preorder + null markers, or explicit child counts).
  - **535. Encode and Decode TinyURL** — bijective encoding design.
  - **165. Compare Version Numbers / 71. Simplify Path** — parsing delimited fields where empties and repeated delimiters matter.

---

## 11. Full interview talk track

1. **Clarify the contract (30s).** "I'll assume `decode` only ever sees output of my own `encode`, the two machines share no memory, and the single string is the only channel — so it must carry the values *and* the structure: count, boundaries, order, duplicates. Round-trip must be exact."
2. **Brute force + kill it (60s).** "Simplest idea: join with a delimiter and split. On `["Hello","World"]` that gives `"Hello,World"` and works. But constraints say payloads can be any of the 256 ASCII characters, so a payload can *contain* my delimiter — `["a,b","c"]` splits into three strings. And there's a second, sneakier failure: an empty list and a list with one empty string both join to `""`, so the count is unrecoverable. Any correct encoding has to be injective; this one isn't."
3. **Attempt 2, then pivot (30s).** "Escaping CSV-style fixes delimiter collisions but not the count problem — I'd have to bolt on a header. That's two mechanisms; there's one that does both."
4. **The insight (45s).** "Make the data self-describing: prefix each string with its length and a `'#'`. The decoder reads digits up to `'#'`, parses the length, and takes *exactly* that many characters — it never scans payload, so `'#'` or digits inside a string can't confuse it. Structure is explicit, so `[]` → `""` and `[""]` → `"0#"` are finally different. This is HTTP chunked transfer encoding in miniature."
5. **Algorithm + index discipline (45s).** "Encode: join `len#s` triples. Decode: cursor `i` always starts a header; scan `j` to the `'#'`; `L = int(s[i:j])` is a *value*, not an index; payload is `s[j+1 : j+1+L]`; restart at `i = j+1+L`. That one line is where the off-by-ones live, so I'll be careful."
6. **Complexity (20s).** "O(total characters) time both ways, O(1) extra space beyond the unavoidable output. That's optimal — the encoded string has to be at least as long as the payload in the worst case, since distinct single-string inputs need distinct encodings."
7. **Edge cases (30s).** "Empty list round-trips to empty list; `[""]` → `0#`; duplicates preserved; a payload like `'3#abc'` is safe because I jump over it; max size ~20k chars is trivial."
8. **Code, then test (rest).** Write ~15 lines; run the harness: official examples, `[]`, `[""]`, delimiter-in-payload, `'#'`-in-payload, duplicates.

---

## 12. Say it in 60 seconds

> "The trap here is ambiguity. If I join strings with a delimiter, the delimiter can appear inside the data — the input allows all 256 ASCII characters — so splitting is ambiguous. And even escaping doesn't save me, because an empty list and a list with one empty string both encode to an empty string, so the decoder can't recover the count. So I make the data self-describing: each string is written as its length, then a `'#'`, then the string. Encoding is just a join of those triples. Decoding reads digits up to the `'#'`, parses that as a count, takes exactly that many characters, and jumps the cursor past them — I never search inside a string, so any `'#'` or digits in a payload are harmless. An empty list encodes to the empty string and decodes back to the empty list; a single empty string encodes to `0#`. It's linear time and space in the total characters, which is optimal since the output has to hold the payload anyway, and the one off-by-one to nail is restarting the cursor at the `'#'`'s index plus one plus the length. It's HTTP chunked transfer encoding in miniature."
