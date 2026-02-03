import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SEASONS, TEAMS } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/player-profile.css';

// Mock data structure - will be replaced with API calls
const MOCK_PLAYER = {
  player_id: 660271,
  player_mlb_id: 660271,
  player_name: 'Shohei Ohtani',
  first_name: 'Shohei',
  last_name: 'Ohtani',
  jersey_number: 17,
  position: 'DH',
  bats: 'L',
  throws: 'R',
  height: '6\'4"',
  weight: 210,
  birth_date: '1994-07-05',
  birth_place: 'Oshu, Japan',
  debut_date: '2018-03-29',
  current_team: 'Los Angeles Dodgers',
  current_team_id: 119,
  status: 'Active',
};

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
  const [activeGameLogMonth, setActiveGameLogMonth] = useState('all'); // all, apr, may, jun, jul, aug, sep, oct
  const [trendTimeframe, setTrendTimeframe] = useState('5y'); // 1y, 3y, 5y, career
  const [selectedChartMetric, setSelectedChartMetric] = useState('hr'); // hr, h, avg, ops, bb, so

  // Loading states
  const [playerLoading, setPlayerLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Player data state (will be populated by API)
  const [playerInfo, setPlayerInfo] = useState(null);
  const [seasonStats, setSeasonStats] = useState(null);
  const [careerStats, setCareerStats] = useState(null);
  const [splitsData, setSplitsData] = useState(null);
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

  // Update URL when season changes
  const handleSeasonChange = (newSeason) => {
    setSelectedSeason(newSeason);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('season', newSeason);
    setSearchParams(newParams, { replace: true });
  };

  // Simulate loading player data (replace with actual API call)
  useEffect(() => {
    setPlayerLoading(true);
    // Simulate API delay
    const timer = setTimeout(() => {
      setPlayerInfo(MOCK_PLAYER);
      setPlayerLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [playerId]);

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
    avg: { label: 'Batting Average', short: 'AVG' },
    ops: { label: 'OPS', short: 'OPS' },
    bb: { label: 'Walks', short: 'BB' },
    so: { label: 'Strikeouts', short: 'SO' }
  };

  // Mock monthly performance data (for season view)
  const monthlyPerformanceData = {
    hr: [
      { period: 'Apr', value: 8 },
      { period: 'May', value: 12 },
      { period: 'Jun', value: 9 },
      { period: 'Jul', value: 7 },
      { period: 'Aug', value: 11 },
      { period: 'Sep', value: 7 }
    ],
    h: [
      { period: 'Apr', value: 28 },
      { period: 'May', value: 35 },
      { period: 'Jun', value: 32 },
      { period: 'Jul', value: 29 },
      { period: 'Aug', value: 38 },
      { period: 'Sep', value: 25 }
    ],
    avg: [
      { period: 'Apr', value: .298 },
      { period: 'May', value: .325 },
      { period: 'Jun', value: .312 },
      { period: 'Jul', value: .289 },
      { period: 'Aug', value: .342 },
      { period: 'Sep', value: .278 }
    ],
    ops: [
      { period: 'Apr', value: .945 },
      { period: 'May', value: 1.082 },
      { period: 'Jun', value: .998 },
      { period: 'Jul', value: .912 },
      { period: 'Aug', value: 1.125 },
      { period: 'Sep', value: .889 }
    ],
    bb: [
      { period: 'Apr', value: 12 },
      { period: 'May', value: 18 },
      { period: 'Jun', value: 15 },
      { period: 'Jul', value: 14 },
      { period: 'Aug', value: 20 },
      { period: 'Sep', value: 13 }
    ],
    so: [
      { period: 'Apr', value: 28 },
      { period: 'May', value: 32 },
      { period: 'Jun', value: 25 },
      { period: 'Jul', value: 30 },
      { period: 'Aug', value: 27 },
      { period: 'Sep', value: 24 }
    ]
  };

  // Mock yearly performance data (for career view)
  const yearlyPerformanceData = {
    hr: [
      { period: '2018', value: 22 },
      { period: '2019', value: 18 },
      { period: '2020', value: 7 },
      { period: '2021', value: 46 },
      { period: '2022', value: 34 },
      { period: '2023', value: 44 },
      { period: '2024', value: 54 },
      { period: '2025', value: 48 }
    ],
    h: [
      { period: '2018', value: 93 },
      { period: '2019', value: 110 },
      { period: '2020', value: 29 },
      { period: '2021', value: 138 },
      { period: '2022', value: 160 },
      { period: '2023', value: 151 },
      { period: '2024', value: 197 },
      { period: '2025', value: 187 }
    ],
    avg: [
      { period: '2018', value: .285 },
      { period: '2019', value: .286 },
      { period: '2020', value: .190 },
      { period: '2021', value: .257 },
      { period: '2022', value: .273 },
      { period: '2023', value: .304 },
      { period: '2024', value: .310 },
      { period: '2025', value: .305 }
    ],
    ops: [
      { period: '2018', value: .925 },
      { period: '2019', value: .848 },
      { period: '2020', value: .657 },
      { period: '2021', value: .965 },
      { period: '2022', value: .875 },
      { period: '2023', value: 1.066 },
      { period: '2024', value: 1.036 },
      { period: '2025', value: 1.012 }
    ],
    bb: [
      { period: '2018', value: 37 },
      { period: '2019', value: 33 },
      { period: '2020', value: 17 },
      { period: '2021', value: 96 },
      { period: '2022', value: 72 },
      { period: '2023', value: 91 },
      { period: '2024', value: 81 },
      { period: '2025', value: 92 }
    ],
    so: [
      { period: '2018', value: 102 },
      { period: '2019', value: 110 },
      { period: '2020', value: 50 },
      { period: '2021', value: 189 },
      { period: '2022', value: 161 },
      { period: '2023', value: 143 },
      { period: '2024', value: 166 },
      { period: '2025', value: 158 }
    ]
  };

  // Get the current chart data based on view mode
  const getChartData = () => {
    const data = activeStatsTab === 'career' 
      ? yearlyPerformanceData[selectedChartMetric] 
      : monthlyPerformanceData[selectedChartMetric];
    return data || [];
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
                  alt={playerInfo.player_name}
                  className="pps-player-photo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="pps-jersey-number">#{playerInfo.jersey_number}</div>
              </div>
              
              <div className="pps-name-info">
                <h1 className="pps-player-name">{playerInfo.player_name}</h1>
                <div className="pps-team-position">
                  <span className="pps-position">{playerInfo.position}</span>
                  <span className="pps-separator">•</span>
                  <div className="pps-team-with-logo">
                    {playerInfo.current_team_id && (
                      <img 
                        src={getTeamLogoUrl(playerInfo.current_team_id)} 
                        alt={playerInfo.current_team}
                        className="pps-team-logo"
                      />
                    )}
                    <span className="pps-team">{playerInfo.current_team}</span>
                  </div>
                </div>
                <div className="pps-status-badge">
                  <span className={`pps-status-dot ${playerInfo.status?.toLowerCase()}`}></span>
                  {playerInfo.status}
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
                <span className="pps-quick-stat-value">{playerAge}</span>
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
                <span className="pps-quick-stat-value">{formatDate(playerInfo.debut_date)}</span>
              </div>
            </div>

            {/* Season Selector */}
            <div className="pps-season-selector">
              <label htmlFor="pps-season-select">Season</label>
              <select 
                id="pps-season-select"
                className="pps-season-dropdown"
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
              >
                {SEASONS.map((season) => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
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
                <p className="pps-section-subtitle">{selectedSeason} season performance</p>
              </div>
              <div className="pps-tab-toggle">
                <button
                  className={`pps-tab-btn ${activeStatsTab === 'current' ? 'active' : ''}`}
                  onClick={() => setActiveStatsTab('current')}
                >
                  {selectedSeason}
                </button>
                <button
                  className={`pps-tab-btn ${activeStatsTab === 'career' ? 'active' : ''}`}
                  onClick={() => setActiveStatsTab('career')}
                >
                  Career
                </button>
              </div>
            </div>
            
            <div className="pps-stats-grid">
              {/* Batting Stats Card */}
              <div className="pps-stats-card">
                <h3 className="pps-stats-card-title">Batting</h3>
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
                    <span>159</span>
                    <span>636</span>
                    <span>197</span>
                    <span className="pps-highlight">54</span>
                    <span>130</span>
                    <span>134</span>
                    <span>.310</span>
                    <span className="pps-highlight">1.036</span>
                  </div>
                </div>
              </div>

              {/* Additional Stats Card */}
              <div className="pps-stats-card">
                <h3 className="pps-stats-card-title">Additional</h3>
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
                    <span>59</span>
                    <span>81</span>
                    <span>143</span>
                    <span>38</span>
                    <span>8</span>
                    <span>411</span>
                  </div>
                </div>
              </div>

              {/* If pitcher, show pitching stats */}
              {playerInfo.position === 'P' && (
                <div className="pps-stats-card">
                  <h3 className="pps-stats-card-title">Pitching</h3>
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
                      <span>10</span>
                      <span>5</span>
                      <span>3.14</span>
                      <span>23</span>
                      <span>23</span>
                      <span>132.0</span>
                      <span>167</span>
                      <span>1.06</span>
                    </div>
                  </div>
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
                <div className="pps-chart-placeholder">
                  <div className="pps-comparison-bars">
                    {(() => {
                      const chartData = getChartData();
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
              </div>
            </div>
          </section>

          {/* ========== SPLITS SECTION ========== */}
          <section className="pps-section">
            <div className="pps-section-header">
              <div>
                <h2 className="pps-section-title">Player Splits</h2>
                <p className="pps-section-subtitle">Performance breakdowns</p>
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
              {activeSplitsTab === 'handedness' ? (
                <div className="pps-splits-comparison">
                  <div className="pps-split-card vs-left">
                    <div className="pps-split-header">
                      <span className="pps-split-label">vs LHP</span>
                      <span className="pps-split-sample">142 PA</span>
                    </div>
                    <div className="pps-split-stats">
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">.298</span>
                        <span className="pps-split-stat-label">AVG</span>
                      </div>
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">.912</span>
                        <span className="pps-split-stat-label">OPS</span>
                      </div>
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">12</span>
                        <span className="pps-split-stat-label">HR</span>
                      </div>
                    </div>
                  </div>

                  <div className="pps-split-vs-divider">VS</div>

                  <div className="pps-split-card vs-right">
                    <div className="pps-split-header">
                      <span className="pps-split-label">vs RHP</span>
                      <span className="pps-split-sample">494 PA</span>
                    </div>
                    <div className="pps-split-stats">
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">.315</span>
                        <span className="pps-split-stat-label">AVG</span>
                      </div>
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">1.082</span>
                        <span className="pps-split-stat-label">OPS</span>
                      </div>
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">42</span>
                        <span className="pps-split-stat-label">HR</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pps-splits-comparison">
                  <div className="pps-split-card home">
                    <div className="pps-split-header">
                      <span className="pps-split-label">Home</span>
                      <span className="pps-split-sample">81 G</span>
                    </div>
                    <div className="pps-split-stats">
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">.324</span>
                        <span className="pps-split-stat-label">AVG</span>
                      </div>
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">1.068</span>
                        <span className="pps-split-stat-label">OPS</span>
                      </div>
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">30</span>
                        <span className="pps-split-stat-label">HR</span>
                      </div>
                    </div>
                  </div>

                  <div className="pps-split-vs-divider">VS</div>

                  <div className="pps-split-card away">
                    <div className="pps-split-header">
                      <span className="pps-split-label">Away</span>
                      <span className="pps-split-sample">78 G</span>
                    </div>
                    <div className="pps-split-stats">
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">.295</span>
                        <span className="pps-split-stat-label">AVG</span>
                      </div>
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">1.004</span>
                        <span className="pps-split-stat-label">OPS</span>
                      </div>
                      <div className="pps-split-stat">
                        <span className="pps-split-stat-value">24</span>
                        <span className="pps-split-stat-label">HR</span>
                      </div>
                    </div>
                  </div>
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
                <div className="pps-timeline-item current">
                  <div className="pps-timeline-marker"></div>
                  <div className="pps-timeline-content">
                    <div className="pps-timeline-team">
                      <img 
                        src={getTeamLogoUrl(119)} 
                        alt="Dodgers"
                        className="pps-timeline-team-logo"
                      />
                      <div className="pps-timeline-team-info">
                        <span className="pps-timeline-team-name">Los Angeles Dodgers</span>
                        <span className="pps-timeline-years">2024 - Present</span>
                      </div>
                    </div>
                    <div className="pps-timeline-stats">
                      <span>2 seasons</span>
                      <span className="pps-separator">•</span>
                      <span>AVG: .306</span>
                    </div>
                  </div>
                </div>
                <div className="pps-timeline-item">
                  <div className="pps-timeline-marker"></div>
                  <div className="pps-timeline-content">
                    <div className="pps-timeline-team">
                      <img 
                        src={getTeamLogoUrl(108)} 
                        alt="Angels"
                        className="pps-timeline-team-logo"
                      />
                      <div className="pps-timeline-team-info">
                        <span className="pps-timeline-team-name">Los Angeles Angels</span>
                        <span className="pps-timeline-years">2018 - 2023</span>
                      </div>
                    </div>
                    <div className="pps-timeline-stats">
                      <span>6 seasons</span>
                      <span className="pps-separator">•</span>
                      <span>AVG: .274</span>
                    </div>
                  </div>
                </div>
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
                <div className="pps-injury-item">
                  <div className="pps-injury-date">
                    <span className="pps-injury-month">Sep</span>
                    <span className="pps-injury-year">2023</span>
                  </div>
                  <div className="pps-injury-details">
                    <span className="pps-injury-type">UCL Tear (Elbow)</span>
                    <span className="pps-injury-duration">Season-ending surgery</span>
                  </div>
                  <div className="pps-injury-status recovered">
                    <span>Recovered</span>
                  </div>
                </div>
                <div className="pps-injury-item">
                  <div className="pps-injury-date">
                    <span className="pps-injury-month">Jul</span>
                    <span className="pps-injury-year">2020</span>
                  </div>
                  <div className="pps-injury-details">
                    <span className="pps-injury-type">Forearm Strain</span>
                    <span className="pps-injury-duration">15-day IL</span>
                  </div>
                  <div className="pps-injury-status recovered">
                    <span>Recovered</span>
                  </div>
                </div>
                <div className="pps-no-injuries-note">
                  <span>✓ No active injuries</span>
                </div>
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
