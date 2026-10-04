import { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { getSportsbookLabel } from '../../../../../data/constants/apiConstants';
import { resolveBetslipUrl } from '../../../../../lib/betslipLinks';
import iconTarget from '../../../../../assets/icons/target.png';
import iconPitcher from '../../../../../assets/icons/pitcher-prop.png';
import iconStatcast from '../../../../../assets/icons/statcast.png';
import iconSabermetric from '../../../../../assets/icons/sabermetric.png';
import iconPredictive from '../../../../../assets/icons/predictive-analytics.png';
import iconProfitLoss from '../../../../../assets/icons/profit-and-loss.png';
import iconMoneyball from '../../../../../assets/icons/moneyball.png';
import iconGamePropChip from '../../../../../assets/icons/game-prop.png';
import iconMl from '../../../../../assets/icons/ai-ml.png';
import iconAnalysis from '../../../../../assets/icons/analysis.png';

// Scout AI game markets that carry betslip deep links (never pitcher/batter props).
const GAME_PICK_TYPES = ['Moneyline', 'Run Line', 'Total'];

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
      // Map heading text to an asset icon (Red Flags keeps its emoji)
      const isWarning = /red flag/i.test(heading);
      const icon =
        /key factor/i.test(heading) ? iconSabermetric :
        /total/i.test(heading)      ? iconPredictive :
        /pitch/i.test(heading)      ? iconPitcher :
        /split/i.test(heading)      ? iconStatcast :
        /ml|model/i.test(heading)   ? iconMl :
        /lean|pick|scout/i.test(heading) ? iconTarget : iconAnalysis;
      elements.push(
        <h4 key={k++} className={`scout-section-title${isWarning ? ' scout-section-title--warning' : ''}`}>
          {isWarning
            ? <span className="scout-section-icon">⚠</span>
            : <img src={icon} className="scout-section-icon-img" alt="" />}
          {heading}
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

// ── Pick type visual metadata ─────────────────────────────────────────────────
const PICK_TYPE_META = {
  'Moneyline': { icon: iconMoneyball,   color: '#64b5f6', borderColor: 'rgba(100,181,246,0.4)' },
  'Run Line':  { icon: iconGamePropChip, color: '#4ade80', borderColor: 'rgba(74,222,128,0.4)'  },
  'Total':     { icon: iconPredictive,  color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)'  },
  '_default':  { icon: iconTarget,      color: '#a78bfa', borderColor: 'rgba(167,139,250,0.4)' },
};

// ── Structured analysis renderer ─────────────────────────────────────────────
function StructuredAnalysis({ analysis: raw }) {
  const { user } = useAuth();
  const preferredBook = user?.preferredBook ?? null;
  // No US-state code is carried on the user object today; {state} links (Caesars,
  // BetMGM) will resolve as unavailable until one exists.
  const stateCode = user?.stateCode ?? null;

  // Server may return the structured object as a JSON string — parse if needed
  let a = raw;
  if (typeof a === 'string') {
    try { a = JSON.parse(a); } catch { /* leave as-is, will fall through */ }
  }
  // Still a string after parse attempt → render as markdown
  if (!a || typeof a !== 'object') return <MarkdownAnalysis text={String(raw)} />;

  // Show a subtle "set your sportsbook" nudge only if the user has no book set
  // but at least one game pick actually offers betslip links.
  const hasBetslipCapablePick =
    Array.isArray(a.picks) &&
    a.picks.some(p =>
      GAME_PICK_TYPES.includes(p.type) &&
      p.deep_links && Object.keys(p.deep_links).length > 0
    );

  return (
    <div className="scout-structured">

      {/* Headline */}
      {a.headline && (
        <p className="scout-headline">{a.headline}</p>
      )}

      {/* Picks */}
      {Array.isArray(a.picks) && a.picks.length > 0 && (
        <div className="scout-picks-section">
          <h4 className="scout-section-title">
            <img src={iconTarget} className="scout-section-icon-img" alt="" /> Recommended Plays
          </h4>
          <div className="scout-picks-row">
            {a.picks.map((p, i) => {
              const meta = PICK_TYPE_META[p.type] ?? PICK_TYPE_META._default;
              // Betslip button: game picks only, user has a preferred book, and a
              // usable (fully-resolved) URL exists for that book on this pick.
              const betslipUrl = GAME_PICK_TYPES.includes(p.type)
                ? resolveBetslipUrl(p.deep_links, preferredBook, { stateCode })
                : null;
              const bookLabel = betslipUrl ? getSportsbookLabel(preferredBook) : null;
              return (
                <div key={i} className="scout-pick-card" style={{ borderColor: meta.borderColor }}>
                  <span className="scout-pick-type" style={{ color: meta.color }}>
                    <img src={meta.icon} className="scout-pick-type-icon" alt="" /> {p.type ?? '—'}
                  </span>
                  <span className="scout-pick-value">{p.pick ?? '—'}</span>
                  <ConfidenceDots value={p.confidence ?? 0} />
                  {p.best_odds && (
                    <div className="scout-pick-odds">
                      <span className={`scout-pick-odds-value ${String(p.best_odds).startsWith('-') ? 'neg' : 'pos'}`}>
                        {String(p.best_odds).startsWith('-') || String(p.best_odds).startsWith('+') ? p.best_odds : `+${p.best_odds}`}
                      </span>
                      {p.best_odds_book && (
                        <span className="scout-pick-odds-book">{p.best_odds_book}</span>
                      )}
                    </div>
                  )}
                  {betslipUrl && bookLabel && (
                    <a
                      className="scout-pick-betslip-btn"
                      href={betslipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Add to {bookLabel} slip
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          {!preferredBook && hasBetslipCapablePick && (
            <Link to="/account/settings" className="scout-picks-setbook-hint">
              Set your sportsbook to add these to your betslip →
            </Link>
          )}
        </div>
      )}

      {/* Pitching Matchup */}
      {a.pitchingMatchup && (
        <div className="scout-section">
          <h4 className="scout-section-title">
            <img src={iconPitcher} className="scout-section-icon-img" alt="" /> Pitching Matchup
          </h4>
          <p className="scout-section-body">{a.pitchingMatchup}</p>
        </div>
      )}

      {/* Splits Edge */}
      {a.splitsEdge && (
        <div className="scout-section">
          <h4 className="scout-section-title">
            <img src={iconStatcast} className="scout-section-icon-img" alt="" /> Splits Edge
          </h4>
          <p className="scout-section-body">{a.splitsEdge}</p>
        </div>
      )}

      {/* Key Factors */}
      {Array.isArray(a.keyFactors) && a.keyFactors.length > 0 && (
        <div className="scout-section">
          <h4 className="scout-section-title">
            <img src={iconSabermetric} className="scout-section-icon-img" alt="" /> Key Factors
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
            <img src={iconPredictive} className="scout-section-icon-img" alt="" /> Total Lean
          </h4>
          <div className="scout-lean">
            <span className={`scout-lean-badge scout-lean-badge--${(a.totalLean.lean || '').toLowerCase()}`}>
              {a.totalLean.lean}
            </span>
            <p className="scout-section-body">{a.totalLean.reason}</p>
          </div>
        </div>
      )}

      {/* Odds Edge */}
      {a.oddsEdge && (
        <div className="scout-section scout-section--odds">
          <h4 className="scout-section-title scout-section-title--odds">
            <img src={iconProfitLoss} className="scout-section-icon-img" alt="" /> Odds Edge
          </h4>
          <p className="scout-section-body">{a.oddsEdge}</p>
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
            <img src={iconMl} className="scout-section-icon-img" alt="" /> ML Alignment
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
            <span>Scouting Report</span>
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
<p className="scout-modal__disclaimer">
              {responsibleGamingText || '⚠ For entertainment purposes only. Scout AI does not guarantee outcomes. Please gamble responsibly. If you or someone you know has a gambling problem, call 1-800-GAMBLER.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
