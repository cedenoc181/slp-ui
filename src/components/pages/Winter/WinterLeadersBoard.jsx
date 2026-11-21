import cbpcService from '../../../data/services/cbpcService';
import { useCbpc, Loading, ErrorState, Section, LeadersList, qualifierText, fmtRate, fmtNum } from './winterUi';

/*
  Player Analytics' winter view: league leaders across several categories for
  one winter league and season (regular season, qualified players). Names link
  to the winter player pages.
*/

const CATEGORIES = {
  batting: [
    ['ops', 'OPS', v => fmtRate(v)],
    ['avg', 'AVG', v => fmtRate(v)],
    ['home_runs', 'Home runs', v => v],
    ['rbis', 'RBI', v => v],
    ['stolen_bases', 'Stolen bases', v => v],
    ['obp', 'OBP', v => fmtRate(v)],
  ],
  pitching: [
    ['era', 'ERA', v => fmtNum(v)],
    ['whip', 'WHIP', v => fmtNum(v)],
    ['strikeouts', 'Strikeouts', v => v],
    ['k_per_9', 'K/9', v => fmtNum(v, 1)],
    ['wins', 'Wins', v => v],
    ['saves', 'Saves', v => v],
  ],
};

export default function WinterLeadersBoard({ league, season, group }) {
  const cats = CATEGORIES[group];
  const { data, loading, error } = useCbpc(
    () => Promise.all(cats.map(([stat]) => cbpcService.getLeaders(league, group, stat, season, 5).catch(() => null))),
    [league, season, group],
  );

  if (loading) return <Loading rows={6} />;
  if (error) return <ErrorState error={error} />;
  const qualifier = qualifierText(data.find(Boolean)?.qualifier);

  return (
    <Section title={`${group === 'batting' ? 'Batting' : 'Pitching'} leaders`} aside={['Regular season', qualifier].filter(Boolean).join(' · ')}>
      <div className="wb-leader-grid">
        {cats.map(([stat, label, format], i) => (
          <div key={stat}>
            <h3 className="wb-sub-title">{label}</h3>
            <LeadersList league={league} season={season} data={data[i]} format={format} />
          </div>
        ))}
      </div>
    </Section>
  );
}
