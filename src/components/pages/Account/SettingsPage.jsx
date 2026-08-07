import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import userProfileService from '../../../data/services/userProfileService';
import stripeService from '../../../data/services/stripeService';
import { TEAMS, SPORTSBOOKS, US_STATES } from '../../../data/constants/apiConstants';
import AlertInbox from '../../AlertInbox';

function SettingsPage() {
  const {
    isAuthenticated, loading, user, isAdmin,
    logout, logoutAll,
    updateProfile, updatePreferences, changePassword, deleteAccount,
    subscriptionTier, subscriptionStatus, paymentSource, subscriptionPlan, subscriptionExpiresAt,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!loading && !isAuthenticated) navigate('/account');
  }, [isAuthenticated, loading, navigate]);

  // -------------------------------------------------------------------------
  // Profile + preferences form state (seeded from user object)
  // -------------------------------------------------------------------------
  const [profile, setProfile] = useState({ displayName: '', favoriteTeamId: '', preferredBook: '', state: '' });
  const [prefs, setPrefs] = useState({ emailUpdates: true, weeklyDigest: false, breakingNews: true });

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.displayName || '',
        favoriteTeamId: user.favoriteTeamId ?? '',
        preferredBook: user.preferredBook ?? '',
        state: user.stateCode ?? '',
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
  const [changeSuccess] = useState('');
  const [planModal, setPlanModal] = useState(null); // null | 'weekly' | 'annual'
  const [codeCopied, setCodeCopied] = useState(false);
  const [freeWeekLoading, setFreeWeekLoading] = useState(false);

  const FREE_WEEK_CODE = process.env.REACT_APP_FREE_WEEK_CODE || 'FREE7';

  const PLAN_LABELS  = { weekly: 'Weekly', monthly: 'Monthly', annual: 'Seasonal', gifted: 'VIP Access' };
  const isVip = subscriptionPlan === 'gifted';
  const PLAN_PRICES  = {
    weekly:  process.env.REACT_APP_PREMIUM_PRICE_WEEKLY || '—',
    monthly: process.env.REACT_APP_PREMIUM_PRICE        || '—',
    annual:  process.env.REACT_APP_PREMIUM_PRICE_ANNUAL || '—',
  };
  const PLAN_PERIODS = { weekly: '/week', monthly: '/month', annual: '/season' };

  const isCancelled = subscriptionStatus === 'canceled' || subscriptionStatus === 'cancelled';
  const expiresDate = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
  const isExpired   = expiresDate ? expiresDate < new Date() : false;
  const canSwitch   = !isCancelled || isExpired; // locked while cancelled-but-still-active
  const expiryLabel = expiresDate
    ? expiresDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

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

  const handleUpgrade = () => {
    navigate('/upgrade');
    window.scrollTo(0, 0);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(FREE_WEEK_CODE);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch {
      // clipboard blocked — select/copy manually
    }
  };

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  const handleRedeemPromo = async () => {
    const code = (promoInput || FREE_WEEK_CODE).trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a promo code.');
      return;
    }
    setFreeWeekLoading(true);
    setPromoError('');
    // Hard timeout so a hanging/crashing gateway (the 502 path) can't leave the
    // button stuck spinning with no message.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const { checkout_url } = await stripeService.redeemPromo(code, { signal: controller.signal });
      window.location.href = checkout_url; // success — page leaves; keep spinner
    } catch (err) {
      // A 400 carries a human-readable `detail` (e.g. "You've already redeemed a
      // promotional code.") which we surface directly. Aborts (timeout), gateway/5xx,
      // or network failures have no useful detail — show a friendly fallback.
      const raw = err?.message || '';
      const isTechnical = err?.name === 'AbortError'
        || /request failed|failed to fetch|networkerror/i.test(raw);
      setPromoError(
        isTechnical
          ? 'We couldn’t redeem that code. It may already have been used, or the service is briefly unavailable — please try again.'
          : (raw || 'Unable to redeem code. Please try again.')
      );
      setFreeWeekLoading(false);
    } finally {
      clearTimeout(timer);
    }
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
      .then(async (list) => {
        const arr = Array.isArray(list) ? list : [];
        const MAX = 5;
        if (arr.length <= MAX) { setSessions(arr); return; }
        // Client-side stopgap: enforce the 5-session cap by revoking the
        // oldest-by-activity sessions, keeping the 5 most-recently-active
        // (which includes this device). NOTE: authoritative enforcement must
        // happen server-side at login/refresh issuance (see NeedsWiring
        // Feature 5) — this only trims when a user opens Settings.
        const sorted = [...arr].sort((a, b) =>
          new Date(b.last_active_at || b.created_at).getTime()
          - new Date(a.last_active_at || a.created_at).getTime()
        );
        const keep = sorted.slice(0, MAX);
        const drop = sorted.slice(MAX);
        await Promise.allSettled(drop.map(s => userProfileService.revokeSession(s.id)));
        setSessions(keep);
      })
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
        preferred_book: profile.preferredBook !== '' ? profile.preferredBook : null,
        state: profile.state !== '' ? profile.state : null,
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
            <a href="#inbox" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              </svg>
              Inbox
            </a>
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
            {isAdmin && (
              <a href="#admin-tools" className="settings-nav-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L3 7v6c0 5 3.8 9.5 9 11 5.2-1.5 9-6 9-11V7l-9-5z"/>
                </svg>
                Admin Tools
              </a>
            )}
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
          <AlertInbox />
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
                <div className="setting-item">
                  <label htmlFor="preferredBook">Preferred Sportsbook</label>
                  <select
                    id="preferredBook"
                    value={profile.preferredBook}
                    onChange={(e) => setProfile(p => ({ ...p, preferredBook: e.target.value }))}
                  >
                    <option value="">No preference</option>
                    {SPORTSBOOKS.map(book => (
                      <option key={book.value} value={book.value}>{book.label}</option>
                    ))}
                  </select>
                  <span className="setting-hint">Used to tailor "add to betslip" links to your book</span>
                </div>
                <div className="setting-item">
                  <label htmlFor="state">State</label>
                  <select
                    id="state"
                    value={profile.state}
                    onChange={(e) => setProfile(p => ({ ...p, state: e.target.value }))}
                  >
                    <option value="">Select a state...</option>
                    {US_STATES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <span className="setting-hint">Required for Caesars &amp; BetMGM betslip links</span>
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
                      <span className={`sub-card__badge${isVip ? ' sub-card__badge--vip' : ''}`}>
                        {isVip ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M5 3l3 6.5L12 4l4 5.5L19 3l2 9H3L5 3zm-2 11h18v2H3v-2zm2 4h14v2H5v-2z"/>
                            </svg>
                            VIP
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Premium
                          </>
                        )}
                      </span>
                      <h3 className="sub-card__plan-name">
                        {PLAN_LABELS[subscriptionPlan] || 'Premium'}
                      </h3>
                      {isVip && (
                        <p className="sub-card__vip-desc">Complimentary access — enjoy everything Premium has to offer.</p>
                      )}
                      <div className="sub-card__meta">
                        {subscriptionStatus && (
                          <span className={`sub-card__status sub-card__status--${subscriptionStatus.toLowerCase()}`}>
                            {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
                          </span>
                        )}
                        {!isVip && paymentSource && (
                          <span className="sub-card__source">
                            via {paymentSource === 'stripe' ? 'Stripe' : paymentSource === 'whop' ? 'Whop' : paymentSource}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isVip && subscriptionPlan && PLAN_PRICES[subscriptionPlan] && (
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
                      ...(['monthly', 'annual'].includes(subscriptionPlan) ? ['Beta Access to New Features', 'Model Performance Dashboard'] : []),
                    ].map(f => (
                      <div key={f} className="sub-card__feature">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>

                  {!isVip && <div className="sub-card__actions">

                    {/* ── Plan options — weekly subscribers ── */}
                    {paymentSource === 'stripe' && subscriptionPlan === 'weekly' && (
                      <div className="sub-plan-switcher">
                        <p className="sub-plan-switcher__label">Upgrade your plan</p>
                        <div className="sub-plan-switcher__options">
                          <button type="button" className="sub-plan-option sub-plan-option--current" disabled>
                            <span className="sub-plan-option__tag">Current</span>
                            <span className="sub-plan-option__name">Weekly</span>
                            <span className="sub-plan-option__price">${PLAN_PRICES.weekly}/week</span>
                            <span className="sub-plan-option__one-time">One-time</span>
                          </button>
                          <button
                            type="button"
                            className="sub-plan-option"
                            onClick={() => setPlanModal('monthly')}
                          >
                            <span className="sub-plan-option__name">Monthly</span>
                            <span className="sub-plan-option__price">${PLAN_PRICES.monthly}/month</span>
                            <span className="sub-plan-option__one-time">Recurring</span>
                          </button>
                          <button
                            type="button"
                            className="sub-plan-option"
                            onClick={() => setPlanModal('annual')}
                          >
                            <span className="sub-plan-option__name">Seasonal</span>
                            <span className="sub-plan-option__price">${PLAN_PRICES.annual}/year</span>
                            <span className="sub-plan-option__one-time">One-time</span>
                          </button>
                        </div>
                        <p className="sub-card__hint">
                          Your weekly access expires automatically. Purchase a monthly or annual plan anytime to extend your access.
                        </p>
                      </div>
                    )}

                    {/* ── Plan switcher — monthly subscribers only ── */}
                    {paymentSource === 'stripe' && subscriptionPlan === 'monthly' && (
                      <div className="sub-plan-switcher">
                        <p className="sub-plan-switcher__label">Switch plan</p>

                        {/* Cancelled — show expiry lock notice */}
                        {isCancelled && !isExpired && expiryLabel && (
                          <div className="sub-plan-expiry-notice">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            Your access continues until <strong>{expiryLabel}</strong>. You can purchase a new plan after that date.
                          </div>
                        )}

                        <div className="sub-plan-switcher__options">
                          {/* Current plan — always disabled */}
                          <button type="button" className="sub-plan-option sub-plan-option--current" disabled>
                            <span className="sub-plan-option__tag">Current</span>
                            <span className="sub-plan-option__name">Monthly</span>
                            <span className="sub-plan-option__price">${PLAN_PRICES.monthly}/month</span>
                          </button>

                          {/* Weekly */}
                          <button
                            type="button"
                            className="sub-plan-option"
                            onClick={canSwitch ? () => setPlanModal('weekly') : undefined}
                            disabled={!canSwitch || billingLoading}
                          >
                            <span className="sub-plan-option__name">Weekly</span>
                            <span className="sub-plan-option__price">${PLAN_PRICES.weekly}/week</span>
                            <span className="sub-plan-option__one-time">One-time</span>
                          </button>

                          {/* Annual */}
                          <button
                            type="button"
                            className="sub-plan-option"
                            onClick={canSwitch ? () => setPlanModal('annual') : undefined}
                            disabled={!canSwitch || billingLoading}
                          >
                            <span className="sub-plan-option__name">Seasonal</span>
                            <span className="sub-plan-option__price">${PLAN_PRICES.annual}/year</span>
                            <span className="sub-plan-option__one-time">One-time</span>
                          </button>
                        </div>

                        {!isCancelled && (
                          <p className="sub-card__hint">
                            To switch plans, cancel your monthly subscription via the Stripe billing portal. Once your current access expires, you'll be able to purchase any new plan.
                          </p>
                        )}
                      </div>
                    )}

                    {changeSuccess && <p className="sub-card__success">{changeSuccess}</p>}

                    {/* ── Billing buttons ── */}
                    <div className="sub-card__btn-row">
                      {paymentSource === 'stripe' && subscriptionPlan === 'monthly' ? (
                        <button
                          type="button"
                          className="sub-card__btn sub-card__btn--primary"
                          onClick={handleManageBilling}
                          disabled={billingLoading}
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
                        : subscriptionPlan === 'monthly'
                          ? 'Update payment method, download invoices, or cancel via the Stripe billing portal.'
                          : 'This is a one-time purchase — no recurring charges. Your access expires automatically.'}
                    </p>
                    {billingError && <p className="sub-card__error">{billingError}</p>}
                  </div>}
                </div>
              ) : (
                <>
                  {/* Free week trial card — only visible for never-subscribed users */}
                  {!subscriptionPlan && (
                    <div className="free-week-card">
                      <div className="free-week-card__header">
                        <span className="free-week-card__badge">🎁 Welcome Gift</span>
                        <h3 className="free-week-card__title">Your first week is on us</h3>
                        <p className="free-week-card__desc">
                          Redeem this code at checkout to unlock 7 days of full premium access — free.
                          Game predictions, pitcher &amp; batter props, Scout AI reports, and odds across 7+ books.
                        </p>
                      </div>

                      <div className="free-week-card__code-block">
                        <div className="free-week-card__code-label">Your promo code</div>
                        <div className="free-week-card__code-hint-row">
                          <button
                            type="button"
                            className="free-week-card__code free-week-card__code--display"
                            onClick={handleCopyCode}
                            aria-label="Copy code"
                          >
                            <span>{FREE_WEEK_CODE}</span>
                            {codeCopied ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            )}
                          </button>
                        </div>
                        <span className="free-week-card__hint">
                          {codeCopied ? 'Copied — paste below and click Redeem.' : 'Tap code to copy, then paste in the box below.'}
                        </span>
                      </div>

                      <div className="free-week-card__redeem-row">
                        <input
                          type="text"
                          className="free-week-card__input"
                          placeholder="Enter promo code"
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value); setPromoError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRedeemPromo(); }}
                          disabled={freeWeekLoading}
                          maxLength={40}
                          autoCapitalize="characters"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="free-week-card__cta"
                          onClick={handleRedeemPromo}
                          disabled={freeWeekLoading}
                        >
                          {freeWeekLoading ? (
                            <span className="sub-card__spinner" />
                          ) : (
                            <>
                              Redeem
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                <polyline points="12 5 19 12 12 19"/>
                              </svg>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="free-week-card__footnote">
                        You'll be redirected to Stripe to confirm — no charge for the trial week.
                      </p>
                      {promoError && <p className="sub-card__error">{promoError}</p>}
                    </div>
                  )}

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
                      See All Plans
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* ── Plan info modal ────────────────────────────────────────── */}
          {planModal && (() => {
            const MODAL_CONTENT = {
              weekly: {
                name: 'Weekly Access',
                price: `$${PLAN_PRICES.weekly}`,
                period: 'one-time',
                tag: 'One-time purchase · No renewal',
                desc: 'Get full access to every prediction, prop, and Scout AI scouting report for 7 days.',
                details: [
                  'Access begins immediately upon payment.',
                  'Expires exactly 7 days after purchase — no auto-renewal.',
                  'Includes game predictions, pitcher props, batter props, and Scout AI.',
                  'Odds updated daily across 7+ sportsbooks.',
                  'No subscription, no cancellation needed.',
                ],
                cta: 'Get Weekly Access',
                plan: 'weekly',
              },
              monthly: {
                name: 'Monthly Subscription',
                price: `$${PLAN_PRICES.monthly}`,
                period: '/month',
                tag: 'Recurring · Cancel anytime',
                desc: 'Full access every day of the month, automatically renewed until you cancel.',
                details: [
                  'Access begins immediately upon payment.',
                  'Renews automatically each month — cancel anytime from Account Settings.',
                  'Includes game predictions, pitcher props, batter props, and Scout AI.',
                  'Odds updated daily across 7+ sportsbooks.',
                  'Cancel before your next billing date and you keep access until the period ends.',
                  'Early beta access to new features as they are developed.',
                  'Model Performance Dashboard — see how our AI & ML models are performing to sharpen your decision making.',
                ],
                cta: 'Get Monthly Access',
                plan: 'monthly',
              },
              annual: {
                name: 'Seasonal Access',
                price: `$${PLAN_PRICES.annual}`,
                period: '/season',
                tag: 'One-time purchase · Full season',
                desc: 'Lock in a full year of access with a single payment — no subscription, no renewals.',
                details: [
                  'Access begins immediately upon payment.',
                  'Expires 365 days after purchase — no auto-renewal.',
                  'Includes game predictions, pitcher props, batter props, and Scout AI.',
                  'Odds updated daily across 7+ sportsbooks.',
                  'Best value for the full MLB season and beyond.',
                  'Early beta access to new features as they are developed.',
                  'Model Performance Dashboard — see how our AI & ML models are performing to sharpen your decision making.',
                ],
                cta: 'Get Seasonal Access',
                plan: 'annual',
              },
            };
            const m = MODAL_CONTENT[planModal];
            return (
              <div className="plan-modal-overlay" onClick={() => setPlanModal(null)}>
                <div className="plan-modal" onClick={e => e.stopPropagation()}>
                  <button className="plan-modal__close" onClick={() => setPlanModal(null)} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>

                  <div className="plan-modal__header">
                    <span className="plan-modal__tag">{m.tag}</span>
                    <h3 className="plan-modal__name">{m.name}</h3>
                    <div className="plan-modal__price">
                      <span className="plan-modal__amount">{m.price}</span>
                      <span className="plan-modal__period">{m.period}</span>
                    </div>
                    <p className="plan-modal__desc">{m.desc}</p>
                  </div>

                  <ul className="plan-modal__details">
                    {m.details.map((d, i) => (
                      <li key={i} className="plan-modal__detail">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {d}
                      </li>
                    ))}
                  </ul>

                  <div className="plan-modal__locked">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Your current plan is still active. Once your membership expires you'll be able to select a new plan.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ----------------------------------------------------------------
              Admin Tools — admin accounts only
          ---------------------------------------------------------------- */}
          {isAdmin && (
            <div className="settings-content settings-account-panel">
              <section id="admin-tools" className="settings-section">
                <div className="section-header">
                  <h2>Admin Tools</h2>
                  <p>Internal tools for content and model management</p>
                </div>
                <div className="settings-admin-grid">
                  <button
                    type="button"
                    className="settings-admin-card"
                    onClick={() => navigate('/admin')}
                  >
                    <div className="settings-admin-card__icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3"  y="3"  width="7" height="7" />
                        <rect x="14" y="3"  width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3"  y="14" width="7" height="7" />
                      </svg>
                    </div>
                    <div className="settings-admin-card__body">
                      <h4>Admin Dashboard</h4>
                      <p>Daily hit rate, prediction countdown, and content manager</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="settings-admin-card"
                    onClick={() => navigate('/admin/model-performance')}
                  >
                    <div className="settings-admin-card__icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6"  y1="20" x2="6"  y2="14" />
                      </svg>
                    </div>
                    <div className="settings-admin-card__body">
                      <h4>Model Performance</h4>
                      <p>Scout AI accuracy, probability calibration, and EV tracking</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="settings-admin-card"
                    onClick={() => navigate('/admin/campaigns')}
                  >
                    <div className="settings-admin-card__icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div className="settings-admin-card__body">
                      <h4>Campaigns</h4>
                      <p>Send updates, features, and promotions to user segments</p>
                    </div>
                  </button>
                </div>
              </section>
            </div>
          )}

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
                <p>
                  Devices currently signed in to your account.{' '}
                  <strong>Max 5 active sessions per user</strong> — signing in on a 6th device will
                  automatically end your oldest session.
                </p>
                {!sessionsLoading && sessions.length > 0 && (
                  <span className="setting-hint" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
                    {sessions.length} of 5 sessions in use
                  </span>
                )}
              </div>
              <div className="settings-group">
                {sessionsLoading ? (
                  <p className="setting-hint">Loading sessions…</p>
                ) : sessions.length === 0 ? (
                  <p className="setting-hint">No active sessions found.</p>
                ) : (
                  // Sort newest-first so users see their most recent session at the top.
                  // The oldest session at the bottom is the next one auto-pruned on a 6th login.
                  [...sessions]
                    .sort((a, b) => {
                      const aTs = new Date(a.last_active_at || a.created_at).getTime();
                      const bTs = new Date(b.last_active_at || b.created_at).getTime();
                      return bTs - aTs;
                    })
                    .map((session) => (
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
