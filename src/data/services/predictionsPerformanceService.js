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
}

const predictionsPerformanceService = new PredictionsPerformanceService();
export default predictionsPerformanceService;
