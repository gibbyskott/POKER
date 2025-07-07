import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [gameMode, setGameMode] = useState('cash');
  const [streetFocus, setStreetFocus] = useState('preflop');
  const [currentScenario, setCurrentScenario] = useState(null);
  const [raiseAmount, setRaiseAmount] = useState('');
  const [lastActionResponse, setLastActionResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const fetchNewScenario = useCallback(async () => {
    let endpoint = '';
    switch (streetFocus) {
      case 'preflop':
        endpoint = `${API_URL}/scenario/preflop`;
        break;
      case 'flop':
        endpoint = `${API_URL}/scenario/flop`;
        break;
      case 'turn':
        endpoint = `${API_URL}/scenario/turn`;
        break;
      case 'river':
        endpoint = `${API_URL}/scenario/river`;
        break;
      default:
        alert('This street is not yet implemented for scenario generation.');
        setCurrentScenario(null);
        setLastActionResponse(null);
        return;
    }

    setIsLoading(true);
    setError(null);
    setLastActionResponse(null);
    setCurrentScenario(null);

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`HTTP error! status: ${response.status} - ${errData.error || errData.message || response.statusText}`);
      }
      const data = await response.json();
      setCurrentScenario(data);
    } catch (e) {
      setError(`Failed to fetch scenario: ${e.message}`);
      setCurrentScenario(null);
    } finally {
      setIsLoading(false);
    }
  }, [streetFocus]);

  useEffect(() => {
    fetchNewScenario();
  }, [streetFocus, fetchNewScenario]);

  const handleUserAction = async (actionType) => {
    if (!currentScenario) return;
    setIsLoading(true);
    setError(null);

    let actionPayload = {
      scenario: currentScenario,
      userAction: actionType,
    };

    // For 'raise' or 'bet', validate and include the amount
    if (actionType === 'raise' || actionType === 'bet') {
      const amount = parseFloat(raiseAmount);
      if (isNaN(amount) || amount <= (currentScenario.minRaiseAmount || 0) && actionType === 'raise' || amount <=0 && actionType === 'bet' ) {
        // Basic validation, can be improved with minRaise logic from scenario
        alert('Please enter a valid amount.');
        setIsLoading(false);
        return;
      }
      actionPayload.amount = amount;
    }

    try {
      const response = await fetch(`${API_URL}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionPayload),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(`HTTP error! status: ${response.status} - ${errData.error || errData.message || response.statusText}`);
      }
      const data = await response.json();
      setLastActionResponse(data);
    } catch (e) {
      setError(`Action failed: ${e.message}`);
      setLastActionResponse(null);
    } finally {
      setIsLoading(false);
      setRaiseAmount('');
    }
  };

  const renderActionButtons = () => {
    if (!currentScenario || isLoading || lastActionResponse || currentScenario.nextToAct !== currentScenario.heroPosition) return null;

    const { scenarioType, pot } = currentScenario;
    const isPostFlop = ['flop', 'turn', 'river'].includes(scenarioType);

    // Simplified determination of facing a bet.
    // A real app would need to track the current bet amount on the current street.
    // For our generated scenarios, Hero is often facing a check.
    const facingBet = false; // Placeholder - Assume Hero is not facing a bet for now in generated spots.
    const amountToCall = 0; // Placeholder - If facingBet were true, this would be the bet size.

    let callButtonText = 'Call';
    if (scenarioType === 'preflop') {
        // If hero is SB and BB is 1, call is 0.5. If hero is BB and no raise, can check.
        // This part is still simplified as RFI assumes it's folded to hero or hero is SB/BB.
        if (currentScenario.heroPosition === 'BB' && pot <= 1.5) { // Simplified: BB can check if only SB limped or no action
            callButtonText = 'Check'; // Or Call 0 if SB limped. For RFI, it's raise or fold.
                                     // This button logic is still imperfect for all preflop spots.
        } else if (currentScenario.heroPosition === 'SB' && pot <=1.5) {
            callButtonText = 'Call 0.5'; // Call to complete SB
        } else {
            callButtonText = `Call ${amountToCall > 0 ? amountToCall : '1'}`; // Default to calling 1 BB if not specified
        }
    } else { // Post-flop
        callButtonText = amountToCall > 0 ? `Call ${amountToCall}` : 'Check';
    }


    return (
      <div className="action-controls">
        <button onClick={() => handleUserAction('fold')} disabled={isLoading}>Fold</button>

        {/* Call / Check Button */}
        <button onClick={() => handleUserAction(amountToCall > 0 || (scenarioType === 'preflop' && currentScenario.heroPosition === 'SB' && pot <=1.5) ? 'call' : 'check')} disabled={isLoading}>
            {callButtonText}
        </button>

        {/* Bet / Raise Section */}
        <div>
          <input
            type="number"
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(e.target.value)}
            placeholder={facingBet || scenarioType !== 'preflop' ? "Bet/Raise Amount (BB)" : "Raise Amount (BB)"}
            disabled={isLoading}
          />
          <button
            onClick={() => handleUserAction(facingBet ? 'raise' : (isPostFlop ? 'bet' : 'raise'))}
            disabled={isLoading || !raiseAmount}
          >
            {facingBet ? 'Raise' : (isPostFlop ? 'Bet' : 'Raise')}
          </button>
        </div>
      </div>
    );
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Poker Trainer</h1>
        <button onClick={toggleDarkMode}>
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <div>
          <label htmlFor="gameMode">Game Mode: </label>
          <select id="gameMode" value={gameMode} onChange={(e) => setGameMode(e.target.value)} disabled={isLoading}>
            <option value="cash">Cash Game</option>
            <option value="tournament">Tournament</option>
          </select>
        </div>
        <div>
          <label htmlFor="streetFocus">Focus Street: </label>
          <select id="streetFocus" value={streetFocus} onChange={(e) => setStreetFocus(e.target.value)} disabled={isLoading}>
            <option value="preflop">Pre-flop</option>
            <option value="flop">Flop</option>
            <option value="turn">Turn</option>
            <option value="river">River</option>
          </select>
        </div>
      </header>

      <main>
        <button onClick={fetchNewScenario} disabled={isLoading}>
          {isLoading && !currentScenario ? 'Loading Scenario...' : 'Get New Scenario'}
        </button>
        {error && <p className="error-message">Error: {error}</p>}

        {currentScenario && (
          <div className="scenario-display">
            <h2>{currentScenario.scenarioType.charAt(0).toUpperCase() + currentScenario.scenarioType.slice(1)} Scenario</h2>
            <p><strong>Your Position:</strong> {currentScenario.heroPosition} {currentScenario.nextToAct === currentScenario.heroPosition ? <span>(Your Turn)</span> : ''}</p>
            <p><strong>Your Cards:</strong> {currentScenario.heroHoleCards.join(', ')}</p>
            {currentScenario.communityCards && currentScenario.communityCards.length > 0 && (
              <p><strong>Community Cards:</strong> {currentScenario.communityCards.join(', ')}</p>
            )}
            {currentScenario.villainInfo && (
                 <p><strong>Villain ({currentScenario.villainInfo.position}):</strong> {currentScenario.villainInfo.holeCards.join(', ')} (known for training)</p>
            )}
            <p><strong>Pot Size:</strong> {currentScenario.pot} BB</p>
            <p><strong>Effective Stack (Hero):</strong> {currentScenario.stacks[currentScenario.heroPosition]} BB</p>
            {currentScenario.villainInfo && currentScenario.stacks[currentScenario.villainInfo.position] && (
                 <p><strong>Effective Stack (Villain):</strong> {currentScenario.stacks[currentScenario.villainInfo.position]} BB</p>
            )}

            {currentScenario.actionHistory && currentScenario.actionHistory.length > 0 && (
              <div className="action-history-box">
                <p><strong>Action History:</strong></p>
                <ul>
                  {currentScenario.actionHistory.map((actionItem, index) => (
                    <li key={index} className={actionItem.player === currentScenario.heroPosition ? 'hero-action' : (currentScenario.villainInfo && actionItem.player === currentScenario.villainInfo.position ? 'villain-action' : '')}>
                        {actionItem.street ? <span className="street-label">{actionItem.street.toUpperCase()}: </span> : ''}
                        <strong>{actionItem.player}:</strong> {actionItem.action.replace(/_/g, ' ')}
                        {actionItem.amount ? ` ${actionItem.amount} BB` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
             {!lastActionResponse && currentScenario.nextToAct !== currentScenario.heroPosition && <p className="waiting-message">Waiting for {currentScenario.nextToAct} to act...</p>}
          </div>
        )}
        {!currentScenario && !isLoading && <p>Click "Get New Scenario" to start.</p>}

        {renderActionButtons()}

        {lastActionResponse && (
          <div className="gto-advice">
            <h3>Trainer Advice:</h3>
            <p><strong>Your Action:</strong> {lastActionResponse.yourAction} {lastActionResponse.yourAmount ? `${lastActionResponse.yourAmount} BB` : ''}</p>
            <p><strong>Recommendation:</strong> {lastActionResponse.gtoAdvice}</p>
            {lastActionResponse.error && (
              <p className="error-message"><strong>Advice Error:</strong> {lastActionResponse.error}</p>
            )}
            <button onClick={fetchNewScenario} disabled={isLoading}>
              Next Scenario
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
