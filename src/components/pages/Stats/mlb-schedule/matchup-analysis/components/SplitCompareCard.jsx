import { useState } from 'react';
import { logoUrl } from '../../utils';
import { SkeletonSplitRows } from './Skeletons';
import { fmtSplit, advantage } from '../utils/analysisUtils';

// 4-year combined MLB league averages for color-coding
const LEAGUE_AVG = { AVG: 0.245, OBP: 0.315, SLG: 0.403, OPS: 0.718 };

function leagueAvgClass(val, leagueAvg) {
  const n = parseFloat(val);
  if (isNaN(n) || leagueAvg == null) return '';
  if (n >= leagueAvg * 1.10) return 'lg-above';
  if (n < leagueAvg * 0.90)  return 'lg-below';
  return 'lg-avg';
}

const BATTING_SPLIT_STATS = [
  { label: 'AVG',  keyHand: ['avg',        'avg'],        keyLoc: ['avg',        'avg'],        dec: 3, leagueAvg: LEAGUE_AVG.AVG },
  { label: 'OPS',  keyHand: ['ops',        'ops'],        keyLoc: ['ops',        'ops'],        dec: 3, leagueAvg: LEAGUE_AVG.OPS },
  { label: 'OBP',  keyHand: ['obp',        'obp'],        keyLoc: ['obp',        'obp'],        dec: 3, leagueAvg: LEAGUE_AVG.OBP },
  { label: 'SLG',  keyHand: ['slg',        'slg'],        keyLoc: ['slg',        'slg'],        dec: 3, leagueAvg: LEAGUE_AVG.SLG },
  { label: 'HR',   keyHand: ['homeruns',   'homeruns'],   keyLoc: ['homeruns',   'homeruns'],   dec: 0 },
  { label: 'RBI',  keyHand: ['rbis',       'rbis'],       keyLoc: ['rbis',       'rbis'],       dec: 0 },
  { label: 'K',    keyHand: ['strikeouts', 'strikeouts'], keyLoc: ['strikeouts', 'strikeouts'], dec: 0, lowerBetter: true },
];

export default function SplitCompareCard({ abbr, mlbId, side, opposingThrows, vsHandSplits, homeRoadSplits }) {
  const [tab, setTab] = useState('hand'); // 'hand' | 'location'

  const isLoading     = tab === 'hand' ? vsHandSplits   === null : homeRoadSplits === null;
  const isUnavailable = tab === 'hand' ? vsHandSplits   === false : homeRoadSplits === false;
  const vsLeft  = vsHandSplits?.vs_lhp  ?? vsHandSplits?.[0]?.vs_lhp  ?? null;
  const vsRight = vsHandSplits?.vs_rhp  ?? vsHandSplits?.[0]?.vs_rhp  ?? null;
  const atHome  = homeRoadSplits?.at_home ?? homeRoadSplits?.[0]?.at_home ?? null;
  const onRoad  = homeRoadSplits?.on_road ?? homeRoadSplits?.[0]?.on_road ?? null;

  const colA   = tab === 'hand' ? vsLeft  : atHome;
  const colB   = tab === 'hand' ? vsRight : onRoad;
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
          <div className="split-col">
            <div className={`split-col-header${
              (tab === 'location' && side === 'Home') ||
              (tab === 'hand' && opposingThrows?.toUpperCase() === 'L')
                ? ' split-col-header--context' : ''
            }`}>{labelA}</div>
            {isLoading ? <SkeletonSplitRows /> : BATTING_SPLIT_STATS.map(({ label, keyHand, keyLoc, dec, lowerBetter, leagueAvg }) => {
              const key = tab === 'hand' ? keyHand[0] : keyLoc[0];
              const valA = colA?.[key];
              const valB = colB?.[key];
              const colorClass = leagueAvg != null ? leagueAvgClass(valA, leagueAvg) : advantage(valA, valB, lowerBetter).aClass;
              return (
                <div key={label} className="split-stat-row">
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${colorClass}`}>{fmtSplit(valA, dec)}</span>
                </div>
              );
            })}
          </div>

          <div className="split-divider" />

          <div className="split-col">
            <div className={`split-col-header${
              (tab === 'location' && side === 'Away') ||
              (tab === 'hand' && opposingThrows?.toUpperCase() === 'R')
                ? ' split-col-header--context' : ''
            }`}>{labelB}</div>
            {isLoading ? <SkeletonSplitRows /> : BATTING_SPLIT_STATS.map(({ label, keyHand, keyLoc, dec, lowerBetter, leagueAvg }) => {
              const key = tab === 'hand' ? keyHand[1] : keyLoc[1];
              const valA = colA?.[tab === 'hand' ? keyHand[0] : keyLoc[0]];
              const valB = colB?.[key];
              const colorClass = leagueAvg != null ? leagueAvgClass(valB, leagueAvg) : advantage(valA, valB, lowerBetter).bClass;
              return (
                <div key={label} className="split-stat-row">
                  <span className="split-stat-label">{label}</span>
                  <span className={`split-stat-value ${colorClass}`}>{fmtSplit(valB, dec)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
