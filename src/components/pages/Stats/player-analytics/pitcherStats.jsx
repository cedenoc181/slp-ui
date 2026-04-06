// ============================================================================
// PITCHER STATS PAGE - REFACTORED
// ============================================================================
// Main pitcher stats component displaying league/team pitching statistics.
// Orchestrates sub-components: LeaderCards, HotPitchers, Splits, TopPitchers.
// 
// Original: ~890 lines → Refactored: ~120 lines
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { DEFAULT_SEASON } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/pitcher-stats.css';
import { usePitcherStats } from './pitcher-stats/hooks';
import {
  PitcherLeaderCards,
  HotPitchersList,
  PitcherSplitsSection,
  TopPitchersList,
} from './pitcher-stats/components';

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

function PitcherStats({ teamId = 'ALL', teamDbId = null, season = DEFAULT_SEASON, teamName = 'MLB' }) {
  // Local state for hot metric selection
  const [hotMetric, setHotMetric] = useState('strikeouts');

  // Fetch all pitcher data using custom hook
  const {
    topPitchersData,
    topPitchersLoading,
    topPitchersError,
    visibleTopPitchers,
    leadersLoading,
    leaderCategories,
    hotPitchersLoading,
    getFilteredHotPitchers,
    splitsLoading,
    splitsDisplayData,
    isTeamSelected,
  } = usePitcherStats({ teamId, teamDbId, season });

  // Get filtered hot pitchers for current metric
  const filteredHotPitchers = useMemo(
    () => getFilteredHotPitchers(hotMetric),
    [getFilteredHotPitchers, hotMetric]
  );

  // Dynamic titles
  const topListTitle = isTeamSelected ? `${season} ${teamName}` : `${season} MLB`;
  const hotArmsTitle = isTeamSelected ? `${teamName} Hot Arms` : 'MLB Hot Arms';
  const leadersTitle = isTeamSelected ? 'Team Leaders' : 'League Leaders';

  return (
    <section className="pitcher-stats-section container">
      {/* Header */}
      <div className="pitcher-header">
        <p className="eyebrow">{isTeamSelected ? 'Team Pitching' : 'MLB Pitching'}</p>
        <h2>{teamName} {isTeamSelected ? 'Pitchers' : 'Pitching Leaders'}</h2>
      </div>

      {/* Leader Cards Grid */}
      <PitcherLeaderCards
        leadersTitle={leadersTitle}
        season={season}
        isTeamSelected={isTeamSelected}
        leadersLoading={leadersLoading}
        leaderCategories={leaderCategories}
      />

      {/* Hot Arms Card */}
      <AuthGate>
        <HotPitchersList
          hotArmsTitle={hotArmsTitle}
          hotMetric={hotMetric}
          setHotMetric={setHotMetric}
          hotPitchersLoading={hotPitchersLoading}
          filteredHotPitchers={filteredHotPitchers}
          isTeamSelected={isTeamSelected}
          season={season}
        />
      </AuthGate>

      {/* Splits Layout */}
      <div className="pitcher-splits-layout">
        {/* Performance Splits Card */}
        <AuthGate>
          <PitcherSplitsSection
            isTeamSelected={isTeamSelected}
            teamName={teamName}
            splitsLoading={splitsLoading}
            splitsDisplayData={splitsDisplayData}
            season={season}
          />
        </AuthGate>

        {/* Top Pitchers Card */}
        <TopPitchersList
          topListTitle={topListTitle}
          isTeamSelected={isTeamSelected}
          topPitchersLoading={topPitchersLoading}
          topPitchersError={topPitchersError}
          topPitchersData={topPitchersData}
          visibleTopPitchers={visibleTopPitchers}
          season={season}
        />
      </div>
    </section>
  );
}

export default PitcherStats;
