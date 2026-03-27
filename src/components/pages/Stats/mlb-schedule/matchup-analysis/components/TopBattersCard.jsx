import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logoUrl, headshotUrl } from '../../utils';

const HOT_METRICS = [
  { key: 'home_runs', label: 'HR'   },
  { key: 'hits',      label: 'Hits' },
  { key: 'rbis',      label: 'RBI'  },
  { key: 'runs',      label: 'Runs' },
  { key: 'walks',     label: 'BB'   },
];

function GameSparkbar({ games }) {
  if (!games?.length) return null;
  const sorted = [...games].reverse();
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

export default function TopBattersCard({ awayAbbr, homeAbbr, awayMlbId, homeMlbId, awayData, awayDataSeason, homeData, homeDataSeason }) {
  const [activeTeam,   setActiveTeam]   = useState('away');
  const [activeMetric, setActiveMetric] = useState('home_runs');

  const data         = activeTeam === 'away' ? awayData      : homeData;
  const activeSeason = activeTeam === 'away' ? awayDataSeason : homeDataSeason;
  const isLoading    = data === null;
  const isUnavail    = data === false;
  const players      = (!isLoading && !isUnavail && data?.[activeMetric]) ? data[activeMetric] : [];
  const teamMlbId    = activeTeam === 'away' ? awayMlbId : homeMlbId;

  return (
    <div className="top-batters-card">
      <div className="top-batters-header">
        <div className="top-batters-title">
          {teamMlbId && <img src={logoUrl(teamMlbId)} alt="" className="top-batters-logo" />}
          Top Batters This Week
          {activeSeason && (
            <span className="sp-fallback-season-badge">{activeSeason} Stats</span>
          )}
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

      {isLoading ? (
        <div className="top-batters-rows">
          {[1, 2, 3].map(i => (
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
                <Link to={`/player/${p.player_mlb_id}`} className="top-batter-name" onClick={() => window.scrollTo(0, 0)}>
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
