/**
 * betSettlement — settles pending tracked bets from final game results.
 *
 * Shared by the Bet Library and the Scout Desk so bets settle no matter which
 * page is open (the Bet Autopsy + P/L depend on bets actually reaching a final
 * status). Game markets grade from the final score; player props from the
 * per-game H2H box score — the exact same logic the Bet Library used inline.
 */

import betLibraryService from './betLibraryService';
import scheduleService from './scheduleService';
import gamesService from './gamesService';
import { gradeBet, gradePlayerProp, isGameFinal, isSettleDue } from './betGrader';
import { getPlayerPropActual } from './liveBetTracker';
import { aggregatePlayers, mapSeasonType } from '../../components/pages/Stats/mlb-schedule/utils';

export const isPlayerProp = (b) =>
  b?.grade?.type === 'pitcher_prop' || b?.grade?.type === 'batter_prop';

// Fetch + aggregate a game's per-player box score (away = team_a, home = team_b).
// Shared by the live tracker, settling, and the per-bet "actual" display.
// Never throws — a failed side just yields no players for that group.
export async function fetchBoxPlayers(game, gamePk, reqOptions = {}) {
  const season = game.season || new Date().getFullYear();
  const seasonType = mapSeasonType(game.season_type);
  const args = { season: String(season), seasonType, limit: 10, gamePk };
  const [batRes, pitRes] = await Promise.allSettled([
    gamesService.getHeadToHeadBatters(game.away_team_id, game.home_team_id, args, reqOptions),
    gamesService.getHeadToHeadPitchers(game.away_team_id, game.home_team_id, args, reqOptions),
  ]);
  const batGames = batRes.status === 'fulfilled' && batRes.value?.games ? batRes.value.games : [];
  const pitGames = pitRes.status === 'fulfilled' && pitRes.value?.games ? pitRes.value.games : [];
  return {
    batters:  [...aggregatePlayers(batGames, 'team_a'), ...aggregatePlayers(batGames, 'team_b')],
    pitchers: [...aggregatePlayers(pitGames, 'team_a'), ...aggregatePlayers(pitGames, 'team_b')],
  };
}

/**
 * Settle every pending bet that is due (~2.5h after first pitch) and whose game
 * is Final. Persists each settled status via betLibraryService.update.
 *
 * @returns {Promise<{changed: boolean, bets: Array}>}
 *   changed — true if any bet was settled this pass (caller should refresh)
 *   bets    — the bet list with settled statuses applied in-memory, so a caller
 *             can use it for the autopsy/summary without re-fetching.
 */
export async function settlePendingBets() {
  const all = await betLibraryService.list();
  const now = Date.now();
  const due = all.filter(b => b.status === 'pending' && b.gamePk != null && b.grade && isSettleDue(b, now));
  if (!due.length) return { changed: false, bets: all };

  const year = new Date().getFullYear();
  const [todayRes, priorRes] = await Promise.allSettled([
    scheduleService.getTodayGames(),
    scheduleService.getPriorGames({ season: year, seasonType: 'R', limit: 100 }),
  ]);
  const games = [
    ...(todayRes.status === 'fulfilled' && Array.isArray(todayRes.value) ? todayRes.value : []),
    ...(priorRes.status === 'fulfilled' && Array.isArray(priorRes.value) ? priorRes.value : []),
  ];
  const byPk = {};
  for (const g of games) {
    const pk = g.game_pk ?? g.id;
    if (pk != null && !(pk in byPk)) byPk[pk] = g;
  }

  // Player props settle from per-game H2H box scores — fetch once per final game.
  const propGamePks = [...new Set(due.filter(isPlayerProp).map(b => b.gamePk))]
    .filter(pk => byPk[pk] && isGameFinal(byPk[pk]));
  const boxByPk = {};
  await Promise.all(propGamePks.map(async (pk) => { boxByPk[pk] = await fetchBoxPlayers(byPk[pk], pk); }));

  let changed = false;
  for (const bet of due) {
    const g = byPk[bet.gamePk];
    if (!g || !isGameFinal(g)) continue;       // not final yet → try again next pass
    const status = isPlayerProp(bet)
      ? gradePlayerProp(bet.grade, getPlayerPropActual(bet, boxByPk[bet.gamePk]))
      : gradeBet(bet, g);
    if (status) {
      await betLibraryService.update(bet.id, { status });
      bet.status = status; // reflect in the returned list so the autopsy sees it
      changed = true;
    }
  }
  return { changed, bets: all };
}

export default settlePendingBets;
