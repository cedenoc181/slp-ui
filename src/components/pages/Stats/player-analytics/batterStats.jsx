import React, { useCallback, useEffect, useMemo, useState } from 'react';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import batterData from '../../../../data/mockData/batterData.json';
import '../../../../styles/stats-page-styling/batter-stats.css';

function BatterStats({ teamId, season, teamName }) {
  const [hotMetric, setHotMetric] = useState('HR');
  const [topBattersData, setTopBattersData] = useState([]);
  const [topBattersLoading, setTopBattersLoading] = useState(false);
  const [topBattersError, setTopBattersError] = useState(null);
  const [showAllTopBatters, setShowAllTopBatters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Fetch top batters from API
  useEffect(() => {
    const fetchTopBatters = async () => {
      if (!season) return;
      
      setTopBattersLoading(true);
      setTopBattersError(null);
      
      try {
        const data = await teamLeadersService.getTopBattingLeaders(season, 'R', 10);
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
  }, [season]);

  // Mobile detection
  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // Safe toggle handler
  const handleToggleShowAll = useCallback(() => {
    setShowAllTopBatters(prev => !prev);
  }, []);

  // Safe format helpers
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

  // Memoized visible batters - always return safe array
  const visibleTopBatters = useMemo(() => {
    if (!topBattersData || !Array.isArray(topBattersData)) return [];
    const safeData = topBattersData.filter(Boolean); // Remove any null/undefined entries
    return showAllTopBatters ? safeData : safeData.slice(0, 7);
  }, [showAllTopBatters, topBattersData]);

  const topListTitle = `${season || '2025'} MLB`;

  // Get mock data for other sections
  const leaderCategories = batterData?.leaderCategories || [];
  const hotBatsData = batterData?.hotBats || [];
  const splitsData = batterData?.splits || [];

  // Render individual batter item - extracted for safety
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

  return (
    <section className="batter-stats-section container">
      {/* Header */}
      <div className="batter-header">
        <p className="eyebrow">Team Batting</p>
        <h2>{teamName || 'Team'} Batters</h2>
      </div>

      {/* Leader Cards Grid */}
      <div className="batter-leader-grid">
        {leaderCategories.length > 0 ? (
          leaderCategories.map((cat, idx) => (
            <div key={idx} className="batter-card">
              <div className="batter-card-top">
                <span className="batter-category">{cat.category}</span>
                <span className="batter-stat-label">{cat.statLabel}</span>
              </div>
              <div className="batter-card-body">
                <span className="batter-player">{cat.player}</span>
                <span className="batter-team">{cat.team}</span>
                <span className="batter-value">{cat.value}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="batter-empty">No leader data available.</div>
        )}
      </div>

      {/* Hot Bats Card */}
      <div className="hot-bats-card">
        <div className="hot-bats-header">
          <div>
            <p className="eyebrow">Performance</p>
            <h3>Hot Bats</h3>
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
        <div className="hot-bats-chart">
          {hotBatsData.length > 0 ? (
            hotBatsData.slice(0, 7).map((day, idx) => {
              const value = day[hotMetric.toLowerCase()] || day[hotMetric] || 0;
              const maxValue = Math.max(...hotBatsData.map(d => d[hotMetric.toLowerCase()] || d[hotMetric] || 0), 1);
              const height = Math.max((value / maxValue) * 200, 20);
              return (
                <div key={idx} className="hot-bar">
                  <div className="hot-bar-value">{value}</div>
                  <div className="hot-bar-fill" style={{ height: `${height}px` }} />
                  <div className="hot-bar-label">{day.label || `Day ${idx + 1}`}</div>
                </div>
              );
            })
          ) : (
            <div className="batter-empty">No hot bats data available.</div>
          )}
        </div>
      </div>

      {/* Splits Layout */}
      <div className="batter-splits-layout">
        {/* Splits Card */}
        <div className="batter-splits-card">
          <div className="batter-splits-header">
            <div>
              <h3 className="batter-splits-title">Performance Splits</h3>
              <p className="batter-split-subtitle">Batting performance breakdown</p>
            </div>
          </div>
          <div className="batter-splits-main">
            <div className="batter-splits-grid">
              {splitsData.length > 0 ? (
                splitsData.map((split, idx) => (
                  <div key={idx} className="batter-split-row">
                    <div className="batter-split-label">
                      <span>{split.label}</span>
                      <span className="batter-split-player">{split.topPlayer || 'N/A'}</span>
                    </div>
                    <div className="batter-split-stats">
                      <div className="batter-split-topline">
                        <span className="batter-split-record">{split.record || '0-0'}</span>
                        <span className="batter-split-pct" style={{ color: (split.pct || 0) >= 0.5 ? '#4CAF50' : '#F44336' }}>
                          {((split.pct || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="batter-progress-bar">
                        <div
                          className="batter-progress-fill"
                          style={{
                            width: `${(split.pct || 0) * 100}%`,
                            backgroundColor: (split.pct || 0) >= 0.5 ? '#4CAF50' : '#F44336'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="batter-empty">No splits data available.</div>
              )}
            </div>
          </div>
        </div>

        {/* Top Batters Card */}
        <div className={`batter-top-card${showAllTopBatters ? ' expanded' : ''}`}>
          <div className="batter-top-list-header">
            <h2>{topListTitle}</h2>
            <p className="eyebrow">Top 10 Batters</p>
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
