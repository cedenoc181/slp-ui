import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getMlbId, getAbbr, getUrlName, logoUrl, headshotUrl, fmtDate, mapSeasonType } from './utils';
import scheduleService from '../../../../data/services/scheduleService';
import teamStatsService from '../../../../data/services/teamStatsService';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import playerStatsService from '../../../../data/services/playerStatsServices';
import gamesService from '../../../../data/services/gamesService';
import { DEFAULT_SEASON, SEASON_TYPE_CODES, PLAYER_ROLES } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/matchup-analysis.css';

// ─── Skeleton helpers ─────────────────────────────────────────────────────────
function SkeletonInsightCard() {
  return (
    <div className="insight-card insight-card--skeleton">
      <div className="insight-icon">
        <div className="insight-skeleton-line short analysis-skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
      </div>
      <div className="insight-body">
        <div className="insight-skeleton-line wide analysis-skeleton" style={{ marginBottom: 6 }} />
        <div className="insight-skeleton-line mid analysis-skeleton" />
      </div>
    </div>
  );
}

function SkeletonSplitRows() {
  return (
    <>
      {[80, 65, 70, 55, 60].map((w, i) => (
        <div key={i} className="split-skeleton-row analysis-skeleton" style={{ width: `${w}%` }} />
      ))}
    </>
  );
}

// ─── Mini Hero ────────────────────────────────────────────────────────────────
function MiniHero({ game }) {
  const awayMlbId  = getMlbId(game.away_team_id);
  const homeMlbId  = getMlbId(game.home_team_id);
  const awayAbbr   = getAbbr(game.away_team_id) || game.away_team_name;
  const homeAbbr   = getAbbr(game.home_team_id) || game.home_team_name;
  const awayUrlName = getUrlName(game.away_team_id);
  const homeUrlName = getUrlName(game.home_team_id);

  const statusLower = (game.status || '').toLowerCase();
  const isFinal  = statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed' || statusLower === 'completed early';
  const isLive   = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');
  const badgeClass = isFinal ? 'final' : isLive ? 'live' : 'scheduled';
  const badgeLabel = isFinal ? 'Final' : isLive ? '● Live' : 'Scheduled';

  const dateLabel = fmtDate(game.date);
  const timeLabel = game.game_time ? ` · ${game.game_time}` : '';

  const awayScore = game.away_runs_score ?? null;
  const homeScore = game.home_runs_score ?? null;
  const hasScore  = awayScore != null && homeScore != null && (isFinal || isLive);

  return (
    <div className="analysis-mini-hero">
      <div className="hero-teams-row">
        <div className="hero-team-block">
          {awayMlbId && (
            awayUrlName
              ? <Link to={`/team-analytics/${awayUrlName}`}><img src={logoUrl(awayMlbId)} alt={awayAbbr} className="hero-team-logo" /></Link>
              : <img src={logoUrl(awayMlbId)} alt={awayAbbr} className="hero-team-logo" />
          )}
          <span className="hero-team-abbr">{awayAbbr}</span>
          <span className="hero-team-record">Away</span>
        </div>

        <div className="hero-separator">
          {hasScore ? (
            <span className="hero-score">
              <span className={awayScore > homeScore ? 'hero-score-winner' : ''}>{awayScore}</span>
              <span className="hero-score-dash">–</span>
              <span className={homeScore > awayScore ? 'hero-score-winner' : ''}>{homeScore}</span>
            </span>
          ) : (
            <span className="hero-at-sign">@</span>
          )}
        </div>

        <div className="hero-team-block home-block">
          {homeMlbId && (
            homeUrlName
              ? <Link to={`/team-analytics/${homeUrlName}`}><img src={logoUrl(homeMlbId)} alt={homeAbbr} className="hero-team-logo" /></Link>
              : <img src={logoUrl(homeMlbId)} alt={homeAbbr} className="hero-team-logo" />
          )}
          <span className="hero-team-abbr">{homeAbbr}</span>
          <span className="hero-team-record">Home</span>
        </div>
      </div>

      <div className="hero-game-meta">
        <span className="hero-date-label">{dateLabel}{timeLabel}</span>
        <span className={`hero-status-badge ${badgeClass}`}>{badgeLabel}</span>
      </div>
    </div>
  );
}

// ─── Insights Panel ───────────────────────────────────────────────────────────
// Receives real insight objects once API data is wired; skeleton until then.
function InsightsPanel({ insights }) {
  if (!insights) {
    return (
      <div className="insights-panel">
        {[0, 1, 2, 3].map(i => <SkeletonInsightCard key={i} />)}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="insights-panel">
        <div className="insight-card insight-card--neutral">
          <span className="insight-icon">📊</span>
          <div className="insight-body">
            <div className="insight-headline">No split data available yet</div>
            <div className="insight-detail">Check back once more season data is available.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-panel">
      {insights.map((ins, i) => (
        <div key={i} className={`insight-card insight-card--${ins.type}${ins.metrics.length >= 2 ? ' insight-card--multi' : ''}`}>
          <span className="insight-icon">
            {ins.logoSrc && <img src={ins.logoSrc} alt="" className="insight-team-logo" />}
          </span>
          <div className="insight-body">
            <Link to={`/player/${ins.playerSlug}`} className="insight-player-link">
              {ins.headline}
            </Link>
            <div className="insight-metrics">
              {ins.metrics.map((m, j) => (
                <div key={j} className="insight-metric-row">
                  <span className="insight-metric-label">{m.label}</span>
                  <span className="insight-metric-value">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Split Compare Card (team batting) ────────────────────────────────────────
const BATTING_SPLIT_STATS = [
  { label: 'AVG',  keyHand: ['avg',        'avg'],        keyLoc: ['avg',        'avg'],        dec: 3 },
  { label: 'OPS',  keyHand: ['ops',        'ops'],        keyLoc: ['ops',        'ops'],        dec: 3 },
  { label: 'OBP',  keyHand: ['obp',        'obp'],        keyLoc: ['obp',        'obp'],        dec: 3 },
  { label: 'SLG',  keyHand: ['slg',        'slg'],        keyLoc: ['slg',        'slg'],        dec: 3 },
  { label: 'HR',   keyHand: ['homeruns',   'homeruns'],   keyLoc: ['homeruns',   'homeruns'],   dec: 0 },
  { label: 'RBI',  keyHand: ['rbis',       'rbis'],       keyLoc: ['rbis',       'rbis'],       dec: 0 },
  { label: 'K',    keyHand: ['strikeouts', 'strikeouts'], keyLoc: ['strikeouts', 'strikeouts'], dec: 0, lowerBetter: true },
];

// Maps getTeamBattingStats response → { vs_lhp, vs_rhp } shape SplitCompareCard expects
function normalizeBattingStats(apiResponse) {
  const data = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
  if (!data) return null;
  return {
    vs_lhp: data.vs_left_handed_pitching  ?? null,
    vs_rhp: data.vs_right_handed_pitching ?? null,
  };
}

// Maps getTeamBattingHomeVsRoad response → { at_home, on_road } shape SplitCompareCard expects
function normalizeBattingHomeRoad(apiResponse) {
  const data = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
  if (!data) return null;
  return {
    at_home: data.home  ?? null,
    on_road: data.away  ?? null,
  };
}

// Filters the multi-season array from getPitcherHomeRoadSplits to the matching season + type
// season_type in response is a numeric string ("1" = spring, "2" = regular)
function normalizePitcherHomeRoadSplits(apiResponse, season, seasonTypeCode) {
  const arr = Array.isArray(apiResponse) ? apiResponse : (apiResponse ? [apiResponse] : []);
  if (!arr.length) return null;
  const match = arr.find(
    e => String(e.season) === String(season) && String(e.season_type) === String(seasonTypeCode)
  );
  const data = match || arr[0]; // fallback to most recent entry
  if (!data) return null;
  return { at_home: data.at_home ?? null, on_road: data.on_road ?? null };
}

// Normalizes getPitcherVsHandSplits response (array or object) to { vs_lhb, vs_rhb }
function normalizePitcherVsHandSplits(apiResponse) {
  const data = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
  if (!data) return null;
  return { vs_lhb: data.vs_lhb ?? null, vs_rhb: data.vs_rhb ?? null };
}

// ─── Matchup Insights (Key Insights panel) ────────────────────────────────────
const INSIGHT_STATS = ['avg', 'ops', 'hr'];
const INSIGHT_STAT_LABEL = { avg: 'AVG', ops: 'OPS', hr: 'HR' };

function fmtInsightVal(stat, val) {
  if (val == null || isNaN(parseFloat(val))) return '—';
  const n = parseFloat(val);
  if (stat === 'avg' || stat === 'ops') return n >= 1 ? n.toFixed(3) : n.toFixed(3).replace(/^0/, '');
  return Math.round(n).toString();
}

// Builds insight cards grouped by player + split context (max 2 metrics per card)
function buildInsights(awayLeaders, homeLeaders, awayAbbr, homeAbbr, awayMlbId, homeMlbId, awaySPThrows, homeSPThrows) {
  const groups = new Map(); // key: `player__contextKey__team` → card

  function addToGroup(leaders, teamAbbr, teamMlbId, contextKey, contextLabel) {
    for (const stat of INSIGHT_STATS) {
      const leader = leaders?.find(l => l.category === `${stat}_${contextKey}`);
      if (!leader) continue;
      if (parseFloat(leader.value) === 0) continue;
      const groupKey = `${leader.player_name}__${contextKey}__${teamAbbr}`;
      const aboveAvg = parseFloat(leader.value) > parseFloat(leader.league_avg);
      if (!groups.has(groupKey)) {
        // Prefer backend name_slug (has ID embedded, e.g. "luisangel-acuna-682668").
        // If unavailable, build slug from the name preserving accented chars so
        // the profile page's slugToPlayerName → lookup gets the correct spelling.
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

function fmtSplit(val, dec) {
  if (val == null) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (dec === 3) return n.toFixed(3).replace(/^0/, '');
  return dec === 0 ? Math.round(n).toString() : n.toFixed(dec);
}

// Compare two numeric values; pass lowerBetter=true to flip advantage direction
function advantage(a, b, lowerBetter = false) {
  if (a == null || b == null) return { aClass: '', bClass: '' };
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb) || na === nb) return { aClass: '', bClass: '' };
  const aWins = lowerBetter ? na < nb : na > nb;
  return aWins
    ? { aClass: 'advantage', bClass: 'disadvantage' }
    : { aClass: 'disadvantage', bClass: 'advantage' };
}

function SplitCompareCard({ abbr, mlbId, side, opposingThrows, vsHandSplits, homeRoadSplits }) {
  const [tab, setTab] = useState('hand'); // 'hand' | 'location'

  // null = still fetching (skeleton), false = fetched but unavailable, object = data
  const isLoading     = tab === 'hand' ? vsHandSplits   === null : homeRoadSplits === null;
  const isUnavailable = tab === 'hand' ? vsHandSplits   === false : homeRoadSplits === false;
  const vsLeft  = vsHandSplits?.vs_lhp  ?? vsHandSplits?.[0]?.vs_lhp  ?? null;
  const vsRight = vsHandSplits?.vs_rhp  ?? vsHandSplits?.[0]?.vs_rhp  ?? null;
  const atHome  = homeRoadSplits?.at_home ?? homeRoadSplits?.[0]?.at_home ?? null;
  const onRoad  = homeRoadSplits?.on_road ?? homeRoadSplits?.[0]?.on_road ?? null;

  const colA = tab === 'hand' ? vsLeft  : atHome;
  const colB = tab === 'hand' ? vsRight : onRoad;
  const labelA = tab === 'hand' ? 'vs LHP' : 'At Home';
  const labelB = tab === 'hand' ? 'vs RHP' : 'On Road';

  return (
    <div className="split-compare-card">
      <div className="split-card-header">
        <div className="split-card-title">
          {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="split-card-logo" />}
          <div>
            <div className="split-card-team-name">{abbr}</div>
            <div className="split-card-subtitle">{side} Offense</div>
          </div>
        </div>
        <div className="split-toggle">
          <button
            className={`split-toggle-btn${tab === 'hand' ? ' active' : ''}`}
            onClick={() => setTab('hand')}
          >
            vs L/R
          </button>
          <button
            className={`split-toggle-btn${tab === 'location' ? ' active' : ''}`}
            onClick={() => setTab('location')}
          >
            Home/Road
          </button>
        </div>
      </div>

      {isUnavailable ? (
        <div className="split-unavailable">Data currently unavailable</div>
      ) : (
        <div className="split-cols">
          {/* Column A */}
          <div className="split-col">
            <div className={`split-col-header${
              (tab === 'location' && side === 'Home') ||
              (tab === 'hand' && opposingThrows?.toUpperCase() === 'L')
                ? ' split-col-header--context' : ''
            }`}>{labelA}</div>
            {isLoading ? <SkeletonSplitRows /> : BATTING_SPLIT_STATS.map(({ label, keyHand, keyLoc, dec, lowerBetter }) => {
              const key = tab === 'hand' ? keyHand[0] : keyLoc[0];
              const valA = colA?.[key];
              const valB = colB?.[key];
              const { aClass } = advantage(valA, valB, lowerBetter);
              return (
                <div key={label} className="split-stat-row">
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${aClass}`}>{fmtSplit(valA, dec)}</span>
                </div>
              );
            })}
          </div>

          <div className="split-divider" />

          {/* Column B */}
          <div className="split-col">
            <div className={`split-col-header${
              (tab === 'location' && side === 'Away') ||
              (tab === 'hand' && opposingThrows?.toUpperCase() === 'R')
                ? ' split-col-header--context' : ''
            }`}>{labelB}</div>
            {isLoading ? <SkeletonSplitRows /> : BATTING_SPLIT_STATS.map(({ label, keyHand, keyLoc, dec, lowerBetter }) => {
              const key = tab === 'hand' ? keyHand[1] : keyLoc[1];
              const valA = colA?.[tab === 'hand' ? keyHand[0] : keyLoc[0]];
              const valB = colB?.[key];
              const { bClass } = advantage(valA, valB, lowerBetter);
              return (
                <div key={label} className="split-stat-row">
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${bClass}`}>{fmtSplit(valB, dec)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pitcher Split Card ───────────────────────────────────────────────────────
const PITCHER_HAND_STATS = [
  { label: 'Opp AVG', keyA: 'avg',      keyB: 'avg',      dec: 3, lowerBetter: true },
  { label: 'Opp OPS', keyA: 'ops',      keyB: 'ops',      dec: 3, lowerBetter: true },
  { label: 'K/9',     keyA: 'k_per_9',  keyB: 'k_per_9',  dec: 1, lowerBetter: false },
  { label: 'HR/9',    keyA: 'hr_per_9', keyB: 'hr_per_9', dec: 2, lowerBetter: true },
  { label: 'WHIP',    keyA: 'whip',     keyB: 'whip',     dec: 2, lowerBetter: true },
];

const PITCHER_LOC_STATS = [
  { label: 'ERA',  keyA: 'era',              keyB: 'era',              dec: 2, lowerBetter: true },
  { label: 'WHIP', keyA: 'whip',             keyB: 'whip',             dec: 2, lowerBetter: true },
  { label: 'K/9',  keyA: 'k_per_9',          keyB: 'k_per_9',          dec: 1, lowerBetter: false },
  { label: 'IP',   keyA: 'innings_pitched',  keyB: 'innings_pitched',  dec: 1, lowerBetter: false },
  { label: 'BB',   keyA: 'walks_allowed',    keyB: 'walks_allowed',    dec: 0, lowerBetter: true },
];

function pitcherAdvantage(a, b, lowerBetter) {
  if (a == null || b == null) return { aClass: '', bClass: '' };
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb) || na === nb) return { aClass: '', bClass: '' };
  const aBetter = lowerBetter ? na < nb : na > nb;
  return aBetter
    ? { aClass: 'advantage', bClass: 'disadvantage' }
    : { aClass: 'disadvantage', bClass: 'advantage' };
}

function handednessLabel(throws) {
  if (!throws) return null;
  return throws.toUpperCase() === 'L' ? 'LHP' : 'RHP';
}

function PitcherSplitCard({ abbr, mlbId, side, spName, spThrows, vsHandSplits, homeRoadSplits }) {
  const [tab, setTab] = useState('location'); // 'location' | 'hand'

  const hasSP = !!spName;
  // null = still fetching (skeleton), false = fetched but unavailable, object = data
  const isLoading     = hasSP && (tab === 'location' ? homeRoadSplits === null : vsHandSplits === null);
  const isUnavailable = hasSP && (tab === 'location' ? homeRoadSplits === false : vsHandSplits === false);
  const throwsLabel = handednessLabel(spThrows);
  const badgeClass  = !throwsLabel ? 'tbd' : spThrows.toUpperCase() === 'L' ? 'lhp' : 'rhp';

  const vsLeft  = vsHandSplits?.vs_lhb  ?? vsHandSplits?.[0]?.vs_lhb  ?? null;
  const vsRight = vsHandSplits?.vs_rhb  ?? vsHandSplits?.[0]?.vs_rhb  ?? null;
  const atHome  = homeRoadSplits?.at_home ?? homeRoadSplits?.[0]?.at_home ?? null;
  const onRoad  = homeRoadSplits?.on_road ?? homeRoadSplits?.[0]?.on_road ?? null;

  const statDefs  = tab === 'location' ? PITCHER_LOC_STATS : PITCHER_HAND_STATS;
  const colAData  = tab === 'location' ? atHome  : vsLeft;
  const colBData  = tab === 'location' ? onRoad  : vsRight;
  const labelA    = tab === 'location' ? 'At Home'  : 'vs LHB';
  const labelB    = tab === 'location' ? 'On Road'  : 'vs RHB';

  // Home/Road badges — each threshold fires independently
  const contextSplit = side === 'Away' ? onRoad : atHome;
  const contextERA   = contextSplit?.era  != null ? parseFloat(contextSplit.era)  : null;
  const contextWHIP  = contextSplit?.whip != null ? parseFloat(contextSplit.whip) : null;
  const isRunRisk    = contextERA  != null && contextERA  > 4.00;
  const isHeavyTraffic = contextWHIP != null && contextWHIP > 1.50;

  // vs Batters badges — each threshold fires independently
  // SP throws R → opposing lineup stacks LHBs → check vs LHB; SP throws L → check vs RHB
  const handContextSplit   = spThrows?.toUpperCase() === 'R' ? vsLeft
    : spThrows?.toUpperCase() === 'L' ? vsRight : null;
  const handOppAVG         = handContextSplit?.avg != null ? parseFloat(handContextSplit.avg) : null;
  const handOppOPS         = handContextSplit?.ops != null ? parseFloat(handContextSplit.ops) : null;
  const isContactRisk      = handOppAVG != null && handOppAVG > 0.300;
  const isPowerThreat      = handOppOPS != null && handOppOPS > 0.900;

  const locBadges  = (isRunRisk && isHeavyTraffic)
    ? ['Exploitable']
    : [isRunRisk && 'Run Risk', isHeavyTraffic && 'Heavy Traffic'].filter(Boolean);
  const handBadges = (isContactRisk && isPowerThreat)
    ? ['Exploitable']
    : [isContactRisk && 'Contact Risk', isPowerThreat && 'Power Threat'].filter(Boolean);
  const activeBadges = tab === 'location' ? locBadges : handBadges;

  // Which column is the matchup-relevant one, and which stat keys are flagged
  const isContextColA = (tab === 'location' && side === 'Home') || (tab === 'hand' && spThrows?.toUpperCase() === 'R');
  const isContextColB = (tab === 'location' && side === 'Away') || (tab === 'hand' && spThrows?.toUpperCase() === 'L');
  const flaggedKeys   = tab === 'location'
    ? { ...(isRunRisk      && { era:  true }), ...(isHeavyTraffic  && { whip: true }) }
    : { ...(isContactRisk  && { avg:  true }), ...(isPowerThreat   && { ops:  true }) };

  return (
    <div className="pitcher-split-card">
      <div className="pitcher-split-header">
        <div className="pitcher-split-identity">
          {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="pitcher-split-logo" />}
          <div>
            <div className="pitcher-split-name">{hasSP ? spName : 'TBD'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{abbr} SP</span>
              {throwsLabel && (
                <span className={`sp-handedness-badge ${badgeClass}`}>{throwsLabel[0]}</span>
              )}
            </div>
          </div>
        </div>
        {hasSP && activeBadges.length > 0 && (
          <div className="sp-warning-badges">
            {activeBadges.map(label => (
              <span key={label} className="exploitable-tag">{label}</span>
            ))}
          </div>
        )}
        {hasSP && (
          <div className="split-toggle">
            <button
              className={`split-toggle-btn${tab === 'location' ? ' active' : ''}`}
              onClick={() => setTab('location')}
            >
              Home/Road
            </button>
            <button
              className={`split-toggle-btn${tab === 'hand' ? ' active' : ''}`}
              onClick={() => setTab('hand')}
            >
              vs Batters
            </button>
          </div>
        )}
      </div>

      {!hasSP ? (
        <div className="pitcher-split-tbd">Starting pitcher not yet announced</div>
      ) : isUnavailable ? (
        <div className="split-unavailable">Data currently unavailable</div>
      ) : (
        <div className="split-cols">
          <div className="split-col">
            <div className={`split-col-header${
              (tab === 'location' && side === 'Home') ||
              (tab === 'hand' && spThrows?.toUpperCase() === 'R')
                ? ' split-col-header--context' : ''
            }`}>{labelA}</div>
            {isLoading ? <SkeletonSplitRows /> : statDefs.map(({ label, keyA, lowerBetter, dec }) => {
              const valA = colAData?.[keyA];
              const valB = colBData?.[keyA];
              const { aClass } = pitcherAdvantage(valA, valB, lowerBetter);
              const flagged = isContextColA && !!flaggedKeys[keyA];
              return (
                <div key={label} className={`split-stat-row${flagged ? ' split-stat-row--flagged' : ''}`}>
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${aClass}`}>{fmtSplit(valA, dec)}</span>
                </div>
              );
            })}
          </div>

          <div className="split-divider" />

          <div className="split-col">
            <div className={`split-col-header${
              (tab === 'location' && side === 'Away') ||
              (tab === 'hand' && spThrows?.toUpperCase() === 'L')
                ? ' split-col-header--context' : ''
            }`}>{labelB}</div>
            {isLoading ? <SkeletonSplitRows /> : statDefs.map(({ label, keyA, lowerBetter, dec }) => {
              const valA = colAData?.[keyA];
              const valB = colBData?.[keyA];
              const { bClass } = pitcherAdvantage(valA, valB, lowerBetter);
              const flagged = isContextColB && !!flaggedKeys[keyA];
              return (
                <div key={label} className={`split-stat-row${flagged ? ' split-stat-row--flagged' : ''}`}>
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${bClass}`}>{fmtSplit(valB, dec)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Top Batters This Week ────────────────────────────────────────────────────
const HOT_METRICS = [
  { key: 'home_runs',    label: 'HR'    },
  { key: 'hits',         label: 'Hits'  },
  { key: 'rbis',         label: 'RBI'   },
  { key: 'runs',         label: 'Runs'  },
  { key: 'walks',        label: 'BB'    },
];

function GameSparkbar({ games }) {
  if (!games?.length) return null;
  const sorted = [...games].reverse(); // oldest → newest left to right
  const maxVal = Math.max(...sorted.map(g => g.value), 1);
  return (
    <div className="game-sparkbar">
      {sorted.map((g, i) => {
        const heightPct = g.value > 0 ? Math.max(18, Math.round((g.value / maxVal) * 100)) : 0;
        const d         = new Date(g.date + 'T12:00:00');
        const dateShort = `${d.getMonth() + 1}/${d.getDate()}`;
        const dateTitle = `${dateShort}: ${g.value}`;
        return (
          <div key={i} className="game-sparkbar-col" title={dateTitle}>
            <span className={`game-sparkbar-val${g.value === 0 ? ' is-zero' : ''}`}>
              {g.value > 0 ? g.value : ''}
            </span>
            <div className="game-sparkbar-track">
              <div
                className={`game-sparkbar-fill${g.value >= 2 ? ' is-hot' : g.value === 0 ? ' is-empty' : ''}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="game-sparkbar-date">{dateShort}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopBattersCard({ awayAbbr, homeAbbr, awayMlbId, homeMlbId, awayData, homeData }) {
  const [activeTeam,   setActiveTeam]   = useState('away');
  const [activeMetric, setActiveMetric] = useState('home_runs');

  const data       = activeTeam === 'away' ? awayData : homeData;
  const isLoading  = data === null;
  const isUnavail  = data === false;
  const players    = (!isLoading && !isUnavail && data?.[activeMetric]) ? data[activeMetric] : [];
  const teamMlbId  = activeTeam === 'away' ? awayMlbId : homeMlbId;

  return (
    <div className="top-batters-card">
      {/* Header row: title + team toggle */}
      <div className="top-batters-header">
        <div className="top-batters-title">
          {teamMlbId && <img src={logoUrl(teamMlbId)} alt="" className="top-batters-logo" />}
          Top Batters This Week
        </div>
        <div className="split-toggle">
          <button
            className={`split-toggle-btn${activeTeam === 'away' ? ' active' : ''}`}
            onClick={() => setActiveTeam('away')}
          >
            {awayAbbr}
          </button>
          <button
            className={`split-toggle-btn${activeTeam === 'home' ? ' active' : ''}`}
            onClick={() => setActiveTeam('home')}
          >
            {homeAbbr}
          </button>
        </div>
      </div>

      {/* Metric toggle */}
      <div className="top-batters-metric-toggle">
        {HOT_METRICS.map(({ key, label }) => (
          <button
            key={key}
            className={`top-batters-metric-btn${activeMetric === key ? ' active' : ''}`}
            onClick={() => setActiveMetric(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Player rows */}
      {isLoading ? (
        <div className="top-batters-rows">
          {[1,2,3].map(i => (
            <div key={i} className="top-batter-row">
              <div className="analysis-skeleton top-batter-skeleton-avatar" />
              <div className="top-batter-info">
                <div className="analysis-skeleton top-batter-skeleton-name" />
                <div className="analysis-skeleton top-batter-skeleton-dots" />
              </div>
              <div className="analysis-skeleton top-batter-skeleton-total" />
            </div>
          ))}
        </div>
      ) : isUnavail || !players.length ? (
        <div className="split-unavailable">No data available</div>
      ) : (
        <div className="top-batters-rows">
          {players.map((p, idx) => (
            <div key={p.player_id ?? idx} className="top-batter-row">
              <span className="top-batter-rank">#{idx + 1}</span>
              <img
                src={headshotUrl(p.player_mlb_id)}
                alt={p.player_name}
                className="top-batter-headshot"
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div className="top-batter-info">
                <Link to={`/player/${p.player_mlb_id}`} className="top-batter-name">
                  {p.player_name}
                </Link>
                <GameSparkbar games={p.games} />
              </div>
              <span className="top-batter-total">{p.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── H2H Pitcher History ──────────────────────────────────────────────────────
function normName(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function classifyPitchers(players) {
  const starters = [];
  const bullpen  = [];
  for (const p of (players || [])) {
    const ip  = parseFloat(p.innings_pitched) || 0;
    const app = parseInt(p.appearances, 10)   || 1;
    if (ip / app >= 3) {
      starters.push(p);
    } else {
      bullpen.push(p);
    }
  }
  const topBullpen = bullpen
    .sort((a, b) => {
      const appDiff = (parseInt(b.appearances, 10) || 0) - (parseInt(a.appearances, 10) || 0);
      if (appDiff !== 0) return appDiff;
      return (parseFloat(b.innings_pitched) || 0) - (parseFloat(a.innings_pitched) || 0);
    })
    .slice(0, 8);
  return { starters, bullpen: topBullpen };
}

function H2HPitcherRow({ player, isTonight }) {
  const era  = player.era  != null ? parseFloat(player.era).toFixed(2)  : '—';
  const whip = player.whip != null ? parseFloat(player.whip).toFixed(2) : '—';
  const ip   = player.innings_pitched != null ? parseFloat(player.innings_pitched).toFixed(1) : '—';
  const ks   = player.strikeouts != null ? player.strikeouts : '—';
  return (
    <div className={`h2h-pitcher-row${isTonight ? ' h2h-pitcher-row--sp' : ''}`}>
      <div className="h2h-pitcher-main">
        <img
          src={headshotUrl(player.player_mlb_id)}
          alt={player.player_name}
          className="h2h-pitcher-headshot"
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div className="h2h-pitcher-identity">
          <Link to={`/player/${player.player_mlb_id}`} className="h2h-pitcher-name">
            {player.player_name}
          </Link>
          <div className="h2h-pitcher-meta">
            {isTonight && <span className="h2h-sp-badge">Tonight's SP</span>}
            <span className="h2h-app-label">{player.appearances} app · {player.wins ?? 0}W-{player.losses ?? 0}L</span>
          </div>
        </div>
      </div>
      <div className="h2h-pitcher-stats">
        <div className="h2h-pstat"><span className="h2h-pstat-val">{era}</span><span className="h2h-pstat-lbl">ERA</span></div>
        <div className="h2h-pstat"><span className="h2h-pstat-val">{whip}</span><span className="h2h-pstat-lbl">WHIP</span></div>
        <div className="h2h-pstat"><span className="h2h-pstat-val">{ip}</span><span className="h2h-pstat-lbl">IP</span></div>
        <div className="h2h-pstat"><span className="h2h-pstat-val">{ks}</span><span className="h2h-pstat-lbl">K</span></div>
      </div>
    </div>
  );
}

const BULLPEN_INITIAL = 2;

function H2HPitchersCard({ abbr, mlbId, oppAbbr, players, spName, gameCount }) {
  const [bullpenExpanded, setBullpenExpanded] = useState(false);
  const { starters, bullpen } = classifyPitchers(players);
  const normSP = normName(spName);
  const isTonightSP = (p) => {
    if (!normSP) return false;
    const pNorm = normName(p.player_name);
    return pNorm === normSP || pNorm.includes(normSP) || normSP.includes(pNorm);
  };

  if (!players?.length) {
    return (
      <div className="h2h-card">
        <div className="h2h-card-header">
          {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="h2h-card-logo" />}
          <span className="h2h-card-title">{abbr} Pitchers</span>
        </div>
        <div className="split-unavailable">No H2H pitching data available</div>
      </div>
    );
  }

  const visibleBullpen = bullpenExpanded ? bullpen : bullpen.slice(0, BULLPEN_INITIAL);
  const hiddenCount = bullpen.length - BULLPEN_INITIAL;

  return (
    <div className="h2h-card">
      <div className="h2h-card-header">
        {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="h2h-card-logo" />}
        <span className="h2h-card-title">{abbr} Pitchers</span>
        {gameCount != null && <span className="h2h-game-count">Last {gameCount} matchups</span>}
      </div>

      {starters.length > 0 && (
        <>
          <div className="h2h-group-label">Starters vs {oppAbbr}</div>
          {[...starters]
            .sort((a, b) => (isTonightSP(b) ? 1 : 0) - (isTonightSP(a) ? 1 : 0))
            .slice(0, 5)
            .map(p => (
              <H2HPitcherRow key={p.player_mlb_id ?? p.player_name} player={p} isTonight={isTonightSP(p)} />
            ))}
        </>
      )}

      {bullpen.length > 0 && (
        <>
          <div className="h2h-group-label">Bullpen vs {oppAbbr}</div>
          {visibleBullpen.map(p => (
            <H2HPitcherRow key={p.player_mlb_id ?? p.player_name} player={p} isTonight={false} />
          ))}
          {hiddenCount > 0 && (
            <button
              className="h2h-bullpen-toggle"
              onClick={() => setBullpenExpanded(prev => !prev)}
            >
              {bullpenExpanded ? 'Show Less ▲' : `Show ${hiddenCount} More ▼`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Edge Indicators ──────────────────────────────────────────────────────────
function EdgeBar({ category, awayLabel, homeLabel, awayVal, homeVal, higherBetter = true }) {
  const isLoading = awayVal == null && homeVal == null;

  let awayPct = 50, homePct = 50;
  let awayWinner = false, homeWinner = false;

  if (!isLoading && awayVal != null && homeVal != null) {
    const total = awayVal + homeVal;
    if (total > 0) {
      awayPct = Math.round((awayVal / total) * 100);
      homePct = 100 - awayPct;
    }
    if (higherBetter) {
      awayWinner = awayVal > homeVal;
      homeWinner = homeVal > awayVal;
    } else {
      awayWinner = awayVal < homeVal;
      homeWinner = homeVal < awayVal;
    }
  }

  return (
    <div className="edge-bar-row">
      <div className="edge-bar-labels">
        <span className={`edge-label-team${awayWinner ? ' winner' : ''}`}>{awayLabel}</span>
        <span className="edge-label-category">{category}</span>
        <span className={`edge-label-team${homeWinner ? ' winner' : ''}`}>{homeLabel}</span>
      </div>
      {isLoading ? (
        <div className="edge-bar-skeleton analysis-skeleton" />
      ) : (
        <div className="edge-bar">
          <div className="edge-fill away-fill" style={{ width: `${awayPct}%` }} />
          <div className="edge-fill home-fill" style={{ width: `${homePct}%` }} />
        </div>
      )}
      <div className="edge-bar-values">
        <span className={`edge-value${awayWinner ? ' winner' : ''}`}>
          {awayVal != null ? awayVal : '—'}
        </span>
        <span className={`edge-value${homeWinner ? ' winner' : ''}`}>
          {homeVal != null ? homeVal : '—'}
        </span>
      </div>
    </div>
  );
}

function EdgeIndicators({ awayAbbr, homeAbbr, awayBatting, homeBatting, awayPitching, homePitching }) {
  // Pull meaningful comparable stats from team batting/pitching
  const awayOPS  = awayBatting?.ops  != null ? parseFloat(awayBatting.ops)  : null;
  const homeOPS  = homeBatting?.ops  != null ? parseFloat(homeBatting.ops)  : null;
  const awayERA  = awayPitching?.era != null ? parseFloat(awayPitching.era) : null;
  const homeERA  = homePitching?.era != null ? parseFloat(homePitching.era) : null;
  const awayK9   = awayPitching?.strikeouts != null ? parseFloat(awayPitching.strikeouts) : null;
  const homeK9   = homePitching?.strikeouts != null ? parseFloat(homePitching.strikeouts) : null;

  // ERA: lower = better → invert for bar (use 10 - ERA so higher bar = better pitching)
  const awayERAInv = awayERA != null ? Math.max(0, 10 - awayERA) : null;
  const homeERAInv = homeERA != null ? Math.max(0, 10 - homeERA) : null;

  return (
    <div className="edge-indicators-card">
      <EdgeBar
        category="Offense (OPS)"
        awayLabel={awayAbbr}
        homeLabel={homeAbbr}
        awayVal={awayOPS}
        homeVal={homeOPS}
        higherBetter
      />
      <EdgeBar
        category="Pitching (ERA — lower is better)"
        awayLabel={awayAbbr}
        homeLabel={homeAbbr}
        awayVal={awayERAInv}
        homeVal={homeERAInv}
        higherBetter
      />
      <EdgeBar
        category="Strikeouts"
        awayLabel={awayAbbr}
        homeLabel={homeAbbr}
        awayVal={awayK9}
        homeVal={homeK9}
        higherBetter
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MatchupDetailComp() {
  const { gameId } = useParams();
  const { state }  = useLocation();

  const [game, setGame]       = useState(state?.game ?? null);
  const [loading, setLoading] = useState(!state?.game);
  const [error, setError]     = useState(null);

  const [awaySplits, setAwaySplits] = useState(null);
  const [homeSplits, setHomeSplits] = useState(null);

  const [awaySPVsHandSplits,   setAwaySPVsHandSplits]   = useState(null);
  const [awaySPHomeRoadSplits, setAwaySPHomeRoadSplits] = useState(null);
  const [awaySPThrows,         setAwaySPThrows]         = useState(state?.awaySPThrows ?? null);
  const [homeSPVsHandSplits,   setHomeSPVsHandSplits]   = useState(null);
  const [homeSPHomeRoadSplits, setHomeSPHomeRoadSplits] = useState(null);
  const [homeSPThrows,         setHomeSPThrows]         = useState(state?.homeSPThrows ?? null);

  const [awayHomeRoadSplits, setAwayHomeRoadSplits] = useState(null);
  const [homeHomeRoadSplits, setHomeHomeRoadSplits] = useState(null);

  const [awaySplitLeaders, setAwaySplitLeaders] = useState(null);
  const [homeSplitLeaders, setHomeSplitLeaders] = useState(null);

  const [awayHotLeaders, setAwayHotLeaders] = useState(null);
  const [homeHotLeaders, setHomeHotLeaders] = useState(null);

  const [h2hPitchers, setH2hPitchers] = useState(null);

  // Fallback: fetch game if navigated directly without router state
  useEffect(() => {
    if (game) { window.scrollTo(0, 0); return; }
    setLoading(true);
    scheduleService.getGameById(gameId, state?.seasonType ?? null, state?.season ?? null)
      .then(g => {
        if (!g) throw new Error('Game not found');
        setGame(g);
      })
      .catch(err => setError(err?.message || 'Failed to load game.'))
      .finally(() => setLoading(false));
  }, [gameId]); // eslint-disable-line

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── Fetch offensive splits once game is available ──
  useEffect(() => {
    if (!game) return;
    const season     = game.season || DEFAULT_SEASON;
    const seasonType = mapSeasonType(game.season_type);
    Promise.all([
      teamStatsService.getTeamBattingStats(game.away_team_id, season, seasonType),
      teamStatsService.getTeamBattingStats(game.home_team_id, season, seasonType),
    ]).then(([away, home]) => {
      setAwaySplits(normalizeBattingStats(away) ?? false);
      setHomeSplits(normalizeBattingStats(home) ?? false);
    }).catch(() => {
      setAwaySplits(false);
      setHomeSplits(false);
    });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Fetch team batting home/road splits ──
  useEffect(() => {
    if (!game) return;
    const season     = game.season || DEFAULT_SEASON;
    const seasonType = mapSeasonType(game.season_type);
    Promise.all([
      teamStatsService.getTeamBattingHomeVsRoad(game.away_team_id, season, seasonType),
      teamStatsService.getTeamBattingHomeVsRoad(game.home_team_id, season, seasonType),
    ]).then(([away, home]) => {
      setAwayHomeRoadSplits(normalizeBattingHomeRoad(away) ?? false);
      setHomeHomeRoadSplits(normalizeBattingHomeRoad(home) ?? false);
    }).catch(() => {
      setAwayHomeRoadSplits(false);
      setHomeHomeRoadSplits(false);
    });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Fetch SP splits once game is available ──
  useEffect(() => {
    if (!game) return;
    const season = game.season || DEFAULT_SEASON;
    // Pitcher split endpoints use numeric season_type: 1 = spring, 2 = regular, 3 = postseason
    // game.season_type from schedule API is the full string ('spring', 'postseason') or short ('s','p','r')
    const stLower = (game.season_type || '').toLowerCase();
    const spSeasonTypeCode =
      (stLower === 'spring'     || stLower === 's')                           ? SEASON_TYPE_CODES.SPRING_TRAINING :
      (stLower === 'postseason' || stLower === 'post' || stLower === 'p')     ? SEASON_TYPE_CODES.POSTSEASON      :
      SEASON_TYPE_CODES.REGULAR; // 2 — default for 'regular' / 'r' / anything else

    const awaySPId = game.away_sp_id;
    const homeSPId = game.home_sp_id;

    if (awaySPId) {
      Promise.all([
        playerStatsService.getPitcherVsHandSplits(awaySPId, season, spSeasonTypeCode),
        playerStatsService.getPitcherHomeRoadSplits(awaySPId, season, spSeasonTypeCode),
        playerStatsService.getPlayerInfo(awaySPId),
      ]).then(([vsHand, homeRoad, info]) => {
        setAwaySPVsHandSplits(normalizePitcherVsHandSplits(vsHand) ?? false);
        setAwaySPHomeRoadSplits(normalizePitcherHomeRoadSplits(homeRoad, season, spSeasonTypeCode) ?? false);
        setAwaySPThrows(info?.throws ?? null);
      }).catch(() => {
        setAwaySPVsHandSplits(false);
        setAwaySPHomeRoadSplits(false);
      });
    }

    if (homeSPId) {
      Promise.all([
        playerStatsService.getPitcherVsHandSplits(homeSPId, season, spSeasonTypeCode),
        playerStatsService.getPitcherHomeRoadSplits(homeSPId, season, spSeasonTypeCode),
        playerStatsService.getPlayerInfo(homeSPId),
      ]).then(([vsHand, homeRoad, info]) => {
        setHomeSPVsHandSplits(normalizePitcherVsHandSplits(vsHand) ?? false);
        setHomeSPHomeRoadSplits(normalizePitcherHomeRoadSplits(homeRoad, season, spSeasonTypeCode) ?? false);
        setHomeSPThrows(info?.throws ?? null);
      }).catch(() => {
        setHomeSPVsHandSplits(false);
        setHomeSPHomeRoadSplits(false);
      });
    }
  }, [game?.away_sp_id, game?.home_sp_id]); // eslint-disable-line

  // ── Fetch team split leaders for Key Insights panel ──
  useEffect(() => {
    if (!game) return;
    const season     = game.season || DEFAULT_SEASON;
    const seasonType = mapSeasonType(game.season_type); // returns 'R', 'S', or 'P'
    Promise.all([
      teamLeadersService.getTeamSplits(game.away_team_id, season, seasonType, PLAYER_ROLES.BATTER),
      teamLeadersService.getTeamSplits(game.home_team_id, season, seasonType, PLAYER_ROLES.BATTER),
    ]).then(([away, home]) => {
      setAwaySplitLeaders(Array.isArray(away) && away.length ? away : false);
      setHomeSplitLeaders(Array.isArray(home) && home.length ? home : false);
    }).catch(() => {
      setAwaySplitLeaders(false);
      setHomeSplitLeaders(false);
    });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Fetch hot batting leaders for Top Batters card ──
  useEffect(() => {
    if (!game) return;
    const season     = game.season || DEFAULT_SEASON;
    const seasonType = mapSeasonType(game.season_type);
    const asOfDate   = game.date || null;
    Promise.all([
      teamLeadersService.getHotTeamBattingLeaders(game.away_team_id, season, seasonType, 10, asOfDate),
      teamLeadersService.getHotTeamBattingLeaders(game.home_team_id, season, seasonType, 10, asOfDate),
    ]).then(([away, home]) => {
      setAwayHotLeaders(away && typeof away === 'object' ? away : false);
      setHomeHotLeaders(home && typeof home === 'object' ? home : false);
    }).catch(() => {
      setAwayHotLeaders(false);
      setHomeHotLeaders(false);
    });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Fetch H2H pitcher totals — last 10 matchups across all season types ──
  useEffect(() => {
    if (!game) return;
    gamesService.getHeadToHeadPitchers(game.away_team_id, game.home_team_id, { limit: 10, totals: true })
      .then(data => {
        setH2hPitchers(data && (data.team_a?.length || data.team_b?.length) ? data : false);
      })
      .catch(() => setH2hPitchers(false));
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Loading ──
  if (loading) {
    return (
      <div className="matchup-analysis-page">
        <div className="analysis-container">
          <div className="matchup-detail-top-nav">
            <Link to={`/mlb-schedule/${gameId}`} className="back-link">‹ Back to Matchup Detail</Link>
          </div>
          <div className="analysis-loading">
            <div className="analysis-loading-spinner" />
            <p>Loading analysis…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !game) {
    return (
      <div className="matchup-analysis-page">
        <div className="analysis-container">
          <div className="matchup-detail-top-nav">
            <Link to={`/mlb-schedule/${gameId}`} className="back-link">‹ Back to Matchup Detail</Link>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '3rem', textAlign: 'center' }}>
            {error || 'Could not load this matchup.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Derived values ──
  const awayAbbr  = getAbbr(game.away_team_id) || game.away_team_name;
  const homeAbbr  = getAbbr(game.home_team_id) || game.home_team_name;
  const awayMlbId = getMlbId(game.away_team_id);
  const homeMlbId = getMlbId(game.home_team_id);

  const awayVsHand   = awaySplits;
  const awayHomeRoad = awayHomeRoadSplits;
  const homeVsHand   = homeSplits;
  const homeHomeRoad = homeHomeRoadSplits;
  const awaySPVsHand   = awaySPVsHandSplits;
  const awaySPHomeRoad = awaySPHomeRoadSplits;
  const homeSPVsHand   = homeSPVsHandSplits;
  const homeSPHomeRoad = homeSPHomeRoadSplits;
  // null = still fetching (skeleton); false = unavailable; array = real insights
  const insights = (awaySplitLeaders === null || homeSplitLeaders === null)
    ? null
    : buildInsights(
        awaySplitLeaders === false ? [] : awaySplitLeaders,
        homeSplitLeaders === false ? [] : homeSplitLeaders,
        awayAbbr, homeAbbr, awayMlbId, homeMlbId, awaySPThrows, homeSPThrows
      );

  return (
    <div className="matchup-analysis-page">
      <div className="analysis-container">

        {/* Back link */}
        <div className="matchup-detail-top-nav">
          <Link to={`/mlb-schedule/${gameId}`} state={{ game }} className="back-link">
            ‹ Back to Matchup Detail
          </Link>
        </div>

        {/* A. Mini Hero */}
        <MiniHero game={game} />

        {/* B. Starting Pitcher Splits */}
        <div className="analysis-section">
          <div className="analysis-section-title">Starting Pitcher Splits</div>
          <div className="analysis-two-col">
            <PitcherSplitCard
              abbr={awayAbbr}
              mlbId={awayMlbId}
              side="Away"
              spName={game.away_sp_name || null}
              spThrows={awaySPThrows}
              vsHandSplits={awaySPVsHand}
              homeRoadSplits={awaySPHomeRoad}
            />
            <PitcherSplitCard
              abbr={homeAbbr}
              mlbId={homeMlbId}
              side="Home"
              spName={game.home_sp_name || null}
              spThrows={homeSPThrows}
              vsHandSplits={homeSPVsHand}
              homeRoadSplits={homeSPHomeRoad}
            />
          </div>
        </div>

        {/* C. Key Insights */}
        <div className="analysis-section">
          <div className="analysis-section-title">Key Matchup Insights</div>
          <InsightsPanel insights={insights} />
        </div>

        {/* D. Offensive Splits */}
        <div className="analysis-section">
          <div className="analysis-section-title">Offensive Splits</div>
          <div className="analysis-two-col">
            <SplitCompareCard
              abbr={awayAbbr}
              mlbId={awayMlbId}
              side="Away"
              opposingThrows={homeSPThrows}
              vsHandSplits={awayVsHand}
              homeRoadSplits={awayHomeRoad}
            />
            <SplitCompareCard
              abbr={homeAbbr}
              mlbId={homeMlbId}
              side="Home"
              opposingThrows={awaySPThrows}
              vsHandSplits={homeVsHand}
              homeRoadSplits={homeHomeRoad}
            />
          </div>
        </div>

        {/* E. Top Batters This Week */}
        <div className="analysis-section">
          <TopBattersCard
            awayAbbr={awayAbbr}
            homeAbbr={homeAbbr}
            awayMlbId={awayMlbId}
            homeMlbId={homeMlbId}
            awayData={awayHotLeaders}
            homeData={homeHotLeaders}
          />
        </div>

        {/* F. H2H Pitcher History */}
        <div className="analysis-section">
          <div className="analysis-section-title">Head-to-Head Pitcher History</div>
          {h2hPitchers === null ? (
            <div className="analysis-two-col">
              {[0, 1].map(i => (
                <div key={i} className="h2h-card">
                  {[80, 65, 70, 55, 60].map((w, j) => (
                    <div key={j} className="split-skeleton-row analysis-skeleton" style={{ width: `${w}%`, marginBottom: '0.5rem' }} />
                  ))}
                </div>
              ))}
            </div>
          ) : h2hPitchers === false ? (
            <div className="split-unavailable">No head-to-head pitcher data available</div>
          ) : (
            <div className="analysis-two-col">
              <H2HPitchersCard
                abbr={awayAbbr}
                mlbId={awayMlbId}
                oppAbbr={homeAbbr}
                players={h2hPitchers.team_a}
                spName={game.away_sp_name || null}
                gameCount={h2hPitchers.game_count}
              />
              <H2HPitchersCard
                abbr={homeAbbr}
                mlbId={homeMlbId}
                oppAbbr={awayAbbr}
                players={h2hPitchers.team_b}
                spName={game.home_sp_name || null}
                gameCount={h2hPitchers.game_count}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
