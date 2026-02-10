// ============================================================================
// TEAM ANALYTICS UTILS INDEX
// ============================================================================

export {
  // Season helpers
  getSeasonData,
  getStreakString,
  isWinningStreak,
  
  // Stats helpers
  getBattingStats,
  getPitchingStats,
  calculateLast10Stats,
  
  // Roster helpers
  getFilteredRoster,
  getRosterCounts,
  
  // Injury helpers
  getInjuriesForTimeframe,
  isStillInjured,
  getInjuryCounts,
  getInjuryPeriodLabel,
  sortInjuries,
  
  // Chart helpers
  getSeasonPhase,
  shouldShowDivider,
  getDividerLabel,
  getFirstPhaseLabel,
  filterMonthlyData,
  getMonthData,
  getWinPctColor,
  getSplitPctColor,
} from './teamAnalyticsUtils';
