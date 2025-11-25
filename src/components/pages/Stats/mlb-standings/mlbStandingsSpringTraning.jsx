import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../../styles/stats-page-styling/mlb-standings-springtraining.css';
import springTrainingDataJSON from '../../../../data/mlbStandingsSpringTraining.json';

function MLBStandingsSpringTraining({ selectedSeason, selectedLeague }) {
  const navigate = useNavigate();

  // Get spring training data for the selected season, fallback to 2024
  const springData = springTrainingDataJSON[selectedSeason] || springTrainingDataJSON['2024'];
  const leagueData = selectedLeague === 'Cactus' ? springData.cactusLeague : springData.grapefruitLeague;

  // Temporary hardcoded leaders by league (make dynamic later)
  const leagueLeaders = selectedLeague === 'Cactus'
    ? {
        strikeouts: { player: 'Zac Gallen', stat: '28 K' },
        homers: { player: 'Ketel Marte', stat: '6 HR' },
        battingAvg: { player: 'Corbin Carroll', stat: '.368 AVG' },
        era: { player: 'Merrill Kelly', stat: '1.85 ERA' },
      }
    : {
        strikeouts: { player: 'Gerrit Cole', stat: '26 K' },
        homers: { player: 'Aaron Judge', stat: '7 HR' },
        battingAvg: { player: 'Yandy Díaz', stat: '.371 AVG' },
        era: { player: 'Tyler Glasnow', stat: '1.92 ERA' },
      };

  // Helper function to convert team name to URL-friendly format
  const formatTeamNameForUrl = (teamName) => {
    return teamName.toLowerCase().replace(/\s+/g, '-');
  };

  // Handle team click navigation
  const handleTeamClick = (teamName) => {
    const formattedName = formatTeamNameForUrl(teamName);
    navigate(`/team-analytics/${formattedName}`);
  };

  return (
    <div className="spring-training-container">
      {/* League Info Banner */}
      <div className="spring-banner">
        <div className="spring-icon">
          {selectedLeague === 'Cactus' ? '🌵' : '🍊'}
        </div>
        <div className="spring-info">
          <h2>{selectedLeague === 'Cactus' ? 'Cactus League' : 'Grapefruit League'}</h2>
          <p className="spring-location">
            {selectedLeague === 'Cactus' ? 'Arizona' : 'Florida'} • {selectedSeason} Spring Training
          </p>
        </div>
        <div className="spring-stats">
          <div className="stat-item">
            <span className="stat-label">Teams</span>
            <span className="stat-value">{leagueData.teams.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Games Played</span>
            <span className="stat-value">{leagueData.gamesPlayed || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Spring Training Standings */}
      <div className="spring-standings-grid">
        <div className="spring-standings-card">
          <div className="spring-card-header">
            <h3>
              {selectedLeague === 'Cactus' ? '🌵 Cactus League' : '🍊 Grapefruit League'} Standings
            </h3>
            <span className="spring-badge">
              {selectedSeason} Spring Training
            </span>
          </div>
          
          <div className="spring-table-container">
            <table className="spring-standings-table">
              <thead>
                <tr>
                  <th className="rank-col">#</th>
                  <th className="team-col">Team</th>
                  <th>W</th>
                  <th>L</th>
                  <th>PCT</th>
                  <th>GB</th>
                  <th className="hide-mobile">RS</th>
                  <th className="hide-mobile">RA</th>
                  <th className="hide-mobile">DIFF</th>
                  <th className="hide-mobile streak-col">STRK</th>
                  <th className="hide-mobile l10-col">L10</th>
                </tr>
              </thead>
              <tbody>
                {leagueData.teams.map((team, index) => (
                  <tr 
                    key={index} 
                    className={`${index === 0 ? 'spring-leader' : ''} clickable-row`}
                    onClick={() => handleTeamClick(team.team)}
                  >
                    <td className="rank-col">{index + 1}</td>
                    <td className="team-col">
                      <span className="team-logo">{team.logo}</span>
                      <div className="team-info">
                        <span className="team-name">{team.team}</span>
                        <span className="team-location">{team.location}</span>
                      </div>
                      {index === 0 && <span className="spring-top-badge">🏆</span>}
                    </td>
                    <td className="wins">{team.wins}</td>
                    <td className="losses">{team.losses}</td>
                    <td className="pct">{team.pct}</td>
                    <td className="gb">{team.gb}</td>
                    <td className="hide-mobile">{team.runsScored}</td>
                    <td className="hide-mobile">{team.runsAllowed}</td>
                    <td className={`hide-mobile diff ${team.runDiff >= 0 ? 'positive' : 'negative'}`}>
                      {team.runDiff >= 0 ? '+' : ''}{team.runDiff}
                    </td>
                    <td className={`hide-mobile streak streak-col ${team.streak.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                      {team.streak}
                    </td>
                    <td className="hide-mobile l10-col">{team.last10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spring Training Stats Summary */}
        <div className="spring-stats-card">
          <div className="spring-card-header">
            <h3>📊 League Statistics</h3>
            <span className="stats-badge">Season Averages</span>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-icon">⚾</div>
              <div className="stat-content">
                <span className="stat-label">Avg Runs/Game</span>
                <span className="stat-number">{leagueData.avgRunsPerGame}</span>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">🏏</div>
              <div className="stat-content">
                <span className="stat-label">Avg Hits/Game</span>
                <span className="stat-number">{leagueData.avgHitsPerGame}</span>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <span className="stat-label">Team Batting Avg</span>
                <span className="stat-number">{leagueData.teamBattingAvg}</span>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <span className="stat-label">Team ERA</span>
                <span className="stat-number">{leagueData.teamERA}</span>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">💪</div>
              <div className="stat-content">
                <span className="stat-label">Home Runs</span>
                <span className="stat-number">{leagueData.totalHomeRuns}</span>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <span className="stat-label">Stolen Bases</span>
                <span className="stat-number">{leagueData.totalStolenBases}</span>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="top-performers">
            <h4>🌟 Top Performers</h4>
            <div className="performers-group">
              <div className="performers-subtitle">Teams</div>
              <div className="performers-list">
                <div className="performer-item">
                  <span className="performer-category">Best Record</span>
                  <span className="performer-value">{leagueData.teams[0].team}</span>
                  <span className="performer-stat">
                    {leagueData.teams[0].wins}-{leagueData.teams[0].losses}
                  </span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Most Runs Scored</span>
                  <span className="performer-value">{leagueData.topOffense.team}</span>
                  <span className="performer-stat">{leagueData.topOffense.runs} RS</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Best Pitching</span>
                  <span className="performer-value">{leagueData.topPitching.team}</span>
                  <span className="performer-stat">{leagueData.topPitching.runsAllowed} RA</span>
                </div>
              </div>
            </div>
            <div className="performers-group">
              <div className="performers-subtitle">Players</div>
              <div className="performers-list">
                <div className="performer-item">
                  <span className="performer-category">Most Strikeouts (P)</span>
                  <span className="performer-value">{leagueLeaders.strikeouts.player}</span>
                  <span className="performer-stat">{leagueLeaders.strikeouts.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Best ERA (P)</span>
                  <span className="performer-value">{leagueLeaders.era.player}</span>
                  <span className="performer-stat">{leagueLeaders.era.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Most Home Runs</span>
                  <span className="performer-value">{leagueLeaders.homers.player}</span>
                  <span className="performer-stat">{leagueLeaders.homers.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Best Batting Avg</span>
                  <span className="performer-value">{leagueLeaders.battingAvg.player}</span>
                  <span className="performer-stat">{leagueLeaders.battingAvg.stat}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spring Training Info Footer */}
      <div className="spring-info-footer">
        <div className="info-section">
          <h4>🌡️ About {selectedLeague === 'Cactus' ? 'Cactus League' : 'Grapefruit League'}</h4>
          <p>
            {selectedLeague === 'Cactus' 
              ? 'The Cactus League is one of two spring training leagues in Major League Baseball, operating in Arizona since 1947. Teams train in the Phoenix metropolitan area with its warm, dry climate.'
              : 'The Grapefruit League is Florida\'s spring training circuit, featuring teams training along both coasts. With a tradition dating back to the early 1900s, it offers fans warm weather baseball in the Sunshine State.'
            }
          </p>
        </div>
        <div className="info-section">
          <h4>📍 Training Facilities</h4>
          <p>
            {selectedLeague === 'Cactus' 
              ? `${leagueData.teams.length} teams train at state-of-the-art facilities across the Phoenix area, including Surprise, Scottsdale, Goodyear, and Mesa.`
              : `${leagueData.teams.length} teams spread across Florida from the Gulf Coast to the Atlantic, with facilities in Tampa, Fort Myers, Jupiter, and more.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default MLBStandingsSpringTraining;
