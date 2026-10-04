/**
 * trustLedgerService — client for the Trust Ledger endpoint.
 *
 * GET /api/v1/predictions/scout-desk/trust-ledger[?date=YYYY-MM-DD&postseason=true|false]
 * Gated to premium subscribers, admins, or the early-access allowlist —
 * anyone else gets 403 { detail: "Premium subscription required" }. That
 * gate is decided server-side (the allowlist isn't known client-side), so
 * callers should attempt the fetch and branch on `err.status === 403`
 * rather than pre-checking a client `isPremium` flag.
 *
 * `postseason` (default false) narrows the response to just the teams that
 * qualified for the playoffs (everyone else is simply absent, not greyed
 * out) — but `trustPercentile` stays ranked against the full 30-team league
 * even in that mode, not recomputed over just the playoff field. Never
 * re-rank or relabel it client-side.
 *
 * Response: an array of team objects, already sorted by trustScore
 * descending (unscored teams sink to the bottom) — 30 elements normally, up
 * to 12 when postseason=true (can be fewer right as the bracket is still
 * forming; no special handling needed beyond not assuming exactly 12).
 * Cached server-side for 5 minutes per (date, postseason) pair — safe to
 * poll on that interval.
 */

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

const ENDPOINT = '/api/v1/predictions/scout-desk/trust-ledger';

async function trustLedgerFetch(path, { signal } = {}) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { headers, signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * @param {string} [date] — YYYY-MM-DD; defaults to today (ET) server-side.
 * @param {Object} [opts]
 * @param {boolean} [opts.postseason] — true narrows to the playoff field; defaults to false server-side.
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<Array>} team objects (see endpoint doc for shape).
 */
export async function getTrustLedger(date, { postseason, signal } = {}) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (postseason) params.set('postseason', 'true');
  const q = params.toString();
  return trustLedgerFetch(`${ENDPOINT}${q ? `?${q}` : ''}`, { signal });
}

const trustLedgerService = { getTrustLedger };
export default trustLedgerService;
