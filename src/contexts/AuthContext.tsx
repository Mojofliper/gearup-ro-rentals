import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  // Simple profile fetcher
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('Profile not found for user:', userId);
        setProfile(null);
        return;
      }

      console.log('Profile loaded:', data);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('AuthProvider: Initializing...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('Found existing session for user:', session.user.id);
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setLoading(true);
          await fetchProfile(session.user.id);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Simple login function
  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('Login error:', error);
        return { error: error.message };
      }

      // Check if profile exists
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();
          
        if (profileError && profileError.code === 'PGRST116') {
          // No profile found - user must sign up first
          await supabase.auth.signOut();
          return { error: 'You must sign up first. This account does not have a profile.' };
        }
      }

      console.log('Login successful');
      return { error: undefined };
    } catch (error) {
      console.error('Login exception:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  // Simple signup function
  const signup = async (email: string, password: string, fullName: string, location: string, phoneNumber?: string) => {
    try {
      console.log('Attempting signup for:', email);
      
      // Create new account - auth trigger will create profile automatically
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
      
      if (error) {
        console.error('Signup error:', error);
        return { error: error.message };
      }

      if (data.user) {
        console.log('User created:', data.user.id);
        
        // Auth trigger will create profile automatically
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Auto sign-in if no session
      if (data.user && !data.session) {
        console.log('Auto signing in...');
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (signInError) {
          console.error('Auto sign-in failed:', signInError);
          return { error: 'Account created but automatic sign-in failed. Please sign in manually.' };
        }
      }

      console.log('Signup successful');
      return { error: undefined };
    } catch (error) {
      console.error('Signup exception:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const logout = async () => {
    console.log('Logging out...');
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
