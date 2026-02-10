// ============================================================================
// TEAM MATCHING UTILITIES
// ============================================================================
// Helper functions for matching team names from API responses to team metadata.
// Handles various name formats (full name, abbreviation, partial match).
// ============================================================================

import { TEAMS } from '../../../../../../data/constants/apiConstants';

/**
 * Find team by name using multiple matching strategies
 * @param {string} teamName - Team name from API (various formats)
 * @returns {object|null} - Matched team from TEAMS array or null
 */
export const findTeamByName = (teamName) => {
  if (!teamName || typeof teamName !== 'string') return null;
  
  const teamNameLower = teamName.toLowerCase().trim();
  
  return TEAMS.find(t => {
    const nameLower = t.name.toLowerCase();
    const urlNameLower = t.urlName.toLowerCase();
    
    // Exact match
    if (nameLower === teamNameLower) return true;
    
    // URL name match (e.g., "los-angeles-angels")
    if (urlNameLower === teamNameLower.replace(/\s+/g, '-')) return true;
    
    // Abbreviation match (e.g., "LAA", "NYY")
    if (t.id.toLowerCase() === teamNameLower) return true;
    
    // Check if API team name matches the team portion of full name
    const apiWords = teamNameLower.split(' ');
    const fullNameWords = nameLower.split(' ');
    
    // 2-word match (e.g., "Red Sox" matches "Boston Red Sox")
    if (apiWords.length >= 2) {
      const lastTwoApi = apiWords.slice(-2).join(' ');
      const lastTwoFull = fullNameWords.slice(-2).join(' ');
      if (lastTwoApi === lastTwoFull) return true;
    }
    
    // 1-word match (e.g., "Yankees" matches "New York Yankees")
    if (apiWords.length === 1) {
      const lastWordFull = fullNameWords[fullNameWords.length - 1];
      if (apiWords[0] === lastWordFull) return true;
    }
    
    // Partial match - team name ends with API name (e.g., "Angels")
    if (nameLower.endsWith(teamNameLower)) return true;
    
    // Partial match - API name contains city or team name
    if (nameLower.includes(teamNameLower) || teamNameLower.includes(nameLower.split(' ').pop())) return true;
    
    return false;
  });
};

/**
 * Get team logo URL from MLB static CDN
 * @param {number|string} mlbId - Team's MLB ID
 * @returns {string|null} - URL to team logo or null
 */
export const getTeamLogoUrl = (mlbId) => {
  if (!mlbId) return null;
  return `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
};

/**
 * Find team logo URL by team name
 * @param {string} teamName - Team name from API
 * @returns {string|null} - URL to team logo or null
 */
export const getTeamLogoByName = (teamName) => {
  const team = findTeamByName(teamName);
  return team?.mlbId ? getTeamLogoUrl(team.mlbId) : null;
};

/**
 * Get player headshot URL from MLB static CDN
 * @param {number|string} mlbId - Player's MLB ID
 * @returns {string} - URL to player headshot
 */
export const getPlayerHeadshotUrl = (mlbId) => {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_120,q_100/v1/people/${mlbId}/headshot/67/current`;
};

/**
 * Find destination team name from team ID
 * @param {number|string} teamId - Team ID
 * @returns {string|null} - Team name or null
 */
export const findTeamNameById = (teamId) => {
  if (!teamId) return null;
  return TEAMS.find(t => t.teamId === teamId)?.name || null;
};
