import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../styles/stats-page-styling/mlb-standings.css';
import standingsData from '../../../data/mlbStandingsData.json';
import MLBStandingsPostseason from './mlbStandingsPostseason';
import MLBStandingsSpringTraining from './mlbStandingsSpringTraning';

function MLBStandings() {
  const [selectedLeague, setSelectedLeague] = useState('AL'); // 'AL' or 'NL' for regular, 'Cactus' or 'Grapefruit' for spring
  const [selectedSeason, setSelectedSeason] = useState('2025');
  const [seasonType, setSeasonType] = useState('regular'); // 'regular', 'postseason', 'spring'
  const navigate = useNavigate();

  // Available seasons - 2025 back to 2015 (10 year span)
  const availableSeasons = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'];

  const currentLeagueData = standingsData[selectedSeason]?.[selectedLeague] || standingsData['2023'][selectedLeague];
  const powerRankings = standingsData[selectedSeason]?.powerRankings || standingsData['2023'].powerRankings;

  // Filter power rankings by selected league and get top 5 with sequential 1-5 ranking
  const leaguePowerRankings = powerRankings
    .filter(team => team.league === selectedLeague)
    .slice(0, 5)
    .map((team, index) => ({ ...team, leagueRank: index + 1 }));

  // Helper function to convert team name to URL-friendly format
  const formatTeamNameForUrl = (teamName) => {
    return teamName.toLowerCase().replace(/\s+/g, '-');
  };

  // Handle team click navigation
  const handleTeamClick = (teamName) => {
    const formattedName = formatTeamNameForUrl(teamName);
    navigate(`/team-analytics/${formattedName}`);
  };

  // Handle season type change
  const handleSeasonTypeChange = (type) => {
    setSeasonType(type);
    
    // Reset league selection based on season type
    if (type === 'spring') {
      setSelectedLeague('Cactus'); // Default to Cactus League for Spring Training
    } else if (type === 'postseason') {
      setSelectedLeague('Playoff'); // Single playoff bracket
    } else {
      setSelectedLeague('AL'); // Default to AL for regular season
    }
    
    console.log(`Season type changed to: ${type}`);
  };

  // Get league display name based on season type
  const getLeagueDisplayName = () => {
    if (seasonType === 'spring') {
      return selectedLeague === 'Cactus' ? 'Cactus League' : 'Grapefruit League';
    } else if (seasonType === 'postseason') {
      return 'Playoff Bracket';
    } else {
      return selectedLeague === 'AL' ? 'American League' : 'National League';
    }
  };

  return (
    <div className="mlb-standings-page">
      {/* Header Section */}
      <div className="standings-header">
        <div className="container">
          <h1>MLB Standings</h1>
          <p className="header-subtitle">
            {seasonType === 'regular' ? 'Regular Season' : 
             seasonType === 'postseason' ? 'Postseason' : 
             'Spring Training'} Standings & Rankings
          </p>
          
          {/* Season Selector */}
          <div className="season-selector">
            <div className="season-tabs">
              {/* Year Dropdown */}
              <div className="season-dropdown-wrapper">
                <select
                  className="season-dropdown"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                >
                  {availableSeasons.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>

              {/* Season Type Dropdown */}
              <div className="season-type-wrapper">
                <select
                  className="season-type-dropdown"
                  value={seasonType}
                  onChange={(e) => handleSeasonTypeChange(e.target.value)}
                >
                  <option value="regular">Regular Season</option>
                  <option value="postseason">Postseason</option>
                  <option value="spring">Spring Training</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic League Toggle */}
          {seasonType === 'postseason' ? (
            // Single Playoff Bracket Button
            <div className="league-toggle playoff-mode">
              <button className="league-btn active playoff-btn">
                🏆 Playoff Bracket
              </button>
            </div>
          ) : seasonType === 'spring' ? (
            // Spring Training League Toggle
            <div className="league-toggle spring-mode">
              <button 
                className={`league-btn ${selectedLeague === 'Cactus' ? 'active' : ''}`}
                onClick={() => setSelectedLeague('Cactus')}
              >
                🌵 Cactus League
              </button>
              <button 
                className={`league-btn ${selectedLeague === 'Grapefruit' ? 'active' : ''}`}
                onClick={() => setSelectedLeague('Grapefruit')}
              >
                🍊 Grapefruit League
              </button>
            </div>
          ) : (
            // Regular Season League Toggle
            <div className="league-toggle">
              <button 
                className={`league-btn ${selectedLeague === 'AL' ? 'active' : ''}`}
                onClick={() => setSelectedLeague('AL')}
              >
                American League
              </button>
              <button 
                className={`league-btn ${selectedLeague === 'NL' ? 'active' : ''}`}
                onClick={() => setSelectedLeague('NL')}
              >
                National League
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Conditional Rendering Based on Season Type */}
      <div className="standings-content container">
        {seasonType === 'postseason' ? (
          // Render Playoff Bracket
          <MLBStandingsPostseason selectedSeason={selectedSeason} />
        ) : seasonType === 'spring' ? (
          // Render Spring Training
          <MLBStandingsSpringTraining 
            selectedSeason={selectedSeason} 
            selectedLeague={selectedLeague}
          />
        ) : (
          // Render Regular Season Standings
          <>
            {/* Season Display Banner */}
            <div className="season-banner">
              <span className="season-year">{selectedSeason} Season</span>
              <span className="season-league">
                {getLeagueDisplayName()} • Regular Season
              </span>
            </div>

            {/* Division Standings Grid */}
            <div className="divisions-grid">
              {/* East Division */}
              <div className="division-card">
                <div className="division-header">
                  <h3>{selectedLeague} East</h3>
                  <span className="division-badge">Division</span>
                </div>
                <div className="standings-table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="rank-col">#</th>
                        <th className="team-col">Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PCT</th>
                        <th>GB</th>
                        <th>STRK</th>
                        <th className="hide-mobile">Home</th>
                        <th className="hide-mobile">Away</th>
                        <th className="hide-mobile">L10</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeagueData.East.map((team) => (
                        <tr 
                          key={team.rank} 
                          className={`${team.rank === 1 ? 'division-leader' : ''} clickable-row`}
                          onClick={() => handleTeamClick(team.team)}
                        >
                          <td className="rank-col">{team.rank}</td>
                          <td className="team-col">
                            <span className="team-logo">⚾</span>
                            {team.team}
                            {team.rank === 1 && <span className="clinch-badge">x</span>}
                          </td>
                          <td className="wins">{team.wins}</td>
                          <td className="losses">{team.losses}</td>
                          <td>{team.pct.toFixed(3)}</td>
                          <td className="gb">{team.gb}</td>
                          <td className={`streak ${team.streak.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                            {team.streak}
                          </td>
                          <td className="hide-mobile">{team.home}</td>
                          <td className="hide-mobile">{team.away}</td>
                          <td className="hide-mobile">{team.last10}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Central Division */}
              <div className="division-card">
                <div className="division-header">
                  <h3>{selectedLeague} Central</h3>
                  <span className="division-badge">Division</span>
                </div>
                <div className="standings-table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="rank-col">#</th>
                        <th className="team-col">Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PCT</th>
                        <th>GB</th>
                        <th>STRK</th>
                        <th className="hide-mobile">Home</th>
                        <th className="hide-mobile">Away</th>
                        <th className="hide-mobile">L10</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeagueData.Central.map((team) => (
                        <tr 
                          key={team.rank} 
                          className={`${team.rank === 1 ? 'division-leader' : ''} clickable-row`}
                          onClick={() => handleTeamClick(team.team)}
                        >
                          <td className="rank-col">{team.rank}</td>
                          <td className="team-col">
                            <span className="team-logo">⚾</span>
                            {team.team}
                            {team.rank === 1 && <span className="clinch-badge">x</span>}
                          </td>
                          <td className="wins">{team.wins}</td>
                          <td className="losses">{team.losses}</td>
                          <td>{team.pct.toFixed(3)}</td>
                          <td className="gb">{team.gb}</td>
                          <td className={`streak ${team.streak.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                            {team.streak}
                          </td>
                          <td className="hide-mobile">{team.home}</td>
                          <td className="hide-mobile">{team.away}</td>
                          <td className="hide-mobile">{team.last10}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* West Division */}
              <div className="division-card">
                <div className="division-header">
                  <h3>{selectedLeague} West</h3>
                  <span className="division-badge">Division</span>
                </div>
                <div className="standings-table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="rank-col">#</th>
                        <th className="team-col">Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PCT</th>
                        <th>GB</th>
                        <th>STRK</th>
                        <th className="hide-mobile">Home</th>
                        <th className="hide-mobile">Away</th>
                        <th className="hide-mobile">L10</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeagueData.West.map((team) => (
                        <tr 
                          key={team.rank} 
                          className={`${team.rank === 1 ? 'division-leader' : ''} clickable-row`}
                          onClick={() => handleTeamClick(team.team)}
                        >
                          <td className="rank-col">{team.rank}</td>
                          <td className="team-col">
                            <span className="team-logo">⚾</span>
                            {team.team}
                            {team.rank === 1 && <span className="clinch-badge">x</span>}
                          </td>
                          <td className="wins">{team.wins}</td>
                          <td className="losses">{team.losses}</td>
                          <td>{team.pct.toFixed(3)}</td>
                          <td className="gb">{team.gb}</td>
                          <td className={`streak ${team.streak.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                            {team.streak}
                          </td>
                          <td className="hide-mobile">{team.home}</td>
                          <td className="hide-mobile">{team.away}</td>
                          <td className="hide-mobile">{team.last10}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Wild Card and League Power Rankings Grid */}
            <div className="wildcard-power-grid">
              {/* Wild Card Standings */}
              <div className="division-card wildcard-card">
                <div className="division-header">
                  <h3>{selectedLeague} Wild Card</h3>
                  <span className="wildcard-badge">Playoff Race</span>
                </div>
                <div className="standings-table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="rank-col">#</th>
                        <th className="team-col">Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PCT</th>
                        <th>GB</th>
                        <th>WCGB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeagueData.wildCard.map((team) => (
                        <tr 
                          key={team.rank} 
                          className={`${team.rank <= 3 ? 'wildcard-position' : ''} clickable-row`}
                          onClick={() => handleTeamClick(team.team)}
                        >
                          <td className="rank-col">{team.rank}</td>
                          <td className="team-col">
                            <span className="team-logo">⚾</span>
                            {team.team}
                            {team.rank <= 3 && <span className="wildcard-clinch">WC</span>}
                          </td>
                          <td className="wins">{team.wins}</td>
                          <td className="losses">{team.losses}</td>
                          <td>{team.pct.toFixed(3)}</td>
                          <td className="gb">{team.gb}</td>
                          <td className={`wcgb ${team.wcgb.startsWith('+') ? 'positive' : team.wcgb.startsWith('-') ? 'negative' : ''}`}>
                            {team.wcgb}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* League Power Rankings */}
              <div className="division-card league-power-card">
                <div className="division-header">
                  <h3>⚡ {selectedLeague} Power Rankings</h3>
                  <span className="power-badge">Top 5</span>
                </div>
                <div className="league-power-list">
                  {leaguePowerRankings.map((team) => (
                    <div 
                      key={team.leagueRank} 
                      className="league-power-item clickable-power-item"
                      onClick={() => handleTeamClick(team.team)}
                    >
                      <div className="league-power-rank">{team.leagueRank}</div>
                      <div className="league-power-team-info">
                        <div className="league-power-team-name">
                          <span className="team-logo">⚾</span>
                          {team.team}
                        </div>
                        <div className="league-power-team-record">{team.record}</div>
                      </div>
                      <div className="league-power-movement">
                        <span className="league-last-week">Last: #{team.lastWeek}</span>
                        <span className={`league-trend-arrow ${team.trend === '↑' ? 'up' : team.trend === '↓' ? 'down' : 'same'}`}>
                          {team.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overall Power Rankings */}
            <div className="power-rankings-section">
              <div className="division-card power-rankings-card">
                <div className="division-header">
                  <h3>⚡ MLB Power Rankings</h3>
                  <span className="power-badge">Top 10</span>
                </div>
                <div className="power-rankings-list">
                  {powerRankings.map((team) => (
                    <div 
                      key={team.rank} 
                      className="power-ranking-item clickable-power-item"
                      onClick={() => handleTeamClick(team.team)}
                    >
                      <div className="power-rank">{team.rank}</div>
                      <div className="power-team-info">
                        <div className="power-team-name">
                          <span className="team-logo">⚾</span>
                          {team.team}
                          <span className={`league-badge ${team.league}`}>{team.league}</span>
                        </div>
                        <div className="power-team-record">{team.record}</div>
                      </div>
                      <div className="power-movement">
                        <span className="last-week">Last Week: #{team.lastWeek}</span>
                        <span className={`trend-arrow ${team.trend === '↑' ? 'up' : team.trend === '↓' ? 'down' : 'same'}`}>
                          {team.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MLBStandings;