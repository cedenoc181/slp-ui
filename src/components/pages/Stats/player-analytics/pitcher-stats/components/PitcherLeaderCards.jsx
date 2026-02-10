// ============================================================================
// PITCHER LEADER CARDS COMPONENT
// ============================================================================
// Displays leader cards grid for pitching categories.
// Shows player headshot, name, team, and stat value.
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { getPlayerHeadshotUrl } from '../../shared/utils';

function PitcherLeaderCards({
  leadersTitle,
  season,
  isTeamSelected,
  leadersLoading,
  leaderCategories,
}) {
  return (
    <div className="pitcher-leader-grid">
      <div className="pitcher-leader-grid-header">
        <h3>{leadersTitle}</h3>
        <p className="eyebrow">{season} Season</p>
      </div>
      {leadersLoading ? (
        <div className="pitcher-loading">
          <div className="loading-spinner"></div>
          <span>Loading {isTeamSelected ? 'team' : 'league'} leaders...</span>
        </div>
      ) : leaderCategories.length > 0 ? (
        <div className="pitcher-leader-cards">
          {leaderCategories.map((cat, idx) => (
            <div key={idx} className={`pitcher-card ${idx === 0 ? 'pitcher-card-featured' : ''}`}>
              <div className="pitcher-card-top">
                <span className="pitcher-category">{cat.category}</span>
                <span className="pitcher-stat-label">{cat.statLabel}</span>
              </div>
              <div className="pitcher-card-body">
                {cat.playerMlbId && (
                  <div className="pitcher-card-photo">
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
                  <span className="pitcher-player">{cat.player}</span>
                </Link>
                {!isTeamSelected && cat.team && (
                  <span className="pitcher-team">{cat.team}</span>
                )}
              </div>
              <div className="pitcher-value">{cat.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="pitcher-empty">
          No {isTeamSelected ? 'team' : 'league'} leader data available for {season}.
        </div>
      )}
    </div>
  );
}

export default PitcherLeaderCards;
