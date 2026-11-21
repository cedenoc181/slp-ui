import React from 'react';
import { SEASONS } from '../../../../../data/constants/apiConstants';
import { MLB_TEAM_GROUPS, WINTER_ENABLED, getLeague } from '../../../../../data/constants/leagues';
import LeagueTabs from '../../../../LeagueTabs';

/**
 * Team Analytics page header with league tabs, team/season selectors and
 * timeframe tabs. Non-MLB leagues show disabled selectors until their data is live.
 */
function TeamAnalyticsHeader({
  currentTeam,
  currentTeamName,
  selectedTeam,
  selectedSeason,
  timeframe,
  setTimeframe,
  handleTeamChange,
  setSelectedSeason,
  league = 'mlb',
  onLeagueChange,
}) {
  const isMlb = league === 'mlb';
  const leagueInfo = getLeague(league);

  return (
    <div className="analytics-header">
      <div className="container">
        {onLeagueChange && <LeagueTabs value={league} onChange={onLeagueChange} enabled={WINTER_ENABLED} />}
        <div className="header-content">
          <div className="team-selector-wrapper">
            <div className="team-header-inline">
              {isMlb && (
                <img
                  src={`https://www.mlbstatic.com/team-logos/${currentTeam?.mlbId}.svg`}
                  alt={`${currentTeamName} logo`}
                  className="team-logo-image"
                />
              )}
              <h1>{isMlb ? currentTeamName : leagueInfo?.label}</h1>
            </div>
            {/* Winter leagues pick league, season and team in the page body. */}
            {isMlb && (
              <div className="selectors-row">
                <div className="team-selector">
                  <select
                    value={selectedTeam}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="team-dropdown"
                    aria-label="Team"
                  >
                    {MLB_TEAM_GROUPS.map(group => (
                      <optgroup key={group.key} label={group.label}>
                        {group.teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="season-selector">
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="season-dropdown"
                    aria-label="Season"
                  >
                    {SEASONS.map(season => (
                      <option key={season} value={season}>{season}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {isMlb && (
            <div className="timeframe-tabs">
              <button
                className={`tab ${timeframe === 'season' ? 'active' : ''}`}
                onClick={() => setTimeframe('season')}
              >
                Season
              </button>
              <button
                className={`tab ${timeframe === 'first-half' ? 'active' : ''}`}
                onClick={() => setTimeframe('first-half')}
              >
                1st Half
              </button>
              <button
                className={`tab ${timeframe === 'second-half' ? 'active' : ''}`}
                onClick={() => setTimeframe('second-half')}
              >
                2nd Half
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamAnalyticsHeader;
