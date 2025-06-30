
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useSecureAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          setUser(null);
          setIsAuthenticated(false);
        } else {
          setUser(session?.user ?? null);
          setIsAuthenticated(!!session?.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        setLoading(false);
        
        // Clear sensitive data on logout
        if (event === 'SIGNED_OUT') {
          // Clear any cached data
          localStorage.removeItem('user-preferences');
          sessionStorage.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const requireAuth = () => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    requireAuth
  };
};
