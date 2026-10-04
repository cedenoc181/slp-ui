/**
 * betGrader — settles tracked bets from authoritative game results.
 *
 * Uses the same schedule data the MLB schedule page relies on to flip live
 * games to Final (scheduleService getTodayGames / getPriorGames →
 * GameLogSchema: status, winning_team_id, home_runs_score, away_runs_score).
 *
 * Each tracked bet carries a `grade` descriptor (set when the bet is selected)
 * describing how to settle it:
 *   moneyline    → { type:'moneyline', teamId }
 *   runline      → { type:'runline', side:'home'|'away', line }            (±1.5)
 *   total        → { type:'total',   side:'over'|'under', line }
 *   pitcher_prop → { type:'pitcher_prop', side, line, statType, playerId }  (graded server-side)
 *   batter_prop  → { type:'batter_prop',  side, line, statType, playerId }  (graded server-side)
 *
 * gradeBet() returns 'won' | 'lost' | 'push' | null. null = can't settle yet
 * (game not final, missing data, or a market not graded client-side).
 */

const FINAL_STATUSES = ['final', 'game over', 'completed', 'completed early'];

export function isGameFinal(game) {
  return FINAL_STATUSES.includes((game?.status || '').toLowerCase());
}

function num(v) {
  return v == null || Number.isNaN(Number(v)) ? null : Number(v);
}

/**
 * Epoch (ms) of first pitch from a game row's date + ET time.
 * MLB season runs on Eastern Daylight Time (UTC-4); the final-status check is
 * the real correctness guard, so this only needs to be close enough to gate
 * when we start polling for a result.
 */
export function gameStartEpoch(game) {
  if (!game) return null;
  const date = game.date || game.game_date;
  const t = game.game_time_et || game.game_time || '';
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!date || !m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  const iso = `${date}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00-04:00`;
  const epoch = new Date(iso).getTime();
  return Number.isNaN(epoch) ? null : epoch;
}

/** Hours after first pitch before we attempt to settle a bet. */
export const SETTLE_DELAY_MS = 2.5 * 60 * 60 * 1000;

/** True when enough time has passed since first pitch to look for a result. */
export function isSettleDue(bet, now = Date.now()) {
  if (bet.gameStartEpoch == null) return true; // no start time → rely on final status
  return now >= bet.gameStartEpoch + SETTLE_DELAY_MS;
}

/**
 * Settle a single bet against its final game record.
 * @returns {'won'|'lost'|'push'|null}
 */
export function gradeBet(bet, game) {
  const meta = bet?.grade;
  if (!meta || !game || !isGameFinal(game)) return null;

  const home = num(game.home_runs_score);
  const away = num(game.away_runs_score);

  switch (meta.type) {
    case 'moneyline': {
      let winnerId = game.winning_team_id ?? null;
      if (winnerId == null && home != null && away != null && home !== away) {
        winnerId = home > away ? game.home_team_id : game.away_team_id;
      }
      if (winnerId == null || meta.teamId == null) return null;
      return meta.teamId === winnerId ? 'won' : 'lost';
    }
    case 'runline': {
      if (home == null || away == null || meta.line == null) return null;
      // Pick covers when its score plus the spread beats the opponent. ±1.5 never pushes.
      const covers = meta.side === 'home'
        ? home + meta.line > away
        : away + meta.line > home;
      return covers ? 'won' : 'lost';
    }
    case 'total': {
      if (home == null || away == null || meta.line == null) return null;
      const total = home + away;
      if (total === meta.line) return 'push';
      const wentOver = total > meta.line;
      return (meta.side === 'over') === wentOver ? 'won' : 'lost';
    }
    default:
      return null; // pitcher_prop / batter_prop — settle via gradePlayerProp()
  }
}

/**
 * Settle a player prop from the player's actual final stat for the game.
 * The value comes from the per-game H2H box score (see liveBetTracker
 * getPlayerPropActual); this just compares it to the bet's line + side.
 *   meta = { type:'pitcher_prop'|'batter_prop', side:'Over'|'Under', line, ... }
 * @returns {'won'|'lost'|'push'|null}  null = not gradable (no value / bad meta)
 */
export function gradePlayerProp(meta, value) {
  if (!meta || (meta.type !== 'pitcher_prop' && meta.type !== 'batter_prop')) return null;
  const v = num(value);
  if (v == null || meta.line == null || !meta.side) return null;
  if (v === meta.line) return 'push'; // integer line landed exactly (e.g. line 6, value 6)
  const isOver   = meta.side === 'Over' || meta.side === 'over';
  const wentOver = v > meta.line;
  return isOver === wentOver ? 'won' : 'lost';
}
