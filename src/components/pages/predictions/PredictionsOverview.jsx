import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import gamePropsImg from '../../../assets/images/game-prop-page.png';
import pitcherPropsImg from '../../../assets/images/pitcher-prop-page.png';
import batterPropsImg from '../../../assets/images/batter-prop-page.png';
import aiMlIcon from '../../../assets/icons/ai-ml.png';
import statcastIcon from '../../../assets/icons/predictive-analytics.png';
import machineIcon from '../../../assets/icons/machine.png';
import gamePropIcon from '../../../assets/icons/game-prop.png';
import pitcherPropIcon from '../../../assets/icons/pitcher-prop.png';
import batterPropIcon from '../../../assets/icons/batter-prop.png';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/predictions-overview.css';

// ── Confidence dots (reused visual from prop pages) ────────────────────────
function ConfidenceDots({ value, max = 5 }) {
  return (
    <span className="pov-conf-dots" aria-label={`Confidence ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pov-conf-dot${i < value ? ' filled' : ''}`} />
      ))}
    </span>
  );
}

// ── Sample pick chip ────────────────────────────────────────────────────────
function SamplePick({ label, pick, confidence, prob, accent }) {
  return (
    <div className={`pov-sample-pick accent-${accent}`}>
      <div className="pov-sample-pick__top">
        <span className="pov-sample-pick__label">{label}</span>
        <span className={`pov-sample-pick__prob accent-${accent}`}>{prob}% win prob</span>
      </div>
      <div className="pov-sample-pick__pick">{pick}</div>
      <div className="pov-sample-pick__bottom">
        <ConfidenceDots value={confidence} />
        <span className="pov-sample-pick__conf-label">confidence</span>
      </div>
    </div>
  );
}

// ── Section feature row ─────────────────────────────────────────────────────
function FeatureSection({ accent, tag, tagIcon, title, description, bullets, picks, screenshotLabel, image, reverse }) {
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
        <div className="pov-sample-picks">
          {picks.map((p, i) => (
            <SamplePick key={i} {...p} accent={accent} />
          ))}
        </div>
      </div>
      <div className="pov-feature-visual">
        <div className={`pov-screenshot-shell accent-${accent}`}>
          <div className="pov-screenshot-bar">
            <span /><span /><span />
          </div>
          {image
            ? <img src={image} alt={screenshotLabel} className="pov-screenshot-img" />
            : (
              <div className="pov-screenshot-placeholder">
                <span className="pov-screenshot-label">{screenshotLabel}</span>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function PredictionsOverview() {
  const navigate = useNavigate();
  const { isAuthenticated, isPremium } = useAuth();

  const handleUpgrade = () => {
    navigate(isAuthenticated ? '/account/settings' : '/account');
    window.scrollTo(0, 0);
  };

  const handleExplore = (path) => {
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <div className="predictions-page pov-page">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="pov-hero">
        <div className="pov-hero-inner">
          <span className="pov-hero-eyebrow">Sandlotpicks Predictions</span>
          <h1 className="pov-hero-title">
            ML models + AI analysis.<br />
            <span className="pov-hero-title--accent">Every MLB game, every day.</span>
          </h1>
          <p className="pov-hero-sub">
            A data-driven baseball analytics platform powered by AI and machine learning.
            We forecast batter and pitcher props using historical data, rolling metrics, and
            advanced ML algorithms — then layer on Scout AI scouting reports to surface the
            clearest edges in player matchups and betting markets.
          </p>
          <div className="pov-hero-actions">
            {!isPremium && (
              <button className="pov-cta-btn pov-cta-btn--primary" onClick={handleUpgrade}>
                Get Premium Access
              </button>
            )}
            <button className="pov-cta-btn pov-cta-btn--ghost" onClick={() => document.getElementById('pov-features')?.scrollIntoView({ behavior: 'smooth' })}>
              See What's Inside
            </button>
          </div>
        </div>

        {/* ── Method pills ── */}
        <div className="pov-method-strip">
          <div className="pov-method-pill">
            <img src={machineIcon} alt="ML Model" className="pov-method-icon-img" />
            <div>
              <div className="pov-method-pill__title">ML Model</div>
              <div className="pov-method-pill__sub">Trained on 20+ seasons of MLB data</div>
            </div>
          </div>
          <div className="pov-method-divider" />
          <div className="pov-method-pill">
            <img src={aiMlIcon} alt="Scout AI" className="pov-method-icon-img" />
            <div>
              <div className="pov-method-pill__title">Scout AI</div>
              <div className="pov-method-pill__sub">Per-game scouting reports with reasoning</div>
            </div>
          </div>
          <div className="pov-method-divider" />
          <div className="pov-method-pill">
            <img src={statcastIcon} alt="Confidence Scoring" className="pov-method-icon-img" />
            <div>
              <div className="pov-method-pill__title">Confidence Scoring</div>
              <div className="pov-method-pill__sub">Win probability + edge vs. the market</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature sections ─────────────────────────────────── */}
      <div id="pov-features" className="pov-features-wrapper">

        <FeatureSection
          accent="blue"
          tag="Game Predictions"
          tagIcon={gamePropIcon}
          title="Full-game picks powered by real models"
          description="Our ML model generates win probability, run-line projections, and over/under totals for every scheduled game — then Scout AI writes a matchup-specific scouting report explaining the edge."
          bullets={[
            'Win probability vs. market implied odds — find where the line is mispriced',
            'Projected run totals compared against posted over/under lines',
            'Scout AI scouting report: pitching matchup, splits edge, key factors, red flags',
            'Recommended plays ranked by confidence (1–5 scale)',
          ]}
          picks={[
            { label: 'Moneyline', pick: 'SEA Mariners', confidence: 4, prob: 65 },
            { label: 'Total', pick: 'Over 7.5', confidence: 5, prob: 71 },
          ]}
          screenshotLabel="Game Props Preview"
          image={gamePropsImg}
        />

        <FeatureSection
          accent="green"
          tag="Pitcher Props"
          tagIcon={pitcherPropIcon}
          title="Strikeouts, outs, and ERA props with line edges"
          description="We model every starter's projected strikeouts, pitcher outs, earned runs, and hits allowed — then compare our projections against each sportsbook's posted line to find over/under edges, surfaced with EV and confidence scoring."
          bullets={[
            'Blended ML projection vs. sportsbook line — find the side with positive EV',
            'Splits-adjusted forecasts: how each starter performs vs. LHB and RHB this season',
            'Best available odds across DraftKings, FanDuel, BetMGM, Caesars, and more',
            'DFS lines from PrizePicks, Underdog, and Pick6 alongside sportsbook props',
          ]}
          picks={[
            { label: 'Strikeouts', pick: 'Under 6.5 K', confidence: 3, prob: 62 },
            { label: 'Pitcher Outs', pick: 'Under 15.0', confidence: 4, prob: 68 },
          ]}
          screenshotLabel="Pitcher Props Preview"
          image={pitcherPropsImg}
          reverse
        />

        <FeatureSection
          accent="yellow"
          tag="Batter Props"
          tagIcon={batterPropIcon}
          title="Hit, home run, and stolen base edges by matchup"
          description="Every batter in today's lineup gets a projection for hits, total bases, home runs, RBIs, and stolen bases — calibrated against the opposing pitcher's 2026 splits and park factors."
          bullets={[
            'Matchup-adjusted projections: batter vs. pitcher handedness splits this season',
            'Confidence score derived from model certainty and distance from the posted line',
            'DFS-optimized view: PrizePicks and Underdog lines shown alongside sportsbook props',
            'Scout AI batter scouting report with reasoning for the recommended side',
          ]}
          picks={[
            { label: 'Total Bases', pick: 'Over 1.5', confidence: 4, prob: 64 },
            { label: 'Hits', pick: 'Over 0.5', confidence: 3, prob: 60 },
          ]}
          screenshotLabel="Batter Props Preview"
          image={batterPropsImg}
        />
      </div>

      {/* ── How it works strip ───────────────────────────────── */}
      <div className="pov-how-strip">
        <div className="pov-how-strip__inner">
          <h2 className="pov-how-strip__title">How the model works</h2>
          <div className="pov-how-steps">
            <div className="pov-how-step">
              <div className="pov-how-step__num">01</div>
              <div className="pov-how-step__text">
                <strong>ML projection</strong>
                <span>Our models generate per-stat projections with standard deviation bands, trained on historical MLB data and current-season splits.</span>
              </div>
            </div>
            <div className="pov-how-step">
              <div className="pov-how-step__num">02</div>
              <div className="pov-how-step__text">
                <strong>Market comparison</strong>
                <span>Projections are compared against live sportsbook lines across 7+ books and prediction markets to quantify the edge.</span>
              </div>
            </div>
            <div className="pov-how-step">
              <div className="pov-how-step__num">03</div>
              <div className="pov-how-step__text">
                <strong>Scout AI report</strong>
                <span>A game-specific scouting report is generated that explains the picks in plain language — splits, red flags, and the clearest value on the board.</span>
              </div>
            </div>
            <div className="pov-how-step">
              <div className="pov-how-step__num">04</div>
              <div className="pov-how-step__text">
                <strong>Confidence scoring</strong>
                <span>Each pick is rated 1–5 based on model certainty, distance from the posted line, and alignment between the ML projection and Scout AI reasoning.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────────── */}
      {!isPremium && (
        <div className="pov-cta-section">
          <div className="pov-cta-inner">
            <span className="pov-cta-eyebrow">Premium Access</span>
            <h2 className="pov-cta-title">Get every pick, every day.</h2>
            <p className="pov-cta-sub">
              Game props, pitcher props, batter props, Scout AI scouting reports, and live odds comparison — all unlocked with a premium subscription.
            </p>
            <div className="pov-cta-perks">
              <span className="pov-cta-perk">✓ Full game predictions</span>
              <span className="pov-cta-perk">✓ Pitcher + batter props</span>
              <span className="pov-cta-perk">✓ Scout AI scouting reports</span>
              <span className="pov-cta-perk">✓ Live odds across 7+ books</span>
            </div>
            <button className="pov-cta-btn pov-cta-btn--primary pov-cta-btn--lg" onClick={handleUpgrade}>
              {isAuthenticated ? 'Upgrade to Premium' : 'Get Started'}
            </button>
          </div>
        </div>
      )}

      {/* ── If already premium, show quick nav cards ──────── */}
      {isPremium && (
        <div className="pov-nav-cards">
          <div className="pov-nav-cards__inner">
            <h2 className="pov-nav-cards__title">Jump in</h2>
            <div className="pov-nav-grid">
              {[
                { accent: 'blue',   icon: '⚾', label: 'Game Predictions', path: '/predictions/games' },
                { accent: 'green',  icon: '🔥', label: 'Pitcher Props',    path: '/predictions/pitchers' },
                { accent: 'yellow', icon: '🏏', label: 'Batter Props',     path: '/predictions/batters' },
              ].map(c => (
                <button key={c.path} className={`pov-nav-card accent-${c.accent}`} onClick={() => handleExplore(c.path)}>
                  <span className="pov-nav-card__icon">{c.icon}</span>
                  <span className="pov-nav-card__label">{c.label}</span>
                  <span className="pov-nav-card__arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
