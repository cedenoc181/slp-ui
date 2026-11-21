import { useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import { CBPC_LEAGUES, seasonLabel, winterPaths } from '../../../data/constants/cbpcConstants';
import {
  useCbpc, Loading, ErrorState, Empty, Section, TeamLogo, PlayerPhoto, fmtRate, fmtNum, orDash,
} from './winterUi';

/*
  Player page (/winter/:league/players/:playerId). Every winter player gets
  one for now; a has_mlb_profile flag may later route some to their MLB page.
  Stats are this league only, one row per season x team x regular/postseason,
  never combined. Other competitions (his club league, the Caribbean Series)
  are links to the same player under that league's path.
*/

const BAT_COLS = [
  ['G', r => r.games], ['PA', r => r.plate_appearances], ['AVG', r => fmtRate(r.avg)], ['OBP', r => fmtRate(r.obp)],
  ['SLG', r => fmtRate(r.slg)], ['OPS', r => fmtRate(r.ops)], ['H', r => r.hits], ['2B', r => r.doubles],
  ['HR', r => r.home_runs], ['RBI', r => r.rbis], ['BB', r => r.walks], ['SO', r => r.strikeouts], ['SB', r => r.stolen_bases],
];
const PITCH_COLS = [
  ['G', r => r.games], ['GS', r => r.games_started], ['W-L', r => `${r.wins}-${r.losses}`], ['SV', r => r.saves],
  ['IP', r => r.innings_display], ['ERA', r => fmtNum(r.era)], ['WHIP', r => fmtNum(r.whip)],
  ['K/9', r => fmtNum(r.k_per_9, 1)], ['BB/9', r => fmtNum(r.bb_per_9, 1)], ['SO', r => r.strikeouts], ['HR', r => r.home_runs_allowed],
];
const BAT_GAME_COLS = [
  ['AB', g => g.at_bats], ['R', g => g.runs], ['H', g => g.hits], ['HR', g => g.home_runs], ['RBI', g => g.rbis],
  ['BB', g => g.walks], ['SO', g => g.strikeouts], ['SB', g => g.stolen_bases],
];
const PITCH_GAME_COLS = [
  ['IP', g => g.innings_display], ['H', g => g.hits_allowed], ['R', g => g.runs], ['ER', g => g.earned_runs],
  ['BB', g => g.walks], ['SO', g => g.strikeouts], ['HR', g => g.home_runs_allowed], ['PC', g => orDash(g.pitches_thrown)],
];
const BAT_SPLIT_COLS = [
  ['PA', s => s.plate_appearances], ['AVG', s => fmtRate(s.avg)], ['OBP', s => fmtRate(s.obp)], ['SLG', s => fmtRate(s.slg)],
  ['OPS', s => fmtRate(s.ops)], ['HR', s => s.home_runs], ['BB', s => s.walks], ['SO', s => s.strikeouts],
];
const PITCH_SPLIT_COLS = [
  ['BF', s => s.batters_faced], ['AVG', s => fmtRate(s.avg)], ['OBP', s => fmtRate(s.obp)], ['SLG', s => fmtRate(s.slg)],
  ['OPS', s => fmtRate(s.ops)], ['WHIP', s => fmtNum(s.whip)], ['K/9', s => fmtNum(s.k_per_9, 1)], ['HR', s => s.home_runs],
];

function SeasonStats({ league, playerId, group }) {
  const { data, loading, error } = useCbpc(() => cbpcService.getPlayerSeasonStats(league, group, playerId), [league, group, playerId]);
  const cols = group === 'batter' ? BAT_COLS : PITCH_COLS;
  if (loading) return <Loading rows={2} />;
  if (error) return <ErrorState error={error} notFound="No season stats in this league." />;
  if (!data?.length) return <Empty>No season stats in this league.</Empty>;
  const rows = [...data].sort((a, b) => b.season - a.season || (a.season_type === 'regular' ? -1 : 1));
  return (
    <div className="wb-table-scroll">
      <table className="wb-table">
        <thead><tr><th className="wb-th-left">Season</th><th className="wb-th-left">Team</th>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={`${r.season}-${r.team_id}-${r.season_type}`}>
              <td className="wb-td-left">{seasonLabel(r.season)}{r.season_type === 'postseason' && <span className="wb-faint"> post</span>}</td>
              <td className="wb-td-team">
                <Link to={winterPaths.team(league, r.team_id, r.season)}>
                  <TeamLogo src={r.logo_url} abbr={r.team_abbreviation} name={r.team_name} size={20} />
                  <span>{r.team_abbreviation}</span>
                </Link>
              </td>
              {cols.map(([h, f]) => <td key={h}>{f(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GameLog({ league, playerId, group, season }) {
  const [type, setType] = useState('R');
  const { data, loading, error } = useCbpc(
    () => cbpcService.getPlayerGames(league, group, playerId, season, type),
    [league, group, playerId, season, type],
  );
  const cols = group === 'batter' ? BAT_GAME_COLS : PITCH_GAME_COLS;
  const games = data?.games ?? [];
  return (
    <Section
      title="Game log"
      aside={(
        <span className="wb-toggle" role="group" aria-label="Season type">
          <button type="button" className={type === 'R' ? 'active' : ''} onClick={() => setType('R')}>Regular</button>
          <button type="button" className={type === 'P' ? 'active' : ''} onClick={() => setType('P')}>Postseason</button>
        </span>
      )}
    >
      {loading ? <Loading rows={3} /> : error ? <ErrorState error={error} /> : !games.length ? (
        <Empty>No {type === 'P' ? 'postseason' : 'regular-season'} games in {seasonLabel(season)}.</Empty>
      ) : (
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead><tr><th className="wb-th-left">Date</th><th className="wb-th-left">Opp</th><th className="wb-th-left">Result</th>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {games.map(g => {
                const won = g.team_score > g.opponent_score;
                return (
                  <tr key={g.game_pk}>
                    <td className="wb-td-left">{new Date(`${g.date}T12:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td>
                    <td className="wb-td-left">{g.is_home ? 'vs' : '@'} {g.opponent}</td>
                    <td className="wb-td-left">
                      <Link to={winterPaths.game(league, g.game_pk, g.season)} className={won ? 'wb-pos' : 'wb-neg'}>
                        {won ? 'W' : 'L'} {g.team_score}-{g.opponent_score}
                      </Link>
                    </td>
                    {cols.map(([h, f]) => <td key={h}>{f(g)}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function Splits({ league, playerId, group, season }) {
  const [career, setCareer] = useState(false);
  const { data, loading, error } = useCbpc(
    () => cbpcService.getPlayerSplits(league, group, playerId, career ? undefined : season),
    [league, group, playerId, season, career],
  );
  const cols = group === 'batter' ? BAT_SPLIT_COLS : PITCH_SPLIT_COLS;
  const sides = group === 'batter' ? [['vs_lhp', 'vs LHP'], ['vs_rhp', 'vs RHP']] : [['vs_lhb', 'vs LHB'], ['vs_rhb', 'vs RHB']];
  return (
    <Section
      title="Splits vs. handedness"
      aside={(
        <span className="wb-toggle" role="group" aria-label="Range">
          <button type="button" className={!career ? 'active' : ''} onClick={() => setCareer(false)}>{seasonLabel(season)}</button>
          <button type="button" className={career ? 'active' : ''} onClick={() => setCareer(true)}>Career</button>
        </span>
      )}
    >
      {loading ? <Loading rows={2} /> : error ? <ErrorState error={error} notFound="No splits for this player." /> : (
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead><tr><th className="wb-th-left">Split</th>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {sides.map(([key, label]) => (
                <tr key={key}>
                  <td className="wb-td-left">{label}</td>
                  {data?.[key] ? cols.map(([h, f]) => <td key={h}>{f(data[key])}</td>) : <td colSpan={cols.length} className="wb-faint">No plate appearances</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

export default function PlayerPage() {
  const { league } = useOutletContext();
  const { playerId } = useParams();
  const [searchParams] = useSearchParams();
  const { data: p, loading, error } = useCbpc(() => cbpcService.getPlayerInfo(league, playerId), [league, playerId]);
  const [groupChoice, setGroupChoice] = useState(null);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} notFound={`This player hasn't appeared in ${CBPC_LEAGUES[league].short}.`} />;

  const code = CBPC_LEAGUES[league].code;
  const leagueSeasons = (p.competitions || []).filter(c => c.leagues.includes(code)).map(c => c.season).sort((a, b) => b - a);
  const asked = Number(searchParams.get('season'));
  const season = leagueSeasons.includes(asked) ? asked : leagueSeasons[0];
  const groups = [p.is_batter && 'batter', p.is_pitcher && 'pitcher'].filter(Boolean);
  const group = groups.includes(groupChoice) ? groupChoice : groups[0];

  return (
    <>
      <div className="wb-player-hero">
        <PlayerPhoto src={p.headshot_url} name={p.full_name} size={96} />
        <div className="wb-player-bio">
          <h2 className="wb-team-name">{p.full_name}</h2>
          <p className="wb-faint">
            {[p.position_abbreviation, p.bats && p.throws && `B/T ${p.bats}/${p.throws}`, p.height, p.weight && `${p.weight} lb`].filter(Boolean).join(' · ')}
          </p>
          <p className="wb-faint">
            {[p.birth_date && `Born ${new Date(`${p.birth_date}T12:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`, p.birth_country].filter(Boolean).join(' · ')}
          </p>
          <p className="wb-player-team">
            {p.current_team
              ? (
                <Link to={winterPaths.team(p.current_team.league?.toLowerCase() || league, p.current_team.team_id)} className="wb-player-team-link">
                  <TeamLogo src={p.current_team.logo_url} abbr={p.current_team.team_abbreviation} name={p.current_team.team_name} size={20} />
                  {p.current_team.team_name}
                </Link>
              )
              : <span className="wb-faint">Not on a roster this winter</span>}
            <span className="wb-faint"> · {p.mlb_parent_org_name ? `${p.mlb_parent_org_name} organization` : 'No MLB organization'}</span>
          </p>
        </div>
      </div>

      {p.competitions?.length > 0 && (
        <Section title="Competitions">
          <ul className="wb-competitions">
            {[...p.competitions].sort((a, b) => b.season - a.season).map(c => (
              <li key={c.season}>
                <span className="wb-faint">{seasonLabel(c.season)}</span>
                {c.leagues.map(code => {
                  const slug = code.toLowerCase();
                  if (!CBPC_LEAGUES[slug]) return null;
                  const current = slug === league && c.season === season;
                  return current
                    ? <span key={code} className="wb-chip wb-chip--active">{CBPC_LEAGUES[slug].short}</span>
                    : <Link key={code} className="wb-chip" to={winterPaths.player(slug, p.player_id, c.season)}>{CBPC_LEAGUES[slug].short}</Link>;
                })}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {groups.length > 1 && (
        <span className="wb-toggle wb-toggle--block" role="group" aria-label="Stat group">
          {groups.map(g => (
            <button key={g} type="button" className={group === g ? 'active' : ''} onClick={() => setGroupChoice(g)}>
              {g === 'batter' ? 'Batting' : 'Pitching'}
            </button>
          ))}
        </span>
      )}

      {group ? (
        <>
          <Section title={`${CBPC_LEAGUES[league].short} season stats`}>
            <SeasonStats league={league} playerId={p.player_id} group={group} />
          </Section>
          {season && <GameLog league={league} playerId={p.player_id} group={group} season={season} />}
          {season && <Splits league={league} playerId={p.player_id} group={group} season={season} />}
        </>
      ) : <Empty>No stats in this league.</Empty>}
    </>
  );
}
