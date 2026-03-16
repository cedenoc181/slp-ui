import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import articlesData from '../data/contentData/article.json';
import moreArticlesData from '../data/contentData/moreArticles.json';
import { TEAMS, getTeamById } from '../data/constants/apiConstants';
import { useAuth } from '../context/AuthContext';
import playerStatsService from '../data/services/playerStatsServices';
import scheduleService from '../data/services/scheduleService';

// Format a matchup time/date label for search suggestions
function formatMatchupTime(game) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = (game.date ?? '').slice(0, 10) === todayStr;
  const dateLabel = isToday
    ? 'Today'
    : game.date ? new Date(game.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const statusLower = (game.status || '').toLowerCase();
  if (statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed') return `${dateLabel} · Final`;
  if (statusLower.includes('progress') || statusLower === 'live') return `${dateLabel} · Live`;
  return dateLabel + (game.game_time ? ` · ${game.game_time}` : '');
}

// Helper to get player headshot URL from MLB ID
const getPlayerHeadshotUrl = (mlbId) => {
  if (!mlbId) return null;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${mlbId}/headshot/67/current`;
};


function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchDebounceRef = useRef(null);
  const matchupDebounceRef = useRef(null);
  const scheduleGamesRef = useRef(null); // cache today/upcoming games for matchup search
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Use all 30 MLB teams from apiConstants
  const teamOptions = useMemo(() => 
    TEAMS.map(team => ({
      id: team.id,
      name: team.name,
      urlName: team.urlName
    }))
  , []);

  // Quick access pages for search
  const pageOptions = useMemo(() => [
    { type: 'page', label: 'MLB Schedule', path: '/mlb-schedule', keywords: ['schedule', 'games', 'today', 'matchup', 'daily', 'analysis', 'overviews'] },
    { type: 'page', label: 'MLB Standings', path: '/mlb-standings', keywords: ['standings', 'rankings', 'division', 'wild card', 'leaderboard'] },
    { type: 'page', label: 'Team Analytics', path: '/team-analytics', keywords: ['team', 'analytics', 'stats', 'statistics'] },
    { type: 'page', label: 'Player Analytics', path: '/player-analytics', keywords: ['player', 'batter', 'pitcher', 'stats', 'analytics'] },
    { type: 'page', label: 'Sandlot Insider', path: '/sandlot-insider', keywords: ['articles', 'news', 'insider', 'analysis', 'commentary'] },
    { type: 'page', label: 'Strategy Blog', path: '/blogs', keywords: ['blog', 'strategy', 'tips', 'betting', 'advice'] },
    { type: 'page', label: 'Data Science & Baseball', path: '/data-science', keywords: ['data', 'science', 'ml', 'machine learning', 'models', 'algorithm'] },
    { type: 'page', label: 'How to Use', path: '/how-to-use', keywords: ['how', 'guide', 'tutorial', 'help', 'instructions'] },
    { type: 'page', label: 'Glossary', path: '/glossary', keywords: ['glossary', 'terms', 'definitions', 'dictionary', 'meaning'] },
    { type: 'page', label: 'FAQs', path: '/faqs', keywords: ['faq', 'questions', 'help', 'support'] },
    { type: 'page', label: 'Responsible Gaming', path: '/responsible-gaming', keywords: ['responsible', 'gaming', 'safety', 'limits'] },
    { type: 'page', label: 'Features', path: '/features', keywords: ['features', 'capabilities', 'tools'] },
    { type: 'page', label: 'About Us', path: '/about', keywords: ['about', 'mission', 'team', 'story'] },
    { type: 'page', label: 'Contact Us', path: '/contact', keywords: ['contact', 'email', 'support', 'feedback'] },
  ], []);

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

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (matchupDebounceRef.current) clearTimeout(matchupDebounceRef.current);
    };
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

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
  }, []);

  const handleNavClick = (path) => {
    closeMenu();
    
    // Dispatch custom events for analytics pages to show loading overlay
    if (path === '/team-analytics' && location.pathname.startsWith('/team-analytics')) {
      window.dispatchEvent(new CustomEvent('team-analytics-nav-click'));
    }
    if (path === '/player-analytics' && location.pathname.startsWith('/player-analytics')) {
      window.dispatchEvent(new CustomEvent('player-analytics-nav-click'));
    }
    
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

  // Search players from API with debouncing
  const searchPlayersAsync = useCallback(async (query, existingResults) => {
    if (!query || query.trim().length < 2) {
      return;
    }

    setIsSearchingPlayers(true);
    try {
      const players = await playerStatsService.searchPlayers(query, 5);
      
      if (Array.isArray(players) && players.length > 0) {
        const playerResults = players.map((player) => {
          // Handle different response formats from lookup vs search endpoints
          const playerName = player.full_name || player.player_name || 'Unknown Player';
          const playerId = player.id || player.player_id;
          const playerMlbId = player.mlb_id || player.player_mlb_id;
          // Use name_slug if available, otherwise fall back to MLB ID
          const nameSlug = player.name_slug || String(playerMlbId);
          const teamName = player.team_name || player.current_team?.team_name || '';
          const headshotUrl = getPlayerHeadshotUrl(playerMlbId);
          
          return {
            type: 'player',
            icon: '👤',
            headshotUrl: headshotUrl,
            label: playerName,
            sublabel: teamName,
            playerId: playerId,
            playerMlbId: playerMlbId,
            nameSlug: nameSlug,
            onSelect: () => {
              closeMenu();
              // Navigate to player profile using SEO-friendly slug
              navigate(`/player/${nameSlug}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setSearchQuery('');
              setSearchSuggestions([]);
            }
          };
        });

        // Combine player results with existing results (players first, then others)
        setSearchSuggestions((prev) => {
          const nonPlayerResults = prev.filter(r => r.type !== 'player');
          return [...playerResults, ...nonPlayerResults].slice(0, 8);
        });
      }
    } catch (error) {
      console.error('Error searching players:', error);
      // Silently fail - local results are still shown
    } finally {
      setIsSearchingPlayers(false);
    }
  }, [navigate, closeMenu]);

  // Search today's (or upcoming) games and inject matchup suggestions for matched teams
  const searchMatchupsAsync = useCallback(async (matchedTeams) => {
    // Fetch & cache schedule games (today first, fall back to upcoming)
    if (scheduleGamesRef.current === null) {
      try {
        const data = await scheduleService.getTodayGames();
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayGames = Array.isArray(data)
          ? data.filter(g => (g.date ?? '').slice(0, 10) === todayStr)
          : [];
        if (todayGames.length > 0) {
          scheduleGamesRef.current = todayGames;
        } else {
          // No games today — try upcoming (include all games, not just strict future)
          const allGames = Array.isArray(data) ? data : [];
          if (allGames.length > 0) {
            scheduleGamesRef.current = allGames.slice(0, 30);
          } else {
            const upcoming = await scheduleService.getUpcomingGames({ limit: 30 });
            scheduleGamesRef.current = Array.isArray(upcoming) ? upcoming.slice(0, 30) : [];
          }
        }
      } catch {
        // Don't cache on error — allow retry on next search keystroke
        scheduleGamesRef.current = null;
        return;
      }
    }

    const games = scheduleGamesRef.current;
    if (!games || !games.length) return;

    // Build a Set of internal team IDs for each matched team (fast O(1) lookup)
    const matchedTeamIds = new Set(matchedTeams.map(t => t.id.toLowerCase()));

    const matchupResults = [];
    for (const game of games) {
      // Primary: match by internal team_id via TEAMS constant lookup (most reliable)
      const awayTeam = getTeamById(game.away_team_id);
      const homeTeam = getTeamById(game.home_team_id);
      const awayIdKey = awayTeam?.id?.toLowerCase();
      const homeIdKey = homeTeam?.id?.toLowerCase();

      let isMatch = (awayIdKey && matchedTeamIds.has(awayIdKey)) ||
                    (homeIdKey && matchedTeamIds.has(homeIdKey));

      // Fallback: string-based name matching (handles cases where team_id lookup fails)
      if (!isMatch) {
        const awayLower = (game.away_team_name || '').toLowerCase();
        const homeLower = (game.home_team_name || '').toLowerCase();
        isMatch = matchedTeams.some(team => {
          const nameLower = team.name.toLowerCase();
          const urlLower  = team.urlName.replace(/-/g, ' ').toLowerCase();
          return (
            awayLower.includes(nameLower) || homeLower.includes(nameLower) ||
            nameLower.includes(awayLower) || nameLower.includes(homeLower) ||
            awayLower.includes(urlLower)  || homeLower.includes(urlLower)
          );
        });
      }

      if (isMatch) {
        const gameId = game.id ?? game.game_pk;
        // Use looked-up abbreviations for the label, fall back to API names
        const awayLabel = awayTeam?.id || game.away_team_name || 'Away';
        const homeLabel = homeTeam?.id || game.home_team_name || 'Home';
        matchupResults.push({
          type: 'matchup',
          icon: '⚔️',
          label: `${awayLabel} vs ${homeLabel}`,
          sublabel: formatMatchupTime(game),
          onSelect: () => {
            closeMenu();
            navigate(`/mlb-schedule/${gameId}`, { state: { game } });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSearchQuery('');
            setSearchSuggestions([]);
          },
        });
      }
      if (matchupResults.length >= 2) break;
    }

    if (matchupResults.length > 0) {
      setSearchSuggestions(prev => {
        const nonMatchup = prev.filter(r => r.type !== 'matchup');
        return [...matchupResults, ...nonMatchup].slice(0, 8);
      });
    }
  }, [navigate, closeMenu]);

  const buildSuggestions = useCallback((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setSearchSuggestions([]);
      // Clear any pending debounced search
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      return;
    }
    
    const year = parseYearFromQuery(trimmed);
    const normalized = trimmed.replace(/\b20\d{2}\b/, '').trim().toLowerCase();
    const results = [];

    // Check if query looks like an MLB ID (all digits, 5-7 characters)
    const isLikelyMlbId = /^\d{5,7}$/.test(trimmed);

    // 1. Search Players (via API with debounce)
    // Clear previous debounce timer
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Debounce the API call for player search
    if (normalized.length >= 2 || isLikelyMlbId) {
      searchDebounceRef.current = setTimeout(() => {
        searchPlayersAsync(trimmed, results);
      }, 300);
    }

    // 2. Search Teams (all 30 MLB teams) - immediate/local
    if (normalized.length >= 2 && !isLikelyMlbId) {
      const teamMatches = teamOptions.filter((team) => {
        const searchTerms = [
          team.name.toLowerCase(),
          team.id.toLowerCase(),
          team.urlName.replace(/-/g, ' ')
        ];
        return searchTerms.some(term => term.includes(normalized)) ||
               normalized.split(/\s+/).every(word =>
                 searchTerms.some(term => term.includes(word))
               );
      });

      // Trigger matchup search for matched teams (debounced)
      if (teamMatches.length > 0) {
        if (matchupDebounceRef.current) clearTimeout(matchupDebounceRef.current);
        matchupDebounceRef.current = setTimeout(() => {
          searchMatchupsAsync(teamMatches);
        }, 350);
      }

      // Limit to top 2 team matches (reduced to make room for players)
      teamMatches.slice(0, 2).forEach((team) => {
        results.push({
          type: 'team',
          icon: '📊',
          label: `${team.name} Analytics${year ? ` (${year})` : ''}`,
          onSelect: () => {
            closeMenu();
            navigate(`/team-analytics/${team.urlName}${year ? `?season=${year}` : ''}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSearchQuery('');
            setSearchSuggestions([]);
          }
        });

        // Add player analytics for the team
        results.push({
          type: 'players',
          icon: '⚾',
          label: `${team.name} Players${year ? ` (${year})` : ''}`,
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

    // 3. Search Pages by keywords
    const pageMatches = pageOptions.filter((page) => {
      const labelMatch = page.label.toLowerCase().includes(normalized);
      const keywordMatch = page.keywords.some(kw => kw.includes(normalized) || normalized.includes(kw));
      return labelMatch || keywordMatch;
    });

    pageMatches.slice(0, 2).forEach((page) => {
      // Avoid duplicate suggestions
      if (!results.some(r => r.label.includes(page.label))) {
        results.push({
          type: 'page',
          icon: getPageIcon(page.path),
          label: page.label,
          onSelect: () => {
            closeMenu();
            navigate(page.path);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSearchQuery('');
            setSearchSuggestions([]);
          }
        });
      }
    });

    // 4. Search Articles by tags
    const lowerTokens = normalized.split(/\s+/).filter(Boolean);
    const articleMatches = articleTags.filter((tag) => {
      const lowerTag = tag.toLowerCase();
      if (lowerTag.includes(normalized)) return true;
      return lowerTokens.some((token) => lowerTag.includes(token) || token.includes(lowerTag));
    });

    articleMatches.slice(0, 2).forEach((tag) => {
      results.push({
        type: 'article',
        icon: '📰',
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

    // Set local results immediately (player + matchup results will be added async)
    setSearchSuggestions(results.slice(0, 6));
  }, [teamOptions, pageOptions, articleTags, navigate, closeMenu, searchPlayersAsync, searchMatchupsAsync]);

  // Helper function to get icon for page type
  const getPageIcon = (path) => {
    const icons = {
      '/mlb-schedule': '📅',
      '/mlb-standings': '🏅',
      '/team-analytics': '📊',
      '/player-analytics': '⚾',
      '/sandlot-insider': '📰',
      '/blogs': '✍️',
      '/data-science': '👨‍🔬',
      '/how-to-use': '🎯',
      '/glossary': '📖',
      '/faqs': '❓',
      '/responsible-gaming': '🛡️',
      '/features': '⚡',
      '/about': 'ℹ️',
      '/contact': '📧',
    };
    return icons[path] || '🔗';
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
            placeholder="Search teams, players, matchups..."
            aria-label="Search"
          />
          {isSearchFocused && (searchSuggestions.length > 0 || isSearchingPlayers) && (
            <div className="search-suggestions">
              {isSearchingPlayers && searchSuggestions.length === 0 && (
                <div className="search-loading">
                  <span className="suggestion-icon">🔍</span>
                  <span className="suggestion-label">Searching players...</span>
                </div>
              )}
              {searchSuggestions.map((item, idx) => (
                <button
                  key={`${item.type}-${item.playerId || idx}`}
                  type="button"
                  className={`search-suggestion ${item.type === 'player' ? 'player-suggestion' : ''} ${item.type === 'matchup' ? 'matchup-suggestion' : ''}`}
                  onClick={item.onSelect}
                >
                  {item.headshotUrl ? (
                    <img 
                      src={item.headshotUrl} 
                      alt={item.label}
                      className="suggestion-headshot"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span 
                    className="suggestion-icon" 
                    style={item.headshotUrl ? { display: 'none' } : {}}
                  >
                    {item.icon}
                  </span>
                  <div className="suggestion-content">
                    <span className="suggestion-label">{item.label}</span>
                    {item.sublabel ? (
                      <span className="suggestion-sublabel">{item.sublabel}</span>
                    ) : (
                      <span className="suggestion-type">{item.type}</span>
                    )}
                  </div>
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
            onMouseEnter={() => !isMobile && setActiveDropdown('stats')}
            onMouseLeave={() => !isMobile && setActiveDropdown(null)}
          >
            <button 
              type="button" 
              className={`nav-button ${location.pathname.startsWith('/team-analytics') || location.pathname.startsWith('/batter-analytics') || location.pathname.startsWith('/pitcher-analytics') || location.pathname.startsWith('/mlb-schedule') || location.pathname.startsWith('/mlb-standings') || location.pathname.startsWith('/player-analytics') ? 'active' : ''}`}
              onClick={() => toggleDropdown('stats')}
            >
              Stats
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className={`dropdown-menu ${activeDropdown === 'stats' ? 'show' : ''}`}>
              <button onClick={() => handleNavClick('/mlb-schedule')} className="dropdown-item">
                <span className="dropdown-icon">📅</span>
                <div>
                  <div className="dropdown-title">MLB Schedule</div>
                  <div className="dropdown-desc">Daily matchups & Analysis</div>
                </div>
              </button>
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

          {/* Predictions Dropdown */}
          <div
            className="nav-dropdown"
            onMouseEnter={() => !isMobile && setActiveDropdown('predictions')}
            onMouseLeave={() => !isMobile && setActiveDropdown(null)}
          >
            <button
              type="button"
              className={`nav-button ${location.pathname.startsWith('/predictions') ? 'active' : ''}`}
              onClick={() => toggleDropdown('predictions')}
            >
              Predictions
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className={`dropdown-menu ${activeDropdown === 'predictions' ? 'show' : ''}`}>
              <button onClick={() => handleNavClick('/predictions/games')} className="dropdown-item">
                <span className="dropdown-icon">🎯</span>
                <div>
                  <div className="dropdown-title">Game Props</div>
                  <div className="dropdown-desc">Win/loss, totals & spread projections</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/predictions/pitchers')} className="dropdown-item">
                <span className="dropdown-icon">⚾</span>
                <div>
                  <div className="dropdown-title">Pitcher Props</div>
                  <div className="dropdown-desc">Strikeouts, innings & ERA forecasts</div>
                </div>
              </button>
              <button onClick={() => handleNavClick('/predictions/batters')} className="dropdown-item">
                <span className="dropdown-icon">🏏</span>
                <div>
                  <div className="dropdown-title">Batter Props</div>
                  <div className="dropdown-desc">Hits, HRs, RBIs & stolen base props</div>
                </div>
              </button>
            </div>
          </div>

          {/* Insights Dropdown - UPDATED (removed Team Analytics) */}
          <div 
            className="nav-dropdown"
            onMouseEnter={() => !isMobile && setActiveDropdown('insights')}
            onMouseLeave={() => !isMobile && setActiveDropdown(null)}
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
            onMouseEnter={() => !isMobile && setActiveDropdown('education')}
            onMouseLeave={() => !isMobile && setActiveDropdown(null)}
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

          {/* Account/Login Icon — muted, not ready for deployment */}
          {/* <button
            type="button"
            onClick={() => handleNavClick(isAuthenticated ? '/account/settings' : '/account')}
            className={`account-icon ${location.pathname.startsWith('/account') ? 'active' : ''}`}
            aria-label={isAuthenticated ? 'Settings' : 'Account'}
            title={isAuthenticated ? 'Account Settings' : 'Login / Sign Up'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>
            </svg>
          </button> */}
        </nav>
      </div>
    </header>
  );
}

export default Header;
