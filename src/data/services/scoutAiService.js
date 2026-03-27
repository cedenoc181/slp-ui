import { API_BASE_URL } from '../config/apiConfig';

const SCOUT_AI_ENDPOINT = `${API_BASE_URL}/api/scout-ai`;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function getScoutAnalysis(gamePk) {
  const cacheKey = `scout:${gamePk}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { analysis, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        return { analysis, cached: true };
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const response = await fetch(`${SCOUT_AI_ENDPOINT}?game_pk=${gamePk}`);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const minutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 5;
    const err = new Error(`Rate limited. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`);
    err.code = 'RATE_LIMITED';
    err.retryAfter = minutes;
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || body.message || `Scout AI unavailable (${response.status})`);
  }

  const data = await response.json();
  const analysis = data.analysis ?? data;

  localStorage.setItem(cacheKey, JSON.stringify({ analysis, timestamp: Date.now() }));

  return { analysis };
}
