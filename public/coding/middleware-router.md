### Problem

Build a `Router` with `add_route(path, handler)` and `call(path)`, returning the matching handler or `None`.

Follow-ups: support `*` wildcards for a single segment and `:id` path parameters that are captured and returned.

### Interview refresher

Start with a dict for exact matches, then switch to a trie keyed by path segment (split on `/`, drop empties), each node holding children and a handler. Match with DFS: try the static child first, then `:param` children (capturing into a fresh copy of the params dict) and `*` children, returning the first full match. Backtracking is essential: `/a/b/c` must fall back to `/a/*/c` when the static `b` branch dead-ends. State the precedence aloud: static beats parameter beats wildcard. Cost is O(segments) in practice. For middleware, store it on nodes, collect it along the matched path, and compose a `(request, next)` chain.

### Hints

1. Exact matching is a dict. Wildcards force you into a trie keyed by path segment.
2. Decide and state a precedence rule: static segment beats parameter beats wildcard.
3. Matching needs backtracking: a static branch may dead-end deeper down where a wildcard branch would succeed.

### Approach

Split paths on `/` and store them in a segment trie. To match, DFS segment by segment, trying the static child first, then dynamic children, and return the first full match along with any captured params.

### Deep dive

#### What the interviewer is really testing

Choosing a data structure for hierarchical keys, writing recursion that can back out of dead ends, and making a precedence rule explicit.

#### Why a plain dictionary stops working

Exact matching is trivial: a dict from path to handler. Once routes contain patterns like `/issues/*`, you can’t look up `/issues/123` by hashing it, because the stored key isn’t the same string.

#### Two ways forward

- **A list of patterns tried in order** (often regexes). Simple, but every request checks every route, and results depend on insertion order: a source of subtle bugs.
- **A trie keyed by path segment.** Each level of the tree is one segment. Matching cost depends on the request path’s length, not the number of routes, and routes sharing a prefix share nodes.

We pick the trie, keyed by *segment* rather than character, because wildcards and parameters stand for whole segments.

#### Why precedence matters

With `/issues/new` and `/issues/:id`, a request to `/issues/new` matches both. Without a rule, the parameter route might capture “new” as an id. The usual rule: exact segment beats parameter, which beats wildcard. Trying the static child first enforces it.

#### Why backtracking is needed

```text
routes:  /a/b/x   and   /a/*/c
request: /a/b/c
try static 'b' → its node has child 'x', not 'c' → dead end
back up, try '*' for 'b' → child 'c' exists → match
```

A greedy matcher that commits to the static branch would wrongly return no match. Recursion that returns `None` from a dead end, letting the caller try the next option, handles this naturally.

#### Why params are copied per branch

If you capture `id=b` while exploring a branch that fails, that capture mustn’t leak into the branch that succeeds. Building a new dict for each branch (`{**params, name: seg}`) keeps them separate.

#### Normalising paths

Splitting on `/` and dropping empty pieces makes `/issues/`, `/issues` and `//issues` all `["issues"]`. Ask whether that’s wanted; some APIs treat trailing slashes as distinct routes.

#### Cost

Normally O(segments). Many wildcards at many levels can force heavy backtracking in the worst case; mention you’d memoise or restrict wildcards if routes were customer-defined.

### Reference solution

```python
class _Node:
    __slots__ = ("children", "handler")
    def __init__(self):
        self.children: dict[str, "_Node"] = {}
        self.handler = None


class Router:
    def __init__(self):
        self.root = _Node()

    @staticmethod
    def _split(path: str) -> list[str]:
        return [p for p in path.split("/") if p]

    def add_route(self, path: str, handler) -> None:
        node = self.root
        for seg in self._split(path):
            node = node.children.setdefault(seg, _Node())
        node.handler = handler

    def call(self, path: str):
        return self._match(self.root, self._split(path), 0, {})

    def _match(self, node, parts, i, params):
        if i == len(parts):
            return (node.handler, params) if node.handler is not None else None
        seg = parts[i]
        if seg in node.children:                       # static wins
            hit = self._match(node.children[seg], parts, i + 1, params)
            if hit:
                return hit
        for key, child in node.children.items():       # then dynamic
            if key.startswith(":") or key == "*":
                nxt = {**params, key[1:]: seg} if key.startswith(":") else params
                hit = self._match(child, parts, i + 1, nxt)
                if hit:
                    return hit
        return None


r = Router()
r.add_route("/issues", "list")
r.add_route("/issues/:id", "get")
r.add_route("/issues/*/comments", "comments")
assert r.call("/issues") == ("list", {})
assert r.call("/issues/JRA-1") == ("get", {"id": "JRA-1"})
assert r.call("/issues/JRA-1/comments") == ("comments", {})
assert r.call("/boards") is None
```

**Time:** O(L) typical, worse with many wildcards  
**Space:** O(total segments)

### Questions to ask before coding

- Exact matching only, or patterns too?
- Does `*` match exactly one segment, or any number?
- If two routes match, which one wins?
- Are trailing slashes, case and query strings significant?
- On no match, return None or a default 404 handler?
- Can routes be added while requests are being served?

### Interview walkthrough

**Interviewer:** Build a router: `addRoute(path, handler)` and `callRoute(path)` which returns the handler.

**You:** Exact matches only to start? And what does a path look like: always a leading slash, no query string?

**Interviewer:** Yes, exact to start, and assume clean paths.

**You:** Then a dictionary from path to handler is enough, constant-time lookup. I’ll write that with a couple of tests, then generalise if you add patterns.

> *Why this works:* Solving the simple version quickly banks a working answer and earns time. Don’t over-build before the follow-up arrives.

**Interviewer:** Now support `*` wildcards.

**You:** Does `*` match a single segment or several? And if a static route and a wildcard route both match, should the static one win?

**Interviewer:** Single segment. Static wins.

**You:** A dictionary can’t match patterns, so I’ll switch to a trie keyed by path segment. To match, I walk segment by segment, trying the exact child first, then the wildcard. I need backtracking: if the exact branch dead-ends deeper down, I return and try the wildcard instead.

**Interviewer:** Can you give an example where that matters?

**You:** Routes `/a/b/x` and `/a/*/c`, request `/a/b/c`. The exact branch through b has no c, so without backtracking we’d say no match, even though the wildcard route fits.

**You:** Testing: the list route, a parameterised get route, the wildcard comments route, and an unknown path returning None.

**Interviewer:** Add middleware that runs before handlers.

**You:** Should middleware attach to a route prefix, so everything under `/admin` gets an auth check? If so I’d store middleware on trie nodes, collect them while matching, and compose them so each receives the request and a `next` function.

> *Why this works:* Clarify where middleware attaches before designing it. It changes the data structure.

### Scale-up follow-up

**Interviewer adds:** “Add middleware that runs before the handler, like auth or logging.”

Store a list of middleware callables at each node and collect them along the matched path, then compose: each middleware gets `(request, next)`. This is the chain-of-responsibility pattern; mention that route-level middleware lets you add tenant-specific auth without forking the router.

### Where candidates slip

- Not backtracking, so /a/*/c fails when a static /a/b exists without /c.
- Trailing slashes and double slashes producing empty segments.
- Mutating a shared params dict across branches.
