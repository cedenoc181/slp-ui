import React, { useState } from 'react';
import { testAllEndpoints, testEndpoint } from '../data/testing/apiTest';
import { TEAM_IDS, SEASON_TYPES, PLAYER_ROLES } from '../data/constants/apiConstants';
import '../styles/stats-page-styling/api-test-page.css';

function ApiTestPage() {
  const [testing, setTesting] = useState(false);
  const [selectedTest, setSelectedTest] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState(TEAM_IDS.LAD);
  const [selectedSeason, setSelectedSeason] = useState('2025');
  const [selectedPlayerId, setSelectedPlayerId] = useState(''); // Internal DB player.id
  const [selectedMlbId, setSelectedMlbId] = useState('660271'); // MLB ID (e.g., Ohtani)
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
        case 'getBatterGameLogs':
          result = await testEndpoint('games', 'getBatterGameLogs', Number(selectedPlayerId), selectedSeason, SEASON_TYPES.REGULAR, 20);
          break;
        case 'getBatterGameLogsSpring':
          result = await testEndpoint('games', 'getBatterGameLogs', Number(selectedPlayerId), selectedSeason, SEASON_TYPES.SPRING_TRAINING, 20);
          break;
        case 'getBatterGameLogsPostseason':
          result = await testEndpoint('games', 'getBatterGameLogs', Number(selectedPlayerId), selectedSeason, SEASON_TYPES.POSTSEASON, 20);
          break;
        case 'getPitcherGameLogs':
          result = await testEndpoint('games', 'getPitcherGameLogs', Number(selectedPlayerId), selectedSeason, SEASON_TYPES.REGULAR, 20);
          break;
        case 'getPitcherGameLogsSpring':
          result = await testEndpoint('games', 'getPitcherGameLogs', Number(selectedPlayerId), selectedSeason, SEASON_TYPES.SPRING_TRAINING, 20);
          break;
        case 'getPitcherGameLogsPostseason':
          result = await testEndpoint('games', 'getPitcherGameLogs', Number(selectedPlayerId), selectedSeason, SEASON_TYPES.POSTSEASON, 20);
          break;

        // ========== TEAMS SERVICE ==========
        case 'getTeamSeason':
          result = await testEndpoint('teams', 'getTeamSeason', selectedTeam, selectedSeason);
          break;
        case 'getTeamMonthly':
          result = await testEndpoint('teams', 'getTeamMonthly', selectedTeam, selectedSeason);
          break;
        case 'getTeamRegularSeasonStandings':
          result = await testEndpoint('teams', 'getTeamRegularSeasonStandings', selectedSeason);
          break;
        case 'getTeamSpringTrainingStandings':
          result = await testEndpoint('teams', 'getTeamSpringTrainingStandings', selectedSeason);
          break;
        case 'getTeamPostseasonBracket':
          result = await testEndpoint('teams', 'getTeamPostseasonBracket', selectedSeason);
          break;

        // ========== TEAM STATS SERVICE ==========
        case 'getTeamBattingStats':
          result = await testEndpoint('teamStats', 'getTeamBattingStats', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getTeamPitchingStats':
          result = await testEndpoint('teamStats', 'getTeamPitchingStats', selectedTeam, selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getTeamBattingStatsSpring':
          result = await testEndpoint('teamStats', 'getTeamBattingStats', selectedTeam, selectedSeason, SEASON_TYPES.SPRING_TRAINING);
          break;
        case 'getTeamPitchingStatsSpring':
          result = await testEndpoint('teamStats', 'getTeamPitchingStats', selectedTeam, selectedSeason, SEASON_TYPES.SPRING_TRAINING);
          break;
        case 'getTeamBattingStatsPostseason':
          result = await testEndpoint('teamStats', 'getTeamBattingStats', selectedTeam, selectedSeason, SEASON_TYPES.POSTSEASON);
          break;
        case 'getTeamPitchingStatsPostseason':
          result = await testEndpoint('teamStats', 'getTeamPitchingStats', selectedTeam, selectedSeason, SEASON_TYPES.POSTSEASON);
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

        // ========== LEAGUE LEADERS SERVICE ==========
        case 'getLeagueBattingLeaders':
          result = await testEndpoint('leagueLeaders', 'getLeagueBattingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getLeaguePitchingLeaders':
          result = await testEndpoint('leagueLeaders', 'getLeaguePitchingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getLeagueTopBattingLeaders':
          result = await testEndpoint('leagueLeaders', 'getTopBattingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getLeagueTopPitchingLeaders':
          result = await testEndpoint('leagueLeaders', 'getTopPitchingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getLeagueHotBattingLeaders':
          result = await testEndpoint('leagueLeaders', 'getHotBattingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getLeagueHotPitchingLeaders':
          result = await testEndpoint('leagueLeaders', 'getHotPitchingLeaders', selectedSeason, SEASON_TYPES.REGULAR);
          break;
        case 'getLeagueSplitsBattersService':
          result = await testEndpoint('leagueLeaders', 'getLeagueSplits', selectedSeason, SEASON_TYPES.REGULAR, PLAYER_ROLES.BATTER);
          break;
        case 'getLeagueSplitsPitchersService':
          result = await testEndpoint('leagueLeaders', 'getLeagueSplits', selectedSeason, SEASON_TYPES.REGULAR, PLAYER_ROLES.PITCHER);
          break;

        // ========== INJURY SERVICE ==========
        case 'getTeamInjuriesFirstHalf':
          result = await testEndpoint('injury', 'getTeamInjuriesFirstHalf', selectedTeam, selectedSeason);
          break;
        case 'getTeamInjuriesSecondHalf':
          result = await testEndpoint('injury', 'getTeamInjuriesSecondHalf', selectedTeam, selectedSeason);
          break;
        case 'getTeamInjuriesFullSeason':
          result = await testEndpoint('injury', 'getTeamInjuriesFullSeason', selectedTeam, selectedSeason);
          break;
        case 'getTeamCurrentInjuries':
          result = await testEndpoint('injury', 'getTeamCurrentInjuries', selectedTeam);
          break;
        case 'getPlayerInjuryHistory':
          result = await testEndpoint('injury', 'getPlayerInjuryHistory', 123, selectedSeason);
          break;
        case 'getInjurySummary':
          result = await testEndpoint('injury', 'getInjurySummary', selectedSeason);
          break;
        case 'getTeamInjuriesCustomRange':
          result = await testEndpoint('injury', 'getTeamInjuriesCustomRange', selectedTeam, selectedSeason, {
            startDate: '2025-04-01',
            endDate: '2025-06-30',
            onlyActive: false
          });
          break;

        // ========== PLAYER STATS SERVICE ==========
        // Uses player.id (internal DB ID)
        case 'getPlayerInfo':
          result = await testEndpoint('playerStats', 'getPlayerInfo', Number(selectedPlayerId));
          break;
        // Uses mlb_id (official MLB ID)
        case 'getPlayerInfoByMlbId':
          result = await testEndpoint('playerStats', 'getPlayerInfoByMlbId', Number(selectedMlbId));
          break;
        // Uses player.id only (career - no season)
        case 'getBatterCareerStats':
          result = await testEndpoint('playerStats', 'getBatterCareerStats', Number(selectedPlayerId));
          break;
        case 'getBatterCareerTotals':
          result = await testEndpoint('playerStats', 'getBatterCareerTotals', Number(selectedPlayerId));
          break;
        // Uses player.id + season
        case 'getBatterCurrentStats':
          result = await testEndpoint('playerStats', 'getBatterCurrentStats', Number(selectedPlayerId), selectedSeason);
          break;
        case 'getBatterVsHandSplits':
          result = await testEndpoint('playerStats', 'getBatterVsHandSplits', Number(selectedPlayerId), selectedSeason);
          break;
        case 'getBatterHomeRoadSplits':
          result = await testEndpoint('playerStats', 'getBatterHomeRoadSplits', Number(selectedPlayerId), selectedSeason);
          break;
        // Uses player.id only (career totals - no season)
        case 'getBatterVsHandSplitsCareerTotals':
          result = await testEndpoint('playerStats', 'getBatterVsHandSplitsCareerTotals', Number(selectedPlayerId));
          break;
        case 'getBatterHomeRoadSplitsCareerTotals':
          result = await testEndpoint('playerStats', 'getBatterHomeRoadSplitsCareerTotals', Number(selectedPlayerId));
          break;
        // Uses player.id + season
        case 'getBatterMonthlyPerformance':
          result = await testEndpoint('playerStats', 'getBatterMonthlyPerformance', Number(selectedPlayerId), selectedSeason);
          break;
        // Pitcher endpoints - Uses player.id only (career - no season)
        case 'getPitcherCareerStats':
          result = await testEndpoint('playerStats', 'getPitcherCareerStats', Number(selectedPlayerId));
          break;
        case 'getPitcherCareerTotals':
          result = await testEndpoint('playerStats', 'getPitcherCareerTotals', Number(selectedPlayerId));
          break;
        // Pitcher endpoints - Uses player.id + season
        case 'getPitcherCurrentStats':
          result = await testEndpoint('playerStats', 'getPitcherCurrentStats', Number(selectedPlayerId), selectedSeason);
          break;
        case 'getPitcherVsHandSplits':
          result = await testEndpoint('playerStats', 'getPitcherVsHandSplits', Number(selectedPlayerId), selectedSeason);
          break;
        case 'getPitcherHomeRoadSplits':
          result = await testEndpoint('playerStats', 'getPitcherHomeRoadSplits', Number(selectedPlayerId), selectedSeason);
          break;
        case 'getPitcherMonthlyPerformance':
          result = await testEndpoint('playerStats', 'getPitcherMonthlyPerformance', Number(selectedPlayerId), selectedSeason);
          break;
        // Uses player.id + season
        case 'getFullPlayerProfile':
          result = await testEndpoint('playerStats', 'getFullPlayerProfile', Number(selectedPlayerId), selectedSeason);
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
    <div className="api-test-page">
      {/* Header */}
      <div className="api-test-header">
        <h1>🧪 API Endpoint Tester</h1>
        <p className="header-subtitle">Test your backend API endpoints</p>
      </div>

      {/* Content */}
      <div className="api-test-content">
        {/* Test Configuration */}
        <div className="api-test-card">
          <h3>⚙️ Test Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Team</label>
              <select 
                value={selectedTeam} 
                onChange={(e) => setSelectedTeam(Number(e.target.value))}
                className="api-test-select"
              >
                {Object.entries(TEAM_IDS).map(([name, id]) => (
                  <option key={id} value={id}>{name} ({id})</option>
                ))}
              </select>
            </div>
            <div className="config-item">
              <label>Season</label>
              <select 
                value={selectedSeason} 
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="api-test-select"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>
            <div className="config-item">
              <label>Player ID (player.id)</label>
              <input
                type="text"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="api-test-input"
                placeholder="Enter player.id"
              />
              <small className="config-hint">Internal DB ID</small>
            </div>
            <div className="config-item">
              <label>MLB ID (mlb_id)</label>
              <input
                type="text"
                value={selectedMlbId}
                onChange={(e) => setSelectedMlbId(e.target.value)}
                className="api-test-input"
                placeholder="Enter mlb_id (e.g., 660271)"
              />
              <small className="config-hint">Official MLB ID (e.g., 660271 = Ohtani)</small>
            </div>
          </div>
        </div>

        {/* Run All Tests */}
        <div className="api-test-card">
          <h3>🚀 Quick Test</h3>
          <button 
            onClick={handleRunAllTests} 
            disabled={testing}
            className="btn-primary"
          >
            {testing ? '⏳ Running Tests...' : '🚀 Run All Tests'}
          </button>
        </div>

        {/* Individual Tests */}
        <div className="api-test-card">
          <h3>🎯 Individual Tests</h3>
          <select 
            value={selectedTest} 
            onChange={(e) => setSelectedTest(e.target.value)}
            className="api-test-select"
          >
            <option value="all">-- Select a Test --</option>
            
            <optgroup label="🎮 Games Service">
              <option value="getTeamGames">Get Team Games (Regular Season)</option>
              <option value="getTeamGamesPostseason">Get Team Games (Postseason)</option>
              <option value="getTeamLast10">Get Team Last 10 Games</option>
              <option value="getTeamHomeGames">Get Team Home Games</option>
              <option value="getTeamAwayGames">Get Team Away Games</option>
              <option value="getBatterGameLogs">Get Batter Game Logs [player.id] (Regular)</option>
              <option value="getBatterGameLogsSpring">Get Batter Game Logs [player.id] (Spring)</option>
              <option value="getBatterGameLogsPostseason">Get Batter Game Logs [player.id] (Postseason)</option>
              <option value="getPitcherGameLogs">Get Pitcher Game Logs [player.id] (Regular)</option>
              <option value="getPitcherGameLogsSpring">Get Pitcher Game Logs [player.id] (Spring)</option>
              <option value="getPitcherGameLogsPostseason">Get Pitcher Game Logs [player.id] (Postseason)</option>
            </optgroup>

            <optgroup label="🏟️ Teams Service">
              <option value="getTeamSeason">Get Team Season Data</option>
              <option value="getTeamMonthly">Get Team Monthly Data</option>
              <option value="getTeamRegularSeasonStandings">Get Regular Season Standings</option>
              <option value="getTeamSpringTrainingStandings">Get Spring Training Standings</option>
              <option value="getTeamPostseasonBracket">Get Postseason Bracket</option>
            </optgroup>

            <optgroup label="📊 Team Stats Service">
              <option value="getTeamBattingStats">Get Team Batting Stats (Regular)</option>
              <option value="getTeamPitchingStats">Get Team Pitching Stats (Regular)</option>
              <option value="getTeamBattingStatsSpring">Get Team Batting Stats (Spring)</option>
              <option value="getTeamPitchingStatsSpring">Get Team Pitching Stats (Spring)</option>
              <option value="getTeamBattingStatsPostseason">Get Team Batting Stats (Postseason)</option>
              <option value="getTeamPitchingStatsPostseason">Get Team Pitching Stats (Postseason)</option>
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

            <optgroup label="🌍 League Leaders Service">
              <option value="getLeagueBattingLeaders">Get League Batting Leaders</option>
              <option value="getLeaguePitchingLeaders">Get League Pitching Leaders</option>
              <option value="getLeagueTopBattingLeaders">Get Top MLB Batting Leaders (League)</option>
              <option value="getLeagueTopPitchingLeaders">Get Top MLB Pitching Leaders (League)</option>
              <option value="getLeagueHotBattingLeaders">Get Hot MLB Batting Leaders (League)</option>
              <option value="getLeagueHotPitchingLeaders">Get Hot MLB Pitching Leaders (League)</option>
              <option value="getLeagueSplitsBattersService">Get League Splits Batters (Service)</option>
              <option value="getLeagueSplitsPitchersService">Get League Splits Pitchers (Service)</option>
            </optgroup>

            <optgroup label="🏥 Injury Service">
              <option value="getTeamInjuriesFirstHalf">Get Team Injuries (First Half)</option>
              <option value="getTeamInjuriesSecondHalf">Get Team Injuries (Second Half)</option>
              <option value="getTeamInjuriesFullSeason">Get Team Injuries (Full Season)</option>
              <option value="getTeamCurrentInjuries">Get Team Current IL</option>
              <option value="getPlayerInjuryHistory">Get Player Injury History</option>
              <option value="getInjurySummary">Get League Injury Summary</option>
              <option value="getTeamInjuriesCustomRange">Get Team Injuries (Custom Range)</option>
            </optgroup>

            <optgroup label="👤 Player Stats Service">
              <option value="getPlayerInfo">Get Player Info [player.id]</option>
              <option value="getPlayerInfoByMlbId">Get Player Info by MLB ID [mlb_id]</option>
              <option value="getBatterCareerStats">Get Batter Career Stats [player.id]</option>
              <option value="getBatterCareerTotals">Get Batter Career Totals [player.id]</option>
              <option value="getBatterCurrentStats">Get Batter Current Stats [player.id + season]</option>
              <option value="getBatterVsHandSplits">Get Batter vs Hand Splits [player.id + season]</option>
              <option value="getBatterHomeRoadSplits">Get Batter Home/Road Splits [player.id + season]</option>
              <option value="getBatterVsHandSplitsCareerTotals">Get Batter vs Hand Splits Career [player.id]</option>
              <option value="getBatterHomeRoadSplitsCareerTotals">Get Batter Home/Road Splits Career [player.id]</option>
              <option value="getBatterMonthlyPerformance">Get Batter Monthly Performance [player.id + season]</option>
              <option value="getPitcherCareerStats">Get Pitcher Career Stats [player.id]</option>
              <option value="getPitcherCareerTotals">Get Pitcher Career Totals [player.id]</option>
              <option value="getPitcherCurrentStats">Get Pitcher Current Stats [player.id + season]</option>
              <option value="getPitcherVsHandSplits">Get Pitcher vs Hand Splits [player.id + season]</option>
              <option value="getPitcherHomeRoadSplits">Get Pitcher Home/Road Splits [player.id + season]</option>
              <option value="getPitcherMonthlyPerformance">Get Pitcher Monthly Performance [player.id + season]</option>
              <option value="getFullPlayerProfile">Get Full Player Profile [player.id + season]</option>
            </optgroup>
          </select>

          <button 
            onClick={handleRunSingleTest} 
            disabled={testing || selectedTest === 'all'}
            className="btn-secondary"
          >
            {testing ? '⏳ Running...' : `Run: ${selectedTest}`}
          </button>
        </div>

        {/* Result Display */}
        {lastResult && (
          <div className={`result-box ${lastResult.includes('✅') ? 'success' : 'error'}`}>
            <p>{lastResult}</p>
          </div>
        )}

        {/* Current Test Info */}
        <div className="info-box">
          <h4>📍 Current Test Parameters:</h4>
          <ul>
            <li><strong>Team:</strong> {getTeamName(selectedTeam)} (ID: {selectedTeam})</li>
            <li><strong>Season:</strong> {selectedSeason}</li>
            <li><strong>Player ID (player.id):</strong> {selectedPlayerId || 'Not set'}</li>
            <li><strong>MLB ID (mlb_id):</strong> {selectedMlbId || 'Not set'}</li>
            <li><strong>Season Type:</strong> Regular (R)</li>
            <li><strong>API Base URL:</strong> http://127.0.0.1:8000</li>
          </ul>
        </div>

        {/* Instructions */}
        <div className="instructions-box">
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
        <div className="endpoints-box">
          <h4>🔗 Endpoint Reference:</h4>
          <div className="endpoint-grid">
            <div className="endpoint-category">
              <strong>Games</strong>
              <code>/games/team?team_id=X&season=Y&season_type=R</code>
              <code>/games/team/last10?team_id=X&season=Y</code>
              <code>/games/team/home?team_id=X&season=Y</code>
              <code>/games/team/away?team_id=X&season=Y</code>
              <code>/games/batter?player_id=X&season=Y&season_type=R&limit=162</code>
              <code>/games/pitcher?player_id=X&season=Y&season_type=R&limit=50</code>
            </div>
            <div className="endpoint-category">
              <strong>Teams</strong>
              <code>/teams/season?team_id=X&season=Y</code>
              <code>/teams/monthly?team_id=X&season=Y</code>
              <code>/teams/standings?season=Y</code>
              <code>/teams/standings/spring?season=Y</code>
              <code>/teams/standings/postseason?season=Y</code>
            </div>
            <div className="endpoint-category">
              <strong>Stats</strong>
              <code>/teams/stats/batting?team_id=X&season=Y&season_type=R</code>
              <code>/teams/stats/pitching?team_id=X&season=Y&season_type=R</code>
            </div>
            <div className="endpoint-category">
              <strong>Roster</strong>
              <code>/teams/roster?team_id=X&season=Y&role=pitcher|batters</code>
            </div>
            <div className="endpoint-category">
              <strong>Team Leaders</strong>
              <code>/teams/leaders/batting?team_id=X&season=Y&season_type=R</code>
              <code>/teams/leaders/pitching?team_id=X&season=Y&season_type=R</code>
              <code>/teams/leaders/batting/team/top?team_id=X&season=Y</code>
              <code>/teams/leaders/batting/hot/team?team_id=X&season=Y</code>
              <code>/teams/leaders/splits/team?team_id=X&season=Y&role=batters</code>
            </div>
            <div className="endpoint-category">
              <strong>League Leaders</strong>
              <code>/teams/leaders/batting/league?season=Y&season_type=R</code>
              <code>/teams/leaders/pitching/league?season=Y&season_type=R</code>
              <code>/teams/leaders/batting/top?season=Y&season_type=R</code>
              <code>/teams/leaders/batting/hot?season=Y&season_type=R</code>
              <code>/teams/leaders/splits/league?season=Y&role=batters</code>
            </div>
            <div className="endpoint-category">
              <strong>Injuries</strong>
              <code>/players/injuries/team/first-half?team_id=X&season=Y</code>
              <code>/players/injuries/team/second-half?team_id=X&season=Y</code>
              <code>/players/injuries/team/full-season?team_id=X&season=Y</code>
              <code>/players/injuries/team/current?team_id=X</code>
              <code>/players/injuries/player?player_id=X&season=Y</code>
              <code>/players/injuries/summary?season=Y</code>
              <code>/players/injuries/team?team_id=X&season=Y&start_date=...&end_date=...</code>
            </div>
            <div className="endpoint-category">
              <strong>Player Profile - Info</strong>
              <code>/player-profile/{'{player_id}'}/info</code>
              <code>/player-profile/mlb/{'{mlb_id}'}/info</code>
            </div>
            <div className="endpoint-category">
              <strong>Player Profile - Batter Stats</strong>
              <code>/player-profile/{'{player_id}'}/batter/career-stats</code>
              <code>/player-profile/{'{player_id}'}/batter/career-totals</code>
              <code>/player-profile/{'{player_id}'}/batter/current-stats?season=Y</code>
              <code>/player-profile/{'{player_id}'}/batter/monthly-performance?season=Y</code>
            </div>
            <div className="endpoint-category">
              <strong>Player Profile - Batter Splits</strong>
              <code>/player-profile/{'{player_id}'}/batter/vs-hand-splits?season=Y</code>
              <code>/player-profile/{'{player_id}'}/batter/home-road-splits?season=Y</code>
              <code>/player-profile/{'{player_id}'}/batter/vs-hand-splits-career-totals</code>
              <code>/player-profile/{'{player_id}'}/batter/home-road-splits-career-totals</code>
            </div>
            <div className="endpoint-category">
              <strong>Player Profile - Pitcher Stats</strong>
              <code>/player-profile/{'{player_id}'}/pitcher/career-stats</code>
              <code>/player-profile/{'{player_id}'}/pitcher/career-totals</code>
              <code>/player-profile/{'{player_id}'}/pitcher/current-stats?season=Y</code>
              <code>/player-profile/{'{player_id}'}/pitcher/monthly-performance?season=Y</code>
            </div>
            <div className="endpoint-category">
              <strong>Player Profile - Pitcher Splits</strong>
              <code>/player-profile/{'{player_id}'}/pitcher/vs-hand-splits?season=Y</code>
              <code>/player-profile/{'{player_id}'}/pitcher/home-road-splits?season=Y</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiTestPage;