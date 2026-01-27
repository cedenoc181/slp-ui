import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="about-page">
      <div className="container">
        <h1 className="page-title">About Sandlot Picks</h1>
        <p className="page-subtitle">Your Premier MLB Analytics Platform</p>

        <div className="about-content">
          {/* Mission Section */}
          <div className="about-section">
            <div className="section-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <h2>Our Mission</h2>
            <p>
              Sandlot Picks Analytics is dedicated to making comprehensive MLB statistics accessible to every baseball fan. 
              We believe that understanding the numbers behind the game enhances the way you experience and appreciate baseball.
            </p>
          </div>

          {/* What We Offer Section */}
          <div className="about-section">
            <div className="section-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3v18h18"/>
                <path d="M18 17V9"/>
                <path d="M13 17V5"/>
                <path d="M8 17v-3"/>
              </svg>
            </div>
            <h2>What We Offer</h2>
            <p>
              Our platform provides a comprehensive suite of MLB analytics tools designed for fans, researchers, and anyone 
              who wants to dive deeper into baseball data:
            </p>
            <ul className="feature-list">
              <li>
                <strong>Player Analytics</strong> – Detailed statistical profiles for every MLB player including batting, 
                pitching, and advanced sabermetric data
              </li>
              <li>
                <strong>Team Analytics</strong> – In-depth breakdowns of all 30 MLB teams covering offensive, pitching, 
                and defensive performance
              </li>
              <li>
                <strong>MLB Standings</strong> – Real-time division standings, wild card races, and playoff positioning
              </li>
              <li>
                <strong>Educational Resources</strong> – Comprehensive glossary, how-to guides, and data science explanations 
                to help you understand the metrics
              </li>
              <li>
                <strong>Sandlot Insider</strong> – Original articles and analysis covering players, teams, and MLB storylines
              </li>
            </ul>
          </div>

          {/* Our Approach Section */}
          <div className="about-section">
            <div className="section-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2>Our Approach</h2>
            <p>
              We combine traditional baseball statistics with modern sabermetrics to give you a complete picture. 
              Our platform features:
            </p>
            <ul className="feature-list">
              <li>
                <strong>Traditional Metrics</strong> – The classic stats like batting average, ERA, RBIs, and wins 
                that have defined baseball for generations
              </li>
              <li>
                <strong>Advanced Sabermetrics</strong> – Modern metrics like wOBA, xFIP, WAR, and BABIP that reveal 
                deeper performance insights
              </li>
              <li>
                <strong>Historical Context</strong> – Multi-season data to track trends, improvements, and career trajectories
              </li>
              <li>
                <strong>Clean Data Visualization</strong> – Easy-to-read tables and organized layouts that make 
                complex data accessible
              </li>
            </ul>
          </div>

          {/* Access Tiers Section */}
          <div className="about-section">
            <div className="section-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h2>Flexible Access</h2>
            <p>
              We've designed our platform with different access levels to meet your needs:
            </p>
            <div className="access-tiers">
              <div className="tier-card">
                <h4>Guest Access</h4>
                <p>Browse MLB Standings, Glossary, educational content, and Sandlot Insider articles—no account needed.</p>
              </div>
              <div className="tier-card">
                <h4>Free Account</h4>
                <p>Unlock full access to Player Analytics and Team Analytics with comprehensive statistical breakdowns.</p>
              </div>
              <div className="tier-card premium">
                <h4>Premium</h4>
                <p>Coming soon: predictions, advanced analytical tools, and exclusive features for serious researchers.</p>
              </div>
            </div>
          </div>

          {/* Who We Are Section */}
          <div className="about-section">
            <div className="section-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h2>Who We Are</h2>
            <p>
              Sandlot Picks was created by baseball fans and data enthusiasts who wanted to build the analytics 
              platform they wished existed. We're passionate about both the art and science of baseball—the 
              tradition and history alongside the numbers that reveal new layers of understanding.
            </p>
            <p>
              Our goal is simple: help you appreciate baseball more by understanding it better. Whether you're 
              settling a debate about who's having the better season, researching historical performance, or 
              just curious about what "wOBA" actually means, we've got you covered.
            </p>
          </div>

          {/* CTA Section */}
          <div className="about-cta">
            <h3>Ready to Explore?</h3>
            <p>Dive into our analytics tools and discover new insights about the game you love.</p>
            <div className="cta-buttons">
              <Link to="/standings" className="cta-btn primary" onClick={() => window.scrollTo(0, 0)}>
                View Standings
              </Link>
              <Link to="/glossary" className="cta-btn secondary" onClick={() => window.scrollTo(0, 0)}>
                Browse Glossary
              </Link>
              <Link to="/features" className="cta-btn secondary" onClick={() => window.scrollTo(0, 0)}>
                See All Features
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutPage;