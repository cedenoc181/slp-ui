import { Link } from 'react-router-dom';
import { logoUrl, fmtDate } from '../utils';

export default function MatchupHero({
  game,
  awayMlbId, homeMlbId,
  awayAbbr, homeAbbr,
  awayUrlName, homeUrlName,
  awaySeasonRecord, homeSeasonRecord,
  isFinal, isLive, isScheduled,
  awayWon, homeWon,
}) {
  return (
    <div className={`detail-hero${isFinal ? ' hero-final' : isLive ? ' hero-live' : ''}`}>
      {/* Status strip */}
      <div className="hero-status-strip">
        {isFinal     && <span className="hero-badge badge-final">FINAL</span>}
        {isLive      && <span className="hero-badge badge-live">● LIVE</span>}
        {isScheduled && <span className="hero-badge badge-scheduled">{game.game_time || 'TBD'}</span>}
        {game.date   && <span className="hero-date">{fmtDate(game.date)}</span>}
      </div>

      {/* Teams row */}
      <div className="hero-matchup">
        {/* Away */}
        <div className="hero-team away-team">
          {awayMlbId && (
            awayUrlName
              ? <Link to={`/team-analytics/${awayUrlName}`}><img src={logoUrl(awayMlbId)} alt={game.away_team_name} className="hero-logo" /></Link>
              : <img src={logoUrl(awayMlbId)} alt={game.away_team_name} className="hero-logo" />
          )}
          <div className="hero-team-info">
            <span className="hero-team-name">{game.away_team_name}</span>
            {awaySeasonRecord && <span className="hero-record">{awaySeasonRecord}</span>}
            {isFinal && (
              <span className={`hero-score${awayWon ? ' score-win' : ' score-loss'}`}>
                {game.away_runs_score}
              </span>
            )}
          </div>
        </div>

        {/* Center */}
        <div className="hero-center">
          {isFinal || isLive
            ? <span className="hero-dash">—</span>
            : <span className="hero-vs">VS</span>
          }
          {game.venue        && <span className="hero-venue">{game.venue}</span>}
          {game.tv_broadcast && <span className="hero-tv">📺 {game.tv_broadcast}</span>}
        </div>

        {/* Home */}
        <div className="hero-team home-team">
          <div className="hero-team-info home-info">
            <span className="hero-team-name">{game.home_team_name}</span>
            {homeSeasonRecord && <span className="hero-record">{homeSeasonRecord}</span>}
            {isFinal && (
              <span className={`hero-score${homeWon ? ' score-win' : ' score-loss'}`}>
                {game.home_runs_score}
              </span>
            )}
          </div>
          {homeMlbId && (
            homeUrlName
              ? <Link to={`/team-analytics/${homeUrlName}`}><img src={logoUrl(homeMlbId)} alt={game.home_team_name} className="hero-logo" /></Link>
              : <img src={logoUrl(homeMlbId)} alt={game.home_team_name} className="hero-logo" />
          )}
        </div>
      </div>
    </div>
  );
}
