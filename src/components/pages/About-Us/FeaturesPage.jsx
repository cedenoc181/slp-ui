import { useEffect } from 'react';
import '../../../styles/features-page.css';

function FeaturesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="features" style={{ paddingTop: '6rem', minHeight: '100vh' }}>
      <div className="container">
        <h2 className="section-title features-page-title">The Engine Behind Sandlot Picks</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Advanced Analytics</h3>
            <p>
              Deep statistical analysis of MLB player performance, including batting averages, slugging percentages, 
              on-base percentages, and advanced metrics like wOBA and xwOBA.
            </p>
            <ul>
              <li>Historical performance trends</li>
              <li>Matchup-specific analytics</li>
              <li>Ballpark factor adjustments</li>
              <li>Weather condition impacts</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Predictive Modeling</h3>
            <p>
              Machine learning models trained on years of MLB data to predict player prop outcomes with high accuracy.
            </p>
            <ul>
              <li>Batter performance predictions</li>
              <li>Pitcher outcome forecasts</li>
              <li>Hit, run, and strikeout probabilities</li>
              <li>Confidence intervals for predictions</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Matchup Analysis</h3>
            <p>
              Comprehensive head-to-head analysis between batters and pitchers based on historical encounters 
              and statistical patterns.
            </p>
            <ul>
              <li>Batter vs. pitcher history</li>
              <li>Handedness matchup advantages</li>
              <li>Recent form analysis</li>
              <li>Platoon splits evaluation</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Real-time Updates</h3>
            <p>
              Dynamic predictions that update based on the latest player performance, injuries, and lineup changes.
            </p>
            <ul>
              <li>Live injury reports</li>
              <li>Starting lineup confirmations</li>
              <li>Weather updates</li>
              <li>Last-minute scratches</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Educational Resources</h3>
            <p>
              Learn the fundamentals of sports analytics and understand the methodology behind our predictions.
            </p>
            <ul>
              <li>Statistical concept explanations</li>
              <li>Model performance breakdowns</li>
              <li>Betting strategy guides</li>
              <li>Bankoll management</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Community Access</h3>
            <p>
              Join our Discord community to discuss predictions, share insights, and learn from other data-driven bettors.
            </p>
            <ul>
              <li>Daily pick discussions</li>
              <li>Model performance reviews</li>
              <li>Betting strategy sharing</li>
              <li>Direct support from our team</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎲</div>
            <h3>Prop Bet Focus</h3>
            <p>
              Specialized predictions for player props including hits, runs, strikeouts, and other performance metrics.
            </p>
            <ul>
              <li>Over/Under predictions</li>
              <li>Multi-prop analysis</li>
              <li>Optimal betting lines</li>
              <li>Value bet identification</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔬</div>
            <h3>Model Transparency</h3>
            <p>
              We show you how our models work with performance metrics like RMSE and R² so you can trust our predictions.
            </p>
            <ul>
              <li>Model accuracy metrics</li>
              <li>Feature importance rankings</li>
              <li>Prediction confidence scores</li>
              <li>Historical performance tracking</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Mobile Optimized</h3>
            <p>
              Access our analytics on any device with a fully responsive design that works seamlessly on desktop, 
              tablet, and mobile.
            </p>
            <ul>
              <li>Responsive charts and tables</li>
              <li>Touch-optimized interface</li>
              <li>Fast loading times</li>
              <li>Cross-platform compatibility</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesPage;