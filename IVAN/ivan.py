import turtle
import random
import os
import json

# ==========================================
# SNAKE GAME - DELUXE EDITION
# ==========================================

# ------------------------------------------
# SETTINGS
# ------------------------------------------

WINDOW_WIDTH = 700
WINDOW_HEIGHT = 700

GRID_SIZE = 20

SNAKE_SPEED = 110  # Constant speed in milliseconds

BACKGROUND = "#0f172a"
GRID_COLOR = "#1e293b"

SNAKE_HEAD_COLOR = "#4ade80"
SNAKE_BODY_COLOR = "#22c55e"

FOOD_COLOR = "#ef4444"
GOLDEN_FOOD_COLOR = "#facc15"

TEXT_COLOR = "#ffffff"

SAVE_FILE = "snake_highscore.json"

# Playable area
MIN_X = -320
MAX_X = 320

MIN_Y = -280
MAX_Y = 280

# ------------------------------------------
# GAME VARIABLES
# ------------------------------------------

score = 0
high_score = 0
level = 1

direction = "stop"
next_direction = "stop"

game_started = False
game_over = False
paused = False

snake = []
obstacles = []

food_is_golden = False

# ------------------------------------------
# HIGH SCORE SYSTEM
# ------------------------------------------

def load_high_score():

    if os.path.exists(SAVE_FILE):

        try:
            with open(SAVE_FILE, "r") as file:
                data = json.load(file)

            return data.get("high_score", 0)

        except:
            return 0

    return 0


def save_high_score():

    data = {
        "high_score": high_score
    }

    try:
        with open(SAVE_FILE, "w") as file:
            json.dump(data, file)

    except:
        pass


high_score = load_high_score()

# ------------------------------------------
# CREATE WINDOW
# ------------------------------------------

screen = turtle.Screen()

screen.title("SNAKE DELUXE")

screen.setup(
    width=WINDOW_WIDTH,
    height=WINDOW_HEIGHT
)

screen.bgcolor(BACKGROUND)

screen.tracer(0)

# ------------------------------------------
# DRAW GRID
# ------------------------------------------

grid = turtle.Turtle()

grid.hideturtle()
grid.speed(0)
grid.color(GRID_COLOR)
grid.penup()

for x in range(MIN_X, MAX_X + 1, GRID_SIZE):

    grid.goto(x, MIN_Y)
    grid.pendown()
    grid.goto(x, MAX_Y)
    grid.penup()

for y in range(MIN_Y, MAX_Y + 1, GRID_SIZE):

    grid.goto(MIN_X, y)
    grid.pendown()
    grid.goto(MAX_X, y)
    grid.penup()

# ------------------------------------------
# DRAW BORDER
# ------------------------------------------

border = turtle.Turtle()

border.hideturtle()
border.speed(0)

border.color("#38bdf8")
border.pensize(3)

border.penup()
border.goto(MIN_X - 10, MIN_Y - 10)

border.pendown()

for position in [
    (MAX_X + 10, MIN_Y - 10),
    (MAX_X + 10, MAX_Y + 10),
    (MIN_X - 10, MAX_Y + 10),
    (MIN_X - 10, MIN_Y - 10)
]:

    border.goto(position)

border.penup()

# ------------------------------------------
# CREATE SNAKE
# ------------------------------------------

head = turtle.Turtle()

head.shape("square")
head.color(SNAKE_HEAD_COLOR)

head.penup()
head.speed(0)

head.goto(0, 0)

# ------------------------------------------
# CREATE FOOD
# ------------------------------------------

food = turtle.Turtle()

food.shape("circle")
food.color(FOOD_COLOR)

food.penup()
food.speed(0)

# ------------------------------------------
# SCORE DISPLAY
# ------------------------------------------

score_pen = turtle.Turtle()

score_pen.hideturtle()
score_pen.penup()

score_pen.color(TEXT_COLOR)

score_pen.goto(0, 305)


def update_score():

    score_pen.clear()

    score_pen.write(
        f"SCORE: {score}     LEVEL: {level}     BEST: {high_score}",
        align="center",
        font=("Arial", 16, "bold")
    )

# ------------------------------------------
# MESSAGE DISPLAY
# ------------------------------------------

message_pen = turtle.Turtle()

message_pen.hideturtle()
message_pen.penup()

message_pen.color(TEXT_COLOR)


def show_message(title, subtitle=""):

    message_pen.clear()

    message_pen.goto(0, 35)

    message_pen.write(
        title,
        align="center",
        font=("Arial", 30, "bold")
    )

    message_pen.goto(0, -15)

    message_pen.write(
        subtitle,
        align="center",
        font=("Arial", 15, "normal")
    )


def clear_message():

    message_pen.clear()

# ------------------------------------------
# MOVEMENT
# ------------------------------------------

def go_up():

    global next_direction

    if direction != "down":
        next_direction = "up"


def go_down():

    global next_direction

    if direction != "up":
        next_direction = "down"


def go_left():

    global next_direction

    if direction != "right":
        next_direction = "left"


def go_right():

    global next_direction

    if direction != "left":
        next_direction = "right"


def move_snake():

    global direction

    direction = next_direction

    if direction == "stop":
        return

    # Remember previous positions
    previous_positions = [
        head.position()
    ]

    for segment in snake:
        previous_positions.append(
            segment.position()
        )

    # Move body
    for i, segment in enumerate(snake):

        segment.goto(
            previous_positions[i]
        )

    # Move head
    if direction == "up":
        head.sety(
            head.ycor() + GRID_SIZE
        )

    elif direction == "down":
        head.sety(
            head.ycor() - GRID_SIZE
        )

    elif direction == "left":
        head.setx(
            head.xcor() - GRID_SIZE
        )

    elif direction == "right":
        head.setx(
            head.xcor() + GRID_SIZE
        )

# ------------------------------------------
# GENERATE FOOD
# ------------------------------------------

def generate_food():

    global food_is_golden

    occupied = {
        (int(head.xcor()), int(head.ycor()))
    }

    for segment in snake:

        occupied.add(
            (
                int(segment.xcor()),
                int(segment.ycor())
            )
        )

    for obstacle in obstacles:

        occupied.add(
            (
                int(obstacle.xcor()),
                int(obstacle.ycor())
            )
        )

    possible_positions = []

    for x in range(MIN_X, MAX_X + 1, GRID_SIZE):

        for y in range(MIN_Y, MAX_Y + 1, GRID_SIZE):

            if (x, y) not in occupied:

                possible_positions.append(
                    (x, y)
                )

    if not possible_positions:
        return

    x, y = random.choice(possible_positions)

    food.goto(x, y)

    # 15% chance of golden food
    food_is_golden = random.random() < 0.15

    if food_is_golden:

        food.color(GOLDEN_FOOD_COLOR)

    else:

        food.color(FOOD_COLOR)

# ------------------------------------------
# CREATE SNAKE SEGMENT
# ------------------------------------------

def add_segment():

    segment = turtle.Turtle()

    segment.shape("square")

    segment.color(SNAKE_BODY_COLOR)

    segment.penup()
    segment.speed(0)

    if snake:

        segment.goto(
            snake[-1].position()
        )

    else:

        segment.goto(
            head.position()
        )

    snake.append(segment)

# ------------------------------------------
# CREATE OBSTACLES
# ------------------------------------------

def create_obstacles():

    # Remove old obstacles
    for obstacle in obstacles:
        obstacle.hideturtle()

    obstacles.clear()

    # Level 1 has no obstacles
    if level == 1:
        return

    number_of_obstacles = min(
        (level - 1) * 3,
        24
    )

    occupied = {
        (int(head.xcor()), int(head.ycor())),
        (int(food.xcor()), int(food.ycor()))
    }

    for segment in snake:

        occupied.add(
            (
                int(segment.xcor()),
                int(segment.ycor())
            )
        )

    possible_positions = []

    for x in range(MIN_X, MAX_X + 1, GRID_SIZE):

        for y in range(MIN_Y, MAX_Y + 1, GRID_SIZE):

            if (x, y) not in occupied:

                possible_positions.append(
                    (x, y)
                )

    random.shuffle(possible_positions)

    for x, y in possible_positions[:number_of_obstacles]:

        obstacle = turtle.Turtle()

        obstacle.shape("square")
        obstacle.color("#64748b")

        obstacle.penup()
        obstacle.speed(0)

        obstacle.goto(x, y)

        obstacles.append(obstacle)

# ------------------------------------------
# COLLISION DETECTION
# ------------------------------------------

def check_collisions():

    # Wall collision
    if (
        head.xcor() < MIN_X
        or head.xcor() > MAX_X
        or head.ycor() < MIN_Y
        or head.ycor() > MAX_Y
    ):

        return True

    # Snake body collision
    for segment in snake:

        if head.distance(segment) < 10:
            return True

    # Obstacle collision
    for obstacle in obstacles:

        if head.distance(obstacle) < 10:
            return True

    return False

# ------------------------------------------
# FOOD COLLISION
# ------------------------------------------

def check_food():

    global score
    global high_score
    global level

    if head.distance(food) < 10:

        # Sound
        try:
            print("\a", end="", flush=True)
        except:
            pass

        # Points
        if food_is_golden:
            score += 30

        else:
            score += 10

        # Grow snake
        add_segment()

        # High score
        if score > high_score:

            high_score = score
            save_high_score()

        # Calculate level
        new_level = (score // 50) + 1

        if new_level > level:

            level = new_level

            create_obstacles()

        generate_food()

        update_score()

# ------------------------------------------
# GAME OVER
# ------------------------------------------

def end_game():

    global game_over
    global game_started

    game_over = True
    game_started = False

    show_message(
        "GAME OVER",
        f"Score: {score} | Press R to Restart"
    )

# ------------------------------------------
# START GAME
# ------------------------------------------

def start_game():

    global game_started
    global game_over
    global paused
    global direction
    global next_direction
    global score
    global level

    # Reset variables
    score = 0
    level = 1

    direction = "right"
    next_direction = "right"

    game_started = True
    game_over = False
    paused = False

    # Reset snake head
    head.goto(0, 0)

    # Remove snake body
    for segment in snake:
        segment.hideturtle()

    snake.clear()

    # Remove obstacles
    for obstacle in obstacles:
        obstacle.hideturtle()

    obstacles.clear()

    # Starting snake length
    for i in range(3):

        segment = turtle.Turtle()

        segment.shape("square")
        segment.color(SNAKE_BODY_COLOR)

        segment.penup()
        segment.speed(0)

        segment.goto(
            -GRID_SIZE * (i + 1),
            0
        )

        snake.append(segment)

    generate_food()

    update_score()

    clear_message()

# ------------------------------------------
# PAUSE GAME
# ------------------------------------------

def toggle_pause():

    global paused

    if not game_started:
        return

    paused = not paused

    if paused:

        show_message(
            "PAUSED",
            "Press SPACE to continue"
        )

    else:

        clear_message()

# ------------------------------------------
# KEYBOARD CONTROLS
# ------------------------------------------

screen.listen()

screen.onkeypress(go_up, "Up")
screen.onkeypress(go_down, "Down")
screen.onkeypress(go_left, "Left")
screen.onkeypress(go_right, "Right")

screen.onkeypress(go_up, "w")
screen.onkeypress(go_down, "s")
screen.onkeypress(go_left, "a")
screen.onkeypress(go_right, "d")

screen.onkeypress(toggle_pause, "space")

screen.onkeypress(start_game, "Return")
screen.onkeypress(start_game, "r")

# ------------------------------------------
# MAIN GAME LOOP
# ------------------------------------------

def game_loop():

    if game_started and not paused and not game_over:

        move_snake()

        if check_collisions():

            end_game()

        else:

            check_food()

    screen.update()

    # IMPORTANT:
    # Constant snake speed.
    # It NEVER increases with score or level.

    screen.ontimer(
        game_loop,
        SNAKE_SPEED
    )

# ------------------------------------------
# MAIN MENU
# ------------------------------------------

update_score()

show_message(
    "SNAKE DELUXE",
    "Press ENTER to Start"
)

screen.update()

# Start game loop
game_loop()

# Keep window open
screen.mainloop()
