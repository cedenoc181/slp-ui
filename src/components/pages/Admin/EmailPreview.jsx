import ReactMarkdown from 'react-markdown';
import spaLogo from '../../../assets/images/spa-retro-logo-removebg.png';

// Inline element styles mirror the server's _render_markdown_body() so
// preview ≡ inbox ≡ campaign-detail drawer. Used by:
//   - CampaignsPage.jsx (live preview in the composer)
//   - AdminPage.jsx CampaignDetailDrawer (read-only view of a sent email)
export const MD_COMPONENTS = {
  p:          ({ node, ...p }) => <p style={{ margin: '0 0 16px 0', lineHeight: 1.55, color: '#1a1a1a' }} {...p} />,
  strong:     ({ node, ...p }) => <strong style={{ fontWeight: 700 }} {...p} />,
  em:         ({ node, ...p }) => <em style={{ fontStyle: 'italic' }} {...p} />,
  a:          ({ node, children, ...p }) => (
    <a
      style={{ color: '#0d9488', textDecoration: 'underline' }}
      onClick={e => e.preventDefault()}
      {...p}
    >
      {children}
    </a>
  ),
  h1:         ({ node, children, ...p }) => <h1 style={{ fontSize: '1.5rem',  fontWeight: 800, color: '#111', margin: '1rem 0 0.6rem' }} {...p}>{children}</h1>,
  h2:         ({ node, children, ...p }) => <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', margin: '0.9rem 0 0.5rem' }} {...p}>{children}</h2>,
  h3:         ({ node, children, ...p }) => <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111', margin: '0.85rem 0 0.45rem' }} {...p}>{children}</h3>,
  h4:         ({ node, children, ...p }) => <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111', margin: '0.8rem 0 0.4rem' }} {...p}>{children}</h4>,
  ul:         ({ node, ordered, ...p }) => <ul style={{ margin: '0 0 16px 0', paddingLeft: '1.4rem' }} {...p} />,
  ol:         ({ node, ordered, ...p }) => <ol style={{ margin: '0 0 16px 0', paddingLeft: '1.4rem' }} {...p} />,
  li:         ({ node, ordered, ...p }) => <li style={{ margin: '0 0 4px 0', lineHeight: 1.55 }} {...p} />,
  blockquote: ({ node, ...p }) => (
    <blockquote
      style={{
        margin: '0 0 16px 0',
        padding: '0.5rem 0.9rem',
        borderLeft: '3px solid #2dd4bf',
        background: 'rgba(45, 212, 191, 0.06)',
        fontStyle: 'italic',
        color: '#374151',
      }}
      {...p}
    />
  ),
  hr:         () => <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '1.25rem 0' }} />,
  code:       ({ node, inline, className, children, ...p }) => (
    <code
      style={{
        background: '#f3f4f6',
        color: '#111',
        padding: '0.1rem 0.4rem',
        borderRadius: '4px',
        fontSize: '0.88em',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
      {...p}
    >
      {children}
    </code>
  ),
};

export default function EmailPreview({ subject, body, cta }) {
  return (
    <div className="campaign-preview">
      <div className="campaign-preview__chrome">
        <div className="campaign-preview__chrome-dot" style={{ background: '#ff5f56' }} />
        <div className="campaign-preview__chrome-dot" style={{ background: '#ffbd2e' }} />
        <div className="campaign-preview__chrome-dot" style={{ background: '#27c93f' }} />
        <span className="campaign-preview__chrome-url">no-reply@sandlotpicks.com</span>
      </div>
      <div className="campaign-preview__inner">
        <div className="campaign-preview__brand">
          <img src={spaLogo} alt="" className="campaign-preview__brand-logo" />
          <span>Sandlot Picks Analytics</span>
        </div>
        <h2 className="campaign-preview__subject">{subject || 'Your subject line preview'}</h2>
        <div className="campaign-preview__body">
          {body
            ? <ReactMarkdown components={MD_COMPONENTS}>{body}</ReactMarkdown>
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
