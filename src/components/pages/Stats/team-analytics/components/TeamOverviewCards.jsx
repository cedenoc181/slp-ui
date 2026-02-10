import React from 'react';
import { getStreakString, isWinningStreak } from '../utils';

/**
 * Overview stat cards showing record, run differential, home/away records
 */
function TeamOverviewCards({
  seasonData,
  record,
  runs,
  streak,
  recordSplits,
}) {
  return (
    <div className="overview-section">
      {/* Record Card */}
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

      {/* Run Differential Card */}
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

      {/* Home Record Card */}
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

      {/* Away Record Card */}
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
  );
}

export default TeamOverviewCards;
