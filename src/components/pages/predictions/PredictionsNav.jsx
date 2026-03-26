import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/predictions/games',    label: 'Game Predictions' },
  { to: '/predictions/pitchers', label: 'Pitcher Props' },
  { to: '/predictions/batters',  label: 'Batter Props' },
];

export default function PredictionsNav() {
  return (
    <nav className="predictions-nav">
      {LINKS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `predictions-nav-link${isActive ? ' active' : ''}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
