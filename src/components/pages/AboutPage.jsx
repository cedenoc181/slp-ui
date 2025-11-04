import { useEffect } from 'react';
import '../../styles/about-page.css';

function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="about-page">
      <div className="container">
        <h2 className="section-title">About Sandlot Picks Analytics</h2>
        
        <div className="about-description">
          <h3>Our Mission</h3>
          <p>
            Sandlot Picks Analytics is dedicated to providing data-driven insights and predictive analytics for MLB betting. 
            We combine advanced statistical modeling with real-time data to give you an edge in your sports betting decisions.
          </p>

          <h3>What We Do</h3>
          <p>
            Our platform leverages machine learning algorithms and historical MLB data to generate accurate predictions 
            for batter and pitcher prop outcomes. We analyze thousands of data points including player statistics, 
            matchup histories, ballpark factors, and real-time performance metrics.
          </p>

          <h3>Our Approach</h3>
          <p>
            We believe in transparency and education. Our analytics are built on proven statistical methods including:
          </p>
          <ul>
            <li><strong>Advanced Regression Models</strong> – Predicting player performance based on historical patterns</li>
            <li><strong>Feature Engineering</strong> – Creating meaningful metrics from raw game data</li>
            <li><strong>Real-time Analysis</strong> – Dynamically generating matchup-based predictions</li>
            <li><strong>Model Validation</strong> – Using RMSE and R² to ensure prediction accuracy</li>
          </ul>

          <h3>Why Choose Us?</h3>
          <p>
            Unlike traditional sports betting advice, we provide:
          </p>
          <ul>
            <li>Data-backed predictions, not gut feelings</li>
            <li>Transparent methodology and model performance metrics</li>
            <li>Educational content to help you understand the analytics</li>
            <li>Continuous model improvement based on new data</li>
            <li>Community-driven insights through our Discord community</li>
          </ul>

          <h3>The Team</h3>
          <p>
            Sandlot Picks was founded by data scientists and baseball enthusiasts who saw an opportunity to apply 
            advanced analytics to sports betting. Our team combines expertise in statistics, machine learning, 
            and deep knowledge of baseball to create the most accurate prediction models possible.
          </p>

          <h3>Responsible Gambling</h3>
          <p>
            We are committed to promoting responsible gambling. Our tools are designed to inform, not encourage 
            excessive betting. Please gamble responsibly and never wager more than you can afford to lose.
          </p>

          <div className="highlight-box">
            <h4>Join Our Community</h4>
            <p>
              Connect with fellow data-driven bettors, share insights, and get exclusive access to our latest models 
              and predictions. Join our Discord community today!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutPage;