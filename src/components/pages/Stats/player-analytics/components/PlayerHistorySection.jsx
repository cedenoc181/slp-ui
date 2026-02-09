/**
 * ============================================================================
 * PLAYER HISTORY SECTION COMPONENT
 * ============================================================================
 * 
 * PURPOSE:
 * Displays the player's career journey through different teams and their
 * injury history. This provides context about a player's experience and
 * durability/health track record.
 * 
 * PARENT COMPONENT:
 * - playerProfileStats.jsx (main Player Profile page)
 * 
 * DATA SOURCES:
 * - teamHistory: Array of roster entries from rosterService.getPlayerRosterHistory()
 * - injuryHistory: Array of IL stints from injuryService
 * - playerInfo: Player info for fallback current team display
 * 
 * KEY FEATURES:
 * 1. Team Timeline: Visual timeline showing teams played for with tenure info
 * 2. Injury List: Chronological list of IL stints with recovery status
 * 3. Responsive Layout: Two-column layout on desktop, stacked on mobile
 * 4. Team Navigation: Click on a team to view their Team Analytics page
 * 
 * TEAM HISTORY LOGIC:
 * - Groups roster entries by team_id
 * - Calculates year ranges (e.g., "2019 - Present")
 * - Shows total games played per team
 * - Sorts by most recent first
 * - Clicking a team navigates to /team-analytics/{urlName}?season={endYear}
 * 
 * INJURY HISTORY LOGIC:
 * - Shows injury description, date, and duration
 * - Indicates if injury is still active (no activation_date)
 * - Falls back to "No injury history" if empty
 * 
 * HELPER FUNCTIONS REQUIRED (from parent):
 * - getTeamLogoUrl(mlbTeamId): Returns URL for team logo image
 * 
 * DEPENDENCIES:
 * - TEAM_METADATA from apiConstants for MLB team ID lookup and urlName
 * - useNavigate from react-router-dom for team navigation
 * 
 * PERFORMANCE NOTES:
 * - Wrapped in React.memo to prevent unnecessary re-renders
 * - Team grouping logic runs on each render but data is usually small
 * 
 * ============================================================================
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TEAM_METADATA } from '../../../../../data/constants/apiConstants';

/**
 * PlayerHistorySection - Displays team history timeline and injury history
 * 
 * @param {Object} props
 * @param {Array} props.teamHistory - Array of roster entries with team info per season
 * @param {Array} props.injuryHistory - Array of injury/IL stint records
 * @param {Object} props.playerInfo - Player info object for fallback display
 * @param {Function} props.getTeamLogoUrl - Function to get team logo URL from MLB team ID
 */
const PlayerHistorySection = React.memo(function PlayerHistorySection({
  teamHistory,
  injuryHistory,
  playerInfo,
  getTeamLogoUrl,
}) {
  const navigate = useNavigate();

  /**
   * Navigates to the Team Analytics page for the selected team
   * Uses the later year (endYear) of the player's tenure for the season param
   * Scrolls to top of page after navigation
   * 
   * @param {string} teamAbbreviation - Team abbreviation (e.g., "NYY", "LAD")
   * @param {number} endYear - The most recent year of the player's tenure with this team
   */
  const handleTeamClick = (teamAbbreviation, endYear) => {
    const teamData = TEAM_METADATA[teamAbbreviation];
    if (teamData?.urlName) {
      navigate(`/team-analytics/${teamData.urlName}?season=${endYear}`);
      window.scrollTo(0, 0);
    }
  };

  /**
   * Groups roster history by team and calculates tenure statistics
   * Returns array sorted by most recent team first
   */
  const getGroupedTeamHistory = () => {
    // Reduce roster entries into grouped team objects
    const teamHistoryData = teamHistory.reduce((acc, season) => {
      const teamId = season.team_id;
      const teamAbbr = season.team_abbreviation;
      // Look up MLB team ID from TEAM_METADATA using abbreviation (for logo URL)
      const mlbTeamId = TEAM_METADATA[teamAbbr]?.mlbId;
      const teamName = season.team_name || 'Unknown Team';
      const year = season.season;
      const gamesPlayed = season.games_played || 0;
      
      if (!teamId) return acc;
      
      // Initialize team entry if first occurrence
      if (!acc[teamId]) {
        acc[teamId] = {
          teamId,
          mlbTeamId,
          teamName,
          teamAbbreviation: teamAbbr,
          seasons: [],
          totalGames: 0,
        };
      }
      
      // Add season and accumulate games
      acc[teamId].seasons.push(year);
      acc[teamId].totalGames += gamesPlayed;
      return acc;
    }, {});

    // Convert to array with calculated year ranges, sorted by most recent
    return Object.values(teamHistoryData)
      .map(team => ({
        ...team,
        startYear: Math.min(...team.seasons),
        endYear: Math.max(...team.seasons),
        seasonCount: team.seasons.length,
      }))
      .sort((a, b) => b.endYear - a.endYear);
  };

  const groupedTeams = getGroupedTeamHistory();
  const currentYear = new Date().getFullYear();

  return (
    <div className="pps-two-column">
      {/* ========== TEAM HISTORY SECTION ========== */}
      <section className="pps-section">
        <div className="pps-section-header">
          <div>
            <h2 className="pps-section-title">Team History</h2>
            <p className="pps-section-subtitle">Career journey</p>
          </div>
        </div>
        
        <div className="pps-timeline">
          {groupedTeams.length > 0 ? (
            // Render grouped team timeline
            groupedTeams.map((team, idx) => (
              <div 
                key={team.teamId} 
                className={`pps-timeline-item ${idx === 0 ? 'current' : ''}`}
                onClick={() => handleTeamClick(team.teamAbbreviation, team.endYear)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleTeamClick(team.teamAbbreviation, team.endYear);
                  }
                }}
                title={`View ${team.teamName} ${team.endYear} season`}
              >
                {/* Timeline dot marker */}
                <div className="pps-timeline-marker"></div>
                
                <div className="pps-timeline-content">
                  {/* Team info with logo */}
                  <div className="pps-timeline-team">
                    {team.mlbTeamId && (
                      <img 
                        src={getTeamLogoUrl(team.mlbTeamId)} 
                        alt={team.teamName}
                        className="pps-timeline-team-logo"
                      />
                    )}
                    <div className="pps-timeline-team-info">
                      <span className="pps-timeline-team-name">{team.teamName}</span>
                      <span className="pps-timeline-years">
                        {/* Show year range: single year, range, or "Present" for current */}
                        {team.startYear === team.endYear 
                          ? team.startYear 
                          : `${team.startYear} - ${idx === 0 && team.endYear >= currentYear ? 'Present' : team.endYear}`
                        }
                      </span>
                    </div>
                  </div>
                  
                  {/* Team tenure stats */}
                  <div className="pps-timeline-stats">
                    <span>{team.seasonCount} season{team.seasonCount !== 1 ? 's' : ''}</span>
                    {team.totalGames > 0 && (
                      <>
                        <span className="pps-separator">•</span>
                        <span>{team.totalGames} G</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Fallback: Show current team if no roster history available
            (() => {
              // Find team abbreviation from TEAM_METADATA by matching mlbId or team name
              const currentTeamAbbr = Object.keys(TEAM_METADATA).find(
                abbr => TEAM_METADATA[abbr].mlbId === playerInfo?.current_team?.mlb_team_id
              );
              const currentSeason = new Date().getFullYear();
              
              return (
                <div 
                  className="pps-timeline-item current"
                  onClick={() => currentTeamAbbr && handleTeamClick(currentTeamAbbr, currentSeason)}
                  style={{ cursor: currentTeamAbbr ? 'pointer' : 'default' }}
                  role={currentTeamAbbr ? 'button' : undefined}
                  tabIndex={currentTeamAbbr ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (currentTeamAbbr && (e.key === 'Enter' || e.key === ' ')) {
                      handleTeamClick(currentTeamAbbr, currentSeason);
                    }
                  }}
                  title={currentTeamAbbr ? `View ${playerInfo?.current_team?.team_name} ${currentSeason} season` : undefined}
                >
                  <div className="pps-timeline-marker"></div>
                  <div className="pps-timeline-content">
                    <div className="pps-timeline-team">
                      {playerInfo?.current_team?.mlb_team_id && (
                        <img 
                          src={getTeamLogoUrl(playerInfo.current_team.mlb_team_id)} 
                          alt={playerInfo.current_team?.team_name || ''}
                          className="pps-timeline-team-logo"
                        />
                      )}
                      <div className="pps-timeline-team-info">
                        <span className="pps-timeline-team-name">
                          {playerInfo?.current_team?.team_name || 'Current Team'}
                        </span>
                        <span className="pps-timeline-years">
                          {playerInfo?.first_active_season 
                            ? `${playerInfo.first_active_season} - Present` 
                            : 'Present'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {/* ========== INJURY HISTORY SECTION ========== */}
      <section className="pps-section">
        <div className="pps-section-header">
          <div>
            <h2 className="pps-section-title">Injury History</h2>
            <p className="pps-section-subtitle">IL stints & recovery</p>
          </div>
        </div>
        
        <div className="pps-injury-list">
          {injuryHistory.length > 0 ? (
            // Render injury list
            injuryHistory.map((injury, idx) => {
              // Injury is active if there's no activation (return from IL) date
              const isActive = !injury.activation_date;
              
              // Format injury description - capitalize first letter
              const injuryDesc = injury.injury_desc 
                ? injury.injury_desc.charAt(0).toUpperCase() + injury.injury_desc.slice(1)
                : 'Injury';
              
              return (
                <div key={injury.id || idx} className="pps-injury-item">
                  {/* Injury date column */}
                  <div className="pps-injury-date">
                    <span className="pps-injury-month">
                      {new Date(injury.injury_date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="pps-injury-year">
                      {injury.season || new Date(injury.injury_date).getFullYear()}
                    </span>
                  </div>
                  
                  {/* Injury details column */}
                  <div className="pps-injury-details">
                    <span className="pps-injury-type">{injuryDesc}</span>
                    <span className="pps-injury-duration">
                      {/* Show days on IL or injury period */}
                      {injury.days_on_il ? `${injury.days_on_il} days` : injury.injury_period || 'IL'}
                    </span>
                  </div>
                  
                  {/* Recovery status badge */}
                  <div className={`pps-injury-status ${isActive ? 'active' : 'recovered'}`}>
                    <span>{isActive ? 'Active' : 'Recovered'}</span>
                  </div>
                </div>
              );
            })
          ) : (
            // No injury history placeholder
            <div className="pps-no-injuries-note">
              <span>✓ No injury history available</span>
            </div>
          )}
          
          {/* Additional note if player has no active injuries but has history */}
          {!playerInfo?.is_injured && injuryHistory.length > 0 && (
            <div className="pps-no-injuries-note">
              <span>✓ No active injuries</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
});

export default PlayerHistorySection;
