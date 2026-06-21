import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PredictionsNav from './PredictionsNav';
import betLibraryService, { unitProfit, betPL, summarize } from '../../../data/services/betLibraryService';
import predictionsService from '../../../data/services/predictionsService';
import scheduleService from '../../../data/services/scheduleService';
import { buildMatchupCandidates } from '../../../data/services/matchupBets';
import { gradeBet, isGameFinal, isSettleDue, gameStartEpoch } from '../../../data/services/betGrader';
import { getTeamById } from '../../../data/constants/apiConstants';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/bet-library.css';

// ── Display helpers ───────────────────────────────────────────────────────────

function fmtOdds(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function fmtUnits(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}u`;
}

function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n >= 0 ? '' : ''}${n.toFixed(1)}%`;
}

function plClass(n) {
  if (n > 0) return 'pos';
  if (n < 0) return 'neg';
  return 'flat';
}

const STATUS_META = {
  pending: { label: 'Pending', cls: 'pending' },
  won:     { label: 'Won',     cls: 'won' },
  lost:    { label: 'Lost',    cls: 'lost' },
  push:    { label: 'Push',    cls: 'push' },
};

const MARKETS = [
  'Moneyline', 'Run Line', 'Total', 'F5 Moneyline', 'NRFI',
  'Strikeouts', 'Pitcher Outs', 'Earned Runs', 'Hits Allowed',
  'Hits', 'Total Bases', 'Home Run', 'RBIs', 'Stolen Bases',
];

// ── Confidence dots (reused visual from the overview/prop pages) ──────────────

function ConfidenceDots({ value }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="bl-conf-dots" aria-label={`Confidence ${v} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`bl-conf-dot${i < v ? ' filled' : ''}`} />
      ))}
    </span>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, tone }) {
  return (
    <div className={`bl-stat-card${tone ? ` tone-${tone}` : ''}`}>
      <span className="bl-stat-label">{label}</span>
      <span className="bl-stat-value">{value}</span>
      {sub != null && <span className="bl-stat-sub">{sub}</span>}
    </div>
  );
}

// ── Add-bet modal ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  correlation: 'taken',
  matchup: '',
  gamePk: null,
  market: 'Moneyline',
  selection: '',
  odds: '',
  modelProb: '',
  ev: '',
  confidence: '',          // fixed by Scout AI on selection — not user-editable
  scoutPrompt: '',
  isFade: false,
  gradeMeta: null,         // how to auto-settle this bet (set on selection)
};

function AddBetModal({ onClose, onSave, matchups = [], gamesById = {} }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [matchupMode, setMatchupMode] = useState(matchups.length ? 'select' : 'custom');

  // Selection typeahead — candidate bets for the chosen matchup
  const [candidates, setCandidates] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const [selOpen, setSelOpen] = useState(false);
  // Only filter by the input text while the user is actively typing. After a
  // pick (or before typing) the full list is shown so they can swap selection.
  const [selTyping, setSelTyping] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const onMatchupSelect = (e) => {
    const val = e.target.value;
    // Changing the matchup invalidates everything below it — clear the prior game's data.
    const cleared = { selection: '', odds: '', modelProb: '', ev: '', confidence: '', scoutPrompt: '', isFade: false, gradeMeta: null };
    setSelTyping(false);
    setSelOpen(false);
    if (val === '__custom') {
      setMatchupMode('custom');
      setForm(f => ({ ...f, ...cleared, matchup: '', gamePk: null }));
      return;
    }
    const g = matchups.find(m => String(m.gamePk) === val);
    setForm(f => ({ ...f, ...cleared, matchup: g ? g.value : '', gamePk: g ? g.gamePk : null }));
  };

  // Fetch + build candidate bets whenever the selected game changes
  useEffect(() => {
    if (form.gamePk == null) { setCandidates([]); return; }
    let cancelled = false;
    setCandLoading(true);
    Promise.all([
      predictionsService.getPitchersToday().catch(() => null),
      predictionsService.getBattersByGamePk(form.gamePk).catch(() => null),
    ]).then(([pitchers, batters]) => {
      if (cancelled) return;
      setCandidates(buildMatchupCandidates({ game: gamesById[form.gamePk], pitchers, batters }));
      setCandLoading(false);
    });
    return () => { cancelled = true; };
  }, [form.gamePk, gamesById]);

  const selQuery = form.selection.trim().toLowerCase();
  // Scope suggestions to the chosen market, then narrow by the typed query.
  const marketCands = useMemo(
    () => candidates.filter(c => c.market === form.market),
    [candidates, form.market]
  );
  const filteredCands = useMemo(() => {
    if (!marketCands.length) return [];
    const q = selTyping ? selQuery : '';
    const list = q ? marketCands.filter(c => c.search.includes(q)) : marketCands;
    return list.slice(0, 40);
  }, [marketCands, selQuery, selTyping]);

  const pickCandidate = (c) => {
    setForm(f => ({
      ...f,
      selection:  c.selection,
      market:     c.market || f.market,
      odds:       c.odds != null ? String(c.odds) : '',
      modelProb:  c.modelProb != null ? String(c.modelProb) : '',
      ev:         c.ev != null ? String(c.ev) : '',
      // Scout AI reasoning + confidence for this market, auto-populated (fixed)
      scoutPrompt: c.scoutPrompt ?? '',
      confidence:  c.scoutConfidence != null ? String(c.scoutConfidence) : '',
      // Muted (0) confidence means this side fades Scout AI's recommendation
      isFade:      c.scoutConfidence === 0,
      gradeMeta:   c.grade ?? null,
    }));
    setSelTyping(false);
    setSelOpen(false);
  };

  const valid = form.selection.trim() && form.odds !== '' && !Number.isNaN(Number(form.odds));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const game = form.gamePk != null ? gamesById[form.gamePk] : null;
    await onSave({
      correlation: form.correlation,
      matchup:     form.matchup.trim(),
      market:      form.market,
      selection:   form.selection.trim(),
      odds:        Number(form.odds),
      modelProb:   form.modelProb !== '' ? Number(form.modelProb) : null,
      ev:          form.ev !== '' ? Number(form.ev) : null,
      confidence:  form.confidence !== '' ? Number(form.confidence) : null,
      scoutPrompt: form.scoutPrompt.trim(),
      gamePk:      form.gamePk ?? null,
      isFade:      form.isFade,
      grade:       form.gradeMeta,
      gameStartEpoch: game ? gameStartEpoch(game) : null,
      status:      'pending',
    });
    setSaving(false);
    onClose();
  };

  // Live P/L preview if this bet were to win at the entered odds
  const previewProfit = form.odds !== '' && !Number.isNaN(Number(form.odds))
    ? unitProfit(Number(form.odds))
    : null;

  return createPortal(
    <div className="bl-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bl-modal" onClick={e => e.stopPropagation()}>
        <div className="bl-modal-header">
          <h2>Track a bet</h2>
          <button className="bl-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="bl-modal-body">
          {/* Correlation toggle */}
          <div className="bl-field">
            <label className="bl-field-label">Your correlation</label>
            <div className="bl-seg">
              {['taken', 'watchlist'].map(c => (
                <button
                  key={c}
                  type="button"
                  className={`bl-seg-btn${form.correlation === c ? ' active' : ''} corr-${c}`}
                  onClick={() => setForm(f => ({ ...f, correlation: c }))}
                >
                  {c === 'taken' ? '✓ Taken' : '👁 Watchlist'}
                </button>
              ))}
            </div>
            <span className="bl-field-hint">
              {form.correlation === 'taken'
                ? 'Counts toward your tracked P/L.'
                : "On your watchlist — a bet you were interested in but didn't place. Not counted in your taken P/L."}
            </span>
          </div>

          <div className="bl-field-row">
            <div className="bl-field">
              <label className="bl-field-label">Matchup</label>
              {matchupMode === 'select' ? (
                <select
                  className="bl-input"
                  value={form.gamePk != null ? String(form.gamePk) : ''}
                  onChange={onMatchupSelect}
                >
                  <option value="">Select today's matchup…</option>
                  {matchups.map(m => (
                    <option key={m.gamePk} value={String(m.gamePk)}>{m.label}</option>
                  ))}
                  <option value="__custom">＋ Custom matchup…</option>
                </select>
              ) : (
                <div className="bl-matchup-custom">
                  <input className="bl-input" placeholder="NYY @ BOS" value={form.matchup} onChange={set('matchup')} />
                  {matchups.length > 0 && (
                    <button type="button" className="bl-link-btn" onClick={() => setMatchupMode('select')}>
                      Use today's list
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="bl-field">
              <label className="bl-field-label">Market</label>
              <select
                className="bl-input"
                value={form.market}
                onChange={(e) => {
                  // Switching market resets the selection (and its auto-filled
                  // odds/prob/EV + scout reasoning) so the field reflects the new market.
                  setForm(f => ({ ...f, market: e.target.value, selection: '', odds: '', modelProb: '', ev: '', scoutPrompt: '', confidence: '', isFade: false, gradeMeta: null }));
                  setSelTyping(false);
                  if (form.gamePk != null) setSelOpen(true);
                }}
              >
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="bl-field">
            <label className="bl-field-label">Selection *</label>
            <div className="bl-combo">
              <input
                className="bl-input"
                placeholder={form.gamePk != null ? 'Type a team, pitcher, or batter…' : 'Boston Red Sox ML · Over 7.5 · Skubal Over 6.5 K'}
                value={form.selection}
                onChange={(e) => { setForm(f => ({ ...f, selection: e.target.value, isFade: false, gradeMeta: null })); setSelTyping(true); setSelOpen(true); }}
                onFocus={() => setSelOpen(true)}
                onBlur={() => setTimeout(() => setSelOpen(false), 130)}
                autoComplete="off"
              />
              {selOpen && form.gamePk != null && (
                <div className="bl-combo-list">
                  {candLoading ? (
                    <div className="bl-combo-empty">Loading matchup bets…</div>
                  ) : filteredCands.length === 0 ? (
                    <div className="bl-combo-empty">
                      {candidates.length === 0
                        ? 'No prediction bets found for this matchup yet.'
                        : marketCands.length === 0
                          ? `No ${form.market} bets for this matchup.`
                          : 'No match — keep typing or enter manually.'}
                    </div>
                  ) : (
                    filteredCands.map((c, i) => (
                      <button
                        key={`${c.selection}-${i}`}
                        type="button"
                        className={`bl-combo-item${c.scoutPick ? ' is-scout' : ''}`}
                        onMouseDown={(e) => { e.preventDefault(); pickCandidate(c); }}
                      >
                        <span className="bl-combo-item-main">
                          <span className="bl-combo-item-sel">
                            {c.selection}
                            {c.scoutPick && <span className="bl-combo-scout-tag">✨ Scout AI lean</span>}
                          </span>
                          <span className="bl-combo-item-market">{c.market}</span>
                        </span>
                        <span className="bl-combo-item-nums">
                          {c.odds != null && <span className={`bl-combo-odds ${c.odds > 0 ? 'pos' : 'neg'}`}>{fmtOdds(c.odds)}</span>}
                          {c.modelProb != null && <span className="bl-combo-prob">{c.modelProb}%</span>}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {form.isFade ? (
              <span className="bl-fade-flag">⚠ Fade — this bet is against Scout AI's recommended side</span>
            ) : form.gamePk != null && (
              <span className="bl-field-hint">
                Suggestions from this matchup's predictions — picking one auto-fills odds, probability, and EV.
              </span>
            )}
          </div>

          <div className="bl-field-row">
            <div className="bl-field">
              <label className="bl-field-label">Odds *</label>
              <input className="bl-input" placeholder="-145" value={form.odds} onChange={set('odds')} inputMode="numeric" />
            </div>
            <div className="bl-field">
              <label className="bl-field-label">Model prob %</label>
              <input className="bl-input" placeholder="65" value={form.modelProb} onChange={set('modelProb')} inputMode="numeric" />
            </div>
            <div className="bl-field">
              <label className="bl-field-label">EV %</label>
              <input className="bl-input" placeholder="12.4" value={form.ev} onChange={set('ev')} inputMode="numeric" />
            </div>
          </div>

          <div className="bl-field">
            <label className="bl-field-label">Scout AI confidence</label>
            <div className="bl-conf-readonly">
              {Number(form.confidence) > 0 ? (
                <>
                  <ConfidenceDots value={form.confidence} />
                  <span className="bl-conf-readonly-num">{form.confidence}/5</span>
                </>
              ) : (
                <span className="bl-conf-readonly-none">
                  {form.isFade ? 'Muted — fading Scout AI' : 'No Scout AI rating for this pick'}
                </span>
              )}
            </div>
          </div>

          <div className="bl-field">
            <label className="bl-field-label">Scout AI prompt / reasoning</label>
            <textarea
              className="bl-input bl-textarea"
              rows={4}
              placeholder="Paste the Scout AI prompt or reasoning that led to this pick…"
              value={form.scoutPrompt}
              onChange={set('scoutPrompt')}
            />
          </div>

          {previewProfit != null && (
            <div className="bl-preview">
              <span>If this wins (1u): </span>
              <strong className="pos">{fmtUnits(previewProfit)}</strong>
            </div>
          )}
        </div>

        <div className="bl-modal-footer">
          <button className="bl-btn ghost" onClick={onClose}>Cancel</button>
          <button className="bl-btn primary" onClick={submit} disabled={!valid || saving}>
            {saving ? 'Saving…' : 'Track bet'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Bet row ───────────────────────────────────────────────────────────────────

function BetRow({ bet, onStatus, onRemove }) {
  const [open, setOpen] = useState(false);
  const pl = betPL(bet);
  const settled = bet.status === 'won' || bet.status === 'lost' || bet.status === 'push';
  const status = STATUS_META[bet.status] ?? STATUS_META.pending;

  return (
    <div className={`bl-row corr-${bet.correlation} status-${bet.status}`}>
      <div className="bl-row-main">
        {/* Correlation badge */}
        <span className={`bl-corr-badge corr-${bet.correlation}`}>
          {bet.correlation === 'taken' ? '✓ Taken' : '👁 Watchlist'}
        </span>
        {bet.isFade && <span className="bl-fade-tag">FADE</span>}

        {/* Identity */}
        <div className="bl-row-identity">
          <span className="bl-row-selection">{bet.selection || '—'}</span>
          <span className="bl-row-meta">
            {bet.market && <span className="bl-row-market">{bet.market}</span>}
            {bet.matchup && <span className="bl-row-matchup">{bet.matchup}</span>}
          </span>
        </div>

        {/* Numbers */}
        <div className="bl-row-nums">
          <div className="bl-num">
            <span className="bl-num-label">Odds</span>
            <span className={`bl-num-value ${bet.odds > 0 ? 'pos' : 'neg'}`}>{fmtOdds(bet.odds)}</span>
          </div>
          <div className="bl-num">
            <span className="bl-num-label">Prob</span>
            <span className="bl-num-value">{bet.modelProb != null ? `${bet.modelProb}%` : '—'}</span>
          </div>
          <div className="bl-num">
            <span className="bl-num-label">EV</span>
            <span className={`bl-num-value ${bet.ev > 0 ? 'pos' : bet.ev < 0 ? 'neg' : ''}`}>
              {bet.ev != null ? `${bet.ev > 0 ? '+' : ''}${bet.ev}%` : '—'}
            </span>
          </div>
          <div className="bl-num bl-num-conf">
            <span className="bl-num-label">Conf</span>
            <ConfidenceDots value={bet.confidence} />
          </div>
          <div className="bl-num">
            <span className="bl-num-label">P/L</span>
            <span className={`bl-num-value ${plClass(pl)}`}>
              {settled && bet.status !== 'push' ? fmtUnits(pl) : settled ? '0.00u' : '—'}
            </span>
          </div>
        </div>

        {/* Status pill */}
        <span className={`bl-status-pill ${status.cls}`}>{status.label}</span>

        {/* Expand toggle */}
        <button
          className="bl-row-expand"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? '▴' : '▾'}
        </button>
      </div>

      {open && (
        <div className="bl-row-detail">
          <div className="bl-detail-grid">
            <div className="bl-detail-cell">
              <span className="bl-detail-label">Tracked</span>
              <span className="bl-detail-value">{new Date(bet.createdAt).toLocaleString()}</span>
            </div>
            {bet.settledAt && (
              <div className="bl-detail-cell">
                <span className="bl-detail-label">Settled</span>
                <span className="bl-detail-value">{new Date(bet.settledAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {bet.scoutPrompt && (
            <div className="bl-detail-scout">
              <span className="bl-detail-label">✨ Scout AI prompt</span>
              <p className="bl-detail-scout-text">{bet.scoutPrompt}</p>
            </div>
          )}

          <div className="bl-row-actions">
            <div className="bl-settle-group">
              <span className="bl-settle-label">Settle:</span>
              {['won', 'lost', 'push', 'pending'].map(s => (
                <button
                  key={s}
                  className={`bl-settle-btn ${STATUS_META[s].cls}${bet.status === s ? ' active' : ''}`}
                  onClick={() => onStatus(bet.id, s)}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            <button className="bl-remove-btn" onClick={() => onRemove(bet.id)}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CORR_FILTERS = [
  { key: 'taken',     label: 'Taken' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'all',       label: 'All' },
];

export default function BetLibrary() {
  const navigate = useNavigate();
  const { isAuthenticated, hasAdminToolsAccess, loading } = useAuth();

  const [bets, setBets]       = useState([]);
  const [busy, setBusy]       = useState(true);
  const [corr, setCorr]       = useState('taken');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adding, setAdding]   = useState(false);
  const [matchups, setMatchups] = useState([]);
  const [gamesById, setGamesById] = useState({});
  const [loadError, setLoadError] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Today's slate → matchup suggestions + game rows for the Track-a-bet modal
  useEffect(() => {
    const isFinalRow = (s = '') => ['final', 'game over', 'completed'].includes(s.toLowerCase());
    predictionsService.getToday()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : [];
        const byId = {};
        for (const r of list) {
          const pk = r.game_pk ?? r.id;
          if (pk != null) byId[pk] = r;
        }
        setGamesById(byId);
        const seen = new Set();
        const opts = list
          .filter(r => r.away_team_id && r.home_team_id &&
            r.season_type !== 'spring' && r.season_type !== 'S' && !isFinalRow(r.status))
          .map(r => {
            const away = getTeamById(r.away_team_id)?.id || r.away_team_name || 'AWY';
            const home = getTeamById(r.home_team_id)?.id || r.home_team_name || 'HOM';
            const value = `${away} @ ${home}`;
            const time  = r.game_time_et || r.game_time || '';
            return { gamePk: r.game_pk ?? r.id, value, label: time ? `${value} · ${time}` : value };
          })
          .filter(o => o.gamePk != null && !seen.has(o.gamePk) && seen.add(o.gamePk));
        setMatchups(opts);
      })
      .catch(() => { setMatchups([]); setGamesById({}); });
  }, []);

  // Admin gate
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/account', { state: { from: { pathname: '/predictions/bet-library' } } });
      return;
    }
    if (!hasAdminToolsAccess) navigate('/predictions');
  }, [loading, isAuthenticated, hasAdminToolsAccess, navigate]);

  const refresh = useCallback(async () => {
    try {
      const all = await betLibraryService.list();
      setBets(all);
      setLoadError(null);
    } catch (err) {
      setLoadError(err?.message || 'Failed to load your bet library.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-settle pending bets ~2.5h after first pitch, using the same schedule
  // data the MLB schedule uses to flip live games to Final.
  const attemptGrading = useCallback(async () => {
    try {
      const all = await betLibraryService.list();
      const now = Date.now();
      const due = all.filter(b => b.status === 'pending' && b.gamePk != null && b.grade && isSettleDue(b, now));
      if (!due.length) return;

      const year = new Date().getFullYear();
      const [todayRes, priorRes] = await Promise.allSettled([
        scheduleService.getTodayGames(),
        scheduleService.getPriorGames({ season: year, seasonType: 'R', limit: 100 }),
      ]);
      const games = [
        ...(todayRes.status === 'fulfilled' && Array.isArray(todayRes.value) ? todayRes.value : []),
        ...(priorRes.status === 'fulfilled' && Array.isArray(priorRes.value) ? priorRes.value : []),
      ];
      const byPk = {};
      for (const g of games) {
        const pk = g.game_pk ?? g.id;
        if (pk != null && !(pk in byPk)) byPk[pk] = g;
      }

      let changed = false;
      for (const bet of due) {
        const g = byPk[bet.gamePk];
        if (!g || !isGameFinal(g)) continue;       // not final yet → try again next pass
        const status = gradeBet(bet, g);
        if (status) { await betLibraryService.update(bet.id, { status }); changed = true; }
      }
      if (changed) await refresh();
    } catch {
      // Non-fatal — grading retries on the next pass.
    }
  }, [refresh]);

  // Run on load, then re-check every 10 min while the page stays open.
  useEffect(() => {
    attemptGrading();
    const id = setInterval(attemptGrading, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [attemptGrading]);

  const handleAdd = useCallback(async (data) => {
    try { await betLibraryService.add(data); }
    catch (err) { setLoadError(err?.message || 'Failed to save the bet.'); }
    await refresh();
  }, [refresh]);

  const handleStatus = useCallback(async (id, status) => {
    try { await betLibraryService.update(id, { status }); }
    catch (err) { setLoadError(err?.message || 'Failed to update the bet.'); }
    await refresh();
  }, [refresh]);

  const handleRemove = useCallback(async (id) => {
    try { await betLibraryService.remove(id); }
    catch (err) { setLoadError(err?.message || 'Failed to remove the bet.'); }
    await refresh();
  }, [refresh]);

  // Correlation-filtered set drives the summary; status filter is view-only.
  const corrBets = useMemo(
    () => corr === 'all' ? bets : bets.filter(b => b.correlation === corr),
    [bets, corr]
  );

  const visible = useMemo(
    () => statusFilter === 'all' ? corrBets : corrBets.filter(b => b.status === statusFilter),
    [corrBets, statusFilter]
  );

  const summary = useMemo(() => summarize(corrBets), [corrBets]);
  const corrLabel = corr === 'all' ? 'all bets' : `${corr} bets`;

  if (loading || !isAuthenticated || !hasAdminToolsAccess) return null;

  return (
    <div className="predictions-page">
      {/* Header */}
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Bet Library</h1>
          <PredictionsNav />
        </div>
      </div>

      <div className="predictions-content">
        <div className="bl-toolbar">
          <div className="bl-toolbar-copy">
            <span className="bl-admin-tag">Admin · P&amp;L Tracker</span>
            <p className="bl-toolbar-sub">
              A library of the bets you've taken or watchlisted — with the Scout AI prompt, odds, and
              model probability captured at pick time. Flat 1-unit staking; ROI is computed from the odds.
            </p>
          </div>
          <button className="bl-btn primary" onClick={() => setAdding(true)}>+ Track a bet</button>
        </div>

        {loadError && (
          <div className="bl-error-banner">
            <span>⚠ {loadError}</span>
            <button className="bl-btn ghost" onClick={() => { setBusy(true); refresh(); }}>Retry</button>
          </div>
        )}

        {/* Summary dashboard — reflects the active correlation filter */}
        <div className="bl-summary">
          <StatCard
            label={`Net P/L · ${corrLabel}`}
            value={fmtUnits(summary.units)}
            sub={summary.settled ? `${summary.settled} settled` : 'no settled bets'}
            tone={plClass(summary.units)}
          />
          <StatCard
            label="ROI"
            value={summary.roi != null ? fmtPct(summary.roi) : '—'}
            sub="per unit risked"
            tone={summary.roi == null ? null : plClass(summary.roi)}
          />
          <StatCard
            label="Record"
            value={`${summary.wins}-${summary.losses}${summary.pushes ? `-${summary.pushes}` : ''}`}
            sub="W-L-P"
          />
          <StatCard
            label="Win rate"
            value={summary.winRate != null ? fmtPct(summary.winRate) : '—'}
            sub="excl. pushes"
          />
          <StatCard
            label="Pending"
            value={summary.pending}
            sub={`${summary.total} tracked`}
          />
        </div>

        {/* Filters */}
        <div className="bl-filters">
          <div className="bl-filter-group">
            {CORR_FILTERS.map(f => (
              <button
                key={f.key}
                className={`bl-filter-btn${corr === f.key ? ' active' : ''}`}
                onClick={() => setCorr(f.key)}
              >
                {f.label}
                <span className="bl-filter-count">
                  {f.key === 'all' ? bets.length : bets.filter(b => b.correlation === f.key).length}
                </span>
              </button>
            ))}
          </div>
          <div className="bl-filter-group">
            {['all', 'pending', 'won', 'lost', 'push'].map(s => (
              <button
                key={s}
                className={`bl-filter-btn status${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All status' : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {busy ? (
          <div className="bl-loading">
            <span className="pp-loading-spinner" />
            <span>Loading your bet library…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="bl-empty">
            <span className="bl-empty-icon">📒</span>
            <p className="bl-empty-title">
              {bets.length === 0 ? 'No bets tracked yet' : 'Nothing matches this filter'}
            </p>
            <p className="bl-empty-sub">
              {bets.length === 0
                ? 'Track a pick you like to start building your P/L record.'
                : 'Try a different correlation or status filter.'}
            </p>
            {bets.length === 0 && (
              <button className="bl-btn primary" onClick={() => setAdding(true)}>+ Track your first bet</button>
            )}
          </div>
        ) : (
          <div className="bl-list">
            {visible.map(bet => (
              <BetRow key={bet.id} bet={bet} onStatus={handleStatus} onRemove={handleRemove} />
            ))}
          </div>
        )}

        <p className="bl-disclaimer">
          * Game bets (moneyline, run line, total) auto-settle ~2.5h after first pitch from final
          scores; player props settle manually for now. Flat 1-unit P/L is model bookkeeping for
          informational purposes only. Please gamble responsibly.
        </p>
      </div>

      {adding && <AddBetModal onClose={() => setAdding(false)} onSave={handleAdd} matchups={matchups} gamesById={gamesById} />}
    </div>
  );
}
