def prefix_to_infix(prefix_expr):
    operators = {'+', '-', '*', '/', '^'}
    stack = []
    
    # Step 3: Scan the expression from right to left (reverse order)
    # Splitting by spaces allows for multi-character operands (like numbers)
    # If it's a tight string like "*+AB", we can iterate character by character
    tokens = prefix_expr.split() if ' ' in prefix_expr else list(prefix_expr)
    
    for token in reversed(tokens):
        # If token is an operand, push it to the stack
        if token not in operators:
            stack.append(token)

        else:
            operand1 = stack.pop()
            operand2 = stack.pop()
            # Form the infix sub-expression with parentheses
            infix_sub_expr = f"({operand1} {token} {operand2})"
            stack.append(infix_sub_expr)
            
    #The remaining item in the stack is the final infix expression
    return stack[0]

