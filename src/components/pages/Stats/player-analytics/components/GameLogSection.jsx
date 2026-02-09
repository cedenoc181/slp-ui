import React, { memo, useState, useCallback } from 'react';

/**
 * Game Log Section Component
 * Displays paginated game logs with season type filter
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
  const [gameLogPage, setGameLogPage] = useState(1);
  
  // Reset page when season type changes
  const handleSeasonTypeChange = useCallback((e) => {
    setGameLogSeasonType(e.target.value);
    setGameLogPage(1);
  }, [setGameLogSeasonType]);

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
                        <tr key={game.game_pk}>
                          <td className="pps-game-date">{formattedDate}</td>
                          <td className="pps-game-opponent">
                            <span className="pps-home-away-indicator">{game.is_home ? 'vs' : '@'}</span>
                            {game.opponent}
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
