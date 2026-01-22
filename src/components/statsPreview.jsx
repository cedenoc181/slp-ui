import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import teamLeadersService from '../data/services/teamLeadersService';
import '../styles/home-page-styling/stats-preview.css';

function StatsPreview() {
  const [battingLeaders, setBattingLeaders] = useState([]);
  const [pitchingLeaders, setPitchingLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentSeason = '2025';

  useEffect(() => {
    const fetchLeaders = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch league-wide leaders
        const [battingData, pitchingData] = await Promise.all([
          teamLeadersService.getTopBattingLeaders(currentSeason, 'R'),
          teamLeadersService.getTopPitchingLeaders(currentSeason, 'R'),
        ]);

        setBattingLeaders(Array.isArray(battingData) ? battingData.slice(0, 10) : []);
        setPitchingLeaders(Array.isArray(pitchingData) ? pitchingData.slice(0, 10) : []);
      } catch (err) {
        console.error('Error fetching leaders:', err);
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, [currentSeason]);

  // Format helpers
  const formatAvg = (value) => {
    if (value === null || value === undefined) return '.000';
    if (typeof value === 'number') {
      return value.toFixed(3).replace(/^0/, '');
    }
    return String(value);
  };

  const formatEra = (value) => {
    if (value === null || value === undefined) return '0.00';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  const formatOps = (value) => {
    if (value === null || value === undefined) return '.000';
    if (typeof value === 'number') {
      return value.toFixed(3);
    }
    return String(value);
  };

  const formatWhip = (value) => {
    if (value === null || value === undefined) return '0.00';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  // Build batting leader display data - Top 4 sorted by OPS with HR, AVG, OPS
  const getBattingLeaderStats = () => {
    if (!battingLeaders || battingLeaders.length === 0) return [];

    // Sort by OPS (best overall offensive metric) and take top 4
    return [...battingLeaders]
      .filter(b => b.ops && b.ops > 0)
      .sort((a, b) => (b.ops || 0) - (a.ops || 0))
      .slice(0, 4)
      .map(batter => ({
        player: batter.player_name,
        team: batter.team_name || batter.team,
        hr: batter.home_runs || 0,
        avg: formatAvg(batter.avg),
        ops: formatOps(batter.ops),
      }));
  };

  // Build pitching leader display data - Top 4 sorted by ERA
  const getPitchingLeaderStats = () => {
    if (!pitchingLeaders || pitchingLeaders.length === 0) return [];

    // Sort by ERA (lower is better) and take top 4
    return [...pitchingLeaders]
      .filter(p => p.era && p.era > 0)
      .sort((a, b) => (a.era || 99) - (b.era || 99))
      .slice(0, 4)
      .map(pitcher => ({
        player: pitcher.player_name,
        team: pitcher.team_name || pitcher.team,
        era: formatEra(pitcher.era),
        wins: pitcher.wins || 0,
        whip: formatWhip(pitcher.whip),
      }));
  };

  const battingStats = getBattingLeaderStats();
  const pitchingStats = getPitchingLeaderStats();

  return (
    <section className="stats-preview">
      <div className="container">
        {/* Section Header */}
        <div className="stats-preview-header">
          <div className="header-content">
            <span className="section-badge">
              <span className="badge-icon">📊</span>
              LIVE STATS
            </span>
            <h2>League Leaders at a Glance</h2>
            <p>Real-time MLB statistics updated daily from our analytics engine</p>
          </div>
          <Link to="/team-analytics" className="view-all-link">
            View Full Stats
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="stats-preview-loading">
            <div className="loading-spinner"></div>
            <span>Loading league leaders...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="stats-preview-error">
            <span>⚠️ {error}</span>
            <Link to="/player-analytics" className="error-link">View stats page →</Link>
          </div>
        )}

        {/* Stats Cards Grid */}
        {!loading && !error && (
          <div className="stats-preview-grid">
            {/* Batting Leaders Card */}
            <div className="preview-card batting-card">
              <div className="card-header">
                <h3>Batting Leaders</h3>
                <span className="card-badge">{currentSeason}</span>
              </div>
              <div className="leaders-list">
                {battingStats.length > 0 ? (
                  battingStats.map((batter, idx) => (
                    <div key={idx} className="leader-row">
                      <div className="leader-rank">#{idx + 1}</div>
                      <div className="leader-info">
                        <span className="leader-name">{batter.player}</span>
                        <span className="leader-team">{batter.team}</span>
                      </div>
                      <div className="leader-stats-group">
                        <div className="mini-stat">
                          <span className="mini-value">{batter.hr}</span>
                          <span className="mini-label">HR</span>
                        </div>
                        <div className="mini-stat">
                          <span className="mini-value">{batter.avg}</span>
                          <span className="mini-label">AVG</span>
                        </div>
                        <div className="mini-stat">
                          <span className="mini-value">{batter.ops}</span>
                          <span className="mini-label">OPS</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">No batting data available</div>
                )}
              </div>
              <Link to="/player-analytics" className="card-link">
                See all batting stats →
              </Link>
            </div>

            {/* Pitching Leaders Card */}
            <div className="preview-card pitching-card">
              <div className="card-header">
                <h3>Pitching Leaders</h3>
                <span className="card-badge">{currentSeason}</span>
              </div>
              <div className="leaders-list">
                {pitchingStats.length > 0 ? (
                  pitchingStats.map((pitcher, idx) => (
                    <div key={idx} className="leader-row">
                      <div className="leader-rank">#{idx + 1}</div>
                      <div className="leader-info">
                        <span className="leader-name">{pitcher.player}</span>
                        <span className="leader-team">{pitcher.team}</span>
                      </div>
                      <div className="leader-stats-group">
                        <div className="mini-stat">
                          <span className="mini-value">{pitcher.era}</span>
                          <span className="mini-label">ERA</span>
                        </div>
                        <div className="mini-stat">
                          <span className="mini-value">{pitcher.wins}</span>
                          <span className="mini-label">W</span>
                        </div>
                        <div className="mini-stat">
                          <span className="mini-value">{pitcher.whip}</span>
                          <span className="mini-label">WHIP</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">No pitching data available</div>
                )}
              </div>
              <Link to="/team-analytics" className="card-link">
                See all pitching stats →
              </Link>
            </div>

            {/* Quick Stats Card */}
            <div className="preview-card quick-stats-card">
              <div className="card-header">
                <h3>Platform Stats</h3>
                <span className="card-badge live">
                  <span className="live-dot"></span>
                  LIVE
                </span>
              </div>
              <div className="quick-stats-grid">
                <div className="quick-stat-item">
                  <span className="quick-stat-value">30</span>
                  <span className="quick-stat-label">Teams</span>
                </div>
                <div className="quick-stat-item">
                  <span className="quick-stat-value">750+</span>
                  <span className="quick-stat-label">Players</span>
                </div>
                <div className="quick-stat-item">
                  <span className="quick-stat-value">50+</span>
                  <span className="quick-stat-label">Metrics</span>
                </div>
                <div className="quick-stat-item">
                  <span className="quick-stat-value">10+</span>
                  <span className="quick-stat-label">Seasons</span>
                </div>
              </div>
              <div className="data-freshness">
                <span className="freshness-icon">🔄</span>
                <span>Data updated daily</span>
              </div>
            </div>
          </div>
        )}

        {/* CTA Banner */}
        <div className="stats-preview-cta">
          <div className="cta-content">
            <h3>Dive Deeper into the Numbers</h3>
            <p>Explore comprehensive batting and pitching statistics, team analytics, splits, and more.</p>
          </div>
          <Link to="/player-analytics" className="cta-button">
            Explore Full Stats Page
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default StatsPreview;