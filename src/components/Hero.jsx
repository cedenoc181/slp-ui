import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactGA from 'react-ga4';
import '../styles/home-page-styling/hero.css';


function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleTeamAnalyticsClick = () => {
    // Track CTA click to team analytics page
    ReactGA.event({
      category: 'User Interaction',
      action: 'Click',
      label: 'Hero Team Analytics Button'
    });

    navigate('/team-analytics');
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle email signup
    console.log('Email submitted:', email);
    setEmail('');
  };

  return (
    <section className="hero">
      {/* NEW: Floating analytics background */}
      <div className="hero-analytics-bg" aria-hidden="true">
        <span className="floating-stat stat-1">.342 AVG</span>
        <span className="floating-stat stat-2">12 K's</span>
        <span className="floating-stat stat-3">+2.5 TB</span>
        <span className="floating-stat stat-4">89%</span>
        <span className="floating-stat stat-5">OVER</span>
        <span className="floating-stat stat-6">1.82 RMSE</span>
      </div>

      <div className="container">
        {/* NEW: Live badge */}
        {/* <div className="hero-badge">
          <span className="badge-pulse"></span>
          2026 MLB Season Predictions Active
        </div> */}

        {/* KEEP: Your existing title structure */}
        <h1 
          className="chalk-heading hero-title"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {isHovering && (
            <span
              className="glow-spot"
              style={{
                left: `${mousePos.x}px`,
                top: `${mousePos.y}px`
              }}
            />
          )}
          Sandlot Picks Analytics
        </h1>
        <p className="hero-subtitle">
          Advanced player predictions, real-time statistics, and data-driven insights 
          to help you make smarter decisions.
        </p>

        {/* NEW: Quick stats strip */}
        <div className="hero-stats-strip">
          <div className="hero-stat-item">
            <span className="hero-stat-number">50+</span>
            <span className="hero-stat-label">Player Metrics</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat-item">
            <span className="hero-stat-number">Multiple</span>
            <span className="hero-stat-label">ML Models</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat-item">
            <span className="hero-stat-number">Daily</span>
            <span className="hero-stat-label">Updated Stats</span>
          </div>
        </div>

        {/* ENHANCED: CTA buttons - more prominent */}
        <div className="hero-cta-group">
          <button 
            className="hero-cta-primary" 
            onClick={() => navigate('/team-analytics')}
          >
            <span>Explore Stats</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="hero-decorations">
        {/* Remove all inline styles - let CSS handle it */}
        <svg className="hero-chart-left" width="350" height="320">
          <defs>
            <pattern id="diagonalStripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="white" strokeWidth="3"/>
            </pattern>
          </defs>
          <line x1="20" y1="300" x2="20" y2="20" stroke="white" strokeWidth="5"/>
          <line x1="20" y1="300" x2="330" y2="300" stroke="white" strokeWidth="5"/>
          <rect x="60" y="160" width="45" height="140" fill="url(#diagonalStripes)" stroke="white" strokeWidth="4" opacity="0.8"/>
          <rect x="130" y="100" width="45" height="200" fill="url(#diagonalStripes)" stroke="white" strokeWidth="4" opacity="0.8"/>
          <rect x="200" y="180" width="45" height="120" fill="url(#diagonalStripes)" stroke="white" strokeWidth="4" opacity="0.8"/>
          <rect x="270" y="60" width="45" height="240" fill="url(#diagonalStripes)" stroke="white" strokeWidth="4" opacity="0.8"/>
        </svg>
        
        <svg className="hero-chart-right" width="350" height="320">
          <line x1="20" y1="300" x2="20" y2="20" stroke="white" strokeWidth="5"/>
          <line x1="20" y1="300" x2="330" y2="300" stroke="white" strokeWidth="5"/>
          <polyline points="60,220 110,140 160,160 210,80 260,110 310,50" fill="none" stroke="white" strokeWidth="3" strokeDasharray="8,6"/>
          <circle cx="60" cy="220" r="6" fill="white"/>
          <circle cx="110" cy="140" r="6" fill="white"/>
          <circle cx="160" cy="160" r="6" fill="white"/>
          <circle cx="210" cy="80" r="6" fill="white"/>
          <circle cx="260" cy="110" r="6" fill="white"/>
          <circle cx="310" cy="50" r="6" fill="white"/>
        </svg>
        
        <svg className="baseball-icon" width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="white" stroke="#E0E0E0" strokeWidth="1"/>
          <path d="M 20 15 Q 12 40 20 65" stroke="#C62828" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 15 20 L 20 22 L 25 20" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 13 30 L 18 32 L 23 30" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 12 40 L 17 42 L 22 40" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 13 50 L 18 52 L 23 50" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 15 60 L 20 62 L 25 60" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 60 15 Q 68 40 60 65" stroke="#C62828" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 55 22 L 60 20 L 65 22" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 57 32 L 62 30 L 67 32" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 58 42 L 63 40 L 68 42" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 57 52 L 62 50 L 67 52" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 55 62 L 60 60 L 65 62" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* KEEP: Any existing decorative elements */}
      <div className="hero-gradient-overlay"></div>
    </section>
  );
}

export default Hero;
