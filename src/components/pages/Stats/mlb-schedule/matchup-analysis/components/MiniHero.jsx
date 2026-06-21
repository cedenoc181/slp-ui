import { Link } from 'react-router-dom';
import { getMlbId, getAbbr, getUrlName, logoUrl, fmtDate } from '../../utils';

export default function MiniHero({ game }) {
  const awayMlbId   = getMlbId(game.away_team_id);
  const homeMlbId   = getMlbId(game.home_team_id);
  const awayAbbr    = getAbbr(game.away_team_id) || game.away_team_name;
  const homeAbbr    = getAbbr(game.home_team_id) || game.home_team_name;
  const awayUrlName = getUrlName(game.away_team_id);
  const homeUrlName = getUrlName(game.home_team_id);

  const statusLower = (game.status || '').toLowerCase();
  const isFinal  = statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed' || statusLower === 'completed early';
  const isLive   = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');
  const badgeClass = isFinal ? 'final' : isLive ? 'live' : 'scheduled';
  const badgeLabel = isFinal ? 'Final' : isLive ? '● Live' : 'Scheduled';

  const dateLabel = fmtDate(game.date);
  const timeLabel = game.game_time ? ` · ${game.game_time}` : '';

  const awayScore = game.away_runs_score ?? null;
  const homeScore = game.home_runs_score ?? null;
  const hasScore  = awayScore != null && homeScore != null && (isFinal || isLive);

  return (
    <div className="analysis-mini-hero">
      <div className="hero-teams-row">
        <div className="hero-team-block">
          {awayMlbId && (
            awayUrlName
              ? <Link to={`/team-analytics/${awayUrlName}`}><img src={logoUrl(awayMlbId)} alt={awayAbbr} className="hero-team-logo" /></Link>
              : <img src={logoUrl(awayMlbId)} alt={awayAbbr} className="hero-team-logo" />
          )}
          <span className="hero-team-abbr">{awayAbbr}</span>
          <span className="hero-team-record">Away</span>
        </div>

        <div className="hero-separator">
          {hasScore ? (
            <span className="hero-score">
              <span className={awayScore > homeScore ? 'hero-score-winner' : ''}>{awayScore}</span>
              <span className="hero-score-dash">–</span>
              <span className={homeScore > awayScore ? 'hero-score-winner' : ''}>{homeScore}</span>
            </span>
          ) : (
            <span className="hero-at-sign">@</span>
          )}
        </div>

        <div className="hero-team-block home-block">
          {homeMlbId && (
            homeUrlName
              ? <Link to={`/team-analytics/${homeUrlName}`}><img src={logoUrl(homeMlbId)} alt={homeAbbr} className="hero-team-logo" /></Link>
              : <img src={logoUrl(homeMlbId)} alt={homeAbbr} className="hero-team-logo" />
          )}
          <span className="hero-team-abbr">{homeAbbr}</span>
          <span className="hero-team-record">Home</span>
        </div>
      </div>

      <div className="hero-game-meta">
        <span className="hero-date-label">{dateLabel}{timeLabel}</span>
        <span className={`hero-status-badge ${badgeClass}`}>{badgeLabel}</span>
      </div>
    </div>
  );
}
