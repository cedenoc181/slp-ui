import { useState } from 'react';
import '../styles/home-page-styling/predictions-teaser.css';

function PredictionsTeaser() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const apiBase = process.env.REACT_APP_API_BASE || '';
      const res = await fetch(`${apiBase}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
          setErrorMessage('This email is already on the waitlist!');
        } else {
          setErrorMessage(data.message || 'Something went wrong. Please try again.');
        }
        return;
      }
      
      setIsSubmitted(true);
      setEmail('');
    } catch (err) {
      setErrorMessage('Unable to connect. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mock prediction data for preview
  const mockPredictions = [
    {
      player: 'Aaron Judge',
      team: 'NYY',
      stat: 'Total Bases',
      line: '1.5',
      prediction: 'OVER',
      confidence: 72,
      projection: '2.3 TB',
    },
    {
      player: 'Shohei Ohtani',
      team: 'LAD',
      stat: 'Hits',
      line: '1.5',
      prediction: 'OVER',
      confidence: 68,
      projection: '1.8 H',
    },
    {
      player: 'Tarik Skubal',
      team: 'DET',
      stat: 'Strikeouts',
      line: '6.5',
      prediction: 'OVER',
      confidence: 75,
      projection: '7.2 K',
    },
  ];

  return (
    <section className="predictions-teaser">
      <div className="container">
        {/* Section Header */}
        <div className="teaser-header">
          <span className="coming-soon-badge">
            <span className="badge-icon">🚀</span>
            COMING SOON
          </span>
          <h2>Daily Player Predictions</h2>
          <p>
            AI-powered prop predictions backed by our machine learning models. 
            Get projections for hits, home runs, strikeouts, and more.
          </p>
        </div>

        {/* Preview Cards */}
        <div className="predictions-preview">
          <div className="preview-header">
            <span className="preview-date">Sample Predictions</span>
            <span className="preview-badge blurred">Model v2.0</span>
          </div>
          
          <div className="preview-grid">
            {mockPredictions.map((pred, idx) => (
              <div key={idx} className="prediction-card">
                <div className="card-blur-overlay"></div>
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
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Blur overlay for "locked" effect */}
          <div className="preview-lock-overlay">
            <div className="lock-content">
              <svg className="lock-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Join the waitlist for early access</span>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="features-preview">
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <div className="feature-text">
              <span className="feature-title">Daily Picks</span>
              <span className="feature-desc">Fresh predictions every game day</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <div className="feature-text">
              <span className="feature-title">Confidence Scores</span>
              <span className="feature-desc">Know how confident the model is</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <div className="feature-text">
              <span className="feature-title">Real-Time Updates</span>
              <span className="feature-desc">Adjusted for lineup changes</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📈</div>
            <div className="feature-text">
              <span className="feature-title">Track Record</span>
              <span className="feature-desc">Transparent model performance</span>
            </div>
          </div>
        </div>

        {/* Waitlist Signup */}
        <div className="waitlist-section">
          <div className="waitlist-content">
            <h3>Be the First to Know</h3>
            <p>Join the waitlist and get notified when predictions go live for the 2026 season.</p>
            
            {!isSubmitted ? (
              <form className="waitlist-form" onSubmit={handleSubmit}>
                <div className="form-wrapper">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    disabled={isSubmitting}
                  />
                  <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="submitting">
                        <span className="spinner"></span>
                        Joining...
                      </span>
                    ) : (
                      <>
                        Join Waitlist
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </>
                    )}
                  </button>
                </div>
                {errorMessage && (
                  <span className="form-error">
                    {errorMessage}
                  </span>
                )}
                <span className="form-disclaimer">
                  🔒 No spam, ever. Unsubscribe anytime.
                </span>
              </form>
            ) : (
              <div className="success-message">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>You're on the list! We'll notify you when predictions launch.</span>
              </div>
            )}
          </div>

          {/* Stats teaser */}
          <div className="launch-stats">
            <div className="launch-stat">
              <span className="launch-stat-value">750+</span>
              <span className="launch-stat-label">Players Tracked</span>
            </div>
            <div className="launch-stat">
              <span className="launch-stat-value">10+</span>
              <span className="launch-stat-label">Prop Types</span>
            </div>
            <div className="launch-stat">
              <span className="launch-stat-value">2026</span>
              <span className="launch-stat-label">Season Launch</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PredictionsTeaser;
