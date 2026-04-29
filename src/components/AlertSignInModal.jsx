import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getUnreadModalAlertsForUser,
  markAlertRead,
  formatAlertDate,
} from '../data/constants/alertsMockData';
import '../styles/alert-modal.css';

/**
 * Mounted globally in App.jsx. Watches authentication and pops the queued
 * modal-type alerts one at a time when the user signs in. Each acknowledged
 * alert is marked read so it won't reappear on the next session.
 */
export default function AlertSignInModal() {
  const { isAuthenticated, user } = useAuth();
  const [queue, setQueue] = useState([]);

  // Re-check the queue any time the auth state flips to "signed in"
  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setQueue([]);
      return;
    }
    const unread = getUnreadModalAlertsForUser(user.email);
    setQueue(unread);
  }, [isAuthenticated, user?.email]);

  if (queue.length === 0) return null;

  const current = queue[0];
  const remaining = queue.length - 1;

  const handleAcknowledge = () => {
    markAlertRead(current.id, user.email);
    setQueue(q => q.slice(1));
  };

  return (
    <div className="alert-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="alert-modal-title">
      <div className="alert-modal">
        <div className="alert-modal__header">
          <span className="alert-modal__badge">📢 Important Update</span>
          <h2 id="alert-modal-title" className="alert-modal__title">{current.subject}</h2>
          <span className="alert-modal__date">Posted {formatAlertDate(current.createdAt)}</span>
        </div>

        <div className="alert-modal__body">
          {(current.body || '').split('\n').map((line, i) => (
            <p key={i}>{line || '\u00A0'}</p>
          ))}
        </div>

        <div className="alert-modal__footer">
          {remaining > 0 && (
            <span className="alert-modal__queue-count">
              {remaining} more {remaining === 1 ? 'message' : 'messages'} after this
            </span>
          )}
          <button type="button" className="alert-modal__cta" onClick={handleAcknowledge}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
