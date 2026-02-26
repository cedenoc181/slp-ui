import PitcherCard from './PitcherCard';

export default function PitchersSection({
  game,
  awayAbbr, homeAbbr,
  awayMlbId, homeMlbId,
  awaySP, homeSP,
  awaySPMlbId, homeSPMlbId,
  awaySPInfo, homeSPInfo,
  awayUrlName, homeUrlName,
  season,
  awaySPStatSeason, homeSPStatSeason,
  isFinal, isLive,
}) {
  return (
    <div className="detail-card detail-card-full">
      <h3 className="card-title">
        {(isFinal || isLive) ? 'Starting Pitchers' : 'Probable Pitchers'}
      </h3>
      <div className="pitcher-matchup">
        <PitcherCard
          abbr={awayAbbr}
          name={game.away_sp_name}
          spStats={awaySP}
          align="left"
          mlbId={awayMlbId}
          headshotId={awaySPMlbId}
          nameSlug={awaySPInfo?.name_slug}
          teamUrlName={awayUrlName}
          season={season}
          statSeason={awaySPStatSeason}
        />
        <div className="pitcher-vs">VS</div>
        <PitcherCard
          abbr={homeAbbr}
          name={game.home_sp_name}
          spStats={homeSP}
          align="right"
          mlbId={homeMlbId}
          headshotId={homeSPMlbId}
          nameSlug={homeSPInfo?.name_slug}
          teamUrlName={homeUrlName}
          season={season}
          statSeason={homeSPStatSeason}
        />
      </div>
    </div>
  );
}
