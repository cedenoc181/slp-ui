/**
 * labSlate — assembles today's slate into one normalized row per starting
 * pitcher, enriched with odds, the model's projection, and team/opponent form.
 * The Lab screener filters these rows by any attribute in labFilters.js.
 *
 * One row = one starter in a game (2 rows/game). Game-level attributes (odds,
 * total, opponent) attach to both starters so pitcher- and game-level filters
 * compose on the same row.
 *
 * Sources:
 *   /predictions/today          → odds + model prediction
 *   /predictions/pitchers/today → today's per-stat projections (game nodes)
 *   /teams/standings            → win%, last-10, streak, run differential
 *   player-profile + game logs  → per-starter age, handedness, season ERA,
 *                                 days of rest, and last-start box line
 *
 * Backend-pending attributes (oppRisp, oppL5 form, injuries) are present as null
 * so their filters exist but stay inert until the payload carries them
 * (see NeedsWiring → PREDICTIONS LAB).
 */

import predictionsService from './predictionsService';
import teamsService from './teamsService';
import playerStatsService from './playerStatsServices';
import gamesService from './gamesService';
import { getTeamById } from '../constants/apiConstants';

// ── helpers ───────────────────────────────────────────────────────────────────

function impliedProbPct(american) {
  if (american == null || Number.isNaN(american)) return null;
  return american < 0
    ? (-american / (-american + 100)) * 100
    : (100 / (american + 100)) * 100;
}

function isFinalRow(r) {
  const s = (r.status || '').toLowerCase();
  return s === 'final' || s === 'game over' || s === 'completed' || s === 'completed early';
}

// Parse an ET game-time string ("7:05 PM") to minutes-from-midnight for sorting.
function gameTimeMins(t) {
  const m = (t || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 9999;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

// "W3" → +3, "L5" → -5, else 0
function parseStreak(code) {
  if (!code || typeof code !== 'string') return 0;
  const n = parseInt(code.slice(1), 10);
  if (Number.isNaN(n)) return 0;
  return code[0].toUpperCase() === 'W' ? n : code[0].toUpperCase() === 'L' ? -n : 0;
}

// Standings come grouped by division — walk the payload and collect every team row.
function collectStandingsTeams(payload) {
  const out = [];
  const seen = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (node.mlb_team_id != null && (node.w_l_pct != null || node.wins != null)) {
      if (!seen.has(node.mlb_team_id)) { seen.add(node.mlb_team_id); out.push(node); }
    }
    for (const v of Object.values(node)) if (v && typeof v === 'object') visit(v);
  };
  visit(payload);
  return out;
}

function teamForm(stand) {
  if (!stand) return null;
  return {
    winPct:   stand.w_l_pct != null ? Number(stand.w_l_pct) : null,
    wins:     stand.wins ?? null,
    losses:   stand.losses ?? null,
    gamesBack: stand.games_back === '-' ? 0 : (stand.games_back != null ? Number(stand.games_back) : null),
    runDiff:  stand.run_differential != null ? Number(stand.run_differential) : null,
    last10W:  stand.last_ten_wins ?? null,
    last10L:  stand.last_ten_losses ?? null,
    streak:   parseStreak(stand.streak_code),
    divRank:  stand.division_rank != null ? Number(stand.division_rank) : null,
  };
}

// Best (highest-value-for-bettor) moneyline across bookmakers for a side.
function bestMoneyline(books, key, fallback) {
  const vals = books.map(b => b?.[key]).filter(v => v != null);
  if (vals.length) return Math.round(Math.max(...vals));
  return fallback != null ? Math.round(fallback) : null;
}

// The pitcher's most recent start before today, from their game logs.
function lastStartFrom(logsResp, todayStr) {
  const logs = Array.isArray(logsResp) ? logsResp : (logsResp?.games || logsResp?.logs || []);
  const prior = logs.filter(g => typeof g?.date === 'string' && g.date < todayStr);
  if (!prior.length) return null;
  return prior.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).pop();
}

// Days of rest from the last start: standard baseball convention (calendar gap
// to the last start minus 1, e.g. last start 5 days ago = 4 days rest).
function daysRestFrom(lastStart, todayStr) {
  if (!lastStart?.date) return null;
  const gapDays = Math.round((Date.parse(todayStr) - Date.parse(lastStart.date)) / 86400000);
  return Number.isFinite(gapDays) ? Math.max(0, gapDays - 1) : null;
}

// Box-score line from the last start, tolerant of payload field-name variants.
function lastStartStats(lastStart) {
  if (!lastStart) return { pitchCount: null, earnedRuns: null, hitsAllowed: null, strikeouts: null, walks: null };
  const num = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));
  return {
    pitchCount:  num(lastStart.pitches_thrown ?? lastStart.pitch_count ?? lastStart.pitches),
    earnedRuns:  num(lastStart.earned_runs ?? lastStart.earned_runs_allowed),
    hitsAllowed: num(lastStart.hits_allowed ?? lastStart.hits),
    strikeouts:  num(lastStart.strikeouts),
    walks:       num(lastStart.walks ?? lastStart.walks_allowed),
  };
}

// Locate a game's pitcher node from /pitchers/today.
function pitcherNode(pitchersResp, gamePk) {
  const arr = Array.isArray(pitchersResp) ? pitchersResp : (pitchersResp?.games || []);
  return arr.find(g => (g.game_pk ?? g.id) === gamePk) || null;
}

// ── public: build the slate ───────────────────────────────────────────────────

/**
 * @returns {Promise<Array>} one row per starting pitcher with normalized attrs.
 */
export async function buildLabSlate() {
  const season = new Date().getFullYear();
  const [todayRes, pitchersRes, standingsRes] = await Promise.allSettled([
    predictionsService.getToday(),
    predictionsService.getPitchersToday().catch(() => null),
    teamsService.getTeamRegularSeasonStandings(season).catch(() => null),
  ]);

  const games = todayRes.status === 'fulfilled' && Array.isArray(todayRes.value) ? todayRes.value : [];
  const pitchers = pitchersRes.status === 'fulfilled' ? pitchersRes.value : null;
  const standings = standingsRes.status === 'fulfilled' ? standingsRes.value : null;

  // mlb_team_id → standings row
  const standByMlbId = {};
  for (const t of collectStandingsTeams(standings)) standByMlbId[t.mlb_team_id] = t;
  const formForTeam = (teamId) => {
    const mlbId = getTeamById(teamId)?.mlbId;
    return teamForm(mlbId != null ? standByMlbId[mlbId] : null);
  };

  const rows = [];

  for (const g of games) {
    if (g.season_type === 'spring' || g.season_type === 'S' || isFinalRow(g)) continue;

    const gamePk  = g.game_pk ?? g.id;
    const pred    = g.prediction || null;
    const odds    = g.odds || null;
    const books   = Array.isArray(g.bookmakers) ? g.bookmakers : [];
    const node    = pitcherNode(pitchers, gamePk);

    const pHome   = pred?.blended_p_home_win ?? pred?.p_home_win ?? null;
    const totalLine = odds?.over_under_line_game ?? pred?.blended_predicted_total ?? pred?.predicted_total ?? null;
    const predTotal = pred?.blended_predicted_total ?? pred?.predicted_total ?? null;
    const margin    = pred?.blended_predicted_margin ?? pred?.predicted_margin ?? null; // home - away

    const homeForm = formForTeam(g.home_team_id);
    const awayForm = formForTeam(g.away_team_id);
    const homeML   = bestMoneyline(books, 'home_moneyline', odds?.home_moneyline_game);
    const awayML   = bestMoneyline(books, 'away_moneyline', odds?.away_moneyline_game);

    const projFrom = (p) => p ? {
      projK:    p.blended_strikeouts   ?? null,
      projOuts: p.blended_outs         ?? null,
      projER:   p.blended_earned_runs  ?? null,
      projHits: p.blended_hits_allowed ?? null,
    } : { projK: null, projOuts: null, projER: null, projHits: null };

    const mkRow = (side) => {
      const isHome   = side === 'home';
      const teamId   = isHome ? g.home_team_id : g.away_team_id;
      const oppId    = isHome ? g.away_team_id : g.home_team_id;
      const teamName = getTeamById(teamId)?.name || (isHome ? g.home_team_name : g.away_team_name);
      const oppName  = getTeamById(oppId)?.name  || (isHome ? g.away_team_name : g.home_team_name);
      const teamAbbr = getTeamById(teamId)?.id || teamName;
      const oppAbbr  = getTeamById(oppId)?.id  || oppName;
      const teamMlbId = getTeamById(teamId)?.mlbId ?? null;
      const pitcherName = isHome ? g.home_sp_name : g.away_sp_name;
      const ml       = isHome ? homeML : awayML;
      const winProb  = pHome != null ? (isHome ? pHome : 1 - pHome) * 100 : null;
      const implied  = impliedProbPct(ml);
      const proj     = projFrom(node ? (isHome ? node.home_pitcher : node.away_pitcher) : null);
      const pNode    = node ? (isHome ? node.home_pitcher : node.away_pitcher) : null;
      const teamFm   = isHome ? homeForm : awayForm;
      const oppFm    = isHome ? awayForm : homeForm;

      return {
        id: `${gamePk}-${side}`,
        gamePk, side,
        pitcherName: pitcherName || 'TBD',
        pitcherId: pNode?.player_id ?? null,
        gameTime: g.game_time_et || g.game_time || '',
        teamAbbr, teamName, oppAbbr, oppName, teamMlbId,
        matchupLabel: `${teamAbbr} vs ${oppAbbr}`,

        // ── Odds ──
        ml,
        isFavorite: ml != null ? ml < 0 : null,
        favStrength: ml != null && ml < 0 ? Math.abs(ml) : null, // only favorites
        dogStrength: ml != null && ml > 0 ? ml : null,
        totalLine: totalLine != null ? Number(totalLine) : null,

        // ── Model ──
        winProb: winProb != null ? Math.round(winProb) : null,
        modelEdge: winProb != null && implied != null ? Math.round((winProb - implied) * 10) / 10 : null,
        predMargin: margin != null ? Math.round((isHome ? margin : -margin) * 10) / 10 : null,
        predTotal: predTotal != null ? Number(predTotal) : null,

        // ── Pitcher (today's projection) ──
        ...proj,

        // ── Last start (filled during enrichment from game logs) ──
        lastPitchCount: null,
        lastEarnedRuns: null,
        lastHitsAllowed: null,
        lastStrikeouts: null,
        lastWalks: null,

        // ── Team form ──
        teamWinPct: teamFm?.winPct ?? null,
        teamLast10W: teamFm?.last10W ?? null,
        teamStreak: teamFm?.streak ?? null,
        teamRunDiff: teamFm?.runDiff ?? null,
        teamGamesBack: teamFm?.gamesBack ?? null,

        // ── Opponent form ──
        oppWinPct: oppFm?.winPct ?? null,
        oppLast10W: oppFm?.last10W ?? null,
        oppStreak: oppFm?.streak ?? null,
        oppRunDiff: oppFm?.runDiff ?? null,

        // ── Backend-pending (NeedsWiring → PREDICTIONS LAB) ──
        pitcherAge: pNode?.age ?? null,
        daysRest: pNode?.days_rest ?? null,
        pitcherSeasonEra: pNode?.season_era ?? null,
        pitcherHand: pNode?.throws ?? null,
        oppRispAvg: oppFm?.rispAvg ?? null,
        // Opponent last-5 offensive form (rolling)
        oppOpsL5:  oppFm?.opsL5  ?? null,
        oppRunsL5: oppFm?.runsL5 ?? null,
        oppAvgL5:  oppFm?.avgL5  ?? null,
        teamHasKeyInjury: null,
      };
    };

    rows.push(mkRow('away'));
    rows.push(mkRow('home'));
  }

  // Enrich each starter with age + throwing hand (player-profile info), season
  // ERA (current-season pitching stats), and days of rest + last-start line
  // (from their game logs). Requests are GET-cached, so repeat loads are cheap.
  // Activates the Pitcher age / Throwing hand / Season ERA / Days of rest /
  // Last-start filters.
  const ids = [...new Set(rows.map(r => r.pitcherId).filter(Boolean))];
  if (ids.length) {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const enriched = await Promise.allSettled(ids.map(async (id) => {
      const [infoR, statsR, logsR] = await Promise.allSettled([
        playerStatsService.getPlayerInfo(id),
        playerStatsService.getPitcherCurrentStats(id, season, 'R'),
        gamesService.getPitcherGameLogs(id, season, 'R', 12),
      ]);
      const info = infoR.status === 'fulfilled' ? infoR.value : null;
      const stats = statsR.status === 'fulfilled' ? statsR.value : null;
      const logs = logsR.status === 'fulfilled' ? logsR.value : null;
      const lastStart = lastStartFrom(logs, todayStr);
      return {
        id,
        age: info?.current_age ?? null,
        throws: info?.throws ?? null,
        seasonEra: stats?.era != null ? Number(stats.era) : null,
        daysRest: daysRestFrom(lastStart, todayStr),
        lastStart: lastStartStats(lastStart),
      };
    }));
    const byId = {};
    for (const res of enriched) if (res.status === 'fulfilled' && res.value) byId[res.value.id] = res.value;
    for (const r of rows) {
      const e = r.pitcherId != null ? byId[r.pitcherId] : null;
      if (e) {
        r.pitcherAge = e.age ?? r.pitcherAge;
        r.pitcherHand = e.throws ?? r.pitcherHand;
        r.pitcherSeasonEra = e.seasonEra ?? r.pitcherSeasonEra;
        r.daysRest = e.daysRest ?? r.daysRest;
        if (e.lastStart) {
          r.lastPitchCount  = e.lastStart.pitchCount;
          r.lastEarnedRuns  = e.lastStart.earnedRuns;
          r.lastHitsAllowed = e.lastStart.hitsAllowed;
          r.lastStrikeouts  = e.lastStart.strikeouts;
          r.lastWalks       = e.lastStart.walks;
        }
      }
    }
  }

  // Order by first pitch (earliest first); keep each game's two starters adjacent.
  const sideRank = { away: 0, home: 1 };
  rows.sort((a, b) =>
    gameTimeMins(a.gameTime) - gameTimeMins(b.gameTime) ||
    Number(a.gamePk) - Number(b.gamePk) ||
    sideRank[a.side] - sideRank[b.side]
  );

  return rows;
}

export default buildLabSlate;
