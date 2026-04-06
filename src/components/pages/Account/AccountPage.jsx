import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

function AccountPage() {
  const { isAuthenticated, loading, login, register, requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password visibility
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Forgot password states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!loading && isAuthenticated) {
      navigate('/account/settings');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      setError('Please enter both email and password');
      return;
    }

    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      // Redirect handled by useEffect when isAuthenticated flips
    } catch (err) {
      setError(mapAuthError(err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!registerEmail || !registerPassword || !registerConfirm) {
      setError('Please fill in all fields');
      return;
    }

    if (registerPassword !== registerConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register(registerEmail, registerPassword);
      // Auto-login immediately after successful registration
      await login(registerEmail, registerPassword);
      // Redirect handled by useEffect when isAuthenticated flips
    } catch (err) {
      setError(mapAuthError(err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail) { setForgotError('Please enter your email.'); return; }
    setForgotSubmitting(true);
    try {
      await requestPasswordReset(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setForgotError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  function mapAuthError(msg) {
    if (!msg) return 'Something went wrong. Please try again.';
    if (msg.includes('Invalid email or password')) return 'Incorrect email or password. Please try again.';
    if (msg.includes('Email already registered')) return 'An account with this email already exists. Try signing in.';
    if (msg.includes('Account is deactivated')) return 'This account has been deactivated. Contact support for help.';
    if (msg.includes('at least 6')) return 'Password must be at least 6 characters.';
    return msg;
  }

  if (loading) return null;

  return (
    <section className="account-page">
      <div className="container">
        <h1 className="page-title">Account</h1>
        <p className="page-subtitle">
          Sign in to access full analytics or create a free account to unlock more features
        </p>

        {error && (
          <div className="auth-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="auth-container">
          {/* Login Card */}
          <div className="auth-card">
            <div className="auth-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </div>
            <h2>Sign In</h2>
            <p>Already have an account? Sign in to access your personalized dashboard and saved analytics.</p>

            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  type="email"
                  id="login-email"
                  placeholder="your.email@example.com"
                  autoComplete="new-password"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="auth-btn primary" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Forgot password */}
            {!showForgot ? (
              <button
                className="auth-btn-link"
                onClick={() => { setShowForgot(true); setForgotSent(false); setForgotError(''); }}
              >
                Forgot password?
              </button>
            ) : (
              <div className="forgot-password-panel">
                {forgotSent ? (
                  <p className="forgot-success">
                    Check your inbox — if that email is registered, a reset link is on its way.
                  </p>
                ) : (
                  <form className="auth-form" onSubmit={handleForgotPassword}>
                    <p className="forgot-label">Enter your email and we'll send a reset link.</p>
                    {forgotError && <p className="forgot-error">{forgotError}</p>}
                    <div className="form-group">
                      <label htmlFor="forgot-email">Email</label>
                      <input
                        type="email"
                        id="forgot-email"
                        placeholder="your.email@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="auth-btn primary" disabled={forgotSubmitting}>
                      {forgotSubmitting ? 'Sending…' : 'Send Reset Link'}
                    </button>
                  </form>
                )}
                <button
                  className="auth-btn-link"
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotError(''); }}
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>

          {/* Register Card */}
          <div className="auth-card">
            <div className="auth-icon register">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <h2>Create Account</h2>
            <p>Sign up for free to unlock Player Analytics, Team Analytics, and personalized features.</p>

            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="register-email">Email</label>
                <input
                  type="email"
                  id="register-email"
                  placeholder="your.email@example.com"
                  autoComplete="off"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-password">Password</label>
                <div className="password-input-wrap">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    id="register-password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowRegPassword(v => !v)}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="register-confirm">Confirm Password</label>
                <div className="password-input-wrap">
                  <input
                    type={showRegConfirm ? 'text' : 'password'}
                    id="register-confirm"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={registerConfirm}
                    onChange={(e) => setRegisterConfirm(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowRegConfirm(v => !v)}
                    aria-label={showRegConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showRegConfirm ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" className="auth-btn secondary" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create Free Account'}
              </button>
            </form>
          </div>
        </div>

        {/* Access Tiers Info */}
        <div className="access-info">
          <h3>What You Get With an Account</h3>
          <div className="access-tiers">
            <div className="tier-card guest">
              <h4>Guest Access</h4>
              <p>No account needed</p>
              <ul>
                <li>✓ MLB Standings</li>
                <li>✓ Baseball Glossary</li>
                <li>✓ Sandlot Insider Articles</li>
                <li>✓ Strategy Blog</li>
                <li>✓ Educational Resources</li>
              </ul>
            </div>
            <div className="tier-card free">
              <h4>Free Account</h4>
              <p>Sign up for free</p>
              <ul>
                <li>✓ Everything in Guest</li>
                <li>✓ Player Analytics</li>
                <li>✓ Team Analytics</li>
                <li>✓ Advanced Filters</li>
                <li>✓ Historical Data</li>
              </ul>
            </div>
            <div className="tier-card premium">
              <h4>Premium</h4>
              <p>Coming soon</p>
              <ul>
                <li>✓ Everything in Free</li>
                <li>✓ Game Predictions</li>
                <li>✓ Advanced Analytics Tools</li>
                <li>✓ Personalized Experience</li>
                <li>✓ Priority Support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="account-cta">
          <p>Questions about accounts? Check out our <Link to="/faqs" onClick={() => window.scrollTo(0, 0)}>FAQs</Link> or <Link to="/contact" onClick={() => window.scrollTo(0, 0)}>contact us</Link>.</p>
        </div>
      </div>
    </section>
  );
}

export default AccountPage;
