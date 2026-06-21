import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { headshotUrl, logoUrl } from '../../utils';
import gamesService from '../../../../../../data/services/gamesService';

function fmtLogDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${m}-${d}-${y?.slice(2)}`;
}

function fmtAvg(val) {
  if (val == null) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n >= 1 ? n.toFixed(3) : n.toFixed(3).replace(/^0/, '');
}

function H2HBatterRow({ player, onClick, leadsAvg, leadsOPS, leadsHits, leadsHR }) {
  const avg = fmtAvg(player.avg);
  const ops = fmtAvg(player.ops);
  const hr  = player.home_runs     != null ? player.home_runs     : '—';
  const rbi = player.rbis          != null ? player.rbis          : '—';
  const tb  = player.total_bases   != null ? player.total_bases   : '—';
  const k   = player.strikeouts    != null ? player.strikeouts    : '—';
  const badges = [leadsAvg && 'AVG', leadsOPS && 'OPS', leadsHits && 'H', leadsHR && 'HR'].filter(Boolean);
  const badgeTip = {
    AVG: 'Batting Average leader (H/AB)',
    OPS: 'On-base Plus Slugging leader',
    H:   'Hits leader',
    HR:  'Home Runs leader',
  };

  return (
    <div
      className={`h2h-pitcher-row h2h-batter-row${badges.length ? ' h2h-batter-row--leader' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="h2h-pitcher-main">
        <img
          src={headshotUrl(player.player_mlb_id)}
          alt={player.player_name}
          className="h2h-pitcher-headshot"
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div className="h2h-pitcher-identity">
          <div className="h2h-batter-name-row">
            <Link
              to={`/player/${player.player_mlb_id}`}
              className="h2h-pitcher-name"
              onClick={e => { e.stopPropagation(); window.scrollTo(0, 0); }}
            >
              {player.player_name}
            </Link>
            {badges.map(b => (
              <span key={b} className="h2h-batter-leader-badge" title={badgeTip[b]}>{b}</span>
            ))}
          </div>
          <div className="h2h-pitcher-meta">
            <span className="h2h-app-label">{player.at_bats ?? 0} AB · {player.hits ?? 0} H</span>
          </div>
        </div>
      </div>
      <div className="h2h-batter-stats-grid">
        <div className="h2h-pstat">
          <span className={`h2h-pstat-val${leadsAvg ? ' h2h-pstat-val--leader' : ''}`}>{avg}</span>
          <span className="h2h-pstat-lbl">AVG</span>
        </div>
        <div className="h2h-pstat">
          <span className={`h2h-pstat-val${leadsOPS ? ' h2h-pstat-val--leader' : ''}`}>{ops}</span>
          <span className="h2h-pstat-lbl">OPS</span>
        </div>
        <div className="h2h-pstat">
          <span className={`h2h-pstat-val${leadsHR ? ' h2h-pstat-val--leader' : ''}`}>{hr}</span>
          <span className="h2h-pstat-lbl">HR</span>
        </div>
        <div className="h2h-pstat">
          <span className="h2h-pstat-val">{rbi}</span>
          <span className="h2h-pstat-lbl">RBI</span>
        </div>
        <div className="h2h-pstat">
          <span className="h2h-pstat-val">{tb}</span>
          <span className="h2h-pstat-lbl">TB</span>
        </div>
        <div className="h2h-pstat">
          <span className="h2h-pstat-val">{k}</span>
          <span className="h2h-pstat-lbl">K</span>
        </div>
      </div>
    </div>
  );
}

function BatterLogModal({ player, teamAId, teamBId, gameSeason, onClose }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const isPriorSeason = gameSeason && Number(gameSeason) !== currentYear;
    const seasonParam = isPriorSeason ? { season: gameSeason } : {};
    gamesService.getHeadToHeadBatters(teamAId, teamBId, { limit: 10, totals: false, ...seasonParam })
      .then(data => {
        const appearances = [];
        for (const g of (data?.games || [])) {
          const allPlayers = [...(g.team_a || []), ...(g.team_b || [])];
          const found = allPlayers.find(p => p.player_mlb_id === player.player_mlb_id);
          if (found) appearances.push({ date: g.date, game_pk: g.game_pk, ...found });
        }
        setLogs(appearances);
      })
      .catch(() => setLogs([]));
  }, []); // eslint-disable-line

  const totals = logs?.length > 0 ? (() => {
    const t = { ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0, r: 0 };
    for (const g of logs) {
      t.ab  += g.at_bats    || 0;
      t.h   += g.hits       || 0;
      t.hr  += g.home_runs  || 0;
      t.rbi += g.rbis       || 0;
      t.bb  += g.walks      || 0;
      t.k   += g.strikeouts || 0;
      t.r   += g.runs       || 0;
    }
    t.avg = t.ab > 0 ? (t.h / t.ab).toFixed(3).replace(/^0/, '') : '—';
    return t;
  })() : null;

  return (
    <div className="pitcher-log-backdrop" onClick={onClose}>
      <div className="pitcher-log-modal" onClick={e => e.stopPropagation()}>
        <div className="pitcher-log-modal-header">
          <div className="pitcher-log-modal-title">
            <img
              src={headshotUrl(player.player_mlb_id)}
              alt={player.player_name}
              className="pitcher-log-headshot"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span>{player.player_name} — H2H Log</span>
          </div>
          <button className="pitcher-log-close" onClick={onClose}>✕</button>
        </div>

        {logs === null ? (
          <div className="pitcher-log-loading">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="pitcher-log-empty">No game logs found</div>
        ) : (
          <div className="pitcher-log-table-wrap">
            <table className="pitcher-log-table">
              <thead>
                <tr>
                  <th>Date</th><th>AB</th><th>H</th><th>HR</th>
                  <th>RBI</th><th>BB</th><th>K</th><th>R</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((g, i) => (
                  <tr key={g.game_pk ?? i}>
                    <td>{fmtLogDate(g.date)}</td>
                    <td>{g.at_bats    ?? '—'}</td>
                    <td>{g.hits       ?? '—'}</td>
                    <td>{g.home_runs  ?? '—'}</td>
                    <td>{g.rbis       ?? '—'}</td>
                    <td>{g.walks      ?? '—'}</td>
                    <td>{g.strikeouts ?? '—'}</td>
                    <td>{g.runs       ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="pitcher-log-totals">
                    <td>Totals ({logs.length}G) · AVG {totals.avg}</td>
                    <td>{totals.ab}</td>
                    <td>{totals.h}</td>
                    <td>{totals.hr}</td>
                    <td>{totals.rbi}</td>
                    <td>{totals.bb}</td>
                    <td>{totals.k}</td>
                    <td>{totals.r}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function H2HBattersCard({ abbr, mlbId, oppAbbr, teamAId, teamBId, players, gameCount, gameSeason }) {
  const [selectedBatter, setSelectedBatter] = useState(null);

  const sorted = [...(players || [])]
    .sort((a, b) => (parseFloat(b.hits) || 0) - (parseFloat(a.hits) || 0))
    .slice(0, 10);

  // PA qualifier: must have at least 40% of the most AB in the list (min 3)
  const maxAB     = Math.max(...sorted.map(p => parseInt(p.at_bats) || 0), 0);
  const qualifier = Math.max(3, Math.floor(maxAB * 0.4));
  const qualified = sorted.filter(p => (parseInt(p.at_bats) || 0) >= qualifier);

  const leaderOf = (field) => {
    if (!qualified.length) return null;
    let best = qualified[0], bestVal = parseFloat(best[field]) || 0;
    for (const p of qualified) {
      const val = parseFloat(p[field]) || 0;
      if (val > bestVal) { best = p; bestVal = val; }
    }
    return bestVal > 0 ? best.player_mlb_id : null;
  };

  const avgLeaderId  = leaderOf('avg');
  const opsLeaderId  = leaderOf('ops');
  const hitsLeaderId = leaderOf('hits');
  const hrLeaderId   = leaderOf('home_runs');

  const leaderIds = new Set([avgLeaderId, opsLeaderId, hitsLeaderId, hrLeaderId].filter(Boolean));
  const display = [
    ...sorted.filter(p => leaderIds.has(p.player_mlb_id)),
    ...sorted.filter(p => !leaderIds.has(p.player_mlb_id)),
  ];

  if (!sorted.length) {
    return (
      <div className="h2h-card">
        <div className="h2h-card-header">
          {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="h2h-card-logo" />}
          <span className="h2h-card-title">{abbr} Batters</span>
        </div>
        <div className="split-unavailable">No H2H batting data available</div>
      </div>
    );
  }

  return (
    <div className="h2h-card">
      {selectedBatter && (
        <BatterLogModal
          player={selectedBatter}
          teamAId={teamAId}
          teamBId={teamBId}
          gameSeason={gameSeason}
          onClose={() => setSelectedBatter(null)}
        />
      )}

      <div className="h2h-card-header">
        {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="h2h-card-logo" />}
        <span className="h2h-card-title">{abbr} Batters</span>
        {gameCount != null && <span className="h2h-game-count">Last {gameCount} matchups</span>}
      </div>

      <div className="h2h-group-label">vs {oppAbbr}</div>
      {display.map(p => (
        <H2HBatterRow
          key={p.player_mlb_id ?? p.player_name}
          player={p}
          onClick={() => setSelectedBatter(p)}
          leadsAvg={p.player_mlb_id === avgLeaderId}
          leadsOPS={p.player_mlb_id === opsLeaderId}
          leadsHits={p.player_mlb_id === hitsLeaderId}
          leadsHR={p.player_mlb_id === hrLeaderId}
        />
      ))}
    </div>
  );
}
