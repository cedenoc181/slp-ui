import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../lib/supabaseClient';
import predictionsService from '../../../data/services/predictionsService';
import predictionsPerformanceService from '../../../data/services/predictionsPerformanceService';
import '../../../styles/admin-page-styling/admin.css';

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

function HitRateWedge({ title, data, loading, error }) {
  const summary = data?.summary ?? null;
  const gameCount = Array.isArray(data?.games) ? data.games.length : null;

  return (
    <div className="admin-wedge admin-wedge--hitrate">
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
            <Link to="/admin/new?type=article" className="admin-action-btn">
              <svg className="admin-action-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
              New Article
            </Link>
            <Link to="/admin/new?type=blog" className="admin-action-btn">
              <svg className="admin-action-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
              New Blog
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
          />
          <HitRateWedge
            title="Today's Hit Rate"
            data={hitRateToday}
            loading={hitRateTodayLoading}
            error={hitRateTodayError}
          />
        </div>

        {/* ── Row 3: Content Manager ── */}
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
                ? 'No posts yet. Click "+ New Article" or "+ New Blog" to get started.'
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
    </div>
  );
}

export default AdminPage;
