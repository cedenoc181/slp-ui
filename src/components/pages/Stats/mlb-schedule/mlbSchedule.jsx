import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import scheduleService from '../../../../data/services/scheduleService';
import gamesService from '../../../../data/services/gamesService';
import predictionsService from '../../../../data/services/predictionsService';
import { getTeamById } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/mlb-schedule.css';

/*
 * GameLogSchema fields (from backend):
 *   id, date, game_time (HH:MM, already local time), game_pk,
 *   season, season_type ("spring" | "regular" | "postseason"), status,
 *   home_team_id, away_team_id, home_team_name, away_team_name,
 *   home_sp_id, away_sp_id, home_sp_name, away_sp_name,
 *   home_runs_score, away_runs_score, home_hits, away_hits,
 *   home_errors, away_errors, home_lob, away_lob,
 *   winning_team_id, run_diff, postseason_round,
 *   series_game_number, series_winner_team_id, inning_stats
 */

// Look up the MLB logo ID from the backend's internal team_id
function getTeamMlbId(teamId) {
  if (!teamId) return null;
  return getTeamById(teamId)?.mlbId || null;
}

function logoUrl(mlbId) {
  return `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
}

// Format a game date string for display
function formatGameDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Find the earliest regular season game date from a list of games
function findOpeningDayDate(allGames) {
  const regularSeasonGames = allGames.filter(g => g.season_type === 'regular');
  if (regularSeasonGames.length === 0) return null;
  
  // Sort by date ascending and return the first date (YYYY-MM-DD format)
  const sorted = [...regularSeasonGames].sort((a, b) => {
    const dateA = (a.date ?? '').slice(0, 10);
    const dateB = (b.date ?? '').slice(0, 10);
    return dateA.localeCompare(dateB);
  });
  
  // Return just the date portion (YYYY-MM-DD)
  const firstDate = sorted[0]?.date;
  if (!firstDate) return null;
  
  // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS" formats
  return firstDate.slice(0, 10);
}

// Check if game time is evening (7pm or later).
// Handles both 24-hour "20:05" and 12-hour "8:05 PM ET" formats.
function isEveningGame(gameTime) {
  if (!gameTime) return false;
  const str = String(gameTime).trim();

  // 12-hour format: "8:05 PM ET", "7:10 PM", etc.
  const match = str.match(/(\d+)(?::\d+)?\s*(AM|PM)/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const meridiem = match[2].toUpperCase();
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour >= 19;
  }

  // 24-hour format: "20:05", "19:05"
  const hour = parseInt(str.split(':')[0], 10);
  return !isNaN(hour) && hour >= 19;
}

// Check if a date is Opening Day for the season
function isOpeningDay(dateStr, games = [], openingDayDate = null) {
  if (!dateStr || !openingDayDate) return false;
  
  // Normalize both dates to YYYY-MM-DD format for comparison
  const dateKey = dateStr.slice(0, 10);
  const hasRegularSeasonGame = games.some(g => g.season_type === 'regular');
  
  return dateKey === openingDayDate && hasRegularSeasonGame;
}

// Determine "Opening Day" vs "Opening Night" based on game times
function getOpeningDayLabel(games) {
  const regularGames = games.filter(g => g.season_type === 'regular');
  // Check if majority of games are evening games (7pm+)
  const eveningGames = regularGames.filter(g => isEveningGame(g.game_time));
  const isNight = eveningGames.length >= regularGames.length / 2;
  return isNight ? 'Opening Night' : 'Opening Day';
}

function getDateGroupLabel(dateStr, games = [], openingDayDate = null) {
  const baseLabel = formatGameDate(dateStr);
  
  if (openingDayDate && isOpeningDay(dateStr, games, openingDayDate)) {
    // Extract year from the date string (YYYY-MM-DD format)
    const season = dateStr.slice(0, 4);
    const dayOrNight = getOpeningDayLabel(games);
    return `${baseLabel} · ${dayOrNight} ${season} 🎉`;
  }
  
  return baseLabel;
}

// Format pitcher name as "J. Smith"
function formatPitcherName(fullName) {
  if (!fullName) return 'TBD';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastName = parts.slice(1).join(' ');
  return `${firstInitial}. ${lastName}`;
}

// Format moneyline as "+150" / "-130"
function formatMoneyline(value) {
  if (value == null) return null;
  const num = Math.round(value);
  return num >= 0 ? `+${num}` : String(num);
}

// Format over/under as "O/U 8.5"
function formatTotal(value) {
  if (value == null) return null;
  return `O/U ${value}`;
}

// Derive current inning from boxscore innings array
function getCurrentInning(boxscore) {
  if (!boxscore?.innings?.length) return null;
  const last = boxscore.innings[boxscore.innings.length - 1];
  const num  = last.inning ?? boxscore.innings.length;
  const half = (last.home_runs > 0) ? 'Bot' : 'Top';
  return { num, half };
}

// ─── Matchup Row ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function MatchupRow({ game, onClick, showDate, boxscore }) {
  const awayMlbId = getTeamMlbId(game.away_team_id);
  const homeMlbId = getTeamMlbId(game.home_team_id);
  const awayAbbr = getTeamById(game.away_team_id)?.id || game.away_team_name;
  const homeAbbr = getTeamById(game.home_team_id)?.id || game.home_team_name;

  const statusLower = game.status?.toLowerCase() || '';
  const isFinal = statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed' || statusLower === 'completed early';
  const isLive = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');
  const isScheduled = !isFinal && !isLive;

  const inning = isLive ? getCurrentInning(boxscore) : null;
  const statusLabel = isFinal
    ? `F: ${game.away_runs_score} - ${game.home_runs_score}`
    : isLive
      ? inning
        ? `${inning.half} ${inning.num} · ${game.away_runs_score ?? 0}-${game.home_runs_score ?? 0}`
        : `Live · ${game.away_runs_score ?? 0}-${game.home_runs_score ?? 0}`
      : game.game_time || 'TBD';

  const hasPitchers = game.away_sp_name || game.home_sp_name;

  return (
    <div
      className="matchup-row"
      onClick={() => onClick(game.id ?? game.game_pk)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(game.id ?? game.game_pk)}
    >
      {/* Away Team */}
      <div className="matchup-team away-team">
        {awayMlbId && (
          <img src={logoUrl(awayMlbId)} alt={game.away_team_name} className="matchup-team-logo" />
        )}
        <div className="matchup-team-info">
          <span className="matchup-team-name">
            <span className="team-name-full">{game.away_team_name || 'Away'}</span>
            <span className="team-name-abbr">{awayAbbr}</span>
          </span>
          {isFinal && (
            <span className={`matchup-team-score ${game.winning_team_id === game.away_team_id ? 'score-win' : 'score-loss'}`}>
              {game.away_runs_score}
            </span>
          )}
        </div>
      </div>

      {/* Center: Status / Time */}
      <div className="matchup-center">
        <div className={`matchup-status ${isLive ? 'status-live' : ''}`}>{statusLabel}</div>
        {isFinal && statusLower === 'completed early' && (
          <span className="hero-badge-sub">Completed Early</span>
        )}
        <div className="matchup-vs">@</div>
        {showDate && <div className="matchup-venue">{formatGameDate(game.date)}</div>}
        {game.season_type === 'spring' && (
          <div className="matchup-venue">Spring Training</div>
        )}
        {game.season_type === 'postseason' && (
          <div className="matchup-venue">Postseason</div>
        )}
      </div>

      {/* Home Team */}
      <div className="matchup-team home-team">
        <div className="matchup-team-info home-info">
          <span className="matchup-team-name">
            <span className="team-name-full">{game.home_team_name || 'Home'}</span>
            <span className="team-name-abbr">{homeAbbr}</span>
          </span>
          {isFinal && (
            <span className={`matchup-team-score ${game.winning_team_id === game.home_team_id ? 'score-win' : 'score-loss'}`}>
              {game.home_runs_score}
            </span>
          )}
        </div>
        {homeMlbId && (
          <img src={logoUrl(homeMlbId)} alt={game.home_team_name} className="matchup-team-logo" />
        )}
      </div>

      {/* Pitchers */}
      {(hasPitchers || isScheduled) && (
        <div className="matchup-meta">
          <div className="matchup-pitchers">
            <span className="pitcher-label">SP:</span>
            <span className="pitcher-name">{game.away_sp_name ? formatPitcherName(game.away_sp_name) : 'TBD'}</span>
            <span className="pitcher-sep">vs</span>
            <span className="pitcher-name">{game.home_sp_name ? formatPitcherName(game.home_sp_name) : 'TBD'}</span>
          </div>
        </div>
      )}

      <div className="matchup-arrow">›</div>
    </div>
  );
}

// ─── Compact Card (Alternative Layout) ────────────────────────────────────────
function GameCardCompact({ game, onClick, boxscore, prediction }) {
  const awayMlbId = getTeamMlbId(game.away_team_id);
  const homeMlbId = getTeamMlbId(game.home_team_id);

  const statusLower = game.status?.toLowerCase() || '';
  const isFinal = statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed' || statusLower === 'completed early';
  const isLive = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');

  const inning = isLive ? getCurrentInning(boxscore) : null;

  const timeClass = isFinal ? 'final' : isLive ? 'live' : '';
  const timeLabel = isFinal
    ? 'FINAL'
    : isLive
      ? inning ? `LIVE · ${inning.half} ${inning.num}` : 'LIVE'
      : game.game_time || 'TBD';

  // Extract odds from prediction data
  const odds = prediction?.odds;
  const homeML = formatMoneyline(odds?.home_moneyline_game);
  const awayML = formatMoneyline(odds?.away_moneyline_game);
  const total = formatTotal(odds?.over_under_line_game);
  const hasOdds = !isFinal && (homeML || awayML || total);

  return (
    <div
      className="game-card-compact"
      onClick={() => onClick(game.id ?? game.game_pk)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(game.id ?? game.game_pk)}
    >
      {/* Header: Time + Venue */}
      <div className="compact-header">
        <span className={`compact-time ${timeClass}`}>{timeLabel}</span>
        {game.season_type === 'spring' && <span className="compact-venue">Spring Training</span>}
        {game.season_type === 'postseason' && <span className="compact-venue">Postseason</span>}
      </div>

      {/* Teams Matchup */}
      <div className="compact-matchup">
        <div className="compact-team away">
          {awayMlbId && <img src={logoUrl(awayMlbId)} alt={game.away_team_name} />}
          <div className="compact-team-info">
            <span className="compact-team-name">{game.away_team_name || 'Away'}</span>
            <span className="compact-team-record">{getTeamById(game.away_team_id)?.id || ''}</span>
          </div>
        </div>

        <div className="compact-center">
          {(isFinal || isLive) ? (
            <>
              <div className="compact-score">
                <span className={`compact-score-num ${game.winning_team_id === game.away_team_id ? 'winner' : ''}`}>
                  {game.away_runs_score ?? 0}
                </span>
                <span className="compact-score-divider">-</span>
                <span className={`compact-score-num ${game.winning_team_id === game.home_team_id ? 'winner' : ''}`}>
                  {game.home_runs_score ?? 0}
                </span>
              </div>
              {isLive && inning && <span className="compact-inning">{inning.half} {inning.num}</span>}
            </>
          ) : (
            <span className="compact-vs">@</span>
          )}
        </div>

        <div className="compact-team home">
          {homeMlbId && <img src={logoUrl(homeMlbId)} alt={game.home_team_name} />}
          <div className="compact-team-info">
            <span className="compact-team-name">{game.home_team_name || 'Home'}</span>
            <span className="compact-team-record">{getTeamById(game.home_team_id)?.id || ''}</span>
          </div>
        </div>
      </div>

      {/* Footer: Pitchers + Odds */}
      <div className="compact-footer">
        {(game.away_sp_name || game.home_sp_name) && (
          <div className="compact-pitchers">
            <span>{formatPitcherName(game.away_sp_name)}</span>
            <span style={{ color: '#555' }}>vs</span>
            <span>{formatPitcherName(game.home_sp_name)}</span>
          </div>
        )}
        {hasOdds && (
          <div className="compact-odds">
            {awayML && <span className={`compact-odds-item ${awayML.startsWith('+') ? 'positive' : 'negative'}`}>{awayML}</span>}
            {homeML && <span className={`compact-odds-item ${homeML.startsWith('+') ? 'positive' : 'negative'}`}>{homeML}</span>}
            {total && <span className="compact-odds-item">{total}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="game-card-compact skeleton-card" aria-hidden="true">
      <div className="compact-header">
        <div className="skeleton skeleton-text-sm" style={{ width: '60px' }} />
        <div className="skeleton skeleton-text-sm" style={{ width: '80px' }} />
      </div>
      <div className="compact-matchup">
        <div className="compact-team away">
          <div className="skeleton skeleton-logo-sm" />
          <div className="compact-team-info">
            <div className="skeleton skeleton-text" style={{ width: '70px' }} />
            <div className="skeleton skeleton-text-sm" style={{ width: '30px' }} />
          </div>
        </div>
        <div className="compact-center">
          <div className="skeleton skeleton-text-sm" style={{ width: '20px' }} />
        </div>
        <div className="compact-team home">
          <div className="skeleton skeleton-logo-sm" />
          <div className="compact-team-info">
            <div className="skeleton skeleton-text" style={{ width: '70px' }} />
            <div className="skeleton skeleton-text-sm" style={{ width: '30px' }} />
          </div>
        </div>
      </div>
      <div className="compact-footer">
        <div className="skeleton skeleton-text" style={{ width: '120px' }} />
      </div>
    </div>
  );
}

// ─── Date-grouped list with pagination ───────────────────────────────────────
const DATES_PER_PAGE = 3;

function groupGamesByDate(games, openingDayDate = null) {
  const groups = [];
  let current = null;
  for (const game of games) {
    const dateKey = game.date ? game.date.slice(0, 10) : 'unknown';
    if (!current || current.dateKey !== dateKey) {
      current = { dateKey, label: formatGameDate(game.date), games: [] };
      groups.push(current);
    }
    current.games.push(game);
  }
  // Update labels and opening day flag after grouping
  groups.forEach(group => {
    group.label = getDateGroupLabel(group.dateKey, group.games, openingDayDate);
    group.isOpeningDay = isOpeningDay(group.dateKey, group.games, openingDayDate);
  });
  return groups;
}

function GroupedGamesList({ games, onClick, prevLabel = '← Prev', nextLabel = 'Next →' }) {
  const [page, setPage] = useState(0);
  
  // Find opening day date from all games
  const openingDayDate = findOpeningDayDate(games);
  
  const allGroups = groupGamesByDate(games, openingDayDate);
  const totalPages = Math.ceil(allGroups.length / DATES_PER_PAGE);
  const pageGroups = allGroups.slice(page * DATES_PER_PAGE, (page + 1) * DATES_PER_PAGE);

  const goTo = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {pageGroups.map(group => (
        <div key={group.dateKey} className="date-group" style={{ marginBottom: '1rem' }}>
          <div className={`date-group-header ${group.isOpeningDay ? 'opening-night' : ''}`}>{group.label}</div>
          <div className="schedule-card-grid">
            {group.games.map(game => (
              <GameCardCompact
                key={game.id ?? game.game_pk}
                game={game}
                onClick={onClick}
                boxscore={null}
              />
            ))}
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
          >
            {prevLabel}
          </button>
          <span className="pagination-info">Page {page + 1} of {totalPages}</span>
          <button
            className="pagination-btn"
            onClick={() => goTo(page + 1)}
            disabled={page === totalPages - 1}
          >
            {nextLabel}
          </button>
        </div>
      )}
    </>
  );
}

// ─── Prior Results (grouped by date, newest first) ───────────────────────────
function PriorResults({ games, onClick }) {
  return (
    <GroupedGamesList
      games={games}
      onClick={onClick}
      prevLabel="← Newer"
      nextLabel="Older →"
    />
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'today',    label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'prior',    label: 'Final' },
];

// Parse a game_time string to minutes from midnight for numeric sorting.
// Handles 24h "10:10" / "4:10" and 12h "10:10 PM ET" / "4:10 PM" formats.
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 9999;
  const str = String(timeStr).trim();
  const ampm = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const mer = ampm[3].toUpperCase();
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const parts = str.split(':');
  if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  return 9999;
}

// Sort today's games: live first, then scheduled (by game time), then final
function sortTodayGames(games) {
  const priority = (g) => {
    const s = (g.status || '').toLowerCase();
    if (s.includes('progress') || s === 'live' || s.includes('inning')) return 0;
    if (s === 'final' || s === 'game over' || s === 'completed' || s === 'completed early') return 2;
    return 1; // scheduled
  };
  return [...games].sort((a, b) => {
    const pd = priority(a) - priority(b);
    if (pd !== 0) return pd;
    return parseTimeToMinutes(a.game_time) - parseTimeToMinutes(b.game_time);
  });
}

// ─── Season type helper ───────────────────────────────────────────────────────
// Jan–Feb  → Spring only            ['S']
// Mar–Sep  → Spring + Regular       ['S', 'R']  (Opening Day can be late March)
// Oct+     → Spring + Regular + PS  ['S', 'R', 'P']
function getPriorSeasonTypes() {
  const month = new Date().getMonth() + 1; // 1–12
  if (month <= 2) return ['S'];
  if (month <= 9) return ['S', 'R'];
  return ['S', 'R', 'P'];
}

// ─── Main Component ───────────────────────────────────────────────────────────
function MLBSchedule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveBoxscores, setLiveBoxscores] = useState({});
  const [predictions, setPredictions] = useState({});

  const fetchGames = useCallback(async (tab, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      let data;
      if (tab === 'today') {
        data = await scheduleService.getTodayGames();
        data = Array.isArray(data) ? data : [];

        // If the backend has rolled over to tomorrow, check for any live games
        // still running from today's ET date and prepend them.
        const etToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
        const backendDate = (data[0]?.date ?? '').slice(0, 10);
        if (backendDate > etToday) {
          try {
            const prior = await scheduleService.getPriorGames({ season: new Date().getFullYear(), seasonType: 'R', limit: 30 });
            const todayLive = (Array.isArray(prior) ? prior : []).filter(g => {
              const s = (g.status || '').toLowerCase();
              return g.date?.slice(0, 10) === etToday &&
                (s.includes('progress') || s === 'live' || s.includes('inning'));
            });
            if (todayLive.length > 0) data = [...todayLive, ...data];
          } catch { /* ignore — tomorrow's slate still shown */ }
        }

        data = sortTodayGames(data);
      } else if (tab === 'upcoming') {
        const yr    = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        const st    = month <= 3 ? 'S' : month <= 9 ? 'R' : 'P';
        data = await scheduleService.getUpcomingGames({ season: yr, seasonType: st, limit: 50 });
        const etToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
        data = Array.isArray(data) ? data.filter(g => (g.date ?? '').slice(0, 10) > etToday) : [];
      } else {
        const seasonTypes = getPriorSeasonTypes();
        const results = await Promise.all(
          seasonTypes.map(st => scheduleService.getPriorGames({ season: 2026, seasonType: st, limit: null }))
        );
        data = results.flat().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
      }
      setGames(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load schedule.');
      setGames([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchGames(activeTab);
  }, [activeTab, fetchGames]);

  // Poll today's games every 60 s so in-progress statuses stay current
  useEffect(() => {
    if (activeTab !== 'today') return;
    const id = setInterval(() => fetchGames('today', { silent: true }), 60_000);
    return () => clearInterval(id);
  }, [activeTab, fetchGames]);

  // Fetch boxscores for live games whenever today's game list updates
  useEffect(() => {
    if (activeTab !== 'today') return;
    const liveGames = games.filter(g => {
      const s = (g.status || '').toLowerCase();
      return s.includes('progress') || s === 'live' || s.includes('inning');
    });
    if (liveGames.length === 0) { setLiveBoxscores({}); return; }

    Promise.allSettled(
      liveGames.map(g => gamesService.getBoxscore(g.game_pk ?? g.id))
    ).then(results => {
      const map = {};
      liveGames.forEach((g, i) => {
        const res = results[i];
        if (res.status === 'fulfilled' && res.value?.innings?.length) {
          map[g.game_pk ?? g.id] = res.value;
        }
      });
      setLiveBoxscores(map);
    });
  }, [games, activeTab]);

  // Fetch predictions for today's games
  useEffect(() => {
    if (activeTab !== 'today') {
      setPredictions({});
      return;
    }

    predictionsService.getToday().then(data => {
      if (!Array.isArray(data)) { setPredictions({}); return; }
      const map = {};
      data.forEach(p => {
        if (p.game_pk) map[p.game_pk] = p;
      });
      setPredictions(map);
    }).catch(() => {
      setPredictions({});
    });
  }, [activeTab]);

  const handleMatchupClick = (gameId) => {
    const selectedGame = games.find(g => (g.id ?? g.game_pk) === gameId);
    navigate(`/mlb-schedule/${gameId}`, { state: { game: selectedGame ?? null } });
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  // Use ET timezone so rollover detection is accurate regardless of UTC offset
  const etTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  const isTomorrow = activeTab === 'today' && games.length > 0 && (games[0]?.date ?? '').slice(0, 10) > etTodayStr;

  const emptyMessage = {
    today:    'No games scheduled for today.',
    upcoming: 'No upcoming games found.',
    prior:    'No recent completed games found.',
  }[activeTab];

  return (
    <div className="mlb-schedule-page">
      {/* Header */}
      <div className="schedule-header">
        <div className="container">
          <h1>MLB Schedule</h1>
          <p className="header-subtitle">Game matchups, probable starters &amp; results</p>

          {/* Tab Navigation */}
          <div className="schedule-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`schedule-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.key === 'today' ? (isTomorrow ? 'Tomorrow' : 'Today') : tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="schedule-content">
        <div className="container">
          {loading && (
            <div className="schedule-card-grid">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && error && (
            <div className="schedule-empty">
              <div className="empty-icon">⚾</div>
              <p className="empty-title">Schedule unavailable</p>
              <p className="empty-subtitle">
                Unable to load the schedule right now. The backend endpoint may still be deploying.
              </p>
            </div>
          )}

          {!loading && !error && games.length === 0 && (
            <div className="schedule-empty">
              <div className="empty-icon">⚾</div>
              <p className="empty-title">No games found</p>
              <p className="empty-subtitle">{emptyMessage}</p>
            </div>
          )}

          {!loading && !error && games.length > 0 && (
            <>
              <p className="game-count">{games.length} game{games.length !== 1 ? 's' : ''}</p>
              {activeTab === 'prior' ? (
                <PriorResults games={games} onClick={handleMatchupClick} />
              ) : activeTab === 'upcoming' ? (
                <GroupedGamesList games={games} onClick={handleMatchupClick} />
              ) : (
                // Today tab — Card Grid Layout
                (() => {
                  const openingDayDate = findOpeningDayDate(games);
                  const todayIsOpeningDay = isOpeningDay(games[0]?.date, games, openingDayDate);
                  return (
                    <>
                      <div className={`date-group-header ${todayIsOpeningDay ? 'opening-night' : ''}`} style={{ marginBottom: '0.75rem' }}>
                        {getDateGroupLabel(games[0]?.date, games, openingDayDate)}
                      </div>
                      <div className="schedule-card-grid">
                        {games.map((game) => (
                          <GameCardCompact
                            key={game.id ?? game.game_pk}
                            game={game}
                            onClick={handleMatchupClick}
                            boxscore={liveBoxscores[game.game_pk ?? game.id] ?? null}
                            prediction={predictions[game.game_pk ?? game.id] ?? null}
                          />
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MLBSchedule;
