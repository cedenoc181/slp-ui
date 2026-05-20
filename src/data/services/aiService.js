import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

async function aiFetch(endpoint, method = 'POST', body = null) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
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

/**
 * POST /api/v1/admin/ai/generate
 *
 * Structured tasks ('article_seo')
 *   → resolves to a structured object, e.g. { title_tag, meta_description, keywords[] }
 *
 * Single-string tasks ('campaign_body', 'article_summary', 'article_block_refine')
 *   → resolves to a string
 *
 * List tasks ('campaign_subject', 'article_title')
 *   → resolves to a string[]
 *
 * On 429 the thrown Error has `err.status === 429` so callers can disable
 * the trigger for a cooldown window.
 *
 * Routing order matters: `seo` is the only structured shape today, then array,
 * then single string. Add new branches above the string fallback.
 */
export async function generate(task, context) {
  const data = await aiFetch('/api/v1/admin/ai/generate', 'POST', { task, context });
  if (data?.seo && typeof data.seo === 'object') return data.seo;
  if (Array.isArray(data?.texts)) return data.texts;
  if (typeof data?.text === 'string') return data.text;
  return null;
}
