import { useNavigate } from 'react-router-dom';
import '../styles/home-page-styling/how-it-works.css';

function HowItWorks() {
  const navigate = useNavigate();

  const steps = [
    {
      number: '01',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
      title: 'Choose a Team or Player',
      description: 'Browse all 30 MLB teams or search for specific players. Filter by position, season, or division.',
      features: ['30 MLB Teams', '750+ Active Players', 'Historical Data'],
    },
    {
      number: '02',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      title: 'Analyze the Stats',
      description: 'Dive into 50+ metrics including batting averages, ERA, splits, and advanced sabermetrics.',
      features: ['Advanced Metrics', 'Performance Splits', 'Trend Analysis'],
    },
    {
      number: '03',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      title: 'Make Informed Decisions',
      description: 'Use data-driven insights to make smarter predictions. Compare matchups and spot trends.',
      features: ['Data-Driven', 'Matchup Analysis', 'Smarter Picks'],
    },
  ];

  return (
    <section className="how-it-works">
      <div className="container">
        {/* Section Header */}
        <div className="hiw-header">
          <span className="hiw-badge">
            <span className="badge-icon">🎯</span>
            GETTING STARTED
          </span>
          <h2>How It Works</h2>
          <p>Three simple steps to unlock the power of baseball analytics</p>
        </div>

        {/* Steps Grid */}
        <div className="steps-container">
          {steps.map((step, idx) => (
            <div key={idx} className="step-card">
              <div className="step-number">{step.number}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
              <div className="step-features">
                {step.features.map((feature, fIdx) => (
                  <span key={fIdx} className="step-feature">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {feature}
                  </span>
                ))}
              </div>
              {idx < steps.length - 1 && (
                <div className="step-connector">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="hiw-cta">
          <button 
            className="hiw-cta-button"
            onClick={() => navigate('/team-analytics')}
          >
            Start Exploring
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <span className="hiw-cta-subtext">No account required • Free to use</span>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
