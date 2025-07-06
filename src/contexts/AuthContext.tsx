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
        
        console.log('AuthProvider: Auth state change:', event, { session: !!session, userId: session?.user?.id });
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, fetching profile data...');
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('AuthProvider: Token refreshed, fetching profile data...');
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('AuthProvider: Other auth event:', event);
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

  const fetchProfile = async (userId: string) => {
    try {
      console.log('AuthProvider: Fetching profile data for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AuthProvider: Error fetching profile:', error);
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('AuthProvider: Profile not found, creating profile...');
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser.user) {
            const fullName = authUser.user.email?.split('@')[0] || 'User';
            
            const { error: createError } = await supabase
              .from('users')
              .insert({
                id: authUser.user.id,
                email: authUser.user.email!,
                full_name: fullName,
                location: 'Unknown'
              });
            
            if (createError) {
              console.error('AuthProvider: Error creating profile:', createError);
              setProfile(null);
              setLoading(false);
              return;
            }
            
            // Fetch the newly created profile
            const { data: newProfile, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();
              
            if (fetchError) {
              console.error('AuthProvider: Error fetching new profile:', fetchError);
              setProfile(null);
              setLoading(false);
              return;
            }
            
            console.log('AuthProvider: New profile created and fetched:', newProfile);
            setProfile(newProfile);
            setLoading(false);
            return;
          }
        }
        // For any other error, just set profile to null and stop loading
        setProfile(null);
        setLoading(false);
        return;
      }
      
      console.log('AuthProvider: Profile data fetched successfully:', data);
      setProfile(data);
      setLoading(false);
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
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error('AuthProvider: Signup error:', error);
        return { error: error.message };
      }

      if (data.user) {
        console.log('AuthProvider: User created, creating profile...');
        // Create user profile in users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
            location: location
          });

        if (profileError) {
          console.error('AuthProvider: Profile creation error:', profileError);
          return { error: profileError.message };
        }
        console.log('AuthProvider: Profile created successfully');
      }
      
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

  console.log('AuthProvider: Current state:', { user: !!user, profile: !!profile, loading, userId: user?.id, profileId: profile?.id });

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
