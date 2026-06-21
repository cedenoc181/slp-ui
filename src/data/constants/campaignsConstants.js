// Static config for the campaigns UI (audience labels, helpers).
// Counts and history come from the API — see data/services/campaignsService.js.

export const AUDIENCE_PRESETS = [
  { key: 'all',     label: 'All Users',          desc: 'Every user with email updates enabled', accent: 'blue'   },
  { key: 'free',    label: 'Free Tier',          desc: "Users who haven't subscribed yet",      accent: 'slate'  },
  { key: 'premium', label: 'All Premium',        desc: 'Active subscribers across all plans',   accent: 'gold'   },
  { key: 'weekly',  label: 'Weekly Plan',        desc: 'Users on the $24.99 weekly access',     accent: 'teal'   },
  { key: 'monthly', label: 'Monthly Plan',       desc: 'Recurring monthly subscribers',         accent: 'indigo' },
  { key: 'annual',  label: 'Seasonal Plan',      desc: 'Full-season pass holders',              accent: 'purple' },
  { key: 'lapsed',  label: 'Lapsed Subscribers', desc: 'Cancelled — winback opportunity',       accent: 'red'    },
];

export function audienceMeta(key) {
  return AUDIENCE_PRESETS.find(a => a.key === key) || { label: key, accent: 'slate' };
}

export function formatCampaignSentAt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
