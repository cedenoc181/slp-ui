import { Link } from 'react-router-dom';
import gamePropIcon   from '../assets/icons/game-prop.png';
import batterPropIcon from '../assets/icons/batter-prop.png';
import pitcherPropIcon from '../assets/icons/pitcher-prop.png';
import analysisIcon   from '../assets/icons/analysis.png';
import '../styles/home-page-styling/predictions-teaser.css';

function PredictionsTeaser() {
  const mockPredictions = [
    {
      player: 'Freddie Freeman',
      team: 'LAD',
      stat: 'Hits',
      line: '1.5',
      prediction: 'OVER',
      confidence: 74,
      projection: '1.9 H',
    },
    {
      player: 'Aaron Judge',
      team: 'NYY',
      stat: 'Total Bases',
      line: '1.5',
      prediction: 'OVER',
      confidence: 71,
      projection: '2.4 TB',
    },
    {
      player: 'Tarik Skubal',
      team: 'DET',
      stat: 'Strikeouts',
      line: '6.5',
      prediction: 'OVER',
      confidence: 77,
      projection: '7.4 K',
    },
  ];

  return (
    <section className="predictions-teaser">
      <div className="container">
        {/* Section Header */}
        <div className="teaser-header">
          <span className="coming-soon-badge">
            <span className="badge-icon">⚡</span>
            NOW LIVE — 2026 SEASON
          </span>
          <h2>AI-Powered Game &amp; Player Predictions</h2>
          <p>
            Daily picks for game outcomes, batter props, and pitcher props — backed by our
            machine learning model and Scout AI scouting reports. Available every game day.
          </p>
        </div>

        {/* Preview Cards */}
        <div className="predictions-preview">
          <div className="preview-header">
            <span className="preview-date">Today's Sample Picks</span>
            <span className="preview-badge">Model v2.0</span>
          </div>

          <div className="preview-grid">
            {mockPredictions.map((pred, idx) => (
              <div key={idx} className="prediction-card">
                <div className="prediction-header">
                  <div className="player-info">
                    <span className="player-name">{pred.player}</span>
                    <span className="player-team">{pred.team}</span>
                  </div>
                  <div className={`prediction-direction ${pred.prediction.toLowerCase()}`}>
                    {pred.prediction}
                  </div>
                </div>

                <div className="prediction-details">
                  <div className="stat-line">
                    <span className="stat-name">{pred.stat}</span>
                    <span className="stat-value">{pred.line}</span>
                  </div>

                  <div className="projection-row">
                    <span className="projection-label">Projected</span>
                    <span className="projection-value">{pred.projection}</span>
                  </div>

                  <div className="confidence-meter">
                    <div className="confidence-label">
                      <span>Confidence</span>
                      <span className="confidence-value">{pred.confidence}%</span>
                    </div>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${pred.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA overlay instead of lock */}
          <div className="preview-lock-overlay">
            <div className="lock-content">
              <span>Real picks drop daily — available by 4:00 PM ET</span>
              <Link to="/predictions/games" className="form-wrapper" style={{ textDecoration: 'none' }}>
                <button type="button" style={{ width: '100%' }}>
                  View Today's Predictions
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="features-preview">
          <div className="feature-item">
            <div className="feature-icon"><img src={gamePropIcon} alt="Game Predictions" className="feature-icon-img" /></div>
            <div className="feature-text">
              <span className="feature-title">Game Predictions</span>
              <span className="feature-desc">ML, Run Line &amp; Totals with odds and EV for every game</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><img src={batterPropIcon} alt="Batter Props" className="feature-icon-img" /></div>
            <div className="feature-text">
              <span className="feature-title">Batter Props</span>
              <span className="feature-desc">Hits, HR, RBIs, Total Bases, and more with top picks surfaced</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><img src={pitcherPropIcon} alt="Pitcher Props" className="feature-icon-img" /></div>
            <div className="feature-text">
              <span className="feature-title">Pitcher Props</span>
              <span className="feature-desc">Strikeout and outs props with confidence scores and EV</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><img src={analysisIcon} alt="Scout AI" className="feature-icon-img" /></div>
            <div className="feature-text">
              <span className="feature-title">Scout AI Reports</span>
              <span className="feature-desc">Deep-dive scouting reports generated by Scout AI for every matchup</span>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="waitlist-section">
          <div className="waitlist-content">
            <h3>Everything You Need in One Place</h3>
            <p>
              Game predictions, player props, and Scout AI scouting reports — all updated daily
              and available before first pitch.
            </p>
            <div className="teaser-cta-buttons">
              <Link to="/predictions" className="teaser-cta-btn teaser-cta-btn--blue">
                <img src={gamePropIcon} alt="" className="teaser-cta-icon" />
                Game Predictions
              </Link>
              <Link to="/predictions/batters" className="teaser-cta-btn teaser-cta-btn--green">
                <img src={batterPropIcon} alt="" className="teaser-cta-icon" />
                Batter Props
              </Link>
              <Link to="/predictions/pitchers" className="teaser-cta-btn teaser-cta-btn--green">
                <img src={pitcherPropIcon} alt="" className="teaser-cta-icon" />
                Pitcher Props
              </Link>
            </div>
          </div>

          <div className="launch-stats">
            <div className="launch-stat">
              <span className="launch-stat-value">3</span>
              <span className="launch-stat-label">Prediction Types</span>
            </div>
            <div className="launch-stat">
              <span className="launch-stat-value">10+</span>
              <span className="launch-stat-label">Prop Markets</span>
            </div>
            <div className="launch-stat">
              <span className="launch-stat-value">Daily</span>
              <span className="launch-stat-label">Scout AI Reports</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PredictionsTeaser;
