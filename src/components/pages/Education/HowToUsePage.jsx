import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import howToUseData from '../../../data/howToUse.json';


function HowToUsePage() {
  const [activeTab, setActiveTab] = useState('getting-started');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderSection = (section) => {
    switch (section.type) {
      case 'intro':
        return (
          <div key={section.title}>
            <h2>{section.title}</h2>
            {section.content && <p>{section.content}</p>}
          </div>
        );

      case 'steps':
        return (
          <div key="steps">
            {section.steps.map((step) => (
              <div key={step.number} className="step-card">
                <div className="step-number">{step.number}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <ul>
                    {step.items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                  {step.links && step.links.map((link, idx) => (
                    <Link key={idx} to={link.url} className="inline-link">
                      {link.text}
                    </Link>
                  ))}
                  {step.cta && (
                    <a
                      href={step.cta.url}
                      target={step.cta.external ? "_blank" : "_self"}
                      rel={step.cta.external ? "noopener noreferrer" : ""}
                      className="discord-join-btn"
                    >
                      {step.cta.text}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'faqs':
        return (
          <div key="faqs">
            {section.items.map((faq) => (
              <div key={faq.id} className="faq-item">
                <h3>
                  {faq.icon} {faq.question}
                </h3>
                {faq.subtitle && <p className="faq-subtitle">{faq.subtitle}</p>}
                <p>
                  <strong>Answer:</strong> {faq.answer}
                  {faq.highlight && <strong> {faq.highlight}</strong>}
                </p>
                {faq.list && (
                  <ul>
                    {faq.list.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
                {faq.footer && <p>{faq.footer}</p>}
              </div>
            ))}
          </div>
        );

      case 'screenshots':
        return (
          <div key="screenshots" className="discord-screenshots">
            <h3>{section.title}</h3>
            <div className="screenshot-grid">
              {section.images.map((img, idx) => (
                <div key={idx} className="screenshot-card">
                  <div className="screenshot-wrapper">
                    <img
                      src={require(`../../../assets/images/${img.src}`)}
                      alt={img.alt}
                    />
                  </div>
                  <p>{img.caption}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cta':
        return (
          <div key="cta" className="cta-box">
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <a
              href={section.button.url}
              target={section.button.external ? "_blank" : "_self"}
              rel={section.button.external ? "noopener noreferrer" : ""}
              className="discord-cta-btn"
            >
              {section.button.text}
            </a>
          </div>
        );

      case 'prediction-example':
        return (
          <div key="prediction-example" className="info-card">
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <div className="prediction-example">
              <div className="example-header">Example Prediction:</div>
              <div className="example-content">
                <p><strong>Player:</strong> {section.example.player}</p>
                <p><strong>Prop:</strong> {section.example.prop}</p>
                <p><strong>Prediction:</strong> {section.example.prediction}</p>
                <p><strong>Confidence:</strong> {section.example.confidence}</p>
                <p><strong>STD:</strong> {section.example.std}</p>
              </div>
            </div>
          </div>
        );

      case 'metrics':
        return (
          <div key="metrics" className="info-card">
            <h3>{section.title}</h3>
            {section.metrics.map((metric, idx) => (
              <div key={idx} className="metric-explanation">
                <h4>{metric.name}</h4>
                <p>{metric.description}</p>
                <ul>
                  {metric.scale.map((item, i) => (
                    <li key={i}>
                      <strong>{item.range}:</strong> {item.meaning}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );

      case 'factors':
        return (
          <div key="factors" className="info-card">
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.title}:</strong> {item.description}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'tips':
        return (
          <div key="tips">
            {section.tips.map((tip, idx) => (
              <div key={idx} className="tip-card">
                <div className="tip-icon">{tip.icon}</div>
                <h3>{tip.title}</h3>
                <p>{tip.description}</p>
                <ul>
                  {tip.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );

      case 'warning':
        return (
          <div key="warning" className="warning-box">
            <h3>{section.title}</h3>
            <p>{section.content}</p>
          </div>
        );

      default:
        return null;
    }
  };

  const currentTab = howToUseData.tabs.find(tab => tab.id === activeTab);

  return (
    <section className="how-to-use-page">
      <div className="container">
        <h1 className="page-title">How to Use Sandlot Picks</h1>
        <p className="page-subtitle">
          Your complete guide to navigating our platform, understanding predictions, and joining our Discord community
        </p>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          {howToUseData.tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.title}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          <div className="content-section">
            {currentTab && currentTab.sections.map(section => renderSection(section))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowToUsePage;