import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BatterStats from './batterStats';
import PitcherStats from './pitcherStats';
import '../../../../styles/stats-page-styling/player-analytics.css';

// MLB Team IDs for logos
const TEAM_MLB_IDS = {
  'ALL': null,
  'LAD': 119,
  'NYY': 147,
  'HOU': 117,
  'ATL': 144,
  'BAL': 110,
  'TBR': 139,
  'TOR': 141,
  'BOS': 111,
};

function PlayerAnalytics() {
  const [metricType, setMetricType] = useState('batting');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedSeason, setSelectedSeason] = useState('2025');
  const [searchParams] = useSearchParams();

  const teams = useMemo(
    () => [
      { id: 'ALL', name: 'MLB (All Teams)' },
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

  const seasons = useMemo(
    () => ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'],
    []
  );

  // Seed dropdowns from query params when present
  useEffect(() => {
    const teamParam = searchParams.get('team');
    const seasonParam = searchParams.get('season');

    if (teamParam && teams.some((t) => t.id === teamParam)) {
      setSelectedTeam(teamParam);
    }

    if (seasonParam && seasons.includes(seasonParam)) {
      setSelectedSeason(seasonParam);
    }
  }, [searchParams, teams, seasons]);

  // Get current team object
  const currentTeam = useMemo(() => {
    const team = teams.find((t) => t.id === selectedTeam);
    if (team) {
      return {
        ...team,
        mlbId: TEAM_MLB_IDS[team.id]
      };
    }
    return null;
  }, [selectedTeam, teams]);

  return (
    <div className="player-analytics-page">
      {/* Header - Mirrored from Team Analytics */}
      <div className="analytics-header">
        <div className="container">
          <div className="header-content">
            <div className="team-selector-wrapper">
              <div className="team-header-inline">
                {currentTeam?.mlbId && (
                  <img
                    src={`https://www.mlbstatic.com/team-logos/${currentTeam.mlbId}.svg`}
                    alt={`${currentTeam.name} logo`}
                    className="team-logo-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <h1>Player Analytics</h1>
              </div>
              <div className="selectors-row">
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

                <div className="season-selector">
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="season-dropdown"
                  >
                    {seasons.map((season) => (
                      <option key={season} value={season}>
                        {season}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="timeframe-tabs">
              <button
                className={`tab ${metricType === 'batting' ? 'active' : ''}`}
                onClick={() => setMetricType('batting')}
              >
                Batting
              </button>
              <button
                className={`tab ${metricType === 'pitching' ? 'active' : ''}`}
                onClick={() => setMetricType('pitching')}
              >
                Pitching
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="analytics-content container">
        {metricType === 'batting' ? (
          <BatterStats teamId={selectedTeam} season={selectedSeason} />
        ) : (
          <PitcherStats teamId={selectedTeam} season={selectedSeason} />
        )}
      </div>
    </div>
  );
}

export default PlayerAnalytics;
