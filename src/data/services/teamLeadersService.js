import api from './apiService';
import { SEASON_TYPES, PLAYER_ROLES, DEFAULT_SEASON } from '../constants/apiConstants';

class TeamLeadersService {
  // ========== BASIC LEADERS ==========
  
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

  // ========== TOP LEADERS (League-wide) ==========
  
  /**
   * Get top batting leaders across MLB
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Array>} Top MLB batting leaders
   */
  async getTopBattingLeaders(season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/batting/top?season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get top pitching leaders across MLB
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Array>} Top MLB pitching leaders
   */
  async getTopPitchingLeaders(season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/pitching/top?season=${season}&season_type=${seasonType}`);
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

  // ========== HOT LEADERS (League-wide) ==========
  
  /**
   * Get hot batting leaders across MLB (recent performance)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Array>} Hot MLB batting leaders
   */
  async getHotBattingLeaders(season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/batting/hot?season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get hot pitching leaders across MLB (recent performance)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Array>} Hot MLB pitching leaders
   */
  async getHotPitchingLeaders(season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/pitching/hot?season=${season}&season_type=${seasonType}`);
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

  // ========== SPLITS ==========
  
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

  /**
   * Get league-wide performance splits
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @param {string} role - 'batters' or 'pitcher'
   * @returns {Promise<Object>} League splits data
   */
  async getLeagueSplits(season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR, role = PLAYER_ROLES.BATTER) {
    return await api.get(`/teams/leaders/splits/league?season=${season}&season_type=${seasonType}&role=${role}`);
  }
}

export default new TeamLeadersService();