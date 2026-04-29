import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAlertsForUser,
  isAlertRead,
  markAlertRead,
  formatAlertDate,
} from '../data/constants/alertsMockData';
import '../styles/alert-modal.css';

/**
 * Inbox card for the Settings page. Shows every alert targeted at the
 * current user, sorted newest first, with read/unread state.
 */
export default function AlertInbox() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [openId, setOpenId] = useState(null);

  // Refresh on user change. Bump a tick when alerts change so unread counts update.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!user?.email) {
      setAlerts([]);
      return;
    }
    const list = getAlertsForUser(user.email)
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setAlerts(list);
  }, [user?.email, tick]);

  if (!user?.email) return null;

  const unreadCount = alerts.filter(a => !isAlertRead(a.id, user.email)).length;

  const handleToggle = (id) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!isAlertRead(id, user.email)) {
      markAlertRead(id, user.email);
      setTick(t => t + 1);
    }
  };

  if (alerts.length === 0) return null;

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
          const read = isAlertRead(a.id, user.email);
          const isOpen = openId === a.id;
          return (
            <div
              key={a.id}
              className={`alert-inbox__item${!read ? ' is-unread' : ''}${isOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="alert-inbox__row"
                onClick={() => handleToggle(a.id)}
                aria-expanded={isOpen}
              >
                <span className={`alert-inbox__dot${read ? ' is-read' : ''}`} aria-hidden="true" />
                <div className="alert-inbox__row-main">
                  <span className="alert-inbox__subject">{a.subject}</span>
                  <span className="alert-inbox__date">{formatAlertDate(a.createdAt)}</span>
                </div>
                <span className="alert-inbox__chevron" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <div className="alert-inbox__body">
                  {(a.body || '').split('\n').map((line, i) => (
                    <p key={i}>{line || '\u00A0'}</p>
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
