/**
 * gameSplitInsights — loads the "top matchup-split performers" for a game, the
 * same data the Matchup Advanced Analysis "Key Matchup Insights" panel uses
 * (teamLeadersService.getTeamSplits → buildInsights). Given a game_pk it
 * resolves the two teams + starting-pitcher hands and returns the insight cards
 * split per team, for rendering in the Scout Desk War Room game-prop drawer.
 */

import scheduleService from './scheduleService';
import teamLeadersService from './teamLeadersService';
import playerStatsService from './playerStatsServices';
import { DEFAULT_SEASON, PLAYER_ROLES, getTeamById } from '../constants/apiConstants';
import {
  buildInsights,
  normalizePitcherVsHandSplits,
  normalizePitcherHomeRoadSplits,
} from '../../components/pages/Stats/mlb-schedule/matchup-analysis/utils/analysisUtils';

const hasArr = (v) => Array.isArray(v) && v.length > 0;

// ── Starting-pitcher split highlight (strong / exploitable) ───────────────────
// Absolute thresholds mirror the Advanced Analysis PitcherSplitCard.
const SP_THRESH = {
  era: { good: 3.50, bad: 4.50 },
  ops: { good: 0.680, bad: 0.780 },
};
function spTone(val, t) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return 'neutral';
  if (n <= t.good) return 'strong';       // both stats: lower is better for the pitcher
  if (n >= t.bad) return 'exploitable';
  return 'neutral';
}
const fmt2 = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : n.toFixed(2); };
const fmt3 = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : (n >= 1 ? n.toFixed(3) : n.toFixed(3).replace(/^0/, '')); };

// Compact SP split card: the venue-relevant ERA + the platoon-advantaged Opp OPS,
// each flagged strong / exploitable. ≤ 2 lines. side: 'Away' (SP on road) | 'Home'.
async function pitcherSplitSummary(spId, spName, side, season, priorSeason) {
  if (!spId) return spName ? { spName, throws: null, lines: [] } : null;
  const info = await playerStatsService.getPlayerInfo(spId).catch(() => null);
  const throws = info?.throws ?? null;

  const splitsFor = async (s) => {
    const [vh, hr] = await Promise.allSettled([
      playerStatsService.getPitcherVsHandSplits(spId, s, 'R'),
      playerStatsService.getPitcherHomeRoadSplits(spId, s, 'R'),
    ]);
    const ok = (x) => (x.status === 'fulfilled' ? x.value : null);
    return { vsHand: normalizePitcherVsHandSplits(ok(vh)), homeRoad: normalizePitcherHomeRoadSplits(ok(hr), s, 'R') };
  };
  let sp = await splitsFor(season);
  if (!sp.vsHand && !sp.homeRoad) sp = await splitsFor(priorSeason);

  const locCtx  = side === 'Away' ? sp.homeRoad?.on_road : sp.homeRoad?.at_home;
  const handKey = throws?.toUpperCase() === 'R' ? 'vs_lhb' : throws?.toUpperCase() === 'L' ? 'vs_rhb' : null;
  const handCtx = handKey ? sp.vsHand?.[handKey] : null;

  const lines = [];
  const era = fmt2(locCtx?.era);
  if (era) lines.push({ label: `ERA ${side === 'Away' ? 'on road' : 'at home'}`, value: era, tone: spTone(locCtx.era, SP_THRESH.era) });
  const ops = fmt3(handCtx?.ops);
  if (ops) lines.push({ label: `Opp OPS vs ${handKey === 'vs_lhb' ? 'LHB' : 'RHB'}`, value: ops, tone: spTone(handCtx.ops, SP_THRESH.ops) });

  return { spName: spName || null, throws, lines: lines.slice(0, 2) };
}

// Team batting split-leaders with the same 3-tier fallback the analysis page
// uses: current-season Regular → current-season Spring → prior-season Regular.
async function teamSplitLeaders(teamId, season, priorSeason) {
  if (teamId == null) return [];
  const [r, s, pr] = await Promise.allSettled([
    teamLeadersService.getTeamSplits(teamId, season, 'R', PLAYER_ROLES.BATTER),
    teamLeadersService.getTeamSplits(teamId, season, 'S', PLAYER_ROLES.BATTER),
    teamLeadersService.getTeamSplits(teamId, priorSeason, 'R', PLAYER_ROLES.BATTER),
  ]);
  const ok = (x) => (x.status === 'fulfilled' ? x.value : null);
  for (const v of [ok(r), ok(s), ok(pr)]) if (hasArr(v)) return v;
  return [];
}

/**
 * @param {number|string} gamePk
 * @returns {Promise<{ away: Array, home: Array }>} insight cards per team
 */
export async function loadGameSplitInsights(gamePk) {
  if (gamePk == null) return { away: [], home: [] };
  // Scout Desk picks are today's games, so the light today-slate call usually
  // has it (team ids + starter ids). Fall back to a full lookup otherwise.
  const todays = await scheduleService.getTodayGames().catch(() => []);
  let game = (Array.isArray(todays) ? todays : []).find(g => (g.game_pk ?? g.id) === gamePk);
  if (!game) game = await scheduleService.getGameById(gamePk).catch(() => null);
  if (!game) return { away: [], home: [] };

  const season      = game.season || DEFAULT_SEASON;
  const priorSeason = String(Number(season) - 1);
  const awayId = game.away_team_id;
  const homeId = game.home_team_id;
  const awayAbbr  = getTeamById(awayId)?.id ?? game.away_team_name ?? '';
  const homeAbbr  = getTeamById(homeId)?.id ?? game.home_team_name ?? '';
  const awayMlbId = getTeamById(awayId)?.mlbId ?? null;
  const homeMlbId = getTeamById(homeId)?.mlbId ?? null;

  const [awayLeaders, homeLeaders, awayPitcher, homePitcher] = await Promise.all([
    teamSplitLeaders(awayId, season, priorSeason),
    teamSplitLeaders(homeId, season, priorSeason),
    pitcherSplitSummary(game.away_sp_id, game.away_sp_name, 'Away', season, priorSeason),
    pitcherSplitSummary(game.home_sp_id, game.home_sp_name, 'Home', season, priorSeason),
  ]);
  const awaySPThrows = awayPitcher?.throws ?? null;
  const homeSPThrows = homePitcher?.throws ?? null;

  // buildInsights tags cards by the leaders passed in, so run it per team
  // (only that team's leaders) to keep each column's cards separate.
  // Cap each side to the 3 most relevant batter split cards.
  const awayBatters = buildInsights(awayLeaders, [], awayAbbr, homeAbbr, awayMlbId, homeMlbId, awaySPThrows, homeSPThrows).slice(0, 3);
  const homeBatters = buildInsights([], homeLeaders, awayAbbr, homeAbbr, awayMlbId, homeMlbId, awaySPThrows, homeSPThrows).slice(0, 3);
  return {
    away: { pitcher: awayPitcher, batters: awayBatters },
    home: { pitcher: homePitcher, batters: homeBatters },
  };
}

export default loadGameSplitInsights;
