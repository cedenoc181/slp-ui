import api from './apiService';

/**
 * Client service for the /admin/model-performance endpoint.
 *
 * Returns per-market performance metrics for the model, used by the
 * admin ModelPerformancePage dashboard.
 *
 * Response shape (array):
 * {
 *   key:              string,   // 'moneyline', 'strikeouts', 'hits', ...
 *   label:            string,   // display name
 *   model:            string,   // 'Scout AI'
 *   category:         string,   // 'game' | 'pitcher' | 'batter'
 *   season:           number,   // 2026
 *   accuracy:         number,   // % of graded picks that won
 *   prob:             number,   // avg model probability at pick time
 *   ev:               number,   // avg expected value % across picks
 *   edge:             number,   // market edge signal
 *   calibration_gap:  number,   // prob − accuracy (positive = overconfident)
 *   picks:            number,   // total graded picks
 *   hits:             number    // total winners
 * }
 */
class PredictionsPerformanceService {
  /**
   * Per-market performance metrics for a given season.
   * GET /api/v1/admin/model-performance?season={season}
   * @param {number} season
   * @returns {Promise<Array>}
   */
  async getBySeason(season) {
    return api.get(`/api/v1/admin/model-performance?season=${season}`);
  }

  /**
   * Daily game report — per-game pick results plus summary hit rates for
   * moneyline, run_line, and totals markets.
   * GET /api/v1/admin/daily-game-report?date={YYYY-MM-DD}
   *
   * Response shape:
   * {
   *   date: "2026-04-20",
   *   summary: {
   *     moneyline: { picks, hits, pushes, accuracy },
   *     run_line:  { picks, hits, pushes, accuracy },
   *     totals:    { picks, hits, pushes, accuracy }
   *   },
   *   games: [
   *     {
   *       game_pk, status, home_team, away_team, home_team_name, away_team_name,
   *       home_score, away_score,
   *       moneyline: { pick, pick_side, model_prob, line_price, result, hit },
   *       run_line:  { pick, pick_side, model_margin, line, line_price, model_prob, actual_margin, result, hit },
   *       totals:    { pick, pick_side, model_total, line, line_price, model_prob, actual_total, result, hit }
   *     }
   *   ]
   * }
   *
   * @param {string} date — ISO date string "YYYY-MM-DD"
   * @returns {Promise<Object>}
   */
  async getDailyGameReport(date) {
    return api.get(`/api/v1/admin/daily-game-report?date=${date}`);
  }
}

const predictionsPerformanceService = new PredictionsPerformanceService();
export default predictionsPerformanceService;
