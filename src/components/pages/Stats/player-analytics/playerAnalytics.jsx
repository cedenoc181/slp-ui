import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BatterStats from './batterStats';
import PitcherStats from './pitcherStats';
import '../../../../styles/stats-page-styling/player-analytics.css';

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

  const currentTeamName = teams.find((t) => t.id === selectedTeam)?.name || 'Team';

  return (
    <div className="player-analytics-page">
      <div className="analytics-header player-analytics-header">
        <div className="container">
          <div className="header-content">
            <div className="team-selector-wrapper">
              <h1>{currentTeamName}</h1>
              <div className="team-selector-row">
                <div className="team-selector">
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="team-dropdown player-team-dropdown"
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
                    className="pa-season-dropdown"
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
      {metricType === 'batting' ? (
        <BatterStats teamId={selectedTeam} season={selectedSeason} teamName={currentTeamName} />
      ) : (
        <PitcherStats teamId={selectedTeam} season={selectedSeason} teamName={currentTeamName} />
      )}
    </div>
  );
}

export default PlayerAnalytics;
