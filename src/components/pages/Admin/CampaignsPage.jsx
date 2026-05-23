import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import EmailPreview from './EmailPreview';
import CampaignDetailDrawer from './CampaignDetailDrawer';
import { AUDIENCE_PRESETS, formatCampaignSentAt } from '../../../data/constants/campaignsConstants';
import {
  listCampaigns,
  getAudienceCounts,
  sendTestCampaign,
  sendCampaign,
} from '../../../data/services/campaignsService';
import { generate as aiGenerate } from '../../../data/services/aiService';
import '../../../styles/admin-page-styling/admin.css';
import '../../../styles/admin-page-styling/campaigns.css';

// ─── Campaign templates ───────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'feature',
    label: 'Feature Update',
    icon: '✨',
    subject: 'New on Sandlot Picks: {{feature_name}}',
    body: 'Hey there,\n\nWe just shipped a new feature we think you\'ll love: {{feature_name}}.\n\n{{feature_description}}\n\nLog in and check it out today.',
    cta: { label: 'See What\'s New', url: 'https://www.sandlotpicks.com/predictions' },
  },
  {
    id: 'promo',
    label: 'Promotion',
    icon: '🎁',
    subject: 'Limited time: {{promo_name}}',
    body: 'Don\'t miss out on this one.\n\n{{promo_description}}\n\nUse code {{promo_code}} at checkout.',
    cta: { label: 'Redeem Now', url: 'https://www.sandlotpicks.com/upgrade' },
  },
  {
    id: 'update',
    label: 'Product Update',
    icon: '📰',
    subject: 'This week on Sandlot Picks',
    body: 'Quick roundup of what\'s new this week:\n\n• \n• \n• \n\nLet us know what you think.',
    cta: { label: 'Read More', url: 'https://www.sandlotpicks.com' },
  },
  {
    id: 'blank',
    label: 'Blank',
    icon: '✏️',
    subject: '',
    body: '',
    cta: { label: '', url: '' },
  },
];

// ─── AI assist modal ─────────────────────────────────────────────────────────

const AI_QUICK_ACTIONS = [
  { id: 'improve', label: 'Improve writing', icon: '✨' },
  { id: 'shorter', label: 'Make it shorter', icon: '✂️' },
  { id: 'casual',  label: 'Make it casual',  icon: '👋' },
  { id: 'urgent',  label: 'Add urgency',     icon: '⚡' },
  { id: 'cta',     label: 'Stronger CTA',    icon: '🎯' },
];

function AIAssistModal({ open, mode, audience, recipientCount, currentBody, onClose, onApply }) {
  const [prompt, setPrompt]       = useState('');
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft]         = useState('');
  const [subjectIdeas, setSubjectIdeas] = useState([]);
  const [error, setError]         = useState(null);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    if (open) {
      setPrompt('');
      setDraft('');
      setSubjectIdeas([]);
      setGenerating(false);
      setError(null);
      setRateLimited(false);
    }
  }, [open, mode]);

  if (!open) return null;

  const isSubjectMode = mode === 'subject';

  const handleGenerate = async (quickActionId) => {
    setGenerating(true);
    setError(null);
    try {
      if (isSubjectMode) {
        const texts = await aiGenerate('campaign_subject', {
          audience: audience.key,
          count: 5,
        });
        setSubjectIdeas(Array.isArray(texts) ? texts : []);
      } else {
        const instruction = quickActionId
          ? AI_QUICK_ACTIONS.find(a => a.id === quickActionId)?.label || prompt
          : prompt;
        const text = await aiGenerate('campaign_body', {
          audience: audience.key,
          current_body: currentBody || '',
          instruction: instruction || '',
        });
        setDraft(typeof text === 'string' ? text : '');
      }
    } catch (err) {
      setError(err?.message || 'AI request failed. Please try again.');
      if (err?.status === 429) setRateLimited(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="campaign-modal-overlay" onClick={onClose}>
      <div className="ai-modal" onClick={e => e.stopPropagation()}>
        <button className="ai-modal__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="ai-modal__header">
          <span className="ai-modal__eyebrow">✨ AI Assist</span>
          <h3>{isSubjectMode ? 'Subject line ideas' : 'Refine or generate your email'}</h3>
          <p className="ai-modal__sub">
            Targeting <strong>{audience.label}</strong>
            {recipientCount != null && ` · ${recipientCount} recipients`}
          </p>
        </div>

        <div className="ai-modal__body">
          {error && (
            <div className="ai-modal__error">
              ⚠ {error}
              {rateLimited && ' (Try again in about an hour.)'}
            </div>
          )}
          {isSubjectMode ? (
            <>
              {subjectIdeas.length === 0 && !generating && (
                <button
                  type="button"
                  className="campaign-btn campaign-btn--primary"
                  onClick={() => handleGenerate()}
                  disabled={rateLimited}
                  style={{ width: '100%' }}
                >
                  ✨ Generate 5 subject ideas
                </button>
              )}
              {generating && <div className="ai-modal__loading">Generating ideas…</div>}
              {subjectIdeas.length > 0 && (
                <div className="ai-suggestion-list">
                  {subjectIdeas.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="ai-suggestion"
                      onClick={() => { onApply(s); onClose(); }}
                    >
                      <span className="ai-suggestion__index">{i + 1}</span>
                      <span className="ai-suggestion__text">{s}</span>
                      <span className="ai-suggestion__hint">Click to use →</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="campaign-btn campaign-btn--ghost"
                    onClick={() => handleGenerate()}
                    disabled={rateLimited}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Try again
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="ai-modal__label">What should this email say?</label>
              <textarea
                className="campaign-textarea ai-modal__prompt"
                placeholder="e.g. Announce that pitcher props for tonight's slate just went live. Keep it short and punchy."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
              />

              <div className="ai-modal__quick-row">
                <span className="ai-modal__quick-label">
                  {prompt.trim()
                    ? 'Clear the instruction above to use quick refines'
                    : 'Or refine current draft:'}
                </span>
                {AI_QUICK_ACTIONS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    className="ai-quick-chip"
                    onClick={() => handleGenerate(a.id)}
                    disabled={generating || rateLimited || prompt.trim() !== ''}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>

              {generating && <div className="ai-modal__loading">Drafting your email…</div>}

              {draft && !generating && (
                <>
                  <label className="ai-modal__label" style={{ marginTop: '1rem' }}>Suggested draft</label>
                  <textarea
                    className="campaign-textarea"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={10}
                  />
                </>
              )}

              <div className="ai-modal__actions">
                <button type="button" className="campaign-btn campaign-btn--ghost" onClick={onClose}>
                  Cancel
                </button>
                {!draft ? (
                  <button
                    type="button"
                    className="campaign-btn campaign-btn--primary"
                    onClick={() => handleGenerate()}
                    disabled={!prompt || generating || rateLimited}
                  >
                    ✨ Generate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="campaign-btn campaign-btn--primary"
                    onClick={() => { onApply(draft); onClose(); }}
                  >
                    Apply to email
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Confirmation modal ──────────────────────────────────────────────────────
function ConfirmSendModal({ open, audience, recipients, subject, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="campaign-modal-overlay" onClick={onCancel}>
      <div className="campaign-modal" onClick={e => e.stopPropagation()}>
        <h3>Send this campaign?</h3>
        <p className="campaign-modal__summary">
          You're about to send <strong>"{subject || 'Untitled campaign'}"</strong> to{' '}
          <strong>{recipients}</strong> {audience.label.toLowerCase()}.
        </p>
        <div className="campaign-modal__warning">
          ⚠ This action cannot be undone. Make sure you've sent a test email to yourself first.
        </div>
        <div className="campaign-modal__actions">
          <button type="button" className="campaign-btn campaign-btn--ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="campaign-btn campaign-btn--danger" onClick={onConfirm}>
            Confirm — Send to {recipients} users
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();

  const [audienceKey, setAudienceKey]   = useState('all');
  const [subject,     setSubject]       = useState('');
  const [body,        setBody]          = useState('');
  const [ctaLabel,    setCtaLabel]      = useState('');
  const [ctaUrl,      setCtaUrl]        = useState('');
  const [activeTemplate, setActiveTemplate] = useState(null);

  const [testEmail,    setTestEmail]    = useState('');
  const [testStatus,   setTestStatus]   = useState(null); // null | 'sending' | 'sent' | 'error'
  const [testError,    setTestError]    = useState(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [sendStatus,   setSendStatus]   = useState(null); // null | 'sending' | 'sent' | 'error'
  const [sendError,    setSendError]    = useState(null);

  const [history, setHistory]               = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError,   setHistoryError]   = useState(null);
  const [historyPage,    setHistoryPage]    = useState(0);
  const HISTORY_PAGE_SIZE = 5;
  const [openCampaign, setOpenCampaign] = useState(null);

  const [audienceCounts,        setAudienceCounts]        = useState(null);
  const [audienceCountsLoading, setAudienceCountsLoading] = useState(true);

  const [aiModal, setAiModal] = useState(null); // null | 'subject' | 'body'

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { if (user?.email) setTestEmail(user.email); }, [user]);

  // Fetch history + audience counts on mount
  useEffect(() => {
    let cancelled = false;
    listCampaigns()
      .then(list => { if (!cancelled) setHistory(list); })
      .catch(err => { if (!cancelled) setHistoryError(err?.message || 'Could not load campaign history.'); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });

    getAudienceCounts()
      .then(counts => { if (!cancelled) setAudienceCounts(counts); })
      .catch(() => { /* counts are non-fatal; UI falls back to "—" */ })
      .finally(() => { if (!cancelled) setAudienceCountsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const countFor = (key) => (audienceCounts ? audienceCounts[key] ?? 0 : null);
  const currentCount = countFor(audienceKey);

  const audience = useMemo(
    () => AUDIENCE_PRESETS.find(a => a.key === audienceKey) || AUDIENCE_PRESETS[0],
    [audienceKey]
  );

  const cta = useMemo(() => ({ label: ctaLabel, url: ctaUrl }), [ctaLabel, ctaUrl]);
  const charCount = body.length;
  const subjectCount = subject.length;

  const applyTemplate = (tpl) => {
    setActiveTemplate(tpl.id);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setCtaLabel(tpl.cta.label);
    setCtaUrl(tpl.cta.url);
  };

  const handleTestSend = async () => {
    if (!testEmail || !subject) return;
    setTestStatus('sending');
    setTestError(null);
    try {
      await sendTestCampaign({
        subject,
        body,
        ctaLabel,
        ctaUrl,
        toEmail: testEmail,
      });
      setTestStatus('sent');
      setTimeout(() => setTestStatus(null), 3500);
    } catch (err) {
      setTestStatus('error');
      setTestError(err?.message || 'Could not send test email.');
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  const handleConfirmSend = async () => {
    setConfirmOpen(false);
    setSendStatus('sending');
    setSendError(null);
    try {
      const created = await sendCampaign({
        subject,
        body,
        ctaLabel,
        ctaUrl,
        audience: audience.key,
      });
      setHistory(prev => [
        {
          id: created.id,
          subject,
          audience: audience.key,
          recipientCount: created.recipientCount,
          sentAt: created.sentAt,
          status: created.status || 'sent',
        },
        ...prev,
      ]);
      setHistoryPage(0);
      setSendStatus('sent');
      setTimeout(() => {
        setSendStatus(null);
        setSubject('');
        setBody('');
        setCtaLabel('');
        setCtaUrl('');
        setActiveTemplate(null);
      }, 2500);
    } catch (err) {
      setSendStatus('error');
      setSendError(err?.message || 'Could not send campaign.');
    }
  };

  if (loading) return null;
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="admin-page">
        <div className="container">
          <div className="admin-access-denied">
            <h2>Admin access required</h2>
            <p>You don't have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="admin-page campaigns-page">
      <div className="container">

        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-title">
            <Link to="/admin" className="admin-back-link" aria-label="Back to admin">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <h1>Campaigns</h1>
          </div>
        </div>

        {/* Templates row */}
        <div className="campaign-templates">
          <span className="campaign-templates__label">Start from a template</span>
          <div className="campaign-templates__row">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`campaign-template${activeTemplate === t.id ? ' is-active' : ''}`}
                onClick={() => applyTemplate(t)}
              >
                <span className="campaign-template__icon">{t.icon}</span>
                <span className="campaign-template__label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Composer + Preview grid */}
        <div className="campaign-grid">

          {/* ── Composer column ─────────────────────────────── */}
          <div className="campaign-composer">

            {/* Audience picker */}
            <div className="campaign-card">
              <div className="campaign-card__header">
                <h3>Audience</h3>
                <span className="campaign-recipient-count">
                  {audienceCountsLoading
                    ? 'Loading recipients…'
                    : currentCount === null
                      ? '— recipients'
                      : `~${currentCount} ${currentCount === 1 ? 'recipient' : 'recipients'}`}
                </span>
              </div>
              <div className="campaign-audience-grid">
                {AUDIENCE_PRESETS.map(a => {
                  const c = countFor(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      className={`campaign-audience${audienceKey === a.key ? ' is-active' : ''}`}
                      onClick={() => setAudienceKey(a.key)}
                    >
                      <span className="campaign-audience__name">{a.label}</span>
                      <span className="campaign-audience__count">
                        {c === null ? '—' : c}
                      </span>
                      <span className="campaign-audience__desc">{a.desc}</span>
                    </button>
                  );
                })}
              </div>
              <p className="campaign-card__footnote">
                Users who disabled email updates are automatically excluded from every send.
              </p>
            </div>

            {/* Subject */}
            <div className="campaign-card">
              <div className="campaign-card__header">
                <h3>Subject Line</h3>
                <button
                  type="button"
                  className="ai-assist-btn"
                  onClick={() => setAiModal('subject')}
                  aria-label="Get AI subject line ideas"
                >
                  ✨ AI Suggest
                </button>
              </div>
              <div className="campaign-field">
                <input
                  type="text"
                  className="campaign-input"
                  placeholder="Catchy subject line that earns the open…"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={100}
                />
                <span className={`campaign-counter${subjectCount > 78 ? ' is-warn' : ''}`}>
                  {subjectCount} / 100
                </span>
              </div>
              <p className="campaign-card__footnote">
                Aim for under 60 characters so it doesn't get cut off in mobile inboxes.
              </p>
            </div>

            {/* Body */}
            <div className="campaign-card">
              <div className="campaign-card__header">
                <h3>Email Body</h3>
                <button
                  type="button"
                  className="ai-assist-btn"
                  onClick={() => setAiModal('body')}
                  aria-label="Refine or generate body with AI"
                >
                  ✨ AI Assist
                </button>
              </div>
              <div className="campaign-field">
                <textarea
                  className="campaign-textarea"
                  placeholder="Write your message…"
                  rows={10}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
                <span className="campaign-counter">{charCount} chars</span>
              </div>
            </div>

            {/* CTA */}
            <div className="campaign-card">
              <h3>Call-to-Action Button</h3>
              <p className="campaign-card__hint">Optional — leave blank to omit the button.</p>
              <div className="campaign-cta-row">
                <div className="campaign-field">
                  <label>Button label</label>
                  <input
                    type="text"
                    className="campaign-input"
                    placeholder="e.g. View Predictions"
                    value={ctaLabel}
                    onChange={e => setCtaLabel(e.target.value)}
                    maxLength={40}
                  />
                </div>
                <div className="campaign-field">
                  <label>Destination URL</label>
                  <input
                    type="url"
                    className="campaign-input"
                    placeholder="https://www.sandlotpicks.com/…"
                    value={ctaUrl}
                    onChange={e => setCtaUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Test + Send */}
            <div className="campaign-card campaign-send-card">
              <h3>Send Test &amp; Publish</h3>

              <div className="campaign-test-row">
                <input
                  type="email"
                  className="campaign-input"
                  placeholder="your-email@example.com"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="campaign-btn campaign-btn--ghost"
                  onClick={handleTestSend}
                  disabled={!testEmail || !subject || testStatus === 'sending'}
                >
                  {testStatus === 'sending' ? 'Sending…'
                    : testStatus === 'sent' ? '✓ Test sent'
                    : testStatus === 'error' ? '✗ Test failed'
                    : 'Send Test'}
                </button>
              </div>
              {testError && (
                <div className="campaign-send-error">⚠ {testError}</div>
              )}

              <div className="campaign-send-row">
                <button
                  type="button"
                  className="campaign-btn campaign-btn--primary"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canSend || sendStatus === 'sending' || currentCount === null}
                >
                  {sendStatus === 'sending' ? 'Sending…'
                    : sendStatus === 'sent' ? '✓ Campaign sent!'
                    : currentCount === null ? 'Loading recipient count…'
                    : `Send to ${currentCount} recipients`}
                </button>
              </div>
              {sendError && (
                <div className="campaign-send-error">⚠ {sendError}</div>
              )}
            </div>

          </div>

          {/* ── Preview column ──────────────────────────────── */}
          <div className="campaign-preview-col">
            <div className="campaign-preview-label">Live Preview</div>
            <EmailPreview subject={subject} body={body} cta={cta} />
          </div>
        </div>

        {/* History */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
          const safePage   = Math.min(historyPage, totalPages - 1);
          const start      = safePage * HISTORY_PAGE_SIZE;
          const visible    = history.slice(start, start + HISTORY_PAGE_SIZE);
          const showPager  = history.length > HISTORY_PAGE_SIZE;

          return (
            <div className="campaign-history">
              <div className="campaign-history__header">
                <h2>Recent Campaigns</h2>
                <span className="campaign-history__count">
                  {historyLoading ? '…' : `${history.length} sent`}
                </span>
              </div>
              {historyError ? (
                <div className="campaign-send-error">⚠ {historyError}</div>
              ) : historyLoading ? (
                <div className="campaign-history__empty">Loading campaigns…</div>
              ) : history.length === 0 ? (
                <div className="campaign-history__empty">No campaigns sent yet.</div>
              ) : (
                <>
                  <div className="campaign-history__list">
                    {visible.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="campaign-history__row campaign-history__row--button"
                        onClick={() => setOpenCampaign(c)}
                        title={`View "${c.subject || '(no subject)'}"`}
                      >
                        <div className="campaign-history__row-main">
                          <span className="campaign-history__subject">{c.subject || '(no subject)'}</span>
                          <span className="campaign-history__meta">
                            {AUDIENCE_PRESETS.find(a => a.key === c.audience)?.label || c.audience}
                            {' · '}{c.recipientCount} recipients
                            {' · '}{formatCampaignSentAt(c.sentAt)}
                          </span>
                        </div>
                        <span className={`campaign-history__status campaign-history__status--${c.status}`}>
                          {c.status}
                        </span>
                      </button>
                    ))}
                  </div>
                  {showPager && (
                    <div className="campaign-history__pager">
                      <button
                        type="button"
                        className="campaign-btn campaign-btn--ghost campaign-history__pager-btn"
                        onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                      >
                        ← Previous
                      </button>
                      <span className="campaign-history__pager-label">
                        Page {safePage + 1} of {totalPages}
                      </span>
                      <button
                        type="button"
                        className="campaign-btn campaign-btn--ghost campaign-history__pager-btn"
                        onClick={() => setHistoryPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={safePage >= totalPages - 1}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

      </div>

      <ConfirmSendModal
        open={confirmOpen}
        audience={audience}
        recipients={currentCount ?? 0}
        subject={subject}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmOpen(false)}
      />

      <AIAssistModal
        open={aiModal !== null}
        mode={aiModal}
        audience={audience}
        recipientCount={currentCount}
        currentBody={body}
        onClose={() => setAiModal(null)}
        onApply={(text) => {
          if (aiModal === 'subject') setSubject(text);
          else if (aiModal === 'body') setBody(text);
        }}
      />

      {openCampaign && (
        <CampaignDetailDrawer
          campaignId={openCampaign.id}
          summary={openCampaign}
          onClose={() => setOpenCampaign(null)}
          onDeleted={(id) => {
            setHistory(prev => prev.filter(c => c.id !== id));
            setOpenCampaign(null);
          }}
        />
      )}
    </div>
  );
}
