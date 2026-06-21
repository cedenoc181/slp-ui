import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!token) {
    return (
      <section className="account-page">
        <div className="container">
          <div className="auth-card" style={{ maxWidth: 480, margin: '4rem auto' }}>
            <div className="auth-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2>Invalid Link</h2>
            <p>This password reset link is missing or invalid. Please request a new one from the sign-in page.</p>
            <button className="auth-btn primary" onClick={() => navigate('/account')}>
              Back to Sign In
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (success) {
    return (
      <section className="account-page">
        <div className="container">
          <div className="auth-card" style={{ maxWidth: 480, margin: '4rem auto' }}>
            <div className="auth-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2>Password Updated</h2>
            <p>Your password has been reset successfully. You can now sign in with your new password.</p>
            <button className="auth-btn primary" onClick={() => navigate('/account')}>
              Sign In
            </button>
          </div>
        </div>
      </section>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('expired') || msg.includes('invalid')) {
        setError('This reset link has expired or is invalid. Please request a new one.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="account-page">
      <div className="container">
        <h1 className="page-title">Reset Password</h1>
        <p className="page-subtitle">Enter a new password for your account.</p>

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

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="auth-card" style={{ maxWidth: 480, width: '100%' }}>
            <div className="auth-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2>Choose New Password</h2>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="auth-btn primary" disabled={submitting}>
                {submitting ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ResetPasswordPage;
