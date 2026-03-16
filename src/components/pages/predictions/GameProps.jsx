import '../../../styles/predictions-page-styling/predictions.css';

export default function GameProps() {
  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <div className="predictions-header-tag">
            <span>🎯</span> Game Props
          </div>
          <h1>Game Predictions</h1>
          <p className="predictions-header-sub">
            Win/loss probability, run totals, and spread projections for every MLB matchup.
          </p>
        </div>
      </div>

      <div className="predictions-content">
        <div className="predictions-coming-soon-banner">
          <span className="banner-icon">🚧</span>
          <p className="banner-text">
            <strong>Coming soon.</strong> Game prediction models are currently in development.
            Check back as this section goes live throughout the season.
          </p>
        </div>
      </div>
    </div>
  );
}
