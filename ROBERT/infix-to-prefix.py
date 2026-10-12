expression = input("Enter an expression: ")
tokens = []

def tokenize(equation):
    expression_split = []
    tokens_divided = equation.split()
    for token in tokens_divided:
        expression_split.append(token)
    return expression_split

# if we have an example of
# 1 * 1
# stack = [1, *, 1]
# in prefix it should be
# * 1 1
#
# 1 + 1
# + 1 1
# stack = [1 , +, 1]
# 3 * (1 + 1)
# * 3 + 1 1
#
# stack = [1, *, 2, +, 3]
# infix = 1 * 2 + 3
#   current algorithm
#       * 1 2 + 3 (first step)
#       second step
#       * 1 + 2 3
#
# prefix = + * 1 2 3

def rewrite(tokens):
    for index, value in enumerate(tokens):
        if value in ["*", "/", "+", "-", "^"]:
            tokens[index-1], tokens[index] = tokens[index], tokens[index-1]
        if value in [")", "("]:
            tokens.pop(index)



    for index, value in enumerate(tokens):
        if not tokens[index-1].isdigit() and tokens[index].isdigit() and not tokens[index+1].isdigit():
            tokens[index-1], tokens[index], tokens[index+1] = tokens[index+1], tokens[index-1], tokens[index]
    return tokens

print(rewrite(tokenize(expression)))
