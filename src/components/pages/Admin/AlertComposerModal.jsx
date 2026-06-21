import { useState, useEffect } from 'react';
import { createAlert } from '../../../data/services/alertsService';

/**
 * Admin-only composer for creating new alerts/announcements.
 * POSTs to /api/v1/admin/alerts via alertsService.
 */
export default function AlertComposerModal({ open, onClose, onCreated }) {
  const [subject, setSubject]       = useState('');
  const [body,    setBody]          = useState('');
  const [displayType, setDisplayType] = useState('general'); // 'general' | 'modal'
  const [targetType,  setTargetType]  = useState('all');     // 'all' | 'specific'
  const [emailsRaw,   setEmailsRaw]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error, setError]             = useState('');

  // Reset every time the modal opens
  useEffect(() => {
    if (open) {
      setSubject('');
      setBody('');
      setDisplayType('general');
      setTargetType('all');
      setEmailsRaw('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const targetEmails = emailsRaw
    .split(/[,\n]/)
    .map(e => e.trim())
    .filter(Boolean);

  const handleSubmit = async () => {
    setError('');
    if (!subject.trim()) { setError('Add a subject before publishing.'); return; }
    if (!body.trim())    { setError('Add a message body.');               return; }
    if (targetType === 'specific' && targetEmails.length === 0) {
      setError('Add at least one recipient email or switch to "All users".');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createAlert({
        subject: subject.trim(),
        body: body.trim(),
        displayType,
        targetType,
        targetEmails: targetType === 'specific' ? targetEmails : [],
      });
      setSubmitting(false);
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Could not publish alert. Please try again.');
    }
  };

  return (
    <div className="campaign-modal-overlay" onClick={onClose}>
      <div className="alert-composer" onClick={e => e.stopPropagation()}>
        <button className="ai-modal__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="alert-composer__header">
          <span className="alert-composer__eyebrow">📢 New Alert</span>
          <h3>Notify users</h3>
          <p className="alert-composer__sub">
            Send a one-off announcement that lands in users' inbox — or pops up the next time they sign in.
          </p>
        </div>

        <div className="alert-composer__body">

          {/* Subject */}
          <label className="alert-composer__label">Subject</label>
          <input
            type="text"
            className="campaign-input"
            placeholder="Short, scannable headline…"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            maxLength={120}
          />

          {/* Body */}
          <label className="alert-composer__label" style={{ marginTop: '0.85rem' }}>Message</label>
          <textarea
            className="campaign-textarea"
            placeholder="Tell them what's going on, when it affects them, and what to do next…"
            rows={6}
            value={body}
            onChange={e => setBody(e.target.value)}
          />

          {/* Display type */}
          <label className="alert-composer__label" style={{ marginTop: '1rem' }}>Display</label>
          <div className="alert-composer__choice-row">
            <button
              type="button"
              className={`alert-composer__choice${displayType === 'general' ? ' is-active' : ''}`}
              onClick={() => setDisplayType('general')}
            >
              <span className="alert-composer__choice-icon">📬</span>
              <span className="alert-composer__choice-name">General message</span>
              <span className="alert-composer__choice-desc">Lands in the user's inbox only</span>
            </button>
            <button
              type="button"
              className={`alert-composer__choice${displayType === 'modal' ? ' is-active' : ''}`}
              onClick={() => setDisplayType('modal')}
            >
              <span className="alert-composer__choice-icon">⚡</span>
              <span className="alert-composer__choice-name">Modal popup</span>
              <span className="alert-composer__choice-desc">Pops up the next time they sign in</span>
            </button>
          </div>

          {/* Audience */}
          <label className="alert-composer__label" style={{ marginTop: '1rem' }}>Audience</label>
          <div className="alert-composer__choice-row">
            <button
              type="button"
              className={`alert-composer__choice${targetType === 'all' ? ' is-active' : ''}`}
              onClick={() => setTargetType('all')}
            >
              <span className="alert-composer__choice-icon">🌐</span>
              <span className="alert-composer__choice-name">All users</span>
              <span className="alert-composer__choice-desc">Everyone with an account</span>
            </button>
            <button
              type="button"
              className={`alert-composer__choice${targetType === 'specific' ? ' is-active' : ''}`}
              onClick={() => setTargetType('specific')}
            >
              <span className="alert-composer__choice-icon">🎯</span>
              <span className="alert-composer__choice-name">Specific emails</span>
              <span className="alert-composer__choice-desc">Pick exact recipients</span>
            </button>
          </div>

          {targetType === 'specific' && (
            <>
              <label className="alert-composer__label" style={{ marginTop: '0.85rem' }}>
                Recipient emails (comma or newline separated)
              </label>
              <textarea
                className="campaign-textarea"
                placeholder="user1@example.com, user2@example.com"
                rows={3}
                value={emailsRaw}
                onChange={e => setEmailsRaw(e.target.value)}
              />
              <span className="alert-composer__hint">
                {targetEmails.length === 0
                  ? 'No valid recipients yet'
                  : `${targetEmails.length} recipient${targetEmails.length === 1 ? '' : 's'}`}
              </span>
            </>
          )}

          {error && <p className="alert-composer__error">⚠ {error}</p>}

          <div className="alert-composer__actions">
            <button type="button" className="campaign-btn campaign-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="campaign-btn campaign-btn--primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Publishing…' : 'Publish alert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
