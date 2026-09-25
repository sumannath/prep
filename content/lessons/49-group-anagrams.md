# Group Anagrams — Complete Interview Lesson (LeetCode 49)

---

## 1. Restating the Problem

**Given:** an array `strs` of up to 10⁴ strings of lowercase English letters (each of length 0–100).
**Return:** a list of groups, where each group contains all strings that are anagrams of each other, and each group contains *every* such string from the input.

Two strings are **anagrams** iff one can be rearranged into the other — equivalently, they have the *same multiset of characters* (same characters, same counts).

**Assumptions to state out loud before coding:**
- The answer's order — across groups and within groups — is explicitly arbitrary. Any valid partition is accepted.
- Every input string must appear in exactly one group, exactly once. **Duplicates are not removed**: `"abc", "abc"` are anagrams of each other under the identity rearrangement, so they form one group of two.
- The empty string `""` is valid input and forms its own group.
- We return the **strings themselves (values)**, not their indices. (If an interviewer variant asks for indices, the only change is appending `i` inside the loop instead of `s` — see §5.)

---

## 2. Decoding the Constraints

| Constraint | Value | What it implies |
|---|---|---|
| `strs.length` | ≤ 10⁴ | An O(n²) *pair-comparison* algorithm does ~5·10⁷ pair checks — borderline-to-TLE once you multiply by string work. |
| `strs[i].length` | ≤ 100 (and ≥ 0!) | Total input ≤ 10⁴ × 100 = **10⁶ characters**. Anything proportional to total characters is fast. Empty strings are legal. |
| Alphabet | 26 lowercase letters | A fixed-size count array of 26 is viable; per-string work can be O(L + 26), beating a sort. |

**Budget math:** the optimal solution should touch each character a constant number of times → ~10⁶ operations. Anything at ~10⁹–10¹⁰ (pairwise comparisons) will time out.

---

## 3. Brute Force: Compare Every Pair

**Idea:** Scan the array left to right. For each unplaced string, walk the rest of the array and absorb every anagram of it. Track placement with a boolean array indexed by **index** (not value), so duplicates are handled naturally — each position is consumed exactly once.

```python
def group_anagrams_brute(strs):
    n = len(strs)
    used = [False] * n              # used[i] refers to strs[i] by INDEX
    groups = []                     # groups hold VALUES (the strings)

    def is_anagram(a, b):
        if len(a) != len(b):
            return False
        counts = [0] * 26
        for ch in a:
            counts[ord(ch) - 97] += 1
        for ch in b:
            counts[ord(ch) - 97] -= 1
        return all(c == 0 for c in counts)

    for i in range(n):
        if used[i]:
            continue
        group = [strs[i]]
        used[i] = True
        for j in range(i + 1, n):
            if not used[j] and is_anagram(strs[i], strs[j]):
                group.append(strs[j])
                used[j] = True
        groups.append(group)
    return groups
```

**Worked trace on Example 1** (`["eat","tea","tan","ate","nat","bat"]`):

| Anchor | Pairwise results (j = anchor+1 … end) | Group emitted |
|---|---|---|
| `i=0` `"eat"` | `tea` ✓ · `tan` ✗ · `ate` ✓ · `nat` ✗ · `bat` ✗ | `["eat","tea","ate"]` |
| `i=1` | already used → skip | — |
| `i=2` `"tan"` | `ate` used · `nat` ✓ · `bat` ✗ | `["tan","nat"]` |
| `i=3, i=4` | used → skip | — |
| `i=5` `"bat"` | no unplaced strings left | `["bat"]` |

Output: `[["eat","tea","ate"], ["tan","nat"], ["bat"]]` — valid, since order is free.

**Complexity:** O(n² · L) time (each of ~n²/2 pairs costs O(L + 26) to compare) and O(n) extra space for `used`. At n = 10⁴, L = 100 that's on the order of **10¹⁰ elementary operations** — TLE. Note that the variant "sort each string, then nested-loop over equal sorted forms" is *also* O(n² · L) in the grouping phase; sorting just makes each comparison O(1) after O(n · L log L) preprocessing.

---

## 4. The Core Insight

> **"Is an anagram of" is an equivalence relation** (reflexive, symmetric, transitive). Grouping an equivalence relation doesn't require comparing pairs — it requires computing, once per element, a **canonical key** `k(s)` such that:
>
> `k(a) == k(b)` ⟺ `a` and `b` are anagrams.
>
> Then bucket by key in a hash map. The pairwise O(n²) test collapses into n single-key computations.

This reframing turns the problem into: *design a good canonical key*. Three criteria:

1. **Correct (iff, not just if):** key equality must match anagram equality *in both directions*.
2. **Hashable & immutable.**
3. **Cheap to build and to hash.**

| Candidate key | Build cost | Correct? | Why / why not |
|---|---|---|---|
| Sorted string `''.join(sorted(s))` | O(L log L) | ✅ | Anagrams ⟺ same multiset ⟺ same sorted form. |
| 26-letter count tuple | O(L + 26) | ✅ | Same multiset ⟺ same counts; hashing costs O(26). |
| Sorted string via counting sort | O(L + 26) | ✅ | Fixed 26-letter alphabet lets counting sort beat comparison sorting, which needs Ω(L log L) comparisons since a binary-comparison sort must distinguish Θ(L log L) worth of orderings. |
| `set(s)` / `frozenset(s)` | O(L) | ❌ | Loses multiplicities: `"aab"` and `"abb"` both give `{a, b}` → false merge. |
| `sum(map(ord, s))` | O(L) | ❌ | Collides: `ord('a')+ord('d') == ord('b')+ord('c')`. |
| Product of per-letter primes | O(L) | ✅ *only with big ints* | Unique factorization makes it injective — but each char multiplies in a prime up to 101 (~6.7 bits), so a 64-bit int overflows after ~9–10 worst-case characters, creating collisions; Python's big ints are correct but hashing 200-digit integers is slow. |

The last row is a classic "clever but wrong" interview trap — call it out proactively.

---

## 5. Optimal Approach: Bucket by Canonical Key

### Solution A — sorted-string key (simplest to write under pressure)

```python
from collections import defaultdict

class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        groups = defaultdict(list)
        for s in strs:
            key = ''.join(sorted(s))   # canonical signature
            groups[key].append(s)      # bucket the ORIGINAL string s
        return list(groups.values())
```

### Solution B — 26-count tuple key (optimal asymptotics)

```python
from collections import defaultdict

class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        groups = defaultdict(list)
        for s in strs:
            counts = [0] * 26
            for ch in s:
                counts[ord(ch) - ord('a')] += 1   # ord('a') == 97
            groups[tuple(counts)].append(s)       # tuple: immutable, hashable
        return list(groups.values())
```

> **Indices vs. values:** both versions store the *values* (`s`). For an "return indices" variant, use `for i, s in enumerate(strs)` and `groups[key].append(i)`.

### Trace — Example 1 (Solution A)

| i | `strs[i]` | key | dict after this step |
|---|---|---|---|
| 0 | `eat` | `aet` | `{aet: [eat]}` |
| 1 | `tea` | `aet` | `{aet: [eat, tea]}` |
| 2 | `tan` | `ant` | `{aet: [eat, tea], ant: [tan]}` |
| 3 | `ate` | `aet` | `{aet: [eat, tea, ate], ant: [tan]}` |
| 4 | `nat` | `ant` | `{aet: […], ant: [tan, nat]}` |
| 5 | `bat` | `abt` | `{aet: […], ant: […], abt: [bat]}` |

Return `list(groups.values())` → `[["eat","tea","ate"], ["tan","nat"], ["bat"]]`. This differs from the sample output's arrangement but is **accepted** — the problem allows any order.

With Solution B the keys are the full 26-tuples; the same bucketing results from keys with nonzero entries `{a:1,e:1,t:1}`, `{a:1,n:1,t:1}`, `{a:1,b:1,t:1}`.

### Trace — Example 2: `[""]`
`""` sorts to `""` (or counts to the all-zero tuple) → one bucket → `[[""]]`. **No special-casing needed** — the general code already handles it.

### Trace — Example 3: `["a"]`
Key `"a"` (or `(1,0,…,0)`) → one bucket → `[["a"]]`.

---

## 6. Complexity Analysis

Let `n = len(strs)`, `L =` max string length, `T = Σ len(sᵢ)` (total characters, ≤ 10⁶).

| Approach | Time | Extra space | Verdict |
|---|---|---|---|
| Pairwise comparisons (§3) | O(n² · L) ≈ 10¹⁰ ops | O(n) | TLE |
| Hash map, sorted key | O(n · L log L) ≈ 7·10⁶ | O(n·L) for keys + output | Fast, simplest |
| Hash map, 26-count key | O(n · (L + 26)) ≈ 10⁶ | O(26·n) for keys + output | Optimal |
| Any correct algorithm | Ω(T) time | Ω(T) space | Unavoidable floor |

Notes on the bounds:
- **Ω(T) floor:** every correct algorithm must at least read each input character and write each output character, so total time/space is Ω(T) regardless of technique — Solution B matches it up to constants.
- **Hash operations:** each dict insert/lookup is expected amortized O(1) (Python additionally randomizes string hashes via `PYTHONHASHSEED`, defusing adversarial collision chains; the pathological worst case per op is O(n), but it's not a practical concern here).
- **Key size nuance:** sorted keys cost O(n·L) to store; count keys cost only O(26·n) — strictly better once L > 26.

---

## 7. Language Gotchas (Java / C++ / Python)

| Language | Gotcha | Fix |
|---|---|---|
| **Java** | `Map<int[], List<String>>` silently fails: arrays use identity-based `hashCode`/`equals`, so equal-content arrays never match — you get one bucket per string. | Key on `Arrays.toString(counts)` or a `String` built from counts; `List<Integer>` also works but autoboxes every count (fine here — counts ≤ 100 fall inside the `Integer` cache of −128…127, so no allocation, just churn). |
| **C++** | `std::unordered_map<std::vector<int>, …>` **won't compile** — `std::hash` has no specialization for `vector`/`array`. | Use `std::map<std::vector<int>, …>` (adds an O(log n) factor), a custom FNV-1a hasher over the 26 ints, or encode counts as a `std::string` key like `"1,0,0,…"`. |
| **C++** | `std::sort(s.begin(), s.end())` mutates the string in place — if you sort the input element and then push it, you emit *sorted* originals. | `std::string key = s; std::sort(key.begin(), key.end());` — keep the original for output. |
| **Python** | `groups[list_of_counts].append(s)` → `TypeError: unhashable type: 'list'`. | `tuple(counts)` or `''.join(...)`. Prefer `defaultdict(list)` over `.setdefault` gymnastics. |

---

## 8. Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Key = `set(s)` or `frozenset(s)` | `"aab"` and `"abb"` (same chars, different counts) merge into one group | Preserve multiplicity: counts tuple or sorted string |
| Key = `sum(ord(c) for c in s)` | `"ad"` / `"bc"` collide | Use a key that's *iff*-correct (§4) |
| Pre-deduping input with `set(strs)` | Duplicate strings vanish from the output | Identical strings are anagrams of themselves — every element appears once |
| Appending the *sorted* string to the group | Output contains modified data | Bucket the original `s`; the key is for lookup only |
| `ord(ch) - 96` or missing `- ord('a')` | `IndexError`, or index 1–26 into a 26-slot array | Anchor at `ord('a') == 97`, indices 0–25 |
| "Handling" the empty string with an `if` | Extra branch, or `""` dropped entirely | The general path already keys `""` correctly — trust it |
| Returning groups sorted / worrying about order | Wasted effort | Problem grants any order, within and across groups |
| Prime-product key in Java/C++ | Overflow → wraparound → unrelated strings grouped | Use counts (§4 table) |

---

## 9. Test Cases to Propose Out Loud

Say these before/while coding — it signals rigor and catches key-design bugs early.

| # | Input | Expected groups (any order) | What it stress-tests |
|---|---|---|---|
| 1 | `["eat","tea","tan","ate","nat","bat"]` | `[["bat"],["nat","tan"],["ate","eat","tea"]]` | Official example 1 |
| 2 | `[""]` | `[[""]]` | Official — empty string, all-zero key |
| 3 | `["a"]` | `[["a"]]` | Official — single element |
| 4 | `["abc","abc","abc"]` | one group of **three** | Duplicates are kept (identity anagram); no accidental dedup |
| 5 | `["", "ab", "", "ba"]` | `[["",""], ["ab","ba"]]` | Multiple empties co-group; catches a "skip empty strings" bug |
| 6 | `["aab", "abb"]` | two separate groups | Kills set-based / sum-based keys (same charset & length, different multiset) |
| 7 | `["ab", "ba", "abc"]` | `[["ab","ba"], ["abc"]]` | A prefix of another string is *not* an anagram of it — length matters |

---

## 10. Full Talk Track (while solving)

1. **Restate:** "We need to partition the strings so every anagram family ends up together; order is arbitrary; duplicates stay; empty strings are legal."
2. **Brute force:** "Compare every pair with a 26-count check — O(n²·L), ~10¹⁰ ops at these constraints. Too slow."
3. **Insight:** "Anagram-ness is an equivalence relation, so I can bucket instead of comparing: one canonical key per string, equal exactly when strings are anagrams."
4. **Key choice:** "Two options: sort the string — O(L log L) — or count 26 frequencies — O(L + 26). Both are iff-correct. I'll bucket by key in a dict of lists and return the buckets."
5. **Code narration:** "Default-dict of lists; for each string build the key, append the *original* string; return `values()`." (Mention `tuple` for hashability if using counts.)
6. **Complexity:** "O(total characters) time and space with count keys; the space is unavoidable since it's the output size."
7. **Dry run + tests:** trace Example 1 briefly; cite tests 4–6 from §9.

---

## 11. Transferable Patterns & Related Problems

- **Canonical-form hashing:** reduce an equivalence relation to a per-element key, then bucket. Any "group things that are X-equivalent" problem fits.
- **Count array over a fixed alphabet:** beats sorting (O(L) vs O(L log L)) — reuse everywhere letters are bounded.
- **Key-design checklist:** *iff-correct, immutable, cheap.* The `set`-key and prime-product bugs are the standard violations.
- Related problems:
  - **LC 242 Valid Anagram** — the pairwise check from §3, standalone.
  - **LC 438 Find All Anagrams in a String** / **LC 567 Permutation in String** — same signature idea in a sliding window with live counts.
  - **LC 249 Group Shifted Strings** — same bucketing skeleton; the key becomes the tuple of adjacent-character differences.
  - **LC 205 Isomorphic Strings** — canonical key built from a *mapping*, not counts.
- **Likely follow-ups:** *Unicode/arbitrary characters* → key from a `Counter` as `frozenset(counter.items())` (a multiset of `(char, count)` pairs). *Data too big for memory* → partition records by hash of the key across shards, then group within each shard.

---

## 12. Say It in 60 Seconds

> "Group Anagrams: anagram-ness is an equivalence relation, so instead of comparing every pair — n squared times string length, way too slow at these constraints — I compute one canonical key per string and bucket them in a hash map of lists. Two key options: sort the string, costing length-log-length, or count the 26 letter frequencies, costing linear per string, which gives overall time proportional to total input characters — optimal, since you can't beat reading every character. Equal keys happen exactly when strings are anagrams, so each bucket is one group, and I return the buckets with the original strings. Space is the same order as the output, which is unavoidable. Gotchas I'd flag: keys must be immutable — tuple, not list; identical strings are anagrams of themselves, so keep duplicates; and the empty string needs no special case, it keys correctly on its own. Tests: the three official examples, all-duplicate strings, two empty strings, and 'aab' versus 'abb' to catch a bad set-based key."
