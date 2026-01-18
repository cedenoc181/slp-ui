import api from './apiService';
import { SEASON_TYPES, DEFAULT_SEASON } from '../constants/apiConstants';

class GamesService {
  /**
   * Get all games for a team in a season
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} Game data
   */
  async getTeamGames(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/games/team?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get last 10 games for a team
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Array>} Last 10 games
   */
  async getTeamLast10(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/games/team/last10?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get home games for a team
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Array>} Home games
   */
  async getTeamHomeGames(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/games/team/home?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get away games for a team
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Array>} Away games
   */
  async getTeamAwayGames(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/games/team/away?team_id=${teamId}&season=${season}`);
  }
}

export default new GamesService();