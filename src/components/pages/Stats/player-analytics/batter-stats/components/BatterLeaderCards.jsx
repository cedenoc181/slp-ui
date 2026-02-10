// ============================================================================
// BATTER LEADER CARDS COMPONENT
// ============================================================================
// Displays leader cards grid for batting categories.
// Shows player headshot, name, team, and stat value.
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { getPlayerHeadshotUrl } from '../../shared/utils';

function BatterLeaderCards({
  leadersTitle,
  season,
  isTeamSelected,
  leadersLoading,
  leaderCategories,
}) {
  return (
    <div className="batter-leader-grid">
      <div className="batter-leader-grid-header">
        <h3>{leadersTitle}</h3>
        <p className="eyebrow">{season} Season</p>
      </div>
      {leadersLoading ? (
        <div className="batter-loading">
          <div className="loading-spinner"></div>
          <span>Loading {isTeamSelected ? 'team' : 'league'} leaders...</span>
        </div>
      ) : leaderCategories.length > 0 ? (
        <div className="batter-leader-cards">
          {leaderCategories.map((cat, idx) => (
            <div key={idx} className="batter-card">
              <div className="batter-card-top">
                <span className="batter-category">{cat.category}</span>
                <span className="batter-stat-label">{cat.statLabel}</span>
              </div>
              <div className="batter-card-body">
                {cat.playerMlbId && (
                  <div className="batter-card-photo">
                    <img
                      src={getPlayerHeadshotUrl(cat.playerMlbId)}
                      alt={cat.player}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <Link
                  to={`/player/${cat.playerSlug}?season=${season}`}
                  className="player-profile-link"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  <span className="batter-player">{cat.player}</span>
                </Link>
                {!isTeamSelected && cat.team && typeof cat.team === 'string' && (
                  <span className="batter-team">{cat.team}</span>
                )}
                <span className="batter-value">{cat.value}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="batter-empty">
          No {isTeamSelected ? 'team' : 'league'} leader data available for {season}.
        </div>
      )}
    </div>
  );
}

export default BatterLeaderCards;
