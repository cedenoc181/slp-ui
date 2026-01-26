import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../../../../styles/stats-page-styling/mlb-standings-postseason.css';
import teamsService from '../../../../data/services/teamsService';
import gamesService from '../../../../data/services/gamesService';
import { SEASON_TYPES } from '../../../../data/constants/apiConstants';
import alIcon from '../../../../assets/images/AL-icon.png';
import nlIcon from '../../../../assets/images/NL-icon.png';
import wsIcon from '../../../../assets/images/world-series-logo.png';

// Map postseason_round to normalized round names
const ROUND_MAP = {
  'Wild Card': 'wildCard',
  'Division Series': 'divisionSeries',
  'League Championship Series': 'championshipSeries',
  'World Series': 'worldSeries',
};

// Round order for tracking bracket lanes
const ROUND_ORDER = ['wildCard', 'divisionSeries', 'championshipSeries', 'worldSeries'];

function MLBStandingsPostseason({ selectedSeason }) {
  const [bracketData, setBracketData] = useState(null);
  const [gamesData, setGamesData] = useState([]);
  const [teamSeasonData, setTeamSeasonData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch postseason bracket and games data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // First fetch bracket data to get list of teams
        const bracket = await teamsService.getTeamPostseasonBracket(selectedSeason);
        setBracketData(bracket);

        // Get all team IDs from bracket
        const allTeams = [
          ...(bracket['American League'] || []),
          ...(bracket['National League'] || []),
        ];

        // Fetch postseason games and team season data in parallel
        const allGames = new Map();
        const seasonDataMap = {};
        
        await Promise.all(
          allTeams.map(async (team) => {
            try {
              // Fetch postseason games
              const games = await gamesService.getTeamGames(
                team.team_id,
                selectedSeason,
                SEASON_TYPES.POSTSEASON
              );
              if (Array.isArray(games)) {
                games.forEach(game => {
                  if (!allGames.has(game.game_pk)) {
                    allGames.set(game.game_pk, game);
                  }
                });
              }

              // Fetch team season data for record/seeding
              const seasonResponse = await teamsService.getTeamSeason(team.team_id, selectedSeason);
              // Handle both array and object responses
              const rawData = Array.isArray(seasonResponse) ? seasonResponse[0] : seasonResponse;
              if (rawData) {
                // Extract nested data from API response structure
                const regularSeason = rawData.regular_season || rawData;
                seasonDataMap[team.team_id] = {
                  wins: regularSeason.record?.wins || regularSeason.wins || 0,
                  losses: regularSeason.record?.losses || regularSeason.losses || 0,
                  league_rank: regularSeason.ranks?.league_rank || regularSeason.league_rank || 99,
                  division_rank: regularSeason.ranks?.division_rank || regularSeason.division_rank || 99,
                  clinch_indicator: regularSeason.clinch?.clinch_indicator || null,
                };
              }
            } catch (err) {
              console.warn(`Failed to fetch data for team ${team.team_id}:`, err);
            }
          })
        );

        setGamesData(Array.from(allGames.values()));
        setTeamSeasonData(seasonDataMap);
      } catch (err) {
        console.error('Error fetching postseason data:', err);
        setError('Failed to load postseason data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSeason]);

  // Build matchups from games data with consistent bracket lanes
  const matchupsByRound = useMemo(() => {
    if (!gamesData.length || !bracketData) return {};

    const alTeams = bracketData['American League'] || [];
    const nlTeams = bracketData['National League'] || [];

    // Track each team's bracket lane (0 = top, 1 = bottom for 2 matchups; 0,1,2 for 3 WC matchups)
    const teamBracketLane = { AL: {}, NL: {} };

    const matchups = {
      wildCard: { AL: [], NL: [] },
      divisionSeries: { AL: [], NL: [] },
      championshipSeries: { AL: [], NL: [] },
      worldSeries: null,
    };

    // Group games by round and unique matchup (by team pair)
    const roundMatchups = {};

    gamesData.forEach(game => {
      const roundKey = ROUND_MAP[game.postseason_round];
      if (!roundKey) return;

      // Create a consistent matchup key (sorted team IDs)
      const teamIds = [game.home_team_id, game.away_team_id].sort((a, b) => a - b);
      const matchupKey = `${roundKey}-${teamIds.join('-')}`;

      if (!roundMatchups[matchupKey]) {
        roundMatchups[matchupKey] = {
          round: roundKey,
          games: [],
          homeTeamId: null,
          awayTeamId: null,
          homeTeamName: null,
          awayTeamName: null,
          homeWins: 0,
          awayWins: 0,
          seriesWinnerId: null,
        };
      }

      roundMatchups[matchupKey].games.push(game);
    });

    // Process each matchup to determine home/away from game 1
    Object.values(roundMatchups).forEach(matchup => {
      matchup.games.sort((a, b) => a.series_game_number - b.series_game_number);
      const game1 = matchup.games[0];

      matchup.homeTeamId = game1.home_team_id;
      matchup.awayTeamId = game1.away_team_id;
      matchup.homeTeamName = game1.home_team_name;
      matchup.awayTeamName = game1.away_team_name;
      matchup.seriesWinnerId = game1.series_winner_team_id;

      matchup.games.forEach(game => {
        if (game.winning_team_id === matchup.homeTeamId) {
          matchup.homeWins++;
        } else if (game.winning_team_id === matchup.awayTeamId) {
          matchup.awayWins++;
        }
      });
    });

    // Helper to determine league
    const getLeague = (teamId) => {
      if (alTeams.some(t => t.team_id === teamId)) return 'AL';
      if (nlTeams.some(t => t.team_id === teamId)) return 'NL';
      return null;
    };

    // Process rounds in order to establish and maintain bracket lanes
    ROUND_ORDER.forEach(round => {
      const roundMatchupsList = Object.values(roundMatchups).filter(m => m.round === round);

      if (round === 'worldSeries') {
        // World Series is cross-league
        const wsMatchup = roundMatchupsList[0];
        if (wsMatchup) {
          const homeLeague = getLeague(wsMatchup.homeTeamId);
          const alTeam = homeLeague === 'AL' 
            ? { id: wsMatchup.homeTeamId, name: wsMatchup.homeTeamName, wins: wsMatchup.homeWins }
            : { id: wsMatchup.awayTeamId, name: wsMatchup.awayTeamName, wins: wsMatchup.awayWins };
          const nlTeam = homeLeague === 'NL'
            ? { id: wsMatchup.homeTeamId, name: wsMatchup.homeTeamName, wins: wsMatchup.homeWins }
            : { id: wsMatchup.awayTeamId, name: wsMatchup.awayTeamName, wins: wsMatchup.awayWins };
          matchups.worldSeries = { alTeam, nlTeam, seriesWinnerId: wsMatchup.seriesWinnerId };
        }
        return;
      }

      // Group matchups by league
      const leagueMatchups = { AL: [], NL: [] };
      roundMatchupsList.forEach(matchup => {
        const league = getLeague(matchup.homeTeamId);
        if (league) leagueMatchups[league].push(matchup);
      });

      // Process each league
      ['AL', 'NL'].forEach(league => {
        const leagueRoundMatchups = leagueMatchups[league];

        if (round === 'wildCard') {
          // Wild Card: establish initial bracket lanes based on home team ID (higher seed hosts)
          // Sort by home team ID to get consistent ordering
          leagueRoundMatchups.sort((a, b) => a.homeTeamId - b.homeTeamId);

          leagueRoundMatchups.forEach((matchup, idx) => {
            // Assign bracket lane to both teams
            // Away team = top position, Home team = bottom position within each matchup
            // But the matchup itself gets a lane (0 = upper bracket, 1 = lower bracket)
            teamBracketLane[league][matchup.awayTeamId] = { lane: idx, position: 'top' };
            teamBracketLane[league][matchup.homeTeamId] = { lane: idx, position: 'bottom' };

            matchups.wildCard[league].push({
              topSeed: { id: matchup.awayTeamId, name: matchup.awayTeamName, wins: matchup.awayWins },
              bottomSeed: { id: matchup.homeTeamId, name: matchup.homeTeamName, wins: matchup.homeWins },
              seriesWinnerId: matchup.seriesWinnerId,
              bracketLane: idx,
            });
          });
        } else {
          // For later rounds, position matchups based on where winning teams came from
          const positionedMatchups = [];

          leagueRoundMatchups.forEach(matchup => {
            // Find bracket lanes for both teams
            const team1Lane = teamBracketLane[league][matchup.homeTeamId];
            const team2Lane = teamBracketLane[league][matchup.awayTeamId];

            // Determine this matchup's bracket lane based on participating teams
            // Use the minimum lane number (teams from upper bracket stay upper)
            let bracketLane;
            if (team1Lane && team2Lane) {
              bracketLane = Math.min(team1Lane.lane, team2Lane.lane);
            } else if (team1Lane) {
              bracketLane = team1Lane.lane;
            } else if (team2Lane) {
              bracketLane = team2Lane.lane;
            } else {
              // Division winners who had bye - assign based on matchup position
              bracketLane = positionedMatchups.length;
            }

            // Determine top/bottom within matchup:
            // Team that was in "top" position of previous round stays top
            // Or if it's a division winner vs WC winner, division winner (home in game 1) goes bottom
            let topTeam, bottomTeam;
            
            // Check if either team has existing lane info
            const team1WasTop = team1Lane?.position === 'top';
            const team2WasTop = team2Lane?.position === 'top';

            if (team1WasTop && !team2WasTop) {
              // Team 1 (home) was top before, keep them top
              topTeam = { id: matchup.homeTeamId, name: matchup.homeTeamName, wins: matchup.homeWins };
              bottomTeam = { id: matchup.awayTeamId, name: matchup.awayTeamName, wins: matchup.awayWins };
            } else if (team2WasTop && !team1WasTop) {
              // Team 2 (away) was top before, keep them top
              topTeam = { id: matchup.awayTeamId, name: matchup.awayTeamName, wins: matchup.awayWins };
              bottomTeam = { id: matchup.homeTeamId, name: matchup.homeTeamName, wins: matchup.homeWins };
            } else {
              // Both new or same position - away team (lower seed/WC winner) goes top, home (higher seed) goes bottom
              topTeam = { id: matchup.awayTeamId, name: matchup.awayTeamName, wins: matchup.awayWins };
              bottomTeam = { id: matchup.homeTeamId, name: matchup.homeTeamName, wins: matchup.homeWins };
            }

            // Update bracket lanes for next round
            teamBracketLane[league][topTeam.id] = { lane: bracketLane, position: 'top' };
            teamBracketLane[league][bottomTeam.id] = { lane: bracketLane, position: 'bottom' };

            positionedMatchups.push({
              topSeed: topTeam,
              bottomSeed: bottomTeam,
              seriesWinnerId: matchup.seriesWinnerId,
              bracketLane,
            });
          });

          // Sort matchups by bracket lane to maintain visual order
          positionedMatchups.sort((a, b) => a.bracketLane - b.bracketLane);
          matchups[round][league] = positionedMatchups;
        }
      });
    });

    return matchups;
  }, [gamesData, bracketData]);

  // Get team info from bracket data - can lookup by team_id or team name
  const getTeamInfo = useCallback((teamId, teamName = null) => {
    if (!bracketData) return null;
    const allTeams = [
      ...(bracketData['American League'] || []),
      ...(bracketData['National League'] || []),
    ];
    // First try by team_id
    let team = allTeams.find(t => t.team_id === teamId);
    // Fallback to team name match if provided
    if (!team && teamName) {
      team = allTeams.find(t => 
        t.team_name === teamName || 
        t.team_abbreviation === teamName ||
        t.team_name?.includes(teamName) ||
        teamName?.includes(t.team_name)
      );
    }
    return team;
  }, [bracketData]);

  // Calculate seeds based on playoff position:
  // Key rule: In Game 1 of any series, the HOME TEAM is the HIGHER SEED
  // 2020 Expanded Playoffs: All 8 teams seeded 1-8, no byes (all start in Wild Card)
  // Standard years:
  // Seeds 1-2: Teams with a bye (first game in LDS, not Wild Card) - sorted by wins
  // Seeds 3-4: Wild Card HOME teams in Game 1 (higher WC seeds host) - sorted by wins
  // Seeds 5-6: Wild Card AWAY teams in Game 1 (lower WC seeds travel) - sorted by wins
  const teamSeeds = useMemo(() => {
    if (!bracketData || !gamesData.length) return {};

    const seeds = {};
    const is2020 = selectedSeason === '2020';

    // Find Wild Card Game 1s to identify home vs away
    const wcGame1HomeTeams = new Set();
    const wcGame1AwayTeams = new Set();
    
    gamesData.forEach(game => {
      if (game.postseason_round === 'Wild Card' && game.series_game_number === 1) {
        wcGame1HomeTeams.add(game.home_team_id);
        wcGame1AwayTeams.add(game.away_team_id);
      }
    });

    // All Wild Card teams
    const wildCardTeamIds = new Set([...wcGame1HomeTeams, ...wcGame1AwayTeams]);

    ['American League', 'National League'].forEach(leagueName => {
      const leagueTeams = bracketData[leagueName] || [];

      // 2020: All 8 teams seeded 1-8 by record (no byes)
      if (is2020) {
        const allTeams = leagueTeams.map(team => {
          let seasonData = teamSeasonData[team.team_id];
          if (!seasonData && team.mlb_team_id) {
            seasonData = teamSeasonData[team.mlb_team_id];
          }
          
          return {
            ...team,
            wins: seasonData?.wins || 0,
            losses: seasonData?.losses || 0,
            leagueRank: seasonData?.league_rank || 99,
            divisionRank: seasonData?.division_rank || 99,
            clinchIndicator: seasonData?.clinch_indicator || null,
          };
        });

        // Sort by league_rank (API provides correct 1-8 ranking for 2020)
        // Fallback to wins if league_rank is not reliable
        allTeams.sort((a, b) => {
          // First priority: clinch_indicator 'z' = #1 seed
          const aIsZ = a.clinchIndicator === 'z' ? 0 : 1;
          const bIsZ = b.clinchIndicator === 'z' ? 0 : 1;
          if (aIsZ !== bIsZ) return aIsZ - bIsZ;
          // Second: league_rank
          if (a.leagueRank !== b.leagueRank) return a.leagueRank - b.leagueRank;
          // Third: wins
          if (b.wins !== a.wins) return b.wins - a.wins;
          // Fourth: fewer losses
          if (a.losses !== b.losses) return a.losses - b.losses;
          // Last: division_rank
          return a.divisionRank - b.divisionRank;
        });

        // Assign seeds 1-8
        allTeams.forEach((team, idx) => {
          seeds[team.team_id] = idx + 1;
        });

        return; // Done with this league for 2020
      }

      // Standard years: Separate into three groups based on playoff position
      const byeTeams = []; // Seeds 1-2 (didn't play Wild Card)
      const wcHomeTeams = []; // Seeds 3-4 (hosted Wild Card Game 1)
      const wcAwayTeams = []; // Seeds 5-6 (away in Wild Card Game 1)

      leagueTeams.forEach(team => {
        // Try to get season data - check both team_id and mlb_team_id
        let seasonData = teamSeasonData[team.team_id];
        if (!seasonData && team.mlb_team_id) {
          seasonData = teamSeasonData[team.mlb_team_id];
        }
        
        const wins = seasonData?.wins || 0;
        const losses = seasonData?.losses || 0;
        const leagueRank = seasonData?.league_rank || 99;
        const divisionRank = seasonData?.division_rank || 99;
        const clinchIndicator = seasonData?.clinch_indicator || null;

        const teamData = {
          ...team,
          wins,
          losses,
          leagueRank,
          divisionRank,
          clinchIndicator,
        };

        if (!wildCardTeamIds.has(team.team_id)) {
          // Bye team (didn't play Wild Card - first game is Division Series)
          byeTeams.push(teamData);
        } else if (wcGame1HomeTeams.has(team.team_id)) {
          // Wild Card home team in Game 1 = higher seed (3 or 4)
          wcHomeTeams.push(teamData);
        } else {
          // Wild Card away team in Game 1 = lower seed (5 or 6)
          wcAwayTeams.push(teamData);
        }
      });

      // Sort function: Best record (most wins) = higher seed within each group
      const sortByRecord = (a, b) => {
        // First priority: wins (higher is better = lower seed number)
        if (b.wins !== a.wins) return b.wins - a.wins;
        // Tiebreaker: fewer losses
        if (a.losses !== b.losses) return a.losses - b.losses;
        // Tiebreaker: better league_rank (lower is better)
        if (a.leagueRank !== b.leagueRank) return a.leagueRank - b.leagueRank;
        // Tiebreaker: better division_rank
        return a.divisionRank - b.divisionRank;
      };

      // Sort bye teams: clinch_indicator 'z' = #1 seed (best record in league)
      // Then by league_rank, then by wins
      byeTeams.sort((a, b) => {
        // First priority: clinch_indicator 'z' means #1 seed in the league
        const aIsZ = a.clinchIndicator === 'z' ? 0 : 1;
        const bIsZ = b.clinchIndicator === 'z' ? 0 : 1;
        if (aIsZ !== bIsZ) return aIsZ - bIsZ;
        // Second priority: league_rank (lower is better - rank 1 should be seed #1)
        if (a.leagueRank !== b.leagueRank) return a.leagueRank - b.leagueRank;
        // Backup: wins (higher is better)
        if (b.wins !== a.wins) return b.wins - a.wins;
        // Tiebreaker: fewer losses
        if (a.losses !== b.losses) return a.losses - b.losses;
        // Tiebreaker: division_rank
        return a.divisionRank - b.divisionRank;
      });

      // Sort WC home teams by record (best record = #3)
      wcHomeTeams.sort(sortByRecord);
      // Sort WC away teams by record (best record = #5)
      wcAwayTeams.sort(sortByRecord);

      // Assign seeds 1-2 to bye teams (best record = #1)
      byeTeams.forEach((team, idx) => {
        seeds[team.team_id] = idx + 1; // 1 or 2
      });

      // Assign seeds 3-4 to WC home teams (best record among them = #3)
      wcHomeTeams.forEach((team, idx) => {
        seeds[team.team_id] = 3 + idx; // 3 or 4
      });

      // Assign seeds 5-6 to WC away teams (best record among them = #5)
      wcAwayTeams.forEach((team, idx) => {
        seeds[team.team_id] = 5 + idx; // 5 or 6
      });
    });

    return seeds;
  }, [bracketData, gamesData, teamSeasonData, selectedSeason]);

  // Create team display object
  const createTeamObj = useCallback((teamId, teamName, wins, seed = 0) => {
    // Find team in bracket data (try by ID first, then by name)
    const teamInfo = getTeamInfo(teamId, teamName);
    
    // Get the correct bracket team_id for seed lookup
    const bracketTeamId = teamInfo?.team_id || teamId;
    const calculatedSeed = teamSeeds[bracketTeamId] || seed || 0;
    
    return {
      team: teamName,
      abbreviation: teamInfo?.team_abbreviation || '',
      mlbTeamId: teamInfo?.mlb_team_id || teamId,
      logo: teamInfo ? `https://www.mlbstatic.com/team-logos/${teamInfo.mlb_team_id}.svg` : '',
      seed: calculatedSeed,
      score: wins,
      teamId: bracketTeamId,
    };
  }, [teamSeeds, getTeamInfo]);

  // Transform matchups to display format
  const playoffData = useMemo(() => {
    if (!bracketData || !Object.keys(matchupsByRound).length) return null;

    // Build Wild Card arrays
    const alWildCard = (matchupsByRound.wildCard?.AL || []).flatMap(m => [
      createTeamObj(m.topSeed.id, m.topSeed.name, m.topSeed.wins),
      createTeamObj(m.bottomSeed.id, m.bottomSeed.name, m.bottomSeed.wins),
    ]);

    const nlWildCard = (matchupsByRound.wildCard?.NL || []).flatMap(m => [
      createTeamObj(m.topSeed.id, m.topSeed.name, m.topSeed.wins),
      createTeamObj(m.bottomSeed.id, m.bottomSeed.name, m.bottomSeed.wins),
    ]);

    // Build Division Series
    const alDivisionSeries = (matchupsByRound.divisionSeries?.AL || []).map(m => ({
      topSeed: createTeamObj(m.topSeed.id, m.topSeed.name, m.topSeed.wins),
      bottomSeed: createTeamObj(m.bottomSeed.id, m.bottomSeed.name, m.bottomSeed.wins),
    }));

    const nlDivisionSeries = (matchupsByRound.divisionSeries?.NL || []).map(m => ({
      topSeed: createTeamObj(m.topSeed.id, m.topSeed.name, m.topSeed.wins),
      bottomSeed: createTeamObj(m.bottomSeed.id, m.bottomSeed.name, m.bottomSeed.wins),
    }));

    // Build Championship Series
    const alLcs = matchupsByRound.championshipSeries?.AL?.[0];
    const nlLcs = matchupsByRound.championshipSeries?.NL?.[0];

    const alChampionshipSeries = alLcs ? {
      team1: createTeamObj(alLcs.topSeed.id, alLcs.topSeed.name, alLcs.topSeed.wins),
      team2: createTeamObj(alLcs.bottomSeed.id, alLcs.bottomSeed.name, alLcs.bottomSeed.wins),
    } : null;

    const nlChampionshipSeries = nlLcs ? {
      team1: createTeamObj(nlLcs.topSeed.id, nlLcs.topSeed.name, nlLcs.topSeed.wins),
      team2: createTeamObj(nlLcs.bottomSeed.id, nlLcs.bottomSeed.name, nlLcs.bottomSeed.wins),
    } : null;

    // Build World Series
    const ws = matchupsByRound.worldSeries;
    const worldSeries = ws ? {
      alChampion: createTeamObj(ws.alTeam.id, ws.alTeam.name, ws.alTeam.wins),
      nlChampion: createTeamObj(ws.nlTeam.id, ws.nlTeam.name, ws.nlTeam.wins),
    } : null;

    return {
      AL: {
        wildCard: alWildCard,
        divisionSeries: alDivisionSeries,
        championshipSeries: alChampionshipSeries,
      },
      NL: {
        wildCard: nlWildCard,
        divisionSeries: nlDivisionSeries,
        championshipSeries: nlChampionshipSeries,
      },
      worldSeries: worldSeries,
    };
  }, [bracketData, matchupsByRound, createTeamObj]);

  const alDivisionSeries = playoffData?.AL?.divisionSeries || [];
  const nlDivisionSeries = playoffData?.NL?.divisionSeries || [];

  // Detect single wild card format (2012-2021, excluding 2020)
  // In these years, there was only 1 wild card matchup per league (2 teams total)
  const isSingleWildCard = useMemo(() => {
    const season = parseInt(selectedSeason);
    // 2012-2019 and 2021 had single wild card game format
    // 2020 had expanded playoffs (8 teams per league)
    // 2022+ has current format with 3 wild card matchups
    if (season >= 2012 && season <= 2021 && season !== 2020) {
      return true;
    }
    // Also detect based on actual data - if only 2 teams in wild card
    const alWcCount = playoffData?.AL?.wildCard?.length || 0;
    const nlWcCount = playoffData?.NL?.wildCard?.length || 0;
    return alWcCount === 2 && nlWcCount === 2;
  }, [selectedSeason, playoffData]);

  // Detect 2020 expanded playoffs (4 wild card matchups per league = 8 teams)
  const is2020ExpandedPlayoffs = useMemo(() => {
    const season = parseInt(selectedSeason);
    if (season === 2020) return true;
    // Also detect based on actual data - if 8 teams (4 matchups) in wild card
    const alWcCount = playoffData?.AL?.wildCard?.length || 0;
    const nlWcCount = playoffData?.NL?.wildCard?.length || 0;
    return alWcCount === 8 && nlWcCount === 8;
  }, [selectedSeason, playoffData]);

  const renderSeriesInfo = (teamA, teamB, label) => {
    const winner = teamB ? (teamA.score >= teamB.score ? teamA : teamB) : teamA;
    return (
      <div className="series-info-pop">
        <p className="series-info-title">{label}</p>
        <div className="series-info-row">
          <span>{teamA.team}</span>
          <span className="series-info-score">{teamA.score}</span>
        </div>
        {teamB && (
          <div className="series-info-row">
            <span>{teamB.team}</span>
            <span className="series-info-score">{teamB.score}</span>
          </div>
        )}
        <p className="series-info-winner">Winner: {winner.team}</p>
      </div>
    );
  };

  const renderTeamRow = (team, isWinner, league) => {
    const isNL = league === 'nl';
    const logoElement = team.mlbTeamId ? (
      <img 
        src={`https://www.mlbstatic.com/team-logos/${team.mlbTeamId}.svg`}
        alt={team.team}
        className="team-logo-img"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    ) : (
      <span className="team-logo">{team.logo}</span>
    );

    return (
      <div className={`team-row ${isWinner ? 'winner' : ''} ${isNL ? 'nl' : ''}`}>
        {isNL ? (
          <>
            <span className="team-score">{team.score}</span>
            <span className="team-name">{team.team}</span>
            {logoElement}
            <span className={`seed-chip ${league}`}>#{team.seed}</span>
          </>
        ) : (
          <>
            <span className={`seed-chip ${league}`}>#{team.seed}</span>
            {logoElement}
            <span className="team-name">{team.team}</span>
            <span className="team-score">{team.score}</span>
          </>
        )}
      </div>
    );
  };

  const renderSeriesBlock = (matchup, league, round, connectDirection) => {
    // topSeed is AWAY (rendered first/top), bottomSeed is HOME (rendered second/bottom)
    const isTopWinner = matchup.topSeed.score > matchup.bottomSeed.score;
    const label =
      round === 'division'
        ? `${league.toUpperCase()} Division Series`
        : round === 'championship'
          ? `${league.toUpperCase()} Championship Series`
          : 'Series';
    return (
      <div className={`series-block ${round} connect-${connectDirection}`}>
        {renderSeriesInfo(matchup.topSeed, matchup.bottomSeed, label)}
        {renderTeamRow(matchup.topSeed, isTopWinner, league)}
        {renderTeamRow(matchup.bottomSeed, !isTopWinner, league)}
      </div>
    );
  };

  const renderChampionshipSeries = (series, league, connectDirection) => {
    if (!series) return null;
    // team1 is AWAY (top), team2 is HOME (bottom)
    const isFirstWinner = series.team1.score > series.team2.score;
    const label = `${league.toUpperCase()} Championship Series`;
    return (
      <div className={`series-block championship connect-${connectDirection}`}>
        {renderSeriesInfo(series.team1, series.team2, label)}
        {renderTeamRow(series.team1, isFirstWinner, league)}
        {renderTeamRow(series.team2, !isFirstWinner, league)}
      </div>
    );
  };

  const chunkIntoMatchups = (teams) => {
    const pairs = [];
    for (let i = 0; i < teams.length; i += 2) {
      pairs.push(teams.slice(i, i + 2));
    }
    return pairs;
  };

  const renderWildCardRound = (games, league, connectDirection) => {
    if (!games || games.length === 0) return null;
    const pairs = chunkIntoMatchups(games);
    return pairs.map((pair, idx) => {
      // pair[0] is AWAY (top), pair[1] is HOME (bottom)
      const [teamA, teamB] = pair;
      const teamAWins = teamB ? teamA.score > teamB.score : true;
      const items = (
        <div key={`${league}-wc-${idx}`} className={`series-block wild-card connect-${connectDirection}`}>
          {renderSeriesInfo(teamA, teamB, `${league.toUpperCase()} Wild Card`)}
          {renderTeamRow(teamA, teamAWins, league)}
          {teamB && renderTeamRow(teamB, !teamAWins, league)}
        </div>
      );

      if (pairs.length > 1 && idx === 0) {
        const iconSrc = league === 'al' ? alIcon : nlIcon;
        return [
          items,
          <div key={`${league}-wc-icon`} className={`wildcard-icon ${league}`}>
            <img src={iconSrc} alt={`${league.toUpperCase()} Wild Card`} />
          </div>,
        ];
      }

      return items;
    });
  };

  // Render 2020 expanded wild card with 2 matchups top, logo middle, 2 matchups bottom
  const renderExpandedWildCardRound = (games, league, connectDirection) => {
    if (!games || games.length === 0) return null;
    const pairs = chunkIntoMatchups(games);
    
    // Split into top 2 matchups and bottom 2 matchups
    const topPairs = pairs.slice(0, 2);
    const bottomPairs = pairs.slice(2, 4);
    const iconSrc = league === 'al' ? alIcon : nlIcon;

    const renderMatchups = (pairsList, startIdx) => 
      pairsList.map((pair, idx) => {
        const [teamA, teamB] = pair;
        const teamAWins = teamB ? teamA.score > teamB.score : true;
        return (
          <div key={`${league}-wc-${startIdx + idx}`} className={`series-block wild-card connect-${connectDirection}`}>
            {renderSeriesInfo(teamA, teamB, `${league.toUpperCase()} Wild Card`)}
            {renderTeamRow(teamA, teamAWins, league)}
            {teamB && renderTeamRow(teamB, !teamAWins, league)}
          </div>
        );
      });

    return (
      <>
        <div className="expanded-wc-group top">
          {renderMatchups(topPairs, 0)}
        </div>
        <div className={`wildcard-icon ${league} expanded`}>
          <img src={iconSrc} alt={`${league.toUpperCase()} Wild Card`} />
        </div>
        <div className="expanded-wc-group bottom">
          {renderMatchups(bottomPairs, 2)}
        </div>
      </>
    );
  };

  const renderWorldSeries = () => {
    if (!playoffData?.worldSeries) return null;
    const alWins = playoffData.worldSeries.alChampion.score > playoffData.worldSeries.nlChampion.score;
    const label = 'World Series';
    
    // Determine the World Series champion
    const champion = alWins ? playoffData.worldSeries.alChampion : playoffData.worldSeries.nlChampion;
    const championLeague = alWins ? 'al' : 'nl';
    
    return (
      <div className="world-series-block">
        <div className="world-series-logo">
          <img src={wsIcon} alt="World Series logo" />
        </div>
        <div className="series-block world-series">
          {renderSeriesInfo(playoffData.worldSeries.alChampion, playoffData.worldSeries.nlChampion, label)}
          {renderTeamRow(playoffData.worldSeries.alChampion, alWins, 'al')}
          {renderTeamRow(playoffData.worldSeries.nlChampion, !alWins, 'nl')}
        </div>
        <div className="world-series-header">
          <p className="eyebrow">Postseason {selectedSeason}</p>
        </div>
        {/* World Series Champion Banner */}
        <div className={`champion-banner ${championLeague}`}>
          <div className="champion-banner-content">
            <div className="champion-trophy">🏆</div>
            <div className="champion-info">
              <span className="champion-label">{selectedSeason} World Series Champions</span>
              <div className="champion-team">
                {champion.mlbTeamId && (
                  <img 
                    src={`https://www.mlbstatic.com/team-logos/${champion.mlbTeamId}.svg`}
                    alt={champion.team}
                    className="champion-logo"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <span className="champion-name">{champion.team}</span>
              </div>
            </div>
            <div className="champion-trophy">🏆</div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="playoff-bracket-container">
        <div className="standings-loading">
          <div className="loading-spinner"></div>
          <span>Loading postseason bracket...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="playoff-bracket-container">
        <div className="standings-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!playoffData) {
    return (
      <div className="playoff-bracket-container">
        <div className="standings-error">
          <span>No postseason data available for {selectedSeason}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="playoff-bracket-container">
      <div>
        <div className="bracket-grid">
          <div className={`round-column al wild-card${isSingleWildCard ? ' single-matchup' : ''}${is2020ExpandedPlayoffs ? ' expanded-playoffs' : ''}`}>
            <div className="round-title">AL Wild Card</div>
            <div className="round-matchups">
              {is2020ExpandedPlayoffs 
                ? renderExpandedWildCardRound(playoffData.AL.wildCard, 'al', 'right')
                : renderWildCardRound(playoffData.AL.wildCard, 'al', 'right')
              }
            </div>
          </div>

          <div className="round-column combo al-combo">
            <div className="round-title">ALDS</div>
            <div className="round-matchups division-slot top align-start">
              {alDivisionSeries[0] && renderSeriesBlock(alDivisionSeries[0], 'al', 'division', 'right')}
            </div>
            <div className="championship-center">
              <div className="round-title">ALCS</div>
              <div className="round-matchups single align-center">
                {renderChampionshipSeries(playoffData.AL.championshipSeries, 'al', 'right')}
              </div>
            </div>
            <div className="round-matchups division-slot bottom align-end">
              {alDivisionSeries[1] && renderSeriesBlock(alDivisionSeries[1], 'al', 'division', 'right')}
            </div>
          </div>

          <div className="round-column world">
            {renderWorldSeries()}
          </div>

          <div className="round-column combo nl-combo">
            <div className="round-title">NLDS</div>
            <div className="round-matchups division-slot top align-start">
              {nlDivisionSeries[0] && renderSeriesBlock(nlDivisionSeries[0], 'nl', 'division', 'left')}
            </div>
            <div className="championship-center">
              <div className="round-title">NLCS</div>
              <div className="round-matchups single align-center">
                {renderChampionshipSeries(playoffData.NL.championshipSeries, 'nl', 'left')}
              </div>
            </div>
            <div className="round-matchups division-slot bottom align-end">
              {nlDivisionSeries[1] && renderSeriesBlock(nlDivisionSeries[1], 'nl', 'division', 'left')}
            </div>
          </div>

          <div className={`round-column nl wild-card${isSingleWildCard ? ' single-matchup' : ''}${is2020ExpandedPlayoffs ? ' expanded-playoffs' : ''}`}>
            <div className="round-title">NL Wild Card</div>
            <div className="round-matchups">
              {is2020ExpandedPlayoffs 
                ? renderExpandedWildCardRound(playoffData.NL.wildCard, 'nl', 'left')
                : renderWildCardRound(playoffData.NL.wildCard, 'nl', 'left')
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MLBStandingsPostseason;
