// ============================================================================
// ANALYTICS LAB — UTILITIES
// ============================================================================
// Pure helpers for the chart explorer: normalising the /analytics/schema
// payload, inferring which control to render for a field, assembling the
// /analytics/query spec, formatting values with their units, and turning the
// active filter set into human-readable chips.
//
// Everything here is data-driven off the schema — there are no hardcoded
// metric or dimension lists. When the backend adds a field, the UI adapts.
// ============================================================================

/** Control kinds the query builder knows how to render. */
export const CONTROL = {
  BOOLEAN: 'boolean',   // single toggle (e.g. WS winner)
  ENUM: 'enum',         // pick one from a fixed list of `values` (if the schema provides them)
  RANGE: 'range',       // numeric min–max (e.g. avg_weight, wins)
  SEASON: 'season',     // year min–max (special-cased label/formatting)
  TEXT: 'text',         // free-text equals (string dims with no enumerated values, e.g. team/league)
};

/**
 * Decide how to render a filter control for a schema field. Respects an
 * explicit `type` from the backend, otherwise infers from operators / values.
 */
export function inferControl(field) {
  if (!field) return CONTROL.TEXT;
  const t = (field.type || '').toLowerCase();
  const ops = field.operators || [];
  const id = field.field || '';

  if (t === 'boolean' || t === 'bool') return CONTROL.BOOLEAN;
  if (Array.isArray(field.values) && field.values.length) {
    const vals = field.values;
    if (vals.length === 2 && vals.every(v => typeof v === 'boolean')) return CONTROL.BOOLEAN;
    return CONTROL.ENUM;
  }
  if (t === 'season' || t === 'year' || id === 'season' || /season|year/i.test(field.label || '')) {
    return CONTROL.SEASON;
  }
  if (t === 'number' || t === 'int' || t === 'float' || t === 'numeric') return CONTROL.RANGE;
  if (ops.includes('between') || ops.includes('gt') || ops.includes('lt')) return CONTROL.RANGE;
  return CONTROL.TEXT;
}

/** True for schema field types the charts can treat as a numeric axis. */
export function isNumericType(type) {
  const t = (type || '').toLowerCase();
  return t === 'number' || t === 'int' || t === 'float' || t === 'numeric';
}

/** Build a quick lookup of every filterable/known field keyed by its id. */
export function buildFieldMap(schema) {
  const map = {};
  if (!schema) return map;
  [...(schema.dimensions || []), ...(schema.measures || [])].forEach((f) => {
    if (f && f.field) map[f.field] = f;
  });
  return map;
}

/** Round a number to a sensible precision for display. */
function tidy(n) {
  if (n == null || Number.isNaN(n)) return n;
  if (Number.isInteger(n)) return n;
  const abs = Math.abs(n);
  if (abs >= 100) return Math.round(n);
  if (abs >= 10) return Math.round(n * 10) / 10;
  return Math.round(n * 100) / 100;
}

/** Format inches (e.g. 73.4) as feet-inches (6'1"). */
export function formatHeight(inches) {
  if (inches == null || Number.isNaN(inches)) return '—';
  const whole = Math.round(inches);
  const ft = Math.floor(whole / 12);
  const inch = whole % 12;
  return `${ft}'${inch}"`;
}

/**
 * Format a measure value with its unit. Heights (unit "in") render as feet-inches,
 * seasons render bare, everything else gets the unit appended.
 */
export function formatValue(value, unit, field) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (field === 'season' || unit === 'season') return String(value);
  if (typeof value !== 'number') return String(value);
  if (unit === 'in') return formatHeight(value);
  const n = tidy(value);
  if (!unit) return String(n);
  // Units that read better as a prefix-less suffix
  return `${n} ${unit}`;
}

/** Compact axis-tick formatter (no unit, just a tidy number). */
export function formatTick(value, unit, field) {
  if (value == null) return '';
  if (field === 'season' || unit === 'season') return String(value);
  if (unit === 'in') return formatHeight(value);
  if (typeof value === 'number') return String(tidy(value));
  return String(value);
}

/**
 * A readable label for one row, derived from its dimension values.
 * e.g. dimensions ["team","season"] → "Red Sox · 2013".
 */
export function rowLabel(row, dimensions) {
  if (!row) return '';
  const dims = (dimensions || []).filter(Boolean);
  if (!dims.length) return '';
  return dims
    .map((d) => row[d])
    .filter((v) => v != null && v !== '')
    .join(' · ');
}

/** Stable identity for a row so points can be keyed / deduped / drilled into. */
export function rowKey(row, dimensions) {
  return (dimensions || []).map((d) => row?.[d]).join('|') || JSON.stringify(row);
}

// ── Spec assembly ───────────────────────────────────────────────────────────

/**
 * Turn the builder's UI state into a POST /analytics/query spec.
 * `filters` is a map of field → { op, value }; empty / partial entries are
 * dropped so we never send a half-built range.
 */
export function buildSpec({ grain, filters, dimensions, xMeasure, yMeasure, sort, limit }) {
  const measures = [];
  if (xMeasure) measures.push(xMeasure);
  if (yMeasure && yMeasure !== xMeasure) measures.push(yMeasure);

  const cleanFilters = Object.entries(filters || {})
    .map(([field, f]) => ({ field, op: f.op, value: f.value }))
    .filter((f) => isCompleteFilter(f));

  return {
    grain,
    filters: cleanFilters,
    dimensions: (dimensions || []).filter(Boolean),
    measures,
    sort: (sort || []).filter((s) => s && s.field),
    limit: limit || 30,
  };
}

/** A filter is only sent once it carries a usable value. */
export function isCompleteFilter(f) {
  if (!f || !f.field || !f.op) return false;
  const v = f.value;
  if (v == null) return false;
  if (f.op === 'between') {
    return Array.isArray(v) && v.length === 2 && v[0] != null && v[1] != null;
  }
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

/** The query is only worth firing once we have something to plot. */
export function specIsRunnable(spec) {
  return !!(spec && spec.measures && spec.measures.length > 0);
}

// ── Chips ─────────────────────────────────────────────────────────────────

/**
 * Render the active filter set as human-readable chip descriptors:
 *   [{ field, text }]  e.g. "WS Winners", "2010–2015", "200–210 lbs"
 */
export function filtersToChips(filters, fieldMap) {
  return Object.entries(filters || {})
    .filter(([field, f]) => isCompleteFilter({ field, ...f }))
    .map(([field, f]) => ({ field, text: chipText(field, f, fieldMap) }));
}

function chipText(field, f, fieldMap) {
  const meta = (fieldMap && fieldMap[field]) || {};
  const label = meta.label || field;
  const unit = meta.unit && meta.unit !== 'season' ? meta.unit : '';
  const u = unit ? ` ${unit}` : '';

  if (f.op === 'between' && Array.isArray(f.value)) {
    const [a, b] = f.value;
    return `${label} ${a}–${b}${u}`;
  }
  if (f.op === 'gt') return `${label} > ${f.value}${u}`;
  if (f.op === 'lt') return `${label} < ${f.value}${u}`;
  if (f.op === 'eq') {
    if (typeof f.value === 'boolean') return f.value ? label : `Not ${label}`;
    return `${label}: ${f.value}`;
  }
  if (Array.isArray(f.value)) return `${label}: ${f.value.join(', ')}`;
  return `${label}: ${f.value}`;
}
