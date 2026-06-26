import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import predictionAuditService from '../../../data/services/predictionAuditService';
import '../../../styles/admin-page-styling/prediction-audit.css';

// ─── Labels ───────────────────────────────────────────────────────────────────

const MODEL_LABELS = {
  batter_hits:          'Batter Hits',
  batter_rbi:           'Batter RBI',
  batter_hr:            'Batter Home Runs',
  batter_tb:            'Batter Total Bases',
  pitcher_strikeouts:   'Pitcher Strikeouts',
  pitcher_earned_runs:  'Pitcher Earned Runs',
  pitcher_hits_allowed: 'Pitcher Hits Allowed',
  pitcher_outs:         'Pitcher Outs',
  game_total:           'Game Total',
  game_margin:          'Game Margin',
  game_moneyline:       'Game Moneyline',
};

const FAMILY_LABELS = {
  game:         'Game',
  batter_prop:  'Batter',
  pitcher_prop: 'Pitcher',
};

const FAMILY_FILTERS = [
  { key: 'all',          label: 'All models' },
  { key: 'game',         label: 'Game' },
  { key: 'batter_prop',  label: 'Batter' },
  { key: 'pitcher_prop', label: 'Pitcher' },
];

const MONEYLINE_KEY = 'game_moneyline';

const prettify = (key) =>
  MODEL_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─── Formatters ───────────────────────────────────────────────────────────────

// A win%/base/accuracy decimal (0..1) → "54.8%"
const fmtPct = (x, dec = 1) => (x == null ? '—' : `${(x * 100).toFixed(dec)}%`);
// An edge decimal → signed percentage points "+0.2 pts"
const fmtPts = (x, dec = 1) => (x == null ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(dec)} pts`);
const fmtCorr = (x) => (x == null ? '—' : x.toFixed(3));
const fmtInt = (x) => (x == null ? '—' : Math.round(x).toLocaleString());

// "YYYY-MM-DD" → "Jun 21, 2026"
const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Edge → semantic color (gap above/below base rate)
function edgeColor(edge) {
  if (edge == null) return 'rgba(255,255,255,0.4)';
  if (edge >= 0.02) return '#4ade80';
  if (edge <= -0.005) return '#f87171';
  return '#fbbf24';
}

// ─── Transforms ───────────────────────────────────────────────────────────────

// The single best (line × side) slice for a model under the active view.
// view: 'all' (every pick) | 'hc' (high-conviction subset, |pred-line| >= 1.0).
// "Best" = largest edge over the base rate; tie-break on sample size.
function bestSlice(lineGrid, view) {
  if (!Array.isArray(lineGrid)) return null;
  let best = null;
  for (const r of lineGrid) {
    const sides = view === 'hc'
      ? [
          { side: 'Over',  winpct: r.hc_over_winpct,  picks: r.hc_over_picks,  base: r.base_over },
          { side: 'Under', winpct: r.hc_under_winpct, picks: r.hc_under_picks, base: r.base_under },
        ]
      : [
          { side: 'Over',  winpct: r.over_winpct,  picks: r.over_picks,  base: r.base_over },
          { side: 'Under', winpct: r.under_winpct, picks: r.under_picks, base: r.base_under },
        ];
    for (const s of sides) {
      if (s.winpct == null || !s.picks) continue;
      const edge = s.winpct - (s.base ?? 0);
      const cand = { line: r.line, side: s.side, winpct: s.winpct, picks: s.picks, base: s.base, edge };
      if (!best || cand.edge > best.edge || (cand.edge === best.edge && cand.picks > best.picks)) best = cand;
    }
  }
  return best;
}

// Normalize the response into a sortable list of calibration models + the
// moneyline special case, kept separate.
function normalize(audit) {
  const models = audit?.models || {};
  const calib = [];
  let moneyline = null;

  for (const [key, m] of Object.entries(models)) {
    if (key === MONEYLINE_KEY) {
      moneyline = {
        key,
        label: prettify(key),
        family: m.family,
        n: m.n ?? null,
        accuracy: m.accuracy ?? null,
        baseRate: m.home_win_base_rate ?? null,
        brier: m.brier_score ?? null,
        edge: m.accuracy != null && m.home_win_base_rate != null ? m.accuracy - m.home_win_base_rate : null,
      };
      continue;
    }
    const c = m.calibration || {};
    calib.push({
      key,
      label: prettify(key),
      family: m.family,
      n: c.n ?? null,
      corr: c.corr ?? null,
      bias: c.bias ?? null,
      mae: c.mae ?? null,
      rmse: c.rmse ?? null,
      meanPredicted: c.mean_predicted ?? null,
      meanActual: c.mean_actual ?? null,
      lineGrid: Array.isArray(m.line_grid) ? m.line_grid : [],
    });
  }

  // Sort by corr (the cleanest skill signal) descending; nulls last.
  calib.sort((a, b) => (b.corr ?? -Infinity) - (a.corr ?? -Infinity));
  return { calib, moneyline };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OverviewCard({ label, value, sub, accent }) {
  return (
    <div className={`pa-overview-card accent-${accent}`}>
      <span className="pa-overview-label">{label}</span>
      <span className="pa-overview-value">{value}</span>
      {sub && <span className="pa-overview-sub">{sub}</span>}
    </div>
  );
}

function CorrCell({ corr, topRank }) {
  const width = corr == null ? 0 : Math.max(2, Math.min(100, (corr / 0.6) * 100));
  return (
    <div className="pa-corr-cell">
      <div className="pa-corr-bar-track">
        <div className="pa-corr-bar-fill" style={{ width: `${width}%` }} />
      </div>
      <span className="pa-corr-value">{fmtCorr(corr)}</span>
      {topRank != null && topRank < 3 && (
        <span className={`pa-skill-badge pa-skill-badge--${topRank + 1}`} title="Top skill model by correlation">
          {topRank === 0 ? '★ Top skill' : `#${topRank + 1}`}
        </span>
      )}
    </div>
  );
}

// The per-line breakdown shown when a model row is expanded.
function LineGridTable({ lineGrid }) {
  if (!lineGrid.length) {
    return <div className="pa-grid-empty">No per-line data for this model.</div>;
  }
  const cell = (winpct, base) => {
    if (winpct == null) return <span className="pa-muted">—</span>;
    const edge = winpct - (base ?? 0);
    return (
      <span className="pa-grid-winpct" style={{ color: edgeColor(edge) }} title={`Edge ${fmtPts(edge)}`}>
        {fmtPct(winpct)}
      </span>
    );
  };

  return (
    <div className="pa-grid-wrap">
      <table className="pa-grid-table">
        <thead>
          <tr>
            <th rowSpan={2} className="pa-grid-line-col">Line</th>
            <th colSpan={3}>Over</th>
            <th colSpan={2} className="pa-grid-hc pa-grid-divider">High-conviction Over</th>
            <th colSpan={3} className="pa-grid-divider pa-grid-divider--side">Under</th>
            <th colSpan={2} className="pa-grid-hc pa-grid-divider">High-conviction Under</th>
          </tr>
          <tr>
            <th>Picks</th><th>Win%</th><th>Base%</th>
            <th className="pa-grid-divider">Picks</th><th>Win%</th>
            <th className="pa-grid-divider pa-grid-divider--side">Picks</th><th>Win%</th><th>Base%</th>
            <th className="pa-grid-divider">Picks</th><th>Win%</th>
          </tr>
        </thead>
        <tbody>
          {lineGrid.map((r, i) => (
            <tr key={r.line ?? i}>
              <td className="pa-grid-line-col">{r.line}</td>
              <td>{fmtInt(r.over_picks)}</td>
              <td>{cell(r.over_winpct, r.base_over)}</td>
              <td className="pa-muted">{fmtPct(r.base_over)}</td>
              <td className="pa-grid-hc pa-grid-divider">{fmtInt(r.hc_over_picks)}</td>
              <td className="pa-grid-hc">{cell(r.hc_over_winpct, r.base_over)}</td>
              <td className="pa-grid-divider pa-grid-divider--side">{fmtInt(r.under_picks)}</td>
              <td>{cell(r.under_winpct, r.base_under)}</td>
              <td className="pa-muted">{fmtPct(r.base_under)}</td>
              <td className="pa-grid-hc pa-grid-divider">{fmtInt(r.hc_under_picks)}</td>
              <td className="pa-grid-hc">{cell(r.hc_under_winpct, r.base_under)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pa-grid-note">
        High-conviction = the picks the engine actually makes (model edge ≥ 1.0 off the line).
        Win% is colored by its gap over the base rate.
      </p>
    </div>
  );
}

function ModelRow({ model, view, expanded, onToggle, topRank }) {
  const slice = useMemo(() => bestSlice(model.lineGrid, view), [model.lineGrid, view]);
  const edge = slice?.edge ?? null;

  return (
    <Fragment>
      <tr className={`pa-row${expanded ? ' is-expanded' : ''}`} onClick={onToggle}>
        <td className="pa-row-model">
          <span className={`pa-chevron${expanded ? ' open' : ''}`} aria-hidden="true">▶</span>
          <div className="pa-row-model-text">
            <span className="pa-row-model-name">{model.label}</span>
            <span className="pa-row-model-family" data-family={model.family}>{FAMILY_LABELS[model.family] || model.family}</span>
          </div>
        </td>
        <td className="pa-num">{fmtInt(model.n)}</td>
        <td className="pa-num">
          {slice ? (
            <div className="pa-slice">
              <span className="pa-slice-winpct">{fmtPct(slice.winpct)}</span>
              <span className="pa-slice-sub">{slice.side} {slice.line} · {fmtInt(slice.picks)} picks</span>
            </div>
          ) : <span className="pa-muted">—</span>}
        </td>
        <td className="pa-num pa-muted">{slice ? fmtPct(slice.base) : '—'}</td>
        <td className="pa-num">
          <span className="pa-edge-pill" style={{ color: edgeColor(edge), borderColor: edgeColor(edge) }}>
            {fmtPts(edge)}
          </span>
        </td>
        <td><CorrCell corr={model.corr} topRank={topRank} /></td>
      </tr>
      {expanded && (
        <tr className="pa-row-detail">
          <td colSpan={6}>
            <div className="pa-detail-meta">
              <span>Mean predicted <strong>{model.meanPredicted?.toFixed(3) ?? '—'}</strong></span>
              <span>Mean actual <strong>{model.meanActual?.toFixed(3) ?? '—'}</strong></span>
              <span>Bias <strong style={{ color: edgeColor(model.bias == null ? null : -Math.abs(model.bias)) }}>
                {model.bias == null ? '—' : `${model.bias >= 0 ? '+' : ''}${model.bias.toFixed(3)}`}
              </strong></span>
              <span>MAE <strong>{model.mae?.toFixed(3) ?? '—'}</strong></span>
              <span>RMSE <strong>{model.rmse?.toFixed(3) ?? '—'}</strong></span>
              <span>Corr <strong>{fmtCorr(model.corr)}</strong></span>
            </div>
            <LineGridTable lineGrid={model.lineGrid} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function MoneylineCard({ ml }) {
  if (!ml) return null;
  const edge = ml.edge;
  return (
    <div className="pa-ml-card">
      <div className="pa-ml-head">
        <span className="pa-ml-title">{ml.label}</span>
        <span className="pa-row-model-family" data-family={ml.family}>{FAMILY_LABELS[ml.family] || ml.family}</span>
      </div>
      <div className="pa-ml-stats">
        <div className="pa-ml-stat">
          <span className="pa-ml-stat-label">Accuracy</span>
          <span className="pa-ml-stat-value" style={{ color: edgeColor(edge) }}>{fmtPct(ml.accuracy)}</span>
          <span className="pa-ml-stat-sub">favored side correct</span>
        </div>
        <div className="pa-ml-stat">
          <span className="pa-ml-stat-label">Home win base</span>
          <span className="pa-ml-stat-value pa-muted">{fmtPct(ml.baseRate)}</span>
          <span className="pa-ml-stat-sub">natural rate</span>
        </div>
        <div className="pa-ml-stat">
          <span className="pa-ml-stat-label">Edge</span>
          <span className="pa-ml-stat-value" style={{ color: edgeColor(edge) }}>{fmtPts(edge)}</span>
          <span className="pa-ml-stat-sub">accuracy − base</span>
        </div>
        <div className="pa-ml-stat">
          <span className="pa-ml-stat-label">Brier</span>
          <span className="pa-ml-stat-value">{ml.brier?.toFixed(3) ?? '—'}</span>
          <span className="pa-ml-stat-sub">lower is better</span>
        </div>
        <div className="pa-ml-stat">
          <span className="pa-ml-stat-label">Sample</span>
          <span className="pa-ml-stat-value">{fmtInt(ml.n)}</span>
          <span className="pa-ml-stat-sub">graded games</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PredictionAuditPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.background = '#0f172a';
    return () => { document.body.style.background = ''; };
  }, []);

  const [audit, setAudit]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState(null);

  const [view, setView]       = useState('all');     // 'all' | 'hc'
  const [family, setFamily]   = useState('all');
  const [expanded, setExpanded] = useState(null);    // model key

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    return predictionAuditService.getAudit({ refresh })
      .then(data => { setAudit(data || null); })
      .catch(err => {
        console.error('Failed to load prediction audit:', err);
        setError(err?.message || 'Failed to load the prediction audit.');
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(false); }, [load]);

  const { calib, moneyline } = useMemo(() => normalize(audit), [audit]);

  // Rank (by corr) across ALL calibration models — independent of the family filter.
  const rankByKey = useMemo(() => {
    const map = {};
    calib.forEach((m, i) => { map[m.key] = i; });
    return map;
  }, [calib]);

  const visibleModels = useMemo(
    () => (family === 'all' ? calib : calib.filter(m => m.family === family)),
    [calib, family]
  );
  const showMoneyline = family === 'all' || family === 'game';

  // ── Overview metrics ──
  const overview = useMemo(() => {
    const modelCount = calib.length + (moneyline ? 1 : 0);
    const totalSample = calib.reduce((s, m) => s + (m.n || 0), 0) + (moneyline?.n || 0);
    const topSkill = calib.find(m => m.corr != null) || null;
    let bestEdge = null;
    for (const m of calib) {
      const slice = bestSlice(m.lineGrid, view);
      if (slice && (bestEdge == null || slice.edge > bestEdge.edge)) {
        bestEdge = { label: m.label, ...slice };
      }
    }
    return { modelCount, totalSample, topSkill, bestEdge };
  }, [calib, moneyline, view]);

  const toggle = useCallback((key) => setExpanded(prev => (prev === key ? null : key)), []);

  return (
    <div className="pa-page">

      {/* ── Header ── */}
      <div className="pa-page-header">
        <div className="pa-page-header-left">
          <Link to="/admin" className="pa-back-link" aria-label="Back to admin dashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="pa-page-title">Prediction Accuracy Audit</h1>
            <p className="pa-page-sub">Every model's real track record, graded against final game outcomes</p>
          </div>
        </div>
        <div className="pa-header-right">
          {audit?.generated_for && (
            <span className="pa-data-badge">Data through {fmtDate(audit.generated_for)}</span>
          )}
          {error && <span className="pa-data-badge pa-data-badge--error">Error: {error}</span>}
          <button
            type="button"
            className="pa-refresh-btn"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            title="Force a fresh recompute (~5–6s)"
          >
            <svg className={refreshing ? 'spin' : ''} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Caveat ── */}
      <div className="pa-caveat">
        <span className="pa-caveat-icon" aria-hidden="true">ⓘ</span>
        <span>
          Lines are <strong>standard prop lines</strong> (0.5 / 1.5 / 4.5 …), not the posted sportsbook line for
          each game. This measures the model's skill at calling the correct <em>side</em> — not realized betting ROI.
          A win% at or below its base% means no added skill (it's just riding the natural rate of the event), so read
          the <strong>edge</strong>, not the raw win%.
        </span>
      </div>

      {loading ? (
        <div className="pa-loading">Loading prediction audit…</div>
      ) : !audit ? (
        <div className="pa-loading">No audit data available.</div>
      ) : (
        <>
          {/* ── Overview cards ── */}
          <div className="pa-overview-grid">
            <OverviewCard label="Models graded" value={overview.modelCount} sub="incl. moneyline" accent="blue" />
            <OverviewCard label="Total graded sample" value={fmtInt(overview.totalSample)} sub="predictions vs outcomes" accent="slate" />
            <OverviewCard
              label="Top skill (corr)"
              value={overview.topSkill ? fmtCorr(overview.topSkill.corr) : '—'}
              sub={overview.topSkill?.label ?? ''}
              accent="green"
            />
            <OverviewCard
              label="Best edge slice"
              value={overview.bestEdge ? fmtPts(overview.bestEdge.edge) : '—'}
              sub={overview.bestEdge ? `${overview.bestEdge.label} · ${overview.bestEdge.side} ${overview.bestEdge.line}` : ''}
              accent="green"
            />
          </div>

          {/* ── Controls ── */}
          <div className="pa-controls">
            <div className="pa-control-group">
              <label>Family</label>
              <div className="pa-pills">
                {FAMILY_FILTERS.map(f => (
                  <button
                    key={f.key}
                    className={`pa-pill${family === f.key ? ' active' : ''}`}
                    onClick={() => setFamily(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pa-control-group pa-control-group--right">
              <label>
                Best-slice basis
                <span className="pa-hint" title="High-conviction = the bets the engine actually makes: model edge ≥ 1.0 off the line.">ⓘ</span>
              </label>
              <div className="pa-pills">
                <button className={`pa-pill${view === 'all' ? ' active' : ''}`} onClick={() => setView('all')}>All picks</button>
                <button className={`pa-pill${view === 'hc' ? ' active' : ''}`} onClick={() => setView('hc')}>High-conviction</button>
              </div>
            </div>
          </div>

          {/* ── Track record table ── */}
          <div className="pa-table-panel">
            <div className="pa-table-head-row">
              <span className="pa-table-title">Model Track Record</span>
              <span className="pa-table-sub">
                Win% shown is the best {view === 'hc' ? 'high-conviction ' : ''}line × side slice by edge. Click a row for the full line grid.
              </span>
            </div>
            <div className="pa-table-scroll">
              <table className="pa-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th className="pa-num">Sample n</th>
                    <th className="pa-num">Win% (best slice)</th>
                    <th className="pa-num">Base%</th>
                    <th className="pa-num">Edge</th>
                    <th>Corr</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleModels.length === 0 ? (
                    <tr><td colSpan={6} className="pa-table-empty">No models in this family.</td></tr>
                  ) : (
                    visibleModels.map(m => (
                      <ModelRow
                        key={m.key}
                        model={m}
                        view={view}
                        expanded={expanded === m.key}
                        onToggle={() => toggle(m.key)}
                        topRank={rankByKey[m.key]}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Moneyline (special shape) ── */}
          {showMoneyline && moneyline && (
            <div className="pa-ml-section">
              <span className="pa-table-title">Moneyline (win/loss calls)</span>
              <MoneylineCard ml={moneyline} />
            </div>
          )}

          <p className="pa-footnote">
            Final games only, deduped to the latest prediction per player-game or game.
            “Corr” is the Pearson correlation of predicted vs. actual — the cleanest single skill signal across models.
            {audit?.generated_for && <> Data through {fmtDate(audit.generated_for)}.</>}
          </p>
        </>
      )}
    </div>
  );
}
