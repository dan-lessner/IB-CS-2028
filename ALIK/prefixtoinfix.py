
def prefix_infix(prefix):
    stack = []
    for a in reversed(prefix):
        if a in ["+", "-", "*", "/", "^"]:
            opt1 = stack.pop()
            opt2 = stack.pop()
            sub_expr = f"({opt1} {a} {opt2})"
            stack.append(sub_expr)
        else:
            stack.append(a)
    if len(stack) == 1:
        return stack[0]
    else:
        return "Error, invalid structure"
prefix_imp = input().split()
print(prefix_infix(prefix_imp))


def prefix_infix(prefix_list):
    stack = []
    
    for a in reversed(prefix_list):
        if a in ["+", "-", "*", "/", "^"]:
            # SAFE CHECK: Check if we have at least 2 items to pop
            if len(stack) < 2:
                print(f"\n❌ Error broken at operator: '{a}'")
                print(f"Current Stack state: {stack}")
                return "Error: Invalid prefix expression structure (not enough operands)."
                
            opt1 = stack.pop()
            opt2 = stack.pop()
            sub_expr = f"({opt1} {a} {opt2})"
            stack.append(sub_expr)
        else:
            stack.append(a)
            
    if len(stack) == 1:
        return stack[0]
    else:
        print(f"\n❌ Error: Leftover items on stack: {stack}")
        return "Error: Invalid prefix expression structure (too many operands)."

# Take input and split by spaces
prefix_imp = input("Enter prefix expression: ").split()
print("\nResult:")
print(prefix_infix(prefix_imp))