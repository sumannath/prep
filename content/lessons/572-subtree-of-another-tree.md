# Subtree of Another Tree (LeetCode 572) — Complete Lesson

## 1. Problem restatement

**In your own words:** Given two binary trees `root` (size *m*) and `subRoot` (size *n*), decide whether some node `v` in `root` has the property that **the entire tree rooted at `v` — node value plus *all* descendants — is structurally and value-wise identical to `subRoot`**. Return a boolean.

Three semantics to nail down out loud before coding:

1. **"All descendants" is the whole point.** A subtree is not "a path that looks like subRoot" and not "a connected chunk of nodes." Every descendant of the anchor node must participate, with exact positions matching.
2. **The whole tree counts.** `subRoot` may equal `root` itself, so the root is a valid anchor. Forgetting this anchor is a classic bug.
3. **The number of candidate anchors is exactly m** — one per node of `root`. This is why the problem decomposes so cleanly.

Also distinguish this from look-alike problems: it is *not* "does root contain a path matching subRoot's path" (that's LC 1367's flavor), and *not* "is subRoot's node set a connected subgraph."

**Input format note (indices vs. values):** the examples are level-order encodings — the children of the node stored at index `i` live at indices `2i+1` and `2i+2`, and `null` entries are placeholders for missing children. When tracing Example 2, `[3,4,5,1,2,null,null,null,null,0]` means node `2` (at index **4**, a *value*, not an index) has left child `0` and no right child. Don't conflate array position with node value when tracing.

---

## 2. Decoding the constraints

| Constraint | What it tells you |
|---|---|
| `root` has 1–2000 nodes | Small *m*. An O(m·n) anchor scan is at most 2000 × 1000 = 2·10⁶ node comparisons — trivially fast. The "brute force" **is** the accepted standard solution here. |
| `subRoot` has 1–1000 nodes | `subRoot` is **never empty**. So an anchor of `None` can immediately return `False`; there is no "empty tree is a subtree" case to agonize over (though you should still say the sentence out loud — see §9). |
| Values in [−10⁴, 10⁴] | **Duplicates exist, and values are multi-digit and can be negative.** Never key logic on "the node with value v" (there may be many), and if you serialize, delimit values — `-12` vs. `-1,2` and `12` vs. `1,2` are real collision hazards. |
| No balance guarantee | Worst-case recursion depth is ~m + n ≈ 3000. Python's default recursion limit (~1000) can be exceeded on a skewed tree — know the workaround. |

---

## 3. The core insight (two lenses)

**Lens 1 — anchor scan + equality predicate (decomposition).**
The problem factors into two independent, easy subproblems:

- **Equality:** "are these two trees identical?" → the Same Tree (LC 100) routine.
- **Search:** "try every candidate anchor" → every node of `root`, i.e., a pre-order walk.

This is exactly naive string matching lifted to trees: fix a pattern (`subRoot`), slide over all anchor positions (nodes of `root`), test exact equality at each.

**Lens 2 — canonicalization (representation change).**
If you serialize each tree in **preorder with explicit null markers and self-delimiting values**, then *every subtree of `root` occupies one contiguous, self-delimiting block of the serialization*. "Is subRoot a subtree of root?" becomes "is `serialize(subRoot)` a contiguous substring of `serialize(root)`?" — which imports the entire string-matching toolbox (built-in `find`, KMP, suffix structures).

Both lenses rest on the same fact: a subtree is identified by **a single node plus all its descendants**, so candidates are few and their serializations are contiguous.

---

## 4. Baseline solution: anchor scan + Same Tree — O(m·n)

```python
from typing import Optional

# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val; self.left = left; self.right = right

class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        if root is None:
            return False                      # subRoot is guaranteed non-empty (n >= 1)
        if self.is_same(root, subRoot):       # root itself is a candidate anchor
            return True
        return self.isSubtree(root.left, subRoot) or \
               self.isSubtree(root.right, subRoot)

    def is_same(self, a: Optional[TreeNode], b: Optional[TreeNode]) -> bool:
        if a is None and b is None:
            return True                       # both subtrees exhausted together: match
        if a is None or b is None:
            return False                      # exactly one exhausted: structure differs
        return a.val == b.val \
            and self.is_same(a.left, b.left) \
            and self.is_same(a.right, b.right)
```

**Why the null rules are the correctness core:** `is_same(None, None) → True` (both sides ended together) and `is_same(x, None) → False` (one side still has descendants) is precisely what enforces "all descendants, exact structure."

### Worked trace — Example 1 (true)

```
root:      3                subRoot:   4
          / \                          / \
         4   5                        1   2
        / \
       1   2

isSubtree(3)
├─ is_same(3, 4): 3 ≠ 4 → False        (anchor 3 fails fast)
├─ isSubtree(4)
│  └─ is_same(4-subtree, subRoot)
│     ├─ 4 == 4 ✓
│     ├─ is_same(1, 1): both leaves → True
│     └─ is_same(2, 2): both leaves → True
│     → True → short-circuit everything → return True
```

### Worked trace — Example 2 (false, and *why*)

```
root:      3                subRoot:   4
          / \                          / \
         4   5                        1   2
        / \
       1   2
          /
         0

isSubtree(3)
├─ is_same(3, 4): 3 ≠ 4 → False
├─ isSubtree(4)                                    ← the near-miss anchor
│  ├─ is_same(4-subtree, subRoot):
│  │   4 == 4 ✓
│  │   ├─ is_same(1, 1): both leaves → True
│  │   └─ is_same(2-subtree, 2):
│  │       2 == 2 ✓
│  │       ├─ is_same(0, None) → False   ← the extra child 0 kills it
│  │       └─ (short-circuited)
│  │   → False
│  ├─ isSubtree(1)
│  │   ├─ is_same(1, 4): 1 ≠ 4 → False
│  │   ├─ isSubtree(None) → False
│  │   └─ isSubtree(None) → False → False
│  └─ isSubtree(2)
│      ├─ is_same(2-subtree, subRoot): 2 ≠ 4 → False
│      ├─ isSubtree(0): is_same(0,4) False; no children → False
│      └─ isSubtree(None) → False → False
│   → False
└─ isSubtree(5)
   ├─ is_same(5, 4) → False
   ├─ isSubtree(None) → False
   └─ isSubtree(None) → False → False
→ False
```

The node-4 anchor matches at the top and on the left branch, then fails one level deeper because root's `2` has a child `0` where subRoot's `2` has none. That is the "all descendants" rule doing its job — a good thing to narrate to the interviewer.

### Complexity

- **Time: O(m·n)** worst case. Each of the m anchors can trigger an `is_same` that walks up to n nodes before failing (worst case: two all-equal skewed trees, where every anchor walks the full pattern before mismatching).
- **Space: O(h_root + h_sub)** recursion, ≤ O(m + n) on a skewed tree, O(log m) balanced.

**Narrate it like this (fuller talk track, ~90 seconds):** "I see two separable pieces: an equality test and a search over anchors. Equality is Same Tree — two nulls match, one null fails, values equal, recurse on both children; that's what enforces 'node plus all descendants.' The search tries the root itself first, then recurses left and right; a `None` anchor is false because subRoot is non-empty. Time is O(m·n) — about two million comparisons at these constraints — space is recursion depth. It's correct and I'd ship it; if you want, I can then get worst-case linear by changing the representation."

---

## 5. Optimal: serialization + substring containment — O(m + n)

### 5.1 Why the serialization format must be airtight

This is where most candidates lose points. Three failure modes, each with a concrete colliding example:

| Format bug | Colliding example | Wrong output |
|---|---|---|
| **No null markers** (preorder values only) | `root` = 1 with **left** child 2 → `"12"`; `subRoot` = 1 with **right** child 2 → `"12"` | `true` (correct answer: `false`) |
| **No value delimiters** | `root` = `[12]` (single node 12) → `"12##"`; `subRoot` = `[1,2]` (node 1, left child 2) → `"12###"` | `true` (correct answer: `false`) |
| **Comma-separated but matched at character level without token alignment** | `root` = 41 with left child 5 → `"41,5,#,#,#"`; `subRoot` = 1 with left child 5 → `"1,5,#,#,#"` — the needle matches at character offset 1 | `true` (correct answer: `false`) |

All three are fixed simultaneously by making every token **self-delimiting**: wrap each value in parentheses and emit `#` for every null pointer. Then any occurrence of the pattern string must begin at a `(` (a genuine token start) and end at a `#` (a genuine, single-character null token), so character-level containment is equivalent to token-level containment. (Alternative that also works: comma-join tokens and search for `"," + needle` inside `"," + haystack` — the sentinel comma forces token-start alignment.)

**Why containment ⟺ subtree (the one-sentence proof you can give):** a full preorder-with-nulls serialization is *complete* — a greedy parse starting at any value token consumes exactly that node's whole subtree — so a token-aligned occurrence of a complete serialization must coincide exactly with some node's subtree block; no straddling is possible because the pattern itself always ends with `#` (the last preorder node's null right child) and starts with a value token.

### 5.2 Code

```python
from typing import Optional, List

class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        def serialize(node: Optional[TreeNode], out: List[str]) -> None:
            if node is None:
                out.append("#")                # explicit null marker: mandatory
            else:
                out.append(f"({node.val})")    # self-delimiting value: mandatory
                serialize(node.left, out)
                serialize(node.right, out)

        big: List[str] = []
        small: List[str] = []
        serialize(root, big)
        serialize(subRoot, small)
        return "".join(small) in "".join(big)  # accumulate in lists, join once
```

### Traces on the official examples

**Example 1:** `serialize(root) = "(3)(4)(1)##(2)##(5)##"`, `serialize(subRoot) = "(4)(1)##(2)##"`. The needle occurs starting right after `"(3)"` — that offset is exactly the node-4 subtree block → **True**. ✓

**Example 2:** `serialize(root) = "(3)(4)(1)##(2)(0)###(5)##"`, needle = `"(4)(1)##(2)##"`. The only `"(4)"` occurrence is at offset 3; after matching `"(4)(1)##"`, the haystack continues with `"(2)(0)…"` while the needle needs `"(2)##"` — mismatch at the char after `"(2)"` → **False**. ✓ The serialization makes the near-miss visible: the `0` is literally a different token in the block.

### Complexity and the worst-case guarantee

- Building both strings: **O(m + n)** tokens/time/space (values ≤ 6 characters including parens/sign).
- Substring search: **O(m + n)** with KMP. Python's built-in `str.find` is safe to use in an interview: modern CPython (3.10+) runs a Crochemore–Perrin *Two-Way* search for longer needles, which is linear worst case (older versions used a Horspool-style search that is linear on typical inputs but O(m·n) in theory). If you want to *claim* worst-case linear unconditionally, name KMP and offer this drop-in:

```python
def contains(hay: str, needle: str) -> bool:
    """KMP: O(len(hay) + len(needle)) worst case."""
    if not needle:
        return True
    lps, k = [0] * len(needle), 0
    for i in range(1, len(needle)):                 # prefix function
        while k and needle[i] != needle[k]:
            k = lps[k - 1]
        if needle[i] == needle[k]:
            k += 1
        lps[i] = k
    k = 0
    for ch in hay:                                  # scan
        while k and ch != needle[k]:
            k = lps[k - 1]
        if ch == needle[k]:
            k += 1
            if k == len(needle):
                return True
    return False
```

- **Lower bound:** any correct algorithm is Ω(m + n), because a single unexamined node's value or child pointer could flip the answer — so this approach is asymptotically optimal. (Deterministic linear-time tree pattern matching also exists in the literature via suffix structures over traversal strings; it reduces to ordinary string matching, so it inherits the linear bound — nice to name, overkill to implement.)

### Two bonus variants worth being able to sketch

**(a) Set of all subtree serializations** (natural lead-in to LC 652):

```python
class Solution:
    def isSubtree(self, root, subRoot):
        root_serials = set()

        def ser(node, record):
            if node is None:
                return "#"
            s = f"({node.val})" + ser(node.left, record) + ser(node.right, record)
            record.add(s)                    # record every subtree's canonical form
            return s

        ser(root, root_serials)
        sub = ser(subRoot, set())            # throwaway set: do NOT pollute root_serials
        return sub in root_serials
```

Cost: O(m·h_root) — each node's token appears once per ancestor, so total serialized length is the sum of subtree sizes. Fine at m ≤ 2000, but the two-string version above is strictly better. **Note the `record` parameter:** recording `subRoot`'s own serial into the shared set before the membership test makes the check vacuously true — a real bug people ship.

**(b) Merkle-style hashing** — O(1) fingerprints per node, O(m + n) expected:

```python
class Solution:
    def isSubtree(self, root, subRoot):
        MOD, BASE = (1 << 61) - 1, 1_000_003
        seen = set()

        def h(node, record=None):
            if node is None:
                return 0
            x = (node.val * BASE + h(node.left, record)) * BASE + h(node.right, record)
            x %= MOD
            if record is not None:
                record.add(x)
            return x

        h(root, seen)                # fingerprint every node of root
        return h(subRoot) in seen    # subRoot's hashes are not recorded
```

Collision honesty: with m·n ≈ 2·10⁶ pairings against modulus 2⁶¹−1, a random collision probability is on the order of 10⁻¹² — negligible but not zero; if asked for exactness, keep a `hash → [nodes]` map and certify each hash hit with `is_same` (expected O(m + n), exact always). This variant is the right answer to "what if the trees are huge / streamed and you can't materialize strings?"

---

## 6. Complexity summary

| Approach | Time | Extra space | Notes |
|---|---|---|---|
| Anchor scan + Same Tree | O(m·n) worst | O(h_root + h_sub) recursion | **Default interview answer**; passes constraints trivially |
| Serialize + built-in `in` | O(m+n) typical (linear worst on CPython ≥ 3.10) | O(m + n) | Fastest to write; format correctness is the whole game |
| Serialize + KMP | O(m + n) guaranteed | O(m + n) | Claim "worst-case linear" only with this (or cite the Two-Way behavior) |
| All-subtree strings in a set | O(m·h_root) | O(m·h_root) | Each node counted once per ancestor; natural bridge to LC 652 |
| Merkle hash + set (+ verify on hit) | O(m + n) expected | O(m) | For huge/streamed inputs; verify-on-hit makes it exact |

Both O(m + n) approaches meet the Ω(m + n) "must read every node" lower bound (one unseen value or child pointer can flip the answer), so they're asymptotically optimal.

---

## 7. Common mistakes

| # | Mistake | Symptom / why it's wrong | Fix |
|---|---|---|---|
| 1 | Matching a *path* instead of a full subtree | Example 2 returns `true` (node 4 matches down the left branch; the extra child 0 is ignored) | `is_same` must compare **both** children recursively and treat one-sided `None` as failure |
| 2 | Skipping the root as an anchor | `root == subRoot` returns `false` | Check `is_same(root, subRoot)` before/while recursing |
| 3 | `is_same` base-case bug | e.g., collapsing to `if not a or not b: return a == b` without thinking — works here by accident (`None == None` is `True`, node `== None` is `False`), but fragile; the classic broken variant is `return False` when both are `None` | Write both-`None → True`, one-`None → False` explicitly |
| 4 | Assuming empty `subRoot` is a subtree | Constraints say n ≥ 1; semantics are ambiguous anyway | Return `False` on a `None` anchor; state the assumption out loud |
| 5 | Keying on values as if unique | Duplicates like `root=[2,2,2,2,null,2]` break "find the node with value v" logic | The anchor scan checks **every** node; never dedupe by value |
| 6 | Serialization without nulls or delimiters | False positives (`12` vs `1,2`; left-child-2 vs right-child-2; `41,5` vs `1,5`) | `(value)` tokens + `#` for every null (see §5.1) |
| 7 | Polluting the serial-set with `subRoot`'s own serialization | Membership test becomes vacuously true | Record only root's serials; serialize `subRoot` into a throwaway (§5.2a) |
| 8 | Building strings with `s += token` per node | O(m²) worst-case copying | Accumulate into a list; `"".join` once |
| 9 | Python recursion limit | Skewed depth ≈ m + n ≈ 3000 frames > default ~1000 → `RecursionError` | `sys.setrecursionlimit(10**4)`, or convert to an explicit-stack iterative DFS |
| 10 | Micro-bug: comparing with `is` | `a.val is b.val` breaks for ints outside CPython's small-int cache | Use `==` for values, `is None` for null checks |

**Language-specific gotchas (short list):**

| Language | Gotcha | Why it bites here |
|---|---|---|
| Java | `Integer` comparison with `==` | If values get autoboxed (e.g., in a `Deque<Integer>` or map), `==` compares references and only works within the −128..127 cache; values go to 10⁴, so it *passes small tests and fails big ones*. Use `.equals()` or unboxed `int`. |
| Java | `String` `==` vs `.equals` | Serializations stored in a `HashMap<String,…>`: keys must be compared with `.equals` (containers do this for you), but any hand-rolled comparison with `==` compares references. Also use `StringBuilder`, not `+=`, inside recursion. |
| C++ | Passing `std::string` **by value** through recursion | One copy per call → quadratic total copying; accumulate into a single `std::string& out` or return by move. |
| C++ | Signed overflow in polynomial hashing | Overflow on `int`/`long long` is UB; use `unsigned long long` (wraparound is defined) or an explicit modulus, and `nullptr` checks throughout. |

---

## 8. Test cases to propose out loud

State these before or after coding — it signals you think about edges, not just the happy path:

| # | Input | Expected | What it stress-tests |
|---|---|---|---|
| 1 | `root=[3,4,5,1,2]`, `sub=[4,1,2]` (Example 1) | `true` | Anchor found mid-tree |
| 2 | `root=[3,4,5,1,2,null,null,null,null,0]`, `sub=[4,1,2]` (Example 2) | `false` | **Near-miss**: full-descendant requirement; extra child 0 |
| 3 | `root == subRoot` (e.g., `[1,2,3]` both) | `true` | Whole tree is a subtree of itself — root anchor |
| 4 | `root=[1]`, `sub=[1]` / `root=[1]`, `sub=[2]` | `true` / `false` | Single nodes, value equality vs. inequality |
| 5 | `root=[2,2,2,2,null,2]`, `sub=[2,2]` → `true`; then `sub=[2,null,2]` → `false` | `true` / `false` | **Duplicates**: same value, different shape (left vs. right child) — kills any "match by value" shortcut |
| 6 | `root=[-1,2]` (−1 with left child 2), `sub=[-12]` | `false` | Multi-digit/negative serialization trap (`-12` is a substring of `-1,2,…` raw) |
| 7 | `root` = skewed path of 2000 nodes, `sub` = its last 1000 nodes | `true` | Recursion-depth stress; also confirms O(m·n) speed is fine |
| 8 | `root=[1]`, `sub=[1,2]` (sub bigger than root) | `false` | Size-based early rejection |

If you only propose three: **identical trees (#3), the near-miss extra child (#2), and duplicate values with different shapes (#5)** — they cover the three failure modes candidates actually ship.

---

## 9. Transferable patterns & related problems

| Pattern from this problem | Where it reappears |
|---|---|
| **Double recursion**: outer scan over anchors + inner exact-match predicate | LC 100 Same Tree (the inner routine verbatim), LC 101 Symmetric Tree (mirror variant), LC 1367 Linked List in Binary Tree (list-in-tree anchor scan, with a "keep consuming vs. restart" twist), LC 437 Path Sum III (anchor scan + per-anchor path count) |
| **Canonical serialization → reduce to a solved problem** (string containment) | LC 297/449 Serialize & Deserialize, LC 652 Find Duplicate Subtrees (serialize + hash map of all subtree serials — nearly identical machinery), LC 796 Rotate String (containment trick `s in s+s`) |
| **Fingerprinting / Merkle hashes** to avoid materializing full structures | LC 652 again; rolling-hash family (LC 1044, LC 718); any "huge/streamed input" follow-up |
| **Lower-bound framing** (answer depends on every node → Ω(m + n)) | Any containment/matching problem where someone asks "can we do better?" |

**Follow-up questions to be ready for:** "Can you beat O(m·n)?" (serialization + KMP); "Return the matching node / count all matches?" (keep anchors, count verified hits — LC 652 generalizes); "Do it iteratively?" (explicit stack for the anchor scan, iterative `is_same`); "Is the empty tree a subtree?" (clarify: not under this problem's definition, and constraints exclude it).

---

## 10. Say it in 60 seconds

> "This decomposes into two easy pieces: an equality test and a search. The equality test is Same Tree — two nulls match, one null fails, values equal, recurse on both children; that's exactly what enforces 'a node plus all its descendants,' so a near-miss like an extra child correctly fails. The search tries every node of the big tree as an anchor: match here, or in the left, or in the right — and a null anchor is false because subRoot is non-empty. That's O(m·n), about two million comparisons at these constraints, with recursion-depth space. If you want worst-case linear, I serialize both trees in preorder with explicit null markers and self-delimiting values — then every subtree is a contiguous, self-delimiting block — and check string containment with KMP for O(m + n), which also meets the read-everything lower bound. Traps I'd call out: forgetting the whole tree counts as its own subtree, duplicates with different shapes, and serializations that drop nulls or delimiters — '12' versus '1,2' silently flips the answer."
