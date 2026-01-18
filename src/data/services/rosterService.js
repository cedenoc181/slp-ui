import api from './apiService';
import { PLAYER_ROLES, DEFAULT_SEASON } from '../constants/apiConstants';

class RosterService {
  /**
   * Get team roster
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} role - 'pitcher' or 'batters' (optional)
   * @returns {Promise<Array>} Team roster
   */
  async getTeamRoster(teamId, season = DEFAULT_SEASON, role = null) {
    let url = `/teams/roster?team_id=${teamId}&season=${season}`;
    if (role) {
      url += `&role=${role}`;
    }
    return await api.get(url);
  }

  /**
   * Get team pitchers only
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Array>} Team pitchers
   */
  async getTeamPitchers(teamId, season = DEFAULT_SEASON) {
    return await this.getTeamRoster(teamId, season, PLAYER_ROLES.PITCHER);
  }

  /**
   * Get team batters only
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Array>} Team batters
   */
  async getTeamBatters(teamId, season = DEFAULT_SEASON) {
    return await this.getTeamRoster(teamId, season, PLAYER_ROLES.BATTER);
  }
}

export default new RosterService();