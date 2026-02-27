import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtIP, toNameSlug } from '../utils';

function PlayerLink({ name, season }) {
  const slug = toNameSlug(name);
  if (!slug || !name) return <span>{name ?? '—'}</span>;
  
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <Link 
      to={`/player/${slug}?season=${season}`} 
      className="lineup-player-link"
      onClick={handleClick}
    >
      {name}
    </Link>
  );
}

function maxIdx(arr, key) {
  let best = -Infinity, idx = -1;
  arr.forEach((p, i) => {
    const v = p[key] ?? -Infinity;
    if (v > best) { best = v; idx = i; }
  });
  return best > 0 ? idx : -1;
}

function maxIdxStarters(arr, key) {
  let best = -Infinity, idx = -1;
  arr.forEach((p, i) => {
    if (!p.is_starter) return;
    const v = p[key] ?? -Infinity;
    if (v > best) { best = v; idx = i; }
  });
  return best > 0 ? idx : -1;
}

function minIdxStarters(arr, key) {
  let best = Infinity, idx = -1;
  arr.forEach((p, i) => {
    if (!p.is_starter) return;
    const v = p[key];
    if (v == null) return;
    if (v < best) { best = v; idx = i; }
  });
  return idx;
}

export default function LineupCard({ abbr, batters, pitchers, season }) {
  const [tab, setTab] = useState('batters');

  const sortedBatters = [...batters]
    .filter(p => (p.plate_appearances ?? 0) > 0)
    .sort((a, b) => (b.plate_appearances ?? 0) - (a.plate_appearances ?? 0));
  const sortedPitchers = [...pitchers]
    .sort((a, b) => (b.innings_pitched ?? 0) - (a.innings_pitched ?? 0))
    .sort((a, b) => (b.is_starter ? 1 : 0) - (a.is_starter ? 1 : 0));

  const rows = tab === 'batters' ? sortedBatters : sortedPitchers;

  const hrLeader  = maxIdx(sortedBatters, 'home_runs');
  const hitLeader = maxIdx(sortedBatters, 'hits');
  const rbiLeader = maxIdx(sortedBatters, 'rbis');

  const spKLeader  = maxIdxStarters(sortedPitchers, 'strikeouts');
  const spERLeader = minIdxStarters(sortedPitchers, 'earned_runs');
  const spQSSet    = new Set(
    sortedPitchers.reduce((acc, p, i) => {
      if (p.is_starter && (p.innings_pitched ?? 0) >= 6) acc.push(i);
      return acc;
    }, [])
  );

  return (
    <div className="detail-card lineup-card">
      <div className="lineup-card-header">
        <h3 className="card-title">{abbr} Players</h3>
        <div className="lineup-toggle">
          <button className={`lineup-tab${tab === 'batters'  ? ' active' : ''}`} onClick={() => setTab('batters')}>Batters</button>
          <button className={`lineup-tab${tab === 'pitchers' ? ' active' : ''}`} onClick={() => setTab('pitchers')}>Pitchers</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="lineup-empty">No data</p>
      ) : tab === 'batters' ? (
        <div className="lineup-table-wrap">
          <table className="lineup-table">
            <thead>
              <tr>
                <th className="lineup-th-name">Player</th>
                <th>PA</th><th>H</th><th>HR</th><th>RBI</th><th>BB</th><th>K</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={i}>
                  <td className="lineup-name">
                    <PlayerLink name={p.player_name} season={season} />
                  </td>
                  <td>{p.plate_appearances ?? '—'}</td>
                  <td className={i === hitLeader ? 'lineup-stat-leader' : ''}>{p.hits ?? '—'}</td>
                  <td className={i === hrLeader  ? 'lineup-stat-leader' : ''}>{p.home_runs ?? '—'}</td>
                  <td className={i === rbiLeader ? 'lineup-stat-leader' : ''}>{p.rbis ?? '—'}</td>
                  <td>{p.walks ?? '—'}</td>
                  <td>{p.strikeouts ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="lineup-table-wrap">
          <table className="lineup-table">
            <thead>
              <tr>
                <th className="lineup-th-name">Player</th>
                <th>G</th><th>IP</th><th>H</th><th>ER</th><th>K</th><th>BB</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={i}>
                  <td className={`lineup-name${p.is_starter ? ' lineup-starter' : ''}`}>
                    <PlayerLink name={p.player_name} season={season} />
                  </td>
                  <td>{p._g ?? '—'}</td>
                  <td className={spQSSet.has(i) ? 'lineup-stat-leader' : ''}>{fmtIP(p.innings_pitched)}</td>
                  <td>{p.hits_allowed ?? '—'}</td>
                  <td className={i === spERLeader ? 'lineup-stat-leader' : ''}>{p.earned_runs ?? '—'}</td>
                  <td className={i === spKLeader  ? 'lineup-stat-leader' : ''}>{p.strikeouts ?? '—'}</td>
                  <td>{p.walks ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
