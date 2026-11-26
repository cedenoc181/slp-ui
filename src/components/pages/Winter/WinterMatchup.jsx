import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import { seasonLabel, winterPaths } from '../../../data/constants/cbpcConstants';
import TeamStatsCard from '../Stats/mlb-schedule/components/TeamStatsCard';
import { fmt, headshotUrl } from '../Stats/mlb-schedule/utils';
import { TeamLogo, doubleheaderLabel, fmtDay, fmtTime, gameDate, isFinal } from './winterUi';

/*
  The winter-league matchup page's sections: the MLB matchup page's layout
  and classes (matchup-detail.css), built from the CBPC data sets:

    Hero ............ box score game + standings records
    Pitchers ........ probable / starting SPs + their season line
    Team stats ...... league team batting / pitching (scheduled games)
    Lineups ......... this game's batting / pitching lines (live / final)
    Recent form ..... each club's last 10 completed games
    Head to head .... this season's meetings, from the away club's game log

  No odds, predictions or Scout AI exist for these leagues, so none show.
*/

const LIVE_POLL_MS = 2 * 60 * 1000;

export function gameState(game) {
  if (!game) return 'pre';
  if (isFinal(game) || game.status === 'Game Over') return 'final';
  if (/progress|delay|challenge|review/i.test(game.status || '')) return 'live';
  return 'pre';
}

// Records come from the table the game belongs to: the round robin (L) or the
// regular season.
function recordOf(rows, teamId) {
  const r = rows?.find(t => t.team_id === teamId);
  if (!r) return null;
  return `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ''}`;
}

// One season line per pitcher: this season and season type, on this club if
// he pitched for more than one.
function pickSeasonLine(rows, game, teamId) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const season = rows.filter(r => r.season === game.season);
  const typed = season.filter(r => r.season_type === game.season_type);
  const pool = typed.length ? typed : season.filter(r => r.season_type === 'regular');
  const row = pool.find(r => r.team_id === teamId) || pool[0];
  if (!row) return null;
  return { ...row, label: `${seasonLabel(row.season)} ${row.season_type === 'regular' ? 'Reg. season' : 'Postseason'}` };
}

// TeamStatsCard reads the MLB team-stats keys.
const toMlbBatting = (b) => b && { ...b, homeruns: b.home_runs };
const toMlbPitching = (p) => p && { ...p, home_runs: p.home_runs_allowed };

export function useWinterMatchup(league, gamePk) {
  const [state, setState] = useState({ game: null, loading: true, error: null });
  const [extra, setExtra] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    cbpcService.getBoxscore(league, gamePk, { fresh: tick > 0 })
      .then(game => { if (alive) setState({ game, loading: false, error: null }); })
      .catch(error => { if (alive) setState(s => (s.game ? s : { game: null, loading: false, error })); });
    return () => { alive = false; };
  }, [league, gamePk, tick]);

  const game = state.game;
  const live = gameState(game) === 'live';
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => setTick(n => n + 1), LIVE_POLL_MS);
    return () => clearInterval(t);
  }, [live]);

  // Everything around the game loads once per game.
  const season = game?.season;
  const awayId = game?.away_team_id;
  const homeId = game?.home_team_id;
  const awaySp = game?.away_sp_id;
  const homeSp = game?.home_sp_id;
  const table = game?.game_type === 'L' ? 'L' : 'R';
  useEffect(() => {
    if (!season || !awayId || !homeId) return undefined;
    let alive = true;
    const safe = (p, fallback = null) => p.catch(() => fallback);
    Promise.all([
      safe(cbpcService.getStandings(league, season, table), { teams: [] }),
      safe(cbpcService.getTeamGames(league, awayId, season), []),
      safe(cbpcService.getTeamGames(league, homeId, season), []),
      safe(cbpcService.getTeamStats(league, 'batting', season), []),
      safe(cbpcService.getTeamStats(league, 'pitching', season), []),
      awaySp ? safe(cbpcService.getPlayerSeasonStats(league, 'pitcher', awaySp)) : null,
      homeSp ? safe(cbpcService.getPlayerSeasonStats(league, 'pitcher', homeSp)) : null,
    ]).then(([standings, awayGames, homeGames, batting, pitching, awaySpRows, homeSpRows]) => {
      if (alive) setExtra({ standings: standings?.teams || [], awayGames, homeGames, batting, pitching, awaySpRows, homeSpRows });
    });
    return () => { alive = false; };
  }, [league, season, table, awayId, homeId, awaySp, homeSp]);

  const derived = useMemo(() => {
    if (!game || !extra) return null;
    const team = (rows, id) => rows?.find(t => t.team_id === id) || null;
    return {
      awayRecord: recordOf(extra.standings, game.away_team_id),
      homeRecord: recordOf(extra.standings, game.home_team_id),
      awayBatting: toMlbBatting(team(extra.batting, game.away_team_id)),
      homeBatting: toMlbBatting(team(extra.batting, game.home_team_id)),
      awayPitching: toMlbPitching(team(extra.pitching, game.away_team_id)),
      homePitching: toMlbPitching(team(extra.pitching, game.home_team_id)),
      awaySpLine: pickSeasonLine(extra.awaySpRows, game, game.away_team_id),
      homeSpLine: pickSeasonLine(extra.homeSpRows, game, game.home_team_id),
      awayForm: formGames(extra.awayGames, game.away_team_id, game),
      homeForm: formGames(extra.homeGames, game.home_team_id, game),
      h2h: headToHead(extra.awayGames, game),
    };
  }, [game, extra]);

  return { ...state, derived, extraLoading: !extra };
}

// ── Recent form ──────────────────────────────────────────────────────────────
function resultFor(g, teamId) {
  if (g.winning_team_id != null) return g.winning_team_id === teamId ? 'W' : 'L';
  return g.home_runs_score === g.away_runs_score ? 'T' : (g.home_runs_score > g.away_runs_score) === (g.home_team_id === teamId) ? 'W' : 'L';
}

// Completed games before this one's first pitch, so a past game's page shows
// the form and series as they stood going into it.
function before(games, game) {
  const start = gameDate(game)?.getTime() ?? Infinity;
  return (games || []).filter(g => g.game_pk !== game.game_pk && isFinal(g) && (gameDate(g)?.getTime() ?? 0) < start);
}

function formGames(games, teamId, game) {
  return before(games, game)
    .slice(0, 10) // newest first
    .map(g => {
      const isHome = g.home_team_id === teamId;
      return {
        gamePk: g.game_pk,
        isHome,
        result: resultFor(g, teamId),
        myRuns: isHome ? g.home_runs_score : g.away_runs_score,
        oppRuns: isHome ? g.away_runs_score : g.home_runs_score,
        oppAbbr: isHome ? g.away_team_abbr : g.home_team_abbr,
        oppLogo: isHome ? g.away_team_logo_url : g.home_team_logo_url,
      };
    });
}

function FormDot({ result }) {
  if (result === 'W') return <span className="form-dot win" aria-label="Win" />;
  if (result === 'L') return <span className="form-dot loss" aria-label="Loss" />;
  return <span className="form-dot unknown" aria-label="Tie" />;
}

function tally(form) {
  const w = form.filter(g => g.result === 'W').length;
  const l = form.filter(g => g.result === 'L').length;
  const t = form.filter(g => g.result === 'T').length;
  return `${w}-${l}${t ? `-${t}` : ''}`;
}

export function WinterRecentForm({ league, game, awayForm, homeForm }) {
  const rows = Math.max(awayForm.length, homeForm.length);
  const cell = (g, side) => (g ? (
    <Link to={winterPaths.game(league, g.gamePk)} className={`form-log-${side} flog-row-link`}>
      {side === 'left' ? (
        <>
          <span className="flog-opp">
            <span className="flog-at">{g.isHome ? 'vs' : '@'}</span>
            {g.oppLogo && <img src={g.oppLogo} alt={g.oppAbbr} className="flog-team-logo" />}
            {g.oppAbbr}
          </span>
          <span className={`flog-${g.result.toLowerCase()}`}>{g.result} {g.myRuns}-{g.oppRuns}</span>
        </>
      ) : (
        <>
          <span className="flog-opp">
            <span className="flog-at">{g.isHome ? 'vs' : '@'}</span>
            {g.oppLogo && <img src={g.oppLogo} alt={g.oppAbbr} className="flog-team-logo" />}
            {g.oppAbbr}
          </span>
          <span className={`flog-${g.result.toLowerCase()}`}>{g.myRuns}-{g.oppRuns} {g.result}</span>
        </>
      )}
    </Link>
  ) : <span className={`form-log-${side}`}>—</span>);

  return (
    <div className="detail-card detail-card--form">
      <h3 className="card-title">
        Recent Form — Last 10
        <span className="card-title-sub"> · {seasonLabel(game.season)}</span>
      </h3>
      <div className="form-scroll-body">
        <div className="form-section">
          {[[game.away_team_abbr, game.away_team_id, awayForm], [game.home_team_abbr, game.home_team_id, homeForm]].map(([abbr, id, form], i) => (
            <div key={abbr} style={{ display: 'contents' }}>
              {i === 1 && <div className="form-divider" />}
              <div className={`form-col${i === 1 ? ' form-col-right' : ''}`}>
                <p className="form-team-label">
                  <Link to={winterPaths.team(league, id, game.season)} className="form-team-link">{abbr}</Link>
                </p>
                <p className="form-record">{tally(form)}</p>
                <div className="form-track">{form.map((g, j) => <FormDot key={j} result={g.result} />)}</div>
              </div>
            </div>
          ))}
        </div>
        {rows > 0 && (
          <div className="form-game-log">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="form-log-row">
                {cell(awayForm[i], 'left')}
                <div className="form-log-vsep" />
                {cell(homeForm[i], 'right')}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Head to head ─────────────────────────────────────────────────────────────
// This season's meetings before this game, newest first, from the away club's log.
function headToHead(awayGames, game) {
  const meetings = before(awayGames, game)
    .filter(g => g.home_team_id === game.home_team_id || g.away_team_id === game.home_team_id).slice(0, 10);
  if (!meetings.length) return null;

  const side = (teamId) => {
    let wins = 0, runs = 0, hits = 0, errors = 0, biggest = null;
    meetings.forEach(g => {
      const home = g.home_team_id === teamId;
      const my = home ? g.home_runs_score : g.away_runs_score;
      const opp = home ? g.away_runs_score : g.home_runs_score;
      runs += my ?? 0;
      hits += (home ? g.home_hits : g.away_hits) ?? 0;
      errors += (home ? g.home_errors : g.away_errors) ?? 0;
      if (resultFor(g, teamId) === 'W') {
        wins += 1;
        biggest = Math.max(biggest ?? 0, my - opp);
      }
    });
    const n = meetings.length;
    return { wins, runs, hits, errors, biggest, runsPg: runs / n, hitsPg: hits / n };
  };
  const away = side(game.away_team_id);
  const home = side(game.home_team_id);
  const margin = meetings.reduce((s, g) => s + Math.abs((g.home_runs_score ?? 0) - (g.away_runs_score ?? 0)), 0) / meetings.length;
  return { meetings, away, home, margin };
}

function StatRow({ label, away, home, lowerIsBetter }) {
  const a = parseFloat(away);
  const h = parseFloat(home);
  const ok = !Number.isNaN(a) && !Number.isNaN(h);
  const awayLead = ok && (lowerIsBetter ? a < h : a > h);
  const homeLead = ok && (lowerIsBetter ? h < a : h > a);
  return (
    <div className="matchup-stat-row">
      <span className={`stat-value away${awayLead ? ' stat-leader' : ''}`}>{away}</span>
      <span className="stat-label">{label}</span>
      <span className={`stat-value home${homeLead ? ' stat-leader' : ''}`}>{home}</span>
    </div>
  );
}

function SplitCell({ a, b, awayAbbr, homeAbbr }) {
  if (a == null || b == null) return '—';
  return (
    <span className="h2h-score-wrap">
      <span>{a}–{b}</span>
      {a === b
        ? <span className="h2h-winner-label h2h-winner-tie">(tie)</span>
        : <span className="h2h-winner-label">({a > b ? awayAbbr : homeAbbr})</span>}
    </span>
  );
}

export function WinterHeadToHead({ league, game, h2h }) {
  const navigate = useNavigate();
  const { meetings, away, home, margin } = h2h;
  const n = meetings.length;
  const A = game.away_team_abbr;
  const H = game.home_team_abbr;
  const totalRuns = away.runs + home.runs;
  const totalHits = away.hits + home.hits;
  return (
    <>
      <div className="detail-card h2h-summary-card">
        <h3 className="card-title">
          Head to Head
          <span className="card-title-sub"> — Last {n} Meeting{n === 1 ? '' : 's'}</span>
        </h3>
        <div className="h2h-record-section">
          <div className="h2h-team-win-block">
            <span className="h2h-team-abbr">{A}</span>
            <span className="h2h-win-count">{away.wins}</span>
            <span className="h2h-wins-label">Wins</span>
          </div>
          <div className="h2h-bar-wrap">
            <div className="h2h-bar">
              <div className="h2h-bar-away" style={{ width: `${(away.wins / n) * 100}%` }} />
              <div className="h2h-bar-neutral" style={{ flex: 1 }} />
              <div className="h2h-bar-home" style={{ width: `${(home.wins / n) * 100}%` }} />
            </div>
            <span className="h2h-games-label">{n} games</span>
          </div>
          <div className="h2h-team-win-block">
            <span className="h2h-team-abbr">{H}</span>
            <span className="h2h-win-count">{home.wins}</span>
            <span className="h2h-wins-label">Wins</span>
          </div>
        </div>
        <div className="stat-comparison-header"><span>{A}</span><span /><span>{H}</span></div>
        <StatRow label="Avg Runs/Game" away={away.runsPg.toFixed(1)} home={home.runsPg.toFixed(1)} />
        <StatRow label="Avg Hits/Game" away={away.hitsPg.toFixed(1)} home={home.hitsPg.toFixed(1)} />
        <StatRow label="Errors" away={away.errors} home={home.errors} lowerIsBetter />
        <StatRow label="Biggest Win" away={away.biggest != null ? `+${away.biggest}` : '—'} home={home.biggest != null ? `+${home.biggest}` : '—'} />
        <div className="h2h-totals-row">
          <div className="h2h-totals-line">
            <span className="h2h-total-label">Runs</span>
            <span className="h2h-total-val">{totalRuns}</span>
            <span className="h2h-total-sub">({(totalRuns / n).toFixed(1)}/gm)</span>
            <span className="h2h-totals-sep">·</span>
            <span className="h2h-total-label">Hits</span>
            <span className="h2h-total-val">{totalHits}</span>
            <span className="h2h-total-sub">({(totalHits / n).toFixed(1)}/gm)</span>
          </div>
          <div className="h2h-totals-line">
            <span className="h2h-totals-sep">·</span>
            <span className="h2h-total-label">Avg Margin</span>
            <span className="h2h-total-val">{margin.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="detail-card h2h-gamelog-card">
        <h3 className="card-title">
          H2H Game Log
          <span className="card-title-sub"> · {seasonLabel(game.season)}</span>
        </h3>
        <div className="h2h-table-wrapper">
          <table className="h2h-log-table">
            <thead>
              <tr>
                <th>Date</th><th>Site</th><th>{A}</th><th>{H}</th>
                <th>1st Runs</th><th>F5 Runs</th><th>{A} SP</th><th>{H} SP</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map(g => {
                // Columns follow today's away club, wherever it played.
                const awayHome = g.home_team_id === game.away_team_id;
                const pre = (home) => (home ? 'home' : 'away');
                const a = pre(awayHome);
                const b = pre(!awayHome);
                const s = g.inning_stats || {};
                const aRuns = g[`${a}_runs_score`];
                const bRuns = g[`${b}_runs_score`];
                const aWon = resultFor(g, game.away_team_id) === 'W';
                const bWon = resultFor(g, game.home_team_id) === 'W';
                return (
                  <tr key={g.game_pk} className="h2h-log-row-link" onClick={() => { navigate(winterPaths.game(league, g.game_pk)); window.scrollTo(0, 0); }}>
                    <td className="h2h-date">{fmtDay(g, { month: 'short', day: 'numeric' })}</td>
                    <td className="h2h-location">{awayHome ? `vs ${H}` : `@ ${H}`}</td>
                    <td className={`h2h-score${aWon ? ' h2h-score-win' : ' h2h-score-loss'}`}>{aRuns}</td>
                    <td className={`h2h-score${bWon ? ' h2h-score-win' : ' h2h-score-loss'}`}>{bRuns}</td>
                    <td className="h2h-1st"><SplitCell a={s[`${a}_team_1st_inning_runs`]} b={s[`${b}_team_1st_inning_runs`]} awayAbbr={A} homeAbbr={H} /></td>
                    <td className="h2h-f5"><SplitCell a={s[`${a}_team_5_inning_runs`]} b={s[`${b}_team_5_inning_runs`]} awayAbbr={A} homeAbbr={H} /></td>
                    <td className="h2h-sp">{g[`${a}_sp_name`] || '—'}</td>
                    <td className="h2h-sp">{g[`${b}_sp_name`] || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
export function WinterHero({ league, game, state, awayRecord, homeRecord, stage }) {
  const final = state === 'final';
  const live = state === 'live';
  const awayWon = final && game.winning_team_id === game.away_team_id;
  const homeWon = final && game.winning_team_id === game.home_team_id;
  const inning = game.inning_state && game.current_inning ? ` · ${game.inning_state} ${game.current_inning}` : '';
  const team = (s, won, record) => (
    <>
      <Link to={winterPaths.team(league, game[`${s}_team_id`], game.season)}>
        <TeamLogo src={game[`${s}_team_logo_url`]} abbr={game[`${s}_team_abbr`]} name={game[`${s}_team_name`]} size={64} />
      </Link>
      <div className={`hero-team-info${s === 'home' ? ' home-info' : ''}`}>
        <span className="hero-team-name">{game[`${s}_team_name`]}</span>
        {record && <span className="hero-team-record">{record}</span>}
        {final && <span className={`hero-score${won ? ' score-win' : ' score-loss'}`}>{game[`${s}_runs_score`]}</span>}
      </div>
    </>
  );
  return (
    <div className={`detail-hero${final ? ' hero-final' : live ? ' hero-live' : ''}`}>
      <div className="hero-status-strip">
        <span className="hero-date">{fmtDay(game, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        {stage && <span className="hero-date">{stage}</span>}
        {/* Doubleheader: say which game; a TBD Game 2 reads "Game 2 · follows Game 1" in its badge. */}
        {doubleheaderLabel(game) && !(state === 'pre' && game.start_time_tbd && game.game_number === 2) && (
          <span className="hero-date">{doubleheaderLabel(game)}</span>
        )}
        {state === 'pre' && <span className="hero-badge badge-scheduled">{/^(scheduled|pre-game|warmup)$/i.test(game.status) ? fmtTime(game) : game.status}</span>}
        {live && <span className="hero-badge badge-live">● LIVE{inning}</span>}
        {final && <span className="hero-badge badge-final">FINAL</span>}
        {final && game.status === 'Completed Early' && <span className="hero-badge-sub">Completed Early</span>}
      </div>
      <div className="hero-matchup">
        <div className="hero-team away-team">{team('away', awayWon, awayRecord)}</div>
        <div className="hero-center">
          {final || live ? <span className="hero-dash">—</span> : <span className="hero-vs">VS</span>}
          {game.venue_name && <span className="hero-venue">{game.venue_name}</span>}
        </div>
        <div className="hero-team home-team">
          {/* Home reads name-then-logo, like the MLB hero. */}
          <div className={`hero-team-info home-info`}>
            <span className="hero-team-name">{game.home_team_name}</span>
            {homeRecord && <span className="hero-team-record">{homeRecord}</span>}
            {final && <span className={`hero-score${homeWon ? ' score-win' : ' score-loss'}`}>{game.home_runs_score}</span>}
          </div>
          <Link to={winterPaths.team(league, game.home_team_id, game.season)}>
            <TeamLogo src={game.home_team_logo_url} abbr={game.home_team_abbr} name={game.home_team_name} size={64} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Pitchers ─────────────────────────────────────────────────────────────────
function WinterPitcherCard({ league, game, side, line }) {
  const right = side === 'home';
  const name = game[`${side}_sp_name`];
  const spId = game[`${side}_sp_id`];
  const hs = headshotUrl(game[`${side}_sp_mlb_id`]);
  const logo = (
    <Link to={winterPaths.team(league, game[`${side}_team_id`], game.season)} className="pitcher-card-logo-link">
      <TeamLogo src={game[`${side}_team_logo_url`]} abbr={game[`${side}_team_abbr`]} name={game[`${side}_team_name`]} size={28} />
    </Link>
  );
  const headshot = hs && <img src={hs} alt={name || ''} className="pitcher-headshot" onError={(e) => { e.target.style.display = 'none'; }} />;
  return (
    <div className={`pitcher-card${right ? ' right-align' : ''}`}>
      <div className="pitcher-header">
        {!right && logo}
        <p className="pitcher-team">{game[`${side}_team_abbr`]}</p>
        {right && logo}
      </div>
      <div className="pitcher-info-row">
        {!right && headshot}
        <div className="pitcher-details">
          {name && spId
            ? <Link to={winterPaths.player(league, spId, game.season)} className="pitcher-name-lg">{name}</Link>
            : <p className="pitcher-name-lg">{name || 'TBD'}</p>}
          {line && <span className="pitcher-wl-record">{line.wins}-{line.losses}</span>}
          {line && (
            <div className="pitcher-stats">
              <span className="pitcher-stat-season">{line.label}</span>
              {line.era != null && <span>ERA {fmt(line.era, 2)}</span>}
              {line.whip != null && <span>WHIP {fmt(line.whip, 2)}</span>}
              {line.strikeouts != null && <span>{line.strikeouts} K</span>}
              {line.innings_display && <span>{line.innings_display} IP</span>}
            </div>
          )}
          {/* undefined = still loading; null = no line this season */}
          {name && line === null && <div className="pitcher-stats"><span className="pitcher-stat-season">No {seasonLabel(game.season)} innings yet</span></div>}
        </div>
        {right && headshot}
      </div>
    </div>
  );
}

export function WinterPitchers({ league, game, state, awayLine, homeLine }) {
  const probable = state === 'pre';
  return (
    <div className="detail-card detail-card-full">
      <h3 className="card-title">{probable ? 'Probable Pitchers' : 'Starting Pitchers'}</h3>
      <div className="pitcher-matchup">
        <WinterPitcherCard league={league} game={game} side="away" line={awayLine} />
        <div className="pitcher-vs">VS</div>
        <WinterPitcherCard league={league} game={game} side="home" line={homeLine} />
      </div>
    </div>
  );
}

// ── Lineups (this game's lines) ──────────────────────────────────────────────
function leaderIdx(rows, key) {
  let best = 0, idx = -1;
  rows.forEach((r, i) => { if ((r[key] ?? 0) > best) { best = r[key]; idx = i; } });
  return idx;
}

export function WinterLineupCard({ league, game, side, fallback }) {
  const [tab, setTab] = useState('batters');
  const batters = game.batting?.[side] || [];
  const pitchers = [...(game.pitching?.[side] || [])].sort((a, b) => (a.appearance_order ?? 0) - (b.appearance_order ?? 0));
  if (!batters.length && !pitchers.length) return fallback;

  const abbr = game[`${side}_team_abbr`];
  const hit = leaderIdx(batters, 'hits');
  const hr = leaderIdx(batters, 'home_runs');
  const rbi = leaderIdx(batters, 'rbis');
  const player = (p) => <Link to={winterPaths.player(league, p.player_id, game.season)} className="lineup-player-link">{p.player_name}</Link>;
  return (
    <div className="detail-card lineup-card">
      <div className="lineup-card-header">
        <h3 className="card-title">
          <TeamLogo src={game[`${side}_team_logo_url`]} abbr={abbr} name={game[`${side}_team_name`]} size={22} />
          {abbr} Lineup
        </h3>
        <div className="lineup-toggle">
          <button type="button" className={`lineup-tab${tab === 'batters' ? ' active' : ''}`} onClick={() => setTab('batters')}>Batters</button>
          <button type="button" className={`lineup-tab${tab === 'pitchers' ? ' active' : ''}`} onClick={() => setTab('pitchers')}>Pitchers</button>
        </div>
      </div>
      <div className="lineup-table-wrap">
        {tab === 'batters' ? (
          <table className="lineup-table">
            <thead>
              <tr><th className="lineup-th-name">Player</th><th>AB</th><th>R</th><th>H</th><th>HR</th><th>RBI</th><th>BB</th><th>K</th></tr>
            </thead>
            <tbody>
              {batters.map((p, i) => (
                <tr key={p.player_id} className={p.is_starter ? '' : 'lineup-sub'}>
                  <td className="lineup-name">{player(p)} <span className="wb-faint">{p.position}</span></td>
                  <td>{p.at_bats}</td><td>{p.runs}</td>
                  <td className={i === hit ? 'lineup-stat-leader' : ''}>{p.hits}</td>
                  <td className={i === hr ? 'lineup-stat-leader' : ''}>{p.home_runs}</td>
                  <td className={i === rbi ? 'lineup-stat-leader' : ''}>{p.rbis}</td>
                  <td>{p.walks}</td><td>{p.strikeouts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="lineup-table">
            <thead>
              <tr><th className="lineup-th-name">Player</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>K</th><th>PC</th></tr>
            </thead>
            <tbody>
              {pitchers.map(p => (
                <tr key={p.player_id}>
                  <td className={`lineup-name${p.is_starter ? ' lineup-starter' : ''}`}>
                    {player(p)}
                    {p.win ? <span className="wb-decision"> W</span> : p.loss ? <span className="wb-decision"> L</span> : p.save ? <span className="wb-decision"> SV</span> : null}
                  </td>
                  <td>{p.innings_display}</td><td>{p.hits_allowed}</td><td>{p.runs}</td><td>{p.earned_runs}</td>
                  <td>{p.walks}</td><td>{p.strikeouts}</td><td>{p.pitches_thrown ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function WinterTeamStats({ game, side, batting, pitching }) {
  if (!batting && !pitching) return null;
  return <TeamStatsCard abbr={game[`${side}_team_abbr`]} mlbId={game[`${side}_mlb_team_id`]} batting={batting} pitching={pitching} />;
}
