import api from './apiService';
import { getAccessToken } from './userAuthService';

// The release gate (see releaseGate.js) is enforced server-side per caller:
// an admin's bearer token bypasses it and gets every row back flagged
// is_preview/preview_badge; anyone else just gets gated rows omitted. None of
// that can happen unless the token is actually sent, so every /predictions/*
// call attaches it the same way the other admin-gated services do.
function authOptions(options = {}) {
  const token = getAccessToken();
  if (!token) return options;
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

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
  async getToday(options = {}) {
    return api.get('/predictions/today', authOptions(options));
  }

  /**
   * Market odds for every game today — NOT release-gated. Same rows as
   * getToday() minus model output (no prediction / scout_ai), so the full
   * slate's lines are available before predictions unlock 2h pre-pitch.
   * GET /predictions/today/odds
   * @returns {Promise<Array>}
   */
  async getTodayOdds(options = {}) {
    return api.get('/predictions/today/odds', options);
  }

  /**
   * The day's 3 best game props (moneyline / total / run-line), chosen by the
   * Scout Desk War Room engine and frozen once per ET day. Same pick shape as
   * the Scout Desk board. Public, no auth. `picks` is [] and `lockedAt` null
   * until the day's board generates.
   * GET /predictions/today/best-game-props
   * @returns {Promise<{ date, lockedAt, picks: Array, shortlist?: Array, cut?: Array }>}
   */
  async getBestGameProps(options = {}) {
    return api.get('/predictions/today/best-game-props', options);
  }

  /**
   * The day's best pitcher props (strikeouts / earned runs / hits allowed /
   * outs), chosen by the Scout Desk War Room engine and frozen once per ET day.
   * Same pick shape as the Scout Desk board (kind: "pitcher"). Public, no auth.
   * `picks` is 0–4 items (OFTEN 0) and `lockedAt` null until the board generates.
   * GET /predictions/today/best-pitcher-props
   * @returns {Promise<{ date, lockedAt, picks: Array, shortlist?: Array, cut?: Array }>}
   */
  async getBestPitcherProps(options = {}) {
    return api.get('/predictions/today/best-pitcher-props', options);
  }

  /**
   * The day's best early-game props — markets that resolve before the full game
   * does (NRFI/YRFI today; F5 moneyline / run line / total landing on this same
   * feed soon). Same envelope and pick shape as the other boards, but with
   * several deliberate differences — don't assume the game-props board's shape:
   *
   *   kind            "nrfi" (not "game"), and more kinds are coming
   *   side            "yrfi" | "nrfi" — a combined-both-teams market, not home/away
   *   playerId        always null
   *   pitcherName     always null — the starters live in reasoning.context
   *                   (see below), not here
   *   picks[]         NOT pre-filtered to "strong" the way best-game-props and
   *                   best-pitcher-props are: a "lean" or "split" pick can and
   *                   does appear in this list. Read consensus.level per pick;
   *                   never assume everything in picks[] is a clean edge, and
   *                   never filter the feed down to level === "strong".
   *   deep_links      not populated — no betslip links; show plain odds instead
   *   reasoning.ctx   carries the starting pitchers, shaped by market:
   *                     NRFI → context.nrfiProfile { homeSp/awaySp {name,
   *                            firstInningRunRateAllowed, starts},
   *                            home/awayTopOrderObp (null until the lineup is
   *                            posted), home/awayTeam1stInningScoreRate }
   *                     F5   → context.f5Profile { homeSp/awaySp { name } }
   *                   There is still no gameMatchup/parkFactor here — don't
   *                   read reasoning.context.gameMatchup off this feed.
   *
   * Label sections off each pick's own `market` / `statType` rather than
   * hardcoding "NRFI/YRFI" — new market types arrive on this same list.
   *
   * Empty is normal and frequent (brand-new model, narrow qualifying band).
   * `lockedAt` + `noEdgeReason` say WHICH kind of empty it is:
   *
   *   lockedAt null, noEdgeReason null → hasn't evaluated today's slate yet;
   *                                      hide the panel
   *   lockedAt set,  noEdgeReason set  → evaluated, nothing cleared the
   *                                      edge/conviction bar. Render the reason
   *                                      verbatim (it's a complete sentence and
   *                                      varies by day) as an explicit "No Edge
   *                                      Today" card — NOT an error or a
   *                                      loading state
   *   picks non-empty                  → normal pick cards
   *
   * A no-edge day can still flip to real picks later the same day: the board
   * keeps re-evaluating until it either freezes with picks or the day ends, so
   * don't treat a no-edge response as final for the day.
   *
   * GET /predictions/today/best-early-game-props
   * @returns {Promise<{ date, lockedAt, picks: Array, noEdgeReason: ?string,
   *                     shortlist?: Array, cut?: Array }>}
   */
  async getBestEarlyGameProps(options = {}) {
    return api.get('/predictions/today/best-early-game-props', options);
  }

  /**
   * Today's games that have a moneyline prediction.
   * GET /predictions/moneyline/today
   * @returns {Promise<Array>}
   */
  async getMoneylineToday(options = {}) {
    return api.get('/predictions/moneyline/today', authOptions(options));
  }

  /**
   * Today's games that have a spread prediction.
   * GET /predictions/spread/today
   * @returns {Promise<Array>}
   */
  async getSpreadToday(options = {}) {
    return api.get('/predictions/spread/today', authOptions(options));
  }

  /**
   * Today's games that have a totals prediction.
   * GET /predictions/totals/today
   * @returns {Promise<Array>}
   */
  async getTotalsToday(options = {}) {
    return api.get('/predictions/totals/today', authOptions(options));
  }

  /**
   * Full prediction + odds context for a single game. Non-admin + not yet
   * released = 404 (see releaseGate.js for the admin-preview contract).
   * GET /predictions/{game_pk}
   * @param {string|number} gamePk
   * @returns {Promise<Object>}
   */
  async getByGamePk(gamePk, options = {}) {
    return api.get(`/predictions/${gamePk}`, authOptions(options));
  }

  /**
   * Batter prop predictions for all players in a specific game.
   * GET /predictions/batters/{game_pk}
   * @param {string|number} gamePk
   * @returns {Promise<Object>}
   */
  async getBattersByGamePk(gamePk, options = {}) {
    return api.get(`/predictions/batters/${gamePk}`, authOptions(options));
  }

  /**
   * Pitcher prop predictions for all starters today.
   * GET /predictions/pitchers/today
   * @returns {Promise<Array>}
   */
  async getPitchersToday(options = {}) {
    return api.get('/predictions/pitchers/today', authOptions(options));
  }

  /**
   * Pitcher prop predictions for both starters in a specific game.
   * GET /predictions/pitchers/{game_pk}
   * @param {string|number} gamePk
   * @returns {Promise<Object>}
   */
  async getPitchersByGamePk(gamePk, options = {}) {
    return api.get(`/predictions/pitchers/${gamePk}`, authOptions(options));
  }
}

const predictionsService = new PredictionsService();
export default predictionsService;
