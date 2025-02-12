import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import { useSupabase } from './useSupabase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { ROUTES, type AppRoute } from "@/constants/routes";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  skipAuth: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<AppRoute | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // Handle initial route navigation
  useEffect(() => {
    if (!isLoading && isReady && initialRoute) {
      console.log('Navigation conditions met:', { isLoading, isReady, initialRoute });
      console.log('About to navigate to:', initialRoute);
      router.replace(initialRoute);
      console.log('Navigation attempted');
      setInitialRoute(null);
    } else {
      console.log('Navigation conditions not met:', { isLoading, isReady, initialRoute });
    }
  }, [isLoading, isReady, initialRoute]);

  // Initial auth check
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (error || !profile) {
            console.log('No profile found, redirecting to add books');
            setInitialRoute(ROUTES.ADD_BOOKS);
          } else {
            console.log('Profile found, redirecting to feed');
            setInitialRoute(ROUTES.TABS);
          }
        } catch (error) {
          console.error('Error on initial profile check:', error);
          setInitialRoute(ROUTES.AUTH);
        }
      } else {
        setUser(null);
        setInitialRoute(ROUTES.AUTH);
      }
      setIsLoading(false);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      
      if (currentUser) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', currentUser.id)
            .single();

          if (error || !profile) {
            // No profile found or error - go to onboarding
            console.log('No profile found, redirecting to add books');
            setInitialRoute(ROUTES.ADD_BOOKS);
          } else {
            // Profile exists - go to feed
            console.log('Profile found, redirecting to feed');
            setInitialRoute(ROUTES.TABS);
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          // Error checking profile - assume no profile and go to onboarding
          setInitialRoute(ROUTES.AUTH);
        }
      } else {
        // No user - go to auth
        setInitialRoute(ROUTES.AUTH);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '781569259169-ao9gntvu1rlc1dmr9e8hnsm7horq8gtk.apps.googleusercontent.com',
      iosClientId: '781569259169-vb9euujjv37dp0erqj15htp10klokg4c.apps.googleusercontent.com'
    });
  }, []);

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      
      const userInfo = await GoogleSignin.signIn();
      const { accessToken, idToken } = await GoogleSignin.getTokens();
      
      if (!idToken) {
        throw new Error('No ID token present!');
      }

      await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        access_token: accessToken,
        nonce: 'NONCE'
      });
      // Let onAuthStateChange handle the navigation
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  const skipAuth = () => {
    router.replace('/(tabs)');
  };

  const checkProfileStatus = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        // No profile - start onboarding flow
        router.replace(ROUTES.ADD_BOOKS);
      } else {
        // Profile exists - go to main app
        router.replace(ROUTES.TABS);
      }
    } catch (error) {
      router.replace(ROUTES.ADD_BOOKS);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error: null,
      signInWithGoogle,
      signOut,
      skipAuth,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context as AuthContextType;
}; 