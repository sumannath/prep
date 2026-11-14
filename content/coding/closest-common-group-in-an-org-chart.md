### Problem

An org is a tree of groups; employees sit in groups. Given a set of employees, return the closest group that contains all of them.

#### In plain words

Picture a company chart: the company contains departments, departments contain teams, and teams contain people. A group "contains" an employee if the employee sits in it **or in any group below it**. Given some employees, find the **lowest** (most specific) group that contains all of them.

```text
company
 └─ eng                 members: dana
     ├─ backend         members: alice, bob
     └─ frontend        members: carol

{alice, bob}   → backend
{alice, carol} → eng
{alice, dana}  → eng
{alice}        → backend
```

#### Words used on this page

| Term | Meaning |
|---|---|
| Tree | Each group has exactly one parent (except the root). |
| Ancestor | A group above another group, at any distance. |
| LCA | Lowest common ancestor: the deepest node that's an ancestor of all the given nodes. |
| Post-order DFS | Visit all children before the node itself. |
| DAG | Directed acyclic graph: a node may have several parents, but there are no cycles. |
| BFS | Breadth-first search: visit nodes in order of distance. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

For a tree, post-order DFS returns how many target employees sit in each subtree; the first group whose count equals k is the answer, because post-order finishes deeper groups before their ancestors (recording the *last* one gives the root). That’s O(n). Keep employees as members of groups so a single employee returns their group, not themself. Use an iterative post-order for very deep orgs. With multiple parents (a DAG), subtree counting double counts, so BFS upward from each employee to get the distance to every ancestor group, intersect the ancestor sets, and pick the group that minimises the maximum distance, tie-broken by the sum. Confirm that definition of “closest” first. That’s O(k × (V + E)). For reorgs during queries, use copy-on-write snapshots in a read-heavy org, or a read-write lock otherwise.

**Cheat sheet**

1. **Ask:** strict tree? employee in several places? missing employee? empty list? what's "closest" in a DAG? edits during queries?
2. **Tests first:** same team, across teams, member of a parent group, single employee, missing → None, empty → None.
3. **Build:** post-order count of targets per group; the **first** group with count == k.
4. **Cost:** O(groups + members) time, O(height) stack (or iterative).
5. **Follow-ups:** DAG → BFS up per employee, intersect, min (max dist, sum dist); reorgs → copy-on-write.

### Background you need

#### 1. Trees as nested objects

A `dataclass` gives a tiny class with a constructor for free. A group has a name, the employees sitting directly in it, and child groups.

```python
from dataclasses import dataclass, field


@dataclass
class Group:
    name: str
    members: list[str] = field(default_factory=list)      # employees directly in this group
    children: list["Group"] = field(default_factory=list)


team = Group("backend", members=["alice", "bob"])
print(team.name, team.members, team.children)
```

```text
backend ['alice', 'bob'] []
```

#### 2. Post-order: children first, then the node

A group's count depends on its children's counts, which you only know once the children are done. Visiting the children before the node is called **post-order**.

```python
def sizes(g):
    total = len(g.members) + sum(sizes(c) for c in g.children)   # children first
    print(g.name, total)
    return total

org = Group("eng", ["dana"], [Group("backend", ["alice", "bob"]), Group("frontend", ["carol"])])
sizes(org)
```

```text
backend 2
frontend 1
eng 4
```

Deeper groups always finish **before** their ancestors. That's the property we'll use.

#### 3. Lowest common ancestor (LCA)

The classic LCA question asks about two nodes in a binary tree. Ours has any number of employees and any number of children per group. The same idea generalises: count how many targets are under each group, and the **deepest** group whose count equals the number of targets is the answer.

#### 4. Recursion depth in Python

Each recursive call uses a stack frame, and Python stops at about 1,000 nested calls with a `RecursionError`. A very deep org (a long chain of groups) needs an **iterative** version with an explicit stack.

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Strict tree: each group one parent, each employee in one group? | Tree vs graph. | Yes → post-order count. No → DAG version (see Follow-ups). |
| Can an employee sit directly in a parent group, not only in leaf teams? | Members at any level. | Yes → count `members` of every group, not just leaves. |
| What if an employee isn't in the org? | Error handling. | Return `None` (usual) or raise. |
| What if the list is empty? | Edge case. | Return `None`. |
| With one employee, is the answer their own group? | Employees aren't groups. | Yes → store employees as members, never return an employee. |
| Can the org change while people query it? | Concurrency. | Yes → snapshots or a read-write lock (see Follow-ups). |

**If they say "your call", state your defaults out loud:**

> "A strict tree, employees can sit in any group, each employee appears once, a missing employee or an empty list returns None, and one employee returns their own group."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass."

#### Work an example by hand

Post-order counts for targets `{alice, carol}`:

```text
backend   members ∩ targets = {alice} → 1
frontend  members ∩ targets = {carol} → 1
eng       own 0 + 1 + 1 = 2  ← first group to reach 2 → answer
company   0 + 2 = 2           (also 2, but later, so ignored)
```

#### The tests, one per requirement

Code in `org_chart.py`, tests in `test_org_chart.py`.

```python
# file: test_org_chart.py
import pytest

from org_chart import Group, closest_common_group


@pytest.fixture
def org():
    return Group("company", children=[
        Group("eng", members=["dana"], children=[
            Group("backend", members=["alice", "bob"]),
            Group("frontend", members=["carol"]),
        ]),
        Group("sales", members=["erin"]),
    ])


def name(group):
    return group.name if group else None


def test_two_people_in_the_same_team(org):
    assert name(closest_common_group(org, ["alice", "bob"])) == "backend"


def test_people_in_sibling_teams(org):
    assert name(closest_common_group(org, ["alice", "carol"])) == "eng"


def test_someone_sitting_in_a_parent_group(org):
    assert name(closest_common_group(org, ["alice", "dana"])) == "eng"


def test_people_in_different_departments(org):
    assert name(closest_common_group(org, ["bob", "erin"])) == "company"


def test_one_employee_returns_their_own_group(org):
    assert name(closest_common_group(org, ["carol"])) == "frontend"


def test_unknown_employee_returns_none(org):
    assert closest_common_group(org, ["alice", "zed"]) is None


def test_empty_list_returns_none(org):
    assert closest_common_group(org, []) is None
```

#### Red: run them against an empty stub

```python
# file: org_chart.py
from dataclasses import dataclass, field


@dataclass
class Group:
    name: str
    members: list[str] = field(default_factory=list)
    children: list["Group"] = field(default_factory=list)


def closest_common_group(root, employees):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_org_chart.py
```

```text
FFFFFFF                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_org_chart.py::test_two_people_in_the_same_team - NotImplementedError
FAILED test_org_chart.py::test_people_in_sibling_teams - NotImplementedError
FAILED test_org_chart.py::test_someone_sitting_in_a_parent_group - NotImplementedError
FAILED test_org_chart.py::test_people_in_different_departments - NotImplementedError
FAILED test_org_chart.py::test_one_employee_returns_their_own_group - NotImplementedError
FAILED test_org_chart.py::test_unknown_employee_returns_none - NotImplementedError
FAILED test_org_chart.py::test_empty_list_returns_none - NotImplementedError
7 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. For any group, how many of the targets sit somewhere below it?
2. Which traversal order lets you compute a group's count from its children's counts?
3. Several groups reach the full count. In that traversal order, which one reaches it first?

#### Brute force first

For each employee, find the path of groups from the root down to them. The answer is the last group the paths all share, their common prefix. That's O(k × n) for k employees in an org of n groups: correct, but it walks the tree once per employee.

#### The key insight

Do it in **one** pass. A post-order DFS returns, for each group, how many targets are in its subtree. The **first** group whose count reaches k is the deepest one, because post-order finishes deeper groups before their ancestors, and every ancestor of the answer also reaches k, later.

#### The plan (say this, then wait for a nod)

> **Say:** "This is lowest common ancestor for any number of people in an n-ary tree. One post-order DFS: each group returns how many targets are in its subtree, counting its own members plus its children. The first group to reach the full count is the answer, because deeper groups finish first. That's O(n) for the whole org. A missing employee means no group ever reaches the count, so I return None."

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: path from the root to each person (correct, O(k × n))

```python
# file: org_chart.py
from dataclasses import dataclass, field


@dataclass
class Group:
    name: str
    members: list[str] = field(default_factory=list)
    children: list["Group"] = field(default_factory=list)


def _path_to(group, employee):
    """Groups from `group` down to the one holding `employee`, or None."""
    if employee in group.members:
        return [group]
    for child in group.children:
        below = _path_to(child, employee)
        if below:
            return [group] + below
    return None


def closest_common_group(root, employees):
    if not employees:
        return None
    paths = [_path_to(root, e) for e in employees]
    if any(p is None for p in paths):
        return None
    answer = None
    for level in zip(*paths):                 # walk all paths in step
        if all(g is level[0] for g in level):
            answer = level[0]                 # still shared
        else:
            break
    return answer
```

```bash
pytest -q --tb=no -rf test_org_chart.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

All green. Now do it in one pass.

#### Stage 2: one post-order pass (with a subtle slip)

```python
# file: org_chart.py
from dataclasses import dataclass, field


@dataclass
class Group:
    name: str
    members: list[str] = field(default_factory=list)
    children: list["Group"] = field(default_factory=list)


def closest_common_group(root, employees):
    targets = set(employees)
    if not targets:
        return None
    answer = None

    def count(group):
        nonlocal answer
        c = len(targets.intersection(group.members))
        for child in group.children:
            c += count(child)                 # children first: post-order
        if c == len(targets):
            answer = group                    # records every group that reaches k
        return c

    count(root)
    return answer
```

```bash
pytest -q --tb=no -rf test_org_chart.py
```

```text
FFF.F..                                                                                      [100%]
===================================== short test summary info =====================================
FAILED test_org_chart.py::test_two_people_in_the_same_team - AssertionError: assert 'company' == ...
FAILED test_org_chart.py::test_people_in_sibling_teams - AssertionError: assert 'company' == 'eng'
FAILED test_org_chart.py::test_someone_sitting_in_a_parent_group - AssertionError: assert 'compan...
FAILED test_org_chart.py::test_one_employee_returns_their_own_group - AssertionError: assert 'com...
4 failed, 3 passed in 0.01s
```

Almost every test now returns "company". Every ancestor of the right answer also reaches the full count, and since the root finishes **last**, overwriting `answer` leaves the root. We want the **first** group to reach k.

#### Stage 3: keep the first group that reaches k

```python
# file: org_chart.py
from dataclasses import dataclass, field


@dataclass
class Group:
    name: str
    members: list[str] = field(default_factory=list)
    children: list["Group"] = field(default_factory=list)


def closest_common_group(root, employees):
    targets = set(employees)
    if not targets:
        return None
    answer = None

    def count(group):
        nonlocal answer
        c = len(targets.intersection(group.members))
        for child in group.children:
            c += count(child)
        if c == len(targets) and answer is None:   # first = deepest
            answer = group
        return c

    count(root)
    return answer
```

```bash
pytest -q --tb=no -rf test_org_chart.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

**Time:** O(groups + members). **Space:** O(height) for the recursion.

### Step 5 · Run everything and refactor

#### Trace targets `{alice, dana}`

| group finishes | own members ∩ targets | + children | count | answer |
|---|---|---|---|---|
| backend | {alice} → 1 | — | 1 | — |
| frontend | ∅ → 0 | — | 0 | — |
| eng | {dana} → 1 | 1 + 0 | 2 = k | **eng** |
| sales | 0 | — | 0 | eng |
| company | 0 | 2 + 0 | 2 | eng (already set) |

#### Refactor: survive a very deep org

Recursion fails on a long chain of groups. Test first:

```python
# file: test_org_chart.py (append)
def test_a_very_deep_org_does_not_overflow_the_stack():
    root = node = Group("g0")
    for i in range(1, 5000):
        child = Group(f"g{i}")
        node.children.append(child)
        node = child
    node.members.append("deep")
    root.members.append("top")
    assert closest_common_group(root, ["deep", "top"]).name == "g0"
    assert closest_common_group(root, ["deep"]).name == "g4999"
```

```bash
pytest -q --tb=no -rf test_org_chart.py
```

```text
.......F                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_org_chart.py::test_a_very_deep_org_does_not_overflow_the_stack - RecursionError: maxi...
1 failed, 7 passed in 0.01s
```

Replace the recursion with an explicit stack. Each group is pushed twice: once to "open" it (push its children), and once to "close" it after all children are done. That's an iterative post-order.

```python
# file: org_chart.py
from dataclasses import dataclass, field


@dataclass
class Group:
    name: str
    members: list[str] = field(default_factory=list)
    children: list["Group"] = field(default_factory=list)


def closest_common_group(root: Group, employees: list[str]) -> Group | None:
    """Deepest group containing every employee (members of it or any subgroup)."""
    targets = set(employees)
    if not targets:
        return None
    counts: dict[int, int] = {}                     # id(group) -> targets in its subtree
    stack: list[tuple[Group, bool]] = [(root, False)]
    while stack:
        group, children_done = stack.pop()
        if not children_done:
            stack.append((group, True))             # close it after its children
            for child in group.children:
                stack.append((child, False))
            continue
        c = len(targets.intersection(group.members))
        c += sum(counts.pop(id(child)) for child in group.children)
        if c == len(targets):
            return group                            # first group to reach k = deepest
        counts[id(group)] = c
    return None
```

```bash
pytest -q --tb=no -rf test_org_chart.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

As a bonus, it returns as soon as the answer closes, without visiting the rest of the org.

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "People and groups can belong to several parent groups"

**What changes:** it's now a **DAG**. There's no single path from the top to each person, so counting targets in subtrees double counts anyone reachable by two paths, and "deepest" isn't well defined.

**Go upwards instead.** From each employee, run a **BFS up** through all their parent groups. BFS reaches each ancestor by the fewest steps first, so you get a **distance** to every ancestor group. Intersect the ancestor sets of all employees: those are the groups containing everyone.

**Define "closest" with the interviewer.** A sensible default: the group whose **farthest** employee is nearest (minimise the max distance), tie-broken by the total distance, then by name. That favours a group near everyone over one close to one person and far from the rest.

The input is now a `parents` map: `name → list of parent group names`.

**Tests first:**

```python
# file: test_org_chart.py (append)
from org_chart import closest_common_group_dag

PARENTS = {
    "alice": ["backend", "platform"],
    "bob": ["platform"],
    "carol": ["frontend"],
    "backend": ["eng"],
    "platform": ["eng"],
    "frontend": ["eng"],
}


def test_dag_prefers_the_group_nearest_to_everyone():
    assert closest_common_group_dag(PARENTS, ["alice", "bob"]) == "platform"


def test_dag_falls_back_to_a_shared_ancestor():
    assert closest_common_group_dag(PARENTS, ["alice", "carol"]) == "eng"


def test_dag_never_returns_an_employee():
    assert closest_common_group_dag(PARENTS, ["alice"]) in {"backend", "platform"}
    assert closest_common_group_dag(PARENTS, ["alice"]) == "backend"   # tie → by name


def test_dag_with_no_common_group_returns_none():
    assert closest_common_group_dag({"x": ["a"], "y": ["b"]}, ["x", "y"]) is None
```

```python
# file: org_chart.py (append)
def closest_common_group_dag(parents, employees):
    raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_org_chart.py -k dag
```

```text
FFFF                                                                                         [100%]
===================================== short test summary info =====================================
FAILED test_org_chart.py::test_dag_prefers_the_group_nearest_to_everyone - NotImplementedError
FAILED test_org_chart.py::test_dag_falls_back_to_a_shared_ancestor - NotImplementedError
FAILED test_org_chart.py::test_dag_never_returns_an_employee - NotImplementedError
FAILED test_org_chart.py::test_dag_with_no_common_group_returns_none - NotImplementedError
4 failed, 8 deselected in 0.01s
```

```python
# file: org_chart.py (replace the closest_common_group_dag stub)
def closest_common_group_dag(parents: dict[str, list[str]], employees: list[str]) -> str | None:
    """Group containing everyone, nearest to the farthest of them (then total distance, name)."""
    from collections import deque

    def distances_up(start: str) -> dict[str, int]:
        dist, queue = {}, deque([(start, 0)])
        seen = {start}
        while queue:
            node, d = queue.popleft()
            for parent in parents.get(node, []):
                if parent not in seen:
                    seen.add(parent)
                    dist[parent] = d + 1          # groups only: the start itself is excluded
                    queue.append((parent, d + 1))
        return dist

    if not employees:
        return None
    maps = [distances_up(e) for e in employees]
    common = set(maps[0]).intersection(*maps[1:])
    if not common:
        return None
    return min(common, key=lambda g: (max(m[g] for m in maps), sum(m[g] for m in maps), g))
```

```bash
pytest -q --tb=no -rf test_org_chart.py
```

```text
............                                                                                 [100%]
12 passed in 0.01s
```

**Time:** O(k × (V + E)), since each upward BFS may touch everything above.

#### Follow-up 2: "Reorgs happen while people query this"

**First ask:** how often do reorgs happen compared with queries?

- **Copy-on-write snapshots (read-heavy, the usual case):** a reorg builds a new parent map (or tree) and swaps a single reference. Readers grab the current reference at the start of a query and always see a consistent org; they never block.
- **Read-write lock (frequent writes):** many readers or one writer at a time. Simpler on memory, but readers wait during reorgs.

The test you'd write first: run queries in threads while another thread swaps in reorganised orgs, and assert that every answer is valid for either the old org or the new one, never a mix.

### Mock dialogue

**Interviewer:** We have an org chart of groups, with employees inside groups. Given some employees, find the closest group that contains all of them.

**You:** Is it a strict hierarchy, each group with one parent and each employee in one group? And can people sit directly in a department, not just in teams?

**Interviewer:** Strict for now, and yes, people can sit at any level.

**You:** And if an employee isn’t in the org at all: return nothing, or raise an error?

**Interviewer:** Return nothing.

**You:** Before coding, the tests: two people in one team, people in sibling teams, someone sitting in a parent group, people in different departments, a single person returning their own team, a missing person, and an empty list.

**You:** This is lowest common ancestor for any number of nodes. I’ll do a post-order traversal returning how many target employees are under each group. The first group to reach the full count is the deepest one containing everyone, because post-order finishes deeper groups before their parents. One pass over the org.

> *Why this works:* Name the textbook concept (LCA), then say how your variant differs. It shows recognition without pretending the problem is identical.

**You:** All green. I'll also note that a 5,000-level org would blow Python's recursion limit, so I'd make the traversal iterative. I can show that with a test.

**Interviewer:** Now people can belong to several groups, and groups can have several parents.

**You:** Then it’s a graph, and counting from the top double counts people with two paths. I’ll go upwards: a breadth-first search from each employee gives every ancestor with its distance, then I intersect them. Several groups may contain everyone, so what does closest mean to you? I’d suggest the one whose farthest employee is nearest.

**Interviewer:** That works.

**You:** I'll write the tests for that definition first, including that it never returns an employee. Cost is the number of employees times the size of the graph, since each search may touch everything above.

**Interviewer:** Reorgs happen while people query this.

**You:** How often do reorgs happen compared with queries? If rarely, copy-on-write: a reorg builds a new parent map and swaps one reference, so readers always see a consistent snapshot and never block. If writes were frequent, a read-write lock.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Keeping the **last** group that reaches k | Returns the root almost every time. | `test_people_in_sibling_teams` and most others |
| Modelling employees as tree nodes | A single employee "contains" themself and is returned instead of their group. | `test_one_employee_returns_their_own_group`, `test_dag_never_returns_an_employee` |
| Only counting members of leaf teams | People sitting in a department are missed. | `test_someone_sitting_in_a_parent_group` |
| Crashing on a missing employee | The spec says return None. | `test_unknown_employee_returns_none` |
| Deep recursion | `RecursionError` on long chains. | `test_a_very_deep_org_does_not_overflow_the_stack` |
| Applying tree logic to a DAG | Double counting via multiple paths. | The `test_dag_*` tests |
| Not defining "closest" before coding the DAG case | You build the wrong thing; ask first. | n/a |
