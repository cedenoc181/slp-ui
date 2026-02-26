export default function BoxScoreCard({ game, awayAbbr, homeAbbr, awayWon, homeWon }) {
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
