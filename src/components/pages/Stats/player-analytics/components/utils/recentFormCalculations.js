// ============================================================================
// RECENT FORM CALCULATIONS
// ============================================================================
// Utility functions for calculating rolling averages and form status.
// Handles both batter and pitcher statistics with L5/L7/L10/L15/L30 windows.
// ============================================================================

// ============================================================================
// BATTER ROLLING STATS
// ============================================================================

/**
 * Calculate rolling stats for batter from game logs
 * @param {Array} games - Array of game log objects
 * @returns {object|null} - Calculated stats or null if no games
 */
export const calculateBatterRollingStats = (games) => {
  if (!games || games.length === 0) return null;
  
  const totals = games.reduce((acc, g) => ({
    hits: acc.hits + (g.hits || 0),
    atBats: acc.atBats + (g.at_bats || 0),
    homeRuns: acc.homeRuns + (g.home_runs || 0),
    rbis: acc.rbis + (g.rbis || 0),
    runs: acc.runs + (g.runs || 0),
    walks: acc.walks + (g.walks || 0),
    strikeouts: acc.strikeouts + (g.strikeouts || 0),
    stolenBases: acc.stolenBases + (g.stolen_bases || 0),
    totalBases: acc.totalBases + (g.total_bases || 0),
    games: acc.games + 1,
  }), { 
    hits: 0, atBats: 0, homeRuns: 0, rbis: 0, runs: 0, 
    walks: 0, strikeouts: 0, stolenBases: 0, totalBases: 0, games: 0 
  });
  
  const avg = totals.atBats > 0 ? totals.hits / totals.atBats : 0;
  const obp = (totals.atBats + totals.walks) > 0 
    ? (totals.hits + totals.walks) / (totals.atBats + totals.walks) : 0;
  const slg = totals.atBats > 0 ? totals.totalBases / totals.atBats : 0;
  const ops = obp + slg;
  
  return {
    ...totals,
    avg,
    obp,
    slg,
    ops,
    hitsPerGame: totals.hits / totals.games,
    hrPerGame: totals.homeRuns / totals.games,
    rbisPerGame: totals.rbis / totals.games,
  };
};

/**
 * Calculate hitting streak from sorted games (most recent first)
 * @param {Array} sortedGames - Games sorted by date descending
 * @returns {number} - Current hitting streak length
 */
export const calculateHittingStreak = (sortedGames) => {
  let streak = 0;
  for (const game of sortedGames) {
    if (game.hits > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Calculate multi-hit game streak from sorted games
 * @param {Array} sortedGames - Games sorted by date descending
 * @returns {number} - Current multi-hit streak length
 */
export const calculateMultiHitStreak = (sortedGames) => {
  let streak = 0;
  for (const game of sortedGames) {
    if (game.hits >= 2) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Count multi-hit games in a set of games
 * @param {Array} games - Array of game objects
 * @returns {number} - Count of multi-hit games
 */
export const countMultiHitGames = (games) => {
  return games.filter(g => g.hits >= 2).length;
};

// ============================================================================
// PITCHER ROLLING STATS
// ============================================================================

/**
 * Calculate rolling stats for pitcher from game logs
 * @param {Array} games - Array of game log objects
 * @returns {object|null} - Calculated stats or null if no games
 */
export const calculatePitcherRollingStats = (games) => {
  if (!games || games.length === 0) return null;
  
  const totals = games.reduce((acc, g) => ({
    inningsPitched: acc.inningsPitched + (g.innings_pitched || 0),
    strikeouts: acc.strikeouts + (g.strikeouts || 0),
    walks: acc.walks + (g.walks || 0),
    earnedRuns: acc.earnedRuns + (g.earned_runs || 0),
    hitsAllowed: acc.hitsAllowed + (g.hits_allowed || 0),
    homeRunsAllowed: acc.homeRunsAllowed + (g.home_runs_allowed || 0),
    wins: acc.wins + (g.win ? 1 : 0),
    losses: acc.losses + (g.loss ? 1 : 0),
    qualityStarts: acc.qualityStarts + (g.quality_start ? 1 : 0),
    games: acc.games + 1,
  }), { 
    inningsPitched: 0, strikeouts: 0, walks: 0, earnedRuns: 0, 
    hitsAllowed: 0, homeRunsAllowed: 0, wins: 0, losses: 0, qualityStarts: 0, games: 0 
  });
  
  const era = totals.inningsPitched > 0 ? (totals.earnedRuns / totals.inningsPitched) * 9 : 0;
  const whip = totals.inningsPitched > 0 ? (totals.walks + totals.hitsAllowed) / totals.inningsPitched : 0;
  const kPer9 = totals.inningsPitched > 0 ? (totals.strikeouts / totals.inningsPitched) * 9 : 0;
  const bbPer9 = totals.inningsPitched > 0 ? (totals.walks / totals.inningsPitched) * 9 : 0;
  
  return {
    ...totals,
    era,
    whip,
    kPer9,
    bbPer9,
    kPerGame: totals.strikeouts / totals.games,
    ipPerGame: totals.inningsPitched / totals.games,
  };
};

/**
 * Calculate quality start streak from sorted games
 * @param {Array} sortedGames - Games sorted by date descending
 * @returns {number} - Current quality start streak length
 */
export const calculateQualityStartStreak = (sortedGames) => {
  let streak = 0;
  for (const game of sortedGames) {
    if (game.quality_start || (game.innings_pitched >= 6 && game.earned_runs <= 3)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Count quality starts in a set of games
 * @param {Array} games - Array of game objects
 * @returns {number} - Count of quality starts
 */
export const countQualityStarts = (games) => {
  return games.filter(g => 
    g.quality_start || (g.innings_pitched >= 6 && g.earned_runs <= 3)
  ).length;
};

// ============================================================================
// FORM STATUS CALCULATION
// ============================================================================

/**
 * Determine form status (hot/cold) for batters
 * @param {object} recentStats - Recent rolling stats (L7)
 * @param {object} seasonStats - Season baseline stats
 * @returns {string} - Form status: 'hot', 'warming', 'neutral', 'cooling', 'cold'
 */
export const calculateBatterFormStatus = (recentStats, seasonStats) => {
  if (!recentStats || !seasonStats || seasonStats.avg <= 0) {
    return 'neutral';
  }
  
  const avgDiff = ((recentStats.avg - seasonStats.avg) / seasonStats.avg) * 100;
  
  if (avgDiff >= 15) return 'hot';
  if (avgDiff <= -15) return 'cold';
  if (avgDiff >= 5) return 'warming';
  if (avgDiff <= -5) return 'cooling';
  return 'neutral';
};

/**
 * Determine form status (hot/cold) for pitchers
 * For ERA, lower is better, so comparison is inverted
 * @param {object} recentStats - Recent rolling stats (L5)
 * @param {object} seasonStats - Season baseline stats
 * @returns {string} - Form status: 'hot', 'warming', 'neutral', 'cooling', 'cold'
 */
export const calculatePitcherFormStatus = (recentStats, seasonStats) => {
  if (!recentStats || !seasonStats || seasonStats.era <= 0) {
    return 'neutral';
  }
  
  // For ERA, lower is better, so we invert the comparison
  const eraDiff = ((seasonStats.era - recentStats.era) / seasonStats.era) * 100;
  
  if (eraDiff >= 20) return 'hot'; // ERA much lower than season avg
  if (eraDiff <= -20) return 'cold'; // ERA much higher than season avg
  if (eraDiff >= 10) return 'warming';
  if (eraDiff <= -10) return 'cooling';
  return 'neutral';
};

// ============================================================================
// SEASON BASELINE FROM API STATS
// ============================================================================

/**
 * Build season baseline for batters from API season stats
 * Used when viewing postseason/spring training to compare against regular season
 * @param {object} seasonStats - Season stats from API
 * @returns {object} - Normalized baseline stats
 */
export const buildBatterSeasonBaseline = (seasonStats) => {
  if (!seasonStats) return null;
  
  const g = seasonStats.g || seasonStats.games_played || 0;
  const atBats = seasonStats.ab || seasonStats.at_bats || 0;
  const hits = seasonStats.h || seasonStats.hits || 0;
  const homeRuns = seasonStats.hr || seasonStats.home_runs || 0;
  const rbis = seasonStats.rbis || seasonStats.rbi || 0;
  const walks = seasonStats.bb || seasonStats.walks || seasonStats.base_on_balls || 0;
  const strikeouts = seasonStats.so || seasonStats.strikeouts || seasonStats.strike_outs || 0;
  const avg = seasonStats.avg || seasonStats.batting_avg || 0;
  const ops = seasonStats.ops || 0;
  
  return {
    games: g,
    atBats,
    hits,
    homeRuns,
    rbis,
    runs: seasonStats.r || seasonStats.runs || 0,
    walks,
    strikeouts,
    stolenBases: seasonStats.sb || seasonStats.stolen_bases || 0,
    totalBases: seasonStats.tb || seasonStats.total_bases || 0,
    avg,
    ops,
    obp: seasonStats.obp || 0,
    slg: seasonStats.slg || 0,
    hitsPerGame: g > 0 ? hits / g : 0,
    hrPerGame: g > 0 ? homeRuns / g : 0,
    rbisPerGame: g > 0 ? rbis / g : 0,
    isRegularSeasonBaseline: true,
  };
};

/**
 * Build season baseline for pitchers from API season stats
 * @param {object} seasonStats - Season stats from API
 * @returns {object} - Normalized baseline stats
 */
export const buildPitcherSeasonBaseline = (seasonStats) => {
  if (!seasonStats) return null;
  
  const gs = seasonStats.games_started || seasonStats.gs || 0;
  const ip = seasonStats.innings_pitched || seasonStats.ip || 0;
  const era = seasonStats.era || 0;
  const whip = seasonStats.whip || 0;
  const strikeouts = seasonStats.strikeouts || seasonStats.so || 0;
  const walks = seasonStats.walks || seasonStats.bb || 0;
  
  return {
    games: gs,
    inningsPitched: ip,
    strikeouts,
    walks,
    earnedRuns: seasonStats.earned_runs_allowed || 0,
    hitsAllowed: seasonStats.hits_allowed || 0,
    homeRunsAllowed: seasonStats.home_runs_allowed || 0,
    wins: seasonStats.wins || 0,
    losses: seasonStats.losses || 0,
    era,
    whip,
    kPer9: seasonStats.k_per_9 || 0,
    bbPer9: seasonStats.bb_per_9 || 0,
    kPerGame: gs > 0 ? strikeouts / gs : 0,
    ipPerGame: gs > 0 ? ip / gs : 0,
    inningsDisplay: seasonStats.innings_display ?? null, // API box-score IP when present
    isRegularSeasonBaseline: true,
  };
};

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate complete recent form stats from game logs
 * Main entry point for recent form calculations
 * @param {object} params - Parameters object
 * @param {Array} params.gameLog - Batting game log (or main game log for non-TWP)
 * @param {Array} params.pitchingGameLog - Pitching game log (for TWP)
 * @param {string} params.seasonType - 'R', 'S', or 'P'
 * @param {object} params.seasonStats - Season stats from API
 * @param {boolean} params.showPitchingStats - Whether showing pitching stats
 * @param {object} params.playerInfo - Player info object
 * @returns {object|null} - Complete recent form stats object
 */
export const calculateRecentFormStats = ({
  gameLog,
  pitchingGameLog,
  seasonType,
  seasonStats,
  showPitchingStats,
  playerInfo,
}) => {
  // Determine if this is a true TWP
  const pos = playerInfo?.position_abbreviation || playerInfo?.position || playerInfo?.primary_position;
  const isTruelyTwoWay = pos === 'TWP' || pos === 'Two-Way Player';
  
  // Choose appropriate game log based on toggle mode
  const activeGameLog = showPitchingStats && isTruelyTwoWay ? pitchingGameLog : gameLog;
  
  if (!activeGameLog || activeGameLog.length === 0) {
    return null;
  }
  
  // Sort games by date (most recent first)
  const sortedGames = [...activeGameLog].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // ========== PITCHER STATS ==========
  if (showPitchingStats) {
    const l5 = calculatePitcherRollingStats(sortedGames.slice(0, 5));
    const l10 = calculatePitcherRollingStats(sortedGames.slice(0, 10));
    const l30 = calculatePitcherRollingStats(sortedGames.slice(0, 30));
    
    // Season baseline
    let season = null;
    if (seasonType === 'R' || seasonType === 'S') {
      season = calculatePitcherRollingStats(sortedGames);
    } else if (seasonStats) {
      season = buildPitcherSeasonBaseline(seasonStats);
    }

    const qualityStartStreak = calculateQualityStartStreak(sortedGames);
    const qualityStartsL10 = countQualityStarts(sortedGames.slice(0, 10));
    const formStatus = calculatePitcherFormStatus(l5, season);

    return {
      l5,
      l10,
      l30,
      season,
      qualityStartStreak,
      qualityStartsL10,
      formStatus,
      gamesPlayed: sortedGames.length,
      lastGameDate: sortedGames[0]?.date,
      isPostseasonView: seasonType === 'P',
      isSpringView: seasonType === 'S',
      isPitcher: true,
    };
  }
  
  // ========== BATTER STATS ==========
  const l7 = calculateBatterRollingStats(sortedGames.slice(0, 7));
  const l15 = calculateBatterRollingStats(sortedGames.slice(0, 15));
  const l30 = calculateBatterRollingStats(sortedGames.slice(0, 30));
  
  // Season baseline
  let season = null;
  if (seasonType === 'R' || seasonType === 'S') {
    season = calculateBatterRollingStats(sortedGames);
  } else if (seasonStats) {
    season = buildBatterSeasonBaseline(seasonStats);
  }

  const hittingStreak = calculateHittingStreak(sortedGames);
  const multiHitStreak = calculateMultiHitStreak(sortedGames);
  const multiHitGamesL15 = countMultiHitGames(sortedGames.slice(0, 15));
  const formStatus = calculateBatterFormStatus(l7, season);

  return {
    l7,
    l15,
    l30,
    season,
    hittingStreak,
    multiHitStreak,
    multiHitGamesL15,
    formStatus,
    gamesPlayed: sortedGames.length,
    lastGameDate: sortedGames[0]?.date,
    isPostseasonView: seasonType === 'P',
    isSpringView: seasonType === 'S',
    isPitcher: false,
  };
};
