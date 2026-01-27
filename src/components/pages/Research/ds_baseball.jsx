import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import dsData from '../../../data/staticData/ds_baseball.json';

function DataScienceBaseball() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${dsData.page_title} | Sandlot Picks Analytics`;
  }, []);

  return (
    <section className="ds-baseball-page">
      <div className="container">
        {/* Hero Section */}
        <div className="ds-hero">
          <h1 className="page-title">{dsData.page_title}</h1>
          <p className="page-subtitle">{dsData.page_subtitle}</p>
        </div>

        {/* Render sections dynamically */}
        {dsData.sections.map(section => {
          if (section.type === 'hero') {
            return (
              <div key={section.id} className="intro-section">
                <h2>{section.title}</h2>
                <p>{section.content}</p>
              </div>
            );
          }

          if (section.type === 'timeline') {
            return (
              <div key={section.id} className="timeline-section">
                <h2>{section.title}</h2>
                <p className="subtitle">{section.subtitle}</p>
                <div className="timeline">
                  {section.events.map((event, idx) => (
                    <div key={idx} className="timeline-item">
                      <span className="timeline-icon">{event.icon}</span>
                      <div className="timeline-content">
                        <span className="timeline-year">{event.year}</span>
                        <h3>{event.title}</h3>
                        <p>{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (section.type === 'transparency') {
            return (
              <div key={section.id} className="limitations-section">
                <h2>{section.title}</h2>
                <p className="subtitle">{section.subtitle}</p>
                <p className="intro">{section.intro}</p>
                <div className="limitations-grid">
                  {section.limitations.map((item, idx) => (
                    <div key={idx} className="limitation-card">
                      <span className="limitation-icon">{item.icon}</span>
                      <h3>{item.category}</h3>
                      <p className="description">{item.description}</p>
                      <p className="impact"><strong>Impact:</strong> {item.impact}</p>
                      <p className="approach"><strong>Our Approach:</strong> {item.our_approach}</p>
                    </div>
                  ))}
                </div>
                <div className="philosophy">
                  <p>{section.philosophy}</p>
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Stats Exploration CTA */}
        <div className="stats-cta-section">
          <h2>Explore Our Analytics</h2>
          <p>Dive into the data that powers Sandlot Picks. Choose your starting point below.</p>
          <div className="stats-options-grid">
            <Link to="/player-analytics" className="stats-option-card stats-option-player" onClick={() => window.scrollTo(0, 0)}>
              <div className="stats-card-visual">
                <div className="stats-visual-graphic player-graphic">
                  <svg viewBox="0 0 100 100" className="stats-svg">
                    {/* Card background */}
                    <rect x="15" y="10" width="70" height="80" rx="6" className="svg-card-bg"/>
                    {/* Player avatar circle */}
                    <circle cx="50" cy="32" r="14" className="svg-accent"/>
                    {/* Player silhouette in circle */}
                    <circle cx="50" cy="28" r="5" className="svg-card-bg"/>
                    <ellipse cx="50" cy="40" rx="7" ry="5" className="svg-card-bg"/>
                    {/* Stat lines */}
                    <rect x="25" y="52" width="30" height="4" rx="2" className="svg-accent"/>
                    <rect x="25" y="60" width="50" height="4" rx="2" className="svg-secondary"/>
                    <rect x="25" y="68" width="40" height="4" rx="2" className="svg-secondary"/>
                    <rect x="25" y="76" width="45" height="4" rx="2" className="svg-muted"/>
                    {/* Stat values */}
                    <text x="78" y="56" className="svg-stat-value">.312</text>
                    <text x="78" y="64" className="svg-stat-label">42</text>
                    <text x="78" y="72" className="svg-stat-label">98</text>
                  </svg>
                </div>
              </div>
              <div className="stats-card-content">
                <h3>Player Analytics</h3>
                <p>Deep dive into individual player statistics, trends, and performance metrics.</p>
                <span className="stats-option-link">Explore Players <span className="arrow">→</span></span>
              </div>
            </Link>
            <Link to="/team-analytics" className="stats-option-card stats-option-team" onClick={() => window.scrollTo(0, 0)}>
              <div className="stats-card-visual">
                <div className="stats-visual-graphic team-graphic">
                  <svg viewBox="0 0 100 100" className="stats-svg">
                    <rect x="20" y="60" width="15" height="30" className="svg-bar svg-accent"/>
                    <rect x="42" y="40" width="15" height="50" className="svg-bar svg-primary"/>
                    <rect x="64" y="25" width="15" height="65" className="svg-bar svg-secondary"/>
                    <line x1="15" y1="92" x2="85" y2="92" className="svg-accent" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <div className="stats-card-content">
                <h3>Team Analytics</h3>
                <p>Comprehensive team data including offensive, defensive, and pitching breakdowns.</p>
                <span className="stats-option-link">Explore Teams <span className="arrow">→</span></span>
              </div>
            </Link>
            <Link to="/mlb-standings" className="stats-option-card stats-option-standings" onClick={() => window.scrollTo(0, 0)}>
              <div className="stats-card-visual">
                <div className="stats-visual-graphic standings-graphic">
                  <svg viewBox="0 0 100 100" className="stats-svg">
                    {/* Podium blocks */}
                    <rect x="10" y="55" width="25" height="35" className="svg-secondary" rx="2"/>
                    <rect x="37" y="35" width="26" height="55" className="svg-accent" rx="2"/>
                    <rect x="65" y="65" width="25" height="25" className="svg-muted" rx="2"/>
                    {/* Podium numbers */}
                    <text x="22.5" y="75" className="svg-podium-num" textAnchor="middle">2</text>
                    <text x="50" y="58" className="svg-podium-num svg-podium-gold" textAnchor="middle">1</text>
                    <text x="77.5" y="82" className="svg-podium-num" textAnchor="middle">3</text>
                    {/* Trophy/crown on 1st place */}
                    <path d="M44 30 L50 22 L56 30 L53 30 L53 33 L47 33 L47 30 Z" className="svg-accent" />
                    {/* Stars decoration */}
                    <circle cx="50" cy="15" r="3" className="svg-accent"/>
                  </svg>
                </div>
              </div>
              <div className="stats-card-content">
                <h3>MLB Standings</h3>
                <p>Current standings, division races, and playoff positioning across the league.</p>
                <span className="stats-option-link">View Standings <span className="arrow">→</span></span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DataScienceBaseball;