import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logoUrl, headshotUrl } from '../../utils';
import { SkeletonSplitRows } from './Skeletons';
import { fmtSplit } from '../utils/analysisUtils';

const PITCHER_HAND_STATS = [
  { label: 'Opp AVG', keyA: 'avg',      dec: 3, lowerBetter: true },
  { label: 'Opp OPS', keyA: 'ops',      dec: 3, lowerBetter: true },
  { label: 'K/9',     keyA: 'k_per_9',  dec: 1, lowerBetter: false },
  { label: 'HR/9',    keyA: 'hr_per_9', dec: 2, lowerBetter: true },
  { label: 'WHIP',    keyA: 'whip',     dec: 2, lowerBetter: true },
];

const PITCHER_LOC_STATS = [
  { label: 'ERA',  keyA: 'era',             dec: 2, lowerBetter: true },
  { label: 'WHIP', keyA: 'whip',            dec: 2, lowerBetter: true },
  { label: 'K/9',  keyA: 'k_per_9',         dec: 1, lowerBetter: false },
  { label: 'IP',   keyA: 'innings_pitched', dec: 1, lowerBetter: false },
  { label: 'BB',   keyA: 'walks_allowed',   dec: 0, lowerBetter: true },
];

// Absolute thresholds — each value is evaluated independently, not relative to the other column
const STAT_THRESHOLDS = {
  avg:             { good: 0.230, bad: 0.280, lowerBetter: true  },
  ops:             { good: 0.680, bad: 0.780, lowerBetter: true  },
  k_per_9:         { good: 8.5,  bad: 6.0,   lowerBetter: false },
  hr_per_9:        { good: 0.9,  bad: 1.3,   lowerBetter: true  },
  whip:            { good: 1.20, bad: 1.45,  lowerBetter: true  },
  era:             { good: 3.50, bad: 4.50,  lowerBetter: true  },
  walks_allowed:   { good: 2.0,  bad: 4.0,   lowerBetter: true  },
  innings_pitched: null, // informational only
};

function statClass(value, keyA) {
  const t = STAT_THRESHOLDS[keyA];
  if (!t || value == null) return '';
  const n = parseFloat(value);
  if (isNaN(n)) return '';
  if (t.lowerBetter) {
    if (n <= t.good) return 'advantage';
    if (n >= t.bad)  return 'disadvantage';
  } else {
    if (n >= t.good) return 'advantage';
    if (n <= t.bad)  return 'disadvantage';
  }
  return '';
}

function handednessLabel(throws) {
  if (!throws) return null;
  return throws.toUpperCase() === 'L' ? 'LHP' : 'RHP';
}

export default function PitcherSplitCard({ abbr, mlbId, spPlayerId, side, spName, spThrows, vsHandSplits, vsHandSeason, homeRoadSplits, homeRoadSeason }) {
  const [tab, setTab] = useState('location'); // 'location' | 'hand'

  const hasSP = !!spName;
  const isLoading     = hasSP && (tab === 'location' ? homeRoadSplits === null : vsHandSplits === null);
  const isUnavailable = hasSP && (tab === 'location' ? homeRoadSplits === false : vsHandSplits === false);
  const throwsLabel = handednessLabel(spThrows);
  const badgeClass  = !throwsLabel ? 'tbd' : spThrows.toUpperCase() === 'L' ? 'lhp' : 'rhp';

  const vsLeft  = vsHandSplits?.vs_lhb  ?? vsHandSplits?.[0]?.vs_lhb  ?? null;
  const vsRight = vsHandSplits?.vs_rhb  ?? vsHandSplits?.[0]?.vs_rhb  ?? null;
  const atHome  = homeRoadSplits?.at_home ?? homeRoadSplits?.[0]?.at_home ?? null;
  const onRoad  = homeRoadSplits?.on_road ?? homeRoadSplits?.[0]?.on_road ?? null;

  const activeSeason = tab === 'location' ? homeRoadSeason : vsHandSeason;

  const statDefs = tab === 'location' ? PITCHER_LOC_STATS : PITCHER_HAND_STATS;
  const colAData = tab === 'location' ? atHome  : vsLeft;
  const colBData = tab === 'location' ? onRoad  : vsRight;
  const labelA   = tab === 'location' ? 'At Home' : 'vs LHB';
  const labelB   = tab === 'location' ? 'On Road' : 'vs RHB';

  const contextSplit   = side === 'Away' ? onRoad : atHome;
  const contextERA     = contextSplit?.era  != null ? parseFloat(contextSplit.era)  : null;
  const contextWHIP    = contextSplit?.whip != null ? parseFloat(contextSplit.whip) : null;
  const isRunRisk      = contextERA  != null && contextERA  > 4.00;
  const isHeavyTraffic = contextWHIP != null && contextWHIP > 1.50;

  const handContextSplit = spThrows?.toUpperCase() === 'R' ? vsLeft
    : spThrows?.toUpperCase() === 'L' ? vsRight : null;
  const handOppAVG    = handContextSplit?.avg != null ? parseFloat(handContextSplit.avg) : null;
  const handOppOPS    = handContextSplit?.ops != null ? parseFloat(handContextSplit.ops) : null;
  const isContactRisk = handOppAVG != null && handOppAVG > 0.300;
  const isPowerThreat = handOppOPS != null && handOppOPS > 0.900;

  const locBadges  = (isRunRisk && isHeavyTraffic)
    ? ['Exploitable']
    : [isRunRisk && 'Run Risk', isHeavyTraffic && 'Heavy Traffic'].filter(Boolean);
  const handBadges = (isContactRisk && isPowerThreat)
    ? ['Exploitable']
    : [isContactRisk && 'Contact Risk', isPowerThreat && 'Power Threat'].filter(Boolean);
  const activeBadges = tab === 'location' ? locBadges : handBadges;

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
          {spPlayerId && (
            <img src={headshotUrl(spPlayerId)} alt={spName || 'SP'} className="pitcher-split-headshot" onError={e => { e.target.style.display = 'none'; }} />
          )}
          <div>
            {hasSP && spPlayerId
              ? <Link to={`/player/${spPlayerId}`} className="pitcher-split-name" onClick={() => window.scrollTo(0, 0)}>{spName}</Link>
              : <div className="pitcher-split-name">{hasSP ? spName : 'TBD'}</div>
            }
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{abbr} SP</span>
              {throwsLabel && (
                <span className={`sp-handedness-badge ${badgeClass}`}>{throwsLabel[0]}</span>
              )}
            </div>
          </div>
        </div>
        {hasSP && activeSeason && (
          <span className="sp-fallback-season-badge">{activeSeason} Stats</span>
        )}
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
            {isLoading ? <SkeletonSplitRows /> : statDefs.map(({ label, keyA, dec }) => {
              const valA = colAData?.[keyA];
              const flagged = isContextColA && !!flaggedKeys[keyA];
              return (
                <div key={label} className={`split-stat-row${flagged ? ' split-stat-row--flagged' : ''}`}>
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${statClass(valA, keyA)}`}>{fmtSplit(valA, dec)}</span>
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
            {isLoading ? <SkeletonSplitRows /> : statDefs.map(({ label, keyA, dec }) => {
              const valB = colBData?.[keyA];
              const flagged = isContextColB && !!flaggedKeys[keyA];
              return (
                <div key={label} className={`split-stat-row${flagged ? ' split-stat-row--flagged' : ''}`}>
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${statClass(valB, keyA)}`}>{fmtSplit(valB, dec)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
