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

import React, { useState, useMemo, useEffect, useCallback, useRef, startTransition } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SEASONS } from '../../../../data/constants/apiConstants';
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
  formatDate,
  calculatePlayerAge,
  getTeamLogoUrl,
  checkIsPitcher,
  checkIsTwoWay,
  getInitialSeason,
  getInitialViewMode,
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
// CONSTANTS
// ============================================================================
const GAMES_PER_PAGE = 10;

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function PlayerProfileStats() {
  const { nameSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ========== URL PARAMS ==========
  const mlbIdFromSlug = useMemo(() => extractMlbIdFromSlug(nameSlug), [nameSlug]);
  
  // ========== SEASON STATE ==========
  const [selectedSeason, setSelectedSeason] = useState(() => getInitialSeason(searchParams));
  
  // ========== UI STATE ==========
  const [activeStatsTab, setActiveStatsTab] = useState('current');
  const [activeSplitsTab, setActiveSplitsTab] = useState('handedness');
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const seasonDropdownRef = useRef(null);
  const [selectedChartMetric, setSelectedChartMetric] = useState('hr');
  const [twoWayViewMode, setTwoWayViewMode] = useState(() => getInitialViewMode(searchParams));

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
  } = usePlayerProfile(mlbIdFromSlug, selectedSeason, isPitcher, isTwoWay);

  // Sync playerInfo to local state for type checking
  useEffect(() => {
    if (playerInfo) setPlayerInfoState(playerInfo);
  }, [playerInfo]);

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
  } = useGameLogs({ playerInfo, selectedSeason, twoWayViewMode });

  // ========== COMPUTED: SHOW PITCHING STATS ==========
  const showPitchingStats = useMemo(() => {
    if (isTwoWay) return twoWayViewMode === 'pitching';
    return isPitcher;
  }, [isTwoWay, twoWayViewMode, isPitcher]);

  // ========== PLAYER AGE ==========
  const playerAge = useMemo(() => calculatePlayerAge(playerInfo?.birth_date), [playerInfo]);

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
    setSelectedSeason(newSeason);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('season', newSeason);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCareerTabClick = useCallback(async () => {
    startTransition(() => {
      setActiveStatsTab('career');
    });
    await fetchCareerData();
  }, [fetchCareerData]);

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
      <PlayerProfileHeader
        playerInfo={playerInfo}
        playerAge={playerAge}
        isTwoWay={isTwoWay}
        twoWayViewMode={twoWayViewMode}
        setTwoWayViewMode={setTwoWayViewMode}
        formatDate={formatDate}
      />

      <main className="pps-content">
        <div className="pps-container">
          <RecentFormSection
            selectedSeason={selectedSeason}
            recentFormSeasonType={recentFormSeasonType}
            setRecentFormSeasonType={setRecentFormSeasonType}
            recentFormStats={recentFormStats}
            recentFormLoading={recentFormLoading}
            showPitchingStats={showPitchingStats}
          />

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
