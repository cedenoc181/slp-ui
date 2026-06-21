// ============================================================================
// TOP BATTERS LIST COMPONENT
// ============================================================================
// Displays ranked list of top batters with stats and trade/acquired badges.
// Shows HR, AVG, and OPS for each player.
// ============================================================================

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatAvg, formatOps, getPlayerStatusInfo } from '../../shared/utils';

function TopBattersList({
  topListTitle,
  isTeamSelected,
  topBattersLoading,
  topBattersError,
  topBattersData,
  visibleTopBatters,
  season,
}) {
  // Render a single batter item
  const renderBatterItem = useCallback((batter, idx) => {
    if (!batter) return null;

    const playerId = batter.id || batter.player_id;
    const playerMlbId = batter.player_mlb_id || batter.mlb_id;
    const playerSlug = batter.name_slug || playerMlbId;
    const playerName = batter.player_name || 'Unknown';
    const homeRuns = batter.home_runs ?? 0;
    const avg = formatAvg(batter.avg);
    const ops = formatOps(batter.ops);
    const key = playerId ? `batter-${playerId}` : `batter-idx-${idx}`;

    // Get player status info (traded, released, acquired, etc.)
    const statusInfo = getPlayerStatusInfo(batter);

    return (
      <li
        key={key}
        className={`batter-top-list-item${statusInfo.statusClass}`}
        title={statusInfo.tooltip}
      >
        <div className="batter-top-rank">#{idx + 1}</div>
        <div className="batter-top-info">
          <div className="batter-top-name">
            <Link
              to={`/player/${playerSlug}?season=${season}`}
              className="player-profile-link"
              onClick={() => window.scrollTo(0, 0)}
            >
              {playerName}
            </Link>
            {statusInfo.badgeText && (
              <span className={statusInfo.badgeClass}>
                {statusInfo.badgeText}
              </span>
            )}
          </div>
        </div>
        <div className="batter-top-stats">
          <span>HR {homeRuns}</span>
          <span>AVG {avg}</span>
          <span>OPS {ops}</span>
        </div>
      </li>
    );
  }, [season]);

  return (
    <div className="batter-top-card">
      <div className="batter-top-list-header">
        <h2>{topListTitle}</h2>
        <p className="eyebrow">
          {isTeamSelected ? 'Top Batters' : 'Top 10 MLB Batters'}
        </p>
      </div>

      {topBattersLoading && (
        <div className="batter-loading">
          <div className="loading-spinner"></div>
          <span>Loading top batters...</span>
        </div>
      )}

      {topBattersError && !topBattersLoading && (
        <div className="batter-empty">{topBattersError}</div>
      )}

      {!topBattersLoading && !topBattersError && topBattersData.length === 0 && (
        <div className="batter-empty">No batter leaderboard data.</div>
      )}

      {!topBattersLoading && !topBattersError && visibleTopBatters.length > 0 && (
        <ol className="batter-top-list-items">
          {visibleTopBatters.map(renderBatterItem)}
        </ol>
      )}
    </div>
  );
}

export default TopBattersList;
