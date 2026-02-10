import React from 'react';
import { Link } from 'react-router-dom';
import { 
  getFilteredRoster, 
  getRosterCounts,
  getInjuriesForTimeframe,
  isStillInjured,
  getInjuryCounts,
  getInjuryPeriodLabel,
  sortInjuries,
} from '../utils';

/**
 * Roster and Injury section component
 */
function RosterInjurySection({
  roster,
  rosterFilter,
  setRosterFilter,
  selectedSeason,
  injuriesFullSeason,
  timeframe,
  injuryFilter,
  setInjuryFilter,
}) {
  const filteredRoster = getFilteredRoster(roster, rosterFilter);
  const rosterCounts = getRosterCounts(roster);
  const injuries = getInjuriesForTimeframe(injuriesFullSeason?.injuries, timeframe);
  const injuryCounts = getInjuryCounts(injuries, (injury) => isStillInjured(injury));
  const sortedInjuries = sortInjuries(injuries, injuryFilter, (injury) => isStillInjured(injury));

  return (
    <div className="roster-injury-section">
      {/* Team Roster */}
      <div className="section-card roster-card">
        <div className="card-header">
          <div>
            <h3>Team Roster</h3>
            <p className="card-subtitle">
              {rosterFilter === 'all' && `${rosterCounts.total} Active Players`}
              {rosterFilter === 'pitchers' && `${rosterCounts.pitchers} Pitchers`}
              {rosterFilter === 'position' && `${rosterCounts.position} Position Players`}
            </p>
          </div>
          <div className="toggle-buttons">
            <button 
              className={`toggle-btn ${rosterFilter === 'all' ? 'active' : ''}`} 
              onClick={() => setRosterFilter('all')}
            >
              All
            </button>
            <button 
              className={`toggle-btn ${rosterFilter === 'pitchers' ? 'active' : ''}`} 
              onClick={() => setRosterFilter('pitchers')}
            >
              Pitchers
            </button>
            <button 
              className={`toggle-btn ${rosterFilter === 'position' ? 'active' : ''}`} 
              onClick={() => setRosterFilter('position')}
            >
              Position
            </button>
          </div>
        </div>
        <div className="roster-table-container">
          {filteredRoster && filteredRoster.length > 0 ? (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Position</th>
                  <th>B/T</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((player, idx) => {
                  const playerSlug = player.name_slug || player.player_mlb_id;
                  return (
                    <tr key={player.id || idx}>
                      <td className="player-number">{player.jersey_number || '-'}</td>
                      <td className="player-name">
                        {playerSlug ? (
                          <Link 
                            to={`/player/${playerSlug}?season=${selectedSeason}`} 
                            className="player-profile-link"
                            onClick={() => window.scrollTo(0, 0)}
                          >
                            {player.player_name || player.full_name || 'Unknown'}
                          </Link>
                        ) : (
                          player.player_name || player.full_name || 'Unknown'
                        )}
                      </td>
                      <td className="player-position">
                        <span className="position-badge">
                          {player.position_abbreviation || player.position || '-'}
                        </span>
                      </td>
                      <td className="player-hands">
                        {player.bats || '-'}/{player.throws || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="no-data-message">
              {rosterFilter === 'all' && 'No roster data available'}
              {rosterFilter === 'pitchers' && 'No pitchers found'}
              {rosterFilter === 'position' && 'No position players found'}
            </div>
          )}
        </div>
      </div>

      {/* Team Injury List */}
      <div className="section-card injury-card">
        <div className="card-header">
          <div>
            <h3>Injury Report</h3>
            <p className="card-subtitle">
              {timeframe === 'season' && (
                <><strong>📊 Full Season:</strong> {injuryCounts.total} {injuryCounts.total === 1 ? 'Injury' : 'Injuries'}</>
              )}
              {timeframe === 'first-half' && (
                <><strong>1️⃣ First Half:</strong> {injuryCounts.total} {injuryCounts.total === 1 ? 'Injury' : 'Injuries'}</>
              )}
              {timeframe === 'second-half' && (
                <><strong>2️⃣ Second Half:</strong> {injuryCounts.total} {injuryCounts.total === 1 ? 'Injury' : 'Injuries'}</>
              )}
            </p>
          </div>
          {injuryCounts.total > 0 && (
            <div className="injury-summary-badges">
              <button 
                className={`injury-badge current ${injuryFilter === 'active' ? 'active-filter' : ''}`} 
                title="Show active injuries first"
                onClick={() => setInjuryFilter(injuryFilter === 'active' ? 'all' : 'active')}
              >
                🏥 {injuryCounts.current} Active
              </button>
              <button 
                className={`injury-badge returned ${injuryFilter === 'returned' ? 'active-filter' : ''}`} 
                title="Show returned injuries first"
                onClick={() => setInjuryFilter(injuryFilter === 'returned' ? 'all' : 'returned')}
              >
                ✅ {injuryCounts.returned} Returned
              </button>
            </div>
          )}
        </div>
        <div className="injury-list">
          {sortedInjuries.length > 0 ? (
            sortedInjuries.map((injury, idx) => {
              const stillInjured = isStillInjured(injury);
              return (
                <div key={idx} className={`injury-item ${stillInjured ? 'active' : 'returned'}`}>
                  <div className="injury-player-info">
                    <div className="injury-player-name">{injury.player_name || injury.name}</div>
                    <div className="injury-position">{injury.position}</div>
                  </div>
                  <div className="injury-details">
                    <div className="injury-type">{injury.injury_desc || 'No description'}</div>
                    <div className="injury-dates">
                      <span className="injury-date-label">IL Date:</span>
                      <span className="injury-date">
                        {injury.injury_date 
                          ? new Date(injury.injury_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                          : 'N/A'}
                      </span>
                      {injury.activation_date && !stillInjured && (
                        <>
                          <span className="injury-date-label">Returned:</span>
                          <span className="injury-date returned">
                            {new Date(injury.activation_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                      {stillInjured && injury.expected_return_date && (
                        <>
                          <span className="injury-date-label">Expected:</span>
                          <span className="injury-date expected">
                            {new Date(injury.expected_return_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="injury-status-row">
                      <span className={`injury-status ${injury.injury_period?.includes('60') ? 'long-term' : 'short-term'}`}>
                        {injury.injury_period || 'IL'}
                      </span>
                      {injury.days_on_il !== undefined && (
                        <span className="injury-days">{injury.days_on_il} days</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-injuries">
              <span className="no-injuries-icon">✅</span>
              <p>No injuries recorded for {getInjuryPeriodLabel(timeframe).toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RosterInjurySection;
