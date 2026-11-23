import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import teamsService from '../../../../data/services/teamsService';
import { TEAM_METADATA } from '../../../../data/constants/apiConstants';
import '../../../../styles/league-tabs.css';
import '../../../../styles/winter-page-styling/winter.css';

/*
  MLB standings in the same layout as the winter-league standings: a tab per
  division (regular season) or per spring league (Spring Training), a season
  picker and a season-type picker in one bar, and one full-width table. The
  postseason keeps its bracket (MLBStandingsPostseason), so it has no tabs.
*/

export const DIVISION_TABS = [
  { key: 'AL East', tip: 'American League East' },
  { key: 'AL Central', tip: 'American League Central' },
  { key: 'AL West', tip: 'American League West' },
  { key: 'NL East', tip: 'National League East' },
  { key: 'NL Central', tip: 'National League Central' },
  { key: 'NL West', tip: 'National League West' },
];

export const SPRING_TABS = [
  { key: 'Cactus', tip: 'Cactus League · Arizona', label: 'Cactus League' },
  { key: 'Grapefruit', tip: 'Grapefruit League · Florida', label: 'Grapefruit League' },
];

const SEASON_TYPES = [
  { key: 'regular', label: 'Regular Season' },
  { key: 'postseason', label: 'Playoffs' },
  { key: 'spring', label: 'Spring Training' },
];

// The API sends "false" (a string) when nothing is clinched; only these show.
const CLINCH = { z: 'Clinched best record in league', y: 'Clinched division', x: 'Clinched playoff berth', w: 'Clinched wild card', e: 'Eliminated' };

const fmtPct = (v) => (v == null ? '—' : Number(v).toFixed(3).replace(/^0(?=\.)/, ''));
const fmtGb = (v) => (v == null || v === '-' || Number(v) === 0 ? '—' : v);
const signed = (v) => (v > 0 ? `+${v}` : v);
const tone = (v) => (v > 0 ? 'wb-pos' : v < 0 ? 'wb-neg' : '');
const streakTone = (s) => (String(s).startsWith('W') ? 'wb-pos' : String(s).startsWith('L') ? 'wb-neg' : '');

function TeamCell({ abbr, mlbId, name, clinch, season }) {
  const meta = TEAM_METADATA[abbr];
  const to = meta?.urlName ? `/team-analytics/${meta.urlName}${season ? `?season=${season}` : ''}` : '/team-analytics';
  return (
    <td className="wb-td-team">
      <Link to={to}>
        <img className="wb-logo" src={`https://www.mlbstatic.com/team-logos/${mlbId}.svg`} alt="" width={22} height={22} />
        <span>{meta?.name || name}</span>
        {CLINCH[clinch] && <span className="wb-clinch" title={CLINCH[clinch]}>{clinch}</span>}
      </Link>
    </td>
  );
}

export function MlbStandingsBar({ seasonType, onSeasonTypeChange, season, onSeasonChange, seasons, tabs, tab, onTabChange }) {
  return (
    <div className="wb-embed-bar">
      {tabs && (
        <nav className="league-tabs" aria-label={seasonType === 'spring' ? 'Spring league' : 'Division'}>
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              className={`league-tab${tab === t.key ? ' active' : ''}`}
              aria-pressed={tab === t.key}
              data-tip={t.tip}
              onClick={() => onTabChange(t.key)}
            >
              {t.label || t.key}
            </button>
          ))}
        </nav>
      )}
      <select className="wb-season-select" aria-label="Season" value={season} onChange={(e) => onSeasonChange(e.target.value)}>
        {[...seasons].sort((a, b) => Number(b) - Number(a)).map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="wb-season-select" aria-label="Season type" value={seasonType} onChange={(e) => onSeasonTypeChange(e.target.value)}>
        {SEASON_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>
    </div>
  );
}

function TableSection({ title, aside, children }) {
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

// Regular season: one division, rows from the /teams/standings response.
export function MlbDivisionTable({ division, rows, season }) {
  const tip = DIVISION_TABS.find(d => d.key === division)?.tip || division;
  const sorted = [...(rows || [])].sort((a, b) => a.division_rank - b.division_rank);
  return (
    <TableSection title={tip} aside={`Regular season · ${season}`}>
      {sorted.length === 0 ? <div className="wb-empty">No standings for {division} in {season}.</div> : (
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th className="wb-th-left">Team</th>
                <th>W</th><th>L</th><th>PCT</th><th>GB</th><th>WCGB</th>
                <th>L10</th><th>Strk</th><th>RS</th><th>RA</th><th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => (
                <tr key={t.team_id}>
                  <TeamCell abbr={t.team_abbreviation} mlbId={t.mlb_team_id} name={t.team_name} clinch={t.clinch_indicator} season={season} />
                  <td>{t.wins}</td>
                  <td>{t.losses}</td>
                  <td>{fmtPct(t.w_l_pct)}</td>
                  <td>{fmtGb(t.games_back)}</td>
                  <td>{fmtGb(t.wc_games_back)}</td>
                  <td>{t.last_ten_wins}-{t.last_ten_losses}</td>
                  <td className={streakTone(t.streak_code)}>{t.streak_code || '—'}</td>
                  <td>{t.runs_scored}</td>
                  <td>{t.runs_allowed}</td>
                  <td className={tone(t.run_differential)}>{signed(t.run_differential)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TableSection>
  );
}

// Spring Training: one spring league (Cactus or Grapefruit), fetched here.
export function MlbSpringStandings({ season, league }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    teamsService.getTeamSpringTrainingStandings(season)
      .then(d => { if (alive) setData(d || {}); })
      .catch(e => { if (alive) setError(e); });
    return () => { alive = false; };
  }, [season]);

  const tab = SPRING_TABS.find(t => t.key === league) || SPRING_TABS[0];
  const rows = [...(data?.[tab.label] || [])].sort((a, b) => (a.spring_league_rank ?? 99) - (b.spring_league_rank ?? 99));
  // The spring endpoint sends spring_league_games_back as null, so games back
  // is computed from the league leader (ties don't count).
  const leader = rows[0];
  const springGb = (t) => {
    if (t.spring_league_games_back != null) return fmtGb(t.spring_league_games_back);
    if (!leader || t === leader) return '—';
    const gb = ((leader.spring_league_wins - t.spring_league_wins) + (t.spring_league_losses - leader.spring_league_losses)) / 2;
    return gb <= 0 ? '—' : gb;
  };

  return (
    <TableSection title={tab.label} aside={`Spring Training · ${season}`}>
      {error ? <div className="wb-empty wb-empty--error">Couldn&apos;t load spring standings right now.</div>
        : data === null ? <div className="wb-loading">{[0, 1, 2, 3, 4].map(i => <div key={i} className="wb-skeleton" />)}</div>
        : rows.length === 0 ? <div className="wb-empty">No spring standings for {season} yet.</div>
        : (
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  <th className="wb-th-left">Team</th>
                  <th>W</th><th>L</th><th>T</th><th>PCT</th><th>GB</th>
                  <th>Home</th><th>Away</th><th>L10</th><th>Strk</th><th>RS</th><th>RA</th><th>Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.team_id}>
                    <TeamCell abbr={t.team_abbreviation} mlbId={t.mlb_team_id} name={t.team_name} season={season} />
                    <td>{t.spring_league_wins}</td>
                    <td>{t.spring_league_losses}</td>
                    <td>{t.spring_league_ties ?? 0}</td>
                    <td>{fmtPct(t.spring_league_pct)}</td>
                    <td>{springGb(t)}</td>
                    <td>{t.spring_league_home_wins}-{t.spring_league_home_losses}</td>
                    <td>{t.spring_league_away_wins}-{t.spring_league_away_losses}</td>
                    <td>{t.spring_league_last_ten_wins}-{t.spring_league_last_ten_losses}</td>
                    <td className={streakTone(t.spring_league_streak_code)}>{t.spring_league_streak_code || '—'}</td>
                    <td>{t.spring_league_runs_scored}</td>
                    <td>{t.spring_league_runs_allowed}</td>
                    <td className={tone(t.spring_league_run_differential)}>{signed(t.spring_league_run_differential)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </TableSection>
  );
}

// ── Wild card + power rankings (same styling as the division table) ────────
// Fed by the page's existing currentLeagueData.wildCard, leaguePowerRankings
// and powerRankings, so the data and "last week" movement are unchanged.
const WC_SPOTS = 3;

// The page pre-formats wcgb as "-N" for any non-zero gap, but for the teams
// holding a spot the API's gap is games AHEAD of the cutoff (San Diego at
// 91-71 is +3 on the third spot at 88-74). Spots read "+N", the rest "-N".
function wcGap(wcgb) {
  const n = Math.abs(parseFloat(wcgb));
  return Number.isNaN(n) ? null : n;
}
const wcText = (wcgb, i) => {
  const n = wcGap(wcgb);
  if (n == null) return '—';
  return i < WC_SPOTS ? `+${n}` : (n === 0 ? '0' : `-${n}`);
};
const wcTone = (wcgb, i) => {
  const n = wcGap(wcgb);
  if (n == null) return '';
  return i < WC_SPOTS ? 'wb-pos' : (n === 0 ? '' : 'wb-neg');
};

function Movement({ current, last }) {
  const delta = (last ?? current) - current;
  if (!delta) return <span className="wb-move wb-move--flat" title="No change since last week">—</span>;
  return delta > 0
    ? <span className="wb-move wb-pos" title={`Up ${delta} since last week`}>▲{delta}</span>
    : <span className="wb-move wb-neg" title={`Down ${-delta} since last week`}>▼{-delta}</span>;
}

export function MlbWildCardTable({ league, rows, season }) {
  return (
    <TableSection title={`${league} Wild Card`} aside={`Top ${WC_SPOTS} make the playoffs`}>
      {!rows?.length ? <div className="wb-empty">No wild card race yet.</div> : (
        <div className="wb-table-scroll">
          <table className="wb-table wb-table--wc">
            <thead>
              <tr><th className="wb-th-left">#</th><th className="wb-th-left">Team</th><th>W</th><th>L</th><th>PCT</th><th>WCGB</th><th>L10</th><th>Strk</th></tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={t.mlbTeamId} className={`${i < WC_SPOTS ? 'wb-row-in' : ''}${i === WC_SPOTS - 1 ? ' wb-row-cut' : ''}`}>
                  <td className="wb-td-left wb-faint">{t.rank}</td>
                  <TeamCell abbr={t.teamAbbreviation} mlbId={t.mlbTeamId} name={t.team} clinch={t.clinchIndicator} season={season} />
                  <td>{t.wins}</td>
                  <td>{t.losses}</td>
                  <td>{fmtPct(t.pct)}</td>
                  <td className={wcTone(t.wcgb, i)}>{wcText(t.wcgb, i)}</td>
                  <td>{t.last10}</td>
                  <td className={streakTone(t.streak)}>{t.streak || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TableSection>
  );
}

export function MlbLeaguePowerList({ league, rows, season }) {
  return (
    <TableSection title={`${league} Power Rankings`} aside="Top 5 · vs last week">
      {!rows?.length ? <div className="wb-empty">No rankings yet.</div> : (
        <ol className="wb-leaders">
          {rows.map(t => {
            const meta = TEAM_METADATA[t.teamAbbreviation];
            return (
              <li key={t.mlbTeamId}>
                <span className="wb-leader-rank">{t.leagueRank}</span>
                <img className="wb-logo" src={`https://www.mlbstatic.com/team-logos/${t.mlbTeamId}.svg`} alt="" width={26} height={26} />
                <span className="wb-leader-name">
                  <Link to={meta?.urlName ? `/team-analytics/${meta.urlName}?season=${season}` : '/team-analytics'}>{meta?.name || t.team}</Link>
                  <span className="wb-faint">{t.record} · {signed(t.runDifferential)} run diff</span>
                </span>
                <Movement current={t.leagueRank} last={t.lastWeek} />
              </li>
            );
          })}
        </ol>
      )}
    </TableSection>
  );
}

export function MlbPowerTable({ rows, season }) {
  return (
    <TableSection title="MLB Power Rankings" aside="Top 10 · movement since last week">
      {!rows?.length ? <div className="wb-empty">No rankings yet.</div> : (
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr><th className="wb-th-left">#</th><th className="wb-th-left">Team</th><th>League</th><th>Record</th><th>Last wk</th><th>Move</th><th>Diff</th></tr>
            </thead>
            <tbody>
              {rows.map(t => (
                <tr key={t.mlbTeamId}>
                  <td className="wb-td-left wb-faint">{t.rank}</td>
                  <TeamCell abbr={t.teamAbbreviation} mlbId={t.mlbTeamId} name={t.team} season={season} />
                  <td><span className={`wb-league-tag wb-league-tag--${t.league.toLowerCase()}`}>{t.league}</span></td>
                  <td>{t.record}</td>
                  <td className="wb-faint">#{t.lastWeek}</td>
                  <td><Movement current={t.rank} last={t.lastWeek} /></td>
                  <td className={tone(t.runDifferential)}>{signed(t.runDifferential)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TableSection>
  );
}
