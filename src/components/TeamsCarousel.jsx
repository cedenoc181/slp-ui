import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEAMS } from '../data/constants/apiConstants';
import '../styles/home-page-styling/teams-carousel.css';

// Team colors mapping (not available from API)
const TEAM_COLORS = {
  ATH: '#003831',
  PIT: '#27251F',
  SD: '#2F241D',
  SEA: '#0C2C56',
  SF: '#FD5A1E',
  STL: '#C41E3A',
  TB: '#092C5C',
  TEX: '#003278',
  TOR: '#134A8E',
  MIN: '#002B5C',
  PHI: '#E81828',
  ATL: '#CE1141',
  CWS: '#27251F',
  MIA: '#00A3E0',
  NYY: '#003087',
  MIL: '#12284B',
  LAA: '#BA0021',
  AZ: '#A71930',
  BAL: '#DF4601',
  BOS: '#BD3039',
  CHC: '#0E3386',
  CIN: '#C6011F',
  CLE: '#00385D',
  COL: '#33006F',
  DET: '#0C2340',
  HOU: '#002D62',
  KC: '#004687',
  LAD: '#005A9C',
  WSH: '#AB0003',
  NYM: '#002D72',
};

// Static team list sorted by division order — no API call needed
const divOrder = ['al-east', 'al-central', 'al-west', 'nl-east', 'nl-central', 'nl-west'];
const ALL_TEAMS = TEAMS
  .filter(t => t.city && t.division)
  .map(t => ({ ...t, color: TEAM_COLORS[t.id] || '#1976D2' }))
  .sort((a, b) => divOrder.indexOf(a.division) - divOrder.indexOf(b.division));

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

  const filteredTeams = activeDiv === 'all'
    ? ALL_TEAMS
    : ALL_TEAMS.filter(team => team.division === activeDiv);

  const handleTeamClick = (team) => {
    navigate(`/team-analytics/${team.urlName}`);
    window.scrollTo(0, 0);
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

          <div className={`teams-scroll ${filteredTeams.length > 6 ? 'scrollable' : ''}`} ref={scrollRef}>
            {filteredTeams.map(team => (
                <div 
                  key={team.id}
                  className="team-card"
                  onClick={() => handleTeamClick(team)}
                  style={{ '--team-color': team.color }}
                >
                  <div className="team-logo-wrapper">
                    <img 
                      src={`https://www.mlbstatic.com/team-logos/${team.mlbId}.svg`}
                      alt={`${team.name} logo`}
                      className="team-logo-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <span className="team-abbr" style={{ display: 'none' }}>{team.id}</span>
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
            <span className="footer-stat-value">{ALL_TEAMS.length}</span>
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
