const { Card, SUITS, RANKS } = require('./card');

class Deck {
  constructor() {
    this.cards = [];
    this.reset();
    this.shuffle();
  }

  // Initialize or reset the deck to a standard 52-card set
  reset() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(new Card(suit, rank));
      }
    }
  }

  // Shuffle the deck (Fisher-Yates shuffle algorithm)
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  // Deal a single card from the top of the deck
  dealOne() {
    if (this.cards.length === 0) {
      throw new Error('Deck is empty. Cannot deal.');
    }
    return this.cards.pop();
  }

  // Deal a specified number of cards
  deal(numCards) {
    if (numCards > this.cards.length) {
      throw new Error(`Cannot deal ${numCards} cards. Only ${this.cards.length} remaining.`);
    }
    const dealtCards = [];
    for (let i = 0; i < numCards; i++) {
      dealtCards.push(this.dealOne());
    }
    return dealtCards;
  }

  // Get the current number of cards in the deck
  get count() {
    return this.cards.length;
  }
}

module.exports = { Deck };
