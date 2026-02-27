import { Link } from 'react-router-dom';
import { logoUrl } from '../utils';

function FormDot({ result }) {
  if (result === 'W') return <span className="form-dot win"     aria-label="Win" />;
  if (result === 'L') return <span className="form-dot loss"    aria-label="Loss" />;
  return                     <span className="form-dot unknown" aria-label="Unknown" />;
}

export default function RecentFormCard({
  awayAbbr, homeAbbr,
  awayUrlName, homeUrlName,
  awayGames, homeGames,
  awayForm, homeForm,
  awayWins, awayLosses,
  homeWins, homeLosses,
  awayLast10Summary, homeLast10Summary,
}) {
  return (
    <div className="detail-card">
      <h3 className="card-title">
        Recent Form — Last 10
        {awayLast10Summary?.streak_code && homeLast10Summary?.streak_code && (
          <span className="card-title-sub">
            {' '}· Streak: {awayAbbr} {awayLast10Summary.streak_code} / {homeAbbr} {homeLast10Summary.streak_code}
          </span>
        )}
      </h3>

      <div className="form-scroll-body">
        {/* Win-loss dots */}
        <div className="form-section">
          <div className="form-col">
            <p className="form-team-label">
              {awayUrlName
                ? <Link to={`/team-analytics/${awayUrlName}`} className="form-team-link" onClick={() => window.scrollTo(0,0)}>{awayAbbr}</Link>
                : awayAbbr}
            </p>
            <p className="form-record">{awayWins}-{awayLosses}</p>
            <div className="form-track">
              {awayForm.map((r, i) => <FormDot key={i} result={r} />)}
            </div>
          </div>
          <div className="form-divider" />
          <div className="form-col form-col-right">
            <p className="form-team-label">
              {homeUrlName
                ? <Link to={`/team-analytics/${homeUrlName}`} className="form-team-link" onClick={() => window.scrollTo(0,0)}>{homeAbbr}</Link>
                : homeAbbr}
            </p>
            <p className="form-record">{homeWins}-{homeLosses}</p>
            <div className="form-track">
              {homeForm.map((r, i) => <FormDot key={i} result={r} />)}
            </div>
          </div>
        </div>

        {/* Game-by-game log */}
        {(awayGames.length > 0 || homeGames.length > 0) && (
          <div className="form-game-log">
            {Array.from({ length: Math.max(awayGames.length, homeGames.length) }, (_, i) => {
              const a = awayGames[i];
              const h = homeGames[i];
              return (
                <div key={i} className="form-log-row">
                  {a ? (
                    <Link
                      to={`/mlb-schedule/${a.gameId}`}
                      state={{ game: a.rawGame }}
                      className="form-log-left flog-row-link"
                    >
                      <span className="flog-opp">
                        <span className="flog-at">{a.isHome ? 'vs' : '@'}</span>
                        {a.oppMlbId && <img src={logoUrl(a.oppMlbId)} alt={a.oppAbbr} className="flog-team-logo" />}
                        {a.oppAbbr}
                      </span>
                      <span className={`flog-${a.result.toLowerCase()}`}>{a.result} {a.myRuns ?? '?'}-{a.oppRuns ?? '?'}</span>
                    </Link>
                  ) : <span className="form-log-left">—</span>}

                  <div className="form-log-vsep" />

                  {h ? (
                    <Link
                      to={`/mlb-schedule/${h.gameId}`}
                      state={{ game: h.rawGame }}
                      className="form-log-right flog-row-link"
                    >
                      <span className="flog-opp">
                        <span className="flog-at">{h.isHome ? 'vs' : '@'}</span>
                        {h.oppMlbId && <img src={logoUrl(h.oppMlbId)} alt={h.oppAbbr} className="flog-team-logo" />}
                        {h.oppAbbr}
                      </span>
                      <span className={`flog-${h.result.toLowerCase()}`}>{h.myRuns ?? '?'}-{h.oppRuns ?? '?'} {h.result}</span>
                    </Link>
                  ) : <span className="form-log-right">—</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
