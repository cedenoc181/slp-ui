import { useState } from 'react';
import { logoUrl } from '../../utils';
import { SkeletonSplitRows } from './Skeletons';
import { fmtSplit, advantage } from '../utils/analysisUtils';

const BATTING_SPLIT_STATS = [
  { label: 'AVG',  keyHand: ['avg',        'avg'],        keyLoc: ['avg',        'avg'],        dec: 3 },
  { label: 'OPS',  keyHand: ['ops',        'ops'],        keyLoc: ['ops',        'ops'],        dec: 3 },
  { label: 'OBP',  keyHand: ['obp',        'obp'],        keyLoc: ['obp',        'obp'],        dec: 3 },
  { label: 'SLG',  keyHand: ['slg',        'slg'],        keyLoc: ['slg',        'slg'],        dec: 3 },
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
