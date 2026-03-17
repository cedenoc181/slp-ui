// ============================================================================
// USE TEAM ANALYTICS HOOK
// ============================================================================
// Custom hook for fetching all team analytics data.
// Handles season data, monthly data, stats, leaders, games, roster, injuries.
// ============================================================================

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

// API Services
import teamsService from '../../../../../data/services/teamsService';
import teamStatsService from '../../../../../data/services/teamStatsService';
import teamLeadersService from '../../../../../data/services/teamLeadersService';
import gamesService from '../../../../../data/services/gamesService';
import rosterService from '../../../../../data/services/rosterService';
import injuryService from '../../../../../data/services/injuryService';

// Constants
import {
  TEAMS,
  SEASONS,
  SEASON_TYPES,
  PLAYER_ROLES,
  ACTIVE_SEASON,
  getTeamByAbbr,
  getTeamByUrlName,
  getTeamIdFromAbbr,
} from '../../../../../data/constants/apiConstants';

// Returns 'S' (spring, Jan–Mar), 'R' (regular, Apr–Sep), or 'P' (postseason, Oct+)
function getCurrentSeasonType() {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return SEASON_TYPES.SPRING_TRAINING;
  if (month <= 9) return SEASON_TYPES.REGULAR;
  return SEASON_TYPES.POSTSEASON;
}

// Returns calendar-based season type for current year, Regular Season for prior years
function getStatsSeasonType(season) {
  const currentYear = new Date().getFullYear().toString();
  return season === currentYear ? getCurrentSeasonType() : SEASON_TYPES.REGULAR;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTeamAnalytics() {
  const { teamName } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize selectedTeam from URL param
  const getInitialTeam = () => {
    if (teamName) {
      const team = getTeamByUrlName(teamName);
      if (team) return team.id;
    }
    return 'LAD';
  };

  // Initialize season from URL query param
  const getInitialSeason = () => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam)) {
      return seasonParam;
    }
    return ACTIVE_SEASON;
  };

  // ========== UI State ==========
  const [selectedTeam, setSelectedTeam] = useState(getInitialTeam);
  const [selectedSeason, setSelectedSeasonState] = useState(getInitialSeason);
  const [timeframe, setTimeframe] = useState('season');
  const [chartFilter, setChartFilter] = useState('season');
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  const [leadersToggle, setLeadersToggle] = useState('batting');
  const [teamStatsToggle, setTeamStatsToggle] = useState('batting');
  const [rosterFilter, setRosterFilter] = useState('all');
  const [injuryFilter, setInjuryFilter] = useState('all');
  const [gameLogSeasonType, setGameLogSeasonType] = useState(() => {
    const currentYear = new Date().getFullYear().toString();
    return getInitialSeason() === currentYear ? getCurrentSeasonType() : 'R';
  }); // R, S, P

  const [hideFloatingFilters, setHideFloatingFilters] = useState(false);
  const [isChartSectionVisible, setIsChartSectionVisible] = useState(false);
  const [isStandingsSectionVisible, setIsStandingsSectionVisible] = useState(false);
  const chartSectionRef = useRef(null);
  const standingsSectionRef = useRef(null);

  // ========== TRANSITION LOADING STATE ==========
  // Full-page loading overlay when switching teams
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('Loading...');
  const transitionTimeoutRef = useRef(null);
  const filterChangeTimeoutRef = useRef(null);
  
  // Track current fetch to prevent double-fetching
  const currentFetchRef = useRef(null);

  // ========== API Data State ==========
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamGamesLoading, setTeamGamesLoading] = useState(false);

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
  const [teamGames, setTeamGames] = useState([]);
  
  // Available season types for game log (based on which have games)
  const [availableSeasonTypes, setAvailableSeasonTypes] = useState(['R', 'S', 'P']);

  // Injury Data
  const [injuriesFullSeason, setInjuriesFullSeason] = useState(null);
  const [injuriesFirstHalf, setInjuriesFirstHalf] = useState(null);
  const [injuriesSecondHalf, setInjuriesSecondHalf] = useState(null);
  
  // Track if this is the initial load (show skeleton) vs team switch (show overlay only)
  const isInitialLoadRef = useRef(true);

  // ========== Fetch All Team Data ==========
  const fetchTeamData = useCallback(async (teamId, season, isTeamSwitch = false) => {
    // Only show full loading skeleton on initial load, not team switches
    if (!isTeamSwitch) {
      setLoading(true);
    }
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
        teamStatsService.getTeamBattingStats(teamId, season, getStatsSeasonType(season)).catch(err => { console.warn('Batting stats failed:', err); return null; }),
        teamStatsService.getTeamPitchingStats(teamId, season, getStatsSeasonType(season)).catch(err => { console.warn('Pitching stats failed:', err); return null; }),
        teamLeadersService.getTeamBattingLeaders(teamId, season, getStatsSeasonType(season)).catch(err => { console.warn('Batting leaders failed:', err); return null; }),
        teamLeadersService.getTeamPitchingLeaders(teamId, season, getStatsSeasonType(season)).catch(err => { console.warn('Pitching leaders failed:', err); return null; }),
        gamesService.getTeamLast10(teamId, season, getStatsSeasonType(season)).catch(err => { console.warn('Last 10 failed:', err); return null; }),
        gamesService.getTeamHomeGames(teamId, season, getStatsSeasonType(season)).catch(err => { console.warn('Home games failed:', err); return null; }),
        gamesService.getTeamAwayGames(teamId, season, getStatsSeasonType(season)).catch(err => { console.warn('Away games failed:', err); return null; }),
        rosterService.getTeamRoster(teamId, season).catch(err => { console.warn('Roster failed:', err); return null; }),
        teamLeadersService.getTeamSplits(teamId, season, getStatsSeasonType(season), PLAYER_ROLES.BATTER).catch(err => { console.warn('Splits failed:', err); return null; }),
        injuryService.getTeamInjuriesFullSeason(teamId, season).catch(err => { console.warn('Injuries full season failed:', err); return null; }),
        injuryService.getTeamInjuriesFirstHalf(teamId, season).catch(err => { console.warn('Injuries first half failed:', err); return null; }),
        injuryService.getTeamInjuriesSecondHalf(teamId, season).catch(err => { console.warn('Injuries second half failed:', err); return null; }),
      ]);

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
      
      // First hide the main loading state so the page can render
      setLoading(false);
      
      // Give React a brief moment to render, then hide transition overlay
      setTimeout(() => {
        setTransitionLoading(false);
      }, 100);
      
    } catch (err) {
      console.error('❌ Error fetching team data:', err);
      setError(err.message || 'Failed to load team data. Please try again.');
      setLoading(false);
      setTransitionLoading(false);
    }
  }, []);

  // ========== Fetch Team Games (separate for season type switching) ==========
  const fetchTeamGames = useCallback(async (teamId, season, seasonType) => {
    setTeamGamesLoading(true);
    try {
      console.log(`📡 Fetching team games for ${teamId}, ${season}, ${seasonType}...`);
      const gamesData = await gamesService.getTeamGames(teamId, season, seasonType);
      setTeamGames(gamesData || []);
      console.log('✅ Team games fetched successfully!');
    } catch (err) {
      console.warn('Team games fetch failed:', err);
      setTeamGames([]);
    } finally {
      setTeamGamesLoading(false);
    }
  }, []);

  // ========== Check Available Season Types for Game Log ==========
  const checkAvailableSeasonTypes = useCallback(async (teamId, season) => {
    try {
      // Check postseason games availability
      const postseasonGames = await gamesService.getTeamGames(teamId, season, 'P');
      const hasPostseason = postseasonGames && postseasonGames.length > 0;
      
      // Regular and Spring Training are always shown, postseason only if games exist
      const types = ['R', 'S'];
      if (hasPostseason) {
        types.push('P');
      }
      setAvailableSeasonTypes(types);
      
      // If currently on postseason but no games, switch to regular season
      if (gameLogSeasonType === 'P' && !hasPostseason) {
        setGameLogSeasonType('R');
      }
    } catch (err) {
      console.warn('Failed to check season types:', err);
      setAvailableSeasonTypes(['R', 'S']); // Default to just regular and spring
    }
  }, [gameLogSeasonType]);

  // Reset game log season type when selected season changes:
  // current year → calendar-based type, prior years → Regular Season
  useEffect(() => {
    const currentYear = new Date().getFullYear().toString();
    setGameLogSeasonType(selectedSeason === currentYear ? getCurrentSeasonType() : 'R');
  }, [selectedSeason]);

  // ========== Effects ==========

  // Sync selectedTeam when URL changes (e.g., browser back/forward, direct URL entry)
  // Skip if we're in the middle of a transition (handleTeamChange already set the state)
  useEffect(() => {
    // Skip sync during transition - handleTeamChange already handled it
    if (transitionLoading) return;
    
    if (teamName) {
      const team = getTeamByUrlName(teamName);
      if (team) {
        if (team.id !== selectedTeam) {
          setSelectedTeam(team.id);
        }
      } else {
        navigate('/team-analytics/los-angeles-dodgers', { replace: true });
      }
    } else {
      navigate('/team-analytics/los-angeles-dodgers', { replace: true });
    }
  }, [teamName, navigate, selectedTeam, transitionLoading]);

  // Sync selectedSeason when URL query param changes (e.g., from browser back/forward)
  // Skip if we're in the middle of a transition (setSelectedSeason already handled it)
  useEffect(() => {
    // Skip sync during transition - setSelectedSeason already handled it
    if (transitionLoading) return;
    
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam) && seasonParam !== selectedSeason) {
      // Use the state setter directly to avoid circular URL updates
      setSelectedSeasonState(seasonParam);
    }
  }, [searchParams, selectedSeason, transitionLoading]);

  // Fetch data when team or season changes
  useEffect(() => {
    const teamId = getTeamIdFromAbbr(selectedTeam);
    if (!teamId) return;

    // Create a unique key for this fetch to prevent duplicates
    const fetchKey = `${teamId}-${selectedSeason}`;

    // Skip if we're already fetching this exact combination
    if (currentFetchRef.current === fetchKey) return;
    currentFetchRef.current = fetchKey;

    // After initial load, subsequent fetches are team switches
    const isTeamSwitch = !isInitialLoadRef.current;
    fetchTeamData(teamId, selectedSeason, isTeamSwitch);
    fetchTeamGames(teamId, selectedSeason, gameLogSeasonType);
    checkAvailableSeasonTypes(teamId, selectedSeason);

    // Mark that initial load is done
    isInitialLoadRef.current = false;
  }, [selectedTeam, selectedSeason, fetchTeamData, fetchTeamGames, checkAvailableSeasonTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch game log when season type selector changes
  useEffect(() => {
    const teamId = getTeamIdFromAbbr(selectedTeam);
    if (!teamId) return;
    fetchTeamGames(teamId, selectedSeason, gameLogSeasonType);
  }, [gameLogSeasonType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Footer intersection observer
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const observer = new IntersectionObserver(
      (entries) => setHideFloatingFilters(entries[0].isIntersecting),
      { root: null, threshold: 0 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // Chart section intersection observer
  useEffect(() => {
    const target = chartSectionRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => setIsChartSectionVisible(entries[0].isIntersecting),
      { root: null, threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading]);

  // Standings section intersection observer - hide floating filters when standings appears (mobile only)
  useEffect(() => {
    const target = standingsSectionRef.current;
    if (!target) return;
    const isMobile = () => window.innerWidth <= 480;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isMobile()) {
          setIsStandingsSectionVisible(entries[0].isIntersecting);
        } else {
          setIsStandingsSectionVisible(false);
        }
      },
      { root: null, threshold: 0.2 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, []);

  // Listen for nav click event from Header to show loading overlay
  useEffect(() => {
    const handleNavClick = () => {
      setTransitionLoading(true);
      setTransitionMessage('Loading Team Analytics...');
      
      // Auto-hide after a short delay (page is already loaded, just scrolling to top)
      setTimeout(() => {
        setTransitionLoading(false);
      }, 500);
    };
    
    window.addEventListener('team-analytics-nav-click', handleNavClick);
    return () => window.removeEventListener('team-analytics-nav-click', handleNavClick);
  }, []);

  // ========== Handlers ==========

  const handleTeamChange = useCallback((teamId) => {
    const team = getTeamByAbbr(teamId);
    if (team) {
      // Show transition loading overlay immediately
      setTransitionLoading(true);
      setTransitionMessage(`Loading ${team.name} analytics...`);
      
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Reset fetch ref to allow the new fetch
      currentFetchRef.current = null;
      
      setSelectedTeam(teamId);
      navigate(`/team-analytics/${team.urlName}`);
      
      // Note: The overlay will be hidden by fetchTeamData after data loads and renders
    }
  }, [navigate]);

  const handleChartFilterChange = useCallback((newFilter) => {
    if (isFilterChanging || newFilter === chartFilter) return;
    setIsFilterChanging(true);
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }
    setChartFilter(newFilter);
    filterChangeTimeoutRef.current = setTimeout(() => {
      setIsFilterChanging(false);
    }, 300);
  }, [chartFilter, isFilterChanging]);

  const handleLeaderClick = useCallback((leaderData, isPitching = false) => {
    if (!leaderData) return;
    const playerSlug = leaderData.name_slug || leaderData.player_mlb_id;
    if (playerSlug) {
      const viewParam = isPitching ? '&view=pitching' : '';
      navigate(`/player/${playerSlug}?season=${selectedSeason}${viewParam}`);
      window.scrollTo(0, 0);
    }
  }, [navigate, selectedSeason]);

  const retryFetch = useCallback(() => {
    fetchTeamData(getTeamIdFromAbbr(selectedTeam), selectedSeason);
  }, [fetchTeamData, selectedTeam, selectedSeason]);

  // ========== Season Change Handler (updates state + URL) ==========
  const setSelectedSeason = useCallback((newSeason) => {
    // Show transition loading overlay immediately
    setTransitionLoading(true);
    setTransitionMessage(`Loading ${newSeason} season...`);
    
    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // Reset fetch ref to allow the new fetch
    currentFetchRef.current = null;
    
    setSelectedSeasonState(newSeason);
    // Update URL with new season parameter
    const newParams = new URLSearchParams(searchParams);
    newParams.set('season', newSeason);
    setSearchParams(newParams, { replace: true });
    
    // Note: The overlay will be hidden by fetchTeamData after data loads and renders
  }, [searchParams, setSearchParams]);

  // ========== Computed Values ==========

  const currentTeam = useMemo(() => getTeamByAbbr(selectedTeam), [selectedTeam]);
  const currentTeamName = currentTeam?.name || 'Team';
  const teamMlbId = currentTeam?.mlbId || null;
  const shouldHideFloatingFilters = hideFloatingFilters || !isChartSectionVisible || isStandingsSectionVisible;

  return {
    // URL/Navigation
    navigate,
    searchParams,

    // Team Selection
    selectedTeam,
    setSelectedTeam,
    selectedSeason,
    setSelectedSeason,
    currentTeam,
    currentTeamName,
    teamMlbId,
    handleTeamChange,

    // Timeframe
    timeframe,
    setTimeframe,

    // Chart Filter
    chartFilter,
    isFilterChanging,
    handleChartFilterChange,
    chartSectionRef,
    standingsSectionRef,
    shouldHideFloatingFilters,

    // Loading/Error
    loading,
    error,
    retryFetch,

    // Transition Loading (team switch overlay)
    transitionLoading,
    transitionMessage,
    setTransitionLoading,

    // Raw Data
    teamSeasonData,
    teamMonthlyData,
    battingStats,
    pitchingStats,
    battingLeaders,
    pitchingLeaders,
    last10Games,
    homeGames,
    awayGames,
    roster,
    teamSplits,
    injuriesFullSeason,
    injuriesFirstHalf,
    injuriesSecondHalf,

    // Team Games (Game Log)
    teamGames,
    teamGamesLoading,
    gameLogSeasonType,
    setGameLogSeasonType,
    availableSeasonTypes,

    // Toggle States
    leadersToggle,
    setLeadersToggle,
    teamStatsToggle,
    setTeamStatsToggle,
    rosterFilter,
    setRosterFilter,
    injuryFilter,
    setInjuryFilter,

    // Handlers
    handleLeaderClick,

    // Constants
    TEAMS,
    SEASONS,
  };
}

export default useTeamAnalytics;
