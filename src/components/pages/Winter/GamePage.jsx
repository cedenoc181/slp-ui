import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import { GAME_TYPE_LABELS, isNationsLeague, winterPaths } from '../../../data/constants/cbpcConstants';
import BoxScoreCard from '../Stats/mlb-schedule/components/BoxScoreCard';
import KalshiAdminPanel from './KalshiAdminPanel';
import { useCbpc, Loading, ErrorState, Empty, Section, TeamLogo, isFinal, fmtDay, fmtTime, orDash } from './winterUi';

/*
  Game detail (/winter/:league/games/:gamePk): header, line score (the MLB
  BoxScoreCard, which reads the same innings[] shape), batting and pitching
  lines for both teams, and play-by-play. No probable pitchers, odds or team
  LOB for these leagues, so none are shown.
*/

function BattingTable({ league, rows }) {
  if (!rows?.length) return <Empty>No batting lines.</Empty>;
  return (
    <div className="wb-table-scroll">
      <table className="wb-table">
        <thead>
          <tr><th className="wb-th-left">Batter</th><th>AB</th><th>R</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>RBI</th><th>BB</th><th>SO</th><th>SB</th></tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.player_id} className={p.is_starter ? '' : 'wb-row-sub'}>
              <td className="wb-td-player">
                <Link to={winterPaths.player(league, p.player_id)}>{p.player_name}</Link>
                <span className="wb-faint"> {p.position}</span>
              </td>
              <td>{p.at_bats}</td><td>{p.runs}</td><td>{p.hits}</td><td>{p.doubles}</td><td>{p.triples}</td>
              <td>{p.home_runs}</td><td>{p.rbis}</td><td>{p.walks}</td><td>{p.strikeouts}</td><td>{p.stolen_bases}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function decision(p) {
  if (p.win) return 'W';
  if (p.loss) return 'L';
  if (p.save) return 'SV';
  if (p.hold) return 'H';
  if (p.blown_save) return 'BS';
  return '';
}

function PitchingTable({ league, rows }) {
  if (!rows?.length) return <Empty>No pitching lines.</Empty>;
  return (
    <div className="wb-table-scroll">
      <table className="wb-table">
        <thead>
          <tr><th className="wb-th-left">Pitcher</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>SO</th><th>HR</th><th>PC</th></tr>
        </thead>
        <tbody>
          {[...rows].sort((a, b) => (a.appearance_order ?? 0) - (b.appearance_order ?? 0)).map(p => (
            <tr key={p.player_id}>
              <td className="wb-td-player">
                <Link to={winterPaths.player(league, p.player_id)}>{p.player_name}</Link>
                {decision(p) && <span className="wb-decision"> {decision(p)}</span>}
              </td>
              <td>{p.innings_display}</td><td>{p.hits_allowed}</td><td>{p.runs}</td><td>{p.earned_runs}</td>
              <td>{p.walks}</td><td>{p.strikeouts}</td><td>{p.home_runs_allowed}</td><td>{orDash(p.pitches_thrown)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const { data: game, loading, error } = useCbpc(() => cbpcService.getBoxscore(league, gamePk), [league, gamePk]);
  const [side, setSide] = useState('away');

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} notFound="This game isn't in this league." />;

  const final = isFinal(game);
  const awayWon = final && game.winning_team_id === game.away_team_id;
  const homeWon = final && game.winning_team_id === game.home_team_id;
  const stage = isNationsLeague(league)
    ? game.series_description
    : (game.game_type !== 'R' ? (game.series_description || GAME_TYPE_LABELS[game.game_type]) : 'Regular Season');
  const sideName = side === 'away' ? game.away_team_name : game.home_team_name;

  return (
    <>
      <Link to={winterPaths.league(league, game.season)} className="wb-back">‹ Back to league</Link>
      <div className="wb-game-hero">
        <div className="wb-game-hero-meta">
          <span>{stage}</span>
          <span>{fmtDay(game, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {fmtTime(game)}</span>
          {game.venue_name && <span>{game.venue_name}</span>}
        </div>
        <div className="wb-game-hero-teams">
          {[['away', awayWon], ['home', homeWon]].map(([s, won]) => (
            <Link key={s} to={winterPaths.team(league, game[`${s}_team_id`], game.season)} className={`wb-hero-team${won ? ' wb-hero-team--won' : ''}`}>
              <TeamLogo src={game[`${s}_team_logo_url`]} abbr={game[`${s}_team_abbr`]} name={game[`${s}_team_name`]} size={56} />
              <span className="wb-hero-team-name">{game[`${s}_team_name`]}</span>
              <span className="wb-hero-score">{final ? game[`${s}_runs_score`] : ''}</span>
            </Link>
          ))}
        </div>
        <div className="wb-hero-status">
          {final ? 'Final' : game.status === 'Scheduled' ? 'Scheduled' : game.status}
          {!final && game.status === 'In Progress' && <span className="wb-faint"> · statuses update once a day</span>}
        </div>
      </div>

      {/* Renders nothing unless the Kalshi flag is on and the viewer is an admin. */}
      <KalshiAdminPanel league={league} gamePk={game.game_pk} />

      {final && game.innings?.length > 0 && (
        <Section title="Line score">
          <BoxScoreCard game={game} boxscore={game} awayAbbr={game.away_team_abbr} homeAbbr={game.home_team_abbr} awayWon={awayWon} homeWon={homeWon} />
        </Section>
      )}

      {final ? (
        <>
          <Section
            title="Box score"
            aside={(
              <span className="wb-toggle" role="group" aria-label="Team">
                <button type="button" className={side === 'away' ? 'active' : ''} onClick={() => setSide('away')}>{game.away_team_abbr}</button>
                <button type="button" className={side === 'home' ? 'active' : ''} onClick={() => setSide('home')}>{game.home_team_abbr}</button>
              </span>
            )}
          >
            <h3 className="wb-sub-title">{sideName} batting</h3>
            <BattingTable league={league} rows={game.batting?.[side]} />
            <h3 className="wb-sub-title">{sideName} pitching</h3>
            <PitchingTable league={league} rows={game.pitching?.[side]} />
          </Section>
          <Section title="Play-by-play">
            <PlayByPlay league={league} gamePk={gamePk} game={game} />
          </Section>
        </>
      ) : (
        <Empty>The box score and play-by-play appear once the game is final.</Empty>
      )}
    </>
  );
}
