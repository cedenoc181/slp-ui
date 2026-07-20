// ---------------------------------------------------------------------------
// Betslip deep-link resolution
// ---------------------------------------------------------------------------
// Scout AI game picks (Moneyline / Run Line / Total) carry a `deep_links` map of
// bookmaker key → betslip URL for that pick's exact side. Some URLs contain
// templated placeholders that must be substituted (or the link is unavailable):
//
//   {state}                  → user's US state code (lowercase 2-letter), e.g. "nj".
//                              Used by Caesars (williamhill_us) and BetMGM. If we
//                              don't have the user's state, the link is unavailable.
//   {stake} {wager} {amount} → the pre-filled stake; replaced with empty string
//                              (we don't pre-fill a wager amount).
//
// After substitution, any remaining {...} token means the link can't be safely
// used, so we treat it as unavailable.

/**
 * Resolve a ready-to-open betslip URL for a given bookmaker.
 *
 * @param {Object|null|undefined} deepLinks - pick.deep_links (book key → URL)
 * @param {string|null|undefined} bookKey   - user's preferred bookmaker key
 * @param {{ stateCode?: string|null }} [opts]
 * @returns {string|null} the sanitized URL, or null if unavailable
 */
export function resolveBetslipUrl(deepLinks, bookKey, opts = {}) {
  if (!deepLinks || !bookKey) return null;

  let url = deepLinks[bookKey];
  if (typeof url !== 'string' || !url) return null;

  // Stake-style placeholders → empty (no pre-filled wager). Matches any token
  // naming a stake/wager/amount, incl. compound names the books actually emit
  // (e.g. BetRivers uses {wagerAmount}).
  url = url.replace(/\{[^}]*(?:stake|wager|amount)[^}]*\}/gi, '');

  // {state} → user's state code, only if we actually have one.
  // Note: use fresh, non-global literals for presence checks — a shared /g regex
  // is stateful across calls (dangling lastIndex) and would misfire on later picks.
  if (/\{state\}/i.test(url)) {
    const stateCode = opts.stateCode;
    if (!stateCode) return null;
    url = url.replace(/\{state\}/gi, String(stateCode).toLowerCase());
  }

  // Anything still templated can't be used safely.
  if (/\{[^}]*\}/.test(url)) return null;

  return url;
}
