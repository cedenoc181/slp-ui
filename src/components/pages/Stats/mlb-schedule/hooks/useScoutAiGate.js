import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';

const FREE_USES_PER_DAY = 3;
const STORAGE_KEY = 'scout_ai_usage';

function getTodayET() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

function getUsage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveUsage(usage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

/**
 * Returns gate state and a wrapped click handler for Scout AI.
 *
 * usesRemaining — how many free clicks left today (null = unlimited / not applicable)
 * isLimitHit    — true when the user has exhausted their free uses today
 * gatedClick    — call this instead of handleScoutClick directly
 */
export function useScoutAiGate(onAllowed) {
  const { isAuthenticated, isAdmin, isVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isUnlimited = isAdmin || isVerified;

  const today = getTodayET();
  const usage = getUsage();
  const todayCount = (usage.date === today ? usage.count : 0);
  const usesRemaining = isUnlimited ? null : FREE_USES_PER_DAY - todayCount;
  const isLimitHit = isUnlimited ? false : usesRemaining <= 0;

  const gatedClick = useCallback(() => {
    // Not logged in — send to account page with context
    if (!isAuthenticated) {
      navigate('/account', {
        state: { from: location, scoutPrompt: true },
      });
      return;
    }

    // Free user daily limit reached
    if (isLimitHit) return;

    // Consume one use (admins/verified skip tracking)
    if (!isUnlimited) {
      saveUsage({ date: today, count: todayCount + 1 });
    }

    onAllowed();
  }, [isAuthenticated, isUnlimited, isLimitHit, today, todayCount, location, navigate, onAllowed]);

  return { usesRemaining, isLimitHit, gatedClick };
}
