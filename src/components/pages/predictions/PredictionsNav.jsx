import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const LINKS = [
  { to: '/predictions/games',    label: 'Game Predictions' },
  { to: '/predictions/pitchers', label: 'Pitcher Props' },
  { to: '/predictions/batters',  label: 'Batter Props' },
];

export default function PredictionsNav() {
  const { isPremium, hasAdminToolsAccess } = useAuth();
  // Scout AI — available to premium subscribers (and admins).
  const SCOUT_LINK = { to: '/predictions/scout-desk', label: 'Scout AI' };
  // Admin tools (admins + explicitly-granted users).
  const ADMIN_LINKS = [
    { to: '/predictions/bet-library', label: 'Bet Library' },
    { to: '/predictions/lab',         label: 'Lab' },
  ];
  const special = [
    ...(isPremium ? [SCOUT_LINK] : []),
    ...(hasAdminToolsAccess ? ADMIN_LINKS : []),
  ];
  const links = [
    ...LINKS,
    ...special.map((l, i) => ({ ...l, admin: true, groupStart: i === 0 })),
  ];

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
