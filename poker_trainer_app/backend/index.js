const express = require('express');
const cors = require('cors');
const {
    ScenarioGenerator,
    getPreflopAdvice,
    getFlopAdvice,
    getTurnAdvice,
    getRiverAdvice
} = require('./poker_logic');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

const scenarioGenerator = new ScenarioGenerator();

// API endpoint to get a new pre-flop scenario
app.get('/api/scenario/preflop', (req, res) => {
  try {
    const scenario = scenarioGenerator.generatePreflopScenario();
    res.json(scenario);
  } catch (error) {
    console.error("Error generating preflop scenario:", error);
    res.status(500).json({ error: 'Failed to generate scenario', details: error.message });
  }
});

// API endpoint to get a new flop scenario
app.get('/api/scenario/flop', (req, res) => {
  try {
    const scenario = scenarioGenerator.generateFlopScenario();
    res.json(scenario);
  } catch (error) {
    console.error("Error generating flop scenario:", error);
    res.status(500).json({ error: 'Failed to generate scenario', details: error.message });
  }
});

// API endpoint to get a new turn scenario
app.get('/api/scenario/turn', (req, res) => {
    try {
      const scenario = scenarioGenerator.generateTurnScenario();
      res.json(scenario);
    } catch (error) {
      console.error("Error generating turn scenario:", error);
      res.status(500).json({ error: 'Failed to generate turn scenario', details: error.message });
    }
  });

  // API endpoint to get a new river scenario
  app.get('/api/scenario/river', (req, res) => {
    try {
      const scenario = scenarioGenerator.generateRiverScenario();
      res.json(scenario);
    } catch (error) {
      console.error("Error generating river scenario:", error);
      res.status(500).json({ error: 'Failed to generate river scenario', details: error.message });
    }
  });

// Basic route for testing (can be kept or removed)
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// Endpoint to receive user action and return GTO advice
app.post('/api/action', (req, res) => {
  const { scenario, userAction, amount } = req.body;

  if (!scenario || !scenario.scenarioType) {
    return res.status(400).json({ error: 'Scenario data or type missing.' });
  }

  console.log(`Received user action for ${scenario.scenarioType} scenario:`);
  console.log('Hero Position:', scenario.heroPosition);
  console.log('Hero Cards:', scenario.heroHoleCards);
  if (scenario.communityCards && scenario.communityCards.length > 0) {
    console.log('Community Cards:', scenario.communityCards.join(', '));
  }
  console.log('User Action:', userAction, amount || '');

  let adviceResult;
  switch (scenario.scenarioType) {
    case 'preflop':
      adviceResult = getPreflopAdvice(scenario);
      break;
    case 'flop':
      adviceResult = getFlopAdvice(scenario);
      break;
    case 'turn':
      adviceResult = getTurnAdvice(scenario);
      break;
    case 'river':
      adviceResult = getRiverAdvice(scenario);
      break;
    default:
      adviceResult = { error: "Advice for this scenario type is not yet implemented." };
  }

  console.log('GTO Advice:', adviceResult);

  res.json({
    message: 'Action processed.',
    yourAction: userAction,
    yourAmount: amount,
    gtoAdvice: adviceResult.advice,
    gtoDetails: adviceResult.details,
    error: adviceResult.error
  });
});


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
