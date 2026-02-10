import React, { useState, useMemo, useEffect, useCallback, useRef, startTransition } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SEASONS, TEAM_METADATA } from '../../../../data/constants/apiConstants';
import playerStatsService from '../../../../data/services/playerStatsServices';
import injuryService from '../../../../data/services/injuryService';
import rosterService from '../../../../data/services/rosterService';
import gamesService from '../../../../data/services/gamesService';
import '../../../../styles/stats-page-styling/player-profile.css';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
// These components are split from the main file to improve performance and
// maintainability. Each component handles a specific section of the page.
// See ./components/index.js for component documentation.
// ============================================================================
import {
  PlayerProfileHeader,
  RecentFormSection,
  SeasonStatsSection,
  SplitsSection,
  PlayerHistorySection,
  GameLogSection,
} from './components';

// Minimum loading duration to prevent flash (in ms)
const MIN_LOADING_DURATION = 400;

// Helper to ensure minimum loading time for smoother UX
const withMinLoadingTime = async (promise, startTime) => {
  const result = await promise;
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_LOADING_DURATION) {
    await new Promise(resolve => setTimeout(resolve, MIN_LOADING_DURATION - elapsed));
  }
  return result;
};

// Helper to extract MLB ID from name slug (e.g., "aaron-judge-592450" -> 592450)
// Also handles raw numeric IDs for backwards compatibility
const extractMlbIdFromSlug = (slug) => {
  if (!slug) return null;
  
  // If the slug is just a number, treat it as the MLB ID directly
  if (/^\d+$/.test(slug)) {
    return parseInt(slug, 10);
  }
  
  // MLB ID is the last segment after the final hyphen (always numeric)
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

function PlayerProfileStats() {
  const { nameSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract MLB ID from the SEO-friendly slug
  const mlbIdFromSlug = useMemo(() => {
    return extractMlbIdFromSlug(nameSlug);
  }, [nameSlug]);
  
  // Initialize season from URL params or default
  // MLB season starts April 1st - before that, default to previous year
  const [selectedSeason, setSelectedSeason] = useState(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam)) {
      return seasonParam;
    }
    // Determine default season based on current date
    // If before April 1st, use previous year (no data for current year yet)
    const now = new Date();
    const currentYear = now.getFullYear();
    const aprilFirst = new Date(currentYear, 3, 1); // Month is 0-indexed, so 3 = April
    const defaultSeason = now < aprilFirst ? String(currentYear - 1) : String(currentYear);
    // Use calculated default if available in SEASONS, otherwise use most recent available season
    return SEASONS.includes(defaultSeason) ? defaultSeason : SEASONS[0];
  });

  // State for active tabs/filters
  const [activeStatsTab, setActiveStatsTab] = useState('current'); // current, career
  const [activeSplitsTab, setActiveSplitsTab] = useState('handedness'); // handedness, homeAway
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const seasonDropdownRef = useRef(null);
  const careerFetchAbortRef = useRef(null); // Abort controller for career data fetches
  const currentPlayerIdRef = useRef(null); // Track current player to prevent stale updates
  const isFetchingCareerRef = useRef(false); // Prevent multiple simultaneous career fetches
  const statsFetchIdRef = useRef(0); // Increment on each stats fetch to detect stale responses
  const gameLogFetchIdRef = useRef(0); // Increment on each game log fetch to detect stale responses
  const recentFormFetchIdRef = useRef(0); // Increment on each recent form fetch to detect stale responses
  const isMountedRef = useRef(true); // Track if component is mounted
  const [gameLogSeasonType, setGameLogSeasonType] = useState('R'); // R (Regular), S (Spring Training), P (Postseason)
  const [gameLogPage, setGameLogPage] = useState(1); // Current page for game log pagination
  const gamesPerPage = 10; // Number of games per page
  
  // Recent Form section has its own season type (independent from Game Log)
  const [recentFormSeasonType, setRecentFormSeasonType] = useState('R'); // R (Regular), S (Spring Training), P (Postseason)
  const [recentFormGameLog, setRecentFormGameLog] = useState([]); // Separate game log for recent form (batting for TWP)
  const [pitchingRecentFormGameLog, setPitchingRecentFormGameLog] = useState([]); // Separate pitching game log for TWP recent form
  const [recentFormLoading, setRecentFormLoading] = useState(false);
  
  const [trendTimeframe, setTrendTimeframe] = useState('5y'); // 1y, 3y, 5y, career
  const [selectedChartMetric, setSelectedChartMetric] = useState('hr'); // hr, h, avg, ops, bb, so
  
  // Initialize twoWayViewMode from URL 'view' param (for links from team leaders, etc.)
  // Supports: ?view=pitching or ?view=batting (default: batting)
  const getInitialViewMode = () => {
    const viewParam = searchParams.get('view');
    return viewParam === 'pitching' ? 'pitching' : 'batting';
  };
  const [twoWayViewMode, setTwoWayViewMode] = useState(getInitialViewMode); // batting (default), pitching - for TWP players

  // Loading states
  const [playerLoading, setPlayerLoading] = useState(true);
  const [gameLogLoading, setGameLogLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Player data state (populated by API)
  const [playerInfo, setPlayerInfo] = useState(null);
  const [seasonStats, setSeasonStats] = useState(null);
  const [careerStats, setCareerStats] = useState([]);
  const [careerTotals, setCareerTotals] = useState(null);
  const [careerTotalsLoading, setCareerTotalsLoading] = useState(false);
  const [vsHandSplits, setVsHandSplits] = useState([]);
  const [homeRoadSplits, setHomeRoadSplits] = useState([]);
  const [vsHandSplitsCareer, setVsHandSplitsCareer] = useState(null);
  const [homeRoadSplitsCareer, setHomeRoadSplitsCareer] = useState(null);
  const [careerSplitsLoading, setCareerSplitsLoading] = useState(false);
  const [monthlyPerformance, setMonthlyPerformance] = useState(null);
  
  // Two-way player: separate pitching stats (batting stats stored in regular state above)
  const [pitchingSeasonStats, setPitchingSeasonStats] = useState(null);
  const [pitchingCareerStats, setPitchingCareerStats] = useState([]);
  const [pitchingVsHandSplits, setPitchingVsHandSplits] = useState([]);
  const [pitchingHomeRoadSplits, setPitchingHomeRoadSplits] = useState([]);
  const [pitchingMonthlyPerformance, setPitchingMonthlyPerformance] = useState(null);
  const [pitchingCareerTotals, setPitchingCareerTotals] = useState(null);
  const [pitchingVsHandSplitsCareer, setPitchingVsHandSplitsCareer] = useState(null);
  const [pitchingHomeRoadSplitsCareer, setPitchingHomeRoadSplitsCareer] = useState(null);
  
  const [teamHistory, setTeamHistory] = useState([]);
  const [injuryHistory, setInjuryHistory] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);

  // Sync season FROM URL params when they change
  // Note: Only depends on searchParams - we check selectedSeason inside but don't include it
  // in deps to avoid loops. This is intentional: we only want to react to URL changes.
  useEffect(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam)) {
      setSelectedSeason(prev => prev !== seasonParam ? seasonParam : prev);
    }
  }, [searchParams]);

  // Track component mount state to prevent updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Close season dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target)) {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update URL when season changes
  const handleSeasonChange = (newSeason) => {
    setSelectedSeason(newSeason);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('season', newSeason);
    setSearchParams(newParams, { replace: true });
  };

  // Fetch player info on mount or when nameSlug changes
  useEffect(() => {
    const fetchPlayerInfo = async () => {
      if (!mlbIdFromSlug) {
        console.warn('No MLB ID extracted from slug:', nameSlug);
        setError('Invalid player URL');
        setPlayerLoading(false);
        return;
      }
      
      setPlayerLoading(true);
      setError(null);
      
      try {
        // Use MLB ID from slug to fetch player info
        const data = await playerStatsService.getPlayerInfoByMlbId(mlbIdFromSlug);
        
        // Handle different response formats - API might return data nested or flat
        const playerData = data?.player || data;
        
        // Ensure we have an id field for subsequent API calls
        if (!playerData?.id && playerData?.player_id) {
          playerData.id = playerData.player_id;
        }
        
        setPlayerInfo(playerData);
      } catch (err) {
        console.error('Error fetching player info:', err);
        setError('Failed to load player information');
        setPlayerInfo(null);
      } finally {
        setPlayerLoading(false);
      }
    };
    
    fetchPlayerInfo();
  }, [mlbIdFromSlug]);

  // Reset career-related state when player changes (ensures stale data doesn't persist)
  useEffect(() => {
    if (playerInfo?.id) {
      // Abort any pending career data fetches for previous player
      if (careerFetchAbortRef.current) {
        careerFetchAbortRef.current.abort();
        careerFetchAbortRef.current = null;
      }
      
      // Reset fetch-in-progress flag
      isFetchingCareerRef.current = false;
      
      // Invalidate all in-flight fetches by incrementing their IDs
      statsFetchIdRef.current++;
      gameLogFetchIdRef.current++;
      recentFormFetchIdRef.current++;
      
      // Update current player ID ref
      currentPlayerIdRef.current = playerInfo.id;
      
      // Reset career totals and splits so they get refetched for the new player
      setCareerTotals(null);
      setPitchingCareerTotals(null);
      setVsHandSplitsCareer(null);
      setHomeRoadSplitsCareer(null);
      setPitchingVsHandSplitsCareer(null);
      setPitchingHomeRoadSplitsCareer(null);
      // Reset loading states
      setCareerTotalsLoading(false);
      setCareerSplitsLoading(false);
      // Reset to current stats tab when loading new player
      setActiveStatsTab('current');
    }
  }, [playerInfo?.id]); // Only trigger when player ID actually changes

  // Fetch player injury history when playerInfo loads
  useEffect(() => {
    const fetchInjuryHistory = async () => {
      if (!playerInfo?.id) return;
      
      try {
        // Pass player.id (internal DB ID) to get accurate injury history
        // Don't pass season to get full history
        const response = await injuryService.getPlayerInjuryHistory(playerInfo.id);
        // API returns { player_id, season, total_injuries, injuries: [...] }
        const injuries = response?.injuries || [];
        setInjuryHistory(Array.isArray(injuries) ? injuries : []);
      } catch (err) {
        console.error('Error fetching injury history:', err);
        setInjuryHistory([]);
      }
    };
    
    fetchInjuryHistory();
  }, [playerInfo]);

  // Fetch team history (roster history) when playerInfo changes
  useEffect(() => {
    const fetchTeamHistory = async () => {
      if (!playerInfo?.id) return;
      
      try {
        // Get player roster history without season param for full history
        const response = await rosterService.getPlayerRosterHistory(playerInfo.id);
        // API returns { player_id, player_mlb_id, player_name, seasons: [...] }
        const seasons = response?.seasons || [];
        setTeamHistory(Array.isArray(seasons) ? seasons : []);
      } catch (err) {
        console.error('Error fetching team history:', err);
        setTeamHistory([]);
      }
    };
    
    fetchTeamHistory();
  }, [playerInfo]);

  // Fetch game logs when player, season, season type, or TWP view mode changes
  useEffect(() => {
    if (!playerInfo?.id) return;
    
    // Increment fetch ID to invalidate any in-flight requests
    const fetchId = ++gameLogFetchIdRef.current;
    const internalPlayerId = playerInfo.id;
    
    // Helper to check if this fetch is still valid
    const isStillValid = () => 
      isMountedRef.current && 
      gameLogFetchIdRef.current === fetchId && 
      currentPlayerIdRef.current === internalPlayerId;
    
    const fetchGameLogs = async () => {
      const startTime = Date.now();
      setGameLogLoading(true);
      try {
        const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
        const isPitcherType = pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
        // Only consider true TWP (position explicitly set to TWP) for game log fetching
        const isTruelyTwoWay = pos === 'TWP' || pos === 'Two-Way Player';
        
        // For TWP: use twoWayViewMode to determine which game logs to fetch
        // For pitchers: always fetch pitcher logs. For batters: always fetch batter logs.
        const shouldFetchPitcherLogs = isTruelyTwoWay ? twoWayViewMode === 'pitching' : isPitcherType;
        
        let response;
        if (shouldFetchPitcherLogs) {
          response = await gamesService.getPitcherGameLogs(
            internalPlayerId,
            selectedSeason,
            gameLogSeasonType
          );
        } else {
          response = await gamesService.getBatterGameLogs(
            internalPlayerId,
            selectedSeason,
            gameLogSeasonType
          );
        }
        
        // Check if still valid before proceeding
        if (!isStillValid()) return;
        
        // API returns { games: [...] }
        const games = response?.games || [];
        
        // Ensure minimum loading time for smoother UX
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_DURATION) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_DURATION - elapsed));
        }
        
        // Final check before setting state
        if (!isStillValid()) return;
        
        setGameLog(Array.isArray(games) ? games : []);
        setGameLogPage(1);
      } catch (err) {
        if (isStillValid()) {
          console.error('Error fetching game logs:', err);
          setGameLog([]);
        }
      } finally {
        if (isStillValid()) {
          setGameLogLoading(false);
        }
      }
    };
    
    fetchGameLogs();
    
    return () => {
      gameLogFetchIdRef.current++;
    };
  }, [playerInfo, selectedSeason, gameLogSeasonType, twoWayViewMode]);

  // Fetch game logs for Recent Form section (independent from Game Log section)
  useEffect(() => {
    if (!playerInfo?.id) return;
    
    // Increment fetch ID to invalidate any in-flight requests
    const fetchId = ++recentFormFetchIdRef.current;
    const internalPlayerId = playerInfo.id;
    
    // Helper to check if this fetch is still valid
    const isStillValid = () => 
      isMountedRef.current && 
      recentFormFetchIdRef.current === fetchId && 
      currentPlayerIdRef.current === internalPlayerId;
    
    const fetchRecentFormGameLogs = async () => {
      const startTime = Date.now();
      setRecentFormLoading(true);
      try {
        const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
        const isPitcherPos = pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
        // Only consider true TWP (position explicitly set to TWP) for separate game log fetching
        const isTruelyTwoWay = pos === 'TWP' || pos === 'Two-Way Player';
        
        let battingGames = [];
        let pitchingGames = [];
        
        if (isTruelyTwoWay) {
          // For true TWP (like Ohtani), fetch BOTH batting and pitching game logs
          const [battingResponse, pitchingResponse] = await Promise.all([
            gamesService.getBatterGameLogs(internalPlayerId, selectedSeason, recentFormSeasonType).catch(() => ({ games: [] })),
            gamesService.getPitcherGameLogs(internalPlayerId, selectedSeason, recentFormSeasonType).catch(() => ({ games: [] })),
          ]);
          
          // Check if still valid
          if (!isStillValid()) return;
          
          battingGames = battingResponse?.games || [];
          pitchingGames = pitchingResponse?.games || [];
        } else if (isPitcherPos) {
          const response = await gamesService.getPitcherGameLogs(
            internalPlayerId,
            selectedSeason,
            recentFormSeasonType
          );
          
          if (!isStillValid()) return;
          
          const games = response?.games || response || [];
          battingGames = Array.isArray(games) ? games : [];
        } else {
          const response = await gamesService.getBatterGameLogs(
            internalPlayerId,
            selectedSeason,
            recentFormSeasonType
          );
          
          if (!isStillValid()) return;
          
          const games = response?.games || [];
          battingGames = Array.isArray(games) ? games : [];
        }
        
        // Ensure minimum loading time for smoother UX
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_DURATION) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_DURATION - elapsed));
        }
        
        // Final check before setting state
        if (!isStillValid()) return;
        
        setRecentFormGameLog(battingGames);
        setPitchingRecentFormGameLog(pitchingGames);
      } catch (err) {
        if (isStillValid()) {
          console.error('Error fetching recent form game logs:', err);
          setRecentFormGameLog([]);
          setPitchingRecentFormGameLog([]);
        }
      } finally {
        if (isStillValid()) {
          setRecentFormLoading(false);
        }
      }
    };
    
    fetchRecentFormGameLogs();
    
    return () => {
      recentFormFetchIdRef.current++;
    };
  }, [playerInfo, selectedSeason, recentFormSeasonType]);

  // Fetch season stats, career stats, and splits when player info or season changes
  useEffect(() => {
    if (!playerInfo?.id) {
      return;
    }
    
    // Increment fetch ID to invalidate any in-flight requests
    const fetchId = ++statsFetchIdRef.current;
    const internalPlayerId = playerInfo.id;
    
    // Helper to check if this fetch is still valid
    const isStillValid = () => 
      isMountedRef.current && 
      statsFetchIdRef.current === fetchId && 
      currentPlayerIdRef.current === internalPlayerId;
    
    const fetchPlayerStats = async () => {
      const startTime = Date.now();
      setStatsLoading(true);
      
      // Variables to hold results before setting state
      let seasonStatsResult = null;
      let careerStatsResult = [];
      let vsHandSplitsResult = [];
      let homeRoadSplitsResult = [];
      let monthlyPerformanceResult = null;
      let pitchingSeasonStatsResult = null;
      let pitchingCareerStatsResult = [];
      let pitchingVsHandSplitsResult = [];
      let pitchingHomeRoadSplitsResult = [];
      let pitchingMonthlyPerformanceResult = null;
      
      try {
        // Determine player type based on position
        const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
        const isPitcherType = pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
        const isTwoWayType = pos === 'TWP' || pos === 'Two-Way Player' || playerInfo.is_two_way;
        
        // Fetch current season stats
        if (isPitcherType && !isTwoWayType) {
          const [current, career, vsHand, homeRoad, monthly] = await Promise.all([
            playerStatsService.getPitcherCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getPitcherCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getPitcherVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
          ]);
          
          // Check if still valid before storing results
          if (!isStillValid()) return;
          
          seasonStatsResult = current;
          careerStatsResult = career;
          vsHandSplitsResult = vsHand;
          homeRoadSplitsResult = homeRoad;
          monthlyPerformanceResult = monthly;
        } else if (isTwoWayType) {
          // Two-way player: fetch BOTH batting AND pitching stats
          const [
            currentBatting, careerBatting, vsHandBatting, homeRoadBatting, monthlyBatting,
            currentPitching, careerPitching, vsHandPitching, homeRoadPitching, monthlyPitching
          ] = await Promise.all([
            // Batting stats
            playerStatsService.getBatterCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getBatterCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getBatterVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
            // Pitching stats
            playerStatsService.getPitcherCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getPitcherCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getPitcherVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
          ]);
          
          // Check if still valid before storing results
          if (!isStillValid()) return;
          
          // Store results in variables
          seasonStatsResult = currentBatting;
          careerStatsResult = careerBatting;
          vsHandSplitsResult = vsHandBatting;
          homeRoadSplitsResult = homeRoadBatting;
          monthlyPerformanceResult = monthlyBatting;
          pitchingSeasonStatsResult = currentPitching;
          pitchingCareerStatsResult = careerPitching;
          pitchingVsHandSplitsResult = vsHandPitching;
          pitchingHomeRoadSplitsResult = homeRoadPitching;
          pitchingMonthlyPerformanceResult = monthlyPitching;
        } else {
          // Batter only
          const [current, career, vsHand, homeRoad, monthly] = await Promise.all([
            playerStatsService.getBatterCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getBatterCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getBatterVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
          ]);
          
          // Check if still valid before storing results
          if (!isStillValid()) return;
          
          seasonStatsResult = current;
          careerStatsResult = career;
          vsHandSplitsResult = vsHand;
          homeRoadSplitsResult = homeRoad;
          monthlyPerformanceResult = monthly;
        }
        
        // Ensure minimum loading time for smoother UX
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_DURATION) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_DURATION - elapsed));
        }
        
        // Final check before setting state
        if (!isStillValid()) return;
        
        // Set all state at once after minimum loading time
        setSeasonStats(seasonStatsResult);
        setCareerStats(careerStatsResult);
        setVsHandSplits(vsHandSplitsResult);
        setHomeRoadSplits(homeRoadSplitsResult);
        setMonthlyPerformance(monthlyPerformanceResult);
        setPitchingSeasonStats(pitchingSeasonStatsResult);
        setPitchingCareerStats(pitchingCareerStatsResult);
        setPitchingVsHandSplits(pitchingVsHandSplitsResult);
        setPitchingHomeRoadSplits(pitchingHomeRoadSplitsResult);
        setPitchingMonthlyPerformance(pitchingMonthlyPerformanceResult);
      } catch (err) {
        if (isStillValid()) {
          console.error('Error fetching player stats:', err);
        }
      } finally {
        if (isStillValid()) {
          setStatsLoading(false);
        }
      }
    };
    
    fetchPlayerStats();
    
    // Cleanup: invalidate this fetch if effect re-runs or unmounts
    return () => {
      statsFetchIdRef.current++;
    };
  }, [playerInfo, selectedSeason]);

  // Helper to determine if player is a pitcher
  const isPitcher = useMemo(() => {
    if (!playerInfo) return false;
    const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
    return pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
  }, [playerInfo]);

  const isTwoWay = useMemo(() => {
    if (!playerInfo) return false;
    const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
    return pos === 'TWP' || pos === 'Two-Way Player' || playerInfo.is_two_way;
  }, [playerInfo]);

  // Computed: should we show pitching stats?
  // For TWP: use twoWayViewMode. For pitchers: yes. For batters: no.
  const showPitchingStats = useMemo(() => {
    if (isTwoWay) return twoWayViewMode === 'pitching';
    return isPitcher;
  }, [isTwoWay, twoWayViewMode, isPitcher]);

  // For TWP: get the active stats based on current view mode
  const activeSeasonStats = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingSeasonStats;
    return seasonStats;
  }, [isTwoWay, twoWayViewMode, pitchingSeasonStats, seasonStats]);

  const activeCareerStats = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingCareerStats;
    return careerStats;
  }, [isTwoWay, twoWayViewMode, pitchingCareerStats, careerStats]);

  const activeVsHandSplits = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingVsHandSplits;
    return vsHandSplits;
  }, [isTwoWay, twoWayViewMode, pitchingVsHandSplits, vsHandSplits]);

  const activeHomeRoadSplits = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingHomeRoadSplits;
    return homeRoadSplits;
  }, [isTwoWay, twoWayViewMode, pitchingHomeRoadSplits, homeRoadSplits]);

  const activeMonthlyPerformance = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingMonthlyPerformance;
    return monthlyPerformance;
  }, [isTwoWay, twoWayViewMode, pitchingMonthlyPerformance, monthlyPerformance]);

  const activeCareerTotals = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingCareerTotals;
    return careerTotals;
  }, [isTwoWay, twoWayViewMode, pitchingCareerTotals, careerTotals]);

  const activeVsHandSplitsCareer = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingVsHandSplitsCareer;
    return vsHandSplitsCareer;
  }, [isTwoWay, twoWayViewMode, pitchingVsHandSplitsCareer, vsHandSplitsCareer]);

  const activeHomeRoadSplitsCareer = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingHomeRoadSplitsCareer;
    return homeRoadSplitsCareer;
  }, [isTwoWay, twoWayViewMode, pitchingHomeRoadSplitsCareer, homeRoadSplitsCareer]);

  // Fetch career totals and career splits when Career tab is selected
  // Uses refs to avoid stale closure issues and prevent state updates for wrong player
  // Uses startTransition to make the tab switch non-blocking
  const handleCareerTabClick = useCallback(async () => {
    // Switch tab using startTransition to prevent blocking the UI
    startTransition(() => {
      setActiveStatsTab('career');
    });
    
    // Guard: prevent multiple simultaneous fetches
    if (isFetchingCareerRef.current) {
      return;
    }
    
    if (!playerInfo?.id) return;
    
    const internalPlayerId = playerInfo.id;
    const playerIdAtFetchStart = internalPlayerId;
    
    // Helper to check if we should still update state (player hasn't changed)
    const isStillCurrentPlayer = () => currentPlayerIdRef.current === playerIdAtFetchStart;
    
    // Check if we already have data for this player (skip fetch if cached)
    // careerTotals being non-null means we already fetched for this player
    if (careerTotals !== null && currentPlayerIdRef.current === internalPlayerId) {
      // Data already loaded, just switch tab
      return;
    }
    
    // Mark as fetching
    isFetchingCareerRef.current = true;
    
    // Use startTransition for loading state to keep UI responsive
    startTransition(() => {
      setCareerTotalsLoading(true);
    });
    
    try {
      // Fetch career totals
      try {
        let totals;
        if (isPitcher && !isTwoWay) {
          totals = await playerStatsService.getPitcherCareerTotals(internalPlayerId);
        } else {
          totals = await playerStatsService.getBatterCareerTotals(internalPlayerId);
        }
        if (isStillCurrentPlayer()) {
          setCareerTotals(totals);
        }
      } catch (err) {
        if (isStillCurrentPlayer()) {
          console.error('Error fetching career totals:', err);
          setCareerTotals(null);
        }
      } finally {
        if (isStillCurrentPlayer()) {
          setCareerTotalsLoading(false);
        }
      }
      
      // For TWP, also fetch pitching career totals
      if (isTwoWay && isStillCurrentPlayer()) {
        try {
          const pitchingTotals = await playerStatsService.getPitcherCareerTotals(internalPlayerId);
          if (isStillCurrentPlayer()) {
            setPitchingCareerTotals(pitchingTotals);
          }
        } catch (err) {
          if (isStillCurrentPlayer()) {
            setPitchingCareerTotals(null);
          }
        }
      }
      
      // Fetch career splits
      if (isStillCurrentPlayer()) {
        setCareerSplitsLoading(true);
        try {
          let vsHandCareer, homeRoadCareer;
          if (isPitcher && !isTwoWay) {
            [vsHandCareer, homeRoadCareer] = await Promise.all([
              playerStatsService.getPitcherVsHandSplitsCareerTotals(internalPlayerId).catch(() => null),
              playerStatsService.getPitcherHomeRoadSplitsCareerTotals(internalPlayerId).catch(() => null),
            ]);
          } else {
            [vsHandCareer, homeRoadCareer] = await Promise.all([
              playerStatsService.getBatterVsHandSplitsCareerTotals(internalPlayerId).catch(() => null),
              playerStatsService.getBatterHomeRoadSplitsCareerTotals(internalPlayerId).catch(() => null),
            ]);
          }
          if (isStillCurrentPlayer()) {
            setVsHandSplitsCareer(vsHandCareer);
            setHomeRoadSplitsCareer(homeRoadCareer);
          }
        } catch (err) {
          // Silently fail for splits
        } finally {
          if (isStillCurrentPlayer()) {
            setCareerSplitsLoading(false);
          }
        }
      }
      
      // For TWP, also fetch pitching career splits
      if (isTwoWay && isStillCurrentPlayer()) {
        try {
          const [pitchingVsHandCareer, pitchingHomeRoadCareer] = await Promise.all([
            playerStatsService.getPitcherVsHandSplitsCareerTotals(internalPlayerId).catch(() => null),
            playerStatsService.getPitcherHomeRoadSplitsCareerTotals(internalPlayerId).catch(() => null),
          ]);
          if (isStillCurrentPlayer()) {
            setPitchingVsHandSplitsCareer(pitchingVsHandCareer);
            setPitchingHomeRoadSplitsCareer(pitchingHomeRoadCareer);
          }
        } catch (err) {
          // Silently fail for pitching splits
        }
      }
    } finally {
      // Always clear the fetching flag
      isFetchingCareerRef.current = false;
    }
  }, [playerInfo?.id, isPitcher, isTwoWay, careerTotals]); // Added careerTotals to check cache

  // Get available seasons from career stats (only seasons the player has data for)
  const availableSeasons = useMemo(() => {
    // Helper to get the appropriate default season (previous year if before April 1st)
    const getDefaultSeason = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const aprilFirst = new Date(currentYear, 3, 1);
      return now < aprilFirst ? String(currentYear - 1) : String(currentYear);
    };
    
    if (!careerStats || careerStats.length === 0) {
      // If no career stats loaded yet, show appropriate season as fallback
      return [getDefaultSeason()];
    }
    
    // Extract unique seasons from career stats, filter for regular season only
    const seasons = careerStats
      .filter(s => s.season_type === 2 || s.season_type === '2' || s.season_type === 'R')
      .map(s => String(s.season || s.year))
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .sort((a, b) => parseInt(b) - parseInt(a)); // descending (most recent first)
    
    return seasons.length > 0 ? seasons : [getDefaultSeason()];
  }, [careerStats]);

  // Auto-select the most recent available season when career stats load
  // Note: Only depends on availableSeasons - we use functional update to avoid loops
  useEffect(() => {
    if (availableSeasons.length > 0) {
      setSelectedSeason(prev => {
        // Only update if current selection is not in available seasons
        if (!availableSeasons.includes(prev)) {
          return availableSeasons[0];
        }
        return prev;
      });
    }
  }, [availableSeasons]);

  // Calculate player age
  const playerAge = useMemo(() => {
    if (!playerInfo?.birth_date) return null;
    const birth = new Date(playerInfo.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, [playerInfo]);

  // Format date helper
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Get team logo URL
  const getTeamLogoUrl = useCallback((teamId) => {
    return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
  }, []);

  // Get player headshot URL
  const getPlayerHeadshotUrl = useCallback((mlbId) => {
    return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_100/v1/people/${mlbId}/headshot/67/current`;
  }, []);

  // Chart metric options and labels - different for batters vs pitchers
  const batterChartMetricOptions = {
    hr: { label: 'Home Runs', short: 'HR' },
    h: { label: 'Hits', short: 'H' },
    rbi: { label: 'RBIs', short: 'RBI' },
    r: { label: 'Runs', short: 'R' },
    avg: { label: 'Batting Average', short: 'AVG' },
    ops: { label: 'OPS', short: 'OPS' },
    bb: { label: 'Walks', short: 'BB' },
    so: { label: 'Strikeouts', short: 'SO' }
  };

  const pitcherChartMetricOptions = {
    era: { label: 'ERA', short: 'ERA' },
    whip: { label: 'WHIP', short: 'WHIP' },
    so: { label: 'Strikeouts', short: 'K' },
    wins: { label: 'Wins', short: 'W' },
    ip: { label: 'Innings Pitched', short: 'IP' },
    k_per_9: { label: 'K/9', short: 'K/9' },
    bb_per_9: { label: 'BB/9', short: 'BB/9' },
    quality_starts: { label: 'Quality Starts', short: 'QS' }
  };

  // Use appropriate chart options based on player type
  const chartMetricOptions = useMemo(() => {
    // For TWP: use twoWayViewMode. For pitchers: pitching. For batters: batting
    if (isTwoWay) {
      return twoWayViewMode === 'pitching' ? pitcherChartMetricOptions : batterChartMetricOptions;
    }
    return isPitcher ? pitcherChartMetricOptions : batterChartMetricOptions;
  }, [isPitcher, isTwoWay, twoWayViewMode]);

  // Get current metric safely - fallback to first available if selected doesn't exist
  const currentChartMetric = useMemo(() => {
    if (chartMetricOptions[selectedChartMetric]) {
      return { key: selectedChartMetric, ...chartMetricOptions[selectedChartMetric] };
    }
    // Fallback to first available metric
    const firstKey = Object.keys(chartMetricOptions)[0];
    return { key: firstKey, ...chartMetricOptions[firstKey] };
  }, [chartMetricOptions, selectedChartMetric]);

  // Set default chart metric based on player type
  useEffect(() => {
    // For TWP: use twoWayViewMode. For pitchers: pitching. For batters: batting
    const showPitching = isTwoWay ? twoWayViewMode === 'pitching' : isPitcher;
    if (showPitching) {
      setSelectedChartMetric('era');
    } else {
      setSelectedChartMetric('hr');
    }
  }, [isPitcher, isTwoWay, twoWayViewMode]);

  // Transform monthly performance API data into chart format
  // For TWP: uses activeMonthlyPerformance which switches based on batting/pitching toggle
  const getMonthlyChartData = useMemo(() => {
    if (!activeMonthlyPerformance) return {};
    
    // API returns data under 'monthly_stats' or 'batting' object with full month names
    const statsData = activeMonthlyPerformance.monthly_stats || activeMonthlyPerformance.batting || activeMonthlyPerformance.pitching || activeMonthlyPerformance;
    
    if (!statsData || typeof statsData !== 'object') return {};
    
    // Month mapping: display label -> API key (full month name)
    const monthMapping = [
      { display: 'Mar', apiKey: 'March' },
      { display: 'Apr', apiKey: 'April' },
      { display: 'May', apiKey: 'May' },
      { display: 'Jun', apiKey: 'June' },
      { display: 'Jul', apiKey: 'July' },
      { display: 'Aug', apiKey: 'August' },
      { display: 'Sep', apiKey: 'September' },
      { display: 'Oct', apiKey: 'October' }
    ];
    
    const result = {};
    
    // Map chart metrics to API response field names - include both batter and pitcher fields
    const fieldMappings = {
      // Batter fields
      hr: 'home_runs',
      h: 'hits',
      rbi: 'rbis',
      r: 'runs',
      avg: 'avg',
      ops: 'ops',
      bb: 'walks',
      so: 'strikeouts',
      // Pitcher fields
      era: 'era',
      whip: 'whip',
      wins: 'wins',
      ip: 'innings_pitched',
      k_per_9: 'k_per_9',
      bb_per_9: 'bb_per_9',
      quality_starts: 'quality_starts'
    };
    
    Object.entries(fieldMappings).forEach(([metric, apiField]) => {
      result[metric] = monthMapping
        .map(({ display, apiKey }) => {
          const monthData = statsData[apiKey] || {};
          return {
            period: display,
            value: monthData[apiField] || 0
          };
        })
        .filter(item => {
          // Include months that have data (any games played)
          const monthKey = monthMapping.find(m => m.display === item.period)?.apiKey;
          const monthData = statsData[monthKey] || {};
          return monthData.games > 0;
        });
    });
    
    return result;
  }, [activeMonthlyPerformance]);

  // Transform career stats API data into yearly chart format (regular season only - season_type: 2)
  // For TWP: uses activeCareerStats which switches between batting and pitching career stats
  const getYearlyChartData = useMemo(() => {
    if (!activeCareerStats || activeCareerStats.length === 0) return {};
    
    // Filter to only include regular season stats (season_type: 2 or "2")
    const regularSeasonStats = activeCareerStats.filter(season => 
      season.season_type === 2 || season.season_type === '2' || season.season_type === 'R'
    );
    
    if (regularSeasonStats.length === 0) return {};
    
    const result = {};
    
    // Batter metrics
    const batterMetrics = ['hr', 'h', 'rbi', 'r', 'avg', 'ops', 'bb', 'so'];
    const batterFieldMappings = {
      hr: ['hr', 'home_runs', 'HR'],
      h: ['h', 'hits', 'H'],
      rbi: ['rbi', 'rbis', 'RBI'],
      r: ['r', 'runs', 'R'],
      avg: ['avg', 'batting_avg', 'AVG', 'batting_average'],
      ops: ['ops', 'OPS'],
      bb: ['bb', 'walks', 'BB', 'base_on_balls'],
      so: ['so', 'strikeouts', 'SO', 'strike_outs']
    };

    // Pitcher metrics
    const pitcherMetrics = ['era', 'whip', 'so', 'wins', 'ip', 'k_per_9', 'bb_per_9', 'quality_starts'];
    const pitcherFieldMappings = {
      era: ['era', 'ERA'],
      whip: ['whip', 'WHIP'],
      so: ['so', 'strikeouts', 'SO', 'strike_outs'],
      wins: ['wins', 'w', 'W'],
      ip: ['ip', 'innings_pitched', 'IP'],
      k_per_9: ['k_per_9', 'k9', 'strikeouts_per_9'],
      bb_per_9: ['bb_per_9', 'bb9', 'walks_per_9'],
      quality_starts: ['quality_starts', 'qs', 'QS']
    };

    // Determine which metrics to use based on player type
    const metrics = showPitchingStats ? pitcherMetrics : batterMetrics;
    const fieldMappings = showPitchingStats ? pitcherFieldMappings : batterFieldMappings;
    
    metrics.forEach(metric => {
      result[metric] = regularSeasonStats
        .map(season => {
          // Find the value from any of the possible field names
          let value = 0;
          for (const field of fieldMappings[metric]) {
            if (season[field] !== undefined) {
              value = season[field];
              break;
            }
          }
          return {
            period: String(season.season || season.year),
            value: value || 0
          };
        })
        .sort((a, b) => parseInt(a.period) - parseInt(b.period)); // Sort by year
    });
    
    return result;
  }, [activeCareerStats, showPitchingStats]);

  // Calculate recent form stats from game log (L5, L10, L30 rolling averages for pitchers OR L7, L15, L30 for batters)
  // For postseason/spring training, still compare against regular season baseline
  // Uses its own recentFormGameLog (independent from Game Log section)
  // For TWP: uses pitchingRecentFormGameLog when in pitching mode
  const recentFormStats = useMemo(() => {
    // Check if this is a true TWP (position explicitly set to TWP, not just is_two_way flag)
    const pos = playerInfo?.position_abbreviation || playerInfo?.position || playerInfo?.primary_position;
    const isTruelyTwoWay = pos === 'TWP' || pos === 'Two-Way Player';
    
    // Determine which game log to use based on toggle mode
    // Only use separate pitching game log for true TWP players
    const activeGameLog = showPitchingStats && isTruelyTwoWay ? pitchingRecentFormGameLog : recentFormGameLog;
    
    if (!activeGameLog || activeGameLog.length === 0) {
      return null;
    }
    
    // Sort games by date (most recent first)
    const sortedGames = [...activeGameLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // ========== PITCHER STATS CALCULATION ==========
    if (showPitchingStats) {
      const calculatePitcherRollingStats = (games) => {
        if (games.length === 0) return null;
        
        const totals = games.reduce((acc, g) => ({
          inningsPitched: acc.inningsPitched + (g.innings_pitched || 0),
          strikeouts: acc.strikeouts + (g.strikeouts || 0),
          walks: acc.walks + (g.walks || 0),
          earnedRuns: acc.earnedRuns + (g.earned_runs || 0),
          hitsAllowed: acc.hitsAllowed + (g.hits_allowed || 0),
          homeRunsAllowed: acc.homeRunsAllowed + (g.home_runs_allowed || 0),
          wins: acc.wins + (g.win ? 1 : 0),
          losses: acc.losses + (g.loss ? 1 : 0),
          qualityStarts: acc.qualityStarts + (g.quality_start ? 1 : 0),
          games: acc.games + 1,
        }), { inningsPitched: 0, strikeouts: 0, walks: 0, earnedRuns: 0, hitsAllowed: 0, homeRunsAllowed: 0, wins: 0, losses: 0, qualityStarts: 0, games: 0 });
        
        const era = totals.inningsPitched > 0 ? (totals.earnedRuns / totals.inningsPitched) * 9 : 0;
        const whip = totals.inningsPitched > 0 ? (totals.walks + totals.hitsAllowed) / totals.inningsPitched : 0;
        const kPer9 = totals.inningsPitched > 0 ? (totals.strikeouts / totals.inningsPitched) * 9 : 0;
        const bbPer9 = totals.inningsPitched > 0 ? (totals.walks / totals.inningsPitched) * 9 : 0;
        
        return {
          ...totals,
          era,
          whip,
          kPer9,
          bbPer9,
          kPerGame: totals.strikeouts / totals.games,
          ipPerGame: totals.inningsPitched / totals.games,
        };
      };
      
      // Calculate quality start streak
      let qualityStartStreak = 0;
      for (const game of sortedGames) {
        if (game.quality_start || (game.innings_pitched >= 6 && game.earned_runs <= 3)) {
          qualityStartStreak++;
        } else {
          break;
        }
      }
      
      // Count quality starts in last 10
      const last10 = sortedGames.slice(0, 10);
      const qualityStartsL10 = last10.filter(g => g.quality_start || (g.innings_pitched >= 6 && g.earned_runs <= 3)).length;
      
      // Calculate L5, L10, L30 for pitchers
      const l5 = calculatePitcherRollingStats(sortedGames.slice(0, 5));
      const l10 = calculatePitcherRollingStats(sortedGames.slice(0, 10));
      const l30 = calculatePitcherRollingStats(sortedGames.slice(0, 30));
      
      // Season baseline for pitchers
      let season = null;
      if (recentFormSeasonType === 'R') {
        season = calculatePitcherRollingStats(sortedGames);
      } else if (activeSeasonStats) {
        const gs = activeSeasonStats.games_started || activeSeasonStats.gs || 0;
        const ip = activeSeasonStats.innings_pitched || activeSeasonStats.ip || 0;
        const era = activeSeasonStats.era || 0;
        const whip = activeSeasonStats.whip || 0;
        const strikeouts = activeSeasonStats.strikeouts || activeSeasonStats.so || 0;
        const walks = activeSeasonStats.walks || activeSeasonStats.bb || 0;
        
        season = {
          games: gs,
          inningsPitched: ip,
          strikeouts,
          walks,
          earnedRuns: activeSeasonStats.earned_runs_allowed || 0,
          hitsAllowed: activeSeasonStats.hits_allowed || 0,
          homeRunsAllowed: activeSeasonStats.home_runs_allowed || 0,
          wins: activeSeasonStats.wins || 0,
          losses: activeSeasonStats.losses || 0,
          era,
          whip,
          kPer9: activeSeasonStats.k_per_9 || 0,
          bbPer9: activeSeasonStats.bb_per_9 || 0,
          kPerGame: gs > 0 ? strikeouts / gs : 0,
          ipPerGame: gs > 0 ? ip / gs : 0,
          isRegularSeasonBaseline: true,
        };
      }
      
      // Determine hot/cold status for pitchers (ERA-based)
      let formStatus = 'neutral';
      if (l5 && season && season.era > 0) {
        // For ERA, lower is better, so we invert the comparison
        const eraDiff = ((season.era - l5.era) / season.era) * 100;
        if (eraDiff >= 20) formStatus = 'hot'; // ERA much lower than season avg
        else if (eraDiff <= -20) formStatus = 'cold'; // ERA much higher than season avg
        else if (eraDiff >= 10) formStatus = 'warming';
        else if (eraDiff <= -10) formStatus = 'cooling';
      }
      
      const pitcherResult = {
        l5,
        l10,
        l30,
        season,
        qualityStartStreak,
        qualityStartsL10,
        formStatus,
        gamesPlayed: sortedGames.length,
        lastGameDate: sortedGames[0]?.date,
        isPostseasonView: recentFormSeasonType !== 'R',
        isPitcher: true,
      };
      return pitcherResult;
    }
    
    // ========== BATTER STATS CALCULATION ==========
    // Calculate rolling averages for different windows
    const calculateRollingStats = (games) => {
      if (games.length === 0) return null;
      
      const totals = games.reduce((acc, g) => ({
        hits: acc.hits + (g.hits || 0),
        atBats: acc.atBats + (g.at_bats || 0),
        homeRuns: acc.homeRuns + (g.home_runs || 0),
        rbis: acc.rbis + (g.rbis || 0),
        runs: acc.runs + (g.runs || 0),
        walks: acc.walks + (g.walks || 0),
        strikeouts: acc.strikeouts + (g.strikeouts || 0),
        stolenBases: acc.stolenBases + (g.stolen_bases || 0),
        totalBases: acc.totalBases + (g.total_bases || 0),
        games: acc.games + 1,
      }), { hits: 0, atBats: 0, homeRuns: 0, rbis: 0, runs: 0, walks: 0, strikeouts: 0, stolenBases: 0, totalBases: 0, games: 0 });
      
      const avg = totals.atBats > 0 ? totals.hits / totals.atBats : 0;
      const obp = (totals.atBats + totals.walks) > 0 
        ? (totals.hits + totals.walks) / (totals.atBats + totals.walks) : 0;
      const slg = totals.atBats > 0 ? totals.totalBases / totals.atBats : 0;
      const ops = obp + slg;
      
      return {
        ...totals,
        avg,
        obp,
        slg,
        ops,
        hitsPerGame: totals.hits / totals.games,
        hrPerGame: totals.homeRuns / totals.games,
        rbisPerGame: totals.rbis / totals.games,
      };
    };
    
    // Calculate hitting streak
    let hittingStreak = 0;
    for (const game of sortedGames) {
      if (game.hits > 0) {
        hittingStreak++;
      } else {
        break;
      }
    }
    
    // Calculate multi-hit game streak
    let multiHitStreak = 0;
    for (const game of sortedGames) {
      if (game.hits >= 2) {
        multiHitStreak++;
      } else {
        break;
      }
    }
    
    // Count multi-hit games in last 15
    const last15 = sortedGames.slice(0, 15);
    const multiHitGamesL15 = last15.filter(g => g.hits >= 2).length;
    
    // Calculate L7, L15, L30 from current game log (could be postseason/spring)
    const l7 = calculateRollingStats(sortedGames.slice(0, 7));
    const l15 = calculateRollingStats(sortedGames.slice(0, 15));
    const l30 = calculateRollingStats(sortedGames.slice(0, 30));
    
    // For "season" baseline, always use regular season stats for better comparison
    // This allows comparing postseason performance to regular season baseline
    let season = null;
    if (recentFormSeasonType === 'R') {
      // Regular season - calculate from game log
      season = calculateRollingStats(sortedGames);
    } else if (activeSeasonStats) {
      // Postseason/Spring Training - use regular season stats as baseline
      const g = activeSeasonStats.g || activeSeasonStats.games_played || 0;
      const atBats = activeSeasonStats.ab || activeSeasonStats.at_bats || 0;
      const hits = activeSeasonStats.h || activeSeasonStats.hits || 0;
      const homeRuns = activeSeasonStats.hr || activeSeasonStats.home_runs || 0;
      const rbis = activeSeasonStats.rbis || activeSeasonStats.rbi || 0;
      const walks = activeSeasonStats.bb || activeSeasonStats.walks || activeSeasonStats.base_on_balls || 0;
      const strikeouts = activeSeasonStats.so || activeSeasonStats.strikeouts || activeSeasonStats.strike_outs || 0;
      const avg = activeSeasonStats.avg || activeSeasonStats.batting_avg || 0;
      const ops = activeSeasonStats.ops || 0;
      
      season = {
        games: g,
        atBats,
        hits,
        homeRuns,
        rbis,
        runs: activeSeasonStats.r || activeSeasonStats.runs || 0,
        walks,
        strikeouts,
        stolenBases: activeSeasonStats.sb || activeSeasonStats.stolen_bases || 0,
        totalBases: activeSeasonStats.tb || activeSeasonStats.total_bases || 0,
        avg,
        ops,
        obp: activeSeasonStats.obp || 0,
        slg: activeSeasonStats.slg || 0,
        hitsPerGame: g > 0 ? hits / g : 0,
        hrPerGame: g > 0 ? homeRuns / g : 0,
        rbisPerGame: g > 0 ? rbis / g : 0,
        isRegularSeasonBaseline: true, // Flag to show this is regular season baseline
      };
    }
    
    // Determine hot/cold status by comparing L7 to season baseline
    let formStatus = 'neutral';
    if (l7 && season && season.avg > 0) {
      const avgDiff = ((l7.avg - season.avg) / season.avg) * 100;
      if (avgDiff >= 15) formStatus = 'hot';
      else if (avgDiff <= -15) formStatus = 'cold';
      else if (avgDiff >= 5) formStatus = 'warming';
      else if (avgDiff <= -5) formStatus = 'cooling';
    }
    
    return {
      l7,
      l15,
      l30,
      season,
      hittingStreak,
      multiHitStreak,
      multiHitGamesL15,
      formStatus,
      gamesPlayed: sortedGames.length,
      lastGameDate: sortedGames[0]?.date,
      isPostseasonView: recentFormSeasonType !== 'R',
      isPitcher: false,
    };
  }, [recentFormGameLog, pitchingRecentFormGameLog, recentFormSeasonType, activeSeasonStats, showPitchingStats, playerInfo]);

  // Get the current chart data based on view mode
  const getChartData = () => {
    const metricKey = currentChartMetric.key;
    if (activeStatsTab === 'career') {
      return getYearlyChartData[metricKey] || [];
    }
    return getMonthlyChartData[metricKey] || [];
  };

  // Get max value for scaling bars
  const getMaxValue = (data) => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.value));
  };

  // Format value for display
  const formatChartValue = (value) => {
    const metricKey = currentChartMetric.key;
    if (metricKey === 'avg' || metricKey === 'ops') {
      return value.toFixed(3).replace(/^0/, '');
    }
    if (metricKey === 'era' || metricKey === 'whip' || metricKey === 'k_per_9' || metricKey === 'bb_per_9') {
      return value.toFixed(2);
    }
    if (metricKey === 'ip') {
      return value.toFixed(1);
    }
    return Math.round(value);
  };

  if (playerLoading) {
    return (
      <div className="pps-page">
        <div className="pps-loading-container">
          <div className="pps-loading-spinner"></div>
          <span>Loading player profile...</span>
        </div>
      </div>
    );
  }

  if (!playerInfo) {
    return (
      <div className="pps-page">
        <div className="pps-error-container">
          <span className="pps-error-icon">⚠️</span>
          <h2>Player Not Found</h2>
          <p>We couldn't find the player you're looking for.</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - COMPONENT-BASED ARCHITECTURE
  // ============================================================================
  // This return statement uses extracted sub-components for better:
  // - Code organization and maintainability
  // - Performance (React.memo on each component)
  // - Testability (each component can be tested in isolation)
  // - Reusability (components can be used elsewhere if needed)
  // ============================================================================
  
  return (
    <div className="pps-page">
      {/* ========== PLAYER HEADER SECTION ========== */}
      {/* Displays player photo, name, team, position, bio info, TWP toggle */}
      <PlayerProfileHeader
        playerInfo={playerInfo}
        playerAge={playerAge}
        isTwoWay={isTwoWay}
        twoWayViewMode={twoWayViewMode}
        setTwoWayViewMode={setTwoWayViewMode}
        formatDate={formatDate}
      />

      {/* ========== MAIN CONTENT ========== */}
      <main className="pps-content">
        <div className="pps-container">
          
          {/* ========== RECENT FORM SECTION ========== */}
          {/* Displays rolling averages, trends, and form status */}
          <RecentFormSection
            selectedSeason={selectedSeason}
            recentFormSeasonType={recentFormSeasonType}
            setRecentFormSeasonType={setRecentFormSeasonType}
            recentFormStats={recentFormStats}
            recentFormLoading={recentFormLoading}
            showPitchingStats={showPitchingStats}
          />

          {/* ========== SEASON STATS SECTION ========== */}
          {/* Displays season/career statistics with chart */}
          <SeasonStatsSection
            selectedSeason={selectedSeason}
            activeStatsTab={activeStatsTab}
            setActiveStatsTab={setActiveStatsTab}
            seasonDropdownOpen={seasonDropdownOpen}
            setSeasonDropdownOpen={setSeasonDropdownOpen}
            seasonDropdownRef={seasonDropdownRef}
            availableSeasons={availableSeasons}
            handleSeasonChange={handleSeasonChange}
            handleCareerTabClick={handleCareerTabClick}
            statsLoading={statsLoading}
            careerTotalsLoading={careerTotalsLoading}
            activeSeasonStats={activeSeasonStats}
            activeCareerTotals={activeCareerTotals}
            showPitchingStats={showPitchingStats}
            currentChartMetric={currentChartMetric}
            setSelectedChartMetric={setSelectedChartMetric}
            chartMetricOptions={chartMetricOptions}
            getChartData={getChartData}
            getMaxValue={getMaxValue}
            formatChartValue={formatChartValue}
          />

          {/* ========== SPLITS SECTION ========== */}
          {/* Displays vs L/R and Home/Away performance splits */}
          <SplitsSection
            selectedSeason={selectedSeason}
            activeStatsTab={activeStatsTab}
            activeSplitsTab={activeSplitsTab}
            setActiveSplitsTab={setActiveSplitsTab}
            statsLoading={statsLoading}
            careerSplitsLoading={careerSplitsLoading}
            showPitchingStats={showPitchingStats}
            activeVsHandSplits={activeVsHandSplits}
            activeVsHandSplitsCareer={activeVsHandSplitsCareer}
            activeHomeRoadSplits={activeHomeRoadSplits}
            activeHomeRoadSplitsCareer={activeHomeRoadSplitsCareer}
          />

          {/* ========== PLAYER HISTORY SECTION ========== */}
          {/* Displays team history timeline and injury history */}
          <PlayerHistorySection
            teamHistory={teamHistory}
            injuryHistory={injuryHistory}
            playerInfo={playerInfo}
            getTeamLogoUrl={getTeamLogoUrl}
          />

          {/* ========== GAME LOG SECTION ========== */}
          {/* Displays paginated game-by-game performance */}
          <GameLogSection
            gameLog={gameLog}
            gameLogLoading={gameLogLoading}
            selectedSeason={selectedSeason}
            gameLogSeasonType={gameLogSeasonType}
            setGameLogSeasonType={setGameLogSeasonType}
            showPitchingStats={showPitchingStats}
            gamesPerPage={gamesPerPage}
          />

        </div>
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENT ARCHITECTURE SUMMARY
// ============================================================================
// This file (playerProfileStats.jsx) orchestrates 6 sub-components:
//
// 1. PlayerProfileHeader - Player photo, name, team, position, TWP toggle
//    └── Props: playerInfo, playerAge, isTwoWay, twoWayViewMode, etc.
//
// 2. RecentFormSection - Rolling averages (L7/L15/L30), form badge, streaks
//    └── Props: recentFormStats, recentFormSeasonType, showPitchingStats
//
// 3. SeasonStatsSection - Stats cards, season/career toggle, chart
//    └── Props: seasonStats, careerTotals, chartMetricOptions, etc.
//
// 4. SplitsSection - vs L/R handedness and Home/Away splits
//    └── Props: activeVsHandSplits, activeHomeRoadSplits, etc.
//
// 5. PlayerHistorySection - Team timeline, injury history
//    └── Props: teamHistory, injuryHistory, playerInfo
//
// 6. GameLogSection - Paginated game-by-game log
//    └── Props: gameLog, showPitchingStats, gameLogSeasonType
//
// All components are wrapped in React.memo for performance optimization.
// State management remains in this parent component for data coordination.
// ============================================================================

export default PlayerProfileStats;
