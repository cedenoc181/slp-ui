import { Link } from 'react-router-dom';
import { logoUrl, headshotUrl, fmt } from '../utils';

export default function PitcherCard({
  abbr, name, spStats, align, mlbId,
  headshotId, nameSlug, teamUrlName, season, statSeason,
}) {
  const isRight    = align === 'right';
  const hsUrl      = headshotUrl(headshotId);
  const teamLink   = teamUrlName ? `/team-analytics/${teamUrlName}` : null;
  const playerLink = nameSlug && name ? `/player/${nameSlug}?season=${season}` : null;

  const logoEl = mlbId && (
    teamLink
      ? <Link to={teamLink} className="pitcher-card-logo-link"><img src={logoUrl(mlbId)} alt={abbr} className="pitcher-card-logo" /></Link>
      : <img src={logoUrl(mlbId)} alt={abbr} className="pitcher-card-logo" />
  );

  const headshot = hsUrl && (
    <img
      src={hsUrl}
      alt={name || abbr}
      className="pitcher-headshot"
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );

  return (
    <div className={`pitcher-card${isRight ? ' right-align' : ''}`}>
      {/* Team logo + abbreviation row */}
      <div className="pitcher-header">
        {!isRight && logoEl}
        <p className="pitcher-team">{abbr}</p>
        {isRight && logoEl}
      </div>

      {/* Headshot + name / stats row */}
      <div className="pitcher-info-row">
        {!isRight && headshot}
        <div className="pitcher-details">
          {playerLink
            ? <Link to={playerLink} className="pitcher-name-lg">{name}</Link>
            : <p className="pitcher-name-lg">{name || 'TBD'}</p>
          }
          {spStats && (spStats.w != null || spStats.wins != null) && (spStats.l != null || spStats.losses != null) && (
            <span className="pitcher-wl-record">{spStats.w ?? spStats.wins}-{spStats.l ?? spStats.losses}</span>
          )}
          {spStats && (
            <div className="pitcher-stats">
              {statSeason && <span className="pitcher-stat-season">{statSeason}</span>}
              {spStats.era  != null && <span>ERA {fmt(spStats.era, 2)}</span>}
              {spStats.whip != null && <span>WHIP {fmt(spStats.whip, 2)}</span>}
              {(spStats.k != null || spStats.strikeouts != null || spStats.so != null) && (
                <span>{spStats.k ?? spStats.strikeouts ?? spStats.so} K</span>
              )}
              {spStats.ip != null && <span>{fmt(spStats.ip, 1)} IP</span>}
            </div>
          )}
        </div>
        {isRight && headshot}
      </div>
    </div>
  );
}
