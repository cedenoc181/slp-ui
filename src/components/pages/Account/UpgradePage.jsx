import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import stripeService from '../../../data/services/stripeService';
import './upgrade-page.css';

const PRICES = {
  weekly:  process.env.REACT_APP_PREMIUM_PRICE_WEEKLY || '—',
  monthly: process.env.REACT_APP_PREMIUM_PRICE        || '—',
  annual:  process.env.REACT_APP_PREMIUM_PRICE_ANNUAL || '—',
};

const PLANS = [
  {
    key: 'weekly',
    name: 'Weekly',
    period: '/week',
    desc: 'Full access for 7 days. No subscription, no renewal.',
    badge: null,
    recurring: false,
  },
  {
    key: 'monthly',
    name: 'Monthly',
    period: '/month',
    desc: 'Full access, billed monthly. Cancel anytime.',
    badge: 'Most Popular',
    recurring: true,
  },
  {
    key: 'annual',
    name: 'Seasonal',
    period: '/season',
    desc: 'Full season access in one payment. No subscription.',
    badge: 'Best Value',
    recurring: false,
  },
];

const FEATURES = [
  { icon: '⚾', label: 'Full Game Predictions',    desc: 'Win probability, run totals, and spread projections for every MLB game.' },
  { icon: '🔥', label: 'Pitcher Props',             desc: 'Strikeouts, outs, earned runs, and hits allowed with sportsbook line edges.' },
  { icon: '🏏', label: 'Batter Props',              desc: 'Hit, total bases, HR, RBI, and stolen base edges by matchup.' },
  { icon: '🧠', label: 'Scout AI Scouting Reports', desc: 'Per-game AI analysis — pitching matchup, splits edge, key factors, red flags.' },
  { icon: '📊', label: 'Odds Across 7+ Books',      desc: 'Best available lines from DraftKings, FanDuel, BetMGM, Caesars, and more.' },
  { icon: '🎯', label: 'Confidence Scoring',         desc: 'Every pick rated 1–5 with win probability and EV vs. the market.' },
];

const ANNUAL_CUTOFF = new Date('2026-06-01');
const isAnnualExpired = new Date() >= ANNUAL_CUTOFF;

// Days remaining until annual is pulled
const daysUntilCutoff = Math.max(0, Math.ceil((ANNUAL_CUTOFF - new Date()) / (1000 * 60 * 60 * 24)));

export default function UpgradePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isPremium } = useAuth();
  const [loading, setLoading] = useState(null); // null | plan key
  const [error, setError]     = useState('');

  if (isPremium) {
    navigate('/predictions', { replace: true });
    return null;
  }

  const handleStripe = async (plan) => {
    if (!isAuthenticated) {
      navigate('/account', { state: { from: { pathname: '/upgrade' } } });
      return;
    }
    setLoading(plan);
    setError('');
    try {
      const { checkout_url } = await stripeService.createCheckoutSession({ plan });
      window.location.href = checkout_url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="upgrade-page">

      {/* Hero */}
      <div className="upgrade-hero">
        <span className="upgrade-eyebrow">Premium Access</span>
        <h1 className="upgrade-title">
          The full predictions suite.<br />
          <span className="upgrade-title--accent">Pick your plan.</span>
        </h1>
        <p className="upgrade-sub">
          Unlock every game, pitcher, and batter prop — plus Scout AI scouting reports and live
          odds comparison — updated daily throughout the MLB season.
        </p>
      </div>

      {/* Plan cards */}
      <div className="upgrade-plans">
        {PLANS.map((plan) => {
          const isAnnual = plan.key === 'annual';
          const muted = isAnnual && isAnnualExpired;
          return (
            <div
              key={plan.key}
              className={[
                'upgrade-plan-card',
                plan.badge && !muted ? 'upgrade-plan-card--featured' : '',
                muted ? 'upgrade-plan-card--muted' : '',
              ].filter(Boolean).join(' ')}
            >
              {/* Limited time banner for annual */}
              {isAnnual && !isAnnualExpired && (
                <div className="upgrade-plan-card__limited">
                  ⏳ Available for {daysUntilCutoff} more day{daysUntilCutoff !== 1 ? 's' : ''}
                </div>
              )}

              {muted ? (
                <div className="upgrade-card__badge upgrade-card__badge--muted">Unavailable</div>
              ) : plan.badge ? (
                <div className="upgrade-card__badge">{plan.badge}</div>
              ) : null}

              <div className="upgrade-card__name">{plan.name}</div>
              <div className="upgrade-card__price">
                <span className="upgrade-card__amount">${PRICES[plan.key]}</span>
                <span className="upgrade-card__period">{plan.period}</span>
              </div>
              <p className="upgrade-plan-card__billing">
                {plan.recurring ? '↻ Renews monthly' : '✕ One-time, no renewal'}
              </p>
              <p className="upgrade-card__desc">
                {muted
                  ? 'The season pass is no longer available mid-season. Check back next season.'
                  : plan.desc}
              </p>
              {!muted && (
                <button
                  className="upgrade-card__cta"
                  onClick={() => handleStripe(plan.key)}
                  disabled={!!loading}
                >
                  {loading === plan.key ? (
                    <span className="upgrade-spinner" />
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      {isAuthenticated ? `Get ${plan.name}` : `Sign Up & Get ${plan.name}`}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="upgrade-card__error" style={{ marginTop: '0.75rem' }}>{error}</p>}

      {/* Feature list */}
      <div className="upgrade-body" style={{ marginTop: '2.5rem' }}>
        <div className="upgrade-card" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="upgrade-card__name" style={{ marginTop: 0 }}>Everything included</div>
          <ul className="upgrade-card__features">
            {FEATURES.map((f, i) => (
              <li key={i} className="upgrade-card__feature">
                <span className="upgrade-card__feature-icon">{f.icon}</span>
                <div>
                  <strong>{f.label}</strong>
                  <span>{f.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust signals */}
        <div className="upgrade-trust">
          <div className="upgrade-trust__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Secure payments via Stripe</span>
          </div>
          <div className="upgrade-trust__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Cancel anytime — no contracts</span>
          </div>
          <div className="upgrade-trust__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Updated daily during MLB season</span>
          </div>
        </div>
      </div>

      <p className="upgrade-disclaimer">
        ⚠ Predictions are for informational and entertainment purposes only and do not constitute financial or betting advice.
        Please gamble responsibly. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
      </p>
    </div>
  );
}
