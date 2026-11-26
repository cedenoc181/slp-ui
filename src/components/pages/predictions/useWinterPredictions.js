import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import cbpcAdminService, { MONEYLINE_LEAGUES } from '../../../data/services/cbpcAdminService';
import { CBPC_LEAGUES } from '../../../data/constants/cbpcConstants';

/*
  Admins only: today's winter-league moneyline predictions (LIDOM, LVBP, LMP,
  LBPRC) from /cbpc/{league}/admin/predictions/moneyline, which answers 403 to
  anyone else. Used by the Game Props board, the Predictions overview and the
  Terminal's Model Board. Each game gets slug, leagueShort and threshold.
*/

// Sort by first pitch; a TBD start (first_pitch null) follows the same
// matchup's other game that day, else sinks to the end.
function winterStartKey(g, all) {
  if (g.first_pitch) return new Date(g.first_pitch).getTime();
  const sibling = all.find(o => o !== g && o.first_pitch && o.slug === g.slug
    && o.home.team_id === g.home.team_id && o.away.team_id === g.away.team_id);
  return sibling ? new Date(sibling.first_pitch).getTime() + 1 : Number.MAX_SAFE_INTEGER;
}

// Today's winter games across the four leagues, open (undecided) ones only,
// like the MLB board. enabled=false (non-admins) fetches nothing: null stays
// "loading" only while enabled.
export default function useWinterPredictions(enabled) {
  const navigate = useNavigate();
  const location = useLocation();
  const [games, setGames] = useState(enabled ? null : []);

  useEffect(() => {
    if (!enabled) { setGames([]); return undefined; }
    let alive = true;
    Promise.allSettled(MONEYLINE_LEAGUES.map(slug => cbpcAdminService.getMoneyline(slug)
      .then(d => (d?.games || []).map(g => ({ ...g, slug, leagueShort: CBPC_LEAGUES[slug].short, threshold: d.confident_threshold })))))
      .then(settled => {
        if (!alive) return;
        if (settled.some(r => r.status === 'rejected' && [401, 403].includes(r.reason?.status))) {
          navigate('/account', { replace: true, state: { from: location } });
          return;
        }
        const all = settled.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
        const open = all.filter(g => !g.result && !/^(final|game over|completed)/i.test(g.status || ''));
        setGames(open.sort((a, b) => (winterStartKey(a, all) - winterStartKey(b, all)) || ((a.game_number ?? 1) - (b.game_number ?? 1))));
      });
    return () => { alive = false; };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return games;
}

