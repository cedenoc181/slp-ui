import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/header.css';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
  };

  const handleNavClick = (path) => {
    closeMenu();
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div 
          className="logo" 
          onClick={handleLogoClick} 
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleLogoClick(e);
            }
          }}
        >
          <img src={require('../assets/images/spa-retro-logo-removebg.png')} alt="Sandlot Picks Analytics" />
        </div>
        
        {/* Hamburger Icon */}
        <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          <span className={isMenuOpen ? 'active' : ''}></span>
          <span className={isMenuOpen ? 'active' : ''}></span>
          <span className={isMenuOpen ? 'active' : ''}></span>
        </button>

        {/* Navigation */}
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          {/* Home */}
          <button 
            type="button" 
            onClick={() => handleNavClick('/')} 
            className={`nav-button ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </button>

          {/* Stats Dropdown - NEW */}
          <div 
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown('stats')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button 
              type="button" 
              className={`nav-button ${location.pathname.startsWith('/team-analytics') || location.pathname.startsWith('/batter-analytics') || location.pathname.startsWith('/pitcher-analytics') ? 'active' : ''}`}
              onClick={() => toggleDropdown('stats')}
            >
              Stats
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className={`dropdown-menu ${activeDropdown === 'stats' ? 'show' : ''}`}>
              <button onClick={() => handleNavClick('/team-analytics')} className="dropdown-item">
                <span className="dropdown-icon">📊</span>
                <div>
                  <div className="dropdown-title">Team Analytics</div>
                  <div className="dropdown-desc">Advanced team statistics</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/batter-analytics')} className="dropdown-item">
                <span className="dropdown-icon">⚾</span>
                <div>
                  <div className="dropdown-title">Batter Analytics</div>
                  <div className="dropdown-desc">Batter performance metrics</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/pitcher-analytics')} className="dropdown-item">
                <span className="dropdown-icon">⚾</span>
                <div>
                  <div className="dropdown-title">Pitcher Analytics</div>
                  <div className="dropdown-desc">Pitcher performance metrics</div>
                </div>
              </button>
            </div>
          </div>

          {/* Insights Dropdown - UPDATED (removed Team Analytics) */}
          <div 
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown('insights')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button 
              type="button" 
              className={`nav-button ${location.pathname.startsWith('/sandlot-insider') || location.pathname.startsWith('/blogs') || location.pathname.startsWith('/data-science') ? 'active' : ''}`}
              onClick={() => toggleDropdown('insights')}
            >
              Insights
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className={`dropdown-menu ${activeDropdown === 'insights' ? 'show' : ''}`}>
              <button onClick={() => handleNavClick('/sandlot-insider')} className="dropdown-item">
                <span className="dropdown-icon">📰</span>
                <div>
                  <div className="dropdown-title">Sandlot Insider</div>
                  <div className="dropdown-desc">Expert MLB analysis & commentary</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/blogs')} className="dropdown-item">
                <span className="dropdown-icon">✍️</span>
                <div>
                  <div className="dropdown-title">Strategy Blog</div>
                  <div className="dropdown-desc">Betting tips & insights</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/data-science')} className="dropdown-item">
                <span className="dropdown-icon">👨‍🔬</span>
                <div>
                  <div className="dropdown-title">Data Science & Baseball</div>
                  <div className="dropdown-desc">ML models & analytics</div>
                </div>
              </button>
            </div>
          </div>

          {/* Education Dropdown */}
          <div 
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown('education')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button 
              type="button" 
              className={`nav-button ${location.pathname.startsWith('/how-to-use') || location.pathname.startsWith('/glossary') || location.pathname.startsWith('/faqs') || location.pathname.startsWith('/responsible-gaming') ? 'active' : ''}`}
              onClick={() => toggleDropdown('education')}
            >
              Education
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className={`dropdown-menu ${activeDropdown === 'education' ? 'show' : ''}`}>
              <button onClick={() => handleNavClick('/how-to-use')} className="dropdown-item">
                <span className="dropdown-icon">🎯</span>
                <div>
                  <div className="dropdown-title">How to Use</div>
                  <div className="dropdown-desc">Platform guide</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/glossary')} className="dropdown-item">
                <span className="dropdown-icon">📖</span>
                <div>
                  <div className="dropdown-title">Glossary</div>
                  <div className="dropdown-desc">Baseball & betting terms</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/faqs')} className="dropdown-item">
                <span className="dropdown-icon">❓</span>
                <div>
                  <div className="dropdown-title">FAQs</div>
                  <div className="dropdown-desc">Common questions</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/responsible-gaming')} className="dropdown-item">
                <span className="dropdown-icon">🛡️</span>
                <div>
                  <div className="dropdown-title">Responsible Gaming</div>
                  <div className="dropdown-desc">Safe betting practices</div>
                </div>
              </button>
            </div>
          </div>

          {/* More Dropdown */}
          <div 
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown('more')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button 
              type="button" 
              className={`nav-button ${location.pathname.startsWith('/features') || location.pathname.startsWith('/contact') || location.pathname.startsWith('/about') ? 'active' : ''}`}
              onClick={() => toggleDropdown('more')}
            >
              More
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className={`dropdown-menu ${activeDropdown === 'more' ? 'show' : ''}`}>
              <button onClick={() => handleNavClick('/features')} className="dropdown-item">
                <span className="dropdown-icon">⚡</span>
                <div>
                  <div className="dropdown-title">Features</div>
                  <div className="dropdown-desc">Platform capabilities</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/contact')} className="dropdown-item">
                <span className="dropdown-icon">📧</span>
                <div>
                  <div className="dropdown-title">Contact Us</div>
                  <div className="dropdown-desc">Get in touch</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/about')} className="dropdown-item">
                <span className="dropdown-icon">ℹ️</span>
                <div>
                  <div className="dropdown-title">About Sandlot Picks</div>
                  <div className="dropdown-desc">Our story & mission</div>
                </div>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;