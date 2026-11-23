import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import trustLedgerService from '../../../data/services/trustLedgerService';
import { getEliminatedMlbIds } from '../../../data/services/postseasonStatus';
import { TEAM_METADATA } from '../../../data/constants/apiConstants';
import { WINTER_ENABLED } from '../../../data/constants/leagues';
import {
  CBPC_LEAGUES, CBPC_SLUGS, isNationsLeague, leagueTip, rememberWinterLeague, rememberedWinterLeague, seasonLabel,
} from '../../../data/constants/cbpcConstants';
import cbpcService from '../../../data/services/cbpcService';
import LeagueTabs from '../../LeagueTabs';
import batterPropIcon from '../../../assets/icons/batter-prop.png';
import pitcherPropIcon from '../../../assets/icons/pitcher-prop.png';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/scout-desk.css';
import '../../../styles/predictions-page-styling/trust-ledger.css';

// Reverse lookup: team name as the API sends it → { abbr, mlbId, urlName, ... }
// from TEAM_METADATA (keyed by abbr). TEAM_METADATA stores "City Nickname"
// (e.g. "Los Angeles Dodgers") for every team except Athletics ("Athletics"
// alone) — so a bare-nickname API ("Dodgers"), a city-prefixed one ("Oakland
// Athletics"), or a branding alias ("D-backs") all need to resolve.
const TEAM_ENTRIES = Object.entries(TEAM_METADATA).map(([abbr, meta]) => ({ abbr, ...meta }));

// Last word of the name, except the three two-word nicknames (Red/White Sox,
// Blue Jays) where the trailing word alone ("Sox"/"Jays") isn't unique.
function nicknameOf(fullName) {
  const words = fullName.split(' ');
  const last = words[words.length - 1];
  return (last === 'Sox' || last === 'Jays') ? words.slice(-2).join(' ') : last;
}

// Branding the API may use instead of the TEAM_METADATA nickname — MLB itself
// markets Arizona as "D-backs" about as often as "Diamondbacks".
const TEAM_NAME_ALIASES = {
  AZ: ['D-backs', "D'backs", 'Dbacks'],
};

const TEAM_BY_NAME = TEAM_ENTRIES.reduce((acc, meta) => {
  acc[meta.name] = meta;
  acc[nicknameOf(meta.name)] = meta;
  (TEAM_NAME_ALIASES[meta.abbr] || []).forEach((alias) => { acc[alias] = meta; });
  return acc;
}, {});

function findTeamMeta(apiName) {
  if (!apiName) return null;
  if (TEAM_BY_NAME[apiName]) return TEAM_BY_NAME[apiName];
  const lower = apiName.toLowerCase();
  return TEAM_ENTRIES.find((meta) =>
    apiName.endsWith(meta.name) || meta.name.toLowerCase() === lower || nicknameOf(meta.name).toLowerCase() === lower
  ) || null;
}


// ── Formatting ───────────────────────────────────────────────────────────────
function fmtPct(v) { return v == null ? '—' : v.toFixed(1); }
// Win%/OPS convention: 3 decimals, no leading zero (".634", not "0.634").
function fmtDec(v) { return v == null ? '—' : v.toFixed(3).replace(/^0/, ''); }
function fmtNum(v, d) { return v == null ? '—' : v.toFixed(d); }

// ── Status thresholds — good / warn / default only, never a third color ─────
function statClass(val, isGood, isWarn) {
  if (val == null) return '';
  if (isGood(val)) return 'tl-stat-good';
  if (isWarn(val)) return 'tl-stat-warn';
  return '';
}

const COLUMNS = [
  { key: 'rank', label: '#' },
  { key: 'team', label: 'Team' },
  { key: 'trustPercentile', label: 'Trust' },
  { key: 'mlbRank', label: 'MLB Rank', sortable: false },
  { key: 'winPct', label: 'Season' },
  { key: 'lastTen', label: 'Last 10' },
  { key: 'sp_era', label: 'Today’s Starter · L5 form' },
  { key: 'top6Ops', label: 'Top-6 L5 OPS' },
  { key: 'bp_era', label: 'Bullpen (available arms)' },
];

// Starter/bullpen ERA are compound fields — sort by the underlying number.
function getSortVal(t, key) {
  if (key === 'sp_era') return t.sp ? t.sp.era : null;
  if (key === 'bp_era') return t.bullpen ? t.bullpen.era : null;
  return t[key];
}

// Mode-aware tooltip for the MLB hitting/pitching rank badges — postseason
// ranks are scoped to just the playoff field (and shrink as teams get
// eliminated), so the copy must not imply a fixed "of 30" pool there.
function rankTitle(kind, rank, postseason) {
  if (rank == null) {
    return postseason ? `No ${kind} games played yet this postseason` : `${kind} rank not available`;
  }
  return postseason
    ? `#${rank} in team ${kind} among playoff teams so far`
    : `#${rank} in team ${kind} across MLB`;
}

// ── Record-splits diverging bar (centered at .500) ──────────────────────────
// `wide` widens the label column for the longer "vs LHP at Home"-style
// labels in the hand/location drill-down — the short "Home"/"vs LHP" labels
// elsewhere don't need that much room and look gappy with it.
function SplitBar({ label, value, wide }) {
  const clamped = value == null ? null : Math.max(0, Math.min(1, value));
  const above = clamped != null && clamped >= 0.5;
  const magnitude = clamped == null ? 0 : Math.abs(clamped - 0.5) * 100;
  return (
    <div className="tl-split-row">
      <span className={`tl-split-label${wide ? ' tl-split-label--wide' : ''}`}>{label}</span>
      <span className="tl-split-track">
        <span className="tl-split-center" />
        {clamped != null && (
          <span
            className={`tl-split-fill ${above ? 'tl-split-fill--good' : 'tl-split-fill--warn'}`}
            style={above ? { left: '50%', width: `${magnitude}%` } : { right: '50%', width: `${magnitude}%` }}
          />
        )}
      </span>
      <span className="tl-split-val tl-num">{fmtDec(value)}</span>
    </div>
  );
}

// ── Record splits panel (always regular-season data, both modes) ───────────
function RecordSplitsPanel({ splits }) {
  return (
    <div className="tl-splits-panel">
      <div className="tl-splits-label">Record splits &middot; full season</div>
      <div className="tl-splits-columns">
        <div className="tl-splits-group">
          <SplitBar label="Home" value={splits.homePct} />
          <SplitBar label="Away" value={splits.awayPct} />
        </div>
        <div className="tl-splits-group">
          <SplitBar label="vs LHP" value={splits.vsLeftSpPct} />
          <SplitBar label="vs RHP" value={splits.vsRightSpPct} />
        </div>
        <div className="tl-splits-group">
          <SplitBar label="vs LHP at Home" value={splits.vsLeftSpHomePct} wide />
          <SplitBar label="vs LHP on Road" value={splits.vsLeftSpAwayPct} wide />
        </div>
        <div className="tl-splits-group">
          <SplitBar label="vs RHP at Home" value={splits.vsRightSpHomePct} wide />
          <SplitBar label="vs RHP on Road" value={splits.vsRightSpAwayPct} wide />
        </div>
      </div>
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────
function TrustTableRow({ team, rank, postseason, eliminated }) {
  const [expanded, setExpanded] = useState(false);
  const meta = findTeamMeta(team.team);
  const name = meta ? nicknameOf(meta.name) : team.team;
  // Postseason: a club knocked out of the bracket reads "eliminated"; one still
  // alive but off today keeps "no game today".
  const noGameText = postseason && meta && eliminated?.has(meta.mlbId) ? 'eliminated' : 'no game today';

  let starterCell;
  if (!team.spName) {
    starterCell = <span className="tl-no-game">{noGameText}</span>;
  } else {
    const sp = team.sp;
    const eraCls = sp ? statClass(sp.era, (v) => v <= 3.5, (v) => v >= 5.5) : '';
    const whipCls = sp ? statClass(sp.whip, (v) => v <= 1.15, (v) => v >= 1.45) : '';
    const k9Cls = sp ? statClass(sp.k9, (v) => v >= 9.0, (v) => v <= 5.5) : '';
    starterCell = (
      <div className="tl-starter-cell">
        <span className="tl-starter-name">{team.spName}</span>
        <span className="tl-starter-stats">
          <span className={eraCls}><b>{sp ? fmtNum(sp.era, 2) : '—'}</b> ERA</span>
          <span className={whipCls}><b>{sp ? fmtNum(sp.whip, 2) : '—'}</b> WHIP</span>
          <span className={k9Cls}><b>{sp ? fmtNum(sp.k9, 2) : '—'}</b> K/9</span>
        </span>
      </div>
    );
  }

  const opsCls = team.top6Ops != null ? statClass(team.top6Ops, (v) => v >= 0.780, (v) => v <= 0.620) : '';
  const opsCell = team.top6Ops != null
    ? <span className={`tl-num ${opsCls}`}>{fmtDec(team.top6Ops)}</span>
    : <span className="tl-no-game">—</span>;

  let bullpenCell;
  const bp = team.bullpen;
  if (!bp) {
    bullpenCell = <span className="tl-no-game">{noGameText}</span>;
  } else {
    const eraCls = statClass(bp.era, (v) => v <= 3.6, (v) => v >= 4.6);
    const whipCls = statClass(bp.whip, (v) => v <= 1.2, (v) => v >= 1.4);
    const k9Cls = statClass(bp.k9, (v) => v >= 9.5, (v) => v <= 7.5);
    const bb9Cls = statClass(bp.bb9, (v) => v <= 3.0, (v) => v >= 4.2);
    bullpenCell = (
      <div className="tl-bullpen-cell">
        <span className={eraCls}><b>{fmtNum(bp.era, 2)}</b> ERA</span>
        <span className={whipCls}><b>{fmtNum(bp.whip, 2)}</b> WHIP</span>
        <span className={k9Cls}><b>{fmtNum(bp.k9, 2)}</b> K/9</span>
        <span className={bb9Cls}><b>{fmtNum(bp.bb9, 2)}</b> BB/9</span>
      </div>
    );
  }

  const hasSplits = !!team.recordSplits;
  const toggleExpanded = () => { if (hasSplits) setExpanded((e) => !e); };

  return (
    <>
      <tr
        className={hasSplits ? 'tl-row-expandable' : ''}
        onClick={hasSplits ? toggleExpanded : undefined}
        role={hasSplits ? 'button' : undefined}
        tabIndex={hasSplits ? 0 : undefined}
        aria-expanded={hasSplits ? expanded : undefined}
        aria-label={hasSplits ? `${expanded ? 'Hide' : 'Show'} record splits for ${name}` : undefined}
        onKeyDown={hasSplits ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(); }
        } : undefined}
      >
        <td className="tl-td-rank tl-num">{rank}</td>
        <td className="tl-td-team">
          <span className="tl-team-cell">
            {meta?.mlbId ? (
              <img
                src={`https://www.mlbstatic.com/team-logos/${meta.mlbId}.svg`}
                alt=""
                className="tl-team-logo"
                onError={(e) => { e.target.style.visibility = 'hidden'; }}
              />
            ) : <span className="tl-team-logo tl-team-logo--empty" />}
            {name}
            {hasSplits && <span className={`tl-row-caret${expanded ? ' tl-row-caret--open' : ''}`} aria-hidden="true">▾</span>}
          </span>
        </td>
        <td>
          <div className="tl-trust-cell">
            <span className="tl-meter"><span style={{ width: `${team.trustPercentile ?? 0}%` }} /></span>
            <span className="tl-trust-pct tl-num">{fmtPct(team.trustPercentile)}</span>
          </div>
        </td>
        <td>
          <span className="tl-rank-badges">
            <span className="tl-rank-badge" title={rankTitle('offense', team.mlbHittingRank, postseason)}>
              <img src={batterPropIcon} alt="" className="tl-rank-badge-icon" />
              {team.mlbHittingRank != null ? `#${team.mlbHittingRank}` : '—'}
            </span>
            <span className="tl-rank-badge" title={rankTitle('pitching', team.mlbPitchingRank, postseason)}>
              <img src={pitcherPropIcon} alt="" className="tl-rank-badge-icon" />
              {team.mlbPitchingRank != null ? `#${team.mlbPitchingRank}` : '—'}
            </span>
          </span>
        </td>
        <td className="tl-num tl-muted">{fmtDec(team.winPct)}</td>
        <td className="tl-num tl-muted">{team.lastTen || '—'}</td>
        <td>{starterCell}</td>
        <td>{opsCell}</td>
        <td>{bullpenCell}</td>
      </tr>
      {expanded && hasSplits && (
        <tr className="tl-splits-row">
          <td colSpan={COLUMNS.length}>
            <RecordSplitsPanel splits={team.recordSplits} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Loading / locked / empty states ─────────────────────────────────────────
function TrustLedgerSkeleton() {
  return (
    <div className="tl-skel-table" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="tl-skel-row">
          <span className="tl-skel tl-skel-rank" />
          <span className="tl-skel tl-skel-name" />
          <span className="tl-skel tl-skel-meter" />
          <span className="tl-skel tl-skel-chip" />
        </div>
      ))}
    </div>
  );
}

function TrustLedgerLocked({ onUpgrade }) {
  return (
    <div className="tl-locked">
      <span className="tl-locked-icon">🔒</span>
      <h3 className="tl-locked-title">Trust Ledger is a Premium feature</h3>
      <p className="tl-locked-sub">
        Upgrade to see reliability rankings for all 30 teams, plus today's starter, lineup, and bullpen form.
      </p>
      <button type="button" className="sd-btn primary tl-locked-btn" onClick={onUpgrade}>
        Upgrade to Premium
      </button>
    </div>
  );
}

function TrustLedgerEmpty({ postseason }) {
  return (
    <div className="sd-empty">
      <span className="sd-empty-icon">🗓️</span>
      <p>
        {postseason
          ? 'No postseason bracket yet — check back once the playoffs begin.'
          : 'Standings return when the season starts.'}
      </p>
    </div>
  );
}

// ── Mode toggle ──────────────────────────────────────────────────────────────
function TrustModeToggle({ postseason, onChange, disabled }) {
  return (
    <div className="tl-mode-toggle" role="group" aria-label="Season mode">
      <button
        type="button"
        className={`tl-mode-btn${!postseason ? ' tl-mode-btn--active' : ''}`}
        onClick={() => onChange(false)}
        disabled={disabled}
      >
        Regular Season
      </button>
      <button
        type="button"
        className={`tl-mode-btn${postseason ? ' tl-mode-btn--active' : ''}`}
        onClick={() => onChange(true)}
        disabled={disabled}
      >
        Postseason
      </button>
    </div>
  );
}

// ── Winter-league board (Serie del Caribe tab) ──────────────────────────────
// One board per winter league; ranks and percentiles are within that league.
// Winter rows always have null starter/lineup/bullpen/MLB ranks, so those
// columns are left out rather than shown as dashes.
function winterTodayText(g) {
  if (!g) return 'no game today';
  const opp = `${g.isHome ? 'vs' : '@'} ${g.opponent}`;
  if (g.status === 'Final' || g.status === 'Completed Early') return `${opp} · final`;
  if (g.status === 'Scheduled' && g.gameDatetimeUtc) {
    return `${opp} · ${new Date(g.gameDatetimeUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return `${opp} · ${g.status === 'In Progress' ? 'in progress' : String(g.status || '').toLowerCase()}`;
}

function WinterLogo({ src }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <span className="tl-team-logo tl-team-logo--empty" />;
  return <img src={src} alt="" className="tl-team-logo" onError={() => setFailed(true)} />;
}

const WINTER_COLUMN_COUNT = 7;

function WinterTrustRow({ team, leagueShort, leagueSize, smallSample }) {
  const [expanded, setExpanded] = useState(false);
  const hasSplits = !!team.recordSplits;
  const toggle = () => { if (hasSplits) setExpanded((e) => !e); };
  const rankText = (r) => (r != null ? `#${r} of ${leagueSize}` : '—');
  return (
    <>
      <tr
        className={hasSplits ? 'tl-row-expandable' : ''}
        onClick={hasSplits ? toggle : undefined}
        role={hasSplits ? 'button' : undefined}
        tabIndex={hasSplits ? 0 : undefined}
        aria-expanded={hasSplits ? expanded : undefined}
        aria-label={hasSplits ? `${expanded ? 'Hide' : 'Show'} record splits for ${team.team}` : undefined}
        onKeyDown={hasSplits ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } } : undefined}
      >
        <td className="tl-td-rank tl-num">{team.trustRank ?? '—'}</td>
        <td className="tl-td-team">
          <span className="tl-team-cell">
            <WinterLogo src={team.logoUrl} />
            {team.team}
            {hasSplits && <span className={`tl-row-caret${expanded ? ' tl-row-caret--open' : ''}`} aria-hidden="true">▾</span>}
          </span>
        </td>
        <td>
          <div className="tl-trust-cell" title={smallSample ? `Percentile within a ${leagueSize}-team league: a small sample` : undefined}>
            <span className="tl-meter"><span style={{ width: `${team.trustPercentile ?? 0}%` }} /></span>
            <span className="tl-trust-pct tl-num">{fmtPct(team.trustPercentile)}</span>
          </div>
        </td>
        <td>
          <span className="tl-rank-badges">
            <span className="tl-rank-badge" title={`Team OPS rank in ${leagueShort}: ${rankText(team.leagueHittingRank)}`}>
              <img src={batterPropIcon} alt="" className="tl-rank-badge-icon" />
              {rankText(team.leagueHittingRank)}
            </span>
            <span className="tl-rank-badge" title={`Team ERA rank in ${leagueShort}: ${rankText(team.leaguePitchingRank)}`}>
              <img src={pitcherPropIcon} alt="" className="tl-rank-badge-icon" />
              {rankText(team.leaguePitchingRank)}
            </span>
          </span>
        </td>
        <td className="tl-num tl-muted">{fmtDec(team.winPct)}</td>
        <td className="tl-num tl-muted">{team.lastTen || '—'}</td>
        <td><span className="tl-no-game">{winterTodayText(team.todayGame)}</span></td>
      </tr>
      {expanded && hasSplits && (
        <tr className="tl-splits-row">
          <td colSpan={WINTER_COLUMN_COUNT}><RecordSplitsPanel splits={team.recordSplits} /></td>
        </tr>
      )}
    </>
  );
}

function WinterTrustBoard({ onUpgrade }) {
  const [wLeague, setWLeague] = useState(rememberedWinterLeague);
  const [season, setSeason] = useState(null); // null = the league's current season
  const [postseason, setPostseason] = useState(false);
  const [leagues, setLeagues] = useState([]);
  const [board, setBoard] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | locked | error

  useEffect(() => {
    let alive = true;
    cbpcService.getLeagues().then(l => { if (alive) setLeagues(l); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const nations = isNationsLeague(wLeague);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    trustLedgerService.getCbpcTrustLedger(wLeague, {
      season: season || undefined,
      postseason: postseason && !nations,
      signal: controller.signal,
    })
      .then(data => { setBoard(data); setState('ok'); })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setState(err.status === 403 ? 'locked' : 'error');
      });
    return () => controller.abort();
  }, [wLeague, season, postseason, nations]);

  const pickLeague = (slug) => {
    setWLeague(slug);
    setSeason(null);
    if (isNationsLeague(slug)) setPostseason(false);
    rememberWinterLeague(slug);
  };

  const info = leagues.find(l => l.slug === wLeague);
  const leagueShort = CBPC_LEAGUES[wLeague].short;
  const rows = board?.rows ?? [];
  const smallSample = board && !board.percentileReliable;

  return (
    <>
      <div className="tl-mode-row">
        <div className="tl-mode-toggle" role="group" aria-label="Winter league">
          {CBPC_SLUGS.map(slug => (
            <button
              key={slug}
              type="button"
              className={`tl-mode-btn${wLeague === slug ? ' tl-mode-btn--active' : ''}`}
              onClick={() => pickLeague(slug)}
              title={leagueTip(slug)}
            >
              {CBPC_LEAGUES[slug].short}
            </button>
          ))}
        </div>
        {info && (
          <select
            className="tl-season-select"
            aria-label="Season"
            value={season ?? info.current_season}
            onChange={(e) => setSeason(Number(e.target.value))}
          >
            {[...info.seasons].reverse().map(s => <option key={s} value={s}>{seasonLabel(s)}</option>)}
          </select>
        )}
        {!nations && <TrustModeToggle postseason={postseason} onChange={setPostseason} disabled={state === 'loading' || state === 'locked'} />}
      </div>

      {state === 'ok' && rows.length > 0 && (
        <div className="tl-legend-row">
          <span><span className="tl-dot tl-dot--accent" />trust meter &middot; percentile within {leagueShort}</span>
          {smallSample && <span className="tl-small-sample">{board.leagueSize}-team league &middot; small sample</span>}
          <span>league ranks: team OPS &middot; team ERA</span>
        </div>
      )}

      {state === 'loading' ? <TrustLedgerSkeleton />
        : state === 'locked' ? <TrustLedgerLocked onUpgrade={onUpgrade} />
        : state === 'error' ? <div className="sd-error">⚠ Couldn&apos;t load the {leagueShort} Trust Ledger right now.</div>
        : rows.length === 0 ? (
          <div className="sd-empty">
            <span className="sd-empty-icon">🗓️</span>
            <p>No standings yet for {leagueShort} {board?.seasonLabel || ''}{postseason ? ' postseason' : ''}.</p>
          </div>
        ) : (
          <div className="tl-table-scroll">
            <table className="tl-table">
              <thead>
                <tr>
                  <th>#</th><th>Team</th><th>Trust</th><th>League rank</th>
                  <th>{postseason ? 'Playoff' : 'Season'}</th><th>Last 10</th><th>Today</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <WinterTrustRow key={t.teamId} team={t} leagueShort={leagueShort} leagueSize={board.leagueSize} smallSample={smallSample} />
                ))}
              </tbody>
            </table>
          </div>
        )}

      {state === 'ok' && rows.length > 0 && (
        <footer className="tl-footnote">
          {board.seasonLabel} {leagueShort}{postseason ? ' postseason' : ''}. Trust score = <code>0.7 &times; {postseason ? 'playoff' : 'season'} W-L%</code> +{' '}
          <code>0.3 &times; last-10 win rate</code>, percentile-ranked across the {board.leagueSize} teams on this board only; leagues are
          never ranked against each other. League ranks are team OPS and team ERA within {leagueShort}. Record splits are regular season; the
          starter split uses the opposing starter recorded after each game. No probable pitchers, lineups or bullpen data exist for these leagues.
        </footer>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TrustLedger() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const [teams, setTeams] = useState(null);
  const [busy, setBusy] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('trustPercentile');
  const [sortDir, setSortDir] = useState(-1); // -1 desc, 1 asc — matches the reference's default (Trust, descending)
  const [postseason, setPostseason] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  // Non-MLB leagues have no data yet; they swap the board for a preview.
  const [league, setLeague] = useState('mlb');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/account', { state: { from: { pathname: '/predictions/trust-ledger' } } });
    }
  }, [loading, isAuthenticated, navigate]);

  const load = useCallback((mode) => {
    setBusy(true);
    setLocked(false);
    setError(null);
    trustLedgerService.getTrustLedger(undefined, { postseason: mode })
      .then((data) => setTeams(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err?.status === 403) setLocked(true);
        else setError(err?.message || 'Failed to load trust rankings.');
      })
      .finally(() => setBusy(false));
  }, []);

  // On first load, default to whichever mode is actually live: probe the
  // postseason board first — a non-empty bracket means the playoffs have
  // started, so default there; an empty one means fall back to the regular
  // season board (fetched separately, since the probe response is empty).
  useEffect(() => {
    if (!isAuthenticated || bootstrapped) return;
    setBootstrapped(true);
    setBusy(true);
    setLocked(false);
    setError(null);
    trustLedgerService.getTrustLedger(undefined, { postseason: true })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setPostseason(true);
          setTeams(list);
          setBusy(false);
        } else {
          setPostseason(false);
          load(false);
        }
      })
      .catch((err) => {
        if (err?.status === 403) { setLocked(true); setBusy(false); return; }
        // Probe itself failed for a non-auth reason — still try the regular
        // season board as the sane default rather than stalling on an error.
        setPostseason(false);
        load(false);
      });
  }, [isAuthenticated, bootstrapped, load]);

  const handleModeChange = useCallback((nextPostseason) => {
    if (nextPostseason === postseason) return;
    setPostseason(nextPostseason);
    load(nextPostseason);
  }, [postseason, load]);

  // Eliminated clubs (mlb_team_id) from the postseason bracket — postseason mode only.
  const [eliminated, setEliminated] = useState(() => new Set());
  useEffect(() => {
    if (!postseason) { setEliminated(new Set()); return; }
    let alive = true;
    getEliminatedMlbIds(new Date().getFullYear()).then((ids) => { if (alive) setEliminated(ids); });
    return () => { alive = false; };
  }, [postseason]);

  const sortedTeams = useMemo(() => {
    if (!Array.isArray(teams)) return [];
    return [...teams].sort((a, b) => {
      const av = getSortVal(a, sortKey);
      const bv = getSortVal(b, sortKey);
      // Nulls always sink to the bottom, regardless of sort direction — a
      // team with no game today shouldn't jump to the top of an ascending
      // starter-ERA sort just because "no data" reads as the smallest value.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return sortDir * av.localeCompare(bv);
      return sortDir * (av - bv);
    });
  }, [teams, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d * -1);
    else { setSortKey(key); setSortDir(-1); }
  };

  if (loading || !isAuthenticated) return null;

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const season = new Date().getFullYear();
  const clubCount = Array.isArray(teams) && teams.length ? teams.length : (postseason ? 12 : 30);
  const allPercentilesNull = Array.isArray(teams) && teams.length > 0 && teams.every((t) => t.trustPercentile == null);
  const showTable = !busy && !locked && !error && Array.isArray(teams) && teams.length > 0;

  return (
    <div className="predictions-page">
      <div className="predictions-content">
        <div className="tl-wrap">
          <LeagueTabs value={league} onChange={setLeague} enabled={WINTER_ENABLED} />
          <header className="tl-page-head">
            <div>
              <p className="tl-eyebrow">Sandlot Picks &middot; Scout Desk</p>
              <h2 className="tl-h1">Trust Ledger</h2>
            </div>
            <div className="tl-meta">
              <div><strong>{dateLabel}</strong></div>
              <div>
                {league === 'mlb'
                  ? <>{season} {postseason ? 'postseason' : 'regular season'} &middot; {clubCount} clubs</>
                  : 'Caribbean winter leagues · one board per league'}
              </div>
            </div>
          </header>

          {league !== 'mlb' ? (
            <WinterTrustBoard onUpgrade={() => navigate('/upgrade')} />
          ) : (<>
          <p className="tl-dek">
            Every team's <b>trust score</b> &mdash; 70% season W-L%, 30% last-10-game form &mdash; ranked into a
            league-wide percentile, alongside MLB's own offense/pitching rank and today's actual starter (last 5
            starts) and top-6 lineup form (last 5 games). Expand a row for home/road and handedness splits. Click
            any column to re-sort.
          </p>

          <div className="tl-mode-row">
            <TrustModeToggle postseason={postseason} onChange={handleModeChange} disabled={busy || locked} />
            {postseason && (
              <span className="tl-mode-note">Trust percentile is ranked against the full league, not just the playoff field.</span>
            )}
          </div>

          {showTable && (
            <div className="tl-legend-row">
              <span><span className="tl-dot tl-dot--accent" />trust meter &middot; league percentile</span>
              <span><span className="tl-dot tl-dot--good" />strong recent form</span>
              <span><span className="tl-dot tl-dot--warn" />concerning recent form</span>
            </div>
          )}

          {busy ? (
            <TrustLedgerSkeleton />
          ) : locked ? (
            <TrustLedgerLocked onUpgrade={() => navigate('/upgrade')} />
          ) : error ? (
            <div className="sd-error">⚠ {error}</div>
          ) : !teams || teams.length === 0 ? (
            <TrustLedgerEmpty postseason={postseason} />
          ) : (
            <>
              {allPercentilesNull && (
                <div className="tl-banner">Rankings stabilize after a couple weeks of games — check back soon for percentile ranks.</div>
              )}
              <div className="tl-table-scroll">
                <table className="tl-table">
                  <thead>
                    <tr>
                      {COLUMNS.map((col) => {
                        const sortable = col.sortable !== false;
                        return (
                          <th
                            key={col.key}
                            onClick={sortable ? () => handleSort(col.key) : undefined}
                            className={`${sortKey === col.key ? 'tl-th-active' : ''}${sortable ? '' : ' tl-th-static'}`}
                            title={
                              col.key === 'trustPercentile' ? 'Ranked against the full 30-team league, not just the teams shown'
                                : col.key === 'mlbRank' ? "MLB's own offense/pitching rank — switches to a playoff-only rank in Postseason mode"
                                : undefined
                            }
                          >
                            {col.key === 'winPct' ? (postseason ? 'Playoff' : 'Season') : col.label}
                            {sortable && sortKey === col.key && (
                              <span className="tl-arrow">{sortDir === -1 ? '▼' : '▲'}</span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map((t, i) => (
                      <TrustTableRow key={t.team} team={t} rank={i + 1} postseason={postseason} eliminated={eliminated} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {showTable && (
            <footer className="tl-footnote">
              Trust score = <code>0.7 &times; season W-L%</code> + <code>0.3 &times; last-10 win rate</code>,
              percentile-ranked across all 30 clubs. Starter form is the last 5 starts prior to today's game
              (ERA / WHIP / K per 9); lineup OPS averages each of today's projected-or-actual top-6 hitters'
              individual last-5-game OPS. Bullpen is each team's aggregate over its currently available + limited
              relievers for today's game &mdash; a right-now availability read, not a last-5 window like the other
              columns. Status color thresholds: starter ERA &le;3.50 or &ge;5.50, WHIP &le;1.15 or &ge;1.45, K/9
              &ge;9.0 or &le;5.5; lineup OPS &ge;0.780 or &le;0.620; bullpen ERA &le;3.60 or &ge;4.60, WHIP &le;1.20
              or &ge;1.40, K/9 &ge;9.5 or &le;7.5, BB/9 &le;3.0 or &ge;4.2. Teams without a game on the rendered
              date show trust only.
            </footer>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
}
