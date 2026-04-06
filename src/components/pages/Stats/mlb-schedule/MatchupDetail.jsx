import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { DEFAULT_SEASON } from '../../../../data/constants/apiConstants';
import { useAuth } from '../../../../context/AuthContext';
import { useMatchupData, useEarliestGameLabel, useScoutAiGate } from './hooks';
import '../../../../styles/stats-page-styling/matchup-analysis.css';
import '../../../../styles/stats-page-styling/scout-ai.css';
import { getMlbId, getAbbr, getUrlName, formGames } from './utils';
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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { label: scoutUnlockLabel, isUnlocked: scoutUnlocked } = useEarliestGameLabel();
  const [scoutAnalysis, setScoutAnalysis]   = useState(null);
  const [scoutLoading, setScoutLoading]     = useState(false);
  const [scoutError, setScoutError]         = useState(null);
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [scoutGeneratedAt, setScoutGeneratedAt] = useState(null);

  // Stable ref so useScoutAiGate (called unconditionally at top) can invoke the real handler
  const scoutAllowedRef = useRef(null);
  const stableScoutAllowed = useCallback(() => { scoutAllowedRef.current?.(); }, []);
  const { usesRemaining, isLimitHit, gatedClick: handleScoutClick } = useScoutAiGate(stableScoutAllowed);

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
    const loadingAwayMlbId = game ? getMlbId(game.away_team_id) : null;
    const loadingHomeMlbId = game ? getMlbId(game.home_team_id) : null;
    const loadingAwayAbbr  = game ? (getAbbr(game.away_team_id) || game.away_team_name) : null;
    const loadingHomeAbbr  = game ? (getAbbr(game.home_team_id) || game.home_team_name) : null;

    return (
      <div className="matchup-detail-page">
        <div className="container">
          <div className="matchup-detail-top-nav">
            <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
          </div>

          {/* Hero skeleton */}
          <div className="detail-hero" style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '1.5rem 0 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className="detail-skeleton" style={{ width: 120, height: 12, borderRadius: 6 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', width: '100%', justifyContent: 'center' }}>
                {/* Away team */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  {loadingAwayMlbId
                    ? <img src={`https://www.mlbstatic.com/team-logos/${loadingAwayMlbId}.svg`} alt={loadingAwayAbbr} style={{ width: 64, height: 64, objectFit: 'contain' }} />
                    : <div className="detail-skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
                  }
                  {loadingAwayAbbr
                    ? <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>{loadingAwayAbbr}</span>
                    : <div className="detail-skeleton" style={{ width: 56, height: 12, borderRadius: 6 }} />
                  }
                </div>
                <div className="detail-skeleton" style={{ width: 40, height: 18, borderRadius: 6 }} />
                {/* Home team */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  {loadingHomeMlbId
                    ? <img src={`https://www.mlbstatic.com/team-logos/${loadingHomeMlbId}.svg`} alt={loadingHomeAbbr} style={{ width: 64, height: 64, objectFit: 'contain' }} />
                    : <div className="detail-skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
                  }
                  {loadingHomeAbbr
                    ? <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>{loadingHomeAbbr}</span>
                    : <div className="detail-skeleton" style={{ width: 56, height: 12, borderRadius: 6 }} />
                  }
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                {[80, 60, 70].map((w, i) => (
                  <div key={i} className="detail-skeleton" style={{ width: w, height: 10, borderRadius: 5 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Grid skeletons */}
          <div className="detail-grid">
            {/* Pitchers card — full width */}
            <div className="detail-card detail-card-full" style={{ padding: '1rem 1.25rem' }}>
              <div className="detail-skeleton" style={{ width: 100, height: 11, borderRadius: 5, marginBottom: '1rem' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="detail-skeleton" style={{ width: 48, height: 48, borderRadius: '50%', marginBottom: '0.25rem' }} />
                    {[90, 70, 60, 75].map((w, j) => (
                      <div key={j} className="detail-skeleton" style={{ width: `${w}%`, height: 10, borderRadius: 5 }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Team stats card */}
            <div className="detail-card" style={{ padding: '1rem 1.25rem' }}>
              <div className="detail-skeleton" style={{ width: 80, height: 11, borderRadius: 5, marginBottom: '1rem' }} />
              {[100, 80, 90, 70, 85, 60].map((w, i) => (
                <div key={i} className="detail-skeleton" style={{ width: `${w}%`, height: 10, borderRadius: 5, marginBottom: '0.5rem' }} />
              ))}
            </div>

            {/* Recent form card */}
            <div className="detail-card" style={{ padding: '1rem 1.25rem' }}>
              <div className="detail-skeleton" style={{ width: 100, height: 11, borderRadius: 5, marginBottom: '1rem' }} />
              {[0, 1].map(i => (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <div className="detail-skeleton" style={{ width: 60, height: 10, borderRadius: 5, marginBottom: '0.5rem' }} />
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="detail-skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Team stats card 2 */}
            <div className="detail-card" style={{ padding: '1rem 1.25rem' }}>
              <div className="detail-skeleton" style={{ width: 80, height: 11, borderRadius: 5, marginBottom: '1rem' }} />
              {[100, 80, 90, 70, 85, 60].map((w, i) => (
                <div key={i} className="detail-skeleton" style={{ width: `${w}%`, height: 10, borderRadius: 5, marginBottom: '0.5rem' }} />
              ))}
            </div>
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

  return (
    <div className="matchup-detail-page">
      <div className="container">
        <div className="matchup-detail-top-nav">
          <Link to="/mlb-schedule" className="back-link">‹ <span className="nav-full">Back to Schedule</span><span className="nav-short">Back</span></Link>
          <div className="matchup-detail-top-nav__center matchup-detail-top-nav__scout">
            <ScoutAiButton
              hasAnalysis={!!scoutAnalysis}
              loading={scoutLoading}
              onClick={handleScoutClick}
              isToday={game?.date === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())}
              scoutAiAvailable={scoutUnlocked}
              pendingLabel={scoutUnlockLabel}
              usesRemaining={usesRemaining}
              isLimitHit={isLimitHit}
            />
          </div>
          <div className="matchup-detail-top-nav__right">
            {isAuthenticated ? (
              <Link
                to={`/mlb-schedule/${currentGamePk}/analysis`}
                state={{ game, prediction }}
                className="deep-dive-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                <span className="nav-full">Advanced Analysis</span><span className="nav-short">Analysis</span>
              </Link>
            ) : (
              <button
                className="deep-dive-btn deep-dive-btn--locked"
                onClick={() => navigate('/account', { state: { from: location } })}
                data-tooltip="Sign in for access"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="nav-full">Advanced Analysis</span><span className="nav-short">Analysis</span>
              </button>
            )}
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
