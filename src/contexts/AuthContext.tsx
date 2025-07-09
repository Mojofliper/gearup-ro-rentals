import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Add refs to prevent duplicate operations and infinite loops
  const fetchingProfileRef = useRef<string | null>(null);
  const creatingProfileRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Loading timeout function to prevent infinite loading
  const setLoadingWithTimeout = (isLoading: boolean) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    setLoading(isLoading);
    
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log('AuthProvider: Loading timeout reached, stopping loading');
          setLoading(false);
        }
      }, 10000); // 10 second timeout
    }
  };

  // Create user profile if it doesn't exist
  const createUserProfile = async (user: SupabaseUser | { id: string }) => {
    if (!user || !mountedRef.current) return;
    
    // Prevent duplicate profile creation
    if (creatingProfileRef.current === user.id) {
      console.log('AuthProvider: Already creating profile for user:', user.id);
      return;
    }
    
    creatingProfileRef.current = user.id;
    
    try {
      console.log('AuthProvider: Creating profile for user:', user.id);
      
      // If we only have an ID, try to get the full user object
      let userData = user;
      if ('email' in user && user.email) {
        userData = user;
      } else {
        // Try to get user data from auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          userData = authUser;
        }
      }
      
      const profileData = {
        id: user.id,
        email: 'email' in userData ? (userData.email || '') : '',
        full_name: 'user_metadata' in userData ? (userData.user_metadata?.full_name || userData.user_metadata?.name || '') : '',
        first_name: 'user_metadata' in userData ? (userData.user_metadata?.first_name || '') : '',
        last_name: 'user_metadata' in userData ? (userData.user_metadata?.last_name || '') : '',
        location: 'user_metadata' in userData ? (userData.user_metadata?.location || '') : '',
        avatar_url: 'user_metadata' in userData ? (userData.user_metadata?.avatar_url || '') : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single();
        
      if (!mountedRef.current) return;
      
      if (error) {
        console.error('AuthProvider: Error creating profile:', error);
        return;
      }
      
      console.log('AuthProvider: Profile created successfully:', data);
      setProfile(data);
      setLoadingWithTimeout(false);
      
    } catch (error) {
      if (!mountedRef.current) return;
      console.error('AuthProvider: Exception creating profile:', error);
    } finally {
      creatingProfileRef.current = null;
    }
  };

  // Simple profile fetcher with duplicate prevention
  const fetchProfile = async (userId: string) => {
    if (!userId || !mountedRef.current) {
      console.log('AuthProvider: fetchProfile called with invalid userId or unmounted component:', { userId, mounted: mountedRef.current });
      setProfile(null);
      setLoadingWithTimeout(false);
      return;
    }
    
    // Prevent duplicate fetches for the same user
    if (fetchingProfileRef.current === userId) {
      console.log('AuthProvider: Already fetching profile for user:', userId);
      return;
    }
    
    console.log('AuthProvider: Fetching profile data for:', userId);
    fetchingProfileRef.current = userId;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mountedRef.current) {
        console.log('AuthProvider: Component unmounted during profile fetch');
        return;
      }

      if (error) {
        console.error('AuthProvider: Error fetching profile:', error);
        if (error.code === 'PGRST116') {
          console.log('AuthProvider: Profile not found, creating new profile');
          // Profile doesn't exist, create a new one
          const currentUser = user || { id: userId } as SupabaseUser;
          await createUserProfile(currentUser);
          return;
        }
        setProfile(null);
        setLoadingWithTimeout(false);
        return;
      }

      console.log('AuthProvider: Profile data fetched successfully:', data);
      setProfile(data);
      setLoadingWithTimeout(false);
      
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['connected-account'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      
    } catch (error) {
      if (!mountedRef.current) return;
      console.error('AuthProvider: Exception in fetchProfile:', error);
      setProfile(null);
      setLoadingWithTimeout(false);
    } finally {
      fetchingProfileRef.current = null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('AuthProvider: Initializing auth...');
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        console.log('AuthProvider: Loading timeout reached, stopping loading');
        setLoading(false);
        setInitialLoadComplete(true);
      }
    }, 10000); // 10 second timeout
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mountedRef.current) {
        clearTimeout(timeoutId);
        return;
      }
      
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
        setLoadingWithTimeout(true);
        await fetchProfile(session.user.id);
      } else {
        console.log('AuthProvider: No existing session found');
        setLoading(false);
      }
      
      setInitialLoadComplete(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
        console.log('AuthProvider: Auth state change event:', event, { 
          session: !!session, 
          userId: session?.user?.id,
          initialLoadComplete,
          currentUser: !!user,
          currentProfile: !!profile
        });
        
        // Skip auth state changes during initial load to prevent race conditions
        if (!initialLoadComplete) {
          console.log('AuthProvider: Skipping auth state change during initial load:', event);
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, fetching profile data...');
          console.log('AuthProvider: Current user state:', user?.id);
          console.log('AuthProvider: Session user metadata:', session.user.user_metadata);
          
          // Only update user if it's different or we don't have one
          if (!user || user.id !== session.user.id) {
            setUser(session.user);
          }
          
          // Only fetch profile if we don't have one or if it's for a different user
          if (!profile || profile.id !== session.user.id) {
            setLoadingWithTimeout(true);
            try {
              await fetchProfile(session.user.id);
            } catch (error) {
              console.error('AuthProvider: Error fetching profile on sign in:', error);
              setLoadingWithTimeout(false);
            }
          } else {
            console.log('AuthProvider: Profile already exists for user, skipping fetch');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          console.log('AuthProvider: Current state before sign out:', { user: !!user, profile: !!profile, loading });
          setUser(null);
          setProfile(null);
          setLoadingWithTimeout(false);
          
          // Clear all user-related queries
          queryClient.removeQueries({ queryKey: ['user-bookings'] });
          queryClient.removeQueries({ queryKey: ['user-listings'] });
          queryClient.removeQueries({ queryKey: ['user-reviews'] });
          queryClient.removeQueries({ queryKey: ['user-stats'] });
          queryClient.removeQueries({ queryKey: ['connected-account'] });
          queryClient.removeQueries({ queryKey: ['current-user'] });
          queryClient.removeQueries({ queryKey: ['user-profile'] });
          
          // Reset refs
          fetchingProfileRef.current = null;
          creatingProfileRef.current = null;
          console.log('AuthProvider: State cleared after sign out');
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('AuthProvider: User updated, fetching profile data...');
          setUser(session.user);
          // Only fetch profile if we don't have one or if user ID changed
          if (!profile || profile.id !== session.user.id) {
            setLoadingWithTimeout(true);
            await fetchProfile(session.user.id);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('AuthProvider: Token refreshed, fetching profile data...');
          setUser(session.user);
          // Only fetch profile if we don't have one
          if (!profile) {
            setLoadingWithTimeout(true);
            await fetchProfile(session.user.id);
          }
        } else if (event === 'INITIAL_SESSION') {
          // Skip initial session events to prevent duplicate processing
          console.log('AuthProvider: Skipping INITIAL_SESSION event');
          return;
        } else {
          console.log('AuthProvider: Unhandled auth event:', event);
        }
      }
    );

    // Handle visibility change (tab minimize/restore)
    const handleVisibilityChange = async () => {
      if (!mountedRef.current || !initialLoadComplete) return;
      
      if (document.visibilityState === 'visible' && user && !profile) {
        console.log('AuthProvider: Tab became visible, checking session state');
        // If we have a user but no profile, try to fetch the profile again
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('AuthProvider: Session still valid, fetching profile');
            await fetchProfile(session.user.id);
          }
        } catch (error) {
          console.error('AuthProvider: Error checking session on visibility change:', error);
        }
      }
    };

    // Handle window focus (when tab becomes active)
    const handleWindowFocus = async () => {
      if (!mountedRef.current || !initialLoadComplete) return;
      
      if (user && !profile && !loading) {
        console.log('AuthProvider: Window focused, checking session state');
        // If we have a user but no profile and we're not loading, try to recover
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('AuthProvider: Session still valid on focus, fetching profile');
            setLoadingWithTimeout(true);
            await fetchProfile(session.user.id);
          } else {
            console.log('AuthProvider: No valid session on focus, clearing state');
            setUser(null);
            setProfile(null);
            setLoadingWithTimeout(false);
          }
        } catch (error) {
          console.error('AuthProvider: Error checking session on focus:', error);
          // If there's an error, clear the state to prevent infinite loading
          setUser(null);
          setProfile(null);
          setLoadingWithTimeout(false);
        }
      }
    };

    // Add event listeners for window focus and visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []); // Remove queryClient from dependencies to prevent infinite loops

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log('AuthProvider: Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Email sau parolă incorectă. Te rugăm să verifici datele și să încerci din nou.' };
        } else if (error.message.includes('Email not confirmed')) {
          return { error: 'Contul nu a fost confirmat. Te rugăm să verifici emailul și să confirmi contul.' };
        } else if (error.message.includes('Too many requests')) {
          return { error: 'Prea multe încercări de conectare. Te rugăm să aștepți câteva minute înainte de a încerca din nou.' };
        } else {
          return { error: error.message };
        }
      }
      
      if (!data.user) {
        return { error: 'Eroare la conectare. Te rugăm să încerci din nou.' };
      }

      // Manually handle the login success to ensure immediate state update
      console.log('AuthProvider: Login successful for user:', data.user.id);
      setUser(data.user);
      setLoadingWithTimeout(true);
      
      // Fetch profile immediately
      try {
        await fetchProfile(data.user.id);
      } catch (profileError) {
        console.error('AuthProvider: Error fetching profile after login:', profileError);
        setLoadingWithTimeout(false);
        // Don't return error here as the login was successful
      }
      
      // Fallback: Check if profile was fetched successfully, if not, retry after a short delay
      setTimeout(async () => {
        if (mountedRef.current && user?.id === data.user.id && !profile) {
          console.log('AuthProvider: Fallback profile fetch for user:', data.user.id);
          try {
            await fetchProfile(data.user.id);
          } catch (error) {
            console.error('AuthProvider: Fallback profile fetch failed:', error);
          }
        }
      }, 1000);
      
      return { error: undefined };
    } catch (error) {
      console.error('AuthProvider: Login error:', error);
      return { error: 'Eroare la conectare. Te rugăm să încerci din nou.' };
    }
  };

  // Signup function
  const signup = async (email: string, password: string, fullName: string, location: string, phoneNumber?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            location: location,
            phone: phoneNumber
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { error: 'Un cont cu acest email există deja. Te rugăm să te conectezi sau să resetezi parola.' };
        } else if (error.message.includes('Password should be at least')) {
          return { error: 'Parola trebuie să aibă cel puțin 6 caractere.' };
        } else if (error.message.includes('Invalid email')) {
          return { error: 'Adresa de email nu este validă.' };
        } else {
          return { error: error.message };
        }
      }

      if (data.user) {
        toast({
          title: 'Cont creat cu succes!',
          description: 'Te rugăm să verifici emailul pentru a confirma contul.',
        });
        return { error: undefined };
      }

      return { error: 'Eroare la crearea contului. Te rugăm să încerci din nou.' };
    } catch (error) {
      console.error('AuthProvider: Signup error:', error);
      return { error: 'Eroare la crearea contului. Te rugăm să încerci din nou.' };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out user');
      
      // Immediately clear local state
      setUser(null);
      setProfile(null);
      setLoadingWithTimeout(false);
      
      // Clear all user-related queries
      queryClient.removeQueries({ queryKey: ['user-bookings'] });
      queryClient.removeQueries({ queryKey: ['user-listings'] });
      queryClient.removeQueries({ queryKey: ['user-reviews'] });
      queryClient.removeQueries({ queryKey: ['user-stats'] });
      queryClient.removeQueries({ queryKey: ['connected-account'] });
      queryClient.removeQueries({ queryKey: ['current-user'] });
      queryClient.removeQueries({ queryKey: ['user-profile'] });
      
      // Reset refs
      fetchingProfileRef.current = null;
      creatingProfileRef.current = null;
      
      // Clear any stored auth data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('supabase.auth.token');
      
      // Then sign out from Supabase
      await supabase.auth.signOut();
      
      console.log('AuthProvider: Sign out completed');
      
      // Force a complete state reset after a short delay
      setTimeout(() => {
        if (mountedRef.current) {
          console.log('AuthProvider: Force clearing state after sign out');
          setUser(null);
          setProfile(null);
          setLoadingWithTimeout(false);
          
          // Force a re-render by updating a state that triggers useEffect
          setInitialLoadComplete(false);
          setTimeout(() => setInitialLoadComplete(true), 100);
        }
      }, 100);
      
    } catch (error) {
      console.error('AuthProvider: Sign out error:', error);
      // Even if there's an error, we should still clear local state
      setUser(null);
      setProfile(null);
      setLoadingWithTimeout(false);
    }
  };

  // Update profile function
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('AuthProvider: Error updating profile:', error);
        toast({
          title: 'Eroare la actualizarea profilului',
          description: 'Nu s-a putut actualiza profilul. Te rugăm să încerci din nou.',
          variant: 'destructive',
        });
        return;
      }

      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: 'Profil actualizat',
        description: 'Profilul a fost actualizat cu succes!',
      });
    } catch (error) {
      console.error('AuthProvider: Exception updating profile:', error);
      toast({
        title: 'Eroare la actualizarea profilului',
        description: 'A apărut o eroare neașteptată. Te rugăm să încerci din nou.',
        variant: 'destructive',
      });
    }
  };

  React.useEffect(() => {
    // Check for localStorage/sessionStorage availability
    let storageAvailable = true;
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      window.sessionStorage.setItem(testKey, '1');
      window.sessionStorage.removeItem(testKey);
    } catch (e) {
      storageAvailable = false;
    }
    if (!storageAvailable) {
      toast({
        title: 'Atenție: Modul privat/incognito',
        description: 'Stocarea locală este dezactivată. Autentificarea și sesiunea nu vor funcționa corect în modul incognito sau dacă browserul blochează stocarea.',
        variant: 'destructive',
        duration: 10000
      });
    }
  }, [toast]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      signup,
      signOut,
      updateProfile,
    }}>
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
