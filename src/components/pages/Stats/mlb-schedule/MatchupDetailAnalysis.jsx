import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getMlbId, getAbbr } from './utils';
import scheduleService from '../../../../data/services/scheduleService';
import teamStatsService from '../../../../data/services/teamStatsService';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import playerStatsService from '../../../../data/services/playerStatsServices';
import gamesService from '../../../../data/services/gamesService';
import { DEFAULT_SEASON, SEASON_TYPE_CODES, PLAYER_ROLES } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/matchup-analysis.css';
import '../../../../styles/stats-page-styling/scout-ai.css';
import { ScoutAiButton, ScoutAiModal } from './components';
import { getScoutAnalysis } from '../../../../data/services/scoutAiService';
import { useEarliestGameLabel, useScoutAiGate } from './hooks';

import {
  MiniHero,
  InsightsPanel,
  SplitCompareCard,
  PitcherSplitCard,
  TopBattersCard,
  H2HPitchersCard,
  H2HBattersCard,
} from './matchup-analysis/components';

import {
  normalizeBattingStats,
  normalizeBattingHomeRoad,
  normalizePitcherHomeRoadSplits,
  normalizePitcherVsHandSplits,
  buildInsights,
} from './matchup-analysis/utils/analysisUtils';

export default function MatchupDetailComp() {
  const { label: scoutUnlockLabel, isUnlocked: scoutUnlocked } = useEarliestGameLabel();
  const { gameId } = useParams();
  const { state }  = useLocation();

  const [game, setGame]           = useState(state?.game ?? null);
  const [prediction]              = useState(state?.prediction ?? null);
  const [loading, setLoading] = useState(!state?.game);
  const [error, setError]     = useState(null);

  const [awaySplits,              setAwaySplits]              = useState(null);
  const [awaySplitsSeason,        setAwaySplitsSeason]        = useState(null);
  const [homeSplits,              setHomeSplits]              = useState(null);
  const [homeSplitsSeason,        setHomeSplitsSeason]        = useState(null);

  const [awaySPVsHandSplits,    setAwaySPVsHandSplits]    = useState(null);
  const [awaySPVsHandSeason,    setAwaySPVsHandSeason]    = useState(null);
  const [awaySPHomeRoadSplits,  setAwaySPHomeRoadSplits]  = useState(null);
  const [awaySPHomeRoadSeason,  setAwaySPHomeRoadSeason]  = useState(null);
  const [awaySPThrows,          setAwaySPThrows]          = useState(state?.awaySPThrows ?? null);
  const [homeSPVsHandSplits,    setHomeSPVsHandSplits]    = useState(null);
  const [homeSPVsHandSeason,    setHomeSPVsHandSeason]    = useState(null);
  const [homeSPHomeRoadSplits,  setHomeSPHomeRoadSplits]  = useState(null);
  const [homeSPHomeRoadSeason,  setHomeSPHomeRoadSeason]  = useState(null);
  const [homeSPThrows,          setHomeSPThrows]          = useState(state?.homeSPThrows ?? null);
  const [awaySPPlayerMlbId,     setAwaySPPlayerMlbId]    = useState(null);
  const [homeSPPlayerMlbId,     setHomeSPPlayerMlbId]    = useState(null);

  const [awayHomeRoadSplits,       setAwayHomeRoadSplits]       = useState(null);
  const [awayHomeRoadSplitsSeason, setAwayHomeRoadSplitsSeason] = useState(null);
  const [homeHomeRoadSplits,       setHomeHomeRoadSplits]       = useState(null);
  const [homeHomeRoadSplitsSeason, setHomeHomeRoadSplitsSeason] = useState(null);

  const [awaySplitLeaders, setAwaySplitLeaders] = useState(null);
  const [homeSplitLeaders, setHomeSplitLeaders] = useState(null);
  const [insightsSeason,   setInsightsSeason]   = useState(null);

  const [awayHotLeaders,       setAwayHotLeaders]       = useState(null);
  const [awayHotLeadersSeason, setAwayHotLeadersSeason] = useState(null);
  const [homeHotLeaders,       setHomeHotLeaders]       = useState(null);
  const [homeHotLeadersSeason, setHomeHotLeadersSeason] = useState(null);

  const [h2hPitchers, setH2hPitchers] = useState(null);
  const [h2hBatters,  setH2hBatters]  = useState(null);
  const [h2hTab,      setH2hTab]      = useState('pitchers'); // 'pitchers' | 'batters'

  const [scoutAnalysis, setScoutAnalysis]       = useState(null);
  const [scoutLoading, setScoutLoading]         = useState(false);
  const [scoutError, setScoutError]             = useState(null);
  const [showScoutModal, setShowScoutModal]     = useState(false);
  const [scoutGeneratedAt, setScoutGeneratedAt] = useState(null);

  // Fallback: fetch game if navigated directly without router state
  useEffect(() => {
    if (game) { window.scrollTo(0, 0); return; }
    setLoading(true);
    scheduleService.getGameById(gameId, state?.seasonType ?? null, state?.season ?? null)
      .then(g => {
        if (!g) throw new Error('Game not found');
        setGame(g);
      })
      .catch(err => setError(err?.message || 'Failed to load game.'))
      .finally(() => setLoading(false));
  }, [gameId]); // eslint-disable-line

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── Offensive splits + home/road splits — three-tier fallback: current R → current S → prior year R ──
  useEffect(() => {
    if (!game) return;
    const season      = game.season || DEFAULT_SEASON;
    const priorSeason = String(Number(season) - 1);
    const TIER_LABELS = [null, `${season} Spring`, priorSeason];

    Promise.allSettled([
      teamStatsService.getTeamBattingStats(game.away_team_id, season,      'R'),
      teamStatsService.getTeamBattingStats(game.away_team_id, season,      'S'),
      teamStatsService.getTeamBattingStats(game.away_team_id, priorSeason, 'R'),
      teamStatsService.getTeamBattingStats(game.home_team_id, season,      'R'),
      teamStatsService.getTeamBattingStats(game.home_team_id, season,      'S'),
      teamStatsService.getTeamBattingStats(game.home_team_id, priorSeason, 'R'),
      teamStatsService.getTeamBattingHomeVsRoad(game.away_team_id, season,      'R'),
      teamStatsService.getTeamBattingHomeVsRoad(game.away_team_id, season,      'S'),
      teamStatsService.getTeamBattingHomeVsRoad(game.away_team_id, priorSeason, 'R'),
      teamStatsService.getTeamBattingHomeVsRoad(game.home_team_id, season,      'R'),
      teamStatsService.getTeamBattingHomeVsRoad(game.home_team_id, season,      'S'),
      teamStatsService.getTeamBattingHomeVsRoad(game.home_team_id, priorSeason, 'R'),
    ]).then(([awVH1, awVH2, awVH3, hmVH1, hmVH2, hmVH3, awHR1, awHR2, awHR3, hmHR1, hmHR2, hmHR3]) => {
      const ok = res => res.status === 'fulfilled' ? res.value : null;

      const awayVHTiers = [normalizeBattingStats(ok(awVH1)), normalizeBattingStats(ok(awVH2)), normalizeBattingStats(ok(awVH3))];
      const homeVHTiers = [normalizeBattingStats(ok(hmVH1)), normalizeBattingStats(ok(hmVH2)), normalizeBattingStats(ok(hmVH3))];
      const awayHRTiers = [normalizeBattingHomeRoad(ok(awHR1)), normalizeBattingHomeRoad(ok(awHR2)), normalizeBattingHomeRoad(ok(awHR3))];
      const homeHRTiers = [normalizeBattingHomeRoad(ok(hmHR1)), normalizeBattingHomeRoad(ok(hmHR2)), normalizeBattingHomeRoad(ok(hmHR3))];

      const awayVHIdx = awayVHTiers.findIndex(t => t !== null);
      const homeVHIdx = homeVHTiers.findIndex(t => t !== null);
      const awayHRIdx = awayHRTiers.findIndex(t => t !== null);
      const homeHRIdx = homeHRTiers.findIndex(t => t !== null);

      setAwaySplits(              awayVHIdx >= 0 ? awayVHTiers[awayVHIdx] : false);
      setAwaySplitsSeason(        awayVHIdx >= 0 ? TIER_LABELS[awayVHIdx] : null);
      setHomeSplits(              homeVHIdx >= 0 ? homeVHTiers[homeVHIdx] : false);
      setHomeSplitsSeason(        homeVHIdx >= 0 ? TIER_LABELS[homeVHIdx] : null);
      setAwayHomeRoadSplits(      awayHRIdx >= 0 ? awayHRTiers[awayHRIdx] : false);
      setAwayHomeRoadSplitsSeason(awayHRIdx >= 0 ? TIER_LABELS[awayHRIdx] : null);
      setHomeHomeRoadSplits(      homeHRIdx >= 0 ? homeHRTiers[homeHRIdx] : false);
      setHomeHomeRoadSplitsSeason(homeHRIdx >= 0 ? TIER_LABELS[homeHRIdx] : null);
    }).catch(() => {
      setAwaySplits(false); setHomeSplits(false);
      setAwayHomeRoadSplits(false); setHomeHomeRoadSplits(false);
    });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── SP splits — three-tier fallback: current R → current S → prior year R ──
  useEffect(() => {
    if (!game) return;
    const season      = game.season || DEFAULT_SEASON;
    const priorSeason = String(Number(season) - 1);

    const fetchSPSplits = async (spId) => {
      const [
        t1vsHand,  t1homeRoad,
        t2vsHand,  t2homeRoad,
        t3vsHand,  t3homeRoad,
        info,
      ] = await Promise.allSettled([
        playerStatsService.getPitcherVsHandSplits(spId, season,      SEASON_TYPE_CODES.REGULAR),
        playerStatsService.getPitcherHomeRoadSplits(spId, season,      SEASON_TYPE_CODES.REGULAR),
        playerStatsService.getPitcherVsHandSplits(spId, season,      SEASON_TYPE_CODES.SPRING_TRAINING),
        playerStatsService.getPitcherHomeRoadSplits(spId, season,      SEASON_TYPE_CODES.SPRING_TRAINING),
        playerStatsService.getPitcherVsHandSplits(spId, priorSeason, SEASON_TYPE_CODES.REGULAR),
        playerStatsService.getPitcherHomeRoadSplits(spId, priorSeason, SEASON_TYPE_CODES.REGULAR),
        playerStatsService.getPlayerInfo(spId),
      ]);

      const ok = res => res.status === 'fulfilled' ? res.value : null;
      // null label = current season (no badge); string label = fallback season
      const TIER_LABELS = [null, `${season} Spring`, priorSeason];

      const vsHandTiers   = [
        normalizePitcherVsHandSplits(ok(t1vsHand)),
        normalizePitcherVsHandSplits(ok(t2vsHand)),
        normalizePitcherVsHandSplits(ok(t3vsHand)),
      ];
      const homeRoadTiers = [
        normalizePitcherHomeRoadSplits(ok(t1homeRoad), season,      SEASON_TYPE_CODES.REGULAR),
        normalizePitcherHomeRoadSplits(ok(t2homeRoad), season,      SEASON_TYPE_CODES.SPRING_TRAINING),
        normalizePitcherHomeRoadSplits(ok(t3homeRoad), priorSeason, SEASON_TYPE_CODES.REGULAR),
      ];

      const vsHandIdx   = vsHandTiers.findIndex(t => t !== null);
      const homeRoadIdx = homeRoadTiers.findIndex(t => t !== null);

      return {
        vsHand:         vsHandIdx   >= 0 ? vsHandTiers[vsHandIdx]     : false,
        vsHandSeason:   vsHandIdx   >= 0 ? TIER_LABELS[vsHandIdx]     : null,
        homeRoad:       homeRoadIdx >= 0 ? homeRoadTiers[homeRoadIdx] : false,
        homeRoadSeason: homeRoadIdx >= 0 ? TIER_LABELS[homeRoadIdx]   : null,
        info:           ok(info),
      };
    };

    if (game.away_sp_id) {
      fetchSPSplits(game.away_sp_id)
        .then(({ vsHand, vsHandSeason, homeRoad, homeRoadSeason, info }) => {
          setAwaySPVsHandSplits(vsHand);
          setAwaySPVsHandSeason(vsHandSeason);
          setAwaySPHomeRoadSplits(homeRoad);
          setAwaySPHomeRoadSeason(homeRoadSeason);
          setAwaySPThrows(info?.throws ?? null);
          setAwaySPPlayerMlbId(info?.player_mlb_id ?? null);
        })
        .catch(() => { setAwaySPVsHandSplits(false); setAwaySPHomeRoadSplits(false); });
    }

    if (game.home_sp_id) {
      fetchSPSplits(game.home_sp_id)
        .then(({ vsHand, vsHandSeason, homeRoad, homeRoadSeason, info }) => {
          setHomeSPVsHandSplits(vsHand);
          setHomeSPVsHandSeason(vsHandSeason);
          setHomeSPHomeRoadSplits(homeRoad);
          setHomeSPHomeRoadSeason(homeRoadSeason);
          setHomeSPThrows(info?.throws ?? null);
          setHomeSPPlayerMlbId(info?.player_mlb_id ?? null);
        })
        .catch(() => { setHomeSPVsHandSplits(false); setHomeSPHomeRoadSplits(false); });
    }
  }, [game?.away_sp_id, game?.home_sp_id]); // eslint-disable-line

  // ── Team split leaders (Key Insights) — three-tier fallback: current R → current S → prior year R ──
  useEffect(() => {
    if (!game) return;
    const season      = game.season || DEFAULT_SEASON;
    const priorSeason = String(Number(season) - 1);
    const TIER_LABELS = [null, `${season} Spring`, priorSeason];
    const hasArr      = v => Array.isArray(v) && v.length > 0;

    Promise.allSettled([
      teamLeadersService.getTeamSplits(game.away_team_id, season,      'R', PLAYER_ROLES.BATTER),
      teamLeadersService.getTeamSplits(game.home_team_id, season,      'R', PLAYER_ROLES.BATTER),
      teamLeadersService.getTeamSplits(game.away_team_id, season,      'S', PLAYER_ROLES.BATTER),
      teamLeadersService.getTeamSplits(game.home_team_id, season,      'S', PLAYER_ROLES.BATTER),
      teamLeadersService.getTeamSplits(game.away_team_id, priorSeason, 'R', PLAYER_ROLES.BATTER),
      teamLeadersService.getTeamSplits(game.home_team_id, priorSeason, 'R', PLAYER_ROLES.BATTER),
    ]).then(([awT1, hmT1, awT2, hmT2, awT3, hmT3]) => {
      const ok  = res => res.status === 'fulfilled' ? res.value : null;
      const tiers = [
        { away: ok(awT1), home: ok(hmT1) },
        { away: ok(awT2), home: ok(hmT2) },
        { away: ok(awT3), home: ok(hmT3) },
      ];
      const idx = tiers.findIndex(t => hasArr(t.away) || hasArr(t.home));
      if (idx < 0) {
        setAwaySplitLeaders(false); setHomeSplitLeaders(false); setInsightsSeason(null);
        return;
      }
      const { away, home } = tiers[idx];
      setAwaySplitLeaders(hasArr(away) ? away : false);
      setHomeSplitLeaders(hasArr(home) ? home : false);
      setInsightsSeason(TIER_LABELS[idx]);
    }).catch(() => { setAwaySplitLeaders(false); setHomeSplitLeaders(false); });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Hot batting leaders (Top Batters card) — three-tier fallback ──
  useEffect(() => {
    if (!game) return;
    const season      = game.season || DEFAULT_SEASON;
    const priorSeason = String(Number(season) - 1);
    const asOfDate    = game.date || null;
    const hasData     = d => d && typeof d === 'object' && Object.values(d).some(a => Array.isArray(a) && a.length > 0);
    const TIER_LABELS = [null, `${season} Spring`, priorSeason];

    Promise.allSettled([
      teamLeadersService.getHotTeamBattingLeaders(game.away_team_id, season,      'R', 10, asOfDate),
      teamLeadersService.getHotTeamBattingLeaders(game.home_team_id, season,      'R', 10, asOfDate),
      teamLeadersService.getHotTeamBattingLeaders(game.away_team_id, season,      'S', 10, asOfDate),
      teamLeadersService.getHotTeamBattingLeaders(game.home_team_id, season,      'S', 10, asOfDate),
      teamLeadersService.getHotTeamBattingLeaders(game.away_team_id, priorSeason, 'R', 10, null),
      teamLeadersService.getHotTeamBattingLeaders(game.home_team_id, priorSeason, 'R', 10, null),
    ]).then(([awayT1, homeT1, awayT2, homeT2, awayT3, homeT3]) => {
      const ok = res => res.status === 'fulfilled' ? res.value : null;
      const awayTiers = [ok(awayT1), ok(awayT2), ok(awayT3)];
      const homeTiers = [ok(homeT1), ok(homeT2), ok(homeT3)];
      const awayIdx   = awayTiers.findIndex(d => hasData(d));
      const homeIdx   = homeTiers.findIndex(d => hasData(d));
      setAwayHotLeaders(      awayIdx >= 0 ? awayTiers[awayIdx] : false);
      setAwayHotLeadersSeason(awayIdx >= 0 ? TIER_LABELS[awayIdx] : null);
      setHomeHotLeaders(      homeIdx >= 0 ? homeTiers[homeIdx] : false);
      setHomeHotLeadersSeason(homeIdx >= 0 ? TIER_LABELS[homeIdx] : null);
    }).catch(() => { setAwayHotLeaders(false); setHomeHotLeaders(false); });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── H2H pitcher totals ──
  useEffect(() => {
    if (!game) return;
    const currentYear = new Date().getFullYear();
    const isPriorSeason = game.season && Number(game.season) !== currentYear;
    const seasonParam = isPriorSeason ? { season: game.season } : {};
    gamesService.getHeadToHeadPitchers(game.away_team_id, game.home_team_id, { limit: 10, totals: true, ...seasonParam })
      .then(data => {
        setH2hPitchers(data && (data.team_a?.length || data.team_b?.length) ? data : false);
      })
      .catch(() => setH2hPitchers(false));
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── H2H batter totals ──
  useEffect(() => {
    if (!game) return;
    const currentYear = new Date().getFullYear();
    const isPriorSeason = game.season && Number(game.season) !== currentYear;
    const seasonParam = isPriorSeason ? { season: game.season } : {};
    gamesService.getHeadToHeadBatters(game.away_team_id, game.home_team_id, { limit: 10, totals: true, ...seasonParam })
      .then(data => {
        setH2hBatters(data && (data.team_a?.length || data.team_b?.length) ? data : false);
      })
      .catch(() => setH2hBatters(false));
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Scout AI gate (must be unconditional — before any early returns) ──
  const scoutAllowedRef = useRef(null);
  const stableScoutAllowed = useCallback(() => { scoutAllowedRef.current?.(); }, []);
  const { usesRemaining, isLimitHit, gatedClick: handleScoutClick } = useScoutAiGate(stableScoutAllowed);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="matchup-analysis-page">
        <div className="analysis-container">
          <div className="matchup-detail-top-nav">
            <Link to={`/mlb-schedule/${gameId}`} className="analysis-back-btn">‹ Back to Matchup Detail</Link>
          </div>
          <div className="analysis-loading">
            <div className="analysis-loading-spinner" />
            <p>Loading analysis…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !game) {
    return (
      <div className="matchup-analysis-page">
        <div className="analysis-container">
          <div className="matchup-detail-top-nav">
            <Link to={`/mlb-schedule/${gameId}`} className="analysis-back-btn">‹ Back to Matchup Detail</Link>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '3rem', textAlign: 'center' }}>
            {error || 'Could not load this matchup.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Derived values ──
  const awayAbbr  = getAbbr(game.away_team_id) || game.away_team_name;
  const homeAbbr  = getAbbr(game.home_team_id) || game.home_team_name;
  const awayMlbId = getMlbId(game.away_team_id);
  const homeMlbId = getMlbId(game.home_team_id);

  scoutAllowedRef.current = async () => {
    if (scoutAnalysis) { setShowScoutModal(true); return; }

    setScoutLoading(true);
    setScoutError(null);
    setShowScoutModal(true);

    try {
      const gamePk = game.game_pk ?? game.id;
      const data = await getScoutAnalysis(gamePk);
      setScoutAnalysis(data.analysis);
      setScoutGeneratedAt(data.cached ? null : Date.now());
    } catch (err) {
      setScoutError(err.message || 'Scout AI is temporarily unavailable. Please try again.');
    } finally {
      setScoutLoading(false);
    }
  };

  const insights = (awaySplitLeaders === null || homeSplitLeaders === null)
    ? null
    : buildInsights(
        awaySplitLeaders === false ? [] : awaySplitLeaders,
        homeSplitLeaders === false ? [] : homeSplitLeaders,
        awayAbbr, homeAbbr, awayMlbId, homeMlbId, awaySPThrows, homeSPThrows
      );

  return (
    <div className="matchup-analysis-page">
      <div className="analysis-container">

        <div className="matchup-detail-top-nav">
          <Link to={`/mlb-schedule/${gameId}`} state={{ game, prediction }} className="analysis-back-btn">
            ‹ <span className="analysis-nav-full">Back to Matchup Detail</span><span className="analysis-nav-short">Back</span>
          </Link>
          <div className="analysis-scout-wrap">
            <ScoutAiButton
              hasAnalysis={!!scoutAnalysis}
              loading={scoutLoading}
              onClick={handleScoutClick}
              isToday={game?.date === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())}
              scoutAiAvailable={scoutUnlocked}
              pendingLabel={scoutUnlockLabel}
              tooltipPosition="right"
              usesRemaining={usesRemaining}
              isLimitHit={isLimitHit}
            />
          </div>
          <div className="matchup-detail-top-nav__right" />
        </div>

        <ScoutAiModal
          isOpen={showScoutModal}
          onClose={() => setShowScoutModal(false)}
          analysis={scoutAnalysis}
          error={scoutError}
          loading={scoutLoading}
          onRetry={scoutError ? handleScoutClick : null}
          generatedAt={scoutGeneratedAt}
        />

        {/* A. Mini Hero */}
        <MiniHero game={game} />

        {/* B. Starting Pitcher Splits */}
        <div className="analysis-section">
          <div className="analysis-section-title">Starting Pitcher Splits</div>
          <div className="analysis-two-col">
            <PitcherSplitCard
              abbr={awayAbbr}
              mlbId={awayMlbId}
              spPlayerId={awaySPPlayerMlbId}
              side="Away"
              spName={game.away_sp_name || null}
              spThrows={awaySPThrows}
              vsHandSplits={awaySPVsHandSplits}
              vsHandSeason={awaySPVsHandSeason}
              homeRoadSplits={awaySPHomeRoadSplits}
              homeRoadSeason={awaySPHomeRoadSeason}
            />
            <PitcherSplitCard
              abbr={homeAbbr}
              mlbId={homeMlbId}
              spPlayerId={homeSPPlayerMlbId}
              side="Home"
              spName={game.home_sp_name || null}
              spThrows={homeSPThrows}
              vsHandSplits={homeSPVsHandSplits}
              vsHandSeason={homeSPVsHandSeason}
              homeRoadSplits={homeSPHomeRoadSplits}
              homeRoadSeason={homeSPHomeRoadSeason}
            />
          </div>
        </div>

        {/* C. Key Insights */}
        <div className="analysis-section">
          <div className="analysis-section-title">Key Matchup Insights</div>
          {insightsSeason && (
            <div className="analysis-insights-season">
              <span className="sp-fallback-season-badge">{insightsSeason}</span>
            </div>
          )}
          <InsightsPanel insights={insights} />
        </div>

        {/* D. Offensive Splits + E. Top Batters This Week */}
        <div className="analysis-section">
          <div className="analysis-section-title">Offensive Splits</div>
          <div className="analysis-splits-batters-grid">
            <div className="asb-away">
              <SplitCompareCard
                abbr={awayAbbr}
                mlbId={awayMlbId}
                side="Away"
                opposingThrows={homeSPThrows}
                vsHandSplits={awaySplits}
                vsHandSeason={awaySplitsSeason}
                homeRoadSplits={awayHomeRoadSplits}
                homeRoadSeason={awayHomeRoadSplitsSeason}
              />
            </div>
            <div className="asb-home">
              <SplitCompareCard
                abbr={homeAbbr}
                mlbId={homeMlbId}
                side="Home"
                opposingThrows={awaySPThrows}
                vsHandSplits={homeSplits}
                vsHandSeason={homeSplitsSeason}
                homeRoadSplits={homeHomeRoadSplits}
                homeRoadSeason={homeHomeRoadSplitsSeason}
              />
            </div>
            <div className="asb-top-batters">
              <TopBattersCard
                awayAbbr={awayAbbr}
                homeAbbr={homeAbbr}
                awayMlbId={awayMlbId}
                homeMlbId={homeMlbId}
                awayData={awayHotLeaders}
                awayDataSeason={awayHotLeadersSeason}
                homeData={homeHotLeaders}
                homeDataSeason={homeHotLeadersSeason}
              />
            </div>
          </div>
        </div>

        {/* F. H2H History — Pitchers / Batters toggle */}
        <div className="analysis-section">
          <div className="analysis-section-title-row">
            <div className="analysis-section-title">Head-to-Head History</div>
            <div className="split-toggle split-toggle--lg">
              <button
                className={`split-toggle-btn${h2hTab === 'pitchers' ? ' active' : ''}`}
                onClick={() => setH2hTab('pitchers')}
              >
                Pitchers
              </button>
              <button
                className={`split-toggle-btn${h2hTab === 'batters' ? ' active' : ''}`}
                onClick={() => setH2hTab('batters')}
              >
                Batters
              </button>
            </div>
          </div>

          {h2hTab === 'pitchers' && (
            h2hPitchers === null ? (
              <div className="analysis-two-col">
                {[0, 1].map(i => (
                  <div key={i} className="h2h-card">
                    {[80, 65, 70, 55, 60].map((w, j) => (
                      <div key={j} className="split-skeleton-row analysis-skeleton" style={{ width: `${w}%`, marginBottom: '0.5rem' }} />
                    ))}
                  </div>
                ))}
              </div>
            ) : h2hPitchers === false ? (
              <div className="split-unavailable">No head-to-head pitcher data available</div>
            ) : (
              <div className="analysis-two-col">
                <H2HPitchersCard
                  abbr={awayAbbr}
                  mlbId={awayMlbId}
                  oppAbbr={homeAbbr}
                  teamAId={game.away_team_id}
                  teamBId={game.home_team_id}
                  players={h2hPitchers.team_a}
                  spName={game.away_sp_name || null}
                  gameCount={h2hPitchers.game_count}
                  gameSeason={game.season}
                />
                <H2HPitchersCard
                  abbr={homeAbbr}
                  mlbId={homeMlbId}
                  oppAbbr={awayAbbr}
                  teamAId={game.away_team_id}
                  teamBId={game.home_team_id}
                  players={h2hPitchers.team_b}
                  spName={game.home_sp_name || null}
                  gameCount={h2hPitchers.game_count}
                  gameSeason={game.season}
                />
              </div>
            )
          )}

          {h2hTab === 'batters' && (
            h2hBatters === null ? (
              <div className="analysis-two-col">
                {[0, 1].map(i => (
                  <div key={i} className="h2h-card">
                    {[80, 65, 70, 55, 60].map((w, j) => (
                      <div key={j} className="split-skeleton-row analysis-skeleton" style={{ width: `${w}%`, marginBottom: '0.5rem' }} />
                    ))}
                  </div>
                ))}
              </div>
            ) : h2hBatters === false ? (
              <div className="split-unavailable">No head-to-head batter data available</div>
            ) : (
              <div className="analysis-two-col">
                <H2HBattersCard
                  abbr={awayAbbr}
                  mlbId={awayMlbId}
                  oppAbbr={homeAbbr}
                  teamAId={game.away_team_id}
                  teamBId={game.home_team_id}
                  players={h2hBatters.team_a}
                  gameCount={h2hBatters.game_count}
                  gameSeason={game.season}
                />
                <H2HBattersCard
                  abbr={homeAbbr}
                  mlbId={homeMlbId}
                  oppAbbr={awayAbbr}
                  teamAId={game.away_team_id}
                  teamBId={game.home_team_id}
                  players={h2hBatters.team_b}
                  gameCount={h2hBatters.game_count}
                  gameSeason={game.season}
                />
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
}
