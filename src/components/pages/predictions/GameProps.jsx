import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import predictionsService from '../../../data/services/predictionsService';
import { getTeamById } from '../../../data/constants/apiConstants';
import PredictionsNav from './PredictionsNav';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/game-props.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logoUrl(mlbId) {
  return `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
}

function getTeamMlbId(teamId) {
  return getTeamById(teamId)?.mlbId || null;
}

function fmtPitcher(name) {
  if (!name) return 'TBD';
  const parts = name.trim().split(/\s+/);
  return parts.length < 2 ? name : `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

function fmtOdds(n) {
  if (n == null) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function isFinal(game) {
  const s = (game.status || '').toLowerCase();
  return s === 'final' || s === 'game over' || s === 'completed';
}

function statusLabel(game) {
  if (isFinal(game)) return 'Final';
  const s = (game.status || '').toLowerCase();
  if (s.includes('progress') || s === 'live') return 'Live';
  return game.game_time_et || game.game_time || 'TBD';
}

// Parse a game time string ("8:05 PM ET" or "20:05") into minutes from midnight for sorting
function parseGameTimeMinutes(game) {
  const t = game.game_time_et || game.game_time || '';
  const ampm = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const mer = ampm[3].toUpperCase();
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const parts = t.split(':');
  if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  return 9999;
}

// Returns true when a game has no odds or prediction data yet
function hasNoPredictions(game) {
  return !game.prediction &&
    !game.odds &&
    (!Array.isArray(game.bookmakers) || game.bookmakers.length === 0);
}

// Subtract 1 hour from a game time string and return display string e.g. "7:05 PM ET"
function predReadyTime(game) {
  const t = game.game_time_et || game.game_time || '';
  const ampm = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!ampm) return t || 'game time';
  let h = parseInt(ampm[1], 10);
  const min = ampm[2];
  const mer = ampm[3].toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  h = (h - 1 + 24) % 24;
  const displayH = h % 12 || 12;
  const displayMer = h >= 12 ? 'PM' : 'AM';
  return `${displayH}:${min} ${displayMer} ET`;
}

// ─── Mock game slate ──────────────────────────────────────────────────────────
// Fallback when the API returns no games (off-season / pre-season).
// Remove MOCK_GAMES and the fallback logic in useEffect once the season is live.

const MOCK_GAMES = [
  {
    id: 9001, game_pk: 9001,
    date: new Date().toISOString().slice(0, 10),
    game_time: '1:05 PM', status: 'Scheduled', season_type: 'regular',
    away_team_id: 15, away_team_name: 'New York Yankees',     away_sp_name: 'Gerrit Cole',
    home_team_id: 20, home_team_name: 'Boston Red Sox',       home_sp_name: 'Chris Sale',
  },
  {
    id: 9002, game_pk: 9002,
    date: new Date().toISOString().slice(0, 10),
    game_time: '4:05 PM', status: 'Scheduled', season_type: 'regular',
    away_team_id: 28, away_team_name: 'Los Angeles Dodgers',  away_sp_name: 'Tyler Glasnow',
    home_team_id: 5,  home_team_name: 'San Francisco Giants', home_sp_name: 'Logan Webb',
  },
  {
    id: 9003, game_pk: 9003,
    date: new Date().toISOString().slice(0, 10),
    game_time: '7:10 PM', status: 'Scheduled', season_type: 'regular',
    away_team_id: 12, away_team_name: 'Atlanta Braves',       away_sp_name: 'Spencer Strider',
    home_team_id: 30, home_team_name: 'New York Mets',        home_sp_name: 'Kodai Senga',
  },
  {
    id: 9004, game_pk: 9004,
    date: new Date().toISOString().slice(0, 10),
    game_time: '8:05 PM', status: 'Scheduled', season_type: 'regular',
    away_team_id: 26, away_team_name: 'Houston Astros',       away_sp_name: 'Framber Valdez',
    home_team_id: 8,  home_team_name: 'Texas Rangers',        home_sp_name: 'Nathan Eovaldi',
  },
  {
    id: 9005, game_pk: 9005,
    date: new Date().toISOString().slice(0, 10),
    game_time: '7:40 PM', status: 'Scheduled', season_type: 'regular',
    away_team_id: 11, away_team_name: 'Philadelphia Phillies', away_sp_name: 'Zack Wheeler',
    home_team_id: 14, home_team_name: 'Miami Marlins',         home_sp_name: 'Sandy Alcantara',
  },
  {
    id: 9006, game_pk: 9006,
    date: new Date().toISOString().slice(0, 10),
    game_time: '8:10 PM', status: 'Scheduled', season_type: 'regular',
    away_team_id: 3,  away_team_name: 'San Diego Padres',       away_sp_name: 'Yu Darvish',
    home_team_id: 18, home_team_name: 'Arizona Diamondbacks',   home_sp_name: 'Zac Gallen',
  },
  {
    id: 9007, game_pk: 9007,
    date: new Date().toISOString().slice(0, 10),
    game_time: '6:40 PM', status: 'Scheduled', season_type: 'regular',
    away_team_id: 10, away_team_name: 'Minnesota Twins',  away_sp_name: 'Pablo Lopez',
    home_team_id: 25, home_team_name: 'Detroit Tigers',   home_sp_name: 'Tarik Skubal',
  },
  {
    id: 9008, game_pk: 9008,
    date: new Date().toISOString().slice(0, 10),
    game_time: '2:20 PM', status: 'Scheduled', season_type: 'regular',
    away_team_id: 21, away_team_name: 'Chicago Cubs',        away_sp_name: 'Justin Steele',
    home_team_id: 6,  home_team_name: 'St. Louis Cardinals', home_sp_name: 'Miles Mikolas',
  },
];

// ─── Mock prediction data (fallback) ─────────────────────────────────────────

function getMockPick(game) {
  const seed    = game.game_pk ?? game.id ?? 1;
  const pickAway = seed % 2 === 0;
  const conf     = 55 + (seed % 30);
  const awayFav  = pickAway;
  const awayML   = awayFav ? -(130 + (seed % 25)) : +(105 + (seed % 25));
  const homeML   = awayFav ? +(105 + (seed % 25)) : -(130 + (seed % 25));
  const books    = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars'];

  const mlPickBase  = awayFav ? awayML : homeML;
  const mlOppBase   = awayFav ? homeML : awayML;
  const rlPickBase  = awayFav ?  120 : -165;
  const f5PickBase  = awayFav ? -(118 + (seed % 18)) : +(100 + (seed % 18));
  const nrfiBase    = -(128 + (seed % 20));

  // Per-book offsets keep values realistic but distinct across books
  const offsets = [-3, 0, 4, -2];

  // Determine which side of the total is favored (higher avg odds = better for bettor)
  const overBase  = -110;
  const underBase = -110 + ((seed % 5) - 2); // varies -112 to -108 per game
  const totalSide = overBase >= underBase ? 'Over' : 'Under';
  const totalLine = 7.5 + (seed % 4);        // e.g. 7.5, 8.5, 9.5, 10.5
  const totalBase = totalSide === 'Over' ? overBase : underBase;

  // Model probability estimates per market (used for edge calculation)
  const modelProbs = {
    mlPick: conf,
    rlPick: Math.max(50, conf - 6 + (seed % 9)),
    total:  50 + (seed % 12),
    f5Pick: Math.max(50, conf - 4 + (seed % 7)),
    nrfi:   54 + (seed % 14),
  };

  // DFS platforms — show available Over/Under lines (null = market not offered)
  const dfsLineOffsets = [-0.5, 0, 0, 0.5]; // PrizePicks, Underdog, DK Pick6, Betr Picks

  return {
    pick: pickAway ? 'away' : 'home',
    confidence: conf,
    totalSide,
    totalLine,
    modelProbs,
    books: books.map((name, i) => ({
      name,
      mlPick:  mlPickBase  + offsets[i],
      mlOpp:   mlOppBase   - offsets[i],
      rlPick:  rlPickBase  + offsets[i],
      total:   totalBase   + offsets[i],
      f5Pick:  f5PickBase  + offsets[i],
      nrfi:    nrfiBase    + offsets[i],
    })),
    exchanges: [],
    dfs: ['PrizePicks', 'Underdog', 'DraftKings Pick6', 'Betr Picks'].map((name, i) => ({
      name,
      mlPick: null,
      rlPick: null,
      total:  totalLine + dfsLineOffsets[i],
      f5Pick: null,
      nrfi:   seed % 2 === i % 2 ? totalLine - 0.5 : null, // some platforms carry NRFI
    })),
    // Keep individual fields for the card summary display
    moneyline: { away: awayML, home: homeML },
  };
}

// ─── Real prediction → pick shape ─────────────────────────────────────────────
// Maps GamePredictionWithContextSchema fields onto the same pick shape used by
// all UI components. Falls back to getMockPick() for any field not yet on server.

function buildPick(row) {
  const pred       = row?.prediction;
  const odds       = row?.odds;
  const bookmakers = Array.isArray(row?.bookmakers) ? row.bookmakers : [];

  if (!pred && !odds && !bookmakers.length) return getMockPick(row);

  const mock  = getMockPick(row);
  const pHome = pred?.p_home_win ?? 0.5;
  const pick  = pHome >= 0.5 ? 'home' : 'away';
  const conf  = Math.round(Math.max(pHome, 1 - pHome) * 100);

  const awayML = odds?.away_moneyline_game != null ? Math.round(odds.away_moneyline_game) : null;
  const homeML = odds?.home_moneyline_game != null ? Math.round(odds.home_moneyline_game) : null;

  const totalLine  = odds?.over_under_line_game ?? pred?.predicted_total ?? mock.totalLine;
  const overOdds   = odds?.over_price  != null ? Math.round(odds.over_price)  : -110;
  const underOdds  = odds?.under_price != null ? Math.round(odds.under_price) : -110;
  const totalSide  = overOdds >= underOdds ? 'Over' : 'Under';

  const predTotal = pred?.predicted_total ?? totalLine;
  const totalProb = Math.min(70, 50 + Math.round(
    Math.abs(predTotal - totalLine) / (pred?.total_std_dev ?? 4) * 15
  ));

  // Helper to map a bookmaker/market entry to the shared odds shape
  const mapEntry = (b) => ({
    name:   b.bookmaker_title,
    mlPick: Math.round(pick === 'home' ? b.home_moneyline      : b.away_moneyline),
    mlOpp:  Math.round(pick === 'home' ? b.away_moneyline      : b.home_moneyline),
    rlPick: Math.round(pick === 'home' ? b.home_run_line_price : b.away_run_line_price),
    total:  Math.round(totalSide === 'Over' ? b.over_price     : b.under_price),
    f5Pick: b.f5_home_moneyline != null ? Math.round(pick === 'home' ? b.f5_home_moneyline : b.f5_away_moneyline) : null,
    nrfi:   b.nrfi_yes_price    != null ? Math.round(b.nrfi_yes_price) : null,
  });

  // Sportsbooks
  let books;
  if (bookmakers.length > 0) {
    books = bookmakers.map(mapEntry);
  } else {
    books = [];
  }

  // Prediction markets and DFS — real data only, empty array = hide tab
  const predMarkets = Array.isArray(row?.prediction_markets) ? row.prediction_markets : [];
  const exchanges   = predMarkets.map(mapEntry);
  const dfs         = Array.isArray(row?.dfs_props) ? row.dfs_props.map(mapEntry) : [];

  return {
    ...mock,
    pick, confidence: conf,
    totalSide, totalLine,
    modelProbs: {
      mlPick: conf,
      rlPick: Math.max(50, conf - 6),
      total:  totalProb,
      f5Pick: Math.max(50, conf - 4),
      nrfi:   mock.modelProbs.nrfi,
    },
    moneyline: { away: awayML, home: homeML },
    books,
    exchanges,
    dfs,
  };
}

// ─── Probability / edge helpers ───────────────────────────────────────────────

function calcEV(modelProbPct, odds) {
  const prob    = modelProbPct / 100;
  const decimal = odds < 0 ? 1 + 100 / Math.abs(odds) : 1 + odds / 100;
  return ((prob * decimal - 1) * 100).toFixed(1);
}

// ─── Sportsbook config ────────────────────────────────────────────────────────

const BOOK_META = {
  DraftKings:     { abbr: 'DK',  color: '#62a800', bg: 'rgba(98,168,0,0.18)',    logo: 'https://logo.clearbit.com/draftkings.com' },
  FanDuel:        { abbr: 'FD',  color: '#1493ff', bg: 'rgba(20,147,255,0.18)',  logo: 'https://logo.clearbit.com/fanduel.com' },
  BetMGM:         { abbr: 'MGM', color: '#c8a84b', bg: 'rgba(200,168,75,0.18)',  logo: 'https://logo.clearbit.com/betmgm.com' },
  Caesars:        { abbr: 'CZR', color: '#0057b8', bg: 'rgba(0,87,184,0.18)',    logo: 'https://logo.clearbit.com/caesarssportsbook.com' },
  BetRivers:      { abbr: 'BR',  color: '#e63946', bg: 'rgba(230,57,70,0.18)',   logo: 'https://logo.clearbit.com/betrivers.com' },
  Fanatics:       { abbr: 'FAN', color: '#e84118', bg: 'rgba(232,65,24,0.18)',   logo: 'https://logo.clearbit.com/fanatics.com' },
  'Hard Rock Bet':{ abbr: 'HRB', color: '#ffd700', bg: 'rgba(255,215,0,0.18)',   logo: 'https://logo.clearbit.com/hardrock.com' },
  PointsBet:      { abbr: 'PB',  color: '#ff6b35', bg: 'rgba(255,107,53,0.18)',  logo: 'https://logo.clearbit.com/pointsbet.com' },
  BetUS:          { abbr: 'BUS', color: '#7c3aed', bg: 'rgba(124,58,237,0.18)',  logo: 'https://logo.clearbit.com/betus.com' },
};

function BookLogo({ name }) {
  const meta = BOOK_META[name] ?? { abbr: name.slice(0, 2).toUpperCase(), color: '#aaa', bg: 'rgba(170,170,170,0.15)', logo: null };
  const [err, setErr] = useState(false);
  if (!meta.logo || err) {
    return (
      <span className="gp-book-pill" style={{ background: meta.bg, color: meta.color }}>
        {meta.abbr}
      </span>
    );
  }
  return <img src={meta.logo} alt={name} className="gp-book-logo" onError={() => setErr(true)} />;
}

// Returns the row index with the best odds for the bettor in `colIndex`.
// Higher American odds value = better for the bettor in all cases.
function findBestBook(rows, colIndex) {
  if (colIndex == null || !rows.length) return -1;
  return rows.reduce((best, row, i, arr) =>
    row.values[colIndex] > arr[best].values[colIndex] ? i : best
  , 0);
}

// ─── Top Pick ─────────────────────────────────────────────────────────────────
// Finds the single highest-edge bet across all games and all markets.

const MARKET_LABELS = {
  mlPick: 'ML',
  rlPick: 'Run Line',
  total:  'Total',
  f5Pick: 'F5 ML',
  nrfi:   'NRFI',
};

// Returns the top N picks across all games sorted by model probability (highest first).
// Probabilities are derived directly from the prediction object, not mock fallbacks.
// Markets are skipped when no book has real (non-null) odds for that column.
function getTopPicks(games, n = 3) {
  const candidates = [];

  for (const game of games) {
    const pick = buildPick(game);
    const pred = game.prediction;

    // Need real books and a prediction to evaluate
    if (!pick.books.length || !pred) continue;

    const awayName   = getTeamById(game.away_team_id)?.name || game.away_team_name;
    const homeName   = getTeamById(game.home_team_id)?.name || game.home_team_name;
    const pickedTeam = pick.pick === 'away' ? awayName : homeName;
    const pickedId   = pick.pick === 'away' ? game.away_team_id : game.home_team_id;

    // Best real odds for a column across all books — returns null if every book is null
    const bestReal = (key) => {
      const valid = pick.books.map(b => b[key]).filter(v => v != null);
      return valid.length ? Math.max(...valid) : null;
    };

    // 1. Moneyline — probability from p_home_win
    const pHome  = pred.p_home_win ?? 0.5;
    const mlProb = Math.round(Math.max(pHome, 1 - pHome) * 100);
    const mlOdds = bestReal('mlPick');
    if (mlOdds != null) {
      candidates.push({
        game, pick, marketKey: 'mlPick', label: 'ML',
        bestOdds: mlOdds, modelProb: mlProb,
        ev: parseFloat(calcEV(mlProb, mlOdds)),
        displayName: pickedTeam, displayId: pickedId,
      });
    }

    // 2. Run Line — confidence from |predicted_margin| / margin_std_dev
    const margin    = Math.abs(pred.predicted_margin ?? 0);
    const marginStd = pred.margin_std_dev ?? 4;
    const rlProb    = Math.min(80, Math.round(50 + (margin / marginStd) * 15));
    const rlOdds    = bestReal('rlPick');
    if (rlOdds != null) {
      candidates.push({
        game, pick, marketKey: 'rlPick', label: 'Run Line',
        bestOdds: rlOdds, modelProb: rlProb,
        ev: parseFloat(calcEV(rlProb, rlOdds)),
        displayName: pickedTeam, displayId: pickedId,
      });
    }

    // 3. Total — confidence from |predicted_total - line| / total_std_dev
    const ouLine    = game.odds?.over_under_line_game ?? pred.predicted_total;
    const predTotal = pred.predicted_total ?? ouLine;
    const totalStd  = pred.total_std_dev ?? 4;
    const totalProb = Math.min(70, Math.round(50 + (Math.abs(predTotal - ouLine) / totalStd) * 15));
    const totalOdds = bestReal('total');
    if (totalOdds != null) {
      candidates.push({
        game, pick, marketKey: 'total', label: `${pick.totalSide} ${pick.totalLine}`,
        bestOdds: totalOdds, modelProb: totalProb,
        ev: parseFloat(calcEV(totalProb, totalOdds)),
        displayName: `${awayName} @ ${homeName}`, displayId: null,
      });
    }

    // 4. F5 ML — only when real odds exist across books
    const f5Odds = bestReal('f5Pick');
    if (f5Odds != null) {
      const f5Prob = Math.min(80, Math.round(50 + (margin / marginStd) * 12));
      candidates.push({
        game, pick, marketKey: 'f5Pick', label: 'F5 ML',
        bestOdds: f5Odds, modelProb: f5Prob,
        ev: parseFloat(calcEV(f5Prob, f5Odds)),
        displayName: pickedTeam, displayId: pickedId,
      });
    }

    // NRFI — not yet wired; skip until prediction model supports it
  }

  return candidates
    .sort((a, b) => b.modelProb - a.modelProb)
    .slice(0, n);
}

function TopPick({ games }) {
  const gamesWithOdds = games.filter(g => !hasNoPredictions(g));
  if (!gamesWithOdds.length) return null;

  const tops = getTopPicks(gamesWithOdds, 3);
  if (!tops.length) return null;

  return (
    <div className="gp-top-picks-section">
      <div className="gp-top-picks-header">
        <span className="gp-top-pick-dot" />
        Top Picks
      </div>

      <div className="gp-top-picks-grid">
        {tops.map((top, i) => {
          const isTotal  = top.marketKey === 'total';
          const mlbId    = top.displayId ? getTeamMlbId(top.displayId) : null;
          const awayMlbId = isTotal ? getTeamMlbId(top.game.away_team_id) : null;
          const homeMlbId = isTotal ? getTeamMlbId(top.game.home_team_id) : null;
          const evPos = top.ev > 0;
          return (
            <div key={i} className="gp-top-pick-card">
              {/* Identity */}
              <div className="gp-top-pick-identity">
                {isTotal ? (
                  <>
                    {awayMlbId && <img src={logoUrl(awayMlbId)} alt={top.game.away_team_name} className="gp-top-pick-logo" />}
                    <span className="gp-top-pick-vs">@</span>
                    {homeMlbId && <img src={logoUrl(homeMlbId)} alt={top.game.home_team_name} className="gp-top-pick-logo" />}
                  </>
                ) : (
                  <>
                    {mlbId && <img src={logoUrl(mlbId)} alt={top.displayName} className="gp-top-pick-logo" />}
                    <span className="gp-top-pick-name">{top.displayName}</span>
                  </>
                )}
              </div>

              <div className="gp-top-pick-divider" />

              {/* Stats */}
              <div className="gp-top-pick-stats">
                <div className="gp-top-pick-stat">
                  <span className="gp-top-pick-stat-label">Market</span>
                  <span className="gp-top-pick-stat-value">{top.label}</span>
                </div>
                <div className="gp-top-pick-stat">
                  <span className="gp-top-pick-stat-label">Odds</span>
                  <span className="gp-top-pick-stat-value odds">{fmtOdds(top.bestOdds)}</span>
                </div>
                <div className="gp-top-pick-stat">
                  <span className="gp-top-pick-stat-label">Probability</span>
                  <span className="gp-top-pick-stat-value">{top.modelProb}%</span>
                </div>
                <div className="gp-top-pick-stat">
                  <span className="gp-top-pick-stat-label">EV</span>
                  <span className={`gp-top-pick-stat-value edge ${evPos ? 'pos' : 'neg'}`}>
                    {evPos ? '+' : ''}{top.ev}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBar({ pct }) {
  const color = pct >= 72 ? '#4ade80' : pct >= 62 ? '#facc15' : '#94a3b8';
  return (
    <div className="gp-conf-wrap">
      <div className="gp-conf-track">
        <div className="gp-conf-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="gp-conf-label" style={{ color }}>{pct}%</span>
    </div>
  );
}

// pickColIndex  — column index for the pick (null for totals with no direction)
// bestOverCol   — for Total: find best over (col 0) and best under (col 1) separately
// eslint-disable-next-line no-unused-vars
function OddsTable({ headers, rows, pickColIndex, isTotalTable = false }) {
  const bestPickRow  = findBestBook(rows, pickColIndex);
  const bestOverRow  = isTotalTable ? findBestBook(rows, 0) : -1;
  const bestUnderRow = isTotalTable ? findBestBook(rows, 1) : -1;

  return (
    <div className="gp-odds-table">
      {/* Header */}
      <div className="gp-odds-head">
        <span className="gp-odds-book-cell">Book</span>
        {headers.map((h, i) => (
          <span key={i} className={`gp-odds-cell ${pickColIndex === i ? 'pick-col' : ''}`}>{h}</span>
        ))}
        <span className="gp-odds-best-cell" />
      </div>

      {/* Rows */}
      {rows.map((row, ri) => {
        const isPickBest  = ri === bestPickRow && !isTotalTable;
        const isOverBest  = ri === bestOverRow  && isTotalTable;
        const isUnderBest = ri === bestUnderRow && isTotalTable;
        const isAnyBest   = isPickBest || isOverBest || isUnderBest;

        return (
          <div key={ri} className={`gp-odds-row ${isAnyBest ? 'best-row' : ''}`}>
            {/* Book logo + name */}
            <span className="gp-odds-book-cell">
              <BookLogo name={row.book} />
              <span className="gp-odds-book-name">{row.book}</span>
            </span>

            {/* Odds values */}
            {row.values.map((v, ci) => (
              <span key={ci} className={`gp-odds-cell ${pickColIndex === ci ? 'pick-col' : ''} ${v > 0 ? 'pos' : 'neg'}`}>
                {fmtOdds(v)}
              </span>
            ))}

            {/* Best badge */}
            <span className="gp-odds-best-cell">
              {isPickBest  && <span className="gp-best-badge">★ Best</span>}
              {isOverBest  && <span className="gp-best-badge over">★ Over</span>}
              {isUnderBest && ri !== bestOverRow && <span className="gp-best-badge under">★ Under</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Odds comparison matrix ───────────────────────────────────────────────────
// Rows = sportsbooks · Columns = all markets
// Best odds per column are highlighted · Book with most wins gets "Best Book" crown

const ALL_COLUMNS = [
  { key: 'mlPick',  label: 'ML',       accent: 'pick'  },
  { key: 'rlPick',  label: 'Run Line', accent: 'pick'  },
  { key: 'total',   label: 'Total',    accent: 'total' },
  { key: 'f5Pick',  label: 'F5 ML',    accent: 'pick'  },
  { key: 'nrfi',    label: 'NRFI',     accent: 'nrfi'  },
];

function OddsMatrix({ pick, pickName, oppName }) {
  // Only show columns where at least one book has real (non-null) data
  const columns = ALL_COLUMNS.filter(col =>
    pick.books.some(b => b[col.key] != null)
  );

  // For each column find the row index with the highest (best) value
  const bestRow = {};
  columns.forEach(col => {
    bestRow[col.key] = pick.books.reduce((best, book, i, arr) =>
      (book[col.key] ?? -Infinity) > (arr[best][col.key] ?? -Infinity) ? i : best
    , 0);
  });

  // Count how many "best" cells each book owns
  const winCount = pick.books.map((_, bi) =>
    Object.values(bestRow).filter(best => best === bi).length
  );
  const topBookIdx = winCount.indexOf(Math.max(...winCount));

  const gridStyle = { gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` };

  return (
    <div className="gp-matrix-wrap">
      <div className="gp-matrix-outer">
        {/* Fixed header row */}
        <div className="gp-matrix-grid" style={gridStyle}>
          <div className="gp-matrix-corner">Sportsbook</div>
          {columns.map(col => (
            <div key={col.key} className={`gp-matrix-col-head accent-${col.accent}`}>
              <span className="gp-matrix-col-label">{col.label}</span>
              <span className="gp-matrix-col-sub">
                {col.key === 'total'   ? `${pick.totalSide} ${pick.totalLine}` :
                 col.accent === 'pick' ? pickName  :
                 col.accent === 'nrfi' ? '1st Inn' : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable book rows */}
        <div className="gp-matrix-body">
          <div className="gp-matrix-grid" style={gridStyle}>
            {pick.books.map((book, bi) => (
              <>
                <div
                  key={`book-${bi}`}
                  className={`gp-matrix-book-cell ${bi === topBookIdx ? 'top-book' : ''}`}
                >
                  <BookLogo name={book.name} />
                  <span className="gp-matrix-book-name">{book.name}</span>
                  {bi === topBookIdx && (
                    <span className="gp-matrix-crown" title="Best overall book">👑</span>
                  )}
                </div>
                {columns.map(col => {
                  const val    = book[col.key];
                  const isBest = bestRow[col.key] === bi;
                  return (
                    <div
                      key={`${bi}-${col.key}`}
                      className={`gp-matrix-cell accent-${col.accent} ${isBest ? 'best' : ''} ${val > 0 ? 'pos' : 'neg'}`}
                    >
                      <span className="gp-matrix-odds">{fmtOdds(val)}</span>
                      {isBest && <span className="gp-matrix-best-dot" aria-label="Best odds" />}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <div className="gp-matrix-legend">
        <span className="gp-legend-item pick">● Pick-side market</span>
        <span className="gp-legend-item total">● Total (favored side)</span>
        <span className="gp-legend-item best-dot">◆ Best odds</span>
        <span className="gp-legend-item crown">👑 Best overall book</span>
      </div>
    </div>
  );
}

// ─── Prediction exchange config ───────────────────────────────────────────────

const EXCHANGE_META = {
  BetOpenly: { abbr: 'BO',  color: '#e879f9', bg: 'rgba(232,121,249,0.15)', logo: 'https://logo.clearbit.com/betopenly.com' },
  Kalshi:    { abbr: 'KAL', color: '#00d4aa', bg: 'rgba(0,212,170,0.15)',   logo: 'https://logo.clearbit.com/kalshi.com' },
  Novig:     { abbr: 'NVG', color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  logo: 'https://logo.clearbit.com/novig.com' },
  Polymarket:{ abbr: 'PM',  color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', logo: 'https://logo.clearbit.com/polymarket.com' },
  ProphetX:  { abbr: 'PX',  color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  logo: 'https://logo.clearbit.com/prophetx.co' },
};

const DFS_META = {
  PrizePicks:         { abbr: 'PP',  color: '#818cf8', bg: 'rgba(129,140,248,0.15)', logo: 'https://logo.clearbit.com/prizepicks.com' },
  Underdog:           { abbr: 'UD',  color: '#f43f5e', bg: 'rgba(244,63,94,0.15)',   logo: 'https://logo.clearbit.com/underdogfantasy.com' },
  'DraftKings Pick6': { abbr: 'DK6', color: '#62a800', bg: 'rgba(98,168,0,0.15)',    logo: 'https://logo.clearbit.com/draftkings.com' },
  'Betr Picks':       { abbr: 'BTR', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  logo: 'https://logo.clearbit.com/betr.com' },
};

function ExchangeLogo({ name }) {
  const meta = EXCHANGE_META[name] ?? DFS_META[name] ?? { abbr: name.slice(0, 2).toUpperCase(), color: '#aaa', bg: 'rgba(170,170,170,0.15)', logo: null };
  const [err, setErr] = useState(false);
  if (!meta.logo || err) {
    return (
      <span className="gp-book-pill" style={{ background: meta.bg, color: meta.color }}>
        {meta.abbr}
      </span>
    );
  }
  return <img src={meta.logo} alt={name} className="gp-book-logo" onError={() => setErr(true)} />;
}

// Best exchange = highest American odds value (same logic as sportsbooks)
function findBestExchange(exchanges, key) {
  return exchanges.reduce((best, ex, i, arr) =>
    (ex[key] ?? -Infinity) > (arr[best][key] ?? -Infinity) ? i : best
  , 0);
}

function ExchangeMatrix({ pick, pickName }) {
  const columns = ALL_COLUMNS.filter(col =>
    pick.exchanges.some(ex => ex[col.key] != null)
  );

  const bestRow = {};
  columns.forEach(col => {
    bestRow[col.key] = findBestExchange(pick.exchanges, col.key);
  });

  const winCount = pick.exchanges.map((_, ei) =>
    Object.values(bestRow).filter(best => best === ei).length
  );
  const topExIdx = winCount.indexOf(Math.max(...winCount));
  const gridStyle = { gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` };

  return (
    <div className="gp-matrix-wrap">
      <div className="gp-exchange-note">
        Prediction market odds. Higher value = better price for bettors. Platforms may not offer all markets.
      </div>

      <div className="gp-matrix-outer">
        {/* Fixed header row */}
        <div className="gp-matrix-grid" style={gridStyle}>
          <div className="gp-matrix-corner">Platform</div>
          {columns.map(col => (
            <div key={col.key} className={`gp-matrix-col-head accent-${col.accent}`}>
              <span className="gp-matrix-col-label">{col.label}</span>
              <span className="gp-matrix-col-sub">
                {col.key === 'total'   ? `${pick.totalSide} ${pick.totalLine}` :
                 col.accent === 'pick' ? pickName  :
                 col.accent === 'nrfi' ? '1st Inn' : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable exchange rows */}
        <div className="gp-matrix-body">
          <div className="gp-matrix-grid" style={gridStyle}>
            {pick.exchanges.map((ex, ei) => (
              <>
                <div
                  key={`ex-${ei}`}
                  className={`gp-matrix-book-cell ${ei === topExIdx ? 'top-book' : ''}`}
                >
                  <ExchangeLogo name={ex.name} />
                  <span className="gp-matrix-book-name">{ex.name}</span>
                  {ei === topExIdx && <span className="gp-matrix-crown" title="Best overall platform">👑</span>}
                </div>
                {columns.map(col => {
                  const val    = ex[col.key];
                  const isBest = bestRow[col.key] === ei;
                  return (
                    <div
                      key={`${ei}-${col.key}`}
                      className={`gp-matrix-cell accent-${col.accent} ${isBest ? 'best' : ''}`}
                    >
                      <span className="gp-matrix-odds">{fmtOdds(val)}</span>
                      {isBest && <span className="gp-matrix-best-dot" aria-label="Best price" />}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <div className="gp-matrix-legend">
        <span className="gp-legend-item pick">● Pick-side market</span>
        <span className="gp-legend-item total">● Total (favored side)</span>
        <span className="gp-legend-item best-dot">◆ Best odds</span>
        <span className="gp-legend-item crown">👑 Best overall platform</span>
      </div>
    </div>
  );
}

// ─── DFS matrix ───────────────────────────────────────────────────────────────
// DFS platforms offer Over/Under lines (not odds). null = market not available.

function DFSMatrix({ pick }) {
  const columns = ALL_COLUMNS.filter(col =>
    pick.dfs.some(p => p[col.key] != null)
  );
  const gridStyle = { gridTemplateColumns: `180px repeat(${columns.length}, 1fr)` };

  return (
    <div className="gp-matrix-wrap">
      <div className="gp-exchange-note">
        DFS platforms offer prop lines (More/Less). Markets not offered by a platform are shown as —.
      </div>

      <div className="gp-matrix-outer">
        {/* Fixed header row */}
        <div className="gp-matrix-grid" style={gridStyle}>
          <div className="gp-matrix-corner">Platform</div>
          {columns.map(col => (
            <div key={col.key} className={`gp-matrix-col-head accent-${col.accent}`}>
              <span className="gp-matrix-col-label">{col.label}</span>
              <span className="gp-matrix-col-sub">
                {col.key === 'total'   ? `${pick.totalSide} ${pick.totalLine}` :
                 col.accent === 'pick' ? 'Line' :
                 col.accent === 'nrfi' ? '1st Inn' : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable DFS rows */}
        <div className="gp-matrix-body">
          <div className="gp-matrix-grid" style={gridStyle}>
            {pick.dfs.map((platform, pi) => (
              <>
                <div key={`dfs-${pi}`} className="gp-matrix-book-cell">
                  <ExchangeLogo name={platform.name} />
                  <span className="gp-matrix-book-name">{platform.name}</span>
                </div>
                {columns.map(col => {
                  const val = platform[col.key];
                  return (
                    <div
                      key={`${pi}-${col.key}`}
                      className={`gp-matrix-cell accent-${col.accent} ${val == null ? 'unavailable' : ''}`}
                    >
                      <span className="gp-matrix-odds">
                        {val == null ? '—' : col.key === 'total' || col.key === 'nrfi' ? val : '—'}
                      </span>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <div className="gp-matrix-legend">
        <span className="gp-legend-item" style={{ color: 'rgba(255,255,255,0.35)' }}>— Market not offered by platform</span>
        <span className="gp-legend-item" style={{ color: 'rgba(255,255,255,0.35)' }}>Values shown are the prop line (More/Less)</span>
      </div>
    </div>
  );
}

// ─── Right-side drawer modal ──────────────────────────────────────────────────

function OddsDrawer({ game, onClose }) {
  const pick       = buildPick(game);
  const awayAbbr   = getTeamById(game.away_team_id)?.id || game.away_team_name;
  const homeAbbr   = getTeamById(game.home_team_id)?.id || game.home_team_name;
  const awayMlbId  = getTeamMlbId(game.away_team_id);
  const homeMlbId  = getTeamMlbId(game.home_team_id);
  const awayName   = getTeamById(game.away_team_id)?.name || game.away_team_name;
  const homeName   = getTeamById(game.home_team_id)?.name || game.home_team_name;
  const pickedName = pick.pick === 'away' ? awayName : homeName;
  const pickAbbr   = pick.pick === 'away' ? awayAbbr : homeAbbr;
  const oppAbbr    = pick.pick === 'away' ? homeAbbr : awayAbbr;

  const [view, setView] = useState('books'); // 'books' | 'exchange'

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="gp-drawer-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="gp-drawer" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="gp-drawer-header">
          <div className="gp-drawer-matchup">
            {awayMlbId && <img src={logoUrl(awayMlbId)} alt={game.away_team_name} className="gp-drawer-logo" />}
            <div className="gp-drawer-teams">
              <span className="gp-drawer-team-name">{awayName}</span>
              <span className="gp-drawer-vs">@ {homeName}</span>
            </div>
            {homeMlbId && <img src={logoUrl(homeMlbId)} alt={game.home_team_name} className="gp-drawer-logo" />}
          </div>
          <div className="gp-drawer-subrow">
            <span className="gp-drawer-time">{statusLabel(game)}</span>
            <div className="gp-drawer-pick-chip">
              <span className="gp-pick-badge">PICK</span>
              <span className="gp-drawer-pick-name">{pickedName}</span>
              <span className="gp-drawer-conf">{pick.confidence}%</span>
            </div>
          </div>
          <button className="gp-drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* View toggle */}
        <div className="gp-view-toggle">
          <button
            className={`gp-view-toggle-btn ${view === 'books' ? 'active' : ''}`}
            onClick={() => setView('books')}
          >
            Sportsbooks
          </button>
          {pick.exchanges.length > 0 && (
            <button
              className={`gp-view-toggle-btn ${view === 'exchange' ? 'active' : ''}`}
              onClick={() => setView('exchange')}
            >
              Pred. Exchange
            </button>
          )}
        </div>

        {/* Matrix body */}
        <div className="gp-drawer-body">
          {view === 'books' && (
            pick.books.length > 0
              ? <OddsMatrix pick={pick} pickName={pickAbbr} oppName={oppAbbr} />
              : (
                <div className="gp-odds-unavailable">
                  <span className="gp-odds-unavailable-icon">⏳</span>
                  <p>Odds not yet available</p>
                  <p className="gp-odds-unavailable-sub">Check back closer to game time ({statusLabel(game)})</p>
                </div>
              )
          )}
          {view === 'exchange' && <ExchangeMatrix pick={pick} pickName={pickAbbr} />}
        </div>

      </div>
    </div>,
    document.body
  );
}

// ─── Game card ────────────────────────────────────────────────────────────────

function GamePickCard({ game, isSelected, onSelect }) {
  const pick       = buildPick(game);
  const awayMlbId  = getTeamMlbId(game.away_team_id);
  const homeMlbId  = getTeamMlbId(game.home_team_id);
  const awayAbbr   = getTeamById(game.away_team_id)?.id || game.away_team_name;
  const homeAbbr   = getTeamById(game.home_team_id)?.id || game.home_team_name;
  const awayIsPick = pick.pick === 'away';
  const homeIsPick = pick.pick === 'home';

  return (
    <button
      className={`gp-card ${isSelected ? 'selected' : ''} ${hasNoPredictions(game) ? 'gp-card--muted' : ''}`}
      data-pick={pick.pick}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      {/* Top bar: time + status */}
      <div className="gp-card-topbar">
        <span className="gp-card-time">{statusLabel(game)}</span>
        <span className="gp-card-status-dot" />
      </div>

      {/* Team logos */}
      <div className="gp-card-teams">
        <div className={`gp-card-side ${awayIsPick ? 'is-pick' : ''}`}>
          {awayMlbId && <img src={logoUrl(awayMlbId)} alt={game.away_team_name} className="gp-card-logo" />}
          <span className="gp-card-abbr">{awayAbbr}</span>
          {pick.moneyline.away != null && (
            <span className={`gp-card-odds ${pick.moneyline.away > 0 ? 'pos' : 'neg'}`}>
              {fmtOdds(pick.moneyline.away)}
            </span>
          )}
          {awayIsPick && <span className="gp-pick-badge">PICK</span>}
        </div>

        <div className="gp-card-vs">
          <span>@</span>
          <span className="gp-card-pitcher-vs">{fmtPitcher(game.away_sp_name)} vs {fmtPitcher(game.home_sp_name)}</span>
        </div>

        <div className={`gp-card-side right ${homeIsPick ? 'is-pick' : ''}`}>
          {homeIsPick && <span className="gp-pick-badge">PICK</span>}
          {pick.moneyline.home != null && (
            <span className={`gp-card-odds ${pick.moneyline.home > 0 ? 'pos' : 'neg'}`}>
              {fmtOdds(pick.moneyline.home)}
            </span>
          )}
          <span className="gp-card-abbr">{homeAbbr}</span>
          {homeMlbId && <img src={logoUrl(homeMlbId)} alt={game.home_team_name} className="gp-card-logo" />}
        </div>
      </div>

      {/* Confidence bar or "predictions loading" */}
      <div className="gp-card-footer">
        {hasNoPredictions(game) ? (
          <span className="gp-card-pred-loading">⏳ Predictions loading {predReadyTime(game)}</span>
        ) : (
          <ConfidenceBar pct={pick.confidence} />
        )}
      </div>
    </button>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="gp-card gp-card-skeleton" aria-hidden="true">
      <div className="gp-card-topbar">
        <div className="sk sk-text narrow" />
      </div>
      <div className="gp-card-teams">
        <div className="gp-card-side">
          <div className="sk sk-logo" />
          <div className="sk sk-text narrow" />
        </div>
        <div className="gp-card-vs"><span>@</span></div>
        <div className="gp-card-side right">
          <div className="sk sk-text narrow" />
          <div className="sk sk-logo" />
        </div>
      </div>
      <div className="gp-card-footer">
        <div className="sk sk-text wide" style={{ width: '100%' }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GameProps() {
  const [games, setGames]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [usingMock, setUsingMock]   = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    predictionsService.getToday()
      .then(rows => {
        const today = Array.isArray(rows)
          ? rows.filter(r => r.season_type !== 'spring' && r.season_type !== 'S' && !isFinal(r))
          : [];
        if (today.length > 0) {
          setGames([...today].sort((a, b) => parseGameTimeMinutes(a) - parseGameTimeMinutes(b)));
        } else {
          setGames(MOCK_GAMES);
          setUsingMock(true);
        }
      })
      .catch(() => {
        setGames(MOCK_GAMES);
        setUsingMock(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = useCallback((gameId) => {
    setSelectedId(prev => prev === gameId ? null : gameId);
  }, []);

  const handleClose = useCallback(() => setSelectedId(null), []);

  const selectedGame = games.find(g => (g.id ?? g.game_pk) === selectedId) ?? null;

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="predictions-page">
      {/* Header */}
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Game Predictions</h1>
          <PredictionsNav />
        </div>
      </div>

      {/* Content */}
      <div className="predictions-content">
        <div className="gp-date-label">{todayLabel}</div>


        {/* "No predictions yet" banner — shown when every game is missing odds + predictions */}
        {!loading && games.length > 0 && games.every(g => hasNoPredictions(g)) && (() => {
          const firstGame = [...games].sort((a, b) => parseGameTimeMinutes(a) - parseGameTimeMinutes(b))[0];
          return (
            <div className="gp-no-preds-banner">
              <span className="gp-no-preds-icon">⏳</span>
              <div className="gp-no-preds-text">
                <span className="gp-no-preds-title">Predictions not yet available</span>
                <span className="gp-no-preds-sub">Check back closer to game time · Ready around {predReadyTime(firstGame)}</span>
              </div>
            </div>
          );
        })()}

        {/* Top Pick */}
        {!loading && games.length > 0 && !games.every(g => hasNoPredictions(g)) && <TopPick games={games} />}

        {/* Card grid */}
        {loading ? (
          <>
            <div className="gp-loading-banner">
              <span className="gp-loading-spinner" />
              <span>Predictions loading</span>
            </div>
            <div className="gp-grid">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : games.length === 0 ? (
          <div className="gp-empty">
            <span className="gp-empty-icon">⚾</span>
            <p>No games scheduled for today.</p>
          </div>
        ) : (
          <>
            <div className="pp-divider">
              <span className="pp-divider-line" />
              <span className="pp-divider-label">
                {games.length} game{games.length !== 1 ? 's' : ''} · Select a card to see full odds
              </span>
              <span className="pp-divider-line" />
            </div>
            <div className="gp-grid">
              {games.map(game => {
                const gid = game.id ?? game.game_pk;
                return (
                  <GamePickCard
                    key={gid}
                    game={game}
                    isSelected={selectedId === gid}
                    onSelect={() => handleCardClick(gid)}
                  />
                );
              })}
            </div>

            <p className="gp-disclaimer">
              * Prediction data is model-generated and for informational purposes only.
              Odds sourced from major US sportsbooks. Please gamble responsibly.
            </p>
          </>
        )}
      </div>

      {/* Right-side drawer modal */}
      {selectedGame && (
        <OddsDrawer game={selectedGame} onClose={handleClose} />
      )}
    </div>
  );
}
