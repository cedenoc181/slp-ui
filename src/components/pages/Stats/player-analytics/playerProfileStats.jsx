// ============================================================================
// PLAYER PROFILE STATS - MAIN ORCHESTRATOR
// ============================================================================
// This component orchestrates the player profile page using extracted hooks
// and utilities. All data fetching is handled by custom hooks, and all
// calculations are handled by utility functions.
//
// File reduced from ~1500 lines to ~400 lines through extraction of:
// - Custom hooks: usePlayerProfile, useGameLogs
// - Utilities: playerProfileUtils, chartDataUtils, recentFormCalculations
// - Sub-components: See ./components/index.js
// ============================================================================

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { SEASONS, DEFAULT_SEASON } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/player-profile.css';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
import {
  PlayerProfileHeader,
  RecentFormSection,
  SeasonStatsSection,
  SplitsSection,
  PlayerHistorySection,
  GameLogSection,
} from './components';

// ============================================================================
// CUSTOM HOOKS
// ============================================================================
import { usePlayerProfile, useGameLogs } from './components/hooks';

// ============================================================================
// UTILITIES
// ============================================================================
import {
  extractMlbIdFromSlug,
  isNameOnlySlug,
  slugToPlayerName,
  formatDate,
  calculatePlayerAge,
  getTeamLogoUrl,
  checkIsPitcher,
  checkIsTwoWay,
  getInitialSeason,
  getInitialViewMode,
  getCurrentSeasonType,
  getAvailableSeasons,
  getChartMetricOptions,
  getDefaultChartMetric,
  getCurrentChartMetric,
  formatChartValue,
  getMaxChartValue,
  transformMonthlyChartData,
  transformYearlyChartData,
  calculateRecentFormStats,
} from './components/utils';

// ============================================================================
// SERVICES
// ============================================================================
import playerStatsService from '../../../../data/services/playerStatsServices';
import scheduleService from '../../../../data/services/scheduleService';

// ============================================================================
// CONSTANTS
// ============================================================================
const GAMES_PER_PAGE = 10;
const CAREER_CLICK_DEBOUNCE_MS = 1000; // 1 second debounce to prevent rapid clicks

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function PlayerProfileStats() {
  const { nameSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ========== URL PARAMS ==========
  const mlbIdFromSlug = useMemo(() => extractMlbIdFromSlug(nameSlug), [nameSlug]);
  
  // ========== NAME LOOKUP STATE ==========
  const [resolvedMlbId, setResolvedMlbId] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  
  // Resolve name-only slugs to MLB IDs
  useEffect(() => {
    const lookupByName = async () => {
      if (mlbIdFromSlug) {
        // Already have MLB ID from slug
        setResolvedMlbId(mlbIdFromSlug);
        return;
      }
      
      if (isNameOnlySlug(nameSlug)) {
        // Need to lookup by name
        setLookupLoading(true);
        setLookupError(null);
        try {
          const playerName = slugToPlayerName(nameSlug);
          const result = await playerStatsService.lookupPlayer({ fullName: playerName });
          if (result && result.mlb_id) {
            // Redirect to proper URL with MLB ID for better bookmarking
            const season = searchParams.get('season') || DEFAULT_SEASON;
            navigate(`/player/${result.mlb_id}?season=${season}`, { replace: true });
          } else {
            setLookupError(`Player "${playerName}" not found`);
          }
        } catch (err) {
          setLookupError('Failed to find player');
        } finally {
          setLookupLoading(false);
        }
      }
    };
    
    lookupByName();
  }, [nameSlug, mlbIdFromSlug, navigate, searchParams]);
  
  // Use resolved MLB ID or direct slug ID
  const effectiveMlbId = resolvedMlbId || mlbIdFromSlug;
  
  // ========== SEASON STATE ==========
  const [selectedSeason, setSelectedSeason] = useState(() => getInitialSeason(searchParams));
  const [selectedSeasonType, setSelectedSeasonType] = useState(() => getCurrentSeasonType());

  // ========== UI STATE ==========
  const [activeStatsTab, setActiveStatsTab] = useState('current');
  const [activeSplitsTab, setActiveSplitsTab] = useState('handedness');
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const seasonDropdownRef = useRef(null);
  const lastCareerClickRef = useRef(0);
  const [selectedChartMetric, setSelectedChartMetric] = useState('hr');
  const [twoWayViewMode, setTwoWayViewMode] = useState(() => getInitialViewMode(searchParams));
  
  // ========== TRANSITION LOADING STATE ==========
  // Full-page loading overlay to prevent browser crashes during heavy data operations
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('Loading...');
  const transitionTimeoutRef = useRef(null);

  // ========== PLAYER TYPE FLAGS (Pre-compute for hooks) ==========
  const [playerInfoState, setPlayerInfoState] = useState(null);
  const isPitcher = useMemo(() => checkIsPitcher(playerInfoState), [playerInfoState]);
  const isTwoWay = useMemo(() => checkIsTwoWay(playerInfoState), [playerInfoState]);

  // ========== PLAYER DATA (CUSTOM HOOK) ==========
  const {
    playerLoading,
    statsLoading,
    careerTotalsLoading,
    careerSplitsLoading,
    error,
    playerInfo,
    seasonStats,
    careerStats,
    careerTotals,
    vsHandSplits,
    homeRoadSplits,
    vsHandSplitsCareer,
    homeRoadSplitsCareer,
    monthlyPerformance,
    pitchingSeasonStats,
    pitchingCareerStats,
    pitchingVsHandSplits,
    pitchingHomeRoadSplits,
    pitchingMonthlyPerformance,
    pitchingCareerTotals,
    pitchingVsHandSplitsCareer,
    pitchingHomeRoadSplitsCareer,
    teamHistory,
    injuryHistory,
    fetchCareerData,
  } = usePlayerProfile(effectiveMlbId, selectedSeason, isPitcher, isTwoWay, selectedSeasonType);

  // Sync playerInfo to local state for type checking
  useEffect(() => {
    if (playerInfo) setPlayerInfoState(playerInfo);
  }, [playerInfo]);
  
  // Show transition loading when player changes (navigating to new player)
  useEffect(() => {
    if (effectiveMlbId) {
      setTransitionLoading(true);
      setTransitionMessage('Loading player profile...');
      
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Give browser time to garbage collect and prepare
      transitionTimeoutRef.current = setTimeout(() => {
        setTransitionLoading(false);
      }, 1500); // 1.5 second delay on player change
    }
    
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [effectiveMlbId]);
  
  // Hide transition when player data is ready (but not before minimum time)
  useEffect(() => {
    if (!playerLoading && !statsLoading && playerInfo) {
      // Keep the transition loading visible for a minimum time
      const minDelay = setTimeout(() => {
        setTransitionLoading(false);
      }, 500);
      
      return () => clearTimeout(minDelay);
    }
  }, [playerLoading, statsLoading, playerInfo]);

  // ========== GAME LOGS (CUSTOM HOOK) ==========
  const {
    gameLog,
    gameLogLoading,
    gameLogSeasonType,
    setGameLogSeasonType,
    recentFormGameLog,
    pitchingRecentFormGameLog,
    recentFormLoading,
    recentFormSeasonType,
    setRecentFormSeasonType,
    availableRecentFormSeasonTypes,
  } = useGameLogs({ playerInfo, selectedSeason, twoWayViewMode });

  // ========== COMPUTED: SHOW PITCHING STATS ==========
  const showPitchingStats = useMemo(() => {
    if (isTwoWay) return twoWayViewMode === 'pitching';
    return isPitcher;
  }, [isTwoWay, twoWayViewMode, isPitcher]);

  // ========== PLAYER AGE ==========
  const playerAge = useMemo(() => calculatePlayerAge(playerInfo?.birth_date), [playerInfo]);

  // ========== UPCOMING START (PITCHER ONLY) ==========
  const [upcomingStart, setUpcomingStart] = useState(null);

  useEffect(() => {
    const internalId = playerInfo?.id;
    if (!internalId || !checkIsPitcher(playerInfo)) { setUpcomingStart(null); return; }
    let cancelled = false;
    const year = new Date().getFullYear();
    const playerName = (playerInfo.full_name || playerInfo.player_name || '').toLowerCase().trim();
    // Fetch today + all upcoming game types (spring, regular, postseason) so no start is missed.
    Promise.allSettled([
      scheduleService.getTodayGames(),
      scheduleService.getUpcomingGames({ season: year, limit: 30 }),
    ]).then(([todayRes, upcomingRes]) => {
      if (cancelled) return;
      const all = [
        ...(todayRes.status   === 'fulfilled' && Array.isArray(todayRes.value)   ? todayRes.value   : []),
        ...(upcomingRes.status === 'fulfilled' && Array.isArray(upcomingRes.value) ? upcomingRes.value : []),
      ];
      const match = all.find(g => {
        // Primary: internal ID match
        if (String(g.away_sp_id) === String(internalId)) return true;
        if (String(g.home_sp_id) === String(internalId)) return true;
        // Fallback: name match for games where sp_id is not yet set
        if (playerName) {
          if (g.away_sp_name?.toLowerCase().trim() === playerName) return true;
          if (g.home_sp_name?.toLowerCase().trim() === playerName) return true;
        }
        return false;
      });
      setUpcomingStart(match ? { game: match, internalId, playerName } : null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [playerInfo]);

  // ========== AVAILABLE SEASONS ==========
  const availableSeasons = useMemo(() => getAvailableSeasons(careerStats), [careerStats]);

  // ========== ACTIVE STATS (FOR TWP) ==========
  const activeSeasonStats = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingSeasonStats;
    return seasonStats;
  }, [isTwoWay, twoWayViewMode, pitchingSeasonStats, seasonStats]);

  const activeCareerStats = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingCareerStats;
    return careerStats;
  }, [isTwoWay, twoWayViewMode, pitchingCareerStats, careerStats]);

  const activeCareerTotals = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingCareerTotals;
    return careerTotals;
  }, [isTwoWay, twoWayViewMode, pitchingCareerTotals, careerTotals]);

  const activeVsHandSplits = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingVsHandSplits;
    return vsHandSplits;
  }, [isTwoWay, twoWayViewMode, pitchingVsHandSplits, vsHandSplits]);

  const activeHomeRoadSplits = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingHomeRoadSplits;
    return homeRoadSplits;
  }, [isTwoWay, twoWayViewMode, pitchingHomeRoadSplits, homeRoadSplits]);

  const activeVsHandSplitsCareer = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingVsHandSplitsCareer;
    return vsHandSplitsCareer;
  }, [isTwoWay, twoWayViewMode, pitchingVsHandSplitsCareer, vsHandSplitsCareer]);

  const activeHomeRoadSplitsCareer = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingHomeRoadSplitsCareer;
    return homeRoadSplitsCareer;
  }, [isTwoWay, twoWayViewMode, pitchingHomeRoadSplitsCareer, homeRoadSplitsCareer]);

  const activeMonthlyPerformance = useMemo(() => {
    if (isTwoWay && twoWayViewMode === 'pitching') return pitchingMonthlyPerformance;
    return monthlyPerformance;
  }, [isTwoWay, twoWayViewMode, pitchingMonthlyPerformance, monthlyPerformance]);

  // ========== CHART DATA ==========
  const chartMetricOptions = useMemo(
    () => getChartMetricOptions(isPitcher, isTwoWay, twoWayViewMode),
    [isPitcher, isTwoWay, twoWayViewMode]
  );

  const currentChartMetric = useMemo(
    () => getCurrentChartMetric(selectedChartMetric, chartMetricOptions),
    [selectedChartMetric, chartMetricOptions]
  );

  const monthlyChartData = useMemo(
    () => transformMonthlyChartData(activeMonthlyPerformance),
    [activeMonthlyPerformance]
  );

  const yearlyChartData = useMemo(
    () => transformYearlyChartData(activeCareerStats, showPitchingStats),
    [activeCareerStats, showPitchingStats]
  );

  const getChartData = useCallback(() => {
    const metricKey = currentChartMetric.key;
    if (activeStatsTab === 'career') {
      return yearlyChartData[metricKey] || [];
    }
    return monthlyChartData[metricKey] || [];
  }, [activeStatsTab, currentChartMetric.key, yearlyChartData, monthlyChartData]);

  const getMaxValue = useCallback((data) => getMaxChartValue(data), []);
  
  const formatChartValueFn = useCallback(
    (value) => formatChartValue(value, currentChartMetric.key),
    [currentChartMetric.key]
  );

  // ========== RECENT FORM STATS ==========
  const recentFormStats = useMemo(() => {
    return calculateRecentFormStats({
      gameLog: recentFormGameLog,
      pitchingGameLog: pitchingRecentFormGameLog,
      seasonType: recentFormSeasonType,
      seasonStats: activeSeasonStats,
      showPitchingStats,
      playerInfo,
    });
  }, [recentFormGameLog, pitchingRecentFormGameLog, recentFormSeasonType, activeSeasonStats, showPitchingStats, playerInfo]);

  // ========== EFFECTS ==========
  // Reset UI state when player changes (nameSlug changes)
  useEffect(() => {
    setActiveStatsTab('current');
    setActiveSplitsTab('handedness');
    setSeasonDropdownOpen(false);
    setPlayerInfoState(null);
  }, [nameSlug]);

  // Sync season from URL params
  useEffect(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam)) {
      setSelectedSeason(prev => prev !== seasonParam ? seasonParam : prev);
    }
  }, [searchParams]);

  // Close season dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target)) {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-select most recent available season
  useEffect(() => {
    if (availableSeasons.length > 0) {
      setSelectedSeason(prev => {
        if (!availableSeasons.includes(prev)) {
          return availableSeasons[0];
        }
        return prev;
      });
    }
  }, [availableSeasons]);

  // Update default chart metric when player type changes
  useEffect(() => {
    setSelectedChartMetric(getDefaultChartMetric(showPitchingStats));
  }, [showPitchingStats]);

  // ========== HANDLERS ==========
  const handleSeasonChange = useCallback((newSeason) => {
    // Show transition overlay during season change
    setTransitionLoading(true);
    setTransitionMessage(`Loading ${newSeason} season...`);
    
    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // Delay the actual data change to let browser prepare
    transitionTimeoutRef.current = setTimeout(() => {
      setActiveStatsTab('current'); // Switch back from career if needed
      setSelectedSeason(newSeason);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('season', newSeason);
      setSearchParams(newParams, { replace: true });
      
      // Hide overlay after another delay for data to settle
      setTimeout(() => {
        setTransitionLoading(false);
      }, 800);
    }, 300);
  }, [searchParams, setSearchParams]);

  const handleSeasonAndTypeChange = useCallback((newSeason, newType) => {
    if (newSeason === selectedSeason) {
      // Same year — just swap the season type, no transition overlay needed
      if (newType !== selectedSeasonType) {
        setSelectedSeasonType(newType);
        setActiveStatsTab('current');
      }
    } else {
      // Different year — run the full transition and update both
      setSelectedSeasonType(newType);
      handleSeasonChange(newSeason);
    }
  }, [selectedSeason, selectedSeasonType, handleSeasonChange]);

  const handleCareerTabClick = useCallback(() => {
    // Debounce rapid clicks to prevent multiple fetches
    const now = Date.now();
    if (now - lastCareerClickRef.current < CAREER_CLICK_DEBOUNCE_MS) {
      return;
    }
    lastCareerClickRef.current = now;
    
    // If already on career tab or loading, do nothing
    if (activeStatsTab === 'career' || transitionLoading) {
      return;
    }
    
    // Show transition overlay during career load
    setTransitionLoading(true);
    setTransitionMessage('Loading career statistics...');
    
    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // Delay the actual data fetch to let browser prepare
    transitionTimeoutRef.current = setTimeout(() => {
      setActiveStatsTab('career');
      
      // Don't fetch if already have career data
      if (!careerTotalsLoading) {
        fetchCareerData();
      }
      
      // Hide overlay after data has time to settle - extra long for career
      setTimeout(() => {
        setTransitionLoading(false);
      }, 2000); // 2 seconds for career data to prevent crashes
    }, 500); // Longer initial delay
  }, [fetchCareerData, careerTotalsLoading, activeStatsTab, transitionLoading]);

  // Handler for two-way player mode toggle with transition loading
  const handleTwoWayViewModeChange = useCallback((newMode) => {
    if (transitionLoading || newMode === twoWayViewMode) return;
    
    setTransitionLoading(true);
    setTransitionMessage(newMode === 'pitching' ? 'Loading pitching stats...' : 'Loading batting stats...');
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    transitionTimeoutRef.current = setTimeout(() => {
      setTwoWayViewMode(newMode);
      
      setTimeout(() => {
        setTransitionLoading(false);
      }, 800);
    }, 300);
  }, [transitionLoading, twoWayViewMode]);

  // ========== NAME LOOKUP LOADING STATE ==========
  if (lookupLoading) {
    return (
      <div className="pps-page">
        <div className="pps-loading-container">
          <div className="pps-loading-spinner"></div>
          <span>Finding player...</span>
        </div>
      </div>
    );
  }

  // ========== NAME LOOKUP ERROR STATE ==========
  if (lookupError) {
    return (
      <div className="pps-page">
        <div className="pps-error-container">
          <span className="pps-error-icon">⚠️</span>
          <h2>Player Not Found</h2>
          <p>{lookupError}</p>
        </div>
      </div>
    );
  }

  // ========== LOADING STATE ==========
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

  // ========== ERROR STATE ==========
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

  // ========== RENDER ==========
  return (
    <div className="pps-page">
      {/* Transition Loading Overlay - Shows during heavy data operations */}
      {transitionLoading && (
        <div className="pps-transition-overlay">
          <div className="pps-transition-content">
            <div className="pps-loading-spinner"></div>
            <span>{transitionMessage}</span>
          </div>
        </div>
      )}
      
      <PlayerProfileHeader
        playerInfo={playerInfo}
        playerAge={playerAge}
        isTwoWay={isTwoWay}
        twoWayViewMode={twoWayViewMode}
        setTwoWayViewMode={handleTwoWayViewModeChange}
        formatDate={formatDate}
        upcomingStart={upcomingStart}
      />

      <main className="pps-content">
        <div className="pps-container">
          <RecentFormSection
            selectedSeason={selectedSeason}
            recentFormSeasonType={recentFormSeasonType}
            setRecentFormSeasonType={setRecentFormSeasonType}
            availableSeasonTypes={availableRecentFormSeasonTypes}
            recentFormStats={recentFormStats}
            recentFormLoading={recentFormLoading}
            showPitchingStats={showPitchingStats}
          />

          <SeasonStatsSection
            selectedSeason={selectedSeason}
            selectedSeasonType={selectedSeasonType}
            handleSeasonAndTypeChange={handleSeasonAndTypeChange}
            activeStatsTab={activeStatsTab}
            setActiveStatsTab={setActiveStatsTab}
            seasonDropdownOpen={seasonDropdownOpen}
            setSeasonDropdownOpen={setSeasonDropdownOpen}
            seasonDropdownRef={seasonDropdownRef}
            availableSeasons={availableSeasons}
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
            formatChartValue={formatChartValueFn}
          />

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

          <PlayerHistorySection
            teamHistory={teamHistory}
            injuryHistory={injuryHistory}
            playerInfo={playerInfo}
            getTeamLogoUrl={getTeamLogoUrl}
          />

          <GameLogSection
            gameLog={gameLog}
            gameLogLoading={gameLogLoading}
            selectedSeason={selectedSeason}
            gameLogSeasonType={gameLogSeasonType}
            setGameLogSeasonType={setGameLogSeasonType}
            showPitchingStats={showPitchingStats}
            gamesPerPage={GAMES_PER_PAGE}
          />
        </div>
      </main>
    </div>
  );
}

export default PlayerProfileStats;
