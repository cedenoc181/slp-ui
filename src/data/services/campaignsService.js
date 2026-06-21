import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

async function campaignsFetch(endpoint, method = 'GET', body = null, { authed = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authed) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function normalizeCampaign(raw) {
  return {
    id: raw.id,
    subject: raw.subject,
    audience: raw.audience,
    recipientCount: typeof raw.recipient_count === 'number' ? raw.recipient_count : 0,
    sentAt: raw.sent_at,
    status: raw.status,
  };
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function listCampaigns() {
  const data = await campaignsFetch('/api/v1/admin/campaigns');
  return Array.isArray(data) ? data.map(normalizeCampaign) : [];
}

/**
 * DELETE /api/v1/admin/campaigns/{id}  (Feature 11)
 *
 * Hard-deletes the campaign row. Sent emails are not recalled — this
 * only removes the historical record from the admin dashboard. 404 is
 * treated as a silent success by the caller (race: another tab already
 * deleted it; end state is the same).
 */
export async function deleteCampaign(id) {
  await campaignsFetch(`/api/v1/admin/campaigns/${id}`, 'DELETE');
}

/**
 * GET /api/v1/admin/campaigns/{id}  (Feature 10)
 *
 * Returns the full campaign row including raw markdown body + CTA fields,
 * so the admin detail drawer can render the same EmailPreview as the
 * composer's live preview.
 */
export async function getCampaign(id) {
  const data = await campaignsFetch(`/api/v1/admin/campaigns/${id}`);
  if (!data || typeof data !== 'object') return null;
  return {
    id:             data.id,
    subject:        data.subject || '',
    body:           data.body || '',
    ctaLabel:       data.cta_label ?? null,
    ctaUrl:         data.cta_url ?? null,
    audience:       data.audience,
    recipientCount: typeof data.recipient_count === 'number' ? data.recipient_count : 0,
    status:         data.status,
    sentAt:         data.sent_at ?? null,
    createdAt:      data.created_at,
    createdBy:      data.created_by ?? null,
  };
}

export async function getAudienceCounts() {
  const data = await campaignsFetch('/api/v1/admin/campaigns/audience-counts');
  return {
    all:     typeof data?.all     === 'number' ? data.all     : 0,
    free:    typeof data?.free    === 'number' ? data.free    : 0,
    premium: typeof data?.premium === 'number' ? data.premium : 0,
    weekly:  typeof data?.weekly  === 'number' ? data.weekly  : 0,
    monthly: typeof data?.monthly === 'number' ? data.monthly : 0,
    annual:  typeof data?.annual  === 'number' ? data.annual  : 0,
    lapsed:  typeof data?.lapsed  === 'number' ? data.lapsed  : 0,
  };
}

export async function sendTestCampaign({ subject, body, ctaLabel, ctaUrl, toEmail }) {
  return campaignsFetch('/api/v1/admin/campaigns/test', 'POST', {
    subject,
    body,
    cta_label: ctaLabel || null,
    cta_url: ctaUrl || null,
    to_email: toEmail,
  });
}

export async function sendCampaign({ subject, body, ctaLabel, ctaUrl, audience }) {
  const data = await campaignsFetch('/api/v1/admin/campaigns/send', 'POST', {
    subject,
    body,
    cta_label: ctaLabel || null,
    cta_url: ctaUrl || null,
    audience,
  });
  return {
    id: data?.id,
    recipientCount: typeof data?.recipient_count === 'number' ? data.recipient_count : 0,
    sentAt: data?.sent_at,
    status: data?.status,
  };
}

// ── Public (no auth) ────────────────────────────────────────────────────────

export async function unsubscribe(token) {
  return campaignsFetch('/api/v1/unsubscribe', 'POST', { token }, { authed: false });
}
