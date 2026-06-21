import predictionsService from './predictionsService';

const TODAY_DEDUP_MS = 5 * 60 * 1000; // reuse the bulk fetch for 5 min

// Module-level dedup: if two games open quickly, share one /predictions/today call
let todayPromise   = null;
let todayPromiseTs = 0;

function getTodayOnce() {
  const now = Date.now();
  if (todayPromise && now - todayPromiseTs < TODAY_DEDUP_MS) return todayPromise;
  todayPromise   = predictionsService.getToday().catch(err => { todayPromise = null; throw err; });
  todayPromiseTs = now;
  return todayPromise;
}

export async function getScoutAnalysis(gamePk) {
  const cacheKey = `scout:${gamePk}`;

  try {
    // Always attempt a fresh fetch — getTodayOnce() deduplicates within 5 min
    // so this never causes redundant HTTP requests during a session.
    const games = await getTodayOnce();

    if (!Array.isArray(games)) throw new Error('Scout AI data unavailable');

    const game = games.find(g => String(g.game_pk) === String(gamePk));
    if (!game) throw new Error('No Scout AI analysis found for this game');

    const analysis = game.scout_ai;
    if (!analysis) throw new Error('Scout AI analysis is not yet available for this game');

    // Compare fresh data with cache:
    // - Matches → leave cache untouched, return cached value (it keeps accumulating age)
    // - Differs  → evict and write new entry with a fresh timestamp
    // - Missing  → write for the first time
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { analysis: cachedAnalysis } = JSON.parse(cached);
        if (JSON.stringify(cachedAnalysis) === JSON.stringify(analysis)) {
          return { analysis: cachedAnalysis, cached: true };
        }
      } catch { /* corrupted — fall through to re-write */ }
      localStorage.removeItem(cacheKey);
    }

    localStorage.setItem(cacheKey, JSON.stringify({ analysis, timestamp: Date.now() }));
    return { analysis };
  } catch (err) {
    // Network failure — fall back to whatever is cached, regardless of age
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { analysis } = JSON.parse(cached);
        if (analysis) return { analysis, cached: true };
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }
    throw err;
  }
}
