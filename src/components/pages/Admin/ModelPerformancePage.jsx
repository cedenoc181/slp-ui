import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/admin-page-styling/model-performance.css';

// ─── Mock data (replace with real API hook when endpoint is ready) ────────────

const MOCK_METRICS = [
  { key: 'strikeouts',   label: 'Strikeouts',   model: 'Scout AI', accuracy: 72, prob: 68, ev: 4.2,  picks: 89,  hits: 64 },
  { key: 'earned_runs',  label: 'Earned Runs',  model: 'Scout AI', accuracy: 58, prob: 56, ev: -1.8, picks: 84,  hits: 49 },
  { key: 'hits_allowed', label: 'Hits Allowed', model: 'Scout AI', accuracy: 65, prob: 63, ev: 2.1,  picks: 76,  hits: 49 },
  { key: 'outs',         label: 'Pitcher Outs', model: 'Scout AI', accuracy: 70, prob: 67, ev: 3.5,  picks: 63,  hits: 44 },
  { key: 'moneyline',    label: 'Moneyline',    model: 'ML',       accuracy: 64, prob: 62, ev: 1.9,  picks: 142, hits: 91 },
  { key: 'run_line',     label: 'Run Line',     model: 'ML',       accuracy: 61, prob: 59, ev: 0.8,  picks: 138, hits: 84 },
  { key: 'totals',       label: 'Totals',       model: 'ML',       accuracy: 68, prob: 65, ev: 3.2,  picks: 126, hits: 86 },
];

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

function WorstTable({ metrics, view }) {
  const sorted = [...metrics].sort((a, b) => {
    const av = view === 'accuracy' ? a.accuracy : view === 'prob' ? a.prob : a.ev;
    const bv = view === 'accuracy' ? b.accuracy : view === 'prob' ? b.prob : b.ev;
    return av - bv;
  });

  const viewLabel = view === 'accuracy' ? 'Accuracy' : view === 'prob' ? 'Prob' : 'EV';

  return (
    <div className="mp-worst-table">
      <div className="mp-worst-header">Worst Performers</div>
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
    document.body.style.background = '#111';
    return () => { document.body.style.background = ''; };
  }, []);

  const [modelFilter, setModelFilter] = useState('all');
  const [metricFilter, setMetricFilter] = useState('all');
  const [view, setView] = useState('accuracy');  // accuracy | prob | ev
  const [selected, setSelected] = useState(MOCK_METRICS[0].key);

  const filtered = useMemo(() => {
    return MOCK_METRICS.filter(m => {
      if (modelFilter !== 'all' && m.model !== modelFilter) return false;
      if (metricFilter !== 'all' && m.key !== metricFilter) return false;
      return true;
    });
  }, [modelFilter, metricFilter]);

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
          <Link to="/admin" className="mp-back-link">← Admin</Link>
          <div>
            <h1 className="mp-page-title">Model Performance</h1>
            <p className="mp-page-sub">Scout AI &amp; ML model accuracy, probability calibration, and EV tracking</p>
          </div>
        </div>
        <span className="mp-data-badge">Mock Data — wire to API</span>
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
          <label>Model</label>
          <div className="mp-filter-pills">
            {['all', 'Scout AI', 'ML'].map(v => (
              <button
                key={v}
                className={`mp-pill${modelFilter === v ? ' active' : ''}`}
                onClick={() => setModelFilter(v)}
              >
                {v === 'all' ? 'All' : v}
              </button>
            ))}
          </div>
        </div>

        <div className="mp-filter-group">
          <label>Metric</label>
          <select className="mp-select" value={metricFilter} onChange={e => setMetricFilter(e.target.value)}>
            <option value="all">All metrics</option>
            {MOCK_METRICS.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
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
            {filtered.length === 0 ? (
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
          <WorstTable metrics={filtered} view={view} />
        </div>

      </div>
    </div>
  );
}
