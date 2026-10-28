import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import scheduleService from '../../../data/services/scheduleService';
import predictionsService from '../../../data/services/predictionsService';
import { getTeamById } from '../../../data/constants/apiConstants';
import { sanitizeSearch, useSiteSearch } from './terminalSearch';
import '../../../styles/terminal-page-styling/terminal.css';

/*
  The Terminal is the signed-in app frame: top bar + odds ticker + icon rail
  stay put, and whatever route is active renders in the main area — the
  dashboard cards at /terminal, or the full feature page (Team Analytics,
  Standings, the War Room, …) everywhere else. App.jsx wraps every route in
  this shell while a user is signed in.
*/

// Slate (ticker + live game) bypasses the api cache and re-polls on this interval.
const SLATE_POLL_MS = 60_000;

// ── Icons ───────────────────────────────────────────────────────────────────
const ICONS = {
  home:   <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  star:   <path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7-5.4-4.7 7.1-.7z" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.7" fill="currentColor" /></>,
  chart:  <><path d="M3 3v18h18" /><path d="M18.4 8.6 12 15l-3-3-4 4" /></>,
  bar:    <><rect x="4" y="12" width="3.2" height="8" /><rect x="10.4" y="7" width="3.2" height="13" /><rect x="16.8" y="3" width="3.2" height="17" /></>,
  doc:    <><rect x="5" y="3" width="14" height="18" rx="1.5" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="13" y2="16" /></>,
  dollar: <><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  list:   <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  bolt:   <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" />,
  shield: <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" />,
  user:   <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  cal:    <><rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /></>,
  book:   <><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" /></>,
  gear:   <><circle cx="12" cy="12" r="3" /><path d="M19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.4-2.4 1a8 8 0 00-1.7-1l-.3-2.6h-4l-.3 2.6a8 8 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.9 7.9 0 000 2l-2 1.5 2 3.4 2.4-1a8 8 0 001.7 1l.3 2.6h4l.3-2.6a8 8 0 001.7-1l2.4 1 2-3.4z" /></>,
};

// Feature pages that render inside the shell. `match` lists the path
// prefixes that light up the rail button (longest match wins).
const PAGES = [
  { id: 'dashboard',   label: 'Dashboard',        icon: 'home',   to: '/terminal',                  match: ['/terminal'] },
  // Opens the props boards (Game / Pitcher / Batter), not the /predictions overview.
  { id: 'predictions', label: 'Predictions',      icon: 'chart',  to: '/predictions/games',         match: ['/predictions'] },
  { id: 'warroom',     label: 'War Room',         icon: 'target', to: '/predictions/scout-desk',    match: ['/predictions/scout-desk'] },
  { id: 'ledger',      label: 'Trust Ledger',     icon: 'bar',    to: '/predictions/trust-ledger',  match: ['/predictions/trust-ledger'] },
  { id: 'library',     label: 'Bet Library',      icon: 'dollar', to: '/predictions/bet-library',   match: ['/predictions/bet-library'] },
  { id: 'schedule',    label: 'MLB Schedule',     icon: 'cal',    to: '/mlb-schedule',              match: ['/mlb-schedule'] },
  { id: 'standings',   label: 'MLB Standings',    icon: 'list',   to: '/mlb-standings',             match: ['/mlb-standings'] },
  { id: 'teams',       label: 'Team Analytics',   icon: 'shield', to: '/team-analytics',            match: ['/team-analytics'] },
  { id: 'players',     label: 'Player Analytics', icon: 'user',   to: '/player-analytics',          match: ['/player-analytics', '/player/'] },
  { id: 'settings',    label: 'Account Settings', icon: 'gear',   to: '/account/settings',          match: ['/account', '/upgrade'], bottom: true },
];

// Extra destinations reachable from the palette only.
const MORE_PAGES = [
  { id: 'insider',   label: 'Sandlot Insider',  to: '/sandlot-insider' },
  { id: 'blogs',     label: 'Strategy Blog',    to: '/blogs' },
  { id: 'datasci',   label: 'Data Science',     to: '/data-science' },
  { id: 'howto',     label: 'How to Use',       to: '/how-to-use' },
  { id: 'glossary',  label: 'Glossary',         to: '/glossary' },
  { id: 'faqs',      label: 'FAQs',             to: '/faqs' },
  { id: 'upgrade',   label: 'Pricing & Upgrade', to: '/upgrade' },
];

// Dashboard panels — the palette jumps to them via /terminal + focus state.
export const PANELS = [
  { id: 'watchlist',   label: 'Watchlist' },
  { id: 'props',       label: "Today's Top Props" },
  { id: 'ledger',      label: 'Trust Ledger card' },
  { id: 'insider',     label: 'Sandlot Insider card' },
  { id: 'predictions', label: 'Model Board' },
  { id: 'library',     label: 'Bet Library card' },
  { id: 'standings',   label: 'Standings card' },
  { id: 'live',        label: 'Live Game' },
];

function activePage(pathname) {
  let best = null;
  let bestLen = -1;
  PAGES.forEach(p => p.match.forEach(prefix => {
    if (pathname.startsWith(prefix) && prefix.length > bestLen) { best = p; bestLen = prefix.length; }
  }));
  return best;
}

// ── Shared helpers (also used by the dashboard) ─────────────────────────────
export function abbr(teamId) {
  return getTeamById(teamId)?.id || '—';
}

export function fmtOdds(n) {
  if (n == null || n === '') return null;
  const num = Number(n);
  if (Number.isNaN(num)) return null;
  return num > 0 ? `+${num}` : `−${Math.abs(num)}`;
}

// Same status buckets as GameTicker.
function gameState(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('final') || s.includes('completed') || s === 'game over') return 'final';
  if (s.includes('progress') || s.includes('live') || s.includes('inning')) return 'live';
  return 'pre';
}

function initials(name) {
  const parts = String(name || '').trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '··';
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
}

// ── Today's slate (one poll shared by the ticker and the dashboard) ─────────
const SlateContext = createContext({ games: null, error: false });

export function useTerminalSlate() {
  return useContext(SlateContext);
}

function useSlate() {
  const [games, setGames] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => Promise.allSettled([
      scheduleService.getTodayGames({ ttl: 0 }),
      predictionsService.getTodayOdds(),
    ]).then(([scheduleRes, oddsRes]) => {
      if (!alive) return;
      if (scheduleRes.status !== 'fulfilled') { setError(true); setGames(g => g ?? []); return; }
      const oddsByGamePk = {};
      if (oddsRes.status === 'fulfilled' && Array.isArray(oddsRes.value)) {
        oddsRes.value.forEach(g => { if (g?.game_pk != null) oddsByGamePk[g.game_pk] = g.odds || null; });
      }
      const schedule = Array.isArray(scheduleRes.value) ? scheduleRes.value : [];
      setError(false);
      setGames(schedule.map(g => {
        const odds = oddsByGamePk[g.game_pk];
        return {
          id: g.id ?? g.game_pk,
          gamePk: g.game_pk ?? g.id,
          awayId: g.away_team_id,
          homeId: g.home_team_id,
          away: abbr(g.away_team_id),
          home: abbr(g.home_team_id),
          awaySpId: g.away_sp_id ?? null,
          homeSpId: g.home_sp_id ?? null,
          awaySp: g.away_sp_name || null,
          homeSp: g.home_sp_name || null,
          awayRuns: g.away_runs_score,
          homeRuns: g.home_runs_score,
          awayHits: g.away_hits,
          homeHits: g.home_hits,
          awayErrors: g.away_errors,
          homeErrors: g.home_errors,
          state: gameState(g.status),
          status: g.status,
          time: g.game_time || 'TBD',
          mlAway: fmtOdds(odds?.away_moneyline_game),
          mlHome: fmtOdds(odds?.home_moneyline_game),
          total: odds?.over_under_line_game ?? null,
        };
      }));
    });
    load();
    const t = setInterval(load, SLATE_POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return useMemo(() => ({ games, error }), [games, error]);
}

// ── Ticker ──────────────────────────────────────────────────────────────────
function Ticker({ games }) {
  if (!games || games.length === 0) {
    return (
      <div className="slt-ui slt-ticker-wrap">
        <div className="slt-ticker slt-ticker--static">
          <span className="slt-tick">{games === null ? 'Loading today\'s slate…' : 'No games on the schedule today.'}</span>
        </div>
      </div>
    );
  }

  const renderTick = (g, key) => (
    <Link to={`/mlb-schedule/${g.id}`} className="slt-tick" key={key}>
      <b>{g.away} @ {g.home}</b>
      {g.state === 'pre' ? (
        <>
          {g.mlAway && g.mlHome && <span className="slt-mono">{g.mlAway} / {g.mlHome}</span>}
          {g.total != null && <span>O/U <span className="slt-mono">{g.total}</span></span>}
          <span className="slt-faint">{g.time}</span>
        </>
      ) : (
        <>
          <span className="slt-mono">{g.awayRuns ?? 0}–{g.homeRuns ?? 0}</span>
          <span className={g.state === 'live' ? 'slt-live-text' : 'slt-faint'}>{g.state === 'live' ? 'LIVE' : 'FINAL'}</span>
        </>
      )}
    </Link>
  );

  return (
    <div className="slt-ui slt-ticker-wrap">
      {/* Track is rendered twice so the -50% scroll loops seamlessly. */}
      <div className="slt-ticker" style={{ animationDuration: `${Math.max(20, games.length * 7)}s` }}>
        {games.map(g => renderTick(g, `a-${g.id}`))}
        {games.map(g => renderTick(g, `b-${g.id}`))}
      </div>
    </div>
  );
}

// ── Command palette ─────────────────────────────────────────────────────────
const PALETTE_ITEMS = [
  ...PAGES.map(p => ({ key: `page-${p.id}`, grp: 'Page', label: p.label, to: p.to })),
  ...MORE_PAGES.map(p => ({ key: `page-${p.id}`, grp: 'Page', label: p.label, to: p.to })),
  ...PANELS.map(p => ({ key: `panel-${p.id}`, grp: 'Panel', label: p.label, panel: p.id })),
];

// Search bar + jump list. Empty query: every Terminal page and dashboard
// panel. Typed query: site search results (players, matchups, team
// predictions/analytics, pages, Insider tags) first, then matching
// Terminal pages/panels.
function CommandPalette({ open, onClose, onChoose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { results, searchingPlayers } = useSiteSearch(open ? query : '');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const jumps = PALETTE_ITEMS.filter(m => m.label.toLowerCase().includes(q));
    if (!q) return jumps;
    const seen = new Set(results.map(r => r.to));
    return [
      ...results.map(r => ({ ...r, grp: r.type })),
      ...jumps.filter(m => !m.to || !seen.has(m.to)),
    ];
  }, [query, results]);

  // Async player results can shrink/grow the list under the cursor.
  useEffect(() => {
    setSelected(s => Math.min(s, Math.max(items.length - 1, 0)));
  }, [items.length]);

  useEffect(() => {
    listRef.current?.querySelector('li.sel')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[selected]) onChoose(items[selected]); }
  };

  return (
    <div className="slt-ui slt-palette-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="slt-palette" role="dialog" aria-label="Search">
        <div className="slt-palette-input">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            ref={inputRef}
            type="search"
            maxLength={60}
            value={query}
            onChange={(e) => { setQuery(sanitizeSearch(e.target.value)); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search players, teams, predictions, pages…"
            aria-label="Search players, teams, predictions, and pages"
            autoComplete="off"
          />
          {searchingPlayers && <span className="slt-palette-busy" aria-live="polite">Searching players…</span>}
        </div>
        <ul ref={listRef}>
          {items.map((m, i) => (
            <li
              key={m.key}
              className={`${i === selected ? 'sel' : ''}${m.type ? ' slt-palette-result' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => onChoose(m)}
            >
              {m.type && (
                <span className="slt-palette-icon">
                  {m.headshotUrl
                    ? <img src={m.headshotUrl} alt="" className="slt-palette-headshot" onError={(e) => { e.target.src = m.iconSrc; e.target.className = ''; }} />
                    : m.iconSrc && <img src={m.iconSrc} alt="" />}
                </span>
              )}
              <span className="slt-palette-text">
                <span>{m.label}</span>
                {m.sublabel && <span className="slt-palette-sub">{m.sublabel}</span>}
              </span>
              <span className="grp">{m.grp}</span>
            </li>
          ))}
          {items.length === 0 && !searchingPlayers && <li className="slt-palette-empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────
export default function TerminalShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isPremium } = useAuth();
  const slate = useSlate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const current = activePage(location.pathname);
  const onDashboard = current?.id === 'dashboard';

  const choose = useCallback((item) => {
    setPaletteOpen(false);
    if (item.panel) {
      // The dashboard scrolls to + flashes the panel named in route state.
      navigate('/terminal', { state: { focus: item.panel } });
      return;
    }
    navigate(item.to, item.state ? { state: item.state } : undefined);
    window.scrollTo(0, 0);
  }, [navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // The top bar + ticker are pinned; publish their live height as
  // --slt-head-h so the rail sticks just below them and panel jumps
  // (scroll-margin) don't land underneath.
  const rootRef = useRef(null);
  const headRef = useRef(null);
  useEffect(() => {
    const head = headRef.current;
    const root = rootRef.current;
    if (!head || !root || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      root.style.setProperty('--slt-head-h', `${head.offsetHeight}px`);
    });
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

  const railButton = (p) => (
    <button
      key={p.id}
      type="button"
      className={`slt-rail-btn${current?.id === p.id ? ' active' : ''}`}
      aria-label={p.label}
      aria-current={current?.id === p.id ? 'page' : undefined}
      title={p.label}
      onClick={() => { navigate(p.to); window.scrollTo(0, 0); }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[p.icon]}
      </svg>
    </button>
  );

  return (
    <SlateContext.Provider value={slate}>
      <div className="slt" ref={rootRef}>
        <div className="slt-head" ref={headRef}>
          <div className="slt-ui slt-topbar">
            <Link to="/terminal" className="slt-brand">
              <span className="slt-brand-dot" />
              Sandlot Terminal
            </Link>
            {isPremium
              ? <span className="slt-tier">PREMIUM</span>
              : <Link to="/upgrade" className="slt-tier slt-tier--free">FREE</Link>}
            {!onDashboard && current && (
              <span className="slt-crumb">
                <span className="slt-crumb-sep">/</span>
                {current.label}
              </span>
            )}
            <div className="slt-spacer" />
            <button className="slt-cmdk" type="button" onClick={() => setPaletteOpen(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <span className="slt-cmdk-label">Search players, teams, pages…</span>
              <span className="slt-spacer" />
              <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <Link to="/account/settings" className="slt-avatar" title="Account Settings">{initials(user?.displayName)}</Link>
          </div>

          <Ticker games={slate.games} />
        </div>

        <div className="slt-shell">
          <nav className="slt-ui slt-rail" aria-label="Terminal">
            {PAGES.filter(p => !p.bottom).map(railButton)}
            <span className="slt-rail-spacer" />
            {PAGES.filter(p => p.bottom).map(railButton)}
          </nav>

          <main className={`slt-main${onDashboard ? '' : ' slt-main--page'}`}>
            {children}
          </main>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onChoose={choose} />
      </div>
    </SlateContext.Provider>
  );
}
