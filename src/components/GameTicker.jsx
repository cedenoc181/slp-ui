import { useEffect, useState } from 'react';
import scheduleService from '../data/services/scheduleService';
import predictionsService from '../data/services/predictionsService';
import { getTeamById } from '../data/constants/apiConstants';
import '../styles/home-page-styling/game-ticker.css';

// Public, logged-out-safe ticker: pre-game shows market odds (moneyline + total —
// public sportsbook data, same as the score), live/final shows the current score.
// Sources odds from /predictions/today/odds specifically (not /predictions/today):
// that endpoint has no `prediction` field at all and isn't release-gated, so the
// full day's slate shows odds immediately instead of only games within 2h of
// first pitch — and there's no gated field to accidentally leak here either.
function abbr(teamId) {
  return getTeamById(teamId)?.id || '—';
}

function fmtOdds(n) {
  if (n == null || n === '') return null;
  const num = Number(n);
  if (Number.isNaN(num)) return null;
  return num > 0 ? `+${num}` : String(num);
}

function gameState(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('final') || s.includes('completed') || s === 'game over') return 'final';
  if (s.includes('progress') || s.includes('live') || s.includes('inning')) return 'live';
  return 'pre';
}

// Strikeout line for one starter — most-common posted line + best over price
// across sportsbooks at that line. Only used when there's exactly one game
// today (see GameTicker below): with just one tick, there's room for it.
function pitcherKLine(pitcher) {
  if (!pitcher) return null;
  const props = (pitcher.sportsbook_props || []).filter(p => p.stat_type === 'strikeouts');
  if (!props.length) return null;
  const counts = new Map();
  for (const p of props) counts.set(p.line, (counts.get(p.line) || 0) + 1);
  const line = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const overPrice = props
    .filter(p => p.line === line)
    .reduce((best, p) => (p.over_price != null && (best == null || p.over_price > best) ? p.over_price : best), null);
  return { name: pitcher.player_name, line, overPrice: fmtOdds(overPrice) };
}

function GameTicker() {
  const [games, setGames] = useState(null); // null = loading, [] = none today

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      scheduleService.getTodayGames(),
      predictionsService.getTodayOdds(),
      predictionsService.getPitchersTodayOdds(),
    ]).then(([scheduleRes, oddsRes, pitcherOddsRes]) => {
      if (!alive) return;
      const schedule = scheduleRes.status === 'fulfilled' && Array.isArray(scheduleRes.value) ? scheduleRes.value : [];
      const oddsByGamePk = {};
      if (oddsRes.status === 'fulfilled' && Array.isArray(oddsRes.value)) {
        oddsRes.value.forEach(g => { if (g?.game_pk != null) oddsByGamePk[g.game_pk] = g.odds || null; });
      }
      const pitcherOddsByPk = {};
      if (pitcherOddsRes.status === 'fulfilled' && Array.isArray(pitcherOddsRes.value)) {
        pitcherOddsRes.value.forEach(g => { if (g?.game_pk != null) pitcherOddsByPk[g.game_pk] = g; });
      }

      // Pitcher props only add value when there's exactly one game — with more,
      // the ticker stays score/odds-only to avoid overloading a single tick.
      const showPitcherProps = schedule.length === 1;

      const merged = schedule.map(g => {
        const state = gameState(g.status);
        const odds = oddsByGamePk[g.game_pk];
        const pitcherGame = showPitcherProps ? pitcherOddsByPk[g.game_pk] : null;
        return {
          id: g.id ?? g.game_pk,
          away: abbr(g.away_team_id),
          home: abbr(g.home_team_id),
          state,
          score: `${g.away_runs_score ?? 0}–${g.home_runs_score ?? 0}`,
          time: g.game_time || 'TBD',
          moneylineAway: fmtOdds(odds?.away_moneyline_game),
          moneylineHome: fmtOdds(odds?.home_moneyline_game),
          total: odds?.over_under_line_game,
          awayPitcherK: pitcherGame ? pitcherKLine(pitcherGame.away_pitcher) : null,
          homePitcherK: pitcherGame ? pitcherKLine(pitcherGame.home_pitcher) : null,
        };
      });

      setGames(merged);
    });
    return () => { alive = false; };
  }, []);

  if (!games || games.length === 0) return null;

  const renderTick = (g, keyPrefix) => {
    const showOdds = g.state === 'pre' && g.moneylineAway && g.moneylineHome;
    return (
      <div className="gt-tick" key={`${keyPrefix}-${g.id}`}>
        <b>{g.away} @ {g.home}</b>
        <span className={`gt-status ${g.state}`}>
          {g.state === 'final' ? 'FINAL' : g.state === 'live' ? 'LIVE' : g.time}
        </span>
        {showOdds ? (
          <>
            <span className="mono">{g.moneylineAway}/{g.moneylineHome}</span>
            {g.total != null && <span className="mono">O/U {g.total}</span>}
          </>
        ) : (
          <span className="mono">{g.score}</span>
        )}
        {showOdds && g.awayPitcherK && (
          <span className="mono gt-pitcher-k">{g.awayPitcherK.name} O{g.awayPitcherK.line}K {g.awayPitcherK.overPrice}</span>
        )}
        {showOdds && g.homePitcherK && (
          <span className="mono gt-pitcher-k">{g.homePitcherK.name} O{g.homePitcherK.line}K {g.homePitcherK.overPrice}</span>
        )}
      </div>
    );
  };

  return (
    <div className="game-ticker-wrap" aria-hidden="true">
      <div className="game-ticker">
        {games.map(g => renderTick(g, 'a'))}
        {games.map(g => renderTick(g, 'b'))}
      </div>
    </div>
  );
}

export default GameTicker;
