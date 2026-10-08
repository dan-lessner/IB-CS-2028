# make an algorithm that makes gray code - binary where it changes just one digit at a time
# so for example, 001 -> 011 -> 111 -> 110 -> 100
# we need to start with all zeros and then change one digit at a time - we need to comeback to all 0s
# we still need to go through all the combinations of 0s and 1s

# here the option of 010 and 101 is missing
#
#
# 000
# 001
# 011
# 010
# 110
# 100
# 101
# 111
#
#
# got an idea to write a function that takes in the position
# changes the position
# calls itself while adding to the position 1
# lets first create binary code that goes through all the combinations of 0s and 1s

number_of_bits = int(input("Enter the number of bits: "))
binary_list = [0] * number_of_bits
binary = [0, 1]
n = len(binary_list)

def generate_binary(binary_list, position):
    if position == n:
        print(binary_list)
        return
    while position < n:
        binary_list[position] = binary[0]
        binary_list[position] = binary[1]
        position += 1
    return binary_list

print(generate_binary(binary_list, 0))
