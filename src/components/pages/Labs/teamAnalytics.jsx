import React, { useState } from 'react';
import '../../../styles/team-analytics.css';

function TeamAnalytics() {
  const [selectedTeam, setSelectedTeam] = useState('LAD');
  const [timeframe, setTimeframe] = useState('season');

  // Mock data - will be replaced with API later
  const teams = [
    { id: 'LAD', name: 'Los Angeles Dodgers', logo: '⚾' },
    { id: 'NYY', name: 'New York Yankees', logo: '⚾' },
    { id: 'HOU', name: 'Houston Astros', logo: '⚾' },
    { id: 'ATL', name: 'Atlanta Braves', logo: '⚾' },
    // Add more teams...
  ];

  const teamData = {
    overall: {
      wins: 100,
      losses: 62,
      winPct: 0.617,
      runsScored: 906,
      runsAllowed: 672,
      runDiff: 234,
      streak: 'W5'
    },
    splits: {
      home: { wins: 54, losses: 27, winPct: 0.667 },
      away: { wins: 46, losses: 35, winPct: 0.568 },
      vsLHP: { wins: 38, losses: 22, winPct: 0.633 },
      vsRHP: { wins: 62, losses: 40, winPct: 0.608 },
      day: { wins: 28, losses: 18, winPct: 0.609 },
      night: { wins: 72, losses: 44, winPct: 0.621 }
    },
    last10: {
      wins: 7,
      losses: 3,
      runsScored: 52,
      runsAllowed: 38
    },
    trends: [
      { date: 'Apr', wins: 18, losses: 8 },
      { date: 'May', wins: 20, losses: 10 },
      { date: 'Jun', wins: 17, losses: 13 },
      { date: 'Jul', wins: 21, losses: 9 },
      { date: 'Aug', wins: 15, losses: 14 },
      { date: 'Sep', wins: 9, losses: 8 }
    ],
    upcoming: [
      { date: '11/18', opponent: 'SF Giants', location: 'Home', pitchMatchup: 'Kershaw vs Webb' },
      { date: '11/19', opponent: 'SF Giants', location: 'Home', pitchMatchup: 'Buehler vs Cobb' },
      { date: '11/20', opponent: 'SD Padres', location: 'Away', pitchMatchup: 'Urías vs Darvish' }
    ]
  };

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
                className={`tab ${timeframe === 'last30' ? 'active' : ''}`}
                onClick={() => setTimeframe('last30')}
              >
                Last 30
              </button>
              <button 
                className={`tab ${timeframe === 'last10' ? 'active' : ''}`}
                onClick={() => setTimeframe('last10')}
              >
                Last 10
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
              <span className={`trend-badge ${teamData.overall.streak.startsWith('W') ? 'positive' : 'negative'}`}>
                {teamData.overall.streak}
              </span>
            </div>
            <div className="stat-value">
              {teamData.overall.wins}-{teamData.overall.losses}
            </div>
            <div className="stat-detail">
              Win % {(teamData.overall.winPct * 100).toFixed(1)}%
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Run Differential</span>
            </div>
            <div className="stat-value positive">
              +{teamData.overall.runDiff}
            </div>
            <div className="stat-detail">
              {teamData.overall.runsScored} RS / {teamData.overall.runsAllowed} RA
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Home Record</span>
            </div>
            <div className="stat-value">
              {teamData.splits.home.wins}-{teamData.splits.home.losses}
            </div>
            <div className="stat-detail">
              {(teamData.splits.home.winPct * 100).toFixed(1)}% win rate
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Away Record</span>
            </div>
            <div className="stat-value">
              {teamData.splits.away.wins}-{teamData.splits.away.losses}
            </div>
            <div className="stat-detail">
              {(teamData.splits.away.winPct * 100).toFixed(1)}% win rate
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="chart-section">
          <div className="section-card">
            <div className="card-header">
              <h3>Monthly Win Trend</h3>
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
                {teamData.trends.map((month, idx) => (
                  <div key={idx} className="bar-group">
                    <div className="bar-wrapper">
                      <div 
                        className="bar wins" 
                        style={{ height: `${(month.wins / 30) * 100}%` }}
                        data-value={month.wins}
                      >
                        <span className="bar-label">{month.wins}</span>
                      </div>
                    </div>
                    <div className="bar-wrapper">
                      <div 
                        className="bar losses" 
                        style={{ height: `${(month.losses / 30) * 100}%` }}
                        data-value={month.losses}
                      >
                        <span className="bar-label">{month.losses}</span>
                      </div>
                    </div>
                    <div className="bar-month">{month.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Split Stats Grid */}
        <div className="splits-section">
          <div className="section-card">
            <div className="card-header">
              <h3>Performance Splits</h3>
            </div>
            <div className="splits-grid">
              <div className="split-row">
                <div className="split-label">vs Left-Handed Pitching</div>
                <div className="split-stats">
                  <span className="split-record">
                    {teamData.splits.vsLHP.wins}-{teamData.splits.vsLHP.losses}
                  </span>
                  <span className="split-pct">
                    {(teamData.splits.vsLHP.winPct * 100).toFixed(1)}%
                  </span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${teamData.splits.vsLHP.winPct * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="split-row">
                <div className="split-label">vs Right-Handed Pitching</div>
                <div className="split-stats">
                  <span className="split-record">
                    {teamData.splits.vsRHP.wins}-{teamData.splits.vsRHP.losses}
                  </span>
                  <span className="split-pct">
                    {(teamData.splits.vsRHP.winPct * 100).toFixed(1)}%
                  </span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${teamData.splits.vsRHP.winPct * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="split-row">
                <div className="split-label">Day Games</div>
                <div className="split-stats">
                  <span className="split-record">
                    {teamData.splits.day.wins}-{teamData.splits.day.losses}
                  </span>
                  <span className="split-pct">
                    {(teamData.splits.day.winPct * 100).toFixed(1)}%
                  </span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${teamData.splits.day.winPct * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="split-row">
                <div className="split-label">Night Games</div>
                <div className="split-stats">
                  <span className="split-record">
                    {teamData.splits.night.wins}-{teamData.splits.night.losses}
                  </span>
                  <span className="split-pct">
                    {(teamData.splits.night.winPct * 100).toFixed(1)}%
                  </span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${teamData.splits.night.winPct * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Last 10 Games */}
          <div className="section-card">
            <div className="card-header">
              <h3>Last 10 Games</h3>
            </div>
            <div className="last-10-stats">
              <div className="last-10-item">
                <div className="last-10-label">Record</div>
                <div className="last-10-value">
                  {teamData.last10.wins}-{teamData.last10.losses}
                </div>
              </div>
              <div className="last-10-item">
                <div className="last-10-label">Runs Scored</div>
                <div className="last-10-value">{teamData.last10.runsScored}</div>
              </div>
              <div className="last-10-item">
                <div className="last-10-label">Runs Allowed</div>
                <div className="last-10-value">{teamData.last10.runsAllowed}</div>
              </div>
              <div className="last-10-item">
                <div className="last-10-label">Run Differential</div>
                <div className="last-10-value positive">
                  +{teamData.last10.runsScored - teamData.last10.runsAllowed}
                </div>
              </div>
            </div>
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