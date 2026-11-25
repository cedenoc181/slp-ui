import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import { GAME_TYPE_LABELS, isNationsLeague, winterPaths } from '../../../data/constants/cbpcConstants';
import BoxScoreCard from '../Stats/mlb-schedule/components/BoxScoreCard';
import KalshiAdminPanel from './KalshiAdminPanel';
import {
  useWinterMatchup, gameState, WinterHero, WinterPitchers, WinterLineupCard,
  WinterTeamStats, WinterRecentForm, WinterHeadToHead,
} from './WinterMatchup';
import { useCbpc, Loading, ErrorState, Empty, Section } from './winterUi';

/*
  Game detail (/winter/:league/games/:gamePk): the MLB matchup page's layout
  built from CBPC data (sections in WinterMatchup.jsx): hero with records,
  line score, probable / starting pitchers, team stats or this game's lines,
  recent form and this season's head to head, then play-by-play. Live games
  refresh every 2 minutes. No odds, predictions or Scout AI for these leagues.
*/

function PlayByPlay({ league, gamePk, game }) {
  const { data, loading, error } = useCbpc(() => cbpcService.getPlays(league, gamePk), [league, gamePk]);
  const [openInning, setOpenInning] = useState(1);
  if (loading) return <Loading rows={3} />;
  if (error) return <ErrorState error={error} notFound="No play-by-play for this game." />;
  if (!data?.length) return <Empty>No play-by-play for this game.</Empty>;

  const innings = [...new Set(data.map(p => p.inning))];
  const teamName = (teamId) => (teamId === game.home_team_id ? game.home_team_abbr : game.away_team_abbr);
  return (
    <div className="wb-pbp">
      <div className="wb-toggle wb-toggle--wrap" role="group" aria-label="Inning">
        {innings.map(i => (
          <button key={i} type="button" className={openInning === i ? 'active' : ''} onClick={() => setOpenInning(i)}>{i}</button>
        ))}
      </div>
      {['top', 'bottom'].map(half => {
        const plays = data.filter(p => p.inning === openInning && p.half === half);
        if (!plays.length) return null;
        return (
          <div key={half} className="wb-pbp-half">
            <h3 className="wb-day-label">{half === 'top' ? 'Top' : 'Bottom'} {openInning} · {teamName(plays[0].batting_team_id)} batting</h3>
            <ol className="wb-pbp-list">
              {plays.map(p => (
                <li key={p.at_bat_index}>
                  <span className={`wb-pbp-event${p.is_hit || p.is_home_run ? ' wb-pos' : ''}`}>{p.event}</span>
                  <span>
                    <Link to={winterPaths.player(league, p.batter_id)}>{p.batter_name}</Link>
                    <span className="wb-faint"> ({p.bat_side}) vs {p.pitcher_name} ({p.pitch_hand})</span>
                  </span>
                  <span className="wb-faint">{p.rbi ? `${p.rbi} RBI · ` : ''}{p.outs_on_play ? `${p.outs_on_play} out${p.outs_on_play > 1 ? 's' : ''}` : ''}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

export default function GamePage() {
  const { league } = useOutletContext();
  const { gamePk } = useParams();
  const { game, loading, error, derived } = useWinterMatchup(league, gamePk);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} notFound="This game isn't in this league." />;

  const state = gameState(game);
  const final = state === 'final';
  const pre = state === 'pre';
  const awayWon = final && game.winning_team_id === game.away_team_id;
  const homeWon = final && game.winning_team_id === game.home_team_id;
  const stage = isNationsLeague(league)
    ? game.series_description
    : (game.game_type !== 'R' ? (game.series_description || GAME_TYPE_LABELS[game.game_type]) : 'Regular Season');
  const d = derived || {};
  const teamStats = (side) => (
    <WinterTeamStats game={game} side={side} batting={d[`${side}Batting`]} pitching={d[`${side}Pitching`]} />
  );
  // Scheduled: season team stats. Live / final: this game's lines, falling
  // back to team stats until the lines load (they arrive with the box score).
  const teamCard = (side) => (pre ? teamStats(side) : <WinterLineupCard league={league} game={game} side={side} fallback={teamStats(side)} />);
  const hasForm = d.awayForm?.length > 0 || d.homeForm?.length > 0;

  return (
    <div className="matchup-detail-page wb-matchup">
      <Link to={winterPaths.league(league, game.season)} className="wb-back">‹ Back to league</Link>
      <WinterHero league={league} game={game} state={state} awayRecord={d.awayRecord} homeRecord={d.homeRecord} stage={stage} />

      {/* Renders nothing unless the Kalshi flag is on and the viewer is an admin. */}
      <KalshiAdminPanel league={league} gamePk={game.game_pk} />

      {!pre && game.innings?.length > 0 && (
        <BoxScoreCard game={game} boxscore={game} awayAbbr={game.away_team_abbr} homeAbbr={game.home_team_abbr} awayWon={awayWon} homeWon={homeWon} />
      )}

      <div className="detail-grid">
        {(game.away_sp_name || game.home_sp_name) && (
          <WinterPitchers league={league} game={game} state={state} awayLine={derived ? d.awaySpLine : undefined} homeLine={derived ? d.homeSpLine : undefined} />
        )}
        {teamCard('away')}
        {hasForm && <WinterRecentForm league={league} game={game} awayForm={d.awayForm} homeForm={d.homeForm} />}
        {teamCard('home')}
        {d.h2h && <WinterHeadToHead league={league} game={game} h2h={d.h2h} />}
      </div>
      {!derived && <Loading rows={3} />}

      {final && (
        <Section title="Play-by-play">
          <PlayByPlay league={league} gamePk={gamePk} game={game} />
        </Section>
      )}
    </div>
  );
}
