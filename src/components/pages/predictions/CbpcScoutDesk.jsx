import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import cbpcAdminService from '../../../data/services/cbpcAdminService';
import { toPct } from '../../../data/services/scoutDesk';
import { DrawerShell, AnalystPanel, ConvictionDots, fmtOdds, plCls, fmtUnits, teamName } from './ScoutWarRoom';
import commandCentreIcon from '../../../assets/icons/command-centre.png';
import profitAndLossIcon from '../../../assets/icons/profit-and-loss.png';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/scout-desk.css';
import '../../../styles/predictions-page-styling/cbpc-scout-desk.css';

/*
  CBPC Scout Desk (/predictions/scout-desk/cbpc): admins only. The winter-league
  version of the MLB Scout Desk War Room: the day's best moneyline plays across
  LIDOM, LVBP, LMP and LBPRC.

  GET /api/v1/predictions/scout-desk/cbpc/board?date=YYYY-MM-DD (admin bearer
  token, 403 for anyone else) → { date, season, record, board }. board is null
  until the day's board is built; otherwise { picks[], shortlist[], cut[],
  warRoom, llmModel, builtAt }. Picks carry the MLB game-prop pick shape plus
  league, home/away teams, firstPitch and result.

  Reuses the MLB War Room drawer shell, analyst panel, conviction dots and card
  styles. The MLB drawer body itself isn't reused: its matchup panel, betslip
  link and game link all read MLB-only data.
*/

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
        <span className="cbpc-logos">
          <TeamLogo team={picked || play.away} />
          {opponent && <TeamLogo team={opponent} />}
        </span>
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

function RecordStrip({ record, season }) {
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
    </div>
  );
}

// ── Honorable mentions ────────────────────────────────────────────────────────

function CutPick({ play, onOpen }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cbpc-cut-item">
      <button type="button" className="cbpc-cut-row" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="cbpc-cut-sel">{play.selection} <span className="sd-muted">({play.league})</span></span>
        <span className="cbpc-cut-reason">{play.reason}</span>
        <span className="cbpc-cut-toggle" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <PickCard play={play} onOpen={onOpen} reason={null} />}
    </div>
  );
}

function HonorableMentions({ cut, onOpen }) {
  if (!Array.isArray(cut) || cut.length === 0) return null;
  return (
    <div className="cbpc-cut">
      <div className="sd-board-head"><span className="sd-board-title">Honorable mentions</span></div>
      {cut.map((c, i) => (Array.isArray(c.analysts)
        ? <CutPick key={c.id || i} play={c} onOpen={onOpen} />
        : (
          <div key={c.id || i} className="cbpc-cut-item cbpc-cut-row cbpc-cut-row--plain">
            <span className="cbpc-cut-sel">{c.selection} <span className="sd-muted">({c.league})</span></span>
            <span className="cbpc-cut-reason">— {c.reason}</span>
          </div>
        )))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CbpcScoutDesk() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, loading } = useAuth();
  const [date, setDate] = useState(etToday);
  const [state, setState] = useState({ data: null, error: null, busy: true });
  const [openPlay, setOpenPlay] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (loading || !isAdmin) return undefined;
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
  }, [date, loading, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeDrawer = useCallback(() => setOpenPlay(null), []);

  if (loading || !isAdmin) return null;

  const { data, error, busy } = state;
  const board = data?.board ?? null;
  const picks = Array.isArray(board?.picks) ? board.picks : [];
  const today = etToday();

  return (
    <div className="predictions-page">
      <div className="predictions-content">
        <div className="sd-desk-head">
          <div>
            <span className="sd-tag"><img src={commandCentreIcon} alt="" className="sd-tag-icon" />CBPC Scout Desk · Admin</span>
            <h2 className="sd-desk-title">The day's best winter-league moneylines.</h2>
            <p className="sd-desk-sub">LIDOM, LVBP, LMP and LBPRC. The model's strongest edges, argued out by the War Room. Open any play for the full breakdown.</p>
          </div>
          <div className="cbpc-date">
            <button type="button" className="sd-cal-nav" onClick={() => setDate(d => shiftDate(d, -1))} aria-label="Previous day">‹</button>
            <input type="date" className="cbpc-date-input" value={date} max={today} onChange={e => e.target.value && setDate(e.target.value)} aria-label="Board date" />
            <button type="button" className="sd-cal-nav" onClick={() => setDate(d => shiftDate(d, 1))} disabled={date >= today} aria-label="Next day">›</button>
            {date !== today && <button type="button" className="sd-btn ghost cbpc-today" onClick={() => setDate(today)}>Today</button>}
          </div>
        </div>

        <RecordStrip record={data?.record} season={data?.season} />

        {error ? (
          <div className="sd-error">⚠ {error}</div>
        ) : busy ? (
          <div className="sd-loading"><span className="pp-loading-spinner" /><span>Loading the CBPC board…</span></div>
        ) : !board ? (
          <div className="sd-empty">
            <span className="sd-empty-icon">🗓️</span>
            <p>{date === today
              ? "Today's CBPC board isn't ready yet. It's built about an hour before the first game."
              : 'No CBPC board was built for this date.'}</p>
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
            <HonorableMentions cut={board.cut} onOpen={setOpenPlay} />
            {(board.llmModel || board.builtAt) && (
              <div className="cbpc-footer sd-muted">
                {board.llmModel && <span>Model: {board.llmModel}</span>}
                {board.builtAt && <span>Built {new Date(board.builtAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
              </div>
            )}
          </>
        )}
      </div>

      {openPlay && <CbpcWarRoom play={openPlay} onClose={closeDrawer} />}
    </div>
  );
}
