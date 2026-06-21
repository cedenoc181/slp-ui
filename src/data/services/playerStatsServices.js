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

  /**
   * Look up a player by internal ID, MLB ID, or full name
   * Returns player's id, mlb_id, full_name, and current team_id
   * Priority: player_id > mlb_id > full_name (uses first provided parameter)
   * @param {Object} params - Lookup parameters
   * @param {number} [params.playerId] - Internal player ID
   * @param {number} [params.mlbId] - MLB player ID
   * @param {string} [params.fullName] - Player full name (case-insensitive)
   * @returns {Promise<Object|null>} Player lookup result or null if not found
   */
  async lookupPlayer({ playerId, mlbId, fullName }) {
    const params = new URLSearchParams();
    if (playerId) params.append('player_id', playerId);
    else if (mlbId) params.append('mlb_id', mlbId);
    else if (fullName) params.append('full_name', fullName);
    else return null;
    
    try {
      return await api.get(`/players/lookup?${params.toString()}`);
    } catch (error) {
      // Return null if player not found (404)
      if (error.message?.includes('404')) return null;
      throw error;
    }
  }

  /**
   * Search players by name or MLB ID (for search bar autocomplete)
   * Uses partial name matching for better autocomplete experience
   * @param {string} query - Search query (player name or MLB ID)
   * @param {number} limit - Maximum number of results (default 10)
   * @returns {Promise<Array>} Array of matching players with id, mlb_id, full_name, team_id
   */
  async searchPlayers(query, limit = 10) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const trimmedQuery = query.trim();
    
    // Check if query is a numeric ID (MLB ID or player ID)
    const isNumericId = /^\d+$/.test(trimmedQuery);
    
    try {
      if (isNumericId) {
        // For numeric IDs, use the lookup endpoint for exact match
        const numId = parseInt(trimmedQuery, 10);
        let result = null;
        
        // Try MLB ID first (5-7 digits typically), then internal player ID
        if (numId >= 100000) {
          result = await this.lookupPlayer({ mlbId: numId });
        } else {
          // Try as internal player ID first, then MLB ID
          result = await this.lookupPlayer({ playerId: numId });
          if (!result) {
            result = await this.lookupPlayer({ mlbId: numId });
          }
        }
        
        // Wrap single result in array for consistency
        return result ? [result] : [];
      } else {
        // For name searches, use the search endpoint with partial matching
        const encodedQuery = encodeURIComponent(trimmedQuery);
        return await api.get(`/players/search?q=${encodedQuery}&limit=${limit}`);
      }
    } catch (error) {
      console.error('Error searching players:', error);
      return [];
    }
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

  /**
   * Get pitcher career totals for home vs road splits
   * Sums counting stats (W, L, GS, IP, K, BB) and averages rate stats (ERA, WHIP, AVG, OPS) across all regular seasons
   * @param {number} playerId - Internal player ID
   * @returns {Promise<Object>} Career totals for at_home and on_road stats
   */
  async getPitcherHomeRoadSplitsCareerTotals(playerId) {
    return await api.get(`/player-profile/${playerId}/pitcher/home-road-splits-career-totals`);
  }

  /**
   * Get pitcher career totals for splits vs left-handed and right-handed batters
   * Sums counting stats (TB, RBI, GDP) and averages rate stats (AVG, OPS, WHIP, K/9) across all regular seasons
   * @param {number} playerId - Internal player ID
   * @returns {Promise<Object>} Career totals for vs_lhb and vs_rhb stats
   */
  async getPitcherVsHandSplitsCareerTotals(playerId) {
    return await api.get(`/player-profile/${playerId}/pitcher/vs-hand-splits-career-totals`);
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
