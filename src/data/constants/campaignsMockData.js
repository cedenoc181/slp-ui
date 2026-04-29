// Mock campaign data — replace with API responses once the backend is wired.
//
// Used by:
// - components/pages/Admin/CampaignsPage.jsx  (full composer + history)
// - components/pages/Admin/AdminPage.jsx       (Campaign Manager section)

export const AUDIENCE_PRESETS = [
  { key: 'all',     label: 'All Users',          desc: 'Every user with email updates enabled',  mockCount: 412, accent: 'blue' },
  { key: 'free',    label: 'Free Tier',          desc: 'Users who haven\'t subscribed yet',      mockCount: 287, accent: 'slate' },
  { key: 'premium', label: 'All Premium',        desc: 'Active subscribers across all plans',    mockCount: 98,  accent: 'gold' },
  { key: 'weekly',  label: 'Weekly Plan',        desc: 'Users on the $24.99 weekly access',      mockCount: 22,  accent: 'teal' },
  { key: 'monthly', label: 'Monthly Plan',       desc: 'Recurring monthly subscribers',          mockCount: 64,  accent: 'indigo' },
  { key: 'annual',  label: 'Seasonal Plan',      desc: 'Full-season pass holders',               mockCount: 12,  accent: 'purple' },
  { key: 'lapsed',  label: 'Lapsed Subscribers', desc: 'Cancelled — winback opportunity',        mockCount: 27,  accent: 'red' },
];

export const MOCK_CAMPAIGN_HISTORY = [
  { id: 1, subject: 'Welcome to the 2026 MLB season',             audience: 'all',     recipients: 387, sentAt: '2026-04-15T16:32:00Z', status: 'sent' },
  { id: 2, subject: 'Your free week starts now — code FREE7',     audience: 'free',    recipients: 264, sentAt: '2026-04-18T14:00:00Z', status: 'sent' },
  { id: 3, subject: 'Pitcher Props are live — go check them out', audience: 'premium', recipients: 91,  sentAt: '2026-04-20T17:45:00Z', status: 'sent' },
  { id: 4, subject: 'New feature: Model Performance Dashboard',   audience: 'monthly', recipients: 62,  sentAt: '2026-04-23T15:10:00Z', status: 'sent' },
  { id: 5, subject: 'Last call: extend your weekly access',       audience: 'weekly',  recipients: 21,  sentAt: '2026-04-25T18:00:00Z', status: 'sent' },
];

export function audienceMeta(key) {
  return AUDIENCE_PRESETS.find(a => a.key === key) || { label: key, accent: 'slate' };
}

export function formatCampaignSentAt(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
