a = int(input("Enter a: "))
b = int(input("Enter b: "))
c = int(input("Enter c: "))

input_letters = {"a": 0, "b": 0, "c": 0}
amount_of_variables = 3
options = [0, 1]
result_list = []
result = 0

def binary_function(a, b, c):
    if a > c or c > a or (a != c and b == 1) or (b == 1 and a == 1):
        return 1
    else:
        return 0

for i in options:
    input_letters["a"] = i
    for j in options:
        input_letters["b"] = j
        for k in options:
            input_letters["c"] = k
            print(input_letters)
            result_list.append(binary_function(**input_letters))
print(result_list)



# a b c   f(a, b, c)
# 0 0 0   0
# 0 0 1   1
# 0 1 0   0
# 0 1 1   1
# 1 0 0   1
# 1 0 1   0
# 1 1 0   1
# 1 1 1   1
