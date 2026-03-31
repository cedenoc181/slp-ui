export default function ScoutAiButton({ hasAnalysis, loading, onClick, isToday = false, scoutAiAvailable = true, pendingLabel = null, tooltipPosition = 'bottom' }) {
  if (!isToday) return null;
  const isPending = !scoutAiAvailable;
  const pendingTooltip = pendingLabel
    ? `Scouting report available by ${pendingLabel}`
    : 'Scouting report available by 4:00 PM ET';
  return (
    <button
      className={`scout-ai-btn${loading ? ' scout-ai-btn--loading' : ''}${hasAnalysis ? ' scout-ai-btn--ready' : ''}${isPending ? ' scout-ai-btn--pending' : ''}${tooltipPosition === 'right' ? ' scout-ai-btn--tooltip-right' : ''}`}
      onClick={isPending ? undefined : onClick}
      disabled={loading}
      aria-disabled={isPending || undefined}
      aria-label={isPending ? 'Scouting report not yet available' : 'Get Scout AI analysis for this matchup'}
      data-tooltip={isPending ? pendingTooltip : 'ML · Run Line · Totals'}
    >
      {loading ? (
        <>
          <span className="scout-ai-btn__spinner" aria-hidden="true" />
          <span>Analyzing…</span>
        </>
      ) : hasAnalysis ? (
        <>
          <svg className="scout-ai-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a5 5 0 0 1 5 5c0 1.5-.67 2.83-1.72 3.75L17 22H7l1.72-11.25A5 5 0 0 1 12 2z"/>
            <line x1="9" y1="9" x2="15" y2="9"/>
          </svg>
          <span>Scouting Report</span>
        </>
      ) : (
        <>
          <svg className="scout-ai-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14Z"/>
          </svg>
          <span>Scouting Report</span>
        </>
      )}
    </button>
  );
}
