import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/free-week-banner.css';

const DISMISS_KEY = 'spa_free_week_banner_dismissed_at';
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const STATS_ROUTES = [
  '/mlb-schedule',
  '/mlb-standings',
  '/team-analytics',
  '/player-analytics',
  '/player/',
];

function isStatsRoute(pathname) {
  return STATS_ROUTES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

function isCurrentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts >= DISMISS_WINDOW_MS) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default function FreeWeekBanner() {
  const { isAuthenticated, isPremium } = useAuth();
  const location = useLocation();

  const [dismissed, setDismissed] = useState(() => isCurrentlyDismissed());

  // Re-check dismissal window on login/logout and every route change.
  // If the 24h has elapsed since dismissal, the banner reappears.
  useEffect(() => {
    setDismissed(isCurrentlyDismissed());
  }, [isAuthenticated, location.pathname]);

  if (isPremium) return null;
  if (dismissed) return null;
  if (!isStatsRoute(location.pathname)) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setDismissed(true);
  };

  const ctaHref = isAuthenticated ? '/account/settings' : '/account';
  const ctaLabel = isAuthenticated ? 'Claim your free week →' : 'Sign up & claim free week →';

  return (
    <div className="free-week-banner" role="region" aria-label="Free week trial promotion">
      <div className="free-week-banner__inner">
        <span className="free-week-banner__icon" aria-hidden="true">🎁</span>
        <div className="free-week-banner__text">
          <strong>7 days of full premium access — free.</strong>
          <span> Predictions, props, Scout AI reports, and odds across 7+ books.</span>
        </div>
        <Link to={ctaHref} className="free-week-banner__cta">
          {ctaLabel}
        </Link>
      </div>
      <button
        type="button"
        className="free-week-banner__close"
        onClick={handleDismiss}
        aria-label="Dismiss promotion"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
