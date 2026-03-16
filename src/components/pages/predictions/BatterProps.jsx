import '../../../styles/predictions-page-styling/predictions.css';

export default function BatterProps() {
  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <div className="predictions-header-tag">
            <span>🏏</span> Batter Props
          </div>
          <h1>Batter Predictions</h1>
          <p className="predictions-header-sub">
            Hit, home run, RBI, and stolen base prop predictions based on matchup data and recent form.
          </p>
        </div>
      </div>

      <div className="predictions-content">
        <div className="predictions-coming-soon-banner">
          <span className="banner-icon">🚧</span>
          <p className="banner-text">
            <strong>Coming soon.</strong> Batter prop models are currently in development.
            Check back as this section goes live throughout the season.
          </p>
        </div>
      </div>
    </div>
  );
}
