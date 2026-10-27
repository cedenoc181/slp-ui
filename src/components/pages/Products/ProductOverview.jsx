import { useNavigate } from 'react-router-dom';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/predictions-overview.css';
import '../../../styles/products-page-styling/products.css';

// Shared layout for the /products/* landing pages — mirrors PredictionsOverview
// (hero, method strip, feature sections, how-it-works, CTA) using the same pov-* styles.

// ── Section feature row ─────────────────────────────────────────────────────
function FeatureSection({ accent, tag, tagIcon, title, description, bullets, mockTitle, mockUrl, mock, reverse }) {
  return (
    <div className={`pov-feature-section${reverse ? ' reverse' : ''}`}>
      <div className="pov-feature-copy">
        <span className={`pov-feature-tag accent-${accent}`}>
          {tagIcon && <img src={tagIcon} alt="" className="pov-feature-tag-icon" />}
          {tag}
        </span>
        <h2 className="pov-feature-title">{title}</h2>
        <p className="pov-feature-desc">{description}</p>
        <ul className="pov-feature-bullets">
          {bullets.map((b, i) => (
            <li key={i} className="pov-feature-bullet">
              <span className={`pov-feature-bullet__dot accent-${accent}`} />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="pov-feature-visual">
        <div className={`pov-screenshot-shell accent-${accent}`}>
          <div className="pov-screenshot-bar">
            <span /><span /><span />
            {mockUrl && <em className="pl-mock-url">{mockUrl}</em>}
          </div>
          <div className="pl-mock">
            <div className={`pl-mock-title accent-${accent}`}>{mockTitle}</div>
            {mock}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mock panel rows ─────────────────────────────────────────────────────────
// Illustrative only — landing pages are public, so previews never show real data.
export function MockRow({ left, sub, right, tone }) {
  return (
    <div className="pl-mock-row">
      <span className="pl-mock-row__left">
        {left}
        {sub && <span className="pl-mock-row__sub">{sub}</span>}
      </span>
      <span className={`pl-mock-row__right${tone ? ` ${tone}` : ''}`}>{right}</span>
    </div>
  );
}

// ── Main layout ─────────────────────────────────────────────────────────────
export default function ProductOverview({ eyebrow, title, titleAccent, sub, primary, secondary, methods, features, howTitle, steps, cta }) {
  const navigate = useNavigate();

  const go = (path) => {
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <div className="predictions-page pov-page">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="pov-hero">
        <div className="pov-hero-inner">
          <span className="pov-hero-eyebrow">{eyebrow}</span>
          <h1 className="pov-hero-title">
            {title}<br />
            <span className="pov-hero-title--accent">{titleAccent}</span>
          </h1>
          <p className="pov-hero-sub">{sub}</p>
          <div className="pov-hero-actions">
            {primary && (
              <button className="pov-cta-btn pov-cta-btn--primary" onClick={() => go(primary.path)}>
                {primary.label}
              </button>
            )}
            <button className="pov-cta-btn pov-cta-btn--ghost" onClick={() => document.getElementById('pov-features')?.scrollIntoView({ behavior: 'smooth' })}>
              {secondary || "See What's Inside"}
            </button>
          </div>
        </div>

        {/* ── Method pills ── */}
        <div className="pov-method-strip">
          {methods.map((m, i) => (
            <div key={m.title} style={{ display: 'contents' }}>
              {i > 0 && <div className="pov-method-divider" />}
              <div className="pov-method-pill">
                <img src={m.icon} alt={m.title} className="pov-method-icon-img" />
                <div>
                  <div className="pov-method-pill__title">{m.title}</div>
                  <div className="pov-method-pill__sub">{m.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature sections ─────────────────────────────────── */}
      <div id="pov-features" className="pov-features-wrapper">
        {features.map((f, i) => (
          <FeatureSection key={f.tag} {...f} reverse={i % 2 === 0} />
        ))}
      </div>

      {/* ── How it works strip ───────────────────────────────── */}
      <div className="pov-how-strip">
        <div className="pov-how-strip__inner">
          <h2 className="pov-how-strip__title">{howTitle}</h2>
          <div className="pov-how-steps">
            {steps.map((s, i) => (
              <div key={s.title} className="pov-how-step">
                <div className="pov-how-step__num">{String(i + 1).padStart(2, '0')}</div>
                <div className="pov-how-step__text">
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────────── */}
      {cta && (
        <div className="pov-cta-section">
          <div className="pov-cta-inner">
            <span className="pov-cta-eyebrow">{cta.eyebrow}</span>
            <h2 className="pov-cta-title">{cta.title}</h2>
            <p className="pov-cta-sub">{cta.sub}</p>
            <div className="pov-cta-perks">
              {cta.perks.map((p) => (
                <span key={p} className="pov-cta-perk">✓ {p}</span>
              ))}
            </div>
            <button className="pov-cta-btn pov-cta-btn--primary pov-cta-btn--lg" onClick={() => go(cta.path)}>
              {cta.label}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
