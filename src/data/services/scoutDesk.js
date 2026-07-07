/**
 * scoutDesk — client for the Scout Desk endpoint.
 *
 * GET /api/v1/predictions/scout-desk[?refresh=true]  (admin OR user_id in {16};
 * refresh additionally requires admin). Pitcher props only. The server runs the
 * two-stage funnel — Stage 1 audit gate (win% by stat×line×side×high-conviction)
 * → Stage 2 Claude reasoning (last-5, real park factor, opponent form, scout note)
 * → the day's three picks (frozen per ET day) + the shortlisted-but-cut plays.
 *
 * Response (camelCase) — picks[]: { id, gamePk, playerId, pitcherName, market,
 * statType, side, line, selection, odds, modelProb, ev, projection, gap,
 * conviction, audit{winPct,basePct,gapVsBase,sample,...}, reasoning{rationale,
 * context{last5Summary,parkFactor,opponentForm}}, scoutReasoning, analysts[],
 * consensus{level,label} }; plus cut[] and lockedAt.
 *
 * cut[] carries the same full play shape as picks[] (incl. analysts[]) plus a
 * cut-specific `reason`, so the Honorable Mentions open the same War Room drawer
 * — the FE maps cut[] through mapPick and makes a row clickable when analysts[]
 * is present. (Boards frozen before this shipped keep the old trimmed cut[]
 * until regenerated / an admin ?refresh=true.)
 *
 * The Bet Autopsy is layered in client-side from the user's Bet Library.
 */

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';
import betLibraryService, { summarize, unitProfit } from './betLibraryService';
import { settlePendingBets } from './betSettlement';
import predictionsService from './predictionsService';

const ENDPOINT = '/api/v1/predictions/scout-desk';

// ── "available by" unlock time — 4h before first pitch ────────────────────────

const UNLOCK_LEAD_MINS = 240;    // predictions render 4 hours before first pitch
const UNLOCK_CAP_MINS = 16 * 60; // never later than 4:00 PM ET

function isFinalRow(r) {
  const s = (r.status || '').toLowerCase();
  return s === 'final' || s === 'game over' || s === 'completed' || s === 'completed early';
}
function gameMins(g) {
  const t = g.game_time_et || g.game_time || '';
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (m) {
    let h = parseInt(m[1], 10); const min = parseInt(m[2], 10); const mer = m[3].toUpperCase();
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  }
  const p = t.split(':');
  return p.length >= 2 ? parseInt(p[0], 10) * 60 + parseInt(p[1], 10) : 9999;
}
function unlockMins(games) {
  const mins = games.map(gameMins).filter(m => m < 9999);
  if (!mins.length) return null;
  return Math.min(Math.min(...mins) - UNLOCK_LEAD_MINS, UNLOCK_CAP_MINS);
}
function readyLabelFor(games) {
  const u = unlockMins(games);
  if (u === null) return null;
  const h = Math.floor((((u % 1440) + 1440) % 1440) / 60);
  const min = String(u % 60).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${min} ${period} ET`;
}
function isUnlocked(games) {
  const u = unlockMins(games);
  if (u === null) return true; // no scheduled games → nothing to wait on
  const now = new Date();
  const [h, m] = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false }).split(':');
  return (parseInt(h, 10) * 60 + parseInt(m, 10)) >= u;
}

// Persona → icon (server returns key/name/vote/confidence/take)
export const PERSONA_ICON = {
  quant: '📊', sharp: '💹', scout: '🔭', profiler: '🧬', banker: '🏦', contrarian: '⚔️',
};

// Authenticated fetch (apiService doesn't attach the Bearer token).
async function scoutDeskFetch(path, { method = 'GET', signal } = {}) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, signal });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  return data;
}

/**
 * Admin-only: force-regenerate the day's board with the latest data + code,
 * overwriting the frozen row. Runs the full funnel (audit → AI selection →
 * news/injury checks) so it can take up to ~a minute.
 * POST /api/v1/predictions/scout-desk/refresh[?date=YYYY-MM-DD]
 * @param {string} [date] — YYYY-MM-DD; defaults to today ET server-side.
 * @param {Object} [opts]
 * @param {AbortSignal} [opts.signal] — abort the request (e.g. a client timeout).
 * @returns {Promise<{ date, picks, cut, lockedAt, refreshed } | { picks: [], message, refreshed }>}
 */
export async function refreshScoutDesk(date, { signal } = {}) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return scoutDeskFetch(`${ENDPOINT}/refresh${q}`, { method: 'POST', signal });
}

// Win%/prob fields may arrive as fractions (0.842) or percents (84.2) — normalize.
export function toPct(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  const n = Number(v);
  return Math.round((n <= 1 ? n * 100 : n) * 10) / 10;
}

function mapPick(p) {
  return {
    ...p,
    analysts: Array.isArray(p.analysts) ? p.analysts.map(a => ({ ...a, icon: PERSONA_ICON[a.key] || '•' })) : [],
    consensus: p.consensus || { level: 'pass', label: '' },
  };
}

function fmtDate(iso) {
  // 'YYYY-MM-DD' → avoid UTC off-by-one by anchoring midday.
  const d = iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`) : new Date();
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function deskMood(picks) {
  if (!picks.length) return { label: 'Quiet board', text: 'No props cleared the audit gate today — it\'s strict on purpose.' };
  const consensus = picks.filter(p => p.consensus?.level === 'consensus').length;
  const wins = picks.map(p => toPct(p.audit?.winPct)).filter(v => v != null);
  const avgWin = wins.length ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length) : null;
  if (consensus >= 2) return { label: 'High conviction', text: `The room agrees on ${consensus} of today's plays — audit-backed, high win-rate spots.` };
  return { label: 'Audit-backed', text: `Every pick clears the model's proven winning buckets${avgWin ? ` (~${avgWin}% historical)` : ''}.` };
}

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.refresh] — admin force re-pick (?refresh=true)
 */
export async function buildScoutDesk({ refresh = false } = {}) {
  // Settle any due tracked bets first (runs in parallel with the desk fetch) so
  // the Bet Autopsy reflects freshly-final results even if the user never opens
  // the Bet Library page.
  const [deskRes, settleRes, todayRes] = await Promise.all([
    scoutDeskFetch(`${ENDPOINT}${refresh ? '?refresh=true' : ''}`),
    settlePendingBets().catch(() => null),
    predictionsService.getToday().catch(() => []),
  ]);
  const bets = settleRes?.bets ?? await betLibraryService.list().catch(() => []);

  const board = Array.isArray(deskRes?.picks) ? deskRes.picks.map(mapPick) : [];
  const games = (Array.isArray(todayRes) ? todayRes : [])
    .filter(g => g.season_type !== 'spring' && g.season_type !== 'S' && !isFinalRow(g));

  return {
    date: fmtDate(deskRes?.date),
    board,
    lock: board[0] || null,                 // server returns them ranked; the lead is the lock
    // Cut plays carry the same shape as picks (analysts/consensus/reasoning) so
    // they open the same War Room drawer; normalize them the same way.
    cut: Array.isArray(deskRes?.cut) ? deskRes.cut.map(mapPick) : [],
    mood: deskMood(board),
    autopsy: buildAutopsy(bets),
    locked: !!deskRes?.lockedAt,
    lockedAt: deskRes?.lockedAt || null,
    readyLabel: readyLabelFor(games),       // "10:10 AM ET" — when picks unlock
    unlocked: isUnlocked(games),
  };
}

/**
 * Scout Desk track record — the desk's own frozen picks graded against real
 * results (settled on read, server-side). Proves the audit-driven theory.
 * GET /api/v1/predictions/scout-desk/performance[?from=&to=]
 * @returns {Promise<{ summary, days }>}
 */
export async function getScoutDeskPerformance({ from, to } = {}) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const q = qs.toString();
  return scoutDeskFetch(`${ENDPOINT}/performance${q ? `?${q}` : ''}`);
}

// ── Bet Autopsy (computed from the user's tracked Bet Library) ────────────────

export function buildAutopsy(bets) {
  const all = Array.isArray(bets) ? bets : [];
  const settled = all.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'push');
  if (settled.length === 0) return { hasData: false, insights: [], summary: null };

  const s = summarize(all);
  const insights = [];

  const taken = all.filter(b => b.correlation === 'taken');
  const watch = all.filter(b => b.correlation === 'watchlist');
  const takenU = summarize(taken).units, watchU = summarize(watch).units;
  if (taken.length >= 2 && watch.length >= 2 && watchU - takenU > 1) {
    insights.push({ tag: 'leak', text: `Your watchlist would be ${watchU > 0 ? '+' : ''}${watchU.toFixed(1)}u while your taken bets are ${takenU > 0 ? '+' : ''}${takenU.toFixed(1)}u — you're spotting winners but not pulling the trigger.` });
  }

  const fade = all.filter(b => b.isFade);
  if (fade.length >= 2) {
    const fu = summarize(fade).units;
    insights.push({ tag: fu < 0 ? 'warn' : 'good', text: `Your fades of the desk went ${fu > 0 ? '+' : ''}${fu.toFixed(1)}u over ${fade.length} bets — ${fu < 0 ? 'the desk has been right; think twice before fading.' : 'your contrarian read is paying off.'}` });
  }

  const evBets = settled.filter(b => b.ev != null);
  if (evBets.length >= 3) {
    const expected = evBets.reduce((sum, b) => sum + (b.ev / 100), 0);
    const gap = s.units - expected;
    if (Math.abs(gap) >= 1) {
      insights.push({
        tag: gap < 0 ? 'variance' : 'good',
        text: gap < 0
          ? `Luck-adjusted: your bets were +${expected.toFixed(1)}u expected but you're at ${s.units.toFixed(1)}u — you've run ${Math.abs(gap).toFixed(1)}u cold, not bet badly. Stay the course.`
          : `Luck-adjusted: you're ${gap.toFixed(1)}u above expectation — some of this is variance, not edge. Don't overextend.`,
      });
    }
  }

  const byMarket = {};
  for (const b of settled) {
    if (b.status === 'push') continue;
    const u = b.status === 'won' ? unitProfit(b.odds) : -1;
    byMarket[b.market] = byMarket[b.market] || { u: 0, n: 0 };
    byMarket[b.market].u += u; byMarket[b.market].n += 1;
  }
  const markets = Object.entries(byMarket).filter(([, v]) => v.n >= 2).sort((a, b) => b[1].u - a[1].u);
  if (markets.length >= 2) {
    const [bestM, bestV] = markets[0];
    const [worstM, worstV] = markets[markets.length - 1];
    insights.push({ tag: 'info', text: `By market: ${bestM} is your best (${bestV.u > 0 ? '+' : ''}${bestV.u.toFixed(1)}u), ${worstM} your worst (${worstV.u > 0 ? '+' : ''}${worstV.u.toFixed(1)}u). Tilt your volume accordingly.` });
  }

  return {
    hasData: true,
    summary: { record: `${s.wins}-${s.losses}${s.pushes ? `-${s.pushes}` : ''}`, units: s.units, roi: s.roi, settled: s.settled },
    insights,
  };
}

export default buildScoutDesk;
