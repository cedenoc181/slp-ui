import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import { isNationsLeague, seasonLabel, winterPaths } from '../../../data/constants/cbpcConstants';
import {
  useCbpc, Loading, ErrorState, Empty, Section, TeamLogo, PlayerPhoto, GameGrid,
  fmtRate, fmtNum, orDash,
} from './winterUi';

/*
  Team page (/winter/:league/teams/:teamId?season=). Club names change by
  season, so the header uses the name for the selected season. Rosters are a
  current snapshot; Caribbean Series rosters only appear from late January.
*/

const ROSTER_GROUPS = [
  ['pitchers', 'Pitchers'],
  ['catchers', 'Catchers'],
  ['infielders', 'Infielders'],
  ['outfielders', 'Outfielders'],
];

function Roster({ league, teamId }) {
  const { data, loading, error } = useCbpc(() => cbpcService.getRoster(league, teamId), [league, teamId]);
  if (loading) return <Loading rows={3} />;
  if (error) return <ErrorState error={error} notFound="No roster for this team." />;
  if (!data?.total_players) {
    return <Empty>{isNationsLeague(league) ? 'Rosters not announced yet. Serie del Caribe rosters appear in late January.' : 'No roster on file.'}</Empty>;
  }
  return (
    <>
      {data.snapshot_date && <p className="wb-faint wb-note">As of {new Date(`${data.snapshot_date}T12:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
      <div className="wb-roster">
        {ROSTER_GROUPS.map(([key, label]) => data[key]?.length > 0 && (
          <div key={key} className="wb-roster-group">
            <h3 className="wb-sub-title">{label} <span className="wb-faint">{data[key].length}</span></h3>
            <ul>
              {data[key].map(p => (
                <li key={p.player_id}>
                  <PlayerPhoto src={p.headshot_url} name={p.player_name} size={30} />
                  <span className="wb-roster-name">
                    <Link to={winterPaths.player(league, p.player_id)}>{p.player_name}</Link>
                    <span className="wb-faint">#{orDash(p.jersey_number)} · {p.position_abbreviation} · B/T {p.bats}/{p.throws}{p.status && p.status !== 'Active' ? ` · ${p.status}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

function StatGrid({ items }) {
  return (
    <div className="wb-stat-grid">
      {items.map(([label, value]) => (
        <div key={label} className="wb-stat">
          <span className="wb-stat-value">{value}</span>
          <span className="wb-stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

// The team body, also used inside Team Analytics when the winter tab is on.
export function TeamView({ league, teamId, season, isCurrentSeason, showBack = true }) {
  const id = Number(teamId);
  const [gameType, setGameType] = useState('regular');

  const { data, loading, error } = useCbpc(async () => {
    const [team, standings, batting, pitching, regular, post] = await Promise.all([
      cbpcService.getTeam(league, id),
      cbpcService.getStandings(league, season, 'R').catch(() => ({ teams: [] })),
      cbpcService.getTeamStats(league, 'batting', season).catch(() => []),
      cbpcService.getTeamStats(league, 'pitching', season).catch(() => []),
      cbpcService.getTeamGames(league, id, season, 'R').catch(() => []),
      isNationsLeague(league) ? Promise.resolve([]) : cbpcService.getTeamGames(league, id, season, 'P').catch(() => []),
    ]);
    return {
      team,
      record: standings.teams.find(t => t.team_id === id) ?? null,
      batting: batting.find(t => t.team_id === id) ?? null,
      pitching: pitching.find(t => t.team_id === id) ?? null,
      regular,
      post,
    };
  }, [league, id, season]);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} notFound="This team isn't in this league." />;

  const { team, record, batting, pitching, regular, post } = data;
  const seasonName = team.seasons?.find(s => s.season === season)?.team_name || team.team_name;
  const games = gameType === 'postseason' ? post : regular;

  return (
    <>
      {showBack && <Link to={winterPaths.league(league, season)} className="wb-back">‹ Back to league</Link>}
      <div className="wb-team-hero">
        <TeamLogo src={team.logo_url} abbr={team.team_abbreviation} name={seasonName} size={72} />
        <div>
          <h2 className="wb-team-name">{seasonName}</h2>
          <p className="wb-faint">
            {/* A nation's venue is just that year's Series host, so it's left off. */}
            {isNationsLeague(league) ? 'Serie del Caribe' : [team.team_location, team.venue_name].filter(Boolean).join(' · ')}
            {seasonName !== team.team_name && ` · now ${team.team_name}`}
          </p>
        </div>
        {record && (
          <div className="wb-team-record">
            <span className="wb-team-record-wl">{record.wins}-{record.losses}</span>
            <span className="wb-faint">{seasonLabel(season)} · {record.games_back === '-' ? '1st' : `${record.games_back} GB`}</span>
          </div>
        )}
      </div>

      {record && (
        <Section title="Record">
          <StatGrid items={[
            ['PCT', fmtRate(record.w_l_pct)],
            ['Home', `${record.home_wins}-${record.home_losses}`],
            ['Away', `${record.away_wins}-${record.away_losses}`],
            ['Last 10', `${record.last_ten_wins}-${record.last_ten_losses}`],
            ['Streak', orDash(record.streak_code)],
            ['Run diff', record.run_differential > 0 ? `+${record.run_differential}` : record.run_differential],
          ]} />
        </Section>
      )}

      {(batting || pitching) && (
        <Section title="Team stats" aside="Regular season">
          {batting && (
            <>
              <h3 className="wb-sub-title">Batting</h3>
              <StatGrid items={[
                ['AVG', fmtRate(batting.avg)], ['OBP', fmtRate(batting.obp)], ['SLG', fmtRate(batting.slg)],
                ['OPS', fmtRate(batting.ops)], ['R', batting.runs], ['HR', batting.home_runs], ['SB', batting.stolen_bases],
              ]} />
            </>
          )}
          {pitching && (
            <>
              <h3 className="wb-sub-title">Pitching</h3>
              <StatGrid items={[
                ['ERA', fmtNum(pitching.era)], ['WHIP', fmtNum(pitching.whip)], ['K/9', fmtNum(pitching.k_per_9, 1)],
                ['BB/9', fmtNum(pitching.bb_per_9, 1)], ['SV', pitching.saves], ['IP', pitching.innings_display],
              ]} />
            </>
          )}
        </Section>
      )}

      {isCurrentSeason && (
        <Section title="Roster">
          <Roster league={league} teamId={id} />
        </Section>
      )}

      <Section
        title="Games"
        aside={post.length > 0 && (
          <span className="wb-toggle" role="group" aria-label="Season type">
            <button type="button" className={gameType === 'regular' ? 'active' : ''} onClick={() => setGameType('regular')}>Regular season</button>
            <button type="button" className={gameType === 'postseason' ? 'active' : ''} onClick={() => setGameType('postseason')}>Postseason</button>
          </span>
        )}
      >
        {games.length ? <GameGrid league={league} games={games} showDate /> : <Empty>No completed games for {seasonLabel(season)}.</Empty>}
      </Section>
    </>
  );
}

export default function TeamPage() {
  const { league, season, isCurrentSeason } = useOutletContext();
  const { teamId } = useParams();
  return <TeamView league={league} teamId={teamId} season={season} isCurrentSeason={isCurrentSeason} />;
}
