### Problem

Build a `Router` with `add_route(path, handler)` and `call(path)`, returning the matching handler or `None`.

Follow-ups: support `*` wildcards for a single segment and `:id` path parameters that are captured and returned.

#### In plain words

A web server receives requests like `GET /issues/42`. The router's job is to find which function ("handler") should deal with that path.

- **Exact routes:** `/issues` matches only `/issues`.
- **Parameters:** `/issues/:id` matches `/issues/42` and *captures* `id = "42"`.
- **Wildcards:** `/issues/*/comments` matches `/issues/42/comments`; `*` stands for exactly one segment and captures nothing.

`call(path)` returns `(handler, params)`, or `None` if nothing matches.

#### Words used on this page

| Term | Meaning |
|---|---|
| Segment | One piece of a path between slashes: `/issues/42` has segments `issues` and `42`. |
| Static segment | A literal piece such as `issues`. |
| Trie | A tree where each level is one step of a key. Here, one level per path segment. |
| DFS | Depth-first search: go as deep as possible down one branch before trying the next. |
| Backtracking | When a branch dead-ends, return and try the next option. |
| Precedence | The rule for which route wins when several match. |
| Middleware | Code that runs before the handler (auth, logging) and can stop the request. |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

Start with a dict for exact matches, then switch to a trie keyed by path segment (split on `/`, drop empties), each node holding children and a handler. Match with DFS: try the static child first, then `:param` children (capturing into a fresh copy of the params dict) and `*` children, returning the first full match. Backtracking is essential: `/a/b/c` must fall back to `/a/*/c` when the static `b` branch dead-ends. State the precedence aloud: static beats parameter beats wildcard, and store them separately on each node so insertion order can't change it. Cost is O(segments) in practice. For middleware, store it on nodes, collect it along the matched path, and compose a `(request, next)` chain.

**Cheat sheet**

1. **Ask:** `*` one segment or many? precedence? trailing slashes? no-match result? routes added at runtime?
2. **Tests first:** exact, unknown, slashes normalised, param captured, wildcard one segment, static beats param, backtracking, no param leak.
3. **Build:** segment trie; `_match(node, parts, i, params)` returns the first full match or `None`.
4. **Precedence:** static → `:param` → `*`; copy params per branch (`{**params, name: seg}`).
5. **Follow-ups:** middleware on nodes + `(request, next)` chain; runtime route changes → copy-on-write.

### Background you need

#### 1. Splitting a path into segments

`"/issues/42".split("/")` gives `['', 'issues', '42']`: the leading slash produces an empty piece. Drop empty pieces, and `/issues/`, `/issues` and `//issues` all become the same thing.

```python
def split(path):
    return [p for p in path.split("/") if p]

print(split("/issues/42"), split("//issues/"), split("/"))
```

```text
['issues', '42'] ['issues'] []
```

#### 2. A trie of path segments

A trie stores keys that share prefixes in shared nodes. Each node has a dict of children, keyed by segment, and optionally a handler. Routes `/issues`, `/issues/:id` and `/issues/:id/comments` look like this:

```text
(root)
 └─ issues            handler: list
     └─ :id           handler: get
         └─ comments  handler: comments
```

Matching walks down one level per segment of the request, so the cost depends on the path's length, not on how many routes exist.

#### 3. Recursion that can back out (backtracking)

A recursive function that returns `None` on a dead end lets the caller try the next option. That's all backtracking is:

```python
def find(options, target, chosen=()):
    if sum(chosen) == target:
        return chosen
    for i, x in enumerate(options):
        hit = find(options[i + 1:], target, chosen + (x,))   # try including x
        if hit:
            return hit                                        # first success wins
    return None                                               # dead end: caller tries the next

print(find([5, 3, 4], 7))
```

```text
(3, 4)
```

#### 4. Copying a dict vs changing it

`params[k] = v` changes the dict *everyone* holds. `{**params, k: v}` builds a new dict and leaves the original alone. When exploring branches, each branch needs its own copy, or captures from a failed branch leak into the winning one.

```python
base = {}
a = {**base, "id": "1"}   # new dict
base["x"] = "leaked"      # mutates the shared one
print(a, base)
```

```text
{'id': '1'} {'x': 'leaked'}
```

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Exact matching only, or patterns too? | Decides dict vs trie. | Exact only → a dict, O(1). Patterns → a segment trie. |
| Does `*` match exactly one segment, or any number? | Changes the matcher. | One → consume one segment. Many (`**`) → try consuming 1, 2, … segments with backtracking. |
| If two routes match, which wins? | `/issues/new` vs `/issues/:id`. | Static > param > wildcard (usual) → try them in that order. "Most recently added" → keep insertion order (and warn it's fragile). |
| Are trailing slashes, double slashes, case and query strings significant? | Normalisation. | Not significant → split and drop empty segments; strip `?…`. Significant → keep empty segments as keys. |
| On no match: `None`, or a 404 handler? | API shape. | `None` → callers decide. Default handler → return it instead. |
| Can routes be added while requests are served? | Thread safety. | No → plain structure. Yes → build a new trie and swap it in (copy-on-write), or use a lock. |

**If they say "your call", state your defaults out loud:**

> "I'll assume `*` is exactly one segment, static beats a parameter which beats a wildcard, slashes are normalised, query strings are stripped by the caller, no match returns None, and routes are registered at startup."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass."

#### Work the tricky examples by hand

```text
routes:  /a/b/x   and   /a/*/c
request: /a/b/c
try static 'b' → its node has child 'x', not 'c' → dead end
back up, try '*' for 'b' → child 'c' exists → match
```

```text
routes:  /a/:x/y  and   /a/*/z
request: /a/1/z
try ':x' (captures x=1) → no child 'z' → dead end
try '*' → child 'z' → match, and params must be {} (x=1 must not leak)
```

#### The tests, one per requirement

Code in `router.py`, tests in `test_router.py`.

```python
# file: test_router.py
from router import Router


def make_router():
    r = Router()
    r.add_route("/issues", "list")
    r.add_route("/issues/:id", "get")
    r.add_route("/issues/*/comments", "comments")
    return r


def test_exact_route_matches_with_no_params():
    assert make_router().call("/issues") == ("list", {})


def test_unknown_path_returns_none():
    assert make_router().call("/boards") is None


def test_trailing_and_double_slashes_are_normalised():
    assert make_router().call("//issues/") == ("list", {})


def test_param_is_captured():
    assert make_router().call("/issues/T-1") == ("get", {"id": "T-1"})


def test_wildcard_matches_exactly_one_segment():
    r = make_router()
    assert r.call("/issues/T-1/comments") == ("comments", {})
    assert r.call("/issues/a/b/comments") is None


def test_static_segment_beats_param():
    r = make_router()
    r.add_route("/issues/new", "new-form")
    assert r.call("/issues/new") == ("new-form", {})
    assert r.call("/issues/5") == ("get", {"id": "5"})


def test_backtracks_when_static_branch_dead_ends():
    r = Router()
    r.add_route("/a/b/x", "x")
    r.add_route("/a/*/c", "c")
    assert r.call("/a/b/c") == ("c", {})


def test_params_from_a_failed_branch_do_not_leak():
    r = Router()
    r.add_route("/a/:x/y", "y")
    r.add_route("/a/*/z", "z")
    assert r.call("/a/1/z") == ("z", {})
```

#### Red: run them against an empty stub

```python
# file: router.py
class Router:
    def add_route(self, path, handler):
        pass

    def call(self, path):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_router.py
```

```text
FFFFFFFF                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_router.py::test_exact_route_matches_with_no_params - NotImplementedError
FAILED test_router.py::test_unknown_path_returns_none - NotImplementedError
FAILED test_router.py::test_trailing_and_double_slashes_are_normalised - NotImplementedError
FAILED test_router.py::test_param_is_captured - NotImplementedError
FAILED test_router.py::test_wildcard_matches_exactly_one_segment - NotImplementedError
FAILED test_router.py::test_static_segment_beats_param - NotImplementedError
FAILED test_router.py::test_backtracks_when_static_branch_dead_ends - NotImplementedError
FAILED test_router.py::test_params_from_a_failed_branch_do_not_leak - NotImplementedError
8 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. Exact matching is a dict. Why can't a dict find `/issues/:id` from `/issues/42`?
2. Wildcards and parameters stand for whole *segments*. What tree has one level per segment?
3. A static branch may dead-end deeper down, where a wildcard branch would succeed. What does your matcher do then?

#### Brute force first

A dict from path to handler is perfect for exact routes, O(1) per lookup. But a pattern like `/issues/:id` isn't the same string as `/issues/42`, so hashing can't find it.

Another option is a list of patterns (often regexes), tried in order. It's simple, but every request checks every route, and the answer depends on insertion order, a source of subtle bugs.

#### The key insight

Use a **trie keyed by segment**. Matching walks one level per request segment; at each level, try the static child first, then parameter children, then the wildcard. Use **recursion** so that a dead end returns `None` and the caller tries the next option (backtracking). Give each branch its **own copy** of the captured params.

#### The plan (say this, then wait for a nod)

> **Say:** "I'll store routes in a trie keyed by path segment. To match, I recurse segment by segment: static child first, then parameters, then the wildcard, and return the first full match. If a branch dead-ends I back out and try the next option, copying the params dict per branch so failed captures don't leak. Cost is proportional to the number of segments in the usual case."

How this maps to the tests: the trie → param and wildcard tests; static first → `test_static_segment_beats_param`; recursion → `test_backtracks_when_static_branch_dead_ends`; copying params → `test_params_from_a_failed_branch_do_not_leak`.

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: a dict (exact routes only)

> **Say:** "Exact matches first, a dict. That banks a working answer before the patterns."

```python
# file: router.py
class Router:
    def __init__(self):
        self.routes = {}

    @staticmethod
    def _normalise(path):
        return "/" + "/".join(p for p in path.split("/") if p)

    def add_route(self, path, handler):
        self.routes[self._normalise(path)] = handler

    def call(self, path):
        handler = self.routes.get(self._normalise(path))
        return None if handler is None else (handler, {})
```

```bash
pytest -q --tb=no -rf test_router.py
```

```text
...FFFFF                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_router.py::test_param_is_captured - AssertionError: assert None == ('get', {'id': 'T-...
FAILED test_router.py::test_wildcard_matches_exactly_one_segment - AssertionError: assert None ==...
FAILED test_router.py::test_static_segment_beats_param - AssertionError: assert None == ('get', {...
FAILED test_router.py::test_backtracks_when_static_branch_dead_ends - AssertionError: assert None...
FAILED test_router.py::test_params_from_a_failed_branch_do_not_leak - AssertionError: assert None...
5 failed, 3 passed in 0.01s
```

The exact-match tests pass; every pattern test fails. A dict can't match patterns, so we need a trie.

#### Stage 2: a segment trie, matched greedily

> **Say:** "A trie keyed by segment. First attempt: walk down, taking the static child if there is one, otherwise the first pattern child."

```python
# file: router.py
class _Node:
    def __init__(self):
        self.children = {}     # segment (or ':name' or '*') -> _Node
        self.handler = None


class Router:
    def __init__(self):
        self.root = _Node()

    @staticmethod
    def _split(path):
        return [p for p in path.split("/") if p]

    def add_route(self, path, handler):
        node = self.root
        for seg in self._split(path):
            node = node.children.setdefault(seg, _Node())
        node.handler = handler

    def call(self, path):
        node, params = self.root, {}
        for seg in self._split(path):
            if seg in node.children:                       # static first…
                node = node.children[seg]
                continue
            for key, child in node.children.items():       # …else the first pattern child
                if key.startswith(":") or key == "*":
                    if key.startswith(":"):
                        params[key[1:]] = seg
                    node = child
                    break
            else:
                return None
        return (node.handler, params) if node.handler is not None else None
```

```bash
pytest -q --tb=no -rf test_router.py
```

```text
....F.FF                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_router.py::test_wildcard_matches_exactly_one_segment - AssertionError: assert None ==...
FAILED test_router.py::test_backtracks_when_static_branch_dead_ends - AssertionError: assert None...
FAILED test_router.py::test_params_from_a_failed_branch_do_not_leak - AssertionError: assert None...
3 failed, 5 passed in 0.01s
```

Three reds, all for the same reason: the greedy walk commits to its first choice and can't back out of a dead end. For `/issues/T-1/comments` it commits to `:id` (added before `*`), finds no `comments` under it, and gives up, even though `/issues/*/comments` fits.

#### Stage 3: recursion with backtracking (and a shared-dict bug)

> **Say:** "Recursion: if a branch dead-ends it returns None, and I try the next option."

```python
# file: router.py
class _Node:
    def __init__(self):
        self.children = {}
        self.handler = None


class Router:
    def __init__(self):
        self.root = _Node()

    @staticmethod
    def _split(path):
        return [p for p in path.split("/") if p]

    def add_route(self, path, handler):
        node = self.root
        for seg in self._split(path):
            node = node.children.setdefault(seg, _Node())
        node.handler = handler

    def call(self, path):
        return self._match(self.root, self._split(path), 0, {})

    def _match(self, node, parts, i, params):
        if i == len(parts):
            return (node.handler, params) if node.handler is not None else None
        seg = parts[i]
        if seg in node.children:                                   # static first
            hit = self._match(node.children[seg], parts, i + 1, params)
            if hit:
                return hit
        for key, child in node.children.items():                   # then patterns
            if key.startswith(":") or key == "*":
                if key.startswith(":"):
                    params[key[1:]] = seg                          # writes into the shared dict
                hit = self._match(child, parts, i + 1, params)
                if hit:
                    return hit
        return None
```

```bash
pytest -q --tb=no -rf test_router.py
```

```text
....F..F                                                                                     [100%]
===================================== short test summary info =====================================
FAILED test_router.py::test_wildcard_matches_exactly_one_segment - AssertionError: assert ('comme...
FAILED test_router.py::test_params_from_a_failed_branch_do_not_leak - AssertionError: assert ('z'...
2 failed, 6 passed in 0.01s
```

Backtracking now works, but two tests are red, and both are the same leak. The failed `:x` branch wrote `x=1` into the one shared dict, and the winning `*` branch returned that same dict. The wildcard test fails the same way: `/issues/T-1/comments` returns `{'id': 'T-1'}` left over from the failed `:id` branch.

#### Stage 4: a fresh params dict per branch

```python
# file: router.py
class _Node:
    def __init__(self):
        self.children = {}
        self.handler = None


class Router:
    def __init__(self):
        self.root = _Node()

    @staticmethod
    def _split(path):
        return [p for p in path.split("/") if p]

    def add_route(self, path, handler):
        node = self.root
        for seg in self._split(path):
            node = node.children.setdefault(seg, _Node())
        node.handler = handler

    def call(self, path):
        return self._match(self.root, self._split(path), 0, {})

    def _match(self, node, parts, i, params):
        if i == len(parts):
            return (node.handler, params) if node.handler is not None else None
        seg = parts[i]
        if seg in node.children:
            hit = self._match(node.children[seg], parts, i + 1, params)
            if hit:
                return hit
        for key, child in node.children.items():
            if key.startswith(":") or key == "*":
                branch = {**params, key[1:]: seg} if key.startswith(":") else params
                hit = self._match(child, parts, i + 1, branch)
                if hit:
                    return hit
        return None
```

```bash
pytest -q --tb=no -rf test_router.py
```

```text
........                                                                                     [100%]
8 passed in 0.01s
```

All green.

**Time:** O(L) for L request segments in the usual case. Many wildcards at many levels can force heavy backtracking in the worst case. **Space:** O(total route segments).

### Step 5 · Run everything and refactor

#### Trace the backtracking example

Routes `/a/b/x` and `/a/*/c`, request `/a/b/c`:

| call | segment | tries | result |
|---|---|---|---|
| `_match(root, i=0)` | `a` | static `a` | go down |
| `_match(a, i=1)` | `b` | static `b` | go down |
| `_match(b, i=2)` | `c` | static `c`? no. patterns? none | **None** (dead end) |
| back in `_match(a, i=1)` | `b` | pattern `*` | go down |
| `_match(*, i=2)` | `c` | static `c` | go down |
| `_match(c, i=3)` | end | handler `"c"` | **("c", {})** |

#### Refactor: make precedence independent of insertion order

There's a hidden bug. Parameter and wildcard children share one dict and are tried in insertion order, so whichever was **added first** wins. Our rule says a parameter beats a wildcard. Test first:

```python
# file: test_router.py (append)
def test_param_beats_wildcard_whatever_the_order_added():
    r = Router()
    r.add_route("/u/*", "wild")
    r.add_route("/u/:id", "param")
    assert r.call("/u/7") == ("param", {"id": "7"})
```

```bash
pytest -q --tb=no -rf test_router.py
```

```text
........F                                                                                    [100%]
===================================== short test summary info =====================================
FAILED test_router.py::test_param_beats_wildcard_whatever_the_order_added - AssertionError: asser...
1 failed, 8 passed in 0.01s
```

Red. Store the three kinds of children separately, so the order is explicit in the code:

```python
# file: router.py
from typing import Any


class _Node:
    __slots__ = ("static", "params", "wildcard", "handler")

    def __init__(self):
        self.static: dict[str, "_Node"] = {}
        self.params: dict[str, "_Node"] = {}      # param name -> node
        self.wildcard: "_Node | None" = None
        self.handler: Any = None


class Router:
    def __init__(self):
        self.root = _Node()

    @staticmethod
    def _split(path: str) -> list[str]:
        return [p for p in path.split("/") if p]

    def add_route(self, path: str, handler: Any) -> None:
        node = self.root
        for seg in self._split(path):
            if seg == "*":
                node.wildcard = node.wildcard or _Node()
                node = node.wildcard
            elif seg.startswith(":"):
                node = node.params.setdefault(seg[1:], _Node())
            else:
                node = node.static.setdefault(seg, _Node())
        node.handler = handler

    def call(self, path: str):
        return self._match(self.root, self._split(path), 0, {})

    def _match(self, node: _Node, parts: list[str], i: int, params: dict):
        if i == len(parts):
            return (node.handler, params) if node.handler is not None else None
        seg = parts[i]
        # Precedence: static, then parameters, then wildcard.
        if seg in node.static:
            hit = self._match(node.static[seg], parts, i + 1, params)
            if hit:
                return hit
        for name, child in node.params.items():
            hit = self._match(child, parts, i + 1, {**params, name: seg})
            if hit:
                return hit
        if node.wildcard is not None:
            return self._match(node.wildcard, parts, i + 1, params)
        return None
```

```bash
pytest -q --tb=no -rf test_router.py
```

```text
.........                                                                                    [100%]
9 passed in 0.01s
```

> **Say:** "Precedence now lives in the code's order (static, params, wildcard) instead of depending on the order routes were added."

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "Add middleware that runs before handlers, like auth or logging"

**First ask:** does middleware attach to a path **prefix**, so everything under `/admin` gets an auth check? That decides the design.

**What changes:**

- Store a list of middleware on trie nodes; `add_middleware("/admin", auth)` attaches it to the `/admin` node.
- When matching, also return the **list of nodes on the matched path**, then collect their middleware, outermost (root) first.
- Compose them in a chain where each middleware gets `(request, next)`. It can call `next(request)` to continue, or return early to stop the request (auth failing). This is the chain-of-responsibility pattern.

**Test first:**

```python
# file: test_router.py (append)
def test_middleware_runs_outermost_first_and_can_stop_the_request():
    log = []

    def logger(request, next_):
        log.append("log")
        return next_(request)

    def auth(request, next_):
        if request.get("token") != "secret":
            return "401"
        return next_(request)

    r = Router()
    r.add_route("/admin/users/:id", lambda request, params: f"user {params['id']}")
    r.add_route("/health", lambda request, params: "ok")
    r.add_middleware("/", logger)
    r.add_middleware("/admin", auth)

    assert r.handle("/health", {}) == "ok"
    assert r.handle("/admin/users/7", {}) == "401"
    assert r.handle("/admin/users/7", {"token": "secret"}) == "user 7"
    assert r.handle("/nope", {}) == "404"
    assert log == ["log", "log", "log", "log"]
```

```bash
pytest -q --tb=no -rf test_router.py -k middleware
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_router.py::test_middleware_runs_outermost_first_and_can_stop_the_request - AttributeE...
1 failed, 9 deselected in 0.01s
```

Red: the router has no `add_middleware` yet. Now `_match` returns the node path, and `call` keeps its old contract:

```python
# file: router.py
from typing import Any, Callable


class _Node:
    __slots__ = ("static", "params", "wildcard", "handler", "middleware")

    def __init__(self):
        self.static: dict[str, "_Node"] = {}
        self.params: dict[str, "_Node"] = {}
        self.wildcard: "_Node | None" = None
        self.handler: Any = None
        self.middleware: list[Callable] = []


class Router:
    def __init__(self):
        self.root = _Node()

    @staticmethod
    def _split(path: str) -> list[str]:
        return [p for p in path.split("/") if p]

    def _node_for(self, path: str) -> _Node:
        node = self.root
        for seg in self._split(path):
            if seg == "*":
                node.wildcard = node.wildcard or _Node()
                node = node.wildcard
            elif seg.startswith(":"):
                node = node.params.setdefault(seg[1:], _Node())
            else:
                node = node.static.setdefault(seg, _Node())
        return node

    def add_route(self, path: str, handler: Any) -> None:
        self._node_for(path).handler = handler

    def add_middleware(self, prefix: str, middleware: Callable) -> None:
        self._node_for(prefix).middleware.append(middleware)

    def call(self, path: str):
        hit = self._match(self.root, self._split(path), 0, {}, [self.root])
        if hit is None:
            return None
        nodes, params = hit
        return nodes[-1].handler, params

    def handle(self, path: str, request: Any):
        hit = self._match(self.root, self._split(path), 0, {}, [self.root])
        if hit is None:
            # No route: still run root-level middleware (e.g. logging), then 404.
            nodes, handler, params = [self.root], (lambda req, p: "404"), {}
        else:
            nodes, params = hit
            handler = nodes[-1].handler
        chain = [m for n in nodes for m in n.middleware]       # outermost first

        def run(i: int, req: Any):
            if i == len(chain):
                return handler(req, params)
            return chain[i](req, lambda r: run(i + 1, r))

        return run(0, request)

    def _match(self, node, parts, i, params, path_nodes):
        if i == len(parts):
            return (path_nodes, params) if node.handler is not None else None
        seg = parts[i]
        if seg in node.static:
            child = node.static[seg]
            hit = self._match(child, parts, i + 1, params, path_nodes + [child])
            if hit:
                return hit
        for name, child in node.params.items():
            hit = self._match(child, parts, i + 1, {**params, name: seg}, path_nodes + [child])
            if hit:
                return hit
        if node.wildcard is not None:
            child = node.wildcard
            return self._match(child, parts, i + 1, params, path_nodes + [child])
        return None
```

```bash
pytest -q --tb=no -rf test_router.py
```

```text
..........                                                                                   [100%]
10 passed in 0.01s
```

> **Say:** "Middleware on route prefixes means we can add, say, tenant-specific auth under one prefix without forking the router."

#### Follow-up 2: "Routes can be added while traffic is being served"

**What changes:** a request walking the trie while another thread inserts nodes could see a half-built route. Two standard answers:

- **Copy-on-write.** Build a new trie with the change and swap one reference (`self.root = new_root`). Readers never wait; each request sees either the old trie or the new one, never a mix. Best when routes change rarely, which is the usual case.
- **A read-write lock.** Many readers or one writer at a time. Simpler memory-wise, but readers block during writes.

The test you'd write first: start threads calling `call()` in a loop while another thread adds routes, and assert that every result is either a full old match or a full new match, never an exception.

#### Follow-up 3: "Customers can define their own routes"

Many wildcards at many levels can make backtracking explore lots of branches. Mention the guard rails: cap wildcard depth, reject ambiguous routes at registration (two different `:param` names at the same position), or memoise `(node, i)` dead ends.

### Mock dialogue

**Interviewer:** Build a router: `addRoute(path, handler)` and `callRoute(path)` which returns the handler.

**You:** Exact matches only to start? And what does a path look like: always a leading slash, no query string?

**Interviewer:** Yes, exact to start, and assume clean paths.

**You:** Then a dictionary from path to handler is enough, constant-time lookup. I’ll write a couple of pytest tests and that, then generalise if you add patterns.

> *Why this works:* Solving the simple version quickly banks a working answer and earns time. Don’t over-build before the follow-up arrives.

**Interviewer:** Now support `*` wildcards and `:id` parameters.

**You:** Does `*` match a single segment or several? And if a static route and a wildcard route both match, should the static one win?

**Interviewer:** Single segment. Static wins.

**You:** I'll add failing tests first: a parameter captured, a wildcard matching one segment, static beating a parameter, and the backtracking case. A dictionary can’t match patterns, so I’ll switch to a trie keyed by path segment. To match, I walk segment by segment, trying the exact child first, then parameters, then the wildcard. I need backtracking: if the exact branch dead-ends deeper down, I return and try the wildcard instead.

**Interviewer:** Can you give an example where that matters?

**You:** Routes `/a/b/x` and `/a/*/c`, request `/a/b/c`. The exact branch through b has no c, so without backtracking we’d say no match, even though the wildcard route fits. That's one of my tests.

**You:** Green. One more thing I'm guarding: params captured on a failed branch mustn't leak into the winning one, so each branch gets its own copy of the dict.

**Interviewer:** Add middleware that runs before handlers.

**You:** Should middleware attach to a route prefix, so everything under `/admin` gets an auth check? If so I’d store middleware on trie nodes, collect them while matching, and compose them so each receives the request and a `next` function. I'll start with a test where auth blocks `/admin` without a token.

> *Why this works:* Clarify where middleware attaches before designing it. It changes the data structure.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| No backtracking (greedy walk) | `/a/b/c` fails when a static `/a/b` exists without `/c`, though `/a/*/c` fits. | `test_backtracks_when_static_branch_dead_ends` |
| One shared params dict across branches | A failed branch's captures leak into the result. | `test_params_from_a_failed_branch_do_not_leak` |
| Precedence that depends on insertion order | Adding routes in a different order changes behaviour. | `test_param_beats_wildcard_whatever_the_order_added` |
| Keeping empty segments from `split("/")` | `/issues/` and `/issues` behave differently by accident. | `test_trailing_and_double_slashes_are_normalised` |
| Letting `*` swallow several segments | Over-matching. | `test_wildcard_matches_exactly_one_segment` |
| Over-building before the follow-up | Burns time; solve exact matching first, then generalise. | n/a |
