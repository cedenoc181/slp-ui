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

// The props pages show just their own three tabs.
const PROPS_PATHS = ['/predictions/games', '/predictions/pitchers', '/predictions/batters'];

export default function PredictionsNav({ propsOnly = false }) {
  const { isAuthenticated, hasAdminToolsAccess, isPremium } = useAuth();
  const links = propsOnly ? LINKS.filter(l => PROPS_PATHS.includes(l.to)) : [...LINKS];

  // Set-apart tools on the right: the Bet Library (every signed-in user has
  // their own), the Lab (admins + explicitly-granted users), plus Trust Ledger —
  // a reference tool, not a pick board, shown only to users who actually have
  // Scout AI access (same gate as its route), not teased to everyone the way
  // the standard tabs above are.
  const extraLinks = [];
  if (isAuthenticated) {
    extraLinks.push({ to: '/predictions/bet-library', label: 'Bet Library' });
  }
  if (hasAdminToolsAccess) {
    extraLinks.push({ to: '/predictions/lab', label: 'Lab' });
  }
  if (isPremium) {
    extraLinks.push({ to: '/predictions/trust-ledger', label: 'Trust Ledger' });
  }
  // The props pages leave the set-apart tools out entirely.
  if (!propsOnly) links.push(...extraLinks.map((l, i) => ({ ...l, admin: true, groupStart: i === 0 })));

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
