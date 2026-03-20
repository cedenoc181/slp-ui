import { API_BASE_URL } from '../config/apiConfig';

// ---------------------------------------------------------------------------
// In-memory access token
// AuthContext is the sole writer; other services call getAccessToken() to
// inject the Bearer header into protected requests.
// ---------------------------------------------------------------------------
let _accessToken = null;

export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;

// ---------------------------------------------------------------------------
// Internal fetch helper
// Handles 204 No Content and maps FastAPI's `detail` field to Error.message
// ---------------------------------------------------------------------------
async function authFetch(endpoint, body = null, withAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (withAuth && _accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  // 204 No Content — logout endpoints
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // FastAPI uses `detail` for HTTPException messages
    throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Auth service methods
// ---------------------------------------------------------------------------
const userAuthService = {
  /**
   * POST /auth/register
   * Returns UserResponse { id, email, is_active, is_admin, created_at, ... }
   */
  register: (email, password) =>
    authFetch('/auth/register', { email, password }),

  /**
   * POST /auth/login
   * Returns TokenResponse { access_token, refresh_token, token_type, expires_in }
   */
  login: (email, password) =>
    authFetch('/auth/login', { email, password }),

  /**
   * POST /auth/refresh
   * Returns TokenResponse with new access_token (same refresh_token)
   */
  refreshToken: (refresh_token) =>
    authFetch('/auth/refresh', { refresh_token }),

  /**
   * POST /auth/logout  → 204
   * Revokes the refresh token session on the server.
   */
  logout: (refresh_token) =>
    authFetch('/auth/logout', { refresh_token }),

  /**
   * POST /auth/logout-all  → 204
   * Revokes ALL sessions for the current user (requires valid access token).
   */
  logoutAll: () =>
    authFetch('/auth/logout-all', {}, true),

  /**
   * POST /auth/password-reset-request
   * Always returns 202 — safe against email enumeration.
   */
  requestPasswordReset: (email) =>
    authFetch('/auth/password-reset-request', { email }),

  /**
   * POST /auth/password-reset
   * Completes the reset using the token from the email link.
   */
  resetPassword: (token, new_password) =>
    authFetch('/auth/password-reset', { token, new_password }),
};

export default userAuthService;
