# Is it better to use a two-way or three-way search? This is a simple test to compare the two methods.

def SearchThreeway (Co, Kde) :
    Count = 0
    R = len(Kde) - 1
    L = 0
    while R != L: 
        Count += 1
        M = (R + L) / 2
        Pokus = Kde[int(M)]
        if Pokus == Co:
            break
        elif Pokus > Co:
            R = M
        else:
            L = M
    return Count

# implement this function to perform a two-way search, similar to the three-way search above
def SearchTwoway (Co, Kde) :
    return 0

# testing data
Boxes = [145, 687, 58, 68, 278, 149, 296, 382, 398, 426, 827, 654, 257, 12, 16, 8, 147, 1028, 283, 647, 2, 48, 12]
Boxes.sort()  # sort the boxes for binary search

# uncomment when you want to run more boxes:
# MaxSize = 10000000
# Boxes = list(range(MaxSize))


# test all boxes, provide average count 
Total = 0
Size = len(Boxes)
for Trial in Boxes[:Size] :
    Total += SearchThreeway(Trial,Boxes[:Size])

print(Size, Total/Size)