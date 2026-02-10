// ============================================================================
// TEAM ANALYTICS UTILITIES
// ============================================================================
// Helper functions for team data transformation and formatting.
// ============================================================================

// ============================================================================
// Season Data Helpers
// ============================================================================

/**
 * Get the correct season data based on timeframe
 * @param {object} teamSeasonData - Raw team season data
 * @param {string} timeframe - 'season', 'first-half', or 'second-half'
 * @returns {object|null} Season data for the timeframe
 */
export const getSeasonData = (teamSeasonData, timeframe) => {
  if (!teamSeasonData) return null;

  switch (timeframe) {
    case 'first-half':
      return teamSeasonData.first_half;
    case 'second-half':
      return teamSeasonData.second_half;
    default:
      return teamSeasonData.regular_season;
  }
};

/**
 * Safely get streak string from streak object
 * @param {object|string} streak - Streak data
 * @returns {string|null} Streak string like "W5" or "L3"
 */
export const getStreakString = (streak) => {
  if (!streak) return null;
  if (typeof streak === 'string') return streak;
  if (typeof streak === 'object') {
    return streak.streak_code || `${streak.streak_type?.[0]?.toUpperCase() || ''}${streak.streak_number || ''}`;
  }
  return String(streak);
};

/**
 * Check if streak is a winning streak
 * @param {object|string} streak - Streak data
 * @returns {boolean} True if winning streak
 */
export const isWinningStreak = (streak) => {
  if (!streak) return false;
  if (typeof streak === 'string') return streak.toUpperCase().startsWith('W');
  if (typeof streak === 'object') {
    return streak.streak_type === 'wins' || streak.streak_code?.toUpperCase().startsWith('W');
  }
  return false;
};

// ============================================================================
// Stats Helpers
// ============================================================================

/**
 * Get batting stats (array, so get first item)
 * @param {array} battingStats - Raw batting stats array
 * @returns {object|null} First batting stats object
 */
export const getBattingStats = (battingStats) => {
  if (!battingStats || !Array.isArray(battingStats) || battingStats.length === 0) return null;
  return battingStats[0];
};

/**
 * Get pitching stats (array, so get first item)
 * @param {array} pitchingStats - Raw pitching stats array
 * @returns {object|null} First pitching stats object
 */
export const getPitchingStats = (pitchingStats) => {
  if (!pitchingStats || !Array.isArray(pitchingStats) || pitchingStats.length === 0) return null;
  return pitchingStats[0];
};

/**
 * Calculate last 10 stats from games array
 * @param {array} games - Games array
 * @returns {object|null} Last 10 stats { wins, losses, runsScored, runsAllowed }
 */
export const calculateLast10Stats = (games) => {
  if (!games || !Array.isArray(games) || games.length === 0) return null;

  const recentGames = games.slice(0, 10);

  let wins = 0;
  let losses = 0;
  let runsScored = 0;
  let runsAllowed = 0;

  recentGames.forEach(game => {
    if (game.result === 'W' || game.win) {
      wins++;
    } else {
      losses++;
    }
    runsScored += game.runs_scored || game.runsScored || game.runs || 0;
    runsAllowed += game.runs_allowed || game.runsAllowed || game.opponent_runs || 0;
  });

  return { wins, losses, runsScored, runsAllowed };
};

// ============================================================================
// Roster Helpers
// ============================================================================

/**
 * Filter roster based on toggle selection
 * @param {object} roster - Roster object with position groups
 * @param {string} filter - 'all', 'pitchers', or 'position'
 * @returns {array} Filtered roster array
 */
export const getFilteredRoster = (roster, filter) => {
  if (!roster) return [];

  switch (filter) {
    case 'pitchers':
      return roster.pitchers || [];
    case 'position':
      return [
        ...(roster.catchers || []),
        ...(roster.infielders || []),
        ...(roster.outfielders || []),
      ];
    default:
      return [
        ...(roster.pitchers || []),
        ...(roster.catchers || []),
        ...(roster.infielders || []),
        ...(roster.outfielders || []),
      ];
  }
};

/**
 * Get roster counts by position group
 * @param {object} roster - Roster object
 * @returns {object} Counts { total, pitchers, position }
 */
export const getRosterCounts = (roster) => {
  if (!roster) return { total: 0, pitchers: 0, position: 0 };

  const pitchersCount = (roster.pitchers || []).length;
  const positionCount =
    (roster.catchers || []).length +
    (roster.infielders || []).length +
    (roster.outfielders || []).length;

  return {
    total: roster.total_players || pitchersCount + positionCount,
    pitchers: pitchersCount,
    position: positionCount,
  };
};

// ============================================================================
// Injury Helpers
// ============================================================================

/**
 * Get injuries filtered by timeframe
 * @param {object} injuriesFullSeason - Full season injuries data
 * @param {string} timeframe - 'season', 'first-half', or 'second-half'
 * @returns {array} Filtered injuries array
 */
export const getInjuriesForTimeframe = (injuriesFullSeason, timeframe) => {
  const allInjuries = injuriesFullSeason?.injuries || [];

  if (timeframe === 'season') {
    return allInjuries;
  }

  return allInjuries.filter(injury => {
    if (!injury.injury_date) return false;

    const injuryDate = new Date(injury.injury_date);
    const month = injuryDate.getMonth() + 1;

    if (timeframe === 'first-half') {
      return month >= 2 && month <= 6;
    } else if (timeframe === 'second-half') {
      return month >= 7 && month <= 11;
    }

    return true;
  });
};

/**
 * Check if player is still actively injured
 * @param {object} injury - Injury object
 * @returns {boolean} True if still on IL
 */
export const isStillInjured = (injury) => {
  return !injury.activation_date;
};

/**
 * Get injury counts for display
 * @param {array} injuries - Injuries array
 * @returns {object} Counts { total, current, returned }
 */
export const getInjuryCounts = (injuries) => {
  if (!injuries) return { total: 0, current: 0, returned: 0 };

  return {
    total: injuries.length,
    current: injuries.filter(i => isStillInjured(i)).length,
    returned: injuries.filter(i => !isStillInjured(i)).length,
  };
};

/**
 * Get injury period label
 * @param {string} timeframe - 'season', 'first-half', or 'second-half'
 * @returns {string} Period label
 */
export const getInjuryPeriodLabel = (timeframe) => {
  switch (timeframe) {
    case 'first-half':
      return 'First Half';
    case 'second-half':
      return 'Second Half';
    case 'season':
    default:
      return 'Full Season';
  }
};

/**
 * Sort injuries based on filter selection
 * @param {array} injuries - Injuries array
 * @param {string} injuryFilter - 'all', 'active', or 'returned'
 * @returns {array} Sorted injuries array
 */
export const sortInjuries = (injuries, injuryFilter) => {
  return [...injuries].sort((a, b) => {
    const aActive = isStillInjured(a);
    const bActive = isStillInjured(b);

    if (injuryFilter === 'active') {
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
    } else if (injuryFilter === 'returned') {
      if (!aActive && bActive) return -1;
      if (aActive && !bActive) return 1;
    }

    return new Date(b.injury_date) - new Date(a.injury_date);
  });
};

// ============================================================================
// Chart Helpers
// ============================================================================

/**
 * Get season phase for a month
 * @param {string} monthName - Full month name
 * @returns {string|null} Phase: 'spring', 'regular', or 'postseason'
 */
export const getSeasonPhase = (monthName) => {
  if (['February', 'March'].includes(monthName)) return 'spring';
  if (['April', 'May', 'June', 'July', 'August', 'September'].includes(monthName)) return 'regular';
  if (['October', 'November'].includes(monthName)) return 'postseason';
  return null;
};

/**
 * Check if divider should show after a month
 * @param {string} currentMonth - Current month name
 * @param {string} nextMonth - Next month name
 * @returns {boolean} True if divider should show
 */
export const shouldShowDivider = (currentMonth, nextMonth) => {
  if (!nextMonth) return false;
  const currentPhase = getSeasonPhase(currentMonth);
  const nextPhase = getSeasonPhase(nextMonth);
  return currentPhase !== nextPhase;
};

/**
 * Get divider label for phase transition
 * @param {string} nextMonth - Next month name
 * @returns {string} Divider label
 */
export const getDividerLabel = (nextMonth) => {
  const phase = getSeasonPhase(nextMonth);
  if (phase === 'regular') return 'Regular Season';
  if (phase === 'postseason') return 'Postseason';
  return '';
};

/**
 * Get first phase label for the chart
 * @param {string} monthName - First month name
 * @returns {string} Phase label
 */
export const getFirstPhaseLabel = (monthName) => {
  const phase = getSeasonPhase(monthName);
  if (phase === 'spring') return 'Spring Training';
  if (phase === 'regular') return 'Regular Season';
  if (phase === 'postseason') return 'Postseason';
  return '';
};

/**
 * Filter months based on timeframe and chart filter
 * @param {array} monthlyData - Monthly data array
 * @param {string} timeframe - 'season', 'first-half', or 'second-half'
 * @param {string} chartFilter - 'season', 'home', or 'away'
 * @returns {array} Filtered months
 */
export const filterMonthlyData = (monthlyData, timeframe, chartFilter) => {
  if (!monthlyData || !Array.isArray(monthlyData)) return [];

  const firstHalfMonths = ['February', 'March', 'April', 'May', 'June'];
  const secondHalfMonths = ['July', 'August', 'September', 'October', 'November'];

  return monthlyData.filter(month => {
    if (timeframe === 'first-half' && !firstHalfMonths.includes(month.month)) {
      return false;
    }
    if (timeframe === 'second-half' && !secondHalfMonths.includes(month.month)) {
      return false;
    }

    if (chartFilter === 'home') {
      return (month.home_monthly_wins || 0) + (month.home_monthly_losses || 0) > 0;
    } else if (chartFilter === 'away') {
      return (month.away_monthly_wins || 0) + (month.away_monthly_losses || 0) > 0;
    } else {
      return (month.monthly_wins || 0) + (month.monthly_losses || 0) > 0;
    }
  });
};

/**
 * Get month data based on chart filter
 * @param {object} month - Month data object
 * @param {string} chartFilter - 'season', 'home', or 'away'
 * @returns {object} { wins, losses, winPct }
 */
export const getMonthData = (month, chartFilter) => {
  if (chartFilter === 'home') {
    return {
      wins: month.home_monthly_wins || 0,
      losses: month.home_monthly_losses || 0,
      winPct: month.home_monthly_pct,
    };
  } else if (chartFilter === 'away') {
    return {
      wins: month.away_monthly_wins || 0,
      losses: month.away_monthly_losses || 0,
      winPct: month.away_monthly_pct,
    };
  } else {
    return {
      wins: month.monthly_wins || 0,
      losses: month.monthly_losses || 0,
      winPct: month.monthly_pct,
    };
  }
};

/**
 * Get color for win percentage
 * @param {number} pct - Win percentage (0-100)
 * @returns {string} CSS color
 */
export const getWinPctColor = (pct) => {
  if (pct >= 60) return '#4CAF50';
  if (pct >= 50) return '#FF9800';
  if (pct > 0) return '#F44336';
  return '#888';
};

/**
 * Get color for split percentage
 * @param {number} pct - Win percentage (0-1)
 * @returns {string} CSS color
 */
export const getSplitPctColor = (pct) => {
  if (pct >= 0.6) return '#4CAF50';
  if (pct >= 0.5) return '#FF9800';
  return '#F44336';
};
