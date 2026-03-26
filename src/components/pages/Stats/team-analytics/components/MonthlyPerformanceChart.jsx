import React from 'react';
import {
  shouldShowDivider,
  getDividerLabel,
  getFirstPhaseLabel,
  filterMonthlyData,
  getMonthData,
  getWinPctColor,
} from '../utils';

const SEASON_TYPE_LABELS = { S: 'Spring Training', R: 'Regular Season', P: 'Postseason' };
function getSeasonTypeLabel(selectedSeason) {
  const currentYear = new Date().getFullYear().toString();
  if (selectedSeason !== currentYear) return 'Regular Season';
  const month = new Date().getMonth() + 1;
  const key = month <= 2 ? 'S' : month <= 9 ? 'R' : 'P';
  return SEASON_TYPE_LABELS[key];
}

/**
 * Monthly performance bar chart with season phase dividers
 */
function MonthlyPerformanceChart({
  teamMonthlyData,
  timeframe,
  chartFilter,
  chartSectionRef,
  selectedSeason,
}) {
  const getSubtitle = () => {
    if (timeframe === 'first-half') return 'First half performance (Feb - Jun)';
    if (timeframe === 'second-half') return 'Second half performance (Jul - Nov)';
    return `${getSeasonTypeLabel(selectedSeason)} Performance`;
  };

  const filteredMonths = filterMonthlyData(teamMonthlyData, timeframe, chartFilter);

  return (
    <div className="chart-section" ref={chartSectionRef}>
      <div className="section-card">
        <div className="card-header">
          <div>
            <h3>Monthly Performance Trends</h3>
            <p className="card-subtitle">{getSubtitle()}</p>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot wins"></span> Wins</span>
            <span className="legend-item"><span className="legend-dot losses"></span> Losses</span>
          </div>
        </div>

        <div className="chart-container">
          <div className="bar-chart">
            {filteredMonths.length > 0 ? (
              filteredMonths.map((month, idx) => {
                const { wins, losses, winPct } = getMonthData(month, chartFilter);
                const totalGames = wins + losses;
                const displayPct = winPct !== null 
                  ? (winPct * 100).toFixed(1) 
                  : (totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0');
                const monthAbbr = month.month?.substring(0, 3) || `M${idx + 1}`;
                const maxGames = 20;
                const winsHeight = Math.min((wins / maxGames) * 100, 100);
                const lossesHeight = Math.min((losses / maxGames) * 100, 100);

                // Check if divider should appear after this month
                const nextMonth = filteredMonths[idx + 1];
                const showDivider = shouldShowDivider(month.month, nextMonth?.month);
                const dividerLabel = showDivider ? getDividerLabel(nextMonth?.month) : '';

                // Check if this is the first month and needs a phase label
                const isFirstMonth = idx === 0;
                const firstPhaseLabel = isFirstMonth ? getFirstPhaseLabel(month.month) : '';

                return (
                  <React.Fragment key={month.month || idx}>
                    {/* First month phase label */}
                    {isFirstMonth && firstPhaseLabel && (
                      <div className="season-phase-divider first">
                        <div className="divider-line"></div>
                        <span className="phase-text">{firstPhaseLabel}</span>
                        <div className="divider-line"></div>
                      </div>
                    )}

                    <div className="bar-group">
                      <div className="bar-wrapper">
                        <div 
                          className="bar wins" 
                          style={{ height: `${winsHeight}%` }}
                          title={`${wins} wins`}
                        >
                          {wins > 0 && <span className="bar-label">{wins}</span>}
                        </div>
                        <div 
                          className="bar losses" 
                          style={{ height: `${lossesHeight}%` }}
                          title={`${losses} losses`}
                        >
                          {losses > 0 && <span className="bar-label">{losses}</span>}
                        </div>
                      </div>
                      <div className="bar-month">{monthAbbr}</div>
                      <div className="bar-record">{wins}-{losses}</div>
                      <div 
                        className="bar-win-pct" 
                        style={{ color: getWinPctColor(parseFloat(displayPct)) }}
                      >
                        {totalGames > 0 ? `${displayPct}%` : '-'}
                      </div>
                    </div>

                    {/* Season phase divider */}
                    {showDivider && (
                      <div className="season-phase-divider">
                        <div className="divider-line"></div>
                        <span className="phase-text">{dividerLabel}</span>
                        <div className="divider-line"></div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <div className="no-data-message">No monthly data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MonthlyPerformanceChart;
