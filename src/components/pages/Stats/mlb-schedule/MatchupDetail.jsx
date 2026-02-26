import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import scheduleService from '../../../../data/services/scheduleService';
import gamesService from '../../../../data/services/gamesService';
import playerStatsService from '../../../../data/services/playerStatsServices';
import teamsService from '../../../../data/services/teamsService';
import teamStatsService from '../../../../data/services/teamStatsService';
import { getTeamById, DEFAULT_SEASON } from '../../../../data/constants/apiConstants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logoUrl(mlbId) {
  return `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
}

function headshotUrl(playerMlbId) {
  if (!playerMlbId) return null;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_100/v1/people/${playerMlbId}/headshot/67/current`;
}

function getMlbId(teamId) {
  return getTeamById(teamId)?.mlbId || null;
}

function getAbbr(teamId) {
  return getTeamById(teamId)?.id || null;
}

function getUrlName(teamId) {
  return getTeamById(teamId)?.urlName || null;
}

function mapSeasonType(gameSeasonType) {
  if (gameSeasonType === 'spring') return 'S';
  if (gameSeasonType === 'postseason') return 'P';
  return 'R';
}

function hasValidStats(stats) {
  if (!stats) return false;
  if (Array.isArray(stats)) return stats.length > 0;
  return stats.era != null || stats.w != null || stats.wins != null || stats.ip != null;
}

function fmt(val, decimals = 3) {
  if (val == null || val === '') return '—';
  const num = parseFloat(val);
  if (isNaN(num)) return String(val);
  return num.toFixed(decimals);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// Baseball IP: store as decimal (e.g. 4.333…), display as 4.1 / 4.2
function fmtIP(ipDecimal) {
  if (ipDecimal == null) return '—';
  const totalOuts = Math.round(ipDecimal * 3);
  return `${Math.floor(totalOuts / 3)}.${totalOuts % 3}`;
}

// Aggregate per-game player arrays into one row per player
function aggregatePlayers(games, side) {
  if (!Array.isArray(games)) return [];
  const map = new Map();
  for (const game of games) {
    const players = game[side];
    if (!Array.isArray(players)) continue;
    for (const p of players) {
      const key = p.player_mlb_id ?? p.player_name;
      if (key == null) continue;
      if (!map.has(key)) {
        map.set(key, { ...p, _g: 1 });
      } else {
        const acc = map.get(key);
        acc._g += 1;
        if (p.is_starter) acc.is_starter = true;
        for (const field of Object.keys(p)) {
          if (field === 'player_mlb_id' || field === 'player_name' || field === 'is_starter') continue;
          if (typeof p[field] === 'number') acc[field] = (acc[field] ?? 0) + p[field];
        }
      }
    }
  }
  return Array.from(map.values());
}

function wasWin(game, teamId) {
  if (game.winning_team_id != null) return game.winning_team_id === teamId;
  if (game.result) return game.result === 'W';
  if (game.win != null) return Boolean(game.win);
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, away, home, lowerIsBetter }) {
  const awayNum = parseFloat(away);
  const homeNum = parseFloat(home);
  let awayLeading = false;
  let homeLeading = false;
  if (!isNaN(awayNum) && !isNaN(homeNum) && away !== '—' && home !== '—') {
    awayLeading = lowerIsBetter ? awayNum < homeNum : awayNum > homeNum;
    homeLeading = lowerIsBetter ? homeNum < awayNum : homeNum > awayNum;
  }
  return (
    <div className="matchup-stat-row">
      <span className={`stat-value away${awayLeading ? ' stat-leader' : ''}`}>{away ?? '—'}</span>
      <span className="stat-label">{label}</span>
      <span className={`stat-value home${homeLeading ? ' stat-leader' : ''}`}>{home ?? '—'}</span>
    </div>
  );
}

function FormDot({ result }) {
  if (result === 'W') return <span className="form-dot win" aria-label="Win" />;
  if (result === 'L') return <span className="form-dot loss" aria-label="Loss" />;
  return <span className="form-dot unknown" aria-label="Unknown" />;
}

function PitcherCard({ abbr, name, spStats, align, mlbId, headshotId, nameSlug, teamUrlName, season, statSeason }) {
  const isRight = align === 'right';
  const hsUrl = headshotUrl(headshotId);
  const teamLink = teamUrlName ? `/team-analytics/${teamUrlName}` : null;
  const playerLink = nameSlug && name ? `/player/${nameSlug}?season=${season}` : null;

  const logoEl = mlbId && (
    teamLink
      ? <Link to={teamLink} className="pitcher-card-logo-link"><img src={logoUrl(mlbId)} alt={abbr} className="pitcher-card-logo" /></Link>
      : <img src={logoUrl(mlbId)} alt={abbr} className="pitcher-card-logo" />
  );

  return (
    <div className={`pitcher-card${isRight ? ' right-align' : ''}`}>
      {/* Team logo + abbreviation row */}
      <div className="pitcher-header">
        {!isRight && logoEl}
        <p className="pitcher-team">{abbr}</p>
        {isRight && logoEl}
      </div>

      {/* Headshot + name/stats row */}
      <div className="pitcher-info-row">
        {!isRight && hsUrl && (
          <img
            src={hsUrl}
            alt={name || abbr}
            className="pitcher-headshot"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <div className="pitcher-details">
          {playerLink
            ? <Link to={playerLink} className="pitcher-name-lg">{name}</Link>
            : <p className="pitcher-name-lg">{name || 'TBD'}</p>
          }
          {spStats && (spStats.w != null || spStats.wins != null) && (spStats.l != null || spStats.losses != null) && (
            <span className="pitcher-wl-record">{spStats.w ?? spStats.wins}-{spStats.l ?? spStats.losses}</span>
          )}
          {spStats && (
            <div className="pitcher-stats">
              {statSeason && <span className="pitcher-stat-season">{statSeason}</span>}
              {spStats.era != null && <span>ERA {fmt(spStats.era, 2)}</span>}
              {spStats.whip != null && <span>WHIP {fmt(spStats.whip, 2)}</span>}
              {(spStats.k != null || spStats.strikeouts != null || spStats.so != null) && (
                <span>{spStats.k ?? spStats.strikeouts ?? spStats.so} K</span>
              )}
              {spStats.ip != null && <span>{fmt(spStats.ip, 1)} IP</span>}
            </div>
          )}
        </div>
        {isRight && hsUrl && (
          <img
            src={hsUrl}
            alt={name || abbr}
            className="pitcher-headshot"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>
    </div>
  );
}

function LineupCard({ abbr, batters, pitchers }) {
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
          <button className={`lineup-tab${tab === 'batters' ? ' active' : ''}`} onClick={() => setTab('batters')}>Batters</button>
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
                  <td className="lineup-name">{p.player_name ?? '—'}</td>
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
                  <td className={`lineup-name${p.is_starter ? ' lineup-starter' : ''}`}>{p.player_name ?? '—'}</td>
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

// ─── Team Stats Card ──────────────────────────────────────────────────────────

const BATTING_ROWS = [
  { label: 'AVG',  key: 'avg',            decimals: 3 },
  { label: 'OBP',  key: 'obp',            decimals: 3 },
  { label: 'SLG',  key: 'slg',            decimals: 3 },
  { label: 'OPS',  key: 'ops',            decimals: 3 },
  { label: 'R',    key: 'runs' },
  { label: 'H',    key: 'hits' },
  { label: 'HR',   key: 'home_runs' },
  { label: 'RBI',  key: 'rbis' },
  { label: 'SB',   key: 'stolen_bases' },
  { label: 'BB',   key: 'walks' },
  { label: 'K',    key: 'strikeouts' },
];

const PITCHING_ROWS = [
  { label: 'ERA',  key: 'era',              decimals: 2 },
  { label: 'WHIP', key: 'whip',             decimals: 2 },
  { label: 'W',    key: 'wins' },
  { label: 'L',    key: 'losses' },
  { label: 'SV',   key: 'saves' },
  { label: 'IP',   key: 'innings_pitched',  decimals: 1 },
  { label: 'K',    key: 'strikeouts' },
  { label: 'BB',   key: 'walks' },
  { label: 'HR',   key: 'home_runs_allowed' },
];

function TeamStatsCard({ abbr, batting, pitching }) {
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

// ─── Main Component ───────────────────────────────────────────────────────────

function MatchupDetail() {
  const { gameId } = useParams();
  const { state } = useLocation();

  const [game, setGame] = useState(null);
  const [awayLast10, setAwayLast10] = useState([]);
  const [homeLast10, setHomeLast10] = useState([]);
  const [awayLast10Summary, setAwayLast10Summary] = useState(null);
  const [homeLast10Summary, setHomeLast10Summary] = useState(null);
  const [awaySP, setAwaySP] = useState(null);
  const [homeSP, setHomeSP] = useState(null);
  const [awaySPStatSeason, setAwaySPStatSeason] = useState(null);
  const [homeSPStatSeason, setHomeSPStatSeason] = useState(null);
  const [awaySPInfo, setAwaySPInfo] = useState(null);
  const [homeSPInfo, setHomeSPInfo] = useState(null);
  const [awaySeasonRecord, setAwaySeasonRecord] = useState(null);
  const [homeSeasonRecord, setHomeSeasonRecord] = useState(null);
  const [h2h, setH2h] = useState(null);
  const [h2hBatters, setH2hBatters] = useState(null);
  const [h2hPitchers, setH2hPitchers] = useState(null);
  const [awayBatting, setAwayBatting] = useState(null);
  const [homeBatting, setHomeBatting] = useState(null);
  const [awayPitching, setAwayPitching] = useState(null);
  const [homePitching, setHomePitching] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        let gameData = state?.game || null;
        if (!gameData) {
          gameData = await scheduleService.getGameById(gameId);
        }
        if (!gameData) throw new Error('Game not found');
        setGame(gameData);

        const awayId = gameData.away_team_id;
        const homeId = gameData.home_team_id;
        const awaySPId = gameData.away_sp_id;
        const homeSPId = gameData.home_sp_id;
        const season = gameData.season || DEFAULT_SEASON;
        const seasonType = mapSeasonType(gameData.season_type);

        const FALLBACK_SEASON = '2025';
        const needsFallback = String(season) !== FALLBACK_SEASON;

        const needsL10Fallback = seasonType === 'S';

        const gameStatusLower = (gameData.status || '').toLowerCase();
        const isFinalGame = gameStatusLower === 'final' || gameStatusLower === 'game over' || gameStatusLower === 'completed';
        const isLiveGame = gameStatusLower.includes('progress') || gameStatusLower === 'live' || gameStatusLower.includes('inning');
        const needsTeamStats = !isFinalGame && !isLiveGame;

        const [
          awayL10Res, homeL10Res,
          awaySPRes, homeSPRes,
          h2hRes,
          awaySPInfoRes, homeSPInfoRes,
          awaySPFallbackRes, homeSPFallbackRes,
          standingsRes,
          h2hBattersRes, h2hPitchersRes,
          awayL10FallbackRes, homeL10FallbackRes,
          awayBattingRes, homeBattingRes,
          awayPitchingRes, homePitchingRes,
        ] = await Promise.allSettled([
          gamesService.getTeamLast10(awayId, season, seasonType),
          gamesService.getTeamLast10(homeId, season, seasonType),
          awaySPId
            ? playerStatsService.getPitcherCurrentStats(awaySPId, season, seasonType)
            : Promise.resolve(null),
          homeSPId
            ? playerStatsService.getPitcherCurrentStats(homeSPId, season, seasonType)
            : Promise.resolve(null),
          gamesService.getHeadToHead(awayId, homeId, { season: String(season), seasonType, limit: 10 }),
          awaySPId
            ? playerStatsService.getPlayerInfo(awaySPId)
            : Promise.resolve(null),
          homeSPId
            ? playerStatsService.getPlayerInfo(homeSPId)
            : Promise.resolve(null),
          awaySPId && needsFallback
            ? playerStatsService.getPitcherCurrentStats(awaySPId, FALLBACK_SEASON, 'R')
            : Promise.resolve(null),
          homeSPId && needsFallback
            ? playerStatsService.getPitcherCurrentStats(homeSPId, FALLBACK_SEASON, 'R')
            : Promise.resolve(null),
          seasonType === 'S'
            ? teamsService.getTeamSpringTrainingStandings(season)
            : teamsService.getTeamRegularSeasonStandings(season),
          gamesService.getHeadToHeadBatters(awayId, homeId, { season: String(season), seasonType, limit: 10 }),
          gamesService.getHeadToHeadPitchers(awayId, homeId, { season: String(season), seasonType, limit: 10 }),
          needsL10Fallback
            ? gamesService.getTeamLast10(awayId, FALLBACK_SEASON, 'R')
            : Promise.resolve(null),
          needsL10Fallback
            ? gamesService.getTeamLast10(homeId, FALLBACK_SEASON, 'R')
            : Promise.resolve(null),
          needsTeamStats
            ? teamStatsService.getTeamBattingStats(awayId, season, seasonType)
            : Promise.resolve(null),
          needsTeamStats
            ? teamStatsService.getTeamBattingStats(homeId, season, seasonType)
            : Promise.resolve(null),
          needsTeamStats
            ? teamStatsService.getTeamPitchingStats(awayId, season, seasonType)
            : Promise.resolve(null),
          needsTeamStats
            ? teamStatsService.getTeamPitchingStats(homeId, season, seasonType)
            : Promise.resolve(null),
        ]);

        // The last10 endpoint returns [summaryObj, ...gameObjects]
        // where summaryObj has last_ten_wins/losses/streak_code fields
        const parseLast10 = (raw) => {
          if (!Array.isArray(raw) || raw.length === 0) return { summary: null, games: [] };
          const first = raw[0];
          if (first && first.last_ten_wins != null) {
            return { summary: first, games: raw.slice(1) };
          }
          return { summary: null, games: raw };
        };

        const awayPrimary  = parseLast10(awayL10Res.status  === 'fulfilled' ? awayL10Res.value  : null);
        const homePrimary  = parseLast10(homeL10Res.status  === 'fulfilled' ? homeL10Res.value  : null);
        const awayFBParsed = parseLast10(awayL10FallbackRes.status === 'fulfilled' ? awayL10FallbackRes.value : null);
        const homeFBParsed = parseLast10(homeL10FallbackRes.status === 'fulfilled' ? homeL10FallbackRes.value : null);

        // Use primary game objects if any are completed; otherwise fall back to 2025 regular season
        const awayHasCompleted = awayPrimary.games.some(g => g.winning_team_id != null);
        const homeHasCompleted = homePrimary.games.some(g => g.winning_team_id != null);

        setAwayLast10Summary(awayPrimary.summary);
        setHomeLast10Summary(homePrimary.summary);
        setAwayLast10(awayHasCompleted ? awayPrimary.games : awayFBParsed.games);
        setHomeLast10(homeHasCompleted ? homePrimary.games : homeFBParsed.games);

        const awaySPPrimary = awaySPRes.status === 'fulfilled' ? awaySPRes.value : null;
        const homeSPPrimary = homeSPRes.status === 'fulfilled' ? homeSPRes.value : null;
        const awaySPFallback = awaySPFallbackRes.status === 'fulfilled' ? awaySPFallbackRes.value : null;
        const homeSPFallback = homeSPFallbackRes.status === 'fulfilled' ? homeSPFallbackRes.value : null;

        if (hasValidStats(awaySPPrimary)) {
          setAwaySP(awaySPPrimary);
          setAwaySPStatSeason(String(season));
        } else if (hasValidStats(awaySPFallback)) {
          setAwaySP(awaySPFallback);
          setAwaySPStatSeason(FALLBACK_SEASON);
        } else {
          setAwaySP(null);
          setAwaySPStatSeason(null);
        }

        if (hasValidStats(homeSPPrimary)) {
          setHomeSP(homeSPPrimary);
          setHomeSPStatSeason(String(season));
        } else if (hasValidStats(homeSPFallback)) {
          setHomeSP(homeSPFallback);
          setHomeSPStatSeason(FALLBACK_SEASON);
        } else {
          setHomeSP(null);
          setHomeSPStatSeason(null);
        }
        setAwaySPInfo(awaySPInfoRes.status === 'fulfilled' ? awaySPInfoRes.value : null);
        setHomeSPInfo(homeSPInfoRes.status === 'fulfilled' ? homeSPInfoRes.value : null);

        const findTeamRecord = (standings, teamId, isSpring) => {
          if (!standings) return null;
          const teams = [];
          if (isSpring) {
            // Shape: { "Cactus League": [...teams], "Grapefruit League": [...teams] }
            for (const leagueTeams of Object.values(standings)) {
              if (Array.isArray(leagueTeams)) teams.push(...leagueTeams);
            }
            const team = teams.find(t => t.team_id === teamId);
            if (!team) return null;
            const w = team.spring_league_wins ?? null;
            const l = team.spring_league_losses ?? null;
            return w != null && l != null ? `${w}-${l}` : null;
          } else {
            // Regular/postseason shape: { divisions: [{ teams: [...] }] } or similar
            const src = standings.divisions ?? standings.leagues ?? standings;
            const srcArr = Array.isArray(src) ? src : Object.values(src);
            for (const item of srcArr) {
              if (item?.teams) teams.push(...item.teams);
              else if (item?.team_id != null || item?.id != null) teams.push(item);
            }
            const team = teams.find(t => (t.team_id ?? t.id) === teamId);
            if (!team) return null;
            const w = team.wins ?? team.w ?? null;
            const l = team.losses ?? team.l ?? null;
            if (w != null && l != null) return `${w}-${l}`;
            return team.record ?? null;
          }
        };
        const standings = standingsRes.status === 'fulfilled' ? standingsRes.value : null;
        const isSpring = seasonType === 'S';
        setAwaySeasonRecord(findTeamRecord(standings, awayId, isSpring));
        setHomeSeasonRecord(findTeamRecord(standings, homeId, isSpring));

        const h2hVal = h2hRes.status === 'fulfilled' ? h2hRes.value : null;
        setH2h(h2hVal?.summary ? h2hVal : null);

        setH2hBatters(h2hBattersRes.status === 'fulfilled' ? h2hBattersRes.value : null);
        setH2hPitchers(h2hPitchersRes.status === 'fulfilled' ? h2hPitchersRes.value : null);

        setAwayBatting(awayBattingRes.status === 'fulfilled' ? awayBattingRes.value : null);
        setHomeBatting(homeBattingRes.status === 'fulfilled' ? homeBattingRes.value : null);
        setAwayPitching(awayPitchingRes.status === 'fulfilled' ? awayPitchingRes.value : null);
        setHomePitching(homePitchingRes.status === 'fulfilled' ? homePitchingRes.value : null);
      } catch (err) {
        setError(err?.message || 'Failed to load matchup details.');
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="matchup-detail-page">
        <div className="container">
          <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          <div className="detail-loading">
            <div className="detail-loading-spinner" />
            <p>Loading matchup…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="matchup-detail-page">
        <div className="container">
          <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          <div className="schedule-empty">
            <div className="empty-icon">⚾</div>
            <p className="empty-title">Matchup unavailable</p>
            <p className="empty-subtitle">
              {error || 'Could not load this matchup. Try navigating back to the schedule.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const awayMlbId = getMlbId(game.away_team_id);
  const homeMlbId = getMlbId(game.home_team_id);
  const awayAbbr = getAbbr(game.away_team_id) || game.away_team_name;
  const homeAbbr = getAbbr(game.home_team_id) || game.home_team_name;
  const awayUrlName = getUrlName(game.away_team_id);
  const homeUrlName = getUrlName(game.home_team_id);
  const season = game.season || DEFAULT_SEASON;

  const statusLower = (game.status || '').toLowerCase();
  const isFinal = statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed';
  const isLive = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');
  const isScheduled = !isFinal && !isLive;

  const awayWon = game.winning_team_id === game.away_team_id;
  const homeWon = game.winning_team_id === game.home_team_id;

  // MLBAM player IDs for headshots — from player info endpoint (player_mlb_id)
  const awaySPMlbId = awaySPInfo?.player_mlb_id ?? game.away_sp_mlb_id ?? null;
  const homeSPMlbId = homeSPInfo?.player_mlb_id ?? game.home_sp_mlb_id ?? null;

  const hasSP = game.away_sp_name || game.home_sp_name;
  const hasLast10 = awayLast10.length > 0 || homeLast10.length > 0 || awayLast10Summary != null || homeLast10Summary != null;
  const hasH2h = h2h?.summary != null && Array.isArray(h2h?.games) && h2h.games.length > 0;

  // H2H lineup data — aggregate per-player across all games
  const awayBatters  = aggregatePlayers(h2hBatters?.games,  'team_a');
  const homeBatters  = aggregatePlayers(h2hBatters?.games,  'team_b');
  const awayPitchers = aggregatePlayers(h2hPitchers?.games, 'team_a');
  const homePitchers = aggregatePlayers(h2hPitchers?.games, 'team_b');
  const hasLineup = awayBatters.length > 0 || homeBatters.length > 0 || awayPitchers.length > 0 || homePitchers.length > 0;
  const hasTeamStats = !!(awayBatting || homeBatting || awayPitching || homePitching);

  // Map H2H summary sides to current away/home teams
  const h2hAwaySum = hasH2h
    ? (h2h.summary.team_a?.team_id === game.away_team_id ? h2h.summary.team_a : h2h.summary.team_b)
    : null;
  const h2hHomeSum = hasH2h
    ? (h2h.summary.team_a?.team_id === game.away_team_id ? h2h.summary.team_b : h2h.summary.team_a)
    : null;

  function formGames(games, teamId) {
    return games
      .filter(g =>
        g.id != null && (
          g.winning_team_id != null ||
          (g.status || '').toLowerCase().includes('final')
        )
      )
      .slice(0, 10)
      .map(g => {
        const isAway = g.away_team_id === teamId;
        const myRuns = isAway ? g.away_runs_score : g.home_runs_score;
        const oppRuns = isAway ? g.home_runs_score : g.away_runs_score;
        const oppTeamId = isAway ? g.home_team_id : g.away_team_id;
        const w = wasWin(g, teamId);
        return {
          result: w === true ? 'W' : w === false ? 'L' : 'T',
          myRuns,
          oppRuns,
          oppAbbr: getAbbr(oppTeamId) || '???',
          oppMlbId: getMlbId(oppTeamId),
          isHome: !isAway,
          gameId: g.id ?? g.game_pk,
          rawGame: g,
        };
      });
  }

  const awayGames = formGames(awayLast10, game.away_team_id);
  const homeGames = formGames(homeLast10, game.home_team_id);
  const awayForm = awayGames.map(g => g.result);
  const homeForm = homeGames.map(g => g.result);
  // Prefer summary values (pre-computed by backend); fall back to counting form dots
  const awayWins   = awayLast10Summary?.last_ten_wins   ?? awayForm.filter(r => r === 'W').length;
  const awayLosses = awayLast10Summary?.last_ten_losses ?? awayForm.filter(r => r === 'L').length;
  const homeWins   = homeLast10Summary?.last_ten_wins   ?? homeForm.filter(r => r === 'W').length;
  const homeLosses = homeLast10Summary?.last_ten_losses ?? homeForm.filter(r => r === 'L').length;

  return (
    <div className="matchup-detail-page">
      <div className="container">
        <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className={`detail-hero${isFinal ? ' hero-final' : isLive ? ' hero-live' : ''}`}>
          {/* Status strip */}
          <div className="hero-status-strip">
            {isFinal && <span className="hero-badge badge-final">FINAL</span>}
            {isLive && <span className="hero-badge badge-live">● LIVE</span>}
            {isScheduled && <span className="hero-badge badge-scheduled">{game.game_time || 'TBD'}</span>}
            {game.date && <span className="hero-date">{fmtDate(game.date)}</span>}
          </div>

          {/* Teams row */}
          <div className="hero-matchup">
            {/* Away */}
            <div className="hero-team away-team">
              {awayMlbId && (
                awayUrlName
                  ? <Link to={`/team-analytics/${awayUrlName}`}><img src={logoUrl(awayMlbId)} alt={game.away_team_name} className="hero-logo" /></Link>
                  : <img src={logoUrl(awayMlbId)} alt={game.away_team_name} className="hero-logo" />
              )}
              <div className="hero-team-info">
                <span className="hero-team-name">{game.away_team_name}</span>
                {awaySeasonRecord && <span className="hero-record">{awaySeasonRecord}</span>}
                {isFinal && (
                  <span className={`hero-score${awayWon ? ' score-win' : ' score-loss'}`}>
                    {game.away_runs_score}
                  </span>
                )}
              </div>
            </div>

            {/* Center divider */}
            <div className="hero-center">
              {isFinal || isLive ? (
                <span className="hero-dash">—</span>
              ) : (
                <span className="hero-vs">VS</span>
              )}
              {game.venue && <span className="hero-venue">{game.venue}</span>}
              {game.tv_broadcast && <span className="hero-tv">📺 {game.tv_broadcast}</span>}
            </div>

            {/* Home */}
            <div className="hero-team home-team">
              <div className="hero-team-info home-info">
                <span className="hero-team-name">{game.home_team_name}</span>
                {homeSeasonRecord && <span className="hero-record">{homeSeasonRecord}</span>}
                {isFinal && (
                  <span className={`hero-score${homeWon ? ' score-win' : ' score-loss'}`}>
                    {game.home_runs_score}
                  </span>
                )}
              </div>
              {homeMlbId && (
                homeUrlName
                  ? <Link to={`/team-analytics/${homeUrlName}`}><img src={logoUrl(homeMlbId)} alt={game.home_team_name} className="hero-logo" /></Link>
                  : <img src={logoUrl(homeMlbId)} alt={game.home_team_name} className="hero-logo" />
              )}
            </div>
          </div>
        </div>

        {/* ── Box Score (final / live) ──────────────────────────────────────── */}
        {(isFinal || isLive) && game.home_runs_score != null && (
          <div className="box-score-card">
            <table className="box-score-table">
              <thead>
                <tr>
                  <th className="box-th-team"></th>
                  <th>R</th>
                  <th>H</th>
                  <th>E</th>
                  {game.home_lob != null && <th>LOB</th>}
                </tr>
              </thead>
              <tbody>
                <tr className={awayWon ? 'box-row-winner' : ''}>
                  <td className="box-team-name">{awayAbbr}</td>
                  <td className="box-runs">{game.away_runs_score ?? '—'}</td>
                  <td>{game.away_hits ?? '—'}</td>
                  <td className={game.away_errors > 0 ? 'box-error' : ''}>{game.away_errors ?? '—'}</td>
                  {game.home_lob != null && <td>{game.away_lob ?? '—'}</td>}
                </tr>
                <tr className={homeWon ? 'box-row-winner' : ''}>
                  <td className="box-team-name">{homeAbbr}</td>
                  <td className="box-runs">{game.home_runs_score ?? '—'}</td>
                  <td>{game.home_hits ?? '—'}</td>
                  <td className={game.home_errors > 0 ? 'box-error' : ''}>{game.home_errors ?? '—'}</td>
                  {game.home_lob != null && <td>{game.home_lob ?? '—'}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Detail grid ───────────────────────────────────────────────────── */}
        <div className="detail-grid">

          {/* Probable / Starting Pitchers */}
          {hasSP && (
            <div className="detail-card detail-card-full">
              <h3 className="card-title">
                {(isFinal || isLive) ? 'Starting Pitchers' : 'Probable Pitchers'}
              </h3>
              <div className="pitcher-matchup">
                <PitcherCard abbr={awayAbbr} name={game.away_sp_name} spStats={awaySP} align="left"  mlbId={awayMlbId} headshotId={awaySPMlbId} nameSlug={awaySPInfo?.name_slug} teamUrlName={awayUrlName} season={season} statSeason={awaySPStatSeason} />
                <div className="pitcher-vs">VS</div>
                <PitcherCard abbr={homeAbbr} name={game.home_sp_name} spStats={homeSP} align="right" mlbId={homeMlbId} headshotId={homeSPMlbId} nameSlug={homeSPInfo?.name_slug} teamUrlName={homeUrlName} season={season} statSeason={homeSPStatSeason} />
              </div>
            </div>
          )}

          {/* Away: Team Stats (scheduled) or H2H Lineup (final / live) */}
          {isScheduled
            ? (hasTeamStats && <TeamStatsCard abbr={awayAbbr} batting={awayBatting} pitching={awayPitching} />)
            : (hasLineup    && <LineupCard    abbr={awayAbbr} batters={awayBatters}  pitchers={awayPitchers} />)
          }

          {/* Recent Form */}
          {hasLast10 && (
            <div className="detail-card">
              <h3 className="card-title">Recent Form — Last 10
                {awayLast10Summary?.streak_code && homeLast10Summary?.streak_code && (
                  <span className="card-title-sub"> · Streak: {awayAbbr} {awayLast10Summary.streak_code} / {homeAbbr} {homeLast10Summary.streak_code}</span>
                )}
              </h3>
              <div className="form-scroll-body">
              <div className="form-section">
                <div className="form-col">
                  <p className="form-team-label">{awayAbbr}</p>
                  <p className="form-record">{awayWins}-{awayLosses}</p>
                  <div className="form-track">
                    {awayForm.map((r, i) => <FormDot key={i} result={r} />)}
                  </div>
                </div>
                <div className="form-divider" />
                <div className="form-col form-col-right">
                  <p className="form-team-label">{homeAbbr}</p>
                  <p className="form-record">{homeWins}-{homeLosses}</p>
                  <div className="form-track">
                    {homeForm.map((r, i) => <FormDot key={i} result={r} />)}
                  </div>
                </div>
              </div>

              {/* Game-by-game log */}
              {(awayGames.length > 0 || homeGames.length > 0) && (
                <div className="form-game-log">
                  {Array.from({ length: Math.max(awayGames.length, homeGames.length) }, (_, i) => {
                    const a = awayGames[i];
                    const h = homeGames[i];
                    return (
                      <div key={i} className="form-log-row">
                        {a ? (
                          <Link
                            to={`/mlb-schedule/${a.gameId}`}
                            state={{ game: a.rawGame }}
                            className="form-log-left flog-row-link"
                          >
                            <span className="flog-opp">
                              <span className="flog-at">{a.isHome ? 'vs' : '@'}</span>
                              {a.oppMlbId && <img src={logoUrl(a.oppMlbId)} alt={a.oppAbbr} className="flog-team-logo" />}
                              {a.oppAbbr}
                            </span>
                            <span className={`flog-${a.result.toLowerCase()}`}>{a.result} {a.myRuns ?? '?'}-{a.oppRuns ?? '?'}</span>
                          </Link>
                        ) : <span className="form-log-left">—</span>}
                        <div className="form-log-vsep" />
                        {h ? (
                          <Link
                            to={`/mlb-schedule/${h.gameId}`}
                            state={{ game: h.rawGame }}
                            className="form-log-right flog-row-link"
                          >
                            <span className="flog-opp">
                              <span className="flog-at">{h.isHome ? 'vs' : '@'}</span>
                              {h.oppMlbId && <img src={logoUrl(h.oppMlbId)} alt={h.oppAbbr} className="flog-team-logo" />}
                              {h.oppAbbr}
                            </span>
                            <span className={`flog-${h.result.toLowerCase()}`}>{h.myRuns ?? '?'}-{h.oppRuns ?? '?'} {h.result}</span>
                          </Link>
                        ) : <span className="form-log-right">—</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              </div>{/* end form-scroll-body */}
            </div>
          )}

          {/* Home: Team Stats (scheduled) or H2H Lineup (final / live) */}
          {isScheduled
            ? (hasTeamStats && <TeamStatsCard abbr={homeAbbr} batting={homeBatting} pitching={homePitching} />)
            : (hasLineup    && <LineupCard    abbr={homeAbbr} batters={homeBatters}  pitchers={homePitchers} />)
          }

          {/* ── Head to Head Summary ──────────────────────────────────────── */}
          {hasH2h && (
            <div className="detail-card h2h-card">
              <h3 className="card-title">
                Head to Head
                <span className="card-title-sub"> — Last {h2h.summary.games_played} Meetings</span>
              </h3>

              {/* Win record bar */}
              <div className="h2h-record-section">
                <div className="h2h-team-win-block">
                  <span className="h2h-team-abbr">{awayAbbr}</span>
                  <span className="h2h-win-count">{h2hAwaySum?.wins ?? '—'}</span>
                  <span className="h2h-wins-label">Wins</span>
                </div>

                <div className="h2h-bar-wrap">
                  <div className="h2h-bar">
                    {h2h.summary.games_played > 0 && (
                      <>
                        <div
                          className="h2h-bar-away"
                          style={{ width: `${((h2hAwaySum?.wins ?? 0) / h2h.summary.games_played) * 100}%` }}
                        />
                        <div className="h2h-bar-neutral" style={{ flex: 1 }} />
                        <div
                          className="h2h-bar-home"
                          style={{ width: `${((h2hHomeSum?.wins ?? 0) / h2h.summary.games_played) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                  <span className="h2h-games-label">{h2h.summary.games_played} games</span>
                </div>

                <div className="h2h-team-win-block">
                  <span className="h2h-team-abbr">{homeAbbr}</span>
                  <span className="h2h-win-count">{h2hHomeSum?.wins ?? '—'}</span>
                  <span className="h2h-wins-label">Wins</span>
                </div>
              </div>

              {/* Stat comparisons */}
              <div className="stat-comparison-header">
                <span>{awayAbbr}</span>
                <span></span>
                <span>{homeAbbr}</span>
              </div>
              <StatRow label="Avg R/Game"   away={h2hAwaySum?.avg_runs_per_game?.toFixed(1) ?? '—'} home={h2hHomeSum?.avg_runs_per_game?.toFixed(1) ?? '—'} />
              <StatRow label="Avg H/Game"   away={h2hAwaySum?.avg_hits_per_game?.toFixed(1) ?? '—'} home={h2hHomeSum?.avg_hits_per_game?.toFixed(1) ?? '—'} />
              <StatRow label="Errors"       away={h2hAwaySum?.errors ?? '—'} home={h2hHomeSum?.errors ?? '—'} lowerIsBetter />
              <StatRow label="LOB"          away={h2hAwaySum?.lob ?? '—'} home={h2hHomeSum?.lob ?? '—'} lowerIsBetter />
              <StatRow label="Biggest Win"  away={h2hAwaySum?.largest_win_margin != null ? `+${h2hAwaySum.largest_win_margin}` : '—'} home={h2hHomeSum?.largest_win_margin != null ? `+${h2hHomeSum.largest_win_margin}` : '—'} />

              {/* Totals footer */}
              <div className="h2h-totals-row">
                <span className="h2h-total-label">Runs</span>
                <span className="h2h-total-val">{h2h.summary.total_runs}</span>
                <span className="h2h-total-sub">({(h2h.summary.total_runs / h2h.summary.games_played).toFixed(1)}/gm)</span>
                <span className="h2h-totals-sep">·</span>
                <span className="h2h-total-label">Hits</span>
                <span className="h2h-total-val">{h2h.summary.total_hits}</span>
                <span className="h2h-total-sub">({(h2h.summary.total_hits / h2h.summary.games_played).toFixed(1)}/gm)</span>
                {h2h.summary.avg_run_margin != null && (
                  <>
                    <span className="h2h-totals-sep">·</span>
                    <span className="h2h-total-label">Avg Margin</span>
                    <span className="h2h-total-val">{h2h.summary.avg_run_margin.toFixed(1)}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Head to Head Game Log ─────────────────────────────────────── */}
          {hasH2h && (
            <div className="detail-card h2h-card">
              <h3 className="card-title">H2H Game Log</h3>
              <div className="h2h-table-wrapper">
                <table className="h2h-log-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Site</th>
                      <th>{awayAbbr}</th>
                      <th>{homeAbbr}</th>
                      <th>1st Runs</th>
                      <th>F5 Runs</th>
                      <th>{awayAbbr} SP</th>
                      <th>{homeAbbr} SP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h2h.games.map((g, idx) => {
                      // Map team_a/team_b to current away/home teams
                      const awayIsTeamA = h2h.summary.team_a?.team_id === game.away_team_id;
                      const tA = awayIsTeamA ? g.team_a : g.team_b;
                      const tB = awayIsTeamA ? g.team_b : g.team_a;
                      // Prefer explicit winning_team_id; fall back to team_a_won mapping
                      const teamAWon = g.winning_team_id != null
                        ? g.winning_team_id === game.away_team_id
                        : (awayIsTeamA ? g.team_a_won : !g.team_a_won);
                      const siteLabel = tA.is_home ? `vs ${tB.team_abbr}` : `@ ${tB.team_abbr}`;
                      const dateShort = g.date
                        ? new Date(g.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—';
                      return (
                        <tr key={g.game_pk ?? idx}>
                          <td className="h2h-date">{dateShort}</td>
                          <td className="h2h-location">{siteLabel}</td>
                          <td className={`h2h-score${teamAWon ? ' h2h-score-win' : ' h2h-score-loss'}`}>{tA.runs}</td>
                          <td className={`h2h-score${!teamAWon ? ' h2h-score-win' : ' h2h-score-loss'}`}>{tB.runs}</td>
                          <td className="h2h-1st">
                            {tA['1st_inning_runs'] != null && tB['1st_inning_runs'] != null
                              ? `${tA['1st_inning_runs']}–${tB['1st_inning_runs']}` : '—'}
                          </td>
                          <td className="h2h-f5">
                            {tA['5_inning_runs'] != null && tB['5_inning_runs'] != null
                              ? `${tA['5_inning_runs']}–${tB['5_inning_runs']}` : '—'}
                          </td>
                          <td className="h2h-sp">{tA.sp_name || '—'}</td>
                          <td className="h2h-sp">{tB.sp_name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default MatchupDetail;
