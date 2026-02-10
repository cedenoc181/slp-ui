// ============================================================================
// USE BATTER STATS HOOK
// ============================================================================
// Custom hook for fetching all batter-related data.
// Handles top batters, batting leaders, hot batters, and splits data.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import teamLeadersService from '../../../../../../data/services/teamLeadersService';
import leagueLeadersService from '../../../../../../data/services/leagueLeadersService';
import { formatAvg, formatOps } from '../../shared/utils';

// ============================================================================
// Constants
// ============================================================================

// Hot metric options with display labels
export const HOT_METRIC_OPTIONS = [
  { key: 'home_runs', label: 'HR' },
  { key: 'hits', label: 'H' },
  { key: 'rbis', label: 'RBI' },
  { key: 'runs', label: 'R' },
  { key: 'stolen_bases', label: 'SB' },
  { key: 'walks', label: 'BB' },
];

// Splits categories to display (6 key metrics)
export const SPLITS_CATEGORIES = [
  { key: 'ops_vs_rhp', label: 'OPS vs RHP', format: 'ops' },
  { key: 'ops_vs_lhp', label: 'OPS vs LHP', format: 'ops' },
  { key: 'hr_vs_rhp', label: 'HR vs RHP', format: 'int' },
  { key: 'hr_vs_lhp', label: 'HR vs LHP', format: 'int' },
  { key: 'avg_at_home', label: 'AVG at Home', format: 'avg' },
  { key: 'avg_on_road', label: 'AVG on Road', format: 'avg' },
];

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBatterStats({ teamId = 'ALL', teamDbId = null, season = '2025' }) {
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
  const [hotBattersData, setHotBattersData] = useState(null);
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

  // ========== COMPUTED DATA ==========

  // Visible top batters
  const visibleTopBatters = useMemo(() => {
    if (!topBattersData || !Array.isArray(topBattersData)) return [];
    return topBattersData.filter(Boolean);
  }, [topBattersData]);

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
          playerId: hrLeader.id || hrLeader.player_id,
          playerMlbId: hrLeader.player_mlb_id,
          playerSlug: hrLeader.name_slug || hrLeader.player_mlb_id,
          team: hrLeader.team_name || hrLeader.team?.team_name || '',
          value: hrLeader.home_runs || 0,
        });
      }

      if (avgLeader) {
        categories.push({
          category: 'Batting Average',
          statLabel: 'AVG',
          player: avgLeader.player_name,
          playerId: avgLeader.id || avgLeader.player_id,
          playerMlbId: avgLeader.player_mlb_id,
          playerSlug: avgLeader.name_slug || avgLeader.player_mlb_id,
          team: avgLeader.team_name || avgLeader.team?.team_name || '',
          value: formatAvg(avgLeader.avg),
        });
      }

      if (rbiLeader) {
        categories.push({
          category: 'RBI',
          statLabel: 'RBI',
          player: rbiLeader.player_name,
          playerId: rbiLeader.id || rbiLeader.player_id,
          playerMlbId: rbiLeader.player_mlb_id,
          playerSlug: rbiLeader.name_slug || rbiLeader.player_mlb_id,
          team: rbiLeader.team_name || rbiLeader.team?.team_name || '',
          value: rbiLeader.rbis || rbiLeader.rbi || 0,
        });
      }

      if (opsLeader) {
        categories.push({
          category: 'OPS',
          statLabel: 'OPS',
          player: opsLeader.player_name,
          playerId: opsLeader.id || opsLeader.player_id,
          playerMlbId: opsLeader.player_mlb_id,
          playerSlug: opsLeader.name_slug || opsLeader.player_mlb_id,
          team: opsLeader.team_name || opsLeader.team?.team_name || '',
          value: formatOps(opsLeader.ops),
        });
      }

      if (sbLeader) {
        categories.push({
          category: 'Stolen Bases',
          statLabel: 'SB',
          player: sbLeader.player_name,
          playerId: sbLeader.id || sbLeader.player_id,
          playerMlbId: sbLeader.player_mlb_id,
          playerSlug: sbLeader.name_slug || sbLeader.player_mlb_id,
          team: sbLeader.team_name || sbLeader.team?.team_name || '',
          value: sbLeader.stolen_bases || sbLeader.sb || 0,
        });
      }

      if (hitsLeader) {
        categories.push({
          category: 'Hits',
          statLabel: 'H',
          player: hitsLeader.player_name,
          playerId: hitsLeader.id || hitsLeader.player_id,
          playerMlbId: hitsLeader.player_mlb_id,
          playerSlug: hitsLeader.name_slug || hitsLeader.player_mlb_id,
          team: hitsLeader.team_name || hitsLeader.team?.team_name || '',
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
        playerId: battingLeaders.home_runs.id || battingLeaders.home_runs.player_id,
        playerMlbId: battingLeaders.home_runs.player_mlb_id,
        playerSlug: battingLeaders.home_runs.name_slug || battingLeaders.home_runs.player_mlb_id,
        value: battingLeaders.home_runs.home_runs ?? battingLeaders.home_runs.value ?? 0,
      });
    }

    if (battingLeaders.avg) {
      categories.push({
        category: 'Batting Average',
        statLabel: 'AVG',
        player: battingLeaders.avg.player_name,
        playerId: battingLeaders.avg.id || battingLeaders.avg.player_id,
        playerMlbId: battingLeaders.avg.player_mlb_id,
        playerSlug: battingLeaders.avg.name_slug || battingLeaders.avg.player_mlb_id,
        value: formatAvg(battingLeaders.avg.avg ?? battingLeaders.avg.value),
      });
    }

    if (battingLeaders.rbis) {
      categories.push({
        category: 'RBI',
        statLabel: 'RBI',
        player: battingLeaders.rbis.player_name,
        playerId: battingLeaders.rbis.id || battingLeaders.rbis.player_id,
        playerMlbId: battingLeaders.rbis.player_mlb_id,
        playerSlug: battingLeaders.rbis.name_slug || battingLeaders.rbis.player_mlb_id,
        value: battingLeaders.rbis.rbis ?? battingLeaders.rbis.value ?? 0,
      });
    }

    if (battingLeaders.ops) {
      categories.push({
        category: 'OPS',
        statLabel: 'OPS',
        player: battingLeaders.ops.player_name,
        playerId: battingLeaders.ops.id || battingLeaders.ops.player_id,
        playerMlbId: battingLeaders.ops.player_mlb_id,
        playerSlug: battingLeaders.ops.name_slug || battingLeaders.ops.player_mlb_id,
        value: formatOps(battingLeaders.ops.ops ?? battingLeaders.ops.value),
      });
    }

    if (battingLeaders.stolen_bases) {
      categories.push({
        category: 'Stolen Bases',
        statLabel: 'SB',
        player: battingLeaders.stolen_bases.player_name,
        playerId: battingLeaders.stolen_bases.id || battingLeaders.stolen_bases.player_id,
        playerMlbId: battingLeaders.stolen_bases.player_mlb_id,
        playerSlug: battingLeaders.stolen_bases.name_slug || battingLeaders.stolen_bases.player_mlb_id,
        value: battingLeaders.stolen_bases.stolen_bases ?? battingLeaders.stolen_bases.value ?? 0,
      });
    }

    if (battingLeaders.hits) {
      categories.push({
        category: 'Hits',
        statLabel: 'H',
        player: battingLeaders.hits.player_name,
        playerId: battingLeaders.hits.id || battingLeaders.hits.player_id,
        playerMlbId: battingLeaders.hits.player_mlb_id,
        playerSlug: battingLeaders.hits.name_slug || battingLeaders.hits.player_mlb_id,
        value: battingLeaders.hits.hits ?? battingLeaders.hits.value ?? 0,
      });
    }

    return categories;
  }, [battingLeaders]);

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

        // Safely extract team name - handle both string and nested object
        let extractedTeamName = '';
        if (typeof data.team_name === 'string') {
          extractedTeamName = data.team_name;
        } else if (data.team && typeof data.team === 'object' && typeof data.team.team_name === 'string') {
          extractedTeamName = data.team.team_name;
        }

        const playerMlbId = data.player_mlb_id || data.mlb_id;
        return {
          key: cat.key,
          label: cat.label,
          format: cat.format,
          playerName: data.player_name || 'Unknown',
          playerId: data.id || data.player_id || null,
          playerMlbId: playerMlbId,
          playerSlug: data.name_slug || playerMlbId,
          teamName: extractedTeamName,
          value: data.value ?? 0,
          leagueAvg: data.league_avg ?? 0,
        };
      })
      .filter(Boolean);
  }, [splitsData]);

  // Get hot batters for selected metric category
  const getFilteredHotBatters = useCallback((hotMetric) => {
    if (!hotBattersData || typeof hotBattersData !== 'object') return [];

    // Get the array of players for the selected category
    const categoryData = hotBattersData[hotMetric];
    if (!categoryData || !Array.isArray(categoryData)) return [];

    // Sort by total and return top players
    return [...categoryData]
      .filter(Boolean)
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 7);
  }, [hotBattersData]);

  return {
    // Top batters
    topBattersData,
    topBattersLoading,
    topBattersError,
    visibleTopBatters,

    // Leaders
    leadersLoading,
    leaderCategories,

    // Hot batters
    hotBattersLoading,
    getFilteredHotBatters,

    // Splits
    splitsLoading,
    splitsDisplayData,

    // State
    isTeamSelected,
  };
}

export default useBatterStats;
