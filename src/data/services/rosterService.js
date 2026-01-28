import api from './apiService';
import { DEFAULT_SEASON } from '../constants/apiConstants';

class RosterService {
  /**
   * Get team roster grouped by position type
   * Returns: { team_id, team_name, team_abbreviation, season, total_players, pitchers, catchers, infielders, outfielders }
   * @param {number} teamId - Team database ID
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team roster grouped by position
   */
  async getTeamRoster(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/rosters/team?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get team roster by MLB team ID grouped by position type
   * @param {number} mlbTeamId - MLB team ID (e.g., 121 for Mets)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team roster grouped by position
   */
  async getTeamRosterByMlbId(mlbTeamId, season = DEFAULT_SEASON) {
    return await api.get(`/rosters/team/mlb?mlb_team_id=${mlbTeamId}&season=${season}`);
  }

  /**
   * Get team roster filtered by position type
   * @param {number} teamId - Team database ID
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} positionType - Position type: 'Pitcher', 'Catcher', 'Infielder', 'Outfielder'
   * @returns {Promise<Array>} Roster entries for the position type
   */
  async getTeamRosterByPosition(teamId, season = DEFAULT_SEASON, positionType) {
    return await api.get(`/rosters/team/position?team_id=${teamId}&season=${season}&position_type=${positionType}`);
  }

  /**
   * Get player roster history
   * @param {number} playerId - Player database ID
   * @param {string} season - Optional season filter
   * @returns {Promise<Object>} Player roster history with seasons array
   */
  async getPlayerRosterHistory(playerId, season = null) {
    let url = `/rosters/player?player_id=${playerId}`;
    if (season) {
      url += `&season=${season}`;
    }
    return await api.get(url);
  }

  /**
   * Get player roster history by MLB player ID
   * @param {number} playerMlbId - MLB player ID
   * @param {string} season - Optional season filter
   * @returns {Promise<Object>} Player roster history with seasons array
   */
  async getPlayerRosterHistoryByMlbId(playerMlbId, season = null) {
    let url = `/rosters/player/mlb?player_mlb_id=${playerMlbId}`;
    if (season) {
      url += `&season=${season}`;
    }
    return await api.get(url);
  }

  /**
   * Helper: Get all players as flat array from grouped roster
   * @param {Object} rosterData - Grouped roster data from API
   * @returns {Array} Flat array of all players
   */
  getAllPlayersFlat(rosterData) {
    if (!rosterData) return [];
    return [
      ...(rosterData.pitchers || []),
      ...(rosterData.catchers || []),
      ...(rosterData.infielders || []),
      ...(rosterData.outfielders || [])
    ];
  }

  /**
   * Helper: Get position players (non-pitchers) as flat array
   * @param {Object} rosterData - Grouped roster data from API
   * @returns {Array} Flat array of position players
   */
  getPositionPlayersFlat(rosterData) {
    if (!rosterData) return [];
    return [
      ...(rosterData.catchers || []),
      ...(rosterData.infielders || []),
      ...(rosterData.outfielders || [])
    ];
  }
}

export default new RosterService();