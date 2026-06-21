import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail } = useAuth();

  // Email passed from registration redirect
  const registeredEmail = location.state?.email || null;

  // Token-processing states
  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const hasRun = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;

    verifyEmail(token)
      .then(() => {
        setVerified(true);
        setVerifying(false);
      })
      .catch((err) => {
        const msg = err?.message || '';
        if (msg.toLowerCase().includes('expired')) {
          setVerifyError('This verification link has expired. Please request a new one.');
        } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('not found')) {
          setVerifyError('This verification link is invalid or has already been used.');
        } else {
          setVerifyError(msg || 'Verification failed. Please try again.');
        }
        setVerifying(false);
      });
  }, [token, verifyEmail]);

  // ── Token: verifying ─────────────────────────────────────────────────────
  if (token && verifying) {
    return (
      <section className="account-page">
        <div className="container">
          <div className="auth-card" style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
            <div className="auth-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
            <h2>Verifying your email…</h2>
            <p>Just a moment.</p>
          </div>
        </div>
      </section>
    );
  }

  // ── Token: success ───────────────────────────────────────────────────────
  if (token && verified) {
    return (
      <section className="account-page">
        <div className="container">
          <div className="auth-card" style={{ maxWidth: 480, margin: '4rem auto' }}>
            <div className="auth-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Email Verified</h2>
            <p>Your account is now active. Sign in to get started.</p>
            <button className="auth-btn primary" onClick={() => navigate('/account')}>
              Sign In
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Token: error ─────────────────────────────────────────────────────────
  if (token && verifyError) {
    return (
      <section className="account-page">
        <div className="container">
          <div className="auth-card" style={{ maxWidth: 480, margin: '4rem auto' }}>
            <div className="auth-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E31837" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Verification Failed</h2>
            <p>{verifyError}</p>
            <button className="auth-btn primary" onClick={() => navigate('/account')}>
              Back to Sign In
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── No token: holding page (post-registration) ───────────────────────────
  return (
    <section className="account-page">
      <div className="container">
        <div className="auth-card verify-email-card" style={{ maxWidth: 520, margin: '4rem auto' }}>
          <div className="auth-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2>Check your inbox</h2>
          {registeredEmail ? (
            <p>
              We sent a verification link to <strong>{registeredEmail}</strong>.
              Click the link in that email to activate your account.
            </p>
          ) : (
            <p>
              A verification link was sent to your email address.
              Click the link to activate your account.
            </p>
          )}
          <p className="verify-email-hint">
            Didn't get it? Check your spam folder. The link expires in 24 hours.
          </p>
          <button className="auth-btn secondary" onClick={() => navigate('/account')}>
            Back to Sign In
          </button>
        </div>
      </div>
    </section>
  );
}

export default VerifyEmailPage;
