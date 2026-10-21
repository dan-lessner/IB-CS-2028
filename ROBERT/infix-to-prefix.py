expression = input("Enter an expression: ")


def tokenize(equation):
    # Keep each number, operator, and bracket as a separate token.
    return equation.split()


def rewrite(tokens):
    operators = []
    expressions = []

    precedence = {
        "+": 1,
        "-": 1,
        "*": 2,
        "/": 2,
        "^": 3,
    }

    def apply_operator():
        if len(expressions) < 2:
            raise ValueError("An operator is missing an operand.")

        operator = operators.pop()
        right_expression = expressions.pop()
        left_expression = expressions.pop()

        # Prefix order is: operator, left side, right side.
        expressions.append(
            [operator] + left_expression + right_expression
        )

    for token in tokens:
        if token == "(":
            operators.append(token)

        elif token == ")":
            while operators and operators[-1] != "(":
                apply_operator()

            if not operators:
                raise ValueError("A closing bracket has no opening bracket.")

            operators.pop()  # Remove the matching "("

        elif token in precedence:
            while operators and operators[-1] != "(":
                top_operator = operators[-1]

                higher_precedence = (
                    precedence[top_operator] > precedence[token]
                )

                same_precedence_left_associative = (
                    precedence[top_operator] == precedence[token]
                    and token != "^"
                )

                if higher_precedence or same_precedence_left_associative:
                    apply_operator()
                else:
                    break

            operators.append(token)

        else:
            # Numbers and names are treated as operands.
            expressions.append([token])

    while operators:
        if operators[-1] == "(":
            raise ValueError("An opening bracket has no closing bracket.")

        apply_operator()

    if len(expressions) != 1:
        raise ValueError("The expression is incomplete or has extra operands.")

    return expressions[0]


print(" ".join(rewrite(tokenize(expression))))
