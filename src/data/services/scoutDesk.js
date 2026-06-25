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
 * The Bet Autopsy is layered in client-side from the user's Bet Library.
 */

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';
import betLibraryService, { summarize, unitProfit } from './betLibraryService';

const ENDPOINT = '/api/v1/predictions/scout-desk';

// Persona → icon (server returns key/name/vote/confidence/take)
export const PERSONA_ICON = {
  quant: '📊', sharp: '💹', scout: '🔭', profiler: '🧬', banker: '🏦', contrarian: '⚔️',
};

// Authenticated fetch (apiService doesn't attach the Bearer token).
async function scoutDeskFetch(path) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  return data;
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
  if (!picks.length) return { label: 'Quiet board', text: 'No pitcher props cleared the audit gate today — it\'s strict on purpose.' };
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
  const [deskRes, bets] = await Promise.all([
    scoutDeskFetch(`${ENDPOINT}${refresh ? '?refresh=true' : ''}`),
    betLibraryService.list().catch(() => []),
  ]);

  const board = Array.isArray(deskRes?.picks) ? deskRes.picks.map(mapPick) : [];
  return {
    date: fmtDate(deskRes?.date),
    board,
    lock: board[0] || null,                 // server returns them ranked; the lead is the lock
    cut: Array.isArray(deskRes?.cut) ? deskRes.cut : [],
    mood: deskMood(board),
    autopsy: buildAutopsy(bets),
    locked: !!deskRes?.lockedAt,
    lockedAt: deskRes?.lockedAt || null,
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
