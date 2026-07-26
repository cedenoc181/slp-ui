import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

// Scout AI leads the standard prediction tabs (all premium-gated at the route,
// but shown to everyone here as an upsell — same as the others).
const LINKS = [
  { to: '/predictions/scout-desk', label: 'Scout AI' },
  { to: '/predictions/games',      label: 'Game Props' },
  { to: '/predictions/pitchers',   label: 'Pitcher Props' },
  { to: '/predictions/batters',    label: 'Batter Props' },
];

export default function PredictionsNav() {
  const { hasAdminToolsAccess } = useAuth();
  const links = [...LINKS];
  // Admin tools (admins + explicitly-granted users), grouped/set apart on the right.
  if (hasAdminToolsAccess) {
    const ADMIN_LINKS = [
      { to: '/predictions/bet-library', label: 'Bet Library' },
      { to: '/predictions/lab',         label: 'Lab' },
    ];
    links.push(...ADMIN_LINKS.map((l, i) => ({ ...l, admin: true, groupStart: i === 0 })));
  }

  return (
    <nav className="predictions-nav">
      {links.map(({ to, label, accent, admin, groupStart }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `predictions-nav-link${isActive ? ' active' : ''}${accent ? ' predictions-nav-link--scout' : ''}${admin ? ' predictions-nav-link--admin' : ''}${groupStart ? ' predictions-nav-link--adminstart' : ''}`
          }
        >
          {accent && <span className="predictions-nav-link__sparkle" aria-hidden="true">✨</span>}
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
