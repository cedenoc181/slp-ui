import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TEAM_METADATA, getTeamById } from '../../../data/constants/apiConstants';
import predictionsService from '../../../data/services/predictionsService';
import playerStatsService from '../../../data/services/playerStatsServices';
import PredictionsNav from './PredictionsNav';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/batter-props.css';
import '../../../styles/stats-page-styling/scout-ai.css';
import analysisIcon from '../../../assets/icons/analysis.png';

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
  if (odds == null) return '0.0';
  const prob    = modelProbPct / 100;
  const decimal = odds < 0 ? 1 + 100 / Math.abs(odds) : 1 + odds / 100;
  return ((prob * decimal - 1) * 100).toFixed(1);
}
function probColor(prob) {
  if (prob >= 70) return '#4ade80';
  if (prob >= 55) return '#facc15';
  return 'rgba(255,255,255,0.55)';
}

// ─── Team lookup by display name from the batters API ─────────────────────────
// API sends short names like "Royals", "Red Sox", "D-backs"

const DISPLAY_NAME_TO_ABBR = {
  athletics: 'ATH', pirates: 'PIT', padres: 'SD', mariners: 'SEA',
  giants: 'SF', cardinals: 'STL', rays: 'TB', rangers: 'TEX',
  'blue jays': 'TOR', twins: 'MIN', phillies: 'PHI', braves: 'ATL',
  'white sox': 'CWS', marlins: 'MIA', yankees: 'NYY', brewers: 'MIL',
  angels: 'LAA', diamondbacks: 'AZ', 'd-backs': 'AZ', orioles: 'BAL',
  'red sox': 'BOS', cubs: 'CHC', reds: 'CIN', guardians: 'CLE',
  rockies: 'COL', tigers: 'DET', astros: 'HOU', royals: 'KC',
  dodgers: 'LAD', nationals: 'WSH', mets: 'NYM',
};

function getTeamByDisplayName(name) {
  if (!name) return null;
  const abbr = DISPLAY_NAME_TO_ABBR[name.toLowerCase()];
  if (!abbr) return null;
  return { abbr, ...(TEAM_METADATA[abbr] ?? {}) };
}

// ─── Platform meta ────────────────────────────────────────────────────────────

const BOOK_META = {
  DraftKings:      { abbr: 'DK',  color: '#62a800', bg: 'rgba(98,168,0,0.18)',    logo: 'https://logo.clearbit.com/draftkings.com' },
  FanDuel:         { abbr: 'FD',  color: '#1493ff', bg: 'rgba(20,147,255,0.18)',  logo: 'https://logo.clearbit.com/fanduel.com' },
  BetMGM:          { abbr: 'MGM', color: '#c8a84b', bg: 'rgba(200,168,75,0.18)',  logo: 'https://logo.clearbit.com/betmgm.com' },
  Caesars:         { abbr: 'CZR', color: '#0057b8', bg: 'rgba(0,87,184,0.18)',    logo: 'https://logo.clearbit.com/caesarssportsbook.com' },
  BetRivers:       { abbr: 'BR',  color: '#e63946', bg: 'rgba(230,57,70,0.18)',   logo: 'https://logo.clearbit.com/betrivers.com' },
  Fanatics:        { abbr: 'FAN', color: '#e84118', bg: 'rgba(232,65,24,0.18)',   logo: 'https://logo.clearbit.com/fanatics.com' },
  'Hard Rock Bet': { abbr: 'HRB', color: '#ffd700', bg: 'rgba(255,215,0,0.18)',   logo: 'https://logo.clearbit.com/hardrock.com' },
};
const DFS_META = {
  PrizePicks:         { abbr: 'PP',  color: '#818cf8', bg: 'rgba(129,140,248,0.15)', logo: 'https://logo.clearbit.com/prizepicks.com' },
  'Underdog Fantasy': { abbr: 'UD',  color: '#f43f5e', bg: 'rgba(244,63,94,0.15)',   logo: 'https://logo.clearbit.com/underdogfantasy.com' },
  Underdog:           { abbr: 'UD',  color: '#f43f5e', bg: 'rgba(244,63,94,0.15)',   logo: 'https://logo.clearbit.com/underdogfantasy.com' },
  'DraftKings Pick6': { abbr: 'DK6', color: '#62a800', bg: 'rgba(98,168,0,0.15)',    logo: 'https://logo.clearbit.com/draftkings.com' },
};

// ─── Market definitions ───────────────────────────────────────────────────────

const STAT_KEY_MAP = {
  hits:        { key: 'hits',       label: 'Hits',       icon: '🎯', accent: 'green',  predicted: 'predicted_hits', inRows: true  },
  home_runs:   { key: 'homeRuns',   label: 'Home Runs',  icon: '💥', accent: 'red',    predicted: 'predicted_hr',   inRows: true  },
  rbis:        { key: 'rbis',       label: 'RBIs',       icon: '🏃', accent: 'blue',   predicted: 'predicted_rbi',  inRows: true  },
  total_bases: { key: 'totalBases', label: 'Total Bases',icon: '⚡', accent: 'yellow', predicted: 'predicted_tb',   inRows: true  },
};
const MARKET_ORDER = ['hits', 'homeRuns', 'rbis', 'totalBases'];

// ─── Poisson probability helper ───────────────────────────────────────────────

function poissonProb(lambda, lineVal) {
  if (!lambda || lambda <= 0) return 0;
  const minHits = Math.ceil(lineVal + 0.01);
  let cumulative = 0;
  let term = Math.exp(-lambda);
  for (let k = 0; k < minHits; k++) {
    cumulative += term;
    term *= lambda / (k + 1);
  }
  return Math.max(0, Math.min(100, (1 - cumulative) * 100));
}

// ─── API data transformation ──────────────────────────────────────────────────

function buildBatterGames(apiGames) {
  const games   = [];
  const batters = [];

  for (const game of apiGames) {
    const awayTeam  = getTeamByDisplayName(game.away_team_name);
    const homeTeam  = getTeamByDisplayName(game.home_team_name);
    const awayAbbr  = awayTeam?.abbr  || game.away_team_name;
    const homeAbbr  = homeTeam?.abbr  || game.home_team_name;
    const awayMlbId = awayTeam?.mlbId ?? null;
    const homeMlbId = homeTeam?.mlbId ?? null;

    games.push({ gamePk: game.game_pk, gameId: game.id ?? game.game_pk, awayAbbr, awayMlbId, homeAbbr, homeMlbId });

    const gameId = game.id ?? game.game_pk;
    const addBatter = (player, isHome) => batters.push({
      id:         player.player_id,
      mlbId:      player.mlb_id ?? player.player_mlb_id ?? null,
      name:       player.player_name,
      teamAbbr:   isHome ? homeAbbr  : awayAbbr,
      teamMlbId:  isHome ? homeMlbId : awayMlbId,
      opponent:   isHome ? awayAbbr  : homeAbbr,
      gamePk:     game.game_pk,
      gameId,
      predicted_hits: player.predicted_hits ?? 0,
      predicted_hr:   player.predicted_hr   ?? 0,
      predicted_rbi:  player.predicted_rbi  ?? 0,
      predicted_tb:   player.predicted_tb   ?? 0,
      sportsbook_props: player.sportsbook_props || [],
      dfs_props:        player.dfs_props        || [],
      scout_ai:         player.scout_ai         ?? null,
    });

    for (const p of game.home_batters || []) addBatter(p, true);
    for (const p of game.away_batters || []) addBatter(p, false);
  }

  return { games, batters };
}

function buildBatterMarkets(batter) {
  const sbByType  = {};
  const dfsByType = {};

  for (const p of batter.sportsbook_props) {
    if (!sbByType[p.stat_type]) sbByType[p.stat_type] = [];
    sbByType[p.stat_type].push(p);
  }
  for (const p of batter.dfs_props) {
    if (!dfsByType[p.stat_type]) dfsByType[p.stat_type] = [];
    dfsByType[p.stat_type].push(p);
  }

  const allTypes = new Set([...Object.keys(sbByType), ...Object.keys(dfsByType)]);
  const markets  = [];

  for (const statType of allTypes) {
    const def = STAT_KEY_MAP[statType];
    if (!def) continue;

    const sbProps  = sbByType[statType]  || [];
    const dfsProps = dfsByType[statType] || [];

    // Scout AI pick for this stat — drives line, direction, confidence, reasoning
    const aiPick = batter.scout_ai?.[statType] ?? null;

    // Use scout_ai line when available; fall back to consensus across sportsbook + DFS
    let lineNum;
    if (aiPick) {
      lineNum = aiPick.line;
    } else {
      const lineCounts = {};
      for (const p of [...sbProps, ...dfsProps]) lineCounts[p.line] = (lineCounts[p.line] || 0) + 1;
      const lineEntry = Object.entries(lineCounts).sort((a, b) => b[1] - a[1])[0];
      if (!lineEntry) continue;
      lineNum = parseFloat(lineEntry[0]);
    }

    const side      = aiPick?.pick ?? 'Over';
    const predicted = batter[def.predicted] ?? 0;
    const overProb  = Math.round(poissonProb(predicted, lineNum));
    const modelProb = side === 'Under' ? 100 - overProb : overProb;

    // Best odds for the picked side at the scout_ai line
    const atLine   = sbProps.filter(p => p.line === lineNum);
    const rawBest  = atLine.reduce((best, p) => {
      const price = side === 'Under' ? p.under_price : p.over_price;
      return price != null && price > best ? price : best;
    }, -Infinity);
    const bestOdds = rawBest === -Infinity ? null : rawBest;

    // Build book rows — group by platform_title, prefer scout_ai line
    const bookMap = {};
    for (const p of sbProps) {
      const key = p.platform_title;
      if (!bookMap[key]) bookMap[key] = { name: key, over: null, under: null };
      if (p.line === lineNum) {
        bookMap[key].over  = p.over_price;
        bookMap[key].under = p.under_price;
      }
    }
    const books = Object.values(bookMap).filter(b => b.over != null || b.under != null);

    // Build DFS rows
    const dfsMap = {};
    for (const p of dfsProps) {
      const key = p.platform_title;
      if (!dfsMap[key]) dfsMap[key] = { name: key, line: p.line };
    }
    const dfs = Object.values(dfsMap);

    markets.push({
      ...def,
      line: lineNum,
      side,
      modelProb,
      predicted,
      bestOdds,
      ev:         calcEV(modelProb, bestOdds),
      confidence: aiPick?.confidence ?? null,
      reasoning:  aiPick?.reasoning  ?? null,
      books,
      dfs,
    });
  }

  markets.sort((a, b) => MARKET_ORDER.indexOf(a.key) - MARKET_ORDER.indexOf(b.key));
  return markets;
}

// ─── Row / top-pick helpers ───────────────────────────────────────────────────

function passes(market, riskFilter) {
  if (riskFilter === 'fav') return market.bestOdds != null && market.bestOdds < 0;
  if (riskFilter === 'dog') return market.bestOdds != null && market.bestOdds > 0;
  return true;
}

function getBattersForMarketKey(batters, marketKey, riskFilter = 'all') {
  const result = [];
  for (const batter of batters) {
    const market = buildBatterMarkets(batter).find(m => m.key === marketKey);
    if (!market || !passes(market, riskFilter)) continue;
    result.push({ batter, market });
  }
  return result.sort((a, b) => b.market.modelProb - a.market.modelProb);
}

function getTopPicks(batters, riskFilter = 'all') {
  const all = [];
  for (const batter of batters) {
    for (const market of buildBatterMarkets(batter).filter(m => m.inRows)) {
      if (!passes(market, riskFilter)) continue;
      all.push({ batter, market, ev: parseFloat(market.ev) });
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

// ─── Prediction gate: 2 h before earliest first pitch ────────────────────────

function parseGameTimesFromGames(games) {
  return games.map(g => {
    const str = g.game_time_et;
    if (!str) return null;
    const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const period = m[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, min, 0, 0);
    return d;
  }).filter(Boolean);
}

function getUnlockDate(games) {
  const times = parseGameTimesFromGames(games);
  if (!times.length) return null;
  const earliest = new Date(Math.min(...times.map(t => t.getTime())));
  earliest.setHours(earliest.getHours() - 2, earliest.getMinutes(), 0, 0);
  // 4:00 PM ET is the absolute latest the user has to wait
  const cap = new Date();
  cap.setHours(16, 0, 0, 0);
  return earliest.getTime() <= cap.getTime() ? earliest : cap;
}

function getPredictionReadyTime(games) {
  const unlock = getUnlockDate(games);
  if (!unlock) return null;
  let h = unlock.getHours();
  const min = String(unlock.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${period} ET`;
}

function arePredictionsUnlocked(games) {
  const unlock = getUnlockDate(games);
  if (!unlock) return false;
  return new Date() >= unlock;
}

// ─── Pending state components ─────────────────────────────────────────────────

function PendingBanner({ predictionTime }) {
  return (
    <div className="bp-pending-banner">
      <span className="bp-pending-banner-icon">⏳</span>
      <div>
        <div className="bp-pending-banner-title">
          {predictionTime ? `Predictions available by ${predictionTime}` : 'Predictions Coming Soon'}
        </div>
        <div className="bp-pending-banner-sub">
          Our model and Scout AI analysis will be ready approximately 2 hours before first pitch.
          {predictionTime
            ? ` Come back at ${predictionTime} for full game predictions and analysis.`
            : ' Check back closer to game time.'}
        </div>
      </div>
    </div>
  );
}

function PendingBatterCard({ batter }) {
  const [hsErr,   setHsErr]   = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  return (
    <div className="bp-pending-card">
      <div className="bp-pending-card-top">
        {hsErr ? (
          <div className="bp-batter-card-hs-fallback">
            {batter.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
        ) : (
          <img
            src={headshotUrl(batter.mlbId)}
            alt={batter.name}
            className="bp-batter-card-headshot"
            onError={() => setHsErr(true)}
          />
        )}
        <div className="bp-batter-card-info">
          <div className="bp-batter-card-name">{batter.name}</div>
          <div className="bp-batter-card-matchup">{batter.teamAbbr} · vs {batter.opponent}</div>
          <div className="bp-pending-card-label">Predictions pending</div>
        </div>
        {batter.teamMlbId && !logoErr && (
          <img
            src={teamLogoUrl(batter.teamMlbId)}
            alt={batter.teamAbbr}
            className="bp-batter-card-logo"
            onError={() => setLogoErr(true)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Matchup selector card ────────────────────────────────────────────────────

function MatchupCard({ matchup, isActive, onClick }) {
  return (
    <button className={`bp-matchup-card ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="bp-matchup-teams">
        <div className="bp-matchup-team">
          {matchup.awayMlbId
            ? <img src={teamLogoUrl(matchup.awayMlbId)} alt={matchup.awayAbbr} className="bp-matchup-logo" />
            : <span className="bp-matchup-logo-fallback">{matchup.awayAbbr.slice(0, 3)}</span>
          }
          <span className="bp-matchup-abbr">{matchup.awayAbbr}</span>
        </div>
        <span className="bp-matchup-vs">vs</span>
        <div className="bp-matchup-team">
          {matchup.homeMlbId
            ? <img src={teamLogoUrl(matchup.homeMlbId)} alt={matchup.homeAbbr} className="bp-matchup-logo" />
            : <span className="bp-matchup-logo-fallback">{matchup.homeAbbr.slice(0, 3)}</span>
          }
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
          <img src={headshotUrl(batter.mlbId)} alt={batter.name} className="bp-top-card-headshot" onError={() => setHsErr(true)} />
        )}
        {batter.teamMlbId && !logoErr && (
          <img src={teamLogoUrl(batter.teamMlbId)} alt={batter.teamAbbr} className="bp-top-card-logo" onError={() => setLogoErr(true)} />
        )}
      </div>
      <div className="bp-top-card-body">
        <div className="bp-top-card-name">{batter.name}</div>
        <div className="bp-top-card-matchup">{batter.teamAbbr} · vs {batter.opponent}</div>
        <div className="bp-top-card-market">
          <span className={`bp-market-chip accent-${market.accent}`}>{market.icon} {market.label}</span>
          <span className="bp-top-card-line">{market.side} {market.line} · {fmtOdds(market.bestOdds)}</span>
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
          <img src={headshotUrl(batter.mlbId)} alt={batter.name} className="bp-batter-card-headshot" onError={() => setHsErr(true)} />
        )}
        <div className="bp-batter-card-info">
          <div className="bp-batter-card-name">{batter.name}</div>
          <div className="bp-batter-card-matchup">{batter.teamAbbr} · vs {batter.opponent}</div>
          <div className="bp-batter-card-line">{market.side} {market.line} · {fmtOdds(market.bestOdds)}</div>
        </div>
        {batter.teamMlbId && !logoErr && (
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

function BatterRow({ marketDef, entries, onCardClick }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 250, behavior: 'smooth' });

  if (!entries.length) return null;
  return (
    <div className="bp-row">
      <div className="bp-row-header">
        <div className="bp-row-title">
          <span className={`bp-row-title-dot accent-${marketDef.accent}`} />
          <span className="bp-row-title-label">{marketDef.icon} {marketDef.label}</span>
          <span className="bp-row-title-count">{entries.length} players</span>
        </div>
        <div className="bp-row-nav">
          <button className="bp-row-nav-btn" onClick={() => scroll(-1)} aria-label="Scroll left">‹</button>
          <button className="bp-row-nav-btn" onClick={() => scroll(1)}  aria-label="Scroll right">›</button>
        </div>
      </div>
      <div className="bp-row-scroll" ref={scrollRef}>
        {entries.map(({ batter, market }) => (
          <BatterCard
            key={`${batter.id}-${market.key}`}
            batter={batter}
            market={market}
            onClick={() => onCardClick(batter, market.key)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Odds tables ──────────────────────────────────────────────────────────────

function PropBooksTable({ market }) {
  if (!market.books.length) {
    return <div className="bp-odds-empty">No sportsbook lines available for this prop.</div>;
  }
  const bestOvIdx = market.books.reduce((bi, b, i, a) => (b.over ?? -Infinity) > (a[bi].over ?? -Infinity) ? i : bi, 0);
  const bestUnIdx = market.books.reduce((bi, b, i, a) => (b.under ?? -Infinity) > (a[bi].under ?? -Infinity) ? i : bi, 0);
  return (
    <div className="bp-odds-table">
      <div className="bp-odds-table-head">
        <div>Platform</div>
        <div className="bp-odds-col-active">Over {market.line}</div>
        <div>Under {market.line}</div>
      </div>
      {market.books.map((b, i) => (
        <div key={b.name} className="bp-odds-row">
          <div className="bp-odds-platform"><PlatformLogo name={b.name} metaMap={BOOK_META} /><span>{b.name}</span></div>
          <div className={`bp-odds-val${i === bestOvIdx ? ' best' : ''} side-pick`}>{fmtOdds(b.over)}</div>
          <div className={`bp-odds-val${i === bestUnIdx ? ' best' : ''}`}>{fmtOdds(b.under)}</div>
        </div>
      ))}
    </div>
  );
}

function PropDFSTable({ market }) {
  if (!market.dfs.length) {
    return <div className="bp-odds-empty">No DFS lines available for this prop.</div>;
  }
  return (
    <div className="bp-odds-table">
      <div className="bp-exchange-note">More / Less lines on DFS platforms.</div>
      <div className="bp-odds-table-head">
        <div>Platform</div>
        <div className="bp-odds-col-active">Line</div>
      </div>
      {market.dfs.map(d => (
        <div key={d.name} className="bp-odds-row">
          <div className="bp-odds-platform"><PlatformLogo name={d.name} metaMap={DFS_META} /><span>{d.name}</span></div>
          <div className="bp-odds-val side-pick">{d.line != null ? `${market.side} ${d.line}` : '—'}</div>
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

// ─── Prediction summary bar ───────────────────────────────────────────────────

function PredSummary({ batter }) {
  const stats = [
    { label: 'Hits',        value: batter.predicted_hits, icon: '🎯' },
    { label: 'Home Runs',   value: batter.predicted_hr,   icon: '💥' },
    { label: 'RBIs',        value: batter.predicted_rbi,  icon: '🏃' },
    { label: 'Total Bases', value: batter.predicted_tb,   icon: '⚡' },
  ];
  return (
    <div className="bp-pred-summary">
      {stats.map(s => (
        <div key={s.label} className="bp-pred-stat">
          <span className="bp-pred-stat-icon">{s.icon}</span>
          <span className="bp-pred-stat-label">{s.label}</span>
          <span className="bp-pred-stat-value">{(s.value ?? 0).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Batter modal ─────────────────────────────────────────────────────────────

function BatterModal({ batter, initialMarketKey, onClose }) {
  const allMarkets = buildBatterMarkets(batter);
  const hasMarkets = allMarkets.length > 0;

  const [hsErr, setHsErr] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(
    initialMarketKey ? (allMarkets.find(m => m.key === initialMarketKey) ?? null) : null
  );
  const [oddsView, setOddsView] = useState('books');
  const [showScout, setShowScout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showScout) { setShowScout(false); return; }
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
  }, [onClose, selectedMarket, showScout]);

  const goToPlayer  = () => { onClose(); navigate(`/player/${batter.mlbId ?? batter.id}`); window.scrollTo(0, 0); };
  const goToMatchup = () => { onClose(); navigate(`/mlb-schedule/${batter.gameId ?? batter.gamePk}`); window.scrollTo(0, 0); };
  const goToTeam    = () => {
    const urlName = Object.entries(TEAM_METADATA).find(([abbr]) => abbr === batter.teamAbbr)?.[1]?.urlName;
    if (!urlName) return;
    onClose(); navigate(`/team-analytics/${urlName}`); window.scrollTo(0, 0);
  };

  const handleMarketClick = (market) => { setSelectedMarket(market); setOddsView('books'); };
  const accent = selectedMarket?.accent ?? null;
  const hasScoutAi = !!batter.scout_ai;

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
                  <img src={headshotUrl(batter.mlbId)} alt={batter.name} className="bp-market-strip-headshot" onError={() => setHsErr(true)} />
                )}
                <div className="bp-market-strip-info">
                  <span className="bp-market-strip-name">{batter.name}</span>
                  <span className="bp-market-strip-meta">{batter.teamAbbr} · vs {batter.opponent}</span>
                </div>
              </div>
              <div className={`bp-market-strip-chip accent-${accent}`}>
                <span>{selectedMarket.icon}</span>
                <span>{selectedMarket.label}</span>
                <span className="bp-market-strip-chip-line">Over {selectedMarket.line}</span>
              </div>
            </div>

            {/* ── Odds drawer ── */}
            <div className="bp-odds-panel">
              <div className="bp-odds-toggle">
                <button className={oddsView === 'books' ? 'active' : ''} onClick={() => setOddsView('books')}>Sportsbooks</button>
                <button className={oddsView === 'dfs'   ? 'active' : ''} onClick={() => setOddsView('dfs')}>DFS</button>
              </div>
              <div className="bp-odds-panel-body">
                {oddsView === 'books' && <PropBooksTable market={selectedMarket} />}
                {oddsView === 'dfs'   && <PropDFSTable   market={selectedMarket} />}
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
                  <img src={headshotUrl(batter.mlbId)} alt={batter.name} className="bp-modal-headshot" onError={() => setHsErr(true)} />
                )}
                <div className="bp-modal-info">
                  <button className="bp-modal-name bp-modal-link" onClick={goToPlayer}>{batter.name}</button>
                  <button className="bp-modal-meta bp-modal-link" onClick={goToMatchup}>
                    {batter.teamAbbr} · vs {batter.opponent}
                  </button>
                </div>
              </div>

              <button
                className={`scout-ai-btn scout-ai-btn--sm${hasScoutAi ? ' scout-ai-btn--ready' : ' scout-ai-btn--pending'}`}
                disabled={!hasScoutAi}
                aria-disabled={!hasScoutAi || undefined}
                data-tooltip={hasScoutAi ? 'View Scouting Report' : 'Scouting report not yet available'}
                onClick={() => hasScoutAi && setShowScout(true)}
              >
                <img src={analysisIcon} alt="" className="scout-ai-btn__icon" aria-hidden="true" />
                <span>Scouting Report</span>
              </button>

              <button className="bp-modal-team-logo-btn" onClick={goToTeam} aria-label={`${batter.teamAbbr} team analytics`}>
                {batter.teamMlbId && <img src={teamLogoUrl(batter.teamMlbId)} alt={batter.teamAbbr} className="bp-modal-team-logo" />}
              </button>
              <button className="bp-modal-close" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className="bp-modal-body">
              <PredSummary batter={batter} />

              {showScout && batter.scout_ai && (
                <div className="bp-scout-panel">
                  <div className="bp-scout-panel-header">
                    <img src={analysisIcon} alt="" aria-hidden="true" />
                    <span>Scout AI Scouting Report</span>
                    <button className="bp-scout-panel-close" onClick={() => setShowScout(false)} aria-label="Close scouting report">✕</button>
                  </div>

                  {batter.scout_ai.summary && (
                    <p className="bp-scout-summary">{batter.scout_ai.summary}</p>
                  )}

                  {batter.scout_ai.props && (
                    <div className="bp-scout-props">
                      {Object.entries(batter.scout_ai.props).map(([statKey, data]) => {
                        const def = STAT_KEY_MAP[statKey];
                        if (!def || !data) return null;
                        const confidence = data.confidence ?? 0;
                        return (
                          <div key={statKey} className="bp-scout-prop-row">
                            <div className="bp-scout-prop-top">
                              <span className="bp-scout-prop-label">{def.icon} {def.label}</span>
                              <span className={`bp-scout-prop-pick accent-${def.accent}`}>{data.pick}</span>
                              <span className="bp-scout-prop-conf">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <span key={i} className={`bp-scout-dot${i < confidence ? ' bp-scout-dot--on' : ''}`} />
                                ))}
                              </span>
                            </div>
                            {data.reasoning && (
                              <p className="bp-scout-prop-reasoning">{data.reasoning}</p>
                            )}
                            {data.recommended_book && (
                              <p className="bp-scout-prop-book">Best line: {data.recommended_book}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {hasMarkets ? (
                <div className="bp-markets-grid">
                  {allMarkets.map(market => (
                    <MarketPanel key={market.key} market={market} onClick={() => handleMarketClick(market)} />
                  ))}
                </div>
              ) : (
                <div className="bp-no-markets">
                  <span>No sportsbook or DFS lines available for this player yet.</span>
                </div>
              )}
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
  const [gamesLoading,  setGamesLoading]  = useState(true);
  const [gamesError,    setGamesError]    = useState(null);
  const [games,         setGames]         = useState([]);
  const [activeGamePk,  setActiveGamePk]  = useState(null);
  // Per-game batter cache: { [gamePk]: { batters, loading, error } }
  const [gameData,      setGameData]      = useState({});
  const [riskFilter,    setRiskFilter]    = useState('all');
  const [modalState,    setModalState]    = useState(null);
  const navigate = useNavigate();

  // Tracks which gamePks have an in-flight or completed fetch (prevents double-fetching)
  const startedRef = useRef(new Set());
  // Ref to always-current games list so fetchBattersForGame can look up internal gameId
  const gamesRef   = useRef([]);

  // Shared fetch logic — used by both step 2 (active game) and step 3 (prefetch)
  const fetchBattersForGame = useCallback((pk, controller, { silent = false } = {}) => {
    if (startedRef.current.has(pk)) return;
    startedRef.current.add(pk);

    setGameData(prev => ({ ...prev, [pk]: { batters: [], loading: true, error: null } }));

    predictionsService.getBattersByGamePk(pk, { signal: controller.signal, timeout: 120000 })
      .then(result => {
        // Guarantee we use the internal game.id from predictions/today (step-1 data)
        // even if the batter endpoint doesn't return it
        const knownGameId = gamesRef.current.find(g => g.gamePk === pk)?.gameId ?? pk;
        const { batters: b } = buildBatterGames([{ ...result, id: result.id ?? knownGameId }]);
        setGameData(prev => ({ ...prev, [pk]: { batters: b, loading: false, error: null } }));

        // Background: resolve MLB IDs for headshots (same pattern as PitcherProps)
        b.forEach((batter, i) => {
          if (batter.mlbId || !batter.id) return;
          playerStatsService.lookupPlayer({ playerId: batter.id })
            .then(res => {
              if (res?.mlb_id) {
                setGameData(prev => {
                  const entry = prev[pk];
                  if (!entry) return prev;
                  const updated = entry.batters.map((bb, j) =>
                    j === i ? { ...bb, mlbId: res.mlb_id } : bb
                  );
                  return { ...prev, [pk]: { ...entry, batters: updated } };
                });
              }
            })
            .catch(() => {});
        });
      })
      .catch(err => {
        // On abort, remove from started so it can be retried if user clicks the game
        if (err.name === 'AbortError' || err.message === 'Request timeout - please try again') {
          startedRef.current.delete(pk);
          return;
        }
        // 404 means props aren't available yet — treat as empty, let pending UI render
        if (err?.message?.includes('404') || err?.status === 404) {
          setGameData(prev => ({ ...prev, [pk]: { batters: [], loading: false, error: null } }));
          return;
        }
        if (!silent) {
          console.error(`[BatterProps] batters fetch error for ${pk}:`, err);
          setGameData(prev => ({ ...prev, [pk]: { batters: [], loading: false, error: err?.message || 'Failed to load.' } }));
        }
      });
  }, []); // eslint-disable-line

  // Step 1: load matchup bar from the fast predictions/today endpoint
  useEffect(() => {
    window.scrollTo(0, 0);
    predictionsService.getToday()
      .then(rows => {
        const today = Array.isArray(rows)
          ? rows.filter(r => r.season_type !== 'spring' && r.season_type !== 'S')
          : [];
        const mapped = today.map(r => ({
          gamePk:      r.game_pk,
          gameId:      r.id ?? r.game_pk,
          awayAbbr:    getTeamById(r.away_team_id)?.id    || r.away_team_name,
          awayMlbId:   getTeamById(r.away_team_id)?.mlbId ?? null,
          homeAbbr:    getTeamById(r.home_team_id)?.id    || r.home_team_name,
          homeMlbId:   getTeamById(r.home_team_id)?.mlbId ?? null,
          game_time_et: r.game_time_et ?? r.game_time ?? null,
        }));
        setGames(mapped);
        if (mapped.length) setActiveGamePk(mapped[0].gamePk);
      })
      .catch(err => {
        console.error('[BatterProps] games fetch error:', err);
        setGamesError(err?.message || 'Failed to load today\'s games.');
      })
      .finally(() => setGamesLoading(false));
  }, []);

  // Step 2: load the active game immediately when selected
  useEffect(() => {
    if (!activeGamePk) return;
    const controller = new AbortController();
    fetchBattersForGame(activeGamePk, controller);
    return () => controller.abort();
  }, [activeGamePk, fetchBattersForGame]);

  // Step 3: prefetch all remaining games in the background after the list loads
  useEffect(() => {
    if (games.length < 2) return;

    const controllers = [];
    const timers = [];

    // Skip index 0 — step 2 already handles the first (active) game
    games.slice(1).forEach((game, idx) => {
      const controller = new AbortController();
      controllers.push(controller);
      // Stagger 600ms per game so the active game's request gets priority
      const timer = setTimeout(() => {
        fetchBattersForGame(game.gamePk, controller, { silent: true });
      }, (idx + 1) * 600);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
      controllers.forEach(c => c.abort());
    };
  }, [games, fetchBattersForGame]);

  // Keep ref in sync so fetchBattersForGame always sees the latest gameId mapping
  gamesRef.current = games;

  const activeEntry    = activeGamePk ? (gameData[activeGamePk] ?? null) : null;
  const battersLoading = !!activeEntry?.loading;
  const battersError   = activeEntry?.error ?? null;
  const visibleBatters = activeEntry?.batters ?? [];

  const predictionsUnlocked = arePredictionsUnlocked(games);
  const predictionTime      = getPredictionReadyTime(games);

  // Show pending state if: time gate hasn't passed, OR time passed but no batter
  // has both scout_ai and sportsbook_props (data not ready yet).
  const hasReadyBatters = predictionsUnlocked &&
    visibleBatters.some(b => b.scout_ai && b.sportsbook_props?.length > 0);
  const showPending = !predictionsUnlocked ||
    (visibleBatters.length > 0 && !hasReadyBatters);

  const rowMarkets = Object.values(STAT_KEY_MAP).filter(m => m.inRows);
  const topPicks   = getTopPicks(visibleBatters, riskFilter);

  const openModal  = useCallback((batter, marketKey) => setModalState({ batter, marketKey }), []);
  const closeModal = useCallback(() => setModalState(null), []);

  const activeMatchup = activeGamePk ? games.find(m => m.gamePk === activeGamePk) : null;

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Batter Props</h1>
          <PredictionsNav />
        </div>
      </div>

      <div className="predictions-content">

        {gamesLoading ? (
          <div className="pp-loading-banner">
            <div className="pp-loading-spinner" />
            <div className="pp-loading-text">Loading today's games…</div>
          </div>
        ) : gamesError ? (
          <div className="bp-coming-soon">
            <span className="bp-coming-soon-icon">⚾</span>
            <p>{gamesError}</p>
          </div>
        ) : !games.length ? (
          <div className="bp-coming-soon">
            <span className="bp-coming-soon-icon">⚾</span>
            <p>No games scheduled for today.</p>
          </div>
        ) : (
          <>
            {/* ── Matchup selector ─────────────────────────────── */}
            <div className="bp-matchup-bar">
              <div className="bp-matchup-scroll">
                {games.map(m => (
                  <MatchupCard
                    key={m.gamePk}
                    matchup={m}
                    isActive={activeGamePk === m.gamePk}
                    onClick={() => setActiveGamePk(m.gamePk)}
                  />
                ))}
              </div>

              <div className="bp-filter-hand">
                {[
                  { key: 'all', label: 'All'   },
                  { key: 'fav', label: 'Favs'  },
                  { key: 'dog', label: 'Dawgs' },
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

            {/* ── Matchup label ────────────────────────────────── */}
            {activeMatchup && (
              <div className="bp-matchup-label">
                {activeMatchup.awayMlbId && <img src={teamLogoUrl(activeMatchup.awayMlbId)} alt={activeMatchup.awayAbbr} className="bp-matchup-label-logo" />}
                <span>{activeMatchup.awayAbbr}</span>
                <span className="bp-matchup-label-vs">vs</span>
                {activeMatchup.homeMlbId && <img src={teamLogoUrl(activeMatchup.homeMlbId)} alt={activeMatchup.homeAbbr} className="bp-matchup-label-logo" />}
                <span>{activeMatchup.homeAbbr}</span>
                <button
                  className="bp-matchup-label-link"
                  onClick={() => { closeModal(); navigate(`/mlb-schedule/${activeMatchup.gameId}`); window.scrollTo(0, 0); }}
                >
                  Matchup Analysis →
                </button>
              </div>
            )}

            {/* ── Per-game batter content ───────────────────────── */}
            {battersLoading ? (
              <div className="pp-loading-banner">
                <div className="pp-loading-spinner" />
                <div className="pp-loading-text">Loading batter props predictions</div>
              </div>
            ) : battersError ? (
              <div className="bp-coming-soon">
                <span className="bp-coming-soon-icon">⚾</span>
                <p>{battersError}</p>
              </div>
            ) : showPending ? (
              <>
                <PendingBanner predictionTime={predictionTime} />
                {visibleBatters.length > 0 && (
                  <div className="bp-pending-grid">
                    {visibleBatters.map(b => (
                      <PendingBatterCard key={b.id} batter={b} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* ── Top picks ──────────────────────────────────── */}
                <div className="bp-section-label" style={{ marginTop: '1.5rem' }}>
                  Top Picks · {activeMatchup?.awayAbbr} vs {activeMatchup?.homeAbbr}
                </div>
                {topPicks.length ? (
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
                ) : (
                  <div className="bp-no-picks">No picks match the current filter.</div>
                )}

                {/* ── Category rows ───────────────────────────────── */}
                {visibleBatters.length === 0 ? (
                  <div className="bp-coming-soon">
                    <span className="bp-coming-soon-icon">⚾</span>
                    <p>No batter props available for this game yet.</p>
                  </div>
                ) : (
                  rowMarkets.map(m => (
                    <BatterRow
                      key={m.key}
                      marketDef={m}
                      entries={getBattersForMarketKey(visibleBatters, m.key, riskFilter)}
                      onCardClick={openModal}
                    />
                  ))
                )}
              </>
            )}
          </>
        )}

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
