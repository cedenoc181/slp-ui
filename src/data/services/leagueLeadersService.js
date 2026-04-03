import api from './apiService';
import { SEASON_TYPES, PLAYER_ROLES, DEFAULT_SEASON } from '../constants/apiConstants';

class LeagueLeadersService {
  // ========== LEAGUE LEADERS (New Endpoints) ==========

  /**
   * Get league-wide batting leaders
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} League batting leaders
   */
  async getLeagueBattingLeaders(season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/batting/league?season=${season}&season_type=${seasonType}`);
  }

  /**
   * Get league-wide pitching leaders
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R', 'P', or 'S'
   * @returns {Promise<Object>} League pitching leaders
   */
  async getLeaguePitchingLeaders(season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR) {
    return await api.get(`/teams/leaders/pitching/league?season=${season}&season_type=${seasonType}`);
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

  // ========== LEAGUE SPLITS ==========
  
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

const leagueLeadersService = new LeagueLeadersService();
export default leagueLeadersService;
