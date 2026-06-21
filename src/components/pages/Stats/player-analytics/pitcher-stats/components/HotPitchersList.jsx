// ============================================================================
// HOT PITCHERS LIST COMPONENT
// ============================================================================
// Displays hot pitchers with metric toggle and game-by-game bar charts.
// Shows last 5 games performance for selected metric.
// ============================================================================

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getTeamLogoByName, formatGameDate } from '../../shared/utils';
import { HOT_METRIC_OPTIONS } from '../hooks';

function HotPitchersList({
  hotArmsTitle,
  hotMetric,
  setHotMetric,
  hotPitchersLoading,
  filteredHotPitchers,
  isTeamSelected,
  season,
}) {
  // Get the display label for the current metric
  const metricLabel = HOT_METRIC_OPTIONS.find(opt => opt.key === hotMetric)?.label || 'Total';

  // Render a single hot pitcher item
  const renderHotPitcherItem = useCallback((pitcher, idx) => {
    if (!pitcher) return null;

    const playerId = pitcher.id || pitcher.player_id;
    const playerMlbId = pitcher.player_mlb_id;
    const playerSlug = pitcher.name_slug || playerMlbId;
    const playerName = pitcher.player_name || 'Unknown';
    const teamNameDisplay = pitcher.team_name || pitcher.team?.team_name || '';
    const key = playerId ? `hot-pitcher-${playerId}` : `hot-pitcher-idx-${idx}`;

    // Get games data for bar chart (reverse to show oldest to newest left to right)
    const games = pitcher.games ? [...pitcher.games].reverse() : [];

    // Calculate max value for scaling bars
    const maxValue = Math.max(...games.map(g => g.value || 0), 1);

    // Get team logo
    const teamLogoUrl = getTeamLogoByName(teamNameDisplay);

    return (
      <div key={key} className="hot-pitcher-item">
        <div className="hot-pitcher-header">
          <div className="hot-pitcher-rank">#{idx + 1}</div>
          {teamLogoUrl && (
            <div className="hot-pitcher-logo">
              <img
                src={teamLogoUrl}
                alt={teamNameDisplay}
                title={teamNameDisplay}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          <div className="hot-pitcher-info">
            <span className="hot-pitcher-name">
              <Link
                to={`/player/${playerSlug}?season=${season}`}
                className="player-profile-link"
                onClick={() => window.scrollTo(0, 0)}
              >
                {playerName}
              </Link>
            </span>
            {!isTeamSelected && teamNameDisplay && (
              <span className="hot-pitcher-team">{teamNameDisplay}</span>
            )}
          </div>
          <div className="hot-pitcher-total">
            <span className="hot-total-number">{pitcher.total ?? 0}</span>
            <span className="hot-total-label">{metricLabel}</span>
          </div>
        </div>
        {games.length > 0 && (
          <div className="hot-pitcher-chart">
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
    <div className="hot-arms-card">
      <div className="hot-arms-header">
        <div>
          <p className="eyebrow">Recent Performance</p>
          <h3>{hotArmsTitle}</h3>
          <p className="hot-arms-subtitle">Last 5 games performance</p>
        </div>
        <div className="hot-arms-toggle">
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
      <div className="hot-arms-content">
        {hotPitchersLoading ? (
          <div className="pitcher-loading">
            <div className="loading-spinner"></div>
            <span>Loading hot pitchers...</span>
          </div>
        ) : filteredHotPitchers.length > 0 ? (
          <div className="hot-pitchers-list">
            {filteredHotPitchers.map(renderHotPitcherItem)}
          </div>
        ) : (
          <div className="pitcher-empty">No hot arms data available.</div>
        )}
      </div>
    </div>
  );
}

export default HotPitchersList;
