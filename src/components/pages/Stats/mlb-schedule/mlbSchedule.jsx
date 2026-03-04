import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import scheduleService from '../../../../data/services/scheduleService';
import gamesService from '../../../../data/services/gamesService';
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

// Format pitcher name as "J. Smith"
function formatPitcherName(fullName) {
  if (!fullName) return 'TBD';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastName = parts.slice(1).join(' ');
  return `${firstInitial}. ${lastName}`;
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
function MatchupRow({ game, onClick, showDate, boxscore }) {
  const awayMlbId = getTeamMlbId(game.away_team_id);
  const homeMlbId = getTeamMlbId(game.home_team_id);

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
          <span className="matchup-team-name">{game.away_team_name || 'Away'}</span>
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
          <span className="matchup-team-name">{game.home_team_name || 'Home'}</span>
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

// ─── Skeleton Rows ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="matchup-row skeleton-row" aria-hidden="true">
      <div className="matchup-team away-team">
        <div className="skeleton skeleton-logo" />
        <div className="matchup-team-info">
          <div className="skeleton skeleton-text wide" />
          <div className="skeleton skeleton-text narrow" />
        </div>
      </div>
      <div className="matchup-center">
        <div className="skeleton skeleton-text narrow" />
        <div className="matchup-vs">@</div>
      </div>
      <div className="matchup-team home-team">
        <div className="matchup-team-info home-info">
          <div className="skeleton skeleton-text wide" />
          <div className="skeleton skeleton-text narrow" />
        </div>
        <div className="skeleton skeleton-logo" />
      </div>
      <div className="matchup-meta">
        <div className="skeleton skeleton-text wide" />
      </div>
      <div className="matchup-arrow" />
    </div>
  );
}

// ─── Date-grouped list with pagination ───────────────────────────────────────
const DATES_PER_PAGE = 3;

function groupGamesByDate(games) {
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
  return groups;
}

function GroupedGamesList({ games, onClick, prevLabel = '← Prev', nextLabel = 'Next →' }) {
  const [page, setPage] = useState(0);
  const allGroups = groupGamesByDate(games);
  const totalPages = Math.ceil(allGroups.length / DATES_PER_PAGE);
  const pageGroups = allGroups.slice(page * DATES_PER_PAGE, (page + 1) * DATES_PER_PAGE);

  const goTo = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="schedule-list">
        {pageGroups.map(group => (
          <div key={group.dateKey} className="date-group">
            <div className="date-group-header">{group.label}</div>
            {group.games.map(game => (
              <MatchupRow
                key={game.id ?? game.game_pk}
                game={game}
                onClick={onClick}
                showDate={false}
              />
            ))}
          </div>
        ))}
      </div>

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

// ─── Main Component ───────────────────────────────────────────────────────────
function MLBSchedule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveBoxscores, setLiveBoxscores] = useState({});

  const fetchGames = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (tab === 'today') {
        data = await scheduleService.getTodayGames();
        // Always pin "Today" to the current calendar date — prevent the backend
        // from rolling over to tomorrow's games after today's games finish.
        const todayStr = new Date().toISOString().slice(0, 10);
        data = Array.isArray(data) ? data.filter(g => (g.date ?? '').slice(0, 10) === todayStr) : [];
      } else if (tab === 'upcoming') {
        data = await scheduleService.getUpcomingGames({ limit: 50 });
        const todayStr = new Date().toISOString().slice(0, 10);
        data = Array.isArray(data) ? data.filter(g => (g.date ?? '').slice(0, 10) > todayStr) : [];
      } else {
        data = await scheduleService.getPriorGames();
      }
      setGames(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load schedule.');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchGames(activeTab);
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

  const handleMatchupClick = (gameId) => {
    const selectedGame = games.find(g => (g.id ?? g.game_pk) === gameId);
    navigate(`/mlb-schedule/${gameId}`, { state: { game: selectedGame ?? null } });
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

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
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="schedule-content">
        <div className="container">
          {loading && (
            <div className="schedule-list">
              {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
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
                // Today tab — single date group with header
                <div className="schedule-list">
                  <div className="date-group">
                    <div className="date-group-header">
                      {formatGameDate(games[0]?.date)}
                    </div>
                    {games.map((game) => (
                      <MatchupRow
                        key={game.id ?? game.game_pk}
                        game={game}
                        onClick={handleMatchupClick}
                        showDate={false}
                        boxscore={liveBoxscores[game.game_pk ?? game.id] ?? null}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MLBSchedule;
