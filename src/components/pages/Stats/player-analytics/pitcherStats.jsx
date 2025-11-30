import React, { useMemo, useState } from 'react';
import '../../../../styles/stats-page-styling/pitcher-stats.css';

const mockPitcherData = {
  leaders: [
    { category: 'ERA', value: 2.21, pitcher: 'Corbin Burnes', team: 'Baltimore Orioles' },
    { category: 'WHIP', value: 0.94, pitcher: 'Zac Gallen', team: 'Arizona Diamondbacks' },
    { category: 'Wins', value: 19, pitcher: 'Gerrit Cole', team: 'New York Yankees' },
  ],
  hotArms: {
    ERA: [1.12, 2.05, 1.78, 2.21, 1.95],
    WHIP: [0.85, 0.98, 1.02, 1.05, 0.97],
    K: [11, 8, 9, 7, 10],
    QS: [1, 1, 1, 1, 1],
    ER: [1, 2, 2, 3, 2],
    BB: [1, 2, 1, 2, 1],
  },
  hotDates: ['2025-03-24', '2025-03-18', '2025-03-12', '2025-03-06', '2025-02-28'],
  hotLeaders: {
    ERA: { pitcher: 'Spencer Strider', team: 'Atlanta Braves' },
    WHIP: { pitcher: 'Logan Webb', team: 'San Francisco Giants' },
    K: { pitcher: 'Gerrit Cole', team: 'New York Yankees' },
    QS: { pitcher: 'Corbin Burnes', team: 'Baltimore Orioles' },
    ER: { pitcher: 'Zac Gallen', team: 'Arizona Diamondbacks' },
    BB: { pitcher: 'Kyle Bradish', team: 'Baltimore Orioles' },
  },
  performanceSplits: {
    vsLHB: { ip: 34.2, era: 2.31, oppAvg: 0.215, pitcher: 'Max Fried', team: 'Atlanta Braves' },
    vsRHB: { ip: 38.1, era: 2.74, oppAvg: 0.228, pitcher: 'Pablo López', team: 'Minnesota Twins' },
    home: { ip: 40.0, era: 2.10, oppAvg: 0.207, pitcher: 'Tarik Skubal', team: 'Detroit Tigers' },
    away: { ip: 33.2, era: 2.95, oppAvg: 0.236, pitcher: 'Tyler Glasnow', team: 'Los Angeles Dodgers' },
  },
  topPitchers: [
    { pitcher: 'Corbin Burnes', team: 'Baltimore Orioles', era: 2.21, whip: 0.94, wins: 19 },
    { pitcher: 'Gerrit Cole', team: 'New York Yankees', era: 2.35, whip: 0.98, wins: 18 },
    { pitcher: 'Zac Gallen', team: 'Arizona Diamondbacks', era: 2.40, whip: 0.99, wins: 17 },
    { pitcher: 'Tyler Glasnow', team: 'Los Angeles Dodgers', era: 2.58, whip: 1.02, wins: 16 },
    { pitcher: 'Logan Webb', team: 'San Francisco Giants', era: 2.62, whip: 1.05, wins: 15 },
    { pitcher: 'Spencer Strider', team: 'Atlanta Braves', era: 2.70, whip: 1.03, wins: 16 },
    { pitcher: 'Tarik Skubal', team: 'Detroit Tigers', era: 2.74, whip: 1.06, wins: 14 },
    { pitcher: 'Pablo López', team: 'Minnesota Twins', era: 2.80, whip: 1.07, wins: 14 },
    { pitcher: 'Kevin Gausman', team: 'Toronto Blue Jays', era: 2.85, whip: 1.08, wins: 13 },
    { pitcher: 'Framber Valdez', team: 'Houston Astros', era: 2.92, whip: 1.10, wins: 13 },
  ],
};

const formatDate = (dateStr) => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}-${parts[2].slice(-2)}-${parts[0]}`;
};

function PitcherStats({ teamId = 'ALL', season = '2025', teamName = 'MLB' }) {
  const [hotMetric, setHotMetric] = useState('ERA');
  const [showAllTopPitchers, setShowAllTopPitchers] = useState(false);

  const hotCategories = ['ERA', 'WHIP', 'K', 'QS', 'ER', 'BB'];

  const hotValues = useMemo(() => mockPitcherData.hotArms[hotMetric] || [], [hotMetric]);
  const hotLeader = useMemo(() => mockPitcherData.hotLeaders[hotMetric] || null, [hotMetric]);

  const hotBars = useMemo(() => {
    const combined = (mockPitcherData.hotDates || []).map((date, idx) => ({
      val: hotValues[idx],
      rawDate: date,
    }));
    return combined
      .filter((entry) => entry.val !== undefined)
      .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
      .map((entry) => ({ val: entry.val, date: formatDate(entry.rawDate) }));
  }, [hotValues]);

  const leaderCards = useMemo(
    () => mockPitcherData.leaders.map((l) => ({ ...l, key: l.category })),
    []
  );

  const splitRows = useMemo(() => {
    const splits = mockPitcherData.performanceSplits;
    const categories = [
      { key: 'vsLHB', label: 'vs Left-Handed Batters' },
      { key: 'vsRHB', label: 'vs Right-Handed Batters' },
      { key: 'home', label: 'Home Games' },
      { key: 'away', label: 'Away Games' },
    ];
    return categories
      .map((c) => {
        const data = splits[c.key];
        if (!data) return null;
        const color = data.era <= 2.5 ? '#4CAF50' : data.era <= 3.5 ? '#FF9800' : '#F44336';
        return { ...c, data, color };
      })
      .filter(Boolean);
  }, []);

  const visibleTopPitchers = useMemo(
    () => (showAllTopPitchers ? mockPitcherData.topPitchers : mockPitcherData.topPitchers.slice(0, 7)),
    [showAllTopPitchers]
  );

  return (
    <section className="pitcher-stats-section container">
      <div className="pitcher-header">
        <p className="eyebrow">Pitching Leaders</p>
        <h2>
          {season} {teamId === 'ALL' ? 'MLB' : teamName} Leaders
        </h2>
      </div>

      <div className="pitcher-leader-grid">
        {leaderCards.map((leader, idx) => (
          <div className={`pitcher-card ${idx === 0 ? 'pitcher-card-featured' : ''}`} key={leader.key}>
            <div className="pitcher-card-top">
              <span className="pitcher-category">{leader.category}</span>
              <span className="pitcher-stat-label">{leader.category}</span>
            </div>
            <div className="pitcher-card-body">
              <div className="pitcher-player">{leader.pitcher}</div>
              <div className="pitcher-team">{leader.team}</div>
            </div>
            <div className="pitcher-value">{leader.value}</div>
          </div>
        ))}
        {leaderCards.length === 0 && <div className="pitcher-empty">No pitching leaders available.</div>}
      </div>

      <div className="hot-arms-card">
        <div className="hot-arms-header">
          <div>
            <p className="eyebrow">Hot Arms</p>
            <h3>Last 5 Starts</h3>
            {hotLeader && (
              <p className="hot-arms-subtitle">
                {hotLeader.pitcher} — {hotLeader.team}
              </p>
            )}
          </div>
          <div className="hot-arms-toggle">
            {hotCategories.map((cat) => (
              <button
                key={cat}
                className={`hot-toggle ${hotMetric === cat ? 'active' : ''}`}
                onClick={() => setHotMetric(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="hot-arms-chart">
          {hotBars.length === 0 && <div className="pitcher-empty">No recent start data.</div>}
          {hotBars.map((bar, idx) => {
            const height = Math.min(220, hotMetric === 'ERA' || hotMetric === 'WHIP' ? 220 - bar.val * 40 : bar.val * 8 + 20);
            return (
              <div className="hot-bar" key={`${hotMetric}-${idx}`}>
                <div
                  className="hot-bar-fill"
                  style={{ height: `${height}px` }}
                  aria-label={`Start ${idx + 1} ${hotMetric} ${bar.val}`}
                />
                <span className="hot-bar-value">
                  {hotMetric === 'ERA' || hotMetric === 'WHIP' ? bar.val.toFixed(2) : bar.val}
                </span>
                <span className="hot-bar-label">{bar.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pitcher-splits-layout">
        <div className="pitcher-splits-card">
          <div className="pitcher-splits-header">
            <div>
              <p className="eyebrow">Performance Splits</p>
              <h3>Matchup Breakdown</h3>
            </div>
          </div>
          {splitRows.length === 0 && <div className="pitcher-empty">No split data available.</div>}
          {splitRows.length > 0 && (
            <div className="pitcher-splits-grid">
              {splitRows.map(({ key, label, data, color }) => (
                <div className="pitcher-split-row" key={key}>
                  <div className="pitcher-split-label">
                    <span>{label}</span>
                    <span className="pitcher-split-player">
                      {data.pitcher} — {data.team}
                    </span>
                  </div>
                  <div className="pitcher-split-stats">
                    <div className="pitcher-split-topline">
                      <span className="pitcher-split-record">{data.ip} IP</span>
                      <span className="pitcher-split-era" style={{ color }}>
                        {data.era.toFixed(2)} ERA
                      </span>
                    </div>
                    <div className="pitcher-split-oppavg">Opp AVG {data.oppAvg.toFixed(3).replace(/^0/, '')}</div>
                    <div className="pitcher-progress-bar">
                      <div className="pitcher-progress-fill" style={{ width: `${Math.min(data.era * 12, 100)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pitcher-top-card">
          <div className="pitcher-top-list-header">
            <p className="eyebrow">Top 10 Pitchers</p>
            <h4>{season} MLB Leaders</h4>
          </div>
          <div className="pitcher-top-list-subtitle">Top 10 pitchers</div>
          <ol className="pitcher-top-list-items">
            {visibleTopPitchers.map((p, idx) => (
              <li key={`${p.pitcher}-${idx}`} className="pitcher-top-list-item">
                <div className="pitcher-top-rank">#{idx + 1}</div>
                <div className="pitcher-top-info">
                  <div className="pitcher-top-name">{p.pitcher}</div>
                  <div className="pitcher-top-team">{p.team}</div>
                </div>
                <div className="pitcher-top-stats">
                  <span>ERA {p.era.toFixed(2)}</span>
                  <span>WHIP {p.whip.toFixed(2)}</span>
                  <span>W {p.wins}</span>
                </div>
              </li>
            ))}
          </ol>
          {mockPitcherData.topPitchers.length > 7 && (
            <div className="pitcher-top-actions">
              <button
                className="pitcher-top-toggle"
                onClick={() => setShowAllTopPitchers((prev) => !prev)}
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
