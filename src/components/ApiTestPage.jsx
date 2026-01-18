import React, { useState } from 'react';
import { testAllEndpoints, testEndpoint } from '../data/testing/apiTest';
import { TEAM_IDS, SEASON_TYPES, PLAYER_ROLES } from '../data/constants/apiConstants';

function ApiTestPage() {
  const [testing, setTesting] = useState(false);
  const [selectedTest, setSelectedTest] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState(TEAM_IDS.LAD);
  const [selectedSeason, setSelectedSeason] = useState('2025');
  const [lastResult, setLastResult] = useState(null);

  const handleRunAllTests = async () => {
    setTesting(true);
    setLastResult(null);
    console.clear();
    await testAllEndpoints();
    setTesting(false);
    setLastResult('All tests complete! Check browser console for detailed results.');
  };

  const handleRunSingleTest = async () => {
    setTesting(true);
    setLastResult(null);
    console.clear();
    
    let result = null;

    try {
      switch(selectedTest) {
        // ========== GAMES SERVICE ==========
        case 'getTeamGames':
          result = await testEndpoint('games', 'getTeamGames', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getTeamGamesPostseason':
          result = await testEndpoint('games', 'getTeamGames', selectedTeam, selectedSeason, SEASON_TYPES.POSTSEASON);
          break;
        case 'getTeamLast10':
          result = await testEndpoint('games', 'getTeamLast10', selectedTeam, selectedSeason);
          break;
        case 'getTeamHomeGames':
          result = await testEndpoint('games', 'getTeamHomeGames', selectedTeam, selectedSeason);
          break;
        case 'getTeamAwayGames':
          result = await testEndpoint('games', 'getTeamAwayGames', selectedTeam, selectedSeason);
          break;

        // ========== TEAMS SERVICE ==========
        case 'getTeamSeason':
          result = await testEndpoint('teams', 'getTeamSeason', selectedTeam, selectedSeason);
          break;
        case 'getTeamMonthly':
          result = await testEndpoint('teams', 'getTeamMonthly', selectedTeam, selectedSeason);
          break;

        // ========== TEAM STATS SERVICE ==========
        case 'getTeamBattingStats':
          result = await testEndpoint('teamStats', 'getTeamBattingStats', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getTeamPitchingStats':
          result = await testEndpoint('teamStats', 'getTeamPitchingStats', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;

        // ========== ROSTER SERVICE ==========
        case 'getTeamRoster':
          result = await testEndpoint('roster', 'getTeamRoster', selectedTeam, selectedSeason);
          break;
        case 'getTeamPitchers':
          result = await testEndpoint('roster', 'getTeamPitchers', selectedTeam, selectedSeason);
          break;
        case 'getTeamBatters':
          result = await testEndpoint('roster', 'getTeamBatters', selectedTeam, selectedSeason);
          break;

        // ========== TEAM LEADERS SERVICE - Basic ==========
        case 'getTeamBattingLeaders':
          result = await testEndpoint('teamLeaders', 'getTeamBattingLeaders', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getTeamPitchingLeaders':
          result = await testEndpoint('teamLeaders', 'getTeamPitchingLeaders', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;

        // ========== TEAM LEADERS SERVICE - Top (League-wide) ==========
        case 'getTopBattingLeaders':
          result = await testEndpoint('teamLeaders', 'getTopBattingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getTopPitchingLeaders':
          result = await testEndpoint('teamLeaders', 'getTopPitchingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;

        // ========== TEAM LEADERS SERVICE - Top (Team-specific) ==========
        case 'getTopTeamBattingLeaders':
          result = await testEndpoint('teamLeaders', 'getTopTeamBattingLeaders', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getTopTeamPitchingLeaders':
          result = await testEndpoint('teamLeaders', 'getTopTeamPitchingLeaders', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;

        // ========== TEAM LEADERS SERVICE - Hot (League-wide) ==========
        case 'getHotBattingLeaders':
          result = await testEndpoint('teamLeaders', 'getHotBattingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getHotPitchingLeaders':
          result = await testEndpoint('teamLeaders', 'getHotPitchingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;

        // ========== TEAM LEADERS SERVICE - Hot (Team-specific) ==========
        case 'getHotTeamBattingLeaders':
          result = await testEndpoint('teamLeaders', 'getHotTeamBattingLeaders', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getHotTeamPitchingLeaders':
          result = await testEndpoint('teamLeaders', 'getHotTeamPitchingLeaders', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;

        // ========== TEAM LEADERS SERVICE - Splits ==========
        case 'getTeamSplitsBatters':
          result = await testEndpoint('teamLeaders', 'getTeamSplits', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR, PLAYER_ROLES.BATTER);
          break;
        case 'getTeamSplitsPitchers':
          result = await testEndpoint('teamLeaders', 'getTeamSplits', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR, PLAYER_ROLES.PITCHER);
          break;
        case 'getLeagueSplitsBatters':
          result = await testEndpoint('teamLeaders', 'getLeagueSplits', selectedSeason, SEASON_TYPES.REGULAR, PLAYER_ROLES.BATTER);
          break;
        case 'getLeagueSplitsPitchers':
          result = await testEndpoint('teamLeaders', 'getLeagueSplits', selectedSeason, SEASON_TYPES.REGULAR, PLAYER_ROLES.PITCHER);
          break;

        default:
          await testAllEndpoints();
      }

      if (result) {
        setLastResult(`✅ Test passed! Data received. Check console for details.`);
      } else {
        setLastResult(`❌ Test failed or no data returned. Check console for errors.`);
      }
    } catch (error) {
      setLastResult(`❌ Test failed: ${error.message}`);
    }
    
    setTesting(false);
  };

  // Get team name from ID
  const getTeamName = (id) => {
    return Object.keys(TEAM_IDS).find(key => TEAM_IDS[key] === id) || 'Unknown';
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🧪 API Endpoint Tester</h1>
        <p style={styles.subtitle}>Test your backend API endpoints</p>

        {/* Test Configuration */}
        <div style={styles.section}>
          <h3>⚙️ Test Configuration</h3>
          <div style={styles.configGrid}>
            <div style={styles.configItem}>
              <label style={styles.label}>Team</label>
              <select 
                value={selectedTeam} 
                onChange={(e) => setSelectedTeam(Number(e.target.value))}
                style={styles.select}
              >
                {Object.entries(TEAM_IDS).map(([name, id]) => (
                  <option key={id} value={id}>{name} ({id})</option>
                ))}
              </select>
            </div>
            <div style={styles.configItem}>
              <label style={styles.label}>Season</label>
              <select 
                value={selectedSeason} 
                onChange={(e) => setSelectedSeason(e.target.value)}
                style={styles.select}
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>
          </div>
        </div>

        {/* Run All Tests */}
        <div style={styles.section}>
          <h3>🚀 Quick Test</h3>
          <button 
            onClick={handleRunAllTests} 
            disabled={testing}
            style={styles.buttonPrimary}
          >
            {testing ? '⏳ Running Tests...' : '🚀 Run All Tests'}
          </button>
        </div>

        {/* Individual Tests */}
        <div style={styles.section}>
          <h3>🎯 Individual Tests</h3>
          <select 
            value={selectedTest} 
            onChange={(e) => setSelectedTest(e.target.value)}
            style={styles.select}
          >
            <option value="all">-- Select a Test --</option>
            
            <optgroup label="🎮 Games Service">
              <option value="getTeamGames">Get Team Games (Regular Season)</option>
              <option value="getTeamGamesPostseason">Get Team Games (Postseason)</option>
              <option value="getTeamLast10">Get Team Last 10 Games</option>
              <option value="getTeamHomeGames">Get Team Home Games</option>
              <option value="getTeamAwayGames">Get Team Away Games</option>
            </optgroup>

            <optgroup label="🏟️ Teams Service">
              <option value="getTeamSeason">Get Team Season Data</option>
              <option value="getTeamMonthly">Get Team Monthly Data</option>
            </optgroup>

            <optgroup label="📊 Team Stats Service">
              <option value="getTeamBattingStats">Get Team Batting Stats</option>
              <option value="getTeamPitchingStats">Get Team Pitching Stats</option>
            </optgroup>

            <optgroup label="👥 Roster Service">
              <option value="getTeamRoster">Get Team Full Roster</option>
              <option value="getTeamPitchers">Get Team Pitchers</option>
              <option value="getTeamBatters">Get Team Batters</option>
            </optgroup>

            <optgroup label="⭐ Team Leaders - Basic">
              <option value="getTeamBattingLeaders">Get Team Batting Leaders</option>
              <option value="getTeamPitchingLeaders">Get Team Pitching Leaders</option>
            </optgroup>

            <optgroup label="🏆 Team Leaders - Top (League-wide)">
              <option value="getTopBattingLeaders">Get Top MLB Batting Leaders</option>
              <option value="getTopPitchingLeaders">Get Top MLB Pitching Leaders</option>
            </optgroup>

            <optgroup label="🏆 Team Leaders - Top (Team-specific)">
              <option value="getTopTeamBattingLeaders">Get Top Team Batting Leaders</option>
              <option value="getTopTeamPitchingLeaders">Get Top Team Pitching Leaders</option>
            </optgroup>

            <optgroup label="🔥 Team Leaders - Hot (League-wide)">
              <option value="getHotBattingLeaders">Get Hot MLB Batting Leaders</option>
              <option value="getHotPitchingLeaders">Get Hot MLB Pitching Leaders</option>
            </optgroup>

            <optgroup label="🔥 Team Leaders - Hot (Team-specific)">
              <option value="getHotTeamBattingLeaders">Get Hot Team Batting Leaders</option>
              <option value="getHotTeamPitchingLeaders">Get Hot Team Pitching Leaders</option>
            </optgroup>

            <optgroup label="📈 Team Leaders - Splits">
              <option value="getTeamSplitsBatters">Get Team Splits (Batters)</option>
              <option value="getTeamSplitsPitchers">Get Team Splits (Pitchers)</option>
              <option value="getLeagueSplitsBatters">Get League Splits (Batters)</option>
              <option value="getLeagueSplitsPitchers">Get League Splits (Pitchers)</option>
            </optgroup>
          </select>

          <button 
            onClick={handleRunSingleTest} 
            disabled={testing || selectedTest === 'all'}
            style={styles.buttonSecondary}
          >
            {testing ? '⏳ Running...' : `Run: ${selectedTest}`}
          </button>
        </div>

        {/* Result Display */}
        {lastResult && (
          <div style={{
            ...styles.resultBox,
            background: lastResult.includes('✅') ? '#c6f6d5' : '#fed7d7',
            borderColor: lastResult.includes('✅') ? '#48bb78' : '#f56565',
          }}>
            <p style={styles.resultText}>{lastResult}</p>
          </div>
        )}

        {/* Current Test Info */}
        <div style={styles.infoBox}>
          <h4>📍 Current Test Parameters:</h4>
          <ul>
            <li><strong>Team:</strong> {getTeamName(selectedTeam)} (ID: {selectedTeam})</li>
            <li><strong>Season:</strong> {selectedSeason}</li>
            <li><strong>Season Type:</strong> Regular (R)</li>
            <li><strong>API Base URL:</strong> http://127.0.0.1:8000</li>
          </ul>
        </div>

        {/* Instructions */}
        <div style={styles.instructionsBox}>
          <h4>📝 Instructions:</h4>
          <ol>
            <li>Make sure your backend server is running on <code>http://127.0.0.1:8000</code></li>
            <li>Select a team and season from the configuration above</li>
            <li>Click "Run All Tests" or select an individual test</li>
            <li>Open browser console (<code>F12</code> or <code>Cmd+Option+I</code>) to see detailed results</li>
            <li>Look for ✅ (pass) or ❌ (fail) for each endpoint</li>
          </ol>
        </div>

        {/* Endpoint Reference */}
        <div style={styles.endpointsBox}>
          <h4>🔗 Endpoint Reference:</h4>
          <div style={styles.endpointGrid}>
            <div style={styles.endpointCategory}>
              <strong>Games</strong>
              <code>/games/team?team_id=X&season=Y&season_type=R</code>
              <code>/games/team/last10?team_id=X&season=Y</code>
              <code>/games/team/home?team_id=X&season=Y</code>
              <code>/games/team/away?team_id=X&season=Y</code>
            </div>
            <div style={styles.endpointCategory}>
              <strong>Teams</strong>
              <code>/teams/season?team_id=X&season=Y</code>
              <code>/teams/monthly?team_id=X&season=Y</code>
            </div>
            <div style={styles.endpointCategory}>
              <strong>Stats</strong>
              <code>/teams/stats/batting?team_id=X&season=Y&season_type=R</code>
              <code>/teams/stats/pitching?team_id=X&season=Y&season_type=R</code>
            </div>
            <div style={styles.endpointCategory}>
              <strong>Roster</strong>
              <code>/teams/roster?team_id=X&season=Y&role=pitcher|batters</code>
            </div>
            <div style={styles.endpointCategory}>
              <strong>Leaders</strong>
              <code>/teams/leaders/batting?team_id=X&season=Y&season_type=R</code>
              <code>/teams/leaders/pitching?team_id=X&season=Y&season_type=R</code>
              <code>/teams/leaders/batting/top?season=Y&season_type=R</code>
              <code>/teams/leaders/batting/hot?season=Y&season_type=R</code>
              <code>/teams/leaders/splits/team?team_id=X&season=Y&role=batters</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f7fafc',
    minHeight: '100vh',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    color: '#1a202c',
  },
  subtitle: {
    color: '#718096',
    marginBottom: '2rem',
  },
  section: {
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginTop: '1rem',
  },
  configItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '0.5rem',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  buttonPrimary: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'white',
    background: '#C8102E',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s',
    marginTop: '1rem',
  },
  buttonSecondary: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'white',
    background: '#041E42',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '1rem',
    width: '100%',
    transition: 'background 0.2s',
  },
  resultBox: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '1.5rem',
  },
  resultText: {
    margin: 0,
    fontWeight: '600',
  },
  infoBox: {
    background: '#ebf8ff',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #bee3f8',
  },
  instructionsBox: {
    background: '#f7fafc',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #e2e8f0',
  },
  endpointsBox: {
    background: '#edf2f7',
    padding: '1.5rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
  },
  endpointGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem',
  },
  endpointCategory: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
};

export default ApiTestPage;