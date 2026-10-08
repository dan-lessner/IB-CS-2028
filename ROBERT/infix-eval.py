# input function to take in a string of the expression
expression = input("Enter an expression: ")

# a function that divides the string into "tokens" - operators and operants
def tokenize(expression):
    tokens = expression.split()
    return tokens

print(tokenize(expression))

# a function that evaluates the expression
def evaluation(tokens)
    for token in tokens:
