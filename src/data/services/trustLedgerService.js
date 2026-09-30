/**
 * trustLedgerService — client for the Trust Ledger endpoint.
 *
 * GET /api/v1/predictions/scout-desk/trust-ledger[?date=YYYY-MM-DD]
 * Gated to premium subscribers, admins, or the early-access allowlist —
 * anyone else gets 403 { detail: "Premium subscription required" }. That
 * gate is decided server-side (the allowlist isn't known client-side), so
 * callers should attempt the fetch and branch on `err.status === 403`
 * rather than pre-checking a client `isPremium` flag.
 *
 * Response: an array of 30 team objects, already sorted by trustScore
 * descending (unscored teams sink to the bottom). Cached server-side for
 * 5 minutes — safe to poll on that interval.
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
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<Array>} 30 team objects (see endpoint doc for shape).
 */
export async function getTrustLedger(date, { signal } = {}) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return trustLedgerFetch(`${ENDPOINT}${q}`, { signal });
}

const trustLedgerService = { getTrustLedger };
export default trustLedgerService;
