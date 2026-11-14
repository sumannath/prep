### Problem

An org is a tree of groups; employees sit in groups. Given a set of employees, return the closest group that contains all of them.

### Interview refresher

For a tree, post-order DFS returns how many target employees sit in each subtree; the first group whose count equals k is the answer, because post-order finishes deeper groups before their ancestors. That’s O(n). With multiple parents (a DAG), subtree counting double counts, so BFS upward from each employee to get the distance to every ancestor, intersect the ancestor sets, and pick the group that minimises the maximum distance, tie-broken by the sum. Confirm that definition of “closest” first. That’s O(k × (V + E)). For reorgs during queries, use copy-on-write snapshots in a read-heavy org, or a read-write lock otherwise.

### Hints

1. Generalise LCA to k targets: post-order DFS returning how many targets are in each subtree.
2. The first node (in post-order) whose count equals k is the deepest common group.
3. For the follow-up, a node can have several parents. Tree recursion from the root no longer works; go upwards from each employee.

### Approach

Post-order DFS counting targets per subtree. The first node to reach the full count is the answer because post-order visits deeper nodes before their ancestors.

### Deep dive

#### What the interviewer is really testing

Whether you understand lowest common ancestor well enough to generalise it: first to many employees in an n-ary tree, then to a graph where the tree reasoning breaks.

#### Part 1: many employees in a tree

Classic LCA asks about two nodes; here it’s any number. A clean framing: for each group, how many of the target employees are somewhere below it? The answer is the *deepest* group whose count equals the number of targets.

#### Why post-order

A group’s count is its own contribution plus its children’s counts, which you can’t know until all children are done. Visiting children before the parent is exactly post-order DFS.

#### Why the first group to reach the full count is the answer

Post-order finishes deeper groups before their ancestors. Every ancestor of the answer also contains all the targets, so they’d reach the full count too, but later. Recording only the first gives the deepest.

```text
company → eng → backend → {alice, bob}
              → frontend → {carol}
targets {alice, bob}:
  backend finishes first with count 2 → answer
  eng, company also reach 2 later → ignored
```

#### Part 2: why the tree approach breaks with multiple parents

If a person or group can belong to several parents, the structure is a directed acyclic graph. There’s no single path from the top to each person, so “count targets in my subtree” double counts people reachable by several paths, and “deepest” stops being well defined.

#### Going upwards instead

Start from each employee and walk *up* through all their parents. Breadth-first search is the right walk because it reaches each ancestor by the fewest steps first, giving a distance to every ancestor. Do this per employee, then intersect the ancestor sets to get groups containing everyone.

#### Defining “closest”

With several candidates, which is closest? That’s a product decision, so ask. A sensible default: the group whose farthest employee is fewest steps away, tie-broken by total steps. That favours a group near everyone over one close to one person and far from the rest.

#### Part 3: concurrent edits

Senior loops often add “the org changes while people query it”. Two standard answers: a read-write lock (many readers or one writer), or copy-on-write snapshots, where a writer builds a new parent map and swaps one reference so readers never wait. Choose by read/write ratio; org charts are read far more than written, which favours snapshots.

### Reference solution

```python
from collections import deque
from dataclasses import dataclass, field


@dataclass
class Group:
    name: str
    children: list["Group"] = field(default_factory=list)


def closest_common_group(root: Group, employees: list[str]) -> Group | None:
    targets = set(employees)
    answer = None

    def count(node: Group) -> int:
        nonlocal answer
        c = 1 if node.name in targets else 0
        for child in node.children:
            c += count(child)
        if c == len(targets) and answer is None:
            answer = node
        return c

    count(root)
    return answer


alice, bob, carol = Group("alice"), Group("bob"), Group("carol")
eng = Group("eng", [Group("backend", [alice, bob]), Group("frontend", [carol])])
org = Group("company", [eng])
assert closest_common_group(org, ["alice", "bob"]).name == "backend"
assert closest_common_group(org, ["alice", "carol"]).name == "eng"
```

**Time:** O(nodes)  
**Space:** O(height)

### Questions to ask before coding

- Is it a strict tree, or can someone belong to several groups?
- Can an employee appear in more than one place?
- What should happen if an employee isn’t in the org?
- If several groups contain everyone, what does “closest” mean?
- Can the org change while it’s being queried?

### Interview walkthrough

**Interviewer:** We have an org chart of groups, with employees inside groups. Given some employees, find the closest group that contains all of them.

**You:** Is it a strict hierarchy, each group with one parent and each employee in one group?

**Interviewer:** For now, yes.

**You:** And if an employee isn’t in the org at all: return nothing, or raise an error?

**Interviewer:** Return nothing.

**You:** This is lowest common ancestor for any number of nodes. I’ll do a post-order traversal returning how many target employees are under each group. The first group to reach the full count is the deepest one containing everyone, because post-order finishes deeper groups before their parents. One pass over the org.

> *Why this works:* Name the textbook concept (LCA), then say how your variant differs. It shows recognition without pretending the problem is identical.

**You:** Tests: alice and bob give backend; alice and carol give eng.

**Interviewer:** Now people can belong to several groups, and groups can have several parents.

**You:** Then it’s a graph, and counting from the top double counts people with two paths. I’ll go upwards: a breadth-first search from each employee gives every ancestor with its distance, then I intersect them. Several groups may contain everyone, so what does closest mean to you? I’d suggest the one whose farthest employee is nearest.

**Interviewer:** That works.

**You:** Cost is the number of employees times the size of the graph, since each search may touch everything above.

**Interviewer:** Reorgs happen while people query this.

**You:** How often do reorgs happen compared with queries? If rarely, copy-on-write: a reorg builds a new parent map and swaps one reference, so readers always see a consistent snapshot and never block. If writes were frequent, a read-write lock.

### Scale-up follow-up

**Interviewer adds:** “Employees and groups can belong to more than one parent group.” Later: “the org is edited while people are querying it.”

Now it's a DAG. BFS upward from each employee to get distances to every ancestor, intersect the ancestor sets, and choose the common group with the smallest maximum distance (tie-break on total distance). For concurrency, readers take an immutable snapshot of the parent map and writers publish a new version (copy-on-write), or guard with a read-write lock — say which you'd choose and why.

```python
def closest_common_group_dag(parents: dict[str, list[str]], employees: list[str]):
    def distances_up(start: str) -> dict[str, int]:
        dist, q = {start: 0}, deque([start])
        while q:
            node = q.popleft()
            for p in parents.get(node, []):
                if p not in dist:
                    dist[p] = dist[node] + 1
                    q.append(p)
        return dist

    maps = [distances_up(e) for e in employees]
    common = set(maps[0]).intersection(*maps[1:])
    if not common:
        return None
    return min(common, key=lambda g: (max(m[g] for m in maps), sum(m[g] for m in maps)))


parents = {"alice": ["backend", "platform"], "bob": ["platform"],
           "backend": ["eng"], "platform": ["eng"]}
assert closest_common_group_dag(parents, ["alice", "bob"]) == "platform"
```

### Where candidates slip

- Using binary-tree LCA code on an n-ary tree.
- Not defining “closest” for the DAG case before coding; ask the interviewer.
- Employees missing from the tree: return None, don't crash.
