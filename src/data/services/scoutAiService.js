import { API_BASE_URL } from '../config/apiConfig';

const SCOUT_AI_ENDPOINT = `${API_BASE_URL}/api/scout-ai`;
const TIMEOUT_MS = 90_000; // 90 s — LLM calls can be slow

export async function getScoutAnalysis(matchupData) {
  const cacheKey = `scout:${matchupData.gameId}:${matchupData.gameDate}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { analysis, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 4 * 60 * 60 * 1000) {
        return { analysis, cached: true };
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(SCOUT_AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchupData),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Scout AI timed out. Please try again.');
    }
    throw new Error('Could not reach Scout AI. Check your connection.');
  } finally {
    clearTimeout(timeoutId);
  }

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

  // Server returns structured object directly — normalise so callers
  // always receive { analysis: <object|string> }
  const analysis = data.analysis ?? data;

  localStorage.setItem(cacheKey, JSON.stringify({
    analysis,
    timestamp: Date.now(),
  }));

  return { analysis };
}
