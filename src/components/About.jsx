import React, { useState, useEffect } from 'react';

function About() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const sections = [
    {
      icon: '☄️',
      title: 'Batter Props',
      items: [
        { label: 'Total Bases', desc: 'Predicts total bases achieved in a game' },
        { label: 'RBIs', desc: 'Forecasts runs batted in' },
        { label: 'Hits', desc: 'Predicts number of hits' },
        { label: 'Home Runs', desc: 'Calculates home run probability' }
      ]
    },
    {
      icon: '⚾',
      title: 'Pitcher Props',
      items: [
        { label: 'Strikeouts', desc: 'Predicts K count per game' },
        { label: 'Earned Runs', desc: 'Forecasts runs allowed' },
        { label: 'Pitcher Outs', desc: 'Predicts total outs recorded' },
        { label: 'Opponent Analysis', desc: 'Factors in WHIP, OPS, and matchup stats' }
      ]
    },
    {
      icon: '🤖',
      title: 'Machine Learning Engine',
      items: [
        { label: 'Rolling Metrics', desc: '3-game averages and trends' },
        { label: 'Season Stats', desc: 'BA, SLG%, OPS, and more' },
        { label: 'Advanced Models', desc: 'Random Forest & XGBoost algorithms' },
        { label: 'Performance Metrics', desc: 'RMSE and R² model evaluation' }
      ]
    },
    {
      icon: '📊',
      title: 'Edge Detection',
      items: [
        { label: 'Opponent-Specific', desc: 'Team pitching/batting stats' },
        { label: 'Probable Pitcher', desc: 'Matchup-based predictions' },
        { label: 'Strikeout Rates', desc: 'Batter vs pitcher tendencies' },
        { label: 'Dynamic Features', desc: 'Real-time matchup analysis' }
      ]
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sections.length);
    }, 5000); // Auto-advance every 5 seconds

    return () => clearInterval(interval);
  }, [sections.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sections.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + sections.length) % sections.length);
  };

  return (
    <section id="about" className="about">
      <div className="container">
        <h2 className="chalk-heading">What is Sandlot Picks Analytics?</h2>
        <p className="chalk-text" style={{fontSize: '1.15rem', marginBottom: '2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto 3rem'}}>
          Sandlot Picks Analytics is a machine learning-powered application designed to predict 
          baseball player performance metrics. By leveraging historical data, rolling metrics, 
          and advanced ML models, we provide data-driven insights for player props and matchups.
        </p>

        <div className="carousel-container">
          <button className="carousel-btn prev" onClick={prevSlide} aria-label="Previous slide">
            ‹
          </button>

          <div className="carousel-track">
            {sections.map((section, index) => (
              <div
                key={index}
                className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
                style={{
                  transform: `translateX(${(index - currentSlide) * 100}%)`,
                  opacity: index === currentSlide ? 1 : 0
                }}
              >
                <div className="carousel-content">
                  <h3 className="carousel-title">
                    <span className="carousel-icon">{section.icon}</span>
                    {section.title}
                  </h3>
                  <ul className="carousel-list">
                    {section.items.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.label}:</strong> {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <button className="carousel-btn next" onClick={nextSlide} aria-label="Next slide">
            ›
          </button>

          <div className="carousel-indicators">
            {sections.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;