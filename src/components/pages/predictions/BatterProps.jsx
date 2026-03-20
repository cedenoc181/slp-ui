import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TEAM_METADATA } from '../../../data/constants/apiConstants';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/batter-props.css';

// ─── URL helpers ──────────────────────────────────────────────────────────────

function headshotUrl(id) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;
}
function teamLogoUrl(id) {
  return `https://www.mlbstatic.com/team-logos/${id}.svg`;
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
function probColor(prob) {
  if (prob >= 70) return '#4ade80';
  if (prob >= 55) return '#facc15';
  return 'rgba(255,255,255,0.55)';
}

// ─── Mock slate ───────────────────────────────────────────────────────────────

const MOCK_MATCHUPS = [
  { gamePk: 745444, awayAbbr: 'NYY', awayMlbId: 147, homeAbbr: 'BOS', homeMlbId: 111 },
  { gamePk: 745445, awayAbbr: 'LAD', awayMlbId: 119, homeAbbr: 'SF',  homeMlbId: 137 },
  { gamePk: 745446, awayAbbr: 'ATL', awayMlbId: 144, homeAbbr: 'NYM', homeMlbId: 121 },
  { gamePk: 745447, awayAbbr: 'HOU', awayMlbId: 117, homeAbbr: 'TEX', homeMlbId: 140 },
  { gamePk: 745448, awayAbbr: 'PHI', awayMlbId: 143, homeAbbr: 'MIA', homeMlbId: 146 },
  { gamePk: 745449, awayAbbr: 'SD',  awayMlbId: 135, homeAbbr: 'AZ',  homeMlbId: 109 },
  { gamePk: 745450, awayAbbr: 'MIN', awayMlbId: 142, homeAbbr: 'DET', homeMlbId: 116 },
  { gamePk: 745451, awayAbbr: 'CHC', awayMlbId: 112, homeAbbr: 'STL', homeMlbId: 138 },
];

const MOCK_BATTERS = [
  // NYY vs BOS
  { id: 592450, name: 'Aaron Judge',       teamAbbr: 'NYY', teamMlbId: 147, opponent: 'BOS', hand: 'R', gamePk: 745444 },
  { id: 665742, name: 'Juan Soto',         teamAbbr: 'NYY', teamMlbId: 147, opponent: 'BOS', hand: 'L', gamePk: 745444 },
  { id: 646240, name: 'Rafael Devers',     teamAbbr: 'BOS', teamMlbId: 111, opponent: 'NYY', hand: 'L', gamePk: 745444 },
  { id: 683737, name: 'Triston Casas',     teamAbbr: 'BOS', teamMlbId: 111, opponent: 'NYY', hand: 'L', gamePk: 745444 },
  // LAD vs SF
  { id: 518692, name: 'Freddie Freeman',   teamAbbr: 'LAD', teamMlbId: 119, opponent: 'SF',  hand: 'L', gamePk: 745445 },
  { id: 605141, name: 'Mookie Betts',      teamAbbr: 'LAD', teamMlbId: 119, opponent: 'SF',  hand: 'R', gamePk: 745445 },
  { id: 576743, name: 'Wilmer Flores',     teamAbbr: 'SF',  teamMlbId: 137, opponent: 'LAD', hand: 'R', gamePk: 745445 },
  { id: 641933, name: 'Mike Yastrzemski',  teamAbbr: 'SF',  teamMlbId: 137, opponent: 'LAD', hand: 'L', gamePk: 745445 },
  // ATL vs NYM
  { id: 660670, name: 'Ronald Acuña Jr.', teamAbbr: 'ATL', teamMlbId: 144, opponent: 'NYM', hand: 'R', gamePk: 745446 },
  { id: 671739, name: 'Michael Harris II', teamAbbr: 'ATL', teamMlbId: 144, opponent: 'NYM', hand: 'L', gamePk: 745446 },
  { id: 624413, name: 'Pete Alonso',       teamAbbr: 'NYM', teamMlbId: 121, opponent: 'ATL', hand: 'R', gamePk: 745446 },
  { id: 596019, name: 'Francisco Lindor',  teamAbbr: 'NYM', teamMlbId: 121, opponent: 'ATL', hand: 'B', gamePk: 745446 },
  // HOU vs TEX
  { id: 670541, name: 'Yordan Alvarez',    teamAbbr: 'HOU', teamMlbId: 117, opponent: 'TEX', hand: 'L', gamePk: 745447 },
  { id: 663728, name: 'Kyle Tucker',       teamAbbr: 'HOU', teamMlbId: 117, opponent: 'TEX', hand: 'L', gamePk: 745447 },
  { id: 608369, name: 'Corey Seager',      teamAbbr: 'TEX', teamMlbId: 140, opponent: 'HOU', hand: 'L', gamePk: 745447 },
  { id: 677651, name: 'Adolis Garcia',     teamAbbr: 'TEX', teamMlbId: 140, opponent: 'HOU', hand: 'R', gamePk: 745447 },
  // PHI vs MIA
  { id: 547180, name: 'Bryce Harper',      teamAbbr: 'PHI', teamMlbId: 143, opponent: 'MIA', hand: 'L', gamePk: 745448 },
  { id: 607208, name: 'Trea Turner',       teamAbbr: 'PHI', teamMlbId: 143, opponent: 'MIA', hand: 'R', gamePk: 745448 },
  { id: 514888, name: 'Jorge Soler',       teamAbbr: 'MIA', teamMlbId: 146, opponent: 'PHI', hand: 'R', gamePk: 745448 },
  { id: 672515, name: 'Jazz Chisholm Jr.', teamAbbr: 'MIA', teamMlbId: 146, opponent: 'PHI', hand: 'L', gamePk: 745448 },
  // SD vs AZ
  { id: 592518, name: 'Manny Machado',     teamAbbr: 'SD',  teamMlbId: 135, opponent: 'AZ',  hand: 'R', gamePk: 745449 },
  { id: 673490, name: 'Ha-seong Kim',      teamAbbr: 'SD',  teamMlbId: 135, opponent: 'AZ',  hand: 'R', gamePk: 745449 },
  { id: 606299, name: 'Ketel Marte',       teamAbbr: 'AZ',  teamMlbId: 109, opponent: 'SD',  hand: 'B', gamePk: 745449 },
  { id: 682998, name: 'Corbin Carroll',    teamAbbr: 'AZ',  teamMlbId: 109, opponent: 'SD',  hand: 'L', gamePk: 745449 },
  // MIN vs DET
  { id: 553993, name: 'Carlos Correa',     teamAbbr: 'MIN', teamMlbId: 142, opponent: 'DET', hand: 'R', gamePk: 745450 },
  { id: 621439, name: 'Byron Buxton',      teamAbbr: 'MIN', teamMlbId: 142, opponent: 'DET', hand: 'R', gamePk: 745450 },
  { id: 656775, name: 'Spencer Torkelson', teamAbbr: 'DET', teamMlbId: 116, opponent: 'MIN', hand: 'R', gamePk: 745450 },
  { id: 682985, name: 'Riley Greene',      teamAbbr: 'DET', teamMlbId: 116, opponent: 'MIN', hand: 'L', gamePk: 745450 },
  // CHC vs STL
  { id: 666971, name: 'Nico Hoerner',      teamAbbr: 'CHC', teamMlbId: 112, opponent: 'STL', hand: 'R', gamePk: 745451 },
  { id: 641487, name: 'Ian Happ',          teamAbbr: 'CHC', teamMlbId: 112, opponent: 'STL', hand: 'B', gamePk: 745451 },
  { id: 571448, name: 'Nolan Arenado',     teamAbbr: 'STL', teamMlbId: 138, opponent: 'CHC', hand: 'R', gamePk: 745451 },
  { id: 666152, name: 'Lars Nootbaar',     teamAbbr: 'STL', teamMlbId: 138, opponent: 'CHC', hand: 'L', gamePk: 745451 },
];

// ─── Platform meta ────────────────────────────────────────────────────────────

const BOOK_NAMES     = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars'];
const BOOK_OFFSETS   = [-3, 0, 4, -2];
const EXCHANGE_NAMES = ['BetOpenly', 'Kalshi', 'Novig', 'Polymarket', 'ProphetX'];
const DFS_NAMES      = ['PrizePicks', 'Underdog', 'DraftKings Pick6', 'Betr Picks'];

const BOOK_META = {
  DraftKings: { abbr: 'DK',  color: '#62a800', bg: 'rgba(98,168,0,0.18)',    logo: 'https://logo.clearbit.com/draftkings.com' },
  FanDuel:    { abbr: 'FD',  color: '#1493ff', bg: 'rgba(20,147,255,0.18)',  logo: 'https://logo.clearbit.com/fanduel.com' },
  BetMGM:     { abbr: 'MGM', color: '#c8a84b', bg: 'rgba(200,168,75,0.18)',  logo: 'https://logo.clearbit.com/betmgm.com' },
  Caesars:    { abbr: 'CZR', color: '#0057b8', bg: 'rgba(0,87,184,0.18)',    logo: 'https://logo.clearbit.com/caesarssportsbook.com' },
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

// ─── Market definitions ───────────────────────────────────────────────────────

const BATTER_MARKETS = [
  { key: 'hits',        label: 'Hits',         icon: '🎯', accent: 'green',  inRows: true  },
  { key: 'homeRuns',    label: 'Home Runs',     icon: '💥', accent: 'red',    inRows: true  },
  { key: 'rbis',        label: 'RBIs',          icon: '🏃', accent: 'blue',   inRows: true  },
  { key: 'totalBases',  label: 'Total Bases',   icon: '⚡', accent: 'yellow', inRows: true  },
  { key: 'walks',       label: 'Walks',         icon: '🚶', accent: 'purple', inRows: false },
  { key: 'stolenBases', label: 'Stolen Bases',  icon: '💨', accent: 'cyan',   inRows: false },
];

// ─── Mock prop generator ──────────────────────────────────────────────────────

function getMockBatterProps(batter) {
  const s = batter.id % 97;
  return BATTER_MARKETS.map((m, mi) => {
    const cfg = {
      hits:        { prob: 62 + ((s * 3) % 22),  line: s % 3 === 0 ? 0.5 : 1.5, odds: -145 + ((s * 2) % 45) },
      homeRuns:    { prob: 18 + ((s * 2) % 28),  line: 0.5,                      odds:  145 + (s % 130)      },
      rbis:        { prob: 48 + ((s * 4) % 26),  line: s % 2 === 0 ? 0.5 : 1.5, odds: -125 + ((s * 3) % 48) },
      totalBases:  { prob: 55 + ((s * 2) % 24),  line: 1.5 + (s % 2),           odds: -130 + ((s * 2) % 46) },
      walks:       { prob: 38 + ((s * 5) % 22),  line: 0.5,                      odds: -110 + ((s * 4) % 40) },
      stolenBases: { prob: 22 + ((s * 3) % 20),  line: 0.5,                      odds:  115 + (s % 80)       },
    }[m.key];
    const bestOdds = cfg.odds + (cfg.odds > 0 ? 8 : 5);
    return {
      ...m,
      line:      cfg.line,
      side:      'Over',
      modelProb: cfg.prob,
      baseOdds:  cfg.odds,
      bestOdds,
      ev:        calcEV(cfg.prob, bestOdds),
      books: BOOK_NAMES.map((name, i) => {
        const o = cfg.odds + BOOK_OFFSETS[i];
        return { name, over: o, under: -(Math.abs(o) + 8 + i * 2) };
      }),
      exchanges: EXCHANGE_NAMES.map((name, i) => {
        const yes = 42 + ((s * (i + mi + 1)) % 20);
        return { name, yes, no: 100 - yes + 2 + (i % 4) };
      }),
      dfs: DFS_NAMES.map((name, i) => ({
        name,
        line: (s + mi + i) % 5 !== 0 ? cfg.line : null,
      })),
    };
  });
}

function passesRisk(market, riskFilter) {
  if (riskFilter === 'fav') return market.bestOdds < 0;
  if (riskFilter === 'dog') return market.bestOdds > 0;
  return true;
}

function getBattersForMarket(batters, marketKey, riskFilter = 'all') {
  return batters
    .map(b => ({ batter: b, market: getMockBatterProps(b).find(m => m.key === marketKey) }))
    .filter(({ market }) => passesRisk(market, riskFilter))
    .sort((a, b) => b.market.modelProb - a.market.modelProb);
}

function getTopPicks(batters, riskFilter = 'all') {
  const all = [];
  for (const batter of batters) {
    for (const market of getMockBatterProps(batter).filter(m => m.inRows)) {
      if (passesRisk(market, riskFilter)) {
        all.push({ batter, market, ev: parseFloat(market.ev) });
      }
    }
  }
  return all.sort((a, b) => b.ev - a.ev).slice(0, 3);
}

// ─── PlatformLogo ─────────────────────────────────────────────────────────────

function PlatformLogo({ name, metaMap }) {
  const meta = metaMap[name] ?? { abbr: name.slice(0, 3).toUpperCase(), color: '#aaa', bg: 'rgba(170,170,170,0.15)', logo: null };
  const [err, setErr] = useState(false);
  if (!meta.logo || err) {
    return <span className="bp-platform-pill" style={{ background: meta.bg, color: meta.color }}>{meta.abbr}</span>;
  }
  return <img src={meta.logo} alt={name} className="bp-platform-logo" onError={() => setErr(true)} />;
}

function EVBadge({ ev }) {
  const val = parseFloat(ev);
  return (
    <span className={`bp-ev-badge ${val > 0 ? 'pos' : 'neg'}`}>
      {val > 0 ? '+' : ''}{ev}% EV
    </span>
  );
}

// ─── Matchup selector card ────────────────────────────────────────────────────

function MatchupCard({ matchup, isActive, onClick }) {
  return (
    <button className={`bp-matchup-card ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="bp-matchup-teams">
        <div className="bp-matchup-team">
          <img src={teamLogoUrl(matchup.awayMlbId)} alt={matchup.awayAbbr} className="bp-matchup-logo" />
          <span className="bp-matchup-abbr">{matchup.awayAbbr}</span>
        </div>
        <span className="bp-matchup-vs">vs</span>
        <div className="bp-matchup-team">
          <img src={teamLogoUrl(matchup.homeMlbId)} alt={matchup.homeAbbr} className="bp-matchup-logo" />
          <span className="bp-matchup-abbr">{matchup.homeAbbr}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Top pick card ────────────────────────────────────────────────────────────

function TopPickCard({ batter, market, onClick }) {
  const [hsErr,   setHsErr]   = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  return (
    <button className={`bp-top-card accent-${market.accent}`} onClick={onClick}>
      <div className="bp-top-card-left">
        {hsErr ? (
          <div className="bp-top-card-hs-fallback">{batter.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
        ) : (
          <img src={headshotUrl(batter.id)} alt={batter.name} className="bp-top-card-headshot" onError={() => setHsErr(true)} />
        )}
        {!logoErr && (
          <img src={teamLogoUrl(batter.teamMlbId)} alt={batter.teamAbbr} className="bp-top-card-logo" onError={() => setLogoErr(true)} />
        )}
      </div>
      <div className="bp-top-card-body">
        <div className="bp-top-card-name">{batter.name}</div>
        <div className="bp-top-card-matchup">{batter.teamAbbr} · vs {batter.opponent}</div>
        <div className="bp-top-card-market">
          <span className={`bp-market-chip accent-${market.accent}`}>{market.icon} {market.label}</span>
          <span className="bp-top-card-line">Over {market.line} · {fmtOdds(market.bestOdds)}</span>
        </div>
      </div>
      <div className="bp-top-card-right">
        <div className="bp-top-card-prob" style={{ color: probColor(market.modelProb) }}>
          {market.modelProb}%
        </div>
        <EVBadge ev={market.ev} />
      </div>
    </button>
  );
}

// ─── Batter row card ──────────────────────────────────────────────────────────

function BatterCard({ batter, market, onClick }) {
  const [hsErr,   setHsErr]   = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  return (
    <button className={`bp-batter-card accent-${market.accent}`} onClick={onClick}>
      <div className="bp-batter-card-top">
        {hsErr ? (
          <div className="bp-batter-card-hs-fallback">{batter.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
        ) : (
          <img src={headshotUrl(batter.id)} alt={batter.name} className="bp-batter-card-headshot" onError={() => setHsErr(true)} />
        )}
        <div className="bp-batter-card-info">
          <div className="bp-batter-card-name">{batter.name}</div>
          <div className="bp-batter-card-matchup">{batter.teamAbbr} · vs {batter.opponent}</div>
          <div className="bp-batter-card-line">Over {market.line} · {fmtOdds(market.bestOdds)}</div>
        </div>
        {!logoErr && (
          <img src={teamLogoUrl(batter.teamMlbId)} alt={batter.teamAbbr} className="bp-batter-card-logo" onError={() => setLogoErr(true)} />
        )}
      </div>
      <div className="bp-batter-card-stats">
        <span className="bp-batter-card-prob" style={{ color: probColor(market.modelProb) }}>
          {market.modelProb}%
        </span>
        <EVBadge ev={market.ev} />
      </div>
      <div className="bp-batter-card-bar">
        <div className="bp-batter-card-bar-fill" style={{ width: `${market.modelProb}%` }} />
      </div>
    </button>
  );
}

// ─── Category row (horizontal scroll) ────────────────────────────────────────

function BatterRow({ market, entries, onCardClick }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 250, behavior: 'smooth' });

  if (!entries.length) return null;
  return (
    <div className="bp-row">
      <div className="bp-row-header">
        <div className="bp-row-title">
          <span className={`bp-row-title-dot accent-${market.accent}`} />
          <span className="bp-row-title-label">{market.icon} {market.label}</span>
          <span className="bp-row-title-count">{entries.length} players</span>
        </div>
        <div className="bp-row-nav">
          <button className="bp-row-nav-btn" onClick={() => scroll(-1)} aria-label="Scroll left">‹</button>
          <button className="bp-row-nav-btn" onClick={() => scroll(1)}  aria-label="Scroll right">›</button>
        </div>
      </div>
      <div className="bp-row-scroll" ref={scrollRef}>
        {entries.map(({ batter, market: m }) => (
          <BatterCard
            key={batter.id}
            batter={batter}
            market={m}
            onClick={() => onCardClick(batter, m.key)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Odds tables ──────────────────────────────────────────────────────────────

function PropBooksTable({ market }) {
  const isOver    = market.side === 'Over';
  const bestOvIdx = market.books.reduce((bi, b, i, a) => b.over  > a[bi].over  ? i : bi, 0);
  const bestUnIdx = market.books.reduce((bi, b, i, a) => b.under > a[bi].under ? i : bi, 0);
  return (
    <div className="bp-odds-table">
      <div className="bp-odds-table-head">
        <div>Platform</div>
        <div className={isOver ? 'bp-odds-col-active' : ''}>Over</div>
        <div className={!isOver ? 'bp-odds-col-active' : ''}>Under</div>
      </div>
      {market.books.map((b, i) => (
        <div key={b.name} className="bp-odds-row">
          <div className="bp-odds-platform"><PlatformLogo name={b.name} metaMap={BOOK_META} /><span>{b.name}</span></div>
          <div className={`bp-odds-val${i === bestOvIdx ? ' best' : ''}${isOver ? ' side-pick' : ''}`}>{fmtOdds(b.over)}</div>
          <div className={`bp-odds-val${i === bestUnIdx ? ' best' : ''}${!isOver ? ' side-pick' : ''}`}>{fmtOdds(b.under)}</div>
        </div>
      ))}
    </div>
  );
}

function PropExchangeTable({ market }) {
  const bestYesIdx = market.exchanges.reduce((bi, e, i, a) => e.yes < a[bi].yes ? i : bi, 0);
  return (
    <div className="bp-odds-table">
      <div className="bp-exchange-note">Prices in cents (¢). Lower Yes price = better value for the buyer.</div>
      <div className="bp-odds-table-head">
        <div>Platform</div>
        <div className="bp-odds-col-active">Yes (¢)</div>
        <div>No (¢)</div>
      </div>
      {market.exchanges.map((e, i) => (
        <div key={e.name} className="bp-odds-row">
          <div className="bp-odds-platform"><PlatformLogo name={e.name} metaMap={EXCHANGE_META} /><span>{e.name}</span></div>
          <div className={`bp-odds-val${i === bestYesIdx ? ' best' : ''} side-pick`}>{e.yes}¢</div>
          <div className="bp-odds-val">{e.no}¢</div>
        </div>
      ))}
    </div>
  );
}

function PropDFSTable({ market }) {
  return (
    <div className="bp-odds-table">
      <div className="bp-exchange-note">More / Less lines. "—" = market not offered on this platform.</div>
      <div className="bp-odds-table-head">
        <div>Platform</div>
        <div className="bp-odds-col-active">More</div>
        <div>Less</div>
      </div>
      {market.dfs.map(d => (
        <div key={d.name} className={`bp-odds-row${d.line == null ? ' unavailable' : ''}`}>
          <div className="bp-odds-platform"><PlatformLogo name={d.name} metaMap={DFS_META} /><span>{d.name}</span></div>
          <div className="bp-odds-val side-pick">{d.line != null ? `Over ${d.line}` : '—'}</div>
          <div className="bp-odds-val">{d.line != null ? `Under ${d.line}` : '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Market panel (in full modal) ────────────────────────────────────────────

function MarketPanel({ market, onClick }) {
  const evVal = parseFloat(market.ev);
  return (
    <button className={`bp-market-panel accent-${market.accent}`} onClick={onClick}>
      <div className="bp-market-panel-header">
        <span className="bp-market-panel-icon">{market.icon}</span>
        <span className="bp-market-panel-label">{market.label}</span>
      </div>
      <div className="bp-market-panel-line">
        <span className="bp-market-panel-side">{market.side}</span>
        <span className="bp-market-panel-number">{market.line}</span>
      </div>
      <div className="bp-market-panel-stats">
        <div className="bp-market-panel-stat">
          <span className="bp-mps-label">Best Odds</span>
          <span className="bp-mps-value">{fmtOdds(market.bestOdds)}</span>
        </div>
        <div className="bp-market-panel-stat">
          <span className="bp-mps-label">Prob</span>
          <span className="bp-mps-value" style={{ color: probColor(market.modelProb) }}>{market.modelProb}%</span>
        </div>
        <div className="bp-market-panel-stat">
          <span className="bp-mps-label">EV</span>
          <span className={`bp-mps-value ev ${evVal > 0 ? 'pos' : 'neg'}`}>{evVal > 0 ? '+' : ''}{market.ev}%</span>
        </div>
      </div>
      <div className="bp-market-panel-hint">View odds →</div>
    </button>
  );
}

// ─── Batter modal ─────────────────────────────────────────────────────────────

function BatterModal({ batter, initialMarketKey, onClose }) {
  const allMarkets = getMockBatterProps(batter);
  const [hsErr, setHsErr] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(
    initialMarketKey ? allMarkets.find(m => m.key === initialMarketKey) ?? null : null
  );
  const [oddsView, setOddsView] = useState('books');
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (selectedMarket) setSelectedMarket(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, selectedMarket]);

  const goToPlayer  = () => { onClose(); navigate(`/player/${batter.id}`); window.scrollTo(0, 0); };
  const goToMatchup = () => { onClose(); navigate(`/mlb-schedule/${batter.gamePk}`); window.scrollTo(0, 0); };
  const goToTeam    = () => {
    const urlName = TEAM_METADATA[batter.teamAbbr]?.urlName;
    if (!urlName) return;
    onClose(); navigate(`/team-analytics/${urlName}`); window.scrollTo(0, 0);
  };

  const handleMarketClick = (market) => { setSelectedMarket(market); setOddsView('books'); };
  const accent = selectedMarket?.accent ?? null;

  return createPortal(
    <div
      className="bp-modal-overlay"
      onClick={() => selectedMarket ? setSelectedMarket(null) : onClose()}
      aria-modal="true" role="dialog"
    >
      <div className="bp-modal-wrapper" onClick={e => e.stopPropagation()}>

        {selectedMarket ? (
          <>
            {/* ── Compact strip ── */}
            <div className={`bp-market-strip accent-${accent}`}>
              <button className="bp-market-strip-back" onClick={() => setSelectedMarket(null)}>← Back</button>
              <div className="bp-market-strip-identity">
                {hsErr ? (
                  <div className="bp-market-strip-hs-fallback">{batter.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                ) : (
                  <img src={headshotUrl(batter.id)} alt={batter.name} className="bp-market-strip-headshot" onError={() => setHsErr(true)} />
                )}
                <div className="bp-market-strip-info">
                  <span className="bp-market-strip-name">{batter.name}</span>
                  <span className="bp-market-strip-meta">{batter.teamAbbr} · vs {batter.opponent}</span>
                </div>
              </div>
              <div className={`bp-market-strip-chip accent-${accent}`}>
                <span>{selectedMarket.icon}</span>
                <span>{selectedMarket.label}</span>
                <span className="bp-market-strip-chip-line">{selectedMarket.side} {selectedMarket.line}</span>
              </div>
            </div>

            {/* ── Odds drawer ── */}
            <div className="bp-odds-panel">
              <div className="bp-odds-toggle">
                <button className={oddsView === 'books'    ? 'active' : ''} onClick={() => setOddsView('books')}>Sportsbooks</button>
                <button className={oddsView === 'exchange' ? 'active' : ''} onClick={() => setOddsView('exchange')}>Pred. Exchange</button>
                <button className={oddsView === 'dfs'      ? 'active' : ''} onClick={() => setOddsView('dfs')}>DFS</button>
              </div>
              <div className="bp-odds-panel-body">
                {oddsView === 'books'    && <PropBooksTable    market={selectedMarket} />}
                {oddsView === 'exchange' && <PropExchangeTable market={selectedMarket} />}
                {oddsView === 'dfs'      && <PropDFSTable      market={selectedMarket} />}
              </div>
            </div>
          </>
        ) : (
          /* ── Full modal ── */
          <div className="bp-modal">
            <div className="bp-modal-header">
              <div className="bp-modal-identity">
                {hsErr ? (
                  <div className="bp-modal-hs-fallback">{batter.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                ) : (
                  <img src={headshotUrl(batter.id)} alt={batter.name} className="bp-modal-headshot" onError={() => setHsErr(true)} />
                )}
                <div className="bp-modal-info">
                  <button className="bp-modal-name bp-modal-link" onClick={goToPlayer}>{batter.name}</button>
                  <button className="bp-modal-meta bp-modal-link" onClick={goToMatchup}>
                    {batter.teamAbbr} · vs {batter.opponent}
                  </button>
                </div>
              </div>
              <button className="bp-modal-team-logo-btn" onClick={goToTeam} aria-label={`${batter.teamAbbr} team analytics`}>
                <img src={teamLogoUrl(batter.teamMlbId)} alt={batter.teamAbbr} className="bp-modal-team-logo" />
              </button>
              <button className="bp-modal-close" onClick={onClose} aria-label="Close">✕</button>
            </div>
            <div className="bp-modal-body">
              <div className="bp-markets-grid">
                {allMarkets.map(market => (
                  <MarketPanel key={market.key} market={market} onClick={() => handleMarketClick(market)} />
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

export default function BatterProps() {
  const [activeGamePk, setActiveGamePk] = useState(null);
  const [riskFilter,   setRiskFilter]   = useState('all');
  const [modalState,   setModalState]   = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const visibleBatters = activeGamePk
    ? MOCK_BATTERS.filter(b => b.gamePk === activeGamePk)
    : MOCK_BATTERS;

  const topPicks   = getTopPicks(visibleBatters, riskFilter);
  const rowMarkets = BATTER_MARKETS.filter(m => m.inRows);

  const openModal  = useCallback((batter, marketKey) => setModalState({ batter, marketKey }), []);
  const closeModal = useCallback(() => setModalState(null), []);

  const activeMatchup = activeGamePk ? MOCK_MATCHUPS.find(m => m.gamePk === activeGamePk) : null;

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Batter Props</h1>
        </div>
      </div>

      <div className="predictions-content">

        {/* ── Matchup selector ───────────────────────────────── */}
        <div className="bp-matchup-bar">
          <div className="bp-matchup-scroll">
            <button
              className={`bp-matchup-all ${activeGamePk === null ? 'active' : ''}`}
              onClick={() => setActiveGamePk(null)}
            >
              All Games
            </button>
            {MOCK_MATCHUPS.map(m => (
              <MatchupCard
                key={m.gamePk}
                matchup={m}
                isActive={activeGamePk === m.gamePk}
                onClick={() => setActiveGamePk(prev => prev === m.gamePk ? null : m.gamePk)}
              />
            ))}
          </div>

          <div className="bp-filter-hand">
            {[
              { key: 'all', label: 'All'     },
              { key: 'fav', label: 'Favs'    },
              { key: 'dog', label: 'Dawgs'   },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`bp-hand-btn ${riskFilter === key ? 'active' : ''} ${key !== 'all' ? `risk-${key}` : ''}`}
                onClick={() => setRiskFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Matchup label (when one is selected) ───────────── */}
        {activeMatchup && (
          <div className="bp-matchup-label">
            <img src={teamLogoUrl(activeMatchup.awayMlbId)} alt={activeMatchup.awayAbbr} className="bp-matchup-label-logo" />
            <span>{activeMatchup.awayAbbr}</span>
            <span className="bp-matchup-label-vs">vs</span>
            <img src={teamLogoUrl(activeMatchup.homeMlbId)} alt={activeMatchup.homeAbbr} className="bp-matchup-label-logo" />
            <span>{activeMatchup.homeAbbr}</span>
            <a
              className="bp-matchup-label-link"
              onClick={() => { closeModal(); window.location.href = `/mlb-schedule/${activeMatchup.gamePk}`; }}
            >
              Matchup Analysis →
            </a>
          </div>
        )}

        {/* ── Top picks ──────────────────────────────────────── */}
        <div className="bp-section-label" style={{ marginTop: activeMatchup ? '1.5rem' : '0' }}>
          Top Picks{activeMatchup ? ` · ${activeMatchup.awayAbbr} vs ${activeMatchup.homeAbbr}` : ' Today'}
        </div>
        <div className="bp-top-grid">
          {topPicks.map(({ batter, market }) => (
            <TopPickCard
              key={`${batter.id}-${market.key}`}
              batter={batter}
              market={market}
              onClick={() => openModal(batter, market.key)}
            />
          ))}
        </div>

        {/* ── Category rows ─────────────────────────────────── */}
        {rowMarkets.map(m => (
          <BatterRow
            key={m.key}
            market={m}
            entries={getBattersForMarket(visibleBatters, m.key, riskFilter)}
            onCardClick={openModal}
          />
        ))}

        <p className="bp-disclaimer">
          * Prediction data is model-generated and for informational purposes only. Please gamble responsibly.
        </p>
      </div>

      {modalState && (
        <BatterModal
          batter={modalState.batter}
          initialMarketKey={modalState.marketKey}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
