import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function FeaturesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="5"/>
          <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2"/>
          <path d="M16 3l2 2-2 2"/>
          <path d="M19 5h-3"/>
        </svg>
      ),
      title: 'Player Analytics',
      description: 'Comprehensive statistical profiles for every MLB player with traditional and advanced metrics.',
      items: [
        'Batting stats: AVG, OBP, SLG, OPS, wOBA',
        'Pitching metrics: ERA, WHIP, K/9, FIP',
        'Advanced sabermetrics and trends',
        'Season-by-season comparisons'
      ],
      link: '/player-analytics',
      access: 'free-account'
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18"/>
          <path d="M9 21V9"/>
        </svg>
      ),
      title: 'Team Analytics',
      description: 'Deep dive into all 30 MLB teams with offensive, pitching, and defensive breakdowns.',
      items: [
        'Team batting and pitching stats',
        'Home vs. away performance splits',
        'Defensive metrics and rankings',
        'Historical season comparisons'
      ],
      link: '/team-analytics',
      access: 'free-account'
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 21h8M12 17v4"/>
          <path d="M7 4h10l1 8H6l1-8z"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M12 4v6"/>
        </svg>
      ),
      title: 'MLB Standings',
      description: 'Real-time division standings, wild card races, and playoff positioning for all teams.',
      items: [
        'Live division standings',
        'Wild card race tracking',
        'Games behind calculations',
        'Playoff scenarios'
      ],
      link: '/standings',
      access: 'free'
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <path d="M8 7h8M8 11h8M8 15h4"/>
        </svg>
      ),
      title: 'Baseball Glossary',
      description: 'Complete reference guide to baseball statistics, metrics, and terminology.',
      items: [
        'Traditional stat definitions',
        'Advanced metric explanations',
        'Sabermetric concepts',
        'Context for interpretation'
      ],
      link: '/glossary',
      access: 'free'
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
      title: 'Sandlot Insider',
      description: 'In-depth articles, analysis, and commentary on players, teams, and MLB storylines.',
      items: [
        'Player spotlights and analysis',
        'Team breakdowns and previews',
        'Award race coverage',
        'MLB news and commentary'
      ],
      link: '/sandlot-insider',
      access: 'free'
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <path d="M12 17h.01"/>
        </svg>
      ),
      title: 'How To Use Guide',
      description: 'Step-by-step tutorials on navigating the platform and getting the most from our tools.',
      items: [
        'Platform navigation tips',
        'Analytics interpretation guide',
        'Feature walkthroughs',
        'Research best practices'
      ],
      link: '/how-to-use',
      access: 'free'
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      title: 'Data Science',
      description: 'Learn about our analytical methodology, data sources, and statistical approaches.',
      items: [
        'Data collection methods',
        'Statistical modeling overview',
        'Metric calculations explained',
        'Analytical best practices'
      ],
      link: '/data-science',
      access: 'free'
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      ),
      title: 'Tiered Access',
      description: 'Flexible access levels to fit your needs—from free browsing to premium features.',
      items: [
        'Guest: Standings, Glossary, Articles',
        'Free Account: Full Analytics Suite',
        'Premium: Predictions & Advanced Tools',
        'No credit card for free account'
      ],
      link: '/faqs',
      access: 'info'
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <path d="M12 18h.01"/>
        </svg>
      ),
      title: 'Mobile Optimized',
      description: 'Access analytics anywhere with a fully responsive design across all devices.',
      items: [
        'Responsive data tables',
        'Touch-friendly interface',
        'Fast loading performance',
        'Consistent cross-platform experience'
      ],
      link: null,
      access: 'info'
    }
  ];

  const getAccessBadge = (access) => {
    switch (access) {
      case 'free':
        return <span className="access-badge free">Free Access</span>;
      case 'free-account':
        return <span className="access-badge free-account">Free Account</span>;
      case 'premium':
        return <span className="access-badge premium">Premium</span>;
      default:
        return null;
    }
  };

  return (
    <section className="features-page">
      <div className="container">
        <h1 className="page-title">Platform Features</h1>
        <p className="page-subtitle">
          Discover the tools and resources that power your baseball research on Sandlot Picks Analytics
        </p>

        {/* Features Grid */}
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-header">
                <div className="feature-icon">{feature.icon}</div>
                {getAccessBadge(feature.access)}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <ul>
                {feature.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              {feature.link && (
                <Link 
                  to={feature.link} 
                  className="feature-link"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  Explore {feature.title} →
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="features-cta">
          <h2>Ready to Dive In?</h2>
          <p>Start exploring MLB analytics with our free tools, or create an account to unlock the full suite.</p>
          <div className="cta-buttons">
            <Link to="/standings" className="cta-btn primary" onClick={() => window.scrollTo(0, 0)}>
              View MLB Standings
            </Link>
            <Link to="/glossary" className="cta-btn secondary" onClick={() => window.scrollTo(0, 0)}>
              Browse Glossary
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesPage;