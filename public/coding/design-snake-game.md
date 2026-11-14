### Problem

Implement a snake on a `width × height` grid starting at (0,0) with length 1. `move(direction)` returns the score, or -1 if the snake hits a wall or itself. Eating food grows the snake by one.

#### In plain words

It's the classic phone game. The grid has `height` rows and `width` columns; cell `(row, col)` with `(0, 0)` at the top-left. The snake is a chain of cells. Each `move("U" | "D" | "L" | "R")`:

- moves the head one cell in that direction, and the rest of the body follows;
- if the head lands on the current piece of food, the snake gets one longer and the score goes up by 1, and the next piece of food appears;
- if the head leaves the grid or runs into the body, the game is over and `move` returns -1.

Food is given up front as a list of cells, and appears one piece at a time in that order.

#### Words used on this page

| Term | Meaning |
|---|---|
| Head / tail | The front cell of the snake / the last cell. |
| Deque | A list you can add to and remove from at both ends in O(1). |
| Set | An unordered collection with O(1) "is this in it?" checks. |
| Direction table | A dict mapping `"U"` → `(-1, 0)` etc., instead of an if-chain. |
| Growth policy | A small object that answers "does the snake grow on this move?". |
| TDD | Test-driven development: write a failing test, make it pass, tidy up, repeat. |

### 60-second recap · for revision only — don't open while learning

> Revision summary. If you're learning this problem for the first time, close this and start from **Background you need**.

The body is a deque with the head on the left plus a set of occupied cells; a direction table maps U/D/L/R to deltas, and food is an advancing index. A move: compute the new head; out of bounds returns -1; if not eating, pop the tail and remove it from the set; if the head is now in the set, return -1; push the head. Eating simply skips the tail pop, which is the growth. Every move is O(1) because the middle of the body never changes. The classic bug is checking collision before freeing the tail cell. Track game over so later moves keep returning -1. For “grow every k moves”, extract a `GrowthPolicy`; for multiplayer, move occupancy to the board.

**Cheat sheet**

1. **Ask:** row/col convention? tail cell legal? reversing into the neck? food on the body? moves after game over? engine or playable loop?
2. **Tests first:** example run, wall, self-hit, chasing own tail is legal, food strictly in order, game over sticks.
3. **Build:** `deque` body + `set` occupancy + direction table + food index.
4. **Order:** bounds → (not eating) pop tail → collision → push head → (eating) score.
5. **Follow-ups:** grow every k moves → `GrowthPolicy`; multiplayer → occupancy on a shared board + a head-on rule.

### Background you need

#### 1. Grid coordinates

We use `(row, col)`. Moving **up** decreases the row, **down** increases it, **left** decreases the column, **right** increases it. A table turns a letter into that change:

```python
DIRS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}

r, c = (1, 1)
dr, dc = DIRS["U"]
print((r + dr, c + dc))
```

```text
(0, 1)
```

Mixing up `(row, col)` with `(x, y)` is the most common bug in grid problems. Say your convention out loud.

#### 2. Deque: cheap at both ends

The snake gains a cell at the head and loses one at the tail on every move. A Python `list` makes `insert(0, x)` cost O(n), because everything shifts. A `deque` does `appendleft` (add at the front) and `pop` (remove from the back) in O(1).

```python
from collections import deque

body = deque([(0, 1), (0, 0)])   # head first
body.appendleft((0, 2))          # new head
tail = body.pop()                # old tail leaves
print(list(body), tail)
```

```text
[(0, 2), (0, 1)] (0, 0)
```

#### 3. Set: "is this cell taken?" in O(1)

Checking `cell in body` on a deque or list scans every element: O(length). A `set` answers in O(1). We keep **both**: the deque knows the order (so we know which cell is the tail), and the set answers collision checks. They must always be updated together.

#### 4. The insight: the middle of the snake never moves

It looks as if every segment moves each turn. But on the grid, only two cells change: the head moves into a new cell, and the tail leaves its old one. Every cell in between is still occupied. So a move is "add one cell at the front, remove one at the back", which is O(1).

#### 5. pytest in one minute

A test is a function named `test_…` in a file named `test_….py`. You check results with a plain `assert`, and pytest shows both sides when one fails. Run `pytest -q --tb=no -rf <file>`: `-q` prints one dot per pass and `F` per failure, `--tb=no` hides tracebacks, and `-rf` lists failures one per line. The [API rate limiter](#/coding/api-rate-limiter) page has a fuller primer with fixtures.

### Step 1 · Clarify (first ~5 min)

| Ask | Why it matters | If they say… → you build… |
|---|---|---|
| Engine only (a `move` API), or a playable loop with input and drawing? | Scope. | Engine → a class with `move()` and tests. Playable → the same engine plus a thin loop around it; never mix the two. |
| Are cells `(row, col)`, and is food given as `[row, col]`? | Avoids the x/y swap bug. | Yes → direction table in row/col deltas. `(x, y)` → swap the table, and convert food once at the start. |
| Can the head move into the cell the tail is just leaving? | The single subtle rule in this problem. | Yes (usual) → pop the tail **before** checking collision. No → check before popping. |
| Pressing the opposite direction into the neck: collision or ignored? | Changes the input handling. | Collision → nothing special (it falls out of the body check for length ≥ 3). Ignored → remember the last direction and skip reversals. |
| Can food appear on the snake's body? | Affects food handling. | No → just compare the head with the current food. Yes → still only eat when the head reaches it. |
| After game over, what should further moves return? | Avoids corrupt state after a crash. | Keep returning -1 → a `game_over` flag checked first. |

**If they say "your call", state your defaults out loud:**

> "I'll build the engine with tests; cells are (row, col) and food comes as [row, col]; moving into the cell the tail is leaving is legal; reversing into the neck is just a normal collision; and after game over every move returns -1."

### Step 2 · Write the tests first

> **Say:** "Before I code, here are the cases I'll make pass."

#### Work the example by hand first

`width = 3`, `height = 2`, food at `(1, 2)` then `(0, 1)`:

```text
start         body [(0,0)]                     score 0
R → (0,1)     food is (1,2), not here          score 0   (food (0,1) isn't active yet)
D → (1,1)                                      score 0
R → (1,2)     eat! body grows to 2             score 1   next food (0,1)
U → (0,2)     body [(0,2),(1,2)]               score 1
L → (0,1)     eat! body grows to 3             score 2
U → (-1,1)    off the grid                     -1
```

#### Chasing your own tail (the rule that trips people up)

```text
2×2 grid, snake of length 4 filling it: head (1,0), then (1,1), (0,1), tail (0,0)
U → (0,0): that's the tail's cell, but the tail moves away on this same step → legal
```

#### The tests, one per requirement

Code goes in `snake.py`, tests in `test_snake.py`.

```python
# file: test_snake.py
from snake import SnakeGame


def test_example_run_scores_and_grows():
    game = SnakeGame(3, 2, [[1, 2], [0, 1]])
    assert [game.move(d) for d in "RDRUL"] == [0, 0, 1, 1, 2]


def test_hitting_a_wall_ends_the_game():
    assert SnakeGame(3, 2, []).move("U") == -1
    assert SnakeGame(3, 2, []).move("L") == -1


def test_hitting_itself_ends_the_game():
    # Eat 4 pieces in a row to reach length 5, then turn back into the body.
    game = SnakeGame(4, 3, [[0, 1], [0, 2], [0, 3], [1, 3]])
    assert [game.move(d) for d in "RRRD"] == [1, 2, 3, 4]
    assert game.move("L") == 4
    assert game.move("U") == -1          # (0,2) is still part of the body


def test_head_may_enter_the_cell_the_tail_is_leaving():
    # Length 4 fills a 2×2 grid; it can circle forever.
    game = SnakeGame(2, 2, [[0, 1], [1, 1], [1, 0]])
    assert [game.move(d) for d in "RDLUR"] == [1, 2, 3, 3, 3]


def test_food_appears_strictly_in_order():
    # (0,1) is the second piece, so passing over it first doesn't eat it.
    game = SnakeGame(3, 2, [[0, 2], [0, 1]])
    assert [game.move(d) for d in "RRDLU"] == [0, 1, 1, 1, 2]
```

#### Red: run them against an empty stub

```python
# file: snake.py
class SnakeGame:
    def __init__(self, width, height, food):
        pass

    def move(self, direction):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_snake.py
```

```text
FFFFF                                                                                        [100%]
===================================== short test summary info =====================================
FAILED test_snake.py::test_example_run_scores_and_grows - NotImplementedError
FAILED test_snake.py::test_hitting_a_wall_ends_the_game - NotImplementedError
FAILED test_snake.py::test_hitting_itself_ends_the_game - NotImplementedError
FAILED test_snake.py::test_head_may_enter_the_cell_the_tail_is_leaving - NotImplementedError
FAILED test_snake.py::test_food_appears_strictly_in_order - NotImplementedError
5 failed in 0.01s
```

### Step 3 · Find the approach

#### Hints (open one at a time if you're stuck)

1. Which cells actually change on the grid during one move?
2. You need the body's order (to find the tail) **and** fast "is this cell occupied?". Can one structure do both well?
3. If the head moves into the tail's cell, is that a crash? When is the tail's cell freed?

#### Brute force first

Store the body as a list. On each move, insert the new head at the front, drop the last cell (unless eating), and check `head in body`. That's O(length) per move (both `insert(0, …)` and `in` scan the list), but it's easy to get right first.

#### The key insight

Only the head cell and the tail cell change. So:

- a **deque** for the order: `appendleft` the head and `pop` the tail, both O(1);
- a **set** of occupied cells for collisions, O(1).

#### The order of operations

1. Compute the new head. Off the grid → -1.
2. Is the new head the current food? If **not** eating, pop the tail now (deque and set). This frees the tail's cell *before* the collision check.
3. If the new head is in the occupied set → -1.
4. Push the head (deque and set). If eating, score += 1 and move to the next food.

Growth is free: when eating, you simply don't pop the tail.

#### The plan (say this, then wait for a nod)

> **Say:** "The body is a deque with the head at the front, plus a set of occupied cells. Each move I compute the new head and check bounds; if we're not eating I pop the tail first so its cell is free; then I check the set for self-collision and push the head. Eating just skips the tail pop. Every move is O(1). Okay?"

How this maps to the tests: popping the tail before the check → `test_head_may_enter_the_cell_the_tail_is_leaving`; a food *index* that only advances → `test_food_appears_strictly_in_order`.

### Step 4 · Make the tests pass, stage by stage

#### Stage 1: a list, checking collision first (the common first try)

> **Say:** "First the straightforward version with a list."

```python
# file: snake.py
class SnakeGame:
    DIRS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}

    def __init__(self, width, height, food):
        self.width, self.height = width, height
        self.food = [tuple(f) for f in food]
        self.food_idx = 0                    # next piece of food to eat
        self.body = [(0, 0)]                 # head first
        self.score = 0

    def move(self, direction):
        dr, dc = self.DIRS[direction]
        r, c = self.body[0]
        head = (r + dr, c + dc)
        if not (0 <= head[0] < self.height and 0 <= head[1] < self.width):
            return -1
        if head in self.body:                # collision check against the whole body
            return -1
        eating = self.food_idx < len(self.food) and self.food[self.food_idx] == head
        self.body.insert(0, head)
        if eating:
            self.food_idx += 1
            self.score += 1
        else:
            self.body.pop()                  # tail leaves
        return self.score
```

```bash
pytest -q --tb=no -rf test_snake.py
```

```text
...F.                                                                                        [100%]
===================================== short test summary info =====================================
FAILED test_snake.py::test_head_may_enter_the_cell_the_tail_is_leaving - assert [1, 2, 3, -1, -1]...
1 failed, 4 passed in 0.01s
```

One red, and it's the classic bug. We check collision against the whole body, *including the tail cell that's about to be freed*, so a snake chasing its own tail "crashes". The fix is ordering.

#### Stage 2: free the tail before checking

```python
# file: snake.py
class SnakeGame:
    DIRS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}

    def __init__(self, width, height, food):
        self.width, self.height = width, height
        self.food = [tuple(f) for f in food]
        self.food_idx = 0
        self.body = [(0, 0)]
        self.score = 0

    def move(self, direction):
        dr, dc = self.DIRS[direction]
        r, c = self.body[0]
        head = (r + dr, c + dc)
        if not (0 <= head[0] < self.height and 0 <= head[1] < self.width):
            return -1
        eating = self.food_idx < len(self.food) and self.food[self.food_idx] == head
        if not eating:
            self.body.pop()                  # tail leaves FIRST
        if head in self.body:
            return -1
        self.body.insert(0, head)
        if eating:
            self.food_idx += 1
            self.score += 1
        return self.score
```

```bash
pytest -q --tb=no -rf test_snake.py
```

```text
.....                                                                                        [100%]
5 passed in 0.01s
```

All green, but `insert(0, …)` and `head in self.body` are both O(length).

#### Stage 3: deque + set, O(1) per move

> **Say:** "Same logic; now a deque for the order and a set for collisions, so each move is constant time."

```python
# file: snake.py
from collections import deque


class SnakeGame:
    DIRS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}

    def __init__(self, width, height, food):
        self.width, self.height = width, height
        self.food = [tuple(f) for f in food]
        self.food_idx = 0
        self.body = deque([(0, 0)])          # head on the left
        self.occupied = {(0, 0)}             # same cells, for O(1) lookups
        self.score = 0

    def move(self, direction):
        dr, dc = self.DIRS[direction]
        r, c = self.body[0]
        head = (r + dr, c + dc)
        if not (0 <= head[0] < self.height and 0 <= head[1] < self.width):
            return -1
        eating = self.food_idx < len(self.food) and self.food[self.food_idx] == head
        if not eating:
            tail = self.body.pop()
            self.occupied.remove(tail)
        if head in self.occupied:
            return -1
        self.body.appendleft(head)
        self.occupied.add(head)
        if eating:
            self.food_idx += 1
            self.score += 1
        return self.score
```

```bash
pytest -q --tb=no -rf test_snake.py
```

```text
.....                                                                                        [100%]
5 passed in 0.01s
```

**Time:** O(1) per move. **Space:** O(W × H) in the worst case (a snake filling the grid).

### Step 5 · Run everything and refactor

#### Trace the example against the final code

| move | new head | eating? | tail popped | collision? | body after (head first) | returns |
|---|---|---|---|---|---|---|
| R | (0,1) | no (food is (1,2)) | (0,0) | no | (0,1) | 0 |
| D | (1,1) | no | (0,1) | no | (1,1) | 0 |
| R | (1,2) | **yes** | — | no | (1,2) (1,1) | 1 |
| U | (0,2) | no (food is (0,1)) | (1,1) | no | (0,2) (1,2) | 1 |
| L | (0,1) | **yes** | — | no | (0,1) (0,2) (1,2) | 2 |
| U | (-1,1) | — | — | off grid | unchanged | -1 |

#### Refactor 1: game over must stick

There's a hidden bug. On a self-collision we've already popped the tail before returning -1, so the snake is left half-moved. A later `move` would carry on from a broken state. Pin the rule down with a test:

```python
# file: test_snake.py (append)
def test_moves_after_game_over_keep_returning_minus_one():
    game = SnakeGame(3, 1, [])
    assert game.move("L") == -1
    assert game.move("R") == -1          # would be legal on a fresh board
```

```bash
pytest -q --tb=no -rf test_snake.py
```

```text
.....F                                                                                       [100%]
===================================== short test summary info =====================================
FAILED test_snake.py::test_moves_after_game_over_keep_returning_minus_one - AssertionError: asser...
1 failed, 5 passed in 0.01s
```

#### Refactor 2: split the responsibilities

In a code-design round, how you split the classes is scored as much as the logic. Separate:

- **`Board`**: bounds and the food sequence;
- **`SnakeGame`**: the body, occupancy, the rules and the score.

Add a `game_over` flag that's checked first and set on any crash.

```python
# file: snake.py
from collections import deque

DIRS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}
Cell = tuple[int, int]


class Board:
    """Grid bounds and the food sequence."""

    def __init__(self, width: int, height: int, food: list[list[int]]):
        self.width, self.height = width, height
        self.food = [tuple(f) for f in food]
        self.food_idx = 0

    def in_bounds(self, cell: Cell) -> bool:
        r, c = cell
        return 0 <= r < self.height and 0 <= c < self.width

    def is_food(self, cell: Cell) -> bool:
        return self.food_idx < len(self.food) and self.food[self.food_idx] == cell

    def eat(self) -> None:
        self.food_idx += 1


class SnakeGame:
    def __init__(self, width: int, height: int, food: list[list[int]]):
        self.board = Board(width, height, food)
        self.body: deque[Cell] = deque([(0, 0)])
        self.occupied: set[Cell] = {(0, 0)}
        self.score = 0
        self.game_over = False

    def move(self, direction: str) -> int:
        if self.game_over:
            return -1
        dr, dc = DIRS[direction]
        r, c = self.body[0]
        head = (r + dr, c + dc)
        if not self.board.in_bounds(head):
            return self._crash()
        eating = self.board.is_food(head)
        if not eating:
            self.occupied.remove(self.body.pop())   # free the tail first
        if head in self.occupied:
            return self._crash()
        self.body.appendleft(head)
        self.occupied.add(head)
        if eating:
            self.board.eat()
            self.score += 1
        return self.score

    def _crash(self) -> int:
        self.game_over = True
        return -1
```

```bash
pytest -q --tb=no -rf test_snake.py
```

```text
......                                                                                       [100%]
6 passed in 0.01s
```

> **Say:** "Board owns bounds and food; the game owns the body and rules. Game over is sticky, so a crash can't leave a half-moved snake that keeps playing."

### Step 6 · Follow-ups (test-first again)

#### Follow-up 1: "There's no food. The snake grows by one every k moves."

**What changes:** only the decision "do we grow on this move?". Pull it out into a **growth policy**: an object with `should_grow(game, head)`. Eating food becomes one policy and "every k moves" becomes another, and the move logic stays the same. This is the strategy pattern.

**Test first:** the score counts how many times the snake has grown.

```python
# file: test_snake.py (append)
from snake import EveryKMoves


def test_grows_every_k_moves_without_food():
    game = SnakeGame(10, 1, [], growth=EveryKMoves(3))
    assert [game.move("R") for _ in range(6)] == [0, 0, 1, 1, 1, 2]
    assert len(game.body) == 3
```

```python
# file: snake.py (append)
class EveryKMoves:
    def __init__(self, k):
        pass

    def should_grow(self, game, head):
        raise NotImplementedError
```

```bash
pytest -q --tb=no -rf test_snake.py -k every
```

```text
F                                                                                            [100%]
===================================== short test summary info =====================================
FAILED test_snake.py::test_grows_every_k_moves_without_food - TypeError: SnakeGame.__init__() got...
1 failed, 6 deselected in 0.01s
```

Red: `SnakeGame` doesn't accept a growth policy yet. Add the two policies and let the game ask the policy instead of the board:

```python
# file: snake.py
from collections import deque

DIRS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}
Cell = tuple[int, int]


class Board:
    """Grid bounds and the food sequence."""

    def __init__(self, width: int, height: int, food: list[list[int]]):
        self.width, self.height = width, height
        self.food = [tuple(f) for f in food]
        self.food_idx = 0

    def in_bounds(self, cell: Cell) -> bool:
        r, c = cell
        return 0 <= r < self.height and 0 <= c < self.width

    def is_food(self, cell: Cell) -> bool:
        return self.food_idx < len(self.food) and self.food[self.food_idx] == cell

    def eat(self) -> None:
        self.food_idx += 1


class FoodGrowth:
    """Grow when the head reaches the current piece of food."""

    def should_grow(self, game: "SnakeGame", head: Cell) -> bool:
        if game.board.is_food(head):
            game.board.eat()
            return True
        return False


class EveryKMoves:
    """Grow on every k-th move, regardless of food."""

    def __init__(self, k: int):
        self.k = k

    def should_grow(self, game: "SnakeGame", head: Cell) -> bool:
        return game.moves % self.k == 0


class SnakeGame:
    def __init__(self, width: int, height: int, food: list[list[int]], growth=None):
        self.board = Board(width, height, food)
        self.growth = growth or FoodGrowth()
        self.body: deque[Cell] = deque([(0, 0)])
        self.occupied: set[Cell] = {(0, 0)}
        self.score = 0
        self.moves = 0
        self.game_over = False

    def move(self, direction: str) -> int:
        if self.game_over:
            return -1
        self.moves += 1
        dr, dc = DIRS[direction]
        r, c = self.body[0]
        head = (r + dr, c + dc)
        if not self.board.in_bounds(head):
            return self._crash()
        growing = self.growth.should_grow(self, head)
        if not growing:
            self.occupied.remove(self.body.pop())
        if head in self.occupied:
            return self._crash()
        self.body.appendleft(head)
        self.occupied.add(head)
        if growing:
            self.score += 1
        return self.score

    def _crash(self) -> int:
        self.game_over = True
        return -1
```

```bash
pytest -q --tb=no -rf test_snake.py
```

```text
.......                                                                                      [100%]
7 passed in 0.01s
```

All the original tests still pass with the default `FoodGrowth`, and the new rule is a 6-line class.

#### Follow-up 2: "Make it two players"

**What changes:**

- **Occupancy moves to the board.** Both snakes must check one shared set of taken cells, so the `occupied` set belongs on `Board`, not on each snake.
- **A tick moves every snake.** Compute all the new heads first, free all the tails, then check collisions, so that the order the snakes are processed in doesn't matter.
- **New rules to ask about:** two heads entering the same cell in one tick (both die? longer one wins?), and a head entering a cell the other snake's tail is leaving.

The tests you'd write first: head-on collision in one tick, one snake running into the other's body, and one snake entering the other's freed tail cell.

> **Say:** "For head-on collisions in the same tick, should both die, or the longer one win? That's a product decision, so I'd rather ask than guess."

### Mock dialogue

**Interviewer:** Design a snake game. The snake starts at the top-left with length one. Food appears in sequence. Hitting a wall or itself ends the game.

**You:** Do you want the engine with a `move(direction)` API returning the score, or a playable loop as well?

**Interviewer:** Engine is fine. Make it runnable with tests.

**You:** Two rule questions. If the head moves into the cell the tail is just leaving, is that legal? And pressing the opposite direction into the neck: collision or ignored?

**Interviewer:** Tail cell is legal. Reversing is just a normal move; if it hits the body, it's a crash.

> *Why this works:* These two questions show you’ve already simulated the game in your head. That’s the strongest signal in a code-design round.

**You:** Before coding, the tests: your example sequence, hitting a wall, hitting my own body, circling a 2×2 square chasing my own tail (which must stay legal), food strictly in order, and moves after game over returning -1.

**You:** Plan: the body is a deque with the head at the front, plus a set of occupied cells. Each move I compute the new head and check bounds; if we’re not eating, I pop the tail so its cell is free; then I check the set for self-collision and push the head. Eating just skips the tail pop. Every move is constant time.

**Interviewer:** Why both a deque and a set?

**You:** The deque knows the order so I can find the tail; the set answers “is this cell occupied” in constant time. Searching the deque would be linear in the snake’s length.

**You:** I’ll put directions in a lookup table rather than an if-chain, keep food as a moving index so I don’t mutate the input, and split a Board class out for bounds and food.

**You:** Running the tests: all green. The tail-chasing case is the one that catches checking collision too early.

**Interviewer:** Change: there’s no food. The snake grows by one every 5 moves.

**You:** The only thing that changes is the decision “do we grow on this move?”. I'll write a failing test for growing every k moves, then pull that decision into a growth policy with a `should_grow` method. Food-based and every-k-moves become two small classes, and the move logic stays the same.

**Interviewer:** What would you change for two players?

**You:** Occupancy moves from the snake to the board, so both snakes check one shared set. I’d also need a rule for head-on collisions in the same tick. Should both die, or the longer one win?

> *Why this works:* Ending with a rules question rather than guessing keeps the interviewer in the product-owner seat, which is what a customer-facing engineer does.

### Mistakes to avoid

| Mistake | Why it hurts | Test that catches it |
|---|---|---|
| Checking self-collision before removing the tail | A snake chasing its own tail dies when it shouldn't. | `test_head_may_enter_the_cell_the_tail_is_leaving` |
| Popping food from the front of a list, or matching any food | O(n) per eat, or eating food out of order. | `test_food_appears_strictly_in_order` |
| Mixing `(row, col)` with `(x, y)` | Moves go sideways; bounds checks use the wrong side. | `test_example_run_scores_and_grows`, `test_hitting_a_wall_ends_the_game` |
| Leaving state half-updated after a crash | Later moves continue from a corrupt snake. | `test_moves_after_game_over_keep_returning_minus_one` |
| `head in body` on a list or deque | O(length) per move instead of O(1). | None (speed); say the complexity. |
| One giant class with if-chains for directions and rules | Every new rule means editing the core loop; reads as junior. | `test_grows_every_k_moves_without_food` shows the payoff of a policy. |
