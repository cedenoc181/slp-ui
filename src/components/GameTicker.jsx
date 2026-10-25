import { useEffect, useState } from 'react';
import scheduleService from '../data/services/scheduleService';
import predictionsService from '../data/services/predictionsService';
import { getTeamById } from '../data/constants/apiConstants';
import '../styles/home-page-styling/game-ticker.css';

// Public, logged-out-safe ticker: pre-game shows market odds (moneyline + total —
// public sportsbook data, same as the score), live/final shows the current score.
// Never read `prediction` off the predictions-today feed here — that's the
// model's actual recommended side, which stays behind the Predictions Preview
// lock, not the ticker.
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

function GameTicker() {
  const [games, setGames] = useState(null); // null = loading, [] = none today

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      scheduleService.getTodayGames(),
      predictionsService.getToday(),
    ]).then(([scheduleRes, oddsRes]) => {
      if (!alive) return;
      const schedule = scheduleRes.status === 'fulfilled' && Array.isArray(scheduleRes.value) ? scheduleRes.value : [];
      const oddsByGamePk = {};
      if (oddsRes.status === 'fulfilled' && Array.isArray(oddsRes.value)) {
        oddsRes.value.forEach(g => { if (g?.game_pk != null) oddsByGamePk[g.game_pk] = g.odds || null; });
      }

      const merged = schedule.map(g => {
        const state = gameState(g.status);
        const odds = oddsByGamePk[g.game_pk];
        return {
          id: g.id ?? g.game_pk,
          away: abbr(g.away_team_id),
          home: abbr(g.home_team_id),
          state,
          score: `${g.away_runs_score ?? 0}–${g.home_runs_score ?? 0}`,
          time: g.game_time || 'TBD',
          moneylineAway: fmtOdds(odds?.moneyline_away),
          moneylineHome: fmtOdds(odds?.moneyline_home),
          total: odds?.total,
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
