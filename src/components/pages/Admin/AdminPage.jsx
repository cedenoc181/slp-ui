import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../lib/supabaseClient';
import predictionsService from '../../../data/services/predictionsService';
import predictionsPerformanceService from '../../../data/services/predictionsPerformanceService';
import { TEAM_METADATA } from '../../../data/constants/apiConstants';
import { MOCK_CAMPAIGN_HISTORY, audienceMeta, formatCampaignSentAt } from '../../../data/constants/campaignsMockData';
import AlertComposerModal from './AlertComposerModal';
import '../../../styles/admin-page-styling/admin.css';
import '../../../styles/alert-modal.css';

// Lookup mlbId from team abbreviation for logo rendering
function teamMlbId(abbr) {
  if (!abbr) return null;
  const meta = TEAM_METADATA[String(abbr).toUpperCase()];
  return meta?.mlbId ?? null;
}

function teamLogoUrl(mlbId) {
  return `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
}

// ─── Prediction unlock helpers (mirrors GameProps.jsx) ────────────────────────

const UNLOCK_CAP_MINS = 16 * 60; // 4:00 PM ET

function parseGameTimeMinutes(game) {
  const t = game.game_time_et || game.game_time || '';
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 9999;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const mer  = m[3].toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + mins;
}

function getUnlockMins(games) {
  const mins = games.map(parseGameTimeMinutes).filter(x => x < 9999);
  if (!mins.length) return null;
  return Math.min(Math.min(...mins) - 120, UNLOCK_CAP_MINS);
}

function etMinutesNow() {
  const parts = new Date()
    .toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
    .split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + parseInt(parts[2], 10) / 60;
}

function formatUnlockLabel(mins) {
  if (mins === null) return null;
  const h   = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m   = String(mins % 60).padStart(2, '0');
  const per = h >= 12 ? 'PM' : 'AM';
  const dh  = h % 12 || 12;
  return `${dh}:${m} ${per} ET`;
}

// ─── Wedge: Prediction Countdown ──────────────────────────────────────────────

function CountdownWedge({ games, loading }) {
  const [, tick] = useState(0);

  // Tick every second so the countdown stays live
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const unlockMins = games ? getUnlockMins(games) : null;
  const unlockLabel = formatUnlockLabel(unlockMins);
  const nowMins = etMinutesNow();
  const remaining = unlockMins !== null ? unlockMins - nowMins : null;
  const unlocked = remaining !== null && remaining <= 0;

  let state = 'loading';
  if (!loading) {
    if (!games || games.length === 0) state = 'none';
    else if (unlocked) state = 'live';
    else state = 'countdown';
  }

  const hh = remaining ? String(Math.floor(remaining / 60)).padStart(2, '0') : '--';
  const mm = remaining ? String(Math.floor(remaining % 60)).padStart(2, '0') : '--';
  const ss = remaining ? String(Math.floor((remaining * 60) % 60)).padStart(2, '0') : '--';

  return (
    <div className={`admin-wedge admin-wedge--countdown state-${state}`}>
      <div className="admin-wedge__label">Predictions</div>
      {state === 'loading' && <div className="admin-wedge__value">Loading…</div>}
      {state === 'none' && (
        <>
          <div className="admin-wedge__value">No games today</div>
          <div className="admin-wedge__sub">Slate empty</div>
        </>
      )}
      {state === 'live' && (
        <>
          <div className="admin-wedge__value live">Live</div>
          <div className="admin-wedge__sub">Predictions unlocked · {games.length} game{games.length !== 1 ? 's' : ''}</div>
        </>
      )}
      {state === 'countdown' && (
        <>
          <div className="admin-wedge__value countdown">
            <span>{hh}</span><span className="sep">:</span>
            <span>{mm}</span><span className="sep">:</span>
            <span>{ss}</span>
          </div>
          <div className="admin-wedge__sub">Unlocks {unlockLabel} · {games.length} game{games.length !== 1 ? 's' : ''}</div>
        </>
      )}
    </div>
  );
}

// ─── Wedge: Best / Worst performer ────────────────────────────────────────────

function PerformerWedge({ label, metric, loading, variant }) {
  const navigate = useNavigate();
  const trendColor = variant === 'best' ? '#4ade80' : '#f87171';

  return (
    <button
      className={`admin-wedge admin-wedge--performer admin-wedge--${variant}`}
      onClick={() => navigate('/admin/model-performance')}
      aria-label={`${label} — open model performance`}
    >
      <div className="admin-wedge__label">{label}</div>
      {loading ? (
        <div className="admin-wedge__value">Loading…</div>
      ) : metric ? (
        <>
          <div className="admin-wedge__value" style={{ color: trendColor }}>{metric.accuracy}%</div>
          <div className="admin-wedge__sub">
            {metric.label} · {metric.hits}/{metric.picks} picks
          </div>
        </>
      ) : (
        <>
          <div className="admin-wedge__value">—</div>
          <div className="admin-wedge__sub">No data available</div>
        </>
      )}
      <span className="admin-wedge__arrow" aria-hidden="true">→</span>
    </button>
  );
}

// ─── Wedge: Daily hit rate (ML / Spread / Total) ──────────────────────────────

function HitRateStat({ label, data }) {
  if (!data) {
    return (
      <div className="admin-hitrate__stat">
        <span className="admin-hitrate__stat-label">{label}</span>
        <span className="admin-hitrate__stat-value">—</span>
        <span className="admin-hitrate__stat-sub">No graded picks yet</span>
      </div>
    );
  }
  const { picks, hits, pushes, accuracy } = data;
  const color = accuracy >= 60 ? '#4ade80' : accuracy >= 50 ? '#fbbf24' : '#f87171';
  return (
    <div className="admin-hitrate__stat">
      <span className="admin-hitrate__stat-label">{label}</span>
      <span className="admin-hitrate__stat-value" style={{ color }}>
        {accuracy != null ? `${accuracy}%` : '—'}
      </span>
      <span className="admin-hitrate__stat-sub">
        {hits ?? 0} / {picks ?? 0} correct{pushes ? ` · ${pushes} push${pushes !== 1 ? 'es' : ''}` : ''}
      </span>
    </div>
  );
}

function HitRateWedge({ title, data, loading, error, onClick }) {
  const summary = data?.summary ?? null;
  const gameCount = Array.isArray(data?.games) ? data.games.length : null;
  const clickable = !loading && !error && summary && gameCount;

  const Wrapper = clickable ? 'button' : 'div';
  const wrapperProps = clickable
    ? { type: 'button', onClick, 'aria-label': `${title} — open game report` }
    : {};

  return (
    <Wrapper className={`admin-wedge admin-wedge--hitrate${clickable ? ' admin-wedge--clickable' : ''}`} {...wrapperProps}>
      <div className="admin-wedge__label">
        {title}
        {data?.date && (
          <span className="admin-wedge__date">
            {data.date}{gameCount !== null ? ` · ${gameCount} game${gameCount !== 1 ? 's' : ''}` : ''}
          </span>
        )}
      </div>
      {loading ? (
        <div className="admin-wedge__value">Loading…</div>
      ) : error ? (
        <div className="admin-wedge__sub">Hit rate endpoint not yet live</div>
      ) : (
        <div className="admin-hitrate__grid">
          <HitRateStat label="Moneyline" data={summary?.moneyline} />
          <HitRateStat label="Run Line"  data={summary?.run_line} />
          <HitRateStat label="Totals"    data={summary?.totals} />
        </div>
      )}
      {clickable && <span className="admin-wedge__arrow" aria-hidden="true">→</span>}
    </Wrapper>
  );
}

// ─── Modal: Daily game report ─────────────────────────────────────────────────

function OutcomeDot({ hit, pushed, label }) {
  const className = pushed ? 'mod-dot mod-dot--push'
    : hit             ? 'mod-dot mod-dot--hit'
    : hit === false   ? 'mod-dot mod-dot--miss'
    : 'mod-dot mod-dot--empty';
  return (
    <span className={className} aria-label={`${label}: ${pushed ? 'push' : hit ? 'hit' : 'miss'}`}>
      {pushed ? '–' : hit ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : null}
    </span>
  );
}

// ─── Side drawer: Scout AI picks for a single game ────────────────────────────

const PICK_TYPE_META = {
  'Moneyline': { icon: '💰', color: '#64b5f6', borderColor: 'rgba(100,181,246,0.4)' },
  'Run Line':  { icon: '📏', color: '#4ade80', borderColor: 'rgba(74,222,128,0.4)'  },
  'Total':     { icon: '📈', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)'  },
};

function ResultBadge({ result }) {
  if (!result) return null;
  const className = result === 'win' ? 'admin-pick__result admin-pick__result--win'
    : result === 'loss'  ? 'admin-pick__result admin-pick__result--loss'
    : result === 'push'  ? 'admin-pick__result admin-pick__result--push'
    : 'admin-pick__result';
  return <span className={className}>{result.toUpperCase()}</span>;
}

function PickCard({ type, pick }) {
  if (!pick || pick.pick == null) return null;
  const meta = PICK_TYPE_META[type];
  const prob = pick.model_prob != null ? Math.round(pick.model_prob * 100) : null;
  const price = pick.line_price != null ? (pick.line_price > 0 ? `+${Math.round(pick.line_price)}` : String(Math.round(pick.line_price))) : null;

  return (
    <div className="admin-pick" style={{ borderColor: meta.borderColor }}>
      <div className="admin-pick__header">
        <span className="admin-pick__type" style={{ color: meta.color }}>
          {meta.icon} {type}
        </span>
        <ResultBadge result={pick.result} />
      </div>
      <div className="admin-pick__value">{pick.pick}</div>
      <div className="admin-pick__meta">
        {prob !== null && (
          <div className="admin-pick__meta-item">
            <span>Model Prob</span>
            <strong>{prob}%</strong>
          </div>
        )}
        {price !== null && (
          <div className="admin-pick__meta-item">
            <span>Price</span>
            <strong>{price}</strong>
          </div>
        )}
        {pick.line != null && type !== 'Moneyline' && (
          <div className="admin-pick__meta-item">
            <span>Line</span>
            <strong>{pick.line > 0 ? `+${pick.line}` : pick.line}</strong>
          </div>
        )}
        {pick.actual_total != null && type === 'Total' && (
          <div className="admin-pick__meta-item">
            <span>Actual</span>
            <strong>{pick.actual_total}</strong>
          </div>
        )}
        {pick.actual_margin != null && type === 'Run Line' && (
          <div className="admin-pick__meta-item">
            <span>Actual Margin</span>
            <strong>{pick.actual_margin > 0 ? `+${pick.actual_margin}` : pick.actual_margin}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

function GamePicksSideModal({ game, date, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!game) return null;

  const awayId = teamMlbId(game.away_team);
  const homeId = teamMlbId(game.home_team);
  const awayWon = game.away_score > game.home_score;

  return (
    <div className="admin-side-overlay" onClick={onClose}>
      <aside className="admin-side" onClick={e => e.stopPropagation()} role="dialog" aria-label="Game Scout AI picks">
        <button className="admin-side__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="admin-side__header">
          <span className="admin-side__eyebrow">Scout AI Picks</span>
          <div className="admin-side__matchup">
            <div className={`admin-side__team${awayWon ? ' admin-side__team--winner' : ''}`}>
              {awayId && <img src={teamLogoUrl(awayId)} alt={game.away_team} />}
              <div>
                <div className="admin-side__team-name">{game.away_team_name || game.away_team}</div>
                <div className="admin-side__team-abbr">{game.away_team}</div>
              </div>
              <div className="admin-side__team-score">{game.away_score ?? '–'}</div>
            </div>
            <div className={`admin-side__team${!awayWon ? ' admin-side__team--winner' : ''}`}>
              {homeId && <img src={teamLogoUrl(homeId)} alt={game.home_team} />}
              <div>
                <div className="admin-side__team-name">{game.home_team_name || game.home_team}</div>
                <div className="admin-side__team-abbr">{game.home_team}</div>
              </div>
              <div className="admin-side__team-score">{game.home_score ?? '–'}</div>
            </div>
          </div>
          <div className="admin-side__meta">
            <span>{date}</span>
            {game.status && <><span className="admin-side__meta-sep">·</span><span>{game.status}</span></>}
          </div>
        </div>

        <div className="admin-side__body">
          <PickCard type="Moneyline" pick={game.moneyline} />
          <PickCard type="Run Line"  pick={game.run_line}  />
          <PickCard type="Total"     pick={game.totals}    />
        </div>
      </aside>
    </div>
  );
}

function DailyGameReportModal({ data, title, onClose, onSelectGame }) {
  if (!data) return null;
  const games = Array.isArray(data.games) ? data.games : [];

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <button className="admin-modal__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="admin-modal__header">
          <h3 className="admin-modal__title">{title}</h3>
          <p className="admin-modal__sub">
            {data.date} · {games.length} game{games.length !== 1 ? 's' : ''}
          </p>
          {data.summary && (
            <div className="admin-modal__summary">
              {['moneyline','run_line','totals'].map(k => {
                const s = data.summary[k];
                if (!s) return null;
                const label = k === 'moneyline' ? 'ML' : k === 'run_line' ? 'RL' : 'TOT';
                return (
                  <div key={k} className="admin-modal__summary-item">
                    <span className="admin-modal__summary-label">{label}</span>
                    <strong>{s.accuracy}%</strong>
                    <span className="admin-modal__summary-sub">{s.hits}/{s.picks}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {games.length === 0 ? (
          <div className="admin-modal__empty">No games found for this date.</div>
        ) : (
          <div className="admin-modal__table">
            <div className="admin-modal__table-head">
              <span>Matchup</span>
              <span>Score</span>
              <span className="admin-modal__head-dots">
                <em>ML</em><em>RL</em><em>TOT</em>
              </span>
            </div>
            {games.map(g => {
              const awayId = teamMlbId(g.away_team);
              const homeId = teamMlbId(g.home_team);
              return (
                <button
                  key={g.game_pk}
                  type="button"
                  className="admin-modal__row admin-modal__row--clickable"
                  onClick={() => onSelectGame && onSelectGame(g)}
                  aria-label={`View Scout AI picks for ${g.away_team} at ${g.home_team}`}
                >
                  <div className="admin-modal__matchup">
                    <div className="admin-modal__team">
                      {awayId ? <img src={teamLogoUrl(awayId)} alt={g.away_team} /> : <span className="admin-modal__team-fallback">{g.away_team}</span>}
                      <span className="admin-modal__abbr">{g.away_team}</span>
                    </div>
                    <span className="admin-modal__at">@</span>
                    <div className="admin-modal__team">
                      {homeId ? <img src={teamLogoUrl(homeId)} alt={g.home_team} /> : <span className="admin-modal__team-fallback">{g.home_team}</span>}
                      <span className="admin-modal__abbr">{g.home_team}</span>
                    </div>
                  </div>

                  <div className="admin-modal__score">
                    <span className={g.away_score > g.home_score ? 'admin-modal__score-winner' : ''}>{g.away_score ?? '–'}</span>
                    <span className="admin-modal__score-sep">–</span>
                    <span className={g.home_score > g.away_score ? 'admin-modal__score-winner' : ''}>{g.home_score ?? '–'}</span>
                  </div>

                  <div className="admin-modal__dots">
                    <OutcomeDot hit={g.moneyline?.hit} pushed={g.moneyline?.result === 'push'} label="Moneyline" />
                    <OutcomeDot hit={g.run_line?.hit}  pushed={g.run_line?.result === 'push'}  label="Run Line" />
                    <OutcomeDot hit={g.totals?.hit}    pushed={g.totals?.result === 'push'}    label="Totals" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Wedge: Player prop hit rate (pitcher / batter, today / yesterday) ────────

function PlayerPropRow({ row }) {
  const { label, accuracy, picks, hits } = row;
  const hasData = picks > 0;
  const color = !hasData
    ? 'rgba(255,255,255,0.35)'
    : accuracy >= 60 ? '#4ade80'
    : accuracy >= 50 ? '#fbbf24'
    : '#f87171';

  return (
    <div className="admin-prop-row">
      <span className="admin-prop-row__label">{label}</span>
      <span className="admin-prop-row__value" style={{ color }}>
        {hasData ? `${accuracy}%` : '—'}
      </span>
      <span className="admin-prop-row__sub">
        {hasData ? `${hits} / ${picks} correct` : 'No graded picks yet'}
      </span>
    </div>
  );
}

function PlayerPropsWedge({ data, loading, error }) {
  const [day, setDay] = useState('yesterday');       // 'today' | 'yesterday'
  const [category, setCategory] = useState('pitcher'); // 'pitcher' | 'batter'

  const dayData = data?.[day] ?? null;
  const rows    = dayData?.[category] ?? [];

  return (
    <div className="admin-wedge admin-wedge--player-props">
      <div className="admin-wedge__label">
        Player Prop Hit Rate
        {dayData?.date && (
          <span className="admin-wedge__date">{dayData.date}</span>
        )}
      </div>

      {/* Day toggle */}
      <div className="admin-prop-toggle admin-prop-toggle--day">
        <button
          type="button"
          className={`admin-prop-toggle__btn${day === 'yesterday' ? ' is-active' : ''}`}
          onClick={() => setDay('yesterday')}
        >
          Yesterday
        </button>
        <button
          type="button"
          className={`admin-prop-toggle__btn${day === 'today' ? ' is-active' : ''}`}
          onClick={() => setDay('today')}
        >
          Today
        </button>
      </div>

      {/* Category toggle */}
      <div className="admin-prop-toggle admin-prop-toggle--category">
        <button
          type="button"
          className={`admin-prop-toggle__btn${category === 'pitcher' ? ' is-active' : ''}`}
          onClick={() => setCategory('pitcher')}
        >
          Pitcher
        </button>
        <button
          type="button"
          className={`admin-prop-toggle__btn${category === 'batter' ? ' is-active' : ''}`}
          onClick={() => setCategory('batter')}
        >
          Batter
        </button>
      </div>

      {loading ? (
        <div className="admin-wedge__value">Loading…</div>
      ) : error ? (
        <div className="admin-wedge__sub">Player prop endpoint not yet live</div>
      ) : rows.length === 0 ? (
        <div className="admin-wedge__sub">No data available</div>
      ) : (
        <div className="admin-prop-list">
          {rows.map(row => <PlayerPropRow key={row.key} row={row} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminPage() {
  const { isAuthenticated, loading, user } = useAuth();

  // Posts state (existing)
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Dashboard wedge state
  const [metrics, setMetrics] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [todayGames, setTodayGames] = useState(null);
  const [gamesLoading, setGamesLoading] = useState(true);

  const [hitRateToday, setHitRateToday] = useState(null);
  const [hitRateTodayLoading, setHitRateTodayLoading] = useState(true);
  const [hitRateTodayError, setHitRateTodayError] = useState(null);

  const [hitRateYesterday, setHitRateYesterday] = useState(null);
  const [hitRateYesterdayLoading, setHitRateYesterdayLoading] = useState(true);
  const [hitRateYesterdayError, setHitRateYesterdayError] = useState(null);

  const [playerProps, setPlayerProps] = useState(null);
  const [playerPropsLoading, setPlayerPropsLoading] = useState(true);
  const [playerPropsError, setPlayerPropsError] = useState(null);

  const [reportModal, setReportModal] = useState(null); // null | 'today' | 'yesterday'
  const [selectedGame, setSelectedGame] = useState(null); // { game, date } | null
  const [alertComposerOpen, setAlertComposerOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch posts (existing)
  useEffect(() => {
    async function fetchPosts() {
      setFetching(true);
      const { data, error } = await supabase
        .from('content_posts')
        .select('id, type, title, slug, status, date, tags, author, updated_at')
        .order('updated_at', { ascending: false });
      if (!error) setPosts(data || []);
      setFetching(false);
    }
    fetchPosts();
  }, [isAuthenticated, user]);

  // Fetch dashboard data in parallel
  useEffect(() => {
    let cancelled = false;

    predictionsPerformanceService.getBySeason(new Date().getFullYear())
      .then(data => { if (!cancelled) setMetrics(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setMetrics([]); })
      .finally(() => { if (!cancelled) setMetricsLoading(false); });

    predictionsService.getToday()
      .then(data => { if (!cancelled) setTodayGames(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setTodayGames([]); })
      .finally(() => { if (!cancelled) setGamesLoading(false); });

    // Build ET-local YYYY-MM-DD for today and yesterday
    const etToday     = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const y           = new Date();
    y.setDate(y.getDate() - 1);
    const etYesterday = y.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    predictionsPerformanceService.getDailyGameReport(etToday)
      .then(data => { if (!cancelled) setHitRateToday(data || null); })
      .catch(err => { if (!cancelled) setHitRateTodayError(err?.message || 'unavailable'); })
      .finally(() => { if (!cancelled) setHitRateTodayLoading(false); });

    predictionsPerformanceService.getDailyGameReport(etYesterday)
      .then(data => { if (!cancelled) setHitRateYesterday(data || null); })
      .catch(err => { if (!cancelled) setHitRateYesterdayError(err?.message || 'unavailable'); })
      .finally(() => { if (!cancelled) setHitRateYesterdayLoading(false); });

    predictionsPerformanceService.getPlayerPropsTodayVsYesterday()
      .then(data => { if (!cancelled) setPlayerProps(data || null); })
      .catch(err => { if (!cancelled) setPlayerPropsError(err?.message || 'unavailable'); })
      .finally(() => { if (!cancelled) setPlayerPropsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (postId) => {
    const { error } = await supabase.from('content_posts').delete().eq('id', postId);
    if (!error) setPosts(prev => prev.filter(p => p.id !== postId));
    setDeleteConfirm(null);
  };

  const filteredPosts = posts.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Best / worst metric — by accuracy
  const sortedByAccuracy = [...metrics].sort((a, b) => b.accuracy - a.accuracy);
  const bestMetric  = sortedByAccuracy[0] ?? null;
  const worstMetric = sortedByAccuracy[sortedByAccuracy.length - 1] ?? null;

  if (loading) return null;

  return (
    <div className="admin-page">
      <div className="container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-title">
            <Link to="/account/settings" className="admin-back-link" aria-label="Back to settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <h1>Command Center</h1>
          </div>
          <div className="admin-header-actions">
            <Link to="/admin/model-performance" className="admin-action-btn">
              <svg className="admin-action-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4"  />
                <line x1="6"  y1="20" x2="6"  y2="14" />
              </svg>
              Model Performance
            </Link>
            <Link to="/admin/campaigns" className="admin-action-btn">
              <svg className="admin-action-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Campaigns
            </Link>
            <button
              type="button"
              className="admin-action-btn admin-action-btn--accent"
              onClick={() => setAlertComposerOpen(true)}
            >
              <svg className="admin-action-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              New Alert
            </button>
            <Link to="/admin/new" className="admin-action-btn">
              <svg className="admin-action-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
              New Post
            </Link>
          </div>
        </div>

        {/* ── Row 1: Status hero ── */}
        <div className="admin-hero-grid">
          <CountdownWedge games={todayGames} loading={gamesLoading} />
          <PerformerWedge
            label="Best Performer"
            metric={bestMetric}
            loading={metricsLoading}
            variant="best"
          />
          <PerformerWedge
            label="Worst Performer"
            metric={worstMetric}
            loading={metricsLoading}
            variant="worst"
          />
        </div>

        {/* ── Row 2: Daily hit rate (yesterday + today) ── */}
        <div className="admin-hitrate-grid">
          <HitRateWedge
            title="Yesterday's Hit Rate"
            data={hitRateYesterday}
            loading={hitRateYesterdayLoading}
            error={hitRateYesterdayError}
            onClick={() => setReportModal('yesterday')}
          />
          <HitRateWedge
            title="Today's Hit Rate"
            data={hitRateToday}
            loading={hitRateTodayLoading}
            error={hitRateTodayError}
            onClick={() => setReportModal('today')}
          />
        </div>

        {/* ── Row 3: Player prop hit rate ── */}
        <div className="admin-player-props-row">
          <PlayerPropsWedge
            data={playerProps}
            loading={playerPropsLoading}
            error={playerPropsError}
          />
        </div>

        {/* ── Row 4: Campaign Manager ── */}
        <div className="admin-section admin-campaigns">
          <div className="admin-section-header">
            <h2>Campaign Manager</h2>
            <div className="admin-campaigns__header-right">
              <span className="admin-section-count">
                {MOCK_CAMPAIGN_HISTORY.length} sent
              </span>
              <Link to="/admin/campaigns" className="admin-action-btn admin-action-btn--sm">
                Manage campaigns →
              </Link>
            </div>
          </div>

          {MOCK_CAMPAIGN_HISTORY.length === 0 ? (
            <div className="empty-state">
              No campaigns yet. Click "Manage campaigns" to send your first one.
            </div>
          ) : (
            <div className="admin-campaign-list">
              {MOCK_CAMPAIGN_HISTORY.slice(0, 5).map(c => {
                const meta = audienceMeta(c.audience);
                return (
                  <Link
                    key={c.id}
                    to="/admin/campaigns"
                    className="admin-campaign-row"
                  >
                    <div className="admin-campaign-row__main">
                      <span className="admin-campaign-row__subject">
                        {c.subject || '(no subject)'}
                      </span>
                      <div className="admin-campaign-row__meta">
                        <span className={`admin-audience-pill admin-audience-pill--${meta.accent || 'slate'}`}>
                          {meta.label}
                        </span>
                        <span className="admin-campaign-row__sub">
                          {c.recipients.toLocaleString()} recipients · {formatCampaignSentAt(c.sentAt)}
                        </span>
                      </div>
                    </div>
                    <span className={`campaign-history__status campaign-history__status--${c.status}`}>
                      {c.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Row 5: Content Manager ── */}
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Content Manager</h2>
            <span className="admin-section-count">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Filters */}
          <div className="admin-filters">
            <input
              className="filter-input"
              type="text"
              placeholder="Search by title…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="article">Articles</option>
              <option value="blog">Blogs</option>
            </select>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Posts Table */}
          {fetching ? (
            <div className="empty-state">Loading posts…</div>
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state">
              {posts.length === 0
                ? 'No posts yet. Click "+ New Post" to get started — pick the content type from the dropdown in the editor.'
                : 'No posts match your filters.'}
            </div>
          ) : (
            <div className="posts-table-wrap">
              <table className="posts-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map(post => (
                    <tr key={post.id}>
                      <td className="post-title-cell">
                        {post.title}
                        <small>/{post.type === 'article' ? 'sandlot-insider' : 'blogs'}/{post.slug}</small>
                      </td>
                      <td>
                        <span className="type-badge">{post.type}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${post.status}`}>{post.status}</span>
                      </td>
                      <td>{post.date || '—'}</td>
                      <td>
                        <div className="post-actions">
                          <Link to={`/admin/edit/${post.id}`} className="btn-secondary">Edit</Link>
                          {deleteConfirm === post.id ? (
                            <>
                              <button className="btn-danger" onClick={() => handleDelete(post.id)}>Confirm</button>
                              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            </>
                          ) : (
                            <button className="btn-danger" onClick={() => setDeleteConfirm(post.id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {reportModal && (
        <DailyGameReportModal
          data={reportModal === 'today' ? hitRateToday : hitRateYesterday}
          title={reportModal === 'today' ? "Today's Game Report" : "Yesterday's Game Report"}
          onClose={() => setReportModal(null)}
          onSelectGame={(g) => setSelectedGame({
            game: g,
            date: (reportModal === 'today' ? hitRateToday : hitRateYesterday)?.date || '',
          })}
        />
      )}

      {selectedGame && (
        <GamePicksSideModal
          game={selectedGame.game}
          date={selectedGame.date}
          onClose={() => setSelectedGame(null)}
        />
      )}

      <AlertComposerModal
        open={alertComposerOpen}
        onClose={() => setAlertComposerOpen(false)}
      />
    </div>
  );
}

export default AdminPage;
