import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/predictions/games',    label: 'Game Predictions' },
  { to: '/predictions/pitchers', label: 'Pitcher Props' },
  { to: '/predictions/batters',  label: 'Batter Props' },
  { to: '/predictions/scout-ai', label: 'Scout AI', accent: true },
];

export default function PredictionsNav() {
  return (
    <nav className="predictions-nav">
      {LINKS.map(({ to, label, accent }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `predictions-nav-link${isActive ? ' active' : ''}${accent ? ' predictions-nav-link--scout' : ''}`
          }
        >
          {accent && <span className="predictions-nav-link__sparkle" aria-hidden="true">✨</span>}
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
