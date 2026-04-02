import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import howToUseData from '../../../data/staticData/howToUse.json';

import iconPlayerAnalytics      from '../../../assets/icons/player-analytics.png';
import iconTeamAnalytics        from '../../../assets/icons/team-analytics.png';
import iconDataScience          from '../../../assets/icons/data-science-and-baseball.png';
import iconMlbSchedule          from '../../../assets/icons/mlb-schedule.png';
import iconGlossary             from '../../../assets/icons/glossary.png';
import iconHowToUse             from '../../../assets/icons/how-to-use.png';
import iconAnalysis             from '../../../assets/icons/analysis.png';
import iconMlbStandings         from '../../../assets/icons/mlb-standings.png';
import iconGameProp             from '../../../assets/icons/game-prop.png';
import iconBatterProp           from '../../../assets/icons/batter-prop.png';
import iconPitcherProp          from '../../../assets/icons/pitcher-prop.png';
import iconSandlotInsider       from '../../../assets/icons/sandlot-insider.png';
import iconStrategyBlog         from '../../../assets/icons/strategy-blog.png';
import iconFaq                  from '../../../assets/icons/faq.png';
import iconResponsibleGaming    from '../../../assets/icons/responsible-gaming.png';

const ICONS = {
  'player-analytics':          iconPlayerAnalytics,
  'team-analytics':            iconTeamAnalytics,
  'data-science-and-baseball': iconDataScience,
  'mlb-schedule':              iconMlbSchedule,
  'glossary':                  iconGlossary,
  'how-to-use':                iconHowToUse,
  'analysis':                  iconAnalysis,
  'mlb-standings':             iconMlbStandings,
  'game-prop':                 iconGameProp,
  'batter-prop':               iconBatterProp,
  'pitcher-prop':              iconPitcherProp,
  'sandlot-insider':           iconSandlotInsider,
  'strategy-blog':             iconStrategyBlog,
  'faq':                       iconFaq,
  'responsible-gaming':        iconResponsibleGaming,
};

function renderIcon(key) {
  const src = ICONS[key];
  if (!src) return key; // fallback to raw text (emoji or unknown key)
  return <img src={src} alt="" className="how-to-use-icon" />;
}

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
            {section.content && <p className="section-subtitle">{section.content}</p>}
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
                    <Link 
                      key={idx} 
                      to={link.url} 
                      className="inline-link"
                      onClick={() => window.scrollTo(0, 0)}
                    >
                      {link.text}
                    </Link>
                  ))}
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
                  {renderIcon(faq.icon)} {faq.question}
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
                <div className="tip-icon">{renderIcon(tip.icon)}</div>
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
            <h3>{section.icon ? renderIcon(section.icon) : null} {section.title}</h3>
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
          Your complete guide to navigating our MLB analytics platform and getting the most from our tools
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