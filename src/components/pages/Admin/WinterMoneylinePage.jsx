import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import cbpcAdminService, { MONEYLINE_LEAGUES } from '../../../data/services/cbpcAdminService';
import { CBPC_LEAGUES } from '../../../data/constants/cbpcConstants';
import '../../../styles/admin-page-styling/winter-moneyline.css';

/*
  Winter League Moneyline (/admin/winter-moneyline): admins only (the route is
  behind ProtectedRoute require="admin" and the server answers 403 to anyone
  else). Phone first, single column from 360px.

    Today ........ one date's predictions per league: win %, the pick, Kalshi
                   edge, reported starters, Scout AI report, result.
    Performance .. settled-game record per league plus an "All leagues" card.

  Renders what the server returns. The only client-side math is the All
  leagues card: it adds up counts and takes the accuracy of those sums. Log
  loss, Brier and ROI stay per league.
*/

const TABS = [
  { id: 'today', label: 'Today', icon: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></> },
  { id: 'performance', label: 'Performance', icon: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></> },
];

const RANGES = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: 'season', label: 'Season', days: null },
];

const leagueName = (slug) => CBPC_LEAGUES[slug]?.short || slug.toUpperCase();

// ── Formatting ───────────────────────────────────────────────────────────────
const etToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

function shiftDate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`);
const dec = (v, digits = 3) => (v == null ? '—' : Number(v).toFixed(digits));
const money = (v) => (v == null ? '—' : `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`);
const signedPct = (v) => (v == null ? null : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`);
const rec = (correct, games) => (games ? `${correct}-${games - correct}` : '—');
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');
const shortDay = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' });

// Loads every league in parallel; one failing league never hides the others.
function useLeagues(load, deps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ results: null, updatedAt: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, loading: true }));
    Promise.allSettled(MONEYLINE_LEAGUES.map(slug => load(slug, { fresh: nonce > 0 }))).then(settled => {
      if (!alive) return;
      if (settled.some(r => r.status === 'rejected' && [401, 403].includes(r.reason?.status))) {
        navigate('/account', { replace: true, state: { from: location } });
        return;
      }
      const results = Object.fromEntries(MONEYLINE_LEAGUES.map((slug, i) => [slug,
        settled[i].status === 'fulfilled' ? { data: settled[i].value } : { error: settled[i].reason }]));
      setState({ results, updatedAt: new Date(), loading: false });
    });
    return () => { alive = false; };
  }, [nonce, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => setNonce(n => n + 1), []);
  return { ...state, refresh };
}

function RefreshBar({ loading, updatedAt, onRefresh }) {
  return (
    <div className="wml-refresh">
      <span className="wml-faint">{loading ? 'Loading…' : updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</span>
      <button type="button" className="wml-btn" onClick={onRefresh} disabled={loading}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" />
        </svg>
        Refresh
      </button>
    </div>
  );
}

function LeagueError({ slug, error }) {
  return (
    <div className="wml-card wml-card--error">
      <strong>{leagueName(slug)}</strong>
      <span>Couldn't load: {error?.message || 'request failed'}</span>
    </div>
  );
}

// ── Today ────────────────────────────────────────────────────────────────────
function TeamLogo({ team }) {
  const [failed, setFailed] = useState(false);
  if (!team?.logo_url || failed) return <span className="wml-logo wml-logo--abbr">{team?.team_abbreviation || '?'}</span>;
  return <img className="wml-logo" src={team.logo_url} alt="" onError={() => setFailed(true)} />;
}

function Mark({ ok }) {
  if (ok == null) return <span className="wml-mark wml-mark--na">–</span>;
  return ok ? <span className="wml-mark wml-mark--ok" aria-label="Correct">✓</span> : <span className="wml-mark wml-mark--bad" aria-label="Wrong">✗</span>;
}

function StarterRow({ team, rs }) {
  const found = rs?.status === 'found';
  return (
    <div className="wml-starter">
      <span className="wml-starter-team">{team.team_abbreviation}</span>
      {found ? (
        <span className="wml-starter-body">
          <span className={`wml-tag ${rs.source_kind === 'official' ? 'wml-tag--good' : ''}`}>{rs.source_kind === 'official' ? 'Announced' : 'Reported'}</span>
          <span className="wml-starter-name">{rs.reported_name}</span>
          {rs.matched_to_team_pitchers === false && <span className="wml-faint"> (not on the club's known staff)</span>}
          {rs.source_url && (
            <a className="wml-source" href={rs.source_url} target="_blank" rel="noopener noreferrer">
              {rs.source_title || 'Source'} ↗
            </a>
          )}
        </span>
      ) : (
        <span className="wml-faint">Not announced yet</span>
      )}
    </div>
  );
}

function Bullets({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return <ul className="wml-bullets">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}

function ScoutReport({ scout, game }) {
  const a = scout?.analysis;
  if (!a) return <p className="wml-faint wml-scout-none">No Scout AI report yet (written within about 4 hours of first pitch).</p>;
  const pickTeam = scout.pick?.side ? game[scout.pick.side] : null;
  const sections = [
    ['Matchup', a.matchup], ['Pitching', a.pitching], ['Lineup edge', a.lineupEdge],
    ['Market read', a.marketRead], ['Model alignment', a.modelAlignment], ['Data gaps', a.dataGaps],
  ];
  return (
    <details className="wml-scout">
      <summary>
        <span className="wml-scout-label">Scout AI</span>
        <span className="wml-scout-headline">{a.headline || 'Report'}</span>
      </summary>
      <div className="wml-scout-body">
        {pickTeam && (
          <p className="wml-scout-pick">
            Pick <strong>{pickTeam.team_abbreviation}</strong>
            {scout.pick.confidence != null && <> · confidence {scout.pick.confidence}/5</>}
            {scout.pick.agrees_with_model != null && <> · {scout.pick.agrees_with_model ? 'agrees with the model' : 'fades the model'}</>}
          </p>
        )}
        {sections.map(([label, text]) => (text ? (
          <div key={label} className="wml-scout-sec"><h4>{label}</h4><p>{text}</p></div>
        ) : null))}
        {a.keyFactors?.length > 0 && <div className="wml-scout-sec"><h4>Key factors</h4><Bullets items={a.keyFactors} /></div>}
        {a.redFlags?.length > 0 && <div className="wml-scout-sec"><h4>Red flags</h4><Bullets items={a.redFlags} /></div>}
        {a.responsibleGaming && <p className="wml-faint wml-small">{a.responsibleGaming}</p>}
        <p className="wml-faint wml-small">
          {[scout.llm_model, scout.prompt_version, scout.generated_at && `written ${new Date(scout.generated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`].filter(Boolean).join(' · ')}
        </p>
      </div>
    </details>
  );
}

function GameCard({ game, threshold }) {
  const { pick, result, scout } = game;
  return (
    <article className="wml-card wml-game">
      <header className="wml-game-head">
        <span>{timeOf(game.first_pitch)}{game.status && !/scheduled/i.test(game.status) ? ` · ${game.status}` : ''}</span>
        {game.locked && <span className="wml-tag">Locked</span>}
      </header>

      {['away', 'home'].map(side => {
        const t = game[side];
        const picked = pick?.side === side;
        const edge = signedPct(t.edge_vs_ask);
        return (
          <div key={side} className={`wml-team${picked ? ' wml-team--pick' : ''}`}>
            <TeamLogo team={t} />
            <div className="wml-team-name">
              <span>{t.team_name}</span>
              {t.kalshi ? (
                <span className="wml-faint wml-small">
                  Kalshi ask {dec(t.kalshi.yes_ask, 2)}{edge ? ` · edge ${edge}` : ''}{t.kalshi.liquid ? '' : ' · illiquid'}
                </span>
              ) : <span className="wml-faint wml-small">No Kalshi price</span>}
            </div>
            <span className="wml-team-prob">{pct(t.win_prob)}</span>
            {result && <span className="wml-team-score">{result[`${side}_score`]}</span>}
          </div>
        );
      })}

      {pick && (
        <div className="wml-pick">
          <span>Pick <strong>{pick.team_name}</strong> {pct(pick.win_prob)}</span>
          {pick.confident && <span className="wml-tag wml-tag--good">{Math.round((threshold ?? 0.58) * 100)}%+</span>}
        </div>
      )}

      {result && (
        <div className="wml-result">
          <span>Model <Mark ok={result.pick_correct} /></span>
          <span>Scout AI <Mark ok={scout ? scout.pick_correct : null} /></span>
        </div>
      )}

      <div className="wml-starters">
        <StarterRow team={game.away} rs={game.reported_starters?.away} />
        <StarterRow team={game.home} rs={game.reported_starters?.home} />
      </div>

      <ScoutReport scout={scout} game={game} />
    </article>
  );
}

function TodayView() {
  const [date, setDate] = useState(etToday);
  const [league, setLeague] = useState('all');
  const { results, loading, updatedAt, refresh } = useLeagues(
    (slug, opts) => cbpcAdminService.getMoneyline(slug, date, opts), [date]);
  const shown = league === 'all' ? MONEYLINE_LEAGUES : [league];

  return (
    <>
      <div className="wml-controls">
        <input type="date" className="wml-date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
        <div className="wml-chips" role="group" aria-label="League">
          {['all', ...MONEYLINE_LEAGUES].map(s => (
            <button key={s} type="button" className={`wml-chip${league === s ? ' active' : ''}`} onClick={() => setLeague(s)}>
              {s === 'all' ? 'All' : leagueName(s)}
            </button>
          ))}
        </div>
      </div>
      <RefreshBar loading={loading} updatedAt={updatedAt} onRefresh={refresh} />

      {!results ? <div className="wml-card wml-skeleton" /> : shown.map(slug => {
        const r = results[slug];
        if (r.error) return <LeagueError key={slug} slug={slug} error={r.error} />;
        const games = r.data?.games || [];
        return (
          <section key={slug} className="wml-league">
            <h2 className="wml-league-title">
              {leagueName(slug)} <span className="wml-faint">{games.length} game{games.length === 1 ? '' : 's'}</span>
            </h2>
            {games.length === 0
              ? <p className="wml-faint wml-empty">No predictions for this day.</p>
              : games.map(g => <GameCard key={g.game_pk} game={g} threshold={r.data.confident_threshold} />)}
          </section>
        );
      })}
    </>
  );
}

// ── Performance ──────────────────────────────────────────────────────────────
function Stat({ label, value, sub }) {
  return (
    <div className="wml-stat">
      <span className="wml-stat-label">{label}</span>
      <span className="wml-stat-value">{value}</span>
      {sub && <span className="wml-stat-sub">{sub}</span>}
    </div>
  );
}

function AllLeaguesCard({ results }) {
  // Counts only: never average log loss, Brier or ROI across leagues.
  const sum = { games: 0, correct: 0, scoutGames: 0, scoutCorrect: 0, confGames: 0, confWon: 0, threshold: null };
  let loaded = 0;
  MONEYLINE_LEAGUES.forEach(slug => {
    const d = results[slug]?.data;
    if (!d) return;
    loaded += 1;
    if (d.model) { sum.games += d.games || 0; sum.correct += d.model.correct || 0; }
    if (d.scout_picks) { sum.scoutGames += d.scout_picks.games || 0; sum.scoutCorrect += d.scout_picks.correct || 0; }
    if (d.confident_picks) {
      sum.confGames += d.confident_picks.games || 0;
      sum.confWon += d.confident_picks.won || 0;
      sum.threshold = d.confident_picks.threshold;
    }
  });
  const acc = (c, g) => (g ? pct(c / g) : '—');
  return (
    <div className="wml-card wml-all">
      <h2 className="wml-card-title">All leagues {loaded < MONEYLINE_LEAGUES.length && <span className="wml-faint">({loaded} of {MONEYLINE_LEAGUES.length} loaded)</span>}</h2>
      {sum.games === 0 ? <p className="wml-faint">No settled games yet.</p> : (
        <div className="wml-stats">
          <Stat label="Model" value={rec(sum.correct, sum.games)} sub={acc(sum.correct, sum.games)} />
          <Stat label="Scout AI" value={rec(sum.scoutCorrect, sum.scoutGames)} sub={acc(sum.scoutCorrect, sum.scoutGames)} />
          <Stat label={`${Math.round((sum.threshold ?? 0.58) * 100)}%+ picks`} value={rec(sum.confWon, sum.confGames)} sub={acc(sum.confWon, sum.confGames)} />
        </div>
      )}
      <p className="wml-faint wml-small">Records add up each league's counts. Log loss, Brier and ROI are per league.</p>
    </div>
  );
}

function versusBaseline(d) {
  const m = d.model?.log_loss;
  const b = d.home_rate_baseline?.log_loss;
  if (m == null || b == null) return { word: '—', cls: '' };
  if (m < b) return { word: 'Ahead', cls: 'wml-good' };
  if (m > b) return { word: 'Behind', cls: 'wml-bad' };
  return { word: 'Even', cls: '' };
}

function RecentChart({ byDate }) {
  const days = [...(byDate || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  if (!days.length) return null;
  const max = Math.max(...days.map(d => d.games), 1);
  return (
    <div className="wml-chart-scroll">
      <div className="wml-chart" role="img" aria-label="Correct picks per day, last 14 days">
        {days.map(d => (
          <div key={d.date} className="wml-chart-col" title={`${shortDay(d.date)}: ${d.correct} of ${d.games} correct`}>
            <span className="wml-chart-num">{d.correct}/{d.games}</span>
            <div className="wml-chart-bar" style={{ height: `${Math.max(4, (d.games / max) * 70)}px` }}>
              <div className="wml-chart-fill" style={{ height: `${d.games ? (d.correct / d.games) * 100 : 0}%` }} />
            </div>
            <span className="wml-chart-day">{shortDay(d.date).replace(/^\w+ /, '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTable({ head, rows }) {
  return (
    <table className="wml-table">
      <thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

function LeagueCard({ slug, data }) {
  const empty = !data.model || !data.games;
  const status = versusBaseline(data);
  const scout = data.scout_picks;
  const conf = data.confident_picks;
  const k = data.kalshi;
  return (
    <details className="wml-card wml-league-card">
      <summary>
        <span className="wml-league-name">{leagueName(slug)}</span>
        {empty ? <span className="wml-faint">No settled games yet</span> : (
          <span className="wml-league-sum">
            <span>{rec(data.model.correct, data.games)} <span className="wml-faint">{pct(data.model.accuracy)}</span></span>
            <span className="wml-faint">Scout {scout ? rec(scout.correct, scout.games) : '—'}</span>
            <span className={`wml-status ${status.cls}`}>{status.word}</span>
          </span>
        )}
      </summary>

      {empty ? <p className="wml-faint">No settled games yet.</p> : (
        <div className="wml-league-body">
          <section>
            <h3>Model vs home-team baseline</h3>
            <div className="wml-stats">
              <Stat label="Model log loss" value={dec(data.model.log_loss)} sub={`Brier ${dec(data.model.brier)}`} />
              <Stat label="Baseline log loss" value={dec(data.home_rate_baseline?.log_loss)}
                sub={data.home_rate_baseline ? `home wins ${pct(data.home_rate_baseline.home_win_rate)} · ${data.home_rate_baseline.train_seasons}` : null} />
            </div>
            <p className="wml-faint wml-small">Lower is better; beating the home-team baseline is what matters. Coin flip: {dec(data.coin_flip_log_loss)}.</p>
          </section>

          {conf && (
            <section>
              <h3>{Math.round(conf.threshold * 100)}%+ picks</h3>
              <div className="wml-stats">
                <Stat label="Games" value={conf.games} />
                <Stat label="Predicted" value={pct(conf.predicted)} />
                <Stat label="Won" value={pct(conf.win_rate)} sub={rec(conf.won, conf.games)} />
              </div>
            </section>
          )}

          <section>
            <h3>Scout AI</h3>
            {!scout ? <p className="wml-faint">No settled games with a report yet.</p> : (
              <>
                <div className="wml-stats">
                  <Stat label="Record" value={rec(scout.correct, scout.games)} sub={pct(scout.accuracy)} />
                  <Stat label="Agreed w/ model" value={rec(scout.agreed_with_model?.correct ?? 0, scout.agreed_with_model?.games ?? 0)} sub={pct(scout.agreed_with_model?.accuracy)} />
                  <Stat label="Faded model" value={rec(scout.faded_model?.correct ?? 0, scout.faded_model?.games ?? 0)} sub={pct(scout.faded_model?.accuracy)} />
                </div>
                {scout.by_confidence?.length > 0 && (
                  <MiniTable head={['Conf.', 'Games', 'Record', 'Acc.']}
                    rows={scout.by_confidence.filter(c => c.games).map(c => [`${c.confidence}/5`, c.games, rec(c.correct, c.games), pct(c.accuracy)])} />
                )}
              </>
            )}
          </section>

          <section>
            <h3>Kalshi <span className="wml-faint">paper trades, no fees</span></h3>
            {!k ? <p className="wml-faint">No Kalshi prices for these games.</p> : (
              <>
                <MiniTable head={['', 'Games', 'Model LL', 'Kalshi LL']}
                  rows={[['All priced', k.all_priced], ['Liquid', k.liquid_only]].map(([l, x]) => [l, x?.games ?? 0, dec(x?.model_log_loss), dec(x?.kalshi_log_loss)])} />
                <MiniTable head={[`Edge ≥ ${pct(k.paper_trades?.edge, 0)}`, 'Bets', 'Won', 'Profit', 'ROI']}
                  rows={[['All', k.paper_trades?.all], ['Liquid', k.paper_trades?.liquid_only]].map(([l, x]) => [l, x?.bets ?? 0, x?.won ?? 0, money(x?.profit), pct(x?.roi, 0)])} />
              </>
            )}
          </section>

          {data.calibration?.some(c => c.games) && (
            <section>
              <h3>Calibration</h3>
              <MiniTable head={['Bucket', 'Games', 'Predicted', 'Actual']}
                rows={data.calibration.filter(c => c.games).map(c => [`${pct(c.from, 0)}–${pct(c.to, 0)}`, c.games, pct(c.predicted), pct(c.actual)])} />
            </section>
          )}

          {data.by_date?.length > 0 && (
            <section>
              <h3>Recent results <span className="wml-faint">correct / games, last 14 days</span></h3>
              <RecentChart byDate={data.by_date} />
            </section>
          )}
        </div>
      )}
    </details>
  );
}

function PerformanceView() {
  const [range, setRange] = useState('season');
  const dates = useMemo(() => {
    const r = RANGES.find(x => x.id === range);
    if (!r?.days) return {};
    const end = etToday();
    return { startDate: shiftDate(end, -(r.days - 1)), endDate: end };
  }, [range]);
  const { results, loading, updatedAt, refresh } = useLeagues(
    (slug, opts) => cbpcAdminService.getPerformance(slug, dates, opts), [dates.startDate, dates.endDate]);

  return (
    <>
      <div className="wml-chips" role="group" aria-label="Date range">
        {RANGES.map(r => (
          <button key={r.id} type="button" className={`wml-chip${range === r.id ? ' active' : ''}`} onClick={() => setRange(r.id)}>{r.label}</button>
        ))}
      </div>
      <RefreshBar loading={loading} updatedAt={updatedAt} onRefresh={refresh} />
      {!results ? <div className="wml-card wml-skeleton" /> : (
        <>
          <AllLeaguesCard results={results} />
          {MONEYLINE_LEAGUES.map(slug => (results[slug].error
            ? <LeagueError key={slug} slug={slug} error={results[slug].error} />
            : <LeagueCard key={slug} slug={slug} data={results[slug].data} />))}
        </>
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function WinterMoneylinePage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'performance' ? 'performance' : 'today';
  const setTab = (id) => setParams(id === 'today' ? {} : { tab: id }, { replace: true });

  return (
    <div className="wml-page">
      <div className="wml-wrap">
        <header className="wml-header">
          <Link to="/admin" className="wml-back" aria-label="Back to admin">‹</Link>
          <div>
            <h1 className="wml-title">Winter League Moneyline</h1>
            <p className="wml-banner">Admin preview: not visible to users</p>
          </div>
        </header>

        <nav className="wml-tabs" aria-label="Sections">
          {TABS.map(t => (
            <button key={t.id} type="button" className={`wml-tab${tab === t.id ? ' active' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'today' ? <TodayView /> : <PerformanceView />}
      </div>
    </div>
  );
}
