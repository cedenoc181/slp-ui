import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PredictionsNav from './PredictionsNav';
import { buildScoutDesk, getScoutDeskPerformance, buildAutopsy, toPct } from '../../../data/services/scoutDesk';
import betLibraryService from '../../../data/services/betLibraryService';
import playerStatsService from '../../../data/services/playerStatsServices';
import loadingPredictionsIcon from '../../../assets/icons/loading-predictions.png';
import profitAndLossIcon from '../../../assets/icons/profit-and-loss.png';
import predictiveAnalyticsIcon from '../../../assets/icons/predictive-analytics.png';
import binocularsIcon from '../../../assets/icons/binoculars.png';
import targetIcon from '../../../assets/icons/target.png';
import machineIcon from '../../../assets/icons/machine.png';
import baseballStadiumIcon from '../../../assets/icons/baseball-stadium.png';
import mlbScheduleIcon from '../../../assets/icons/mlb-schedule.png';
import playerRosterIcon from '../../../assets/icons/player-roster.png';
import aiMlIcon from '../../../assets/icons/ai-ml.png';
import commandCentreIcon from '../../../assets/icons/command-centre.png';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/scout-desk.css';

// Personas with a custom image icon (rest fall back to their PERSONA_ICON emoji).
const PERSONA_IMG = {
  quant: predictiveAnalyticsIcon,
  scout: binocularsIcon,
  sharp: targetIcon,
};

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
  play:  { cls: 'play', label: 'PLAY' },
  fade:  { cls: 'fade', label: 'FADE' },
  pass:  { cls: 'pass', label: 'PASS' },
  // Side leans (pitcher props + Honorable Mentions' persona votes).
  over:  { cls: 'lean', label: 'OVER' },
  under: { cls: 'lean', label: 'UNDER' },
  lean:  { cls: 'lean', label: 'LEAN' },
  // Game props vote on a team side.
  home:  { cls: 'lean', label: 'HOME' },
  away:  { cls: 'lean', label: 'AWAY' },
};

// Every board item now carries kind: "pitcher" | "game". Branch all rendering
// on it — never assume a pick is a pitcher.
function isGame(play) {
  // Board picks carry an explicit kind; graded track-record picks may not, so
  // fall back to "has a game subject and no pitcher".
  return play?.kind === 'game' || (!play?.pitcherName && !!play?.subject);
}
// Normalize a track-record pick into the shape the War Room drawer expects so a
// graded pick can open the same matchup drawer without crashing.
function toDrawerPlay(p) {
  return {
    ...p,
    analysts: Array.isArray(p.analysts) ? p.analysts : [],
    consensus: p.consensus || { level: 'pass', label: '' },
  };
}
// Headline: pitchers use pitcherName; game props use the ready-made `subject`
// ("Angels @ Mariners"). `selection` is server-formatted and safe either way.
function headlineName(play) { return isGame(play) ? (play.subject || '') : (play.pitcherName || ''); }
function teamName(t) {
  if (t == null) return '';
  if (typeof t === 'string' || typeof t === 'number') return String(t);
  if (typeof t === 'object') return t.name || t.team || t.abbrev || t.abbreviation || '';
  return String(t);
}
// Proj/line summary — line is null for moneyline, so fall back to the model
// projection (the picked side's win % for moneyline).
function projSummary(play) {
  if (play.line != null) return `proj ${play.projection} vs ${play.line} line`;
  if (play.projection != null) {
    return isGame(play) && /moneyline/i.test(play.market || '')
      ? `model ${toPct(play.projection)}%`
      : `proj ${play.projection}`;
  }
  return '';
}
const STAT_LABEL = {
  game_moneyline: 'moneyline', game_total: 'total runs', game_spread: 'run line',
  strikeouts: 'strikeouts', earned_runs: 'earned runs', hits_allowed: 'hits allowed', outs: 'pitcher outs',
};
function prettyStat(s) { return s ? (STAT_LABEL[s] || String(s).replace(/^game_/, '').replace(/_/g, ' ')) : ''; }

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
  return `High-conviction ${a.side ?? ''} ${a.line ?? ''} ${prettyStat(a.statType)} hits ${w}%${b != null ? ` vs ${b}% base` : ''}${a.sample ? ` · ${a.sample.toLocaleString()} samples` : ''}`.replace(/\s+/g, ' ').trim();
}

// ── Drawer context panels (shaped by kind) ────────────────────────────────────

// Pitcher props: park + opponent-form chips and the last-5 starts grid.
function PitcherContext({ ctx, pitcherName }) {
  const park = ctxText(ctx?.parkFactor);
  const last5 = ctxText(ctx?.last5Summary);
  const opp = ctxText(ctx?.opponentForm);
  if (!park && !last5 && !opp) return null;
  const starts = last5 ? last5.split('·').map(s => s.trim()).filter(Boolean) : [];
  return (
    <>
      {(park || opp) && (
        <div className="sd-context">
          {park && <span className="sd-ctx-chip"><img src={baseballStadiumIcon} alt="" className="sd-ctx-chip-icon" />{park}</span>}
          {opp && <span className="sd-ctx-chip"><img src={playerRosterIcon} alt="" className="sd-ctx-chip-icon" />{opp}</span>}
        </div>
      )}
      {starts.length > 0 && (
        <div className="sd-recent-starts">
          <div className="sd-recent-starts-head">
            <img src={mlbScheduleIcon} alt="" className="sd-ctx-chip-icon" />
            <span className="sd-recent-starts-title">Last 5 starts</span>
            <span className="sd-recent-starts-name">{pitcherName}</span>
          </div>
          <div className="sd-recent-starts-grid">
            {starts.map((g, i) => <span key={i} className="sd-recent-start">{g}</span>)}
          </div>
        </div>
      )}
    </>
  );
}

// Read a 0-100 percentile off a benchmarked metric ({ benchmarks: { lg, pctile } }
// or a bare { pctile }); accepts fractions (0.82) or percents (82).
function readPctile(v) {
  if (!v || typeof v !== 'object') return null;
  const b = v.benchmarks || v.benchmark || v;
  const p = b && typeof b === 'object' ? b.pctile : null;
  if (typeof p !== 'number') return null;
  return Math.round(p <= 1 ? p * 100 : p);
}
function metricLabel(k) {
  return String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
// Lineup strength = percentile per metric. The lineup mirrors the pitcher-matchup
// shape (top6/team groups of benchmarked rates); pull whatever carries a pctile.
function lineupMetrics(lineup) {
  if (!lineup || typeof lineup !== 'object') return [];
  const rows = [];
  const scan = (node, group) => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      const pctile = readPctile(v);
      if (pctile != null) rows.push({ label: metricLabel(k), pctile, group });
    }
  };
  if (lineup.top6 || lineup.team) { scan(lineup.top6, 'Top 6'); scan(lineup.team, 'Team'); }
  else scan(lineup, null);
  return rows.slice(0, 6);
}

function LineupColumn({ side, team, lineup, pen }) {
  const rows = lineupMetrics(lineup);
  return (
    <div className="sd-gm-col">
      <div className="sd-gm-col-head">
        <span className="sd-gm-side">{side}</span>
        <span className="sd-gm-team">{teamName(team)}</span>
      </div>
      {rows.length > 0 ? (
        <div className="sd-gm-metrics">
          {rows.map((r, i) => (
            <div key={i} className="sd-gm-metric">
              <span className="sd-gm-metric-lbl">{r.label}{r.group ? <em> · {r.group}</em> : null}</span>
              <span className="sd-gm-bar"><span className="sd-gm-bar-fill" style={{ width: `${Math.max(2, Math.min(100, r.pctile))}%` }} /></span>
              <span className="sd-gm-metric-val">{r.pctile}<span className="sd-gm-pct">%ile</span></span>
            </div>
          ))}
        </div>
      ) : <div className="sd-muted sd-gm-empty">Lineup strength unavailable.</div>}
      <Bullpen pen={pen} />
    </div>
  );
}

function Bullpen({ pen }) {
  if (!pen || typeof pen !== 'object') return null;
  const stats = [['ERA', pen.era], ['WHIP', pen.whip], ['K/9', pen.k9], ['OPP OPS', pen.oppOps]]
    .filter(([, v]) => v != null);
  const avail = [];
  if (pen.available != null) avail.push(['ok', `${pen.available} avail`]);
  if (pen.limited != null) avail.push(['warn', `${pen.limited} limited`]);
  if (pen.unavailable != null) avail.push(['down', `${pen.unavailable} out`]);
  if (!stats.length && !avail.length) return null;
  return (
    <div className="sd-gm-pen">
      <span className="sd-gm-pen-lbl">Bullpen</span>
      {stats.length > 0 && (
        <div className="sd-gm-pen-stats">
          {stats.map(([lbl, v]) => <span key={lbl} className="sd-gm-pen-stat"><em>{lbl}</em>{v}</span>)}
        </div>
      )}
      {avail.length > 0 && (
        <div className="sd-gm-pen-avail">
          {avail.map(([cls, t]) => <span key={t} className={`sd-gm-avail ${cls}`}>{t}</span>)}
        </div>
      )}
    </div>
  );
}

// Game props: both lineups side by side (strength by percentile) + both bullpens
// + the park, in place of the pitcher profile panel.
function GameMatchupPanel({ gm, park }) {
  if (!gm || typeof gm !== 'object') {
    const pf = ctxText(park);
    return pf ? (
      <div className="sd-context"><span className="sd-ctx-chip"><img src={baseballStadiumIcon} alt="" className="sd-ctx-chip-icon" />{pf}</span></div>
    ) : null;
  }
  const p = gm.park || null;
  return (
    <div className="sd-gm">
      <div className="sd-gm-cols">
        <LineupColumn side="Away" team={gm.away} lineup={gm.lineups?.away} pen={gm.bullpens?.away} />
        <LineupColumn side="Home" team={gm.home} lineup={gm.lineups?.home} pen={gm.bullpens?.home} />
      </div>
      {p && (
        <div className="sd-gm-park">
          <img src={baseballStadiumIcon} alt="" className="sd-ctx-chip-icon" />
          <span className="sd-gm-park-venue">{p.venue || teamName(p.homeTeamAbbrev)}{p.venue && p.homeTeamAbbrev ? ` · ${p.homeTeamAbbrev}` : ''}</span>
          {p.hitsFactor != null && <span className="sd-gm-pf">Hits PF {p.hitsFactor}</span>}
          {p.hrFactor != null && <span className="sd-gm-pf">HR PF {p.hrFactor}</span>}
          {p.tilt && <span className="sd-gm-tilt">{p.tilt}</span>}
        </div>
      )}
    </div>
  );
}

// ── War Room drawer ───────────────────────────────────────────────────────────

function WarRoom({ play, onClose, onTrack, onPitcher, tracked }) {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const cm = CONSENSUS_META[play.consensus?.level] || CONSENSUS_META.pass;
  const ctx = play.reasoning?.context || {};
  const analysts = Array.isArray(play.analysts) ? play.analysts : [];
  // Track-record picks are already graded — they open the drawer to view the
  // matchup, not to be re-tracked, so hide the track/fade actions once settled.
  const settled = play.status && play.status !== 'pending';
  // Whether we have anything beyond the header to show. Graded track-record
  // picks currently arrive without the frozen matchup/analyst context, so fall
  // back to a deep-link to the full game page instead of a barren drawer.
  const hasContext = isGame(play)
    ? !!ctx.gameMatchup || !!ctxText(ctx.parkFactor)
    : !!ctxText(ctx.parkFactor) || !!ctxText(ctx.last5Summary) || !!ctxText(ctx.opponentForm);
  const hasBreakdown = hasContext || analysts.length > 0 || !!play.reasoning?.rationale;
  const openGame = () => {
    if (play.gamePk == null) return;
    onClose();
    navigate(`/mlb-schedule/${play.gamePk}`);
    window.scrollTo(0, 0);
  };

  return createPortal(
    <div className="sd-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sd-drawer" onClick={e => e.stopPropagation()}>
        <button className="sd-drawer-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="sd-drawer-head">
          <span className={`sd-badge ${cm.cls}`}>{cm.icon} {play.consensus?.label}</span>
          <h2 className="sd-drawer-sel">{play.selection}</h2>
          <div className="sd-drawer-meta">
            {isGame(play)
              ? (play.subject && <span className="sd-subject">{play.subject}</span>)
              : (play.pitcherName && <button className="sd-pitcher-link" onClick={() => onPitcher(play)} title="View player profile">{play.pitcherName}</button>)}
            {play.market && <span className="sd-pill">{play.market}</span>}
          </div>
          <div className="sd-drawer-nums">
            <div><span className="sd-num-lbl">Odds</span><span className={`sd-num ${play.odds > 0 ? 'pos' : 'neg'}`}>{fmtOdds(play.odds)}</span></div>
            {play.modelProb != null && <div><span className="sd-num-lbl">Model</span><span className="sd-num">{toPct(play.modelProb)}%</span></div>}
            {play.line != null
              ? <div><span className="sd-num-lbl">Proj vs line</span><span className="sd-num">{play.projection} / {play.line}</span></div>
              : play.projection != null && <div><span className="sd-num-lbl">Model proj</span><span className="sd-num">{isGame(play) && /moneyline/i.test(play.market || '') ? `${toPct(play.projection)}%` : play.projection}</span></div>}
            {play.ev != null && <div><span className="sd-num-lbl">EV</span><span className={`sd-num ${play.ev > 0 ? 'pos' : 'neg'}`}>{play.ev > 0 ? '+' : ''}{play.ev}%</span></div>}
          </div>
        </div>

        {/* Stage 1 — why we trust it (the audit) */}
        {auditLine(play.audit) && (
          <div className="sd-audit-basis">
            <span className="sd-audit-basis-lbl">
              <img src={machineIcon} alt="" className="sd-audit-basis-icon" />
              Audit basis
            </span>
            <p>{auditLine(play.audit)}</p>
          </div>
        )}

        {/* Stage 2 — the AI's read */}
        {play.reasoning?.rationale && (
          <div className="sd-verdict"><strong>Why this, now:</strong> {play.reasoning.rationale}</div>
        )}
        {isGame(play)
          ? <GameMatchupPanel gm={ctx.gameMatchup} park={ctx.parkFactor} />
          : <PitcherContext ctx={ctx} pitcherName={play.pitcherName} />}

        {/* The panel */}
        {analysts.length > 0 && (
        <div className="sd-room">
          <div className="sd-room-title">The War Room</div>
          {analysts.map((a, i) => (
            <div key={a.key || i} className={`sd-analyst${a.vote ? '' : ' advisory'}`}>
              <div className="sd-analyst-head">
                <span className="sd-analyst-icon">
                  {PERSONA_IMG[a.key]
                    ? <img src={PERSONA_IMG[a.key]} alt="" className="sd-analyst-icon-img" />
                    : a.icon}
                </span>
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
        )}

        {!hasBreakdown && (
          <div className="sd-drawer-empty">
            <p className="sd-muted">The full matchup breakdown isn’t stored for this graded pick yet.</p>
            {play.gamePk != null && (
              <button type="button" className="sd-btn ghost" onClick={openGame}>
                View full game matchup →
              </button>
            )}
          </div>
        )}

        {settled ? (
          <div className="sd-drawer-settled">
            <span className={`sd-day-status ${play.status}`}>{play.status}</span>
            {play.pnl != null && <span className={`sd-day-pnl ${plCls(play.pnl)}`}>{fmtUnits(play.pnl)}</span>}
            <span className="sd-muted">Graded desk pick — settled result.</span>
          </div>
        ) : (
          <div className="sd-drawer-actions">
            <button className="sd-btn primary" disabled={tracked} onClick={() => onTrack(play, 'taken')}>
              {tracked ? '✓ Tracked' : '+ Track with the desk'}
            </button>
            <button className="sd-btn ghost" disabled={tracked} onClick={() => onTrack(play, 'fade')}>
              Fade the desk
            </button>
          </div>
        )}
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
          <span className="sd-card-match sd-muted">{[play.market, projSummary(play)].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="sd-card-nums">
          <span className="sd-card-prob">{play.modelProb != null ? `${toPct(play.modelProb)}%` : '—'}<span className="sd-card-prob-lbl"> model</span></span>
          <span className={`sd-card-odds ${play.odds > 0 ? 'pos' : 'neg'}`}>{fmtOdds(play.odds)}</span>
        </div>
      </div>
      <div className="sd-card-lead">
        <span className="sd-lead-icon"><img src={aiMlIcon} alt="" className="sd-lead-icon-img" /></span>
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

// ── Daily log as a calendar (each date is a small card; click to expand) ──────

/** Parse a day's `date` (ISO YYYY-MM-DD, or a display string) to a local Date. */
function parseDayDate(raw) {
  if (!raw) return null;
  const s = String(raw);
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function pad2(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function longDate(d) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
function shortDow(d) { return d.toLocaleDateString('en-US', { weekday: 'short' }); }
function monthDay(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

function DayPicks({ picks, onOpenPlay }) {
  if (!Array.isArray(picks) || !picks.length) {
    return <div className="sd-muted sd-cal-nopicks">No graded picks this day.</div>;
  }
  return picks.map((p, j) => {
    const inner = (
      <>
        <span className="sd-day-sel">{p.selection || `${p.market || ''} ${p.side || ''} ${p.line ?? ''}`.trim() || '—'}</span>
        <span className="sd-muted">proj {p.projection ?? '—'} · actual {p.actual ?? '—'}</span>
        <span className={`sd-day-status ${p.status || 'pending'}`}>{p.status || 'pending'}</span>
        {p.pnl != null && <span className={`sd-day-pnl ${plCls(p.pnl)}`}>{fmtUnits(p.pnl)}</span>}
      </>
    );
    if (!onOpenPlay) return <div key={j} className="sd-day-pick">{inner}</div>;
    return (
      <button
        key={j}
        type="button"
        className="sd-day-pick sd-day-pick--button"
        onClick={() => onOpenPlay(toDrawerPlay(p))}
        title="Open the War Room matchup for this pick"
      >
        {inner}
        <span className="sd-day-matchup" aria-hidden="true">Matchup →</span>
      </button>
    );
  });
}

const WEEK_SIZE = 7;

function TrackCalendar({ days, onOpenPlay }) {
  // Parse + sort day-entries ascending; retain any unparseable ones as a fallback.
  const { parsed, unplaced } = useMemo(() => {
    const list = []; const extra = [];
    (days || []).forEach((d) => {
      const dt = parseDayDate(d.date);
      if (!dt) { extra.push(d); return; }
      list.push({ ...d, _dt: dt, _key: dateKey(dt) });
    });
    list.sort((a, b) => a._dt - b._dt);
    return { parsed: list, unplaced: extra };
  }, [days]);

  const total = parsed.length;
  const [weekOffset, setWeekOffset] = useState(0);   // 0 = most recent 7 days
  const [selected, setSelected] = useState(null);

  const end = Math.max(0, total - weekOffset * WEEK_SIZE);
  const start = Math.max(0, end - WEEK_SIZE);
  const windowDays = parsed.slice(start, end);
  const canOlder = start > 0;
  const canNewer = weekOffset > 0;

  const activeKey = selected || (total ? parsed[total - 1]._key : null);
  const sel = parsed.find((d) => d._key === activeKey) || null;

  const rangeLabel = windowDays.length
    ? (windowDays.length > 1
      ? `${monthDay(windowDays[0]._dt)} – ${monthDay(windowDays[windowDays.length - 1]._dt)}`
      : monthDay(windowDays[0]._dt))
    : '—';

  return (
    <div className="sd-cal">
      <div className="sd-cal-head">
        <button className="sd-cal-nav" onClick={() => setWeekOffset((o) => o + 1)} disabled={!canOlder} aria-label="Earlier week">‹</button>
        <span className="sd-cal-title">{rangeLabel}</span>
        <button className="sd-cal-nav" onClick={() => setWeekOffset((o) => Math.max(0, o - 1))} disabled={!canNewer} aria-label="Later week">›</button>
      </div>

      <div className="sd-week-strip">
        {windowDays.map((d) => {
          const u = d.unitsPnl;
          const tint = u > 0 ? 'win' : u < 0 ? 'loss' : 'even';
          return (
            <button
              key={d._key}
              className={`sd-week-box sd-cal-cell--${tint}${activeKey === d._key ? ' sd-cal-cell--sel' : ''}`}
              onClick={() => setSelected(d._key)}
            >
              <span className="sd-week-dow">{shortDow(d._dt)}</span>
              <span className="sd-week-date">{monthDay(d._dt)}</span>
              <span className="sd-cal-rec">{recordStr(d.record)}</span>
              {u != null && <span className={`sd-cal-u ${plCls(u)}`}>{fmtUnits(u)}</span>}
            </button>
          );
        })}
        {windowDays.length === 0 && <div className="sd-muted sd-cal-nopicks">No graded days yet.</div>}
      </div>

      {sel && (
        <div className="sd-cal-detail">
          <div className="sd-cal-detail-head">
            <span className="sd-cal-detail-date">{longDate(sel._dt)}</span>
            <span className="sd-muted">{recordStr(sel.record)}</span>
            {sel.unitsPnl != null && <span className={`sd-day-u ${plCls(sel.unitsPnl)}`}>{fmtUnits(sel.unitsPnl)}</span>}
          </div>
          <DayPicks picks={sel.picks} onOpenPlay={onOpenPlay} />
        </div>
      )}

      {unplaced.length > 0 && (
        <div className="sd-cal-unplaced">
          <div className="sd-cal-unplaced-title sd-muted">Other days</div>
          {unplaced.map((d, i) => (
            <div key={i} className="sd-day">
              <div className="sd-day-head">
                <span className="sd-day-date">{d.date}</span>
                <span className="sd-muted">{recordStr(d.record)}</span>
                {d.unitsPnl != null && <span className={`sd-day-u ${plCls(d.unitsPnl)}`}>{fmtUnits(d.unitsPnl)}</span>}
              </div>
              <DayPicks picks={d.picks} onOpenPlay={onOpenPlay} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackRecord({ perf, onOpenPlay }) {
  if (!perf?.summary) return null;
  const s = perf.summary;
  const win = toPct(s.winPct);
  const roi = s.roiPct != null ? Number(s.roiPct) : null;
  const days = Array.isArray(perf.days) ? perf.days : [];
  return (
    <div className="sd-record">
      <div className="sd-record-head">
        <span className="sd-record-title">
          <img src={profitAndLossIcon} alt="" className="sd-record-title-icon" />
          Scout AI Track Record
        </span>
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
        <div className="sd-record-daily">
          <div className="sd-record-daily-head">
            <span className="sd-record-daily-title">Daily log</span>
            <span className="sd-muted">{days.length} days</span>
          </div>
          <TrackCalendar days={days} onOpenPlay={onOpenPlay} />
        </div>
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
  const [autopsy, setAutopsy] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [openPlay, setOpenPlay] = useState(null);
  const [trackedIds, setTrackedIds] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate('/account', { state: { from: { pathname: '/predictions/scout-desk' } } }); return; }
    if (!hasAdminToolsAccess) navigate('/predictions');
  }, [loading, isAuthenticated, hasAdminToolsAccess, navigate]);

  const loadDesk = useCallback(() => {
    setBusy(true);
    // Track record (the desk's graded history) and the Bet Autopsy (the user's
    // own tracked bets) are independent of whether today's board is released —
    // load them alongside the desk so they render even when picks are pending
    // or the desk fetch fails.
    Promise.allSettled([buildScoutDesk(), getScoutDeskPerformance(), betLibraryService.list()])
      .then(([deskR, perfR, betsR]) => {
        if (deskR.status === 'fulfilled') { setDesk(deskR.value); setError(null); }
        else { setDesk(null); setError(deskR.reason?.message || 'Failed to load the desk.'); }
        setPerf(perfR.status === 'fulfilled' ? perfR.value : null);
        // Prefer the desk's autopsy (built after settling due bets); otherwise
        // build it directly from the bet library so it still shows on failure.
        if (deskR.status === 'fulfilled' && deskR.value?.autopsy) {
          setAutopsy(deskR.value.autopsy);
        } else {
          setAutopsy(buildAutopsy(betsR.status === 'fulfilled' ? betsR.value : []));
        }
      })
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => { loadDesk(); }, [loadDesk]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const handleTrack = useCallback(async (play, mode) => {
    try {
      await betLibraryService.add({
        correlation: mode === 'fade' ? 'watchlist' : 'taken',
        matchup: headlineName(play),
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
            <span className="sd-tag"><img src={commandCentreIcon} alt="" className="sd-tag-icon" />Scout AI - War Room</span>
            <h2 className="sd-desk-title">Three high-conviction props with a proven edge.</h2>
            <p className="sd-desk-sub">We start from the bet types our model is proven to win — pitcher props and game props (moneyline, totals, run line) — taking the exact lines and sides with the strongest historical hit rate, then read the matchup to settle on the three most convincing plays. Every board mixes at least one pitcher prop and one game prop. Open any play for the full breakdown.</p>
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
          <div className="sd-loading"><span className="pp-loading-spinner" /><span>The desk is breaking down today's slate…</span></div>
        ) : !desk ? (
          <div className="sd-empty"><span className="sd-empty-icon">🗓️</span><p>No board available right now — check back closer to first pitch.</p></div>
        ) : (
          <>
            {desk.board.length > 0 ? (
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
                    {desk.cut.map((c, i) => {
                      // Clickable (opens the War Room) only when the play carries
                      // the analyst breakdown — never open an empty drawer.
                      const clickable = Array.isArray(c.analysts) && c.analysts.length > 0;
                      const text = (
                        <span className="sd-cut-text">
                          <span className="sd-cut-sel">{c.selection}</span>
                          <span className="sd-cut-reason sd-muted">{c.reason}</span>
                        </span>
                      );
                      return clickable ? (
                        <button
                          key={c.id || i}
                          type="button"
                          className="sd-cut sd-cut--button"
                          onClick={() => setOpenPlay(c)}
                          title="Open the War Room for this play"
                        >
                          {text}
                          <span className="sd-cut-arrow" aria-hidden="true">→</span>
                        </button>
                      ) : (
                        <div key={c.id || i} className="sd-cut">{text}</div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (!desk.unlocked && desk.readyLabel) ? (
              <div className="sd-pending-banner">
                <img src={loadingPredictionsIcon} alt="" className="sd-pending-icon" aria-hidden="true" />
                <div>
                  <div className="sd-pending-title">Scout AI available by {desk.readyLabel}</div>
                  <div className="sd-pending-sub">
                    Our model and Scout AI analysis will be ready approximately 2 hours before first pitch.
                    Come back at {desk.readyLabel} for the day's picks and the full War Room breakdown.
                  </div>
                </div>
              </div>
            ) : (
              <div className="sd-empty"><span className="sd-empty-icon">🗓️</span><p>No props cleared the audit gate today — check back closer to first pitch.</p></div>
            )}
          </>
        )}

        {/* Track record + autopsy are constant — they don't depend on today's
            board, so they render even while picks are pending or errored. */}
        {!busy && (
          <>
            <TrackRecord perf={perf} onOpenPlay={setOpenPlay} />
            <Autopsy data={autopsy} />
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
