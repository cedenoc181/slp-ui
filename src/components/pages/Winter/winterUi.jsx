import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { winterPaths } from '../../../data/constants/cbpcConstants';

/*
  Shared pieces for the Winter Ball (CBPC) pages. Images always come from the
  URLs the API returns; MLB logo/headshot builders don't work for these teams
  and players.
*/

// ── Data ────────────────────────────────────────────────────────────────────
// Runs `loader` when `deps` change. Errors keep their CbpcError status so
// pages can tell "not found" (404) from other failures.
export function useCbpc(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(loader)
      .then(data => { if (alive) setState({ data, error: null, loading: false }); })
      .catch(error => { if (alive) setState({ data: null, error, loading: false }); });
    return () => { alive = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

// ── Formatting ──────────────────────────────────────────────────────────────
// Game times arrive in UTC (game_datetime_utc, or date + game_time "HH:MM");
// everything is shown in the viewer's own time zone.
export function gameDate(game) {
  if (game?.game_datetime_utc) return new Date(game.game_datetime_utc);
  if (game?.date && game?.game_time) return new Date(`${game.date}T${game.game_time}:00Z`);
  return game?.date ? new Date(`${game.date}T12:00:00Z`) : null;
}

export function fmtTime(game) {
  const d = gameDate(game);
  return d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : '';
}

export function fmtDay(game, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const d = gameDate(game);
  return d ? d.toLocaleDateString([], opts) : '';
}

// YYYY-MM-DD in the viewer's time zone, for grouping games by day.
export function localDayKey(game) {
  const d = gameDate(game);
  return d ? d.toLocaleDateString('en-CA') : '';
}

export const fmtRate = (v, digits = 3) =>
  v == null ? '—' : Number(v).toFixed(digits).replace(/^0(?=\.)/, '');
export const fmtNum = (v, digits = 2) => (v == null ? '—' : Number(v).toFixed(digits));
export const orDash = (v) => (v == null || v === '' ? '—' : v);

export const isFinal = (g) => g?.status === 'Final' || g?.status === 'Completed Early';

// ── Images with fallbacks ───────────────────────────────────────────────────
function initials(text) {
  return String(text || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Some guest nations (e.g. Panama) have a logo URL that 404s; fall back to the
// abbreviation in a badge.
export function TeamLogo({ src, abbr, name, size = 28 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <span className="wb-logo wb-logo--fallback" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-label={name}>
        {abbr || initials(name)}
      </span>
    );
  }
  return <img className="wb-logo" src={src} alt={name ? `${name} logo` : ''} width={size} height={size} onError={() => setFailed(true)} />;
}

export function PlayerPhoto({ src, name, size = 40 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return <span className="wb-photo wb-photo--fallback" style={{ width: size, height: size }} aria-hidden="true">{initials(name)}</span>;
  }
  return <img className="wb-photo" src={src} alt="" width={size} height={size} onError={() => setFailed(true)} />;
}

// ── States ──────────────────────────────────────────────────────────────────
export function Loading({ rows = 3 }) {
  return <div className="wb-loading" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="wb-skeleton" />)}</div>;
}

export function ErrorState({ error, notFound = 'Not found in this league.' }) {
  if (error?.status === 404) return <div className="wb-empty">{notFound}</div>;
  return <div className="wb-empty wb-empty--error">Couldn't load this right now. {error?.message}</div>;
}

export function Empty({ children }) {
  return <div className="wb-empty">{children}</div>;
}

export function Section({ title, aside, children }) {
  return (
    <section className="wb-section">
      <header className="wb-section-head">
        <h2 className="wb-section-title">{title}</h2>
        {aside && <span className="wb-section-aside">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

// ── Games ───────────────────────────────────────────────────────────────────
// Statuses refresh once a day, so in-progress games show no score and are
// never styled as live.
function GameStatus({ game }) {
  if (isFinal(game)) {
    return <span className="wb-game-status">{game.status === 'Completed Early' ? 'Final (early)' : 'Final'}{game.innings_played && game.innings_played !== 9 ? `/${game.innings_played}` : ''}</span>;
  }
  if (game.status === 'Scheduled') return <span className="wb-game-status">{fmtTime(game)}</span>;
  if (game.status === 'In Progress') return <span className="wb-game-status wb-game-status--muted">In progress</span>;
  return <span className="wb-game-status wb-game-status--muted">{game.status}</span>;
}

function GameTeam({ name, abbr, logo, score, won, showScore }) {
  return (
    <div className={`wb-game-team${won ? ' wb-game-team--won' : ''}`}>
      <TeamLogo src={logo} abbr={abbr} name={name} size={24} />
      <span className="wb-game-team-name">{name}</span>
      {showScore && <span className="wb-game-score">{score ?? '—'}</span>}
    </div>
  );
}

export function GameCard({ league, game, showDate = false }) {
  const final = isFinal(game);
  const tag = game.season_type === 'postseason' || game.game_type !== 'R'
    ? (game.series_description || game.postseason_round)
    : (game.series_description && game.series_description !== 'Regular Season' ? game.series_description : null);
  return (
    <Link to={winterPaths.game(league, game.game_pk, game.season)} className="wb-game">
      <div className="wb-game-meta">
        <span>{showDate ? fmtDay(game) : (tag || '')}</span>
        <GameStatus game={game} />
      </div>
      <GameTeam name={game.away_team_name} abbr={game.away_team_abbr} logo={game.away_team_logo_url}
        score={game.away_runs_score} won={final && game.winning_team_id === game.away_team_id} showScore={final} />
      <GameTeam name={game.home_team_name} abbr={game.home_team_abbr} logo={game.home_team_logo_url}
        score={game.home_runs_score} won={final && game.winning_team_id === game.home_team_id} showScore={final} />
      {showDate && tag && <div className="wb-game-tag">{tag}</div>}
    </Link>
  );
}

export function GameGrid({ league, games, showDate }) {
  return (
    <div className="wb-game-grid">
      {games.map(g => <GameCard key={g.game_pk} league={league} game={g} showDate={showDate} />)}
    </div>
  );
}

// ── Standings ───────────────────────────────────────────────────────────────
export function StandingsTable({ league, rows, season, compact = false }) {
  return (
    <div className="wb-table-scroll">
      <table className="wb-table">
        <thead>
          <tr>
            <th className="wb-th-left">Team</th>
            <th>W</th><th>L</th><th>PCT</th><th>GB</th>
            {!compact && <><th>Home</th><th>Away</th><th>L10</th><th>Strk</th><th>RS</th><th>RA</th><th>Diff</th></>}
          </tr>
        </thead>
        <tbody>
          {rows.map(t => (
            <tr key={t.team_id}>
              <td className="wb-td-team">
                <Link to={winterPaths.team(league, t.team_id, season)}>
                  <TeamLogo src={t.logo_url} abbr={t.team_abbreviation} name={t.team_name} size={22} />
                  <span>{t.team_name}</span>
                </Link>
              </td>
              <td>{t.wins}</td><td>{t.losses}</td><td>{fmtRate(t.w_l_pct)}</td><td>{t.games_back}</td>
              {!compact && (
                <>
                  <td>{t.home_wins}-{t.home_losses}</td>
                  <td>{t.away_wins}-{t.away_losses}</td>
                  <td>{t.last_ten_wins}-{t.last_ten_losses}</td>
                  <td>{orDash(t.streak_code)}</td>
                  <td>{t.runs_scored}</td>
                  <td>{t.runs_allowed}</td>
                  <td className={t.run_differential > 0 ? 'wb-pos' : t.run_differential < 0 ? 'wb-neg' : ''}>
                    {t.run_differential > 0 ? `+${t.run_differential}` : t.run_differential}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Leaders ─────────────────────────────────────────────────────────────────
export function qualifierText(q) {
  if (!q) return '';
  if (q.min_pa != null) return `Min. ${q.min_pa} PA`;
  if (q.min_ip != null) return `Min. ${q.min_ip} IP`;
  return '';
}

export function LeadersList({ league, season, data, format }) {
  if (!data?.leaders?.length) return <Empty>No qualified players yet.</Empty>;
  return (
    <ol className="wb-leaders">
      {data.leaders.map(p => (
        <li key={p.player_id}>
          <span className="wb-leader-rank">{p.rank}</span>
          <PlayerPhoto src={p.headshot_url} name={p.player_name} size={32} />
          <span className="wb-leader-name">
            <Link to={winterPaths.player(league, p.player_id, season)}>{p.player_name}</Link>
            <span className="wb-faint">{p.team_name}</span>
          </span>
          <span className="wb-leader-value">{format(p.value)}</span>
        </li>
      ))}
    </ol>
  );
}
