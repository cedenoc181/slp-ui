// ============================================================================
// CHART DATA UTILITIES
// ============================================================================
// Utility functions for transforming player stats data into chart-ready format.
// Handles both batter and pitcher metrics with monthly and yearly views.
// ============================================================================

// ============================================================================
// CHART METRIC OPTIONS
// ============================================================================

/**
 * Batter chart metric options with labels
 */
export const BATTER_CHART_METRICS = {
  hr: { label: 'Home Runs', short: 'HR' },
  h: { label: 'Hits', short: 'H' },
  rbi: { label: 'RBIs', short: 'RBI' },
  r: { label: 'Runs', short: 'R' },
  avg: { label: 'Batting Average', short: 'AVG' },
  ops: { label: 'OPS', short: 'OPS' },
  bb: { label: 'Walks', short: 'BB' },
  so: { label: 'Strikeouts', short: 'SO' }
};

/**
 * Pitcher chart metric options with labels
 */
export const PITCHER_CHART_METRICS = {
  era: { label: 'ERA', short: 'ERA' },
  whip: { label: 'WHIP', short: 'WHIP' },
  so: { label: 'Strikeouts', short: 'K' },
  wins: { label: 'Wins', short: 'W' },
  ip: { label: 'Innings Pitched', short: 'IP' },
  k_per_9: { label: 'K/9', short: 'K/9' },
  bb_per_9: { label: 'BB/9', short: 'BB/9' },
  quality_starts: { label: 'Quality Starts', short: 'QS' }
};

/**
 * Get appropriate chart metric options based on player type
 * @param {boolean} isPitcher - Is the player a pitcher
 * @param {boolean} isTwoWay - Is the player a two-way player
 * @param {string} twoWayViewMode - 'batting' or 'pitching' for TWP
 * @returns {object} - Chart metric options object
 */
export const getChartMetricOptions = (isPitcher, isTwoWay, twoWayViewMode) => {
  if (isTwoWay) {
    return twoWayViewMode === 'pitching' ? PITCHER_CHART_METRICS : BATTER_CHART_METRICS;
  }
  return isPitcher ? PITCHER_CHART_METRICS : BATTER_CHART_METRICS;
};

/**
 * Get default chart metric for player type
 * @param {boolean} showPitchingStats - Whether to show pitching stats
 * @returns {string} - Default metric key
 */
export const getDefaultChartMetric = (showPitchingStats) => {
  return showPitchingStats ? 'era' : 'hr';
};

/**
 * Get current chart metric safely with fallback
 * @param {string} selectedMetric - Currently selected metric key
 * @param {object} metricOptions - Available metric options
 * @returns {object} - Metric object with key, label, short
 */
export const getCurrentChartMetric = (selectedMetric, metricOptions) => {
  if (metricOptions[selectedMetric]) {
    return { key: selectedMetric, ...metricOptions[selectedMetric] };
  }
  // Fallback to first available metric
  const firstKey = Object.keys(metricOptions)[0];
  return { key: firstKey, ...metricOptions[firstKey] };
};

// ============================================================================
// CHART VALUE FORMATTING
// ============================================================================

/**
 * Format chart value for display based on metric type
 * @param {number} value - The value to format
 * @param {string} metricKey - The metric key (e.g., 'avg', 'era', 'hr')
 * @returns {string|number} - Formatted value
 */
export const formatChartValue = (value, metricKey) => {
  if (metricKey === 'avg' || metricKey === 'ops') {
    return value.toFixed(3).replace(/^0/, '');
  }
  if (metricKey === 'era' || metricKey === 'whip' || metricKey === 'k_per_9' || metricKey === 'bb_per_9') {
    return value.toFixed(2);
  }
  if (metricKey === 'ip') {
    return value.toFixed(1);
  }
  return Math.round(value);
};

/**
 * Get max value for scaling chart bars
 * @param {Array} data - Array of chart data points
 * @returns {number} - Maximum value in data
 */
export const getMaxChartValue = (data) => {
  if (!data || data.length === 0) return 1;
  const max = Math.max(...data.map(d => d.value || 0));
  return max > 0 ? max : 1; // Prevent division by zero
};

// ============================================================================
// MONTHLY CHART DATA TRANSFORMATION
// ============================================================================

// Month mapping for chart display
const MONTH_MAPPING = [
  { display: 'Mar', apiKey: 'March' },
  { display: 'Apr', apiKey: 'April' },
  { display: 'May', apiKey: 'May' },
  { display: 'Jun', apiKey: 'June' },
  { display: 'Jul', apiKey: 'July' },
  { display: 'Aug', apiKey: 'August' },
  { display: 'Sep', apiKey: 'September' },
  { display: 'Oct', apiKey: 'October' }
];

// Field mappings from chart metrics to API response fields
const MONTHLY_FIELD_MAPPINGS = {
  // Batter fields
  hr: 'home_runs',
  h: 'hits',
  rbi: 'rbis',
  r: 'runs',
  avg: 'avg',
  ops: 'ops',
  bb: 'walks',
  so: 'strikeouts',
  // Pitcher fields
  era: 'era',
  whip: 'whip',
  wins: 'wins',
  ip: 'innings_pitched',
  k_per_9: 'k_per_9',
  bb_per_9: 'bb_per_9',
  quality_starts: 'quality_starts'
};

/**
 * Transform monthly performance API data into chart format
 * @param {object} monthlyPerformance - Monthly performance data from API
 * @returns {object} - Object with metric keys and array of {period, value} data
 */
export const transformMonthlyChartData = (monthlyPerformance) => {
  if (!monthlyPerformance) return {};
  
  // API returns data under 'monthly_stats' or 'batting' object with full month names
  const statsData = monthlyPerformance.monthly_stats || 
                    monthlyPerformance.batting || 
                    monthlyPerformance.pitching || 
                    monthlyPerformance;
  
  if (!statsData || typeof statsData !== 'object') return {};
  
  const result = {};
  
  Object.entries(MONTHLY_FIELD_MAPPINGS).forEach(([metric, apiField]) => {
    result[metric] = MONTH_MAPPING
      .map(({ display, apiKey }) => {
        const monthData = statsData[apiKey] || {};
        return {
          period: display,
          value: monthData[apiField] || 0
        };
      })
      .filter(item => {
        // Include months that have data (any games played)
        const monthKey = MONTH_MAPPING.find(m => m.display === item.period)?.apiKey;
        const monthData = statsData[monthKey] || {};
        return monthData.games > 0;
      });
  });
  
  return result;
};

// ============================================================================
// YEARLY CHART DATA TRANSFORMATION
// ============================================================================

// Field mappings for batter career stats (multiple possible field names)
const BATTER_FIELD_MAPPINGS = {
  hr: ['hr', 'home_runs', 'HR'],
  h: ['h', 'hits', 'H'],
  rbi: ['rbi', 'rbis', 'RBI'],
  r: ['r', 'runs', 'R'],
  avg: ['avg', 'batting_avg', 'AVG', 'batting_average'],
  ops: ['ops', 'OPS'],
  bb: ['bb', 'walks', 'BB', 'base_on_balls'],
  so: ['so', 'strikeouts', 'SO', 'strike_outs']
};

// Field mappings for pitcher career stats
const PITCHER_FIELD_MAPPINGS = {
  era: ['era', 'ERA'],
  whip: ['whip', 'WHIP'],
  so: ['so', 'strikeouts', 'SO', 'strike_outs'],
  wins: ['wins', 'w', 'W'],
  ip: ['ip', 'innings_pitched', 'IP'],
  k_per_9: ['k_per_9', 'k9', 'strikeouts_per_9'],
  bb_per_9: ['bb_per_9', 'bb9', 'walks_per_9'],
  quality_starts: ['quality_starts', 'qs', 'QS']
};

/**
 * Transform career stats API data into yearly chart format
 * Only includes regular season data (season_type: 2)
 * @param {Array} careerStats - Career stats array from API
 * @param {boolean} showPitchingStats - Whether to show pitching stats
 * @returns {object} - Object with metric keys and array of {period, value} data
 */
export const transformYearlyChartData = (careerStats, showPitchingStats) => {
  if (!careerStats || !Array.isArray(careerStats) || careerStats.length === 0) return {};
  
  // Filter to only include regular season stats (season_type: 2 or "2")
  let regularSeasonStats = careerStats.filter(season => 
    season && (season.season_type === 2 || season.season_type === '2' || season.season_type === 'R')
  );
  
  if (regularSeasonStats.length === 0) return {};
  
  // AGGRESSIVE LIMIT: Only use last 10 years to prevent browser crashes
  regularSeasonStats = regularSeasonStats
    .sort((a, b) => (parseInt(a.season || a.year) || 0) - (parseInt(b.season || b.year) || 0))
    .slice(-10);
  
  const result = {};
  
  // Determine which metrics and mappings to use
  const metrics = showPitchingStats 
    ? ['era', 'whip', 'so', 'wins', 'ip', 'k_per_9', 'bb_per_9', 'quality_starts']
    : ['hr', 'h', 'rbi', 'r', 'avg', 'ops', 'bb', 'so'];
  const fieldMappings = showPitchingStats ? PITCHER_FIELD_MAPPINGS : BATTER_FIELD_MAPPINGS;
  
  metrics.forEach(metric => {
    result[metric] = regularSeasonStats
      .map(season => {
        // Find the value from any of the possible field names
        let value = 0;
        for (const field of fieldMappings[metric]) {
          if (season[field] !== undefined) {
            value = season[field];
            break;
          }
        }
        return {
          period: String(season.season || season.year),
          value: value || 0
        };
      })
      .sort((a, b) => parseInt(a.period) - parseInt(b.period)); // Sort by year ascending
  });
  
  return result;
};
