// ============================================================================
// HOT BATTERS LIST COMPONENT
// ============================================================================
// Displays hot batters with metric toggle and game-by-game bar charts.
// Shows last 7 days performance for selected metric.
// ============================================================================

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getTeamLogoByName, formatGameDate } from '../../shared/utils';
import { HOT_METRIC_OPTIONS } from '../hooks';

function HotBattersList({
  hotBatsTitle,
  hotMetric,
  setHotMetric,
  hotBattersLoading,
  filteredHotBatters,
  isTeamSelected,
  season,
}) {
  // Get the display label for the current metric
  const metricLabel = HOT_METRIC_OPTIONS.find(opt => opt.key === hotMetric)?.label || 'Total';

  // Render a single hot batter item
  const renderHotBatterItem = useCallback((batter, idx) => {
    if (!batter) return null;

    const playerId = batter.id || batter.player_id;
    const playerMlbId = batter.player_mlb_id || batter.mlb_id;
    const playerSlug = batter.name_slug || playerMlbId;
    const playerName = batter.player_name || 'Unknown';
    const teamNameDisplay = batter.team_name || batter.team?.team_name || '';
    const key = playerId ? `hot-batter-${playerId}` : `hot-batter-idx-${idx}`;

    // Get games data for bar chart (reverse to show oldest to newest left to right)
    const games = batter.games ? [...batter.games].reverse() : [];

    // Calculate max value for scaling bars
    const maxValue = Math.max(...games.map(g => g.value || 0), 1);

    // Get team logo
    const teamLogoUrl = getTeamLogoByName(teamNameDisplay);

    return (
      <div key={key} className="hot-batter-item">
        <div className="hot-batter-header">
          <div className="hot-batter-rank">#{idx + 1}</div>
          {teamLogoUrl && (
            <div className="hot-batter-logo">
              <img
                src={teamLogoUrl}
                alt={teamNameDisplay}
                title={teamNameDisplay}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          <div className="hot-batter-info">
            <span className="hot-batter-name">
              <Link
                to={`/player/${playerSlug}?season=${season}`}
                className="player-profile-link"
                onClick={() => window.scrollTo(0, 0)}
              >
                {playerName}
              </Link>
            </span>
            {!isTeamSelected && teamNameDisplay && typeof teamNameDisplay === 'string' && (
              <span className="hot-batter-team">{teamNameDisplay}</span>
            )}
          </div>
          <div className="hot-batter-total">
            <span className="hot-total-number">{batter.total ?? 0}</span>
            <span className="hot-total-label">{metricLabel}</span>
          </div>
        </div>
        {games.length > 0 && (
          <div className="hot-batter-chart">
            <div className="chart-bars">
              {games.map((game, gameIdx) => (
                <div key={gameIdx} className="chart-bar-container">
                  <div className="chart-bar-wrapper">
                    <span className="chart-bar-value">{game.value}</span>
                    <div
                      className="chart-bar"
                      style={{
                        height: `${Math.max((game.value / maxValue) * 100, 5)}%`,
                        opacity: game.value === 0 ? 0.3 : 1,
                      }}
                    />
                  </div>
                  <span className="chart-bar-date">{formatGameDate(game.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [metricLabel, isTeamSelected, season]);

  return (
    <div className="hot-bats-card">
      <div className="hot-bats-header">
        <div>
          <p className="eyebrow">Recent Performance</p>
          <h3>{hotBatsTitle}</h3>
          <p className="hot-bats-subtitle">Last 7 days performance</p>
        </div>
        <div className="hot-bats-toggle">
          {HOT_METRIC_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`hot-toggle${hotMetric === option.key ? ' active' : ''}`}
              onClick={() => setHotMetric(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="hot-bats-content">
        {hotBattersLoading ? (
          <div className="batter-loading">
            <div className="loading-spinner"></div>
            <span>Loading hot batters...</span>
          </div>
        ) : filteredHotBatters.length > 0 ? (
          <div className="hot-batters-list">
            {filteredHotBatters.map(renderHotBatterItem)}
          </div>
        ) : (
          <div className="batter-empty">No hot bats data available.</div>
        )}
      </div>
    </div>
  );
}

export default HotBattersList;
