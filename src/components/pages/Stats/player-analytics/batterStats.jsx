import React, { useCallback, useEffect, useMemo, useState } from 'react';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import '../../../../styles/stats-page-styling/batter-stats.css';

function BatterStats({ teamId = 'ALL', teamDbId = null, season = '2025', teamName = 'MLB' }) {
  const [hotMetric, setHotMetric] = useState('HR');
  const [showAllTopBatters, setShowAllTopBatters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isTeamSelected = teamId !== 'ALL';

  // ========== STATE FOR ALL DATA ==========

  // Top 10 batters (league-wide or team-specific)
  const [topBattersData, setTopBattersData] = useState([]);
  const [topBattersLoading, setTopBattersLoading] = useState(false);
  const [topBattersError, setTopBattersError] = useState(null);

  // Leaders for cards (team-specific or league-wide)
  const [battingLeaders, setBattingLeaders] = useState(null);
  const [leadersLoading, setLeadersLoading] = useState(false);

  // Hot batters (league-wide or team-specific)
  const [hotBattersData, setHotBattersData] = useState([]);
  const [hotBattersLoading, setHotBattersLoading] = useState(false);

  // Splits data (league-wide or team-specific)
  const [splitsData, setSplitsData] = useState(null);
  const [splitsLoading, setSplitsLoading] = useState(false);

  // ========== API CALLS ==========

  // Fetch top batters - team-specific or league-wide
  useEffect(() => {
    const fetchTopBatters = async () => {
      if (!season) return;

      setTopBattersLoading(true);
      setTopBattersError(null);

      try {
        let data;
        if (isTeamSelected && teamDbId) {
          data = await teamLeadersService.getTopTeamBattingLeaders(teamDbId, season, 'R');
        } else {
          data = await teamLeadersService.getTopBattingLeaders(season, 'R');
        }
        setTopBattersData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching top batters:', error);
        setTopBattersError('Failed to load top batters');
        setTopBattersData([]);
      } finally {
        setTopBattersLoading(false);
      }
    };

    fetchTopBatters();
  }, [season, isTeamSelected, teamDbId]);

  // Fetch batting leaders (team-specific or league-wide for leader cards)
  useEffect(() => {
    const fetchLeaders = async () => {
      if (!season) return;

      setLeadersLoading(true);

      try {
        let data;
        if (isTeamSelected && teamDbId) {
          data = await teamLeadersService.getTeamBattingLeaders(teamDbId, season, 'R');
        } else {
          // Use top batting leaders for league-wide leader cards
          data = await teamLeadersService.getTopBattingLeaders(season, 'R');
        }
        setBattingLeaders(data);
      } catch (error) {
        console.error('Error fetching batting leaders:', error);
        setBattingLeaders(null);
      } finally {
        setLeadersLoading(false);
      }
    };

    fetchLeaders();
  }, [season, isTeamSelected, teamDbId]);

  // Fetch hot batters - team-specific or league-wide
  useEffect(() => {
    const fetchHotBatters = async () => {
      if (!season) return;

      setHotBattersLoading(true);

      try {
        let data;
        if (isTeamSelected && teamDbId) {
          data = await teamLeadersService.getHotTeamBattingLeaders(teamDbId, season, 'R');
        } else {
          data = await teamLeadersService.getHotBattingLeaders(season, 'R');
        }
        setHotBattersData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching hot batters:', error);
        setHotBattersData([]);
      } finally {
        setHotBattersLoading(false);
      }
    };

    fetchHotBatters();
  }, [season, isTeamSelected, teamDbId]);

  // Fetch splits - team-specific or league-wide
  useEffect(() => {
    const fetchSplits = async () => {
      if (!season) return;

      setSplitsLoading(true);

      try {
        let data;
        if (isTeamSelected && teamDbId) {
          data = await teamLeadersService.getTeamSplits(teamDbId, season, 'R', 'batters');
        } else {
          data = await teamLeadersService.getLeagueSplits(season, 'R', 'batters');
        }
        setSplitsData(data);
      } catch (error) {
        console.error('Error fetching splits:', error);
        setSplitsData(null);
      } finally {
        setSplitsLoading(false);
      }
    };

    fetchSplits();
  }, [season, isTeamSelected, teamDbId]);

  // ========== MOBILE DETECTION ==========
  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // ========== HANDLERS ==========
  const handleToggleShowAll = useCallback(() => {
    setShowAllTopBatters(prev => !prev);
  }, []);

  // ========== FORMAT HELPERS ==========
  const formatAvg = useCallback((value) => {
    if (value === null || value === undefined) return '.000';
    if (typeof value === 'number') {
      return value.toFixed(3).replace(/^0/, '');
    }
    return String(value);
  }, []);

  const formatOps = useCallback((value) => {
    if (value === null || value === undefined) return '.000';
    if (typeof value === 'number') {
      return value.toFixed(3);
    }
    return String(value);
  }, []);

  // ========== COMPUTED DATA ==========

  // Visible top batters
  const visibleTopBatters = useMemo(() => {
    if (!topBattersData || !Array.isArray(topBattersData)) return [];
    const safeData = topBattersData.filter(Boolean);
    return showAllTopBatters ? safeData : safeData.slice(0, 7);
  }, [showAllTopBatters, topBattersData]);

  // Build leader categories from team data OR league data
  const leaderCategories = useMemo(() => {
    if (!battingLeaders) return [];

    // If it's an array (league-wide top leaders), build from array
    if (Array.isArray(battingLeaders)) {
      const categories = [];
      
      // Find leader for each category from the array
      const hrLeader = [...battingLeaders].sort((a, b) => (b.home_runs || 0) - (a.home_runs || 0))[0];
      const avgLeader = [...battingLeaders].sort((a, b) => (b.avg || 0) - (a.avg || 0))[0];
      const rbiLeader = [...battingLeaders].sort((a, b) => (b.rbis || b.rbi || 0) - (a.rbis || a.rbi || 0))[0];
      const opsLeader = [...battingLeaders].sort((a, b) => (b.ops || 0) - (a.ops || 0))[0];
      const sbLeader = [...battingLeaders].sort((a, b) => (b.stolen_bases || b.sb || 0) - (a.stolen_bases || a.sb || 0))[0];
      const hitsLeader = [...battingLeaders].sort((a, b) => (b.hits || b.h || 0) - (a.hits || a.h || 0))[0];

      if (hrLeader) {
        categories.push({
          category: 'Home Runs',
          statLabel: 'HR',
          player: hrLeader.player_name,
          team: hrLeader.team_name || hrLeader.team,
          value: hrLeader.home_runs || 0,
        });
      }

      if (avgLeader) {
        categories.push({
          category: 'Batting Average',
          statLabel: 'AVG',
          player: avgLeader.player_name,
          team: avgLeader.team_name || avgLeader.team,
          value: formatAvg(avgLeader.avg),
        });
      }

      if (rbiLeader) {
        categories.push({
          category: 'RBI',
          statLabel: 'RBI',
          player: rbiLeader.player_name,
          team: rbiLeader.team_name || rbiLeader.team,
          value: rbiLeader.rbis || rbiLeader.rbi || 0,
        });
      }

      if (opsLeader) {
        categories.push({
          category: 'OPS',
          statLabel: 'OPS',
          player: opsLeader.player_name,
          team: opsLeader.team_name || opsLeader.team,
          value: formatOps(opsLeader.ops),
        });
      }

      if (sbLeader) {
        categories.push({
          category: 'Stolen Bases',
          statLabel: 'SB',
          player: sbLeader.player_name,
          team: sbLeader.team_name || sbLeader.team,
          value: sbLeader.stolen_bases || sbLeader.sb || 0,
        });
      }

      if (hitsLeader) {
        categories.push({
          category: 'Hits',
          statLabel: 'H',
          player: hitsLeader.player_name,
          team: hitsLeader.team_name || hitsLeader.team,
          value: hitsLeader.hits || hitsLeader.h || 0,
        });
      }

      return categories;
    }

    // If it's an object (team-specific leaders), build from object
    const categories = [];

    if (battingLeaders.home_runs) {
      categories.push({
        category: 'Home Runs',
        statLabel: 'HR',
        player: battingLeaders.home_runs.player_name,
        value: battingLeaders.home_runs.value,
      });
    }

    if (battingLeaders.avg) {
      categories.push({
        category: 'Batting Average',
        statLabel: 'AVG',
        player: battingLeaders.avg.player_name,
        value: formatAvg(battingLeaders.avg.value),
      });
    }

    if (battingLeaders.rbis) {
      categories.push({
        category: 'RBI',
        statLabel: 'RBI',
        player: battingLeaders.rbis.player_name,
        value: battingLeaders.rbis.value,
      });
    }

    if (battingLeaders.ops) {
      categories.push({
        category: 'OPS',
        statLabel: 'OPS',
        player: battingLeaders.ops.player_name,
        value: formatOps(battingLeaders.ops.value),
      });
    }

    if (battingLeaders.stolen_bases) {
      categories.push({
        category: 'Stolen Bases',
        statLabel: 'SB',
        player: battingLeaders.stolen_bases.player_name,
        value: battingLeaders.stolen_bases.value,
      });
    }

    if (battingLeaders.hits) {
      categories.push({
        category: 'Hits',
        statLabel: 'H',
        player: battingLeaders.hits.player_name,
        value: battingLeaders.hits.value,
      });
    }

    return categories;
  }, [battingLeaders, formatAvg, formatOps]);

  // Build splits display data
  const splitsDisplayData = useMemo(() => {
    if (!splitsData) return [];

    const splits = [];

    // Home/Away splits
    if (splitsData.home) {
      splits.push({
        label: 'Home',
        avg: formatAvg(splitsData.home.avg),
        ops: formatOps(splitsData.home.ops),
        hr: splitsData.home.homeruns || splitsData.home.home_runs || 0,
        rbi: splitsData.home.rbis || splitsData.home.rbi || 0,
      });
    }

    if (splitsData.away) {
      splits.push({
        label: 'Away',
        avg: formatAvg(splitsData.away.avg),
        ops: formatOps(splitsData.away.ops),
        hr: splitsData.away.homeruns || splitsData.away.home_runs || 0,
        rbi: splitsData.away.rbis || splitsData.away.rbi || 0,
      });
    }

    // vs LHP/RHP splits
    if (splitsData.vs_left_handed_pitching || splitsData.vs_lhp) {
      const vsLHP = splitsData.vs_left_handed_pitching || splitsData.vs_lhp;
      splits.push({
        label: 'vs LHP',
        avg: formatAvg(vsLHP.avg),
        ops: formatOps(vsLHP.ops),
        hr: vsLHP.homeruns || vsLHP.home_runs || 0,
        rbi: vsLHP.rbis || vsLHP.rbi || 0,
      });
    }

    if (splitsData.vs_right_handed_pitching || splitsData.vs_rhp) {
      const vsRHP = splitsData.vs_right_handed_pitching || splitsData.vs_rhp;
      splits.push({
        label: 'vs RHP',
        avg: formatAvg(vsRHP.avg),
        ops: formatOps(vsRHP.ops),
        hr: vsRHP.homeruns || vsRHP.home_runs || 0,
        rbi: vsRHP.rbis || vsRHP.rbi || 0,
      });
    }

    return splits;
  }, [splitsData, formatAvg, formatOps]);

  // Filter hot batters by selected metric
  const filteredHotBatters = useMemo(() => {
    if (!hotBattersData || !Array.isArray(hotBattersData)) return [];

    const metricKey = {
      'HR': 'home_runs',
      'AVG': 'avg',
      'RBI': 'rbis',
      'OPS': 'ops',
    }[hotMetric] || 'home_runs';

    return [...hotBattersData]
      .filter(Boolean)
      .sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0))
      .slice(0, 7);
  }, [hotBattersData, hotMetric]);

  // Dynamic titles
  const topListTitle = isTeamSelected ? `${season} ${teamName}` : `${season} MLB`;
  const hotBatsTitle = isTeamSelected ? `${teamName} Hot Bats` : 'MLB Hot Bats';
  const leadersTitle = isTeamSelected ? 'Team Leaders' : 'League Leaders';

  // ========== RENDER HELPERS ==========
  const renderBatterItem = useCallback((batter, idx) => {
    if (!batter) return null;

    const playerId = batter.player_id;
    const playerName = batter.player_name || 'Unknown';
    const homeRuns = batter.home_runs ?? 0;
    const avg = formatAvg(batter.avg);
    const ops = formatOps(batter.ops);
    const key = playerId ? `batter-${playerId}` : `batter-idx-${idx}`;

    return (
      <li key={key} className="batter-top-list-item">
        <div className="batter-top-rank">#{idx + 1}</div>
        <div className="batter-top-info">
          <div className="batter-top-name">{playerName}</div>
        </div>
        <div className="batter-top-stats">
          <span>HR {homeRuns}</span>
          <span>AVG {avg}</span>
          <span>OPS {ops}</span>
        </div>
      </li>
    );
  }, [formatAvg, formatOps]);

  const renderHotBatterItem = useCallback((batter, idx) => {
    if (!batter) return null;

    const playerId = batter.player_id;
    const playerName = batter.player_name || 'Unknown';
    const teamNameDisplay = batter.team_name || batter.team || '';
    const key = playerId ? `hot-batter-${playerId}` : `hot-batter-idx-${idx}`;

    const metricValue = {
      'HR': batter.home_runs ?? 0,
      'AVG': formatAvg(batter.avg),
      'RBI': batter.rbis ?? batter.rbi ?? 0,
      'OPS': formatOps(batter.ops),
    }[hotMetric];

    return (
      <div key={key} className="hot-batter-item">
        <div className="hot-batter-rank">#{idx + 1}</div>
        <div className="hot-batter-info">
          <span className="hot-batter-name">{playerName}</span>
          {!isTeamSelected && teamNameDisplay && (
            <span className="hot-batter-team">{teamNameDisplay}</span>
          )}
        </div>
        <div className="hot-batter-value">{metricValue}</div>
      </div>
    );
  }, [hotMetric, formatAvg, formatOps, isTeamSelected]);

  return (
    <section className="batter-stats-section container">
      {/* Header */}
      <div className="batter-header">
        <p className="eyebrow">{isTeamSelected ? 'Team Batting' : 'MLB Batting'}</p>
        <h2>{teamName} {isTeamSelected ? 'Batters' : 'Batting Leaders'}</h2>
      </div>

      {/* Leader Cards Grid - Shows Team Leaders OR League Leaders */}
      <div className="batter-leader-grid">
        <div className="batter-leader-grid-header">
          <h3>{leadersTitle}</h3>
          <p className="eyebrow">{season} Season</p>
        </div>
        {leadersLoading ? (
          <div className="batter-loading">
            <div className="loading-spinner"></div>
            <span>Loading {isTeamSelected ? 'team' : 'league'} leaders...</span>
          </div>
        ) : leaderCategories.length > 0 ? (
          <div className="batter-leader-cards">
            {leaderCategories.map((cat, idx) => (
              <div key={idx} className="batter-card">
                <div className="batter-card-top">
                  <span className="batter-category">{cat.category}</span>
                  <span className="batter-stat-label">{cat.statLabel}</span>
                </div>
                <div className="batter-card-body">
                  <span className="batter-player">{cat.player}</span>
                  {!isTeamSelected && cat.team && (
                    <span className="batter-team">{cat.team}</span>
                  )}
                  <span className="batter-value">{cat.value}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="batter-empty">No {isTeamSelected ? 'team' : 'league'} leader data available for {season}.</div>
        )}
      </div>

      {/* Hot Bats Card */}
      <div className="hot-bats-card">
        <div className="hot-bats-header">
          <div>
            <p className="eyebrow">Recent Performance</p>
            <h3>{hotBatsTitle}</h3>
            <p className="hot-bats-subtitle">Last 7 days performance</p>
          </div>
          <div className="hot-bats-toggle">
            {['HR', 'AVG', 'RBI', 'OPS'].map((metric) => (
              <button
                key={metric}
                type="button"
                className={`hot-toggle${hotMetric === metric ? ' active' : ''}`}
                onClick={() => setHotMetric(metric)}
              >
                {metric}
              </button>
            ))}
          </div>
        </div>
        <div className="hot-bats-content">
          {hotBattersLoading ? (
            <div className="batter-loading">
              <div className="loading-spinner"></div>
              <span>Loading hot batters...</span>
            </div>
          ) : filteredHotBatters.length > 0 ? (
            <div className="hot-batters-list">
              {filteredHotBatters.map(renderHotBatterItem)}
            </div>
          ) : (
            <div className="batter-empty">No hot bats data available.</div>
          )}
        </div>
      </div>

      {/* Splits Layout */}
      <div className="batter-splits-layout">
        {/* Performance Splits Card */}
        <div className="batter-splits-card">
          <div className="batter-splits-header">
            <div>
              <h3 className="batter-splits-title">Performance Splits</h3>
              <p className="batter-split-subtitle">
                {isTeamSelected ? `${teamName} batting splits` : 'MLB batting breakdown'}
              </p>
            </div>
          </div>
          <div className="batter-splits-main">
            {splitsLoading ? (
              <div className="batter-loading">
                <div className="loading-spinner"></div>
                <span>Loading splits...</span>
              </div>
            ) : splitsDisplayData.length > 0 ? (
              <div className="batter-splits-grid">
                <div className="splits-header-row">
                  <span className="split-col-label">Split</span>
                  <span className="split-col-stat">AVG</span>
                  <span className="split-col-stat">OPS</span>
                  <span className="split-col-stat">HR</span>
                  <span className="split-col-stat">RBI</span>
                </div>
                {splitsDisplayData.map((split, idx) => (
                  <div key={idx} className="batter-split-row">
                    <span className="split-label">{split.label}</span>
                    <span className="split-stat">{split.avg}</span>
                    <span className="split-stat">{split.ops}</span>
                    <span className="split-stat">{split.hr}</span>
                    <span className="split-stat">{split.rbi}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="batter-empty">
                No splits data available.
              </div>
            )}
          </div>
        </div>

        {/* Top Batters Card - Team or MLB based on selection */}
        <div className={`batter-top-card${showAllTopBatters ? ' expanded' : ''}`}>
          <div className="batter-top-list-header">
            <h2>{topListTitle}</h2>
            <p className="eyebrow">
              {isTeamSelected ? 'Top 10 Team Batters' : 'Top 10 MLB Batters'}
            </p>
          </div>

          {topBattersLoading && (
            <div className="batter-loading">
              <div className="loading-spinner"></div>
              <span>Loading top batters...</span>
            </div>
          )}

          {topBattersError && !topBattersLoading && (
            <div className="batter-empty">{topBattersError}</div>
          )}

          {!topBattersLoading && !topBattersError && topBattersData.length === 0 && (
            <div className="batter-empty">No batter leaderboard data.</div>
          )}

          {!topBattersLoading && !topBattersError && visibleTopBatters.length > 0 && (
            <ol className="batter-top-list-items">
              {visibleTopBatters.map(renderBatterItem)}
            </ol>
          )}

          {!topBattersLoading && !topBattersError && topBattersData.length > 7 && (
            <div className="batter-top-actions">
              <button
                type="button"
                className="batter-top-toggle"
                onClick={handleToggleShowAll}
              >
                {showAllTopBatters ? 'Show Less' : 'Show More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default BatterStats;
