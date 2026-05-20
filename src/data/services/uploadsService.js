import { API_BASE_URL } from '../config/apiConfig';
import { getAccessToken } from './userAuthService';

export const UPLOAD_MAX_BYTES   = 5 * 1024 * 1024;
export const UPLOAD_ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

/**
 * POST /api/v1/admin/upload (multipart)
 *
 * The browser sets the Content-Type automatically with the multipart
 * boundary — do NOT set it manually here or the request will fail.
 *
 * Returns: { url, path, sizeBytes, contentType }
 * Throws Error with err.status set on non-2xx (so callers can detect 403/413/etc.).
 */
export async function uploadImage({ file, kind = 'hero', slug = '' }) {
  const token = getAccessToken();
  const form = new FormData();
  form.append('file', file);
  if (kind) form.append('kind', kind);
  if (slug) form.append('slug', slug);

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/v1/admin/upload`, {
    method: 'POST',
    headers,
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.message || `Upload failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return {
    url:         data.url,
    path:        data.path,
    sizeBytes:   data.size_bytes,
    contentType: data.content_type,
  };
}
