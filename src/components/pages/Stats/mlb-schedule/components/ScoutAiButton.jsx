import analysisIcon from '../../../../../assets/icons/analysis.png';

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
      ) : (
        <>
          <img src={analysisIcon} alt="" className="scout-ai-btn__icon" aria-hidden="true" />
          <span>Scouting Report</span>
        </>
      )}
    </button>
  );
}
