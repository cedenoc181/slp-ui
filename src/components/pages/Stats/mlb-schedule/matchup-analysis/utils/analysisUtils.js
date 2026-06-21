import { logoUrl } from '../../utils';

// ─── Normalize helpers (API response → component shape) ───────────────────────

export function normalizeBattingStats(apiResponse) {
  const data = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
  if (!data) return null;
  return {
    vs_lhp: data.vs_left_handed_pitching  ?? null,
    vs_rhp: data.vs_right_handed_pitching ?? null,
  };
}

export function normalizeBattingHomeRoad(apiResponse) {
  const data = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
  if (!data) return null;
  return {
    at_home: data.home ?? null,
    on_road: data.away ?? null,
  };
}

export function normalizePitcherHomeRoadSplits(apiResponse, season, seasonTypeCode) {
  const arr = Array.isArray(apiResponse) ? apiResponse : (apiResponse ? [apiResponse] : []);
  if (!arr.length) return null;
  const match = arr.find(
    e => String(e.season) === String(season) && String(e.season_type) === String(seasonTypeCode)
  );
  const data = match || arr[0];
  if (!data) return null;
  return { at_home: data.at_home ?? null, on_road: data.on_road ?? null };
}

export function normalizePitcherVsHandSplits(apiResponse) {
  const data = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
  if (!data) return null;
  return { vs_lhb: data.vs_lhb ?? null, vs_rhb: data.vs_rhb ?? null };
}

// ─── Insight helpers ──────────────────────────────────────────────────────────

const INSIGHT_STATS = ['avg', 'ops', 'hr'];
const INSIGHT_STAT_LABEL = { avg: 'AVG', ops: 'OPS', hr: 'HR' };

export function fmtInsightVal(stat, val) {
  if (val == null || isNaN(parseFloat(val))) return '—';
  const n = parseFloat(val);
  if (stat === 'avg' || stat === 'ops') return n >= 1 ? n.toFixed(3) : n.toFixed(3).replace(/^0/, '');
  return Math.round(n).toString();
}

export function buildInsights(awayLeaders, homeLeaders, awayAbbr, homeAbbr, awayMlbId, homeMlbId, awaySPThrows, homeSPThrows) {
  const groups = new Map();

  function addToGroup(leaders, teamAbbr, teamMlbId, contextKey, contextLabel) {
    for (const stat of INSIGHT_STATS) {
      const leader = leaders?.find(l => l.category === `${stat}_${contextKey}`);
      if (!leader) continue;
      if (parseFloat(leader.value) === 0) continue;
      const groupKey = `${leader.player_name}__${contextKey}__${teamAbbr}`;
      const aboveAvg = parseFloat(leader.value) > parseFloat(leader.league_avg);
      if (!groups.has(groupKey)) {
        const idFromNameSlug = leader.name_slug
          ? parseInt(leader.name_slug.match(/-(\d+)$/)?.[1], 10) || null
          : null;
        const playerMlbId = idFromNameSlug ?? leader.player_mlb_id ?? leader.mlb_id ?? null;
        const playerSlug = playerMlbId
          ? String(playerMlbId)
          : leader.name_slug || leader.player_name.toLowerCase().replace(/\s+/g, '-');
        groups.set(groupKey, {
          type: aboveAvg ? 'strength' : 'neutral',
          logoSrc: teamMlbId ? logoUrl(teamMlbId) : null,
          headline: leader.player_name,
          playerSlug,
          metrics: [],
        });
      }
      const card = groups.get(groupKey);
      if (card.metrics.length < 2) {
        card.metrics.push({
          label: `${INSIGHT_STAT_LABEL[stat]} ${contextLabel}`,
          value: fmtInsightVal(stat, leader.value),
        });
      }
    }
  }

  const homeSPHand = homeSPThrows ? (homeSPThrows.toUpperCase() === 'L' ? 'lhp' : 'rhp') : null;
  const awaySPHand = awaySPThrows ? (awaySPThrows.toUpperCase() === 'L' ? 'lhp' : 'rhp') : null;

  if (awayLeaders?.length && homeSPHand)
    addToGroup(awayLeaders, awayAbbr, awayMlbId, `vs_${homeSPHand}`, `vs ${homeSPHand.toUpperCase()}`);
  if (awayLeaders?.length)
    addToGroup(awayLeaders, awayAbbr, awayMlbId, 'on_road', 'on Road');
  if (homeLeaders?.length && awaySPHand)
    addToGroup(homeLeaders, homeAbbr, homeMlbId, `vs_${awaySPHand}`, `vs ${awaySPHand.toUpperCase()}`);
  if (homeLeaders?.length)
    addToGroup(homeLeaders, homeAbbr, homeMlbId, 'at_home', 'at Home');

  return Array.from(groups.values());
}

// ─── Stat format / comparison helpers ────────────────────────────────────────

export function fmtSplit(val, dec) {
  if (val == null) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (dec === 3) return n.toFixed(3).replace(/^0/, '');
  return dec === 0 ? Math.round(n).toString() : n.toFixed(dec);
}

export function advantage(a, b, lowerBetter = false) {
  if (a == null || b == null) return { aClass: '', bClass: '' };
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb) || na === nb) return { aClass: '', bClass: '' };
  const aWins = lowerBetter ? na < nb : na > nb;
  return aWins
    ? { aClass: 'advantage', bClass: 'disadvantage' }
    : { aClass: 'disadvantage', bClass: 'advantage' };
}
