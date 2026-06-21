import { Link } from 'react-router-dom';
import { SkeletonInsightCard } from './Skeletons';

export default function InsightsPanel({ insights }) {
  if (!insights) {
    return (
      <div className="insights-panel">
        {[0, 1, 2, 3].map(i => <SkeletonInsightCard key={i} />)}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="insights-panel">
        <div className="insight-card insight-card--neutral">
          <span className="insight-icon">📊</span>
          <div className="insight-body">
            <div className="insight-headline">No split data available yet</div>
            <div className="insight-detail">Check back once more season data is available.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-panel">
      {insights.map((ins, i) => (
        <div key={i} className={`insight-card insight-card--${ins.type}${ins.metrics.length >= 2 ? ' insight-card--multi' : ''}`}>
          <span className="insight-icon">
            {ins.logoSrc && <img src={ins.logoSrc} alt="" className="insight-team-logo" />}
          </span>
          <div className="insight-body">
            <Link to={`/player/${ins.playerSlug}`} className="insight-player-link" onClick={() => window.scrollTo(0, 0)}>
              {ins.headline}
            </Link>
            <div className="insight-metrics">
              {ins.metrics.map((m, j) => (
                <div key={j} className="insight-metric-row">
                  <span className="insight-metric-label">{m.label}</span>
                  <span className="insight-metric-value">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
