import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

function SettingsPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/account');
    }
  }, [isAuthenticated, navigate]);

  // Mock user settings state (would come from auth/API in production)
  const [settings, setSettings] = useState({
    // Profile Settings
    displayName: user?.displayName || '',
    favoriteTeam: '',
    
    // Notification Preferences
    emailUpdates: true,
    weeklyDigest: false,
    breakingNews: true,
    
    // Display Preferences
    theme: 'system',
    defaultSeason: '2025',
    compactTables: false,
    
    // Privacy Settings
    profileVisible: true,
    shareActivity: false,
  });

  const [saveStatus, setSaveStatus] = useState(null);

  const mlbTeams = [
    { id: '', name: 'Select a team...' },
    { id: 'ARI', name: 'Arizona Diamondbacks' },
    { id: 'ATL', name: 'Atlanta Braves' },
    { id: 'BAL', name: 'Baltimore Orioles' },
    { id: 'BOS', name: 'Boston Red Sox' },
    { id: 'CHC', name: 'Chicago Cubs' },
    { id: 'CWS', name: 'Chicago White Sox' },
    { id: 'CIN', name: 'Cincinnati Reds' },
    { id: 'CLE', name: 'Cleveland Guardians' },
    { id: 'COL', name: 'Colorado Rockies' },
    { id: 'DET', name: 'Detroit Tigers' },
    { id: 'HOU', name: 'Houston Astros' },
    { id: 'KC', name: 'Kansas City Royals' },
    { id: 'LAA', name: 'Los Angeles Angels' },
    { id: 'LAD', name: 'Los Angeles Dodgers' },
    { id: 'MIA', name: 'Miami Marlins' },
    { id: 'MIL', name: 'Milwaukee Brewers' },
    { id: 'MIN', name: 'Minnesota Twins' },
    { id: 'NYM', name: 'New York Mets' },
    { id: 'NYY', name: 'New York Yankees' },
    { id: 'OAK', name: 'Oakland Athletics' },
    { id: 'PHI', name: 'Philadelphia Phillies' },
    { id: 'PIT', name: 'Pittsburgh Pirates' },
    { id: 'SD', name: 'San Diego Padres' },
    { id: 'SF', name: 'San Francisco Giants' },
    { id: 'SEA', name: 'Seattle Mariners' },
    { id: 'STL', name: 'St. Louis Cardinals' },
    { id: 'TB', name: 'Tampa Bay Rays' },
    { id: 'TEX', name: 'Texas Rangers' },
    { id: 'TOR', name: 'Toronto Blue Jays' },
    { id: 'WSH', name: 'Washington Nationals' },
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    // Mock save - would call API in production
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 1000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    window.scrollTo(0, 0);
  };

  return (
    <section className="settings-page">
      <div className="container">
        <h1 className="page-title">Account Settings</h1>
        <p className="page-subtitle">
          Manage your profile, preferences, and privacy settings
        </p>

        <div className="settings-layout">
          {/* Settings Navigation */}
          <nav className="settings-nav">
            <a href="#profile" className="settings-nav-item active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>
              </svg>
              Profile
            </a>
            <a href="#notifications" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Notifications
            </a>
            <a href="#display" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Display
            </a>
            <a href="#privacy" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Privacy
            </a>
            <a href="#account" className="settings-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Account
            </a>
            <button type="button" className="settings-nav-item logout" onClick={handleLogout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </nav>

          {/* Settings Content */}
          <form className="settings-content" onSubmit={handleSaveSettings}>
            {/* Profile Section */}
            <section id="profile" className="settings-section">
              <div className="section-header">
                <h2>Profile Settings</h2>
                <p>Customize how you appear on the platform</p>
              </div>
              
              <div className="settings-group">
                <div className="setting-item">
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={settings.displayName}
                    onChange={handleInputChange}
                    placeholder="Enter your display name"
                    maxLength={30}
                    disabled
                  />
                  <span className="setting-hint">This name will be visible on your profile</span>
                </div>

                <div className="setting-item">
                  <label htmlFor="favoriteTeam">Favorite Team</label>
                  <select
                    id="favoriteTeam"
                    name="favoriteTeam"
                    value={settings.favoriteTeam}
                    onChange={handleInputChange}
                    disabled
                  >
                    {mlbTeams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  <span className="setting-hint">Personalize your experience with team highlights</span>
                </div>
              </div>
            </section>

            {/* Notifications Section */}
            <section id="notifications" className="settings-section">
              <div className="section-header">
                <h2>Notification Preferences</h2>
                <p>Control what updates you receive</p>
              </div>
              
              <div className="settings-group">
                <div className="setting-item toggle">
                  <div className="setting-info">
                    <label htmlFor="emailUpdates">Email Updates</label>
                    <span className="setting-hint">Receive important platform updates and announcements</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="emailUpdates"
                      name="emailUpdates"
                      checked={settings.emailUpdates}
                      onChange={handleInputChange}
                      disabled
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item toggle">
                  <div className="setting-info">
                    <label htmlFor="weeklyDigest">Weekly Digest</label>
                    <span className="setting-hint">Get a summary of top MLB stats and insights each week</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="weeklyDigest"
                      name="weeklyDigest"
                      checked={settings.weeklyDigest}
                      onChange={handleInputChange}
                      disabled
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item toggle">
                  <div className="setting-info">
                    <label htmlFor="breakingNews">Breaking News Alerts</label>
                    <span className="setting-hint">Instant notifications for major MLB news and updates</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="breakingNews"
                      name="breakingNews"
                      checked={settings.breakingNews}
                      onChange={handleInputChange}
                      disabled
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </section>

            {/* Display Section */}
            <section id="display" className="settings-section">
              <div className="section-header">
                <h2>Display Preferences</h2>
                <p>Customize how you view the platform</p>
              </div>
              
              <div className="settings-group">
                <div className="setting-item">
                  <label htmlFor="theme">Theme</label>
                  <select
                    id="theme"
                    name="theme"
                    value={settings.theme}
                    onChange={handleInputChange}
                    disabled
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                  <span className="setting-hint">Choose your preferred color scheme</span>
                </div>

                <div className="setting-item">
                  <label htmlFor="defaultSeason">Default Season</label>
                  <select
                    id="defaultSeason"
                    name="defaultSeason"
                    value={settings.defaultSeason}
                    onChange={handleInputChange}
                    disabled
                  >
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                  <span className="setting-hint">Season shown by default when viewing stats</span>
                </div>

                <div className="setting-item toggle">
                  <div className="setting-info">
                    <label htmlFor="compactTables">Compact Tables</label>
                    <span className="setting-hint">Display denser tables with more data visible</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="compactTables"
                      name="compactTables"
                      checked={settings.compactTables}
                      onChange={handleInputChange}
                      disabled
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </section>

            {/* Privacy Section */}
            <section id="privacy" className="settings-section">
              <div className="section-header">
                <h2>Privacy Settings</h2>
                <p>Control your data and visibility</p>
              </div>
              
              <div className="settings-group">
                <div className="setting-item toggle">
                  <div className="setting-info">
                    <label htmlFor="profileVisible">Public Profile</label>
                    <span className="setting-hint">Allow others to see your profile and favorite team</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="profileVisible"
                      name="profileVisible"
                      checked={settings.profileVisible}
                      onChange={handleInputChange}
                      disabled
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item toggle">
                  <div className="setting-info">
                    <label htmlFor="shareActivity">Share Activity</label>
                    <span className="setting-hint">Allow analytics to improve platform recommendations</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="shareActivity"
                      name="shareActivity"
                      checked={settings.shareActivity}
                      onChange={handleInputChange}
                      disabled
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </section>

            {/* Account Section */}
            <section id="account" className="settings-section">
              <div className="section-header">
                <h2>Account Management</h2>
                <p>Manage your account security and data</p>
              </div>
              
              <div className="settings-group">
                <div className="account-action">
                  <div className="action-info">
                    <h4>Change Password</h4>
                    <p>Update your account password for security</p>
                  </div>
                  <button type="button" className="action-btn" disabled>
                    Change Password
                  </button>
                </div>

                <div className="account-action">
                  <div className="action-info">
                    <h4>Export Data</h4>
                    <p>Download a copy of your account data</p>
                  </div>
                  <button type="button" className="action-btn" disabled>
                    Export Data
                  </button>
                </div>

                <div className="account-action danger">
                  <div className="action-info">
                    <h4>Delete Account</h4>
                    <p>Permanently delete your account and all data</p>
                  </div>
                  <button type="button" className="action-btn danger" disabled>
                    Delete Account
                  </button>
                </div>
              </div>
            </section>

            {/* Save Button */}
            <div className="settings-footer">
              <div className="coming-soon-notice">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Account settings will be available once you create an account</span>
              </div>
              <button type="submit" className="save-btn" disabled>
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
              {saveStatus === 'saved' && (
                <span className="save-success">✓ Settings saved successfully</span>
              )}
            </div>
          </form>
        </div>

        {/* Sign Out Link */}
        <div className="settings-back">
          <button type="button" className="logout-link" onClick={handleLogout}>
            ← Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
