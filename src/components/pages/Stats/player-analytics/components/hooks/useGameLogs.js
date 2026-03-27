// ============================================================================
// USE GAME LOGS HOOK
// ============================================================================
// Custom hook that manages game log fetching for the player profile.
// Handles main game log and recent form game logs (with separate season types).
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import gamesService from '../../../../../../data/services/gamesService';
import { MIN_LOADING_DURATION, getPlayerPosition } from '../utils/playerProfileUtils';

/**
 * Check if position indicates a pitcher
 * @param {string} pos - Position abbreviation
 * @returns {boolean}
 */
const isPitcherPosition = (pos) => {
  return pos === 'P' || pos === 'SP' || pos === 'RP' || 
         pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
};

/**
 * Check if position indicates a two-way player
 * @param {string} pos - Position abbreviation
 * @returns {boolean}
 */
const isTwoWayPosition = (pos) => {
  return pos === 'TWP' || pos === 'Two-Way Player';
};

/**
 * Determine the appropriate Recent Form season type based on the calendar.
 * - Prior years (< current year): always Regular Season ('R')
 * - Current year: Spring ('S') before April 1, Regular ('R') April–Sep, Postseason ('P') October+
 * @param {string} season - Selected season year string
 * @returns {'R'|'S'|'P'}
 */
function getDefaultRecentFormSeasonType(season) {
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(season, 10);

  if (selectedYear < currentYear) return 'R';

  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const day = now.getDate();

  if (month === 2 && day >= 15) return 'S'; // Mid-Feb spring training
  if (month >= 10) return 'P';              // October+ postseason
  return 'R';
}

/**
 * Custom hook for managing game log data
 * @param {object} params - Hook parameters
 * @param {object} params.playerInfo - Player info object
 * @param {string} params.selectedSeason - Selected season year
 * @param {string} params.twoWayViewMode - 'batting' or 'pitching' for TWP
 * @returns {object} - Game log data and controls
 */
export const useGameLogs = ({ playerInfo, selectedSeason, twoWayViewMode }) => {
  // ============================================================================
  // REFS FOR FETCH CONTROL
  // ============================================================================
  const gameLogFetchIdRef = useRef(0);
  const recentFormFetchIdRef = useRef(0);
  const currentPlayerIdRef = useRef(null);
  const isMountedRef = useRef(true);

  // ============================================================================
  // STATE - GAME LOG SECTION
  // ============================================================================
  const [gameLog, setGameLog] = useState([]);
  const [gameLogLoading, setGameLogLoading] = useState(false);
  const [gameLogSeasonType, setGameLogSeasonType] = useState(
    () => getDefaultRecentFormSeasonType(selectedSeason)
  );
  const [gameLogPage, setGameLogPage] = useState(1);

  // ============================================================================
  // STATE - RECENT FORM SECTION (Independent)
  // ============================================================================
  const [recentFormGameLog, setRecentFormGameLog] = useState([]);
  const [pitchingRecentFormGameLog, setPitchingRecentFormGameLog] = useState([]);
  const [recentFormLoading, setRecentFormLoading] = useState(false);
  const [recentFormSeasonType, setRecentFormSeasonType] = useState(
    () => getDefaultRecentFormSeasonType(selectedSeason)
  );
  const [availableRecentFormSeasonTypes, setAvailableRecentFormSeasonTypes] = useState(['R']); // Track which season types have data

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
  // TRACK CURRENT PLAYER AND RESET STATE
  // ============================================================================
  useEffect(() => {
    if (playerInfo?.id) {
      // If player changed, reset all state
      if (currentPlayerIdRef.current !== playerInfo.id) {
        currentPlayerIdRef.current = playerInfo.id;
        
        // Increment fetch IDs to invalidate any in-flight requests
        gameLogFetchIdRef.current++;
        recentFormFetchIdRef.current++;
        
        // Reset all state for new player
        setGameLog([]);
        setGameLogPage(1);
        setRecentFormGameLog([]);
        setPitchingRecentFormGameLog([]);
        setAvailableRecentFormSeasonTypes(['R']);
      }
    }
  }, [playerInfo?.id]);

  // ============================================================================
  // RESET SEASON TYPES WHEN SELECTED SEASON CHANGES
  // Runs synchronously so the UI reflects the right default before async check
  // ============================================================================
  useEffect(() => {
    const defaultType = getDefaultRecentFormSeasonType(selectedSeason);
    setGameLogSeasonType(defaultType);
    setRecentFormSeasonType(defaultType);
  }, [selectedSeason]);

  // ============================================================================
  // FETCH GAME LOGS (MAIN)
  // ============================================================================
  useEffect(() => {
    if (!playerInfo?.id) return;
    
    const fetchId = ++gameLogFetchIdRef.current;
    const internalPlayerId = playerInfo.id;
    
    const isStillValid = () => 
      isMountedRef.current && 
      gameLogFetchIdRef.current === fetchId && 
      currentPlayerIdRef.current === internalPlayerId;
    
    const fetchGameLogs = async () => {
      const startTime = Date.now();
      setGameLogLoading(true);
      
      try {
        const pos = getPlayerPosition(playerInfo);
        const isPitcherType = isPitcherPosition(pos);
        const isTruelyTwoWay = isTwoWayPosition(pos);
        
        // For TWP: use twoWayViewMode. For pitchers: always pitcher logs.
        const shouldFetchPitcherLogs = isTruelyTwoWay 
          ? twoWayViewMode === 'pitching' 
          : isPitcherType;
        
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
        
        if (!isStillValid()) return;
        
        const games = response?.games || (Array.isArray(response) ? response : []);

        // Ensure minimum loading time
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_DURATION) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_DURATION - elapsed));
        }

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
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerInfo?.id, selectedSeason, gameLogSeasonType, twoWayViewMode]);

  // ============================================================================
  // FETCH RECENT FORM GAME LOGS (INDEPENDENT)
  // ============================================================================
  useEffect(() => {
    if (!playerInfo?.id) return;
    
    const fetchId = ++recentFormFetchIdRef.current;
    const internalPlayerId = playerInfo.id;
    
    const isStillValid = () => 
      isMountedRef.current && 
      recentFormFetchIdRef.current === fetchId && 
      currentPlayerIdRef.current === internalPlayerId;
    
    const fetchRecentFormGameLogs = async () => {
      const startTime = Date.now();
      setRecentFormLoading(true);
      
      try {
        const pos = getPlayerPosition(playerInfo);
        const isPitcherPos = isPitcherPosition(pos);
        const isTruelyTwoWay = isTwoWayPosition(pos);
        
        let battingGames = [];
        let pitchingGames = [];
        
        if (isTruelyTwoWay) {
          // For TWP, fetch BOTH batting and pitching
          const [battingResponse, pitchingResponse] = await Promise.all([
            gamesService.getBatterGameLogs(internalPlayerId, selectedSeason, recentFormSeasonType)
              .catch(() => ({ games: [] })),
            gamesService.getPitcherGameLogs(internalPlayerId, selectedSeason, recentFormSeasonType)
              .catch(() => ({ games: [] })),
          ]);
          
          if (!isStillValid()) return;
          
          battingGames = battingResponse?.games || (Array.isArray(battingResponse) ? battingResponse : []);
          pitchingGames = pitchingResponse?.games || (Array.isArray(pitchingResponse) ? pitchingResponse : []);
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
          
          const games = response?.games || (Array.isArray(response) ? response : []);
          battingGames = Array.isArray(games) ? games : [];
        }
        
        // Ensure minimum loading time
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_DURATION) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_DURATION - elapsed));
        }
        
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
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerInfo?.id, selectedSeason, recentFormSeasonType]);

  // ============================================================================
  // CHECK AVAILABLE SEASON TYPES FOR RECENT FORM
  // ============================================================================
  useEffect(() => {
    if (!playerInfo?.id) return;
    
    let isCancelled = false;
    const internalPlayerId = playerInfo.id;
    
    const checkAvailableSeasonTypes = async () => {
      const pos = getPlayerPosition(playerInfo);
      const isPitcherPos = isPitcherPosition(pos);
      const isTruelyTwoWay = isTwoWayPosition(pos);
      
      // Determine which service to use
      const fetchService = (isPitcherPos && !isTruelyTwoWay)
        ? gamesService.getPitcherGameLogs
        : gamesService.getBatterGameLogs;
      
      const seasonTypes = ['R', 'S', 'P']; // Regular, Spring, Postseason
      
      try {
        // Check each season type in parallel
        const checks = await Promise.all(
          seasonTypes.map(async (type) => {
            try {
              const response = await fetchService(internalPlayerId, selectedSeason, type);
              const games = response?.games || (Array.isArray(response) ? response : []);
              return { type, hasGames: Array.isArray(games) && games.length > 0 };
            } catch {
              return { type, hasGames: false };
            }
          })
        );
        
        // Check if this effect was cancelled while awaiting
        if (isCancelled || currentPlayerIdRef.current !== internalPlayerId) return;
        
        const available = checks
          .filter(({ hasGames }) => hasGames)
          .map(({ type }) => type);

        // Default to Regular if nothing available
        const result = available.length > 0 ? available : ['R'];
        setAvailableRecentFormSeasonTypes(result);

        // Choose the best season type based on calendar + available data
        const calendarType = getDefaultRecentFormSeasonType(selectedSeason);
        const currentYear  = new Date().getFullYear();
        const isCurrentYear = parseInt(selectedSeason, 10) === currentYear;

        if (isCurrentYear) {
          // Priority order based on where we are in the calendar
          const priority =
            calendarType === 'S' ? ['S', 'R', 'P'] :
            calendarType === 'P' ? ['P', 'R', 'S'] :
                                   ['R', 'S', 'P'];
          const best = priority.find(t => result.includes(t)) || result[0];
          setRecentFormSeasonType(best);
        } else {
          // Prior years: Regular Season is always the baseline; fall back if unavailable
          const best = result.includes('R') ? 'R' : result[0];
          setRecentFormSeasonType(best);
        }
      } catch (err) {
        // Silently handle errors - just use default
        if (!isCancelled) {
          setAvailableRecentFormSeasonTypes(['R']);
        }
      }
    };
    
    checkAvailableSeasonTypes();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerInfo?.id, selectedSeason]);

  // ============================================================================
  // RETURN
  // ============================================================================
  return {
    // Game Log Section
    gameLog,
    gameLogLoading,
    gameLogSeasonType,
    setGameLogSeasonType,
    gameLogPage,
    setGameLogPage,
    
    // Recent Form Section
    recentFormGameLog,
    pitchingRecentFormGameLog,
    recentFormLoading,
    recentFormSeasonType,
    setRecentFormSeasonType,
    availableRecentFormSeasonTypes,
  };
};

export default useGameLogs;
