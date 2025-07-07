import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  signup: (email: string, password: string, fullName: string, location: string, phoneNumber?: string) => Promise<{ error?: string }>;
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
  
  // Add refs to prevent duplicate operations
  const fetchingProfileRef = useRef<string | null>(null);
  const initialSessionProcessedRef = useRef(false);
  const lastSignedInUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider: Initializing auth...');
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('AuthProvider: Loading timeout reached, stopping loading');
      setLoading(false);
      setInitialLoadComplete(true);
      // Reset refs
      fetchingProfileRef.current = null;
      initialSessionProcessedRef.current = false;
      lastSignedInUserIdRef.current = null;
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
      
      if (session?.user && !initialSessionProcessedRef.current) {
        console.log('AuthProvider: Found existing session, fetching user...', session.user.id);
        initialSessionProcessedRef.current = true;
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
        
        // Skip if we're still processing the initial session
        if (event === 'INITIAL_SESSION' && initialSessionProcessedRef.current) {
          console.log('AuthProvider: Skipping duplicate initial session event');
          return;
        }
        
        // console.log('AuthProvider: Auth state change:', event, { session: !!session, userId: session?.user?.id });
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, fetching profile data...', session.user.id);
          console.log('AuthProvider: Current user state:', user?.id);
          console.log('AuthProvider: Session user metadata:', session.user.user_metadata);
          
          // Prevent duplicate SIGNED_IN events for the same user
          if (lastSignedInUserIdRef.current === session.user.id) {
            console.log('AuthProvider: Duplicate SIGNED_IN event for same user, skipping');
            return;
          }
          
          lastSignedInUserIdRef.current = session.user.id;
          
          // Always update user state and fetch profile for SIGNED_IN event
          // This ensures we get the correct user from the session
          setUser(session.user);
          setLoading(true);
          
          // Add a small delay to ensure the auth trigger has time to create the profile
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchProfile(session.user.id);
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('AuthProvider: User updated, fetching profile data...');
          setUser(session.user);
          // Only fetch profile if we don't have one or if user ID changed
          if (!profile || profile.id !== session.user.id) {
            setLoading(true);
            await fetchProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          setUser(null);
          setProfile(null);
          setLoading(false);
          // Reset refs
          fetchingProfileRef.current = null;
          initialSessionProcessedRef.current = false;
          lastSignedInUserIdRef.current = null;
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('AuthProvider: Token refreshed, fetching profile data...');
          setUser(session.user);
          // Only fetch profile if we don't have one
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
                    // Reset refs
        fetchingProfileRef.current = null;
        initialSessionProcessedRef.current = false;
        lastSignedInUserIdRef.current = null;
          }
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [initialLoadComplete]);

  // createProfileManually function removed - profiles are only created during signup

  const fetchProfile = async (userId: string) => {
    // Prevent duplicate profile fetches
    if (fetchingProfileRef.current === userId) {
      console.log('AuthProvider: Profile fetch already in progress for:', userId);
      return;
    }
    
    // Ensure we have a valid user ID
    if (!userId) {
      console.error('AuthProvider: No user ID provided to fetchProfile');
      return;
    }
    
    fetchingProfileRef.current = userId;
    
    // Set a timeout to prevent infinite loading
    const profileTimeout = setTimeout(() => {
      console.error('AuthProvider: Profile fetch timeout, stopping loading');
      setProfile(null);
      setLoading(false);
      fetchingProfileRef.current = null;
    }, 10000); // 10 second timeout
    
    try {
      console.log('AuthProvider: Fetching profile data for:', userId);
      
      // Try to fetch the profile - only one attempt since we don't create profiles during signin
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error) {
        console.log('AuthProvider: Profile data fetched successfully:', data);
        clearTimeout(profileTimeout);
        setProfile(data);
        setLoading(false);
        return;
      }

      console.error('AuthProvider: Error fetching profile:', error);
      
      // If profile doesn't exist, that's expected for signin - don't create one
      if (error.code === 'PGRST116') {
        console.log('AuthProvider: Profile not found - this is expected for signin, not creating profile');
        clearTimeout(profileTimeout);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // For any other error, just set profile to null and stop loading
      console.error('AuthProvider: Non-retryable error, stopping attempts');
      clearTimeout(profileTimeout);
      setProfile(null);
      setLoading(false);
      return;
    } catch (error) {
      console.error('AuthProvider: Error in fetchProfile:', error);
      clearTimeout(profileTimeout);
      setProfile(null);
      setLoading(false);
      setInitialLoadComplete(true);
    } finally {
      clearTimeout(profileTimeout);
      fetchingProfileRef.current = null;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthProvider: Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  const signup = async (email: string, password: string, fullName: string, location: string, phoneNumber?: string) => {
    try {
      console.log('[DEBUG] signup() called with:', { email, password, fullName, location });
      
      // Clear any existing session first to prevent conflicts
      await supabase.auth.signOut();
      
      // Clear localStorage to ensure no cached auth data
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.expires_at');
      localStorage.removeItem('supabase.auth.refresh_token');
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: fullName.split(' ')[0] || fullName,
            last_name: fullName.split(' ').slice(1).join(' ') || '',
            location: location,
            phone: phoneNumber || ''
          }
        }
      });
      console.log('[DEBUG] supabase.auth.signUp response:', { data, error });
      if (error) {
        console.error('[DEBUG] Signup error:', error);
        return { error: error.message };
      }

      if (data.user) {
        console.log('[DEBUG] Signup returned user:', data.user);
        console.log('[DEBUG] user_metadata:', data.user.user_metadata);
      }
      if (data.session) {
        console.log('[DEBUG] Signup returned session:', data.session);
      }

      // If user is immediately confirmed (email confirmation not required), sign them in
      if (data.user && !data.session) {
        console.log('[DEBUG] User created but no session, attempting sign in...');
        console.log('[DEBUG] User ID from signup:', data.user.id);
        
        // Wait a moment for the user to be fully created in the database
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (signInError) {
          console.error('[DEBUG] Auto sign-in error:', signInError);
          return { error: 'Account created but automatic sign-in failed. Please sign in manually.' };
        }
        console.log('[DEBUG] Auto sign-in successful, user ID:', signInData.user?.id);
      } else if (data.user && data.session) {
        console.log('[DEBUG] User created and immediately signed in, user ID:', data.user.id);
      }
      
      // Manually create user profile since we removed the auth trigger
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email || '',
              first_name: data.user.user_metadata?.first_name || fullName.split(' ')[0] || fullName,
              last_name: data.user.user_metadata?.last_name || fullName.split(' ').slice(1).join(' ') || '',
              location: data.user.user_metadata?.location || location,
              phone: data.user.user_metadata?.phone || phoneNumber || '',
              role: 'user',
              is_verified: false,
              is_suspended: false,
              rating: 0.00,
              total_reviews: 0,
              total_rentals: 0,
              total_earnings: 0.00
            });
          
          if (profileError) {
            console.error('[DEBUG] Profile creation error:', profileError);
            // Don't fail the signup if profile creation fails
          } else {
            console.log('[DEBUG] User profile created successfully');
          }
        } catch (profileError) {
          console.error('[DEBUG] Profile creation exception:', profileError);
          // Don't fail the signup if profile creation fails
        }
      }
      
      localStorage.setItem('recentSignup', 'true');
      setTimeout(() => localStorage.removeItem('recentSignup'), 10000);
      return { error: undefined };
    } catch (error) {
      console.error('[DEBUG] Signup exception:', error);
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
