import { useState } from 'react';
import { Link } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import { CBPC_LEAGUES, seasonLabel, winterPaths } from '../../../data/constants/cbpcConstants';
import { useCbpc } from './winterUi';

/*
  Player Analytics for a winter league (CBPC), laid out like the MLB page and
  using its batter-/pitcher- classes: leader cards, a "hot" card, leaders by split, and a top-10 list. Differences, all from the data:
  - Hot Bats / Hot Arms come from /leaders/{group}/hot (last 7 games for
    hitters, last 5 appearances for pitchers; past seasons show their finish).
  - Splits are vs-hand only (no home/road for these leagues): the top 15
    hitters' (or pitchers') splits, plus two season stats; bars compare with
    the league average computed from team totals.
  - A team filter narrows every card to one club (from the league top 50).
*/

const fmt3 = (v) => (v == null ? '—' : Number(v).toFixed(3).replace(/^0(?=\.)/, ''));
const fmtOps = (v) => (v == null ? '—' : Number(v).toFixed(3));
const fmt2 = (v) => (v == null ? '—' : Number(v).toFixed(2));
const fmt1 = (v) => (v == null ? '—' : Number(v).toFixed(1));
const int = (v) => (v == null ? '—' : Math.round(v));

const CONFIG = {
  batting: {
    prefix: 'batter',
    leaders: [
      ['home_runs', 'Home Runs', 'HR', int],
      ['avg', 'Batting Average', 'AVG', fmt3],
      ['rbis', 'RBI', 'RBI', int],
      ['ops', 'OPS', 'OPS', fmtOps],
      ['stolen_bases', 'Stolen Bases', 'SB', int],
      ['hits', 'Hits', 'H', int],
    ],
    topStat: 'ops',
    topCols: (p) => [`HR ${p.home_runs ?? 0}`, `AVG ${fmt3(p.avg)}`, `OPS ${fmtOps(p.ops)}`],
    hot: [['home_runs', 'HR'], ['hits', 'H'], ['rbis', 'RBI'], ['runs', 'R'], ['stolen_bases', 'SB'], ['walks', 'BB']],
    hotTitle: 'Hot Bats',
    noun: 'batters',
  },
  pitching: {
    prefix: 'pitcher',
    leaders: [
      ['era', 'Earned Run Avg', 'ERA', fmt2],
      ['wins', 'Wins', 'W', int],
      ['strikeouts', 'Strikeouts', 'K', int],
      ['whip', 'Walks+Hits/IP', 'WHIP', fmt2],
      ['saves', 'Saves', 'SV', int],
      ['innings_pitched', 'Innings Pitched', 'IP', fmt1],
    ],
    topStat: 'era',
    topCols: (p) => [`ERA ${fmt2(p.era)}`, `W ${p.wins ?? 0}`, `WHIP ${fmt2(p.whip)}`],
    hot: [['strikeouts', 'K'], ['wins', 'W'], ['innings_pitched', 'IP'], ['quality_starts', 'QS'], ['earned_runs', 'ER'], ['walks', 'BB']],
    hotTitle: 'Hot Arms',
    noun: 'pitchers',
  },
};

// League rate averages from the team totals (every club's season line summed).
function leagueAverages(battingRows, pitchingRows) {
  const sum = (rows, k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const ab = sum(battingRows, 'at_bats');
  const h = sum(battingRows, 'hits');
  const bb = sum(battingRows, 'walks');
  const hbp = sum(battingRows, 'hbp');
  const sf = sum(battingRows, 'sac_flies');
  const tb = sum(battingRows, 'total_bases');
  const obp = ab + bb + hbp + sf > 0 ? (h + bb + hbp) / (ab + bb + hbp + sf) : null;
  const slg = ab > 0 ? tb / ab : null;
  const outs = sum(pitchingRows, 'outs');
  const ip = outs / 3;
  return {
    avg: ab > 0 ? h / ab : null,
    slg,
    ops: obp != null && slg != null ? obp + slg : null,
    whip: ip > 0 ? (sum(pitchingRows, 'hits_allowed') + sum(pitchingRows, 'walks')) / ip : null,
    k9: ip > 0 ? (sum(pitchingRows, 'strikeouts') * 9) / ip : null,
  };
}

// ── Leader cards ────────────────────────────────────────────────────────────
function LeaderCards({ cfg, league, season, leaders, relaxed = {}, teamSelected }) {
  const p = cfg.prefix;
  return (
    <div className={`${p}-leader-grid`}>
      <div className={`${p}-leader-grid-header`}>
        <h3>{teamSelected ? 'Team Leaders' : 'League Leaders'}</h3>
        <p className="eyebrow">{seasonLabel(season)} Season</p>
      </div>
      <div className={`${p}-leader-cards`}>
        {cfg.leaders.map(([stat, category, label, format]) => {
          const pl = leaders[stat];
          const body = (
            <>
              <div className={`${p}-card-top`}>
                <span className={`${p}-category`}>{category}</span>
                <span className={`${p}-stat-label`}>{label}</span>
              </div>
              <div className={`${p}-card-body`}>
                {pl?.headshot_url && (
                  <div className={`${p}-card-photo`}>
                    <img src={pl.headshot_url} alt={pl.player_name} onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                )}
                <span className={`${p}-player`}>{pl?.player_name || 'No qualified player'}</span>
                {!teamSelected && pl?.team_name && <span className={`${p}-team`}>{pl.team_name}</span>}
                <span className={`${p}-value`}>{pl ? format(pl.value) : '—'}</span>
                {pl && relaxed[stat] && (
                  <span
                    className="cbpc-relaxed-note"
                    title={`Nobody on the club reached the full ${cfg.prefix === 'batter' ? 'plate-appearance' : 'innings'} qualifier, so the bar was relaxed.`}
                  >
                    min. {cfg.prefix === 'batter' ? 'PA' : 'IP'} relaxed
                  </span>
                )}
              </div>
            </>
          );
          return pl ? (
            <Link key={stat} to={winterPaths.player(league, pl.player_id, season)} className={`${p}-card ${p}-card-link`} onClick={() => window.scrollTo(0, 0)}>{body}</Link>
          ) : <div key={stat} className={`${p}-card`}>{body}</div>;
        })}
      </div>
    </div>
  );
}

// ── Hot bats / arms: each player's last 7 games / 5 appearances ────────────
// Ranked by the server (/leaders/{group}/hot), the same rules as the MLB hot
// endpoints: most first, except pitching ER and BB (lowest per appearance).
const fmtWindowDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtBarDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' });

function HotCard({ cfg, league, season, group, teamId, teamSelected }) {
  const [metric, setMetric] = useState(cfg.hot[0][0]);
  const { data, loading, error } = useCbpc(
    () => cbpcService.getHotLeaders(league, group, { season, teamId: teamSelected ? teamId : undefined, limit: 5 }),
    [league, group, season, teamSelected, teamId],
  );
  const label = cfg.hot.find(([k]) => k === metric)?.[1];
  const isBat = group === 'batting';
  const prefix = isBat ? 'hot-batter' : 'hot-pitcher';
  const ranked = data?.categories?.[metric] || [];
  const win = data?.window;
  const windowText = win?.as_of_date
    ? `Last ${win.games} ${isBat ? 'games' : 'appearances'} · ${fmtWindowDay(win.from_date)} – ${fmtWindowDay(win.as_of_date)}`
    : `Last ${isBat ? '7 games' : '5 appearances'}`;

  return (
    <div className={`${isBat ? 'hot-bats-card' : 'hot-arms-card'} hot-compact`}>
      <div className={isBat ? 'hot-bats-header' : 'hot-arms-header'}>
        <div>
          <p className="eyebrow">Recent Performance</p>
          <h3>{teamSelected ? `Team ${cfg.hotTitle}` : `${CBPC_LEAGUES[league].short} ${cfg.hotTitle}`}</h3>
          <p className={isBat ? 'hot-bats-subtitle' : 'hot-arms-subtitle'}>{windowText}</p>
        </div>
        <div className={isBat ? 'hot-bats-toggle' : 'hot-arms-toggle'}>
          {cfg.hot.map(([key, text]) => (
            <button key={key} type="button" className={`hot-toggle${metric === key ? ' active' : ''}`} onClick={() => setMetric(key)}>{text}</button>
          ))}
        </div>
      </div>
      <div className={isBat ? 'hot-bats-content' : 'hot-arms-content'}>
        {loading ? (
          <div className={`${cfg.prefix}-loading`}><div className="loading-spinner"></div><span>Loading recent games...</span></div>
        ) : error ? (
          <div className={`${cfg.prefix}-empty`}>Recent performance isn't available right now.</div>
        ) : !win?.as_of_date ? (
          <div className={`${cfg.prefix}-empty`}>No games yet.</div>
        ) : ranked.length === 0 ? (
          <div className={`${cfg.prefix}-empty`}>No qualifying players for {label} in this window.</div>
        ) : (
          <div className={isBat ? 'hot-batters-list' : 'hot-pitchers-list'}>
            {ranked.map((pl) => {
              // The server sends games newest first; chart them oldest to newest.
              const games = [...(pl.games || [])].reverse();
              const max = Math.max(...games.map(g => Number(g.value) || 0), 1);
              return (
                <div key={pl.player_id} className={`${prefix}-item`}>
                  <div className={`${prefix}-header`}>
                    <div className={`${prefix}-rank`}>#{pl.rank}</div>
                    {pl.logo_url && (
                      <div className={`${prefix}-logo`}>
                        <img src={pl.logo_url} alt={pl.team_name} title={pl.team_name} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                      </div>
                    )}
                    <div className={`${prefix}-info`}>
                      <span className={`${prefix}-name`}>
                        <Link to={winterPaths.player(league, pl.player_id, season)} className="player-profile-link" onClick={() => window.scrollTo(0, 0)}>{pl.player_name}</Link>
                      </span>
                      {!teamSelected && <span className={`${prefix}-team`}>{pl.team_name}</span>}
                    </div>
                    <div className={`${prefix}-total`}>
                      <span className="hot-total-number">{pl.total_display ?? pl.total}</span>
                      <span className="hot-total-label">{label}</span>
                    </div>
                  </div>
                  <div className={`${prefix}-chart`}>
                    <div className="chart-bars">
                      {games.map((g) => {
                        const value = Number(g.value) || 0;
                        const shown = g.display ?? g.value;
                        return (
                          <div key={g.game_pk} className="chart-bar-container" title={`${fmtBarDay(g.date)} ${g.home ? 'vs' : '@'} ${g.opponent_abbreviation || '—'} · ${shown} ${label}`}>
                            <div className="chart-bar-wrapper">
                              <span className="chart-bar-value">{shown}</span>
                              <div className="chart-bar" style={{ height: `${Math.max((value / max) * 100, 5)}%`, opacity: value === 0 ? 0.3 : 1 }} />
                            </div>
                            <span className="chart-bar-date">{fmtBarDay(g.date)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leaders by split ────────────────────────────────────────────────────────
function SplitsCard({ cfg, league, season, splits, teamSelected, teamName }) {
  const p = cfg.prefix;
  const short = CBPC_LEAGUES[league].short;
  return (
    <div className={`${p}-splits-card`}>
      <div className={`${p}-splits-header`}>
        <div>
          <h3 className={`${p}-splits-title`}>{teamSelected ? 'Team Leaders by Split' : 'League Leaders by Split'}</h3>
          <p className={`${p}-split-subtitle`}>
            {teamSelected ? `${teamName} top splits vs ${short} average` : `${short} top performers vs league average`}
          </p>
        </div>
      </div>
      <div className={`${p}-splits-main`}>
        {splits.length === 0 ? <div className={`${p}-empty`}>No splits data available.</div> : (
          <div className="split-bars-container">
            {splits.map(s => {
              const max = Math.max(s.value, s.avg ?? 0) * 1.2 || 1;
              const good = s.avg == null ? true : (s.lowerIsBetter ? s.value < s.avg : s.value > s.avg);
              return (
                <div key={s.key} className="split-bar-item">
                  <div className="split-bar-header">
                    <span className="split-bar-label">{s.label}</span>
                    <div className="split-bar-player">
                      {s.logo && <img src={s.logo} alt={s.team} className="split-bar-logo" title={s.team} onError={(e) => { e.target.style.display = 'none'; }} />}
                      <Link to={winterPaths.player(league, s.playerId, season)} className="split-bar-name">{s.player}</Link>
                    </div>
                  </div>
                  <div className="split-bar-chart">
                    <div className="split-bar-track">
                      <div className={`split-bar-fill${good ? ' above-avg' : ' below-avg'}`} style={{ width: `${(s.value / max) * 100}%` }} />
                      {s.avg != null && <div className="split-bar-avg-marker" style={{ left: `${(s.avg / max) * 100}%` }} title={`${s.avgLabel}: ${s.format(s.avg)}`} />}
                    </div>
                    <div className="split-bar-values">
                      <span className="split-bar-value">{s.format(s.value)}</span>
                      {s.avg != null && <span className="split-bar-avg">{s.avgLabel}: {s.format(s.avg)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Top 10 ──────────────────────────────────────────────────────────────────
function TopList({ cfg, league, season, rows, teamSelected }) {
  const p = cfg.prefix;
  return (
    <div className={`${p}-top-card`}>
      <div className={`${p}-top-list-header`}>
        <h2>{seasonLabel(season)} {CBPC_LEAGUES[league].short}</h2>
        <p className="eyebrow">{teamSelected ? `Top ${cfg.noun}` : `Top 10 ${CBPC_LEAGUES[league].short} ${cfg.noun}`}</p>
      </div>
      {rows.length === 0 ? <div className={`${p}-empty`}>No qualified {cfg.noun} yet.</div> : (
        <ol className={`${p}-top-list-items`}>
          {rows.map((pl, idx) => (
            <li key={pl.player_id} className={`${p}-top-list-item`}>
              <div className={`${p}-top-rank`}>#{idx + 1}</div>
              <div className={`${p}-top-info`}>
                <div className={`${p}-top-name`}>
                  <Link to={winterPaths.player(league, pl.player_id, season)} className="player-profile-link" onClick={() => window.scrollTo(0, 0)}>{pl.player_name}</Link>
                </div>
              </div>
              <div className={`${p}-top-stats`}>{cfg.topCols(pl).map(t => <span key={t}>{t}</span>)}</div>
              <div className={`${p}-top-logo`}>
                {pl.logo_url && <img src={pl.logo_url} alt={pl.team_name} title={pl.team_name} loading="lazy" onError={(e) => { e.target.style.visibility = 'hidden'; }} />}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── Club lineup (club selected, batting) ───────────────────────────────────
// The club's 9 regulars (most recent starts), best hitter to worst in the
// server's order; the bench isn't shown.
function LineupList({ cfg, league, season, lineup }) {
  const p = cfg.prefix;
  const batters = (lineup?.batters || []).filter(b => b.role === 'regular');
  const windowGames = lineup?.window?.games;
  const item = (b) => (
    <li key={b.player_id} className={`${p}-top-list-item`}>
      <div className={`${p}-top-rank`}>#{b.rank}</div>
      <div className={`${p}-top-info`}>
        <div className={`${p}-top-name`}>
          <Link to={winterPaths.player(league, b.player_id, season)} className="player-profile-link" onClick={() => window.scrollTo(0, 0)}>{b.player_name}</Link>
        </div>
        <span className={`${p}-top-team`}>
          {[b.position, windowGames ? `${b.starts_window} of last ${windowGames} starts` : null].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div className={`${p}-top-stats`}>{cfg.topCols(b).map(t => <span key={t}>{t}</span>)}</div>
      <div className={`${p}-top-logo`}>
        {lineup.team?.logo_url && <img src={lineup.team.logo_url} alt={lineup.team.team_name} title={lineup.team.team_name} loading="lazy" onError={(e) => { e.target.style.visibility = 'hidden'; }} />}
      </div>
    </li>
  );
  return (
    <div className={`${p}-top-card`}>
      <div className={`${p}-top-list-header`}>
        <h2>{seasonLabel(season)} {CBPC_LEAGUES[league].short}</h2>
        <p className="eyebrow">Lineup</p>
      </div>
      {!lineup ? (
        <div className={`${p}-empty`}>The lineup isn't available right now.</div>
      ) : batters.length === 0 ? (
        <div className={`${p}-empty`}>No games yet.</div>
      ) : (
        <ol className={`${p}-top-list-items`}>{batters.map(item)}</ol>
      )}
    </div>
  );
}

// ── Page body ───────────────────────────────────────────────────────────────
export default function CbpcPlayerAnalytics({ league, season, group, teamId = null, teamName = '' }) {
  const cfg = CONFIG[group];
  const teamSelected = teamId != null;
  const short = CBPC_LEAGUES[league].short;

  const { data, loading } = useCbpc(async () => {
    const statKeys = [...new Set([...cfg.leaders.map(([s]) => s), cfg.topStat, ...(group === 'batting' ? ['slg'] : ['k_per_9'])])];
    // League view: the league top 50 per stat. Club view: the server ranks the
    // club itself (team_id), so ask only for what's shown: the leader, or 15
    // ERA for the pitching top list and split candidates (batting uses the
    // club lineup for both).
    const clubLineup = teamSelected && group === 'batting';
    const limitFor = (stat) => (!teamSelected ? 50 : stat === cfg.topStat && !clubLineup ? 15 : 1);
    const [lists, battingRows, pitchingRows, lineup] = await Promise.all([
      Promise.all(statKeys.map(stat =>
        cbpcService.getLeaders(league, group, stat, season, limitFor(stat), teamSelected ? teamId : undefined).catch(() => null))),
      cbpcService.getTeamStats(league, 'batting', season).catch(() => []),
      cbpcService.getTeamStats(league, 'pitching', season).catch(() => []),
      clubLineup ? cbpcService.getTeamLineup(league, teamId, { season, limit: 9, recentGames: 15 }).catch(() => null) : null,
    ]);
    const byStat = {};
    const relaxed = {};
    statKeys.forEach((stat, i) => {
      byStat[stat] = lists[i]?.leaders || [];
      relaxed[stat] = !!lists[i]?.qualifier?.relaxed;
    });

    // vs-hand split candidates: a club's 9 regulars, otherwise
    // the top 15 by the top-list stat (OPS / ERA).
    const candidates = lineup
      ? lineup.batters.map(b => ({ ...b, team_name: lineup.team?.team_name, logo_url: lineup.team?.logo_url }))
      : byStat[cfg.topStat].slice(0, 15);
    const splitGroup = group === 'batting' ? 'batter' : 'pitcher';
    const splitRows = await Promise.all(candidates.map(c =>
      cbpcService.getPlayerSplits(league, splitGroup, c.player_id, season).then(s => ({ c, s })).catch(() => null)));
    return { byStat, relaxed, lineup, splitRows: splitRows.filter(Boolean), avgs: leagueAverages(battingRows, pitchingRows) };
  }, [league, season, group, teamId]);

  if (loading) {
    return <div className={`${cfg.prefix}-loading`}><div className="loading-spinner"></div><span>Loading {short} {cfg.noun}...</span></div>;
  }
  const { byStat, relaxed, lineup, splitRows, avgs } = data || { byStat: {}, relaxed: {}, lineup: null, splitRows: [], avgs: {} };
  const leaders = Object.fromEntries(cfg.leaders.map(([stat]) => [stat, byStat[stat]?.[0] || null]));
  const top = (byStat[cfg.topStat] || []).slice(0, 10);

  // Best value among the candidates for one split side + key.
  const bestSplit = (side, key, lowerIsBetter) => {
    const vals = splitRows.filter(r => r.s?.[side]?.[key] != null && (r.s[side].plate_appearances ?? r.s[side].batters_faced ?? 0) >= 10);
    if (!vals.length) return null;
    const pick = vals.reduce((a, b) => (lowerIsBetter ? (b.s[side][key] < a.s[side][key] ? b : a) : (b.s[side][key] > a.s[side][key] ? b : a)));
    const avgOfCandidates = vals.reduce((a, r) => a + r.s[side][key], 0) / vals.length;
    return { pick, value: pick.s[side][key], avgOfCandidates };
  };
  const row = (key, label, found, format, avg, avgLabel, lowerIsBetter = false) => found && ({
    key, label, format, avg, avgLabel, lowerIsBetter,
    value: found.value,
    player: found.pick.c.player_name,
    playerId: found.pick.c.player_id,
    team: found.pick.c.team_name,
    logo: found.pick.c.logo_url,
  });
  const seasonRow = (key, label, stat, format, avg, lowerIsBetter = false) => {
    const pl = byStat[stat]?.[0];
    return pl && { key, label, format, avg, avgLabel: `${short}-avg`, lowerIsBetter, value: pl.value, player: pl.player_name, playerId: pl.player_id, team: pl.team_name, logo: pl.logo_url };
  };

  let splits;
  if (group === 'batting') {
    const opsR = bestSplit('vs_rhp', 'ops');
    const opsL = bestSplit('vs_lhp', 'ops');
    const hrR = bestSplit('vs_rhp', 'home_runs');
    const hrL = bestSplit('vs_lhp', 'home_runs');
    splits = [
      row('ops_vs_rhp', 'OPS vs RHP', opsR, fmtOps, avgs.ops, `${short}-avg`),
      row('ops_vs_lhp', 'OPS vs LHP', opsL, fmtOps, avgs.ops, `${short}-avg`),
      row('hr_vs_rhp', 'HR vs RHP', hrR, int, hrR?.avgOfCandidates, 'Top-15 avg'),
      row('hr_vs_lhp', 'HR vs LHP', hrL, int, hrL?.avgOfCandidates, 'Top-15 avg'),
      seasonRow('avg', 'Batting Average', 'avg', fmt3, avgs.avg),
      seasonRow('slg', 'Slugging', 'slg', fmt3, avgs.slg),
    ];
  } else {
    const opsL = bestSplit('vs_lhb', 'ops', true);
    const opsR = bestSplit('vs_rhb', 'ops', true);
    const k9L = bestSplit('vs_lhb', 'k_per_9');
    const k9R = bestSplit('vs_rhb', 'k_per_9');
    splits = [
      row('ops_vs_lhb', 'Opp OPS vs LHB', opsL, fmtOps, avgs.ops, `${short}-avg`, true),
      row('ops_vs_rhb', 'Opp OPS vs RHB', opsR, fmtOps, avgs.ops, `${short}-avg`, true),
      row('k9_vs_lhb', 'K/9 vs LHB', k9L, fmt1, avgs.k9, `${short}-avg`),
      row('k9_vs_rhb', 'K/9 vs RHB', k9R, fmt1, avgs.k9, `${short}-avg`),
      seasonRow('whip', 'WHIP', 'whip', fmt2, avgs.whip, true),
      seasonRow('k_per_9', 'K/9', 'k_per_9', fmt1, avgs.k9),
    ];
  }
  splits = splits.filter(Boolean);

  return (
    <section className={`${cfg.prefix}-stats-section`}>
      <div className={`${cfg.prefix}-header`}>
        <p className="eyebrow">{teamSelected ? 'Team' : short}</p>
        <h2>{teamSelected ? `${teamName} ${group === 'batting' ? 'Batting' : 'Pitching'} Leaders` : `${short} ${group === 'batting' ? 'Batting' : 'Pitching'} Leaders`}</h2>
      </div>
      <LeaderCards cfg={cfg} league={league} season={season} leaders={leaders} relaxed={relaxed} teamSelected={teamSelected} />
      <HotCard cfg={cfg} league={league} season={season} group={group} teamId={teamId} teamSelected={teamSelected} />
      <div className={`${cfg.prefix}-splits-layout`}>
        <SplitsCard cfg={cfg} league={league} season={season} splits={splits} teamSelected={teamSelected} teamName={teamName} />
        {teamSelected && group === 'batting'
          ? <LineupList cfg={cfg} league={league} season={season} lineup={lineup} />
          : <TopList cfg={cfg} league={league} season={season} rows={top} teamSelected={teamSelected} />}
      </div>
    </section>
  );
}
