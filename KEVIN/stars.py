def stars1(n):
    for i in range(n):
        print("*")

#stars = n
#O(n) - it is linear because the number of stars printed is directly proportional to the input n.

def stars2(n):
    for i in range(n):
        print("*")
    for i in range(n):
        print("*")

# satrs = 2n
#O(n) - because it dosent care about constant multipliers

def stars3(n):
    for i in range(n):
        print("*")
    for i in range(5):
        print("*")

# stars = n + 5
# O(n) - because it dosent care about constant multipliers

def stars4(n):
    for i in range(n):
        for j in range(n):
            print("*")

# stars = n^2
# O(n^2) - because the number of stars printed is proportional to the square of the input n.

def stars5(n) :
  i = 1
  while i*i < n :
    print ("*")
    i = i+1

# stars = sqrt(n)
# O(sqrt(n)) - because the number of stars printed is proportional to the square root of the input n.

def stars6 ( N ) :
  for i in range (N) :
    for j in range (N) :
      print ("*")
    print ("*")

# stars = N^2 + N
# O(N^2) - because the number of stars printed is proportional to the square of the input N, and we ignore the linear term in Big O notation.

def stars7(n):
    for i in range(1, n + 1):
        for j in range(i):
            print("*")
# stars = n(n+1)/2
# O(n^2) - because the number of stars printed is proportional to the square of the input n, and we ignore the constant factor in Big O notation.

def stars8(n):
    print("*")
    if n > 1 :
        for j in range(n):
           stars8(n-1)
# stars = n!
# O(n!) - because the number of stars printed is proportional to the factorial of the input n, and we ignore the constant factor in Big O notation.

def stars9 ( n ) :
  while n > 1 :
    print ("*")
    n = n // 2

def stars10(n):
    if n < 2:
        print("*")
        return
    stars10(n-1)
    stars10(n-1)
    stars10(n-1)

def stars11(n):
    if n % 2 == 0:
        for i in range(n // 2):
            print("*")
    else:
        for i in range(3 * n):
            print("*")

def stars12(n):
    s = 1
    for i in range(n):
        s *= 2
    for j in range(s):
        print("*")

def stars13(n):
    r = n % 5
    s = n + r * r
    for i in range(s):
        print("*")
