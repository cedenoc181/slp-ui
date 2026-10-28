import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import predictionsService from '../../../data/services/predictionsService';
import playerStatsService from '../../../data/services/playerStatsServices';
import teamsService from '../../../data/services/teamsService';
import gamesService from '../../../data/services/gamesService';
import trustLedgerService from '../../../data/services/trustLedgerService';
import { getEliminatedMlbIds } from '../../../data/services/postseasonStatus';
import betLibraryService, { summarize, betPL } from '../../../data/services/betLibraryService';
import watchlistService, { WATCHLIST_LIMITS } from '../../../data/services/watchlistService';
import { listPublished, apiPostToDisplay } from '../../../data/services/contentService';
import articlesData from '../../../data/contentData/article.json';
import moreArticlesData from '../../../data/contentData/moreArticles.json';
import { getTeamById, getTeamByDisplayName, TEAMS } from '../../../data/constants/apiConstants';
import { PANELS, abbr, fmtOdds, useTerminalSlate } from './TerminalShell';
import '../../../styles/terminal-page-styling/terminal.css';

/*
  The Terminal dashboard — the dense multi-panel grid rendered inside
  TerminalShell (top bar, ticker, rail, Cmd+K) at /terminal. Every panel
  reads live data.

  Clicking a panel opens it as a half-viewport sheet with a fuller slice of the
  same data (a shortcut, not the whole page); the sheet's footer routes to the
  real page when the user needs everything.
*/

const DIVISIONS = ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West'];

// ── Layout (drag-to-reorder) ────────────────────────────────────────────────
// Users can drag panels by their grip to rearrange the grid. The order is kept
// per user in localStorage; unknown ids are dropped and panels added later are
// appended, so a saved layout never hides a panel.
const DEFAULT_ORDER = PANELS.map(p => p.id);

function layoutKey(user) {
  return `slt-layout:${user?.id ?? 'guest'}`;
}

function loadOrder(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(saved)) return DEFAULT_ORDER;
    const kept = [...new Set(saved)].filter(id => DEFAULT_ORDER.includes(id));
    return [...kept, ...DEFAULT_ORDER.filter(id => !kept.includes(id))];
  } catch {
    return DEFAULT_ORDER;
  }
}

function saveOrder(key, order) {
  try { localStorage.setItem(key, JSON.stringify(order)); } catch {}
}

function moveTo(order, id, index) {
  const next = order.filter(x => x !== id);
  next.splice(Math.max(0, Math.min(index, next.length)), 0, id);
  return next;
}

// Panels read the grip handlers from here instead of threading them through
// every panel component.
const LayoutContext = createContext(null);

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtUnits(u) {
  if (u == null) return '—';
  return `${u > 0 ? '+' : ''}${u.toFixed(2)}u`;
}

function fmtPct(v, d = 1) {
  return v == null ? '—' : `${v.toFixed(d)}%`;
}

// Win% convention: 3 decimals, no leading zero (".634").
function fmtWinPct(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : n.toFixed(3).replace(/^0/, '');
}

function tone(v) {
  return v == null || v === 0 ? '' : v > 0 ? 'pos' : 'neg';
}

// Trust Ledger sends team names, either full ("Los Angeles Dodgers") or bare
// nickname ("Dodgers") — resolve both to a TEAMS entry.
function teamByName(name) {
  if (!name) return null;
  return TEAMS.find(t => t.name === name || name.endsWith(` ${t.name}`))
    || getTeamByDisplayName(name)
    || getTeamByDisplayName(name.split(' ').slice(-2).join(' '))
    || getTeamByDisplayName(name.split(' ').pop());
}

function relativeDate(iso) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function gameStatusLabel(g) {
  if (g.state === 'live') return 'LIVE';
  if (g.state === 'final') return 'Final';
  return g.time;
}

function useStandings() {
  const [standings, setStandings] = useState(null); // { 'AL East': [...] } | {} on error
  useEffect(() => {
    let alive = true;
    teamsService.getTeamRegularSeasonStandings()
      .then(data => { if (alive) setStandings(data || {}); })
      .catch(() => { if (alive) setStandings({}); });
    return () => { alive = false; };
  }, []);
  return standings;
}

// ── Building blocks ─────────────────────────────────────────────────────────

// Clicks on real controls inside a panel (links, buttons, selects) keep their
// own behavior; a click anywhere else on the card opens the sheet.
function isInteractive(target, root) {
  for (let el = target; el && el !== root; el = el.parentElement) {
    if (['A', 'BUTTON', 'SELECT', 'INPUT', 'LABEL'].includes(el.tagName)) return true;
  }
  return false;
}

function Panel({ id, title, sub, action, full, flash, onExpand, children }) {
  const layout = useContext(LayoutContext);
  const onClick = (e) => {
    if (!onExpand || isInteractive(e.target, e.currentTarget)) return;
    onExpand(id);
  };
  const onKeyDown = (e) => {
    if (onExpand && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onExpand(id);
    }
  };

  return (
    <section
      id={`slt-panel-${id}`}
      data-panel-id={id}
      className={`slt-panel${full ? ' slt-panel--full' : ''}${flash ? ' slt-flash' : ''}${onExpand ? ' slt-panel--expandable' : ''}${layout?.dragId === id ? ' slt-panel--dragging' : ''}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={onExpand ? 0 : undefined}
      aria-label={onExpand && typeof title === 'string' ? `Expand ${title}` : undefined}
    >
      <div className="slt-panel-head">
        <span className="slt-panel-title">
          {layout && (
            <button
              type="button"
              className="slt-grip"
              aria-label={typeof title === 'string' ? `Move ${title} panel (arrow keys)` : 'Move panel (arrow keys)'}
              title="Drag to rearrange"
              onPointerDown={(e) => layout.startDrag(id, e)}
              onKeyDown={(e) => layout.onGripKey(id, e)}
            >
              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
                <circle cx="2.5" cy="2.5" r="1.3" /><circle cx="7.5" cy="2.5" r="1.3" />
                <circle cx="2.5" cy="7" r="1.3" /><circle cx="7.5" cy="7" r="1.3" />
                <circle cx="2.5" cy="11.5" r="1.3" /><circle cx="7.5" cy="11.5" r="1.3" />
              </svg>
            </button>
          )}
          <span className="slt-dot" />{title}
        </span>
        <span className="slt-panel-tools">
          {action || (sub && <span className="slt-panel-sub">{sub}</span>)}
          {onExpand && (
            <button type="button" className="slt-expand-btn" onClick={() => onExpand(id)} aria-label="Expand panel" title="Expand">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          )}
        </span>
      </div>
      {children}
    </section>
  );
}

// Half-viewport sheet: a fuller slice of the panel's data plus a route to the
// real page. Rendered into <body> so it sits above the rail and ticker.
function Sheet({ open, title, sub, route, routeLabel, onClose, children }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      // The Cmd+K palette handles its own Escape first (preventDefault).
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="slt slt-ui slt-sheet-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="slt-sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <header className="slt-sheet-head">
          <div>
            <span className="slt-panel-title"><span className="slt-dot" />{title}</span>
            {sub && <div className="slt-sheet-sub">{sub}</div>}
          </div>
          <button ref={closeRef} type="button" className="slt-sheet-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="slt-sheet-body">{children}</div>
        {route && (
          <footer className="slt-sheet-foot">
            <span className="slt-faint">Shortcut view · limited data</span>
            <Link to={route} className="slt-sheet-cta" onClick={() => window.scrollTo(0, 0)}>
              {routeLabel} →
            </Link>
          </footer>
        )}
      </aside>
    </div>,
    document.body
  );
}

function Empty({ children }) {
  return <div className="slt-empty">{children}</div>;
}

function Skeleton({ rows = 3 }) {
  return Array.from({ length: rows }, (_, i) => <div key={i} className="slt-skeleton" aria-hidden="true" />);
}

function Locked({ text }) {
  return (
    <div className="slt-locked">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>{text}</span>
      <Link to="/upgrade" className="slt-locked-cta">Upgrade to Premium</Link>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="slt-sheet-section">{children}</div>;
}

function Sparkline({ points, width = 52, height = 20 }) {
  if (!points || points.length < 2) return <span className="slt-spark-empty" style={{ width }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = (width - 2) / (points.length - 1);
  const coords = points.map((v, i) => `${(1 + i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`).join(' ');
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={coords} fill="none" stroke={up ? 'var(--slt-good)' : 'var(--slt-warn)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StandingsTable({ rows }) {
  return (
    <table className="slt-table">
      <thead>
        <tr><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>STRK</th></tr>
      </thead>
      <tbody>
        {rows.map(t => {
          const streak = String(t.streak_code || '');
          return (
            <tr key={t.team_abbreviation}>
              <td className="team">{t.team_abbreviation}</td>
              <td className="slt-mono">{t.wins}</td>
              <td className="slt-mono">{t.losses}</td>
              <td className="slt-mono">{fmtWinPct(t.w_l_pct)}</td>
              <td className="slt-mono">{t.games_back == null || Number(t.games_back) === 0 ? '—' : t.games_back}</td>
              <td className={`slt-mono ${streak.startsWith('W') ? 'pos' : streak.startsWith('L') ? 'neg' : ''}`}>{streak || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function sortedDivision(standings, division) {
  const list = standings?.[division];
  return Array.isArray(list) ? [...list].sort((a, b) => a.division_rank - b.division_rank) : [];
}

// ── Watchlist ───────────────────────────────────────────────────────────────
function useLast10(teamIds) {
  const [series, setSeries] = useState({}); // teamId → { pts, w, l, games }
  const key = (teamIds || []).join(',');

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const ids = key.split(',').map(Number);
    Promise.allSettled(ids.map(id => gamesService.getTeamLast10(id))).then(results => {
      if (!alive) return;
      const next = {};
      ids.forEach((id, i) => {
        const res = results[i];
        const rows = res.status === 'fulfilled' && Array.isArray(res.value) ? res.value : [];
        // Oldest → newest, then a running +1/-1 so the line climbs on wins.
        const ordered = [...rows].sort((a, b) => String(a.game_date || a.date || '').localeCompare(String(b.game_date || b.date || '')));
        let run = 0;
        let w = 0;
        let l = 0;
        const pts = [0];
        const games = [];
        ordered.forEach(g => {
          const isHome = g.home_team_id === id;
          const mine = isHome ? g.home_runs_score : g.away_runs_score;
          const theirs = isHome ? g.away_runs_score : g.home_runs_score;
          if (mine == null || theirs == null || mine === theirs) return;
          const won = mine > theirs;
          run += won ? 1 : -1;
          if (won) w += 1; else l += 1;
          pts.push(run);
          games.push({
            key: g.game_pk ?? g.id ?? games.length,
            won,
            score: `${mine}-${theirs}`,
            opp: `${isHome ? 'vs' : '@'} ${abbr(isHome ? g.away_team_id : g.home_team_id)}`,
          });
        });
        next[id] = { pts, w, l, games };
      });
      setSeries(next);
    });
    return () => { alive = false; };
  }, [key]);

  return series;
}

// MLB headshot (falls back to MLB's generic silhouette). Players saved before
// mlbId was stored still carry it at the end of their profile slug.
function playerMlbId(p) {
  if (p?.mlbId != null) return p.mlbId;
  const m = String(p?.slug ?? '').match(/(\d+)$/);
  return m ? m[1] : null;
}

function PlayerHeadshot({ player, size }) {
  const mlbId = playerMlbId(player);
  const cls = `slt-headshot${size ? ` slt-headshot--${size}` : ''}`;
  if (!mlbId) return <TeamLogo teamId={player?.teamId} size={size} />;
  return (
    <img
      src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_120,q_auto:best/v1/people/${mlbId}/headshot/67/current`}
      alt=""
      className={cls}
      loading="lazy"
      onError={(e) => { e.target.style.visibility = 'hidden'; }}
    />
  );
}

// Debounced player search for the watchlist's "add player" box.
function usePlayerSearch(query) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      playerStatsService.searchPlayers(q, 8)
        .then(r => { if (alive) setResults(Array.isArray(r) ? r : []); })
        .catch(() => { if (alive) setResults([]); })
        .finally(() => { if (alive) setSearching(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);
  return { results, searching };
}

function WatchlistPanel({ standings, games, flash, expanded, onExpand, onClose }) {
  const { user } = useAuth();
  const favoriteTeamId = user?.favoriteTeamId ?? null;
  const userId = user?.id ?? null;
  // 'api' = saved to the account · 'local' = endpoint not live yet, saved on this device
  const [mode, setMode] = useState(null);
  const [list, setList] = useState(null); // { teamIds, players, playersSupported }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState('');
  const { results, searching } = usePlayerSearch(query);

  useEffect(() => {
    let alive = true;
    setLoadError(null);
    watchlistService.get()
      .then(data => { if (alive) { setMode('api'); setList(data); } })
      .catch(err => {
        if (!alive) return;
        // Only "not deployed yet" falls back to the device store; auth and
        // server errors surface instead of silently switching storage.
        if (err.status === 404) {
          setMode('local');
          setList(watchlistService.loadLocal(userId, favoriteTeamId));
          return;
        }
        setMode('error');
        setLoadError(err.status === 401
          ? 'Your session expired — sign in again to load your watchlist.'
          : 'Couldn\'t load your watchlist right now. Try again shortly.');
      });
    return () => { alive = false; };
  }, [userId, favoriteTeamId]);

  // The server may send players as bare ids; fill in name / team / slug.
  const missingKey = (list?.players || []).filter(p => !p.name).map(p => p.id).join(',');
  useEffect(() => {
    if (!missingKey) return;
    const ids = missingKey.split(',');
    let alive = true;
    Promise.allSettled(ids.map(id => playerStatsService.lookupPlayer({ playerId: id })))
      .then(res => {
        if (!alive) return;
        const found = {};
        ids.forEach((id, i) => {
          const v = res[i].status === 'fulfilled' ? res[i].value : null;
          if (v) found[id] = { name: v.full_name, teamId: v.team_id, mlbId: v.mlb_id ?? null, slug: v.name_slug ?? v.mlb_id };
        });
        setList(l => l && { ...l, players: l.players.map(p => (found[p.id] ? { ...p, ...found[p.id] } : p)) });
      });
    return () => { alive = false; };
  }, [missingKey]);

  const teamIds = list?.teamIds ?? null;
  const series = useLast10(teamIds);

  const byAbbr = useMemo(() => {
    const map = {};
    Object.values(standings || {}).flat().forEach(t => { if (t?.team_abbreviation) map[t.team_abbreviation] = t; });
    return map;
  }, [standings]);

  const nextGame = useCallback((teamId) => {
    const g = (games || []).find(x => x.homeId === teamId || x.awayId === teamId);
    if (!g) return 'No game today';
    const isHome = g.homeId === teamId;
    const opp = `${isHome ? 'vs' : '@'} ${isHome ? g.away : g.home}`;
    if (g.state === 'live') return `${opp} · LIVE ${g.awayRuns ?? 0}-${g.homeRuns ?? 0}`;
    if (g.state === 'final') return `${opp} · Final ${g.awayRuns ?? 0}-${g.homeRuns ?? 0}`;
    return `${opp} · ${g.time}`;
  }, [games]);

  // Optimistic: show the change at once, roll back if the server refuses it.
  // `changed` is 'teams' or 'players': the server replaces only the type we send.
  const save = useCallback(async (next, changed) => {
    if (!list || saving) return;
    const prev = list;
    setList(next);
    setSaveError(null);
    if (mode === 'local') { watchlistService.saveLocal(userId, next); return; }
    setSaving(true);
    try {
      const saved = changed === 'teams'
        ? await watchlistService.setTeams(next.teamIds)
        : await watchlistService.setPlayers(next.players.map(p => p.id));
      // The response is the source of truth; only fill gaps for ids it sent bare.
      const known = Object.fromEntries(next.players.map(p => [p.id, p]));
      setList({ ...saved, players: saved.players.map(p => (p.name ? p : (known[p.id] || p))) });
    } catch (err) {
      setList(prev);
      setSaveError(err.status === 422 && err.message
        ? err.message
        : err.status === 401
          ? 'Your session expired — sign in again to save changes.'
          : 'Could not save your watchlist. Try again.');
    } finally {
      setSaving(false);
    }
  }, [list, mode, saving, userId]);

  const toggleTeam = useCallback((teamId) => {
    if (!list) return;
    const has = list.teamIds.includes(teamId);
    if (!has && list.teamIds.length >= WATCHLIST_LIMITS.teams) {
      setSaveError(`You can follow up to ${WATCHLIST_LIMITS.teams} teams.`);
      return;
    }
    save({ ...list, teamIds: has ? list.teamIds.filter(id => id !== teamId) : [...list.teamIds, teamId] }, 'teams');
  }, [list, save]);

  const addPlayer = useCallback((r) => {
    if (!list || list.players.some(p => p.id === r.id)) return;
    if (list.players.length >= WATCHLIST_LIMITS.players) {
      setSaveError(`You can follow up to ${WATCHLIST_LIMITS.players} players.`);
      return;
    }
    save({ ...list, players: [...list.players, { id: r.id, name: r.full_name, teamId: r.team_id, mlbId: r.mlb_id ?? null, slug: r.name_slug ?? r.mlb_id, active: r.active !== false }] }, 'players');
  }, [list, save]);

  const removePlayer = useCallback((id) => {
    if (!list) return;
    save({ ...list, players: list.players.filter(p => p.id !== id) }, 'players');
  }, [list, save]);

  const watched = (teamIds || []).map(id => getTeamById(id)).filter(Boolean);
  const players = list?.players || [];
  const firstTeam = watched[0];
  const canAddPlayers = list?.playersSupported !== false;
  // The card previews at most 3 rows (teams first, then players); the sheet lists everything.
  const PREVIEW_ROWS = 3;
  const previewTeams = watched.slice(0, PREVIEW_ROWS);
  const previewPlayers = players.slice(0, Math.max(0, PREVIEW_ROWS - previewTeams.length));
  const hiddenCount = watched.length + players.length - previewTeams.length - previewPlayers.length;
  const summary = list
    ? [`${watched.length} team${watched.length === 1 ? '' : 's'}`, players.length ? `${players.length} player${players.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')
    : '';

  return (
    <>
      <Panel
        id="watchlist"
        title="Watchlist"
        flash={flash}
        onExpand={onExpand}
        sub={summary}
        action={list && <button type="button" className="slt-link" onClick={() => onExpand('watchlist')}>Manage</button>}
      >
        {list === null && (loadError ? <Empty>{loadError}</Empty> : <Skeleton rows={3} />)}

        {list !== null && watched.length === 0 && players.length === 0 && (
          <Empty>Nothing on your watchlist yet — hit Manage to follow teams or players.</Empty>
        )}

        {list !== null && previewTeams.map(team => {
          const s = byAbbr[team.id];
          const streak = String(s?.streak_code || '');
          const up = streak.startsWith('W');
          return (
            <div className="slt-wl-row" key={`t-${team.teamId}`}>
              <div className="slt-team-cell">
                <TeamLogo mlbId={team.mlbId} size="lg" />
                <div>
                  <div className="slt-wl-team">{team.id}</div>
                  <span className="slt-wl-next">{nextGame(team.teamId)}</span>
                </div>
              </div>
              <div className="slt-mono">{s ? `${s.wins}-${s.losses}` : '—'}</div>
              <div className={`slt-mono slt-wl-pct ${streak ? (up ? 'pos' : 'neg') : ''}`}>
                {s ? fmtWinPct(s.w_l_pct) : '—'} {streak && (up ? '▲' : '▼')}
              </div>
              <Sparkline points={series[team.teamId]?.pts} />
            </div>
          );
        })}

        {list !== null && previewPlayers.map(p => (
          <div className={`slt-wl-row slt-wl-row--player${p.active === false ? ' slt-wl-inactive' : ''}`} key={`p-${p.id}`}>
            <div className="slt-team-cell">
              <PlayerHeadshot player={p} size="lg" />
              <div>
                <div className="slt-wl-team">{p.name || '…'}</div>
                <span className="slt-wl-next">
                  {p.active === false ? 'Inactive' : p.teamId != null ? `${[abbr(p.teamId), p.position].filter(Boolean).join(' · ')} · ${nextGame(p.teamId)}` : 'Player'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {hiddenCount > 0 && (
          <p className="slt-footnote">+{hiddenCount} more · open the watchlist to see all</p>
        )}
        {mode === 'local' && (watched.length > 0 || players.length > 0) && (
          <p className="slt-footnote">Saved on this device · syncing to your account is coming soon.</p>
        )}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Watchlist"
        sub="Follow the teams and players you bet on — add or remove them here"
        route={firstTeam ? `/team-analytics/${firstTeam.urlName}` : '/team-analytics'}
        routeLabel={firstTeam && watched.length === 1 ? `Open ${firstTeam.name} analytics` : 'Open Team Analytics'}
      >
        {list === null && (loadError ? <Empty>{loadError}</Empty> : <Skeleton rows={4} />)}
        {saveError && <p className="slt-error slt-wl-error">{saveError}</p>}
        {mode === 'local' && (
          <p className="slt-footnote slt-wl-note">Your watchlist is saved on this device for now. Account sync turns on once the server update ships.</p>
        )}

        {list !== null && (
          <>
            <SectionLabel>Teams · {watched.length}/{WATCHLIST_LIMITS.teams}</SectionLabel>
            <div className="slt-chips slt-wl-chips">
              {TEAMS.map(t => (
                <button
                  type="button"
                  key={t.teamId}
                  className={`slt-chip${list.teamIds.includes(t.teamId) ? ' active' : ''}`}
                  onClick={() => toggleTeam(t.teamId)}
                  disabled={saving}
                  aria-pressed={list.teamIds.includes(t.teamId)}
                  title={list.teamIds.includes(t.teamId) ? `Remove ${t.name}` : `Follow ${t.name}`}
                >
                  {t.id}
                </button>
              ))}
            </div>

            {watched.map(team => {
              const s = byAbbr[team.id];
              const l10 = series[team.teamId];
              const streak = String(s?.streak_code || '');
              return (
                <div className="slt-sheet-card" key={team.teamId}>
                  <div className="slt-sheet-card-head">
                    <div className="slt-team-cell">
                      <TeamLogo mlbId={team.mlbId} size="lg" />
                      <div>
                        <div className="slt-sheet-card-title">{team.name}</div>
                        <div className="slt-wl-next">{nextGame(team.teamId)}</div>
                      </div>
                    </div>
                    <span className="slt-wl-actions">
                      <Link to={`/team-analytics/${team.urlName}`} className="slt-link">Team analytics →</Link>
                      <button type="button" className="slt-wl-remove" onClick={() => toggleTeam(team.teamId)} disabled={saving} aria-label={`Remove ${team.name}`} title="Remove">✕</button>
                    </span>
                  </div>
                  <div className="slt-kv-grid">
                    <div><span>Record</span><b className="slt-mono">{s ? `${s.wins}-${s.losses}` : '—'}</b></div>
                    <div><span>Win %</span><b className="slt-mono">{s ? fmtWinPct(s.w_l_pct) : '—'}</b></div>
                    <div><span>GB</span><b className="slt-mono">{s?.games_back == null || Number(s?.games_back) === 0 ? '—' : s.games_back}</b></div>
                    <div><span>Streak</span><b className={`slt-mono ${streak.startsWith('W') ? 'pos' : streak.startsWith('L') ? 'neg' : ''}`}>{streak || '—'}</b></div>
                    <div><span>Last 10</span><b className="slt-mono">{l10 ? `${l10.w}-${l10.l}` : '—'}</b></div>
                  </div>
                  {l10?.games?.length > 0 && (
                    <div className="slt-l10">
                      <Sparkline points={l10.pts} width={140} height={28} />
                      <div className="slt-l10-games">
                        {l10.games.map(g => (
                          <span key={g.key} className={`slt-l10-game ${g.won ? 'pos' : 'neg'}`} title={`${g.opp} ${g.score}`}>
                            {g.won ? 'W' : 'L'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <SectionLabel>Players · {players.length}/{WATCHLIST_LIMITS.players}</SectionLabel>
            {!canAddPlayers ? (
              <Empty>Saving players needs the updated watchlist server — teams still save.</Empty>
            ) : (
              <div className="slt-wl-search">
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search players to follow…"
                  aria-label="Search players to follow"
                />
                {query.trim().length >= 2 && (
                  <ul className="slt-wl-results">
                    {searching && results.length === 0 && <li className="slt-faint">Searching…</li>}
                    {!searching && results.length === 0 && <li className="slt-faint">No players found.</li>}
                    {results.map(r => {
                      const added = players.some(p => p.id === r.id);
                      return (
                        <li key={r.id}>
                          <span className="slt-team-cell">
                            <PlayerHeadshot player={{ mlbId: r.mlb_id, teamId: r.team_id }} size="sm" />
                            {r.full_name}
                            {r.team_id != null && <span className="slt-faint">{abbr(r.team_id)}</span>}
                          </span>
                          <button type="button" className={`slt-chip${added ? ' active' : ''}`} onClick={() => addPlayer(r)} disabled={added || saving}>
                            {added ? 'Following' : 'Follow'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {players.length === 0 && canAddPlayers && <p className="slt-footnote">Search above to follow individual players.</p>}
            {players.map(p => (
              <div className={`slt-sheet-card${p.active === false ? ' slt-wl-inactive' : ''}`} key={`p-${p.id}`}>
                <div className="slt-sheet-card-head">
                  <div className="slt-team-cell">
                    <PlayerHeadshot player={p} size="lg" />
                    <div>
                      <div className="slt-sheet-card-title">{p.name || '…'}</div>
                      <div className="slt-wl-next">
                        {[
                          p.teamId != null ? (getTeamById(p.teamId)?.name || abbr(p.teamId)) : null,
                          p.position,
                          p.active === false ? 'Inactive' : (p.teamId != null ? nextGame(p.teamId) : null),
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <span className="slt-wl-actions">
                    {p.slug && <Link to={`/player/${encodeURIComponent(p.slug)}`} className="slt-link">Player profile →</Link>}
                    <button type="button" className="slt-wl-remove" onClick={() => removePlayer(p.id)} disabled={saving} aria-label={`Remove ${p.name || 'player'}`} title="Remove">✕</button>
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </Sheet>
    </>
  );
}

// ── Today's Top Props (War Room boards — public) ───────────────────────────
const BADGE = {
  strong:    { cls: 'consensus', label: 'Consensus' },
  consensus: { cls: 'consensus', label: 'Consensus' },
  contested: { cls: 'contested', label: 'Contested' },
  split:     { cls: 'contested', label: 'Contested' },
  lean:      { cls: 'lean',      label: 'Lean' },
};

// Picks carry the player's internal id but not their team; look each one up
// once (lookupPlayer returns the current team_id) so prop rows can show a logo.
function usePlayerTeams(picks) {
  const [teams, setTeams] = useState({});
  const key = (picks || []).map(p => p.playerId).filter(id => id != null).join(',');
  useEffect(() => {
    const ids = [...new Set(key ? key.split(',') : [])];
    if (!ids.length) return;
    let alive = true;
    Promise.allSettled(ids.map(id => playerStatsService.lookupPlayer({ playerId: id })))
      .then(results => {
        if (!alive) return;
        const next = {};
        ids.forEach((id, i) => {
          const r = results[i];
          if (r.status === 'fulfilled' && r.value?.team_id != null) next[id] = r.value.team_id;
        });
        setTeams(next);
      });
    return () => { alive = false; };
  }, [key]);
  return teams;
}

function PropRow({ p, detailed, teamId }) {
  const b = BADGE[p.consensus?.level];
  const player = p.pitcherName || p.playerName;
  const subject = player || p.subject;
  const rationale = p.reasoning?.rationale || p.scoutReasoning;
  return (
    <div className={`slt-prop${detailed ? ' slt-prop--detailed' : ''}`}>
      <div className="slt-prop-top">
        <span className="slt-prop-sel">{p.selection || `${p.side ?? ''} ${p.line ?? ''}`}</span>
        {b && <span className={`slt-badge ${b.cls}`}>{p.consensus?.label || b.label}</span>}
      </div>
      <div className="slt-prop-meta">
        <span className="slt-prop-subject">
          {p.market || p.statType}
          {(p.market || p.statType) && subject && ' · '}
          {player && teamId != null && <TeamLogo teamId={teamId} size="sm" />}
          {subject}
        </span>
        <span className="slt-mono">{fmtOdds(p.odds) ?? ''}</span>
      </div>
      {detailed && rationale && <p className="slt-prop-why">{rationale}</p>}
      {detailed && Array.isArray(p.analysts) && p.analysts.length > 0 && (
        <div className="slt-prop-votes">
          {p.analysts.map(a => (
            <span key={a.key || a.name} className="slt-vote" title={a.take || ''}>
              {a.name || a.key}{a.vote ? ` · ${a.vote}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PropsPanel({ flash, expanded, onExpand, onClose }) {
  const [picks, setPicks] = useState(null);
  const [locked, setLocked] = useState(false); // board exists but hasn't generated today

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      predictionsService.getBestGameProps(),
      predictionsService.getBestPitcherProps(),
    ]).then(([gameRes, pitcherRes]) => {
      if (!alive) return;
      const boards = [gameRes, pitcherRes].filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
      setLocked(boards.length > 0 && boards.every(b => !b.lockedAt));
      setPicks(boards.flatMap(b => (Array.isArray(b.picks) ? b.picks : [])));
    });
    return () => { alive = false; };
  }, []);
  const playerTeams = usePlayerTeams(picks);

  const emptyText = locked ? 'Today\'s board hasn\'t locked yet — check back closer to first pitch.' : 'No props cleared the bar today.';

  return (
    <>
      <Panel id="props" title="Today's Top Props" flash={flash} onExpand={onExpand} sub={picks?.length ? `${Math.min(4, picks.length)} of ${picks.length}` : null}>
        {picks === null && <Skeleton rows={3} />}
        {picks !== null && picks.length === 0 && <Empty>{emptyText}</Empty>}
        {picks?.slice(0, 4).map((p, i) => <PropRow key={p.id ?? i} p={p} teamId={playerTeams[p.playerId]} />)}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Today's Top Props"
        sub="Every War Room pick on today's board, with the room's reasoning"
        route="/predictions/scout-desk"
        routeLabel="Open the War Room"
      >
        {picks !== null && picks.length === 0 && <Empty>{emptyText}</Empty>}
        {picks?.map((p, i) => <PropRow key={p.id ?? i} p={p} teamId={playerTeams[p.playerId]} detailed />)}
      </Sheet>
    </>
  );
}

// ── Trust Ledger ────────────────────────────────────────────────────────────
// Today's ET game day as YYYY-MM-DD — the ledger's date (and so its season
// year) is the ET day, not the viewer's local one.
function etToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// Same logo source as the full Trust Ledger page; a missing logo hides itself
// so the row keeps its alignment.
function TeamLogo({ mlbId, teamId, size }) {
  if (!mlbId && teamId != null) mlbId = getTeamById(teamId)?.mlbId;
  const cls = `slt-team-logo${size ? ` slt-team-logo--${size}` : ''}`;
  if (!mlbId) return <span className={`${cls} slt-team-logo--empty`} />;
  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${mlbId}.svg`}
      alt=""
      className={cls}
      loading="lazy"
      onError={(e) => { e.target.style.visibility = 'hidden'; }}
    />
  );
}

function TrustLedgerPanel({ flash, expanded, onExpand, onClose }) {
  const [teams, setTeams] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | locked | error
  const [postseason, setPostseason] = useState(false);
  const [eliminated, setEliminated] = useState(() => new Set()); // mlb_team_id, from the bracket
  const [date] = useState(etToday);
  const season = date.slice(0, 4);

  // Postseason only: an eliminated club's empty SP cell reads "eliminated",
  // not "no game" — a club still alive between games keeps "no game".
  useEffect(() => {
    if (!postseason) { setEliminated(new Set()); return; }
    let alive = true;
    getEliminatedMlbIds(season).then(ids => { if (alive) setEliminated(ids); });
    return () => { alive = false; };
  }, [postseason, season]);

  // Same default as the full Trust Ledger page: probe the postseason board
  // first and use it when non-empty, else fall back to the regular season.
  // The server scopes postseason=true to the playoff field of the requested
  // date's year, so passing today's ET date means a prior year's bracket can
  // never load here — in the offseason the probe comes back empty.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const fail = (err) => {
      if (err.name === 'AbortError') return;
      setStatus(err.status === 403 ? 'locked' : 'error');
    };
    const loadRegular = () => trustLedgerService.getTrustLedger(date, { signal })
      .then(data => { setPostseason(false); setTeams(Array.isArray(data) ? data : []); setStatus('ok'); })
      .catch(fail);

    trustLedgerService.getTrustLedger(date, { postseason: true, signal })
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) { setPostseason(true); setTeams(list); setStatus('ok'); }
        else loadRegular();
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        if (err.status === 403) { setStatus('locked'); return; }
        // Probe failed for a non-auth reason — the regular board is the sane default.
        loadRegular();
      });
    return () => controller.abort();
  }, [date]);

  const modeLabel = `${season} ${postseason ? 'postseason' : 'regular season'}`;

  const lockedText = 'Every graded pick and a trust score for all 30 teams.';

  return (
    <>
      <Panel id="ledger" title="Trust Ledger" flash={flash} onExpand={onExpand} sub={status === 'ok' ? `${modeLabel} · top 5` : null}>
        {status === 'loading' && <Skeleton rows={5} />}
        {status === 'error' && <Empty>Trust Ledger unavailable right now.</Empty>}
        {status === 'locked' && <Locked text={lockedText} />}
        {status === 'ok' && teams.length === 0 && <Empty>No trust scores yet.</Empty>}
        {status === 'ok' && teams.slice(0, 5).map((t, i) => {
          const meta = teamByName(t.team);
          return (
            <div className="slt-tl-row" key={t.team || i}>
              <span className="slt-tl-rank slt-mono">{i + 1}</span>
              <span className="slt-tl-team slt-team-cell"><TeamLogo mlbId={meta?.mlbId} />{meta?.id || t.team}</span>
              <div className="slt-bar"><div className="slt-bar-fill" style={{ width: `${t.trustPercentile ?? 0}%` }} /></div>
              <span className="slt-tl-score slt-mono">{t.trustPercentile == null ? '—' : t.trustPercentile.toFixed(1)}</span>
            </div>
          );
        })}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Trust Ledger"
        sub={status === 'ok'
          ? `${modeLabel} · ${postseason ? `the ${teams.length} playoff clubs` : `all ${teams.length} clubs`} ranked by trust · ${postseason ? 'playoff record' : 'season form'} and today's starter`
          : 'Clubs ranked by trust · season form and today\'s starter'}
        route="/predictions/trust-ledger"
        routeLabel="Open the full Trust Ledger"
      >
        {status === 'locked' && <Locked text={lockedText} />}
        {status === 'error' && <Empty>Trust Ledger unavailable right now.</Empty>}
        {status === 'ok' && teams.length > 0 && (
          <table className="slt-table slt-table--sheet">
            <thead>
              <tr><th>#</th><th>Team</th><th>Trust</th><th>{postseason ? 'Playoff' : 'Season'}</th><th>L10</th><th>Today's SP</th></tr>
            </thead>
            <tbody>
              {teams.map((t, i) => {
                const meta = teamByName(t.team);
                return (
                  <tr key={t.team || i}>
                    <td className="slt-mono slt-faint">{i + 1}</td>
                    <td className="team"><span className="slt-team-cell"><TeamLogo mlbId={meta?.mlbId} />{meta?.id || t.team}</span></td>
                    <td>
                      <span className="slt-trust-cell">
                        <span className="slt-bar"><span className="slt-bar-fill" style={{ width: `${t.trustPercentile ?? 0}%` }} /></span>
                        <span className="slt-mono">{t.trustPercentile == null ? '—' : t.trustPercentile.toFixed(1)}</span>
                      </span>
                    </td>
                    <td className="slt-mono">{fmtWinPct(t.winPct)}</td>
                    <td className="slt-mono">{t.lastTen || '—'}</td>
                    <td className="slt-sp">{t.spName || <span className="slt-faint">{postseason && eliminated.has(meta?.mlbId) ? 'eliminated' : 'no game'}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Sheet>
    </>
  );
}

// ── Sandlot Insider ─────────────────────────────────────────────────────────
const STATIC_ARTICLES = [...(articlesData?.articles || []), ...(moreArticlesData?.articles || [])];

function InsiderPanel({ flash, expanded, onExpand, onClose }) {
  const [articles, setArticles] = useState(STATIC_ARTICLES);

  // Same merge as the Insider page: API posts replace static ones by slug.
  useEffect(() => {
    let alive = true;
    listPublished({ type: 'article', limit: 20 })
      .then(rows => {
        if (!alive || !Array.isArray(rows)) return;
        const bySlug = new Map(STATIC_ARTICLES.map(a => [a.slug, a]));
        rows.map(apiPostToDisplay).forEach(a => { if (a?.slug) bySlug.set(a.slug, a); });
        setArticles([...bySlug.values()]);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const sorted = useMemo(
    () => [...articles].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    [articles]
  );

  return (
    <>
      <Panel id="insider" title="Sandlot Insider" flash={flash} onExpand={onExpand} sub="latest">
        {sorted.length === 0 && <Empty>No articles yet.</Empty>}
        {sorted.slice(0, 3).map(a => (
          <div className="slt-ins-row" key={a.slug}>
            <div className="slt-ins-headline">{a.title}</div>
            <div className="slt-ins-meta">Sandlot Insider · {relativeDate(a.date)}</div>
          </div>
        ))}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Sandlot Insider"
        sub="The latest picks write-ups and analysis"
        route="/sandlot-insider"
        routeLabel="Open Sandlot Insider"
      >
        {sorted.slice(0, 6).map(a => (
          <Link to={`/sandlot-insider/${a.slug}`} className="slt-sheet-card slt-sheet-card--link" key={a.slug}>
            <div className="slt-ins-headline">{a.title}</div>
            <div className="slt-ins-meta">
              {[a.author, relativeDate(a.date), a.read_time_minutes ? `${a.read_time_minutes} min read` : null].filter(Boolean).join(' · ')}
            </div>
            {a.summary && <p className="slt-ins-summary">{a.summary}</p>}
          </Link>
        ))}
      </Sheet>
    </>
  );
}

// ── Model Board (premium predictions) ───────────────────────────────────────
function PredictionsPanel({ flash, expanded, onExpand, onClose }) {
  const { isPremium } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    let alive = true;
    predictionsService.getToday()
      .then(data => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) { setError(true); setRows([]); } });
    return () => { alive = false; };
  }, [isPremium]);

  // Model's side on each game, most confident first. Rows without a
  // prediction are still inside the release gate (unlocks ~2h pre-pitch).
  const picks = useMemo(() => (rows || [])
    .filter(r => r.prediction?.p_home_win != null)
    .map(r => {
      const pHome = r.prediction.p_home_win;
      const homeSide = pHome >= 0.5;
      return {
        id: r.game_pk,
        matchup: `${abbr(r.away_team_id)} @ ${abbr(r.home_team_id)}`,
        pick: abbr(homeSide ? r.home_team_id : r.away_team_id),
        pickTeamId: homeSide ? r.home_team_id : r.away_team_id,
        prob: (homeSide ? pHome : 1 - pHome) * 100,
        odds: fmtOdds(homeSide ? r.odds?.home_moneyline_game : r.odds?.away_moneyline_game),
        total: r.prediction.predicted_total,
        line: r.odds?.over_under_line_game ?? null,
      };
    })
    .sort((a, b) => b.prob - a.prob), [rows]);

  const pending = (rows || []).length - picks.length;
  const emptyText = error ? 'Predictions unavailable right now.'
    : pending > 0 ? 'Predictions unlock about 2 hours before first pitch.'
    : 'No games with predictions today.';
  const lockedText = 'Win probability and projected totals for every game today.';

  return (
    <>
      <Panel id="predictions" title="Model Board" flash={flash} onExpand={onExpand} sub="premium">
        {!isPremium && <Locked text={lockedText} />}
        {isPremium && rows === null && <Skeleton rows={4} />}
        {isPremium && rows !== null && picks.length === 0 && <Empty>{emptyText}</Empty>}
        {picks.slice(0, 6).map(p => (
          <div className="slt-tl-row slt-tl-row--board" key={p.id}>
            <span className="slt-faint slt-board-matchup">{p.matchup}</span>
            <span className="slt-tl-team slt-team-cell"><TeamLogo teamId={p.pickTeamId} size="sm" />{p.pick} ML</span>
            <div className="slt-bar"><div className="slt-bar-fill" style={{ width: `${p.prob}%` }} /></div>
            <span className="slt-tl-score slt-mono">{fmtPct(p.prob, 0)}</span>
          </div>
        ))}
        {picks.length > 0 && pending > 0 && (
          <p className="slt-footnote">{pending} more game{pending === 1 ? '' : 's'} unlock about 2 hours before first pitch.</p>
        )}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Model Board"
        sub="The model's side, win probability, and projected total for every released game"
        route="/predictions/games"
        routeLabel="Open Game Props"
      >
        {!isPremium && <Locked text={lockedText} />}
        {isPremium && picks.length === 0 && <Empty>{emptyText}</Empty>}
        {picks.length > 0 && (
          <table className="slt-table slt-table--sheet slt-table--board">
            <thead>
              <tr><th>Matchup</th><th className="pick">Pick</th><th>Odds</th><th>Win prob</th><th>Proj. total</th><th>Line</th></tr>
            </thead>
            <tbody>
              {picks.map(p => (
                <tr key={p.id}>
                  <td className="team slt-faint">{p.matchup}</td>
                  <td className="pick"><span className="slt-team-cell"><TeamLogo teamId={p.pickTeamId} size="sm" />{p.pick} ML</span></td>
                  <td className="slt-mono">{p.odds ?? '—'}</td>
                  <td className="slt-mono">{fmtPct(p.prob)}</td>
                  <td className="slt-mono">{p.total != null ? Number(p.total).toFixed(1) : '—'}</td>
                  <td className="slt-mono">{p.line ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {picks.length > 0 && pending > 0 && (
          <p className="slt-footnote">{pending} more game{pending === 1 ? '' : 's'} unlock about 2 hours before first pitch.</p>
        )}
      </Sheet>
    </>
  );
}

// ── Bet Library ─────────────────────────────────────────────────────────────
function BetStats({ s }) {
  return (
    <div className="slt-stats">
      <div className="slt-stat">
        <span className="slt-stat-label">Units</span>
        <span className={`slt-stat-value ${tone(s.units)}`}>{fmtUnits(s.units)}</span>
      </div>
      <div className="slt-stat">
        <span className="slt-stat-label">Record</span>
        <span className="slt-stat-value">{s.wins}-{s.losses}-{s.pushes}</span>
      </div>
      <div className="slt-stat">
        <span className="slt-stat-label">ROI</span>
        <span className={`slt-stat-value ${tone(s.roi)}`}>{fmtPct(s.roi)}</span>
      </div>
      <div className="slt-stat">
        <span className="slt-stat-label">Pending</span>
        <span className="slt-stat-value">{s.pending}</span>
      </div>
    </div>
  );
}

function BetLibraryPanel({ flash, expanded, onExpand, onClose }) {
  const [bets, setBets] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    betLibraryService.list()
      .then(list => { if (alive) setBets(list); })
      .catch(() => { if (alive) { setError(true); setBets([]); } });
    return () => { alive = false; };
  }, []);

  const s = useMemo(() => (bets ? summarize(bets) : null), [bets]);
  const empty = bets !== null && !error && bets.length === 0;

  return (
    <>
      <Panel id="library" title="Bet Library" flash={flash} onExpand={onExpand} sub={bets?.length ? `${bets.length} bets` : null}>
        {bets === null && <Skeleton rows={2} />}
        {bets !== null && error && <Empty>Bet Library unavailable right now.</Empty>}
        {empty && <Empty>No bets logged yet. <Link to="/predictions/bet-library">Log your first bet</Link> to start tracking P&amp;L.</Empty>}
        {s && bets.length > 0 && <BetStats s={s} />}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Bet Library"
        sub="Your flat-unit P&L and most recent bets"
        route="/predictions/bet-library"
        routeLabel="Open the Bet Library"
      >
        {empty && <Empty>No bets logged yet.</Empty>}
        {s && bets.length > 0 && (
          <>
            <BetStats s={s} />
            <SectionLabel>Recent bets</SectionLabel>
            <table className="slt-table slt-table--sheet">
              <thead>
                <tr><th>Bet</th><th>Odds</th><th>Status</th><th>P/L</th></tr>
              </thead>
              <tbody>
                {bets.slice(0, 8).map(b => {
                  const pl = b.status === 'pending' ? null : betPL(b);
                  return (
                    <tr key={b.id}>
                      <td className="team">
                        {b.selection || '—'}
                        <span className="slt-cell-sub">{[b.matchup, b.market].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td className="slt-mono">{fmtOdds(b.odds) ?? '—'}</td>
                      <td className={`slt-status slt-status--${b.status}`}>{b.status}</td>
                      <td className={`slt-mono ${tone(pl)}`}>{pl == null ? '—' : fmtUnits(pl)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </Sheet>
    </>
  );
}

// ── Standings ───────────────────────────────────────────────────────────────
function StandingsPanel({ standings, flash, expanded, onExpand, onClose }) {
  const [division, setDivision] = useState('AL East');
  const rows = useMemo(() => sortedDivision(standings, division), [standings, division]);

  return (
    <>
      <Panel
        id="standings"
        title="Standings"
        flash={flash}
        onExpand={onExpand}
        action={(
          <select className="slt-select" value={division} onChange={(e) => setDivision(e.target.value)} aria-label="Division">
            {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      >
        {standings === null && <Skeleton rows={5} />}
        {standings !== null && rows.length === 0 && <Empty>Standings unavailable right now.</Empty>}
        {rows.length > 0 && <StandingsTable rows={rows} />}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Standings"
        sub="All six divisions"
        route="/mlb-standings"
        routeLabel="Open full MLB Standings"
      >
        <div className="slt-div-grid">
          {DIVISIONS.map(d => {
            const divRows = sortedDivision(standings, d);
            return (
              <div key={d}>
                <SectionLabel>{d}</SectionLabel>
                {divRows.length ? <StandingsTable rows={divRows} /> : <Empty>Unavailable</Empty>}
              </div>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

// ── Live Game ───────────────────────────────────────────────────────────────
// "Gerrit Cole" → "G. Cole", the same short form the MLB Schedule uses.
function shortName(full) {
  if (!full) return null;
  const parts = full.trim().split(/\s+/);
  return parts.length < 2 ? full : `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(' ')}`;
}

// Season ERA for the featured game's two starters (regular season of the
// current year). The schedule only carries the starters' ids and names.
function useStarterEras(game) {
  const [eras, setEras] = useState({});
  const awayId = game?.awaySpId ?? null;
  const homeId = game?.homeSpId ?? null;
  useEffect(() => {
    const ids = [awayId, homeId].filter(id => id != null);
    if (!ids.length) { setEras({}); return; }
    let alive = true;
    const season = etToday().slice(0, 4);
    Promise.allSettled(ids.map(id => playerStatsService.getPitcherCurrentStats(id, season)))
      .then(results => {
        if (!alive) return;
        const next = {};
        ids.forEach((id, i) => {
          const era = results[i].status === 'fulfilled' ? results[i].value?.era : null;
          if (era != null && !Number.isNaN(Number(era))) next[id] = Number(era);
        });
        setEras(next);
      });
    return () => { alive = false; };
  }, [awayId, homeId]);
  return eras;
}

// "{logo} NYY  G. Cole (3.12)"
function TeamWithStarter({ teamId, team, spName, era }) {
  return (
    <span className="slt-team-cell">
      <TeamLogo teamId={teamId} />
      {team}
      <span className="slt-sp-tag">
        {spName ? shortName(spName) : 'TBD'}
        {spName && era != null && <span className="slt-mono"> ({era.toFixed(2)})</span>}
      </span>
    </span>
  );
}

function BoxScore({ game, boxscore, eras = {} }) {
  const innings = useMemo(() => {
    const list = boxscore?.innings || [];
    const count = Math.max(9, list.length);
    return Array.from({ length: count }, (_, i) => list.find(x => (x.inning ?? 0) === i + 1) || list[i] || null);
  }, [boxscore]);

  return (
    <div className="slt-box-scroll">
      <table className="slt-box">
        <thead>
          <tr>
            <th className="team" />
            {innings.map((_, i) => <th key={i}>{i + 1}</th>)}
            <th>R</th><th>H</th><th>E</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['away', game.away, game.awayId, game.awaySp, eras[game.awaySpId], boxscore?.away_runs ?? game.awayRuns, boxscore?.away_hits ?? game.awayHits, boxscore?.away_errors ?? game.awayErrors],
            ['home', game.home, game.homeId, game.homeSp, eras[game.homeSpId], boxscore?.home_runs ?? game.homeRuns, boxscore?.home_hits ?? game.homeHits, boxscore?.home_errors ?? game.homeErrors],
          ].map(([side, team, teamId, spName, era, r, h, e]) => (
            <tr key={side}>
              <td className="team"><TeamWithStarter teamId={teamId} team={team} spName={spName} era={era} /></td>
              {innings.map((ing, i) => (
                <td key={i} className="slt-mono">{ing ? (ing[`${side}_runs`] ?? '-') : '-'}</td>
              ))}
              <td className="slt-mono slt-box-total">{r ?? '—'}</td>
              <td className="slt-mono">{h ?? '—'}</td>
              <td className="slt-mono">{e ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveGamePanel({ games, flash, expanded, onExpand, onClose }) {
  // Featured game: first live one, else the most recent final, else next up.
  const featured = useMemo(() => {
    if (!games?.length) return null;
    return games.find(g => g.state === 'live')
      || [...games].reverse().find(g => g.state === 'final')
      || games[0];
  }, [games]);

  const [boxscore, setBoxscore] = useState(null);
  const pk = featured?.state !== 'pre' ? featured?.gamePk : null;
  const awayRuns = featured?.awayRuns;
  const homeRuns = featured?.homeRuns;

  // Re-fetch whenever the slate poll moves the score.
  useEffect(() => {
    if (!pk) { setBoxscore(null); return; }
    let alive = true;
    gamesService.getBoxscore(pk, { ttl: 0 })
      .then(bs => { if (alive) setBoxscore(bs?.innings?.length ? bs : null); })
      .catch(() => { if (alive) setBoxscore(null); });
    return () => { alive = false; };
  }, [pk, awayRuns, homeRuns]);

  const eras = useStarterEras(featured);

  const tag = featured?.state === 'live'
    ? <span className="slt-live-tag">LIVE{featured.status && !/progress|live/i.test(featured.status) ? ` · ${featured.status}` : ''}</span>
    : featured?.state === 'final' ? <span className="slt-final-tag">FINAL</span> : null;
  const heading = featured?.state === 'live' ? 'Live Game' : featured?.state === 'final' ? 'Latest Final' : 'Next Up';

  return (
    <>
      <Panel
        id="live"
        full
        flash={flash}
        onExpand={onExpand}
        title={<>{heading} {tag}</>}
        sub={featured ? `${featured.away} @ ${featured.home}` : null}
      >
        {games === null && <Skeleton rows={2} />}
        {games !== null && !featured && <Empty>No games on the schedule today.</Empty>}
        {featured?.state === 'pre' && (
          <Empty>
            <TeamWithStarter teamId={featured.awayId} team={featured.away} spName={featured.awaySp} era={eras[featured.awaySpId]} />
            {' @ '}
            <TeamWithStarter teamId={featured.homeId} team={featured.home} spName={featured.homeSp} era={eras[featured.homeSpId]} />
            {' · first pitch '}{featured.time}
            {featured.mlAway && featured.mlHome && <> · <span className="slt-mono">{featured.mlAway} / {featured.mlHome}</span></>}
          </Empty>
        )}
        {featured && featured.state !== 'pre' && <BoxScore game={featured} boxscore={boxscore} eras={eras} />}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title={<>{heading} {tag}</>}
        sub="Box score plus every game on today's slate"
        route={featured ? `/mlb-schedule/${featured.id}` : '/mlb-schedule'}
        routeLabel={featured ? `Open ${featured.away} @ ${featured.home} matchup` : 'Open MLB Schedule'}
      >
        {featured && featured.state !== 'pre' && (
          <>
            <SectionLabel>{featured.away} @ {featured.home}</SectionLabel>
            <BoxScore game={featured} boxscore={boxscore} eras={eras} />
          </>
        )}
        {games?.length > 0 && (
          <>
            <SectionLabel>Today's slate</SectionLabel>
            <div className="slt-slate">
              {games.map(g => (
                <Link to={`/mlb-schedule/${g.id}`} className="slt-slate-row" key={g.id}>
                  <span className="slt-tl-team slt-matchup">
                    <span className="slt-team-cell"><TeamLogo teamId={g.awayId} size="sm" />{g.away}</span>
                    <span className="slt-faint">@</span>
                    <span className="slt-team-cell"><TeamLogo teamId={g.homeId} size="sm" />{g.home}</span>
                  </span>
                  <span className="slt-mono">
                    {g.state === 'pre'
                      ? [g.mlAway && g.mlHome ? `${g.mlAway} / ${g.mlHome}` : null, g.total != null ? `O/U ${g.total}` : null].filter(Boolean).join(' · ')
                      : `${g.awayRuns ?? 0}–${g.homeRuns ?? 0}`}
                  </span>
                  <span className={g.state === 'live' ? 'slt-live-text' : 'slt-faint'}>{gameStatusLabel(g)}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export default function TerminalPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { games } = useTerminalSlate();
  const standings = useStandings();
  const [flashId, setFlashId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const storageKey = layoutKey(user);
  const [order, setOrder] = useState(() => loadOrder(storageKey));
  const [dragId, setDragId] = useState(null);
  const orderRef = useRef(order);
  orderRef.current = order;

  // Every preview card is capped at the Watchlist card's height (laptop and
  // up, see terminal.css). The Watchlist aligns to the top of its row, so this
  // reads its natural height rather than a row-stretched one. Floor keeps an
  // empty watchlist from crushing the other cards.
  const gridRef = useRef(null);
  useEffect(() => {
    const grid = gridRef.current;
    const wl = grid?.querySelector('[data-panel-id="watchlist"]');
    if (!grid || !wl || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      grid.style.setProperty('--slt-card-max', `${Math.max(wl.offsetHeight, 240)}px`);
    });
    ro.observe(wl);
    return () => ro.disconnect();
  }, []);

  // Auth can resolve after first render; pick up that user's saved layout.
  useEffect(() => { setOrder(loadOrder(storageKey)); }, [storageKey]);

  // Pointer-driven (not HTML5 drag-and-drop) so it works with touch too. The
  // grid reorders live as the pointer crosses other panels.
  const startDrag = useCallback((id, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragId(id);
    let lastOver = null;

    const onMove = (ev) => {
      const overId = document.elementFromPoint(ev.clientX, ev.clientY)
        ?.closest('[data-panel-id]')?.dataset.panelId;
      // Only swap on entering a new panel, so a taller neighbour sliding under
      // the pointer doesn't flip the pair back and forth.
      if (overId && overId !== id && overId !== lastOver) {
        setOrder(o => moveTo(o, id, o.indexOf(overId)));
      }
      lastOver = overId === id ? null : overId;

      const edge = 60;
      if (ev.clientY < edge) window.scrollBy(0, -14);
      else if (ev.clientY > window.innerHeight - edge) window.scrollBy(0, 14);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDragId(null);
      saveOrder(storageKey, orderRef.current);
      // Releasing over a panel fires a click on it; don't let that open the sheet.
      const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [storageKey]);

  const onGripKey = useCallback((id, e) => {
    const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const cur = orderRef.current;
    const next = moveTo(cur, id, cur.indexOf(id) + step);
    setOrder(next);
    saveOrder(storageKey, next);
    // Moving a node in the DOM can drop focus; put it back on the same grip.
    requestAnimationFrame(() => {
      const grip = document.querySelector(`#slt-panel-${id} .slt-grip`);
      grip?.focus();
      grip?.scrollIntoView({ block: 'nearest' });
    });
  }, [storageKey]);

  const resetLayout = useCallback(() => {
    setOrder(DEFAULT_ORDER);
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  const layout = useMemo(() => ({ dragId, startDrag, onGripKey }), [dragId, startDrag, onGripKey]);
  const isCustomLayout = order.some((id, i) => id !== DEFAULT_ORDER[i]);

  const expand = useCallback((id) => setExpandedId(id), []);
  const collapse = useCallback(() => setExpandedId(null), []);

  // Cmd+K panel jumps arrive as route state ({ focus: panelId }); keyed on
  // location.key so re-jumping to the same panel replays the flash.
  const focusId = location.state?.focus;
  useEffect(() => {
    if (!focusId) return;
    setExpandedId(null);
    document.getElementById(`slt-panel-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(null);
    const raf = requestAnimationFrame(() => setFlashId(focusId));
    return () => cancelAnimationFrame(raf);
  }, [focusId, location.key]);

  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), 1000);
    return () => clearTimeout(t);
  }, [flashId]);

  const panelProps = (id) => ({
    flash: flashId === id,
    expanded: expandedId === id,
    onExpand: expand,
    onClose: collapse,
  });

  const panels = {
    watchlist:   <WatchlistPanel standings={standings} games={games} {...panelProps('watchlist')} />,
    props:       <PropsPanel {...panelProps('props')} />,
    ledger:      <TrustLedgerPanel {...panelProps('ledger')} />,
    insider:     <InsiderPanel {...panelProps('insider')} />,
    predictions: <PredictionsPanel {...panelProps('predictions')} />,
    library:     <BetLibraryPanel {...panelProps('library')} />,
    standings:   <StandingsPanel standings={standings} {...panelProps('standings')} />,
    live:        <LiveGamePanel games={games} {...panelProps('live')} />,
  };

  return (
    <div className={`slt-ui slt-dash${dragId ? ' slt--dragging' : ''}`}>
      {isCustomLayout && (
        <div className="slt-dash-bar">
          <button className="slt-layout-reset" type="button" onClick={resetLayout} title="Restore the default panel order">
            Reset layout
          </button>
        </div>
      )}
      <LayoutContext.Provider value={layout}>
        <div className="slt-grid" ref={gridRef}>
          {order.map(id => <Fragment key={id}>{panels[id]}</Fragment>)}
        </div>
      </LayoutContext.Provider>
    </div>
  );
}
