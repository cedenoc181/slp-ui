import { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the user's profile row (display_name, favorite_team, role)
  async function fetchProfile(supabaseUser) {
    if (!supabaseUser) return null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, favorite_team, role')
        .eq('id', supabaseUser.id)
        .single();
      return data;
    } catch {
      return null;
    }
  }

  // Build the combined user object from Supabase session + profile row
  async function buildUser(supabaseUser) {
    if (!supabaseUser) {
      setUser(null);
      return;
    }
    const profile = await fetchProfile(supabaseUser);
    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email,
      displayName: profile?.display_name || supabaseUser.email?.split('@')[0] || '',
      favoriteTeam: profile?.favorite_team || '',
      role: profile?.role || 'user',
    });
  }

  // On mount: restore session and listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      await buildUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      await buildUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sign in with email + password
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // Sign up with email + password
  const register = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  // Sign out
  const logout = async () => {
    await supabase.auth.signOut();
  };

  // Update profile fields in Supabase (display_name, favorite_team)
  const updateProfile = async (fields) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...fields }, { onConflict: 'id' });
    if (error) throw error;
    await buildUser(session.user);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!session,
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
    }}>
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
