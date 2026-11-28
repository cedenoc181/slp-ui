import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import cbpcAdminService from '../../../data/services/cbpcAdminService';
import { toPct } from '../../../data/services/scoutDesk';
import { DrawerShell, AnalystPanel, ConvictionDots, fmtOdds, plCls, fmtUnits, teamName as mlbTeamName } from './ScoutWarRoom';
import profitAndLossIcon from '../../../assets/icons/profit-and-loss.png';
import '../../../styles/predictions-page-styling/cbpc-scout-desk.css';

/*
  CBPC Scout Desk: the Winter filter of the Scout Desk (/predictions/scout-desk
  ?league=winter), admins only — ScoutDesk renders <CbpcBoard> only for admins.
  The winter-league version of the MLB War Room: the day's best moneyline plays
  across LIDOM, LVBP, LMP and LBPRC.

  GET /api/v1/predictions/scout-desk/cbpc/board?date=YYYY-MM-DD (admin bearer
  token, 403 for anyone else) → { date, season, record, board }. board is null
  until the day's board is built; otherwise { picks[], shortlist[], cut[],
  warRoom, llmModel, builtAt }. The cut list (honorable mentions) and the
  model name aren't shown. Picks carry the MLB game-prop pick shape plus
  league, home/away teams, firstPitch and result.

  Reuses the MLB War Room drawer shell, analyst panel, conviction dots and card
  styles. The MLB drawer body itself isn't reused: its matchup panel, betslip
  link and game link all read MLB-only data.
*/

// CBPC picks carry the /cbpc team brief (team_name, team_abbreviation); the
// shared MLB helper only reads name / abbreviation, so read the CBPC keys first.
const teamName = (t) => (t && typeof t === 'object' ? (t.team_name || mlbTeamName(t)) : mlbTeamName(t));
const teamAbbr = (t) => (t && typeof t === 'object' ? (t.team_abbreviation || teamName(t)) : mlbTeamName(t));

const etToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

function shiftDate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Edge arrives as a probability difference (0.042) → "+4.2 pts".
function fmtEdge(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const pts = Number(v) * 100;
  return `${pts >= 0 ? '+' : '−'}${Math.abs(pts).toFixed(1)} pts`;
}

// consensus.level: strong = green, lean = amber.
const CONSENSUS_CLS = { strong: 'strong', lean: 'lean' };

// The picked side: the server's `side` when present, else matched from the
// selection ("Tigres del Licey ML").
function pickSide(play) {
  if (play.side === 'home' || play.side === 'away') return play.side;
  const sel = String(play.selection || '').toLowerCase();
  const home = teamName(play.home).toLowerCase();
  const away = teamName(play.away).toLowerCase();
  if (home && sel.includes(home)) return 'home';
  if (away && sel.includes(away)) return 'away';
  return null;
}

function firstPitchLabel(play) {
  if (play.startTimeTbd) return play.gameNumber === 2 ? 'Game 2 · follows Game 1' : 'Time TBD';
  if (!play.firstPitch) return '';
  const d = new Date(play.firstPitch);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

// result may be an object ({ status, homeScore, awayScore, units }) or a bare
// status with the scores on the pick.
function readResult(play) {
  const r = play.result;
  if (!r) return null;
  if (typeof r === 'string') return { status: r, homeScore: play.homeScore, awayScore: play.awayScore, units: play.units };
  return r;
}

function TeamLogo({ team }) {
  const [failed, setFailed] = useState(false);
  if (!team?.logo_url || failed) return null;
  return <img src={team.logo_url} alt={teamName(team)} className="cbpc-logo" onError={() => setFailed(true)} />;
}

function ResultTag({ play }) {
  const r = readResult(play);
  if (!r || !r.status || r.status === 'pending') return null;
  const score = r.homeScore != null && r.awayScore != null ? `${r.homeScore}-${r.awayScore}` : null;
  if (r.status === 'won') {
    return (
      <span className="cbpc-result won">
        ✓ Won{score && ` · ${score}`}{r.units != null && <span className={plCls(r.units)}> · {fmtUnits(r.units)}</span>}
      </span>
    );
  }
  if (r.status === 'lost') {
    return (
      <span className="cbpc-result lost">
        ✕ Lost{score && ` · ${score}`}{r.units != null && <span className={plCls(r.units)}> · {fmtUnits(r.units)}</span>}
      </span>
    );
  }
  if (r.status === 'void') return <span className="cbpc-result void">Postponed</span>;
  return null;
}

function AiAgreement({ ai }) {
  if (ai == null) return <span className="cbpc-ai none">No Scout AI report</span>;
  const conf = ai.confidence != null ? ` (confidence ${ai.confidence}/5)` : '';
  return ai.agrees
    ? <span className="cbpc-ai agrees">Scout AI agrees{conf}</span>
    : <span className="cbpc-ai disagrees">Scout AI disagrees{conf}</span>;
}

// ── Pick card ─────────────────────────────────────────────────────────────────

function PickCard({ play, onOpen, reason }) {
  const side = pickSide(play);
  const opponent = side === 'home' ? play.away : side === 'away' ? play.home : null;
  const picked = side ? play[side] : null;
  const consensusCls = CONSENSUS_CLS[play.consensus?.level] || 'pass';
  const time = firstPitchLabel(play);
  const hasMarket = play.odds != null;
  return (
    <div className={`sd-bp-card cbpc-card ${consensusCls}`}>
      <div className="sd-bp-card-top">
        <span className="cbpc-league">{play.league}</span>
        {play.consensus?.label && <span className={`cbpc-consensus ${consensusCls}`}>{play.consensus.label}</span>}
        <ResultTag play={play} />
      </div>

      <div className="cbpc-title">
        {/* Only the team the pick is on. */}
        {picked && <span className="cbpc-logos"><TeamLogo team={picked} /></span>}
        <span className="cbpc-title-text">
          <span className="sd-bp-sel">{play.selection}</span>
          {opponent && <span className="sd-bp-subject">vs {teamName(opponent)}</span>}
        </span>
      </div>

      <div className="cbpc-time">
        {time}
        {Number(play.scheduledInnings) === 7 && <span className="cbpc-inn">7 inn</span>}
      </div>

      <div className="sd-bp-stats cbpc-nums">
        <div className="sd-bp-stat">
          <span>Model</span>
          <strong>{play.modelProb != null ? `${toPct(play.modelProb)}%` : '—'}</strong>
        </div>
        {hasMarket ? (
          <>
            <div className="sd-bp-stat">
              <span>Odds</span>
              <strong className={play.odds > 0 ? 'pos' : 'neg'}>{fmtOdds(play.odds)}</strong>
            </div>
            {play.breakEven != null && (
              <div className="sd-bp-stat">
                <span>Break-even</span>
                <strong>{toPct(play.breakEven)}%</strong>
              </div>
            )}
          </>
        ) : (
          <div className="sd-bp-stat"><span>Market</span><strong className="cbpc-nomarket">No Kalshi market</strong></div>
        )}
        <div className="sd-bp-stat">
          <span>Edge</span>
          <strong className={plCls(play.edge)}>{fmtEdge(play.edge)}</strong>
        </div>
        {play.conviction != null && (
          <div className="sd-bp-stat">
            <span>Conviction</span>
            <ConvictionDots n={play.conviction} />
          </div>
        )}
      </div>

      <AiAgreement ai={play.aiAgreement} />
      {reason && <p className="cbpc-reason">{reason}</p>}

      <button type="button" className="sd-bp-cta cbpc-cta" onClick={() => onOpen(play)}>War Room →</button>
    </div>
  );
}

// ── War Room drawer ───────────────────────────────────────────────────────────

function CbpcWarRoom({ play, onClose }) {
  // Votes are home / away / pass: show the team voted for.
  const voteMeta = (vote) => {
    if (vote === 'home' || vote === 'away') {
      return { cls: pickSide(play) === vote ? 'play' : 'fade', label: teamName(play[vote]) || vote.toUpperCase() };
    }
    return { cls: 'pass', label: 'Pass' };
  };
  return (
    <DrawerShell onClose={onClose}>
      <div className="sd-drawer-head">
        <span className="cbpc-league">{play.league}</span>
        <h2 className="sd-drawer-sel">{play.selection}</h2>
        <div className="sd-drawer-meta">
          <span className="sd-subject">{teamName(play.away)} @ {teamName(play.home)}</span>
          {play.consensus?.label && (
            <span className={`cbpc-consensus ${CONSENSUS_CLS[play.consensus.level] || 'pass'}`}>{play.consensus.label}</span>
          )}
        </div>
        <div className="sd-drawer-nums">
          <div><span className="sd-num-lbl">Model</span><span className="sd-num">{play.modelProb != null ? `${toPct(play.modelProb)}%` : '—'}</span></div>
          <div><span className="sd-num-lbl">Odds</span><span className={`sd-num ${play.odds > 0 ? 'pos' : 'neg'}`}>{play.odds != null ? fmtOdds(play.odds) : 'No market'}</span></div>
          <div><span className="sd-num-lbl">Edge</span><span className={`sd-num ${plCls(play.edge)}`}>{fmtEdge(play.edge)}</span></div>
        </div>
      </div>

      {play.reasoning?.rationale && (
        <div className="sd-verdict"><strong>Why this, now:</strong> {play.reasoning.rationale}</div>
      )}
      {play.scoutReasoning && <p className="cbpc-scout-reasoning">{play.scoutReasoning}</p>}

      <AnalystPanel analysts={play.analysts} voteMeta={voteMeta} />
    </DrawerShell>
  );
}

// ── Season record strip ───────────────────────────────────────────────────────

function RecordStrip({ record, season, children }) {
  if (!record) return null;
  const win = toPct(record.winRate);
  return (
    <div className="sd-record cbpc-record">
      <div className="sd-record-head">
        <span className="sd-record-title">
          <img src={profitAndLossIcon} alt="" className="sd-record-title-icon" />
          CBPC Scout Desk record{season ? ` · ${season}` : ''}
        </span>
        <span className="sd-muted">
          {[record.void ? `${record.void} postponed` : null, record.pending ? `${record.pending} pending` : null].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div className="sd-record-stats">
        <div className="sd-rstat"><span className="sd-rstat-lbl">Record</span><span className="sd-rstat-val">{record.won ?? 0}-{record.lost ?? 0}</span></div>
        <div className="sd-rstat"><span className="sd-rstat-lbl">Win rate</span><span className="sd-rstat-val">{win != null ? `${win}%` : '—'}</span></div>
        <div className="sd-rstat">
          <span className="sd-rstat-lbl">Units{record.pricedPicks != null ? ` (${record.pricedPicks} priced)` : ''}</span>
          <span className={`sd-rstat-val ${plCls(record.units)}`}>{record.units != null ? fmtUnits(record.units) : '—'}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Daily log (inside the record card, like the MLB Track Record) ──────────
// There's no history endpoint for the CBPC desk, so the week on screen is read
// from each day's board (/scout-desk/cbpc/board?date=); a day without a board
// isn't shown. Results come off each pick (won / lost / void / pending).

const WEEK = 7;
const dayDate = (iso) => new Date(`${iso}T12:00:00`);
const shortDow = (iso) => dayDate(iso).toLocaleDateString('en-US', { weekday: 'short' });
const monthDay = (iso) => dayDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDate = (iso) => dayDate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

function daySummary(picks) {
  let won = 0, lost = 0, pending = 0, units = null;
  picks.forEach(p => {
    const r = readResult(p);
    const st = r?.status || 'pending';
    if (st === 'won') won += 1;
    else if (st === 'lost') lost += 1;
    else if (st !== 'void') pending += 1;
    if (r?.units != null) units = (units ?? 0) + Number(r.units);
  });
  return { won, lost, pending, units };
}

function DailyLog({ onOpen }) {
  const today = etToday();
  const [weekEnd, setWeekEnd] = useState(today);
  const [days, setDays] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    setDays(null);
    const dates = Array.from({ length: WEEK }, (_, i) => shiftDate(weekEnd, i - (WEEK - 1)));
    Promise.all(dates.map(d => cbpcAdminService.getScoutDeskBoard(d).then(res => ({ date: d, board: res?.board })).catch(() => ({ date: d, board: null }))))
      .then(list => {
        if (!alive) return;
        const withBoards = list
          .filter(x => Array.isArray(x.board?.picks))
          .map(x => ({ date: x.date, picks: x.board.picks, ...daySummary(x.board.picks) }));
        setDays(withBoards);
        setSelected(withBoards.length ? withBoards[withBoards.length - 1].date : null);
      });
    return () => { alive = false; };
  }, [weekEnd]);

  const sel = days?.find(d => d.date === selected) || null;
  const rangeLabel = `${monthDay(shiftDate(weekEnd, -(WEEK - 1)))} – ${monthDay(weekEnd)}`;

  return (
    <div className="sd-record-daily">
      <div className="sd-record-daily-head">
        <span className="sd-record-daily-title">Daily log</span>
        <span className="sd-muted">{days ? `${days.length} day${days.length === 1 ? '' : 's'} with a board` : 'Loading…'}</span>
      </div>
      <div className="sd-cal">
        <div className="sd-cal-head">
          <button className="sd-cal-nav" onClick={() => setWeekEnd(d => shiftDate(d, -WEEK))} aria-label="Earlier week">‹</button>
          <span className="sd-cal-title">{rangeLabel}</span>
          <button className="sd-cal-nav" onClick={() => setWeekEnd(d => { const n = shiftDate(d, WEEK); return n > today ? today : n; })} disabled={weekEnd >= today} aria-label="Later week">›</button>
        </div>

        <div className="sd-week-strip">
          {(days || []).map(d => {
            const tint = d.units > 0 ? 'win' : d.units < 0 ? 'loss' : 'even';
            return (
              <button key={d.date} className={`sd-week-box sd-cal-cell--${tint}${selected === d.date ? ' sd-cal-cell--sel' : ''}`} onClick={() => setSelected(d.date)}>
                <span className="sd-week-dow">{shortDow(d.date)}</span>
                <span className="sd-week-date">{monthDay(d.date)}</span>
                <span className="sd-cal-rec">{d.won}-{d.lost}{d.pending ? ` · ${d.pending}p` : ''}</span>
                {d.units != null && <span className={`sd-cal-u ${plCls(d.units)}`}>{fmtUnits(d.units)}</span>}
              </button>
            );
          })}
          {days && days.length === 0 && <div className="sd-muted sd-cal-nopicks">No CBPC boards this week.</div>}
        </div>

        {sel && (
          <div className="sd-cal-detail">
            <div className="sd-cal-detail-head">
              <span className="sd-cal-detail-date">{longDate(sel.date)}</span>
              <span className="sd-muted">{sel.won}-{sel.lost}{sel.pending ? ` · ${sel.pending} pending` : ''}</span>
              {sel.units != null && <span className={`sd-day-u ${plCls(sel.units)}`}>{fmtUnits(sel.units)}</span>}
            </div>
            {sel.picks.length === 0 ? <div className="sd-muted sd-cal-nopicks">No picks on this board.</div> : sel.picks.map((p, j) => {
              const r = readResult(p);
              const st = r?.status || 'pending';
              const score = r?.homeScore != null && r?.awayScore != null ? `${teamAbbr(p.away)} ${r.awayScore} · ${teamAbbr(p.home)} ${r.homeScore}` : null;
              return (
                <button key={p.id || j} type="button" className="sd-day-pick sd-day-pick--button" onClick={() => onOpen(p)} title="Open the War Room for this pick">
                  <span className="sd-day-sel">{p.selection} <span className="sd-muted">({p.league})</span></span>
                  <span className="sd-muted">{score || firstPitchLabel(p) || '—'}</span>
                  <span className={`sd-day-status ${st === 'void' ? 'push' : st}`}>{st === 'void' ? 'postponed' : st}</span>
                  {r?.units != null && <span className={`sd-day-pnl ${plCls(r.units)}`}>{fmtUnits(r.units)}</span>}
                  <span className="sd-day-matchup" aria-hidden="true">War Room →</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Board (the Scout Desk's Winter filter) ──────────────────────────────────

export function CbpcBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  // Always today's board: past days live in the daily log (no date picker).
  const date = etToday();
  const [state, setState] = useState({ data: null, error: null, busy: true });
  const [openPlay, setOpenPlay] = useState(null);

  useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, busy: true, error: null }));
    cbpcAdminService.getScoutDeskBoard(date)
      .then(data => { if (alive) setState({ data, error: null, busy: false }); })
      .catch(err => {
        if (!alive) return;
        if ([401, 403].includes(err?.status)) {
          navigate('/account', { replace: true, state: { from: location } });
          return;
        }
        setState({ data: null, error: err?.message || 'Failed to load the board.', busy: false });
      });
    return () => { alive = false; };
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeDrawer = useCallback(() => setOpenPlay(null), []);

  const { data, error, busy } = state;
  const board = data?.board ?? null;
  const picks = Array.isArray(board?.picks) ? board.picks : [];

  return (
    <>
      {error ? (
        <div className="sd-error">⚠ {error}</div>
      ) : busy ? (
        <div className="sd-loading"><span className="pp-loading-spinner" /><span>Loading the CBPC board…</span></div>
      ) : !board ? (
        <div className="sd-empty">
          <span className="sd-empty-icon">🗓️</span>
          <p>Today's CBPC board isn't ready yet. It's built about an hour before the first game.</p>
        </div>
      ) : (
        <>
          {board.warRoom === 'unavailable' && <div className="cbpc-note">War Room offline: deterministic picks</div>}
          {picks.length > 0 ? (
            <div className="sd-bp-grid cbpc-grid">
              {picks.map((p, i) => <PickCard key={p.id || i} play={p} onOpen={setOpenPlay} />)}
            </div>
          ) : (
            <div className="sd-empty">
              <span className="sd-empty-icon">🗓️</span>
              <p>{board.warRoom === 'answered' ? 'No edge today: the War Room passed on every game.' : 'No picks on this board.'}</p>
            </div>
          )}
          {board.builtAt && (
            <div className="cbpc-footer sd-muted">
              <span>Built {new Date(board.builtAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          )}
        </>
      )}

      {/* Season record under the day's picks, with the daily log inside it. */}
      <RecordStrip record={data?.record} season={data?.season}>
        <DailyLog onOpen={setOpenPlay} />
      </RecordStrip>

      {openPlay && <CbpcWarRoom play={openPlay} onClose={closeDrawer} />}
    </>
  );
}

export default CbpcBoard;
