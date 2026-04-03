/**
 * ============================================================================
 * TEAM GAME LOG SECTION COMPONENT
 * ============================================================================
 * 
 * PURPOSE:
 * Displays a detailed game-by-game log of team performance with pagination.
 * Styled to match the player profile GameLogSection for consistency.
 * 
 * KEY FEATURES:
 * 1. Season Type Filter: Switch between Regular, Spring, Postseason
 * 2. Paginated Table: 10 games per page with prev/next navigation
 * 3. Game Results: Shows W/L with score
 * 4. Stat Highlighting: Key stats are visually highlighted
 * 
 * API RESPONSE STRUCTURE:
 * {
 *   id, date, game_pk, season, season_type, status,
 *   home_team_id, away_team_id, home_team_name, away_team_name,
 *   home_sp_id, away_sp_id, home_sp_name, away_sp_name,
 *   home_runs_score, away_runs_score, home_hits, away_hits,
 *   home_errors, away_errors, home_lob, away_lob,
 *   winning_team_id, run_diff, postseason_round
 * }
 * 
 * ============================================================================
 */

import React, { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const TEAM_NICKNAME_MAP = {
  'd-backs': 'diamondbacks',
  'dbacks': 'diamondbacks',
  'halos': 'angels',
  'bronx bombers': 'yankees',
  'tribe': 'guardians',
  'nats': 'nationals',
  'phils': 'phillies',
  'cards': 'cardinals',
  'bucs': 'pirates',
  'fish': 'marlins',
  'cubbies': 'cubs',
  'brew crew': 'brewers',
  'jays': 'blue jays',
  'o\'s': 'orioles',
  'sox': 'red sox',
};

/**
 * TeamGameLogSection - Displays paginated game-by-game team performance log
 * 
 * @param {Object} props
 * @param {Array} props.teamGames - Array of game objects with performance data
 * @param {boolean} props.loading - Loading state for game log data
 * @param {string} props.selectedSeason - Currently selected season year
 * @param {string} props.seasonType - 'R' (Regular), 'S' (Spring), 'P' (Postseason)
 * @param {Function} props.setSeasonType - Callback to change season type
 * @param {string} props.currentTeamName - Team name for display
 * @param {number} props.teamMlbId - MLB team ID to determine home/away
 * @param {Array} [props.availableSeasonTypes] - Season types that have games available
 * @param {number} [props.gamesPerPage=10] - Number of games per page
 */
const TeamGameLogSection = memo(function TeamGameLogSection({
  teamGames,
  loading,
  selectedSeason,
  seasonType,
  setSeasonType,
  currentTeamName,
  teamMlbId,
  availableSeasonTypes = ['R', 'S', 'P'],
  gamesPerPage = 10,
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  
  // Reset page when season type changes
  const handleSeasonTypeChange = useCallback((e) => {
    setSeasonType(e.target.value);
    setPage(1);
  }, [setSeasonType]);

  // Handle player click - navigate to player profile
  const handlePlayerClick = useCallback((playerSlug) => {
    if (!playerSlug) return;
    navigate(`/player/${playerSlug}?season=${selectedSeason}`);
    window.scrollTo(0, 0);
  }, [navigate, selectedSeason]);

  /**
   * Get the core team identifier (last word of team name, or mapped nickname)
   * e.g., "Arizona Diamondbacks" -> "diamondbacks", "D-backs" -> "diamondbacks"
   */
  const getCoreTeamName = useCallback((name) => {
    if (!name) return '';
    const normalized = name.toLowerCase().trim();

    if (TEAM_NICKNAME_MAP[normalized]) {
      return TEAM_NICKNAME_MAP[normalized];
    }

    const words = normalized.split(' ');
    return words[words.length - 1];
  }, []);

  // Handle game row click - navigate to matchup detail page
  const handleGameRowClick = useCallback((game) => {
    const gameId = game.id ?? game.game_pk;
    navigate(`/mlb-schedule/${gameId}`, { state: { game } });
    window.scrollTo(0, 0);
  }, [navigate]);

  // Get season type label
  const getSeasonTypeLabel = () => {
    switch (seasonType) {
      case 'S': return 'Spring Training';
      case 'P': return 'Postseason';
      default: return 'Regular Season';
    }
  };

  // Ensure teamGames is an array
  const games = Array.isArray(teamGames) ? teamGames : [];

  /**
   * Check if team name matches (supports full name or nickname)
   * Uses core team name extraction to handle aliases like "D-backs" = "Diamondbacks"
   */
  const teamNameMatches = (apiTeamName, selectedTeamName) => {
    const apiCore = getCoreTeamName(apiTeamName);
    const selectedCore = getCoreTeamName(selectedTeamName);
    
    // Compare core team names (both resolved through nickname map)
    return apiCore === selectedCore;
  };

  /**
   * Determine if our team is the home team for this game
   */
  const isHomeTeam = (game) => {
    return teamNameMatches(game.home_team_name, currentTeamName);
  };

  /**
   * Determine which team ID belongs to our selected team
   */
  const getOurTeamId = (game) => {
    if (teamNameMatches(game.home_team_name, currentTeamName)) {
      return game.home_team_id;
    }
    if (teamNameMatches(game.away_team_name, currentTeamName)) {
      return game.away_team_id;
    }
    return null;
  };

  /**
   * Generate a player profile URL slug from name
   * Format: "first-last" for use with player lookup
   * e.g., "Chris Tillman" -> "chris-tillman"
   */
  const generatePlayerSlug = (name) => {
    if (!name) return null;
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')          // Replace spaces with dashes
      .replace(/-+/g, '-')           // Remove consecutive dashes
      .trim();
  };

  /**
   * Get game data from the perspective of the selected team
   */
  const getTeamGameData = (game) => {
    const isHome = isHomeTeam(game);
    const ourTeamId = getOurTeamId(game);
    
    // Get the team's starting pitcher info
    const teamSPName = isHome ? game.home_sp_name : game.away_sp_name;
    const teamSPMlbId = isHome ? game.home_sp_mlb_id : game.away_sp_mlb_id;
    
    return {
      isHome,
      opponent: isHome ? game.away_team_name : game.home_team_name,
      teamScore: isHome ? game.home_runs_score : game.away_runs_score,
      oppScore: isHome ? game.away_runs_score : game.home_runs_score,
      teamHits: isHome ? game.home_hits : game.away_hits,
      oppHits: isHome ? game.away_hits : game.home_hits,
      teamErrors: isHome ? game.home_errors : game.away_errors,
      oppErrors: isHome ? game.away_errors : game.home_errors,
      teamSP: teamSPName,
      teamSPSlug: teamSPMlbId || generatePlayerSlug(teamSPName),
      isWin: ourTeamId !== null && game.winning_team_id === ourTeamId,
      runDiff: isHome ? game.run_diff : -game.run_diff,
    };
  };

  return (
    <section className="pps-section team-game-log-section">
      <div className="pps-section-header">
        <div>
          <h2 className="pps-section-title">Game Log</h2>
          <p className="pps-section-subtitle">
            {selectedSeason} {getSeasonTypeLabel()} results • {games.length} games
          </p>
        </div>
        <div className="pps-game-log-filters">
          <select
            className="pps-season-type-filter"
            value={seasonType}
            onChange={handleSeasonTypeChange}
            disabled={loading}
          >
            {availableSeasonTypes.includes('R') && (
              <option value="R">Regular Season</option>
            )}
            {availableSeasonTypes.includes('S') && (
              <option value="S">Spring Training</option>
            )}
            {availableSeasonTypes.includes('P') && (
              <option value="P">Postseason</option>
            )}
          </select>
        </div>
      </div>

      <div className="pps-game-log-container" style={{ position: 'relative' }}>
        {loading && (
          <div className="tgl-loading-overlay">
            <div className="tgl-spinner" />
            <span>Loading {getSeasonTypeLabel()} games…</span>
          </div>
        )}
        {!loading && games.length > 0 ? (
          <>
            <div className="pps-game-log-table-wrapper">
              <table className="pps-game-log-table team-game-log-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Result</th>
                    <th>Score</th>
                    <th>Starter</th>
                    <th>H</th>
                    <th>E</th>
                    <th>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const startIndex = (page - 1) * gamesPerPage;
                    const endIndex = startIndex + gamesPerPage;
                    const paginatedGames = games.slice(startIndex, endIndex);
                    
                    return paginatedGames.map((game, idx) => {
                      const gameData = getTeamGameData(game);
                      const result = gameData.isWin ? 'W' : 'L';
                      const resultClass = gameData.isWin ? 'win' : 'loss';
                      
                      // Format date — parse as local (not UTC) to avoid off-by-one day
                      const [_y, _m, _d] = (game.date || '').split('-').map(Number);
                      const gameDate = new Date(_y, _m - 1, _d);
                      const formattedDate = gameDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      });
                      
                      // Home/Away indicator
                      const homeAwayIndicator = gameData.isHome ? 'vs' : '@';
                      
                      return (
                        <tr
                          key={game.game_pk || game.id || idx}
                          onClick={() => handleGameRowClick(game)}
                          className="pps-game-log-row-link"
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="pps-game-date">{formattedDate}</td>
                          <td className="pps-game-opponent">
                            <span className="pps-home-away-indicator">{homeAwayIndicator}</span>
                            <span>{gameData.opponent}</span>
                          </td>
                          <td className={`pps-game-result ${resultClass}`}>{result}</td>
                          <td className="pps-game-score">
                            <span className={resultClass}>{gameData.teamScore}</span>-<span>{gameData.oppScore}</span>
                          </td>
                          <td className="pps-game-starter">
                            {gameData.teamSP && gameData.teamSPSlug ? (
                              <span
                                className="clickable-player-name"
                                onClick={(e) => { e.stopPropagation(); handlePlayerClick(gameData.teamSPSlug); }}
                                title={`View ${gameData.teamSP} profile`}
                              >
                                {gameData.teamSP}
                              </span>
                            ) : gameData.teamSP || '-'}
                          </td>
                          <td className={gameData.teamHits >= 10 ? 'pps-highlight' : ''}>{gameData.teamHits}</td>
                          <td className={gameData.teamErrors > 0 ? 'pps-danger' : ''}>{gameData.teamErrors}</td>
                          <td className={gameData.runDiff > 0 ? 'pps-positive' : gameData.runDiff < 0 ? 'pps-negative' : ''}>
                            {gameData.runDiff > 0 ? '+' : ''}{gameData.runDiff}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {games.length > gamesPerPage && (
              <div className="pps-pagination">
                <button 
                  className="pps-pagination-btn"
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span className="pps-pagination-info">
                  Page {page} of {Math.ceil(games.length / gamesPerPage)} ({games.length} games)
                </span>
                <button 
                  className="pps-pagination-btn"
                  onClick={() => setPage(prev => Math.min(Math.ceil(games.length / gamesPerPage), prev + 1))}
                  disabled={page >= Math.ceil(games.length / gamesPerPage)}
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
              No {getSeasonTypeLabel().toLowerCase()} games found for {currentTeamName} in {selectedSeason}.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});

export default TeamGameLogSection;
