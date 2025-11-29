import React, { useCallback, useEffect, useMemo, useState } from 'react';
import batterData from '../../../../data/batterData.json';
import '../../../../styles/stats-page-styling/batter-stats.css';

function BatterStats({ teamId, season, teamName }) {
  const [hotMetric, setHotMetric] = useState('HR');
  const teamAbbreviationMap = {
    'New York Yankees': 'NYY',
    'Los Angeles Dodgers': 'LAD',
    'Houston Astros': 'HOU',
    'Miami Marlins': 'MIA',
    'Boston Red Sox': 'BOS',
    'Toronto Blue Jays': 'TOR',
    'Atlanta Braves': 'ATL',
    'Baltimore Orioles': 'BAL',
    'Tampa Bay Rays': 'TBR',
    'Arizona Diamondbacks': 'ARI',
    'Chicago Cubs': 'CHC',
    'Chicago White Sox': 'CWS',
    'Cincinnati Reds': 'CIN',
    'Cleveland Guardians': 'CLE',
    'Colorado Rockies': 'COL',
    'Detroit Tigers': 'DET',
    'Kansas City Royals': 'KCR',
    'Los Angeles Angels': 'LAA',
    'Milwaukee Brewers': 'MIL',
    'Minnesota Twins': 'MIN',
    'New York Mets': 'NYM',
    'Oakland Athletics': 'OAK',
    'Philadelphia Phillies': 'PHI',
    'Pittsburgh Pirates': 'PIT',
    'San Diego Padres': 'SDP',
    'San Francisco Giants': 'SFG',
    'Seattle Mariners': 'SEA',
    'St. Louis Cardinals': 'STL',
    'Texas Rangers': 'TEX',
    'Washington Nationals': 'WSH',
  };

  const [isMobile, setIsMobile] = useState(false);
  const [isSmallMobile, setIsSmallMobile] = useState(false);
  const [isXSmallMobile, setIsXSmallMobile] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsSmallMobile(width <= 540);
      setIsXSmallMobile(width <= 390);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  const formatDateLabel = useCallback((dateStr) => {
    if (!dateStr || dateStr.startsWith('G')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (isXSmallMobile) return day;
      if (isSmallMobile) return `${month}-${day}`;
      const yearPart = isMobile ? year.slice(-2) : year;
      return `${month}-${day}-${yearPart}`;
    }
    return dateStr;
  }, [isMobile, isSmallMobile, isXSmallMobile]);

  const formatTeamShort = (team) => {
    if (!team) return '';
    if (teamAbbreviationMap[team]) return teamAbbreviationMap[team];
    const parts = team.trim().split(' ').filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : team;
  };

  const leaders = useMemo(() => {
    if (!season) return [];
    const seasonData = batterData[season] || {};
    const teamLeaders = seasonData[teamId] || seasonData.ALL || [];
    return teamLeaders;
  }, [teamId, season]);

  const hotBats = useMemo(() => {
    if (!season) return null;
    const seasonHot = (batterData.hotBats && batterData.hotBats[season]) || {};
    return seasonHot[teamId] || seasonHot.ALL || null;
  }, [teamId, season]);

  const hotBatsDates = useMemo(() => {
    if (!season) return [];
    const seasonDates = batterData.hotBatsDates && batterData.hotBatsDates[season];
    return (seasonDates && (seasonDates[teamId] || seasonDates.ALL)) || [];
  }, [season, teamId]);

  const hotBatLeader = useMemo(() => {
    if (!season) return null;
    const seasonLeaders = batterData.hotBatsLeaders && batterData.hotBatsLeaders[season];
    const teamLeaders = (seasonLeaders && (seasonLeaders[teamId] || seasonLeaders.ALL)) || null;
    if (!teamLeaders) return null;
    return teamLeaders[hotMetric] || null;
  }, [hotMetric, season, teamId]);

  const titleText = useMemo(() => {
    const yearText = season || 'Season';
    const teamText = teamName || 'MLB';
    const isAllTeams = teamId === 'ALL';
    return isAllTeams ? `${yearText} MLB Leaders` : `${yearText} ${teamText} Leaders`;
  }, [teamName, season, teamId]);

  const hotBatsValues = useMemo(
    () => (hotBats ? hotBats[hotMetric] || [] : []),
    [hotBats, hotMetric]
  );
  const hotCategories = ['HR', 'HITS', 'RBI', 'AVG', 'SB', 'BB'];

  const hotBars = useMemo(() => {
    return hotBatsValues.map((val, idx) => {
      const gameDate = hotBatsDates[idx] || `G${idx + 1}`;
      return { val, gameDate: formatDateLabel(gameDate), idx };
    }).reverse();
  }, [hotBatsDates, hotBatsValues, formatDateLabel]);

  const hotBarsMonthLabel = useMemo(() => {
    const rawDate = hotBatsDates.find((d) => d && d.includes('-'));
    if (!rawDate) return '';
    const parts = rawDate.split('-');
    if (parts.length < 3) return '';
    const monthNum = Number(parts[1]);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = isXSmallMobile ? monthNames[monthNum - 1] : monthAbbr[monthNum - 1];
    return monthLabel || '';
  }, [hotBatsDates, isXSmallMobile]);

  const performanceSplits = useMemo(() => {
    if (!season) return null;
    const seasonSplits = batterData.performanceSplits && batterData.performanceSplits[season];
    return (seasonSplits && (seasonSplits[teamId] || seasonSplits.ALL)) || null;
  }, [season, teamId]);

  const splitCategories = [
    { key: 'vsLHP', label: 'vs Left-Handed Pitching' },
    { key: 'vsRHP', label: 'vs Right-Handed Pitching' },
    { key: 'home', label: 'Home Games' },
    { key: 'away', label: 'Away Games' },
    { key: 'risp', label: 'With RISP' },
    { key: 'basesEmpty', label: 'Bases Empty' },
  ];

  const splitRows = splitCategories
    .map((cat) => {
      const data = performanceSplits ? performanceSplits[cat.key] : null;
      if (!data) return null;
      const avg = data.atBats ? data.hits / data.atBats : 0;
      const color = avg >= 0.3 ? '#4CAF50' : avg >= 0.24 ? '#FF9800' : '#F44336';
      return { ...cat, data, avg, color };
    })
    .filter(Boolean);

  const topBatters = useMemo(() => {
    if (!season) return [];
    const seasonTop = batterData.topBatters && batterData.topBatters[season];
    return (seasonTop && (seasonTop[teamId] || seasonTop.ALL)) || [];
  }, [season, teamId]);

  const [showAllTopBatters, setShowAllTopBatters] = useState(false);
  const visibleTopBatters = useMemo(
    () => (showAllTopBatters ? topBatters : topBatters.slice(0, 7)),
    [showAllTopBatters, topBatters]
  );

  const topListTitle =
    teamId === 'ALL'
      ? `${season} MLB Leaders`
      : `${season} ${teamName || 'Team'}`;
  const topCardClass = `batter-top-card${showAllTopBatters ? ' expanded' : ''}`;

  return (
    <section className="batter-stats-section container">
      <div className="batter-header">
        <p className="eyebrow">Batting Leaders</p>
        <h2>{titleText}</h2>
      </div>
      <div className="batter-leader-grid">
        {leaders.map((item, idx) => (
          <div className="batter-card" key={`${item.category}-${idx}`}>
            <div className="batter-card-top">
              <span className="batter-category">
                {item.category.replace(/^(Most|Best)\s+/i, '')}
              </span>
              <span className="batter-stat-label">{item.statLabel}</span>
            </div>
            <div className="batter-card-body">
              <div className="batter-player">{item.player}</div>
              <div className="batter-team">{item.team}</div>
            </div>
            <div className="batter-value">{item.statLabel === 'AVG' ? item.value.toFixed(3) : item.value}</div>
          </div>
        ))}
        {leaders.length === 0 && (
          <div className="batter-empty">
            No batting leaders available for this selection.
          </div>
        )}
      </div>

      <div className="hot-bats-card">
        <div className="hot-bats-header">
          <div>
            <p className="eyebrow">Hot Bats</p>
            <h3>Last 7 Games</h3>
            {hotBatLeader && (
              <p className="hot-bats-subtitle">
                {hotBatLeader.player} - {hotBatLeader.team}
              </p>
            )}
          </div>
          <div className="hot-bats-toggle">
            {hotCategories.map((cat) => (
              <button
                key={cat}
                className={`hot-toggle ${cat === 'BB' ? 'hot-toggle-bb' : ''} ${hotMetric === cat ? 'active' : ''}`}
                onClick={() => setHotMetric(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="hot-bats-chart">
          {hotBatsValues.length === 0 && (
            <div className="batter-empty">No recent game data for this selection.</div>
          )}
          {hotBars.map(({ val, gameDate, idx }) => {
            const height = Math.min(220, hotMetric === 'AVG' ? val * 450 : val * 45 + 30);
            return (
              <div className="hot-bar" key={`${hotMetric}-${idx}`}>
                <div
                  className="hot-bar-fill"
                  style={{ height: `${height}px` }}
                  aria-label={`${gameDate} ${hotMetric} ${val}`}
                />
                <span className="hot-bar-value">
                  {hotMetric === 'AVG' ? val.toFixed(3) : val}
                </span>
                <span className="hot-bar-underline" aria-hidden="true" />
                <span className="hot-bar-label">{gameDate}</span>
              </div>
            );
          })}
        </div>
        {isXSmallMobile && hotBarsMonthLabel && (
          <div className="hot-bats-month-label">
            {hotBarsMonthLabel}
          </div>
        )}
      </div>

      <div className="batter-splits-layout">
        <div className="batter-splits-card">
          <div className="batter-splits-header">
            <div className="batter-splits-col">
              <h1 className="batter-splits-title">Performance Split</h1>
              {performanceSplits && (
                <p className="batter-split-subtitle">
                  {season} {teamId === 'ALL' ? 'MLB' : teamName || 'Team'} splits
                </p>
              )}
            </div>
            <div className="batter-splits-col align-end">
              <h2 className="batter-splits-secondary">📊 Offense Production</h2>
            </div>
          </div>
          <div className="batter-splits-main">
            {(!performanceSplits || splitRows.length === 0) && (
              <div className="batter-empty">No performance split data for this selection.</div>
            )}
            {splitRows.length > 0 && (
              <div className="batter-splits-grid">
                {splitRows.map(({ key, label, data, avg, color }) => (
                  <div className="batter-split-row" key={key}>
                    <div className="batter-split-label">
                      <span>{label}</span>
                      <span className="batter-split-player">
                        {data.player} - {formatTeamShort(data.team)}
                      </span>
                    </div>
                    <div className="batter-split-stats">
                      <div className="batter-split-topline">
                        <span className="batter-split-record">
                          {data.hits} / {data.atBats} AB
                        </span>
                        <span className="batter-split-pct" style={{ color }}>
                          {avg.toFixed(3).replace(/^0/, '')} AVG
                        </span>
                      </div>
                      <div className="batter-progress-bar">
                        <div className="batter-progress-fill" style={{ width: `${Math.min(avg * 100, 100)}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={topCardClass}>
          <div className="batter-top-list-header">
            <h2>{topListTitle}</h2>
             <p className="eyebrow">Top 10 Batters</p>
          </div>
          {topBatters.length === 0 && (
            <div className="batter-empty">No batter leaderboard data.</div>
          )}
          {topBatters.length > 0 && (
            <ol className="batter-top-list-items">
              {visibleTopBatters.map((batter, idx) => (
                <li key={`${batter.player}-${idx}`} className="batter-top-list-item">
                  <div className="batter-top-rank">#{idx + 1}</div>
                    <div className="batter-top-info">
                      <div className="batter-top-name">{batter.player}</div>
                      <div className="batter-top-team">{formatTeamShort(batter.team)}</div>
                    </div>
                  <div className="batter-top-stats">
                    <span>HR {batter.hr}</span>
                    <span>AVG {batter.avg.toFixed(3).replace(/^0/, '')}</span>
                    <span>OPS {batter.ops.toFixed(3)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {topBatters.length > 7 && (
            <div className="batter-top-actions">
              <button
                className="batter-top-toggle"
                onClick={() => setShowAllTopBatters((prev) => !prev)}
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
