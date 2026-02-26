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

export default function LineupCard({ abbr, batters, pitchers, season }) {
  const [tab, setTab] = useState('batters');

  const sortedBatters = [...batters].sort((a, b) => (b.plate_appearances ?? 0) - (a.plate_appearances ?? 0));
  const sortedPitchers = [...pitchers]
    .sort((a, b) => (b.innings_pitched ?? 0) - (a.innings_pitched ?? 0))
    .sort((a, b) => (b.is_starter ? 1 : 0) - (a.is_starter ? 1 : 0));

  const rows = tab === 'batters' ? sortedBatters : sortedPitchers;

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
                  <td>{p.hits ?? '—'}</td>
                  <td>{p.home_runs ?? '—'}</td>
                  <td>{p.rbis ?? '—'}</td>
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
                  <td>{fmtIP(p.innings_pitched)}</td>
                  <td>{p.hits_allowed ?? '—'}</td>
                  <td>{p.earned_runs ?? '—'}</td>
                  <td>{p.strikeouts ?? '—'}</td>
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
