// ============================================================================
// USE PLAYER PROFILE HOOK
// ============================================================================
// Custom hook that manages player data fetching and state.
// Handles player info, season/career stats, splits, and history.
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import playerStatsService from '../../../../../../data/services/playerStatsServices';
import injuryService from '../../../../../../data/services/injuryService';
import rosterService from '../../../../../../data/services/rosterService';
import { MIN_LOADING_DURATION } from '../utils/playerProfileUtils';

// ============================================================================
// HELPER: Sort career stats by season (ascending order)
// ============================================================================
const limitCareerStats = (stats) => {
  if (!Array.isArray(stats) || stats.length === 0) return [];
  // Sort by season ascending (oldest to newest)
  return stats
    .slice()
    .sort((a, b) => (parseInt(a.season || a.year) || 0) - (parseInt(b.season || b.year) || 0));
};

/**
 * Custom hook for managing player profile data
 * @param {number} mlbIdFromSlug - MLB ID extracted from URL slug
 * @param {string} selectedSeason - Currently selected season
 * @param {boolean} isPitcher - Whether player is a pitcher
 * @param {boolean} isTwoWay - Whether player is a two-way player
 * @returns {object} - Player data and loading states
 */
export const usePlayerProfile = (mlbIdFromSlug, selectedSeason, isPitcher, isTwoWay) => {
  // ============================================================================
  // REFS FOR FETCH CONTROL
  // ============================================================================
  const careerFetchAbortRef = useRef(null);
  const currentPlayerIdRef = useRef(null);
  const isFetchingCareerRef = useRef(false);
  const hasCareerDataRef = useRef(false); // Track if career data was fetched
  const statsFetchIdRef = useRef(0);
  const isMountedRef = useRef(true);

  // ============================================================================
  // STATE
  // ============================================================================
  // Loading states
  const [playerLoading, setPlayerLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [careerTotalsLoading, setCareerTotalsLoading] = useState(false);
  const [careerSplitsLoading, setCareerSplitsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Player data
  const [playerInfo, setPlayerInfo] = useState(null);
  const [seasonStats, setSeasonStats] = useState(null);
  const [careerStats, setCareerStats] = useState([]);
  const [careerTotals, setCareerTotals] = useState(null);
  const [vsHandSplits, setVsHandSplits] = useState([]);
  const [homeRoadSplits, setHomeRoadSplits] = useState([]);
  const [vsHandSplitsCareer, setVsHandSplitsCareer] = useState(null);
  const [homeRoadSplitsCareer, setHomeRoadSplitsCareer] = useState(null);
  const [monthlyPerformance, setMonthlyPerformance] = useState(null);
  
  // Two-way player pitching stats
  const [pitchingSeasonStats, setPitchingSeasonStats] = useState(null);
  const [pitchingCareerStats, setPitchingCareerStats] = useState([]);
  const [pitchingVsHandSplits, setPitchingVsHandSplits] = useState([]);
  const [pitchingHomeRoadSplits, setPitchingHomeRoadSplits] = useState([]);
  const [pitchingMonthlyPerformance, setPitchingMonthlyPerformance] = useState(null);
  const [pitchingCareerTotals, setPitchingCareerTotals] = useState(null);
  const [pitchingVsHandSplitsCareer, setPitchingVsHandSplitsCareer] = useState(null);
  const [pitchingHomeRoadSplitsCareer, setPitchingHomeRoadSplitsCareer] = useState(null);
  
  // History data
  const [teamHistory, setTeamHistory] = useState([]);
  const [injuryHistory, setInjuryHistory] = useState([]);

  // ============================================================================
  // MOUNT TRACKING
  // ============================================================================
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============================================================================
  // FETCH PLAYER INFO
  // ============================================================================
  useEffect(() => {
    // Reset all state immediately when MLB ID changes
    setPlayerInfo(null);
    setSeasonStats(null);
    setCareerStats([]);
    setCareerTotals(null);
    setVsHandSplits([]);
    setHomeRoadSplits([]);
    setVsHandSplitsCareer(null);
    setHomeRoadSplitsCareer(null);
    setMonthlyPerformance(null);
    setPitchingSeasonStats(null);
    setPitchingCareerStats([]);
    setPitchingVsHandSplits([]);
    setPitchingHomeRoadSplits([]);
    setPitchingMonthlyPerformance(null);
    setPitchingCareerTotals(null);
    setPitchingVsHandSplitsCareer(null);
    setPitchingHomeRoadSplitsCareer(null);
    setTeamHistory([]);
    setInjuryHistory([]);
    
    // Reset refs
    hasCareerDataRef.current = false;
    isFetchingCareerRef.current = false;
    statsFetchIdRef.current++;
    currentPlayerIdRef.current = null;
    
    const fetchPlayerInfo = async () => {
      if (!mlbIdFromSlug) {
        console.warn('No MLB ID provided');
        setError('Invalid player URL');
        setPlayerLoading(false);
        return;
      }
      
      setPlayerLoading(true);
      setError(null);
      
      try {
        const data = await playerStatsService.getPlayerInfoByMlbId(mlbIdFromSlug);
        const playerData = data?.player || data;
        
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

  // ============================================================================
  // RESET STATE ON PLAYER CHANGE
  // ============================================================================
  useEffect(() => {
    if (playerInfo?.id) {
      if (careerFetchAbortRef.current) {
        careerFetchAbortRef.current.abort();
        careerFetchAbortRef.current = null;
      }
      
      isFetchingCareerRef.current = false;
      hasCareerDataRef.current = false; // Reset career data flag for new player
      statsFetchIdRef.current++;
      currentPlayerIdRef.current = playerInfo.id;
      
      // Reset career data for new player
      setCareerTotals(null);
      setPitchingCareerTotals(null);
      setVsHandSplitsCareer(null);
      setHomeRoadSplitsCareer(null);
      setPitchingVsHandSplitsCareer(null);
      setPitchingHomeRoadSplitsCareer(null);
      setCareerTotalsLoading(false);
      setCareerSplitsLoading(false);
    }
  }, [playerInfo?.id]);

  // ============================================================================
  // FETCH INJURY HISTORY
  // ============================================================================
  useEffect(() => {
    if (!playerInfo?.id) return;
    
    let isCancelled = false;
    const playerId = playerInfo.id;
    
    const fetchInjuryHistory = async () => {
      try {
        const response = await injuryService.getPlayerInjuryHistory(playerId);
        if (isCancelled || currentPlayerIdRef.current !== playerId) return;
        const injuries = response?.injuries || [];
        setInjuryHistory(Array.isArray(injuries) ? injuries : []);
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching injury history:', err);
          setInjuryHistory([]);
        }
      }
    };
    
    fetchInjuryHistory();
    
    return () => {
      isCancelled = true;
    };
  }, [playerInfo?.id]);

  // ============================================================================
  // FETCH TEAM HISTORY
  // ============================================================================
  useEffect(() => {
    if (!playerInfo?.id) return;
    
    let isCancelled = false;
    const playerId = playerInfo.id;
    
    const fetchTeamHistory = async () => {
      try {
        const response = await rosterService.getPlayerRosterHistory(playerId);
        if (isCancelled || currentPlayerIdRef.current !== playerId) return;
        const seasons = response?.seasons || [];
        setTeamHistory(Array.isArray(seasons) ? seasons : []);
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching team history:', err);
          setTeamHistory([]);
        }
      }
    };
    
    fetchTeamHistory();
    
    return () => {
      isCancelled = true;
    };
  }, [playerInfo?.id]);

  // ============================================================================
  // FETCH SEASON STATS
  // ============================================================================
  useEffect(() => {
    if (!playerInfo?.id) return;
    
    const fetchId = ++statsFetchIdRef.current;
    const internalPlayerId = playerInfo.id;
    
    const isStillValid = () => 
      isMountedRef.current && 
      statsFetchIdRef.current === fetchId && 
      currentPlayerIdRef.current === internalPlayerId;
    
    const fetchPlayerStats = async () => {
      const startTime = Date.now();
      setStatsLoading(true);
      
      try {
        const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
        const isPitcherType = pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
        const isTwoWayType = pos === 'TWP' || pos === 'Two-Way Player' || playerInfo.is_two_way;
        
        if (isPitcherType && !isTwoWayType) {
          // Pitcher only
          const [current, career, vsHand, homeRoad, monthly] = await Promise.all([
            playerStatsService.getPitcherCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getPitcherCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getPitcherVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
          ]);
          
          if (!isStillValid()) return;
          
          setSeasonStats(current);
          setCareerStats(limitCareerStats(career));
          setVsHandSplits(vsHand);
          setHomeRoadSplits(homeRoad);
          setMonthlyPerformance(monthly);
        } else if (isTwoWayType) {
          // Two-way player: fetch BOTH
          const results = await Promise.all([
            playerStatsService.getBatterCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getBatterCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getBatterVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getPitcherCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getPitcherCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getPitcherVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
          ]);
          
          if (!isStillValid()) return;
          
          setSeasonStats(results[0]);
          setCareerStats(limitCareerStats(results[1]));
          setVsHandSplits(results[2]);
          setHomeRoadSplits(results[3]);
          setMonthlyPerformance(results[4]);
          setPitchingSeasonStats(results[5]);
          setPitchingCareerStats(limitCareerStats(results[6]));
          setPitchingVsHandSplits(results[7]);
          setPitchingHomeRoadSplits(results[8]);
          setPitchingMonthlyPerformance(results[9]);
        } else {
          // Batter only
          const [current, career, vsHand, homeRoad, monthly] = await Promise.all([
            playerStatsService.getBatterCurrentStats(internalPlayerId, selectedSeason).catch(() => null),
            playerStatsService.getBatterCareerStats(internalPlayerId).catch(() => []),
            playerStatsService.getBatterVsHandSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterHomeRoadSplits(internalPlayerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterMonthlyPerformance(internalPlayerId, selectedSeason).catch(() => null),
          ]);
          
          if (!isStillValid()) return;
          
          setSeasonStats(current);
          setCareerStats(limitCareerStats(career));
          setVsHandSplits(vsHand);
          setHomeRoadSplits(homeRoad);
          setMonthlyPerformance(monthly);
        }
        
        // Ensure minimum loading time
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_DURATION) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_DURATION - elapsed));
        }
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
    
    return () => {
      statsFetchIdRef.current++;
    };
  }, [playerInfo?.id, selectedSeason]);

  // ============================================================================
  // FETCH CAREER DATA (ON DEMAND)
  // ============================================================================
  const fetchCareerData = useCallback(async () => {
    // Early returns - prevent duplicate fetches
    if (isFetchingCareerRef.current || !playerInfo?.id) return;
    if (hasCareerDataRef.current && currentPlayerIdRef.current === playerInfo.id) return;
    
    isFetchingCareerRef.current = true;
    const playerIdAtFetchStart = playerInfo.id;
    
    // Determine player type from playerInfo directly (not from hook params)
    const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
    const isPlayerPitcher = pos === 'P' || pos === 'SP' || pos === 'RP' || 
                            pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
    const isPlayerTwoWay = pos === 'TWP' || pos === 'Two-Way Player' || playerInfo.is_two_way;
    
    const isStillCurrentPlayer = () => 
      isMountedRef.current && currentPlayerIdRef.current === playerIdAtFetchStart;
    
    setCareerTotalsLoading(true);
    
    try {
      // Small initial delay to let the UI update before heavy fetching
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isStillCurrentPlayer()) return;
      
      // Fetch career totals with timeout to prevent hanging
      const fetchWithTimeout = async (promise, timeoutMs = 10000) => {
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        );
        return Promise.race([promise, timeout]);
      };
      
      // Fetch career totals
      let totals;
      if (isPlayerPitcher && !isPlayerTwoWay) {
        totals = await fetchWithTimeout(playerStatsService.getPitcherCareerTotals(playerInfo.id));
      } else {
        totals = await fetchWithTimeout(playerStatsService.getBatterCareerTotals(playerInfo.id));
      }
      
      if (!isStillCurrentPlayer()) return;
      
      // Batch these updates together
      setCareerTotals(totals);
      setCareerTotalsLoading(false);
      
      // For TWP, also fetch pitching career totals
      if (isPlayerTwoWay) {
        const pitchingTotals = await fetchWithTimeout(playerStatsService.getPitcherCareerTotals(playerInfo.id));
        if (!isStillCurrentPlayer()) return;
        setPitchingCareerTotals(pitchingTotals);
      }
      
      // Give React a chance to process updates before fetching more
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Fetch career splits
      if (!isStillCurrentPlayer()) return;
      
      setCareerSplitsLoading(true);
      
      let vsHandCareer, homeRoadCareer;
      if (isPlayerPitcher && !isPlayerTwoWay) {
        [vsHandCareer, homeRoadCareer] = await Promise.all([
          fetchWithTimeout(playerStatsService.getPitcherVsHandSplitsCareerTotals(playerInfo.id)).catch(() => null),
          fetchWithTimeout(playerStatsService.getPitcherHomeRoadSplitsCareerTotals(playerInfo.id)).catch(() => null),
        ]);
      } else {
        [vsHandCareer, homeRoadCareer] = await Promise.all([
          fetchWithTimeout(playerStatsService.getBatterVsHandSplitsCareerTotals(playerInfo.id)).catch(() => null),
          fetchWithTimeout(playerStatsService.getBatterHomeRoadSplitsCareerTotals(playerInfo.id)).catch(() => null),
        ]);
      }
      
      if (!isStillCurrentPlayer()) return;
      
      setVsHandSplitsCareer(vsHandCareer);
      setHomeRoadSplitsCareer(homeRoadCareer);
      setCareerSplitsLoading(false);
      
      // For TWP, fetch pitching career splits
      if (isPlayerTwoWay) {
        const [pitchingVsHandCareer, pitchingHomeRoadCareer] = await Promise.all([
          fetchWithTimeout(playerStatsService.getPitcherVsHandSplitsCareerTotals(playerInfo.id)).catch(() => null),
          fetchWithTimeout(playerStatsService.getPitcherHomeRoadSplitsCareerTotals(playerInfo.id)).catch(() => null),
        ]);
        
        if (!isStillCurrentPlayer()) return;
        
        setPitchingVsHandSplitsCareer(pitchingVsHandCareer);
        setPitchingHomeRoadSplitsCareer(pitchingHomeRoadCareer);
      }
      
      // Mark career data as fetched for this player
      hasCareerDataRef.current = true;
    } catch (err) {
      console.error('Error fetching career data:', err);
      if (isStillCurrentPlayer()) {
        setCareerTotalsLoading(false);
        setCareerSplitsLoading(false);
      }
    } finally {
      isFetchingCareerRef.current = false;
    }
  }, [playerInfo]);

  // ============================================================================
  // RETURN
  // ============================================================================
  return {
    // Loading states
    playerLoading,
    statsLoading,
    careerTotalsLoading,
    careerSplitsLoading,
    error,
    
    // Player data
    playerInfo,
    seasonStats,
    careerStats,
    careerTotals,
    vsHandSplits,
    homeRoadSplits,
    vsHandSplitsCareer,
    homeRoadSplitsCareer,
    monthlyPerformance,
    
    // Two-way player pitching data
    pitchingSeasonStats,
    pitchingCareerStats,
    pitchingVsHandSplits,
    pitchingHomeRoadSplits,
    pitchingMonthlyPerformance,
    pitchingCareerTotals,
    pitchingVsHandSplitsCareer,
    pitchingHomeRoadSplitsCareer,
    
    // History
    teamHistory,
    injuryHistory,
    
    // Actions
    fetchCareerData,
  };
};

export default usePlayerProfile;
