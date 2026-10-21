def tokenize(expression):
    #Split an expression into numbers, operators, and parentheses.
    tokens = []
    index = 0

    while index < len(expression):
        character = expression[index]
        if character.isspace():
            index += 1
        elif character.isdecimal() or character == ".":
            start = index
            while index < len(expression):
                character = expression[index]
                if not (character.isdecimal() or character == "."):
                    break
                index += 1

            number = expression[start:index]
            if number.count(".") > 1 or not number.replace(".", "").isdecimal():
                raise ValueError("Invalid number: " + number)
            tokens.append(number)
        elif character in "+-*/()":
            tokens.append(character)
            index += 1
        else:
            raise ValueError("Unsupported character: " + character)

    return tokens


def apply_operator(values, operators):
    #Calculate with the last operator and put the result back.
    operator = operators.pop()

    if operator == "u-":
        values[-1] = -values[-1]
        return
    if operator == "u+":
        return

    # The right-hand number is on top of the stack.
    right = values.pop()
    left = values.pop()

    if operator == "+":
        result = left + right
    elif operator == "-":
        result = left - right
    elif operator == "*":
        result = left * right
    else:
        result = left / right

    values.append(result)


def evaluate_infix(expression):
    values = []
    operators = []
    precedence = {"+": 1, "-": 1, "*": 2, "/": 2, "u+": 3, "u-": 3}
    expecting_number = True

    for token in tokenize(expression):
        if token[0].isdecimal() or token[0] == ".":
            if not expecting_number:
                raise ValueError("An operator is required between numbers.")
            if "." in token:
                values.append(float(token))
            else:
                values.append(int(token))
            expecting_number = False
        elif token == "(":
            if not expecting_number:
                raise ValueError("An operator is required before '('.")
            operators.append(token)
        elif token == ")":
            if expecting_number:
                raise ValueError("Missing number before ')'.")
            while operators and operators[-1] != "(":
                apply_operator(values, operators)
            if not operators:
                raise ValueError("Unmatched ')'.")
            operators.pop()
        elif expecting_number:
            if token not in ("+", "-"):
                raise ValueError("Missing number before an operator.")
            # A sign before a number is unary, such as the minus in -3.
            operators.append("u" + token)
        else:
            while operators and operators[-1] != "(":
                if precedence[operators[-1]] < precedence[token]:
                    break
                apply_operator(values, operators)
            operators.append(token)
            expecting_number = True

    if expecting_number:
        raise ValueError("The expression is empty or ends with an operator.")
    while operators:
        if operators[-1] == "(":
            raise ValueError("Unmatched '('.")
        apply_operator(values, operators)

    return values[0]


if __name__ == "__main__":
    expression = input("Enter a numerical infix expression: ")
    try:
        print("Result:", evaluate_infix(expression))
    except (ValueError, ZeroDivisionError, OverflowError) as error:
        print("Error:", error)

# should be lienar - O(n)