import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

/*
  Admin-only winter-league (CBPC) moneyline model routes. Every call sends the
  admin's bearer token; the server answers 403 to anyone else. Only the admin
  Winter Moneyline page (/admin/winter-moneyline) may use this.

  Responses are cached for at most 5 minutes; refresh({ fresh: true }) skips
  the cache. Errors keep their HTTP status (403 → send to login, 404 → no
  model for that league).

  Contract: docs/cbpc_api_contract.md in the API repo, "Moneyline model
  (admins only)".
*/

export const MONEYLINE_LEAGUES = ['lidom', 'lvbp', 'lmp', 'lbprc']; // never cs: no model

const TTL = 5 * 60 * 1000;
const cache = new Map(); // path → { data, expiresAt }

export class AdminApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function qs(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

async function get(path, { fresh = false } = {}) {
  const hit = cache.get(path);
  if (!fresh && hit && Date.now() < hit.expiresAt) return hit.data;
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AdminApiError(res.status, typeof body.detail === 'string' ? body.detail : `Request failed (${res.status})`);
  }
  const data = await res.json();
  cache.set(path, { data, expiresAt: Date.now() + TTL });
  return data;
}

const cbpcAdminService = {
  /** A day's predictions (date YYYY-MM-DD, ET; default today). */
  getMoneyline: (league, date, opts) =>
    get(`/cbpc/${league}/admin/predictions/moneyline${qs({ date })}`, opts),
  /** Settled-game performance; no dates = the whole season. */
  getPerformance: (league, { season, startDate, endDate } = {}, opts) =>
    get(`/cbpc/${league}/admin/predictions/moneyline/performance${qs({ season, start_date: startDate, end_date: endDate })}`, opts),
};

export default cbpcAdminService;
