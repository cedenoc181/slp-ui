import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SEASONS, TEAMS, TEAM_METADATA } from '../../../../data/constants/apiConstants';
import playerStatsService from '../../../../data/services/playerStatsServices';
import injuryService from '../../../../data/services/injuryService';
import rosterService from '../../../../data/services/rosterService';
import '../../../../styles/stats-page-styling/player-profile.css';

function PlayerProfileStats() {
  const { playerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize season from URL params or default
  const [selectedSeason, setSelectedSeason] = useState(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam)) {
      return seasonParam;
    }
    return '2025';
  });

  // State for active tabs/filters
  const [activeStatsTab, setActiveStatsTab] = useState('current'); // current, career
  const [activeSplitsTab, setActiveSplitsTab] = useState('handedness'); // handedness, homeAway
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const seasonDropdownRef = useRef(null);
  const [activeGameLogMonth, setActiveGameLogMonth] = useState('all'); // all, apr, may, jun, jul, aug, sep, oct
  const [trendTimeframe, setTrendTimeframe] = useState('5y'); // 1y, 3y, 5y, career
  const [selectedChartMetric, setSelectedChartMetric] = useState('hr'); // hr, h, avg, ops, bb, so

  // Loading states
  const [playerLoading, setPlayerLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Player data state (populated by API)
  const [playerInfo, setPlayerInfo] = useState(null);
  const [seasonStats, setSeasonStats] = useState(null);
  const [careerStats, setCareerStats] = useState([]);
  const [careerTotals, setCareerTotals] = useState(null);
  const [careerTotalsLoading, setCareerTotalsLoading] = useState(false);
  const [vsHandSplits, setVsHandSplits] = useState([]);
  const [homeRoadSplits, setHomeRoadSplits] = useState([]);
  const [vsHandSplitsCareer, setVsHandSplitsCareer] = useState(null);
  const [homeRoadSplitsCareer, setHomeRoadSplitsCareer] = useState(null);
  const [careerSplitsLoading, setCareerSplitsLoading] = useState(false);
  const [monthlyPerformance, setMonthlyPerformance] = useState(null);
  const [teamHistory, setTeamHistory] = useState([]);
  const [injuryHistory, setInjuryHistory] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);

  // Sync season FROM URL params when they change
  useEffect(() => {
    const seasonParam = searchParams.get('season');
    if (seasonParam && SEASONS.includes(seasonParam) && seasonParam !== selectedSeason) {
      setSelectedSeason(seasonParam);
    }
  }, [searchParams, selectedSeason]);

  // Close season dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target)) {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update URL when season changes
  const handleSeasonChange = (newSeason) => {
    setSelectedSeason(newSeason);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('season', newSeason);
    setSearchParams(newParams, { replace: true });
  };

  // Fetch player info on mount or when playerId changes
  useEffect(() => {
    const fetchPlayerInfo = async () => {
      if (!playerId) return;
      
      setPlayerLoading(true);
      setError(null);
      
      try {
        const data = await playerStatsService.getPlayerInfo(playerId);
        setPlayerInfo(data);
      } catch (err) {
        console.error('Error fetching player info:', err);
        setError('Failed to load player information');
        setPlayerInfo(null);
      } finally {
        setPlayerLoading(false);
      }
    };
    
    fetchPlayerInfo();
  }, [playerId]);

  // Fetch player injury history when playerInfo loads
  useEffect(() => {
    const fetchInjuryHistory = async () => {
      if (!playerId) return;
      
      try {
        // Pass player.id (internal DB ID) to get accurate injury history
        // Don't pass season to get full history
        const response = await injuryService.getPlayerInjuryHistory(playerId);
        // API returns { player_id, season, total_injuries, injuries: [...] }
        const injuries = response?.injuries || [];
        setInjuryHistory(Array.isArray(injuries) ? injuries : []);
      } catch (err) {
        console.error('Error fetching injury history:', err);
        setInjuryHistory([]);
      }
    };
    
    fetchInjuryHistory();
  }, [playerId]);

  // Fetch team history (roster history) when playerId changes
  useEffect(() => {
    const fetchTeamHistory = async () => {
      if (!playerId) return;
      
      try {
        // Get player roster history without season param for full history
        const response = await rosterService.getPlayerRosterHistory(playerId);
        // API returns { player_id, player_mlb_id, player_name, seasons: [...] }
        const seasons = response?.seasons || [];
        setTeamHistory(Array.isArray(seasons) ? seasons : []);
      } catch (err) {
        console.error('Error fetching team history:', err);
        setTeamHistory([]);
      }
    };
    
    fetchTeamHistory();
  }, [playerId]);

  // Fetch season stats, career stats, and splits when player info or season changes
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!playerInfo || !playerId) return;
      
      setStatsLoading(true);
      
      try {
        // Determine player type based on position
        const isPitcher = playerInfo.position === 'P' || playerInfo.position === 'SP' || playerInfo.position === 'RP';
        const isTwoWay = playerInfo.position === 'TWP' || playerInfo.is_two_way;
        
        // Fetch current season stats
        if (isPitcher && !isTwoWay) {
          const [current, career, vsHand, homeRoad, monthly] = await Promise.all([
            playerStatsService.getPitcherCurrentStats(playerId, selectedSeason).catch(() => null),
            playerStatsService.getPitcherCareerStats(playerId).catch(() => []),
            playerStatsService.getPitcherVsHandSplits(playerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherHomeRoadSplits(playerId, selectedSeason).catch(() => []),
            playerStatsService.getPitcherMonthlyPerformance(playerId, selectedSeason).catch(() => null),
          ]);
          setSeasonStats(current);
          setCareerStats(career);
          setVsHandSplits(vsHand);
          setHomeRoadSplits(homeRoad);
          setMonthlyPerformance(monthly);
        } else {
          // Batter or two-way player (show batting stats by default)
          console.log('Fetching batter monthly performance with playerId:', playerId, 'season:', selectedSeason);
          const [current, career, vsHand, homeRoad, monthly] = await Promise.all([
            playerStatsService.getBatterCurrentStats(playerId, selectedSeason).catch(() => null),
            playerStatsService.getBatterCareerStats(playerId).catch(() => []),
            playerStatsService.getBatterVsHandSplits(playerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterHomeRoadSplits(playerId, selectedSeason).catch(() => []),
            playerStatsService.getBatterMonthlyPerformance(playerId, selectedSeason).catch((err) => {
              console.error('Monthly performance API error:', err);
              return null;
            }),
          ]);
          console.log('Monthly performance API response:', monthly);
          setSeasonStats(current);
          setCareerStats(career);
          setVsHandSplits(vsHand);
          setHomeRoadSplits(homeRoad);
          setMonthlyPerformance(monthly);
        }
      } catch (err) {
        console.error('Error fetching player stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchPlayerStats();
  }, [playerInfo, playerId, selectedSeason]);

  // Fetch career totals and career splits when Career tab is selected
  const handleCareerTabClick = useCallback(async () => {
    setActiveStatsTab('career');
    
    if (!playerInfo || !playerId) return;
    
    const isPitcher = playerInfo.position === 'P' || playerInfo.position === 'SP' || playerInfo.position === 'RP';
    const isTwoWay = playerInfo.position === 'TWP' || playerInfo.is_two_way;
    
    // Fetch career totals if not already loaded
    if (!careerTotals) {
      setCareerTotalsLoading(true);
      try {
        let totals;
        if (isPitcher && !isTwoWay) {
          totals = await playerStatsService.getPitcherCareerTotals(playerId);
        } else {
          totals = await playerStatsService.getBatterCareerTotals(playerId);
        }
        setCareerTotals(totals);
      } catch (err) {
        console.error('Error fetching career totals:', err);
        setCareerTotals(null);
      } finally {
        setCareerTotalsLoading(false);
      }
    }
    
    // Fetch career splits if not already loaded (batters only for now)
    if (!vsHandSplitsCareer && !homeRoadSplitsCareer && !isPitcher) {
      setCareerSplitsLoading(true);
      try {
        const [vsHandCareer, homeRoadCareer] = await Promise.all([
          playerStatsService.getBatterVsHandSplitsCareerTotals(playerId).catch(() => null),
          playerStatsService.getBatterHomeRoadSplitsCareerTotals(playerId).catch(() => null),
        ]);
        setVsHandSplitsCareer(vsHandCareer);
        setHomeRoadSplitsCareer(homeRoadCareer);
      } catch (err) {
        console.error('Error fetching career splits:', err);
      } finally {
        setCareerSplitsLoading(false);
      }
    }
  }, [playerInfo, playerId, careerTotals, vsHandSplitsCareer, homeRoadSplitsCareer]);

  // Calculate player age
  const playerAge = useMemo(() => {
    if (!playerInfo?.birth_date) return null;
    const birth = new Date(playerInfo.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, [playerInfo]);

  // Format date helper
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Get team logo URL
  const getTeamLogoUrl = useCallback((teamId) => {
    return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
  }, []);

  // Get player headshot URL
  const getPlayerHeadshotUrl = useCallback((mlbId) => {
    return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_100/v1/people/${mlbId}/headshot/67/current`;
  }, []);

  // Chart metric options and labels
  const chartMetricOptions = {
    hr: { label: 'Home Runs', short: 'HR' },
    h: { label: 'Hits', short: 'H' },
    rbi: { label: 'RBIs', short: 'RBI' },
    r: { label: 'Runs', short: 'R' },
    avg: { label: 'Batting Average', short: 'AVG' },
    ops: { label: 'OPS', short: 'OPS' },
    bb: { label: 'Walks', short: 'BB' },
    so: { label: 'Strikeouts', short: 'SO' }
  };

  // Transform monthly performance API data into chart format
  const getMonthlyChartData = useMemo(() => {
    console.log('monthlyPerformance:', monthlyPerformance);
    
    if (!monthlyPerformance) return {};
    
    // API returns data under 'monthly_stats' or 'batting' object with full month names
    const battingData = monthlyPerformance.monthly_stats || monthlyPerformance.batting || monthlyPerformance;
    console.log('battingData:', battingData);
    
    if (!battingData || typeof battingData !== 'object') return {};
    
    // Month mapping: display label -> API key (full month name)
    const monthMapping = [
      { display: 'Mar', apiKey: 'March' },
      { display: 'Apr', apiKey: 'April' },
      { display: 'May', apiKey: 'May' },
      { display: 'Jun', apiKey: 'June' },
      { display: 'Jul', apiKey: 'July' },
      { display: 'Aug', apiKey: 'August' },
      { display: 'Sep', apiKey: 'September' },
      { display: 'Oct', apiKey: 'October' }
    ];
    
    const result = {};
    
    // Map chart metrics to API response field names
    const fieldMappings = {
      hr: 'home_runs',
      h: 'hits',
      rbi: 'rbis',
      r: 'runs',
      avg: 'avg',
      ops: 'ops',
      bb: 'walks',
      so: 'strikeouts'
    };
    
    Object.entries(fieldMappings).forEach(([metric, apiField]) => {
      result[metric] = monthMapping
        .map(({ display, apiKey }) => {
          const monthData = battingData[apiKey] || {};
          return {
            period: display,
            value: monthData[apiField] || 0
          };
        })
        .filter(item => {
          // Include months that have data (any games played)
          const monthKey = monthMapping.find(m => m.display === item.period)?.apiKey;
          const monthData = battingData[monthKey] || {};
          return monthData.games > 0;
        });
    });
    
    console.log('getMonthlyChartData result:', result);
    return result;
  }, [monthlyPerformance]);

  // Transform career stats API data into yearly chart format (regular season only - season_type: 2)
  const getYearlyChartData = useMemo(() => {
    if (!careerStats || careerStats.length === 0) return {};
    
    // Filter to only include regular season stats (season_type: 2 or "2")
    const regularSeasonStats = careerStats.filter(season => 
      season.season_type === 2 || season.season_type === '2' || season.season_type === 'R'
    );
    
    if (regularSeasonStats.length === 0) return {};
    
    const result = {};
    const metrics = ['hr', 'h', 'rbi', 'r', 'avg', 'ops', 'bb', 'so'];
    
    // Map API response fields (may vary)
    const fieldMappings = {
      hr: ['hr', 'home_runs', 'HR'],
      h: ['h', 'hits', 'H'],
      rbi: ['rbi', 'rbis', 'RBI'],
      r: ['r', 'runs', 'R'],
      avg: ['avg', 'batting_avg', 'AVG', 'batting_average'],
      ops: ['ops', 'OPS'],
      bb: ['bb', 'walks', 'BB', 'base_on_balls'],
      so: ['so', 'strikeouts', 'SO', 'strike_outs']
    };
    
    metrics.forEach(metric => {
      result[metric] = regularSeasonStats
        .map(season => {
          // Find the value from any of the possible field names
          let value = 0;
          for (const field of fieldMappings[metric]) {
            if (season[field] !== undefined) {
              value = season[field];
              break;
            }
          }
          return {
            period: String(season.season || season.year),
            value: value || 0
          };
        })
        .sort((a, b) => parseInt(a.period) - parseInt(b.period)); // Sort by year
    });
    
    return result;
  }, [careerStats]);

  // Get the current chart data based on view mode
  const getChartData = () => {
    if (activeStatsTab === 'career') {
      return getYearlyChartData[selectedChartMetric] || [];
    }
    return getMonthlyChartData[selectedChartMetric] || [];
  };

  // Get max value for scaling bars
  const getMaxValue = (data) => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.value));
  };

  // Format value for display
  const formatChartValue = (value) => {
    if (selectedChartMetric === 'avg' || selectedChartMetric === 'ops') {
      return value.toFixed(3).replace(/^0/, '');
    }
    return value;
  };

  if (playerLoading) {
    return (
      <div className="pps-page">
        <div className="pps-loading-container">
          <div className="pps-loading-spinner"></div>
          <span>Loading player profile...</span>
        </div>
      </div>
    );
  }

  if (!playerInfo) {
    return (
      <div className="pps-page">
        <div className="pps-error-container">
          <span className="pps-error-icon">⚠️</span>
          <h2>Player Not Found</h2>
          <p>We couldn't find the player you're looking for.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pps-page">
      {/* ========== PLAYER HEADER SECTION ========== */}
      <header className="pps-header">
        <div className="pps-container">
          <div className="pps-header-content">
            {/* Player Photo & Basic Info */}
            <div className="pps-player-identity">
              <div className="pps-photo-wrapper">
                <img 
                  src={getPlayerHeadshotUrl(playerInfo.player_mlb_id)} 
                  alt={playerInfo.full_name || playerInfo.player_name}
                  className="pps-player-photo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="pps-jersey-number">#{playerInfo.jersey_number}</div>
              </div>
              
              <div className="pps-name-info">
                <h1 className="pps-player-name">{playerInfo.full_name || playerInfo.player_name}</h1>
                <div className="pps-team-position">
                  <span className="pps-position">{playerInfo.position_abbreviation || playerInfo.position}</span>
                  <span className="pps-separator">•</span>
                  <div className="pps-team-with-logo">
                    {playerInfo.current_team?.mlb_team_id && (
                      <img 
                        src={getTeamLogoUrl(playerInfo.current_team.mlb_team_id)} 
                        alt={playerInfo.current_team?.team_name || ''}
                        className="pps-team-logo"
                      />
                    )}
                    <span className="pps-team">
                      {playerInfo.current_team?.team_name || ''}
                    </span>
                  </div>
                </div>
                <div className="pps-status-badge">
                  <span className={`pps-status-dot ${playerInfo.injury_status?.toLowerCase() || (playerInfo.active ? 'active' : 'inactive')}`}></span>
                  {playerInfo.injury_status || playerInfo.roster_status || (playerInfo.active ? 'Active' : 'Inactive')}
                </div>
              </div>
            </div>

            {/* Player Quick Stats */}
            <div className="pps-quick-stats">
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Bats</span>
                <span className="pps-quick-stat-value">{playerInfo.bats === 'L' ? 'Left' : playerInfo.bats === 'R' ? 'Right' : 'Switch'}</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Throws</span>
                <span className="pps-quick-stat-value">{playerInfo.throws === 'L' ? 'Left' : 'Right'}</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Age</span>
                <span className="pps-quick-stat-value">{playerInfo.current_age || playerAge}</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Height</span>
                <span className="pps-quick-stat-value">{playerInfo.height}</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Weight</span>
                <span className="pps-quick-stat-value">{playerInfo.weight} lbs</span>
              </div>
              <div className="pps-quick-stat">
                <span className="pps-quick-stat-label">Debut</span>
                <span className="pps-quick-stat-value">{formatDate(playerInfo.mlb_debut_date || playerInfo.debut_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="pps-content">
        <div className="pps-container">
          
          {/* ========== PERFORMANCE TREND (Stock Chart Style) ========== */}
          <section className="pps-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Performance Trend</h2>
                <p className="pps-section-subtitle">Historical performance trajectory</p>
              </div>
              <div className="pps-tab-toggle">
                {['1y', '3y', '5y', 'career'].map((tf) => (
                  <button
                    key={tf}
                    className={`pps-tab-btn ${trendTimeframe === tf ? 'active' : ''}`}
                    onClick={() => setTrendTimeframe(tf)}
                  >
                    {tf === 'career' ? 'Career' : tf.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="pps-trend-chart-container">
              <div className="pps-trend-chart-placeholder">
                {/* Stock-style chart placeholder - will be replaced with actual chart library */}
                <div className="pps-trend-chart-mock"></div>
                <div className="pps-trend-chart-labels">
                  <span>2020</span>
                  <span>2025</span>
                </div>
              </div>
              <div className="pps-trend-summary">
                <div className="pps-trend-metric">
                  <span className="pps-trend-metric-label">OPS Trend</span>
                  <span className="pps-trend-metric-value positive">+8.2%</span>
                </div>
                <div className="pps-trend-metric">
                  <span className="pps-trend-metric-label">Peak Season</span>
                  <span className="pps-trend-metric-value">2023</span>
                </div>
                <div className="pps-trend-metric">
                  <span className="pps-trend-metric-label">Career AVG</span>
                  <span className="pps-trend-metric-value">.285</span>
                </div>
              </div>
            </div>
          </section>

          {/* ========== SEASON STATS ========== */}
          <section className="pps-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Season Statistics</h2>
                <p className="pps-section-subtitle">
                  {activeStatsTab === 'career' ? 'Career performance' : `${selectedSeason} season performance`}
                </p>
              </div>
              <div className="pps-tab-toggle" ref={seasonDropdownRef}>
                <button
                  className={`pps-tab-btn pps-dropdown-btn ${activeStatsTab === 'current' ? 'active' : ''}`}
                  onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                >
                  {selectedSeason}
                  <span className={`pps-dropdown-arrow ${seasonDropdownOpen ? 'open' : ''}`}>▼</span>
                </button>
                {seasonDropdownOpen && (
                  <div className="pps-dropdown-menu">
                    {SEASONS.filter(season => season !== selectedSeason).map((season) => (
                      <button
                        key={season}
                        className="pps-dropdown-item"
                        onClick={() => {
                          setActiveStatsTab('current');
                          handleSeasonChange(season);
                          setSeasonDropdownOpen(false);
                        }}
                      >
                        {season}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className={`pps-tab-btn ${activeStatsTab === 'career' ? 'active' : ''}`}
                  onClick={handleCareerTabClick}
                >
                  Career
                </button>
              </div>
            </div>
            
            <div className="pps-stats-grid">
              {/* Batting Stats Card */}
              <div className="pps-stats-card">
                <h3 className="pps-stats-card-title">Batting</h3>
                {(statsLoading || (activeStatsTab === 'career' && careerTotalsLoading)) ? (
                  <div className="pps-stats-loading">Loading stats...</div>
                ) : (activeStatsTab === 'career' ? careerTotals : seasonStats) ? (
                  <div className="pps-stats-table">
                    <div className="pps-stat-row header">
                      <span>G</span>
                      <span>AB</span>
                      <span>H</span>
                      <span>HR</span>
                      <span>RBI</span>
                      <span>R</span>
                      <span>AVG</span>
                      <span>OPS</span>
                    </div>
                    <div className="pps-stat-row values">
                      {(() => {
                        const stats = activeStatsTab === 'career' ? careerTotals : seasonStats;
                        return (
                          <>
                            <span>{stats.g || stats.games_played || '-'}</span>
                            <span>{stats.ab || stats.at_bats || '-'}</span>
                            <span>{stats.h || stats.hits || '-'}</span>
                            <span className="pps-highlight">{stats.hr || stats.home_runs || '-'}</span>
                            <span>{stats.rbis || stats.rbi || '-'}</span>
                            <span>{stats.r || stats.runs || '-'}</span>
                            <span>{stats.avg?.toFixed(3)?.replace(/^0/, '') || stats.batting_avg?.toFixed(3)?.replace(/^0/, '') || '-'}</span>
                            <span className="pps-highlight">{stats.ops?.toFixed(3) || '-'}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="pps-stats-no-data">No batting stats available</div>
                )}
              </div>

              {/* Additional Stats Card */}
              <div className="pps-stats-card">
                <h3 className="pps-stats-card-title">Additional</h3>
                {(statsLoading || (activeStatsTab === 'career' && careerTotalsLoading)) ? (
                  <div className="pps-stats-loading">Loading stats...</div>
                ) : (activeStatsTab === 'career' ? careerTotals : seasonStats) ? (
                  <div className="pps-stats-table">
                    <div className="pps-stat-row header">
                      <span>SB</span>
                      <span>BB</span>
                      <span>SO</span>
                      <span>2B</span>
                      <span>3B</span>
                      <span>TB</span>
                    </div>
                    <div className="pps-stat-row values">
                      {(() => {
                        const stats = activeStatsTab === 'career' ? careerTotals : seasonStats;
                        return (
                          <>
                            <span>{stats.sb || stats.stolen_bases || '-'}</span>
                            <span>{stats.bb || stats.walks || stats.base_on_balls || '-'}</span>
                            <span>{stats.so || stats.strikeouts || stats.strike_outs || '-'}</span>
                            <span>{stats.doubles || stats['2b'] || '-'}</span>
                            <span>{stats.triples || stats['3b'] || '-'}</span>
                            <span>{stats.tb || stats.total_bases || '-'}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="pps-stats-no-data">No additional stats available</div>
                )}
              </div>

              {/* If pitcher, show pitching stats */}
              {(playerInfo.position === 'P' || playerInfo.position === 'SP' || playerInfo.position === 'RP') && (
                <div className="pps-stats-card">
                  <h3 className="pps-stats-card-title">Pitching</h3>
                  {statsLoading ? (
                    <div className="pps-stats-loading">Loading stats...</div>
                  ) : seasonStats ? (
                    <div className="pps-stats-table">
                      <div className="pps-stat-row header">
                        <span>W</span>
                        <span>L</span>
                        <span>ERA</span>
                        <span>G</span>
                        <span>GS</span>
                        <span>IP</span>
                        <span>SO</span>
                        <span>WHIP</span>
                      </div>
                      <div className="pps-stat-row values">
                        <span>{seasonStats.w || seasonStats.wins || '-'}</span>
                        <span>{seasonStats.l || seasonStats.losses || '-'}</span>
                        <span>{seasonStats.era?.toFixed(2) || '-'}</span>
                        <span>{seasonStats.g || seasonStats.games || '-'}</span>
                        <span>{seasonStats.gs || seasonStats.games_started || '-'}</span>
                        <span>{seasonStats.ip || seasonStats.innings_pitched || '-'}</span>
                        <span>{seasonStats.so || seasonStats.strikeouts || seasonStats.strike_outs || '-'}</span>
                        <span>{seasonStats.whip?.toFixed(2) || '-'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pps-stats-no-data">No pitching stats available</div>
                  )}
                </div>
              )}
            </div>

            {/* Season Comparison Chart */}
            <div className="pps-comparison-chart">
              <div className="pps-comparison-chart-header">
                <h4>
                  {activeStatsTab === 'career' 
                    ? `${chartMetricOptions[selectedChartMetric].label} by Year`
                    : `Monthly ${chartMetricOptions[selectedChartMetric].label}`
                  }
                </h4>
                <select 
                  className="pps-metric-select"
                  value={selectedChartMetric}
                  onChange={(e) => setSelectedChartMetric(e.target.value)}
                >
                  {Object.entries(chartMetricOptions).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="pps-comparison-chart-container">
                {statsLoading ? (
                  <div className="pps-chart-loading">Loading chart data...</div>
                ) : (
                  <div className="pps-chart-placeholder">
                    <div className="pps-comparison-bars">
                      {(() => {
                        const chartData = getChartData();
                        if (!chartData || chartData.length === 0) {
                          return (
                            <div className="pps-chart-no-data">
                              No {activeStatsTab === 'career' ? 'career' : 'monthly'} data available
                            </div>
                          );
                        }
                        const maxValue = getMaxValue(chartData);
                        return chartData.map(({ period, value }) => (
                          <div key={period} className="pps-comparison-bar-group">
                            <div 
                              className="pps-comparison-bar"
                              style={{ 
                                '--bar-height': `${(value / maxValue) * 100}%`
                              }}
                            >
                              <span className="pps-bar-value">{formatChartValue(value)}</span>
                            </div>
                            <span className="pps-bar-label">{period}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ========== SPLITS SECTION ========== */}
          <section className="pps-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Player Splits</h2>
                <p className="pps-section-subtitle">
                  {activeStatsTab === 'career' ? 'Career' : selectedSeason} performance breakdowns
                </p>
              </div>
              <div className="pps-tab-toggle">
                <button
                  className={`pps-tab-btn ${activeSplitsTab === 'handedness' ? 'active' : ''}`}
                  onClick={() => setActiveSplitsTab('handedness')}
                >
                  vs L/R
                </button>
                <button
                  className={`pps-tab-btn ${activeSplitsTab === 'homeAway' ? 'active' : ''}`}
                  onClick={() => setActiveSplitsTab('homeAway')}
                >
                  Home/Away
                </button>
              </div>
            </div>

            <div className="pps-splits-content">
              {statsLoading || careerSplitsLoading ? (
                <div className="pps-stats-loading">Loading splits...</div>
              ) : activeSplitsTab === 'handedness' ? (
                <div className="pps-splits-comparison">
                  {/* vs LHP/LHB Split */}
                  {(() => {
                    // Use career splits if Career tab is active, otherwise use season splits
                    let vsLeft;
                    if (activeStatsTab === 'career' && vsHandSplitsCareer) {
                      vsLeft = vsHandSplitsCareer?.vs_lhp;
                    } else {
                      // API returns array with season entries containing vs_lhp/vs_rhp nested objects
                      const seasonSplits = vsHandSplits?.find(s => 
                        String(s.season) === String(selectedSeason)
                      );
                      vsLeft = seasonSplits?.vs_lhp || vsHandSplits?.find(s => 
                        s.split_type === 'vs_lhp' || s.vs_hand === 'L'
                      );
                    }
                    return (
                      <div className="pps-split-card vs-left">
                        <div className="pps-split-header">
                          <span className="pps-split-label">vs LHP</span>
                          <span className="pps-split-sample">{vsLeft?.hits || '-'} H</span>
                        </div>
                        <div className="pps-split-stats">
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsLeft?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                            </span>
                            <span className="pps-split-stat-label">AVG</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsLeft?.ops?.toFixed(3) || '-'}
                            </span>
                            <span className="pps-split-stat-label">OPS</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsLeft?.home_runs || '-'}</span>
                            <span className="pps-split-stat-label">HR</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsLeft?.total_bases || '-'}</span>
                            <span className="pps-split-stat-label">TB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsLeft?.strikeouts || '-'}</span>
                            <span className="pps-split-stat-label">SO</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsLeft?.walks || '-'}</span>
                            <span className="pps-split-stat-label">BB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsLeft?.at_bats_per_hr?.toFixed(1) || '-'}
                            </span>
                            <span className="pps-split-stat-label">AB/HR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="pps-split-vs-divider">VS</div>

                  {/* vs RHP/RHB Split */}
                  {(() => {
                    // Use career splits if Career tab is active, otherwise use season splits
                    let vsRight;
                    if (activeStatsTab === 'career' && vsHandSplitsCareer) {
                      vsRight = vsHandSplitsCareer?.vs_rhp;
                    } else {
                      // API returns array with season entries containing vs_lhp/vs_rhp nested objects
                      const seasonSplits = vsHandSplits?.find(s => 
                        String(s.season) === String(selectedSeason)
                      );
                      vsRight = seasonSplits?.vs_rhp || vsHandSplits?.find(s => 
                        s.split_type === 'vs_rhp' || s.vs_hand === 'R'
                      );
                    }
                    return (
                      <div className="pps-split-card vs-right">
                        <div className="pps-split-header">
                          <span className="pps-split-label">vs RHP</span>
                          <span className="pps-split-sample">{vsRight?.hits || '-'} H</span>
                        </div>
                        <div className="pps-split-stats">
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsRight?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                            </span>
                            <span className="pps-split-stat-label">AVG</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsRight?.ops?.toFixed(3) || '-'}
                            </span>
                            <span className="pps-split-stat-label">OPS</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsRight?.home_runs || '-'}</span>
                            <span className="pps-split-stat-label">HR</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsRight?.total_bases || '-'}</span>
                            <span className="pps-split-stat-label">TB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsRight?.strikeouts || '-'}</span>
                            <span className="pps-split-stat-label">SO</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{vsRight?.walks || '-'}</span>
                            <span className="pps-split-stat-label">BB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {vsRight?.at_bats_per_hr?.toFixed(1) || '-'}
                            </span>
                            <span className="pps-split-stat-label">AB/HR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="pps-splits-comparison">
                  {/* Home Split */}
                  {(() => {
                    // Use career splits if Career tab is active, otherwise use season splits
                    let homeSplit;
                    if (activeStatsTab === 'career' && homeRoadSplitsCareer) {
                      homeSplit = homeRoadSplitsCareer?.at_home;
                    } else {
                      // API returns array with season entries containing at_home/on_road nested objects
                      const seasonSplits = homeRoadSplits?.find(s => 
                        String(s.season) === String(selectedSeason)
                      );
                      homeSplit = seasonSplits?.at_home || homeRoadSplits?.find(s => 
                        s.split_type === 'home' || s.split_type === 'at_home' || 
                        s.split === 'home' || s.location === 'home'
                      );
                    }
                    return (
                      <div className="pps-split-card home">
                        <div className="pps-split-header">
                          <span className="pps-split-label">Home</span>
                          <span className="pps-split-sample">{homeSplit?.hits || '-'} H</span>
                        </div>
                        <div className="pps-split-stats">
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {homeSplit?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                            </span>
                            <span className="pps-split-stat-label">AVG</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {homeSplit?.ops?.toFixed(3) || '-'}
                            </span>
                            <span className="pps-split-stat-label">OPS</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{homeSplit?.home_runs || '-'}</span>
                            <span className="pps-split-stat-label">HR</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{homeSplit?.total_bases || '-'}</span>
                            <span className="pps-split-stat-label">TB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{homeSplit?.strikeouts || '-'}</span>
                            <span className="pps-split-stat-label">SO</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{homeSplit?.walks || '-'}</span>
                            <span className="pps-split-stat-label">BB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {homeSplit?.at_bats_per_hr?.toFixed(1) || '-'}
                            </span>
                            <span className="pps-split-stat-label">AB/HR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="pps-split-vs-divider">VS</div>

                  {/* Away/Road Split */}
                  {(() => {
                    // Use career splits if Career tab is active, otherwise use season splits
                    let awaySplit;
                    if (activeStatsTab === 'career' && homeRoadSplitsCareer) {
                      awaySplit = homeRoadSplitsCareer?.on_road;
                    } else {
                      // API returns array with season entries containing at_home/on_road nested objects
                      const seasonSplits = homeRoadSplits?.find(s => 
                        String(s.season) === String(selectedSeason)
                      );
                      awaySplit = seasonSplits?.on_road || homeRoadSplits?.find(s => 
                        s.split_type === 'away' || s.split_type === 'road' || s.split_type === 'on_road' ||
                        s.split === 'away' || s.split === 'road' || s.location === 'away'
                      );
                    }
                    return (
                      <div className="pps-split-card away">
                        <div className="pps-split-header">
                          <span className="pps-split-label">Away</span>
                          <span className="pps-split-sample">{awaySplit?.hits || '-'} H</span>
                        </div>
                        <div className="pps-split-stats">
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {awaySplit?.avg?.toFixed(3)?.replace(/^0/, '') || '-'}
                            </span>
                            <span className="pps-split-stat-label">AVG</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {awaySplit?.ops?.toFixed(3) || '-'}
                            </span>
                            <span className="pps-split-stat-label">OPS</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{awaySplit?.home_runs || '-'}</span>
                            <span className="pps-split-stat-label">HR</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{awaySplit?.total_bases || '-'}</span>
                            <span className="pps-split-stat-label">TB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{awaySplit?.strikeouts || '-'}</span>
                            <span className="pps-split-stat-label">SO</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">{awaySplit?.walks || '-'}</span>
                            <span className="pps-split-stat-label">BB</span>
                          </div>
                          <div className="pps-split-stat">
                            <span className="pps-split-stat-value">
                              {awaySplit?.at_bats_per_hr?.toFixed(1) || '-'}
                            </span>
                            <span className="pps-split-stat-label">AB/HR</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>

          {/* ========== TWO COLUMN LAYOUT: TEAM HISTORY & INJURY HISTORY ========== */}
          <div className="pps-two-column">
            {/* Team History */}
            <section className="pps-section">
              <div className="pps-section-header">
                <div>
                  <h2 className="pps-section-title">Team History</h2>
                  <p className="pps-section-subtitle">Career journey</p>
                </div>
              </div>
              <div className="pps-timeline">
                {/* Generate team history from roster API */}
                {(() => {
                  // Group roster history by team_id and calculate date ranges
                  const teamHistoryData = teamHistory.reduce((acc, season) => {
                    const teamId = season.team_id;
                    const teamAbbr = season.team_abbreviation;
                    // Look up MLB team ID from TEAM_METADATA using abbreviation
                    const mlbTeamId = TEAM_METADATA[teamAbbr]?.mlbId;
                    const teamName = season.team_name || 'Unknown Team';
                    const year = season.season;
                    const gamesPlayed = season.games_played || 0;
                    
                    if (!teamId) return acc;
                    
                    if (!acc[teamId]) {
                      acc[teamId] = {
                        teamId,
                        mlbTeamId,
                        teamName,
                        teamAbbreviation: teamAbbr,
                        seasons: [],
                        totalGames: 0,
                      };
                    }
                    acc[teamId].seasons.push(year);
                    acc[teamId].totalGames += gamesPlayed;
                    return acc;
                  }, {});

                  // Convert to array and sort by most recent
                  const groupedTeams = Object.values(teamHistoryData)
                    .map(team => ({
                      ...team,
                      startYear: Math.min(...team.seasons),
                      endYear: Math.max(...team.seasons),
                      seasonCount: team.seasons.length,
                    }))
                    .sort((a, b) => b.endYear - a.endYear);

                  if (groupedTeams.length === 0) {
                    // Fallback to current team if no roster history
                    return (
                      <div className="pps-timeline-item current">
                        <div className="pps-timeline-marker"></div>
                        <div className="pps-timeline-content">
                          <div className="pps-timeline-team">
                            {playerInfo.current_team?.mlb_team_id && (
                              <img 
                                src={getTeamLogoUrl(playerInfo.current_team.mlb_team_id)} 
                                alt={playerInfo.current_team?.team_name || ''}
                                className="pps-timeline-team-logo"
                              />
                            )}
                            <div className="pps-timeline-team-info">
                              <span className="pps-timeline-team-name">
                                {playerInfo.current_team?.team_name || 'Current Team'}
                              </span>
                              <span className="pps-timeline-years">
                                {playerInfo.first_active_season 
                                  ? `${playerInfo.first_active_season} - Present` 
                                  : 'Present'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return groupedTeams.map((team, idx) => (
                    <div key={team.teamId} className={`pps-timeline-item ${idx === 0 ? 'current' : ''}`}>
                      <div className="pps-timeline-marker"></div>
                      <div className="pps-timeline-content">
                        <div className="pps-timeline-team">
                          {team.mlbTeamId && (
                            <img 
                              src={getTeamLogoUrl(team.mlbTeamId)} 
                              alt={team.teamName}
                              className="pps-timeline-team-logo"
                            />
                          )}
                          <div className="pps-timeline-team-info">
                            <span className="pps-timeline-team-name">{team.teamName}</span>
                            <span className="pps-timeline-years">
                              {team.startYear === team.endYear 
                                ? team.startYear 
                                : `${team.startYear} - ${idx === 0 && team.endYear >= new Date().getFullYear() ? 'Present' : team.endYear}`
                              }
                            </span>
                          </div>
                        </div>
                        <div className="pps-timeline-stats">
                          <span>{team.seasonCount} season{team.seasonCount !== 1 ? 's' : ''}</span>
                          {team.totalGames > 0 && (
                            <>
                              <span className="pps-separator">•</span>
                              <span>{team.totalGames} G</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </section>

            {/* Injury History */}
            <section className="pps-section">
              <div className="pps-section-header">
                <div>
                  <h2 className="pps-section-title">Injury History</h2>
                  <p className="pps-section-subtitle">IL stints & recovery</p>
                </div>
              </div>
              <div className="pps-injury-list">
                {injuryHistory.length > 0 ? (
                  injuryHistory.map((injury, idx) => {
                    // Determine if injury is still active (no activation_date means still on IL)
                    const isActive = !injury.activation_date;
                    // Format injury description - capitalize first letter
                    const injuryDesc = injury.injury_desc 
                      ? injury.injury_desc.charAt(0).toUpperCase() + injury.injury_desc.slice(1)
                      : 'Injury';
                    
                    return (
                      <div key={injury.id || idx} className="pps-injury-item">
                        <div className="pps-injury-date">
                          <span className="pps-injury-month">
                            {new Date(injury.injury_date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="pps-injury-year">
                            {injury.season || new Date(injury.injury_date).getFullYear()}
                          </span>
                        </div>
                        <div className="pps-injury-details">
                          <span className="pps-injury-type">{injuryDesc}</span>
                          <span className="pps-injury-duration">
                            {injury.days_on_il ? `${injury.days_on_il} days` : injury.injury_period || 'IL'}
                          </span>
                        </div>
                        <div className={`pps-injury-status ${isActive ? 'active' : 'recovered'}`}>
                          <span>{isActive ? 'Active' : 'Recovered'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="pps-no-injuries-note">
                    <span>✓ No injury history available</span>
                  </div>
                )}
                {!playerInfo.is_injured && injuryHistory.length > 0 && (
                  <div className="pps-no-injuries-note">
                    <span>✓ No active injuries</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ========== GAME LOG ========== */}
          <section className="pps-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Game Log</h2>
                <p className="pps-section-subtitle">{selectedSeason} game-by-game results</p>
              </div>
              <div className="pps-game-log-filters">
                <select 
                  className="pps-month-filter"
                  value={activeGameLogMonth}
                  onChange={(e) => setActiveGameLogMonth(e.target.value)}
                >
                  <option value="all">All Games</option>
                  <option value="mar">March/April</option>
                  <option value="may">May</option>
                  <option value="jun">June</option>
                  <option value="jul">July</option>
                  <option value="aug">August</option>
                  <option value="sep">September</option>
                  <option value="oct">October</option>
                </select>
              </div>
            </div>

            <div className="pps-game-log-container">
              <div className="pps-game-log-table-wrapper">
                <table className="pps-game-log-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Opp</th>
                      <th>Result</th>
                      <th>AB</th>
                      <th>H</th>
                      <th>HR</th>
                      <th>RBI</th>
                      <th>BB</th>
                      <th>SO</th>
                      <th>AVG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sample game log entries */}
                    <tr>
                      <td className="pps-date-col">Sep 29</td>
                      <td className="pps-opp-col">
                        <span className="pps-opp-logo-small">COL</span>
                      </td>
                      <td className="pps-result-col win">W 8-4</td>
                      <td>4</td>
                      <td>2</td>
                      <td className="pps-highlight">1</td>
                      <td>3</td>
                      <td>1</td>
                      <td>1</td>
                      <td>.310</td>
                    </tr>
                    <tr>
                      <td className="pps-date-col">Sep 28</td>
                      <td className="pps-opp-col">
                        <span className="pps-opp-logo-small">@COL</span>
                      </td>
                      <td className="pps-result-col win">W 10-2</td>
                      <td>5</td>
                      <td>3</td>
                      <td className="pps-highlight">2</td>
                      <td>5</td>
                      <td>0</td>
                      <td>0</td>
                      <td>.309</td>
                    </tr>
                    <tr>
                      <td className="pps-date-col">Sep 27</td>
                      <td className="pps-opp-col">
                        <span className="pps-opp-logo-small">@COL</span>
                      </td>
                      <td className="pps-result-col loss">L 3-5</td>
                      <td>4</td>
                      <td>1</td>
                      <td>0</td>
                      <td>0</td>
                      <td>1</td>
                      <td>2</td>
                      <td>.307</td>
                    </tr>
                    <tr>
                      <td className="pps-date-col">Sep 26</td>
                      <td className="pps-opp-col">
                        <span className="pps-opp-logo-small">SD</span>
                      </td>
                      <td className="pps-result-col win">W 6-2</td>
                      <td>4</td>
                      <td>2</td>
                      <td className="pps-highlight">1</td>
                      <td>2</td>
                      <td>0</td>
                      <td>1</td>
                      <td>.307</td>
                    </tr>
                    <tr>
                      <td className="pps-date-col">Sep 25</td>
                      <td className="pps-opp-col">
                        <span className="pps-opp-logo-small">SD</span>
                      </td>
                      <td className="pps-result-col win">W 4-1</td>
                      <td>3</td>
                      <td>1</td>
                      <td>0</td>
                      <td>1</td>
                      <td>2</td>
                      <td>0</td>
                      <td>.306</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="pps-pagination">
                <button className="pps-pagination-btn" disabled>Previous</button>
                <span className="pps-pagination-info">Showing 1-5 of 159 games</span>
                <button className="pps-pagination-btn">Next</button>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default PlayerProfileStats;
