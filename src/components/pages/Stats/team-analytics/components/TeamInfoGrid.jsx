import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getStreakString, isWinningStreak } from '../utils';

/**
 * Team info grid: Standings, Leaders, and Stats cards
 */
function TeamInfoGrid({
  standingsSectionRef,
  record,
  streak,
  ranks,
  teamSeasonData,
  battingLeaders,
  pitchingLeaders,
  currentBattingStats,
  currentPitchingStats,
  leadersToggle,
  setLeadersToggle,
  teamStatsToggle,
  setTeamStatsToggle,
  selectedTeam,
  selectedSeason,
  handleLeaderClick,
}) {
  const navigate = useNavigate();

  return (
    <div className="team-info-grid" ref={standingsSectionRef}>
      {/* Team Standings */}
      <div className="section-card">
        <div className="card-header">
          <h3>Team Standings</h3>
          <p className="card-subtitle">
            {ranks?.division_rank ? `#${ranks.division_rank} in Division` : teamSeasonData?.team?.division || 'N/A'}
          </p>
        </div>
        <div className="standings-content">
          <div className="standings-row">
            <span className="standings-label">Wins</span>
            <span className="standings-value">{record?.wins || 0}</span>
          </div>
          <div className="standings-row">
            <span className="standings-label">Losses</span>
            <span className="standings-value">{record?.losses || 0}</span>
          </div>
          <div className="standings-row">
            <span className="standings-label">Win %</span>
            <span className="standings-value">{record?.pct?.toFixed(3) || '.000'}</span>
          </div>
          <div className="standings-row">
            <span className="standings-label">Games Back</span>
            <span className="standings-value">
              {record?.games_back === null || record?.games_back === 0 ? '-' : record?.games_back}
            </span>
          </div>
          <div className="standings-row highlight">
            <span className="standings-label">Streak</span>
            <span className={`standings-value streak-badge ${isWinningStreak(streak) ? 'positive' : 'negative'}`}>
              {getStreakString(streak) || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Team Leaders */}
      <div 
        className="section-card clickable-card"
        onClick={() => {
          navigate(`/player-analytics?team=${selectedTeam}&season=${selectedSeason}`);
          window.scrollTo(0, 0);
        }}
        title="View full player analytics"
      >
        <div className="card-header">
          <div>
            <h3>Team Leaders</h3>
            <p className="card-subtitle">Top performers</p>
          </div>
          <div className="toggle-buttons" onClick={(e) => e.stopPropagation()}>
            <button 
              className={`toggle-btn ${leadersToggle === 'batting' ? 'active' : ''}`} 
              onClick={() => setLeadersToggle('batting')}
            >
              Batting
            </button>
            <button 
              className={`toggle-btn ${leadersToggle === 'pitching' ? 'active' : ''}`} 
              onClick={() => setLeadersToggle('pitching')}
            >
              Pitching
            </button>
          </div>
        </div>
        
        {leadersToggle === 'batting' ? (
          battingLeaders ? (
            <div className="leaders-content">
              <LeaderRow 
                leader={battingLeaders.home_runs}
                label="Home Runs"
                formatValue={(val) => val ?? 0}
                onClick={handleLeaderClick}
                isPitching={false}
              />
              <LeaderRow 
                leader={battingLeaders.rbis}
                label="RBI"
                formatValue={(val) => val ?? 0}
                onClick={handleLeaderClick}
                isPitching={false}
              />
              <LeaderRow 
                leader={battingLeaders.avg}
                label="Batting Avg"
                formatValue={(val) => formatAvgValue(val)}
                onClick={handleLeaderClick}
                isPitching={false}
              />
              <LeaderRow 
                leader={battingLeaders.ops}
                label="OPS"
                formatValue={(val) => typeof val === 'number' ? val.toFixed(3) : val || '.000'}
                onClick={handleLeaderClick}
                isPitching={false}
              />
              <LeaderRow 
                leader={battingLeaders.stolen_bases}
                label="Stolen Bases"
                formatValue={(val) => val ?? 0}
                onClick={handleLeaderClick}
                isPitching={false}
              />
            </div>
          ) : (
            <div className="no-data-message">No batting leaders data available</div>
          )
        ) : (
          pitchingLeaders ? (
            <div className="leaders-content">
              <LeaderRow 
                leader={pitchingLeaders.era}
                label="ERA"
                formatValue={(val) => typeof val === 'number' ? val.toFixed(2) : val || '0.00'}
                onClick={handleLeaderClick}
                isPitching={true}
              />
              <LeaderRow 
                leader={pitchingLeaders.strikeouts}
                label="Strikeouts"
                formatValue={(val) => val ?? 0}
                onClick={handleLeaderClick}
                isPitching={true}
              />
              <LeaderRow 
                leader={pitchingLeaders.wins}
                label="Wins"
                formatValue={(val) => val ?? 0}
                onClick={handleLeaderClick}
                isPitching={true}
              />
              <LeaderRow 
                leader={pitchingLeaders.whip}
                label="WHIP"
                formatValue={(val) => typeof val === 'number' ? val.toFixed(2) : val || '0.00'}
                onClick={handleLeaderClick}
                isPitching={true}
              />
              <LeaderRow 
                leader={pitchingLeaders.opponent_avg}
                label="Opp AVG"
                formatValue={(val) => typeof val === 'number' ? val.toFixed(3) : val || '.000'}
                onClick={handleLeaderClick}
                isPitching={true}
              />
            </div>
          ) : (
            <div className="no-data-message">No pitching leaders data available</div>
          )
        )}
      </div>

      {/* Team Stats */}
      <div className="section-card">
        <div className="card-header">
          <div>
            <h3>Team Stats</h3>
            <p className="card-subtitle">Overall performance</p>
          </div>
          <div className="toggle-buttons">
            <button 
              className={`toggle-btn ${teamStatsToggle === 'batting' ? 'active' : ''}`} 
              onClick={() => setTeamStatsToggle('batting')}
            >
              Batting
            </button>
            <button 
              className={`toggle-btn ${teamStatsToggle === 'pitching' ? 'active' : ''}`} 
              onClick={() => setTeamStatsToggle('pitching')}
            >
              Pitching
            </button>
          </div>
        </div>
        
        {teamStatsToggle === 'batting' ? (
          currentBattingStats ? (
            <div className="team-stats-content">
              <div className="team-stat-row">
                <span className="team-stat-label">Team AVG</span>
                <span className="team-stat-value">{currentBattingStats.avg || currentBattingStats.batting_avg || '.000'}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">OPS</span>
                <span className="team-stat-value">{currentBattingStats.ops || '.000'}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">Home Runs</span>
                <span className="team-stat-value">{currentBattingStats.homeruns || currentBattingStats.hr || 0}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">Runs Scored</span>
                <span className="team-stat-value">{currentBattingStats.runs || currentBattingStats.r || 0}</span>
              </div>
              <div className="team-stat-row highlight">
                <span className="team-stat-label">MLB Hitting Rank</span>
                <span className="team-stat-value rank-value">
                  #{currentBattingStats.mlb_hitting_rank || '-'}
                </span>
              </div>
            </div>
          ) : (
            <div className="no-data-message">No batting stats available</div>
          )
        ) : (
          currentPitchingStats ? (
            <div className="team-stats-content">
              <div className="team-stat-row">
                <span className="team-stat-label">Team ERA</span>
                <span className="team-stat-value">{currentPitchingStats.era || '0.00'}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">WHIP</span>
                <span className="team-stat-value">{currentPitchingStats.whip || '0.00'}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">Strikeouts</span>
                <span className="team-stat-value">{currentPitchingStats.strikeouts || currentPitchingStats.so || 0}</span>
              </div>
              <div className="team-stat-row">
                <span className="team-stat-label">Opp AVG</span>
                <span className="team-stat-value">{currentPitchingStats.opp_avg || currentPitchingStats.avg || '.000'}</span>
              </div>
              <div className="team-stat-row highlight">
                <span className="team-stat-label">MLB Pitching Rank</span>
                <span className="team-stat-value rank-value">
                  #{currentPitchingStats.mlb_pitching_rank || '-'}
                </span>
              </div>
            </div>
          ) : (
            <div className="no-data-message">No pitching stats available</div>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Helper: Format avg value
 */
function formatAvgValue(val) {
  if (!val) return '.000';
  if (typeof val === 'number' && val < 1) return val.toFixed(3);
  return val;
}

/**
 * Leader row component
 */
function LeaderRow({ leader, label, formatValue, onClick, isPitching }) {
  return (
    <div 
      className="leader-row clickable" 
      onClick={(e) => { e.stopPropagation(); onClick(leader, isPitching); }}
      title={`View ${leader?.player_name || 'player'} profile`}
    >
      <span className="leader-player">{leader?.player_name || 'N/A'}</span>
      <div className="leader-info">
        <span className="leader-stat-label">{label}</span>
        <span className="leader-value">{formatValue(leader?.value)}</span>
      </div>
    </div>
  );
}

export default TeamInfoGrid;
