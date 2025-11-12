import React from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/responsibleGaming-page.css';

function ResponsibleGaming() {
  return (
    <section className="responsible-gaming-page">
      <div className="container">
        {/* Hero Section */}
        <div className="rg-hero">
          <div className="rg-hero-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <h1>Responsible Gaming</h1>
          <p className="hero-subtitle">
            At Sandlot Picks, we're committed to promoting safe and responsible sports betting. 
            Betting should be fun, entertaining, and never a financial burden.
          </p>
        </div>

        {/* Our Commitment */}
        <div className="rg-section">
          <h2>Our Commitment to You</h2>
          <div className="commitment-grid">
            <div className="commitment-card">
              <div className="commitment-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3>Set Time Limits</h3>
              <p>Always decide how much time you'll spend betting before you start. Stick to your limits.</p>
            </div>

            <div className="commitment-card">
              <div className="commitment-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3>Budget Wisely</h3>
              <p>Only bet what you can afford to lose. Never chase losses or bet with borrowed money.</p>
            </div>

            <div className="commitment-card">
              <div className="commitment-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <h3>Keep Records</h3>
              <p>Track your wins and losses. Understanding your betting patterns helps you stay in control.</p>
            </div>

            <div className="commitment-card">
              <div className="commitment-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Seek Support</h3>
              <p>If gambling is affecting your life, reach out. Help is available and recovery is possible.</p>
            </div>
          </div>
        </div>

        {/* Warning Signs */}
        <div className="rg-section warning-section">
          <h2>⚠️ Warning Signs of Problem Gambling</h2>
          <p className="section-intro">
            Recognizing the signs early can help prevent serious problems. Be honest with yourself about these behaviors:
          </p>
          
          <div className="warning-grid">
            <div className="warning-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Betting more than you can afford to lose</p>
            </div>
            <div className="warning-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Chasing losses or betting to win back money</p>
            </div>
            <div className="warning-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Neglecting work, family, or personal responsibilities</p>
            </div>
            <div className="warning-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Lying about betting habits or hiding losses</p>
            </div>
            <div className="warning-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Borrowing money or selling possessions to bet</p>
            </div>
            <div className="warning-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Feeling restless or irritable when not betting</p>
            </div>
            <div className="warning-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Using gambling to escape problems or emotions</p>
            </div>
            <div className="warning-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Unable to stop or control betting behavior</p>
            </div>
          </div>
        </div>

        {/* Get Help Section */}
        <div className="rg-section help-section">
          <h2>🆘 Get Help Now</h2>
          <p className="section-intro">
            If you or someone you know is struggling with problem gambling, professional help is available 24/7:
          </p>

          <div className="help-resources">
            <div className="help-card primary">
              <h3>National Problem Gambling Helpline</h3>
              <a href="tel:1-800-522-4700" className="help-phone">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                1-800-522-4700
              </a>
              <p>Free, confidential support 24/7</p>
            </div>

            <div className="help-card">
              <h3>Gamblers Anonymous</h3>
              <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="help-link">
                Visit Website →
              </a>
              <p>Peer support and recovery meetings</p>
            </div>

            <div className="help-card">
              <h3>National Council on Problem Gambling</h3>
              <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="help-link">
                Visit Website →
              </a>
              <p>Resources, treatment centers, and support</p>
            </div>

            <div className="help-card">
              <h3>SAMHSA National Helpline</h3>
              <a href="tel:1-800-662-4357" className="help-phone">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                1-800-662-4357
              </a>
              <p>Mental health and substance abuse support</p>
            </div>
          </div>
        </div>

        {/* Self-Exclusion */}
        <div className="rg-section">
          <h2>🚫 Self-Exclusion Programs</h2>
          <p className="section-intro">
            Most betting platforms offer self-exclusion tools. These allow you to voluntarily restrict your access to gambling services:
          </p>
          
          <div className="exclusion-options">
            <div className="exclusion-card">
              <h4>Time-Out</h4>
              <p>Take a short break from betting (24 hours to 30 days)</p>
            </div>
            <div className="exclusion-card">
              <h4>Self-Exclusion</h4>
              <p>Block yourself from betting for 6 months or longer</p>
            </div>
            <div className="exclusion-card">
              <h4>Permanent Ban</h4>
              <p>Permanently close your account and restrict access</p>
            </div>
          </div>

          <p className="exclusion-note">
            Contact your betting platform's customer support to learn about their specific self-exclusion options.
          </p>
        </div>

        {/* Additional Resources */}
        <div className="rg-section resources-section">
          <h2>📚 Additional Resources</h2>
          <div className="resources-list">
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="resource-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              BeGambleAware - UK Resources
            </a>
            <a href="https://www.responsiblegambling.org" target="_blank" rel="noopener noreferrer" className="resource-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Responsible Gambling Council
            </a>
            <a href="https://www.gamblingtherapy.org" target="_blank" rel="noopener noreferrer" className="resource-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              GamCare - Free Support & Treatment
            </a>
          </div>
        </div>

        {/* Age Restriction */}
        <div className="age-restriction">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <h3>21+ Only</h3>
          <p>You must be 21 years or older to participate in sports betting. Underage gambling is illegal.</p>
        </div>

        {/* CTA */}
        <div className="rg-cta">
          <h3>Remember: Betting Should Be Fun</h3>
          <p>
            If it's not fun anymore, it's time to stop. Your well-being is more important than any bet.
          </p>
          <Link to="/" className="cta-button">
            Return to Home
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ResponsibleGaming;