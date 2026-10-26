import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/spa-retro-logo-removebg.png';
import '../styles/home-page-styling/header.css';

function Header() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          <Link to="/features">Features</Link>
          <Link to="/predictions/trust-ledger">Track Record</Link>
          <Link to="/upgrade">Pricing</Link>
        </nav>

        <div className="topbar-spacer"></div>

        {isAuthenticated ? (
          <Link to="/account/settings" className="btn btn-ghost">Account</Link>
        ) : (
          <>
            <Link to="/account" className="btn btn-ghost">Log In</Link>
            <Link to="/account" className="btn btn-accent">Start Free</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
