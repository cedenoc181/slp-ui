/**
 * ============================================================================
 * PLAYER PROFILE COMPONENTS - INDEX
 * ============================================================================
 * 
 * This file serves as the central export point for all Player Profile
 * sub-components, hooks, and utilities.
 * 
 * STRUCTURE:
 * components/
 * ├── index.js              <- This file
 * ├── PlayerProfileHeader.jsx
 * ├── RecentFormSection.jsx
 * ├── SeasonStatsSection.jsx
 * ├── SplitsSection.jsx
 * ├── PlayerHistorySection.jsx
 * ├── GameLogSection.jsx
 * ├── hooks/
 * │   ├── index.js
 * │   ├── usePlayerProfile.js
 * │   └── useGameLogs.js
 * └── utils/
 *     ├── index.js
 *     ├── playerProfileUtils.js
 *     ├── chartDataUtils.js
 *     └── recentFormCalculations.js
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
 * HOOKS:
 * - usePlayerProfile: Player info, stats, career data fetching
 * - useGameLogs: Game log and recent form data fetching
 * 
 * UTILITIES:
 * - playerProfileUtils: Slug parsing, formatting, player type checks
 * - chartDataUtils: Chart metric options and data transformations
 * - recentFormCalculations: Rolling stats and form status calculations
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
