import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_SEASON, SEASON_TYPE_CODES } from '../../../../data/constants/apiConstants';
import { useMatchupData } from './hooks';
import '../../../../styles/stats-page-styling/matchup-analysis.css';
import '../../../../styles/stats-page-styling/scout-ai.css';
import { getMlbId, getAbbr, getUrlName, formGames, mapSeasonType } from './utils';
import {
  MatchupHero,
  BoxScoreCard,
  PitchersSection,
  LineupCard,
  TeamStatsCard,
  RecentFormCard,
  HeadToHeadSection,
  ScoutAiButton,
  ScoutAiModal,
} from './components';
import { getScoutAnalysis } from '../../../../data/services/scoutAiService';
import api from '../../../../data/services/apiService';
import teamStatsService from '../../../../data/services/teamStatsService';
import playerStatsService from '../../../../data/services/playerStatsServices';
import {
  normalizeBattingHomeRoad,
  normalizePitcherVsHandSplits,
  normalizePitcherHomeRoadSplits,
} from './matchup-analysis/utils/analysisUtils';

export default function MatchupDetail() {
  const [scoutAnalysis, setScoutAnalysis]   = useState(null);
  const [scoutLoading, setScoutLoading]     = useState(false);
  const [scoutError, setScoutError]         = useState(null);
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [scoutGeneratedAt, setScoutGeneratedAt] = useState(null);

  const {
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
  } = useMatchupData();

  if (loading) {
    return (
      <div className="matchup-detail-page">
        <div className="container">
          <div className="matchup-detail-top-nav">
            <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          </div>
          <div className="detail-loading">
            <div className="detail-loading-spinner" />
            <p>Loading matchup…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="matchup-detail-page">
        <div className="container">
          <div className="matchup-detail-top-nav">
            <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          </div>
          <div className="schedule-empty">
            <div className="empty-icon">⚾</div>
            <p className="empty-title">Matchup unavailable</p>
            <p className="empty-subtitle">
              {error || 'Could not load this matchup. Try navigating back to the schedule.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const awayMlbId   = getMlbId(game.away_team_id);
  const homeMlbId   = getMlbId(game.home_team_id);
  const awayAbbr    = getAbbr(game.away_team_id)    || game.away_team_name;
  const homeAbbr    = getAbbr(game.home_team_id)    || game.home_team_name;
  const awayUrlName = getUrlName(game.away_team_id);
  const homeUrlName = getUrlName(game.home_team_id);
  const season      = game.season || DEFAULT_SEASON;

  const statusLower = (game.status || '').toLowerCase();
  const isFinal     = statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed' || statusLower === 'completed early';
  const isLive      = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');
  const isScheduled = !isFinal && !isLive;

  const awayWon = game.winning_team_id === game.away_team_id;
  const homeWon = game.winning_team_id === game.home_team_id;

  const awaySPMlbId = awaySPInfo?.player_mlb_id ?? game.away_sp_mlb_id ?? null;
  const homeSPMlbId = homeSPInfo?.player_mlb_id ?? game.home_sp_mlb_id ?? null;

  const hasSP        = game.away_sp_name || game.home_sp_name;
  const hasLast10    = awayLast10.length > 0 || homeLast10.length > 0 || awayLast10Summary != null || homeLast10Summary != null;
  const hasH2h       = h2h?.summary != null && Array.isArray(h2h?.games) && h2h.games.length > 0;
  const hasTeamStats = !!(awayBatting || homeBatting || awayPitching || homePitching);
  const currentGamePk = game.game_pk ?? game.id;

  // Map H2H summary sides to current away / home teams
  const h2hAwaySum = hasH2h
    ? (h2h.summary.team_a?.team_id === game.away_team_id ? h2h.summary.team_a : h2h.summary.team_b)
    : null;
  const h2hHomeSum = hasH2h
    ? (h2h.summary.team_a?.team_id === game.away_team_id ? h2h.summary.team_b : h2h.summary.team_a)
    : null;

  // Recent form game lists
  const awayGames  = formGames(awayLast10, game.away_team_id);
  const homeGames  = formGames(homeLast10, game.home_team_id);
  const awayForm   = awayGames.map(g => g.result);
  const homeForm   = homeGames.map(g => g.result);
  const awayWins   = awayLast10Summary?.last_ten_wins   ?? awayForm.filter(r => r === 'W').length;
  const awayLosses = awayLast10Summary?.last_ten_losses ?? awayForm.filter(r => r === 'L').length;
  const homeWins   = homeLast10Summary?.last_ten_wins   ?? homeForm.filter(r => r === 'W').length;
  const homeLosses = homeLast10Summary?.last_ten_losses ?? homeForm.filter(r => r === 'L').length;

  // ── Scout AI ────────────────────────────────────────────────────────────
  const handleScoutClick = async () => {
    if (scoutAnalysis) { setShowScoutModal(true); return; }

    setScoutLoading(true);
    setScoutError(null);
    setShowScoutModal(true);

    try {
      // Parse "10-8" string → { wins: 10, losses: 8 }
      const parseRecord = (str) => {
        if (!str) return null;
        const [w, l] = String(str).split('-').map(Number);
        return (!isNaN(w) && !isNaN(l)) ? { wins: w, losses: l } : null;
      };

      // Pick only the fields the schema needs
      const pickBat = s => s ? { avg: s.avg, ops: s.ops } : null;
      const pickPit = s => s ? { era: s.era, whip: s.whip } : null;

      // Season context for split endpoints
      const season     = game.season || DEFAULT_SEASON;
      const seasonType = mapSeasonType(game.season_type);
      const stLower    = (game.season_type || '').toLowerCase();
      const spTypeCode =
        (stLower === 'spring' || stLower === 's')                       ? SEASON_TYPE_CODES.SPRING_TRAINING :
        (stLower === 'postseason' || stLower === 'post' || stLower === 'p') ? SEASON_TYPE_CODES.POSTSEASON :
        SEASON_TYPE_CODES.REGULAR;

      // Fetch splits + ML prediction in parallel
      const gamePk = game.game_pk ?? game.id;
      const [
        awayHRRes, homeHRRes,
        awaySPVsHRes, homeSPVsHRes,
        awaySPHRRes,  homeSPHRRes,
        mlPredRes,
      ] = await Promise.allSettled([
        teamStatsService.getTeamBattingHomeVsRoad(game.away_team_id, season, seasonType),
        teamStatsService.getTeamBattingHomeVsRoad(game.home_team_id, season, seasonType),
        game.away_sp_id ? playerStatsService.getPitcherVsHandSplits(game.away_sp_id, season, seasonType) : Promise.resolve(null),
        game.home_sp_id ? playerStatsService.getPitcherVsHandSplits(game.home_sp_id, season, seasonType) : Promise.resolve(null),
        game.away_sp_id ? playerStatsService.getPitcherHomeRoadSplits(game.away_sp_id, season, seasonType) : Promise.resolve(null),
        game.home_sp_id ? playerStatsService.getPitcherHomeRoadSplits(game.home_sp_id, season, seasonType) : Promise.resolve(null),
        api.get(`/predictions/${gamePk}`),
      ]);

      const val = r => r.status === 'fulfilled' ? r.value : null;

      // Batting vs-handedness: already embedded in awayBatting from the hook
      const awayBatVsHand = {
        vs_lhp: pickBat(awayBatting?.vs_left_handed_pitching),
        vs_rhp: pickBat(awayBatting?.vs_right_handed_pitching),
      };
      const homeBatVsHand = {
        vs_lhp: pickBat(homeBatting?.vs_left_handed_pitching),
        vs_rhp: pickBat(homeBatting?.vs_right_handed_pitching),
      };

      // ML prediction — endpoint returns { prediction: {...}, odds: {...}, ...game fields }
      const mlPredRaw    = val(mlPredRes);
      const mlPrediction = mlPredRaw?.prediction ?? null;
      const mlOdds       = mlPredRaw?.odds ?? null;

      // Batting home/road splits
      const awayHR = normalizeBattingHomeRoad(val(awayHRRes));
      const homeHR = normalizeBattingHomeRoad(val(homeHRRes));

      // SP splits
      const awaySPVsH  = normalizePitcherVsHandSplits(val(awaySPVsHRes));
      const homeSPVsH  = normalizePitcherVsHandSplits(val(homeSPVsHRes));
      const awaySPHR   = normalizePitcherHomeRoadSplits(val(awaySPHRRes), season, spTypeCode);
      const homeSPHR   = normalizePitcherHomeRoadSplits(val(homeSPHRRes), season, spTypeCode);

      const scoutPayload = {
        gameId:   String(game.game_pk),
        gameDate: game.game_date || game.date,
        status:   { isFinal, isLive, isScheduled },
        away: {
          name:   game.away_team_name,
          abbr:   awayAbbr,
          record: parseRecord(awaySeasonRecord),
          last10: { wins: awayWins, losses: awayLosses },
          batting:           awayBatting  ? { avg: awayBatting.avg, ops: awayBatting.ops } : null,
          batting_vs_hand:   awayBatVsHand,
          batting_home_road: awayHR ? { at_home: pickBat(awayHR.at_home), on_road: pickBat(awayHR.on_road) } : null,
          pitching:          awayPitching ? { era: awayPitching.era } : null,
          startingPitcher: {
            name:            game.away_sp_name,
            seasonStats:     awaySP ? { era: awaySP.era, whip: awaySP.whip } : null,
            vs_hand_splits:  awaySPVsH  ? { vs_lhb: pickPit(awaySPVsH.vs_lhb),  vs_rhb: pickPit(awaySPVsH.vs_rhb)   } : null,
            home_road_splits: awaySPHR  ? { at_home: pickPit(awaySPHR.at_home),  on_road: pickPit(awaySPHR.on_road)  } : null,
          },
        },
        home: {
          name:   game.home_team_name,
          abbr:   homeAbbr,
          record: parseRecord(homeSeasonRecord),
          last10: { wins: homeWins, losses: homeLosses },
          batting:           homeBatting  ? { avg: homeBatting.avg, ops: homeBatting.ops } : null,
          batting_vs_hand:   homeBatVsHand,
          batting_home_road: homeHR ? { at_home: pickBat(homeHR.at_home), on_road: pickBat(homeHR.on_road) } : null,
          pitching:          homePitching ? { era: homePitching.era } : null,
          startingPitcher: {
            name:            game.home_sp_name,
            seasonStats:     homeSP ? { era: homeSP.era, whip: homeSP.whip } : null,
            vs_hand_splits:  homeSPVsH  ? { vs_lhb: pickPit(homeSPVsH.vs_lhb),  vs_rhb: pickPit(homeSPVsH.vs_rhb)   } : null,
            home_road_splits: homeSPHR  ? { at_home: pickPit(homeSPHR.at_home),  on_road: pickPit(homeSPHR.on_road)  } : null,
          },
        },
        headToHead: h2h?.summary
          ? {
              team_a: { wins: h2h.summary.team_a?.wins ?? 0 },
              team_b: { wins: h2h.summary.team_b?.wins ?? 0 },
            }
          : null,
        mlPrediction: mlPrediction ?? null,
        odds: mlOdds ?? null,
      };

      console.log('[Scout AI] payload →', JSON.stringify(scoutPayload, null, 2));
      const data = await getScoutAnalysis(scoutPayload);
      setScoutAnalysis(data.analysis);
      setScoutGeneratedAt(data.cached ? null : Date.now());
    } catch (err) {
      setScoutError(err.message || 'Scout AI is temporarily unavailable. Please try again.');
    } finally {
      setScoutLoading(false);
    }
  };

  return (
    <div className="matchup-detail-page">
      <div className="container">
        <div className="matchup-detail-top-nav">
          <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          <ScoutAiButton
            hasAnalysis={!!scoutAnalysis}
            loading={scoutLoading}
            onClick={handleScoutClick}
          />
          <div className="matchup-detail-top-nav__right">
            <Link
              to={`/mlb-schedule/${currentGamePk}/analysis`}
              state={{ game }}
              className="deep-dive-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              Advanced Analysis
            </Link>
          </div>
        </div>

        <MatchupHero
          game={game}
          awayMlbId={awayMlbId}       homeMlbId={homeMlbId}
          awayAbbr={awayAbbr}         homeAbbr={homeAbbr}
          awayUrlName={awayUrlName}   homeUrlName={homeUrlName}
          awaySeasonRecord={awaySeasonRecord} homeSeasonRecord={homeSeasonRecord}
          isFinal={isFinal} isLive={isLive} isScheduled={isScheduled}
          awayWon={awayWon} homeWon={homeWon}
          publicFav={{ abbr: awayAbbr, pct: 65 }}
          scoutFav={{ abbr: homeAbbr, pct: 62 }}
          prediction={prediction}
        />

        <ScoutAiModal
          isOpen={showScoutModal}
          onClose={() => setShowScoutModal(false)}
          analysis={scoutAnalysis}
          error={scoutError}
          loading={scoutLoading}
          onRetry={scoutError ? handleScoutClick : null}
          generatedAt={scoutGeneratedAt}
        />

        {(isFinal || isLive) && game.home_runs_score != null && (
          <BoxScoreCard
            game={game}
            boxscore={boxscore}
            awayAbbr={awayAbbr} homeAbbr={homeAbbr}
            awayWon={awayWon}   homeWon={homeWon}
          />
        )}

        <div className="detail-grid">

          {hasSP && (
            <PitchersSection
              game={game}
              awayAbbr={awayAbbr}       homeAbbr={homeAbbr}
              awayMlbId={awayMlbId}     homeMlbId={homeMlbId}
              awaySP={awaySP}           homeSP={homeSP}
              awaySPMlbId={awaySPMlbId} homeSPMlbId={homeSPMlbId}
              awaySPInfo={awaySPInfo}   homeSPInfo={homeSPInfo}
              awayUrlName={awayUrlName} homeUrlName={homeUrlName}
              season={season}
              awaySPStatSeason={awaySPStatSeason} homeSPStatSeason={homeSPStatSeason}
              isFinal={isFinal} isLive={isLive}
            />
          )}

          {/* Away: TeamStatsCard (scheduled), LineupCard (live/final) with TeamStatsCard as fallback */}
          {isScheduled
            ? (hasTeamStats && <TeamStatsCard abbr={awayAbbr} mlbId={awayMlbId} batting={awayBatting} pitching={awayPitching} />)
            : <LineupCard
                abbr={awayAbbr} mlbId={awayMlbId} season={season} seasonType={game.season_type}
                gamePk={currentGamePk} teamAId={game.away_team_id} teamBId={game.home_team_id}
                side="team_a" isLive={isLive}
                fallback={hasTeamStats ? <TeamStatsCard abbr={awayAbbr} mlbId={awayMlbId} batting={awayBatting} pitching={awayPitching} /> : null}
              />
          }

          {hasLast10 && (
            <RecentFormCard
              awayAbbr={awayAbbr}         homeAbbr={homeAbbr}
              awayUrlName={awayUrlName}   homeUrlName={homeUrlName}
              awayGames={awayGames}       homeGames={homeGames}
              awayForm={awayForm}         homeForm={homeForm}
              awayWins={awayWins}         awayLosses={awayLosses}
              homeWins={homeWins}         homeLosses={homeLosses}
              season={season}
              seasonType={game.season_type}
            />
          )}

          {/* Home: TeamStatsCard (scheduled), LineupCard (live/final) with TeamStatsCard as fallback */}
          {isScheduled
            ? (hasTeamStats && <TeamStatsCard abbr={homeAbbr} mlbId={homeMlbId} batting={homeBatting} pitching={homePitching} />)
            : <LineupCard
                abbr={homeAbbr} mlbId={homeMlbId} season={season} seasonType={game.season_type}
                gamePk={currentGamePk} teamAId={game.away_team_id} teamBId={game.home_team_id}
                side="team_b" isLive={isLive}
                fallback={hasTeamStats ? <TeamStatsCard abbr={homeAbbr} mlbId={homeMlbId} batting={homeBatting} pitching={homePitching} /> : null}
              />
          }

          {hasH2h && (
            <HeadToHeadSection
              game={game}
              awayAbbr={awayAbbr} homeAbbr={homeAbbr}
              h2h={h2h} h2hAwaySum={h2hAwaySum} h2hHomeSum={h2hHomeSum}
            />
          )}

        </div>


      </div>
    </div>
  );
}
