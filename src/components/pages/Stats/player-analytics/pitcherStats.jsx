import React, { useCallback, useEffect, useMemo, useState } from 'react';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import '../../../../styles/stats-page-styling/pitcher-stats.css';

function PitcherStats({ teamId = 'ALL', teamDbId = null, season = '2025', teamName = 'MLB' }) {
  const [hotMetric, setHotMetric] = useState('W');
  const [showAllTopPitchers, setShowAllTopPitchers] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isTeamSelected = teamId !== 'ALL';

  // ========== STATE FOR ALL DATA ==========

  // Top 10 pitchers (league-wide or team-specific)
  const [topPitchersData, setTopPitchersData] = useState([]);
  const [topPitchersLoading, setTopPitchersLoading] = useState(false);
  const [topPitchersError, setTopPitchersError] = useState(null);

  // Leaders for cards (team-specific or league-wide)
  const [pitchingLeaders, setPitchingLeaders] = useState(null);
  const [leadersLoading, setLeadersLoading] = useState(false);

  // Hot pitchers (league-wide or team-specific)
  const [hotPitchersData, setHotPitchersData] = useState([]);
  const [hotPitchersLoading, setHotPitchersLoading] = useState(false);

  // Splits data (league-wide or team-specific)
  const [splitsData, setSplitsData] = useState(null);
  const [splitsLoading, setSplitsLoading] = useState(false);

  // ========== API CALLS ==========

  // Fetch top pitchers - team-specific or league-wide
  useEffect(() => {
    const fetchTopPitchers = async () => {
      if (!season) return;

      setTopPitchersLoading(true);
      setTopPitchersError(null);

      try {
        let data;
        if (isTeamSelected && teamDbId) {
          data = await teamLeadersService.getTopTeamPitchingLeaders(teamDbId, season, 'R');
        } else {
          data = await teamLeadersService.getTopPitchingLeaders(season, 'R');
        }
        setTopPitchersData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching top pitchers:', error);
        setTopPitchersError('Failed to load top pitchers');
        setTopPitchersData([]);
      } finally {
        setTopPitchersLoading(false);
      }
    };

    fetchTopPitchers();
  }, [season, isTeamSelected, teamDbId]);

  // Fetch pitching leaders (team-specific or league-wide for leader cards)
  useEffect(() => {
    const fetchLeaders = async () => {
      if (!season) return;

      setLeadersLoading(true);

      try {
        let data;
        if (isTeamSelected && teamDbId) {
          data = await teamLeadersService.getTeamPitchingLeaders(teamDbId, season, 'R');
        } else {
          // Use top pitching leaders for league-wide leader cards
          data = await teamLeadersService.getTopPitchingLeaders(season, 'R');
        }
        setPitchingLeaders(data);
      } catch (error) {
        console.error('Error fetching pitching leaders:', error);
        setPitchingLeaders(null);
      } finally {
        setLeadersLoading(false);
      }
    };

    fetchLeaders();
  }, [season, isTeamSelected, teamDbId]);

  // Fetch hot pitchers - team-specific or league-wide
  useEffect(() => {
    const fetchHotPitchers = async () => {
      if (!season) return;

      setHotPitchersLoading(true);

      try {
        let data;
        if (isTeamSelected && teamDbId) {
          data = await teamLeadersService.getHotTeamPitchingLeaders(teamDbId, season, 'R');
        } else {
          data = await teamLeadersService.getHotPitchingLeaders(season, 'R');
        }
        setHotPitchersData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching hot pitchers:', error);
        setHotPitchersData([]);
      } finally {
        setHotPitchersLoading(false);
      }
    };

    fetchHotPitchers();
  }, [season, isTeamSelected, teamDbId]);

  // Fetch splits - team-specific or league-wide
  useEffect(() => {
    const fetchSplits = async () => {
      if (!season) return;

      setSplitsLoading(true);

      try {
        let data;
        if (isTeamSelected && teamDbId) {
          data = await teamLeadersService.getTeamSplits(teamDbId, season, 'R', 'pitcher');
        } else {
          data = await teamLeadersService.getLeagueSplits(season, 'R', 'pitcher');
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
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ========== HANDLERS ==========
  const handleToggleShowAll = useCallback(() => {
    setShowAllTopPitchers(prev => !prev);
  }, []);

  // ========== FORMAT HELPERS ==========
  const formatEra = useCallback((value) => {
    if (value === null || value === undefined) return '0.00';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  }, []);

  const formatWhip = useCallback((value) => {
    if (value === null || value === undefined) return '0.00';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  }, []);

  const formatOppAvg = useCallback((value) => {
    if (value === null || value === undefined) return '.000';
    if (typeof value === 'number') {
      return value.toFixed(3).replace(/^0/, '');
    }
    return String(value);
  }, []);

  const formatIP = useCallback((value) => {
    if (value === null || value === undefined) return '0.0';
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    return String(value);
  }, []);

  // ========== COMPUTED DATA ==========

  // Visible top pitchers
  const visibleTopPitchers = useMemo(() => {
    if (!topPitchersData || !Array.isArray(topPitchersData)) return [];
    const safeData = topPitchersData.filter(Boolean);
    return showAllTopPitchers ? safeData : safeData.slice(0, 7);
  }, [showAllTopPitchers, topPitchersData]);

  // Build leader categories from team data OR league data
  const leaderCategories = useMemo(() => {
    if (!pitchingLeaders) return [];

    // If it's an array (league-wide top leaders), build from array
    if (Array.isArray(pitchingLeaders)) {
      const categories = [];

      // Find leader for each category from the array (lower is better for ERA, WHIP, OPP AVG)
      const eraLeader = [...pitchingLeaders].sort((a, b) => (a.era || 99) - (b.era || 99))[0];
      const winsLeader = [...pitchingLeaders].sort((a, b) => (b.wins || 0) - (a.wins || 0))[0];
      const kLeader = [...pitchingLeaders].sort((a, b) => (b.strikeouts || b.so || 0) - (a.strikeouts || a.so || 0))[0];
      const whipLeader = [...pitchingLeaders].sort((a, b) => (a.whip || 99) - (b.whip || 99))[0];
      const oppAvgLeader = [...pitchingLeaders].sort((a, b) => (a.opponent_avg || a.opp_avg || 1) - (b.opponent_avg || b.opp_avg || 1))[0];
      const ipLeader = [...pitchingLeaders].sort((a, b) => (b.innings_pitched || b.ip || 0) - (a.innings_pitched || a.ip || 0))[0];

      if (eraLeader && eraLeader.era) {
        categories.push({
          category: 'ERA',
          statLabel: 'ERA',
          player: eraLeader.player_name,
          team: eraLeader.team_name || eraLeader.team,
          value: formatEra(eraLeader.era),
        });
      }

      if (winsLeader && winsLeader.wins) {
        categories.push({
          category: 'Wins',
          statLabel: 'W',
          player: winsLeader.player_name,
          team: winsLeader.team_name || winsLeader.team,
          value: winsLeader.wins,
        });
      }

      if (kLeader && (kLeader.strikeouts || kLeader.so)) {
        categories.push({
          category: 'Strikeouts',
          statLabel: 'K',
          player: kLeader.player_name,
          team: kLeader.team_name || kLeader.team,
          value: kLeader.strikeouts || kLeader.so,
        });
      }

      if (whipLeader && whipLeader.whip) {
        categories.push({
          category: 'WHIP',
          statLabel: 'WHIP',
          player: whipLeader.player_name,
          team: whipLeader.team_name || whipLeader.team,
          value: formatWhip(whipLeader.whip),
        });
      }

      if (oppAvgLeader && (oppAvgLeader.opponent_avg || oppAvgLeader.opp_avg)) {
        categories.push({
          category: 'Opponent AVG',
          statLabel: 'OPP',
          player: oppAvgLeader.player_name,
          team: oppAvgLeader.team_name || oppAvgLeader.team,
          value: formatOppAvg(oppAvgLeader.opponent_avg || oppAvgLeader.opp_avg),
        });
      }

      if (ipLeader && (ipLeader.innings_pitched || ipLeader.ip)) {
        categories.push({
          category: 'Innings Pitched',
          statLabel: 'IP',
          player: ipLeader.player_name,
          team: ipLeader.team_name || ipLeader.team,
          value: formatIP(ipLeader.innings_pitched || ipLeader.ip),
        });
      }

      return categories;
    }

    // If it's an object (team-specific leaders), build from object
    const categories = [];

    if (pitchingLeaders.era) {
      categories.push({
        category: 'ERA',
        statLabel: 'ERA',
        player: pitchingLeaders.era.player_name,
        value: formatEra(pitchingLeaders.era.value),
      });
    }

    if (pitchingLeaders.wins) {
      categories.push({
        category: 'Wins',
        statLabel: 'W',
        player: pitchingLeaders.wins.player_name,
        value: pitchingLeaders.wins.value,
      });
    }

    if (pitchingLeaders.strikeouts) {
      categories.push({
        category: 'Strikeouts',
        statLabel: 'K',
        player: pitchingLeaders.strikeouts.player_name,
        value: pitchingLeaders.strikeouts.value,
      });
    }

    if (pitchingLeaders.whip) {
      categories.push({
        category: 'WHIP',
        statLabel: 'WHIP',
        player: pitchingLeaders.whip.player_name,
        value: formatWhip(pitchingLeaders.whip.value),
      });
    }

    if (pitchingLeaders.opponent_avg) {
      categories.push({
        category: 'Opponent AVG',
        statLabel: 'OPP',
        player: pitchingLeaders.opponent_avg.player_name,
        value: formatOppAvg(pitchingLeaders.opponent_avg.value),
      });
    }

    if (pitchingLeaders.innings_pitched) {
      categories.push({
        category: 'Innings Pitched',
        statLabel: 'IP',
        player: pitchingLeaders.innings_pitched.player_name,
        value: formatIP(pitchingLeaders.innings_pitched.value),
      });
    }

    return categories;
  }, [pitchingLeaders, formatEra, formatWhip, formatOppAvg, formatIP]);

  // Build splits display data
  const splitsDisplayData = useMemo(() => {
    if (!splitsData) return [];

    const splits = [];

    // Home/Away splits
    if (splitsData.home) {
      splits.push({
        label: 'Home',
        era: formatEra(splitsData.home.era),
        whip: formatWhip(splitsData.home.whip),
        k: splitsData.home.strikeouts || splitsData.home.so || 0,
        ip: formatIP(splitsData.home.innings_pitched || splitsData.home.ip),
      });
    }

    if (splitsData.away) {
      splits.push({
        label: 'Away',
        era: formatEra(splitsData.away.era),
        whip: formatWhip(splitsData.away.whip),
        k: splitsData.away.strikeouts || splitsData.away.so || 0,
        ip: formatIP(splitsData.away.innings_pitched || splitsData.away.ip),
      });
    }

    // vs LHB/RHB splits
    if (splitsData.vs_left_handed_batters || splitsData.vs_lhb) {
      const vsLHB = splitsData.vs_left_handed_batters || splitsData.vs_lhb;
      splits.push({
        label: 'vs LHB',
        era: formatEra(vsLHB.era),
        whip: formatWhip(vsLHB.whip),
        k: vsLHB.strikeouts || vsLHB.so || 0,
        oppAvg: formatOppAvg(vsLHB.avg || vsLHB.opponent_avg),
      });
    }

    if (splitsData.vs_right_handed_batters || splitsData.vs_rhb) {
      const vsRHB = splitsData.vs_right_handed_batters || splitsData.vs_rhb;
      splits.push({
        label: 'vs RHB',
        era: formatEra(vsRHB.era),
        whip: formatWhip(vsRHB.whip),
        k: vsRHB.strikeouts || vsRHB.so || 0,
        oppAvg: formatOppAvg(vsRHB.avg || vsRHB.opponent_avg),
      });
    }

    return splits;
  }, [splitsData, formatEra, formatWhip, formatIP, formatOppAvg]);

  // Filter hot pitchers by selected metric
  const filteredHotPitchers = useMemo(() => {
    if (!hotPitchersData || !Array.isArray(hotPitchersData)) return [];

    const metricConfig = {
      'W': { key: 'wins', sortDesc: true },
      'ERA': { key: 'era', sortDesc: false },
      'K': { key: 'strikeouts', sortDesc: true },
      'WHIP': { key: 'whip', sortDesc: false },
    }[hotMetric] || { key: 'wins', sortDesc: true };

    return [...hotPitchersData]
      .filter(Boolean)
      .sort((a, b) => {
        const aVal = a[metricConfig.key] || (metricConfig.sortDesc ? 0 : 99);
        const bVal = b[metricConfig.key] || (metricConfig.sortDesc ? 0 : 99);
        return metricConfig.sortDesc ? bVal - aVal : aVal - bVal;
      })
      .slice(0, 7);
  }, [hotPitchersData, hotMetric]);

  // Dynamic titles
  const topListTitle = isTeamSelected ? `${season} ${teamName}` : `${season} MLB`;
  const hotArmsTitle = isTeamSelected ? `${teamName} Hot Arms` : 'MLB Hot Arms';
  const leadersTitle = isTeamSelected ? 'Team Leaders' : 'League Leaders';

  // ========== RENDER HELPERS ==========
  const renderPitcherItem = useCallback((pitcher, idx) => {
    if (!pitcher) return null;

    const playerId = pitcher.player_id;
    const playerName = pitcher.player_name || 'Unknown';
    const era = formatEra(pitcher.era);
    const wins = pitcher.wins ?? 0;
    const strikeouts = pitcher.strikeouts ?? pitcher.so ?? 0;
    const key = playerId ? `pitcher-${playerId}` : `pitcher-idx-${idx}`;

    return (
      <li key={key} className="pitcher-top-list-item">
        <div className="pitcher-top-rank">#{idx + 1}</div>
        <div className="pitcher-top-info">
          <div className="pitcher-top-name">{playerName}</div>
        </div>
        <div className="pitcher-top-stats">
          <span>ERA {era}</span>
          <span>W {wins}</span>
          <span>K {strikeouts}</span>
        </div>
      </li>
    );
  }, [formatEra]);

  const renderHotPitcherItem = useCallback((pitcher, idx) => {
    if (!pitcher) return null;

    const playerId = pitcher.player_id;
    const playerName = pitcher.player_name || 'Unknown';
    const teamNameDisplay = pitcher.team_name || pitcher.team || '';
    const key = playerId ? `hot-pitcher-${playerId}` : `hot-pitcher-idx-${idx}`;

    const metricValue = {
      'W': pitcher.wins ?? 0,
      'ERA': formatEra(pitcher.era),
      'K': pitcher.strikeouts ?? pitcher.so ?? 0,
      'WHIP': formatWhip(pitcher.whip),
    }[hotMetric];

    return (
      <div key={key} className="hot-pitcher-item">
        <div className="hot-pitcher-rank">#{idx + 1}</div>
        <div className="hot-pitcher-info">
          <span className="hot-pitcher-name">{playerName}</span>
          {!isTeamSelected && teamNameDisplay && (
            <span className="hot-pitcher-team">{teamNameDisplay}</span>
          )}
        </div>
        <div className="hot-pitcher-value">{metricValue}</div>
      </div>
    );
  }, [hotMetric, formatEra, formatWhip, isTeamSelected]);

  return (
    <section className="pitcher-stats-section container">
      {/* Header */}
      <div className="pitcher-header">
        <p className="eyebrow">{isTeamSelected ? 'Team Pitching' : 'MLB Pitching'}</p>
        <h2>{teamName} {isTeamSelected ? 'Pitchers' : 'Pitching Leaders'}</h2>
      </div>

      {/* Leader Cards Grid - Shows Team Leaders OR League Leaders */}
      <div className="pitcher-leader-grid">
        <div className="pitcher-leader-grid-header">
          <h3>{leadersTitle}</h3>
          <p className="eyebrow">{season} Season</p>
        </div>
        {leadersLoading ? (
          <div className="pitcher-loading">
            <div className="loading-spinner"></div>
            <span>Loading {isTeamSelected ? 'team' : 'league'} leaders...</span>
          </div>
        ) : leaderCategories.length > 0 ? (
          <div className="pitcher-leader-cards">
            {leaderCategories.map((cat, idx) => (
              <div key={idx} className={`pitcher-card ${idx === 0 ? 'pitcher-card-featured' : ''}`}>
                <div className="pitcher-card-top">
                  <span className="pitcher-category">{cat.category}</span>
                  <span className="pitcher-stat-label">{cat.statLabel}</span>
                </div>
                <div className="pitcher-card-body">
                  <span className="pitcher-player">{cat.player}</span>
                  {!isTeamSelected && cat.team && (
                    <span className="pitcher-team">{cat.team}</span>
                  )}
                </div>
                <div className="pitcher-value">{cat.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pitcher-empty">No {isTeamSelected ? 'team' : 'league'} leader data available for {season}.</div>
        )}
      </div>

      {/* Hot Arms Card */}
      <div className="hot-arms-card">
        <div className="hot-arms-header">
          <div>
            <p className="eyebrow">Recent Performance</p>
            <h3>{hotArmsTitle}</h3>
            <p className="hot-arms-subtitle">Last 7 days performance</p>
          </div>
          <div className="hot-arms-toggle">
            {['W', 'ERA', 'K', 'WHIP'].map((metric) => (
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
        <div className="hot-arms-content">
          {hotPitchersLoading ? (
            <div className="pitcher-loading">
              <div className="loading-spinner"></div>
              <span>Loading hot pitchers...</span>
            </div>
          ) : filteredHotPitchers.length > 0 ? (
            <div className="hot-pitchers-list">
              {filteredHotPitchers.map(renderHotPitcherItem)}
            </div>
          ) : (
            <div className="pitcher-empty">No hot arms data available.</div>
          )}
        </div>
      </div>

      {/* Splits Layout */}
      <div className="pitcher-splits-layout">
        {/* Performance Splits Card */}
        <div className="pitcher-splits-card">
          <div className="pitcher-splits-header">
            <div>
              <h3 className="pitcher-splits-title">Performance Splits</h3>
              <p className="pitcher-split-subtitle">
                {isTeamSelected ? `${teamName} pitching splits` : 'MLB pitching breakdown'}
              </p>
            </div>
          </div>
          <div className="pitcher-splits-main">
            {splitsLoading ? (
              <div className="pitcher-loading">
                <div className="loading-spinner"></div>
                <span>Loading splits...</span>
              </div>
            ) : splitsDisplayData.length > 0 ? (
              <div className="pitcher-splits-grid">
                <div className="splits-header-row">
                  <span className="split-col-label">Split</span>
                  <span className="split-col-stat">ERA</span>
                  <span className="split-col-stat">WHIP</span>
                  <span className="split-col-stat">K</span>
                  <span className="split-col-stat">{splitsDisplayData[0]?.ip !== undefined ? 'IP' : 'OPP'}</span>
                </div>
                {splitsDisplayData.map((split, idx) => (
                  <div key={idx} className="pitcher-split-row">
                    <span className="split-label">{split.label}</span>
                    <span className="split-stat">{split.era}</span>
                    <span className="split-stat">{split.whip}</span>
                    <span className="split-stat">{split.k}</span>
                    <span className="split-stat">{split.ip || split.oppAvg || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pitcher-empty">
                No splits data available.
              </div>
            )}
          </div>
        </div>

        {/* Top Pitchers Card - Team or MLB based on selection */}
        <div className={`pitcher-top-card${showAllTopPitchers ? ' expanded' : ''}`}>
          <div className="pitcher-top-list-header">
            <h2>{topListTitle}</h2>
            <p className="eyebrow">
              {isTeamSelected ? 'Top 10 Team Pitchers' : 'Top 10 MLB Pitchers'}
            </p>
          </div>

          {topPitchersLoading && (
            <div className="pitcher-loading">
              <div className="loading-spinner"></div>
              <span>Loading top pitchers...</span>
            </div>
          )}

          {topPitchersError && !topPitchersLoading && (
            <div className="pitcher-empty">{topPitchersError}</div>
          )}

          {!topPitchersLoading && !topPitchersError && topPitchersData.length === 0 && (
            <div className="pitcher-empty">No pitcher leaderboard data.</div>
          )}

          {!topPitchersLoading && !topPitchersError && visibleTopPitchers.length > 0 && (
            <ol className="pitcher-top-list-items">
              {visibleTopPitchers.map(renderPitcherItem)}
            </ol>
          )}

          {!topPitchersLoading && !topPitchersError && topPitchersData.length > 7 && (
            <div className="pitcher-top-actions">
              <button
                type="button"
                className="pitcher-top-toggle"
                onClick={handleToggleShowAll}
              >
                {showAllTopPitchers ? 'Show Less' : 'Show More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default PitcherStats;