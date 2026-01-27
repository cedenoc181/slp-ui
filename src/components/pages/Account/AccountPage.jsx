import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function AccountPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="account-page">
      <div className="container">
        <h1 className="page-title">Account</h1>
        <p className="page-subtitle">
          Sign in to access full analytics or create a free account to unlock more features
        </p>

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
            
            <form className="auth-form">
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input 
                  type="email" 
                  id="login-email" 
                  placeholder="your.email@example.com"
                  disabled
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input 
                  type="password" 
                  id="login-password" 
                  placeholder="••••••••"
                  disabled
                />
              </div>
              <button type="button" className="auth-btn primary" disabled>
                Sign In
              </button>
            </form>
            
            <p className="auth-note">Coming Soon</p>
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
            
            <form className="auth-form">
              <div className="form-group">
                <label htmlFor="register-email">Email</label>
                <input 
                  type="email" 
                  id="register-email" 
                  placeholder="your.email@example.com"
                  disabled
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-password">Password</label>
                <input 
                  type="password" 
                  id="register-password" 
                  placeholder="••••••••"
                  disabled
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-confirm">Confirm Password</label>
                <input 
                  type="password" 
                  id="register-confirm" 
                  placeholder="••••••••"
                  disabled
                />
              </div>
              <button type="button" className="auth-btn secondary" disabled>
                Create Free Account
              </button>
            </form>
            
            <p className="auth-note">Coming Soon</p>
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
                <li>✓ Save Favorites</li>
              </ul>
            </div>
            <div className="tier-card premium">
              <h4>Premium</h4>
              <p>Coming soon</p>
              <ul>
                <li>✓ Everything in Free</li>
                <li>✓ Game Predictions</li>
                <li>✓ Advanced Analytics</li>
                <li>✓ Historical Data</li>
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
