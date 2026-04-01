import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import scheduleService from '../../../../../data/services/scheduleService';
import gamesService from '../../../../../data/services/gamesService';
import playerStatsService from '../../../../../data/services/playerStatsServices';
import teamsService from '../../../../../data/services/teamsService';
import teamStatsService from '../../../../../data/services/teamStatsService';
import predictionsService from '../../../../../data/services/predictionsService';
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
  const [awayBatting, setAwayBatting] = useState(null);
  const [homeBatting, setHomeBatting] = useState(null);
  const [awayPitching, setAwayPitching] = useState(null);
  const [homePitching, setHomePitching] = useState(null);
  const [boxscore, setBoxscore] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const controller = new AbortController();

    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        let gameData = state?.game || null;
        if (!gameData) {
          gameData = await scheduleService.getGameById(gameId, state?.seasonType || null, state?.season || null);
        }
        if (!gameData) throw new Error('Game not found');
        if (controller.signal.aborted) return;
        setGame(gameData);

        const awayId     = gameData.away_team_id;
        const homeId     = gameData.home_team_id;
        const awaySPId   = gameData.away_sp_id;
        const homeSPId   = gameData.home_sp_id;
        const season     = gameData.season || DEFAULT_SEASON;
        const seasonType = mapSeasonType(gameData.season_type);

        const FALLBACK_SEASON  = String(new Date().getFullYear() - 1);
        const needsL10Fallback = seasonType === 'S';

        const gameStatusLower = (gameData.status || '').toLowerCase();
        const isFinalGame = gameStatusLower === 'final' || gameStatusLower === 'game over' || gameStatusLower === 'completed' || gameStatusLower === 'completed early';
        const isLiveGame  = gameStatusLower.includes('progress') || gameStatusLower === 'live' || gameStatusLower.includes('inning');

        const resolve = res => res.status === 'fulfilled' ? res.value : null;

        // ── Wave 1: hero + pitchers section (fast, critical path) ────────────
        const [
          awaySPTier1Res, awaySPTier2Res, awaySPTier3Res,
          homeSPTier1Res, homeSPTier2Res, homeSPTier3Res,
          awaySPInfoRes, homeSPInfoRes,
          standingsRes,
          predictionRes,
          boxscoreRes,
        ] = await Promise.allSettled([
          awaySPId ? playerStatsService.getPitcherCurrentStats(awaySPId, season, 'R')          : Promise.resolve(null),
          awaySPId ? playerStatsService.getPitcherCurrentStats(awaySPId, season, 'S')          : Promise.resolve(null),
          awaySPId ? playerStatsService.getPitcherCurrentStats(awaySPId, FALLBACK_SEASON, 'R') : Promise.resolve(null),
          homeSPId ? playerStatsService.getPitcherCurrentStats(homeSPId, season, 'R')          : Promise.resolve(null),
          homeSPId ? playerStatsService.getPitcherCurrentStats(homeSPId, season, 'S')          : Promise.resolve(null),
          homeSPId ? playerStatsService.getPitcherCurrentStats(homeSPId, FALLBACK_SEASON, 'R') : Promise.resolve(null),
          awaySPId ? playerStatsService.getPlayerInfo(awaySPId)                                : Promise.resolve(null),
          homeSPId ? playerStatsService.getPlayerInfo(homeSPId)                                : Promise.resolve(null),
          seasonType === 'S'
            ? teamsService.getTeamSpringTrainingStandings(season)
            : teamsService.getTeamRegularSeasonStandings(season),
          (gameData.game_pk ?? gameData.id)
            ? predictionsService.getByGamePk(gameData.game_pk ?? gameData.id)
            : Promise.resolve(null),
          (isFinalGame || isLiveGame) && (gameData.game_pk ?? gameData.id)
            ? gamesService.getBoxscore(gameData.game_pk ?? gameData.id)
            : Promise.resolve(null),
        ]);

        if (controller.signal.aborted) return;

        // Commit wave-1 state and drop the loading screen
        const spTiers = [
          { stats: resolve(awaySPTier1Res), label: String(season) },
          { stats: resolve(awaySPTier2Res), label: `${String(season)} Spring` },
          { stats: resolve(awaySPTier3Res), label: FALLBACK_SEASON },
        ];
        const awayTier = spTiers.find(t => hasValidStats(t.stats));
        setAwaySP(awayTier?.stats ?? null);
        setAwaySPStatSeason(awayTier?.label ?? null);

        const homeTiers = [
          { stats: resolve(homeSPTier1Res), label: String(season) },
          { stats: resolve(homeSPTier2Res), label: `${String(season)} Spring` },
          { stats: resolve(homeSPTier3Res), label: FALLBACK_SEASON },
        ];
        const homeTier = homeTiers.find(t => hasValidStats(t.stats));
        setHomeSP(homeTier?.stats ?? null);
        setHomeSPStatSeason(homeTier?.label ?? null);

        setAwaySPInfo(resolve(awaySPInfoRes));
        setHomeSPInfo(resolve(homeSPInfoRes));

        const standings = resolve(standingsRes);
        const isSpring  = seasonType === 'S';
        setAwaySeasonRecord(findTeamRecord(standings, awayId, isSpring));
        setHomeSeasonRecord(findTeamRecord(standings, homeId, isSpring));

        setPrediction(resolve(predictionRes));

        const bsVal = resolve(boxscoreRes);
        setBoxscore(bsVal?.innings?.length ? bsVal : null);

        // ── Done: show page now ───────────────────────────────────────────────
        setLoading(false);

        // ── Wave 2: grid cards (last 10, H2H, team stats) — load in background
        const [
          awayL10Res, homeL10Res,
          h2hRes,
          awayL10FallbackRes, homeL10FallbackRes,
          awayBattingRes, homeBattingRes,
          awayPitchingRes, homePitchingRes,
        ] = await Promise.allSettled([
          gamesService.getTeamLast10(awayId, season, seasonType),
          gamesService.getTeamLast10(homeId, season, seasonType),
          gamesService.getHeadToHead(awayId, homeId, { season: String(season), seasonType, limit: 10 }),
          needsL10Fallback ? gamesService.getTeamLast10(awayId, FALLBACK_SEASON, 'R') : Promise.resolve(null),
          needsL10Fallback ? gamesService.getTeamLast10(homeId, FALLBACK_SEASON, 'R') : Promise.resolve(null),
          teamStatsService.getTeamBattingStats(awayId, season, seasonType),
          teamStatsService.getTeamBattingStats(homeId, season, seasonType),
          teamStatsService.getTeamPitchingStats(awayId, season, seasonType),
          teamStatsService.getTeamPitchingStats(homeId, season, seasonType),
        ]);

        if (controller.signal.aborted) return;

        const awayPrimary  = parseLast10(resolve(awayL10Res));
        const homePrimary  = parseLast10(resolve(homeL10Res));
        const awayFBParsed = parseLast10(resolve(awayL10FallbackRes));
        const homeFBParsed = parseLast10(resolve(homeL10FallbackRes));

        const awayHasCompleted = awayPrimary.games.some(g => g.winning_team_id != null);
        const homeHasCompleted = homePrimary.games.some(g => g.winning_team_id != null);

        setAwayLast10Summary(awayPrimary.summary ?? awayFBParsed.summary);
        setHomeLast10Summary(homePrimary.summary ?? homeFBParsed.summary);
        setAwayLast10(awayHasCompleted ? awayPrimary.games : awayFBParsed.games);
        setHomeLast10(homeHasCompleted ? homePrimary.games : homeFBParsed.games);

        const h2hVal = resolve(h2hRes);
        setH2h(h2hVal?.summary ? h2hVal : null);

        const unwrap = res => {
          if (res.status !== 'fulfilled') return null;
          const val = res.value;
          return Array.isArray(val) ? (val[0] ?? null) : (val ?? null);
        };
        setAwayBatting(unwrap(awayBattingRes));
        setHomeBatting(unwrap(homeBattingRes));
        setAwayPitching(unwrap(awayPitchingRes));
        setHomePitching(unwrap(homePitchingRes));

      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err?.message || 'Failed to load matchup details.');
        setLoading(false); // ensure loading clears on error too
      }
    }

    loadAll();
    return () => controller.abort();
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live-game polling: keep boxscore current for BoxScoreCard ────────────────
  // LineupCard handles its own polling for H2H lineup data.
  useEffect(() => {
    if (!game) return;
    const statusLower = (game.status || '').toLowerCase();
    const isLive = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');
    if (!isLive) return;

    const gamePk = game.game_pk ?? game.id;
    const poll = async () => {
      const bsRes = await gamesService.getBoxscore(gamePk).catch(() => null);
      if (bsRes?.innings?.length) setBoxscore(bsRes);
    };

    const intervalId = setInterval(poll, 60_000);
    return () => clearInterval(intervalId);
  }, [game]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    game, loading, error,
    awayLast10, homeLast10,
    awayLast10Summary, homeLast10Summary,
    awaySP, homeSP,
    awaySPStatSeason, homeSPStatSeason,
    awaySPInfo, homeSPInfo,
    awaySeasonRecord, homeSeasonRecord,
    h2h,
    awayBatting, homeBatting,
    awayPitching, homePitching,
    boxscore,
    prediction,
  };
}
