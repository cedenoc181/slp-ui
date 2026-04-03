import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

// ---------------------------------------------------------------------------
// Internal fetch helper — always injects the current Bearer token
// ---------------------------------------------------------------------------
async function profileFetch(endpoint, method = 'GET', body = null) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
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

// ---------------------------------------------------------------------------
// User profile service
// ---------------------------------------------------------------------------
const userProfileService = {
  /**
   * GET /api/v1/users/me → UserResponse
   * Full profile: display_name, favorite_team, is_verified, preferences, etc.
   */
  getProfile: () =>
    profileFetch('/api/v1/users/me'),

  /**
   * PATCH /api/v1/users/me → UserResponse
   * Update display_name and/or favorite_team.
   * Body: { display_name?, favorite_team? }
   */
  updateProfile: (fields) =>
    profileFetch('/api/v1/users/me', 'PATCH', fields),

  /**
   * PATCH /api/v1/users/me/preferences → UserResponse
   * Update notification preferences.
   * Body: { email_updates?, weekly_digest?, breaking_news? }
   */
  updatePreferences: (prefs) =>
    profileFetch('/api/v1/users/me/preferences', 'PATCH', prefs),

  /**
   * POST /api/v1/users/me/change-password
   * Body: { current_password, new_password }
   */
  changePassword: (current_password, new_password) =>
    profileFetch('/api/v1/users/me/change-password', 'POST', { current_password, new_password }),

  /**
   * DELETE /api/v1/users/me → 204
   * Soft-deletes the account and revokes all sessions.
   */
  deleteAccount: () =>
    profileFetch('/api/v1/users/me', 'DELETE'),

  /**
   * GET /api/v1/users/me/sessions → SessionResponse[]
   * Lists all active sessions for the current user.
   */
  getSessions: () =>
    profileFetch('/api/v1/users/me/sessions'),

  /**
   * DELETE /api/v1/users/me/sessions/{sessionId} → 204
   * Revokes a specific session by ID.
   */
  revokeSession: (sessionId) =>
    profileFetch(`/api/v1/users/me/sessions/${sessionId}`, 'DELETE'),
};

export default userProfileService;
