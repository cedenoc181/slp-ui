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
    throw new Error(data.detail || data.message || `Request failed (${res.status})`);
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
