import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PredictionsNav from './PredictionsNav';
import { buildScoutDesk, getScoutDeskPerformance, toPct } from '../../../data/services/scoutDesk';
import betLibraryService from '../../../data/services/betLibraryService';
import playerStatsService from '../../../data/services/playerStatsServices';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/scout-desk.css';

function fmtOdds(n) { return n == null ? '—' : n > 0 ? `+${n}` : String(n); }
function trim(s, n) { return !s ? '' : s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; }

// Stage-2 context values can be strings or objects ({team, streak, lastTen, ...},
// {venue, tilt, hitsFactor}, etc.) — render any of them as a compact string.
function ctxText(val) {
  if (val == null) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (Array.isArray(val)) return val.map(ctxText).filter(Boolean).join(', ');
  if (typeof val === 'object') {
    const parts = [];
    if (val.team) parts.push(String(val.team));
    if (val.venue) parts.push(String(val.venue));
    if (val.park) parts.push(String(val.park));
    if (val.tilt) parts.push(String(val.tilt));
    if (val.lastTen != null) parts.push(`${val.lastTen} L10`);
    if (val.streak != null) parts.push(String(val.streak));
    if (val.runDifferential != null) parts.push(`${val.runDifferential > 0 ? '+' : ''}${val.runDifferential} run diff`);
    if (val.hitsFactor != null) parts.push(`PF ${val.hitsFactor}`);
    else if (val.factor != null) parts.push(`PF ${val.factor}`);
    if (parts.length) return parts.join(' · ');
    return Object.values(val).filter(v => typeof v === 'string' || typeof v === 'number').map(String).join(' · ');
  }
  return String(val);
}

const CONSENSUS_META = {
  consensus: { cls: 'consensus', icon: '★', label: 'Consensus' },
  contested: { cls: 'contested', icon: '⚖', label: 'Contested' },
  fade:      { cls: 'fade',      icon: '⛔', label: 'Desk Fade' },
  pass:      { cls: 'pass',      icon: '·',  label: 'No edge' },
};
const VOTE_META = {
  play: { cls: 'play', label: 'PLAY' },
  fade: { cls: 'fade', label: 'FADE' },
  pass: { cls: 'pass', label: 'PASS' },
};

function Dots({ n }) {
  return (
    <span className="sd-dots">
      {Array.from({ length: 5 }, (_, i) => <span key={i} className={`sd-dot${i < (n || 0) ? ' on' : ''}`} />)}
    </span>
  );
}

function leadTake(play) {
  const voters = (play.analysts || []).filter(a => a.vote === 'play').sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  return voters[0] || (play.analysts || [])[0] || null;
}
function auditLine(a) {
  if (!a) return null;
  const w = toPct(a.winPct), b = toPct(a.basePct);
  if (w == null) return null;
  return `High-conviction ${a.side ?? ''} ${a.line ?? ''} ${a.statType ?? ''} hits ${w}%${b != null ? ` vs ${b}% base` : ''}${a.sample ? ` · ${a.sample.toLocaleString()} samples` : ''}`.replace(/\s+/g, ' ').trim();
}

// ── War Room drawer ───────────────────────────────────────────────────────────

function WarRoom({ play, onClose, onTrack, onPitcher, tracked }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const cm = CONSENSUS_META[play.consensus.level] || CONSENSUS_META.pass;
  const ctx = play.reasoning?.context || {};

  return createPortal(
    <div className="sd-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sd-drawer" onClick={e => e.stopPropagation()}>
        <button className="sd-drawer-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="sd-drawer-head">
          <span className={`sd-badge ${cm.cls}`}>{cm.icon} {play.consensus.label}</span>
          <h2 className="sd-drawer-sel">{play.selection}</h2>
          <div className="sd-drawer-meta">
            <button className="sd-pitcher-link" onClick={() => onPitcher(play)} title="View player profile">{play.pitcherName}</button>
            <span className="sd-pill">{play.market}</span>
          </div>
          <div className="sd-drawer-nums">
            <div><span className="sd-num-lbl">Odds</span><span className={`sd-num ${play.odds > 0 ? 'pos' : 'neg'}`}>{fmtOdds(play.odds)}</span></div>
            <div><span className="sd-num-lbl">Model</span><span className="sd-num">{toPct(play.modelProb)}%</span></div>
            <div><span className="sd-num-lbl">Proj vs line</span><span className="sd-num">{play.projection} / {play.line}</span></div>
            {play.ev != null && <div><span className="sd-num-lbl">EV</span><span className={`sd-num ${play.ev > 0 ? 'pos' : 'neg'}`}>{play.ev > 0 ? '+' : ''}{play.ev}%</span></div>}
          </div>
        </div>

        {/* Stage 1 — why we trust it (the audit) */}
        {auditLine(play.audit) && (
          <div className="sd-audit-basis">
            <span className="sd-audit-basis-lbl">📊 Audit basis</span>
            <p>{auditLine(play.audit)}</p>
          </div>
        )}

        {/* Stage 2 — the AI's read */}
        {play.reasoning?.rationale && (
          <div className="sd-verdict"><strong>Why this, now:</strong> {play.reasoning.rationale}</div>
        )}
        {(() => {
          const park = ctxText(ctx.parkFactor);
          const last5 = ctxText(ctx.last5Summary);
          const opp = ctxText(ctx.opponentForm);
          if (!park && !last5 && !opp) return null;
          return (
            <div className="sd-context">
              {park && <span className="sd-ctx-chip">🏟 {park}</span>}
              {last5 && <span className="sd-ctx-chip">📅 {last5}</span>}
              {opp && <span className="sd-ctx-chip">🆚 {opp}</span>}
            </div>
          );
        })()}

        {/* The panel */}
        <div className="sd-room">
          <div className="sd-room-title">The War Room</div>
          {play.analysts.map((a, i) => (
            <div key={a.key || i} className={`sd-analyst${a.vote ? '' : ' advisory'}`}>
              <div className="sd-analyst-head">
                <span className="sd-analyst-icon">{a.icon}</span>
                <span className="sd-analyst-name">{a.name}</span>
                {a.vote
                  ? <span className={`sd-vote ${(VOTE_META[a.vote] || VOTE_META.pass).cls}`}>{(VOTE_META[a.vote] || VOTE_META.pass).label}</span>
                  : <span className="sd-vote advisory">ADVISORY</span>}
                {a.confidence != null && <Dots n={a.confidence} />}
              </div>
              <p className="sd-analyst-take">{a.take}</p>
            </div>
          ))}
        </div>

        <div className="sd-drawer-actions">
          <button className="sd-btn primary" disabled={tracked} onClick={() => onTrack(play, 'taken')}>
            {tracked ? '✓ Tracked' : '+ Track with the desk'}
          </button>
          <button className="sd-btn ghost" disabled={tracked} onClick={() => onTrack(play, 'fade')}>
            Fade the desk
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Big Board card ────────────────────────────────────────────────────────────

function BoardCard({ play, onOpen, lock }) {
  const cm = CONSENSUS_META[play.consensus.level] || CONSENSUS_META.pass;
  const lead = play.reasoning?.rationale || leadTake(play)?.take || '';
  const w = toPct(play.audit?.winPct);
  return (
    <button className={`sd-card ${cm.cls}${lock ? ' lock' : ''}`} onClick={() => onOpen(play)}>
      <div className="sd-card-top">
        <span className={`sd-badge ${cm.cls}`}>{cm.icon} {play.consensus.label}</span>
        {lock && <span className="sd-lock-tag">🔒 Lock of the Day</span>}
        {w != null && <span className="sd-audit-chip" title="Audited win rate for this bucket">{w}% hist</span>}
      </div>
      <div className="sd-card-body">
        <div className="sd-card-id">
          <span className="sd-card-sel">{play.selection}</span>
          <span className="sd-card-match sd-muted">{play.market} · proj {play.projection} vs {play.line} line</span>
        </div>
        <div className="sd-card-nums">
          <span className="sd-card-prob">{toPct(play.modelProb)}%<span className="sd-card-prob-lbl"> model</span></span>
          <span className={`sd-card-odds ${play.odds > 0 ? 'pos' : 'neg'}`}>{fmtOdds(play.odds)}</span>
        </div>
      </div>
      <div className="sd-card-lead">
        <span className="sd-lead-icon">🧠</span>
        <span className="sd-lead-take">{trim(lead, 170)}</span>
      </div>
    </button>
  );
}

// ── Scout Desk Track Record (the desk's own picks, graded) ────────────────────

function fmtUnits(n) { const v = Number(n) || 0; return `${v > 0 ? '+' : ''}${v.toFixed(1)}u`; }
function plCls(n) { return n > 0 ? 'pos' : n < 0 ? 'neg' : ''; }
function recordStr(r) {
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object') return `${r.wins ?? 0}-${r.losses ?? 0}${r.pushes ? `-${r.pushes}` : ''}`;
  return '—';
}
const KEY_LABEL = {
  strikeouts: 'Strikeouts', outs: 'Pitcher Outs', earned_runs: 'Earned Runs', hits_allowed: 'Hits Allowed',
  over: 'Over', under: 'Under',
};
function prettyKey(k) { return KEY_LABEL[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function Breakdown({ title, data }) {
  const entries = data && typeof data === 'object' ? Object.entries(data) : [];
  if (!entries.length) return null;
  return (
    <div className="sd-breakdown">
      <div className="sd-breakdown-title">{title}</div>
      {entries.map(([k, v]) => {
        const rec = v && typeof v === 'object' && (v.wins != null || v.losses != null) ? recordStr(v) : null;
        const u = v && typeof v === 'object' ? v.unitsPnl : null;
        return (
          <div key={k} className="sd-bd-row">
            <span className="sd-bd-key">{prettyKey(k)}</span>
            {rec && <span className="sd-bd-rec">{rec}</span>}
            {u != null && <span className={`sd-bd-u ${plCls(u)}`}>{fmtUnits(u)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function DaysLog({ days }) {
  return (
    <div className="sd-dayslog">
      {days.map((d, i) => (
        <div key={d.date || i} className="sd-day">
          <div className="sd-day-head">
            <span className="sd-day-date">{d.date}</span>
            <span className="sd-muted">{recordStr(d.record)}</span>
            {d.unitsPnl != null && <span className={`sd-day-u ${plCls(d.unitsPnl)}`}>{fmtUnits(d.unitsPnl)}</span>}
          </div>
          {Array.isArray(d.picks) && d.picks.map((p, j) => (
            <div key={j} className="sd-day-pick">
              <span className="sd-day-sel">{p.selection || `${p.market || ''} ${p.side || ''} ${p.line ?? ''}`.trim() || '—'}</span>
              <span className="sd-muted">proj {p.projection ?? '—'} · actual {p.actual ?? '—'}</span>
              <span className={`sd-day-status ${p.status || 'pending'}`}>{p.status || 'pending'}</span>
              {p.pnl != null && <span className={`sd-day-pnl ${plCls(p.pnl)}`}>{fmtUnits(p.pnl)}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TrackRecord({ perf, showDays, onToggleDays }) {
  if (!perf?.summary) return null;
  const s = perf.summary;
  const win = toPct(s.winPct);
  const roi = s.roiPct != null ? Number(s.roiPct) : null;
  const days = Array.isArray(perf.days) ? perf.days : [];
  return (
    <div className="sd-record">
      <div className="sd-record-head">
        <span className="sd-record-title">📈 Scout AI Track Record</span>
        <span className="sd-muted">
          {s.boards ?? '—'} boards · {s.picks ?? '—'} graded{s.pending ? ` · ${s.pending} pending` : ''}
        </span>
      </div>
      <div className="sd-record-stats">
        <div className="sd-rstat"><span className="sd-rstat-lbl">Record</span><span className="sd-rstat-val">{recordStr(s.record)}</span></div>
        <div className="sd-rstat"><span className="sd-rstat-lbl">Win rate</span><span className="sd-rstat-val">{win != null ? `${win}%` : '—'}</span></div>
        <div className="sd-rstat"><span className="sd-rstat-lbl">Units (1u flat)</span><span className={`sd-rstat-val ${plCls(s.unitsPnl)}`}>{fmtUnits(s.unitsPnl)}</span></div>
        <div className="sd-rstat"><span className="sd-rstat-lbl">ROI</span><span className={`sd-rstat-val ${plCls(roi)}`}>{roi != null ? `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%` : '—'}</span></div>
      </div>
      <div className="sd-record-splits">
        <Breakdown title="By stat type" data={s.byStatType} />
        <Breakdown title="By side" data={s.bySide} />
      </div>
      {days.length > 0 && (
        <>
          <button className="sd-record-toggle" onClick={onToggleDays}>
            {showDays ? 'Hide' : 'Show'} daily log ({days.length})
          </button>
          {showDays && <DaysLog days={days} />}
        </>
      )}
    </div>
  );
}

// ── Autopsy ───────────────────────────────────────────────────────────────────

const TAG_ICON = { leak: '🩹', warn: '⚠️', good: '✅', variance: '🎲', info: '📈' };

function Autopsy({ data }) {
  if (!data) return null;
  if (!data.hasData) {
    return (
      <div className="sd-autopsy empty">
        <span className="sd-autopsy-icon">🔬</span>
        <div>
          <div className="sd-autopsy-title">Bet Autopsy</div>
          <p className="sd-muted">Track and settle bets in the Bet Library to unlock your post-game autopsy — leaks, luck-adjusted P/L, and what to change.</p>
        </div>
      </div>
    );
  }
  const { summary, insights } = data;
  return (
    <div className="sd-autopsy">
      <div className="sd-autopsy-head">
        <span className="sd-autopsy-icon">🔬</span>
        <span className="sd-autopsy-title">Bet Autopsy</span>
        <span className="sd-autopsy-rec">
          {summary.record} · <span className={summary.units > 0 ? 'pos' : summary.units < 0 ? 'neg' : ''}>{summary.units > 0 ? '+' : ''}{summary.units.toFixed(1)}u</span>
          {summary.roi != null && <> · {summary.roi > 0 ? '+' : ''}{summary.roi.toFixed(1)}% ROI</>}
        </span>
      </div>
      {insights.length === 0
        ? <p className="sd-muted">Not enough settled bets yet for deeper reads — keep tracking.</p>
        : (
          <ul className="sd-insights">
            {insights.map((ins, i) => (
              <li key={i} className={`sd-insight ${ins.tag}`}>
                <span className="sd-insight-icon">{TAG_ICON[ins.tag] || '•'}</span>
                <span>{ins.text}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScoutDesk() {
  const navigate = useNavigate();
  const { isAuthenticated, hasAdminToolsAccess, loading } = useAuth();

  const [desk, setDesk] = useState(null);
  const [perf, setPerf] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [openPlay, setOpenPlay] = useState(null);
  const [trackedIds, setTrackedIds] = useState({});
  const [toast, setToast] = useState(null);
  const [showDays, setShowDays] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate('/account', { state: { from: { pathname: '/predictions/scout-desk' } } }); return; }
    if (!hasAdminToolsAccess) navigate('/predictions');
  }, [loading, isAuthenticated, hasAdminToolsAccess, navigate]);

  const loadDesk = useCallback(() => {
    setBusy(true);
    Promise.allSettled([buildScoutDesk(), getScoutDeskPerformance()])
      .then(([deskR, perfR]) => {
        if (deskR.status === 'fulfilled') { setDesk(deskR.value); setError(null); }
        else setError(deskR.reason?.message || 'Failed to load the desk.');
        setPerf(perfR.status === 'fulfilled' ? perfR.value : null);
      })
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => { loadDesk(); }, [loadDesk]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const handleTrack = useCallback(async (play, mode) => {
    try {
      await betLibraryService.add({
        correlation: mode === 'fade' ? 'watchlist' : 'taken',
        matchup: play.pitcherName,
        market: play.market,
        selection: play.selection,
        odds: play.odds,
        modelProb: toPct(play.modelProb),
        ev: play.ev,
        confidence: Math.max(1, Math.min(5, Math.round(play.conviction <= 1 ? (play.conviction || 0) * 5 : (play.conviction || 3)))),
        scoutPrompt: play.reasoning?.rationale || play.scoutReasoning || '',
        gamePk: play.gamePk,
        isFade: mode === 'fade',
        status: 'pending',
      });
      setTrackedIds(prev => ({ ...prev, [play.id]: true }));
      showToast(mode === 'fade' ? 'Added to watchlist (fading the desk)' : 'Tracked to your Bet Library ✓');
    } catch (e) {
      showToast(e?.message || 'Could not track the bet');
    }
  }, []);

  const goToPitcher = useCallback(async (play) => {
    if (play.playerId == null) return;
    try {
      const res = await playerStatsService.lookupPlayer({ playerId: play.playerId });
      const slug = res?.name_slug ?? res?.mlb_id;
      if (slug) { navigate(`/player/${slug}`); window.scrollTo(0, 0); }
    } catch { /* no-op */ }
  }, [navigate]);

  if (loading || !isAuthenticated || !hasAdminToolsAccess) return null;

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Scout AI</h1>
          <PredictionsNav />
        </div>
      </div>

      <div className="predictions-content">
        <div className="sd-desk-head">
          <div>
            <span className="sd-tag">✨ Scout AI - War Room</span>
            <h2 className="sd-desk-title">Three pitcher props with a proven edge.</h2>
            <p className="sd-desk-sub">We start from the bet types our model is proven to win — the exact lines and sides with the strongest historical hit rate — then read the matchup, weighing ballpark, recent form, and the opponent to settle on the three most convincing plays. Open any play for the full breakdown.</p>
          </div>
          {desk?.mood && (
            <div className="sd-mood">
              <span className="sd-mood-label">Desk read</span>
              <span className="sd-mood-name">{desk.mood.label}</span>
              <span className="sd-mood-text">{desk.mood.text}</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="sd-error">⚠ {error}</div>
        ) : busy ? (
          <div className="sd-loading"><span className="pp-loading-spinner" /><span>The desk is breaking down today's pitcher props…</span></div>
        ) : !desk || desk.board.length === 0 ? (
          <div className="sd-empty"><span className="sd-empty-icon">🗓️</span><p>No pitcher props cleared the audit gate today — check back closer to first pitch.</p></div>
        ) : (
          <>
            <div className="sd-board-head">
              <span className="sd-board-title">
                Today's Three
                {desk.locked && <span className="sd-locked-tag" title="Picks are locked for the day">🔒 locked in</span>}
              </span>
            </div>
            <div className="sd-board">
              {desk.board.map(play => (
                <BoardCard key={play.id} play={play} lock={!!desk.lock && play.id === desk.lock.id} onOpen={setOpenPlay} />
              ))}
            </div>

            {desk.cut.length > 0 && (
              <div className="sd-cuts">
                <div className="sd-cuts-title">Honorable Mentions</div>
                {desk.cut.map((c, i) => (
                  <div key={i} className="sd-cut">
                    <span className="sd-cut-sel">{c.selection}</span>
                    <span className="sd-cut-reason sd-muted">{c.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <TrackRecord perf={perf} showDays={showDays} onToggleDays={() => setShowDays(v => !v)} />

            <Autopsy data={desk.autopsy} />
          </>
        )}

        <p className="sd-disclaimer">
          * Picks pass a prediction-audit gate, then an AI reasoning layer (park factor, recent form,
          matchup). For research only — not financial advice. Please gamble responsibly.
        </p>
      </div>

      {openPlay && (
        <WarRoom
          play={openPlay}
          tracked={!!trackedIds[openPlay.id]}
          onTrack={handleTrack}
          onPitcher={goToPitcher}
          onClose={() => setOpenPlay(null)}
        />
      )}

      {toast && <div className="sd-toast">{toast}</div>}
    </div>
  );
}
