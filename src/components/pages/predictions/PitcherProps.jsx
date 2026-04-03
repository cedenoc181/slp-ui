import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TEAM_METADATA, getTeamById } from '../../../data/constants/apiConstants';
import predictionsService from '../../../data/services/predictionsService';
import playerStatsService from '../../../data/services/playerStatsServices';
import api from '../../../data/services/apiService';
import PredictionsNav from './PredictionsNav';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/pitcher-props.css';
import '../../../styles/stats-page-styling/scout-ai.css';
import analysisIcon from '../../../assets/icons/analysis.png';

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


// ─── Mock prop generator ──────────────────────────────────────────────────────

const BOOK_NAMES      = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars'];
const BOOK_OFFSETS    = [-3, 0, 4, -2];
const EXCHANGE_NAMES  = ['BetOpenly', 'Kalshi', 'Novig', 'Polymarket', 'ProphetX'];
const DFS_NAMES       = ['PrizePicks', 'Underdog', 'DraftKings Pick6', 'Betr Picks'];

const BOOK_META = {
  DraftKings:      { abbr: 'DK',  color: '#62a800', bg: 'rgba(98,168,0,0.18)',    logo: 'https://logo.clearbit.com/draftkings.com' },
  FanDuel:         { abbr: 'FD',  color: '#1493ff', bg: 'rgba(20,147,255,0.18)',  logo: 'https://logo.clearbit.com/fanduel.com' },
  BetMGM:          { abbr: 'MGM', color: '#c8a84b', bg: 'rgba(200,168,75,0.18)',  logo: 'https://logo.clearbit.com/betmgm.com' },
  Caesars:         { abbr: 'CZR', color: '#0057b8', bg: 'rgba(0,87,184,0.18)',    logo: 'https://logo.clearbit.com/caesarssportsbook.com' },
  BetRivers:       { abbr: 'BR',  color: '#e63946', bg: 'rgba(230,57,70,0.18)',   logo: 'https://logo.clearbit.com/betrivers.com' },
  Fanatics:        { abbr: 'FAN', color: '#e84118', bg: 'rgba(232,65,24,0.18)',   logo: 'https://logo.clearbit.com/fanatics.com' },
  'Hard Rock Bet': { abbr: 'HRB', color: '#ffd700', bg: 'rgba(255,215,0,0.18)',   logo: 'https://logo.clearbit.com/hardrock.com' },
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

// ─── Matchup selector card ────────────────────────────────────────────────────

function MatchupCard({ matchup, isActive, onClick }) {
  return (
    <button className={`pp-matchup-card ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="pp-matchup-teams">
        <div className="pp-matchup-team">
          {matchup.awayMlbId
            ? <img src={teamLogoUrl(matchup.awayMlbId)} alt={matchup.awayAbbr} className="pp-matchup-logo" />
            : <span className="pp-matchup-logo-fallback">{matchup.awayAbbr.slice(0, 3)}</span>
          }
          <span className="pp-matchup-abbr">{matchup.awayAbbr}</span>
        </div>
        <span className="pp-matchup-vs">vs</span>
        <div className="pp-matchup-team">
          {matchup.homeMlbId
            ? <img src={teamLogoUrl(matchup.homeMlbId)} alt={matchup.homeAbbr} className="pp-matchup-logo" />
            : <span className="pp-matchup-logo-fallback">{matchup.homeAbbr.slice(0, 3)}</span>
          }
          <span className="pp-matchup-abbr">{matchup.homeAbbr}</span>
        </div>
      </div>
    </button>
  );
}

// Stable numeric seed from a pitcher name (used when no MLB ID is available)
function nameHash(str) {
  return String(str).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

function getMockPitcherProps(pitcher) {
  const s = (pitcher.id != null ? pitcher.id : nameHash(pitcher.name)) % 97;

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

// ─── Real prediction → prop shape ────────────────────────────────────────────
// Maps pitcher prediction fields (blended values) + sportsbook_props/dfs_props
// onto the internal prop shape consumed by all UI components.

// Maps API stat_type → component key + display metadata
const STAT_MAP = {
  strikeouts:   { key: 'strikeouts', label: 'Strikeouts',   icon: '🔥', blendedKey: 'blended_strikeouts',   stdKey: 'strikeouts_std_dev'   },
  hits_allowed: { key: 'hits',       label: 'Hits Allowed', icon: '🎯', blendedKey: 'blended_hits_allowed',  stdKey: 'hits_allowed_std_dev'  },
  outs:         { key: 'outs',       label: 'Pitcher Outs', icon: '⚾', blendedKey: 'blended_outs',          stdKey: 'outs_std_dev'          },
  earned_runs:  { key: 'earnedRuns', label: 'Earned Runs',  icon: '📊', blendedKey: 'blended_earned_runs',   stdKey: 'earned_runs_std_dev'   },
};

function buildPitcherProps(pitcher) {
  const pred = pitcher.prediction;
  if (!pred) return getMockPitcherProps(pitcher);

  const sbProps  = Array.isArray(pred.sportsbook_props) ? pred.sportsbook_props : [];
  const dfsProps = Array.isArray(pred.dfs_props)        ? pred.dfs_props        : [];
  const scoutAI  = pred.scout_ai ?? null;

  // Confidence: how far the blended projection is from the sportsbook line in std-dev units
  const confidence = (blended, line, std) => {
    if (!std) return 55;
    const dist = Math.abs(blended - line);
    return Math.min(78, Math.max(52, Math.round(52 + (dist / std) * 30)));
  };

  const props = Object.entries(STAT_MAP).map(([apiKey, cfg]) => {
    const blended = pred[cfg.blendedKey] ?? 0;
    const std     = pred[cfg.stdKey]     ?? 1;

    // Group sportsbook entries for this stat by platform
    const statSB  = sbProps.filter(p => p.stat_type === apiKey);
    const bookMap = {};
    for (const sp of statSB) {
      const title = sp.platform_title;
      if (!bookMap[title]) bookMap[title] = { name: title, line: sp.line, over: null, under: null };
      if (sp.over_price  != null) bookMap[title].over  = Math.round(sp.over_price);
      if (sp.under_price != null) bookMap[title].under = Math.round(sp.under_price);
    }
    const books = Object.values(bookMap);

    // Use first sportsbook line; fall back to rounded blended value
    const sbLine = statSB.length > 0 ? statSB[0].line : null;
    const line   = sbLine ?? Math.round(blended * 10) / 10;

    // Scout AI pick for this stat (read early to inform odds filtering)
    const scoutProp     = scoutAI?.props?.[apiKey] ?? null;
    const scoutPickParts = scoutProp?.pick ? scoutProp.pick.split(' ') : null;
    const scoutPickSide  = scoutPickParts?.[0] ?? null;
    const scoutPickLine  = scoutPickParts?.[1] ? parseFloat(scoutPickParts[1]) : null;

    // Side: Scout AI pick side if available, else blended vs line
    const side    = scoutPickSide ?? (blended >= line ? 'Over' : 'Under');
    const sideKey = side === 'Over' ? 'over' : 'under';

    // Best odds: only from books whose line exactly matches the pick's line.
    // This prevents showing a favourable price from a different (higher/lower) line
    // than the one the algorithm is actually recommending.
    const pickLine = scoutPickLine ?? line;
    const bestOdds = books
      .filter(b => b.line === pickLine)
      .reduce((best, b) => {
        const v = b[sideKey];
        return v != null && (best == null || v > best) ? v : best;
      }, null) ?? -115;

    const modelProb = confidence(blended, line, std);

    // DFS props for this stat
    const statDFS = dfsProps.filter(p => p.stat_type === apiKey);
    const dfsMap  = {};
    for (const dp of statDFS) {
      if (!dfsMap[dp.platform_title]) dfsMap[dp.platform_title] = { name: dp.platform_title, line: dp.line };
    }
    const dfs = Object.values(dfsMap);

    return {
      key:         cfg.key,
      label:       cfg.label,
      icon:        cfg.icon,
      line,
      blended:     Math.round(blended * 100) / 100,
      side,
      modelProb,
      bestOdds,
      ev:          calcEV(modelProb, bestOdds),
      scoutPick:   scoutProp?.pick        ?? null,
      scoutConf:   scoutProp?.confidence  ?? null,
      scoutReason: scoutProp?.reasoning   ?? null,
      books,
      exchanges:   [],
      dfs,
    };
  });

  const bestProp = props.reduce((best, p) =>
    parseFloat(p.ev) > parseFloat(best.ev) ? p : best
  , props[0]);

  return { props, bestProp };
}

// ─── Prediction gate: 2 h before earliest first pitch ────────────────────────

function parseGameTimes(pitchers) {
  return pitchers
    .map(p => {
      const str = p.game?.game_time_et;
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
    })
    .filter(Boolean);
}

function getUnlockDate(pitchers) {
  const times = parseGameTimes(pitchers);
  if (!times.length) return null;
  const earliest = new Date(Math.min(...times.map(t => t.getTime())));
  earliest.setHours(earliest.getHours() - 2, earliest.getMinutes(), 0, 0);
  // 4:00 PM ET is the absolute latest the user has to wait
  const cap = new Date();
  cap.setHours(16, 0, 0, 0);
  return earliest.getTime() <= cap.getTime() ? earliest : cap;
}

function getPredictionReadyTime(pitchers) {
  const unlock = getUnlockDate(pitchers);
  if (!unlock) return null;
  let h = unlock.getHours();
  const min = String(unlock.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${period} ET`;
}

function arePredictionsUnlocked(pitchers) {
  const unlock = getUnlockDate(pitchers);
  if (!unlock) return false;
  return new Date() >= unlock;
}

// ─── Composite score: 40% EV, 35% model probability, 25% Scout AI confidence ──
function compositeScore(prop) {
  const ev      = Math.min(Math.max(parseFloat(prop.ev), -20), 40);
  const evNorm  = (ev + 20) / 60 * 100;        // −20 → 0,  +40 → 100
  const probNorm = prop.modelProb;              // already 0–100
  const confNorm = (prop.scoutConf ?? 0) * 20; // 0–5 → 0–100
  return evNorm * 0.40 + probNorm * 0.35 + confNorm * 0.25;
}

function getTopPicks(pitchers, unlocked) {
  const candidates = [];
  for (const pitcher of pitchers.filter(p => unlocked && !!p.prediction && !!p.prediction.scout_ai)) {
    const { props } = buildPitcherProps(pitcher);
    for (const prop of props) {
      candidates.push({ pitcher, bestProp: prop, score: compositeScore(prop) });
    }
  }
  return candidates
    .sort((a, b) => b.score - a.score)
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
      src={headshotUrl(pitcher.mlbId)}
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

function PitcherCard({ pitcher, isSelected, onClick, predictionsUnlocked }) {
  const hasPred = predictionsUnlocked && !!pitcher.prediction && !!pitcher.prediction.scout_ai;
  const { bestProp } = hasPred ? buildPitcherProps(pitcher) : { bestProp: null };
  return (
    <button
      className={`pp-top-card${isSelected ? ' selected' : ''}${!hasPred ? ' pp-top-card--pending' : ''}`}
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

        {hasPred ? (
          <>
            <div className="pp-top-card-prop">
              <span className="pp-top-card-prop-label">{bestProp.label}</span>
              <span className="pp-top-card-prop-line">
                {bestProp.side} {bestProp.line} · {fmtOdds(bestProp.bestOdds)}
              </span>
            </div>
            <EVBadge ev={bestProp.ev} />
          </>
        ) : (
          <span className="pp-pending-chip">Predictions Pending</span>
        )}
      </div>
    </button>
  );
}

// ─── No-prediction fallback body ─────────────────────────────────────────────

function NoPredictionBody({ pitcher, predictionTime }) {
  const dfsList = (pitcher.game?.dfs_props ?? [])
    .filter(d => d.player_id === pitcher.id);

  return (
    <div className="pp-pending-body">
      <div className="pp-pending-banner">
        <span className="pp-pending-banner-icon">⏳</span>
        <div>
          <div className="pp-pending-banner-title">
            {predictionTime
              ? `Predictions available by ${predictionTime}`
              : 'Predictions Coming Soon'}
          </div>
          <div className="pp-pending-banner-sub">
            Our model and Scout AI analysis for this start will be ready approximately 2 hours before first pitch.
            {predictionTime ? ` Come back at ${predictionTime} for full game predictions and analysis.` : ' Check back closer to game time.'}
          </div>
        </div>
      </div>

      {dfsList.length > 0 && (
        <div className="pp-pending-dfs">
          <div className="pp-pending-dfs-label">Available DFS Lines</div>
          <div className="pp-pending-dfs-table">
            <div className="pp-pending-dfs-head">
              <span>Platform</span>
              <span>Prop</span>
              <span>Line</span>
            </div>
            {dfsList.map((d, i) => (
              <div key={i} className="pp-pending-dfs-row">
                <span className="pp-pending-dfs-platform">{d.platform_title}</span>
                <span className="pp-pending-dfs-stat">{d.stat_type.replace(/_/g, ' ')}</span>
                <span className="pp-pending-dfs-line">{d.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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

      {(() => {
        const parts  = prop.scoutPick ? prop.scoutPick.split(' ') : null;
        const pSide  = parts ? parts[0] : prop.side;
        const pLine  = parts ? parts[1] : prop.line;
        const label  = parts ? 'Scout Pick' : 'Model Pick';
        return (
          <div className="pp-prop-line">
            <span className="pp-prop-line-label">{label}</span>
            <div className="pp-prop-line-pick">
              <span className="pp-prop-side">{pSide}</span>
              <span className="pp-prop-number">{pLine}</span>
            </div>
          </div>
        );
      })()}

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
  if (!prop.books.length) {
    return <div className="pp-odds-empty">No sportsbook lines available yet.</div>;
  }
  const isOver    = prop.side === 'Over';
  const bestOvIdx = prop.books.reduce((bi, b, i, a) =>
    (b.over  ?? -Infinity) > (a[bi].over  ?? -Infinity) ? i : bi, 0);
  const bestUnIdx = prop.books.reduce((bi, b, i, a) =>
    (b.under ?? -Infinity) > (a[bi].under ?? -Infinity) ? i : bi, 0);
  return (
    <div className="pp-odds-table pp-odds-table--4col">
      <div className="pp-odds-table-head">
        <div>Platform</div>
        <div>Line</div>
        <div className={isOver ? 'pp-odds-col-active' : ''}>Over</div>
        <div className={!isOver ? 'pp-odds-col-active' : ''}>Under</div>
      </div>
      {prop.books.map((b, i) => (
        <div key={b.name} className="pp-odds-row">
          <div className="pp-odds-platform">
            <PlatformLogo name={b.name} metaMap={BOOK_META} />
            <span>{b.name}</span>
          </div>
          <div className="pp-odds-val pp-odds-line">{b.line ?? '—'}</div>
          <div className={`pp-odds-val${i === bestOvIdx && b.over != null ? ' best' : ''}${isOver ? ' side-pick' : ''}`}>
            {fmtOdds(b.over)}
          </div>
          <div className={`pp-odds-val${i === bestUnIdx && b.under != null ? ' best' : ''}${!isOver ? ' side-pick' : ''}`}>
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

// ─── Pitcher Scout AI modal ───────────────────────────────────────────────────

const PITCHER_PROP_META = {
  strikeouts:   { label: 'Strikeouts',   icon: '🔥' },
  earned_runs:  { label: 'Earned Runs',  icon: '📊' },
  hits_allowed: { label: 'Hits Allowed', icon: '🎯' },
  outs:         { label: 'Pitcher Outs', icon: '⚾' },
};

function PitcherConfidenceDots({ value }) {
  return (
    <span className="scout-confidence" aria-label={`Confidence ${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`scout-conf-dot${i < value ? ' filled' : ''}`} />
      ))}
    </span>
  );
}

function PitcherScoutModal({ scoutAi, pitcherName, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="scout-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Scout AI Pitcher Analysis">
      <div className="scout-modal" onClick={e => e.stopPropagation()}>

        <div className="scout-modal__header">
          <div className="scout-modal__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14Z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14Z"/>
            </svg>
            <span>Scout AI</span>
            <span className="scout-modal__beta">BETA</span>
          </div>
          <button className="scout-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="scout-modal__body">
          {scoutAi.summary && (
            <p className="scout-section-body pp-scout-summary">{scoutAi.summary}</p>
          )}

          {scoutAi.props && Object.entries(scoutAi.props).map(([key, data]) => {
            const meta = PITCHER_PROP_META[key] ?? { label: key, icon: '📌' };
            return (
              <div key={key} className="scout-section">
                <h4 className="scout-section-title">
                  <span className="scout-section-icon">{meta.icon}</span>
                  {meta.label}
                  <span className="pp-scout-prop-pick">{data.pick}</span>
                  <PitcherConfidenceDots value={data.confidence ?? 0} />
                </h4>
                <p className="scout-section-body">{data.reasoning}</p>
                {data.recommended_book && (
                  <div className="pp-scout-book-rec">
                    <span className="pp-scout-book-rec__label">Best at</span>
                    <span className="pp-scout-book-rec__value">{data.recommended_book}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="scout-modal__footer">
          <p className="scout-modal__disclaimer">
            ⚠ For entertainment purposes only. Scout AI does not guarantee outcomes. Please gamble responsibly.
          </p>
        </div>

      </div>
    </div>,
    document.body
  );
}

// ─── Pitcher modal ────────────────────────────────────────────────────────────

function PitcherModal({ pitcher, onClose, predictionTime, predictionsUnlocked }) {
  const { props } = buildPitcherProps(pitcher);
  const [hsErr, setHsErr]               = useState(false);
  const [selectedProp, setSelectedProp] = useState(null);
  const [oddsView, setOddsView]         = useState('books');
  const [showScoutModal, setShowScoutModal] = useState(false);
  const scoutAi = pitcher.prediction?.scout_ai ?? null;
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

  const goToPlayer  = () => { const slug = pitcher.nameSlug ?? pitcher.mlbId; if (!slug) return; onClose(); navigate(`/player/${slug}`); window.scrollTo(0, 0); };
  const goToMatchup = () => {
    onClose();
    const g = pitcher.game;
    const isComplete = g?.away_team_id && g?.home_team_id && g?.game_pk;
    navigate(
      `/mlb-schedule/${pitcher.gameId ?? pitcher.gamePk}`,
      { state: isComplete ? { game: g } : null }
    );
    window.scrollTo(0, 0);
  };
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

  const portal = createPortal(
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
                    src={headshotUrl(pitcher.mlbId)}
                    alt={pitcher.name}
                    className="pp-prop-strip-headshot"
                    onError={() => setHsErr(true)}
                  />
                )}
                <div className="pp-prop-strip-info">
                  <span className="pp-prop-strip-name">{pitcher.name}</span>
                  <span className="pp-prop-strip-meta">{pitcher.teamAbbr} · vs {pitcher.opponent}</span>
                </div>
              </div>

              <div className={`pp-prop-strip-chip accent-${accent}`}>
                <span>{selectedProp.icon}</span>
                <span>{selectedProp.label}</span>
                <span className="pp-prop-strip-chip-line">
                  {selectedProp.scoutPick ?? `${selectedProp.side} ${selectedProp.line}`}
                </span>
              </div>
            </div>

            {/* ── Odds drawer ── */}
            <div className="pp-odds-panel">
              <div className="pp-odds-toggle">
                <button className={oddsView === 'books'    ? 'active' : ''} onClick={() => setOddsView('books')}>Sportsbooks</button>
                {selectedProp.exchanges.length > 0 && (
                  <button className={oddsView === 'exchange' ? 'active' : ''} onClick={() => setOddsView('exchange')}>Pred. Exchange</button>
                )}
                {selectedProp.dfs.length > 0 && (
                  <button className={oddsView === 'dfs'      ? 'active' : ''} onClick={() => setOddsView('dfs')}>DFS</button>
                )}
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
              {/* Col 1 — identity */}
              <div className="pp-modal-identity">
                {hsErr ? (
                  <div className="pp-modal-hs-fallback">
                    {pitcher.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                ) : (
                  <img
                    src={headshotUrl(pitcher.mlbId)}
                    alt={pitcher.name}
                    className="pp-modal-headshot"
                    onError={() => setHsErr(true)}
                  />
                )}
                <div className="pp-modal-info">
                  <button className="pp-modal-name pp-modal-link" onClick={goToPlayer}>
                    <span className="pp-name-full">{pitcher.name}</span>
                    <span className="pp-name-short">{pitcher.name.split(' ')[0][0]}. {pitcher.name.split(' ').slice(1).join(' ')}</span>
                  </button>
                  <button className="pp-modal-meta pp-modal-link" onClick={goToMatchup}>
                    {pitcher.teamAbbr} · vs {pitcher.opponent}
                  </button>
                </div>
              </div>

              {/* Col 2 — scout button + team logo + close */}
              <div className="pp-modal-col-right">
                {scoutAi && (
                  <button className="pp-modal-scout-btn" onClick={() => setShowScoutModal(true)} data-tooltip="Scouting Report">
                    <img src={analysisIcon} alt="" className="pp-modal-scout-icon" aria-hidden="true" />
                    <span className="pp-scout-text">Scouting<span className="pp-scout-report"> Report</span></span>
                  </button>
                )}
                <button className="pp-modal-team-logo-btn" onClick={goToTeam} aria-label={`${pitcher.teamAbbr} team analytics`}>
                  <img src={teamLogoUrl(pitcher.teamMlbId)} alt={pitcher.teamAbbr} className="pp-modal-team-logo" />
                </button>
                <button className="pp-modal-close" onClick={onClose} aria-label="Close">✕</button>
              </div>
            </div>

            <div className="pp-modal-body">
              {predictionsUnlocked && pitcher.prediction && pitcher.prediction.scout_ai ? (
                <div className="pp-props-grid">
                  {props.map(prop => (
                    <PropPanel key={prop.key} prop={prop} onClick={() => handlePropClick(prop)} />
                  ))}
                </div>
              ) : (
                <NoPredictionBody pitcher={pitcher} predictionTime={predictionTime} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  // Scout AI modal rendered in its own portal above the pitcher modal
  return (
    <>
      {portal}
      {showScoutModal && scoutAi && (
        <PitcherScoutModal
          scoutAi={scoutAi}
          pitcherName={pitcher.name}
          onClose={() => setShowScoutModal(false)}
        />
      )}
    </>
  );
}

// Stable key for a pitcher (real pitchers from the API may not have an MLB ID yet)
function pitcherKey(p) {
  return p.id != null ? p.id : `${p.gamePk}-${p.name}`;
}

// ─── Skeleton & comeback banner ───────────────────────────────────────────────

function parseTimeStrToMinutes(timeStr) {
  if (!timeStr) return Infinity;
  const ampm = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    const p = ampm[3].toUpperCase();
    if (p === 'PM' && h !== 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const h24 = timeStr.match(/^(\d+):(\d+)/);
  if (h24) return parseInt(h24[1]) * 60 + parseInt(h24[2]);
  return Infinity;
}

function minutesToDisplay(totalMins) {
  if (!isFinite(totalMins)) return null;
  totalMins = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period} ET`;
}

function PitcherSkeletonCard() {
  return (
    <div className="pp-top-card pp-skeleton-card" aria-hidden="true">
      <div className="pp-top-card-header">
        <div className="pp-skeleton pp-skeleton-headshot" />
        <div className="pp-skeleton pp-skeleton-logo" />
      </div>
      <div className="pp-top-card-info">
        <div className="pp-skeleton pp-skeleton-name" />
        <div className="pp-skeleton pp-skeleton-meta" />
        <div className="pp-skeleton pp-skeleton-prop" />
        <div className="pp-skeleton pp-skeleton-badge" />
      </div>
    </div>
  );
}

function LoadingBanner() {
  return (
    <div className="pp-loading-banner">
      <div className="pp-loading-spinner" />
      <div className="pp-loading-text">Loading pitcher props predictions</div>
    </div>
  );
}

function ComebackBanner({ gameSlate }) {
  const earliest = [...(gameSlate || [])]
    .map(g => g.game_time)
    .filter(Boolean)
    .sort((a, b) => parseTimeStrToMinutes(a) - parseTimeStrToMinutes(b))[0];

  const checkBackTime = earliest
    ? minutesToDisplay(parseTimeStrToMinutes(earliest) - 60)
    : null;

  return (
    <div className="pp-comeback-banner">
      <div className="pp-comeback-icon">⏰</div>
      <div className="pp-comeback-text">
        <div className="pp-comeback-title">Pitcher props are on their way</div>
        <div className="pp-comeback-sub">
          {checkBackTime
            ? <>Props are typically available 1 hour before first pitch. Check back around <strong>{checkBackTime}</strong>.</>
            : <>Props are typically available 1 hour before first pitch. Check back closer to game time.</>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PitcherProps() {
  const navigate = useNavigate();
  const [pitchers,    setPitchers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [gameSlate,   setGameSlate]   = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [activeGamePk, setActiveGamePk] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Bust cache so scout_ai prompt changes are always reflected
    api.invalidate('/predictions/pitchers/today');
    api.invalidate('/predictions/today');

    const controller = new AbortController();

    // Fire both requests immediately in parallel — neither depends on the other
    const todayPromise        = predictionsService.getToday({ signal: controller.signal, timeout: 120000 });
    const pitcherPredsPromise = predictionsService.getPitchersToday({ signal: controller.signal, timeout: 120000 }).catch(() => []);

    Promise.all([todayPromise, pitcherPredsPromise])
      .then(([rows, pitcherPreds]) => {
        const isFinal = r => {
          const s = (r.status || '').toLowerCase();
          return s === 'final' || s === 'game over' || s === 'completed';
        };
        const today = Array.isArray(rows)
          ? rows.filter(r => r.season_type !== 'spring' && r.season_type !== 'S' && !isFinal(r))
          : [];
        if (today.length === 0) return;
        setGameSlate(today);

        // Build pitcher entries
        const realPitchers = [];
        for (const r of today) {
          const awayAbbr  = getTeamById(r.away_team_id)?.id  || r.away_team_name;
          const homeAbbr  = getTeamById(r.home_team_id)?.id  || r.home_team_name;
          const awayMlbId = getTeamById(r.away_team_id)?.mlbId ?? null;
          const homeMlbId = getTeamById(r.home_team_id)?.mlbId ?? null;
          if (r.away_sp_name) {
            realPitchers.push({
              id:        r.away_sp_id ?? null,
              mlbId:     null,
              nameSlug:  null,
              name:      r.away_sp_name,
              teamAbbr:  awayAbbr,
              teamMlbId: awayMlbId,
              opponent:  homeAbbr,
              gameId:    r.id ?? r.game_pk,
              gamePk:    r.game_pk,
              game:      r,
            });
          }
          if (r.home_sp_name) {
            realPitchers.push({
              id:        r.home_sp_id ?? null,
              mlbId:     null,
              nameSlug:  null,
              name:      r.home_sp_name,
              teamAbbr:  homeAbbr,
              teamMlbId: homeMlbId,
              opponent:  awayAbbr,
              gameId:    r.id ?? r.game_pk,
              gamePk:    r.game_pk,
              game:      r,
            });
          }
        }
        if (realPitchers.length === 0) return;

        // Attach predictions
        const predMap = {};
        for (const game of (Array.isArray(pitcherPreds) ? pitcherPreds : [])) {
          if (game.home_pitcher?.player_id) predMap[game.home_pitcher.player_id] = game.home_pitcher;
          if (game.away_pitcher?.player_id) predMap[game.away_pitcher.player_id] = game.away_pitcher;
        }
        realPitchers.forEach(p => {
          if (p.id && predMap[p.id]) p.prediction = predMap[p.id];
        });

        // Show pitchers immediately — don't wait for headshot lookups
        setPitchers(realPitchers);

        // Background: resolve MLB IDs for headshots and update each card as they arrive
        realPitchers.forEach((p, i) => {
          if (!p.id) return;
          playerStatsService.lookupPlayer({ playerId: p.id })
            .then(result => {
              if (result?.mlb_id) {
                setPitchers(prev => prev.map((pp, j) =>
                  j === i ? { ...pp, mlbId: result.mlb_id, nameSlug: result.name_slug ?? null } : pp
                ));
              }
            })
            .catch(() => {});
        });
      })
      .catch(err => {
        if (err.name === 'AbortError' || err.message === 'Request timeout - please try again') return;
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const predictionTime       = getPredictionReadyTime(pitchers);
  const predictionsUnlocked  = arePredictionsUnlocked(pitchers);
  const topPicks             = getTopPicks(pitchers, predictionsUnlocked);

  const games = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const p of pitchers) {
      if (!seen.has(p.gamePk)) {
        seen.add(p.gamePk);
        const awayTeam = getTeamById(p.game?.away_team_id);
        const homeTeam = getTeamById(p.game?.home_team_id);
        result.push({
          gamePk:    p.gamePk,
          gameId:    p.gameId,
          awayAbbr:  awayTeam?.id    || p.game?.away_team_name || '???',
          awayMlbId: awayTeam?.mlbId ?? null,
          homeAbbr:  homeTeam?.id    || p.game?.home_team_name || '???',
          homeMlbId: homeTeam?.mlbId ?? null,
        });
      }
    }
    return result;
  }, [pitchers]);

  const visiblePitchers = activeGamePk
    ? pitchers.filter(p => p.gamePk === activeGamePk)
    : pitchers;

  const visibleTopPicks = activeGamePk
    ? topPicks.filter(({ pitcher }) => pitcher.gamePk === activeGamePk)
    : topPicks;

  const activeMatchup = activeGamePk ? games.find(m => m.gamePk === activeGamePk) : null;

  const handleSelect = useCallback((key) => {
    setSelectedKey(prev => prev === key ? null : key);
  }, []);

  const handleClose = useCallback(() => setSelectedKey(null), []);

  const selectedPitcher = selectedKey
    ? pitchers.find(p => pitcherKey(p) === selectedKey) ?? null
    : null;

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <h1>Pitcher Props</h1>
          <PredictionsNav />
        </div>
      </div>

      <div className="predictions-content">

        {loading ? (
          <>
            <LoadingBanner />
            <div className="pp-divider">
              <span className="pp-divider-line" />
              <span className="pp-divider-label">Starting Pitchers Today</span>
              <span className="pp-divider-line" />
            </div>
            <div className="pp-pitcher-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <PitcherSkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : pitchers.length === 0 ? (
          <>
            <ComebackBanner gameSlate={gameSlate} />
            <div className="pp-divider">
              <span className="pp-divider-line" />
              <span className="pp-divider-label">Starting Pitchers Today</span>
              <span className="pp-divider-line" />
            </div>
            <div className="pp-pitcher-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <PitcherSkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* ── Matchup filter ───────────────────────────────────── */}
            {games.length > 1 && (
              <div className="pp-matchup-bar">
                <div className="pp-matchup-scroll">
                  <button
                    className={`pp-matchup-all ${activeGamePk === null ? 'active' : ''}`}
                    onClick={() => setActiveGamePk(null)}
                  >
                    All
                  </button>
                  {games.map(m => (
                    <MatchupCard
                      key={m.gamePk}
                      matchup={m}
                      isActive={activeGamePk === m.gamePk}
                      onClick={() => setActiveGamePk(m.gamePk)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Active matchup label ─────────────────────────────── */}
            {activeMatchup && (
              <div className="pp-matchup-label">
                {activeMatchup.awayMlbId && <img src={teamLogoUrl(activeMatchup.awayMlbId)} alt={activeMatchup.awayAbbr} className="pp-matchup-label-logo" />}
                <span>{activeMatchup.awayAbbr}</span>
                <span className="pp-matchup-label-vs">vs</span>
                {activeMatchup.homeMlbId && <img src={teamLogoUrl(activeMatchup.homeMlbId)} alt={activeMatchup.homeAbbr} className="pp-matchup-label-logo" />}
                <span>{activeMatchup.homeAbbr}</span>
                <button
                  className="pp-matchup-label-link"
                  onClick={() => { navigate(`/mlb-schedule/${activeMatchup.gameId}`); window.scrollTo(0, 0); }}
                >
                  Matchup Analysis →
                </button>
              </div>
            )}

            {/* ── Top picks ───────────────────────────────────────── */}
            {visibleTopPicks.length > 0 ? (
              <>
                <div className="pp-section-label">Top Picks Today</div>
                <div className="pp-top-grid">
                  {visibleTopPicks.map(({ pitcher, bestProp }) => (
                    <TopPitcherCard
                      key={pitcherKey(pitcher)}
                      pitcher={pitcher}
                      bestProp={bestProp}
                      onClick={() => handleSelect(pitcherKey(pitcher))}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="pp-pending-banner pp-pending-banner--page">
                <span className="pp-pending-banner-icon">⏳</span>
                <div>
                  <div className="pp-pending-banner-title">
                    {predictionTime ? `Predictions available by ${predictionTime}` : 'Predictions Coming Soon'}
                  </div>
                  <div className="pp-pending-banner-sub">
                    Our model and Scout AI analysis will be ready approximately 2 hours before first pitch.
                    {predictionTime ? ` Come back at ${predictionTime} for full game predictions and analysis.` : ' Check back closer to game time.'}
                  </div>
                </div>
              </div>
            )}

            {/* ── Divider ─────────────────────────────────────────── */}
            <div className="pp-divider">
              <span className="pp-divider-line" />
              <span className="pp-divider-label">Starting Pitchers Today</span>
              <span className="pp-divider-line" />
            </div>
            <div className="pp-pitcher-grid">
              {visiblePitchers.map(pitcher => (
                <PitcherCard
                  key={pitcherKey(pitcher)}
                  pitcher={pitcher}
                  isSelected={selectedKey === pitcherKey(pitcher)}
                  onClick={() => handleSelect(pitcherKey(pitcher))}
                  predictionsUnlocked={predictionsUnlocked}
                />
              ))}
            </div>
          </>
        )}

        <p className="gp-disclaimer">
          * Prediction data is model-generated and for informational purposes only.
          Please gamble responsibly.
        </p>
      </div>

      {selectedPitcher && (
        <PitcherModal
          pitcher={selectedPitcher}
          onClose={handleClose}
          predictionTime={predictionTime}
          predictionsUnlocked={predictionsUnlocked}
        />
      )}
    </div>
  );
}
