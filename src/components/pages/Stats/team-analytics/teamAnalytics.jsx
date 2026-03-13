// ============================================================================
// TEAM ANALYTICS PAGE
// ============================================================================
// Main page component for team analytics.
// Uses useTeamAnalytics hook for data and sub-components for rendering.
// ============================================================================

import React from 'react';

// Hook
import { useTeamAnalytics } from './hooks';

// Components
import {
  TeamAnalyticsHeader,
  TeamOverviewCards,
  MonthlyPerformanceChart,
  FloatingChartFilters,
  PerformanceSplitsSection,
  TeamInfoGrid,
  RosterInjurySection,
  TeamGameLogSection,
} from './components';

// Utils
import { 
  getSeasonData,
  getBattingStats,
  getPitchingStats,
} from './utils';

// ============================================================================
// Component
// ============================================================================

function TeamAnalytics() {
  const {
    // Team Selection
    selectedTeam,
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
    injuriesFullSeason,

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
  } = useTeamAnalytics();

  // ========== Computed Values ==========
  const seasonData = getSeasonData(teamSeasonData, timeframe);
  const currentBattingStats = getBattingStats(battingStats);
  const currentPitchingStats = getPitchingStats(pitchingStats);

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
          <button onClick={retryFetch} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // ========== Render ==========
  return (
    <div className="team-analytics-page">
      {/* Transition Loading Overlay - Shows during team change */}
      {transitionLoading && (
        <div className="ta-transition-overlay">
          <div className="ta-transition-content">
            <div className="ta-loading-spinner"></div>
            <span>{transitionMessage}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <TeamAnalyticsHeader
        currentTeam={currentTeam}
        currentTeamName={currentTeamName}
        selectedTeam={selectedTeam}
        selectedSeason={selectedSeason}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        handleTeamChange={handleTeamChange}
        setSelectedSeason={setSelectedSeason}
      />

      {/* Main Content */}
      <div className="analytics-content container">
        {/* Season Overview Cards */}
        <TeamOverviewCards
          seasonData={seasonData}
          record={record}
          runs={runs}
          streak={streak}
          recordSplits={recordSplits}
          selectedSeason={selectedSeason}
          teamSeasonData={teamSeasonData}
        />

        {/* Monthly Performance Trends Chart */}
        <MonthlyPerformanceChart
          teamMonthlyData={teamMonthlyData}
          timeframe={timeframe}
          chartFilter={chartFilter}
          chartSectionRef={chartSectionRef}
          selectedSeason={selectedSeason}
        />

        {/* Floating Chart Filter Remote */}
        <FloatingChartFilters
          chartFilter={chartFilter}
          handleChartFilterChange={handleChartFilterChange}
          isFilterChanging={isFilterChanging}
          shouldHideFloatingFilters={shouldHideFloatingFilters}
        />

        {/* Split Stats and Last 10 Games */}
        <PerformanceSplitsSection
          recordSplits={recordSplits}
          chartFilter={chartFilter}
          currentTeam={currentTeam}
          teamSeasonData={teamSeasonData}
          last10Games={last10Games}
          last10Record={last10Record}
          homeGames={homeGames}
          awayGames={awayGames}
          selectedSeason={selectedSeason}
        />

        {/* Team Info Grid: Standings, Leaders, Stats */}
        <TeamInfoGrid
          standingsSectionRef={standingsSectionRef}
          record={record}
          streak={streak}
          ranks={ranks}
          teamSeasonData={teamSeasonData}
          battingLeaders={battingLeaders}
          pitchingLeaders={pitchingLeaders}
          currentBattingStats={currentBattingStats}
          currentPitchingStats={currentPitchingStats}
          leadersToggle={leadersToggle}
          setLeadersToggle={setLeadersToggle}
          teamStatsToggle={teamStatsToggle}
          setTeamStatsToggle={setTeamStatsToggle}
          selectedTeam={selectedTeam}
          selectedSeason={selectedSeason}
          handleLeaderClick={handleLeaderClick}
        />

        {/* Team Roster and Injury List */}
        <RosterInjurySection
          roster={roster}
          rosterFilter={rosterFilter}
          setRosterFilter={setRosterFilter}
          selectedSeason={selectedSeason}
          injuriesFullSeason={injuriesFullSeason}
          timeframe={timeframe}
          injuryFilter={injuryFilter}
          setInjuryFilter={setInjuryFilter}
        />

        {/* Team Game Log */}
        <TeamGameLogSection
          teamGames={teamGames}
          loading={teamGamesLoading}
          selectedSeason={selectedSeason}
          seasonType={gameLogSeasonType}
          setSeasonType={setGameLogSeasonType}
          currentTeamName={currentTeamName}
          teamMlbId={teamMlbId}
          availableSeasonTypes={availableSeasonTypes}
        />
      </div>
    </div>
  );
}

export default TeamAnalytics;
