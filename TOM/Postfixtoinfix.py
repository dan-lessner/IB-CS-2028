expression = (input("enter a postfix expression:"))
tokens = expression.split()
stack = []
for token in tokens:
        if token in ("+", "-", "*", "/"):
            right = stack.pop()
            left = stack.pop()
            expr = f"({left} {token} {right})"
            stack.append(expr)
        else:
            stack.append(token)
            
print("Result: ", stack[0]) 