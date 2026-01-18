import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Import API Services
import teamsService from '../../../../data/services/teamsService';
import teamStatsService from '../../../../data/services/teamStatsService';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import gamesService from '../../../../data/services/gamesService';
import rosterService from '../../../../data/services/rosterService';

// Import Constants & Utilities
import { 
  TEAMS, 
  SEASONS,
  SEASON_TYPES, 
  PLAYER_ROLES,
  getTeamByAbbr,
  getTeamByUrlName,
  getTeamIdFromAbbr,
} from '../../../../data/constants/apiConstants';

function TeamAnalytics() {
  const { teamName } = useParams();
  const navigate = useNavigate();
  
  // ========== UI State ==========
  const [selectedTeam, setSelectedTeam] = useState('LAD');
  const [selectedSeason, setSelectedSeason] = useState('2025');
  const [timeframe, setTimeframe] = useState('season');
  const [chartFilter, setChartFilter] = useState('season');
  const [leadersToggle, setLeadersToggle] = useState('batting');
  const [teamStatsToggle, setTeamStatsToggle] = useState('batting');
  const [hideFloatingFilters, setHideFloatingFilters] = useState(false);
  const [isChartSectionVisible, setIsChartSectionVisible] = useState(false);
  const chartSectionRef = useRef(null);

  // ========== API Data State ==========
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Raw API Data
  const [teamSeasonData, setTeamSeasonData] = useState(null);
  const [teamMonthlyData, setTeamMonthlyData] = useState(null);
  const [battingStats, setBattingStats] = useState(null);
  const [pitchingStats, setPitchingStats] = useState(null);
  const [battingLeaders, setBattingLeaders] = useState(null);
  const [pitchingLeaders, setPitchingLeaders] = useState(null);
  const [last10Games, setLast10Games] = useState(null);
  const [homeGames, setHomeGames] = useState(null);
  const [awayGames, setAwayGames] = useState(null);
  const [roster, setRoster] = useState(null);
  const [teamSplits, setTeamSplits] = useState(null);

  // ========== Fetch All Team Data ==========
  const fetchTeamData = async (teamId, season) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`📡 Fetching data for team ${teamId}, season ${season}...`);

      const [
        seasonData,
        monthlyData,
        battingStatsData,
        pitchingStatsData,
        battingLeadersData,
        pitchingLeadersData,
        last10Data,
        homeGamesData,
        awayGamesData,
        rosterData,
        splitsData,
      ] = await Promise.all([
        teamsService.getTeamSeason(teamId, season).catch(err => { console.warn('Team season failed:', err); return null; }),
        teamsService.getTeamMonthly(teamId, season).catch(err => { console.warn('Team monthly failed:', err); return null; }),
        teamStatsService.getTeamBattingStats(teamId, season, SEASON_TYPES.REGULAR).catch(err => { console.warn('Batting stats failed:', err); return null; }),
        teamStatsService.getTeamPitchingStats(teamId, season, SEASON_TYPES.REGULAR).catch(err => { console.warn('Pitching stats failed:', err); return null; }),
        teamLeadersService.getTeamBattingLeaders(teamId, season, SEASON_TYPES.REGULAR).catch(err => { console.warn('Batting leaders failed:', err); return null; }),
        teamLeadersService.getTeamPitchingLeaders(teamId, season, SEASON_TYPES.REGULAR).catch(err => { console.warn('Pitching leaders failed:', err); return null; }),
        gamesService.getTeamLast10(teamId, season).catch(err => { console.warn('Last 10 failed:', err); return null; }),
        gamesService.getTeamHomeGames(teamId, season).catch(err => { console.warn('Home games failed:', err); return null; }),
        gamesService.getTeamAwayGames(teamId, season).catch(err => { console.warn('Away games failed:', err); return null; }),
        rosterService.getTeamRoster(teamId, season).catch(err => { console.warn('Roster failed:', err); return null; }),
        teamLeadersService.getTeamSplits(teamId, season, SEASON_TYPES.REGULAR, PLAYER_ROLES.BATTER).catch(err => { console.warn('Splits failed:', err); return null; }),
      ]);

      // Update state with raw data
      setTeamSeasonData(seasonData);
      setTeamMonthlyData(monthlyData);
      setBattingStats(battingStatsData);
      setPitchingStats(pitchingStatsData);
      setBattingLeaders(battingLeadersData);
      setPitchingLeaders(pitchingLeadersData);
      setLast10Games(last10Data);
      setHomeGames(homeGamesData);
      setAwayGames(awayGamesData);
      setRoster(rosterData);
      setTeamSplits(splitsData);

      console.log('✅ All data fetched successfully!');
    } catch (err) {
      console.error('❌ Error fetching team data:', err);
      setError(err.message || 'Failed to load team data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ========== Effects ==========
  useEffect(() => {
    if (teamName) {
      const team = getTeamByUrlName(teamName);
      if (team) {
        setSelectedTeam(team.id);
      } else {
        navigate('/team-analytics/los-angeles-dodgers', { replace: true });
      }
    } else {
      navigate('/team-analytics/los-angeles-dodgers', { replace: true });
    }
  }, [teamName, navigate]);

  useEffect(() => {
    const teamId = getTeamIdFromAbbr(selectedTeam);
    if (teamId) {
      fetchTeamData(teamId, selectedSeason);
    }
  }, [selectedTeam, selectedSeason]);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const observer = new IntersectionObserver(
      (entries) => setHideFloatingFilters(entries[0].isIntersecting),
      { root: null, threshold: 0 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = chartSectionRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => setIsChartSectionVisible(entries[0].isIntersecting),
      { root: null, threshold: 0.15 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // ========== Handlers ==========
  const handleTeamChange = (teamId) => {
    const team = getTeamByAbbr(teamId);
    if (team) {
      setSelectedTeam(teamId);
      navigate(`/team-analytics/${team.urlName}`);
    }
  };

  // ========== Data Helpers ==========
  
  // Get the correct season data based on timeframe
  // Structure: { record: {...}, runs: {...}, streak: {...}, home: {...}, away: {...} }
  const getSeasonData = () => {
    if (!teamSeasonData) return null;
    
    switch (timeframe) {
      case 'first-half':
        return teamSeasonData.first_half;
      case 'second-half':
        return teamSeasonData.second_half;
      default:
        return teamSeasonData.regular_season;
    }
  };

  // Helper to safely get streak string from streak object
  // streak: { streak_code: "W5", streak_type: "wins", streak_number: 5 }
  const getStreakString = (streak) => {
    if (!streak) return null;
    if (typeof streak === 'string') return streak;
    if (typeof streak === 'object') {
      return streak.streak_code || `${streak.streak_type?.[0]?.toUpperCase() || ''}${streak.streak_number || ''}`;
    }
    return String(streak);
  };

  // Helper to check if streak is winning
  const isWinningStreak = (streak) => {
    if (!streak) return false;
    if (typeof streak === 'string') return streak.toUpperCase().startsWith('W');
    if (typeof streak === 'object') {
      return streak.streak_type === 'wins' || streak.streak_code?.toUpperCase().startsWith('W');
    }
    return false;
  };

  // Get batting stats (it's an array, so get first item)
  const getBattingStats = () => {
    if (!battingStats || !Array.isArray(battingStats) || battingStats.length === 0) return null;
    return battingStats[0];
  };

  // Get pitching stats (it's an array, so get first item)
  const getPitchingStats = () => {
    if (!pitchingStats || !Array.isArray(pitchingStats) || pitchingStats.length === 0) return null;
    return pitchingStats[0];
  };

  // Calculate last 10 stats from games array
  const getLast10Stats = () => {
    const games = chartFilter === 'home' ? homeGames : chartFilter === 'away' ? awayGames : last10Games;
    
    if (!games || !Array.isArray(games) || games.length === 0) return null;
    
    // Take last 10 games
    const recentGames = games.slice(0, 10);
    
    let wins = 0;
    let losses = 0;
    let runsScored = 0;
    let runsAllowed = 0;
    
    recentGames.forEach(game => {
      if (game.result === 'W' || game.win) {
        wins++;
      } else {
        losses++;
      }
      runsScored += game.runs_scored || game.runsScored || game.runs || 0;
      runsAllowed += game.runs_allowed || game.runsAllowed || game.opponent_runs || 0;
    });
    
    return { wins, losses, runsScored, runsAllowed };
  };

  // ========== Computed Values ==========
  const currentTeam = getTeamByAbbr(selectedTeam);
  const currentTeamName = currentTeam?.name || 'Team';
  const shouldHideFloatingFilters = hideFloatingFilters || !isChartSectionVisible;
  
  const seasonData = getSeasonData();
  const currentBattingStats = getBattingStats();
  const currentPitchingStats = getPitchingStats();
  const last10Stats = getLast10Stats();

  // Extract nested data for easier access
  const record = seasonData?.record;
  const runs = seasonData?.runs;
  const streak = seasonData?.streak;
  const ranks = teamSeasonData?.regular_season?.ranks;
  const last10Record = teamSeasonData?.regular_season?.last_10;
  const recordSplits = teamSeasonData?.record_splits;

  // ========== Loading State ==========
  if (loading) {
    return (
      <div className="team-analytics-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading {currentTeamName} data...</p>
        </div>
      </div>
    );
  }

  // ========== Error State ==========
  if (error) {
    return (
      <div className="team-analytics-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Data</h2>
          <p className="error-message">{error}</p>
          <button onClick={() => fetchTeamData(getTeamIdFromAbbr(selectedTeam), selectedSeason)} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // ========== Render ==========
  return (
    <div className="team-analytics-page">
      {/* Header Section */}
      <div className="analytics-header">
        <div className="container">
          <div className="header-content">
            <div className="team-selector-wrapper">
              <div className="team-header-inline">
                <img 
                  src={`https://www.mlbstatic.com/team-logos/${currentTeam?.mlbId}.svg`} 
                  alt={`${currentTeamName} logo`}
                  className="team-logo-image"
                />
                <h1>{currentTeamName}</h1>
              </div>
              <div className="selectors-row">
                <div className="team-selector">
                  <select 
                    value={selectedTeam} 
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="team-dropdown"
                  >
                    {TEAMS.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div className="analytics-header season-selector">
                  <select 
                    value={selectedSeason} 
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="season-dropdown"
                  >
                    {SEASONS.map(season => (
                      <option key={season} value={season}>{season}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="timeframe-tabs">
              <button className={`tab ${timeframe === 'season' ? 'active' : ''}`} onClick={() => setTimeframe('season')}>Season</button>
              <button className={`tab ${timeframe === 'first-half' ? 'active' : ''}`} onClick={() => setTimeframe('first-half')}>1st Half</button>
              <button className={`tab ${timeframe === 'second-half' ? 'active' : ''}`} onClick={() => setTimeframe('second-half')}>2nd Half</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="analytics-content container">
        {/* Season Overview Cards */}
        <div className="overview-section">
          <div className="stat-card highlight">
            <div className="stat-header">
              <span className="stat-label">Record</span>
              {streak && (
                <span className={`trend-badge ${isWinningStreak(streak) ? 'positive' : 'negative'}`}>
                  {getStreakString(streak)}
                </span>
              )}
            </div>
            <div className="stat-value">
              {record?.wins || 0}-{record?.losses || 0}
            </div>
            <div className="stat-detail">
              Win % {record?.pct ? (record.pct * 100).toFixed(1) : '0.0'}%
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Run Differential</span>
            </div>
            <div className={`stat-value ${(runs?.run_differential ?? runs?.run_diff ?? 0) > 0 ? 'positive' : (runs?.run_differential ?? runs?.run_diff ?? 0) < 0 ? 'negative' : ''}`}>
              {(runs?.run_differential ?? runs?.run_diff ?? 0) > 0 ? '+' : ''}{runs?.run_differential ?? runs?.run_diff ?? 0}
            </div>
            <div className="stat-detail">
              {runs?.runs_scored || 0} RS / {runs?.runs_allowed || 0} RA
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Home Record</span>
            </div>
            <div className="stat-value">
              {seasonData?.home?.wins || recordSplits?.home?.wins || 0}-{seasonData?.home?.losses || recordSplits?.home?.losses || 0}
            </div>
            <div className="stat-detail">
              {((seasonData?.home?.pct || recordSplits?.home?.pct || 0) * 100).toFixed(1)}% win rate
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Away Record</span>
            </div>
            <div className="stat-value">
              {seasonData?.away?.wins || recordSplits?.away?.wins || 0}-{seasonData?.away?.losses || recordSplits?.away?.losses || 0}
            </div>
            <div className="stat-detail">
              {((seasonData?.away?.pct || recordSplits?.away?.pct || 0) * 100).toFixed(1)}% win rate
            </div>
          </div>
        </div>

        {/* Monthly Performance Trends Chart */}
        <div className="chart-section" ref={chartSectionRef}>
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Monthly Performance Trends</h3>
                <p className="card-subtitle">Track performance across the season</p>
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot wins"></span> Wins</span>
                <span className="legend-item"><span className="legend-dot losses"></span> Losses</span>
              </div>
            </div>

            <div className="chart-container">
              <div className="bar-chart">
                {teamMonthlyData && Array.isArray(teamMonthlyData) && teamMonthlyData.length > 0 ? (
                  teamMonthlyData.map((month, idx) => {
                    const wins = month.wins || month.w || 0;
                    const losses = month.losses || month.l || 0;
                    const totalGames = wins + losses;
                    const winPct = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
                  
                    return (
                      <div key={idx} className="bar-group">
                        <div className="bar-wrapper">
                          <div className="bar wins" style={{ height: `${(wins / 30) * 100}%` }}>
                            <span className="bar-label">{wins}</span>
                          </div>
                          <div className="bar losses" style={{ height: `${(losses / 30) * 100}%` }}>
                            <span className="bar-label">{losses}</span>
                          </div>
                        </div>
                        <div className="bar-month">{month.month || month.month_name || `Month ${idx + 1}`}</div>
                        <div className="bar-win-pct" style={{ 
                          color: winPct >= 60 ? '#4CAF50' : winPct >= 50 ? '#FF9800' : '#F44336' 
                        }}>{winPct}%</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data-message">No monthly data available</div>
                )}
              </div>

              <div className={`chart-filters floating-remote ${shouldHideFloatingFilters ? 'floating-hidden' : ''}`}>
                <button className={`chart-filter-btn ${chartFilter === 'season' ? 'active' : ''}`} onClick={() => setChartFilter('season')}>
                  <span className="filter-icon">📊</span> Combined
                </button>
                <button className={`chart-filter-btn ${chartFilter === 'home' ? 'active' : ''}`} onClick={() => setChartFilter('home')}>
                  <span className="filter-icon">🏠</span> Home
                </button>
                <button className={`chart-filter-btn ${chartFilter === 'away' ? 'active' : ''}`} onClick={() => setChartFilter('away')}>
                  <span className="filter-icon">✈️</span> Away
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
                {chartFilter === 'season' && <><span className="subtitle-bold">📊 Combined</span> performance breakdown</>}
                {chartFilter === 'home' && <><span className="subtitle-bold">🏠 Home</span> game performance breakdown</>}
                {chartFilter === 'away' && <><span className="subtitle-bold">✈️ Away</span> game performance breakdown</>}
              </p>
            </div>
            <div className="splits-grid">
              {recordSplits ? (
                <>
                  <div className="split-row">
                    <div className="split-label">vs Left-Handed Pitching</div>
                    <div className="split-stats">
                      <span className="split-record">
                        {recordSplits.vs_left?.wins || 0}-{recordSplits.vs_left?.losses || 0}
                      </span>
                      <span className="split-pct" style={{
                        color: (recordSplits.vs_left?.pct || 0) >= 0.6 ? '#4CAF50' : 
                               (recordSplits.vs_left?.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                      }}>
                        {((recordSplits.vs_left?.pct || 0) * 100).toFixed(1)}%
                      </span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ 
                          width: `${(recordSplits.vs_left?.pct || 0) * 100}%`,
                          backgroundColor: (recordSplits.vs_left?.pct || 0) >= 0.6 ? '#4CAF50' : 
                                           (recordSplits.vs_left?.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="split-row">
                    <div className="split-label">vs Right-Handed Pitching</div>
                    <div className="split-stats">
                      <span className="split-record">
                        {recordSplits.vs_right?.wins || 0}-{recordSplits.vs_right?.losses || 0}
                      </span>
                      <span className="split-pct" style={{
                        color: (recordSplits.vs_right?.pct || 0) >= 0.6 ? '#4CAF50' : 
                               (recordSplits.vs_right?.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                      }}>
                        {((recordSplits.vs_right?.pct || 0) * 100).toFixed(1)}%
                      </span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ 
                          width: `${(recordSplits.vs_right?.pct || 0) * 100}%`,
                          backgroundColor: (recordSplits.vs_right?.pct || 0) >= 0.6 ? '#4CAF50' : 
                                           (recordSplits.vs_right?.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="split-row">
                    <div className="split-label">Day Games</div>
                    <div className="split-stats">
                      <span className="split-record">
                        {recordSplits.day?.wins || 0}-{recordSplits.day?.losses || 0}
                      </span>
                      <span className="split-pct" style={{
                        color: (recordSplits.day?.pct || 0) >= 0.6 ? '#4CAF50' : 
                               (recordSplits.day?.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                      }}>
                        {((recordSplits.day?.pct || 0) * 100).toFixed(1)}%
                      </span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ 
                          width: `${(recordSplits.day?.pct || 0) * 100}%`,
                          backgroundColor: (recordSplits.day?.pct || 0) >= 0.6 ? '#4CAF50' : 
                                           (recordSplits.day?.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="split-row">
                    <div className="split-label">Night Games</div>
                    <div className="split-stats">
                      <span className="split-record">
                        {recordSplits.night?.wins || 0}-{recordSplits.night?.losses || 0}
                      </span>
                      <span className="split-pct" style={{
                        color: (recordSplits.night?.pct || 0) >= 0.6 ? '#4CAF50' : 
                               (recordSplits.night?.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                      }}>
                        {((recordSplits.night?.pct || 0) * 100).toFixed(1)}%
                      </span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ 
                          width: `${(recordSplits.night?.pct || 0) * 100}%`,
                          backgroundColor: (recordSplits.night?.pct || 0) >= 0.6 ? '#4CAF50' : 
                                           (recordSplits.night?.pct || 0) >= 0.5 ? '#FF9800' : '#F44336'
                        }}></div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-data-message">No splits data available</div>
              )}
            </div>
          </div>

          {/* Last 10 Games */}
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Last 10 Games</h3>
                <p className="card-subtitle">
                  {chartFilter === 'season' && <><strong>📊 Combined: </strong> last 10 games performance</>}
                  {chartFilter === 'home' && <><strong>🏠 Home: </strong> last 10 home games performance</>}
                  {chartFilter === 'away' && <><strong>✈️ Away: </strong> last 10 away games performance</>}
                </p>
              </div>
            </div>
            {/* Use API last_10 data if available, otherwise calculated */}
            {last10Record || last10Stats ? (
              <div className="last-10-stats">
                <div className="last-10-item">
                  <div className="last-10-label">Record</div>
                  <div className="last-10-value">
                    {last10Record?.wins ?? last10Stats?.wins ?? 0}-{last10Record?.losses ?? last10Stats?.losses ?? 0}
                  </div>
                </div>
                <div className="last-10-item">
                  <div className="last-10-label">Runs Scored</div>
                  <div className="last-10-value">{last10Stats?.runsScored || '-'}</div>
                </div>
                <div className="last-10-item">
                  <div className="last-10-label">Runs Allowed</div>
                  <div className="last-10-value">{last10Stats?.runsAllowed || '-'}</div>
                </div>
                <div className="last-10-item">
                  <div className="last-10-label">Run Differential</div>
                  <div className={`last-10-value ${last10Stats ? ((last10Stats.runsScored - last10Stats.runsAllowed) > 0 ? 'positive' : (last10Stats.runsScored - last10Stats.runsAllowed) < 0 ? 'negative' : '') : ''}`}>
                    {last10Stats ? `${(last10Stats.runsScored - last10Stats.runsAllowed) > 0 ? '+' : ''}${last10Stats.runsScored - last10Stats.runsAllowed}` : '-'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data-message">No last 10 games data available</div>
            )}
          </div>
        </div>

        {/* Team Info Grid: Standings, Leaders, Stats */}
        <div className="team-info-grid">
          {/* Team Standings */}
          <div className="section-card">
            <div className="card-header">
              <h3>Team Standings</h3>
              <p className="card-subtitle">
                {ranks?.division_rank ? `#${ranks.division_rank} in Division` : teamSeasonData?.team?.division || 'N/A'}
              </p>
            </div>
            <div className="standings-content">
              <div className="standings-row">
                <span className="standings-label">Wins</span>
                <span className="standings-value">{record?.wins || 0}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Losses</span>
                <span className="standings-value">{record?.losses || 0}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Win %</span>
                <span className="standings-value">{record?.pct?.toFixed(3) || '.000'}</span>
              </div>
              <div className="standings-row">
                <span className="standings-label">Games Back</span>
                <span className="standings-value">{record?.games_back === null || record?.games_back === 0 ? '-' : record?.games_back}</span>
              </div>
              <div className="standings-row highlight">
                <span className="standings-label">Streak</span>
                <span className={`standings-value streak-badge ${isWinningStreak(streak) ? 'positive' : 'negative'}`}>
                  {getStreakString(streak) || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Team Leaders */}
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Team Leaders</h3>
                <p className="card-subtitle">Top performers</p>
              </div>
              <div className="toggle-buttons">
                <button className={`toggle-btn ${leadersToggle === 'batting' ? 'active' : ''}`} onClick={() => setLeadersToggle('batting')}>Batting</button>
                <button className={`toggle-btn ${leadersToggle === 'pitching' ? 'active' : ''}`} onClick={() => setLeadersToggle('pitching')}>Pitching</button>
              </div>
            </div>
            
            {leadersToggle === 'batting' ? (
              battingLeaders ? (
                <div className="leaders-content">
                  <div className="leader-row">
                    <div className="leader-stat-label">Home Runs</div>
                    <div className="leader-info">
                      <span className="leader-player">{battingLeaders.home_runs?.player_name || battingLeaders.home_runs?.player || 'N/A'}</span>
                      <span className="leader-value">{battingLeaders.home_runs?.value || battingLeaders.home_runs?.stat || 0}</span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <div className="leader-stat-label">Batting Average</div>
                    <div className="leader-info">
                      <span className="leader-player">{battingLeaders.avg?.player_name || battingLeaders.batting_avg?.player_name || 'N/A'}</span>
                      <span className="leader-value">{battingLeaders.avg?.value || battingLeaders.batting_avg?.value || '.000'}</span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <div className="leader-stat-label">RBI</div>
                    <div className="leader-info">
                      <span className="leader-player">{battingLeaders.rbis?.player_name || battingLeaders.rbi?.player_name || 'N/A'}</span>
                      <span className="leader-value">{battingLeaders.rbis?.value || battingLeaders.rbi?.value || 0}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data-message">No batting leaders data available</div>
              )
            ) : (
              pitchingLeaders ? (
                <div className="leaders-content">
                  <div className="leader-row">
                    <div className="leader-stat-label">Strikeouts</div>
                    <div className="leader-info">
                      <span className="leader-player">{pitchingLeaders.strikeouts?.player_name || 'N/A'}</span>
                      <span className="leader-value">{pitchingLeaders.strikeouts?.value || 0}</span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <div className="leader-stat-label">ERA</div>
                    <div className="leader-info">
                      <span className="leader-player">{pitchingLeaders.era?.player_name || 'N/A'}</span>
                      <span className="leader-value">{pitchingLeaders.era?.value || '0.00'}</span>
                    </div>
                  </div>
                  <div className="leader-row">
                    <div className="leader-stat-label">Wins</div>
                    <div className="leader-info">
                      <span className="leader-player">{pitchingLeaders.wins?.player_name || 'N/A'}</span>
                      <span className="leader-value">{pitchingLeaders.wins?.value || 0}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data-message">No pitching leaders data available</div>
              )
            )}
          </div>

          {/* Team Stats */}
          <div className="section-card">
            <div className="card-header">
              <div>
                <h3>Team Stats</h3>
                <p className="card-subtitle">Overall performance</p>
              </div>
              <div className="toggle-buttons">
                <button className={`toggle-btn ${teamStatsToggle === 'batting' ? 'active' : ''}`} onClick={() => setTeamStatsToggle('batting')}>Batting</button>
                <button className={`toggle-btn ${teamStatsToggle === 'pitching' ? 'active' : ''}`} onClick={() => setTeamStatsToggle('pitching')}>Pitching</button>
              </div>
            </div>
            
            {teamStatsToggle === 'batting' ? (
              currentBattingStats ? (
                <div className="team-stats-content">
                  <div className="team-stat-row">
                    <span className="team-stat-label">Team AVG</span>
                    <span className="team-stat-value">{currentBattingStats.avg || currentBattingStats.batting_avg || '.000'}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">OPS</span>
                    <span className="team-stat-value">{currentBattingStats.ops || '.000'}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">Home Runs</span>
                    <span className="team-stat-value">{currentBattingStats.home_runs || currentBattingStats.hr || 0}</span>
                  </div>
                  <div className="team-stat-row highlight">
                    <span className="team-stat-label">Runs Scored</span>
                    <span className="team-stat-value">{currentBattingStats.runs || currentBattingStats.r || 0}</span>
                  </div>
                </div>
              ) : (
                <div className="no-data-message">No batting stats available</div>
              )
            ) : (
              currentPitchingStats ? (
                <div className="team-stats-content">
                  <div className="team-stat-row">
                    <span className="team-stat-label">Team ERA</span>
                    <span className="team-stat-value">{currentPitchingStats.era || '0.00'}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">WHIP</span>
                    <span className="team-stat-value">{currentPitchingStats.whip || '0.00'}</span>
                  </div>
                  <div className="team-stat-row">
                    <span className="team-stat-label">Strikeouts</span>
                    <span className="team-stat-value">{currentPitchingStats.strikeouts || currentPitchingStats.so || 0}</span>
                  </div>
                  <div className="team-stat-row highlight">
                    <span className="team-stat-label">Opp AVG</span>
                    <span className="team-stat-value">{currentPitchingStats.opp_avg || currentPitchingStats.avg || '.000'}</span>
                  </div>
                </div>
              ) : (
                <div className="no-data-message">No pitching stats available</div>
              )
            )}
          </div>
        </div>

        {/* Team Roster and Injury List */}
        <div className="roster-injury-section">
          {/* Team Roster */}
          <div className="section-card roster-card">
            <div className="card-header">
              <h3>Team Roster</h3>
              <p className="card-subtitle">{roster?.length || 0} Active Players</p>
            </div>
            <div className="roster-table-container">
              {roster && roster.length > 0 ? (
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
                    {roster.map((player, idx) => (
                      <tr key={idx}>
                        <td className="player-number">{player.jersey_number || player.number || '-'}</td>
                        <td className="player-name">{player.full_name || player.name || player.player_name || 'Unknown'}</td>
                        <td className="player-position">
                          <span className="position-badge">{player.primary_position || player.position || '-'}</span>
                        </td>
                        <td className="player-hands">
                          {player.bat_side || player.bats || '-'}/{player.pitch_hand || player.throws || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data-message">No roster data available</div>
              )}
            </div>
          </div>

          {/* Team Injury List */}
          <div className="section-card injury-card">
            <div className="card-header">
              <h3>Injury Report</h3>
              <p className="card-subtitle">
                {teamSeasonData?.injuries?.length || 0} {(teamSeasonData?.injuries?.length || 0) === 1 ? 'Player' : 'Players'} Injured
              </p>
            </div>
            <div className="injury-list">
              {teamSeasonData?.injuries && teamSeasonData.injuries.length > 0 ? (
                teamSeasonData.injuries.map((injury, idx) => (
                  <div key={idx} className="injury-item">
                    <div className="injury-player-info">
                      <div className="injury-player-name">{injury.name || injury.player_name}</div>
                      <div className="injury-position">{injury.position}</div>
                    </div>
                    <div className="injury-details">
                      <div className="injury-type">{injury.injury || injury.description}</div>
                      <div className="injury-status-row">
                        <span className={`injury-status ${injury.status?.includes('60') ? 'long-term' : 'short-term'}`}>
                          {injury.status}
                        </span>
                        <span className="injury-return">Return: {injury.expected_return || injury.expectedReturn || 'TBD'}</span>
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
      </div>
    </div>
  );
}

export default TeamAnalytics;