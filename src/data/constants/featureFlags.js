// Single source of truth for client-side feature toggles.
//
// Flip a flag here to hide an in-progress feature from the production UI
// without removing the underlying code. The corresponding routes in
// App.jsx are left active so direct URLs / bookmarks still resolve.

// Admin tools (Lab) under /predictions are normally admin-only. These specific
// (non-admin) user IDs are ALSO granted access. Used by the `admin-tools`
// ProtectedRoute mode, the predictions nav, and the page's gate.
// (The Bet Library is open to every signed-in user — no allowlist needed.)
export const ADMIN_TOOL_USER_IDS = [16];

// The server has stopped returning the structured `audit` object on Scout Desk
// / best-props board picks (behind its own reversible flag). Mirror that here
// so the audit badge/panel stays hidden client-side until the server flag is
// flipped back on and `pick.audit` is present again. Flip to true to restore.
export const SHOW_AUDIT_SUMMARY = false;

// Analytics Lab (/analytics-explorer, the custom chart builder) is still under
// active development and isn't ready to be live. Unlike the flags above, this
// one also blocks direct route access (App.jsx redirects to /team-analytics
// when off) rather than just leaving the URL reachable — the feature isn't
// ready for anyone to land on, not just unlinked. Flip to true to relaunch it.
export const SHOW_ANALYTICS_LAB = false;
