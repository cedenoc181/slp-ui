import { useCallback, useEffect, useMemo, useState } from 'react';
import cbpcService from '../../../data/services/cbpcService';
import { isNationsLeague, isWinterOffseason, seasonLabel } from '../../../data/constants/cbpcConstants';
import { useWinterSelection, WinterPicker, WinterEmbed } from './WinterEmbed';
import { CurrentGames, Standings, PostseasonResults, SeriesNations } from './LeagueHome';
import { TeamView } from './TeamPage';
import { WinterSearch } from './WinterLayout';
import WinterLeadersBoard from './WinterLeadersBoard';
import { useCbpc, Loading, ErrorState, Empty } from './winterUi';

/*
  What Schedule, Standings, Team Analytics and Player Analytics show when their
  "Serie del Caribe" league tab (the umbrella for all winter leagues) is on.
  Each view has its own winter league + season picker; links lead into the
  /winter detail pages for games, teams and players.
*/

export function WinterScheduleView() {
  const sel = useWinterSelection();
  const { league, season, isCurrentSeason } = sel;
  const live = isCurrentSeason && !isWinterOffseason();
  return (
    <WinterEmbed sel={sel}>
      <WinterPicker sel={sel} />
      {isNationsLeague(league) ? (
        <>
          {live && <CurrentGames league="cs" hideEmpty />}
          <SeriesNations season={season} part="games" />
        </>
      ) : live ? (
        <CurrentGames league={league} />
      ) : (
        <>
          <PostseasonResults league={league} season={season} />
          <Empty>Regular-season results for {seasonLabel(season)} are in each club's game log in Team Analytics.</Empty>
        </>
      )}
    </WinterEmbed>
  );
}

export function WinterStandingsView() {
  const sel = useWinterSelection();
  const { league, season, isCurrentSeason } = sel;
  return (
    <WinterEmbed sel={sel}>
      <WinterPicker sel={sel} />
      {isNationsLeague(league) ? (
        <SeriesNations season={season} part="standings" />
      ) : (
        <>
          <Standings league={league} season={season} />
          {(!isCurrentSeason || isWinterOffseason()) && <PostseasonResults league={league} season={season} />}
        </>
      )}
    </WinterEmbed>
  );
}

function TeamPicker({ league, season, value, onChange }) {
  const { data, loading, error } = useCbpc(() => cbpcService.getTeams(league, season), [league, season]);
  const teams = useMemo(() => (data ? [...data].sort((a, b) => a.team_name.localeCompare(b.team_name)) : []), [data]);

  // Keep a valid team selected as the league or season changes.
  useEffect(() => {
    if (teams.length && !teams.some(t => t.id === value)) onChange(teams[0].id);
  }, [teams, value, onChange]);

  if (loading || error || !teams.length) return null;
  return (
    <select className="wb-season-select wb-team-select" aria-label="Team" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
      {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
    </select>
  );
}

export function WinterTeamView() {
  const sel = useWinterSelection();
  const { league, season, isCurrentSeason } = sel;
  // The pick remembers its league, so switching leagues never loads the old
  // team id under the new league (which would 404) before the picker resets.
  const [pick, setPick] = useState({ league: null, id: null });
  const teamId = pick.league === league ? pick.id : null;
  const setTeamId = useCallback((id) => setPick({ league, id }), [league]);
  return (
    <WinterEmbed sel={sel}>
      <WinterPicker sel={sel}>
        {season && <TeamPicker league={league} season={season} value={teamId} onChange={setTeamId} />}
      </WinterPicker>
      {teamId
        ? <TeamView key={`${league}-${teamId}`} league={league} teamId={teamId} season={season} isCurrentSeason={isCurrentSeason} showBack={false} />
        : <Loading rows={4} />}
    </WinterEmbed>
  );
}

export function WinterPlayersView({ group }) {
  const sel = useWinterSelection();
  return (
    <WinterEmbed sel={sel}>
      <WinterPicker sel={sel}>
        <WinterSearch />
      </WinterPicker>
      {sel.season ? <WinterLeadersBoard league={sel.league} season={sel.season} group={group} /> : <ErrorState />}
    </WinterEmbed>
  );
}
