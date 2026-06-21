import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import predictionsPerformanceService from '../../../data/services/predictionsPerformanceService';
import '../../../styles/admin-page-styling/model-performance.css';

const CATEGORY_LABELS = {
  all:     'All metrics',
  game:    'Game Props',
  batter:  'Batter Props',
  pitcher: 'Pitcher Props',
};

const AVAILABLE_SEASONS = [2026];

// ─── Period presets ──────────────────────────────────────────────────────────
// `key` = UI state. `apiRange` = value sent as `range=` (null = omit, full season).
const PERIOD_PRESETS = [
  { key: 'season',       label: 'Season',       apiRange: null },
  { key: 'this_week',    label: 'This Week',    apiRange: 'this_week' },
  { key: 'last_7_days',  label: 'Last 7 Days',  apiRange: 'last_7_days' },
  { key: 'last_month',   label: 'Last Month',   apiRange: 'last_month' },
  { key: 'custom',       label: 'Custom',       apiRange: null },
];

// Today in ET as "YYYY-MM-DD" — used as default end date for custom range
const todayEtISO = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

// "YYYY-MM-DD" → "Apr 15"
const shortDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function perfColor(value, view) {
  if (view === 'ev') {
    if (value >= 3)   return '#4ade80';
    if (value >= 0)   return '#fbbf24';
    return '#f87171';
  }
  if (value >= 67) return '#4ade80';
  if (value >= 58) return '#fbbf24';
  return '#f87171';
}

function perfLabel(value, view) {
  if (view === 'ev') {
    if (value >= 3)   return 'Strong';
    if (value >= 0)   return 'Average';
    return 'Weak';
  }
  if (value >= 67) return 'Strong';
  if (value >= 58) return 'Average';
  return 'Weak';
}

function barWidth(value, view, all) {
  if (view === 'ev') {
    const min = Math.min(...all.map(m => m.ev));
    const max = Math.max(...all.map(m => m.ev));
    const range = max - min || 1;
    return Math.max(5, ((value - min) / range) * 100);
  }
  // accuracy / prob: 50–100 range → 0–100%
  return Math.max(5, ((value - 50) / 50) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OverviewCard({ label, value, sub, accent }) {
  return (
    <div className={`mp-overview-card accent-${accent}`}>
      <span className="mp-overview-label">{label}</span>
      <span className="mp-overview-value">{value}</span>
      {sub && <span className="mp-overview-sub">{sub}</span>}
    </div>
  );
}

function MetricBar({ metric, view, allMetrics, onSelect, selected }) {
  const raw      = view === 'accuracy' ? metric.accuracy : view === 'prob' ? metric.prob : metric.ev;
  const width    = barWidth(raw, view, allMetrics);
  const color    = perfColor(raw, view);
  const isActive = selected === metric.key;

  return (
    <div
      className={`mp-bar-row${isActive ? ' hovered' : ''}`}
      onClick={() => onSelect(metric.key)}
      style={{ cursor: 'pointer' }}
    >
      <div className="mp-bar-meta">
        <span className="mp-bar-label">{metric.label}</span>
        <span className="mp-bar-model-tag" data-model={metric.model}>{metric.model}</span>
      </div>
      <div className="mp-bar-track">
        <div
          className="mp-bar-fill"
          style={{ width: `${width}%`, background: color }}
        />
        <span className="mp-bar-value" style={{ color }}>
          {view === 'ev' ? `${raw > 0 ? '+' : ''}${raw}%` : `${raw}%`}
        </span>
      </div>
      <div className="mp-bar-picks">{metric.picks} picks</div>
    </div>
  );
}

function BestTable({ metrics, view }) {
  const sorted = [...metrics].sort((a, b) => {
    const av = view === 'accuracy' ? a.accuracy : view === 'prob' ? a.prob : a.ev;
    const bv = view === 'accuracy' ? b.accuracy : view === 'prob' ? b.prob : b.ev;
    return bv - av;
  });

  const viewLabel = view === 'accuracy' ? 'Accuracy' : view === 'prob' ? 'Prob' : 'EV';

  return (
    <div className="mp-worst-table">
      <div className="mp-worst-header">Best Performers</div>
      <div className="mp-worst-head-row">
        <span>Metric</span>
        <span>Model</span>
        <span>{viewLabel}</span>
        <span>Picks</span>
      </div>
      {sorted.map(m => {
        const val = view === 'accuracy' ? m.accuracy : view === 'prob' ? m.prob : m.ev;
        const color = perfColor(val, view);
        return (
          <div key={m.key} className="mp-worst-row">
            <span className="mp-worst-metric">{m.label}</span>
            <span className="mp-worst-model" data-model={m.model}>{m.model}</span>
            <span className="mp-worst-val" style={{ color }}>
              {view === 'ev' ? `${val > 0 ? '+' : ''}${val}%` : `${val}%`}
            </span>
            <span className="mp-worst-picks">{m.picks}</span>
          </div>
        );
      })}
    </div>
  );
}

function HoverDetail({ metric, view }) {
  if (!metric) return <div className="mp-hover-detail mp-hover-detail--empty">Click a bar for details</div>;
  const { label, model, accuracy, prob, ev, picks, hits } = metric;
  return (
    <div className="mp-hover-detail">
      <div className="mp-hover-title">{label} <span data-model={model}>{model}</span></div>
      <div className="mp-hover-stats">
        <div className="mp-hover-stat">
          <span>Accuracy</span>
          <strong style={{ color: perfColor(accuracy, 'accuracy') }}>{accuracy}%</strong>
        </div>
        <div className="mp-hover-stat">
          <span>Model Prob</span>
          <strong style={{ color: perfColor(prob, 'prob') }}>{prob}%</strong>
        </div>
        <div className="mp-hover-stat">
          <span>Avg EV</span>
          <strong style={{ color: perfColor(ev, 'ev') }}>{ev > 0 ? '+' : ''}{ev}%</strong>
        </div>
        <div className="mp-hover-stat">
          <span>Picks / Hits</span>
          <strong>{picks} / {hits}</strong>
        </div>
      </div>
      <div className="mp-hover-badge" data-perf={perfLabel(
        view === 'accuracy' ? accuracy : view === 'prob' ? prob : ev, view
      )}>
        {perfLabel(view === 'accuracy' ? accuracy : view === 'prob' ? prob : ev, view)}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ModelPerformancePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.background = '#111';
    return () => { document.body.style.background = ''; };
  }, []);

  const [seasonFilter, setSeasonFilter] = useState(AVAILABLE_SEASONS[0]);
  const [metricFilter, setMetricFilter] = useState('all');
  const [view, setView] = useState('accuracy');  // accuracy | prob | ev
  const [selected, setSelected] = useState(null);

  // ── Period state ──
  const [periodKey, setPeriodKey] = useState('season');   // see PERIOD_PRESETS
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState(todayEtISO());

  // ── Live data from /admin/model-performance ──
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // For Custom, skip fetch until both dates are set
    if (periodKey === 'custom' && (!customStart || !customEnd)) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const preset = PERIOD_PRESETS.find(p => p.key === periodKey);
    const params = { season: seasonFilter };
    if (periodKey === 'custom') {
      params.startDate = customStart;
      params.endDate   = customEnd;
    } else if (preset?.apiRange) {
      params.range = preset.apiRange;
    }

    predictionsPerformanceService.getPerformance(params)
      .then(data => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setMetrics(arr);
        setSelected(prev => prev ?? arr[0]?.key ?? null);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load model performance:', err);
        setError(err?.message || 'Failed to load performance data.');
        setMetrics([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seasonFilter, periodKey, customStart, customEnd]);

  const filtered = useMemo(() => {
    return metrics.filter(m => {
      if (metricFilter !== 'all' && m.category !== metricFilter) return false;
      return true;
    });
  }, [metrics, metricFilter]);

  // If the selected metric is filtered out, fall back to the first visible one
  const activeKey = filtered.find(m => m.key === selected)
    ? selected
    : filtered[0]?.key ?? null;

  const selectedMetric = filtered.find(m => m.key === activeKey) ?? null;

  const totalPicks   = filtered.reduce((s, m) => s + m.picks, 0);
  const totalHits    = filtered.reduce((s, m) => s + m.hits, 0);
  const overallAccuracy = totalPicks ? Math.round((totalHits / totalPicks) * 100) : 0;
  const avgEV        = filtered.length ? (filtered.reduce((s, m) => s + m.ev, 0) / filtered.length).toFixed(1) : '—';
  const worst        = [...filtered].sort((a, b) => a.accuracy - b.accuracy)[0];
  const best         = [...filtered].sort((a, b) => b.accuracy - a.accuracy)[0];

  return (
    <div className="mp-page">

      {/* ── Page header ── */}
      <div className="mp-page-header">
        <div className="mp-page-header-left">
          <Link to="/admin" className="mp-back-link" aria-label="Back to admin dashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="mp-page-title">Model Performance</h1>
            <p className="mp-page-sub">Scout AI accuracy, probability calibration, and EV tracking</p>
          </div>
        </div>
        <div className="mp-data-badges">
          <span className="mp-data-badge mp-data-badge--period">
            {periodKey === 'custom' && customStart && customEnd
              ? `${shortDate(customStart)} – ${shortDate(customEnd)}`
              : PERIOD_PRESETS.find(p => p.key === periodKey)?.label}
          </span>
          {loading && <span className="mp-data-badge">Loading…</span>}
          {error   && <span className="mp-data-badge mp-data-badge--error">Error: {error}</span>}
        </div>
      </div>

      {/* ── Overview cards ── */}
      <div className="mp-overview-grid">
        <OverviewCard label="Overall Accuracy"  value={`${overallAccuracy}%`} sub={`${totalHits} / ${totalPicks} picks`} accent="blue"   />
        <OverviewCard label="Avg EV"             value={`${avgEV > 0 ? '+' : ''}${avgEV}%`} sub="across filtered metrics"     accent="green"  />
        <OverviewCard label="Best Metric"        value={best?.label ?? '—'}  sub={best ? `${best.accuracy}% accuracy` : ''} accent="green"  />
        <OverviewCard label="Worst Metric"       value={worst?.label ?? '—'} sub={worst ? `${worst.accuracy}% accuracy` : ''} accent="red"    />
      </div>

      {/* ── Filters + view toggle ── */}
      <div className="mp-filter-bar">
        <div className="mp-filter-group">
          <label htmlFor={AVAILABLE_SEASONS.length > 2 ? 'mp-season-select' : undefined}>Season</label>
          {AVAILABLE_SEASONS.length > 2 ? (
            <select
              id="mp-season-select"
              className="mp-select"
              value={seasonFilter}
              onChange={e => setSeasonFilter(Number(e.target.value))}
            >
              {AVAILABLE_SEASONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <div className="mp-filter-pills">
              {AVAILABLE_SEASONS.map(s => (
                <button
                  key={s}
                  className={`mp-pill${seasonFilter === s ? ' active' : ''}`}
                  onClick={() => setSeasonFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mp-filter-group">
          <label htmlFor="mp-period-select">Period</label>
          <select
            id="mp-period-select"
            className="mp-select"
            value={periodKey}
            onChange={e => setPeriodKey(e.target.value)}
          >
            {PERIOD_PRESETS.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="mp-filter-group">
          <label htmlFor="mp-metric-select">Metric</label>
          <select
            id="mp-metric-select"
            className="mp-select"
            value={metricFilter}
            onChange={e => setMetricFilter(e.target.value)}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="mp-filter-group mp-filter-group--right">
          <label>View</label>
          <div className="mp-filter-pills">
            {[
              { v: 'accuracy', label: 'Accuracy' },
              { v: 'prob',     label: 'Probability' },
              { v: 'ev',       label: 'EV %' },
            ].map(({ v, label }) => (
              <button
                key={v}
                className={`mp-pill${view === v ? ' active' : ''}`}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Custom date range (shown only when Period = Custom) ── */}
      {periodKey === 'custom' && (
        <div className="mp-daterange">
          <div className="mp-daterange-field">
            <label htmlFor="mp-start">Start</label>
            <input
              id="mp-start"
              type="date"
              className="mp-date-input"
              value={customStart}
              max={customEnd || undefined}
              onChange={e => setCustomStart(e.target.value)}
            />
          </div>
          <div className="mp-daterange-field">
            <label htmlFor="mp-end">End</label>
            <input
              id="mp-end"
              type="date"
              className="mp-date-input"
              value={customEnd}
              min={customStart || undefined}
              max={todayEtISO()}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </div>
          {customStart && customEnd && (
            <div className="mp-daterange-preview">
              {shortDate(customStart)} – {shortDate(customEnd)}
            </div>
          )}
        </div>
      )}

      {/* ── Chart + sidebar ── */}
      <div className="mp-content-grid">

        {/* Bar chart */}
        <div className="mp-chart-panel">
          <div className="mp-chart-header">
            <span className="mp-chart-title">
              {view === 'accuracy' ? 'Pick Accuracy by Metric' :
               view === 'prob'     ? 'Model Probability Calibration' :
                                     'Expected Value by Metric'}
            </span>
            <span className="mp-chart-sub">
              {view === 'accuracy' ? '% of picks that were correct' :
               view === 'prob'     ? 'Model-assigned probability vs actual hit rate' :
                                     'Average EV% across all picks for this metric'}
            </span>
          </div>

          {/* Axis labels */}
          <div className="mp-chart-axis">
            {view === 'ev'
              ? ['Weak', 'Avg', 'Strong'].map(l => <span key={l}>{l}</span>)
              : ['50%', '60%', '70%', '80%', '90%'].map(l => <span key={l}>{l}</span>)
            }
          </div>

          <div className="mp-chart-bars">
            {loading ? (
              <div className="mp-chart-empty">Loading performance data…</div>
            ) : error ? (
              <div className="mp-chart-empty">Unable to load performance data.</div>
            ) : filtered.length === 0 ? (
              <div className="mp-chart-empty">No metrics match the selected filters</div>
            ) : (
              filtered.map(m => (
                <MetricBar
                  key={m.key}
                  metric={m}
                  view={view}
                  allMetrics={filtered}
                  onSelect={setSelected}
                  selected={activeKey}
                />
              ))
            )}
          </div>

          {/* Legend */}
          <div className="mp-chart-legend">
            <span className="mp-legend-dot" style={{ background: '#4ade80' }} /> Strong
            <span className="mp-legend-dot" style={{ background: '#fbbf24' }} /> Average
            <span className="mp-legend-dot" style={{ background: '#f87171' }} /> Weak
          </div>
        </div>

        {/* Right sidebar: hover detail + worst table */}
        <div className="mp-sidebar">
          <HoverDetail metric={selectedMetric} view={view} />
          <BestTable metrics={filtered} view={view} />
        </div>

      </div>
    </div>
  );
}
