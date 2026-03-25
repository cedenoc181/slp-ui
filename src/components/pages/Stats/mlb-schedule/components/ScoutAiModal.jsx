import { useEffect, useCallback } from 'react';

// ── Inline markdown: **bold** ─────────────────────────────────────────────────
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ── Markdown string renderer ──────────────────────────────────────────────────
function MarkdownAnalysis({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let listItems = null;
  let k = 0;

  const flushList = () => {
    if (listItems) {
      elements.push(<ul key={k++} className="scout-bullets">{listItems}</ul>);
      listItems = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }

    if (line.startsWith('### ') || line.startsWith('## ')) {
      flushList();
      const heading = line.replace(/^#{2,3}\s/, '');
      // Map heading text to an icon
      const icon =
        /key factor/i.test(heading) ? '🔑' :
        /red flag/i.test(heading)   ? '⚠' :
        /total/i.test(heading)      ? '📈' :
        /pitch/i.test(heading)      ? '⚾' :
        /split/i.test(heading)      ? '📊' :
        /ml|model/i.test(heading)   ? '🤖' :
        /lean|pick|scout/i.test(heading) ? '🎯' : '📌';
      const isWarning = /red flag/i.test(heading);
      elements.push(
        <h4 key={k++} className={`scout-section-title${isWarning ? ' scout-section-title--warning' : ''}`}>
          <span className="scout-section-icon">{icon}</span>{heading}
        </h4>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!listItems) listItems = [];
      const inWarningSection = elements.some(
        el => el.props?.className?.includes('scout-section-title--warning')
      );
      listItems.push(
        <li key={k++} className={`scout-bullet-item${inWarningSection ? ' warning' : ''}`}>{renderInline(line.slice(2))}</li>
      );
    } else {
      flushList();
      elements.push(
        <p key={k++} className="scout-section-body">{renderInline(line)}</p>
      );
    }
  }
  flushList();

  return <div className="scout-structured">{elements}</div>;
}

// ── Confidence dots ──────────────────────────────────────────────────────────
function ConfidenceDots({ value }) {
  return (
    <span className="scout-confidence" aria-label={`Confidence ${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`scout-conf-dot${i < value ? ' filled' : ''}`} />
      ))}
    </span>
  );
}

// ── Structured analysis renderer ─────────────────────────────────────────────
function StructuredAnalysis({ analysis: raw }) {
  // Server may return the structured object as a JSON string — parse if needed
  let a = raw;
  if (typeof a === 'string') {
    try { a = JSON.parse(a); } catch { /* leave as-is, will fall through */ }
  }
  // Still a string after parse attempt → render as markdown
  if (!a || typeof a !== 'object') return <MarkdownAnalysis text={String(raw)} />;

  return (
    <div className="scout-structured">

      {/* Headline */}
      {a.headline && (
        <p className="scout-headline">{a.headline}</p>
      )}

      {/* Picks */}
      {Array.isArray(a.picks) && a.picks.length > 0 && (
        <div className="scout-picks-row">
          {a.picks.map((pick, i) => (
            <div key={i} className="scout-pick-card">
              <span className="scout-pick-type">{pick.type}</span>
              <span className="scout-pick-value">{pick.pick}</span>
              <ConfidenceDots value={pick.confidence} />
            </div>
          ))}
        </div>
      )}

      {/* Pitching Matchup */}
      {a.pitchingMatchup && (
        <div className="scout-section">
          <h4 className="scout-section-title">
            <span className="scout-section-icon">⚾</span> Pitching Matchup
          </h4>
          <p className="scout-section-body">{a.pitchingMatchup}</p>
        </div>
      )}

      {/* Splits Edge */}
      {a.splitsEdge && (
        <div className="scout-section">
          <h4 className="scout-section-title">
            <span className="scout-section-icon">📊</span> Splits Edge
          </h4>
          <p className="scout-section-body">{a.splitsEdge}</p>
        </div>
      )}

      {/* Key Factors */}
      {Array.isArray(a.keyFactors) && a.keyFactors.length > 0 && (
        <div className="scout-section">
          <h4 className="scout-section-title">
            <span className="scout-section-icon">🔑</span> Key Factors
          </h4>
          <ul className="scout-bullets">
            {a.keyFactors.map((f, i) => (
              <li key={i} className="scout-bullet-item">{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Total Lean */}
      {a.totalLean && (
        <div className="scout-section">
          <h4 className="scout-section-title">
            <span className="scout-section-icon">📈</span> Total Lean
          </h4>
          <div className="scout-lean">
            <span className={`scout-lean-badge scout-lean-badge--${(a.totalLean.lean || '').toLowerCase()}`}>
              {a.totalLean.lean}
            </span>
            <p className="scout-section-body">{a.totalLean.reason}</p>
          </div>
        </div>
      )}

      {/* Red Flags */}
      {Array.isArray(a.redFlags) && a.redFlags.length > 0 && (
        <div className="scout-section">
          <h4 className="scout-section-title scout-section-title--warning">
            <span className="scout-section-icon">⚠</span> Red Flags
          </h4>
          <ul className="scout-bullets scout-bullets--warning">
            {a.redFlags.map((f, i) => (
              <li key={i} className="scout-bullet-item">{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ML Alignment */}
      {a.mlAlignment && (
        <div className="scout-section">
          <h4 className="scout-section-title">
            <span className="scout-section-icon">🤖</span> ML Alignment
          </h4>
          <p className="scout-section-body">{a.mlAlignment}</p>
        </div>
      )}

    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export default function ScoutAiModal({
  isOpen,
  onClose,
  analysis,
  error,
  loading,
  onRetry,
  generatedAt,
}) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const responsibleGamingText = analysis?.responsibleGaming || null;

  return (
    <div className="scout-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Scout AI Analysis">
      <div className="scout-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="scout-modal__header">
          <div className="scout-modal__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14Z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14Z"/>
            </svg>
            <span>Scout AI</span>
            <span className="scout-modal__beta">BETA</span>
          </div>
          <button className="scout-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="scout-modal__body">
          {loading && (
            <div className="scout-modal__loading">
              <div className="scout-modal__spinner" />
              <p>Scout is analyzing this matchup…</p>
            </div>
          )}

          {!loading && error && (
            <div className="scout-modal__error">
              <span className="scout-modal__error-icon">⚠</span>
              <p>{error}</p>
              {onRetry && (
                <button className="scout-modal__retry-btn" onClick={onRetry}>
                  Try Again
                </button>
              )}
            </div>
          )}

          {!loading && !error && analysis && (
            <StructuredAnalysis analysis={analysis} />
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="scout-modal__footer">
            {formattedTime && (
              <span className="scout-modal__timestamp">Analysis generated at {formattedTime}</span>
            )}
            <p className="scout-modal__disclaimer">
              {responsibleGamingText || '⚠ For entertainment purposes only. Scout AI does not guarantee outcomes. Please gamble responsibly. If you or someone you know has a gambling problem, call 1-800-GAMBLER.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
