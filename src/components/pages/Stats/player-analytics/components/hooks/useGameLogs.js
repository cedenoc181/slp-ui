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
  const [gameLogSeasonType, setGameLogSeasonType] = useState('R'); // R, S, P
  const [gameLogPage, setGameLogPage] = useState(1);

  // ============================================================================
  // STATE - RECENT FORM SECTION (Independent)
  // ============================================================================
  const [recentFormGameLog, setRecentFormGameLog] = useState([]);
  const [pitchingRecentFormGameLog, setPitchingRecentFormGameLog] = useState([]);
  const [recentFormLoading, setRecentFormLoading] = useState(false);
  const [recentFormSeasonType, setRecentFormSeasonType] = useState('R');

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
  // TRACK CURRENT PLAYER
  // ============================================================================
  useEffect(() => {
    if (playerInfo?.id) {
      currentPlayerIdRef.current = playerInfo.id;
      // Reset pagination when player changes
      setGameLogPage(1);
    }
  }, [playerInfo?.id]);

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
        
        const games = response?.games || [];
        
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
    
    return () => {
      gameLogFetchIdRef.current++;
    };
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
    
    return () => {
      recentFormFetchIdRef.current++;
    };
  }, [playerInfo?.id, selectedSeason, recentFormSeasonType]);

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
  };
};

export default useGameLogs;
