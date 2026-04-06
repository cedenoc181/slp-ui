// ============================================================================
// TEAM ANALYTICS PAGE
// ============================================================================
// Main page component for team analytics.
// Uses useTeamAnalytics hook for data and sub-components for rendering.
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';

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

function AuthGate({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return children;
  return (
    <div className="auth-gate">
      <div className="auth-gate__blur">{children}</div>
      <div className="auth-gate__overlay">
        <div className="auth-gate__overlay-inner">
          <svg className="auth-gate__lock" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="auth-gate__text">Sign in to view</span>
          <Link className="auth-gate__link" to="/account">Create a free account</Link>
        </div>
      </div>
    </div>
  );
}

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
    leadersSeason,
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
        <AuthGate>
          <MonthlyPerformanceChart
            teamMonthlyData={teamMonthlyData}
            timeframe={timeframe}
            chartFilter={chartFilter}
            chartSectionRef={chartSectionRef}
            selectedSeason={selectedSeason}
          />
        </AuthGate>

        {/* Floating Chart Filter Remote */}
        <FloatingChartFilters
          chartFilter={chartFilter}
          handleChartFilterChange={handleChartFilterChange}
          isFilterChanging={isFilterChanging}
          shouldHideFloatingFilters={shouldHideFloatingFilters}
        />

        {/* Split Stats and Last 10 Games */}
        <AuthGate>
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
        </AuthGate>

        {/* Team Info Grid: Standings, Leaders, Stats */}
        <TeamInfoGrid
          standingsSectionRef={standingsSectionRef}
          record={record}
          streak={streak}
          ranks={ranks}
          teamSeasonData={teamSeasonData}
          battingLeaders={battingLeaders}
          pitchingLeaders={pitchingLeaders}
          leadersSeason={leadersSeason}
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
