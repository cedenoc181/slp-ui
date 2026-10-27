/**
 * liveBetTracker — turns a tracked bet + live game data into a small "live
 * progress" descriptor the Bet Library renders on the card while the game is
 * in progress.
 *
 * Live data sources (all already live, same ones the MLB schedule live view uses):
 *   - scheduleService.getTodayGames()          → status + away/home_runs_score
 *   - gamesService.getBoxscore(gamePk)         → innings (for current inning)
 *   - gamesService.getHeadToHeadBatters/Pitchers(..., { gamePk })
 *       → per-player CURRENT in-game stats, aggregated with aggregatePlayers()
 *
 * What we surface, by the bet's grade type (set when the bet was tracked):
 *   moneyline / runline  → live score (+ leading / covering state)
 *   total                → live total runs vs the line (+ over/under state)
 *   pitcher_prop         → the pitcher's live metric (K / outs / ER / hits) vs line
 *   batter_prop          → the batter's live metric (H / HR / RBI / TB) vs line
 *
 * Returns null when the game isn't live or there's nothing to show. No values
 * are ever synthesized — a metric we don't have real live data for stays null.
 */

import { getTeamById } from '../constants/apiConstants';

const FINAL_STATUSES = ['final', 'game over', 'completed', 'completed early'];

export function isLiveStatus(status) {
  const s = (status || '').toLowerCase();
  if (FINAL_STATUSES.includes(s)) return false;
  return s.includes('progress') || s === 'live' || s.includes('inning');
}

export function isGameLive(game) {
  return isLiveStatus(game?.status);
}

function num(v) {
  return v == null || Number.isNaN(Number(v)) ? null : Number(v);
}

/** Current inning { num, half } derived from the boxscore innings array. */
export function currentInning(boxscore) {
  if (!boxscore?.innings?.length) return null;
  const last = boxscore.innings[boxscore.innings.length - 1];
  const n = last.inning ?? boxscore.innings.length;
  // A populated bottom-half run total means we're in (or past) the bottom.
  const half = last.home_runs != null && last.home_runs !== '' && last.away_runs != null
    ? (last.home_runs > 0 ? 'Bot' : 'Top')
    : 'Top';
  return { num: n, half };
}

// ── per-stat live getters (mirror the grade.statType keys in matchupBets) ──────

const PITCHER_STAT = {
  strikeouts:   p => num(p.strikeouts),
  hits_allowed: p => num(p.hits_allowed),
  earned_runs:  p => num(p.earned_runs),
  outs:         p => (p.innings_pitched != null ? Math.round(num(p.innings_pitched) * 3) : null),
};

const BATTER_STAT = {
  hits:        p => num(p.hits),
  home_runs:   p => num(p.home_runs),
  rbis:        p => num(p.rbis),
  total_bases: p => num(p.total_bases),
};

export const STAT_LABEL = {
  strikeouts: 'K', hits_allowed: 'H allowed', earned_runs: 'ER', outs: 'Outs',
  hits: 'H', home_runs: 'HR', rbis: 'RBI', total_bases: 'TB',
};

// Find the live player row for a player-prop bet. Matches on the player's full
// name appearing in the bet's selection (selections are built as
// "{name} {side} {line} {label}"), with an MLB-id match as a fast path.
function matchPlayer(players, bet) {
  if (!Array.isArray(players) || !players.length) return null;
  const pid = bet?.grade?.playerId;
  if (pid != null) {
    const byId = players.find(p => p.player_mlb_id === pid || p.player_id === pid);
    if (byId) return byId;
  }
  const sel = (bet?.selection || '').toLowerCase();
  if (!sel) return null;
  // Prefer the longest full-name that appears in the selection (most specific).
  const named = players
    .filter(p => p.player_name && sel.includes(p.player_name.toLowerCase()))
    .sort((a, b) => b.player_name.length - a.player_name.length);
  if (named[0]) return named[0];
  // Last-name fallback.
  const byLast = players.filter(p => {
    const last = (p.player_name || '').trim().split(/\s+/).pop().toLowerCase();
    return last.length > 2 && sel.includes(last);
  });
  return byLast.length === 1 ? byLast[0] : null;
}

/**
 * The player's actual stat for a player-prop bet, pulled from aggregated H2H
 * box-score players. Same matching + stat getters the live tracker uses, so a
 * FINAL game's box score yields the final number for settling the bet.
 * @param {Object} bet  — tracked bet (carries `grade`, `selection`)
 * @param {Object} data — { batters, pitchers } aggregated for the game
 * @returns {number|null}
 */
export function getPlayerPropActual(bet, data) {
  const meta = bet?.grade;
  if (!meta) return null;
  const isPitcher = meta.type === 'pitcher_prop';
  if (!isPitcher && meta.type !== 'batter_prop') return null;
  const getter = (isPitcher ? PITCHER_STAT : BATTER_STAT)[meta.statType];
  const player = matchPlayer(isPitcher ? data?.pitchers : data?.batters, bet);
  return player && getter ? getter(player) : null;
}

/**
 * Build the live tracker descriptor for one bet.
 * @param {Object} bet  — tracked bet (carries `grade`, `selection`, `gamePk`)
 * @param {Object} live — { game, boxscore, batters, pitchers } for bet.gamePk
 * @returns {Object|null}
 */
export function buildLiveTracker(bet, live) {
  const game = live?.game;
  if (!game || !isGameLive(game)) return null;

  // Prefer the boxscore's run totals (fetched fresh each poll) over the
  // schedule row, so the live score keeps pace inning-by-inning.
  const bs = live.boxscore;
  const away = num(bs?.away_runs) ?? num(game.away_runs_score);
  const home = num(bs?.home_runs) ?? num(game.home_runs_score);
  const awayAbbr = getTeamById(game.away_team_id)?.id || game.away_team_name || 'AWY';
  const homeAbbr = getTeamById(game.home_team_id)?.id || game.home_team_name || 'HOM';
  const base = { inning: currentInning(live.boxscore), awayAbbr, homeAbbr, away, home };

  const meta = bet?.grade;
  if (!meta) return { kind: 'score', ...base };

  switch (meta.type) {
    case 'moneyline': {
      // Is the picked team currently ahead?
      let leading = null;
      if (away != null && home != null && away !== home && meta.teamId != null) {
        const leaderId = home > away ? game.home_team_id : game.away_team_id;
        leading = leaderId === meta.teamId;
      }
      const pickAbbr = meta.teamId === game.home_team_id ? homeAbbr
        : meta.teamId === game.away_team_id ? awayAbbr : null;
      return { kind: 'score', market: 'moneyline', pickAbbr, leading, ...base };
    }
    case 'runline': {
      let covering = null;
      if (away != null && home != null && meta.line != null) {
        covering = meta.side === 'home' ? home + meta.line > away : away + meta.line > home;
      }
      const pickAbbr = meta.side === 'home' ? homeAbbr : awayAbbr;
      return { kind: 'score', market: 'runline', pickAbbr, line: meta.line, covering, ...base };
    }
    case 'total': {
      const total = away != null && home != null ? away + home : null;
      let state = null; // 'over' | 'under' relative to the line right now
      if (total != null && meta.line != null) state = total > meta.line ? 'over' : 'under';
      return { kind: 'total', total, line: meta.line, side: meta.side, state, ...base };
    }
    case 'pitcher_prop':
    case 'batter_prop': {
      const isPitcher = meta.type === 'pitcher_prop';
      const getter = (isPitcher ? PITCHER_STAT : BATTER_STAT)[meta.statType];
      const player = matchPlayer(isPitcher ? live.pitchers : live.batters, bet);
      const value = player && getter ? getter(player) : null;
      // Live side state: does the current value already satisfy the bet's side?
      let state = null; // 'hit' | 'against' | 'pending'
      if (value != null && meta.line != null && meta.side) {
        const over = value > meta.line;
        if (meta.side === 'Over' || meta.side === 'over') state = over ? 'hit' : 'pending';
        else state = over ? 'against' : 'hit';
      }
      return {
        kind: 'player',
        statType: meta.statType,
        statLabel: STAT_LABEL[meta.statType] || meta.statType,
        side: meta.side, line: meta.line,
        value, playerName: player?.player_name || null, playerFound: !!player,
        state, ...base,
      };
    }
    default:
      return { kind: 'score', ...base };
  }
}

// ── pitcher-prop line watch (market movement, independent of game live/final) ──
//
// Separate from buildLiveTracker() above: this compares a pending pitcher_prop
// bet's TRACKED line/price against the CURRENT market from
// /predictions/pitchers/today/odds — relevant before and during the game, not
// just while it's live. DFS prices are a flat -137 placeholder, never used
// here as a price.

function mostCommon(nums) {
  if (!nums.length) return null;
  const counts = new Map();
  for (const n of nums) counts.set(n, (counts.get(n) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function findOddsPitcher(gameNode, playerId) {
  if (!gameNode || playerId == null) return null;
  const sides = [gameNode.away_pitcher, gameNode.home_pitcher];
  return sides.find(p => p && (p.player_id === playerId)) || null;
}

/**
 * Current market line/price for a pending pitcher_prop bet, plus movement vs
 * the tracked bet. Returns null when the game/starter/stat isn't in the feed.
 * @param {Object} bet              — tracked bet (grade.playerId/statType/side/line, odds, gamePk)
 * @param {Object} pitcherOddsByPk  — { [game_pk]: gameNode } from /pitchers/today/odds
 * @param {string|null} preferredBook — user's preferredBook (platform_key)
 */
export function getPitcherLineWatch(bet, pitcherOddsByPk, preferredBook = null) {
  const meta = bet?.grade;
  if (!meta || meta.type !== 'pitcher_prop' || bet?.gamePk == null) return null;

  const gameNode = pitcherOddsByPk?.[bet.gamePk];
  const pitcher = findOddsPitcher(gameNode, meta.playerId);
  if (!pitcher) return null;

  const sbProps = Array.isArray(pitcher.sportsbook_props) ? pitcher.sportsbook_props : [];
  const dfsProps = Array.isArray(pitcher.dfs_props) ? pitcher.dfs_props : [];
  const statSB = sbProps.filter(p => p.stat_type === meta.statType);
  const statDFS = dfsProps.filter(p => p.stat_type === meta.statType);
  if (!statSB.length && !statDFS.length) return null;

  const currentLine = statSB.length ? mostCommon(statSB.map(p => p.line)) : null;
  const sideKey = (meta.side === 'Over' || meta.side === 'over') ? 'over_price' : 'under_price';

  const atLine = statSB.filter(p => currentLine == null || p.line === currentLine);
  const currentPrice = atLine.reduce((best, p) => {
    const v = p[sideKey];
    return v != null && (best == null || v > best) ? v : best;
  }, null);

  let preferredBookPrice = null, preferredBookTitle = null;
  if (preferredBook) {
    const row = atLine.find(p => p.platform_key === preferredBook);
    if (row && row[sideKey] != null) { preferredBookPrice = row[sideKey]; preferredBookTitle = row.platform_title; }
  }

  const dfsLines = statDFS.map(p => ({ title: p.platform_title, line: p.line }));

  return {
    currentLine,
    currentPrice,
    preferredBookPrice,
    preferredBookTitle,
    dfsLines,
    trackedLine: meta.line ?? null,
    trackedOdds: bet.odds ?? null,
    lineMoved:  currentLine  != null && meta.line != null && currentLine  !== meta.line,
    priceMoved: currentPrice != null && bet.odds  != null && currentPrice !== bet.odds,
  };
}

export default buildLiveTracker;
