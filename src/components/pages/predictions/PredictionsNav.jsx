import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { SHOW_SCOUT_AI } from '../../../data/constants/featureFlags';

const LINKS = [
  { to: '/predictions/games',    label: 'Game Predictions' },
  { to: '/predictions/pitchers', label: 'Pitcher Props' },
  { to: '/predictions/batters',  label: 'Batter Props' },
  ...(SHOW_SCOUT_AI
    ? [{ to: '/predictions/scout-ai', label: 'Scout AI', accent: true }]
    : []),
];

export default function PredictionsNav() {
  const { isAdmin } = useAuth();
  const links = isAdmin
    ? [...LINKS, { to: '/predictions/bet-library', label: 'Bet Library', library: true }]
    : LINKS;

  return (
    <nav className="predictions-nav">
      {links.map(({ to, label, accent, library }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `predictions-nav-link${isActive ? ' active' : ''}${accent ? ' predictions-nav-link--scout' : ''}${library ? ' predictions-nav-link--library' : ''}`
          }
        >
          {accent && <span className="predictions-nav-link__sparkle" aria-hidden="true">✨</span>}
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
