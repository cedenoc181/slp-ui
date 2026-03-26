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

    const config = {
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

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
    const { ttl = DEFAULT_CACHE_TTL, ...fetchOptions } = options;
    const url = `${this.baseUrl}${endpoint}`;

    if (ttl > 0) {
      const cached = this._cache.get(url);
      if (cached && Date.now() < cached.expiresAt) {
        return Promise.resolve(cached.data);
      }
    }

    return this.request(endpoint, { ...fetchOptions, method: 'GET' }).then(data => {
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