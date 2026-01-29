import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BatterStats from './batterStats';
import PitcherStats from './pitcherStats';
import { 
  TEAMS, 
  SEASONS,
  getTeamByAbbr,
  getTeamIdFromAbbr,
} from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/player-analytics.css';

function PlayerAnalytics() {
  const [metricType, setMetricType] = useState('batting');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL params or defaults
  const [selectedTeam, setSelectedTeam] = useState(() => {
    const teamParam = searchParams.get('team');
    if (teamParam && (teamParam === 'ALL' || TEAMS.some((t) => t.id === teamParam))) {
      return teamParam;
    }
    return 'ALL';
  });
  
  const [selectedSeason, setSelectedSeason] = useState(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam)) {
      return seasonParam;
    }
    return '2025';
  });

  // Add "All Teams" option to the teams list
  const teamsWithAll = useMemo(() => {
    return [
      { id: 'ALL', name: 'MLB (All Teams)', mlbId: null, urlName: 'all-teams' },
      ...TEAMS
    ];
  }, []);

  // Sync state FROM URL params when they change externally (e.g., navigation from Team Analytics)
  useEffect(() => {
    const teamParam = searchParams.get('team');
    const seasonParam = searchParams.get('season');

    if (teamParam) {
      const isValidTeam = teamParam === 'ALL' || TEAMS.some((t) => t.id === teamParam);
      if (isValidTeam && teamParam !== selectedTeam) {
        setSelectedTeam(teamParam);
      }
    }

    if (seasonParam && SEASONS.includes(seasonParam) && seasonParam !== selectedSeason) {
      setSelectedSeason(seasonParam);
    }
  }, [searchParams, selectedTeam, selectedSeason]);

  // Update URL when dropdown selections change
  const handleTeamChange = (newTeam) => {
    setSelectedTeam(newTeam);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('team', newTeam);
    setSearchParams(newParams, { replace: true });
  };

  const handleSeasonChange = (newSeason) => {
    setSelectedSeason(newSeason);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('season', newSeason);
    setSearchParams(newParams, { replace: true });
  };

  // Get current team object
  const currentTeam = useMemo(() => {
    if (selectedTeam === 'ALL') {
      return { id: 'ALL', name: 'MLB (All Teams)', mlbId: null };
    }
    const team = getTeamByAbbr(selectedTeam);
    return team || null;
  }, [selectedTeam]);

  // Get team ID for API calls (null for ALL)
  const currentTeamId = useMemo(() => {
    if (selectedTeam === 'ALL') return null;
    return getTeamIdFromAbbr(selectedTeam);
  }, [selectedTeam]);

  // Get display name for child components
  const currentTeamName = currentTeam?.name || 'MLB';

  return (
    <div className="player-analytics-page">
      {/* Header - Mirrored from Team Analytics */}
      <div className="analytics-header">
        <div className="container">
          <div className="header-content">
            <div className="team-selector-wrapper">
              <div className="team-header-inline">
                {selectedTeam === 'ALL' && (
                  <img
                    src="/mlb_logo-spa.png"
                    alt="MLB logo"
                    className="team-logo-image"
                  />
                )}
                {selectedTeam !== 'ALL' && currentTeam?.mlbId && (
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
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="team-dropdown"
                  >
                    {teamsWithAll.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="season-selector">
                  <select
                    value={selectedSeason}
                    onChange={(e) => handleSeasonChange(e.target.value)}
                    className="season-dropdown"
                  >
                    {SEASONS.map((season) => (
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
                type="button"
                className={`tab ${metricType === 'batting' ? 'active' : ''}`}
                onClick={() => setMetricType('batting')}
              >
                Batting
              </button>
              <button
                type="button"
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
          <BatterStats 
            key={`batter-${selectedTeam}-${selectedSeason}`}
            teamId={selectedTeam}
            teamDbId={currentTeamId}
            season={selectedSeason} 
            teamName={currentTeamName}
          />
        ) : (
          <PitcherStats 
            key={`pitcher-${selectedTeam}-${selectedSeason}`}
            teamId={selectedTeam}
            teamDbId={currentTeamId}
            season={selectedSeason} 
            teamName={currentTeamName}
          />
        )}
      </div>
    </div>
  );
}

export default PlayerAnalytics;
