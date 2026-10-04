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

  /**
   * Pitcher-prop daily report — the pitcher-prop equivalent of the daily game
   * report. Per-pitcher scorecard of which props landed on the winning side,
   * plus per-stat summary hit rates.
   * GET /api/v1/admin/pitcher-props-daily-report?date={YYYY-MM-DD} (defaults to yesterday ET)
   *
   * Response shape:
   * {
   *   date: "2026-07-08",
   *   summary: {
   *     strikeouts:   { picks, hits, pushes, accuracy },
   *     earned_runs:  { picks, hits, pushes, accuracy },
   *     hits_allowed: { picks, hits, pushes, accuracy },
   *     outs:         { picks, hits, pushes, accuracy }
   *   },
   *   pitchers: [
   *     {
   *       pitcher_name, team, opponent, home_away, game_pk, status,
   *       strikeouts:   { pick, line, projection, actual, result, odds },
   *       earned_runs:  { pick, line, projection, actual, result, odds },
   *       hits_allowed: { pick, line, projection, actual, result, odds },
   *       outs:         { pick, line, projection, actual, result, odds }
   *     }
   *   ]
   * }
   *
   * @param {string} [date] — ISO date "YYYY-MM-DD"
   * @returns {Promise<Object>}
   */
  async getPitcherPropsDailyReport(date, options = {}) {
    const qs = date ? `?date=${date}` : '';
    // Pass { ttl: 0 } to bypass the cache (force a fresh pull) when the report
    // was first fetched before all predictions had populated.
    return api.get(`/api/v1/admin/pitcher-props-daily-report${qs}`, options);
  }

  /**
   * Player prop hit-rate comparison for today vs. yesterday, grouped by
   * pitcher and batter markets.
   * GET /api/v1/admin/player-props-today-vs-yesterday
   *
   * Response shape:
   * {
   *   today:     { date, pitcher: Metric[], batter: Metric[] },
   *   yesterday: { date, pitcher: Metric[], batter: Metric[] }
   * }
   *
   * Metric: { key, label, model, category, season, accuracy, prob, ev,
   *           edge, calibration_gap, picks, hits }
   *
   * @returns {Promise<Object>}
   */
  async getPlayerPropsTodayVsYesterday() {
    return api.get('/api/v1/admin/player-props-today-vs-yesterday');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Scout AI reasoning layer
  //
  // The LLM reasoning layer's own picks, graded independently of the ML model.
  // These mirror the ML endpoints above 1:1 — same row/response shapes — so the
  // dashboard reuses the same components and just swaps the data source.
  //
  // Calibration note: Scout AI outputs a 1–5 confidence the backend converts to
  // `prob` via 0.50 + confidence × 0.05 (conf 1 → 55%, 5 → 75%). So `prob` is how
  // confident Scout *claimed* to be and `calibration_gap = prob − accuracy` is the
  // headline insight (large positive = overconfident).
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Scout AI per-market performance — same params/shape as getPerformance().
   * GET /api/v1/admin/scout-ai-performance?season=...&range=...
   * GET /api/v1/admin/scout-ai-performance?season=...&start_date=...&end_date=...
   *
   * Accepted `range` values: last_7_days, last_14_days, last_30_days, this_week,
   * last_week, this_month, last_month, season.
   *
   * @param {Object} params
   * @param {number} params.season
   * @param {string} [params.range]
   * @param {string} [params.startDate]
   * @param {string} [params.endDate]
   * @returns {Promise<Array>}
   */
  async getScoutAiPerformance({ season, range, startDate, endDate }) {
    const qs = new URLSearchParams();
    if (season != null)  qs.set('season', String(season));
    if (range)           qs.set('range', range);
    if (startDate)       qs.set('start_date', startDate);
    if (endDate)         qs.set('end_date', endDate);
    return api.get(`/api/v1/admin/scout-ai-performance?${qs.toString()}`);
  }

  /**
   * Scout AI daily game scorecard — mirrors getDailyGameReport().
   * Each pick additionally includes a `confidence` (1–5); `result` is one of
   * "pending" | "win" | "loss" | "push"; any market may be null.
   * GET /api/v1/admin/scout-ai-daily-game-report?date={YYYY-MM-DD}  (defaults to yesterday ET)
   *
   * @param {string} [date] — ISO date "YYYY-MM-DD"
   * @returns {Promise<Object>}
   */
  async getScoutAiDailyGameReport(date) {
    const qs = date ? `?date=${date}` : '';
    return api.get(`/api/v1/admin/scout-ai-daily-game-report${qs}`);
  }

  /**
   * Scout AI player props for a single day — mirrors player-props-daily.
   * Returns { date, pitcher: Metric[], batter: Metric[] }.
   * GET /api/v1/admin/scout-ai-player-props-daily?date={YYYY-MM-DD}&season={year}  (date defaults to today ET)
   *
   * @param {string} [date]   — ISO date "YYYY-MM-DD"
   * @param {number} [season]
   * @returns {Promise<Object>}
   */
  async getScoutAiPlayerPropsDaily(date, season) {
    const qs = new URLSearchParams();
    if (date)           qs.set('date', date);
    if (season != null) qs.set('season', String(season));
    const q = qs.toString();
    return api.get(`/api/v1/admin/scout-ai-player-props-daily${q ? `?${q}` : ''}`);
  }

  /**
   * Scout AI player props today vs. yesterday — mirrors player-props-today-vs-yesterday.
   * Returns { today: {<daily shape>}, yesterday: {<daily shape>} }.
   * GET /api/v1/admin/scout-ai-player-props-today-vs-yesterday?season={year}
   *
   * @param {number} [season]
   * @returns {Promise<Object>}
   */
  async getScoutAiPlayerPropsTodayVsYesterday(season) {
    const qs = season != null ? `?season=${season}` : '';
    return api.get(`/api/v1/admin/scout-ai-player-props-today-vs-yesterday${qs}`);
  }
}

const predictionsPerformanceService = new PredictionsPerformanceService();
export default predictionsPerformanceService;
