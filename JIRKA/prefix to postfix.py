prefix = ["*","-","A","B","+","C","D"]
print("prefix:", prefix)
postfix_stack = []
operators = {"*","-","+","/","^"}   #opx

for token in reversed(prefix):
    if token in operators:
        op1 = postfix_stack.pop()
        op2 = postfix_stack.pop()
        combine = op1 + op2 + token
        postfix_stack.append(combine)
    else:
        postfix_stack.append(token)
    
print("postfix:", postfix_stack)
