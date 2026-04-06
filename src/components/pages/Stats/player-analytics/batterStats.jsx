// ============================================================================
// BATTER STATS PAGE - REFACTORED
// ============================================================================
// Main batter stats component displaying league/team batting statistics.
// Orchestrates sub-components: LeaderCards, HotBatters, Splits, TopBatters.
// 
// Original: ~890 lines → Refactored: ~120 lines
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { DEFAULT_SEASON } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/batter-stats.css';
import { useBatterStats } from './batter-stats/hooks';
import {
  BatterLeaderCards,
  HotBattersList,
  BatterSplitsSection,
  TopBattersList,
} from './batter-stats/components';

function AuthGate({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return children;
  return (
    <div className="auth-gate">
      <div className="auth-gate__blur">{children}</div>
      <div className="auth-gate__overlay">
        <div className="auth-gate__overlay-inner">
          <svg className="auth-gate__lock" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="auth-gate__text">Sign in to view</span>
          <Link className="auth-gate__link" to="/account">Create a free account</Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

function BatterStats({ teamId = 'ALL', teamDbId = null, season = DEFAULT_SEASON, teamName = 'MLB' }) {
  // Local state for hot metric selection
  const [hotMetric, setHotMetric] = useState('home_runs');

  // Fetch all batter data using custom hook
  const {
    topBattersData,
    topBattersLoading,
    topBattersError,
    visibleTopBatters,
    leadersLoading,
    leaderCategories,
    hotBattersLoading,
    getFilteredHotBatters,
    splitsLoading,
    splitsDisplayData,
    isTeamSelected,
  } = useBatterStats({ teamId, teamDbId, season });

  // Get filtered hot batters for current metric
  const filteredHotBatters = useMemo(
    () => getFilteredHotBatters(hotMetric),
    [getFilteredHotBatters, hotMetric]
  );

  // Dynamic titles
  const topListTitle = isTeamSelected ? `${season} ${teamName}` : `${season} MLB`;
  const hotBatsTitle = isTeamSelected ? `${teamName} Hot Bats` : 'MLB Hot Bats';
  const leadersTitle = isTeamSelected ? 'Team Leaders' : 'League Leaders';

  return (
    <section className="batter-stats-section container">
      {/* Header */}
      <div className="batter-header">
        <p className="eyebrow">{isTeamSelected ? 'Team' : 'MLB'}</p>
        <h2> {isTeamSelected ? `${teamName} Batting Leaders` : 'MLB Batting Leaders'}</h2>
      </div>

      {/* Leader Cards Grid */}
      <BatterLeaderCards
        leadersTitle={leadersTitle}
        season={season}
        isTeamSelected={isTeamSelected}
        leadersLoading={leadersLoading}
        leaderCategories={leaderCategories}
      />

      {/* Hot Bats Card */}
      <AuthGate>
        <HotBattersList
          hotBatsTitle={hotBatsTitle}
          hotMetric={hotMetric}
          setHotMetric={setHotMetric}
          hotBattersLoading={hotBattersLoading}
          filteredHotBatters={filteredHotBatters}
          isTeamSelected={isTeamSelected}
          season={season}
        />
      </AuthGate>

      {/* Splits Layout */}
      <div className="batter-splits-layout">
        {/* Performance Splits Card */}
        <AuthGate>
          <BatterSplitsSection
            isTeamSelected={isTeamSelected}
            teamName={teamName}
            splitsLoading={splitsLoading}
            splitsDisplayData={splitsDisplayData}
            season={season}
          />
        </AuthGate>

        {/* Top Batters Card */}
        <TopBattersList
          topListTitle={topListTitle}
          isTeamSelected={isTeamSelected}
          topBattersLoading={topBattersLoading}
          topBattersError={topBattersError}
          topBattersData={topBattersData}
          visibleTopBatters={visibleTopBatters}
          season={season}
        />
      </div>
    </section>
  );
}

export default BatterStats;
