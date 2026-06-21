/**
 * matchupBets — builds the list of trackable bets for a single matchup so the
 * Bet Library "Selection" field can offer a typeahead. Each candidate carries
 * the real odds / model probability / EV computed exactly the way the prop
 * pages render them, so the modal auto-fills those fields when a bet is chosen.
 *
 * Sources (same payloads the prop pages consume):
 *   - team markets  → game row from /predictions/today (prediction + odds + bookmakers)
 *   - pitcher props → /predictions/pitchers/today  → game node { game_pk, home_pitcher, away_pitcher }
 *                     (matched to the game's starters; mirrors PitcherProps.buildPitcherProps)
 *   - batter props  → /predictions/batters/{game_pk}  → { home_batters, away_batters }
 *                     (mirrors BatterProps.buildBatterMarkets)
 *
 * Parsing is wrapped defensively so a shape mismatch degrades to team markets +
 * plain starter-name labels instead of throwing.
 *
 * Candidate shape:
 * { key, selection, market, odds|null, modelProb|null, ev|null, search }
 */

import { getTeamById } from '../constants/apiConstants';

// ── shared math ───────────────────────────────────────────────────────────────

function calcEV(probPct, odds) {
  if (odds == null || probPct == null) return null;
  const decimal = odds < 0 ? 1 + 100 / Math.abs(odds) : 1 + odds / 100;
  return Math.round((probPct / 100 * decimal - 1) * 1000) / 10; // one decimal
}

function bestVal(rows, key) {
  const vals = rows.map(r => r?.[key]).filter(v => v != null);
  return vals.length ? Math.max(...vals) : null;
}

function teamName(teamId, fallback) {
  return getTeamById(teamId)?.name || fallback || '';
}

function fmtLine(n) {
  return n > 0 ? `+${n}` : String(n);
}

// scout_ai sometimes arrives as { raw: "<json string>" } — parse / repair it.
function repairTruncatedJson(str) {
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of str) {
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if ((ch === '}' || ch === ']') && stack.length) stack.pop();
  }
  return JSON.parse(str + (inStr ? '"' : '') + stack.reverse().join(''));
}

function normalizeScoutAi(node) {
  const raw = node?.scout_ai?.raw;
  if (!raw || typeof raw !== 'string') return node;
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { try { parsed = repairTruncatedJson(raw); } catch { /* ignore */ } }
  return parsed ? { ...node, scout_ai: parsed } : node;
}

// ── team markets (ML / Run Line / Total) ──────────────────────────────────────

function buildTeamCandidates(game) {
  if (!game) return [];
  const pred = game.prediction;
  const odds = game.odds;
  const books = Array.isArray(game.bookmakers) ? game.bookmakers : [];

  const awayName = teamName(game.away_team_id, game.away_team_name);
  const homeName = teamName(game.home_team_id, game.home_team_name);
  const awayAbbr = getTeamById(game.away_team_id)?.id || '';
  const homeAbbr = getTeamById(game.home_team_id)?.id || '';
  const matchup  = `${awayAbbr || awayName} @ ${homeAbbr || homeName}`;
  const tag = (extra = '') => `${matchup} ${awayName} ${homeName} ${extra}`.toLowerCase();

  // Scout AI sections, mapped per market:
  //   Moneyline → 💲 Odds Edge · Run Line → 🤖 ML Alignment · Total → 📈 Total Lean
  const g = normalizeScoutAi(game);
  const a = g.scout_ai && typeof g.scout_ai === 'object' ? g.scout_ai : null;
  const picks = Array.isArray(a?.picks) ? a.picks : [];

  // Resolve which side Scout AI recommends so its confidence only applies there.
  const matchTeam = (pickStr, teamFull) => {
    if (!pickStr || !teamFull) return false;
    const p = String(pickStr).toLowerCase(), t = teamFull.toLowerCase();
    if (p.includes(t) || t.includes(p)) return true;
    const nick = t.split(/\s+/).pop();
    return !!nick && p.includes(nick);
  };
  const teamSideOf = (pickStr) => {
    const aw = matchTeam(pickStr, game.away_team_name);
    const hm = matchTeam(pickStr, game.home_team_name);
    if (aw && !hm) return 'away';
    if (hm && !aw) return 'home';
    return null;
  };
  // confidence only for the recommended side; opposite side is muted (0); null = no scout opinion
  const sideConf = (pick, recSide, side) => {
    if (!pick || !recSide) return null;
    return recSide === side ? (pick.confidence ?? null) : 0;
  };

  const mlPick   = picks.find(p => p.type === 'Moneyline');
  const mlSide   = mlPick ? teamSideOf(mlPick.pick) : null;
  const mlReason = a?.oddsEdge ?? '';

  const rlPick   = picks.find(p => p.type === 'Run Line');
  const rlSide   = rlPick ? teamSideOf(rlPick.pick) : null;
  const rlReason = a?.mlAlignment ?? '';

  const totalPick = picks.find(p => p.type === 'Total');
  const leanStr   = String(totalPick?.pick || a?.totalLean?.lean || '').toLowerCase();
  const totalSide = leanStr.includes('over') ? 'over' : leanStr.includes('under') ? 'under' : null;
  const totalScoutPick = totalPick ?? (a?.totalLean ? { confidence: null } : null);
  const totalReason = a?.totalLean ? `${a.totalLean.lean ? `${a.totalLean.lean} — ` : ''}${a.totalLean.reason ?? ''}`.trim() : '';

  const out = [];

  // Moneyline
  const pHome    = pred?.blended_p_home_win ?? pred?.p_home_win ?? null;
  const homeProb = pHome != null ? Math.round(pHome * 100) : null;
  const awayProb = pHome != null ? Math.round((1 - pHome) * 100) : null;
  const homeML   = bestVal(books, 'home_moneyline') ?? (odds?.home_moneyline_game != null ? Math.round(odds.home_moneyline_game) : null);
  const awayML   = bestVal(books, 'away_moneyline') ?? (odds?.away_moneyline_game != null ? Math.round(odds.away_moneyline_game) : null);

  out.push({ key: `${awayName.toLowerCase()}|moneyline`, selection: `${awayName} ML`, market: 'Moneyline', odds: awayML, modelProb: awayProb, ev: calcEV(awayProb, awayML), scoutPrompt: mlReason, scoutConfidence: sideConf(mlPick, mlSide, 'away'), scoutPick: mlSide === 'away', grade: { type: 'moneyline', teamId: game.away_team_id }, search: tag('moneyline ml') });
  out.push({ key: `${homeName.toLowerCase()}|moneyline`, selection: `${homeName} ML`, market: 'Moneyline', odds: homeML, modelProb: homeProb, ev: calcEV(homeProb, homeML), scoutPrompt: mlReason, scoutConfidence: sideConf(mlPick, mlSide, 'home'), scoutPick: mlSide === 'home', grade: { type: 'moneyline', teamId: game.home_team_id }, search: tag('moneyline ml') });

  // Run Line (±1.5). Model prob only attaches to the favored side.
  const margin    = pred?.blended_predicted_margin ?? pred?.predicted_margin ?? null;
  const marginStd = pred?.margin_std_dev ?? 4;
  const rlProb    = margin != null ? Math.min(80, Math.round(50 + (Math.abs(margin) / marginStd) * 15)) : null;
  const homeFav   = margin != null ? margin > 0 : null;
  const homeRL    = homeFav == null ? -1.5 : (homeFav ? -1.5 : 1.5);
  const awayRL    = homeFav == null ? 1.5  : (homeFav ? 1.5  : -1.5);
  const homeRLProb = homeFav === true  ? rlProb : null;
  const awayRLProb = homeFav === false ? rlProb : null;
  const homeRLPrice = bestVal(books, 'home_run_line_price');
  const awayRLPrice = bestVal(books, 'away_run_line_price');

  out.push({ key: `${awayName.toLowerCase()}|run line`, selection: `${awayName} ${fmtLine(awayRL)}`, market: 'Run Line', odds: awayRLPrice, modelProb: awayRLProb, ev: calcEV(awayRLProb, awayRLPrice), scoutPrompt: rlReason, scoutConfidence: sideConf(rlPick, rlSide, 'away'), scoutPick: rlSide === 'away', grade: { type: 'runline', side: 'away', line: awayRL }, search: tag('run line spread') });
  out.push({ key: `${homeName.toLowerCase()}|run line`, selection: `${homeName} ${fmtLine(homeRL)}`, market: 'Run Line', odds: homeRLPrice, modelProb: homeRLProb, ev: calcEV(homeRLProb, homeRLPrice), scoutPrompt: rlReason, scoutConfidence: sideConf(rlPick, rlSide, 'home'), scoutPick: rlSide === 'home', grade: { type: 'runline', side: 'home', line: homeRL }, search: tag('run line spread') });

  // Total (Over / Under)
  const ouLine    = odds?.over_under_line_game ?? pred?.blended_predicted_total ?? pred?.predicted_total ?? null;
  const predTotal = pred?.blended_predicted_total ?? pred?.predicted_total ?? null;
  const totalStd  = pred?.total_std_dev ?? 4;
  if (ouLine != null) {
    let totalProb = null, overSide = null;
    if (predTotal != null) {
      overSide  = predTotal >= ouLine ? 'Over' : 'Under';
      totalProb = Math.min(70, Math.round(50 + (Math.abs(predTotal - ouLine) / totalStd) * 15));
    }
    const overPrice  = bestVal(books, 'over_price');
    const underPrice = bestVal(books, 'under_price');
    out.push({ key: 'over|total',  selection: `Over ${ouLine}`,  market: 'Total', odds: overPrice,  modelProb: overSide === 'Over'  ? totalProb : null, ev: calcEV(overSide === 'Over'  ? totalProb : null, overPrice),  scoutPrompt: totalReason, scoutConfidence: sideConf(totalScoutPick, totalSide, 'over'),  scoutPick: totalSide === 'over',  grade: { type: 'total', side: 'over', line: ouLine },  search: tag(`over under total o${ouLine}`) });
    out.push({ key: 'under|total', selection: `Under ${ouLine}`, market: 'Total', odds: underPrice, modelProb: overSide === 'Under' ? totalProb : null, ev: calcEV(overSide === 'Under' ? totalProb : null, underPrice), scoutPrompt: totalReason, scoutConfidence: sideConf(totalScoutPick, totalSide, 'under'), scoutPick: totalSide === 'under', grade: { type: 'total', side: 'under', line: ouLine }, search: tag(`over under total u${ouLine}`) });
  }

  return out;
}

// ── pitcher props (mirrors PitcherProps.buildPitcherProps) ────────────────────

const PITCHER_STATS = {
  strikeouts:   { label: 'Strikeouts',   market: 'Strikeouts',   blended: 'blended_strikeouts',   std: 'strikeouts_std_dev'   },
  hits_allowed: { label: 'Hits Allowed', market: 'Hits Allowed', blended: 'blended_hits_allowed',  std: 'hits_allowed_std_dev'  },
  outs:         { label: 'Pitcher Outs', market: 'Pitcher Outs', blended: 'blended_outs',          std: 'outs_std_dev'          },
  earned_runs:  { label: 'Earned Runs',  market: 'Earned Runs',  blended: 'blended_earned_runs',   std: 'earned_runs_std_dev'   },
};

function pitcherConfidence(blended, line, std) {
  if (!std) return 55;
  return Math.min(78, Math.max(52, Math.round(52 + (Math.abs(blended - line) / std) * 30)));
}

// Locate this game's pitcher node in the /pitchers/today array (or single object).
function findPitcherNode(resp, gamePk) {
  if (!resp) return null;
  if (Array.isArray(resp)) return resp.find(g => (g.game_pk ?? g.id) === gamePk) || null;
  if (resp.home_pitcher || resp.away_pitcher) return resp;
  if (Array.isArray(resp.games)) return resp.games.find(g => (g.game_pk ?? g.id) === gamePk) || null;
  return null;
}

function buildPitcherCandidates(resp, game) {
  const node = findPitcherNode(resp, game?.game_pk ?? game?.id);
  if (!node) return [];

  const starters = [
    { raw: node.away_pitcher, name: game?.away_sp_name },
    { raw: node.home_pitcher, name: game?.home_sp_name },
  ];

  const out = [];
  for (const { raw, name: starterName } of starters) {
    if (!raw) continue;
    const pred = normalizeScoutAi(raw);
    const name = starterName || pred.player_name || pred.name;
    if (!name) continue;

    const sbProps = Array.isArray(pred.sportsbook_props) ? pred.sportsbook_props : [];
    const scoutAI = pred.scout_ai && typeof pred.scout_ai === 'object' ? pred.scout_ai : null;

    for (const [apiKey, cfg] of Object.entries(PITCHER_STATS)) {
      const blendedRaw = pred[cfg.blended];
      const statSB = sbProps.filter(p => p.stat_type === apiKey);
      if (blendedRaw == null && statSB.length === 0) continue; // no data → skip (no junk rows)
      const blended = blendedRaw ?? 0;
      const std = pred[cfg.std] ?? 1;

      // Group books by platform for this stat
      const bookMap = {};
      for (const sp of statSB) {
        const t = sp.platform_title;
        if (!bookMap[t]) bookMap[t] = { line: sp.line, over: null, under: null };
        if (sp.over_price  != null) bookMap[t].over  = Math.round(sp.over_price);
        if (sp.under_price != null) bookMap[t].under = Math.round(sp.under_price);
      }
      const books  = Object.values(bookMap);
      const sbLine = statSB.length ? statSB[0].line : null;
      const line   = sbLine ?? Math.round(blended * 10) / 10;

      // Scout AI pick (side + line), same precedence the page uses
      const scoutProp  = scoutAI?.props?.[apiKey] ?? null;
      const scoutParts = scoutProp?.pick ? scoutProp.pick.split(' ') : null;
      const scoutSide  = scoutParts?.[0] ?? null;
      const scoutLine  = scoutParts?.[1] ? parseFloat(scoutParts[1]) : null;

      const side     = scoutSide ?? (blended >= line ? 'Over' : 'Under');
      const sideKey  = side === 'Over' ? 'over' : 'under';
      const pickLine = scoutLine ?? line;
      const bestOdds = books
        .filter(b => b.line === pickLine)
        .reduce((best, b) => {
          const v = b[sideKey];
          return v != null && (best == null || v > best) ? v : best;
        }, null) ?? -115;
      const prob = pitcherConfidence(blended, line, std);

      out.push({
        key:       `${name.toLowerCase()}|${cfg.market.toLowerCase()}`,
        selection: `${name} ${side} ${line} ${cfg.label}`,
        market:    cfg.market,
        odds:      bestOdds,
        modelProb: prob,
        ev:        calcEV(prob, bestOdds),
        scoutPrompt:     scoutProp?.reasoning ?? '',
        scoutConfidence: scoutProp?.confidence ?? null,
        scoutPick:       !!scoutProp,
        grade: { type: 'pitcher_prop', side, line, statType: apiKey, playerId: pred.player_id ?? null },
        search:    `${name} ${cfg.label} pitcher ${side}`.toLowerCase(),
      });
    }
  }
  return out;
}

// Plain label fallbacks from the two starters, so a pitcher is always typeable
// even if the per-game pitcher payload is missing.
function buildStarterLabelCandidates(game) {
  if (!game) return [];
  const out = [];
  for (const name of [game.away_sp_name, game.home_sp_name]) {
    if (!name) continue;
    for (const cfg of Object.values(PITCHER_STATS)) {
      out.push({
        key:       `${name.toLowerCase()}|${cfg.market.toLowerCase()}`,
        selection: `${name} ${cfg.label}`,
        market:    cfg.market,
        odds: null, modelProb: null, ev: null,
        scoutPrompt: '', scoutConfidence: null, scoutPick: false, grade: null,
        search: `${name} ${cfg.label} pitcher`.toLowerCase(),
      });
    }
  }
  return out;
}

// ── batter props (mirrors BatterProps.buildBatterMarkets) ─────────────────────

const BATTER_STATS = {
  hits:        { label: 'Hits',        market: 'Hits',        predicted: 'predicted_hits' },
  home_runs:   { label: 'Home Runs',   market: 'Home Run',    predicted: 'predicted_hr'   },
  rbis:        { label: 'RBIs',        market: 'RBIs',        predicted: 'predicted_rbi'  },
  total_bases: { label: 'Total Bases', market: 'Total Bases', predicted: 'predicted_tb'   },
};

function poissonProb(lambda, lineVal) {
  if (!lambda || lambda <= 0) return 0;
  const minHits = Math.ceil(lineVal + 0.01);
  let cumulative = 0;
  let term = Math.exp(-lambda);
  for (let k = 0; k < minHits; k++) {
    cumulative += term;
    term *= lambda / (k + 1);
  }
  return Math.max(0, Math.min(100, (1 - cumulative) * 100));
}

function buildBatterCandidates(resp) {
  if (!resp) return [];
  const players = [...(resp.home_batters || []), ...(resp.away_batters || [])];
  const out = [];

  for (const player of players) {
    const name = player?.player_name;
    if (!name) continue;
    const sbProps = Array.isArray(player.sportsbook_props) ? player.sportsbook_props : [];
    const scoutAI = (() => {
      const raw = player?.scout_ai?.raw;
      if (raw && typeof raw === 'string') { try { return JSON.parse(raw); } catch { return player.scout_ai; } }
      return player.scout_ai;
    })();

    for (const [apiKey, cfg] of Object.entries(BATTER_STATS)) {
      const predicted = player[cfg.predicted];
      if (predicted == null) continue;

      const statSB = sbProps.filter(p => p.stat_type === apiKey);
      const aiPick = scoutAI?.props?.[apiKey] ?? scoutAI?.[apiKey] ?? null;

      // Line: scout_ai line, else most-common posted line, else rounded projection
      let line;
      if (aiPick?.line != null) {
        line = aiPick.line;
      } else if (statSB.length) {
        const counts = {};
        for (const p of statSB) counts[p.line] = (counts[p.line] || 0) + 1;
        line = parseFloat(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
      } else {
        line = Math.round(predicted * 10) / 10;
      }

      const overProb  = Math.round(poissonProb(predicted, line));
      const side      = aiPick?.pick ?? (predicted >= line ? 'Over' : 'Under');
      const modelProb = side === 'Under' ? 100 - overProb : overProb;
      const sideKey   = side === 'Under' ? 'under_price' : 'over_price';
      const bestOdds  = statSB
        .filter(p => p.line === line)
        .reduce((best, p) => {
          const v = p[sideKey] != null ? Math.round(p[sideKey]) : null;
          return v != null && (best == null || v > best) ? v : best;
        }, null);

      out.push({
        key:       `${name.toLowerCase()}|${cfg.market.toLowerCase()}`,
        selection: `${name} ${side} ${line} ${cfg.label}`,
        market:    cfg.market,
        odds:      bestOdds,
        modelProb,
        ev:        calcEV(modelProb, bestOdds),
        scoutPrompt:     aiPick?.reasoning ?? '',
        scoutConfidence: aiPick?.confidence ?? null,
        scoutPick:       !!aiPick,
        grade: { type: 'batter_prop', side, line, statType: apiKey, playerId: player.player_id ?? null },
        search:    `${name} ${cfg.label} batter ${side}`.toLowerCase(),
      });
    }
  }
  return out;
}

// ── public combiner ───────────────────────────────────────────────────────────

/**
 * @param {Object} args
 * @param {Object} args.game      — game row from /predictions/today
 * @param {*}      args.pitchers  — /predictions/pitchers/today payload (array of game nodes)
 * @param {*}      args.batters   — /predictions/batters/{game_pk} payload
 * @returns {Array} candidate bets, deduped (value-carrying entries preferred)
 */
export function buildMatchupCandidates({ game, pitchers, batters }) {
  const safe = (fn) => { try { return fn() || []; } catch { return []; } };

  const team    = safe(() => buildTeamCandidates(game));
  const pitcher = safe(() => buildPitcherCandidates(pitchers, game));
  const batter  = safe(() => buildBatterCandidates(batters));
  const starter = safe(() => buildStarterLabelCandidates(game));

  // Dedupe by key; prefer the entry that carries real odds.
  const byKey = new Map();
  for (const c of [...team, ...pitcher, ...batter, ...starter]) {
    const existing = byKey.get(c.key);
    if (!existing || (existing.odds == null && c.odds != null)) byKey.set(c.key, c);
  }
  return [...byKey.values()];
}

export default buildMatchupCandidates;
