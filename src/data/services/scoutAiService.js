import predictionsService from './predictionsService';

const CACHE_TTL_MS   = 4 * 60 * 60 * 1000; // 4 hours per game
const TODAY_DEDUP_MS = 5 * 60 * 1000;       // reuse the bulk fetch for 5 min

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
  const cached   = localStorage.getItem(cacheKey);
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

  const games = await getTodayOnce();

  if (!Array.isArray(games)) {
    throw new Error('Scout AI data unavailable');
  }

  const game = games.find(g => String(g.game_pk) === String(gamePk));
  if (!game) {
    throw new Error('No Scout AI analysis found for this game');
  }

  const analysis = game.scout_ai;
  if (!analysis) {
    throw new Error('Scout AI analysis is not yet available for this game');
  }

  localStorage.setItem(cacheKey, JSON.stringify({ analysis, timestamp: Date.now() }));
  return { analysis };
}
