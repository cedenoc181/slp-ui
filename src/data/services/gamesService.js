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

  /**
   * Get game-by-game batting logs for a player
   * Returns batting stats with game context (date, opponent, score, home/away)
   * @param {number} playerId - Internal player ID (players.id)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R' (Regular), 'S' (Spring Training), 'P' (Postseason)
   * @param {number} limit - Max games to return (default 162)
   * @returns {Promise<Array>} Batter game logs
   */
  async getBatterGameLogs(playerId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR, limit = 162) {
    const params = new URLSearchParams();
    params.append('player_id', playerId);
    if (season) params.append('season', season);
    if (seasonType) params.append('season_type', seasonType);
    if (limit) params.append('limit', limit);
    return await api.get(`/games/batter?${params.toString()}`);
  }

  /**
   * Get game-by-game pitching logs for a player
   * Returns pitching stats with game context (date, opponent, score, home/away)
   * @param {number} playerId - Internal player ID (players.id)
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} seasonType - 'R' (Regular), 'S' (Spring Training), 'P' (Postseason)
   * @param {number} limit - Max games to return (default 50)
   * @returns {Promise<Array>} Pitcher game logs
   */
  async getPitcherGameLogs(playerId, season = DEFAULT_SEASON, seasonType = SEASON_TYPES.REGULAR, limit = 162) {
    const params = new URLSearchParams();
    params.append('player_id', playerId);
    if (season) params.append('season', season);
    if (seasonType) params.append('season_type', seasonType);
    if (limit) params.append('limit', limit);
    return await api.get(`/games/pitcher?${params.toString()}`);
  }
}

export default new GamesService();