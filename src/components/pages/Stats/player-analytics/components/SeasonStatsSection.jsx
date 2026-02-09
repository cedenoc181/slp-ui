/**
 * ============================================================================
 * SEASON STATS SECTION COMPONENT
 * ============================================================================
 * 
 * PURPOSE:
 * Displays the player's season or career statistics in card format, along with
 * a bar chart for visualizing performance trends over time.
 * 
 * PARENT COMPONENT:
 * - playerProfileStats.jsx (main Player Profile page)
 * 
 * DATA SOURCES:
 * - activeSeasonStats: Current season stats (from playerStatsService)
 * - activeCareerTotals: Career totals (from playerStatsService)
 * - careerStats: Array of yearly stats for chart visualization
 * 
 * KEY FEATURES:
 * 1. Season/Career Toggle: Switch between viewing single season or career totals
 * 2. Season Dropdown: Select different years to view
 * 3. Stats Cards: Grid of categorized statistics
 * 4. Performance Chart: Bar chart showing metric over time (monthly or yearly)
 * 
 * TWO-WAY PLAYER (TWP) SUPPORT:
 * - showPitchingStats determines which card layout to display
 * - Pitchers: W, L, ERA, IP, K, WHIP, K/9, BB/9, etc.
 * - Batters: G, AB, H, HR, RBI, AVG, OPS, SB, etc.
 * 
 * CHART FUNCTIONALITY:
 * - getChartData: Returns array of {period, value} for bar chart
 * - getMaxValue: Calculates max for scaling bar heights
 * - formatChartValue: Formats display values (decimals vs integers)
 * - chartMetricOptions: Available metrics to chart
 * 
 * PERFORMANCE NOTES:
 * - Wrapped in React.memo to prevent unnecessary re-renders
 * - Chart data calculations should be memoized in parent
 * 
 * ============================================================================
 */

import React from 'react';

/**
 * SeasonStatsSection - Displays season/career statistics with chart
 * 
 * @param {Object} props
 * @param {string} props.selectedSeason - Currently selected season year
 * @param {string} props.activeStatsTab - 'current' for season view, 'career' for career totals
 * @param {Function} props.setActiveStatsTab - Callback to switch between season/career
 * @param {boolean} props.seasonDropdownOpen - Whether season dropdown is expanded
 * @param {Function} props.setSeasonDropdownOpen - Callback to toggle dropdown
 * @param {React.RefObject} props.seasonDropdownRef - Ref for click-outside handling
 * @param {string[]} props.availableSeasons - List of seasons with data
 * @param {Function} props.handleSeasonChange - Callback when season is selected
 * @param {Function} props.handleCareerTabClick - Callback when Career tab is clicked
 * @param {boolean} props.statsLoading - Loading state for stats
 * @param {boolean} props.careerTotalsLoading - Loading state for career totals
 * @param {Object|null} props.activeSeasonStats - Current season statistics
 * @param {Object|null} props.activeCareerTotals - Career totals statistics
 * @param {boolean} props.showPitchingStats - Whether to display pitching (true) or batting (false)
 * @param {Object} props.currentChartMetric - Currently selected chart metric {key, label}
 * @param {Function} props.setSelectedChartMetric - Callback to change chart metric
 * @param {Object} props.chartMetricOptions - Available metrics for chart
 * @param {Function} props.getChartData - Returns chart data array
 * @param {Function} props.getMaxValue - Calculates max value for scaling
 * @param {Function} props.formatChartValue - Formats values for display
 */
const SeasonStatsSection = React.memo(function SeasonStatsSection({
  selectedSeason,
  activeStatsTab,
  setActiveStatsTab,
  seasonDropdownOpen,
  setSeasonDropdownOpen,
  seasonDropdownRef,
  availableSeasons,
  handleSeasonChange,
  handleCareerTabClick,
  statsLoading,
  careerTotalsLoading,
  activeSeasonStats,
  activeCareerTotals,
  showPitchingStats,
  currentChartMetric,
  setSelectedChartMetric,
  chartMetricOptions,
  getChartData,
  getMaxValue,
  formatChartValue,
}) {
  // Determine which stats object to use based on active tab
  const displayStats = activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats;
  const isLoading = statsLoading || (activeStatsTab === 'career' && careerTotalsLoading);

  return (
    <section className="pps-section">
      {/* ========== SECTION HEADER ========== */}
      <div className="pps-section-header">
        <div>
          <h2 className="pps-section-title">Season Statistics</h2>
          <p className="pps-section-subtitle">
            {activeStatsTab === 'career' ? 'Career performance' : `${selectedSeason} season performance`}
          </p>
        </div>
        
        {/* ========== SEASON/CAREER TOGGLE ========== */}
        <div className="pps-tab-toggle" ref={seasonDropdownRef}>
          {/* Season Dropdown Button */}
          <button
            className={`pps-tab-btn pps-dropdown-btn ${activeStatsTab === 'current' ? 'active' : ''}`}
            onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
          >
            {selectedSeason}
            <span className={`pps-dropdown-arrow ${seasonDropdownOpen ? 'open' : ''}`}>▼</span>
          </button>
          
          {/* Season Dropdown Menu - Shows all available seasons except current */}
          {seasonDropdownOpen && (
            <div className="pps-dropdown-menu">
              {availableSeasons.filter(season => season !== selectedSeason).map((season) => (
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
          
          {/* Career Tab Button */}
          <button
            className={`pps-tab-btn ${activeStatsTab === 'career' ? 'active' : ''}`}
            onClick={handleCareerTabClick}
          >
            Career
          </button>
        </div>
      </div>
      
      {/* ========== STATS CARDS GRID ========== */}
      <div className="pps-stats-grid">
        {showPitchingStats ? (
          /* ========== PITCHER STATS CARDS ========== */
          <>
            {/* Primary Pitching Stats Card */}
            <div className="pps-stats-card">
              <h3 className="pps-stats-card-title">Pitching</h3>
              {isLoading ? (
                <div className="pps-stats-loading">Loading stats...</div>
              ) : displayStats ? (
                <div className="pps-stats-table">
                  <div className="pps-stat-row header">
                    <span>W</span>
                    <span>L</span>
                    <span>ERA</span>
                    <span>GS</span>
                    <span>IP</span>
                    <span>SO</span>
                    <span>WHIP</span>
                  </div>
                  <div className="pps-stat-row values">
                    {/* Wins - Highlighted as key stat */}
                    <span className="pps-highlight">{displayStats.wins || displayStats.w || '-'}</span>
                    <span>{displayStats.losses || displayStats.l || '-'}</span>
                    {/* ERA - Highlighted as key stat */}
                    <span className="pps-highlight">{displayStats.era?.toFixed(2) || '-'}</span>
                    <span>{displayStats.games_started || displayStats.gs || '-'}</span>
                    <span>{displayStats.innings_pitched || displayStats.ip || '-'}</span>
                    <span>{displayStats.strikeouts || displayStats.so || '-'}</span>
                    {/* WHIP - Highlighted as key stat */}
                    <span className="pps-highlight">{displayStats.whip?.toFixed(2) || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="pps-stats-no-data">No pitching stats available</div>
              )}
            </div>

            {/* Advanced Pitching Stats Card */}
            <div className="pps-stats-card">
              <h3 className="pps-stats-card-title">Advanced</h3>
              {isLoading ? (
                <div className="pps-stats-loading">Loading stats...</div>
              ) : displayStats ? (
                <div className="pps-stats-table">
                  <div className="pps-stat-row header">
                    <span>K/9</span>
                    <span>BB/9</span>
                    <span>HR/9</span>
                    <span>H/9</span>
                    <span>K/BB</span>
                  </div>
                  <div className="pps-stat-row values">
                    {/* K/9 - Strikeouts per 9 innings, higher is better */}
                    <span className="pps-highlight">{displayStats.k_per_9?.toFixed(2) || '-'}</span>
                    {/* BB/9 - Walks per 9 innings, lower is better */}
                    <span>{displayStats.bb_per_9?.toFixed(2) || '-'}</span>
                    {/* HR/9 - Home runs allowed per 9, lower is better */}
                    <span>{displayStats.hr_per_9?.toFixed(2) || '-'}</span>
                    <span>{displayStats.hits_per_9?.toFixed(2) || '-'}</span>
                    {/* K/BB ratio - Higher is better (more K's than walks) */}
                    <span>{displayStats.strikeout_walk_ratio?.toFixed(2) || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="pps-stats-no-data">No advanced stats available</div>
              )}
            </div>

            {/* Opponent Stats Card - How opposing batters fared */}
            <div className="pps-stats-card">
              <h3 className="pps-stats-card-title">vs Opponents</h3>
              {isLoading ? (
                <div className="pps-stats-loading">Loading stats...</div>
              ) : displayStats ? (
                <div className="pps-stats-table">
                  <div className="pps-stat-row header">
                    <span>OPP AVG</span>
                    <span>OPP OPS</span>
                    <span>H</span>
                    <span>HR</span>
                    <span>BB</span>
                  </div>
                  <div className="pps-stat-row values">
                    {/* Opponent batting average - Lower is better */}
                    <span>{displayStats.opponent_avg?.toFixed(3)?.replace(/^0/, '') || '-'}</span>
                    {/* Opponent OPS - Lower is better */}
                    <span>{displayStats.opponent_ops?.toFixed(3) || '-'}</span>
                    <span>{displayStats.hits_allowed || '-'}</span>
                    <span>{displayStats.home_runs_allowed || '-'}</span>
                    <span>{displayStats.walks || displayStats.bb || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="pps-stats-no-data">No opponent stats available</div>
              )}
            </div>
          </>
        ) : (
          /* ========== BATTER STATS CARDS ========== */
          <>
            {/* Primary Batting Stats Card */}
            <div className="pps-stats-card">
              <h3 className="pps-stats-card-title">Batting</h3>
              {isLoading ? (
                <div className="pps-stats-loading">Loading stats...</div>
              ) : displayStats ? (
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
                    <span>{displayStats.g || displayStats.games_played || '-'}</span>
                    <span>{displayStats.ab || displayStats.at_bats || '-'}</span>
                    <span>{displayStats.h || displayStats.hits || '-'}</span>
                    {/* HR - Highlighted as key power stat */}
                    <span className="pps-highlight">{displayStats.hr || displayStats.home_runs || '-'}</span>
                    <span>{displayStats.rbis || displayStats.rbi || '-'}</span>
                    <span>{displayStats.r || displayStats.runs || '-'}</span>
                    {/* AVG - Format as .XXX (remove leading 0) */}
                    <span>{displayStats.avg?.toFixed(3)?.replace(/^0/, '') || displayStats.batting_avg?.toFixed(3)?.replace(/^0/, '') || '-'}</span>
                    {/* OPS - Highlighted as key composite stat */}
                    <span className="pps-highlight">{displayStats.ops?.toFixed(3) || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="pps-stats-no-data">No batting stats available</div>
              )}
            </div>

            {/* Additional Batting Stats Card */}
            <div className="pps-stats-card">
              <h3 className="pps-stats-card-title">Additional</h3>
              {isLoading ? (
                <div className="pps-stats-loading">Loading stats...</div>
              ) : displayStats ? (
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
                    {/* SB - Stolen bases for speed metric */}
                    <span>{displayStats.sb || displayStats.stolen_bases || '-'}</span>
                    {/* BB - Walks (plate discipline) */}
                    <span>{displayStats.bb || displayStats.walks || displayStats.base_on_balls || '-'}</span>
                    {/* SO - Strikeouts */}
                    <span>{displayStats.so || displayStats.strikeouts || displayStats.strike_outs || '-'}</span>
                    {/* Extra base hits */}
                    <span>{displayStats.doubles || displayStats['2b'] || '-'}</span>
                    <span>{displayStats.triples || displayStats['3b'] || '-'}</span>
                    {/* TB - Total bases (power indicator) */}
                    <span>{displayStats.tb || displayStats.total_bases || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="pps-stats-no-data">No additional stats available</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ========== COMPARISON CHART ========== */}
      {/* Bar chart showing selected metric over time */}
      <div className="pps-comparison-chart">
        <div className="pps-comparison-chart-header">
          <h4>
            {/* Title changes based on view: Career shows yearly, Season shows monthly */}
            {activeStatsTab === 'career' 
              ? `${currentChartMetric.label} by Year`
              : `Monthly ${currentChartMetric.label}`
            }
          </h4>
          
          {/* Metric Selector Dropdown */}
          <select 
            className="pps-metric-select"
            value={currentChartMetric.key}
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
                  // Get chart data from parent's memoized function
                  const chartData = getChartData();
                  
                  if (!chartData || chartData.length === 0) {
                    return (
                      <div className="pps-chart-no-data">
                        No {activeStatsTab === 'career' ? 'career' : 'monthly'} data available
                      </div>
                    );
                  }
                  
                  // Calculate max value for bar height scaling
                  const maxValue = getMaxValue(chartData);
                  
                  return chartData.map(({ period, value }) => (
                    <div key={period} className="pps-comparison-bar-group">
                      <div 
                        className="pps-comparison-bar"
                        style={{ 
                          // CSS variable used for bar height animation
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
  );
});

export default SeasonStatsSection;
