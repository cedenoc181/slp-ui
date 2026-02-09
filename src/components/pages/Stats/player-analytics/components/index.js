/**
 * ============================================================================
 * PLAYER PROFILE COMPONENTS - INDEX
 * ============================================================================
 * 
 * This file serves as the central export point for all Player Profile
 * sub-components. Import from this index for cleaner imports.
 * 
 * COMPONENT OVERVIEW:
 * 
 * 1. PlayerProfileHeader
 *    - Player photo, name, team, position, bio info
 *    - Two-way player toggle
 * 
 * 2. RecentFormSection
 *    - Rolling averages and trend analysis
 *    - Form status badge (hot/cold)
 *    - Streak indicators
 * 
 * 3. SeasonStatsSection
 *    - Season/Career statistics cards
 *    - Bar chart for performance visualization
 *    - Season selector dropdown
 * 
 * 4. SplitsSection
 *    - vs L/R handedness splits
 *    - Home/Away performance splits
 * 
 * 5. PlayerHistorySection
 *    - Team history timeline
 *    - Injury history list
 * 
 * 6. GameLogSection
 *    - Paginated game-by-game log
 *    - Season type filter
 * 
 * USAGE:
 * import { 
 *   PlayerProfileHeader,
 *   RecentFormSection,
 *   SeasonStatsSection,
 *   SplitsSection,
 *   PlayerHistorySection,
 *   GameLogSection 
 * } from './components';
 * 
 * ============================================================================
 */

// Header section with player identity and bio
export { default as PlayerProfileHeader } from './PlayerProfileHeader';

// Recent form with rolling averages and trends
export { default as RecentFormSection } from './RecentFormSection';

// Season/Career statistics with chart
export { default as SeasonStatsSection } from './SeasonStatsSection';

// Performance splits (vs L/R, Home/Away)
export { default as SplitsSection } from './SplitsSection';

// Team history and injury history
export { default as PlayerHistorySection } from './PlayerHistorySection';

// Game-by-game performance log
export { default as GameLogSection } from './GameLogSection';
