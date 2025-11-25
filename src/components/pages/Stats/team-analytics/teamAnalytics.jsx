import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import teamData from '../../../../data/teamData.json';

function TeamAnalytics() {
  const { teamName } = useParams();
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState('LAD');
  const [timeframe, setTimeframe] = useState('season');
  const [chartFilter, setChartFilter] = useState('season');
  const [leadersToggle, setLeadersToggle] = useState('batting'); // 'batting' or 'pitching'
  const [teamStatsToggle, setTeamStatsToggle] = useState('batting'); // 'batting' or 'pitching'

  // Mock data - will be replaced with API later
  const teams = [
    { id: 'LAD', name: 'Los Angeles Dodgers', urlName: 'los-angeles-dodgers', logo: '⚾' },
    { id: 'NYY', name: 'New York Yankees', urlName: 'new-york-yankees', logo: '⚾' },
    { id: 'HOU', name: 'Houston Astros', urlName: 'houston-astros', logo: '⚾' },
    { id: 'ATL', name: 'Atlanta Braves', urlName: 'atlanta-braves', logo: '⚾' },
    { id: 'BAL', name: 'Baltimore Orioles', urlName: 'baltimore-orioles', logo: '⚾' },
    { id: 'TBR', name: 'Tampa Bay Rays', urlName: 'tampa-bay-rays', logo: '⚾' },
    { id: 'TOR', name: 'Toronto Blue Jays', urlName: 'toronto-blue-jays', logo: '⚾' },
    { id: 'BOS', name: 'Boston Red Sox', urlName: 'boston-red-sox', logo: '⚾' },
    // Add more teams...
  ];

  // Helper function to convert team name to URL format
  const formatTeamNameForUrl = (teamName) => {
    return teamName.toLowerCase().replace(/\s+/g, '-');
  };

  // Helper function to find team by URL name
  const findTeamByUrlName = (urlName) => {
    return teams.find(team => team.urlName === urlName);
  };

  // Set selected team based on URL parameter
  useEffect(() => {
    if (teamName) {
      const team = findTeamByUrlName(teamName);
      if (team) {
        setSelectedTeam(team.id);
      } else {
        // Redirect to default team if not found
        navigate('/team-analytics/los-angeles-dodgers', { replace: true });
      }
    } else {
      // Redirect to default team if no team in URL
      navigate('/team-analytics/los-angeles-dodgers', { replace: true });
    }
  }, [teamName, navigate]);

  // Handle team change from dropdown
  const handleTeamChange = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setSelectedTeam(teamId);
      navigate(`/team-analytics/${team.urlName}`);
    }
  };

  const currentTimeframeData = teamData[timeframe];
  const currentChartData = currentTimeframeData.trends[chartFilter];
  const currentSplitsData = currentTimeframeData.splits[chartFilter];
  const currentLast10Data = currentTimeframeData.last10[chartFilter];

  // Get current team display name
  const currentTeamName = teams.find(t => t.id === selectedTeam)?.name || 'Team';

  return (
    <div className="team-analytics-page">
      {/* Header Section */}
      <div className="analytics-header">
        <div className="container">
          <div className="header-content">
            <div className="team-selector-wrapper">
              <h1>{currentTeamName}</h1>
              <div className="team-selector">
                <select 
                  value={selectedTeam} 
                  onChange={(e) => handleTeamChange(e.target.value)}
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
        {/* Season Overview Cards for Record, Home Record, Away Record, Run diff, */}
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

        {/* ...rest of the existing code remains the same... */}
        
        {/* Monthly Performance Trends Chart */}
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

              {/* Chart Filter Buttons for Season, Home and Away*/}
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

        {/* 1. Team Standings */}
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

        {/* Team Roster and Injury List */}
        <div className="roster-injury-section">
          {/* Team Roster */}
          <div className="section-card roster-card">
            <div className="card-header">
              <h3>Team Roster</h3>
              <p className="card-subtitle">{currentTimeframeData.roster.length} Active Players</p>
            </div>
            <div className="roster-table-container">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Position</th>
                    <th>B/T</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTimeframeData.roster.map((player, idx) => (
                    <tr key={idx}>
                      <td className="player-number">{player.number}</td>
                      <td className="player-name">{player.name}</td>
                      <td className="player-position">
                        <span className="position-badge">{player.position}</span>
                      </td>
                      <td className="player-hands">{player.battingHand}/{player.throwingHand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team Injury List */}
          <div className="section-card injury-card">
            <div className="card-header">
              <h3>Injury Report</h3>
              <p className="card-subtitle">
                {currentTimeframeData.injuries.length} {currentTimeframeData.injuries.length === 1 ? 'Player' : 'Players'} Injured
              </p>
            </div>
            <div className="injury-list">
              {currentTimeframeData.injuries.length > 0 ? (
                currentTimeframeData.injuries.map((injury, idx) => (
                  <div key={idx} className="injury-item">
                    <div className="injury-player-info">
                      <div className="injury-player-name">{injury.name}</div>
                      <div className="injury-position">{injury.position}</div>
                    </div>
                    <div className="injury-details">
                      <div className="injury-type">{injury.injury}</div>
                      <div className="injury-status-row">
                        <span className={`injury-status ${injury.status.includes('60') ? 'long-term' : 'short-term'}`}>
                          {injury.status}
                        </span>
                        <span className="injury-return">Return: {injury.expectedReturn}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-injuries">
                  <span className="no-injuries-icon">✅</span>
                  <p>No players currently on injured list</p>
                </div>
              )}
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