import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import * as contentService from '../../../data/services/contentService';
import predictionsService from '../../../data/services/predictionsService';
import predictionsPerformanceService from '../../../data/services/predictionsPerformanceService';
import playerStatsService from '../../../data/services/playerStatsServices';
import { TEAM_METADATA } from '../../../data/constants/apiConstants';
import { audienceMeta, formatCampaignSentAt } from '../../../data/constants/campaignsConstants';
import {
  listAlerts,
  deleteAlert,
  getAlertReads,
  formatAlertDate,
} from '../../../data/services/alertsService';
import { listCampaigns } from '../../../data/services/campaignsService';
import { refreshScoutDesk } from '../../../data/services/scoutDesk';
import CampaignDetailDrawer from './CampaignDetailDrawer';
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
  const clickable = !loading && !error && !!summary && !!gameCount;

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

function PickCard({ type, pick, aiPick, agree }) {
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
      {aiPick && (
        <div className="admin-pick__scout">
          <span className="admin-pick__scout-text">
            <span className="admin-pick__scout-label">Scout AI:</span> {aiPick}
          </span>
          {agree != null && (
            <span className={`admin-pick__scout-badge ${agree ? 'agree' : 'differ'}`}>
              {agree ? '= Model' : '≠ Model'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scout AI pick helpers (compared against the model pick on each card) ──────

// scout_ai may arrive as a structured object or as { raw: "<json string>" }.
function parseScoutAi(node) {
  const sa = node?.scout_ai;
  if (!sa) return null;
  if (typeof sa === 'string') { try { return JSON.parse(sa); } catch { return null; } }
  if (typeof sa.raw === 'string') { try { return JSON.parse(sa.raw); } catch { return null; } }
  return typeof sa === 'object' ? sa : null;
}

// Which side a pick string points to, by matching team names / abbreviations.
function pickTeamSide(text, game) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  const hit = (name, abbr) => {
    if (name && t.includes(name.toLowerCase())) return true;
    if (abbr && t.includes(String(abbr).toLowerCase())) return true;
    const nick = name ? name.toLowerCase().split(/\s+/).pop() : null;
    return !!nick && t.includes(nick);
  };
  const away = hit(game.away_team_name, game.away_team);
  const home = hit(game.home_team_name, game.home_team);
  if (away && !home) return 'away';
  if (home && !away) return 'home';
  return null;
}
const overUnderSide = (text) => {
  const t = String(text || '').toLowerCase();
  return t.includes('over') ? 'over' : t.includes('under') ? 'under' : null;
};

function ScoutSection({ icon, title, children, warning }) {
  if (!children) return null;
  return (
    <div className="admin-scout-sec">
      <div className={`admin-scout-sec__title${warning ? ' warn' : ''}`}>{icon} {title}</div>
      <div className="admin-scout-sec__body">{children}</div>
    </div>
  );
}

// The expandable full scouting report shown under the prediction cards.
function ScoutReport({ scout, pred }) {
  const [open, setOpen] = useState(false);
  const a = scout;
  const hasReport = a && (a.headline || a.totalLean || a.oddsEdge || a.mlAlignment ||
    a.pitchingMatchup || a.splitsEdge || a.keyFactors?.length || a.redFlags?.length || pred);
  if (!hasReport) return null;

  return (
    <div className="admin-scout-report">
      <button className="admin-scout-report__toggle" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        🧠 {open ? '▴ Hide scouting report' : '▾ Show scouting report'}
      </button>
      {open && (
        <div className="admin-scout-report__body">
          {a.headline && <p className="admin-scout-report__headline">{a.headline}</p>}
          {pred && (
            <div className="admin-scout-model">
              <div className="admin-scout-model__title">📊 Model prediction</div>
              <div className="admin-scout-model__grid">
                {(pred.blended_p_home_win ?? pred.p_home_win) != null && (
                  <div><span>Home win%</span><strong>{Math.round((pred.blended_p_home_win ?? pred.p_home_win) * 100)}%</strong></div>
                )}
                {(pred.blended_predicted_margin ?? pred.predicted_margin) != null && (
                  <div><span>Pred. margin</span><strong>{(pred.blended_predicted_margin ?? pred.predicted_margin) > 0 ? '+' : ''}{Number(pred.blended_predicted_margin ?? pred.predicted_margin).toFixed(1)}</strong></div>
                )}
                {(pred.blended_predicted_total ?? pred.predicted_total) != null && (
                  <div><span>Pred. total</span><strong>{Number(pred.blended_predicted_total ?? pred.predicted_total).toFixed(1)}</strong></div>
                )}
              </div>
            </div>
          )}
          <ScoutSection icon="📈" title="Total Lean">{a.totalLean ? `${a.totalLean.lean ? `${a.totalLean.lean} — ` : ''}${a.totalLean.reason || ''}`.trim() : null}</ScoutSection>
          <ScoutSection icon="💲" title="Odds Edge">{a.oddsEdge}</ScoutSection>
          <ScoutSection icon="🤖" title="ML Alignment">{a.mlAlignment}</ScoutSection>
          <ScoutSection icon="⚾" title="Pitching Matchup">{a.pitchingMatchup}</ScoutSection>
          <ScoutSection icon="📊" title="Splits Edge">{a.splitsEdge}</ScoutSection>
          {Array.isArray(a.keyFactors) && a.keyFactors.length > 0 && (
            <ScoutSection icon="🔑" title="Key Factors">
              <ul className="admin-scout-bullets">{a.keyFactors.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </ScoutSection>
          )}
          {Array.isArray(a.redFlags) && a.redFlags.length > 0 && (
            <ScoutSection icon="⚠" title="Red Flags" warning>
              <ul className="admin-scout-bullets warn">{a.redFlags.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </ScoutSection>
          )}
        </div>
      )}
    </div>
  );
}

function GamePicksSideModal({ game, date, onClose }) {
  const [predData, setPredData] = useState(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Pull the game's Scout AI scouting report to compare against the model pick.
  const gamePk = game?.game_pk;
  useEffect(() => {
    if (gamePk == null) { setPredData(null); return; }
    let cancelled = false;
    predictionsService.getByGamePk(gamePk)
      .then(d => { if (!cancelled) setPredData(d || null); })
      .catch(() => { if (!cancelled) setPredData(null); });
    return () => { cancelled = true; };
  }, [gamePk]);

  if (!game) return null;

  const awayId = teamMlbId(game.away_team);
  const homeId = teamMlbId(game.home_team);
  const awayWon = game.away_score > game.home_score;

  // Scout AI pick per market + whether it agrees with the model's pick side.
  const a = parseScoutAi(predData);
  const aiByType = {};
  for (const p of (Array.isArray(a?.picks) ? a.picks : [])) if (p?.type) aiByType[p.type] = p;
  if (!aiByType['Total'] && a?.totalLean?.lean) aiByType['Total'] = { type: 'Total', pick: a.totalLean.lean };

  const aiInfo = (market, ml) => {
    const ai = aiByType[market];
    if (!ai?.pick) return { aiPick: null, agree: null };
    const mlSide = market === 'Total'
      ? (overUnderSide(ml?.pick) || ml?.pick_side)
      : (pickTeamSide(ml?.pick, game) || ml?.pick_side);
    const aiSide = market === 'Total' ? overUnderSide(ai.pick) : pickTeamSide(ai.pick, game);
    const agree = (mlSide && aiSide) ? mlSide === aiSide : null;
    return { aiPick: ai.pick, agree };
  };

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
          <PickCard type="Moneyline" pick={game.moneyline} {...aiInfo('Moneyline', game.moneyline)} />
          <PickCard type="Run Line"  pick={game.run_line}  {...aiInfo('Run Line', game.run_line)} />
          <PickCard type="Total"     pick={game.totals}    {...aiInfo('Total', game.totals)} />
          <ScoutReport scout={a} pred={predData?.prediction || null} />
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

// ─── Pitcher-prop daily report (hit rate wedge + scorecard modal) ─────────────

const PITCHER_PROP_META = [
  { key: 'strikeouts',   label: 'Strikeouts',   short: 'K'   },
  { key: 'earned_runs',  label: 'Earned Runs',  short: 'ER'  },
  { key: 'hits_allowed', label: 'Hits Allowed', short: 'H'   },
  { key: 'outs',         label: 'Pitcher Outs', short: 'OUT' },
];

const GRADED_RESULTS = new Set(['win', 'loss', 'push']);
const propIsGraded = (prop) => !!prop && GRADED_RESULTS.has(prop.result);
// A pitcher counts as graded once any of its props has a final result.
const pitcherIsGraded = (p) => PITCHER_PROP_META.some(({ key }) => propIsGraded(p[key]));

// A pitcher with no renderable prop (all picks missing) is still populating.
const pitcherHasNoProps = (p) => !PITCHER_PROP_META.some(({ key }) => p[key] && p[key].pick != null);
// The report is incomplete if it has any pitcher whose props haven't loaded yet.
function reportIsIncomplete(report) {
  const pitchers = Array.isArray(report?.pitchers) ? report.pitchers : [];
  return pitchers.length === 0 || pitchers.some(pitcherHasNoProps);
}

// ET-local YYYY-MM-DD, offsetDays back from today.
function etDateStr(offsetDays = 0) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// Headshot needs the MLB person id specifically — only trust fields that are
// explicitly the MLB id (never an internal player_id/pitcher_id, which would
// 404 the CDN). Everything else is resolved from the name via /players/lookup.
function pitcherMlbId(p) {
  return p.pitcher_mlb_id ?? p.player_mlb_id ?? p.mlb_id ?? null;
}
function pitcherHeadshotUrl(id) {
  // Same URL the player profile header builds from player_mlb_id.
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_120,q_100/v1/people/${id}/headshot/67/current`;
}
function pitcherInitials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function PitcherPropReportModal({ data, title, onClose, onRefresh, refreshing }) {
  // Resolve each pitcher's MLB id by name (the report rows don't carry one) so we
  // can render the same headshot the player profile page uses.
  const [idByName, setIdByName] = useState({});

  useEffect(() => {
    let cancelled = false;
    const rows = Array.isArray(data?.pitchers) ? data.pitchers : [];
    const names = [...new Set(
      rows.filter(p => pitcherMlbId(p) == null && p.pitcher_name).map(p => p.pitcher_name),
    )];
    if (names.length === 0) return undefined;
    Promise.all(names.map(name =>
      playerStatsService.lookupPlayer({ fullName: name })
        .then(res => [name, res?.mlb_id ?? null])
        .catch(() => [name, null]),
    )).then(pairs => {
      if (cancelled) return;
      const map = {};
      for (const [name, id] of pairs) if (id != null) map[name] = id;
      setIdByName(map);
    });
    return () => { cancelled = true; };
  }, [data]);

  if (!data) return null;
  const raw = Array.isArray(data.pitchers) ? data.pitchers : [];
  // Graded pitchers at the top, pending at the bottom (stable within each group).
  const pitchers = [...raw].sort((a, b) => (pitcherIsGraded(b) ? 1 : 0) - (pitcherIsGraded(a) ? 1 : 0));
  const missingCount = pitchers.filter(pitcherHasNoProps).length;

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
            {data.date} · {pitchers.length} pitcher{pitchers.length !== 1 ? 's' : ''}
          </p>
          {onRefresh && (
            <button
              type="button"
              className="admin-pp-refresh"
              onClick={onRefresh}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <svg className={`admin-pp-refresh__icon${refreshing ? ' is-spinning' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
          {missingCount > 0 && (
            <p className="admin-pp-populating">
              {missingCount} pitcher{missingCount !== 1 ? 's' : ''} still populating — predictions load closer to first pitch. {onRefresh ? 'Hit Refresh to pull the latest.' : ''}
            </p>
          )}
          {data.summary && (
            <div className="admin-modal__summary">
              {PITCHER_PROP_META.map(({ key, short }) => {
                const s = data.summary[key];
                if (!s) return null;
                return (
                  <div key={key} className="admin-modal__summary-item">
                    <span className="admin-modal__summary-label">{short}</span>
                    <strong>{s.accuracy}%</strong>
                    <span className="admin-modal__summary-sub">{s.hits}/{s.picks}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pitchers.length === 0 ? (
          <div className="admin-modal__empty">No graded pitcher props for this date.</div>
        ) : (
          <div className="admin-pp-list">
            {pitchers.map((p, i) => {
              const mlbId = pitcherMlbId(p) ?? idByName[p.pitcher_name] ?? null;
              const graded = pitcherIsGraded(p);
              // Within a card, graded prop tiles first, pending last.
              const props = PITCHER_PROP_META
                .filter(({ key }) => p[key] && p[key].pick != null)
                .sort((a, b) => (propIsGraded(p[b.key]) ? 1 : 0) - (propIsGraded(p[a.key]) ? 1 : 0));
              return (
              <div key={p.game_pk ? `${p.game_pk}-${p.pitcher_name}` : i} className={`admin-pp-card${graded ? '' : ' admin-pp-card--pending'}`}>
                <div className="admin-pp-card__head">
                  <div className="admin-pp-card__avatar">
                    <span className="admin-pp-card__avatar-fallback">{pitcherInitials(p.pitcher_name)}</span>
                    {mlbId != null && (
                      <img
                        src={pitcherHeadshotUrl(mlbId)}
                        alt=""
                        className="admin-pp-card__avatar-img"
                        loading="lazy"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div className="admin-pp-card__id">
                    <span className="admin-pp-card__name">{p.pitcher_name}</span>
                    <span className="admin-pp-card__matchup">
                      {p.team} {p.home_away === 'home' ? 'vs' : '@'} {p.opponent}
                    </span>
                  </div>
                  {p.status && <span className={`admin-pp-card__status${graded ? ' is-final' : ''}`}>{p.status}</span>}
                </div>
                <div className="admin-pp-card__props">
                  {props.map(({ key, label }) => {
                    const prop = p[key];
                    return (
                      <div key={key} className={`admin-pp-prop admin-pp-prop--${prop.result || 'pending'}`}>
                        <div className="admin-pp-prop__top">
                          <span className="admin-pp-prop__label">{label}</span>
                          <ResultBadge result={prop.result} />
                        </div>
                        <div className="admin-pp-prop__pick">
                          {prop.pick != null ? String(prop.pick).toUpperCase() : '—'}
                          {prop.line != null ? ` ${prop.line}` : ''}
                        </div>
                        <div className="admin-pp-prop__nums">
                          <span>proj <strong>{prop.projection ?? '—'}</strong></span>
                          <span>actual <strong>{prop.actual ?? '—'}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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

function PlayerPropsWedge({ data, loading, error, onOpenPitcherReport, pitcherReportReady }) {
  const [day, setDay] = useState('yesterday');       // 'today' | 'yesterday'
  const [category, setCategory] = useState('pitcher'); // 'pitcher' | 'batter'

  const dayData = data?.[day] ?? null;
  const rows    = dayData?.[category] ?? [];
  // The daily pitcher-prop scorecard modal only applies to the pitcher category.
  const canOpenReport = category === 'pitcher' && !!onOpenPitcherReport;
  const reportReady = !!pitcherReportReady?.[day];

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

      {canOpenReport && !loading && !error && (
        <button
          type="button"
          className="admin-pp-report-link"
          onClick={() => onOpenPitcherReport(day)}
          disabled={!reportReady}
          title={reportReady ? 'Open the per-pitcher scorecard' : 'No graded pitcher props for this date yet'}
        >
          {reportReady
            ? `View ${day === 'today' ? "today's" : "yesterday's"} pitcher scorecard →`
            : 'No pitcher scorecard for this date yet'}
        </button>
      )}
    </div>
  );
}

// ─── Side drawer: Alert read receipts ─────────────────────────────────────────

function AlertReadsDrawer({ alert, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!alert) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    getAlertReads(alert.id)
      .then(d => { if (!cancelled) setData(d); })
      .catch(err => { if (!cancelled) setError(err?.message || 'Could not load read receipts.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [alert]);

  if (!alert) return null;

  const isSpecific = alert.targetType === 'specific';
  const reads = data?.reads ?? [];
  const readCount = data?.readCount ?? 0;
  const audienceSize = data?.audienceSize ?? null;

  return (
    <div className="admin-side-overlay" onClick={onClose}>
      <aside className="admin-side admin-side--reads" onClick={e => e.stopPropagation()} role="dialog" aria-label="Alert read receipts">
        <button className="admin-side__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="admin-side__header">
          <span className="admin-side__eyebrow">📬 Read Receipts</span>
          <h3 className="alert-reads__subject">{alert.subject}</h3>
          <div className="alert-reads__summary">
            {loading ? 'Loading…' : audienceSize != null
              ? `${readCount} of ${audienceSize} confirmed`
              : `${readCount} confirmed`}
          </div>
        </div>

        <div className="admin-side__body">
          {error ? (
            <div className="admin-alerts__error">⚠ {error}</div>
          ) : loading ? (
            <div className="empty-state">Loading recipients…</div>
          ) : reads.length === 0 ? (
            <div className="empty-state">
              {isSpecific
                ? 'No recipients targeted.'
                : 'No users have confirmed this alert yet.'}
            </div>
          ) : (
            <>
              <div className="alert-reads__list">
                {reads.map((r, i) => (
                  <div
                    key={`${r.email}-${i}`}
                    className={`alert-reads__row${r.readAt ? ' is-read' : ' is-unread'}`}
                  >
                    <span className={`alert-reads__dot${r.readAt ? ' is-read' : ''}`} aria-hidden="true" />
                    <div className="alert-reads__row-main">
                      <span className="alert-reads__email">{r.email}</span>
                      <span className="alert-reads__time">
                        {r.readAt ? formatAlertDate(r.readAt) : 'Not yet read'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {data?.capped && (
                <div className="alert-reads__capped-note">
                  Showing the {reads.length} most recent confirmations · total {readCount}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  // Public URL for a post — articles live under /sandlot-insider, blogs under /blogs.
  const publicUrlFor = (post) =>
    `/${post.type === 'article' ? 'sandlot-insider' : 'blogs'}/${post.slug}`;

  // Posts state (existing)
  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  // Pitcher-prop daily report (today / yesterday) — opened from the player-prop
  // section; on fetch failure the data stays null and the trigger shows disabled.
  const [pitcherToday, setPitcherToday] = useState(null);
  const [pitcherYesterday, setPitcherYesterday] = useState(null);
  const [pitcherRefreshing, setPitcherRefreshing] = useState(false);

  // Fetch one day's pitcher-prop report; pass force to bypass the cache.
  const loadPitcherReport = useCallback((which, { force = false } = {}) => {
    const date = which === 'today' ? etDateStr(0) : etDateStr(-1);
    const setter = which === 'today' ? setPitcherToday : setPitcherYesterday;
    return predictionsPerformanceService
      .getPitcherPropsDailyReport(date, force ? { ttl: 0 } : {})
      .then(data => { setter(data || null); return data || null; })
      .catch(() => null);
  }, []);

  // Manual refresh from inside the modal — always cache-bypassing.
  const refreshPitcherReport = useCallback(async (which) => {
    setPitcherRefreshing(true);
    try { await loadPitcherReport(which, { force: true }); }
    finally { setPitcherRefreshing(false); }
  }, [loadPitcherReport]);

  // Initial load + auto-retry: if a report comes back incomplete (predictions
  // still populating), refetch fresh a couple times with backoff.
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const run = async (force) => {
      const [t, y] = await Promise.all([
        loadPitcherReport('today', { force }),
        loadPitcherReport('yesterday', { force }),
      ]);
      if (cancelled) return;
      attempt += 1;
      if ((reportIsIncomplete(t) || reportIsIncomplete(y)) && attempt < 3) {
        setTimeout(() => { if (!cancelled) run(true); }, attempt * 5000); // 5s, 10s
      }
    };
    run(false);
    return () => { cancelled = true; };
  }, [loadPitcherReport]);

  const [reportModal, setReportModal] = useState(null); // null | 'today' | 'yesterday'
  const [pitcherReportModal, setPitcherReportModal] = useState(null); // null | 'today' | 'yesterday'
  const [selectedGame, setSelectedGame] = useState(null); // { game, date } | null
  const [alertComposerOpen, setAlertComposerOpen] = useState(false);

  // Alert manager state
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(null);
  const [alertDeleteConfirm, setAlertDeleteConfirm] = useState(null);
  const [alertDeletingId, setAlertDeletingId] = useState(null);
  const [readsDrawerAlert, setReadsDrawerAlert] = useState(null);

  // Campaign manager state
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState(null);
  const [openCampaign, setOpenCampaign] = useState(null); // lightweight summary; drawer fetches full row

  // Scout AI Desk refresh (admin force re-pick)
  const [deskRefreshing, setDeskRefreshing] = useState(false);
  const [deskRefreshMsg, setDeskRefreshMsg] = useState(null); // { tone: 'ok'|'empty'|'error', text }

  const handleRefreshDesk = async () => {
    if (deskRefreshing) return;
    setDeskRefreshing(true);
    setDeskRefreshMsg(null);
    // The funnel (audit → AI selection → news/injury web checks) can run ~a
    // minute; cap the wait so a hung request fails gracefully instead of
    // spinning forever.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 150000); // 2.5 min
    try {
      const board = await refreshScoutDesk(undefined, { signal: controller.signal });
      const picks = Array.isArray(board?.picks) ? board.picks : [];
      if (picks.length === 0) {
        setDeskRefreshMsg({
          tone: 'empty',
          text: board?.message || 'No props cleared the audit gate yet — lines likely haven’t posted. Try again closer to first pitch.',
        });
      } else {
        setDeskRefreshMsg({ tone: 'ok', text: `Scout AI Desk rebuilt — ${picks.length} pick${picks.length === 1 ? '' : 's'} on the board.` });
      }
    } catch (e) {
      setDeskRefreshMsg({
        tone: 'error',
        text: e?.name === 'AbortError'
          ? 'Refresh timed out after 2.5 minutes. The board may still be rebuilding server-side — reload in a moment to check.'
          : (e?.message || 'Refresh failed. Please try again.'),
      });
    } finally {
      clearTimeout(timer);
      setDeskRefreshing(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch posts
  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    contentService.adminList()
      .then(list => {
        if (cancelled) return;
        const sorted = Array.isArray(list)
          ? [...list].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          : [];
        setPosts(sorted);
      })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
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

  // Fetch sent alerts for the Alert Manager section
  useEffect(() => {
    let cancelled = false;
    listAlerts()
      .then(list => { if (!cancelled) setAlerts(list); })
      .catch(err => { if (!cancelled) setAlertsError(err?.message || 'Could not load alerts.'); })
      .finally(() => { if (!cancelled) setAlertsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch recent campaigns for the Campaign Manager section
  useEffect(() => {
    let cancelled = false;
    listCampaigns()
      .then(list => { if (!cancelled) setCampaigns(list); })
      .catch(err => { if (!cancelled) setCampaignsError(err?.message || 'Could not load campaigns.'); })
      .finally(() => { if (!cancelled) setCampaignsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleDeleteAlert = async (alertId) => {
    setAlertDeletingId(alertId);
    try {
      await deleteAlert(alertId);
      setAlerts(curr => curr.filter(a => a.id !== alertId));
      setAlertDeleteConfirm(null);
    } catch (err) {
      setAlertsError(err?.message || 'Could not delete alert.');
    } finally {
      setAlertDeletingId(null);
    }
  };

  const handleAlertCreated = (created) => {
    if (created) setAlerts(curr => [created, ...curr]);
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
            <h1>Admin Dashboard</h1>
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
            <Link to="/admin/prediction-audit" className="admin-action-btn">
              <svg className="admin-action-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Prediction Audit
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
            <button
              type="button"
              className="admin-action-btn admin-action-btn--accent"
              onClick={handleRefreshDesk}
              disabled={deskRefreshing}
              aria-busy={deskRefreshing}
            >
              <svg
                className={`admin-action-btn__icon${deskRefreshing ? ' is-spinning' : ''}`}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {deskRefreshing ? 'Refreshing…' : 'Refresh Scout AI Desk'}
            </button>
          </div>
        </div>

        {deskRefreshing ? (
          <div className="admin-desk-refresh-note admin-desk-refresh-note--busy" role="status">
            Rebuilding the board — running the full funnel (audit → AI selection → news/injury checks). This can take up to a minute…
          </div>
        ) : deskRefreshMsg && (
          <div className={`admin-desk-refresh-note admin-desk-refresh-note--${deskRefreshMsg.tone}`} role="status">
            {deskRefreshMsg.text}
          </div>
        )}

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
            onOpenPitcherReport={(d) => setPitcherReportModal(d)}
            pitcherReportReady={{
              today: Array.isArray(pitcherToday?.pitchers) && pitcherToday.pitchers.length > 0,
              yesterday: Array.isArray(pitcherYesterday?.pitchers) && pitcherYesterday.pitchers.length > 0,
            }}
          />
        </div>

        {/* ── Row 4: Alert Manager ── */}
        <div className="admin-section admin-alerts">
          <div className="admin-section-header">
            <h2>Alert Manager</h2>
            <div className="admin-alerts__header-right">
              <span className="admin-section-count">
                {alertsLoading ? '…' : `${alerts.length} sent`}
              </span>
              <button
                type="button"
                className="admin-action-btn admin-action-btn--sm"
                onClick={() => setAlertComposerOpen(true)}
              >
                + New alert
              </button>
            </div>
          </div>

          {alertsError && (
            <div className="admin-alerts__error">⚠ {alertsError}</div>
          )}

          {alertsLoading ? (
            <div className="empty-state">Loading alerts…</div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              No alerts sent yet. Click "+ New alert" to publish your first one.
            </div>
          ) : (
            <div className="admin-alert-list">
              {alerts.map(a => {
                const audienceLabel = a.targetType === 'all'
                  ? 'All users'
                  : `Specific (${(a.targetEmails || []).length})`;
                const audienceAccent = a.targetType === 'all' ? 'teal' : 'gold';
                const typeLabel = a.displayType === 'modal' ? '⚡ Modal popup' : '📬 Inbox';
                const confirming = alertDeleteConfirm === a.id;
                const deleting   = alertDeletingId === a.id;
                const isModal    = a.displayType === 'modal';
                const readCount  = a.readCount ?? 0;
                const audSize    = a.audienceSize;
                const receiptLabel = audSize != null
                  ? `${readCount} of ${audSize} confirmed`
                  : `${readCount} confirmed`;

                return (
                  <div key={a.id} className="admin-alert-row">
                    <div className="admin-alert-row__main">
                      <span className="admin-alert-row__subject">
                        {a.subject || '(no subject)'}
                      </span>
                      <div className="admin-alert-row__meta">
                        <span className={`admin-audience-pill admin-audience-pill--${audienceAccent}`}>
                          {audienceLabel}
                        </span>
                        <span className="admin-alert-row__type-chip">{typeLabel}</span>
                        {isModal && (
                          <button
                            type="button"
                            className="admin-alert-row__receipt"
                            onClick={() => setReadsDrawerAlert(a)}
                            aria-label={`View read receipts (${receiptLabel})`}
                          >
                            ✓ {receiptLabel}
                            <span className="admin-alert-row__receipt-arrow" aria-hidden="true">→</span>
                          </button>
                        )}
                        <span className="admin-alert-row__sub">
                          {formatAlertDate(a.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="admin-alert-row__actions">
                      {confirming ? (
                        <>
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => handleDeleteAlert(a.id)}
                            disabled={deleting}
                          >
                            {deleting ? 'Deleting…' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setAlertDeleteConfirm(null)}
                            disabled={deleting}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => setAlertDeleteConfirm(a.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Row 5: Campaign Manager ── */}
        <div className="admin-section admin-campaigns">
          <div className="admin-section-header">
            <h2>Campaign Manager</h2>
            <div className="admin-campaigns__header-right">
              <span className="admin-section-count">
                {campaignsLoading ? '…' : `${campaigns.length} sent`}
              </span>
              <Link to="/admin/campaigns" className="admin-action-btn admin-action-btn--sm">
                Manage campaigns →
              </Link>
            </div>
          </div>

          {campaignsError ? (
            <div className="admin-alerts__error">⚠ {campaignsError}</div>
          ) : campaignsLoading ? (
            <div className="empty-state">Loading campaigns…</div>
          ) : campaigns.length === 0 ? (
            <div className="empty-state">
              No campaigns yet. Click "Manage campaigns" to send your first one.
            </div>
          ) : (
            <div className="admin-campaign-list">
              {campaigns.slice(0, 5).map(c => {
                const meta = audienceMeta(c.audience);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="admin-campaign-row admin-campaign-row--button"
                    onClick={() => setOpenCampaign(c)}
                    title={`View "${c.subject || '(no subject)'}"`}
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
                          {(c.recipientCount ?? 0).toLocaleString()} recipients · {formatCampaignSentAt(c.sentAt)}
                        </span>
                      </div>
                    </div>
                    <span className={`campaign-history__status campaign-history__status--${c.status}`}>
                      {c.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Row 6: Content Manager ── */}
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
            <Link to="/admin/new" className="admin-action-btn admin-filters__create">
              <svg className="admin-action-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
              New Post
            </Link>
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
                  {filteredPosts.map(post => {
                    const stop = (e) => e.stopPropagation();
                    return (
                      <tr
                        key={post.id}
                        className="posts-table__row--clickable"
                        onClick={() => navigate(publicUrlFor(post))}
                        title={`View ${post.title}`}
                      >
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
                        <td onClick={stop}>
                          <div className="post-actions">
                            <Link to={`/admin/edit/${post.id}`} className="btn-secondary" onClick={stop}>Edit</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {pitcherReportModal && (
        <PitcherPropReportModal
          data={pitcherReportModal === 'today' ? pitcherToday : pitcherYesterday}
          title={pitcherReportModal === 'today' ? "Today's Pitcher Prop Report" : "Yesterday's Pitcher Prop Report"}
          onClose={() => setPitcherReportModal(null)}
          onRefresh={() => refreshPitcherReport(pitcherReportModal)}
          refreshing={pitcherRefreshing}
        />
      )}

      <AlertComposerModal
        open={alertComposerOpen}
        onClose={() => setAlertComposerOpen(false)}
        onCreated={handleAlertCreated}
      />

      {readsDrawerAlert && (
        <AlertReadsDrawer
          alert={readsDrawerAlert}
          onClose={() => setReadsDrawerAlert(null)}
        />
      )}

      {openCampaign && (
        <CampaignDetailDrawer
          campaignId={openCampaign.id}
          summary={openCampaign}
          onClose={() => setOpenCampaign(null)}
          onDeleted={(id) => {
            setCampaigns(prev => prev.filter(c => c.id !== id));
            setOpenCampaign(null);
          }}
        />
      )}
    </div>
  );
}

export default AdminPage;
