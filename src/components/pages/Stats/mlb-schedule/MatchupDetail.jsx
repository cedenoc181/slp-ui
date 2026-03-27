import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_SEASON } from '../../../../data/constants/apiConstants';
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

  return (
    <div className="matchup-detail-page">
      <div className="container">
        <div className="matchup-detail-top-nav">
          <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          <div className="matchup-detail-top-nav__center">
            <ScoutAiButton
              hasAnalysis={!!scoutAnalysis}
              loading={scoutLoading}
              onClick={handleScoutClick}
              isToday={game?.date === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())}
            />
          </div>
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
            ? ((awayBatting || awayPitching) && <TeamStatsCard abbr={awayAbbr} mlbId={awayMlbId} batting={awayBatting} pitching={awayPitching} />)
            : <LineupCard
                abbr={awayAbbr} mlbId={awayMlbId} season={season} seasonType={game.season_type}
                gamePk={currentGamePk} teamAId={game.away_team_id} teamBId={game.home_team_id}
                side="team_a" isLive={isLive}
                fallback={(awayBatting || awayPitching) ? <TeamStatsCard abbr={awayAbbr} mlbId={awayMlbId} batting={awayBatting} pitching={awayPitching} /> : null}
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
            ? ((homeBatting || homePitching) && <TeamStatsCard abbr={homeAbbr} mlbId={homeMlbId} batting={homeBatting} pitching={homePitching} />)
            : <LineupCard
                abbr={homeAbbr} mlbId={homeMlbId} season={season} seasonType={game.season_type}
                gamePk={currentGamePk} teamAId={game.away_team_id} teamBId={game.home_team_id}
                side="team_b" isLive={isLive}
                fallback={(homeBatting || homePitching) ? <TeamStatsCard abbr={homeAbbr} mlbId={homeMlbId} batting={homeBatting} pitching={homePitching} /> : null}
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
