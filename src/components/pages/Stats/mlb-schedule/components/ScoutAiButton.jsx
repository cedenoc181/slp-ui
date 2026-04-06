import analysisIcon from '../../../../../assets/icons/analysis.png';

export default function ScoutAiButton({ hasAnalysis, loading, onClick, isToday = false, scoutAiAvailable = true, pendingLabel = null, tooltipPosition = 'bottom', usesRemaining = null, isLimitHit = false }) {
  if (!isToday) return null;
  const isPending   = !scoutAiAvailable;
  const isDisabled  = isPending || isLimitHit;

  const pendingTooltip = pendingLabel
    ? `Scouting report available by ${pendingLabel}`
    : 'Scouting report available by 4:00 PM ET';
  const limitTooltip   = 'Daily limit reached — upgrade for unlimited access';
  const defaultTooltip = usesRemaining !== null && !hasAnalysis
    ? `${usesRemaining} free use${usesRemaining !== 1 ? 's' : ''} remaining today`
    : 'ML · Run Line · Totals';

  const tooltip = isPending ? pendingTooltip : isLimitHit ? limitTooltip : defaultTooltip;

  return (
    <button
      className={`scout-ai-btn${loading ? ' scout-ai-btn--loading' : ''}${hasAnalysis ? ' scout-ai-btn--ready' : ''}${isDisabled ? ' scout-ai-btn--pending' : ''}${tooltipPosition === 'right' ? ' scout-ai-btn--tooltip-right' : ''}`}
      onClick={isDisabled ? undefined : onClick}
      disabled={loading}
      aria-disabled={isDisabled || undefined}
      aria-label={isLimitHit ? 'Daily Scout AI limit reached' : isPending ? 'Scouting report not yet available' : 'Get Scout AI analysis for this matchup'}
      data-tooltip={tooltip}
    >
      {loading ? (
        <>
          <span className="scout-ai-btn__spinner" aria-hidden="true" />
          <span>Analyzing…</span>
        </>
      ) : (
        <>
          <img src={analysisIcon} alt="" className="scout-ai-btn__icon" aria-hidden="true" />
          <span>{isLimitHit ? 'Limit Reached' : 'Scouting Report'}</span>
        </>
      )}
    </button>
  );
}
