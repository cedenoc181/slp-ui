export function SkeletonInsightCard() {
  return (
    <div className="insight-card insight-card--skeleton">
      <div className="insight-icon">
        <div className="insight-skeleton-line short analysis-skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
      </div>
      <div className="insight-body">
        <div className="insight-skeleton-line wide analysis-skeleton" style={{ marginBottom: 6 }} />
        <div className="insight-skeleton-line mid analysis-skeleton" />
      </div>
    </div>
  );
}

export function SkeletonSplitRows() {
  return (
    <>
      {[80, 65, 70, 55, 60].map((w, i) => (
        <div key={i} className="split-skeleton-row analysis-skeleton" style={{ width: `${w}%` }} />
      ))}
    </>
  );
}
