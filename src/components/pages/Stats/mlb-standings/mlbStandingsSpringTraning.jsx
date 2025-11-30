import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../../styles/stats-page-styling/mlb-standings-springtraining.css';
import springTrainingDataJSON from '../../../../data/mlbStandingsSpringTraining.json';

const teamAbbreviationMap = {
  'Los Angeles Dodgers': 'LAD',
  'Seattle Mariners': 'SEA',
  'Texas Rangers': 'TEX',
  'Kansas City Royals': 'KCR',
  'San Francisco Giants': 'SFG',
  'Chicago White Sox': 'CWS',
  'Cleveland Guardians': 'CLE',
  'Cincinnati Reds': 'CIN',
  'Oakland Athletics': 'OAK',
  'Colorado Rockies': 'COL',
  'Atlanta Braves': 'ATL',
  'Tampa Bay Rays': 'TBR',
  'New York Yankees': 'NYY',
  'Philadelphia Phillies': 'PHI',
  'Toronto Blue Jays': 'TOR',
  'Baltimore Orioles': 'BAL',
  'Boston Red Sox': 'BOS',
  'Detroit Tigers': 'DET',
  'Pittsburgh Pirates': 'PIT',
  'Miami Marlins': 'MIA',
  'Minnesota Twins': 'MIN',
  'St. Louis Cardinals': 'STL',
  'Houston Astros': 'HOU',
  'New York Mets': 'NYM',
  'Washington Nationals': 'WSH',
  'Arizona Diamondbacks': 'ARI',
  'Chicago Cubs': 'CHC',
  'Milwaukee Brewers': 'MIL',
  'San Diego Padres': 'SDP',
};

function MLBStandingsSpringTraining({ selectedSeason, selectedLeague }) {
  const navigate = useNavigate();
  const [isCompactTeams, setIsCompactTeams] = useState(false);

  // Get spring training data for the selected season, fallback to 2024
  const springData = springTrainingDataJSON[selectedSeason] || springTrainingDataJSON['2024'];
  const leagueData = selectedLeague === 'Cactus' ? springData.cactusLeague : springData.grapefruitLeague;

  // Temporary hardcoded leaders by league (make dynamic later)
  const leagueLeaders = selectedLeague === 'Cactus'
    ? {
        strikeouts: { player: 'Zac Gallen', stat: '28' },
        homers: { player: 'Ketel Marte', stat: '6' },
        battingAvg: { player: 'Corbin Carroll', stat: '.368' },
        era: { player: 'Merrill Kelly', stat: '1.85' },
        whip: { player: 'Merrill Kelly', stat: '0.92' },
        hits: { player: 'Ketel Marte', stat: '24' },
        innings: { player: 'Merrill Kelly', stat: '24.1' },
        ops: { player: 'Corbin Carroll', stat: '1.012' },
      }
    : {
        strikeouts: { player: 'Gerrit Cole', stat: '26' },
        homers: { player: 'Aaron Judge', stat: '7' },
        battingAvg: { player: 'Yandy Díaz', stat: '.371' },
        era: { player: 'Tyler Glasnow', stat: '1.92' },
        whip: { player: 'Tyler Glasnow', stat: '0.98' },
        hits: { player: 'Yandy Díaz', stat: '25' },
        innings: { player: 'Tyler Glasnow', stat: '23.0' },
        ops: { player: 'Aaron Judge', stat: '1.045' },
      };

  // Helper function to convert team name to URL-friendly format
  const formatTeamNameForUrl = (teamName) => {
    return teamName.toLowerCase().replace(/\s+/g, '-');
  };

  const formatTeamDisplay = useCallback(
    (teamName) => {
      if (!teamName) return '';
      if (!isCompactTeams) return teamName;
      if (teamAbbreviationMap[teamName]) return teamAbbreviationMap[teamName];
      const parts = teamName.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
      const initials = parts.map((p) => p[0]).join('').toUpperCase();
      return initials.slice(0, 3);
    },
    [isCompactTeams]
  );

  useEffect(() => {
    const handleResize = () => {
      setIsCompactTeams(window.innerWidth <= 430);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            <h3>{selectedLeague === 'Cactus' ? '🌵 Cactus League' : '🍊 Grapefruit League'} Best</h3>
            <span className="stats-badge">Spring Leaders</span>
          </div>

          {/* Top Performers */}
          <div className="top-performers">
            <div className="performers-group">
              <div className="performers-subtitle">Teams</div>
              <div className="performers-list">
                <div className="performer-item">
                  <span className="performer-category">Record</span>
                  <span className="performer-value">{formatTeamDisplay(leagueData.teams[0].team)}</span>
                  <span className="performer-stat">
                    {leagueData.teams[0].wins}-{leagueData.teams[0].losses}
                  </span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Runs Scored</span>
                  <span className="performer-value">{formatTeamDisplay(leagueData.topOffense.team)}</span>
                  <span className="performer-stat">{leagueData.topOffense.runs} RS</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Runs Allowed</span>
                  <span className="performer-value">{formatTeamDisplay(leagueData.topPitching.team)}</span>
                  <span className="performer-stat">{leagueData.topPitching.runsAllowed} RA</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Team Batting Avg</span>
                  <span className="performer-value">{formatTeamDisplay(leagueData.topBattingAvgTeam.team)}</span>
                  <span className="performer-stat">{leagueData.topBattingAvgTeam.avg}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Team ERA</span>
                  <span className="performer-value">{formatTeamDisplay(leagueData.topEraTeam.team)}</span>
                  <span className="performer-stat">{leagueData.topEraTeam.era}</span>
                </div>
              </div>
            </div>
            <div className="performers-group">
              <div className="performers-subtitle">Pitchers</div>
              <div className="performers-list">
                <div className="performer-item">
                  <span className="performer-category">Strikeouts</span>
                  <span className="performer-value">{leagueLeaders.strikeouts.player}</span>
                  <span className="performer-stat">{leagueLeaders.strikeouts.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">ERA</span>
                  <span className="performer-value">{leagueLeaders.era.player}</span>
                  <span className="performer-stat">{leagueLeaders.era.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">WHIP</span>
                  <span className="performer-value">{leagueLeaders.whip.player}</span>
                  <span className="performer-stat">{leagueLeaders.whip.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Innings Pitched</span>
                  <span className="performer-value">{leagueLeaders.innings.player}</span>
                  <span className="performer-stat">{leagueLeaders.innings.stat}</span>
                </div>
              </div>
            </div>

            <div className="performers-group">
              <div className="performers-subtitle">Batters</div>
              <div className="performers-list">
                <div className="performer-item">
                  <span className="performer-category">Home Runs</span>
                  <span className="performer-value">{leagueLeaders.homers.player}</span>
                  <span className="performer-stat">{leagueLeaders.homers.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Hits</span>
                  <span className="performer-value">{leagueLeaders.hits.player}</span>
                  <span className="performer-stat">{leagueLeaders.hits.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Batting Avg</span>
                  <span className="performer-value">{leagueLeaders.battingAvg.player}</span>
                  <span className="performer-stat">{leagueLeaders.battingAvg.stat}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">OPS</span>
                  <span className="performer-value">{leagueLeaders.ops.player}</span>
                  <span className="performer-stat">{leagueLeaders.ops.stat}</span>
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
