// ============================================================================
// BATTER STATS PAGE - REFACTORED
// ============================================================================
// Main batter stats component displaying league/team batting statistics.
// Orchestrates sub-components: LeaderCards, HotBatters, Splits, TopBatters.
// 
// Original: ~890 lines → Refactored: ~120 lines
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { DEFAULT_SEASON } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/batter-stats.css';

// Custom hook for data fetching
import { useBatterStats } from './batter-stats/hooks';

// Sub-components
import {
  BatterLeaderCards,
  HotBattersList,
  BatterSplitsSection,
  TopBattersList,
} from './batter-stats/components';

// ============================================================================
// Component
// ============================================================================

function BatterStats({ teamId = 'ALL', teamDbId = null, season = DEFAULT_SEASON, teamName = 'MLB' }) {
  // Local state for hot metric selection
  const [hotMetric, setHotMetric] = useState('home_runs');
  const [isMobile, setIsMobile] = useState(false);

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

  // Mobile detection
  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

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
        <p className="eyebrow">{isTeamSelected ? 'Team Batting' : 'MLB Batting'}</p>
        <h2>{teamName} {isTeamSelected ? 'Batters' : 'Batting Leaders'}</h2>
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
      <HotBattersList
        hotBatsTitle={hotBatsTitle}
        hotMetric={hotMetric}
        setHotMetric={setHotMetric}
        hotBattersLoading={hotBattersLoading}
        filteredHotBatters={filteredHotBatters}
        isTeamSelected={isTeamSelected}
        season={season}
      />

      {/* Splits Layout */}
      <div className="batter-splits-layout">
        {/* Performance Splits Card */}
        <BatterSplitsSection
          isTeamSelected={isTeamSelected}
          teamName={teamName}
          splitsLoading={splitsLoading}
          splitsDisplayData={splitsDisplayData}
          season={season}
        />

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
