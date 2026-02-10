// ============================================================================
// PITCHER SPLITS SECTION COMPONENT
// ============================================================================
// Displays splits data with horizontal bar charts comparing pitcher
// performance to league average.
// ============================================================================

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getTeamLogoByName } from '../../shared/utils';

function PitcherSplitsSection({
  isTeamSelected,
  teamName,
  splitsLoading,
  splitsDisplayData,
  season,
}) {
  // Format value based on type
  const formatValue = useCallback((val, fmt) => {
    if (fmt === 'era') return val.toFixed(2);
    if (fmt === 'whip') return val.toFixed(2);
    if (fmt === 'decimal') return val.toFixed(2);
    if (fmt === 'avg') return val.toFixed(3).replace(/^0/, '');
    if (fmt === 'integer') return Math.round(val);
    return Math.round(val);
  }, []);

  // Render split item with horizontal bar chart
  const renderSplitItem = useCallback((split) => {
    const { key, label, format, inverse, playerName, playerId, teamName: splitTeamName, value, leagueAvg } = split;

    const displayValue = formatValue(value, format);
    const displayAvg = formatValue(leagueAvg, format);

    // Calculate bar widths (player value as percentage of max scale)
    const maxScale = Math.max(value, leagueAvg) * 1.2; // 20% padding
    let playerPercent = maxScale > 0 ? (value / maxScale) * 100 : 0;
    const avgPercent = maxScale > 0 ? (leagueAvg / maxScale) * 100 : 0;

    // Snap bar to threshold when values are equal or very close
    if (Math.abs(playerPercent - avgPercent) < 0.5 || value === leagueAvg) {
      playerPercent = avgPercent;
    }

    // Determine if player is above or below average
    // For inverse metrics (ERA, WHIP, HR/9), lower is better
    const isAboveAvg = inverse ? value < leagueAvg : value > leagueAvg;

    // Get team logo
    const teamLogoUrl = getTeamLogoByName(splitTeamName);

    return (
      <div key={key} className="split-bar-item">
        <div className="split-bar-header">
          <span className="split-bar-label">{label}</span>
          <div className="split-bar-player">
            {teamLogoUrl && (
              <img
                src={teamLogoUrl}
                alt={splitTeamName}
                className="split-bar-logo"
                title={splitTeamName}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            {playerId ? (
              <Link
                to={`/player/${playerId}?season=${season}`}
                className="player-profile-link split-bar-name"
                onClick={() => window.scrollTo(0, 0)}
              >
                {playerName}
              </Link>
            ) : (
              <span className="split-bar-name">{playerName}</span>
            )}
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
            <span className={`split-bar-value${isAboveAvg ? '' : ' poor-performance'}`}>
              {displayValue}
            </span>
            <span className="split-bar-avg">Avg: {displayAvg}</span>
          </div>
        </div>
      </div>
    );
  }, [formatValue, season]);

  return (
    <div className="pitcher-splits-card">
      <div className="pitcher-splits-header">
        <div>
          <h3 className="pitcher-splits-title">
            {isTeamSelected ? 'Team Leaders by Split' : 'League Leaders by Split'}
          </h3>
          <p className="pitcher-split-subtitle">
            {isTeamSelected
              ? `${teamName} best performers vs league average`
              : 'MLB best performers vs league average'}
          </p>
        </div>
      </div>
      <div className="pitcher-splits-main">
        {splitsLoading ? (
          <div className="pitcher-loading">
            <div className="loading-spinner"></div>
            <span>Loading splits...</span>
          </div>
        ) : splitsDisplayData.length > 0 ? (
          <div className="split-bars-container">
            {splitsDisplayData.map(renderSplitItem)}
          </div>
        ) : (
          <div className="pitcher-empty">No splits data available.</div>
        )}
      </div>
    </div>
  );
}

export default PitcherSplitsSection;
