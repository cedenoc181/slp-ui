import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import scheduleService from '../../../../data/services/scheduleService';
import { TEAM_METADATA } from '../../../../data/constants/apiConstants';

function logoUrl(mlbId) {
  return `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
}

function getMlbId(abbr) {
  return TEAM_METADATA[abbr]?.mlbId || null;
}

function StatRow({ label, away, home }) {
  return (
    <div className="matchup-stat-row">
      <span className="stat-value away">{away ?? '—'}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-value home">{home ?? '—'}</span>
    </div>
  );
}

function MatchupDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await scheduleService.getMatchupDetail(gameId);
        setGame(data);
      } catch (err) {
        setError(err?.message || 'Failed to load matchup details.');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [gameId]);

  if (loading) {
    return (
      <div className="matchup-detail-page">
        <div className="container">
          <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          <div className="detail-loading">Loading matchup details…</div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="matchup-detail-page">
        <div className="container">
          <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          <div className="schedule-empty">
            <div className="empty-icon">⚾</div>
            <p className="empty-title">Matchup unavailable</p>
            <p className="empty-subtitle">
              Detailed matchup data isn't available yet. The backend endpoint is coming soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const away = game.away_team;
  const home = game.home_team;
  const pitchers = game.probable_pitchers || {};
  const teamStats = game.team_stats || {};
  const odds = game.odds || null;

  const awayMlbId = away.mlb_id || getMlbId(away.abbr);
  const homeMlbId = home.mlb_id || getMlbId(home.abbr);

  return (
    <div className="matchup-detail-page">
      <div className="container">
        <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>

        {/* Hero: Teams */}
        <div className="detail-hero">
          {/* Away */}
          <div className="detail-team away">
            {awayMlbId && <img src={logoUrl(awayMlbId)} alt={away.name} className="detail-logo" />}
            <h2 className="detail-team-name">{away.name || away.abbr}</h2>
            {away.record && <p className="detail-record">{away.record}</p>}
          </div>

          {/* Game Info */}
          <div className="detail-info">
            <p className="detail-time">{game.game_time_et || 'TBD'}</p>
            <p className="detail-at">@</p>
            <p className="detail-venue">{game.venue || ''}</p>
            {game.tv_broadcast && (
              <p className="detail-tv">📺 {game.tv_broadcast}</p>
            )}
          </div>

          {/* Home */}
          <div className="detail-team home">
            {homeMlbId && <img src={logoUrl(homeMlbId)} alt={home.name} className="detail-logo" />}
            <h2 className="detail-team-name">{home.name || home.abbr}</h2>
            {home.record && <p className="detail-record">{home.record}</p>}
          </div>
        </div>

        <div className="detail-grid">
          {/* Pitching Matchup */}
          {(pitchers.away || pitchers.home) && (
            <div className="detail-card">
              <h3 className="card-title">Probable Pitchers</h3>
              <div className="pitcher-matchup">
                <div className="pitcher-card">
                  <p className="pitcher-team">{away.abbr}</p>
                  <p className="pitcher-name-lg">{pitchers.away?.name || 'TBD'}</p>
                  {pitchers.away?.hand && (
                    <p className="pitcher-hand">{pitchers.away.hand}HP</p>
                  )}
                  <div className="pitcher-stats">
                    {pitchers.away?.era && <span>ERA {pitchers.away.era}</span>}
                    {pitchers.away?.record && <span>{pitchers.away.record}</span>}
                    {pitchers.away?.whip && <span>WHIP {pitchers.away.whip}</span>}
                  </div>
                </div>
                <div className="pitcher-vs">VS</div>
                <div className="pitcher-card">
                  <p className="pitcher-team">{home.abbr}</p>
                  <p className="pitcher-name-lg">{pitchers.home?.name || 'TBD'}</p>
                  {pitchers.home?.hand && (
                    <p className="pitcher-hand">{pitchers.home.hand}HP</p>
                  )}
                  <div className="pitcher-stats">
                    {pitchers.home?.era && <span>ERA {pitchers.home.era}</span>}
                    {pitchers.home?.record && <span>{pitchers.home.record}</span>}
                    {pitchers.home?.whip && <span>WHIP {pitchers.home.whip}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Stats Comparison */}
          {(teamStats.away || teamStats.home) && (
            <div className="detail-card">
              <h3 className="card-title">Season Stats</h3>
              <div className="stat-comparison-header">
                <span>{away.abbr}</span>
                <span></span>
                <span>{home.abbr}</span>
              </div>
              <StatRow label="Runs / Game" away={teamStats.away?.runs_per_game} home={teamStats.home?.runs_per_game} />
              <StatRow label="Team ERA" away={teamStats.away?.era} home={teamStats.home?.era} />
              <StatRow label="Batting Avg" away={teamStats.away?.batting_avg} home={teamStats.home?.batting_avg} />
              <StatRow label="OBP" away={teamStats.away?.obp} home={teamStats.home?.obp} />
              <StatRow label="WHIP" away={teamStats.away?.whip} home={teamStats.home?.whip} />
              {(teamStats.away?.home_record || teamStats.home?.home_record) && (
                <StatRow label="Home/Away Rec" away={teamStats.away?.away_record} home={teamStats.home?.home_record} />
              )}
            </div>
          )}

          {/* Betting Odds */}
          {odds && (
            <div className="detail-card odds-card">
              <h3 className="card-title">Betting Odds</h3>
              <div className="odds-grid">
                <div className="odds-block">
                  <p className="odds-type">Moneyline</p>
                  <div className="odds-values">
                    <span className="odds-team-val">{away.abbr}: <strong>{odds.away_ml || '—'}</strong></span>
                    <span className="odds-team-val">{home.abbr}: <strong>{odds.home_ml || '—'}</strong></span>
                  </div>
                </div>
                {odds.run_line && (
                  <div className="odds-block">
                    <p className="odds-type">Run Line</p>
                    <div className="odds-values">
                      <span className="odds-team-val">{away.abbr} {odds.run_line}: <strong>{odds.run_line_price || '—'}</strong></span>
                    </div>
                  </div>
                )}
                {odds.total && (
                  <div className="odds-block">
                    <p className="odds-type">Over / Under</p>
                    <div className="odds-values">
                      <span className="odds-team-val">O {odds.total}: <strong>{odds.over_price || '—'}</strong></span>
                      <span className="odds-team-val">U {odds.total}: <strong>{odds.under_price || '—'}</strong></span>
                    </div>
                  </div>
                )}
              </div>
              <p className="odds-disclaimer">Odds for informational purposes only. Must be 21+ to wager. Gamble responsibly.</p>
            </div>
          )}

          {/* Head to Head */}
          {game.head_to_head && (
            <div className="detail-card">
              <h3 className="card-title">Head-to-Head ({new Date().getFullYear()})</h3>
              <div className="h2h-stats">
                <StatRow label="Season Record" away={game.head_to_head.away_wins} home={game.head_to_head.home_wins} />
                {game.head_to_head.last_result && (
                  <p className="h2h-last">Last meeting: {game.head_to_head.last_result}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatchupDetail;
