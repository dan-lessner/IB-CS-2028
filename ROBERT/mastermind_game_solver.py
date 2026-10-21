import random

list_of_colours = ["red", "blue", "green", "yellow", "purple", "orange"]
amount_of_spaces = 5
amount_of_turns = 0
guess_correctness = []
hidden_combination_list = []
algorithm_runs = 0
amount_of_turns = 0

def random_combination(list_of_colours, amount_of_spaces, hidden_combination_list):
    for i in range(amount_of_spaces):
        hidden_combination_list.append(random.choice(list_of_colours))
    print(hidden_combination_list)

def answer_function(user_guess_list, hidden_combination_list):
    guess_correctness = []
    if user_guess_list == hidden_combination_list:
        print(user_guess_list)
        return "win"
    else:
        for x in range(amount_of_spaces):
            if user_guess_list[x] == hidden_combination_list[x]:
                print(f"Correct colour in space {x+1}")
                guess_correctness.append("black")
            elif user_guess_list[x] in hidden_combination_list:
                # check for if the colour is in the hidden combination but not in the right place
                # also now it says white for if a single colour is in the hidden combination
                # TODO: add an option that shows the user white a single time for each colour and if its in a black space then no white
                for user_guess_list[x] in hidden_combination_list:
                    # maybe add a dictionary where the key is the colour and the value is the number of times it appears in the hidden combination?
                    # or where key is the colour and value is the number of times it appears in the user's guess?
                    #
                    if colour_counter == 1:
                        print(f"Wrong place, right colour in space {x + 1}")
                        guess_correctness.append("white")
                    else:
                        print(f"wrong colour in space {x + 1}")
                        guess_correctness.append("blank")


    return guess_correctness

def algorithm_colour_fill():
    algorithm_guess = []
    algorithm_known = [0, 0, 0, 0, 0] # have these temp placeholders so we can directly change which space from 1 to 5 is what colour based on what we know
    # for each colour in the list of colours, try to fill all the 5 spaces with that colour
    for i in range(len(list_of_colours)):
        # every turn make the amount of turns larger by 1
        # for each space, add the current colour to the algorithm guess
        for j in range(amount_of_spaces):
            algorithm_guess.append(list_of_colours[i])

        # check if the algorithm guess is correct
        guess_correctness = answer_function(algorithm_guess, hidden_combination_list)
        print(guess_correctness)

        # check all the guess correctness places and check which ones are correct
        for x in range(len(guess_correctness)):
            # if the guess correctness is black, record the colour for being known
            if guess_correctness[x] == "black":
                # the positions that are black, record for being known
                algorithm_known[x] = list_of_colours[i]


        print(f"algorithm_known: {algorithm_known}")
        # reset the algorithm guess for another round
        algorithm_guess = []
        # return the final answer
    return answer_function(algorithm_known, hidden_combination_list) == "win"

def better_algorithm_colour_fill():
    algorithm_guess = []
    algorithm_known = [0, 0, 0, 0, 0] # make it so we can directly change which space from 1 to 5 is what colour based on what we know
    for i in range(len(list_of_colours)):
        for j in range(amount_of_spaces):
            algorithm_guess.append(list_of_colours[i])

        guess_correctness = answer_function(algorithm_guess, hidden_combination_list)
        print(guess_correctness)
        for x in range(len(guess_correctness)):
            if guess_correctness[x] == "black":
                algorithm_known[x] = list_of_colours[i]

        # TODO: somehow add the white to find an optimal strategy, where we start off with going through all the colours by
        #       first guessing all the colours and then using the white to find what colours it has.

        print(f"algorithm_known: {algorithm_known}")
        algorithm_guess = []
    return answer_function(algorithm_known, hidden_combination_list) == "win"

while True:
    user_guess_list = []
    for i in range(amount_of_spaces):
        user_guess = input("Enter your guess: ")
        if user_guess == "use algorithm": # Giving the algorithm ability to solve and play the game
            algorithm_colour_fill()
            # TODO: when algorithm has solved the puzzle, tell the user they have won and it should not continue onwards
            break

        user_guess_list.append(user_guess)
    answer_function(user_guess_list, hidden_combination_list)
    amount_of_turns = 0

# TODO: try to calculate the average number of turns it takes for the algorithm to solve the puzzle by repeating it many times
def algorithm_runs(algorithm_runs):
    amount_of_turns = 1
    for n in range(algorithm_runs):
        random_combination(list_of_colours, amount_of_spaces)
        algorithm_colour_fill(algorithm_guess, algorithm_known, list_of_colours)
        answer_function(user_guess_list, hidden_combination_list)
    average = amount_of_turns / algorithm_runs
    print(f"Average number of turns: {average}")
