// ============================================================================
// PLAYER STATUS UTILITIES
// ============================================================================
// Helper functions for determining player trade/acquisition status.
// Used for displaying badges and tooltips on player items.
// ============================================================================

import { findTeamNameById } from './teamMatching';

/**
 * Determine player trade/acquisition status and display info
 * @param {object} player - Player object with status fields
 * @returns {object} - Status info with tooltip, statusClass, and badgeText
 */
export const getPlayerStatusInfo = (player) => {
  if (!player) return { tooltip: null, statusClass: '', badgeText: null };
  
  // Check player status
  const playerStatus = player.status?.toLowerCase();
  const isTraded = playerStatus === 'traded';
  const isReleased = playerStatus === 'released';
  const isClaimed = playerStatus === 'claimed';
  
  // For traded players: use traded_to for destination
  // For released/claimed players: use acquired_by or traded_to for the team that signed them
  const tradedToTeamId = player.traded_to || null;
  const acquiredByTeamId = player.acquired_by || null;
  const destinationTeamId = isTraded 
    ? tradedToTeamId 
    : ((isReleased || isClaimed) ? (acquiredByTeamId || tradedToTeamId) : null);
  const destinationTeam = findTeamNameById(destinationTeamId);
  
  // Check if player was acquired (only show green for active players)
  // traded_from = acquired via trade, acquired_from = signed after release
  const tradedFromTeamId = player.traded_from || null;
  const acquiredFromTeamId = player.acquired_from || null;
  const isActivePlayer = !isTraded && !isReleased && !isClaimed;
  const isAcquiredViaTrade = isActivePlayer && tradedFromTeamId !== null;
  const isAcquiredViaSigning = isActivePlayer && !tradedFromTeamId && acquiredFromTeamId !== null;
  const originTeamId = tradedFromTeamId || acquiredFromTeamId;
  const originTeam = findTeamNameById(originTeamId);
  
  // Determine tooltip, styling, and badge
  let tooltip = null;
  let statusClass = '';
  let badgeText = null;
  let badgeClass = '';
  
  if (isTraded) {
    tooltip = `Traded${destinationTeam ? ` to ${destinationTeam}` : ''}`;
    statusClass = ' traded-player';
    badgeText = 'TRADED';
    badgeClass = 'traded-badge';
  } else if (isReleased) {
    tooltip = `Released${destinationTeam ? `, signed by ${destinationTeam}` : ''}`;
    statusClass = ' traded-player';
    badgeText = 'RELEASED';
    badgeClass = 'traded-badge';
  } else if (isClaimed) {
    tooltip = `Claimed${destinationTeam ? ` by ${destinationTeam}` : ''}`;
    statusClass = ' traded-player';
    badgeText = 'CLAIMED';
    badgeClass = 'traded-badge';
  } else if (isAcquiredViaTrade) {
    tooltip = `Acquired${originTeam ? ` from ${originTeam}` : ''}`;
    statusClass = ' acquired-player';
    badgeText = 'ACQUIRED';
    badgeClass = 'acquired-badge';
  } else if (isAcquiredViaSigning) {
    tooltip = `Signed${originTeam ? ` from ${originTeam}` : ''}`;
    statusClass = ' acquired-player';
    badgeText = 'SIGNED';
    badgeClass = 'acquired-badge';
  }
  
  return {
    tooltip,
    statusClass,
    badgeText,
    badgeClass,
    isTraded,
    isReleased,
    isClaimed,
    isAcquiredViaTrade,
    isAcquiredViaSigning,
  };
};
