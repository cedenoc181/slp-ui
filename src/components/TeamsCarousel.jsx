import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home-page-styling/teams-carousel.css';

function TeamsCarousel() {
  const navigate = useNavigate();
  const [activeDiv, setActiveDiv] = useState('all');
  const scrollRef = useRef(null);

  const divisions = [
    { id: 'all', label: 'All Teams' },
    { id: 'al-east', label: 'AL East' },
    { id: 'al-central', label: 'AL Central' },
    { id: 'al-west', label: 'AL West' },
    { id: 'nl-east', label: 'NL East' },
    { id: 'nl-central', label: 'NL Central' },
    { id: 'nl-west', label: 'NL West' },
  ];

  const teams = [
    // AL East
    { id: 'NYY', name: 'Yankees', city: 'New York', division: 'al-east', color: '#003087', urlName: 'new-york-yankees' },
    { id: 'BOS', name: 'Red Sox', city: 'Boston', division: 'al-east', color: '#BD3039', urlName: 'boston-red-sox' },
    { id: 'TOR', name: 'Blue Jays', city: 'Toronto', division: 'al-east', color: '#134A8E', urlName: 'toronto-blue-jays' },
    { id: 'BAL', name: 'Orioles', city: 'Baltimore', division: 'al-east', color: '#DF4601', urlName: 'baltimore-orioles' },
    { id: 'TBR', name: 'Rays', city: 'Tampa Bay', division: 'al-east', color: '#092C5C', urlName: 'tampa-bay-rays' },
    // AL Central
    { id: 'CLE', name: 'Guardians', city: 'Cleveland', division: 'al-central', color: '#00385D', urlName: 'cleveland-guardians' },
    { id: 'MIN', name: 'Twins', city: 'Minnesota', division: 'al-central', color: '#002B5C', urlName: 'minnesota-twins' },
    { id: 'DET', name: 'Tigers', city: 'Detroit', division: 'al-central', color: '#0C2340', urlName: 'detroit-tigers' },
    { id: 'CHW', name: 'White Sox', city: 'Chicago', division: 'al-central', color: '#27251F', urlName: 'chicago-white-sox' },
    { id: 'KCR', name: 'Royals', city: 'Kansas City', division: 'al-central', color: '#004687', urlName: 'kansas-city-royals' },
    // AL West
    { id: 'HOU', name: 'Astros', city: 'Houston', division: 'al-west', color: '#002D62', urlName: 'houston-astros' },
    { id: 'TEX', name: 'Rangers', city: 'Texas', division: 'al-west', color: '#003278', urlName: 'texas-rangers' },
    { id: 'SEA', name: 'Mariners', city: 'Seattle', division: 'al-west', color: '#0C2C56', urlName: 'seattle-mariners' },
    { id: 'LAA', name: 'Angels', city: 'Los Angeles', division: 'al-west', color: '#BA0021', urlName: 'los-angeles-angels' },
    { id: 'OAK', name: 'Athletics', city: 'Oakland', division: 'al-west', color: '#003831', urlName: 'oakland-athletics' },
    // NL East
    { id: 'ATL', name: 'Braves', city: 'Atlanta', division: 'nl-east', color: '#CE1141', urlName: 'atlanta-braves' },
    { id: 'PHI', name: 'Phillies', city: 'Philadelphia', division: 'nl-east', color: '#E81828', urlName: 'philadelphia-phillies' },
    { id: 'NYM', name: 'Mets', city: 'New York', division: 'nl-east', color: '#002D72', urlName: 'new-york-mets' },
    { id: 'MIA', name: 'Marlins', city: 'Miami', division: 'nl-east', color: '#00A3E0', urlName: 'miami-marlins' },
    { id: 'WSN', name: 'Nationals', city: 'Washington', division: 'nl-east', color: '#AB0003', urlName: 'washington-nationals' },
    // NL Central
    { id: 'MIL', name: 'Brewers', city: 'Milwaukee', division: 'nl-central', color: '#12284B', urlName: 'milwaukee-brewers' },
    { id: 'CHC', name: 'Cubs', city: 'Chicago', division: 'nl-central', color: '#0E3386', urlName: 'chicago-cubs' },
    { id: 'STL', name: 'Cardinals', city: 'St. Louis', division: 'nl-central', color: '#C41E3A', urlName: 'st-louis-cardinals' },
    { id: 'PIT', name: 'Pirates', city: 'Pittsburgh', division: 'nl-central', color: '#27251F', urlName: 'pittsburgh-pirates' },
    { id: 'CIN', name: 'Reds', city: 'Cincinnati', division: 'nl-central', color: '#C6011F', urlName: 'cincinnati-reds' },
    // NL West
    { id: 'LAD', name: 'Dodgers', city: 'Los Angeles', division: 'nl-west', color: '#005A9C', urlName: 'los-angeles-dodgers' },
    { id: 'SDP', name: 'Padres', city: 'San Diego', division: 'nl-west', color: '#2F241D', urlName: 'san-diego-padres' },
    { id: 'ARI', name: 'D-backs', city: 'Arizona', division: 'nl-west', color: '#A71930', urlName: 'arizona-diamondbacks' },
    { id: 'SFG', name: 'Giants', city: 'San Francisco', division: 'nl-west', color: '#FD5A1E', urlName: 'san-francisco-giants' },
    { id: 'COL', name: 'Rockies', city: 'Colorado', division: 'nl-west', color: '#33006F', urlName: 'colorado-rockies' },
  ];

  const filteredTeams = activeDiv === 'all' 
    ? teams 
    : teams.filter(team => team.division === activeDiv);

  const handleTeamClick = (team) => {
    navigate(`/team-analytics/${team.urlName}`);
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="teams-carousel">
      <div className="container">
        {/* Header */}
        <div className="carousel-header">
          <div className="header-text">
            <span className="carousel-badge">
              <span className="badge-icon">🏟️</span>
              EXPLORE TEAMS
            </span>
            <h2>All 30 MLB Teams</h2>
            <p>Click any team to view their full analytics dashboard</p>
          </div>
        </div>

        {/* Division Tabs */}
        <div className="division-tabs">
          {divisions.map(div => (
            <button
              key={div.id}
              className={`division-tab ${activeDiv === div.id ? 'active' : ''}`}
              onClick={() => setActiveDiv(div.id)}
            >
              {div.label}
            </button>
          ))}
        </div>

        {/* Teams Scroll Container */}
        <div className="teams-scroll-wrapper">
          <button 
            className="scroll-btn scroll-left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="teams-scroll" ref={scrollRef}>
            {filteredTeams.map(team => (
              <div 
                key={team.id}
                className="team-card"
                onClick={() => handleTeamClick(team)}
                style={{ '--team-color': team.color }}
              >
                <div className="team-logo-wrapper">
                  <span className="team-abbr">{team.id}</span>
                </div>
                <div className="team-info">
                  <span className="team-city">{team.city}</span>
                  <span className="team-name">{team.name}</span>
                </div>
                <div className="team-hover-indicator">
                  <span>View Stats</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="scroll-btn scroll-right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="carousel-footer">
          <div className="footer-stat">
            <span className="footer-stat-value">30</span>
            <span className="footer-stat-label">Teams</span>
          </div>
          <div className="footer-divider"></div>
          <div className="footer-stat">
            <span className="footer-stat-value">6</span>
            <span className="footer-stat-label">Divisions</span>
          </div>
          <div className="footer-divider"></div>
          <div className="footer-stat">
            <span className="footer-stat-value">2</span>
            <span className="footer-stat-label">Leagues</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TeamsCarousel;
