import React from 'react';
import '../../../styles/stats-page-styling/mlb-standings-postseason.css';
import playoffDataJSON from '../../../data/mlbStandingsPostseason.json';

function MLBStandingsPostseason({ selectedSeason }) {
  // Get playoff data for the selected season, fallback to 2024
  const playoffData = playoffDataJSON[selectedSeason] || playoffDataJSON['2024'];

  const renderMatchup = (matchup, round) => {
    const winner = matchup.topSeed.score > matchup.bottomSeed.score ? 'top' : 'bottom';
    
    return (
      <div className={`matchup ${round}`}>
        <div className={`team ${winner === 'top' ? 'winner' : ''}`}>
          <span className="team-seed">{matchup.topSeed.seed}</span>
          <span className="team-logo">{matchup.topSeed.logo}</span>
          <span className="team-name">{matchup.topSeed.team}</span>
          <span className="team-score">{matchup.topSeed.score}</span>
        </div>
        <div className={`team ${winner === 'bottom' ? 'winner' : ''}`}>
          <span className="team-seed">{matchup.bottomSeed.seed}</span>
          <span className="team-logo">{matchup.bottomSeed.logo}</span>
          <span className="team-name">{matchup.bottomSeed.team}</span>
          <span className="team-score">{matchup.bottomSeed.score}</span>
        </div>
      </div>
    );
  };

  const renderChampionshipSeries = (series, league) => {
    const winner = series.team1.score > series.team2.score ? 'team1' : 'team2';
    
    return (
      <div className={`matchup championship-series ${league}`}>
        <div className={`team ${winner === 'team1' ? 'winner' : ''}`}>
          <span className="team-seed">{series.team1.seed}</span>
          <span className="team-logo">{series.team1.logo}</span>
          <span className="team-name">{series.team1.team}</span>
          <span className="team-score">{series.team1.score}</span>
        </div>
        <div className={`team ${winner === 'team2' ? 'winner' : ''}`}>
          <span className="team-seed">{series.team2.seed}</span>
          <span className="team-logo">{series.team2.logo}</span>
          <span className="team-name">{series.team2.team}</span>
          <span className="team-score">{series.team2.score}</span>
        </div>
      </div>
    );
  };

  const renderWorldSeries = () => {
    const winner = playoffData.worldSeries.alChampion.score > playoffData.worldSeries.nlChampion.score ? 'al' : 'nl';
    
    return (
      <div className="world-series-container">
        <div className="world-series-header">
          <h2>🏆 World Series</h2>
          <p className="series-subtitle">{selectedSeason} MLB Champions</p>
        </div>
        <div className="matchup world-series">
          <div className={`team ${winner === 'al' ? 'winner champion' : ''}`}>
            <span className="league-badge al">AL</span>
            <span className="team-logo">{playoffData.worldSeries.alChampion.logo}</span>
            <span className="team-name">{playoffData.worldSeries.alChampion.team}</span>
            <span className="team-score">{playoffData.worldSeries.alChampion.score}</span>
            {winner === 'al' && <span className="champion-badge">🏆 Champions</span>}
          </div>
          <div className={`team ${winner === 'nl' ? 'winner champion' : ''}`}>
            <span className="league-badge nl">NL</span>
            <span className="team-logo">{playoffData.worldSeries.nlChampion.logo}</span>
            <span className="team-name">{playoffData.worldSeries.nlChampion.team}</span>
            <span className="team-score">{playoffData.worldSeries.nlChampion.score}</span>
            {winner === 'nl' && <span className="champion-badge">🏆 Champions</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="playoff-bracket-container">
      <div className="bracket-wrapper">
        {/* American League Side */}
        <div className="league-bracket al-bracket">
          <div className="league-header">
            <h2>American League</h2>
            <div className="round-labels">
              <span>Wild Card</span>
              <span>Division Series</span>
              <span>ALCS</span>
            </div>
          </div>

          <div className="bracket-rounds">
            {/* Wild Card Round */}
            <div className="round wild-card">
              <h4 className="round-title">Wild Card</h4>
              <div className="matchup-container">
                {playoffData.AL.wildCard.map((game, idx) => (
                  <div key={idx} className="matchup wild-card-game">
                    <div className="team winner">
                      <span className="team-seed">{game.seed}</span>
                      <span className="team-logo">{game.logo}</span>
                      <span className="team-name">{game.team}</span>
                      <span className="team-score">{game.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Division Series */}
            <div className="round division-series">
              <h4 className="round-title">ALDS</h4>
              <div className="matchup-container">
                {playoffData.AL.divisionSeries.map((matchup, idx) => (
                  <div key={idx}>
                    {renderMatchup(matchup, 'division-series')}
                  </div>
                ))}
              </div>
            </div>

            {/* Championship Series */}
            <div className="round championship-series">
              <h4 className="round-title">ALCS</h4>
              <div className="matchup-container">
                {renderChampionshipSeries(playoffData.AL.championshipSeries, 'AL')}
              </div>
            </div>
          </div>
        </div>

        {/* World Series Center */}
        <div className="world-series-bracket">
          {renderWorldSeries()}
        </div>

        {/* National League Side */}
        <div className="league-bracket nl-bracket">
          <div className="league-header">
            <h2>National League</h2>
            <div className="round-labels">
              <span>NLCS</span>
              <span>Division Series</span>
              <span>Wild Card</span>
            </div>
          </div>

          <div className="bracket-rounds">
            {/* Championship Series */}
            <div className="round championship-series">
              <h4 className="round-title">NLCS</h4>
              <div className="matchup-container">
                {renderChampionshipSeries(playoffData.NL.championshipSeries, 'NL')}
              </div>
            </div>

            {/* Division Series */}
            <div className="round division-series-1">
              <h4 className="round-title">NLDS</h4>
              <div className="matchup-container">
                {playoffData.NL.divisionSeries[0] && (
                  <div>
                    {renderMatchup(playoffData.NL.divisionSeries[0], 'division-series')}
                  </div>
                )}
              </div>
            </div>
            
            <div className="round division-series-2">
              <div className="matchup-container">
                {playoffData.NL.divisionSeries[1] && (
                  <div>
                    {renderMatchup(playoffData.NL.divisionSeries[1], 'division-series')}
                  </div>
                )}
              </div>
            </div>

            {/* Wild Card Round */}
            <div className="round wild-card">
              <h4 className="round-title">Wild Card</h4>
              <div className="matchup-container">
                {playoffData.NL.wildCard.map((game, idx) => (
                  <div key={idx} className="matchup wild-card-game">
                    <div className="team winner">
                      <span className="team-seed">{game.seed}</span>
                      <span className="team-logo">{game.logo}</span>
                      <span className="team-name">{game.team}</span>
                      <span className="team-score">{game.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MLBStandingsPostseason;