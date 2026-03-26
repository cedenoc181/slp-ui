import api from './apiService';

/**
 * Client service for the /predictions endpoints.
 *
 * Every method returns the raw response shape from GamePredictionWithContextSchema:
 * {
 *   game_pk, date, home_team_id, away_team_id, home_team_name, away_team_name,
 *   home_sp_name, away_sp_name, game_time, status, season, season_type,
 *   odds: { moneyline_home, moneyline_away, spread_home, spread_line, total, ... } | null,
 *   prediction: { p_home_win, predicted_margin, predicted_total, ... } | null
 * }
 */
class PredictionsService {
  /**
   * All predictions for today with full game context and odds.
   * GET /predictions/today
   * @returns {Promise<Array>}
   */
  async getToday() {
    return api.get('/predictions/today');
  }

  /**
   * Today's games that have a moneyline prediction.
   * GET /predictions/moneyline/today
   * @returns {Promise<Array>}
   */
  async getMoneylineToday() {
    return api.get('/predictions/moneyline/today');
  }

  /**
   * Today's games that have a spread prediction.
   * GET /predictions/spread/today
   * @returns {Promise<Array>}
   */
  async getSpreadToday() {
    return api.get('/predictions/spread/today');
  }

  /**
   * Today's games that have a totals prediction.
   * GET /predictions/totals/today
   * @returns {Promise<Array>}
   */
  async getTotalsToday() {
    return api.get('/predictions/totals/today');
  }

  /**
   * Full prediction + odds context for a single game.
   * GET /predictions/{game_pk}
   * @param {string|number} gamePk
   * @returns {Promise<Object>}
   */
  async getByGamePk(gamePk) {
    return api.get(`/predictions/${gamePk}`);
  }

  /**
   * Pitcher prop predictions for all starters today.
   * GET /predictions/pitchers/today
   * @returns {Promise<Array>}
   */
  async getPitchersToday() {
    return api.get('/predictions/pitchers/today');
  }

  /**
   * Pitcher prop predictions for both starters in a specific game.
   * GET /predictions/pitchers/{game_pk}
   * @param {string|number} gamePk
   * @returns {Promise<Object>}
   */
  async getPitchersByGamePk(gamePk) {
    return api.get(`/predictions/pitchers/${gamePk}`);
  }
}

const predictionsService = new PredictionsService();
export default predictionsService;
