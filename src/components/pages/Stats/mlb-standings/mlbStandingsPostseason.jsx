import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../../styles/stats-page-styling/mlb-standings-postseason.css';
import teamsService from '../../../../data/services/teamsService';
import { TEAM_METADATA, SEASON_RANGE } from '../../../../data/constants/apiConstants';
import alIcon from '../../../../assets/images/AL-icon.png';
import nlIcon from '../../../../assets/images/NL-icon.png';
import wsIcon from '../../../../assets/images/world-series-logo.png';

function MLBStandingsPostseason({ selectedSeason }) {
  const navigate = useNavigate();
  const [bracketData, setBracketData] = useState(null);
  const [teamSeasonData, setTeamSeasonData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const bracketContainerRef = useRef(null);

  const getTeamUrlFromAbbr = (teamAbbreviation) => {
    return TEAM_METADATA[teamAbbreviation]?.urlName || teamAbbreviation?.toLowerCase();
  };

  const handleTeamClick = (teamAbbreviation) => {
    if (!teamAbbreviation) return;
    const urlName = getTeamUrlFromAbbr(teamAbbreviation);
    navigate(`/team-analytics/${urlName}?season=${selectedSeason}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const hasBracketData = (b) =>
          b &&
          ((b['American League'] && b['American League'].length > 0) ||
            (b['National League'] && b['National League'].length > 0));

        // Fetch bracket with fallback to prior year if no data
        let bracket = null;
        let effectiveSeason = selectedSeason;
        try {
          bracket = await teamsService.getTeamPostseasonBracket(selectedSeason);
        } catch (_) {}

        // Only fall back to prior year for past seasons — current season has no postseason yet
        if (!hasBracketData(bracket) && selectedSeason !== String(SEASON_RANGE.END)) {
          const priorYear = String(parseInt(selectedSeason) - 1);
          try {
            const priorBracket = await teamsService.getTeamPostseasonBracket(priorYear);
            if (hasBracketData(priorBracket)) {
              bracket = priorBracket;
              effectiveSeason = priorYear;
            }
          } catch (_) {}
        }

        setBracketData(bracket);

        // Fetch regular season records for each team (used for seeding)
        const allTeams = [
          ...(bracket?.['American League'] || []),
          ...(bracket?.['National League'] || []),
        ];

        const seasonDataMap = {};
        await Promise.all(
          allTeams.map(async (team) => {
            try {
              const seasonResponse = await teamsService.getTeamSeason(team.team_id, effectiveSeason);
              const rawData = Array.isArray(seasonResponse) ? seasonResponse[0] : seasonResponse;
              if (rawData) {
                const regularSeason = rawData.regular_season || rawData;
                seasonDataMap[team.team_id] = {
                  wins: regularSeason.record?.wins || regularSeason.wins || 0,
                  losses: regularSeason.record?.losses || regularSeason.losses || 0,
                  league_rank: regularSeason.ranks?.league_rank || regularSeason.league_rank || 99,
                };
              }
            } catch (_) {}
          })
        );

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

  // Scroll to center (World Series column) when bracket loads
  useEffect(() => {
    if (!loading && bracketData && bracketContainerRef.current) {
      const timer = setTimeout(() => {
        const container = bracketContainerRef.current;
        if (container) {
          const scrollCenter = (container.scrollWidth - container.clientWidth) / 2;
          container.scrollLeft = scrollCenter;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, bracketData]);

  // Assign seeds based on playoff entry point + regular season rank
  const teamSeeds = useMemo(() => {
    if (!bracketData) return {};

    const seeds = {};

    ['American League', 'National League'].forEach(leagueName => {
      const leagueTeams = bracketData[leagueName] || [];

      // Bye teams had no wild card games (wc_series_winner is null)
      const byeTeams = leagueTeams.filter(t => t.wc_series_winner === null);
      const wcWinners = leagueTeams.filter(t => t.wc_series_winner === true);
      const wcLosers = leagueTeams.filter(t => t.wc_series_winner === false);

      const sortByRegularSeason = (teams) =>
        [...teams].sort((a, b) => {
          const aRank = teamSeasonData[a.team_id]?.league_rank ?? 99;
          const bRank = teamSeasonData[b.team_id]?.league_rank ?? 99;
          if (aRank !== bRank) return aRank - bRank;
          return (teamSeasonData[b.team_id]?.wins ?? 0) - (teamSeasonData[a.team_id]?.wins ?? 0);
        });

      const sortedBye = sortByRegularSeason(byeTeams);
      const sortedWCWinners = sortByRegularSeason(wcWinners);
      const sortedWCLosers = sortByRegularSeason(wcLosers);

      sortedBye.forEach((team, i) => { seeds[team.team_id] = i + 1; });
      sortedWCWinners.forEach((team, i) => { seeds[team.team_id] = sortedBye.length + 1 + i; });
      sortedWCLosers.forEach((team, i) => { seeds[team.team_id] = sortedBye.length + sortedWCWinners.length + 1 + i; });
    });

    return seeds;
  }, [bracketData, teamSeasonData]);

  // Pair teams in a round using opponent IDs (primary) or complementary win/loss records (fallback).
  // Also handles null series-winner fields by computing the winner from wins vs losses —
  // this covers the case where the backend's game_type classification is broken.
  const pairRoundTeams = useCallback((leagueTeams, winsKey, lossesKey, winnerKey, opponentKey) => {
    // Include teams that played this round: series-winner field set OR recorded wins/losses
    const participants = leagueTeams.filter(t =>
      t[winnerKey] !== null || t[winsKey] > 0 || t[lossesKey] > 0
    );

    // Determine winner: use the field if available, otherwise compute from wins vs losses
    const isWinner = (t) => {
      if (t[winnerKey] !== null) return t[winnerKey] === true;
      return t[winsKey] > t[lossesKey];
    };

    const winners = participants.filter(t => isWinner(t));
    const losers = participants.filter(t => !isWinner(t));

    const matchups = [];
    const usedLosers = new Set();

    winners.forEach(winner => {
      // 1. Primary: match by opponent ID (most reliable)
      let loser = opponentKey
        ? losers.find(l => !usedLosers.has(l.team_id) && l.team_id === winner[opponentKey])
        : null;
      // 2. Secondary: complementary series record
      if (!loser) {
        loser = losers.find(l =>
          !usedLosers.has(l.team_id) &&
          l[winsKey] === winner[lossesKey] &&
          l[lossesKey] === winner[winsKey]
        );
      }
      // 3. Fallback: any unused loser
      if (!loser) {
        loser = losers.find(l => !usedLosers.has(l.team_id));
      }
      if (loser) {
        usedLosers.add(loser.team_id);
        matchups.push({ winner, loser });
      }
    });

    return matchups;
  }, []);

  // Build bracket matchup pairs directly from the aggregated series data
  const bracketMatchups = useMemo(() => {
    if (!bracketData) return null;

    const alTeams = bracketData['American League'] || [];
    const nlTeams = bracketData['National League'] || [];
    const allTeams = [...alTeams, ...nlTeams];

    const wsParticipants = allTeams.filter(t => t.ws_wins > 0 || t.ws_losses > 0);
    const wsWinner = allTeams.find(t => t.ws_champion === true) ||
      wsParticipants.sort((a, b) => b.ws_wins - a.ws_wins)[0] || null;
    const wsLoser = allTeams.find(t => t.ws_champion === false) ||
      wsParticipants.sort((a, b) => a.ws_wins - b.ws_wins)[0] || null;

    return {
      AL: {
        wildCard: pairRoundTeams(
          alTeams, 'wildcard_wins', 'wildcard_losses', 'wc_series_winner', 'wildcard_opponent_id'
        ),
        divisionSeries: pairRoundTeams(
          alTeams, 'lds_wins', 'lds_losses', 'lds_series_winner', 'lds_opponent_id'
        ),
        championshipSeries: pairRoundTeams(
          alTeams, 'lcs_wins', 'lcs_losses', 'lcs_series_winner', 'lcs_opponent_id'
        ),
      },
      NL: {
        wildCard: pairRoundTeams(
          nlTeams, 'wildcard_wins', 'wildcard_losses', 'wc_series_winner', 'wildcard_opponent_id'
        ),
        divisionSeries: pairRoundTeams(
          nlTeams, 'lds_wins', 'lds_losses', 'lds_series_winner', 'lds_opponent_id'
        ),
        championshipSeries: pairRoundTeams(
          nlTeams, 'lcs_wins', 'lcs_losses', 'lcs_series_winner', 'lcs_opponent_id'
        ),
      },
      worldSeries: wsWinner && wsLoser ? { winner: wsWinner, loser: wsLoser } : null,
    };
  }, [bracketData, pairRoundTeams]);

  // Create a team display object from bracket team data + series wins
  const createTeamObj = useCallback((team, seriesWins) => ({
    team: team.team_name,
    abbreviation: team.team_abbreviation,
    mlbTeamId: team.mlb_team_id,
    logo: `https://www.mlbstatic.com/team-logos/${team.mlb_team_id}.svg`,
    seed: teamSeeds[team.team_id] || 0,
    score: seriesWins,
    teamId: team.team_id,
  }), [teamSeeds]);

  // Transform bracket matchups to display format
  const playoffData = useMemo(() => {
    if (!bracketData || !bracketMatchups) return null;

    // Wild Card: flat array of [winner, loser, winner, loser, ...]
    const buildWCFlat = (matchups, winsKey) =>
      matchups.flatMap(({ winner, loser }) => [
        createTeamObj(winner, winner[winsKey]),
        createTeamObj(loser, loser[winsKey]),
      ]);

    // Division Series: array of { topSeed, bottomSeed }
    const buildSeriesBlocks = (matchups, winsKey) =>
      matchups.map(({ winner, loser }) => ({
        topSeed: createTeamObj(winner, winner[winsKey]),
        bottomSeed: createTeamObj(loser, loser[winsKey]),
      }));

    // Championship Series: single { team1, team2 }
    const buildChampionship = (matchups, winsKey) => {
      if (!matchups.length) return null;
      const { winner, loser } = matchups[0];
      return {
        team1: createTeamObj(winner, winner[winsKey]),
        team2: createTeamObj(loser, loser[winsKey]),
      };
    };

    // World Series: { alChampion, nlChampion }
    let worldSeries = null;
    if (bracketMatchups.worldSeries) {
      const { winner, loser } = bracketMatchups.worldSeries;
      const alTeam = winner.league_name === 'American League' ? winner : loser;
      const nlTeam = winner.league_name === 'National League' ? winner : loser;
      worldSeries = {
        alChampion: createTeamObj(alTeam, alTeam.ws_wins),
        nlChampion: createTeamObj(nlTeam, nlTeam.ws_wins),
      };
    }

    return {
      AL: {
        wildCard: buildWCFlat(bracketMatchups.AL.wildCard, 'wildcard_wins'),
        divisionSeries: buildSeriesBlocks(bracketMatchups.AL.divisionSeries, 'lds_wins'),
        championshipSeries: buildChampionship(bracketMatchups.AL.championshipSeries, 'lcs_wins'),
      },
      NL: {
        wildCard: buildWCFlat(bracketMatchups.NL.wildCard, 'wildcard_wins'),
        divisionSeries: buildSeriesBlocks(bracketMatchups.NL.divisionSeries, 'lds_wins'),
        championshipSeries: buildChampionship(bracketMatchups.NL.championshipSeries, 'lcs_wins'),
      },
      worldSeries,
    };
  }, [bracketData, bracketMatchups, createTeamObj]);

  const alDivisionSeries = playoffData?.AL?.divisionSeries || [];
  const nlDivisionSeries = playoffData?.NL?.divisionSeries || [];

  // True only when there is at least one round's worth of matchup data
  const hasPlayoffContent = !!(
    playoffData?.worldSeries ||
    playoffData?.AL?.wildCard?.length ||
    playoffData?.NL?.wildCard?.length ||
    playoffData?.AL?.divisionSeries?.length ||
    playoffData?.NL?.divisionSeries?.length ||
    playoffData?.AL?.championshipSeries ||
    playoffData?.NL?.championshipSeries
  );

  // Detect single wild card format (2012-2021, excluding 2020)
  const isSingleWildCard = useMemo(() => {
    const season = parseInt(selectedSeason);
    if (season >= 2012 && season <= 2021 && season !== 2020) {
      return true;
    }
    const alWcCount = playoffData?.AL?.wildCard?.length || 0;
    const nlWcCount = playoffData?.NL?.wildCard?.length || 0;
    return alWcCount === 2 && nlWcCount === 2;
  }, [selectedSeason, playoffData]);

  // Detect 2020 expanded playoffs (4 WC matchups per league = 8 teams)
  const is2020ExpandedPlayoffs = useMemo(() => {
    const season = parseInt(selectedSeason);
    if (season === 2020) return true;
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
      <div
        className={`team-row ${isWinner ? 'winner' : ''} ${isNL ? 'nl' : ''} clickable-team`}
        onClick={() => handleTeamClick(team.abbreviation)}
      >
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

  const renderExpandedWildCardRound = (games, league, connectDirection) => {
    if (!games || games.length === 0) return null;
    const pairs = chunkIntoMatchups(games);

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

  if (error) {
    return (
      <div className="playoff-bracket-container">
        <div className="standings-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!playoffData || !hasPlayoffContent) {
    const isCurrentSeason = selectedSeason === String(SEASON_RANGE.END);
    return (
      <div className="playoff-bracket-container" style={{ justifyContent: 'center', minHeight: '160px' }}>
        <div className="standings-error">
          <span>
            {isCurrentSeason
              ? `The ${selectedSeason} postseason starts in October ${selectedSeason}. Check back then!`
              : `No postseason data available for ${selectedSeason}.`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="playoff-bracket-container" ref={bracketContainerRef}>
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
