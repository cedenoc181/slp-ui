import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import { isNationsLeague, isWinterOffseason, seasonLabel, winterPaths } from '../../../data/constants/cbpcConstants';
import {
  useCbpc, Loading, ErrorState, Empty, Section, GameGrid, StandingsTable, LeadersList,
  TeamLogo, qualifierText, fmtRate, fmtNum, localDayKey, fmtDay, byStart,
} from './winterUi';

/*
  League home (/winter/:league). Current season: today's and upcoming games,
  latest results, standings, round robin, leaders. Past seasons: standings,
  postseason results and leaders. The Caribbean Series (/winter/cs) is laid
  out around nations instead of clubs.
*/

const STATUS_NOTE = 'Game statuses update once a day.';

// Merges per-team game lists into one deduped list, newest first.
function mergeGames(lists) {
  const byPk = new Map();
  lists.flat().forEach(g => byPk.set(g.game_pk, g));
  return [...byPk.values()].sort((a, b) => byStart(b, a));
}

function groupBy(list, key) {
  const out = new Map();
  list.forEach(item => {
    const k = key(item);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(item);
  });
  return [...out.entries()];
}

// ── Current-season games ────────────────────────────────────────────────────
export function CurrentGames({ league, hideEmpty = false }) {
  const { data, loading, error } = useCbpc(() => Promise.all([
    cbpcService.getTodayGames(league),
    cbpcService.getUpcomingGames(league, 7),
    cbpcService.getPriorGames(league, 3),
  ]), [league]);

  if (loading) return <Loading rows={3} />;
  if (error) return <ErrorState error={error} />;
  const [today, upcoming, prior] = data;
  if (hideEmpty && !today.length && !upcoming.length && !prior.length) return null;

  // Doubleheaders: same teams, same date, Game 1 then Game 2 (byStart).
  const upcomingByDay = groupBy([...upcoming].sort(byStart), localDayKey);
  return (
    <>
      <Section title="Today" aside={today.length ? STATUS_NOTE : null}>
        {today.length ? <GameGrid league={league} games={[...today].sort(byStart)} /> : <Empty>No games today.</Empty>}
      </Section>
      <Section title="Upcoming" aside="Next 7 days · your time zone">
        {upcoming.length
          ? upcomingByDay.map(([day, games]) => (
              <div key={day} className="wb-day">
                <h3 className="wb-day-label">{fmtDay(games[0], { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                <GameGrid league={league} games={games} />
              </div>
            ))
          : <Empty>No games scheduled in the next 7 days.</Empty>}
      </Section>
      <Section title="Latest results" aside="Last 3 days">
        {prior.length
          ? <GameGrid league={league} games={[...prior].sort((a, b) => byStart(b, a))} showDate />
          : <Empty>No completed games in the last 3 days.</Empty>}
      </Section>
    </>
  );
}

// ── Standings (regular + round robin) ───────────────────────────────────────
export function Standings({ league, season }) {
  const [tab, setTab] = useState('R');
  const { data, loading, error } = useCbpc(() => Promise.all([
    cbpcService.getStandings(league, season, 'R'),
    cbpcService.getStandings(league, season, 'L').catch(() => null),
  ]), [league, season]);

  if (loading) return <Section title="Standings"><Loading rows={4} /></Section>;
  if (error) return <Section title="Standings"><ErrorState error={error} /></Section>;
  const [regular, roundRobin] = data;
  const hasRR = roundRobin?.teams?.length > 0;
  const rows = tab === 'L' && hasRR ? roundRobin.teams : regular.teams;

  return (
    <Section
      title="Standings"
      aside={hasRR && (
        <span className="wb-toggle" role="group" aria-label="Standings table">
          <button type="button" className={tab === 'R' ? 'active' : ''} onClick={() => setTab('R')}>Regular season</button>
          <button type="button" className={tab === 'L' ? 'active' : ''} onClick={() => setTab('L')}>Round Robin</button>
        </span>
      )}
    >
      {rows.length ? <StandingsTable league={league} rows={rows} season={season} /> : <Empty>No standings yet for {seasonLabel(season)}.</Empty>}
    </Section>
  );
}

// ── Postseason results for a past season ────────────────────────────────────
export function PostseasonResults({ league, season }) {
  const { data, loading, error } = useCbpc(async () => {
    const rr = await cbpcService.getStandings(league, season, 'L').catch(() => null);
    const teamIds = rr?.teams?.map(t => t.team_id) ?? [];
    if (!teamIds.length) return [];
    const lists = await Promise.all(teamIds.map(id => cbpcService.getTeamGames(league, id, season, 'P').catch(() => [])));
    return mergeGames(lists);
  }, [league, season]);

  if (loading) return <Section title="Postseason"><Loading rows={2} /></Section>;
  if (error || !data?.length) return null;

  // Champion: the team with the most wins in the final (game_type W).
  const finalWins = {};
  data.filter(g => g.game_type === 'W' && g.winning_team_id != null).forEach(g => {
    finalWins[g.winning_team_id] = (finalWins[g.winning_team_id] || 0) + 1;
  });
  const champId = Object.entries(finalWins).sort((a, b) => b[1] - a[1])[0]?.[0];
  const champGame = champId && data.find(g => String(g.home_team_id) === champId || String(g.away_team_id) === champId);
  const champ = champGame && (String(champGame.home_team_id) === champId
    ? { name: champGame.home_team_name, abbr: champGame.home_team_abbr, logo: champGame.home_team_logo_url }
    : { name: champGame.away_team_name, abbr: champGame.away_team_abbr, logo: champGame.away_team_logo_url });

  return (
    <Section title="Postseason">
      {champ && (
        <div className="wb-champion">
          <TeamLogo src={champ.logo} abbr={champ.abbr} name={champ.name} size={36} />
          <span><span className="wb-faint">{seasonLabel(season)} champion</span><strong>{champ.name}</strong></span>
        </div>
      )}
      {groupBy(data, g => g.series_description || g.postseason_round || 'Postseason').map(([series, games]) => (
        <div key={series} className="wb-day">
          <h3 className="wb-day-label">{series}</h3>
          <GameGrid league={league} games={games} showDate />
        </div>
      ))}
    </Section>
  );
}

// ── Leaders ─────────────────────────────────────────────────────────────────
export function Leaders({ league, season }) {
  const { data, loading, error } = useCbpc(() => Promise.all([
    cbpcService.getLeaders(league, 'batting', 'ops', season, 5),
    cbpcService.getLeaders(league, 'pitching', 'era', season, 5),
  ]), [league, season]);

  if (loading) return <Section title="Leaders"><Loading rows={3} /></Section>;
  if (error) return <Section title="Leaders"><ErrorState error={error} /></Section>;
  const [bat, pitch] = data;
  return (
    <Section title="Leaders" aside="Regular season">
      <div className="wb-two-col">
        <div>
          <h3 className="wb-sub-title">OPS <span className="wb-faint">{qualifierText(bat.qualifier)}</span></h3>
          <LeadersList league={league} season={season} data={bat} format={v => fmtRate(v)} />
        </div>
        <div>
          <h3 className="wb-sub-title">ERA <span className="wb-faint">{qualifierText(pitch.qualifier)}</span></h3>
          <LeadersList league={league} season={season} data={pitch} format={v => fmtNum(v)} />
        </div>
      </div>
    </Section>
  );
}

// ── Caribbean Series ────────────────────────────────────────────────────────
// part: 'all' | 'standings' (nations + table) | 'games'
export function SeriesNations({ season, part = 'all' }) {
  const { data, loading, error } = useCbpc(async () => {
    const [teams, standings] = await Promise.all([
      cbpcService.getTeams('cs', season),
      cbpcService.getStandings('cs', season, 'R').catch(() => ({ teams: [] })),
    ]);
    const lists = await Promise.all(teams.map(t => cbpcService.getTeamGames('cs', t.id, season).catch(() => [])));
    return { teams, standings: standings.teams, games: mergeGames(lists) };
  }, [season]);

  const recordById = useMemo(() => {
    const m = new Map();
    (data?.standings || []).forEach(r => m.set(r.team_id, r));
    return m;
  }, [data]);

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} />;
  const { teams, standings, games } = data;

  const showStandings = part !== 'games';
  const showGames = part !== 'standings';
  return (
    <>
      {showStandings && <Section title="Nations" aside={`${teams.length} teams`}>
        {teams.length ? (
          <div className="wb-nations">
            {teams.map(t => {
              const r = recordById.get(t.id);
              return (
                <Link key={t.id} to={winterPaths.team('cs', t.id, season)} className="wb-nation">
                  <TeamLogo src={t.logo_url} abbr={t.team_abbreviation} name={t.team_name} size={44} />
                  <span className="wb-nation-name">{t.team_name}</span>
                  <span className="wb-faint">{r ? `${r.wins}-${r.losses}` : 'Roster & games'}</span>
                </Link>
              );
            })}
          </div>
        ) : <Empty>Nations are set once the winter leagues crown their champions.</Empty>}
      </Section>}
      {showStandings && <Section title="Standings">
        {standings.length ? <StandingsTable league="cs" rows={standings} season={season} compact /> : <Empty>No games played yet.</Empty>}
      </Section>}
      {showGames && <Section title="Games" aside="Your time zone">
        {games.length ? <GameGrid league="cs" games={games} showDate /> : <Empty>No completed games yet.</Empty>}
      </Section>}
    </>
  );
}

export default function LeagueHome() {
  const { league, leagueInfo, season, isCurrentSeason } = useOutletContext();
  const nations = isNationsLeague(league);
  const offseason = isCurrentSeason && isWinterOffseason();

  return (
    <>
      {offseason && (
        <div className="wb-banner">
          Winter ball is in its off-season. These are the final numbers for {seasonLabel(leagueInfo.current_season)};
          the next season starts in October.
        </div>
      )}
      {/* October–January only: in February the Series itself is on. */}
      {nations && isCurrentSeason && !isWinterOffseason() && new Date().getMonth() !== 1 && (
        <div className="wb-banner">
          The next Serie del Caribe is played in February, between the champions of the winter leagues and invited
          nations. Below is the {seasonLabel(season)} Series.
        </div>
      )}

      {nations ? (
        <>
          <CurrentGames league="cs" hideEmpty />
          <SeriesNations season={season} />
        </>
      ) : (
        <>
          {isCurrentSeason && !offseason && <CurrentGames league={league} />}
          <Standings league={league} season={season} />
          {(!isCurrentSeason || offseason) && <PostseasonResults league={league} season={season} />}
          <Leaders league={league} season={season} />
        </>
      )}
    </>
  );
}
