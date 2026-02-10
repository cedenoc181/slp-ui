// ============================================================================
// UTILITIES INDEX
// ============================================================================
// Re-exports all utility functions for the player profile page.
// ============================================================================

// Player profile utilities
export {
  MIN_LOADING_DURATION,
  extractMlbIdFromSlug,
  withMinLoadingTime,
  formatDate,
  calculatePlayerAge,
  getTeamLogoUrl,
  getPlayerHeadshotUrl,
  checkIsPitcher,
  checkIsTwoWay,
  getPlayerPosition,
  getDefaultSeason,
  getInitialSeason,
  getInitialViewMode,
  getAvailableSeasons,
} from './playerProfileUtils';

// Chart data utilities
export {
  BATTER_CHART_METRICS,
  PITCHER_CHART_METRICS,
  getChartMetricOptions,
  getDefaultChartMetric,
  getCurrentChartMetric,
  formatChartValue,
  getMaxChartValue,
  transformMonthlyChartData,
  transformYearlyChartData,
} from './chartDataUtils';

// Recent form calculations
export {
  calculateBatterRollingStats,
  calculatePitcherRollingStats,
  calculateHittingStreak,
  calculateMultiHitStreak,
  calculateQualityStartStreak,
  calculateBatterFormStatus,
  calculatePitcherFormStatus,
  calculateRecentFormStats,
} from './recentFormCalculations';
