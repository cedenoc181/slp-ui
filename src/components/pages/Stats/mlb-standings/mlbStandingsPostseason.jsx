import React from 'react';
import '../../../../styles/stats-page-styling/mlb-standings-postseason.css';
import playoffDataJSON from '../../../../data/mlbStandingsPostseason.json';
import alIcon from '../../../../assets/images/AL-icon.png';
import nlIcon from '../../../../assets/images/NL-icon.png';
import wsIcon from '../../../../assets/images/mlb-ws.png';

const chunkIntoMatchups = (teams) => {
  const pairs = [];
  for (let i = 0; i < teams.length; i += 2) {
    pairs.push(teams.slice(i, i + 2));
  }
  return pairs;
};

function MLBStandingsPostseason({ selectedSeason }) {
  const playoffData = playoffDataJSON[selectedSeason] || playoffDataJSON['2024'];
  const alDivisionSeries = playoffData.AL.divisionSeries || [];
  const nlDivisionSeries = playoffData.NL.divisionSeries || [];

  const renderSeriesInfo = (teamA, teamB, label) => {
    const winner = teamB ? (teamA.score >= teamB.score ? teamA : teamB) : teamA;
    return (
      <div className="series-info-pop">
        <p className="series-info-title">{label}</p>
        <div className="series-info-row">
          <span>{teamA.team}</span>
          <span className="series-info-score">{teamA.score}</span>
        </div>
        {teamB && (
          <div className="series-info-row">
            <span>{teamB.team}</span>
            <span className="series-info-score">{teamB.score}</span>
          </div>
        )}
        <p className="series-info-winner">Winner: {winner.team}</p>
      </div>
    );
  };

  const renderTeamRow = (team, isWinner, league) => {
    const isNL = league === 'nl';
    return (
      <div className={`team-row ${isWinner ? 'winner' : ''} ${isNL ? 'nl' : ''}`}>
        {isNL ? (
          <>
            <span className="team-score">{team.score}</span>
            <span className="team-name">{team.team}</span>
            <span className="team-logo">{team.logo}</span>
            <span className={`seed-chip ${league}`}>#{team.seed}</span>
          </>
        ) : (
          <>
            <span className={`seed-chip ${league}`}>#{team.seed}</span>
            <span className="team-logo">{team.logo}</span>
            <span className="team-name">{team.team}</span>
            <span className="team-score">{team.score}</span>
          </>
        )}
      </div>
    );
  };

  const renderSeriesBlock = (matchup, league, round, connectDirection) => {
    const isTopWinner = matchup.topSeed.score >= matchup.bottomSeed.score;
    const label =
      round === 'division'
        ? `${league.toUpperCase()} Division Series`
        : round === 'championship'
          ? `${league.toUpperCase()} Championship Series`
          : 'Series';
    return (
      <div className={`series-block ${round} connect-${connectDirection}`}>
        {renderSeriesInfo(matchup.topSeed, matchup.bottomSeed, label)}
        {renderTeamRow(matchup.topSeed, isTopWinner, league)}
        {renderTeamRow(matchup.bottomSeed, !isTopWinner, league)}
      </div>
    );
  };

  const renderChampionshipSeries = (series, league, connectDirection) => {
    const isFirstWinner = series.team1.score >= series.team2.score;
    const label = `${league.toUpperCase()} Championship Series`;
    return (
      <div className={`series-block championship connect-${connectDirection}`}>
        {renderSeriesInfo(series.team1, series.team2, label)}
        {renderTeamRow(series.team1, isFirstWinner, league)}
        {renderTeamRow(series.team2, !isFirstWinner, league)}
      </div>
    );
  };

  const renderWildCardRound = (games, league, connectDirection) => {
    const pairs = chunkIntoMatchups(games);
    return pairs.map((pair, idx) => {
      const [teamA, teamB] = pair;
      const teamAWins = teamB ? teamA.score >= teamB.score : true;
      const items = (
        <div key={`${league}-wc-${idx}`} className={`series-block wild-card connect-${connectDirection}`}>
          {renderSeriesInfo(teamA, teamB, `${league.toUpperCase()} Wild Card`)}
          {renderTeamRow(teamA, teamAWins, league)}
          {teamB && renderTeamRow(teamB, !teamAWins, league)}
        </div>
      );

      if (pairs.length > 1 && idx === 0) {
        const iconSrc = league === 'al' ? alIcon : nlIcon;
        return [
          items,
          <div key={`${league}-wc-icon`} className={`wildcard-icon ${league}`}>
            <img src={iconSrc} alt={`${league.toUpperCase()} Wild Card`} />
          </div>,
        ];
      }

      return items;
    });
  };

  const renderWorldSeries = () => {
    const alWins = playoffData.worldSeries.alChampion.score >= playoffData.worldSeries.nlChampion.score;
    const label = 'World Series';
    return (
      <div className="world-series-block">
        <div className="world-series-logo">
          <img src={wsIcon} alt="World Series logo" />
        </div>
        <div className="series-block world-series">
          {renderSeriesInfo(playoffData.worldSeries.alChampion, playoffData.worldSeries.nlChampion, label)}
          {renderTeamRow(playoffData.worldSeries.alChampion, alWins, 'al')}
          {renderTeamRow(playoffData.worldSeries.nlChampion, !alWins, 'nl')}
        </div>
        <div className="world-series-header">
          <p className="eyebrow">Postseason {selectedSeason}</p>
          {/* <h3>World Series</h3> */}
        </div>
      </div>
    );
  };

    return (
      <div className="playoff-bracket-container">
        <div>
          <div className="bracket-grid">
            <div className="round-column al wild-card">
            <div className="round-title">AL Wild Card</div>
            <div className="round-matchups">
              {renderWildCardRound(playoffData.AL.wildCard, 'al', 'right')}
            </div>
            </div>

          <div className="round-column combo al-combo">
            <div className="round-title">ALDS</div>
            <div className="round-matchups division-slot top align-start">
              {alDivisionSeries[0] && renderSeriesBlock(alDivisionSeries[0], 'al', 'division', 'right')}
            </div>
            <div className="championship-center">
              <div className="round-title">ALCS</div>
              <div className="round-matchups single align-center">
                {renderChampionshipSeries(playoffData.AL.championshipSeries, 'al', 'right')}
              </div>
            </div>
            <div className="round-matchups division-slot bottom align-end">
              {alDivisionSeries[1] && renderSeriesBlock(alDivisionSeries[1], 'al', 'division', 'right')}
            </div>
          </div>

          <div className="round-column world">
            {renderWorldSeries()}
          </div>

          <div className="round-column combo nl-combo">
            <div className="round-title">NLDS</div>
            <div className="round-matchups division-slot top align-start">
              {nlDivisionSeries[0] && renderSeriesBlock(nlDivisionSeries[0], 'nl', 'division', 'left')}
            </div>
            <div className="championship-center">
              <div className="round-title">NLCS</div>
              <div className="round-matchups single align-center">
                {renderChampionshipSeries(playoffData.NL.championshipSeries, 'nl', 'left')}
              </div>
            </div>
            <div className="round-matchups division-slot bottom align-end">
              {nlDivisionSeries[1] && renderSeriesBlock(nlDivisionSeries[1], 'nl', 'division', 'left')}
            </div>
          </div>

          <div className="round-column nl wild-card">
            <div className="round-title">NL Wild Card</div>
            <div className="round-matchups">
              {renderWildCardRound(playoffData.NL.wildCard, 'nl', 'left')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MLBStandingsPostseason;
