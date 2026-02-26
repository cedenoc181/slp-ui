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
   * Find a single game by its id or game_pk across all schedule lists.
   * Searches today, prior (last 100), and upcoming (next 100) in parallel.
   * Used as a fallback when navigating directly to a matchup URL.
   * @param {string|number} gameId - game.id or game.game_pk from the URL
   * @returns {Promise<Object|null>} Matching game or null if not found
   */
  async getGameById(gameId) {
    const idNum = Number(gameId);
    const [todayRes, priorRes, upcomingRes] = await Promise.allSettled([
      this.getTodayGames(),
      this.getPriorGames({ limit: 100 }),
      this.getUpcomingGames({ limit: 100 }),
    ]);
    const all = [
      ...(todayRes.status === 'fulfilled' && Array.isArray(todayRes.value) ? todayRes.value : []),
      ...(priorRes.status === 'fulfilled' && Array.isArray(priorRes.value) ? priorRes.value : []),
      ...(upcomingRes.status === 'fulfilled' && Array.isArray(upcomingRes.value) ? upcomingRes.value : []),
    ];
    return all.find(g =>
      g.id === idNum || g.game_pk === idNum ||
      String(g.id) === String(gameId) || String(g.game_pk) === String(gameId)
    ) || null;
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
