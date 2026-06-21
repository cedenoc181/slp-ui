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

import React, { useState, useEffect, useRef } from 'react';

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
 * @param {Function} props.handleSeasonAndTypeChange - Callback when season+type combo is selected
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
const DISPLAY_TYPES = [
  { key: 'R', label: 'Regular' },
  { key: 'S', label: 'Spring' },
];

const SeasonStatsSection = React.memo(function SeasonStatsSection({
  selectedSeason,
  selectedSeasonType = 'R',
  handleSeasonAndTypeChange,
  activeStatsTab,
  setActiveStatsTab,
  seasonDropdownOpen,
  setSeasonDropdownOpen,
  seasonDropdownRef,
  availableSeasons,
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
  // Safety: ensure displayStats is an object, not an array
  const rawStats = activeStatsTab === 'career' ? activeCareerTotals : activeSeasonStats;
  const displayStats = Array.isArray(rawStats) ? rawStats[0] : rawStats;
  const isLoading = statsLoading || (activeStatsTab === 'career' && careerTotalsLoading);
  
  // Staged rendering to prevent browser crash on career data load
  // Stage 1: Show loading, Stage 2: Show stats cards, Stage 3: Show chart
  const [renderStage, setRenderStage] = useState(0);
  const [visibleBars, setVisibleBars] = useState(0);
  const renderStageRef = useRef(0);
  
  // Reset render stages when switching tabs or loading state changes
  useEffect(() => {
    // Reset to stage 0
    setRenderStage(0);
    setVisibleBars(0);
    renderStageRef.current = 0;
    
    // If still loading, don't proceed
    if (isLoading) return;
    
    // Stage 1: Show stats cards after short delay
    const stage1Timer = setTimeout(() => {
      if (renderStageRef.current === 0) {
        renderStageRef.current = 1;
        setRenderStage(1);
      }
    }, 200);
    
    // Stage 2: Show chart container after short delay
    const stage2Timer = setTimeout(() => {
      if (renderStageRef.current === 1) {
        renderStageRef.current = 2;
        setRenderStage(2);
      }
    }, 500);
    
    return () => {
      clearTimeout(stage1Timer);
      clearTimeout(stage2Timer);
    };
  }, [activeStatsTab, isLoading]);
  
  // Progressive bar rendering - only after stage 2
  useEffect(() => {
    if (renderStage < 2) return;
    
    const chartData = getChartData();
    const totalBars = chartData?.length || 0;
    
    if (visibleBars >= totalBars) return;
    
    // Render bars progressively
    const delay = 30;
    const barsToAdd = 3;
    
    const barTimer = setTimeout(() => {
      setVisibleBars(prev => Math.min(prev + barsToAdd, totalBars));
    }, delay);
    
    return () => clearTimeout(barTimer);
  }, [renderStage, visibleBars, getChartData, activeStatsTab]);

  const currentTypeLabel = selectedSeasonType === 'S' ? 'Spring' : 'Regular';
  const currentLabel = `${selectedSeason} ${currentTypeLabel}`;

  // Build all combined options (year × type), excluding the currently selected one
  const allOptions = availableSeasons.flatMap(year =>
    DISPLAY_TYPES.map(({ key, label }) => ({ year, key, label: `${year} ${label}` }))
  );
  const dropdownOptions = allOptions.filter(o => !(o.year === selectedSeason && o.key === selectedSeasonType));

  return (
    <section className="pps-section">
      {/* ========== SECTION HEADER ========== */}
      <div className="pps-section-header">
        <div>
          <h2 className="pps-section-title">Season Statistics</h2>
          <p className="pps-section-subtitle">
            {activeStatsTab === 'career' ? 'Career performance' : `${currentLabel} performance`}
          </p>
        </div>

        {/* ========== SEASON/CAREER TOGGLE ========== */}
        <div className="pps-tab-toggle" ref={seasonDropdownRef}>
          {/* Season Dropdown Button */}
          <button
            className={`pps-tab-btn pps-dropdown-btn ${activeStatsTab === 'current' ? 'active' : ''}`}
            onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
          >
            {currentLabel}
            <span className={`pps-dropdown-arrow ${seasonDropdownOpen ? 'open' : ''}`}>▼</span>
          </button>

          {/* Combined Season + Type Dropdown Menu */}
          {seasonDropdownOpen && (
            <div className="pps-dropdown-menu">
              {dropdownOptions.map(({ year, key, label }) => (
                <button
                  key={`${year}-${key}`}
                  className="pps-dropdown-item"
                  onClick={() => {
                    setSeasonDropdownOpen(false);
                    handleSeasonAndTypeChange(year, key);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Career Tab Button - disabled while loading */}
          <button
            className={`pps-tab-btn ${activeStatsTab === 'career' ? 'active' : ''} ${careerTotalsLoading ? 'loading' : ''}`}
            onClick={handleCareerTabClick}
            disabled={careerTotalsLoading || isLoading}
          >
            {careerTotalsLoading ? 'Loading...' : 'Career'}
          </button>
        </div>
      </div>
      
      {/* ========== STATS CARDS GRID ========== */}
      {/* Only render stats after stage 1 to prevent overwhelming the browser */}
      {renderStage < 1 && !isLoading ? (
        <div className="pps-stats-grid">
          <div className="pps-stats-card">
            <div className="pps-stats-loading">Preparing statistics...</div>
          </div>
        </div>
      ) : (
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
                    <span>OBP</span>
                    <span>SLG</span>
                    <span>BABIP</span>
                    <span>2B</span>
                    <span>3B</span>
                    <span>BB</span>
                    <span>SO</span>
                    <span>SB</span>
                  </div>
                  <div className="pps-stat-row values">
                    <span className="pps-highlight">{displayStats.obp?.toFixed(3)?.replace(/^0/, '') || '-'}</span>
                    <span className="pps-highlight">{displayStats.slg?.toFixed(3)?.replace(/^0/, '') || '-'}</span>
                    <span>{displayStats.babip?.toFixed(3)?.replace(/^0/, '') || '-'}</span>
                    <span>{displayStats.doubles ?? '-'}</span>
                    <span>{displayStats.triples ?? '-'}</span>
                    <span>{displayStats.walks ?? '-'}</span>
                    <span>{displayStats.strikeouts ?? '-'}</span>
                    <span>{displayStats.stolen_bases ?? '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="pps-stats-no-data">No additional stats available</div>
              )}
            </div>
          </>
        )}
      </div>
      )}

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
          {isLoading ? (
            <div className="pps-chart-loading">Loading chart data...</div>
          ) : renderStage < 2 ? (
            <div className="pps-chart-loading">
              {activeStatsTab === 'career' ? 'Preparing career chart...' : 'Preparing chart...'}
            </div>
          ) : (
            <div className="pps-chart-placeholder">
              <div className="pps-comparison-bars">
                {(() => {
                  // Get chart data from parent's memoized function
                  const chartData = getChartData();
                  
                  // Safety check for valid chart data
                  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
                    return (
                      <div className="pps-chart-no-data">
                        No {activeStatsTab === 'career' ? 'career' : 'monthly'} data available
                      </div>
                    );
                  }
                  
                  // Show all available data
                  const displayData = chartData;
                  
                  // Only show bars that have been progressively loaded
                  const barsToShow = displayData.slice(0, visibleBars);
                  
                  // If no bars to show yet, show placeholder
                  if (barsToShow.length === 0) {
                    return (
                      <div className="pps-chart-loading">Rendering bars...</div>
                    );
                  }
                  
                  // Calculate max value for bar height scaling (with floor of 1 to prevent division by zero)
                  const maxValue = Math.max(getMaxValue(barsToShow), 1);
                  
                  return barsToShow.map(({ period, value }) => (
                    <div key={period} className="pps-comparison-bar-group">
                      <div 
                        className="pps-comparison-bar"
                        style={{ 
                          // CSS variable used for bar height animation
                          '--bar-height': `${Math.min(((value || 0) / maxValue) * 100, 100)}%`
                        }}
                      >
                        <span className="pps-bar-value">{formatChartValue(value || 0)}</span>
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
