import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import { CBPC_LEAGUES, seasonLabel, winterPaths } from '../../../data/constants/cbpcConstants';
import TeamOverviewCards from '../Stats/team-analytics/components/TeamOverviewCards';
import { getSplitPctColor, getWinPctColor, getStreakString, isWinningStreak } from '../Stats/team-analytics/utils';
import { useCbpc, Loading, ErrorState, TeamLogo, isFinal } from './winterUi';

/*
  Team Analytics for a winter-league (CBPC) club, laid out like the MLB team
  page and using its classes (overview cards, chart, splits, info grid,
  roster, game log). Differences, all because of the data:
  - Weekly instead of monthly performance: a winter season is ~10 weeks.
  - Splits are computed from the club's games (no vs-LHP/RHP or division
    records for these leagues).
  - No injuries; the roster is the current snapshot (current season only).
*/

const PAGE_SIZE = 10;

const BAT_LEADERS = [
  ['home_runs', 'Home Runs', v => v ?? 0],
  ['rbis', 'RBI', v => v ?? 0],
  ['avg', 'Batting Avg', v => (v == null ? '.000' : Number(v).toFixed(3).replace(/^0/, ''))],
  ['ops', 'OPS', v => (v == null ? '.000' : Number(v).toFixed(3))],
  ['stolen_bases', 'Stolen Bases', v => v ?? 0],
];
const PITCH_LEADERS = [
  ['wins', 'Wins', v => v ?? 0],
  ['era', 'ERA', v => (v == null ? '—' : Number(v).toFixed(2))],
  ['strikeouts', 'Strikeouts', v => v ?? 0],
  ['whip', 'WHIP', v => (v == null ? '—' : Number(v).toFixed(2))],
  ['saves', 'Saves', v => v ?? 0],
];

const pct = (w, l) => (w + l > 0 ? w / (w + l) : 0);
const rate3 = (v) => (v == null ? '.000' : Number(v).toFixed(3).replace(/^0/, ''));

// One completed game from this club's side.
function sideOf(g, teamId) {
  const home = g.home_team_id === teamId;
  const mine = home ? g.home_runs_score : g.away_runs_score;
  const theirs = home ? g.away_runs_score : g.home_runs_score;
  return {
    game: g,
    home,
    mine,
    theirs,
    won: mine > theirs,
    oppId: home ? g.away_team_id : g.home_team_id,
    opp: home ? g.away_team_abbr : g.home_team_abbr,
    sp: home ? g.home_sp_name : g.away_sp_name,
    hits: home ? g.home_hits : g.away_hits,
    errors: home ? g.home_errors : g.away_errors,
  };
}

// Rank (1 = best) of this club's value among every club in the league.
function leagueRank(rows, teamId, key, lowerIsBetter = false) {
  const vals = rows.filter(r => r[key] != null);
  const mine = vals.find(r => r.team_id === teamId)?.[key];
  if (mine == null) return null;
  return 1 + vals.filter(r => (lowerIsBetter ? r[key] < mine : r[key] > mine)).length;
}

// ── Weekly performance (replaces monthly for these short seasons) ──────────
// 7-day blocks from the season's first game; a divider marks where the
// postseason starts (labelled with that series, e.g. "LIDOM Round Robin").
function buildWeeks(games, teamId) {
  const decided = games
    .filter(g => isFinal(g) && g.home_runs_score != null && g.away_runs_score != null)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!decided.length) return [];
  const start = new Date(`${decided[0].date}T12:00:00Z`);
  const weeks = [];
  decided.forEach(g => {
    const idx = Math.floor((new Date(`${g.date}T12:00:00Z`) - start) / (7 * 86400000));
    const post = g.season_type === 'postseason';
    let w = weeks[weeks.length - 1];
    if (!w || w.idx !== idx || w.post !== post) {
      const postN = post ? weeks.filter(x => x.post).length + 1 : null;
      w = { idx, post, postN, label: post ? (g.series_description || 'Postseason') : null, wins: 0, losses: 0, from: g.date, to: g.date };
      weeks.push(w);
    }
    const s = sideOf(g, teamId);
    if (s.mine === s.theirs) return;
    if (s.won) w.wins += 1; else w.losses += 1;
    w.to = g.date;
  });
  return weeks;
}

function WeeklyChart({ games, teamId, season }) {
  const weeks = useMemo(() => buildWeeks(games, teamId), [games, teamId]);
  const max = Math.max(4, ...weeks.map(w => Math.max(w.wins, w.losses)));
  const fmt = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric' });
  return (
    <div className="chart-section">
      <div className="section-card">
        <div className="card-header">
          <div>
            <h3>Weekly Performance Trends</h3>
            <p className="card-subtitle">{seasonLabel(season)} · wins and losses per week of the season</p>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot wins"></span> Wins</span>
            <span className="legend-item"><span className="legend-dot losses"></span> Losses</span>
          </div>
        </div>
        <div className="chart-container">
          <div className="bar-chart">
            {weeks.length === 0 ? <div className="no-data-message">No completed games yet</div> : weeks.map((w, i) => {
              const total = w.wins + w.losses;
              const p = total ? (w.wins / total) * 100 : 0;
              const startsPost = w.post && (i === 0 || !weeks[i - 1].post || weeks[i - 1].label !== w.label);
              return (
                <React.Fragment key={`${w.idx}-${w.post}`}>
                  {startsPost && (
                    <div className="season-phase-divider">
                      <div className="divider-line"></div>
                      <span className="phase-text">{w.label}</span>
                      <div className="divider-line"></div>
                    </div>
                  )}
                  <div className="bar-group" title={`${fmt(w.from)} – ${fmt(w.to)}`}>
                    <div className="bar-wrapper">
                      <div className="bar wins" style={{ height: `${(w.wins / max) * 100}%` }}>{w.wins > 0 && <span className="bar-label">{w.wins}</span>}</div>
                      <div className="bar losses" style={{ height: `${(w.losses / max) * 100}%` }}>{w.losses > 0 && <span className="bar-label">{w.losses}</span>}</div>
                    </div>
                    <div className="bar-month">{w.post ? `PS ${w.postN}` : `Wk ${w.idx + 1}`}</div>
                    <div className="bar-record">{w.wins}-{w.losses}</div>
                    <div className="bar-win-pct" style={{ color: getWinPctColor(p) }}>{total ? `${p.toFixed(1)}%` : '-'}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Splits + last 10 ────────────────────────────────────────────────────────
function SplitRow({ label, wins, losses }) {
  const p = pct(wins, losses);
  return (
    <div className="split-row">
      <div className="split-label">{label}</div>
      <div className="split-stats">
        <span className="split-record">{wins}-{losses}</span>
        <span className="split-pct" style={{ color: getSplitPctColor(p) }}>{(p * 100).toFixed(1)}%</span>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${p * 100}%`, backgroundColor: getSplitPctColor(p) }}></div></div>
      </div>
    </div>
  );
}

function SplitsAndLast10({ games, teamId, standings }) {
  const sides = useMemo(() => games
    .filter(g => isFinal(g) && g.home_runs_score != null)
    .map(g => sideOf(g, teamId))
    .filter(s => s.mine !== s.theirs), [games, teamId]);

  const winning = useMemo(() => new Set(standings.filter(t => t.w_l_pct >= 0.5 && t.team_id !== teamId).map(t => t.team_id)), [standings, teamId]);
  const count = (pred) => {
    const list = sides.filter(pred);
    return { wins: list.filter(s => s.won).length, losses: list.filter(s => !s.won).length };
  };
  const rows = [
    ['Home', count(s => s.home)],
    ['Away', count(s => !s.home)],
    ['vs .500+ Teams', count(s => winning.has(s.oppId))],
    ['One-Run Games', count(s => Math.abs(s.mine - s.theirs) === 1)],
    ['Blowouts (5+ runs)', count(s => Math.abs(s.mine - s.theirs) >= 5)],
    ['Extra Innings', count(s => (s.game.innings_played || 9) > 9)],
  ];

  const last10 = [...sides].sort((a, b) => String(b.game.date).localeCompare(String(a.game.date))).slice(0, 10);
  const l10 = last10.reduce((acc, s) => ({
    wins: acc.wins + (s.won ? 1 : 0), losses: acc.losses + (s.won ? 0 : 1), rs: acc.rs + s.mine, ra: acc.ra + s.theirs,
  }), { wins: 0, losses: 0, rs: 0, ra: 0 });
  const diff = l10.rs - l10.ra;

  return (
    <div className="splits-section">
      <div className="section-card">
        <div className="card-header">
          <h3>Performance Splits</h3>
          <p className="card-subtitle"><span className="subtitle-bold">📊 Regular season</span> situational records</p>
        </div>
        <div className="splits-grid">
          {sides.length === 0 ? <div className="no-data-message">Splits appear once games are played.</div>
            : rows.map(([label, c]) => <SplitRow key={label} label={label} wins={c.wins} losses={c.losses} />)}
        </div>
      </div>
      <div className="section-card">
        <div className="card-header">
          <div>
            <h3>Last 10 Games</h3>
            <p className="card-subtitle">Most recent completed games</p>
          </div>
        </div>
        {last10.length ? (
          <div className="last-10-stats">
            <div className="last-10-item"><div className="last-10-label">Record</div><div className="last-10-value">{l10.wins}-{l10.losses}</div></div>
            <div className="last-10-item"><div className="last-10-label">Runs Scored</div><div className="last-10-value">{l10.rs}</div></div>
            <div className="last-10-item"><div className="last-10-label">Runs Allowed</div><div className="last-10-value">{l10.ra}</div></div>
            <div className="last-10-item">
              <div className="last-10-label">Run Diff</div>
              <div className={`last-10-value ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}`}>{diff > 0 ? '+' : ''}{diff}</div>
            </div>
          </div>
        ) : <div className="no-data-message">No completed games yet</div>}
      </div>
    </div>
  );
}

// ── Standings, leaders, team stats ──────────────────────────────────────────
function InfoGrid({ league, season, teamId, record, leaders, batting, pitching, battingRows, pitchingRows, leagueSize }) {
  const navigate = useNavigate();
  const [leadersToggle, setLeadersToggle] = useState('batting');
  const [statsToggle, setStatsToggle] = useState('batting');
  const cats = leadersToggle === 'batting' ? BAT_LEADERS : PITCH_LEADERS;
  const short = CBPC_LEAGUES[league].short;
  const rankOf = (rows, key, low) => {
    const r = leagueRank(rows, teamId, key, low);
    return r ? `#${r} of ${leagueSize}` : '—';
  };

  return (
    <div className="team-info-grid">
      <div className="section-card">
        <div className="card-header">
          <h3>{short} Standings</h3>
          <p className="card-subtitle">{seasonLabel(season)} Standings</p>
        </div>
        {record ? (
          <div className="standings-content">
            <div className="standings-row"><span className="standings-label">Wins</span><span className="standings-value">{record.wins}</span></div>
            <div className="standings-row"><span className="standings-label">Losses</span><span className="standings-value">{record.losses}</span></div>
            <div className="standings-row"><span className="standings-label">Win %</span><span className="standings-value">{rate3(record.w_l_pct)}</span></div>
            <div className="standings-row"><span className="standings-label">Games Back</span><span className="standings-value">{record.games_back === '-' ? '—' : record.games_back}</span></div>
            <div className="standings-row"><span className="standings-label">League Rank</span><span className="standings-value">#{record.league_rank} of {leagueSize}</span></div>
            <div className="standings-row highlight">
              <span className="standings-label">Streak</span>
              <span className={`standings-value streak-badge ${isWinningStreak(record.streak_code) ? 'positive' : 'negative'}`}>{getStreakString(record.streak_code) || '—'}</span>
            </div>
          </div>
        ) : <div className="no-data-message">No standings yet</div>}
      </div>

      <div className="section-card">
        <div className="card-header">
          <div>
            <h3>Team Leaders</h3>
            <p className="card-subtitle">{seasonLabel(season)} Top Performers</p>
          </div>
          <div className="toggle-buttons">
            <button className={`toggle-btn ${leadersToggle === 'batting' ? 'active' : ''}`} onClick={() => setLeadersToggle('batting')}>Batting</button>
            <button className={`toggle-btn ${leadersToggle === 'pitching' ? 'active' : ''}`} onClick={() => setLeadersToggle('pitching')}>Pitching</button>
          </div>
        </div>
        <div className="leaders-content">
          {cats.map(([stat, label, format]) => {
            const p = leaders[`${leadersToggle}:${stat}`];
            return (
              <div
                key={stat}
                className="leader-row clickable"
                onClick={() => p && navigate(winterPaths.player(league, p.player_id, season))}
                title={p ? `View ${p.player_name}` : undefined}
              >
                <span className="leader-player">{p?.player_name || 'N/A'}</span>
                <div className="leader-info">
                  <span className="leader-stat-label">{label}</span>
                  <span className="leader-value">{p ? format(p.value) : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-card">
        <div className="card-header">
          <div>
            <h3>Team Stats</h3>
            <p className="card-subtitle">{seasonLabel(season)} Overall Performance</p>
          </div>
          <div className="toggle-buttons">
            <button className={`toggle-btn ${statsToggle === 'batting' ? 'active' : ''}`} onClick={() => setStatsToggle('batting')}>Batting</button>
            <button className={`toggle-btn ${statsToggle === 'pitching' ? 'active' : ''}`} onClick={() => setStatsToggle('pitching')}>Pitching</button>
          </div>
        </div>
        {statsToggle === 'batting' ? (batting ? (
          <div className="team-stats-content">
            <div className="team-stat-row"><span className="team-stat-label">Team AVG</span><span className="team-stat-value">{rate3(batting.avg)}</span></div>
            <div className="team-stat-row"><span className="team-stat-label">OPS</span><span className="team-stat-value">{Number(batting.ops).toFixed(3)}</span></div>
            <div className="team-stat-row"><span className="team-stat-label">Home Runs</span><span className="team-stat-value">{batting.home_runs}</span></div>
            <div className="team-stat-row"><span className="team-stat-label">Runs Scored</span><span className="team-stat-value">{batting.runs}</span></div>
            <div className="team-stat-row highlight"><span className="team-stat-label">{short} OPS Rank</span><span className="team-stat-value">{rankOf(battingRows, 'ops')}</span></div>
          </div>
        ) : <div className="no-data-message">No batting stats yet</div>) : (pitching ? (
          <div className="team-stats-content">
            <div className="team-stat-row"><span className="team-stat-label">ERA</span><span className="team-stat-value">{Number(pitching.era).toFixed(2)}</span></div>
            <div className="team-stat-row"><span className="team-stat-label">WHIP</span><span className="team-stat-value">{Number(pitching.whip).toFixed(2)}</span></div>
            <div className="team-stat-row"><span className="team-stat-label">Strikeouts</span><span className="team-stat-value">{pitching.strikeouts}</span></div>
            <div className="team-stat-row"><span className="team-stat-label">K/9</span><span className="team-stat-value">{Number(pitching.k_per_9).toFixed(1)}</span></div>
            <div className="team-stat-row highlight"><span className="team-stat-label">{short} ERA Rank</span><span className="team-stat-value">{rankOf(pitchingRows, 'era', true)}</span></div>
          </div>
        ) : <div className="no-data-message">No pitching stats yet</div>)}
      </div>
    </div>
  );
}

// ── Roster (current snapshot) ───────────────────────────────────────────────
function Roster({ league, teamId, season }) {
  const [filter, setFilter] = useState('all');
  const { data, loading, error } = useCbpc(() => cbpcService.getRoster(league, teamId), [league, teamId]);
  const pitchers = data?.pitchers || [];
  const position = [...(data?.catchers || []), ...(data?.infielders || []), ...(data?.outfielders || [])];
  const list = filter === 'pitchers' ? pitchers : filter === 'position' ? position : [...pitchers, ...position];
  return (
    <div className="roster-injury-section">
      <div className="section-card roster-card">
        <div className="card-header">
          <div>
            <h3>Team Roster</h3>
            <p className="card-subtitle">
              {filter === 'all' && `${pitchers.length + position.length} Players`}
              {filter === 'pitchers' && `${pitchers.length} Pitchers`}
              {filter === 'position' && `${position.length} Position Players`}
              {data?.snapshot_date && ` · as of ${new Date(`${data.snapshot_date}T12:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
            </p>
          </div>
          <div className="toggle-buttons">
            <button className={`toggle-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`toggle-btn ${filter === 'pitchers' ? 'active' : ''}`} onClick={() => setFilter('pitchers')}>Pitchers</button>
            <button className={`toggle-btn ${filter === 'position' ? 'active' : ''}`} onClick={() => setFilter('position')}>Position</button>
          </div>
        </div>
        <div className="roster-table-container">
          {loading ? <Loading rows={4} /> : error ? <ErrorState error={error} notFound="No roster for this team." /> : list.length ? (
            <table className="roster-table">
              <thead><tr><th>#</th><th>Player</th><th>Position</th><th>B/T</th></tr></thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.player_id}>
                    <td className="player-number">{p.jersey_number || '-'}</td>
                    <td className="player-name">
                      <Link to={winterPaths.player(league, p.player_id, season)} className="player-profile-link" onClick={() => window.scrollTo(0, 0)}>{p.player_name}</Link>
                    </td>
                    <td className="player-position"><span className="position-badge">{p.position_abbreviation || '-'}</span></td>
                    <td className="player-hands">{p.bats || '-'}/{p.throws || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="no-data-message">{league === 'cs' ? 'Rosters not announced yet. Serie del Caribe rosters appear in late January.' : 'No roster on file.'}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Game log ────────────────────────────────────────────────────────────────
function GameLog({ league, teamId, season, regular, post }) {
  const navigate = useNavigate();
  const [type, setType] = useState('R');
  const [page, setPage] = useState(0);
  const games = (type === 'P' ? post : regular).filter(g => isFinal(g));
  const pages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
  const shown = games.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  return (
    <section className="pps-section team-game-log-section">
      <div className="pps-section-header">
        <div>
          <h2 className="pps-section-title">Game Log</h2>
          <p className="pps-section-subtitle">{seasonLabel(season)} {type === 'P' ? 'Postseason' : 'Regular Season'} results • {games.length} games</p>
        </div>
        <div className="pps-game-log-filters">
          <select className="pps-season-type-filter" value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>
            <option value="R">Regular Season</option>
            {post.length > 0 && <option value="P">Postseason</option>}
          </select>
        </div>
      </div>
      <div className="pps-game-log-container">
        {games.length === 0 ? <div className="no-data-message">No completed games yet</div> : (
          <div className="pps-game-log-table-wrapper">
            <table className="pps-game-log-table team-game-log-table">
              <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>Score</th><th>Starter</th><th>H</th><th>E</th><th>Diff</th></tr></thead>
              <tbody>
                {shown.map(g => {
                  const s = sideOf(g, teamId);
                  const cls = s.won ? 'win' : 'loss';
                  const d = s.mine - s.theirs;
                  return (
                    <tr key={g.game_pk} className="pps-game-log-row-link" style={{ cursor: 'pointer' }} onClick={() => navigate(winterPaths.game(league, g.game_pk, g.season))}>
                      <td className="pps-game-date">{new Date(`${g.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="pps-game-opponent"><span className="pps-home-away-indicator">{s.home ? 'vs' : '@'}</span><span>{s.opp}</span></td>
                      <td className={`pps-game-result ${cls}`}>{s.won ? 'W' : 'L'}</td>
                      <td className="pps-game-score"><span className={cls}>{s.mine}</span>-<span>{s.theirs}</span></td>
                      <td className="pps-game-starter">{s.sp || '-'}</td>
                      <td className={s.hits >= 10 ? 'pps-highlight' : ''}>{s.hits ?? '-'}</td>
                      <td className={s.errors > 0 ? 'pps-danger' : ''}>{s.errors ?? '-'}</td>
                      <td className={d > 0 ? 'pps-positive' : d < 0 ? 'pps-negative' : ''}>{d > 0 ? '+' : ''}{d}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="pps-pagination">
            <button className="pps-pagination-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span className="pps-pagination-info">Page {page + 1} of {pages}</span>
            <button className="pps-pagination-btn" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Page body ───────────────────────────────────────────────────────────────
export default function CbpcTeamAnalytics({ league, teamId, season, isCurrentSeason }) {
  const id = Number(teamId);
  const { data, loading, error } = useCbpc(async () => {
    const leaderCalls = [
      ...BAT_LEADERS.map(([stat]) => ['batting', stat]),
      ...PITCH_LEADERS.map(([stat]) => ['pitching', stat]),
    ];
    const [team, standings, battingRows, pitchingRows, regular, post, ...leaderLists] = await Promise.all([
      cbpcService.getTeam(league, id),
      cbpcService.getStandings(league, season, 'R').catch(() => ({ teams: [] })),
      cbpcService.getTeamStats(league, 'batting', season).catch(() => []),
      cbpcService.getTeamStats(league, 'pitching', season).catch(() => []),
      cbpcService.getTeamGames(league, id, season, 'R').catch(() => []),
      league === 'cs' ? Promise.resolve([]) : cbpcService.getTeamGames(league, id, season, 'P').catch(() => []),
      // League top 50 per category; the club's leader is its first row there.
      ...leaderCalls.map(([group, stat]) => cbpcService.getLeaders(league, group, stat, season, 50).catch(() => null)),
    ]);
    const leaders = {};
    leaderCalls.forEach(([group, stat], i) => {
      leaders[`${group}:${stat}`] = leaderLists[i]?.leaders?.find(p => p.team_id === id) || null;
    });
    return { team, standings: standings.teams || [], battingRows, pitchingRows, regular, post, leaders };
  }, [league, id, season]);

  if (loading) return <Loading rows={6} />;
  if (error) return <ErrorState error={error} notFound="This team isn't in this league." />;

  const { team, standings, battingRows, pitchingRows, regular, post, leaders } = data;
  const record = standings.find(t => t.team_id === id) || null;
  const name = team.seasons?.find(s => s.season === season)?.team_name || team.team_name;
  const allGames = [...regular, ...post];

  return (
    <div className="cbpc-team-analytics">
      <div className="team-header-inline cbpc-team-title">
        <TeamLogo src={team.logo_url} abbr={team.team_abbreviation} name={name} size={52} />
        <div>
          <h2 className="cbpc-team-name">{name}</h2>
          <p className="card-subtitle">
            {CBPC_LEAGUES[league].short} · {seasonLabel(season)}
            {league !== 'cs' && [team.team_location, team.venue_name].filter(Boolean).length > 0 && ` · ${[team.team_location, team.venue_name].filter(Boolean).join(' · ')}`}
          </p>
        </div>
      </div>

      <TeamOverviewCards
        record={record ? { wins: record.wins, losses: record.losses, pct: record.w_l_pct } : null}
        runs={record ? { run_differential: record.run_differential, runs_scored: record.runs_scored, runs_allowed: record.runs_allowed } : null}
        streak={record?.streak_code}
        seasonData={record ? {
          home: { wins: record.home_wins, losses: record.home_losses, pct: pct(record.home_wins, record.home_losses) },
          away: { wins: record.away_wins, losses: record.away_losses, pct: pct(record.away_wins, record.away_losses) },
        } : null}
        selectedSeason={seasonLabel(season)}
      />

      <WeeklyChart games={allGames} teamId={id} season={season} />

      <SplitsAndLast10 games={regular} teamId={id} standings={standings} />

      <InfoGrid
        league={league}
        season={season}
        teamId={id}
        record={record}
        leaders={leaders}
        batting={battingRows.find(r => r.team_id === id) || null}
        pitching={pitchingRows.find(r => r.team_id === id) || null}
        battingRows={battingRows}
        pitchingRows={pitchingRows}
        leagueSize={standings.length || battingRows.length}
      />

      {isCurrentSeason && <Roster league={league} teamId={id} season={season} />}

      <GameLog league={league} teamId={id} season={season} regular={regular} post={post} />
    </div>
  );
}
