prefix = ["*","-","A","B","+","C","D"]
print(prefix)

def swap(lst, index0, index1, index2, index3, index4, index5):
    lst[index0], lst[index1], lst[index2], lst[index3], lst[index4], lst[index5] = lst[index5], lst[index4], lst[index3], lst[index2], lst[index1], lst[index0]

postfix_stack = []

while len(prefix) != 0:
    postfix_stack.append(prefix[-1])
    prefix.pop(-1)
    
swap(postfix_stack, 0, 1, 3, 4, 2, 5)
print(postfix_stack)

