// Define suits and ranks
const SUITS = ['♥', '♦', '♣', '♠']; // Hearts, Diamonds, Clubs, Spades
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']; // T for Ten

// Map ranks to values for hand evaluation (can be expanded later)
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

class Card {
  constructor(suit, rank) {
    if (!SUITS.includes(suit) || !RANKS.includes(rank)) {
      throw new Error(`Invalid card: ${rank}${suit}`);
    }
    this.suit = suit;
    this.rank = rank;
    this.value = RANK_VALUES[rank];
  }

  toString() {
    return `${this.rank}${this.suit}`;
  }

  // A simple representation for easier processing if needed
  get simpleString() {
    return `${this.rank}${this.suit[0]}`; // e.g., AH for Ace of Hearts, Td for Ten of Diamonds
  }
}

module.exports = { Card, SUITS, RANKS, RANK_VALUES };
