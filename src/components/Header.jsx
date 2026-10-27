import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/spa-retro-logo-removebg.png';
import '../styles/home-page-styling/header.css';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Marketing header is for signed-out visitors only — signed-in users
  // navigate from the Terminal's top bar, rail, and Cmd+K palette. Hidden
  // while auth is resolving too, so a returning user never sees it flash.
  if (loading || isAuthenticated) return null;

  return (
    <header className="header">
      <div className="container topbar-inner">
        <div
          className="logo"
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLogoClick(e); }}
        >
          <img src={logo} alt="Sandlot Picks Analytics" />
        </div>

        <nav className="navlinks">
          <Link to="/products">Products</Link>
          <Link to="/features">Features</Link>
          <Link to="/upgrade">Pricing</Link>
        </nav>

        <div className="topbar-spacer"></div>

        <Link
          to="/account"
          className={`account-icon ${location.pathname.startsWith('/account') ? 'active' : ''}`}
          aria-label="Account"
          title="Login / Sign Up"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

export default Header;
