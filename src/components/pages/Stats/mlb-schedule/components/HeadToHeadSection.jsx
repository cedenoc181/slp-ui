function StatRow({ label, away, home, lowerIsBetter }) {
  const awayNum = parseFloat(away);
  const homeNum = parseFloat(home);
  let awayLeading = false;
  let homeLeading = false;
  if (!isNaN(awayNum) && !isNaN(homeNum) && away !== '—' && home !== '—') {
    awayLeading = lowerIsBetter ? awayNum < homeNum : awayNum > homeNum;
    homeLeading = lowerIsBetter ? homeNum < awayNum : homeNum > awayNum;
  }
  return (
    <div className="matchup-stat-row">
      <span className={`stat-value away${awayLeading ? ' stat-leader' : ''}`}>{away ?? '—'}</span>
      <span className="stat-label">{label}</span>
      <span className={`stat-value home${homeLeading ? ' stat-leader' : ''}`}>{home ?? '—'}</span>
    </div>
  );
}

export default function HeadToHeadSection({ game, awayAbbr, homeAbbr, h2h, h2hAwaySum, h2hHomeSum }) {
  return (
    <>
      {/* ── H2H Summary ──────────────────────────────────────────────────── */}
      <div className="detail-card h2h-summary-card">
        <h3 className="card-title">
          Head to Head
          <span className="card-title-sub"> — Last {h2h.summary.games_played} Meetings</span>
        </h3>

        {/* Win record bar */}
        <div className="h2h-record-section">
          <div className="h2h-team-win-block">
            <span className="h2h-team-abbr">{awayAbbr}</span>
            <span className="h2h-win-count">{h2hAwaySum?.wins ?? '—'}</span>
            <span className="h2h-wins-label">Wins</span>
          </div>

          <div className="h2h-bar-wrap">
            <div className="h2h-bar">
              {h2h.summary.games_played > 0 && (
                <>
                  <div className="h2h-bar-away" style={{ width: `${((h2hAwaySum?.wins ?? 0) / h2h.summary.games_played) * 100}%` }} />
                  <div className="h2h-bar-neutral" style={{ flex: 1 }} />
                  <div className="h2h-bar-home"  style={{ width: `${((h2hHomeSum?.wins ?? 0) / h2h.summary.games_played) * 100}%` }} />
                </>
              )}
            </div>
            <span className="h2h-games-label">{h2h.summary.games_played} games</span>
          </div>

          <div className="h2h-team-win-block">
            <span className="h2h-team-abbr">{homeAbbr}</span>
            <span className="h2h-win-count">{h2hHomeSum?.wins ?? '—'}</span>
            <span className="h2h-wins-label">Wins</span>
          </div>
        </div>

        {/* Stat comparisons */}
        <div className="stat-comparison-header">
          <span>{awayAbbr}</span>
          <span></span>
          <span>{homeAbbr}</span>
        </div>
        <StatRow label="Avg R/Game"  away={h2hAwaySum?.avg_runs_per_game?.toFixed(1) ?? '—'} home={h2hHomeSum?.avg_runs_per_game?.toFixed(1) ?? '—'} />
        <StatRow label="Avg H/Game"  away={h2hAwaySum?.avg_hits_per_game?.toFixed(1) ?? '—'} home={h2hHomeSum?.avg_hits_per_game?.toFixed(1) ?? '—'} />
        <StatRow label="Errors"      away={h2hAwaySum?.errors ?? '—'}                         home={h2hHomeSum?.errors ?? '—'}                         lowerIsBetter />
        <StatRow label="LOB"         away={h2hAwaySum?.lob ?? '—'}                            home={h2hHomeSum?.lob ?? '—'}                            lowerIsBetter />
        <StatRow label="Biggest Win" away={h2hAwaySum?.largest_win_margin != null ? `+${h2hAwaySum.largest_win_margin}` : '—'} home={h2hHomeSum?.largest_win_margin != null ? `+${h2hHomeSum.largest_win_margin}` : '—'} />

        {/* Totals footer */}
        <div className="h2h-totals-row">
          <div className="h2h-totals-line">
            <span className="h2h-total-label">Runs</span>
            <span className="h2h-total-val">{h2h.summary.total_runs}</span>
            <span className="h2h-total-sub">({(h2h.summary.total_runs / h2h.summary.games_played).toFixed(1)}/gm)</span>
            <span className="h2h-totals-sep">·</span>
            <span className="h2h-total-label">Hits</span>
            <span className="h2h-total-val">{h2h.summary.total_hits}</span>
            <span className="h2h-total-sub">({(h2h.summary.total_hits / h2h.summary.games_played).toFixed(1)}/gm)</span>
          </div>
          {h2h.summary.avg_run_margin != null && (
            <div className="h2h-totals-line">
              <span className="h2h-totals-sep">·</span>
              <span className="h2h-total-label">Avg Margin</span>
              <span className="h2h-total-val">{h2h.summary.avg_run_margin.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── H2H Game Log ─────────────────────────────────────────────────── */}
      <div className="detail-card h2h-gamelog-card">
        <h3 className="card-title">H2H Game Log</h3>
        <div className="h2h-table-wrapper">
          <table className="h2h-log-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Site</th>
                <th>{awayAbbr}</th>
                <th>{homeAbbr}</th>
                <th>1st Runs</th>
                <th>F5 Runs</th>
                <th>{awayAbbr} SP</th>
                <th>{homeAbbr} SP</th>
              </tr>
            </thead>
            <tbody>
              {h2h.games.map((g, idx) => {
                const awayIsTeamA = h2h.summary.team_a?.team_id === game.away_team_id;
                const tA = awayIsTeamA ? g.team_a : g.team_b;
                const tB = awayIsTeamA ? g.team_b : g.team_a;
                const teamAWon = g.winning_team_id != null
                  ? g.winning_team_id === game.away_team_id
                  : (awayIsTeamA ? g.team_a_won : !g.team_a_won);
                const siteLabel = tA.is_home ? `vs ${tB.team_abbr}` : `@ ${tB.team_abbr}`;
                const dateShort = g.date
                  ? new Date(g.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—';
                return (
                  <tr key={g.game_pk ?? idx}>
                    <td className="h2h-date">{dateShort}</td>
                    <td className="h2h-location">{siteLabel}</td>
                    <td className={`h2h-score${teamAWon  ? ' h2h-score-win' : ' h2h-score-loss'}`}>{tA.runs}</td>
                    <td className={`h2h-score${!teamAWon ? ' h2h-score-win' : ' h2h-score-loss'}`}>{tB.runs}</td>
                    <td className="h2h-1st">
                      {tA['1st_inning_runs'] != null && tB['1st_inning_runs'] != null ? (
                        <span className="h2h-score-wrap">
                          <span>{tA['1st_inning_runs']}–{tB['1st_inning_runs']}</span>
                          {tA['1st_inning_runs'] === tB['1st_inning_runs']
                            ? <span className="h2h-winner-label h2h-winner-tie">(tie)</span>
                            : <span className="h2h-winner-label">{tA['1st_inning_runs'] > tB['1st_inning_runs'] ? `(${awayAbbr})` : `(${homeAbbr})`}</span>
                          }
                        </span>
                      ) : '—'}
                    </td>
                    <td className="h2h-f5">
                      {tA['5_inning_runs'] != null && tB['5_inning_runs'] != null ? (
                        <span className="h2h-score-wrap">
                          <span>{tA['5_inning_runs']}–{tB['5_inning_runs']}</span>
                          {tA['5_inning_runs'] === tB['5_inning_runs']
                            ? <span className="h2h-winner-label h2h-winner-tie">(tie)</span>
                            : <span className="h2h-winner-label">{tA['5_inning_runs'] > tB['5_inning_runs'] ? `(${awayAbbr})` : `(${homeAbbr})`}</span>
                          }
                        </span>
                      ) : '—'}
                    </td>
                    <td className="h2h-sp">{tA.sp_name || '—'}</td>
                    <td className="h2h-sp">{tB.sp_name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
