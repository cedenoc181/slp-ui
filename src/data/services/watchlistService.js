/**
 * watchlistService — client for the per-user team watchlist (Terminal panel).
 *
 * PROPOSED CONTRACT — not yet implemented on the API:
 *   GET /api/v1/users/me/watchlist → { team_ids: number[] }
 *   PUT /api/v1/users/me/watchlist   body { team_ids: number[] } → { team_ids: number[] }
 *
 * team_ids use the same internal team id as users.favorite_team_id
 * (TEAM_IDS in apiConstants). Until the endpoint ships, GET responds 404 —
 * callers branch on `err.status === 404` and fall back to favorite_team_id.
 */

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

const ENDPOINT = '/api/v1/users/me/watchlist';

async function watchlistFetch(method = 'GET', body = null) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const watchlistService = {
  /** @returns {Promise<number[]>} the caller's watched team ids */
  async get() {
    const data = await watchlistFetch('GET');
    return Array.isArray(data?.team_ids) ? data.team_ids : [];
  },

  /** Replace the caller's watchlist. @returns {Promise<number[]>} */
  async set(teamIds) {
    const data = await watchlistFetch('PUT', { team_ids: teamIds });
    return Array.isArray(data?.team_ids) ? data.team_ids : teamIds;
  },
};

export default watchlistService;
