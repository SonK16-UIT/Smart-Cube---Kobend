import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Define the structure of the AuthContext
const AuthContext = createContext({
  session: null,
  profile: null,
  loading: true,
});

// AuthProvider component
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // Current session
  const [profile, setProfile] = useState(null); // User profile
  const [loading, setLoading] = useState(true); // Loading state

  // Function to fetch user profile
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data || null);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      setProfile(null); // Clear profile if an error occurs
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);

        if (session?.user?.id) {
          // Fetch the profile if a session exists
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error.message);
      } finally {
        setLoading(false); // Mark loading as complete
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user?.id) {
        setLoading(true); // Start loading while fetching profile
        await fetchProfile(session.user.id);
      } else {
        setProfile(null); // Clear profile if user logs out
      }

      setLoading(false); // End loading
    });

    // Cleanup subscription on component unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Provide the session, profile, and loading state to consumers
  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);
