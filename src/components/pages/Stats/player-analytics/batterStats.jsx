import React, { useCallback, useEffect, useMemo, useState } from 'react';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import leagueLeadersService from '../../../../data/services/leagueLeadersService';
import rosterService from '../../../../data/services/rosterService';
import { TEAMS } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/batter-stats.css';

// Hot metric options with display labels (defined outside component to avoid recreating)
const HOT_METRIC_OPTIONS = [
  { key: 'home_runs', label: 'HR' },
  { key: 'hits', label: 'H' },
  { key: 'rbis', label: 'RBI' },
  { key: 'runs', label: 'R' },
  { key: 'stolen_bases', label: 'SB' },
  { key: 'walks', label: 'BB' },
];

// Splits categories to display (6 key metrics)
const SPLITS_CATEGORIES = [
  { key: 'ops_vs_rhp', label: 'OPS vs RHP', format: 'ops' },
  { key: 'ops_vs_lhp', label: 'OPS vs LHP', format: 'ops' },
  { key: 'hr_vs_rhp', label: 'HR vs RHP', format: 'int' },
  { key: 'hr_vs_lhp', label: 'HR vs LHP', format: 'int' },
  { key: 'avg_at_home', label: 'AVG at Home', format: 'avg' },
  { key: 'avg_on_road', label: 'AVG on Road', format: 'avg' },
];

function BatterStats({ teamId = 'ALL', teamDbId = null, season = '2025', teamName = 'MLB' }) {
  const [hotMetric, setHotMetric] = useState('home_runs');
  const [isMobile, setIsMobile] = useState(false);

  const isTeamSelected = teamId !== 'ALL';

  // ========== STATE FOR ALL DATA ==========

  // Active roster player IDs for filtering (team-specific only)
  const [activeRosterIds, setActiveRosterIds] = useState(new Set());
  const [rosterLoading, setRosterLoading] = useState(false);

  // Top 10 batters (league-wide or team-specific)
  const [topBattersData, setTopBattersData] = useState([]);
  const [topBattersLoading, setTopBattersLoading] = useState(false);
  const [topBattersError, setTopBattersError] = useState(null);

  // Leaders for cards (team-specific or league-wide)
  const [battingLeaders, setBattingLeaders] = useState(null);
  const [leadersLoading, setLeadersLoading] = useState(false);

  // Hot batters (league-wide or team-specific)
  const [hotBattersData, setHotBattersData] = useState(null);
  const [hotBattersLoading, setHotBattersLoading] = useState(false);

  // Splits data (league-wide or team-specific)
  const [splitsData, setSplitsData] = useState(null);
  const [splitsLoading, setSplitsLoading] = useState(false);

  // ========== API CALLS ==========

  // Fetch team roster to get active player IDs (for filtering out traded players)
  useEffect(() => {
    const fetchRoster = async () => {
      // Only fetch roster when a specific team is selected
      if (!isTeamSelected || !teamDbId || !season) {
        setActiveRosterIds(new Set());
        return;
      }

      setRosterLoading(true);

      try {
        const rosterData = await rosterService.getTeamRoster(teamDbId, season);
        // Get position players only (non-pitchers) with active status
        const activeIds = rosterService.getActivePlayerMlbIds(rosterData, true);
        setActiveRosterIds(activeIds);
        console.log(`📋 Loaded ${activeIds.size} active position players for roster filtering`);
      } catch (error) {
        console.error('Error fetching roster for filtering:', error);
        setActiveRosterIds(new Set());
      } finally {
        setRosterLoading(false);
      }
    };

    fetchRoster();
  }, [isTeamSelected, teamDbId, season]);

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
          data = await leagueLeadersService.getTopBattingLeaders(season, 'R');
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
          // Use league batting leaders endpoint - returns object with each category's leader
          data = await leagueLeadersService.getLeagueBattingLeaders(season, 'R');
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
          data = await leagueLeadersService.getHotBattingLeaders(season, 'R');
        }
        setHotBattersData(data);
      } catch (error) {
        console.error('Error fetching hot batters:', error);
        setHotBattersData(null);
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
          data = await leagueLeadersService.getLeagueSplits(season, 'R', 'batters');
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

  // ========== ROSTER FILTER HELPER ==========
  /**
   * Filter players to only include those on the active roster
   * For team-specific views, this excludes traded/released players
   * For league-wide views, returns all players (no filtering)
   */
  const filterByActiveRoster = useCallback((players) => {
    // No filtering for league-wide view or if roster hasn't loaded
    if (!isTeamSelected || activeRosterIds.size === 0) {
      return players;
    }
    
    if (!players || !Array.isArray(players)) return players;
    
    return players.filter(player => {
      const mlbId = player.player_mlb_id || player.player_id;
      // Keep player if they're on the active roster
      return mlbId && activeRosterIds.has(mlbId);
    });
  }, [isTeamSelected, activeRosterIds]);

  // ========== COMPUTED DATA ==========

  // Visible top batters (filtered by active roster for team views)
  const visibleTopBatters = useMemo(() => {
    if (!topBattersData || !Array.isArray(topBattersData)) return [];
    const filtered = topBattersData.filter(Boolean);
    return isTeamSelected ? filterByActiveRoster(filtered) : filtered;
  }, [topBattersData, isTeamSelected, filterByActiveRoster]);

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
          playerId: hrLeader.player_mlb_id || hrLeader.player_id,
          team: hrLeader.team_name || hrLeader.team,
          value: hrLeader.home_runs || 0,
        });
      }

      if (avgLeader) {
        categories.push({
          category: 'Batting Average',
          statLabel: 'AVG',
          player: avgLeader.player_name,
          playerId: avgLeader.player_mlb_id || avgLeader.player_id,
          team: avgLeader.team_name || avgLeader.team,
          value: formatAvg(avgLeader.avg),
        });
      }

      if (rbiLeader) {
        categories.push({
          category: 'RBI',
          statLabel: 'RBI',
          player: rbiLeader.player_name,
          playerId: rbiLeader.player_mlb_id || rbiLeader.player_id,
          team: rbiLeader.team_name || rbiLeader.team,
          value: rbiLeader.rbis || rbiLeader.rbi || 0,
        });
      }

      if (opsLeader) {
        categories.push({
          category: 'OPS',
          statLabel: 'OPS',
          player: opsLeader.player_name,
          playerId: opsLeader.player_mlb_id || opsLeader.player_id,
          team: opsLeader.team_name || opsLeader.team,
          value: formatOps(opsLeader.ops),
        });
      }

      if (sbLeader) {
        categories.push({
          category: 'Stolen Bases',
          statLabel: 'SB',
          player: sbLeader.player_name,
          playerId: sbLeader.player_mlb_id || sbLeader.player_id,
          team: sbLeader.team_name || sbLeader.team,
          value: sbLeader.stolen_bases || sbLeader.sb || 0,
        });
      }

      if (hitsLeader) {
        categories.push({
          category: 'Hits',
          statLabel: 'H',
          player: hitsLeader.player_name,
          playerId: hitsLeader.player_mlb_id || hitsLeader.player_id,
          team: hitsLeader.team_name || hitsLeader.team,
          value: hitsLeader.hits || hitsLeader.h || 0,
        });
      }

      return categories;
    }

    // If it's an object (team-specific or league-wide leaders), build from object
    const categories = [];

    if (battingLeaders.home_runs) {
      categories.push({
        category: 'Home Runs',
        statLabel: 'HR',
        player: battingLeaders.home_runs.player_name,
        playerId: battingLeaders.home_runs.player_mlb_id || battingLeaders.home_runs.player_id,
        value: battingLeaders.home_runs.home_runs ?? battingLeaders.home_runs.value ?? 0,
      });
    }

    if (battingLeaders.avg) {
      categories.push({
        category: 'Batting Average',
        statLabel: 'AVG',
        player: battingLeaders.avg.player_name,
        playerId: battingLeaders.avg.player_mlb_id || battingLeaders.avg.player_id,
        value: formatAvg(battingLeaders.avg.avg ?? battingLeaders.avg.value),
      });
    }

    if (battingLeaders.rbis) {
      categories.push({
        category: 'RBI',
        statLabel: 'RBI',
        player: battingLeaders.rbis.player_name,
        playerId: battingLeaders.rbis.player_mlb_id || battingLeaders.rbis.player_id,
        value: battingLeaders.rbis.rbis ?? battingLeaders.rbis.value ?? 0,
      });
    }

    if (battingLeaders.ops) {
      categories.push({
        category: 'OPS',
        statLabel: 'OPS',
        player: battingLeaders.ops.player_name,
        playerId: battingLeaders.ops.player_mlb_id || battingLeaders.ops.player_id,
        value: formatOps(battingLeaders.ops.ops ?? battingLeaders.ops.value),
      });
    }

    if (battingLeaders.stolen_bases) {
      categories.push({
        category: 'Stolen Bases',
        statLabel: 'SB',
        player: battingLeaders.stolen_bases.player_name,
        playerId: battingLeaders.stolen_bases.player_mlb_id || battingLeaders.stolen_bases.player_id,
        value: battingLeaders.stolen_bases.stolen_bases ?? battingLeaders.stolen_bases.value ?? 0,
      });
    }

    if (battingLeaders.hits) {
      categories.push({
        category: 'Hits',
        statLabel: 'H',
        player: battingLeaders.hits.player_name,
        playerId: battingLeaders.hits.player_mlb_id || battingLeaders.hits.player_id,
        value: battingLeaders.hits.hits ?? battingLeaders.hits.value ?? 0,
      });
    }

    return categories;
  }, [battingLeaders, formatAvg, formatOps]);

  // Build splits display data from array-based API response
  // For team views, filter to only show players on active roster
  const splitsDisplayData = useMemo(() => {
    if (!splitsData || !Array.isArray(splitsData)) return [];

    // Filter splits data by active roster if team is selected
    let filteredSplits = splitsData;
    if (isTeamSelected && activeRosterIds.size > 0) {
      filteredSplits = splitsData.filter(item => {
        const mlbId = item.player_mlb_id || item.player_id;
        return mlbId && activeRosterIds.has(mlbId);
      });
    }

    // Map API data by category for quick lookup
    const dataByCategory = {};
    filteredSplits.forEach(item => {
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
          playerName: data.player_name || 'Unknown',
          teamName: data.team_name || '',
          value: data.value ?? 0,
          leagueAvg: data.league_avg ?? 0,
        };
      })
      .filter(Boolean);
  }, [splitsData, isTeamSelected, activeRosterIds]);

  // Get hot batters for selected metric category
  // For team views, filter to only show players on active roster
  const filteredHotBatters = useMemo(() => {
    if (!hotBattersData || typeof hotBattersData !== 'object') return [];

    // Get the array of players for the selected category
    const categoryData = hotBattersData[hotMetric];
    if (!categoryData || !Array.isArray(categoryData)) return [];

    // Filter by active roster if team is selected
    let filtered = [...categoryData].filter(Boolean);
    if (isTeamSelected && activeRosterIds.size > 0) {
      filtered = filtered.filter(player => {
        const mlbId = player.player_mlb_id || player.player_id;
        return mlbId && activeRosterIds.has(mlbId);
      });
    }

    // Sort by total and return top players
    return filtered
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 7);
  }, [hotBattersData, hotMetric, isTeamSelected, activeRosterIds]);

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

    // Get the display label for the current metric
    const metricLabel = HOT_METRIC_OPTIONS.find(opt => opt.key === hotMetric)?.label || 'Total';

    // Get games data for bar chart (reverse to show oldest to newest left to right)
    const games = batter.games ? [...batter.games].reverse() : [];
    
    // Calculate max value for scaling bars
    const maxValue = Math.max(...games.map(g => g.value || 0), 1);

    // Format date for display (e.g., "9/27") - use UTC to avoid timezone offset issues
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
    };

    // Find team's mlbId for logo - check multiple matching strategies
    const teamNameLower = teamNameDisplay.toLowerCase().trim();
    const team = TEAMS.find(t => {
      const nameLower = t.name.toLowerCase();
      const urlNameLower = t.urlName.toLowerCase();
      // Exact match
      if (nameLower === teamNameLower) return true;
      // URL name match (e.g., "los-angeles-angels")
      if (urlNameLower === teamNameLower.replace(/\s+/g, '-')) return true;
      // Abbreviation match (e.g., "LAA", "NYY")
      if (t.id.toLowerCase() === teamNameLower) return true;
      // Check if API team name matches the team portion of full name (e.g., "Red Sox" matches "Boston Red Sox")
      // Split on spaces and check if the last 1-2 words match
      const apiWords = teamNameLower.split(' ');
      const fullNameWords = nameLower.split(' ');
      // Check for 2-word match first (e.g., "Red Sox", "White Sox", "Blue Jays")
      if (apiWords.length >= 2) {
        const lastTwoApi = apiWords.slice(-2).join(' ');
        const lastTwoFull = fullNameWords.slice(-2).join(' ');
        if (lastTwoApi === lastTwoFull) return true;
      }
      // Check for 1-word match (e.g., "Yankees", "Mets", "Dodgers")
      if (apiWords.length === 1) {
        const lastWordFull = fullNameWords[fullNameWords.length - 1];
        if (apiWords[0] === lastWordFull) return true;
      }
      return false;
    });
    const teamLogoUrl = team?.mlbId 
      ? `https://www.mlbstatic.com/team-logos/${team.mlbId}.svg`
      : null;

    return (
      <div key={key} className="hot-batter-item">
        <div className="hot-batter-header">
          <div className="hot-batter-rank">#{idx + 1}</div>
          {teamLogoUrl && (
            <div className="hot-batter-logo">
              <img 
                src={teamLogoUrl} 
                alt={teamNameDisplay}
                title={teamNameDisplay}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          <div className="hot-batter-info">
            <span className="hot-batter-name">{playerName}</span>
            {!isTeamSelected && teamNameDisplay && (
              <span className="hot-batter-team">{teamNameDisplay}</span>
            )}
          </div>
          <div className="hot-batter-total">
            <span className="hot-total-number">{batter.total ?? 0}</span>
            <span className="hot-total-label">{metricLabel}</span>
          </div>
        </div>
        {games.length > 0 && (
          <div className="hot-batter-chart">
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
    const { key, label, format, playerName, teamName, value, leagueAvg } = split;

    // Format value based on type
    const formatValue = (val, fmt) => {
      if (fmt === 'avg') return val.toFixed(3).replace(/^0/, '');
      if (fmt === 'ops') return val.toFixed(3);
      return Math.round(val);
    };

    const displayValue = formatValue(value, format);
    const displayAvg = formatValue(leagueAvg, format);

    // Calculate bar widths (player value as percentage of max scale)
    const maxScale = Math.max(value, leagueAvg) * 1.2; // 20% padding
    const playerPercent = maxScale > 0 ? (value / maxScale) * 100 : 0;
    const avgPercent = maxScale > 0 ? (leagueAvg / maxScale) * 100 : 0;

    // Determine if player is above or below average
    const isAboveAvg = value > leagueAvg;

    // Find team logo
    const teamNameLower = teamName.toLowerCase().trim();
    const team = TEAMS.find(t => {
      const nameLower = t.name.toLowerCase();
      // Exact match
      if (nameLower === teamNameLower) return true;
      // Abbreviation match
      if (t.id.toLowerCase() === teamNameLower) return true;
      // Check if API team name matches the team portion of full name
      const apiWords = teamNameLower.split(' ');
      const fullNameWords = nameLower.split(' ');
      // 2-word match (e.g., "Red Sox" matches "Boston Red Sox")
      if (apiWords.length >= 2) {
        const lastTwoApi = apiWords.slice(-2).join(' ');
        const lastTwoFull = fullNameWords.slice(-2).join(' ');
        if (lastTwoApi === lastTwoFull) return true;
      }
      // 1-word match (e.g., "Yankees" matches "New York Yankees")
      if (apiWords.length === 1) {
        const lastWordFull = fullNameWords[fullNameWords.length - 1];
        if (apiWords[0] === lastWordFull) return true;
      }
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
            <span className="split-bar-value">{displayValue}</span>
            <span className="split-bar-avg">Avg: {displayAvg}</span>
          </div>
        </div>
      </div>
    );
  }, []);

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
                  {cat.playerId && (
                    <div className="batter-card-photo">
                      <img
                        src={`https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_100/v1/people/${cat.playerId}/headshot/67/current`}
                        alt={cat.player}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
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
        <div className="hot-bats-content">
          {(hotBattersLoading || (isTeamSelected && rosterLoading)) ? (
            <div className="batter-loading">
              <div className="loading-spinner"></div>
              <span>{rosterLoading ? 'Loading roster...' : 'Loading hot batters...'}</span>
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
              <h3 className="batter-splits-title">{isTeamSelected ? 'Team Leaders by Split' : 'League Leaders by Split'}</h3>
              <p className="batter-split-subtitle">
                {isTeamSelected ? `${teamName} top splits vs league avarage` : 'MLB top performers vs league average'}
              </p>
            </div>
          </div>
          <div className="batter-splits-main">
            {(splitsLoading || (isTeamSelected && rosterLoading)) ? (
              <div className="batter-loading">
                <div className="loading-spinner"></div>
                <span>{rosterLoading ? 'Loading roster...' : 'Loading splits...'}</span>
              </div>
            ) : splitsDisplayData.length > 0 ? (
              <div className="split-bars-container">
                {splitsDisplayData.map(renderSplitItem)}
              </div>
            ) : (
              <div className="batter-empty">
                No splits data available.
              </div>
            )}
          </div>
        </div>

        {/* Top Batters Card - Team or MLB based on selection */}
        <div className="batter-top-card">
          <div className="batter-top-list-header">
            <h2>{topListTitle}</h2>
            <p className="eyebrow">
              {isTeamSelected ? 'Top Batters' : 'Top 10 MLB Batters'}
            </p>
          </div>

          {(topBattersLoading || (isTeamSelected && rosterLoading)) && (
            <div className="batter-loading">
              <div className="loading-spinner"></div>
              <span>{rosterLoading ? 'Loading roster...' : 'Loading top batters...'}</span>
            </div>
          )}

          {topBattersError && !topBattersLoading && (
            <div className="batter-empty">{topBattersError}</div>
          )}

          {!topBattersLoading && !topBattersError && topBattersData.length === 0 && (
            <div className="batter-empty">No batter leaderboard data.</div>
          )}

          {!topBattersLoading && !rosterLoading && !topBattersError && visibleTopBatters.length > 0 && (
            <ol className="batter-top-list-items">
              {visibleTopBatters.map(renderBatterItem)}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

export default BatterStats;
