import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import userAuthService, { setAccessToken, getAccessToken } from '../data/services/userAuthService';
import userProfileService from '../data/services/userProfileService';

const AuthContext = createContext(null);

const REFRESH_TOKEN_KEY = 'spa_refresh_token';

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// Build a minimal user object immediately from the JWT so the UI isn't blocked.
// The full profile (display_name, favorite_team, is_verified, prefs) is merged
// asynchronously by _fetchAndMergeProfile().
function buildUserFromJwt(payload) {
  if (!payload) return null;
  const isAdmin = payload.is_admin === true || payload.is_admin === 1;
  const isVerified = payload.is_verified ?? null;
  return {
    id: payload.sub,
    email: payload.email,
    isAdmin,
    isVerified,
    role: isAdmin ? 'admin' : isVerified ? 'verified' : 'user',
    displayName: payload.email?.split('@')[0] || '',
    favoriteTeamId: null,
    emailUpdates: true,
    weeklyDigest: false,
    breakingNews: true,
  };
}

// Merge the full /users/me response on top of an existing user object.
function mergeProfile(base, profile) {
  if (!profile) return base;
  const isAdmin = profile.is_admin === true || profile.is_admin === 1;
  const isVerified = profile.is_verified === true;
  const subscriptionTier   = profile.subscription_tier   ?? 'free';
  const subscriptionStatus = profile.subscription_status ?? null;
  const paymentSource      = profile.payment_source      ?? null;
  const subscriptionPlan      = profile.subscription_plan ? profile.subscription_plan.toLowerCase() : null;
  const subscriptionExpiresAt = profile.subscription_expires_at ?? null;
  return {
    ...base,
    isAdmin,
    isVerified,
    subscriptionTier,
    subscriptionStatus,
    paymentSource,
    subscriptionPlan,
    subscriptionExpiresAt,
    role: isAdmin ? 'admin' : isVerified ? 'verified' : 'user',
    displayName: profile.display_name || base.displayName,
    favoriteTeamId: profile.favorite_team_id ?? null,
    emailUpdates: profile.email_updates ?? base.emailUpdates,
    weeklyDigest: profile.weekly_digest ?? base.weeklyDigest,
    breakingNews: profile.breaking_news ?? base.breakingNews,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const refreshTimerRef = useRef(null);

  // Fetch full profile from /users/me and merge into user state.
  const _fetchAndMergeProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const profile = await userProfileService.getProfile();
      setUser(prev => prev ? mergeProfile(prev, profile) : null);
    } catch {
      // Profile fetch failed — JWT-only data remains; not fatal.
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Schedule silent token refresh before expiry.
  const scheduleRefresh = useCallback((expiresIn) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = Math.max((expiresIn - 60) * 1000, 5000);
    refreshTimerRef.current = setTimeout(async () => {
      const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!stored) return;
      try {
        const data = await userAuthService.refreshToken(stored);
        setAccessToken(data.access_token);
        setUser(buildUserFromJwt(decodeJwt(data.access_token)));
        scheduleRefresh(data.expires_in);
        _fetchAndMergeProfile();
      } catch {
        _clearSession();
      }
    }, delay);
  }, [_fetchAndMergeProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  function _clearSession() {
    setAccessToken(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }

  async function _applyTokens(access_token, refresh_token, expires_in) {
    setAccessToken(access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    setUser(buildUserFromJwt(decodeJwt(access_token)));
    scheduleRefresh(expires_in);
    await _fetchAndMergeProfile();
  }

  // On mount: restore session from stored refresh token.
  useEffect(() => {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!stored) { setLoading(false); return; }

    userAuthService.refreshToken(stored)
      .then((data) => _applyTokens(data.access_token, data.refresh_token, data.expires_in))
      .catch(() => localStorage.removeItem(REFRESH_TOKEN_KEY))
      .finally(() => setLoading(false));

    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Public auth actions
  // ---------------------------------------------------------------------------
  const login = async (email, password) => {
    const data = await userAuthService.login(email, password);
    await _applyTokens(data.access_token, data.refresh_token, data.expires_in);
  };

  const register = async (email, password) => {
    await userAuthService.register(email, password);
  };

  const logout = async () => {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (stored) await userAuthService.logout(stored).catch(() => {});
    _clearSession();
  };

  const logoutAll = async () => {
    await userAuthService.logoutAll().catch(() => {});
    _clearSession();
  };

  const requestPasswordReset = async (email) => {
    await userAuthService.requestPasswordReset(email);
  };

  const resetPassword = async (token, newPassword) => {
    await userAuthService.resetPassword(token, newPassword);
  };

  const verifyEmail = async (token) => {
    await userAuthService.verifyEmail(token);
  };

  // ---------------------------------------------------------------------------
  // Public profile actions — backed by /users/me routes
  // ---------------------------------------------------------------------------

  /** PATCH /users/me — update display_name and/or favorite_team */
  const updateProfile = async (fields) => {
    const updated = await userProfileService.updateProfile(fields);
    setUser(prev => prev ? mergeProfile(prev, updated) : null);
  };

  /** PATCH /users/me/preferences — update notification preferences */
  const updatePreferences = async (prefs) => {
    const updated = await userProfileService.updatePreferences(prefs);
    setUser(prev => prev ? mergeProfile(prev, updated) : null);
  };

  /** POST /users/me/change-password */
  const changePassword = async (currentPassword, newPassword) => {
    await userProfileService.changePassword(currentPassword, newPassword);
  };

  /** DELETE /users/me — soft delete + revoke all sessions */
  const deleteAccount = async () => {
    await userProfileService.deleteAccount();
    _clearSession();
  };

  /** Re-fetch /users/me, merge into state, and return the raw profile. */
  const refreshUser = async () => {
    const profile = await userProfileService.getProfile();
    setUser(prev => prev ? mergeProfile(prev, profile) : null);
    return profile;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!getAccessToken() && !!user,
      user,
      loading,
      profileLoading,
      // Role shortcuts mirroring backend dependency tiers
      isAdmin: user?.isAdmin === true || user?.isAdmin === 1,
      isVerified: user?.isVerified === true,
      isPremium: user?.isAdmin === true || user?.subscriptionTier === 'premium',
      hasScoutAiAccess:
        user?.isAdmin === true
        || user?.subscriptionTier === 'premium'
        || ['gifted', 'weekly', 'monthly', 'annual'].includes(user?.subscriptionPlan),
      subscriptionTier:   user?.subscriptionTier   ?? null,
      subscriptionStatus: user?.subscriptionStatus ?? null,
      paymentSource:      user?.paymentSource      ?? null,
      subscriptionPlan:      user?.subscriptionPlan      ?? null,
      subscriptionExpiresAt: user?.subscriptionExpiresAt ?? null,
      userRole: user?.role ?? null,
      // Auth actions
      login,
      register,
      logout,
      logoutAll,
      requestPasswordReset,
      resetPassword,
      verifyEmail,
      // Profile actions
      updateProfile,
      updatePreferences,
      changePassword,
      deleteAccount,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
