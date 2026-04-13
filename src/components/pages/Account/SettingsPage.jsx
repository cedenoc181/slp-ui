import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import userProfileService from '../../../data/services/userProfileService';
import stripeService from '../../../data/services/stripeService';
import { TEAMS } from '../../../data/constants/apiConstants';

function SettingsPage() {
  const {
    isAuthenticated, loading, user,
    logout, logoutAll,
    updateProfile, updatePreferences, changePassword, deleteAccount,
    subscriptionTier, subscriptionStatus, paymentSource, subscriptionPlan,
    refreshUser,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!loading && !isAuthenticated) navigate('/account');
  }, [isAuthenticated, loading, navigate]);

  // -------------------------------------------------------------------------
  // Profile + preferences form state (seeded from user object)
  // -------------------------------------------------------------------------
  const [profile, setProfile] = useState({ displayName: '', favoriteTeamId: '' });
  const [prefs, setPrefs] = useState({ emailUpdates: true, weeklyDigest: false, breakingNews: true });

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.displayName || '',
        favoriteTeamId: user.favoriteTeamId ?? '',
      });
      setPrefs({
        emailUpdates: user.emailUpdates ?? true,
        weeklyDigest: user.weeklyDigest ?? false,
        breakingNews: user.breakingNews ?? true,
      });
    }
  }, [user]);

  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'

  // -------------------------------------------------------------------------
  // Change password inline form
  // -------------------------------------------------------------------------
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [pwError, setPwError] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);

  // -------------------------------------------------------------------------
  // Delete account confirmation
  // -------------------------------------------------------------------------
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Billing / subscription
  // -------------------------------------------------------------------------
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError,   setBillingError]   = useState('');
  const [changingPlan,   setChangingPlan]   = useState(null); // null | plan key
  const [changeSuccess,  setChangeSuccess]  = useState('');

  const PLAN_LABELS = { day_pass: 'Day Pass', weekly: 'Weekly', monthly: 'Monthly' };
  const PLAN_PRICES = {
    day_pass: process.env.REACT_APP_PREMIUM_PRICE_DAILY  || '—',
    weekly:   process.env.REACT_APP_PREMIUM_PRICE_WEEKLY || '—',
    monthly:  process.env.REACT_APP_PREMIUM_PRICE        || '—',
  };
  const PLAN_PERIODS = { day_pass: '/day', weekly: '/week', monthly: '/month' };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    setBillingError('');
    try {
      const { portal_url } = await stripeService.getPortalUrl();
      window.location.href = portal_url;
    } catch (err) {
      setBillingError(err.message || 'Unable to open billing portal. Please try again.');
      setBillingLoading(false);
    }
  };

  const handleChangePlan = async (plan) => {
    setChangingPlan(plan);
    setBillingError('');
    setChangeSuccess('');
    try {
      await stripeService.changePlan(plan);
      await refreshUser();
      setChangeSuccess(`Switched to ${PLAN_LABELS[plan]}. Changes take effect immediately.`);
      setTimeout(() => setChangeSuccess(''), 5000);
    } catch (err) {
      setBillingError(err.message || 'Unable to change plan. Please try again.');
    } finally {
      setChangingPlan(null);
    }
  };

  const handleUpgrade = () => {
    navigate('/upgrade');
    window.scrollTo(0, 0);
  };

  // -------------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------------
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setSessionsLoading(true);
    userProfileService.getSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [isAuthenticated]);

  // -------------------------------------------------------------------------
  // MLB teams list — keyed by internal numeric teamId to match favorite_team_id
  // -------------------------------------------------------------------------
  const mlbTeams = [
    { id: '', name: 'Select a team...' },
    ...[...TEAMS].sort((a, b) => a.name.localeCompare(b.name)).map(t => ({
      id: t.teamId,
      name: t.name,
    })),
  ];

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await updateProfile({
        display_name: profile.displayName.trim() || null,
        favorite_team_id: profile.favoriteTeamId !== '' ? Number(profile.favoriteTeamId) : null,
      });
      await updatePreferences({
        email_updates: prefs.emailUpdates,
        weekly_digest: prefs.weeklyDigest,
        breaking_news: prefs.breakingNews,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError('Please fill in all fields.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    setPwStatus('saving');
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwStatus('saved');
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => { setPwStatus(null); setShowPwForm(false); }, 3000);
    } catch (err) {
      setPwError(err?.message || 'Failed to change password.');
      setPwStatus('error');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/');
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Failed to delete account:', err);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokingId(sessionId);
    try {
      await userProfileService.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to revoke session:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    window.scrollTo(0, 0);
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    navigate('/');
    window.scrollTo(0, 0);
  };

  if (loading) return null;

  return (
    <section className="settings-page">
      <div className="container">
        <h1 className="page-title">Account Settings</h1>
        <p className="page-subtitle">Manage your profile, preferences, and privacy settings</p>

        <div className="settings-layout">
          {/* Sidebar nav */}
          <nav className="settings-nav">
            <a href="#profile" className="settings-nav-item active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>
              </svg>
              Profile
            </a>
            <a href="#notifications" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Notifications
            </a>
            <a href="#account" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Account
            </a>
            <a href="#subscription" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Subscription
            </a>
            <a href="#sessions" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Sessions
            </a>
            <button type="button" className="settings-nav-item logout" onClick={handleLogout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </nav>

          {/* Settings content — both blocks wrapped so grid places them in column 2 */}
          <div className="settings-content-col">
          <form className="settings-content" onSubmit={handleSaveSettings}>

            {/* Profile Section */}
            <section id="profile" className="settings-section">
              <div className="section-header">
                <h2>Profile Settings</h2>
                <p>Customize how you appear on the platform</p>
              </div>
              <div className="settings-group">
                <div className="setting-item">
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    type="text"
                    id="displayName"
                    value={profile.displayName}
                    onChange={(e) => setProfile(p => ({ ...p, displayName: e.target.value }))}
                    placeholder="Enter your display name"
                    maxLength={30}
                  />
                  <span className="setting-hint">This name will be visible on your profile</span>
                </div>
                <div className="setting-item">
                  <label htmlFor="favoriteTeam">Favorite Team</label>
                  <select
                    id="favoriteTeam"
                    value={profile.favoriteTeamId}
                    onChange={(e) => setProfile(p => ({ ...p, favoriteTeamId: e.target.value }))}
                  >
                    {mlbTeams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  <span className="setting-hint">Personalize your experience with team highlights</span>
                </div>
              </div>
            </section>

            {/* Notifications Section */}
            <section id="notifications" className="settings-section">
              <div className="section-header">
                <h2>Notification Preferences</h2>
                <p>Control what updates you receive</p>
              </div>
              <div className="settings-group">
                {[
                  { key: 'emailUpdates', label: 'Email Updates', hint: 'Receive important platform updates and announcements', disabled: false },
                  { key: 'weeklyDigest', label: 'Weekly Digest', hint: 'Get a summary of top MLB stats and insights each week', disabled: true },
                  { key: 'breakingNews', label: 'Breaking News Alerts', hint: 'Instant notifications for major MLB news and updates', disabled: true },
                ].map(({ key, label, hint, disabled }) => (
                  <div key={key} className={`setting-item toggle${disabled ? ' setting-item--disabled' : ''}`}>
                    <div className="setting-info">
                      <label htmlFor={key}>{label}</label>
                      <span className="setting-hint">{disabled ? 'Coming soon' : hint}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        id={key}
                        checked={prefs[key]}
                        disabled={disabled}
                        onChange={(e) => setPrefs(p => ({ ...p, [key]: e.target.checked }))}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {/* Save button */}
            <div className="settings-footer">
              <button type="submit" className="save-btn" disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving…' : 'Save Changes'}
              </button>
              {saveStatus === 'saved' && <span className="save-success">✓ Settings saved</span>}
              {saveStatus === 'error' && <span className="save-error">✗ Failed to save. Please try again.</span>}
            </div>
          </form>

          {/* ----------------------------------------------------------------
              Subscription
          ---------------------------------------------------------------- */}
          <div className="settings-content settings-account-panel">
            <section id="subscription" className="settings-section">
              <div className="section-header">
                <h2>Subscription</h2>
                <p>Manage your plan and billing</p>
              </div>

              {subscriptionTier === 'premium' ? (
                <div className="sub-card sub-card--premium">
                  <div className="sub-card__header">
                    <div className="sub-card__plan-info">
                      <span className="sub-card__badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        Premium
                      </span>
                      <h3 className="sub-card__plan-name">
                        {PLAN_LABELS[subscriptionPlan] || 'Premium'} Plan
                      </h3>
                      <div className="sub-card__meta">
                        {subscriptionStatus && (
                          <span className={`sub-card__status sub-card__status--${subscriptionStatus.toLowerCase()}`}>
                            {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
                          </span>
                        )}
                        {paymentSource && (
                          <span className="sub-card__source">
                            via {paymentSource === 'stripe' ? 'Stripe' : paymentSource === 'whop' ? 'Whop' : paymentSource}
                          </span>
                        )}
                      </div>
                    </div>
                    {subscriptionPlan && (
                      <div className="sub-card__price-display">
                        <span className="sub-card__price-amount">${PLAN_PRICES[subscriptionPlan]}</span>
                        <span className="sub-card__price-period">{PLAN_PERIODS[subscriptionPlan]}</span>
                      </div>
                    )}
                  </div>

                  <div className="sub-card__features">
                    {[
                      'Game Predictions',
                      'Pitcher & Batter Props',
                      'Scout AI Scouting Reports',
                      'Odds Across 7+ Books',
                    ].map(f => (
                      <div key={f} className="sub-card__feature">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>

                  <div className="sub-card__actions">

                    {/* ── Plan switcher (Stripe only, non-cancelled) ── */}
                    {paymentSource === 'stripe' && subscriptionStatus !== 'canceled' && subscriptionStatus !== 'cancelled' && (
                      <div className="sub-plan-switcher">
                        <p className="sub-plan-switcher__label">Your plan</p>
                        <div className="sub-plan-switcher__options">
                          {['day_pass', 'weekly', 'monthly'].map(plan => {
                            const isCurrent = plan === subscriptionPlan;
                            return (
                              <button
                                key={plan}
                                type="button"
                                className={`sub-plan-option${isCurrent ? ' sub-plan-option--current' : ''}`}
                                onClick={() => !isCurrent && handleChangePlan(plan)}
                                disabled={isCurrent || !!changingPlan || billingLoading}
                              >
                                {changingPlan === plan ? (
                                  <span className="sub-card__spinner" />
                                ) : (
                                  <>
                                    {isCurrent && <span className="sub-plan-option__tag">Current</span>}
                                    <span className="sub-plan-option__name">{PLAN_LABELS[plan]}</span>
                                    <span className="sub-plan-option__price">${PLAN_PRICES[plan]}{PLAN_PERIODS[plan]}</span>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {changeSuccess && <p className="sub-card__success">{changeSuccess}</p>}
                        <p className="sub-card__hint">Switching plans is prorated — you'll only pay the difference.</p>
                      </div>
                    )}

                    {/* ── Billing buttons ── */}
                    <div className="sub-card__btn-row">
                      {paymentSource === 'stripe' ? (
                        <button
                          type="button"
                          className="sub-card__btn sub-card__btn--primary"
                          onClick={handleManageBilling}
                          disabled={billingLoading || !!changingPlan}
                        >
                          {billingLoading ? (
                            <span className="sub-card__spinner" />
                          ) : (
                            <>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                              </svg>
                              Manage Billing
                            </>
                          )}
                        </button>
                      ) : paymentSource === 'whop' ? (
                        <a
                          href="https://whop.com/sandlot-picks/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sub-card__btn sub-card__btn--primary"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Manage on Whop
                        </a>
                      ) : null}
                    </div>

                    <p className="sub-card__hint">
                      {paymentSource === 'whop'
                        ? 'Subscribed via Whop — manage billing and cancellation on the Whop platform.'
                        : 'Update payment method, download invoices, or cancel via the Stripe billing portal.'}
                    </p>
                    {billingError && <p className="sub-card__error">{billingError}</p>}
                  </div>
                </div>
              ) : (
                <div className="sub-card sub-card--free">
                  <div className="sub-card__header">
                    <div className="sub-card__plan-info">
                      <span className="sub-card__badge sub-card__badge--free">Free</span>
                      <h3 className="sub-card__plan-name">Free Plan</h3>
                      <p className="sub-card__free-desc">Upgrade to unlock game predictions, pitcher props, batter props, and Scout AI scouting reports.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="sub-card__btn sub-card__btn--upgrade"
                    onClick={handleUpgrade}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Upgrade to Premium
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* ----------------------------------------------------------------
              Account Management — outside the main form so buttons don't
              accidentally submit it.
          ---------------------------------------------------------------- */}
          <div className="settings-content settings-account-panel">

            {/* Account Section */}
            <section id="account" className="settings-section">
              <div className="section-header">
                <h2>Account Management</h2>
                <p>Manage your account security and data</p>
              </div>
              <div className="settings-group">

                {/* Email */}
                <div className="account-action">
                  <div className="action-info">
                    <h4>Email Address</h4>
                    <p>{user?.email}</p>
                  </div>
                </div>

                {/* Change Password */}
                <div className="account-action">
                  <div className="action-info">
                    <h4>Change Password</h4>
                    <p>Update your account password for security.</p>
                  </div>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => { setShowPwForm(f => !f); setPwError(''); setPwStatus(null); }}
                  >
                    {showPwForm ? 'Cancel' : 'Change Password'}
                  </button>
                </div>

                {showPwForm && (
                  <form className="inline-form" onSubmit={handleChangePassword}>
                    <div className="form-group">
                      <label htmlFor="pw-current">Current Password</label>
                      <input
                        type="password"
                        id="pw-current"
                        placeholder="••••••••"
                        value={pwForm.current}
                        onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="pw-next">New Password</label>
                      <input
                        type="password"
                        id="pw-next"
                        placeholder="••••••••"
                        value={pwForm.next}
                        onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="pw-confirm">Confirm New Password</label>
                      <input
                        type="password"
                        id="pw-confirm"
                        placeholder="••••••••"
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      />
                    </div>
                    {pwError && <p className="inline-form-error">{pwError}</p>}
                    <button type="submit" className="action-btn" disabled={pwStatus === 'saving'}>
                      {pwStatus === 'saving' ? 'Updating…' : pwStatus === 'saved' ? '✓ Password Updated' : 'Update Password'}
                    </button>
                  </form>
                )}

                {/* Sign out all devices */}
                <div className="account-action">
                  <div className="action-info">
                    <h4>Sign Out All Devices</h4>
                    <p>Revoke all active sessions across every device.</p>
                  </div>
                  <button type="button" className="action-btn" onClick={handleLogoutAll}>
                    Sign Out All
                  </button>
                </div>

                {/* Delete Account */}
                <div className="account-action danger">
                  <div className="action-info">
                    <h4>Delete Account</h4>
                    <p>{deleteConfirm ? 'This cannot be undone. All your data will be permanently removed.' : 'Permanently delete your account and all associated data.'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="action-btn danger"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting…' : deleteConfirm ? 'Confirm Delete' : 'Delete Account'}
                    </button>
                    {deleteConfirm && (
                      <button type="button" className="action-btn" onClick={() => setDeleteConfirm(false)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Sessions Section */}
            <section id="sessions" className="settings-section">
              <div className="section-header">
                <h2>Active Sessions</h2>
                <p>Devices currently signed in to your account</p>
              </div>
              <div className="settings-group">
                {sessionsLoading ? (
                  <p className="setting-hint">Loading sessions…</p>
                ) : sessions.length === 0 ? (
                  <p className="setting-hint">No active sessions found.</p>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id} className="account-action">
                      <div className="action-info">
                        <h4 style={{ fontSize: '0.9rem' }}>{session.device_info || 'Unknown device'}</h4>
                        <p>
                          {session.ip_address && `IP: ${session.ip_address} · `}
                          {session.last_active_at
                            ? `Last active: ${new Date(session.last_active_at).toLocaleString()}`
                            : `Started: ${new Date(session.created_at).toLocaleString()}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="action-btn danger"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                      >
                        {revokingId === session.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
          </div>{/* end settings-content-col */}
        </div>

        <div className="settings-back">
          <button type="button" className="logout-link" onClick={handleLogout}>
            ← Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
