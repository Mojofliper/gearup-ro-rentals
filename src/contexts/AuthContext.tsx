import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
// import { Database } from '@/integrations/supabase/types';

type Profile = {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  rating?: number;
  total_reviews?: number;
  total_rentals?: number;
  total_earnings?: number;
  role?: string;
  is_verified?: boolean;
  is_suspended?: boolean;
  stripe_customer_id?: string;
  stripe_account_id?: string;
  created_at?: string;
  updated_at?: string;
};

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, fullName: string, location: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    console.log('AuthProvider: Initializing auth...');
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('AuthProvider: Loading timeout reached, stopping loading');
      setLoading(false);
      setInitialLoadComplete(true);
    }, 10000); // 10 second timeout
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AuthProvider: Initial session check:', { session: !!session, error });
      clearTimeout(timeoutId); // Clear timeout if we get a response
      
      if (error) {
        console.error('AuthProvider: Error getting session:', error);
        setLoading(false);
        setInitialLoadComplete(true);
        return;
      }
      
      if (session?.user) {
        console.log('AuthProvider: Found existing session, fetching user...');
        setUser(session.user);
        setLoading(true);
        fetchProfile(session.user.id).finally(() => {
          setInitialLoadComplete(true);
        });
      } else {
        console.log('AuthProvider: No existing session found');
        setLoading(false);
        setInitialLoadComplete(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip auth state changes during initial load to prevent race conditions
        if (!initialLoadComplete) {
          console.log('AuthProvider: Skipping auth state change during initial load:', event);
          return;
        }
        
        // console.log('AuthProvider: Auth state change:', event, { session: !!session, userId: session?.user?.id });
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, fetching profile data...');
          setUser(session.user);
          setLoading(true);
          await fetchProfile(session.user.id);
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('AuthProvider: User updated, fetching profile data...');
          setUser(session.user);
          setLoading(true);
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('AuthProvider: Token refreshed, fetching profile data...');
          setUser(session.user);
          if (!profile) {
            setLoading(true);
            await fetchProfile(session.user.id);
          }
        } else {
          // console.log('AuthProvider: Other auth event:', event);
          if (!session) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [initialLoadComplete]);

  const createProfileManually = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('AuthProvider: Attempting to create profile manually for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || user?.user_metadata?.full_name || 'User',
          role: 'user',
          is_verified: false,
          is_suspended: false,
          rating: 0,
          total_reviews: 0,
          total_rentals: 0,
          total_earnings: 0
        })
        .select()
        .single();

      if (error) {
        console.error('AuthProvider: Error creating profile manually:', error);
        return null;
      }

      console.log('AuthProvider: Profile created manually:', data);
      return data;
    } catch (error) {
      console.error('AuthProvider: Exception creating profile manually:', error);
      return null;
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log('AuthProvider: Fetching profile data for:', userId);
      
      // Try multiple times with increasing delays
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error) {
          console.log('AuthProvider: Profile data fetched successfully:', data);
          setProfile(data);
          setLoading(false);
          return;
        }

        console.error(`AuthProvider: Error fetching profile (attempt ${attempt}):`, error);
        
        // If profile doesn't exist, wait and try again (auth trigger might still be processing)
        if (error.code === 'PGRST116') {
          console.log(`AuthProvider: Profile not found (attempt ${attempt}), waiting for auth trigger...`);
          
          if (attempt < 3) {
            // Wait with increasing delay: 1s, 2s, then try manual creation
            const delay = attempt * 1000;
            console.log(`AuthProvider: Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.error('AuthProvider: Profile still not found after 3 attempts, attempting manual creation');
            
            // Try to create the profile manually
            const manualProfile = await createProfileManually(userId);
            if (manualProfile) {
              setProfile(manualProfile);
              setLoading(false);
              return;
            }
            
            // If manual creation fails, create a fallback profile
            console.error('AuthProvider: Manual profile creation failed, creating fallback profile');
            const fallbackProfile: Profile = {
              id: userId,
              email: user?.email || '',
              full_name: user?.user_metadata?.full_name || 'User',
              role: 'user',
              is_verified: false,
              is_suspended: false,
              rating: 0,
              total_reviews: 0,
              total_rentals: 0,
              total_earnings: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            setProfile(fallbackProfile);
            setLoading(false);
            return;
          }
        }
        
        // For any other error, just set profile to null and stop loading
        console.error('AuthProvider: Non-retryable error, stopping attempts');
        setProfile(null);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('AuthProvider: Error in fetchProfile:', error);
      setProfile(null);
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthProvider: Attempting login for:', email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('AuthProvider: Login error:', error);
        return { error: error.message };
      }
      console.log('AuthProvider: Login successful');
      return { error: undefined };
    } catch (error) {
      console.error('AuthProvider: Login exception:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signup = async (email: string, password: string, fullName: string, location: string) => {
    try {
      console.log('AuthProvider: Attempting signup for:', email);
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            location: location
          }
        }
      });
      if (error) {
        console.error('AuthProvider: Signup error:', error);
        return { error: error.message };
      }

      console.log('AuthProvider: User created successfully, auth trigger will create profile');
      
      // If user is immediately confirmed (email confirmation not required), sign them in
      if (data.user && !data.session) {
        console.log('AuthProvider: User created but no session, attempting sign in...');
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (signInError) {
          console.error('AuthProvider: Auto sign-in error:', signInError);
          return { error: 'Account created but automatic sign-in failed. Please sign in manually.' };
        }
        console.log('AuthProvider: Auto sign-in successful');
        
        // Small delay to ensure auth state change is processed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Manually set the user and fetch profile to ensure immediate state update
        setUser(data.user);
        setLoading(true);
        await fetchProfile(data.user.id);
      } else if (data.user && data.session) {
        // User was immediately signed in (email confirmation not required)
        console.log('AuthProvider: User created and immediately signed in');
        setUser(data.user);
        setLoading(true);
        await fetchProfile(data.user.id);
      }
      
      // Store a flag to indicate recent signup for better refresh handling
      localStorage.setItem('recentSignup', 'true');
      setTimeout(() => localStorage.removeItem('recentSignup'), 10000); // Remove after 10 seconds
      
      return { error: undefined };
    } catch (error) {
      console.error('AuthProvider: Signup exception:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    console.log('AuthProvider: Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const logout = async () => {
    console.log('AuthProvider: Logging out...');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) throw new Error('No profile logged in');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
  };

  // console.log('AuthProvider: Current state:', { user: !!user, profile: !!profile, loading, userId: user?.id, profileId: profile?.id });

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, signOut, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
