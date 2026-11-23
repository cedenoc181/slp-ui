import { API_BASE_URL } from '../config/apiConfig';

/*
  Client for the Caribbean winter-league routes (/cbpc/...). Separate from
  apiService on purpose:
  - errors keep their HTTP status (404 = not found / not in this league,
    400 = bad parameter, 422 = unknown league slug), which apiService drops;
  - it always calls the production API, so it never depends on a local
    backend having the CBPC routes.
  Responses are cached for 5 minutes with in-flight de-duplication, like
  apiService. Every route except /cbpc/leagues is scoped to one league.
*/

const TTL = 5 * 60 * 1000;
const cache = new Map();    // path → { data, expiresAt }
const inflight = new Map(); // path → Promise

export class CbpcError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  get isNotFound() { return this.status === 404; }
}

function qs(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

async function get(path) {
  const hit = cache.get(path);
  if (hit && Date.now() < hit.expiresAt) return hit.data;
  if (inflight.has(path)) return inflight.get(path);

  const p = (async () => {
    const res = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const detail = typeof body.detail === 'string' ? body.detail : `Request failed (${res.status})`;
      throw new CbpcError(res.status, detail);
    }
    const data = await res.json();
    cache.set(path, { data, expiresAt: Date.now() + TTL });
    return data;
  })();
  inflight.set(path, p);
  try {
    return await p;
  } finally {
    inflight.delete(path);
  }
}

/**
 * @typedef {'lidom'|'lvbp'|'lmp'|'lbprc'|'cs'} CbpcLeagueSlug
 *
 * @typedef {Object} CbpcLeague
 * @property {CbpcLeagueSlug} slug
 * @property {string} code            e.g. "LIDOM"
 * @property {string} name
 * @property {string} country
 * @property {number[]} seasons       start years, ascending
 * @property {number} current_season
 *
 * @typedef {Object} CbpcGame         MLB GameLogSchema fields plus the CBPC extras
 * @property {number} game_pk
 * @property {string} date            YYYY-MM-DD
 * @property {string} game_time       HH:MM UTC
 * @property {string} game_datetime_utc
 * @property {number} season
 * @property {'regular'|'postseason'} season_type
 * @property {'R'|'F'|'D'|'L'|'W'} game_type
 * @property {string} status          Final | Scheduled | In Progress | Postponed | Cancelled | Completed Early
 * @property {number} home_team_id    CBPC id
 * @property {number} away_team_id    CBPC id
 * @property {string} home_team_name
 * @property {string} away_team_name
 * @property {string} home_team_abbr
 * @property {string} away_team_abbr
 * @property {string|null} home_team_logo_url
 * @property {string|null} away_team_logo_url
 * @property {number|null} home_runs_score   null until final
 * @property {number|null} away_runs_score
 * @property {number|null} winning_team_id
 * @property {string|null} venue_name
 * @property {string|null} series_description
 * @property {string|null} postseason_round
 *
 * @typedef {Object} CbpcStandingRow
 * @property {number} team_id
 * @property {string} team_name
 * @property {string} team_abbreviation
 * @property {string|null} logo_url
 * @property {number} wins
 * @property {number} losses
 * @property {number} w_l_pct
 * @property {string} games_back      "-" for the leader
 * @property {number} league_rank
 * @property {number} runs_scored
 * @property {number} runs_allowed
 * @property {number} run_differential
 * @property {number} last_ten_wins
 * @property {number} last_ten_losses
 * @property {string} streak_code
 */

const cbpcService = {
  /** @returns {Promise<CbpcLeague[]>} */
  getLeagues: () => get('/cbpc/leagues'),

  // Teams & standings
  getTeams: (league, season) => get(`/cbpc/${league}/teams${qs({ season })}`),
  getTeam: (league, teamId) => get(`/cbpc/${league}/teams/${teamId}`),
  /** season_type: 'R' regular, 'L' round robin / semifinal table */
  getStandings: (league, season, seasonType = 'R') =>
    get(`/cbpc/${league}/standings${qs({ season, season_type: seasonType })}`),
  getTeamStats: (league, group, season) => get(`/cbpc/${league}/teams/stats/${group}${qs({ season })}`),
  // With teamId, the server ranks only that club's players (lines for the club,
  // club-scaled qualifier; qualifier.relaxed when nobody fully qualifies).
  getLeaders: (league, group, stat, season, limit = 10, teamId) =>
    get(`/cbpc/${league}/leaders/${group}${qs({ season, stat, limit, team_id: teamId })}`),
  // A club's common lineup: 9 regulars (most recent starts), then bench, each
  // ordered best hitter to worst by the server.
  getTeamLineup: (league, teamId, { season, seasonType, limit, recentGames } = {}) =>
    get(`/cbpc/${league}/teams/${teamId}/lineup${qs({ season, season_type: seasonType, limit, recent_games: recentGames })}`),

  // Games
  getTodayGames: (league) => get(`/cbpc/${league}/scheduled-games/today`),
  // Hot performers: each player's last 7 games (batting) or 5 appearances
  // (pitching), ranked per category by the server.
  getHotLeaders: (league, group, { season, seasonType, teamId, limit, asOfDate } = {}) =>
    get(`/cbpc/${league}/leaders/${group}/hot${qs({ season, season_type: seasonType, team_id: teamId, limit, as_of_date: asOfDate })}`),
  getUpcomingGames:(league, days = 7) => get(`/cbpc/${league}/scheduled-games/upcoming${qs({ days })}`),
  getPriorGames: (league, days = 3) => get(`/cbpc/${league}/scheduled-games/prior${qs({ days })}`),
  getGamesByDate: (league, date) => get(`/cbpc/${league}/games/date${qs({ date })}`),
  /** Completed games, newest first. */
  getTeamGames: (league, teamId, season, seasonType) =>
    get(`/cbpc/${league}/games/team${qs({ team_id: teamId, season, season_type: seasonType })}`),
  getBoxscore: (league, gamePk) => get(`/cbpc/${league}/games/boxscore${qs({ game_pk: gamePk })}`),
  getPlays: (league, gamePk) => get(`/cbpc/${league}/games/plays${qs({ game_pk: gamePk })}`),

  // Players
  searchPlayers: (league, q, limit = 8) => get(`/cbpc/${league}/players/search${qs({ q, limit })}`),
  getPlayerInfo: (league, playerId) => get(`/cbpc/${league}/player-profile/${playerId}/info`),
  /** group: 'batter' | 'pitcher' */
  getPlayerGames: (league, group, playerId, season, seasonType) =>
    get(`/cbpc/${league}/games/${group}${qs({ player_id: playerId, season, season_type: seasonType })}`),
  getPlayerSeasonStats: (league, group, playerId) =>
    get(`/cbpc/${league}/player-profile/${playerId}/${group}/season-stats`),
  /** Omit season for career. */
  getPlayerSplits: (league, group, playerId, season) =>
    get(`/cbpc/${league}/player-profile/${playerId}/${group}/vs-hand-splits${qs({ season })}`),

  // Rosters
  getRoster: (league, teamId, asOf) => get(`/cbpc/${league}/rosters/team${qs({ team_id: teamId, as_of: asOf })}`),
};

export default cbpcService;
