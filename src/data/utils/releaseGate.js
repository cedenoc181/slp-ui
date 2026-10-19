// Shared helpers for the /predictions/* release-gate contract: a game isn't
// public until now >= first_pitch - 2h AND a same-day Scout AI report exists
// for it. Admins bypass the gate entirely and see every row immediately,
// flagged via `is_preview` / `preview_badge`.
//
// For non-admins the server already tells the truth by omission — a gated
// game's row (or, on the pitcher/batter feeds, an individual player slot) is
// simply absent. The one thing these feeds don't disambiguate is WHY a slot
// is missing: gated by the release window, or genuinely no ML prediction yet
// (e.g. a probable starter not announced). isPreReleaseWindow() resolves that
// ambiguity client-side using the one signal every row still carries even
// when gated: `game_time_et`.

export const DEFAULT_PREVIEW_BADGE = 'Preview, not yet public';

// Parse "8:08 PM ET" / "8:08 PM" / "20:05" into minutes-from-midnight (ET).
// Returns null when the string can't be parsed.
export function parseEtTimeToMinutes(timeStr) {
  const t = String(timeStr || '').trim();
  if (!t) return null;
  const ampm = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const mer = ampm[3].toUpperCase();
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const parts = t.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!Number.isNaN(h) && !Number.isNaN(m)) return h * 60 + m;
  }
  return null;
}

// Current ET time as minutes-from-midnight.
export function etNowMinutes() {
  const parts = new Date()
    .toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
    .split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + parseInt(parts[2], 10) / 60;
}

// True when it's still more than 2h before first pitch — i.e. the release
// gate couldn't have opened yet no matter how far along the model is.
// Only meant to resolve the null/missing-slot ambiguity described above;
// an unparseable time falls back to `false` ("pending", not "gated") since we
// can't assert a window we can't compute.
export function isPreReleaseWindow(gameTimeEt) {
  const pitchMins = parseEtTimeToMinutes(gameTimeEt);
  if (pitchMins == null) return false;
  return etNowMinutes() < pitchMins - 120;
}
