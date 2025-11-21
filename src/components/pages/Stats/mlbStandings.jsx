import React, { useState } from 'react';
import standingsData from '../../../data/mlbStandingsData.json';

function MLBStandings() {
  const [selectedLeague, setSelectedLeague] = useState('AL'); // 'AL' or 'NL'
  const [selectedSeason, setSelectedSeason] = useState('2023');

  // Available seasons
  const recentSeasons = ['2023', '2022', '2021'];
  const historicalSeasons = ['2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010'];

  const currentLeagueData = standingsData[selectedSeason]?.[selectedLeague] || standingsData['2023'][selectedLeague];
  const powerRankings = standingsData[selectedSeason]?.powerRankings || standingsData['2023'].powerRankings;

  return (
    <div className="mlb-standings-page">
      {/* Header Section */}
      <div className="standings-header">
        <div className="container">
          <h1>MLB Standings</h1>
          <p className="header-subtitle">Regular Season Standings & Rankings</p>
          
          {/* Season Selector */}
          <div className="season-selector">
            {/* Recent Seasons Tabs */}
            <div className="season-tabs">
              {recentSeasons.map((season) => (
                <button
                  key={season}
                  className={`season-tab ${selectedSeason === season ? 'active' : ''}`}
                  onClick={() => setSelectedSeason(season)}
                >
                  {season}
                </button>
              ))}
              
              {/* Historical Seasons Dropdown */}
              <div className="season-dropdown-wrapper">
                <select
                  className="season-dropdown"
                  value={historicalSeasons.includes(selectedSeason) ? selectedSeason : ''}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                >
                  <option value="">More Seasons</option>
                  {historicalSeasons.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* League Toggle */}
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
        </div>
      </div>

      {/* Main Content */}
      <div className="standings-content container">
        
        {/* Season Display Banner */}
        <div className="season-banner">
          <span className="season-year">{selectedSeason} Season</span>
          <span className="season-league">{selectedLeague === 'AL' ? 'American League' : 'National League'}</span>
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
                    <tr key={team.rank} className={team.rank === 1 ? 'division-leader' : ''}>
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
                    <tr key={team.rank} className={team.rank === 1 ? 'division-leader' : ''}>
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
                    <tr key={team.rank} className={team.rank === 1 ? 'division-leader' : ''}>
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

        {/* Wild Card Standings */}
        <div className="wildcard-section">
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
                    <tr key={team.rank} className={team.rank <= 3 ? 'wildcard-position' : ''}>
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
        </div>

        {/* Power Rankings */}
        <div className="power-rankings-section">
          <div className="division-card power-rankings-card">
            <div className="division-header">
              <h3>⚡ MLB Power Rankings</h3>
              <span className="power-badge">Top 10</span>
            </div>
            <div className="power-rankings-list">
              {powerRankings.map((team) => (
                <div key={team.rank} className="power-ranking-item">
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

      </div>
    </div>
  );
}

export default MLBStandings;