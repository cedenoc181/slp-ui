import React, { useCallback, useEffect, useMemo, useState } from 'react';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import leagueLeadersService from '../../../../data/services/leagueLeadersService';
import { TEAMS } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/pitcher-stats.css';

// Hot metric options with display labels (defined outside component to avoid recreating)
const HOT_METRIC_OPTIONS = [
  { key: 'strikeouts', label: 'K' },
  { key: 'wins', label: 'W' },
  { key: 'innings_pitched', label: 'IP' },
  { key: 'quality_starts', label: 'QS' },
  { key: 'earned_runs', label: 'ER' },
  { key: 'walks', label: 'BB' },
];

// Splits categories configuration
const SPLITS_CATEGORIES = [
  { key: 'strikeouts_at_home', label: "K's at Home", format: 'integer', inverse: false },
  { key: 'strikeouts_on_road', label: "K's on Road", format: 'integer', inverse: false },
  { key: 'wins_at_home', label: 'Wins at Home', format: 'integer', inverse: false },
  { key: 'wins_on_road', label: 'Wins on Road', format: 'integer', inverse: false },
  { key: 'so_9_at_home', label: 'K/9 at Home', format: 'decimal', inverse: false },
  { key: 'so_9_on_road', label: 'K/9 on Road', format: 'decimal', inverse: false },
];

function PitcherStats({ teamId = 'ALL', teamDbId = null, season = '2025', teamName = 'MLB' }) {
  const [hotMetric, setHotMetric] = useState('strikeouts');
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
  const [hotPitchersData, setHotPitchersData] = useState(null);
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
          data = await leagueLeadersService.getTopPitchingLeaders(season, 'R');
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
          // Use league pitching leaders endpoint - returns object with each category's leader
          data = await leagueLeadersService.getLeaguePitchingLeaders(season, 'R');
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
          // Use the new league hot pitching leaders endpoint - returns object with categories
          data = await leagueLeadersService.getHotPitchingLeaders(season, 'R');
        }
        setHotPitchersData(data);
      } catch (error) {
        console.error('Error fetching hot pitchers:', error);
        setHotPitchersData(null);
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
          data = await leagueLeadersService.getLeagueSplits(season, 'R', 'pitcher');
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
    return topPitchersData.filter(Boolean);
  }, [topPitchersData]);

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
          playerId: eraLeader.player_mlb_id || eraLeader.player_id,
          team: eraLeader.team_name || eraLeader.team,
          value: formatEra(eraLeader.era),
        });
      }

      if (winsLeader && winsLeader.wins) {
        categories.push({
          category: 'Wins',
          statLabel: 'W',
          player: winsLeader.player_name,
          playerId: winsLeader.player_mlb_id || winsLeader.player_id,
          team: winsLeader.team_name || winsLeader.team,
          value: winsLeader.wins,
        });
      }

      if (kLeader && (kLeader.strikeouts || kLeader.so)) {
        categories.push({
          category: 'Strikeouts',
          statLabel: 'K',
          player: kLeader.player_name,
          playerId: kLeader.player_mlb_id || kLeader.player_id,
          team: kLeader.team_name || kLeader.team,
          value: kLeader.strikeouts || kLeader.so,
        });
      }

      if (whipLeader && whipLeader.whip) {
        categories.push({
          category: 'WHIP',
          statLabel: 'WHIP',
          player: whipLeader.player_name,
          playerId: whipLeader.player_mlb_id || whipLeader.player_id,
          team: whipLeader.team_name || whipLeader.team,
          value: formatWhip(whipLeader.whip),
        });
      }

      if (oppAvgLeader && (oppAvgLeader.opponent_avg || oppAvgLeader.opp_avg)) {
        categories.push({
          category: 'Opponent AVG',
          statLabel: 'OPP',
          player: oppAvgLeader.player_name,
          playerId: oppAvgLeader.player_mlb_id || oppAvgLeader.player_id,
          team: oppAvgLeader.team_name || oppAvgLeader.team,
          value: formatOppAvg(oppAvgLeader.opponent_avg || oppAvgLeader.opp_avg),
        });
      }

      if (ipLeader && (ipLeader.innings_pitched || ipLeader.ip)) {
        categories.push({
          category: 'Innings Pitched',
          statLabel: 'IP',
          player: ipLeader.player_name,
          playerId: ipLeader.player_mlb_id || ipLeader.player_id,
          team: ipLeader.team_name || ipLeader.team,
          value: formatIP(ipLeader.innings_pitched || ipLeader.ip),
        });
      }

      return categories;
    }

    // If it's an object (team-specific leaders or league leaders API), build from object
    const categories = [];

    // ERA Leader - handles both team and league leader API keys
    const eraLeaderData = pitchingLeaders.lowest_era || pitchingLeaders.era;
    if (eraLeaderData) {
      categories.push({
        category: 'Earned Run Avg',
        statLabel: 'ERA',
        player: eraLeaderData.player_name,
        playerId: eraLeaderData.player_mlb_id || eraLeaderData.player_id,
        value: formatEra(eraLeaderData.era ?? eraLeaderData.value),
      });
    }

    // Wins Leader - handles both team and league leader API keys
    const winsLeaderData = pitchingLeaders.most_wins || pitchingLeaders.wins;
    if (winsLeaderData) {
      categories.push({
        category: 'Wins',
        statLabel: 'W',
        player: winsLeaderData.player_name,
        playerId: winsLeaderData.player_mlb_id || winsLeaderData.player_id,
        value: winsLeaderData.wins ?? winsLeaderData.value ?? 0,
      });
    }

    // Strikeouts Leader - handles both team and league leader API keys
    const kLeaderData = pitchingLeaders.most_strikeouts || pitchingLeaders.strikeouts;
    if (kLeaderData) {
      categories.push({
        category: 'Strikeouts',
        statLabel: 'K',
        player: kLeaderData.player_name,
        playerId: kLeaderData.player_mlb_id || kLeaderData.player_id,
        value: kLeaderData.strikeouts ?? kLeaderData.so ?? kLeaderData.value ?? 0,
      });
    }

    // WHIP Leader - handles both team and league leader API keys
    const whipLeaderData = pitchingLeaders.lowest_whip || pitchingLeaders.whip;
    if (whipLeaderData) {
      categories.push({
        category: 'Walks+Hits/IP',
        statLabel: 'WHIP',
        player: whipLeaderData.player_name,
        playerId: whipLeaderData.player_mlb_id || whipLeaderData.player_id,
        value: formatWhip(whipLeaderData.whip ?? whipLeaderData.value),
      });
    }

    // Opponent AVG Leader - handles both team and league leader API keys
    const oppAvgLeaderData = pitchingLeaders.lowest_opponent_avg || pitchingLeaders.opponent_avg || pitchingLeaders.opp_avg;
    if (oppAvgLeaderData) {
      categories.push({
        category: 'Opponent AVG',
        statLabel: 'OPP',
        player: oppAvgLeaderData.player_name,
        playerId: oppAvgLeaderData.player_mlb_id || oppAvgLeaderData.player_id,
        value: formatOppAvg(oppAvgLeaderData.opponent_avg ?? oppAvgLeaderData.opp_avg ?? oppAvgLeaderData.value),
      });
    }

    // Innings Pitched Leader - handles both team and league leader API keys
    const ipLeaderData = pitchingLeaders.most_innings_pitched || pitchingLeaders.innings_pitched || pitchingLeaders.ip;
    if (ipLeaderData) {
      categories.push({
        category: 'Innings Pitched',
        statLabel: 'IP',
        player: ipLeaderData.player_name,
        playerId: ipLeaderData.player_mlb_id || ipLeaderData.player_id,
        value: formatIP(ipLeaderData.innings_pitched ?? ipLeaderData.ip ?? ipLeaderData.value),
      });
    }

    return categories;
  }, [pitchingLeaders, formatEra, formatWhip, formatOppAvg, formatIP]);

  // Build splits display data from array-based API response
  const splitsDisplayData = useMemo(() => {
    if (!splitsData || !Array.isArray(splitsData)) return [];

    // Map API data by category for quick lookup
    const dataByCategory = {};
    splitsData.forEach(item => {
      if (item.category) {
        dataByCategory[item.category] = item;
      }
    });

    // Build display data for configured categories
    return SPLITS_CATEGORIES
      .map(cat => {
        const data = dataByCategory[cat.key];
        if (!data) return null;

        return {
          key: cat.key,
          label: cat.label,
          format: cat.format,
          inverse: cat.inverse, // true if lower is better (e.g., ERA)
          playerName: data.player_name || 'Unknown',
          teamName: data.team_name || '',
          value: data.value ?? 0,
          leagueAvg: data.league_avg ?? 0,
        };
      })
      .filter(Boolean);
  }, [splitsData]);

  // Get hot pitchers for selected metric category
  const filteredHotPitchers = useMemo(() => {
    if (!hotPitchersData || typeof hotPitchersData !== 'object') return [];

    // Get the array of players for the selected category
    const categoryData = hotPitchersData[hotMetric];
    if (!categoryData || !Array.isArray(categoryData)) return [];

    // Sort by total and return top players
    return [...categoryData]
      .filter(Boolean)
      .sort((a, b) => (b.total || 0) - (a.total || 0))
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
    const whip = formatWhip(pitcher.whip);
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
          <span>WHIP {whip}</span>
        </div>
      </li>
    );
  }, [formatEra, formatWhip]);

  const renderHotPitcherItem = useCallback((pitcher, idx) => {
    if (!pitcher) return null;

    const playerId = pitcher.player_id;
    const playerName = pitcher.player_name || 'Unknown';
    const teamNameDisplay = pitcher.team_name || pitcher.team || '';
    const key = playerId ? `hot-pitcher-${playerId}` : `hot-pitcher-idx-${idx}`;

    // Get the display label for the current metric
    const metricLabel = HOT_METRIC_OPTIONS.find(opt => opt.key === hotMetric)?.label || 'Total';

    // Get games data for bar chart (reverse to show oldest to newest left to right)
    const games = pitcher.games ? [...pitcher.games].reverse() : [];
    
    // Calculate max value for scaling bars
    const maxValue = Math.max(...games.map(g => g.value || 0), 1);

    // Format date for display (e.g., "9/27") - use UTC to avoid timezone offset issues
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
    };

    // Find team's mlbId for logo - check multiple matching strategies
    const teamNameLower = teamNameDisplay.toLowerCase();
    const team = TEAMS.find(t => {
      const nameLower = t.name.toLowerCase();
      const urlNameLower = t.urlName.toLowerCase();
      // Exact match
      if (nameLower === teamNameLower) return true;
      // URL name match (e.g., "los-angeles-angels")
      if (urlNameLower === teamNameLower.replace(/\s+/g, '-')) return true;
      // Abbreviation match (e.g., "LAA", "NYY")
      if (t.id.toLowerCase() === teamNameLower) return true;
      // Partial match - team name ends with API name (e.g., "Los Angeles Angels" ends with "Angels")
      if (nameLower.endsWith(teamNameLower)) return true;
      // Partial match - API name contains city or team name
      if (nameLower.includes(teamNameLower) || teamNameLower.includes(nameLower.split(' ').pop())) return true;
      return false;
    });
    const teamLogoUrl = team?.mlbId 
      ? `https://www.mlbstatic.com/team-logos/${team.mlbId}.svg`
      : null;

    return (
      <div key={key} className="hot-pitcher-item">
        <div className="hot-pitcher-header">
          <div className="hot-pitcher-rank">#{idx + 1}</div>
          {teamLogoUrl && (
            <div className="hot-pitcher-logo">
              <img 
                src={teamLogoUrl} 
                alt={teamNameDisplay}
                title={teamNameDisplay}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          <div className="hot-pitcher-info">
            <span className="hot-pitcher-name">{playerName}</span>
            {!isTeamSelected && teamNameDisplay && (
              <span className="hot-pitcher-team">{teamNameDisplay}</span>
            )}
          </div>
          <div className="hot-pitcher-total">
            <span className="hot-total-number">{pitcher.total ?? 0}</span>
            <span className="hot-total-label">{metricLabel}</span>
          </div>
        </div>
        {games.length > 0 && (
          <div className="hot-pitcher-chart">
            <div className="chart-bars">
              {games.map((game, gameIdx) => (
                <div key={gameIdx} className="chart-bar-container">
                  <div className="chart-bar-wrapper">
                    <span className="chart-bar-value">{game.value}</span>
                    <div 
                      className="chart-bar"
                      style={{ 
                        height: `${Math.max((game.value / maxValue) * 100, 5)}%`,
                        opacity: game.value === 0 ? 0.3 : 1
                      }}
                    />
                  </div>
                  <span className="chart-bar-date">{formatDate(game.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [hotMetric, isTeamSelected]);

  // Render split item with horizontal bar chart
  const renderSplitItem = useCallback((split) => {
    const { key, label, format, inverse, playerName, teamName, value, leagueAvg } = split;

    // Format value based on type
    const formatValue = (val, fmt) => {
      if (fmt === 'era') return val.toFixed(2);
      if (fmt === 'whip') return val.toFixed(2);
      if (fmt === 'decimal') return val.toFixed(2);
      if (fmt === 'avg') return val.toFixed(3).replace(/^0/, '');
      if (fmt === 'integer') return Math.round(val);
      return Math.round(val);
    };

    const displayValue = formatValue(value, format);
    const displayAvg = formatValue(leagueAvg, format);

    // Calculate bar widths (player value as percentage of max scale)
    const maxScale = Math.max(value, leagueAvg) * 1.2; // 20% padding
    let playerPercent = maxScale > 0 ? (value / maxScale) * 100 : 0;
    const avgPercent = maxScale > 0 ? (leagueAvg / maxScale) * 100 : 0;

    // Snap bar to threshold when values are equal or very close
    if (Math.abs(playerPercent - avgPercent) < 0.5 || value === leagueAvg) {
      playerPercent = avgPercent;
    }

    // Determine if player is above or below average
    // For inverse metrics (ERA, WHIP, HR/9), lower is better
    const isAboveAvg = inverse ? value < leagueAvg : value > leagueAvg;

    // Find team logo
    const teamNameLower = teamName.toLowerCase();
    const team = TEAMS.find(t => {
      const nameLower = t.name.toLowerCase();
      if (nameLower === teamNameLower) return true;
      if (nameLower.endsWith(teamNameLower)) return true;
      if (t.id.toLowerCase() === teamNameLower) return true;
      return false;
    });
    const teamLogoUrl = team?.mlbId
      ? `https://www.mlbstatic.com/team-logos/${team.mlbId}.svg`
      : null;

    return (
      <div key={key} className="split-bar-item">
        <div className="split-bar-header">
          <span className="split-bar-label">{label}</span>
          <div className="split-bar-player">
            {teamLogoUrl && (
              <img
                src={teamLogoUrl}
                alt={teamName}
                className="split-bar-logo"
                title={teamName}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className="split-bar-name">{playerName}</span>
          </div>
        </div>
        <div className="split-bar-chart">
          <div className="split-bar-track">
            <div
              className={`split-bar-fill${isAboveAvg ? ' above-avg' : ' below-avg'}`}
              style={{ width: `${playerPercent}%` }}
            />
            <div
              className="split-bar-avg-marker"
              style={{ left: `${avgPercent}%` }}
              title={`League Avg: ${displayAvg}`}
            />
          </div>
          <div className="split-bar-values">
            <span className={`split-bar-value${isAboveAvg ? '' : ' poor-performance'}`}>{displayValue}</span>
            <span className="split-bar-avg">Avg: {displayAvg}</span>
          </div>
        </div>
      </div>
    );
  }, []);

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
                  {cat.playerId && (
                    <div className="pitcher-card-photo">
                      <img
                        src={`https://img.mlbstatic.com/mlb-photos/image/upload/w_120,q_100/v1/people/${cat.playerId}/headshot/67/current`}
                        alt={cat.player}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
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
            <p className="hot-arms-subtitle">Last 5 games performance</p>
          </div>
          <div className="hot-arms-toggle">
            {HOT_METRIC_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`hot-toggle${hotMetric === option.key ? ' active' : ''}`}
                onClick={() => setHotMetric(option.key)}
              >
                {option.label}
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
              <h3 className="pitcher-splits-title">{isTeamSelected ? 'Team Leaders by Split' : 'League Leaders by Split'}</h3>
              <p className="pitcher-split-subtitle">
                {isTeamSelected 
                  ? `${teamName} best performers vs league average` 
                  : 'MLB best performers vs league average'}
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
              <div className="split-bars-container">
                {splitsDisplayData.map(renderSplitItem)}
              </div>
            ) : (
              <div className="pitcher-empty">
                No splits data available.
              </div>
            )}
          </div>
        </div>

        {/* Top Pitchers Card - Team or MLB based on selection */}
        <div className="pitcher-top-card">
          <div className="pitcher-top-list-header">
            <h2>{topListTitle}</h2>
            <p className="eyebrow">
              {isTeamSelected ? 'Starting Pitchers' : 'Top 10 MLB Pitchers'}
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
        </div>
      </div>
    </section>
  );
}

export default PitcherStats;