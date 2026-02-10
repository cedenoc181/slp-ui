// ============================================================================
// PITCHER STATS PAGE - REFACTORED
// ============================================================================
// Main pitcher stats component displaying league/team pitching statistics.
// Orchestrates sub-components: LeaderCards, HotPitchers, Splits, TopPitchers.
// 
// Original: ~890 lines → Refactored: ~120 lines
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import '../../../../styles/stats-page-styling/pitcher-stats.css';

// Custom hook for data fetching
import { usePitcherStats } from './pitcher-stats/hooks';

// Sub-components
import {
  PitcherLeaderCards,
  HotPitchersList,
  PitcherSplitsSection,
  TopPitchersList,
} from './pitcher-stats/components';

// ============================================================================
// Component
// ============================================================================

function PitcherStats({ teamId = 'ALL', teamDbId = null, season = '2025', teamName = 'MLB' }) {
  // Local state for hot metric selection
  const [hotMetric, setHotMetric] = useState('strikeouts');
  const [isMobile, setIsMobile] = useState(false);

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

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <HotPitchersList
        hotArmsTitle={hotArmsTitle}
        hotMetric={hotMetric}
        setHotMetric={setHotMetric}
        hotPitchersLoading={hotPitchersLoading}
        filteredHotPitchers={filteredHotPitchers}
        isTeamSelected={isTeamSelected}
        season={season}
      />

      {/* Splits Layout */}
      <div className="pitcher-splits-layout">
        {/* Performance Splits Card */}
        <PitcherSplitsSection
          isTeamSelected={isTeamSelected}
          teamName={teamName}
          splitsLoading={splitsLoading}
          splitsDisplayData={splitsDisplayData}
          season={season}
        />

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
