import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import stripeService from '../../../data/services/stripeService';
import './upgrade-page.css';

const PREMIUM_PRICE = process.env.REACT_APP_PREMIUM_PRICE || '—';

const FEATURES = [
  { icon: '⚾', label: 'Full Game Predictions',   desc: 'Win probability, run totals, and spread projections for every MLB game.' },
  { icon: '🔥', label: 'Pitcher Props',            desc: 'Strikeouts, outs, earned runs, and hits allowed with sportsbook line edges.' },
  { icon: '🏏', label: 'Batter Props',             desc: 'Hit, total bases, HR, RBI, and stolen base edges by matchup.' },
  { icon: '🧠', label: 'Scout AI Scouting Reports', desc: 'Per-game AI analysis — pitching matchup, splits edge, key factors, red flags.' },
  { icon: '📊', label: 'Odds Across 7+ Books',     desc: 'Best available lines from DraftKings, FanDuel, BetMGM, Caesars, and more.' },
  { icon: '🎯', label: 'Confidence Scoring',        desc: 'Every pick rated 1–5 with win probability and EV vs. the market.' },
];

export default function UpgradePage() {
  const navigate  = useNavigate();
  const { isAuthenticated, isPremium } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Already premium — send to predictions
  if (isPremium) {
    navigate('/predictions', { replace: true });
    return null;
  }

  const handleStripe = async () => {
    if (!isAuthenticated) {
      navigate('/account', { state: { from: { pathname: '/upgrade' } } });
      return;
    }
    setLoading('stripe');
    setError('');
    try {
      const { checkout_url } = await stripeService.createCheckoutSession();
      window.location.href = checkout_url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleWhop = () => {
    if (!isAuthenticated) {
      navigate('/account', { state: { from: { pathname: '/upgrade' } } });
      return;
    }
    // External Whop product page — no API call needed
    window.open('https://whop.com/sandlot-picks/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="upgrade-page">

      {/* Header */}
      <div className="upgrade-hero">
        <span className="upgrade-eyebrow">Premium Access</span>
        <h1 className="upgrade-title">
          The full predictions suite.<br />
          <span className="upgrade-title--accent">One flat monthly price.</span>
        </h1>
        <p className="upgrade-sub">
          Unlock every game, pitcher, and batter prop — plus Scout AI scouting reports and live
          odds comparison — updated daily throughout the MLB season.
        </p>
      </div>

      {/* Pricing card + features */}
      <div className="upgrade-body">

        {/* Pricing card */}
        <div className="upgrade-card">
          <div className="upgrade-card__badge">Most Popular</div>
          <div className="upgrade-card__name">Premium</div>
          <div className="upgrade-card__price">
            <span className="upgrade-card__amount">${PREMIUM_PRICE}</span>
            <span className="upgrade-card__period">/month</span>
          </div>
          <p className="upgrade-card__desc">
            Full access to all predictions, props, and AI analysis. Cancel anytime.
          </p>

          {/* Stripe CTA */}
          <button
            className="upgrade-card__cta"
            onClick={handleStripe}
            disabled={!!loading}
          >
            {loading === 'stripe' ? (
              <span className="upgrade-spinner" />
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                {isAuthenticated ? 'Subscribe with Card' : 'Sign Up & Subscribe with Card'}
              </>
            )}
          </button>

          {/* Whop CTA */}
          <button
            className="upgrade-card__cta upgrade-card__cta--whop"
            onClick={handleWhop}
            disabled={!!loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-11h2v6h-2zm0-4h2v2h-2z"/>
            </svg>
            Subscribe via Whop
          </button>

          <div className="upgrade-card__divider">
            <span>Choose your preferred platform</span>
          </div>

          {error && <p className="upgrade-card__error">{error}</p>}

          <p className="upgrade-card__legal">
            Stripe: pay by card, cancel anytime from account settings.<br />
            Whop: manage via the Whop app or website.
          </p>

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

      {/* Disclaimer */}
      <p className="upgrade-disclaimer">
        ⚠ Predictions are for informational and entertainment purposes only and do not constitute financial or betting advice.
        Please gamble responsibly. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
      </p>
    </div>
  );
}
