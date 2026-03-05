/**
 * ============================================================================
 * GAME LOG SECTION COMPONENT
 * ============================================================================
 * 
 * PURPOSE:
 * Displays a detailed game-by-game log of player performance with pagination.
 * Shows individual game stats for either batting or pitching depending on
 * the player type and current view mode.
 * 
 * PARENT COMPONENT:
 * - playerProfileStats.jsx (main Player Profile page)
 * 
 * DATA SOURCES:
 * - gameLog: Array of game entries from gamesService
 * - Data comes from parent, filtered by season and season type
 * 
 * KEY FEATURES:
 * 1. Season Type Filter: Switch between Regular, Spring, Postseason
 * 2. Paginated Table: 10 games per page with prev/next navigation
 * 3. Game Results: Shows W/L with score
 * 4. Stat Highlighting: Key stats are visually highlighted
 * 
 * TWO-WAY PLAYER (TWP) SUPPORT:
 * - showPitchingStats determines column layout
 * - Pitchers: Dec, IP, H, R, ER, BB, K, HR, PC
 * - Batters: AB, H, HR, RBI, R, BB, SO, SB, TB
 * 
 * HIGHLIGHTING RULES:
 * - Batters: Hits > 0, HR > 0, RBI > 0, SB > 0, TB > 0
 * - Pitchers: IP >= 6, ER = 0, K >= 10, HR allowed (danger)
 * 
 * STATE MANAGEMENT:
 * - gameLogPage: Internal state for pagination (resets on season type change)
 * 
 * PERFORMANCE NOTES:
 * - Wrapped in React.memo to prevent unnecessary re-renders
 * - Pagination state is local to avoid parent re-renders
 * 
 * ============================================================================
 */

import React, { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEAMS } from '../../../../../data/constants/apiConstants';

// ============================================================================
// TEAM NAME MAPPING
// ============================================================================

/**
 * Nickname aliases that map to standard team names
 * Handles cases like "D-backs" -> "Diamondbacks"
 */
const TEAM_NICKNAME_MAP = {
  'd-backs': 'diamondbacks',
  'dbacks': 'diamondbacks',
  'd backs': 'diamondbacks',
  'cubbies': 'cubs',
  'halos': 'angels',
  'bronx bombers': 'yankees',
  'tribe': 'guardians',
  'amazins': 'mets',
  'fish': 'marlins',
  'brew crew': 'brewers',
  'buccos': 'pirates',
  'cards': 'cardinals',
  'white sox': 'whitesox',
  'red sox': 'redsox',
  'a\'s': 'athletics',
  'jays': 'bluejays',
  'blue jays': 'bluejays',
};

/**
 * Normalize team name by removing common prefixes and handling aliases
 */
const normalizeTeamName = (name) => {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  
  // Check alias map first
  if (TEAM_NICKNAME_MAP[lower]) {
    return TEAM_NICKNAME_MAP[lower];
  }
  
  // Extract last word (the team nickname) - handles "Los Angeles Dodgers" -> "dodgers"
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1];
  
  // Check if last word is in alias map
  if (TEAM_NICKNAME_MAP[lastWord]) {
    return TEAM_NICKNAME_MAP[lastWord];
  }
  
  return lastWord;
};

/**
 * Get team URL name from opponent name (handles abbreviations, nicknames, and full names)
 */
const getTeamUrl = (opponentName) => {
  if (!opponentName) return null;
  
  const input = opponentName.trim();
  const inputUpper = input.toUpperCase();
  const inputLower = input.toLowerCase();
  
  // First, check if it's a team abbreviation (e.g., "NYY", "LAD", "ARI")
  const teamByAbbr = TEAMS.find(t => t.id?.toUpperCase() === inputUpper);
  if (teamByAbbr) {
    return teamByAbbr.urlName;
  }
  
  // Check normalized nickname
  const normalized = normalizeTeamName(opponentName);
  
  // Find team by matching normalized name against urlName or name
  const team = TEAMS.find(t => {
    const teamUrlNormalized = t.urlName?.toLowerCase().split('-').pop();
    const teamNameNormalized = normalizeTeamName(t.name);
    return teamUrlNormalized === normalized || teamNameNormalized === normalized;
  });
  
  return team?.urlName || null;
};

/**
 * GameLogSection - Displays paginated game-by-game performance log
 * 
 * @param {Object} props
 * @param {Array} props.gameLog - Array of game objects with performance data
 * @param {boolean} props.gameLogLoading - Loading state for game log data
 * @param {string} props.selectedSeason - Currently selected season year
 * @param {string} props.gameLogSeasonType - 'R' (Regular), 'S' (Spring), 'P' (Postseason)
 * @param {Function} props.setGameLogSeasonType - Callback to change season type
 * @param {boolean} props.showPitchingStats - Whether to show pitching (true) or batting (false) columns
 * @param {number} [props.gamesPerPage=10] - Number of games per page
 */
const GameLogSection = memo(function GameLogSection({
  gameLog,
  gameLogLoading,
  selectedSeason,
  gameLogSeasonType,
  setGameLogSeasonType,
  showPitchingStats,
  gamesPerPage = 10,
}) {
  const navigate = useNavigate();
  const [gameLogPage, setGameLogPage] = useState(1);
  
  // Reset page when season type changes
  const handleSeasonTypeChange = useCallback((e) => {
    setGameLogSeasonType(e.target.value);
    setGameLogPage(1);
  }, [setGameLogSeasonType]);

  // Navigate to matchup detail page — pass season type so getGameById can do
  // a single targeted request instead of searching all season types.
  const handleGameRowClick = useCallback((game) => {
    const gameId = game.game_pk ?? game.id;
    navigate(`/mlb-schedule/${gameId}`, { state: { season: selectedSeason, seasonType: gameLogSeasonType } });
    window.scrollTo(0, 0);
  }, [navigate, selectedSeason, gameLogSeasonType]);

  return (
    <section className="pps-section">
      <div className="pps-section-header">
        <div>
          <h2 className="pps-section-title">Game Log</h2>
          <p className="pps-section-subtitle">
            {selectedSeason} {gameLogSeasonType === 'R' ? 'Regular Season' : gameLogSeasonType === 'S' ? 'Spring Training' : 'Postseason'} results
          </p>
        </div>
        <div className="pps-game-log-filters">
          <select 
            className="pps-season-type-filter"
            value={gameLogSeasonType}
            onChange={handleSeasonTypeChange}
          >
            <option value="R">Regular Season</option>
            <option value="S">Spring Training</option>
            <option value="P">Postseason</option>
          </select>
        </div>
      </div>

      <div className="pps-game-log-container">
        {gameLogLoading ? (
          <div className="pps-stats-loading">Loading game logs...</div>
        ) : gameLog.length > 0 ? (
          <>
            <div className="pps-game-log-table-wrapper">
              <table className="pps-game-log-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opp</th>
                    <th>Result</th>
                    {showPitchingStats ? (
                      <>
                        <th>Dec</th>
                        <th>IP</th>
                        <th>H</th>
                        <th>R</th>
                        <th>ER</th>
                        <th>BB</th>
                        <th>K</th>
                        <th>HR</th>
                        <th>PC</th>
                      </>
                    ) : (
                      <>
                        <th>AB</th>
                        <th>H</th>
                        <th>HR</th>
                        <th>RBI</th>
                        <th>R</th>
                        <th>BB</th>
                        <th>SO</th>
                        <th>SB</th>
                        <th>TB</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const startIndex = (gameLogPage - 1) * gamesPerPage;
                    const endIndex = startIndex + gamesPerPage;
                    const paginatedGames = gameLog.slice(startIndex, endIndex);
                    
                    return paginatedGames.map((game) => {
                      // Determine game result (W/L)
                      const playerScore = game.team_score ?? (game.is_home ? game.home_runs_score : game.away_runs_score);
                      const oppScore = game.opponent_score ?? (game.is_home ? game.away_runs_score : game.home_runs_score);
                      const result = playerScore > oppScore ? 'W' : playerScore < oppScore ? 'L' : 'T';
                      const resultClass = result === 'W' ? 'win' : result === 'L' ? 'loss' : 'tie';
                      
                      // Format date
                      const gameDate = new Date(game.date);
                      const formattedDate = gameDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      });
                      
                      // Pitcher decision
                      const pitcherDecision = game.win ? 'W' : game.loss ? 'L' : '-';
                      const decisionClass = pitcherDecision === 'W' ? 'win' : pitcherDecision === 'L' ? 'loss' : '';
                      
                      return (
                        <tr
                          key={game.game_pk}
                          onClick={() => handleGameRowClick(game)}
                          className="pps-game-log-row-link"
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="pps-game-date">{formattedDate}</td>
                          <td className="pps-game-opponent">
                            <span className="pps-home-away-indicator">{game.is_home ? 'vs' : '@'}</span>
                            <span>{game.opponent}</span>
                          </td>
                          <td className={`pps-game-result ${resultClass}`}>
                            {result} {playerScore}-{oppScore}
                          </td>
                          {showPitchingStats ? (
                            <>
                              <td className={`pps-decision ${decisionClass}`}>{pitcherDecision}</td>
                              <td className={game.innings_pitched >= 6 ? 'pps-highlight' : ''}>{game.innings_pitched?.toFixed(1) || '-'}</td>
                              <td>{game.hits_allowed ?? game.hits ?? '-'}</td>
                              <td>{game.runs ?? game.runs_allowed ?? '-'}</td>
                              <td className={(game.earned_runs ?? game.earned_runs_allowed) === 0 ? 'pps-highlight' : ''}>{game.earned_runs ?? game.earned_runs_allowed ?? '-'}</td>
                              <td>{game.walks ?? game.walks_allowed ?? '-'}</td>
                              <td className={game.strikeouts >= 10 ? 'pps-highlight pps-k' : ''}>{game.strikeouts ?? '-'}</td>
                              <td className={game.home_runs_allowed > 0 ? 'pps-danger' : ''}>{game.home_runs_allowed ?? '-'}</td>
                              <td>{game.pitches_thrown ?? game.pitch_count ?? game.pitches ?? '-'}</td>
                            </>
                          ) : (
                            <>
                              <td>{game.at_bats}</td>
                              <td className={game.hits > 0 ? 'pps-highlight' : ''}>{game.hits}</td>
                              <td className={game.home_runs > 0 ? 'pps-highlight pps-hr' : ''}>{game.home_runs}</td>
                              <td className={game.rbis > 0 ? 'pps-highlight' : ''}>{game.rbis}</td>
                              <td>{game.runs}</td>
                              <td>{game.walks}</td>
                              <td>{game.strikeouts}</td>
                              <td className={game.stolen_bases > 0 ? 'pps-highlight' : ''}>{game.stolen_bases}</td>
                              <td className={game.total_bases > 0 ? 'pps-highlight' : ''}>{game.total_bases}</td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {gameLog.length > gamesPerPage && (
              <div className="pps-pagination">
                <button 
                  className="pps-pagination-btn"
                  onClick={() => setGameLogPage(prev => Math.max(1, prev - 1))}
                  disabled={gameLogPage === 1}
                >
                  ← Prev
                </button>
                <span className="pps-pagination-info">
                  Page {gameLogPage} of {Math.ceil(gameLog.length / gamesPerPage)} ({gameLog.length} games)
                </span>
                <button 
                  className="pps-pagination-btn"
                  onClick={() => setGameLogPage(prev => Math.min(Math.ceil(gameLog.length / gamesPerPage), prev + 1))}
                  disabled={gameLogPage >= Math.ceil(gameLog.length / gamesPerPage)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="pps-no-data-placeholder">
            <div className="pps-no-data-icon">📋</div>
            <h3 className="pps-no-data-title">No Game Logs Available</h3>
            <p className="pps-no-data-text">
              No {gameLogSeasonType === 'R' ? 'regular season' : gameLogSeasonType === 'S' ? 'spring training' : 'postseason'} games found for {selectedSeason}.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});

export default GameLogSection;
