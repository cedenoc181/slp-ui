import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getMyAlerts,
  markAlertRead,
  formatAlertDate,
} from '../data/services/alertsService';
import '../styles/alert-modal.css';

/**
 * Inbox card for the Settings page. Shows every alert targeted at the
 * current user, sorted newest first, with read/unread state.
 */
export default function AlertInbox() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!user?.email) {
      setAlerts([]);
      return;
    }
    let cancelled = false;
    getMyAlerts()
      .then(list => { if (!cancelled) setAlerts(list); })
      .catch(err => { console.warn('Failed to load inbox alerts:', err.message); });
    return () => { cancelled = true; };
  }, [user?.email]);

  if (!user?.email) return null;
  if (alerts.length === 0) return null;

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const handleToggle = (id) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    const target = alerts.find(a => a.id === id);
    if (target && !target.isRead) {
      setAlerts(curr => curr.map(a => (a.id === id ? { ...a, isRead: true } : a)));
      markAlertRead(id).catch(err => {
        console.warn('Failed to mark alert read:', err.message);
      });
    }
  };

  return (
    <section id="inbox" className="settings-section alert-inbox">
      <div className="section-header">
        <div className="alert-inbox__title-row">
          <h2>
            <span className="alert-inbox__icon" aria-hidden="true">📬</span>
            Inbox
          </h2>
          {unreadCount > 0 && (
            <span className="alert-inbox__unread-badge">{unreadCount} new</span>
          )}
        </div>
        <p>Updates and announcements from the Sandlot Picks team</p>
      </div>

      <div className="alert-inbox__list">
        {alerts.map(a => {
          const isOpen = openId === a.id;
          return (
            <div
              key={a.id}
              className={`alert-inbox__item${!a.isRead ? ' is-unread' : ''}${isOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="alert-inbox__row"
                onClick={() => handleToggle(a.id)}
                aria-expanded={isOpen}
              >
                <span className={`alert-inbox__dot${a.isRead ? ' is-read' : ''}`} aria-hidden="true" />
                <div className="alert-inbox__row-main">
                  <span className="alert-inbox__subject">{a.subject}</span>
                  <span className="alert-inbox__date">{formatAlertDate(a.createdAt)}</span>
                </div>
                <span className="alert-inbox__chevron" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <div className="alert-inbox__body">
                  {(a.body || '').split('\n').map((line, i) => (
                    <p key={i}>{line || ' '}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
