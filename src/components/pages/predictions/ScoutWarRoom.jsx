// ============================================================================
// ScoutWarRoom — the shared War Room drawer + game-matchup breakdown.
//
// Extracted from ScoutDesk so any surface carrying the same pick shape can open
// the identical drawer: the Scout Desk board, the Track Record days[].picks[],
// and the Game Predictions "Best Game Props" board. Consumers pass a `play`
// (the pick object) plus drawer handlers (onClose/onTrack/onPitcher/tracked).
// ============================================================================

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getSportsbookLabel } from '../../../data/constants/apiConstants';
import { resolveBetslipUrl } from '../../../lib/betslipLinks';
import scheduleService from '../../../data/services/scheduleService';
import { isGameFinal } from '../../../data/services/betGrader';
import { toPct } from '../../../data/services/scoutDesk';
import { loadGameSplitInsights } from '../../../data/services/gameSplitInsights';
import predictiveAnalyticsIcon from '../../../assets/icons/predictive-analytics.png';
import binocularsIcon from '../../../assets/icons/binoculars.png';
import targetIcon from '../../../assets/icons/target.png';
import machineIcon from '../../../assets/icons/machine.png';
import baseballStadiumIcon from '../../../assets/icons/baseball-stadium.png';
import mlbScheduleIcon from '../../../assets/icons/mlb-schedule.png';
import playerRosterIcon from '../../../assets/icons/player-roster.png';
import '../../../styles/predictions-page-styling/scout-desk.css';

// ── Game-final lookup ─────────────────────────────────────────────────────────
// The betslip button must disappear once a pick's game is final (you can't bet a
// finished game). Backed by the same schedule data the app uses to settle bets
// (scheduleService.getTodayGames → betGrader.isGameFinal). Cached briefly and
// shared across drawer instances so every surface (Best Game Props, Scout Desk,
// Pitcher Props) gets the check for free.
let _finalMapCache = { at: 0, promise: null };
function loadFinalMap() {
  const now = Date.now();
  if (!_finalMapCache.promise || now - _finalMapCache.at > 90000) {
    _finalMapCache = {
      at: now,
      promise: scheduleService.getTodayGames()
        .then(gs => {
          const map = {};
          (Array.isArray(gs) ? gs : []).forEach(g => { map[Number(g.game_pk)] = isGameFinal(g); });
          return map;
        })
        .catch(() => ({})),
    };
  }
  return _finalMapCache.promise;
}
function useGameFinal(gamePk) {
  const [final, setFinal] = useState(false);
  useEffect(() => {
    if (gamePk == null) { setFinal(false); return undefined; }
    let alive = true;
    loadFinalMap().then(map => { if (alive) setFinal(!!map[Number(gamePk)]); });
    return () => { alive = false; };
  }, [gamePk]);
  return final;
}

// Personas with a custom image icon (rest fall back to their vote icon).
const PERSONA_IMG = {
  quant: predictiveAnalyticsIcon,
  scout: binocularsIcon,
  sharp: targetIcon,
};

function fmtOdds(n) { return n == null ? '—' : n > 0 ? `+${n}` : String(n); }
function plCls(n) { return n > 0 ? 'pos' : n < 0 ? 'neg' : ''; }
function fmtUnits(n) { const v = Number(n) || 0; return `${v > 0 ? '+' : ''}${v.toFixed(1)}u`; }

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
  strong:    { cls: 'consensus', icon: '★', label: 'Strong' },
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

// Every pick carries kind: "pitcher" | "game". Branch all rendering on it —
// never assume a pick is a pitcher.
function isGame(play) {
  // Board picks carry an explicit kind; graded track-record picks may not, so
  // fall back to "has a game subject and no pitcher".
  return play?.kind === 'game' || (!play?.pitcherName && !!play?.subject);
}
// Normalize a pick into the shape the drawer expects so a graded/partial pick
// can open the same drawer without crashing.
function toDrawerPlay(p) {
  return {
    ...p,
    analysts: Array.isArray(p.analysts) ? p.analysts : [],
    consensus: p.consensus || { level: 'pass', label: '' },
  };
}
function teamName(t) {
  if (t == null) return '';
  if (typeof t === 'string' || typeof t === 'number') return String(t);
  if (typeof t === 'object') return t.name || t.team || t.abbrev || t.abbreviation || '';
  return String(t);
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

// Starting-pitcher splits — the venue + platoon splits flagged strong /
// exploitable (same signal as the Advanced Analysis pitcher split card).
function PitcherSplit({ pitcher }) {
  if (!pitcher || !pitcher.lines?.length) return null;
  const throwsL = pitcher.throws ? (pitcher.throws.toUpperCase() === 'L' ? 'LHP' : 'RHP') : null;
  return (
    <div className="sd-gm-psplit">
      <div className="sd-gm-psplit-head">
        <span className="sd-gm-splits-lbl">Pitcher splits</span>
        {pitcher.spName && <span className="sd-gm-psplit-name">{pitcher.spName}{throwsL ? ` · ${throwsL}` : ''}</span>}
      </div>
      {pitcher.lines.map((ln, i) => (
        <div key={i} className={`sd-gm-psplit-line tone-${ln.tone}`}>
          <span className="sd-gm-psplit-lbl">{ln.label}</span>
          <span className="sd-gm-psplit-val">{ln.value}</span>
          {ln.tone !== 'neutral' && (
            <span className="sd-gm-psplit-tag" title={ln.tone === 'strong' ? 'Strong' : 'Exploitable'}>
              {ln.tone === 'strong' ? 'Strong' : 'Exp'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Top matchup-split performers (same data as the Advanced Analysis "Key Matchup
// Insights" panel) — the best batters for this game's splits (vs the opposing
// starter's hand + home/road).
function SplitInsights({ cards }) {
  return (
    <div className="sd-gm-splits">
      <div className="sd-gm-splits-lbl">Top matchup splits</div>
      {cards.map((ins, i) => (
        <div key={i} className={`sd-gm-split${ins.type === 'strength' ? ' is-strength' : ''}`}>
          <span className="sd-gm-split-name">{ins.headline}</span>
          <div className="sd-gm-split-metrics">
            {ins.metrics.map((m, j) => (
              <span key={j} className="sd-gm-split-metric"><em>{m.label}</em> {m.value}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LineupColumn({ side, team, lineup, pen, insights }) {
  const rows = lineupMetrics(lineup);
  const loading = insights == null;
  const pitcher = insights?.pitcher || null;
  const batters = Array.isArray(insights?.batters) ? insights.batters : [];
  const hasPitcher = !!(pitcher && pitcher.lines?.length);
  const hasBatters = batters.length > 0;
  return (
    <div className="sd-gm-col">
      <div className="sd-gm-col-head">
        <span className="sd-gm-side">{side}</span>
        <span className="sd-gm-team">{teamName(team)}</span>
      </div>
      {rows.length > 0 && (
        <div className="sd-gm-metrics">
          {rows.map((r, i) => (
            <div key={i} className="sd-gm-metric">
              <span className="sd-gm-metric-lbl">{r.label}{r.group ? <em> · {r.group}</em> : null}</span>
              <span className="sd-gm-bar"><span className="sd-gm-bar-fill" style={{ width: `${Math.max(2, Math.min(100, r.pctile))}%` }} /></span>
              <span className="sd-gm-metric-val">{r.pctile}<span className="sd-gm-pct">%ile</span></span>
            </div>
          ))}
        </div>
      )}
      {/* Pitcher splits, then best matchup-split batters. */}
      {loading ? (
        rows.length === 0 && <div className="sd-muted sd-gm-empty">Loading matchup splits…</div>
      ) : (
        <>
          {hasPitcher && <PitcherSplit pitcher={pitcher} />}
          {hasBatters && <SplitInsights cards={batters} />}
          {rows.length === 0 && !hasPitcher && !hasBatters && (
            <div className="sd-muted sd-gm-empty">Lineup strength unavailable.</div>
          )}
        </>
      )}
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
function GameMatchupPanel({ gm, park, gamePk }) {
  // Top matchup-split performers per team (Advanced Analysis insights), loaded
  // by game_pk. null while loading; { away, home } once resolved.
  const [splitInsights, setSplitInsights] = useState(null);
  useEffect(() => {
    const empty = { away: { pitcher: null, batters: [] }, home: { pitcher: null, batters: [] } };
    if (gamePk == null) { setSplitInsights(empty); return; }
    let cancelled = false;
    setSplitInsights(null);
    loadGameSplitInsights(gamePk)
      .then(r => { if (!cancelled) setSplitInsights(r || empty); })
      .catch(() => { if (!cancelled) setSplitInsights(empty); });
    return () => { cancelled = true; };
  }, [gamePk]);

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
        <LineupColumn side="Away" team={gm.away} lineup={gm.lineups?.away} pen={gm.bullpens?.away} insights={splitInsights?.away ?? null} />
        <LineupColumn side="Home" team={gm.home} lineup={gm.lineups?.home} pen={gm.bullpens?.home} insights={splitInsights?.home ?? null} />
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
  const { user } = useAuth();
  const gameFinal = useGameFinal(play.gamePk);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  // Betslip deep link — user has a preferred book and a fully resolved URL exists
  // for it on this pick. play.deep_links is attached server-side keyed by book:
  // game picks carry the side-specific map, pitcher props the over/under-side map.
  // Picks with no link (incl. batter props today) omit the map, so the resolver
  // returns null and the button simply doesn't render — no per-kind gating needed.
  // Hidden once the pick's game is final — you can't add a finished game to a slip.
  const preferredBook = user?.preferredBook ?? null;
  const betslipUrl = gameFinal
    ? null
    : resolveBetslipUrl(play.deep_links, preferredBook, { stateCode: user?.stateCode ?? null });
  const betslipLabel = betslipUrl ? getSportsbookLabel(preferredBook) : null;

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
              ? (play.subject && (
                  play.gamePk != null
                    ? <button type="button" className="sd-subject sd-subject--link" onClick={openGame} title="View the full matchup">{play.subject}</button>
                    : <span className="sd-subject">{play.subject}</span>
                ))
              : (play.pitcherName && <button className="sd-pitcher-link" onClick={() => onPitcher && onPitcher(play)} title="View player profile">{play.pitcherName}</button>)}
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

        {betslipUrl && betslipLabel && (
          <a className="sd-betslip-btn" href={betslipUrl} target="_blank" rel="noopener noreferrer">
            Add to {betslipLabel} slip
          </a>
        )}

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
          ? <GameMatchupPanel gm={ctx.gameMatchup} park={ctx.parkFactor} gamePk={play.gamePk} />
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
        ) : onTrack ? (
          <div className="sd-drawer-actions">
            <button className="sd-btn primary" disabled={tracked} onClick={() => onTrack(play, 'taken')}>
              {tracked ? '✓ Tracked' : '+ Track with the desk'}
            </button>
            <button className="sd-btn ghost" disabled={tracked} onClick={() => onTrack(play, 'fade')}>
              Fade the desk
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

// ── Best Props board ──────────────────────────────────────────────────────────
// The curated daily "best bets" board (game props or pitcher props). Same pick
// shape as the drawer — clicking a card opens the War Room. Hidden when empty.

function ConvictionDots({ n }) {
  const v = Math.max(0, Math.min(5, Number(n) || 0));
  return (
    <span className="sd-bp-conv" title={`Conviction ${v}/5`}>
      {Array.from({ length: 5 }, (_, i) => <span key={i} className={`sd-bp-cdot${i < v ? ' on' : ''}`} />)}
    </span>
  );
}

function BestPropsBoard({ picks, onOpen, title = 'Best Props', subtitle }) {
  if (!Array.isArray(picks) || picks.length === 0) return null;
  return (
    <div className="sd-bp">
      <div className="sd-bp-head">
        <span className="sd-bp-dot" />
        {title}
        {subtitle && <span className="sd-bp-sub">{subtitle}</span>}
      </div>
      <div className="sd-bp-grid">
        {picks.map((p, i) => {
          const cm = CONSENSUS_META[p.consensus?.level] || CONSENSUS_META.pass;
          const w = p.audit?.winPct;
          const base = p.audit?.basePct;
          const evPos = (p.ev ?? 0) > 0;
          return (
            <button
              key={p.id || i}
              type="button"
              className={`sd-bp-card ${cm.cls}`}
              onClick={() => onOpen(p)}
              title="Open the War Room breakdown"
            >
              <div className="sd-bp-card-top">
                <span className={`sd-badge ${cm.cls}`}>{cm.icon} {p.consensus?.label || cm.label}</span>
                {p.conviction != null && <ConvictionDots n={p.conviction} />}
              </div>
              <div className="sd-bp-sel">{p.selection}</div>
              <div className="sd-bp-meta">
                {p.market && <span className="sd-bp-market">{p.market}</span>}
                {p.subject && <span className="sd-bp-subject">{p.subject}</span>}
              </div>
              <div className="sd-bp-stats">
                <div className="sd-bp-stat">
                  <span>Odds</span>
                  <strong className={p.odds > 0 ? 'pos' : 'neg'}>{fmtOdds(p.odds)}</strong>
                </div>
                {w != null && (
                  <div className="sd-bp-stat">
                    <span>Hit rate</span>
                    <strong>{w}%{base != null && <em> vs {base}%</em>}</strong>
                  </div>
                )}
                {p.ev != null && (
                  <div className="sd-bp-stat">
                    <span>EV</span>
                    <strong className={evPos ? 'pos' : 'neg'}>{evPos ? '+' : ''}{p.ev}%</strong>
                  </div>
                )}
              </div>
              <span className="sd-bp-cta">War Room →</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export {
  WarRoom,
  BestPropsBoard,
  CONSENSUS_META,
  isGame,
  toDrawerPlay,
  fmtOdds,
  plCls,
  fmtUnits,
};
