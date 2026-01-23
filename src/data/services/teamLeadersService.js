import api from './apiService';
import { SEASON_TYPES, PLAYER_ROLES, DEFAULT_SEASON } from '../constants/apiConstants';

class TeamLeadersService {
  // ========== TEAM BATTING/PITCHING LEADERS ==========
  
  /**
   * Get team batting leaders
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} Batting leaders
   */
  async getTeamBattingLeaders(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/batting?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get team pitching leaders
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} Pitching leaders
   */
  async getTeamPitchingLeaders(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/pitching?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  // ========== TOP LEADERS (Team-specific) ==========
  
  /**
   * Get top batting leaders for a specific team
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Array>} Top team batting leaders
   */
  async getTopTeamBattingLeaders(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/batting/team/top?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get top pitching leaders for a specific team
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Array>} Top team pitching leaders
   */
  async getTopTeamPitchingLeaders(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/pitching/team/top?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  // ========== HOT LEADERS (Team-specific) ==========
  
  /**
   * Get hot batting leaders for a specific team
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Array>} Hot team batting leaders
   */
  async getHotTeamBattingLeaders(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/batting/hot/team?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get hot pitching leaders for a specific team
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Array>} Hot team pitching leaders
   */
  async getHotTeamPitchingLeaders(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/pitching/hot/team?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
  }

  // ========== TEAM SPLITS ==========
  
  /**
   * Get team performance splits (home/away, vs LHP/RHP, etc.)
   * @param {number} teamId - Team ID (1-30)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @param {string} role - 'batters' or 'pitcher'
   * @returns {Promise<Object>} Team splits data
   */
  async getTeamSplits(teamId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR, role = PLAYER_ROLES.BATTER) {
    return await api.get(`/teams/leaders/splits/team?team_id=${teamId}&season=${season}&season_type=${seasonType}&role=${role}`);
  }
}

export default new TeamLeadersService();