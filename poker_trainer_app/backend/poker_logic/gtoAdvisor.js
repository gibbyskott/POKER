const fs = require('fs');
const path = require('path');
const { RANKS } = require('./card');

let rfiCharts = {};
try {
  const chartsPath = path.join(__dirname, '..', 'gto_charts', 'rfiCharts.json');
  const chartsData = fs.readFileSync(chartsPath, 'utf8');
  rfiCharts = JSON.parse(chartsData);
  if (rfiCharts.RFI_100BB_6MAX && rfiCharts.RFI_100BB_6MAX.SB && rfiCharts.RFI_100BB_6MAX.SB['T8s+']) {
    if (rfiCharts.RFI_100BB_6MAX.SB['T8s+'].action === 0 || typeof rfiCharts.RFI_100BB_6MAX.SB['T8s+'].action !== 'string' ) {
        rfiCharts.RFI_100BB_6MAX.SB['T8s+'].action = "raise";
        if (!rfiCharts.RFI_100BB_6MAX.SB['T8s+'].frequency) rfiCharts.RFI_100BB_6MAX.SB['T8s+'].frequency = 1.0;
    }
  }
} catch (error) {
  console.error("Error loading GTO charts:", error);
  rfiCharts = { RFI_100BB_6MAX: {} };
}

function normalizeHand(holeCards) {
  if (!holeCards || holeCards.length !== 2) {
    console.error("Invalid holeCards for normalization:", holeCards);
    return null;
  }
  const c1RankStr = holeCards[0].slice(0, -1);
  const c1Suit = holeCards[0].slice(-1);
  const c2RankStr = holeCards[1].slice(0, -1);
  const c2Suit = holeCards[1].slice(-1);
  const c1Val = RANKS.indexOf(c1RankStr);
  const c2Val = RANKS.indexOf(c2RankStr);
  if (c1Val === -1 || c2Val === -1) {
    console.error(`Invalid card rank found in normalization: '${c1RankStr}' or '${c2RankStr}' from hand [${holeCards.join(', ')}]`);
    return null;
  }
  const sortedRanks = c1Val > c2Val ? [c1RankStr, c2RankStr] : [c2RankStr, c1RankStr];
  const handStrOnlyRanks = sortedRanks.join('');
  if (c1RankStr === c2RankStr) return handStrOnlyRanks;
  else if (c1Suit === c2Suit) return `${handStrOnlyRanks}s`;
  else return `${handStrOnlyRanks}o`;
}

function getPreflopAdvice(scenario) {
  if (!scenario || scenario.scenarioType !== 'preflop') return { error: "Invalid scenario or not a pre-flop scenario." };
  const { heroPosition, heroHoleCards, actionHistory } = scenario;
  const isRFI = !actionHistory.slice(2).some(a => ['raise', 'bet', 'call'].includes(a.action));
  if (!isRFI) return { advice: "Chart not available (not a clear RFI spot).", details: { strategy: "unknown_preflop_situation" } };
  const chartSet = rfiCharts.RFI_100BB_6MAX || {};
  const chartForPosition = chartSet[heroPosition];
  if (!chartForPosition) return { error: `No RFI chart for position: ${heroPosition}` };
  const normalizedHand = normalizeHand(heroHoleCards);
  if (!normalizedHand) return { error: "Could not normalize hero's hand. Raw: " + heroHoleCards.join(',') };
  let adviceEntry = chartForPosition[normalizedHand];
  if (!adviceEntry) { // Simplified generic lookups
    if (normalizedHand.endsWith('s') && normalizedHand.startsWith('A') && chartForPosition['Axs']) adviceEntry = chartForPosition['Axs'];
    else if (normalizedHand.endsWith('s') && normalizedHand.startsWith('K') && chartForPosition['Kxs']) adviceEntry = chartForPosition['Kxs'];
    else if (normalizedHand.endsWith('s') && normalizedHand.includes('Q') && chartForPosition['Q9s+'] && RANKS.indexOf(normalizedHand[1]) >= RANKS.indexOf('9')) adviceEntry = chartForPosition['Q9s+'];
    else if (normalizedHand.endsWith('s') && normalizedHand.includes('J') && chartForPosition['J9s+'] && RANKS.indexOf(normalizedHand[1]) >= RANKS.indexOf('9')) adviceEntry = chartForPosition['J9s+'];
    else if (normalizedHand.endsWith('s') && normalizedHand.includes('T') && chartForPosition['T8s+'] && RANKS.indexOf(normalizedHand[1]) >= RANKS.indexOf('8')) adviceEntry = chartForPosition['T8s+'];
  }
  if (adviceEntry) {
    let adviceString = `GTO recommends: ${adviceEntry.action} (${(adviceEntry.frequency * 100).toFixed(0)}%)`;
    if (adviceEntry.alternative) adviceString += ` or ${adviceEntry.alternative} (${(adviceEntry.alt_frequency * 100).toFixed(0)}%)`;
    return { advice: adviceString, details: adviceEntry };
  }
  return { advice: `GTO recommends: fold (hand ${normalizedHand} not in RFI chart for ${heroPosition})`, details: { action: "fold", frequency: 1.0, strategy: "default_fold_rfi" } };
}

function getFlopAdvice(scenario) {
  if (!scenario || scenario.scenarioType !== 'flop') return { error: "Invalid scenario or not a flop scenario." };
  const { heroPosition, actionHistory, nextToAct, villainInfo } = scenario;
  let heroIsPFR = false;
  if (actionHistory) {
    const preflopActions = actionHistory.filter(a => !['posts_sb', 'posts_bb', 'fold'].includes(a.action));
    const lastAggressivePreflopAction = [...preflopActions].reverse().find(a => a.action === 'raise' || a.action === 'bet');
    if (lastAggressivePreflopAction && lastAggressivePreflopAction.player === heroPosition) heroIsPFR = true;
  }
  if (heroPosition === 'BTN' && villainInfo && villainInfo.position === 'BB') {
      const heroRaiseAction = actionHistory.find(a => a.player === heroPosition && a.action === 'raise');
      if (heroRaiseAction) {
          const bbCallAction = actionHistory.find(a => a.player === villainInfo.position && a.action === 'call' && a.amount === (heroRaiseAction.amount -1));
          if(bbCallAction) heroIsPFR = true;
      }
  }
  let advice = "Flop play strategy is highly contextual.\n";
  if (heroIsPFR) {
    advice += "As PFR: ";
    if (nextToAct === heroPosition) advice += "Opponent checked. Consider board texture, hand strength. C-betting common, especially IP or on favorable boards.";
    else if (nextToAct === villainInfo?.position) advice += "Waiting for OOP opponent. If they check, decision is on you. If they bet (donk), proceed cautiously.";
  } else {
    advice += "As pre-flop caller: ";
    if (nextToAct === heroPosition) advice += "PFR checked. Consider betting for value/bluff (probe/float), especially if IP. Or check OOP to keep pot small.";
    else if (nextToAct === villainInfo?.position) advice += "Waiting for PFR. Face a c-bet with strong hands/draws. Fold weaker holdings.";
  }
  advice += "\nTips: Consider board texture, #opponents, SPR.";
  return { advice, details: { strategy: "general_heuristic_flop", heroIsPFR, nextToAct } };
}

function getTurnAdvice(scenario) {
  if (!scenario || scenario.scenarioType !== 'turn') return { error: "Invalid scenario or not a turn scenario." };
  // Extremely simplified heuristic advice for the turn
  let advice = "Turn play builds on flop action. Re-evaluate your hand strength and perceived ranges after the turn card.\n";
  advice += "Consider if the turn card changes the board texture significantly (e.g., completes draws, brings overcards).\n";
  advice += "If you were aggressive on the flop and got called, decide whether to continue aggression (barrel) for value or as a bluff.\n";
  advice += "If facing aggression, pot odds and equity become even more critical.";
  return { advice, details: { strategy: "general_heuristic_turn" } };
}

function getRiverAdvice(scenario) {
  if (!scenario || scenario.scenarioType !== 'river') return { error: "Invalid scenario or not a river scenario." };
  // Extremely simplified heuristic advice for the river
  let advice = "River play is often about clear value betting or bluffing, as draws are now complete (or missed).\n";
  advice += "If you have a strong hand, bet for value. Size your bet based on what you think your opponent can call.\n";
  advice += "If you missed your draw or have a weak hand, consider bluffing if the story makes sense and opponent might fold a better hand.\n";
  advice += "If facing a bet, carefully consider pot odds and your opponent's likely holdings. Hero calling with bluff-catchers can be tricky.";
  return { advice, details: { strategy: "general_heuristic_river" } };
}

module.exports = { getPreflopAdvice, normalizeHand, getFlopAdvice, getTurnAdvice, getRiverAdvice };
