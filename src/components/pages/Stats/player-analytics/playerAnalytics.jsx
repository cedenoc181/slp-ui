import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import BatterStats from './batterStats';
import PitcherStats from './pitcherStats';
import {
  TEAMS,
  SEASONS,
  ACTIVE_SEASON,
  getTeamByAbbr,
  getTeamById,
  getTeamIdFromAbbr,
} from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/player-analytics.css';

function PlayerAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [metricType, setMetricType] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'pitching' ? 'pitching' : 'batting';
  });
  
  // ========== TRANSITION LOADING STATE ==========
  const [transitionLoading, setTransitionLoading] = useState(true); // Start with overlay visible
  const [transitionMessage, setTransitionMessage] = useState('Loading Player Analytics...');
  const transitionTimeoutRef = useRef(null);
  
  // Show initial loading overlay on mount, then hide after page renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setTransitionLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);
  
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
    return ACTIVE_SEASON;
  });

  // Once user profile loads, apply favorite team if no team param in URL
  const favApplied = useRef(false);
  useEffect(() => {
    if (favApplied.current || searchParams.get('team')) return;
    if (user?.favoriteTeamId) {
      const favTeam = getTeamById(user.favoriteTeamId);
      if (favTeam) {
        favApplied.current = true;
        setSelectedTeam(favTeam.id);
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('team', favTeam.id);
          return next;
        }, { replace: true });
      }
    }
  }, [user?.favoriteTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add "All Teams" option to the teams list
  const teamsWithAll = useMemo(() => {
    return [
      { id: 'ALL', name: 'MLB Leaders', mlbId: null, urlName: 'all-teams' },
      ...TEAMS
    ];
  }, []);

  // Sync state FROM URL params when they change externally (e.g., navigation from Team Analytics)
  useEffect(() => {
    const teamParam = searchParams.get('team');
    const seasonParam = searchParams.get('season');
    const tabParam = searchParams.get('tab');

    if (teamParam) {
      const isValidTeam = teamParam === 'ALL' || TEAMS.some((t) => t.id === teamParam);
      if (isValidTeam && teamParam !== selectedTeam) {
        setSelectedTeam(teamParam);
      }
    }

    if (seasonParam && SEASONS.includes(seasonParam) && seasonParam !== selectedSeason) {
      setSelectedSeason(seasonParam);
    }

    if (tabParam === 'pitching' || tabParam === 'batting') {
      setMetricType(tabParam);
    }
  }, [searchParams, selectedTeam, selectedSeason]);

  // Listen for nav click event from Header to show loading overlay
  useEffect(() => {
    const handleNavClick = () => {
      setTransitionLoading(true);
      setTransitionMessage('Loading Player Analytics...');
      
      // Auto-hide after a short delay
      setTimeout(() => {
        setTransitionLoading(false);
      }, 500);
    };
    
    window.addEventListener('player-analytics-nav-click', handleNavClick);
    return () => window.removeEventListener('player-analytics-nav-click', handleNavClick);
  }, []);

  // Update URL when dropdown selections change
  const handleTeamChange = (newTeam) => {
    // Get team name for message
    const team = newTeam === 'ALL' 
      ? { name: 'MLB Leaders' } 
      : getTeamByAbbr(newTeam);
    
    // Show transition loading overlay
    setTransitionLoading(true);
    setTransitionMessage(`Loading ${team?.name || 'team'} players...`);
    
    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    setSelectedTeam(newTeam);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('team', newTeam);
    setSearchParams(newParams, { replace: true });
    
    // Auto-hide after data renders
    transitionTimeoutRef.current = setTimeout(() => {
      setTransitionLoading(false);
    }, 1500);
  };

  const handleSeasonChange = (newSeason) => {
    // Show transition loading overlay
    setTransitionLoading(true);
    setTransitionMessage(`Loading ${newSeason} season...`);
    
    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    setSelectedSeason(newSeason);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('season', newSeason);
    setSearchParams(newParams, { replace: true });
    
    // Auto-hide after data renders
    transitionTimeoutRef.current = setTimeout(() => {
      setTransitionLoading(false);
    }, 1500);
  };

  // Get current team object
  const currentTeam = useMemo(() => {
    if (selectedTeam === 'ALL') {
      return { id: 'ALL', name: 'MLB Leaders', mlbId: null };
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
      {/* Transition Loading Overlay - Shows during team/season change */}
      {transitionLoading && (
        <div className="pa-transition-overlay">
          <div className="pa-transition-content">
            <div className="pa-loading-spinner"></div>
            <span>{transitionMessage}</span>
          </div>
        </div>
      )}

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
