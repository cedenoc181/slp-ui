import { LEAGUES, leagueTabTip } from '../data/constants/leagues';
import '../styles/league-tabs.css';

// League switcher for the stats pages. 'soon' leagues are shown but disabled,
// unless the page lists them in `enabled` because it has their data
// (Schedule, Standings and the Analytics pages carry the winter leagues).
export default function LeagueTabs({ value, onChange, enabled = [] }) {
  return (
    <div className="league-tabs" role="group" aria-label="League">
      {LEAGUES.map(l => {
        const soon = l.status === 'soon' && !enabled.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            className={`league-tab${value === l.id ? ' active' : ''}${soon ? ' league-tab--soon' : ''}`}
            aria-pressed={value === l.id}
            disabled={soon}
            data-tip={leagueTabTip(l, soon)}
            aria-label={`${l.label}: ${leagueTabTip(l, soon)}`}
            onClick={() => onChange(l.id)}
          >
            {l.label}
            {soon && <span className="league-tab__soon">Soon</span>}
          </button>
        );
      })}
    </div>
  );
}

// Stand-in body for a league whose data isn't live yet. Fetches nothing.
export function LeaguePreview({ eyebrow, title, children }) {
  return (
    <div className="league-preview">
      <span className="league-preview__eyebrow">{eyebrow}</span>
      <h2 className="league-preview__title">{title}</h2>
      <p className="league-preview__text">{children}</p>
    </div>
  );
}
