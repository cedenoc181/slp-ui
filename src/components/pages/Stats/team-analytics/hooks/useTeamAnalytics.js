// ============================================================================
// USE TEAM ANALYTICS HOOK
// ============================================================================
// Custom hook for fetching all team analytics data.
// Handles season data, monthly data, stats, leaders, games, roster, injuries.
// ============================================================================

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';

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
  getTeamById,
  getTeamByUrlName,
  getTeamIdFromAbbr,
} from '../../../../../data/constants/apiConstants';

// Returns 'S' (spring, Jan–Feb), 'R' (regular, Mar–Sep), or 'P' (postseason, Oct+)
function getCurrentSeasonType() {
  const month = new Date().getMonth() + 1;
  if (month <= 2) return SEASON_TYPES.SPRING_TRAINING;
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
  const { user } = useAuth();

  // Initialize selectedTeam: URL param → user's favorite team → LAD
  const getInitialTeam = () => {
    if (teamName) {
      const team = getTeamByUrlName(teamName);
      if (team) return team.id;
    }
    if (user?.favoriteTeamId) {
      const favTeam = getTeamById(user.favoriteTeamId);
      if (favTeam) return favTeam.id;
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
  // AbortController for cancelling in-flight fetchTeamData on team/season switch
  const fetchAbortRef = useRef(null);

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
  const [leadersSeason, setLeadersSeason] = useState(null); // null = regular, 'S' = spring fallback
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
  const fetchTeamData = useCallback(async (teamId, season, isTeamSwitch = false, signal = null) => {
    if (!isTeamSwitch) setLoading(true);
    setError(null);

    const sst = getStatsSeasonType(season);
    const currentYear = new Date().getFullYear().toString();
    const hasLeadersData = d => d && typeof d === 'object' && Object.values(d).some(v => v?.player_name != null);

    try {
      // ── Tier 1: 5 requests — render the page skeleton immediately ──────────
      const [seasonData, monthlyData, battingStatsData, pitchingStatsData, rosterData] = await Promise.all([
        teamsService.getTeamSeason(teamId, season).catch(() => null),
        teamsService.getTeamMonthly(teamId, season).catch(() => null),
        teamStatsService.getTeamBattingStats(teamId, season, sst).catch(() => null),
        teamStatsService.getTeamPitchingStats(teamId, season, sst).catch(() => null),
        rosterService.getTeamRoster(teamId, season).catch(() => null),
      ]);

      if (signal?.aborted) return;

      setTeamSeasonData(seasonData);
      setTeamMonthlyData(monthlyData);
      setBattingStats(battingStatsData);
      setPitchingStats(pitchingStatsData);
      setRoster(rosterData);
      setLoading(false);
      setTimeout(() => setTransitionLoading(false), 100);

      // ── Tier 2: 6–8 requests — leaders + splits + home/away/last10 ─────────
      const [
        battingLeadersR, pitchingLeadersR,
        battingLeadersS, pitchingLeadersS,
        last10Data, homeGamesData, awayGamesData, splitsData,
      ] = await Promise.all([
        teamLeadersService.getTeamBattingLeaders(teamId, season, 'R').catch(() => null),
        teamLeadersService.getTeamPitchingLeaders(teamId, season, 'R').catch(() => null),
        season === currentYear
          ? teamLeadersService.getTeamBattingLeaders(teamId, season, 'S').catch(() => null)
          : Promise.resolve(null),
        season === currentYear
          ? teamLeadersService.getTeamPitchingLeaders(teamId, season, 'S').catch(() => null)
          : Promise.resolve(null),
        gamesService.getTeamLast10(teamId, season, sst).catch(() => null),
        gamesService.getTeamHomeGames(teamId, season, sst).catch(() => null),
        gamesService.getTeamAwayGames(teamId, season, sst).catch(() => null),
        teamLeadersService.getTeamSplits(teamId, season, sst, PLAYER_ROLES.BATTER).catch(() => null),
      ]);

      if (signal?.aborted) return;

      const battingLeadersData  = hasLeadersData(battingLeadersR)  ? battingLeadersR  : battingLeadersS;
      const pitchingLeadersData = hasLeadersData(pitchingLeadersR) ? pitchingLeadersR : pitchingLeadersS;
      setBattingLeaders(battingLeadersData);
      setPitchingLeaders(pitchingLeadersData);
      setLeadersSeason(!hasLeadersData(battingLeadersR) && !hasLeadersData(pitchingLeadersR) ? 'S' : null);
      setLast10Games(last10Data);
      setHomeGames(homeGamesData);
      setAwayGames(awayGamesData);
      setTeamSplits(splitsData);

      // ── Tier 3: 3 requests — injuries (least critical) ─────────────────────
      const [injFull, injFirst, injSecond] = await Promise.all([
        injuryService.getTeamInjuriesFullSeason(teamId, season).catch(() => null),
        injuryService.getTeamInjuriesFirstHalf(teamId, season).catch(() => null),
        injuryService.getTeamInjuriesSecondHalf(teamId, season).catch(() => null),
      ]);

      if (signal?.aborted) return;

      setInjuriesFullSeason(injFull);
      setInjuriesFirstHalf(injFirst);
      setInjuriesSecondHalf(injSecond);

    } catch (err) {
      if (signal?.aborted) return;
      console.error('❌ Error fetching team data:', err);
      setError(err.message || 'Failed to load team data. Please try again.');
      setLoading(false);
      setTransitionLoading(false);
    }
  }, []); // eslint-disable-line

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
        // Invalid URL team — fall back to favorite or LAD
        const fallback = (user?.favoriteTeamId && getTeamById(user.favoriteTeamId)) || getTeamByAbbr('LAD');
        navigate(`/team-analytics/${fallback.urlName}`, { replace: true });
      }
    } else {
      // No team in URL — navigate to favorite team or LAD
      const fallback = (user?.favoriteTeamId && getTeamById(user.favoriteTeamId)) || getTeamByAbbr('LAD');
      navigate(`/team-analytics/${fallback.urlName}`, { replace: true });
    }
  }, [teamName, navigate, selectedTeam, transitionLoading, user?.favoriteTeamId]);

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

    // Abort any previous in-flight fetch before starting a new one
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    // After initial load, subsequent fetches are team switches
    const isTeamSwitch = !isInitialLoadRef.current;
    fetchTeamData(teamId, selectedSeason, isTeamSwitch, controller.signal);
    fetchTeamGames(teamId, selectedSeason, gameLogSeasonType);
    checkAvailableSeasonTypes(teamId, selectedSeason);

    // Mark that initial load is done
    isInitialLoadRef.current = false;

    return () => {
      controller.abort();
      // Reset so the next effect run (e.g. StrictMode second-pass or dep change) can re-fetch
      currentFetchRef.current = null;
    };
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
    leadersSeason,
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
