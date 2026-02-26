import { useState } from 'react';
import { fmt } from '../utils';

const BATTING_ROWS = [
  { label: 'AVG',  key: 'avg',              decimals: 3 },
  { label: 'OBP',  key: 'obp',              decimals: 3 },
  { label: 'SLG',  key: 'slg',              decimals: 3 },
  { label: 'OPS',  key: 'ops',              decimals: 3 },
  { label: 'R',    key: 'runs' },
  { label: 'H',    key: 'hits' },
  { label: 'HR',   key: 'home_runs' },
  { label: 'RBI',  key: 'rbis' },
  { label: 'SB',   key: 'stolen_bases' },
  { label: 'BB',   key: 'walks' },
  { label: 'K',    key: 'strikeouts' },
];

const PITCHING_ROWS = [
  { label: 'ERA',  key: 'era',               decimals: 2 },
  { label: 'WHIP', key: 'whip',              decimals: 2 },
  { label: 'W',    key: 'wins' },
  { label: 'L',    key: 'losses' },
  { label: 'SV',   key: 'saves' },
  { label: 'IP',   key: 'innings_pitched',   decimals: 1 },
  { label: 'K',    key: 'strikeouts' },
  { label: 'BB',   key: 'walks' },
  { label: 'HR',   key: 'home_runs_allowed' },
];

export default function TeamStatsCard({ abbr, batting, pitching }) {
  const [tab, setTab] = useState('batting');
  const stats = tab === 'batting' ? batting : pitching;
  const rows  = tab === 'batting' ? BATTING_ROWS : PITCHING_ROWS;

  return (
    <div className="detail-card team-stats-card">
      <div className="lineup-card-header">
        <h3 className="card-title">{abbr} Stats</h3>
        <div className="lineup-toggle">
          <button className={`lineup-tab${tab === 'batting'  ? ' active' : ''}`} onClick={() => setTab('batting')}>Batting</button>
          <button className={`lineup-tab${tab === 'pitching' ? ' active' : ''}`} onClick={() => setTab('pitching')}>Pitching</button>
        </div>
      </div>
      <div className="team-stats-body">
        {rows.map(({ label, key, decimals }) => {
          const val = stats?.[key];
          const display = val != null
            ? (decimals != null ? fmt(val, decimals) : String(val))
            : '—';
          return (
            <div key={label} className="team-stat-row">
              <span className="team-stat-label">{label}</span>
              <span className="team-stat-value">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
