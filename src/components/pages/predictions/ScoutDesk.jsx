import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PredictionsNav from './PredictionsNav';
import { buildScoutDesk, getScoutDeskPerformance, buildAutopsy, toPct } from '../../../data/services/scoutDesk';
import { WarRoom, CONSENSUS_META, isGame, toDrawerPlay, fmtOdds, plCls, fmtUnits } from './ScoutWarRoom';
import betLibraryService from '../../../data/services/betLibraryService';
import playerStatsService from '../../../data/services/playerStatsServices';
import loadingPredictionsIcon from '../../../assets/icons/loading-predictions.png';
import profitAndLossIcon from '../../../assets/icons/profit-and-loss.png';
import aiMlIcon from '../../../assets/icons/ai-ml.png';
import commandCentreIcon from '../../../assets/icons/command-centre.png';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/scout-desk.css';

function trim(s, n) { return !s ? '' : s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; }

// Headline: pitchers use pitcherName; game props use the ready-made `subject`
// ("Angels @ Mariners"). `selection` is server-formatted and safe either way.
function headlineName(play) { return isGame(play) ? (play.subject || '') : (play.pitcherName || ''); }
// Proj/line summary — line is null for moneyline, so fall back to the model
// projection (the picked side's win % for moneyline).
function projSummary(play) {
  if (play.line != null) return `proj ${play.projection} vs ${play.line} line`;
  if (play.projection != null) {
    return isGame(play) && /moneyline/i.test(play.market || '')
      ? `model ${toPct(play.projection)}%`
      : `proj ${play.projection}`;
  }
  return '';
}
function leadTake(play) {
  const voters = (play.analysts || []).filter(a => a.vote === 'play').sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  return voters[0] || (play.analysts || [])[0] || null;
}

// ── Big Board card ────────────────────────────────────────────────────────────

function BoardCard({ play, onOpen, lock }) {
  const cm = CONSENSUS_META[play.consensus.level] || CONSENSUS_META.pass;
  const lead = play.reasoning?.rationale || leadTake(play)?.take || '';
  const w = toPct(play.audit?.winPct);
  return (
    <button className={`sd-card ${cm.cls}${lock ? ' lock' : ''}`} onClick={() => onOpen(play)}>
      <div className="sd-card-top">
        <span className={`sd-badge ${cm.cls}`}>{cm.icon} {play.consensus.label}</span>
        {lock && <span className="sd-lock-tag">🔒 Lock of the Day</span>}
        {w != null && <span className="sd-audit-chip" title="Audited win rate for this bucket">{w}% hist</span>}
      </div>
      <div className="sd-card-body">
        <div className="sd-card-id">
          <span className="sd-card-sel">{play.selection}</span>
          <span className="sd-card-match sd-muted">{[play.market, projSummary(play)].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="sd-card-nums">
          <span className="sd-card-prob">{play.modelProb != null ? `${toPct(play.modelProb)}%` : '—'}<span className="sd-card-prob-lbl"> model</span></span>
          <span className={`sd-card-odds ${play.odds > 0 ? 'pos' : 'neg'}`}>{fmtOdds(play.odds)}</span>
        </div>
      </div>
      <div className="sd-card-lead">
        <span className="sd-lead-icon"><img src={aiMlIcon} alt="" className="sd-lead-icon-img" /></span>
        <span className="sd-lead-take">{trim(lead, 170)}</span>
      </div>
    </button>
  );
}

// ── Scout Desk Track Record (the desk's own picks, graded) ────────────────────

function recordStr(r) {
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object') return `${r.wins ?? 0}-${r.losses ?? 0}${r.pushes ? `-${r.pushes}` : ''}`;
  return '—';
}
const KEY_LABEL = {
  strikeouts: 'Strikeouts', outs: 'Pitcher Outs', earned_runs: 'Earned Runs', hits_allowed: 'Hits Allowed',
  over: 'Over', under: 'Under',
};
function prettyKey(k) { return KEY_LABEL[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function Breakdown({ title, data }) {
  const entries = data && typeof data === 'object' ? Object.entries(data) : [];
  if (!entries.length) return null;
  return (
    <div className="sd-breakdown">
      <div className="sd-breakdown-title">{title}</div>
      {entries.map(([k, v]) => {
        const rec = v && typeof v === 'object' && (v.wins != null || v.losses != null) ? recordStr(v) : null;
        const u = v && typeof v === 'object' ? v.unitsPnl : null;
        return (
          <div key={k} className="sd-bd-row">
            <span className="sd-bd-key">{prettyKey(k)}</span>
            {rec && <span className="sd-bd-rec">{rec}</span>}
            {u != null && <span className={`sd-bd-u ${plCls(u)}`}>{fmtUnits(u)}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Daily log as a calendar (each date is a small card; click to expand) ──────

/** Parse a day's `date` (ISO YYYY-MM-DD, or a display string) to a local Date. */
function parseDayDate(raw) {
  if (!raw) return null;
  const s = String(raw);
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function pad2(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function longDate(d) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
function shortDow(d) { return d.toLocaleDateString('en-US', { weekday: 'short' }); }
function monthDay(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

function DayPicks({ picks, onOpenPlay }) {
  if (!Array.isArray(picks) || !picks.length) {
    return <div className="sd-muted sd-cal-nopicks">No graded picks this day.</div>;
  }
  return picks.map((p, j) => {
    const inner = (
      <>
        <span className="sd-day-sel">{p.selection || `${p.market || ''} ${p.side || ''} ${p.line ?? ''}`.trim() || '—'}</span>
        <span className="sd-muted">proj {p.projection ?? '—'} · actual {p.actual ?? '—'}</span>
        <span className={`sd-day-status ${p.status || 'pending'}`}>{p.status || 'pending'}</span>
        {p.pnl != null && <span className={`sd-day-pnl ${plCls(p.pnl)}`}>{fmtUnits(p.pnl)}</span>}
      </>
    );
    if (!onOpenPlay) return <div key={j} className="sd-day-pick">{inner}</div>;
    return (
      <button
        key={j}
        type="button"
        className="sd-day-pick sd-day-pick--button"
        onClick={() => onOpenPlay(toDrawerPlay(p))}
        title="Open the War Room matchup for this pick"
      >
        {inner}
        <span className="sd-day-matchup" aria-hidden="true">Matchup →</span>
      </button>
    );
  });
}

const WEEK_SIZE = 7;

function TrackCalendar({ days, onOpenPlay }) {
  // Parse + sort day-entries ascending; retain any unparseable ones as a fallback.
  const { parsed, unplaced } = useMemo(() => {
    const list = []; const extra = [];
    (days || []).forEach((d) => {
      const dt = parseDayDate(d.date);
      if (!dt) { extra.push(d); return; }
      list.push({ ...d, _dt: dt, _key: dateKey(dt) });
    });
    list.sort((a, b) => a._dt - b._dt);
    return { parsed: list, unplaced: extra };
  }, [days]);

  const total = parsed.length;
  const [weekOffset, setWeekOffset] = useState(0);   // 0 = most recent 7 days
  const [selected, setSelected] = useState(null);

  const end = Math.max(0, total - weekOffset * WEEK_SIZE);
  const start = Math.max(0, end - WEEK_SIZE);
  const windowDays = parsed.slice(start, end);
  const canOlder = start > 0;
  const canNewer = weekOffset > 0;

  const activeKey = selected || (total ? parsed[total - 1]._key : null);
  const sel = parsed.find((d) => d._key === activeKey) || null;

  const rangeLabel = windowDays.length
    ? (windowDays.length > 1
      ? `${monthDay(windowDays[0]._dt)} – ${monthDay(windowDays[windowDays.length - 1]._dt)}`
      : monthDay(windowDays[0]._dt))
    : '—';

  return (
    <div className="sd-cal">
      <div className="sd-cal-head">
        <button className="sd-cal-nav" onClick={() => setWeekOffset((o) => o + 1)} disabled={!canOlder} aria-label="Earlier week">‹</button>
        <span className="sd-cal-title">{rangeLabel}</span>
        <button className="sd-cal-nav" onClick={() => setWeekOffset((o) => Math.max(0, o - 1))} disabled={!canNewer} aria-label="Later week">›</button>
      </div>

      <div className="sd-week-strip">
        {windowDays.map((d) => {
          const u = d.unitsPnl;
          const tint = u > 0 ? 'win' : u < 0 ? 'loss' : 'even';
          return (
            <button
              key={d._key}
              className={`sd-week-box sd-cal-cell--${tint}${activeKey === d._key ? ' sd-cal-cell--sel' : ''}`}
              onClick={() => setSelected(d._key)}
            >
              <span className="sd-week-dow">{shortDow(d._dt)}</span>
              <span className="sd-week-date">{monthDay(d._dt)}</span>
              <span className="sd-cal-rec">{recordStr(d.record)}</span>
              {u != null && <span className={`sd-cal-u ${plCls(u)}`}>{fmtUnits(u)}</span>}
            </button>
          );
        })}
        {windowDays.length === 0 && <div className="sd-muted sd-cal-nopicks">No graded days yet.</div>}
      </div>

      {sel && (
        <div className="sd-cal-detail">
          <div className="sd-cal-detail-head">
            <span className="sd-cal-detail-date">{longDate(sel._dt)}</span>
            <span className="sd-muted">{recordStr(sel.record)}</span>
            {sel.unitsPnl != null && <span className={`sd-day-u ${plCls(sel.unitsPnl)}`}>{fmtUnits(sel.unitsPnl)}</span>}
          </div>
          <DayPicks picks={sel.picks} onOpenPlay={onOpenPlay} />
        </div>
      )}

      {unplaced.length > 0 && (
        <div className="sd-cal-unplaced">
          <div className="sd-cal-unplaced-title sd-muted">Other days</div>
          {unplaced.map((d, i) => (
            <div key={i} className="sd-day">
              <div className="sd-day-head">
                <span className="sd-day-date">{d.date}</span>
                <span className="sd-muted">{recordStr(d.record)}</span>
                {d.unitsPnl != null && <span className={`sd-day-u ${plCls(d.unitsPnl)}`}>{fmtUnits(d.unitsPnl)}</span>}
              </div>
              <DayPicks picks={d.picks} onOpenPlay={onOpenPlay} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackRecord({ perf, onOpenPlay }) {
  if (!perf?.summary) return null;
  const s = perf.summary;
  const win = toPct(s.winPct);
  const roi = s.roiPct != null ? Number(s.roiPct) : null;
  const days = Array.isArray(perf.days) ? perf.days : [];
  return (
    <div className="sd-record">
      <div className="sd-record-head">
        <span className="sd-record-title">
          <img src={profitAndLossIcon} alt="" className="sd-record-title-icon" />
          Scout AI Track Record
        </span>
        <span className="sd-muted">
          {s.boards ?? '—'} boards · {s.picks ?? '—'} graded{s.pending ? ` · ${s.pending} pending` : ''}
        </span>
      </div>
      <div className="sd-record-stats">
        <div className="sd-rstat"><span className="sd-rstat-lbl">Record</span><span className="sd-rstat-val">{recordStr(s.record)}</span></div>
        <div className="sd-rstat"><span className="sd-rstat-lbl">Win rate</span><span className="sd-rstat-val">{win != null ? `${win}%` : '—'}</span></div>
        <div className="sd-rstat"><span className="sd-rstat-lbl">Units (1u flat)</span><span className={`sd-rstat-val ${plCls(s.unitsPnl)}`}>{fmtUnits(s.unitsPnl)}</span></div>
        <div className="sd-rstat"><span className="sd-rstat-lbl">ROI</span><span className={`sd-rstat-val ${plCls(roi)}`}>{roi != null ? `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%` : '—'}</span></div>
      </div>
      <div className="sd-record-splits">
        <Breakdown title="By stat type" data={s.byStatType} />
        <Breakdown title="By side" data={s.bySide} />
      </div>
      {days.length > 0 && (
        <div className="sd-record-daily">
          <div className="sd-record-daily-head">
            <span className="sd-record-daily-title">Daily log</span>
            <span className="sd-muted">{days.length} days</span>
          </div>
          <TrackCalendar days={days} onOpenPlay={onOpenPlay} />
        </div>
      )}
    </div>
  );
}

// ── Autopsy ───────────────────────────────────────────────────────────────────

const TAG_ICON = { leak: '🩹', warn: '⚠️', good: '✅', variance: '🎲', info: '📈' };

function Autopsy({ data }) {
  if (!data) return null;
  if (!data.hasData) {
    return (
      <div className="sd-autopsy empty">
        <span className="sd-autopsy-icon">🔬</span>
        <div>
          <div className="sd-autopsy-title">Bet Autopsy</div>
          <p className="sd-muted">Track and settle bets in the Bet Library to unlock your post-game autopsy — leaks, luck-adjusted P/L, and what to change.</p>
        </div>
      </div>
    );
  }
  const { summary, insights } = data;
  return (
    <div className="sd-autopsy">
      <div className="sd-autopsy-head">
        <span className="sd-autopsy-icon">🔬</span>
        <span className="sd-autopsy-title">Bet Autopsy</span>
        <span className="sd-autopsy-rec">
          {summary.record} · <span className={summary.units > 0 ? 'pos' : summary.units < 0 ? 'neg' : ''}>{summary.units > 0 ? '+' : ''}{summary.units.toFixed(1)}u</span>
          {summary.roi != null && <> · {summary.roi > 0 ? '+' : ''}{summary.roi.toFixed(1)}% ROI</>}
        </span>
      </div>
      {insights.length === 0
        ? <p className="sd-muted">Not enough settled bets yet for deeper reads — keep tracking.</p>
        : (
          <ul className="sd-insights">
            {insights.map((ins, i) => (
              <li key={i} className={`sd-insight ${ins.tag}`}>
                <span className="sd-insight-icon">{TAG_ICON[ins.tag] || '•'}</span>
                <span>{ins.text}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScoutDesk() {
  const navigate = useNavigate();
  const { isAuthenticated, isPremium, isAdmin, loading } = useAuth();

  const [desk, setDesk] = useState(null);
  const [perf, setPerf] = useState(null);
  const [autopsy, setAutopsy] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [openPlay, setOpenPlay] = useState(null);
  const [trackedIds, setTrackedIds] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate('/account', { state: { from: { pathname: '/predictions/scout-desk' } } }); return; }
    if (!isPremium) navigate('/predictions');
  }, [loading, isAuthenticated, isPremium, navigate]);

  const loadDesk = useCallback(() => {
    setBusy(true);
    // Track record (the desk's graded history) and the Bet Autopsy (the user's
    // own tracked bets) are independent of whether today's board is released —
    // load them alongside the desk so they render even when picks are pending
    // or the desk fetch fails.
    Promise.allSettled([buildScoutDesk(), getScoutDeskPerformance(), betLibraryService.list()])
      .then(([deskR, perfR, betsR]) => {
        if (deskR.status === 'fulfilled') { setDesk(deskR.value); setError(null); }
        else { setDesk(null); setError(deskR.reason?.message || 'Failed to load the desk.'); }
        setPerf(perfR.status === 'fulfilled' ? perfR.value : null);
        // Prefer the desk's autopsy (built after settling due bets); otherwise
        // build it directly from the bet library so it still shows on failure.
        if (deskR.status === 'fulfilled' && deskR.value?.autopsy) {
          setAutopsy(deskR.value.autopsy);
        } else {
          setAutopsy(buildAutopsy(betsR.status === 'fulfilled' ? betsR.value : []));
        }
      })
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => { loadDesk(); }, [loadDesk]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const handleTrack = useCallback(async (play, mode) => {
    try {
      await betLibraryService.add({
        correlation: mode === 'fade' ? 'watchlist' : 'taken',
        matchup: headlineName(play),
        market: play.market,
        selection: play.selection,
        odds: play.odds,
        modelProb: toPct(play.modelProb),
        ev: play.ev,
        confidence: Math.max(1, Math.min(5, Math.round(play.conviction <= 1 ? (play.conviction || 0) * 5 : (play.conviction || 3)))),
        scoutPrompt: play.reasoning?.rationale || play.scoutReasoning || '',
        gamePk: play.gamePk,
        isFade: mode === 'fade',
        status: 'pending',
      });
      setTrackedIds(prev => ({ ...prev, [play.id]: true }));
      showToast(mode === 'fade' ? 'Added to watchlist (fading the desk)' : 'Tracked to your Bet Library ✓');
    } catch (e) {
      showToast(e?.message || 'Could not track the bet');
    }
  }, []);

  const goToPitcher = useCallback(async (play) => {
    if (play.playerId == null) return;
    try {
      const res = await playerStatsService.lookupPlayer({ playerId: play.playerId });
      const slug = res?.name_slug ?? res?.mlb_id;
      if (slug) { navigate(`/player/${slug}`); window.scrollTo(0, 0); }
    } catch { /* no-op */ }
  }, [navigate]);

  if (loading || !isAuthenticated || !isPremium) return null;

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Scout AI</h1>
          <PredictionsNav />
        </div>
      </div>

      <div className="predictions-content">
        <div className="sd-desk-head">
          <div>
            <span className="sd-tag"><img src={commandCentreIcon} alt="" className="sd-tag-icon" />Scout AI - War Room</span>
            <h2 className="sd-desk-title">The best high-conviction props with a proven edge.</h2>
            <p className="sd-desk-sub">We start from the bet types our model is proven to win — pitcher props and game props (moneyline, totals, run line) — taking the exact lines and sides with the strongest historical hit rate, then read the matchup to settle on the most convincing plays. Every board mixes at least one pitcher prop and one game prop. Open any play for the full breakdown.</p>
          </div>
          {desk?.mood && (
            <div className="sd-mood">
              <span className="sd-mood-label">Desk read</span>
              <span className="sd-mood-name">{desk.mood.label}</span>
              <span className="sd-mood-text">{desk.mood.text}</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="sd-error">⚠ {error}</div>
        ) : busy ? (
          <div className="sd-loading"><span className="pp-loading-spinner" /><span>The desk is breaking down today's slate…</span></div>
        ) : !desk ? (
          <div className="sd-empty"><span className="sd-empty-icon">🗓️</span><p>No board available right now — check back closer to first pitch.</p></div>
        ) : (
          <>
            {desk.board.length > 0 && (isAdmin || desk.unlocked) ? (
              <>
                <div className="sd-board-head">
                  <span className="sd-board-title">
                    Today's Three
                    {desk.locked && <span className="sd-locked-tag" title="Picks are locked for the day">🔒 locked in</span>}
                  </span>
                </div>
                <div className="sd-board">
                  {desk.board.map(play => (
                    <BoardCard key={play.id} play={play} lock={!!desk.lock && play.id === desk.lock.id} onOpen={setOpenPlay} />
                  ))}
                </div>
              </>
            ) : (!desk.unlocked && desk.readyLabel) ? (
              <div className="sd-pending-banner">
                <img src={loadingPredictionsIcon} alt="" className="sd-pending-icon" aria-hidden="true" />
                <div>
                  <div className="sd-pending-title">Scout AI available by {desk.readyLabel}</div>
                  <div className="sd-pending-sub">
                    Our model and Scout AI analysis will be ready approximately 2 hours before first pitch.
                    Come back at {desk.readyLabel} for the day's picks and the full War Room breakdown.
                  </div>
                </div>
              </div>
            ) : (
              <div className="sd-empty"><span className="sd-empty-icon">🗓️</span><p>No props cleared the audit gate today — check back closer to first pitch.</p></div>
            )}
          </>
        )}

        {/* Track record + autopsy are constant — they don't depend on today's
            board, so they render even while picks are pending or errored. */}
        {!busy && (
          <>
            <TrackRecord perf={perf} onOpenPlay={setOpenPlay} />
            <Autopsy data={autopsy} />
          </>
        )}

        <p className="sd-disclaimer">
          * Picks pass a prediction-audit gate, then an AI reasoning layer (park factor, recent form,
          matchup). For research only — not financial advice. Please gamble responsibly.
        </p>
      </div>

      {openPlay && (
        <WarRoom
          play={openPlay}
          tracked={!!trackedIds[openPlay.id]}
          onTrack={handleTrack}
          onPitcher={goToPitcher}
          onClose={() => setOpenPlay(null)}
        />
      )}

      {toast && <div className="sd-toast">{toast}</div>}
    </div>
  );
}
