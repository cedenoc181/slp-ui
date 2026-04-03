import api from './apiService';
import { DEFAULT_SEASON } from '../constants/apiConstants';

class TeamsService {
  /**
   * Get team season overview
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team season data
   */
  async getTeamSeason(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/teams/season?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get team monthly performance breakdown
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Array>} Monthly performance data
   */
  async getTeamMonthly(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/teams/monthly?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get regular season standings for all teams
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team standings data grouped by division
   */
  async getTeamRegularSeasonStandings(season = DEFAULT_SEASON) {
    return await api.get(`/teams/standings?season=${season}`);
  }

  /**
   * Get spring training standings for all teams
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Spring training standings data
   */
  async getTeamSpringTrainingStandings(season = DEFAULT_SEASON) {
    return await api.get(`/teams/standings/spring?season=${season}`);
  }

  /**
   * Get postseason bracket for all teams
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Postseason bracket data
   */
  async getTeamPostseasonBracket(season = DEFAULT_SEASON) {
    return await api.get(`/teams/standings/postseason?season=${season}`);
  }
}

const teamsService = new TeamsService();
export default teamsService;