import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

async function alertsFetch(endpoint, method = 'GET', body = null) {
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

function normalizeUserAlert(raw) {
  return {
    id: raw.id,
    subject: raw.subject,
    body: raw.body,
    displayType: raw.display_type,
    createdAt: raw.created_at,
    isRead: Boolean(raw.is_read),
  };
}

function normalizeAdminAlert(raw) {
  return {
    id: raw.id,
    subject: raw.subject,
    body: raw.body,
    displayType: raw.display_type,
    targetType: raw.target_type,
    targetEmails: raw.target_emails || [],
    createdAt: raw.created_at,
    createdBy: raw.created_by,
    readCount: typeof raw.read_count === 'number' ? raw.read_count : null,
    audienceSize: typeof raw.audience_size === 'number' ? raw.audience_size : null,
  };
}

function normalizeReadEntry(raw) {
  return {
    email: raw.email,
    userId: raw.user_id ?? null,
    readAt: raw.read_at ?? null,
  };
}

// ── Per-user inbox ──────────────────────────────────────────────────────────

export async function getMyAlerts() {
  const data = await alertsFetch('/api/v1/users/me/alerts');
  return Array.isArray(data) ? data.map(normalizeUserAlert) : [];
}

export async function getUnreadModalAlerts() {
  const list = await getMyAlerts();
  return list.filter(a => a.displayType === 'modal' && !a.isRead);
}

export async function markAlertRead(alertId) {
  if (alertId === null || alertId === undefined) return;
  await alertsFetch(`/api/v1/users/me/alerts/${alertId}/read`, 'POST');
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function createAlert(input) {
  const payload = {
    subject: input.subject,
    body: input.body,
    display_type: input.displayType,
    target_type: input.targetType,
    target_emails: input.targetEmails || [],
  };
  const data = await alertsFetch('/api/v1/admin/alerts', 'POST', payload);
  return normalizeAdminAlert(data);
}

export async function listAlerts() {
  const data = await alertsFetch('/api/v1/admin/alerts');
  return Array.isArray(data) ? data.map(normalizeAdminAlert) : [];
}

export async function deleteAlert(alertId) {
  await alertsFetch(`/api/v1/admin/alerts/${alertId}`, 'DELETE');
}

/**
 * GET /api/v1/admin/alerts/{id}/reads
 *
 * Backend returns two shapes (per Feature 1A):
 *   - target_type='specific' → Array<{ email, user_id, read_at }>  (one per targeted email)
 *   - target_type='all'      → { read_count, audience_size, reads: [...] }
 *
 * Both are normalized here to a single client-side shape:
 *   { readCount, audienceSize, reads: [{ email, userId, readAt }], capped }
 *
 * `capped` is true when the 'all' response was truncated (reads.length < read_count).
 */
export async function getAlertReads(alertId) {
  const data = await alertsFetch(`/api/v1/admin/alerts/${alertId}/reads`);

  if (Array.isArray(data)) {
    const reads = data.map(normalizeReadEntry);
    return {
      readCount: reads.filter(r => r.readAt).length,
      audienceSize: reads.length,
      reads,
      capped: false,
    };
  }

  const reads = Array.isArray(data?.reads) ? data.reads.map(normalizeReadEntry) : [];
  const readCount = typeof data?.read_count === 'number' ? data.read_count : reads.length;
  const audienceSize = typeof data?.audience_size === 'number' ? data.audience_size : null;
  return {
    readCount,
    audienceSize,
    reads,
    capped: reads.length < readCount,
  };
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatAlertDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
