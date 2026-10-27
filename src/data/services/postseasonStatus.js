/**
 * postseasonStatus — which playoff clubs are eliminated, from the bracket.
 *
 * Source: GET /teams/standings/postseason?season=YYYY (teamsService.
 * getTeamPostseasonBracket) → { "American League": [...], "National League": [...] }.
 * Each row carries per-round series flags; a round's flag is `false` once the
 * club has lost that series, `true` once it won, `null` if it hasn't played it
 * (including a bye — top seeds have null wild-card fields). So a club is
 * eliminated as soon as ANY round's flag is exactly `false`; the World Series
 * loser counts too (ws_champion === false).
 *
 * Keyed by mlb_team_id so it joins to TEAM_METADATA's `mlbId` without relying
 * on abbreviation spellings matching across feeds.
 */

import teamsService from './teamsService';

const SERIES_FLAGS = ['wc_series_winner', 'lds_series_winner', 'lcs_series_winner', 'ws_champion'];

export function isEliminated(bracketRow) {
  return !!bracketRow && SERIES_FLAGS.some(flag => bracketRow[flag] === false);
}

/**
 * @param {string|number} season — e.g. 2026
 * @returns {Promise<Set<number>>} mlb_team_id of every eliminated club.
 *   Resolves to an empty Set on any failure — callers then just show the
 *   plain "no game" copy, never a wrong "eliminated".
 */
export async function getEliminatedMlbIds(season) {
  try {
    const bracket = await teamsService.getTeamPostseasonBracket(String(season));
    const rows = Object.values(bracket || {}).flat();
    return new Set(rows.filter(isEliminated).map(r => r.mlb_team_id).filter(id => id != null));
  } catch {
    return new Set();
  }
}

const postseasonStatus = { isEliminated, getEliminatedMlbIds };
export default postseasonStatus;
