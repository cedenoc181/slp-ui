import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../../styles/stats-page-styling/mlb-standings-springtraining.css';
import teamsService from '../../../../data/services/teamsService';
import teamStatsService from '../../../../data/services/teamStatsService';
import { SEASON_TYPES, TEAM_METADATA } from '../../../../data/constants/apiConstants';

function MLBStandingsSpringTraining({ selectedSeason, selectedLeague }) {
  const navigate = useNavigate();
  const [springData, setSpringData] = useState(null);
  const [springLoading, setSpringLoading] = useState(false);
  const [springError, setSpringError] = useState(null);
  const [leaderBattingStats, setLeaderBattingStats] = useState(null);
  const [leaderPitchingStats, setLeaderPitchingStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const stripStatUnits = useCallback((stat) => {
    if (stat === undefined || stat === null) return '';
    const matches = String(stat).match(/-?\d*\.?\d+/g);
    return matches ? matches.join(' ') : String(stat);
  }, []);

  // Fetch spring training data when season changes
  useEffect(() => {
    const fetchSpringData = async () => {
      setSpringLoading(true);
      setSpringError(null);

      try {
        const data = await teamsService.getTeamSpringTrainingStandings(selectedSeason);
        setSpringData(data);
      } catch (error) {
        console.error('Error fetching spring training standings:', error);
        setSpringError('Failed to load spring training data');
        setSpringData(null);
      } finally {
        setSpringLoading(false);
      }
    };

    fetchSpringData();
  }, [selectedSeason]);

  // Fetch batting and pitching stats for the 1st place team
  useEffect(() => {
    const fetchLeaderStats = async () => {
      if (!springData) return;

      const leagueKey = selectedLeague === 'Cactus' ? 'Cactus League' : 'Grapefruit League';
      const teams = springData[leagueKey] || [];
      
      // Find the 1st place team (lowest spring_league_rank)
      const firstPlaceTeam = teams.reduce((best, team) => {
        if (!best || team.spring_league_rank < best.spring_league_rank) {
          return team;
        }
        return best;
      }, null);

      if (!firstPlaceTeam) return;

      setStatsLoading(true);
      try {
        const [battingData, pitchingData] = await Promise.all([
          teamStatsService.getTeamBattingStats(
            firstPlaceTeam.team_id,
            selectedSeason,
            SEASON_TYPES.SPRING_TRAINING
          ),
          teamStatsService.getTeamPitchingStats(
            firstPlaceTeam.team_id,
            selectedSeason,
            SEASON_TYPES.SPRING_TRAINING
          ),
        ]);
        
        // API returns an array, extract the first item
        const battingStatsData = Array.isArray(battingData) ? battingData[0] : battingData;
        const pitchingStatsData = Array.isArray(pitchingData) ? pitchingData[0] : pitchingData;
        
        console.log('Batting Stats Response:', battingStatsData);
        console.log('Pitching Stats Response:', pitchingStatsData);
        
        setLeaderBattingStats({
          teamName: firstPlaceTeam.team_name,
          teamAbbreviation: firstPlaceTeam.team_abbreviation,
          mlbTeamId: firstPlaceTeam.mlb_team_id,
          ...battingStatsData,
        });
        setLeaderPitchingStats({
          teamName: firstPlaceTeam.team_name,
          teamAbbreviation: firstPlaceTeam.team_abbreviation,
          mlbTeamId: firstPlaceTeam.mlb_team_id,
          ...pitchingStatsData,
        });
      } catch (error) {
        console.error('Error fetching leader stats:', error);
        setLeaderBattingStats(null);
        setLeaderPitchingStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchLeaderStats();
  }, [springData, selectedLeague, selectedSeason]);

  // Transform API data to display format
  const leagueData = useMemo(() => {
    if (!springData) return null;

    const leagueKey = selectedLeague === 'Cactus' ? 'Cactus League' : 'Grapefruit League';
    const teams = springData[leagueKey] || [];

    // Sort by spring_league_rank and transform
    const transformedTeams = teams
      .sort((a, b) => a.spring_league_rank - b.spring_league_rank)
      .map(team => ({
        rank: team.spring_league_rank,
        team: team.team_name,
        teamAbbreviation: team.team_abbreviation,
        mlbTeamId: team.mlb_team_id,
        wins: team.spring_league_wins,
        losses: team.spring_league_losses,
        ties: team.spring_league_ties,
        pct: team.spring_league_pct?.toFixed(3) || '.000',
        gb: team.spring_league_games_back === null ? '-' : team.spring_league_games_back,
        gamesPlayed: team.spring_league_games_played,
        runsScored: team.spring_league_runs_scored,
        runsAllowed: team.spring_league_runs_allowed,
        runDiff: team.spring_league_run_differential,
        streak: team.spring_league_streak_code || '-',
        last10: `${team.spring_league_last_ten_wins}-${team.spring_league_last_ten_losses}`,
        location: selectedLeague === 'Cactus' ? 'Arizona' : 'Florida',
      }));

    // Calculate league stats
    const totalGamesPlayed = transformedTeams.reduce((sum, t) => sum + (t.gamesPlayed || 0), 0) / 2; // Divide by 2 since each game involves 2 teams

    // Find top offense (most runs scored)
    const topOffense = [...transformedTeams].sort((a, b) => b.runsScored - a.runsScored)[0];
    
    // Find top pitching (fewest runs allowed)
    const topPitching = [...transformedTeams].sort((a, b) => a.runsAllowed - b.runsAllowed)[0];

    // Find best batting avg team (highest pct as proxy)
    const topBattingAvgTeam = [...transformedTeams].sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct))[0];

    // Find best ERA team (best run differential / games as proxy)
    const topEraTeam = [...transformedTeams].sort((a, b) => {
      const aEra = a.runsAllowed / (a.gamesPlayed || 1);
      const bEra = b.runsAllowed / (b.gamesPlayed || 1);
      return aEra - bEra;
    })[0];

    return {
      teams: transformedTeams,
      gamesPlayed: Math.round(totalGamesPlayed),
      topOffense: { team: topOffense?.team, runs: topOffense?.runsScored },
      topPitching: { team: topPitching?.team, runsAllowed: topPitching?.runsAllowed },
      topBattingAvgTeam: { team: topBattingAvgTeam?.team, avg: topBattingAvgTeam?.pct },
      topEraTeam: { team: topEraTeam?.team, era: (topEraTeam?.runsAllowed / (topEraTeam?.gamesPlayed || 1) * 9).toFixed(2) },
    };
  }, [springData, selectedLeague]);

  // Helper function to get URL-friendly team name from abbreviation
  const getTeamUrlFromAbbr = (teamAbbreviation) => {
    return TEAM_METADATA[teamAbbreviation]?.urlName || teamAbbreviation?.toLowerCase();
  };

  // Format team display - just return team name or abbreviation for compact mode
  const formatTeamDisplay = useCallback((teamName) => {
    if (!teamName) return '';
    return teamName;
  }, []);

  // Handle team click navigation - includes season as query parameter
  const handleTeamClick = (teamAbbreviation) => {
    if (!teamAbbreviation) return;
    const urlName = getTeamUrlFromAbbr(teamAbbreviation);
    navigate(`/team-analytics/${urlName}?season=${selectedSeason}`);
  };

  return (
    <div className="spring-training-container">
      {/* Loading State */}
      {springLoading && (
        <div className="standings-loading">
          <div className="loading-spinner"></div>
          <span>Loading spring training standings...</span>
        </div>
      )}

      {/* Error State */}
      {springError && !springLoading && (
        <div className="standings-error">
          <span>{springError}</span>
        </div>
      )}

      {/* Content */}
      {!springLoading && !springError && leagueData && (
      <>
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
                    key={team.mlbTeamId} 
                    className={`${index === 0 ? 'spring-leader' : ''} clickable-row`}
                    onClick={() => handleTeamClick(team.teamAbbreviation)}
                  >
                    <td className="rank-col">{team.rank}</td>
                    <td className="team-col">
                      <img 
                        src={`https://www.mlbstatic.com/team-logos/${team.mlbTeamId}.svg`}
                        alt={team.team}
                        className="team-logo-img"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
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
            {/* Team Leaders Section */}
            <div className="performers-group">
              <div className="performers-subtitle">Teams</div>
              <div className="performers-list">
                <div className="performer-item">
                  <span className="performer-category">Record</span>
                  <span className="performer-stat">
                    {leagueData.teams[0]?.wins}-{leagueData.teams[0]?.losses}
                  </span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Runs Scored</span>
                  <span className="performer-stat">{stripStatUnits(leagueData.topOffense?.runs)}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Runs Allowed</span>
                  <span className="performer-stat">{stripStatUnits(leagueData.topPitching?.runsAllowed)}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Best Win %</span>
                  <span className="performer-stat">{stripStatUnits(leagueData.topBattingAvgTeam?.avg)}</span>
                </div>
                <div className="performer-item">
                  <span className="performer-category">Best Run Diff</span>
                  <span className="performer-stat">{leagueData.teams[0]?.runDiff >= 0 ? '+' : ''}{leagueData.teams[0]?.runDiff}</span>
                </div>
              </div>
            </div>

            {/* 1st Place Team Batting Stats */}
            <div className="performers-group">
              <div className="performers-subtitle">
                {statsLoading ? 'Loading...' : `${leaderBattingStats?.teamName || leagueData.teams[0]?.team} Batting`}
              </div>
              <div className="performers-list">
                {statsLoading ? (
                  <div className="performer-item">
                    <span className="performer-category">Loading stats...</span>
                  </div>
                ) : leaderBattingStats ? (
                  <>
                    <div className="performer-item">
                      <span className="performer-category">MLB Rank</span>
                      <span className="performer-stat">#{leaderBattingStats.mlb_hitting_rank || 'N/A'}</span>
                    </div>
                    <div className="performer-item">
                      <span className="performer-category">Home Runs</span>
                      <span className="performer-stat">{leaderBattingStats.homeruns ?? 'N/A'}</span>
                    </div>
                    <div className="performer-item">
                      <span className="performer-category">Average</span>
                      <span className="performer-stat">{leaderBattingStats.avg?.toFixed(3) ?? 'N/A'}</span>
                    </div>
                    <div className="performer-item">
                      <span className="performer-category">OPS</span>
                      <span className="performer-stat">{leaderBattingStats.ops?.toFixed(3) ?? 'N/A'}</span>
                    </div>
                    <div className="performer-item">
                      <span className="performer-category">Stolen Bases</span>
                      <span className="performer-stat">{leaderBattingStats.stolen_bases ?? 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <div className="performer-item">
                    <span className="performer-category">No batting data available</span>
                  </div>
                )}
              </div>
            </div>

            {/* 1st Place Team Pitching Stats */}
            <div className="performers-group">
              <div className="performers-subtitle">
                {statsLoading ? 'Loading...' : `${leaderPitchingStats?.teamName || leagueData.teams[0]?.team} Pitching`}
              </div>
              <div className="performers-list">
                {statsLoading ? (
                  <div className="performer-item">
                    <span className="performer-category">Loading stats...</span>
                  </div>
                ) : leaderPitchingStats ? (
                  <>
                    <div className="performer-item">
                      <span className="performer-category">MLB Rank</span>
                      <span className="performer-stat">#{leaderPitchingStats.mlb_pitching_rank || 'N/A'}</span>
                    </div>
                    <div className="performer-item">
                      <span className="performer-category">ERA</span>
                      <span className="performer-stat">{leaderPitchingStats.era?.toFixed(2) ?? 'N/A'}</span>
                    </div>
                    <div className="performer-item">
                      <span className="performer-category">WHIP</span>
                      <span className="performer-stat">{leaderPitchingStats.whip?.toFixed(2) ?? 'N/A'}</span>
                    </div>
                    <div className="performer-item">
                      <span className="performer-category">Strikeouts</span>
                      <span className="performer-stat">{leaderPitchingStats.strikeouts ?? 'N/A'}</span>
                    </div>
                    <div className="performer-item">
                      <span className="performer-category">Win %</span>
                      <span className="performer-stat">{leaderPitchingStats.win_pct?.toFixed(3) ?? 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <div className="performer-item">
                    <span className="performer-category">No pitching data available</span>
                  </div>
                )}
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
      </>
      )}
    </div>
  );
}

export default MLBStandingsSpringTraining;
