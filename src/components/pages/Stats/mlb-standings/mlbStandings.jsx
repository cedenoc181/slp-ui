import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../../../../styles/stats-page-styling/mlb-standings.css';
import teamsService from '../../../../data/services/teamsService';
import { SEASONS, DEFAULT_SEASON, SEASON_RANGE } from '../../../../data/constants/apiConstants';
import MLBStandingsPostseason from './mlbStandingsPostseason';
import LeagueTabs from '../../../LeagueTabs';
import { WINTER_ENABLED } from '../../../../data/constants/leagues';
import { WinterStandingsView } from '../../Winter/WinterStatsViews';
import {
  DIVISION_TABS, SPRING_TABS, MlbStandingsBar, MlbDivisionTable, MlbSpringStandings,
  MlbWildCardTable, MlbLeaguePowerList, MlbPowerTable,
} from './MlbDivisionStandingsView';

// Derive the correct initial season type + league from the calendar date.
// Spring Training runs Feb 15 – Feb 28; regular season starts March onwards.
function getInitialStandingsState() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const day = now.getDate();
  if (month === 2 && day >= 15) {
    return { seasonType: 'spring', league: 'Cactus' };
  }
  return { seasonType: 'regular', league: 'AL' };
}

const initialStandingsState = getInitialStandingsState();
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

function MLBStandings() {
  // leagueId is the sport league (MLB, Serie del Caribe…); selectedLeague below
  // is AL/NL or Cactus/Grapefruit within MLB.
  const [leagueId, setLeagueId] = useState('mlb');
  const isMlb = leagueId === 'mlb';
  const [selectedLeague, setSelectedLeague] = useState(initialStandingsState.league);
  const [selectedSeason, setSelectedSeason] = useState(DEFAULT_SEASON);
  const [seasonType, setSeasonType] = useState(initialStandingsState.seasonType);
  const [standingsData, setStandingsData] = useState(null);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState(null);
  const [fallbackSeason, setFallbackSeason] = useState(null); // Set when selected season has no data
  // Regular-season division tab (AL East … NL West). selectedLeague (AL/NL)
  // follows it so the wild card and power rankings match the tab.
  const [division, setDivision] = useState('AL East');

  // Available seasons - driven by SEASON_RANGE in apiConstants
  const availableSeasons = SEASONS;

  // LocalStorage key for storing previous rankings
  const getStorageKey = (season) => `mlb-power-rankings-${season}`;

  // Load previous rankings from localStorage
  const loadPreviousRankings = useCallback((season) => {
    try {
      const stored = localStorage.getItem(getStorageKey(season));
      if (stored) {
        const data = JSON.parse(stored);
        // Check if data has the new format with timestamp
        if (data.timestamp && data.rankings) {
          return data;
        }
        // Legacy format - just rankings array, treat as expired
        return { rankings: data, timestamp: 0 };
      }
    } catch (error) {
      console.error('Error loading previous rankings:', error);
    }
    return null;
  }, []);

  // Save current rankings to localStorage with timestamp
  const saveCurrentRankings = useCallback((season, rankings) => {
    try {
      const data = {
        rankings: rankings,
        timestamp: Date.now(),
      };
      localStorage.setItem(getStorageKey(season), JSON.stringify(data));
    } catch (error) {
      console.error('Error saving rankings:', error);
    }
  }, []);

  // Check if stored rankings are older than a week
  const isSnapshotExpired = useCallback((timestamp) => {
    return Date.now() - timestamp > WEEK_IN_MS;
  }, []);

  // Check if API response has actual standings data
  const hasStandingsData = (data) => {
    return data && Object.keys(data).length > 0 && Object.values(data).some(div => div && div.length > 0);
  };

  // Fetch standings data when season changes
  useEffect(() => {
    const fetchStandings = async () => {
      if (seasonType !== 'regular') return; // Only fetch for regular season

      setStandingsLoading(true);
      setStandingsError(null);
      setFallbackSeason(null);

      try {
        let data = null;
        let seasonUsed = selectedSeason;

        try {
          data = await teamsService.getTeamRegularSeasonStandings(selectedSeason);
        } catch (_) {
          // Primary fetch failed; fallback will be attempted below
        }

        // If no data (or error) for selected season, fall back to the prior year.
        // Skip the fallback for the current season — it simply hasn't started yet.
        if (!hasStandingsData(data) && selectedSeason !== String(SEASON_RANGE.END)) {
          const prevYear = String(parseInt(selectedSeason) - 1);
          const fallbackData = await teamsService.getTeamRegularSeasonStandings(prevYear);
          if (hasStandingsData(fallbackData)) {
            data = fallbackData;
            seasonUsed = prevYear;
            setFallbackSeason(prevYear);
          }
        }

        // Before setting new data, check if we should update the "last week" snapshot
        const storedData = loadPreviousRankings(seasonUsed);

        if (data) {
          const newRankings = Object.values(data).flat();
          const rankingsToSave = newRankings.map(team => ({
            mlbTeamId: team.mlb_team_id,
            rank: team.mlb_rank,
            leagueRank: team.league_rank,
          }));

          if (!storedData) {
            saveCurrentRankings(seasonUsed, rankingsToSave);
          } else if (isSnapshotExpired(storedData.timestamp)) {
            saveCurrentRankings(seasonUsed, rankingsToSave);
          }
        }

        setStandingsData(data);
      } catch (error) {
        console.error('Error fetching standings:', error);
        setStandingsError('Failed to load standings data');
        setStandingsData(null);
      } finally {
        setStandingsLoading(false);
      }
    };

    fetchStandings();
  }, [selectedSeason, seasonType, loadPreviousRankings, saveCurrentRankings, isSnapshotExpired]);

  // Transform API data to display format for a league
  const currentLeagueData = useMemo(() => {
    if (!standingsData) return null;

    const leaguePrefix = selectedLeague === 'AL' ? 'AL' : 'NL';

    // Get division data
    const eastData = standingsData[`${leaguePrefix} East`] || [];
    const centralData = standingsData[`${leaguePrefix} Central`] || [];
    const westData = standingsData[`${leaguePrefix} West`] || [];

    // Transform team data to match expected format
    const transformTeam = (team) => ({
      rank: team.division_rank,
      team: team.team_name,
      teamAbbreviation: team.team_abbreviation,
      mlbTeamId: team.mlb_team_id,
      wins: team.wins,
      losses: team.losses,
      pct: team.w_l_pct,
      gb: team.games_back === null ? '-' : team.games_back.toString(),
      streak: team.streak_code,
      home: '-', // API doesn't provide home/away records
      away: '-',
      last10: `${team.last_ten_wins}-${team.last_ten_losses}`,
      clinchIndicator: team.clinch_indicator,
      wildCardRank: team.wild_card_rank,
      wcgb: team.wc_games_back,
      runDifferential: team.run_differential,
    });

    // Build wild card standings from all teams in the league
    const allLeagueTeams = [...eastData, ...centralData, ...westData]
      .map(transformTeam)
      .filter(team => team.wildCardRank !== null) // Only teams with wild card rank
      .sort((a, b) => a.wildCardRank - b.wildCardRank);

    // Format wild card GB display
    const wildCardTeams = allLeagueTeams.map((team, index) => ({
      ...team,
      rank: index + 1,
      wcgb: team.wcgb === null 
        ? (index < 3 ? '+0' : '-') 
        : (team.wcgb > 0 ? `-${team.wcgb}` : `+${Math.abs(team.wcgb)}`)
    }));

    return {
      East: eastData.map(transformTeam).sort((a, b) => a.rank - b.rank),
      Central: centralData.map(transformTeam).sort((a, b) => a.rank - b.rank),
      West: westData.map(transformTeam).sort((a, b) => a.rank - b.rank),
      wildCard: wildCardTeams.slice(0, 8), // Show top 8 wild card contenders
    };
  }, [standingsData, selectedLeague]);

  // Build power rankings from all teams sorted by MLB rank
  const powerRankings = useMemo(() => {
    if (!standingsData) return [];

    // Load previous rankings from localStorage
    const storedData = loadPreviousRankings(selectedSeason);
    const previousRankings = storedData?.rankings || null;

    const allTeams = Object.values(standingsData)
      .flat()
      .map(team => {
        const currentRank = team.mlb_rank;
        // Look up previous rank for this team
        const previousData = previousRankings?.find(
          t => t.mlbTeamId === team.mlb_team_id
        );
        const lastWeek = previousData?.rank ?? currentRank;
        
        // Determine trend: up if rank improved (lower number), down if worse
        let trend = '→';
        if (lastWeek > currentRank) trend = '↑'; // Moved up (rank decreased)
        else if (lastWeek < currentRank) trend = '↓'; // Moved down (rank increased)

        return {
          rank: currentRank,
          team: team.team_name,
          teamAbbreviation: team.team_abbreviation,
          mlbTeamId: team.mlb_team_id,
          league: team.league_name === 'American League' ? 'AL' : 'NL',
          record: `${team.wins}-${team.losses}`,
          lastWeek: lastWeek,
          trend: trend,
          runDifferential: team.run_differential,
        };
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10);

    return allTeams;
  }, [standingsData, selectedSeason, loadPreviousRankings]);

  // Filter power rankings by selected league and get top 5 with sequential 1-5 ranking
  // Uses league_rank from API which ranks teams within their respective league (AL or NL)
  const leaguePowerRankings = useMemo(() => {
    if (!standingsData) return [];

    // Load previous rankings from localStorage
    const storedData = loadPreviousRankings(selectedSeason);
    const previousRankings = storedData?.rankings || null;

    return Object.values(standingsData)
      .flat()
      .filter(team => {
        const league = team.league_name === 'American League' ? 'AL' : 'NL';
        return league === selectedLeague;
      })
      .sort((a, b) => a.league_rank - b.league_rank)
      .slice(0, 5)
      .map((team) => {
        const previousData = previousRankings?.find(
          t => t.mlbTeamId === team.mlb_team_id
        );
        const lastWeekLeagueRank = previousData?.leagueRank ?? team.league_rank;
        
        let trend = '→';
        if (lastWeekLeagueRank > team.league_rank) trend = '↑';
        else if (lastWeekLeagueRank < team.league_rank) trend = '↓';

        return {
          leagueRank: team.league_rank,
          rank: team.mlb_rank,
          team: team.team_name,
          teamAbbreviation: team.team_abbreviation,
          mlbTeamId: team.mlb_team_id,
          league: selectedLeague,
          record: `${team.wins}-${team.losses}`,
          lastWeek: lastWeekLeagueRank,
          trend: trend,
          runDifferential: team.run_differential,
        };
      });
  }, [standingsData, selectedSeason, selectedLeague, loadPreviousRankings]);

  // Handle season type change
  const handleSeasonTypeChange = (type) => {
    setSeasonType(type);

    // Reset league selection and season based on season type
    if (type === 'spring') {
      setSelectedLeague('Cactus');
      setSelectedSeason(String(SEASON_RANGE.END)); // Spring training defaults to current year
    } else if (type === 'postseason') {
      setSelectedLeague('Playoff');
      setSelectedSeason(String(SEASON_RANGE.END)); // Postseason bracket falls back to the prior year itself if needed
    } else {
      setSelectedLeague('AL');
      setDivision('AL East');
      setSelectedSeason(DEFAULT_SEASON);
    }
  };

  return (
    <div className="mlb-standings-page">
      {/* Header Section */}
      <div className="standings-header">
        <div className="container">
          <LeagueTabs value={leagueId} onChange={setLeagueId} enabled={WINTER_ENABLED} />
          <h1>Standings</h1>
          <p className="header-subtitle">
            {!isMlb ? 'Caribbean winter leagues: LIDOM, LVBP, LMP, LBPRC and the Serie del Caribe' :
             seasonType === 'regular' ? 'Regular Season Standings & Rankings' :
             seasonType === 'postseason' ? 'Postseason Standings & Rankings' :
             'Spring Training Standings & Rankings'}
          </p>

        </div>
      </div>

      {/* Main Content - Conditional Rendering Based on Season Type */}
      <div className="standings-content container">
        {/* Same layout as the winter standings: division (or spring league)
            tabs, season and season-type pickers. Playoffs keep the bracket. */}
        {isMlb && (
          <div className="wb-page wb-embed">
            <MlbStandingsBar
              seasonType={seasonType}
              onSeasonTypeChange={handleSeasonTypeChange}
              season={selectedSeason}
              onSeasonChange={setSelectedSeason}
              seasons={availableSeasons}
              tabs={seasonType === 'regular' ? DIVISION_TABS : seasonType === 'spring' ? SPRING_TABS : null}
              tab={seasonType === 'regular' ? division : selectedLeague}
              onTabChange={(key) => {
                if (seasonType === 'regular') {
                  setDivision(key);
                  setSelectedLeague(key.slice(0, 2));
                } else {
                  setSelectedLeague(key);
                }
              }}
            />
          </div>
        )}
        {!isMlb ? (
          <WinterStandingsView />
        ) : seasonType === 'postseason' ? (
          // Render Playoff Bracket
          <MLBStandingsPostseason selectedSeason={selectedSeason} />
        ) : seasonType === 'spring' ? (
          <div className="wb-page wb-embed wb-embed--flush">
            <MlbSpringStandings season={selectedSeason} league={selectedLeague} />
          </div>
        ) : (
          // Render Regular Season Standings
          <>
            {/* Fallback Notice */}
            {fallbackSeason && (
              <div className="wb-banner">
                No data available for the {selectedSeason} season yet. Showing {fallbackSeason} standings.
              </div>
            )}

            {/* Loading State */}
            {standingsLoading && (
              <div className="standings-loading">
                <div className="loading-spinner"></div>
                <span>Loading standings...</span>
              </div>
            )}

            {/* Error State */}
            {standingsError && !standingsLoading && (
              <div className="standings-error">
                <span>{standingsError}</span>
              </div>
            )}

            {/* No data for current season (season hasn't started yet) */}
            {!standingsLoading && !standingsError && !currentLeagueData && (
              <div className="standings-error">
                <span>No standings data available for the {selectedSeason} season yet.</span>
              </div>
            )}

            {/* Division table (the selected division tab) */}
            {!standingsLoading && !standingsError && currentLeagueData && (
              <div className="wb-page wb-embed wb-embed--flush">
                <MlbDivisionTable division={division} rows={standingsData?.[division]} season={fallbackSeason || selectedSeason} />
              </div>
            )}

            {/* Wild card + power rankings, styled like the division table */}
            {!standingsLoading && !standingsError && currentLeagueData && (
              <div className="wb-page wb-embed wb-embed--flush">
                <div className="wb-two-col wb-two-col--wide">
                  <MlbWildCardTable league={selectedLeague} rows={currentLeagueData.wildCard} season={fallbackSeason || selectedSeason} />
                  <MlbLeaguePowerList league={selectedLeague} rows={leaguePowerRankings} season={fallbackSeason || selectedSeason} />
                </div>
                <MlbPowerTable rows={powerRankings} season={fallbackSeason || selectedSeason} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MLBStandings;