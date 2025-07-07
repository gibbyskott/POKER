const { Deck } = require('./deck');

// For a 6-max table
const POSITIONS_6_MAX = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
const DEFAULT_STACK_SIZE = 100; // Default stack size in big blinds
const PREFLOP_RAISE_SIZE = 3; // Example preflop raise size for simplified flop scenario
const FLOP_CBET_SIZE = 4; // Example flop c-bet size for simplified turn scenario
const TURN_BARREL_SIZE = 8; // Example turn barrel size for simplified river scenario


class ScenarioGenerator {
  constructor(numPlayers = 6) {
    if (numPlayers !== 6) {
      throw new Error('Currently only supports 6-max scenarios.');
    }
    this.numPlayers = numPlayers;
    this.positions = POSITIONS_6_MAX;
    this.deck = new Deck();
  }

  generatePreflopScenario() {
    this.deck.reset();
    this.deck.shuffle();

    const heroPositionIndex = Math.floor(Math.random() * this.numPlayers);
    const heroPosition = this.positions[heroPositionIndex];
    const heroHoleCards = this.deck.deal(2).map(card => card.toString());

    const stacks = {};
    this.positions.forEach(pos => {
      stacks[pos] = DEFAULT_STACK_SIZE;
    });

    let actionHistory = [];
    let currentPot = 1.5; // SB (0.5) + BB (1)

    const actingOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    const heroOrderIndex = actingOrder.indexOf(heroPosition);

    actionHistory.push({ player: 'SB', action: 'posts_sb', amount: 0.5 });
    actionHistory.push({ player: 'BB', action: 'posts_bb', amount: 1.0 });

    for (let i = 0; i < heroOrderIndex; i++) {
        const player = actingOrder[i];
        if (player !== 'SB' && player !== 'BB') {
            actionHistory.push({ player: player, action: 'fold' });
        }
    }

    return {
      scenarioType: 'preflop',
      numPlayers: this.numPlayers,
      heroPosition,
      heroHoleCards,
      stacks,
      communityCards: [],
      pot: currentPot,
      actionHistory,
      nextToAct: heroPosition,
    };
  }

  generateFlopScenario() {
    this.deck.reset();
    this.deck.shuffle();

    const heroPosition = 'BTN';
    const villainPosition = 'BB';

    const heroHoleCards = this.deck.deal(2).map(card => card.toString());
    const villainHoleCards = this.deck.deal(2).map(card => card.toString());

    const initialStacks = {};
    this.positions.forEach(pos => {
      initialStacks[pos] = DEFAULT_STACK_SIZE;
    });

    const preflopActionHistory = [
      { player: 'SB', action: 'posts_sb', amount: 0.5 },
      { player: 'BB', action: 'posts_bb', amount: 1.0 },
      { player: 'UTG', action: 'fold' }, { player: 'MP', action: 'fold' }, { player: 'CO', action: 'fold' },
      { player: heroPosition, action: 'raise', amount: PREFLOP_RAISE_SIZE },
      { player: 'SB', action: 'fold' },
      { player: villainPosition, action: 'call', amount: PREFLOP_RAISE_SIZE - 1 },
    ];

    let pot = 0.5 + PREFLOP_RAISE_SIZE + (PREFLOP_RAISE_SIZE -1);

    const stacksAfterPreflop = {...initialStacks};
    stacksAfterPreflop[heroPosition] -= PREFLOP_RAISE_SIZE;
    stacksAfterPreflop[villainPosition] -= PREFLOP_RAISE_SIZE; // Total investment

    this.deck.dealOne(); // Burn card
    const flopCards = this.deck.deal(3).map(card => card.toString());
    const nextToActOnFlop = villainPosition;

    return {
      scenarioType: 'flop',
      numPlayers: 2,
      heroPosition,
      heroHoleCards,
      villainInfo: { position: villainPosition, holeCards: villainHoleCards },
      stacks: stacksAfterPreflop,
      communityCards: flopCards,
      pot,
      actionHistory: preflopActionHistory,
      nextToAct: nextToActOnFlop,
    };
  }

  generateTurnScenario() {
    // Start from a flop scenario state (BTN PFR vs BB Caller)
    // For simplicity, assume fixed flop action: BB checks, BTN c-bets, BB calls
    const flopScenario = this.generateFlopScenario(); // Re-use to get consistent pre-flop and flop cards

    let currentPot = flopScenario.pot;
    const currentStacks = {...flopScenario.stacks};
    let turnActionHistory = [...flopScenario.actionHistory];

    // Fixed flop actions:
    turnActionHistory.push({ street: 'flop', player: flopScenario.villainInfo.position, action: 'check' });
    turnActionHistory.push({ street: 'flop', player: flopScenario.heroPosition, action: 'bet', amount: FLOP_CBET_SIZE });
    turnActionHistory.push({ street: 'flop', player: flopScenario.villainInfo.position, action: 'call', amount: FLOP_CBET_SIZE });

    currentPot += (FLOP_CBET_SIZE * 2);
    currentStacks[flopScenario.heroPosition] -= FLOP_CBET_SIZE;
    currentStacks[flopScenario.villainInfo.position] -= FLOP_CBET_SIZE;

    // Deal turn card
    this.deck.dealOne(); // Burn card
    const turnCard = this.deck.dealOne().toString();
    const communityCardsWithTurn = [...flopScenario.communityCards, turnCard];

    const nextToActOnTurn = flopScenario.villainInfo.position; // BB is OOP

    return {
      ...flopScenario, // Spread basic info like players, positions, hole cards
      scenarioType: 'turn',
      stacks: currentStacks,
      communityCards: communityCardsWithTurn,
      pot: currentPot,
      actionHistory: turnActionHistory, // Now includes flop actions
      nextToAct: nextToActOnTurn,
    };
  }

    generateRiverScenario() {
    // Start from a turn scenario state
    // Assume fixed turn action: BB checks, BTN barrels, BB calls
    const turnScenario = this.generateTurnScenario();

    let currentPot = turnScenario.pot;
    const currentStacks = {...turnScenario.stacks};
    let riverActionHistory = [...turnScenario.actionHistory];

    // Fixed turn actions:
    riverActionHistory.push({ street: 'turn', player: turnScenario.villainInfo.position, action: 'check' });
    riverActionHistory.push({ street: 'turn', player: turnScenario.heroPosition, action: 'bet', amount: TURN_BARREL_SIZE });
    riverActionHistory.push({ street: 'turn', player: turnScenario.villainInfo.position, action: 'call', amount: TURN_BARREL_SIZE });

    currentPot += (TURN_BARREL_SIZE * 2);
    currentStacks[turnScenario.heroPosition] -= TURN_BARREL_SIZE;
    currentStacks[turnScenario.villainInfo.position] -= TURN_BARREL_SIZE;

    // Deal river card
    this.deck.dealOne(); // Burn card
    const riverCard = this.deck.dealOne().toString();
    const communityCardsWithRiver = [...turnScenario.communityCards, riverCard];

    const nextToActOnRiver = turnScenario.villainInfo.position; // BB is OOP

    return {
      ...turnScenario,
      scenarioType: 'river',
      stacks: currentStacks,
      communityCards: communityCardsWithRiver,
      pot: currentPot,
      actionHistory: riverActionHistory, // Now includes turn actions
      nextToAct: nextToActOnRiver,
    };
  }
}

module.exports = { ScenarioGenerator, POSITIONS_6_MAX, DEFAULT_STACK_SIZE, PREFLOP_RAISE_SIZE, FLOP_CBET_SIZE, TURN_BARREL_SIZE };
