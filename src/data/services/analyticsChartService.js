import api from './apiService';

/**
 * Client service for the /analytics chart-explorer endpoints.
 *
 * The backend exposes a small semantic-query API: a discovery endpoint that
 * describes everything that is queryable, and a query endpoint that turns a
 * structured spec into flat chart rows + axis metadata. The UI builds all of
 * its controls from the schema response — nothing about dimensions, measures,
 * or units is hardcoded on the client.
 *
 * SCHEMA  GET /analytics/schema
 *   {
 *     grains: ["team_season", ...],
 *     dimensions: [{ field, label, type, unit?, operators[], default_sort?, values?[] }],
 *     measures:   [{ field, label, unit, operators[], default_sort, min?, max? }]
 *   }
 *
 * QUERY  POST /analytics/query
 *   request:  { grain, filters[], dimensions[], measures[], sort[], limit }
 *   response: { rows: [...], meta: { x, y, measures, suggested_charts, row_count } }
 */
class AnalyticsChartService {
  /**
   * Discovery: the full registry of queryable dimensions, measures, and grains.
   * Cached for the default TTL since it changes rarely.
   * GET /analytics/schema
   * @returns {Promise<Object>}
   */
  async getSchema(options = {}) {
    return api.get('/analytics/schema', options);
  }

  /**
   * Run a chart query. The spec doubles as the backend cache key, so identical
   * filter sets resolve quickly.
   * POST /analytics/query
   * @param {Object} spec - { grain, filters, dimensions, measures, sort, limit }
   * @returns {Promise<Object>} { rows, meta }
   */
  async runQuery(spec, options = {}) {
    return api.post('/analytics/query', spec, options);
  }
}

const analyticsChartService = new AnalyticsChartService();
export default analyticsChartService;
