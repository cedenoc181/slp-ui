import api from './apiService';
import { DEFAULT_SEASON } from '../constants/apiConstants';

class InjuryService {
  /**
   * Get team injuries for the first half of the season
   * First half: Feb 1 to All-Star break (~July 15)
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team injuries for first half
   */
  async getTeamInjuriesFirstHalf(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/players/injuries/team/first-half?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get team injuries for the second half of the season
   * Second half: After All-Star break (July 16) to end of regular season (~Sept 30)
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team injuries for second half
   */
  async getTeamInjuriesSecondHalf(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/players/injuries/team/second-half?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get team injuries for the full season
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team injuries for full season
   */
  async getTeamInjuriesFullSeason(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/players/injuries/team/full-season?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get team's current IL (Injured List)
   * Returns players currently on the injured list (without an activation date)
   * @param {number} teamId - Team ID (1-30)
   * @returns {Promise<Object>} Current IL roster
   */
  async getTeamCurrentInjuries(teamId) {
    return await api.get(`/players/injuries/team/current?team_id=${teamId}`);
  }

  /**
   * Get injury history for a specific player
   * @param {number} playerId - Player ID
   * @param {string} season - Season year (optional)
   * @returns {Promise<Object>} Player injury history
   */
  async getPlayerInjuryHistory(playerId, season = null) {
    let url = `/players/injuries/player?player_id=${playerId}`;
    if (season) {
      url += `&season=${season}`;
    }
    return await api.get(url);
  }

  /**
   * Get league-wide injury summary by team
   * Includes total injuries, days lost, and current IL count per team
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Injury summary for all teams
   */
  async getInjurySummary(season = DEFAULT_SEASON) {
    return await api.get(`/players/injuries/summary?season=${season}`);
  }

  /**
   * Get team injuries with custom date range
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {Object} options - Optional parameters
   * @param {string} options.startDate - Start date (YYYY-MM-DD)
   * @param {string} options.endDate - End date (YYYY-MM-DD)
   * @param {boolean} options.onlyActive - Only return players currently on IL
   * @returns {Promise<Object>} Team injuries for custom date range
   */
  async getTeamInjuriesCustomRange(teamId, season = DEFAULT_SEASON, options = {}) {
    let url = `/players/injuries/team?team_id=${teamId}&season=${season}`;
    
    if (options.startDate) {
      url += `&start_date=${options.startDate}`;
    }
    if (options.endDate) {
      url += `&end_date=${options.endDate}`;
    }
    if (options.onlyActive) {
      url += `&only_active=true`;
    }
    
    return await api.get(url);
  }

  /**
   * Helper: Get injuries by period
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} period - 'first-half', 'second-half', 'full-season', or 'current'
   * @returns {Promise<Object>} Team injuries for specified period
   */
  async getTeamInjuriesByPeriod(teamId, season = DEFAULT_SEASON, period = 'full-season') {
    switch (period) {
      case 'first-half':
        return await this.getTeamInjuriesFirstHalf(teamId, season);
      case 'second-half':
        return await this.getTeamInjuriesSecondHalf(teamId, season);
      case 'current':
        return await this.getTeamCurrentInjuries(teamId);
      case 'full-season':
      default:
        return await this.getTeamInjuriesFullSeason(teamId, season);
    }
  }
}

export default new InjuryService();
