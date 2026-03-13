import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getMlbId, getAbbr, mapSeasonType } from './utils';
import scheduleService from '../../../../data/services/scheduleService';
import teamStatsService from '../../../../data/services/teamStatsService';
import teamLeadersService from '../../../../data/services/teamLeadersService';
import playerStatsService from '../../../../data/services/playerStatsServices';
import gamesService from '../../../../data/services/gamesService';
import { DEFAULT_SEASON, SEASON_TYPE_CODES, PLAYER_ROLES } from '../../../../data/constants/apiConstants';
import '../../../../styles/stats-page-styling/matchup-analysis.css';

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
  const { gameId } = useParams();
  const { state }  = useLocation();

  const [game, setGame]       = useState(state?.game ?? null);
  const [loading, setLoading] = useState(!state?.game);
  const [error, setError]     = useState(null);

  const [awaySplits, setAwaySplits] = useState(null);
  const [homeSplits, setHomeSplits] = useState(null);

  const [awaySPVsHandSplits,   setAwaySPVsHandSplits]   = useState(null);
  const [awaySPHomeRoadSplits, setAwaySPHomeRoadSplits]  = useState(null);
  const [awaySPThrows,         setAwaySPThrows]          = useState(state?.awaySPThrows ?? null);
  const [homeSPVsHandSplits,   setHomeSPVsHandSplits]   = useState(null);
  const [homeSPHomeRoadSplits, setHomeSPHomeRoadSplits]  = useState(null);
  const [homeSPThrows,         setHomeSPThrows]          = useState(state?.homeSPThrows ?? null);
  const [awaySPPlayerMlbId,    setAwaySPPlayerMlbId]    = useState(null);
  const [homeSPPlayerMlbId,    setHomeSPPlayerMlbId]    = useState(null);

  const [awayHomeRoadSplits, setAwayHomeRoadSplits] = useState(null);
  const [homeHomeRoadSplits, setHomeHomeRoadSplits] = useState(null);

  const [awaySplitLeaders, setAwaySplitLeaders] = useState(null);
  const [homeSplitLeaders, setHomeSplitLeaders] = useState(null);

  const [awayHotLeaders, setAwayHotLeaders] = useState(null);
  const [homeHotLeaders, setHomeHotLeaders] = useState(null);

  const [h2hPitchers, setH2hPitchers] = useState(null);
  const [h2hBatters,  setH2hBatters]  = useState(null);
  const [h2hTab,      setH2hTab]      = useState('pitchers'); // 'pitchers' | 'batters'

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

  // ── Offensive splits ──
  useEffect(() => {
    if (!game) return;
    const season     = game.season || DEFAULT_SEASON;
    const seasonType = mapSeasonType(game.season_type);
    Promise.all([
      teamStatsService.getTeamBattingStats(game.away_team_id, season, seasonType),
      teamStatsService.getTeamBattingStats(game.home_team_id, season, seasonType),
    ]).then(([away, home]) => {
      setAwaySplits(normalizeBattingStats(away) ?? false);
      setHomeSplits(normalizeBattingStats(home) ?? false);
    }).catch(() => { setAwaySplits(false); setHomeSplits(false); });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Team batting home/road splits ──
  useEffect(() => {
    if (!game) return;
    const season     = game.season || DEFAULT_SEASON;
    const seasonType = mapSeasonType(game.season_type);
    Promise.all([
      teamStatsService.getTeamBattingHomeVsRoad(game.away_team_id, season, seasonType),
      teamStatsService.getTeamBattingHomeVsRoad(game.home_team_id, season, seasonType),
    ]).then(([away, home]) => {
      setAwayHomeRoadSplits(normalizeBattingHomeRoad(away) ?? false);
      setHomeHomeRoadSplits(normalizeBattingHomeRoad(home) ?? false);
    }).catch(() => { setAwayHomeRoadSplits(false); setHomeHomeRoadSplits(false); });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── SP splits ──
  useEffect(() => {
    if (!game) return;
    const season = game.season || DEFAULT_SEASON;
    const stLower = (game.season_type || '').toLowerCase();
    const spSeasonTypeCode =
      (stLower === 'spring'     || stLower === 's')                        ? SEASON_TYPE_CODES.SPRING_TRAINING :
      (stLower === 'postseason' || stLower === 'post' || stLower === 'p')  ? SEASON_TYPE_CODES.POSTSEASON      :
      SEASON_TYPE_CODES.REGULAR;

    if (game.away_sp_id) {
      Promise.all([
        playerStatsService.getPitcherVsHandSplits(game.away_sp_id, season, spSeasonTypeCode),
        playerStatsService.getPitcherHomeRoadSplits(game.away_sp_id, season, spSeasonTypeCode),
        playerStatsService.getPlayerInfo(game.away_sp_id),
      ]).then(([vsHand, homeRoad, info]) => {
        setAwaySPVsHandSplits(normalizePitcherVsHandSplits(vsHand) ?? false);
        setAwaySPHomeRoadSplits(normalizePitcherHomeRoadSplits(homeRoad, season, spSeasonTypeCode) ?? false);
        setAwaySPThrows(info?.throws ?? null);
        setAwaySPPlayerMlbId(info?.player_mlb_id ?? null);
      }).catch(() => { setAwaySPVsHandSplits(false); setAwaySPHomeRoadSplits(false); });
    }

    if (game.home_sp_id) {
      Promise.all([
        playerStatsService.getPitcherVsHandSplits(game.home_sp_id, season, spSeasonTypeCode),
        playerStatsService.getPitcherHomeRoadSplits(game.home_sp_id, season, spSeasonTypeCode),
        playerStatsService.getPlayerInfo(game.home_sp_id),
      ]).then(([vsHand, homeRoad, info]) => {
        setHomeSPVsHandSplits(normalizePitcherVsHandSplits(vsHand) ?? false);
        setHomeSPHomeRoadSplits(normalizePitcherHomeRoadSplits(homeRoad, season, spSeasonTypeCode) ?? false);
        setHomeSPThrows(info?.throws ?? null);
        setHomeSPPlayerMlbId(info?.player_mlb_id ?? null);
      }).catch(() => { setHomeSPVsHandSplits(false); setHomeSPHomeRoadSplits(false); });
    }
  }, [game?.away_sp_id, game?.home_sp_id]); // eslint-disable-line

  // ── Team split leaders (Key Insights) ──
  useEffect(() => {
    if (!game) return;
    const season     = game.season || DEFAULT_SEASON;
    const seasonType = mapSeasonType(game.season_type);
    Promise.all([
      teamLeadersService.getTeamSplits(game.away_team_id, season, seasonType, PLAYER_ROLES.BATTER),
      teamLeadersService.getTeamSplits(game.home_team_id, season, seasonType, PLAYER_ROLES.BATTER),
    ]).then(([away, home]) => {
      setAwaySplitLeaders(Array.isArray(away) && away.length ? away : false);
      setHomeSplitLeaders(Array.isArray(home) && home.length ? home : false);
    }).catch(() => { setAwaySplitLeaders(false); setHomeSplitLeaders(false); });
  }, [game?.away_team_id, game?.home_team_id]); // eslint-disable-line

  // ── Hot batting leaders (Top Batters card) ──
  useEffect(() => {
    if (!game) return;
    const season     = game.season || DEFAULT_SEASON;
    const seasonType = mapSeasonType(game.season_type);
    const asOfDate   = game.date || null;
    Promise.all([
      teamLeadersService.getHotTeamBattingLeaders(game.away_team_id, season, seasonType, 10, asOfDate),
      teamLeadersService.getHotTeamBattingLeaders(game.home_team_id, season, seasonType, 10, asOfDate),
    ]).then(([away, home]) => {
      setAwayHotLeaders(away && typeof away === 'object' ? away : false);
      setHomeHotLeaders(home && typeof home === 'object' ? home : false);
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
          <Link to={`/mlb-schedule/${gameId}`} state={{ game }} className="analysis-back-btn">
            ‹ Back to Matchup Detail
          </Link>
        </div>

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
              homeRoadSplits={awaySPHomeRoadSplits}
            />
            <PitcherSplitCard
              abbr={homeAbbr}
              mlbId={homeMlbId}
              spPlayerId={homeSPPlayerMlbId}
              side="Home"
              spName={game.home_sp_name || null}
              spThrows={homeSPThrows}
              vsHandSplits={homeSPVsHandSplits}
              homeRoadSplits={homeSPHomeRoadSplits}
            />
          </div>
        </div>

        {/* C. Key Insights */}
        <div className="analysis-section">
          <div className="analysis-section-title">Key Matchup Insights</div>
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
                homeRoadSplits={awayHomeRoadSplits}
              />
            </div>
            <div className="asb-home">
              <SplitCompareCard
                abbr={homeAbbr}
                mlbId={homeMlbId}
                side="Home"
                opposingThrows={awaySPThrows}
                vsHandSplits={homeSplits}
                homeRoadSplits={homeHomeRoadSplits}
              />
            </div>
            <div className="asb-top-batters">
              <TopBattersCard
                awayAbbr={awayAbbr}
                homeAbbr={homeAbbr}
                awayMlbId={awayMlbId}
                homeMlbId={homeMlbId}
                awayData={awayHotLeaders}
                homeData={homeHotLeaders}
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
