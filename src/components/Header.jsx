import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import articlesData from '../data/article.json';
import moreArticlesData from '../data/moreArticles.json';


function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const teamOptions = useMemo(() => ([
    { id: 'LAD', name: 'Los Angeles Dodgers', urlName: 'los-angeles-dodgers' },
    { id: 'NYY', name: 'New York Yankees', urlName: 'new-york-yankees' },
    { id: 'HOU', name: 'Houston Astros', urlName: 'houston-astros' },
    { id: 'ATL', name: 'Atlanta Braves', urlName: 'atlanta-braves' },
    { id: 'BAL', name: 'Baltimore Orioles', urlName: 'baltimore-orioles' },
    { id: 'TBR', name: 'Tampa Bay Rays', urlName: 'tampa-bay-rays' },
    { id: 'TOR', name: 'Toronto Blue Jays', urlName: 'toronto-blue-jays' },
    { id: 'BOS', name: 'Boston Red Sox', urlName: 'boston-red-sox' }
  ]), []);

  const articleTags = useMemo(() => {
    const articles = [
      ...(articlesData?.articles || []),
      ...(moreArticlesData?.articles || [])
    ];
    const tags = new Set();
    articles.forEach((article) => {
      (article.tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, []);

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

  const parseYearFromQuery = (value) => {
    const match = value.match(/\b(20\d{2})\b/);
    return match ? match[1] : null;
  };

  const buildSuggestions = (value) => {
    const trimmed = value.trim();
    const year = parseYearFromQuery(trimmed);
    const normalized = trimmed.replace(/\b20\d{2}\b/, '').trim().toLowerCase();
    const results = [];

    if (normalized.length >= 2 || year) {
      const teamMatches = teamOptions.filter(
        (team) =>
          team.name.toLowerCase().includes(normalized) ||
          team.id.toLowerCase() === normalized ||
          team.urlName.includes(normalized.replace(/\s+/g, '-'))
      );

      teamMatches.forEach((team) => {
        // Team analytics suggestion
        results.push({
          type: 'team',
          label: `${team.name}${year ? ` (${year})` : ''}`,
          onSelect: () => {
            closeMenu();
            navigate(`/team-analytics/${team.urlName}${year ? `?year=${year}` : ''}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSearchQuery('');
            setSearchSuggestions([]);
          }
        });

        // Player analytics suggestion for that team
        results.push({
          type: 'players',
          label: `${team.name} players${year ? ` (${year})` : ''}`,
          onSelect: () => {
            closeMenu();
            const seasonParam = year ? `&season=${year}` : '';
            navigate(`/player-analytics?team=${team.id}${seasonParam}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSearchQuery('');
            setSearchSuggestions([]);
          }
        });
      });
    }

    if (normalized.includes('player') || trimmed.toLowerCase().includes('player')) {
      results.push({
        type: 'players',
        label: 'Player Analytics',
        onSelect: () => {
          closeMenu();
          navigate('/player-analytics');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setSearchQuery('');
          setSearchSuggestions([]);
        }
      });
    }

    const lowerTokens = normalized.split(/\s+/).filter(Boolean);
    const articleMatches = articleTags.filter((tag) => {
      const lowerTag = tag.toLowerCase();
      if (normalized && lowerTag.includes(normalized)) return true;
      if (lowerTokens.length === 0) return false;
      return lowerTokens.some((token) => lowerTag.includes(token));
    });

    articleMatches.slice(0, 3).forEach((tag) => {
      results.push({
        type: 'articles',
        label: `Sandlot Insider: ${tag}`,
        onSelect: () => {
          closeMenu();
          navigate(`/sandlot-insider?tag=${encodeURIComponent(tag)}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setSearchQuery('');
          setSearchSuggestions([]);
        }
      });
    });

    setSearchSuggestions(results.slice(0, 5));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    buildSuggestions(value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchSuggestions.length > 0) {
      searchSuggestions[0].onSelect();
    }
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

        <form className="nav-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
            placeholder="Search teams, players, articles..."
            aria-label="Search"
          />
          {isSearchFocused && searchSuggestions.length > 0 && (
            <div className="search-suggestions">
              {searchSuggestions.map((item, idx) => (
                <button
                  key={`${item.type}-${idx}`}
                  type="button"
                  className="search-suggestion"
                  onClick={item.onSelect}
                >
                  <span className="suggestion-type">{item.type}</span>
                  <span className="suggestion-label">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </form>
        
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
              <button onClick={() => handleNavClick('/mlb-standings')} className="dropdown-item">
                <span className="dropdown-icon">🏅</span>
                <div>
                  <div className="dropdown-title">MLB Standings</div>
                  <div className="dropdown-desc">Division & wild card rankings</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/team-analytics')} className="dropdown-item">
                <span className="dropdown-icon">📊</span>
                <div>
                  <div className="dropdown-title">Team Analytics</div>
                  <div className="dropdown-desc">Advanced team statistics</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/player-analytics')} className="dropdown-item">
                <span className="dropdown-icon">⚾</span>
                <div>
                  <div className="dropdown-title">Player Analytics</div>
                  <div className="dropdown-desc">Player performance metrics</div>
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
