/**
 * Membership sales window.
 *
 * Premium is closed to new purchases (checkout and promo redemption) from the
 * day after the World Series until Opening Day — there are no picks to sell in
 * the offseason. Update both dates once a year.
 *
 * Dates are ET calendar days: closed on `closesOn`, open again on `reopensOn`.
 * Existing members keep the billing portal (manage / cancel) year-round.
 *
 * NOTE: the client lock is UX only — the API should also refuse
 * /api/v1/subscriptions/checkout/stripe and /redeem-promo in this window.
 */
export const OFFSEASON = {
  closesOn: '2026-11-01',  // day after the 2026 World Series
  reopensOn: '2027-03-25', // 2027 Opening Day — confirm against MLB's schedule
  nextSeason: '2027',
};

// YYYY-MM-DD in ET. Built from parts: locale shortcuts like 'en-CA' don't
// reliably give ISO order across browsers / ICU versions.
function etToday(now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map(p => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** True while membership sales are closed. */
export function isOffseason(now = new Date()) {
  const today = etToday(now);
  return today >= OFFSEASON.closesOn && today < OFFSEASON.reopensOn;
}

/** "March 25, 2027" */
export function salesReopenLabel() {
  const [y, m, d] = OFFSEASON.reopensOn.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}
