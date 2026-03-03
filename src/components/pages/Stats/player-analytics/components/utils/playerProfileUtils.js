// ============================================================================
// PLAYER PROFILE UTILITIES
// ============================================================================
// Helper functions for the player profile page.
// Extracted from playerProfileStats.jsx for better organization.
// ============================================================================

import { SEASONS } from '../../../../../../data/constants/apiConstants';

// Minimum loading duration to prevent flash (in ms)
export const MIN_LOADING_DURATION = 400;

// ============================================================================
// SLUG & ID UTILITIES
// ============================================================================

/**
 * Extract MLB ID from name slug (e.g., "aaron-judge-592450" -> 592450)
 * Also handles raw numeric IDs for backwards compatibility
 * @param {string} slug - The URL slug containing player name and MLB ID
 * @returns {number|null} - The extracted MLB ID or null if invalid
 */
export const extractMlbIdFromSlug = (slug) => {
  if (!slug) return null;
  
  // If the slug is just a number, treat it as the MLB ID directly
  if (/^\d+$/.test(slug)) {
    return parseInt(slug, 10);
  }
  
  // MLB ID is the last segment after the final hyphen (always numeric)
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Check if the slug is a name-only slug (no numeric ID)
 * @param {string} slug - The URL slug
 * @returns {boolean} - True if this is a name-only slug
 */
export const isNameOnlySlug = (slug) => {
  if (!slug) return false;
  // Not a number-only slug and doesn't end with a numeric ID
  return !/^\d+$/.test(slug) && !/-\d+$/.test(slug);
};

/**
 * Convert a name slug to a searchable name
 * e.g., "chris-tillman" -> "Chris Tillman"
 * @param {string} slug - The URL slug
 * @returns {string} - The player name in title case
 */
export const slugToPlayerName = (slug) => {
  if (!slug) return '';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Helper to ensure minimum loading time for smoother UX
 * Prevents jarring flash when data loads too quickly
 * @param {Promise} promise - The promise to wait for
 * @param {number} startTime - The timestamp when loading started
 * @returns {Promise} - Resolves after minimum time has elapsed
 */
export const withMinLoadingTime = async (promise, startTime) => {
  const result = await promise;
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_LOADING_DURATION) {
    await new Promise(resolve => setTimeout(resolve, MIN_LOADING_DURATION - elapsed));
  }
  return result;
};

/**
 * Format a date string to readable format
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Calculate player age from birth date
 * @param {string} birthDate - ISO date string of birth date
 * @returns {number|null} - Age in years or null if no birth date
 */
export const calculatePlayerAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// ============================================================================
// URL/IMAGE UTILITIES
// ============================================================================

/**
 * Get team logo URL from MLB static CDN
 * @param {number} teamId - MLB team ID
 * @returns {string} - URL to team logo SVG
 */
export const getTeamLogoUrl = (teamId) => {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
};

/**
 * Get player headshot URL from MLB static CDN
 * @param {number} mlbId - Player's MLB ID
 * @returns {string} - URL to player headshot image
 */
export const getPlayerHeadshotUrl = (mlbId) => {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_100/v1/people/${mlbId}/headshot/67/current`;
};

// ============================================================================
// PLAYER TYPE UTILITIES
// ============================================================================

/**
 * Check if player is a pitcher based on position
 * @param {object} playerInfo - Player info object
 * @returns {boolean} - True if player is a pitcher
 */
export const checkIsPitcher = (playerInfo) => {
  if (!playerInfo) return false;
  const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
  return pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'Pitcher' || pos === 'Starting Pitcher' || pos === 'Relief Pitcher';
};

/**
 * Check if player is a two-way player
 * @param {object} playerInfo - Player info object
 * @returns {boolean} - True if player is a two-way player
 */
export const checkIsTwoWay = (playerInfo) => {
  if (!playerInfo) return false;
  const pos = playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position;
  return pos === 'TWP' || pos === 'Two-Way Player' || playerInfo.is_two_way;
};

/**
 * Get player position abbreviation
 * @param {object} playerInfo - Player info object
 * @returns {string} - Position abbreviation
 */
export const getPlayerPosition = (playerInfo) => {
  if (!playerInfo) return '';
  return playerInfo.position_abbreviation || playerInfo.position || playerInfo.primary_position || '';
};

// ============================================================================
// SEASON UTILITIES
// ============================================================================

/**
 * Determine the current MLB season type based on the calendar date.
 * Spring Training: Feb 15 – Mar 31
 * Regular Season: Apr 1 – Sep 30 (and any other date)
 * @returns {'S'|'R'} - Season type code
 */
export const getCurrentSeasonType = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const day = now.getDate();
  if ((month === 2 && day >= 15) || month === 3) return 'S';
  return 'R';
};

/**
 * Get the default season based on current date
 * MLB season starts April 1st - before that, default to previous year
 * @returns {string} - Default season year as string
 */
export const getDefaultSeason = () => {
  const currentYear = String(new Date().getFullYear());
  return SEASONS.includes(currentYear) ? currentYear : SEASONS[0];
};

/**
 * Get initial season from URL params or calculate default
 * @param {URLSearchParams} searchParams - URL search params
 * @returns {string} - Initial season to display
 */
export const getInitialSeason = (searchParams) => {
  const seasonParam = searchParams.get('season');
  if (seasonParam && SEASONS.includes(seasonParam)) {
    return seasonParam;
  }
  return getDefaultSeason();
};

/**
 * Get initial view mode from URL params (for TWP players)
 * @param {URLSearchParams} searchParams - URL search params
 * @returns {string} - 'batting' or 'pitching'
 */
export const getInitialViewMode = (searchParams) => {
  const viewParam = searchParams.get('view');
  return viewParam === 'pitching' ? 'pitching' : 'batting';
};

/**
 * Extract available seasons from career stats
 * @param {Array} careerStats - Array of career stat objects
 * @returns {Array<string>} - Array of season years (descending)
 */
export const getAvailableSeasons = (careerStats) => {
  const currentYear = String(new Date().getFullYear());

  if (!careerStats || careerStats.length === 0) {
    return [currentYear];
  }

  // Extract unique seasons from career stats, filter for regular season only
  const seasons = careerStats
    .filter(s => s.season_type === 2 || s.season_type === '2' || s.season_type === 'R')
    .map(s => String(s.season || s.year))
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .sort((a, b) => parseInt(b) - parseInt(a)); // descending (most recent first)

  // Always include the current year at the top so 2026 shows even before stats exist
  if (!seasons.includes(currentYear)) {
    seasons.unshift(currentYear);
  }

  return seasons;
};
