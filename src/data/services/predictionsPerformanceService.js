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
   * Per-market performance metrics, optionally filtered by a named time range
   * or an explicit custom date window.
   *
   * GET /api/v1/admin/model-performance?season=...&range=...
   * GET /api/v1/admin/model-performance?season=...&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
   *
   * Accepted `range` values: 'this_week', 'last_7_days', 'last_month'.
   * Omit `range` (and dates) to get the full season.
   *
   * @param {Object} params
   * @param {number} params.season
   * @param {string} [params.range]      — preset range key
   * @param {string} [params.startDate]  — ISO date "YYYY-MM-DD" (custom window)
   * @param {string} [params.endDate]    — ISO date "YYYY-MM-DD" (custom window)
   * @returns {Promise<Array>}
   */
  async getPerformance({ season, range, startDate, endDate }) {
    const qs = new URLSearchParams();
    if (season != null)  qs.set('season', String(season));
    if (range)           qs.set('range', range);
    if (startDate)       qs.set('start_date', startDate);
    if (endDate)         qs.set('end_date', endDate);
    return api.get(`/api/v1/admin/model-performance?${qs.toString()}`);
  }

  /**
   * Convenience wrapper: full-season performance.
   * @param {number} season
   * @returns {Promise<Array>}
   */
  async getBySeason(season) {
    return this.getPerformance({ season });
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
