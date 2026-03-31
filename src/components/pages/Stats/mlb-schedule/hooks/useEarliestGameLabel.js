import { useState, useEffect } from 'react';
import predictionsService from '../../../../../data/services/predictionsService';

function parseToMins(timeStr) {
  if (!timeStr) return null;
  const ampm = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const mer = ampm[3].toUpperCase();
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const parts = timeStr.split(':');
  if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  return null;
}

/**
 * Fetches today's games and returns an unlock label ("4:00 PM ET") and a boolean
 * indicating whether that threshold has already passed.
 * Unlock = earliest first pitch − 2 hours, capped at 4:00 PM ET.
 */
export function useEarliestGameLabel() {
  const [label, setLabel] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    predictionsService.getToday()
      .then(games => {
        if (!Array.isArray(games) || !games.length) return;
        const mins = games
          .map(g => parseToMins(g.game_time_et || g.game_time))
          .filter(m => m != null);
        if (!mins.length) return;
        const unlockMins = Math.min(((Math.min(...mins) - 120) % 1440 + 1440) % 1440, 16 * 60);
        const h = Math.floor(unlockMins / 60);
        const min = String(unlockMins % 60).padStart(2, '0');
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        setLabel(`${displayH}:${min} ${period} ET`);
        const now = new Date();
        setIsUnlocked((now.getHours() * 60 + now.getMinutes()) >= unlockMins);
      })
      .catch(() => {});
  }, []);

  return { label, isUnlocked };
}
