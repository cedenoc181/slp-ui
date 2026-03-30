import apiConfig from '../config/apiConfig';

// Default TTL for cached GET responses (ms)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class ApiService {
  constructor() {
    this.baseUrl = apiConfig.baseUrl;
    this.timeout = apiConfig.timeout;
    this.defaultHeaders = apiConfig.headers;
    this._cache = new Map(); // url → { data, expiresAt }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
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

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * GET with in-memory TTL cache.
   * Pass `{ ttl: 0 }` in options to bypass cache for a specific call.
   */
  get(endpoint, options = {}) {
    const { ttl = DEFAULT_CACHE_TTL, signal, ...fetchOptions } = options;
    const url = `${this.baseUrl}${endpoint}`;

    // Skip cache when a cancel signal is provided (fresh per-request call)
    if (ttl > 0 && !signal) {
      const cached = this._cache.get(url);
      if (cached && Date.now() < cached.expiresAt) {
        return Promise.resolve(cached.data);
      }
    }

    return this.request(endpoint, { ...fetchOptions, signal, method: 'GET' }).then(data => {
      if (ttl > 0) {
        this._cache.set(url, { data, expiresAt: Date.now() + ttl });
      }
      return data;
    });
  }

  /** Evict a cached entry by endpoint path (useful after mutations). */
  invalidate(endpoint) {
    this._cache.delete(`${this.baseUrl}${endpoint}`);
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

export default new ApiService();