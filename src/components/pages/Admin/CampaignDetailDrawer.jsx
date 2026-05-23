import { useEffect, useState } from 'react';
import { getCampaign, deleteCampaign } from '../../../data/services/campaignsService';
import { audienceMeta, formatCampaignSentAt } from '../../../data/constants/campaignsConstants';
import EmailPreview from './EmailPreview';

/**
 * Side drawer that opens with a lightweight `summary` for the header, then
 * fetches the full campaign (raw markdown body + CTA) so the EmailPreview
 * renders exactly what was sent.
 *
 * Used by:
 *   - AdminPage.jsx        (Campaign Manager rows on the dashboard)
 *   - CampaignsPage.jsx    (Recent Campaigns rows on the full campaigns page)
 *
 * The `onDeleted(id)` callback fires after a successful 204 OR a 404 race
 * (where another tab beat us to the delete — end state is the same).
 * Parent decides what to do (e.g. remove from local state + close drawer).
 */
export default function CampaignDetailDrawer({ campaignId, summary, onClose, onDeleted }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setDeleteConfirm(false);
    setDeleteError(null);
    getCampaign(campaignId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(err => { if (!cancelled) setError(err?.message || 'Could not load campaign.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCampaign(campaignId);
      if (onDeleted) onDeleted(campaignId);
    } catch (err) {
      // Race: another tab/admin already deleted it. Treat as silent success.
      if (err?.status === 404) {
        if (onDeleted) onDeleted(campaignId);
        return;
      }
      setDeleting(false);
      setDeleteError(err?.message || 'Could not delete campaign.');
    }
  };

  if (!campaignId) return null;

  // Fall back to the lightweight `summary` (from the list endpoint) until the
  // full row arrives, so headers don't flicker while the API call is in flight.
  const subject    = data?.subject        ?? summary?.subject        ?? '';
  const audience   = data?.audience       ?? summary?.audience;
  const recipients = data?.recipientCount ?? summary?.recipientCount ?? 0;
  const sentAt     = data?.sentAt         ?? summary?.sentAt;
  const status     = data?.status         ?? summary?.status;
  const meta       = audience ? audienceMeta(audience) : null;

  return (
    <div className="admin-side-overlay" onClick={onClose}>
      <aside className="admin-side admin-side--campaign" onClick={e => e.stopPropagation()} role="dialog" aria-label="Campaign detail">
        <button className="admin-side__close" onClick={onClose} aria-label="Close campaign detail">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="admin-side__header">
          <span className="admin-side__eyebrow">📧 Campaign</span>
          <h3 className="campaign-detail__subject">{subject || '(no subject)'}</h3>
          <div className="campaign-detail__meta">
            {meta && (
              <span className={`admin-audience-pill admin-audience-pill--${meta.accent || 'slate'}`}>
                {meta.label}
              </span>
            )}
            <span>{(recipients ?? 0).toLocaleString()} recipients</span>
            <span>·</span>
            <span>{sentAt ? `Sent ${formatCampaignSentAt(sentAt)}` : 'Not sent'}</span>
            {status && (
              <span className={`campaign-history__status campaign-history__status--${status}`}>
                {status}
              </span>
            )}
          </div>
          <div className="campaign-detail__actions">
            {deleteConfirm ? (
              <>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete campaign
              </button>
            )}
          </div>
          {deleteError && (
            <p className="campaign-send-error">⚠ {deleteError}</p>
          )}
        </div>

        <div className="admin-side__body campaign-detail__body">
          {error ? (
            <div className="campaign-send-error">⚠ {error}</div>
          ) : loading ? (
            <div className="empty-state">Loading email…</div>
          ) : data ? (
            <EmailPreview
              subject={data.subject}
              body={data.body}
              cta={{ label: data.ctaLabel, url: data.ctaUrl }}
            />
          ) : (
            <div className="empty-state">No campaign data available.</div>
          )}
        </div>
      </aside>
    </div>
  );
}
