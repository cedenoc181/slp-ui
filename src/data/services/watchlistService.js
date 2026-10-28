/**
 * watchlistService — client for the per-user watchlist (Terminal panel).
 * A watchlist holds whole teams and individual players.
 *
 * API (full field reference: docs/watchlist_api_contract.md in the API repo):
 *   GET /api/v1/users/me/watchlist                → Watchlist
 *   PUT /api/v1/users/me/watchlist  { team_ids?, player_ids? } → Watchlist
 *     Each key sent replaces that whole type; an omitted key is left alone, so
 *     we only ever send the type that changed. Array order = display order.
 *   Watchlist = { team_ids, player_ids, items: [{ entity_type, entity_id, name,
 *     team_id, mlb_id, name_slug, position, active, added_at, locked, ... }] }
 *
 * team_ids are internal team ids (users.favorite_team_id); player_ids are
 * internal players.id (the `id` from /players/search), not mlb_id. A player's
 * team_id is their CURRENT team, read live server-side.
 *
 * Errors: 404 = endpoint not deployed yet → callers use the on-device store
 * below. 401 = auth failure (no local fallback). 422 = { detail } — nothing
 * was saved; err.message carries the detail for the UI.
 *
 * For a user who never saved, GET returns their favorite team (added_at null)
 * without saving it, so the client must not seed it again when on the server.
 * The response to every write is the new source of truth; GET is cached
 * ~60s server-side and cleared on writes, so don't re-fetch after a write.
 */

import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

const ENDPOINT = '/api/v1/users/me/watchlist';

export const WATCHLIST_LIMITS = { teams: 30, players: 50 };

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

// Normalises a Watchlist response. Players carry their display fields from
// `items`; any id without an item comes back as { id } and the caller fills
// it in. Team items keep the server's premium flag (`locked`).
function parse(data) {
  const teamIds = Array.isArray(data?.team_ids) ? data.team_ids : [];
  const playersSupported = Array.isArray(data?.player_ids);
  const items = Array.isArray(data?.items) ? data.items : [];
  const details = {};
  const teamMeta = {};
  items.forEach(it => {
    if (it?.entity_type === 'player') {
      details[it.entity_id] = {
        id: it.entity_id,
        name: it.name ?? null,
        teamId: it.team_id ?? null,
        mlbId: it.mlb_id ?? null,
        slug: it.name_slug ?? null,
        position: it.position ?? null,
        active: it.active !== false,
        addedAt: it.added_at ?? null,
      };
    } else if (it?.entity_type === 'team') {
      teamMeta[it.entity_id] = { locked: !!it.locked, addedAt: it.added_at ?? null };
    }
  });
  const players = (playersSupported ? data.player_ids : []).map(id => details[id] || { id });
  return { teamIds, players, playersSupported, teamMeta };
}

// ── On-device fallback (until the endpoint ships) ───────────────────────────
function localKey(userId) {
  return `slt-watchlist:${userId ?? 'guest'}`;
}

function loadLocal(userId, favoriteTeamId) {
  try {
    const saved = JSON.parse(localStorage.getItem(localKey(userId)));
    if (saved && Array.isArray(saved.teamIds) && Array.isArray(saved.players)) {
      return { teamIds: saved.teamIds, players: saved.players, playersSupported: true };
    }
  } catch {}
  return { teamIds: favoriteTeamId != null ? [favoriteTeamId] : [], players: [], playersSupported: true };
}

function saveLocal(userId, { teamIds, players }) {
  try { localStorage.setItem(localKey(userId), JSON.stringify({ teamIds, players })); } catch {}
}

const watchlistService = {
  /** @returns {Promise<{ teamIds: number[], players: Array, playersSupported: boolean }>} */
  async get() {
    return parse(await watchlistFetch('GET'));
  },

  /** Replace the watched teams only (players untouched). */
  async setTeams(teamIds) {
    return parse(await watchlistFetch('PUT', { team_ids: teamIds }));
  },

  /** Replace the watched players only (teams untouched). */
  async setPlayers(playerIds) {
    return parse(await watchlistFetch('PUT', { player_ids: playerIds }));
  },

  loadLocal,
  saveLocal,
};

export default watchlistService;
