import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './upgrade-page.css';

const PLAN_LABELS = {
  day_pass: 'Day Pass',
  weekly:   'Weekly',
  monthly:  'Monthly',
};

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const planKey   = searchParams.get('plan');
  const planLabel = PLAN_LABELS[planKey] || 'Premium';
  const { user, refreshUser } = useAuth();

  // 'loading' | 'success' | 'processing'
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    const waitForPremium = async (retries = 6, delay = 2000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const profile = await refreshUser();
          if (profile?.subscription_tier === 'premium') {
            if (!cancelled) setStatus('success');
            return;
          }
        } catch {
          // network blip — keep retrying
        }
        if (cancelled) return;
        await new Promise(r => setTimeout(r, delay));
      }
      // Webhook hasn't fired within ~12s — show processing message
      if (!cancelled) setStatus('processing');
    };

    waitForPremium();
    return () => { cancelled = true; };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="upgrade-page">
      <div className="upgrade-hero" style={{ marginBottom: '2rem' }}>

        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
            <span className="upgrade-eyebrow">Activating your subscription…</span>
            <h1 className="upgrade-title">Hang tight!</h1>
            <p className="upgrade-sub">
              We're confirming your payment. This usually takes just a few seconds.
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <span className="upgrade-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <span className="upgrade-eyebrow">Welcome to Premium</span>
            <h1 className="upgrade-title">
              You're all set,{' '}
              <span className="upgrade-title--accent">
                {user?.displayName?.split(' ')[0] || 'friend'}!
              </span>
            </h1>
            <p className="upgrade-sub">
              Your <strong style={{ color: '#fff' }}>{planLabel}</strong> subscription is now
              active. Every game prediction, pitcher prop, batter prop, and Scout AI scouting
              report is now unlocked.
            </p>
          </>
        )}

        {status === 'processing' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
            <span className="upgrade-eyebrow">Payment received</span>
            <h1 className="upgrade-title">
              Your subscription is{' '}
              <span className="upgrade-title--accent">being processed.</span>
            </h1>
            <p className="upgrade-sub">
              It can take a minute or two for your account to be upgraded. Check your email for a
              receipt, then refresh this page or visit Account Settings.
            </p>
          </>
        )}
      </div>

      {(status === 'success' || status === 'processing') && (
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
      )}

      <p className="upgrade-disclaimer" style={{ marginTop: '1.5rem' }}>
        A receipt has been sent to your email. You can manage or cancel your subscription at
        any time from Account Settings.
      </p>
    </div>
  );
}
