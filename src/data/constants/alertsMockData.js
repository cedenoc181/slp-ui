// Frontend mock for the Alerts / Notifications system.
//
// Storage is localStorage-backed so the flow is testable end-to-end without
// a backend. Replace these helpers with API calls once the server is wired:
//
//   getAlerts()            → GET /api/v1/admin/alerts
//   addAlert(alert)        → POST /api/v1/admin/alerts
//   getAlertsForUser(email)→ GET /api/v1/users/me/alerts
//   markAlertRead(id, email)→ POST /api/v1/users/me/alerts/{id}/read

const STORAGE_KEY  = 'spa_admin_alerts_v1';
const READ_KEY     = 'spa_admin_alerts_read_v1';

// ── Seed data so the UI isn't empty on first load ───────────────────────────
const SEED = [
  {
    id: 'alert-seed-1',
    subject: 'Welcome to Sandlot Picks 2026 season!',
    body: 'The 2026 MLB season is officially underway. We\'ve refreshed our prediction models and Scout AI for the new year — let us know what you think.',
    displayType: 'general',
    targetType: 'all',
    targetEmails: [],
    createdAt: '2026-04-15T13:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'alert-seed-2',
    subject: 'Brief outage tonight — 11pm–12am ET',
    body: 'We\'re pushing a deploy that requires a short maintenance window tonight. Predictions for tomorrow will be unaffected. Thanks for bearing with us.',
    displayType: 'modal',
    targetType: 'all',
    targetEmails: [],
    createdAt: '2026-04-25T16:30:00Z',
    createdBy: 'admin',
  },
];

// ── Storage helpers ─────────────────────────────────────────────────────────
function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full / disabled — ignore
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
export function getAlerts() {
  const stored = readJson(STORAGE_KEY, null);
  if (stored !== null) return stored;
  // First load — seed the store and return
  writeJson(STORAGE_KEY, SEED);
  return SEED;
}

export function addAlert(alert) {
  const list = getAlerts();
  const next = [
    {
      id: `alert-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      ...alert,
    },
    ...list,
  ];
  writeJson(STORAGE_KEY, next);
  return next[0];
}

export function deleteAlert(alertId) {
  const list = getAlerts();
  writeJson(STORAGE_KEY, list.filter(a => a.id !== alertId));
}

// ── Targeting / per-user views ──────────────────────────────────────────────
export function getAlertsForUser(email) {
  const list = getAlerts();
  if (!email) return [];
  const normalized = email.toLowerCase();
  return list.filter(a => {
    if (a.targetType === 'all') return true;
    if (a.targetType === 'specific') {
      return (a.targetEmails || []).map(e => e.toLowerCase()).includes(normalized);
    }
    return false;
  });
}

// ── Read-state tracking (per-user) ──────────────────────────────────────────
function readMap() {
  return readJson(READ_KEY, {}); // { [email]: { [alertId]: ISOString } }
}

export function markAlertRead(alertId, email) {
  if (!email || !alertId) return;
  const map = readMap();
  const key = email.toLowerCase();
  map[key] = { ...(map[key] || {}), [alertId]: new Date().toISOString() };
  writeJson(READ_KEY, map);
}

export function isAlertRead(alertId, email) {
  if (!email || !alertId) return false;
  const map = readMap();
  return Boolean(map[email.toLowerCase()]?.[alertId]);
}

export function getUnreadModalAlertsForUser(email) {
  return getAlertsForUser(email)
    .filter(a => a.displayType === 'modal' && !isAlertRead(a.id, email));
}

// ── Formatting ──────────────────────────────────────────────────────────────
export function formatAlertDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
