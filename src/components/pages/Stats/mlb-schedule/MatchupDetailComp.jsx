import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getMlbId, getAbbr, logoUrl, fmtDate, mapSeasonType } from './utils';
import scheduleService from '../../../../data/services/scheduleService';
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
        <div key={i} className={`insight-card insight-card--${ins.type}`}>
          <span className="insight-icon">{ins.icon}</span>
          <div className="insight-body">
            <div className="insight-headline">{ins.headline}</div>
            <div className="insight-detail">{ins.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Split Compare Card (team batting) ────────────────────────────────────────
const BATTING_SPLIT_STATS = [
  { label: 'AVG',  keyHand: ['avg',       'avg'],       keyLoc: ['avg',       'avg'],       dec: 3 },
  { label: 'OPS',  keyHand: ['ops',       'ops'],       keyLoc: ['ops',       'ops'],       dec: 3 },
  { label: 'OBP',  keyHand: ['obp',       'obp'],       keyLoc: ['obp',       'obp'],       dec: 3 },
  { label: 'SLG',  keyHand: ['slg',       'slg'],       keyLoc: ['slg',       'slg'],       dec: 3 },
  { label: 'HR',   keyHand: ['home_runs', 'home_runs'], keyLoc: ['home_runs', 'home_runs'], dec: 0 },
  { label: 'RBI',  keyHand: ['rbis',      'rbis'],      keyLoc: ['rbis',      'rbis'],      dec: 0 },
];

function fmtSplit(val, dec) {
  if (val == null) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (dec === 3) return n.toFixed(3).replace(/^0/, '');
  return dec === 0 ? Math.round(n).toString() : n.toFixed(dec);
}

// Compare two numeric values; higher = better for batting
function advantage(a, b) {
  if (a == null || b == null) return { aClass: '', bClass: '' };
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb) || na === nb) return { aClass: '', bClass: '' };
  return na > nb
    ? { aClass: 'advantage', bClass: 'disadvantage' }
    : { aClass: 'disadvantage', bClass: 'advantage' };
}

function SplitCompareCard({ abbr, mlbId, side, vsHandSplits, homeRoadSplits }) {
  const [tab, setTab] = useState('hand'); // 'hand' | 'location'

  const isLoading = !vsHandSplits && !homeRoadSplits;
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

      <div className="split-cols">
        {/* Column A */}
        <div className="split-col">
          <div className="split-col-header">{labelA}</div>
          {isLoading ? <SkeletonSplitRows /> : BATTING_SPLIT_STATS.map(({ label, keyHand, keyLoc, dec }) => {
            const key = tab === 'hand' ? keyHand[0] : keyLoc[0];
            const valA = colA?.[key];
            const valB = colB?.[key];
            const { aClass } = advantage(valA, valB);
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
          {isLoading ? <SkeletonSplitRows /> : BATTING_SPLIT_STATS.map(({ label, keyHand, keyLoc, dec }) => {
            const key = tab === 'hand' ? keyHand[1] : keyLoc[1];
            const valA = colA?.[tab === 'hand' ? keyHand[0] : keyLoc[0]];
            const valB = colB?.[key];
            const { bClass } = advantage(valA, valB);
            return (
              <div key={label} className="split-stat-row">
                <span className="split-stat-label">{label}</span>
                <span className={`split-stat-value ${bClass}`}>{fmtSplit(valB, dec)}</span>
              </div>
            );
          })}
        </div>
      </div>
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

  const hasSP   = !!spName;
  const isLoading = hasSP && !vsHandSplits && !homeRoadSplits;
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

  // Pass null for all splits — API wiring is the follow-up task.
  // Sections render skeleton states automatically when data is null.
  const awayVsHand     = null;
  const awayHomeRoad   = null;
  const homeVsHand     = null;
  const homeHomeRoad   = null;
  const awaySPVsHand   = null;
  const awaySPHomeRoad = null;
  const homeSPVsHand   = null;
  const homeSPHomeRoad = null;
  const insights       = null; // null = skeleton; [] = empty; array = real

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
              spThrows={state?.awaySPThrows ?? null}
              vsHandSplits={awaySPVsHand}
              homeRoadSplits={awaySPHomeRoad}
            />
            <PitcherSplitCard
              abbr={homeAbbr}
              mlbId={homeMlbId}
              spName={game.home_sp_name || null}
              spThrows={state?.homeSPThrows ?? null}
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
