// ============================================================================
// usePlayerTeamLogos
// ============================================================================
// The top-10 leaderboard rows carry player_id but no team. Look each player
// up once (/players/lookup returns their CURRENT team_id, so traded players
// show their new club) and map it to an MLB logo URL.
// ============================================================================

import { useEffect, useState } from 'react';
import playerStatsService from '../../../../../../data/services/playerStatsServices';
import { getTeamById } from '../../../../../../data/constants/apiConstants';
import { getTeamLogoUrl } from '../utils';

/**
 * @param {Array<object>} players - rows with `player_id` (or `id`)
 * @returns {Object<string, {url: string, name: string}>} keyed by player id
 */
export default function usePlayerTeamLogos(players) {
  const [logos, setLogos] = useState({});
  const key = (players || []).map(p => p?.player_id ?? p?.id).filter(id => id != null).join(',');

  useEffect(() => {
    if (!key) { setLogos({}); return; }
    const ids = key.split(',');
    let alive = true;
    Promise.allSettled(ids.map(id => playerStatsService.lookupPlayer({ playerId: id })))
      .then(results => {
        if (!alive) return;
        const next = {};
        ids.forEach((id, i) => {
          const r = results[i];
          const team = r.status === 'fulfilled' ? getTeamById(r.value?.team_id) : null;
          const url = team?.mlbId ? getTeamLogoUrl(team.mlbId) : null;
          if (url) next[id] = { url, name: team.name };
        });
        setLogos(next);
      });
    return () => { alive = false; };
  }, [key]);

  return logos;
}
