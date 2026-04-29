import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AUDIENCE_PRESETS, MOCK_CAMPAIGN_HISTORY, formatCampaignSentAt } from '../../../data/constants/campaignsMockData';
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

// Pre-canned mock outputs — replace with real LLM call later.
function mockGenerateBody({ prompt, audience, currentBody }) {
  const segment = audience.label.toLowerCase();
  const opening = prompt
    ? `Hey there,\n\nWe wanted to share something with our ${segment}.`
    : `Hey there,\n\nQuick update for our ${segment}.`;
  const middle = prompt
    ? `\n\n${prompt}\n\nWe think this is going to make a real difference in how you approach the season.`
    : `\n\nWe just shipped a few improvements based on your feedback. Highlights below — log in any time to check them out.`;
  const close = `\n\n• Game predictions updated for tonight's slate\n• Pitcher props refreshed with the latest odds\n• Scout AI reports running on every matchup\n\nAs always, hit reply if you have any questions.\n\n— The Sandlot Picks team`;
  return (currentBody && currentBody.length > 100)
    ? `${currentBody}\n\n${close}`
    : opening + middle + close;
}

function mockSubjectIdeas(audience) {
  const seg = audience.label;
  return [
    `${seg}: tonight's top picks are live`,
    `Don't miss out — Scout AI has spoken`,
    `Your edge for tonight's slate (${seg.toLowerCase()})`,
    `Quick read: 3 plays we love today`,
    `New from Sandlot Picks ⚾`,
  ];
}

function AIAssistModal({ open, mode, audience, currentBody, onClose, onApply }) {
  const [prompt, setPrompt]       = useState('');
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft]         = useState('');
  const [subjectIdeas, setSubjectIdeas] = useState([]);

  useEffect(() => {
    if (open) {
      setPrompt('');
      setDraft('');
      setSubjectIdeas([]);
      setGenerating(false);
    }
  }, [open, mode]);

  if (!open) return null;

  const isSubjectMode = mode === 'subject';

  const handleGenerate = async (quickActionId) => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1100)); // mock latency
    if (isSubjectMode) {
      setSubjectIdeas(mockSubjectIdeas(audience));
    } else {
      const effectivePrompt = quickActionId
        ? AI_QUICK_ACTIONS.find(a => a.id === quickActionId)?.label || prompt
        : prompt;
      setDraft(mockGenerateBody({ prompt: effectivePrompt, audience, currentBody }));
    }
    setGenerating(false);
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
            Targeting <strong>{audience.label}</strong> · {audience.mockCount} recipients
          </p>
        </div>

        <div className="ai-modal__body">
          {isSubjectMode ? (
            <>
              {subjectIdeas.length === 0 && !generating && (
                <button
                  type="button"
                  className="campaign-btn campaign-btn--primary"
                  onClick={() => handleGenerate()}
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
                <span className="ai-modal__quick-label">Or refine current draft:</span>
                {AI_QUICK_ACTIONS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    className="ai-quick-chip"
                    onClick={() => handleGenerate(a.id)}
                    disabled={generating}
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
                    disabled={!prompt || generating}
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

// ─── Email preview (right side) ──────────────────────────────────────────────
function EmailPreview({ subject, body, cta }) {
  return (
    <div className="campaign-preview">
      <div className="campaign-preview__chrome">
        <div className="campaign-preview__chrome-dot" style={{ background: '#ff5f56' }} />
        <div className="campaign-preview__chrome-dot" style={{ background: '#ffbd2e' }} />
        <div className="campaign-preview__chrome-dot" style={{ background: '#27c93f' }} />
        <span className="campaign-preview__chrome-url">no-reply@sandlotpicks.com</span>
      </div>
      <div className="campaign-preview__inner">
        <div className="campaign-preview__brand">⚾ Sandlot Picks</div>
        <h2 className="campaign-preview__subject">{subject || 'Your subject line preview'}</h2>
        <div className="campaign-preview__body">
          {body
            ? body.split('\n').map((line, i) => <p key={i}>{line || '\u00A0'}</p>)
            : <p className="campaign-preview__placeholder">Email body preview will appear here…</p>}
        </div>
        {cta?.label && (
          <a href={cta.url || '#'} className="campaign-preview__cta" onClick={e => e.preventDefault()}>
            {cta.label}
          </a>
        )}
        <div className="campaign-preview__footer">
          <p>Sent because you're subscribed to email updates from Sandlot Picks.</p>
          <p>
            <a href="https://www.sandlotpicks.com/account/settings" onClick={e => e.preventDefault()}>Manage preferences</a>
            {' · '}
            <a href="https://www.sandlotpicks.com/unsubscribe" onClick={e => e.preventDefault()}>Unsubscribe</a>
          </p>
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
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [sendStatus,   setSendStatus]   = useState(null); // null | 'sending' | 'sent' | 'error'

  const [history, setHistory] = useState(MOCK_CAMPAIGN_HISTORY);

  const [aiModal, setAiModal] = useState(null); // null | 'subject' | 'body'

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { if (user?.email) setTestEmail(user.email); }, [user]);

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
    // Mock: replace with real API call later
    await new Promise(r => setTimeout(r, 900));
    setTestStatus('sent');
    setTimeout(() => setTestStatus(null), 3500);
  };

  const handleConfirmSend = async () => {
    setConfirmOpen(false);
    setSendStatus('sending');
    // Mock: replace with real API call later
    await new Promise(r => setTimeout(r, 1200));
    setHistory(prev => [
      {
        id: Date.now(),
        subject,
        audience: audience.key,
        recipients: audience.mockCount,
        sentAt: new Date().toISOString(),
        status: 'sent',
      },
      ...prev,
    ]);
    setSendStatus('sent');
    setTimeout(() => {
      setSendStatus(null);
      setSubject('');
      setBody('');
      setCtaLabel('');
      setCtaUrl('');
      setActiveTemplate(null);
    }, 2500);
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
                  ~{audience.mockCount} {audience.mockCount === 1 ? 'recipient' : 'recipients'}
                </span>
              </div>
              <div className="campaign-audience-grid">
                {AUDIENCE_PRESETS.map(a => (
                  <button
                    key={a.key}
                    type="button"
                    className={`campaign-audience${audienceKey === a.key ? ' is-active' : ''}`}
                    onClick={() => setAudienceKey(a.key)}
                  >
                    <span className="campaign-audience__name">{a.label}</span>
                    <span className="campaign-audience__count">{a.mockCount}</span>
                    <span className="campaign-audience__desc">{a.desc}</span>
                  </button>
                ))}
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
                    : 'Send Test'}
                </button>
              </div>

              <div className="campaign-send-row">
                <button
                  type="button"
                  className="campaign-btn campaign-btn--primary"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canSend || sendStatus === 'sending'}
                >
                  {sendStatus === 'sending' ? 'Sending…'
                    : sendStatus === 'sent' ? '✓ Campaign sent!'
                    : `Send to ${audience.mockCount} recipients`}
                </button>
              </div>
            </div>

          </div>

          {/* ── Preview column ──────────────────────────────── */}
          <div className="campaign-preview-col">
            <div className="campaign-preview-label">Live Preview</div>
            <EmailPreview subject={subject} body={body} cta={cta} />
          </div>
        </div>

        {/* History */}
        <div className="campaign-history">
          <div className="campaign-history__header">
            <h2>Recent Campaigns</h2>
            <span className="campaign-history__count">{history.length} sent</span>
          </div>
          {history.length === 0 ? (
            <div className="campaign-history__empty">No campaigns sent yet.</div>
          ) : (
            <div className="campaign-history__list">
              {history.map(c => (
                <div key={c.id} className="campaign-history__row">
                  <div className="campaign-history__row-main">
                    <span className="campaign-history__subject">{c.subject || '(no subject)'}</span>
                    <span className="campaign-history__meta">
                      {AUDIENCE_PRESETS.find(a => a.key === c.audience)?.label || c.audience}
                      {' · '}{c.recipients} recipients
                      {' · '}{formatCampaignSentAt(c.sentAt)}
                    </span>
                  </div>
                  <span className={`campaign-history__status campaign-history__status--${c.status}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <ConfirmSendModal
        open={confirmOpen}
        audience={audience}
        recipients={audience.mockCount}
        subject={subject}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmOpen(false)}
      />

      <AIAssistModal
        open={aiModal !== null}
        mode={aiModal}
        audience={audience}
        currentBody={body}
        onClose={() => setAiModal(null)}
        onApply={(text) => {
          if (aiModal === 'subject') setSubject(text);
          else if (aiModal === 'body') setBody(text);
        }}
      />
    </div>
  );
}
