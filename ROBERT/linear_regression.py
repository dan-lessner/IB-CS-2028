import matplotlib.pyplot as plt
points_x = list(range(1, 21))
points_y = [96, 100, 85, 94, 78, 85, 65, 75, 63, 72,
            52, 58, 42, 54, 37, 44, 27, 34, 24, 29]
error_list = []
# initialize the learning rate
learning_rate = 0.01

# our results that we should get!!!
#
# formula is: y = mx + b
# b = intercept
# m = slope
# y = predicted value
#
def show_line(points_x, points_y, m, b):
    predicted_y = [m * x + b for x in points_x]

    plt.cla()  # clear the previous drawing
    plt.scatter(points_x, points_y, label="Actual points")
    plt.plot(points_x, predicted_y, color="red", label="Current line")
    plt.xlim(0, 25)
    plt.ylim(0, 100)
    plt.xlabel("x")
    plt.ylabel("y")
    plt.legend()
    plt.pause(0.2)

def error_calculation(b, m, points_x, points_y):
    # lets calculate the error for the values
    error = 0
    for n in range(len(points_x)):
        y_guess = m * points_x[n] + b
        difference = y_guess - points_y[n]
        error += difference ** 2
    return error

def linear_regression(points_x, points_y, learning_rate):
    n = len(points_x)
    # setup, initialize the intercept and slope to 0
    b = 0
    m = 0
    # creating the first line
    # first lets assume the intercept is 0
    # lets calculate the slope
    # the slope is (y2 - y1) / (x2 - x1)
    m = (points_y[n - 1] - points_y[0]) / (points_x[n - 1] - points_x[0])
    b = 0
    y_guess = 0
    show_line(points_x, points_y, m, b)

    b, m = linear_adjustment(b, m, points_x, points_y, learning_rate)


    # put a guess so maybe a line from the first point to the second point
    # how to create such a line???
    # then calculate how off we are
    # then adjust the line by a bit to get closer
    # first change the intercept, find a local minimum (repeat until convergence)
    # then change the slope, find a local minimum (repeat until convergence)
    # try again

def linear_adjustment(b, m, points_x, points_y, learning_rate):
    for i in range(100000000):
        error = error_calculation(b, m, points_x, points_y)
        error_list.append(error)
        b_old = b
        b = intercept_adjustment(b, m, points_x, points_y, learning_rate)
        m_old = m
        m = slope_adjustment(b, m, points_x, points_y, learning_rate)
        if b == b_old and m == m_old and learning_rate > 0.0001:
            learning_rate *= 0.1
        elif b == b_old and m == m_old and learning_rate <= 0.0001:
            break
        if error_calculation(b, m, points_x, points_y) < 0.0001:
            break
        if i % 100 == 0:
            print(i, "b:", b, "m:", m, "error:", error_list[-1])
            show_line(points_x, points_y, m, b)

    # as a last resort if the minimum is not yet found
    print("b:", b, "m:", m, "error:", error_list[-1])
    show_line(points_x, points_y, m, b)
    return b, m

    #IDEA!!!!
    # what if we create options:
        # current_b = b
        # candidate_b_positive = b + learning_rate * learning_rate_direction
        # candidate_b_negative = b + learning_rate * learning_rate_direction * (-1)
        # then for options b we calculate which one has the smallest error
        # we then update b to the candidate with the smallest error
        # if current_b has the smallest error, we do the same with m
        # if current_m has the smallest error, we do the same with b
        # if current_m AND current_b have the smallest error, we decrease learning_rate by a factor of 10
        # up to a point of course
def intercept_adjustment(b, m, points_x, points_y, learning_rate):

    b_list = []
    b_error_list = []
    current_b = b
    candidate_b_positive = b + learning_rate
    candidate_b_negative = b - learning_rate
    b_list.append(current_b)
    b_list.append(candidate_b_positive)
    b_list.append(candidate_b_negative)
    for i in range(len(b_list)):
        b_error_list.append(error_calculation(b_list[i], m, points_x, points_y))
    if b_list[b_error_list.index(min(b_error_list))] == current_b:
        error_list.append(b_error_list[b_error_list.index(min(b_error_list))])
        return(current_b)
    else:
        b = b_list[b_error_list.index(min(b_error_list))]
        error_list.append(b_error_list[b_error_list.index(min(b_error_list))])
        return(b)

        # current issue, it will go into an infinite loop
        # when b is optimal, it calls the function m to adjust the slope
        # when m is optimal, it calls the function b to adjust the intercept
        # if both are optimal they just keep calling themselves
        # now, how to prevent this?
        # perhaps check if the last result and the previous result are the same for m and b
        # if yes, then we have found the optimal values and can continue onwards with the next iteration, perhaps by
        # decreasing the learning rate

def slope_adjustment(b, m, points_x, points_y, learning_rate):
    m_result_list = []
    m_result_list.append(m)
    m_list = []
    m_error_list = []
    current_m = m
    candidate_m_positive = m + learning_rate
    candidate_m_negative = m - learning_rate
    m_list.append(current_m)
    m_list.append(candidate_m_positive)
    m_list.append(candidate_m_negative)
    for i in range(len(m_list)):
        m_error_list.append(error_calculation(b, m_list[i], points_x, points_y))
    if m_list[m_error_list.index(min(m_error_list))] == current_m:
        error_list.append(m_error_list[m_error_list.index(min(m_error_list))])
        return(current_m)
    else:
        m = m_list[m_error_list.index(min(m_error_list))]
        error_list.append(m_error_list[m_error_list.index(min(m_error_list))])
        return(m)

plt.ion()
linear_regression(points_x, points_y, learning_rate)
plt.ioff()
plt.show()
