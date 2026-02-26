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
   * @param {string} seasonType - 'R' (regular), 'S' (spring training), 'P' (postseason)
   * @returns {Promise<Array>} Last 10 games
   */
  async getTeamLast10(teamId, season = DEFAULT_SEASON, seasonType = 'R') {
    return await api.get(`/games/team/last10?team_id=${teamId}&season=${season}&season_type=${seasonType}`);
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

  /**
   * Get head-to-head matchup history between two teams
   * @param {number} teamAId - Internal team ID for team A (1-30)
   * @param {number} teamBId - Internal team ID for team B (1-30)
   * @param {string|null} season - Season year (e.g., '2025'), null for all seasons
   * @param {string|null} seasonType - 'R' (Regular), 'S' (Spring), 'P' (Postseason), null for all
   * @param {number} limit - Max games to return (default 10)
   * @returns {Promise<Array>} Head-to-head game history
   */
  async getHeadToHead(teamAId, teamBId, { season = null, seasonType = null, limit = 10 } = {}) {
    const params = new URLSearchParams();
    params.append('team_a_id', teamAId);
    params.append('team_b_id', teamBId);
    if (season) params.append('season', season);
    if (seasonType) params.append('season_type', seasonType);
    if (limit) params.append('limit', limit);
    return await api.get(`/games/head-to-head?${params.toString()}`);
  }

  /**
   * Get head-to-head batter game logs between two teams
   * @param {number} teamAId - Internal team ID for team A (1-30)
   * @param {number} teamBId - Internal team ID for team B (1-30)
   * @param {string|null} season - Season year (e.g., '2025'), null for all seasons
   * @param {string|null} seasonType - 'R' (Regular), 'S' (Spring), 'P' (Postseason), null for all
   * @param {number} limit - Number of most recent matchups to pull logs from (default 10)
   * @returns {Promise<Array>} Head-to-head batter logs
   */
  async getHeadToHeadBatters(teamAId, teamBId, { season = null, seasonType = null, limit = 10 } = {}) {
    const params = new URLSearchParams();
    params.append('team_a_id', teamAId);
    params.append('team_b_id', teamBId);
    if (season) params.append('season', season);
    if (seasonType) params.append('season_type', seasonType);
    if (limit) params.append('limit', limit);
    return await api.get(`/games/head-to-head/batters?${params.toString()}`);
  }

  /**
   * Get head-to-head pitcher game logs between two teams
   * @param {number} teamAId - Internal team ID for team A (1-30)
   * @param {number} teamBId - Internal team ID for team B (1-30)
   * @param {string|null} season - Season year (e.g., '2025'), null for all seasons
   * @param {string|null} seasonType - 'R' (Regular), 'S' (Spring), 'P' (Postseason), null for all
   * @param {number} limit - Number of most recent matchups to pull logs from (default 10)
   * @returns {Promise<Array>} Head-to-head pitcher logs
   */
  async getHeadToHeadPitchers(teamAId, teamBId, { season = null, seasonType = null, limit = 10 } = {}) {
    const params = new URLSearchParams();
    params.append('team_a_id', teamAId);
    params.append('team_b_id', teamBId);
    if (season) params.append('season', season);
    if (seasonType) params.append('season_type', seasonType);
    if (limit) params.append('limit', limit);
    return await api.get(`/games/head-to-head/pitchers?${params.toString()}`);
  }
}

const gamesService = new GamesService();
export default gamesService;