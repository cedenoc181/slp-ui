import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PredictionsNav from './PredictionsNav';
import trustLedgerService from '../../../data/services/trustLedgerService';
import { TEAM_METADATA } from '../../../data/constants/apiConstants';
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

// ── Row ──────────────────────────────────────────────────────────────────────
function TrustTableRow({ team, rank }) {
  const meta = findTeamMeta(team.team);
  const name = meta ? nicknameOf(meta.name) : team.team;

  let starterCell;
  if (!team.spName) {
    starterCell = <span className="tl-no-game">no game today</span>;
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
    bullpenCell = <span className="tl-no-game">no game today</span>;
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

  return (
    <tr>
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
        </span>
      </td>
      <td>
        <div className="tl-trust-cell">
          <span className="tl-meter"><span style={{ width: `${team.trustPercentile ?? 0}%` }} /></span>
          <span className="tl-trust-pct tl-num">{fmtPct(team.trustPercentile)}</span>
        </div>
      </td>
      <td className="tl-num tl-muted">{fmtDec(team.winPct)}</td>
      <td className="tl-num tl-muted">{team.lastTen || '—'}</td>
      <td>{starterCell}</td>
      <td>{opsCell}</td>
      <td>{bullpenCell}</td>
    </tr>
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

function TrustLedgerEmpty() {
  return (
    <div className="sd-empty">
      <span className="sd-empty-icon">🗓️</span>
      <p>Standings return when the season starts.</p>
    </div>
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

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/account', { state: { from: { pathname: '/predictions/trust-ledger' } } });
    }
  }, [loading, isAuthenticated, navigate]);

  const load = useCallback(() => {
    setBusy(true);
    setLocked(false);
    setError(null);
    trustLedgerService.getTrustLedger()
      .then((data) => setTeams(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err?.status === 403) setLocked(true);
        else setError(err?.message || 'Failed to load trust rankings.');
      })
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

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
  const clubCount = Array.isArray(teams) && teams.length ? teams.length : 30;
  const allPercentilesNull = Array.isArray(teams) && teams.length > 0 && teams.every((t) => t.trustPercentile == null);
  const showTable = !busy && !locked && !error && Array.isArray(teams) && teams.length > 0;

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Trust Ledger</h1>
          <PredictionsNav />
        </div>
      </div>

      <div className="predictions-content">
        <div className="tl-wrap">
          <header className="tl-page-head">
            <div>
              <p className="tl-eyebrow">Sandlot Picks &middot; Scout Desk</p>
              <h2 className="tl-h1">Trust Ledger</h2>
            </div>
            <div className="tl-meta">
              <div><strong>{dateLabel}</strong></div>
              <div>{season} regular season &middot; {clubCount} clubs</div>
            </div>
          </header>

          <p className="tl-dek">
            Every team's <b>trust score</b> &mdash; 70% season W-L%, 30% last-10-game form &mdash; ranked into a
            league-wide percentile. This is the signal Scout leans on to break ties between comparably strong plays,
            plus today's actual starter (last 5 starts) and each lineup's top-6 batting order (last 5 games) for
            context. Click any column to re-sort.
          </p>

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
            <TrustLedgerEmpty />
          ) : (
            <>
              {allPercentilesNull && (
                <div className="tl-banner">Rankings stabilize after a couple weeks of games — check back soon for percentile ranks.</div>
              )}
              <div className="tl-table-scroll">
                <table className="tl-table">
                  <thead>
                    <tr>
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={sortKey === col.key ? 'tl-th-active' : ''}
                        >
                          {col.label}
                          {sortKey === col.key && (
                            <span className="tl-arrow">{sortDir === -1 ? '▼' : '▲'}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map((t, i) => (
                      <TrustTableRow key={t.team} team={t} rank={i + 1} />
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
        </div>
      </div>
    </div>
  );
}
