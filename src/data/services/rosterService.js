import api from './apiService';
import { DEFAULT_SEASON } from '../constants/apiConstants';

class RosterService {
  /**
   * Get team roster grouped by position type
   * Returns: { team_id, team_name, team_abbreviation, season, total_players, pitchers, catchers, infielders, outfielders }
   * @param {number} teamId - Team database ID
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team roster grouped by position
   */
  async getTeamRoster(teamId, season = DEFAULT_SEASON) {
    return await api.get(`/rosters/team?team_id=${teamId}&season=${season}`);
  }

  /**
   * Get team roster by MLB team ID grouped by position type
   * @param {number} mlbTeamId - MLB team ID (e.g., 121 for Mets)
   * @param {string} season - Season year (e.g., '2025')
   * @returns {Promise<Object>} Team roster grouped by position
   */
  async getTeamRosterByMlbId(mlbTeamId, season = DEFAULT_SEASON) {
    return await api.get(`/rosters/team/mlb?mlb_team_id=${mlbTeamId}&season=${season}`);
  }

  /**
   * Get team roster filtered by position type
   * @param {number} teamId - Team database ID
   * @param {string} season - Season year (e.g., '2025')
   * @param {string} positionType - Position type: 'Pitcher', 'Catcher', 'Infielder', 'Outfielder'
   * @returns {Promise<Array>} Roster entries for the position type
   */
  async getTeamRosterByPosition(teamId, season = DEFAULT_SEASON, positionType) {
    return await api.get(`/rosters/team/position?team_id=${teamId}&season=${season}&position_type=${positionType}`);
  }

  /**
   * Get player roster history
   * @param {number} playerId - Player database ID
   * @param {string} season - Optional season filter
   * @returns {Promise<Object>} Player roster history with seasons array
   */
  async getPlayerRosterHistory(playerId, season = null) {
    let url = `/rosters/player?player_id=${playerId}`;
    if (season) {
      url += `&season=${season}`;
    }
    return await api.get(url);
  }

  /**
   * Get player roster history by MLB player ID
   * @param {number} playerMlbId - MLB player ID
   * @param {string} season - Optional season filter
   * @returns {Promise<Object>} Player roster history with seasons array
   */
  async getPlayerRosterHistoryByMlbId(playerMlbId, season = null) {
    let url = `/rosters/player/mlb?player_mlb_id=${playerMlbId}`;
    if (season) {
      url += `&season=${season}`;
    }
    return await api.get(url);
  }

  /**
   * Helper: Get all players as flat array from grouped roster
   * @param {Object} rosterData - Grouped roster data from API
   * @returns {Array} Flat array of all players
   */
  getAllPlayersFlat(rosterData) {
    if (!rosterData) return [];
    return [
      ...(rosterData.pitchers || []),
      ...(rosterData.catchers || []),
      ...(rosterData.infielders || []),
      ...(rosterData.outfielders || [])
    ];
  }

  /**
   * Helper: Get position players (non-pitchers) as flat array
   * @param {Object} rosterData - Grouped roster data from API
   * @returns {Array} Flat array of position players
   */
  getPositionPlayersFlat(rosterData) {
    if (!rosterData) return [];
    return [
      ...(rosterData.catchers || []),
      ...(rosterData.infielders || []),
      ...(rosterData.outfielders || [])
    ];
  }

  /**
   * Helper: Filter out invalid roster statuses (traded, released, etc.)
   * Valid statuses typically include: 'active', 'IL', '60-day IL', 'minors'
   * Invalid statuses: 'traded', 'released', 'retired', 'DFA'
   * @param {Array} players - Array of player roster entries
   * @returns {Array} Filtered players with valid roster status
   */
  filterActiveRoster(players) {
    if (!players || !Array.isArray(players)) return [];
    
    const EXCLUDED_STATUSES = ['traded', 'released', 'retired', 'dfa', 'designated for assignment'];
    
    return players.filter(player => {
      const status = (player.status || '').toLowerCase().trim();
      // Keep player if status is empty/null (assume active) or not in excluded list
      return !status || !EXCLUDED_STATUSES.some(excluded => status.includes(excluded));
    });
  }

  /**
   * Helper: Get a Set of active player MLB IDs for a team (for quick validation)
   * Filters out traded/released players and returns only valid roster members
   * @param {Object} rosterData - Grouped roster data from API
   * @param {boolean} positionPlayersOnly - If true, only returns position players (excludes pitchers)
   * @returns {Set<number>} Set of player_mlb_id values for active roster members
   */
  getActivePlayerMlbIds(rosterData, positionPlayersOnly = false) {
    if (!rosterData) return new Set();
    
    let allPlayers;
    if (positionPlayersOnly) {
      allPlayers = this.getPositionPlayersFlat(rosterData);
    } else {
      allPlayers = this.getAllPlayersFlat(rosterData);
    }
    
    const activePlayers = this.filterActiveRoster(allPlayers);
    
    return new Set(
      activePlayers
        .filter(p => p.player_mlb_id)
        .map(p => p.player_mlb_id)
    );
  }

  /**
   * Helper: Verify if a player belongs to a team's active roster
   * @param {number} playerMlbId - Player's MLB ID
   * @param {Set<number>} activePlayerIds - Set of active player MLB IDs from roster
   * @returns {boolean} True if player is on active roster
   */
  isPlayerOnActiveRoster(playerMlbId, activePlayerIds) {
    if (!playerMlbId || !activePlayerIds) return false;
    return activePlayerIds.has(playerMlbId);
  }
}

export default new RosterService();