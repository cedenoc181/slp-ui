import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

// Import API Services
import teamsService from '../../../../data/services/teamsService';
import teamStatsService from '../../../../data/services/teamStatsService';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import gamesService from '../../../../data/services/gamesService';
import rosterService from '../../../../data/services/rosterService';
import injuryService from '../../../../data/services/injuryService';

// Import Constants & Utilities
import { 
  TEAMS, 
  SEASONS,
  SEASON_TYPES, 
  PLAYER_ROLES,
  getTeamByAbbr,
  getTeamByUrlName,
  getTeamIdFromAbbr,
} from '../../../../data/constants/apiConstants';

function TeamAnalytics() {
  const { teamName } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Initialize selectedTeam from URL param to prevent race condition
  const getInitialTeam = () => {
    if (teamName) {
      const team = getTeamByUrlName(teamName);
      if (team) return team.id;
    }
    return 'LAD'; // Default fallback
  };

  // Initialize season from URL query param or default to current year
  const getInitialSeason = () => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam)) {
      return seasonParam;
    }
    return '2025'; // Default fallback
  };
  
  // ========== UI State ==========
  const [selectedTeam, setSelectedTeam] = useState(getInitialTeam);
  const [selectedSeason, setSelectedSeason] = useState(getInitialSeason);
  const [timeframe, setTimeframe] = useState('season');
  const [chartFilter, setChartFilter] = useState('season');
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  const [leadersToggle, setLeadersToggle] = useState('batting');
  const [teamStatsToggle, setTeamStatsToggle] = useState('batting');
  const [rosterFilter, setRosterFilter] = useState('all'); // NEW: 'all', 'pitchers', 'position'
  const [injuryFilter, setInjuryFilter] = useState('all'); // 'all', 'active', 'returned'
  const [hideFloatingFilters, setHideFloatingFilters] = useState(false);
  const [isChartSectionVisible, setIsChartSectionVisible] = useState(false);
  const chartSectionRef = useRef(null);
  const filterChangeTimeoutRef = useRef(null); // NEW: Ref for debounce timeout

  // ========== API Data State ==========
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Raw API Data
  const [teamSeasonData, setTeamSeasonData] = useState(null);
  const [teamMonthlyData, setTeamMonthlyData] = useState(null);
  const [battingStats, setBattingStats] = useState(null);
  const [pitchingStats, setPitchingStats] = useState(null);
  const [battingLeaders, setBattingLeaders] = useState(null);
  const [pitchingLeaders, setPitchingLeaders] = useState(null);
  const [last10Games, setLast10Games] = useState(null);
  const [homeGames, setHomeGames] = useState(null);
  const [awayGames, setAwayGames] = useState(null);
  const [roster, setRoster] = useState(null);
  const [teamSplits, setTeamSplits] = useState(null);
  
  // Injury Data (fetched separately based on timeframe)
  const [injuriesFullSeason, setInjuriesFullSeason] = useState(null);
  const [injuriesFirstHalf, setInjuriesFirstHalf] = useState(null);
  const [injuriesSecondHalf, setInjuriesSecondHalf] = useState(null);
  const [injuriesLoading, setInjuriesLoading] = useState(false);

  // ========== Fetch All Team Data ==========
  const fetchTeamData = async (teamId, season) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`📡 Fetching data for team ${teamId}, season ${season}...`);

      const [
        seasonData,
        monthlyData,
        battingStatsData,
        pitchingStatsData,
        battingLeadersData,
        pitchingLeadersData,
        last10Data,
        homeGamesData,
        awayGamesData,
        rosterData,
        splitsData,
        injuriesFullSeasonData,
        injuriesFirstHalfData,
        injuriesSecondHalfData,
      ] = await Promise.all([
        teamsService.getTeamSeason(teamId, season).catch(err => { console.warn('Team season failed:', err); return null; }),
        teamsService.getTeamMonthly(teamId, season).catch(err => { console.warn('Team monthly failed:', err); return null; }),
        teamStatsService.getTeamBattingStats(teamId, season, SEASON_TYPES.REGULAR).catch(err => { console.warn('Batting stats failed:', err); return null; }),
        teamStatsService.getTeamPitchingStats(teamId, season, SEASON_TYPES.REGULAR).catch(err => { console.warn('Pitching stats failed:', err); return null; }),
        teamLeadersService.getTeamBattingLeaders(teamId, season, SEASON_TYPES.REGULAR).catch(err => { console.warn('Batting leaders failed:', err); return null; }),
        teamLeadersService.getTeamPitchingLeaders(teamId, season, SEASON_TYPES.REGULAR).catch(err => { console.warn('Pitching leaders failed:', err); return null; }),
        gamesService.getTeamLast10(teamId, season).catch(err => { console.warn('Last 10 failed:', err); return null; }),
        gamesService.getTeamHomeGames(teamId, season).catch(err => { console.warn('Home games failed:', err); return null; }),
        gamesService.getTeamAwayGames(teamId, season).catch(err => { console.warn('Away games failed:', err); return null; }),
        rosterService.getTeamRoster(teamId, season).catch(err => { console.warn('Roster failed:', err); return null; }),
        teamLeadersService.getTeamSplits(teamId, season, SEASON_TYPES.REGULAR, PLAYER_ROLES.BATTER).catch(err => { console.warn('Splits failed:', err); return null; }),
        injuryService.getTeamInjuriesFullSeason(teamId, season).catch(err => { console.warn('Injuries full season failed:', err); return null; }),
        injuryService.getTeamInjuriesFirstHalf(teamId, season).catch(err => { console.warn('Injuries first half failed:', err); return null; }),
        injuryService.getTeamInjuriesSecondHalf(teamId, season).catch(err => { console.warn('Injuries second half failed:', err); return null; }),
      ]);

      // Update state with raw data
      setTeamSeasonData(seasonData);
      setTeamMonthlyData(monthlyData);
      setBattingStats(battingStatsData);
      setPitchingStats(pitchingStatsData);
      setBattingLeaders(battingLeadersData);
      setPitchingLeaders(pitchingLeadersData);
      setLast10Games(last10Data);
      setHomeGames(homeGamesData);
      setAwayGames(awayGamesData);
      setRoster(rosterData);
      setTeamSplits(splitsData);
      setInjuriesFullSeason(injuriesFullSeasonData);
      setInjuriesFirstHalf(injuriesFirstHalfData);
      setInjuriesSecondHalf(injuriesSecondHalfData);

      console.log('✅ All data fetched successfully!');
    } catch (err) {
      console.error('❌ Error fetching team data:', err);
      setError(err.message || 'Failed to load team data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ========== Effects ==========
  // Sync selectedTeam when URL changes (e.g., user navigates via dropdown)
  useEffect(() => {
    if (teamName) {
      const team = getTeamByUrlName(teamName);
      if (team) {
        // Only update if different to avoid unnecessary re-renders
        if (team.id !== selectedTeam) {
          setSelectedTeam(team.id);
        }
      } else {
        navigate('/team-analytics/los-angeles-dodgers', { replace: true });
      }
    } else {
      navigate('/team-analytics/los-angeles-dodgers', { replace: true });
    }
  }, [teamName, navigate, selectedTeam]);

  // Sync selectedSeason when URL query param changes (e.g., user navigates from standings page)
  useEffect(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam) && seasonParam !== selectedSeason) {
      setSelectedSeason(seasonParam);
    }
  }, [searchParams, selectedSeason]);

  useEffect(() => {
    const teamId = getTeamIdFromAbbr(selectedTeam);
    if (teamId) {
      fetchTeamData(teamId, selectedSeason);
    }
  }, [selectedTeam, selectedSeason]);

  // Footer intersection observer - hide when footer is visible
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) {
      console.warn('Footer element not found for intersection observer');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setHideFloatingFilters(entries[0].isIntersecting);
      },
      { root: null, threshold: 0 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // Chart section intersection observer - show only when chart is visible
  useEffect(() => {
    const target = chartSectionRef.current;
    if (!target) {
      console.warn('Chart section ref not found for intersection observer');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setIsChartSectionVisible(entries[0].isIntersecting);
      },
      { root: null, threshold: 0.1 } // Show when at least 10% of chart is visible
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading]); // Re-run when loading changes to ensure ref is attached

  // ========== Handlers ==========
  const handleTeamChange = (teamId) => {
    const team = getTeamByAbbr(teamId);
    if (team) {
      setSelectedTeam(teamId);
      navigate(`/team-analytics/${team.urlName}`);
    }
  };

  // NEW: Debounced chart filter handler to prevent rapid clicks
  const handleChartFilterChange = useCallback((newFilter) => {
    // Ignore if already changing or same filter
    if (isFilterChanging || newFilter === chartFilter) return;

    // Set changing state to disable buttons
    setIsFilterChanging(true);

    // Clear any existing timeout
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }

    // Update the filter
    setChartFilter(newFilter);

    // Re-enable buttons after a short delay
    filterChangeTimeoutRef.current = setTimeout(() => {
      setIsFilterChanging(false);
    }, 300); // 300ms debounce
  }, [chartFilter, isFilterChanging]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, []);

  // ========== Data Helpers ==========
  
  // Get injuries based on current timeframe
  // Filter locally based on injury_date to ensure accurate first-half/second-half splits
  const getInjuriesForTimeframe = () => {
    const allInjuries = injuriesFullSeason?.injuries || [];
    
    if (timeframe === 'season') {
      return allInjuries;
    }
    
    // Filter based on injury_date (IL date)
    // First half: Feb - June (months 2-6)
    // Second half: July - November (months 7-11)
    return allInjuries.filter(injury => {
      if (!injury.injury_date) return false;
      
      const injuryDate = new Date(injury.injury_date);
      const month = injuryDate.getMonth() + 1; // getMonth() is 0-indexed
      
      if (timeframe === 'first-half') {
        // First half: February (2) through June (6)
        return month >= 2 && month <= 6;
      } else if (timeframe === 'second-half') {
        // Second half: July (7) through November (11)
        return month >= 7 && month <= 11;
      }
      
      return true;
    });
  };

  // Helper to determine if player is still actively injured
  const isStillInjured = (injury) => {
    // If activation_date exists (not null), the player has returned from IL
    // If activation_date is null/undefined, they're still on IL
    return !injury.activation_date;
  };

  // Get injury counts for display
  const getInjuryCounts = () => {
    const injuries = getInjuriesForTimeframe();
    return {
      total: injuries.length,
      current: injuries.filter(i => isStillInjured(i)).length, // Still on IL
      returned: injuries.filter(i => !isStillInjured(i)).length  // Returned from IL
    };
  };

  // Get injury period label
  const getInjuryPeriodLabel = () => {
    switch (timeframe) {
      case 'first-half':
        return 'First Half';
      case 'second-half':
        return 'Second Half';
      case 'season':
      default:
        return 'Full Season';
    }
  };
  
  // NEW: Filter roster based on toggle
  // Now roster is an object with: { pitchers, catchers, infielders, outfielders }
  const getFilteredRoster = () => {
    if (!roster) return [];
    
    switch (rosterFilter) {
      case 'pitchers':
        return roster.pitchers || [];
      case 'position':
        // Combine catchers, infielders, and outfielders
        return [
          ...(roster.catchers || []),
          ...(roster.infielders || []),
          ...(roster.outfielders || [])
        ];
      default:
        // All players - combine all position groups
        return [
          ...(roster.pitchers || []),
          ...(roster.catchers || []),
          ...(roster.infielders || []),
          ...(roster.outfielders || [])
        ];
    }
  };

  // Get roster counts for subtitle
  const getRosterCounts = () => {
    if (!roster) return { total: 0, pitchers: 0, position: 0 };
    
    const pitchersCount = (roster.pitchers || []).length;
    const positionCount = (roster.catchers || []).length + 
                          (roster.infielders || []).length + 
                          (roster.outfielders || []).length;
    
    return {
      total: roster.total_players || (pitchersCount + positionCount),
      pitchers: pitchersCount,
      position: positionCount
    };
  };

  // Get the correct season data based on timeframe
  // Structure: { record: {...}, runs: {...}, streak: {...}, home: {...}, away: {...} }
  const getSeasonData = () => {
    if (!teamSeasonData) return null;
    
    switch (timeframe) {
      case 'first-half':
        return teamSeasonData.first_half;
      case 'second-half':
        return teamSeasonData.second_half;
      default:
        return teamSeasonData.regular_season;
    }
  };

  // Helper to safely get streak string from streak object
  // streak: { streak_code: "W5", streak_type: "wins", streak_number: 5 }
  const getStreakString = (streak) => {
    if (!streak) return null;
    if (typeof streak === 'string') return streak;
    if (typeof streak === 'object') {
      return streak.streak_code || `${streak.streak_type?.[0]?.toUpperCase() || ''}${streak.streak_number || ''}`;
    }
    return String(streak);
  };

  // Helper to check if streak is winning
  const isWinningStreak = (streak) => {
    if (!streak) return false;
    if (typeof streak === 'string') return streak.toUpperCase().startsWith('W');
    if (typeof streak === 'object') {
      return streak.streak_type === 'wins' || streak.streak_code?.toUpperCase().startsWith('W');
    }
    return false;
  };

  // Get batting stats (it's an array, so get first item)
  const getBattingStats = () => {
    if (!battingStats || !Array.isArray(battingStats) || battingStats.length === 0) return null;
    return battingStats[0];
  };

  // Get pitching stats (it's an array, so get first item)
  const getPitchingStats = () => {
    if (!pitchingStats || !Array.isArray(pitchingStats) || pitchingStats.length === 0) return null;
    return pitchingStats[0];
  };

  // Calculate last 10 stats from games array
  const getLast10Stats = () => {
    const games = chartFilter === 'home' ? homeGames : chartFilter === 'away' ? awayGames : last10Games;
    
    if (!games || !Array.isArray(games) || games.length === 0) return null;
    
    // Take last 10 games
    const recentGames = games.slice(0, 10);
    
    let wins = 0;
    let losses = 0;
    let runsScored = 0;
    let runsAllowed = 0;
    
    recentGames.forEach(game => {
      if (game.result === 'W' || game.win) {
        wins++;
      } else {
        losses++;
      }
      runsScored += game.runs_scored || game.runsScored || game.runs || 0;
      runsAllowed += game.runs_allowed || game.runsAllowed || game.opponent_runs || 0;
    });
    
    return { wins, losses, runsScored, runsAllowed };
  };

  // ========== Computed Values ==========
  const currentTeam = getTeamByAbbr(selectedTeam);
  const currentTeamName = currentTeam?.name || 'Team';
  const shouldHideFloatingFilters = hideFloatingFilters || !isChartSectionVisible;
  
  const seasonData = getSeasonData();
  const currentBattingStats = getBattingStats();
  const currentPitchingStats = getPitchingStats();
  const last10Stats = getLast10Stats();
  
  // Roster filtered data
  const filteredRoster = getFilteredRoster();
  const rosterCounts = getRosterCounts();

  // Extract nested data for easier access
  const record = seasonData?.record;
  const runs = seasonData?.runs;
  const streak = seasonData?.streak;
  const ranks = teamSeasonData?.regular_season?.ranks;
  const last10Record = teamSeasonData?.regular_season?.last_10;
  const recordSplits = teamSeasonData?.record_splits;

  // ========== Loading State ==========
  if (loading) {
    return (
      <div className="team-analytics-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading {currentTeamName} data...</p>
        </div>
      </div>
    );
  }

  // ========== Error State ==========
  if (error) {
    return (
      <div className="team-analytics-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Data</h2>
          <p className="error-message">{error}</p>
          <button onClick={() => fetchTeamData(getTeamIdFromAbbr(selectedTeam), selectedSeason)} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // ========== Render ==========
  return (
    <div className="team-analytics-page">
      {/* Header Section */}
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
              <button className={`tab ${timeframe === 'season' ? 'active' : ''}`} onClick={() => setTimeframe('season')}>Season</button>
              <button className={`tab ${timeframe === 'first-half' ? 'active' : ''}`} onClick={() => setTimeframe('first-half')}>1st Half</button>
              <button className={`tab ${timeframe === 'second-half' ? 'active' : ''}`} onClick={() => setTimeframe('second-half')}>2nd Half</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="analytics-content container">
        {/* Season Overview Cards */}
        <div className="overview-section">
          <div className="stat-card highlight">
            <div className="stat-header">
              <span className="stat-label">Record</span>
              {streak && (
                <span className={`trend-badge ${isWinningStreak(streak) ? 'positive' : 'negative'}`}>
                  {getStreakString(streak)}
                </span>
              )}
            </div>
            <div className="stat-value">
              {record?.wins || 0}-{record?.losses || 0}
            </div>
            <div className="stat-detail">
              Win % {record?.pct ? (record.pct * 100).toFixed(1) : '0.0'}%
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Run Differential</span>
            </div>
            <div className={`stat-value ${(runs?.run_differential ?? runs?.run_diff ?? 0) > 0 ? 'positive' : (runs?.run_differential ?? runs?.run_diff ?? 0) < 0 ? 'negative' : ''}`}>
              {(runs?.run_differential ?? runs?.run_diff ?? 0) > 0 ? '+' : ''}{runs?.run_differential ?? runs?.run_diff ?? 0}
            </div>
            <div className="stat-detail">
              {runs?.runs_scored || 0} RS / {runs?.runs_allowed || 0} RA
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Home Record</span>
            </div>
            <div className="stat-value">
              {seasonData?.home?.wins || recordSplits?.home?.wins || 0}-{seasonData?.home?.losses || recordSplits?.home?.losses || 0}
            </div>
            <div className="stat-detail">
              {((seasonData?.home?.pct || recordSplits?.home?.pct || 0) * 100).toFixed(1)}% win rate
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Away Record</span>
            </div>
            <div className="stat-value">
              {seasonData?.away?.wins || recordSplits?.away?.wins || 0}-{seasonData?.away?.losses || recordSplits?.away?.losses || 0}
            </div>
            <div className="stat-detail">
              {((seasonData?.away?.pct || recordSplits?.away?.pct || 0) * 100).toFixed(1)}% win rate
            </div>
          </div>
        </div>

        {/* Monthly Performance Trends Chart */}
        <div className="chart-section" ref={chartSectionRef}>
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Monthly Performance Trends</h3>
                <p className="card-subtitle">
                  {timeframe === 'season' && 'Full season performance'}
                  {timeframe === 'first-half' && 'First half performance (Feb - Jun)'}
                  {timeframe === 'second-half' && 'Second half performance (Jul - Nov)'}
                </p>
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot wins"></span> Wins</span>
                <span className="legend-item"><span className="legend-dot losses"></span> Losses</span>
              </div>
            </div>

            <div className="chart-container">
              <div className="bar-chart">
                {teamMonthlyData && Array.isArray(teamMonthlyData) && teamMonthlyData.length > 0 ? (
                  (() => {
                    // Filter months first
                    const filteredMonths = teamMonthlyData.filter(month => {
                      const firstHalfMonths = ['February', 'March', 'April', 'May', 'June'];
                      const secondHalfMonths = ['July', 'August', 'September', 'October', 'November'];
                      
                      if (timeframe === 'first-half' && !firstHalfMonths.includes(month.month)) {
                        return false;
                      }
                      if (timeframe === 'second-half' && !secondHalfMonths.includes(month.month)) {
                        return false;
                      }

                      if (chartFilter === 'home') {
                        return (month.home_monthly_wins || 0) + (month.home_monthly_losses || 0) > 0;
                      } else if (chartFilter === 'away') {
                        return (month.away_monthly_wins || 0) + (month.away_monthly_losses || 0) > 0;
                      } else {
                        return (month.monthly_wins || 0) + (month.monthly_losses || 0) > 0;
                      }
                    });

                    // Define season phases
                    const getSeasonPhase = (monthName) => {
                      if (['February', 'March'].includes(monthName)) return 'spring';
                      if (['April', 'May', 'June', 'July', 'August', 'September'].includes(monthName)) return 'regular';
                      if (['October', 'November'].includes(monthName)) return 'postseason';
                      return null;
                    };

                    // Check if we should show a divider after this month
                    const shouldShowDivider = (currentMonth, nextMonth) => {
                      if (!nextMonth) return false;
                      const currentPhase = getSeasonPhase(currentMonth);
                      const nextPhase = getSeasonPhase(nextMonth);
                      return currentPhase !== nextPhase;
                    };

                    // Get divider label
                    const getDividerLabel = (nextMonth) => {
                      const phase = getSeasonPhase(nextMonth);
                      if (phase === 'regular') return 'Regular Season';
                      if (phase === 'postseason') return 'Postseason';
                      return '';
                    };

                    return filteredMonths.map((month, idx) => {
                      let wins, losses, winPct;
                      
                      if (chartFilter === 'home') {
                        wins = month.home_monthly_wins || 0;
                        losses = month.home_monthly_losses || 0;
                        winPct = month.home_monthly_pct;
                      } else if (chartFilter === 'away') {
                        wins = month.away_monthly_wins || 0;
                        losses = month.away_monthly_losses || 0;
                        winPct = month.away_monthly_pct;
                      } else {
                        wins = month.monthly_wins || 0;
                        losses = month.monthly_losses || 0;
                        winPct = month.monthly_pct;
                      }

                      const totalGames = wins + losses;
                      const displayPct = winPct !== null ? (winPct * 100).toFixed(1) : (totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0');
                      const monthAbbr = month.month?.substring(0, 3) || `M${idx + 1}`;
                      const maxGames = 20;
                      const winsHeight = Math.min((wins / maxGames) * 100, 100);
                      const lossesHeight = Math.min((losses / maxGames) * 100, 100);

                      // Check if divider should appear after this month
                      const nextMonth = filteredMonths[idx + 1];
                      const showDivider = shouldShowDivider(month.month, nextMonth?.month);
                      const dividerLabel = showDivider ? getDividerLabel(nextMonth?.month) : '';

                      // Check if this is the first month and needs a phase label
                      const isFirstMonth = idx === 0;
                      const firstPhaseLabel = isFirstMonth ? (
                        getSeasonPhase(month.month) === 'spring' ? 'Spring Training' :
                        getSeasonPhase(month.month) === 'regular' ? 'Regular Season' :
                        getSeasonPhase(month.month) === 'postseason' ? 'Postseason' : ''
                      ) : '';

                      return (
                        <React.Fragment key={month.month || idx}>
                          {/* First month phase label - now with same divider styling */}
                          {isFirstMonth && firstPhaseLabel && (
                            <div className="season-phase-divider first">
                              <div className="divider-line"></div>
                              <span className="phase-text">{firstPhaseLabel}</span>
                              <div className="divider-line"></div>
                            </div>
                          )}

                          <div className="bar-group">
                            <div className="bar-wrapper">
                              <div 
                                className="bar wins" 
                                style={{ height: `${winsHeight}%` }}
                                title={`${wins} wins`}
                              >
                                {wins > 0 && <span className="bar-label">{wins}</span>}
                              </div>
                              <div 
                                className="bar losses" 
                                style={{ height: `${lossesHeight}%` }}
                                title={`${losses} losses`}
                              >
                                {losses > 0 && <span className="bar-label">{losses}</span>}
                              </div>
                            </div>
                            <div className="bar-month">{monthAbbr}</div>
                            <div className="bar-record">{wins}-{losses}</div>
                            <div 
                              className="bar-win-pct" 
                              style={{ 
                                color: parseFloat(displayPct) >= 60 ? '#4CAF50' : 
                                       parseFloat(displayPct) >= 50 ? '#FF9800' : 
                                       parseFloat(displayPct) > 0 ? '#F44336' : '#888'
                              }}
                            >
                              {totalGames > 0 ? `${displayPct}%` : '-'}
                            </div>
                          </div>

                          {/* Season phase divider */}
                          {showDivider && (
                            <div className="season-phase-divider">
                              <div className="divider-line"></div>
                              <span className="phase-text">{dividerLabel}</span>
                              <div className="divider-line"></div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()
                ) : (
                  <div className="no-data-message">No monthly data available</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Chart Filter Remote - Moved outside chart-container */}
        <div className={`chart-filters floating-remote ${shouldHideFloatingFilters ? 'floating-hidden' : ''} ${isFilterChanging ? 'changing' : ''}`}>
          <button 
            className={`chart-filter-btn ${chartFilter === 'season' ? 'active' : ''}`} 
            onClick={() => handleChartFilterChange('season')}
            disabled={isFilterChanging}
            aria-disabled={isFilterChanging}
          >
            <span className="filter-icon">📊</span> Combined
          </button>
          <button 
            className={`chart-filter-btn ${chartFilter === 'home' ? 'active' : ''}`} 
            onClick={() => handleChartFilterChange('home')}
            disabled={isFilterChanging}
            aria-disabled={isFilterChanging}
          >
            <span className="filter-icon">🏠</span> Home
          </button>
          <button 
            className={`chart-filter-btn ${chartFilter === 'away' ? 'active' : ''}`} 
            onClick={() => handleChartFilterChange('away')}
            disabled={isFilterChanging}
            aria-disabled={isFilterChanging}
          >
            <span className="filter-icon">✈️</span> Away
          </button>
        </div>

        {/* Split Stats Grid */}
        <div className="splits-section">
          <div className="section-card">
            <div className="card-header">
              <h3>Performance Splits</h3>
              <p className="card-subtitle">
                {chartFilter === 'season' && <><span className="subtitle-bold">📊 Combined</span> performance breakdown</>}
                {chartFilter === 'home' && <><span className="subtitle-bold">🏠 Home</span> game performance breakdown</>}
                {chartFilter === 'away' && <><span className="subtitle-bold">✈️ Away</span> game performance breakdown</>}
              </p>
            </div>
            <div className="splits-grid">
              {recordSplits ? (
                (() => {
                  // Determine which data to show based on chartFilter
                  let vsLeftData, vsRightData;

                  if (chartFilter === 'home') {
                    vsLeftData = recordSplits.vs_left_sp_home || { wins: 0, losses: 0, pct: 0 };
                    vsRightData = recordSplits.vs_right_sp_home || { wins: 0, losses: 0, pct: 0 };
                  } else if (chartFilter === 'away') {
                    vsLeftData = recordSplits.vs_left_sp_away || { wins: 0, losses: 0, pct: 0 };
                    vsRightData = recordSplits.vs_right_sp_away || { wins: 0, losses: 0, pct: 0 };
                  } else {
                    // Combined (season)
                    vsLeftData = recordSplits.vs_left_sp || { wins: 0, losses: 0, pct: 0 };
                    vsRightData = recordSplits.vs_right_sp || { wins: 0, losses: 0, pct: 0 };
                  }

                  // Determine team's league and get division data
                  const teamLeague = currentTeam?.league || teamSeasonData?.team?.league;
                  const isAL = teamLeague === 'AL' || teamLeague === 'American League' || teamSeasonData?.team?.league_name?.includes('American');
                  
                  // Get the opposing league's division data (teams play more against their own league)
                  const divisionData = isAL 
                    ? recordSplits.vs_american_league_division 
                    : recordSplits.vs_national_league_division;
                  
                  const leagueAbbr = isAL ? 'AL' : 'NL';

                  return (
                    <>
                      <div className="split-row">
                        <div className="split-label">
                          vs Left-Handed Pitching
                          {chartFilter !== 'season' && (
                            <span className="split-location-badge">
                              {chartFilter === 'home' ? '🏠' : '✈️'}
                            </span>
                          )}
                        </div>
                        <div className="split-stats">
                          <span className="split-record">
                            {vsLeftData.wins || 0}-{vsLeftData.losses || 0}
                          </span>
                          <span className="split-pct" style={{
                            color: (vsLeftData.pct || 0) >= 0.6 ? '#4CAF50' : 
                                   (vsLeftData.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                          }}>
                            {((vsLeftData.pct || 0) * 100).toFixed(1)}%
                          </span>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ 
                              width: `${(vsLeftData.pct || 0) * 100}%`,
                              backgroundColor: (vsLeftData.pct || 0) >= 0.6 ? '#4CAF50' : 
                                               (vsLeftData.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                            }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="split-row">
                        <div className="split-label">
                          vs Right-Handed Pitching
                          {chartFilter !== 'season' && (
                            <span className="split-location-badge">
                              {chartFilter === 'home' ? '🏠' : '✈️'}
                            </span>
                          )}
                        </div>
                        <div className="split-stats">
                          <span className="split-record">
                            {vsRightData.wins || 0}-{vsRightData.losses || 0}
                          </span>
                          <span className="split-pct" style={{
                            color: (vsRightData.pct || 0) >= 0.6 ? '#4CAF50' : 
                                   (vsRightData.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                          }}>
                            {((vsRightData.pct || 0) * 100).toFixed(1)}%
                          </span>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ 
                              width: `${(vsRightData.pct || 0) * 100}%`,
                              backgroundColor: (vsRightData.pct || 0) >= 0.6 ? '#4CAF50' : 
                                               (vsRightData.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                            }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Division Splits */}
                      <div className="split-row">
                        <div className="split-label">vs {leagueAbbr} East</div>
                        <div className="split-stats">
                          <span className="split-record">
                            {divisionData?.east_wins ?? 0}-{divisionData?.east_losses ?? 0}
                          </span>
                          <span className="split-pct" style={{
                            color: (divisionData?.east_pct || 0) >= 0.6 ? '#4CAF50' : 
                                   (divisionData?.east_pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                          }}>
                            {((divisionData?.east_pct || 0) * 100).toFixed(1)}%
                          </span>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ 
                              width: `${(divisionData?.east_pct || 0) * 100}%`,
                              backgroundColor: (divisionData?.east_pct || 0) >= 0.6 ? '#4CAF50' : 
                                               (divisionData?.east_pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                            }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="split-row">
                        <div className="split-label">vs {leagueAbbr} Central</div>
                        <div className="split-stats">
                          <span className="split-record">
                            {divisionData?.central_wins ?? 0}-{divisionData?.central_losses ?? 0}
                          </span>
                          <span className="split-pct" style={{
                            color: (divisionData?.central_pct || 0) >= 0.6 ? '#4CAF50' : 
                                   (divisionData?.central_pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                          }}>
                            {((divisionData?.central_pct || 0) * 100).toFixed(1)}%
                          </span>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ 
                              width: `${(divisionData?.central_pct || 0) * 100}%`,
                              backgroundColor: (divisionData?.central_pct || 0) >= 0.6 ? '#4CAF50' : 
                                               (divisionData?.central_pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                            }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="split-row">
                        <div className="split-label">vs {leagueAbbr} West</div>
                        <div className="split-stats">
                          <span className="split-record">
                            {divisionData?.west_wins ?? 0}-{divisionData?.west_losses ?? 0}
                          </span>
                          <span className="split-pct" style={{
                            color: (divisionData?.west_pct || 0) >= 0.6 ? '#4CAF50' : 
                                   (divisionData?.west_pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                          }}>
                            {((divisionData?.west_pct || 0) * 100).toFixed(1)}%
                          </span>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ 
                              width: `${(divisionData?.west_pct || 0) * 100}%`,
                              backgroundColor: (divisionData?.west_pct || 0) >= 0.6 ? '#4CAF50' : 
                                               (divisionData?.west_pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                            }}></div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="no-data-message">No splits data available</div>
              )}
            </div>
          </div>

          {/* Last 10 Games - Updated to use home/away toggle */}
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Last 10 Games</h3>
                <p className="card-subtitle">
                  {chartFilter === 'season' && <><strong>📊 Combined: </strong> last 10 games performance</>}
                  {chartFilter === 'home' && <><strong>🏠 Home: </strong> last 10 home games performance</>}
                  {chartFilter === 'away' && <><strong>✈️ Away: </strong> last 10 away games performance</>}
                </p>
              </div>
            </div>
            {(() => {
              let wins, losses, runsScored, runsAllowed, runDiff;

              if (chartFilter === 'home') {
                const homeData = recordSplits?.last_10_home_w_postseason;
                wins = homeData?.wins ?? 0;
                losses = homeData?.losses ?? 0;
                runsScored = homeData?.runs_scored ?? homeData?.runsScored ?? '-';
                runsAllowed = homeData?.runs_allowed ?? homeData?.runsAllowed ?? '-';
                runDiff = homeData?.run_diff ?? homeData?.runDiff ?? (runsScored !== '-' && runsAllowed !== '-' ? runsScored - runsAllowed : '-');
              } else if (chartFilter === 'away') {
                const awayData = recordSplits?.last_10_away_w_postseason;
                wins = awayData?.wins ?? 0;
                losses = awayData?.losses ?? 0;
                runsScored = awayData?.runs_scored ?? awayData?.runsScored ?? '-';
                runsAllowed = awayData?.runs_allowed ?? awayData?.runsAllowed ?? '-';
                runDiff = awayData?.run_diff ?? awayData?.runDiff ?? (runsScored !== '-' && runsAllowed !== '-' ? runsScored - runsAllowed : '-');
              } else {
                // Combined - use last10Games data from gamesService.getTeamLast10
                // The API returns an array where first object has the summary stats
                const combinedData = Array.isArray(last10Games) && last10Games.length > 0 ? last10Games[0] : null;
                
                if (combinedData) {
                  wins = combinedData.last_ten_wins ?? combinedData.wins ?? 0;
                  losses = combinedData.last_ten_losses ?? combinedData.losses ?? 0;
                  runsScored = combinedData.runs_scored ?? '-';
                  runsAllowed = combinedData.runs_allowed ?? '-';
                  runDiff = combinedData.run_differential ?? combinedData.run_diff ?? 
                    (runsScored !== '-' && runsAllowed !== '-' ? runsScored - runsAllowed : '-');
                } else {
                  // Fallback to last10Record if last10Games not available
                  wins = last10Record?.wins ?? 0;
                  losses = last10Record?.losses ?? 0;
                  runsScored = '-';
                  runsAllowed = '-';
                  runDiff = '-';
                }
              }

              // If we still don't have valid data
              if (wins === undefined && losses === undefined) {
                return <div className="no-data-message">No last 10 games data available</div>;
              }

              return (
                <div className="last-10-stats">
                  <div className="last-10-item">
                    <div className="last-10-label">Record</div>
                    <div className="last-10-value">{wins}-{losses}</div>
                  </div>
                  <div className="last-10-item">
                    <div className="last-10-label">Runs Scored</div>
                    <div className="last-10-value">{runsScored}</div>
                  </div>
                  <div className="last-10-item">
                    <div className="last-10-label">Runs Allowed</div>
                    <div className="last-10-value">{runsAllowed}</div>
                  </div>
                  <div className="last-10-item">
                    <div className="last-10-label">Run Diff</div>
                    <div className={`last-10-value ${runDiff > 0 ? 'positive' : runDiff < 0 ? 'negative' : ''}`}>
                      {runDiff !== '-' ? `${runDiff > 0 ? '+' : ''}${runDiff}` : '-'}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Team Info Grid: Standings, Leaders, Stats */}
        <div className="team-info-grid">
          {/* Team Standings */}
          <div className="section-card">
            <div className="card-header">
              <h3>Team Standings</h3>
              <p className="card-subtitle">
                {ranks?.division_rank ? `#${ranks.division_rank} in Division` : teamSeasonData?.team?.division || 'N/A'}
              </p>
            </div>
            <div className="standings-content">
              <div className="standings-row">
                <span className="standings-label">Wins</span>
                <span className="standings-value">{record?.wins || 0}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Losses</span>
                <span className="standings-value">{record?.losses || 0}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Win %</span>
                <span className="standings-value">{record?.pct?.toFixed(3) || '.000'}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Games Back</span>
                <span className="standings-value">{record?.games_back === null || record?.games_back === 0 ? '-' : record?.games_back}</span>
              </div>
              <div className="standings-row highlight">
                <span className="standings-label">Streak</span>
                <span className={`standings-value streak-badge ${isWinningStreak(streak) ? 'positive' : 'negative'}`}>
                  {getStreakString(streak) || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Team Leaders */}
          <div 
            className="section-card clickable-card"
            onClick={() => {
              navigate(`/player-analytics?team=${selectedTeam}&season=${selectedSeason}`);
              window.scrollTo(0, 0);
            }}
            title="View full player analytics"
          >
            <div className="card-header">
              <div>
                <h3>Team Leaders</h3>
                <p className="card-subtitle">Top performers</p>
              </div>
              <div className="toggle-buttons" onClick={(e) => e.stopPropagation()}>
                <button className={`toggle-btn ${leadersToggle === 'batting' ? 'active' : ''}`} onClick={() => setLeadersToggle('batting')}>Batting</button>
                <button className={`toggle-btn ${leadersToggle === 'pitching' ? 'active' : ''}`} onClick={() => setLeadersToggle('pitching')}>Pitching</button>
              </div>
            </div>
            
            {leadersToggle === 'batting' ? (
              battingLeaders ? (
                <div className="leaders-content">
                  <div className="leader-row">
                    <span className="leader-player">{battingLeaders.home_runs?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">Home Runs</span>
                      <span className="leader-value">{battingLeaders.home_runs?.value ?? 0}</span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <span className="leader-player">{battingLeaders.rbis?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">RBI</span>
                      <span className="leader-value">{battingLeaders.rbis?.value ?? 0}</span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <span className="leader-player">{battingLeaders.avg?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">Batting Avg</span>
                      <span className="leader-value">
                        {battingLeaders.avg?.value 
                          ? (typeof battingLeaders.avg.value === 'number' && battingLeaders.avg.value < 1 
                              ? battingLeaders.avg.value.toFixed(3) 
                              : battingLeaders.avg.value)
                          : '.000'}
                      </span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <span className="leader-player">{battingLeaders.ops?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">OPS</span>
                      <span className="leader-value">
                        {battingLeaders.ops?.value 
                          ? (typeof battingLeaders.ops.value === 'number' 
                              ? battingLeaders.ops.value.toFixed(3) 
                              : battingLeaders.ops.value)
                          : '.000'}
                      </span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <span className="leader-player">{battingLeaders.stolen_bases?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">Stolen Bases</span>
                      <span className="leader-value">{battingLeaders.stolen_bases?.value ?? 0}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data-message">No batting leaders data available</div>
              )
            ) : (
              pitchingLeaders ? (
                <div className="leaders-content">
                  <div className="leader-row">
                    <span className="leader-player">{pitchingLeaders.era?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">ERA</span>
                      <span className="leader-value">
                        {pitchingLeaders.era?.value 
                          ? (typeof pitchingLeaders.era.value === 'number' 
                              ? pitchingLeaders.era.value.toFixed(2) 
                              : pitchingLeaders.era.value)
                          : '0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <span className="leader-player">{pitchingLeaders.strikeouts?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">Strikeouts</span>
                      <span className="leader-value">{pitchingLeaders.strikeouts?.value ?? 0}</span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <span className="leader-player">{pitchingLeaders.wins?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">Wins</span>
                      <span className="leader-value">{pitchingLeaders.wins?.value ?? 0}</span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <span className="leader-player">{pitchingLeaders.whip?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">WHIP</span>
                      <span className="leader-value">
                        {pitchingLeaders.whip?.value 
                          ? (typeof pitchingLeaders.whip.value === 'number' 
                              ? pitchingLeaders.whip.value.toFixed(2) 
                              : pitchingLeaders.whip.value)
                          : '0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <span className="leader-player">{pitchingLeaders.opponent_avg?.player_name || 'N/A'}</span>
                    <div className="leader-info">
                      <span className="leader-stat-label">Opp AVG</span>
                      <span className="leader-value">
                        {pitchingLeaders.opponent_avg?.value 
                          ? (typeof pitchingLeaders.opponent_avg.value === 'number' 
                              ? pitchingLeaders.opponent_avg.value.toFixed(3) 
                              : pitchingLeaders.opponent_avg.value)
                          : '.000'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data-message">No pitching leaders data available</div>
              )
            )}
          </div>

          {/* Team Stats */}
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Team Stats</h3>
                <p className="card-subtitle">Overall performance</p>
              </div>
              <div className="toggle-buttons">
                <button className={`toggle-btn ${teamStatsToggle === 'batting' ? 'active' : ''}`} onClick={() => setTeamStatsToggle('batting')}>Batting</button>
                <button className={`toggle-btn ${teamStatsToggle === 'pitching' ? 'active' : ''}`} onClick={() => setTeamStatsToggle('pitching')}>Pitching</button>
              </div>
            </div>
            
            {teamStatsToggle === 'batting' ? (
              currentBattingStats ? (
                <div className="team-stats-content">
                  <div className="team-stat-row">
                    <span className="team-stat-label">Team AVG</span>
                    <span className="team-stat-value">{currentBattingStats.avg || currentBattingStats.batting_avg || '.000'}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">OPS</span>
                    <span className="team-stat-value">{currentBattingStats.ops || '.000'}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">Home Runs</span>
                    <span className="team-stat-value">{currentBattingStats.homeruns || currentBattingStats.hr || 0}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">Runs Scored</span>
                    <span className="team-stat-value">{currentBattingStats.runs || currentBattingStats.r || 0}</span>
                  </div>
                  <div className="team-stat-row highlight">
                    <span className="team-stat-label">MLB Hitting Rank</span>
                    <span className="team-stat-value rank-value">
                      #{currentBattingStats.mlb_hitting_rank || '-'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="no-data-message">No batting stats available</div>
              )
            ) : (
              currentPitchingStats ? (
                <div className="team-stats-content">
                  <div className="team-stat-row">
                    <span className="team-stat-label">Team ERA</span>
                    <span className="team-stat-value">{currentPitchingStats.era || '0.00'}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">WHIP</span>
                    <span className="team-stat-value">{currentPitchingStats.whip || '0.00'}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">Strikeouts</span>
                    <span className="team-stat-value">{currentPitchingStats.strikeouts || currentPitchingStats.so || 0}</span>
                  </div>
                  <div className="team-stat-row highlight">
                    <span className="team-stat-label">Opp AVG</span>
                    <span className="team-stat-value">{currentPitchingStats.opp_avg || currentPitchingStats.avg || '.000'}</span>
                  </div>
                </div>
              ) : (
                <div className="no-data-message">No pitching stats available</div>
              )
            )}
          </div>
        </div>

        {/* Team Roster and Injury List */}
        <div className="roster-injury-section">
          {/* Team Roster */}
          <div className="section-card roster-card">
            <div className="card-header">
              <div>
                <h3>Team Roster</h3>
                <p className="card-subtitle">
                  {rosterFilter === 'all' && `${rosterCounts.total} Active Players`}
                  {rosterFilter === 'pitchers' && `${rosterCounts.pitchers} Pitchers`}
                  {rosterFilter === 'position' && `${rosterCounts.position} Position Players`}
                </p>
              </div>
              <div className="toggle-buttons">
                <button 
                  className={`toggle-btn ${rosterFilter === 'all' ? 'active' : ''}`} 
                  onClick={() => setRosterFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`toggle-btn ${rosterFilter === 'pitchers' ? 'active' : ''}`} 
                  onClick={() => setRosterFilter('pitchers')}
                >
                  Pitchers
                </button>
                <button 
                  className={`toggle-btn ${rosterFilter === 'position' ? 'active' : ''}`} 
                  onClick={() => setRosterFilter('position')}
                >
                  Position
                </button>
              </div>
            </div>
            <div className="roster-table-container">
              {filteredRoster && filteredRoster.length > 0 ? (
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Position</th>
                      <th>B/T</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((player, idx) => (
                      <tr key={player.id || idx}>
                        <td className="player-number">{player.jersey_number || '-'}</td>
                        <td className="player-name">{player.player_name || player.full_name || 'Unknown'}</td>
                        <td className="player-position">
                          <span className="position-badge">{player.position_abbreviation || player.position || '-'}</span>
                        </td>
                        <td className="player-hands">
                          {player.bats || '-'}/{player.throws || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data-message">
                  {rosterFilter === 'all' && 'No roster data available'}
                  {rosterFilter === 'pitchers' && 'No pitchers found'}
                  {rosterFilter === 'position' && 'No position players found'}
                </div>
              )}
            </div>
          </div>

          {/* Team Injury List */}
          <div className="section-card injury-card">
            <div className="card-header">
              <div>
                <h3>Injury Report</h3>
                <p className="card-subtitle">
                  {timeframe === 'season' && <><strong>📊 Full Season:</strong> {getInjuryCounts().total} {getInjuryCounts().total === 1 ? 'Injury' : 'Injuries'}</>}
                  {timeframe === 'first-half' && <><strong>1️⃣ First Half:</strong> {getInjuryCounts().total} {getInjuryCounts().total === 1 ? 'Injury' : 'Injuries'}</>}
                  {timeframe === 'second-half' && <><strong>2️⃣ Second Half:</strong> {getInjuryCounts().total} {getInjuryCounts().total === 1 ? 'Injury' : 'Injuries'}</>}
                </p>
              </div>
              {getInjuryCounts().total > 0 && (
                <div className="injury-summary-badges">
                  <button 
                    className={`injury-badge current ${injuryFilter === 'active' ? 'active-filter' : ''}`} 
                    title="Show active injuries first"
                    onClick={() => setInjuryFilter(injuryFilter === 'active' ? 'all' : 'active')}
                  >
                    🏥 {getInjuryCounts().current} Active
                  </button>
                  <button 
                    className={`injury-badge returned ${injuryFilter === 'returned' ? 'active-filter' : ''}`} 
                    title="Show returned injuries first"
                    onClick={() => setInjuryFilter(injuryFilter === 'returned' ? 'all' : 'returned')}
                  >
                    ✅ {getInjuryCounts().returned} Returned
                  </button>
                </div>
              )}
            </div>
            <div className="injury-list">
              {(() => {
                const injuries = getInjuriesForTimeframe();
                if (injuries && injuries.length > 0) {
                  // Sort based on injuryFilter selection
                  const sortedInjuries = [...injuries].sort((a, b) => {
                    const aActive = isStillInjured(a);
                    const bActive = isStillInjured(b);
                    
                    // If filter is 'active', show active injuries first
                    if (injuryFilter === 'active') {
                      if (aActive && !bActive) return -1;
                      if (!aActive && bActive) return 1;
                    }
                    // If filter is 'returned', show returned injuries first
                    else if (injuryFilter === 'returned') {
                      if (!aActive && bActive) return -1;
                      if (aActive && !bActive) return 1;
                    }
                    // For 'all' or within same group, sort by injury_date (most recent first)
                    return new Date(b.injury_date) - new Date(a.injury_date);
                  });
                  return sortedInjuries.map((injury, idx) => {
                    const stillInjured = isStillInjured(injury);
                    return (
                    <div key={idx} className={`injury-item ${stillInjured ? 'active' : 'returned'}`}>
                      <div className="injury-player-info">
                        <div className="injury-player-name">{injury.player_name || injury.name}</div>
                        <div className="injury-position">{injury.position}</div>
                      </div>
                      <div className="injury-details">
                        <div className="injury-type">{injury.injury_desc || 'No description'}</div>
                        <div className="injury-dates">
                          <span className="injury-date-label">IL Date:</span>
                          <span className="injury-date">{injury.injury_date ? new Date(injury.injury_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                          {injury.activation_date && !stillInjured && (
                            <>
                              <span className="injury-date-label">Returned:</span>
                              <span className="injury-date returned">{new Date(injury.activation_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </>
                          )}
                          {stillInjured && injury.expected_return_date && (
                            <>
                              <span className="injury-date-label">Expected:</span>
                              <span className="injury-date expected">{new Date(injury.expected_return_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                        <div className="injury-status-row">
                          <span className={`injury-status ${injury.injury_period?.includes('60') ? 'long-term' : 'short-term'}`}>
                            {injury.injury_period || 'IL'}
                          </span>
                          {injury.days_on_il !== undefined && (
                            <span className="injury-days">{injury.days_on_il} days</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )});
                } else {
                  return (
                    <div className="no-injuries">
                      <span className="no-injuries-icon">✅</span>
                      <p>No injuries recorded for {getInjuryPeriodLabel().toLowerCase()}</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamAnalytics;