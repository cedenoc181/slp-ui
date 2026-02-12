import React, { useState, useRef, useEffect } from 'react';
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
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const teamDropdownRef = useRef(null);
  const seasonDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target)) {
        setTeamDropdownOpen(false);
      }
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target)) {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTeamName = TEAMS.find(t => t.id === selectedTeam)?.name || 'Select Team';

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
              {/* Custom Team Dropdown */}
              <div className="team-selector ta-dropdown-wrapper" ref={teamDropdownRef}>
                <button
                  className={`ta-dropdown-btn team-dropdown ${teamDropdownOpen ? 'active' : ''}`}
                  onClick={() => {
                    setTeamDropdownOpen(!teamDropdownOpen);
                    setSeasonDropdownOpen(false);
                  }}
                >
                  {selectedTeamName}
                  <span className={`ta-dropdown-arrow ${teamDropdownOpen ? 'open' : ''}`}>▼</span>
                </button>
                {teamDropdownOpen && (
                  <div className="ta-dropdown-menu">
                    {TEAMS.filter(team => team.id !== selectedTeam).map(team => (
                      <button
                        key={team.id}
                        className="ta-dropdown-item"
                        onClick={() => {
                          handleTeamChange(team.id);
                          setTeamDropdownOpen(false);
                        }}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Season Dropdown */}
              <div className="season-selector ta-dropdown-wrapper" ref={seasonDropdownRef}>
                <button
                  className={`ta-dropdown-btn season-dropdown ${seasonDropdownOpen ? 'active' : ''}`}
                  onClick={() => {
                    setSeasonDropdownOpen(!seasonDropdownOpen);
                    setTeamDropdownOpen(false);
                  }}
                >
                  {selectedSeason}
                  <span className={`ta-dropdown-arrow ${seasonDropdownOpen ? 'open' : ''}`}>▼</span>
                </button>
                {seasonDropdownOpen && (
                  <div className="ta-dropdown-menu">
                    {SEASONS.filter(season => season !== selectedSeason).map(season => (
                      <button
                        key={season}
                        className="ta-dropdown-item"
                        onClick={() => {
                          setSelectedSeason(season);
                          setSeasonDropdownOpen(false);
                        }}
                      >
                        {season}
                      </button>
                    ))}
                  </div>
                )}
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
