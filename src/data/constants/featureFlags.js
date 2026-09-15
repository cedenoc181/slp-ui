// Single source of truth for client-side feature toggles.
//
// Flip a flag here to hide an in-progress feature from the production UI
// without removing the underlying code. The corresponding routes in
// App.jsx are left active so direct URLs / bookmarks still resolve.

// Admin tools (Bet Library, Lab) under /predictions are normally admin-only.
// These specific (non-admin) user IDs are ALSO granted access. Used by the
// `admin-tools` ProtectedRoute mode, the predictions nav, and each page's gate.
//
// IMPORTANT — backend dependency: the Bet Library persists via the admin-gated
// endpoints /api/v1/bet-library/*. Granting a non-admin here ALSO requires the
// server to allow that user_id on those routes, otherwise their save/load 401s.
// See NeedsWiring.txt → "BET LIBRARY ... NON-ADMIN ACCESS GRANT".
export const ADMIN_TOOL_USER_IDS = [16];

// The server has stopped returning the structured `audit` object on Scout Desk
// / best-props board picks (behind its own reversible flag). Mirror that here
// so the audit badge/panel stays hidden client-side until the server flag is
// flipped back on and `pick.audit` is present again. Flip to true to restore.
export const SHOW_AUDIT_SUMMARY = false;
