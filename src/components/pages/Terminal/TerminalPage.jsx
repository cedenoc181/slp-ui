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
import { LEAGUES, WINTER_ENABLED, leagueTabTip } from '../../../data/constants/leagues';
import cbpcService from '../../../data/services/cbpcService';
import { CBPC_LEAGUES, CBPC_SLUGS, isNationsLeague, rememberWinterLeague, rememberedWinterLeague, seasonLabel } from '../../../data/constants/cbpcConstants';
import { PANELS, abbr, fmtOdds, useTerminalSlate } from './TerminalShell';
import { byStart, doubleheaderLabel, fmtTime as fmtWinterTime } from '../Winter/winterUi';
import useWinterPredictions from '../predictions/useWinterPredictions';
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

// ── Leagues ─────────────────────────────────────────────────────────────────
// The dash bar's league switcher (LEAGUES lives in constants/leagues). The
// choice is kept per user like the layout, and only selectable ids are restored.
function leagueKey(user) {
  return `slt-league:${user?.id ?? 'guest'}`;
}

function loadLeague(key) {
  try {
    const saved = localStorage.getItem(key);
    return LEAGUES.some(l => l.id === saved && (l.status !== 'soon' || WINTER_ENABLED.includes(l.id))) ? saved : 'mlb';
  } catch {
    return 'mlb';
  }
}

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
              <td className="slt-mono">{t.games_back == null || t.games_back === '-' || Number(t.games_back) === 0 ? '—' : t.games_back}</td>
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
        // Doubleheaders share a date, so break ties on series_game_number
        // (game 1 before game 2) — otherwise the day's games can flip.
        const ordered = [...rows].sort((a, b) =>
          String(a.game_date || a.date || '').localeCompare(String(b.game_date || b.date || ''))
          || (a.series_game_number ?? 0) - (b.series_game_number ?? 0));
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

// ── Winter-league watchlist (Serie del Caribe tab) ──────────────────────────
// Winter teams/players are cbpc_team / cbpc_player entries in the same list.
// Images come from the URLs the API returns (some guest nations' logos 404,
// so those fall back to the abbreviation). CBPC ids never reach MLB helpers.
function WinterLogo({ src, code, size = 'lg' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const cls = `slt-team-logo slt-team-logo--${size}`;
  if (!src || failed) return <span className={`${cls} slt-team-logo--abbr`}>{code || '?'}</span>;
  return <img src={src} alt="" className={cls} loading="lazy" onError={() => setFailed(true)} />;
}

function WinterHeadshot({ src, size = 'lg' }) {
  if (!src) return <span className={`slt-headshot slt-headshot--${size}`} />;
  return <img src={src} alt="" className={`slt-headshot slt-headshot--${size}`} loading="lazy" onError={(e) => { e.target.style.visibility = 'hidden'; }} />;
}

// Record (standings), today's game and a last-10 line for each watched
// winter team, using each league's current season.
function useWinterTeamForm(teams) {
  const key = teams.filter(t => t.league).map(t => `${t.league}:${t.id}`).join(',');
  const [form, setForm] = useState({});
  useEffect(() => {
    if (!key) { setForm({}); return; }
    let alive = true;
    const byLeague = {};
    key.split(',').forEach(k => {
      const [slug, id] = k.split(':');
      (byLeague[slug] = byLeague[slug] || []).push(Number(id));
    });
    (async () => {
      const leagues = await cbpcService.getLeagues().catch(() => []);
      const seasonOf = slug => leagues.find(l => l.slug === slug)?.current_season;
      const next = {};
      await Promise.all(Object.entries(byLeague).map(async ([slug, ids]) => {
        const season = seasonOf(slug);
        const [standings, today] = await Promise.all([
          cbpcService.getStandings(slug, season, 'R').catch(() => ({ teams: [] })),
          cbpcService.getTodayGames(slug).catch(() => []),
        ]);
        await Promise.all(ids.map(async id => {
          const recent = await cbpcService.getTeamGames(slug, id, season).catch(() => []);
          // Newest first from the API → oldest first, last 10 decided games.
          let run = 0;
          const pts = [0];
          const games = [];
          recent.slice(0, 10).reverse().forEach(g => {
            const home = g.home_team_id === id;
            const mine = home ? g.home_runs_score : g.away_runs_score;
            const theirs = home ? g.away_runs_score : g.home_runs_score;
            if (mine == null || theirs == null || mine === theirs) return;
            const won = mine > theirs;
            run += won ? 1 : -1;
            pts.push(run);
            games.push({ key: g.game_pk, won, score: `${mine}-${theirs}`, opp: `${home ? 'vs' : '@'} ${home ? g.away_team_abbr : g.home_team_abbr}` });
          });
          next[id] = {
            row: (standings.teams || []).find(t => t.team_id === id) || null,
            // A doubleheader gives two games today: show the next unfinished one
            // (Game 1, then Game 2), or the last one once both are over.
            game: (() => {
              const mine = today.filter(g => g.home_team_id === id || g.away_team_id === id).sort(byStart);
              return mine.find(g => g.status !== 'Final' && g.status !== 'Completed Early') || mine[mine.length - 1] || null;
            })(),
            pts,
            games,
          };
        }));
      }));
      if (alive) setForm(next);
    })();
    return () => { alive = false; };
  }, [key]);
  return form;
}

// Statuses refresh once a day, so in-progress games show no score.
function winterGameLine(teamId, g) {
  if (!g) return 'No game today';
  const home = g.home_team_id === teamId;
  const dh = doubleheaderLabel(g);
  const opp = `${home ? 'vs' : '@'} ${home ? g.away_team_abbr : g.home_team_abbr}${dh ? ` · ${dh}` : ''}`;
  if (g.status === 'Final' || g.status === 'Completed Early') return `${opp} · Final ${g.away_runs_score ?? 0}-${g.home_runs_score ?? 0}`;
  if (g.status === 'Scheduled') {
    // TBD times read "Time TBD" / "follows Game 1" (the Game 2 label is already there).
    return `${opp} · ${fmtWinterTime(g, { short: true }).replace(/^Game 2 · /, '')}`;
  }
  return `${opp} · ${g.status === 'In Progress' ? 'In progress' : g.status}`;
}

// Player search across every winter league at once (one request per league);
// the same CBPC player can appear in several leagues, so ids are de-duped.
function useWinterPlayerSearch(query) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      Promise.allSettled(CBPC_SLUGS.map(slug => cbpcService.searchPlayers(slug, q, 5))).then(settled => {
        if (!alive) return;
        const seen = new Map();
        settled.forEach(s => (s.status === 'fulfilled' ? s.value : []).forEach(p => { if (!seen.has(p.id)) seen.set(p.id, p); }));
        setResults([...seen.values()].slice(0, 10));
        setSearching(false);
      });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);
  return { results, searching };
}

function WinterWatchlist({ list, mode, loadError, saveError, setSaveError, saving, save, limits, flash, expanded, onExpand, onClose }) {
  const [pickLeague, setPickLeague] = useState('lidom');
  const [leagueTeams, setLeagueTeams] = useState(null);
  const [query, setQuery] = useState('');
  const { results, searching } = useWinterPlayerSearch(query);

  const teams = list?.cbpcTeams ?? [];
  const players = list?.cbpcPlayers ?? [];
  const form = useWinterTeamForm(teams);
  const supported = mode === 'api' && !!list?.winterSupported;

  // Picker: the selected winter league's clubs (or nations) this season.
  useEffect(() => {
    if (!expanded) return;
    let alive = true;
    setLeagueTeams(null);
    cbpcService.getTeams(pickLeague)
      .then(rows => { if (alive) setLeagueTeams([...rows].sort((a, b) => a.team_name.localeCompare(b.team_name))); })
      .catch(() => { if (alive) setLeagueTeams([]); });
    return () => { alive = false; };
  }, [expanded, pickLeague]);

  const toggleTeam = (t) => {
    if (!list || !supported) return;
    const has = teams.some(x => x.id === t.id);
    if (!has && teams.length >= limits.cbpc_teams) {
      setSaveError(`You can follow up to ${limits.cbpc_teams} winter-league teams.`);
      return;
    }
    const next = has
      ? teams.filter(x => x.id !== t.id)
      : [...teams, { id: t.id, league: pickLeague, name: t.team_name, abbr: t.team_abbreviation, logoUrl: t.logo_url }];
    save({ ...list, cbpcTeams: next }, 'cbpc_teams');
  };
  const removeTeam = (id) => save({ ...list, cbpcTeams: teams.filter(x => x.id !== id) }, 'cbpc_teams');

  const addPlayer = (r) => {
    if (!list || !supported || players.some(p => p.id === r.id)) return;
    if (players.length >= limits.cbpc_players) {
      setSaveError(`You can follow up to ${limits.cbpc_players} winter-league players.`);
      return;
    }
    save({
      ...list,
      cbpcPlayers: [...players, {
        id: r.id, name: r.full_name, position: r.position_abbreviation, headshotUrl: r.headshot_url,
        teamId: r.team_id, teamName: r.team_name, teamAbbr: r.team_abbreviation, teamLogoUrl: r.team_logo_url,
        teamLeague: r.league ? String(r.league).toLowerCase() : null, active: r.active !== false,
      }],
    }, 'cbpc_players');
  };
  const removePlayer = (id) => save({ ...list, cbpcPlayers: players.filter(p => p.id !== id) }, 'cbpc_players');

  const PREVIEW_ROWS = 3;
  const previewTeams = teams.slice(0, PREVIEW_ROWS);
  const previewPlayers = players.slice(0, Math.max(0, PREVIEW_ROWS - previewTeams.length));
  const hiddenCount = teams.length + players.length - previewTeams.length - previewPlayers.length;
  const summary = list
    ? [`${teams.length} team${teams.length === 1 ? '' : 's'}`, players.length ? `${players.length} player${players.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')
    : '';
  const unsupportedMsg = mode === 'local'
    ? 'Following winter-league teams needs your watchlist synced to your account, which isn\'t available yet.'
    : 'Following winter-league teams needs the updated watchlist server.';
  const playerLine = (p) => (p.teamId != null
    ? [p.teamAbbr || p.teamName, p.position].filter(Boolean).join(' · ')
    : `${p.position ? `${p.position} · ` : ''}Not on a roster this winter`);

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
        {list !== null && !supported && <Empty>{unsupportedMsg}</Empty>}
        {list !== null && supported && teams.length === 0 && players.length === 0 && (
          <Empty>No winter-league teams yet — hit Manage to follow LIDOM, LVBP, LMP, LBPRC or Serie del Caribe teams and players.</Empty>
        )}

        {supported && previewTeams.map(t => {
          const f = form[t.id];
          const streak = String(f?.row?.streak_code || '');
          const up = streak.startsWith('W');
          return (
            <div className="slt-wl-row" key={`wt-${t.id}`}>
              <div className="slt-team-cell">
                <WinterLogo src={t.logoUrl} code={t.abbr} />
                <div>
                  <div className="slt-wl-team">{t.abbr || t.name}</div>
                  <span className="slt-wl-next">{f ? winterGameLine(t.id, f.game) : '…'}</span>
                </div>
              </div>
              <div className="slt-mono">{f?.row ? `${f.row.wins}-${f.row.losses}` : '—'}</div>
              <div className={`slt-mono slt-wl-pct ${streak ? (up ? 'pos' : 'neg') : ''}`}>
                {f?.row ? fmtWinPct(f.row.w_l_pct) : '—'} {streak && (up ? '▲' : '▼')}
              </div>
              <Sparkline points={f?.pts} />
            </div>
          );
        })}

        {supported && previewPlayers.map(p => (
          <div className={`slt-wl-row slt-wl-row--player${p.active === false ? ' slt-wl-inactive' : ''}`} key={`wp-${p.id}`}>
            <div className="slt-team-cell">
              <WinterHeadshot src={p.headshotUrl} />
              <div>
                <div className="slt-wl-team">{p.name || '…'}</div>
                <span className="slt-wl-next">{playerLine(p)}</span>
              </div>
            </div>
          </div>
        ))}

        {supported && hiddenCount > 0 && <p className="slt-footnote">+{hiddenCount} more · open the watchlist to see all</p>}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Watchlist"
        sub="Follow winter-league teams and players: LIDOM, LVBP, LMP, LBPRC and the Serie del Caribe"
        route="/winter"
        routeLabel="Open Winter Ball"
      >
        {list === null && (loadError ? <Empty>{loadError}</Empty> : <Skeleton rows={4} />)}
        {saveError && <p className="slt-error slt-wl-error">{saveError}</p>}
        {list !== null && !supported && <Empty>{unsupportedMsg}</Empty>}

        {list !== null && supported && (
          <>
            <SectionLabel>Teams · {teams.length}/{limits.cbpc_teams}</SectionLabel>
            <div className="slt-chips slt-wl-chips" role="group" aria-label="Winter league">
              {CBPC_SLUGS.map(slug => (
                <button
                  type="button"
                  key={slug}
                  className={`slt-chip${pickLeague === slug ? ' active' : ''}`}
                  aria-pressed={pickLeague === slug}
                  onClick={() => setPickLeague(slug)}
                >
                  {CBPC_LEAGUES[slug].short}
                </button>
              ))}
            </div>
            <div className="slt-chips slt-wl-chips">
              {leagueTeams === null && <span className="slt-faint">Loading teams…</span>}
              {leagueTeams?.length === 0 && <span className="slt-faint">No teams for this league yet.</span>}
              {(leagueTeams || []).map(t => {
                const on = teams.some(x => x.id === t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    className={`slt-chip${on ? ' active' : ''}`}
                    onClick={() => toggleTeam(t)}
                    disabled={saving}
                    aria-pressed={on}
                    title={on ? `Remove ${t.team_name}` : `Follow ${t.team_name}`}
                  >
                    {t.team_name}
                  </button>
                );
              })}
            </div>

            {teams.map(t => {
              const f = form[t.id];
              const streak = String(f?.row?.streak_code || '');
              return (
                <div className="slt-sheet-card" key={`wt-${t.id}`}>
                  <div className="slt-sheet-card-head">
                    <div className="slt-team-cell">
                      <WinterLogo src={t.logoUrl} code={t.abbr} />
                      <div>
                        <div className="slt-sheet-card-title">{t.name}</div>
                        <div className="slt-wl-next">
                          {[t.league && CBPC_LEAGUES[t.league]?.short, f ? winterGameLine(t.id, f.game) : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    <span className="slt-wl-actions">
                      {t.league && <Link to={`/winter/${t.league}/teams/${t.id}`} className="slt-link">Team page →</Link>}
                      <button type="button" className="slt-wl-remove" onClick={() => removeTeam(t.id)} disabled={saving} aria-label={`Remove ${t.name}`} title="Remove">✕</button>
                    </span>
                  </div>
                  <div className="slt-kv-grid">
                    <div><span>Record</span><b className="slt-mono">{f?.row ? `${f.row.wins}-${f.row.losses}` : '—'}</b></div>
                    <div><span>Win %</span><b className="slt-mono">{f?.row ? fmtWinPct(f.row.w_l_pct) : '—'}</b></div>
                    <div><span>GB</span><b className="slt-mono">{f?.row?.games_back && f.row.games_back !== '-' ? f.row.games_back : '—'}</b></div>
                    <div><span>Streak</span><b className={`slt-mono ${streak.startsWith('W') ? 'pos' : streak.startsWith('L') ? 'neg' : ''}`}>{streak || '—'}</b></div>
                    <div><span>Last 10</span><b className="slt-mono">{f?.row ? `${f.row.last_ten_wins}-${f.row.last_ten_losses}` : '—'}</b></div>
                  </div>
                  {f?.games?.length > 0 && (
                    <div className="slt-l10">
                      <Sparkline points={f.pts} width={140} height={28} />
                      <div className="slt-l10-games">
                        {f.games.map(g => (
                          <span key={g.key} className={`slt-l10-game ${g.won ? 'pos' : 'neg'}`} title={`${g.opp} ${g.score}`}>{g.won ? 'W' : 'L'}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <SectionLabel>Players · {players.length}/{limits.cbpc_players}</SectionLabel>
            <div className="slt-wl-search">
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search winter-league players to follow…"
                aria-label="Search winter-league players to follow"
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
                          <WinterHeadshot src={r.headshot_url} size="sm" />
                          {r.full_name}
                          <span className="slt-faint">{r.team_abbreviation || 'No current club'}</span>
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

            {players.length === 0 && <p className="slt-footnote">Search above to follow individual winter-league players.</p>}
            {players.map(p => (
              <div className={`slt-sheet-card${p.active === false ? ' slt-wl-inactive' : ''}`} key={`wp-${p.id}`}>
                <div className="slt-sheet-card-head">
                  <div className="slt-team-cell">
                    <WinterHeadshot src={p.headshotUrl} />
                    <div>
                      <div className="slt-sheet-card-title">{p.name || '…'}</div>
                      <div className="slt-wl-next">{p.teamId != null ? [p.teamName, p.position].filter(Boolean).join(' · ') : playerLine(p)}</div>
                    </div>
                  </div>
                  <span className="slt-wl-actions">
                    {p.teamLeague && <Link to={`/winter/${p.teamLeague}/players/${p.id}`} className="slt-link">Player page →</Link>}
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

// One watchlist (one server list) for both leagues: the MLB tab shows MLB
// teams/players, the Serie del Caribe tab shows winter-league ones.
function WatchlistPanel({ league = 'mlb', standings, games, onList, flash, expanded, onExpand, onClose }) {
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

  useEffect(() => { onList?.(list); }, [list, onList]);

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
  // `changed` is 'teams', 'players', 'cbpc_teams' or 'cbpc_players': the
  // server replaces only the type we send.
  const save = useCallback(async (next, changed) => {
    if (!list || saving) return;
    const prev = list;
    setList(next);
    setSaveError(null);
    if (mode === 'local') { watchlistService.saveLocal(userId, next); return; }
    setSaving(true);
    try {
      const saved = changed === 'teams' ? await watchlistService.setTeams(next.teamIds)
        : changed === 'players' ? await watchlistService.setPlayers(next.players.map(p => p.id))
        : changed === 'cbpc_teams' ? await watchlistService.setCbpcTeams(next.cbpcTeams.map(t => t.id))
        : await watchlistService.setCbpcPlayers(next.cbpcPlayers.map(p => p.id));
      // The response is the source of truth; only fill gaps for ids it sent bare.
      const fill = (savedList, nextList) => {
        const known = Object.fromEntries((nextList || []).map(x => [x.id, x]));
        return savedList.map(x => (x.name ? x : (known[x.id] || x)));
      };
      setList({
        ...saved,
        players: fill(saved.players, next.players),
        cbpcTeams: fill(saved.cbpcTeams, next.cbpcTeams),
        cbpcPlayers: fill(saved.cbpcPlayers, next.cbpcPlayers),
      });
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

  const limits = list?.limits ?? WATCHLIST_LIMITS;

  const toggleTeam = useCallback((teamId) => {
    if (!list) return;
    const has = list.teamIds.includes(teamId);
    if (!has && list.teamIds.length >= limits.teams) {
      setSaveError(`You can follow up to ${limits.teams} teams.`);
      return;
    }
    save({ ...list, teamIds: has ? list.teamIds.filter(id => id !== teamId) : [...list.teamIds, teamId] }, 'teams');
  }, [list, save, limits]);

  const addPlayer = useCallback((r) => {
    if (!list || list.players.some(p => p.id === r.id)) return;
    if (list.players.length >= limits.players) {
      setSaveError(`You can follow up to ${limits.players} players.`);
      return;
    }
    save({ ...list, players: [...list.players, { id: r.id, name: r.full_name, teamId: r.team_id, mlbId: r.mlb_id ?? null, slug: r.name_slug ?? r.mlb_id, active: r.active !== false }] }, 'players');
  }, [list, save, limits]);

  const removePlayer = useCallback((id) => {
    if (!list) return;
    save({ ...list, players: list.players.filter(p => p.id !== id) }, 'players');
  }, [list, save]);

  if (league === 'sdc') {
    return (
      <WinterWatchlist
        list={list} mode={mode} loadError={loadError} saveError={saveError} setSaveError={setSaveError}
        saving={saving} save={save} limits={limits}
        flash={flash} expanded={expanded} onExpand={onExpand} onClose={onClose}
      />
    );
  }

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
            <SectionLabel>Teams · {watched.length}/{limits.teams}</SectionLabel>
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

            <SectionLabel>Players · {players.length}/{limits.players}</SectionLabel>
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

// Winter-league Trust Ledger (Serie del Caribe tab): one league's board at a
// time, ranked within that league. Like the MLB card, it opens on the
// postseason board when that league has one (never for the Caribbean Series).
function WinterTrustLedgerPanel({ flash, expanded, onExpand, onClose }) {
  const [slug, setSlug] = useState(rememberedWinterLeague);
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | locked | error

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setStatus('loading');
    const fail = (err) => {
      if (err.name === 'AbortError') return;
      setStatus(err.status === 403 ? 'locked' : 'error');
    };
    const loadRegular = () => trustLedgerService.getCbpcTrustLedger(slug, { signal })
      .then(data => { setBoard(data); setStatus('ok'); })
      .catch(fail);
    if (isNationsLeague(slug)) { loadRegular(); return () => controller.abort(); }
    trustLedgerService.getCbpcTrustLedger(slug, { postseason: true, signal })
      .then(data => {
        if (data?.rows?.length) { setBoard(data); setStatus('ok'); } else loadRegular();
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        if (err.status === 403) { setStatus('locked'); return; }
        loadRegular();
      });
    return () => controller.abort();
  }, [slug]);

  const pick = (s) => { setSlug(s); rememberWinterLeague(s); };
  const rows = board?.rows ?? [];
  const short = CBPC_LEAGUES[slug].short;
  const sizeNote = board && !board.percentileReliable ? ` · ${board.leagueSize}-team league` : '';
  const modeLabel = board ? `${board.seasonLabel} ${board.postseason ? 'postseason' : 'regular season'}` : '';
  const lockedText = 'A trust score for every winter-league club, ranked within its league.';
  const today = (g) => {
    if (!g) return <span className="slt-faint">no game</span>;
    const opp = `${g.isHome ? 'vs' : '@'} ${g.opponent}`;
    if (g.status === 'Scheduled' && g.gameDatetimeUtc) {
      return `${opp} · ${new Date(g.gameDatetimeUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return `${opp} · ${g.status === 'In Progress' ? 'in progress' : String(g.status || '').toLowerCase()}`;
  };
  const leaguePicker = (
    <select className="slt-select" value={slug} onChange={(e) => pick(e.target.value)} aria-label="Winter league">
      {CBPC_SLUGS.map(s => <option key={s} value={s}>{CBPC_LEAGUES[s].short}</option>)}
    </select>
  );

  return (
    <>
      <Panel
        id="ledger"
        title="Trust Ledger"
        flash={flash}
        onExpand={onExpand}
        action={leaguePicker}
      >
        {status === 'ok' && rows.length > 0 && <p className="slt-footnote slt-tl-note">{modeLabel} · top 5{sizeNote}</p>}
        {status === 'loading' && <Skeleton rows={5} />}
        {status === 'error' && <Empty>{short} Trust Ledger unavailable right now.</Empty>}
        {status === 'locked' && <Locked text={lockedText} />}
        {status === 'ok' && rows.length === 0 && <Empty>No standings yet for {short} {board?.seasonLabel}.</Empty>}
        {status === 'ok' && rows.slice(0, 5).map((t, i) => (
          <div className="slt-tl-row" key={t.teamId ?? i}>
            <span className="slt-tl-rank slt-mono">{t.trustRank ?? '—'}</span>
            <span className="slt-tl-team slt-team-cell"><WinterLogo src={t.logoUrl} code={t.abbreviation} size="sm" />{t.abbreviation || t.team}</span>
            <div className="slt-bar"><div className="slt-bar-fill" style={{ width: `${t.trustPercentile ?? 0}%` }} /></div>
            <span className="slt-tl-score slt-mono">{t.trustPercentile == null ? '—' : t.trustPercentile.toFixed(1)}</span>
          </div>
        ))}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title={`Trust Ledger · ${short}`}
        sub={status === 'ok'
          ? `${modeLabel} · ${board.leagueSize} ${isNationsLeague(slug) ? 'nations' : 'clubs'} ranked by trust within ${short}${board.percentileReliable ? '' : ' (small sample)'}`
          : 'Winter-league clubs ranked by trust within their league'}
        route="/predictions/trust-ledger"
        routeLabel="Open the full Trust Ledger"
      >
        <div className="slt-sheet-tools">{leaguePicker}</div>
        {status === 'loading' && <Skeleton rows={6} />}
        {status === 'locked' && <Locked text={lockedText} />}
        {status === 'error' && <Empty>{short} Trust Ledger unavailable right now.</Empty>}
        {status === 'ok' && rows.length === 0 && <Empty>No standings yet for {short} {board?.seasonLabel}.</Empty>}
        {status === 'ok' && rows.length > 0 && (
          <table className="slt-table slt-table--sheet">
            <thead>
              <tr><th>#</th><th>Team</th><th>Trust</th><th>{board.postseason ? 'Playoff' : 'Season'}</th><th>L10</th><th>OPS / ERA rank</th><th>Today</th></tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={t.teamId ?? i}>
                  <td className="slt-mono slt-faint">{t.trustRank ?? '—'}</td>
                  <td className="team"><span className="slt-team-cell"><WinterLogo src={t.logoUrl} code={t.abbreviation} size="sm" />{t.team}</span></td>
                  <td>
                    <span className="slt-trust-cell">
                      <span className="slt-bar"><span className="slt-bar-fill" style={{ width: `${t.trustPercentile ?? 0}%` }} /></span>
                      <span className="slt-mono">{t.trustPercentile == null ? '—' : t.trustPercentile.toFixed(1)}</span>
                    </span>
                  </td>
                  <td className="slt-mono">{fmtWinPct(t.winPct)}</td>
                  <td className="slt-mono">{t.lastTen || '—'}</td>
                  <td className="slt-mono" title={`Within ${short}, out of ${board.leagueSize}`}>
                    {t.leagueHittingRank != null ? `#${t.leagueHittingRank}` : '—'} / {t.leaguePitchingRank != null ? `#${t.leaguePitchingRank}` : '—'}
                  </td>
                  <td className="slt-sp">{today(t.todayGame)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sheet>
    </>
  );
}

function TrustLedgerPanel({ league = 'mlb', flash, expanded, onExpand, onClose }) {
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

  if (league === 'sdc') {
    return <WinterTrustLedgerPanel flash={flash} expanded={expanded} onExpand={onExpand} onClose={onClose} />;
  }

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
// MLB picks, plus (admins only) the winter leagues' model picks, ranked
// together by win probability. Winter rows carry a league tag and Kalshi's
// ask in place of a sportsbook line; they have no projected total.
function PredictionsPanel({ flash, expanded, onExpand, onClose }) {
  const { isPremium, isAdmin } = useAuth();
  const winterGames = useWinterPredictions(!!isAdmin);
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
    .concat((winterGames || []).filter(g => g.pick?.side).map(g => {
      const t = g[g.pick.side];
      return {
        id: `w-${g.game_pk}`,
        league: g.leagueShort,
        // The card shows the short matchup (league as a tooltip); the sheet the full one.
        short: `${g.away.team_abbreviation} @ ${g.home.team_abbreviation}${doubleheaderLabel(g) ? ` G${g.game_number}` : ''}`,
        matchup: `${g.leagueShort} · ${g.away.team_abbreviation} @ ${g.home.team_abbreviation}${doubleheaderLabel(g) ? ` G${g.game_number}` : ''}`,
        pick: t.team_abbreviation,
        logo: t.logo_url,
        prob: g.pick.win_prob * 100,
        odds: t.kalshi?.yes_ask != null ? `${Math.round(t.kalshi.yes_ask * 100)}¢` : null,
        total: null,
        line: null,
      };
    }))
    .sort((a, b) => b.prob - a.prob), [rows, winterGames]);

  // MLB games still inside the release gate (winter picks don't count here).
  const pending = Math.max(0, (rows || []).length - picks.filter(p => !p.league).length);
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
            <span className="slt-faint slt-board-matchup" title={p.league ? p.matchup : undefined}>{p.short || p.matchup}</span>
            <span className="slt-tl-team slt-team-cell">{p.league ? <WinterLogo src={p.logo} code={p.pick} size="sm" /> : <TeamLogo teamId={p.pickTeamId} size="sm" />}{p.pick} ML</span>
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
                  <td className="pick"><span className="slt-team-cell">{p.league ? <WinterLogo src={p.logo} code={p.pick} size="sm" /> : <TeamLogo teamId={p.pickTeamId} size="sm" />}{p.pick} ML</span></td>
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
// Winter standings for every league's current season: the regular-season
// table, plus the Round Robin table once it has games. One load covers both
// the card and the sheet; responses are cached by cbpcService for 5 minutes.
function useWinterStandings() {
  const [data, setData] = useState(null); // slug → { season, regular[], roundRobin[] }
  useEffect(() => {
    let alive = true;
    cbpcService.getLeagues()
      .then(leagues => Promise.all(CBPC_SLUGS.map(async slug => {
        const season = leagues.find(l => l.slug === slug)?.current_season;
        const [regular, rr] = await Promise.all([
          cbpcService.getStandings(slug, season, 'R').catch(() => ({ teams: [] })),
          cbpcService.getStandings(slug, season, 'L').catch(() => ({ teams: [] })),
        ]);
        return [slug, { season, regular: regular.teams || [], roundRobin: rr.teams || [] }];
      })))
      .then(entries => { if (alive) setData(Object.fromEntries(entries)); })
      .catch(() => { if (alive) setData({}); });
    return () => { alive = false; };
  }, []);
  return data;
}

function WinterStandingsPanel({ flash, expanded, onExpand, onClose }) {
  const [slug, setSlug] = useState('lidom');
  const data = useWinterStandings();
  const entry = data?.[slug];
  // During the postseason the Round Robin is the table that matters.
  const rows = entry?.roundRobin.length ? entry.roundRobin : entry?.regular ?? [];

  return (
    <>
      <Panel
        id="standings"
        title="Standings"
        flash={flash}
        onExpand={onExpand}
        sub={entry ? `${entry.roundRobin.length ? 'Round Robin' : 'Regular season'} · ${seasonLabel(entry.season)}` : ''}
        action={(
          <select className="slt-select" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Winter league">
            {CBPC_SLUGS.map(s => <option key={s} value={s}>{CBPC_LEAGUES[s].short}</option>)}
          </select>
        )}
      >
        {data === null && <Skeleton rows={5} />}
        {data !== null && rows.length === 0 && <Empty>No standings yet for this league.</Empty>}
        {rows.length > 0 && <div className="slt-standings-scroll"><StandingsTable rows={rows} /></div>}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Standings"
        sub="LIDOM, LVBP, LMP, LBPRC and the Serie del Caribe"
        route={`/winter/${slug}`}
        routeLabel={`Open ${CBPC_LEAGUES[slug].short}`}
      >
        {data === null ? <Skeleton rows={6} /> : (
          <div className="slt-div-grid">
            {CBPC_SLUGS.map(s => {
              const e = data[s];
              return (
                <div key={s}>
                  <SectionLabel>{CBPC_LEAGUES[s].short}{e?.season ? ` · ${seasonLabel(e.season)}` : ''}</SectionLabel>
                  {e?.roundRobin.length > 0 && (
                    <>
                      <p className="slt-footnote">Round Robin</p>
                      <StandingsTable rows={e.roundRobin} />
                      <p className="slt-footnote">Regular season</p>
                    </>
                  )}
                  {e?.regular.length ? <StandingsTable rows={e.regular} /> : <Empty>No standings yet</Empty>}
                </div>
              );
            })}
          </div>
        )}
      </Sheet>
    </>
  );
}

function StandingsPanel({ league = 'mlb', standings, flash, expanded, onExpand, onClose }) {
  const [division, setDivision] = useState('AL East');
  const rows = useMemo(() => sortedDivision(standings, division), [standings, division]);

  if (league === 'sdc') {
    return <WinterStandingsPanel flash={flash} expanded={expanded} onExpand={onExpand} onClose={onClose} />;
  }

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
        {rows.length > 0 && <div className="slt-standings-scroll"><StandingsTable rows={rows} /></div>}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title="Standings"
        sub="All six divisions"
        route="/standings"
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

// "{logo} NYY  G. Cole (3.12)". Winter games pass their own logo element.
function TeamWithStarter({ teamId, team, spName, era, logo }) {
  return (
    <span className="slt-team-cell">
      {logo ?? <TeamLogo teamId={teamId} />}
      {team}
      <span className="slt-sp-tag">
        {spName ? shortName(spName) : 'TBD'}
        {spName && era != null && <span className="slt-mono"> ({era.toFixed(2)})</span>}
      </span>
    </span>
  );
}

function BoxScore({ game, boxscore, eras = {}, logos = {} }) {
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
              <td className="team"><TeamWithStarter teamId={teamId} team={team} spName={spName} era={era} logo={logos[side]} /></td>
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

// ── Featured game (both live panels) ────────────────────────────────────────
// Which game the live card shows:
//   1. the matchup the user picked for today (kept per league, per day);
//   2. otherwise a game with a watched team: live first, then the next one up,
//      then the latest final; teams followed directly beat teams of watched
//      players;
//   3. otherwise a random game, live ones first, kept for the day so the card
//      doesn't jump on every poll (re-rolled once it ends while others play).
const STATE_RANK = { live: 0, pre: 1, final: 2 };
const dayKey = () => new Date().toLocaleDateString('en-CA');

function readKey(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeKey(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

// watch = { teams: Set, playerTeams: Set } of team ids in the games' id space.
function watchTier(g, watch) {
  if (!watch) return 0;
  if (watch.teams.has(g.homeId) || watch.teams.has(g.awayId)) return 2;
  if (watch.playerTeams.has(g.homeId) || watch.playerTeams.has(g.awayId)) return 1;
  return 0;
}

function stateOrder(g, i, now) {
  // A winter game past first pitch that still says Scheduled has no live data
  // yet; it sorts after the ones that haven't started.
  const stale = g.state === 'pre' && g.start != null && g.start <= now ? 0.5 : 0;
  // Latest final first; live and upcoming keep schedule order.
  return [STATE_RANK[g.state] + stale, g.state === 'final' ? -i : i];
}

function useFeaturedGame(games, watch, scope) {
  const day = dayKey();
  const pickKey = `slt-live-pick:${scope}:${day}`;
  const randomKey = `slt-live-random:${scope}:${day}`;
  const [pick, setPickState] = useState(() => readKey(pickKey));
  const randomRef = useRef(readKey(randomKey));
  useEffect(() => { setPickState(readKey(pickKey)); randomRef.current = readKey(randomKey); }, [pickKey, randomKey]);

  const setPick = useCallback((id) => {
    const value = id ? String(id) : null;
    setPickState(value);
    writeKey(pickKey, value);
  }, [pickKey]);

  const result = useMemo(() => {
    const list = games || [];
    const now = Date.now();
    const tiers = new Map(list.map(g => [g.id, watchTier(g, watch)]));
    // Watched games first (for the picker and the sheet), schedule order otherwise.
    const ordered = list.map((g, i) => [g, i])
      .sort(([a, i], [b, j]) => (tiers.get(b.id) - tiers.get(a.id)) || (i - j))
      .map(([g]) => g);
    if (!list.length) return { featured: null, reason: null, ordered, tiers };

    const picked = pick && list.find(g => String(g.id) === pick);
    if (picked) return { featured: picked, reason: 'pick', ordered, tiers };

    const watched = list.map((g, i) => [g, i]).filter(([g]) => tiers.get(g.id) > 0);
    if (watched.length) {
      watched.sort(([a, i], [b, j]) => {
        const [sa, oa] = stateOrder(a, i, now);
        const [sb, ob] = stateOrder(b, j, now);
        return (sa - sb) || (tiers.get(b.id) - tiers.get(a.id)) || (oa - ob);
      });
      return { featured: watched[0][0], reason: 'watch', ordered, tiers };
    }

    const live = list.filter(g => g.state === 'live');
    const upcoming = list.filter(g => g.state === 'pre');
    let chosen = list.find(g => String(g.id) === randomRef.current);
    if (!chosen || (chosen.state === 'final' && (live.length || upcoming.length))) {
      const pool = live.length ? live : upcoming.length ? upcoming : list;
      chosen = pool[Math.floor(Math.random() * pool.length)];
      randomRef.current = String(chosen.id);
      writeKey(randomKey, randomRef.current);
    }
    return { featured: chosen, reason: 'random', ordered, tiers };
  }, [games, watch, pick, randomKey]);

  return { ...result, pick: result.reason === 'pick' ? pick : null, setPick };
}

// The header's matchup picker. "Auto" names the game it's showing.
// autoLabel (optional) is a shorter label for the Auto option, which is what
// the closed picker shows in the header; the list keeps the full labels.
function MatchupPicker({ ordered, tiers, featured, reason, pick, setPick, label, autoLabel = label }) {
  if (!ordered.length) return null;
  const star = (g) => (tiers.get(g.id) > 0 ? '★ ' : '');
  const auto = featured && reason !== 'pick' ? `Auto · ${star(featured)}${autoLabel(featured)}` : 'Auto · watchlist first';
  return (
    <select
      className="slt-select slt-matchup-select"
      value={pick ?? ''}
      onChange={(e) => setPick(e.target.value || null)}
      aria-label="Game to show"
      title="Pick the game this card shows today. Auto puts games with your watchlist teams first."
    >
      <option value="">{auto}</option>
      {ordered.map(g => <option key={g.id} value={String(g.id)}>{star(g)}{label(g)} · {gameStatusLabel(g)}</option>)}
    </select>
  );
}

function useMlbWatch(watchlist) {
  return useMemo(() => {
    if (!watchlist) return null;
    return {
      teams: new Set(watchlist.teamIds || []),
      playerTeams: new Set((watchlist.players || []).map(p => p.teamId).filter(id => id != null)),
    };
  }, [watchlist]);
}

function useWinterWatch(watchlist) {
  return useMemo(() => {
    if (!watchlist) return null;
    return {
      teams: new Set((watchlist.cbpcTeams || []).map(t => t.id)),
      playerTeams: new Set((watchlist.cbpcPlayers || []).map(p => p.teamId).filter(id => id != null)),
    };
  }, [watchlist]);
}

function LiveGamePanel({ games, watchlist, flash, expanded, onExpand, onClose }) {
  const watch = useMlbWatch(watchlist);
  const { featured, reason, ordered, tiers, pick, setPick } = useFeaturedGame(games, watch, 'mlb');
  const matchupLabel = (g) => `${g.away} @ ${g.home}`;

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
        action={<MatchupPicker ordered={ordered} tiers={tiers} featured={featured} reason={reason} pick={pick} setPick={setPick} label={matchupLabel} />}
      >
        {games === null && <Skeleton rows={2} />}
        {games !== null && !featured && <Empty>No games on the schedule today.</Empty>}
        {featured?.state === 'pre' && (
          // Same shape as the live box score: away over home on the left, each
          // with its starter and moneyline; first pitch + total on the right.
          <div className="slt-pregame">
            <div className="slt-pregame-teams">
              <TeamWithStarter teamId={featured.awayId} team={featured.away} spName={featured.awaySp} era={eras[featured.awaySpId]} />
              <span className="slt-mono slt-pregame-ml">{featured.mlAway ?? ''}</span>
              <TeamWithStarter teamId={featured.homeId} team={featured.home} spName={featured.homeSp} era={eras[featured.homeSpId]} />
              <span className="slt-mono slt-pregame-ml">{featured.mlHome ?? ''}</span>
            </div>
            <div className="slt-pregame-meta">
              <span className="slt-pregame-label">First pitch</span>
              <span className="slt-pregame-time">{featured.time}</span>
              {featured.total != null && <span className="slt-faint">O/U <span className="slt-mono">{featured.total}</span></span>}
            </div>
          </div>
        )}
        {featured && featured.state !== 'pre' && <BoxScore game={featured} boxscore={boxscore} eras={eras} />}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title={<>{heading} {tag}</>}
        sub="Box score plus every game on today's slate"
        route={featured ? `/schedule/${featured.id}` : '/schedule'}
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
            <SectionLabel>Today's slate{[...tiers.values()].some(t => t > 0) ? ' · ★ watchlist first' : ''}</SectionLabel>
            <div className="slt-slate">
              {ordered.map(g => (
                <Link to={`/schedule/${g.id}`} className="slt-slate-row" key={g.id}>
                  <span className="slt-tl-team slt-matchup">
                    {tiers.get(g.id) > 0 && <span className="slt-watch-star" title="Watchlist team">★</span>}
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

// ── Winter live game (Serie del Caribe tab) ─────────────────────────────────
// Today's games from every winter league, in the MLB slate's shape so the
// panel reuses BoxScore. Live and final states depend on the server's
// in-game CBPC refresh; until a game's status moves, it reads as scheduled.
const WINTER_POLL_MS = 2 * 60 * 1000;

function winterState(status = '') {
  if (/^(Final|Game Over|Completed Early)/i.test(status)) return 'final';
  if (/progress|delay|challenge|review/i.test(status)) return 'live';
  return 'pre';
}

function winterGame(slug, g) {
  const start = g.game_datetime_utc ? new Date(g.game_datetime_utc) : new Date(`${g.date}T${g.game_time || '12:00'}:00Z`);
  return {
    id: g.game_pk,
    gamePk: g.game_pk,
    slug,
    league: CBPC_LEAGUES[slug].short,
    state: winterState(g.status),
    status: g.status,
    start: start.getTime(),
    gameNumber: g.game_number ?? 1,
    dh: doubleheaderLabel(g), // "Game 1" / "Game 2" or null
    tbd: g.start_time_tbd === true,
    // A TBD start is a placeholder time: show "Time TBD" / "Game 2 · follows Game 1".
    time: fmtWinterTime(g, { short: true }),
    day: (g.start_time_tbd && g.date ? new Date(`${g.date}T12:00:00`) : start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    awayId: g.away_team_id, // CBPC ids, matched against watched cbpc_team ids
    homeId: g.home_team_id,
    away: g.away_team_abbr,
    home: g.home_team_abbr,
    awayName: g.away_team_name,
    homeName: g.home_team_name,
    awayLogo: g.away_team_logo_url,
    homeLogo: g.home_team_logo_url,
    awaySp: g.away_sp_name,
    homeSp: g.home_sp_name,
    awayRuns: g.away_runs_score,
    homeRuns: g.home_runs_score,
    awayHits: g.away_hits,
    homeHits: g.home_hits,
    awayErrors: g.away_errors,
    homeErrors: g.home_errors,
    venue: g.venue_name,
    // Sent once the server tracks games in progress; null until then.
    inning: g.current_inning ?? null,
    inningState: g.inning_state ?? null,
  };
}

// { today: [...], upcoming: [...], recent: [...] } across the winter leagues,
// each sorted by first pitch. Today's games re-poll while any is unfinished;
// upcoming / recent only load when nothing is on today.
function useWinterSlate() {
  const [slate, setSlate] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const fresh = tick > 0;
    const across = (load) => Promise.all(CBPC_SLUGS.map(slug =>
      load(slug).then(list => (list || []).map(g => winterGame(slug, g))).catch(() => [])))
      .then(lists => lists.flat().sort((a, b) => (a.start - b.start) || (a.gameNumber - b.gameNumber)));

    (async () => {
      const today = await across(slug => cbpcService.getTodayGames(slug, { fresh }));
      let upcoming = [];
      let recent = [];
      if (!today.length) {
        [upcoming, recent] = await Promise.all([
          across(slug => cbpcService.getUpcomingGames(slug, 7)),
          across(slug => cbpcService.getPriorGames(slug, 3)),
        ]);
      }
      if (alive) setSlate({ today, upcoming, recent });
    })();
    return () => { alive = false; };
  }, [tick]);

  const unfinished = slate?.today.some(g => g.state !== 'final');
  useEffect(() => {
    if (!unfinished) return undefined;
    const t = setInterval(() => setTick(n => n + 1), WINTER_POLL_MS);
    return () => clearInterval(t);
  }, [unfinished]);

  return slate;
}

// The games the card chooses from: today's; with none today, the next game
// day's (within 36 h of the first one); with none in the week, the latest final.
function winterCandidates(slate) {
  if (!slate) return null;
  const { today, upcoming, recent } = slate;
  if (today.length) return today;
  const first = upcoming[0]?.start;
  if (first != null) return upcoming.filter(g => g.start - first < 36 * 3600 * 1000);
  const last = [...recent].reverse().find(g => g.state === 'final');
  return last ? [last] : [];
}

function winterLogos(g) {
  return {
    away: <WinterLogo src={g.awayLogo} code={g.away} size="md" />,
    home: <WinterLogo src={g.homeLogo} code={g.home} size="md" />,
  };
}

function WinterLiveGamePanel({ watchlist, flash, expanded, onExpand, onClose }) {
  const slate = useWinterSlate();
  const candidates = useMemo(() => winterCandidates(slate), [slate]);
  const watch = useWinterWatch(watchlist);
  const { featured, reason, ordered, tiers, pick, setPick } = useFeaturedGame(candidates, watch, 'winter');
  const matchupLabel = (g) => `${g.league} · ${g.away} @ ${g.home}${g.dh ? ` (${g.dh})` : ''}`;

  const [boxscore, setBoxscore] = useState(null);
  const slug = featured?.slug;
  const pk = featured && featured.state !== 'pre' ? featured.gamePk : null;
  const awayRuns = featured?.awayRuns;
  const homeRuns = featured?.homeRuns;

  // Re-fetch whenever the slate poll moves the score.
  useEffect(() => {
    if (!pk) { setBoxscore(null); return undefined; }
    let alive = true;
    cbpcService.getBoxscore(slug, pk, { fresh: featured?.state === 'live' })
      .then(bs => { if (alive) setBoxscore(bs?.innings?.length ? bs : null); })
      .catch(() => { if (alive) setBoxscore(null); });
    return () => { alive = false; };
  }, [slug, pk, awayRuns, homeRuns]); // eslint-disable-line react-hooks/exhaustive-deps

  const isToday = !!slate?.today.length;
  // Compact inning ("B7", "Mid 5") so the header fits on a phone.
  const inning = featured?.inningState && featured?.inning
    ? ` · ${({ Top: 'T', Bottom: 'B', Middle: 'Mid ', End: 'End ' })[featured.inningState] ?? `${featured.inningState} `}${featured.inning}`
    : '';
  const tag = featured?.state === 'live'
    ? <span className="slt-live-tag">LIVE{inning || (featured.status && !/progress/i.test(featured.status) ? ` · ${featured.status}` : '')}</span>
    : featured?.state === 'final' ? <span className="slt-final-tag">FINAL</span> : null;
  const heading = featured?.state === 'live' ? 'Live Game' : featured?.state === 'final' ? 'Latest Final' : 'Next Up';
  // One word for each state, so the header fits beside the picker on a phone:
  // the "LIVE · B7" tag alone while live, "Latest Final" once it's over.
  const title = featured?.state === 'live' ? tag : featured?.state === 'final' ? heading : <>{heading} {tag}</>;
  const sub = featured ? `${featured.league} · ${featured.away} @ ${featured.home}${isToday ? '' : ` · ${featured.day}`}` : null;
  const list = featured?.state === 'final' && !isToday ? [] : ordered;

  return (
    <>
      <Panel
        id="live"
        full
        flash={flash}
        onExpand={onExpand}
        title={title}
        sub={sub}
        action={<MatchupPicker ordered={ordered} tiers={tiers} featured={featured} reason={reason} pick={pick} setPick={setPick} label={(g) => `${matchupLabel(g)}${isToday ? '' : ` · ${g.day}`}`} autoLabel={(g) => `${g.away} @ ${g.home}${g.dh ? ` G${g.gameNumber}` : ''}`} />}
      >
        {slate === null && <Skeleton rows={2} />}
        {slate !== null && !featured && <Empty>No winter games in the next week.</Empty>}
        {featured?.state === 'pre' && (
          <div className="slt-pregame">
            <div className="slt-pregame-teams">
              <TeamWithStarter team={featured.away} spName={featured.awaySp} logo={winterLogos(featured).away} />
              <span className="slt-mono slt-pregame-ml" />
              <TeamWithStarter team={featured.home} spName={featured.homeSp} logo={winterLogos(featured).home} />
              <span className="slt-mono slt-pregame-ml" />
            </div>
            <div className="slt-pregame-meta">
              <span className="slt-pregame-label">{isToday ? 'First pitch' : featured.day}</span>
              <span className="slt-pregame-time">{featured.status && !/scheduled|pre-game|warmup/i.test(featured.status) ? featured.status : featured.time}</span>
              {featured.venue && <span className="slt-faint">{featured.venue}</span>}
            </div>
          </div>
        )}
        {featured && featured.state !== 'pre' && (
          <BoxScore game={featured} boxscore={boxscore} logos={winterLogos(featured)} />
        )}
      </Panel>

      <Sheet
        open={expanded}
        onClose={onClose}
        title={title}
        sub="Box score plus every winter game on today's slate"
        route={featured ? `/winter/${featured.slug}/games/${featured.gamePk}` : '/winter'}
        routeLabel={featured ? `Open ${featured.away} @ ${featured.home}` : 'Open Winter Ball'}
      >
        {featured && featured.state !== 'pre' && (
          <>
            <SectionLabel>{featured.league} · {featured.awayName} @ {featured.homeName}</SectionLabel>
            <BoxScore game={featured} boxscore={boxscore} logos={winterLogos(featured)} />
          </>
        )}
        {list.length > 0 && (
          <>
            <SectionLabel>
              {isToday ? "Today's winter slate" : `Next up · ${list[0].day}`}
              {[...tiers.values()].some(t => t > 0) ? ' · ★ watchlist first' : ''}
            </SectionLabel>
            <div className="slt-slate">
              {list.map(g => (
                <Link to={`/winter/${g.slug}/games/${g.gamePk}`} className="slt-slate-row" key={g.id}>
                  <span className="slt-tl-team slt-matchup">
                    {tiers.get(g.id) > 0 && <span className="slt-watch-star" title="Watchlist team">★</span>}
                    <span className="slt-faint">{g.league}</span>
                    <span className="slt-team-cell"><WinterLogo src={g.awayLogo} code={g.away} size="sm" />{g.away}</span>
                    <span className="slt-faint">@</span>
                    <span className="slt-team-cell"><WinterLogo src={g.homeLogo} code={g.home} size="sm" />{g.home}</span>
                    {g.dh && <span className="slt-faint">{g.dh}</span>}
                  </span>
                  <span className={g.state === 'pre' ? 'slt-faint' : 'slt-mono'}>
                    {g.state === 'pre' ? (g.venue || '') : `${g.awayRuns ?? 0}–${g.homeRuns ?? 0}`}
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

// ── League switcher ─────────────────────────────────────────────────────────
function LeagueSwitcher({ value, onChange }) {
  return (
    <div className="slt-leagues" role="group" aria-label="League">
      {LEAGUES.map(l => {
        const soon = l.status === 'soon' && !WINTER_ENABLED.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            className={`slt-league${value === l.id ? ' slt-league--active' : ''}${soon ? ' slt-league--soon' : ''}`}
            aria-pressed={value === l.id}
            disabled={soon}
            data-tip={leagueTabTip(l, soon)}
            aria-label={`${l.label}: ${leagueTabTip(l, soon)}`}
            onClick={() => onChange(l.id)}
          >
            {l.label}
            {soon && <span className="slt-league-tag">Soon</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export default function TerminalPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { games } = useTerminalSlate();
  const standings = useStandings();
  // The Watchlist panel owns loading and saving the list; it reports every
  // change here so the live card can put watched teams' games first.
  const [watchlist, setWatchlist] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const storageKey = layoutKey(user);
  const [order, setOrder] = useState(() => loadOrder(storageKey));
  const [dragId, setDragId] = useState(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  const leagueStorageKey = leagueKey(user);
  const [league, setLeague] = useState(() => loadLeague(leagueStorageKey));

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
  }, [league]);

  // Auth can resolve after first render; pick up that user's saved layout.
  useEffect(() => { setOrder(loadOrder(storageKey)); }, [storageKey]);
  useEffect(() => { setLeague(loadLeague(leagueStorageKey)); }, [leagueStorageKey]);

  const chooseLeague = useCallback((id) => {
    setLeague(id);
    setExpandedId(null);
    try { localStorage.setItem(leagueStorageKey, id); } catch {}
  }, [leagueStorageKey]);

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

  const layout = useMemo(() => ({ dragId, startDrag, onGripKey }), [dragId, startDrag, onGripKey]);

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
    watchlist:   <WatchlistPanel league={league} standings={standings} games={games} onList={setWatchlist} {...panelProps('watchlist')} />,
    props:       <PropsPanel {...panelProps('props')} />,
    ledger:      <TrustLedgerPanel league={league} {...panelProps('ledger')} />,
    insider:     <InsiderPanel {...panelProps('insider')} />,
    predictions: <PredictionsPanel {...panelProps('predictions')} />,
    library:     <BetLibraryPanel {...panelProps('library')} />,
    standings:   <StandingsPanel league={league} standings={standings} {...panelProps('standings')} />,
    live:        league === 'sdc'
      ? <WinterLiveGamePanel watchlist={watchlist} {...panelProps('live')} />
      : <LiveGamePanel games={games} watchlist={watchlist} {...panelProps('live')} />,
  };

  return (
    <div className={`slt-ui slt-dash${dragId ? ' slt--dragging' : ''}`}>
      <div className="slt-dash-bar">
        <LeagueSwitcher value={league} onChange={chooseLeague} />
      </div>
      {/* Both leagues share the grid; panels that follow the league switch
          their own content (the Watchlist today). */}
      <LayoutContext.Provider value={layout}>
        <div className="slt-grid" ref={gridRef}>
          {order.map(id => <Fragment key={id}>{panels[id]}</Fragment>)}
        </div>
      </LayoutContext.Provider>
    </div>
  );
}
