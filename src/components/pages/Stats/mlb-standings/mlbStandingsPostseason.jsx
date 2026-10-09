import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../../styles/stats-page-styling/mlb-standings-postseason.css';
import teamsService from '../../../../data/services/teamsService';
import { TEAM_METADATA, SEASON_RANGE } from '../../../../data/constants/apiConstants';
import alIcon from '../../../../assets/images/AL-icon.png';
import nlIcon from '../../../../assets/images/NL-icon.png';
import wsIcon from '../../../../assets/images/world-series-logo.png';

// Wins needed to clinch, per round — used only for the "N wins from
// advancing" status-line hint, never to re-derive the winner itself (the
// server's own {round}_series_winner / ws_champion flag is authoritative).
const CLINCH_WINS = { wildcard: 2, division: 3, championship: 4, worldseries: 4 };

function MLBStandingsPostseason({ selectedSeason }) {
  const navigate = useNavigate();
  const [bracketData, setBracketData] = useState(null);
  const [teamSeasonData, setTeamSeasonData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Season actually being displayed — falls back to the prior year when selectedSeason has no bracket yet
  const [displaySeason, setDisplaySeason] = useState(selectedSeason);

  const bracketContainerRef = useRef(null);

  const getTeamUrlFromAbbr = (teamAbbreviation) => {
    return TEAM_METADATA[teamAbbreviation]?.urlName || teamAbbreviation?.toLowerCase();
  };

  const handleTeamClick = (teamAbbreviation) => {
    if (!teamAbbreviation) return;
    const urlName = getTeamUrlFromAbbr(teamAbbreviation);
    navigate(`/team-analytics/${urlName}?season=${displaySeason}`);
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

        let bracket = null;
        let effectiveSeason = selectedSeason;
        try {
          bracket = await teamsService.getTeamPostseasonBracket(selectedSeason);
        } catch (_) {}

        // No bracket yet for the selected season — fall back to the prior season's bracket
        if (!hasBracketData(bracket)) {
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
        setDisplaySeason(effectiveSeason);

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

      // Byes never get a Wild Card opponent at all (not just an undecided
      // one) — wildcard_opponent_id is the reliable signal. wc_series_winner
      // alone would also read null for a team whose WC series is simply
      // scheduled-but-not-started (or still in progress), misclassifying
      // them as a bye. The remaining participants are seeded together by
      // regular-season rank regardless of win/loss/live status — seed is a
      // playoff-entry ranking, not an outcome of the series itself.
      const byeTeams = leagueTeams.filter(t => t.wildcard_opponent_id == null);
      const wcParticipants = leagueTeams.filter(t => t.wildcard_opponent_id != null);

      const sortByRegularSeason = (teams) =>
        [...teams].sort((a, b) => {
          const aRank = teamSeasonData[a.team_id]?.league_rank ?? 99;
          const bRank = teamSeasonData[b.team_id]?.league_rank ?? 99;
          if (aRank !== bRank) return aRank - bRank;
          return (teamSeasonData[b.team_id]?.wins ?? 0) - (teamSeasonData[a.team_id]?.wins ?? 0);
        });

      const sortedBye = sortByRegularSeason(byeTeams);
      const sortedParticipants = sortByRegularSeason(wcParticipants);

      sortedBye.forEach((team, i) => { seeds[team.team_id] = i + 1; });
      sortedParticipants.forEach((team, i) => { seeds[team.team_id] = sortedBye.length + 1 + i; });
    });

    return seeds;
  }, [bracketData, teamSeasonData]);

  // Pair teams in a round using opponent_id as ground truth. This renders a
  // matchup the instant both participants are known — including a 0-0,
  // not-yet-started series, and (for LCS/WS) a matchup the server computed
  // ahead of MLB's own schedule — rather than waiting for nonzero win/loss
  // counts the way the old win/loss-based pairing did. Ordered by seed so a
  // card's top/bottom slot doesn't flip mid-series as the score changes.
  const pairByOpponent = useCallback((teams, byId, opponentKey) => {
    const matchups = [];
    const used = new Set();
    teams.forEach(team => {
      if (used.has(team.team_id)) return;
      const oppId = team[opponentKey];
      if (oppId == null) return; // opponent not known yet — hasn't reached this round
      const opponent = byId.get(oppId);
      if (!opponent || used.has(opponent.team_id)) return;
      used.add(team.team_id);
      used.add(opponent.team_id);
      const teamSeed = teamSeeds[team.team_id] ?? 99;
      const oppSeed = teamSeeds[opponent.team_id] ?? 99;
      matchups.push(teamSeed <= oppSeed ? { a: team, b: opponent } : { a: opponent, b: team });
    });
    return matchups;
  }, [teamSeeds]);

  // Build bracket matchup pairs directly from the aggregated series data
  const bracketMatchups = useMemo(() => {
    if (!bracketData) return null;

    const alTeams = bracketData['American League'] || [];
    const nlTeams = bracketData['National League'] || [];
    const allTeams = [...alTeams, ...nlTeams];
    // World Series opponents live in the other league's array.
    const byId = new Map(allTeams.map(t => [t.team_id, t]));

    return {
      AL: {
        wildCard: pairByOpponent(alTeams, byId, 'wildcard_opponent_id'),
        divisionSeries: pairByOpponent(alTeams, byId, 'lds_opponent_id'),
        championshipSeries: pairByOpponent(alTeams, byId, 'lcs_opponent_id'),
      },
      NL: {
        wildCard: pairByOpponent(nlTeams, byId, 'wildcard_opponent_id'),
        divisionSeries: pairByOpponent(nlTeams, byId, 'lds_opponent_id'),
        championshipSeries: pairByOpponent(nlTeams, byId, 'lcs_opponent_id'),
      },
      worldSeries: pairByOpponent(allTeams, byId, 'ws_opponent_id')[0] || null,
    };
  }, [bracketData, pairByOpponent]);

  // Create a team display object from bracket team data. `isWinner` comes
  // straight from the server's own {round}_series_winner / ws_champion flag
  // (bool or null) — never re-derived from score, since null-with-a-live-
  // record means "in progress," not "undecided by score comparison."
  const createTeamObj = useCallback((team, winsKey, winnerKey) => ({
    team: team.team_name,
    abbreviation: team.team_abbreviation,
    mlbTeamId: team.mlb_team_id,
    seed: teamSeeds[team.team_id] || 0,
    score: team[winsKey] ?? 0,
    isWinner: winnerKey ? team[winnerKey] : null,
    teamId: team.team_id,
  }), [teamSeeds]);

  // Transform bracket matchups to display format
  const playoffData = useMemo(() => {
    if (!bracketData || !bracketMatchups) return null;

    // Wild Card: flat array of [a, b, a, b, ...]
    const buildWCFlat = (matchups) =>
      matchups.flatMap(({ a, b }) => [
        createTeamObj(a, 'wildcard_wins', 'wc_series_winner'),
        createTeamObj(b, 'wildcard_wins', 'wc_series_winner'),
      ]);

    // Division Series: array of { topSeed, bottomSeed } — no projected flag,
    // LDS opponents are only ever populated once MLB's own schedule exists.
    const buildSeriesBlocks = (matchups) =>
      matchups.map(({ a, b }) => ({
        topSeed: createTeamObj(a, 'lds_wins', 'lds_series_winner'),
        bottomSeed: createTeamObj(b, 'lds_wins', 'lds_series_winner'),
      }));

    // Championship Series: single { team1, team2, projected }
    const buildChampionship = (matchups) => {
      if (!matchups.length) return null;
      const { a, b } = matchups[0];
      return {
        team1: createTeamObj(a, 'lcs_wins', 'lcs_series_winner'),
        team2: createTeamObj(b, 'lcs_wins', 'lcs_series_winner'),
        projected: !!(a.lcs_opponent_projected || b.lcs_opponent_projected),
      };
    };

    // World Series: { alChampion, nlChampion, projected }
    let worldSeries = null;
    if (bracketMatchups.worldSeries) {
      const { a, b } = bracketMatchups.worldSeries;
      const alTeam = a.league_name === 'American League' ? a : b;
      const nlTeam = a.league_name === 'National League' ? a : b;
      worldSeries = {
        alChampion: createTeamObj(alTeam, 'ws_wins', 'ws_champion'),
        nlChampion: createTeamObj(nlTeam, 'ws_wins', 'ws_champion'),
        projected: !!(alTeam.ws_opponent_projected || nlTeam.ws_opponent_projected),
      };
    }

    return {
      AL: {
        wildCard: buildWCFlat(bracketMatchups.AL.wildCard),
        divisionSeries: buildSeriesBlocks(bracketMatchups.AL.divisionSeries),
        championshipSeries: buildChampionship(bracketMatchups.AL.championshipSeries),
      },
      NL: {
        wildCard: buildWCFlat(bracketMatchups.NL.wildCard),
        divisionSeries: buildSeriesBlocks(bracketMatchups.NL.divisionSeries),
        championshipSeries: buildChampionship(bracketMatchups.NL.championshipSeries),
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
    const season = parseInt(displaySeason);
    if (season >= 2012 && season <= 2021 && season !== 2020) {
      return true;
    }
    const alWcCount = playoffData?.AL?.wildCard?.length || 0;
    const nlWcCount = playoffData?.NL?.wildCard?.length || 0;
    return alWcCount === 2 && nlWcCount === 2;
  }, [displaySeason, playoffData]);

  // Detect 2020 expanded playoffs (4 WC matchups per league = 8 teams)
  const is2020ExpandedPlayoffs = useMemo(() => {
    const season = parseInt(displaySeason);
    if (season === 2020) return true;
    const alWcCount = playoffData?.AL?.wildCard?.length || 0;
    const nlWcCount = playoffData?.NL?.wildCard?.length || 0;
    return alWcCount === 8 && nlWcCount === 8;
  }, [displaySeason, playoffData]);

  // The server's {round}_series_winner / ws_champion is documented as
  // authoritative — we're told not to re-derive it from scores. In practice
  // it has been observed to flip true prematurely (a live, in-progress
  // deciding game's still-changing score briefly counted as final), which is
  // mathematically detectable: a series can't be clinched below that round's
  // win threshold (e.g. 2-1 in a best-of-5 ALDS). This is a defensive floor,
  // not a replacement for the real fix — a flagged mismatch here means the
  // backend sent a result that isn't actually possible yet and should be
  // reported, not silently trusted.
  const clinchedWinner = (teamA, teamB, round) => {
    const clinch = CLINCH_WINS[round];
    if (teamA.isWinner === true && (!clinch || teamA.score >= clinch)) return teamA;
    if (teamB && teamB.isWinner === true && (!clinch || teamB.score >= clinch)) return teamB;
    return null;
  };

  // Status line trusts the server's own isWinner flag (filtered through the
  // clinch-math floor above) rather than comparing scores outright — a tied,
  // in-progress series (e.g. 1-1) must read "tied," not silently pick a
  // "winner" by score comparison.
  const seriesStatusLine = (teamA, teamB, round) => {
    if (!teamB) return null;
    const winner = clinchedWinner(teamA, teamB, round);
    if (winner === teamA) return `${teamA.team} wins the series ${teamA.score}-${teamB.score}`;
    if (winner === teamB) return `${teamB.team} wins the series ${teamB.score}-${teamA.score}`;
    if (teamA.score === 0 && teamB.score === 0) return 'Series not yet started';
    if (teamA.score === teamB.score) return `Series tied ${teamA.score}-${teamB.score}`;
    const leader = teamA.score > teamB.score ? teamA : teamB;
    const trailer = teamA.score > teamB.score ? teamB : teamA;
    const clinch = CLINCH_WINS[round];
    const winsAway = clinch ? clinch - leader.score : null;
    const awaySuffix = winsAway > 0 ? ` · ${winsAway} win${winsAway === 1 ? '' : 's'} from advancing` : '';
    return `${leader.team} leads ${leader.score}-${trailer.score}${awaySuffix}`;
  };

  const renderSeriesInfo = (teamA, teamB, label, round) => {
    const statusLine = seriesStatusLine(teamA, teamB, round) || `${teamA.team}`;
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
        <p className="series-info-winner">{statusLine}</p>
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
    const label =
      round === 'division'
        ? `${league.toUpperCase()} Division Series`
        : round === 'championship'
          ? `${league.toUpperCase()} Championship Series`
          : 'Series';
    const winner = clinchedWinner(matchup.topSeed, matchup.bottomSeed, round);
    return (
      <div className={`series-block ${round} connect-${connectDirection}`}>
        {renderSeriesInfo(matchup.topSeed, matchup.bottomSeed, label, round)}
        {renderTeamRow(matchup.topSeed, winner === matchup.topSeed, league)}
        {renderTeamRow(matchup.bottomSeed, winner === matchup.bottomSeed, league)}
      </div>
    );
  };

  const renderPlaceholderTeamRow = (label, league) => {
    const isNL = league === 'nl';
    return (
      <div className={`team-row placeholder ${isNL ? 'nl' : ''}`}>
        <span className="team-name">{label}</span>
      </div>
    );
  };

  const renderChampionshipSeriesPlaceholder = (league, connectDirection) => {
    const label = `${league.toUpperCase()} Championship Series`;
    return (
      <div className={`series-block championship placeholder connect-${connectDirection}`}>
        <p className="placeholder-round-label">{label}</p>
        {renderPlaceholderTeamRow('TBD', league)}
        {renderPlaceholderTeamRow('TBD', league)}
      </div>
    );
  };

  const renderChampionshipSeries = (series, league, connectDirection) => {
    if (!series) return renderChampionshipSeriesPlaceholder(league, connectDirection);
    const label = `${league.toUpperCase()} Championship Series`;
    const winner = clinchedWinner(series.team1, series.team2, 'championship');
    return (
      <div className={`series-block championship connect-${connectDirection}${series.projected ? ' projected' : ''}`}>
        {series.projected && <span className="projected-badge">Projected</span>}
        {renderSeriesInfo(series.team1, series.team2, label, 'championship')}
        {renderTeamRow(series.team1, winner === series.team1, league)}
        {renderTeamRow(series.team2, winner === series.team2, league)}
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
      const wcWinner = clinchedWinner(teamA, teamB, 'wildcard');
      const items = (
        <div key={`${league}-wc-${idx}`} className={`series-block wild-card connect-${connectDirection}`}>
          {renderSeriesInfo(teamA, teamB, `${league.toUpperCase()} Wild Card`, 'wildcard')}
          {renderTeamRow(teamA, wcWinner === teamA, league)}
          {teamB && renderTeamRow(teamB, wcWinner === teamB, league)}
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
        const wcWinner = clinchedWinner(teamA, teamB, 'wildcard');
        return (
          <div key={`${league}-wc-${startIdx + idx}`} className={`series-block wild-card connect-${connectDirection}`}>
            {renderSeriesInfo(teamA, teamB, `${league.toUpperCase()} Wild Card`, 'wildcard')}
            {renderTeamRow(teamA, wcWinner === teamA, league)}
            {teamB && renderTeamRow(teamB, wcWinner === teamB, league)}
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

  const renderWorldSeriesPlaceholder = () => (
    <div className="world-series-block">
      <div className="world-series-logo">
        <img src={wsIcon} alt="World Series logo" />
      </div>
      <div className="series-block world-series placeholder">
        <p className="placeholder-round-label">World Series</p>
        {renderPlaceholderTeamRow('AL Champion', 'al')}
        {renderPlaceholderTeamRow('NL Champion', 'nl')}
      </div>
      <div className="world-series-header">
        <p className="eyebrow">Postseason {displaySeason}</p>
      </div>
    </div>
  );

  const renderWorldSeries = () => {
    if (!playoffData?.worldSeries) return renderWorldSeriesPlaceholder();
    const { alChampion, nlChampion, projected } = playoffData.worldSeries;
    const label = 'World Series';

    const champion = clinchedWinner(alChampion, nlChampion, 'worldseries');
    const alWinner = champion === alChampion;
    const nlWinner = champion === nlChampion;
    const championLeague = alWinner ? 'al' : 'nl';

    return (
      <div className="world-series-block">
        <div className="world-series-logo">
          <img src={wsIcon} alt="World Series logo" />
        </div>
        <div className={`series-block world-series${projected ? ' projected' : ''}`}>
          {projected && <span className="projected-badge">Projected</span>}
          {renderSeriesInfo(alChampion, nlChampion, label, 'worldseries')}
          {renderTeamRow(alChampion, alWinner, 'al')}
          {renderTeamRow(nlChampion, nlWinner, 'nl')}
        </div>
        <div className="world-series-header">
          <p className="eyebrow">Postseason {displaySeason}</p>
        </div>
        {champion && (
          <div className={`champion-banner ${championLeague}`}>
            <div className="champion-banner-content">
              <div className="champion-trophy">🏆</div>
              <div className="champion-info">
                <span className="champion-label">{displaySeason} World Series Champions</span>
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
        )}
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
        {displaySeason !== selectedSeason && (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '8px', padding: '10px 16px', marginBottom: '12px', fontSize: '14px', color: '#7c5a00' }}>
            No postseason data available for {selectedSeason} yet. Showing the {displaySeason} bracket.
          </div>
        )}
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
