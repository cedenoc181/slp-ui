import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fmtIP, logoUrl, aggregatePlayers, mapSeasonType } from '../utils';
import gamesService from '../../../../../data/services/gamesService';

function shortName(name) {
  if (!name) return '—';
  const parts = name.trim().split(' ');
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

function PlayerLink({ name, mlbId, season }) {
  if (!name) return <span>—</span>;
  if (!mlbId) return <span>{shortName(name)}</span>;

  return (
    <Link
      to={`/player/${mlbId}?season=${season}`}
      className="lineup-player-link"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      {shortName(name)}
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

// Props:
//   abbr, mlbId, season   — display / link helpers
//   seasonType            — raw game.season_type ('spring' | 'regular' | 'postseason')
//   gamePk                — MLB game_pk; passed to API so backend filters to this game only
//   teamAId, teamBId      — internal team IDs (away = team_a, home = team_b)
//   side                  — 'team_a' (away) or 'team_b' (home)
//   isLive                — when true, polls every 60 s to pick up lineup as it populates
//   fallback              — node rendered when no lineup data is available (e.g. <TeamStatsCard>)
export default function LineupCard({ abbr, mlbId, season, seasonType, gamePk, teamAId, teamBId, side, isLive, fallback }) {
  const [tab, setTab] = useState('batters');
  const [batters, setBatters] = useState([]);
  const [pitchers, setPitchers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch — scoped to this game via game_pk
  useEffect(() => {
    if (!gamePk || !teamAId || !teamBId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const mappedType = mapSeasonType(seasonType);

    async function fetchLineup() {
      setLoading(true);
      const [battersRes, pitchersRes] = await Promise.allSettled([
        gamesService.getHeadToHeadBatters(teamAId, teamBId, { season: String(season), seasonType: mappedType, limit: 10, gamePk }),
        gamesService.getHeadToHeadPitchers(teamAId, teamBId, { season: String(season), seasonType: mappedType, limit: 10, gamePk }),
      ]);
      if (cancelled) return;
      const bGames = battersRes.status === 'fulfilled' ? (battersRes.value?.games ?? []) : [];
      const pGames = pitchersRes.status === 'fulfilled' ? (pitchersRes.value?.games ?? []) : [];
      setBatters(aggregatePlayers(bGames, side));
      setPitchers(aggregatePlayers(pGames, side));
      setLoading(false);
    }

    fetchLineup();
    return () => { cancelled = true; };
  }, [gamePk, teamAId, teamBId, season, seasonType, side]); // eslint-disable-line

  // Poll every 60 s for live games — lineup populates inning by inning
  useEffect(() => {
    if (!isLive || !gamePk || !teamAId || !teamBId) return;
    const mappedType = mapSeasonType(seasonType);

    const poll = async () => {
      const [battersRes, pitchersRes] = await Promise.allSettled([
        gamesService.getHeadToHeadBatters(teamAId, teamBId, { season: String(season), seasonType: mappedType, limit: 10, gamePk }),
        gamesService.getHeadToHeadPitchers(teamAId, teamBId, { season: String(season), seasonType: mappedType, limit: 10, gamePk }),
      ]);
      const bGames = battersRes.status === 'fulfilled' ? (battersRes.value?.games ?? []) : [];
      const pGames = pitchersRes.status === 'fulfilled' ? (pitchersRes.value?.games ?? []) : [];
      setBatters(aggregatePlayers(bGames, side));
      setPitchers(aggregatePlayers(pGames, side));
    };

    const intervalId = setInterval(poll, 60_000);
    return () => clearInterval(intervalId);
  }, [isLive, gamePk, teamAId, teamBId, season, seasonType, side]); // eslint-disable-line

  // Loading skeleton
  if (loading) {
    return (
      <div className="detail-card lineup-card">
        <div className="lineup-card-header">
          <h3 className="card-title">
            {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="card-title-logo" />}
            {abbr} Players
          </h3>
        </div>
        <div className="lineup-table-wrap">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton skeleton-text wide" style={{ margin: '0.4rem 0' }} />
          ))}
        </div>
      </div>
    );
  }

  // No lineup data — render TeamStatsCard fallback or nothing
  if (batters.length === 0 && pitchers.length === 0) {
    return fallback ?? null;
  }

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
        <h3 className="card-title">
          {mlbId && <img src={logoUrl(mlbId)} alt={abbr} className="card-title-logo" />}
          {abbr} Players
        </h3>
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
                    <PlayerLink name={p.player_name} mlbId={p.player_mlb_id} season={season} />
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
                    <PlayerLink name={p.player_name} mlbId={p.player_mlb_id} season={season} />
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
