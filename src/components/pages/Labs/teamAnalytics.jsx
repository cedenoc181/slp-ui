import React, { useState } from 'react';
import '../../../styles/team-analytics.css';

function TeamAnalytics() {
  const [selectedTeam, setSelectedTeam] = useState('LAD');
  const [timeframe, setTimeframe] = useState('season');
  const [chartFilter, setChartFilter] = useState('season');
  const [leadersToggle, setLeadersToggle] = useState('batting'); // 'batting' or 'pitching'
  const [teamStatsToggle, setTeamStatsToggle] = useState('batting'); // 'batting' or 'pitching'

  // Mock data - will be replaced with API later
  const teams = [
    { id: 'LAD', name: 'Los Angeles Dodgers', logo: '⚾' },
    { id: 'NYY', name: 'New York Yankees', logo: '⚾' },
    { id: 'HOU', name: 'Houston Astros', logo: '⚾' },
    { id: 'ATL', name: 'Atlanta Braves', logo: '⚾' },
    // Add more teams...
  ];

  const teamData = {
  // Season data (full season)
  season: {
    overall: {
      wins: 100,
      losses: 62,
      winPct: 0.617,
      runsScored: 906,
      runsAllowed: 672,
      runDiff: 234,
      streak: 'W5'
    },
    overviewSplits: {
      home: { wins: 54, losses: 27, winPct: 0.667 },
      away: { wins: 46, losses: 35, winPct: 0.568 }
    },
    splits: {
      season: {
        vsLHP: { wins: 38, losses: 22, winPct: 0.633 },
        vsRHP: { wins: 62, losses: 40, winPct: 0.608 },
        day: { wins: 28, losses: 18, winPct: 0.609 },
        night: { wins: 72, losses: 44, winPct: 0.621 }
      },
      home: {
        vsLHP: { wins: 21, losses: 10, winPct: 0.677 },
        vsRHP: { wins: 33, losses: 17, winPct: 0.660 },
        day: { wins: 15, losses: 8, winPct: 0.652 },
        night: { wins: 39, losses: 19, winPct: 0.672 }
      },
      away: {
        vsLHP: { wins: 17, losses: 12, winPct: 0.586 },
        vsRHP: { wins: 29, losses: 23, winPct: 0.558 },
        day: { wins: 13, losses: 10, winPct: 0.565 },
        night: { wins: 33, losses: 25, winPct: 0.569 }
      }
    },
    last10: {
      season: { wins: 7, losses: 3, runsScored: 52, runsAllowed: 38 },
      home: { wins: 6, losses: 4, runsScored: 48, runsAllowed: 35 },
      away: { wins: 5, losses: 5, runsScored: 42, runsAllowed: 40 }
    },
    trends: {
      season: [
        { date: 'Apr', wins: 18, losses: 8 },
        { date: 'May', wins: 20, losses: 10 },
        { date: 'Jun', wins: 17, losses: 13 },
        { date: 'Jul', wins: 21, losses: 9 },
        { date: 'Aug', wins: 15, losses: 14 },
        { date: 'Sep', wins: 9, losses: 8 }
      ],
      home: [
        { date: 'Apr', wins: 10, losses: 4 },
        { date: 'May', wins: 11, losses: 4 },
        { date: 'Jun', wins: 9, losses: 6 },
        { date: 'Jul', wins: 12, losses: 3 },
        { date: 'Aug', wins: 7, losses: 7 },
        { date: 'Sep', wins: 5, losses: 3 }
      ],
      away: [
        { date: 'Apr', wins: 8, losses: 4 },
        { date: 'May', wins: 9, losses: 6 },
        { date: 'Jun', wins: 8, losses: 7 },
        { date: 'Jul', wins: 9, losses: 6 },
        { date: 'Aug', wins: 8, losses: 7 },
        { date: 'Sep', wins: 4, losses: 5 }
      ]
    },
    // NEW: Team Standings Data
    standings: {
      rank: 1,
      wins: 100,
      losses: 62,
      winPct: 0.617,
      gamesBack: 0,
      streak: 'W5',
      divisionRank: '1st NL West'
    },
    // NEW: Team Leaders Data
    leaders: {
      batting: {
        homeRuns: { player: 'Mookie Betts', value: 39, stat: 'HR' },
        average: { player: 'Freddie Freeman', value: .331, stat: 'AVG' },
        rbi: { player: 'Will Smith', value: 108, stat: 'RBI' }
      },
      pitching: {
        strikeouts: { player: 'Clayton Kershaw', value: 189, stat: 'K' },
        era: { player: 'Julio Urías', value: 2.16, stat: 'ERA' },
        wins: { player: 'Tony Gonsolin', value: 16, stat: 'W' }
      }
    },
    // NEW: Team Stats Data
    teamStats: {
      batting: {
        average: .265,
        ops: .789,
        strikeoutRate: 21.3,
        offenseRank: 2
      },
      pitching: {
        era: 3.17,
        whip: 1.12,
        qualityStarts: 78,
        oppAvg: .228
      }
    }
  },
  
  // First Half data (pre-All-Star break)
  'first-half': {
    overall: {
      wins: 52,
      losses: 31,
      winPct: 0.627,
      runsScored: 462,
      runsAllowed: 338,
      runDiff: 124,
      streak: 'W3'
    },
    overviewSplits: {
      home: { wins: 28, losses: 14, winPct: 0.667 },
      away: { wins: 24, losses: 17, winPct: 0.585 }
    },
    splits: {
      season: {
        vsLHP: { wins: 20, losses: 11, winPct: 0.645 },
        vsRHP: { wins: 32, losses: 20, winPct: 0.615 },
        day: { wins: 14, losses: 9, winPct: 0.609 },
        night: { wins: 38, losses: 22, winPct: 0.633 }
      },
      home: {
        vsLHP: { wins: 11, losses: 5, winPct: 0.688 },
        vsRHP: { wins: 17, losses: 9, winPct: 0.654 },
        day: { wins: 8, losses: 4, winPct: 0.667 },
        night: { wins: 20, losses: 10, winPct: 0.667 }
      },
      away: {
        vsLHP: { wins: 9, losses: 6, winPct: 0.600 },
        vsRHP: { wins: 15, losses: 11, winPct: 0.577 },
        day: { wins: 6, losses: 5, winPct: 0.545 },
        night: { wins: 18, losses: 12, winPct: 0.600 }
      }
    },
    last10: {
      season: { wins: 6, losses: 4, runsScored: 48, runsAllowed: 42 },
      home: { wins: 5, losses: 2, runsScored: 38, runsAllowed: 28 },
      away: { wins: 4, losses: 3, runsScored: 32, runsAllowed: 30 }
    },
    trends: {
      season: [
        { date: 'Apr', wins: 18, losses: 8 },
        { date: 'May', wins: 20, losses: 10 },
        { date: 'Jun', wins: 14, losses: 13 }
      ],
      home: [
        { date: 'Apr', wins: 10, losses: 4 },
        { date: 'May', wins: 11, losses: 4 },
        { date: 'Jun', wins: 7, losses: 6 }
      ],
      away: [
        { date: 'Apr', wins: 8, losses: 4 },
        { date: 'May', wins: 9, losses: 6 },
        { date: 'Jun', wins: 7, losses: 7 }
      ]
    },
    standings: {
      rank: 1,
      wins: 52,
      losses: 31,
      winPct: 0.627,
      gamesBack: 0,
      streak: 'W3',
      divisionRank: '1st NL West'
    },
    leaders: {
      batting: {
        homeRuns: { player: 'Mookie Betts', value: 20, stat: 'HR' },
        average: { player: 'Freddie Freeman', value: .338, stat: 'AVG' },
        rbi: { player: 'Will Smith', value: 54, stat: 'RBI' }
      },
      pitching: {
        strikeouts: { player: 'Clayton Kershaw', value: 98, stat: 'K' },
        era: { player: 'Julio Urías', value: 2.08, stat: 'ERA' },
        wins: { player: 'Tony Gonsolin', value: 9, stat: 'W' }
      }
    },
    teamStats: {
      batting: {
        average: .268,
        ops: .795,
        strikeoutRate: 20.8,
        offenseRank: 1
      },
      pitching: {
        era: 3.02,
        whip: 1.08,
        qualityStarts: 42,
        oppAvg: .221
      }
    }
  },
  
  // Second Half data (post-All-Star break)
  'second-half': {
    overall: {
      wins: 48,
      losses: 31,
      winPct: 0.608,
      runsScored: 444,
      runsAllowed: 334,
      runDiff: 110,
      streak: 'W5'
    },
    overviewSplits: {
      home: { wins: 26, losses: 13, winPct: 0.667 },
      away: { wins: 22, losses: 18, winPct: 0.550 }
    },
    splits: {
      season: {
        vsLHP: { wins: 18, losses: 11, winPct: 0.621 },
        vsRHP: { wins: 30, losses: 20, winPct: 0.600 },
        day: { wins: 14, losses: 9, winPct: 0.609 },
        night: { wins: 34, losses: 22, winPct: 0.607 }
      },
      home: {
        vsLHP: { wins: 10, losses: 5, winPct: 0.667 },
        vsRHP: { wins: 16, losses: 8, winPct: 0.667 },
        day: { wins: 7, losses: 4, winPct: 0.636 },
        night: { wins: 19, losses: 9, winPct: 0.679 }
      },
      away: {
        vsLHP: { wins: 8, losses: 6, winPct: 0.571 },
        vsRHP: { wins: 14, losses: 12, winPct: 0.538 },
        day: { wins: 7, losses: 5, winPct: 0.583 },
        night: { wins: 15, losses: 13, winPct: 0.536 }
      }
    },
    last10: {
      season: { wins: 7, losses: 3, runsScored: 52, runsAllowed: 38 },
      home: { wins: 6, losses: 4, runsScored: 48, runsAllowed: 35 },
      away: { wins: 5, losses: 5, runsScored: 42, runsAllowed: 40 }
    },
    trends: {
      season: [
        { date: 'Jul', wins: 21, losses: 9 },
        { date: 'Aug', wins: 15, losses: 14 },
        { date: 'Sep', wins: 12, losses: 8 }
      ],
      home: [
        { date: 'Jul', wins: 12, losses: 3 },
        { date: 'Aug', wins: 7, losses: 7 },
        { date: 'Sep', wins: 7, losses: 3 }
      ],
      away: [
        { date: 'Jul', wins: 9, losses: 6 },
        { date: 'Aug', wins: 8, losses: 7 },
        { date: 'Sep', wins: 5, losses: 5 }
      ]
    },
    standings: {
      rank: 1,
      wins: 48,
      losses: 31,
      winPct: 0.608,
      gamesBack: 0,
      streak: 'W5',
      divisionRank: '1st NL West'
    },
    leaders: {
      batting: {
        homeRuns: { player: 'Mookie Betts', value: 19, stat: 'HR' },
        average: { player: 'Freddie Freeman', value: .324, stat: 'AVG' },
        rbi: { player: 'Will Smith', value: 54, stat: 'RBI' }
      },
      pitching: {
        strikeouts: { player: 'Clayton Kershaw', value: 91, stat: 'K' },
        era: { player: 'Julio Urías', value: 2.24, stat: 'ERA' },
        wins: { player: 'Tony Gonsolin', value: 7, stat: 'W' }
      }
    },
    teamStats: {
      batting: {
        average: .262,
        ops: .783,
        strikeoutRate: 21.8,
        offenseRank: 3
      },
      pitching: {
        era: 3.32,
        whip: 1.16,
        qualityStarts: 36,
        oppAvg: .235
      }
    }
  },
  
  // Upcoming games (shared across all timeframes)
  upcoming: [
    { date: '11/18', opponent: 'SF Giants', location: 'Home', pitchMatchup: 'Kershaw vs Webb' },
    { date: '11/19', opponent: 'SF Giants', location: 'Home', pitchMatchup: 'Buehler vs Cobb' },
    { date: '11/20', opponent: 'SD Padres', location: 'Away', pitchMatchup: 'Urías vs Darvish' }
  ]
};

const currentTimeframeData = teamData[timeframe];
const currentChartData = currentTimeframeData.trends[chartFilter];
const currentSplitsData = currentTimeframeData.splits[chartFilter];
const currentLast10Data = currentTimeframeData.last10[chartFilter];

  return (
    <div className="team-analytics-page">
      {/* Header Section */}
      <div className="analytics-header">
        <div className="container">
          <div className="header-content">
            <div className="team-selector-wrapper">
              <h1>Team Analytics Dashboard</h1>
              <div className="team-selector">
                <select 
                  value={selectedTeam} 
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="team-dropdown"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="timeframe-tabs">
              <button 
                className={`tab ${timeframe === 'season' ? 'active' : ''}`}
                onClick={() => setTimeframe('season')}
              >
                Season
              </button>
              <button 
                className={`tab ${timeframe === 'first-half' ? 'active' : ''}`}
                onClick={() => setTimeframe('first-half')}
              >
                1st Half
              </button>
              <button 
                className={`tab ${timeframe === 'second-half' ? 'active' : ''}`}
                onClick={() => setTimeframe('second-half')}
              >
                2nd Half
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="analytics-content container">
        {/* Overview Cards */}
        <div className="overview-section">
          <div className="stat-card highlight">
            <div className="stat-header">
              <span className="stat-label">Record</span>
              <span className={`trend-badge ${currentTimeframeData.overall.streak.startsWith('W') ? 'positive' : 'negative'}`}>
                {currentTimeframeData.overall.streak}
              </span>
            </div>
            <div className="stat-value">
              {currentTimeframeData.overall.wins}-{currentTimeframeData.overall.losses}
            </div>
            <div className="stat-detail">
              Win % {(currentTimeframeData.overall.winPct * 100).toFixed(1)}%
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Run Differential</span>
            </div>
            <div className="stat-value positive">
              +{currentTimeframeData.overall.runDiff}
            </div>
            <div className="stat-detail">
              {currentTimeframeData.overall.runsScored} RS / {currentTimeframeData.overall.runsAllowed} RA
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Home Record</span>
            </div>
            <div className="stat-value">
              {currentTimeframeData.overviewSplits.home.wins}-{currentTimeframeData.overviewSplits.home.losses}
            </div>
            <div className="stat-detail">
              {(currentTimeframeData.overviewSplits.home.winPct * 100).toFixed(1)}% win rate
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Away Record</span>
            </div>
            <div className="stat-value">
              {currentTimeframeData.overviewSplits.away.wins}-{currentTimeframeData.overviewSplits.away.losses}
            </div>
            <div className="stat-detail">
              {(currentTimeframeData.overviewSplits.away.winPct * 100).toFixed(1)}% win rate
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="chart-section">
          <div className="section-card">
            <div className="card-header">
               <div>
                <h3>Monthly Performance Trends</h3>
                <p className="card-subtitle">Track performance across the season</p>
               </div>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot wins"></span> Wins
                </span>
                <span className="legend-item">
                  <span className="legend-dot losses"></span> Losses
                </span>
              </div>
            </div>

            <div className="chart-container">
              <div className="bar-chart">
                {currentChartData.map((month, idx) => {
                  const totalGames = month.wins + month.losses;
                  const winPct = totalGames > 0 ? (month.wins / totalGames * 100).toFixed(1) : 0;
                
                  return (
                    <div key={idx} className="bar-group">
                      <div className="bar-wrapper">
                        {/* Win Bar */}
                        <div 
                          className="bar wins" 
                          style={{ height: `${(month.wins / 30) * 100}%` }}
                        >
                          <span className="bar-label">{month.wins}</span>
                        </div>
                        {/* Loss Bar */}
                        <div 
                          className="bar losses" 
                          style={{ height: `${(month.losses / 30) * 100}%` }}
                        >
                          <span className="bar-label">{month.losses}</span>
                        </div>
                      </div>
                      <div className="bar-month">{month.date}</div>
                      <div className="bar-win-pct" style={{ 
                         color: winPct >= 60 ? '#4CAF50' : winPct >= 50 ? '#FF9800' : '#F44336' 
                            }}>{winPct}%</div>
                    </div>
                  );
                })}
              </div>

              {/* Chart Filter Buttons */}
              <div className="chart-filters">
                <button 
                  className={`chart-filter-btn ${chartFilter === 'season' ? 'active' : ''}`}
                  onClick={() => setChartFilter('season')}
                >
                  <span className="filter-icon">📊</span>
                  Season
                </button>
                <button 
                  className={`chart-filter-btn ${chartFilter === 'home' ? 'active' : ''}`}
                  onClick={() => setChartFilter('home')}
                >
                  <span className="filter-icon">🏠</span>
                  Home
                </button>
                <button 
                  className={`chart-filter-btn ${chartFilter === 'away' ? 'active' : ''}`}
                  onClick={() => setChartFilter('away')}
                >
                  <span className="filter-icon">✈️</span>
                  Away
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Split Stats Grid */}
        <div className="splits-section">
          <div className="section-card">
            <div className="card-header">
              <h3>Performance Splits</h3>
                <p className="card-subtitle">
                  {chartFilter === 'season' && <><span className="subtitle-bold">📊 Season</span> performance breakdown</>}
                  {chartFilter === 'home' && <><span className="subtitle-bold">🏠 Home</span> game performance breakdown</>}
                  {chartFilter === 'away' && <><span className="subtitle-bold">✈️ Away</span> game performance breakdown</>}
                </p>
            </div>
            <div className="splits-grid">
              <div className="split-row">
                <div className="split-label">vs Left-Handed Pitching</div>
                <div className="split-stats">
                  <span className="split-record">
                    {currentSplitsData.vsLHP.wins}-{currentSplitsData.vsLHP.losses}
                  </span>
                  <span 
                    className="split-pct"
                    style={{
                      color: (currentSplitsData.vsLHP.winPct * 100) >= 60 ? '#4CAF50' : 
                             (currentSplitsData.vsLHP.winPct * 100) >= 50 ? '#FF9800' : '#F44336'
                    }}
                  >
                    {(currentSplitsData.vsLHP.winPct * 100).toFixed(1)}%
                  </span>
                  <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${currentSplitsData.vsLHP.winPct * 100}%`,
                      backgroundColor: (currentSplitsData.vsLHP.winPct * 100) >= 60 ? '#4CAF50' : 
                                       (currentSplitsData.vsLHP.winPct * 100) >= 50 ? '#FF9800' : '#F44336'
                    }}
                  ></div>
                  </div>
                </div>
              </div>

              <div className="split-row">
                <div className="split-label">vs Right-Handed Pitching</div>
                <div className="split-stats">
                  <span className="split-record">
                    {currentSplitsData.vsRHP.wins}-{currentSplitsData.vsRHP.losses}
                  </span>
                  <span 
                    className="split-pct"
                    style={{
                      color: (currentSplitsData.vsRHP.winPct * 100) >= 60 ? '#4CAF50' : 
                             (currentSplitsData.vsRHP.winPct * 100) >= 50 ? '#FF9800' : '#F44336'
                    }}
                  >
                    {(currentSplitsData.vsRHP.winPct * 100).toFixed(1)}%
                  </span>
                  <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${currentSplitsData.vsRHP.winPct * 100}%`,
                      backgroundColor: (currentSplitsData.vsRHP.winPct * 100) >= 60 ? '#4CAF50' : 
                                       (currentSplitsData.vsRHP.winPct * 100) >= 50 ? '#FF9800' : '#F44336'
                    }}
                  ></div>
                  </div>
                </div>
              </div>

              <div className="split-row">
                <div className="split-label">Day Games</div>
                <div className="split-stats">
                  <span className="split-record">
                    {currentSplitsData.day.wins}-{currentSplitsData.day.losses}
                  </span>
                  <span 
                    className="split-pct"
                    style={{
                      color: (currentSplitsData.day.winPct * 100) >= 60 ? '#4CAF50' : 
                             (currentSplitsData.day.winPct * 100) >= 50 ? '#FF9800' : '#F44336'
                    }}
                  >
                    {(currentSplitsData.day.winPct * 100).toFixed(1)}%
                  </span>
                  <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${currentSplitsData.day.winPct * 100}%`,
                      backgroundColor: (currentSplitsData.day.winPct * 100) >= 60 ? '#4CAF50' : 
                                       (currentSplitsData.day.winPct * 100) >= 50 ? '#FF9800' : '#F44336'
                    }}
                  ></div>
                  </div>
                </div>
              </div>

             <div className="split-row">
               <div className="split-label">Night Games</div>
               <div className="split-stats">
                 <span className="split-record">
                   {currentSplitsData.night.wins}-{currentSplitsData.night.losses}
                 </span>
                 <span 
                   className="split-pct"
                   style={{
                     color: (currentSplitsData.night.winPct * 100) >= 60 ? '#4CAF50' : 
                            (currentSplitsData.night.winPct * 100) >= 50 ? '#FF9800' : '#F44336'
                   }}
                 >
                   {(currentSplitsData.night.winPct * 100).toFixed(1)}%
                 </span>
                 <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${currentSplitsData.night.winPct * 100}%`,
                      backgroundColor: (currentSplitsData.night.winPct * 100) >= 60 ? '#4CAF50' : 
                                       (currentSplitsData.night.winPct * 100) >= 50 ? '#FF9800' : '#F44336'
                    }}
                  ></div>
                 </div>
               </div>
             </div>
           </div>
         </div>

          {/* Last 10 Games */}
          <div className="section-card">
            <div className="card-header">
                <div>
                    <h3>Last 10 Games</h3>
                     <p className="card-subtitle">
                       {chartFilter === 'season' && <><strong>📊 Season: </strong> last 10 games performance</>}
                       {chartFilter === 'home' && <><strong>🏠 Home: </strong> last 10 games performance</>}
                       {chartFilter === 'away' && <><strong>✈️ Away: </strong> last 10 games performance</>}
                     </p>
                </div>
            </div>
            <div className="last-10-stats">
              <div className="last-10-item">
                <div className="last-10-label">Record</div>
                <div className="last-10-value">
                  {currentLast10Data.wins}-{currentLast10Data.losses}
                </div>
              </div>
              <div className="last-10-item">
                <div className="last-10-label">Runs Scored</div>
                <div className="last-10-value">{currentLast10Data.runsScored}</div>
              </div>
              <div className="last-10-item">
                <div className="last-10-label">Runs Allowed</div>
                <div className="last-10-value">{currentLast10Data.runsAllowed}</div>
              </div>
              <div className="last-10-item">
                <div className="last-10-label">Run Differential</div>
                <div className={`last-10-value ${currentLast10Data.runsScored - currentLast10Data.runsAllowed > 0 ? 'positive' : currentLast10Data.runsScored - currentLast10Data.runsAllowed < 0 ? 'negative' : ''}`}>
                  {currentLast10Data.runsScored - currentLast10Data.runsAllowed > 0 ? '+' : ''}{currentLast10Data.runsScored - currentLast10Data.runsAllowed}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NEW: Team Info Grid - Standings, Leaders, Stats - MOVED HERE */}
        <div className="team-info-grid">
          {/* 1. Team Standings */}
          <div className="section-card">
            <div className="card-header">
              <h3>Team Standings</h3>
              <p className="card-subtitle">{currentTimeframeData.standings.divisionRank}</p>
            </div>
            <div className="standings-content">
              <div className="standings-row">
                <span className="standings-label">Wins</span>
                <span className="standings-value">{currentTimeframeData.standings.wins}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Losses</span>
                <span className="standings-value">{currentTimeframeData.standings.losses}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Win %</span>
                <span className="standings-value">{currentTimeframeData.standings.winPct.toFixed(3)}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Games Back</span>
                <span className="standings-value">{currentTimeframeData.standings.gamesBack === 0 ? '-' : currentTimeframeData.standings.gamesBack}</span>
              </div>
              <div className="standings-row highlight">
                <span className="standings-label">Streak</span>
                <span className={`standings-value streak-badge ${currentTimeframeData.standings.streak.startsWith('W') ? 'positive' : 'negative'}`}>
                  {currentTimeframeData.standings.streak}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Team Leaders */}
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Team Leaders</h3>
                <p className="card-subtitle">Top performers</p>
              </div>
              <div className="toggle-buttons">
                <button 
                  className={`toggle-btn ${leadersToggle === 'batting' ? 'active' : ''}`}
                  onClick={() => setLeadersToggle('batting')}
                >
                  Batting
                </button>
                <button 
                  className={`toggle-btn ${leadersToggle === 'pitching' ? 'active' : ''}`}
                  onClick={() => setLeadersToggle('pitching')}
                >
                  Pitching
                </button>
              </div>
            </div>
            
            {leadersToggle === 'batting' ? (
              <div className="leaders-content">
                <div className="leader-row">
                  <div className="leader-stat-label">Home Runs</div>
                  <div className="leader-info">
                    <span className="leader-player">{currentTimeframeData.leaders.batting.homeRuns.player}</span>
                    <span className="leader-value">{currentTimeframeData.leaders.batting.homeRuns.value}</span>
                  </div>
                </div>
                <div className="leader-row">
                  <div className="leader-stat-label">Batting Average</div>
                  <div className="leader-info">
                    <span className="leader-player">{currentTimeframeData.leaders.batting.average.player}</span>
                    <span className="leader-value">{currentTimeframeData.leaders.batting.average.value.toFixed(3)}</span>
                  </div>
                </div>
                <div className="leader-row">
                  <div className="leader-stat-label">RBI</div>
                  <div className="leader-info">
                    <span className="leader-player">{currentTimeframeData.leaders.batting.rbi.player}</span>
                    <span className="leader-value">{currentTimeframeData.leaders.batting.rbi.value}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="leaders-content">
                <div className="leader-row">
                  <div className="leader-stat-label">Strikeouts</div>
                  <div className="leader-info">
                    <span className="leader-player">{currentTimeframeData.leaders.pitching.strikeouts.player}</span>
                    <span className="leader-value">{currentTimeframeData.leaders.pitching.strikeouts.value}</span>
                  </div>
                </div>
                <div className="leader-row">
                  <div className="leader-stat-label">ERA</div>
                  <div className="leader-info">
                    <span className="leader-player">{currentTimeframeData.leaders.pitching.era.player}</span>
                    <span className="leader-value">{currentTimeframeData.leaders.pitching.era.value.toFixed(2)}</span>
                  </div>
                </div>
                <div className="leader-row">
                  <div className="leader-stat-label">Wins</div>
                  <div className="leader-info">
                    <span className="leader-player">{currentTimeframeData.leaders.pitching.wins.player}</span>
                    <span className="leader-value">{currentTimeframeData.leaders.pitching.wins.value}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Team Stats */}
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Team Stats</h3>
                <p className="card-subtitle">Overall performance</p>
              </div>
              <div className="toggle-buttons">
                <button 
                  className={`toggle-btn ${teamStatsToggle === 'batting' ? 'active' : ''}`}
                  onClick={() => setTeamStatsToggle('batting')}
                >
                  Batting
                </button>
                <button 
                  className={`toggle-btn ${teamStatsToggle === 'pitching' ? 'active' : ''}`}
                  onClick={() => setTeamStatsToggle('pitching')}
                >
                  Pitching
                </button>
              </div>
            </div>
            
            {teamStatsToggle === 'batting' ? (
              <div className="team-stats-content">
                <div className="team-stat-row">
                  <span className="team-stat-label">Team AVG</span>
                  <span className="team-stat-value">{currentTimeframeData.teamStats.batting.average.toFixed(3)}</span>
                </div>
                <div className="team-stat-row">
                  <span className="team-stat-label">OPS</span>
                  <span className="team-stat-value">{currentTimeframeData.teamStats.batting.ops.toFixed(3)}</span>
                </div>
                <div className="team-stat-row">
                  <span className="team-stat-label">K Rate</span>
                  <span className="team-stat-value">{currentTimeframeData.teamStats.batting.strikeoutRate.toFixed(1)}%</span>
                </div>
                <div className="team-stat-row highlight">
                  <span className="team-stat-label">Offense Rank</span>
                  <span className="team-stat-value rank">#{currentTimeframeData.teamStats.batting.offenseRank}</span>
                </div>
              </div>
            ) : (
              <div className="team-stats-content">
                <div className="team-stat-row">
                  <span className="team-stat-label">Team ERA</span>
                  <span className="team-stat-value">{currentTimeframeData.teamStats.pitching.era.toFixed(2)}</span>
                </div>
                <div className="team-stat-row">
                  <span className="team-stat-label">WHIP</span>
                  <span className="team-stat-value">{currentTimeframeData.teamStats.pitching.whip.toFixed(2)}</span>
                </div>
                <div className="team-stat-row">
                  <span className="team-stat-label">Quality Starts</span>
                  <span className="team-stat-value">{currentTimeframeData.teamStats.pitching.qualityStarts}</span>
                </div>
                <div className="team-stat-row highlight">
                  <span className="team-stat-label">Opp AVG</span>
                  <span className="team-stat-value">{currentTimeframeData.teamStats.pitching.oppAvg.toFixed(3)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Games */}
        <div className="upcoming-section">
          <div className="section-card">
            <div className="card-header">
              <h3>Upcoming Games</h3>
            </div>
            <div className="upcoming-games-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Location</th>
                    <th>Pitching Matchup</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.upcoming.map((game, idx) => (
                    <tr key={idx}>
                      <td>{game.date}</td>
                      <td className="opponent-cell">
                        <span className="team-logo">⚾</span>
                        {game.opponent}
                      </td>
                      <td>
                        <span className={`location-badge ${game.location.toLowerCase()}`}>
                          {game.location}
                        </span>
                      </td>
                      <td className="matchup-cell">{game.pitchMatchup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamAnalytics;