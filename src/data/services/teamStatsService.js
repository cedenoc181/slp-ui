import api from './apiService';
import { SEASON_TYPES, STAT_CATEGORIES, DEFAULT_SEASON } from '../constants/apiConstants';

class TeamStatsService {
  /**
   * Get team batting stats, with vs left and vs right splits
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} Batting statistics
   */
  async getTeamBattingStats(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/stats/batting?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get team pitching stats, with vs left and vs right splits
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} Pitching statistics
   */
  async getTeamPitchingStats(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/stats/pitching?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get team stats by category (batting or pitching)
   * @param {number} teamId - Team ID (1-30)
   * @param {string} category - 'batting' or 'pitching'
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} Team statistics
   */
  async getTeamStats(teamId, category = STAT_CATEGORIES.BATTING, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/stats/${category}?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get team batting home vs road splits
   * @param {number} teamId - Team ID
   * @param {string} season - Season year (e.g., '2026')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} Home and road batting splits
   */
  async getTeamBattingHomeVsRoad(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/stats/batting/home-vs-road?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get team pitching home vs road splits
   * @param {number} teamId - Team ID
   * @param {string} season - Season year (e.g., '2026')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} Home and road pitching splits
   */
  async getTeamPitchingHomeVsRoad(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/stats/pitching/home-vs-road?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }
}

export default new TeamStatsService();