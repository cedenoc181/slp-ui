import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../../styles/stats-page-styling/mlb-standings.css';
import teamsService from '../../../../data/services/teamsService';
import { TEAM_METADATA, SEASONS, DEFAULT_SEASON, SEASON_RANGE } from '../../../../data/constants/apiConstants';
import MLBStandingsPostseason from './mlbStandingsPostseason';
import MLBStandingsSpringTraining from './mlbStandingsSpringTraning';

function MLBStandings() {
  const [selectedLeague, setSelectedLeague] = useState('AL'); // 'AL' or 'NL' for regular, 'Cactus' or 'Grapefruit' for spring
  const [selectedSeason, setSelectedSeason] = useState(DEFAULT_SEASON);
  const [seasonType, setSeasonType] = useState('regular'); // 'regular', 'postseason', 'spring'
  const [standingsData, setStandingsData] = useState(null);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState(null);
  const [fallbackSeason, setFallbackSeason] = useState(null); // Set when selected season has no data
  const navigate = useNavigate();

  // Available seasons - driven by SEASON_RANGE in apiConstants
  const availableSeasons = SEASONS;

  // LocalStorage key for storing previous rankings
  const getStorageKey = (season) => `mlb-power-rankings-${season}`;
  const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  // Load previous rankings from localStorage
  const loadPreviousRankings = (season) => {
    try {
      const stored = localStorage.getItem(getStorageKey(season));
      if (stored) {
        const data = JSON.parse(stored);
        // Check if data has the new format with timestamp
        if (data.timestamp && data.rankings) {
          return data;
        }
        // Legacy format - just rankings array, treat as expired
        return { rankings: data, timestamp: 0 };
      }
    } catch (error) {
      console.error('Error loading previous rankings:', error);
    }
    return null;
  };

  // Save current rankings to localStorage with timestamp
  const saveCurrentRankings = (season, rankings) => {
    try {
      const data = {
        rankings: rankings,
        timestamp: Date.now(),
      };
      localStorage.setItem(getStorageKey(season), JSON.stringify(data));
    } catch (error) {
      console.error('Error saving rankings:', error);
    }
  };

  // Check if stored rankings are older than a week
  const isSnapshotExpired = (timestamp) => {
    return Date.now() - timestamp > WEEK_IN_MS;
  };

  // Check if API response has actual standings data
  const hasStandingsData = (data) => {
    return data && Object.keys(data).length > 0 && Object.values(data).some(div => div && div.length > 0);
  };

  // Fetch standings data when season changes
  useEffect(() => {
    const fetchStandings = async () => {
      if (seasonType !== 'regular') return; // Only fetch for regular season

      setStandingsLoading(true);
      setStandingsError(null);
      setFallbackSeason(null);

      try {
        let data = await teamsService.getTeamRegularSeasonStandings(selectedSeason);
        let seasonUsed = selectedSeason;

        // If no data for selected season, fall back to the prior year
        if (!hasStandingsData(data)) {
          const prevYear = String(parseInt(selectedSeason) - 1);
          const fallbackData = await teamsService.getTeamRegularSeasonStandings(prevYear);
          if (hasStandingsData(fallbackData)) {
            data = fallbackData;
            seasonUsed = prevYear;
            setFallbackSeason(prevYear);
          }
        }

        // Before setting new data, check if we should update the "last week" snapshot
        const storedData = loadPreviousRankings(seasonUsed);

        if (data) {
          const newRankings = Object.values(data).flat();
          const rankingsToSave = newRankings.map(team => ({
            mlbTeamId: team.mlb_team_id,
            rank: team.mlb_rank,
            leagueRank: team.league_rank,
          }));

          if (!storedData) {
            saveCurrentRankings(seasonUsed, rankingsToSave);
          } else if (isSnapshotExpired(storedData.timestamp)) {
            saveCurrentRankings(seasonUsed, rankingsToSave);
          }
        }

        setStandingsData(data);
      } catch (error) {
        console.error('Error fetching standings:', error);
        setStandingsError('Failed to load standings data');
        setStandingsData(null);
      } finally {
        setStandingsLoading(false);
      }
    };

    fetchStandings();
  }, [selectedSeason, seasonType]);

  // Transform API data to display format for a league
  const currentLeagueData = useMemo(() => {
    if (!standingsData) return null;

    const leaguePrefix = selectedLeague === 'AL' ? 'AL' : 'NL';

    // Get division data
    const eastData = standingsData[`${leaguePrefix} East`] || [];
    const centralData = standingsData[`${leaguePrefix} Central`] || [];
    const westData = standingsData[`${leaguePrefix} West`] || [];

    // Transform team data to match expected format
    const transformTeam = (team) => ({
      rank: team.division_rank,
      team: team.team_name,
      teamAbbreviation: team.team_abbreviation,
      mlbTeamId: team.mlb_team_id,
      wins: team.wins,
      losses: team.losses,
      pct: team.w_l_pct,
      gb: team.games_back === null ? '-' : team.games_back.toString(),
      streak: team.streak_code,
      home: '-', // API doesn't provide home/away records
      away: '-',
      last10: `${team.last_ten_wins}-${team.last_ten_losses}`,
      clinchIndicator: team.clinch_indicator,
      wildCardRank: team.wild_card_rank,
      wcgb: team.wc_games_back,
      runDifferential: team.run_differential,
    });

    // Build wild card standings from all teams in the league
    const allLeagueTeams = [...eastData, ...centralData, ...westData]
      .map(transformTeam)
      .filter(team => team.wildCardRank !== null) // Only teams with wild card rank
      .sort((a, b) => a.wildCardRank - b.wildCardRank);

    // Format wild card GB display
    const wildCardTeams = allLeagueTeams.map((team, index) => ({
      ...team,
      rank: index + 1,
      wcgb: team.wcgb === null 
        ? (index < 3 ? '+0' : '-') 
        : (team.wcgb > 0 ? `-${team.wcgb}` : `+${Math.abs(team.wcgb)}`)
    }));

    return {
      East: eastData.map(transformTeam).sort((a, b) => a.rank - b.rank),
      Central: centralData.map(transformTeam).sort((a, b) => a.rank - b.rank),
      West: westData.map(transformTeam).sort((a, b) => a.rank - b.rank),
      wildCard: wildCardTeams.slice(0, 8), // Show top 8 wild card contenders
    };
  }, [standingsData, selectedLeague]);

  // Build power rankings from all teams sorted by MLB rank
  const powerRankings = useMemo(() => {
    if (!standingsData) return [];

    // Load previous rankings from localStorage
    const storedData = loadPreviousRankings(selectedSeason);
    const previousRankings = storedData?.rankings || null;

    const allTeams = Object.values(standingsData)
      .flat()
      .map(team => {
        const currentRank = team.mlb_rank;
        // Look up previous rank for this team
        const previousData = previousRankings?.find(
          t => t.mlbTeamId === team.mlb_team_id
        );
        const lastWeek = previousData?.rank ?? currentRank;
        
        // Determine trend: up if rank improved (lower number), down if worse
        let trend = '→';
        if (lastWeek > currentRank) trend = '↑'; // Moved up (rank decreased)
        else if (lastWeek < currentRank) trend = '↓'; // Moved down (rank increased)

        return {
          rank: currentRank,
          team: team.team_name,
          teamAbbreviation: team.team_abbreviation,
          mlbTeamId: team.mlb_team_id,
          league: team.league_name === 'American League' ? 'AL' : 'NL',
          record: `${team.wins}-${team.losses}`,
          lastWeek: lastWeek,
          trend: trend,
          runDifferential: team.run_differential,
        };
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10);

    return allTeams;
  }, [standingsData, selectedSeason]);

  // Filter power rankings by selected league and get top 5 with sequential 1-5 ranking
  // Uses league_rank from API which ranks teams within their respective league (AL or NL)
  const leaguePowerRankings = useMemo(() => {
    if (!standingsData) return [];

    // Load previous rankings from localStorage
    const storedData = loadPreviousRankings(selectedSeason);
    const previousRankings = storedData?.rankings || null;

    return Object.values(standingsData)
      .flat()
      .filter(team => {
        const league = team.league_name === 'American League' ? 'AL' : 'NL';
        return league === selectedLeague;
      })
      .sort((a, b) => a.league_rank - b.league_rank)
      .slice(0, 5)
      .map((team) => {
        const previousData = previousRankings?.find(
          t => t.mlbTeamId === team.mlb_team_id
        );
        const lastWeekLeagueRank = previousData?.leagueRank ?? team.league_rank;
        
        let trend = '→';
        if (lastWeekLeagueRank > team.league_rank) trend = '↑';
        else if (lastWeekLeagueRank < team.league_rank) trend = '↓';

        return {
          leagueRank: team.league_rank,
          rank: team.mlb_rank,
          team: team.team_name,
          teamAbbreviation: team.team_abbreviation,
          mlbTeamId: team.mlb_team_id,
          league: selectedLeague,
          record: `${team.wins}-${team.losses}`,
          lastWeek: lastWeekLeagueRank,
          trend: trend,
          runDifferential: team.run_differential,
        };
      });
  }, [standingsData, selectedSeason, selectedLeague]);

  // Helper function to get URL-friendly team name from abbreviation
  const getTeamUrlFromAbbr = (teamAbbreviation) => {
    return TEAM_METADATA[teamAbbreviation]?.urlName || teamAbbreviation.toLowerCase();
  };

  // Handle team click navigation - includes season as query parameter
  const handleTeamClick = (e, teamAbbreviation) => {
    const urlName = getTeamUrlFromAbbr(teamAbbreviation);
    navigate(`/team-analytics/${urlName}?season=${selectedSeason}`);
    window.scrollTo(0, 0);
  };

  // Handle season type change
  const handleSeasonTypeChange = (type) => {
    setSeasonType(type);

    // Reset league selection and season based on season type
    if (type === 'spring') {
      setSelectedLeague('Cactus');
      setSelectedSeason(String(SEASON_RANGE.END)); // Spring training defaults to current year
    } else if (type === 'postseason') {
      setSelectedLeague('Playoff');
      setSelectedSeason(DEFAULT_SEASON);
    } else {
      setSelectedLeague('AL');
      setSelectedSeason(DEFAULT_SEASON);
    }
  };

  // Get league display name based on season type
  const getLeagueDisplayName = () => {
    if (seasonType === 'spring') {
      return selectedLeague === 'Cactus' ? 'Cactus League' : 'Grapefruit League';
    } else if (seasonType === 'postseason') {
      return 'Playoff Bracket';
    } else {
      return selectedLeague === 'AL' ? 'American League' : 'National League';
    }
  };

  return (
    <div className="mlb-standings-page">
      {/* Header Section */}
      <div className="standings-header">
        <div className="container">
          <h1>MLB Standings</h1>
          <p className="header-subtitle">
            {seasonType === 'regular' ? 'Regular Season' : 
             seasonType === 'postseason' ? 'Postseason' : 
             'Spring Training'} Standings & Rankings
          </p>
          
          {/* Season Selector */}
          <div className="season-selector">
            <div className="season-tabs">
              {/* Year Dropdown */}
              <div className="season-dropdown-wrapper">
                <select
                  className="season-dropdown"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                >
                  {availableSeasons.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>

              {/* Season Type Dropdown */}
              <div className="season-type-wrapper">
                <select
                  className="season-type-dropdown"
                  value={seasonType}
                  onChange={(e) => handleSeasonTypeChange(e.target.value)}
                >
                  <option value="regular">Regular Season</option>
                  <option value="postseason">Postseason</option>
                  <option value="spring">Spring Training</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic League Toggle */}
          {seasonType === 'postseason' ? (
            // Single Playoff Bracket Button
            <div className="league-toggle playoff-mode">
              <button className="league-btn active playoff-btn">
                🏆 Playoff Bracket
              </button>
            </div>
          ) : seasonType === 'spring' ? (
            // Spring Training League Toggle
            <div className="league-toggle spring-mode">
              <button 
                className={`league-btn ${selectedLeague === 'Cactus' ? 'active' : ''}`}
                onClick={() => setSelectedLeague('Cactus')}
              >
                🌵 Cactus League
              </button>
              <button 
                className={`league-btn ${selectedLeague === 'Grapefruit' ? 'active' : ''}`}
                onClick={() => setSelectedLeague('Grapefruit')}
              >
                🍊 Grapefruit League
              </button>
            </div>
          ) : (
            // Regular Season League Toggle
            <div className="league-toggle">
              <button 
                className={`league-btn ${selectedLeague === 'AL' ? 'active' : ''}`}
                onClick={() => setSelectedLeague('AL')}
              >
                American League
              </button>
              <button 
                className={`league-btn ${selectedLeague === 'NL' ? 'active' : ''}`}
                onClick={() => setSelectedLeague('NL')}
              >
                National League
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Conditional Rendering Based on Season Type */}
      <div className="standings-content container">
        {seasonType === 'postseason' ? (
          // Render Playoff Bracket
          <MLBStandingsPostseason selectedSeason={selectedSeason} />
        ) : seasonType === 'spring' ? (
          // Render Spring Training
          <MLBStandingsSpringTraining 
            selectedSeason={selectedSeason} 
            selectedLeague={selectedLeague}
          />
        ) : (
          // Render Regular Season Standings
          <>
            {/* Fallback Notice */}
            {fallbackSeason && (
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '8px', padding: '10px 16px', marginBottom: '12px', fontSize: '14px', color: '#7c5a00' }}>
                No data available for the {selectedSeason} season yet. Showing {fallbackSeason} standings.
              </div>
            )}

            {/* Season Display Banner */}
            <div className="season-banner">
              <span className="season-year">{fallbackSeason || selectedSeason} Season</span>
              <span className="season-league">
                {getLeagueDisplayName()} • Regular Season
              </span>
            </div>

            {/* Loading State */}
            {standingsLoading && (
              <div className="standings-loading">
                <div className="loading-spinner"></div>
                <span>Loading standings...</span>
              </div>
            )}

            {/* Error State */}
            {standingsError && !standingsLoading && (
              <div className="standings-error">
                <span>{standingsError}</span>
              </div>
            )}

            {/* Division Standings Grid */}
            {!standingsLoading && !standingsError && currentLeagueData && (
            <div className="divisions-grid">
              {/* East Division */}
              <div className="division-card">
                <div className="division-header">
                  <h3>{selectedLeague} East</h3>
                  <span className="division-badge">Division</span>
                </div>
                <div className="standings-table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="rank-col">#</th>
                        <th className="team-col">Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PCT</th>
                        <th>GB</th>
                        <th>STRK</th>
                        <th className="hide-mobile">L10</th>
                        <th className="hide-mobile">DIFF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeagueData.East.map((team) => (
                        <tr 
                          key={team.rank} 
                          className={`${team.rank === 1 ? 'division-leader' : ''} clickable-row`}
                          onClick={(e) => handleTeamClick(e, team.teamAbbreviation)} onAuxClick={(e) => handleTeamClick(e, team.teamAbbreviation)}
                        >
                          <td className="rank-col">{team.rank}</td>
                          <td className="team-col">
                            <img 
                              src={`https://www.mlbstatic.com/team-logos/${team.mlbTeamId}.svg`}
                              alt={team.team}
                              className="team-logo-img"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            {team.team}
                            {team.clinchIndicator && team.clinchIndicator !== 'false' && (
                              <span className="clinch-badge">{team.clinchIndicator}</span>
                            )}
                          </td>
                          <td className="wins">{team.wins}</td>
                          <td className="losses">{team.losses}</td>
                          <td className="pct">{team.pct.toFixed(3)}</td>
                          <td className="gb">{team.gb}</td>
                          <td className={`streak ${team.streak?.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                            {team.streak ?? '-'}
                          </td>
                          <td className="hide-mobile">{team.last10}</td>
                          <td className={`hide-mobile ${team.runDifferential >= 0 ? 'positive-diff' : 'negative-diff'}`}>
                            {team.runDifferential >= 0 ? '+' : ''}{team.runDifferential}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Central Division */}
              <div className="division-card">
                <div className="division-header">
                  <h3>{selectedLeague} Central</h3>
                  <span className="division-badge">Division</span>
                </div>
                <div className="standings-table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="rank-col">#</th>
                        <th className="team-col">Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PCT</th>
                        <th>GB</th>
                        <th>STRK</th>
                        <th className="hide-mobile">L10</th>
                        <th className="hide-mobile">DIFF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeagueData.Central.map((team) => (
                        <tr 
                          key={team.rank} 
                          className={`${team.rank === 1 ? 'division-leader' : ''} clickable-row`}
                          onClick={(e) => handleTeamClick(e, team.teamAbbreviation)} onAuxClick={(e) => handleTeamClick(e, team.teamAbbreviation)}
                        >
                          <td className="rank-col">{team.rank}</td>
                          <td className="team-col">
                            <img 
                              src={`https://www.mlbstatic.com/team-logos/${team.mlbTeamId}.svg`}
                              alt={team.team}
                              className="team-logo-img"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            {team.team}
                            {team.clinchIndicator && team.clinchIndicator !== 'false' && (
                              <span className="clinch-badge">{team.clinchIndicator}</span>
                            )}
                          </td>
                          <td className="wins">{team.wins}</td>
                          <td className="losses">{team.losses}</td>
                          <td className="pct">{team.pct.toFixed(3)}</td>
                          <td className="gb">{team.gb}</td>
                          <td className={`streak ${team.streak?.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                            {team.streak ?? '-'}
                          </td>
                          <td className="hide-mobile">{team.last10}</td>
                          <td className={`hide-mobile ${team.runDifferential >= 0 ? 'positive-diff' : 'negative-diff'}`}>
                            {team.runDifferential >= 0 ? '+' : ''}{team.runDifferential}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* West Division */}
              <div className="division-card">
                <div className="division-header">
                  <h3>{selectedLeague} West</h3>
                  <span className="division-badge">Division</span>
                </div>
                <div className="standings-table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="rank-col">#</th>
                        <th className="team-col">Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PCT</th>
                        <th>GB</th>
                        <th>STRK</th>
                        <th className="hide-mobile">L10</th>
                        <th className="hide-mobile">DIFF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeagueData.West.map((team) => (
                        <tr 
                          key={team.rank} 
                          className={`${team.rank === 1 ? 'division-leader' : ''} clickable-row`}
                          onClick={(e) => handleTeamClick(e, team.teamAbbreviation)} onAuxClick={(e) => handleTeamClick(e, team.teamAbbreviation)}
                        >
                          <td className="rank-col">{team.rank}</td>
                          <td className="team-col">
                            <img 
                              src={`https://www.mlbstatic.com/team-logos/${team.mlbTeamId}.svg`}
                              alt={team.team}
                              className="team-logo-img"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            {team.team}
                            {team.clinchIndicator && team.clinchIndicator !== 'false' && (
                              <span className="clinch-badge">{team.clinchIndicator}</span>
                            )}
                          </td>
                          <td className="wins">{team.wins}</td>
                          <td className="losses">{team.losses}</td>
                          <td className="pct">{team.pct.toFixed(3)}</td>
                          <td className="gb">{team.gb}</td>
                          <td className={`streak ${team.streak?.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                            {team.streak ?? '-'}
                          </td>
                          <td className="hide-mobile">{team.last10}</td>
                          <td className={`hide-mobile ${team.runDifferential >= 0 ? 'positive-diff' : 'negative-diff'}`}>
                            {team.runDifferential >= 0 ? '+' : ''}{team.runDifferential}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}

            {/* Wild Card and League Power Rankings Grid */}
            {!standingsLoading && !standingsError && currentLeagueData && (
            <div className="wildcard-power-grid">
              {/* Wild Card Standings */}
              <div className="division-card wildcard-card">
                <div className="division-header">
                  <h3>{selectedLeague} Wild Card</h3>
                  <span className="wildcard-badge">Playoff Race</span>
                </div>
                <div className="standings-table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="rank-col">#</th>
                        <th className="team-col">Team</th>
                        <th>W</th>
                        <th>L</th>
                        <th>PCT</th>
                        <th>GB</th>
                        <th>WCGB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeagueData.wildCard.map((team) => (
                        <tr 
                          key={team.rank} 
                          className={`${team.rank <= 3 ? 'wildcard-position' : ''} clickable-row`}
                          onClick={(e) => handleTeamClick(e, team.teamAbbreviation)} onAuxClick={(e) => handleTeamClick(e, team.teamAbbreviation)}
                        >
                          <td className="rank-col">{team.rank}</td>
                          <td className="team-col">
                            <img 
                              src={`https://www.mlbstatic.com/team-logos/${team.mlbTeamId}.svg`}
                              alt={team.team}
                              className="team-logo-img"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            {team.team}
                            {team.rank <= 3 && <span className="wildcard-clinch">WC</span>}
                          </td>
                          <td className="wins">{team.wins}</td>
                          <td className="losses">{team.losses}</td>
                          <td className="pct">{team.pct.toFixed(3)}</td>
                          <td className="gb">{team.gb}</td>
                          <td className={`wcgb ${team.wcgb.startsWith('+') ? 'positive' : team.wcgb.startsWith('-') ? 'negative' : ''}`}>
                            {team.wcgb}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* League Power Rankings */}
              <div className="division-card league-power-card">
                <div className="division-header">
                  <h3>⚡ {selectedLeague} Power Rankings</h3>
                  <span className="power-badge">Top 5</span>
                </div>
                <div className="league-power-list">
                  {leaguePowerRankings.map((team) => (
                    <div 
                      key={team.leagueRank} 
                      className="league-power-item clickable-power-item"
                      onClick={(e) => handleTeamClick(e, team.teamAbbreviation)} onAuxClick={(e) => handleTeamClick(e, team.teamAbbreviation)}
                    >
                      <div className="league-power-rank">{team.leagueRank}</div>
                      <div className="league-power-team-info">
                        <div className="league-power-team-name">
                          <img 
                            src={`https://www.mlbstatic.com/team-logos/${team.mlbTeamId}.svg`}
                            alt={team.team}
                            className="team-logo-img"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          {team.team}
                        </div>
                        <div className="league-power-team-record">{team.record}</div>
                      </div>
                      <div className="league-power-movement">
                        <span className="league-last-week">Last: #{team.lastWeek}</span>
                        <span className={`league-trend-arrow ${team.trend === '↑' ? 'up' : team.trend === '↓' ? 'down' : 'same'}`}>
                          {team.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* Overall Power Rankings */}
            {!standingsLoading && !standingsError && powerRankings.length > 0 && (
            <div className="power-rankings-section">
              <div className="division-card power-rankings-card">
                <div className="division-header">
                  <h3>⚡ MLB Power Rankings</h3>
                  <span className="power-badge">Top 10</span>
                </div>
                <div className="power-rankings-list">
                  {powerRankings.map((team) => (
                    <div 
                      key={team.rank} 
                      className="power-ranking-item clickable-power-item"
                      onClick={(e) => handleTeamClick(e, team.teamAbbreviation)} onAuxClick={(e) => handleTeamClick(e, team.teamAbbreviation)}
                    >
                      <div className="power-rank">{team.rank}</div>
                      <div className="power-team-info">
                        <div className="power-team-name">
                          <img 
                            src={`https://www.mlbstatic.com/team-logos/${team.mlbTeamId}.svg`}
                            alt={team.team}
                            className="team-logo-img"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          {team.team}
                          <span className={`league-badge ${team.league}`}>{team.league}</span>
                        </div>
                        <div className="power-team-record">{team.record}</div>
                      </div>
                      <div className="power-movement">
                        <span className={`run-diff ${team.runDifferential >= 0 ? 'positive' : 'negative'}`}>
                          {team.runDifferential >= 0 ? '+' : ''}{team.runDifferential}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MLBStandings;