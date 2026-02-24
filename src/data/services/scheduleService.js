import api from './apiService';

class ScheduleService {
  /**
   * Get all games scheduled for today.
   * Endpoint: GET /scheduled-games/today
   * @returns {Promise<Array>} List of today's games (GameLogSchema)
   */
  async getTodayGames() {
    return await api.get('/scheduled-games/today');
  }

  /**
   * Get completed games before today, most recent first.
   * Endpoint: GET /scheduled-games/prior?season=&season_type=&limit=
   * @param {object} opts
   * @param {string|number} [opts.season]      - Season year e.g. '2026'
   * @param {string}        [opts.seasonType]  - 'R', 'S', or 'P'
   * @param {number}        [opts.limit=50]    - Max games to return
   * @returns {Promise<Array>} List of prior games
   */
  async getPriorGames({ season, seasonType, limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (season)     params.append('season', season);
    if (seasonType) params.append('season_type', seasonType);
    if (limit)      params.append('limit', limit);
    const query = params.toString();
    return await api.get(`/scheduled-games/prior${query ? `?${query}` : ''}`);
  }

  /**
   * Get future games after today, earliest first.
   * Endpoint: GET /scheduled-games/upcoming?season=&season_type=&limit=
   * @param {object} opts
   * @param {string|number} [opts.season]      - Season year e.g. '2026'
   * @param {string}        [opts.seasonType]  - 'R', 'S', or 'P'
   * @param {number}        [opts.limit=50]    - Max games to return
   * @returns {Promise<Array>} List of upcoming games
   */
  async getUpcomingGames({ season, seasonType, limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (season)     params.append('season', season);
    if (seasonType) params.append('season_type', seasonType);
    if (limit)      params.append('limit', limit);
    const query = params.toString();
    return await api.get(`/scheduled-games/upcoming${query ? `?${query}` : ''}`);
  }
}

const scheduleService = new ScheduleService();
export default scheduleService;
