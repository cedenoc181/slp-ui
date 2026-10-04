import api from './apiService';

/**
 * Client service for the /admin/prediction-audit endpoint.
 *
 * A historical scorecard of how every prediction model has actually performed,
 * measured by cross-referencing each stored prediction against the real game
 * outcome (Final games only, deduped to the latest prediction per player-game
 * or game). Powers the admin PredictionAuditPage "Model Track Record".
 *
 * Response shape:
 * {
 *   generated_for: "2026-06-21",   // date of latest Final game in the data
 *   models: {
 *     <key>: {                     // batter_hits, pitcher_strikeouts, game_total, ...
 *       family:     "batter_prop" | "pitcher_prop" | "game",
 *       pred_col:   string,
 *       actual_col: string,
 *       calibration: {
 *         n, mean_predicted, mean_actual, bias, mae, rmse, corr
 *       },
 *       line_grid: [{
 *         line, base_over, base_under,
 *         over_picks, over_winpct, under_picks, under_winpct,
 *         hc_over_picks, hc_over_winpct, hc_under_picks, hc_under_winpct
 *       }]
 *     },
 *     // SPECIAL CASE — different shape, no calibration/line_grid:
 *     game_moneyline: {
 *       family: "game", n, accuracy, home_win_base_rate, brier_score
 *     }
 *   }
 * }
 *
 * Any *_winpct field can be null when that side had zero picks.
 */
class PredictionAuditService {
  /**
   * Prediction accuracy audit across all models.
   *
   * GET /api/v1/admin/prediction-audit
   *
   * @param {Object} [opts]
   * @param {boolean} [opts.refresh=false] — true forces a fresh recompute
   *   (~5-6s). Omit for the Redis-cached result (1h TTL). Only pass true behind
   *   an explicit "Refresh" button.
   * @returns {Promise<Object>}
   */
  async getAudit({ refresh = false } = {}) {
    if (refresh) {
      // Force a recompute and bypass the client TTL cache so the user always
      // sees freshly-computed numbers when they explicitly ask for them.
      return api.get('/api/v1/admin/prediction-audit?refresh=true', { ttl: 0 });
    }
    return api.get('/api/v1/admin/prediction-audit');
  }
}

const predictionAuditService = new PredictionAuditService();
export default predictionAuditService;
