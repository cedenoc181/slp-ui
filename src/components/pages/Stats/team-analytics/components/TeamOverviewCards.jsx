import React from 'react';
import { getStreakString, isWinningStreak } from '../utils';

function isSpringTrainingView(selectedSeason) {
  const currentYear = new Date().getFullYear().toString();
  if (selectedSeason !== currentYear) return false;
  const month = new Date().getMonth() + 1;
  return month <= 3;
}

/**
 * Overview stat cards showing record, run differential, home/away records.
 * For the current season during spring training, shows spring training data with a badge.
 * For prior seasons, always shows regular season data.
 */
function TeamOverviewCards({
  seasonData,
  record,
  runs,
  streak,
  recordSplits,
  selectedSeason,
  teamSeasonData,
}) {
  const isSpring = isSpringTrainingView(selectedSeason);
  const st = isSpring ? teamSeasonData?.spring_training : null;

  // Spring training values
  const displayRecord = isSpring
    ? { wins: st?.wins ?? 0, losses: st?.losses ?? 0, pct: st?.pct ?? 0 }
    : record;

  const displayStreak = isSpring ? st?.streak_code : streak;

  const displayRunDiff = isSpring ? (st?.run_diff ?? 0) : (runs?.run_differential ?? runs?.run_diff ?? 0);
  const displayRS = isSpring ? (st?.runs_scored ?? 0) : (runs?.runs_scored ?? 0);
  const displayRA = isSpring ? (st?.runs_allowed ?? 0) : (runs?.runs_allowed ?? 0);

  const homeWins   = isSpring ? (st?.home_wins ?? 0)   : (seasonData?.home?.wins   ?? recordSplits?.home?.wins   ?? 0);
  const homeLosses = isSpring ? (st?.home_losses ?? 0) : (seasonData?.home?.losses ?? recordSplits?.home?.losses ?? 0);
  const homePct    = isSpring ? (st?.home_pct ?? 0)    : (seasonData?.home?.pct    ?? recordSplits?.home?.pct    ?? 0);

  const awayWins   = isSpring ? (st?.away_wins ?? 0)   : (seasonData?.away?.wins   ?? recordSplits?.away?.wins   ?? 0);
  const awayLosses = isSpring ? (st?.away_losses ?? 0) : (seasonData?.away?.losses ?? recordSplits?.away?.losses ?? 0);
  const awayPct    = isSpring ? (st?.away_pct ?? 0)    : (seasonData?.away?.pct    ?? recordSplits?.away?.pct    ?? 0);

  return (
    <div className="overview-section">
      {/* Record Card */}
      <div className="stat-card highlight">
        <div className="stat-header">
          <span className="stat-label">Record</span>
          {displayStreak && (
            <span className={`trend-badge ${isWinningStreak(displayStreak) ? 'positive' : 'negative'}`}>
              {getStreakString(displayStreak)}
            </span>
          )}
        </div>
        <div className="stat-value">
          {displayRecord?.wins ?? 0}-{displayRecord?.losses ?? 0}
        </div>
        <div className="stat-detail">
          Win % {displayRecord?.pct ? (displayRecord.pct * 100).toFixed(1) : '0.0'}%
        </div>
      </div>

      {/* Run Differential Card */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Run Differential</span>
        </div>
        <div className={`stat-value ${displayRunDiff > 0 ? 'positive' : displayRunDiff < 0 ? 'negative' : ''}`}>
          {displayRunDiff > 0 ? '+' : ''}{displayRunDiff}
        </div>
        <div className="stat-detail">
          {displayRS} RS / {displayRA} RA
        </div>
      </div>

      {/* Home Record Card */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Home Record</span>
        </div>
        <div className="stat-value">
          {homeWins}-{homeLosses}
        </div>
        <div className="stat-detail">
          {(homePct * 100).toFixed(1)}% win rate
        </div>
      </div>

      {/* Away Record Card */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Away Record</span>
        </div>
        <div className="stat-value">
          {awayWins}-{awayLosses}
        </div>
        <div className="stat-detail">
          {(awayPct * 100).toFixed(1)}% win rate
        </div>
      </div>
    </div>
  );
}

export default TeamOverviewCards;
