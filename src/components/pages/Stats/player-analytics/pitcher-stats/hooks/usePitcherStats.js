// ============================================================================
// USE PITCHER STATS HOOK
// ============================================================================
// Custom hook for fetching all pitcher-related data.
// Handles top pitchers, pitching leaders, hot pitchers, and splits data.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import teamLeadersService from '../../../../../../data/services/teamLeadersService';
import leagueLeadersService from '../../../../../../data/services/leagueLeadersService';
import { formatEra, formatWhip, formatOppAvg, formatIP } from '../../shared/utils';

// ============================================================================
// Constants
// ============================================================================

// Hot metric options with display labels
export const HOT_METRIC_OPTIONS = [
  { key: 'strikeouts', label: 'K' },
  { key: 'wins', label: 'W' },
  { key: 'innings_pitched', label: 'IP' },
  { key: 'quality_starts', label: 'QS' },
  { key: 'earned_runs', label: 'ER' },
  { key: 'walks', label: 'BB' },
];

// Splits categories configuration
export const SPLITS_CATEGORIES = [
  { key: 'strikeouts_at_home', label: "K's at Home", format: 'integer', inverse: false },
  { key: 'strikeouts_on_road', label: "K's on Road", format: 'integer', inverse: false },
  { key: 'wins_at_home', label: 'Wins at Home', format: 'integer', inverse: false },
  { key: 'wins_on_road', label: 'Wins on Road', format: 'integer', inverse: false },
  { key: 'so_9_at_home', label: 'K/9 at Home', format: 'decimal', inverse: false },
  { key: 'so_9_on_road', label: 'K/9 on Road', format: 'decimal', inverse: false },
];

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePitcherStats({ teamId = 'ALL', teamDbId = null, season = '2025' }) {
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
          playerId: eraLeader.id || eraLeader.player_id,
          playerMlbId: eraLeader.player_mlb_id,
          playerSlug: eraLeader.name_slug || eraLeader.player_mlb_id,
          team: eraLeader.team_name || eraLeader.team?.team_name || '',
          value: formatEra(eraLeader.era),
        });
      }

      if (winsLeader && winsLeader.wins) {
        categories.push({
          category: 'Wins',
          statLabel: 'W',
          player: winsLeader.player_name,
          playerId: winsLeader.id || winsLeader.player_id,
          playerMlbId: winsLeader.player_mlb_id,
          playerSlug: winsLeader.name_slug || winsLeader.player_mlb_id,
          team: winsLeader.team_name || winsLeader.team?.team_name || '',
          value: winsLeader.wins,
        });
      }

      if (kLeader && (kLeader.strikeouts || kLeader.so)) {
        categories.push({
          category: 'Strikeouts',
          statLabel: 'K',
          player: kLeader.player_name,
          playerId: kLeader.id || kLeader.player_id,
          playerMlbId: kLeader.player_mlb_id,
          playerSlug: kLeader.name_slug || kLeader.player_mlb_id,
          team: kLeader.team_name || kLeader.team?.team_name || '',
          value: kLeader.strikeouts || kLeader.so,
        });
      }

      if (whipLeader && whipLeader.whip) {
        categories.push({
          category: 'WHIP',
          statLabel: 'WHIP',
          player: whipLeader.player_name,
          playerId: whipLeader.id || whipLeader.player_id,
          playerMlbId: whipLeader.player_mlb_id,
          playerSlug: whipLeader.name_slug || whipLeader.player_mlb_id,
          team: whipLeader.team_name || whipLeader.team?.team_name || '',
          value: formatWhip(whipLeader.whip),
        });
      }

      if (oppAvgLeader && (oppAvgLeader.opponent_avg || oppAvgLeader.opp_avg)) {
        categories.push({
          category: 'Opponent AVG',
          statLabel: 'OPP',
          player: oppAvgLeader.player_name,
          playerId: oppAvgLeader.id || oppAvgLeader.player_id,
          playerMlbId: oppAvgLeader.player_mlb_id,
          playerSlug: oppAvgLeader.name_slug || oppAvgLeader.player_mlb_id,
          team: oppAvgLeader.team_name || oppAvgLeader.team?.team_name || '',
          value: formatOppAvg(oppAvgLeader.opponent_avg || oppAvgLeader.opp_avg),
        });
      }

      if (ipLeader && (ipLeader.innings_pitched || ipLeader.ip)) {
        categories.push({
          category: 'Innings Pitched',
          statLabel: 'IP',
          player: ipLeader.player_name,
          playerId: ipLeader.id || ipLeader.player_id,
          playerMlbId: ipLeader.player_mlb_id,
          playerSlug: ipLeader.name_slug || ipLeader.player_mlb_id,
          team: ipLeader.team_name || ipLeader.team?.team_name || '',
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
        playerId: eraLeaderData.id || eraLeaderData.player_id,
        playerMlbId: eraLeaderData.player_mlb_id,
        playerSlug: eraLeaderData.name_slug || eraLeaderData.player_mlb_id,
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
        playerId: winsLeaderData.id || winsLeaderData.player_id,
        playerMlbId: winsLeaderData.player_mlb_id,
        playerSlug: winsLeaderData.name_slug || winsLeaderData.player_mlb_id,
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
        playerId: kLeaderData.id || kLeaderData.player_id,
        playerMlbId: kLeaderData.player_mlb_id,
        playerSlug: kLeaderData.name_slug || kLeaderData.player_mlb_id,
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
        playerId: whipLeaderData.id || whipLeaderData.player_id,
        playerMlbId: whipLeaderData.player_mlb_id,
        playerSlug: whipLeaderData.name_slug || whipLeaderData.player_mlb_id,
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
        playerId: oppAvgLeaderData.id || oppAvgLeaderData.player_id,
        playerMlbId: oppAvgLeaderData.player_mlb_id,
        playerSlug: oppAvgLeaderData.name_slug || oppAvgLeaderData.player_mlb_id,
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
        playerId: ipLeaderData.id || ipLeaderData.player_id,
        playerMlbId: ipLeaderData.player_mlb_id,
        playerSlug: ipLeaderData.name_slug || ipLeaderData.player_mlb_id,
        value: formatIP(ipLeaderData.innings_pitched ?? ipLeaderData.ip ?? ipLeaderData.value),
      });
    }

    return categories;
  }, [pitchingLeaders]);

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
  const getFilteredHotPitchers = useCallback((hotMetric) => {
    if (!hotPitchersData || typeof hotPitchersData !== 'object') return [];

    // Get the array of players for the selected category
    const categoryData = hotPitchersData[hotMetric];
    if (!categoryData || !Array.isArray(categoryData)) return [];

    // Sort by total and return top players
    return [...categoryData]
      .filter(Boolean)
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 7);
  }, [hotPitchersData]);

  return {
    // Top pitchers
    topPitchersData,
    topPitchersLoading,
    topPitchersError,
    visibleTopPitchers,

    // Leaders
    leadersLoading,
    leaderCategories,

    // Hot pitchers
    hotPitchersLoading,
    getFilteredHotPitchers,

    // Splits
    splitsLoading,
    splitsDisplayData,

    // State
    isTeamSelected,
  };
}

export default usePitcherStats;
