import React from 'react';
import { TEAMS, SEASONS } from '../../../../../data/constants/apiConstants';

/**
 * Team Analytics page header with team/season selectors and timeframe tabs
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
}) {
  return (
    <div className="analytics-header">
      <div className="container">
        <div className="header-content">
          <div className="team-selector-wrapper">
            <div className="team-header-inline">
              <img 
                src={`https://www.mlbstatic.com/team-logos/${currentTeam?.mlbId}.svg`} 
                alt={`${currentTeamName} logo`}
                className="team-logo-image"
              />
              <h1>{currentTeamName}</h1>
            </div>
            <div className="selectors-row">
              <div className="team-selector">
                <select 
                  value={selectedTeam} 
                  onChange={(e) => handleTeamChange(e.target.value)}
                  className="team-dropdown"
                >
                  {TEAMS.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div className="season-selector">
                <select 
                  value={selectedSeason} 
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="season-dropdown"
                >
                  {SEASONS.map(season => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}

export default TeamAnalyticsHeader;
