import React from 'react';
import { useNavigate } from 'react-router-dom';

function StatsUpdate() {
  const navigate = useNavigate();

  const upcomingFeatures = [
    {
      title: 'MLB Standings',
      status: 'In final testing',
      description: 'Division, Wild Card, and streak tracking with daily refreshes.',
      icon: '🏅'
    },
    {
      title: 'Team Analytics',
      status: 'Polishing UI',
      description: 'Split views for batting and pitching with sortable advanced metrics.',
      icon: '📊'
    },
    {
      title: 'Player Analytics',
      status: 'Data wiring',
      description: 'Player-by-player performance dashboards and trend charts.',
      icon: '⚾'
    }
  ];

  return (
    <main className="stats-update-page">
      <section className="stats-update-hero">
        <p className="eyebrow-tag">Coming soon</p>
        <h1>Our new MLB stats suite is almost ready</h1>
        <p className="stats-update-lede">
          We&apos;re putting the finishing touches on a refreshed stats experience covering MLB Standings,
          Team Analytics, and Player Analytics. Check back shortly to explore the full release.
        </p>
        <div className="stats-update-actions">
          <button className="cta-button" type="button" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </section>

      <section className="stats-update-grid">
        {upcomingFeatures.map((feature) => (
          <article className="stats-update-card" key={feature.title}>
            <div className="stats-update-icon" aria-hidden="true">{feature.icon}</div>
            <div className="stats-update-card-header">
              <h2>{feature.title}</h2>
              <span className="status-pill">{feature.status}</span>
            </div>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default StatsUpdate;
