import api from './apiService';
import { SEASON_TYPES, DEFAULT_SEASON } from '../constants/apiConstants';

/**
 * Player Profile Stats Service
 * Handles all API calls for individual player profile data including
 * player info, career stats, current season stats, splits, and monthly performance.
 */
class PlayerStatsService {
  // ============================================================================
  // PLAYER INFO ENDPOINTS
  // ============================================================================

  /**
   * Get basic player information by internal player ID
   * @param {number} playerId - Internal player ID
   * @returns {Promise<Object>} Player info (team, jersey, position, injury status, bats/throws, active seasons)
   */
  async getPlayerInfo(playerId) {
    return await api.get(`/player-profile/${playerId}/info`);
  }

  /**
   * Get basic player information by MLB player ID (external)
   * @param {number} playerMlbId - MLB's player ID (e.g., 660271 for Ohtani)
   * @returns {Promise<Object>} Player info
   */
  async getPlayerInfoByMlbId(playerMlbId) {
    return await api.get(`/player-profile/mlb/${playerMlbId}/info`);
  }

  // ============================================================================
  // BATTER STATS ENDPOINTS
  // ============================================================================

  /**
   * Get batter career stats across all seasons
   * @param {number} playerId - Internal player ID
   * @param {string} seasonType - Season type: 'R' (regular), 'S' (spring), 'P' (postseason)
   * @returns {Promise<Array>} List of season stats ordered by most recent
   */
  async getBatterCareerStats(playerId, seasonType = null) {
    const params = seasonType ? `?season_type=${seasonType}` : '';
    return await api.get(`/player-profile/${playerId}/batter/career-stats${params}`);
  }

  /**
   * Get batter career totals - aggregated stats across all seasons
   * @param {number} playerId - Internal player ID
   * @param {string} seasonType - Season type: 'R' (regular), 'S' (spring), 'P' (postseason)
   * @returns {Promise<Object>} Single object with summed counting stats and calculated rate stats
   */
  async getBatterCareerTotals(playerId, seasonType = null) {
    const params = seasonType ? `?season_type=${seasonType}` : '';
    return await api.get(`/player-profile/${playerId}/batter/career-totals${params}`);
  }

  /**
   * Get batter stats for current or specified season
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (defaults to current year if omitted)
   * @param {string} seasonType - Season type: 'R', 'S', or 'P'
   * @returns {Promise<Object>} Single season stats with team info
   */
  async getBatterCurrentStats(playerId, season = null, seasonType = SEASON_TYPES.REGULAR) {
    const params = new URLSearchParams();
    if (season) params.append('season', season);
    params.append('season_type', seasonType);
    const queryString = params.toString();
    return await api.get(`/player-profile/${playerId}/batter/current-stats?${queryString}`);
  }

  /**
   * Get batter splits vs left-handed and right-handed pitchers
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (omit for all seasons)
   * @param {string} seasonType - Season type: 'R', 'S', or 'P'
   * @returns {Promise<Array>} vs_lhp and vs_rhp stats (AVG, OPS, HR, RBI, etc.)
   */
  async getBatterVsHandSplits(playerId, season = null, seasonType = SEASON_TYPES.REGULAR) {
    const params = new URLSearchParams();
    if (season) params.append('season', season);
    params.append('season_type', seasonType);
    const queryString = params.toString();
    return await api.get(`/player-profile/${playerId}/batter/vs-hand-splits?${queryString}`);
  }

  /**
   * Get batter splits for home games vs road games
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (omit for all seasons)
   * @param {string} seasonType - Season type: 'R', 'S', or 'P'
   * @returns {Promise<Array>} at_home and on_road stats (AVG, OPS, HR, RBI, SB, etc.)
   */
  async getBatterHomeRoadSplits(playerId, season = null, seasonType = SEASON_TYPES.REGULAR) {
    const params = new URLSearchParams();
    if (season) params.append('season', season);
    params.append('season_type', seasonType);
    const queryString = params.toString();
    return await api.get(`/player-profile/${playerId}/batter/home-road-splits?${queryString}`);
  }

  /**
   * Get batter career totals for home vs road splits
   * Sums counting stats across all regular seasons
   * @param {number} playerId - Internal player ID
   * @returns {Promise<Object>} Career totals for at_home and on_road stats
   */
  async getBatterHomeRoadSplitsCareerTotals(playerId) {
    return await api.get(`/player-profile/${playerId}/batter/home-road-splits-career-totals`);
  }

  /**
   * Get batter career totals for splits vs left-handed and right-handed pitchers
   * Sums counting stats across all regular seasons
   * @param {number} playerId - Internal player ID
   * @returns {Promise<Object>} Career totals for vs_lhp and vs_rhp stats
   */
  async getBatterVsHandSplitsCareerTotals(playerId) {
    return await api.get(`/player-profile/${playerId}/batter/vs-hand-splits-career-totals`);
  }

  // ============================================================================
  // PITCHER STATS ENDPOINTS
  // ============================================================================

  /**
   * Get pitcher career stats across all seasons
   * @param {number} playerId - Internal player ID
   * @param {string} seasonType - Season type: 'R' (regular), 'S' (spring), 'P' (postseason)
   * @returns {Promise<Array>} List of season stats (W, L, ERA, WHIP, K, IP, etc.) ordered by most recent
   */
  async getPitcherCareerStats(playerId, seasonType = null) {
    const params = seasonType ? `?season_type=${seasonType}` : '';
    return await api.get(`/player-profile/${playerId}/pitcher/career-stats${params}`);
  }

  /**
   * Get pitcher career totals - aggregated stats across all seasons
   * @param {number} playerId - Internal player ID
   * @param {string} seasonType - Season type: 'R' (regular), 'S' (spring), 'P' (postseason)
   * @returns {Promise<Object>} Single object with summed counting stats and calculated rate stats (ERA, WHIP, K/9, etc.)
   */
  async getPitcherCareerTotals(playerId, seasonType = null) {
    const params = seasonType ? `?season_type=${seasonType}` : '';
    return await api.get(`/player-profile/${playerId}/pitcher/career-totals${params}`);
  }

  /**
   * Get pitcher stats for current or specified season
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (defaults to current year if omitted)
   * @param {string} seasonType - Season type: 'R', 'S', or 'P'
   * @returns {Promise<Object>} Single season stats with team info
   */
  async getPitcherCurrentStats(playerId, season = null, seasonType = SEASON_TYPES.REGULAR) {
    const params = new URLSearchParams();
    if (season) params.append('season', season);
    params.append('season_type', seasonType);
    const queryString = params.toString();
    return await api.get(`/player-profile/${playerId}/pitcher/current-stats?${queryString}`);
  }

  /**
   * Get pitcher splits vs left-handed and right-handed batters
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (omit for all seasons)
   * @param {string} seasonType - Season type: 'R', 'S', or 'P'
   * @returns {Promise<Array>} vs_lhb and vs_rhb stats (AVG, OPS, WHIP, K/9, etc.)
   */
  async getPitcherVsHandSplits(playerId, season = null, seasonType = SEASON_TYPES.REGULAR) {
    const params = new URLSearchParams();
    if (season) params.append('season', season);
    params.append('season_type', seasonType);
    const queryString = params.toString();
    return await api.get(`/player-profile/${playerId}/pitcher/vs-hand-splits?${queryString}`);
  }

  /**
   * Get pitcher splits for home games vs road games
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (omit for all seasons)
   * @param {string} seasonType - Season type: 'R', 'S', or 'P'
   * @returns {Promise<Array>} at_home and on_road stats (ERA, WHIP, W, L, K, IP, etc.)
   */
  async getPitcherHomeRoadSplits(playerId, season = null, seasonType = SEASON_TYPES.REGULAR) {
    const params = new URLSearchParams();
    if (season) params.append('season', season);
    params.append('season_type', seasonType);
    const queryString = params.toString();
    return await api.get(`/player-profile/${playerId}/pitcher/home-road-splits?${queryString}`);
  }

  // ============================================================================
  // MONTHLY PERFORMANCE ENDPOINTS
  // ============================================================================

  /**
   * Get batter monthly performance stats for a season
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (required)
   * @returns {Promise<Object>} Monthly batting stats (hits, HR, avg, ops, walks, strikeouts by month)
   */
  async getBatterMonthlyPerformance(playerId, season) {
    return await api.get(`/player-profile/${playerId}/batter/monthly-performance?season=${season}`);
  }

  /**
   * Get pitcher monthly performance stats for a season
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (required)
   * @returns {Promise<Object>} Monthly pitching stats (IP, K, ERA, WHIP, walks, wins by month)
   */
  async getPitcherMonthlyPerformance(playerId, season) {
    return await api.get(`/player-profile/${playerId}/pitcher/monthly-performance?season=${season}`);
  }

  /**
   * Get player monthly performance (auto-detects batter/pitcher)
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year (required)
   * @returns {Promise<Object>} Monthly stats for batting and/or pitching (two-way players get both)
   */
  async getPlayerMonthlyPerformance(playerId, season) {
    return await api.get(`/player-profile/${playerId}/monthly-performance?season=${season}`);
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Get all player profile data for a season (combines multiple calls)
   * Useful for initial page load
   * @param {number} playerId - Internal player ID
   * @param {number} season - Season year
   * @param {string} playerType - 'batter', 'pitcher', or 'both'
   * @returns {Promise<Object>} Combined player data
   */
  async getFullPlayerProfile(playerId, season = DEFAULT_SEASON, playerType = 'batter') {
    const results = {
      info: null,
      currentStats: null,
      careerStats: null,
      vsHandSplits: null,
      homeRoadSplits: null,
      monthlyPerformance: null,
    };

    try {
      // Always fetch player info
      results.info = await this.getPlayerInfo(playerId);

      if (playerType === 'batter' || playerType === 'both') {
        const [currentStats, careerStats, vsHandSplits, homeRoadSplits, monthly] = await Promise.all([
          this.getBatterCurrentStats(playerId, season).catch(() => null),
          this.getBatterCareerStats(playerId, SEASON_TYPES.REGULAR).catch(() => []),
          this.getBatterVsHandSplits(playerId, season).catch(() => []),
          this.getBatterHomeRoadSplits(playerId, season).catch(() => []),
          this.getBatterMonthlyPerformance(playerId, season).catch(() => null),
        ]);
        
        results.currentStats = currentStats;
        results.careerStats = careerStats;
        results.vsHandSplits = vsHandSplits;
        results.homeRoadSplits = homeRoadSplits;
        results.monthlyPerformance = monthly;
      }

      if (playerType === 'pitcher' || playerType === 'both') {
        const [currentStats, careerStats, vsHandSplits, homeRoadSplits, monthly] = await Promise.all([
          this.getPitcherCurrentStats(playerId, season).catch(() => null),
          this.getPitcherCareerStats(playerId, SEASON_TYPES.REGULAR).catch(() => []),
          this.getPitcherVsHandSplits(playerId, season).catch(() => []),
          this.getPitcherHomeRoadSplits(playerId, season).catch(() => []),
          this.getPitcherMonthlyPerformance(playerId, season).catch(() => null),
        ]);

        // For two-way players, merge pitching stats
        if (playerType === 'both') {
          results.pitchingStats = {
            currentStats,
            careerStats,
            vsHandSplits,
            homeRoadSplits,
            monthlyPerformance: monthly,
          };
        } else {
          results.currentStats = currentStats;
          results.careerStats = careerStats;
          results.vsHandSplits = vsHandSplits;
          results.homeRoadSplits = homeRoadSplits;
          results.monthlyPerformance = monthly;
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching full player profile:', error);
      throw error;
    }
  }
}

// Export singleton instance
const playerStatsService = new PlayerStatsService();
export default playerStatsService;
