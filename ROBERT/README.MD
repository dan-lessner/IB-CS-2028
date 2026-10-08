If we imagine each combination as a node in a tree, the total number of the secret combinations is 9^5 = 59 049

Can there be a strategy that can solve the game under 10 turns?
  Obviously yes as the total number of colours is less than 10

  For the strategy where you go colour one by one where you will it fully with your colours on each turn then:

  probability of a certain position having a certain colour is:
  P(probability) = t/9, where t is the number of the colour we are on
  for all 5 positions it is:
  P(probability) = (t/9)^5

  P(our random colour > t) = 1 - (t/9)^5

Worst case scenario: 
  The worst case scenario is going through all the colours and finding the combination at the complete end
  This would take n (where n is the number of colours) turns

Average case scenario:
  expected_amount_of_turns = t=0 to 7 Σ(1 - (t/9)^5)
  = 8 - (0^5 + 1^5 + 2^5 + 3^5 + 4^5 + 5^5 + 6^5 + 7^5)/9^5 = 8 - 0.8888888888888888 = 7.509
