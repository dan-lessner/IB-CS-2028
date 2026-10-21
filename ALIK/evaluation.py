def evaluate_prefix(expression):
    stack = []
    tokens = expression.split()
   
    
    for token in reversed(tokens):
        if token.isdigit() or (token.startswith('-') and token[1:].isdigit()):
            stack.append(int(token))
        else:
            operand1 = stack.pop()
            operand2 = stack.pop()
            
            if token == '+':
                result = operand1 + operand2
            elif token == '-':
                result = operand1 - operand2
            elif token == '*':
                result = operand1 * operand2
            elif token == '/':
                result = operand1 // operand2 
            stack.append(result)

  
    return stack[0]
expr = input("Enter expression: ")
print(evaluate_prefix(expr))