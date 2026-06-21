import apiConfig, { IS_DEV } from '../config/apiConfig';

// In production: 5-minute TTL. In development: 30-minute TTL to survive hot reloads.
const DEFAULT_CACHE_TTL = IS_DEV ? 30 * 60 * 1000 : 5 * 60 * 1000;

// localStorage key for dev cache persistence across hot reloads / page refreshes
const LS_KEY = 'sandlot_dev_cache_v1';

// How long to wait before re-probing local server after a failure (ms)
const LOCAL_RETRY_INTERVAL = 30_000;

class ApiService {
  constructor() {
    this.baseUrl  = apiConfig.baseUrl;
    this.localUrl = apiConfig.localUrl; // null in production
    this.timeout  = apiConfig.timeout;
    this.defaultHeaders = apiConfig.headers;
    this._cache    = new Map(); // endpoint → { data, expiresAt }
    this._inflight = new Map(); // endpoint → Promise  (deduplication)

    // Local server availability state (dev only)
    // null = untested, true = reachable, false = down
    this._localAvailable = null;
    this._localRetryAt   = 0;

    // Dev only: seed in-memory cache from localStorage so hot reloads skip the network
    if (IS_DEV) {
      this._loadFromStorage();
      // Expose helpers in the browser console
      window.__clearApiCache = () => {
        this._cache.clear();
        localStorage.removeItem(LS_KEY);
        console.info('[ApiService] Dev cache cleared — next requests will hit the server.');
      };
      window.__apiCacheStatus = () => {
        console.info(`[ApiService] ${this._cache.size} cached endpoints | local server: ${
          this._localAvailable === null ? 'untested' :
          this._localAvailable ? 'UP ✓' : 'DOWN ✗'
        }`);
      };
    }
  }

  // ── Dev persistence helpers ─────────────────────────────────────────────────

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      const now = Date.now();
      Object.entries(stored).forEach(([key, entry]) => {
        if (now < entry.expiresAt) this._cache.set(key, entry);
      });
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }

  _saveToStorage() {
    try {
      const obj = {};
      this._cache.forEach((entry, key) => { obj[key] = entry; });
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch {
      // Quota exceeded — silently skip persistence
    }
  }

  // ── Internal fetch with local→remote fallback ───────────────────────────────

  async _fetch(endpoint, config) {
    // In production (or if local isn't configured), go straight to remote
    if (!IS_DEV || !this.localUrl) {
      return fetch(`${this.baseUrl}${endpoint}`, config);
    }

    // If local was recently confirmed down, skip it and use remote
    const localIsKnownDown = this._localAvailable === false && Date.now() < this._localRetryAt;
    if (localIsKnownDown) {
      return fetch(`${this.baseUrl}${endpoint}`, config);
    }

    // Try local first
    try {
      const res = await fetch(`${this.localUrl}${endpoint}`, config);
      if (this._localAvailable !== true) {
        this._localAvailable = true;
        console.info('[ApiService] Local server is UP — using http://localhost');
      }
      return res;
    } catch (err) {
      // TypeError = network failure (ECONNREFUSED, no server running)
      // This is instant on localhost — no timeout wait.
      if (err instanceof TypeError) {
        if (this._localAvailable !== false) {
          this._localAvailable = false;
          this._localRetryAt   = Date.now() + LOCAL_RETRY_INTERVAL;
          console.info('[ApiService] Local server unreachable — falling back to remote. Will retry in 30s.');
        }
        return fetch(`${this.baseUrl}${endpoint}`, config);
      }
      throw err;
    }
  }

  // ── Core request ────────────────────────────────────────────────────────────

  async request(endpoint, options = {}) {
    const { signal: externalSignal, timeout = this.timeout, ...restOptions } = options;

    const config = {
      headers: {
        ...this.defaultHeaders,
        ...restOptions.headers,
      },
      ...restOptions,
    };

    // Add timeout; also honour any externally-supplied AbortSignal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const startTime = Date.now();
    try {
      const response = await this._fetch(endpoint, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const elapsed = Date.now() - startTime;
        // Only retry fast 5xx (transient errors).
        // If the server already spent >10s before returning 500 it's a DB timeout —
        // retrying would just pile more load on an already struggling server.
        if (response.status >= 500 && !options._retried && !controller.signal.aborted && elapsed < 10000) {
          await new Promise(r => setTimeout(r, 2000));
          if (controller.signal.aborted) throw new Error('Request timeout - please try again');
          return this.request(endpoint, { ...options, _retried: true });
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * GET with in-memory TTL cache + in-flight deduplication.
   * - If a valid cached response exists, returns it immediately.
   * - If the same URL is already being fetched, returns the same Promise
   *   so the server only receives one request no matter how many callers.
   * - Pass `{ ttl: 0 }` to bypass cache for a specific call.
   *
   * In development:
   *   - Tries your local backend first; falls back to remote on connection failure.
   *   - Cache is persisted to localStorage so hot reloads skip the network entirely.
   *   - TTL is 30 min (vs 5 min in production).
   */
  get(endpoint, options = {}) {
    const { ttl = DEFAULT_CACHE_TTL, signal, ...fetchOptions } = options;

    // 1. Serve from cache (skip when caller supplied an AbortSignal — fresh call)
    if (ttl > 0 && !signal) {
      const cached = this._cache.get(endpoint);
      if (cached && Date.now() < cached.expiresAt) {
        return Promise.resolve(cached.data);
      }
    }

    // 2. Deduplicate: if the same endpoint is already in-flight, share that promise
    if (!signal && this._inflight.has(endpoint)) {
      return this._inflight.get(endpoint);
    }

    const promise = this.request(endpoint, { ...fetchOptions, signal, method: 'GET' })
      .then(data => {
        this._inflight.delete(endpoint);
        if (ttl > 0) {
          this._cache.set(endpoint, { data, expiresAt: Date.now() + ttl });
          if (IS_DEV) this._saveToStorage();
        }
        return data;
      })
      .catch(err => {
        this._inflight.delete(endpoint);
        throw err;
      });

    // Only track deduplication for requests without a caller-supplied signal
    // (signal'd requests are intentionally independent — e.g. per-game batter fetches)
    if (!signal) {
      this._inflight.set(endpoint, promise);
    }

    return promise;
  }

  /** Evict a cached entry by endpoint path (useful after mutations). */
  invalidate(endpoint) {
    this._cache.delete(endpoint);
    if (IS_DEV) this._saveToStorage();
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

const apiService = new ApiService();
export default apiService;
