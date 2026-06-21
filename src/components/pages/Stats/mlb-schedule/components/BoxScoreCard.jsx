export default function BoxScoreCard({ game, boxscore, awayAbbr, homeAbbr, awayWon, homeWon }) {
  // ── Inning grid (when boxscore data is available) ────────────────────────
  if (boxscore?.innings?.length) {
    const innings = boxscore.innings;

    return (
      <div className="box-score-card">
        <div className="box-inning-scroll">
          <table className="box-score-table box-inning-table">
            <thead>
              <tr>
                <th className="box-th-team"></th>
                {innings.map(ing => (
                  <th key={ing.inning} className="box-th-inning">{ing.inning}</th>
                ))}
                <th className="box-th-sep"></th>
                <th className="box-th-total">R</th>
                <th className="box-th-total">H</th>
                <th className="box-th-total">E</th>
              </tr>
            </thead>
            <tbody>
              <tr className={awayWon ? 'box-row-winner' : ''}>
                <td className="box-team-name">{awayAbbr}</td>
                {innings.map(ing => (
                  <td key={ing.inning} className="box-inning-cell">
                    {ing.away_runs > 0
                      ? <span className="box-inning-score">{ing.away_runs}</span>
                      : <span className="box-inning-zero">0</span>}
                  </td>
                ))}
                <td className="box-th-sep"></td>
                <td className="box-runs">{boxscore.away_runs ?? game.away_runs_score ?? '—'}</td>
                <td className="box-total-cell">{boxscore.away_hits ?? game.away_hits ?? '—'}</td>
                <td className={`box-total-cell${(boxscore.away_errors ?? game.away_errors) > 0 ? ' box-error' : ''}`}>
                  {boxscore.away_errors ?? game.away_errors ?? '—'}
                </td>
              </tr>
              <tr className={homeWon ? 'box-row-winner' : ''}>
                <td className="box-team-name">{homeAbbr}</td>
                {innings.map(ing => (
                  <td key={ing.inning} className="box-inning-cell">
                    {ing.home_runs > 0
                      ? <span className="box-inning-score">{ing.home_runs}</span>
                      : <span className="box-inning-zero">0</span>}
                  </td>
                ))}
                <td className="box-th-sep"></td>
                <td className="box-runs">{boxscore.home_runs ?? game.home_runs_score ?? '—'}</td>
                <td className="box-total-cell">{boxscore.home_hits ?? game.home_hits ?? '—'}</td>
                <td className={`box-total-cell${(boxscore.home_errors ?? game.home_errors) > 0 ? ' box-error' : ''}`}>
                  {boxscore.home_errors ?? game.home_errors ?? '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Fallback: simple R / H / E summary ───────────────────────────────────
  return (
    <div className="box-score-card">
      <table className="box-score-table">
        <thead>
          <tr>
            <th className="box-th-team"></th>
            <th>R</th>
            <th>H</th>
            <th>E</th>
            {game.home_lob != null && <th>LOB</th>}
          </tr>
        </thead>
        <tbody>
          <tr className={awayWon ? 'box-row-winner' : ''}>
            <td className="box-team-name">{awayAbbr}</td>
            <td className="box-runs">{game.away_runs_score ?? '—'}</td>
            <td>{game.away_hits ?? '—'}</td>
            <td className={game.away_errors > 0 ? 'box-error' : ''}>{game.away_errors ?? '—'}</td>
            {game.home_lob != null && <td>{game.away_lob ?? '—'}</td>}
          </tr>
          <tr className={homeWon ? 'box-row-winner' : ''}>
            <td className="box-team-name">{homeAbbr}</td>
            <td className="box-runs">{game.home_runs_score ?? '—'}</td>
            <td>{game.home_hits ?? '—'}</td>
            <td className={game.home_errors > 0 ? 'box-error' : ''}>{game.home_errors ?? '—'}</td>
            {game.home_lob != null && <td>{game.home_lob ?? '—'}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
