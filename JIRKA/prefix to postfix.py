prefix = ["+","-","A","B","+","C","D"]
print(prefix)

postfix_stack = []

while len(prefix) != 0:
    postfix_stack.append(prefix[-1])
    prefix.pop(-1)
    print(postfix_stack)