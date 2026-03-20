import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TEAM_METADATA } from '../../../data/constants/apiConstants';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/pitcher-props.css';

// ─── URL helpers ──────────────────────────────────────────────────────────────

function headshotUrl(mlbPlayerId) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${mlbPlayerId}/headshot/67/current`;
}

function teamLogoUrl(mlbTeamId) {
  return `https://www.mlbstatic.com/team-logos/${mlbTeamId}.svg`;
}

function fmtOdds(n) {
  if (n == null) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function calcEV(modelProbPct, odds) {
  const prob    = modelProbPct / 100;
  const decimal = odds < 0 ? 1 + 100 / Math.abs(odds) : 1 + odds / 100;
  return ((prob * decimal - 1) * 100).toFixed(1);
}

// ─── Mock pitcher slate ───────────────────────────────────────────────────────

const MOCK_PITCHERS = [
  { id: 543037, name: 'Gerrit Cole',     teamAbbr: 'NYY', teamMlbId: 147, opponent: 'BOS', hand: 'R', gamePk: 745444 },
  { id: 519242, name: 'Chris Sale',      teamAbbr: 'BOS', teamMlbId: 111, opponent: 'NYY', hand: 'L', gamePk: 745444 },
  { id: 607192, name: 'Tyler Glasnow',   teamAbbr: 'LAD', teamMlbId: 119, opponent: 'SF',  hand: 'R', gamePk: 745445 },
  { id: 657277, name: 'Logan Webb',      teamAbbr: 'SF',  teamMlbId: 137, opponent: 'LAD', hand: 'R', gamePk: 745445 },
  { id: 675911, name: 'Spencer Strider', teamAbbr: 'ATL', teamMlbId: 144, opponent: 'NYM', hand: 'R', gamePk: 745446 },
  { id: 673548, name: 'Kodai Senga',     teamAbbr: 'NYM', teamMlbId: 121, opponent: 'ATL', hand: 'R', gamePk: 745446 },
  { id: 664285, name: 'Framber Valdez',  teamAbbr: 'HOU', teamMlbId: 117, opponent: 'TEX', hand: 'L', gamePk: 745447 },
  { id: 543135, name: 'Nathan Eovaldi',  teamAbbr: 'TEX', teamMlbId: 140, opponent: 'HOU', hand: 'R', gamePk: 745447 },
  { id: 554430, name: 'Zack Wheeler',    teamAbbr: 'PHI', teamMlbId: 143, opponent: 'MIA', hand: 'R', gamePk: 745448 },
  { id: 645261, name: 'Sandy Alcantara', teamAbbr: 'MIA', teamMlbId: 146, opponent: 'PHI', hand: 'R', gamePk: 745448 },
  { id: 506433, name: 'Yu Darvish',      teamAbbr: 'SD',  teamMlbId: 135, opponent: 'AZ',  hand: 'R', gamePk: 745449 },
  { id: 668678, name: 'Zac Gallen',      teamAbbr: 'AZ',  teamMlbId: 109, opponent: 'SD',  hand: 'R', gamePk: 745449 },
  { id: 641154, name: 'Pablo Lopez',     teamAbbr: 'MIN', teamMlbId: 142, opponent: 'DET', hand: 'R', gamePk: 745450 },
  { id: 669373, name: 'Tarik Skubal',    teamAbbr: 'DET', teamMlbId: 116, opponent: 'MIN', hand: 'L', gamePk: 745450 },
  { id: 657731, name: 'Justin Steele',   teamAbbr: 'CHC', teamMlbId: 112, opponent: 'STL', hand: 'L', gamePk: 745451 },
  { id: 571945, name: 'Miles Mikolas',   teamAbbr: 'STL', teamMlbId: 138, opponent: 'CHC', hand: 'R', gamePk: 745451 },
];

// ─── Mock prop generator ──────────────────────────────────────────────────────

const BOOK_NAMES      = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars'];
const BOOK_OFFSETS    = [-3, 0, 4, -2];
const EXCHANGE_NAMES  = ['BetOpenly', 'Kalshi', 'Novig', 'Polymarket', 'ProphetX'];
const DFS_NAMES       = ['PrizePicks', 'Underdog', 'DraftKings Pick6', 'Betr Picks'];

const BOOK_META = {
  DraftKings:        { abbr: 'DK',  color: '#62a800', bg: 'rgba(98,168,0,0.18)',    logo: 'https://logo.clearbit.com/draftkings.com' },
  FanDuel:           { abbr: 'FD',  color: '#1493ff', bg: 'rgba(20,147,255,0.18)',  logo: 'https://logo.clearbit.com/fanduel.com' },
  BetMGM:            { abbr: 'MGM', color: '#c8a84b', bg: 'rgba(200,168,75,0.18)',  logo: 'https://logo.clearbit.com/betmgm.com' },
  Caesars:           { abbr: 'CZR', color: '#0057b8', bg: 'rgba(0,87,184,0.18)',    logo: 'https://logo.clearbit.com/caesarssportsbook.com' },
};
const EXCHANGE_META = {
  BetOpenly:  { abbr: 'BO',  color: '#e879f9', bg: 'rgba(232,121,249,0.15)', logo: 'https://logo.clearbit.com/betopenly.com' },
  Kalshi:     { abbr: 'KAL', color: '#00d4aa', bg: 'rgba(0,212,170,0.15)',   logo: 'https://logo.clearbit.com/kalshi.com' },
  Novig:      { abbr: 'NVG', color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  logo: 'https://logo.clearbit.com/novig.com' },
  Polymarket: { abbr: 'PM',  color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', logo: 'https://logo.clearbit.com/polymarket.com' },
  ProphetX:   { abbr: 'PX',  color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  logo: 'https://logo.clearbit.com/prophetx.co' },
};
const DFS_META = {
  PrizePicks:         { abbr: 'PP',  color: '#818cf8', bg: 'rgba(129,140,248,0.15)', logo: 'https://logo.clearbit.com/prizepicks.com' },
  Underdog:           { abbr: 'UD',  color: '#f43f5e', bg: 'rgba(244,63,94,0.15)',   logo: 'https://logo.clearbit.com/underdogfantasy.com' },
  'DraftKings Pick6': { abbr: 'DK6', color: '#62a800', bg: 'rgba(98,168,0,0.15)',    logo: 'https://logo.clearbit.com/draftkings.com' },
  'Betr Picks':       { abbr: 'BTR', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  logo: 'https://logo.clearbit.com/betr.com' },
};

const PROP_ACCENTS = {
  strikeouts: 'green',
  hits:       'blue',
  outs:       'yellow',
  earnedRuns: 'red',
};

function getMockPitcherProps(pitcher) {
  const s = pitcher.id % 97;

  const raw = [
    {
      key: 'strikeouts', label: 'Strikeouts',  icon: '🔥',
      line:      4.5 + (s % 4),
      side:      s % 3 !== 0 ? 'Over' : 'Under',
      modelProb: 56 + (s % 22),
      baseOdds:  -120 + (s % 35),
    },
    {
      key: 'hits',       label: 'Hits Allowed', icon: '🎯',
      line:      4.5 + ((s * 3) % 4),
      side:      s % 2 === 0 ? 'Under' : 'Over',
      modelProb: 53 + (s % 18),
      baseOdds:  -125 + ((s * 2) % 40),
    },
    {
      key: 'outs',       label: 'Pitcher Outs', icon: '⚾',
      line:      14.5 + (s % 5),
      side:      s % 2 === 0 ? 'Over' : 'Under',
      modelProb: 54 + (s % 20),
      baseOdds:  -115 + ((s * 4) % 30),
    },
    {
      key: 'earnedRuns', label: 'Earned Runs',  icon: '📊',
      line:      1.5 + (s % 3),
      side:      'Under',
      modelProb: 57 + (s % 19),
      baseOdds:  -130 + ((s * 2) % 45),
    },
  ];

  const props = raw.map((p, pi) => {
    const bestOdds = p.baseOdds + 4;
    return {
      ...p,
      bestOdds,
      ev: calcEV(p.modelProb, bestOdds),
      books: BOOK_NAMES.map((name, i) => {
        const overOdds  = p.baseOdds + BOOK_OFFSETS[i];
        const underOdds = -(Math.abs(overOdds) + 8 + (i * 2));
        return { name, over: overOdds, under: underOdds };
      }),
      exchanges: EXCHANGE_NAMES.map((name, i) => {
        const yes = 43 + ((s * (i + pi + 1)) % 18);
        return { name, yes, no: 100 - yes + 2 + (i % 4) };
      }),
      dfs: DFS_NAMES.map((name, i) => ({
        name,
        line: (s + pi + i) % 6 !== 0 ? p.line + ((s * i) % 3 === 0 ? 0.5 : 0) : null,
      })),
    };
  });

  const bestProp = props.reduce((best, p) =>
    parseFloat(p.ev) > parseFloat(best.ev) ? p : best
  , props[0]);

  return { props, bestProp };
}

function getTopPicks(pitchers) {
  return [...pitchers]
    .map(p => ({ pitcher: p, ...getMockPitcherProps(p) }))
    .sort((a, b) => parseFloat(b.bestProp.ev) - parseFloat(a.bestProp.ev))
    .slice(0, 4);
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Headshot({ pitcher, className }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className={`pp-headshot-fallback ${className || ''}`}>
        {pitcher.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={headshotUrl(pitcher.id)}
      alt={pitcher.name}
      className={`pp-headshot ${className || ''}`}
      onError={() => setErr(true)}
    />
  );
}

function EVBadge({ ev }) {
  const val = parseFloat(ev);
  return (
    <span className={`pp-ev-badge ${val > 0 ? 'pos' : 'neg'}`}>
      {val > 0 ? '+' : ''}{ev}% EV
    </span>
  );
}

function PlatformLogo({ name, metaMap }) {
  const meta = metaMap[name] ?? { abbr: name.slice(0, 3).toUpperCase(), color: '#aaa', bg: 'rgba(170,170,170,0.15)', logo: null };
  const [err, setErr] = useState(false);
  if (!meta.logo || err) {
    return <span className="pp-platform-pill" style={{ background: meta.bg, color: meta.color }}>{meta.abbr}</span>;
  }
  return <img src={meta.logo} alt={name} className="pp-platform-logo" onError={() => setErr(true)} />;
}

// ─── Top pick card ────────────────────────────────────────────────────────────

function TopPitcherCard({ pitcher, bestProp, onClick }) {
  return (
    <button className="pp-top-card" onClick={onClick}>
      {/* Header row: small headshot + big team logo */}
      <div className="pp-top-card-header">
        <Headshot pitcher={pitcher} className="pp-top-card-headshot" />
        <img
          src={teamLogoUrl(pitcher.teamMlbId)}
          alt={pitcher.teamAbbr}
          className="pp-top-card-team-logo"
        />
      </div>

      {/* Info */}
      <div className="pp-top-card-info">
        <div className="pp-top-card-name">{pitcher.name}</div>
        <div className="pp-top-card-matchup">{pitcher.teamAbbr} · vs {pitcher.opponent}</div>

        <div className="pp-top-card-prop">
          <span className="pp-top-card-prop-label">{bestProp.label}</span>
          <span className="pp-top-card-prop-line">
            {bestProp.side} {bestProp.line} · {fmtOdds(bestProp.bestOdds)}
          </span>
        </div>

        <EVBadge ev={bestProp.ev} />
      </div>
    </button>
  );
}

// ─── Pitcher list card ────────────────────────────────────────────────────────

function PitcherCard({ pitcher, isSelected, onClick }) {
  const { bestProp } = getMockPitcherProps(pitcher);
  return (
    <button
      className={`pp-top-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="pp-top-card-header">
        <Headshot pitcher={pitcher} className="pp-top-card-headshot" />
        <img
          src={teamLogoUrl(pitcher.teamMlbId)}
          alt={pitcher.teamAbbr}
          className="pp-top-card-team-logo"
        />
      </div>

      <div className="pp-top-card-info">
        <div className="pp-top-card-name">{pitcher.name}</div>
        <div className="pp-top-card-matchup">{pitcher.teamAbbr} · vs {pitcher.opponent}</div>

        <div className="pp-top-card-prop">
          <span className="pp-top-card-prop-label">{bestProp.label}</span>
          <span className="pp-top-card-prop-line">
            {bestProp.side} {bestProp.line} · {fmtOdds(bestProp.bestOdds)}
          </span>
        </div>

        <EVBadge ev={bestProp.ev} />
      </div>
    </button>
  );
}

// ─── Prop panel (inside modal) ────────────────────────────────────────────────

function PropPanel({ prop, onClick }) {
  const accent = PROP_ACCENTS[prop.key] || 'green';
  const evVal  = parseFloat(prop.ev);
  return (
    <button className={`pp-prop-panel accent-${accent}`} onClick={onClick}>
      <div className="pp-prop-header">
        <span className="pp-prop-icon">{prop.icon}</span>
        <span className="pp-prop-label">{prop.label}</span>
      </div>

      <div className="pp-prop-line">
        <span className="pp-prop-side">{prop.side}</span>
        <span className="pp-prop-number">{prop.line}</span>
      </div>

      <div className="pp-prop-stats">
        <div className="pp-prop-stat">
          <span className="pp-prop-stat-label">Best Odds</span>
          <span className="pp-prop-stat-value">{fmtOdds(prop.bestOdds)}</span>
        </div>
        <div className="pp-prop-stat">
          <span className="pp-prop-stat-label">Prob</span>
          <span className="pp-prop-stat-value">{prop.modelProb}%</span>
        </div>
        <div className="pp-prop-stat">
          <span className="pp-prop-stat-label">EV</span>
          <span className={`pp-prop-stat-value ev ${evVal > 0 ? 'pos' : 'neg'}`}>
            {evVal > 0 ? '+' : ''}{prop.ev}%
          </span>
        </div>
      </div>

      <div className="pp-prop-view-hint">View odds →</div>
    </button>
  );
}

// ─── Odds tables (inside prop-selected drawer) ────────────────────────────────

function PropBooksTable({ prop }) {
  const isOver  = prop.side === 'Over';
  const bestOvIdx = prop.books.reduce((bi, b, i, a) => b.over  > a[bi].over  ? i : bi, 0);
  const bestUnIdx = prop.books.reduce((bi, b, i, a) => b.under > a[bi].under ? i : bi, 0);
  return (
    <div className="pp-odds-table">
      <div className="pp-odds-table-head">
        <div>Platform</div>
        <div className={isOver ? 'pp-odds-col-active' : ''}>Over</div>
        <div className={!isOver ? 'pp-odds-col-active' : ''}>Under</div>
      </div>
      {prop.books.map((b, i) => (
        <div key={b.name} className="pp-odds-row">
          <div className="pp-odds-platform">
            <PlatformLogo name={b.name} metaMap={BOOK_META} />
            <span>{b.name}</span>
          </div>
          <div className={`pp-odds-val${i === bestOvIdx ? ' best' : ''}${isOver ? ' side-pick' : ''}`}>
            {fmtOdds(b.over)}
          </div>
          <div className={`pp-odds-val${i === bestUnIdx ? ' best' : ''}${!isOver ? ' side-pick' : ''}`}>
            {fmtOdds(b.under)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PropExchangeTable({ prop }) {
  const bestYesIdx = prop.exchanges.reduce((bi, e, i, a) => e.yes < a[bi].yes ? i : bi, 0);
  return (
    <div className="pp-odds-table">
      <div className="pp-exchange-note">
        Prices in cents (¢). Lower Yes price = better value for the buyer.
      </div>
      <div className="pp-odds-table-head">
        <div>Platform</div>
        <div className="pp-odds-col-active">Yes (¢)</div>
        <div>No (¢)</div>
      </div>
      {prop.exchanges.map((e, i) => (
        <div key={e.name} className="pp-odds-row">
          <div className="pp-odds-platform">
            <PlatformLogo name={e.name} metaMap={EXCHANGE_META} />
            <span>{e.name}</span>
          </div>
          <div className={`pp-odds-val${i === bestYesIdx ? ' best' : ''} side-pick`}>{e.yes}¢</div>
          <div className="pp-odds-val">{e.no}¢</div>
        </div>
      ))}
    </div>
  );
}

function PropDFSTable({ prop }) {
  return (
    <div className="pp-odds-table">
      <div className="pp-exchange-note">
        More / Less lines. "—" = market not offered on this platform.
      </div>
      <div className="pp-odds-table-head">
        <div>Platform</div>
        <div className="pp-odds-col-active">More</div>
        <div>Less</div>
      </div>
      {prop.dfs.map(d => (
        <div key={d.name} className={`pp-odds-row${d.line == null ? ' unavailable' : ''}`}>
          <div className="pp-odds-platform">
            <PlatformLogo name={d.name} metaMap={DFS_META} />
            <span>{d.name}</span>
          </div>
          <div className="pp-odds-val side-pick">{d.line != null ? `Over ${d.line}` : '—'}</div>
          <div className="pp-odds-val">{d.line != null ? `Under ${d.line}` : '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Pitcher modal ────────────────────────────────────────────────────────────

function PitcherModal({ pitcher, onClose }) {
  const { props } = getMockPitcherProps(pitcher);
  const [hsErr, setHsErr]           = useState(false);
  const [selectedProp, setSelectedProp] = useState(null);
  const [oddsView, setOddsView]     = useState('books');
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (selectedProp) setSelectedProp(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, selectedProp]);

  const goToPlayer = () => { onClose(); navigate(`/player/${pitcher.id}`); window.scrollTo(0, 0); };
  const goToMatchup = () => { onClose(); navigate(`/mlb-schedule/${pitcher.gamePk}`); window.scrollTo(0, 0); };
  const goToTeam = () => {
    const urlName = TEAM_METADATA[pitcher.teamAbbr]?.urlName;
    if (!urlName) return;
    onClose();
    navigate(`/team-analytics/${urlName}`);
    window.scrollTo(0, 0);
  };

  const handlePropClick = (prop) => {
    setSelectedProp(prop);
    setOddsView('books');
  };

  const accent = selectedProp ? PROP_ACCENTS[selectedProp.key] || 'green' : null;

  return createPortal(
    <div className="pp-modal-overlay" onClick={() => selectedProp ? setSelectedProp(null) : onClose()} aria-modal="true" role="dialog">
      <div className="pp-modal-wrapper" onClick={e => e.stopPropagation()}>

        {/* ── Compact strip (shown when a prop is selected) ── */}
        {selectedProp ? (
          <>
            <div className={`pp-prop-strip accent-${accent}`}>
              <button className="pp-prop-strip-back" onClick={() => setSelectedProp(null)}>
                ← Back
              </button>

              <div className="pp-prop-strip-identity">
                {hsErr ? (
                  <div className="pp-prop-strip-hs-fallback">
                    {pitcher.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                ) : (
                  <img
                    src={headshotUrl(pitcher.id)}
                    alt={pitcher.name}
                    className="pp-prop-strip-headshot"
                    onError={() => setHsErr(true)}
                  />
                )}
                <div className="pp-prop-strip-info">
                  <span className="pp-prop-strip-name">{pitcher.name}</span>
                  <span className="pp-prop-strip-meta">{pitcher.teamAbbr} · {pitcher.hand}HP · vs {pitcher.opponent}</span>
                </div>
              </div>

              <div className={`pp-prop-strip-chip accent-${accent}`}>
                <span>{selectedProp.icon}</span>
                <span>{selectedProp.label}</span>
                <span className="pp-prop-strip-chip-line">{selectedProp.side} {selectedProp.line}</span>
              </div>
            </div>

            {/* ── Odds drawer ── */}
            <div className="pp-odds-panel">
              <div className="pp-odds-toggle">
                <button className={oddsView === 'books'    ? 'active' : ''} onClick={() => setOddsView('books')}>Sportsbooks</button>
                <button className={oddsView === 'exchange' ? 'active' : ''} onClick={() => setOddsView('exchange')}>Pred. Exchange</button>
                <button className={oddsView === 'dfs'      ? 'active' : ''} onClick={() => setOddsView('dfs')}>DFS</button>
              </div>
              <div className="pp-odds-panel-body">
                {oddsView === 'books'    && <PropBooksTable    prop={selectedProp} />}
                {oddsView === 'exchange' && <PropExchangeTable prop={selectedProp} />}
                {oddsView === 'dfs'      && <PropDFSTable      prop={selectedProp} />}
              </div>
            </div>
          </>
        ) : (
          /* ── Full modal ── */
          <div className="pp-modal">
            <div className="pp-modal-header">
              <div className="pp-modal-identity">
                {hsErr ? (
                  <div className="pp-modal-hs-fallback">
                    {pitcher.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                ) : (
                  <img
                    src={headshotUrl(pitcher.id)}
                    alt={pitcher.name}
                    className="pp-modal-headshot"
                    onError={() => setHsErr(true)}
                  />
                )}
                <div className="pp-modal-info">
                  <button className="pp-modal-name pp-modal-link" onClick={goToPlayer}>{pitcher.name}</button>
                  <button className="pp-modal-meta pp-modal-link" onClick={goToMatchup}>
                    {pitcher.teamAbbr} · {pitcher.hand}HP · vs {pitcher.opponent}
                  </button>
                </div>
              </div>

              <button className="pp-modal-team-logo-btn" onClick={goToTeam} aria-label={`${pitcher.teamAbbr} team analytics`}>
                <img src={teamLogoUrl(pitcher.teamMlbId)} alt={pitcher.teamAbbr} className="pp-modal-team-logo" />
              </button>
              <button className="pp-modal-close" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className="pp-modal-body">
              <div className="pp-props-grid">
                {props.map(prop => (
                  <PropPanel key={prop.key} prop={prop} onClick={() => handlePropClick(prop)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PitcherProps() {
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const topPicks = getTopPicks(MOCK_PITCHERS);

  const handleSelect = useCallback((id) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const handleClose = useCallback(() => setSelectedId(null), []);

  const selectedPitcher = selectedId
    ? MOCK_PITCHERS.find(p => p.id === selectedId) ?? null
    : null;

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Pitcher Props</h1>
        </div>
      </div>

      <div className="predictions-content">

        {/* ── Top picks ─────────────────────────────────────────── */}
        <div className="pp-section-label">Top Picks Today</div>
        <div className="pp-top-grid">
          {topPicks.map(({ pitcher, bestProp }) => (
            <TopPitcherCard
              key={pitcher.id}
              pitcher={pitcher}
              bestProp={bestProp}
              onClick={() => handleSelect(pitcher.id)}
            />
          ))}
        </div>

        {/* ── Divider ────────────────────────────────────────────── */}
        <div className="pp-divider">
          <span className="pp-divider-line" />
          <span className="pp-divider-label">Starting Pitchers Today</span>
          <span className="pp-divider-line" />
        </div>
        <div className="pp-pitcher-grid">
          {MOCK_PITCHERS.map(pitcher => (
            <PitcherCard
              key={pitcher.id}
              pitcher={pitcher}
              isSelected={selectedId === pitcher.id}
              onClick={() => handleSelect(pitcher.id)}
            />
          ))}
        </div>

        <p className="gp-disclaimer">
          * Prediction data is model-generated and for informational purposes only.
          Please gamble responsibly.
        </p>
      </div>

      {selectedPitcher && (
        <PitcherModal pitcher={selectedPitcher} onClose={handleClose} />
      )}
    </div>
  );
}
