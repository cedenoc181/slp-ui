/**
 * Bet Library service.
 *
 * Per-user "track bets you like" feature. Lets any signed-in user save picks
 * they've either *taken* or on their *watchlist* (their correlation to the bet) along
 * with the Scout AI prompt, odds, model probability, EV, and confidence —
 * building a flat 1-unit profit/loss + ROI record across all picks.
 *
 * Two interchangeable backends share one method surface (list / add / update /
 * remove / clear, all Promise-based):
 *   - LocalBetLibrary — browser localStorage (key `spa_bet_library_v1`). Active.
 *   - ApiBetLibrary   — REST `/api/v1/bet-library` (see NeedsWiring.txt →
 *                       BET LIBRARY / P&L TRACKER). Flip USE_BACKEND once the
 *                       endpoints are live; no page-level changes are needed.
 *
 * Bet record shape:
 * {
 *   id:             string,
 *   createdAt:      ISO string,
 *   correlation:    'taken' | 'watchlist',
 *   matchup:        string,                 // "NYY @ BOS"
 *   market:         string,                 // "Moneyline" | "Total" | "Strikeouts" ...
 *   selection:      string,                 // "Boston Red Sox ML" | "Over 7.5"
 *   odds:           number,                 // American odds at time of pick
 *   modelProb:      number | null,          // model win probability %
 *   ev:             number | null,          // expected value %
 *   confidence:     number | null,          // 0–5 (0 = muted; user faded Scout AI)
 *   scoutPrompt:    string,                 // Scout AI reasoning captured
 *   gamePk:         number | null,
 *   isFade:         boolean,                // bet is against Scout AI's side
 *   grade:          object | null,          // opaque auto-settle descriptor
 *   gameStartEpoch: number | null,          // first-pitch epoch ms (settle delay)
 *   status:         'pending' | 'won' | 'lost' | 'push',
 *   settledAt:      ISO string | null
 * }
 */

import { API_BASE_URL, IS_DEV, LOCAL_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

const LS_KEY   = 'spa_bet_library_v1';
const API_BASE = '/api/v1/bet-library';

// Mirrors apiService.js's local→remote fallback (dev only). betLibraryFetch
// can't just reuse ApiService's request() since that layer doesn't attach
// auth headers for this user-scoped route — but it still needs the same
// local-first behavior, or a running local backend never actually gets hit.
async function fetchWithLocalFallback(endpoint, config) {
  if (!IS_DEV || !LOCAL_URL) {
    return fetch(`${API_BASE_URL}${endpoint}`, config);
  }
  try {
    return await fetch(`${LOCAL_URL}${endpoint}`, config);
  } catch (err) {
    if (err instanceof TypeError) return fetch(`${API_BASE_URL}${endpoint}`, config); // local unreachable
    throw err;
  }
}

// Authenticated fetch — injects the user's Bearer token and reads the `detail`
// error field, mirroring alertsService / campaignsService (the apiService cache
// layer doesn't attach auth, so user-scoped routes need this).
async function betLibraryFetch(endpoint, method = 'GET', body = null) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithLocalFallback(endpoint, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  }
  return data;
}

// Backend is live: /api/v1/bet-library (camelCase, any signed-in user, user-scoped).
// gameStartEpoch is epoch ms; createdAt/settledAt are ISO strings — a true
// drop-in, so mapRecord needs no remapping. Call migrateLocalToBackend() once
// to carry over any bets saved on this device.
const USE_BACKEND = true;

// ── Internal localStorage helpers ─────────────────────────────────────────────

function readAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(bets) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(bets));
  } catch {
    // Quota exceeded — silently skip; in-memory state still reflects the change.
  }
  return bets;
}

function makeId() {
  return `bet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Canonical, normalized field set shared by both backends (no id/createdAt — the
// store owns those). Keeps localStorage and the API payload identical.
function buildPayload(bet) {
  return {
    correlation:    (bet.correlation === 'watchlist' || bet.correlation === 'watched') ? 'watchlist' : 'taken',
    matchup:        bet.matchup ?? '',
    market:         bet.market ?? '',
    selection:      bet.selection ?? '',
    odds:           bet.odds != null ? Number(bet.odds) : null,
    modelProb:      bet.modelProb != null ? Number(bet.modelProb) : null,
    ev:             bet.ev != null ? Number(bet.ev) : null,
    confidence:     bet.confidence != null ? Number(bet.confidence) : null,
    scoutPrompt:    bet.scoutPrompt ?? '',
    gamePk:         bet.gamePk ?? null,
    isFade:         bet.isFade === true,
    grade:          bet.grade ?? null,
    gameStartEpoch: bet.gameStartEpoch ?? null,
    status:         bet.status ?? 'pending',
  };
}

// Normalize a record coming back from the API/store into the FE shape.
// Assumes the server returns camelCase (the requested default). If the backend
// returns snake_case instead, remap here once — e.g.:
//   createdAt: r.created_at, settledAt: r.settled_at,
//   gameStartEpoch: r.game_start ? new Date(r.game_start).getTime() : null
function mapRecord(r) {
  if (!r) return r;
  const rec = { ...r };
  if (rec.correlation === 'watched') rec.correlation = 'watchlist'; // legacy
  return rec;
}

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

// ── Repair for batter props tracked before the Scout-pick parsing fix ─────────
// Scout batter picks arrive as pick "Over 1.5" (line null); older tracking code
// used that whole string as the side, so those bets were saved as
//   selection "José Ramírez Over 1.5 1.5 Total Bases", grade.side "Over 1.5".
// The grader only treats side === 'Over' as an Over, so such Over bets were
// settled as Unders. repairBet() fixes the text and the side, and sends an
// Over bet that already settled back to 'pending' so it regrades correctly.
// Returns { bet, patch } — patch is null when nothing needed fixing.
const DOUBLED_LINE = /\b(Over|Under)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\b/i;

export function repairBet(bet) {
  if (!bet) return { bet, patch: null };
  const patch = {};
  const g = bet.grade;
  let side = null;
  let line = g?.line ?? null;

  const m = typeof g?.side === 'string' ? g.side.match(/^(over|under)\s+([-+]?\d+(?:\.\d+)?)/i) : null;
  if (m && (g.type === 'batter_prop' || g.type === 'pitcher_prop')) {
    side = m[1].toLowerCase() === 'over' ? 'Over' : 'Under';
    if (line == null) line = Number(m[2]);
    patch.grade = { ...g, side, line };
    // Graded as an Under by mistake → let settlement regrade it.
    if (side === 'Over' && (bet.status === 'won' || bet.status === 'lost')) patch.status = 'pending';
  }

  const sel = typeof bet.selection === 'string' ? bet.selection.match(DOUBLED_LINE) : null;
  if (sel) {
    const fixedSide = side ?? (sel[1].toLowerCase() === 'over' ? 'Over' : 'Under');
    const fixedLine = line ?? Number(sel[3]); // the saved grade line is the one the odds were priced at
    patch.selection = bet.selection.replace(DOUBLED_LINE, `${fixedSide} ${fixedLine}`);
  }

  if (!Object.keys(patch).length) return { bet, patch: null };
  const fixed = { ...bet, ...patch };
  if (patch.status === 'pending') fixed.settledAt = null;
  return { bet: fixed, patch };
}

// Repairs a freshly listed set and persists each fix through `save(id, patch)`.
// Awaited so a following settlement pass sees the corrected (pending) bets.
async function repairAll(bets, save) {
  const results = bets.map(repairBet);
  await Promise.allSettled(results.filter(r => r.patch).map(r => save(r.bet.id, r.patch)));
  return results.map(r => r.bet);
}

// ── American-odds → profit math (flat 1-unit stake) ───────────────────────────

/**
 * Profit (in units) on a winning 1-unit bet at the given American odds.
 *  +150  → +1.50    (decimal 2.50, profit 1.50)
 *  -200  → +0.50    (decimal 1.50, profit 0.50)
 */
export function unitProfit(odds) {
  if (odds == null || Number.isNaN(odds)) return 0;
  return odds > 0 ? odds / 100 : 100 / Math.abs(odds);
}

/**
 * Settled P/L (in units) for a single bet, flat 1-unit stake.
 *   won → +unitProfit(odds) · lost → -1 · push/pending → 0
 */
export function betPL(bet) {
  switch (bet.status) {
    case 'won':  return unitProfit(bet.odds);
    case 'lost': return -1;
    default:     return 0; // push / pending
  }
}

/**
 * Aggregate summary across a set of bets.
 * @returns {{
 *   total:number, pending:number, settled:number,
 *   wins:number, losses:number, pushes:number,
 *   units:number, roi:number|null, winRate:number|null
 * }}
 */
export function summarize(bets) {
  const total   = bets.length;
  const wins    = bets.filter(b => b.status === 'won').length;
  const losses  = bets.filter(b => b.status === 'lost').length;
  const pushes  = bets.filter(b => b.status === 'push').length;
  const pending = bets.filter(b => b.status === 'pending').length;
  const settled = wins + losses + pushes;

  const units = bets.reduce((sum, b) => sum + betPL(b), 0);
  // ROI is over total units risked. Pushes return the stake, so they don't risk units.
  const risked  = wins + losses;
  const roi     = risked > 0 ? (units / risked) * 100 : null;
  const winRate = risked > 0 ? (wins / risked) * 100 : null;

  return { total, pending, settled, wins, losses, pushes, units, roi, winRate };
}

// ── localStorage backend (active until the API is wired) ──────────────────────

class LocalBetLibrary {
  /** All tracked bets, newest first. Legacy 'watched' records map to 'watchlist'. */
  async list() {
    const bets = readAll().map(mapRecord);
    const repaired = bets.map(b => repairBet(b).bet);
    if (repaired.some((b, i) => b !== bets[i])) {
      const byId = Object.fromEntries(repaired.map(b => [b.id, b]));
      writeAll(readAll().map(b => byId[b.id] || b));
    }
    return repaired.sort(byNewest);
  }

  /** Track a new bet. Fills in id, createdAt, and normalized defaults. */
  async add(bet) {
    const record = {
      id:        makeId(),
      createdAt: new Date().toISOString(),
      ...buildPayload(bet),
      settledAt: null,
    };
    const all = readAll();
    all.push(record);
    writeAll(all);
    return record;
  }

  /** Patch a tracked bet by id. Stamps settledAt when moving to a final status. */
  async update(id, patch) {
    const all = readAll();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const next = { ...all[idx], ...patch };
    if (patch.status && patch.status !== 'pending' && !all[idx].settledAt) {
      next.settledAt = new Date().toISOString();
    }
    if (patch.status === 'pending') next.settledAt = null;
    all[idx] = next;
    writeAll(all);
    return next;
  }

  /** Remove a tracked bet by id. */
  async remove(id) {
    writeAll(readAll().filter(b => b.id !== id));
    return true;
  }

  /** Clear the entire library. */
  async clear() {
    writeAll([]);
    return true;
  }
}

// ── REST backend (per-user, any signed-in user) ───────────────────────────────

class ApiBetLibrary {
  /** GET /api/v1/bet-library — caller's bets, newest first. */
  async list() {
    const rows = await betLibraryFetch(API_BASE, 'GET');
    const bets = (Array.isArray(rows) ? rows : []).map(mapRecord);
    // Best effort: if the server rejects a patch the fixed values still show,
    // and the repair is retried on the next load.
    const repaired = await repairAll(bets, (id, patch) => betLibraryFetch(`${API_BASE}/${id}`, 'PATCH', patch));
    return repaired.sort(byNewest);
  }

  /** POST /api/v1/bet-library — server sets id/createdAt and applies defaults. */
  async add(bet) {
    const rec = await betLibraryFetch(API_BASE, 'POST', buildPayload(bet));
    return mapRecord(rec);
  }

  /** PATCH /api/v1/bet-library/{id} — server stamps settled_at on terminal status. */
  async update(id, patch) {
    const rec = await betLibraryFetch(`${API_BASE}/${id}`, 'PATCH', patch);
    return mapRecord(rec);
  }

  /** DELETE /api/v1/bet-library/{id}. */
  async remove(id) {
    await betLibraryFetch(`${API_BASE}/${id}`, 'DELETE');
    return true;
  }

  /** DELETE /api/v1/bet-library — clears the caller's library. */
  async clear() {
    await betLibraryFetch(API_BASE, 'DELETE');
    return true;
  }
}

/**
 * One-time migration: push any bets saved in this device's localStorage to the
 * backend, then clear local. Safe to call repeatedly (no-op once local is empty).
 * Note: createdAt is reset to the server's insert time; relative order is kept.
 * Run this once after flipping USE_BACKEND = true.
 */
export async function migrateLocalToBackend() {
  if (!USE_BACKEND) return { migrated: 0, reason: 'backend disabled' };
  const local = readAll();
  let migrated = 0;
  for (const bet of local) {
    try {
      await betLibraryFetch(API_BASE, 'POST', buildPayload(bet));
      migrated += 1;
    } catch {
      // leave un-migrated bets in localStorage so a retry can pick them up
    }
  }
  if (migrated === local.length) writeAll([]);
  return { migrated, total: local.length };
}

const betLibraryService = USE_BACKEND ? new ApiBetLibrary() : new LocalBetLibrary();
export default betLibraryService;
