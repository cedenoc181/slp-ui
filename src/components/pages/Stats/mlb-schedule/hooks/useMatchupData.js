import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import scheduleService from '../../../../../data/services/scheduleService';
import gamesService from '../../../../../data/services/gamesService';
import playerStatsService from '../../../../../data/services/playerStatsServices';
import teamsService from '../../../../../data/services/teamsService';
import teamStatsService from '../../../../../data/services/teamStatsService';
import { DEFAULT_SEASON } from '../../../../../data/constants/apiConstants';
import { mapSeasonType, hasValidStats, parseLast10, findTeamRecord } from '../utils';

export function useMatchupData() {
  const { gameId } = useParams();
  const { state } = useLocation();

  const [game, setGame] = useState(null);
  const [awayLast10, setAwayLast10] = useState([]);
  const [homeLast10, setHomeLast10] = useState([]);
  const [awayLast10Summary, setAwayLast10Summary] = useState(null);
  const [homeLast10Summary, setHomeLast10Summary] = useState(null);
  const [awaySP, setAwaySP] = useState(null);
  const [homeSP, setHomeSP] = useState(null);
  const [awaySPStatSeason, setAwaySPStatSeason] = useState(null);
  const [homeSPStatSeason, setHomeSPStatSeason] = useState(null);
  const [awaySPInfo, setAwaySPInfo] = useState(null);
  const [homeSPInfo, setHomeSPInfo] = useState(null);
  const [awaySeasonRecord, setAwaySeasonRecord] = useState(null);
  const [homeSeasonRecord, setHomeSeasonRecord] = useState(null);
  const [h2h, setH2h] = useState(null);
  const [h2hBatters, setH2hBatters] = useState(null);
  const [h2hPitchers, setH2hPitchers] = useState(null);
  const [awayBatting, setAwayBatting] = useState(null);
  const [homeBatting, setHomeBatting] = useState(null);
  const [awayPitching, setAwayPitching] = useState(null);
  const [homePitching, setHomePitching] = useState(null);
  const [boxscore, setBoxscore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        let gameData = state?.game || null;
        if (!gameData) {
          gameData = await scheduleService.getGameById(gameId, state?.seasonType || null, state?.season || null);
        }
        if (!gameData) throw new Error('Game not found');
        setGame(gameData);

        const awayId     = gameData.away_team_id;
        const homeId     = gameData.home_team_id;
        const awaySPId   = gameData.away_sp_id;
        const homeSPId   = gameData.home_sp_id;
        const season     = gameData.season || DEFAULT_SEASON;
        const seasonType = mapSeasonType(gameData.season_type);

        const FALLBACK_SEASON  = String(new Date().getFullYear() - 1);
        const needsFallback    = seasonType === 'S'; // only fall back during Spring Training
        const needsL10Fallback = seasonType === 'S';

        const gameStatusLower = (gameData.status || '').toLowerCase();
        const isFinalGame = gameStatusLower === 'final' || gameStatusLower === 'game over' || gameStatusLower === 'completed' || gameStatusLower === 'completed early';
        const isLiveGame  = gameStatusLower.includes('progress') || gameStatusLower === 'live' || gameStatusLower.includes('inning');
        const needsTeamStats = true; // always fetch — fallback for live/final when no H2H lineup


        const [
          awayL10Res, homeL10Res,
          awaySPRes, homeSPRes,
          h2hRes,
          awaySPInfoRes, homeSPInfoRes,
          awaySPFallbackRes, homeSPFallbackRes,
          standingsRes,
          h2hBattersRes, h2hPitchersRes,
          awayL10FallbackRes, homeL10FallbackRes,
          awayBattingRes, homeBattingRes,
          awayPitchingRes, homePitchingRes,
          boxscoreRes,
        ] = await Promise.allSettled([
          gamesService.getTeamLast10(awayId, season, seasonType),
          gamesService.getTeamLast10(homeId, season, seasonType),
          awaySPId
            ? playerStatsService.getPitcherCurrentStats(awaySPId, season, seasonType)
            : Promise.resolve(null),
          homeSPId
            ? playerStatsService.getPitcherCurrentStats(homeSPId, season, seasonType)
            : Promise.resolve(null),
          gamesService.getHeadToHead(awayId, homeId, { season: String(season), seasonType, limit: 10 }),
          awaySPId
            ? playerStatsService.getPlayerInfo(awaySPId)
            : Promise.resolve(null),
          homeSPId
            ? playerStatsService.getPlayerInfo(homeSPId)
            : Promise.resolve(null),
          awaySPId && needsFallback
            ? playerStatsService.getPitcherCurrentStats(awaySPId, FALLBACK_SEASON, 'R')
            : Promise.resolve(null),
          homeSPId && needsFallback
            ? playerStatsService.getPitcherCurrentStats(homeSPId, FALLBACK_SEASON, 'R')
            : Promise.resolve(null),
          seasonType === 'S'
            ? teamsService.getTeamSpringTrainingStandings(season)
            : teamsService.getTeamRegularSeasonStandings(season),
          gamesService.getHeadToHeadBatters(awayId, homeId, { season: String(season), seasonType, limit: 10 }),
          gamesService.getHeadToHeadPitchers(awayId, homeId, { season: String(season), seasonType, limit: 10 }),
          needsL10Fallback || needsFallback
            ? gamesService.getTeamLast10(awayId, FALLBACK_SEASON, 'R')
            : Promise.resolve(null),
          needsL10Fallback || needsFallback
            ? gamesService.getTeamLast10(homeId, FALLBACK_SEASON, 'R')
            : Promise.resolve(null),
          needsTeamStats
            ? teamStatsService.getTeamBattingStats(awayId, season, seasonType)
            : Promise.resolve(null),
          needsTeamStats
            ? teamStatsService.getTeamBattingStats(homeId, season, seasonType)
            : Promise.resolve(null),
          needsTeamStats
            ? teamStatsService.getTeamPitchingStats(awayId, season, seasonType)
            : Promise.resolve(null),
          needsTeamStats
            ? teamStatsService.getTeamPitchingStats(homeId, season, seasonType)
            : Promise.resolve(null),
          (isFinalGame || isLiveGame) && (gameData.game_pk ?? gameData.id)
            ? gamesService.getBoxscore(gameData.game_pk ?? gameData.id)
            : Promise.resolve(null),
        ]);

        // Last 10 — split summary from game objects; fall back to 2025 regular season for spring
        const awayPrimary  = parseLast10(awayL10Res.status  === 'fulfilled' ? awayL10Res.value  : null);
        const homePrimary  = parseLast10(homeL10Res.status  === 'fulfilled' ? homeL10Res.value  : null);
        const awayFBParsed = parseLast10(awayL10FallbackRes.status === 'fulfilled' ? awayL10FallbackRes.value : null);
        const homeFBParsed = parseLast10(homeL10FallbackRes.status === 'fulfilled' ? homeL10FallbackRes.value : null);

        const awayHasCompleted = awayPrimary.games.some(g => g.winning_team_id != null);
        const homeHasCompleted = homePrimary.games.some(g => g.winning_team_id != null);

        setAwayLast10Summary(awayPrimary.summary ?? awayFBParsed.summary);
        setHomeLast10Summary(homePrimary.summary ?? homeFBParsed.summary);
        setAwayLast10(awayHasCompleted ? awayPrimary.games : awayFBParsed.games);
        setHomeLast10(homeHasCompleted ? homePrimary.games : homeFBParsed.games);

        // Starting pitcher stats — prefer current season, fall back to prior season
        const awaySPPrimary  = awaySPRes.status  === 'fulfilled' ? awaySPRes.value  : null;
        const homeSPPrimary  = homeSPRes.status  === 'fulfilled' ? homeSPRes.value  : null;
        const awaySPFallback = awaySPFallbackRes.status === 'fulfilled' ? awaySPFallbackRes.value : null;
        const homeSPFallback = homeSPFallbackRes.status === 'fulfilled' ? homeSPFallbackRes.value : null;

        if (hasValidStats(awaySPPrimary)) {
          setAwaySP(awaySPPrimary);
          setAwaySPStatSeason(String(season));
        } else if (hasValidStats(awaySPFallback)) {
          setAwaySP(awaySPFallback);
          setAwaySPStatSeason(FALLBACK_SEASON);
        } else {
          setAwaySP(null);
          setAwaySPStatSeason(null);
        }

        if (hasValidStats(homeSPPrimary)) {
          setHomeSP(homeSPPrimary);
          setHomeSPStatSeason(String(season));
        } else if (hasValidStats(homeSPFallback)) {
          setHomeSP(homeSPFallback);
          setHomeSPStatSeason(FALLBACK_SEASON);
        } else {
          setHomeSP(null);
          setHomeSPStatSeason(null);
        }

        setAwaySPInfo(awaySPInfoRes.status === 'fulfilled' ? awaySPInfoRes.value : null);
        setHomeSPInfo(homeSPInfoRes.status === 'fulfilled' ? homeSPInfoRes.value : null);

        // Season records from standings
        const standings = standingsRes.status === 'fulfilled' ? standingsRes.value : null;
        const isSpring  = seasonType === 'S';
        setAwaySeasonRecord(findTeamRecord(standings, awayId, isSpring));
        setHomeSeasonRecord(findTeamRecord(standings, homeId, isSpring));

        // Head-to-head
        const h2hVal = h2hRes.status === 'fulfilled' ? h2hRes.value : null;
        setH2h(h2hVal?.summary ? h2hVal : null);
        setH2hBatters(h2hBattersRes.status   === 'fulfilled' ? h2hBattersRes.value   : null);
        setH2hPitchers(h2hPitchersRes.status === 'fulfilled' ? h2hPitchersRes.value  : null);

        // Team season stats (batting / pitching) — API returns an array; extract first element
        const unwrap = res => {
          if (res.status !== 'fulfilled') return null;
          const val = res.value;
          return Array.isArray(val) ? (val[0] ?? null) : (val ?? null);
        };
        setAwayBatting(unwrap(awayBattingRes));
        setHomeBatting(unwrap(homeBattingRes));
        setAwayPitching(unwrap(awayPitchingRes));
        setHomePitching(unwrap(homePitchingRes));

        // Boxscore (inning-by-inning)
        const bsVal = boxscoreRes.status === 'fulfilled' ? boxscoreRes.value : null;
        setBoxscore(bsVal?.innings?.length ? bsVal : null);
      } catch (err) {
        setError(err?.message || 'Failed to load matchup details.');
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    game, loading, error,
    awayLast10, homeLast10,
    awayLast10Summary, homeLast10Summary,
    awaySP, homeSP,
    awaySPStatSeason, homeSPStatSeason,
    awaySPInfo, homeSPInfo,
    awaySeasonRecord, homeSeasonRecord,
    h2h, h2hBatters, h2hPitchers,
    awayBatting, homeBatting,
    awayPitching, homePitching,
    boxscore,
  };
}
