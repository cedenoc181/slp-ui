import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OFFSEASON, isOffseason, salesReopenLabel } from '../data/constants/salesWindow';
import '../styles/predictions-page-styling/predictions.css';

/**
 * Closes the daily pick boards (game / pitcher / batter props, Scout AI) in
 * the offseason — there are no games to predict between the World Series and
 * Opening Day (window in data/constants/salesWindow.js). Admins pass through
 * so the boards can still be checked. Bet Library and Trust Ledger stay open.
 */
export default function OffseasonGate({ children }) {
  const { isAdmin } = useAuth();
  if (!isOffseason()) return children;

  // Admins keep the live boards for testing, with the same notice on top.
  if (isAdmin) {
    return (
      <>
        <div className="offseason-banner">
          <span className="offseason-banner__tag">{'// OFFSEASON'}</span>
          Predictions live Opening Day {OFFSEASON.nextSeason} — {salesReopenLabel()}
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="predictions-page">
      <div className="predictions-content">
        <div className="offseason-gate">
          <span className="offseason-gate__eyebrow">{'// OFFSEASON'}</span>
          <h1 className="offseason-gate__title">Predictions live Opening Day {OFFSEASON.nextSeason}</h1>
          <p className="offseason-gate__sub">
            The pick boards and Scout AI return for the {OFFSEASON.nextSeason} season on{' '}
            <strong>{salesReopenLabel()}</strong>. Your Bet Library and the Trust Ledger stay open in the meantime.
          </p>
          <div className="offseason-gate__actions">
            <Link to="/predictions/bet-library" className="offseason-gate__btn">Open Bet Library</Link>
            <Link to="/predictions/trust-ledger" className="offseason-gate__btn offseason-gate__btn--ghost">Trust Ledger</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
