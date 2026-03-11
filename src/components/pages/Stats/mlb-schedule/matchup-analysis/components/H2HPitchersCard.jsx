import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { headshotUrl, logoUrl } from '../../utils';
import gamesService from '../../../../../../data/services/gamesService';

const BULLPEN_INITIAL = 2;

function normName(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fmtIPRaw(rawIp) {
  if (rawIp == null) return '—';
  const full = Math.floor(rawIp);
  const outs = Math.round((rawIp - full) * 3);
  if (outs >= 3) return `${full + 1}.0`;
  return `${full}.${outs}`;
}

function classifyPitchers(players) {
  const starters = [];
  const bullpen  = [];
  for (const p of (players || [])) {
    const ip  = parseFloat(p.innings_pitched) || 0;
    const app = parseInt(p.appearances, 10)   || 1;
    if (ip / app >= 3) {
      starters.push(p);
    } else {
      bullpen.push(p);
    }
  }
  const topBullpen = bullpen
    .sort((a, b) => {
      const appDiff = (parseInt(b.appearances, 10) || 0) - (parseInt(a.appearances, 10) || 0);
      if (appDiff !== 0) return appDiff;
      return (parseFloat(b.innings_pitched) || 0) - (parseFloat(a.innings_pitched) || 0);
    })
    .slice(0, 8);
  return { starters, bullpen: topBullpen };
}

function H2HPitcherRow({ player, isTonight, onClick }) {
  const era  = player.era  != null ? parseFloat(player.era).toFixed(2)  : '—';
  const whip = player.whip != null ? parseFloat(player.whip).toFixed(2) : '—';
  const ip   = player.innings_pitched != null ? parseFloat(player.innings_pitched).toFixed(1) : '—';
  const ks   = player.strikeouts      != null ? player.strikeouts      : '—';
  const bb   = player.walks           != null ? player.walks           : '—';
  const qs   = player.quality_starts  != null ? player.quality_starts  : '—';
  return (
    <div
      className={`h2h-pitcher-row${isTonight ? ' h2h-pitcher-row--sp' : ''}`}
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
          <Link
            to={`/player/${player.player_mlb_id}`}
            className="h2h-pitcher-name"
            onClick={e => { e.stopPropagation(); window.scrollTo(0, 0); }}
          >
            {player.player_name}
          </Link>
          <div className="h2h-pitcher-meta">
            {isTonight && <span className="h2h-sp-badge">Tonight's SP</span>}
            <span className="h2h-app-label">{player.appearances} app · {player.wins ?? 0}W-{player.losses ?? 0}L</span>
          </div>
        </div>
      </div>
      <div className="h2h-pitcher-stats">
        <div className="h2h-pstat"><span className="h2h-pstat-val">{era}</span><span className="h2h-pstat-lbl">ERA</span></div>
        <div className="h2h-pstat"><span className="h2h-pstat-val">{whip}</span><span className="h2h-pstat-lbl">WHIP</span></div>
        <div className="h2h-pstat"><span className="h2h-pstat-val">{ip}</span><span className="h2h-pstat-lbl">IP</span></div>
        <div className="h2h-pstat"><span className="h2h-pstat-val">{ks}</span><span className="h2h-pstat-lbl">K</span></div>
        <div className="h2h-pstat"><span className="h2h-pstat-val">{bb}</span><span className="h2h-pstat-lbl">BB</span></div>
        <div className="h2h-pstat"><span className="h2h-pstat-val">{qs}</span><span className="h2h-pstat-lbl">QS</span></div>
      </div>
    </div>
  );
}

function PitcherLogModal({ player, teamAId, teamBId, onClose }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    gamesService.getHeadToHeadPitchers(teamAId, teamBId, { limit: 10, totals: false })
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
    const t = { ip: 0, h: 0, er: 0, k: 0, bb: 0, hr: 0, pc: 0, w: 0, l: 0 };
    for (const g of logs) {
      t.ip += parseFloat(g.innings_pitched) || 0;
      t.h  += g.hits_allowed        || 0;
      t.er += g.earned_runs         || 0;
      t.k  += g.strikeouts          || 0;
      t.bb += g.walks               || 0;
      t.hr += g.home_runs_allowed   || 0;
      t.pc += g.pitches_thrown      || 0;
      if (g.win)  t.w++;
      if (g.loss) t.l++;
    }
    t.era   = t.ip > 0 ? ((t.er / t.ip) * 9).toFixed(2) : '—';
    t.ipFmt = fmtIPRaw(t.ip);
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
                  <th>Date</th><th>IP</th><th>H</th><th>ER</th>
                  <th>K</th><th>BB</th><th>HR</th><th>PC</th><th>W/L</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((g, i) => (
                  <tr key={g.game_pk ?? i}>
                    <td>{g.date}</td>
                    <td>{fmtIPRaw(g.innings_pitched)}</td>
                    <td>{g.hits_allowed ?? '—'}</td>
                    <td>{g.earned_runs ?? '—'}</td>
                    <td>{g.strikeouts ?? '—'}</td>
                    <td>{g.walks ?? '—'}</td>
                    <td>{g.home_runs_allowed ?? '—'}</td>
                    <td>{g.pitches_thrown ?? '—'}</td>
                    <td>
                      {g.win
                        ? <span className="pl-win">W</span>
                        : g.loss
                          ? <span className="pl-loss">L</span>
                          : <span className="pl-nd">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="pitcher-log-totals">
                    <td>Totals ({logs.length}G) · ERA {totals.era}</td>
                    <td>{totals.ipFmt}</td>
                    <td>{totals.h}</td>
                    <td>{totals.er}</td>
                    <td>{totals.k}</td>
                    <td>{totals.bb}</td>
                    <td>{totals.hr}</td>
                    <td>{totals.pc}</td>
                    <td>{totals.w}W-{totals.l}L</td>
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

export default function H2HPitchersCard({ abbr, mlbId, oppAbbr, teamAId, teamBId, players, spName, gameCount }) {
  const [bullpenExpanded, setBullpenExpanded] = useState(false);
  const [selectedPitcher, setSelectedPitcher] = useState(null);
  const normSP = normName(spName);
  const isTonightSP = (p) => {
    if (!normSP) return false;
    const pNorm = normName(p.player_name);
    return pNorm === normSP || pNorm.includes(normSP) || normSP.includes(pNorm);
  };

  let { starters, bullpen } = classifyPitchers(players);

  // If tonight's SP was classified as bullpen, promote them to the starters section
  const spFromBullpen = bullpen.find(isTonightSP);
  if (spFromBullpen) {
    starters = [spFromBullpen, ...starters];
    bullpen  = bullpen.filter(p => p !== spFromBullpen);
  }

  if (!players?.length) {
    return (
      <div className="h2h-card">
        <div className="h2h-card-header">
          {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="h2h-card-logo" />}
          <span className="h2h-card-title">{abbr} Pitchers</span>
        </div>
        <div className="split-unavailable">No H2H pitching data available</div>
      </div>
    );
  }

  const visibleBullpen = bullpenExpanded ? bullpen : bullpen.slice(0, BULLPEN_INITIAL);
  const hiddenCount    = bullpen.length - BULLPEN_INITIAL;

  return (
    <div className="h2h-card">
      {selectedPitcher && (
        <PitcherLogModal
          player={selectedPitcher}
          teamAId={teamAId}
          teamBId={teamBId}
          onClose={() => setSelectedPitcher(null)}
        />
      )}

      <div className="h2h-card-header">
        {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="h2h-card-logo" />}
        <span className="h2h-card-title">{abbr} Pitchers</span>
        {gameCount != null && <span className="h2h-game-count">Last {gameCount} matchups</span>}
      </div>

      {starters.length > 0 && (
        <>
          <div className="h2h-group-label">Starters vs {oppAbbr}</div>
          {[...starters]
            .sort((a, b) => (isTonightSP(b) ? 1 : 0) - (isTonightSP(a) ? 1 : 0))
            .slice(0, 5)
            .map(p => (
              <H2HPitcherRow
                key={p.player_mlb_id ?? p.player_name}
                player={p}
                isTonight={isTonightSP(p)}
                onClick={() => setSelectedPitcher(p)}
              />
            ))}
        </>
      )}

      {bullpen.length > 0 && (
        <>
          <div className="h2h-group-label">Bullpen vs {oppAbbr}</div>
          {visibleBullpen.map(p => (
            <H2HPitcherRow
              key={p.player_mlb_id ?? p.player_name}
              player={p}
              isTonight={false}
              onClick={() => setSelectedPitcher(p)}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              className="h2h-bullpen-toggle"
              onClick={() => setBullpenExpanded(prev => !prev)}
            >
              {bullpenExpanded ? 'Show Less ▲' : `Show ${hiddenCount} More ▼`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
