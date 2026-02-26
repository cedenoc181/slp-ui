import { Link } from 'react-router-dom';
import { DEFAULT_SEASON } from '../../../../data/constants/apiConstants';
import { useMatchupData } from './hooks';
import { getMlbId, getAbbr, getUrlName, aggregatePlayers, formGames } from './utils';
import {
  MatchupHero,
  BoxScoreCard,
  PitchersSection,
  LineupCard,
  TeamStatsCard,
  RecentFormCard,
  HeadToHeadSection,
} from './components';

export default function MatchupDetail() {
  const {
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
  } = useMatchupData();

  if (loading) {
    return (
      <div className="matchup-detail-page">
        <div className="container">
          <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
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
          <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>
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
  const isFinal     = statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed';
  const isLive      = statusLower.includes('progress') || statusLower === 'live' || statusLower.includes('inning');
  const isScheduled = !isFinal && !isLive;

  const awayWon = game.winning_team_id === game.away_team_id;
  const homeWon = game.winning_team_id === game.home_team_id;

  const awaySPMlbId = awaySPInfo?.player_mlb_id ?? game.away_sp_mlb_id ?? null;
  const homeSPMlbId = homeSPInfo?.player_mlb_id ?? game.home_sp_mlb_id ?? null;

  const hasSP     = game.away_sp_name || game.home_sp_name;
  const hasLast10 = awayLast10.length > 0 || homeLast10.length > 0 || awayLast10Summary != null || homeLast10Summary != null;
  const hasH2h    = h2h?.summary != null && Array.isArray(h2h?.games) && h2h.games.length > 0;

  // H2H lineup data — aggregate per-player across all games
  const awayBatters  = aggregatePlayers(h2hBatters?.games,  'team_a');
  const homeBatters  = aggregatePlayers(h2hBatters?.games,  'team_b');
  const awayPitchers = aggregatePlayers(h2hPitchers?.games, 'team_a');
  const homePitchers = aggregatePlayers(h2hPitchers?.games, 'team_b');
  const hasLineup    = awayBatters.length > 0 || homeBatters.length > 0 || awayPitchers.length > 0 || homePitchers.length > 0;
  const hasTeamStats = !!(awayBatting || homeBatting || awayPitching || homePitching);

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

  return (
    <div className="matchup-detail-page">
      <div className="container">
        <Link to="/mlb-schedule" className="back-link">‹ Back to Schedule</Link>

        <MatchupHero
          game={game}
          awayMlbId={awayMlbId}       homeMlbId={homeMlbId}
          awayAbbr={awayAbbr}         homeAbbr={homeAbbr}
          awayUrlName={awayUrlName}   homeUrlName={homeUrlName}
          awaySeasonRecord={awaySeasonRecord} homeSeasonRecord={homeSeasonRecord}
          isFinal={isFinal} isLive={isLive} isScheduled={isScheduled}
          awayWon={awayWon} homeWon={homeWon}
        />

        {(isFinal || isLive) && game.home_runs_score != null && (
          <BoxScoreCard
            game={game}
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

          {/* Away: Team Stats (scheduled) or H2H Lineup (final / live) */}
          {isScheduled
            ? (hasTeamStats && <TeamStatsCard abbr={awayAbbr} batting={awayBatting} pitching={awayPitching} />)
            : (hasLineup    && <LineupCard    abbr={awayAbbr} batters={awayBatters}  pitchers={awayPitchers} />)
          }

          {hasLast10 && (
            <RecentFormCard
              awayAbbr={awayAbbr}     homeAbbr={homeAbbr}
              awayGames={awayGames}   homeGames={homeGames}
              awayForm={awayForm}     homeForm={homeForm}
              awayWins={awayWins}     awayLosses={awayLosses}
              homeWins={homeWins}     homeLosses={homeLosses}
              awayLast10Summary={awayLast10Summary} homeLast10Summary={homeLast10Summary}
            />
          )}

          {/* Home: Team Stats (scheduled) or H2H Lineup (final / live) */}
          {isScheduled
            ? (hasTeamStats && <TeamStatsCard abbr={homeAbbr} batting={homeBatting} pitching={homePitching} />)
            : (hasLineup    && <LineupCard    abbr={homeAbbr} batters={homeBatters}  pitchers={homePitchers} />)
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
