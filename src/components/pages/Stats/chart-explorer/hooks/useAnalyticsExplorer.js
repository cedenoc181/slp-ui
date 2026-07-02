// ============================================================================
// useAnalyticsExplorer
// ============================================================================
// Owns the chart-explorer state machine:
//   1. Fetch /analytics/schema once on mount and cache it.
//   2. Hold the query-builder state (grain, filters, dimensions, X/Y measures,
//      sort, limit) and derive sensible defaults from the schema.
//   3. Debounce any spec change into a single POST /analytics/query, cancelling
//      stale in-flight requests.
//   4. Track the active chart type, validated against meta.suggested_charts.
//
// The component stays presentational; all data flow lives here.
// ============================================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import analyticsChartService from '../../../../../data/services/analyticsChartService';
import { buildSpec, specIsRunnable } from '../utils';

const QUERY_DEBOUNCE_MS = 400;
const DEFAULT_LIMIT = 30;

export function useAnalyticsExplorer() {
  // ── Schema (discovery) ────────────────────────────────────────────────────
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(null);

  // ── Builder state ─────────────────────────────────────────────────────────
  const [grain, setGrain] = useState(null);
  const [filters, setFilters] = useState({});      // field → { op, value }
  const [dimensions, setDimensions] = useState([]);
  const [xMeasure, setXMeasure] = useState(null);
  const [yMeasure, setYMeasure] = useState(null);
  const [sort, setSort] = useState([]);            // [{ field, dir }]
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  // ── Result ──────────────────────────────────────────────────────────────--
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [chartType, setChartTypeRaw] = useState(null);

  // Seed the builder with reasonable defaults so the page renders a chart
  // immediately instead of an empty shell.
  const applyDefaults = useCallback((data) => {
    if (!data) return;
    // grains is an object keyed by grain id: { team_season: { label, ... } }
    const grainKeys = Object.keys(data.grains || {});
    setGrain((g) => g || grainKeys[0] || 'team_season');

    const dims = data.dimensions || [];
    const meas = data.measures || [];
    const dimFields = dims.map((f) => f.field);

    // Default group-by: team + season when available (keeps row labels unique),
    // otherwise the first dimension.
    const preferred = ['team', 'season'].filter((f) => dimFields.includes(f));
    const defaultDims = preferred.length ? preferred : dimFields.slice(0, 1);
    setDimensions((d) => (d.length ? d : defaultDims));

    // Start with a single measure (a clean bar chart); the user adds a second
    // measure to unlock scatter.
    const x = meas[0]?.field || null;
    setXMeasure((cur) => cur || x);

    if (x) {
      const dir = meas[0]?.default_sort || 'desc';
      setSort((s) => (s.length ? s : [{ field: x, dir }]));
    }
  }, []);

  // ── Schema fetch ──────────────────────────────────────────────────────────
  const loadSchema = useCallback(() => {
    setSchemaLoading(true);
    setSchemaError(null);
    analyticsChartService
      .getSchema()
      .then((data) => {
        setSchema(data);
        applyDefaults(data);
      })
      .catch((err) => setSchemaError(err.message || 'Failed to load analytics schema'))
      .finally(() => setSchemaLoading(false));
  }, [applyDefaults]);

  useEffect(() => { loadSchema(); }, [loadSchema]);

  // Keep the active chart type within the server's suggestions.
  const reconcileChartType = useCallback((m) => {
    const suggested = m?.suggested_charts || [];
    setChartTypeRaw((cur) => {
      if (cur && suggested.includes(cur)) return cur;
      return suggested[0] || cur || 'scatter';
    });
  }, []);

  // ── Derived spec ──────────────────────────────────────────────────────────
  const spec = useMemo(
    () => buildSpec({ grain, filters, dimensions, xMeasure, yMeasure, sort, limit }),
    [grain, filters, dimensions, xMeasure, yMeasure, sort, limit],
  );

  // ── Debounced query ───────────────────────────────────────────────────────
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!schema) return;            // wait for discovery
    if (!specIsRunnable(spec)) {
      setRows([]);
      setMeta(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setQueryLoading(true);
      setQueryError(null);
      analyticsChartService
        .runQuery(spec, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted) return;
          setRows(data?.rows || []);
          setMeta(data?.meta || null);
          reconcileChartType(data?.meta);
        })
        .catch((err) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          setQueryError(err.message || 'Query failed');
          setRows([]);
          setMeta(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setQueryLoading(false);
        });
    }, QUERY_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
    // spec is a stable memo; schema gates the first run
  }, [spec, schema, reconcileChartType]);

  const setChartType = useCallback((t) => setChartTypeRaw(t), []);

  // ── Filter mutators ───────────────────────────────────────────────────────
  const setFilter = useCallback((field, op, value) => {
    setFilters((prev) => ({ ...prev, [field]: { op, value } }));
  }, []);

  const clearFilter = useCallback((field) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => setFilters({}), []);

  // ── Dimension mutators ────────────────────────────────────────────────────
  const toggleDimension = useCallback((field) => {
    setDimensions((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }, []);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const setSortField = useCallback((field) => {
    setSort((prev) => {
      const existing = prev.find((s) => s.field === field);
      const dir = existing ? existing.dir : 'desc';
      return [{ field, dir }];
    });
  }, []);

  const toggleSortDir = useCallback(() => {
    setSort((prev) => prev.map((s) => ({ ...s, dir: s.dir === 'desc' ? 'asc' : 'desc' })));
  }, []);

  return {
    // schema
    schema,
    schemaLoading,
    schemaError,
    reloadSchema: loadSchema,

    // builder state
    grain, setGrain,
    filters, setFilter, clearFilter, clearAllFilters,
    dimensions, toggleDimension, setDimensions,
    xMeasure, setXMeasure,
    yMeasure, setYMeasure,
    sort, setSortField, toggleSortDir,
    limit, setLimit,

    // derived
    spec,

    // result
    rows, meta, queryLoading, queryError,
    chartType, setChartType,
  };
}

export default useAnalyticsExplorer;
