# exploitation - with heuristics trying to predict where a minimum could be etc.
# vs
# exploration - going around the function with the slopes
# random seeds

import matplotlib.pyplot as plt




error_list = []
# initialize the learning rate
learning_rate = 0.01

points_x = [-2, -1, 0, 1, 2]

# As here there is a single minimum, we can create two points where we graduallz go closer with time and approach each other untill the difference changes direction
#
def show_line(points_x, points_y, m, b):
    predicted_y = [x ** 2 + x for x in points_x]

    plt.cla()  # clear the previous drawing
    plt.plot(points_x, predicted_y, color="red", label="Current line")
    plt.xlim(0, 25)
    plt.ylim(0, 100)
    plt.xlabel("x")
    plt.ylabel("y")
    plt.legend()
    plt.pause(0.2)

plt.ion()
plt.ioff()
plt.show()
