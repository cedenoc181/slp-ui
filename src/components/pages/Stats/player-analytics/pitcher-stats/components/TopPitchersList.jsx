// ============================================================================
// TOP PITCHERS LIST COMPONENT
// ============================================================================
// Displays ranked list of top pitchers with stats and trade/acquired badges.
// Shows ERA, Wins, and WHIP for each player.
// ============================================================================

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatEra, formatWhip, getPlayerStatusInfo } from '../../shared/utils';

function TopPitchersList({
  topListTitle,
  isTeamSelected,
  topPitchersLoading,
  topPitchersError,
  topPitchersData,
  visibleTopPitchers,
  season,
}) {
  // Render a single pitcher item
  const renderPitcherItem = useCallback((pitcher, idx) => {
    if (!pitcher) return null;

    const playerId = pitcher.id || pitcher.player_id;
    const playerMlbId = pitcher.player_mlb_id;
    const playerSlug = pitcher.name_slug || playerMlbId;
    const playerName = pitcher.player_name || 'Unknown';
    const era = formatEra(pitcher.era);
    const wins = pitcher.wins ?? 0;
    const whip = formatWhip(pitcher.whip);
    const key = playerId ? `pitcher-${playerId}` : `pitcher-idx-${idx}`;

    // Get player status info (traded, released, acquired, etc.)
    const statusInfo = getPlayerStatusInfo(pitcher);

    return (
      <li
        key={key}
        className={`pitcher-top-list-item${statusInfo.statusClass}`}
        title={statusInfo.tooltip}
      >
        <div className="pitcher-top-rank">#{idx + 1}</div>
        <div className="pitcher-top-info">
          <div className="pitcher-top-name">
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
        <div className="pitcher-top-stats">
          <span>ERA {era}</span>
          <span>W {wins}</span>
          <span>WHIP {whip}</span>
        </div>
      </li>
    );
  }, [season]);

  return (
    <div className="pitcher-top-card">
      <div className="pitcher-top-list-header">
        <h2>{topListTitle}</h2>
        <p className="eyebrow">
          {isTeamSelected ? 'Starting Pitchers' : 'Top 10 MLB Pitchers'}
        </p>
      </div>

      {topPitchersLoading && (
        <div className="pitcher-loading">
          <div className="loading-spinner"></div>
          <span>Loading top pitchers...</span>
        </div>
      )}

      {topPitchersError && !topPitchersLoading && (
        <div className="pitcher-empty">{topPitchersError}</div>
      )}

      {!topPitchersLoading && !topPitchersError && topPitchersData.length === 0 && (
        <div className="pitcher-empty">No pitcher leaderboard data.</div>
      )}

      {!topPitchersLoading && !topPitchersError && visibleTopPitchers.length > 0 && (
        <ol className="pitcher-top-list-items">
          {visibleTopPitchers.map(renderPitcherItem)}
        </ol>
      )}
    </div>
  );
}

export default TopPitchersList;
