| 1 | 0 | 1 | 0 | 2 | -inf | A[0]=2 | B[1]=3 | +inf (j=2=b) | left2 (3) > right1 (2) → i too small → lo=1 |
| 2 | 1 | 1 | 1 | 1 | A[0]=2 | +inf (i=1=a) | B[0]=1 | B[1]=3 | both cross checks pass → valid cut |

Odd total → median = max(left1, left2) = max(2, 1) = 2 → 2.0 ✓.

**Trace table Example 2** (A = [1,2] (a=2), B = [3,4] (b=2)): total=4, half=2.

| iter | lo | hi | i | j | left1 | right1 | left2 | right2 | verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 2 | 1 | 1 | 1 | 2 | 3 | 4 | left2 (3) > right1 (2) → lo=2 |
| 2 | 2 | 2 | 2 | 0 | A[1]=2 | +inf | -inf | B[0]=3 | valid |

Even → median = (max(2,-inf) + min(+inf, 3))/2 = (2+3)/2 = 2.5 ✓.

Now brute-force merge trace, Example 2:

| step | i (nums1 ptr) | j (nums2 ptr) | compare | take | merged |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 1 vs 3 | 1 | [1] |
| 2 | 1 | 0 | 2 vs 3 | 2 | [1,2] |
| 3 | 2 (exhausted) | 0 | — | 3 | [1,2,3] |
| 4 | — | 1 | — | 4 | [1,2,3,4] |

Median = (merged[1]+merged[2])/2 = 2.5. Also note O(1)-space counting variant: only need merged[half-1] and merged[half] where half positions... For total N: odd → index (N-1)/2... N=3 → index 1; even → indices N/2-1 and N/2. Stop early after reaching those.

Also duplicates worked micro-example: nums1 = [1,1,1], nums2 = [1,1,1] quick trace maybe one line: i=1,j=2 → all four boundary values = 1 → valid → (1+1)/2 = 1.0. Wait check j bounds: a=3? both length 3, A=nums1 len 3, B len 3, half=3, i=1, j=2 ≤ 3 ✓. left1=nums1[0]=1, right1=nums1[1]=1, left2=nums2[1]=1, right2=nums2[2]=1. Valid immediately. Median even = (1+1)/2 = 1.0 ✓. Good — shows ≤ (not <) is essential: with strict <, 1 < 1 fails and binary search would walk off.

Hmm wait — with strict inequalities and duplicates the search might not find any cut and fall through; that's the bug illustration.

Empty-array test: nums1 = [], nums2 = [2,3]: after swap A=[] (m=0), B=[2,3] (n=2). total=2, half=1. lo=hi=0 → i=0, j=1. left1=-inf, right1=+inf, left2=B[0]=2, right2=B[1]=3. Valid. Even → (max(-inf,2)+min(+inf,3))/2 = (2+3)/2 = 2.5 ✓.

Negative test: nums1 = [-5,-3,0], nums2 = [-1]: A=[-1] (shorter, a=1), B=[-5,-3,0] (b=3). total=4, half=2. i=0,j=2: left1=-inf, right1=-1, left2=B[1]=-3, right2=B[2]=0. Check: -inf ≤ 0 ✓; -3 ≤ -1 ✓ → valid immediately. Even → (max(-inf,-3) + min(-1,0))/2 = (-3 + -1)/2 = -2.0 ✓. 

Disjoint: nums1 = [1,2], nums2 = [3,4,5,6]: A=[1,2], B=[3,4,5,6]. total=6, half=3. lo=0,hi=2. i=1, j=2: left1=1, right1=2, left2=B[1]=4, right2=B[2]=5. Check: 1≤5 ✓; 4≤2 ✗ → lo=2. i=2, j=1: left1=2, right1=+inf, left2=B[0]=3, right2=B[1]=4. 2≤4 ✓; 3≤inf ✓ → valid. Median = (max(2,3) + min(inf,4))/2 = (3+4)/2 = 3.5 ✓ (merged [1,2,3,4,5,6] → (3+4)/2). 

Test list for the test-plan section with expected outputs:

| # | nums1 | nums2 | expected | why it's worth saying out loud |
|---|---|---|---|---|
| 1 | [1,3] | [2] | 2.0 | official |
| 2 | [1,2] | [3,4] | 2.5 | official, even-total averaging |
| 3 | [] | [2,3] | 2.5 | one array empty, even total |
| 4 | [] | [1] | 1.0 | one array empty, single element |
| 5 | [1,1] | [1,1] | 1.0 | duplicates everywhere — catches strict-`<` bugs |
| 6 | [-5,-3,0] | [-1] | -2.0 | negatives, crossing cut |
| 7 | [1,2] | [3,4,5,6] | 3.5 | disjoint ranges |
| 8 | [1,3,5,7] | [2,4,6,8] | 4.5 | fully interleaved |

Maybe trim to keep table manageable — it's fine.

Also mention constraints say m+n ≥ 1, so "both empty" is not a valid input — but a defensive coder might mention what they'd return/assert anyway (good interview habit to note it's excluded by constraints).

Now the "why O(log min(m,n))" derivation: search space = m+1 cut positions (i ∈ [0, m]), halved each iteration → O(log m) iterations, O(1) work each. Since we swap so m = min, O(log min(m,n)). Space O(1) (iterative). Note: recursion-free.

Lower-bound sentence: In the comparison model, Ω(log(min(m,n))) probes are needed in the worst case because there are min(m,n)+1 distinguishable cut outcomes (an adversary can place the arrays' values so any chosen diagonal is the unique valid one), and each comparison shrinks that uncertainty by at most a constant factor. That's my 1-sentence justification — reasonable.

I should be careful not to overclaim; phrase as "widely cited comparison-model lower bound; sketch: ...". One sentence as required.

Also the "discard halves" alternative: at each step, compare A[k/2-1] and B[k/2-1]; discard k/2 elements that can't contain the kth; recurses with O(log(m+n)) — mention as an alternative that also satisfies the bound, with one-line intuition, and note the partition method generalizes better and is more common in interviews. Keep to 2-3 sentences.

Common mistakes — let me finalize the list (aim ~8 items, table format: mistake | symptom | fix):

1. Binary searching the longer array → j = half - i can go out of [0, n]; crash or wrong answers; also degrades to O(log max). Fix: swap so nums1 is shorter (O(1) swap of references).
2. Wrong half convention: half = (m+n)//2 vs (m+n+1)//2. With +1, odd totals put the median in the LEFT part → median = max of left. Mixing conventions → off-by-one madness. Fix: derive, don't memorize; pick left-heavy.
3. Missing sentinels at boundaries (i=0, i=m, j=0, j=n) → IndexError/Segmentation or wrong comparisons. Fix: ±inf sentinels (or explicit branches).
4. Using `<` instead of `≤` in cross-checks → fails with duplicates.
5. Integer division for the average (Java `(a+b)/2`, C++ same, Python `//`) → 2 instead of 2.5. Fix: divide by 2.0 / cast to double / use `/` in Python.
6. Loop/update mismatch: `while lo < hi` with `lo = i + 1; hi = i - 1` style can skip the answer or loop forever. Fix: with inclusive bounds use `lo <= hi` and move to `i±1`; or use `lo < hi` with `hi = i` (never both).
7. Assuming both arrays non-empty → crashes on the empty-side tests the interviewer will ask. Fix: the swap makes m=0 handled naturally.
8. Returning int in the odd case in Python (cosmetic but judges/type-checkers want float); also forgetting that median of ints can be .5.
9. Misreading index vs value: i is a count of elements taken, not an index of the "last taken" — nums1[i-1] is the last taken, nums1[i] is the first not taken. Off-by-one here is the #1 bug.

I'll merge some to keep ~7-8 rows.

Language gotchas subsection:
- Java: `(maxLeft + minRight) / 2` is integer division even when assigned to double → write `/ 2.0`. Sentinels: `Integer.MIN_VALUE/MAX_VALUE` are fine here because |values| ≤ 10^6; if unbounded values were allowed, a sentinel could collide with a real value — prefer `double` ±infinity or explicit null checks. Also `List<Integer>` autoboxing irrelevant but if using `int[]` fine.
- C++: same `/2.0` need (or `static_cast<double>`); mid as `lo + (hi - lo) / 2` habit to avoid overflow in general (not needed at m ≤ 1000 but free); `INT_MIN/INT_MAX` sentinels with same caveat; watch `int` vs `size_t` in `i - 1` when i == 0 — `nums1[i - 1]` with unsigned size_t wraps → guard before subtracting. That's a nice C++ specific gotcha: `(size_t)0 - 1` wraps to huge number → UB/OOB. Definitely include.
- Python: `/` vs `//`; float('-inf') comparisons fine; no overflow.

Complexity table:

| Approach | Time | Space | Meets O(log(m+n))? |
|---|---|---|---|
| Full merge, then index | O(m+n) | O(m+n) | ✗ |
| Two-pointer count to middle | O(m+n) | O(1) | ✗ |
| Binary-search kth by discarding halves | O(log(m+n)) | O(log) stack or O(1) iterative-ish | ✓ |
| Partition binary search (this lesson) | O(log min(m,n)) | O(1) | ✓ (strictly better than required) |

Related problems table:

| Problem | Shared pattern |
|---|---|
| LC 295 Find Median from Data Stream | median maintenance, two heaps (different tool, same goal) |
| LC 378 Kth Smallest in Sorted Matrix | kth-smallest via counting/binary search on value |
| LC 719 Find K-th Smallest Pair Distance | binary search on answer + greedy count |
| LC 1011 Capacity To Ship Packages / LC 410 Split Array Largest Sum | binary search on monotone predicate over answers |
| LC 668 Kth Smallest Number in Multiplication Table | kth-smallest over implicit sorted structure |
| "Kth element of two sorted arrays" (variant) | same partition idea; median = kth at k=(m+n+1)/2 (+ next) |
| LC 240 Search a 2D Matrix II? | hmm — sorted matrix elimination; maybe skip. Could include "Median of two sorted arrays of different sizes" is this. Maybe include LC 1064? no. Keep list tight. |

Maybe also mention "Paint House"? no. Keep to the above.

Full talk track section — a scripted sequence:

1. Clarify: "Median as if merged; even total → average of two middle; either array may be empty; return double."
2. State brute force + complexity honestly: "Merge and index — O(m+n)/O(1) with counting — correct but linear; the log requirement tells me they want the partition trick."
3. Insight narration: "The median is the max of the left half of the merged array. A cut in the merged array = one cut in each array, sizes i and j with i + j = half. Both arrays sorted ⇒ validity is just two cross comparisons of boundary values, and monotone in i ⇒ binary search i over the shorter array."
4. Algorithm: swap shorter; half = (m+n+1)//2; binary search i; sentinels ±inf; odd → max of left; even → (maxLeft + minRight)/2.
5. Complexity: O(log min(m,n)) time, O(1) space; note why shorter array keeps j in range.
6. Tests out loud: official two, empty side, duplicates, disjoint, negatives.
7. Code, then dry-run Example 2 quickly, mention gotchas avoided.

Then final 60-second version:

"Two sorted arrays; I need the merged median in log time, so merging is out. Key idea: the median is determined by a cut that splits the merged data into equal halves. That merged cut is the same as taking i elements from the front of array one and j from array two, where i plus j is half the total. The cut is valid when each array's last-taken element is ≤ the other array's first-not-taken element. Since the arrays are sorted, validity is monotone in i, so I binary search i over the shorter array — that also keeps j in bounds. Boundary cases where a side is empty become minus/plus infinity sentinels. Odd total: answer is the bigger of the two left boundaries; even: average that with the smaller of the two right boundaries. O(log of the shorter length) time, constant space. I'd test: one array empty, all-duplicates, disjoint ranges, and the two official examples, comparing against a linear merge as an oracle."

That's about 45-60 seconds spoken. Good.

Diagrams: include a "cut" ASCII diagram:

```
merged:   1   2   3          (total = 3, half = 2)
        └─ left ─┘└ right ┘

Same cut, viewed per array (i = 1 from nums1, j = 1 from nums2):

nums1:  [ 1 | 3          i = 1  (took 1,3? no...)  
```

Hmm careful: in example 1 after swap A=[2], B=[1,3], i=1, j=1: left = {A[0]=2} ∪ {B[0]=1} = {1,2}; right = {B[1]=3} ∪ {} = {3}. Diagram:

```
A (=nums2):   2  |            i = 1   left: {2}      right: {}
B (=nums1):   1  | 3          j = 1   left: {1}      right: {3}

left = {1, 2}   right = {3}      max(left)=2 ≤ min(right)=3  ✓
```

Good diagram. Also a general "partition bricks" diagram:

```
        left part          right part
A:  A[0] … A[i-1] | A[i] … A[m-1]
B:  B[0] … B[j-1] | B[j] … B[n-1]
     i + j = half
valid ⇔ A[i-1] ≤ B[j]  and  B[j-1] ≤ A[i]
```

Also include "why at most one violation" mini-proof inline (one or two lines) as I derived.

Length control: This is a lot. I'll be disciplined: crisp prose, tables, and code. Perhaps ~2000-2500 words equivalent. It's a "deep, structured lesson" so length is justified. Use headings with numbers for navigation.

One more check on the requirement: "Be precise about indices vs values, duplicates, and edge cases." — I have index-vs-value callout (i is a count; nums1[i-1] last taken vs nums1[i] first untaken), duplicates handled via ≤ plus test, edge cases: empty arrays, odd/even totals, single elements.

"When citing any complexity claim or theoretical lower bound that isn't the main solution's own complexity (e.g., an information-theoretic or comparison-model bound mentioned in a follow-up), justify it briefly (1 sentence)" — I'll include exactly one such claim (the Ω(log min) comparison-model bound) with a 1-sentence justification. Also if I say merging is Ω(m+n) because it must read all input — that's near-trivial but I can phrase carefully: "any correct algorithm in this model must in the worst case look at every element when it must output the full merge — not our case" hmm. Actually for median specifically, must every element be examined? In the unsorted general case, median needs Ω(n) (known: median of n arbitrary numbers requires n-1... actually finding median requires at least n - ... comparisons? The lower bound for median selection is ~2n comparisons? For finding the median of n unsorted elements, at least (3/2)n... it's known that select needs ≥ 1.5n - O(1)? The exact lower bound for median is 2n - o(n)? I recall minimum comparisons to find median is at least (2+ε)n... To be safe, avoid citing precise selection lower bounds. I can just say merge approach is O(m+n) since it touches each element once — that's an upper bound analysis of the algorithm, no external claim. For the lower bound, I'll only cite the Ω(log min(m,n)) comparison-model bound with the adversary/counting justification, flagged as "in the comparison model". Fine.

Also justify "why half = (total+1)//2 picks left-heavy": one sentence: floor division on an odd total gives the larger share to the left, so for odd totals the median (the (total+1)/2-th smallest... wait. total odd = 2k+1, left = k+1, right = k; median is the (k+1)-th smallest = max of left ✓.

Now, also "0 <= m, 0 <= n, 1 <= m+n" — decode: at least one non-empty; must handle empty gracefully; sizes ≤ 1000 → O(m+n) ≈ 2000 ops, trivially fast — hence the requirement is about demonstrating the technique, not absolute speed; interviews may follow up with "now sizes are 10^7" framing.

Value range ±10^6: sum of two boundary values ≤ 2×10^6 → no overflow even in 32-bit; averaging is the only precision concern → use float/double. Also sentinel choice safe vs. actual values.

Alright — also the "kth element by discarding halves" aside. Let me write it correctly: to find kth smallest of two sorted arrays: compare A[k/2 - 1] vs B[k/2 - 1]; if A[k/2-1] ≤ B[k/2-1], then A[0..k/2-1] can't contain the kth... careful: those k/2 elements are all ≤ A[k/2-1] ≤ B[k/2-1]; at most k/2 - 1 elements... hmm, the standard argument: elements A[0..k/2-1] are each ≤ A[k/2-1]; even if all of B[0..k/2-2] (that's k/2 - 1 elements) were smaller than them... each A[0..k/2-1] element has at most (k/2 - 1) + (k/2 - 1)? Let me redo: if A[k/2 - 1] ≤ B[k/2 - 1], then each of A[0..k/2-1] is ≤ A[k/2-1] ≤ B[k/2-1], and B[k/2-1] has exactly k/2 elements of B ≤ it including itself... The standard statement: A[0..k/2-1] ∪ {stuff} — the number of elements guaranteed to be ≤ A[k/2-1] is at most (k/2) from A plus (k/2 - 1)?? Hmm: elements ≤ A[k/2-1]: all of A[0..k/2-1] (k/2 elements, incl. itself) plus B[0..k/2-1]?? No: B[j] ≤ A[k/2-1] only for j with B[j] ≤ A[k/2-1]; we know B[k/2-1] ≥ A[k/2-1], so among B, elements ≤ A[k/2-1] can only be B[0..k/2-2]? Not exactly — B sorted ascending; B[k/2-1] ≥ A[k/2-1] means elements after are bigger; elements before could be ≤ or not... B[0..k/2-2] ≤ B[k/2-1], but are they ≤ A[k/2-1]? Not necessarily. Hmm wait, the discard argument: if A[k/2-1] ≤ B[k/2-1], then A[k/2-1] can be at most the (k/2 + k/2 - 1 + 1)-th? Elements strictly... A[k/2-1] has at least k/2 elements ≤ it in A (A[0..k/2-1]) and at least... hmm, in B, how many elements are < A[k/2-1]? Unknown individually, but B[k/2-1] ≥ A[k/2-1] tells us B[k/2-1..] ≥ A[k/2-1], so at most k/2 - 1 elements of B are < A[k/2-1]. So A[k/2-1] is at most the (k/2 + k/2 - 1 + 1) = k-th? At most: the number of elements ≤ A[k/2-1] is ≤ k/2 (from A, exactly k/2) + (k/2 - 1)? No — elements of B that are ≤ A[k/2-1]: since B[k/2-1] ≥ A[k/2-1], only B[0..k/2-2] could qualify → at most k/2 - 1. So total elements ≤ A[k/2-1] ≤ k/2 + k/2 - 1 = k - 1 < k. Hence A[k/2-1] is at most the (k-1)-th smallest → strictly smaller than the kth → A[0..k/2-1] (all ≤ A[k/2-1]... wait we want to discard them since they're all < kth? They're all ≤ A[k/2-1] which is < kth... hmm, ≤ means they could equal? If A[k/2-1] is at most the (k-1)th smallest, then A[k/2-1] < (kth) or ≤ (k-1)th ≤ kth... with duplicates, A[k/2-1] ≤ (k-1)th smallest value ≤ kth smallest value. Discarding A[0..k/2-1] is safe because none of them can be the kth smallest... if A[k/2-1] equals the kth value in a duplicates scenario, then A[0..k/2-1] are all ≤ kth value; could one of them BE the kth smallest (as a value it's fine — we discard elements, and since there are ≥ k elements ≤ ... ). The standard resolution: discard the first k/2 elements of A and reduce k by k/2, searching for the (k - k/2)-th smallest in the remainders. Correctness with duplicates holds under the ≤ convention with careful "number of elements strictly less" accounting. I'll just describe it at intuition level in one or two sentences and not derive — it's an aside. Fine: "compare the ⌊k/2⌋-th elements of both arrays; whichever is smaller, its first ⌊k/2⌋ elements cannot contain the kth smallest, so drop them and repeat on the remainders with k reduced — O(log(m+n)) rounds." Good enough with pointer to it being fiddlier around duplicates.

Now, "worked trace" for brute force — include as table above. Also compute its complexity: O(m+n) time, O(m+n) space if storing; O(1) if counting.

Let me also double check half invariant claim "j ∈ [0, n] guaranteed when m ≤ n": shown: half ≤ n since m ≤ n ⇒ m+n+1 ≤ 2n+1 ⇒ (m+n+1)//2 ≤ n (since (2n+1)//2 = n) ✓; and for i ≤ m: half ≥ m ≥ i? half = (m+n+1)//2 ≥ (2m+1)//2 = m ✓. So j = half - i ∈ [m - m, half] ⊂... j ≥ half - m ≥ 0 ✓ and j ≤ half ≤ n ✓. 

Also mention that because j depends only on i, one variable search.

Now write the Python code — also maybe a tiny oracle function for testing (merge-based) to support the test section. Could include a compact `median_by_merge` used for randomized cross-checking. That's a nice touch, small code block in the test section.

Also decide: include both "counting variant" snippet? Maybe just describe in prose to save space.

Section headings plan:

# Median of Two Sorted Arrays — Complete Lesson
(Short intro line: LC 4, Hard, the log requirement is the whole game.)

## 1. Problem restatement (what's really being asked)
- bullets: definition odd/even, float, "as if merged", either array may be empty, not both.

## 2. Decoding the constraints
Table: constraint | what it tells you. Rows: 0 ≤ m,n ≤ 1000 (small; linear passes — requirement is about technique; imagine 10^7 follow-up), 1 ≤ m+n (at least one element; no double-empty handling needed but mention), ±10^6 (no overflow in a+b ≤ 2e6; sentinel values safe; precision → double).

## 3. Brute force: merge and index (with trace)
- code or pseudocode (short python), trace table for example 2 (and 1-line for example 1), complexity note, why it doesn't meet requirement. Also note O(1)-space counting variant.

## 4. The core insight (the cut)
- median ⇔ split into halves; per-array cut diagram; i + j = half; two cross inequalities; monotonicity; at-most-one-violation argument; therefore binary search on i over shorter array; half = (m+n+1)//2 left-heavy convention; j range proof one-liner.

## 5. Optimal algorithm + code
- step list; sentinel table; Python implementation; why shorter-array swap.

## 6. Traces on the official examples
- two tables as computed. Include final answer lines.

## 7. Complexity analysis (table) 
- table incl. alternative approaches; 1-sentence lower-bound note.

## 8. Common mistakes (table)

## 9. Language gotchas: Java & C++ (short)
- bullets/rows.

## 10. Test plan (say these out loud)
- table of tests incl. official + edges; oracle snippet for randomized check; duplicates note.

## 11. Full interview talk track
- numbered script.

## 12. Transferable patterns & related problems
- pattern summary + table.

## 13. Say it in 60 seconds
- spoken-style block.

Wait — requirements list "transferable patterns / related problems" before the final section; ordering within my lesson is flexible. I'll put patterns after common mistakes maybe, then talk track, then tests, then 60-seconds last. Requirement: "End with a final 'Say it in 60 seconds' section" — must be last. Others order flexible. Logical flow: restatement → constraints → brute force → insight → optimal + traces → complexity → mistakes → gotchas → tests → patterns → full talk track → 60 seconds. Good.

Also within insight or optimal, include how to narrate — the full talk track covers it at the end; fine.

Double-check Python code compiles mentally:

```python
from typing import List

def findMedianSortedArrays(nums1: List[int], nums2: List[int]) -> float:
    # 1) Always binary-search the shorter array.
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1          # O(1): just swaps references
    m, n = len(nums1), len(nums2)
    total = m + n
    half = (total + 1) // 2                   # size of the LEFT partition

    lo, hi = 0, m
    while lo <= hi:
        i = (lo + hi) // 2                    # how many nums1 elements go left
        j = half - i                          # how many nums2 elements go left

        l1 = nums1[i - 1] if i > 0 else float("-inf")   # last taken from nums1
        r1 = nums1[i]     if i < m else float("inf")    # first NOT taken
        l2 = nums2[j - 1] if j > 0 else float("-inf")
        r2 = nums2[j]     if j < n else float("inf")

        if l1 <= r2 and l2 <= r1:             # valid partition found
            if total % 2 == 1:
                return float(max(l1, l2))     # median = max of left half
            return (max(l1, l2) + min(r1, r2)) / 2
        elif l1 > r2:
            hi = i - 1                        # took too many from nums1
        else:
            lo = i + 1                        # took too few from nums1

    raise ValueError("inputs must be sorted")  # unreachable on valid input
```

Looks right.

Oracle:

```python
def median_by_merge(a: List[int], b: List[int]) -> float:
    merged = sorted(a + b)          # fine for a test oracle
    k = len(merged)
    if k % 2:
        return float(merged[k // 2])
    return (merged[k // 2 - 1] + merged[k // 2]) / 2
```

Random cross-check snippet:

```python
import random
for _ in range(10_000):
    a = sorted(random.randint(-20, 20) for _ in range(random.randint(0, 12)))
    b = sorted(random.randint(-20, 20) for _ in range(random.randint(0, 12)))
    if (a or b):
        assert findMedianSortedArrays(a, b) == median_by_merge(a, b)
```

Careful: both empty invalid per constraints → guard `if a or b`. Also floats equality — both compute via same arithmetic? Partition returns e.g. (2+3)/2 = 2.5 exact; oracle same arithmetic (x+y)/2 → identical floats when values integers: (max+min)/2 vs (merged[k//2-1]+merged[k//2])/2 — same integers → same float. Odd: float(max(l1,l2)) vs float(merged[...]) — same. Equality fine.

Also note about `i - 1` in languages with unsigned index — C++ gotcha.

For Java snippet (short, in gotchas): show `(maxLeft + minRight) / 2.0`.

Now — the monotonicity statement needs precision: define f(i) = "cut at i valid". Show: if l1 > r2 then valid i's are < i... i.e., predicate "too big" is monotone: once i too big, all larger i too big. Proof: increasing i increases l1 (or keeps) and decreases... l1 non-decreasing in i (array sorted: nums1[i-1] grows), r2 = nums2[half - i], as i grows j shrinks so r2 non-increasing... r2 = nums2[j] with j decreasing → nums2[j] non-increasing? nums2 sorted ascending: smaller j → smaller or equal nums2[j]. So l1 ↑, r2 ↓ ⇒ once l1 > r2, stays. Similarly other side. Good, one-liner.

Also the "at most one violation" gives clean else-branch logic. I'll include compactly.

One more consideration — the interview-lesson tone: second person coaching, "say this out loud" cues. Include a short "what the interviewer is really testing" line in constraints or intro: binary search on non-obvious search space, careful index hygiene.

Word budget: aim thorough. Let's write.

Also small note: median definition when total even uses average → could be x.5 or .0; return type double/float.

Edge: total odd median index = total//2 (0-based) = (total-1)/2; with left-heavy half = (total+1)//2, median = merged[half - 1]. Good to state: merged[half-1] for odd.

Let me make sure the brute-force section says it fails "should be O(log(m+n))" requirement — in real interviews you state it, then improve. That's the coaching angle.

Alright — also requirement "Prefer Python for code samples" ✓; "Do not wrap entire answer in single code fence" ✓; "Use Markdown with headings, tables (GFM), fenced code blocks" ✓.

I'll write the final response now. Keep tables tight, traces correct. Include the ASCII partition diagrams in fenced blocks (use plain text fences or `text`). 

For the odd-case median with sentinel: max(l1, l2) with l1 = -inf works because when i=0 the median must come from B's side... but careful: if i = 0 and total odd, median = l2 = nums2[half-1] — correct because left half is entirely from nums2 ✓.

One more subtlety worth a "common mistake" or note: after finding valid cut, for even totals you need BOTH max(left) and min(right); forgetting sentinels in min(r1, r2) (e.g., i = m → r1 = +inf) — covered.

Also mention iterative vs recursive: iterative avoids recursion depth concerns; trivial here.

Now the C++ unsigned gotcha detail: `int l1 = i > 0 ? nums1[i - 1] : INT_MIN;` — if i is `int`, fine; if `i` is `size_t` or `vector<int>::size_type`, `i - 1` when i==0 wraps → guard with the ternary BEFORE indexing (which we do) — the gotcha is writing `nums1[i-1]` unguarded inside a size_t context. Phrase accordingly.

Java gotcha: also `(lo + hi) >>> 1` habit for mid (overflow-safe) — mention; at m ≤ 1000 irrelevant but free habit. And integer division on average.

Okay. Also the lower bound sentence placement: in complexity section: "Optimality note (comparison model): Ω(log min(m,n)) probes are necessary in the worst case — there are min(m,n)+1 possible cut positions and an adversary can construct inputs realizing any of them as the unique answer, so a comparison tree needs log₂ of that many binary outcomes." One sentence-ish. Good.

Let me also sanity check Example 1 brute force trace quickly (I'll include as second row or brief mention): merged = [1,2,3], median 2.0 ✓.

Ready to write. Structure with `---` separators maybe. Keep it clean. I'll number sections. Given depth requested, ~ this will be fairly long; that's appropriate.# Median of Two Sorted Arrays — Complete Interview Lesson

> **LeetCode 4 · Hard · The O(log) requirement is the entire interview.** Getting a correct linear answer is table stakes; the interviewer is testing whether you can *invent a binary search over a search space that isn't an array index*.

---

## 1. Problem restatement (say it back in your own words)

We're given two **independently sorted** arrays. We must return the median of the array we *would* get if we merged them in sorted order — **without actually merging** (that's what the O(log(m+n)) requirement forbids).

Precision points to state out loud:

- **Odd total** `N = m + n`: median is the single middle element, `merged[N/2]` (0-indexed).
- **Even total**: median is the **average** of the two middle elements, `(merged[N/2 - 1] + merged[N/2]) / 2` — so the answer is generally a **float**, even when both arrays hold integers.
- Either array may be **empty** (`0 ≤ m`, `0 ≤ n`), but not both (`1 ≤ m + n`).
- Arrays are sorted **ascending**; duplicates are allowed.

---

## 2. Decoding the constraints

| Constraint | What it's telling you |
|---|---|
| `0 ≤ m, n ≤ 1000` | Small. An O(m+n) merge *passes on LeetCode* — so the requirement is about **technique, not speed**. Say: "if these were 10⁷-element arrays, linear merge would be the bottleneck, hence log." |
| `1 ≤ m + n ≤ 2000` | At least one element exists — the median always exists. "Both empty" is not a valid input, but **one empty side is**, and it's the classic gotcha test. |
| `\|nums[i]\| ≤ 10⁶` | Two boundary values sum to at most 2×10⁶ — **no overflow** in 32-bit, and sentinel values like ±10⁹ can't collide with real data. Precision only matters at the **average** step → use float/double. |
| "O(log (m+n)) required" | A hint, not a threat: there's a way to decide the median by inspecting only **O(log) elements**. Linear solutions should be stated, then improved. |

---

## 3. Brute force: merge and index (state it, then beat it)

Merge with two pointers, then index the middle. Worked trace on **Example 2**: `nums1 = [1,2]`, `nums2 = [3,4]`:

| Step | nums1 ptr | nums2 ptr | Compare | Take | merged |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 1 vs 3 | 1 | `[1]` |
| 2 | 1 | 0 | 2 vs 3 | 2 | `[1,2]` |
| 3 | exhausted (i=2) | 0 | — | 3 | `[1,2,3]` |
| 4 | — | 1 | — | 4 | `[1,2,3,4]` |

Total = 4 (even) → median = `(merged[1] + merged[2]) / 2 = (2 + 3) / 2 = 2.5` ✓. (Example 1 merges to `[1,2,3]` → median `2.0`.)

Two refinements worth mentioning before you move on:

- **O(1)-space variant:** don't store the merge; two-pointer *count* until you reach the middle index/indices, keeping only the last one or two values seen. Still **O(m+n) time** — it touches (potentially) every element.
- This is correct and simple; **say its complexity, admit it misses the requirement, and pivot**. That pivot is the interview.

---

## 4. The core insight: the median is a *cut*, not an element

Stop thinking about values; think about **where a knife falls**. The median splits the merged sequence into a left half and a right half:

```
merged:   1   2   3            total = 3, half = 2
        └─ left ─┘┘ right
```

Here's the leap: **any cut of the merged array can be described by two smaller cuts** — take `i` elements from the front of `nums1` and `j` from the front of `nums2`, with `i + j = half`:

```
             LEFT part              RIGHT part
nums1:   A[0] … A[i-1]   |   A[i] … A[m-1]
nums2:   B[0] … B[j-1]   |   B[j] … B[n-1]
               i + j = half  (half = (m+n+1) // 2)
```

If we pick `i`, then `j = half - i` is **forced** — one free variable. A cut `(i, j)` reproduces the true merged-left-half **if and only if** every left element ≤ every right element. Since each array is internally sorted, only the **cross pairs** can violate that:

```
valid ⇔  A[i-1] ≤ B[j]   and   B[j-1] ≤ A[i]
         (last taken vs. first-not-taken, across arrays)
```

Only **four values** ever need to be inspected: `A[i-1], A[i], B[j-1], B[j]`. And the predicate is **monotone in `i`**: as `i` grows, `A[i-1]` only increases while `B[j]` only decreases — so "nums1 contributed too much" stays true. Monotone ⇒ **binary search on `i`**.

Three facts that make it airtight (mention these; they're what "strong hire" sounds like):

1. **At most one cross-condition can fail:** if `A[i-1] > B[j]` and `B[j-1] > A[i]` both held, then chaining in-array order gives `A[i-1] > B[j] ≥ B[j-1] > A[i] ≥ A[i-1]` — a contradiction. So the search direction is always unambiguous.
2. **Why `half = (m+n+1) // 2` (left-heavy):** floor division gives the odd total's extra element to the **left**, so for odd totals the median is simply `max(left side)`. One convention, no case analysis.
3. **Why binary search the shorter array:** with `m ≤ n`, `half ≤ n` and `half ≥ m`, so `j = half - i` is always within `[0, n]` for every `i ∈ [0, m]` — no bounds crashes, and the runtime becomes `O(log min(m, n))`.

**Index vs. value precision (the #1 bug source):** `i` is a **count of elements taken**, not a pointer. `A[i-1]` is the *last taken* element; `A[i]` is the *first not-taken* element. Off-by-one here corrupts everything downstream.

---

## 5. Optimal algorithm

1. Swap so `nums1` is the shorter (O(1) reference swap).
2. `half = (m + n + 1) // 2`; binary search `i ∈ [0, m]`, with `j = half - i`.
3. Boundary values with **sentinels** (this is what makes empty sides fall out for free):

| Situation | Value to use |
|---|---|
| `i == 0` (nothing taken from nums1) | `A[i-1] → -∞` |
| `i == m` (all of nums1 taken) | `A[i] → +∞` |
| `j == 0` | `B[j-1] → -∞` |
| `j == n` | `B[j] → +∞` |

4. If `A[i-1] ≤ B[j]` and `B[j-1] ≤ A[i]` → valid cut:
   - odd total → median = `max(A[i-1], B[j-1])`
   - even total → median = `(max(A[i-1], B[j-1]) + min(A[i], B[j])) / 2`
5. Else if `A[i-1] > B[j]` → took too many from nums1 → `hi = i - 1`; else `lo = i + 1`.

```python
from typing import List

def findMedianSortedArrays(nums1: List[int], nums2: List[int]) -> float:
    # 1) Always binary-search the SHORTER array.
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1          # O(1): swaps references only
    m, n = len(nums1), len(nums2)
    total = m + n
    half = (total + 1) // 2                  # size of the LEFT partition

    lo, hi = 0, m
    while lo <= hi:
        i = (lo + hi) // 2                   # count of nums1 elements on the left
        j = half - i                         # count of nums2 elements on the left

        l1 = nums1[i - 1] if i > 0 else float("-inf")   # last taken from nums1
        r1 = nums1[i]     if i < m else float("inf")    # first NOT taken
        l2 = nums2[j - 1] if j > 0 else float("-inf")
        r2 = nums2[j]     if j < n else float("inf")

        if l1 <= r2 and l2 <= r1:            # valid partition
            if total % 2 == 1:
                return float(max(l1, l2))    # median = max of left half
            return (max(l1, l2) + min(r1, r2)) / 2
        elif l1 > r2:
            hi = i - 1                       # nums1 gave too much → shrink i
        else:
            lo = i + 1                       # nums1 gave too little → grow i

    raise ValueError("inputs must be sorted")  # unreachable for valid input
```

*(An alternative that also meets the bound: recursively find the **k-th smallest of two sorted arrays** by comparing each array's `⌊k/2⌋`-th element and discarding the half that cannot contain the answer — O(log(m+n)) rounds. It's correct but fiddlier around duplicates; the partition method above is the one interviewers expect.)*

---

## 6. Traces on the official examples

### Example 1: `nums1 = [1,3]`, `nums2 = [2]`

Swap (nums1 is longer) → search array **A = [2]** (`a=1`), other **B = [1,3]** (`b=2`). `total=3`, `half=2`.

| Iter | lo | hi | i | j | l1 | r1 | l2 | r2 | Decision |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 1 | 0 | 2 | −∞ | A[0]=2 | B[1]=3 | +∞ (j=b) | `l2=3 > r1=2` → i too small → `lo=1` |
| 2 | 1 | 1 | 1 | 1 | A[0]=2 | +∞ (i=a) | B[0]=1 | B[1]=3 | `2≤3 ✓` and `1≤+∞ ✓` → **valid cut** |

Odd total → median = `max(l1, l2) = max(2, 1) = 2.0` ✓ (left half = `{2, 1}`, right = `{3}`).

### Example 2: `nums1 = [1,2]`, `nums2 = [3,4]`

A = [1,2], B = [3,4]. `total=4`, `half=2`.

| Iter | lo | hi | i | j | l1 | r1 | l2 | r2 | Decision |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 2 | 1 | 1 | 1 | 2 | 3 | 4 | `l2=3 > r1=2` → `lo=2` |
| 2 | 2 | 2 | 2 | 0 | A[1]=2 | +∞ | −∞ | B[0]=3 | `2≤3 ✓`, `−∞≤+∞ ✓` → **valid cut** |

Even total → median = `(max(2, −∞) + min(+∞, 3)) / 2 = (2 + 3) / 2 = 2.5` ✓.

Notice how sentinels silently absorbed "nums1 took everything" in step 2 — that's the design working.

---

## 7. Complexity

| Approach | Time | Space | Meets requirement? |
|---|---|---|---|
| Full merge, then index | O(m+n) | O(m+n) | ✗ |
| Two-pointer count to middle | O(m+n) | O(1) | ✗ |
| k-th element by discarding halves | O(log(m+n)) | O(log) recursion (or O(1) iterative) | ✓ |
| **Partition binary search (this lesson)** | **O(log min(m, n))** | **O(1)** | ✓ (strictly better than asked) |

Time derivation: the search space is `m + 1` cut positions (`i ∈ [0, m]`), halved each iteration with O(1) work per iteration; swapping guarantees `m = min(m, n)`.

**Lower-bound note (comparison model):** Ω(log min(m, n)) probes are necessary in the worst case, because there are `min(m,n)+1` distinguishable cut positions — an adversary can arrange values so any chosen diagonal is the *unique* valid answer — and each comparison yields at most a constant factor of information, so distinguishing `min(m,n)+1` outcomes needs log₂ of that many binary decisions.

---

## 8. Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Binary searching the **longer** array | `j = half - i` escapes `[0, n]` → crash or wrong answer; degrades to O(log max) | Swap first so `nums1` is shorter; state *why* (keeps `j` in range) |
| Confusing **count `i`** with **index** | Reading `A[i]` as "last taken" | `A[i-1]` = last taken, `A[i]` = first not taken. Drill this sentence |
| Wrong `half` convention (`(m+n)//2` vs `(m+n+1)//2`) | Off-by-one that "almost works"; median lands on the wrong side | Pick **left-heavy** `(m+n+1)//2`: odd totals ⇒ median = max of left. Derive, don't memorize |
| Missing ±∞ **sentinels** at `i=0, i=m, j=0, j=n` | IndexError on empty sides or boundary cuts | Sentinel table above; empty-array test catches it |
| Strict `<` instead of `≤` in cross-checks | Fails with duplicates: `[1,1]`/`[1,1]` finds no valid cut | Validity is `≤`; duplicates make equality the *normal* case |
| Loop/update mismatch (`while lo < hi` with `hi = i - 1`) | Infinite loop or skipped answer | Inclusive bounds ⇒ `while lo <= hi` with `lo = i+1 / hi = i-1`. Never mix styles |
| Integer division for the average | Java/C++ `(a+b)/2` truncates → `2` not `2.5`; Python `//` same | `/ 2.0`, `static_cast<double>`, or Python `/` |
| Assuming both arrays non-empty | Crashes on `nums1 = []` | Constraints allow one empty side; the shorter-array swap handles `m = 0` with zero special-casing — point that out |

---

## 9. Implementation gotchas beyond Python

- **Java:** `(maxLeft + minRight) / 2` on `int`s is **integer division even when assigned to a `double`** — write `/ 2.0`. `Integer.MIN_VALUE / MAX_VALUE` sentinels are safe here (|values| ≤ 10⁶), but if values were unbounded they could collide with real data — prefer explicit boundary branches or `double` sentinels in that case. Habit: `mid = (lo + hi) >>> 1` for overflow-safe midpoints.
- **C++:** same `/ 2.0` (or `static_cast<double>`) requirement. Bigger trap: if `i` is an **unsigned** type (`size_t`, `vector::size_type`), the unguarded expression `nums1[i - 1]` with `i == 0` wraps to a huge index → UB. Guard with the ternary *before* indexing. Habit: `mid = lo + (hi - lo) / 2`.
- **Python:** `/` vs `//` (already covered); also cast the odd-case result with `float(...)` so the signature honesty holds even when both inputs are ints.

---

## 10. Test plan — propose these out loud *before* coding

| # | nums1 | nums2 | Expected | Why you say it out loud |
|---|---|---|---|---|
| 1 | `[1,3]` | `[2]` | `2.0` | Official; odd total |
| 2 | `[1,2]` | `[3,4]` | `2.5` | Official; even-total averaging |
| 3 | `[]` | `[2,3]` | `2.5` | **One array empty**, even total |
| 4 | `[]` | `[1]` | `1.0` | One array empty, single element, odd total |
| 5 | `[1,1]` | `[1,1]` | `1.0` | **Duplicates everywhere** — kills `<` bugs |
| 6 | `[-5,-3,0]` | `[-1]` | `-2.0` | Negatives; cut falls *between* the arrays |
| 7 | `[1,2]` | `[3,4,5,6]` | `3.5` | Disjoint ranges — one array fully left of the other |

Trace #6 quickly as a demo: after swap, A=[−1], B=[−5,−3,0]; `half=2`; first probe `i=0, j=2` gives `l1=−∞ ≤ r2=0 ✓` and `l2=−3 ≤ r1=−1 ✓` → valid immediately → `(−3 + −1)/2 = −2.0` ✓.

**Oracle habit (say it, even if you don't run it):** "I'd cross-check against the linear merge on randomized small inputs, including empty sides and heavy duplicates."

```python
def median_by_merge(a, b):            # test oracle only
    merged = sorted(a + b)
    k = len(merged)
    return float(merged[k // 2]) if k % 2 else (merged[k//2 - 1] + merged[k//2]) / 2
```

---

## 11. Transferable patterns & related problems

The meta-skill: **when two sorted structures must answer a rank question in O(log), don't search values — search a *partition*, and validate it with only local (boundary) information.** Monotone validity ⇒ binary search.

| Problem | Shared pattern |
|---|---|
| **K-th smallest of two sorted arrays** (classic variant) | Same cut idea; median = the `k = (m+n+1)/2` (and `+1`) special case |
| LC 295 – Find Median from Data Stream | Same goal, streaming setting → two-heaps (know why heaps, not binary search, fit there) |
| LC 378 – Kth Smallest in a Sorted Matrix | Rank query over implicit sorted structure |
| LC 719 – K-th Smallest Pair Distance | Binary search **on the answer** + greedy counting |
| LC 1011 / LC 410 – Ship packages / Split Array Largest Sum | Binary search on a monotone predicate over answers |
| LC 668 – Kth Smallest Number in Multiplication Table | Rank counting instead of materializing the structure |

---

## 12. Full interview talk track

1. **Clarify:** "Median *as if merged*: odd total → middle element; even → average of two middle, returned as a double. Either array may be empty, not both. Values can duplicate."
2. **Baseline, honestly:** "Merge and index is O(m+n) time — O(1) space if I only count to the middle. Correct, but it can't be logarithmic because it may inspect every element. The log requirement tells me you want the partition technique."
3. **Insight:** "The median is fully determined by a **cut** that splits the merged data into equal halves. That merged cut decomposes into a cut in each array: `i` from the first, `j` from the second, `i + j = half`. The cut is valid iff each array's last-taken element ≤ the other's first-not-taken element — just two cross comparisons of four boundary values."
4. **Search space:** "Validity is monotone in `i` — growing `i` only raises nums1's left max and lowers nums2's right min — so I binary search `i` over `[0, m]`, on the **shorter** array, which also guarantees `j` stays in bounds. Empty sides become ±∞ sentinels. `half = (m+n+1)/2` keeps odd totals' median on the left, so odd → max of left; even → average of max-left and min-right."
5. **Complexity:** "O(log min(m, n)) time, O(1) space."
6. **Tests:** read the table in §10 out loud, flag duplicates and empty sides explicitly.
7. **Code, then dry-run Example 2** in the trace table above, narrating l1/r1/l2/r2 at each step.

---

## 13. Say it in 60 seconds

> "Merging is out — that's linear. The key realization: the median is determined by a **cut** splitting the merged data into equal halves, and any merged cut is just 'take i elements from the front of array one, j from array two,' with i + j equal to half the total. A cut is valid when each array's last-taken element is ≤ the other array's first-not-taken element — two comparisons of four boundary numbers, nothing else. Since the arrays are sorted, that validity condition is monotone in i, so I binary search i — over the **shorter** array, which also keeps j in bounds. Where a side runs out I use minus/plus infinity sentinels, which makes empty arrays a non-issue. Half is `(m+n+1)/2` so odd totals put the median on the left: odd answer is the max of the two left boundaries; even answer averages that with the min of the two right boundaries. That's O(log of the shorter length), constant space. Before coding I'd call out tests: one array empty, all-duplicates, disjoint ranges, and the two official examples — and I'd sanity-check against a linear-merge oracle."
