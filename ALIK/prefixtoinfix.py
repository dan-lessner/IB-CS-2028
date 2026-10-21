def prefix_to_infix(prefix_expr):
    operators = {'+', '-', '*', '/', '^'} 
    stack = []
    tokens = prefix_expr.split() if ' ' in prefix_expr else list(prefix_expr)
    for token in reversed(tokens):
        if token not in operators:
            stack.append(token)
        else:
            if len(stack) < 2:
                return "Invalid"
            operand1 = stack.pop()
            operand2 = stack.pop()
            infix_sub_expr = f"({operand1} {token} {operand2})"
            stack.append(infix_sub_expr)
    return stack[0] if stack else ""

if __name__ == "__main__":
    prefix = "* + A B - C D"
    infix = prefix_to_infix(prefix)
    print(f"Prefix Expression: {prefix}")
    print(f"Infix Expression:  {infix}")
