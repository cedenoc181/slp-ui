import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Check localStorage on mount for persisted auth state
  useEffect(() => {
    const savedAuth = localStorage.getItem('sandlot_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        setIsAuthenticated(true);
        setUser(authData.user);
      } catch (e) {
        localStorage.removeItem('sandlot_auth');
      }
    }
  }, []);

  // Mock login function - will be replaced with real auth later
  const login = (email) => {
    const userData = {
      email,
      displayName: email.split('@')[0],
      createdAt: new Date().toISOString()
    };
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('sandlot_auth', JSON.stringify({ user: userData }));
  };

  // Logout function
  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('sandlot_auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
