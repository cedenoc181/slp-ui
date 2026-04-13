import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import userProfileService from '../../../data/services/userProfileService';
import './upgrade-page.css';

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user, updateProfile } = useAuth();

  // Re-fetch the user profile so AuthContext picks up the new subscription_tier.
  // session_id is available for backend verification if needed in the future.
  useEffect(() => {
    userProfileService.getProfile()
      .then(profile => {
        if (profile) updateProfile({}).catch(() => {});
      })
      .catch(() => {});
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="upgrade-page">
      <div className="upgrade-hero" style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <span className="upgrade-eyebrow">Welcome to Premium</span>
        <h1 className="upgrade-title">
          You're all set,{' '}
          <span className="upgrade-title--accent">
            {user?.displayName?.split(' ')[0] || 'friend'}!
          </span>
        </h1>
        <p className="upgrade-sub">
          Your Premium subscription is now active. Every game prediction, pitcher prop, batter
          prop, and Scout AI scouting report is now unlocked.
        </p>
      </div>

      <div className="upgrade-body" style={{ gap: '1rem' }}>
        <button
          className="upgrade-card__cta"
          onClick={() => { navigate('/predictions/games'); window.scrollTo(0, 0); }}
        >
          View Today's Game Predictions
        </button>
        <button
          className="upgrade-card__cta"
          style={{ background: 'rgba(255,255,255,0.07)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
          onClick={() => { navigate('/account/settings'); window.scrollTo(0, 0); }}
        >
          Manage Billing
        </button>
      </div>

      <p className="upgrade-disclaimer" style={{ marginTop: '1.5rem' }}>
        A receipt has been sent to your email. You can manage or cancel your subscription at
        any time from Account Settings.
      </p>
    </div>
  );
}
