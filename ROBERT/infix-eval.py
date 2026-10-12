# input function to take in a string of the expression
expression = input("Enter an expression: ")
tokens = []
# a function that divides the string into "tokens" - operators and operants
def tokenize(expression):
    expression_split = []
    tokens_divided = expression.split()
    for token in tokens_divided:
        expression_split.append(token)
    return expression_split

def evaluation(tokens):
    evaluation_sum_open_brackets(tokens)
    evaluation_exp(tokens)
    evaluation_mul_div(tokens)
    evaluation_sum_dif(tokens)

    return tokens

def evaluation_exp(tokens):
    for index in range(len(tokens) -1, -1, -1):
        value = tokens[index]
        if value == "^":
            tokens[index] = int(tokens[index-1]) * int(tokens[index+1])
            tokens.pop(index-1)
            tokens.pop(index)
    return tokens

def evaluation_mul_div(tokens):
    for index in range(len(tokens) -1, -1, -1):
        value = tokens[index]
        if value == "*":
            tokens[index] = int(tokens[index-1]) * int(tokens[index+1])
            tokens.pop(index-1)
            tokens.pop(index)
        if value == "/":
            tokens[index] = int(tokens[index-1]) / int(tokens[index+1])
            tokens.pop(index-1)
            tokens.pop(index)
    return tokens

def evaluation_sum_dif(tokens):
    for index in range(len(tokens) -1, -1, -1):
        value = tokens[index]
        if value == "+":
            tokens[index] = int(tokens[index-1]) + int(tokens[index+1])
            tokens.pop(index-1)
            tokens.pop(index)
        if value == "-":
            tokens[index] = int(tokens[index-1]) - int(tokens[index+1])
            tokens.pop(index-1)
            tokens.pop(index)
    return tokens

def evaluation_sum_open_brackets(tokens):
    for index in range(len(tokens) -1, -1, -1):
        value = tokens[index]
        if value == ")":
            start_index = index
            end_index = 0
            copy_list = tokens
            sub_bracket_list = []
            for index in range(len(tokens) -1, -1, -1):
                value = tokens[index]
                sub_bracket_list.append(value)
                if value == ")":

                if value == "(":
                    end_index = index
    return tokens

def evaluation_sub_brackets(tokens):
    evaluation(tokens)

print(evaluation(tokenize(expression)))

# a function that evaluates the expression
# def evaluation(tokens):
  #  for token in tokens:

        # when operant == (
        # create a list of all the operants until there is )
        # calculate the inside the same way as this netire function (call the function? however how to get back to this function? )
        # perhaps create another function just for the inside where it breaks when there is )

# lets create a semi-complicated example:
# 5 + 6 * (5 + 5) + 5
# how it should be calculated:
#   first do the brackets
#       5 + 5 = 10
#   then multiply
#       6 * 10 = 60
#   then sum again
#       60 + 5 = 65
#   and add the last sum
#       +5 = 70
#
#   what about creating a stakc
#   how it would look:
#   stack = [5, +, ), 5, +, 5, (, *, 6, +, 5]
#
#   or if we make two stakcs
#   stacks_operators = [+, ), +, (, *, +]
#   stack_operants = 5, 5, 5, 6, 5
#
#
#
#   create a function where:
#       we go through all the operators and find if there are brackets,
#           we call a function very similar to this one so:
#           we do all the operators and operants untill there are another brackets:
#       we do PEMDAS
#           go through all the operators and find ^
#           go through all the operators and find * or /
#               do the operation
#           then go through all the operators and find + or -
#
#   but how?
#       lets have a simple very simple examples:
#           1 + 2 * 3 = 1 + 6 = 7
#           2 * 3 + 1 = 7
#           stacks would look followingly:
#               stack1: [1, +, 2, *, 3]
#               stack2: [2, *, 3, +, 1]
#
#                 or
#               stack_oper1: [+, *]
#               stack_digits1: [1, 2, 3]
#               stack_oper1: [*, +]
#               stack_digits2: [2, 3, 1]
def infix_eval_md(tokens):
    for i in tokens:
        if tokens[i] == "*":
            tokens[i] = tokens[i-1] * tokens[i+1]
        if tokens[i] == "/":
            tokens[i] = tokens[i-1] / tokens[i+1]
        return tokens
