/**
 * ============================================================================
 * RECENT FORM SECTION COMPONENT
 * ============================================================================
 * 
 * PURPOSE:
 * Displays the player's recent performance trends and rolling averages.
 * This is a "betting edge" section that helps users understand if a player
 * is currently hot, cold, or neutral based on recent game performance.
 * 
 * PARENT COMPONENT:
 * - playerProfileStats.jsx (main Player Profile page)
 * 
 * DATA SOURCES:
 * - recentFormStats: Calculated from game log data (passed from parent)
 * - recentFormGameLog: Raw game log data for the selected season/type
 * 
 * KEY FEATURES:
 * 1. Form Badge: Visual indicator (🔥 HOT, ❄️ COLD, ➖ Neutral, etc.)
 * 2. Streak Cards: Hit streaks (batters) or Quality Start streaks (pitchers)
 * 3. Rolling Averages Table: L7, L15, L30 vs Season comparisons
 * 4. Trend Insights: Quick performance delta calculations
 * 
 * TWO-WAY PLAYER (TWP) SUPPORT:
 * - Uses showPitchingStats to determine which view to render
 * - Pitchers show: ERA, WHIP, K/9, IP, etc.
 * - Batters show: AVG, OPS, HR, RBI, etc.
 * 
 * PERFORMANCE NOTES:
 * - Wrapped in React.memo to prevent unnecessary re-renders
 * - Only re-renders when props change
 * 
 * ============================================================================
 */

import React from 'react';
import { inningsToBox } from '../shared/utils/statsFormatters';

/**
 * RecentFormSection - Displays rolling averages and trend analysis
 * 
 * @param {Object} props
 * @param {string} props.selectedSeason - Currently selected season year (e.g., "2025")
 * @param {string} props.recentFormSeasonType - Season type filter: 'R' (Regular), 'S' (Spring), 'P' (Postseason)
 * @param {Function} props.setRecentFormSeasonType - Callback to update season type filter
 * @param {Object|null} props.recentFormStats - Calculated recent form statistics object
 * @param {boolean} props.recentFormLoading - Loading state for recent form data
 * @param {boolean} props.showPitchingStats - Whether to display pitching stats (true) or batting stats (false)
 */
const RecentFormSection = React.memo(function RecentFormSection({
  selectedSeason,
  recentFormSeasonType,
  setRecentFormSeasonType,
  availableSeasonTypes = ['R'],
  recentFormStats,
  recentFormLoading,
  showPitchingStats,
}) {
  // Season type options with labels
  const SEASON_TYPE_OPTIONS = [
    { value: 'R', label: 'Regular Season' },
    { value: 'S', label: 'Spring Training' },
    { value: 'P', label: 'Postseason' },
  ];
  
  // Filter to only show available season types
  const filteredSeasonTypeOptions = SEASON_TYPE_OPTIONS.filter(
    option => availableSeasonTypes.includes(option.value)
  );
  return (
    <section className="pps-section pps-recent-form-section">
      {/* ========== SECTION HEADER ========== */}
      <div className="pps-section-header">
        <div>
          <h2 className="pps-section-title">Recent Form</h2>
          <p className="pps-section-subtitle">
            {/* Display context: Season + Season Type */}
            {selectedSeason} {recentFormSeasonType === 'R' ? 'Regular Season' : recentFormSeasonType === 'S' ? 'Spring Training' : 'Postseason'} rolling averages & trends
          </p>
        </div>
        
        {/* ========== CONTROLS: Season Type Filter + Form Badge ========== */}
        <div className="pps-recent-form-controls">
          {/* Season Type Dropdown - Only shows season types with available data */}
          {filteredSeasonTypeOptions.length > 1 ? (
            <select 
              className="pps-season-type-filter"
              value={recentFormSeasonType}
              onChange={(e) => setRecentFormSeasonType(e.target.value)}
            >
              {filteredSeasonTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="pps-season-type-label">
              {filteredSeasonTypeOptions[0]?.label || 'Regular Season'}
            </span>
          )}
          
          {/* Form Status Badge - Visual indicator of player's current form */}
          {recentFormStats && (
            <div className={`pps-form-badge ${recentFormStats.formStatus}`}>
              <span className="pps-form-badge-icon">
                {/* Icon based on form status */}
                {recentFormStats.formStatus === 'hot' ? '🔥' : 
                 recentFormStats.formStatus === 'warming' ? '📈' :
                 recentFormStats.formStatus === 'cold' ? '❄️' :
                 recentFormStats.formStatus === 'cooling' ? '📉' : '➖'}
              </span>
              <span className="pps-form-badge-text">
                {/* Text label for form status */}
                {recentFormStats.formStatus === 'hot' ? 'HOT' : 
                 recentFormStats.formStatus === 'warming' ? 'Warming Up' :
                 recentFormStats.formStatus === 'cold' ? 'COLD' :
                 recentFormStats.formStatus === 'cooling' ? 'Cooling Off' : 'Neutral'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* ========== MAIN CONTENT ========== */}
      {recentFormLoading ? (
        // Loading state
        <div className="pps-stats-loading">Loading recent form data...</div>
      ) : recentFormStats ? (
        <div className="pps-recent-form-content">
          {/* ========== STREAK INDICATORS ========== */}
          {/* Different metrics for pitchers vs batters */}
          {recentFormStats.isPitcher ? (
            // PITCHER Streak Cards
            <div className="pps-streak-row">
              <div className="pps-streak-card">
                <span className="pps-streak-value">{recentFormStats.qualityStartStreak}</span>
                <span className="pps-streak-label">QS Streak</span>
              </div>
              <div className="pps-streak-card">
                <span className="pps-streak-value">{recentFormStats.qualityStartsL10}</span>
                <span className="pps-streak-label">Quality Starts (L10)</span>
              </div>
              <div className="pps-streak-card">
                <span className="pps-streak-value">{recentFormStats.gamesPlayed}</span>
                <span className="pps-streak-label">Games Started</span>
              </div>
            </div>
          ) : (
            // BATTER Streak Cards
            <div className="pps-streak-row">
              <div className="pps-streak-card">
                <span className="pps-streak-value">{recentFormStats.hittingStreak}</span>
                <span className="pps-streak-label">Game Hit Streak</span>
              </div>
              <div className="pps-streak-card">
                <span className="pps-streak-value">{recentFormStats.multiHitGamesL15}</span>
                <span className="pps-streak-label">Multi-Hit Games (L15)</span>
              </div>
              <div className="pps-streak-card">
                <span className="pps-streak-value">{recentFormStats.gamesPlayed}</span>
                <span className="pps-streak-label">Games Played</span>
              </div>
            </div>
          )}
          
          {/* ========== ROLLING AVERAGES TABLE ========== */}
          {/* Shows L5/L7, L10/L15, L30 vs Season stats comparison */}
          <div className="pps-rolling-table-wrapper">
            {recentFormStats.isPitcher ? (
              /* ========== PITCHER Rolling Stats Table ========== */
              <table className="pps-rolling-table">
                <thead>
                  <tr>
                    <th>Split</th>
                    <th>GS</th>
                    <th>ERA</th>
                    <th>WHIP</th>
                    <th>IP</th>
                    <th>K</th>
                    <th>BB</th>
                    <th>K/9</th>
                    <th>W</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Last 5 Starts - Most recent sample */}
                  {recentFormStats.l5 && (
                    <tr className="pps-rolling-row l7">
                      <td className="pps-split-label-cell">Last 5</td>
                      <td>{recentFormStats.l5.games}</td>
                      {/* ERA comparison: green if lower than season (better), red if higher */}
                      <td className={recentFormStats.l5.era < (recentFormStats.season?.era || 99) ? 'pps-above' : recentFormStats.l5.era > (recentFormStats.season?.era || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l5.era.toFixed(2)}
                      </td>
                      {/* WHIP comparison: lower is better */}
                      <td className={recentFormStats.l5.whip < (recentFormStats.season?.whip || 99) ? 'pps-above' : recentFormStats.l5.whip > (recentFormStats.season?.whip || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l5.whip.toFixed(2)}
                      </td>
                      <td>{inningsToBox(recentFormStats.l5.inningsPitched)}</td>
                      <td>{recentFormStats.l5.strikeouts}</td>
                      <td>{recentFormStats.l5.walks}</td>
                      <td>{recentFormStats.l5.kPer9.toFixed(2)}</td>
                      <td>{recentFormStats.l5.wins}</td>
                    </tr>
                  )}
                  {/* Last 10 Starts - Slightly larger sample */}
                  {recentFormStats.l10 && (
                    <tr className="pps-rolling-row l15">
                      <td className="pps-split-label-cell">Last 10</td>
                      <td>{recentFormStats.l10.games}</td>
                      <td className={recentFormStats.l10.era < (recentFormStats.season?.era || 99) ? 'pps-above' : recentFormStats.l10.era > (recentFormStats.season?.era || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l10.era.toFixed(2)}
                      </td>
                      <td className={recentFormStats.l10.whip < (recentFormStats.season?.whip || 99) ? 'pps-above' : recentFormStats.l10.whip > (recentFormStats.season?.whip || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l10.whip.toFixed(2)}
                      </td>
                      <td>{inningsToBox(recentFormStats.l10.inningsPitched)}</td>
                      <td>{recentFormStats.l10.strikeouts}</td>
                      <td>{recentFormStats.l10.walks}</td>
                      <td>{recentFormStats.l10.kPer9.toFixed(2)}</td>
                      <td>{recentFormStats.l10.wins}</td>
                    </tr>
                  )}
                  {/* Season Totals - Baseline for comparison */}
                  {recentFormStats.season && (
                    <tr className="pps-rolling-row season">
                      <td className="pps-split-label-cell">
                        {recentFormStats.isSpringView ? 'Spring Season' : recentFormStats.isPostseasonView ? 'Reg Season' : 'Season'}
                      </td>
                      <td>{recentFormStats.season.games}</td>
                      <td>{recentFormStats.season.era.toFixed(2)}</td>
                      <td>{recentFormStats.season.whip.toFixed(2)}</td>
                      <td>{recentFormStats.season.inningsDisplay || recentFormStats.season.inningsPitched.toFixed(1)}</td>
                      <td>{recentFormStats.season.strikeouts}</td>
                      <td>{recentFormStats.season.walks}</td>
                      <td>{recentFormStats.season.kPer9.toFixed(2)}</td>
                      <td>{recentFormStats.season.wins}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* ========== BATTER Rolling Stats Table ========== */
              <table className="pps-rolling-table">
                <thead>
                  <tr>
                    <th>Split</th>
                    <th>G</th>
                    <th>AVG</th>
                    <th>OPS</th>
                    <th>H</th>
                    <th>HR</th>
                    <th>RBI</th>
                    <th>BB</th>
                    <th>SO</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Last 7 Games - Most recent window for batters */}
                  {recentFormStats.l7 && (
                    <tr className="pps-rolling-row l7">
                      <td className="pps-split-label-cell">Last 7</td>
                      <td>{recentFormStats.l7.games}</td>
                      {/* AVG comparison: higher is better (green), lower is worse (red) */}
                      <td className={recentFormStats.l7.avg > (recentFormStats.season?.avg || 0) ? 'pps-above' : recentFormStats.l7.avg < (recentFormStats.season?.avg || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l7.avg.toFixed(3).replace(/^0/, '')}
                      </td>
                      {/* OPS comparison: higher is better */}
                      <td className={recentFormStats.l7.ops > (recentFormStats.season?.ops || 0) ? 'pps-above' : recentFormStats.l7.ops < (recentFormStats.season?.ops || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l7.ops.toFixed(3)}
                      </td>
                      <td>{recentFormStats.l7.hits}</td>
                      <td>{recentFormStats.l7.homeRuns}</td>
                      <td>{recentFormStats.l7.rbis}</td>
                      <td>{recentFormStats.l7.walks}</td>
                      <td>{recentFormStats.l7.strikeouts}</td>
                    </tr>
                  )}
                  {/* Last 15 Games - Medium window */}
                  {recentFormStats.l15 && (
                    <tr className="pps-rolling-row l15">
                      <td className="pps-split-label-cell">Last 15</td>
                      <td>{recentFormStats.l15.games}</td>
                      <td className={recentFormStats.l15.avg > (recentFormStats.season?.avg || 0) ? 'pps-above' : recentFormStats.l15.avg < (recentFormStats.season?.avg || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l15.avg.toFixed(3).replace(/^0/, '')}
                      </td>
                      <td className={recentFormStats.l15.ops > (recentFormStats.season?.ops || 0) ? 'pps-above' : recentFormStats.l15.ops < (recentFormStats.season?.ops || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l15.ops.toFixed(3)}
                      </td>
                      <td>{recentFormStats.l15.hits}</td>
                      <td>{recentFormStats.l15.homeRuns}</td>
                      <td>{recentFormStats.l15.rbis}</td>
                      <td>{recentFormStats.l15.walks}</td>
                      <td>{recentFormStats.l15.strikeouts}</td>
                    </tr>
                  )}
                  {/* Last 30 Games - Only show if enough games played (20+) */}
                  {recentFormStats.l30 && recentFormStats.l30.games >= 20 && (
                    <tr className="pps-rolling-row l30">
                      <td className="pps-split-label-cell">Last 30</td>
                      <td>{recentFormStats.l30.games}</td>
                      <td className={recentFormStats.l30.avg > (recentFormStats.season?.avg || 0) ? 'pps-above' : recentFormStats.l30.avg < (recentFormStats.season?.avg || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l30.avg.toFixed(3).replace(/^0/, '')}
                      </td>
                      <td className={recentFormStats.l30.ops > (recentFormStats.season?.ops || 0) ? 'pps-above' : recentFormStats.l30.ops < (recentFormStats.season?.ops || 0) ? 'pps-below' : ''}>
                        {recentFormStats.l30.ops.toFixed(3)}
                      </td>
                      <td>{recentFormStats.l30.hits}</td>
                      <td>{recentFormStats.l30.homeRuns}</td>
                      <td>{recentFormStats.l30.rbis}</td>
                      <td>{recentFormStats.l30.walks}</td>
                      <td>{recentFormStats.l30.strikeouts}</td>
                    </tr>
                  )}
                  {/* Season Totals - Baseline (Spring Season during spring, Reg Season during postseason) */}
                  {recentFormStats.season && (
                    <tr className="pps-rolling-row season">
                      <td className="pps-split-label-cell">
                        {recentFormStats.isSpringView ? 'Spring Season' : recentFormStats.isPostseasonView ? 'Reg Season' : 'Season'}
                      </td>
                      <td>{recentFormStats.season.games}</td>
                      <td>{recentFormStats.season.avg.toFixed(3).replace(/^0/, '')}</td>
                      <td>{recentFormStats.season.ops.toFixed(3)}</td>
                      <td>{recentFormStats.season.hits}</td>
                      <td>{recentFormStats.season.homeRuns}</td>
                      <td>{recentFormStats.season.rbis}</td>
                      <td>{recentFormStats.season.walks}</td>
                      <td>{recentFormStats.season.strikeouts}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* ========== TREND INSIGHTS ========== */}
          {/* Quick delta calculations comparing recent performance to season */}
          {recentFormStats.isPitcher ? (
            /* Pitcher Trend Insights - L5 vs Season deltas */
            recentFormStats.l5 && recentFormStats.season && (
              <div className="pps-trend-insight">
                <div className="pps-insight-item">
                  <span className="pps-insight-label">
                    L5 vs {recentFormStats.isPostseasonView ? 'Reg Szn' : 'Season'} ERA
                  </span>
                  {/* Negative ERA delta is good (lower ERA), positive is bad */}
                  <span className={`pps-insight-value ${recentFormStats.l5.era <= recentFormStats.season.era ? 'positive' : 'negative'}`}>
                    {recentFormStats.l5.era <= recentFormStats.season.era ? '' : '+'}
                    {(recentFormStats.l5.era - recentFormStats.season.era).toFixed(2)}
                  </span>
                </div>
                <div className="pps-insight-item">
                  <span className="pps-insight-label">
                    L5 vs {recentFormStats.isPostseasonView ? 'Reg Szn' : 'Season'} WHIP
                  </span>
                  <span className={`pps-insight-value ${recentFormStats.l5.whip <= recentFormStats.season.whip ? 'positive' : 'negative'}`}>
                    {recentFormStats.l5.whip <= recentFormStats.season.whip ? '' : '+'}
                    {(recentFormStats.l5.whip - recentFormStats.season.whip).toFixed(2)}
                  </span>
                </div>
                <div className="pps-insight-item">
                  <span className="pps-insight-label">K/Game (L5)</span>
                  <span className="pps-insight-value">
                    {recentFormStats.l5.kPerGame.toFixed(1)}
                  </span>
                </div>
                <div className="pps-insight-item">
                  <span className="pps-insight-label">IP/Game (L5)</span>
                  <span className="pps-insight-value">
                    {recentFormStats.l5.ipPerGame.toFixed(1)}
                  </span>
                </div>
              </div>
            )
          ) : (
            /* Batter Trend Insights - L7 vs Season deltas */
            recentFormStats.l7 && recentFormStats.season && (
              <div className="pps-trend-insight">
                <div className="pps-insight-item">
                  <span className="pps-insight-label">
                    L7 vs {recentFormStats.isPostseasonView ? 'Reg Szn' : 'Season'} AVG
                  </span>
                  {/* Positive AVG delta is good (higher average), negative is bad */}
                  <span className={`pps-insight-value ${recentFormStats.l7.avg >= recentFormStats.season.avg ? 'positive' : 'negative'}`}>
                    {recentFormStats.l7.avg >= recentFormStats.season.avg ? '+' : ''}
                    {/* Convert decimal to "points" (e.g., .020 = 20 pts) */}
                    {((recentFormStats.l7.avg - recentFormStats.season.avg) * 1000).toFixed(0)} pts
                  </span>
                </div>
                <div className="pps-insight-item">
                  <span className="pps-insight-label">
                    L7 vs {recentFormStats.isPostseasonView ? 'Reg Szn' : 'Season'} OPS
                  </span>
                  <span className={`pps-insight-value ${recentFormStats.l7.ops >= recentFormStats.season.ops ? 'positive' : 'negative'}`}>
                    {recentFormStats.l7.ops >= recentFormStats.season.ops ? '+' : ''}
                    {((recentFormStats.l7.ops - recentFormStats.season.ops) * 1000).toFixed(0)} pts
                  </span>
                </div>
                <div className="pps-insight-item">
                  <span className="pps-insight-label">Hits/Game (L7)</span>
                  <span className="pps-insight-value">
                    {recentFormStats.l7.hitsPerGame.toFixed(2)}
                  </span>
                </div>
                <div className="pps-insight-item">
                  <span className="pps-insight-label">K Rate (L7)</span>
                  <span className="pps-insight-value">
                    {recentFormStats.l7.atBats > 0 
                      ? ((recentFormStats.l7.strikeouts / recentFormStats.l7.atBats) * 100).toFixed(1) 
                      : '0'}%
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        /* No Data Placeholder - When no game log data available */
        <div className="pps-no-data-placeholder">
          <div className="pps-no-data-icon">📊</div>
          <h3 className="pps-no-data-title">No Recent Form Data</h3>
          <p className="pps-no-data-text">
            Game log data is needed to calculate recent form trends.
          </p>
        </div>
      )}
    </section>
  );
});

export default RecentFormSection;
