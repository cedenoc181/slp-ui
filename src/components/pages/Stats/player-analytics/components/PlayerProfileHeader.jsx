/**
 * ============================================================================
 * PLAYER PROFILE HEADER COMPONENT
 * ============================================================================
 * 
 * PURPOSE:
 * Displays the main player identity section at the top of the Player Profile
 * page. Shows the player's photo, name, team, position, and bio information.
 * 
 * PARENT COMPONENT:
 * - playerProfileStats.jsx (main Player Profile page)
 * 
 * DATA SOURCES:
 * - playerInfo: Player info object from playerStatsService
 * 
 * KEY FEATURES:
 * 1. Player Photo: Headshot from MLB static CDN
 * 2. Jersey Number: Displayed as overlay on photo
 * 3. Player Identity: Name, position, team with logo
 * 4. Status Badge: Active/Inactive or injury status
 * 5. Quick Stats: Bats, Throws, Age, Height, Weight, Debut date
 * 6. TWP Toggle: For two-way players, switch between batting/pitching views
 * 
 * TWO-WAY PLAYER (TWP) SUPPORT:
 * - Shows toggle buttons when isTwoWay is true
 * - Allows switching between batting and pitching views
 * - Toggle state managed by parent via setTwoWayViewMode
 * 
 * EXTERNAL RESOURCES:
 * - Player headshots: MLB static CDN (img.mlbstatic.com)
 * - Team logos: MLB static CDN (www.mlbstatic.com/team-logos)
 * 
 * HELPER FUNCTIONS:
 * - getTeamLogoUrl(teamId): Returns URL for team logo SVG
 * - getPlayerHeadshotUrl(mlbId): Returns URL for player headshot
 * - formatDate: Passed from parent to format debut date
 * 
 * PERFORMANCE NOTES:
 * - Wrapped in React.memo to prevent unnecessary re-renders
 * - Image onError handler hides broken images
 * 
 * ============================================================================
 */

import React, { memo } from 'react';

/**
 * PlayerProfileHeader - Displays player identity and bio information
 * 
 * @param {Object} props
 * @param {Object} props.playerInfo - Player info object with all bio data
 * @param {number} props.playerAge - Calculated player age (fallback for current_age)
 * @param {boolean} props.isTwoWay - Whether player is a two-way player
 * @param {string} props.twoWayViewMode - 'batting' or 'pitching' for TWP
 * @param {Function} props.setTwoWayViewMode - Callback to switch TWP view
 * @param {Function} props.formatDate - Function to format date strings
 */
const PlayerProfileHeader = memo(function PlayerProfileHeader({
  playerInfo,
  playerAge,
  isTwoWay,
  twoWayViewMode,
  setTwoWayViewMode,
  formatDate,
}) {
  // Get team logo URL
  const getTeamLogoUrl = (teamId) => {
    return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
  };

  // Get player headshot URL
  const getPlayerHeadshotUrl = (mlbId) => {
    return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_100/v1/people/${mlbId}/headshot/67/current`;
  };

  if (!playerInfo) return null;

  return (
    <header className="pps-header">
      <div className="pps-container">
        <div className="pps-header-content">
          {/* Player Photo & Basic Info */}
          <div className="pps-player-identity">
            <div className="pps-photo-wrapper">
              <img 
                src={getPlayerHeadshotUrl(playerInfo.player_mlb_id)} 
                alt={playerInfo.full_name || playerInfo.player_name}
                className="pps-player-photo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="pps-jersey-number">#{playerInfo.jersey_number}</div>
            </div>
            
            <div className="pps-name-info">
              <h1 className="pps-player-name">{playerInfo.full_name || playerInfo.player_name}</h1>
              <div className="pps-team-position">
                <span className="pps-position">{playerInfo.position_abbreviation || playerInfo.position}</span>
                <span className="pps-separator">•</span>
                <div className="pps-team-with-logo">
                  {playerInfo.current_team?.mlb_team_id && (
                    <img 
                      src={getTeamLogoUrl(playerInfo.current_team.mlb_team_id)} 
                      alt={playerInfo.current_team?.team_name || ''}
                      className="pps-team-logo"
                    />
                  )}
                  <span className="pps-team">
                    {playerInfo.current_team?.team_name || ''}
                  </span>
                </div>
              </div>
              <div className="pps-status-badge">
                <span className={`pps-status-dot ${playerInfo.injury_status?.toLowerCase() || (playerInfo.active ? 'active' : 'inactive')}`}></span>
                {playerInfo.injury_status || playerInfo.roster_status || (playerInfo.active ? 'Active' : 'Inactive')}
              </div>
              
              {/* Two-Way Player Toggle */}
              {isTwoWay && (
                <div className="pps-twoway-toggle">
                  <button
                    className={`pps-twoway-btn ${twoWayViewMode === 'batting' ? 'active' : ''}`}
                    onClick={() => setTwoWayViewMode('batting')}
                  >
                    ⚾ Batting
                  </button>
                  <button
                    className={`pps-twoway-btn ${twoWayViewMode === 'pitching' ? 'active' : ''}`}
                    onClick={() => setTwoWayViewMode('pitching')}
                  >
                    ⚡ Pitching
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="pps-quick-stats">
            <div className="pps-quick-stat">
              <span className="pps-quick-stat-label">Bats</span>
              <span className="pps-quick-stat-value">{playerInfo.bats === 'L' ? 'Left' : playerInfo.bats === 'R' ? 'Right' : 'Switch'}</span>
            </div>
            <div className="pps-quick-stat">
              <span className="pps-quick-stat-label">Throws</span>
              <span className="pps-quick-stat-value">{playerInfo.throws === 'L' ? 'Left' : 'Right'}</span>
            </div>
            <div className="pps-quick-stat">
              <span className="pps-quick-stat-label">Age</span>
              <span className="pps-quick-stat-value">{playerInfo.current_age || playerAge}</span>
            </div>
            <div className="pps-quick-stat">
              <span className="pps-quick-stat-label">Height</span>
              <span className="pps-quick-stat-value">{playerInfo.height}</span>
            </div>
            <div className="pps-quick-stat">
              <span className="pps-quick-stat-label">Weight</span>
              <span className="pps-quick-stat-value">{playerInfo.weight} lbs</span>
            </div>
            <div className="pps-quick-stat">
              <span className="pps-quick-stat-label">Debut</span>
              <span className="pps-quick-stat-value">{formatDate(playerInfo.mlb_debut_date || playerInfo.debut_date)}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});

export default PlayerProfileHeader;
