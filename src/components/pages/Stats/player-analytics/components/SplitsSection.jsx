/**
 * ============================================================================
 * SPLITS SECTION COMPONENT
 * ============================================================================
 * 
 * PURPOSE:
 * Displays player performance splits - how they perform in different situations:
 * - vs Left-handed vs Right-handed opponents (batters vs LHP/RHP, pitchers vs LHB/RHB)
 * - Home vs Away game performance
 * 
 * PARENT COMPONENT:
 * - playerProfileStats.jsx (main Player Profile page)
 * 
 * DATA SOURCES:
 * - activeVsHandSplits: Season splits by opponent handedness
 * - activeVsHandSplitsCareer: Career splits by opponent handedness
 * - activeHomeRoadSplits: Season splits by home/away location
 * - activeHomeRoadSplitsCareer: Career splits by home/away location
 * 
 * KEY FEATURES:
 * 1. Handedness Toggle: Switch between vs L/R view and Home/Away view
 * 2. Split Cards: Side-by-side comparison of performance in each split
 * 3. Career/Season Integration: Shows career splits when Career tab is active
 * 
 * TWO-WAY PLAYER (TWP) SUPPORT:
 * - Pitchers show: OPP AVG, OPP OPS, WHIP, K/9, HR/9, etc.
 * - Batters show: AVG, OPS, HR, TB, SO, BB, AB/HR
 * 
 * SPLIT TYPES:
 * - Handedness: vs LHP/RHP (batters) or vs LHB/RHB (pitchers)
 * - Home/Away: Performance at home stadium vs on the road
 * 
 * API DATA STRUCTURE:
 * - Season splits come as array with nested objects (e.g., {season: 2024, vs_lhp: {...}, vs_rhp: {...}})
 * - Career splits come as flat objects (e.g., {vs_lhp: {...}, vs_rhp: {...}})
 * 
 * PERFORMANCE NOTES:
 * - Wrapped in React.memo to prevent unnecessary re-renders
 * - Complex data extraction logic is isolated in render functions
 * 
 * ============================================================================
 */

import React from 'react';

/**
 * Helper: Renders a single stat item in the split card
 */
const SplitStat = ({ value, label }) => (
  <div className="pps-split-stat">
    <span className="pps-split-stat-value">{value}</span>
    <span className="pps-split-stat-label">{label}</span>
  </div>
);

/**
 * Helper: Renders pitcher split stats grid
 */
const PitcherSplitStats = ({ split }) => (
  <div className="pps-split-stats">
    <SplitStat value={split?.avg?.toFixed(3)?.replace(/^0/, '') || '-'} label="OPP AVG" />
    <SplitStat value={split?.ops?.toFixed(3) || '-'} label="OPP OPS" />
    <SplitStat value={split?.whip?.toFixed(2) || '-'} label="WHIP" />
    <SplitStat value={split?.k_per_9?.toFixed(1) || '-'} label="K/9" />
    <SplitStat value={split?.hr_per_9?.toFixed(1) || '-'} label="HR/9" />
    <SplitStat value={split?.hits_per_9?.toFixed(1) || '-'} label="H/9" />
    <SplitStat value={split?.go_ao_ratio?.toFixed(2) || '-'} label="GO/AO" />
  </div>
);

/**
 * Helper: Renders batter split stats grid
 */
const BatterSplitStats = ({ split }) => (
  <div className="pps-split-stats">
    <SplitStat value={split?.avg?.toFixed(3)?.replace(/^0/, '') || '-'} label="AVG" />
    <SplitStat value={split?.ops?.toFixed(3) || '-'} label="OPS" />
    <SplitStat value={split?.home_runs || '-'} label="HR" />
    <SplitStat value={split?.total_bases || '-'} label="TB" />
    <SplitStat value={split?.strikeouts || '-'} label="SO" />
    <SplitStat value={split?.walks || '-'} label="BB" />
    <SplitStat value={split?.at_bats_per_hr?.toFixed(1) || '-'} label="AB/HR" />
  </div>
);

/**
 * Helper: Renders pitcher home/road split stats grid
 */
const PitcherHomeRoadStats = ({ split }) => (
  <div className="pps-split-stats">
    <SplitStat value={split?.era?.toFixed(2) || '-'} label="ERA" />
    <SplitStat value={split?.whip?.toFixed(2) || '-'} label="WHIP" />
    <SplitStat value={split?.avg?.toFixed(3)?.replace(/^0/, '') || '-'} label="OPP AVG" />
    <SplitStat value={split?.innings_pitched?.toFixed(1) || '-'} label="IP" />
    <SplitStat value={split?.strikeouts || '-'} label="K" />
    <SplitStat value={split?.walks_allowed || split?.walks || '-'} label="BB" />
    <SplitStat value={split?.k_per_9?.toFixed(1) || '-'} label="K/9" />
  </div>
);

/**
 * SplitsSection - Displays performance splits (vs L/R and Home/Away)
 * 
 * @param {Object} props
 * @param {string} props.selectedSeason - Currently selected season year
 * @param {string} props.activeStatsTab - 'current' or 'career'
 * @param {string} props.activeSplitsTab - 'handedness' or 'homeAway'
 * @param {Function} props.setActiveSplitsTab - Callback to switch split view
 * @param {boolean} props.statsLoading - Loading state for season stats
 * @param {boolean} props.careerSplitsLoading - Loading state for career splits
 * @param {boolean} props.showPitchingStats - Whether to show pitching (true) or batting (false)
 * @param {Array} props.activeVsHandSplits - Season vs-hand splits data
 * @param {Object} props.activeVsHandSplitsCareer - Career vs-hand splits data
 * @param {Array} props.activeHomeRoadSplits - Season home/road splits data
 * @param {Object} props.activeHomeRoadSplitsCareer - Career home/road splits data
 */
const SplitsSection = React.memo(function SplitsSection({
  selectedSeason,
  activeStatsTab,
  activeSplitsTab,
  setActiveSplitsTab,
  statsLoading,
  careerSplitsLoading,
  showPitchingStats,
  activeVsHandSplits,
  activeVsHandSplitsCareer,
  activeHomeRoadSplits,
  activeHomeRoadSplitsCareer,
}) {
  /**
   * Extracts the vs-left split data based on player type and active tab
   * - For pitchers: vs LHB (left-handed batters)
   * - For batters: vs LHP (left-handed pitchers)
   */
  const getVsLeftSplit = () => {
    if (activeStatsTab === 'career' && activeVsHandSplitsCareer) {
      return showPitchingStats ? activeVsHandSplitsCareer?.vs_lhb : activeVsHandSplitsCareer?.vs_lhp;
    }
    // Season splits: Find the matching season entry
    const seasonSplits = activeVsHandSplits?.find(s => String(s.season) === String(selectedSeason));
    return showPitchingStats 
      ? (seasonSplits?.vs_lhb || activeVsHandSplits?.find(s => s.split_type === 'vs_lhb' || s.vs_hand === 'L'))
      : (seasonSplits?.vs_lhp || activeVsHandSplits?.find(s => s.split_type === 'vs_lhp' || s.vs_hand === 'L'));
  };

  /**
   * Extracts the vs-right split data based on player type and active tab
   * - For pitchers: vs RHB (right-handed batters)
   * - For batters: vs RHP (right-handed pitchers)
   */
  const getVsRightSplit = () => {
    if (activeStatsTab === 'career' && activeVsHandSplitsCareer) {
      return showPitchingStats ? activeVsHandSplitsCareer?.vs_rhb : activeVsHandSplitsCareer?.vs_rhp;
    }
    const seasonSplits = activeVsHandSplits?.find(s => String(s.season) === String(selectedSeason));
    return showPitchingStats 
      ? (seasonSplits?.vs_rhb || activeVsHandSplits?.find(s => s.split_type === 'vs_rhb' || s.vs_hand === 'R'))
      : (seasonSplits?.vs_rhp || activeVsHandSplits?.find(s => s.split_type === 'vs_rhp' || s.vs_hand === 'R'));
  };

  /**
   * Extracts home split data based on active tab
   */
  const getHomeSplit = () => {
    if (activeStatsTab === 'career' && activeHomeRoadSplitsCareer) {
      return activeHomeRoadSplitsCareer?.at_home;
    }
    const seasonSplits = activeHomeRoadSplits?.find(s => String(s.season) === String(selectedSeason));
    return seasonSplits?.at_home || activeHomeRoadSplits?.find(s => 
      s.split_type === 'home' || s.split_type === 'at_home' || 
      s.split === 'home' || s.location === 'home'
    );
  };

  /**
   * Extracts away/road split data based on active tab
   */
  const getAwaySplit = () => {
    if (activeStatsTab === 'career' && activeHomeRoadSplitsCareer) {
      return activeHomeRoadSplitsCareer?.on_road;
    }
    const seasonSplits = activeHomeRoadSplits?.find(s => String(s.season) === String(selectedSeason));
    return seasonSplits?.on_road || activeHomeRoadSplits?.find(s => 
      s.split_type === 'away' || s.split_type === 'road' || s.split_type === 'on_road' ||
      s.split === 'away' || s.split === 'road' || s.location === 'away'
    );
  };

  const isLoading = statsLoading || careerSplitsLoading;
  const vsLeft = getVsLeftSplit();
  const vsRight = getVsRightSplit();
  const homeSplit = getHomeSplit();
  const awaySplit = getAwaySplit();

  return (
    <section className="pps-section">
      {/* ========== SECTION HEADER ========== */}
      <div className="pps-section-header">
        <div>
          <h2 className="pps-section-title">Player Splits</h2>
          <p className="pps-section-subtitle">
            {activeStatsTab === 'career' ? 'Career' : selectedSeason} performance breakdowns
          </p>
        </div>
        
        {/* ========== SPLIT TYPE TOGGLE ========== */}
        <div className="pps-tab-toggle">
          <button
            className={`pps-tab-btn ${activeSplitsTab === 'handedness' ? 'active' : ''}`}
            onClick={() => setActiveSplitsTab('handedness')}
          >
            vs L/R
          </button>
          <button
            className={`pps-tab-btn ${activeSplitsTab === 'homeAway' ? 'active' : ''}`}
            onClick={() => setActiveSplitsTab('homeAway')}
          >
            Home/Away
          </button>
        </div>
      </div>

      {/* ========== SPLITS CONTENT ========== */}
      <div className="pps-splits-content">
        {isLoading ? (
          <div className="pps-stats-loading">Loading splits...</div>
        ) : activeSplitsTab === 'handedness' ? (
          /* ========== HANDEDNESS SPLITS (vs L/R) ========== */
          <div className="pps-splits-comparison">
            {/* vs Left Split Card */}
            <div className="pps-split-card vs-left">
              <div className="pps-split-header">
                <span className="pps-split-label">
                  {showPitchingStats ? 'vs LHB' : 'vs LHP'}
                </span>
                <span className="pps-split-sample">
                  {showPitchingStats 
                    ? `${vsLeft?.tb_allowed || '-'} TB Allowed`
                    : `${vsLeft?.hits || '-'} H`
                  }
                </span>
              </div>
              {showPitchingStats 
                ? <PitcherSplitStats split={vsLeft} />
                : <BatterSplitStats split={vsLeft} />
              }
            </div>

            {/* VS Divider */}
            <div className="pps-split-vs-divider">VS</div>

            {/* vs Right Split Card */}
            <div className="pps-split-card vs-right">
              <div className="pps-split-header">
                <span className="pps-split-label">
                  {showPitchingStats ? 'vs RHB' : 'vs RHP'}
                </span>
                <span className="pps-split-sample">
                  {showPitchingStats 
                    ? `${vsRight?.tb_allowed || '-'} TB Allowed`
                    : `${vsRight?.hits || '-'} H`
                  }
                </span>
              </div>
              {showPitchingStats 
                ? <PitcherSplitStats split={vsRight} />
                : <BatterSplitStats split={vsRight} />
              }
            </div>
          </div>
        ) : (
          /* ========== HOME/AWAY SPLITS ========== */
          <div className="pps-splits-comparison">
            {/* Home Split Card */}
            <div className="pps-split-card home">
              <div className="pps-split-header">
                <span className="pps-split-label">Home</span>
                <span className="pps-split-sample">
                  {showPitchingStats 
                    ? `${homeSplit?.wins || 0}-${homeSplit?.losses || 0} (${homeSplit?.games_started || 0} GS)`
                    : `${homeSplit?.hits || '-'} H`
                  }
                </span>
              </div>
              {showPitchingStats 
                ? <PitcherHomeRoadStats split={homeSplit} />
                : <BatterSplitStats split={homeSplit} />
              }
            </div>

            {/* VS Divider */}
            <div className="pps-split-vs-divider">VS</div>

            {/* Away Split Card */}
            <div className="pps-split-card away">
              <div className="pps-split-header">
                <span className="pps-split-label">Away</span>
                <span className="pps-split-sample">
                  {showPitchingStats 
                    ? `${awaySplit?.wins || 0}-${awaySplit?.losses || 0} (${awaySplit?.games_started || 0} GS)`
                    : `${awaySplit?.hits || '-'} H`
                  }
                </span>
              </div>
              {showPitchingStats 
                ? <PitcherHomeRoadStats split={awaySplit} />
                : <BatterSplitStats split={awaySplit} />
              }
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

export default SplitsSection;
