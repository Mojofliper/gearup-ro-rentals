import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Refs to prevent duplicate operations
  const fetchingProfileRef = useRef<string | null>(null);
  const lastSignedInUserIdRef = useRef<string | null>(null);
  const currentProfileRef = useRef<Profile | null>(null);
  const isLoggingInRef = useRef<boolean>(false);

  // Profile fetcher with strict error handling
  const fetchProfile = async (userId: string) => {
    if (fetchingProfileRef.current === userId) {
      console.log('AuthProvider: Profile fetch already in progress for:', userId);
      return;
    }
    
    if (!userId) {
      console.error('AuthProvider: No user ID provided to fetchProfile');
      setProfile(null);
      setLoading(false);
      return;
    }
    
    fetchingProfileRef.current = userId;
    
    try {
      console.log('AuthProvider: Fetching profile data for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AuthProvider: Error fetching profile:', error);
        
        // Any database error should sign out the user
        console.error('AuthProvider: Database error fetching profile, signing out user');
        await supabase.auth.signOut();
        
        toast({
          title: 'Eroare la încărcarea profilului',
          description: 'Nu s-a putut încărca profilul. Te rugăm să încerci să te conectezi din nou.',
          variant: 'destructive',
        });
        
        setUser(null);
        setProfile(null);
        currentProfileRef.current = null;
        setLoading(false);
        fetchingProfileRef.current = null;
        return;
      }

      console.log('AuthProvider: Profile loaded successfully:', data);
      setProfile(data);
      currentProfileRef.current = data;
      setLoading(false);
      fetchingProfileRef.current = null;
      
    } catch (error) {
      console.error('AuthProvider: Exception in fetchProfile:', error);
      
      await supabase.auth.signOut();
      
      toast({
        title: 'Eroare la încărcarea profilului',
        description: 'A apărut o eroare neașteptată. Te rugăm să încerci să te conectezi din nou.',
        variant: 'destructive',
      });
      
      setUser(null);
      setProfile(null);
      currentProfileRef.current = null;
      setLoading(false);
      fetchingProfileRef.current = null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('AuthProvider: Initializing auth...');
    
    const timeoutId = setTimeout(() => {
      console.log('AuthProvider: Loading timeout reached, stopping loading');
      setLoading(false);
      setInitialLoadComplete(true);
    }, 10000);
    
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('AuthProvider: Initial session check:', { session: !!session, error });
      clearTimeout(timeoutId);
      
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
        
        try {
          await fetchProfile(session.user.id);
          
          // If profile fetch failed, sign out the user
          if (!currentProfileRef.current) {
            console.error('AuthProvider: No valid profile found for existing session, signing out');
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            currentProfileRef.current = null;
          }
        } catch (error) {
          console.error('AuthProvider: Error fetching profile for existing session:', error);
          // fetchProfile will handle signing out the user
        } finally {
          setInitialLoadComplete(true);
        }
      } else {
        console.log('AuthProvider: No existing session found');
        setLoading(false);
        setInitialLoadComplete(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!initialLoadComplete) {
          console.log('AuthProvider: Skipping auth state change during initial load:', event);
          return;
        }
        
        console.log('AuthProvider: Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, fetching profile data...', session.user.id);
          
          if (isLoggingInRef.current) {
            console.log('AuthProvider: Skipping SIGNED_IN event during login attempt');
            return;
          }
          
          if (lastSignedInUserIdRef.current === session.user.id) {
            console.log('AuthProvider: Duplicate SIGNED_IN event for same user, skipping');
            return;
          }
          
          lastSignedInUserIdRef.current = session.user.id;
          
          setUser(session.user);
          setLoading(true);
          
          try {
            await fetchProfile(session.user.id);
          } catch (error) {
            console.error('AuthProvider: Error in auth state change profile fetch:', error);
          }
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('AuthProvider: User updated, fetching profile data...');
          setUser(session.user);
          if (!currentProfileRef.current || currentProfileRef.current.id !== session.user.id) {
            setLoading(true);
            await fetchProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          setUser(null);
          setProfile(null);
          currentProfileRef.current = null;
          setLoading(false);
          fetchingProfileRef.current = null;
          lastSignedInUserIdRef.current = null;
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('AuthProvider: Token refreshed, fetching profile data...');
          setUser(session.user);
          if (!currentProfileRef.current) {
            setLoading(true);
            await fetchProfile(session.user.id);
          }
        } else {
          console.log('AuthProvider: Other auth event:', event);
          if (!session) {
            setUser(null);
            setProfile(null);
            currentProfileRef.current = null;
            setLoading(false);
            fetchingProfileRef.current = null;
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

  // Login function with proper error handling
  const login = async (email: string, password: string) => {
    try {
      console.log('AuthProvider: Attempting login for:', email);
      isLoggingInRef.current = true;
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('AuthProvider: Login error:', error);
        isLoggingInRef.current = false;
        
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Email sau parolă incorectă. Te rugăm să verifici datele și să încerci din nou.' };
        } else if (error.message.includes('Email not confirmed')) {
          return { error: 'Contul nu a fost confirmat. Te rugăm să verifici emailul și să confirmi contul.' };
        } else if (error.message.includes('Too many requests')) {
          return { error: 'Prea multe încercări de conectare. Te rugăm să aștepți câteva minute înainte de a încerca din nou.' };
        } else if (error.message.includes('User not found')) {
          return { error: 'Contul nu există. Te rugăm să verifici emailul sau să creezi un cont nou.' };
        } else {
          return { error: error.message };
        }
      }
      
      if (!data.user) {
        console.error('AuthProvider: Login succeeded but no user returned');
        isLoggingInRef.current = false;
        return { error: 'Eroare la conectare. Te rugăm să încerci din nou.' };
      }
      
      console.log('AuthProvider: Login successful for user:', data.user.id);
      
      // Fetch profile - if no profile exists, login fails
      try {
        console.log('AuthProvider: Fetching profile for user:', data.user.id);
        await fetchProfile(data.user.id);
        
        // Check if profile fetch was successful
        if (!currentProfileRef.current) {
          console.error('AuthProvider: No profile found for user');
          isLoggingInRef.current = false;
          return { error: 'Contul nu există. Te rugăm să creezi un cont nou.' };
        }
        
        console.log('AuthProvider: Profile fetch completed successfully');
        return { error: undefined };
      } catch (profileError) {
        console.error('AuthProvider: Profile fetch error after login:', profileError);
        isLoggingInRef.current = false;
        return { error: 'Contul nu există. Te rugăm să creezi un cont nou.' };
      }
    } catch (err) {
      console.error('AuthProvider: Login exception:', err);
      return { error: 'A apărut o eroare neașteptată. Te rugăm să încerci din nou.' };
    } finally {
      setTimeout(() => {
        isLoggingInRef.current = false;
      }, 1000);
    }
  };

  // Signup function with proper error handling
  const signup = async (email: string, password: string, fullName: string, location: string, phoneNumber?: string) => {
    try {
      console.log('AuthProvider: Attempting signup for:', email);
      
      await supabase.auth.signOut();
      
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
        console.error('AuthProvider: Signup error:', error);
        
        if (error.message.includes('User already registered')) {
          return { error: 'Un cont cu acest email există deja. Te rugăm să te conectezi sau să folosești un alt email.' };
        } else if (error.message.includes('Password should be at least')) {
          return { error: 'Parola trebuie să aibă cel puțin 6 caractere.' };
        } else if (error.message.includes('Invalid email')) {
          return { error: 'Adresa de email nu este validă. Te rugăm să introduci o adresă validă.' };
        } else if (error.message.includes('Unable to validate email address')) {
          return { error: 'Nu s-a putut valida adresa de email. Te rugăm să verifici că adresa este corectă.' };
        } else {
          return { error: error.message };
        }
      }

      if (!data.user) {
        console.error('AuthProvider: Signup succeeded but no user returned');
        return { error: 'Eroare la crearea contului. Te rugăm să încerci din nou.' };
      }
      
      console.log('AuthProvider: Signup successful for user:', data.user.id);
      
      // Wait for the profile to be created by the trigger
      console.log('AuthProvider: Waiting for profile creation...');
      let profileCreated = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!profileCreated && attempts < maxAttempts) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          attempts++;
          
          // Try to fetch the profile
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profileData && !profileError) {
            console.log('AuthProvider: Profile found after signup:', profileData);
            profileCreated = true;
            
            // Set the profile data
            setProfile(profileData);
            currentProfileRef.current = profileData;
            setUser(data.user);
            setLoading(false);
            
            return { error: undefined };
          }
        } catch (profileFetchError) {
          console.log(`AuthProvider: Profile fetch attempt ${attempts} failed:`, profileFetchError);
        }
      }
      
      if (!profileCreated) {
        console.error('AuthProvider: Profile was not created after signup');
        return { error: 'Contul a fost creat dar profilul nu a fost inițializat. Te rugăm să încerci să te conectezi.' };
      }
      
      return { error: undefined };
    } catch (err) {
      console.error('AuthProvider: Signup exception:', err);
      return { error: 'A apărut o eroare neașteptată. Te rugăm să încerci din nou.' };
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
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
    currentProfileRef.current = data;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, signOut, updateProfile }}>
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
