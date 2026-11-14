### Problem

Implement a snake on a `width × height` grid starting at (0,0) with length 1. `move(direction)` returns the score, or -1 if the snake hits a wall or itself. Eating food grows the snake by one.

### Interview refresher

The body is a deque with the head on the left plus a set of occupied cells; a direction table maps U/D/L/R to deltas, and food is an advancing index. A move: compute the new head; out of bounds returns -1; if not eating, pop the tail and remove it from the set; if the head is now in the set, return -1; push the head. Eating simply skips the tail pop, which is the growth. Every move is O(1) because the middle of the body never changes. The classic bug is checking collision before freeing the tail cell. For “grow every k moves”, extract a `GrowthPolicy`; for multiplayer, move occupancy to the board.

### Hints

1. Body as a deque (head on the left), plus a set of occupied cells for O(1) collision checks.
2. Order matters: remove the tail before checking self-collision, because the head may move into the cell the tail is leaving.
3. Split responsibilities: Snake (body), Board (bounds/food), Game (rules). Interviewers reward this.

### Approach

Compute the new head. If out of bounds, game over. If not eating, pop the tail first and remove it from the set. Then check if the new head is in the set. Push the head; if eating, advance the food pointer and score.

### Deep dive

#### What the interviewer is really testing

Modelling changing state cleanly, making every move constant time, and getting one subtle rule ordering right. In a code-design round, how you split the code into classes is scored as much as the logic.

#### The key insight about movement

The obvious approach moves every body segment one step each turn: O(length) per move. But look at what actually changes. The head moves into a new cell and the tail leaves its cell. Every segment in between stays where it was on the grid. So a move is “add one cell at the front, remove one at the back”. Nothing in the middle needs touching.

#### Why two data structures

You need two things fast: the body’s order, so you know which cell is the tail; and a quick answer to “is this cell part of the snake?” for collisions. A deque handles the first: adding at the front and removing at the back are both O(1). A set handles the second: membership is O(1). Neither does both well, so you keep both and update them together.

#### The rule that trips people up

Can the head move into the cell the tail occupies? Yes, because the tail leaves that cell on the same move. So you must remove the tail *before* checking for collision. Check first and a snake chasing its own tail around a square dies when it shouldn’t.

```text
Length 4 snake circling a 2×2 square:
body (head first): (0,0) (0,1) (1,1) (1,0)
move to (1,0): tail is (1,0)
  check first      → collision → wrong
  remove tail first → (1,0) free → legal
```

#### Why growth is almost free

When the snake eats, just skip removing the tail. The head is added as usual, so length goes up by one. No special growth code.

#### Why a food index, not popping the list

Food appears one item at a time in order. Removing from the front of a Python list is O(n); an index that moves forward is O(1) and leaves the input untouched.

#### How to split the classes

A strong answer separates the direction table, the board (bounds and food), the snake (body and occupancy), and the game (rules and score). Then the follow-up (“grow every 5 moves”) only touches a small `GrowthPolicy`. If everything lives in one class, every new rule means editing the core loop.

#### Edge cases worth naming

- Reversing into your own neck: collision, or ignored?
- Food spawning on the snake’s body.
- What `move` returns after the game is already over.

### Reference solution

```python
from collections import deque


class SnakeGame:
    DIRS = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}

    def __init__(self, width: int, height: int, food: list[list[int]]):
        self.width, self.height = width, height
        self.food = [tuple(f) for f in food]
        self.food_idx = 0
        self.body = deque([(0, 0)])
        self.occupied = {(0, 0)}
        self.score = 0

    def move(self, direction: str) -> int:
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


g = SnakeGame(3, 2, [[1, 2], [0, 1]])
assert [g.move(d) for d in "RDRUL"] == [0, 0, 1, 1, 2]
assert g.move("U") == -1
```

**Time:** O(1) per move  
**Space:** O(W·H) worst case

### Questions to ask before coding

- Where does the snake start, and how long is it initially?
- Is moving into the cell the tail is leaving allowed?
- Can food ever appear on the snake’s body?
- If the player presses the opposite direction, is that a collision or ignored?
- After game over, should further moves keep returning -1?
- Do you want just the game engine, or a playable loop with input and rendering?

### Interview walkthrough

**Interviewer:** Design a snake game. The snake starts at the top-left with length one. Food appears in sequence. Hitting a wall or itself ends the game.

**You:** Do you want the engine with a `move(direction)` API returning the score, or a playable loop as well?

**Interviewer:** Engine is fine. Make it runnable with tests.

**You:** Two rule questions. If the head moves into the cell the tail is just leaving, is that legal? And pressing the opposite direction into the neck: collision or ignored?

**Interviewer:** Tail cell is legal. Reversing counts as a collision.

> *Why this works:* These two questions show you’ve already simulated the game in your head. That’s the strongest signal in a code-design round.

**You:** Plan: the body is a deque with the head at the front, plus a set of occupied cells. Each move I compute the new head and check bounds; if we’re not eating, I pop the tail so its cell is free; then I check the set for self-collision and push the head. Eating just skips the tail pop. Every move is constant time.

**Interviewer:** Why both a deque and a set?

**You:** The deque knows the order so I can find the tail; the set answers “is this cell occupied” in constant time. Searching the deque would be linear in the snake’s length.

**You:** I’ll put directions in a lookup table rather than an if-chain, and keep food as a moving index so I don’t mutate the input.

**You:** Test: width 3, height 2, food at (1,2) then (0,1). Right, Down: score 0. Right reaches (1,2), eats, score 1. Up, Left reaches (0,1), score 2. Up goes out of bounds: -1.

**Interviewer:** Change: there’s no food. The snake grows by one every 5 moves.

**You:** The only thing that changes is the decision “do we grow on this move?”. I’ll pull that into a growth policy with a `should_grow` method. Food-based and every-five-moves become two small classes, and the move logic stays the same.

**Interviewer:** What would you change for two players?

**You:** Occupancy moves from the snake to the board, so both snakes check one shared set. I’d also need a rule for head-on collisions in the same tick. Should both die, or the longer one win?

> *Why this works:* Ending with a rules question rather than guessing keeps the interviewer in the product-owner seat, which is what a customer-facing engineer does.

### Scale-up follow-up

**Interviewer adds:** “There's no food. The snake grows by one every 5 moves.” Or: “make it multiplayer.”

Extract a `GrowthPolicy` with `should_grow(move_count, head)`. Food-based and every-k-moves become two small classes; the move loop doesn't change. For multiplayer, occupancy moves to the board so every snake checks one shared set.

```python
class EveryKMoves:
    def __init__(self, k): self.k = k
    def should_grow(self, move_count, head): return move_count % self.k == 0

# in move():  eating = self.policy.should_grow(self.moves, head)
```

### Where candidates slip

- Checking self-collision before removing the tail.
- Mixing up (row, col) with (x, y) between bounds checks and the food list.
- One giant class with no separation; it reads as junior in this round.
