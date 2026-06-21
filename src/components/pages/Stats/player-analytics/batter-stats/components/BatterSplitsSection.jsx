// ============================================================================
// BATTER SPLITS SECTION COMPONENT
// ============================================================================
// Displays splits data with horizontal bar charts comparing player
// performance to league average.
// ============================================================================

import React, { useCallback } from 'react';
import { getTeamLogoByName } from '../../shared/utils';

function BatterSplitsSection({
  isTeamSelected,
  teamName,
  splitsLoading,
  splitsDisplayData,
}) {
  // Format value based on type
  const formatValue = useCallback((val, fmt) => {
    if (fmt === 'avg') return val.toFixed(3).replace(/^0/, '');
    if (fmt === 'ops') return val.toFixed(3);
    return Math.round(val);
  }, []);

  // Render split item with horizontal bar chart
  const renderSplitItem = useCallback((split) => {
    const { key, label, format, playerName, teamName: splitTeamName, value, leagueAvg } = split;

    // Ensure teamName is a string
    const safeTeamName = typeof splitTeamName === 'string' ? splitTeamName : '';

    const displayValue = formatValue(value, format);
    const displayAvg = formatValue(leagueAvg, format);

    // Calculate bar widths (player value as percentage of max scale)
    const maxScale = Math.max(value, leagueAvg) * 1.2; // 20% padding
    const playerPercent = maxScale > 0 ? (value / maxScale) * 100 : 0;
    const avgPercent = maxScale > 0 ? (leagueAvg / maxScale) * 100 : 0;

    // Determine if player is above or below average
    const isAboveAvg = value > leagueAvg;

    // Get team logo
    const teamLogoUrl = getTeamLogoByName(safeTeamName);

    return (
      <div key={key} className="split-bar-item">
        <div className="split-bar-header">
          <span className="split-bar-label">{label}</span>
          <div className="split-bar-player">
            {teamLogoUrl && (
              <img
                src={teamLogoUrl}
                alt={safeTeamName}
                className="split-bar-logo"
                title={safeTeamName}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className="split-bar-name">{playerName}</span>
          </div>
        </div>
        <div className="split-bar-chart">
          <div className="split-bar-track">
            <div
              className={`split-bar-fill${isAboveAvg ? ' above-avg' : ' below-avg'}`}
              style={{ width: `${playerPercent}%` }}
            />
            <div
              className="split-bar-avg-marker"
              style={{ left: `${avgPercent}%` }}
              title={`League Avg: ${displayAvg}`}
            />
          </div>
          <div className="split-bar-values">
            <span className="split-bar-value">{displayValue}</span>
            <span className="split-bar-avg">MLB-avg: {displayAvg}</span>
          </div>
        </div>
      </div>
    );
  }, [formatValue]);

  return (
    <div className="batter-splits-card">
      <div className="batter-splits-header">
        <div>
          <h3 className="batter-splits-title">
            {isTeamSelected ? 'Team Leaders by Split' : 'League Leaders by Split'}
          </h3>
          <p className="batter-split-subtitle">
            {isTeamSelected
              ? `${teamName} top splits vs league avarage`
              : 'MLB top performers vs league average'}
          </p>
        </div>
      </div>
      <div className="batter-splits-main">
        {splitsLoading ? (
          <div className="batter-loading">
            <div className="loading-spinner"></div>
            <span>Loading splits...</span>
          </div>
        ) : splitsDisplayData.length > 0 ? (
          <div className="split-bars-container">
            {splitsDisplayData.map(renderSplitItem)}
          </div>
        ) : (
          <div className="batter-empty">No splits data available.</div>
        )}
      </div>
    </div>
  );
}

export default BatterSplitsSection;
