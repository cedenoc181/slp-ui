import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getUnreadModalAlerts,
  markAlertRead,
  formatAlertDate,
} from '../data/services/alertsService';
import '../styles/alert-modal.css';

/**
 * Mounted globally in App.jsx. Watches authentication and pops the queued
 * modal-type alerts one at a time when the user signs in. Each acknowledged
 * alert is marked read so it won't reappear on the next session.
 */
export default function AlertSignInModal() {
  const { isAuthenticated, user } = useAuth();
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setQueue([]);
      return;
    }
    let cancelled = false;
    getUnreadModalAlerts()
      .then(unread => { if (!cancelled) setQueue(unread); })
      .catch(err => { console.warn('Failed to load sign-in alerts:', err.message); });
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.email]);

  if (queue.length === 0) return null;

  const current = queue[0];
  const remaining = queue.length - 1;

  const handleAcknowledge = () => {
    markAlertRead(current.id).catch(err => {
      console.warn('Failed to mark alert read:', err.message);
    });
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
