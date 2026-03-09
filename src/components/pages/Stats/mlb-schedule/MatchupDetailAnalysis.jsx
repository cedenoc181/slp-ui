import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getMlbId, getAbbr, logoUrl, fmtDate, mapSeasonType } from './utils';
import scheduleService from '../../../../data/services/scheduleService';
import teamStatsService from '../../../../data/services/teamStatsService';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import playerStatsService from '../../../../data/services/playerStatsServices';
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
  const awayMlbId = getMlbId(game.away_team_id);
  const homeMlbId = getMlbId(game.home_team_id);
  const awayAbbr  = getAbbr(game.away_team_id) || game.away_team_name;
  const homeAbbr  = getAbbr(game.home_team_id) || game.home_team_name;

  const statusLower = (game.status || '').toLowerCase();
  const isFinal  = statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed' || statusLower === 'completed early';
  const isLive   = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');
  const badgeClass = isFinal ? 'final' : isLive ? 'live' : 'scheduled';
  const badgeLabel = isFinal ? 'Final' : isLive ? '● Live' : 'Scheduled';

  const dateLabel = fmtDate(game.date);
  const timeLabel = game.game_time ? ` · ${game.game_time}` : '';

  return (
    <div className="analysis-mini-hero">
      <div className="hero-teams-row">
        <div className="hero-team-block">
          {awayMlbId && <img src={logoUrl(awayMlbId)} alt={awayAbbr} className="hero-team-logo" />}
          <span className="hero-team-abbr">{awayAbbr}</span>
          <span className="hero-team-record">Away</span>
        </div>

        <div className="hero-separator">
          <span className="hero-at-sign">@</span>
        </div>

        <div className="hero-team-block home-block">
          {homeMlbId && <img src={logoUrl(homeMlbId)} alt={homeAbbr} className="hero-team-logo" />}
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
        const playerSlug = leader.player_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
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

function SplitCompareCard({ abbr, mlbId, side, vsHandSplits, homeRoadSplits }) {
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
            <div className="split-col-header">{labelA}</div>
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
            <div className="split-col-header">{labelB}</div>
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

function PitcherSplitCard({ abbr, mlbId, spName, spThrows, vsHandSplits, homeRoadSplits }) {
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

  // Detect exploitable split: road ERA > home ERA by threshold
  const eraHome = atHome?.era, eraRoad = onRoad?.era;
  const isExploitable = eraHome != null && eraRoad != null && (parseFloat(eraRoad) - parseFloat(eraHome)) > 0.75;

  return (
    <div className="pitcher-split-card">
      <div className="pitcher-split-header">
        <div className="pitcher-split-identity">
          {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="pitcher-split-logo" />}
          <div>
            <div className="pitcher-split-name">
              {hasSP ? spName : 'TBD'}
              {isExploitable && tab === 'location' && (
                <span className="exploitable-tag">Exploitable</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{abbr} SP</span>
              {throwsLabel && (
                <span className={`sp-handedness-badge ${badgeClass}`}>{throwsLabel[0]}</span>
              )}
            </div>
          </div>
        </div>
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
            <div className="split-col-header">{labelA}</div>
            {isLoading ? <SkeletonSplitRows /> : statDefs.map(({ label, keyA, lowerBetter, dec }) => {
              const valA = colAData?.[keyA];
              const valB = colBData?.[keyA];
              const { aClass } = pitcherAdvantage(valA, valB, lowerBetter);
              return (
                <div key={label} className="split-stat-row">
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${aClass}`}>{fmtSplit(valA, dec)}</span>
                </div>
              );
            })}
          </div>

          <div className="split-divider" />

          <div className="split-col">
            <div className="split-col-header">{labelB}</div>
            {isLoading ? <SkeletonSplitRows /> : statDefs.map(({ label, keyA, lowerBetter, dec }) => {
              const valA = colAData?.[keyA];
              const valB = colBData?.[keyA];
              const { bClass } = pitcherAdvantage(valA, valB, lowerBetter);
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

  const [awaySplitLeaders, setAwaySplitLeaders] = useState(null);
  const [homeSplitLeaders, setHomeSplitLeaders] = useState(null);

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

  // Offensive splits — vs L/R from getTeamBattingStats; home/road not in this endpoint (skeleton).
  // SP splits still pending API wiring.
  const awayVsHand     = awaySplits;
  const awayHomeRoad   = false; // not available from getTeamBattingStats
  const homeVsHand     = homeSplits;
  const homeHomeRoad   = false; // not available from getTeamBattingStats
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

        {/* B. Key Insights */}
        <div className="analysis-section">
          <div className="analysis-section-title">Key Matchup Insights</div>
          <InsightsPanel insights={insights} />
        </div>

        {/* C. Team Batting Splits */}
        <div className="analysis-section">
          <div className="analysis-section-title">Offensive Splits</div>
          <div className="analysis-two-col">
            <SplitCompareCard
              abbr={awayAbbr}
              mlbId={awayMlbId}
              side="Away"
              vsHandSplits={awayVsHand}
              homeRoadSplits={awayHomeRoad}
            />
            <SplitCompareCard
              abbr={homeAbbr}
              mlbId={homeMlbId}
              side="Home"
              vsHandSplits={homeVsHand}
              homeRoadSplits={homeHomeRoad}
            />
          </div>
        </div>

        {/* D. Starting Pitcher Deep Dive */}
        <div className="analysis-section">
          <div className="analysis-section-title">Starting Pitcher Splits</div>
          <div className="analysis-two-col">
            <PitcherSplitCard
              abbr={awayAbbr}
              mlbId={awayMlbId}
              spName={game.away_sp_name || null}
              spThrows={awaySPThrows}
              vsHandSplits={awaySPVsHand}
              homeRoadSplits={awaySPHomeRoad}
            />
            <PitcherSplitCard
              abbr={homeAbbr}
              mlbId={homeMlbId}
              spName={game.home_sp_name || null}
              spThrows={homeSPThrows}
              vsHandSplits={homeSPVsHand}
              homeRoadSplits={homeSPHomeRoad}
            />
          </div>
        </div>

        {/* E. Edge Indicators */}
        <div className="analysis-section">
          <div className="analysis-section-title">Matchup Edge</div>
          <EdgeIndicators
            awayAbbr={awayAbbr}
            homeAbbr={homeAbbr}
            awayBatting={null}
            homeBatting={null}
            awayPitching={null}
            homePitching={null}
          />
        </div>

      </div>
    </div>
  );
}
