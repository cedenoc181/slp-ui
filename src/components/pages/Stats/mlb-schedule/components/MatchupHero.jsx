import { Link } from 'react-router-dom';
import { logoUrl, fmtDate } from '../utils';

// Format moneyline as "+150" / "-130"
function fmtML(value) {
  if (value == null) return null;
  const num = Math.round(value);
  return num >= 0 ? `+${num}` : String(num);
}

function OddsStrip({ odds, awayAbbr, homeAbbr }) {
  if (!odds) return null;
  const awayML = fmtML(odds.away_moneyline_game);
  const homeML = fmtML(odds.home_moneyline_game);
  const total  = odds.over_under_line_game;

  if (!awayML && !homeML && total == null) return null;

  return (
    <div className="odds-strip">
      {awayML && (
        <span className={`odds-item ${awayML.startsWith('+') ? 'dog' : 'fav'}`}>
          <span className="odds-team">{awayAbbr}</span>
          <span className="odds-line">{awayML}</span>
        </span>
      )}
      {homeML && (
        <span className={`odds-item ${homeML.startsWith('+') ? 'dog' : 'fav'}`}>
          <span className="odds-team">{homeAbbr}</span>
          <span className="odds-line">{homeML}</span>
        </span>
      )}
      {total != null && (
        <span className="odds-item total">
          <span className="odds-team">O/U</span>
          <span className="odds-line">{total}</span>
        </span>
      )}
    </div>
  );
}

function PredictionStrip({ publicFav, scoutFav }) {
  const hasPublic = publicFav?.abbr && publicFav?.pct != null;
  const hasScout  = scoutFav?.abbr  && scoutFav?.pct  != null;
  if (!hasPublic && !hasScout) return null;

  return (
    <div className="prediction-strip">
      {hasPublic && (
        <span className="prediction-item">
          <span className="prediction-label">Public</span>
          <span className="prediction-pick">{publicFav.abbr} {publicFav.pct}%</span>
        </span>
      )}
      {hasPublic && hasScout && <span className="prediction-divider">·</span>}
      {hasScout && (
        <span className="prediction-item">
          <span className="prediction-label scout">⚡ Scout AI</span>
          <span className="prediction-pick scout">{scoutFav.abbr} {scoutFav.pct}%</span>
        </span>
      )}
    </div>
  );
}

export default function MatchupHero({
  game,
  awayMlbId, homeMlbId,
  awayAbbr, homeAbbr,
  awayUrlName, homeUrlName,
  awaySeasonRecord, homeSeasonRecord,
  isFinal, isLive, isScheduled,
  awayWon, homeWon,
  publicFav, scoutFav,
  prediction,
}) {
  const isCompletedEarly = (game.status || '').toLowerCase() === 'completed early';

  const seasonTypeLabel = (() => {
    const st = (game.season_type || '').toLowerCase();
    if (st === 's' || st === 'spring') return 'Spring Training';
    if (st === 'p' || st === 'post' || st === 'postseason') return 'Postseason';
    if (st === 'r' || st === 'regular') return 'Regular Season';
    return null;
  })();

  return (
    <div className={`detail-hero${isFinal ? ' hero-final' : isLive ? ' hero-live' : ''}`}>
      {/* <PredictionStrip publicFav={publicFav} scoutFav={scoutFav} /> */}
      {/* Odds strip (only for scheduled/live games) */}
      {!isFinal && prediction?.odds && (
        <OddsStrip odds={prediction.odds} awayAbbr={awayAbbr} homeAbbr={homeAbbr} />
      )}
      {/* Status strip */}
      <div className="hero-status-strip">
        {isFinal     && <span className="hero-badge badge-final">FINAL</span>}
        {isFinal && isCompletedEarly && <span className="hero-badge-sub">Completed Early</span>}
        {isLive      && <span className="hero-badge badge-live">● LIVE</span>}
        {isScheduled && <span className="hero-badge badge-scheduled">{game.game_time || 'TBD'}</span>}
        {seasonTypeLabel  && <span className="hero-season-type">{seasonTypeLabel}</span>}
        {game.date        && <span className="hero-date">{fmtDate(game.date)}</span>}
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
