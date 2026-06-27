// ============================================================================
// STATS FORMATTING UTILITIES
// ============================================================================
// Shared formatting functions for batter and pitcher statistics.
// Used across leader cards, hot players, splits, and top lists.
// ============================================================================

/**
 * Format batting average (e.g., .300)
 * @param {number|string|null} value - The batting average value
 * @returns {string} - Formatted average
 */
export const formatAvg = (value) => {
  if (value === null || value === undefined) return '.000';
  if (typeof value === 'number') {
    return value.toFixed(3).replace(/^0/, '');
  }
  return String(value);
};

/**
 * Format OPS (e.g., 0.900)
 * @param {number|string|null} value - The OPS value
 * @returns {string} - Formatted OPS
 */
export const formatOps = (value) => {
  if (value === null || value === undefined) return '.000';
  if (typeof value === 'number') {
    return value.toFixed(3);
  }
  return String(value);
};

/**
 * Format ERA (e.g., 3.50)
 * @param {number|string|null} value - The ERA value
 * @returns {string} - Formatted ERA
 */
export const formatEra = (value) => {
  if (value === null || value === undefined) return '0.00';
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return String(value);
};

/**
 * Format WHIP (e.g., 1.20)
 * @param {number|string|null} value - The WHIP value
 * @returns {string} - Formatted WHIP
 */
export const formatWhip = (value) => {
  if (value === null || value === undefined) return '0.00';
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return String(value);
};

/**
 * Format opponent batting average (e.g., .220)
 * @param {number|string|null} value - The opponent AVG value
 * @returns {string} - Formatted opponent AVG
 */
export const formatOppAvg = (value) => {
  if (value === null || value === undefined) return '.000';
  if (typeof value === 'number') {
    return value.toFixed(3).replace(/^0/, '');
  }
  return String(value);
};

/**
 * Format innings pitched (e.g., 180.0)
 * @param {number|string|null} value - The innings pitched value
 * @returns {string} - Formatted innings
 */
export const formatIP = (value) => {
  if (value === null || value === undefined) return '0.0';
  if (typeof value === 'number') {
    return value.toFixed(1);
  }
  return String(value);
};

/**
 * Convert a TRUE-DECIMAL innings value (e.g. 14.3333 = 14â…“) to MLB box-score
 * notation (X.0 / X.1 / X.2). Use for summed/computed innings only — not for
 * values the API already returns in box notation.
 * @param {number|string|null} value
 * @returns {string}
 */
export const inningsToBox = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || Number.isNaN(n)) return '0.0';
  const outs = Math.round(n * 3);
  return `${Math.floor(outs / 3)}.${outs % 3}`;
};

/**
 * Format date for display (e.g., "9/27")
 * Uses UTC to avoid timezone offset issues
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted date
 */
export const formatGameDate = (dateStr) => {
  const date = new Date(dateStr);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
};

/**
 * Generic value formatter based on format type
 * @param {number} val - The value to format
 * @param {string} fmt - Format type: 'avg', 'ops', 'era', 'whip', 'decimal', 'integer', 'int'
 * @returns {string|number} - Formatted value
 */
export const formatStatValue = (val, fmt) => {
  switch (fmt) {
    case 'avg':
      return formatAvg(val);
    case 'ops':
      return formatOps(val);
    case 'era':
      return formatEra(val);
    case 'whip':
      return formatWhip(val);
    case 'decimal':
      return typeof val === 'number' ? val.toFixed(2) : val;
    case 'integer':
    case 'int':
      return Math.round(val);
    default:
      return Math.round(val);
  }
};
