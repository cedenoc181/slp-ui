import { useEffect } from 'react';
import dsData from '../../../data/ds_baseball.json';

function DataScienceBaseball() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${dsData.page_title} | Sandlot Picks Analytics`;
  }, []);

  return (
    <section className="ds-baseball-page">
      <div className="container">
        {/* Hero Section */}
        <div className="ds-hero">
          <h1 className="page-title">{dsData.page_title}</h1>
          <p className="page-subtitle">{dsData.page_subtitle}</p>
        </div>

        {/* Render sections dynamically */}
        {dsData.sections.map(section => {
          if (section.type === 'hero') {
            return (
              <div key={section.id} className="intro-section">
                <h2>{section.title}</h2>
                <p>{section.content}</p>
              </div>
            );
          }

          if (section.type === 'timeline') {
            return (
              <div key={section.id} className="timeline-section">
                <h2>{section.title}</h2>
                <p className="subtitle">{section.subtitle}</p>
                <div className="timeline">
                  {section.events.map((event, idx) => (
                    <div key={idx} className="timeline-item">
                      <span className="timeline-icon">{event.icon}</span>
                      <div className="timeline-content">
                        <span className="timeline-year">{event.year}</span>
                        <h3>{event.title}</h3>
                        <p>{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (section.type === 'transparency') {
            return (
              <div key={section.id} className="limitations-section">
                <h2>{section.title}</h2>
                <p className="subtitle">{section.subtitle}</p>
                <p className="intro">{section.intro}</p>
                <div className="limitations-grid">
                  {section.limitations.map((item, idx) => (
                    <div key={idx} className="limitation-card">
                      <span className="limitation-icon">{item.icon}</span>
                      <h3>{item.category}</h3>
                      <p className="description">{item.description}</p>
                      <p className="impact"><strong>Impact:</strong> {item.impact}</p>
                      <p className="approach"><strong>Our Approach:</strong> {item.our_approach}</p>
                    </div>
                  ))}
                </div>
                <div className="philosophy">
                  <p>{section.philosophy}</p>
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* CTA Section */}
        <div className="cta-section">
          <h2>{dsData.cta.title}</h2>
          <p>{dsData.cta.description}</p>
          <div className="cta-buttons">
            {dsData.cta.buttons.map((button, idx) => (
              <a
                key={idx}
                href={button.link}
                className={`cta-btn ${button.style}`}
              >
                {button.text}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DataScienceBaseball;