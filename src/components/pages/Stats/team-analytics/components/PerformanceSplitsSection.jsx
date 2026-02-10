import React from 'react';
import { getSplitPctColor } from '../utils';

/**
 * Split row component for displaying win/loss splits
 */
function SplitRow({ label, data, chartFilter }) {
  const showLocationBadge = chartFilter !== 'season';
  const pct = data?.pct || 0;
  
  return (
    <div className="split-row">
      <div className="split-label">
        {label}
        {showLocationBadge && (
          <span className="split-location-badge">
            {chartFilter === 'home' ? '🏠' : '✈️'}
          </span>
        )}
      </div>
      <div className="split-stats">
        <span className="split-record">
          {data?.wins || 0}-{data?.losses || 0}
        </span>
        <span className="split-pct" style={{ color: getSplitPctColor(pct) }}>
          {(pct * 100).toFixed(1)}%
        </span>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${pct * 100}%`,
              backgroundColor: getSplitPctColor(pct)
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Division split row (no location badge)
 */
function DivisionSplitRow({ label, wins, losses, pct }) {
  return (
    <div className="split-row">
      <div className="split-label">{label}</div>
      <div className="split-stats">
        <span className="split-record">{wins ?? 0}-{losses ?? 0}</span>
        <span className="split-pct" style={{ color: getSplitPctColor(pct || 0) }}>
          {((pct || 0) * 100).toFixed(1)}%
        </span>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${(pct || 0) * 100}%`,
              backgroundColor: getSplitPctColor(pct || 0)
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Performance splits section showing vs LHP/RHP and division splits
 */
function PerformanceSplitsSection({
  recordSplits,
  chartFilter,
  currentTeam,
  teamSeasonData,
  last10Games,
  last10Record,
}) {
  // Determine which data to show based on chartFilter
  const getVsData = () => {
    if (chartFilter === 'home') {
      return {
        vsLeft: recordSplits?.vs_left_sp_home || { wins: 0, losses: 0, pct: 0 },
        vsRight: recordSplits?.vs_right_sp_home || { wins: 0, losses: 0, pct: 0 },
      };
    } else if (chartFilter === 'away') {
      return {
        vsLeft: recordSplits?.vs_left_sp_away || { wins: 0, losses: 0, pct: 0 },
        vsRight: recordSplits?.vs_right_sp_away || { wins: 0, losses: 0, pct: 0 },
      };
    }
    // Combined (season)
    return {
      vsLeft: recordSplits?.vs_left_sp || { wins: 0, losses: 0, pct: 0 },
      vsRight: recordSplits?.vs_right_sp || { wins: 0, losses: 0, pct: 0 },
    };
  };

  // Determine team's league and get division data
  const teamLeague = currentTeam?.league || teamSeasonData?.team?.league;
  const isAL = teamLeague === 'AL' || teamLeague === 'American League' || teamSeasonData?.team?.league_name?.includes('American');
  const divisionData = isAL 
    ? recordSplits?.vs_american_league_division 
    : recordSplits?.vs_national_league_division;
  const leagueAbbr = isAL ? 'AL' : 'NL';

  const { vsLeft, vsRight } = getVsData();

  // Get last 10 data based on filter
  const getLast10Data = () => {
    let wins, losses, runsScored, runsAllowed, runDiff;

    if (chartFilter === 'home') {
      const homeData = recordSplits?.last_10_home_w_postseason;
      wins = homeData?.wins ?? 0;
      losses = homeData?.losses ?? 0;
      runsScored = homeData?.runs_scored ?? homeData?.runsScored ?? '-';
      runsAllowed = homeData?.runs_allowed ?? homeData?.runsAllowed ?? '-';
      runDiff = homeData?.run_diff ?? homeData?.runDiff ?? (runsScored !== '-' && runsAllowed !== '-' ? runsScored - runsAllowed : '-');
    } else if (chartFilter === 'away') {
      const awayData = recordSplits?.last_10_away_w_postseason;
      wins = awayData?.wins ?? 0;
      losses = awayData?.losses ?? 0;
      runsScored = awayData?.runs_scored ?? awayData?.runsScored ?? '-';
      runsAllowed = awayData?.runs_allowed ?? awayData?.runsAllowed ?? '-';
      runDiff = awayData?.run_diff ?? awayData?.runDiff ?? (runsScored !== '-' && runsAllowed !== '-' ? runsScored - runsAllowed : '-');
    } else {
      // Combined - use last10Games data
      const combinedData = Array.isArray(last10Games) && last10Games.length > 0 ? last10Games[0] : null;
      
      if (combinedData) {
        wins = combinedData.last_ten_wins ?? combinedData.wins ?? 0;
        losses = combinedData.last_ten_losses ?? combinedData.losses ?? 0;
        runsScored = combinedData.runs_scored ?? '-';
        runsAllowed = combinedData.runs_allowed ?? '-';
        runDiff = combinedData.run_differential ?? combinedData.run_diff ?? 
          (runsScored !== '-' && runsAllowed !== '-' ? runsScored - runsAllowed : '-');
      } else {
        // Fallback to last10Record
        wins = last10Record?.wins ?? 0;
        losses = last10Record?.losses ?? 0;
        runsScored = '-';
        runsAllowed = '-';
        runDiff = '-';
      }
    }

    return { wins, losses, runsScored, runsAllowed, runDiff };
  };

  const last10Data = getLast10Data();

  const getSubtitle = () => {
    if (chartFilter === 'home') return <><span className="subtitle-bold">🏠 Home</span> game performance breakdown</>;
    if (chartFilter === 'away') return <><span className="subtitle-bold">✈️ Away</span> game performance breakdown</>;
    return <><span className="subtitle-bold">📊 Combined</span> performance breakdown</>;
  };

  const getLast10Subtitle = () => {
    if (chartFilter === 'home') return <><strong>🏠 Home: </strong> last 10 home games performance</>;
    if (chartFilter === 'away') return <><strong>✈️ Away: </strong> last 10 away games performance</>;
    return <><strong>📊 Combined: </strong> last 10 games performance</>;
  };

  return (
    <div className="splits-section">
      {/* Split Stats Grid */}
      <div className="section-card">
        <div className="card-header">
          <h3>Performance Splits</h3>
          <p className="card-subtitle">{getSubtitle()}</p>
        </div>
        <div className="splits-grid">
          {recordSplits ? (
            <>
              <SplitRow 
                label="vs Left-Handed Pitching" 
                data={vsLeft} 
                chartFilter={chartFilter}
              />
              <SplitRow 
                label="vs Right-Handed Pitching" 
                data={vsRight} 
                chartFilter={chartFilter}
              />
              {/* Division Splits */}
              <DivisionSplitRow 
                label={`vs ${leagueAbbr} East`}
                wins={divisionData?.east_wins}
                losses={divisionData?.east_losses}
                pct={divisionData?.east_pct}
              />
              <DivisionSplitRow 
                label={`vs ${leagueAbbr} Central`}
                wins={divisionData?.central_wins}
                losses={divisionData?.central_losses}
                pct={divisionData?.central_pct}
              />
              <DivisionSplitRow 
                label={`vs ${leagueAbbr} West`}
                wins={divisionData?.west_wins}
                losses={divisionData?.west_losses}
                pct={divisionData?.west_pct}
              />
            </>
          ) : (
            <div className="no-data-message">No splits data available</div>
          )}
        </div>
      </div>

      {/* Last 10 Games */}
      <div className="section-card">
        <div className="card-header">
          <div>
            <h3>Last 10 Games</h3>
            <p className="card-subtitle">{getLast10Subtitle()}</p>
          </div>
        </div>
        {last10Data.wins !== undefined ? (
          <div className="last-10-stats">
            <div className="last-10-item">
              <div className="last-10-label">Record</div>
              <div className="last-10-value">{last10Data.wins}-{last10Data.losses}</div>
            </div>
            <div className="last-10-item">
              <div className="last-10-label">Runs Scored</div>
              <div className="last-10-value">{last10Data.runsScored}</div>
            </div>
            <div className="last-10-item">
              <div className="last-10-label">Runs Allowed</div>
              <div className="last-10-value">{last10Data.runsAllowed}</div>
            </div>
            <div className="last-10-item">
              <div className="last-10-label">Run Diff</div>
              <div className={`last-10-value ${last10Data.runDiff > 0 ? 'positive' : last10Data.runDiff < 0 ? 'negative' : ''}`}>
                {last10Data.runDiff !== '-' ? `${last10Data.runDiff > 0 ? '+' : ''}${last10Data.runDiff}` : '-'}
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data-message">No last 10 games data available</div>
        )}
      </div>
    </div>
  );
}

export default PerformanceSplitsSection;
