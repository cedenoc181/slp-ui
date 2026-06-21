import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PredictionsNav from './PredictionsNav';
import { buildLabSlate } from '../../../data/services/labSlate';
import playerStatsService from '../../../data/services/playerStatsServices';
import {
  FILTER_CATALOG, CATALOG_BY_ID, GROUPS, applyFilters, defaultConfig, TEMPLATES,
} from '../../../data/services/labFilters';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/lab.css';

const SAVED_KEY = 'spa_lab_screens_v1';

function loadScreens() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; }
}
function saveScreens(list) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

function fmtOdds(n) {
  if (n == null) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function logoUrl(mlbId) {
  return `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
}

function fmtVal(def, v) {
  if (v == null) return '—';
  if (def.type === 'select') {
    const opt = def.options.find(o => o.test(v));
    return opt?.label ?? String(v);
  }
  if (def.type === 'boolean') return v ? 'Yes' : 'No';
  const dec = def.decimals ?? 0;
  const s = typeof v === 'number' ? v.toFixed(dec) : String(v);
  return `${s}${def.unit || ''}`;
}

// ── Active filter card ────────────────────────────────────────────────────────

function FilterCard({ active, onChange, onRemove }) {
  const def = CATALOG_BY_ID[active.id];
  if (!def) return null;

  return (
    <div className={`lab-filter-card${def.available ? '' : ' is-pending'}`}>
      <div className="lab-filter-head">
        <span className="lab-filter-group">{def.group}</span>
        <span className="lab-filter-label">{def.label}</span>
        <button className="lab-filter-remove" onClick={() => onRemove(active.id)} aria-label="Remove filter">✕</button>
      </div>

      {def.type === 'range' && (
        <div className="lab-range-row">
          <label>
            <span>min</span>
            <input
              type="number" step={def.step} min={def.min} max={def.max}
              value={active.gte ?? ''}
              onChange={e => onChange(active.id, { gte: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </label>
          <span className="lab-range-dash">–</span>
          <label>
            <span>max</span>
            <input
              type="number" step={def.step} min={def.min} max={def.max}
              value={active.lte ?? ''}
              onChange={e => onChange(active.id, { lte: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {def.type === 'select' && (
        <select
          className="lab-select"
          value={active.value ?? ''}
          onChange={e => onChange(active.id, { value: e.target.value || null })}
        >
          <option value="">Any</option>
          {def.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      {def.type === 'boolean' && (
        <select
          className="lab-select"
          value={active.value == null ? '' : String(active.value)}
          onChange={e => onChange(active.id, { value: e.target.value === '' ? null : e.target.value === 'true' })}
        >
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )}

      {!def.available && <span className="lab-pending-note">⚠ {def.note} Inert until wired.</span>}
      {def.available && def.hint && <span className="lab-filter-hint">{def.hint}</span>}
    </div>
  );
}

// ── Add-filter menu ───────────────────────────────────────────────────────────

function AddFilterMenu({ activeIds, onAdd, onClose }) {
  return (
    <div className="lab-addmenu" role="dialog">
      <div className="lab-addmenu-head">
        <span>Add a filter</span>
        <button className="lab-filter-remove" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="lab-addmenu-body">
        {GROUPS.map(group => {
          const defs = FILTER_CATALOG.filter(f => f.group === group);
          if (!defs.length) return null;
          return (
            <div key={group} className="lab-addmenu-group">
              <div className="lab-addmenu-group-title">{group}</div>
              {defs.map(def => {
                const added = activeIds.includes(def.id);
                return (
                  <button
                    key={def.id}
                    className={`lab-addmenu-item${added ? ' added' : ''}${def.available ? '' : ' pending'}`}
                    disabled={added}
                    onClick={() => onAdd(def.id)}
                  >
                    <span>{def.label}</span>
                    {!def.available && <span className="lab-tag-pending">needs data</span>}
                    {added && <span className="lab-tag-added">added</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Lab() {
  const navigate = useNavigate();
  const { isAuthenticated, hasAdminToolsAccess, loading } = useAuth();

  const [rows, setRows]       = useState([]);
  const [busy, setBusy]       = useState(true);
  const [error, setError]     = useState(null);
  const [filters, setFilters] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [screens, setScreens] = useState(loadScreens);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate('/account', { state: { from: { pathname: '/predictions/lab' } } }); return; }
    if (!hasAdminToolsAccess) navigate('/predictions');
  }, [loading, isAuthenticated, hasAdminToolsAccess, navigate]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    buildLabSlate()
      .then(r => { if (!cancelled) { setRows(r); setError(null); } })
      .catch(e => { if (!cancelled) setError(e?.message || 'Failed to load the slate.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => applyFilters(rows, filters), [rows, filters]);

  // Resolve a pitcher's profile slug on click (cached by the API layer), then navigate.
  const goToPitcher = useCallback(async (row) => {
    const query = row.pitcherId
      ? { playerId: row.pitcherId }
      : (row.pitcherName && row.pitcherName !== 'TBD' ? { fullName: row.pitcherName } : null);
    if (!query) return;
    try {
      const res = await playerStatsService.lookupPlayer(query);
      const slug = res?.name_slug ?? res?.mlb_id;
      if (slug) { navigate(`/player/${slug}`); window.scrollTo(0, 0); }
    } catch { /* no-op */ }
  }, [navigate]);

  const addFilter = useCallback((id) => {
    setFilters(prev => prev.some(f => f.id === id) ? prev : [...prev, { id, ...defaultConfig(CATALOG_BY_ID[id]) }]);
    setMenuOpen(false);
  }, []);
  const changeFilter = useCallback((id, patch) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }, []);
  const removeFilter = useCallback((id) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  }, []);
  const clearAll = useCallback(() => setFilters([]), []);
  const applyTemplate = useCallback((tpl) => setFilters(tpl.filters.map(f => ({ ...f }))), []);

  const saveScreen = useCallback(() => {
    if (!filters.length) return;
    const name = window.prompt('Name this screen:');
    if (!name) return;
    const next = [...screens.filter(s => s.name !== name), { name, filters }];
    setScreens(next); saveScreens(next);
  }, [filters, screens]);
  const deleteScreen = useCallback((name) => {
    const next = screens.filter(s => s.name !== name);
    setScreens(next); saveScreens(next);
  }, [screens]);

  if (loading || !isAuthenticated || !hasAdminToolsAccess) return null;

  // Columns: base + one per active range/select filter
  const dynamicCols = filters.map(f => CATALOG_BY_ID[f.id]).filter(Boolean);

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Lab</h1>
          <PredictionsNav />
        </div>
      </div>

      <div className="predictions-content">
        <div className="lab-intro">
          <span className="lab-tag">Admin · Slate Screener</span>
          <p className="lab-intro-sub">
            Stack any filters across odds, the model, pitcher projections, and team form to surface
            today's hidden-value spots — your own screener for spotting edges.
          </p>
        </div>

        {/* Templates */}
        <div className="lab-templates">
          <span className="lab-templates-label">Quick screens:</span>
          {TEMPLATES.map(t => (
            <button key={t.id} className="lab-template-chip" title={t.desc} onClick={() => applyTemplate(t)}>
              {t.name}
            </button>
          ))}
          {screens.map(s => (
            <span key={s.name} className="lab-saved-chip">
              <button className="lab-saved-load" onClick={() => setFilters(s.filters.map(f => ({ ...f })))}>{s.name}</button>
              <button className="lab-saved-del" onClick={() => deleteScreen(s.name)} aria-label="Delete screen">✕</button>
            </span>
          ))}
        </div>

        {/* Filter builder */}
        <div className="lab-builder">
          <div className="lab-builder-bar">
            <div className="lab-builder-actions">
              <button className="lab-btn primary" onClick={() => setMenuOpen(o => !o)}>+ Add filter</button>
              {filters.length > 0 && <button className="lab-btn ghost" onClick={saveScreen}>Save screen</button>}
              {filters.length > 0 && <button className="lab-btn ghost" onClick={clearAll}>Clear all</button>}
            </div>
            <span className="lab-match-count">
              {busy ? 'Loading slate…' : `${results.length} of ${rows.length} starters match`}
            </span>
          </div>

          {menuOpen && (
            <AddFilterMenu activeIds={filters.map(f => f.id)} onAdd={addFilter} onClose={() => setMenuOpen(false)} />
          )}

          {filters.length === 0 ? (
            <div className="lab-empty-filters">No filters yet — add one or pick a quick screen to start narrowing the slate.</div>
          ) : (
            <div className="lab-filter-grid">
              {filters.map(f => (
                <FilterCard key={f.id} active={f} onChange={changeFilter} onRemove={removeFilter} />
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {error ? (
          <div className="lab-error">⚠ {error}</div>
        ) : busy ? (
          <div className="lab-loading"><span className="pp-loading-spinner" /><span>Building today's slate…</span></div>
        ) : rows.length === 0 ? (
          <div className="lab-empty"><span className="lab-empty-icon">⚗️</span><p>No games on the slate to screen right now.</p></div>
        ) : results.length === 0 ? (
          <div className="lab-empty"><span className="lab-empty-icon">🔍</span><p>No starters match these filters.</p><p className="lab-empty-sub">Loosen a range or remove a filter.</p></div>
        ) : (
          <div className="lab-table-wrap">
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Pitcher</th>
                  <th>Matchup</th>
                  <th>Time</th>
                  <th>ML</th>
                  <th>Win%</th>
                  <th>Edge</th>
                  {dynamicCols.map(def => <th key={def.id}>{def.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalCols = 6 + dynamicCols.length;
                  return results.map((row, i) => {
                    const isNewGame = i === 0 || results[i - 1].gamePk !== row.gamePk;
                    return (
                      <Fragment key={row.id}>
                        {isNewGame && i > 0 && (
                          <tr className="lab-spacer" aria-hidden="true"><td colSpan={totalCols} /></tr>
                        )}
                        <tr className="lab-row">
                          <td className="lab-pitcher">
                            <span className="lab-pitcher-cell">
                              {row.teamMlbId && (
                                <img src={logoUrl(row.teamMlbId)} alt={row.teamAbbr} className="lab-team-logo" />
                              )}
                              {row.pitcherName && row.pitcherName !== 'TBD' ? (
                                <button className="lab-pitcher-link" onClick={() => goToPitcher(row)} title="View player profile">
                                  {row.pitcherName}
                                </button>
                              ) : <span>{row.pitcherName}</span>}
                            </span>
                          </td>
                          <td>
                            <button
                              className="lab-matchup-link"
                              onClick={() => { navigate(`/mlb-schedule/${row.gamePk}`); window.scrollTo(0, 0); }}
                              title="Open matchup detail"
                            >
                              {row.teamAbbr} <span className="lab-vs">{row.side === 'away' ? '@' : 'vs'}</span> {row.oppAbbr}
                              <span className="lab-matchup-arrow" aria-hidden="true">↗</span>
                            </button>
                          </td>
                          <td className="lab-muted">{row.gameTime}</td>
                          <td className={row.ml != null && row.ml > 0 ? 'pos' : 'neg'}>{fmtOdds(row.ml)}</td>
                          <td>{row.winProb != null ? `${row.winProb}%` : '—'}</td>
                          <td className={row.modelEdge > 0 ? 'pos' : row.modelEdge < 0 ? 'neg' : ''}>
                            {row.modelEdge != null ? `${row.modelEdge > 0 ? '+' : ''}${row.modelEdge}%` : '—'}
                          </td>
                          {dynamicCols.map(def => (
                            <td key={def.id} className="lab-dyn">{fmtVal(def, def.accessor(row))}</td>
                          ))}
                        </tr>
                      </Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

        <p className="lab-disclaimer">
          * Screener surfaces correlations on today's slate from the model, odds, and team form for
          research — not a guarantee of value. Some filters activate once their data is wired
          (see backend). Please gamble responsibly.
        </p>
      </div>
    </div>
  );
}
