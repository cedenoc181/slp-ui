import React, { useState, useMemo } from 'react';
import '../../../../styles/stats-page-styling/player-analytics.css';

function PlayerAnalytics() {
  const [metricType, setMetricType] = useState('batting');
  const [selectedTeam, setSelectedTeam] = useState('LAD');

  const teams = useMemo(
    () => [
      { id: 'LAD', name: 'Los Angeles Dodgers' },
      { id: 'NYY', name: 'New York Yankees' },
      { id: 'HOU', name: 'Houston Astros' },
      { id: 'ATL', name: 'Atlanta Braves' },
      { id: 'BAL', name: 'Baltimore Orioles' },
      { id: 'TBR', name: 'Tampa Bay Rays' },
      { id: 'TOR', name: 'Toronto Blue Jays' },
      { id: 'BOS', name: 'Boston Red Sox' },
    ],
    []
  );

  const currentTeamName = teams.find((t) => t.id === selectedTeam)?.name || 'Team';

  return (
    <div className="player-analytics-page">
      <div className="analytics-header player-analytics-header">
        <div className="container">
          <div className="header-content">
            <div className="team-selector-wrapper">
              <h1>{currentTeamName}</h1>
              <div className="team-selector">
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="team-dropdown"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="timeframe-tabs" aria-label="Toggle batting or pitching leaders">
              <button
                className={`tab ${metricType === 'batting' ? 'active' : ''}`}
                onClick={() => setMetricType('batting')}
              >
                Batting Metrics
              </button>
              <button
                className={`tab ${metricType === 'pitching' ? 'active' : ''}`}
                onClick={() => setMetricType('pitching')}
              >
                Pitching Metrics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerAnalytics;
