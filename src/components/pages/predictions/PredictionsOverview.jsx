import { useNavigate } from 'react-router-dom';
import '../../../styles/predictions-page-styling/predictions.css';

const CATEGORIES = [
  {
    key: 'games',
    icon: '🎯',
    title: 'Game Predictions',
    desc: 'Win/loss probability, run totals, and spread projections for every MLB matchup.',
    path: '/predictions/games',
    status: 'coming-soon',
  },
  {
    key: 'pitchers',
    icon: '⚾',
    title: 'Pitcher Predictions',
    desc: "Starting pitcher performance forecasts — strikeouts, innings, ERA projections, and quality start probability.",
    path: '/predictions/pitchers',
    status: 'coming-soon',
  },
  {
    key: 'batters',
    icon: '🏏',
    title: 'Batter Predictions',
    desc: 'Hit, home run, RBI, and stolen base prop predictions based on matchup data and recent form.',
    path: '/predictions/batters',
    status: 'coming-soon',
  },
  {
    key: 'arbitrage',
    icon: '📈',
    title: 'Arbitrage',
    desc: 'Identify mispriced lines and arbitrage opportunities across sportsbooks in real time.',
    path: '/predictions/arbitrage',
    status: 'coming-soon',
  },
];

export default function PredictionsOverview() {
  const navigate = useNavigate();

  const handleCardClick = (category) => {
    if (category.status === 'live') {
      navigate(category.path);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="predictions-page">
      {/* Header */}
      <div className="predictions-header">
        <div className="predictions-header-inner">
          <div className="predictions-header-tag">
            <span>🔮</span> Predictions
          </div>
          <h1>Sandlot Predictions</h1>
          <p className="predictions-header-sub">
            Data-driven MLB predictions across games, pitchers, batters, and betting markets.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="predictions-content">
        {/* Info Banner */}
        <div className="predictions-coming-soon-banner">
          <span className="banner-icon">🚧</span>
          <p className="banner-text">
            <strong>Predictions are on the way.</strong> We're building out our prediction engine category by category.
            Check back as each section goes live throughout the season.
          </p>
        </div>

        <div className="predictions-section-label">Categories</div>

        {/* Category Cards */}
        <div className="predictions-categories-grid">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className={`predictions-category-card ${cat.key}`}
              onClick={() => handleCardClick(cat)}
              style={{ cursor: cat.status === 'live' ? 'pointer' : 'default' }}
            >
              <div className="predictions-card-icon-wrap">{cat.icon}</div>

              <div className="predictions-card-body">
                <h3 className="predictions-card-title">{cat.title}</h3>
                <p className="predictions-card-desc">{cat.desc}</p>
              </div>

              <div className="predictions-card-footer">
                <span className={`predictions-card-badge ${cat.status}`}>
                  {cat.status === 'live' ? 'Live' : 'Coming Soon'}
                </span>
                {cat.status === 'live' && (
                  <span className="predictions-card-arrow">→</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
