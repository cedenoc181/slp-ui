function EdgeBar({ category, awayLabel, homeLabel, awayVal, homeVal, higherBetter = true }) {
  const isLoading = awayVal == null && homeVal == null;

  let awayPct = 50, homePct = 50;
  let awayWinner = false, homeWinner = false;

  if (!isLoading && awayVal != null && homeVal != null) {
    const total = awayVal + homeVal;
    if (total > 0) {
      awayPct = Math.round((awayVal / total) * 100);
      homePct = 100 - awayPct;
    }
    if (higherBetter) {
      awayWinner = awayVal > homeVal;
      homeWinner = homeVal > awayVal;
    } else {
      awayWinner = awayVal < homeVal;
      homeWinner = homeVal < awayVal;
    }
  }

  return (
    <div className="edge-bar-row">
      <div className="edge-bar-labels">
        <span className={`edge-label-team${awayWinner ? ' winner' : ''}`}>{awayLabel}</span>
        <span className="edge-label-category">{category}</span>
        <span className={`edge-label-team${homeWinner ? ' winner' : ''}`}>{homeLabel}</span>
      </div>
      {isLoading ? (
        <div className="edge-bar-skeleton analysis-skeleton" />
      ) : (
        <div className="edge-bar">
          <div className="edge-fill away-fill" style={{ width: `${awayPct}%` }} />
          <div className="edge-fill home-fill" style={{ width: `${homePct}%` }} />
        </div>
      )}
      <div className="edge-bar-values">
        <span className={`edge-value${awayWinner ? ' winner' : ''}`}>
          {awayVal != null ? awayVal : '—'}
        </span>
        <span className={`edge-value${homeWinner ? ' winner' : ''}`}>
          {homeVal != null ? homeVal : '—'}
        </span>
      </div>
    </div>
  );
}

export default function EdgeIndicators({ awayAbbr, homeAbbr, awayBatting, homeBatting, awayPitching, homePitching }) {
  const awayOPS = awayBatting?.ops  != null ? parseFloat(awayBatting.ops)  : null;
  const homeOPS = homeBatting?.ops  != null ? parseFloat(homeBatting.ops)  : null;
  const awayERA = awayPitching?.era != null ? parseFloat(awayPitching.era) : null;
  const homeERA = homePitching?.era != null ? parseFloat(homePitching.era) : null;
  const awayK9  = awayPitching?.strikeouts != null ? parseFloat(awayPitching.strikeouts) : null;
  const homeK9  = homePitching?.strikeouts != null ? parseFloat(homePitching.strikeouts) : null;

  const awayERAInv = awayERA != null ? Math.max(0, 10 - awayERA) : null;
  const homeERAInv = homeERA != null ? Math.max(0, 10 - homeERA) : null;

  return (
    <div className="edge-indicators-card">
      <EdgeBar
        category="Offense (OPS)"
        awayLabel={awayAbbr}
        homeLabel={homeAbbr}
        awayVal={awayOPS}
        homeVal={homeOPS}
        higherBetter
      />
      <EdgeBar
        category="Pitching (ERA — lower is better)"
        awayLabel={awayAbbr}
        homeLabel={homeAbbr}
        awayVal={awayERAInv}
        homeVal={homeERAInv}
        higherBetter
      />
      <EdgeBar
        category="Strikeouts"
        awayLabel={awayAbbr}
        homeLabel={homeAbbr}
        awayVal={awayK9}
        homeVal={homeK9}
        higherBetter
      />
    </div>
  );
}
