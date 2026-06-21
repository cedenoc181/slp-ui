import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

// Unlike alertsService / campaignsService, this service does NOT normalize
// snake_case → camelCase. The existing AdminPage + ArticleEditor consumers
// already use snake_case throughout (legacy from the Supabase direct-access
// era). Pass-through keeps the swap a transport-only change.

async function contentFetch(endpoint, method = 'GET', body = null, { authed = true } = {}) {
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

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ── Admin (JWT required) ────────────────────────────────────────────────────

export function adminList({ type, status, q } = {}) {
  return contentFetch(`/api/v1/admin/content-posts${qs({ type, status, q })}`);
}

export function adminGet(id) {
  return contentFetch(`/api/v1/admin/content-posts/${id}`);
}

export function adminCreate(payload) {
  return contentFetch('/api/v1/admin/content-posts', 'POST', payload);
}

export function adminUpdate(id, payload) {
  return contentFetch(`/api/v1/admin/content-posts/${id}`, 'PUT', payload);
}

export function adminDelete(id) {
  return contentFetch(`/api/v1/admin/content-posts/${id}`, 'DELETE');
}

// ── Display-shape transform ─────────────────────────────────────────────────
// Mirrors scripts/syncContentFromApi.js → rowToPost() so the public readers
// can swap a JSON-loaded post for a freshly-fetched one without any field-name
// mismatches. Most notably: hero_image_url/alt → hero_image: { url, alt }.
export function apiPostToDisplay(row) {
  if (!row) return null;
  return {
    id:                   row.id,
    title:                row.title,
    slug:                 row.slug,
    author:               row.author,
    date:                 row.date ? String(row.date).split('T')[0] : null,
    status:               'Final',
    tags:                 row.tags || [],
    summary:              row.summary || '',
    read_time_minutes:    row.read_time_minutes || null,
    estimated_word_count: row.estimated_word_count || null,
    hero_image: {
      url: row.hero_image_url || '',
      alt: row.hero_image_alt || '',
    },
    content:              row.content || [],
    seo:                  row.seo || {},
    affiliate_cta:        row.affiliate_cta || { enabled: false },
    affiliate_disclaimer: row.affiliate_disclaimer || '',
    related_posts:        row.related_posts || [],
    reference_urls:       row.reference_urls || [],
  };
}

// ── Public (no auth) ────────────────────────────────────────────────────────

export function listPublished({ type, limit = 50 } = {}) {
  return contentFetch(
    `/api/v1/content-posts${qs({ type, limit })}`,
    'GET',
    null,
    { authed: false }
  );
}

export function getBySlug(slug) {
  return contentFetch(
    `/api/v1/content-posts/${encodeURIComponent(slug)}`,
    'GET',
    null,
    { authed: false }
  );
}
