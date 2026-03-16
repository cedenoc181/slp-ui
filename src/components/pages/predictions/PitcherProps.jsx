import '../../../styles/predictions-page-styling/predictions.css';

export default function PitcherProps() {
  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <div className="predictions-header-tag">
            <span>⚾</span> Pitcher Props
          </div>
          <h1>Pitcher Predictions</h1>
          <p className="predictions-header-sub">
            Starting pitcher performance forecasts — strikeouts, innings, ERA projections, and quality start probability.
          </p>
        </div>
      </div>

      <div className="predictions-content">
        <div className="predictions-coming-soon-banner">
          <span className="banner-icon">🚧</span>
          <p className="banner-text">
            <strong>Coming soon.</strong> Pitcher prop models are currently in development.
            Check back as this section goes live throughout the season.
          </p>
        </div>
      </div>
    </div>
  );
}
